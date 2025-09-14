// Project Data Hook
// Provides access to current project data and operations

import { useState, useEffect, useCallback } from 'react';
import { projectsManager } from '../utils/projectsManager';
import { Project } from '../types/projects';
import { DatabaseSchema } from '../types/database';

export function useProjectData() {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentDatabase, setCurrentDatabase] = useState<any>(null);
  const [projectSchema, setProjectSchema] = useState<DatabaseSchema | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load current project data
  const loadProjectData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const project = projectsManager.getCurrentProject();
      if (project) {
        setCurrentProject(project);

        // Set first available database
        if (project.databases.length > 0) {
          setCurrentDatabase(project.databases[0]);
        }

        // Get project schema
        const schema = projectsManager.getProjectSchema(project.id);
        if (schema) {
          // Convert project schema to DatabaseSchema format
          const dbSchema: DatabaseSchema = {
            id: `project_${project.id}_schema`,
            name: `${project.name} Schema`,
            tables: schema.tables.map((table, index) => ({
              id: `table_${index}`,
              name: table.name,
              columns: table.columns.map((col, colIndex) => ({
                id: `col_${colIndex}`,
                name: col.name,
                type: col.type as any,
                nullable: col.nullable,
                primaryKey: col.primaryKey || false,
                defaultValue: col.defaultValue
              })),
              position: { x: index * 200, y: index * 100 },
              indexes: [],
              createdAt: new Date(),
              updatedAt: new Date()
            })),
            createdAt: new Date(),
            updatedAt: new Date(),
            version: 1
          };
          setProjectSchema(dbSchema);
        }
      } else {
        // No current project
        setCurrentProject(null);
        setCurrentDatabase(null);
        setProjectSchema(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load project data');
      console.error('Failed to load project data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Execute query on project database
  const executeProjectQuery = useCallback(async (sql: string, params: any[] = []) => {
    if (!currentProject) {
      throw new Error('No current project selected');
    }

    try {
      return await projectsManager.executeProjectQuery(currentProject.id, sql, params);
    } catch (err) {
      console.error('Failed to execute project query:', err);
      throw err;
    }
  }, [currentProject]);

  // Get table data
  const getTableData = useCallback(async (tableName: string, limit: number = 100) => {
    if (!currentProject) {
      throw new Error('No current project selected');
    }

    try {
      const result = await projectsManager.executeProjectQuery(
        currentProject.id,
        `SELECT * FROM "${tableName}" LIMIT ?`,
        [limit]
      );
      return result.rows;
    } catch (err) {
      console.error(`Failed to get table data for ${tableName}:`, err);
      throw err;
    }
  }, [currentProject]);

  // Get table statistics
  const getTableStats = useCallback(async (tableName: string) => {
    if (!currentProject) {
      throw new Error('No current project selected');
    }

    try {
      const countResult = await projectsManager.executeProjectQuery(
        currentProject.id,
        `SELECT COUNT(*) as count FROM "${tableName}"`
      );
      const count = countResult.rows[0]?.[0] || 0;

      // Get column info
      const pragmaResult = await projectsManager.executeProjectQuery(
        currentProject.id,
        `PRAGMA table_info("${tableName}")`
      );

      return {
        tableName,
        recordCount: Number(count),
        columnCount: pragmaResult.rows.length,
        columns: pragmaResult.rows.map((row: any) => ({
          name: row[1],
          type: row[2],
          nullable: !row[3],
          primaryKey: !!row[5]
        }))
      };
    } catch (err) {
      console.error(`Failed to get table stats for ${tableName}:`, err);
      throw err;
    }
  }, [currentProject]);

  // Listen for project events
  useEffect(() => {
    const handleProjectSyncComplete = (data: any) => {
      console.log('Project data hook: Project synced:', data.project?.name);
      loadProjectData();
    };

    const handleProjectDisconnected = () => {
      console.log('Project data hook: Project disconnected');
      setCurrentProject(null);
      setCurrentDatabase(null);
      setProjectSchema(null);
    };

    projectsManager.addEventListener('project_sync_complete', handleProjectSyncComplete);
    projectsManager.addEventListener('project_disconnected', handleProjectDisconnected);

    // Initial load
    loadProjectData();

    return () => {
      projectsManager.removeEventListener('project_sync_complete', handleProjectSyncComplete);
      projectsManager.removeEventListener('project_disconnected', handleProjectDisconnected);
    };
  }, [loadProjectData]);

  return {
    currentProject,
    currentDatabase,
    projectSchema,
    isLoading,
    error,
    executeProjectQuery,
    getTableData,
    getTableStats,
    refreshData: loadProjectData
  };
}
