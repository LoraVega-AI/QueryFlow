// Global project data hook for accessing current project context
// Provides unified access to project database, schema, and metadata

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Project, DatabaseSchema, Database as ProjectDatabase, Table, Column } from '@/types/project';
import { DatabaseSchema as FullDatabaseSchema, Table as FullTable, Column as FullColumn, DataType } from '@/types/database';
import { projectsManager } from '@/utils/projectsManager';
import { useDatabase } from '@/contexts/DatabaseContext';

interface UseProjectDataReturn {
  // Project state
  currentProject: Project | null;
  projectSchema: FullDatabaseSchema | null;
  projectDatabases: ProjectDatabase[];

  // Loading and error states
  isLoading: boolean;
  error: string | null;

  // Project operations
  selectProject: (project: Project) => Promise<void>;
  refreshProject: () => Promise<void>;
  executeProjectQuery: (sql: string, params?: any[]) => Promise<any>;

  // Metadata
  tableCount: number;
  recordCount: number;
  lastUpdated: Date | null;

  // Utility functions
  hasProject: boolean;
  getTableNames: () => string[];
  getColumnNames: (tableName: string) => string[];
  isTableExists: (tableName: string) => boolean;
  getTableData: (tableName: string, limit?: number) => Promise<any[]>;
}

export function useProjectData(): UseProjectDataReturn {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projectSchema, setProjectSchema] = useState<FullDatabaseSchema | null>(null);
  const [projectDatabases, setProjectDatabases] = useState<ProjectDatabase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Get database context for uploaded databases
  const { activeConnection, getConnectionInfo } = useDatabase();

  // Convert project table to full database table
  const convertTable = useCallback((projectTable: Table, index: number = 0): FullTable => {
    return {
      id: projectTable.id || `table_${projectTable.name}_${index}`,
      name: projectTable.name,
      columns: projectTable.columns?.map((col: Column, colIndex: number) => ({
        id: col.id || `col_${col.name}_${colIndex}`,
        name: col.name,
        type: col.type as DataType,
        nullable: col.nullable,
        primaryKey: col.primaryKey || false,
        defaultValue: col.defaultValue,
        unique: col.unique || false,
        autoIncrement: col.autoIncrement || false,
        foreignKey: col.foreignKey ? {
          tableId: col.foreignKey.tableId,
          columnId: col.foreignKey.columnId,
          relationshipType: col.foreignKey.relationshipType || 'one-to-many',
          cascadeDelete: col.foreignKey.cascadeDelete || false,
          cascadeUpdate: col.foreignKey.cascadeUpdate || false
        } : undefined,
        indexed: false,
        constraints: {}
      })) || [],
      position: projectTable.position || { x: index * 200, y: index * 100 },
      documentation: undefined,
      tags: [],
      createdAt: projectTable.createdAt || new Date(),
      updatedAt: projectTable.updatedAt || new Date()
    };
  }, []);

  // Convert simple project schema to full database schema
  const convertToFullSchema = useCallback((simpleSchema: DatabaseSchema | null, project?: Project): FullDatabaseSchema | null => {
    if (!simpleSchema) return null;

    // Ensure simpleSchema is treated as non-null after the check
    const schema = simpleSchema as DatabaseSchema;
    const projectRef = project || currentProject;

    return {
      id: schema.id || `project-${projectRef?.id || 'unknown'}`,
      name: schema.name || projectRef?.name || 'Project Schema',
      tables: schema.tables?.map((table, index) => convertTable(table, index)) || [],
      createdAt: schema.createdAt ? (schema.createdAt instanceof Date ? schema.createdAt : new Date(schema.createdAt)) : new Date(),
      updatedAt: schema.updatedAt ? (schema.updatedAt instanceof Date ? schema.updatedAt : new Date(schema.updatedAt)) : new Date(),
      version: schema.version || 1,
      description: projectRef?.description || undefined,
      tags: [],
      branches: [],
      currentBranch: undefined,
      collaborators: [],
      permissions: undefined,
      // Preserve comprehensive metadata from extraction
      databaseInfo: schema.databaseInfo,
      views: schema.views,
      triggers: schema.triggers,
      functions: schema.functions,
      procedures: schema.procedures,
      migrationHistory: schema.migrationHistory,
      ormModels: schema.ormModels,
      sequences: schema.sequences,
      metadata: {
        totalTables: (schema.tables?.length || 0),
        totalColumns: schema.tables?.reduce((sum, table) => sum + (table.columns?.length || 0), 0) || 0,
        totalRelationships: schema.relationships?.length || 0,
        totalRows: schema.tables?.reduce((sum, table) => sum + (table.rowCount || 0), 0) || 0,
        hasForeignKeys: schema.tables?.some(table => table.relationships?.length > 0) || false,
        hasIndexes: schema.tables?.some(table => table.indexes?.length > 0) || false,
        complexity: (schema.tables?.length || 0) > 10 ? 'high' : (schema.tables?.length || 0) > 5 ? 'medium' : 'low',
        lastValidated: new Date(),
        validationStatus: 'valid'
      }
    };
  }, [convertTable]);

  const selectProject = useCallback(async (project: Project) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('useProjectData: Selecting project:', project.name);

      // Update current project
      setCurrentProject(project);

      // Convert and set schema
      if (project.schema) {
        const fullSchema = convertToFullSchema(project.schema, project);
        setProjectSchema(fullSchema);
      } else {
        setProjectSchema(null);
      }

      // Set databases
      setProjectDatabases(project.databases || []);

      // Update last updated timestamp
      setLastUpdated(new Date());

      console.log('useProjectData: Project selected successfully:', {
        name: project.name,
        tableCount: project.totalTables || 0,
        hasSchema: !!project.schema
      });
    } catch (err) {
      console.error('Failed to select project:', err);
      setError('Failed to select project');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize from existing project or uploaded database
  useEffect(() => {
    const initializeProject = async () => {
      try {
        // First check if there's an active database connection (uploaded database)
        if (activeConnection && activeConnection.schema) {
          console.log('useProjectData: Found active database connection with schema');
          console.log('useProjectData: Connection details:', {
            id: activeConnection.id,
            projectName: activeConnection.projectName,
            tableCount: activeConnection.tableCount,
            hasSchema: !!activeConnection.schema,
            schemaTables: activeConnection.schema.tables?.length || 0
          });
          
          // Create a virtual project for the uploaded database
          const virtualProject: Project = {
            id: activeConnection.projectId || `uploaded_${Date.now()}`,
            name: activeConnection.projectName || 'Uploaded Database',
            description: 'Database uploaded via QueryFlow',
            technology: 'sqlite',
            status: 'connected',
            lastSynced: activeConnection.lastConnected || new Date(),
            databaseCount: 1,
            icon: '🗄️',
            color: 'blue',
            isExample: false,
            databases: [{
              id: activeConnection.id,
              name: activeConnection.database || 'database',
              type: activeConnection.type,
              connectionString: activeConnection.credentials.filePath || '',
              isConnected: true,
              lastSync: activeConnection.lastConnected || new Date(),
              tables: activeConnection.schema.tables || []
            }],
            schema: activeConnection.schema,
            tables: activeConnection.schema.tables || [],
            queries: [],
            uploadPath: activeConnection.uploadPath,
            totalTables: activeConnection.tableCount || 0,
            totalRows: activeConnection.totalRows || 0,
            hasForeignKeys: activeConnection.hasForeignKeys || false,
            hasIndexes: activeConnection.hasIndexes || false,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          console.log('useProjectData: Creating virtual project:', {
            name: virtualProject.name,
            tableCount: virtualProject.totalTables,
            schemaTables: virtualProject.schema?.tables?.length || 0
          });
          
          await selectProject(virtualProject);
        } else {
          // Fall back to projects manager
          const existingProject = projectsManager.getCurrentProject();
          if (existingProject) {
            console.log('useProjectData: Using existing project from manager:', existingProject.name);
            await selectProject(existingProject);
          } else {
            console.log('useProjectData: No active connection or existing project found');
          }
        }
      } catch (err) {
        console.error('Failed to initialize project:', err);
        setError('Failed to initialize project data');
      }
    };

    initializeProject();
  }, [activeConnection, selectProject]);

  // Listen for project sync events
  useEffect(() => {
    const handleProjectSyncComplete = async (data: any) => {
      console.log('useProjectData: Project synced, refreshing data');
      if (data.project) {
        await selectProject(data.project);
      }
    };

    const handleProjectDisconnected = () => {
      console.log('useProjectData: Project disconnected');
      clearProjectData();
    };

    const handleProjectError = (errorData: any) => {
      console.error('useProjectData: Project error:', errorData);
      setError(errorData.message || 'Project operation failed');
    };

    projectsManager.addEventListener('project_sync_complete', handleProjectSyncComplete);
    projectsManager.addEventListener('project_disconnected', handleProjectDisconnected);
    projectsManager.addEventListener('project_error', handleProjectError);

    return () => {
      projectsManager.removeEventListener('project_sync_complete', handleProjectSyncComplete);
      projectsManager.removeEventListener('project_disconnected', handleProjectDisconnected);
      projectsManager.removeEventListener('project_error', handleProjectError);
    };
  }, []);

  const clearProjectData = useCallback(() => {
    setCurrentProject(null);
    setProjectSchema(null);
    setProjectDatabases([]);
    setError(null);
    setLastUpdated(null);
  }, []);


  const refreshProject = useCallback(async () => {
    if (!currentProject) return;

    setIsLoading(true);
    setError(null);

    try {
      // Refresh project data from projectsManager
      const updatedProject = await projectsManager.getProject(currentProject.id);
      if (updatedProject) {
        await selectProject(updatedProject);
      } else {
        throw new Error('Project not found');
      }
    } catch (err: any) {
      console.error('useProjectData: Failed to refresh project:', err);
      setError(err.message || 'Failed to refresh project');
      setIsLoading(false);
    }
  }, [currentProject, selectProject]);

  const executeProjectQuery = useCallback(async (sql: string, params: any[] = []) => {
    if (!currentProject) {
      throw new Error('No project selected');
    }

    try {
      const result = await projectsManager.executeProjectQuery(currentProject.id, sql, params);
      return result;
    } catch (err: any) {
      console.error('useProjectData: Query execution failed:', err);
      throw err;
    }
  }, [currentProject]);

  // Computed values
  const tableCount = useMemo(() => {
    return projectSchema?.tables?.length || 0;
  }, [projectSchema]);

  const recordCount = useMemo(() => {
    // This would be more accurate with actual record counts
    // For now, return 0 as we don't have cached record counts
    return 0;
  }, [projectSchema]);

  const hasProject = useMemo(() => {
    return currentProject !== null;
  }, [currentProject]);

  const getTableNames = useCallback(() => {
    return projectSchema?.tables?.map(table => table.name) || [];
  }, [projectSchema]);

  const getColumnNames = useCallback((tableName: string) => {
    const table = projectSchema?.tables?.find(t => t.name === tableName);
    return table?.columns?.map(col => col.name) || [];
  }, [projectSchema]);

  const isTableExists = useCallback((tableName: string) => {
    return projectSchema?.tables?.some(t => t.name === tableName) || false;
  }, [projectSchema]);

  const getTableData = useCallback(async (tableName: string, limit: number = 1000) => {
    if (!hasProject) {
      throw new Error('No project selected');
    }

    try {
      const result = await executeProjectQuery(`SELECT * FROM "${tableName}" LIMIT ${limit}`);
      return result.rows || [];
    } catch (error) {
      console.error(`Failed to get table data for ${tableName}:`, error);
      return [];
    }
  }, [hasProject, executeProjectQuery]);

  return {
    currentProject,
    projectSchema,
    projectDatabases,
    isLoading,
    error,
    selectProject,
    refreshProject,
    executeProjectQuery,
    tableCount,
    recordCount,
    lastUpdated,
    hasProject,
    getTableNames,
    getColumnNames,
    isTableExists,
    getTableData
  };
}