// Spring Data Framework Adapter
// Note: Spring Data uses JPA entities, so this adapter focuses on repository inference

import { BaseAdapter } from './baseAdapter';
import { FileContent, ExtractionCandidate, IRTable, IRField, SupportedFramework, SupportedLanguage } from '@/types/extraction';

export class SpringDataAdapter extends BaseAdapter {
  readonly name: SupportedFramework = 'spring-data';
  readonly language: SupportedLanguage = 'java';
  readonly filePatterns = ['**/*Repository*.java', '**/entities/*.java', '**/domain/*.java'];
  readonly confidence = 75;

  protected matchesFrameworkPatterns(content: string): boolean {
    return /@Repository|JpaRepository|@Entity/i.test(content);
  }

  protected analyzeContentPatterns(content: string): number {
    let score = 0;
    if (content.includes('@Repository')) score += 10;
    if (content.includes('JpaRepository')) score += 10;
    if (content.includes('@Entity')) score += 15;
    return score;
  }

  async extractDefinitions(file: FileContent): Promise<ExtractionCandidate[]> {
    const candidates: ExtractionCandidate[] = [];
    const { content, info } = file;

    // Spring Data primarily uses JPA @Entity classes
    // Extract @Entity annotated classes (same as JPA/Hibernate)
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

      // Extract @Table annotation
      let tableName = className;
      const tableMatch = fullMatch.match(/@Table\s*\(\s*(?:name\s*=\s*)?["']([^"']+)["']/);
      if (tableMatch) {
        tableName = tableMatch[1];
      }

      candidates.push({
        file: info,
        type: 'model',
        confidence: 85,
        startLine,
        endLine,
        content: fullMatch,
        framework: 'spring-data',
        metadata: {
          className,
          tableName,
          classBody
        }
      });
    }

    // Also extract repository interfaces to infer entity relationships
    const repoPattern = /(?:public\s+)?interface\s+(\w+)\s+extends\s+(?:JpaRepository|CrudRepository|PagingAndSortingRepository)<(\w+),\s*(\w+)>/g;
    
    while ((match = repoPattern.exec(content)) !== null) {
      const repoName = match[1];
      const entityName = match[2];
      const idType = match[3];
      const startPos = match.index;
      const startLine = this.getLineNumber(content, startPos);

      candidates.push({
        file: info,
        type: 'repository',
        confidence: 70,
        startLine,
        endLine: startLine + 1,
        content: match[0],
        framework: 'spring-data',
        metadata: {
          repoName,
          entityName,
          idType
        }
      });
    }

    return candidates;
  }

  async parseToIR(candidates: ExtractionCandidate[]): Promise<IRTable[]> {
    const tables: IRTable[] = [];

    // Only parse entity candidates, skip repository metadata
    for (const candidate of candidates) {
      if (candidate.type === 'model') {
        const table = this.parseEntityToTable(candidate);
        if (table) {
          tables.push(table);
        }
      }
    }

    return tables;
  }

  private parseEntityToTable(candidate: ExtractionCandidate): IRTable | null {
    const { className, tableName, classBody } = candidate.metadata;
    if (!className || !classBody) return null;

    const fields: IRField[] = [];

    // Parse field declarations with Spring Data/JPA annotations
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
        framework: 'spring-data',
        language: 'java',
        confidence: candidate.confidence,
        tags: ['spring-data', 'jpa', 'spring-boot']
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

    // @Id indicates primary key
    if (/@Id\b/.test(annotations)) {
      primaryKey = true;
      nullable = false;
    }

    // @GeneratedValue indicates auto-increment
    if (/@GeneratedValue/.test(annotations)) {
      autoIncrement = true;
    }

    // @Column annotation parsing
    const columnMatch = annotations.match(/@Column\s*\(([^)]+)\)/);
    if (columnMatch) {
      const columnParams = columnMatch[1];
      
      const nullableMatch = columnParams.match(/nullable\s*=\s*(true|false)/);
      if (nullableMatch) {
        nullable = nullableMatch[1] === 'true';
      }

      const uniqueMatch = columnParams.match(/unique\s*=\s*(true|false)/);
      if (uniqueMatch) {
        unique = uniqueMatch[1] === 'true';
      }

      const nameMatch = columnParams.match(/name\s*=\s*["']([^"']+)["']/);
      if (nameMatch) {
        name = nameMatch[1];
      }
    }

    // @ManyToOne, @OneToOne (foreign keys)
    if (/@(?:ManyToOne|OneToOne)\b/.test(annotations)) {
      const referencedTable = type.replace(/^(\w+).*$/, '$1');
      foreignKey = {
        table: this.extractTableName(referencedTable),
        field: 'id'
      };
      
      const joinMatch = annotations.match(/@JoinColumn\s*\([^)]*name\s*=\s*["']([^"']+)["']/);
      if (joinMatch) {
        name = joinMatch[1];
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
    const baseType = javaType.replace(/<[^>]+>/, '');
    
    const typeMap: Record<string, any> = {
      'String': 'VARCHAR',
      'Integer': 'INTEGER',
      'int': 'INTEGER',
      'Long': 'BIGINT',
      'long': 'BIGINT',
      'Short': 'SMALLINT',
      'short': 'SMALLINT',
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
      'Instant': 'TIMESTAMP',
      'byte[]': 'BLOB',
      'UUID': 'UUID'
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
