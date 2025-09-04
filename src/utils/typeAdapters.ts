// Type Adapters
// Converts between service types and component types for compatibility

import { Workflow, WorkflowExecution, WorkflowStep } from '@/types/database';
import { WorkflowRecord, WorkflowExecutionRecord } from '@/services/databaseService';
import { ConnectorConfig } from '@/services/integrationService';
import { IntegrationConnector } from '@/utils/enterpriseIntegrationHub';
import { Dashboard } from '@/services/monitoringService';
import { WorkflowDashboard } from '@/utils/advancedWorkflowMonitoring';
import { WorkflowSuggestion as ServiceWorkflowSuggestion } from '@/services/aiService';
import { WorkflowSuggestion as ComponentWorkflowSuggestion } from '@/utils/aiWorkflowIntelligence';
import { ExecutionResult } from '@/services/integrationService';
import { IntegrationExecution } from '@/utils/enterpriseIntegrationHub';

// Convert WorkflowRecord to Workflow
export function adaptWorkflowRecord(record: WorkflowRecord): Workflow {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    trigger: record.trigger as Workflow['trigger'],
    steps: record.steps.map(step => ({
      id: step.id || `step_${Math.random().toString(36).substr(2, 9)}`,
      type: step.type as WorkflowStep['type'],
      name: step.name,
      description: step.description,
      config: step.config,
      enabled: step.enabled,
      order: step.order
    })),
    enabled: record.enabled,
    lastRun: record.last_run,
    nextRun: record.next_run
  };
}

// Convert WorkflowExecutionRecord to WorkflowExecution
export function adaptWorkflowExecutionRecord(record: WorkflowExecutionRecord): WorkflowExecution {
  return {
    id: record.id,
    workflowId: record.workflow_id,
    status: record.status,
    startTime: record.start_time,
    endTime: record.end_time,
    steps: record.steps.map(step => ({
      stepId: step.id || `step_${Math.random().toString(36).substr(2, 9)}`,
      status: 'completed' as const,
      startTime: new Date(),
      endTime: new Date(),
      error: undefined,
      result: step.result || {}
    })),
    error: record.error
  };
}

// Convert ConnectorConfig to IntegrationConnector
export function adaptConnectorConfig(config: ConnectorConfig): IntegrationConnector {
  return {
    id: config.id,
    name: config.name,
    type: config.type === 'file' ? 'file_system' : config.type,
    category: config.category,
    description: config.description,
    icon: config.icon,
    color: getConnectorColor(config.type),
    capabilities: config.capabilities,
    configuration: {
      required: config.authentication?.fields?.filter(f => f.required).map(f => f.name) || [],
      optional: config.authentication?.fields?.filter(f => !f.required).map(f => f.name) || [],
      authentication: config.authentication?.type || 'none'
    },
    rateLimits: config.rateLimits
  };
}

// Convert Dashboard to WorkflowDashboard
export function adaptDashboard(dashboard: Dashboard): WorkflowDashboard {
  return {
    id: dashboard.id,
    name: dashboard.name,
    description: dashboard.description,
    widgets: dashboard.widgets.map(widget => ({
      id: widget.id,
      type: widget.type as any,
      title: widget.title,
      description: '',
      config: widget.config || {},
      position: widget.position,
      configuration: {
        dataSource: 'workflow_metrics',
        query: widget.config?.query || 'SELECT * FROM metrics',
        visualization: widget.config || {},
        refreshInterval: 30
      },
      filters: []
    })),
    layout: {
      columns: dashboard.layout.columns,
      rows: dashboard.layout.rows,
      gridSize: 12,
      responsive: true
    },
    refreshInterval: dashboard.refreshInterval,
    isPublic: dashboard.isPublic,
    filters: [],
    createdBy: dashboard.userId,
    createdAt: dashboard.createdAt,
    updatedAt: dashboard.updatedAt
  };
}

// Convert ServiceWorkflowSuggestion to ComponentWorkflowSuggestion
export function adaptWorkflowSuggestion(suggestion: ServiceWorkflowSuggestion): ComponentWorkflowSuggestion {
  return {
    id: suggestion.id,
    type: suggestion.type,
    title: suggestion.title,
    description: suggestion.description,
    impact: suggestion.impact,
    confidence: suggestion.confidence,
    action: {
      type: suggestion.type === 'optimization' ? 'error_handling' : 
            suggestion.type === 'performance' ? 'parallel_execution' :
            suggestion.type === 'security' ? 'add_step' :
            suggestion.type === 'best_practice' ? 'modify_step' : 'error_handling',
      details: {
        description: suggestion.description,
        steps: suggestion.steps,
        estimatedSavings: suggestion.estimatedSavings
      }
    }
  };
}

// Convert ExecutionResult to IntegrationExecution
export function adaptExecutionResult(result: ExecutionResult, connectorId: string, operation: string): IntegrationExecution {
  return {
    id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    connectorId,
    operation,
    status: result.success ? 'completed' : 'failed',
    startTime: result.timestamp,
    endTime: new Date(result.timestamp.getTime() + result.executionTime),
    input: {},
    output: result.data,
    error: result.error,
    duration: result.executionTime
  };
}

// Helper function to get connector color based on type
function getConnectorColor(type: string): string {
  const colorMap: Record<string, string> = {
    'api': '#3B82F6',
    'database': '#8B5CF6',
    'file': '#10B981',
    'message_queue': '#F59E0B',
    'notification': '#EF4444'
  };
  return colorMap[type] || '#6B7280';
}

// Convert Workflow to WorkflowRecord for database operations
export function adaptWorkflowToRecord(workflow: Workflow, userId: string, organizationId: string): Omit<WorkflowRecord, 'id' | 'created_at' | 'updated_at'> {
  return {
    name: workflow.name,
    description: workflow.description,
    trigger: workflow.trigger,
    steps: workflow.steps,
    enabled: workflow.enabled,
    last_run: workflow.lastRun,
    next_run: workflow.nextRun,
    user_id: userId,
    organization_id: organizationId
  };
}

// Convert WorkflowExecution to WorkflowExecutionRecord for database operations
export function adaptWorkflowExecutionToRecord(execution: WorkflowExecution, userId: string, organizationId: string): Omit<WorkflowExecutionRecord, 'id'> {
  return {
    workflow_id: execution.workflowId,
    status: execution.status,
    start_time: execution.startTime,
    end_time: execution.endTime,
    steps: execution.steps,
    error: execution.error,
    user_id: userId,
    organization_id: organizationId
  };
}
