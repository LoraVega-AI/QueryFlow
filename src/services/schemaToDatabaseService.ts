// Schema to Database Service
// Converts extracted schemas into actual SQLite database files that can be queried

import { ExtractedSchema, Table, Column, ForeignKey, Index } from './sqlParser';
import { DatabaseSchema } from '@/types/database';
import { writeFile, mkdir, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { Database } from 'sqlite3';

export interface DatabaseCreationResult {
  success: boolean;
  databasePath: string;
  databaseName: string;
  tablesCreated: number;
  sampleDataInserted: boolean;
  error?: string;
}

export class SchemaToDatabaseService {
  private static instance: SchemaToDatabaseService;
  private sqlite3: any = null;

  private constructor() {
    // Initialize SQLite3
    try {
      this.sqlite3 = require('sqlite3').verbose();
    } catch (error) {
      console.warn('SQLite3 not available:', error);
    }
  }

  static getInstance(): SchemaToDatabaseService {
    if (!SchemaToDatabaseService.instance) {
      SchemaToDatabaseService.instance = new SchemaToDatabaseService();
    }
    return SchemaToDatabaseService.instance;
  }

  /**
   * Convert extracted schemas to actual SQLite database files
   */
  async convertSchemasToDatabases(
    schemas: ExtractedSchema[],
    projectId: string,
    projectName: string,
    uploadPath: string
  ): Promise<DatabaseCreationResult[]> {
    if (!this.sqlite3) {
      throw new Error('SQLite3 not available');
    }

    const results: DatabaseCreationResult[] = [];
    const databasesDir = join(uploadPath, 'databases');
    
    // Create databases directory
    await mkdir(databasesDir, { recursive: true });

    for (const schema of schemas) {
      try {
        console.log(`🔄 Converting schema "${schema.name}" to database...`);
        
        const result = await this.createDatabaseFromSchema(
          schema,
          projectId,
          projectName,
          databasesDir
        );
        
        results.push(result);
        console.log(`✅ Created database: ${result.databaseName}`);
      } catch (error) {
        console.error(`❌ Failed to create database for schema "${schema.name}":`, error);
        results.push({
          success: false,
          databasePath: '',
          databaseName: schema.name,
          tablesCreated: 0,
          sampleDataInserted: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  /**
   * Create a single database file from a schema
   */
  private async createDatabaseFromSchema(
    schema: ExtractedSchema,
    projectId: string,
    projectName: string,
    databasesDir: string
  ): Promise<DatabaseCreationResult> {
    const databaseName = this.sanitizeDatabaseName(schema.name);
    const databasePath = join(databasesDir, `${databaseName}.db`);

    return new Promise((resolve, reject) => {
      const db = new this.sqlite3.Database(databasePath, (err: any) => {
        if (err) {
          reject(new Error(`Failed to create database: ${err.message}`));
          return;
        }

        console.log(`📁 Created database file: ${databasePath}`);
        this.initializeDatabase(db, schema)
          .then(() => {
            db.close((closeErr: any) => {
              if (closeErr) {
                console.warn('Error closing database:', closeErr);
              }
              resolve({
                success: true,
                databasePath,
                databaseName,
                tablesCreated: schema.tables.length,
                sampleDataInserted: true
              });
            });
          })
          .catch((error) => {
            db.close();
            reject(error);
          });
      });
    });
  }

  /**
   * Initialize database with tables and sample data
   */
  private async initializeDatabase(db: any, schema: ExtractedSchema): Promise<void> {
    return new Promise((resolve, reject) => {
      db.serialize(async () => {
        try {
          // Create tables
          for (const table of schema.tables) {
            const createTableSQL = this.generateCreateTableSQL(table);
            console.log(`Creating table: ${table.name}`);
            
            await this.runQuery(db, createTableSQL);
            
            // Insert sample data
            await this.insertSampleData(db, table);
          }

          // Create indexes
          for (const index of schema.indexes || []) {
            const createIndexSQL = this.generateCreateIndexSQL(index);
            console.log(`Creating index: ${index.name}`);
            
            try {
              await this.runQuery(db, createIndexSQL);
            } catch (indexError) {
              console.warn(`Failed to create index ${index.name}:`, indexError);
            }
          }

          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Generate CREATE TABLE SQL from Table object
   */
  private generateCreateTableSQL(table: Table): string {
    const columns = table.columns.map(col => {
      let columnDef = `"${col.name}" ${this.mapDataType(col.type)}`;
      
      if (col.primaryKey) {
        columnDef += ' PRIMARY KEY';
      }
      
      if (col.autoIncrement) {
        columnDef += ' AUTOINCREMENT';
      }
      
      if (col.notNull && !col.primaryKey) {
        columnDef += ' NOT NULL';
      }
      
      if (col.unique && !col.primaryKey) {
        columnDef += ' UNIQUE';
      }
      
      if (col.defaultValue) {
        columnDef += ` DEFAULT ${col.defaultValue}`;
      }
      
      return columnDef;
    });

    // Add foreign key constraints
    const foreignKeys = table.foreignKeys || [];
    const fkConstraints = foreignKeys.map(fk => {
      const refTable = fk.referencedTable || fk.references?.table;
      const refColumn = fk.referencedColumn || fk.references?.column;
      
      if (refTable && refColumn) {
        return `FOREIGN KEY ("${fk.column}") REFERENCES "${refTable}" ("${refColumn}")`;
      }
      return null;
    }).filter(Boolean);

    const allConstraints = [...columns, ...fkConstraints];
    return `CREATE TABLE IF NOT EXISTS "${table.name}" (${allConstraints.join(', ')})`;
  }

  /**
   * Generate CREATE INDEX SQL from Index object
   */
  private generateCreateIndexSQL(index: Index): string {
    const columns = index.columns.join('", "');
    const unique = index.unique ? 'UNIQUE ' : '';
    return `CREATE ${unique}INDEX IF NOT EXISTS "${index.name}" ON "${index.table}" ("${columns}")`;
  }

  /**
   * Map data types to SQLite types
   */
  private mapDataType(type: string): string {
    const typeMap: { [key: string]: string } = {
      'INTEGER': 'INTEGER',
      'INT': 'INTEGER',
      'BIGINT': 'INTEGER',
      'SMALLINT': 'INTEGER',
      'TINYINT': 'INTEGER',
      'TEXT': 'TEXT',
      'VARCHAR': 'TEXT',
      'CHAR': 'TEXT',
      'STRING': 'TEXT',
      'REAL': 'REAL',
      'FLOAT': 'REAL',
      'DOUBLE': 'REAL',
      'DECIMAL': 'REAL',
      'NUMERIC': 'REAL',
      'BOOLEAN': 'INTEGER',
      'BOOL': 'INTEGER',
      'DATE': 'TEXT',
      'DATETIME': 'TEXT',
      'TIMESTAMP': 'TEXT',
      'TIME': 'TEXT',
      'BLOB': 'BLOB',
      'JSON': 'TEXT'
    };

    const upperType = type.toUpperCase();
    return typeMap[upperType] || 'TEXT';
  }

  /**
   * Insert sample data into a table
   */
  private async insertSampleData(db: any, table: Table): Promise<void> {
    const sampleData = this.generateSampleData(table);
    
    if (sampleData.length === 0) {
      return;
    }

    const columns = table.columns.map(col => col.name);
    const placeholders = columns.map(() => '?').join(', ');
    const insertSQL = `INSERT OR IGNORE INTO "${table.name}" ("${columns.join('", "')}") VALUES (${placeholders})`;

    for (const row of sampleData) {
      await this.runQuery(db, insertSQL, row);
    }

    console.log(`Inserted ${sampleData.length} sample rows into ${table.name}`);
  }

  /**
   * Generate sample data for a table
   */
  private generateSampleData(table: Table): any[][] {
    const sampleData: any[][] = [];
    const rowCount = Math.min(5, 10); // Generate 5-10 sample rows

    for (let i = 0; i < rowCount; i++) {
      const row: any[] = [];
      
      for (const column of table.columns) {
        if (column.primaryKey && column.autoIncrement) {
          // Skip auto-increment primary keys
          continue;
        }
        
        row.push(this.generateSampleValue(column, i));
      }
      
      sampleData.push(row);
    }

    return sampleData;
  }

  /**
   * Generate a sample value for a column
   */
  private generateSampleValue(column: Column, index: number): any {
    const type = column.type.toUpperCase();
    
    // Handle specific column names with realistic data
    const columnName = column.name.toLowerCase();
    
    if (columnName.includes('email')) {
      return `user${index + 1}@example.com`;
    }
    
    if (columnName.includes('username') || columnName.includes('name')) {
      return `user${index + 1}`;
    }
    
    if (columnName.includes('title')) {
      return `Sample Title ${index + 1}`;
    }
    
    if (columnName.includes('description') || columnName.includes('content')) {
      return `This is sample content for row ${index + 1}`;
    }
    
    if (columnName.includes('created_at') || columnName.includes('updated_at') || columnName.includes('date')) {
      return new Date().toISOString();
    }
    
    if (columnName.includes('id') && type.includes('INT')) {
      return index + 1;
    }
    
    // Type-based generation
    if (type.includes('INT')) {
      return Math.floor(Math.random() * 1000) + 1;
    }
    
    if (type.includes('TEXT') || type.includes('VARCHAR') || type.includes('CHAR')) {
      return `Sample text ${index + 1}`;
    }
    
    if (type.includes('REAL') || type.includes('FLOAT') || type.includes('DOUBLE')) {
      return Math.round((Math.random() * 100) * 100) / 100;
    }
    
    if (type.includes('BOOL')) {
      return Math.random() > 0.5 ? 1 : 0;
    }
    
    if (type.includes('DATE') || type.includes('TIME')) {
      return new Date().toISOString();
    }
    
    return `Sample ${index + 1}`;
  }

  /**
   * Run a SQL query with parameters
   */
  private runQuery(db: any, sql: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err: any) {
        if (err) {
          reject(new Error(`SQL Error: ${err.message}\nQuery: ${sql}`));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Sanitize database name for file system
   */
  private sanitizeDatabaseName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase();
  }

  /**
   * Create a database connection configuration for QueryFlow
   */
  createDatabaseConnection(
    databasePath: string,
    databaseName: string,
    projectId: string,
    projectName: string
  ): any {
    return {
      id: `db_${projectId}_${databaseName}_${Date.now()}`,
      name: databaseName,
      type: 'sqlite',
      connectionString: databasePath,
      database: databaseName,
      host: 'localhost',
      port: 0,
      username: '',
      password: '',
      isConnected: false,
      lastSync: new Date(),
      projectId,
      projectName,
      tables: [],
      status: 'ready'
    };
  }
}
