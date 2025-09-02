// Advanced Data Management for QueryFlow
// This module provides enterprise-grade data management, quality tools, and validation

import { DatabaseRecord, Table, Column, DataValidationRule } from '@/types/database';

export interface DataQualityReport {
  id: string;
  tableId: string;
  timestamp: Date;
  totalRecords: number;
  qualityScore: number;
  issues: DataQualityIssue[];
  recommendations: string[];
}

export interface DataQualityIssue {
  id: string;
  type: 'missing' | 'duplicate' | 'invalid' | 'inconsistent' | 'outlier';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedRecords: number;
  column?: string;
  details: Record<string, any>;
}

export interface DataTransformation {
  id: string;
  name: string;
  description: string;
  type: 'clean' | 'normalize' | 'aggregate' | 'split' | 'merge' | 'validate';
  rules: TransformationRule[];
  enabled: boolean;
  createdAt: Date;
}

export interface TransformationRule {
  id: string;
  field: string;
  operation: 'trim' | 'uppercase' | 'lowercase' | 'replace' | 'format' | 'validate' | 'calculate';
  parameters: Record<string, any>;
  condition?: string;
}

export interface DataImportResult {
  id: string;
  filename: string;
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  errors: ImportError[];
  mapping: FieldMapping[];
  timestamp: Date;
}

export interface ImportError {
  row: number;
  column: string;
  value: any;
  error: string;
  severity: 'warning' | 'error';
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transformation?: TransformationRule;
  required: boolean;
}

export interface DataExportConfig {
  id: string;
  name: string;
  format: 'csv' | 'json' | 'xml' | 'excel';
  filters: ExportFilter[];
  columns: string[];
  includeHeaders: boolean;
  delimiter?: string;
  encoding: string;
}

export interface ExportFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in';
  value: any;
}

export interface DataAuditLog {
  id: string;
  tableId: string;
  recordId: string;
  action: 'create' | 'update' | 'delete' | 'view';
  userId: string;
  timestamp: Date;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export class DataManagementManager {
  private static readonly QUALITY_REPORTS_KEY = 'queryflow_quality_reports';
  private static readonly TRANSFORMATIONS_KEY = 'queryflow_transformations';
  private static readonly IMPORT_RESULTS_KEY = 'queryflow_import_results';
  private static readonly EXPORT_CONFIGS_KEY = 'queryflow_export_configs';
  private static readonly AUDIT_LOGS_KEY = 'queryflow_audit_logs';

  /**
   * Analyze data quality for a table
   */
  static analyzeDataQuality(table: Table, records: DatabaseRecord[]): DataQualityReport {
    const issues: DataQualityIssue[] = [];
    let totalIssues = 0;

    // Check for missing values
    table.columns.forEach(column => {
      if (!column.nullable) {
        const missingCount = records.filter(record => 
          record.data[column.name] === null || 
          record.data[column.name] === undefined || 
          record.data[column.name] === ''
        ).length;

        if (missingCount > 0) {
          issues.push({
            id: `missing-${column.id}`,
            type: 'missing',
            severity: column.primaryKey ? 'critical' : 'high',
            description: `Missing values in required column ${column.name}`,
            affectedRecords: missingCount,
            column: column.name,
            details: { columnType: column.type, isPrimaryKey: column.primaryKey }
          });
          totalIssues += missingCount;
        }
      }
    });

    // Check for duplicates
    const duplicateGroups = this.findDuplicates(records, table.columns.filter(c => c.primaryKey));
    duplicateGroups.forEach((group, index) => {
      if (group.length > 1) {
        issues.push({
          id: `duplicate-${index}`,
          type: 'duplicate',
          severity: 'high',
          description: `Duplicate records found`,
          affectedRecords: group.length,
          details: { duplicateKeys: group.map(r => r.id) }
        });
        totalIssues += group.length;
      }
    });

    // Check for invalid data types
    table.columns.forEach(column => {
      const invalidRecords = records.filter(record => {
        const value = record.data[column.name];
        if (value === null || value === undefined) return false;
        
        return !this.isValidDataType(value, column.type);
      });

      if (invalidRecords.length > 0) {
        issues.push({
          id: `invalid-${column.id}`,
          type: 'invalid',
          severity: 'medium',
          description: `Invalid data type in column ${column.name}`,
          affectedRecords: invalidRecords.length,
          column: column.name,
          details: { expectedType: column.type, invalidValues: invalidRecords.map(r => r.data[column.name]) }
        });
        totalIssues += invalidRecords.length;
      }
    });

    // Check for outliers in numeric columns
    table.columns.forEach(column => {
      if (this.isNumericType(column.type)) {
        const values = records
          .map(r => r.data[column.name])
          .filter(v => v !== null && v !== undefined && !isNaN(Number(v)))
          .map(v => Number(v));

        if (values.length > 10) {
          const outliers = this.detectOutliers(values);
          if (outliers.length > 0) {
            issues.push({
              id: `outlier-${column.id}`,
              type: 'outlier',
              severity: 'low',
              description: `Outliers detected in numeric column ${column.name}`,
              affectedRecords: outliers.length,
              column: column.name,
              details: { outliers, mean: this.calculateMean(values), stdDev: this.calculateStdDev(values) }
            });
          }
        }
      }
    });

    // Calculate quality score
    const qualityScore = Math.max(0, 100 - (totalIssues / records.length) * 100);

    // Generate recommendations
    const recommendations = this.generateQualityRecommendations(issues);

    const report: DataQualityReport = {
      id: `quality-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tableId: table.id,
      timestamp: new Date(),
      totalRecords: records.length,
      qualityScore,
      issues,
      recommendations
    };

    // Save report
    this.saveQualityReport(report);

    return report;
  }

  /**
   * Create data transformation
   */
  static createTransformation(name: string, description: string, type: string, rules: TransformationRule[]): DataTransformation {
    const transformation: DataTransformation = {
      id: `transform-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      type: type as any,
      rules,
      enabled: true,
      createdAt: new Date()
    };

    // Save transformation
    this.saveTransformation(transformation);

    return transformation;
  }

  /**
   * Apply data transformation
   */
  static applyTransformation(records: DatabaseRecord[], transformation: DataTransformation): DatabaseRecord[] {
    if (!transformation.enabled) return records;

    return records.map(record => {
      const transformedData = { ...record.data };

      transformation.rules.forEach(rule => {
        if (transformedData[rule.field] !== undefined) {
          transformedData[rule.field] = this.applyTransformationRule(
            transformedData[rule.field],
            rule
          );
        }
      });

      return {
        ...record,
        data: transformedData
      };
    });
  }

  /**
   * Import data from CSV
   */
  static importFromCSV(csvContent: string, table: Table, mapping: FieldMapping[]): DataImportResult {
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const dataRows = lines.slice(1);

    const importedRecords: DatabaseRecord[] = [];
    const errors: ImportError[] = [];
    let skippedRows = 0;

    dataRows.forEach((row, index) => {
      const values = row.split(',').map(v => v.trim().replace(/"/g, ''));
      const recordData: Record<string, any> = {};

      try {
        mapping.forEach(map => {
          const sourceIndex = headers.indexOf(map.sourceField);
          if (sourceIndex >= 0 && values[sourceIndex] !== undefined) {
            let value = values[sourceIndex];

            // Apply transformation if specified
            if (map.transformation) {
              value = this.applyTransformationRule(value, map.transformation);
            }

            // Validate required fields
            if (map.required && (!value || value === '')) {
              errors.push({
                row: index + 2, // +2 because we skip header and 0-indexed
                column: map.targetField,
                value,
                error: 'Required field is empty',
                severity: 'error'
              });
              return;
            }

            recordData[map.targetField] = value;
          }
        });

        if (errors.length === 0 || errors.filter(e => e.row === index + 2 && e.severity === 'error').length === 0) {
          importedRecords.push({
            id: `record-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            tableId: table.id,
            data: recordData
          });
        } else {
          skippedRows++;
        }
      } catch (error) {
        errors.push({
          row: index + 2,
          column: 'general',
          value: row,
          error: `Import error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error'
        });
        skippedRows++;
      }
    });

    const result: DataImportResult = {
      id: `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      filename: 'imported_data.csv',
      totalRows: dataRows.length,
      importedRows: importedRecords.length,
      skippedRows,
      errors,
      mapping,
      timestamp: new Date()
    };

    // Save import result
    this.saveImportResult(result);

    return result;
  }

  /**
   * Export data to various formats
   */
  static exportData(records: DatabaseRecord[], config: DataExportConfig): string {
    let result = '';

    switch (config.format) {
      case 'csv':
        result = this.exportToCSV(records, config);
        break;
      case 'json':
        result = this.exportToJSON(records, config);
        break;
      case 'xml':
        result = this.exportToXML(records, config);
        break;
      default:
        result = this.exportToCSV(records, config);
    }

    return result;
  }

  /**
   * Log data audit trail
   */
  static logAuditEvent(
    tableId: string,
    recordId: string,
    action: string,
    userId: string,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>
  ): DataAuditLog {
    const auditLog: DataAuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tableId,
      recordId,
      action: action as any,
      userId,
      timestamp: new Date(),
      oldValues,
      newValues,
      ipAddress: '127.0.0.1', // Mock IP
      userAgent: navigator.userAgent
    };

    // Save audit log
    this.saveAuditLog(auditLog);

    return auditLog;
  }

  /**
   * Get data quality reports
   */
  static getQualityReports(): DataQualityReport[] {
    return this.getStoredQualityReports();
  }

  /**
   * Get data transformations
   */
  static getTransformations(): DataTransformation[] {
    return this.getStoredTransformations();
  }

  /**
   * Get import results
   */
  static getImportResults(): DataImportResult[] {
    return this.getStoredImportResults();
  }

  /**
   * Get export configurations
   */
  static getExportConfigs(): DataExportConfig[] {
    return this.getStoredExportConfigs();
  }

  /**
   * Get audit logs
   */
  static getAuditLogs(tableId?: string): DataAuditLog[] {
    const logs = this.getStoredAuditLogs();
    return tableId ? logs.filter(log => log.tableId === tableId) : logs;
  }

  // Private helper methods
  private static findDuplicates(records: DatabaseRecord[], keyColumns: Column[]): DatabaseRecord[][] {
    const groups: Record<string, DatabaseRecord[]> = {};

    records.forEach(record => {
      const key = keyColumns.map(col => record.data[col.name]).join('|');
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(record);
    });

    return Object.values(groups);
  }

  private static isValidDataType(value: any, type: string): boolean {
    switch (type.toUpperCase()) {
      case 'INTEGER':
        return Number.isInteger(Number(value));
      case 'REAL':
      case 'FLOAT':
        return !isNaN(Number(value));
      case 'TEXT':
      case 'VARCHAR':
        return typeof value === 'string';
      case 'BOOLEAN':
        return typeof value === 'boolean' || value === 'true' || value === 'false' || value === '1' || value === '0';
      case 'DATETIME':
        return !isNaN(Date.parse(value));
      default:
        return true;
    }
  }

  private static isNumericType(type: string): boolean {
    const numericTypes = ['INTEGER', 'REAL', 'FLOAT', 'NUMERIC', 'DECIMAL'];
    return numericTypes.includes(type.toUpperCase());
  }

  private static detectOutliers(values: number[]): number[] {
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    return values.filter(v => v < lowerBound || v > upperBound);
  }

  private static calculateMean(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private static calculateStdDev(values: number[]): number {
    const mean = this.calculateMean(values);
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private static generateQualityRecommendations(issues: DataQualityIssue[]): string[] {
    const recommendations: string[] = [];

    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const highIssues = issues.filter(i => i.severity === 'high');

    if (criticalIssues.length > 0) {
      recommendations.push('Address critical data quality issues immediately');
    }

    if (highIssues.length > 0) {
      recommendations.push('Review and fix high-priority data quality issues');
    }

    const duplicateIssues = issues.filter(i => i.type === 'duplicate');
    if (duplicateIssues.length > 0) {
      recommendations.push('Implement duplicate detection and prevention measures');
    }

    const missingIssues = issues.filter(i => i.type === 'missing');
    if (missingIssues.length > 0) {
      recommendations.push('Add data validation rules for required fields');
    }

    const invalidIssues = issues.filter(i => i.type === 'invalid');
    if (invalidIssues.length > 0) {
      recommendations.push('Implement data type validation at input level');
    }

    return recommendations;
  }

  private static applyTransformationRule(value: any, rule: TransformationRule): any {
    switch (rule.operation) {
      case 'trim':
        return typeof value === 'string' ? value.trim() : value;
      case 'uppercase':
        return typeof value === 'string' ? value.toUpperCase() : value;
      case 'lowercase':
        return typeof value === 'string' ? value.toLowerCase() : value;
      case 'replace':
        return typeof value === 'string' ? 
          value.replace(new RegExp(rule.parameters.pattern, 'g'), rule.parameters.replacement) : value;
      case 'format':
        return this.formatValue(value, rule.parameters.format);
      case 'validate':
        return this.validateValue(value, rule.parameters.rules);
      case 'calculate':
        return this.calculateValue(value, rule.parameters.expression);
      default:
        return value;
    }
  }

  private static formatValue(value: any, format: string): any {
    // Simple formatting implementation
    if (format === 'date' && typeof value === 'string') {
      return new Date(value).toISOString().split('T')[0];
    }
    if (format === 'currency' && typeof value === 'number') {
      return `$${value.toFixed(2)}`;
    }
    return value;
  }

  private static validateValue(value: any, rules: any): any {
    // Simple validation implementation
    if (rules.required && (!value || value === '')) {
      throw new Error('Value is required');
    }
    if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
      throw new Error(`Value must be at least ${rules.minLength} characters`);
    }
    return value;
  }

  private static calculateValue(value: any, expression: string): any {
    // Simple calculation implementation
    try {
      // This is a simplified implementation - in production, use a proper expression parser
      return eval(expression.replace('value', value));
    } catch {
      return value;
    }
  }

  private static exportToCSV(records: DatabaseRecord[], config: DataExportConfig): string {
    const delimiter = config.delimiter || ',';
    let csv = '';

    if (config.includeHeaders) {
      csv += config.columns.join(delimiter) + '\n';
    }

    records.forEach(record => {
      const row = config.columns.map(col => {
        const value = record.data[col];
        return typeof value === 'string' && value.includes(delimiter) ? `"${value}"` : value;
      });
      csv += row.join(delimiter) + '\n';
    });

    return csv;
  }

  private static exportToJSON(records: DatabaseRecord[], config: DataExportConfig): string {
    const filteredRecords = records.map(record => {
      const filteredData: Record<string, any> = {};
      config.columns.forEach(col => {
        filteredData[col] = record.data[col];
      });
      return filteredData;
    });

    return JSON.stringify(filteredRecords, null, 2);
  }

  private static exportToXML(records: DatabaseRecord[], config: DataExportConfig): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<records>\n';

    records.forEach(record => {
      xml += '  <record>\n';
      config.columns.forEach(col => {
        const value = record.data[col];
        xml += `    <${col}>${value}</${col}>\n`;
      });
      xml += '  </record>\n';
    });

    xml += '</records>';
    return xml;
  }

  // Storage methods
  private static saveQualityReport(report: DataQualityReport): void {
    const existing = this.getStoredQualityReports();
    existing.push(report);
    localStorage.setItem(this.QUALITY_REPORTS_KEY, JSON.stringify(existing));
  }

  private static saveTransformation(transformation: DataTransformation): void {
    const existing = this.getStoredTransformations();
    existing.push(transformation);
    localStorage.setItem(this.TRANSFORMATIONS_KEY, JSON.stringify(existing));
  }

  private static saveImportResult(result: DataImportResult): void {
    const existing = this.getStoredImportResults();
    existing.push(result);
    localStorage.setItem(this.IMPORT_RESULTS_KEY, JSON.stringify(existing));
  }

  private static saveAuditLog(log: DataAuditLog): void {
    const existing = this.getStoredAuditLogs();
    existing.push(log);
    localStorage.setItem(this.AUDIT_LOGS_KEY, JSON.stringify(existing));
  }

  private static getStoredQualityReports(): DataQualityReport[] {
    try {
      const stored = localStorage.getItem(this.QUALITY_REPORTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private static getStoredTransformations(): DataTransformation[] {
    try {
      const stored = localStorage.getItem(this.TRANSFORMATIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private static getStoredImportResults(): DataImportResult[] {
    try {
      const stored = localStorage.getItem(this.IMPORT_RESULTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private static getStoredExportConfigs(): DataExportConfig[] {
    try {
      const stored = localStorage.getItem(this.EXPORT_CONFIGS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private static getStoredAuditLogs(): DataAuditLog[] {
    try {
      const stored = localStorage.getItem(this.AUDIT_LOGS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
}
