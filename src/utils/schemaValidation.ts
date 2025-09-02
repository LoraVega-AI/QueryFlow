// Schema validation utilities for QueryFlow
// This module provides comprehensive schema validation and relationship checking

import { DatabaseSchema, Table, Column, SchemaValidation, ValidationError, ValidationWarning } from '@/types/database';

export class SchemaValidator {
  /**
   * Validates a complete database schema
   */
  static validateSchema(schema: DatabaseSchema): SchemaValidation {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate schema structure
    this.validateSchemaStructure(schema, errors, warnings);
    
    // Validate tables
    schema.tables.forEach(table => {
      this.validateTable(table, schema, errors, warnings);
    });

    // Validate relationships
    this.validateRelationships(schema, errors, warnings);

    // Check for performance issues
    this.checkPerformanceIssues(schema, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates the overall schema structure
   */
  private static validateSchemaStructure(schema: DatabaseSchema, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!schema.name || schema.name.trim().length === 0) {
      errors.push({
        type: 'naming',
        message: 'Schema name is required',
        severity: 'error'
      });
    }

    if (schema.tables.length === 0) {
      warnings.push({
        type: 'best_practice',
        message: 'Schema has no tables',
        suggestion: 'Consider adding at least one table to your schema'
      });
    }

    // Check for duplicate table names
    const tableNames = schema.tables.map(t => t.name.toLowerCase());
    const duplicateNames = tableNames.filter((name, index) => tableNames.indexOf(name) !== index);
    
    if (duplicateNames.length > 0) {
      errors.push({
        type: 'naming',
        message: `Duplicate table names found: ${duplicateNames.join(', ')}`,
        severity: 'error'
      });
    }
  }

  /**
   * Validates individual table structure
   */
  private static validateTable(table: Table, schema: DatabaseSchema, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Validate table name
    if (!table.name || table.name.trim().length === 0) {
      errors.push({
        type: 'naming',
        message: 'Table name is required',
        tableId: table.id,
        severity: 'error'
      });
    }

    // Check table name conventions
    if (table.name && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table.name)) {
      warnings.push({
        type: 'naming',
        message: `Table name '${table.name}' should start with a letter or underscore and contain only alphanumeric characters and underscores`,
        tableId: table.id,
        suggestion: 'Use snake_case or camelCase naming convention'
      });
    }

    // Validate columns
    if (table.columns.length === 0) {
      errors.push({
        type: 'constraint',
        message: 'Table must have at least one column',
        tableId: table.id,
        severity: 'error'
      });
    }

    // Check for duplicate column names
    const columnNames = table.columns.map(c => c.name.toLowerCase());
    const duplicateColumns = columnNames.filter((name, index) => columnNames.indexOf(name) !== index);
    
    if (duplicateColumns.length > 0) {
      errors.push({
        type: 'naming',
        message: `Duplicate column names in table '${table.name}': ${duplicateColumns.join(', ')}`,
        tableId: table.id,
        severity: 'error'
      });
    }

    // Validate each column
    table.columns.forEach(column => {
      this.validateColumn(column, table, schema, errors, warnings);
    });

    // Check for primary key
    const primaryKeys = table.columns.filter(c => c.primaryKey);
    if (primaryKeys.length === 0) {
      warnings.push({
        type: 'best_practice',
        message: `Table '${table.name}' has no primary key`,
        tableId: table.id,
        suggestion: 'Consider adding a primary key for better data integrity'
      });
    } else if (primaryKeys.length > 1) {
      warnings.push({
        type: 'best_practice',
        message: `Table '${table.name}' has multiple primary keys`,
        tableId: table.id,
        suggestion: 'Consider using a composite primary key or separate unique constraints'
      });
    }
  }

  /**
   * Validates individual column structure
   */
  private static validateColumn(column: Column, table: Table, schema: DatabaseSchema, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Validate column name
    if (!column.name || column.name.trim().length === 0) {
      errors.push({
        type: 'naming',
        message: 'Column name is required',
        tableId: table.id,
        columnId: column.id,
        severity: 'error'
      });
    }

    // Check column name conventions
    if (column.name && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column.name)) {
      warnings.push({
        type: 'naming',
        message: `Column name '${column.name}' should start with a letter or underscore and contain only alphanumeric characters and underscores`,
        tableId: table.id,
        columnId: column.id,
        suggestion: 'Use snake_case or camelCase naming convention'
      });
    }

    // Validate data type
    if (!column.type) {
      errors.push({
        type: 'data_type',
        message: 'Column data type is required',
        tableId: table.id,
        columnId: column.id,
        severity: 'error'
      });
    }

    // Validate foreign key references
    if (column.foreignKey) {
      this.validateForeignKey(column, table, schema, errors, warnings);
    }

    // Check for nullable primary key
    if (column.primaryKey && column.nullable) {
      errors.push({
        type: 'constraint',
        message: 'Primary key columns cannot be nullable',
        tableId: table.id,
        columnId: column.id,
        severity: 'error'
      });
    }
  }

  /**
   * Validates foreign key relationships
   */
  private static validateForeignKey(column: Column, table: Table, schema: DatabaseSchema, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!column.foreignKey) return;

    const { tableId, columnId } = column.foreignKey;
    
    // Find referenced table
    const referencedTable = schema.tables.find(t => t.id === tableId);
    if (!referencedTable) {
      errors.push({
        type: 'relationship',
        message: `Foreign key references non-existent table (ID: ${tableId})`,
        tableId: table.id,
        columnId: column.id,
        severity: 'error'
      });
      return;
    }

    // Find referenced column
    const referencedColumn = referencedTable.columns.find(c => c.id === columnId);
    if (!referencedColumn) {
      errors.push({
        type: 'relationship',
        message: `Foreign key references non-existent column in table '${referencedTable.name}' (ID: ${columnId})`,
        tableId: table.id,
        columnId: column.id,
        severity: 'error'
      });
      return;
    }

    // Check if referenced column is a primary key
    if (!referencedColumn.primaryKey) {
      warnings.push({
        type: 'best_practice',
        message: `Foreign key references non-primary key column '${referencedColumn.name}' in table '${referencedTable.name}'`,
        tableId: table.id,
        columnId: column.id,
        suggestion: 'Foreign keys should typically reference primary keys'
      });
    }

    // Check data type compatibility
    if (column.type !== referencedColumn.type) {
      warnings.push({
        type: 'best_practice',
        message: `Data type mismatch: column '${column.name}' (${column.type}) references '${referencedColumn.name}' (${referencedColumn.type})`,
        tableId: table.id,
        columnId: column.id,
        suggestion: 'Foreign key columns should have the same data type as the referenced column'
      });
    }
  }

  /**
   * Validates all relationships in the schema
   */
  private static validateRelationships(schema: DatabaseSchema, errors: ValidationError[], warnings: ValidationWarning[]): void {
    const relationships = new Map<string, number>();

    schema.tables.forEach(table => {
      table.columns.forEach(column => {
        if (column.foreignKey) {
          const key = `${column.foreignKey.tableId}-${column.foreignKey.columnId}`;
          relationships.set(key, (relationships.get(key) || 0) + 1);
        }
      });
    });

    // Check for circular references
    this.checkCircularReferences(schema, errors, warnings);
  }

  /**
   * Checks for circular reference patterns
   */
  private static checkCircularReferences(schema: DatabaseSchema, errors: ValidationError[], warnings: ValidationWarning[]): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (tableId: string): boolean => {
      if (recursionStack.has(tableId)) {
        return true;
      }
      if (visited.has(tableId)) {
        return false;
      }

      visited.add(tableId);
      recursionStack.add(tableId);

      const table = schema.tables.find(t => t.id === tableId);
      if (table) {
        for (const column of table.columns) {
          if (column.foreignKey) {
            if (hasCycle(column.foreignKey.tableId)) {
              return true;
            }
          }
        }
      }

      recursionStack.delete(tableId);
      return false;
    };

    schema.tables.forEach(table => {
      if (hasCycle(table.id)) {
        warnings.push({
          type: 'best_practice',
          message: `Potential circular reference detected involving table '${table.name}'`,
          tableId: table.id,
          suggestion: 'Review foreign key relationships to avoid circular dependencies'
        });
      }
    });
  }

  /**
   * Checks for potential performance issues
   */
  private static checkPerformanceIssues(schema: DatabaseSchema, warnings: ValidationWarning[]): void {
    schema.tables.forEach(table => {
      // Check for tables with many columns
      if (table.columns.length > 20) {
        warnings.push({
          type: 'performance',
          message: `Table '${table.name}' has ${table.columns.length} columns, which may impact performance`,
          tableId: table.id,
          suggestion: 'Consider normalizing the table or splitting into related tables'
        });
      }

      // Check for tables without indexes (foreign keys)
      const foreignKeys = table.columns.filter(c => c.foreignKey);
      if (foreignKeys.length === 0 && table.columns.length > 5) {
        warnings.push({
          type: 'performance',
          message: `Table '${table.name}' has no foreign key relationships`,
          tableId: table.id,
          suggestion: 'Consider adding relationships to other tables for better data organization'
        });
      }

      // Check for potential missing indexes
      const textColumns = table.columns.filter(c => c.type === 'TEXT' && !c.primaryKey);
      if (textColumns.length > 3) {
        warnings.push({
          type: 'performance',
          message: `Table '${table.name}' has many TEXT columns without primary keys`,
          tableId: table.id,
          suggestion: 'Consider adding indexes on frequently queried TEXT columns'
        });
      }
    });
  }

  /**
   * Suggests performance optimizations
   */
  static suggestOptimizations(schema: DatabaseSchema): ValidationWarning[] {
    const suggestions: ValidationWarning[] = [];

    schema.tables.forEach(table => {
      // Suggest indexes for foreign keys
      const foreignKeyColumns = table.columns.filter(c => c.foreignKey);
      foreignKeyColumns.forEach(column => {
        suggestions.push({
          type: 'performance',
          message: `Consider adding an index on foreign key column '${column.name}'`,
          tableId: table.id,
          columnId: column.id,
          suggestion: 'Indexes on foreign keys improve join performance'
        });
      });

      // Suggest composite indexes for frequently queried combinations
      const primaryKeyColumns = table.columns.filter(c => c.primaryKey);
      if (primaryKeyColumns.length > 1) {
        suggestions.push({
          type: 'performance',
          message: `Table '${table.name}' has a composite primary key`,
          tableId: table.id,
          suggestion: 'Composite primary keys are automatically indexed, which is good for performance'
        });
      }
    });

    return suggestions;
  }
}
