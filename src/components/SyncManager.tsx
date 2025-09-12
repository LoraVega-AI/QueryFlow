'use client';

// Sync Manager Component
// Provides real-time sync monitoring, conflict resolution, and sync management

import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Play,
  Square,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw as Sync,
  Settings,
  BarChart3,
  List,
  Eye,
  EyeOff,
  Download,
  Upload,
  AlertCircle,
  Info,
  Zap,
  Database,
  GitBranch,
  Timer
} from 'lucide-react';
import {
  SyncSession,
  SyncStatus,
  SyncMonitor,
  SyncConflict,
  ConflictResolution,
  SyncStatistics,
  SyncOperation
} from '@/types/sync';
import { DatabaseSyncService } from '@/services/databaseSyncService';
import { Project, DatabaseConnection } from '@/types/project';

interface SyncManagerProps {
  project: Project;
  database: DatabaseConnection;
  onSyncComplete?: (session: SyncSession) => void;
  onConflictResolved?: (conflictId: string, resolution: ConflictResolution) => void;
}

interface SyncAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
}

const STATUS_CONFIG = {
  pending: { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-50', label: 'Pending' },
  connecting: { icon: RefreshCw, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Connecting' },
  analyzing: { icon: BarChart3, color: 'text-purple-500', bg: 'bg-purple-50', label: 'Analyzing' },
  syncing: { icon: Sync, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Syncing' },
  validating: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50', label: 'Validating' },
  completed: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50', label: 'Completed' },
  failed: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', label: 'Failed' },
  cancelled: { icon: XCircle, color: 'text-gray-500', bg: 'bg-gray-50', label: 'Cancelled' }
};

const CONFLICT_SEVERITY_CONFIG = {
  low: { color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  medium: { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  high: { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  critical: { color: 'text-red-800', bg: 'bg-red-100', border: 'border-red-300' }
};

export function SyncManager({ project, database, onSyncComplete, onConflictResolved }: SyncManagerProps) {
  const [activeSession, setActiveSession] = useState<SyncSession | null>(null);
  const [monitor, setMonitor] = useState<SyncMonitor | null>(null);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [selectedConflict, setSelectedConflict] = useState<SyncConflict | null>(null);
  const [resolution, setResolution] = useState<ConflictResolution | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [syncHistory, setSyncHistory] = useState<SyncSession[]>([]);
  const [alerts, setAlerts] = useState<SyncAlert[]>([]);

  // Load sync history on mount
  useEffect(() => {
    loadSyncHistory();
  }, [project.id, database.id]);

  // Monitor active sync session
  useEffect(() => {
    if (!activeSession) return;

    const interval = setInterval(() => {
      const updatedMonitor = DatabaseSyncService.getSyncMonitor(activeSession.id);
      if (updatedMonitor) {
        setMonitor(updatedMonitor);

        // Check for new conflicts
        const sessionConflicts = activeSession.conflicts || [];
        if (sessionConflicts.length !== conflicts.length) {
          setConflicts(sessionConflicts);
        }

        // Check if session is complete
        if (['completed', 'failed', 'cancelled'].includes(updatedMonitor.status)) {
          onSyncComplete?.(activeSession);
          setActiveSession(null);
          setMonitor(null);
          loadSyncHistory();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession, conflicts.length, onSyncComplete]);

  // Load sync history
  const loadSyncHistory = async () => {
    // In a real implementation, this would fetch from API
    // For now, we'll simulate with mock data
    const mockHistory: SyncSession[] = [
      {
        id: 'sync_001',
        projectId: project.id,
        databaseId: database.id,
        status: 'completed',
        direction: 'bidirectional',
        startedAt: new Date(Date.now() - 3600000), // 1 hour ago
        completedAt: new Date(Date.now() - 3300000), // 55 minutes ago
        options: {
          batchSize: 1000,
          timeout: 300000,
          createBackups: true,
          conflictResolution: 'manual' as const,
          skipValidation: false,
          selectiveSync: {
            enabled: false,
            includeTables: [],
            excludeTables: [],
            includeSchemas: [],
            excludeSchemas: [],
            syncData: true,
            syncSchema: true,
            syncIndexes: true,
            syncConstraints: true
          },
          performance: {
            maxConcurrentOperations: 5,
            retryAttempts: 3,
            retryDelay: 1000,
            memoryLimit: 100000000,
            enableCompression: true
          }
        },
        statistics: {
          totalChanges: 15,
          successfulChanges: 15,
          failedChanges: 0,
          skippedChanges: 0,
          totalConflicts: 0,
          resolvedConflicts: 0,
          pendingConflicts: 0,
          startTime: new Date(Date.now() - 3600000),
          endTime: new Date(Date.now() - 3300000),
          dataTransferred: 1024000,
          performance: {
            averageLatency: 150,
            peakLatency: 300,
            throughput: 100,
            memoryUsage: 50,
            cpuUsage: 30,
            networkUsage: 20
          }
        },
        operations: [],
        conflicts: []
      }
    ];
    setSyncHistory(mockHistory);
  };

  // Start sync session
  const startSync = useCallback(async () => {
    try {
      const session = await DatabaseSyncService.startSyncSession(
        project.id,
        database.id
      );

      setActiveSession(session);

      // Add change listener
      DatabaseSyncService.addChangeListener(session.id, (changes) => {
        console.log('Sync changes:', changes);
      });

      // Add alert
      addAlert('info', `Sync session started for ${database.name}`);

    } catch (error) {
      console.error('Failed to start sync:', error);
      addAlert('error', 'Failed to start sync session');
    }
  }, [project.id, database.id, database.name]);

  // Stop sync session
  const stopSync = useCallback(async () => {
    if (!activeSession) return;

    try {
      await DatabaseSyncService.stopSyncSession(activeSession.id);
      setActiveSession(null);
      setMonitor(null);
      addAlert('info', 'Sync session stopped');
    } catch (error) {
      console.error('Failed to stop sync:', error);
      addAlert('error', 'Failed to stop sync session');
    }
  }, [activeSession]);

  // Resolve conflict
  const resolveConflict = useCallback(async () => {
    if (!selectedConflict || !resolution) return;

    try {
      const success = await DatabaseSyncService.resolveConflict(
        selectedConflict.id,
        resolution
      );

      if (success) {
        // Update local conflicts list
        setConflicts(prev => prev.filter(c => c.id !== selectedConflict.id));
        setSelectedConflict(null);
        setResolution(null);
        onConflictResolved?.(selectedConflict.id, resolution);
        addAlert('info', `Conflict resolved: ${selectedConflict.description}`);
      } else {
        addAlert('error', 'Failed to resolve conflict');
      }
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      addAlert('error', 'Failed to resolve conflict');
    }
  }, [selectedConflict, resolution, onConflictResolved]);

  // Add alert
  const addAlert = useCallback((type: SyncAlert['type'], message: string) => {
    const alert: SyncAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      timestamp: new Date(),
      resolved: false
    };
    setAlerts(prev => [alert, ...prev]);
  }, []);

  // Resolve alert
  const resolveAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(alert =>
      alert.id === alertId ? { ...alert, resolved: true } : alert
    ));
  }, []);

  // Render sync status
  const renderSyncStatus = () => {
    if (!activeSession || !monitor) return null;

    const StatusIcon = STATUS_CONFIG[monitor.status].icon;

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <StatusIcon className={`w-6 h-6 mr-3 ${STATUS_CONFIG[monitor.status].color} ${
              ['connecting', 'syncing'].includes(monitor.status) ? 'animate-spin' : ''
            }`} />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {STATUS_CONFIG[monitor.status].label}
              </h3>
              <p className="text-sm text-gray-600">
                Session {activeSession.id.slice(-8)}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {['connecting', 'syncing'].includes(monitor.status) && (
              <button
                onClick={stopSync}
                className="inline-flex items-center px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
              >
                <Square className="w-3 h-3 mr-1" />
                Stop
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>{monitor.progress.currentStep}</span>
            <span>{monitor.progress.percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${monitor.progress.percentage}%` }}
            />
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="font-semibold text-gray-900">{monitor.statistics.totalChanges}</div>
            <div className="text-gray-600">Changes</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-green-600">{monitor.statistics.successfulChanges}</div>
            <div className="text-gray-600">Success</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-red-600">{monitor.statistics.failedChanges}</div>
            <div className="text-gray-600">Failed</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-orange-600">{monitor.statistics.pendingConflicts}</div>
            <div className="text-gray-600">Conflicts</div>
          </div>
        </div>
      </div>
    );
  };

  // Render conflicts
  const renderConflicts = () => {
    if (conflicts.length === 0) return null;

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-orange-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              Conflicts ({conflicts.length})
            </h3>
          </div>
        </div>

        <div className="space-y-3">
          {conflicts.map((conflict) => {
            const severityConfig = CONFLICT_SEVERITY_CONFIG[conflict.severity];

            return (
              <div
                key={conflict.id}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedConflict?.id === conflict.id
                    ? 'border-orange-300 bg-orange-50'
                    : `${severityConfig.border} ${severityConfig.bg}`
                }`}
                onClick={() => setSelectedConflict(conflict)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <AlertCircle className={`w-4 h-4 mr-2 ${severityConfig.color}`} />
                      <span className={`font-medium ${severityConfig.color}`}>
                        {conflict.description}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <div>Entity: {conflict.entity.name} ({conflict.entity.type})</div>
                      <div>Type: {conflict.type.replace('_', ' ')}</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {conflict.createdAt.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Conflict Resolution */}
        {selectedConflict && (
          <div className="mt-6 border-t border-gray-200 pt-6">
            <h4 className="font-medium text-gray-900 mb-4">
              Resolve Conflict: {selectedConflict.description}
            </h4>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resolution Strategy
                </label>
                <select
                  value={resolution?.strategy || ''}
                  onChange={(e) => setResolution({
                    strategy: e.target.value as any,
                    resolvedValue: undefined,
                    manualResolution: undefined,
                    applied: false
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select resolution...</option>
                  <option value="queryflow_wins">Keep QueryFlow version</option>
                  <option value="project_wins">Keep project version</option>
                  <option value="merge">Merge values</option>
                  <option value="manual">Manual resolution</option>
                  <option value="skip">Skip this conflict</option>
                </select>
              </div>

              {resolution?.strategy === 'manual' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Value
                  </label>
                  <textarea
                    value={resolution.manualResolution?.customValue || ''}
                    onChange={(e) => setResolution(prev => prev ? {
                      ...prev,
                      manualResolution: {
                        ...prev.manualResolution!,
                        customValue: e.target.value
                      }
                    } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    rows={3}
                    placeholder="Enter custom resolution value..."
                  />
                </div>
              )}

              <button
                onClick={resolveConflict}
                disabled={!resolution}
                className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Resolve Conflict
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render sync controls
  const renderSyncControls = () => {
    const canStartSync = !activeSession && database.status === 'connected';

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Sync Controls</h3>
            <p className="text-sm text-gray-600">
              Manage synchronization between QueryFlow and {database.name}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="inline-flex items-center px-3 py-1 text-gray-600 text-sm rounded hover:bg-gray-100"
            >
              <Settings className="w-3 h-3 mr-1" />
              {showAdvanced ? 'Basic' : 'Advanced'}
            </button>

            <button
              onClick={() => setShowLogs(!showLogs)}
              className="inline-flex items-center px-3 py-1 text-gray-600 text-sm rounded hover:bg-gray-100"
            >
              <List className="w-3 h-3 mr-1" />
              {showLogs ? 'Hide Logs' : 'Show Logs'}
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={startSync}
            disabled={!canStartSync}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Play className="w-5 h-5 mr-2" />
            Start Sync
          </button>

          {activeSession && (
            <button
              onClick={stopSync}
              className="inline-flex items-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <Square className="w-5 h-5 mr-2" />
              Stop Sync
            </button>
          )}

          <div className="text-sm text-gray-600">
            {!activeSession && canStartSync && 'Ready to sync'}
            {!canStartSync && !activeSession && 'Database not connected'}
            {activeSession && 'Sync in progress'}
          </div>
        </div>

        {showAdvanced && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-4">Advanced Options</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sync Direction
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500">
                  <option value="bidirectional">Bidirectional</option>
                  <option value="queryflow-to-project">QueryFlow → Project</option>
                  <option value="project-to-queryflow">Project → QueryFlow</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Conflict Resolution
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500">
                  <option value="manual">Manual</option>
                  <option value="automatic">Automatic</option>
                  <option value="queryflow-wins">QueryFlow Wins</option>
                  <option value="project-wins">Project Wins</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render alerts
  const renderAlerts = () => {
    const activeAlerts = alerts.filter(alert => !alert.resolved);

    if (activeAlerts.length === 0) return null;

    return (
      <div className="space-y-3 mb-6">
        {activeAlerts.map((alert) => (
          <div
            key={alert.id}
            className={`flex items-center justify-between p-4 rounded-lg border ${
              alert.type === 'error' ? 'bg-red-50 border-red-200' :
              alert.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
              'bg-blue-50 border-blue-200'
            }`}
          >
            <div className="flex items-center">
              <AlertCircle className={`w-5 h-5 mr-3 ${
                alert.type === 'error' ? 'text-red-600' :
                alert.type === 'warning' ? 'text-yellow-600' :
                'text-blue-600'
              }`} />
              <div>
                <p className={`font-medium ${
                  alert.type === 'error' ? 'text-red-800' :
                  alert.type === 'warning' ? 'text-yellow-800' :
                  'text-blue-800'
                }`}>
                  {alert.message}
                </p>
                <p className="text-sm text-gray-600">
                  {alert.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
            <button
              onClick={() => resolveAlert(alert.id)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
    );
  };

  // Render sync history
  const renderSyncHistory = () => {
    if (syncHistory.length === 0) return null;

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Sync History</h3>
          <button
            onClick={loadSyncHistory}
            className="inline-flex items-center px-3 py-1 text-gray-600 text-sm rounded hover:bg-gray-100"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Refresh
          </button>
        </div>

        <div className="space-y-3">
          {syncHistory.map((session) => {
            const StatusIcon = STATUS_CONFIG[session.status].icon;
            const duration = session.completedAt && session.startedAt
              ? session.completedAt.getTime() - session.startedAt.getTime()
              : 0;

            return (
              <div key={session.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center">
                  <StatusIcon className={`w-5 h-5 mr-3 ${STATUS_CONFIG[session.status].color}`} />
                  <div>
                    <div className="font-medium text-gray-900">
                      {session.startedAt.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">
                      {session.statistics.totalChanges} changes • {Math.round(duration / 1000)}s
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-green-600">{session.statistics.successfulChanges}</div>
                    <div className="text-gray-600">Success</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-red-600">{session.statistics.failedChanges}</div>
                    <div className="text-gray-600">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-orange-600">{session.statistics.totalConflicts}</div>
                    <div className="text-gray-600">Conflicts</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Database className="w-6 h-6 text-gray-600 mr-3" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Sync Manager
            </h2>
            <p className="text-sm text-gray-600">
              Manage synchronization for {database.name}
            </p>
          </div>
        </div>

        {activeSession && (
          <div className="flex items-center text-sm text-gray-600">
            <Timer className="w-4 h-4 mr-1" />
            Session active
          </div>
        )}
      </div>

      {/* Alerts */}
      {renderAlerts()}

      {/* Sync Status */}
      {renderSyncStatus()}

      {/* Conflicts */}
      {renderConflicts()}

      {/* Sync Controls */}
      {renderSyncControls()}

      {/* Sync History */}
      {renderSyncHistory()}
    </div>
  );
}
