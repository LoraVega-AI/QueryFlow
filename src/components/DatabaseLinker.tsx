'use client';

// Database Linker Component
// Auto-detects and manages database connections for linked projects

import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  Play,
  Square,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings,
  RefreshCw,
  Eye,
  EyeOff,
  TestTube,
  Zap,
  Shield,
  Clock,
  Server,
  FileText,
  Key,
  Link,
  Unlink,
  Info
} from 'lucide-react';
import {
  DatabaseConnection,
  DatabaseType,
  DatabaseConfig,
  DatabaseSchema,
  ConnectionStatus
} from '@/types/project';
import { DatabaseConnector } from '@/utils/databaseConnector';
import { ProjectService } from '@/services/projectService';

interface DatabaseLinkerProps {
  projectId: string;
  databases: DatabaseConnection[];
  onDatabasesChange: (databases: DatabaseConnection[]) => void;
  onSchemaLoaded?: (databaseId: string, schema: DatabaseSchema) => void;
}

interface ConnectionTest {
  isTesting: boolean;
  result?: {
    success: boolean;
    error?: string;
    latency?: number;
  };
}

const DATABASE_ICONS: Record<DatabaseType, string> = {
  sqlite: '📄',
  postgresql: '🐘',
  mysql: '🦌',
  mongodb: '🍃',
  redis: '🔴',
  dynamodb: '⚡',
  oracle: '🔶',
  sqlserver: '🔷'
};

const DATABASE_NAMES: Record<DatabaseType, string> = {
  sqlite: 'SQLite',
  postgresql: 'PostgreSQL',
  mysql: 'MySQL',
  mongodb: 'MongoDB',
  redis: 'Redis',
  dynamodb: 'DynamoDB',
  oracle: 'Oracle',
  sqlserver: 'SQL Server'
};

const STATUS_CONFIG = {
  connecting: { icon: RefreshCw, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Connecting' },
  connected: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50', label: 'Connected' },
  disconnected: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', label: 'Disconnected' },
  error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', label: 'Error' },
  syncing: { icon: RefreshCw, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Syncing' }
};

export function DatabaseLinker({
  projectId,
  databases,
  onDatabasesChange,
  onSchemaLoaded
}: DatabaseLinkerProps) {
  const [connectionTests, setConnectionTests] = useState<Map<string, ConnectionTest>>(new Map());
  const [showPasswords, setShowPasswords] = useState<Set<string>>(new Set());
  const [editingConnection, setEditingConnection] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState<Set<string>>(new Set());
  const [schemas, setSchemas] = useState<Map<string, DatabaseSchema>>(new Map());

  // Test database connection
  const testConnection = useCallback(async (database: DatabaseConnection) => {
    const testId = `test_${database.id}_${Date.now()}`;
    setConnectionTests(prev => new Map(prev.set(database.id, { isTesting: true })));

    try {
      const result = await DatabaseConnector.testConnection(database.type, database.config);

      setConnectionTests(prev => new Map(prev.set(database.id, {
        isTesting: false,
        result: {
          success: result.success,
          error: result.error,
          latency: result.latency
        }
      })));

      // Update database status
      const updatedDatabases = databases.map(db =>
        db.id === database.id
          ? { ...db, status: result.success ? 'connected' : 'error' as ConnectionStatus }
          : db
      );
      onDatabasesChange(updatedDatabases);

    } catch (error) {
      setConnectionTests(prev => new Map(prev.set(database.id, {
        isTesting: false,
        result: {
          success: false,
          error: error instanceof Error ? error.message : 'Connection test failed'
        }
      })));
    }
  }, [databases, onDatabasesChange]);

  // Load database schema
  const loadSchema = useCallback(async (database: DatabaseConnection) => {
    if (database.status !== 'connected') {
      console.warn('Cannot load schema for disconnected database');
      return;
    }

    try {
      const schema = await DatabaseConnector.introspectSchema(database.type, database.config);
      setSchemas(prev => new Map(prev.set(database.id, schema)));
      onSchemaLoaded?.(database.id, schema);
    } catch (error) {
      console.error('Failed to load schema:', error);
    }
  }, [onSchemaLoaded]);

  // Toggle connection
  const toggleConnection = useCallback(async (database: DatabaseConnection) => {
    if (database.status === 'connected') {
      // Disconnect
      const updatedDatabases = databases.map(db =>
        db.id === database.id ? { ...db, status: 'disconnected' as ConnectionStatus } : db
      );
      onDatabasesChange(updatedDatabases);
    } else {
      // Connect
      await testConnection(database);
    }
  }, [databases, onDatabasesChange, testConnection]);

  // Update database configuration
  const updateDatabaseConfig = useCallback((databaseId: string, config: Partial<DatabaseConfig>) => {
    const updatedDatabases = databases.map(db =>
      db.id === databaseId ? { ...db, config: { ...db.config, ...config } } : db
    );
    onDatabasesChange(updatedDatabases);
  }, [databases, onDatabasesChange]);

  // Add new database connection
  const addDatabaseConnection = useCallback(() => {
    const newDatabase: DatabaseConnection = {
      id: `db_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'postgresql',
      name: 'New Database',
      config: {
        host: 'localhost',
        port: 5432,
        database: 'database',
        username: 'user',
        password: ''
      },
      status: 'disconnected',
      syncEnabled: true,
      syncDirection: 'bidirectional'
    };

    onDatabasesChange([...databases, newDatabase]);
  }, [databases, onDatabasesChange]);

  // Remove database connection
  const removeDatabaseConnection = useCallback((databaseId: string) => {
    if (confirm('Are you sure you want to remove this database connection?')) {
      const updatedDatabases = databases.filter(db => db.id !== databaseId);
      onDatabasesChange(updatedDatabases);
      setSchemas(prev => {
        const newSchemas = new Map(prev);
        newSchemas.delete(databaseId);
        return newSchemas;
      });
    }
  }, [databases, onDatabasesChange]);

  // Render database connection card
  const renderDatabaseCard = (database: DatabaseConnection) => {
    const statusConfig = STATUS_CONFIG[database.status];
    const StatusIcon = statusConfig.icon;
    const testInfo = connectionTests.get(database.id);
    const schema = schemas.get(database.id);
    const showPassword = showPasswords.has(database.id);
    const isAdvanced = showAdvanced.has(database.id);

    return (
      <div key={database.id} className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <div className="text-2xl mr-3">{DATABASE_ICONS[database.type]}</div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{database.name}</h3>
              <p className="text-sm text-gray-600">{DATABASE_NAMES[database.type]}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bg}`}>
              <StatusIcon className={`w-3 h-3 mr-1 ${statusConfig.color} ${database.status === 'connecting' || database.status === 'syncing' ? 'animate-spin' : ''}`} />
              <span className={statusConfig.color}>{statusConfig.label}</span>
            </div>

            {testInfo?.result?.latency && (
              <div className="text-xs text-gray-500">
                {testInfo.result.latency}ms
              </div>
            )}
          </div>
        </div>

        {/* Connection Test Result */}
        {testInfo?.result && !testInfo.isTesting && (
          <div className={`mb-4 p-3 rounded-lg ${testInfo.result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center">
              {testInfo.result.success ? (
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600 mr-2" />
              )}
              <span className={`text-sm font-medium ${testInfo.result.success ? 'text-green-800' : 'text-red-800'}`}>
                {testInfo.result.success ? 'Connection successful' : 'Connection failed'}
              </span>
            </div>
            {testInfo.result.error && (
              <p className="text-sm text-red-700 mt-1">{testInfo.result.error}</p>
            )}
          </div>
        )}

        {/* Database Configuration */}
        <div className="space-y-3 mb-4">
          {database.type === 'sqlite' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                File Path
              </label>
              <input
                type="text"
                value={database.config.filePath || ''}
                onChange={(e) => updateDatabaseConfig(database.id, { filePath: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="/path/to/database.db"
              />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Host
                  </label>
                  <input
                    type="text"
                    value={database.config.host || ''}
                    onChange={(e) => updateDatabaseConfig(database.id, { host: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="localhost"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Port
                  </label>
                  <input
                    type="number"
                    value={database.config.port || ''}
                    onChange={(e) => updateDatabaseConfig(database.id, { port: parseInt(e.target.value) || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="5432"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Database
                  </label>
                  <input
                    type="text"
                    value={database.config.database || ''}
                    onChange={(e) => updateDatabaseConfig(database.id, { database: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="my_database"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={database.config.username || ''}
                    onChange={(e) => updateDatabaseConfig(database.id, { username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="username"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={database.config.password || ''}
                    onChange={(e) => updateDatabaseConfig(database.id, { password: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="password"
                  />
                  <button
                    onClick={() => {
                      setShowPasswords(prev => {
                        const newSet = new Set(prev);
                        if (newSet.has(database.id)) {
                          newSet.delete(database.id);
                        } else {
                          newSet.add(database.id);
                        }
                        return newSet;
                      });
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {isAdvanced && (
                <div className="pt-3 border-t border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Connection String (Optional)
                    </label>
                    <input
                      type="text"
                      value={database.config.connectionString || ''}
                      onChange={(e) => updateDatabaseConfig(database.id, { connectionString: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="postgresql://user:pass@host:port/db"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Schema Information */}
        {schema && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center mb-2">
              <FileText className="w-4 h-4 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-800">Schema Loaded</span>
            </div>
            <div className="text-xs text-blue-700 space-y-1">
              <div>Tables: {schema.tables.length}</div>
              <div>Relationships: {schema.relationships.length}</div>
              <div>Version: {schema.version}</div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            <button
              onClick={() => testConnection(database)}
              disabled={testInfo?.isTesting}
              className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {testInfo?.isTesting ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <TestTube className="w-3 h-3 mr-1" />
                  Test
                </>
              )}
            </button>

            <button
              onClick={() => toggleConnection(database)}
              disabled={testInfo?.isTesting}
              className={`inline-flex items-center px-3 py-1 text-sm rounded ${
                database.status === 'connected'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              } disabled:opacity-50`}
            >
              {database.status === 'connected' ? (
                <>
                  <Unlink className="w-3 h-3 mr-1" />
                  Disconnect
                </>
              ) : (
                <>
                  <Link className="w-3 h-3 mr-1" />
                  Connect
                </>
              )}
            </button>

            {database.status === 'connected' && (
              <button
                onClick={() => loadSchema(database)}
                className="inline-flex items-center px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
              >
                <Database className="w-3 h-3 mr-1" />
                Load Schema
              </button>
            )}
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => setShowAdvanced(prev => {
                const newSet = new Set(prev);
                if (newSet.has(database.id)) {
                  newSet.delete(database.id);
                } else {
                  newSet.add(database.id);
                }
                return newSet;
              })}
              className="inline-flex items-center px-2 py-1 text-gray-600 text-sm rounded hover:bg-gray-100"
            >
              <Settings className="w-3 h-3 mr-1" />
              {isAdvanced ? 'Basic' : 'Advanced'}
            </button>

            <button
              onClick={() => removeDatabaseConnection(database.id)}
              className="inline-flex items-center px-2 py-1 text-red-600 text-sm rounded hover:bg-red-50"
            >
              <XCircle className="w-3 h-3 mr-1" />
              Remove
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Database Connections</h2>
          <p className="text-sm text-gray-600">
            Configure and manage database connections for this project
          </p>
        </div>

        <button
          onClick={addDatabaseConnection}
          className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
        >
          <Database className="w-4 h-4 mr-2" />
          Add Database
        </button>
      </div>

      {/* Database Connections */}
      {databases.length === 0 ? (
        <div className="text-center py-12">
          <Database className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No database connections
          </h3>
          <p className="text-gray-600 mb-6">
            Add a database connection to start linking your project data
          </p>
          <button
            onClick={addDatabaseConnection}
            className="inline-flex items-center px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Database className="w-5 h-5 mr-2" />
            Add Your First Database
          </button>
        </div>
      ) : (
        <div className="grid gap-6">
          {databases.map(renderDatabaseCard)}
        </div>
      )}

      {/* Connection Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Info className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-2">Connection Tips</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Ensure your database server is running and accessible</li>
              <li>• Check that your firewall allows connections on the specified port</li>
              <li>• Verify your credentials and permissions</li>
              <li>• For cloud databases, ensure your IP is whitelisted</li>
              <li>• SQLite databases only need a valid file path</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
