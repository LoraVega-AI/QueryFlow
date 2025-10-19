// Hibernate Framework Adapter

import { BaseAdapter } from './baseAdapter';
import { FileContent, ExtractionCandidate, IRTable, IRField, SupportedFramework, SupportedLanguage } from '@/types/extraction';

export class HibernateAdapter extends BaseAdapter {
  readonly name: SupportedFramework = 'hibernate';
  readonly language: SupportedLanguage = 'java';
  readonly filePatterns = ['**/*Entity*.java', 'entities/*.java'];
  readonly confidence = 90;

  protected matchesFrameworkPatterns(content: string): boolean {
    return /@Entity|@Table|@Column/i.test(content);
  }

  protected analyzeContentPatterns(content: string): number {
    return content.includes('@Entity') ? 25 : 0;
  }

  async extractDefinitions(file: FileContent): Promise<ExtractionCandidate[]> {
    const candidates: ExtractionCandidate[] = [];
    const { content, info } = file;

    // Extract @Entity annotated classes
    const entityPattern = /@Entity\s*(?:\([^)]*\))?\s*(?:@Table\s*\([^)]*\))?\s*(?:public\s+)?class\s+(\w+)(?:\s+extends\s+\w+)?(?:\s+implements\s+[^{]+)?\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/gs;
    let match;

    while ((match = entityPattern.exec(content)) !== null) {
      const className = match[1];
      const classBody = match[2];
      const fullMatch = match[0];
      const startPos = match.index;
      const endPos = startPos + fullMatch.length;
      const startLine = this.getLineNumber(content, startPos);
      const endLine = this.getLineNumber(content, endPos);

      // Extract @Table annotation for table name
      let tableName = className;
      const tableMatch = fullMatch.match(/@Table\s*\(\s*name\s*=\s*"([^"]+)"/);
      if (tableMatch) {
        tableName = tableMatch[1];
      }

      candidates.push({
        file: info,
        type: 'model',
        confidence: 95,
        startLine,
        endLine,
        content: fullMatch,
        framework: 'hibernate',
        metadata: {
          className,
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
    const { className, tableName, classBody } = candidate.metadata;
    if (!className || !classBody) return null;

    const fields: IRField[] = [];

    // Parse field declarations with annotations
    // Pattern: annotations + field declaration
    const fieldPattern = /((?:@\w+\s*(?:\([^)]*\))?\s*)+)\s*(?:private|protected|public)?\s+(\w+(?:<[^>]+>)?)\s+(\w+)\s*;/g;
    let match;

    while ((match = fieldPattern.exec(classBody)) !== null) {
      const annotations = match[1];
      const fieldType = match[2];
      const fieldName = match[3];

      const field = this.parseField(fieldName, fieldType, annotations, candidate);
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
        framework: 'hibernate',
        language: 'java',
        confidence: candidate.confidence,
        tags: ['hibernate', 'jpa', 'entity']
      },
      sourceLocation: this.createSourceLocation(
        candidate.file,
        candidate.startLine,
        candidate.endLine
      )
    };
  }

  private parseField(name: string, type: string, annotations: string, candidate: ExtractionCandidate): IRField | null {
    let nullable = true;
    let primaryKey = false;
    let unique = false;
    let autoIncrement = false;
    let defaultValue: any = undefined;
    let foreignKey: { table: string; field: string } | null = null;

    // Check for @Id annotation
    if (/@Id\b/.test(annotations)) {
      primaryKey = true;
      nullable = false;
    }

    // Check for @GeneratedValue
    if (/@GeneratedValue/.test(annotations)) {
      autoIncrement = true;
    }

    // Check for @Column annotation
    const columnMatch = annotations.match(/@Column\s*\(([^)]+)\)/);
    if (columnMatch) {
      const columnParams = columnMatch[1];
      
      // Check nullable
      const nullableMatch = columnParams.match(/nullable\s*=\s*(true|false)/);
      if (nullableMatch) {
        nullable = nullableMatch[1] === 'true';
      }

      // Check unique
      const uniqueMatch = columnParams.match(/unique\s*=\s*(true|false)/);
      if (uniqueMatch) {
        unique = uniqueMatch[1] === 'true';
      }

      // Check column name
      const nameMatch = columnParams.match(/name\s*=\s*"([^"]+)"/);
      if (nameMatch) {
        name = nameMatch[1];
      }
    }

    // Check for @ManyToOne, @OneToOne (foreign keys)
    const manyToOneMatch = annotations.match(/@(?:ManyToOne|OneToOne)\s*(?:\([^)]*\))?/);
    if (manyToOneMatch) {
      const joinColumnMatch = annotations.match(/@JoinColumn\s*\(\s*name\s*=\s*"([^"]+)"(?:,\s*referencedColumnName\s*=\s*"([^"]+)")?\)/);
      if (joinColumnMatch) {
        // Try to infer referenced table from field type
        const referencedTable = type.replace(/^(\w+).*$/, '$1');
        foreignKey = {
          table: this.extractTableName(referencedTable),
          field: joinColumnMatch[2] || 'id'
        };
      }
    }

    if (primaryKey) {
      nullable = false;
    }

    return {
      name,
      type: this.mapJavaType(type),
      nullable,
      primaryKey,
      unique,
      autoIncrement,
      defaultValue,
      foreignKey: foreignKey || undefined,
      constraints: {},
      indexes: [],
      sourceLocation: this.createSourceLocation(
        candidate.file,
        candidate.startLine,
        candidate.endLine
      )
    };
  }

  private mapJavaType(javaType: string): any {
    // Remove generic type parameters
    const baseType = javaType.replace(/<[^>]+>/, '');
    
    const typeMap: Record<string, any> = {
      'String': 'VARCHAR',
      'Integer': 'INTEGER',
      'int': 'INTEGER',
      'Long': 'BIGINT',
      'long': 'BIGINT',
      'Short': 'SMALLINT',
      'short': 'SMALLINT',
      'Byte': 'TINYINT',
      'byte': 'TINYINT',
      'Boolean': 'BOOLEAN',
      'boolean': 'BOOLEAN',
      'Double': 'DOUBLE',
      'double': 'DOUBLE',
      'Float': 'FLOAT',
      'float': 'FLOAT',
      'BigDecimal': 'DECIMAL',
      'Date': 'TIMESTAMP',
      'LocalDate': 'DATE',
      'LocalDateTime': 'TIMESTAMP',
      'LocalTime': 'TIME',
      'Timestamp': 'TIMESTAMP',
      'byte[]': 'BLOB',
      'Byte[]': 'BLOB',
      'char': 'CHAR',
      'Character': 'CHAR'
    };

    return typeMap[baseType] || 'VARCHAR';
  }

  private getLineNumber(content: string, position: number): number {
    return content.substring(0, position).split('\n').length - 1;
  }

  protected getDataTypeMap(): Record<string, any> {
    return { 'string': 'VARCHAR', 'int': 'INTEGER' };
  }
}
