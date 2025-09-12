// Projects Manager for QueryFlow
// Handles project data, embedded databases, and synchronization

import { Project, Database, Table, Column, DatabaseSchema } from '../types/projects';
import { dbManager } from './database';
import { memoryManager } from './memoryManager';

export class ProjectsManager {
  private static instance: ProjectsManager;
  private projects: Map<string, Project> = new Map();
  private currentProject: Project | null = null;
  private eventListeners: Map<string, Array<(data: any) => void>> = new Map();

  private constructor() {
    this.initializeDefaultProjects();
  }

  static getInstance(): ProjectsManager {
    if (!ProjectsManager.instance) {
      ProjectsManager.instance = new ProjectsManager();
    }
    return ProjectsManager.instance;
  }

  private initializeDefaultProjects(): void {
    const defaultProjects: Project[] = [
      {
        id: 'ecommerce-api',
        name: 'E-commerce API',
        description: 'Node.js REST API for e-commerce platform',
        technology: 'Node.js',
        status: 'connected',
        lastSynced: '2024-01-20T10:30:00Z',
        databaseCount: 2,
        icon: '📦',
        color: 'orange',
        databases: [
          {
            id: 'ecommerce-main',
            name: 'ecommerce_main',
            type: 'sqlite',
            connectionString: ':memory:',
            isConnected: true,
            lastSync: '2024-01-20T10:30:00Z',
            tables: []
          },
          {
            id: 'ecommerce-analytics',
            name: 'ecommerce_analytics',
            type: 'sqlite',
            connectionString: ':memory:',
            isConnected: true,
            lastSync: '2024-01-20T10:30:00Z',
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
        status: 'syncing',
        lastSynced: '2024-01-19T15:45:00Z',
        databaseCount: 1,
        icon: '🎸',
        color: 'blue',
        databases: [
          {
            id: 'analytics-main',
            name: 'analytics_db',
            type: 'sqlite',
            connectionString: ':memory:',
            isConnected: true,
            lastSync: '2024-01-19T15:45:00Z',
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
        status: 'error',
        lastSynced: null,
        databaseCount: 1,
        icon: '🐘',
        color: 'red',
        databases: [
          {
            id: 'legacy-main',
            name: 'legacy_db',
            type: 'sqlite',
            connectionString: ':memory:',
            isConnected: false,
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
    this.initializeProjectDatabases();
  }

  private async initializeProjectDatabases(): Promise<void> {
    for (const project of this.projects.values()) {
      await this.initializeProjectDatabase(project);
    }
  }

  private async initializeProjectDatabase(project: Project): Promise<void> {
    try {
      if (!project.schema) return;

      // Create tables for each database in the project
      for (const database of project.databases) {
        // Initialize database with schema
        await this.createDatabaseTables(database, project.schema);
      }

      // Populate with sample data
      await this.populateSampleData(project);

      project.status = 'connected';
      this.emitEvent('project_initialized', { projectId: project.id });
    } catch (error) {
      console.error(`Failed to initialize database for project ${project.id}:`, error);
      project.status = 'error';
    }
  }

  private async createDatabaseTables(database: Database, schema: DatabaseSchema): Promise<void> {
    // Create tables in the database
    for (const table of schema.tables) {
      const createTableSQL = this.generateCreateTableSQL(table);
      try {
        await dbManager.executeQuery(createTableSQL);
      } catch (error) {
        console.error(`Failed to create table ${table.name}:`, error);
      }
    }

    database.tables = schema.tables;
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

  private createEcommerceSchema(): DatabaseSchema {
    return {
      tables: [
        {
          id: 'users',
          name: 'users',
          rowCount: 0,
          columns: [
            { id: 'id', name: 'id', type: 'integer', nullable: false, primaryKey: true },
            { id: 'email', name: 'email', type: 'string', nullable: false, primaryKey: false },
            { id: 'name', name: 'name', type: 'string', nullable: false, primaryKey: false },
            { id: 'created_at', name: 'created_at', type: 'datetime', nullable: false, primaryKey: false }
          ]
        },
        {
          id: 'products',
          name: 'products',
          rowCount: 0,
          columns: [
            { id: 'id', name: 'id', type: 'integer', nullable: false, primaryKey: true },
            { id: 'name', name: 'name', type: 'string', nullable: false, primaryKey: false },
            { id: 'price', name: 'price', type: 'number', nullable: false, primaryKey: false },
            { id: 'category', name: 'category', type: 'string', nullable: false, primaryKey: false },
            { id: 'stock', name: 'stock', type: 'integer', nullable: false, primaryKey: false }
          ]
        },
        {
          id: 'orders',
          name: 'orders',
          rowCount: 0,
          columns: [
            { id: 'id', name: 'id', type: 'integer', nullable: false, primaryKey: true },
            { id: 'user_id', name: 'user_id', type: 'integer', nullable: false, primaryKey: false },
            { id: 'total', name: 'total', type: 'number', nullable: false, primaryKey: false },
            { id: 'status', name: 'status', type: 'string', nullable: false, primaryKey: false },
            { id: 'created_at', name: 'created_at', type: 'datetime', nullable: false, primaryKey: false }
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
          type: 'many-to-one'
        }
      ],
      indexes: []
    };
  }

  private createAnalyticsSchema(): DatabaseSchema {
    return {
      tables: [
        {
          id: 'page_views',
          name: 'page_views',
          rowCount: 0,
          columns: [
            { id: 'id', name: 'id', type: 'integer', nullable: false, primaryKey: true },
            { id: 'page', name: 'page', type: 'string', nullable: false, primaryKey: false },
            { id: 'user_id', name: 'user_id', type: 'integer', nullable: true, primaryKey: false },
            { id: 'timestamp', name: 'timestamp', type: 'datetime', nullable: false, primaryKey: false },
            { id: 'duration', name: 'duration', type: 'integer', nullable: false, primaryKey: false }
          ]
        },
        {
          id: 'events',
          name: 'events',
          rowCount: 0,
          columns: [
            { id: 'id', name: 'id', type: 'integer', nullable: false, primaryKey: true },
            { id: 'event_type', name: 'event_type', type: 'string', nullable: false, primaryKey: false },
            { id: 'user_id', name: 'user_id', type: 'integer', nullable: true, primaryKey: false },
            { id: 'data', name: 'data', type: 'json', nullable: true, primaryKey: false },
            { id: 'timestamp', name: 'timestamp', type: 'datetime', nullable: false, primaryKey: false }
          ]
        }
      ],
      relationships: [],
      indexes: []
    };
  }

  private createLegacySchema(): DatabaseSchema {
    return {
      tables: [
        {
          id: 'posts',
          name: 'posts',
          rowCount: 0,
          columns: [
            { id: 'id', name: 'id', type: 'integer', nullable: false, primaryKey: true },
            { id: 'title', name: 'title', type: 'string', nullable: false, primaryKey: false },
            { id: 'content', name: 'content', type: 'text', nullable: false, primaryKey: false },
            { id: 'author', name: 'author', type: 'string', nullable: false, primaryKey: false },
            { id: 'created_date', name: 'created_date', type: 'datetime', nullable: false, primaryKey: false }
          ]
        }
      ],
      relationships: [],
      indexes: []
    };
  }

  private async populateSampleData(project: Project): Promise<void> {
    if (!project.schema) return;

    for (const table of project.schema.tables) {
      const sampleData = this.generateSampleData(table, project.id);
      if (sampleData.length > 0) {
        await this.insertSampleData(table.name, sampleData);
      }
    }
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

  private async insertSampleData(tableName: string, data: any[]): Promise<void> {
    for (const record of data) {
      const columns = Object.keys(record);
      const values = Object.values(record);
      const placeholders = values.map(() => '?').join(', ');

      const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

      try {
        await dbManager.executeQuery(sql, values);
      } catch (error) {
        console.error(`Failed to insert sample data into ${tableName}:`, error);
      }
    }
  }

  // Public methods
  getAllProjects(): Project[] {
    return Array.from(this.projects.values());
  }

  getProject(projectId: string): Project | null {
    return this.projects.get(projectId) || null;
  }

  getCurrentProject(): Project | null {
    return this.currentProject;
  }

  async syncProject(projectId: string): Promise<boolean> {
    const project = this.projects.get(projectId);
    if (!project) return false;

    try {
      project.status = 'syncing';
      this.emitEvent('project_sync_start', { projectId });

      // Simulate sync process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update sync timestamp
      project.lastSynced = new Date().toISOString();
      project.status = 'connected';

      // Set as current project
      this.currentProject = project;

      // Update database counts
      project.databaseCount = project.databases.filter(db => db.isConnected).length;

      this.emitEvent('project_sync_complete', { projectId, project });
      return true;
    } catch (error) {
      console.error(`Failed to sync project ${projectId}:`, error);
      project.status = 'error';
      this.emitEvent('project_sync_error', { projectId, error });
      return false;
    }
  }

  async disconnectProject(): Promise<void> {
    if (this.currentProject) {
      this.currentProject.status = 'disconnected';
      this.currentProject = null;
      this.emitEvent('project_disconnected');
    }
  }

  // Get project database schema
  getProjectSchema(projectId: string): DatabaseSchema | null {
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
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // For now, execute on the main database
    // In a real implementation, you'd connect to the project's specific database
    return await dbManager.executeQuery(sql, params);
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

// Export singleton instance
export const projectsManager = ProjectsManager.getInstance();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    projectsManager.cleanup();
  });
}
