'use client';

// Projects Page Component
// Displays available projects and handles synchronization

import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  CircleCheckBig,
  CircleX,
  Github,
  Database,
  Server,
  FolderOpen,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { projectsManager } from '../utils/projectsManager';
import { Project } from '../types/projects';
import { DatabaseConnectionModal } from './DatabaseConnectionModal';
import { QueryEditor } from './QueryEditor';

export function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [syncingProject, setSyncingProject] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
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

  useEffect(() => {
    // Load projects from the projects manager
    const allProjects = projectsManager.getAllProjects();
    setProjects(allProjects);

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
      setNotification({
        type: 'success',
        message: `Project "${data.project.name}" synced successfully! The entire application now uses this project's databases.`
      });

      // Auto-hide notification after 5 seconds
      setTimeout(() => setNotification(null), 5000);
    };

    const handleSyncError = (data: any) => {
      setSyncingProject(null);
      setNotification({
        type: 'error',
        message: `Failed to sync project: ${data.error.message}`
      });
    };

    projectsManager.addEventListener('project_sync_start', handleSyncStart);
    projectsManager.addEventListener('project_sync_complete', handleSyncComplete);
    projectsManager.addEventListener('project_sync_error', handleSyncError);

    return () => {
      projectsManager.removeEventListener('project_sync_start', handleSyncStart);
      projectsManager.removeEventListener('project_sync_complete', handleSyncComplete);
      projectsManager.removeEventListener('project_sync_error', handleSyncError);
    };
  }, []);

  const loadProjects = () => {
    const allProjects = projectsManager.getAllProjects();
    setProjects(allProjects);
  };

  const handleSync = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    // Open connection modal instead of auto-syncing
    setConnectionProjectId(projectId);
    setShowConnectionModal(true);
  };

  const handleConnectionSuccess = async (connectionId: string, credentials: any) => {
    const project = projects.find(p => p.id === connectionProjectId);
    if (!project) return;

    try {
      // Store connection
      setConnections(prev => new Map(prev.set(connectionProjectId, {
        connectionId,
        credentials,
        connectedAt: new Date()
      })));

      // Update project status
      setProjects(prev => prev.map(p =>
        p.id === connectionProjectId ? { ...p, status: 'connected' as const } : p
      ));

      // Fetch schema
      const schemaResponse = await fetch('/api/database/schema', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ connectionId }),
      });

      const schemaResult = await schemaResponse.json();

      if (schemaResult.success) {
        setNotification({
          type: 'success',
          message: `Project "${project.name}" synced successfully! Found ${schemaResult.data.tables.length} tables.`
        });

        // Update project with schema info
        setProjects(prev => prev.map(p =>
          p.id === connectionProjectId ? {
            ...p,
            status: 'connected' as const,
            databaseCount: 1,
            schema: schemaResult.data
          } : p
        ));
      } else {
        setNotification({
          type: 'error',
          message: `Failed to fetch schema: ${schemaResult.message}`
        });
      }
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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Projects</h1>
        <p className="text-gray-600">
          Manage and sync your database projects. Each project contains its own embedded database.
        </p>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`mb-4 p-4 rounded-lg flex items-center space-x-2 ${
          notification.type === 'success' ? 'bg-green-50 text-green-800' :
          notification.type === 'error' ? 'bg-red-50 text-red-800' :
          'bg-blue-50 text-blue-800'
        }`}>
          {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
          {notification.type === 'error' && <AlertTriangle className="w-5 h-5" />}
          {notification.type === 'info' && <RefreshCw className="w-5 h-5 animate-spin" />}
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-auto text-gray-400 hover:text-gray-600"
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
                <span>
                  {project.schema ? `${project.schema.tables.length} tables` : `${project.databaseCount} database${project.databaseCount !== 1 ? 's' : ''}`}
                </span>
              </div>

              {/* Schema/Tables Info */}
              {project.schema ? (
                <div className="mb-4">
                  <div className="text-xs text-gray-500 mb-2">Tables ({project.schema.tables.length}):</div>
                  <div className="space-y-1">
                    {project.schema.tables.slice(0, 3).map((table) => (
                      <div key={table.name} className="flex items-center space-x-2 text-xs text-gray-600">
                        <Database className="w-3 h-3" />
                        <span>{table.name}</span>
                        <span className="text-gray-400">({table.rowCount || 0} rows)</span>
                      </div>
                    ))}
                    {project.schema.tables.length > 3 && (
                      <div className="text-xs text-gray-400">
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
                      <div key={db.id} className="flex items-center space-x-2 text-xs text-gray-600">
                        <Database className="w-3 h-3" />
                        <span>{db.name}</span>
                        <span className={`px-1 py-0.5 rounded text-xs ${
                          db.isConnected ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        }`}>
                          {db.isConnected ? 'Connected' : 'Disconnected'}
                        </span>
                      </div>
                    ))}
                    {project.databases.length > 2 && (
                      <div className="text-xs text-gray-400">
                        +{project.databases.length - 2} more
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
                </div>
                <div className="relative">
                  <button className="p-1 text-gray-400 hover:text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-ellipsis-vertical w-4 h-4">
                      <circle cx="12" cy="12" r="1"></circle>
                      <circle cx="12" cy="5" r="1"></circle>
                      <circle cx="12" cy="19" r="1"></circle>
                    </svg>
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
    </div>
  );
}
