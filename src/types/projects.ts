// Project types and interfaces for QueryFlow

export interface Project {
  id: string;
  name: string;
  description: string;
  technology: string;
  status: 'connected' | 'syncing' | 'error' | 'disconnected';
  lastSynced: string | null;
  databaseCount: number;
  databases: Database[];
  icon: string;
  color: string;
  schema?: DatabaseSchema;
  tables?: Table[];
  queries?: QueryTemplate[];
}

export interface Database {
  id: string;
  name: string;
  type: 'sqlite' | 'postgresql' | 'mysql' | 'mongodb';
  connectionString: string;
  tables: Table[];
  isConnected: boolean;
  lastSync: string | null;
}

export interface Table {
  id: string;
  name: string;
  columns: Column[];
  rowCount: number;
  data?: any[];
}

export interface Column {
  id: string;
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  defaultValue?: any;
}

export interface DatabaseSchema {
  tables: Table[];
  relationships: Relationship[];
  indexes: Index[];
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
  tableId: string;
  columnIds: string[];
  unique: boolean;
  name: string;
}

export interface QueryTemplate {
  id: string;
  name: string;
  description: string;
  sql: string;
  parameters: QueryParameter[];
  category: string;
  tags: string[];
}

export interface QueryParameter {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: any;
  description?: string;
}
