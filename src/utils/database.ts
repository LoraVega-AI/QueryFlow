// Database utility functions for SQLite-WASM operations
// This module handles SQL query execution and database schema management

import { DatabaseSchema, Table, Column, QueryResult, QueryError, DataType } from '@/types/database';

export class DatabaseManager {
  private db: any = null;
  private isInitialized = false;

  // Initialize SQLite database
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Dynamic import for client-side only
      const initSqlJs = (await import('sql.js')).default;
      const SQL = await initSqlJs({
        // You can specify the path to wasm file here
        // locateFile: file => `https://sql.js.org/dist/${file}`
      });
      
      this.db = new SQL.Database();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize SQLite:', error);
      throw new Error('Failed to initialize database');
    }
  }

  // Create tables from schema
  async createTablesFromSchema(schema: DatabaseSchema): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Clear existing tables
      this.db.exec('DROP TABLE IF EXISTS sqlite_sequence');
      
      // Create tables
      for (const table of schema.tables) {
        const createTableSQL = this.generateCreateTableSQL(table);
        this.db.exec(createTableSQL);
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
      'TEXT': 'TEXT',
      'INTEGER': 'INTEGER',
      'REAL': 'REAL',
      'BLOB': 'BLOB',
      'BOOLEAN': 'INTEGER', // SQLite doesn't have native boolean
      'DATE': 'TEXT',
      'DATETIME': 'TEXT',
    };
    return typeMap[type] || 'TEXT';
  }

  // Execute SQL query
  async executeQuery(sql: string): Promise<QueryResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = performance.now();
    
    try {
      const result = this.db.exec(sql);
      const endTime = performance.now();
      
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
      throw {
        message: error.message,
        executionTime: endTime - startTime,
      } as QueryError;
    }
  }

  // Insert record into table
  async insertRecord(tableName: string, data: Record<string, any>): Promise<void> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map(() => '?').join(', ');
    
    const sql = `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`;
    
    try {
      this.db.run(sql, values);
    } catch (error) {
      console.error('Failed to insert record:', error);
      throw error;
    }
  }

  // Update record in table
  async updateRecord(tableName: string, data: Record<string, any>, whereClause: string): Promise<void> {
    const setClause = Object.keys(data)
      .map(key => `"${key}" = ?`)
      .join(', ');
    
    const values = Object.values(data);
    const sql = `UPDATE "${tableName}" SET ${setClause} WHERE ${whereClause}`;
    
    try {
      this.db.run(sql, values);
    } catch (error) {
      console.error('Failed to update record:', error);
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
