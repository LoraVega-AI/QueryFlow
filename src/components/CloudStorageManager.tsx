'use client';

// Cloud Storage Manager Component
// Enterprise database connectivity and cloud platform management

import React, { useState, useCallback, useEffect } from 'react';
import {
  Cloud, Database, Plus, Settings, Play, Pause, RotateCcw, Trash2, Edit,
  CheckCircle, XCircle, AlertTriangle, Activity, BarChart3, Clock, Shield,
  Server, Globe, Key, Lock, Download, Upload, RefreshCw, Archive, Monitor,
  Layers, HardDrive, Cpu, MemoryStick, Network, DollarSign, Users,
  Eye, EyeOff, Copy, ExternalLink, Zap, Target, Gauge
} from 'lucide-react';

import { DatabaseSchema } from '@/types/database';
import {
  CloudDatabaseService,
  DatabaseConnection,
  DatabaseProvider,
  CloudProvider,
  ConnectionPool,
  BackupConfiguration,
  SyncConfiguration,
  CloudMetrics
} from '@/services/cloudDatabaseService';

interface CloudStorageManagerProps {
  schema: DatabaseSchema | null;
  onSchemaChange?: (schema: DatabaseSchema) => void;
}

export function CloudStorageManager({ schema, onSchemaChange }: CloudStorageManagerProps) {
  // State
  const [activeTab, setActiveTab] = useState<'connections' | 'backups' | 'sync' | 'monitoring' | 'security'>('connections');
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [backups, setBackups] = useState<BackupConfiguration[]>([]);
  const [syncs, setSyncs] = useState<SyncConfiguration[]>([]);
  const [pools, setPools] = useState<Map<string, ConnectionPool>>(new Map());
  const [metrics, setMetrics] = useState<Map<string, CloudMetrics[]>>(new Map());
  
  // Connection form state
  const [showConnectionForm, setShowConnectionForm] = useState(false);
  const [editingConnection, setEditingConnection] = useState<DatabaseConnection | null>(null);
  const [connectionForm, setConnectionForm] = useState<Partial<DatabaseConnection>>({
    provider: 'postgresql',
    ssl: true,
    maxConnections: 10,
    connectionTimeout: 30000,
    queryTimeout: 60000,
    retryAttempts: 3
  });
  
  // Other modals
  const [showBackupForm, setShowBackupForm] = useState(false);
  const [showSyncForm, setShowSyncForm] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);

  // Load data
  useEffect(() => {
    loadConnections();
    loadBackups();
    loadSyncs();
    loadMetrics();
  }, []);

  // Load connections
  const loadConnections = useCallback(async () => {
    const connections = CloudDatabaseService.getConnections();
    setConnections(connections);
    
    // Load connection pools
    const poolsMap = new Map<string, ConnectionPool>();
    connections.forEach(conn => {
      const pool = CloudDatabaseService.getConnectionPool(conn.id);
      if (pool) {
        poolsMap.set(conn.id, pool);
      }
    });
    setPools(poolsMap);
  }, []);

  // Load backups
  const loadBackups = useCallback(async () => {
    const backups = CloudDatabaseService.getBackupConfigs();
    setBackups(backups);
  }, []);

  // Load syncs
  const loadSyncs = useCallback(async () => {
    const syncs = CloudDatabaseService.getSyncConfigs();
    setSyncs(syncs);
  }, []);

  // Load metrics
  const loadMetrics = useCallback(async () => {
    const metricsMap = new Map<string, CloudMetrics[]>();
    
    for (const connection of connections) {
      const timeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      };
      
      try {
        const connectionMetrics = await CloudDatabaseService.getCloudMetrics(connection.id, timeRange);
        metricsMap.set(connection.id, connectionMetrics);
      } catch (error) {
        console.error(`Failed to load metrics for ${connection.name}:`, error);
      }
    }
    
    setMetrics(metricsMap);
  }, [connections]);

  // Test connection
  const testConnection = useCallback(async (config: Partial<DatabaseConnection>) => {
    setTestingConnection(config.id || 'new');
    
    try {
      const result = await CloudDatabaseService.testConnection(config);
      
      if (result.success) {
        alert(`Connection successful! Latency: ${result.latency}ms`);
      } else {
        alert(`Connection failed: ${result.message}`);
      }
    } catch (error) {
      alert(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTestingConnection(null);
    }
  }, []);

  // Save connection
  const saveConnection = useCallback(async () => {
    try {
      if (editingConnection) {
        await CloudDatabaseService.updateConnection(editingConnection.id, connectionForm);
      } else {
        await CloudDatabaseService.createConnection(connectionForm as any);
      }
      
      setShowConnectionForm(false);
      setEditingConnection(null);
      setConnectionForm({
        provider: 'postgresql',
        ssl: true,
        maxConnections: 10,
        connectionTimeout: 30000,
        queryTimeout: 60000,
        retryAttempts: 3
      });
      
      loadConnections();
    } catch (error) {
      alert(`Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [connectionForm, editingConnection, loadConnections]);

  // Connect to database
  const connectToDatabase = useCallback(async (connectionId: string) => {
    setIsConnecting(connectionId);
    
    try {
      await CloudDatabaseService.connect(connectionId);
      loadConnections();
    } catch (error) {
      alert(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsConnecting(null);
    }
  }, [loadConnections]);

  // Disconnect from database
  const disconnectFromDatabase = useCallback(async (connectionId: string) => {
    try {
      await CloudDatabaseService.disconnect(connectionId);
      loadConnections();
    } catch (error) {
      alert(`Disconnect failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [loadConnections]);

  // Import schema from connection
  const importSchemaFromConnection = useCallback(async (connectionId: string) => {
    try {
      const importedSchema = await CloudDatabaseService.importSchema(connectionId);
      if (onSchemaChange) {
        onSchemaChange(importedSchema);
      }
      alert('Schema imported successfully!');
    } catch (error) {
      alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [onSchemaChange]);

  // Export schema to connection
  const exportSchemaToConnection = useCallback(async (connectionId: string) => {
    if (!schema) {
      alert('No schema to export');
      return;
    }
    
    try {
      await CloudDatabaseService.exportSchema(connectionId, schema);
      alert('Schema exported successfully!');
    } catch (error) {
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [schema]);

  // Execute backup
  const executeBackup = useCallback(async (backupId: string) => {
    try {
      const result = await CloudDatabaseService.executeBackup(backupId);
      
      if (result.success) {
        alert(`Backup completed! Size: ${(result.backupSize! / 1024 / 1024).toFixed(2)}MB`);
        loadBackups();
      } else {
        alert(`Backup failed: ${result.error}`);
      }
    } catch (error) {
      alert(`Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [loadBackups]);

  // Execute sync
  const executeSync = useCallback(async (syncId: string) => {
    try {
      const result = await CloudDatabaseService.executeSync(syncId);
      
      if (result.success) {
        alert(`Sync completed! Records: ${result.recordsProcessed}, Conflicts: ${result.conflicts}`);
        loadSyncs();
      } else {
        alert(`Sync failed: ${result.error}`);
      }
    } catch (error) {
      alert(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [loadSyncs]);

  // Get provider icon
  const getProviderIcon = (provider: DatabaseProvider) => {
    const iconMap = {
      postgresql: Database,
      mysql: Database,
      sqlserver: Server,
      mongodb: Layers,
      redis: Activity,
      dynamodb: Cloud,
      sqlite: HardDrive,
      oracle: Database,
      cassandra: Globe,
      snowflake: Cloud
    };
    
    return iconMap[provider] || Database;
  };

  // Get provider color
  const getProviderColor = (provider: DatabaseProvider) => {
    const colorMap = {
      postgresql: 'bg-blue-100 text-blue-800',
      mysql: 'bg-orange-100 text-orange-800',
      sqlserver: 'bg-red-100 text-red-800',
      mongodb: 'bg-green-100 text-green-800',
      redis: 'bg-red-200 text-red-900',
      dynamodb: 'bg-yellow-100 text-yellow-800',
      sqlite: 'bg-gray-100 text-gray-800',
      oracle: 'bg-red-100 text-red-800',
      cassandra: 'bg-purple-100 text-purple-800',
      snowflake: 'bg-blue-200 text-blue-900'
    };
    
    return colorMap[provider] || 'bg-gray-100 text-gray-800';
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-600';
      case 'disconnected': return 'text-gray-600';
      case 'error': return 'text-red-600';
      case 'testing': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return CheckCircle;
      case 'disconnected': return XCircle;
      case 'error': return AlertTriangle;
      case 'testing': return Activity;
      default: return XCircle;
    }
  };

  // Render connections tab
  const renderConnections = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Database Connections</h3>
          <p className="text-sm text-gray-500 mt-1">
            Manage connections to cloud databases and data stores
          </p>
        </div>
        <button
          onClick={() => {
            setEditingConnection(null);
            setConnectionForm({
              provider: 'postgresql',
              ssl: true,
              maxConnections: 10,
              connectionTimeout: 30000,
              queryTimeout: 60000,
              retryAttempts: 3
            });
            setShowConnectionForm(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Connection
        </button>
      </div>

      {/* Connections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {connections.map((connection) => {
          const ProviderIcon = getProviderIcon(connection.provider);
          const StatusIcon = getStatusIcon(connection.status);
          const pool = pools.get(connection.id);
          
          return (
            <div key={connection.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${getProviderColor(connection.provider)}`}>
                    <ProviderIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">{connection.name}</h4>
                    <p className="text-sm text-gray-500">{connection.host}:{connection.port}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <StatusIcon className={`w-5 h-5 ${getStatusColor(connection.status)}`} />
                  <span className={`text-sm font-medium ${getStatusColor(connection.status)}`}>
                    {connection.status}
                  </span>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Provider:</span>
                  <span className="font-medium text-gray-900 capitalize">{connection.provider}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Database:</span>
                  <span className="font-medium text-gray-900">{connection.database}</span>
                </div>
                {connection.cloudProvider && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Cloud:</span>
                    <span className="font-medium text-gray-900 capitalize">{connection.cloudProvider}</span>
                  </div>
                )}
                {pool && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Pool:</span>
                    <span className="font-medium text-gray-900">
                      {pool.activeConnections}/{pool.maxConnections}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2">
                {connection.status === 'connected' ? (
                  <button
                    onClick={() => disconnectFromDatabase(connection.id)}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Pause className="w-4 h-4 mr-1" />
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => connectToDatabase(connection.id)}
                    disabled={isConnecting === connection.id}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
                  >
                    {isConnecting === connection.id ? (
                      <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 mr-1" />
                    )}
                    Connect
                  </button>
                )}
                
                <button
                  onClick={() => testConnection(connection)}
                  disabled={testingConnection === connection.id}
                  className="px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  {testingConnection === connection.id ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                </button>
                
                <button
                  onClick={() => {
                    setEditingConnection(connection);
                    setConnectionForm(connection);
                    setShowConnectionForm(true);
                  }}
                  className="px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>

              {/* Schema Actions */}
              {connection.status === 'connected' && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => importSchemaFromConnection(connection.id)}
                      className="flex-1 inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded text-blue-700 bg-blue-50 hover:bg-blue-100"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Import Schema
                    </button>
                    <button
                      onClick={() => exportSchemaToConnection(connection.id)}
                      className="flex-1 inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded text-green-700 bg-green-50 hover:bg-green-100"
                    >
                      <Upload className="w-3 h-3 mr-1" />
                      Export Schema
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {connections.length === 0 && (
        <div className="text-center py-12">
          <Cloud className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No connections configured</h3>
          <p className="text-gray-500 mb-4">
            Start by adding your first database connection to begin cloud integration.
          </p>
          <button
            onClick={() => setShowConnectionForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Connection
          </button>
        </div>
      )}
    </div>
  );

  // Render monitoring tab
  const renderMonitoring = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Cloud Monitoring</h3>
      
      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {connections.filter(c => c.status === 'connected').map((connection) => {
          const connectionMetrics = metrics.get(connection.id) || [];
          const latestMetrics = connectionMetrics[connectionMetrics.length - 1];
          
          if (!latestMetrics) {
            return (
              <div key={connection.id} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="text-center text-gray-500">
                  <Monitor className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">No metrics available</p>
                </div>
              </div>
            );
          }
          
          return (
            <div key={connection.id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-gray-900">{connection.name}</h4>
                <div className={`w-3 h-3 rounded-full ${
                  latestMetrics.errorRate < 1 ? 'bg-green-400' : 
                  latestMetrics.errorRate < 5 ? 'bg-yellow-400' : 'bg-red-400'
                }`} />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Cpu className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">CPU</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {Math.round(latestMetrics.cpuUsage)}%
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <MemoryStick className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">Memory</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {Math.round(latestMetrics.memoryUsage)}%
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Activity className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">QPS</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {Math.round(latestMetrics.queriesPerSecond)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">Latency</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {Math.round(latestMetrics.averageResponseTime)}ms
                  </span>
                </div>
                
                {latestMetrics.cost && (
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <DollarSign className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-600">Cost</span>
                      </div>
                      <span className="text-sm font-medium text-green-600">
                        ${latestMetrics.cost.amount.toFixed(2)}/{latestMetrics.cost.billing_period}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {connections.filter(c => c.status === 'connected').length === 0 && (
        <div className="text-center py-12">
          <Monitor className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No active connections</h3>
          <p className="text-gray-500">Connect to databases to view monitoring metrics.</p>
        </div>
      )}
    </div>
  );

  // Connection form modal
  const connectionFormModal = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {editingConnection ? 'Edit Connection' : 'Add Connection'}
        </h3>
        
        <div className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={connectionForm.name || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="My Database"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
              <select
                value={connectionForm.provider || 'postgresql'}
                onChange={(e) => setConnectionForm({ ...connectionForm, provider: e.target.value as DatabaseProvider })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="postgresql">PostgreSQL</option>
                <option value="mysql">MySQL</option>
                <option value="sqlserver">SQL Server</option>
                <option value="mongodb">MongoDB</option>
                <option value="redis">Redis</option>
                <option value="dynamodb">DynamoDB</option>
                <option value="sqlite">SQLite</option>
                <option value="oracle">Oracle</option>
                <option value="cassandra">Cassandra</option>
                <option value="snowflake">Snowflake</option>
              </select>
            </div>
          </div>

          {/* Connection Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
              <input
                type="text"
                value={connectionForm.host || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, host: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="localhost"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
              <input
                type="number"
                value={connectionForm.port || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, port: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="5432"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Database</label>
            <input
              type="text"
              value={connectionForm.database || ''}
              onChange={(e) => setConnectionForm({ ...connectionForm, database: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="my_database"
            />
          </div>

          {/* Credentials */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={connectionForm.username || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, username: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="username"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={connectionForm.password || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="password"
              />
            </div>
          </div>

          {/* SSL */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="ssl"
              checked={connectionForm.ssl || false}
              onChange={(e) => setConnectionForm({ ...connectionForm, ssl: e.target.checked })}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <label htmlFor="ssl" className="ml-2 text-sm text-gray-700">
              Use SSL/TLS encryption
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => testConnection(connectionForm)}
            disabled={testingConnection === 'new'}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            {testingConnection === 'new' ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 mr-2" />
            )}
            Test Connection
          </button>
          
          <div className="flex space-x-3">
            <button
              onClick={() => setShowConnectionForm(false)}
              className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={saveConnection}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              {editingConnection ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cloud Storage</h1>
            <p className="text-sm text-gray-500 mt-1">
              Enterprise database connectivity and cloud platform management
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={loadConnections}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4">
          <nav className="flex space-x-8">
            {[
              { id: 'connections', label: 'Connections', icon: Database },
              { id: 'backups', label: 'Backups', icon: Archive },
              { id: 'sync', label: 'Sync', icon: RotateCcw },
              { id: 'monitoring', label: 'Monitoring', icon: Monitor },
              { id: 'security', label: 'Security', icon: Shield }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'connections' && renderConnections()}
        {activeTab === 'monitoring' && renderMonitoring()}
        {activeTab === 'backups' && (
          <div className="text-center py-12">
            <Archive className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Backup Management</h3>
            <p className="text-gray-500">Configure automated backups and recovery for your databases.</p>
          </div>
        )}
        {activeTab === 'sync' && (
          <div className="text-center py-12">
            <RotateCcw className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Data Synchronization</h3>
            <p className="text-gray-500">Set up real-time or scheduled data sync between databases.</p>
          </div>
        )}
        {activeTab === 'security' && (
          <div className="text-center py-12">
            <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Security Settings</h3>
            <p className="text-gray-500">Configure SSL, IAM, VPC, and other security features.</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {showConnectionForm && connectionFormModal}
    </div>
  );
}
