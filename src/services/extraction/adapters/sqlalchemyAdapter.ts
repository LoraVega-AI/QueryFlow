// SQLAlchemy Framework Adapter

import { BaseAdapter } from './baseAdapter';
import { FileContent, ExtractionCandidate, IRTable, IRField, SupportedFramework, SupportedLanguage } from '@/types/extraction';

export class SQLAlchemyAdapter extends BaseAdapter {
  readonly name: SupportedFramework = 'sqlalchemy';
  readonly language: SupportedLanguage = 'python';
  readonly filePatterns = ['models/**/*.py', '**/*model*.py'];
  readonly confidence = 85;

  protected matchesFrameworkPatterns(content: string): boolean {
    return /Column\(|__tablename__|Base\.metadata/i.test(content);
  }

  protected analyzeContentPatterns(content: string): number {
    return content.includes('Column(') ? 20 : 0;
  }

  async extractDefinitions(file: FileContent): Promise<ExtractionCandidate[]> {
    const candidates: ExtractionCandidate[] = [];
    const { content, info } = file;

    // Match SQLAlchemy model classes
    const modelPattern = /class\s+(\w+)\s*\([^)]*Base[^)]*\)\s*:([\s\S]*?)(?=\nclass\s|\Z)/gm;
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
        framework: 'sqlalchemy',
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

    // Extract __tablename__
    const tableNameMatch = classBody.match(/__tablename__\s*=\s*['"`]([^'"`]+)['"`]/);
    if (tableNameMatch) {
      tableName = tableNameMatch[1];
    }

    // Parse Column definitions
    const columnPattern = /(\w+)\s*=\s*Column\s*\(([^)]+(?:\([^)]*\))?[^)]*)\)/g;
    let match;

    while ((match = columnPattern.exec(classBody)) !== null) {
      const fieldName = match[1];
      const columnDef = match[2];

      const field = this.parseColumn(fieldName, columnDef, candidate);
      if (field) {
        fields.push(field);
      }
    }

    return {
      name: this.extractTableName(tableName),
      fields,
      indexes: [],
      constraints: [],
      triggers: [],
      metadata: {
        framework: 'sqlalchemy',
        language: 'python',
        confidence: candidate.confidence,
        tags: ['sqlalchemy', 'model']
      },
      sourceLocation: this.createSourceLocation(
        candidate.file,
        candidate.startLine,
        candidate.endLine
      )
    };
  }

  private parseColumn(fieldName: string, columnDef: string, candidate: ExtractionCandidate): IRField | null {
    let dataType = 'VARCHAR';
    let nullable = true;
    let primaryKey = false;
    let unique = false;
    let autoIncrement = false;
    let defaultValue: any = undefined;
    let foreignKey: IRField['foreignKey'] = undefined;

    // Extract type
    const typeMatch = columnDef.match(/^\s*(\w+)/);
    if (typeMatch) {
      const sqlalchemyType = typeMatch[1];
      dataType = this.mapSQLAlchemyType(sqlalchemyType);
    }

    // Check constraints
    primaryKey = /primary_key\s*=\s*True/i.test(columnDef);
    nullable = !/nullable\s*=\s*False/i.test(columnDef);
    unique = /unique\s*=\s*True/i.test(columnDef);
    autoIncrement = /autoincrement\s*=\s*True/i.test(columnDef);

    // Extract default
    const defaultMatch = columnDef.match(/default\s*=\s*(['"`]([^'"`]+)['"`]|(\d+)|True|False)/);
    if (defaultMatch) {
      if (defaultMatch[2]) {
        defaultValue = defaultMatch[2];
      } else if (defaultMatch[3]) {
        defaultValue = Number(defaultMatch[3]);
      } else if (defaultMatch[1] === 'True' || defaultMatch[1] === 'False') {
        defaultValue = defaultMatch[1] === 'True';
      }
    }

    // Check for ForeignKey
    const fkMatch = columnDef.match(/ForeignKey\s*\(\s*['"`]([^'"`]+)\.([^'"`]+)['"`]/);
    if (fkMatch) {
      foreignKey = {
        table: fkMatch[1],
        field: fkMatch[2]
      };
    }

    return {
      name: fieldName,
      type: dataType,
      nullable,
      primaryKey,
      unique,
      autoIncrement,
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

  private mapSQLAlchemyType(saType: string): any {
    const typeMap: Record<string, any> = {
      'String': 'VARCHAR',
      'Text': 'TEXT',
      'Integer': 'INTEGER',
      'BigInteger': 'BIGINT',
      'SmallInteger': 'INTEGER',
      'Float': 'FLOAT',
      'Numeric': 'DECIMAL',
      'Boolean': 'BOOLEAN',
      'Date': 'DATE',
      'DateTime': 'DATETIME',
      'Time': 'TIME',
      'LargeBinary': 'BLOB',
      'JSON': 'JSON',
      'UUID': 'UUID'
    };

    return typeMap[saType] || 'VARCHAR';
  }

  private getLineNumber(content: string, position: number): number {
    return content.substring(0, position).split('\n').length - 1;
  }

  protected getDataTypeMap(): Record<string, any> {
    return { 'string': 'VARCHAR', 'integer': 'INTEGER', 'text': 'TEXT' };
  }
}
