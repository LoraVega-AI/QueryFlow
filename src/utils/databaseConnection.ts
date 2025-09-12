// Database connection utilities for secure server-side database access
// Handles MySQL, PostgreSQL, and SQLite connections

import mysql from 'mysql2/promise';
import { Pool } from 'pg';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

export interface DatabaseCredentials {
  type: 'mysql' | 'postgresql' | 'sqlite';
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  filePath?: string; // For SQLite
}

export interface ConnectionResult {
  success: boolean;
  message: string;
  connectionId?: string;
  schema?: DatabaseSchema;
  error?: string;
}

export interface DatabaseSchema {
  tables: TableInfo[];
  version?: string;
}

export interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  rowCount?: number;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  defaultValue?: any;
}

export interface QueryResult {
  success: boolean;
  data?: any[];
  columns?: string[];
  rowCount?: number;
  executionTime?: number;
  error?: string;
}

// In-memory storage for active connections (in production, use Redis or similar)
const activeConnections = new Map<string, any>();

export class DatabaseConnectionManager {
  private static instance: DatabaseConnectionManager;
  private connections = new Map<string, any>();

  static getInstance(): DatabaseConnectionManager {
    if (!DatabaseConnectionManager.instance) {
      DatabaseConnectionManager.instance = new DatabaseConnectionManager();
    }
    return DatabaseConnectionManager.instance;
  }

  // Test database connection
  async testConnection(credentials: DatabaseCredentials): Promise<ConnectionResult> {
    try {
      const connectionId = this.generateConnectionId();

      switch (credentials.type) {
        case 'mysql':
          return await this.testMySQLConnection(credentials, connectionId);
        case 'postgresql':
          return await this.testPostgreSQLConnection(credentials, connectionId);
        case 'sqlite':
          return await this.testSQLiteConnection(credentials, connectionId);
        default:
          return {
            success: false,
            message: 'Unsupported database type',
            error: `Database type '${credentials.type}' is not supported`
          };
      }
    } catch (error: any) {
      console.error('Database connection test failed:', error);
      return {
        success: false,
        message: 'Connection failed',
        error: error.message
      };
    }
  }

  // Test MySQL connection
  private async testMySQLConnection(credentials: DatabaseCredentials, connectionId: string): Promise<ConnectionResult> {
    try {
      const connection = await mysql.createConnection({
        host: credentials.host,
        port: credentials.port || 3306,
        user: credentials.username,
        password: credentials.password,
        database: credentials.database,
        connectTimeout: 5000,
      });

      // Test the connection
      await connection.execute('SELECT 1');

      // Store connection
      this.connections.set(connectionId, connection);

      return {
        success: true,
        message: 'MySQL connection successful',
        connectionId
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'MySQL connection failed',
        error: error.message
      };
    }
  }

  // Test PostgreSQL connection
  private async testPostgreSQLConnection(credentials: DatabaseCredentials, connectionId: string): Promise<ConnectionResult> {
    try {
      const pool = new Pool({
        host: credentials.host,
        port: credentials.port || 5432,
        user: credentials.username,
        password: credentials.password,
        database: credentials.database,
        connectionTimeoutMillis: 5000,
        query_timeout: 10000,
      });

      // Test the connection
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();

      // Store connection pool
      this.connections.set(connectionId, pool);

      return {
        success: true,
        message: 'PostgreSQL connection successful',
        connectionId
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'PostgreSQL connection failed',
        error: error.message
      };
    }
  }

  // Test SQLite connection
  private async testSQLiteConnection(credentials: DatabaseCredentials, connectionId: string): Promise<ConnectionResult> {
    try {
      const db = await open({
        filename: credentials.filePath || ':memory:',
        driver: sqlite3.Database
      });

      // Test the connection
      await db.get('SELECT 1');

      // Store connection
      this.connections.set(connectionId, db);

      return {
        success: true,
        message: 'SQLite connection successful',
        connectionId
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'SQLite connection failed',
        error: error.message
      };
    }
  }

  // Fetch database schema
  async fetchSchema(connectionId: string): Promise<DatabaseSchema | null> {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) {
        throw new Error('Connection not found');
      }

      // Determine connection type and fetch schema accordingly
      if (connection.constructor.name === 'Connection') {
        // MySQL connection
        return await this.fetchMySQLSchema(connection);
      } else if (connection.constructor.name === 'Pool') {
        // PostgreSQL pool
        return await this.fetchPostgreSQLSchema(connection);
      } else if (connection.constructor.name === 'Database') {
        // SQLite database
        return await this.fetchSQLiteSchema(connection);
      }

      throw new Error('Unknown connection type');
    } catch (error: any) {
      console.error('Schema fetch failed:', error);
      return null;
    }
  }

  private async fetchMySQLSchema(connection: any): Promise<DatabaseSchema> {
    // Get all tables
    const [tables] = await connection.execute(
      'SHOW TABLES'
    );

    const tableNames = tables.map((row: any) => Object.values(row)[0]);

    const schemaTables: TableInfo[] = [];

    for (const tableName of tableNames) {
      // Get table columns
      const [columns] = await connection.execute(
        'DESCRIBE ??',
        [tableName]
      );

      const tableColumns: ColumnInfo[] = columns.map((col: any) => ({
        name: col.Field,
        type: col.Type,
        nullable: col.Null === 'YES',
        primaryKey: col.Key === 'PRI',
        defaultValue: col.Default
      }));

      // Get row count
      const [countResult] = await connection.execute(
        'SELECT COUNT(*) as count FROM ??',
        [tableName]
      );

      schemaTables.push({
        name: tableName,
        columns: tableColumns,
        rowCount: countResult[0].count
      });
    }

    return { tables: schemaTables };
  }

  private async fetchPostgreSQLSchema(connection: any): Promise<DatabaseSchema> {
    const client = await connection.connect();

    try {
      // Get all tables in public schema
      const tablesResult = await client.query(`
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
      `);

      const tableNames = tablesResult.rows.map((row: any) => row.tablename);
      const schemaTables: TableInfo[] = [];

      for (const tableName of tableNames) {
        // Get table columns
        const columnsResult = await client.query(`
          SELECT
            column_name,
            data_type,
            is_nullable,
            column_default,
            CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary
          FROM information_schema.columns c
          LEFT JOIN (
            SELECT ku.column_name
            FROM information_schema.table_constraints AS tc
            INNER JOIN information_schema.key_column_usage AS ku
            ON tc.constraint_type = 'PRIMARY KEY'
            AND tc.constraint_name = ku.constraint_name
            WHERE tc.table_name = $1
          ) pk ON c.column_name = pk.column_name
          WHERE c.table_name = $1
          ORDER BY c.ordinal_position
        `, [tableName]);

        const tableColumns: ColumnInfo[] = columnsResult.rows.map((col: any) => ({
          name: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === 'YES',
          primaryKey: col.is_primary,
          defaultValue: col.column_default
        }));

        // Get row count
        const countResult = await client.query(
          'SELECT COUNT(*) as count FROM ??',
          [tableName]
        );

        schemaTables.push({
          name: tableName,
          columns: tableColumns,
          rowCount: parseInt((countResult.rows[0] as any).count)
        });
      }

      return { tables: schemaTables };
    } finally {
      client.release();
    }
  }

  private async fetchSQLiteSchema(connection: any): Promise<DatabaseSchema> {
    // Get all tables
    const tables = await connection.all(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `);

    const schemaTables: TableInfo[] = [];

    for (const table of tables) {
      // Get table columns
      const columns = await connection.all(`PRAGMA table_info(${table.name})`);

      const tableColumns: ColumnInfo[] = columns.map((col: any) => ({
        name: col.name,
        type: col.type,
        nullable: !col.notnull,
        primaryKey: col.pk === 1,
        defaultValue: col.dflt_value
      }));

      // Get row count
      const countResult = await connection.get(
        `SELECT COUNT(*) as count FROM ${table.name}`
      );

      schemaTables.push({
        name: table.name,
        columns: tableColumns,
        rowCount: countResult.count
      });
    }

    return { tables: schemaTables };
  }

  // Execute query
  async executeQuery(connectionId: string, sql: string): Promise<QueryResult> {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) {
        throw new Error('Connection not found');
      }

      const startTime = Date.now();

      // Only allow SELECT queries for security
      if (!sql.trim().toUpperCase().startsWith('SELECT')) {
        throw new Error('Only SELECT queries are allowed');
      }

      let result;

      if (connection.constructor.name === 'Connection') {
        // MySQL connection
        [result] = await connection.execute(sql);
      } else if (connection.constructor.name === 'Pool') {
        // PostgreSQL pool
        const client = await connection.connect();
        try {
          result = await client.query(sql);
          result = result.rows;
        } finally {
          client.release();
        }
      } else if (connection.constructor.name === 'Database') {
        // SQLite database
        result = await connection.all(sql);
      }

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        data: result,
        rowCount: result.length,
        executionTime
      };
    } catch (error: any) {
      console.error('Query execution failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Close connection
  async closeConnection(connectionId: string): Promise<boolean> {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) return false;

      if (connection.constructor.name === 'Connection') {
        // MySQL connection
        await connection.end();
      } else if (connection.constructor.name === 'Pool') {
        // PostgreSQL pool
        await connection.end();
      } else if (connection.constructor.name === 'Database') {
        // SQLite database
        await connection.close();
      }

      this.connections.delete(connectionId);
      return true;
    } catch (error) {
      console.error('Failed to close connection:', error);
      return false;
    }
  }

  // Generate unique connection ID
  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get connection info (for debugging)
  getConnectionInfo(connectionId: string): any {
    const connection = this.connections.get(connectionId);
    return connection ? { type: connection.constructor.name } : null;
  }

  // Cleanup all connections
  async cleanup(): Promise<void> {
    for (const [connectionId, connection] of this.connections.entries()) {
      try {
        if (connection.constructor.name === 'Connection') {
          await connection.end();
        } else if (connection.constructor.name === 'Pool') {
          await connection.end();
        } else if (connection.constructor.name === 'Database') {
          await connection.close();
        }
      } catch (error) {
        console.error(`Failed to close connection ${connectionId}:`, error);
      }
    }
    this.connections.clear();
  }
}

// Export singleton instance
export const dbConnectionManager = DatabaseConnectionManager.getInstance();
