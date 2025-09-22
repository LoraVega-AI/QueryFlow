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
    constraintName?: string;
    relationshipType: 'one-to-one' | 'one-to-many' | 'many-to-many' | 'self-referencing';
    onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' | 'SET DEFAULT';
    onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' | 'SET DEFAULT';
    deferrable?: boolean;
    initiallyDeferred?: boolean;
    enabled?: boolean;
    validated?: boolean;
  };
  unique?: boolean;
  autoIncrement?: boolean;
  indexed?: boolean;
  indexType?: 'B-tree' | 'Hash' | 'GIN' | 'GiST' | 'SP-GiST' | 'BRIN';
  indexName?: string;
  constraints?: {
    unique?: boolean;
    uniqueName?: string;
    check?: string;
    checkName?: string;
    checkExpression?: string;
    index?: boolean;
    autoIncrement?: boolean;
    autoIncrementStart?: number;
    autoIncrementIncrement?: number;
    autoIncrementMinValue?: number;
    autoIncrementMaxValue?: number;
    autoIncrementCycle?: boolean;
    // Constraint states
    enabled?: boolean;
    deferrable?: boolean;
    initiallyDeferred?: boolean;
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
  // Enhanced metadata
  comment?: string;
  description?: string;
  statistics?: {
    distinctValues?: number;
    nullValues?: number;
    avgLength?: number;
    minValue?: any;
    maxValue?: any;
    mostCommonValues?: Array<{ value: any; frequency: number }>;
  };
  documentation?: string;
  tags?: string[];
}

export interface Table {
  id: string;
  name: string;
  columns: Column[];
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  documentation?: string;
  tags?: string[];
  indexes?: TableIndex[];
  triggers?: TableTrigger[];
  businessRules?: BusinessRule[];
  version?: number;
  createdAt?: Date;
  updatedAt?: Date;
  data?: any[]; // Actual table data/records extracted from database
  // Enhanced metadata
  comment?: string;
  description?: string;
  schema?: string;
  catalog?: string;
  tablespace?: string;
  engine?: string; // MySQL engine (InnoDB, MyISAM, etc.)
  charset?: string;
  collation?: string;
  rowFormat?: string;
  autoIncrement?: number;
  checksum?: boolean;
  delayKeyWrite?: boolean;
  temporary?: boolean;
  partitioned?: boolean;
  statistics?: {
    rowCount?: number;
    dataLength?: number;
    indexLength?: number;
    avgRowLength?: number;
    autoIncrementValue?: number;
    checkTime?: Date;
    createTime?: Date;
    updateTime?: Date;
  };
  primaryKeys?: string[]; // Composite primary key columns
  constraints?: Array<{
    name: string;
    type: 'PRIMARY' | 'FOREIGN' | 'UNIQUE' | 'CHECK' | 'EXCLUDE';
    columns: string[];
    expression?: string;
    enabled?: boolean;
    deferrable?: boolean;
    initiallyDeferred?: boolean;
    referencedTable?: string;
    referencedColumns?: string[];
    onDelete?: string;
    onUpdate?: string;
  }>;
}

export interface TableIndex {
  id: string;
  name: string;
  columns: string[];
  unique: boolean;
  type: 'btree' | 'hash' | 'gin' | 'gist' | 'spgist' | 'brin';
  partial?: string;
  expression?: string; // For expression-based indexes
  covering?: string[]; // Covering/included columns
  clustered?: boolean;
  fillfactor?: number;
  condition?: string; // WHERE clause for partial indexes
  method?: string; // Index access method
  tablespace?: string;
  comment?: string;
  size?: number;
  pages?: number;
  tuples?: number;
  createdAt?: Date;
  updatedAt?: Date;
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

// Migration history interfaces
export interface Migration {
  id: string;
  version: string;
  name: string;
  filename: string;
  executedAt?: Date;
  rollbackFile?: string;
  dependencies?: string[];
  framework: 'alembic' | 'rails' | 'laravel' | 'django' | 'typeorm' | 'prisma' | 'sequelize';
  up?: string; // Up migration SQL/code
  down?: string; // Down migration SQL/code
  checksum?: string;
  executionTime?: number;
  status: 'pending' | 'executed' | 'failed' | 'rolled_back';
  description?: string;
  author?: string;
  batch?: number; // For Laravel-style batch migrations
}

export interface MigrationHistory {
  migrations: Migration[];
  currentVersion?: string;
  framework: string;
  migrationsTable?: string;
  migrationsPath?: string;
  lastExecuted?: Date;
}

// ORM mapping interfaces
export interface ORMModel {
  id: string;
  name: string;
  filename: string;
  framework: 'sequelize' | 'prisma' | 'typeorm' | 'django' | 'laravel' | 'hibernate' | 'mongoose';
  tableName?: string;
  primaryKey?: string | string[];
  timestamps?: boolean;
  softDeletes?: boolean;
  fillable?: string[];
  guarded?: string[];
  hidden?: string[];
  casts?: Record<string, string>;
  relationships?: ORMRelationship[];
  scopes?: ORMScope[];
  hooks?: ORMHook[];
  validations?: ORMValidation[];
  indexes?: ORMIndex[];
  metadata?: Record<string, any>;
  sourceCode?: string;
}

export interface ORMRelationship {
  id: string;
  type: 'hasOne' | 'hasMany' | 'belongsTo' | 'belongsToMany' | 'morphTo' | 'morphOne' | 'morphMany';
  relatedModel: string;
  foreignKey?: string;
  localKey?: string;
  pivotTable?: string;
  pivotColumns?: string[];
  constraints?: {
    onDelete?: string;
    onUpdate?: string;
  };
  eager?: boolean;
  cascade?: boolean;
}

export interface ORMScope {
  name: string;
  type: 'local' | 'global';
  parameters?: string[];
  query?: string;
}

export interface ORMHook {
  event: 'beforeCreate' | 'afterCreate' | 'beforeUpdate' | 'afterUpdate' | 'beforeDelete' | 'afterDelete';
  method: string;
  async?: boolean;
}

export interface ORMValidation {
  field: string;
  rules: string[];
  messages?: Record<string, string>;
}

export interface ORMIndex {
  name?: string;
  columns: string[];
  unique?: boolean;
  type?: string;
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
  // Enhanced metadata
  migrationHistory?: MigrationHistory;
  ormModels?: ORMModel[];
  databaseInfo?: {
    type: string; // postgresql, mysql, sqlite, etc.
    version: string;
    encoding: string;
    collation: string;
    timezone?: string;
    connectionString?: string;
    host?: string;
    port?: number;
    database?: string;
    size?: number;
    maxConnections?: number;
    currentConnections?: number;
  };
  sequences?: Array<{
    name: string;
    startValue: number;
    increment: number;
    minValue?: number;
    maxValue?: number;
    cycle: boolean;
    cache?: number;
    ownedBy?: string;
  }>;
  views?: Array<{
    name: string;
    definition: string;
    columns: string[];
    dependencies: string[];
    materialized?: boolean;
    updatable?: boolean;
  }>;
  functions?: Array<{
    name: string;
    parameters: Array<{ name: string; type: string; mode: 'IN' | 'OUT' | 'INOUT' }>;
    returnType: string;
    language: string;
    body: string;
    volatility: 'VOLATILE' | 'STABLE' | 'IMMUTABLE';
  }>;
  procedures?: Array<{
    name: string;
    parameters: Array<{ name: string; type: string; mode: 'IN' | 'OUT' | 'INOUT' }>;
    language: string;
    body: string;
  }>;
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
  totalRows?: number;
  hasForeignKeys?: boolean;
  hasIndexes?: boolean;
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
