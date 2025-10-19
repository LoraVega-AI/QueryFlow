// JPA Framework Adapter (Standard Java Persistence API)

import { BaseAdapter } from './baseAdapter';
import { FileContent, ExtractionCandidate, IRTable, IRField, SupportedFramework, SupportedLanguage } from '@/types/extraction';

export class JPAAdapter extends BaseAdapter {
  readonly name: SupportedFramework = 'jpa';
  readonly language: SupportedLanguage = 'java';
  readonly filePatterns = ['**/*Entity*.java'];
  readonly confidence = 85;

  protected matchesFrameworkPatterns(content: string): boolean {
    return /@Entity|@Id/i.test(content);
  }

  protected analyzeContentPatterns(content: string): number {
    return content.includes('@Entity') ? 20 : 0;
  }

  async extractDefinitions(file: FileContent): Promise<ExtractionCandidate[]> {
    const candidates: ExtractionCandidate[] = [];
    const { content, info } = file;

    // JPA is very similar to Hibernate - extract @Entity annotated classes
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

      // Extract schema if present
      let schema: string | undefined;
      const schemaMatch = fullMatch.match(/@Table\s*\([^)]*schema\s*=\s*["']([^"']+)["']/);
      if (schemaMatch) {
        schema = schemaMatch[1];
      }

      candidates.push({
        file: info,
        type: 'model',
        confidence: 90,
        startLine,
        endLine,
        content: fullMatch,
        framework: 'jpa',
        metadata: {
          className,
          tableName,
          schema,
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

    // Parse field declarations with JPA annotations
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
      indexes: this.extractIndexes(candidate.content),
      constraints: [],
      triggers: [],
      metadata: {
        framework: 'jpa',
        language: 'java',
        confidence: candidate.confidence,
        tags: ['jpa', 'entity', 'persistence'],
        schema: candidate.metadata.schema
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
      
      // Check strategy
      const strategyMatch = annotations.match(/@GeneratedValue\s*\([^)]*strategy\s*=\s*GenerationType\.(\w+)/);
      if (strategyMatch && strategyMatch[1] !== 'AUTO' && strategyMatch[1] !== 'IDENTITY') {
        autoIncrement = false; // SEQUENCE or TABLE strategies
      }
    }

    // @Column annotation parsing
    const columnMatch = annotations.match(/@Column\s*\(([^)]+)\)/);
    if (columnMatch) {
      const columnParams = columnMatch[1];
      
      // Parse nullable
      const nullableMatch = columnParams.match(/nullable\s*=\s*(true|false)/);
      if (nullableMatch) {
        nullable = nullableMatch[1] === 'true';
      }

      // Parse unique
      const uniqueMatch = columnParams.match(/unique\s*=\s*(true|false)/);
      if (uniqueMatch) {
        unique = uniqueMatch[1] === 'true';
      }

      // Parse column name override
      const nameMatch = columnParams.match(/name\s*=\s*["']([^"']+)["']/);
      if (nameMatch) {
        name = nameMatch[1];
      }

      // Parse columnDefinition for default
      const defMatch = columnParams.match(/columnDefinition\s*=\s*["']([^"']+)["']/);
      if (defMatch && defMatch[1].toLowerCase().includes('default')) {
        const defaultValMatch = defMatch[1].match(/default\s+([^\s,]+)/i);
        if (defaultValMatch) {
          defaultValue = defaultValMatch[1].replace(/['"`]/g, '');
        }
      }
    }

    // @JoinColumn indicates foreign key
    const joinMatch = annotations.match(/@JoinColumn\s*\(([^)]+)\)/);
    if (joinMatch) {
      const joinParams = joinMatch[1];
      const nameMatch = joinParams.match(/name\s*=\s*["']([^"']+)["']/);
      const refMatch = joinParams.match(/referencedColumnName\s*=\s*["']([^"']+)["']/);
      
      if (nameMatch) {
        name = nameMatch[1];
      }

      // Infer table from field type
      const referencedTable = type.replace(/^(\w+).*$/, '$1');
      foreignKey = {
        table: this.extractTableName(referencedTable),
        field: refMatch ? refMatch[1] : 'id'
      };
    }

    // @ManyToOne, @OneToOne, @OneToMany relationships
    if (/@(?:ManyToOne|OneToOne)\b/.test(annotations) && !foreignKey) {
      const referencedTable = type.replace(/^(\w+).*$/, '$1');
      foreignKey = {
        table: this.extractTableName(referencedTable),
        field: 'id'
      };
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

  private extractIndexes(content: string): any[] {
    const indexes: any[] = [];

    // Parse @Table(indexes = {...})
    const indexPattern = /@Table\s*\([^)]*indexes\s*=\s*\{([^}]+)\}/;
    const match = content.match(indexPattern);
    
    if (match) {
      const indexesStr = match[1];
      const indexMatches = indexesStr.matchAll(/@Index\s*\(([^)]+)\)/g);
      
      for (const indexMatch of indexMatches) {
        const indexParams = indexMatch[1];
        const nameMatch = indexParams.match(/name\s*=\s*["']([^"']+)["']/);
        const columnListMatch = indexParams.match(/columnList\s*=\s*["']([^"']+)["']/);
        const uniqueMatch = indexParams.match(/unique\s*=\s*(true|false)/);
        
        if (columnListMatch) {
          indexes.push({
            name: nameMatch ? nameMatch[1] : undefined,
            fields: columnListMatch[1].split(',').map(f => f.trim()),
            unique: uniqueMatch ? uniqueMatch[1] === 'true' : false
          });
        }
      }
    }

    return indexes;
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
      'Byte': 'TINYINT',
      'byte': 'TINYINT',
      'Boolean': 'BOOLEAN',
      'boolean': 'BOOLEAN',
      'Double': 'DOUBLE',
      'double': 'DOUBLE',
      'Float': 'FLOAT',
      'float': 'FLOAT',
      'BigDecimal': 'DECIMAL',
      'BigInteger': 'BIGINT',
      'Date': 'TIMESTAMP',
      'LocalDate': 'DATE',
      'LocalDateTime': 'TIMESTAMP',
      'LocalTime': 'TIME',
      'Instant': 'TIMESTAMP',
      'ZonedDateTime': 'TIMESTAMP',
      'Timestamp': 'TIMESTAMP',
      'Time': 'TIME',
      'byte[]': 'BLOB',
      'Byte[]': 'BLOB',
      'char': 'CHAR',
      'Character': 'CHAR',
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
