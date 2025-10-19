// TypeORM Framework Adapter

import { BaseAdapter } from './baseAdapter';
import { FileContent, ExtractionCandidate, IRTable, IRField, SupportedFramework, SupportedLanguage } from '@/types/extraction';

export class TypeORMAdapter extends BaseAdapter {
  readonly name: SupportedFramework = 'typeorm';
  readonly language: SupportedLanguage = 'typescript';
  readonly filePatterns = ['entities/**/*.ts', 'entity/**/*.ts', '**/*entity*.ts'];
  readonly confidence = 90;

  protected matchesFrameworkPatterns(content: string): boolean {
    return /@Entity|@Column|@PrimaryGeneratedColumn/i.test(content);
  }

  protected analyzeContentPatterns(content: string): number {
    let confidence = 0;
    if (content.includes('@Entity')) confidence += 25;
    if (content.includes('@Column')) confidence += 15;
    return confidence;
  }

  async extractDefinitions(file: FileContent): Promise<ExtractionCandidate[]> {
    const candidates: ExtractionCandidate[] = [];
    const { content, info } = file;

    // Extract @Entity decorated classes
    const entityPattern = /@Entity\s*\((?:[^)]+)?\)\s*(?:export\s+)?class\s+(\w+)(?:\s+extends\s+\w+)?\s*\{([^}]+(?:\}[^}]*\{[^}]*)*[^}]*)\}/gs;
    let match;

    while ((match = entityPattern.exec(content)) !== null) {
      const entityName = match[1];
      const classBody = match[2];
      const fullMatch = match[0];
      const startPos = match.index;
      const endPos = startPos + fullMatch.length;
      const startLine = this.getLineNumber(content, startPos);
      const endLine = this.getLineNumber(content, endPos);

      // Extract @Entity decorator details
      const entityDecoratorMatch = fullMatch.match(/@Entity\s*\((['"`]([^'"`]+)['"`]|[^)]+)?\)/);
      let tableName = entityName;
      if (entityDecoratorMatch && entityDecoratorMatch[2]) {
        tableName = entityDecoratorMatch[2];
      } else if (entityDecoratorMatch && entityDecoratorMatch[1]) {
        // Try to extract from options object {name: 'table_name'}
        const nameMatch = entityDecoratorMatch[1].match(/name:\s*['"`]([^'"`]+)['"`]/);
        if (nameMatch) {
          tableName = nameMatch[1];
        }
      }

      candidates.push({
        file: info,
        type: 'model',
        confidence: 95,
        startLine,
        endLine,
        content: fullMatch,
        framework: 'typeorm',
        metadata: {
          entityName,
          tableName,
          classBody
        }
      });
    }

    return candidates;
  }

  async parseToIR(candidates: ExtractionCandidate[]): Promise<IRTable[]> {
    const tables: IRTable[] = [];

    for (const candidate of candidates) {
      const table = this.parseEntityToTable(candidate);
      if (table) {
        tables.push(table);
      }
    }

    return tables;
  }

  private parseEntityToTable(candidate: ExtractionCandidate): IRTable | null {
    const { entityName, tableName, classBody } = candidate.metadata;
    if (!entityName || !classBody) return null;

    const fields: IRField[] = [];
    const indexes: any[] = [];

    // Parse fields with decorators
    const lines = classBody.split('\n');
    let currentDecorators: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Collect decorators
      if (trimmed.startsWith('@')) {
        currentDecorators.push(trimmed);
        continue;
      }

      // Parse property declaration
      const propMatch = trimmed.match(/^(\w+)(?:\?)?:\s*([^;=]+)/);
      if (propMatch && currentDecorators.length > 0) {
        const fieldName = propMatch[1];
        const fieldType = propMatch[2].trim();
        
        const field = this.parseFieldWithDecorators(fieldName, fieldType, currentDecorators, candidate);
        if (field) {
          fields.push(field);
        }
        
        currentDecorators = [];
      }
    }

    // Extract indexes from @Index decorators at class level
    const indexMatches = candidate.content.matchAll(/@Index\s*\((?:['"`]([^'"`]+)['"`],\s*)?\[([^\]]+)\]/g);
    for (const match of indexMatches) {
      const indexName = match[1];
      const fieldsList = match[2].split(',').map(f => f.trim().replace(/['"`]/g, ''));
      
      indexes.push({
        name: indexName || `idx_${tableName || entityName}_${fieldsList.join('_')}`,
        fields: fieldsList,
        unique: false
      });
    }

    return {
      name: this.extractTableName(tableName || entityName),
      fields,
      indexes,
      constraints: [],
      triggers: [],
      metadata: {
        framework: 'typeorm',
        language: 'typescript',
        confidence: candidate.confidence,
        tags: ['typeorm', 'entity']
      },
      sourceLocation: this.createSourceLocation(
        candidate.file,
        candidate.startLine,
        candidate.endLine
      )
    };
  }

  private parseFieldWithDecorators(fieldName: string, fieldType: string, decorators: string[], candidate: ExtractionCandidate): IRField | null {
    let isPrimaryKey = false;
    let isAutoIncrement = false;
    let isUnique = false;
    let nullable = true;
    let defaultValue: any = undefined;
    let foreignKey: IRField['foreignKey'] = undefined;
    let dataType = this.mapTypeScriptType(fieldType);

    for (const decorator of decorators) {
      // @PrimaryGeneratedColumn
      if (decorator.includes('@PrimaryGeneratedColumn')) {
        isPrimaryKey = true;
        isAutoIncrement = true;
        nullable = false;
        dataType = 'INTEGER';
      }

      // @PrimaryColumn
      if (decorator.includes('@PrimaryColumn')) {
        isPrimaryKey = true;
        nullable = false;
      }

      // @Column
      if (decorator.includes('@Column')) {
        const columnMatch = decorator.match(/@Column\s*\(([^)]+)\)/);
        if (columnMatch) {
          const options = columnMatch[1];
          
          // Extract type
          const typeMatch = options.match(/type:\s*['"`]([^'"`]+)['"`]/);
          if (typeMatch) {
            dataType = this.mapDataType(typeMatch[1]);
          }

          // Extract nullable
          if (/nullable:\s*false/i.test(options)) {
            nullable = false;
          }
          if (/nullable:\s*true/i.test(options)) {
            nullable = true;
          }

          // Extract unique
          if (/unique:\s*true/i.test(options)) {
            isUnique = true;
          }

          // Extract default
          const defaultMatch = options.match(/default:\s*(['"`]([^'"`]+)['"`]|(\d+)|true|false)/);
          if (defaultMatch) {
            if (defaultMatch[2]) {
              defaultValue = defaultMatch[2];
            } else if (defaultMatch[3]) {
              defaultValue = Number(defaultMatch[3]);
            } else if (defaultMatch[1] === 'true' || defaultMatch[1] === 'false') {
              defaultValue = defaultMatch[1] === 'true';
            }
          }
        }
      }

      // @ManyToOne, @OneToOne (foreign keys)
      if (decorator.includes('@ManyToOne') || decorator.includes('@OneToOne')) {
        const relationMatch = decorator.match(/@(?:ManyToOne|OneToOne)\s*\(\s*\(\)\s*=>\s*(\w+)/);
        if (relationMatch) {
          const relatedEntity = relationMatch[1];
          foreignKey = {
            table: this.extractTableName(relatedEntity),
            field: 'id'
          };
        }
      }

      // @JoinColumn
      if (decorator.includes('@JoinColumn')) {
        const joinMatch = decorator.match(/@JoinColumn\s*\(\s*\{\s*name:\s*['"`]([^'"`]+)['"`]/);
        if (joinMatch && foreignKey) {
          // Update the foreign key field name if specified
          foreignKey.field = joinMatch[1];
        }
      }
    }

    return {
      name: fieldName,
      type: dataType,
      nullable,
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

  private mapTypeScriptType(tsType: string): any {
    const normalized = tsType.toLowerCase().trim();
    
    if (normalized === 'string') return 'VARCHAR';
    if (normalized === 'number') return 'REAL';
    if (normalized === 'boolean') return 'BOOLEAN';
    if (normalized === 'date') return 'DATETIME';
    if (normalized.includes('[]')) return 'JSON';
    
    return 'VARCHAR';
  }

  private getLineNumber(content: string, position: number): number {
    return content.substring(0, position).split('\n').length - 1;
  }

  protected getDataTypeMap(): Record<string, any> {
    return {
      'varchar': 'VARCHAR',
      'int': 'INTEGER',
      'text': 'TEXT',
      'boolean': 'BOOLEAN',
      'datetime': 'DATETIME',
      'decimal': 'DECIMAL'
    };
  }
}
