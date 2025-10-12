'use client';

// Projects Page Component
// Displays available projects and handles synchronization

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Trash2,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Grid,
  List,
  X,
  ChevronDown,
  ChevronUp,
  Link,
  Printer
} from 'lucide-react';
import { projectsManager } from '../utils/projectsManager';
import { Project } from '../types/project';
import { DatabaseConnectionModal } from './DatabaseConnectionModal';
import { QueryEditor } from './QueryEditor';
import { ProjectUploader } from './ProjectUploader';
import { VerificationDashboard } from './VerificationDashboard';
import { useDatabase } from '../contexts/DatabaseContext';
import { DatabaseConnector } from '../utils/databaseConnector';
import { DatabaseSchema } from '../types/database';
import { useRealtimeUpdates } from '../hooks/useRealtimeUpdates';
import { useSessionManager } from '../hooks/useSessionManager';
import { dbConnectionManager } from '../utils/databaseConnection';

export function Projects() {
  const { connectDatabase, getConnectionInfo } = useDatabase();

  // Helper function to determine database type from project data
  const getDatabaseType = (project: Project): string | null => {
    // Check systemCatalog metadata first
    if (project.systemCatalog?.metadata?.databaseType) {
      const dbType = project.systemCatalog.metadata.databaseType.toLowerCase();
      return formatDatabaseType(dbType);
    }
    
    // Check databases array
    if (project.databases && project.databases.length > 0) {
      const dbType = project.databases[0].type?.toLowerCase();
      if (dbType) {
        return formatDatabaseType(dbType);
      }
    }
    
    // Check schema metadata
    if (project.schema?.metadata?.databaseType) {
      const dbType = project.schema.metadata.databaseType.toLowerCase();
      return formatDatabaseType(dbType);
    }
    
    // Fallback: Extract database type from project name
    const dbTypeFromName = extractDatabaseTypeFromName(project.name);
    if (dbTypeFromName) {
      return formatDatabaseType(dbTypeFromName);
    }
    
    return null;
  };

  // Helper function to extract database type from project name
  const extractDatabaseTypeFromName = (projectName: string): string | null => {
    const name = projectName.toLowerCase();
    
    // Common database type patterns in project names
    if (name.includes('postgresql') || name.includes('postgres')) return 'postgresql';
    if (name.includes('mysql')) return 'mysql';
    if (name.includes('sqlite')) return 'sqlite';
    if (name.includes('mongodb') || name.includes('mongo')) return 'mongodb';
    if (name.includes('redis')) return 'redis';
    if (name.includes('dynamodb') || name.includes('dynamo')) return 'dynamodb';
    if (name.includes('oracle')) return 'oracle';
    if (name.includes('sql server') || name.includes('mssql')) return 'sqlserver';
    
    return null;
  };

  // Helper function to format database type for display
  const formatDatabaseType = (dbType: string): string => {
    const typeMap: { [key: string]: string } = {
      'sqlite': 'SQLite',
      'postgresql': 'PostgreSQL',
      'postgres': 'PostgreSQL',
      'mysql': 'MySQL',
      'mongodb': 'MongoDB',
      'redis': 'Redis',
      'dynamodb': 'DynamoDB',
      'oracle': 'Oracle',
      'sqlserver': 'SQL Server',
      'mssql': 'SQL Server'
    };
    
    return typeMap[dbType] || dbType.toUpperCase();
  };
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
    projectId: string;
  } | null>(null);

  // Project uploader state
  const [showProjectUploader, setShowProjectUploader] = useState(false);
  
  // Auto-refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  
  // Real-time updates state
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  
  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [technologyFilter, setTechnologyFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'lastSynced' | 'totalTables' | 'totalRows'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  
  // Table expansion state
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  // Table details expansion state (for showing rows/columns)
  const [expandedTableDetails, setExpandedTableDetails] = useState<Set<string>>(new Set());
  // Section expansion state
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  
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
      console.log('🔄 Projects component: Loading projects via API...');
      const response = await fetch('/api/projects');
      const data = await response.json();
      console.log('📡 Projects component: API response:', data);
      
      if (data.success && data.data) {
        const allProjects = data.data;
        console.log('📁 Projects component: Projects loaded:', allProjects.length, 'projects');
        console.log('📁 Projects component: Project details:', allProjects.map((p: any) => ({ 
          id: p.id, 
          name: p.name, 
          databaseCount: p.databaseCount,
          totalTables: p.totalTables || 0,
          totalRows: p.totalRows || 0,
          hasSchema: !!p.schema,
          schemaTables: p.schema?.tables?.length || 0
        })));
        
        // Debug: Check for projects with tables
        const projectsWithTables = allProjects.filter((p: any) => (p.totalTables || 0) > 0);
        console.log('🔍 Projects with tables:', projectsWithTables.length);
        console.log('🔍 Projects with tables details:', projectsWithTables.map((p: any) => ({
          id: p.id,
          name: p.name,
          totalTables: p.totalTables,
          hasSchema: !!p.schema,
          schemaTables: p.schema?.tables?.length || 0,
          status: p.status
        })));
        
        // Debug: Check the first project in detail
        if (allProjects.length > 0) {
          const firstProject = allProjects[0];
          console.log('🔍 First project details:', {
            id: firstProject.id,
            name: firstProject.name,
            totalTables: firstProject.totalTables,
            hasSchema: !!firstProject.schema,
            schemaTables: firstProject.schema?.tables?.length || 0,
            status: firstProject.status,
            isExample: firstProject.isExample
          });
        }
        
        // Check if any project is currently connected in the database context
        const currentConnection = getConnectionInfo();
        
        // Update project status based on active connection
        const updatedProjects = allProjects.map((project: any) => {
          if (currentConnection && currentConnection.projectId === project.id) {
            return { ...project, status: 'connected' as const };
          }
          return project;
        });
        
        setProjects(updatedProjects);
        setLastRefresh(new Date());
        console.log('✅ Projects component: Projects loaded via API');
      } else {
        console.error('❌ Projects component: API returned error:', data.message);
      }
    } catch (error) {
      console.error('❌ Projects component: Failed to load projects:', error);
    } finally {
      if (showLoading) {
        setIsRefreshing(false);
      }
    }
  }, [getConnectionInfo]);

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
    const errorInfo = {
      type: error?.type || 'unknown',
      timestamp: new Date().toISOString(),
      errorObject: error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined
    };
    
    // Only show error notifications for critical errors, not connection retries
    if (error?.type === 'error' && errorInfo.errorMessage !== 'Unknown error') {
      console.warn('Real-time connection error:', errorInfo);
      setRealtimeConnected(false);
      showNotification('error', 'Real-time connection lost. Using fallback polling.');
    } else {
      // For connection retries, just log as info
      console.log('Real-time connection retry:', errorInfo);
    }
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

    const handleSyncComplete = async (data: any) => {
      setSyncingProject(null);
      const updatedProject = { ...data.project, status: 'connected' as const, lastSynced: new Date() };
      setProjects(prev => prev.map(p =>
        p.id === data.projectId ? updatedProject : p
      ));

      // Save to database
      try {
        await dbConnectionManager.saveProject(updatedProject);
      } catch (error) {
        console.error('Failed to save project to database:', error);
      }

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

  // Update project status when database connection changes
  useEffect(() => {
    const currentConnection = getConnectionInfo();
    if (currentConnection) {
      setProjects(prev => prev.map(project => {
        if (currentConnection.projectId === project.id) {
          return { ...project, status: 'connected' as const };
        }
        return project;
      }));
    }
  }, [getConnectionInfo]);

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
    console.log('🔄 Sync button clicked for project:', projectId);
    const project = projects.find(p => p.id === projectId);
    if (!project) {
      console.log('❌ Project not found:', projectId);
      showNotification('error', 'Project not found');
      return;
    }

    console.log('📊 Project found:', {
      id: project.id,
      name: project.name,
      isExample: project.isExample,
      hasSchema: !!project.schema,
      schemaTables: project.schema?.tables?.length || 0,
      hasDatabases: !!project.databases,
      databasesLength: project.databases?.length || 0,
      totalTables: project.totalTables
    });

    // Add to recent projects
    addRecentProject(projectId);

    try {
      // Check if this is an example project - auto-connect if so
      if (project.isExample) {
        console.log('📝 Example project, using example sync');
        await handleExampleProjectSync(project);
      } else {
        console.log('📁 Uploaded project, checking for data...');
        // For uploaded projects, try to sync directly if we have schema or databases
        if ((project.schema && project.schema.tables && project.schema.tables.length > 0) || 
            (project.databases && project.databases.length > 0)) {
          console.log('✅ Project has data, proceeding with sync');
          await handleUploadedProjectSync(project);
        } else {
          console.log('❌ No data found, opening connection modal');
          // Open connection modal for projects without databases
          setConnectionProjectId(projectId);
          setShowConnectionModal(true);
        }
      }
    } catch (error) {
      console.error('Sync failed:', error);
      showNotification('error', `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleUploadedProjectSync = async (project: Project) => {
    try {
      console.log('🔄 Starting sync for project:', project.id, project.name);
      console.log('📊 Project data:', {
        hasSchema: !!project.schema,
        schemaTables: project.schema?.tables?.length || 0,
        totalTables: project.totalTables,
        hasDatabases: !!project.databases,
        databasesLength: project.databases?.length || 0
      });

      setSyncingProject(project.id);
      setProjects(prev => prev.map(p =>
        p.id === project.id ? { ...p, status: 'syncing' as const } : p
      ));

      showNotification('info', `Syncing project "${project.name}"...`);

      // For uploaded projects, check if we have schema data
      if (project.schema && project.schema.tables && project.schema.tables.length > 0) {
        console.log('✅ Found schema data, proceeding with sync');
        const connectionId = `project_${project.id}_extracted`;
        
        // Create a virtual database connection for extracted schema
        const credentials = {
          type: 'extracted',
          database: project.name,
          filePath: 'extracted'
        };

        // Connect to global database context with the extracted schema
        connectDatabase(connectionId, credentials, project.schema as any, {
          projectId: project.id,
          projectName: project.name,
          tableCount: project.totalTables || 0,
          totalRows: project.totalRows || 0,
          hasForeignKeys: project.hasForeignKeys || false,
          hasIndexes: project.hasIndexes || false
        });

        // Update project status
        const updatedProject = { ...project, status: 'connected' as const, lastSynced: new Date() };
        setProjects(prev => prev.map(p =>
          p.id === project.id ? updatedProject : p
        ));

        // Save to database
        try {
          await dbConnectionManager.saveProject(updatedProject);
        } catch (error) {
          console.error('Failed to save project to database:', error);
        }

        showNotification('success', `Project "${project.name}" synced successfully! Found ${project.totalTables || 0} tables.`);
      } else if (project.databases && project.databases.length > 0) {
        // Fallback to databases array if available
        const firstDb = project.databases[0];
        const connectionId = `project_${project.id}_${firstDb.id}`;

        // Convert database config to credentials format
        const credentials = {
          type: firstDb.type,
          filePath: firstDb.type === 'sqlite' ? firstDb.connectionString : undefined,
          database: firstDb.name,
          host: firstDb.host,
          port: firstDb.port,
          username: firstDb.username,
          password: firstDb.password
        };

        // Connect to global database context
        connectDatabase(connectionId, credentials, project.schema as any, {
          projectId: project.id,
          projectName: project.name,
          tableCount: project.totalTables || 0,
          totalRows: project.totalRows || 0,
          hasForeignKeys: project.hasForeignKeys || false,
          hasIndexes: project.hasIndexes || false
        });

        // Update project status
        const updatedProject = { ...project, status: 'connected' as const, lastSynced: new Date() };
        setProjects(prev => prev.map(p =>
          p.id === project.id ? updatedProject : p
        ));

        // Save to database
        try {
          await dbConnectionManager.saveProject(updatedProject);
        } catch (error) {
          console.error('Failed to save project to database:', error);
        }

        showNotification('success', `Project "${project.name}" synced successfully!`);
      } else {
        throw new Error('No schema or databases found in project');
      }
    } catch (error) {
      console.error('Uploaded project sync failed:', error);
      setProjects(prev => prev.map(p =>
        p.id === project.id ? { ...p, status: 'error' as const } : p
      ));
      showNotification('error', `Failed to sync project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSyncingProject(null);
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
          const projectWithLastSynced = { ...updatedProject, lastSynced: new Date() };
          setProjects(prev => prev.map(p =>
            p.id === project.id ? projectWithLastSynced : p
          ));

          // Save to database
          try {
            await dbConnectionManager.saveProject(projectWithLastSynced);
          } catch (error) {
            console.error('Failed to save project to database:', error);
          }

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
      const updatedProject = { ...project, status: 'connected' as const, lastSynced: new Date() };
      setProjects(prev => prev.map(p =>
        p.id === connectionProjectId ? updatedProject : p
      ));

      // Save to database
      try {
        await dbConnectionManager.saveProject(updatedProject);
      } catch (error) {
        console.error('Failed to save project to database:', error);
      }

      const tableCount = schema?.tables?.length || 0;
      setNotification({
        type: 'success',
        message: `Database connected successfully! Found ${tableCount} tables. The entire site now uses this database.`
      });

      // Update project with schema info
      const updatedProjectWithSchema = {
        ...project,
          status: 'connected' as const,
          databaseCount: 1,
        schema: schema,
        lastSynced: new Date()
      };
      setProjects(prev => prev.map(p =>
        p.id === connectionProjectId ? updatedProjectWithSchema : p
      ));

      // Save to database
      try {
        await dbConnectionManager.saveProject(updatedProjectWithSchema);
      } catch (error) {
        console.error('Failed to save project to database:', error);
      }

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
    if (!project) {
      showNotification('error', 'Project not found');
      return;
    }

    // Check if project has schema data
    if (!project.schema || !project.schema.tables || project.schema.tables.length === 0) {
      showNotification('error', 'Project has no schema data. Please sync first.');
      return;
    }

    // Check if project is connected
    if (project.status !== 'connected') {
      showNotification('error', 'Project is not connected. Please sync first.');
      return;
    }

    try {
      // Create connection ID for the project
      const connectionId = `project_${projectId}_extracted`;
      
      // Create credentials for extracted schema
      const credentials = {
        type: 'extracted',
        database: project.name,
        filePath: 'extracted'
      };

      // Connect to global database context
      connectDatabase(connectionId, credentials, project.schema as any, {
        projectId: project.id,
        projectName: project.name,
        tableCount: project.totalTables || 0,
        totalRows: project.totalRows || 0,
        hasForeignKeys: project.hasForeignKeys || false,
        hasIndexes: project.hasIndexes || false
      });

      // Open query editor
      setQueryEditorConnection({
        connectionId: connectionId,
        projectName: project.name,
        databaseName: project.name,
        projectId: project.id
      });
      setShowQueryEditor(true);

      showNotification('success', `Opened project "${project.name}" in query editor with ${project.totalTables || 0} tables`);
    } catch (error) {
      console.error('Failed to open project:', error);
      showNotification('error', `Failed to open project: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  const formatLastSynced = (lastSynced: Date | string | null | undefined) => {
    if (!lastSynced) return 'Never';
    const date = lastSynced instanceof Date ? lastSynced : new Date(lastSynced);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
    
    return date.toLocaleDateString();
  };

  // Filter and sort projects
  const filteredAndSortedProjects = useMemo(() => {
    let filtered = projects.filter(project => {
      // Search filter
      const matchesSearch = searchQuery === '' || 
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.technology?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
      
      // Technology filter
      const matchesTechnology = technologyFilter === 'all' || 
        project.technology?.toLowerCase().includes(technologyFilter.toLowerCase());
      
      return matchesSearch && matchesStatus && matchesTechnology;
    });

    // Sort projects
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'lastSynced':
          const aDate = a.lastSynced ? (a.lastSynced instanceof Date ? a.lastSynced : new Date(a.lastSynced)) : new Date(0);
          const bDate = b.lastSynced ? (b.lastSynced instanceof Date ? b.lastSynced : new Date(b.lastSynced)) : new Date(0);
          comparison = aDate.getTime() - bDate.getTime();
          break;
        case 'totalTables':
          comparison = (a.totalTables || 0) - (b.totalTables || 0);
          break;
        case 'totalRows':
          comparison = (a.totalRows || 0) - (b.totalRows || 0);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [projects, searchQuery, statusFilter, technologyFilter, sortBy, sortOrder]);

  // Get unique technologies for filter
  const availableTechnologies = useMemo(() => {
    const techs = projects.map(p => p.technology).filter(Boolean);
    return Array.from(new Set(techs)).sort();
  }, [projects]);

  // Get status counts
  const statusCounts = useMemo(() => {
    const counts = { all: projects.length, connected: 0, syncing: 0, error: 0, disconnected: 0, connecting: 0 };
    projects.forEach(project => {
      if (counts[project.status] !== undefined) {
        counts[project.status]++;
      }
    });
    return counts;
  }, [projects]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setTechnologyFilter('all');
    setSortBy('name');
    setSortOrder('asc');
  }, []);

  // Toggle table expansion
  const toggleTableExpansion = useCallback((projectId: string) => {
    setExpandedTables(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  }, []);

  // Toggle table details expansion
  const toggleTableDetails = useCallback((tableKey: string) => {
    setExpandedTableDetails(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tableKey)) {
        newSet.delete(tableKey);
      } else {
        newSet.add(tableKey);
      }
      return newSet;
    });
  }, []);

  // Toggle section expansion
  const toggleSection = useCallback((sectionKey: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionKey)) {
        newSet.delete(sectionKey);
      } else {
        newSet.add(sectionKey);
      }
      return newSet;
    });
  }, []);

  // Export project database info
  const handleExportProject = useCallback((project: Project) => {
    try {
      const exportData = {
        projectInfo: {
          name: project.name,
          technology: project.technology,
          status: project.status,
          totalTables: project.totalTables || 0,
          totalRows: project.totalRows || 0,
          hasForeignKeys: project.hasForeignKeys || false,
          hasIndexes: project.hasIndexes || false,
          lastSynced: project.lastSynced,
          exportedAt: new Date().toISOString()
        },
        tables: project.schema?.tables?.map((table: any) => ({
          name: table.name,
          rowCount: table.rowCount || 0,
          columnCount: table.columns?.length || 0,
          columns: table.columns?.map((col: any) => ({
            name: col.name,
            type: col.type || 'TEXT',
            nullable: col.nullable,
            primaryKey: col.primaryKey,
            unique: col.unique,
            autoIncrement: col.autoIncrement,
            defaultValue: col.defaultValue
          })) || [],
          foreignKeys: table.foreignKeys || [],
          indexes: table.indexes || []
        })) || []
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_database_export.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showNotification('success', `Database info exported for "${project.name}"`);
    } catch (error) {
      showNotification('error', `Failed to export project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [showNotification]);

  return (
    <div className="h-full flex flex-col">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 p-10 pb-8" style={{
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(147, 51, 234, 0.05) 50%, rgba(236, 72, 153, 0.05) 100%)',
        borderBottom: '1px solid rgba(59, 130, 246, 0.1)'
      }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-8 drop-shadow-lg">
              Projects
            </h1>
            <div className="flex items-center gap-8">
              {lastRefresh && (
                <div className="flex items-center gap-4 bg-gradient-to-r from-white via-blue-50 to-indigo-50 px-6 py-4 rounded-3xl border border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                    <RefreshCw className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-base text-gray-800 font-bold">
                    Last updated: {lastRefresh.toLocaleTimeString()}
                  </p>
                </div>
              )}
              <div className="flex items-center gap-4 bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 px-6 py-4 rounded-3xl border border-green-200 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className={`w-6 h-6 rounded-full ${realtimeConnected ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-yellow-500 to-orange-500'} shadow-lg flex items-center justify-center`}>
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                </div>
                <span className="text-base text-gray-800 font-bold">
                  {realtimeConnected ? 'Real-time connected' : 'Polling mode'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <button
              onClick={() => setShowProjectUploader(true)}
              data-upload-trigger
              className="inline-flex items-center px-10 py-5 bg-gradient-to-r from-orange-500 via-orange-600 to-red-500 text-white text-lg font-bold rounded-3xl hover:from-orange-600 hover:via-orange-700 hover:to-red-600 transition-all duration-300 shadow-2xl hover:shadow-3xl transform hover:-translate-y-2 hover:scale-110 border border-orange-400/20"
              style={{
                boxShadow: '0 10px 25px -5px rgba(251, 146, 60, 0.4), 0 10px 10px -5px rgba(251, 146, 60, 0.04)'
              }}
            >
              <Upload className="w-6 h-6 mr-4" />
              Upload Project
            </button>
            <button
              onClick={() => loadProjects(true)}
              disabled={isRefreshing}
              className="inline-flex items-center px-10 py-5 bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 text-white text-lg font-bold rounded-3xl hover:from-blue-600 hover:via-indigo-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl hover:shadow-3xl transform hover:-translate-y-2 hover:scale-110 disabled:transform-none border border-blue-400/20"
              style={{
                boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.4), 0 10px 10px -5px rgba(59, 130, 246, 0.04)'
              }}
            >
              <RefreshCw className={`w-6 h-6 mr-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filter Controls - Fixed */}
      <div className="flex-shrink-0 px-8 pb-8">
        <div className="bg-white border border-gray-200 rounded-3xl shadow-xl p-8" style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
          backdropFilter: 'blur(10px)'
        }}>
          {/* Search Bar */}
          <div className="flex items-center space-x-6 mb-8">
            <div className="flex-1 relative">
              <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6" />
              <input
                type="text"
                placeholder="Search projects by name, description, or technology..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-14 pr-14 py-5 border border-gray-300 rounded-3xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-gradient-to-r from-gray-50 to-gray-100 focus:bg-white text-lg font-semibold shadow-lg hover:shadow-xl"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-all duration-200 p-2 rounded-full hover:bg-gray-200"
                >
                  <X className="w-6 h-6" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center px-8 py-5 border rounded-3xl transition-all duration-300 font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${
                showFilters 
                  ? 'bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-blue-300 text-blue-700 shadow-xl' 
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 hover:border-gray-400'
              }`}
            >
              <Filter className="w-6 h-6 mr-3" />
              Filters
              {showFilters ? <ChevronUp className="w-6 h-6 ml-3" /> : <ChevronDown className="w-6 h-6 ml-3" />}
            </button>
            <div className="flex items-center space-x-1 bg-gradient-to-r from-gray-100 to-gray-200 rounded-3xl p-2 shadow-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-4 rounded-2xl transition-all duration-300 ${viewMode === 'grid' ? 'bg-white text-blue-700 shadow-xl transform scale-105' : 'text-gray-500 hover:text-gray-700 hover:bg-white hover:shadow-lg'}`}
                title="Grid view"
              >
                <Grid className="w-6 h-6" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-4 rounded-2xl transition-all duration-300 ${viewMode === 'list' ? 'bg-white text-blue-700 shadow-xl transform scale-105' : 'text-gray-500 hover:text-gray-700 hover:bg-white hover:shadow-lg'}`}
                title="List view"
              >
                <List className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pt-10 border-t border-gradient-to-r from-gray-200 to-gray-300">
              {/* Status Filter */}
              <div>
                <label className="block text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-900 bg-clip-text text-transparent mb-6">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-6 py-5 border border-gray-300 rounded-3xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-gradient-to-r from-white to-gray-50 hover:from-gray-50 hover:to-white text-gray-900 font-semibold shadow-lg hover:shadow-xl"
                >
                  <option value="all">All ({statusCounts.all})</option>
                  <option value="connected">Connected ({statusCounts.connected})</option>
                  <option value="syncing">Syncing ({statusCounts.syncing})</option>
                  <option value="disconnected">Disconnected ({statusCounts.disconnected})</option>
                  <option value="error">Error ({statusCounts.error})</option>
                </select>
              </div>

              {/* Technology Filter */}
              <div>
                <label className="block text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-900 bg-clip-text text-transparent mb-6">Technology</label>
                <select
                  value={technologyFilter}
                  onChange={(e) => setTechnologyFilter(e.target.value)}
                  className="w-full px-6 py-5 border border-gray-300 rounded-3xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-gradient-to-r from-white to-gray-50 hover:from-gray-50 hover:to-white text-gray-900 font-semibold shadow-lg hover:shadow-xl"
                >
                  <option value="all">All Technologies</option>
                  {availableTechnologies.map(tech => (
                    <option key={tech} value={tech}>{tech}</option>
                  ))}
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-900 bg-clip-text text-transparent mb-6">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-6 py-5 border border-gray-300 rounded-3xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-gradient-to-r from-white to-gray-50 hover:from-gray-50 hover:to-white text-gray-900 font-semibold shadow-lg hover:shadow-xl"
                >
                  <option value="name">Name</option>
                  <option value="lastSynced">Last Synced</option>
                  <option value="totalTables">Table Count</option>
                  <option value="totalRows">Row Count</option>
                </select>
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-900 bg-clip-text text-transparent mb-6">Order</label>
                <div className="flex space-x-4">
                  <button
                    onClick={() => setSortOrder('asc')}
                    className={`flex-1 inline-flex items-center justify-center px-6 py-5 border rounded-3xl transition-all duration-300 font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${
                      sortOrder === 'asc' 
                        ? 'bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-blue-300 text-blue-700 shadow-xl' 
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 hover:border-gray-400'
                    }`}
                  >
                    <SortAsc className="w-6 h-6 mr-3" />
                    Asc
                  </button>
                  <button
                    onClick={() => setSortOrder('desc')}
                    className={`flex-1 inline-flex items-center justify-center px-6 py-5 border rounded-3xl transition-all duration-300 font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${
                      sortOrder === 'desc' 
                        ? 'bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-blue-300 text-blue-700 shadow-xl' 
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 hover:border-gray-400'
                    }`}
                  >
                    <SortDesc className="w-6 h-6 mr-3" />
                    Desc
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Filter Summary */}
          {(searchQuery || statusFilter !== 'all' || technologyFilter !== 'all') && (
            <div className="flex items-center justify-between mt-10 pt-10 border-t border-gradient-to-r from-gray-200 to-gray-300">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 px-6 py-4 rounded-3xl border border-blue-200 shadow-lg">
                  <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full shadow-lg"></div>
                  <span className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-900 bg-clip-text text-transparent">
                    Showing {filteredAndSortedProjects.length} of {projects.length} projects
                  </span>
                </div>
                {(searchQuery || statusFilter !== 'all' || technologyFilter !== 'all') && (
                  <span className="text-sm text-gray-700 bg-gradient-to-r from-gray-100 to-gray-200 px-6 py-3 rounded-3xl font-semibold border border-gray-300 shadow-sm">
                    filtered by {[
                      searchQuery && 'search',
                      statusFilter !== 'all' && 'status',
                      technologyFilter !== 'all' && 'technology'
                    ].filter(Boolean).join(', ')}
                  </span>
                )}
              </div>
              <button
                onClick={clearFilters}
                className="text-lg font-bold text-blue-600 hover:text-blue-800 transition-all duration-300 px-8 py-4 rounded-3xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 border border-blue-200 hover:border-blue-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`mb-8 mx-8 p-6 rounded-2xl flex items-center space-x-4 shadow-lg border-2 ${
          notification.type === 'success' ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 border-green-200' :
          notification.type === 'error' ? 'bg-gradient-to-r from-red-50 to-rose-50 text-red-800 border-red-200' :
          notification.type === 'warning' ? 'bg-gradient-to-r from-yellow-50 to-amber-50 text-yellow-800 border-yellow-200' :
          'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-800 border-blue-200'
        }`}>
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm ${
            notification.type === 'success' ? 'bg-gradient-to-br from-green-100 to-green-200' :
            notification.type === 'error' ? 'bg-gradient-to-br from-red-100 to-red-200' :
            notification.type === 'warning' ? 'bg-gradient-to-br from-yellow-100 to-yellow-200' :
            'bg-gradient-to-br from-blue-100 to-blue-200'
          }`}>
            {notification.type === 'success' && <CheckCircle className="w-6 h-6 text-green-600" />}
            {notification.type === 'error' && <AlertTriangle className="w-6 h-6 text-red-600" />}
            {notification.type === 'warning' && <AlertTriangle className="w-6 h-6 text-yellow-600" />}
            {notification.type === 'info' && <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />}
          </div>
          <span className="flex-1 font-bold text-lg">{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-2 text-gray-400 hover:text-gray-600 transition-all duration-200 p-2 rounded-xl hover:bg-gray-100 shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Scrollable Projects Container */}
      <div className="flex-1 overflow-hidden px-8">
        <div className="h-full overflow-y-auto">
          {filteredAndSortedProjects.length > 0 ? (
            <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8' : 'space-y-6'}`}>
              {filteredAndSortedProjects.map((project) => (
                <div
                  key={project.id}
                  className={`bg-white rounded-3xl border border-gray-200 hover:shadow-2xl hover:border-gray-300 transition-all duration-500 transform hover:-translate-y-2 hover:scale-[1.02] backdrop-blur-sm ${
                    viewMode === 'list' ? 'flex' : ''
                  }`}
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.9) 100%)',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                  }}
                >
                  <div className={`${viewMode === 'list' ? 'flex-1 p-8' : 'p-8'}`}>
              {/* Header */}
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center">
                  <div className="text-5xl mr-6 p-2 bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl shadow-lg">
                    {project.icon}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                      {project.name}
                    </h3>
                    <div className="flex items-center gap-4">
                      <p className="text-lg font-semibold text-gray-600 px-3 py-1 bg-gray-100 rounded-lg">
                        {project.technology}
                      </p>
                      {getDatabaseType(project) && (
                        <div className="px-4 py-2 bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 text-white rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                          {getDatabaseType(project)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {/* Technology Icon */}
                  {project.technology?.toLowerCase().includes('node') && (
                    <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center shadow-sm">
                      <span className="text-sm font-bold text-green-600">JS</span>
                    </div>
                  )}
                  {project.technology?.toLowerCase().includes('django') && (
                    <div className="w-8 h-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center shadow-sm">
                      <Github className="w-5 h-5 text-gray-600" />
                    </div>
                  )}
                  {project.technology?.toLowerCase().includes('php') && (
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center shadow-sm">
                      <span className="text-lg">🐘</span>
                    </div>
                  )}

                  {/* Status */}
                  <div className={`flex items-center px-5 py-3 rounded-2xl text-sm font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 ${getStatusColor(project.status)}`}>
                    {getStatusIcon(project.status)}
                    <span className="ml-2">{getStatusText(project.status)}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-lg text-gray-600 mb-8 line-clamp-2 leading-relaxed">
                {project.description}
              </p>


              {/* Stats */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-4">
                  {(project.totalTables !== undefined || project.schema?.tables?.length) && (
                    <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 text-white px-4 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                      <Database className="w-4 h-4" />
                      <span className="text-sm font-bold">{project.totalTables || project.schema?.tables?.length || 0} tables</span>
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExportProject(project);
                    }}
                    className="p-3 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white rounded-xl hover:from-orange-600 hover:via-red-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                    title="Export database info"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                    </div>
                <div className="text-sm text-gray-500 font-medium">
                  Database Statistics
                </div>
              </div>

              {/* Additional Project Details */}
              {project.schema?.metadata && (
                <div className="mb-6 bg-gradient-to-r from-slate-50 via-gray-50 to-blue-50 rounded-xl border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gradient-to-r hover:from-slate-100 hover:to-blue-100 transition-all duration-300 rounded-xl"
                    onClick={() => toggleSection(`${project.id}-details`)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-gradient-to-br from-slate-500 via-gray-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-white text-sm font-bold">🔧</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-base font-bold text-gray-800">Project Details</span>
                        <span className="text-xs text-gray-600">Technical specifications and metadata</span>
                      </div>
                      <div className="flex space-x-2">
                        {project.schema.metadata.languages && project.schema.metadata.languages.length > 0 && (
                          <span className="px-3 py-1.5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full text-xs font-bold shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105">
                            {project.schema.metadata.languages[0].toUpperCase()}
                          </span>
                        )}
                        {project.hasForeignKeys && (
                          <span className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full text-xs font-bold shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105">
                            FK
                          </span>
                        )}
                        {project.hasIndexes && (
                          <span className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full text-xs font-bold shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105">
                            IDX
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-500 transition-all duration-300 ${
                      expandedSections.has(`${project.id}-details`) ? 'rotate-180 text-blue-600' : 'hover:text-blue-600'
                    }`} />
                  </div>
                  {expandedSections.has(`${project.id}-details`) && (
                    <div className="px-3 pb-3 border-t border-slate-200">
                      <div className="pt-3 grid grid-cols-2 gap-3">
                        {project.schema.metadata.languages && project.schema.metadata.languages.length > 0 && (
                          <div className="flex items-center space-x-2 p-2 bg-white rounded-lg border border-gray-100">
                            <div className="w-5 h-5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">💻</span>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-gray-600">Languages</span>
                              <div className="text-xs font-bold text-gray-800">{project.schema.metadata.languages.join(', ')}</div>
                            </div>
                          </div>
                        )}
                        {project.schema.metadata.sourceFiles && project.schema.metadata.sourceFiles.length > 0 && (
                          <div className="flex items-center space-x-2 p-2 bg-white rounded-lg border border-gray-100">
                            <div className="w-5 h-5 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">📁</span>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-gray-600">Files</span>
                              <div className="text-xs font-bold text-gray-800">{project.schema.metadata.sourceFiles.length}</div>
                            </div>
                          </div>
                        )}
                        {project.schema.metadata.extractionTime && (
                          <div className="flex items-center space-x-2 p-2 bg-white rounded-lg border border-gray-100">
                            <div className="w-5 h-5 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">⏱️</span>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-gray-600">Time</span>
                              <div className="text-xs font-bold text-gray-800">{project.schema.metadata.extractionTime}ms</div>
                            </div>
                          </div>
                        )}
                        {project.hasForeignKeys !== undefined && (
                          <div className="flex items-center space-x-2 p-2 bg-white rounded-lg border border-gray-100">
                            <div className="w-5 h-5 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">🔗</span>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-gray-600">Foreign Keys</span>
                              <div className={`px-1 py-0.5 rounded-full text-xs font-bold ${
                                project.hasForeignKeys 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {project.hasForeignKeys ? 'Yes' : 'No'}
                              </div>
                            </div>
                          </div>
                        )}
                        {project.hasIndexes !== undefined && (
                          <div className="flex items-center space-x-2 p-2 bg-white rounded-lg border border-gray-100">
                            <div className="w-5 h-5 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">📊</span>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-gray-600">Indexes</span>
                              <div className={`px-1 py-0.5 rounded-full text-xs font-bold ${
                                project.hasIndexes 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {project.hasIndexes ? 'Yes' : 'No'}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Schema/Tables Info */}
              {project.schema ? (
                <div className="mb-8 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-xl border border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gradient-to-r hover:from-blue-100 hover:to-purple-100 transition-all duration-300 rounded-xl"
                    onClick={() => toggleSection(`${project.id}-tables`)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                        <Database className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex flex-col">
                        <div className="text-base font-bold text-gray-800">Database Tables</div>
                        <div className="text-xs text-gray-600">{(project.totalTables || project.schema?.tables?.length || 0)} tables detected</div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <ChevronDown className={`w-5 h-5 text-gray-500 transition-all duration-300 ${
                        expandedSections.has(`${project.id}-tables`) ? 'rotate-180 text-blue-600' : 'hover:text-blue-600'
                      }`} />
                    </div>
                  </div>
                  {expandedSections.has(`${project.id}-tables`) && (
                    <div className="px-3 pb-3 border-t border-blue-100">
                      <div className="pt-3 space-y-2">
                    {((project.actualDatabaseTables && project.actualDatabaseTables.length > 0 ? project.actualDatabaseTables : project.schema?.tables) || []).slice(0, 3).map((table: any, index: number) => {
                      const tableKey = `${project.id}-${table.name}`;
                      const isExpanded = expandedTableDetails.has(tableKey);
                      
                      return (
                        <div key={`${project.id}-table-${table.name}-${index}`} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                          <div className="flex items-center justify-between p-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 cursor-pointer" onClick={() => toggleTableDetails(tableKey)}>
                            <div className="flex items-center space-x-3">
                              <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center">
                                <Database className="w-3 h-3 text-white" />
                              </div>
                              <div>
                                <span className="font-bold text-gray-800 text-xs">{table.name}</span>
                                <div className="flex items-center space-x-1 mt-0.5">
                                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                    {table.rowCount || 0} rows
                                  </span>
                                  {table.columns && (
                                    <span className="px-1.5 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                      {table.columns.length} cols
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                          </div>
                          
                          {/* Collapsible table details */}
                          {isExpanded && (
                            <div className="px-3 pb-3 border-t border-gray-200 bg-white">
                              <div className="pt-3 space-y-2">
                                {/* Columns */}
                                {table.columns && table.columns.length > 0 && (
                                  <div>
                                    <div className="text-xs font-semibold text-gray-700 mb-2">Columns ({table.columns.length}):</div>
                                    <div className="grid grid-cols-1 gap-1">
                                      {table.columns.map((column: any, colIndex: number) => (
                                        <div key={colIndex} className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1">
                                          <span className="font-medium text-gray-800">{column.name}</span>
                                          <span className="text-gray-500">{column.type || 'TEXT'}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Sample rows */}
                                {table.data && table.data.length > 0 && (
                                  <div>
                                    <div className="text-xs font-semibold text-gray-700 mb-2">Sample Data ({table.data.length} rows):</div>
                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                      {table.data.slice(0, 5).map((row: any, rowIndex: number) => (
                                        <div key={rowIndex} className="text-xs bg-gray-50 rounded px-2 py-1">
                                          <div className="flex flex-wrap gap-1">
                                            {Object.entries(row).slice(0, 3).map(([key, value]) => (
                                              <span key={key} className="text-gray-600">
                                                <span className="font-medium">{key}:</span> {String(value)}
                                              </span>
                                            ))}
                                            {Object.keys(row).length > 3 && (
                                              <span className="text-gray-400">+{Object.keys(row).length - 3} more</span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                      {table.data.length > 5 && (
                                        <div className="text-xs text-gray-400 text-center py-1">
                                          +{table.data.length - 5} more rows
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Table info */}
                                <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                                  <div className="flex justify-between">
                                    <span>Total Rows: {table.rowCount || 0}</span>
                                    <span>Total Columns: {table.columns?.length || 0}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Additional tables (hidden by default) */}
                    {expandedTables.has(project.id) && ((project.actualDatabaseTables && project.actualDatabaseTables.length > 0 ? project.actualDatabaseTables : project.schema?.tables) || []).slice(3).map((table: any, index: number) => {
                      const tableKey = `${project.id}-${table.name}`;
                      const isExpanded = expandedTableDetails.has(tableKey);
                      
                      return (
                        <div key={`${project.id}-table-${table.name}-${index + 3}`} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                          <div className="flex items-center justify-between p-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 cursor-pointer" onClick={() => toggleTableDetails(tableKey)}>
                            <div className="flex items-center space-x-3">
                              <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center">
                                <Database className="w-3 h-3 text-white" />
                              </div>
                              <div>
                                <span className="font-bold text-gray-800 text-xs">{table.name}</span>
                                <div className="flex items-center space-x-1 mt-0.5">
                                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                    {table.rowCount || 0} rows
                                  </span>
                                  {table.columns && (
                                    <span className="px-1.5 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                      {table.columns.length} cols
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                          </div>
                          
                          {/* Collapsible table details */}
                          {isExpanded && (
                            <div className="px-3 pb-3 border-t border-gray-200 bg-white">
                              <div className="pt-3 space-y-2">
                                {/* Columns */}
                                {table.columns && table.columns.length > 0 && (
                                  <div>
                                    <div className="text-xs font-semibold text-gray-700 mb-2">Columns ({table.columns.length}):</div>
                                    <div className="grid grid-cols-1 gap-1">
                                      {table.columns.map((column: any, colIndex: number) => (
                                        <div key={colIndex} className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1">
                                          <span className="font-medium text-gray-800">{column.name}</span>
                                          <span className="text-gray-500">{column.type || 'TEXT'}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Sample rows */}
                                {table.data && table.data.length > 0 && (
                                  <div>
                                    <div className="text-xs font-semibold text-gray-700 mb-2">Sample Data ({table.data.length} rows):</div>
                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                      {table.data.slice(0, 5).map((row: any, rowIndex: number) => (
                                        <div key={rowIndex} className="text-xs bg-gray-50 rounded px-2 py-1">
                                          <div className="flex flex-wrap gap-1">
                                            {Object.entries(row).slice(0, 3).map(([key, value]) => (
                                              <span key={key} className="text-gray-600">
                                                <span className="font-medium">{key}:</span> {String(value)}
                                              </span>
                                            ))}
                                            {Object.keys(row).length > 3 && (
                                              <span className="text-gray-400">+{Object.keys(row).length - 3} more</span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                      {table.data.length > 5 && (
                                        <div className="text-xs text-gray-400 text-center py-1">
                                          +{table.data.length - 5} more rows
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Table info */}
                                <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                                  <div className="flex justify-between">
                                    <span>Total Rows: {table.rowCount || 0}</span>
                                    <span>Total Columns: {table.columns?.length || 0}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {(project.schema?.tables?.length || 0) > 3 && (
                      <button
                        onClick={() => toggleTableExpansion(project.id)}
                        className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 text-xs font-bold transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        {expandedTables.has(project.id) 
                          ? `- Hide ${(project.schema?.tables?.length || 0) - 3} more tables`
                          : `+ Show ${(project.schema?.tables?.length || 0) - 3} more tables`
                        }
                      </button>
                    )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mb-4">
                  <div className="text-xs text-gray-500 mb-2">Databases:</div>
                  <div className="space-y-1">
                    {(project.databases || []).slice(0, 2).map((db, index) => (
                      <div key={`${project.id}-db-${db.id || db.name || index}`} className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 rounded p-2">
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
                    {(project.databases?.length || 0) > 2 && (
                      <div className="text-xs text-gray-400 text-center py-1">
                        +{(project.databases?.length || 0) - 2} more databases
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Verification Dashboard */}
              {project.databases && project.databases.length > 0 && project.databases[0] && (
                <VerificationDashboard
                  verification={project.databases[0].verification}
                  databaseIntrospection={project.databases[0].databaseIntrospection}
                  schemaObjects={project.databases[0].schemaObjects}
                  columns={project.databases[0].columns}
                  constraints={project.databases[0].constraints}
                  statistics={project.databases[0].statistics}
                  functions={project.databases[0].functions}
                  security={project.databases[0].security}
                  runtimeState={project.databases[0].runtimeState}
                  engineFeatures={project.databases[0].engineFeatures}
                  verificationStatus={project.databases[0].verificationStatus}
                />
              )}

              {/* Framework Information */}
              {project.schema?.metadata?.frameworks && project.schema.metadata.frameworks.length > 0 && (
                <div className="mb-6 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-xl border border-indigo-200 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gradient-to-r hover:from-indigo-100 hover:to-purple-100 transition-all duration-300 rounded-xl"
                    onClick={() => toggleSection(`${project.id}-frameworks`)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-white text-sm font-bold">⚡</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-base font-bold text-gray-800">Framework Detection</span>
                        <span className="text-xs text-gray-600">Detected frameworks and technologies</span>
                      </div>
                      <div className="flex space-x-2">
                        {project.schema.metadata.frameworks.slice(0, 2).map((framework: string, index: number) => (
                          <span
                            key={index}
                            className="px-3 py-1.5 bg-gradient-to-r from-purple-500 via-indigo-600 to-blue-600 text-white rounded-full text-xs font-bold shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                          >
                            {framework.toUpperCase()}
                          </span>
                        ))}
                        {project.schema.metadata.frameworks.length > 2 && (
                          <span className="px-3 py-1.5 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-full text-xs font-bold shadow-md">
                            +{project.schema.metadata.frameworks.length - 2}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-500 transition-all duration-300 ${
                      expandedSections.has(`${project.id}-frameworks`) ? 'rotate-180 text-indigo-600' : 'hover:text-indigo-600'
                    }`} />
                  </div>
                  {expandedSections.has(`${project.id}-frameworks`) && (
                    <div className="px-3 pb-3 border-t border-indigo-100">
                      <div className="pt-3 space-y-3">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium text-gray-700">Detected:</span>
                          <div className="flex flex-wrap gap-2">
                            {project.schema.metadata.frameworks.map((framework: string, index: number) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-full text-xs font-bold"
                              >
                                {framework.toUpperCase()}
                              </span>
                            ))}
                          </div>
                        </div>
                        {project.schema.metadata.confidence && (
                          <div className="flex items-center space-x-3">
                            <span className="text-sm font-medium text-gray-700">Confidence:</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    project.schema.metadata.confidence >= 80 
                                      ? 'bg-gradient-to-r from-green-400 to-green-600' 
                                      : project.schema.metadata.confidence >= 60 
                                      ? 'bg-gradient-to-r from-yellow-400 to-orange-500' 
                                      : 'bg-gradient-to-r from-red-400 to-red-600'
                                  }`}
                                  style={{ width: `${project.schema.metadata.confidence}%` }}
                                ></div>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                project.schema.metadata.confidence >= 80 
                                  ? 'bg-green-100 text-green-800' 
                                  : project.schema.metadata.confidence >= 60 
                                  ? 'bg-yellow-100 text-yellow-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {project.schema.metadata.confidence}%
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

                    {/* Actions */}
                    <div className={`flex items-center ${viewMode === 'list' ? 'justify-end' : 'justify-between'} pt-8 border-t border-gradient-to-r from-gray-200 to-gray-300`}>
                      <div className="flex space-x-4">
                        <button
                          onClick={() => handleOpenProject(project.id)}
                          className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-orange-500 via-orange-600 to-red-500 text-white text-sm font-bold rounded-2xl hover:from-orange-600 hover:via-orange-700 hover:to-red-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl transform hover:-translate-y-1 hover:scale-105 disabled:transform-none"
                          disabled={syncingProject === project.id}
                          title={project.status === 'connected' ? 'Open project in query editor' : 'Project not connected - sync first'}
                        >
                          <span className="mr-2">🚀</span>
                          Open
                        </button>
                        <button
                          onClick={() => {
                            console.log('🔄 Sync button clicked!', {
                              projectId: project.id,
                              syncingProject,
                              isDisabled: syncingProject === project.id
                            });
                            handleSync(project.id);
                          }}
                          disabled={syncingProject === project.id}
                          className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 text-white text-sm font-bold rounded-2xl hover:from-blue-600 hover:via-indigo-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl transform hover:-translate-y-1 hover:scale-105 disabled:transform-none"
                          title={syncingProject === project.id ? 'Syncing...' : 'Sync project databases'}
                        >
                          <RefreshCw className={`w-5 h-5 mr-2 ${syncingProject === project.id ? 'animate-spin' : ''}`} />
                          {syncingProject === project.id ? 'Syncing' : 'Sync'}
                        </button>
                        <button
                          onClick={() => handleDeleteProject(project.id)}
                          className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-red-500 via-red-600 to-pink-500 text-white text-sm font-bold rounded-2xl hover:from-red-600 hover:via-red-700 hover:to-pink-600 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 hover:scale-105"
                          title="Delete project"
                        >
                          <Trash2 className="w-5 h-5 mr-2" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="text-center py-24">
              <div className="w-32 h-32 bg-gradient-to-br from-gray-100 via-blue-50 to-purple-50 rounded-3xl flex items-center justify-center mx-auto mb-10 shadow-2xl border border-gray-200">
                <FolderOpen className="w-16 h-16 text-gray-500" />
              </div>
              <h3 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-6">
                {projects.length === 0 ? 'No projects found' : 'No projects match your filters'}
              </h3>
              <p className="text-2xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
                {projects.length === 0 
                  ? 'Get started by creating your first project.' 
                  : 'Try adjusting your search or filter criteria.'
                }
              </p>
              {projects.length > 0 && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center px-10 py-5 bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 text-white text-xl font-bold rounded-3xl hover:from-blue-600 hover:via-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 hover:scale-105"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Current Project Info - Fixed at bottom */}
      {projectsManager.getCurrentProject() && (
        <div className="flex-shrink-0 px-8 pb-8">
          <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl shadow-lg">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center shadow-sm">
                <Server className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-blue-900 mb-2">
                  Currently Active: {projectsManager.getCurrentProject()?.name}
                </h4>
                <p className="text-lg text-blue-700 leading-relaxed font-medium">
                  All database operations are now using this project's embedded databases.
                </p>
              </div>
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
          projectData={projects.find(p => p.id === queryEditorConnection.projectId)}
        />
      )}

      {/* Project Uploader Modal */}
      {showProjectUploader && (
        <ProjectUploader
          onProjectDetected={async (result) => {
            console.log('🎉 Project detected callback received:', result);
            console.log('🎉 Project data:', result.projectData);
            console.log('🎉 Project ID:', result.projectId);
            try {
              // Add a small delay to ensure the project is saved
              console.log('⏳ Waiting 1 second for project to be saved...');
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              // Reload projects to show the new uploaded project
              console.log('🔄 Reloading projects...');
              await loadProjects(true);
              console.log('✅ Projects reloaded successfully');
              console.log('📊 Current projects count:', projects.length);
              
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
