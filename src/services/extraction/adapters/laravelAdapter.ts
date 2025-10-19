// Laravel Framework Adapter

import { BaseAdapter } from './baseAdapter';
import { FileContent, ExtractionCandidate, IRTable, IRField, SupportedFramework, SupportedLanguage } from '@/types/extraction';

export class LaravelAdapter extends BaseAdapter {
  readonly name: SupportedFramework = 'laravel';
  readonly language: SupportedLanguage = 'php';
  readonly filePatterns = ['database/migrations/*.php'];
  readonly confidence = 90;

  protected matchesFrameworkPatterns(content: string): boolean {
    return /Schema::|Blueprint/i.test(content);
  }

  protected analyzeContentPatterns(content: string): number {
    return content.includes('Schema::') ? 25 : 0;
  }

  async extractDefinitions(file: FileContent): Promise<ExtractionCandidate[]> {
    const candidates: ExtractionCandidate[] = [];
    const { content, info } = file;

    // Extract Schema::create patterns
    const createPattern = /Schema::create\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*function\s*\(\s*(?:Blueprint\s+)?\$(\w+)\s*\)\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/gs;
    let match;

    while ((match = createPattern.exec(content)) !== null) {
      const tableName = match[1];
      const blueprintVar = match[2];
      const schemaBody = match[3];
      const startPos = match.index;
      const endPos = startPos + match[0].length;
      const startLine = this.getLineNumber(content, startPos);
      const endLine = this.getLineNumber(content, endPos);

      candidates.push({
        file: info,
        type: 'migration',
        confidence: 95,
        startLine,
        endLine,
        content: match[0],
        framework: 'laravel',
        metadata: {
          tableName,
          blueprintVar,
          schemaBody,
          operation: 'create'
        }
      });
    }

    // Extract Schema::table patterns (for modifications)
    const tablePattern = /Schema::table\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*function\s*\(\s*(?:Blueprint\s+)?\$(\w+)\s*\)\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/gs;
    
    while ((match = tablePattern.exec(content)) !== null) {
      const tableName = match[1];
      const blueprintVar = match[2];
      const schemaBody = match[3];
      const startPos = match.index;
      const endPos = startPos + match[0].length;
      const startLine = this.getLineNumber(content, startPos);
      const endLine = this.getLineNumber(content, endPos);

      candidates.push({
        file: info,
        type: 'migration',
        confidence: 90,
        startLine,
        endLine,
        content: match[0],
        framework: 'laravel',
        metadata: {
          tableName,
          blueprintVar,
          schemaBody,
          operation: 'modify'
        }
      });
    }

    return candidates;
  }

  async parseToIR(candidates: ExtractionCandidate[]): Promise<IRTable[]> {
    const tables: IRTable[] = [];

    for (const candidate of candidates) {
      if (candidate.metadata.operation === 'create') {
        const table = this.parseCreateMigration(candidate);
        if (table) {
          tables.push(table);
        }
      }
    }

    return tables;
  }

  private parseCreateMigration(candidate: ExtractionCandidate): IRTable | null {
    const { tableName, blueprintVar, schemaBody } = candidate.metadata;
    if (!tableName || !schemaBody) return null;

    const fields: IRField[] = [];
    const indexes: any[] = [];

    // Parse column definitions: $table->string('name')
    const columnPattern = new RegExp(`\\$${blueprintVar}->([a-zA-Z]+)\\s*\\(\\s*['"\`]([^'"\`]+)['"\`](?:\\s*,\\s*([^)]+))?\\)([^;]*);`, 'g');
    let match;

    while ((match = columnPattern.exec(schemaBody)) !== null) {
      const columnType = match[1];
      const columnName = match[2];
      const columnSize = match[3];
      const modifiers = match[4] || '';

      const field = this.parseColumn(columnName, columnType, columnSize, modifiers, candidate);
      if (field) {
        fields.push(field);
      }
    }

    // Parse indexes
    const indexPattern = new RegExp(`\\$${blueprintVar}->(?:index|unique)\\s*\\(\\s*(?:\\[([^\\]]+)\\]|['"\`]([^'"\`]+)['"\`])`, 'g');
    while ((match = indexPattern.exec(schemaBody)) !== null) {
      const fieldsStr = match[1] || match[2];
      const isUnique = match[0].includes('->unique');
      
      const indexFields = fieldsStr.includes(',') 
        ? fieldsStr.split(',').map(f => f.trim().replace(/['"`]/g, ''))
        : [fieldsStr.replace(/['"`]/g, '')];

      indexes.push({
        name: `idx_${tableName}_${indexFields.join('_')}`,
        fields: indexFields,
        unique: isUnique
      });
    }

    // Parse foreign keys
    const foreignPattern = new RegExp(`\\$${blueprintVar}->foreign\\s*\\(\\s*['"\`]([^'"\`]+)['"\`]\\s*\\)->references\\s*\\(\\s*['"\`]([^'"\`]+)['"\`]\\s*\\)->on\\s*\\(\\s*['"\`]([^'"\`]+)['"\`]`, 'g');
    while ((match = foreignPattern.exec(schemaBody)) !== null) {
      const fieldName = match[1];
      const referencedField = match[2];
      const referencedTable = match[3];

      // Update the field with foreign key info
      const field = fields.find(f => f.name === fieldName);
      if (field) {
        field.foreignKey = {
          table: referencedTable,
          field: referencedField
        };
      }
    }

    return {
      name: this.extractTableName(tableName),
      fields,
      indexes,
      constraints: [],
      triggers: [],
      metadata: {
        framework: 'laravel',
        language: 'php',
        confidence: candidate.confidence,
        tags: ['laravel', 'migration']
      },
      sourceLocation: this.createSourceLocation(
        candidate.file,
        candidate.startLine,
        candidate.endLine
      )
    };
  }

  private parseColumn(name: string, type: string, size: string | undefined, modifiers: string, candidate: ExtractionCandidate): IRField | null {
    const dataType = this.mapLaravelType(type, size);
    let nullable = modifiers.includes('->nullable()');
    let unique = modifiers.includes('->unique()');
    let primaryKey = type === 'id' || type === 'bigIncrements' || type === 'increments';
    let autoIncrement = primaryKey || type === 'increments' || type === 'bigIncrements';
    let defaultValue: any = undefined;

    // Extract default value
    const defaultMatch = modifiers.match(/->default\s*\(\s*(['"`]([^'"`]+)['"`]|(\d+)|true|false)\s*\)/);
    if (defaultMatch) {
      if (defaultMatch[2]) {
        defaultValue = defaultMatch[2];
      } else if (defaultMatch[3]) {
        defaultValue = Number(defaultMatch[3]);
      } else if (defaultMatch[1] === 'true' || defaultMatch[1] === 'false') {
        defaultValue = defaultMatch[1] === 'true';
      }
    }

    if (primaryKey) {
      nullable = false;
    }

    return {
      name,
      type: dataType,
      nullable,
      primaryKey,
      unique,
      autoIncrement,
      defaultValue,
      constraints: {},
      indexes: [],
      sourceLocation: this.createSourceLocation(
        candidate.file,
        candidate.startLine,
        candidate.endLine
      )
    };
  }

  private mapLaravelType(laravelType: string, size?: string): any {
    const typeMap: Record<string, any> = {
      'id': 'BIGINT',
      'bigIncrements': 'BIGINT',
      'increments': 'INTEGER',
      'string': 'VARCHAR',
      'text': 'TEXT',
      'mediumText': 'TEXT',
      'longText': 'TEXT',
      'integer': 'INTEGER',
      'bigInteger': 'BIGINT',
      'smallInteger': 'INTEGER',
      'tinyInteger': 'INTEGER',
      'float': 'FLOAT',
      'double': 'DOUBLE',
      'decimal': 'DECIMAL',
      'boolean': 'BOOLEAN',
      'date': 'DATE',
      'dateTime': 'DATETIME',
      'timestamp': 'TIMESTAMP',
      'time': 'TIME',
      'year': 'INTEGER',
      'binary': 'BLOB',
      'json': 'JSON',
      'jsonb': 'JSONB',
      'uuid': 'UUID',
      'enum': 'VARCHAR',
      'set': 'VARCHAR'
    };

    return typeMap[laravelType] || 'VARCHAR';
  }

  private getLineNumber(content: string, position: number): number {
    return content.substring(0, position).split('\n').length - 1;
  }

  protected getDataTypeMap(): Record<string, any> {
    return { 'string': 'VARCHAR', 'integer': 'INTEGER' };
  }
}
