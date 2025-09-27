// Projects Manager for QueryFlow
// Handles project data, embedded databases, and synchronization

import { Project, Database, Table, Column, DatabaseSchema as ProjectSchema } from '../types/project';
import { DatabaseManager } from './database';
import { DatabaseSchema } from '../types/database';
import { memoryManager } from './memoryManager';
import { dbConnectionManager } from './databaseConnection';

export class ProjectsManager {
  private static instance: ProjectsManager;
  private projects: Map<string, Project> = new Map();
  private currentProject: Project | null = null;
  private eventListeners: Map<string, Array<(data: any) => void>> = new Map();
  private projectDatabases: Map<string, DatabaseManager> = new Map();
  private initialized = false;

  private constructor() {
    // Initialization is now handled in getInstance()
  }

  static getInstance(): ProjectsManager {
    if (!ProjectsManager.instance) {
      ProjectsManager.instance = new ProjectsManager();
      // Only trigger initialization in browser environment
      if (typeof window !== 'undefined') {
        ProjectsManager.instance.initializeIfNeeded();
      }
    }
    return ProjectsManager.instance;
  }

  private async initializeIfNeeded(): Promise<void> {
    if (!this.initialized) {
      try {
        await this.initializeDefaultProjectsAsync();
        this.initialized = true;
      } catch (error) {
        console.error('Failed to initialize projects:', error);
        // Don't rethrow - we don't want to break the app
      }
    }
  }

  private async ensureInitialized(): Promise<void> {
    await this.initializeIfNeeded();
  }

  private async initializeDefaultProjectsAsync(): Promise<void> {
    const defaultProjects: Project[] = [
      {
        id: 'ecommerce-api',
        name: 'E-commerce API',
        description: 'Node.js REST API for e-commerce platform',
        technology: 'Node.js',
        status: 'disconnected', // Start disconnected, will auto-connect
        lastSynced: null,
        databaseCount: 2,
        icon: '📦',
        color: 'orange',
        isExample: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        databases: [
          {
            id: 'ecommerce-main',
            name: 'ecommerce_main',
            type: 'sqlite',
            connectionString: `demo_ecommerce_main_${Date.now()}.db`,
            isConnected: false, // Will be auto-connected
            lastSync: null,
            tables: []
          },
          {
            id: 'ecommerce-analytics',
            name: 'ecommerce_analytics',
            type: 'sqlite',
            connectionString: `demo_ecommerce_analytics_${Date.now()}.db`,
            isConnected: false, // Will be auto-connected
            lastSync: null,
            tables: []
          }
        ],
        schema: this.createEcommerceSchema(),
        tables: [],
        queries: []
      },
      {
        id: 'analytics-dashboard',
        name: 'Data Analytics Dashboard',
        description: 'Python Django application with PostgreSQL',
        technology: 'Django',
        status: 'disconnected', // Start disconnected, will auto-connect
        lastSynced: null,
        databaseCount: 1,
        icon: '🎸',
        color: 'blue',
        isExample: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        databases: [
          {
            id: 'analytics-main',
            name: 'analytics_db',
            type: 'sqlite',
            connectionString: `demo_analytics_${Date.now()}.db`,
            isConnected: false, // Will be auto-connected
            lastSync: null,
            tables: []
          }
        ],
        schema: this.createAnalyticsSchema(),
        tables: [],
        queries: []
      },
      {
        id: 'legacy-php',
        name: 'Legacy PHP System',
        description: 'Old PHP application with MySQL database',
        technology: 'PHP',
        status: 'disconnected', // Start disconnected, will auto-connect
        lastSynced: null,
        databaseCount: 1,
        icon: '🐘',
        color: 'red',
        isExample: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        databases: [
          {
            id: 'legacy-main',
            name: 'legacy_db',
            type: 'sqlite',
            connectionString: `demo_legacy_${Date.now()}.db`,
            isConnected: false, // Will be auto-connected
            lastSync: null,
            tables: []
          }
        ],
        schema: this.createLegacySchema(),
        tables: [],
        queries: []
      }
    ];

    defaultProjects.forEach(project => {
      this.projects.set(project.id, project);
    });

    // Initialize project databases
    await this.initializeProjectDatabases();
  }

  private async initializeProjectDatabases(): Promise<void> {
    for (const project of this.projects.values()) {
      await this.initializeProjectDatabase(project);
    }
  }

  private async initializeProjectDatabase(project: Project): Promise<void> {
    try {
      if (!project.schema) return;

      console.log(`Initializing database for project ${project.id}`);

      // Always create a fresh database instance for this project
      // This ensures no leftover data from previous initializations
      if (this.projectDatabases.has(project.id)) {
        const existingDb = this.projectDatabases.get(project.id);
        if (existingDb) {
          console.log(`Closing existing database instance for project ${project.id}`);
          existingDb.close();
        }
        this.projectDatabases.delete(project.id);
      }

      // Create tables for each database in the project
      for (const database of project.databases) {
        console.log(`Creating tables for database ${database.name} in project ${project.id}`);

        // Convert project schema to database schema
        const dbSchema: DatabaseSchema = {
          id: `project_${project.id}_schema`,
          name: `Project ${project.id} Schema`,
          tables: project.schema.tables as any, // Cast to avoid type mismatch
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1
        };

        // Initialize database with schema
        await this.createDatabaseTables(project.id, database, dbSchema);
      }

      // Populate with sample data
      await this.populateSampleData(project);

      project.status = 'connected';
      this.emitEvent('project_initialized', { projectId: project.id });
      console.log(`Successfully initialized database for project ${project.id}`);
    } catch (error) {
      console.error(`Failed to initialize database for project ${project.id}:`, error);
      project.status = 'error';
      throw error;
    }
  }

  private async createDatabaseTables(projectId: string, database: Database, schema: DatabaseSchema): Promise<void> {
    // Get or create project-specific database instance
    let projectDb = this.projectDatabases.get(projectId);
    if (!projectDb) {
      projectDb = new DatabaseManager();
      this.projectDatabases.set(projectId, projectDb);
    }

    // Convert project schema to database manager schema format
    const dbSchema: DatabaseSchema = {
      id: `project_${projectId}_schema`,
      name: `Project ${projectId} Schema`,
      tables: schema.tables as any, // Cast to avoid type mismatch
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    };

    // Set schema on the project-specific database manager
    projectDb.setSchema(dbSchema);

    // Create tables in the database
    for (const table of schema.tables) {
      const createTableSQL = this.generateCreateTableSQL(table as any);
      try {
        await projectDb.executeQuery(createTableSQL);
      } catch (error) {
        console.error(`Failed to create table ${table.name}:`, error);
      }
    }

    database.tables = schema.tables as any;
  }

  private generateCreateTableSQL(table: Table): string {
    const columnsSQL = table.columns.map(col => {
      let colDef = `${col.name} ${this.mapColumnType(col.type)}`;
      if (col.primaryKey) colDef += ' PRIMARY KEY';
      if (!col.nullable) colDef += ' NOT NULL';
      if (col.defaultValue !== undefined) {
        colDef += ` DEFAULT ${typeof col.defaultValue === 'string' ? `'${col.defaultValue}'` : col.defaultValue}`;
      }
      return colDef;
    }).join(', ');

    return `CREATE TABLE IF NOT EXISTS ${table.name} (${columnsSQL})`;
  }

  private mapColumnType(type: string): string {
    const typeMap: { [key: string]: string } = {
      'string': 'TEXT',
      'text': 'TEXT',
      'integer': 'INTEGER',
      'int': 'INTEGER',
      'number': 'REAL',
      'boolean': 'INTEGER', // SQLite stores booleans as integers
      'date': 'TEXT',
      'datetime': 'TEXT',
      'json': 'TEXT'
    };
    return typeMap[type.toLowerCase()] || 'TEXT';
  }

  private createEcommerceSchema(): ProjectSchema {
    return {
      id: 'ecommerce-schema',
      name: 'E-commerce Schema',
      tables: [
        {
          id: 'users',
          name: 'users',
          rowCount: 0,
          columns: [
            { id: 'id', name: 'id', type: 'INTEGER', nullable: false, primaryKey: true },
            { id: 'email', name: 'email', type: 'TEXT', nullable: false, primaryKey: false },
            { id: 'name', name: 'name', type: 'TEXT', nullable: false, primaryKey: false },
            { id: 'created_at', name: 'created_at', type: 'DATETIME', nullable: false, primaryKey: false }
          ]
        },
        {
          id: 'products',
          name: 'products',
          rowCount: 0,
          columns: [
            { id: 'id', name: 'id', type: 'INTEGER', nullable: false, primaryKey: true },
            { id: 'name', name: 'name', type: 'TEXT', nullable: false, primaryKey: false },
            { id: 'price', name: 'price', type: 'REAL', nullable: false, primaryKey: false },
            { id: 'category', name: 'category', type: 'TEXT', nullable: false, primaryKey: false },
            { id: 'stock', name: 'stock', type: 'INTEGER', nullable: false, primaryKey: false }
          ]
        },
        {
          id: 'orders',
          name: 'orders',
          rowCount: 0,
          columns: [
            { id: 'id', name: 'id', type: 'INTEGER', nullable: false, primaryKey: true },
            { id: 'user_id', name: 'user_id', type: 'INTEGER', nullable: false, primaryKey: false },
            { id: 'total', name: 'total', type: 'REAL', nullable: false, primaryKey: false },
            { id: 'status', name: 'status', type: 'TEXT', nullable: false, primaryKey: false },
            { id: 'created_at', name: 'created_at', type: 'DATETIME', nullable: false, primaryKey: false }
          ]
        }
      ],
      relationships: [
        {
          id: 'order_user',
          fromTable: 'orders',
          toTable: 'users',
          fromColumn: 'user_id',
          toColumn: 'id',
          type: 'one-to-many'
        }
      ],
      indexes: []
    };
  }

  private createAnalyticsSchema(): ProjectSchema {
    return {
      id: 'analytics-schema',
      name: 'Analytics Schema',
      tables: [
        {
          id: 'page_views',
          name: 'page_views',
          rowCount: 0,
          columns: [
            { id: 'id', name: 'id', type: 'INTEGER', nullable: false, primaryKey: true },
            { id: 'page', name: 'page', type: 'TEXT', nullable: false, primaryKey: false },
            { id: 'user_id', name: 'user_id', type: 'INTEGER', nullable: true, primaryKey: false },
            { id: 'timestamp', name: 'timestamp', type: 'DATETIME', nullable: false, primaryKey: false },
            { id: 'duration', name: 'duration', type: 'INTEGER', nullable: false, primaryKey: false }
          ]
        },
        {
          id: 'events',
          name: 'events',
          rowCount: 0,
          columns: [
            { id: 'id', name: 'id', type: 'INTEGER', nullable: false, primaryKey: true },
            { id: 'event_type', name: 'event_type', type: 'TEXT', nullable: false, primaryKey: false },
            { id: 'user_id', name: 'user_id', type: 'INTEGER', nullable: true, primaryKey: false },
            { id: 'data', name: 'data', type: 'JSON', nullable: true, primaryKey: false },
            { id: 'timestamp', name: 'timestamp', type: 'DATETIME', nullable: false, primaryKey: false }
          ]
        }
      ],
      relationships: [],
      indexes: []
    };
  }

  private createLegacySchema(): ProjectSchema {
    return {
      id: 'legacy-schema',
      name: 'Legacy Schema',
      tables: [
        {
          id: 'posts',
          name: 'posts',
          rowCount: 0,
          columns: [
            { id: 'id', name: 'id', type: 'INTEGER', nullable: false, primaryKey: true },
            { id: 'title', name: 'title', type: 'TEXT', nullable: false, primaryKey: false },
            { id: 'content', name: 'content', type: 'TEXT', nullable: false, primaryKey: false },
            { id: 'author', name: 'author', type: 'TEXT', nullable: false, primaryKey: false },
            { id: 'created_date', name: 'created_date', type: 'DATETIME', nullable: false, primaryKey: false }
          ]
        }
      ],
      relationships: [],
      indexes: []
    };
  }

  private async populateSampleData(project: Project): Promise<void> {
    if (!project.schema) return;

    // Get project-specific database instance
    const projectDb = this.projectDatabases.get(project.id);
    if (!projectDb) {
      console.error(`No database instance found for project ${project.id}`);
      return;
    }

    console.log(`Populating sample data for project ${project.id} with ${project.schema.tables.length} tables`);

    for (const table of project.schema.tables) {
      console.log(`Processing table ${table.name} for sample data...`);

      try {
        // Clear any existing data in the table to ensure clean state
        await projectDb.executeQuery(`DELETE FROM "${table.name}"`);
        console.log(`Cleared existing data from table ${table.name}`);
      } catch (error) {
        // Table might not exist or deletion failed, continue with insertion
        console.log(`Could not clear data from ${table.name}, proceeding with sample data:`, error);
      }

      const sampleData = this.generateSampleData(table, project.id);
      console.log(`Generated ${sampleData.length} sample records for table ${table.name}`);

      if (sampleData.length > 0) {
        await this.insertSampleData(project.id, table.name, sampleData);
      } else {
        console.log(`No sample data generated for table ${table.name}`);
      }
    }

    console.log(`Sample data population completed for project ${project.id}`);
  }

  private generateSampleData(table: Table, projectId: string): any[] {
    const sampleData: any[] = [];

    switch (table.name) {
      case 'users':
        sampleData.push(
          { id: 1, email: 'john@example.com', name: 'John Doe', created_at: '2024-01-15T10:00:00Z' },
          { id: 2, email: 'jane@example.com', name: 'Jane Smith', created_at: '2024-01-16T11:00:00Z' },
          { id: 3, email: 'bob@example.com', name: 'Bob Johnson', created_at: '2024-01-17T12:00:00Z' }
        );
        break;
      case 'products':
        sampleData.push(
          { id: 1, name: 'Laptop', price: 999.99, category: 'Electronics', stock: 50 },
          { id: 2, name: 'Book', price: 19.99, category: 'Books', stock: 100 },
          { id: 3, name: 'Chair', price: 149.99, category: 'Furniture', stock: 25 }
        );
        break;
      case 'orders':
        sampleData.push(
          { id: 1, user_id: 1, total: 1019.98, status: 'completed', created_at: '2024-01-18T14:00:00Z' },
          { id: 2, user_id: 2, total: 19.99, status: 'pending', created_at: '2024-01-19T15:00:00Z' }
        );
        break;
      case 'page_views':
        sampleData.push(
          { id: 1, page: '/home', user_id: 1, timestamp: '2024-01-19T10:00:00Z', duration: 120 },
          { id: 2, page: '/products', user_id: 2, timestamp: '2024-01-19T10:05:00Z', duration: 300 },
          { id: 3, page: '/about', user_id: null, timestamp: '2024-01-19T10:10:00Z', duration: 60 }
        );
        break;
      case 'events':
        sampleData.push(
          { id: 1, event_type: 'click', user_id: 1, data: '{"element": "button", "page": "/home"}', timestamp: '2024-01-19T10:00:00Z' },
          { id: 2, event_type: 'purchase', user_id: 2, data: '{"product": "Laptop", "amount": 999.99}', timestamp: '2024-01-19T10:05:00Z' }
        );
        break;
      case 'posts':
        sampleData.push(
          { id: 1, title: 'Welcome Post', content: 'This is the first post', author: 'Admin', created_date: '2024-01-15T10:00:00Z' },
          { id: 2, title: 'Update', content: 'System update completed', author: 'Admin', created_date: '2024-01-16T11:00:00Z' }
        );
        break;
    }

    return sampleData;
  }

  private async insertSampleData(projectId: string, tableName: string, data: any[]): Promise<void> {
    const projectDb = this.projectDatabases.get(projectId);
    if (!projectDb) {
      console.error(`No database instance found for project ${projectId}`);
      return;
    }

    console.log(`Inserting ${data.length} sample records into ${tableName} for project ${projectId}`);

    for (const record of data) {
      if (!record || typeof record !== 'object' || Object.keys(record).length === 0) {
        console.warn(`Skipping invalid record for table ${tableName}:`, record);
        continue;
      }

      try {
        console.log(`Inserting record into ${tableName}:`, record);
        await projectDb.insertRecord(tableName, record);
        console.log(`Successfully inserted record into ${tableName}`);
      } catch (error) {
        console.error(`Failed to insert sample data into ${tableName}:`, error);
        console.error('Record data:', record);

        // For UNIQUE constraint errors, try to continue with other records
        if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
          console.warn(`UNIQUE constraint violation for table ${tableName}, continuing with other records`);
        } else {
          // For other errors, re-throw to stop the process
          throw error;
        }
      }
    }

    console.log(`Completed sample data insertion for ${tableName}`);
  }

  // Public methods
  async getAllProjects(): Promise<Project[]> {
    try {
      console.log('🔄 ProjectsManager: Initializing app data...');
      await dbConnectionManager.initializeAppData();
      
      console.log('📁 ProjectsManager: Getting persisted projects...');
      const persistedProjects = await dbConnectionManager.getAllProjects();
      console.log('📊 ProjectsManager: Found persisted projects:', persistedProjects.length);

      // Convert persisted projects to Project type
      const projects: Project[] = persistedProjects.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        technology: p.technology,
        status: p.status,
        lastSynced: p.lastSynced,
        databaseCount: p.databaseCount,
        icon: p.icon,
        color: p.color,
        isExample: p.isExample,
        databases: [], // Will be loaded separately
        schema: p.schema,
        tables: p.schema?.tables || [],
        queries: [],
        createdAt: p.createdAt || new Date(),
        updatedAt: p.updatedAt || new Date()
      }));

      console.log('🔄 ProjectsManager: Loading databases for each project...');
      // Load databases for each project
      for (const project of projects) {
        try {
          console.log(`📊 ProjectsManager: Loading databases for project ${project.id}...`);
          const databases = await dbConnectionManager.getProjectDatabases(project.id);
          console.log(`📊 ProjectsManager: Found ${databases.length} databases for project ${project.id}`);
          
          project.databases = databases.map(db => ({
            id: db.id,
            name: db.name,
            type: db.type,
            connectionString: db.connectionString,
            isConnected: db.isConnected,
            lastSync: db.lastSync,
            tables: db.tables
          }));
          project.databaseCount = databases.length;
        } catch (error) {
          console.warn(`❌ ProjectsManager: Failed to load databases for project ${project.id}:`, error);
        }
      }

      console.log('✅ ProjectsManager: Returning projects:', projects.length);
      return projects;
    } catch (error) {
      console.error('❌ ProjectsManager: Failed to get projects from persistent storage:', error);
      // Fallback to empty array
      return [];
    }
  }

  async getProject(projectId: string): Promise<Project | null> {
    try {
      await dbConnectionManager.initializeAppData();
      const persistedProject = await dbConnectionManager.getProject(projectId);

      if (!persistedProject) return null;

      // Load databases for the project
      const databases = await dbConnectionManager.getProjectDatabases(projectId);

      return {
        id: persistedProject.id,
        name: persistedProject.name,
        description: persistedProject.description,
        technology: persistedProject.technology,
        status: persistedProject.status,
        lastSynced: persistedProject.lastSynced,
        databaseCount: databases.length,
        icon: persistedProject.icon,
        color: persistedProject.color,
        isExample: persistedProject.isExample,
        databases: databases.map(db => ({
          id: db.id,
          name: db.name,
          type: db.type,
          connectionString: db.connectionString,
          isConnected: db.isConnected,
          lastSync: db.lastSync,
          tables: db.tables
        })),
        schema: persistedProject.schema,
        tables: persistedProject.schema?.tables || [],
        queries: [],
        createdAt: persistedProject.createdAt || new Date(),
        updatedAt: persistedProject.updatedAt || new Date()
      };
    } catch (error) {
      console.error(`Failed to get project ${projectId}:`, error);
      return null;
    }
  }

  getCurrentProject(): Project | null {
    return this.currentProject;
  }

  async syncProject(projectId: string): Promise<boolean> {
    const project = await this.getProject(projectId);
    if (!project) return false;

    try {
      project.status = 'syncing';
      this.emitEvent('project_sync_start', { projectId });

      if (project.isExample) {
        // Handle example project - create actual database connection
        await this.initializeProjectDatabase(project);

        // Update database connection status
        project.databases.forEach(db => {
          db.isConnected = true;
          db.lastSync = new Date().toISOString();
        });
      } else {
        // Simulate sync process for real projects
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Update sync timestamp
      project.lastSynced = new Date();
      project.status = 'connected';

      // Set as current project
      this.currentProject = project;

      // Update database counts
      project.databaseCount = project.databases.filter(db => db.isConnected).length;

      // Save updated project to persistent storage
      await dbConnectionManager.saveProject(project);

      this.emitEvent('project_sync_complete', { projectId, project });
      return true;
    } catch (error) {
      console.error(`Failed to sync project ${projectId}:`, error);
      if (project) {
        project.status = 'error';
        await dbConnectionManager.saveProject(project);
      }
      this.emitEvent('project_sync_error', { projectId, error });
      return false;
    }
  }

  async disconnectProject(): Promise<void> {
    if (this.currentProject) {
      const projectId = this.currentProject.id;
      this.currentProject.status = 'disconnected';
      this.currentProject = null;
      this.emitEvent('project_disconnected', { projectId });
    }
  }

  // Get project database schema
  getProjectSchema(projectId: string): ProjectSchema | null {
    const project = this.projects.get(projectId);
    return project?.schema || null;
  }

  // Get project tables
  getProjectTables(projectId: string): Table[] {
    const project = this.projects.get(projectId);
    if (!project) return [];

    // If tables are not loaded, load them from databases
    if (!project.tables || project.tables.length === 0) {
      const allTables: Table[] = [];
      project.databases.forEach(db => {
        allTables.push(...db.tables);
      });
      project.tables = allTables;
    }

    return project.tables || [];
  }

  // Execute query on project database
  async executeProjectQuery(projectId: string, sql: string, params: any[] = []): Promise<any> {
    await this.ensureInitialized();
    
    const project = this.projects.get(projectId);
    if (!project) {
      console.error(`ProjectsManager: Project ${projectId} not found in local projects map`);
      console.log('Available projects:', Array.from(this.projects.keys()));
      
      // Try to load the project from the API
      try {
        const response = await fetch(`/api/projects/${projectId}`);
        if (response.ok) {
          const projectData = await response.json();
          if (projectData.success && projectData.data) {
            console.log('ProjectsManager: Successfully loaded project from API, adding to local map');
            this.projects.set(projectId, projectData.data);
            // Continue with the query
          } else {
            throw new Error('Project not found in API response');
          }
        } else {
          throw new Error(`Failed to load project: ${response.status}`);
        }
      } catch (apiError) {
        console.error('ProjectsManager: Failed to load project from API:', apiError);
        throw new Error('Project not found');
      }
    }

    // Get project-specific database instance
    const projectDb = this.projectDatabases.get(projectId);
    if (!projectDb) {
      console.warn(`ProjectsManager: No database instance found for project ${projectId}`);
      
      // Check if this is a schema-only project (no actual database connection)
      const project = this.projects.get(projectId);
      if (project && project.schema && !project.databasePath) {
        console.log(`ProjectsManager: Project ${projectId} is schema-only, cannot execute queries`);
        // Return a mock result for schema-only projects
        return {
          rows: [],
          columns: [],
          rowCount: 0,
          message: 'Schema-only project - no database connection available'
        };
      }
      
      // For projects with actual database files, we would create a connection here
      // For now, return an empty result instead of throwing an error
      console.warn(`ProjectsManager: Cannot execute query on project ${projectId} - no database connection available`);
      return {
        rows: [],
        columns: [],
        rowCount: 0,
        message: 'No database connection available for this project'
      };
    }

    return await projectDb.executeQuery(sql, params);
  }

  // Event system
  private emitEvent(eventType: string, data: any): void {
    const listeners = this.eventListeners.get(eventType) || [];
    listeners.forEach(listener => listener(data));
  }

  addEventListener(eventType: string, listener: (data: any) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  removeEventListener(eventType: string, listener: (data: any) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Cleanup
  cleanup(): void {
    this.eventListeners.clear();
    this.currentProject = null;
  }
}

// Lazy initialization getter
let _projectsManager: ProjectsManager | null = null;

export function getProjectsManager(): ProjectsManager {
  if (!_projectsManager) {
    _projectsManager = ProjectsManager.getInstance();
  }
  return _projectsManager;
}

// For backward compatibility, also export as projectsManager
export const projectsManager = {
  getAllProjects: async () => await getProjectsManager().getAllProjects(),
  getProject: async (id: string) => await getProjectsManager().getProject(id),
  getCurrentProject: () => getProjectsManager().getCurrentProject(),
  syncProject: async (id: string) => await getProjectsManager().syncProject(id),
  disconnectProject: async () => await getProjectsManager().disconnectProject(),
  getProjectSchema: (id: string) => getProjectsManager().getProjectSchema(id),
  getProjectTables: (id: string) => getProjectsManager().getProjectTables(id),
  executeProjectQuery: async (id: string, sql: string, params?: any[]) => await getProjectsManager().executeProjectQuery(id, sql, params),
  addEventListener: (type: string, listener: (data: any) => void) => getProjectsManager().addEventListener(type, listener),
  removeEventListener: (type: string, listener: (data: any) => void) => getProjectsManager().removeEventListener(type, listener),
  cleanup: () => getProjectsManager().cleanup()
};

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    getProjectsManager().cleanup();
  });
}
