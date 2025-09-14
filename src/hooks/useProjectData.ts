// Global project data hook for accessing current project context
// Provides unified access to project database, schema, and metadata

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Project, DatabaseSchema, Database as ProjectDatabase, Table as ProjectTable, Column as ProjectColumn } from '@/types/projects';
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

  // Convert project table to full database table
  const convertTable = useCallback((projectTable: ProjectTable): FullTable => {
    return {
      id: projectTable.name,
      name: projectTable.name,
      columns: projectTable.columns?.map((col: ProjectColumn) => ({
        id: col.name,
        name: col.name,
        type: col.type as DataType,
        nullable: col.nullable,
        primaryKey: col.primaryKey || false,
        defaultValue: col.defaultValue,
        unique: false,
        autoIncrement: false,
        foreignKey: undefined,
        indexed: false,
        constraints: {}
      })) || [],
      position: { x: 0, y: 0 },
      documentation: undefined,
      tags: []
    };
  }, []);

  // Convert simple project schema to full database schema
  const convertToFullSchema = useCallback((simpleSchema: DatabaseSchema | null): FullDatabaseSchema | null => {
    if (!simpleSchema) return null;

    // Ensure simpleSchema is treated as non-null after the check
    const schema = simpleSchema as DatabaseSchema;

    return {
      id: `project-${currentProject?.id || 'unknown'}`,
      name: currentProject?.name || 'Project Schema',
      tables: schema.tables?.map(convertTable) || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      description: currentProject?.description || undefined,
      tags: [],
      branches: [],
      currentBranch: undefined,
      collaborators: [],
      permissions: undefined,
      metadata: {
        totalTables: (schema.tables?.length || 0),
        totalColumns: schema.tables?.reduce((sum, table) => sum + (table.columns?.length || 0), 0) || 0,
        totalRelationships: schema.relationships?.length || 0,
        complexity: 'medium',
        lastValidated: new Date(),
        validationStatus: 'valid'
      }
    };
  }, [currentProject, convertTable]);

  // Initialize from existing project
  useEffect(() => {
    const initializeProject = async () => {
      try {
        const existingProject = projectsManager.getCurrentProject();
        if (existingProject) {
          await selectProject(existingProject);
        }
      } catch (err) {
        console.error('Failed to initialize project:', err);
        setError('Failed to initialize project data');
      }
    };

    initializeProject();
  }, []);

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

  const selectProject = useCallback(async (project: Project) => {
      setIsLoading(true);
      setError(null);

    try {
      console.log('useProjectData: Selecting project:', project.name);

      // Update current project
      setCurrentProject(project);
      setProjectDatabases(project.databases);

      // Load project schema
        const schema = projectsManager.getProjectSchema(project.id);
      const fullSchema = convertToFullSchema(schema);
      if (fullSchema) {
        setProjectSchema(fullSchema);
        console.log('useProjectData: Loaded schema with', fullSchema.tables?.length || 0, 'tables');
      } else {
        console.warn('useProjectData: No schema found for project');
        setProjectSchema(null);
      }

      setLastUpdated(new Date());
      setIsLoading(false);

    } catch (err: any) {
      console.error('useProjectData: Failed to select project:', err);
      setError(err.message || 'Failed to select project');
      setIsLoading(false);
    }
  }, []);

  const refreshProject = useCallback(async () => {
    if (!currentProject) return;

    setIsLoading(true);
    setError(null);

    try {
      // Refresh project data from projectsManager
      const updatedProject = projectsManager.getProject(currentProject.id);
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