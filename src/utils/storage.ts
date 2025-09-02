// Local storage utilities for persisting QueryFlow data
// This module handles saving and loading database schemas and records

import { DatabaseSchema, DatabaseRecord } from '@/types/database';

const STORAGE_KEYS = {
  SCHEMA: 'queryflow_schema',
  RECORDS: 'queryflow_records',
  QUERY_HISTORY: 'queryflow_query_history',
} as const;

export class StorageManager {
  // Schema management
  static saveSchema(schema: DatabaseSchema): void {
    try {
      const schemaData = {
        ...schema,
        createdAt: schema.createdAt.toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEYS.SCHEMA, JSON.stringify(schemaData));
    } catch (error) {
      console.error('Failed to save schema:', error);
    }
  }

  static loadSchema(): DatabaseSchema | null {
    try {
      const schemaData = localStorage.getItem(STORAGE_KEYS.SCHEMA);
      if (!schemaData) return null;

      const parsed = JSON.parse(schemaData);
      return {
        ...parsed,
        createdAt: new Date(parsed.createdAt),
        updatedAt: new Date(parsed.updatedAt),
      };
    } catch (error) {
      console.error('Failed to load schema:', error);
      return null;
    }
  }

  static clearSchema(): void {
    localStorage.removeItem(STORAGE_KEYS.SCHEMA);
  }

  // Records management
  static saveRecords(records: DatabaseRecord[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
    } catch (error) {
      console.error('Failed to save records:', error);
    }
  }

  static loadRecords(): DatabaseRecord[] {
    try {
      const recordsData = localStorage.getItem(STORAGE_KEYS.RECORDS);
      return recordsData ? JSON.parse(recordsData) : [];
    } catch (error) {
      console.error('Failed to load records:', error);
      return [];
    }
  }

  static clearRecords(): void {
    localStorage.removeItem(STORAGE_KEYS.RECORDS);
  }

  // Query history management
  static saveQueryHistory(queries: string[]): void {
    try {
      // Keep only the last 50 queries
      const limitedQueries = queries.slice(-50);
      localStorage.setItem(STORAGE_KEYS.QUERY_HISTORY, JSON.stringify(limitedQueries));
    } catch (error) {
      console.error('Failed to save query history:', error);
    }
  }

  static loadQueryHistory(): string[] {
    try {
      const historyData = localStorage.getItem(STORAGE_KEYS.QUERY_HISTORY);
      return historyData ? JSON.parse(historyData) : [];
    } catch (error) {
      console.error('Failed to load query history:', error);
      return [];
    }
  }

  // Clear all data
  static clearAll(): void {
    this.clearSchema();
    this.clearRecords();
    localStorage.removeItem(STORAGE_KEYS.QUERY_HISTORY);
  }

  // Export/Import functionality for future expansion
  static exportData(): { schema: DatabaseSchema | null; records: DatabaseRecord[] } {
    return {
      schema: this.loadSchema(),
      records: this.loadRecords(),
    };
  }

  static importData(data: { schema: DatabaseSchema | null; records: DatabaseRecord[] }): void {
    if (data.schema) {
      this.saveSchema(data.schema);
    }
    if (data.records) {
      this.saveRecords(data.records);
    }
  }
}
