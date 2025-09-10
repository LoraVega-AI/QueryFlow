// Database utility functions for SQLite-WASM operations
// This module handles SQL query execution and database schema management

import { DatabaseSchema, Table, Column, QueryResult, QueryError, DataType } from '@/types/database';

export class DatabaseManager {
  private db: any = null;
  private isInitialized = false;
  private schema: DatabaseSchema | null = null;

  // Initialize SQLite database
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('Starting SQLite initialization...');
      
      // Dynamic import for client-side only
      const initSqlJs = (await import('sql.js')).default;
      console.log('SQL.js module loaded successfully');
      
      const SQL = await initSqlJs({
        // Use CDN for WASM file to ensure it loads properly
        locateFile: file => `https://sql.js.org/dist/${file}`
      });
      console.log('SQL.js WASM initialized successfully');
      
      this.db = new SQL.Database();
      this.isInitialized = true;
      console.log('SQLite database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SQLite:', error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error(`Failed to initialize database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Set schema for type conversion
  setSchema(schema: DatabaseSchema): void {
    this.schema = schema;
  }

  // Create tables from schema
  async createTablesFromSchema(schema: DatabaseSchema): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Store schema for type conversion
    this.schema = schema;

    try {
      // Clear existing tables
      this.db.exec('DROP TABLE IF EXISTS sqlite_sequence');
      
      // Create tables if any exist
      if (schema.tables && schema.tables.length > 0) {
        for (const table of schema.tables) {
          const createTableSQL = this.generateCreateTableSQL(table);
          console.log('Creating table:', createTableSQL);
          this.db.exec(createTableSQL);
        }
        console.log(`Created ${schema.tables.length} tables successfully`);
      } else {
        console.log('No tables to create in schema');
      }
    } catch (error) {
      console.error('Failed to create tables:', error);
      throw error;
    }
  }

  // Generate CREATE TABLE SQL from Table object
  private generateCreateTableSQL(table: Table): string {
    const columns = table.columns.map(col => {
      let columnDef = `"${col.name}" ${this.mapDataTypeToSQLite(col.type)}`;
      
      if (col.primaryKey) {
        columnDef += ' PRIMARY KEY';
      }
      
      if (!col.nullable && !col.primaryKey) {
        columnDef += ' NOT NULL';
      }
      
      if (col.defaultValue) {
        columnDef += ` DEFAULT ${col.defaultValue}`;
      }
      
      return columnDef;
    }).join(', ');

    return `CREATE TABLE IF NOT EXISTS "${table.name}" (${columns})`;
  }

  // Map our DataType to SQLite types
  private mapDataTypeToSQLite(type: DataType): string {
    const typeMap: Record<DataType, string> = {
      // Basic SQLite types
      'TEXT': 'TEXT',
      'INTEGER': 'INTEGER',
      'REAL': 'REAL',
      'BLOB': 'BLOB',
      'BOOLEAN': 'INTEGER', // SQLite doesn't have native boolean
      'DATE': 'TEXT',
      'DATETIME': 'TEXT',
      // Advanced numeric types - SQLite has limited numeric types
      'BIGINT': 'INTEGER',
      'DECIMAL': 'REAL',
      'NUMERIC': 'REAL',
      'FLOAT': 'REAL',
      'DOUBLE': 'REAL',
      'SMALLINT': 'INTEGER',
      'TINYINT': 'INTEGER',
      'MONEY': 'REAL',
      // String types - SQLite uses TEXT for all string types
      'CHAR': 'TEXT',
      'VARCHAR': 'TEXT',
      'NCHAR': 'TEXT',
      'NVARCHAR': 'TEXT',
      'ENUM': 'TEXT',
      'SET': 'TEXT',
      // Date/Time types - SQLite stores as TEXT
      'TIMESTAMP': 'TEXT',
      'INTERVAL': 'TEXT',
      'TIME': 'TEXT',
      'YEAR': 'TEXT',
      // Structured data types
      'JSON': 'TEXT',
      'JSONB': 'TEXT',
      'XML': 'TEXT',
      'BINARY': 'BLOB',
      'VARBINARY': 'BLOB',
      // Unique identifier
      'UUID': 'TEXT',
      'GUID': 'TEXT',
      // Array types - stored as JSON text
      'ARRAY': 'TEXT',
      'TEXT_ARRAY': 'TEXT',
      'INTEGER_ARRAY': 'TEXT',
      'JSON_ARRAY': 'TEXT',
      // Spatial/Geographic types - stored as WKT/WKB text/blob
      'GEOMETRY': 'TEXT',
      'POINT': 'TEXT',
      'POLYGON': 'TEXT',
      'LINESTRING': 'TEXT',
      'MULTIPOINT': 'TEXT',
      'MULTIPOLYGON': 'TEXT',
      'MULTILINESTRING': 'TEXT',
      'GEOMETRYCOLLECTION': 'TEXT',
      // Network types - stored as text
      'INET': 'TEXT',
      'CIDR': 'TEXT',
      'MACADDR': 'TEXT',
      // Full-text search - SQLite FTS extension
      'TSVECTOR': 'TEXT',
      'TSQUERY': 'TEXT',
      // Custom/User-defined
      'CUSTOM': 'TEXT',
    };
    return typeMap[type] || 'TEXT';
  }

  // Execute SQL query
  async executeQuery(sql: string): Promise<QueryResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const startTime = performance.now();
    
    try {
      console.log('Executing query:', sql);
      const result = this.db.exec(sql);
      const endTime = performance.now();
      
      console.log('Query result:', result);
      
      if (result.length === 0) {
        return {
          columns: [],
          rows: [],
          rowCount: 0,
          executionTime: endTime - startTime,
        };
      }

      const firstResult = result[0];
      return {
        columns: firstResult.columns,
        rows: firstResult.values,
        rowCount: firstResult.values.length,
        executionTime: endTime - startTime,
      };
    } catch (error: any) {
      const endTime = performance.now();
      console.error('Query execution failed:', error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      const queryError: QueryError = {
        message: error instanceof Error ? error.message : String(error),
        line: error.line,
        column: error.column,
        executionTime: endTime - startTime,
      };
      
      throw queryError;
    }
  }

  // Insert record into table with proper type conversion
  async insertRecord(tableName: string, data: Record<string, any>): Promise<void> {
    // Get table schema to convert values properly
    const tableSchema = this.schema?.tables.find(t => t.name === tableName);
    if (!tableSchema) {
      throw new Error(`Table ${tableName} not found in schema`);
    }

    const columns = Object.keys(data);
    const convertedValues = columns.map(columnName => {
      const column = tableSchema.columns.find(c => c.name === columnName);
      const value = data[columnName];
      
      // Check for NOT NULL constraint violations
      if ((value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) && column?.nullable === false) {
        // For NOT NULL columns, use default value or throw error
        if (column.defaultValue) {
          console.log(`Using default value for NOT NULL column ${columnName}:`, column.defaultValue);
          return this.convertValueForColumn(column.defaultValue, column.type, column);
        } else {
          // Generate appropriate default value based on column type
          const defaultValue = this.generateDefaultValue(column);
          console.log(`Generating default value for NOT NULL column ${columnName}:`, defaultValue);
          return this.convertValueForColumn(defaultValue, column.type, column);
        }
      }
      
      if (value === null || value === undefined) {
        return null;
      }
      
      const convertedValue = this.convertValueForColumn(value, column?.type || 'TEXT', column);
      
      // Debug logging for type conversion
      console.log(`Converting ${columnName}:`, {
        originalValue: value,
        originalType: typeof value,
        columnType: column?.type || 'TEXT',
        convertedValue: convertedValue,
        convertedType: typeof convertedValue,
        isNullable: column?.nullable
      });
      
      return convertedValue;
    });
    
    const placeholders = convertedValues.map(() => '?').join(', ');
    const sql = `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`;
    
    try {
      this.db.run(sql, convertedValues);
    } catch (error) {
      console.error('Failed to insert record:', error);
      console.error('SQL:', sql);
      console.error('Values:', convertedValues);
      console.error('Original data:', data);
      console.error('Table schema:', tableSchema);
      
      // Provide more helpful error message
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('datatype mismatch')) {
        throw new Error(`Data type mismatch when inserting into ${tableName}. Please check that the data types match the column definitions. Original error: ${errorMessage}`);
      }
      throw error;
    }
  }

  // Update record in table with proper type conversion
  async updateRecord(tableName: string, data: Record<string, any>, whereClause: string): Promise<void> {
    // Get table schema to convert values properly
    const tableSchema = this.schema?.tables.find(t => t.name === tableName);
    if (!tableSchema) {
      throw new Error(`Table ${tableName} not found in schema`);
    }

    const columns = Object.keys(data);
    const convertedValues = columns.map(columnName => {
      const column = tableSchema.columns.find(c => c.name === columnName);
      const value = data[columnName];
      
      // Check for NOT NULL constraint violations
      if ((value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) && column?.nullable === false) {
        // For NOT NULL columns, use default value or throw error
        if (column.defaultValue) {
          console.log(`Using default value for NOT NULL column ${columnName}:`, column.defaultValue);
          return this.convertValueForColumn(column.defaultValue, column.type, column);
        } else {
          // Generate appropriate default value based on column type
          const defaultValue = this.generateDefaultValue(column);
          console.log(`Generating default value for NOT NULL column ${columnName}:`, defaultValue);
          return this.convertValueForColumn(defaultValue, column.type, column);
        }
      }
      
      if (value === null || value === undefined) {
        return null;
      }
      
      return this.convertValueForColumn(value, column?.type || 'TEXT', column);
    });
    
    const setClause = columns
      .map(key => `"${key}" = ?`)
      .join(', ');
    
    const sql = `UPDATE "${tableName}" SET ${setClause} WHERE ${whereClause}`;
    
    try {
      this.db.run(sql, convertedValues);
    } catch (error) {
      console.error('Failed to update record:', error);
      console.error('SQL:', sql);
      console.error('Values:', convertedValues);
      console.error('Original data:', data);
      console.error('Table schema:', tableSchema);
      
      // Provide more helpful error message
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('datatype mismatch')) {
        throw new Error(`Data type mismatch when updating ${tableName}. Please check that the data types match the column definitions. Original error: ${errorMessage}`);
      }
      throw error;
    }
  }

  // Delete record from table
  async deleteRecord(tableName: string, whereClause: string): Promise<void> {
    const sql = `DELETE FROM "${tableName}" WHERE ${whereClause}`;
    
    try {
      this.db.run(sql);
    } catch (error) {
      console.error('Failed to delete record:', error);
      throw error;
    }
  }

  // Convert value to appropriate type for SQLite column
  private convertValueForColumn(value: any, columnType: string, column?: Column): any {
    if (value === null || value === undefined) {
      return null;
    }

    // Handle empty strings based on column nullability
    if (typeof value === 'string' && value.trim() === '') {
      // For nullable columns, return null for empty strings
      // For non-nullable columns, return empty string or default value
      if (column?.nullable === false) {
        // For non-nullable columns, return empty string or default value
        return column.defaultValue || '';
      }
      return null;
    }

    // Handle string values
    if (typeof value === 'string') {
      // For numeric types, try to convert string to number
      if (['INTEGER', 'BIGINT', 'SMALLINT', 'TINYINT', 'REAL', 'FLOAT', 'DOUBLE', 'DECIMAL', 'NUMERIC', 'MONEY'].includes(columnType)) {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          return columnType.includes('INT') ? Math.floor(numValue) : numValue;
        }
        // If conversion fails, return as string (SQLite will handle it)
        return value;
      }
      
      // For boolean types, convert string to boolean
      if (['BOOLEAN'].includes(columnType)) {
        const lowerValue = value.toLowerCase();
        if (['true', '1', 'yes', 'on'].includes(lowerValue)) {
          return 1;
        } else if (['false', '0', 'no', 'off'].includes(lowerValue)) {
          return 0;
        }
        return value; // Return as string if not a recognized boolean
      }
      
      // For date/time types, ensure proper format
      if (['DATE', 'DATETIME', 'TIMESTAMP'].includes(columnType)) {
        // If it's already a valid date string, return as is
        if (!isNaN(Date.parse(value))) {
          return value;
        }
        // Try to convert to ISO format
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          if (columnType === 'DATE') {
            return date.toISOString().split('T')[0];
          } else {
            return date.toISOString();
          }
        }
        return value; // Return as string if conversion fails
      }
      
      // For all other string types, return as string
      return value;
    }

    // Handle number values
    if (typeof value === 'number') {
      // For integer types, ensure it's an integer
      if (['INTEGER', 'BIGINT', 'SMALLINT', 'TINYINT'].includes(columnType)) {
        return Math.floor(value);
      }
      
      // For boolean types, convert number to boolean
      if (['BOOLEAN'].includes(columnType)) {
        return value ? 1 : 0;
      }
      
      // For all other numeric types, return as number
      return value;
    }

    // Handle boolean values
    if (typeof value === 'boolean') {
      if (['BOOLEAN'].includes(columnType)) {
        return value ? 1 : 0;
      }
      // For other types, convert to string
      return value.toString();
    }

    // Handle Date objects
    if (value instanceof Date) {
      if (['DATE', 'DATETIME', 'TIMESTAMP'].includes(columnType)) {
        if (columnType === 'DATE') {
          return value.toISOString().split('T')[0];
        } else {
          return value.toISOString();
        }
      }
      // For other types, convert to string
      return value.toISOString();
    }

    // For arrays and objects, convert to JSON string
    if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
      if (['TEXT', 'VARCHAR', 'CHAR', 'BLOB'].includes(columnType)) {
        return JSON.stringify(value);
      }
      return value.toString();
    }

    // For any other type, convert to string
    return value.toString();
  }

  // Generate appropriate default value for NOT NULL columns
  private generateDefaultValue(column: Column): any {
    const columnType = column.type;
    
    // For string types, return empty string
    if (['TEXT', 'VARCHAR', 'CHAR', 'NCHAR', 'NVARCHAR'].includes(columnType)) {
      return '';
    }
    
    // For numeric types, return 0
    if (['INTEGER', 'BIGINT', 'SMALLINT', 'TINYINT', 'REAL', 'FLOAT', 'DOUBLE', 'DECIMAL', 'NUMERIC', 'MONEY'].includes(columnType)) {
      return 0;
    }
    
    // For boolean types, return false
    if (['BOOLEAN'].includes(columnType)) {
      return false;
    }
    
    // For date/time types, return current timestamp
    if (['DATE', 'DATETIME', 'TIMESTAMP'].includes(columnType)) {
      return new Date().toISOString();
    }
    
    // For BLOB types, return empty string
    if (['BLOB'].includes(columnType)) {
      return '';
    }
    
    // For any other type, return empty string as fallback
    return '';
  }

  // Get all records from table
  async getAllRecords(tableName: string): Promise<QueryResult> {
    return this.executeQuery(`SELECT * FROM "${tableName}"`);
  }

  // Get table schema information
  async getTableSchema(tableName: string): Promise<QueryResult> {
    return this.executeQuery(`PRAGMA table_info("${tableName}")`);
  }

  // Close database connection
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
    }
  }
}

// Singleton instance
export const dbManager = new DatabaseManager();
