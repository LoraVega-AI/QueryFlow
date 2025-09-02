// Bulk operations utilities for QueryFlow
// This module provides bulk insert, update, delete, and import/export functionality

import { BulkOperation, DatabaseRecord, DataValidationRule } from '@/types/database';
import { dbManager } from './database';

export class BulkOperationsManager {
  private static readonly OPERATIONS_KEY = 'queryflow_bulk_operations';
  private static readonly VALIDATION_RULES_KEY = 'queryflow_validation_rules';

  /**
   * Perform bulk insert operation
   */
  static async bulkInsert(
    tableId: string, 
    data: Record<string, any>[], 
    validationRules: DataValidationRule[] = []
  ): Promise<BulkOperation> {
    const operation: BulkOperation = {
      id: `bulk-insert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'insert',
      tableId,
      data,
      status: 'pending',
      progress: 0,
      errors: []
    };

    try {
      operation.status = 'processing';
      this.saveOperation(operation);

      // Validate data
      const validationErrors = this.validateBulkData(data, validationRules);
      if (validationErrors.length > 0) {
        operation.errors = validationErrors;
        operation.status = 'failed';
        this.saveOperation(operation);
        return operation;
      }

      // Perform bulk insert
      const batchSize = 100;
      const totalBatches = Math.ceil(data.length / batchSize);
      
      for (let i = 0; i < totalBatches; i++) {
        const batch = data.slice(i * batchSize, (i + 1) * batchSize);
        
        for (const record of batch) {
          try {
            const columns = Object.keys(record);
            const values = Object.values(record);
            const placeholders = values.map(() => '?').join(', ');
            
            // Replace placeholders with actual values
            const query = `INSERT INTO ${tableId} (${columns.join(', ')}) VALUES (${values.map(v => 
              v === null || v === undefined ? 'NULL' : 
              typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v
            ).join(', ')})`;
            await dbManager.executeQuery(query);
          } catch (error: any) {
            operation.errors.push(`Row ${i * batchSize + batch.indexOf(record) + 1}: ${error.message}`);
          }
        }
        
        operation.progress = Math.round(((i + 1) / totalBatches) * 100);
        this.saveOperation(operation);
      }

      operation.status = 'completed';
      this.saveOperation(operation);
    } catch (error: any) {
      operation.status = 'failed';
      operation.errors.push(error.message);
      this.saveOperation(operation);
    }

    return operation;
  }

  /**
   * Perform bulk update operation
   */
  static async bulkUpdate(
    tableId: string,
    data: Record<string, any>[],
    keyColumn: string,
    validationRules: DataValidationRule[] = []
  ): Promise<BulkOperation> {
    const operation: BulkOperation = {
      id: `bulk-update-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'update',
      tableId,
      data,
      status: 'pending',
      progress: 0,
      errors: []
    };

    try {
      operation.status = 'processing';
      this.saveOperation(operation);

      // Validate data
      const validationErrors = this.validateBulkData(data, validationRules);
      if (validationErrors.length > 0) {
        operation.errors = validationErrors;
        operation.status = 'failed';
        this.saveOperation(operation);
        return operation;
      }

      // Perform bulk update
      const batchSize = 100;
      const totalBatches = Math.ceil(data.length / batchSize);
      
      for (let i = 0; i < totalBatches; i++) {
        const batch = data.slice(i * batchSize, (i + 1) * batchSize);
        
        for (const record of batch) {
          try {
            const keyValue = record[keyColumn];
            if (!keyValue) {
              operation.errors.push(`Row ${i * batchSize + batch.indexOf(record) + 1}: Missing key value for column ${keyColumn}`);
              continue;
            }

            const updateColumns = Object.keys(record).filter(col => col !== keyColumn);
            const updateValues = updateColumns.map(col => record[col]);
            const setClause = updateColumns.map(col => `${col} = ?`).join(', ');
            
            const query = `UPDATE ${tableId} SET ${updateColumns.map((col, idx) => 
              `${col} = ${updateValues[idx] === null || updateValues[idx] === undefined ? 'NULL' : 
                typeof updateValues[idx] === 'string' ? `'${updateValues[idx].replace(/'/g, "''")}'` : updateValues[idx]}`
            ).join(', ')} WHERE ${keyColumn} = ${typeof keyValue === 'string' ? `'${keyValue.replace(/'/g, "''")}'` : keyValue}`;
            await dbManager.executeQuery(query);
          } catch (error: any) {
            operation.errors.push(`Row ${i * batchSize + batch.indexOf(record) + 1}: ${error.message}`);
          }
        }
        
        operation.progress = Math.round(((i + 1) / totalBatches) * 100);
        this.saveOperation(operation);
      }

      operation.status = 'completed';
      this.saveOperation(operation);
    } catch (error: any) {
      operation.status = 'failed';
      operation.errors.push(error.message);
      this.saveOperation(operation);
    }

    return operation;
  }

  /**
   * Perform bulk delete operation
   */
  static async bulkDelete(
    tableId: string,
    keyColumn: string,
    keyValues: any[]
  ): Promise<BulkOperation> {
    const operation: BulkOperation = {
      id: `bulk-delete-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'delete',
      tableId,
      data: keyValues.map(value => ({ [keyColumn]: value })),
      status: 'pending',
      progress: 0,
      errors: []
    };

    try {
      operation.status = 'processing';
      this.saveOperation(operation);

      // Perform bulk delete
      const batchSize = 100;
      const totalBatches = Math.ceil(keyValues.length / batchSize);
      
      for (let i = 0; i < totalBatches; i++) {
        const batch = keyValues.slice(i * batchSize, (i + 1) * batchSize);
        
        for (const keyValue of batch) {
          try {
            const query = `DELETE FROM ${tableId} WHERE ${keyColumn} = ${typeof keyValue === 'string' ? `'${keyValue.replace(/'/g, "''")}'` : keyValue}`;
            await dbManager.executeQuery(query);
          } catch (error: any) {
            operation.errors.push(`Key ${keyValue}: ${error.message}`);
          }
        }
        
        operation.progress = Math.round(((i + 1) / totalBatches) * 100);
        this.saveOperation(operation);
      }

      operation.status = 'completed';
      this.saveOperation(operation);
    } catch (error: any) {
      operation.status = 'failed';
      operation.errors.push(error.message);
      this.saveOperation(operation);
    }

    return operation;
  }

  /**
   * Import data from CSV
   */
  static parseCSV(csvContent: string, hasHeader: boolean = true): { headers: string[], data: Record<string, any>[] } {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      return { headers: [], data: [] };
    }

    const headers = hasHeader ? 
      lines[0].split(',').map(h => h.trim().replace(/"/g, '')) : 
      lines[0].split(',').map((_, i) => `column_${i + 1}`);

    const data: Record<string, any>[] = [];
    const startIndex = hasHeader ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const record: Record<string, any> = {};
      
      headers.forEach((header, index) => {
        record[header] = values[index] || '';
      });
      
      data.push(record);
    }

    return { headers, data };
  }

  /**
   * Export data to CSV
   */
  static exportToCSV(data: Record<string, any>[], headers?: string[]): string {
    if (data.length === 0) return '';

    const csvHeaders = headers || Object.keys(data[0]);
    const csvLines = [csvHeaders.join(',')];

    data.forEach(record => {
      const values = csvHeaders.map(header => {
        const value = record[header];
        // Escape commas and quotes in values
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      });
      csvLines.push(values.join(','));
    });

    return csvLines.join('\n');
  }

  /**
   * Export data to JSON
   */
  static exportToJSON(data: Record<string, any>[]): string {
    return JSON.stringify(data, null, 2);
  }

  /**
   * Export data to SQL INSERT statements
   */
  static exportToSQL(data: Record<string, any>[], tableName: string): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const sqlLines: string[] = [];

    data.forEach(record => {
      const values = headers.map(header => {
        const value = record[header];
        if (value === null || value === undefined) {
          return 'NULL';
        } else if (typeof value === 'string') {
          return `'${value.replace(/'/g, "''")}'`;
        } else {
          return value;
        }
      });
      
      sqlLines.push(`INSERT INTO ${tableName} (${headers.join(', ')}) VALUES (${values.join(', ')});`);
    });

    return sqlLines.join('\n');
  }

  /**
   * Validate bulk data against validation rules
   */
  private static validateBulkData(
    data: Record<string, any>[], 
    validationRules: DataValidationRule[]
  ): string[] {
    const errors: string[] = [];

    data.forEach((record, index) => {
      validationRules.forEach(rule => {
        if (rule.tableId && rule.columnId) {
          const value = record[rule.columnId];
          
          switch (rule.type) {
            case 'required':
              if (value === null || value === undefined || value === '') {
                errors.push(`Row ${index + 1}: ${rule.message}`);
              }
              break;
            case 'unique':
              // This would need to be checked against existing data
              break;
            case 'format':
              if (value && !new RegExp(rule.rule).test(value)) {
                errors.push(`Row ${index + 1}: ${rule.message}`);
              }
              break;
            case 'range':
              const numValue = Number(value);
              if (!isNaN(numValue)) {
                const [min, max] = rule.rule.split(',').map(Number);
                if (numValue < min || numValue > max) {
                  errors.push(`Row ${index + 1}: ${rule.message}`);
                }
              }
              break;
          }
        }
      });
    });

    return errors;
  }

  /**
   * Save operation to localStorage
   */
  private static saveOperation(operation: BulkOperation): void {
    try {
      const operations = this.getOperations();
      const existingIndex = operations.findIndex(op => op.id === operation.id);
      
      if (existingIndex >= 0) {
        operations[existingIndex] = operation;
      } else {
        operations.push(operation);
      }
      
      localStorage.setItem(this.OPERATIONS_KEY, JSON.stringify(operations));
    } catch (error) {
      console.error('Error saving bulk operation:', error);
    }
  }

  /**
   * Get all bulk operations
   */
  static getOperations(): BulkOperation[] {
    try {
      const stored = localStorage.getItem(this.OPERATIONS_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error loading bulk operations:', error);
      return [];
    }
  }

  /**
   * Get operation by ID
   */
  static getOperation(operationId: string): BulkOperation | undefined {
    return this.getOperations().find(op => op.id === operationId);
  }

  /**
   * Delete operation
   */
  static deleteOperation(operationId: string): void {
    const operations = this.getOperations();
    const filteredOperations = operations.filter(op => op.id !== operationId);
    localStorage.setItem(this.OPERATIONS_KEY, JSON.stringify(filteredOperations));
  }

  /**
   * Clear all operations
   */
  static clearOperations(): void {
    localStorage.removeItem(this.OPERATIONS_KEY);
  }

  /**
   * Save validation rules
   */
  static saveValidationRules(rules: DataValidationRule[]): void {
    localStorage.setItem(this.VALIDATION_RULES_KEY, JSON.stringify(rules));
  }

  /**
   * Get validation rules
   */
  static getValidationRules(): DataValidationRule[] {
    try {
      const stored = localStorage.getItem(this.VALIDATION_RULES_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error loading validation rules:', error);
      return [];
    }
  }

  /**
   * Get validation rules for a specific table
   */
  static getValidationRulesForTable(tableId: string): DataValidationRule[] {
    return this.getValidationRules().filter(rule => rule.tableId === tableId);
  }

  /**
   * Delete validation rule
   */
  static deleteValidationRule(ruleId: string): void {
    const rules = this.getValidationRules();
    const filteredRules = rules.filter(rule => rule.id !== ruleId);
    this.saveValidationRules(filteredRules);
  }
}
