'use client';

// Main page component for QueryFlow
// This component integrates all the core functionality and manages application state

import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { SchemaDesigner } from '@/components/SchemaDesigner';
import { QueryRunner } from '@/components/QueryRunner';
import { ResultsViewer } from '@/components/ResultsViewer';
import { DataEditor } from '@/components/DataEditor';
import { Analytics } from '@/components/Analytics';
import { WorkflowManager } from '@/components/WorkflowManager';
import { AdvancedSearch } from '@/components/AdvancedSearch';
import { ExportImportManager } from '@/components/ExportImportManager';
import { DataValidationManager } from '@/components/DataValidationManager';
import { QueryOptimizationManager } from '@/components/QueryOptimizationManager';
import { CloudStorageManager } from '@/components/CloudStorageManager';
import { CollaborationManager } from '@/components/CollaborationManager';
import { ProjectBrowser } from '@/components/ProjectBrowser';
import { ProjectUploader } from '@/components/ProjectUploader';
import { GitHubConnector } from '@/components/GitHubConnector';
import { DatabaseSchema, QueryResult, QueryError, DatabaseRecord } from '@/types/database';
import { Database, RefreshCw } from 'lucide-react';
import { ProjectDetectionResult } from '@/types/project';
import { Project } from '@/types/project';
import { StorageManager } from '@/utils/storage';
import { ProjectService } from '@/services/projectService';
import { DatabaseConnector } from '@/utils/databaseConnector';
import { Projects } from '@/components/Projects';
import { dbConnectionManager } from '@/utils/databaseConnection';
import { projectsManager } from '@/utils/projectsManager';
import { useDatabase } from '@/contexts/DatabaseContext';

export default function HomePage() {
  const { activeConnection, connectDatabase, executeQuery, isConnected } = useDatabase();
  const [activeTab, setActiveTab] = useState('designer');
  const [schema, setSchema] = useState<DatabaseSchema | null>(null);
  const [records, setRecords] = useState<DatabaseRecord[]>([]);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryError, setQueryError] = useState<QueryError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Project management state
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [showProjectUploader, setShowProjectUploader] = useState(false);
  const [showGitHubConnector, setShowGitHubConnector] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentDatabase, setCurrentDatabase] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Mock current user for collaboration
  const [currentUser] = useState({
    id: 'user_1',
    name: 'Demo User',
    email: 'demo@queryflow.dev',
    role: {
      id: 'editor',
      name: 'Editor',
      description: 'Can edit schemas and data',
      level: 2,
      permissions: ['read', 'write', 'comment'],
      isSystem: true,
      color: '#10B981'
    },
    status: 'online' as const,
    lastSeen: new Date(),
    permissions: [],
    preferences: {
      theme: 'light' as const,
      language: 'en',
      timezone: 'UTC',
      notifications: {
        email: true,
        browser: true,
        desktop: false,
        mobile: false,
        frequency: 'immediate' as const,
        types: []
      },
      collaboration: {
        showCursors: true,
        showPresence: true,
        showComments: true,
        autoSave: true,
        conflictResolution: 'manual' as const
      },
      privacy: {
        sharePresence: true,
        shareActivity: true,
        allowMentions: true,
        allowDirectMessages: true
      }
    },
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Load schema and records from localStorage on component mount
  useEffect(() => {
    const savedSchema = StorageManager.loadSchema();
    if (savedSchema) {
      setSchema(savedSchema);
    } else {
      // Create a default schema if none exists
      const defaultSchema: DatabaseSchema = {
        id: 'default_schema',
        name: 'My Database',
        tables: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };
      setSchema(defaultSchema);
    }

    // Load records
    const savedRecords = StorageManager.loadRecords();
    setRecords(savedRecords);

    // Load projects
    loadProjects();
  }, []);

  // Load projects from projectsManager (which uses the projects.ts types)
  const loadProjects = async () => {
    try {
      const loadedProjects = await projectsManager.getAllProjects();
      setProjects(loadedProjects);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  // Listen for project sync events to keep currentProject state in sync
  useEffect(() => {
    const handleProjectSyncComplete = (data: any) => {
      console.log('Page component: Project synced:', data.project.name);
      setCurrentProject(data.project);
      // Set first available database for sync operations
      if (data.project.databases.length > 0) {
        setCurrentDatabase(data.project.databases[0]);
      }
    };

    const handleProjectDisconnected = () => {
      console.log('Page component: Project disconnected');
      setCurrentProject(null);
      setCurrentDatabase(null);
    };

    projectsManager.addEventListener('project_sync_complete', handleProjectSyncComplete);
    projectsManager.addEventListener('project_disconnected', handleProjectDisconnected);

    // Check for existing current project on mount
    const existingProject = projectsManager.getCurrentProject();
    if (existingProject) {
      setCurrentProject(existingProject);
      if (existingProject.databases.length > 0) {
        setCurrentDatabase(existingProject.databases[0]);
      }
    }

    return () => {
      projectsManager.removeEventListener('project_sync_complete', handleProjectSyncComplete);
      projectsManager.removeEventListener('project_disconnected', handleProjectDisconnected);
    };
  }, []);

  // Save schema to localStorage whenever it changes
  useEffect(() => {
    if (schema) {
      StorageManager.saveSchema(schema);
    }
  }, [schema]);

  // Save records to localStorage whenever they change
  useEffect(() => {
    StorageManager.saveRecords(records);
  }, [records]);

  // Handle schema changes
  const handleSchemaChange = useCallback(async (newSchema: DatabaseSchema) => {
    console.log('Schema changed, updating local state and project...');
    setSchema(newSchema);
    
    // Sync with current project if available
    if (currentProject) {
      try {
        setIsSyncing(true);
        console.log('Syncing schema changes with project:', currentProject.name);
        
        // Update the project with the new schema
        const updatedProject = {
          ...currentProject,
          schema: newSchema,
          tables: newSchema.tables || [],
          totalTables: newSchema.tables?.length || 0,
          totalColumns: newSchema.tables?.reduce((sum, table) => sum + (table.columns?.length || 0), 0) || 0,
          updatedAt: new Date()
        };
        
        // Update the project in the projects manager
        try {
          await projectsManager.updateProject(currentProject.id, updatedProject);
        } catch (error) {
          console.error('Failed to update project via projectsManager, trying direct save:', error);
          // Fallback: try to save directly via dbConnectionManager
          try {
            await dbConnectionManager.initializeAppData();
            await dbConnectionManager.saveProject(updatedProject);
            console.log('✅ Project saved directly via dbConnectionManager');
          } catch (directSaveError) {
            console.error('❌ Direct save also failed:', directSaveError);
            // Last resort: save to localStorage
            const projects = JSON.parse(localStorage.getItem('queryflow_projects') || '{}');
            projects[updatedProject.id] = updatedProject;
            localStorage.setItem('queryflow_projects', JSON.stringify(projects));
            console.log('✅ Project saved to localStorage as fallback');
          }
        }
        
        // Update local state
        setCurrentProject(updatedProject);
        
        console.log('✅ Project schema synced successfully');
      } catch (error) {
        console.error('❌ Failed to sync schema changes with project:', error);
      } finally {
        setIsSyncing(false);
      }
    } else {
      console.log('No current project to sync with');
    }
  }, [currentProject]);

  // Handle records changes
  const handleRecordsChange = useCallback((newRecords: DatabaseRecord[]) => {
    setRecords(newRecords);
  }, []);

  // Handle query results
  const handleQueryResult = useCallback((result: QueryResult | null, error: QueryError | null) => {
    setQueryResult(result);
    setQueryError(error);
    setIsLoading(false);
  }, []);

  // Execute query on connected database
  const executeDatabaseQuery = useCallback(async (sql: string): Promise<QueryResult> => {
    if (!isConnected) {
      throw new Error('No database connected. Please connect to a database first.');
    }

    try {
      const result = await executeQuery(sql);
      return result;
    } catch (error: any) {
      console.error('Database query execution failed:', error);
      throw error;
    }
  }, [isConnected, executeQuery]);

  // Handle query execution start
  const handleQueryStart = useCallback(() => {
    setIsLoading(true);
    setQueryResult(null);
    setQueryError(null);
  }, []);

  // Load schema from connected database
  useEffect(() => {
    try {
      if (activeConnection?.schema) {
        console.log('Loading schema from connected database:', activeConnection.schema.tables?.length || 0, 'tables');
        setSchema(activeConnection.schema);
      } else if (!isConnected) {
        // Load from localStorage only if no database is connected
        const savedSchema = StorageManager.loadSchema();
        if (savedSchema) {
          setSchema(savedSchema);
        } else {
          // Create a default schema if none exists
          const defaultSchema: DatabaseSchema = {
            id: 'default_schema',
            name: 'My Database',
            tables: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            version: 1,
          };
          setSchema(defaultSchema);
        }
      }
    } catch (error) {
      console.error('Error loading schema:', error);
      // Fallback to default schema
      const defaultSchema: DatabaseSchema = {
        id: 'default_schema',
        name: 'My Database',
        tables: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };
      setSchema(defaultSchema);
    }
  }, [activeConnection, isConnected]);


  const handleProjectSelect = useCallback(async (project: Project) => {
    setCurrentProject(project);
    // Set first available database for sync operations
    if (project.databases.length > 0) {
      setCurrentDatabase(project.databases[0]);

      // Try to connect to database and load schema
      const database = project.databases[0];
      try {
        // Convert connectionString to DatabaseConfig format
        const config: any = {
          connectionString: database.connectionString,
          filePath: database.type === 'sqlite' ? database.connectionString : undefined
        };

        // Test connection first
        const connectionResult = await DatabaseConnector.testConnection(database.type, config);

        // Update database status in project
        const updatedProject = {
          ...project,
          databases: project.databases.map(db =>
            db.id === database.id
              ? { ...db, status: connectionResult.success ? 'connected' as const : 'error' as const }
              : db
          )
        };

        // Update project in state
        setCurrentProject(updatedProject);
        setProjects(prev => prev.map(p => p.id === project.id ? updatedProject : p));

        if (connectionResult.success) {
          // Load schema if connection successful
          setIsLoading(true);
          const introspectedSchema = await DatabaseConnector.introspectSchema(database.type, config);

          // Create a proper DatabaseSchema object
          const schema: DatabaseSchema = {
            id: `schema_${database.id}_${Date.now()}`,
            name: `${database.name} Schema`,
            tables: introspectedSchema.tables.map((table, index) => ({
              id: `table_${index}`,
              name: table.name,
              columns: table.columns.map((col, colIndex) => ({
                id: `col_${colIndex}`,
                name: col.name,
                type: col.type as any,
                nullable: col.nullable,
                primaryKey: col.primaryKey || false,
                defaultValue: col.defaultValue,
                unique: col.unique,
                autoIncrement: col.autoIncrement
              })),
              position: { x: index * 200, y: index * 100 }, // Default positions
              indexes: (table.indexes || []).map((idx, idxIndex) => ({
                id: `idx_${idxIndex}`,
                name: idx.name,
                columns: idx.columns,
                unique: idx.unique,
                type: idx.type as any
              })),
              createdAt: new Date(),
              updatedAt: new Date()
            })),
            createdAt: new Date(),
            updatedAt: new Date(),
            version: 1
          };

          setSchema(schema);
          console.log('Loaded schema for database:', database.name, schema);
        } else {
          console.error('Failed to connect to database:', connectionResult.error);
        }
      } catch (error) {
        console.error('Failed to test database connection:', error);

        // Mark database as error
        const updatedProject = {
          ...project,
          databases: project.databases.map(db =>
            db.id === database.id
              ? { ...db, status: 'error' as const }
              : db
          )
        };
        setCurrentProject(updatedProject);
        setProjects(prev => prev.map(p => p.id === project.id ? updatedProject : p));
      } finally {
        setIsLoading(false);
      }
    } else {
      // No databases in project, load schema from project if available
      if (project.schema && project.schema.tables) {
        console.log('Loading schema from project:', project.name, project.schema.tables.length, 'tables');
        setSchema(project.schema);
      } else {
        console.log('No schema available in project, creating default schema');
        const defaultSchema: DatabaseSchema = {
          id: `schema_${project.id}_${Date.now()}`,
          name: `${project.name} Schema`,
          tables: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        };
        setSchema(defaultSchema);
      }
    }

    setActiveTab('designer');
    console.log('Selected project:', project.name);
  }, []);

  const handleAddProject = useCallback(() => {
    setShowProjectUploader(true);
  }, []);

  const handleGitHubProject = useCallback(() => {
    setShowGitHubConnector(true);
  }, []);

  const handleSyncProject = useCallback(async (project: Project) => {
    setCurrentProject(project);
    if (project.databases.length > 0) {
      setCurrentDatabase(project.databases[0]);
    }
    setActiveTab('sync');
    console.log('Starting sync for project:', project.name);
  }, []);

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'projects':
        return <Projects />;
      case 'designer':
        return (
          <SchemaDesigner
            schema={schema}
            onSchemaChange={handleSchemaChange}
          />
        );
      case 'query':
        return (
          <div className="flex h-full">
            <div className="flex-1">
              <QueryRunner
                schema={schema}
                onQueryResult={handleQueryResult}
                executeQuery={isConnected ? executeDatabaseQuery : undefined}
              />
            </div>
            <div className="w-1/2 border-l border-gray-700">
              <ResultsViewer
                result={queryResult}
                error={queryError}
                isLoading={isLoading}
              />
            </div>
          </div>
        );
      case 'data':
        return (
          <DataEditor schema={schema} />
        );
      case 'export':
        return (
          <ExportImportManager
            schema={schema}
            records={records}
            onSchemaChange={handleSchemaChange}
            onRecordsChange={handleRecordsChange}
          />
        );
      case 'validation':
        return (
          <DataValidationManager />
        );
      case 'optimization':
        return (
          <QueryOptimizationManager />
        );
      case 'cloud':
        return (
          <CloudStorageManager />
        );
      case 'collaboration':
        return (
          <CollaborationManager
            schema={schema}
            workspaceId="default"
            currentUser={currentUser}
            onSchemaChange={handleSchemaChange}
          />
        );
      case 'analytics':
        return (
          <Analytics />
        );
      case 'workflow':
        return (
          <WorkflowManager schema={schema} />
        );
      case 'search':
        return (
          <AdvancedSearch schema={schema} />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Layout activeTab={activeTab} onTabChange={setActiveTab} isSyncing={isSyncing}>
        {renderContent()}
      </Layout>

      {/* Project Uploader Modal */}
      {showProjectUploader && (
        <ProjectUploader
          onClose={() => setShowProjectUploader(false)}
        />
      )}

      {/* GitHub Connector Modal */}
      {showGitHubConnector && (
        <GitHubConnector
          onRepositorySelected={async (repository) => {
            // Handle GitHub repository selection
            console.log('GitHub repository selected:', repository);
            setShowGitHubConnector(false);
          }}
          onClose={() => setShowGitHubConnector(false)}
        />
      )}
    </>
  );
}