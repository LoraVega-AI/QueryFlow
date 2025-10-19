// Prisma Framework Adapter
// Extracts database definitions from Prisma schema files

import {
  FileContent,
  ExtractionCandidate,
  IRTable,
  IRField,
  SupportedFramework,
  SupportedLanguage
} from '@/types/extraction';

import { BaseAdapter } from './baseAdapter';

export class PrismaAdapter extends BaseAdapter {
  readonly name: SupportedFramework = 'prisma';
  readonly language: SupportedLanguage = 'typescript';
  readonly filePatterns = [
    'schema.prisma',
    'prisma/schema.prisma',
    '**/*.prisma'
  ];
  readonly confidence = 95;

  protected matchesFrameworkPatterns(content: string): boolean {
    const patterns = [
      /model\s+\w+\s*\{/i,
      /generator\s+client\s*\{/i,
      /datasource\s+db\s*\{/i,
      /@id/i,
      /@unique/i,
      /@relation/i
    ];

    return patterns.some(pattern => pattern.test(content));
  }

  protected analyzeContentPatterns(content: string): number {
    let confidence = 0;

    if (content.includes('model ')) confidence += 25;
    if (content.includes('generator client')) confidence += 15;
    if (content.includes('datasource db')) confidence += 15;
    if (content.includes('@id')) confidence += 10;
    if (content.includes('@relation')) confidence += 10;

    return confidence;
  }

  protected analyzeFileLocation(filePath: string): number {
    if (filePath.endsWith('schema.prisma')) return 20;
    if (filePath.includes('/prisma/')) return 15;
    return 0;
  }

  async extractDefinitions(file: FileContent): Promise<ExtractionCandidate[]> {
    const candidates: ExtractionCandidate[] = [];
    const { content, info } = file;

    // Extract model definitions
    const modelPattern = /model\s+(\w+)\s*\{([^}]+)\}/gs;
    let match;

    while ((match = modelPattern.exec(content)) !== null) {
      const modelName = match[1];
      const modelBody = match[2];
      const startPos = match.index;
      const endPos = startPos + match[0].length;
      const startLine = this.getLineNumber(content, startPos);
      const endLine = this.getLineNumber(content, endPos);

      candidates.push({
        file: info,
        type: 'model',
        confidence: 95,
        startLine,
        endLine,
        content: match[0],
        framework: 'prisma',
        metadata: {
          modelName,
          modelBody
        }
      });
    }

    // Extract enum definitions
    const enumPattern = /enum\s+(\w+)\s*\{([^}]+)\}/gs;
    while ((match = enumPattern.exec(content)) !== null) {
      const enumName = match[1];
      const enumBody = match[2];
      const startPos = match.index;
      const endPos = startPos + match[0].length;
      const startLine = this.getLineNumber(content, startPos);
      const endLine = this.getLineNumber(content, endPos);

      candidates.push({
        file: info,
        type: 'schema',
        confidence: 90,
        startLine,
        endLine,
        content: match[0],
        framework: 'prisma',
        metadata: {
          enumName,
          enumBody,
          type: 'enum'
        }
      });
    }

    return candidates;
  }

  async parseToIR(candidates: ExtractionCandidate[]): Promise<IRTable[]> {
    const tables: IRTable[] = [];

    for (const candidate of candidates) {
      if (candidate.type === 'model') {
        const table = this.parseModelToTable(candidate);
        if (table) {
          tables.push(table);
        }
      }
    }

    return tables;
  }

  private parseModelToTable(candidate: ExtractionCandidate): IRTable | null {
    const { modelName, modelBody } = candidate.metadata;
    if (!modelName || !modelBody) return null;

    const fields: IRField[] = [];
    const lines = modelBody.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) continue;

      const field = this.parseField(trimmed, candidate);
      if (field) {
        fields.push(field);
      }
    }

    // Extract table-level attributes
    const indexes: any[] = [];
    const constraints: any[] = [];

    const indexMatches = modelBody.matchAll(/@@index\(\[([^\]]+)\](?:,\s*name:\s*"([^"]+)")?\)/g);
    for (const match of indexMatches) {
      indexes.push({
        name: match[2] || `idx_${modelName}_${match[1].replace(/,\s*/g, '_')}`,
        fields: match[1].split(',').map(f => f.trim()),
        unique: false
      });
    }

    const uniqueMatches = modelBody.matchAll(/@@unique\(\[([^\]]+)\](?:,\s*name:\s*"([^"]+)")?\)/g);
    for (const match of uniqueMatches) {
      indexes.push({
        name: match[2] || `uniq_${modelName}_${match[1].replace(/,\s*/g, '_')}`,
        fields: match[1].split(',').map(f => f.trim()),
        unique: true
      });
    }

    return {
      name: this.extractTableName(modelName),
      fields,
      indexes,
      constraints,
      triggers: [],
      metadata: {
        framework: 'prisma',
        language: 'typescript',
        confidence: candidate.confidence,
        tags: ['prisma', 'model']
      },
      sourceLocation: this.createSourceLocation(
        candidate.file,
        candidate.startLine,
        candidate.endLine
      )
    };
  }

  private parseField(fieldLine: string, candidate: ExtractionCandidate): IRField | null {
    // Parse: fieldName Type @decorators
    const fieldMatch = fieldLine.match(/^(\w+)\s+(\w+)(\??|\[\])?(.*)$/);
    if (!fieldMatch) return null;

    const fieldName = fieldMatch[1];
    const fieldType = fieldMatch[2];
    const modifiers = fieldMatch[3] || '';
    const decorators = fieldMatch[4] || '';

    const isOptional = modifiers.includes('?');
    const isArray = modifiers.includes('[]');
    const isPrimaryKey = decorators.includes('@id');
    const isUnique = decorators.includes('@unique');
    const isAutoIncrement = decorators.includes('@default(autoincrement())');

    // Extract default value
    let defaultValue: any = undefined;
    const defaultMatch = decorators.match(/@default\(([^)]+)\)/);
    if (defaultMatch) {
      const defaultStr = defaultMatch[1];
      if (defaultStr === 'now()' || defaultStr === 'autoincrement()') {
        // Special functions
        defaultValue = undefined;
      } else if (defaultStr.startsWith('"') || defaultStr.startsWith("'")) {
        defaultValue = defaultStr.slice(1, -1);
      } else if (defaultStr === 'true' || defaultStr === 'false') {
        defaultValue = defaultStr === 'true';
      } else if (!isNaN(Number(defaultStr))) {
        defaultValue = Number(defaultStr);
      } else {
        defaultValue = defaultStr;
      }
    }

    // Extract foreign key relation
    let foreignKey: IRField['foreignKey'] = undefined;
    const relationMatch = decorators.match(/@relation\(.*?references:\s*\[(\w+)\]/);
    if (relationMatch) {
      // Try to extract the related model
      const relatedFieldMatch = decorators.match(/@relation\(.*?fields:\s*\[(\w+)\]/);
      if (relatedFieldMatch) {
        foreignKey = {
          table: this.extractTableName(fieldType),
          field: relationMatch[1],
          onDelete: this.extractOnDelete(decorators),
          onUpdate: this.extractOnUpdate(decorators)
        };
      }
    }

    const dataType = this.mapPrismaType(fieldType, isArray);

    return {
      name: fieldName,
      type: dataType,
      nullable: isOptional,
      primaryKey: isPrimaryKey,
      unique: isUnique,
      autoIncrement: isAutoIncrement,
      defaultValue,
      constraints: {},
      foreignKey,
      indexes: [],
      sourceLocation: this.createSourceLocation(
        candidate.file,
        candidate.startLine,
        candidate.endLine
      )
    };
  }

  private mapPrismaType(prismaType: string, isArray: boolean): any {
    const typeMap: Record<string, any> = {
      'String': 'VARCHAR',
      'Int': 'INTEGER',
      'BigInt': 'BIGINT',
      'Float': 'FLOAT',
      'Decimal': 'DECIMAL',
      'Boolean': 'BOOLEAN',
      'DateTime': 'DATETIME',
      'Json': 'JSON',
      'Bytes': 'BLOB'
    };

    const baseType = typeMap[prismaType] || 'VARCHAR';
    return isArray ? 'JSON' : baseType;
  }

  private extractOnDelete(decorators: string): 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' | undefined {
    const match = decorators.match(/onDelete:\s*(\w+)/);
    if (match) {
      const action = match[1].toUpperCase();
      if (action === 'CASCADE' || action === 'SETNULL' || action === 'RESTRICT' || action === 'NOACTION') {
        return action === 'SETNULL' ? 'SET NULL' : action === 'NOACTION' ? 'NO ACTION' : action as any;
      }
    }
    return undefined;
  }

  private extractOnUpdate(decorators: string): 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' | undefined {
    const match = decorators.match(/onUpdate:\s*(\w+)/);
    if (match) {
      const action = match[1].toUpperCase();
      if (action === 'CASCADE' || action === 'SETNULL' || action === 'RESTRICT' || action === 'NOACTION') {
        return action === 'SETNULL' ? 'SET NULL' : action === 'NOACTION' ? 'NO ACTION' : action as any;
      }
    }
    return undefined;
  }

  private getLineNumber(content: string, position: number): number {
    return content.substring(0, position).split('\n').length - 1;
  }

  protected getDataTypeMap(): Record<string, any> {
    return {
      'string': 'VARCHAR',
      'int': 'INTEGER',
      'bigint': 'BIGINT',
      'float': 'FLOAT',
      'decimal': 'DECIMAL',
      'boolean': 'BOOLEAN',
      'datetime': 'DATETIME',
      'json': 'JSON',
      'bytes': 'BLOB'
    };
  }
}
