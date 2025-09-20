// Auto Connection Service
// Handles automatic connection to databases created from extracted schemas

import { DatabaseConnection } from '@/types/database';
import { dbConnectionManager } from '@/utils/databaseConnection';

export interface AutoConnectionResult {
  success: boolean;
  connectionId?: string;
  error?: string;
  databaseName: string;
}

export class AutoConnectionService {
  private static instance: AutoConnectionService;

  private constructor() {}

  static getInstance(): AutoConnectionService {
    if (!AutoConnectionService.instance) {
      AutoConnectionService.instance = new AutoConnectionService();
    }
    return AutoConnectionService.instance;
  }

  /**
   * Automatically connect to a database created from extracted schema
   */
  async autoConnectDatabase(
    databaseConnection: any,
    projectId: string,
    projectName: string
  ): Promise<AutoConnectionResult> {
    try {
      console.log(`🔄 Auto-connecting to database: ${databaseConnection.name}`);

      // Create connection credentials for SQLite
      const credentials = {
        type: 'sqlite',
        host: 'localhost',
        port: 0,
        database: databaseConnection.name,
        username: '',
        password: '',
        connectionString: databaseConnection.connectionString,
        filePath: databaseConnection.connectionString
      };

      // Test the connection first
      const testResult = await this.testDatabaseConnection(credentials);
      if (!testResult.success) {
        return {
          success: false,
          error: testResult.error,
          databaseName: databaseConnection.name
        };
      }

      // Create a unique connection ID
      const connectionId = `auto_${projectId}_${databaseConnection.name}_${Date.now()}`;

      // Create the database connection object
      const connection: DatabaseConnection = {
        id: connectionId,
        type: 'sqlite',
        host: 'localhost',
        database: databaseConnection.name,
        credentials,
        schema: databaseConnection.schema,
        connected: true,
        lastConnected: new Date(),
        projectId,
        projectName,
        uploadPath: databaseConnection.connectionString,
        tableCount: databaseConnection.tableCount || 0,
        totalRows: databaseConnection.totalRows || 0,
        hasForeignKeys: databaseConnection.hasForeignKeys || false,
        hasIndexes: databaseConnection.hasIndexes || false
      };

      // Save the connection to the database
      await this.saveDatabaseConnection(connection, projectId);

      console.log(`✅ Auto-connected to database: ${databaseConnection.name}`);
      
      return {
        success: true,
        connectionId,
        databaseName: databaseConnection.name
      };

    } catch (error) {
      console.error(`❌ Failed to auto-connect to database ${databaseConnection.name}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        databaseName: databaseConnection.name
      };
    }
  }

  /**
   * Test database connection
   */
  private async testDatabaseConnection(credentials: any): Promise<{ success: boolean; error?: string }> {
    try {
      // For SQLite, we just need to check if the file exists and is readable
      const fs = require('fs');
      const path = require('path');
      
      if (!fs.existsSync(credentials.filePath)) {
        return {
          success: false,
          error: `Database file not found: ${credentials.filePath}`
        };
      }

      // Try to open the database file
      const sqlite3 = require('sqlite3').verbose();
      const { open } = require('sqlite');
      
      const db = await open({
        filename: credentials.filePath,
        driver: sqlite3.Database
      });

      // Test a simple query
      await db.get('SELECT 1 as test');
      await db.close();

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database connection test failed'
      };
    }
  }

  /**
   * Save database connection to the application database
   */
  private async saveDatabaseConnection(connection: DatabaseConnection, projectId: string): Promise<void> {
    try {
      // Initialize app data if needed
      await dbConnectionManager.initializeAppData();
      
      // Save the database connection
      await dbConnectionManager.saveProjectDatabase(projectId, {
        id: connection.id,
        name: connection.database,
        type: connection.type,
        connectionString: connection.credentials.connectionString,
        isConnected: connection.connected,
        lastSync: connection.lastConnected,
        tables: connection.schema?.tables || [],
        projectId,
        projectName: connection.projectName,
        tableCount: connection.tableCount,
        totalRows: connection.totalRows,
        hasForeignKeys: connection.hasForeignKeys,
        hasIndexes: connection.hasIndexes
      });

      console.log(`💾 Saved database connection: ${connection.database}`);
    } catch (error) {
      console.error('❌ Failed to save database connection:', error);
      throw error;
    }
  }

  /**
   * Auto-connect to multiple databases
   */
  async autoConnectMultipleDatabases(
    databaseConnections: any[],
    projectId: string,
    projectName: string
  ): Promise<AutoConnectionResult[]> {
    const results: AutoConnectionResult[] = [];

    for (const dbConnection of databaseConnections) {
      try {
        const result = await this.autoConnectDatabase(dbConnection, projectId, projectName);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          databaseName: dbConnection.name
        });
      }
    }

    return results;
  }

  /**
   * Get connection status for a project
   */
  async getProjectConnectionStatus(projectId: string): Promise<{
    totalDatabases: number;
    connectedDatabases: number;
    failedConnections: number;
    connections: AutoConnectionResult[];
  }> {
    try {
      const databases = await dbConnectionManager.getProjectDatabases(projectId);
      
      return {
        totalDatabases: databases.length,
        connectedDatabases: databases.filter(db => db.isConnected).length,
        failedConnections: databases.filter(db => !db.isConnected).length,
        connections: databases.map(db => ({
          success: db.isConnected,
          connectionId: db.id,
          databaseName: db.name,
          error: db.isConnected ? undefined : 'Connection failed'
        }))
      };
    } catch (error) {
      console.error('❌ Failed to get project connection status:', error);
      return {
        totalDatabases: 0,
        connectedDatabases: 0,
        failedConnections: 0,
        connections: []
      };
    }
  }
}
