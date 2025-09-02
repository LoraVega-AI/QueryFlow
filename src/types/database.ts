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
