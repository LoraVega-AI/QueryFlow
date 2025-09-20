// Project-related type definitions

export type ProjectType = 
  | 'nodejs'
  | 'python'
  | 'django'
  | 'flask'
  | 'fastapi'
  | 'laravel'
  | 'rails'
  | 'spring'
  | 'dotnet'
  | 'react'
  | 'vue'
  | 'angular'
  | 'nextjs'
  | 'express'
  | 'php'
  | 'local'
  | 'github'
  | 'unknown';

export type ProjectStatus = 'active' | 'inactive' | 'archived' | 'draft' | 'connected' | 'disconnected' | 'syncing' | 'error';

export interface Project {
  id: string;
  name: string;
  description?: string;
  type: ProjectType;
  projectType: ProjectType;
  status: ProjectStatus;
  path?: string;
  localPath?: string;
  branch?: string;
  clonePath?: string;
  databases?: any[];
  configFiles?: any[];
  pullRequests?: any[];
  databaseCount?: number;
  totalTables?: number;
  totalRows?: number;
  hasSchema?: boolean;
  hasForeignKeys?: boolean;
  hasIndexes?: boolean;
  schema?: any;
  tables?: any[];
  repository?: {
    id: number;
    name: string;
    full_name: string;
    owner: string;
    url: string;
    clone_url: string;
    default_branch: string;
  };
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt?: Date;
  metadata?: Record<string, any>;
}

export interface ProjectUploadOptions {
  includeHidden: boolean;
  maxDepth: number;
  ignorePatterns: string[];
  scanTimeout: number;
}

export interface ProjectDetectionResult {
  projectName: string;
  projectType: ProjectType;
  confidence: number;
  configFiles: string[];
  databases: Array<{
    name: string;
    type: string;
    config: {
      filePath: string;
      database: string;
    };
    status: 'ready' | 'connected' | 'error';
  }>;
  uploadPath?: string;
  projectId?: string;
  projectData?: any; // Full project data from API response
}

export type DatabaseType = 'sqlite' | 'mysql' | 'postgresql' | 'mongodb' | 'redis' | 'dynamodb' | 'oracle' | 'sqlserver' | 'unknown';

export interface DatabaseConfig {
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  type?: string;
  connectionString?: string;
  filePath?: string;
}

// Re-export DatabaseSchema from database types
export type { DatabaseSchema } from './database';

// Add missing interfaces
export interface Database {
  id: string;
  name: string;
  type: DatabaseType;
  config: DatabaseConfig;
  status: ConnectionStatus;
  tableCount?: number;
  lastSync?: string | null;
  schema?: DatabaseSchema;
  tables?: Table[];
}

export interface Table {
  id: string;
  name: string;
  columns: Column[];
  rowCount: number;
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
  relationships?: Relationship[];
}

export interface Column {
  id: string;
  name: string;
  type: string;
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
    maxLength?: number;
    minLength?: number;
  };
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

export interface Relationship {
  id: string;
  fromTable: string;
  toTable: string;
  fromColumn: string;
  toColumn: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

export interface Index {
  id: string;
  name: string;
  columns: string[];
  unique: boolean;
  type?: string;
}

export interface Constraint {
  id: string;
  name: string;
  type: 'check' | 'unique' | 'not_null';
  expression?: string;
  columns?: string[];
}

export interface ForeignKey {
  id: string;
  column: string;
  referencedTable: string;
  referencedColumn: string;
  onDelete?: string;
  onUpdate?: string;
}

export interface DatabaseConnection {
  id: string;
  name: string;
  type: DatabaseType;
  config: DatabaseConfig;
  status: ConnectionStatus;
  lastConnected?: Date;
  schema?: DatabaseSchema;
}

export interface LocalProject {
  id: string;
  name: string;
  path: string;
  type: ProjectType;
  status: ProjectStatus;
  databases: Database[];
  configFiles: ConfigFile[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GitHubProject {
  id: string;
  name: string;
  repository: {
    id: number;
    name: string;
    full_name: string;
    owner: string;
    url: string;
    clone_url: string;
    default_branch: string;
  };
  branch: string;
  clonePath: string;
  type: ProjectType;
  status: ProjectStatus;
  databases: Database[];
  configFiles: ConfigFile[];
  pullRequests: any[];
  createdAt: Date;
  updatedAt: Date;
}

export type ConnectionStatus = 'ready' | 'connected' | 'error' | 'disconnected';

export interface DatabaseConnector {
  testConnection(type: string, config: any): Promise<{ success: boolean; error?: string; latency?: number }>;
}