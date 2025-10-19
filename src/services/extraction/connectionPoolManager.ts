// Connection Pool Manager for Database Verification
// Manages connection pools for PostgreSQL, MySQL, and MongoDB

import { Pool as PostgreSQLPool } from 'pg';
import * as mysql from 'mysql2/promise';

export interface ConnectionConfig {
  connectionString: string;
  maxConnections?: number;
  connectionTimeout?: number;
  idleTimeout?: number;
}

export class ConnectionPoolManager {
  private postgresqlPools: Map<string, PostgreSQLPool> = new Map();
  private mysqlPools: Map<string, mysql.Pool> = new Map();
  private mongodbClients: Map<string, any> = new Map();
  private static instance: ConnectionPoolManager | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ConnectionPoolManager {
    if (!ConnectionPoolManager.instance) {
      ConnectionPoolManager.instance = new ConnectionPoolManager();
    }
    return ConnectionPoolManager.instance;
  }

  /**
   * Get or create PostgreSQL connection pool
   */
  async getPostgreSQLConnection(connectionString: string, config?: Partial<ConnectionConfig>): Promise<PostgreSQLPool> {
    try {
      // Check if pool already exists
      if (this.postgresqlPools.has(connectionString)) {
        const pool = this.postgresqlPools.get(connectionString)!;
        // Test connection
        const client = await pool.connect();
        client.release();
        return pool;
      }

      // Create new pool
      console.log('🔌 Creating PostgreSQL connection pool...');
      const pool = new PostgreSQLPool({
        connectionString,
        max: config?.maxConnections || 10,
        connectionTimeoutMillis: config?.connectionTimeout || 30000,
        idleTimeoutMillis: config?.idleTimeout || 30000,
      });

      // Test connection
      const client = await pool.connect();
      client.release();

      // Store pool
      this.postgresqlPools.set(connectionString, pool);
      console.log('✅ PostgreSQL connection pool created');

      return pool;
    } catch (error) {
      console.error('❌ Failed to create PostgreSQL connection pool:', error);
      throw new Error(`PostgreSQL connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get or create MySQL connection pool
   */
  async getMySQLConnection(connectionString: string, config?: Partial<ConnectionConfig>): Promise<mysql.Pool> {
    try {
      // Check if pool already exists
      if (this.mysqlPools.has(connectionString)) {
        const pool = this.mysqlPools.get(connectionString)!;
        // Test connection
        const connection = await pool.getConnection();
        connection.release();
        return pool;
      }

      // Create new pool
      console.log('🔌 Creating MySQL connection pool...');
      const pool = mysql.createPool({
        uri: connectionString,
        waitForConnections: true,
        connectionLimit: config?.maxConnections || 10,
        queueLimit: 0,
        connectTimeout: config?.connectionTimeout || 30000,
      });

      // Test connection
      const connection = await pool.getConnection();
      connection.release();

      // Store pool
      this.mysqlPools.set(connectionString, pool);
      console.log('✅ MySQL connection pool created');

      return pool;
    } catch (error) {
      console.error('❌ Failed to create MySQL connection pool:', error);
      throw new Error(`MySQL connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get or create MongoDB client
   */
  async getMongoDBConnection(connectionString: string, config?: Partial<ConnectionConfig>): Promise<any> {
    try {
      // Check if client already exists
      if (this.mongodbClients.has(connectionString)) {
        const client = this.mongodbClients.get(connectionString)!;
        // Test connection
        await client.db().admin().ping();
        return client;
      }

      // Use server-side MongoDB wrapper
      if (typeof window !== 'undefined') {
        throw new Error('MongoDB connections are not supported in the browser');
      }

      // Create new client using server-side wrapper
      console.log('🔌 Creating MongoDB client...');
      const { MongoDBServer } = await import('../mongodbServer');
      const client = await MongoDBServer.getClient(connectionString);

      // Store client
      this.mongodbClients.set(connectionString, client);
      console.log('✅ MongoDB client created');

      return client;
    } catch (error) {
      console.error('❌ Failed to create MongoDB client:', error);
      throw new Error(`MongoDB connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Close specific PostgreSQL pool
   */
  async closePostgreSQLPool(connectionString: string): Promise<void> {
    const pool = this.postgresqlPools.get(connectionString);
    if (pool) {
      try {
        await pool.end();
        this.postgresqlPools.delete(connectionString);
        console.log('🔌 PostgreSQL pool closed');
      } catch (error) {
        console.warn('⚠️ Error closing PostgreSQL pool:', error);
      }
    }
  }

  /**
   * Close specific MySQL pool
   */
  async closeMySQLPool(connectionString: string): Promise<void> {
    const pool = this.mysqlPools.get(connectionString);
    if (pool) {
      try {
        await pool.end();
        this.mysqlPools.delete(connectionString);
        console.log('🔌 MySQL pool closed');
      } catch (error) {
        console.warn('⚠️ Error closing MySQL pool:', error);
      }
    }
  }

  /**
   * Close specific MongoDB client
   */
  async closeMongoDBClient(connectionString: string): Promise<void> {
    const client = this.mongodbClients.get(connectionString);
    if (client) {
      try {
        await client.close();
        this.mongodbClients.delete(connectionString);
        console.log('🔌 MongoDB client closed');
      } catch (error) {
        console.warn('⚠️ Error closing MongoDB client:', error);
      }
    }
  }

  /**
   * Close all connection pools and clients
   */
  async closeAll(): Promise<void> {
    console.log('🔌 Closing all connection pools...');

    // Close PostgreSQL pools
    const pgPromises = Array.from(this.postgresqlPools.keys()).map(key => this.closePostgreSQLPool(key));
    
    // Close MySQL pools
    const mysqlPromises = Array.from(this.mysqlPools.keys()).map(key => this.closeMySQLPool(key));
    
    // Close MongoDB clients
    const mongoPromises = Array.from(this.mongodbClients.keys()).map(key => this.closeMongoDBClient(key));

    await Promise.allSettled([...pgPromises, ...mysqlPromises, ...mongoPromises]);
    console.log('✅ All connections closed');
  }

  /**
   * Get pool statistics
   */
  getStatistics(): {
    postgresql: number;
    mysql: number;
    mongodb: number;
  } {
    return {
      postgresql: this.postgresqlPools.size,
      mysql: this.mysqlPools.size,
      mongodb: this.mongodbClients.size,
    };
  }

  /**
   * Validate connection string format
   */
  validateConnectionString(connectionString: string, type: 'postgresql' | 'mysql' | 'mongodb'): boolean {
    try {
      const url = new URL(connectionString);
      
      switch (type) {
        case 'postgresql':
          return url.protocol === 'postgres:' || url.protocol === 'postgresql:';
        case 'mysql':
          return url.protocol === 'mysql:';
        case 'mongodb':
          return url.protocol === 'mongodb:' || url.protocol === 'mongodb+srv:';
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  /**
   * Test connection without creating pool
   */
  async testConnection(connectionString: string, type: 'postgresql' | 'mysql' | 'mongodb'): Promise<boolean> {
    try {
      switch (type) {
        case 'postgresql': {
          const pool = new PostgreSQLPool({ connectionString, max: 1 });
          const client = await pool.connect();
          client.release();
          await pool.end();
          return true;
        }
        case 'mysql': {
          const connection = await mysql.createConnection({ uri: connectionString });
          await connection.end();
          return true;
        }
        case 'mongodb': {
          const client = new MongoClient(connectionString);
          await client.connect();
          await client.db().admin().ping();
          await client.close();
          return true;
        }
        default:
          return false;
      }
    } catch (error) {
      console.warn(`⚠️ Connection test failed for ${type}:`, error);
      return false;
    }
  }
}

// Export singleton instance
export const connectionPoolManager = ConnectionPoolManager.getInstance();

