// Production Database Connection Manager
// Persistent database connection management for serverless environments

import * as path from 'path';

// Dynamic imports for server-only database drivers
let sqlite3: any = null;
let open: any = null;
let Database: any = null;
let fs: any = null;
let mysql: any = null;
let Pool: any = null;
let mysqlPool: any = null;

// Load database drivers only on server side
if (typeof window === 'undefined') {
  try {
    console.log('🔧 Loading database drivers...');

    // Dynamic imports for Node.js modules
    sqlite3 = require('sqlite3');
    open = require('sqlite').open;
    Database = require('sqlite').Database;
    fs = require('fs');

    mysql = require('mysql2/promise');
    const pg = require('pg');
    Pool = pg.Pool;
    // Import mysql2 pool for connection pooling
    mysqlPool = require('mysql2').createPool;

    console.log('✅ Database drivers loaded successfully');
  } catch (error) {
    console.error('❌ Database drivers not available:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
  }
}

// Connection Pool Manager
class ConnectionPoolManager {
  private static instance: ConnectionPoolManager;
  private pools: Map<string, any> = new Map();
  private poolStats: Map<string, ConnectionPoolStats> = new Map();

  private constructor() {}

  static getInstance(): ConnectionPoolManager {
    if (!ConnectionPoolManager.instance) {
      ConnectionPoolManager.instance = new ConnectionPoolManager();
    }
    return ConnectionPoolManager.instance;
  }

  createMySQLPool(sessionId: string, credentials: DatabaseCredentials): any {
    if (!mysqlPool) {
      throw new Error('MySQL pool driver not available');
    }

    const pool = mysqlPool({
      host: credentials.host,
      port: credentials.port || 3306,
      user: credentials.username,
      password: credentials.password,
      database: credentials.database,
      connectionLimit: 10,
      queueLimit: 0,
      acquireTimeout: 60000,
      timeout: 60000,
    });

    this.pools.set(sessionId, pool);
    this.poolStats.set(sessionId, {
      sessionId,
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      pendingConnections: 0,
      createdAt: new Date(),
      lastUsed: new Date()
    });

    return pool;
  }

  getPool(sessionId: string): any {
    return this.pools.get(sessionId);
  }

  updatePoolStats(sessionId: string, stats: Partial<ConnectionPoolStats>): void {
    const currentStats = this.poolStats.get(sessionId);
    if (currentStats) {
      this.poolStats.set(sessionId, {
        ...currentStats,
        ...stats,
        lastUsed: new Date()
      });
    }
  }

  getPoolStats(sessionId: string): ConnectionPoolStats | null {
    return this.poolStats.get(sessionId) || null;
  }

  getAllPoolStats(): ConnectionPoolStats[] {
    return Array.from(this.poolStats.values());
  }

  async closePool(sessionId: string): Promise<void> {
    const pool = this.pools.get(sessionId);
    if (pool) {
      await pool.end();
      this.pools.delete(sessionId);
      this.poolStats.delete(sessionId);
    }
  }

  // Health check for connection pools
  async healthCheck(sessionId: string): Promise<{
    healthy: boolean;
    latency?: number;
    error?: string;
  }> {
    const pool = this.pools.get(sessionId);
    if (!pool) {
      return { healthy: false, error: 'Pool not found' };
    }

    try {
      const startTime = Date.now();
      const connection = await pool.getConnection();
      try {
        await connection.execute('SELECT 1');
        const latency = Date.now() - startTime;
        return { healthy: true, latency };
      } finally {
        connection.release();
      }
    } catch (error: any) {
      return { healthy: false, error: error.message };
    }
  }

  // Cleanup idle pools
  async cleanupIdlePools(maxAge: number = 3600000): Promise<number> { // 1 hour default
    const now = Date.now();
    const idlePools: string[] = [];

    for (const [sessionId, stats] of this.poolStats.entries()) {
      if (now - stats.lastUsed.getTime() > maxAge) {
        idlePools.push(sessionId);
      }
    }

    for (const sessionId of idlePools) {
      try {
        await this.closePool(sessionId);
        console.log(`Cleaned up idle connection pool: ${sessionId}`);
      } catch (error) {
        console.warn(`Failed to cleanup idle pool ${sessionId}:`, error);
      }
    }

    return idlePools.length;
  }

  async cleanup(): Promise<void> {
    for (const [sessionId, pool] of this.pools.entries()) {
      try {
        await pool.end();
      } catch (error) {
        console.warn(`Failed to close pool ${sessionId}:`, error);
      }
    }
    this.pools.clear();
    this.poolStats.clear();
  }
}

interface ConnectionPoolStats {
  sessionId: string;
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  pendingConnections: number;
  createdAt: Date;
  lastUsed: Date;
}

// Global connection pool manager
const poolManager = ConnectionPoolManager.getInstance();

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

export interface ConnectionSession {
  id: string;
  credentials: DatabaseCredentials;
  type: 'mysql' | 'postgresql' | 'sqlite';
  createdAt: Date;
  lastUsed: Date;
  status: 'active' | 'inactive' | 'error';
  error?: string;
}

// Persistent storage for connection sessions
class ConnectionSessionStore {
  private static instance: ConnectionSessionStore;
  private sessionsFile: string;
  private sessions: Map<string, ConnectionSession> = new Map();
  private connections: Map<string, any> = new Map();

  private constructor() {
    // Store sessions in a file for persistence across serverless function calls
    this.sessionsFile = path.join(process.cwd(), '.queryflow_sessions.json');
    this.loadSessions();
  }

  static getInstance(): ConnectionSessionStore {
    if (!ConnectionSessionStore.instance) {
      ConnectionSessionStore.instance = new ConnectionSessionStore();
    }
    return ConnectionSessionStore.instance;
  }

  private loadSessions(): void {
    try {
      if (fs.existsSync(this.sessionsFile)) {
        const data = fs.readFileSync(this.sessionsFile, 'utf-8');
        const sessionsData = JSON.parse(data);

        // Restore sessions but mark them as inactive (connections need to be re-established)
        for (const [id, session] of Object.entries(sessionsData)) {
          const restoredSession = {
            ...session as ConnectionSession,
            createdAt: new Date((session as any).createdAt),
            lastUsed: new Date((session as any).lastUsed),
            status: 'inactive' as const
          };
          this.sessions.set(id, restoredSession);
        }

        console.log(`Loaded ${this.sessions.size} connection sessions from disk`);
      }
    } catch (error) {
      console.warn('Failed to load connection sessions, starting fresh:', error instanceof Error ? error.message : String(error));
      // Don't throw - we can continue with empty sessions
    }
  }

  private saveSessions(): void {
    try {
      const sessionsData: Record<string, any> = {};
      for (const [id, session] of this.sessions.entries()) {
        sessionsData[id] = {
          ...session,
          createdAt: session.createdAt.toISOString(),
          lastUsed: session.lastUsed.toISOString()
        };
      }
      fs.writeFileSync(this.sessionsFile, JSON.stringify(sessionsData, null, 2));
    } catch (error) {
      console.warn('Failed to save connection sessions:', error instanceof Error ? error.message : String(error));
      // Don't throw - the application should continue working
    }
  }

  createSession(credentials: DatabaseCredentials): string {
    const sessionId = this.generateSessionId();
    const session: ConnectionSession = {
      id: sessionId,
      credentials,
      type: credentials.type,
      createdAt: new Date(),
      lastUsed: new Date(),
      status: 'active'
    };

    this.sessions.set(sessionId, session);
    this.saveSessions();
    return sessionId;
  }

  getSession(sessionId: string): ConnectionSession | null {
    return this.sessions.get(sessionId) || null;
  }

  updateSessionStatus(sessionId: string, status: ConnectionSession['status'], error?: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = status;
      session.lastUsed = new Date();
      if (error) session.error = error;
      this.saveSessions();
    }
  }

  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.connections.delete(sessionId);
    this.saveSessions();
  }

  getActiveSessions(): ConnectionSession[] {
    return Array.from(this.sessions.values()).filter(s => s.status === 'active');
  }

  storeConnection(sessionId: string, connection: any): void {
    this.connections.set(sessionId, connection);
  }

  getConnection(sessionId: string): any {
    return this.connections.get(sessionId) || null;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  cleanup(): void {
    // Close all active connections
    for (const [sessionId, connection] of this.connections.entries()) {
      try {
        if (connection.constructor.name === 'Connection') {
          connection.end();
        } else if (connection.constructor.name === 'Pool') {
          connection.end();
        } else if (connection.constructor.name === 'Database') {
          connection.close();
        }
      } catch (error) {
        console.error(`Failed to close connection ${sessionId}:`, error);
      }
    }

    this.connections.clear();
    this.sessions.clear();
    this.saveSessions();
  }
}

// Global session store instance
const sessionStore = ConnectionSessionStore.getInstance();

// Application Data Persistence Manager
class ApplicationDataManager {
  private static instance: ApplicationDataManager;
  private appDb: any = null; // SQLite Database instance
  private initialized = false;
  private projectsCache: any[] | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 30000; // 30 seconds cache TTL

  private constructor() {}

  static getInstance(): ApplicationDataManager {
    if (!ApplicationDataManager.instance) {
      ApplicationDataManager.instance = new ApplicationDataManager();
    }
    return ApplicationDataManager.instance;
  }

  // Cache invalidation methods
  private invalidateProjectsCache(): void {
    this.projectsCache = null;
    this.cacheTimestamp = 0;
    console.log('🗑️ Projects cache invalidated');
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (!sqlite3 || !open) {
      console.warn('SQLite not available for application data persistence');
      return;
    }

    try {
      // Create application database
      const dbPath = path.join(process.cwd(), 'queryflow_app.db');
      this.appDb = await open({
        filename: dbPath,
        driver: sqlite3.Database
      });

      // Create tables
      await this.createTables();
      this.initialized = true;
      console.log('Application data persistence initialized');
    } catch (error) {
      console.error('Failed to initialize application data persistence:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.appDb) throw new Error('Application database not initialized');

    if (!this.appDb) return; // Additional check

  // Check if we need to migrate the projects table
  await this.migrateProjectsTable();
  
  // Check if we need to migrate to comprehensive sections
  await this.migrateToComprehensiveSections();

    // Projects table
    await this.appDb.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        technology TEXT,
        status TEXT DEFAULT 'disconnected',
        last_synced TEXT,
        database_count INTEGER DEFAULT 0,
        total_tables INTEGER DEFAULT 0,
        total_rows INTEGER DEFAULT 0,
        total_columns INTEGER DEFAULT 0,
        has_foreign_keys INTEGER DEFAULT 0,
        has_indexes INTEGER DEFAULT 0,
        icon TEXT,
        color TEXT,
        is_example INTEGER DEFAULT 0,
        schema_data TEXT,
        system_catalog TEXT,
        -- Comprehensive unified report sections
        verification_data TEXT,
        database_introspection TEXT,
        schema_objects TEXT,
        columns_data TEXT,
        constraints_data TEXT,
        statistics_data TEXT,
        functions_data TEXT,
        security_data TEXT,
        runtime_state TEXT,
        engine_features TEXT,
        -- Actual database tables vs extracted ORM models
        actual_database_tables TEXT,
        extracted_models TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Databases table
    await this.appDb.exec(`
      CREATE TABLE IF NOT EXISTS project_databases (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        connection_string TEXT,
        is_connected INTEGER DEFAULT 0,
        last_sync TEXT,
        tables_data TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
      )
    `);

    // Query history table
    await this.appDb.exec(`
      CREATE TABLE IF NOT EXISTS query_history (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        database_id TEXT,
        sql TEXT NOT NULL,
        execution_time INTEGER,
        row_count INTEGER,
        success INTEGER DEFAULT 1,
        error_message TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User settings table
    await this.appDb.exec(`
      CREATE TABLE IF NOT EXISTS user_settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Application database tables created');
  }

  private async migrateProjectsTable(): Promise<void> {
    if (!this.appDb) return;

    try {
      console.log('🔄 Starting projects table migration...');
      
      // Check if the new columns exist
      const columns = await this.appDb.all("PRAGMA table_info(projects)");
      const columnNames = columns.map((col: any) => col.name);
      
      console.log('📋 Current columns:', columnNames);
      
      // Add missing columns if they don't exist
      if (!columnNames.includes('total_tables')) {
        console.log('➕ Adding total_tables column...');
        await this.appDb.exec('ALTER TABLE projects ADD COLUMN total_tables INTEGER DEFAULT 0');
        console.log('✅ Added total_tables column to projects table');
      } else {
        console.log('✅ total_tables column already exists');
      }
      
      if (!columnNames.includes('total_rows')) {
        console.log('➕ Adding total_rows column...');
        await this.appDb.exec('ALTER TABLE projects ADD COLUMN total_rows INTEGER DEFAULT 0');
        console.log('✅ Added total_rows column to projects table');
      } else {
        console.log('✅ total_rows column already exists');
      }
      
      if (!columnNames.includes('has_foreign_keys')) {
        console.log('➕ Adding has_foreign_keys column...');
        await this.appDb.exec('ALTER TABLE projects ADD COLUMN has_foreign_keys INTEGER DEFAULT 0');
        console.log('✅ Added has_foreign_keys column to projects table');
      } else {
        console.log('✅ has_foreign_keys column already exists');
      }
      
      if (!columnNames.includes('has_indexes')) {
        console.log('➕ Adding has_indexes column...');
        await this.appDb.exec('ALTER TABLE projects ADD COLUMN has_indexes INTEGER DEFAULT 0');
        console.log('✅ Added has_indexes column to projects table');
      } else {
        console.log('✅ has_indexes column already exists');
      }
      
      if (!columnNames.includes('system_catalog')) {
        console.log('➕ Adding system_catalog column...');
        await this.appDb.exec('ALTER TABLE projects ADD COLUMN system_catalog TEXT');
        console.log('✅ Added system_catalog column to projects table');
      } else {
        console.log('✅ system_catalog column already exists');
      }
      
      console.log('✅ Projects table migration completed');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
    }
  }

  // Migrate to comprehensive sections
  private async migrateToComprehensiveSections(): Promise<void> {
    if (!this.appDb) return;

    try {
      // Check if comprehensive sections columns exist
      const columns = await this.appDb.all(`
        PRAGMA table_info(projects)
      `);
      
      const columnNames = columns.map((col: any) => col.name);
      
      const hasComprehensiveSections = columnNames.includes('verification_data');
      const hasTotalColumns = columnNames.includes('total_columns');
      const hasActualDatabaseTables = columnNames.includes('actual_database_tables');

      if (!hasComprehensiveSections) {
        console.log('🔄 Migrating projects table to comprehensive sections...');
        
        // Add comprehensive sections columns
        await this.appDb.exec(`
          ALTER TABLE projects ADD COLUMN verification_data TEXT;
          ALTER TABLE projects ADD COLUMN database_introspection TEXT;
          ALTER TABLE projects ADD COLUMN schema_objects TEXT;
          ALTER TABLE projects ADD COLUMN columns_data TEXT;
          ALTER TABLE projects ADD COLUMN constraints_data TEXT;
          ALTER TABLE projects ADD COLUMN statistics_data TEXT;
          ALTER TABLE projects ADD COLUMN functions_data TEXT;
          ALTER TABLE projects ADD COLUMN security_data TEXT;
          ALTER TABLE projects ADD COLUMN runtime_state TEXT;
          ALTER TABLE projects ADD COLUMN engine_features TEXT;
        `);
        
        console.log('✅ Projects table migrated to comprehensive sections');
      }
      
      if (!hasTotalColumns) {
        console.log('🔄 Adding total_columns column...');
        await this.appDb.exec(`
          ALTER TABLE projects ADD COLUMN total_columns INTEGER DEFAULT 0;
        `);
        console.log('✅ Added total_columns column');
      }
      
      if (!hasActualDatabaseTables) {
        console.log('🔄 Adding actual_database_tables and extracted_models columns...');
        await this.appDb.exec(`
          ALTER TABLE projects ADD COLUMN actual_database_tables TEXT;
          ALTER TABLE projects ADD COLUMN extracted_models TEXT;
        `);
        console.log('✅ Added actual_database_tables and extracted_models columns');
      }
    } catch (error) {
      console.error('❌ Failed to migrate to comprehensive sections:', error);
    }
  }

  // Project operations
  async saveProject(project: any): Promise<void> {
    if (!this.appDb) await this.initialize();
    if (!this.appDb) {
      console.error('❌ Database not available for saving project');
      return;
    }

    console.log('💾 Saving project to database:', {
      id: project.id,
      name: project.name,
      totalTables: project.totalTables,
      totalRows: project.totalRows,
      hasForeignKeys: project.hasForeignKeys,
      hasIndexes: project.hasIndexes
    });

    const schemaData = JSON.stringify(project.schema || {});
    const now = new Date().toISOString();

    // Prepare comprehensive sections data
    const verificationData = project.verification ? JSON.stringify(project.verification) : null;
    const databaseIntrospection = project.databaseIntrospection ? JSON.stringify(project.databaseIntrospection) : null;
    const schemaObjects = project.schemaObjects ? JSON.stringify(project.schemaObjects) : null;
    const columnsData = project.columns ? JSON.stringify(project.columns) : null;
    const constraintsData = project.constraints ? JSON.stringify(project.constraints) : null;
    const statisticsData = project.statistics ? JSON.stringify(project.statistics) : null;
    const functionsData = project.functions ? JSON.stringify(project.functions) : null;
    const securityData = project.security ? JSON.stringify(project.security) : null;
    const runtimeState = project.runtimeState ? JSON.stringify(project.runtimeState) : null;
    const engineFeatures = project.engineFeatures ? JSON.stringify(project.engineFeatures) : null;
    const actualDatabaseTables = project.actualDatabaseTables ? JSON.stringify(project.actualDatabaseTables) : null;
    const extractedModels = project.extractedModels ? JSON.stringify(project.extractedModels) : null;

    try {
      await this.appDb.run(`
        INSERT OR REPLACE INTO projects
        (id, name, description, technology, status, last_synced, database_count, total_tables, total_rows, total_columns, has_foreign_keys, has_indexes, icon, color, is_example, schema_data, system_catalog, verification_data, database_introspection, schema_objects, columns_data, constraints_data, statistics_data, functions_data, security_data, runtime_state, engine_features, actual_database_tables, extracted_models, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        project.id,
        project.name,
        project.description || '',
        project.technology || '',
        project.status || 'disconnected',
        project.lastSynced || null,
        project.databaseCount || 0,
        project.totalTables || 0,
        project.totalRows || 0,
        project.totalColumns || 0,
        project.hasForeignKeys ? 1 : 0,
        project.hasIndexes ? 1 : 0,
        project.icon || '',
        project.color || '',
        project.isExample ? 1 : 0,
        schemaData,
        project.systemCatalog ? JSON.stringify(project.systemCatalog) : null,
        verificationData,
        databaseIntrospection,
        schemaObjects,
        columnsData,
        constraintsData,
        statisticsData,
        functionsData,
        securityData,
        runtimeState,
        engineFeatures,
        actualDatabaseTables,
        extractedModels,
        now
      ]);
      
      console.log('✅ Project saved successfully to database');
      
      // Invalidate cache after successful save
      this.invalidateProjectsCache();
    } catch (error) {
      console.error('❌ Failed to save project to database:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
      throw error;
    }
  }

  async getProject(projectId: string): Promise<any | null> {
    if (!this.appDb) await this.initialize();
    if (!this.appDb) return null; // SQLite not available

    const row = await this.appDb.get('SELECT * FROM projects WHERE id = ?', projectId);
    if (!row) return null;

    return {
      ...row,
      schema: JSON.parse(row.schema_data || '{}'),
      systemCatalog: row.system_catalog ? JSON.parse(row.system_catalog) : null,
      isExample: row.is_example === 1,
      databaseCount: row.database_count,
      lastSynced: row.last_synced,
      totalTables: row.total_tables,
      totalRows: row.total_rows,
      totalColumns: row.total_columns,
      // Comprehensive sections
      verification: row.verification_data ? JSON.parse(row.verification_data) : null,
      databaseIntrospection: row.database_introspection ? JSON.parse(row.database_introspection) : null,
      schemaObjects: row.schema_objects ? JSON.parse(row.schema_objects) : null,
      columns: row.columns_data ? JSON.parse(row.columns_data) : null,
      constraints: row.constraints_data ? JSON.parse(row.constraints_data) : null,
      statistics: row.statistics_data ? JSON.parse(row.statistics_data) : null,
      functions: row.functions_data ? JSON.parse(row.functions_data) : null,
      security: row.security_data ? JSON.parse(row.security_data) : null,
      runtimeState: row.runtime_state ? JSON.parse(row.runtime_state) : null,
      engineFeatures: row.engine_features ? JSON.parse(row.engine_features) : null,
      // Actual database tables vs extracted models
      actualDatabaseTables: row.actual_database_tables ? JSON.parse(row.actual_database_tables) : null,
      extractedModels: row.extracted_models ? JSON.parse(row.extracted_models) : null
    };
  }

  async getAllProjects(): Promise<any[]> {
    if (!this.appDb) await this.initialize();
    if (!this.appDb) return []; // SQLite not available

    // Check cache first
    const now = Date.now();
    if (this.projectsCache && (now - this.cacheTimestamp) < this.CACHE_TTL) {
      console.log('📦 Returning cached projects data');
      return this.projectsCache;
    }

    console.log('🔄 Fetching fresh projects data from database');
    
    // Optimized query with only necessary fields
    const rows = await this.appDb.all(`
      SELECT 
        id, name, description, technology, status, 
        last_synced, database_count, icon, color, 
        is_example, created_at, updated_at,
        total_tables, total_rows, total_columns, has_foreign_keys, has_indexes,
        schema_data, system_catalog
      FROM projects 
      ORDER BY updated_at DESC
    `);
    
    const projects = rows.map((row: any) => {
      try {
        return {
          ...row,
          schema: JSON.parse(row.schema_data || '{}'),
          systemCatalog: row.system_catalog ? JSON.parse(row.system_catalog) : null,
          isExample: row.is_example === 1,
          databaseCount: row.database_count,
          totalTables: row.total_tables || 0,
          totalRows: row.total_rows || 0,
          hasForeignKeys: row.has_foreign_keys === 1,
          hasIndexes: row.has_indexes === 1,
          lastSynced: row.last_synced
        };
      } catch (parseError) {
        console.warn('Failed to parse schema for project:', row.id, parseError);
        return {
          ...row,
          schema: {},
          systemCatalog: null,
          isExample: row.is_example === 1,
          databaseCount: row.database_count,
          totalTables: row.total_tables || 0,
          totalRows: row.total_rows || 0,
          hasForeignKeys: row.has_foreign_keys === 1,
          hasIndexes: row.has_indexes === 1,
          lastSynced: row.last_synced
        };
      }
    });

    // Update cache
    this.projectsCache = projects;
    this.cacheTimestamp = now;
    
    return projects;
  }

  async deleteProject(projectId: string): Promise<void> {
    if (!this.appDb) await this.initialize();
    if (!this.appDb) return; // SQLite not available

    await this.appDb.run('DELETE FROM projects WHERE id = ?', projectId);
    
    // Invalidate cache after deletion
    this.invalidateProjectsCache();
  }

  async clearAllProjects(): Promise<void> {
    if (!this.appDb) await this.initialize();
    if (!this.appDb) return; // SQLite not available

    console.log('🗑️ Clearing all projects from database...');
    
    // Delete all projects
    const projectResult = await this.appDb.run('DELETE FROM projects');
    console.log('✅ Deleted projects:', projectResult.changes);
    
    // Delete all project databases
    const dbResult = await this.appDb.run('DELETE FROM project_databases');
    console.log('✅ Deleted project databases:', dbResult.changes);
    
    console.log('🎉 All projects cleared successfully!');
  }

  // Database operations
  async saveProjectDatabase(projectId: string, database: any): Promise<void> {
    if (!this.appDb) await this.initialize();
    if (!this.appDb) return; // SQLite not available

    const tablesData = JSON.stringify(database.tables || []);
    const now = new Date().toISOString();

    await this.appDb.run(`
      INSERT OR REPLACE INTO project_databases
      (id, project_id, name, type, connection_string, is_connected, last_sync, tables_data, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      database.id,
      projectId,
      database.name,
      database.type,
      database.connectionString || '',
      database.isConnected ? 1 : 0,
      database.lastSync || null,
      tablesData,
      now
    ]);
  }

  async getProjectDatabases(projectId: string): Promise<any[]> {
    if (!this.appDb) await this.initialize();
    if (!this.appDb) return []; // SQLite not available

    const rows = await this.appDb.all('SELECT * FROM project_databases WHERE project_id = ?', projectId);
    return rows.map((row: any) => ({
      ...row,
      isConnected: row.is_connected === 1,
      lastSync: row.last_sync,
      tables: JSON.parse(row.tables_data || '[]')
    }));
  }

  // Query history operations
  async saveQueryHistory(sessionId: string, databaseId: string | null, sql: string, result: any): Promise<void> {
    if (!this.appDb) await this.initialize();
    if (!this.appDb) return; // SQLite not available

    await this.appDb.run(`
      INSERT INTO query_history
      (id, session_id, database_id, sql, execution_time, row_count, success, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      databaseId,
      sql,
      result.executionTime || 0,
      result.rowCount || 0,
      result.success ? 1 : 0,
      result.error || null
    ]);
  }

  async getQueryHistory(sessionId?: string, limit: number = 50): Promise<any[]> {
    if (!this.appDb) await this.initialize();

    let query = 'SELECT * FROM query_history';
    let params: any[] = [];

    if (sessionId) {
      query += ' WHERE session_id = ?';
      params.push(sessionId);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    return await this.appDb!.all(query, params);
  }

  // User settings operations
  async saveSetting(key: string, value: any): Promise<void> {
    if (!this.appDb) await this.initialize();
    if (!this.appDb) return; // SQLite not available

    const valueStr = JSON.stringify(value);
    const now = new Date().toISOString();

    await this.appDb.run(`
      INSERT OR REPLACE INTO user_settings (key, value, updated_at)
      VALUES (?, ?, ?)
    `, [key, valueStr, now]);
  }

  async getSetting(key: string): Promise<any | null> {
    if (!this.appDb) await this.initialize();
    if (!this.appDb) return null; // SQLite not available

    const row = await this.appDb.get('SELECT value FROM user_settings WHERE key = ?', key);
    return row ? JSON.parse(row.value) : null;
  }

  async getAllSettings(): Promise<Record<string, any>> {
    if (!this.appDb) await this.initialize();
    if (!this.appDb) return {}; // SQLite not available

    const rows = await this.appDb.all('SELECT key, value FROM user_settings');
    const settings: Record<string, any> = {};

    for (const row of rows) {
      settings[(row as any).key] = JSON.parse((row as any).value);
    }

    return settings;
  }

  // Cleanup
  async cleanup(): Promise<void> {
    if (this.appDb) {
      await this.appDb.close();
      this.appDb = null;
      this.initialized = false;
    }
  }
}

// Global application data manager instance
const appDataManager = ApplicationDataManager.getInstance();

export class DatabaseConnectionManager {
  private static instance: DatabaseConnectionManager;

  static getInstance(): DatabaseConnectionManager {
    if (!DatabaseConnectionManager.instance) {
      DatabaseConnectionManager.instance = new DatabaseConnectionManager();
    }
    return DatabaseConnectionManager.instance;
  }

  // Test database connection and create persistent session
  async testConnection(credentials: DatabaseCredentials): Promise<ConnectionResult> {
    try {
      // Create a session for this connection
      const sessionId = sessionStore.createSession(credentials);

      switch (credentials.type) {
        case 'mysql':
          return await this.testMySQLConnection(credentials, sessionId);
        case 'postgresql':
          return await this.testPostgreSQLConnection(credentials, sessionId);
        case 'sqlite':
          return await this.testSQLiteConnection(credentials, sessionId);
        default:
          // Clean up failed session
          sessionStore.deleteSession(sessionId);
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

  // Test MySQL connection with pooling
  private async testMySQLConnection(credentials: DatabaseCredentials, sessionId: string): Promise<ConnectionResult> {
    if (!mysql) {
      return {
        success: false,
        message: 'MySQL driver not available',
        error: 'MySQL database driver is not loaded on this platform'
      };
    }

    try {
      // Create connection pool for better performance
      const pool = poolManager.createMySQLPool(sessionId, credentials);

      // Test the connection using pool
      const connection = await pool.getConnection();
      try {
        await connection.execute('SELECT 1 as test');
      } finally {
        connection.release();
      }

      // Store pool in session store
      sessionStore.storeConnection(sessionId, pool);

      return {
        success: true,
        message: 'MySQL connection pool created successfully',
        connectionId: sessionId
      };
    } catch (error: any) {
      sessionStore.updateSessionStatus(sessionId, 'error', error.message);
      // Clean up failed pool
      try {
        await poolManager.closePool(sessionId);
      } catch (cleanupError) {
        console.warn('Failed to cleanup failed pool:', cleanupError);
      }
      return {
        success: false,
        message: 'MySQL connection failed',
        error: error.message
      };
    }
  }

  // Test PostgreSQL connection
  private async testPostgreSQLConnection(credentials: DatabaseCredentials, sessionId: string): Promise<ConnectionResult> {
    if (!Pool) {
      return {
        success: false,
        message: 'PostgreSQL driver not available',
        error: 'PostgreSQL database driver is not loaded on this platform'
      };
    }

    try {
      const pool = new Pool({
        host: credentials.host,
        port: credentials.port || 5432,
        user: credentials.username,
        password: credentials.password,
        database: credentials.database,
        connectionTimeoutMillis: 5000,
        query_timeout: 10000,
        idleTimeoutMillis: 30000,
        max: 10, // Maximum number of clients in the pool
      });

      // Test the connection
      const client = await pool.connect();
      try {
        await client.query('SELECT 1 as test');
      } finally {
      client.release();
      }

      // Store connection pool in session store
      sessionStore.storeConnection(sessionId, pool);

      return {
        success: true,
        message: 'PostgreSQL connection successful',
        connectionId: sessionId
      };
    } catch (error: any) {
      sessionStore.updateSessionStatus(sessionId, 'error', error.message);
      return {
        success: false,
        message: 'PostgreSQL connection failed',
        error: error.message
      };
    }
  }

  // Test SQLite connection
  private async testSQLiteConnection(credentials: DatabaseCredentials, sessionId: string): Promise<ConnectionResult> {
    if (!sqlite3 || !open) {
      return {
        success: false,
        message: 'SQLite driver not available',
        error: 'SQLite database driver is not loaded on this platform'
      };
    }

    try {
      const db = await open({
        filename: credentials.filePath || ':memory:',
        driver: sqlite3.Database
      });

      // Test the connection
      await db.get('SELECT 1');

      // Store connection in session store
      sessionStore.storeConnection(sessionId, db);

      return {
        success: true,
        message: 'SQLite connection successful',
        connectionId: sessionId
      };
    } catch (error: any) {
      sessionStore.updateSessionStatus(sessionId, 'error', error.message);
      return {
        success: false,
        message: 'SQLite connection failed',
        error: error.message
      };
    }
  }

  // Fetch database schema
  async fetchSchema(sessionId: string): Promise<DatabaseSchema | null> {
    try {
      // Get session to verify it exists
      const session = sessionStore.getSession(sessionId);
      if (!session) {
        console.error('Session not found for ID:', sessionId);
        return null;
      }

      let connection = sessionStore.getConnection(sessionId);
      if (!connection) {
        console.error('Connection not found for session ID:', sessionId);

        // Try to re-establish the connection
        const result = await this.testConnection(session.credentials);
        if (!result.success) {
        return null;
        }

        // Get the new connection
        connection = sessionStore.getConnection(result.connectionId!);
        if (!connection) {
          return null;
        }
      }

      let schema: DatabaseSchema | null = null;

      // Determine connection type and fetch schema accordingly
      try {
        if (connection.constructor.name === 'Connection') {
          // MySQL connection
          console.log('Fetching MySQL schema...');
          schema = await this.fetchMySQLSchema(connection);
        } else if (connection.constructor.name === 'Pool') {
          // PostgreSQL pool
          console.log('Fetching PostgreSQL schema...');
          schema = await this.fetchPostgreSQLSchema(connection);
        } else if (connection.constructor.name === 'Database') {
          // SQLite database
          console.log('Fetching SQLite schema...');
          schema = await this.fetchSQLiteSchema(connection);
        } else {
          console.error('Unknown connection type:', connection.constructor.name);
          return null;
        }
      } catch (schemaError: any) {
        console.error('Schema introspection failed:', schemaError);
        return null;
      }

      if (!schema) {
        console.error('Schema introspection returned null');
        return null;
      }

      console.log('Schema fetched successfully:', schema.tables?.length || 0, 'tables');
      return schema;
    } catch (error: any) {
      console.error('Schema fetch failed:', error);
      return null;
    }
  }

  private async fetchMySQLSchema(connection: any): Promise<DatabaseSchema> {
    try {
      console.log('MySQL: Getting table list...');
      // Get all tables
      const [tables] = await connection.execute(
        'SHOW TABLES'
      );

      if (!tables || tables.length === 0) {
        console.log('MySQL: No tables found');
        return { tables: [] };
      }

      const tableNames = tables.map((row: any) => Object.values(row)[0]);
      console.log('MySQL: Found tables:', tableNames);

      const schemaTables: TableInfo[] = [];

      for (const tableName of tableNames) {
        try {
          console.log('MySQL: Getting columns for table:', tableName);
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

          console.log('MySQL: Getting row count for table:', tableName);
          // Get row count
          const [countResult] = await connection.execute(
            'SELECT COUNT(*) as count FROM ??',
            [tableName]
          );

          schemaTables.push({
            name: tableName,
            columns: tableColumns,
            rowCount: countResult[0]?.count || 0
          });
        } catch (tableError: any) {
          console.error('MySQL: Failed to process table', tableName, ':', tableError);
          // Continue with other tables
        }
      }

      console.log('MySQL: Schema fetch completed:', schemaTables.length, 'tables');
      return { tables: schemaTables };
    } catch (error: any) {
      console.error('MySQL: Schema fetch failed:', error);
      throw error;
    }
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
  async executeQuery(sessionId: string, sql: string): Promise<QueryResult> {
    // Get session to verify it exists
    const session = sessionStore.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    let connection = sessionStore.getConnection(sessionId);
      if (!connection) {
      // Try to re-establish the connection
      const result = await this.testConnection(session.credentials);
      if (!result.success) {
        throw new Error('Failed to re-establish connection');
      }

      connection = sessionStore.getConnection(result.connectionId!);
      if (!connection) {
        throw new Error('Connection not found after re-establishment');
      }
      }

      const startTime = Date.now();

    try {

      // Allow SELECT, CREATE, INSERT, UPDATE, DELETE for testing
      const upperSQL = sql.trim().toUpperCase();
      const allowedStarts = ['SELECT', 'CREATE', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER'];
      const isAllowed = allowedStarts.some(start => upperSQL.startsWith(start));

      if (!isAllowed) {
        throw new Error('Only SELECT, CREATE, INSERT, UPDATE, DELETE, DROP, ALTER queries are allowed');
      }

      let result;

      if (connection.constructor && connection.constructor.name === 'Pool' && connection.getConnection) {
        // MySQL connection pool
        if (!mysql) {
          throw new Error('MySQL driver not available for query execution');
        }
        const mysqlConnection = await connection.getConnection();
        try {
          [result] = await mysqlConnection.execute(sql);
        } finally {
          mysqlConnection.release();
        }
      } else if (connection.constructor && connection.constructor.name === 'Pool' && connection.connect) {
        // PostgreSQL pool
        if (!Pool) {
          throw new Error('PostgreSQL driver not available for query execution');
        }
        const client = await connection.connect();
        try {
          result = await client.query(sql);
          result = result.rows;
        } finally {
          client.release();
        }
      } else if (connection.constructor && connection.constructor.name === 'Database') {
        // SQLite database
        result = await connection.all(sql);
      } else {
        throw new Error(`Unsupported connection type: ${connection.constructor ? connection.constructor.name : typeof connection}`);
      }

      const executionTime = Date.now() - startTime;

      // Save query to history
      try {
        await appDataManager.saveQueryHistory(sessionId, null, sql, {
          success: true,
          executionTime,
          rowCount: result.length
        });
      } catch (historyError) {
        console.warn('Failed to save query history:', historyError);
        // Don't fail the query execution if history save fails
      }

      return {
        success: true,
        data: result,
        rowCount: result.length,
        executionTime
      };
    } catch (error: any) {
      console.error('Query execution failed:', error);

      // Save failed query to history
      try {
        await appDataManager.saveQueryHistory(sessionId, null, sql, {
          success: false,
          executionTime: Date.now() - startTime,
          rowCount: 0,
          error: error.message
        });
      } catch (historyError) {
        console.warn('Failed to save failed query history:', historyError);
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  // Close connection
  async closeConnection(sessionId: string): Promise<boolean> {
    try {
      const connection = sessionStore.getConnection(sessionId);
      if (!connection) return false;

      if (connection.constructor && connection.constructor.name === 'Pool' && connection.getConnection) {
        // MySQL connection pool
        await poolManager.closePool(sessionId);
      } else if (connection.constructor && connection.constructor.name === 'Pool' && connection.connect) {
        // PostgreSQL pool
        await connection.end();
      } else if (connection.constructor && connection.constructor.name === 'Connection') {
        // MySQL individual connection (fallback)
        await connection.end();
      } else if (connection.constructor && connection.constructor.name === 'Database') {
        // SQLite database
        await connection.close();
      } else {
        console.warn(`Unknown connection type for session ${sessionId}:`, typeof connection);
      }

      // Update session status and remove connection
      sessionStore.updateSessionStatus(sessionId, 'inactive');
      return true;
    } catch (error) {
      console.error('Failed to close connection:', error);
      sessionStore.updateSessionStatus(sessionId, 'error', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  // Get connection info (for debugging)
  getConnectionInfo(sessionId: string): any {
    const session = sessionStore.getSession(sessionId);
    const connection = sessionStore.getConnection(sessionId);
    return connection ? {
      type: connection.constructor.name,
      session: session,
      status: session?.status
    } : null;
  }

  // Get all active sessions
  getActiveSessions(): ConnectionSession[] {
    return sessionStore.getActiveSessions();
  }

  // Connection Pool Management
  getConnectionPoolStats(sessionId?: string): ConnectionPoolStats[] {
    if (sessionId) {
      const stats = poolManager.getPoolStats(sessionId);
      return stats ? [stats] : [];
    }
    return poolManager.getAllPoolStats();
  }

  async closeConnectionPool(sessionId: string): Promise<boolean> {
    try {
      await poolManager.closePool(sessionId);
      return true;
      } catch (error) {
      console.error(`Failed to close connection pool ${sessionId}:`, error);
      return false;
    }
  }

  // Health monitoring
  async healthCheckPool(sessionId: string): Promise<{
    healthy: boolean;
    latency?: number;
    error?: string;
  }> {
    return await poolManager.healthCheck(sessionId);
  }

  // Periodic cleanup
  async cleanupIdleConnectionPools(maxAge?: number): Promise<number> {
    return await poolManager.cleanupIdlePools(maxAge);
  }

  // Enhanced cleanup with pool management
  async cleanup(): Promise<void> {
    sessionStore.cleanup();
    await appDataManager.cleanup();
    await poolManager.cleanup();
  }

  // Application Data Persistence Methods
  async initializeAppData(): Promise<void> {
    try {
      await appDataManager.initialize();
    } catch (error) {
      console.error('❌ Failed to initialize application data:', error);
      console.error('❌ Continuing without application data persistence');
      // Don't throw error - allow the app to continue without persistence
    }
  }

  // Project persistence
  async saveProject(project: any): Promise<void> {
    try {
      await appDataManager.saveProject(project);
    } catch (error) {
      console.error('❌ Failed to save project:', error);
      console.error('❌ Project data may not be persisted');
      // Don't throw error - allow the app to continue
    }
  }

  async getProject(projectId: string): Promise<any | null> {
    try {
      return await appDataManager.getProject(projectId);
    } catch (error) {
      console.error(`❌ Failed to get project ${projectId}:`, error);
      console.error('❌ Returning null');
      return null;
    }
  }

  async getAllProjects(): Promise<any[]> {
    try {
      return await appDataManager.getAllProjects();
    } catch (error) {
      console.error('❌ Failed to get all projects:', error);
      console.error('❌ Returning empty projects array');
      return [];
    }
  }

  async deleteProject(projectId: string): Promise<void> {
    await appDataManager.deleteProject(projectId);
  }

  // Project database persistence
  async saveProjectDatabase(projectId: string, database: any): Promise<void> {
    await appDataManager.saveProjectDatabase(projectId, database);
  }

  async getProjectDatabases(projectId: string): Promise<any[]> {
    return await appDataManager.getProjectDatabases(projectId);
  }

  // Query history
  async saveQueryHistory(sessionId: string, databaseId: string | null, sql: string, result: any): Promise<void> {
    await appDataManager.saveQueryHistory(sessionId, databaseId, sql, result);
  }

  async getQueryHistory(sessionId?: string, limit?: number): Promise<any[]> {
    return await appDataManager.getQueryHistory(sessionId, limit);
  }

  // User settings
  async saveSetting(key: string, value: any): Promise<void> {
    await appDataManager.saveSetting(key, value);
  }

  async getSetting(key: string): Promise<any | null> {
    return await appDataManager.getSetting(key);
  }

  async getAllSettings(): Promise<Record<string, any>> {
    return await appDataManager.getAllSettings();
  }
}

// Export singleton instance
export const dbConnectionManager = DatabaseConnectionManager.getInstance();
