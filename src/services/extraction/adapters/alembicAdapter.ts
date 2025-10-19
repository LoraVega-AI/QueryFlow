// Alembic Framework Adapter (Python Database Migrations)

import { BaseAdapter } from './baseAdapter';
import { FileContent, ExtractionCandidate, IRTable, IRField, SupportedFramework, SupportedLanguage } from '@/types/extraction';

export class AlembicAdapter extends BaseAdapter {
  readonly name: SupportedFramework = 'alembic';
  readonly language: SupportedLanguage = 'python';
  readonly filePatterns = ['alembic/versions/*.py', 'migrations/*.py'];
  readonly confidence = 80;

  protected matchesFrameworkPatterns(content: string): boolean {
    return /op\.create_table|op\.add_column/i.test(content);
  }

  protected analyzeContentPatterns(content: string): number {
    return content.includes('op.create_table') ? 25 : 0;
  }

  async extractDefinitions(file: FileContent): Promise<ExtractionCandidate[]> {
    const candidates: ExtractionCandidate[] = [];
    const { content, info } = file;

    // Extract op.create_table() calls
    const createTablePattern = /op\.create_table\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*([\s\S]*?)\n\s*\)/g;
    let match;

    while ((match = createTablePattern.exec(content)) !== null) {
      const tableName = match[1];
      const columnsBlock = match[2];
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
        framework: 'alembic',
        metadata: {
          tableName,
          columnsBlock,
          operation: 'create_table'
        }
      });
    }

    return candidates;
  }

  async parseToIR(candidates: ExtractionCandidate[]): Promise<IRTable[]> {
    const tables: IRTable[] = [];

    for (const candidate of candidates) {
      if (candidate.metadata.operation === 'create_table') {
        const table = this.parseMigrationToTable(candidate);
        if (table) {
          tables.push(table);
        }
      }
    }

    return tables;
  }

  private parseMigrationToTable(candidate: ExtractionCandidate): IRTable | null {
    const { tableName, columnsBlock } = candidate.metadata;
    if (!tableName || !columnsBlock) return null;

    const fields: IRField[] = [];

    // Parse sa.Column() definitions
    const columnPattern = /sa\.Column\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*([^,)]+)(?:,\s*([^)]*))?\)/g;
    let match;

    while ((match = columnPattern.exec(columnsBlock)) !== null) {
      const columnName = match[1];
      const columnType = match[2].trim();
      const columnOptions = match[3] || '';

      const field = this.parseColumn(columnName, columnType, columnOptions, candidate);
      if (field) {
        fields.push(field);
      }
    }

    // Parse ForeignKeyConstraint
    const fkPattern = /sa\.ForeignKeyConstraint\s*\(\s*\[['"`]([^'"`]+)['"`]\]\s*,\s*\[['"`]([^.]+)\.([^'"`]+)['"`]\]/g;
    while ((match = fkPattern.exec(columnsBlock)) !== null) {
      const fieldName = match[1];
      const referencedTable = match[2];
      const referencedField = match[3];

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
      indexes: [],
      constraints: [],
      triggers: [],
      metadata: {
        framework: 'alembic',
        language: 'python',
        confidence: candidate.confidence,
        tags: ['alembic', 'migration', 'sqlalchemy']
      },
      sourceLocation: this.createSourceLocation(
        candidate.file,
        candidate.startLine,
        candidate.endLine
      )
    };
  }

  private parseColumn(name: string, type: string, options: string, candidate: ExtractionCandidate): IRField | null {
    let nullable = true;
    let primaryKey = false;
    let unique = false;
    let autoIncrement = false;
    let defaultValue: any = undefined;

    // Check for primary_key
    if (/primary_key\s*=\s*True/i.test(options)) {
      primaryKey = true;
      nullable = false;
    }

    // Check for nullable
    if (/nullable\s*=\s*False/i.test(options)) {
      nullable = false;
    } else if (/nullable\s*=\s*True/i.test(options)) {
      nullable = true;
    }

    // Check for unique
    if (/unique\s*=\s*True/i.test(options)) {
      unique = true;
    }

    // Check for autoincrement
    if (/autoincrement\s*=\s*True/i.test(options)) {
      autoIncrement = true;
    }

    // Extract default value
    const defaultMatch = options.match(/(?:server_)?default\s*=\s*(?:['"`]([^'"`]+)['"`]|(\d+)|([^,\s)]+))/i);
    if (defaultMatch) {
      defaultValue = defaultMatch[1] || defaultMatch[2] || defaultMatch[3];
      if (defaultMatch[2]) {
        defaultValue = Number(defaultValue);
      }
    }

    if (primaryKey) {
      nullable = false;
    }

    return {
      name,
      type: this.mapAlembicType(type),
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

  private mapAlembicType(alembicType: string): any {
    // Extract base type name, handle parametrized types like String(255)
    const baseType = alembicType.replace(/\([^)]*\)/, '').replace(/^sa\./, '').trim();
    
    const typeMap: Record<string, any> = {
      'Integer': 'INTEGER',
      'BigInteger': 'BIGINT',
      'SmallInteger': 'SMALLINT',
      'String': 'VARCHAR',
      'Text': 'TEXT',
      'Unicode': 'VARCHAR',
      'UnicodeText': 'TEXT',
      'Boolean': 'BOOLEAN',
      'Date': 'DATE',
      'DateTime': 'DATETIME',
      'Time': 'TIME',
      'Timestamp': 'TIMESTAMP',
      'Float': 'FLOAT',
      'Numeric': 'DECIMAL',
      'DECIMAL': 'DECIMAL',
      'LargeBinary': 'BLOB',
      'Binary': 'BLOB',
      'BLOB': 'BLOB',
      'PickleType': 'BLOB',
      'JSON': 'JSON',
      'ARRAY': 'JSON',
      'UUID': 'UUID',
      'Enum': 'VARCHAR'
    };

    return typeMap[baseType] || 'VARCHAR';
  }

  private getLineNumber(content: string, position: number): number {
    return content.substring(0, position).split('\n').length - 1;
  }

  protected getDataTypeMap(): Record<string, any> {
    return { 'string': 'VARCHAR', 'integer': 'INTEGER' };
  }
}
