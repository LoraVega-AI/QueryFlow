'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { DatabaseSchema, QueryResult } from '@/types/database';

interface DatabaseConnection {
  id: string;
  type: 'mysql' | 'postgresql' | 'sqlite' | 'extracted';
  host?: string;
  database?: string;
  credentials: {
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    database?: string;
    filePath?: string;
  };
  schema?: DatabaseSchema;
  connected: boolean;
  // Additional metadata for uploaded databases
  projectId?: string;
  projectName?: string;
  uploadPath?: string;
  tableCount?: number;
  totalRows?: number;
  hasForeignKeys?: boolean;
  hasIndexes?: boolean;
  lastConnected?: Date;
}

interface DatabaseContextType {
  activeConnection: DatabaseConnection | null;
  connectDatabase: (connectionId: string, credentials: any, schema?: DatabaseSchema, metadata?: any) => void;
  disconnectDatabase: () => void;
  executeQuery: (sql: string, params?: any[]) => Promise<QueryResult>;
  isConnected: boolean;
  // Additional methods for uploaded databases
  getConnectionInfo: () => DatabaseConnection | null;
  updateConnectionMetadata: (metadata: Partial<DatabaseConnection>) => void;
  // Persistence methods
  saveConnectionToStorage: () => void;
  loadConnectionFromStorage: () => void;
  clearStoredConnection: () => void;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [activeConnection, setActiveConnection] = useState<DatabaseConnection | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Storage key for persistence
  const STORAGE_KEY = 'queryflow_active_connection';

  const connectDatabase = useCallback((connectionId: string, credentials: any, schema?: DatabaseSchema, metadata?: any) => {
    const connection: DatabaseConnection = {
      id: connectionId,
      type: credentials.type,
      host: credentials.host,
      database: credentials.database,
      credentials,
      schema,
      connected: true,
      lastConnected: new Date(),
      // Add metadata if provided
      ...(metadata && {
        projectId: metadata.projectId,
        projectName: metadata.projectName,
        uploadPath: metadata.uploadPath,
        tableCount: metadata.tableCount,
        totalRows: metadata.totalRows,
        hasForeignKeys: metadata.hasForeignKeys,
        hasIndexes: metadata.hasIndexes
      })
    };

    setActiveConnection(connection);
    console.log('Database connected:', {
      id: connection.id,
      type: connection.type,
      projectName: connection.projectName,
      tableCount: connection.tableCount,
      totalRows: connection.totalRows,
      hasSchema: !!connection.schema
    });
  }, []);

  const disconnectDatabase = useCallback(() => {
    setActiveConnection(null);
    console.log('Database disconnected');
  }, []);

  const executeQuery = useCallback(async (sql: string, params?: any[]): Promise<QueryResult> => {
    if (!activeConnection) {
      throw new Error('No active database connection');
    }

    try {
      const response = await fetch('/api/database/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connectionId: activeConnection.id,
          sql,
          params
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || result.message);
      }

      return result.data;
    } catch (error: any) {
      throw new Error(`Query execution failed: ${error.message}`);
    }
  }, [activeConnection]);

  const getConnectionInfo = useCallback(() => {
    return activeConnection;
  }, [activeConnection]);

  const updateConnectionMetadata = useCallback((metadata: Partial<DatabaseConnection>) => {
    if (activeConnection) {
      setActiveConnection(prev => prev ? { ...prev, ...metadata } : null);
    }
  }, [activeConnection]);

  // Persistence methods
  const saveConnectionToStorage = useCallback(() => {
    if (activeConnection) {
      try {
        const connectionToStore = {
          ...activeConnection,
          lastConnected: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(connectionToStore));
        console.log('Database connection saved to storage');
      } catch (error) {
        console.error('Failed to save connection to storage:', error);
      }
    }
  }, [activeConnection, STORAGE_KEY]);

  const loadConnectionFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const connection = JSON.parse(stored);
        // Convert lastConnected back to Date
        if (connection.lastConnected) {
          connection.lastConnected = new Date(connection.lastConnected);
        }
        setActiveConnection(connection);
        console.log('Database connection loaded from storage:', connection.id);
        return true;
      }
    } catch (error) {
      console.error('Failed to load connection from storage:', error);
      // Clear corrupted data
      localStorage.removeItem(STORAGE_KEY);
    }
    return false;
  }, [STORAGE_KEY]);

  const clearStoredConnection = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('Stored connection cleared');
    } catch (error) {
      console.error('Failed to clear stored connection:', error);
    }
  }, [STORAGE_KEY]);

  // Initialize from storage on mount
  useEffect(() => {
    if (!isInitialized) {
      const loaded = loadConnectionFromStorage();
      if (loaded) {
        console.log('DatabaseContext: Loaded connection from storage:', activeConnection?.id);
      }
      setIsInitialized(true);
    }
  }, [isInitialized, loadConnectionFromStorage, activeConnection]);

  // Save to storage when connection changes
  useEffect(() => {
    if (isInitialized) {
      if (activeConnection) {
        saveConnectionToStorage();
      } else {
        clearStoredConnection();
      }
    }
  }, [activeConnection, isInitialized, saveConnectionToStorage, clearStoredConnection]);

  const value: DatabaseContextType = {
    activeConnection,
    connectDatabase,
    disconnectDatabase,
    executeQuery,
    isConnected: activeConnection?.connected || false,
    getConnectionInfo,
    updateConnectionMetadata,
    saveConnectionToStorage,
    loadConnectionFromStorage,
    clearStoredConnection
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
}
