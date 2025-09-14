'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { DatabaseSchema, QueryResult } from '@/types/database';

interface DatabaseConnection {
  id: string;
  type: 'mysql' | 'postgresql' | 'sqlite';
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
}

interface DatabaseContextType {
  activeConnection: DatabaseConnection | null;
  connectDatabase: (connectionId: string, credentials: any, schema?: DatabaseSchema) => void;
  disconnectDatabase: () => void;
  executeQuery: (sql: string, params?: any[]) => Promise<QueryResult>;
  isConnected: boolean;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [activeConnection, setActiveConnection] = useState<DatabaseConnection | null>(null);

  const connectDatabase = useCallback((connectionId: string, credentials: any, schema?: DatabaseSchema) => {
    const connection: DatabaseConnection = {
      id: connectionId,
      type: credentials.type,
      host: credentials.host,
      database: credentials.database,
      credentials,
      schema,
      connected: true
    };

    setActiveConnection(connection);
    console.log('Database connected:', connection);
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

  const value: DatabaseContextType = {
    activeConnection,
    connectDatabase,
    disconnectDatabase,
    executeQuery,
    isConnected: activeConnection?.connected || false
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
