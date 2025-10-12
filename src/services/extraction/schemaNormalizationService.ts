// Schema Normalization Service
// Stage 5: Schema Normalization & Validation with Intermediate Representation (IR)

import Ajv from 'ajv';
import {
  IRTable,
  IRSchema,
  IRRelationship,
  ExtractionOptions,
  ValidationResult,
  ExtractionWarning,
  ExtractionError,
  IRSchemaMetadata,
  SupportedFramework
} from '@/types/extraction';

export class SchemaNormalizationService {
  private ajv: Ajv;
  private schemaValidator: any;
  private warnings: ExtractionWarning[] = [];
  private errors: ExtractionError[] = [];

  constructor() {
    this.ajv = new Ajv({ allErrors: true });
    this.initializeValidator();
  }

  /**
   * Normalize extracted tables into a unified IR schema
   */
  async normalize(tables: IRTable[], options: ExtractionOptions): Promise<IRSchema> {
    const startTime = Date.now();
    console.log(`✅ Normalizing ${tables.length} tables into IR schema...`);

    this.warnings = [];
    this.errors = [];

    try {
      // Step 1: Deduplicate and merge tables
      const deduplicatedTables = await this.deduplicateTables(tables);
      console.log(`🔍 Deduplicated to ${deduplicatedTables.length} unique tables`);

      // Step 2: Resolve relationships
      const relationships = await this.extractRelationships(deduplicatedTables);
      console.log(`🔗 Found ${relationships.length} relationships`);

      // Step 3: Validate schema integrity
      const validationResult = await this.validateSchema(deduplicatedTables, relationships);
      if (!validationResult.isValid) {
        console.warn(`⚠️  Schema validation found ${validationResult.errors.length} errors`);
      }

      // Step 4: Normalize data types and constraints
      const normalizedTables = await this.normalizeDataTypes(deduplicatedTables);

      // Step 5: Generate metadata
      const metadata = this.generateSchemaMetadata(normalizedTables, relationships, options);

      // Step 6: Create final IR schema
      const schema: IRSchema = {
        name: this.generateSchemaName(options),
        tables: normalizedTables,
        views: [], // Would be populated if views were extracted
        functions: [], // Would be populated if functions were extracted
        procedures: [], // Would be populated if procedures were extracted
        sequences: [], // Would be populated if sequences were extracted
        types: [], // Would be populated if custom types were extracted
        relationships,
        metadata,
        sourceFiles: this.extractSourceFiles(tables)
      };

      // Step 7: Final validation
      await this.validateFinalSchema(schema);

      const normalizationTime = Date.now() - startTime;
      console.log(`✅ Schema normalization completed in ${normalizationTime}ms`);
      console.log(`📊 Final schema: ${schema.tables.length} tables, ${schema.relationships.length} relationships`);

      return schema;

    } catch (error) {
      this.addError({
        type: 'system',
        message: `Schema normalization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        fatal: true
      });
      throw error;
    }
  }

  /**
   * Validate schema using JSON Schema
   */
  async validateSchema(tables: IRTable[], relationships: IRRelationship[]): Promise<ValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];

    try {
      // Validate each table structure
      for (const table of tables) {
        const tableValidation = this.validateTable(table);
        if (!tableValidation.isValid) {
          errors.push(...tableValidation.errors);
        }
        warnings.push(...tableValidation.warnings);
      }

      // Validate relationships
      for (const relationship of relationships) {
        const relValidation = this.validateRelationship(relationship, tables);
        if (!relValidation.isValid) {
          errors.push(...relValidation.errors);
        }
        warnings.push(...relValidation.warnings);
      }

      // Cross-table validation
      const crossValidation = this.validateCrossTableConstraints(tables, relationships);
      errors.push(...crossValidation.errors);
      warnings.push(...crossValidation.warnings);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        score: this.calculateValidationScore(errors, warnings)
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [{ type: 'schema', message: error instanceof Error ? error.message : 'Unknown error', severity: 'error' }],
        warnings: [],
        score: 0
      };
    }
  }

  /**
   * Get validation warnings and errors
   */
  getDiagnostics(): {
    warnings: ExtractionWarning[];
    errors: ExtractionError[];
  } {
    return {
      warnings: [...this.warnings],
      errors: [...this.errors]
    };
  }

  // Private methods

  /**
   * Deduplicate tables based on name and structure similarity
   */
  private async deduplicateTables(tables: IRTable[]): Promise<IRTable[]> {
    const uniqueTables = new Map<string, IRTable>();
    const duplicateGroups = new Map<string, IRTable[]>();

    // Helper function to check if a file path is from a main model directory
    const isMainModelFile = (filePath: string | undefined): boolean => {
      if (!filePath) return false;
      const normalized = filePath.replace(/\\/g, '/').toLowerCase();
      // Prefer files in model directories over test files or root files
      return normalized.includes('/models/') || 
             normalized.includes('/entities/') || 
             normalized.includes('/schemas/');
    };

    // Helper function to check if file is a test file
    const isTestFile = (filePath: string | undefined): boolean => {
      if (!filePath) return false;
      const normalized = filePath.replace(/\\/g, '/').toLowerCase();
      return normalized.includes('/test/') || 
             normalized.includes('/tests/') ||
             normalized.includes('__tests__') ||
             normalized.includes('.test.') ||
             normalized.includes('.spec.');
    };

    // Group tables by name
    for (const table of tables) {
      const normalizedName = table.name.toLowerCase();
      
      if (uniqueTables.has(normalizedName)) {
        // Found duplicate - add to group for merging
        if (!duplicateGroups.has(normalizedName)) {
          duplicateGroups.set(normalizedName, [uniqueTables.get(normalizedName)!]);
        }
        duplicateGroups.get(normalizedName)!.push(table);
      } else {
        uniqueTables.set(normalizedName, table);
      }
    }

    // Merge duplicate tables, preferring main model files
    for (const [tableName, duplicates] of duplicateGroups) {
      console.log(`🔄 Deduplicating table "${tableName}": found ${duplicates.length} definitions`);
      
      // Sort duplicates: prefer main model files > non-test files > test files
      const sortedDuplicates = duplicates.sort((a, b) => {
        const aIsMain = isMainModelFile((a as any).filePath);
        const bIsMain = isMainModelFile((b as any).filePath);
        const aIsTest = isTestFile((a as any).filePath);
        const bIsTest = isTestFile((b as any).filePath);
        
        if (aIsMain && !bIsMain) return -1;
        if (!aIsMain && bIsMain) return 1;
        if (!aIsTest && bIsTest) return -1;
        if (aIsTest && !bIsTest) return 1;
        
        // Prefer tables with more fields
        return (b.fields?.length || 0) - (a.fields?.length || 0);
      });
      
      const preferredTable = sortedDuplicates[0];
      console.log(`   ✅ Kept definition from: ${(preferredTable as any).filePath || 'unknown'}`);
      sortedDuplicates.slice(1).forEach(dup => {
        console.log(`   ❌ Removed duplicate from: ${(dup as any).filePath || 'unknown'}`);
      });
      
      const mergedTable = await this.mergeTables(sortedDuplicates);
      uniqueTables.set(tableName, mergedTable);
      
      this.addWarning({
        type: 'compatibility',
        message: `Merged ${duplicates.length} duplicate definitions for table '${tableName}' (kept: ${(preferredTable as any).filePath || 'unknown'})`,
        suggestion: 'Review source files for conflicting table definitions'
      });
    }

    return Array.from(uniqueTables.values());
  }

  /**
   * Merge multiple table definitions into one
   */
  private async mergeTables(tables: IRTable[]): Promise<IRTable> {
    if (tables.length === 1) {
      return tables[0];
    }

    // Start with the highest confidence table as base
    const sortedTables = tables.sort((a, b) => b.metadata.confidence - a.metadata.confidence);
    const baseTable = { ...sortedTables[0] };

    // Merge fields from other tables
    const allFields = new Map<string, any>();
    
    // Add base table fields
    for (const field of baseTable.fields) {
      allFields.set(field.name.toLowerCase(), field);
    }

    // Merge fields from other tables
    for (let i = 1; i < sortedTables.length; i++) {
      const table = sortedTables[i];
      
      for (const field of table.fields) {
        const fieldKey = field.name.toLowerCase();
        
        if (allFields.has(fieldKey)) {
          // Merge field properties (prefer non-null values)
          const existingField = allFields.get(fieldKey);
          const mergedField = this.mergeFields(existingField, field);
          allFields.set(fieldKey, mergedField);
        } else {
          // Add new field
          allFields.set(fieldKey, field);
        }
      }
    }

    baseTable.fields = Array.from(allFields.values());

    // Merge other properties
    baseTable.metadata.confidence = Math.round(
      sortedTables.reduce((sum, t) => sum + t.metadata.confidence, 0) / sortedTables.length
    );

    baseTable.metadata.tags = [
      ...new Set(sortedTables.flatMap(t => t.metadata.tags))
    ];

    return baseTable;
  }

  /**
   * Merge two field definitions
   */
  private mergeFields(field1: any, field2: any): any {
    return {
      ...field1,
      // Prefer more restrictive constraints
      nullable: field1.nullable && field2.nullable,
      primaryKey: field1.primaryKey || field2.primaryKey,
      unique: field1.unique || field2.unique,
      autoIncrement: field1.autoIncrement || field2.autoIncrement,
      // Prefer non-null values
      defaultValue: field1.defaultValue ?? field2.defaultValue,
      foreignKey: field1.foreignKey ?? field2.foreignKey,
      constraints: {
        ...field1.constraints,
        ...field2.constraints,
        maxLength: Math.max(
          field1.constraints?.maxLength || 0,
          field2.constraints?.maxLength || 0
        ) || undefined
      }
    };
  }

  /**
   * Extract relationships from tables
   */
  private async extractRelationships(tables: IRTable[]): Promise<IRRelationship[]> {
    const relationships: IRRelationship[] = [];
    const tableMap = new Map(tables.map(t => [t.name.toLowerCase(), t]));

    for (const table of tables) {
      for (const field of table.fields) {
        if (field.foreignKey) {
          const targetTableName = field.foreignKey.table.toLowerCase();
          const targetTable = tableMap.get(targetTableName);
          
          if (targetTable) {
            const relationship: IRRelationship = {
              id: `${table.name}_${field.name}_${field.foreignKey.table}_${field.foreignKey.field}`,
              type: 'one-to-many', // Default, could be refined based on constraints
              sourceTable: table.name,
              sourceField: field.name,
              targetTable: field.foreignKey.table,
              targetField: field.foreignKey.field,
              onDelete: field.foreignKey.onDelete,
              onUpdate: field.foreignKey.onUpdate,
              sourceLocation: field.sourceLocation
            };

            // Determine relationship type based on constraints
            if (field.unique) {
              relationship.type = 'one-to-one';
            }

            relationships.push(relationship);
          } else {
            this.addWarning({
              type: 'compatibility',
              message: `Foreign key in ${table.name}.${field.name} references unknown table '${field.foreignKey.table}'`,
              file: field.sourceLocation.file,
              line: field.sourceLocation.startLine
            });
          }
        }
      }
    }

    return relationships;
  }

  /**
   * Normalize data types across different frameworks
   */
  private async normalizeDataTypes(tables: IRTable[]): Promise<IRTable[]> {
    const normalizedTables = tables.map(table => ({
      ...table,
      fields: table.fields.map(field => ({
        ...field,
        type: this.normalizeDataType(field.type)
      }))
    }));

    return normalizedTables;
  }

  /**
   * Normalize a single data type
   */
  private normalizeDataType(type: any): any {
    // Map various framework types to standard SQL types
    const typeMap: Record<string, any> = {
      'varchar': 'VARCHAR',
      'char': 'CHAR',
      'text': 'TEXT',
      'longtext': 'TEXT',
      'mediumtext': 'TEXT',
      'tinytext': 'TEXT',
      'int': 'INTEGER',
      'integer': 'INTEGER',
      'bigint': 'BIGINT',
      'smallint': 'SMALLINT',
      'tinyint': 'TINYINT',
      'float': 'FLOAT',
      'double': 'DOUBLE',
      'real': 'REAL',
      'decimal': 'DECIMAL',
      'numeric': 'NUMERIC',
      'bool': 'BOOLEAN',
      'boolean': 'BOOLEAN',
      'date': 'DATE',
      'datetime': 'DATETIME',
      'timestamp': 'TIMESTAMP',
      'time': 'TIME',
      'blob': 'BLOB',
      'mediumblob': 'BLOB',
      'longblob': 'BLOB',
      'tinyblob': 'BLOB',
      'json': 'JSON',
      'jsonb': 'JSONB',
      'uuid': 'UUID',
      'enum': 'ENUM'
    };

    const normalizedType = typeof type === 'string' ? type.toLowerCase() : type;
    return typeMap[normalizedType] || type;
  }

  /**
   * Validate a single table
   */
  private validateTable(table: IRTable): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Check table name
    if (!table.name || !table.name.trim()) {
      errors.push({
        type: 'table',
        message: 'Table name is required',
        location: table.sourceLocation,
        severity: 'error'
      });
    }

    // Validate SQL naming conventions
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table.name)) {
      warnings.push({
        type: 'naming',
        message: `Table name '${table.name}' may not be valid SQL identifier`,
        location: table.sourceLocation,
        suggestion: 'Use only letters, numbers, and underscores'
      });
    }

    // Check for fields
    if (!table.fields || table.fields.length === 0) {
      warnings.push({
        type: 'best-practice',
        message: `Table '${table.name}' has no fields defined`,
        location: table.sourceLocation,
        suggestion: 'Add field definitions'
      });
    }

    // Validate fields
    const fieldNames = new Set<string>();
    let hasPrimaryKey = false;

    for (const field of table.fields || []) {
      // Check for duplicate field names
      if (fieldNames.has(field.name.toLowerCase())) {
        errors.push({
          type: 'field',
          message: `Duplicate field name '${field.name}' in table '${table.name}'`,
          location: field.sourceLocation,
          severity: 'error'
        });
      }
      fieldNames.add(field.name.toLowerCase());

      // Check primary key
      if (field.primaryKey) {
        hasPrimaryKey = true;
      }

      // Validate field name
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field.name)) {
        warnings.push({
          type: 'naming',
          message: `Field name '${field.name}' may not be valid SQL identifier`,
          location: field.sourceLocation,
          suggestion: 'Use only letters, numbers, and underscores'
        });
      }
    }

    // Check for primary key
    if (!hasPrimaryKey) {
      warnings.push({
        type: 'best-practice',
        message: `Table '${table.name}' has no primary key`,
        location: table.sourceLocation,
        suggestion: 'Add a primary key field'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: this.calculateValidationScore(errors, warnings)
    };
  }

  /**
   * Validate a relationship
   */
  private validateRelationship(relationship: IRRelationship, tables: IRTable[]): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    const sourceTable = tables.find(t => t.name === relationship.sourceTable);
    const targetTable = tables.find(t => t.name === relationship.targetTable);

    if (!sourceTable) {
      errors.push({
        type: 'relationship',
        message: `Source table '${relationship.sourceTable}' not found`,
        location: relationship.sourceLocation,
        severity: 'error'
      });
    }

    if (!targetTable) {
      errors.push({
        type: 'relationship',
        message: `Target table '${relationship.targetTable}' not found`,
        location: relationship.sourceLocation,
        severity: 'error'
      });
    }

    if (sourceTable && targetTable) {
      const sourceField = sourceTable.fields.find(f => f.name === relationship.sourceField);
      const targetField = targetTable.fields.find(f => f.name === relationship.targetField);

      if (!sourceField) {
        errors.push({
          type: 'relationship',
          message: `Source field '${relationship.sourceField}' not found in table '${relationship.sourceTable}'`,
          location: relationship.sourceLocation,
          severity: 'error'
        });
      }

      if (!targetField) {
        errors.push({
          type: 'relationship',
          message: `Target field '${relationship.targetField}' not found in table '${relationship.targetTable}'`,
          location: relationship.sourceLocation,
          severity: 'error'
        });
      }

      // Check type compatibility
      if (sourceField && targetField && sourceField.type !== targetField.type) {
        warnings.push({
          type: 'compatibility',
          message: `Type mismatch in relationship: ${sourceField.type} -> ${targetField.type}`,
          location: relationship.sourceLocation,
          suggestion: 'Ensure related fields have compatible types'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: this.calculateValidationScore(errors, warnings)
    };
  }

  /**
   * Validate cross-table constraints
   */
  private validateCrossTableConstraints(tables: IRTable[], relationships: IRRelationship[]): {
    errors: any[];
    warnings: any[];
  } {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Check for orphaned relationships
    const tableNames = new Set(tables.map(t => t.name));
    const referencedTables = new Set(relationships.flatMap(r => [r.sourceTable, r.targetTable]));

    for (const referencedTable of referencedTables) {
      if (!tableNames.has(referencedTable)) {
        warnings.push({
          type: 'compatibility',
          message: `Referenced table '${referencedTable}' not found in schema`,
          suggestion: 'Ensure all referenced tables are included'
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Calculate validation score
   */
  private calculateValidationScore(errors: any[], warnings: any[]): number {
    const errorWeight = 10;
    const warningWeight = 2;
    const maxScore = 100;

    const deduction = (errors.length * errorWeight) + (warnings.length * warningWeight);
    return Math.max(0, maxScore - deduction);
  }

  /**
   * Generate schema metadata
   */
  private generateSchemaMetadata(
    tables: IRTable[],
    relationships: IRRelationship[],
    options: ExtractionOptions
  ): IRSchemaMetadata {
    const frameworks = new Set<SupportedFramework>();
    const languages = new Set<any>();
    let totalConfidence = 0;

    for (const table of tables) {
      frameworks.add(table.metadata.framework);
      languages.add(table.metadata.language);
      totalConfidence += table.metadata.confidence;
    }

    const averageConfidence = tables.length > 0 ? totalConfidence / tables.length : 0;

    return {
      extractedAt: new Date(),
      sourceProject: 'extracted_project',
      confidence: Math.round(averageConfidence),
      frameworks: Array.from(frameworks),
      languages: Array.from(languages),
      version: '1.0.0',
      totalTables: tables.length,
      totalFields: tables.reduce((sum, t) => sum + t.fields.length, 0),
      totalRelationships: relationships.length,
      extractionTime: 0, // Would be set by calling service
      warnings: this.warnings,
      errors: this.errors
    };
  }

  /**
   * Generate schema name
   */
  private generateSchemaName(options: ExtractionOptions): string {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    return `extracted_schema_${timestamp}`;
  }

  /**
   * Extract source files from tables
   */
  private extractSourceFiles(tables: IRTable[]): string[] {
    const files = new Set<string>();
    
    for (const table of tables) {
      files.add(table.sourceLocation.file);
    }
    
    return Array.from(files);
  }

  /**
   * Validate final schema structure
   */
  private async validateFinalSchema(schema: IRSchema): Promise<void> {
    // Use JSON schema validation if needed
    // For now, just basic checks
    
    if (!schema.name) {
      throw new Error('Schema name is required');
    }
    
    if (!schema.tables || schema.tables.length === 0) {
      this.addWarning({
        type: 'compatibility',
        message: 'Schema contains no tables',
        suggestion: 'Verify extraction found database definitions'
      });
    }
  }

  /**
   * Initialize JSON schema validator
   */
  private initializeValidator(): void {
    // Would load JSON schema for IR validation
    // For now, using manual validation
    this.schemaValidator = null;
  }

  /**
   * Add warning to collection
   */
  private addWarning(warning: ExtractionWarning): void {
    this.warnings.push(warning);
  }

  /**
   * Add error to collection
   */
  private addError(error: ExtractionError): void {
    this.errors.push(error);
  }
}
