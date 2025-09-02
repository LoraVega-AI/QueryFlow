// Workflow automation utilities for QueryFlow
// This module provides cross-feature integrations and automated workflows

import { DatabaseSchema, Table, Column, AuditLog } from '@/types/database';
import { SchemaValidator } from './schemaValidation';
import { PerformanceMonitor } from './performanceMonitor';
import { BulkOperationsManager } from './bulkOperations';

export interface WorkflowStep {
  id: string;
  type: 'schema_validation' | 'data_migration' | 'performance_check' | 'backup' | 'notification';
  name: string;
  description: string;
  config: Record<string, any>;
  enabled: boolean;
  order: number;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger: 'schema_change' | 'data_change' | 'query_execution' | 'manual' | 'scheduled';
  steps: WorkflowStep[];
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  steps: WorkflowStepExecution[];
  error?: string;
}

export interface WorkflowStepExecution {
  stepId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime: Date;
  endTime?: Date;
  result?: any;
  error?: string;
}

export class WorkflowAutomation {
  private static readonly WORKFLOWS_KEY = 'queryflow_workflows';
  private static readonly EXECUTIONS_KEY = 'queryflow_workflow_executions';
  private static workflows: Workflow[] = [];
  private static executions: WorkflowExecution[] = [];

  /**
   * Initialize workflow system
   */
  static initialize(): void {
    this.loadWorkflows();
    this.loadExecutions();
    this.setupDefaultWorkflows();
  }

  /**
   * Create a new workflow
   */
  static createWorkflow(workflow: Omit<Workflow, 'id'>): Workflow {
    const newWorkflow: Workflow = {
      ...workflow,
      id: `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    this.workflows.push(newWorkflow);
    this.saveWorkflows();
    return newWorkflow;
  }

  /**
   * Update an existing workflow
   */
  static updateWorkflow(workflowId: string, updates: Partial<Workflow>): boolean {
    const index = this.workflows.findIndex(w => w.id === workflowId);
    if (index === -1) return false;

    this.workflows[index] = { ...this.workflows[index], ...updates };
    this.saveWorkflows();
    return true;
  }

  /**
   * Delete a workflow
   */
  static deleteWorkflow(workflowId: string): boolean {
    const index = this.workflows.findIndex(w => w.id === workflowId);
    if (index === -1) return false;

    this.workflows.splice(index, 1);
    this.saveWorkflows();
    return true;
  }

  /**
   * Get all workflows
   */
  static getWorkflows(): Workflow[] {
    return this.workflows;
  }

  /**
   * Get workflow by ID
   */
  static getWorkflow(workflowId: string): Workflow | undefined {
    return this.workflows.find(w => w.id === workflowId);
  }

  /**
   * Execute a workflow
   */
  static async executeWorkflow(workflowId: string, context: Record<string, any> = {}): Promise<WorkflowExecution> {
    const workflow = this.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const execution: WorkflowExecution = {
      id: `execution-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      workflowId,
      status: 'pending',
      startTime: new Date(),
      steps: workflow.steps.map(step => ({
        stepId: step.id,
        status: 'pending',
        startTime: new Date()
      }))
    };

    this.executions.push(execution);
    this.saveExecutions();

    try {
      execution.status = 'running';
      this.saveExecutions();

      // Execute steps in order
      for (const step of workflow.steps) {
        if (!step.enabled) {
          const stepExecution = execution.steps.find(s => s.stepId === step.id);
          if (stepExecution) {
            stepExecution.status = 'skipped';
            stepExecution.endTime = new Date();
          }
          continue;
        }

        const stepExecution = execution.steps.find(s => s.stepId === step.id);
        if (!stepExecution) continue;

        stepExecution.status = 'running';
        this.saveExecutions();

        try {
          const result = await this.executeStep(step, context);
          stepExecution.status = 'completed';
          stepExecution.result = result;
        } catch (error: any) {
          stepExecution.status = 'failed';
          stepExecution.error = error.message;
          execution.status = 'failed';
          execution.error = `Step ${step.name} failed: ${error.message}`;
          break;
        }

        stepExecution.endTime = new Date();
        this.saveExecutions();
      }

      if (execution.status === 'running') {
        execution.status = 'completed';
      }

      execution.endTime = new Date();
      this.saveExecutions();

      // Update workflow last run time
      workflow.lastRun = new Date();
      this.saveWorkflows();

    } catch (error: any) {
      execution.status = 'failed';
      execution.error = error.message;
      execution.endTime = new Date();
      this.saveExecutions();
    }

    return execution;
  }

  /**
   * Execute a single workflow step
   */
  private static async executeStep(step: WorkflowStep, context: Record<string, any>): Promise<any> {
    switch (step.type) {
      case 'schema_validation':
        return this.executeSchemaValidation(step, context);
      case 'data_migration':
        return this.executeDataMigration(step, context);
      case 'performance_check':
        return this.executePerformanceCheck(step, context);
      case 'backup':
        return this.executeBackup(step, context);
      case 'notification':
        return this.executeNotification(step, context);
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  /**
   * Execute schema validation step
   */
  private static async executeSchemaValidation(step: WorkflowStep, context: Record<string, any>): Promise<any> {
    const schema = context.schema as DatabaseSchema;
    if (!schema) {
      throw new Error('Schema not provided in context');
    }

    const validation = SchemaValidator.validateSchema(schema);
    
    // Record audit log
    PerformanceMonitor.recordAuditLog('schema_validation', undefined, undefined, {
      workflowStep: step.name,
      isValid: validation.isValid,
      errorCount: validation.errors.length,
      warningCount: validation.warnings.length
    });

    return {
      isValid: validation.isValid,
      errors: validation.errors,
      warnings: validation.warnings
    };
  }

  /**
   * Execute data migration step
   */
  private static async executeDataMigration(step: WorkflowStep, context: Record<string, any>): Promise<any> {
    const { sourceTable, targetTable, migrationQuery } = step.config;
    
    if (!sourceTable || !targetTable || !migrationQuery) {
      throw new Error('Data migration configuration incomplete');
    }

    // This would typically involve more complex migration logic
    // For now, we'll just record the migration attempt
    PerformanceMonitor.recordAuditLog('data_migration', targetTable, undefined, {
      workflowStep: step.name,
      sourceTable,
      targetTable,
      migrationQuery
    });

    return {
      sourceTable,
      targetTable,
      status: 'completed'
    };
  }

  /**
   * Execute performance check step
   */
  private static async executePerformanceCheck(step: WorkflowStep, context: Record<string, any>): Promise<any> {
    const stats = PerformanceMonitor.getPerformanceStats();
    const realTimeData = PerformanceMonitor.getRealTimeData();
    
    const performanceCheck = {
      systemHealth: realTimeData.systemHealth,
      averageQueryTime: stats.averageQueryTime,
      errorRate: stats.errorRate,
      totalOperations: stats.totalOperations
    };

    // Record audit log
    PerformanceMonitor.recordAuditLog('performance_check', undefined, undefined, {
      workflowStep: step.name,
      ...performanceCheck
    });

    return performanceCheck;
  }

  /**
   * Execute backup step
   */
  private static async executeBackup(step: WorkflowStep, context: Record<string, any>): Promise<any> {
    const { backupType, includeData } = step.config;
    
    // Simulate backup process
    const backupInfo = {
      type: backupType || 'full',
      includeData: includeData || true,
      timestamp: new Date(),
      status: 'completed'
    };

    // Record audit log
    PerformanceMonitor.recordAuditLog('backup', undefined, undefined, {
      workflowStep: step.name,
      ...backupInfo
    });

    return backupInfo;
  }

  /**
   * Execute notification step
   */
  private static async executeNotification(step: WorkflowStep, context: Record<string, any>): Promise<any> {
    const { message, type, recipients } = step.config;
    
    // In a real application, this would send actual notifications
    const notification = {
      message: message || 'Workflow notification',
      type: type || 'info',
      recipients: recipients || ['admin'],
      timestamp: new Date(),
      status: 'sent'
    };

    // Record audit log
    PerformanceMonitor.recordAuditLog('notification', undefined, undefined, {
      workflowStep: step.name,
      ...notification
    });

    return notification;
  }

  /**
   * Get workflow executions
   */
  static getExecutions(workflowId?: string): WorkflowExecution[] {
    let filteredExecutions = this.executions;
    
    if (workflowId) {
      filteredExecutions = filteredExecutions.filter(e => e.workflowId === workflowId);
    }
    
    return filteredExecutions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  /**
   * Get execution by ID
   */
  static getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.find(e => e.id === executionId);
  }

  /**
   * Cancel a running execution
   */
  static cancelExecution(executionId: string): boolean {
    const execution = this.getExecution(executionId);
    if (!execution || execution.status !== 'running') {
      return false;
    }

    execution.status = 'cancelled';
    execution.endTime = new Date();
    this.saveExecutions();
    return true;
  }

  /**
   * Setup default workflows
   */
  private static setupDefaultWorkflows(): void {
    if (this.workflows.length > 0) return; // Already initialized

    // Schema Change Workflow
    this.createWorkflow({
      name: 'Schema Change Validation',
      description: 'Validates schema changes and checks for issues',
      trigger: 'schema_change',
      enabled: true,
      steps: [
        {
          id: 'validate-schema',
          type: 'schema_validation',
          name: 'Validate Schema',
          description: 'Run comprehensive schema validation',
          config: {},
          enabled: true,
          order: 1
        },
        {
          id: 'performance-check',
          type: 'performance_check',
          name: 'Performance Check',
          description: 'Check system performance after schema changes',
          config: {},
          enabled: true,
          order: 2
        }
      ]
    });

    // Data Backup Workflow
    this.createWorkflow({
      name: 'Daily Data Backup',
      description: 'Creates daily backups of database data',
      trigger: 'scheduled',
      enabled: true,
      steps: [
        {
          id: 'backup-data',
          type: 'backup',
          name: 'Backup Data',
          description: 'Create full database backup',
          config: {
            backupType: 'full',
            includeData: true
          },
          enabled: true,
          order: 1
        },
        {
          id: 'notify-backup',
          type: 'notification',
          name: 'Backup Notification',
          description: 'Notify administrators of backup completion',
          config: {
            message: 'Daily backup completed successfully',
            type: 'success',
            recipients: ['admin']
          },
          enabled: true,
          order: 2
        }
      ]
    });

    // Performance Monitoring Workflow
    this.createWorkflow({
      name: 'Performance Monitoring',
      description: 'Monitors system performance and alerts on issues',
      trigger: 'query_execution',
      enabled: true,
      steps: [
        {
          id: 'check-performance',
          type: 'performance_check',
          name: 'Check Performance',
          description: 'Monitor query performance and system health',
          config: {},
          enabled: true,
          order: 1
        },
        {
          id: 'alert-if-needed',
          type: 'notification',
          name: 'Performance Alert',
          description: 'Send alert if performance issues detected',
          config: {
            message: 'Performance issues detected in QueryFlow',
            type: 'warning',
            recipients: ['admin']
          },
          enabled: true,
          order: 2
        }
      ]
    });
  }

  /**
   * Load workflows from localStorage
   */
  private static loadWorkflows(): void {
    try {
      const stored = localStorage.getItem(this.WORKFLOWS_KEY);
      if (stored) {
        this.workflows = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading workflows:', error);
      this.workflows = [];
    }
  }

  /**
   * Save workflows to localStorage
   */
  private static saveWorkflows(): void {
    try {
      localStorage.setItem(this.WORKFLOWS_KEY, JSON.stringify(this.workflows));
    } catch (error) {
      console.error('Error saving workflows:', error);
    }
  }

  /**
   * Load executions from localStorage
   */
  private static loadExecutions(): void {
    try {
      const stored = localStorage.getItem(this.EXECUTIONS_KEY);
      if (stored) {
        this.executions = JSON.parse(stored).map((exec: any) => ({
          ...exec,
          startTime: new Date(exec.startTime),
          endTime: exec.endTime ? new Date(exec.endTime) : undefined,
          steps: exec.steps.map((step: any) => ({
            ...step,
            startTime: new Date(step.startTime),
            endTime: step.endTime ? new Date(step.endTime) : undefined
          }))
        }));
      }
    } catch (error) {
      console.error('Error loading workflow executions:', error);
      this.executions = [];
    }
  }

  /**
   * Save executions to localStorage
   */
  private static saveExecutions(): void {
    try {
      localStorage.setItem(this.EXECUTIONS_KEY, JSON.stringify(this.executions));
    } catch (error) {
      console.error('Error saving workflow executions:', error);
    }
  }
}
