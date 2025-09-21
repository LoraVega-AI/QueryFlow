// Sequelize Framework Adapter
// Extracts database definitions from Sequelize ORM models and migrations

import {
  FileContent,
  ExtractionCandidate,
  IRTable,
  IRField,
  DataType,
  SupportedFramework,
  SupportedLanguage
} from '@/types/extraction';

import { BaseAdapter } from './baseAdapter';

export class SequelizeAdapter extends BaseAdapter {
  readonly name: SupportedFramework = 'sequelize';
  readonly language: SupportedLanguage = 'javascript';
  readonly filePatterns = [
    'models/**/*.js',
    'models/**/*.ts',
    'migrations/**/*.js',
    'migrations/**/*.ts',
    'seeders/**/*.js',
    'seeders/**/*.ts'
  ];
  readonly confidence = 85;

  /**
   * Check if content matches Sequelize patterns
   */
  protected matchesFrameworkPatterns(content: string): boolean {
    const patterns = [
      /sequelize\.define\s*\(/i,
      /DataTypes\.\w+/i,
      /new\s+Sequelize\s*\(/i,
      /queryInterface\./i,
      /Sequelize\.Model/i,
      /sequelize\.import/i
    ];

    return patterns.some(pattern => pattern.test(content));
  }

  /**
   * Analyze content for Sequelize-specific patterns
   */
  protected analyzeContentPatterns(content: string): number {
    let confidence = 0;

    // Strong indicators
    if (content.includes('sequelize.define(')) confidence += 20;
    if (content.includes('DataTypes.')) confidence += 15;
    if (content.includes('queryInterface.')) confidence += 15;
    if (content.includes('Sequelize.Model')) confidence += 10;

    // Weak indicators
    if (content.includes('associations')) confidence += 5;
    if (content.includes('belongsTo') || content.includes('hasMany')) confidence += 5;
    if (content.includes('migration')) confidence += 5;

    return confidence;
  }

  /**
   * Analyze file location for Sequelize conventions
   */
  protected analyzeFileLocation(filePath: string): number {
    let confidence = 0;

    if (filePath.includes('/models/') || filePath.includes('\\models\\')) confidence += 10;
    if (filePath.includes('/migrations/') || filePath.includes('\\migrations\\')) confidence += 10;
    if (filePath.includes('/seeders/') || filePath.includes('\\seeders\\')) confidence += 5;

    return confidence;
  }

  /**
   * Extract Sequelize model and migration definitions
   */
  async extractDefinitions(file: FileContent): Promise<ExtractionCandidate[]> {
    const candidates: ExtractionCandidate[] = [];
    const { content, lines } = file;

    // Extract model definitions
    const modelCandidates = this.extractModelDefinitions(file);
    candidates.push(...modelCandidates);

    // Extract migration definitions
    const migrationCandidates = this.extractMigrationDefinitions(file);
    candidates.push(...migrationCandidates);

    return candidates;
  }

  /**
   * Parse extraction candidates to IR tables
   */
  async parseToIR(candidates: ExtractionCandidate[]): Promise<IRTable[]> {
    const tables: IRTable[] = [];

    for (const candidate of candidates) {
      try {
        const table = await this.parseCandidate(candidate);
        if (table) {
          tables.push(table);
        }
      } catch (error) {
        console.warn(`Failed to parse Sequelize candidate:`, error instanceof Error ? error.message : 'Unknown error');
      }
    }

    return tables;
  }

  /**
   * Get Sequelize data type mapping
   */
  protected getDataTypeMap(): Record<string, DataType> {
    return {
      'string': 'VARCHAR',
      'text': 'TEXT',
      'boolean': 'BOOLEAN',
      'integer': 'INTEGER',
      'bigint': 'BIGINT',
      'float': 'FLOAT',
      'real': 'REAL',
      'double': 'DOUBLE',
      'decimal': 'DECIMAL',
      'numeric': 'NUMERIC',
      'date': 'DATE',
      'dateonly': 'DATE',
      'time': 'TIME',
      'now': 'DATETIME',
      'blob': 'BLOB',
      'enum': 'ENUM',
      'array': 'ARRAY',
      'json': 'JSON',
      'jsonb': 'JSONB',
      'uuid': 'UUID',
      'uuidv1': 'UUID',
      'uuidv4': 'UUID'
    };
  }

  // Private methods

  /**
   * Extract model definitions from Sequelize code
   */
  private extractModelDefinitions(file: FileContent): ExtractionCandidate[] {
    const candidates: ExtractionCandidate[] = [];
    const { content, lines } = file;

    // Pattern for sequelize.define() calls
    const definePattern = /sequelize\.define\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*\{([\s\S]*?)\}/g;
    let match;

    while ((match = definePattern.exec(content)) !== null) {
      const tableName = match[1];
      const definition = match[2];
      const startPos = match.index;
      const endPos = startPos + match[0].length;

      const startLine = this.getLineNumber(content, startPos);
      const endLine = this.getLineNumber(content, endPos);

      candidates.push({
        file: file.info,
        type: 'model',
        confidence: 90,
        startLine,
        endLine,
        content: match[0],
        framework: 'sequelize',
        metadata: {
          tableName,
          definition,
          modelType: 'define'
        }
      });
    }

    // Pattern for class-based models extending Sequelize.Model
    const classPattern = /class\s+(\w+)\s+extends\s+(?:Sequelize\.)?Model\s*\{([\s\S]*?)\}/g;
    
    while ((match = classPattern.exec(content)) !== null) {
      const modelName = match[1];
      const classBody = match[2];
      const startPos = match.index;
      const endPos = startPos + match[0].length;

      const startLine = this.getLineNumber(content, startPos);
      const endLine = this.getLineNumber(content, endPos);

      candidates.push({
        file: file.info,
        type: 'model',
        confidence: 85,
        startLine,
        endLine,
        content: match[0],
        framework: 'sequelize',
        metadata: {
          modelName,
          classBody,
          modelType: 'class'
        }
      });
    }

    return candidates;
  }

  /**
   * Extract migration definitions from Sequelize code
   */
  private extractMigrationDefinitions(file: FileContent): ExtractionCandidate[] {
    const candidates: ExtractionCandidate[] = [];
    const { content } = file;

    // Pattern for createTable operations
    const createTablePattern = /queryInterface\.createTable\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*\{([\s\S]*?)\}/g;
    let match;

    while ((match = createTablePattern.exec(content)) !== null) {
      const tableName = match[1];
      const definition = match[2];
      const startPos = match.index;
      const endPos = startPos + match[0].length;

      const startLine = this.getLineNumber(content, startPos);
      const endLine = this.getLineNumber(content, endPos);

      candidates.push({
        file: file.info,
        type: 'migration',
        confidence: 95,
        startLine,
        endLine,
        content: match[0],
        framework: 'sequelize',
        metadata: {
          tableName,
          definition,
          operation: 'createTable'
        }
      });
    }

    // Pattern for addColumn operations
    const addColumnPattern = /queryInterface\.addColumn\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*['"`]([^'"`]+)['"`]\s*,\s*\{([^}]*)\}/g;

    while ((match = addColumnPattern.exec(content)) !== null) {
      const tableName = match[1];
      const columnName = match[2];
      const definition = match[3];
      const startPos = match.index;
      const endPos = startPos + match[0].length;

      const startLine = this.getLineNumber(content, startPos);
      const endLine = this.getLineNumber(content, endPos);

      candidates.push({
        file: file.info,
        type: 'migration',
        confidence: 80,
        startLine,
        endLine,
        content: match[0],
        framework: 'sequelize',
        metadata: {
          tableName,
          columnName,
          definition,
          operation: 'addColumn'
        }
      });
    }

    return candidates;
  }

  /**
   * Parse a single candidate into an IR table
   */
  private async parseCandidate(candidate: ExtractionCandidate): Promise<IRTable | null> {
    const { metadata } = candidate;

    if (candidate.type === 'model') {
      return this.parseModelCandidate(candidate);
    } else if (candidate.type === 'migration') {
      return this.parseMigrationCandidate(candidate);
    }

    return null;
  }

  /**
   * Parse a model candidate
   */
  private parseModelCandidate(candidate: ExtractionCandidate): IRTable | null {
    const { metadata } = candidate;
    const tableName = metadata.tableName || metadata.modelName;
    
    if (!tableName) {
      return null;
    }

    const fields: IRField[] = [];

    if (metadata.definition) {
      // Parse field definitions from sequelize.define()
      const fieldMatches = metadata.definition.matchAll(/(\w+)\s*:\s*\{([^}]*)\}/g);
      
      for (const match of fieldMatches) {
        const fieldName = match[1];
        const fieldDef = match[2];
        
        const field = this.parseFieldDefinition(fieldName, fieldDef, candidate);
        if (field) {
          fields.push(field);
        }
      }
    } else if (metadata.classBody) {
      // Parse field definitions from class-based models
      // Look for init() method or static associate() method
      const initMatch = metadata.classBody.match(/init\s*\(\s*\{([^}]*)\}/);
      if (initMatch) {
        const fieldDefs = initMatch[1];
        const fieldMatches = fieldDefs.matchAll(/(\w+)\s*:\s*\{([^}]*)\}/g);
        
        for (const match of fieldMatches) {
          const fieldName = match[1];
          const fieldDef = match[2];
          
          const field = this.parseFieldDefinition(fieldName, fieldDef, candidate);
          if (field) {
            fields.push(field);
          }
        }
      }
    }

    return {
      name: this.extractTableName(tableName),
      fields,
      indexes: [],
      constraints: [],
      triggers: [],
      metadata: {
        framework: 'sequelize',
        language: 'javascript',
        confidence: candidate.confidence,
        tags: ['sequelize', 'model']
      },
      sourceLocation: this.createSourceLocation(
        candidate.file,
        candidate.startLine,
        candidate.endLine
      )
    };
  }

  /**
   * Parse a migration candidate
   */
  private parseMigrationCandidate(candidate: ExtractionCandidate): IRTable | null {
    const { metadata } = candidate;
    
    if (!metadata.tableName) {
      return null;
    }

    const fields: IRField[] = [];

    if (metadata.operation === 'createTable' && metadata.definition) {
      // Parse field definitions from createTable migration
      const fieldMatches = metadata.definition.matchAll(/(\w+)\s*:\s*\{([^}]*)\}/g);
      
      for (const match of fieldMatches) {
        const fieldName = match[1];
        const fieldDef = match[2];
        
        const field = this.parseFieldDefinition(fieldName, fieldDef, candidate);
        if (field) {
          fields.push(field);
        }
      }
    }

    return {
      name: this.extractTableName(metadata.tableName),
      fields,
      indexes: [],
      constraints: [],
      triggers: [],
      metadata: {
        framework: 'sequelize',
        language: 'javascript',
        confidence: candidate.confidence,
        tags: ['sequelize', 'migration']
      },
      sourceLocation: this.createSourceLocation(
        candidate.file,
        candidate.startLine,
        candidate.endLine
      )
    };
  }

  /**
   * Parse a field definition
   */
  private parseFieldDefinition(fieldName: string, fieldDef: string, candidate: ExtractionCandidate): IRField | null {
    // Extract type
    const typeMatch = fieldDef.match(/type\s*:\s*DataTypes\.(\w+)/i) || 
                     fieldDef.match(/DataTypes\.(\w+)/i);
    
    if (!typeMatch) {
      return null;
    }

    const sequelizeType = typeMatch[1].toLowerCase();
    const dataType = this.mapDataType(sequelizeType);

    // Parse constraints
    const constraints = this.parseConstraints(fieldDef);

    // Check for foreign key references
    const foreignKey = this.parseForeignKey(fieldDef);

    const field: IRField = {
      name: fieldName,
      type: dataType,
      nullable: constraints.nullable,
      primaryKey: constraints.primaryKey,
      unique: constraints.unique,
      autoIncrement: constraints.autoIncrement,
      defaultValue: constraints.defaultValue,
      constraints: {
        maxLength: constraints.maxLength
      },
      foreignKey,
      indexes: [],
      sourceLocation: this.createSourceLocation(
        candidate.file,
        candidate.startLine,
        candidate.endLine
      )
    };

    return field;
  }

  /**
   * Get line number from character position
   */
  private getLineNumber(content: string, position: number): number {
    const beforePos = content.substring(0, position);
    return beforePos.split('\n').length - 1;
  }
}
