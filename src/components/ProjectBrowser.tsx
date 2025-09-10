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
  connected: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50', label: 'Connected' },
  syncing: { icon: RefreshCw, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Syncing' },
  error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', label: 'Error' },
  disconnected: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-50', label: 'Disconnected' }
};

export function ProjectBrowser({ onProjectSelect, onAddProject, onGitHubConnect, onSyncProject }: ProjectBrowserProps) {
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

  // Mock data - in real implementation, this would come from an API
  useEffect(() => {
    const mockProjects: Project[] = [
      {
        id: '1',
        name: 'E-commerce API',
        description: 'Node.js REST API for e-commerce platform',
        path: '/Users/dev/projects/ecommerce-api',
        projectType: 'nodejs',
        type: 'local',
        localPath: '/Users/dev/projects/ecommerce-api',
        databases: [],
        configFiles: [],
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-20'),
        lastSyncedAt: new Date('2024-01-20'),
        status: 'connected',
        metadata: {
          version: '1.0.0',
          packageManager: 'npm',
          language: 'javascript',
          dependencies: ['express', 'mongoose', 'cors'],
          scripts: { start: 'node server.js', dev: 'nodemon server.js' },
          environment: 'development'
        }
      },
      {
        id: '2',
        name: 'Data Analytics Dashboard',
        description: 'Python Django application with PostgreSQL',
        path: '/Users/dev/projects/analytics-dashboard',
        projectType: 'django',
        type: 'github',
        repository: {
          id: 12345,
          name: 'analytics-dashboard',
          full_name: 'myorg/analytics-dashboard',
          private: true,
          owner: {
            id: 67890,
            login: 'myorg',
            type: 'Organization'
          } as any,
          html_url: 'https://github.com/myorg/analytics-dashboard',
          description: 'Data analytics dashboard with Django and PostgreSQL',
          default_branch: 'main'
        } as any,
        branch: 'main',
        clonePath: '/tmp/queryflow/analytics-dashboard',
        databases: [],
        configFiles: [],
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-19'),
        lastSyncedAt: new Date('2024-01-19'),
        status: 'syncing',
        metadata: {
          version: '2.1.0',
          packageManager: 'pip',
          language: 'python',
          dependencies: ['django', 'pandas', 'plotly'],
          environment: 'production'
        }
      },
      {
        id: '3',
        name: 'Legacy PHP System',
        description: 'Old PHP application with MySQL database',
        path: '/var/www/legacy-system',
        projectType: 'php',
        type: 'local',
        localPath: '/var/www/legacy-system',
        databases: [],
        configFiles: [],
        createdAt: new Date('2024-01-05'),
        updatedAt: new Date('2024-01-18'),
        status: 'error',
        metadata: {
          language: 'php',
          packageManager: 'composer',
          environment: 'staging'
        }
      }
    ];

    setTimeout(() => {
      setProjects(mockProjects);
      setFilteredProjects(mockProjects);
      setLoading(false);

      // Calculate stats
      const stats: ProjectStats = {
        totalProjects: mockProjects.length,
        connectedProjects: mockProjects.filter(p => p.status === 'connected').length,
        syncingProjects: mockProjects.filter(p => p.status === 'syncing').length,
        errorProjects: mockProjects.filter(p => p.status === 'error').length,
        totalDatabases: mockProjects.reduce((sum, p) => sum + p.databases.length, 0),
        activeSyncs: mockProjects.filter(p => p.status === 'syncing').length
      };
      setStats(stats);
    }, 1000);
  }, []);

  // Filter and sort projects
  useEffect(() => {
    let filtered = [...projects];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        PROJECT_TYPE_NAMES[project.projectType].toLowerCase().includes(searchQuery.toLowerCase())
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
          aValue = PROJECT_TYPE_NAMES[a.projectType];
          bValue = PROJECT_TYPE_NAMES[b.projectType];
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
    const types = new Set(projects.map(p => p.projectType));
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
                {PROJECT_TYPE_ICONS[project.projectType]}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                <p className="text-sm text-gray-600">{PROJECT_TYPE_NAMES[project.projectType]}</p>
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
