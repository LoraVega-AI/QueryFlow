// Project-related TypeScript definitions for QueryFlow
// This file contains all types for project linking and management

export interface BaseProject {
  id: string;
  name: string;
  description?: string;
  path: string;
  projectType: ProjectType;
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt?: Date;
  status: ProjectStatus;
  metadata: ProjectMetadata;
}

export interface LocalProject extends BaseProject {
  type: 'local';
  localPath: string;
  databases: DatabaseConnection[];
  configFiles: ConfigFile[];
}

export interface GitHubProject extends BaseProject {
  type: 'github';
  repository: GitHubRepository;
  branch: string;
  clonePath: string;
  databases: DatabaseConnection[];
  configFiles: ConfigFile[];
  lastCommit?: GitHubCommit;
  pullRequests: GitHubPullRequest[];
}

export type Project = LocalProject | GitHubProject;

export type ProjectType =
  | 'nodejs'
  | 'python'
  | 'django'
  | 'laravel'
  | 'rails'
  | 'spring'
  | 'dotnet'
  | 'php'
  | 'react'
  | 'vue'
  | 'angular'
  | 'nextjs'
  | 'express'
  | 'flask'
  | 'fastapi'
  | 'unknown';

export type ProjectStatus =
  | 'detecting'
  | 'linking'
  | 'connected'
  | 'syncing'
  | 'error'
  | 'disconnected';

export interface ProjectMetadata {
  version?: string;
  packageManager?: 'npm' | 'yarn' | 'pnpm' | 'pip' | 'composer' | 'bundler';
  framework?: string;
  language?: string;
  dependencies: string[];
  scripts: Record<string, string>;
  environment: 'development' | 'production' | 'staging';
}

export interface DatabaseConnection {
  id: string;
  type: DatabaseType;
  name: string;
  config: DatabaseConfig;
  status: ConnectionStatus;
  lastConnected?: Date;
  schema?: DatabaseSchema;
  syncEnabled: boolean;
  syncDirection: SyncDirection;
}

export type DatabaseType =
  | 'sqlite'
  | 'postgresql'
  | 'mysql'
  | 'mongodb'
  | 'redis'
  | 'dynamodb'
  | 'oracle'
  | 'sqlserver';

export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'syncing';

export interface DatabaseConfig {
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  connectionString?: string;
  filePath?: string; // For SQLite
  options?: Record<string, any>;
}

export type SyncDirection =
  | 'queryflow-to-project'
  | 'project-to-queryflow'
  | 'bidirectional'
  | 'disabled';

export interface ConfigFile {
  path: string;
  type: ConfigFileType;
  content?: string;
  parsed?: any;
  lastModified: Date;
}

export type ConfigFileType =
  | 'package.json'
  | 'requirements.txt'
  | 'composer.json'
  | 'Gemfile'
  | 'config/database.php'
  | 'settings.py'
  | 'application.yml'
  | 'application.properties'
  | '.env'
  | '.env.local'
  | 'config.json'
  | 'database.json'
  | 'db.config.js';

export interface DatabaseSchema {
  tables: Table[];
  relationships: Relationship[];
  indexes: Index[];
  constraints: Constraint[];
  version: string;
  lastUpdated: Date;
}

export interface Table {
  name: string;
  columns: Column[];
  primaryKey?: string[];
  indexes: Index[];
  constraints: Constraint[];
  engine?: string;
  charset?: string;
  collation?: string;
}

export interface Column {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
  autoIncrement?: boolean;
  primaryKey?: boolean;
  unique?: boolean;
  foreignKey?: ForeignKey;
  length?: number;
  precision?: number;
  scale?: number;
}

export interface ForeignKey {
  table: string;
  column: string;
  onDelete: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  onUpdate: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

export interface Relationship {
  id: string;
  fromTable: string;
  toTable: string;
  fromColumns: string[];
  toColumns: string[];
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  name?: string;
}

export interface Index {
  name: string;
  table: string;
  columns: string[];
  unique: boolean;
  type: 'btree' | 'hash' | 'gin' | 'gist' | 'spgist' | 'brin';
}

export interface Constraint {
  name: string;
  type: 'primary' | 'unique' | 'foreign' | 'check';
  table: string;
  columns?: string[];
  expression?: string;
}

export interface ProjectDetectionResult {
  projectType: ProjectType;
  confidence: number;
  indicators: string[];
  databases: DatabaseConnection[];
  configFiles: ConfigFile[];
  metadata: Partial<ProjectMetadata>;
}

export interface ProjectUploadOptions {
  includeHidden: boolean;
  maxDepth: number;
  ignorePatterns: string[];
  scanTimeout: number;
}

export interface ProjectSyncOptions {
  direction: SyncDirection;
  conflictResolution: 'manual' | 'automatic' | 'queryflow-wins' | 'project-wins';
  batchSize: number;
  timeout: number;
  createBackups: boolean;
}

export interface SyncOperation {
  id: string;
  projectId: string;
  databaseId: string;
  type: 'schema' | 'data' | 'full';
  direction: SyncDirection;
  status: SyncStatus;
  startedAt: Date;
  completedAt?: Date;
  changes: SyncChange[];
  conflicts: SyncConflict[];
  error?: string;
}

export type SyncStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface SyncChange {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'table' | 'column' | 'index' | 'constraint' | 'data';
  entityName: string;
  entityType: string;
  oldValue?: any;
  newValue?: any;
  applied: boolean;
}

export interface SyncConflict {
  id: string;
  change: SyncChange;
  conflictType: 'concurrent_modification' | 'schema_mismatch' | 'data_conflict';
  description: string;
  resolution?: ConflictResolution;
  resolved: boolean;
  resolvedAt?: Date;
}

export type ConflictResolution =
  | 'queryflow_wins'
  | 'project_wins'
  | 'merge'
  | 'manual'
  | 'skip';
