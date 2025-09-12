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
import { DatabaseLinker } from '@/components/DatabaseLinker';
import { SyncManager } from '@/components/SyncManager';
import { DatabaseSchema, QueryResult, QueryError, DatabaseRecord } from '@/types/database';
import { Database, RefreshCw } from 'lucide-react';
import { Project, ProjectDetectionResult } from '@/types/project';
import { StorageManager } from '@/utils/storage';
import { ProjectService } from '@/services/projectService';
import { DatabaseConnector } from '@/utils/databaseConnector';
import { Projects } from '@/components/Projects';
import { projectsManager } from '@/utils/projectsManager';

export default function HomePage() {
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

  // Load projects from service
  const loadProjects = async () => {
    try {
      const loadedProjects = await ProjectService.getProjects();
      setProjects(loadedProjects);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

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
  const handleSchemaChange = useCallback((newSchema: DatabaseSchema) => {
    setSchema(newSchema);
  }, []);

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

  // Handle query execution start
  const handleQueryStart = useCallback(() => {
    setIsLoading(true);
    setQueryResult(null);
    setQueryError(null);
  }, []);

  // Project management handlers
  const handleProjectDetected = useCallback(async (result: ProjectDetectionResult) => {
    // Create project from detection result
    const project = await ProjectService.createProject(result, {
      name: result.projectType,
      type: 'local',
      path: '/detected/project/path' // This would come from the file upload
    });

    setProjects(prev => [...prev, project]);
    setCurrentProject(project);
    setActiveTab('designer'); // Switch to designer to show the linked database
  }, []);

  const handleProjectSelect = useCallback(async (project: Project) => {
    setCurrentProject(project);
    // Set first available database for sync operations
    if (project.databases.length > 0) {
      setCurrentDatabase(project.databases[0]);

      // Try to connect to database and load schema
      const database = project.databases[0];
      try {
        // Test connection first
        const connectionResult = await DatabaseConnector.testConnection(database.type, database.config);

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
          const introspectedSchema = await DatabaseConnector.introspectSchema(database.type, database.config);

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
            version: typeof introspectedSchema.version === 'number' ? introspectedSchema.version : 1
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
      case 'databases':
        return currentProject ? (
          <DatabaseLinker
            projectId={currentProject.id}
            databases={currentProject.databases}
            onDatabasesChange={async (databases) => {
              if (currentProject) {
                const updatedProject = { ...currentProject, databases };
                setCurrentProject(updatedProject);

                // Update in projects list
                setProjects(prev => prev.map(p =>
                  p.id === currentProject.id ? updatedProject : p
                ));

                // Persist to storage
                await ProjectService.updateProject(currentProject.id, updatedProject);
              }
            }}
            onSchemaLoaded={(databaseId, schema) => {
              console.log('Schema loaded for database:', databaseId, schema);
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Database className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Project Selected
              </h3>
              <p className="text-gray-600 mb-6">
                Select a project from the Projects tab to manage databases
              </p>
              <button
                onClick={() => setActiveTab('projects')}
                className="inline-flex items-center px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Go to Projects
              </button>
            </div>
          </div>
        );
      case 'sync':
        return currentProject && currentDatabase ? (
          <SyncManager
            project={currentProject}
            database={currentDatabase}
            onSyncComplete={(session) => {
              console.log('Sync completed:', session);
            }}
            onConflictResolved={(conflictId, resolution) => {
              console.log('Conflict resolved:', conflictId, resolution);
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <RefreshCw className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Database Selected
              </h3>
              <p className="text-gray-600 mb-6">
                Select a project and database to manage synchronization
              </p>
              <div className="space-x-4">
                <button
                  onClick={() => setActiveTab('projects')}
                  className="inline-flex items-center px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Select Project
                </button>
                <button
                  onClick={() => setActiveTab('databases')}
                  className="inline-flex items-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Manage Databases
                </button>
              </div>
            </div>
          </div>
        );
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
          <DataValidationManager
            schema={schema}
            records={records}
            onSchemaChange={handleSchemaChange}
          />
        );
      case 'optimization':
        return (
          <QueryOptimizationManager
            schema={schema}
            onSchemaChange={handleSchemaChange}
          />
        );
      case 'cloud':
        return (
          <CloudStorageManager
            schema={schema}
            onSchemaChange={handleSchemaChange}
          />
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
          <Analytics schema={schema} />
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
      <Layout activeTab={activeTab} onTabChange={setActiveTab}>
        {renderContent()}
      </Layout>

      {/* Project Uploader Modal */}
      {showProjectUploader && (
        <ProjectUploader
          onProjectDetected={handleProjectDetected}
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