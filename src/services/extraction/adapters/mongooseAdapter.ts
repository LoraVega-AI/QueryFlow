// Mongoose Framework Adapter
// Extracts database definitions from Mongoose schemas

import { BaseAdapter } from './baseAdapter';
import {
  FileContent,
  ExtractionCandidate,
  IRTable,
  IRField,
  SupportedFramework,
  SupportedLanguage
} from '@/types/extraction';

export class MongooseAdapter extends BaseAdapter {
  readonly name: SupportedFramework = 'mongoose';
  readonly language: SupportedLanguage = 'javascript';
  readonly filePatterns = ['models/**/*.js', 'schemas/**/*.js', '**/*model*.js'];
  readonly confidence = 85;

  protected matchesFrameworkPatterns(content: string): boolean {
    return /mongoose\.Schema|new\s+Schema/i.test(content);
  }

  protected analyzeContentPatterns(content: string): number {
    let confidence = 0;
    if (content.includes('mongoose.Schema')) confidence += 20;
    if (content.includes('mongoose.model')) confidence += 15;
    return confidence;
  }

  async extractDefinitions(file: FileContent): Promise<ExtractionCandidate[]> {
    const candidates: ExtractionCandidate[] = [];
    const { content, info } = file;

    // Pattern for: new mongoose.Schema({...})
    const schemaPattern = /(?:const|var|let)\s+(\w+)\s*=\s*new\s+(?:mongoose\.)?Schema\s*\(\s*\{([^}]+(?:\}[^}]*\{[^}]*)*[^}]*)\}/gs;
    let match;

    while ((match = schemaPattern.exec(content)) !== null) {
      const schemaName = match[1];
      const schemaBody = match[2];
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
        framework: 'mongoose',
        metadata: {
          schemaName,
          schemaBody
        }
      });
    }

    // Pattern for: mongoose.model('ModelName', schema)
    const modelPattern = /mongoose\.model\s*\(\s*['"`](\w+)['"`]/g;
    while ((match = modelPattern.exec(content)) !== null) {
      const modelName = match[1];
      const startPos = match.index;
      const endPos = startPos + match[0].length;
      const startLine = this.getLineNumber(content, startPos);
      const endLine = this.getLineNumber(content, endPos);

      // Find the corresponding schema
      const schemaRefMatch = content.substring(0, startPos).match(/(\w+Schema)\s*\)/);
      
      candidates.push({
        file: info,
        type: 'model',
        confidence: 95,
        startLine,
        endLine,
        content: match[0],
        framework: 'mongoose',
        metadata: {
          modelName,
          schemaRef: schemaRefMatch ? schemaRefMatch[1] : null
        }
      });
    }

    return candidates;
  }

  async parseToIR(candidates: ExtractionCandidate[]): Promise<IRTable[]> {
    const tables: IRTable[] = [];
    const schemas = new Map<string, ExtractionCandidate>();

    // First pass: collect schemas
    for (const candidate of candidates) {
      if (candidate.type === 'schema') {
        const schemaName = candidate.metadata.schemaName;
        schemas.set(schemaName, candidate);
      }
    }

    // Second pass: parse models and link to schemas
    for (const candidate of candidates) {
      if (candidate.type === 'model') {
        const modelName = candidate.metadata.modelName;
        const schemaRef = candidate.metadata.schemaRef;
        
        // Try to find the schema
        let schemaCandidate = schemaRef ? schemas.get(schemaRef) : null;
        if (!schemaCandidate) {
          // Try to find by convention (ModelNameSchema)
          schemaCandidate = schemas.get(`${modelName}Schema`);
        }

        const table = this.parseModelToTable(candidate, schemaCandidate);
        if (table) {
          tables.push(table);
        }
      } else if (candidate.type === 'schema') {
        // If schema has no corresponding model, create table from schema name
        const schemaName = candidate.metadata.schemaName;
        const modelName = schemaName.replace(/Schema$/, '');
        const table = this.parseSchemaToTable(candidate, modelName);
        if (table) {
          tables.push(table);
        }
      }
    }

    return tables;
  }

  private parseModelToTable(modelCandidate: ExtractionCandidate, schemaCandidate: ExtractionCandidate | null): IRTable | null {
    const { modelName } = modelCandidate.metadata;
    if (!modelName) return null;

    if (!schemaCandidate) {
      return null;
    }

    return this.parseSchemaToTable(schemaCandidate, modelName);
  }

  private parseSchemaToTable(schemaCandidate: ExtractionCandidate, modelName: string): IRTable | null {
    const { schemaBody } = schemaCandidate.metadata;
    if (!schemaBody) return null;

    const fields: IRField[] = [];

    // Parse field definitions
    const fieldPattern = /(\w+)\s*:\s*\{([^}]+)\}|(\w+)\s*:\s*(String|Number|Date|Boolean|ObjectId|Array|Mixed|Buffer)/g;
    let match;

    while ((match = fieldPattern.exec(schemaBody)) !== null) {
      const fieldName = match[1] || match[3];
      const fieldDef = match[2] || match[4];

      const field = this.parseField(fieldName, fieldDef, schemaCandidate);
      if (field) {
        fields.push(field);
      }
    }

    // Track inferred fields
    const inferredFields: string[] = [];

    // Add default _id field for MongoDB if not present and conditions are met
    const hasIdField = fields.some(f => f.name === '_id');
    if (!hasIdField && this.shouldInferPrimaryKey(schemaCandidate)) {
      fields.unshift({
        name: '_id',
        type: 'VARCHAR',
        nullable: false,
        primaryKey: true,
        unique: true,
        autoIncrement: false,
        constraints: {},
        indexes: [],
        sourceLocation: this.createSourceLocation(
          schemaCandidate.file,
          schemaCandidate.startLine,
          schemaCandidate.endLine
        )
      });
      inferredFields.push('_id');
    }

    return {
      name: this.extractTableName(modelName),
      fields,
      indexes: [],
      constraints: [],
      triggers: [],
      metadata: {
        framework: 'mongoose',
        language: 'javascript',
        confidence: schemaCandidate.confidence,
        tags: ['mongoose', 'schema', 'mongodb'],
        inferred: inferredFields.length > 0,
        inferredFields: inferredFields
      },
      sourceLocation: this.createSourceLocation(
        schemaCandidate.file,
        schemaCandidate.startLine,
        schemaCandidate.endLine
      )
    };
  }

  private parseField(fieldName: string, fieldDef: string, candidate: ExtractionCandidate): IRField | null {
    let dataType = 'VARCHAR';
    let isRequired = false;
    let isUnique = false;
    let defaultValue: any = undefined;
    let foreignKey: IRField['foreignKey'] = undefined;

    // Simple type
    if (/^(String|Number|Date|Boolean|ObjectId|Array|Mixed|Buffer)$/i.test(fieldDef.trim())) {
      dataType = this.mapMongooseType(fieldDef.trim());
    } else {
      // Complex definition
      const typeMatch = fieldDef.match(/type\s*:\s*(String|Number|Date|Boolean|ObjectId|Array|Mixed|Buffer|\[.*?\])/i);
      if (typeMatch) {
        dataType = this.mapMongooseType(typeMatch[1]);
      }

      isRequired = /required\s*:\s*true/i.test(fieldDef);
      isUnique = /unique\s*:\s*true/i.test(fieldDef);

      const defaultMatch = fieldDef.match(/default\s*:\s*(['"`]([^'"`]+)['"`]|(\d+)|true|false|Date\.now)/i);
      if (defaultMatch) {
        if (defaultMatch[2]) {
          defaultValue = defaultMatch[2];
        } else if (defaultMatch[3]) {
          defaultValue = Number(defaultMatch[3]);
        } else if (defaultMatch[1] === 'true' || defaultMatch[1] === 'false') {
          defaultValue = defaultMatch[1] === 'true';
        }
      }

      // Check for references (foreign keys)
      const refMatch = fieldDef.match(/ref\s*:\s*['"`](\w+)['"`]/i);
      if (refMatch) {
        foreignKey = {
          table: this.extractTableName(refMatch[1]),
          field: '_id'
        };
      }
    }

    return {
      name: fieldName,
      type: dataType,
      nullable: !isRequired,
      primaryKey: fieldName === '_id',
      unique: isUnique || fieldName === '_id',
      autoIncrement: false,
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

  private mapMongooseType(mongooseType: string): any {
    const normalized = mongooseType.toLowerCase().trim();
    
    if (normalized.includes('string')) return 'VARCHAR';
    if (normalized.includes('number')) return 'REAL';
    if (normalized.includes('boolean')) return 'BOOLEAN';
    if (normalized.includes('date')) return 'DATETIME';
    if (normalized.includes('objectid')) return 'VARCHAR';
    if (normalized.includes('array') || normalized.startsWith('[')) return 'JSON';
    if (normalized.includes('mixed')) return 'JSON';
    if (normalized.includes('buffer')) return 'BLOB';
    
    return 'VARCHAR';
  }

  private getLineNumber(content: string, position: number): number {
    return content.substring(0, position).split('\n').length - 1;
  }

  protected getDataTypeMap(): Record<string, any> {
    return {
      'string': 'VARCHAR',
      'number': 'REAL',
      'boolean': 'BOOLEAN',
      'date': 'DATETIME',
      'objectid': 'VARCHAR',
      'array': 'JSON',
      'mixed': 'JSON'
    };
  }
}
