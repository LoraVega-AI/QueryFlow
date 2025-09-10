// Synchronization TypeScript definitions for QueryFlow
// This file contains all types for database synchronization and conflict resolution

export interface SyncSession {
  id: string;
  projectId: string;
  databaseId: string;
  status: SyncStatus;
  direction: SyncDirection;
  startedAt: Date;
  completedAt?: Date;
  options: SyncOptions;
  statistics: SyncStatistics;
  operations: SyncOperation[];
  conflicts: SyncConflict[];
  error?: string;
}

export type SyncStatus =
  | 'pending'
  | 'connecting'
  | 'analyzing'
  | 'syncing'
  | 'validating'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type SyncDirection =
  | 'queryflow-to-project'
  | 'project-to-queryflow'
  | 'bidirectional'
  | 'disabled';

export interface SyncOptions {
  batchSize: number;
  timeout: number;
  createBackups: boolean;
  conflictResolution: 'manual' | 'automatic' | 'queryflow-wins' | 'project-wins';
  skipValidation: boolean;
  selectiveSync: SelectiveSyncOptions;
  performance: SyncPerformanceOptions;
}

export interface SelectiveSyncOptions {
  enabled: boolean;
  includeTables: string[];
  excludeTables: string[];
  includeSchemas: string[];
  excludeSchemas: string[];
  syncData: boolean;
  syncSchema: boolean;
  syncIndexes: boolean;
  syncConstraints: boolean;
}

export interface SyncPerformanceOptions {
  maxConcurrentOperations: number;
  retryAttempts: number;
  retryDelay: number;
  memoryLimit: number;
  enableCompression: boolean;
}

export interface SyncStatistics {
  totalChanges: number;
  successfulChanges: number;
  failedChanges: number;
  skippedChanges: number;
  totalConflicts: number;
  resolvedConflicts: number;
  pendingConflicts: number;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  dataTransferred: number;
  performance: SyncPerformanceMetrics;
}

export interface SyncPerformanceMetrics {
  averageLatency: number;
  peakLatency: number;
  throughput: number;
  memoryUsage: number;
  cpuUsage: number;
  networkUsage: number;
}

export interface SyncOperation {
  id: string;
  type: SyncOperationType;
  entity: SyncEntity;
  status: OperationStatus;
  priority: OperationPriority;
  dependencies: string[];
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  retryCount: number;
  error?: string;
  changes: SyncChange[];
}

export type SyncOperationType =
  | 'create_table'
  | 'alter_table'
  | 'drop_table'
  | 'create_index'
  | 'drop_index'
  | 'create_constraint'
  | 'drop_constraint'
  | 'insert_data'
  | 'update_data'
  | 'delete_data'
  | 'bulk_insert'
  | 'bulk_update'
  | 'bulk_delete';

export type OperationStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'cancelled';

export type OperationPriority =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low';

export interface SyncEntity {
  type: 'table' | 'column' | 'index' | 'constraint' | 'data';
  name: string;
  schema?: string;
  table?: string;
  identifier: string;
}

export interface SyncChange {
  id: string;
  operationId: string;
  type: ChangeType;
  entity: SyncEntity;
  oldValue?: any;
  newValue?: any;
  metadata?: Record<string, any>;
  applied: boolean;
  appliedAt?: Date;
  rollbackSql?: string;
  dependencies: string[];
}

export type ChangeType =
  | 'create'
  | 'update'
  | 'delete'
  | 'alter'
  | 'rename'
  | 'enable'
  | 'disable';

export interface SyncConflict {
  id: string;
  sessionId: string;
  operationId: string;
  type: ConflictType;
  severity: ConflictSeverity;
  description: string;
  entity: SyncEntity;
  localValue?: any;
  remoteValue?: any;
  conflictData: ConflictData;
  resolution?: ConflictResolution;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  createdAt: Date;
}

export type ConflictType =
  | 'concurrent_modification'
  | 'schema_mismatch'
  | 'data_conflict'
  | 'constraint_violation'
  | 'permission_denied'
  | 'connection_error'
  | 'validation_error';

export type ConflictSeverity =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

export interface ConflictData {
  local: {
    value: any;
    timestamp: Date;
    source: 'queryflow' | 'project';
  };
  remote: {
    value: any;
    timestamp: Date;
    source: 'queryflow' | 'project';
  };
  differences: ConflictDifference[];
}

export interface ConflictDifference {
  field: string;
  localValue: any;
  remoteValue: any;
  type: 'added' | 'removed' | 'modified';
}

export interface ConflictResolution {
  strategy: ResolutionStrategy;
  resolvedValue?: any;
  manualResolution?: ManualResolution;
  applied: boolean;
  appliedAt?: Date;
}

export type ResolutionStrategy =
  | 'queryflow_wins'
  | 'project_wins'
  | 'merge'
  | 'manual'
  | 'skip'
  | 'custom';

export interface ManualResolution {
  decision: 'keep_local' | 'keep_remote' | 'merge_values' | 'custom_value';
  customValue?: any;
  notes?: string;
  approvedBy: string;
  approvedAt: Date;
}

export interface SyncQueue {
  id: string;
  projectId: string;
  databaseId: string;
  operations: SyncOperation[];
  status: QueueStatus;
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
}

export type QueueStatus =
  | 'active'
  | 'processing'
  | 'paused'
  | 'completed'
  | 'failed';

export interface SyncMonitor {
  sessionId: string;
  status: SyncStatus;
  progress: SyncProgress;
  currentOperation?: SyncOperation;
  nextOperations: SyncOperation[];
  statistics: SyncStatistics;
  alerts: SyncAlert[];
  logs: SyncLogEntry[];
}

export interface SyncProgress {
  percentage: number;
  currentStep: string;
  totalSteps: number;
  currentOperation: number;
  totalOperations: number;
  estimatedTimeRemaining?: number;
}

export interface SyncAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  details?: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

export interface SyncLogEntry {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warning' | 'error';
  message: string;
  operationId?: string;
  entity?: SyncEntity;
  metadata?: Record<string, any>;
}

export interface SyncBackup {
  id: string;
  sessionId: string;
  projectId: string;
  databaseId: string;
  type: 'full' | 'incremental';
  createdAt: Date;
  size: number;
  location: string;
  checksum: string;
  metadata: Record<string, any>;
}

export interface SyncValidation {
  id: string;
  operationId: string;
  type: ValidationType;
  status: 'pending' | 'running' | 'passed' | 'failed';
  errors: ValidationError[];
  warnings: ValidationWarning[];
  startedAt: Date;
  completedAt?: Date;
}

export type ValidationType =
  | 'schema'
  | 'data'
  | 'constraints'
  | 'permissions'
  | 'performance';

export interface ValidationError {
  code: string;
  message: string;
  entity: SyncEntity;
  details?: string;
  suggestion?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  entity: SyncEntity;
  details?: string;
  suggestion?: string;
}

export interface SyncWebhook {
  id: string;
  url: string;
  events: SyncEventType[];
  secret?: string;
  active: boolean;
  createdAt: Date;
  lastTriggered?: Date;
}

export type SyncEventType =
  | 'sync_started'
  | 'sync_completed'
  | 'sync_failed'
  | 'conflict_detected'
  | 'conflict_resolved'
  | 'operation_completed'
  | 'backup_created';
