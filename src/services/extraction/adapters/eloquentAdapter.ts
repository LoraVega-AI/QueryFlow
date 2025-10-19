// Eloquent Framework Adapter

import { BaseAdapter } from './baseAdapter';
import { FileContent, ExtractionCandidate, IRTable, IRField, SupportedFramework, SupportedLanguage } from '@/types/extraction';

export class EloquentAdapter extends BaseAdapter {
  readonly name: SupportedFramework = 'eloquent';
  readonly language: SupportedLanguage = 'php';
  readonly filePatterns = ['app/Models/*.php', 'app/*.php'];
  readonly confidence = 85;

  protected matchesFrameworkPatterns(content: string): boolean {
    return /extends\s+Model|protected\s+\$fillable/i.test(content);
  }

  protected analyzeContentPatterns(content: string): number {
    return content.includes('extends Model') ? 20 : 0;
  }

  async extractDefinitions(file: FileContent): Promise<ExtractionCandidate[]> {
    const candidates: ExtractionCandidate[] = [];
    const { content, info } = file;

    // Extract Eloquent Model classes
    const modelPattern = /class\s+(\w+)\s+extends\s+Model\s*\{([^}]+(?:\}[^}]*\{[^}]*)*[^}]*)\}/gs;
    let match;

    while ((match = modelPattern.exec(content)) !== null) {
      const modelName = match[1];
      const classBody = match[2];
      const startPos = match.index;
      const endPos = startPos + match[0].length;
      const startLine = this.getLineNumber(content, startPos);
      const endLine = this.getLineNumber(content, endPos);

      candidates.push({
        file: info,
        type: 'model',
        confidence: 90,
        startLine,
        endLine,
        content: match[0],
        framework: 'eloquent',
        metadata: {
          modelName,
          classBody
        }
      });
    }

    return candidates;
  }

  async parseToIR(candidates: ExtractionCandidate[]): Promise<IRTable[]> {
    const tables: IRTable[] = [];

    for (const candidate of candidates) {
      const table = this.parseModelToTable(candidate);
      if (table) {
        tables.push(table);
      }
    }

    return tables;
  }

  private parseModelToTable(candidate: ExtractionCandidate): IRTable | null {
    const { modelName, classBody } = candidate.metadata;
    if (!modelName || !classBody) return null;

    let tableName = modelName;
    const fields: IRField[] = [];

    // Extract table name if explicitly defined
    const tableMatch = classBody.match(/protected\s+\$table\s*=\s*['"`]([^'"`]+)['"`]/);
    if (tableMatch) {
      tableName = tableMatch[1];
    } else {
      // Laravel convention: Model name pluralized and snake_cased
      tableName = this.pluralize(this.extractTableName(modelName));
    }

    // Extract fillable fields
    const fillableMatch = classBody.match(/protected\s+\$fillable\s*=\s*\[([\s\S]*?)\]/);
    if (fillableMatch) {
      const fillableFields = fillableMatch[1]
        .split(',')
        .map(f => f.trim().replace(/['"`]/g, ''))
        .filter(f => f.length > 0);

      for (const fieldName of fillableFields) {
        fields.push({
          name: fieldName,
          type: 'VARCHAR',
          nullable: true,
          primaryKey: false,
          unique: false,
          autoIncrement: false,
          constraints: {},
          indexes: [],
          sourceLocation: this.createSourceLocation(
            candidate.file,
            candidate.startLine,
            candidate.endLine
          )
        });
      }
    }

    // Extract casts to infer types
    const castsMatch = classBody.match(/protected\s+\$casts\s*=\s*\[([\s\S]*?)\]/);
    if (castsMatch) {
      const casts = this.parseCasts(castsMatch[1]);
      for (const [fieldName, castType] of Object.entries(casts)) {
        const field = fields.find(f => f.name === fieldName);
        if (field) {
          field.type = this.mapCastType(castType);
        } else {
          fields.push({
            name: fieldName,
            type: this.mapCastType(castType),
            nullable: true,
            primaryKey: false,
            unique: false,
            autoIncrement: false,
            constraints: {},
            indexes: [],
            sourceLocation: this.createSourceLocation(
              candidate.file,
              candidate.startLine,
              candidate.endLine
            )
          });
        }
      }
    }

    // Track inferred fields
    const inferredFields: string[] = [];

    // Add default id field if not present and conditions are met
    const hasIdField = fields.some(f => f.name === 'id' || f.primaryKey);
    if (!hasIdField && this.shouldInferPrimaryKey(candidate)) {
      fields.unshift({
        name: 'id',
        type: 'BIGINT',
        nullable: false,
        primaryKey: true,
        unique: true,
        autoIncrement: true,
        constraints: {},
        indexes: [],
        sourceLocation: this.createSourceLocation(
          candidate.file,
          candidate.startLine,
          candidate.endLine
        )
      });
      inferredFields.push('id');
    }

    // Add timestamps if not disabled and conditions are met
    if (!classBody.includes('$timestamps = false') && this.shouldInferPrimaryKey(candidate)) {
      if (!fields.some(f => f.name === 'created_at')) {
        fields.push({
          name: 'created_at',
          type: 'TIMESTAMP',
          nullable: true,
          primaryKey: false,
          unique: false,
          autoIncrement: false,
          constraints: {},
          indexes: [],
          sourceLocation: this.createSourceLocation(
            candidate.file,
            candidate.startLine,
            candidate.endLine
          )
        });
        inferredFields.push('created_at');
      }
      if (!fields.some(f => f.name === 'updated_at')) {
        fields.push({
          name: 'updated_at',
          type: 'TIMESTAMP',
          nullable: true,
          primaryKey: false,
          unique: false,
          autoIncrement: false,
          constraints: {},
          indexes: [],
          sourceLocation: this.createSourceLocation(
            candidate.file,
            candidate.startLine,
            candidate.endLine
          )
        });
        inferredFields.push('updated_at');
      }
    }

    return {
      name: tableName,
      fields,
      indexes: [],
      constraints: [],
      triggers: [],
      metadata: {
        framework: 'eloquent',
        language: 'php',
        confidence: candidate.confidence,
        tags: ['eloquent', 'model'],
        inferred: inferredFields.length > 0,
        inferredFields: inferredFields
      },
      sourceLocation: this.createSourceLocation(
        candidate.file,
        candidate.startLine,
        candidate.endLine
      )
    };
  }

  private parseCasts(castsStr: string): Record<string, string> {
    const casts: Record<string, string> = {};
    const pattern = /['"`]([^'"`]+)['"`]\s*=>\s*['"`]([^'"`]+)['"`]/g;
    let match;

    while ((match = pattern.exec(castsStr)) !== null) {
      casts[match[1]] = match[2];
    }

    return casts;
  }

  private mapCastType(castType: string): any {
    const typeMap: Record<string, any> = {
      'int': 'INTEGER',
      'integer': 'INTEGER',
      'real': 'REAL',
      'float': 'FLOAT',
      'double': 'DOUBLE',
      'decimal': 'DECIMAL',
      'string': 'VARCHAR',
      'bool': 'BOOLEAN',
      'boolean': 'BOOLEAN',
      'object': 'JSON',
      'array': 'JSON',
      'json': 'JSON',
      'collection': 'JSON',
      'date': 'DATE',
      'datetime': 'DATETIME',
      'timestamp': 'TIMESTAMP'
    };

    return typeMap[castType.toLowerCase()] || 'VARCHAR';
  }

  private pluralize(word: string): string {
    // Simple pluralization (Laravel uses Str::plural which is more complex)
    if (word.endsWith('y') && !['ay', 'ey', 'iy', 'oy', 'uy'].some(end => word.endsWith(end))) {
      return word.slice(0, -1) + 'ies';
    }
    if (word.endsWith('s') || word.endsWith('sh') || word.endsWith('ch') || word.endsWith('x') || word.endsWith('z')) {
      return word + 'es';
    }
    return word + 's';
  }

  private getLineNumber(content: string, position: number): number {
    return content.substring(0, position).split('\n').length - 1;
  }

  protected getDataTypeMap(): Record<string, any> {
    return { 'string': 'VARCHAR', 'integer': 'INTEGER' };
  }
}
