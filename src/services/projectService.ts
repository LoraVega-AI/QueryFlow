// Project Service
// Manages project operations, storage, and lifecycle

import {
  Project,
  LocalProject,
  GitHubProject,
  ProjectDetectionResult,
  ProjectStatus,
  ProjectUploadOptions
} from '@/types/project';
import { ProjectDetector } from '@/utils/projectDetector';
import { DatabaseConnector } from '@/utils/databaseConnector';

export class ProjectService {
  private static readonly STORAGE_KEY = 'queryflow_projects';
  private static projects: Map<string, Project> = new Map();
  private static initialized = false;

  // Initialize service
  static async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load projects from storage
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const projectData = JSON.parse(stored);
        for (const [id, project] of Object.entries(projectData)) {
          this.projects.set(id, this.deserializeProject(project as any));
        }
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize project service:', error);
    }
  }

  // Create project from detection result
  static async createProject(
    detectionResult: ProjectDetectionResult,
    options: {
      name?: string;
      description?: string;
      type: 'local' | 'github';
      path: string;
      repository?: any;
      branch?: string;
    }
  ): Promise<Project> {
    await this.initialize();

    const now = new Date();
    const projectId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    let project: Project;

    if (options.type === 'local') {
      project = {
        id: projectId,
        name: options.name || detectionResult.projectType,
        description: options.description,
        path: options.path,
        projectType: detectionResult.projectType,
        type: 'local',
        localPath: options.path,
        databases: detectionResult.databases,
        configFiles: detectionResult.configFiles,
        createdAt: now,
        updatedAt: now,
        status: 'connected',
        metadata: detectionResult.metadata
      } as LocalProject;
    } else {
      project = {
        id: projectId,
        name: options.name || detectionResult.projectType,
        description: options.description,
        path: options.path,
        projectType: detectionResult.projectType,
        type: 'github',
        repository: options.repository,
        branch: options.branch || 'main',
        clonePath: options.path,
        databases: detectionResult.databases,
        configFiles: detectionResult.configFiles,
        createdAt: now,
        updatedAt: now,
        status: 'connected',
        metadata: detectionResult.metadata
      } as GitHubProject;
    }

    // Test database connections
    await this.testProjectDatabases(project);

    // Save project
    this.projects.set(project.id, project);
    this.saveProjects();

    return project;
  }

  // Get all projects
  static async getProjects(): Promise<Project[]> {
    await this.initialize();
    return Array.from(this.projects.values());
  }

  // Get project by ID
  static async getProject(id: string): Promise<Project | null> {
    await this.initialize();
    return this.projects.get(id) || null;
  }

  // Update project
  static async updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
    await this.initialize();

    const project = this.projects.get(id);
    if (!project) return null;

    const updatedProject = {
      ...project,
      ...updates,
      updatedAt: new Date()
    } as Project;

    this.projects.set(id, updatedProject);
    this.saveProjects();

    return updatedProject;
  }

  // Delete project
  static async deleteProject(id: string): Promise<boolean> {
    await this.initialize();

    const deleted = this.projects.delete(id);
    if (deleted) {
      this.saveProjects();
    }

    return deleted;
  }

  // Test database connections for project
  static async testProjectDatabases(project: Project): Promise<void> {
    for (const database of project.databases) {
      try {
        const result = await DatabaseConnector.testConnection(database.type, database.config);
        database.status = result.success ? 'connected' : 'error';
        database.lastConnected = result.success ? new Date() : undefined;
      } catch (error) {
        database.status = 'error';
        console.error(`Failed to test database ${database.name}:`, error);
      }
    }

    // Update project with new database statuses
    this.projects.set(project.id, project);
    this.saveProjects();
  }

  // Refresh project detection
  static async refreshProjectDetection(projectId: string): Promise<ProjectDetectionResult | null> {
    await this.initialize();

    const project = this.projects.get(projectId);
    if (!project) return null;

    const options: ProjectUploadOptions = {
      includeHidden: false,
      maxDepth: 5,
      ignorePatterns: ['node_modules', '.git', 'dist', 'build'],
      scanTimeout: 30000
    };

    // Get file list (this would be implemented based on project type)
    const files = await this.getProjectFiles(project);

    // Re-detect project
    const result = await ProjectDetector.detectProject(files, options);

    // Update project
    const updatedProject = {
      ...project,
      databases: result.databases,
      configFiles: result.configFiles,
      metadata: {
        ...project.metadata,
        ...result.metadata,
        dependencies: result.metadata.dependencies || project.metadata?.dependencies || [],
        scripts: result.metadata.scripts || project.metadata?.scripts || {},
        environment: result.metadata.environment || project.metadata?.environment || 'development'
      },
      updatedAt: new Date()
    } as Project;

    this.projects.set(projectId, updatedProject);
    this.saveProjects();

    return result;
  }

  // Get project files (mock implementation)
  private static async getProjectFiles(project: Project): Promise<string[]> {
    // In a real implementation, this would:
    // - For local projects: scan the file system
    // - For GitHub projects: use GitHub API or scan cloned repo
    return [
      'package.json',
      'src/app.js',
      'config/database.js',
      'models/User.js',
      'README.md'
    ];
  }

  // Save projects to storage
  private static saveProjects(): void {
    try {
      const projectData: Record<string, any> = {};
      for (const [id, project] of this.projects) {
        projectData[id] = this.serializeProject(project);
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(projectData));
    } catch (error) {
      console.error('Failed to save projects:', error);
    }
  }

  // Serialize project for storage
  private static serializeProject(project: Project): any {
    return {
      ...project,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      lastSyncedAt: project.lastSyncedAt?.toISOString()
    };
  }

  // Deserialize project from storage
  private static deserializeProject(data: any): Project {
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      lastSyncedAt: data.lastSyncedAt ? new Date(data.lastSyncedAt) : undefined
    };
  }

  // Search projects
  static async searchProjects(query: string): Promise<Project[]> {
    await this.initialize();

    const projects = Array.from(this.projects.values());
    const lowercaseQuery = query.toLowerCase();

    return projects.filter(project =>
      project.name.toLowerCase().includes(lowercaseQuery) ||
      project.description?.toLowerCase().includes(lowercaseQuery) ||
      project.projectType.toLowerCase().includes(lowercaseQuery)
    );
  }

  // Get projects by status
  static async getProjectsByStatus(status: ProjectStatus): Promise<Project[]> {
    await this.initialize();

    return Array.from(this.projects.values()).filter(project => project.status === status);
  }

  // Get projects by type
  static async getProjectsByType(projectType: string): Promise<Project[]> {
    await this.initialize();

    return Array.from(this.projects.values()).filter(project => project.projectType === projectType);
  }

  // Export project configuration
  static async exportProjectConfig(projectId: string): Promise<string | null> {
    await this.initialize();

    const project = this.projects.get(projectId);
    if (!project) return null;

    return JSON.stringify(this.serializeProject(project), null, 2);
  }

  // Import project configuration
  static async importProjectConfig(configJson: string): Promise<Project | null> {
    await this.initialize();

    try {
      const config = JSON.parse(configJson);
      const project = this.deserializeProject(config);

      // Validate project
      if (!project.id || !project.name) {
        throw new Error('Invalid project configuration');
      }

      this.projects.set(project.id, project);
      this.saveProjects();

      return project;
    } catch (error) {
      console.error('Failed to import project configuration:', error);
      return null;
    }
  }

  // Get project statistics
  static async getProjectStatistics(): Promise<{
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    totalDatabases: number;
  }> {
    await this.initialize();

    const projects = Array.from(this.projects.values());
    const stats = {
      total: projects.length,
      byType: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      totalDatabases: 0
    };

    for (const project of projects) {
      // Count by type
      stats.byType[project.projectType] = (stats.byType[project.projectType] || 0) + 1;

      // Count by status
      stats.byStatus[project.status] = (stats.byStatus[project.status] || 0) + 1;

      // Count databases
      stats.totalDatabases += project.databases.length;
    }

    return stats;
  }

  // Validate project
  static async validateProject(project: Project): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!project.name?.trim()) {
      errors.push('Project name is required');
    }

    if (!project.path?.trim()) {
      errors.push('Project path is required');
    }

    // Type-specific validation
    if (project.type === 'github') {
      const githubProject = project as GitHubProject;
      if (!githubProject.repository) {
        errors.push('GitHub repository information is required');
      }
      if (!githubProject.branch) {
        warnings.push('Branch not specified, using default');
      }
    }

    // Database validation
    for (const database of project.databases) {
      try {
        const validation = DatabaseConnector.validateConfig(database.type, database.config);
        if (!validation.isValid) {
          errors.push(`Database ${database.name}: ${validation.errors.join(', ')}`);
        }
      } catch (error) {
        errors.push(`Database ${database.name}: Configuration validation failed`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
