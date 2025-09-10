// Advanced Data Validation Service for QueryFlow
// Comprehensive data quality, constraint validation, and anomaly detection

import { DatabaseSchema, Table, Column, DataType, DatabaseRecord } from '@/types/database';

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  type: 'constraint' | 'custom' | 'anomaly' | 'quality' | 'referential' | 'business';
  severity: 'error' | 'warning' | 'info';
  tableId?: string;
  columnId?: string;
  expression?: string;
  parameters?: Record<string, any>;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ValidationResult {
  ruleId: string;
  ruleName: string;
  type: ValidationRule['type'];
  severity: ValidationRule['severity'];
  passed: boolean;
  message: string;
  details?: string;
  affectedRecords?: number;
  suggestions?: string[];
  recordIds?: string[];
  columnName?: string;
  tableName?: string;
  timestamp: Date;
}

export interface DataQualityMetrics {
  overallScore: number; // 0-100
  completeness: number; // % of non-null values
  accuracy: number; // % of valid values
  consistency: number; // % of consistent values
  uniqueness: number; // % of unique values where expected
  validity: number; // % of values matching format/type
  timeliness: number; // % of recent/current values
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  duplicateRecords: number;
  nullValues: number;
  anomalies: number;
  constraintViolations: number;
}

export interface ColumnProfile {
  columnId: string;
  columnName: string;
  dataType: DataType;
  totalCount: number;
  nullCount: number;
  uniqueCount: number;
  duplicateCount: number;
  minLength?: number;
  maxLength?: number;
  avgLength?: number;
  minValue?: number;
  maxValue?: number;
  avgValue?: number;
  mostCommonValues: Array<{ value: any; count: number; percentage: number }>;
  patterns: Array<{ pattern: string; count: number; percentage: number }>;
  outliers: Array<{ value: any; score: number; reason: string }>;
  qualityScore: number;
}

export interface TableProfile {
  tableId: string;
  tableName: string;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  duplicateRecords: number;
  columnProfiles: ColumnProfile[];
  relationshipIntegrity: number; // % of valid foreign key references
  qualityScore: number;
  lastProfiled: Date;
}

export interface AnomalyDetectionResult {
  id: string;
  type: 'outlier' | 'pattern' | 'distribution' | 'temporal' | 'referential';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedTable: string;
  affectedColumn?: string;
  affectedRecords: string[];
  confidence: number; // 0-1
  suggestedAction: string;
  detectedAt: Date;
}

export interface ValidationReport {
  id: string;
  schemaId: string;
  schemaName: string;
  executedAt: Date;
  executionTimeMs: number;
  totalRules: number;
  passedRules: number;
  failedRules: number;
  warningRules: number;
  overallQuality: DataQualityMetrics;
  tableProfiles: TableProfile[];
  validationResults: ValidationResult[];
  anomalies: AnomalyDetectionResult[];
  recommendations: string[];
}

export class DataValidationService {
  private static readonly OUTLIER_THRESHOLD = 2.5; // Standard deviations
  private static readonly PATTERN_MIN_FREQUENCY = 0.1; // 10% minimum frequency for pattern detection

  /**
   * Validate all data against schema constraints and custom rules
   */
  static async validateData(
    schema: DatabaseSchema,
    records: DatabaseRecord[],
    rules: ValidationRule[]
  ): Promise<ValidationReport> {
    const startTime = Date.now();
    
    // Initialize report
    const report: ValidationReport = {
      id: `validation_${Date.now()}`,
      schemaId: schema.id,
      schemaName: schema.name,
      executedAt: new Date(),
      executionTimeMs: 0,
      totalRules: rules.length,
      passedRules: 0,
      failedRules: 0,
      warningRules: 0,
      overallQuality: this.initializeQualityMetrics(),
      tableProfiles: [],
      validationResults: [],
      anomalies: [],
      recommendations: []
    };

    // Group records by table
    const recordsByTable = this.groupRecordsByTable(records);

    // Generate table profiles
    for (const table of schema.tables) {
      const tableRecords = recordsByTable.get(table.id) || [];
      const profile = await this.generateTableProfile(table, tableRecords);
      report.tableProfiles.push(profile);
    }

    // Run constraint validations
    const constraintResults = await this.validateConstraints(schema, records);
    report.validationResults.push(...constraintResults);

    // Run custom rule validations
    const customResults = await this.validateCustomRules(schema, records, rules);
    report.validationResults.push(...customResults);

    // Detect anomalies
    const anomalies = await this.detectAnomalies(schema, records);
    report.anomalies.push(...anomalies);

    // Calculate overall quality metrics
    report.overallQuality = this.calculateOverallQuality(report.tableProfiles, report.validationResults);

    // Generate recommendations
    report.recommendations = this.generateRecommendations(report);

    // Calculate result statistics
    report.passedRules = report.validationResults.filter(r => r.passed).length;
    report.failedRules = report.validationResults.filter(r => !r.passed && r.severity === 'error').length;
    report.warningRules = report.validationResults.filter(r => !r.passed && r.severity === 'warning').length;
    
    report.executionTimeMs = Date.now() - startTime;

    return report;
  }

  /**
   * Validate data against schema constraints
   */
  private static validateStringLength(
    table: Table,
    column: Column,
    records: DatabaseRecord[]
  ): ValidationResult | null {
    const columnRecords = records.filter(r => r.tableId === table.id);
    const violations: string[] = [];

    for (const record of columnRecords) {
      const value = record.data[column.name];
      if (value === null || value === undefined) continue;

      const stringValue = String(value);
      
      if (column.constraints?.maxLength && stringValue.length > column.constraints.maxLength) {
        violations.push(`Value "${stringValue}" exceeds max length ${column.constraints.maxLength}`);
      }
      
      if (column.constraints?.minLength && stringValue.length < column.constraints.minLength) {
        violations.push(`Value "${stringValue}" below min length ${column.constraints.minLength}`);
      }
    }

    if (violations.length > 0) {
      return {
        ruleId: `length_${table.id}_${column.name}`,
        ruleName: 'String Length Constraint',
        type: 'constraint',
        severity: 'error',
        passed: false,
        message: `String length constraint violations in ${table.name}.${column.name}`,
        details: violations.join('; '),
        affectedRecords: violations.length,
        timestamp: new Date()
      };
    }

    return null;
  }

  private static validateNumericRange(
    table: Table,
    column: Column,
    records: DatabaseRecord[]
  ): ValidationResult | null {
    const columnRecords = records.filter(r => r.tableId === table.id);
    const violations: string[] = [];

    for (const record of columnRecords) {
      const value = record.data[column.name];
      if (value === null || value === undefined) continue;

      const numValue = Number(value);
      if (isNaN(numValue)) continue;

      if (column.constraints?.precision !== undefined) {
        const decimalPlaces = (String(value).split('.')[1] || '').length;
        if (decimalPlaces > column.constraints.precision) {
          violations.push(`Value "${value}" exceeds precision ${column.constraints.precision}`);
        }
      }

      if (column.constraints?.scale !== undefined) {
        const scale = (String(value).split('.')[1] || '').length;
        if (scale > column.constraints.scale) {
          violations.push(`Value "${value}" exceeds scale ${column.constraints.scale}`);
        }
      }
    }

    if (violations.length > 0) {
      return {
        ruleId: `numeric_${table.id}_${column.name}`,
        ruleName: 'Numeric Range Constraint',
        type: 'constraint',
        severity: 'error',
        passed: false,
        message: `Numeric range constraint violations in ${table.name}.${column.name}`,
        details: violations.join('; '),
        affectedRecords: violations.length,
        timestamp: new Date()
      };
    }

    return null;
  }

  private static async validateConstraints(
    schema: DatabaseSchema,
    records: DatabaseRecord[]
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const recordsByTable = this.groupRecordsByTable(records);

    for (const table of schema.tables) {
      const tableRecords = recordsByTable.get(table.id) || [];
      
      for (const column of table.columns) {
        // Primary Key Validation
        if (column.primaryKey) {
          const pkResult = this.validatePrimaryKey(table, column, tableRecords);
          if (pkResult) results.push(pkResult);
        }

        // Not Null Validation
        if (!column.nullable) {
          const notNullResult = this.validateNotNull(table, column, tableRecords);
          if (notNullResult) results.push(notNullResult);
        }

        // Unique Constraint Validation
        if (column.constraints?.unique) {
          const uniqueResult = this.validateUnique(table, column, tableRecords);
          if (uniqueResult) results.push(uniqueResult);
        }

        // Foreign Key Validation
        if (column.foreignKey) {
          const fkResult = this.validateForeignKey(schema, table, column, records);
          if (fkResult) results.push(fkResult);
        }

        // Check Constraint Validation
        if (column.constraints?.check) {
          const checkResult = this.validateCheckConstraint(table, column, tableRecords);
          if (checkResult) results.push(checkResult);
        }

        // Data Type Validation
        const typeResult = this.validateDataType(table, column, tableRecords);
        if (typeResult) results.push(typeResult);

        // Length Constraints
        if (column.constraints?.maxLength || column.constraints?.minLength) {
          const lengthResult = this.validateStringLength(table, column, tableRecords);
          if (lengthResult) results.push(lengthResult);
        }

        // Numeric Range Validation
        if (this.isNumericType(column.type) && (column.constraints?.precision || column.constraints?.scale)) {
          const rangeResult = this.validateNumericRange(table, column, tableRecords);
          if (rangeResult) results.push(rangeResult);
        }
      }
    }

    return results;
  }

  /**
   * Validate primary key constraints
   */
  private static validatePrimaryKey(
    table: Table,
    column: Column,
    records: DatabaseRecord[]
  ): ValidationResult | null {
    const pkValues = records.map(r => r.data[column.name]).filter(v => v !== null && v !== undefined);
    const uniqueValues = new Set(pkValues);
    const nullCount = records.length - pkValues.length;
    
    const violations = pkValues.length - uniqueValues.size + nullCount;
    
    if (violations > 0) {
      return {
        ruleId: `pk_${table.id}_${column.id}`,
        ruleName: 'Primary Key Constraint',
        type: 'constraint',
        severity: 'error',
        passed: false,
        message: `Primary key constraint violated: ${violations} duplicate or null values found`,
        details: `Column '${column.name}' in table '${table.name}' must have unique, non-null values`,
        affectedRecords: violations,
        suggestions: [
          'Remove duplicate values',
          'Fill in null values with unique identifiers',
          'Consider using auto-increment or UUID generation'
        ],
        columnName: column.name,
        tableName: table.name,
        timestamp: new Date()
      };
    }

    return null;
  }

  /**
   * Validate not null constraints
   */
  private static validateNotNull(
    table: Table,
    column: Column,
    records: DatabaseRecord[]
  ): ValidationResult | null {
    const nullCount = records.filter(r => 
      r.data[column.name] === null || 
      r.data[column.name] === undefined || 
      r.data[column.name] === ''
    ).length;

    if (nullCount > 0) {
      return {
        ruleId: `not_null_${table.id}_${column.id}`,
        ruleName: 'Not Null Constraint',
        type: 'constraint',
        severity: 'error',
        passed: false,
        message: `Not null constraint violated: ${nullCount} null values found`,
        details: `Column '${column.name}' in table '${table.name}' cannot contain null values`,
        affectedRecords: nullCount,
        suggestions: [
          'Fill in missing values',
          'Set appropriate default values',
          'Mark column as nullable if appropriate'
        ],
        columnName: column.name,
        tableName: table.name,
        timestamp: new Date()
      };
    }

    return null;
  }

  /**
   * Validate unique constraints
   */
  private static validateUnique(
    table: Table,
    column: Column,
    records: DatabaseRecord[]
  ): ValidationResult | null {
    const values = records.map(r => r.data[column.name]).filter(v => v !== null && v !== undefined);
    const uniqueValues = new Set(values);
    const duplicates = values.length - uniqueValues.size;

    if (duplicates > 0) {
      return {
        ruleId: `unique_${table.id}_${column.id}`,
        ruleName: 'Unique Constraint',
        type: 'constraint',
        severity: 'error',
        passed: false,
        message: `Unique constraint violated: ${duplicates} duplicate values found`,
        details: `Column '${column.name}' in table '${table.name}' must have unique values`,
        affectedRecords: duplicates,
        suggestions: [
          'Remove or modify duplicate values',
          'Consider using composite unique constraints',
          'Review data entry processes'
        ],
        columnName: column.name,
        tableName: table.name,
        timestamp: new Date()
      };
    }

    return null;
  }

  /**
   * Validate foreign key constraints
   */
  private static validateForeignKey(
    schema: DatabaseSchema,
    table: Table,
    column: Column,
    allRecords: DatabaseRecord[]
  ): ValidationResult | null {
    if (!column.foreignKey) return null;

    const referencedTable = schema.tables.find(t => t.id === column.foreignKey!.tableId);
    if (!referencedTable) return null;

    const referencedColumn = referencedTable.columns.find(c => c.id === column.foreignKey!.columnId);
    if (!referencedColumn) return null;

    // Get all records for both tables
    const tableRecords = allRecords.filter(r => r.tableId === table.id);
    const referencedRecords = allRecords.filter(r => r.tableId === referencedTable.id);
    
    // Get valid foreign key values
    const validFKValues = new Set(
      referencedRecords.map(r => r.data[referencedColumn.name]).filter(v => v !== null && v !== undefined)
    );

    // Check for orphaned records
    const orphanedRecords = tableRecords.filter(r => {
      const fkValue = r.data[column.name];
      return fkValue !== null && fkValue !== undefined && !validFKValues.has(fkValue);
    });

    if (orphanedRecords.length > 0) {
      return {
        ruleId: `fk_${table.id}_${column.id}`,
        ruleName: 'Foreign Key Constraint',
        type: 'referential',
        severity: 'error',
        passed: false,
        message: `Foreign key constraint violated: ${orphanedRecords.length} orphaned records found`,
        details: `Column '${column.name}' in table '${table.name}' references non-existent values in '${referencedTable.name}.${referencedColumn.name}'`,
        affectedRecords: orphanedRecords.length,
        recordIds: orphanedRecords.map(r => r.id),
        suggestions: [
          'Remove orphaned records',
          'Insert missing referenced records',
          'Update foreign key values to valid references'
        ],
        columnName: column.name,
        tableName: table.name,
        timestamp: new Date()
      };
    }

    return null;
  }

  /**
   * Validate check constraints
   */
  private static validateCheckConstraint(
    table: Table,
    column: Column,
    records: DatabaseRecord[]
  ): ValidationResult | null {
    if (!column.constraints?.check) return null;

    // Simple check constraint evaluation (can be enhanced with expression parser)
    const checkExpression = column.constraints.check;
    const violations: DatabaseRecord[] = [];

    for (const record of records) {
      const value = record.data[column.name];
      if (!this.evaluateCheckConstraint(checkExpression, value, column)) {
        violations.push(record);
      }
    }

    if (violations.length > 0) {
      return {
        ruleId: `check_${table.id}_${column.id}`,
        ruleName: 'Check Constraint',
        type: 'constraint',
        severity: 'error',
        passed: false,
        message: `Check constraint violated: ${violations.length} records fail constraint '${checkExpression}'`,
        details: `Column '${column.name}' in table '${table.name}' has values that don't satisfy the check constraint`,
        affectedRecords: violations.length,
        recordIds: violations.map(r => r.id),
        suggestions: [
          'Update values to satisfy the constraint',
          'Review the constraint definition',
          'Implement data validation at input'
        ],
        columnName: column.name,
        tableName: table.name,
        timestamp: new Date()
      };
    }

    return null;
  }

  /**
   * Validate data types
   */
  private static validateDataType(
    table: Table,
    column: Column,
    records: DatabaseRecord[]
  ): ValidationResult | null {
    const invalidRecords: DatabaseRecord[] = [];

    for (const record of records) {
      const value = record.data[column.name];
      if (value !== null && value !== undefined && !this.isValidDataType(value, column.type)) {
        invalidRecords.push(record);
      }
    }

    if (invalidRecords.length > 0) {
      return {
        ruleId: `type_${table.id}_${column.id}`,
        ruleName: 'Data Type Validation',
        type: 'constraint',
        severity: 'warning',
        passed: false,
        message: `Data type mismatch: ${invalidRecords.length} values don't match expected type '${column.type}'`,
        details: `Column '${column.name}' in table '${table.name}' contains values incompatible with ${column.type}`,
        affectedRecords: invalidRecords.length,
        recordIds: invalidRecords.map(r => r.id),
        suggestions: [
          'Convert values to the correct data type',
          'Update column type to accommodate data',
          'Implement input validation'
        ],
        columnName: column.name,
        tableName: table.name,
        timestamp: new Date()
      };
    }

    return null;
  }

  /**
   * Validate custom rules using expression engine
   */
  private static async validateCustomRules(
    schema: DatabaseSchema,
    records: DatabaseRecord[],
    rules: ValidationRule[]
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const customRules = rules.filter(r => r.type === 'custom' && r.enabled);

    for (const rule of customRules) {
      const result = await this.evaluateCustomRule(schema, records, rule);
      if (result) results.push(result);
    }

    return results;
  }

  /**
   * Detect data anomalies
   */
  private static async detectAnomalies(
    schema: DatabaseSchema,
    records: DatabaseRecord[]
  ): Promise<AnomalyDetectionResult[]> {
    const anomalies: AnomalyDetectionResult[] = [];
    const recordsByTable = this.groupRecordsByTable(records);

    for (const table of schema.tables) {
      const tableRecords = recordsByTable.get(table.id) || [];
      
      for (const column of table.columns) {
        // Detect outliers in numeric columns
        if (this.isNumericType(column.type)) {
          const outliers = this.detectOutliers(table, column, tableRecords);
          anomalies.push(...outliers);
        }

        // Detect pattern anomalies in text columns
        if (this.isTextType(column.type)) {
          const patternAnomalies = this.detectPatternAnomalies(table, column, tableRecords);
          anomalies.push(...patternAnomalies);
        }

        // Detect distribution anomalies
        const distributionAnomalies = this.detectDistributionAnomalies(table, column, tableRecords);
        anomalies.push(...distributionAnomalies);
      }
    }

    return anomalies;
  }

  /**
   * Generate table profile with statistics
   */
  private static async generateTableProfile(
    table: Table,
    records: DatabaseRecord[]
  ): Promise<TableProfile> {
    const columnProfiles: ColumnProfile[] = [];
    
    for (const column of table.columns) {
      const profile = this.generateColumnProfile(column, records);
      columnProfiles.push(profile);
    }

    const validRecords = records.filter(r => this.isValidRecord(r, table));
    const duplicateRecords = this.findDuplicateRecords(records);

    return {
      tableId: table.id,
      tableName: table.name,
      totalRecords: records.length,
      validRecords: validRecords.length,
      invalidRecords: records.length - validRecords.length,
      duplicateRecords: duplicateRecords.length,
      columnProfiles,
      relationshipIntegrity: 100, // Will be calculated based on FK validation
      qualityScore: this.calculateTableQualityScore(columnProfiles, records),
      lastProfiled: new Date()
    };
  }

  /**
   * Generate column profile with detailed statistics
   */
  private static generateColumnProfile(
    column: Column,
    records: DatabaseRecord[]
  ): ColumnProfile {
    const values = records.map(r => r.data[column.name]);
    const nonNullValues = values.filter(v => v !== null && v !== undefined);
    const nullCount = values.length - nonNullValues.length;
    const uniqueValues = new Set(nonNullValues);

    // Calculate value frequency
    const valueFrequency = new Map<any, number>();
    nonNullValues.forEach(value => {
      valueFrequency.set(value, (valueFrequency.get(value) || 0) + 1);
    });

    const mostCommonValues = Array.from(valueFrequency.entries())
      .map(([value, count]) => ({
        value,
        count,
        percentage: (count / nonNullValues.length) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Detect patterns for text columns
    const patterns = this.isTextType(column.type) 
      ? this.detectValuePatterns(nonNullValues.filter(v => typeof v === 'string'))
      : [];

    // Detect outliers for numeric columns
    const outliers = this.isNumericType(column.type)
      ? this.findColumnOutliers(nonNullValues.filter(v => typeof v === 'number'))
      : [];

    const profile: ColumnProfile = {
      columnId: column.id,
      columnName: column.name,
      dataType: column.type,
      totalCount: values.length,
      nullCount,
      uniqueCount: uniqueValues.size,
      duplicateCount: nonNullValues.length - uniqueValues.size,
      mostCommonValues,
      patterns,
      outliers,
      qualityScore: this.calculateColumnQualityScore(column, values)
    };

    // Add type-specific statistics
    if (this.isTextType(column.type)) {
      const lengths = nonNullValues
        .filter(v => typeof v === 'string')
        .map(v => v.length);
      
      if (lengths.length > 0) {
        profile.minLength = Math.min(...lengths);
        profile.maxLength = Math.max(...lengths);
        profile.avgLength = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
      }
    }

    if (this.isNumericType(column.type)) {
      const numbers = nonNullValues
        .filter(v => typeof v === 'number' && !isNaN(v));
      
      if (numbers.length > 0) {
        profile.minValue = Math.min(...numbers);
        profile.maxValue = Math.max(...numbers);
        profile.avgValue = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
      }
    }

    return profile;
  }

  // Helper methods

  private static groupRecordsByTable(records: DatabaseRecord[]): Map<string, DatabaseRecord[]> {
    const grouped = new Map<string, DatabaseRecord[]>();
    records.forEach(record => {
      if (!grouped.has(record.tableId)) {
        grouped.set(record.tableId, []);
      }
      grouped.get(record.tableId)!.push(record);
    });
    return grouped;
  }

  private static initializeQualityMetrics(): DataQualityMetrics {
    return {
      overallScore: 0,
      completeness: 0,
      accuracy: 0,
      consistency: 0,
      uniqueness: 0,
      validity: 0,
      timeliness: 0,
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      duplicateRecords: 0,
      nullValues: 0,
      anomalies: 0,
      constraintViolations: 0
    };
  }

  private static isValidDataType(value: any, type: DataType): boolean {
    // Implementation similar to dataManagement.ts but enhanced
    if (value === null || value === undefined) return true;

    switch (type.toUpperCase()) {
      case 'INTEGER':
      case 'BIGINT':
      case 'SMALLINT':
      case 'TINYINT':
        return Number.isInteger(Number(value));
      case 'REAL':
      case 'FLOAT':
      case 'DOUBLE':
      case 'DECIMAL':
      case 'NUMERIC':
      case 'MONEY':
        return !isNaN(Number(value));
      case 'TEXT':
      case 'VARCHAR':
      case 'CHAR':
      case 'NCHAR':
      case 'NVARCHAR':
        return typeof value === 'string';
      case 'BOOLEAN':
        return typeof value === 'boolean' || ['true', 'false', '1', '0'].includes(String(value).toLowerCase());
      case 'DATE':
      case 'DATETIME':
      case 'TIMESTAMP':
      case 'TIME':
        return !isNaN(Date.parse(value));
      case 'JSON':
      case 'JSONB':
        try {
          if (typeof value === 'string') {
            JSON.parse(value);
          }
          return true;
        } catch {
          return false;
        }
      case 'UUID':
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return typeof value === 'string' && uuidRegex.test(value);
      default:
        return true;
    }
  }

  private static isNumericType(type: DataType): boolean {
    const numericTypes = [
      'INTEGER', 'BIGINT', 'SMALLINT', 'TINYINT',
      'REAL', 'FLOAT', 'DOUBLE', 'NUMERIC', 'DECIMAL', 'MONEY'
    ];
    return numericTypes.includes(type.toUpperCase());
  }

  private static isTextType(type: DataType): boolean {
    const textTypes = [
      'TEXT', 'VARCHAR', 'CHAR', 'NCHAR', 'NVARCHAR', 'STRING'
    ];
    return textTypes.includes(type.toUpperCase());
  }

  private static evaluateCheckConstraint(expression: string, value: any, column: Column): boolean {
    // Simple constraint evaluation - can be enhanced with a proper expression parser
    try {
      // Replace column references with actual value
      const evaluableExpression = expression
        .replace(new RegExp(column.name, 'g'), JSON.stringify(value))
        .replace(/\bvalue\b/g, JSON.stringify(value));
      
      // Simple range checks
      if (expression.includes('>=') || expression.includes('<=') || expression.includes('>') || expression.includes('<')) {
        return Function('"use strict"; return (' + evaluableExpression + ')')();
      }
      
      // Pattern checks
      if (expression.includes('LIKE') || expression.includes('REGEXP')) {
        // Simplified pattern matching
        return true; // Would need full SQL expression parser
      }
      
      return true;
    } catch {
      return true; // If evaluation fails, assume constraint passes
    }
  }

  private static async evaluateCustomRule(
    schema: DatabaseSchema,
    records: DatabaseRecord[],
    rule: ValidationRule
  ): Promise<ValidationResult | null> {
    // Placeholder for custom rule evaluation
    // Would implement expression engine for complex business rules
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      type: rule.type,
      severity: rule.severity,
      passed: true,
      message: `Custom rule '${rule.name}' passed`,
      timestamp: new Date()
    };
  }

  private static detectOutliers(
    table: Table,
    column: Column,
    records: DatabaseRecord[]
  ): AnomalyDetectionResult[] {
    const values = records
      .map(r => r.data[column.name])
      .filter(v => v !== null && v !== undefined && typeof v === 'number');

    if (values.length < 10) return []; // Need sufficient data for outlier detection

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    const outliers = records.filter(record => {
      const value = record.data[column.name];
      if (typeof value !== 'number') return false;
      return Math.abs(value - mean) > this.OUTLIER_THRESHOLD * stdDev;
    });

    if (outliers.length > 0) {
      return [{
        id: `outlier_${table.id}_${column.id}_${Date.now()}`,
        type: 'outlier',
        severity: outliers.length > values.length * 0.1 ? 'high' : 'medium',
        description: `Statistical outliers detected in ${column.name}`,
        affectedTable: table.name,
        affectedColumn: column.name,
        affectedRecords: outliers.map(r => r.id),
        confidence: 0.85,
        suggestedAction: 'Review outlier values for data entry errors or legitimate extreme values',
        detectedAt: new Date()
      }];
    }

    return [];
  }

  private static detectPatternAnomalies(
    table: Table,
    column: Column,
    records: DatabaseRecord[]
  ): AnomalyDetectionResult[] {
    // Detect pattern anomalies in text data
    const values = records
      .map(r => r.data[column.name])
      .filter(v => v !== null && v !== undefined && typeof v === 'string');

    if (values.length < 10) return [];

    const patterns = this.detectValuePatterns(values);
    const anomalies: AnomalyDetectionResult[] = [];

    // Find values that don't match common patterns
    const majorPatterns = patterns.filter(p => p.percentage > 20); // Major patterns
    
    if (majorPatterns.length > 0) {
      const conformingValues = new Set();
      majorPatterns.forEach(pattern => {
        values.forEach(value => {
          if (this.matchesPattern(value, pattern.pattern)) {
            conformingValues.add(value);
          }
        });
      });

      const nonConformingRecords = records.filter(record => {
        const value = record.data[column.name];
        return typeof value === 'string' && !conformingValues.has(value);
      });

      if (nonConformingRecords.length > 0 && nonConformingRecords.length < values.length * 0.5) {
        anomalies.push({
          id: `pattern_${table.id}_${column.id}_${Date.now()}`,
          type: 'pattern',
          severity: 'medium',
          description: `Values not conforming to common patterns in ${column.name}`,
          affectedTable: table.name,
          affectedColumn: column.name,
          affectedRecords: nonConformingRecords.map(r => r.id),
          confidence: 0.75,
          suggestedAction: 'Review non-conforming values for consistency with expected format',
          detectedAt: new Date()
        });
      }
    }

    return anomalies;
  }

  private static detectDistributionAnomalies(
    table: Table,
    column: Column,
    records: DatabaseRecord[]
  ): AnomalyDetectionResult[] {
    // Detect unusual value distributions
    const values = records.map(r => r.data[column.name]).filter(v => v !== null && v !== undefined);
    
    if (values.length < 10) return [];

    const valueFrequency = new Map<any, number>();
    values.forEach(value => {
      valueFrequency.set(value, (valueFrequency.get(value) || 0) + 1);
    });

    const frequencies = Array.from(valueFrequency.values()).sort((a, b) => b - a);
    
    // Check for highly skewed distributions (one value dominates)
    if (frequencies.length > 1 && frequencies[0] > values.length * 0.8) {
      return [{
        id: `distribution_${table.id}_${column.id}_${Date.now()}`,
        type: 'distribution',
        severity: 'medium',
        description: `Highly skewed value distribution in ${column.name}`,
        affectedTable: table.name,
        affectedColumn: column.name,
        affectedRecords: [],
        confidence: 0.8,
        suggestedAction: 'Review data diversity and consider if this distribution is expected',
        detectedAt: new Date()
      }];
    }

    return [];
  }

  private static detectValuePatterns(values: string[]): Array<{ pattern: string; count: number; percentage: number }> {
    const patterns = new Map<string, number>();

    values.forEach(value => {
      // Generate simplified pattern (replace digits with 'N', letters with 'A')
      const pattern = value
        .replace(/\d/g, 'N')
        .replace(/[a-zA-Z]/g, 'A')
        .replace(/\s/g, ' ');
      
      patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
    });

    return Array.from(patterns.entries())
      .map(([pattern, count]) => ({
        pattern,
        count,
        percentage: (count / values.length) * 100
      }))
      .filter(p => p.percentage >= this.PATTERN_MIN_FREQUENCY * 100)
      .sort((a, b) => b.count - a.count);
  }

  private static matchesPattern(value: string, pattern: string): boolean {
    const valuePattern = value
      .replace(/\d/g, 'N')
      .replace(/[a-zA-Z]/g, 'A')
      .replace(/\s/g, ' ');
    
    return valuePattern === pattern;
  }

  private static findColumnOutliers(values: number[]): Array<{ value: any; score: number; reason: string }> {
    if (values.length < 5) return [];

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return values
      .map(value => ({
        value,
        score: Math.abs(value - mean) / stdDev,
        reason: `${Math.abs(value - mean) / stdDev > this.OUTLIER_THRESHOLD ? 'Statistical outlier' : 'Normal value'}`
      }))
      .filter(item => item.score > this.OUTLIER_THRESHOLD)
      .sort((a, b) => b.score - a.score);
  }

  private static isValidRecord(record: DatabaseRecord, table: Table): boolean {
    // Check if record satisfies basic constraints
    for (const column of table.columns) {
      const value = record.data[column.name];
      
      // Check not null constraint
      if (!column.nullable && (value === null || value === undefined || value === '')) {
        return false;
      }
      
      // Check data type
      if (value !== null && value !== undefined && !this.isValidDataType(value, column.type)) {
        return false;
      }
    }
    
    return true;
  }

  private static findDuplicateRecords(records: DatabaseRecord[]): DatabaseRecord[] {
    const seen = new Set<string>();
    const duplicates: DatabaseRecord[] = [];
    
    records.forEach(record => {
      const recordHash = JSON.stringify(record.data);
      if (seen.has(recordHash)) {
        duplicates.push(record);
      } else {
        seen.add(recordHash);
      }
    });
    
    return duplicates;
  }

  private static calculateColumnQualityScore(column: Column, values: any[]): number {
    let score = 100;
    const totalValues = values.length;
    
    if (totalValues === 0) return 0;
    
    // Penalize null values for non-nullable columns
    const nullCount = values.filter(v => v === null || v === undefined || v === '').length;
    if (!column.nullable && nullCount > 0) {
      score -= (nullCount / totalValues) * 50;
    }
    
    // Penalize type mismatches
    const validValues = values.filter(v => 
      v === null || v === undefined || this.isValidDataType(v, column.type)
    ).length;
    const typeScore = (validValues / totalValues) * 30;
    score = score - 30 + typeScore;
    
    return Math.max(0, Math.min(100, score));
  }

  private static calculateTableQualityScore(columnProfiles: ColumnProfile[], records: DatabaseRecord[]): number {
    if (columnProfiles.length === 0) return 0;
    
    const avgColumnScore = columnProfiles.reduce((sum, profile) => sum + profile.qualityScore, 0) / columnProfiles.length;
    return Math.round(avgColumnScore);
  }

  private static calculateOverallQuality(
    tableProfiles: TableProfile[],
    validationResults: ValidationResult[]
  ): DataQualityMetrics {
    const totalRecords = tableProfiles.reduce((sum, profile) => sum + profile.totalRecords, 0);
    const validRecords = tableProfiles.reduce((sum, profile) => sum + profile.validRecords, 0);
    const duplicateRecords = tableProfiles.reduce((sum, profile) => sum + profile.duplicateRecords, 0);
    
    const failedResults = validationResults.filter(r => !r.passed);
    const constraintViolations = failedResults.filter(r => r.type === 'constraint').length;
    
    const completeness = totalRecords > 0 ? (validRecords / totalRecords) * 100 : 100;
    const accuracy = totalRecords > 0 ? ((totalRecords - failedResults.length) / totalRecords) * 100 : 100;
    const uniqueness = totalRecords > 0 ? ((totalRecords - duplicateRecords) / totalRecords) * 100 : 100;
    const validity = accuracy; // Simplified
    const consistency = accuracy; // Simplified
    const timeliness = 100; // Would require temporal analysis
    
    const overallScore = (completeness + accuracy + uniqueness + validity + consistency + timeliness) / 6;

    return {
      overallScore: Math.round(overallScore),
      completeness: Math.round(completeness),
      accuracy: Math.round(accuracy),
      consistency: Math.round(consistency),
      uniqueness: Math.round(uniqueness),
      validity: Math.round(validity),
      timeliness: Math.round(timeliness),
      totalRecords,
      validRecords,
      invalidRecords: totalRecords - validRecords,
      duplicateRecords,
      nullValues: 0, // Would calculate from column profiles
      anomalies: 0, // Would be set by caller
      constraintViolations
    };
  }

  private static generateRecommendations(report: ValidationReport): string[] {
    const recommendations: string[] = [];
    
    if (report.overallQuality.overallScore < 70) {
      recommendations.push('Overall data quality is below acceptable threshold. Consider implementing data governance policies.');
    }
    
    if (report.overallQuality.completeness < 80) {
      recommendations.push('Address data completeness issues by implementing required field validation and default values.');
    }
    
    if (report.overallQuality.uniqueness < 90) {
      recommendations.push('Review duplicate data and implement deduplication processes.');
    }
    
    if (report.failedRules > 0) {
      recommendations.push('Address constraint violations to ensure data integrity.');
    }
    
    if (report.anomalies.length > 0) {
      recommendations.push('Investigate detected anomalies to identify potential data quality issues.');
    }
    
    return recommendations;
  }
}
