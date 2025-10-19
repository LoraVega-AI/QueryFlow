// Django Framework Adapter

import { BaseAdapter } from './baseAdapter';
import { FileContent, ExtractionCandidate, IRTable, IRField, SupportedFramework, SupportedLanguage } from '@/types/extraction';

export class DjangoAdapter extends BaseAdapter {
  readonly name: SupportedFramework = 'django';
  readonly language: SupportedLanguage = 'python';
  readonly filePatterns = ['models.py', '**/models.py', 'models/**/*.py'];
  readonly confidence = 90;

  protected matchesFrameworkPatterns(content: string): boolean {
    return /models\.Model|models\.\w+Field/i.test(content);
  }

  protected analyzeContentPatterns(content: string): number {
    let confidence = 0;
    if (content.includes('models.Model')) confidence += 25;
    if (content.includes('models.CharField')) confidence += 15;
    return confidence;
  }

  async extractDefinitions(file: FileContent): Promise<ExtractionCandidate[]> {
    const candidates: ExtractionCandidate[] = [];
    const { content, info } = file;

    // Extract Django model classes
    const modelPattern = /class\s+(\w+)\s*\(\s*models\.Model\s*\)\s*:([\s\S]*?)(?=\nclass\s|\n\S|\Z)/gm;
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
        confidence: 95,
        startLine,
        endLine,
        content: match[0],
        framework: 'django',
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

    const fields: IRField[] = [];
    const indexes: any[] = [];
    const constraints: any[] = [];
    let tableName = modelName;

    // Extract Meta class for table name
    const metaMatch = classBody.match(/class\s+Meta\s*:([\s\S]*?)(?=\n    \S|\Z)/);
    if (metaMatch) {
      const metaBody = metaMatch[1];
      const dbTableMatch = metaBody.match(/db_table\s*=\s*['"`]([^'"`]+)['"`]/);
      if (dbTableMatch) {
        tableName = dbTableMatch[1];
      }
    }

    // Parse field definitions
    const lines = classBody.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines, comments, Meta class, and method definitions
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('class ') || trimmed.startsWith('def ')) {
        continue;
      }

      // Parse Django field
      const fieldMatch = trimmed.match(/^(\w+)\s*=\s*models\.(\w+Field)\s*\(([^)]*)\)/);
      if (fieldMatch) {
        const fieldName = fieldMatch[1];
        const fieldType = fieldMatch[2];
        const fieldOptions = fieldMatch[3];

        const field = this.parseDjangoField(fieldName, fieldType, fieldOptions, candidate);
        if (field) {
          fields.push(field);
        }
      }
    }

    // Track inferred fields
    const inferredFields: string[] = [];

    // Add Django's automatic id field if not present and conditions are met
    const hasIdField = fields.some(f => f.name === 'id' || f.primaryKey);
    if (!hasIdField && this.shouldInferPrimaryKey(candidate)) {
      fields.unshift({
        name: 'id',
        type: 'INTEGER',
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

    return {
      name: this.extractTableName(tableName),
      fields,
      indexes,
      constraints,
      triggers: [],
      metadata: {
        framework: 'django',
        language: 'python',
        confidence: candidate.confidence,
        tags: ['django', 'model'],
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

  private parseDjangoField(fieldName: string, fieldType: string, options: string, candidate: ExtractionCandidate): IRField | null {
    const dataType = this.mapDjangoFieldType(fieldType);
    let nullable = true;
    let primaryKey = false;
    let unique = false;
    let autoIncrement = false;
    let defaultValue: any = undefined;
    let foreignKey: IRField['foreignKey'] = undefined;
    let maxLength: number | undefined = undefined;

    // Parse options
    if (/null\s*=\s*False/i.test(options)) {
      nullable = false;
    }
    if (/blank\s*=\s*False/i.test(options)) {
      nullable = false;
    }
    if (/primary_key\s*=\s*True/i.test(options)) {
      primaryKey = true;
      nullable = false;
    }
    if (/unique\s*=\s*True/i.test(options)) {
      unique = true;
    }

    // Extract max_length
    const maxLengthMatch = options.match(/max_length\s*=\s*(\d+)/);
    if (maxLengthMatch) {
      maxLength = parseInt(maxLengthMatch[1]);
    }

    // Extract default value
    const defaultMatch = options.match(/default\s*=\s*(['"`]([^'"`]+)['"`]|(\d+)|True|False)/);
    if (defaultMatch) {
      if (defaultMatch[2]) {
        defaultValue = defaultMatch[2];
      } else if (defaultMatch[3]) {
        defaultValue = Number(defaultMatch[3]);
      } else if (defaultMatch[1] === 'True' || defaultMatch[1] === 'False') {
        defaultValue = defaultMatch[1] === 'True';
      }
    }

    // Handle ForeignKey
    if (fieldType === 'ForeignKey') {
      const relatedModelMatch = options.match(/^['"`]?(\w+)['"`]?/);
      if (relatedModelMatch) {
        const relatedModel = relatedModelMatch[1];
        foreignKey = {
          table: this.extractTableName(relatedModel),
          field: 'id',
          onDelete: this.extractOnDelete(options),
          onUpdate: undefined
        };
      }
    }

    // Handle OneToOneField
    if (fieldType === 'OneToOneField') {
      const relatedModelMatch = options.match(/^['"`]?(\w+)['"`]?/);
      if (relatedModelMatch) {
        foreignKey = {
          table: this.extractTableName(relatedModelMatch[1]),
          field: 'id',
          onDelete: this.extractOnDelete(options)
        };
        unique = true;
      }
    }

    // AutoField types
    if (fieldType === 'AutoField' || fieldType === 'BigAutoField') {
      autoIncrement = true;
      primaryKey = true;
      nullable = false;
    }

    return {
      name: fieldName,
      type: dataType,
      nullable,
      primaryKey,
      unique,
      autoIncrement,
      defaultValue,
      constraints: maxLength ? { maxLength } : {},
      foreignKey,
      indexes: [],
      sourceLocation: this.createSourceLocation(
        candidate.file,
        candidate.startLine,
        candidate.endLine
      )
    };
  }

  private mapDjangoFieldType(fieldType: string): any {
    const typeMap: Record<string, any> = {
      'CharField': 'VARCHAR',
      'TextField': 'TEXT',
      'IntegerField': 'INTEGER',
      'BigIntegerField': 'BIGINT',
      'SmallIntegerField': 'INTEGER',
      'PositiveIntegerField': 'INTEGER',
      'PositiveSmallIntegerField': 'INTEGER',
      'FloatField': 'FLOAT',
      'DecimalField': 'DECIMAL',
      'BooleanField': 'BOOLEAN',
      'DateField': 'DATE',
      'DateTimeField': 'DATETIME',
      'TimeField': 'TIME',
      'EmailField': 'VARCHAR',
      'URLField': 'VARCHAR',
      'SlugField': 'VARCHAR',
      'UUIDField': 'UUID',
      'JSONField': 'JSON',
      'BinaryField': 'BLOB',
      'FileField': 'VARCHAR',
      'ImageField': 'VARCHAR',
      'ForeignKey': 'INTEGER',
      'OneToOneField': 'INTEGER',
      'ManyToManyField': 'INTEGER',
      'AutoField': 'INTEGER',
      'BigAutoField': 'BIGINT'
    };

    return typeMap[fieldType] || 'VARCHAR';
  }

  private extractOnDelete(options: string): 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' | undefined {
    if (/on_delete\s*=\s*models\.CASCADE/i.test(options)) {
      return 'CASCADE';
    }
    if (/on_delete\s*=\s*models\.SET_NULL/i.test(options)) {
      return 'SET NULL';
    }
    if (/on_delete\s*=\s*models\.PROTECT/i.test(options)) {
      return 'RESTRICT';
    }
    if (/on_delete\s*=\s*models\.DO_NOTHING/i.test(options)) {
      return 'NO ACTION';
    }
    return undefined;
  }

  private getLineNumber(content: string, position: number): number {
    return content.substring(0, position).split('\n').length - 1;
  }

  protected getDataTypeMap(): Record<string, any> {
    return {
      'charfield': 'VARCHAR',
      'textfield': 'TEXT',
      'integerfield': 'INTEGER',
      'booleanfield': 'BOOLEAN',
      'datetimefield': 'DATETIME',
      'emailfield': 'VARCHAR'
    };
  }
}
