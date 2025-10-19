'use client';

// Project Browser Component
// Main dashboard for managing linked projects

import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  Github,
  Database,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  Plus,
  Search,
  Filter,
  MoreVertical,
  ExternalLink,
  RefreshCw as Sync,
  Trash2,
  Edit,
  Play,
  Pause,
  BarChart3,
  Github as GitHubIcon,
  Server,
  Activity
} from 'lucide-react';
import { Project, ProjectType, ProjectStatus } from '@/types/project';

interface ProjectBrowserProps {
  onProjectSelect: (project: Project) => void;
  onAddProject: () => void;
  onGitHubConnect?: () => void;
  onSyncProject?: (project: Project) => void;
}

interface ProjectStats {
  totalProjects: number;
  connectedProjects: number;
  syncingProjects: number;
  errorProjects: number;
  totalDatabases: number;
  activeSyncs: number;
}

const PROJECT_TYPE_ICONS: Record<ProjectType, string> = {
  nodejs: '📦',
  python: '🐍',
  django: '🎸',
  flask: '🧪',
  fastapi: '⚡',
  laravel: '🎭',
  rails: '🚂',
  spring: '🌱',
  dotnet: '🔷',
  react: '⚛️',
  vue: '💚',
  angular: '🅰️',
  nextjs: '▲',
  express: '🚀',
  php: '🐘',
  unknown: '❓'
};

const PROJECT_TYPE_NAMES: Record<ProjectType, string> = {
  nodejs: 'Node.js',
  python: 'Python',
  django: 'Django',
  flask: 'Flask',
  fastapi: 'FastAPI',
  laravel: 'Laravel',
  rails: 'Ruby on Rails',
  spring: 'Spring Boot',
  dotnet: '.NET',
  react: 'React',
  vue: 'Vue.js',
  angular: 'Angular',
  nextjs: 'Next.js',
  express: 'Express.js',
  php: 'PHP',
  unknown: 'Unknown'
};

const STATUS_CONFIG = {
  detecting: { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Detecting' },
  linking: { icon: RefreshCw, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Linking' },
  connecting: { icon: RefreshCw, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Connecting' },
  connected: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50', label: 'Connected' },
  syncing: { icon: RefreshCw, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Syncing' },
  error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', label: 'Error' },
  disconnected: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-50', label: 'Disconnected' }
};

export function ProjectBrowser({ onProjectSelect, onAddProject, onGitHubConnect, onSyncProject }: ProjectBrowserProps) {
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
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ProjectType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'status' | 'lastSynced'>('lastSynced');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ProjectStats>({
    totalProjects: 0,
    connectedProjects: 0,
    syncingProjects: 0,
    errorProjects: 0,
    totalDatabases: 0,
    activeSyncs: 0
  });

  // Fetch real projects from API
  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/projects');
        if (!response.ok) {
          throw new Error('Failed to fetch projects');
        }
        
        const realProjects = await response.json();
        
        // Parse date fields
        const parsedProjects = realProjects.map((proj: any) => ({
          ...proj,
          createdAt: proj.createdAt ? new Date(proj.createdAt) : new Date(),
          updatedAt: proj.updatedAt ? new Date(proj.updatedAt) : new Date(),
          lastSynced: proj.lastSynced ? new Date(proj.lastSynced) : undefined,
        }));
        
        setProjects(parsedProjects);
        setFilteredProjects(parsedProjects);
        
        // Calculate stats from real projects
        const stats: ProjectStats = {
          totalProjects: parsedProjects.length,
          connectedProjects: parsedProjects.filter((p: Project) => p.status === 'connected').length,
          syncingProjects: parsedProjects.filter((p: Project) => p.status === 'syncing').length,
          errorProjects: parsedProjects.filter((p: Project) => p.status === 'error').length,
          totalDatabases: parsedProjects.reduce((sum: number, p: Project) => sum + (p.databases?.length || 0), 0),
          activeSyncs: parsedProjects.filter((p: Project) => p.status === 'syncing').length
        };
        setStats(stats);
      } catch (error) {
        console.error('Failed to fetch projects:', error);
        setLoading(false);
        // On error, show empty list instead of mock data
        setProjects([]);
        setFilteredProjects([]);
      }
    };
    
    fetchProjects();
  }, []);

  // Filter and sort projects
  useEffect(() => {
    let filtered = [...projects];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (project.projectType ? PROJECT_TYPE_NAMES[project.projectType] : '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(project => project.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(project => project.projectType === typeFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'type':
          aValue = a.projectType ? PROJECT_TYPE_NAMES[a.projectType] : '';
          bValue = b.projectType ? PROJECT_TYPE_NAMES[b.projectType] : '';
          break;
        case 'status':
          aValue = STATUS_CONFIG[a.status].label;
          bValue = STATUS_CONFIG[b.status].label;
          break;
        case 'lastSynced':
          aValue = a.lastSyncedAt?.getTime() || 0;
          bValue = b.lastSyncedAt?.getTime() || 0;
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setFilteredProjects(filtered);
  }, [projects, searchQuery, statusFilter, typeFilter, sortBy, sortOrder]);

  // Handle project actions
  const handleProjectAction = async (project: Project, action: string) => {
    switch (action) {
      case 'select':
        onProjectSelect(project);
        break;
      case 'sync':
        // Start sync session for the project
        if (project.databases.length > 0) {
          try {
            const database = project.databases[0];
            // Import DatabaseSyncService dynamically to avoid circular dependencies
            const { DatabaseSyncService } = await import('../services/databaseSyncService');

            const session = await DatabaseSyncService.startSyncSession(
              project.id,
              database.id
            );

            console.log('Started sync session:', session.id);
            // Navigate to sync tab to monitor progress
            if (onSyncProject) {
              onSyncProject(project);
            } else if (onProjectSelect) {
              onProjectSelect(project);
            }
          } catch (error) {
            console.error('Failed to start sync:', error);
            alert('Failed to start sync session. Please check database connections.');
          }
        } else {
          alert('No databases found for this project.');
        }
        break;
      case 'settings':
        // Open project settings
        console.log('Opening settings for:', project.name);
        alert('Project settings feature coming soon!');
        break;
      case 'delete':
        // Delete project
        if (confirm(`Are you sure you want to remove "${project.name}"? This will also remove all associated data.`)) {
          setProjects(prev => prev.filter(p => p.id !== project.id));
          // In a real implementation, this would call an API to delete the project
          console.log('Project deleted:', project.name);
        }
        break;
    }
  };

  // Get unique project types for filter
  const getUniqueTypes = () => {
    const types = new Set(projects.map(p => p.projectType).filter((type): type is ProjectType => Boolean(type)));
    return Array.from(types);
  };

  // Render stats cards
  const renderStatsCards = () => {
    const cards = [
      {
        label: 'Total Projects',
        value: stats.totalProjects,
        IconComponent: FolderOpen,
        color: 'text-blue-600',
        bg: 'bg-blue-50'
      },
      {
        label: 'Connected',
        value: stats.connectedProjects,
        IconComponent: CheckCircle,
        color: 'text-green-600',
        bg: 'bg-green-50'
      },
      {
        label: 'Syncing',
        value: stats.syncingProjects,
        IconComponent: RefreshCw,
        color: 'text-blue-600',
        bg: 'bg-blue-50'
      },
      {
        label: 'Errors',
        value: stats.errorProjects,
        IconComponent: AlertTriangle,
        color: 'text-red-600',
        bg: 'bg-red-50'
      },
      {
        label: 'Databases',
        value: stats.totalDatabases,
        IconComponent: Database,
        color: 'text-purple-600',
        bg: 'bg-purple-50'
      },
      {
        label: 'Active Syncs',
        value: stats.activeSyncs,
        IconComponent: BarChart3,
        color: 'text-indigo-600',
        bg: 'bg-indigo-50'
      }
    ];

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {cards.map((card, index) => (
          <div key={index} className={`${card.bg} rounded-lg p-4`}>
            <div className="flex items-center">
              <card.IconComponent className={`w-8 h-8 ${card.color} mr-3`} />
              <div>
                <div className="text-2xl font-bold text-gray-900">{card.value}</div>
                <div className="text-sm text-gray-600">{card.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render project card
  const renderProjectCard = (project: Project) => {
    const statusConfig = STATUS_CONFIG[project.status];
    const StatusIcon = statusConfig.icon;

    return (
      <div key={project.id} className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center">
              <div className="text-2xl mr-3">
                {project.projectType ? PROJECT_TYPE_ICONS[project.projectType] : '📁'}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-600">{project.projectType ? PROJECT_TYPE_NAMES[project.projectType] : 'Unknown'}</p>
                  {getDatabaseType(project) && (
                    <div className="px-2 py-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded text-xs font-semibold shadow-sm">
                      {getDatabaseType(project)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {project.type === 'github' && (
                <Github className="w-4 h-4 text-gray-400" />
              )}
              <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bg}`}>
                <StatusIcon className={`w-3 h-3 mr-1 ${statusConfig.color}`} />
                <span className={statusConfig.color}>{statusConfig.label}</span>
              </div>
            </div>
          </div>

          {project.description && (
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
              {project.description}
            </p>
          )}

          <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
            <span>Last synced: {project.lastSyncedAt ? project.lastSyncedAt.toLocaleDateString() : 'Never'}</span>
            <span>{project.databases.length} databases</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              <button
                onClick={() => handleProjectAction(project, 'select')}
                className="inline-flex items-center px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 transition-colors"
              >
                Open
              </button>
              <button
                onClick={() => handleProjectAction(project, 'sync')}
                className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 transition-colors"
              >
                <Sync className="w-3 h-3 mr-1" />
                Sync
              </button>
            </div>

            <div className="relative">
              <button className="p-1 text-gray-400 hover:text-gray-600">
                <MoreVertical className="w-4 h-4" />
              </button>
              {/* Dropdown menu would go here */}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-orange-600" />
          <p className="text-gray-600">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Project Browser</h1>
              <p className="text-sm text-gray-600">Manage your linked projects and databases</p>
            </div>

            <div className="flex items-center space-x-3">
              {onGitHubConnect && (
                <button
                  onClick={onGitHubConnect}
                  className="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <GitHubIcon className="w-4 h-4 mr-2" />
                  Connect GitHub
                </button>
              )}
              <button
                onClick={onAddProject}
                className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Project
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {renderStatsCards()}

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 w-64"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | 'all')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="all">All Status</option>
                  {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                    <option key={status} value={status}>{config.label}</option>
                  ))}
                </select>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as ProjectType | 'all')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="all">All Types</option>
                  {getUniqueTypes().map(type => (
                    <option key={type} value={type}>{PROJECT_TYPE_NAMES[type]}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-4">
                <select
                  value={`${sortBy}_${sortOrder}`}
                  onChange={(e) => {
                    const [sort, order] = e.target.value.split('_');
                    setSortBy(sort as any);
                    setSortOrder(order as any);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="lastSynced_desc">Last Synced ↓</option>
                  <option value="lastSynced_asc">Last Synced ↑</option>
                  <option value="name_asc">Name A-Z</option>
                  <option value="name_desc">Name Z-A</option>
                  <option value="type_asc">Type A-Z</option>
                  <option value="type_desc">Type Z-A</option>
                </select>
              </div>
            </div>
          </div>

          {/* Project Grid */}
          <div className="p-6">
            {filteredProjects.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {projects.length === 0 ? 'No projects found' : 'No projects match your filters'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {projects.length === 0
                    ? 'Get started by linking your first project'
                    : 'Try adjusting your search or filter criteria'
                  }
                </p>
                {projects.length === 0 && (
                  <button
                    onClick={onAddProject}
                    className="inline-flex items-center px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Your First Project
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map(renderProjectCard)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
