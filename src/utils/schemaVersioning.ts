// Schema Versioning Manager for QueryFlow
// This module provides Git-like version control for database schemas

import { DatabaseSchema, SchemaBranch, Collaborator } from '@/types/database';

export interface SchemaCommit {
  id: string;
  message: string;
  author: string;
  timestamp: Date;
  changes: SchemaChange[];
  parentCommit?: string;
  branch: string;
  hash: string;
}

export interface SchemaChange {
  type: 'create' | 'update' | 'delete' | 'move' | 'rename';
  entityType: 'table' | 'column' | 'relationship' | 'index' | 'trigger';
  entityId: string;
  oldValue?: any;
  newValue?: any;
  metadata?: Record<string, any>;
}

export interface SchemaDiff {
  added: SchemaChange[];
  modified: SchemaChange[];
  deleted: SchemaChange[];
  moved: SchemaChange[];
  renamed: SchemaChange[];
}

export class SchemaVersioningManager {
  private static readonly COMMITS_KEY = 'queryflow_schema_commits';
  private static readonly BRANCHES_KEY = 'queryflow_schema_branches';
  private static readonly COLLABORATORS_KEY = 'queryflow_schema_collaborators';

  /**
   * Initialize versioning for a schema
   */
  static initializeVersioning(schema: DatabaseSchema): DatabaseSchema {
    const enhancedSchema = {
      ...schema,
      branches: schema.branches || [{
        id: 'main',
        name: 'main',
        createdAt: new Date(),
        createdBy: 'system',
        isActive: true
      }],
      currentBranch: schema.currentBranch || 'main',
      collaborators: schema.collaborators || [],
      permissions: schema.permissions || {
        canEdit: true,
        canDelete: true,
        canShare: true,
        canExport: true,
        canVersion: true,
        canCollaborate: true
      },
      metadata: schema.metadata || {
        totalTables: schema.tables.length,
        totalColumns: schema.tables.reduce((sum, table) => sum + table.columns.length, 0),
        totalRelationships: this.countRelationships(schema),
        complexity: this.calculateComplexity(schema),
        validationStatus: 'valid' as const
      }
    };

    // Create initial commit
    this.createCommit(enhancedSchema, 'Initial schema', 'system');
    
    return enhancedSchema;
  }

  /**
   * Create a new commit
   */
  static createCommit(schema: DatabaseSchema, message: string, author: string): SchemaCommit {
    const commits = this.getCommits();
    const lastCommit = commits.find(c => c.branch === schema.currentBranch);
    
    const commit: SchemaCommit = {
      id: `commit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message,
      author,
      timestamp: new Date(),
      changes: this.calculateChanges(schema, lastCommit),
      parentCommit: lastCommit?.id,
      branch: schema.currentBranch || 'main',
      hash: this.generateHash(schema)
    };

    commits.push(commit);
    localStorage.setItem(this.COMMITS_KEY, JSON.stringify(commits));
    
    return commit;
  }

  /**
   * Create a new branch
   */
  static createBranch(schema: DatabaseSchema, branchName: string, fromBranch: string = 'main'): SchemaBranch {
    const branches = this.getBranches();
    
    const branch: SchemaBranch = {
      id: branchName,
      name: branchName,
      parentBranch: fromBranch,
      createdAt: new Date(),
      createdBy: 'current_user',
      isActive: false
    };

    branches.push(branch);
    localStorage.setItem(this.BRANCHES_KEY, JSON.stringify(branches));
    
    return branch;
  }

  /**
   * Switch to a different branch
   */
  static switchBranch(schema: DatabaseSchema, branchName: string): DatabaseSchema {
    const branches = this.getBranches();
    const targetBranch = branches.find(b => b.name === branchName);
    
    if (!targetBranch) {
      throw new Error(`Branch ${branchName} not found`);
    }

    // Update branch status
    branches.forEach(b => b.isActive = b.name === branchName);
    localStorage.setItem(this.BRANCHES_KEY, JSON.stringify(branches));

    // Get the latest commit for this branch
    const commits = this.getCommits();
    const latestCommit = commits
      .filter(c => c.branch === branchName)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

    if (latestCommit) {
      // Apply changes from the commit
      return this.applyCommit(schema, latestCommit);
    }

    return { ...schema, currentBranch: branchName };
  }

  /**
   * Merge branches
   */
  static mergeBranches(schema: DatabaseSchema, sourceBranch: string, targetBranch: string): SchemaCommit {
    const sourceCommits = this.getCommits().filter(c => c.branch === sourceBranch);
    const targetCommits = this.getCommits().filter(c => c.branch === targetBranch);
    
    // Find common ancestor
    const commonAncestor = this.findCommonAncestor(sourceCommits, targetCommits);
    
    // Calculate changes since common ancestor
    const changes = this.calculateMergeChanges(sourceCommits, commonAncestor);
    
    // Create merge commit
    const mergeCommit: SchemaCommit = {
      id: `commit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message: `Merge branch '${sourceBranch}' into '${targetBranch}'`,
      author: 'current_user',
      timestamp: new Date(),
      changes,
      parentCommit: targetCommits[0]?.id,
      branch: targetBranch,
      hash: this.generateHash(schema)
    };

    const commits = this.getCommits();
    commits.push(mergeCommit);
    localStorage.setItem(this.COMMITS_KEY, JSON.stringify(commits));
    
    return mergeCommit;
  }

  /**
   * Get commit history
   */
  static getCommitHistory(branch?: string): SchemaCommit[] {
    const commits = this.getCommits();
    return branch 
      ? commits.filter(c => c.branch === branch)
      : commits;
  }

  /**
   * Get schema diff between commits
   */
  static getDiff(commit1: SchemaCommit, commit2: SchemaCommit): SchemaDiff {
    return {
      added: commit2.changes.filter(c => c.type === 'create'),
      modified: commit2.changes.filter(c => c.type === 'update'),
      deleted: commit2.changes.filter(c => c.type === 'delete'),
      moved: commit2.changes.filter(c => c.type === 'move'),
      renamed: commit2.changes.filter(c => c.type === 'rename')
    };
  }

  /**
   * Rollback to a specific commit
   */
  static rollbackToCommit(schema: DatabaseSchema, commitId: string): DatabaseSchema {
    const commits = this.getCommits();
    const targetCommit = commits.find(c => c.id === commitId);
    
    if (!targetCommit) {
      throw new Error(`Commit ${commitId} not found`);
    }

    // Apply the commit to rollback to
    return this.applyCommit(schema, targetCommit);
  }

  /**
   * Add collaborator
   */
  static addCollaborator(schema: DatabaseSchema, collaborator: Collaborator): DatabaseSchema {
    const collaborators = schema.collaborators || [];
    const existingIndex = collaborators.findIndex(c => c.id === collaborator.id);
    
    if (existingIndex >= 0) {
      collaborators[existingIndex] = collaborator;
    } else {
      collaborators.push(collaborator);
    }

    return {
      ...schema,
      collaborators
    };
  }

  /**
   * Update collaborator cursor position
   */
  static updateCollaboratorCursor(schema: DatabaseSchema, collaboratorId: string, cursor: { x: number; y: number; color: string }): DatabaseSchema {
    const collaborators = schema.collaborators || [];
    const collaborator = collaborators.find(c => c.id === collaboratorId);
    
    if (collaborator) {
      collaborator.cursor = cursor;
      collaborator.lastActive = new Date();
    }

    return {
      ...schema,
      collaborators
    };
  }

  // Private helper methods
  private static getCommits(): SchemaCommit[] {
    try {
      const stored = localStorage.getItem(this.COMMITS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private static getBranches(): SchemaBranch[] {
    try {
      const stored = localStorage.getItem(this.BRANCHES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private static calculateChanges(schema: DatabaseSchema, lastCommit?: SchemaCommit): SchemaChange[] {
    // This is a simplified implementation
    // In a real application, you'd compare the current schema with the previous state
    return [];
  }

  private static generateHash(schema: DatabaseSchema): string {
    // Simple hash generation - in production, use a proper hashing algorithm
    return btoa(JSON.stringify(schema)).substr(0, 16);
  }

  private static applyCommit(schema: DatabaseSchema, commit: SchemaCommit): DatabaseSchema {
    // Apply changes from commit to schema
    // This is a simplified implementation
    return schema;
  }

  private static findCommonAncestor(sourceCommits: SchemaCommit[], targetCommits: SchemaCommit[]): SchemaCommit | null {
    // Find common ancestor between branches
    // This is a simplified implementation
    return null;
  }

  private static calculateMergeChanges(sourceCommits: SchemaCommit[], commonAncestor: SchemaCommit | null): SchemaChange[] {
    // Calculate changes for merge
    // This is a simplified implementation
    return [];
  }

  private static countRelationships(schema: DatabaseSchema): number {
    return schema.tables.reduce((count, table) => {
      return count + table.columns.filter(col => col.foreignKey).length;
    }, 0);
  }

  private static calculateComplexity(schema: DatabaseSchema): 'low' | 'medium' | 'high' {
    const tableCount = schema.tables.length;
    const relationshipCount = this.countRelationships(schema);
    
    if (tableCount <= 5 && relationshipCount <= 10) return 'low';
    if (tableCount <= 15 && relationshipCount <= 30) return 'medium';
    return 'high';
  }
}
