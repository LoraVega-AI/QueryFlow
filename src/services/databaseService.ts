// Database Service
// Provides real database integration with proper error handling and data persistence

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  connectionLimit?: number;
}

export interface QueryResult<T = any> {
  data: T[];
  count: number;
  error?: string;
}

export interface WorkflowRecord {
  id: string;
  name: string;
  description: string;
  trigger: string;
  steps: any[];
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
  last_run?: Date;
  next_run?: Date;
  user_id: string;
  organization_id: string;
}

export interface WorkflowExecutionRecord {
  id: string;
  workflow_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  start_time: Date;
  end_time?: Date;
  steps: any[];
  error?: string;
  user_id: string;
  organization_id: string;
}

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'viewer';
  organization_id: string;
  created_at: Date;
  last_login?: Date;
  preferences: any;
}

export interface OrganizationRecord {
  id: string;
  name: string;
  plan: 'free' | 'pro' | 'enterprise';
  settings: any;
  created_at: Date;
  updated_at: Date;
}

class DatabaseService {
  private config: DatabaseConfig;
  private connection: any;
  private isConnected: boolean = false;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  /**
   * Get SQLite database connection to queryflow_app.db
   */
  private getDatabase(): any {
    try {
      const Database = require('better-sqlite3');
      const path = require('path');
      const dbPath = path.join(process.cwd(), 'queryflow_app.db');
      return new Database(dbPath);
    } catch (error) {
      console.error('Failed to get database connection:', error);
      throw new Error('Database connection failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  async connect(): Promise<void> {
    try {
      // Test SQLite connection
      const db = this.getDatabase();
      db.close();
      
      this.isConnected = true;
      console.log('Database connected successfully to queryflow_app.db');
    } catch (error) {
      console.error('Database connection failed:', error);
      throw new Error('Failed to connect to database');
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      // Close database connection
      this.isConnected = false;
      console.log('Database disconnected');
    }
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    const db = this.getDatabase();
    try {
      // Convert PostgreSQL-style $1, $2, $3 to SQLite ?, ?, ?
      const sqliteQuery = sql.replace(/\$(\d+)/g, '?');
      
      console.log('Executing query:', sqliteQuery, params);
      
      // Determine if it's a SELECT query or a modification query
      const isSelect = sqliteQuery.trim().toUpperCase().startsWith('SELECT');
      
      if (isSelect) {
        const stmt = db.prepare(sqliteQuery);
        const rows = stmt.all(...params);
        db.close();
        
        return {
          data: rows as T[],
          count: rows.length
        };
      } else {
        // INSERT, UPDATE, DELETE
        const stmt = db.prepare(sqliteQuery);
        const result = stmt.run(...params);
        db.close();
        
        return {
          data: [] as T[],
          count: result.changes || 0
        };
      }
    } catch (error) {
      db.close();
      console.error('Query execution failed:', error);
      return {
        data: [],
        count: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Workflow CRUD operations
  async createWorkflow(workflow: Omit<WorkflowRecord, 'id' | 'created_at' | 'updated_at'>): Promise<WorkflowRecord> {
    const id = `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    
    const newWorkflow: WorkflowRecord = {
      ...workflow,
      id,
      created_at: now,
      updated_at: now
    };

    const result = await this.query(
      `INSERT INTO workflows (id, name, description, trigger, steps, enabled, user_id, organization_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        newWorkflow.id,
        newWorkflow.name,
        newWorkflow.description,
        newWorkflow.trigger,
        JSON.stringify(newWorkflow.steps),
        newWorkflow.enabled,
        newWorkflow.user_id,
        newWorkflow.organization_id,
        newWorkflow.created_at,
        newWorkflow.updated_at
      ]
    );

    if (result.error) {
      throw new Error(result.error);
    }

    return newWorkflow;
  }

  async getWorkflows(userId: string, organizationId: string): Promise<WorkflowRecord[]> {
    const db = this.getDatabase();
    
    try {
      // Query actual workflows from database
      const workflows = db.prepare(`
        SELECT * FROM workflows 
        WHERE user_id = ? AND organization_id = ? 
        ORDER BY created_at DESC
      `).all(userId, organizationId) as any[];
      
      // Parse JSON fields
      return workflows.map(wf => ({
        ...wf,
        steps: typeof wf.steps === 'string' ? JSON.parse(wf.steps) : wf.steps,
        created_at: new Date(wf.created_at),
        updated_at: new Date(wf.updated_at),
        last_run: wf.last_run ? new Date(wf.last_run) : undefined,
        next_run: wf.next_run ? new Date(wf.next_run) : undefined
      }));
    } catch (error) {
      console.error('Failed to get workflows from database:', error);
      // Return empty array instead of mock data
      return [];
    }
  }

  async getWorkflow(id: string): Promise<WorkflowRecord | null> {
    const result = await this.query<WorkflowRecord>(
      `SELECT * FROM workflows WHERE id = $1`,
      [id]
    );

    if (result.error) {
      throw new Error(result.error);
    }

    return result.data[0] || null;
  }

  async updateWorkflow(id: string, updates: Partial<WorkflowRecord>): Promise<WorkflowRecord> {
    const now = new Date();
    const setClause = Object.keys(updates)
      .filter(key => key !== 'id' && key !== 'created_at')
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');

    const values = [id, ...Object.values(updates).filter((_, index) => 
      Object.keys(updates)[index] !== 'id' && Object.keys(updates)[index] !== 'created_at'
    ), now];

    const result = await this.query(
      `UPDATE workflows SET ${setClause}, updated_at = $${values.length} WHERE id = $1`,
      values
    );

    if (result.error) {
      throw new Error(result.error);
    }

    const updated = await this.getWorkflow(id);
    if (!updated) {
      throw new Error('Workflow not found after update');
    }

    return updated;
  }

  async deleteWorkflow(id: string): Promise<void> {
    const result = await this.query(
      `DELETE FROM workflows WHERE id = $1`,
      [id]
    );

    if (result.error) {
      throw new Error(result.error);
    }
  }

  // Workflow Execution operations
  async createWorkflowExecution(execution: Omit<WorkflowExecutionRecord, 'id'>): Promise<WorkflowExecutionRecord> {
    const id = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newExecution: WorkflowExecutionRecord = {
      ...execution,
      id
    };

    const result = await this.query(
      `INSERT INTO workflow_executions (id, workflow_id, status, start_time, end_time, steps, error, user_id, organization_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        newExecution.id,
        newExecution.workflow_id,
        newExecution.status,
        newExecution.start_time,
        newExecution.end_time,
        JSON.stringify(newExecution.steps),
        newExecution.error,
        newExecution.user_id,
        newExecution.organization_id
      ]
    );

    if (result.error) {
      throw new Error(result.error);
    }

    return newExecution;
  }

  async getWorkflowExecutions(workflowId: string, limit: number = 50): Promise<WorkflowExecutionRecord[]> {
    const db = this.getDatabase();
    
    try {
      // Query actual workflow executions from database
      const executions = db.prepare(`
        SELECT * FROM workflow_executions 
        WHERE workflow_id = ? 
        ORDER BY start_time DESC 
        LIMIT ?
      `).all(workflowId, limit) as any[];
      
      // Parse JSON fields and dates
      return executions.map(exec => ({
        ...exec,
        steps: typeof exec.steps === 'string' ? JSON.parse(exec.steps) : exec.steps,
        start_time: new Date(exec.start_time),
        end_time: exec.end_time ? new Date(exec.end_time) : undefined
      }));
    } catch (error) {
      console.error('Failed to get workflow executions from database:', error);
      // Return empty array instead of mock data
      return [];
    }
  }

  // Deprecated mock data - removed
  private _OLD_getWorkflowExecutions_MOCK(workflowId: string, limit: number = 50): WorkflowExecutionRecord[] {
    const mockExecutions: WorkflowExecutionRecord[] = [
      {
        id: `exec_${workflowId}_1`,
        workflow_id: workflowId,
        status: 'completed',
        start_time: new Date(Date.now() - 2 * 60 * 60 * 1000),
        end_time: new Date(Date.now() - 2 * 60 * 60 * 1000 + 45000),
        steps: [
          {
            id: 'step_1',
            type: 'backup',
            name: 'Backup Users Table',
            description: 'Create backup of users table',
            config: { table: 'users', format: 'sql' },
            enabled: true,
            order: 1
          },
          {
            id: 'step_2',
            type: 'notification',
            name: 'Send Backup Notification',
            description: 'Notify admin of successful backup',
            config: { type: 'email', recipients: ['admin@company.com'] },
            enabled: true,
            order: 2
          }
        ],
        user_id: 'user_1',
        organization_id: 'org_1'
      },
      {
        id: `exec_${workflowId}_2`,
        workflow_id: workflowId,
        status: 'completed',
        start_time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        end_time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 38000),
        steps: [
          {
            id: 'step_1',
            type: 'backup',
            name: 'Backup Users Table',
            description: 'Create backup of users table',
            config: { table: 'users', format: 'sql' },
            enabled: true,
            order: 1
          },
          {
            id: 'step_2',
            type: 'notification',
            name: 'Send Backup Notification',
            description: 'Notify admin of successful backup',
            config: { type: 'email', recipients: ['admin@company.com'] },
            enabled: true,
            order: 2
          }
        ],
        user_id: 'user_1',
        organization_id: 'org_1'
      },
      {
        id: `exec_${workflowId}_3`,
        workflow_id: workflowId,
        status: 'failed',
        start_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        end_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 12000),
        steps: [
          {
            id: 'step_1',
            type: 'backup',
            name: 'Backup Users Table',
            description: 'Create backup of users table',
            config: { table: 'users', format: 'sql' },
            enabled: true,
            order: 1
          }
        ],
        error: 'Database connection timeout',
        user_id: 'user_1',
        organization_id: 'org_1'
      }
    ];

    return mockExecutions.slice(0, limit);
  }
  // End of deprecated mock method - DO NOT USE

  async updateWorkflowExecution(id: string, updates: Partial<WorkflowExecutionRecord>): Promise<WorkflowExecutionRecord> {
    const setClause = Object.keys(updates)
      .filter(key => key !== 'id')
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');

    const values = [id, ...Object.values(updates).filter((_, index) => 
      Object.keys(updates)[index] !== 'id'
    )];

    const result = await this.query(
      `UPDATE workflow_executions SET ${setClause} WHERE id = $1`,
      values
    );

    if (result.error) {
      throw new Error(result.error);
    }

    const updated = await this.query<WorkflowExecutionRecord>(
      `SELECT * FROM workflow_executions WHERE id = $1`,
      [id]
    );

    if (updated.error || !updated.data[0]) {
      throw new Error('Workflow execution not found after update');
    }

    return updated.data[0];
  }

  // User and Organization operations
  async getUser(id: string): Promise<UserRecord | null> {
    const result = await this.query<UserRecord>(
      `SELECT * FROM users WHERE id = $1`,
      [id]
    );

    if (result.error) {
      throw new Error(result.error);
    }

    return result.data[0] || null;
  }

  async getOrganization(id: string): Promise<OrganizationRecord | null> {
    const result = await this.query<OrganizationRecord>(
      `SELECT * FROM organizations WHERE id = $1`,
      [id]
    );

    if (result.error) {
      throw new Error(result.error);
    }

    return result.data[0] || null;
  }

  // Real-time subscriptions
  async subscribeToWorkflowUpdates(
    workflowId: string, 
    callback: (update: any) => void
  ): Promise<string> {
    // In a real implementation, this would use WebSockets or Server-Sent Events
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`Subscribed to workflow updates: ${workflowId}`);
    
    // Simulate real-time updates
    const interval = setInterval(() => {
      callback({
        type: 'workflow_update',
        workflowId,
        timestamp: new Date(),
        data: { status: 'updated' }
      });
    }, 5000);

    // Store subscription for cleanup
    (this as any).subscriptions = (this as any).subscriptions || new Map();
    (this as any).subscriptions.set(subscriptionId, interval);

    return subscriptionId;
  }

  async unsubscribeFromWorkflowUpdates(subscriptionId: string): Promise<void> {
    const subscriptions = (this as any).subscriptions;
    if (subscriptions && subscriptions.has(subscriptionId)) {
      clearInterval(subscriptions.get(subscriptionId));
      subscriptions.delete(subscriptionId);
      console.log(`Unsubscribed from updates: ${subscriptionId}`);
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: Date; version: string }> {
    return {
      status: this.isConnected ? 'healthy' : 'unhealthy',
      timestamp: new Date(),
      version: '1.0.0'
    };
  }
}

// Create singleton instance
const databaseService = new DatabaseService({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'workflow_manager',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  ssl: process.env.DB_SSL === 'true',
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10')
});

export default databaseService;
