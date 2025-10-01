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
  | 'unknown';

export type DatabaseType = 
  | 'sqlite'
  | 'postgresql'
  | 'mysql'
  | 'mongodb'
  | 'redis'
  | 'dynamodb'
  | 'oracle'
  | 'sqlserver';

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

export interface DatabaseConfig {
  filePath?: string;
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  [key: string]: any;
}

export interface DatabaseSchema {
  id: string;
  name: string;
  tables: any[];
  relationships?: any[];
  indexes?: Index[];
  metadata?: any;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  version?: number;
  description?: string;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type ProjectStatus = 'disconnected' | 'connecting' | 'connected' | 'syncing' | 'error';

export interface Project {
  id: string;
  name: string;
  description?: string;
  technology: string;
  status: ProjectStatus;
  lastSynced?: Date | null;
  databaseCount: number;
  icon: string;
  color: string;
  isExample: boolean;
  databases: any[];
  schema?: any;
  tables: any[];
  queries: any[];
  uploadPath?: string;
  originalFiles?: string[];
  totalTables?: number;
  totalRows?: number;
  hasForeignKeys?: boolean;
  hasIndexes?: boolean;
  systemCatalog?: {
    tables: any[];
    views: any[];
    indexes: any[];
    triggers: any[];
    sequences: any[];
    functions: any[];
    procedures: any[];
    metadata: {
      databaseType: string;
      version: string;
      encoding?: string;
      collation?: string;
      timezone?: string;
      extractedAt: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
  // Additional properties for compatibility
  path?: string;
  projectType?: ProjectType;
  type?: string;
  localPath?: string;
  githubPath?: string;
  [key: string]: any;
}

export interface Database {
  id: string;
  name: string;
  type: DatabaseType;
  connectionString: string;
  filePath?: string;
  relativePath?: string;
  isConnected: boolean;
  lastSync?: Date | string | null;
  tables?: any[];
  schema?: DatabaseSchema;
  size?: number;
  status?: string;
  tableCount?: number;
  totalRows?: number;
  hasForeignKeys?: boolean;
  hasIndexes?: boolean;
  extractionMetadata?: any;
  [key: string]: any;
}

export interface DatabaseConnection {
  id: string;
  name: string;
  type: DatabaseType;
  connectionString: string;
  isConnected: boolean;
  lastSync?: Date | string | null;
  [key: string]: any;
}

export interface Table {
  id: string;
  name: string;
  columns: Column[];
  rowCount?: number;
  data?: any[];
  [key: string]: any;
}

export interface Column {
  id: string;
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  defaultValue?: any;
  [key: string]: any;
}

export interface LocalProject extends Project {
  localPath: string;
  isLocal: true;
}

export interface GitHubProject extends Project {
  githubPath: string;
  isLocal: false;
}

export interface Relationship {
  id: string;
  name: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

export interface Index {
  id: string;
  name: string;
  table: string;
  columns: string[];
  unique: boolean;
  type: 'btree' | 'hash' | 'gin' | 'gist' | 'spgist';
}

export interface Constraint {
  id: string;
  name: string;
  table: string;
  type: 'primary' | 'foreign' | 'unique' | 'check';
  definition: string;
}

export interface ForeignKey {
  id: string;
  name: string;
  table: string;
  column: string;
  referencedTable: string;
  referencedColumn: string;
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

export interface DatabaseConnector {
  testConnection(type: string, config: any): Promise<{ success: boolean; error?: string }>;
}