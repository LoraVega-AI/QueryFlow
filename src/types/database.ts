// Database schema and data type definitions for QueryFlow
// This file contains all TypeScript interfaces for database operations

export interface Column {
  id: string;
  name: string;
  type: DataType;
  nullable: boolean;
  primaryKey: boolean;
  defaultValue?: string;
  foreignKey?: {
    tableId: string;
    columnId: string;
  };
}

export interface Table {
  id: string;
  name: string;
  columns: Column[];
  position: { x: number; y: number };
}

export interface DatabaseSchema {
  id: string;
  name: string;
  tables: Table[];
  createdAt: Date;
  updatedAt: Date;
  version: number;
  description?: string;
  tags?: string[];
}

export interface DatabaseRecord {
  id: string;
  tableId: string;
  data: Record<string, any>;
}

export interface QueryResult {
  columns: string[];
  rows: any[][];
  rowCount: number;
  executionTime: number;
}

export interface QueryError {
  message: string;
  line?: number;
  column?: number;
  executionTime?: number;
}

export type DataType = 
  | 'TEXT'
  | 'INTEGER'
  | 'REAL'
  | 'BLOB'
  | 'BOOLEAN'
  | 'DATE'
  | 'DATETIME';

export interface DatabaseState {
  schema: DatabaseSchema | null;
  records: DatabaseRecord[];
  queryHistory: string[];
  currentQuery: string;
  queryResult: QueryResult | null;
  queryError: QueryError | null;
  isLoading: boolean;
}

// React Flow specific types
export interface TableNode {
  id: string;
  type: 'table';
  position: { x: number; y: number };
  data: {
    table: Table;
    onUpdateTable: (table: Table) => void;
    onDeleteTable: (tableId: string) => void;
  };
}

export interface RelationshipEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
  type: 'relationship';
  data: {
    foreignKey: {
      tableId: string;
      columnId: string;
    };
  };
}

export type FlowNode = TableNode;
export type FlowEdge = RelationshipEdge;

// Enhanced types for advanced functionality
export interface SchemaTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  schema: DatabaseSchema;
  tags: string[];
}

export interface SchemaValidation {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: 'relationship' | 'naming' | 'constraint' | 'data_type';
  message: string;
  tableId?: string;
  columnId?: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  type: 'performance' | 'naming' | 'best_practice';
  message: string;
  tableId?: string;
  columnId?: string;
  suggestion?: string;
}

export interface QueryHistoryItem {
  id: string;
  query: string;
  executedAt: Date;
  executionTime: number;
  resultCount: number;
  isBookmarked: boolean;
  tags: string[];
}

export interface QueryTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  query: string;
  parameters: QueryParameter[];
  tags: string[];
}

export interface QueryParameter {
  name: string;
  type: DataType;
  defaultValue?: any;
  required: boolean;
}

export interface DataValidationRule {
  id: string;
  tableId: string;
  columnId?: string;
  type: 'required' | 'unique' | 'format' | 'range' | 'custom';
  rule: string;
  message: string;
}

export interface BulkOperation {
  id: string;
  type: 'insert' | 'update' | 'delete';
  tableId: string;
  data: any[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  errors: string[];
}

export interface AuditLog {
  id: string;
  action: string;
  tableId?: string;
  recordId?: string;
  userId?: string;
  timestamp: Date;
  details: Record<string, any>;
}

export interface PerformanceMetric {
  id: string;
  type: 'query' | 'table' | 'index';
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface SearchResult {
  id: string;
  type: 'schema' | 'table' | 'column' | 'query' | 'audit' | 'data';
  title: string;
  description: string;
  content: string;
  relevance: number;
  metadata: Record<string, any>;
  timestamp?: Date;
}

export interface SearchFilters {
  types?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
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

export interface WorkflowStep {
  id: string;
  type: 'schema_validation' | 'data_migration' | 'performance_check' | 'backup' | 'notification';
  name: string;
  description: string;
  config: Record<string, any>;
  enabled: boolean;
  order: number;
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
  error?: string;
  result?: any;
}
