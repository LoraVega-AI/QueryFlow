'use client';

// Collaboration Manager Component
// Real-time collaborative editing interface with live features

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Users, MessageCircle, History, Bell, Settings, Crown, Shield, 
  Edit3, Eye, Clock, Share2, GitBranch, MoreHorizontal, Plus,
  Check, X, ChevronDown, ChevronRight, Send, Reply, Trash2,
  Star, Pin, Archive, Flag, Smile, Paperclip, AtSign, Hash,
  Video, Phone, ScreenShare, Mic, MicOff, Camera, CameraOff,
  Volume2, VolumeX, Monitor, Minimize, Maximize, RefreshCw,
  Download, Upload, Copy, ExternalLink, Filter, Search, Activity
} from 'lucide-react';

import { DatabaseSchema } from '@/types/database';
import {
  CollaborationService,
  User,
  Workspace,
  CollaborationState,
  ActiveParticipant,
  Comment,
  CommentThread,
  VersionHistory,
  ActivityLog,
  Notification,
  CursorPosition,
  SelectionRange,
  UserRole
} from '@/services/collaborationService';

interface CollaborationManagerProps {
  schema: DatabaseSchema | null;
  workspaceId: string;
  currentUser: User;
  onSchemaChange?: (schema: DatabaseSchema) => void;
}

export function CollaborationManager({ schema, workspaceId, currentUser, onSchemaChange }: CollaborationManagerProps) {
  // State
  const [activeTab, setActiveTab] = useState<'participants' | 'comments' | 'history' | 'activity' | 'notifications'>('participants');
  const [collaborationState, setCollaborationState] = useState<CollaborationState | null>(null);
  const [participants, setParticipants] = useState<ActiveParticipant[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [versionHistory, setVersionHistory] = useState<VersionHistory[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // UI State
  const [showCollaborationPanel, setShowCollaborationPanel] = useState(true);
  const [showPresence, setShowPresence] = useState(true);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [showVersionForm, setShowVersionForm] = useState(false);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [newComment, setNewComment] = useState('');
  const [versionMessage, setVersionMessage] = useState('');
  const [filter, setFilter] = useState('');

  // Refs
  const collaborationPanelRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize collaboration
  useEffect(() => {
    const initializeCollaboration = async () => {
      try {
        CollaborationService.initialize(currentUser);
        const state = await CollaborationService.joinWorkspace(workspaceId, currentUser.id);
        setCollaborationState(state);
        loadCollaborationData();
      } catch (error) {
        console.error('Failed to initialize collaboration:', error);
      }
    };

    initializeCollaboration();

    return () => {
      CollaborationService.leaveWorkspace(workspaceId, currentUser.id);
    };
  }, [workspaceId, currentUser.id]);

  // Load collaboration data
  const loadCollaborationData = useCallback(() => {
    const state = CollaborationService.getCollaborationState(workspaceId);
    if (state) {
      setParticipants(state.participants);
      setComments(state.comments);
    }

    const history = CollaborationService.getVersionHistory(workspaceId);
    setVersionHistory(history);

    const activity = CollaborationService.getActivityLogs({ workspaceId, limit: 50 });
    setActivityLogs(activity);

    const userNotifications = CollaborationService.getNotifications(currentUser.id);
    setNotifications(userNotifications);
  }, [workspaceId, currentUser.id]);

  // Refresh data periodically
  useEffect(() => {
    const interval = setInterval(loadCollaborationData, 5000);
    return () => clearInterval(interval);
  }, [loadCollaborationData]);

  // Add comment
  const addComment = useCallback(async () => {
    if (!newComment.trim()) return;

    try {
      const comment = CollaborationService.addComment(workspaceId, {
        authorId: currentUser.id,
        content: newComment,
        position: { line: 0, column: 0 },
        thread: {
          id: `thread_${Date.now()}`,
          rootCommentId: '',
          replies: [],
          participants: [currentUser.id],
          status: 'open'
        },
        status: 'open',
        mentions: extractMentions(newComment),
        attachments: []
      });

      setNewComment('');
      setShowCommentForm(false);
      loadCollaborationData();
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  }, [workspaceId, currentUser.id, newComment]);

  // Create version
  const createVersion = useCallback(async () => {
    if (!versionMessage.trim()) return;

    try {
      const version = CollaborationService.createVersion(
        workspaceId,
        currentUser.id,
        versionMessage,
        ['manual']
      );

      setVersionMessage('');
      setShowVersionForm(false);
      loadCollaborationData();
    } catch (error) {
      console.error('Failed to create version:', error);
    }
  }, [workspaceId, currentUser.id, versionMessage]);

  // Restore version
  const restoreVersion = useCallback(async (versionId: string) => {
    try {
      CollaborationService.restoreVersion(workspaceId, versionId, currentUser.id);
      loadCollaborationData();
    } catch (error) {
      console.error('Failed to restore version:', error);
    }
  }, [workspaceId, currentUser.id]);

  // Mark notification as read
  const markNotificationRead = useCallback((notificationId: string) => {
    CollaborationService.markNotificationRead(currentUser.id, notificationId);
    loadCollaborationData();
  }, [currentUser.id]);

  // Extract mentions from text
  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    return mentions;
  };

  // Get user avatar
  const getUserAvatar = (userId: string) => {
    return `https://ui-avatars.com/api/?name=${userId}&background=random&color=fff&size=32`;
  };

  // Get user color
  const getUserColor = (userId: string) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
      'bg-yellow-500', 'bg-indigo-500', 'bg-red-500', 'bg-teal-500'
    ];
    const index = userId.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // Get role color
  const getRoleColor = (roleId: string) => {
    const roles = CollaborationService.getDefaultRoles();
    const role = roles.find(r => r.id === roleId);
    return role?.color || '#6B7280';
  };

  // Format time ago
  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  // Render presence indicator
  const renderPresenceIndicator = () => (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3">
        <div className="flex items-center space-x-2 mb-2">
          <Users className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-900">
            {participants.length} online
          </span>
        </div>
        <div className="flex -space-x-2">
          {participants.slice(0, 5).map((participant) => (
            <div
              key={participant.userId}
              className={`relative w-8 h-8 rounded-full border-2 border-white ${getUserColor(participant.userId)}`}
              title={participant.userId}
            >
              <img
                src={getUserAvatar(participant.userId)}
                alt={participant.userId}
                className="w-full h-full rounded-full"
              />
              <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                participant.status === 'active' ? 'bg-green-400' :
                participant.status === 'typing' ? 'bg-blue-400' :
                'bg-gray-400'
              }`} />
            </div>
          ))}
          {participants.length > 5 && (
            <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full border-2 border-white text-xs font-medium text-gray-600">
              +{participants.length - 5}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Render participants tab
  const renderParticipants = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Participants</h3>
        <button className="inline-flex items-center px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50">
          <Plus className="w-4 h-4 mr-1" />
          Invite
        </button>
      </div>

      <div className="space-y-2">
        {participants.map((participant) => (
          <div key={participant.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <img
                  src={getUserAvatar(participant.userId)}
                  alt={participant.userId}
                  className="w-10 h-10 rounded-full"
                />
                <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                  participant.status === 'active' ? 'bg-green-400' :
                  participant.status === 'typing' ? 'bg-blue-400' :
                  'bg-gray-400'
                }`} />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">{participant.userId}</span>
                  {participant.userId === currentUser.id && (
                    <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">You</span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {participant.status === 'typing' ? 'Typing...' : 
                   participant.status === 'active' ? 'Active' : 
                   `Last seen ${formatTimeAgo(participant.lastActivity)}`}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getRoleColor('editor') }}
                title="Editor"
              />
              <button className="text-gray-400 hover:text-gray-600">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Render comments tab
  const renderComments = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Comments</h3>
        <button
          onClick={() => setShowCommentForm(!showCommentForm)}
          className="inline-flex items-center px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <MessageCircle className="w-4 h-4 mr-1" />
          Add Comment
        </button>
      </div>

      {showCommentForm && (
        <div className="border border-gray-200 rounded-lg p-4">
          <textarea
            ref={commentInputRef}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment... Use @username to mention someone"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center space-x-2">
              <button className="text-gray-400 hover:text-gray-600">
                <AtSign className="w-4 h-4" />
              </button>
              <button className="text-gray-400 hover:text-gray-600">
                <Smile className="w-4 h-4" />
              </button>
              <button className="text-gray-400 hover:text-gray-600">
                <Paperclip className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowCommentForm(false)}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={addComment}
                disabled={!newComment.trim()}
                className="inline-flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300"
              >
                <Send className="w-4 h-4 mr-1" />
                Comment
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {comments.map((comment) => (
          <div key={comment.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <img
                src={getUserAvatar(comment.authorId)}
                alt={comment.authorId}
                className="w-8 h-8 rounded-full"
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-sm font-medium text-gray-900">{comment.authorId}</span>
                  <span className="text-xs text-gray-500">{formatTimeAgo(comment.createdAt)}</span>
                  {comment.status === 'resolved' && (
                    <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">Resolved</span>
                  )}
                </div>
                <div className="text-sm text-gray-700 mb-2">{comment.content}</div>
                <div className="flex items-center space-x-3 text-xs text-gray-500">
                  <button className="hover:text-gray-700">
                    <Reply className="w-3 h-3 mr-1 inline" />
                    Reply
                  </button>
                  {comment.status === 'open' && (
                    <button className="hover:text-gray-700">
                      <Check className="w-3 h-3 mr-1 inline" />
                      Resolve
                    </button>
                  )}
                  <button className="hover:text-gray-700">
                    <Flag className="w-3 h-3 mr-1 inline" />
                    Flag
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {comments.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No comments yet.</p>
          <p className="text-sm mt-2">Start a conversation by adding the first comment.</p>
        </div>
      )}
    </div>
  );

  // Render version history tab
  const renderHistory = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Version History</h3>
        <button
          onClick={() => setShowVersionForm(!showVersionForm)}
          className="inline-flex items-center px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <GitBranch className="w-4 h-4 mr-1" />
          Save Version
        </button>
      </div>

      {showVersionForm && (
        <div className="border border-gray-200 rounded-lg p-4">
          <input
            type="text"
            value={versionMessage}
            onChange={(e) => setVersionMessage(e.target.value)}
            placeholder="Version description (e.g., 'Added user table')"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex items-center justify-end space-x-2 mt-3">
            <button
              onClick={() => setShowVersionForm(false)}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={createVersion}
              disabled={!versionMessage.trim()}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300"
            >
              Save Version
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {versionHistory.map((version) => (
          <div key={version.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm font-medium text-gray-900">
                  Version {version.version}
                  {version.message && `: ${version.message}`}
                </div>
                <div className="text-xs text-gray-500">
                  {formatTimeAgo(version.createdAt)} by {version.authorId}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">{Math.round(version.size / 1024)}KB</span>
                <button
                  onClick={() => restoreVersion(version.id)}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                >
                  Restore
                </button>
              </div>
            </div>
            {version.tags.length > 0 && (
              <div className="flex items-center space-x-1 mt-2">
                {version.tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {versionHistory.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No versions saved yet.</p>
          <p className="text-sm mt-2">Save your first version to track changes.</p>
        </div>
      )}
    </div>
  );

  // Render activity tab
  const renderActivity = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Activity</h3>
        <button className="text-gray-400 hover:text-gray-600">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        {activityLogs.map((log) => (
          <div key={log.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg">
            <div className={`w-2 h-2 rounded-full mt-2 ${
              log.action.includes('created') ? 'bg-green-400' :
              log.action.includes('updated') ? 'bg-blue-400' :
              log.action.includes('deleted') ? 'bg-red-400' :
              'bg-gray-400'
            }`} />
            <div className="flex-1">
              <div className="text-sm text-gray-900">
                <span className="font-medium">{log.userId}</span> {log.action.replace('.', ' ')}
              </div>
              <div className="text-xs text-gray-500">{formatTimeAgo(log.timestamp)}</div>
            </div>
          </div>
        ))}
      </div>

      {activityLogs.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No recent activity.</p>
        </div>
      )}
    </div>
  );

  // Render notifications tab
  const renderNotifications = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
        <span className="text-sm text-gray-500">
          {notifications.filter(n => !n.read).length} unread
        </span>
      </div>

      <div className="space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-3 border rounded-lg cursor-pointer ${
              notification.read ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'
            }`}
            onClick={() => markNotificationRead(notification.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">{notification.title}</div>
                <div className="text-sm text-gray-600 mt-1">{notification.message}</div>
                <div className="text-xs text-gray-500 mt-1">{formatTimeAgo(notification.createdAt)}</div>
              </div>
              {!notification.read && (
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
              )}
            </div>
          </div>
        ))}
      </div>

      {notifications.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No notifications.</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-full">
      {/* Main Content Area */}
      <div className="flex-1">
        {/* Presence indicators would be rendered here */}
        {showPresence && renderPresenceIndicator()}
        
        {/* Live cursors would be rendered here */}
        {/* Live selections would be rendered here */}
        
        {/* Main content goes here - schema designer, query runner, etc. */}
        <div className="h-full bg-gray-50 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Real-time Collaboration Active</h3>
            <p className="text-sm">
              {participants.length} participant{participants.length !== 1 ? 's' : ''} online
            </p>
            <p className="text-xs mt-2">
              Live cursors, presence, and real-time editing are enabled
            </p>
          </div>
        </div>
      </div>

      {/* Collaboration Panel */}
      {showCollaborationPanel && (
        <div 
          ref={collaborationPanelRef}
          className="w-80 bg-white border-l border-gray-200 flex flex-col"
        >
          {/* Panel Header */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Collaboration</h2>
              <button
                onClick={() => setShowCollaborationPanel(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex mt-3 -mb-px">
              {[
                { id: 'participants', label: 'People', icon: Users, count: participants.length },
                { id: 'comments', label: 'Comments', icon: MessageCircle, count: comments.length },
                { id: 'history', label: 'History', icon: History, count: versionHistory.length },
                { id: 'activity', label: 'Activity', icon: Activity, count: activityLogs.length },
                { id: 'notifications', label: 'Alerts', icon: Bell, count: notifications.filter(n => !n.read).length }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center px-3 py-2 text-sm font-medium border-b-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon className="w-4 h-4 mr-1" />
                  {tab.count > 0 && (
                    <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                      activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-auto p-4">
            {activeTab === 'participants' && renderParticipants()}
            {activeTab === 'comments' && renderComments()}
            {activeTab === 'history' && renderHistory()}
            {activeTab === 'activity' && renderActivity()}
            {activeTab === 'notifications' && renderNotifications()}
          </div>
        </div>
      )}

      {/* Floating collaboration toggle */}
      {!showCollaborationPanel && (
        <button
          onClick={() => setShowCollaborationPanel(true)}
          className="fixed bottom-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 z-50"
        >
          <Users className="w-6 h-6" />
          {notifications.filter(n => !n.read).length > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {notifications.filter(n => !n.read).length}
            </div>
          )}
        </button>
      )}
    </div>
  );
}
