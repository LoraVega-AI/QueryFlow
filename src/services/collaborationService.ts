// Real-time Collaboration Service for QueryFlow
// Advanced collaborative editing with WebSockets, OT/CRDT, and live features

import { DatabaseSchema, Table, Column } from '@/types/database';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: UserRole;
  status: 'online' | 'offline' | 'away' | 'busy';
  lastSeen: Date;
  permissions: Permission[];
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRole {
  id: string;
  name: string;
  description?: string;
  level: number; // 0 = owner, 1 = admin, 2 = editor, 3 = viewer, 4 = guest
  permissions: string[];
  isSystem: boolean;
  color: string;
}

export interface Permission {
  resource: string; // 'schema', 'table', 'query', 'data', etc.
  actions: string[]; // 'read', 'write', 'delete', 'share', etc.
  scope: 'global' | 'workspace' | 'project' | 'resource';
  conditions?: Record<string, any>;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  notifications: NotificationSettings;
  collaboration: CollaborationSettings;
  privacy: PrivacySettings;
}

export interface NotificationSettings {
  email: boolean;
  browser: boolean;
  desktop: boolean;
  mobile: boolean;
  frequency: 'immediate' | 'digest' | 'weekly' | 'disabled';
  types: string[];
}

export interface CollaborationSettings {
  showCursors: boolean;
  showPresence: boolean;
  showComments: boolean;
  autoSave: boolean;
  conflictResolution: 'manual' | 'latest-wins' | 'merge';
}

export interface PrivacySettings {
  sharePresence: boolean;
  shareActivity: boolean;
  allowMentions: boolean;
  allowDirectMessages: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  members: WorkspaceMember[];
  settings: WorkspaceSettings;
  schemas: string[]; // Schema IDs
  createdAt: Date;
  updatedAt: Date;
  isArchived: boolean;
}

export interface WorkspaceMember {
  userId: string;
  roleId: string;
  joinedAt: Date;
  invitedBy: string;
  status: 'active' | 'invited' | 'suspended';
  lastActivity: Date;
}

export interface WorkspaceSettings {
  visibility: 'private' | 'internal' | 'public';
  allowInvites: boolean;
  allowGuestAccess: boolean;
  autoSave: boolean;
  versionRetention: number; // days
  conflictResolution: 'manual' | 'latest-wins' | 'merge';
  integrations: string[];
}

export interface Operation {
  id: string;
  type: 'insert' | 'delete' | 'retain' | 'format' | 'move';
  position: number;
  length?: number;
  content?: any;
  attributes?: Record<string, any>;
  metadata: OperationMetadata;
}

export interface OperationMetadata {
  userId: string;
  timestamp: Date;
  source: string; // Component that generated the operation
  sessionId: string;
  version: number;
  dependencies?: string[]; // Operation IDs this depends on
}

export interface CollaborationState {
  documentId: string;
  version: number;
  operations: Operation[];
  participants: ActiveParticipant[];
  cursors: CursorPosition[];
  selections: SelectionRange[];
  comments: Comment[];
  lastSaved: Date;
  hasUnsavedChanges: boolean;
}

export interface ActiveParticipant {
  userId: string;
  sessionId: string;
  joinedAt: Date;
  lastActivity: Date;
  cursor?: CursorPosition;
  selection?: SelectionRange;
  status: 'active' | 'idle' | 'typing';
}

export interface CursorPosition {
  userId: string;
  x: number;
  y: number;
  element?: string; // Element ID or path
  timestamp: Date;
  visible: boolean;
}

export interface SelectionRange {
  userId: string;
  start: Position;
  end: Position;
  type: 'text' | 'table' | 'column' | 'node';
  elementId?: string;
  timestamp: Date;
}

export interface Position {
  line: number;
  column: number;
  offset?: number;
}

export interface Comment {
  id: string;
  authorId: string;
  content: string;
  position: Position;
  elementId?: string;
  thread: CommentThread;
  status: 'open' | 'resolved' | 'archived';
  mentions: string[];
  attachments: Attachment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CommentThread {
  id: string;
  rootCommentId: string;
  replies: Comment[];
  participants: string[];
  status: 'open' | 'resolved' | 'archived';
  resolvedBy?: string;
  resolvedAt?: Date;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface VersionHistory {
  id: string;
  documentId: string;
  version: number;
  snapshot: any; // Full document state
  operations: Operation[];
  authorId: string;
  message?: string;
  tags: string[];
  createdAt: Date;
  size: number;
  checksum: string;
}

export interface ConflictResolution {
  id: string;
  conflictType: 'concurrent-edit' | 'merge-conflict' | 'permission-conflict';
  operations: Operation[];
  resolutions: Resolution[];
  status: 'pending' | 'resolved' | 'escalated';
  assignedTo?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  strategy: 'manual' | 'auto-merge' | 'latest-wins' | 'custom';
}

export interface Resolution {
  id: string;
  operation: Operation;
  decision: 'accept' | 'reject' | 'modify';
  modifiedOperation?: Operation;
  reason?: string;
  userId: string;
  timestamp: Date;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  sessionId: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'mention' | 'comment' | 'invite' | 'share' | 'activity' | 'system';
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  expiresAt?: Date;
  createdAt: Date;
  readAt?: Date;
  actionUrl?: string;
  actionText?: string;
}

export class CollaborationService {
  private static currentUser: User | null = null;
  private static workspaces: Map<string, Workspace> = new Map();
  private static collaborationStates: Map<string, CollaborationState> = new Map();
  private static versionHistory: Map<string, VersionHistory[]> = new Map();
  private static activityLogs: ActivityLog[] = [];
  private static notifications: Map<string, Notification[]> = new Map();
  private static websockets: Map<string, WebSocket> = new Map();
  
  // Operational Transformation state
  private static operationQueue: Map<string, Operation[]> = new Map();
  private static pendingOperations: Map<string, Operation[]> = new Map();
  
  // Default roles
  private static defaultRoles: UserRole[] = [
    {
      id: 'owner',
      name: 'Owner',
      description: 'Full access to all workspace features',
      level: 0,
      permissions: ['*'],
      isSystem: true,
      color: '#8B5CF6'
    },
    {
      id: 'admin',
      name: 'Admin',
      description: 'Administrative access with user management',
      level: 1,
      permissions: ['read', 'write', 'delete', 'share', 'manage-users', 'manage-settings'],
      isSystem: true,
      color: '#EF4444'
    },
    {
      id: 'editor',
      name: 'Editor',
      description: 'Can edit schemas and data',
      level: 2,
      permissions: ['read', 'write', 'comment'],
      isSystem: true,
      color: '#10B981'
    },
    {
      id: 'viewer',
      name: 'Viewer',
      description: 'Read-only access with commenting',
      level: 3,
      permissions: ['read', 'comment'],
      isSystem: true,
      color: '#6B7280'
    },
    {
      id: 'guest',
      name: 'Guest',
      description: 'Limited read-only access',
      level: 4,
      permissions: ['read'],
      isSystem: true,
      color: '#9CA3AF'
    }
  ];

  /**
   * Initialize collaboration service
   */
  static initialize(user: User): void {
    this.currentUser = user;
    this.createDefaultWorkspace(user);
  }

  /**
   * Create workspace
   */
  static createWorkspace(workspace: Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'>): Workspace {
    const newWorkspace: Workspace = {
      ...workspace,
      id: `workspace_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.workspaces.set(newWorkspace.id, newWorkspace);
    
    this.logActivity({
      id: `activity_${Date.now()}`,
      userId: workspace.ownerId,
      action: 'workspace.created',
      resourceType: 'workspace',
      resourceId: newWorkspace.id,
      details: { name: newWorkspace.name },
      timestamp: new Date(),
      sessionId: this.generateSessionId()
    });

    return newWorkspace;
  }

  /**
   * Join workspace collaboration
   */
  static async joinWorkspace(workspaceId: string, userId: string): Promise<CollaborationState> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    // Check permissions
    this.checkPermission(userId, 'read', 'workspace', workspaceId);

    // Get or create collaboration state
    let state = this.collaborationStates.get(workspaceId);
    if (!state) {
      state = {
        documentId: workspaceId,
        version: 0,
        operations: [],
        participants: [],
        cursors: [],
        selections: [],
        comments: [],
        lastSaved: new Date(),
        hasUnsavedChanges: false
      };
      this.collaborationStates.set(workspaceId, state);
    }

    // Add participant
    const sessionId = this.generateSessionId();
    const participant: ActiveParticipant = {
      userId,
      sessionId,
      joinedAt: new Date(),
      lastActivity: new Date(),
      status: 'active'
    };

    state.participants = state.participants.filter(p => p.userId !== userId);
    state.participants.push(participant);

    // Initialize WebSocket connection
    this.initializeWebSocket(workspaceId, userId, sessionId);

    this.logActivity({
      id: `activity_${Date.now()}`,
      userId,
      action: 'workspace.joined',
      resourceType: 'workspace',
      resourceId: workspaceId,
      details: { sessionId },
      timestamp: new Date(),
      sessionId
    });

    return state;
  }

  /**
   * Leave workspace collaboration
   */
  static leaveWorkspace(workspaceId: string, userId: string): void {
    const state = this.collaborationStates.get(workspaceId);
    if (!state) return;

    // Remove participant
    state.participants = state.participants.filter(p => p.userId !== userId);

    // Remove cursor and selection
    state.cursors = state.cursors.filter(c => c.userId !== userId);
    state.selections = state.selections.filter(s => s.userId !== userId);

    // Close WebSocket
    const wsKey = `${workspaceId}_${userId}`;
    const ws = this.websockets.get(wsKey);
    if (ws) {
      ws.close();
      this.websockets.delete(wsKey);
    }

    this.broadcastToWorkspace(workspaceId, {
      type: 'participant-left',
      userId,
      timestamp: new Date()
    });
  }

  /**
   * Apply operation using Operational Transformation
   */
  static async applyOperation(workspaceId: string, operation: Operation): Promise<Operation> {
    const state = this.collaborationStates.get(workspaceId);
    if (!state) {
      throw new Error('Workspace collaboration not initialized');
    }

    // Check permissions
    this.checkPermission(operation.metadata.userId, 'write', 'workspace', workspaceId);

    // Transform operation against pending operations
    const transformedOperation = await this.transformOperation(workspaceId, operation);

    // Apply to state
    state.operations.push(transformedOperation);
    state.version++;
    state.hasUnsavedChanges = true;

    // Update participant activity
    const participant = state.participants.find(p => p.userId === operation.metadata.userId);
    if (participant) {
      participant.lastActivity = new Date();
      participant.status = 'active';
    }

    // Broadcast to other participants
    this.broadcastToWorkspace(workspaceId, {
      type: 'operation',
      operation: transformedOperation,
      version: state.version
    }, operation.metadata.userId);

    this.logActivity({
      id: `activity_${Date.now()}`,
      userId: operation.metadata.userId,
      action: 'operation.applied',
      resourceType: 'workspace',
      resourceId: workspaceId,
      details: { 
        operationType: operation.type,
        operationId: operation.id,
        version: state.version
      },
      timestamp: new Date(),
      sessionId: operation.metadata.sessionId
    });

    return transformedOperation;
  }

  /**
   * Update cursor position
   */
  static updateCursor(workspaceId: string, cursor: CursorPosition): void {
    const state = this.collaborationStates.get(workspaceId);
    if (!state) return;

    // Update cursor in state
    state.cursors = state.cursors.filter(c => c.userId !== cursor.userId);
    if (cursor.visible) {
      state.cursors.push(cursor);
    }

    // Update participant cursor
    const participant = state.participants.find(p => p.userId === cursor.userId);
    if (participant) {
      participant.cursor = cursor;
      participant.lastActivity = new Date();
    }

    // Broadcast cursor update
    this.broadcastToWorkspace(workspaceId, {
      type: 'cursor-update',
      cursor
    }, cursor.userId);
  }

  /**
   * Update selection range
   */
  static updateSelection(workspaceId: string, selection: SelectionRange): void {
    const state = this.collaborationStates.get(workspaceId);
    if (!state) return;

    // Update selection in state
    state.selections = state.selections.filter(s => s.userId !== selection.userId);
    state.selections.push(selection);

    // Update participant selection
    const participant = state.participants.find(p => p.userId === selection.userId);
    if (participant) {
      participant.selection = selection;
      participant.lastActivity = new Date();
    }

    // Broadcast selection update
    this.broadcastToWorkspace(workspaceId, {
      type: 'selection-update',
      selection
    }, selection.userId);
  }

  /**
   * Add comment
   */
  static addComment(workspaceId: string, comment: Omit<Comment, 'id' | 'createdAt' | 'updatedAt'>): Comment {
    const state = this.collaborationStates.get(workspaceId);
    if (!state) {
      throw new Error('Workspace collaboration not initialized');
    }

    // Check permissions
    this.checkPermission(comment.authorId, 'comment', 'workspace', workspaceId);

    const newComment: Comment = {
      ...comment,
      id: `comment_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    state.comments.push(newComment);

    // Create notifications for mentions
    if (comment.mentions.length > 0) {
      this.createMentionNotifications(workspaceId, newComment);
    }

    // Broadcast comment
    this.broadcastToWorkspace(workspaceId, {
      type: 'comment-added',
      comment: newComment
    });

    this.logActivity({
      id: `activity_${Date.now()}`,
      userId: comment.authorId,
      action: 'comment.added',
      resourceType: 'workspace',
      resourceId: workspaceId,
      details: { 
        commentId: newComment.id,
        mentions: comment.mentions.length
      },
      timestamp: new Date(),
      sessionId: this.generateSessionId()
    });

    return newComment;
  }

  /**
   * Create version snapshot
   */
  static createVersion(
    workspaceId: string, 
    userId: string, 
    message?: string, 
    tags: string[] = []
  ): VersionHistory {
    const state = this.collaborationStates.get(workspaceId);
    if (!state) {
      throw new Error('Workspace collaboration not initialized');
    }

    // Check permissions
    this.checkPermission(userId, 'write', 'workspace', workspaceId);

    // Create snapshot
    const snapshot = {
      version: state.version,
      operations: [...state.operations],
      participants: [...state.participants],
      comments: [...state.comments],
      timestamp: new Date()
    };

    const version: VersionHistory = {
      id: `version_${Date.now()}`,
      documentId: workspaceId,
      version: state.version,
      snapshot,
      operations: [...state.operations],
      authorId: userId,
      message,
      tags,
      createdAt: new Date(),
      size: JSON.stringify(snapshot).length,
      checksum: this.calculateChecksum(snapshot)
    };

    // Store version
    const versions = this.versionHistory.get(workspaceId) || [];
    versions.push(version);
    this.versionHistory.set(workspaceId, versions);

    // Mark as saved
    state.lastSaved = new Date();
    state.hasUnsavedChanges = false;

    this.logActivity({
      id: `activity_${Date.now()}`,
      userId,
      action: 'version.created',
      resourceType: 'workspace',
      resourceId: workspaceId,
      details: { 
        versionId: version.id,
        version: version.version,
        message,
        tags
      },
      timestamp: new Date(),
      sessionId: this.generateSessionId()
    });

    return version;
  }

  /**
   * Restore from version
   */
  static restoreVersion(workspaceId: string, versionId: string, userId: string): void {
    // Check permissions
    this.checkPermission(userId, 'write', 'workspace', workspaceId);

    const versions = this.versionHistory.get(workspaceId) || [];
    const version = versions.find(v => v.id === versionId);
    
    if (!version) {
      throw new Error('Version not found');
    }

    const state = this.collaborationStates.get(workspaceId);
    if (!state) {
      throw new Error('Workspace collaboration not initialized');
    }

    // Restore state from snapshot
    state.operations = [...version.operations];
    state.version = version.version;
    state.comments = [...(version.snapshot.comments || [])];
    state.hasUnsavedChanges = true;

    // Broadcast restore
    this.broadcastToWorkspace(workspaceId, {
      type: 'version-restored',
      versionId,
      version: version.version,
      restoredBy: userId
    });

    this.logActivity({
      id: `activity_${Date.now()}`,
      userId,
      action: 'version.restored',
      resourceType: 'workspace',
      resourceId: workspaceId,
      details: { 
        versionId,
        restoredVersion: version.version
      },
      timestamp: new Date(),
      sessionId: this.generateSessionId()
    });
  }

  /**
   * Get workspace members
   */
  static getWorkspaceMembers(workspaceId: string): WorkspaceMember[] {
    const workspace = this.workspaces.get(workspaceId);
    return workspace ? workspace.members : [];
  }

  /**
   * Get collaboration state
   */
  static getCollaborationState(workspaceId: string): CollaborationState | null {
    return this.collaborationStates.get(workspaceId) || null;
  }

  /**
   * Get version history
   */
  static getVersionHistory(workspaceId: string): VersionHistory[] {
    return this.versionHistory.get(workspaceId) || [];
  }

  /**
   * Get activity logs
   */
  static getActivityLogs(
    filters?: {
      userId?: string;
      workspaceId?: string;
      action?: string;
      limit?: number;
    }
  ): ActivityLog[] {
    let logs = [...this.activityLogs];

    if (filters) {
      if (filters.userId) {
        logs = logs.filter(log => log.userId === filters.userId);
      }
      if (filters.workspaceId) {
        logs = logs.filter(log => log.resourceId === filters.workspaceId);
      }
      if (filters.action) {
        logs = logs.filter(log => log.action.includes(filters.action || ''));
      }
      if (filters.limit) {
        logs = logs.slice(0, filters.limit);
      }
    }

    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get notifications for user
   */
  static getNotifications(userId: string, unreadOnly: boolean = false): Notification[] {
    const userNotifications = this.notifications.get(userId) || [];
    
    if (unreadOnly) {
      return userNotifications.filter(n => !n.read);
    }
    
    return userNotifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Mark notification as read
   */
  static markNotificationRead(userId: string, notificationId: string): void {
    const userNotifications = this.notifications.get(userId) || [];
    const notification = userNotifications.find(n => n.id === notificationId);
    
    if (notification) {
      notification.read = true;
      notification.readAt = new Date();
    }
  }

  /**
   * Get default roles
   */
  static getDefaultRoles(): UserRole[] {
    return [...this.defaultRoles];
  }

  // Private helper methods

  private static createDefaultWorkspace(user: User): void {
    const workspace: Workspace = {
      id: 'default',
      name: `${user.name}'s Workspace`,
      description: 'Default workspace',
      ownerId: user.id,
      members: [{
        userId: user.id,
        roleId: 'owner',
        joinedAt: new Date(),
        invitedBy: user.id,
        status: 'active',
        lastActivity: new Date()
      }],
      settings: {
        visibility: 'private',
        allowInvites: true,
        allowGuestAccess: false,
        autoSave: true,
        versionRetention: 30,
        conflictResolution: 'manual',
        integrations: []
      },
      schemas: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isArchived: false
    };

    this.workspaces.set(workspace.id, workspace);
  }

  private static checkPermission(
    userId: string, 
    action: string, 
    resourceType: string, 
    resourceId: string
  ): void {
    // Simplified permission check
    // In production, implement comprehensive RBAC
    if (!this.currentUser || this.currentUser.id !== userId) {
      throw new Error('Authentication required');
    }

    const workspace = this.workspaces.get(resourceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const member = workspace.members.find(m => m.userId === userId);
    if (!member) {
      throw new Error('Access denied: Not a workspace member');
    }

    const role = this.defaultRoles.find(r => r.id === member.roleId);
    if (!role) {
      throw new Error('Invalid role');
    }

    if (!role.permissions.includes('*') && !role.permissions.includes(action)) {
      throw new Error(`Access denied: Missing ${action} permission`);
    }
  }

  private static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static initializeWebSocket(workspaceId: string, userId: string, sessionId: string): void {
    // In a real implementation, this would establish an actual WebSocket connection
    // For now, we'll simulate it
    const wsKey = `${workspaceId}_${userId}`;
    
    // Mock WebSocket
    const mockWs = {
      send: (data: string) => {
        console.log(`WebSocket send: ${data}`);
      },
      close: () => {
        console.log(`WebSocket closed for ${wsKey}`);
      }
    } as WebSocket;

    this.websockets.set(wsKey, mockWs);
  }

  private static broadcastToWorkspace(
    workspaceId: string, 
    message: any, 
    excludeUserId?: string
  ): void {
    const state = this.collaborationStates.get(workspaceId);
    if (!state) return;

    // In a real implementation, this would send via actual WebSockets
    state.participants
      .filter(p => p.userId !== excludeUserId)
      .forEach(participant => {
        const wsKey = `${workspaceId}_${participant.userId}`;
        const ws = this.websockets.get(wsKey);
        if (ws) {
          try {
            ws.send(JSON.stringify({
              ...message,
              workspaceId,
              timestamp: new Date()
            }));
          } catch (error) {
            console.error(`Failed to send message to ${participant.userId}:`, error);
          }
        }
      });
  }

  private static async transformOperation(
    workspaceId: string, 
    operation: Operation
  ): Promise<Operation> {
    // Simplified Operational Transformation
    // In production, implement full OT algorithm
    const pendingOps = this.pendingOperations.get(workspaceId) || [];
    
    let transformedOp = { ...operation };
    
    // Transform against each pending operation
    for (const pendingOp of pendingOps) {
      if (pendingOp.metadata.timestamp < operation.metadata.timestamp) {
        transformedOp = this.transformOperationPair(transformedOp, pendingOp);
      }
    }

    // Add to pending operations
    pendingOps.push(transformedOp);
    this.pendingOperations.set(workspaceId, pendingOps);

    // Clean up old pending operations
    const cutoff = new Date(Date.now() - 60000); // 1 minute
    this.pendingOperations.set(
      workspaceId,
      pendingOps.filter(op => op.metadata.timestamp > cutoff)
    );

    return transformedOp;
  }

  private static transformOperationPair(op1: Operation, op2: Operation): Operation {
    // Simplified OT transformation
    // Real implementation would handle all operation type combinations
    if (op1.type === 'insert' && op2.type === 'insert') {
      if (op1.position >= op2.position) {
        return {
          ...op1,
          position: op1.position + (op2.length || 0)
        };
      }
    }
    
    if (op1.type === 'delete' && op2.type === 'insert') {
      if (op1.position > op2.position) {
        return {
          ...op1,
          position: op1.position + (op2.length || 0)
        };
      }
    }

    return op1;
  }

  private static createMentionNotifications(workspaceId: string, comment: Comment): void {
    comment.mentions.forEach(userId => {
      const notification: Notification = {
        id: `notification_${Date.now()}_${userId}`,
        userId,
        type: 'mention',
        title: 'You were mentioned',
        message: `${comment.authorId} mentioned you in a comment`,
        data: {
          workspaceId,
          commentId: comment.id,
          content: comment.content
        },
        read: false,
        priority: 'normal',
        createdAt: new Date(),
        actionUrl: `/workspace/${workspaceId}#comment-${comment.id}`,
        actionText: 'View Comment'
      };

      const userNotifications = this.notifications.get(userId) || [];
      userNotifications.push(notification);
      this.notifications.set(userId, userNotifications);
    });
  }

  private static calculateChecksum(data: any): string {
    // Simple checksum - in production use crypto hash
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }

  private static logActivity(activity: ActivityLog): void {
    this.activityLogs.push(activity);
    
    // Keep only last 10000 activities
    if (this.activityLogs.length > 10000) {
      this.activityLogs = this.activityLogs.slice(-10000);
    }
  }

  /**
   * Clean up resources
   */
  static cleanup(): void {
    // Close all WebSocket connections
    this.websockets.forEach(ws => ws.close());
    this.websockets.clear();
    
    // Clear pending operations
    this.pendingOperations.clear();
    this.operationQueue.clear();
  }
}
