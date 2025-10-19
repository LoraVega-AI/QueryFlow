// Database Definition Extraction System Types
// Intermediate Representation (IR) and extraction pipeline types

import { DataType } from './database';

// Re-export DataType for use in adapters
export type { DataType };

// Supported languages and frameworks
export type SupportedLanguage = 'javascript' | 'typescript' | 'python' | 'php' | 'java';
export type SupportedFramework = 
  | 'sequelize' | 'prisma' | 'mongoose' | 'typeorm'
  | 'django' | 'sqlalchemy' | 'alembic'
  | 'laravel' | 'eloquent'
  | 'hibernate' | 'jpa' | 'spring-data';

// File Processing Types
export interface FileInfo {
  path: string;
  name: string;
  extension: string;
  size: number;
  mimeType: string;
  hash: string;
  language?: SupportedLanguage;
  framework?: SupportedFramework;
  lastModified: Date;
  encoding: string;
}

export interface FileContent {
  info: FileInfo;
  content: string;
  lines: string[];
  ast?: any; // Language-specific AST
}

// Extraction Results
export interface ExtractionCandidate {
  file: FileInfo;
  type: 'table' | 'model' | 'migration' | 'schema' | 'config' | 'raw-sql';
  confidence: number;
  startLine: number;
  endLine: number;
  content: string;
  framework?: SupportedFramework;
  metadata: Record<string, any>;
}

// Intermediate Representation (IR) - Universal Schema Format
export interface IRField {
  name: string;
  type: DataType;
  nullable: boolean;
  primaryKey: boolean;
  unique: boolean;
  autoIncrement: boolean;
  defaultValue?: any;
  constraints?: {
    maxLength?: number;
    minLength?: number;
    precision?: number;
    scale?: number;
    check?: string;
    enumValues?: string[];
    pattern?: string;
    defaultValue?: any;
  };
  foreignKey?: {
    table: string;
    field: string;
    onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
    onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  };
  indexes?: IRIndex[];
  documentation?: string;
  sourceLocation: SourceLocation;
}

export interface IRIndex {
  name: string;
  type: 'btree' | 'hash' | 'gin' | 'gist' | 'unique' | 'partial';
  fields: string[];
  unique: boolean;
  partial?: string;
  sourceLocation: SourceLocation;
}

export interface IRTable {
  name: string;
  schema?: string;
  fields: IRField[];
  indexes: IRIndex[];
  constraints: IRConstraint[];
  triggers: IRTrigger[];
  metadata: IRTableMetadata;
  sourceLocation: SourceLocation;
}

export interface IRConstraint {
  name: string;
  type: 'primary' | 'foreign' | 'unique' | 'check';
  fields: string[];
  referencedTable?: string;
  referencedFields?: string[];
  definition: string;
  sourceLocation: SourceLocation;
}

export interface IRTrigger {
  name: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  timing: 'BEFORE' | 'AFTER' | 'INSTEAD_OF';
  action: string;
  condition?: string;
  sourceLocation: SourceLocation;
}

export interface IRTableMetadata {
  framework: SupportedFramework;
  language: SupportedLanguage;
  version?: string;
  tablespace?: string;
  engine?: string;
  charset?: string;
  collation?: string;
  documentation?: string;
  tags: string[];
  confidence: number;
  inferred: boolean;
  inferredFields: string[];
}

export interface SourceLocation {
  file: string;
  startLine: number;
  endLine: number;
  startColumn?: number;
  endColumn?: number;
}

// Schema IR - Complete Database Representation
export interface IRSchema {
  name: string;
  tables: IRTable[];
  views: IRView[];
  functions: IRFunction[];
  procedures: IRProcedure[];
  sequences: IRSequence[];
  types: IRCustomType[];
  metadata: IRSchemaMetadata;
  relationships: IRRelationship[];
  sourceFiles: string[];
}

export interface IRView {
  name: string;
  schema?: string;
  definition: string;
  fields: IRField[];
  dependencies: string[];
  sourceLocation: SourceLocation;
}

export interface IRFunction {
  name: string;
  schema?: string;
  parameters: IRParameter[];
  returnType: DataType;
  body: string;
  language: string;
  sourceLocation: SourceLocation;
}

export interface IRProcedure {
  name: string;
  schema?: string;
  parameters: IRParameter[];
  body: string;
  language: string;
  sourceLocation: SourceLocation;
}

export interface IRParameter {
  name: string;
  type: DataType;
  direction: 'IN' | 'OUT' | 'INOUT';
  defaultValue?: any;
}

export interface IRSequence {
  name: string;
  schema?: string;
  startValue: number;
  increment: number;
  minValue?: number;
  maxValue?: number;
  cycle: boolean;
  sourceLocation: SourceLocation;
}

export interface IRCustomType {
  name: string;
  schema?: string;
  definition: string;
  baseType?: DataType;
  enumValues?: string[];
  sourceLocation: SourceLocation;
}

export interface IRRelationship {
  id: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  sourceTable: string;
  sourceField: string;
  targetTable: string;
  targetField: string;
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  sourceLocation: SourceLocation;
}

export interface IRSchemaMetadata {
  extractedAt: Date;
  sourceProject: string;
  confidence: number;
  frameworks: SupportedFramework[];
  languages: SupportedLanguage[];
  version: string;
  totalTables: number;
  totalFields: number;
  totalRelationships: number;
  extractionTime: number;
  warnings: ExtractionWarning[];
  errors: ExtractionError[];
}

// Extraction Pipeline Types
export interface ExtractionOptions {
  includeHidden: boolean;
  maxDepth: number;
  ignorePatterns: string[];
  scanTimeout: number;
  enableASTCaching: boolean;
  enableIncrementalParsing: boolean;
  parallelProcessing: boolean;
  maxWorkers: number;
  frameworks: SupportedFramework[];
  languages: SupportedLanguage[];
  confidence: {
    minimum: number;
    regexWeight: number;
    astWeight: number;
    frameworkWeight: number;
  };
  verification: {
    enabled: boolean;
    mode: 'strict' | 'lenient' | 'disabled';
    failOnError: boolean;
    introspectionDepth: 'shallow' | 'deep';
  };
}

export interface ExtractionProgress {
  stage: 'scanning' | 'filtering' | 'parsing' | 'adapting' | 'normalizing' | 'converting' | 'complete';
  filesTotal: number;
  filesProcessed: number;
  candidatesFound: number;
  tablesExtracted: number;
  errors: number;
  warnings: number;
  estimatedTimeRemaining: number;
}

export interface ExtractionResult {
  schema: IRSchema;
  sqliteDb?: ArrayBuffer;
  progress: ExtractionProgress;
  performance: ExtractionPerformance;
  metadata: {
    totalFiles: number;
    processedFiles: number;
    extractionTime: number;
    confidence: number;
  };
  verificationStatus?: {
    stage: 'idle' | 'introspecting' | 'reconciling' | 'analyzing' | 'complete' | 'error';
    progress: number;
    currentOperation: string;
    errors: string[];
    warnings: string[];
  };
  // Comprehensive unified report sections
  verification?: {
    verifiedTables: any[];
    phantomTables: any[];
    duplicateTables: any[];
    mismatchedTables: any[];
    reconciliationMatches: any[];
    verificationStats: {
      totalExtracted: number;
      verified: number;
      phantoms: number;
      duplicates: number;
      mismatched: number;
      accuracy: number;
      reconciliationScore: number;
    };
    extractionConsistency?: {
      unusedModels: Array<{
        modelName: string;
        modelType: 'TABLE' | 'VIEW' | 'COLLECTION';
        filePath?: string;
        reason: 'NOT_IN_DATABASE' | 'NO_MATCHING_TABLE' | 'STRUCTURE_MISMATCH';
        details: string;
        suggestions: string[];
      }>;
      phantomStructures: Array<{
        structureName: string;
        structureType: 'TABLE' | 'VIEW' | 'INDEX' | 'CONSTRAINT' | 'TRIGGER' | 'FUNCTION' | 'PROCEDURE';
        databaseSource: 'CATALOG' | 'INTROSPECTION';
        reason: 'NOT_IN_ORM' | 'NO_MATCHING_MODEL' | 'ORPHANED_OBJECT';
        details: string;
        suggestions: string[];
      }>;
      constraintDiscrepancies: Array<{
        tableName: string;
        constraintType: 'PRIMARY_KEY' | 'FOREIGN_KEY' | 'UNIQUE' | 'CHECK' | 'NOT_NULL';
        ormDefinition?: any;
        databaseDefinition?: any;
        discrepancyType: 'MISSING_IN_ORM' | 'MISSING_IN_DATABASE' | 'STRUCTURE_MISMATCH' | 'NAME_MISMATCH';
        severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        details: string;
      }>;
      relationDiscrepancies: Array<{
        tableName: string;
        relationType: 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_MANY' | 'BELONGS_TO' | 'HAS_MANY' | 'HAS_ONE';
        ormDefinition?: any;
        databaseDefinition?: any;
        discrepancyType: 'MISSING_IN_ORM' | 'MISSING_IN_DATABASE' | 'STRUCTURE_MISMATCH' | 'TYPE_MISMATCH';
        severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        details: string;
      }>;
      columnDiscrepancies: Array<{
        tableName: string;
        columnName: string;
        ormDefinition?: any;
        databaseDefinition?: any;
        discrepancyType: 'MISSING_IN_ORM' | 'MISSING_IN_DATABASE' | 'TYPE_MISMATCH' | 'NULLABLE_MISMATCH' | 'DEFAULT_MISMATCH';
        severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        details: string;
      }>;
      consistencyMetrics: {
        totalModels: number;
        totalDatabaseObjects: number;
        unusedModelCount: number;
        phantomStructureCount: number;
        constraintDiscrepancyCount: number;
        relationDiscrepancyCount: number;
        columnDiscrepancyCount: number;
        overallConsistencyScore: number;
        criticalIssuesCount: number;
        highIssuesCount: number;
        mediumIssuesCount: number;
        lowIssuesCount: number;
      };
    };
  };
  databaseIntrospection?: {
    actualTables: string[];
    databaseConfiguration?: any;
    statistics?: any;
    tableMetadata: any[];
    views?: any[];
    indexes?: any[];
    triggers?: any[];
    sequences?: any[];
    procedures?: any[];
    functions?: any[];
    events?: any[];
    security?: any;
    runtimeState?: any;
    dependencyGraph?: any;
    // Engine-specific features
    extensions?: any;
    partitioning?: any;
    engineInfo?: any;
    pragmas?: any;
    mongoOptions?: any;
  };
  // Schema objects section
  schemaObjects?: {
    tables: any[];
    views: any[];
    indexes: any[];
    triggers: any[];
    sequences: any[];
    procedures: any[];
    functions: any[];
    events: any[];
    materializedViews: any[];
    partitionedTables: any[];
    temporaryTables: any[];
  };
  // Enhanced columns section
  columns?: {
    detailedMetadata: any[];
    typeMappings: any[];
    constraintAnalysis: any[];
    relationshipMapping: any[];
    performanceMetrics: any[];
  };
  // Constraints section
  constraints?: {
    primaryKeys: any[];
    foreignKeys: any[];
    uniqueConstraints: any[];
    checkConstraints: any[];
    notNullConstraints: any[];
    exclusionConstraints: any[];
    constraintValidation: any[];
  };
  // Statistics section
  statistics?: {
    tableStatistics: any[];
    indexStatistics: any[];
    performanceMetrics: any[];
    sizeAnalysis: any[];
    usagePatterns: any[];
  };
  // Functions and procedures section
  functions?: {
    storedProcedures: any[];
    userDefinedFunctions: any[];
    triggers: any[];
    events: any[];
    sequences: any[];
    dependencies: any[];
  };
  // Users and roles section
  security?: {
    users: any[];
    roles: any[];
    permissions: any[];
    grants: any[];
    accessControl: any[];
  };
  // Runtime state section
  runtimeState?: {
    connections: any[];
    transactions: any[];
    locks: any[];
    blockingLocks: any[];
    systemMetrics: any[];
  };
  // Engine features section
  engineFeatures?: {
    extensions: any;
    partitioning: any;
    engineInfo: any;
    pragmas: any;
    mongoOptions: any;
    databaseConfiguration: any;
  };
}

export interface ExtractionPerformance {
  startTime: Date;
  endTime: Date;
  totalTime: number;
  stageTimings: Record<string, number>;
  memoryUsage: {
    peak: number;
    average: number;
    final: number;
  };
  cacheHits: number;
  cacheMisses: number;
}

export interface ExtractionWarning {
  type: 'confidence' | 'syntax' | 'compatibility' | 'performance';
  message: string;
  file?: string;
  line?: number;
  suggestion?: string;
}

export interface ExtractionError {
  type: 'parse' | 'validation' | 'conversion' | 'system';
  message: string;
  file?: string;
  line?: number;
  stack?: string;
  fatal: boolean;
}

// Framework Adapter Interface
export interface FrameworkAdapter {
  readonly name: SupportedFramework;
  readonly language: SupportedLanguage;
  readonly filePatterns: string[];
  readonly confidence: number;
  readonly extensions: string[];

  canHandle(file: FileInfo, content: string): boolean;
  detectFramework(file: FileInfo, content: string): number;
  extractDefinitions(file: FileContent): Promise<ExtractionCandidate[]>;
  parseToIR(candidates: ExtractionCandidate[]): Promise<IRTable[]>;
}

// Language Parser Interface
export interface LanguageParser {
  readonly language: SupportedLanguage;
  readonly extensions: string[];

  parse(content: string, options?: any): Promise<any>;
  traverse(ast: any, visitor: ASTVisitor): Promise<void>;
  extractNodes(ast: any, nodeTypes: string[]): any[];
}

export interface ASTVisitor {
  enter?(node: any, parent?: any): void;
  exit?(node: any, parent?: any): void;
  [key: string]: ((node: any, parent?: any) => void) | undefined;
}

// Regex Filter Types
export interface RegexPattern {
  name: string;
  pattern: RegExp;
  frameworks: SupportedFramework[];
  confidence: number;
  description: string;
}

export interface RegexMatch {
  pattern: RegexPattern;
  match: RegExpMatchArray;
  startLine: number;
  endLine: number;
  confidence: number;
}

// SQLite Conversion Types
export interface SQLiteConversionOptions {
  preserveEnums: boolean;
  createIndexes: boolean;
  addMetadata: boolean;
  enableConstraints: boolean;
}

export interface SQLiteSchema {
  tables: SQLiteTable[];
  indexes: SQLiteIndex[];
  triggers: SQLiteTrigger[];
  views: SQLiteView[];
  metadata: Record<string, any>;
}

export interface SQLiteTable {
  name: string;
  sql: string;
  fields: SQLiteField[];
}

export interface SQLiteField {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  primaryKey: boolean;
  autoIncrement: boolean;
}

export interface SQLiteIndex {
  name: string;
  table: string;
  sql: string;
  unique: boolean;
}

export interface SQLiteTrigger {
  name: string;
  table: string;
  sql: string;
  event: string;
  timing: string;
}

export interface SQLiteView {
  name: string;
  sql: string;
}

// Validation Types
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  score: number;
}

export interface ValidationError {
  type: 'schema' | 'table' | 'field' | 'relationship' | 'constraint';
  message: string;
  location?: SourceLocation;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationWarning {
  type: 'naming' | 'performance' | 'compatibility' | 'best-practice';
  message: string;
  location?: SourceLocation;
  suggestion?: string;
}

// Worker Thread Types
export interface WorkerTask {
  id: string;
  type: 'parse' | 'extract' | 'convert';
  data: any;
  options: any;
}

export interface WorkerResult {
  taskId: string;
  success: boolean;
  result?: any;
  error?: string;
  performance: {
    startTime: number;
    endTime: number;
    memoryUsage: number;
  };
}

// Cache Types
export interface CacheEntry {
  key: string;
  value: any;
  createdAt: Date;
  lastAccessed: Date;
  hits: number;
  size: number;
}

export interface CacheOptions {
  maxSize: number;
  maxAge: number;
  enableCompression: boolean;
  enablePersistence: boolean;
  evictionPolicy: 'lru' | 'lfu' | 'ttl';
}
