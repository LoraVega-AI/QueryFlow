'use client';

// Projects Page Component
// Displays available projects and handles synchronization

import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  CircleCheckBig,
  CircleX,
  Github,
  Database,
  Server,
  FolderOpen,
  AlertTriangle,
  CheckCircle,
  Upload,
  Download,
  Trash2
} from 'lucide-react';
import { projectsManager } from '../utils/projectsManager';
import { Project } from '../types/projects';
import { DatabaseConnectionModal } from './DatabaseConnectionModal';
import { QueryEditor } from './QueryEditor';
import { ProjectUploader } from './ProjectUploader';
import { useDatabase } from '../contexts/DatabaseContext';
import { DatabaseConnector } from '../utils/databaseConnector';
import { DatabaseSchema } from '../types/database';
import { useRealtimeUpdates } from '../hooks/useRealtimeUpdates';
import { useSessionManager } from '../hooks/useSessionManager';

export function Projects() {
  const { connectDatabase } = useDatabase();
  const [projects, setProjects] = useState<Project[]>([]);
  const [syncingProject, setSyncingProject] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    duration?: number;
  } | null>(null);

  // Database connection state
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [connectionProjectId, setConnectionProjectId] = useState<string>('');
  const [connections, setConnections] = useState<Map<string, any>>(new Map());

  // Query editor state
  const [showQueryEditor, setShowQueryEditor] = useState(false);
  const [queryEditorConnection, setQueryEditorConnection] = useState<{
    connectionId: string;
    projectName: string;
    databaseName?: string;
  } | null>(null);

  // Project uploader state
  const [showProjectUploader, setShowProjectUploader] = useState(false);
  
  // Auto-refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  
  // Real-time updates state
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  
  // Session management
  const { addRecentProject, getRecentProjects, updateUserPreferences, getUserPreferences } = useSessionManager({
    autoSave: true,
    autoLoad: true
  });

  // Load projects function
  const loadProjects = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setIsRefreshing(true);
    }
    
    try {
      console.log('🔄 Projects component: Loading projects...');
      const allProjects = await projectsManager.getAllProjects();
      console.log('📁 Projects component: Projects loaded:', allProjects.length, 'projects');
      console.log('📁 Projects component: Project details:', allProjects.map(p => ({ 
        id: p.id, 
        name: p.name, 
        databaseCount: p.databaseCount,
        totalTables: p.totalTables || 0,
        totalRows: p.totalRows || 0,
        hasSchema: !!p.schema,
        schemaTables: p.schema?.tables?.length || 0
      })));
      setProjects(allProjects);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('❌ Projects component: Failed to load projects:', error);
      // Try direct API call as fallback
      try {
        console.log('🔄 Projects component: Trying direct API call as fallback...');
        const response = await fetch('/api/projects');
        const data = await response.json();
        console.log('📡 Projects component: API response:', data);
        if (data.success && data.data) {
          setProjects(data.data);
          setLastRefresh(new Date());
          console.log('✅ Projects component: Projects loaded via API fallback');
        }
      } catch (apiError) {
        console.error('❌ Projects component: API fallback failed:', apiError);
      }
    } finally {
      if (showLoading) {
        setIsRefreshing(false);
      }
    }
  }, []);

  // Helper function to show notifications
  const showNotification = useCallback((type: 'success' | 'error' | 'info' | 'warning', message: string, duration: number = 5000) => {
    setNotification({ type, message, duration });
    
    if (duration > 0) {
      setTimeout(() => {
        setNotification(null);
      }, duration);
    }
  }, []);

  // Real-time updates handlers
  const handleProjectCreated = useCallback((data: any) => {
    console.log('Real-time: Project created', data);
    showNotification('success', `Project "${data.name}" created successfully!`);
    loadProjects(true); // Refresh projects list
  }, [loadProjects, showNotification]);

  const handleProjectUpdated = useCallback((data: any) => {
    console.log('Real-time: Project updated', data);
    showNotification('info', `Project "${data.name}" updated`);
    loadProjects(true); // Refresh projects list
  }, [loadProjects, showNotification]);

  const handleProjectDeleted = useCallback((data: any) => {
    console.log('Real-time: Project deleted', data);
    showNotification('warning', `Project "${data.name}" deleted`);
    loadProjects(true); // Refresh projects list
  }, [loadProjects, showNotification]);

  const handleProjectSynced = useCallback((data: any) => {
    console.log('Real-time: Project synced', data);
    showNotification('success', `Project "${data.name}" synced successfully!`);
    loadProjects(true); // Refresh projects list
  }, [loadProjects, showNotification]);

  const handleRealtimeError = useCallback((error: Event) => {
    console.error('Real-time connection error:', error);
    setRealtimeConnected(false);
    showNotification('error', 'Real-time connection lost. Using fallback polling.');
  }, [showNotification]);

  // Set up real-time updates
  const { connect: connectRealtime, disconnect: disconnectRealtime, isConnected } = useRealtimeUpdates({
    onProjectCreated: handleProjectCreated,
    onProjectUpdated: handleProjectUpdated,
    onProjectDeleted: handleProjectDeleted,
    onProjectSynced: handleProjectSynced,
    onError: handleRealtimeError,
    autoConnect: true
  });

  // Monitor real-time connection status
  useEffect(() => {
    const checkConnection = () => {
      setRealtimeConnected(isConnected());
    };
    
    checkConnection();
    const interval = setInterval(checkConnection, 5000);
    
    return () => clearInterval(interval);
  }, [isConnected]);



  useEffect(() => {
    // Initial load
    loadProjects();

    // Listen for project sync events
    const handleSyncStart = (data: any) => {
      setSyncingProject(data.projectId);
      setNotification({
        type: 'info',
        message: `Syncing project ${data.projectId}...`
      });
    };

    const handleSyncComplete = (data: any) => {
      setSyncingProject(null);
      setProjects(prev => prev.map(p =>
        p.id === data.projectId ? { ...data.project, status: 'connected' as const } : p
      ));
      showNotification('success', `Project "${data.project.name}" synced successfully! The entire application now uses this project's databases.`);
    };

    const handleSyncError = (data: any) => {
      setSyncingProject(null);
      showNotification('error', `Failed to sync project: ${data.error.message}`);
    };

    projectsManager.addEventListener('project_sync_start', handleSyncStart);
    projectsManager.addEventListener('project_sync_complete', handleSyncComplete);
    projectsManager.addEventListener('project_sync_error', handleSyncError);

    return () => {
      projectsManager.removeEventListener('project_sync_start', handleSyncStart);
      projectsManager.removeEventListener('project_sync_complete', handleSyncComplete);
      projectsManager.removeEventListener('project_sync_error', handleSyncError);
    };
  }, [loadProjects, showNotification]);

  // Auto-refresh every 30 seconds (fallback when real-time is not available)
  useEffect(() => {
    if (!realtimeConnected) {
      const interval = setInterval(() => {
        loadProjects();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [loadProjects, realtimeConnected]);

  const handleSync = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    // Add to recent projects
    addRecentProject(projectId);

    // Check if this is an example project - auto-connect if so
    if (project.isExample) {
      await handleExampleProjectSync(project);
    } else {
      // Open connection modal for real projects
      setConnectionProjectId(projectId);
      setShowConnectionModal(true);
    }
  };

  const handleExampleProjectSync = async (project: Project) => {
    try {
      setSyncingProject(project.id);
      setProjects(prev => prev.map(p =>
        p.id === project.id ? { ...p, status: 'syncing' as const } : p
      ));

      // Auto-connect example project using the project manager
      const success = await projectsManager.syncProject(project.id);

      if (success) {
        // Load the updated project with schema
        const updatedProject = await projectsManager.getProject(project.id);
        if (updatedProject) {
          setProjects(prev => prev.map(p =>
            p.id === project.id ? updatedProject : p
          ));

          // Connect the first database to the global context for app-wide access
          if (updatedProject.databases && updatedProject.databases.length > 0) {
            const firstDb = updatedProject.databases[0];
            const connectionId = `example_${project.id}_${firstDb.id}`;

            // Convert database config to credentials format
            const credentials = {
              type: firstDb.type,
              filePath: firstDb.type === 'sqlite' ? firstDb.connectionString : undefined,
              database: firstDb.name
            };

            // Connect to global database context
            connectDatabase(connectionId, credentials, updatedProject.schema as any);
          }

          setNotification({
            type: 'success',
            message: `Example project "${project.name}" connected successfully! You can now query the database.`
          });
        }
      } else {
        setProjects(prev => prev.map(p =>
          p.id === project.id ? { ...p, status: 'error' as const } : p
        ));

        setNotification({
          type: 'error',
          message: `Failed to connect example project "${project.name}"`
        });
      }
    } catch (error: any) {
      console.error('Example project sync failed:', error);
      setProjects(prev => prev.map(p =>
        p.id === project.id ? { ...p, status: 'error' as const } : p
      ));

      setNotification({
        type: 'error',
        message: `Failed to sync example project: ${error.message}`
      });
    } finally {
      setSyncingProject(null);
    }
  };

  const handleConnectionSuccess = async (connectionId: string, credentials: any, schema?: any) => {
    const project = projects.find(p => p.id === connectionProjectId);
    if (!project) return;

    try {
      // Connect to global database context - this makes the entire site use this database
      connectDatabase(connectionId, credentials, schema);

      // Store connection locally for project management
      setConnections(prev => new Map(prev.set(connectionProjectId, {
        connectionId,
        credentials,
        connectedAt: new Date()
      })));

      // Update project status
      setProjects(prev => prev.map(p =>
        p.id === connectionProjectId ? { ...p, status: 'connected' as const } : p
      ));

      const tableCount = schema?.tables?.length || 0;
      setNotification({
        type: 'success',
        message: `Database connected successfully! Found ${tableCount} tables. The entire site now uses this database.`
      });

      // Update project with schema info
      setProjects(prev => prev.map(p =>
        p.id === connectionProjectId ? {
          ...p,
          status: 'connected' as const,
          databaseCount: 1,
          schema: schema
        } : p
      ));

      // Close the modal
      setShowConnectionModal(false);
      setConnectionProjectId('');
    } catch (error: any) {
      setNotification({
        type: 'error',
        message: `Failed to sync project: ${error.message}`
      });
    }
  };

  const handleOpenProject = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const connection = connections.get(projectId);

    if (!connection) {
      setNotification({
        type: 'error',
        message: 'Project is not connected. Please sync first.'
      });
      return;
    }

    // Open query editor
    setQueryEditorConnection({
      connectionId: connection.connectionId,
      projectName: project.name,
      databaseName: connection.credentials.database
    });
    setShowQueryEditor(true);
  };

  const handleDownloadProject = async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/download`);
      
      if (!response.ok) {
        throw new Error('Failed to download project');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project_${projectId}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setNotification({
        type: 'success',
        message: 'Project downloaded successfully with updated database information!'
      });
    } catch (error) {
      setNotification({
        type: 'error',
        message: `Failed to download project: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    if (!confirm(`Are you sure you want to delete the project "${project.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete project');
      }

      // Remove from local state
      setProjects(prev => prev.filter(p => p.id !== projectId));

      setNotification({
        type: 'success',
        message: `Project "${project.name}" deleted successfully!`
      });

      // Auto-hide notification after 3 seconds
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      setNotification({
        type: 'error',
        message: `Failed to delete project: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  const getStatusIcon = (status: Project['status']) => {
    switch (status) {
      case 'connected':
        return <CircleCheckBig className="w-4 h-4 text-green-500" />;
      case 'syncing':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'error':
        return <CircleX className="w-4 h-4 text-red-500" />;
      case 'disconnected':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <CircleX className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: Project['status']) => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'syncing':
        return 'Syncing';
      case 'error':
        return 'Error';
      case 'disconnected':
        return 'Disconnected';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'connected':
        return 'bg-green-50 text-green-500';
      case 'syncing':
        return 'bg-blue-50 text-blue-500';
      case 'error':
        return 'bg-red-50 text-red-500';
      case 'disconnected':
        return 'bg-yellow-50 text-yellow-500';
      default:
        return 'bg-gray-50 text-gray-500';
    }
  };

  const formatLastSynced = (lastSynced: string | null) => {
    if (!lastSynced) return 'Never';
    return new Date(lastSynced).toLocaleDateString();
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Projects</h1>
            <p className="text-gray-600">
              Manage and sync your database projects. Each project contains its own embedded database.
            </p>
            <div className="flex items-center gap-4 mt-1">
              {lastRefresh && (
                <p className="text-xs text-gray-500">
                  Last updated: {lastRefresh.toLocaleTimeString()}
                </p>
              )}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${realtimeConnected ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <span className="text-xs text-gray-500">
                  {realtimeConnected ? 'Real-time connected' : 'Polling mode'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowProjectUploader(true)}
              data-upload-trigger
              className="inline-flex items-center px-4 py-2 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 transition-colors"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Project
            </button>
            <button
              onClick={() => loadProjects(true)}
              disabled={isRefreshing}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`mb-4 p-4 rounded-lg flex items-center space-x-2 ${
          notification.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
          notification.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
          notification.type === 'warning' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
          'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          {notification.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
          {notification.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-600" />}
          {notification.type === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-600" />}
          {notification.type === 'info' && <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />}
          <span className="flex-1">{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            ×
          </button>
        </div>
      )}

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <div
            key={project.id}
            className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">{project.icon}</div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                    <p className="text-sm text-gray-600">{project.technology}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {/* Technology Icon */}
                  {project.technology.toLowerCase().includes('node') && (
                    <div className="w-6 h-6 bg-green-100 rounded flex items-center justify-center">
                      <span className="text-xs text-green-600">JS</span>
                    </div>
                  )}
                  {project.technology.toLowerCase().includes('django') && (
                    <Github className="w-4 h-4 text-gray-400" />
                  )}
                  {project.technology.toLowerCase().includes('php') && (
                    <div className="text-lg">🐘</div>
                  )}

                  {/* Status */}
                  <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                    {getStatusIcon(project.status)}
                    <span className="ml-1">{getStatusText(project.status)}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {project.description}
              </p>

              {/* Stats */}
              <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                <span>Last synced: {formatLastSynced(project.lastSynced)}</span>
                <div className="flex items-center space-x-2">
                  {project.totalTables && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      {project.totalTables} tables
                    </span>
                  )}
                  {project.totalRows && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                      {project.totalRows.toLocaleString()} rows
                    </span>
                  )}
                </div>
              </div>

              {/* Schema/Tables Info */}
              {project.schema ? (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-gray-500">Tables ({project.schema.tables.length}):</div>
                    <div className="flex items-center space-x-1 text-xs">
                      {project.hasForeignKeys && (
                        <span className="px-1 py-0.5 bg-purple-100 text-purple-600 rounded" title="Has foreign keys">
                          🔗
                        </span>
                      )}
                      {project.hasIndexes && (
                        <span className="px-1 py-0.5 bg-orange-100 text-orange-600 rounded" title="Has indexes">
                          📇
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    {project.schema.tables.slice(0, 3).map((table) => (
                      <div key={table.name} className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 rounded p-2">
                        <div className="flex items-center space-x-2">
                          <Database className="w-3 h-3" />
                          <span className="font-medium">{table.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-400">({table.rowCount || 0} rows)</span>
                          {table.columns && (
                            <span className="text-gray-400">({table.columns.length} cols)</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {project.schema.tables.length > 3 && (
                      <div className="text-xs text-gray-400 text-center py-1">
                        +{project.schema.tables.length - 3} more tables
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mb-4">
                  <div className="text-xs text-gray-500 mb-2">Databases:</div>
                  <div className="space-y-1">
                    {project.databases.slice(0, 2).map((db) => (
                      <div key={db.id} className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 rounded p-2">
                        <div className="flex items-center space-x-2">
                          <Database className="w-3 h-3" />
                          <span className="font-medium">{db.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-400">({db.tableCount || 0} tables)</span>
                          <span className={`px-1 py-0.5 rounded text-xs ${
                            db.isConnected ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                          }`}>
                            {db.isConnected ? 'Connected' : 'Disconnected'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {project.databases.length > 2 && (
                      <div className="text-xs text-gray-400 text-center py-1">
                        +{project.databases.length - 2} more databases
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleOpenProject(project.id)}
                    className="inline-flex items-center px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 transition-colors disabled:opacity-50"
                    disabled={project.status !== 'connected' || !connections.has(project.id)}
                  >
                    Open
                  </button>
                  <button
                    onClick={() => handleSync(project.id)}
                    disabled={syncingProject === project.id || project.databases.length === 0}
                    className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`w-3 h-3 mr-1 ${syncingProject === project.id ? 'animate-spin' : ''}`} />
                    {syncingProject === project.id ? 'Syncing' : 'Sync'}
                  </button>
                  <button
                    onClick={() => handleDownloadProject(project.id)}
                    className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                    title="Download project with updated database"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </button>
                  <button
                    onClick={() => handleDeleteProject(project.id)}
                    className="inline-flex items-center px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                    title="Delete project"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {projects.length === 0 && (
        <div className="text-center py-12">
          <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
          <p className="text-gray-600">Get started by creating your first project.</p>
        </div>
      )}

      {/* Current Project Info */}
      {projectsManager.getCurrentProject() && (
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Server className="w-5 h-5 text-blue-600" />
            <div>
              <h4 className="text-sm font-medium text-blue-900">
                Currently Active: {projectsManager.getCurrentProject()?.name}
              </h4>
              <p className="text-sm text-blue-700">
                All database operations are now using this project's embedded databases.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Database Connection Modal */}
      <DatabaseConnectionModal
        isOpen={showConnectionModal}
        onClose={() => setShowConnectionModal(false)}
        onConnect={handleConnectionSuccess}
        projectName={projects.find(p => p.id === connectionProjectId)?.name}
      />

      {/* Query Editor Modal */}
      {queryEditorConnection && (
        <QueryEditor
          isOpen={showQueryEditor}
          onClose={() => setShowQueryEditor(false)}
          connectionId={queryEditorConnection.connectionId}
          projectName={queryEditorConnection.projectName}
          databaseName={queryEditorConnection.databaseName}
        />
      )}

      {/* Project Uploader Modal */}
      {showProjectUploader && (
        <ProjectUploader
          onProjectDetected={async (result) => {
            console.log('🎉 Project detected callback received:', result);
            try {
              // Add a small delay to ensure the project is saved
              console.log('⏳ Waiting 1 second for project to be saved...');
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              // Reload projects to show the new uploaded project
              console.log('🔄 Reloading projects...');
              await loadProjects(true);
              console.log('✅ Projects reloaded successfully');
              
              // Automatically connect the uploaded database to QueryFlow
              if (result.projectData && result.projectData.databases && result.projectData.databases.length > 0) {
                console.log('🔌 Auto-connecting uploaded database to QueryFlow...');
                const database = result.projectData.databases[0]; // Use first database
                
                try {
                  // Use the schema that was already extracted during upload
                  const schema = result.projectData.schema;
                  
                  if (!schema) {
                    throw new Error('No schema found in uploaded project data');
                  }
                  
                  // Connect the database to the global QueryFlow system with schema
                  const connectionId = `uploaded_${result.projectId}_${Date.now()}`;
                  const credentials = {
                    type: database.type,
                    filePath: database.filePath || database.connectionString,
                    database: database.name
                  };
                  
                  // Prepare metadata for the connection
                  const metadata = {
                    projectId: result.projectId,
                    projectName: result.projectName,
                    uploadPath: result.uploadPath,
                    tableCount: database.tableCount || 0,
                    totalRows: database.totalRows || 0,
                    hasForeignKeys: database.hasForeignKeys || false,
                    hasIndexes: database.hasIndexes || false
                  };
                  
                  // Connect to the database with schema and metadata
                  connectDatabase(connectionId, credentials, schema, metadata);
                  
                  console.log('✅ Database connected to QueryFlow successfully with schema:', schema);
                  
                  setNotification({
                    type: 'success',
                    message: `Project "${result.projectName}" uploaded and connected! Found ${schema.tables.length} tables. The schema designer now shows your database tables.`
                  });
                } catch (connectionError) {
                  console.error('❌ Failed to connect database to QueryFlow:', connectionError);
                  setNotification({
                    type: 'warning',
                    message: `Project "${result.projectName}" uploaded successfully, but failed to connect to QueryFlow: ${connectionError instanceof Error ? connectionError.message : 'Unknown error'}`
                  });
                }
              } else {
                setNotification({
                  type: 'success',
                  message: `Project "${result.projectName}" uploaded successfully with ${result.databases.length} databases!`
                });
              }
              
              console.log('✅ Notification set successfully');
            } catch (error) {
              console.error('❌ Error in project detected callback:', error);
              setNotification({
                type: 'error',
                message: `Project uploaded but failed to reload: ${error instanceof Error ? error.message : 'Unknown error'}`
              });
            }
          }}
          onClose={() => setShowProjectUploader(false)}
        />
      )}
    </div>
  );
}
