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
    relationshipType: 'one-to-one' | 'one-to-many' | 'many-to-many' | 'self-referencing';
    onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
    onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  };
  unique?: boolean;
  autoIncrement?: boolean;
  indexed?: boolean;
  indexType?: 'B-tree' | 'Hash' | 'GIN' | 'GiST' | 'SP-GiST' | 'BRIN';
  indexName?: string;
  constraints?: {
    unique?: boolean;
    check?: string;
    index?: boolean;
    autoIncrement?: boolean;
    // Length constraints for string types
    maxLength?: number;
    minLength?: number;
    // Precision and scale for numeric types
    precision?: number;
    scale?: number;
    // Array constraints
    arrayDimensions?: number;
    arrayElementType?: DataType;
    // Enum values
    enumValues?: string[];
    // Set values
    setValues?: string[];
    // Custom type definition
    customTypeDefinition?: string;
    // Spatial reference system for geographic types
    srid?: number;
    // Timezone info for timestamp types
    withTimeZone?: boolean;
    // Charset for text types
    charset?: string;
    collation?: string;
  };
  documentation?: string;
  tags?: string[];
}

export interface Table {
  id: string;
  name: string;
  columns: Column[];
  position: { x: number; y: number };
  size?: { width: number; height: number };
  documentation?: string;
  tags?: string[];
  indexes?: TableIndex[];
  triggers?: TableTrigger[];
  businessRules?: BusinessRule[];
  version?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TableIndex {
  id: string;
  name: string;
  columns: string[];
  unique: boolean;
  type: 'btree' | 'hash' | 'gin' | 'gist';
  partial?: string;
}

export interface TableTrigger {
  id: string;
  name: string;
  event: 'insert' | 'update' | 'delete';
  timing: 'before' | 'after' | 'instead_of';
  action: string;
  condition?: string;
}

export interface BusinessRule {
  id: string;
  name: string;
  description: string;
  rule: string;
  severity: 'error' | 'warning' | 'info';
  enabled: boolean;
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
  branches?: SchemaBranch[];
  currentBranch?: string;
  collaborators?: Collaborator[];
  permissions?: SchemaPermissions;
  metadata?: SchemaMetadata;
}

export interface SchemaBranch {
  id: string;
  name: string;
  parentBranch?: string;
  createdAt: Date;
  createdBy: string;
  description?: string;
  isActive: boolean;
}

export interface Collaborator {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  permissions: string[];
  lastActive?: Date;
  cursor?: { x: number; y: number; color: string };
}

export interface SchemaPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canShare: boolean;
  canExport: boolean;
  canVersion: boolean;
  canCollaborate: boolean;
}

export interface SchemaMetadata {
  totalTables: number;
  totalColumns: number;
  totalRelationships: number;
  complexity: 'low' | 'medium' | 'high';
  lastValidated?: Date;
  validationStatus: 'valid' | 'warning' | 'error';
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
  executionPlan?: ExecutionPlan;
  performanceMetrics?: PerformanceMetrics;
  metadata?: QueryMetadata;
}

export interface ExecutionPlan {
  id: string;
  steps: ExecutionStep[];
  totalCost: number;
  estimatedRows: number;
  actualRows: number;
  executionTime: number;
}

export interface ExecutionStep {
  id: string;
  operation: string;
  table?: string;
  index?: string;
  cost: number;
  rows: number;
  width: number;
  children?: ExecutionStep[];
}

export interface PerformanceMetrics {
  cpuTime: number;
  memoryUsage: number;
  diskReads: number;
  diskWrites: number;
  networkTime?: number;
  cacheHits: number;
  cacheMisses: number;
}

export interface QueryMetadata {
  queryHash: string;
  parameters?: Record<string, any>;
  executionContext: string;
  timestamp: Date;
  userId?: string;
}

export interface QueryError {
  message: string;
  line?: number;
  column?: number;
  executionTime?: number;
}

export type DataType = 
  // Basic SQLite types
  | 'TEXT'
  | 'INTEGER'
  | 'REAL'
  | 'BLOB'
  | 'BOOLEAN'
  | 'DATE'
  | 'DATETIME'
  // Advanced numeric types
  | 'BIGINT'
  | 'DECIMAL'
  | 'NUMERIC'
  | 'FLOAT'
  | 'DOUBLE'
  | 'SMALLINT'
  | 'TINYINT'
  | 'MONEY'
  // String types
  | 'CHAR'
  | 'VARCHAR'
  | 'NCHAR'
  | 'NVARCHAR'
  | 'ENUM'
  | 'SET'
  // Date/Time types
  | 'TIMESTAMP'
  | 'INTERVAL'
  | 'TIME'
  | 'YEAR'
  // Structured data types
  | 'JSON'
  | 'JSONB'
  | 'XML'
  | 'BINARY'
  | 'VARBINARY'
  // Unique identifier
  | 'UUID'
  | 'GUID'
  // Array types
  | 'ARRAY'
  | 'TEXT_ARRAY'
  | 'INTEGER_ARRAY'
  | 'JSON_ARRAY'
  // Spatial/Geographic types
  | 'GEOMETRY'
  | 'POINT'
  | 'POLYGON'
  | 'LINESTRING'
  | 'MULTIPOINT'
  | 'MULTIPOLYGON'
  | 'MULTILINESTRING'
  | 'GEOMETRYCOLLECTION'
  // Network types
  | 'INET'
  | 'CIDR'
  | 'MACADDR'
  // Full-text search
  | 'TSVECTOR'
  | 'TSQUERY'
  // Custom/User-defined
  | 'CUSTOM';

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

// Advanced Analytics Types
export interface ChartConfig {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'heatmap' | 'treemap' | 'boxplot' | 'histogram' | 'area' | 'radar';
  title: string;
  dataSource: string;
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
  series?: SeriesConfig[];
  options?: ChartOptions;
  filters?: FilterConfig[];
}

export interface AxisConfig {
  field: string;
  label: string;
  type: 'category' | 'value' | 'time';
  format?: string;
  min?: number;
  max?: number;
}

export interface SeriesConfig {
  name: string;
  field: string;
  color?: string;
  type?: 'line' | 'bar' | 'area';
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
}

export interface ChartOptions {
  responsive: boolean;
  maintainAspectRatio: boolean;
  animation?: boolean;
  legend?: boolean;
  tooltips?: boolean;
  grid?: boolean;
  theme?: 'light' | 'dark';
}

export interface FilterConfig {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in';
  value: any;
  label: string;
}

export interface Dashboard {
  id: string;
  name: string;
  description: string;
  charts: ChartConfig[];
  layout: DashboardLayout;
  filters: FilterConfig[];
  refreshInterval?: number;
  isPublic: boolean;
  permissions: DashboardPermissions;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardLayout {
  columns: number;
  rows: number;
  widgets: DashboardWidget[];
}

export interface DashboardWidget {
  id: string;
  chartId: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  title?: string;
  showTitle: boolean;
}

export interface DashboardPermissions {
  canView: string[];
  canEdit: string[];
  canDelete: string[];
  canShare: string[];
}

// Advanced Search Types
export interface SearchIndex {
  id: string;
  name: string;
  fields: SearchField[];
  analyzer: 'standard' | 'keyword' | 'text' | 'custom';
  settings: SearchSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchField {
  name: string;
  type: 'text' | 'keyword' | 'number' | 'date' | 'boolean';
  indexed: boolean;
  stored: boolean;
  analyzed: boolean;
  boost?: number;
}

export interface SearchSettings {
  numberOfShards: number;
  numberOfReplicas: number;
  refreshInterval: string;
  maxResultWindow: number;
}

export interface SearchQuery {
  id: string;
  query: string;
  filters: SearchFilters;
  sort: SearchSort[];
  pagination: SearchPagination;
  highlights: SearchHighlight[];
  aggregations: SearchAggregation[];
}

export interface SearchSort {
  field: string;
  order: 'asc' | 'desc';
}

export interface SearchPagination {
  from: number;
  size: number;
}

export interface SearchHighlight {
  field: string;
  fragmentSize: number;
  numberOfFragments: number;
}

export interface SearchAggregation {
  name: string;
  type: 'terms' | 'range' | 'date_histogram' | 'stats' | 'cardinality';
  field: string;
  options?: Record<string, any>;
}
