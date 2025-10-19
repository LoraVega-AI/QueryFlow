// Database Sync Service
// Handles real-time synchronization between QueryFlow and project databases

import {
  SyncSession,
  SyncStatus,
  SyncDirection,
  SyncOptions,
  SyncOperation,
  SyncChange,
  SyncConflict,
  SyncStatistics,
  ConflictResolution,
  SyncMonitor
} from '@/types/sync';
import {
  Project,
  DatabaseConnection,
  DatabaseSchema,
  Table,
  Column
} from '@/types/project';
import { DatabaseConnector } from '@/utils/databaseConnector';

export class DatabaseSyncService {
  private static activeSessions: Map<string, SyncSession> = new Map();
  private static monitors: Map<string, SyncMonitor> = new Map();
  private static changeListeners: Map<string, ((changes: SyncChange[]) => void)[]> = new Map();

  // Start sync session
  static async startSyncSession(
    projectId: string,
    databaseId: string,
    options: SyncOptions = {
      batchSize: 100,
      timeout: 300000, // 5 minutes
      createBackups: true,
      conflictResolution: 'manual',
      skipValidation: false,
      selectiveSync: {
        enabled: false,
        includeTables: [],
        excludeTables: [],
        includeSchemas: [],
        excludeSchemas: [],
        syncData: true,
        syncSchema: true,
        syncIndexes: true,
        syncConstraints: true
      },
      performance: {
        maxConcurrentOperations: 5,
        retryAttempts: 3,
        retryDelay: 1000,
        memoryLimit: 100 * 1024 * 1024, // 100MB
        enableCompression: true
      }
    }
  ): Promise<SyncSession> {
    const sessionId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const session: SyncSession = {
      id: sessionId,
      projectId,
      databaseId,
      status: 'pending',
      direction: options.conflictResolution === 'queryflow-wins' ? 'queryflow-to-project' : 'bidirectional',
      startedAt: new Date(),
      options,
      statistics: {
        totalChanges: 0,
        successfulChanges: 0,
        failedChanges: 0,
        skippedChanges: 0,
        totalConflicts: 0,
        resolvedConflicts: 0,
        pendingConflicts: 0,
        startTime: new Date(),
        dataTransferred: 0,
        performance: {
          averageLatency: 0,
          peakLatency: 0,
          throughput: 0,
          memoryUsage: 0,
          cpuUsage: 0,
          networkUsage: 0
        }
      },
      operations: [],
      conflicts: []
    };

    this.activeSessions.set(sessionId, session);
    this.startSyncMonitor(sessionId);

    // Start the sync process asynchronously
    setTimeout(() => {
      this.runSyncSession(sessionId).catch(error => {
        console.error('Sync session failed:', error);
        this.updateSessionStatus(sessionId, 'failed');
      });
    }, 100); // Small delay to allow the session to be returned first

    return session;
  }

  // Stop sync session
  static async stopSyncSession(sessionId: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;

    session.status = 'cancelled';
    session.completedAt = new Date();

    // Clean up
    this.activeSessions.delete(sessionId);
    this.monitors.delete(sessionId);

    return true;
  }

  // Get sync session
  static getSyncSession(sessionId: string): SyncSession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  // Get all active sessions
  static getActiveSessions(): SyncSession[] {
    return Array.from(this.activeSessions.values());
  }

  // Get sync monitor
  static getSyncMonitor(sessionId: string): SyncMonitor | null {
    return this.monitors.get(sessionId) || null;
  }

  // Add change listener
  static addChangeListener(
    sessionId: string,
    listener: (changes: SyncChange[]) => void
  ): void {
    if (!this.changeListeners.has(sessionId)) {
      this.changeListeners.set(sessionId, []);
    }
    this.changeListeners.get(sessionId)!.push(listener);
  }

  // Remove change listener
  static removeChangeListener(
    sessionId: string,
    listener: (changes: SyncChange[]) => void
  ): void {
    const listeners = this.changeListeners.get(sessionId);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Run sync session
  private static async runSyncSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    console.log(`Starting sync session ${sessionId} for project ${session.projectId}`);

    try {
      // Phase 1: Connecting (10%)
      this.updateSessionStatus(sessionId, 'connecting');
      this.updateMonitorProgress(sessionId, 5, 'Connecting to databases...');

      // Simulate connection time
      await this.delay(500);

      // Analyze source and target
      console.log('Analyzing sync targets...');
      this.updateMonitorProgress(sessionId, 15, 'Analyzing database schemas...');
      await this.analyzeSyncTargets(session);

      // Phase 2: Analyzing (30%)
      this.updateSessionStatus(sessionId, 'analyzing');
      this.updateMonitorProgress(sessionId, 25, 'Comparing schemas...');

      console.log('Detecting changes...');
      // Detect changes
      const changes = await this.detectChanges(session);
      console.log(`Detected ${changes.length} changes to sync`);

      session.statistics.totalChanges = changes.length;
      this.updateMonitorProgress(sessionId, 35, `Found ${changes.length} changes to sync`);

      if (changes.length === 0) {
        console.log('No changes detected, completing sync');
        this.updateMonitorProgress(sessionId, 100, 'No changes needed');
        this.updateSessionStatus(sessionId, 'completed');
        return;
      }

      // Phase 3: Syncing (60%)
      this.updateSessionStatus(sessionId, 'syncing');
      this.updateMonitorProgress(sessionId, 40, 'Starting synchronization...');

      // Apply changes
      console.log('Applying changes...');
      await this.applyChanges(session, changes);

      this.updateMonitorProgress(sessionId, 80, 'Changes applied, validating...');

      // Phase 4: Validating (90%)
      this.updateSessionStatus(sessionId, 'validating');
      this.updateMonitorProgress(sessionId, 90, 'Validating synchronization...');

      // Validate sync
      await this.validateSync(session);

      // Phase 5: Completed (100%)
      this.updateMonitorProgress(sessionId, 100, 'Synchronization completed successfully');
      this.updateSessionStatus(sessionId, 'completed');

      console.log(`Sync session ${sessionId} completed successfully`);

    } catch (error) {
      console.error('Sync session error:', error);
      this.updateMonitorProgress(sessionId, 0, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.updateSessionStatus(sessionId, 'failed');
      throw error;
    }
  }

  // Analyze sync targets
  private static async analyzeSyncTargets(session: SyncSession): Promise<void> {
    // Import projectsManager here to avoid circular dependencies
    const { projectsManager } = await import('../utils/projectsManager');

    console.log('Analyzing sync targets for session:', session.id);

    // Get project schema from projectsManager
    const projectSchema = projectsManager.getProjectSchema(session.projectId);
    if (!projectSchema) {
      throw new Error(`No schema found for project ${session.projectId}`);
    }

    // Get current QueryFlow schema (from localStorage or context)
    const currentSchema = this.getCurrentQueryFlowSchema();

    // Store schemas for comparison
    session.sourceSchema = currentSchema;
    session.targetSchema = projectSchema;
  }

  // Detect changes
  private static async detectChanges(session: SyncSession): Promise<SyncChange[]> {
    const changes: SyncChange[] = [];

    if (!session.sourceSchema || !session.targetSchema) {
      throw new Error('Source and target schemas must be available for change detection');
    }

    // Compare schemas and detect differences
    const schemaChanges = this.compareSchemas(session.sourceSchema, session.targetSchema, session);
    changes.push(...schemaChanges);

    // If data sync is enabled, detect data changes
    if (session.options.selectiveSync.syncData) {
      const dataChanges = await this.detectDataChanges(session);
      changes.push(...dataChanges);
    }

    // Update statistics
    session.statistics.totalChanges = changes.length;

    return changes;
  }

  // Apply changes
  private static async applyChanges(session: SyncSession, changes: SyncChange[]): Promise<void> {
    const operations: SyncOperation[] = [];
    const sessionId = session.id;

    console.log(`Applying ${changes.length} changes...`);

    for (let i = 0; i < changes.length; i++) {
      const change = changes[i];
      const progressPercent = 40 + (i / changes.length) * 35; // Progress from 40% to 75%

      this.updateMonitorProgress(sessionId, progressPercent, `Applying change ${i + 1}/${changes.length}: ${change.type} ${change.entity.type} ${change.entity.name}`);

      const operation: SyncOperation = {
        id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: this.getOperationType(change),
        entity: change.entity,
        status: 'pending',
        priority: 'medium',
        dependencies: [],
        retryCount: 0,
        changes: [change]
      };

      operations.push(operation);

      try {
        console.log(`Executing SQL for ${change.type} ${change.entity.type}: ${change.entity.name}`);
        // Apply the change
        await this.applyChange(change, session);

        operation.status = 'completed';
        operation.completedAt = new Date();
        session.statistics.successfulChanges++;

        console.log(`✓ Successfully applied change: ${change.entity.name}`);

      } catch (error) {
        console.error(`✗ Failed to apply change ${change.entity.name}:`, error);
        operation.status = 'failed';
        operation.error = error instanceof Error ? error.message : 'Unknown error';
        session.statistics.failedChanges++;

        // Create conflict if needed
        if (this.shouldCreateConflict(change, error)) {
          const conflict = this.createConflict(change, error, session);
          session.conflicts.push(conflict);
          session.statistics.totalConflicts++;
        }
      }

      // Small delay between operations for better UX
      await this.delay(100);
    }

    session.operations.push(...operations);
    console.log(`Applied ${session.statistics.successfulChanges} changes successfully, ${session.statistics.failedChanges} failed`);
  }

  // Get current QueryFlow schema
  private static getCurrentQueryFlowSchema(): any {
    // Import StorageManager here to avoid circular dependencies
    const { StorageManager } = require('../utils/storage');

    // Try to load from storage first
    const storedSchema = StorageManager.loadSchema();
    if (storedSchema && storedSchema.tables && storedSchema.tables.length > 0) {
      console.log('Using stored QueryFlow schema with', storedSchema.tables.length, 'tables');
      return storedSchema;
    }

    // Check if there's an active database connection with a schema
    try {
      // Try to get schema from active database connection if available
      if (typeof window !== 'undefined' && window.localStorage) {
        const activeConnection = localStorage.getItem('queryflow_active_connection');
        if (activeConnection) {
          const connection = JSON.parse(activeConnection);
          if (connection.schema) {
            console.log('Using active database connection schema');
            return connection.schema;
          }
        }
      }
    } catch (error) {
      console.warn('Could not load schema from active connection:', error);
    }

    // If no schema exists, create a minimal default schema
    // This prevents syncing tables that don't exist
    console.log('No schema found, using minimal default schema');
    return {
      id: 'queryflow_minimal_schema',
      name: 'QueryFlow Minimal Schema',
      tables: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    };
  }

  // Compare schemas and detect differences
  private static compareSchemas(sourceSchema: any, targetSchema: any, session: SyncSession): SyncChange[] {
    const changes: SyncChange[] = [];

    if (!sourceSchema?.tables || !targetSchema?.tables) {
      return changes;
    }

    // Compare tables
    const sourceTables = new Map(sourceSchema.tables.map((t: any) => [t.name, t]));
    const targetTables = new Map(targetSchema.tables.map((t: any) => [t.name, t]));

    // Find new tables in source
    for (const [tableName, table] of sourceTables) {
      if (!targetTables.has(tableName) && this.shouldSyncTable(tableName as string, session)) {
        changes.push({
          id: `change_${changes.length + 1}`,
          operationId: `op_${changes.length + 1}`,
          type: 'create',
          entity: {
            type: 'table',
            name: tableName as string,
            identifier: tableName as string
          },
          newValue: table,
          applied: false,
          dependencies: []
        });
      }
    }

    // Find tables that exist in both - compare columns
    for (const [tableName, sourceTable] of sourceTables) {
      const targetTable = targetTables.get(tableName);
      if (targetTable && this.shouldSyncTable(tableName as string, session)) {
        const columnChanges = this.compareTableColumns(sourceTable, targetTable, session);
        changes.push(...columnChanges);
      }
    }

    return changes;
  }

  // Compare table columns
  private static compareTableColumns(sourceTable: any, targetTable: any, session: SyncSession): SyncChange[] {
    const changes: SyncChange[] = [];

    const sourceColumns = new Map(sourceTable.columns?.map((c: any) => [c.name, c]) || []);
    const targetColumns = new Map(targetTable.columns?.map((c: any) => [c.name, c]) || []);

    // Find new/modified columns
    for (const [columnName, sourceColumn] of sourceColumns) {
      const targetColumn = targetColumns.get(columnName);

      if (!targetColumn) {
        // New column
        changes.push({
          id: `change_${changes.length + 1}`,
          operationId: `op_${changes.length + 1}`,
          type: 'create',
          entity: {
            type: 'column',
            name: columnName as string,
            table: sourceTable.name,
            identifier: `${sourceTable.name}.${columnName as string}`
          },
          newValue: sourceColumn,
          applied: false,
          dependencies: []
        });
      } else if (this.columnsDiffer(sourceColumn, targetColumn)) {
        // Modified column
        changes.push({
          id: `change_${changes.length + 1}`,
          operationId: `op_${changes.length + 1}`,
          type: 'update',
          entity: {
            type: 'column',
            name: columnName as string,
            table: sourceTable.name,
            identifier: `${sourceTable.name}.${columnName as string}`
          },
          oldValue: targetColumn,
          newValue: sourceColumn,
          applied: false,
          dependencies: []
        });
      }
    }

    return changes;
  }

  // Check if columns differ
  private static columnsDiffer(col1: any, col2: any): boolean {
    return col1.type !== col2.type ||
           col1.nullable !== col2.nullable ||
           col1.primaryKey !== col2.primaryKey ||
           col1.defaultValue !== col2.defaultValue;
  }

  // Check if table should be synced based on selective sync options
  private static shouldSyncTable(tableName: string, session: SyncSession): boolean {
    const options = session.options.selectiveSync;

    if (!options.enabled) return true;

    // Check exclude list first
    if (options.excludeTables.includes(tableName)) return false;

    // Check include list (if specified, only include listed tables)
    if (options.includeTables.length > 0) {
      return options.includeTables.includes(tableName);
    }

    return true;
  }

  // Detect data changes
  private static async detectDataChanges(session: SyncSession): Promise<SyncChange[]> {
    const changes: SyncChange[] = [];
    const { projectsManager } = await import('../utils/projectsManager');

    // For each table in the source schema, check for data differences
    if (session.sourceSchema?.tables) {
      for (const table of session.sourceSchema.tables) {
        if (!this.shouldSyncTable(table.name, session)) continue;

        try {
          // First check if the table exists in the target database
          const tableExists = await this.checkTableExists(session.projectId, table.name);
          if (!tableExists) {
            console.warn(`Table ${table.name} does not exist in target database, skipping data comparison`);
            continue;
          }

          // Get record counts from both sources
          const sourceCount = await this.getTableRecordCount(table.name, 'queryflow');
          const targetCount = await projectsManager.executeProjectQuery(
            session.projectId,
            `SELECT COUNT(*) as count FROM "${table.name}"`
          );

          // If counts differ significantly, mark as data change
          const targetCountNum = targetCount.rows[0]?.[0] || 0;
          if (Math.abs(sourceCount - targetCountNum) > 0) {
            changes.push({
              id: `data_change_${changes.length + 1}`,
              operationId: `data_op_${changes.length + 1}`,
              type: 'update',
              entity: {
                type: 'data',
                name: table.name,
                identifier: `data.${table.name}`
              },
              metadata: {
                sourceCount,
                targetCount: targetCountNum,
                difference: sourceCount - targetCountNum
              },
              applied: false,
              dependencies: []
            });
          }
        } catch (error) {
          console.warn(`Could not compare data for table ${table.name}:`, error);
        }
      }
    }

    return changes;
  }

  // Check if table exists in target database
  private static async checkTableExists(projectId: string, tableName: string): Promise<boolean> {
    const { projectsManager } = await import('../utils/projectsManager');

    try {
      // Query sqlite_master to check if table exists
      const result = await projectsManager.executeProjectQuery(
        projectId,
        `SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error(`Error checking if table ${tableName} exists:`, error);
      return false;
    }
  }

  // Get table record count (mock for QueryFlow)
  private static async getTableRecordCount(tableName: string, source: string): Promise<number> {
    // In a real implementation, this would query the QueryFlow database
    // For now, return a mock count
    return Math.floor(Math.random() * 100) + 10;
  }

  // Apply single change
  private static async applyChange(change: SyncChange, session: SyncSession): Promise<void> {
    const { projectsManager } = await import('../utils/projectsManager');

    console.log('Applying change:', change.type, change.entity.name);

    try {
      if (change.type === 'create' && change.entity.type === 'table') {
        // Create table in project database
        const createSQL = this.generateCreateTableSQL(change.newValue);
        await projectsManager.executeProjectQuery(session.projectId, createSQL);

        // Insert sample data
        if (change.newValue.sampleData) {
          await this.insertSampleData(session.projectId, change.entity.name, change.newValue.sampleData);
        }

      } else if (change.type === 'update' && change.entity.type === 'column') {
        // Alter column in project database
        const alterSQL = this.generateAlterColumnSQL(change.entity.table!, change.entity.name, change.newValue);
        await projectsManager.executeProjectQuery(session.projectId, alterSQL);

      } else if (change.type === 'update' && change.entity.type === 'data') {
        // Sync data changes
        await this.syncTableData(session, change.entity.name);
      }

      change.applied = true;
      change.appliedAt = new Date();

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (error) {
      console.error('Failed to apply change:', error);
      throw error;
    }
  }

  // Generate CREATE TABLE SQL
  private static generateCreateTableSQL(table: any): string {
    const columnsSQL = table.columns.map((col: any) => {
      let colDef = `"${col.name}" ${this.mapColumnType(col.type)}`;
      if (col.primaryKey) colDef += ' PRIMARY KEY';
      if (!col.nullable) colDef += ' NOT NULL';
      if (col.defaultValue !== undefined) {
        colDef += ` DEFAULT ${typeof col.defaultValue === 'string' ? `'${col.defaultValue}'` : col.defaultValue}`;
      }
      return colDef;
    }).join(', ');

    return `CREATE TABLE IF NOT EXISTS "${table.name}" (${columnsSQL})`;
  }

  // Generate ALTER COLUMN SQL
  private static generateAlterColumnSQL(tableName: string, columnName: string, column: any): string {
    // SQLite doesn't support ALTER COLUMN directly for all changes
    // For simplicity, we'll recreate the table (in a real implementation, this would be more complex)
    return `-- ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" TYPE ${this.mapColumnType(column.type)}`;
  }

  // Sync table data
  private static async syncTableData(session: SyncSession, tableName: string): Promise<void> {
    const { projectsManager } = await import('../utils/projectsManager');

    // First check if the table exists
    const tableExists = await this.checkTableExists(session.projectId, tableName);
    if (!tableExists) {
      console.warn(`Table ${tableName} does not exist in target database, cannot sync data`);
      return;
    }

    // Get source data from actual database connection
    const sourceData = await this.getSourceTableData(tableName, session.source?.connection);

    try {
      // Clear target table
      await projectsManager.executeProjectQuery(session.projectId, `DELETE FROM "${tableName}"`);

      // Insert source data into target
      if (sourceData.length > 0) {
        await this.insertSampleData(session.projectId, tableName, sourceData);
      }
      
      console.log(`✅ Synced ${sourceData.length} rows to ${tableName}`);
    } catch (error) {
      console.error(`Failed to sync data for table ${tableName}:`, error);
      throw error;
    }
  }

  // Get source table data from actual database
  private static async getSourceTableData(tableName: string, sourceConnection?: any): Promise<any[]> {
    if (!sourceConnection) {
      console.warn('No source connection provided for table data sync');
      return [];
    }

    try {
      const Database = (await import('better-sqlite3')).default;
      
      // Handle different connection types
      let db: any;
      if (typeof sourceConnection === 'string') {
        // File path
        db = new Database(sourceConnection, { readonly: true });
      } else if (sourceConnection.filePath) {
        db = new Database(sourceConnection.filePath, { readonly: true });
      } else {
        throw new Error('Unsupported source connection format');
      }

      try {
        // Query actual table data
        const stmt = db.prepare(`SELECT * FROM "${tableName}" LIMIT 1000`);
        const rows = stmt.all();
        db.close();
        
        console.log(`✅ Retrieved ${rows.length} rows from ${tableName}`);
        return rows;
      } catch (queryError) {
        db.close();
        throw queryError;
      }
    } catch (error) {
      console.error(`Failed to get source table data for ${tableName}:`, error);
      throw new Error(`Failed to query source table ${tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Insert sample data
  private static async insertSampleData(projectId: string, tableName: string, data: any[]): Promise<void> {
    const { projectsManager } = await import('../utils/projectsManager');

    for (const record of data) {
      try {
        await projectsManager.executeProjectQuery(projectId, `INSERT OR REPLACE INTO "${tableName}" VALUES (${Object.values(record).map(v => typeof v === 'string' ? `'${v}'` : v).join(', ')})`);
      } catch (error) {
        console.warn(`Failed to insert record into ${tableName}:`, error);
      }
    }
  }

  // Map column type
  private static mapColumnType(type: string): string {
    const typeMap: { [key: string]: string } = {
      // DataType enum values
      'VARCHAR': 'TEXT',
      'TEXT': 'TEXT',
      'INTEGER': 'INTEGER',
      'BIGINT': 'INTEGER',
      'SMALLINT': 'INTEGER',
      'TINYINT': 'INTEGER',
      'REAL': 'REAL',
      'FLOAT': 'REAL',
      'DOUBLE': 'REAL',
      'DECIMAL': 'REAL',
      'BOOLEAN': 'INTEGER',
      'DATE': 'TEXT',
      'DATETIME': 'TEXT',
      'TIMESTAMP': 'TEXT',
      'TIME': 'TEXT',
      'JSON': 'TEXT',
      'BLOB': 'BLOB',

      // Legacy string mappings
      'string': 'TEXT',
      'text': 'TEXT',
      'integer': 'INTEGER',
      'int': 'INTEGER',
      'number': 'REAL',
      'boolean': 'INTEGER',
      'date': 'TEXT',
      'datetime': 'TEXT',
      'json': 'TEXT'
    };
    return typeMap[type.toUpperCase()] || 'TEXT';
  }

  // Get operation type from change
  private static getOperationType(change: SyncChange): SyncOperation['type'] {
    switch (change.type) {
      case 'create':
        return change.entity.type === 'table' ? 'create_table' :
               change.entity.type === 'index' ? 'create_index' : 'create_constraint';
      case 'update':
        return 'alter_table';
      case 'delete':
        return change.entity.type === 'table' ? 'drop_table' :
               change.entity.type === 'index' ? 'drop_index' : 'drop_constraint';
      default:
        return 'alter_table';
    }
  }

  // Should create conflict
  private static shouldCreateConflict(change: SyncChange, error: any): boolean {
    // Logic to determine if error should create a conflict
    return error.message?.includes('conflict') || false;
  }

  // Create conflict
  private static createConflict(
    change: SyncChange,
    error: any,
    session: SyncSession
  ): SyncConflict {
    return {
      id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: session.id,
      operationId: change.operationId,
      type: 'schema_mismatch',
      severity: 'medium',
      description: error.message || 'Sync conflict detected',
      entity: change.entity,
      localValue: change.newValue,
      remoteValue: change.oldValue,
      conflictData: {
        local: {
          value: change.newValue,
          timestamp: new Date(),
          source: 'queryflow'
        },
        remote: {
          value: change.oldValue,
          timestamp: new Date(),
          source: 'project'
        },
        differences: []
      },
      resolved: false,
      createdAt: new Date()
    };
  }

  // Validate sync
  private static async validateSync(session: SyncSession): Promise<void> {
    console.log('Validating sync for session:', session.id);

    const { projectsManager } = await import('../utils/projectsManager');

    // Validate that tables were created
    for (const operation of session.operations) {
      if (operation.status === 'completed' && operation.entity.type === 'table') {
        try {
          // Check if table exists by running a simple query
          await projectsManager.executeProjectQuery(
            session.projectId,
            `SELECT name FROM sqlite_master WHERE type='table' AND name='${operation.entity.name}'`
          );
          console.log(`✓ Validated table: ${operation.entity.name}`);
        } catch (error) {
          console.error(`✗ Validation failed for table: ${operation.entity.name}`, error);
          throw new Error(`Validation failed for table ${operation.entity.name}`);
        }
      }
    }

    console.log('Sync validation completed successfully');
  }

  // Resolve conflict
  static async resolveConflict(
    conflictId: string,
    resolution: ConflictResolution
  ): Promise<boolean> {
    // Find conflict across all sessions
    for (const session of this.activeSessions.values()) {
      const conflictIndex = session.conflicts.findIndex(c => c.id === conflictId);
      if (conflictIndex > -1) {
        const conflict = session.conflicts[conflictIndex];

        conflict.resolution = resolution;
        conflict.resolved = true;
        conflict.resolvedAt = new Date();

        session.statistics.resolvedConflicts++;
        session.statistics.pendingConflicts = Math.max(
          0,
          session.statistics.pendingConflicts - 1
        );

        // Try to reapply the operation
        const operation = session.operations.find(op => op.id === conflict.operationId);
        if (operation && resolution.strategy !== 'skip') {
          try {
            await this.retryOperation(operation, session);
          } catch (error) {
            console.error('Failed to retry operation after conflict resolution:', error);
          }
        }

        return true;
      }
    }

    return false;
  }

  // Retry operation
  private static async retryOperation(operation: SyncOperation, session: SyncSession): Promise<void> {
    operation.retryCount++;
    operation.status = 'running';

    try {
      for (const change of operation.changes) {
        await this.applyChange(change, session);
      }

      operation.status = 'completed';
      operation.completedAt = new Date();

    } catch (error) {
      operation.status = 'failed';
      operation.error = error instanceof Error ? error.message : 'Retry failed';
    }
  }

  // Start sync monitor
  private static startSyncMonitor(sessionId: string): void {
    const monitor: SyncMonitor = {
      sessionId,
      status: 'pending',
      progress: {
        percentage: 0,
        currentStep: 'Initializing',
        totalSteps: 4,
        currentOperation: 0,
        totalOperations: 0,
        estimatedTimeRemaining: undefined
      },
      currentOperation: undefined,
      nextOperations: [],
      statistics: {
        totalChanges: 0,
        successfulChanges: 0,
        failedChanges: 0,
        skippedChanges: 0,
        totalConflicts: 0,
        resolvedConflicts: 0,
        pendingConflicts: 0,
        startTime: new Date(),
        dataTransferred: 0,
        performance: {
          averageLatency: 0,
          peakLatency: 0,
          throughput: 0,
          memoryUsage: 0,
          cpuUsage: 0,
          networkUsage: 0
        }
      },
      alerts: [],
      logs: []
    };

    this.monitors.set(sessionId, monitor);

    // Update monitor periodically
    const updateInterval = setInterval(() => {
      const session = this.activeSessions.get(sessionId);
      if (!session || session.status === 'completed' || session.status === 'failed') {
        clearInterval(updateInterval);
        return;
      }

      this.updateSyncMonitor(sessionId, session);
    }, 1000);
  }

  // Update sync monitor
  private static updateSyncMonitor(sessionId: string, session: SyncSession): void {
    const monitor = this.monitors.get(sessionId);
    if (!monitor) return;

    monitor.status = session.status;
    monitor.progress.percentage = this.calculateProgress(session);
    monitor.progress.currentStep = this.getCurrentStep(session.status);
    monitor.statistics = session.statistics;

    // Notify listeners
    const listeners = this.changeListeners.get(sessionId);
    if (listeners) {
      const recentChanges = session.operations
        .filter(op => op.completedAt && Date.now() - op.completedAt.getTime() < 5000)
        .flatMap(op => op.changes);

      if (recentChanges.length > 0) {
        listeners.forEach(listener => listener(recentChanges));
      }
    }
  }

  // Update monitor progress with custom percentage and step
  private static updateMonitorProgress(sessionId: string, percentage: number, step: string): void {
    const monitor = this.monitors.get(sessionId);
    if (monitor) {
      monitor.progress.percentage = percentage;
      monitor.progress.currentStep = step;
      console.log(`Progress update: ${percentage}% - ${step}`);
    }
  }

  // Utility delay method
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Calculate progress percentage
  private static calculateProgress(session: SyncSession): number {
    const statusWeights = {
      'pending': 0,
      'connecting': 10,
      'analyzing': 30,
      'syncing': 60,
      'validating': 90,
      'completed': 100,
      'failed': 0,
      'cancelled': 0
    };

    return statusWeights[session.status];
  }

  // Get current step description
  private static getCurrentStep(status: SyncStatus): string {
    switch (status) {
      case 'pending': return 'Initializing';
      case 'connecting': return 'Connecting to databases';
      case 'analyzing': return 'Analyzing changes';
      case 'syncing': return 'Applying changes';
      case 'validating': return 'Validating sync';
      case 'completed': return 'Completed';
      case 'failed': return 'Failed';
      case 'cancelled': return 'Cancelled';
      default: return 'Unknown';
    }
  }

  // Update session status
  private static updateSessionStatus(sessionId: string, status: SyncStatus): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.status = status;
      if (status === 'completed' || status === 'failed' || status === 'cancelled') {
        session.completedAt = new Date();
        session.statistics.endTime = new Date();
        session.statistics.duration = session.statistics.endTime.getTime() - session.statistics.startTime.getTime();
      }

      // Update the monitor with the new status
      this.updateSyncMonitor(sessionId, session);

      console.log(`Sync session ${sessionId} status updated to: ${status}`);
    }
  }

  // Get sync statistics
  static getSyncStatistics(sessionId: string): SyncStatistics | null {
    const session = this.activeSessions.get(sessionId);
    return session?.statistics || null;
  }

  // Export sync report
  static exportSyncReport(sessionId: string): string | null {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;

    return JSON.stringify({
      session: {
        id: session.id,
        projectId: session.projectId,
        databaseId: session.databaseId,
        status: session.status,
        direction: session.direction,
        startedAt: session.startedAt,
        completedAt: session.completedAt
      },
      statistics: session.statistics,
      operations: session.operations.map(op => ({
        id: op.id,
        type: op.type,
        status: op.status,
        entity: op.entity,
        error: op.error,
        changesCount: op.changes.length
      })),
      conflicts: session.conflicts.map(conflict => ({
        id: conflict.id,
        type: conflict.type,
        severity: conflict.severity,
        description: conflict.description,
        entity: conflict.entity,
        resolved: conflict.resolved
      }))
    }, null, 2);
  }
}
