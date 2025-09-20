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
  Search,
  Clock,
  Server,
  FileText,
  Key,
  Link,
  Unlink,
  Info,
  FolderOpen,
  Activity,
  HardDrive
} from 'lucide-react';
import {
  DatabaseType,
  DatabaseConfig,
  DatabaseSchema,
  ConnectionStatus
} from '@/types/project';
import { DatabaseConnector } from '@/utils/databaseConnector';
import { ProjectService } from '@/services/projectService';
import { projectsManager } from '@/utils/projectsManager';
import { useDatabase } from '@/contexts/DatabaseContext';
import { Project, Database as ProjectDatabase } from '@/types/projects';

interface DatabaseLinkerProps {
  projectId?: string;
  databases?: ProjectDatabase[];
  onDatabasesChange?: (databases: ProjectDatabase[]) => void;
  onSchemaLoaded?: (databaseId: string, schema: DatabaseSchema) => void;
  showAllProjects?: boolean;
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
  sqlserver: '🔷',
  unknown: '❓'
};

const DATABASE_NAMES: Record<DatabaseType, string> = {
  sqlite: 'SQLite',
  postgresql: 'PostgreSQL',
  mysql: 'MySQL',
  mongodb: 'MongoDB',
  redis: 'Redis',
  dynamodb: 'DynamoDB',
  oracle: 'Oracle',
  sqlserver: 'SQL Server',
  unknown: 'Unknown'
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
  databases = [],
  onDatabasesChange,
  onSchemaLoaded,
  showAllProjects = true
}: DatabaseLinkerProps) {
  const { activeConnection, isConnected } = useDatabase();
  const [connectionTests, setConnectionTests] = useState<Map<string, ConnectionTest>>(new Map());
  const [showPasswords, setShowPasswords] = useState<Set<string>>(new Set());
  const [editingConnection, setEditingConnection] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState<Set<string>>(new Set());
  const [schemas, setSchemas] = useState<Map<string, DatabaseSchema>>(new Map());
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Load projects and set selected project
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const allProjects = await projectsManager.getAllProjects();
        setProjects(allProjects);

        if (projectId) {
          const project = allProjects.find((p: Project) => p.id === projectId);
          setSelectedProject(project || null);
        } else if (allProjects.length > 0) {
          setSelectedProject(allProjects[0]);
        }
      } catch (error) {
        console.error('Failed to load projects:', error);
      }
    };

    loadProjects();
  }, [projectId]);

  // Get all databases from all projects if showAllProjects is true
  const getAllDatabases = useCallback((): Array<{ project: Project; database: ProjectDatabase }> => {
    if (!showAllProjects) {
      const projectDatabases = selectedProject?.databases || [];
      return projectDatabases.map(db => ({ project: selectedProject!, database: db }));
    }

    const allDatabases: Array<{ project: Project; database: ProjectDatabase }> = [];
    projects.forEach(project => {
      project.databases.forEach(database => {
        allDatabases.push({ project, database });
      });
    });
    return allDatabases;
  }, [projects, selectedProject, showAllProjects]);

  // Test database connection
  const testConnection = useCallback(async (database: ProjectDatabase) => {
    const testId = `test_${database.id}_${Date.now()}`;
    setConnectionTests(prev => new Map(prev.set(database.id, { isTesting: true })));

    try {
      // Convert connectionString to DatabaseConfig format
      const config: any = {
        connectionString: database.connectionString,
        filePath: database.type === 'sqlite' ? database.connectionString : undefined
      };

      const result = await DatabaseConnector.testConnection(database.type, config);

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
          ? { ...db, isConnected: result.success, lastSync: result.success ? new Date().toISOString() : db.lastSync }
          : db
      );
      onDatabasesChange?.(updatedDatabases);

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
  const loadSchema = useCallback(async (database: ProjectDatabase) => {
    if (!database.isConnected) {
      console.warn('Cannot load schema for disconnected database');
      return;
    }

    try {
      // Convert connectionString to DatabaseConfig format for introspection
      const config: any = {
        connectionString: database.connectionString,
        filePath: database.type === 'sqlite' ? database.connectionString : undefined
      };

      const schema = await DatabaseConnector.introspectSchema(database.type, config);
      setSchemas(prev => new Map(prev.set(database.id, schema)));
      onSchemaLoaded?.(database.id, schema);
    } catch (error) {
      console.error('Failed to load schema:', error);
    }
  }, [onSchemaLoaded]);

  // Render project database card
  const renderProjectDatabaseCard = (project: Project, database: ProjectDatabase) => {
    const isActiveConnection = activeConnection?.id === `example_${project.id}_${database.id}`;
    const schema = project.schema;

    return (
      <div key={`${project.id}_${database.id}`} className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <div className="text-2xl mr-3">{DATABASE_ICONS[database.type] || '🗄️'}</div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{database.name}</h3>
              <p className="text-sm text-gray-600">{project.name}</p>
              <div className="flex items-center mt-1">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  project.status === 'connected' ? 'bg-green-100 text-green-800' :
                  project.status === 'syncing' ? 'bg-blue-100 text-blue-800' :
                  project.status === 'error' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {project.status === 'connected' && <CheckCircle className="w-3 h-3 mr-1" />}
                  {project.status === 'syncing' && <RefreshCw className="w-3 h-3 mr-1 animate-spin" />}
                  {project.status === 'error' && <XCircle className="w-3 h-3 mr-1" />}
                  {project.status === 'disconnected' && <XCircle className="w-3 h-3 mr-1" />}
                  {project.status || 'Unknown'}
                </span>
                {isActiveConnection && (
                  <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    <Zap className="w-3 h-3 mr-1" />
                    Active
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              {database.type}
            </span>
          </div>
        </div>

        {/* Database Info */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Type</label>
            <p className="text-sm text-gray-900">{DATABASE_NAMES[database.type] || database.type}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Connection</label>
            <p className="text-sm text-gray-900">
              {database.type === 'sqlite' ? 'File-based' : 'Network'}
            </p>
          </div>
        </div>

        {/* Schema Information */}
        {schema && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center mb-2">
              <FileText className="w-4 h-4 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-800">Schema Available</span>
            </div>
            <div className="text-xs text-blue-700 space-y-1">
              <div>Tables: {schema.tables?.length || 0}</div>
              <div>Relationships: {schema.relationships?.length || 0}</div>
              <div>Project: {project.name}</div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            <button
              onClick={() => {
                // Open query editor for this database
                const queryEditorEvent = new CustomEvent('openQueryEditor', {
                  detail: {
                    projectId: project.id,
                    projectName: project.name,
                    databaseName: database.name,
                    databaseId: database.id
                  }
                });
                window.dispatchEvent(queryEditorEvent);
              }}
              className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              <Server className="w-3 h-3 mr-1" />
              Query
            </button>

            <button
              onClick={() => {
                // Open schema designer for this database
                const schemaDesignerEvent = new CustomEvent('openSchemaDesigner', {
                  detail: {
                    projectId: project.id,
                    projectName: project.name,
                    databaseId: database.id
                  }
                });
                window.dispatchEvent(schemaDesignerEvent);
              }}
              className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              <Settings className="w-3 h-3 mr-1" />
              Design
            </button>
          </div>

          <div className="text-sm text-gray-500">
            {database.connectionString ? 'Configured' : 'Auto-managed'}
          </div>
        </div>
      </div>
    );
  };

  // Toggle connection
  const toggleConnection = useCallback(async (database: ProjectDatabase) => {
    if (database.isConnected) {
      // Disconnect
      const updatedDatabases = databases.map(db =>
        db.id === database.id ? { ...db, isConnected: false } : db
      );
      onDatabasesChange?.(updatedDatabases);
    } else {
      // Connect
      await testConnection(database);
    }
  }, [databases, onDatabasesChange, testConnection]);

  // Update database configuration
  const updateDatabaseConfig = useCallback((databaseId: string, updates: any) => {
    const updatedDatabases = databases.map(db =>
      db.id === databaseId ? { ...db, ...updates } : db
    );
    onDatabasesChange?.(updatedDatabases);
  }, [databases, onDatabasesChange]);

  // Add new database connection
  const addDatabaseConnection = useCallback(() => {
    const newDatabase: ProjectDatabase = {
      id: `db_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: 'New Database',
      type: 'sqlite',
      connectionString: '',
      tables: [],
      isConnected: false,
      lastSync: null
    };

    onDatabasesChange?.([...databases, newDatabase]);
  }, [databases, onDatabasesChange]);

  // Remove database connection
  const removeDatabaseConnection = useCallback((databaseId: string) => {
    if (confirm('Are you sure you want to remove this database connection?')) {
      const updatedDatabases = databases.filter(db => db.id !== databaseId);
      onDatabasesChange?.(updatedDatabases);
      setSchemas(prev => {
        const newSchemas = new Map(prev);
        newSchemas.delete(databaseId);
        return newSchemas;
      });
    }
  }, [databases, onDatabasesChange]);

  // Render database connection card
  const renderDatabaseCard = (database: ProjectDatabase) => {
    // Map isConnected to status for display
    const statusKey = database.isConnected ? 'connected' : 'disconnected';
    const statusConfig = STATUS_CONFIG[statusKey];
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
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold text-gray-900">{database.name}</h3>
                {database.name.includes('_schema') || database.name.includes('extracted') ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Auto-Created
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-gray-600">{DATABASE_NAMES[database.type]}</p>
              {database.tableCount && (
                <p className="text-xs text-gray-500">
                  {database.tableCount} tables, {database.totalRows || 0} rows
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bg}`}>
              <StatusIcon className={`w-3 h-3 mr-1 ${statusConfig.color}`} />
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
                value={database.type === 'sqlite' ? database.connectionString : ''}
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
                      value=""
                      onChange={() => {}}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 opacity-50"
                      placeholder="Configure via connection string"
                      disabled
                    />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Port
                  </label>
                    <input
                      type="number"
                      value=""
                      onChange={() => {}}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 opacity-50"
                      placeholder="Configure via connection string"
                      disabled
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
                    value=""
                    onChange={() => {}}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 opacity-50"
                    placeholder="Configure via connection string"
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value=""
                    onChange={() => {}}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 opacity-50"
                    placeholder="Configure via connection string"
                    disabled
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
                    value=""
                    onChange={() => {}}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 opacity-50"
                    placeholder="Configure via connection string"
                    disabled
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
                      value={database.connectionString || ''}
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
              <div>Columns: {schema.tables.reduce((sum, table) => sum + table.columns.length, 0)}</div>
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
                database.isConnected
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              } disabled:opacity-50`}
            >
              {database.isConnected ? (
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

            {database.isConnected && (
              <button
                onClick={() => loadSchema(database)}
                className="inline-flex items-center px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
              >
                <Database className="w-3 h-3 mr-1" />
                Load Schema
              </button>
            )}

            {(database.name.includes('_schema') || database.name.includes('extracted')) && database.isConnected && (
              <button
                onClick={() => {
                  // Navigate to query interface with this database pre-selected
                  window.location.href = `/?tab=query&database=${database.id}`;
                }}
                className="inline-flex items-center px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700"
              >
                <Search className="w-3 h-3 mr-1" />
                Query Now
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

  const allDatabases = getAllDatabases();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Database Manager</h2>
          <p className="text-sm text-gray-600">
            {showAllProjects
              ? "View and manage all project databases"
              : "Configure and manage database connections for this project"
            }
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {showAllProjects && (
            <select
              value={selectedProject?.id || ''}
              onChange={(e) => {
                const project = projects.find(p => p.id === e.target.value);
                setSelectedProject(project || null);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">All Projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Database Status Overview */}
      {showAllProjects && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <HardDrive className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{allDatabases.length}</div>
                <div className="text-sm text-gray-600">Total Databases</div>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {allDatabases.filter(db => db.project.status === 'connected').length}
                </div>
                <div className="text-sm text-gray-600">Connected</div>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <FolderOpen className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{projects.length}</div>
                <div className="text-sm text-gray-600">Projects</div>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <Activity className="w-8 h-8 text-orange-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {allDatabases.filter(db => db.project.status === 'syncing').length}
                </div>
                <div className="text-sm text-gray-600">Syncing</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project Databases */}
      {allDatabases.length === 0 ? (
        <div className="text-center py-12">
          <Database className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No databases found
          </h3>
          <p className="text-gray-600 mb-6">
            {showAllProjects
              ? "No projects with databases are currently available"
              : "This project doesn't have any databases configured"
            }
          </p>
          {!showAllProjects && (
            <button
              onClick={() => window.location.href = '/projects'}
              className="inline-flex items-center px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <FolderOpen className="w-5 h-5 mr-2" />
              Browse Projects
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-6">
          {allDatabases.map(({ project, database }) => renderProjectDatabaseCard(project, database))}
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
