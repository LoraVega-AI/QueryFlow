'use client';

// GitHub Connector Component
// Handles GitHub OAuth authentication and repository management

import React, { useState, useEffect, useCallback } from 'react';
import {
  Github,
  Search,
  Star,
  GitFork,
  Calendar,
  ExternalLink,
  Download,
  CheckCircle,
  AlertCircle,
  Loader,
  X,
  RefreshCw,
  Filter
} from 'lucide-react';
import {
  GitHubRepository,
  GitHubUser,
  GitHubRepositorySearchOptions,
  GitHubRepositorySearchResult,
  GitHubAuthState,
  GitHubCloneOptions,
  GitHubCloneResult
} from '@/types/github';

interface GitHubConnectorProps {
  onRepositorySelected: (repository: GitHubRepository) => void;
  onClose: () => void;
}

interface RepositoryFilters {
  type: 'all' | 'owner' | 'public' | 'private' | 'member';
  sort: 'created' | 'updated' | 'pushed' | 'full_name';
  language: string;
  archived: boolean;
}

const GITHUB_SCOPES = ['repo', 'user', 'read:org'];
const GITHUB_CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || 'your_github_client_id';

export function GitHubConnector({ onRepositorySelected, onClose }: GitHubConnectorProps) {
  const [authState, setAuthState] = useState<GitHubAuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null
  });

  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [filteredRepos, setFilteredRepos] = useState<GitHubRepository[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<RepositoryFilters>({
    type: 'all',
    sort: 'updated',
    language: '',
    archived: false
  });

  const [loading, setLoading] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepository | null>(null);
  const [cloning, setCloning] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Initialize GitHub authentication
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (code && state) {
      // Handle OAuth callback
      handleOAuthCallback(code, state);
    } else {
      // Check for existing authentication
      checkExistingAuth();
    }
  }, []);

  // Handle OAuth callback
  const handleOAuthCallback = async (code: string, state: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true }));

    try {
      // Exchange code for access token
      const response = await fetch('/api/github/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, state })
      });

      if (!response.ok) {
        throw new Error('Failed to authenticate with GitHub');
      }

      const data = await response.json();

      setAuthState({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });

      // Load user repositories
      await loadUserRepositories(data.token);

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);

    } catch (error) {
      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      });
    }
  };

  // Check for existing authentication
  const checkExistingAuth = async () => {
    try {
      const response = await fetch('/api/github/auth/status');
      if (response.ok) {
        const data = await response.json();
        if (data.authenticated) {
          setAuthState({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });
          await loadUserRepositories(data.token);
        }
      }
    } catch (error) {
      console.error('Failed to check auth status:', error);
    }
  };

  // Initiate GitHub OAuth flow
  const initiateOAuth = () => {
    const state = Math.random().toString(36).substring(7);
    const scope = GITHUB_SCOPES.join(' ');

    const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=${scope}&state=${state}&redirect_uri=${encodeURIComponent(window.location.origin)}`;

    // Store state for verification
    sessionStorage.setItem('github_oauth_state', state);

    window.location.href = authUrl;
  };

  // Load user repositories
  const loadUserRepositories = async (token: any) => {
    setLoading(true);

    try {
      const response = await fetch('/api/github/repositories', {
        headers: {
          'Authorization': `Bearer ${token.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load repositories');
      }

      const repos = await response.json();
      setRepositories(repos);
      setFilteredRepos(repos);

    } catch (error) {
      console.error('Failed to load repositories:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter repositories
  useEffect(() => {
    let filtered = [...repositories];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(repo =>
        repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repo.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter(repo => {
        switch (filters.type) {
          case 'owner':
            return repo.owner.type === 'User';
          case 'public':
            return !repo.private;
          case 'private':
            return repo.private;
          case 'member':
            return repo.owner.type === 'Organization';
          default:
            return true;
        }
      });
    }

    // Language filter
    if (filters.language) {
      filtered = filtered.filter(repo => repo.language === filters.language);
    }

    // Archived filter
    if (!filters.archived) {
      filtered = filtered.filter(repo => !repo.archived);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (filters.sort) {
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'updated':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'pushed':
          return new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime();
        case 'full_name':
          return a.full_name.localeCompare(b.full_name);
        default:
          return 0;
      }
    });

    setFilteredRepos(filtered);
  }, [repositories, searchQuery, filters]);

  // Handle repository selection
  const handleRepositorySelect = async (repository: GitHubRepository) => {
    setSelectedRepo(repository);
    setCloning(true);

    try {
      // Clone repository
      const cloneResult = await cloneRepository(repository);

      if (cloneResult.success) {
        onRepositorySelected(repository);
        onClose();
      } else {
        console.error('Failed to clone repository:', cloneResult.error);
      }
    } catch (error) {
      console.error('Repository selection failed:', error);
    } finally {
      setCloning(false);
    }
  };

  // Clone repository
  const cloneRepository = async (repository: GitHubRepository): Promise<GitHubCloneResult> => {
    try {
      const response = await fetch('/api/github/repositories/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repository: repository.full_name,
          branch: repository.default_branch
        })
      });

      if (!response.ok) {
        throw new Error('Failed to clone repository');
      }

      return await response.json();
    } catch (error) {
      return {
        success: false,
        localPath: '',
        branch: '',
        error: error instanceof Error ? error.message : 'Clone failed'
      };
    }
  };

  // Get unique languages for filter
  const getUniqueLanguages = () => {
    const languages = new Set(repositories.map(repo => repo.language).filter(Boolean));
    return Array.from(languages).sort();
  };

  // Render authentication section
  const renderAuthSection = () => {
    if (authState.isAuthenticated && authState.user) {
      return (
        <div className="flex items-center justify-between p-4 bg-green-50 border-b border-green-200">
          <div className="flex items-center">
            <img
              src={authState.user.avatar_url}
              alt={authState.user.login}
              className="w-8 h-8 rounded-full mr-3"
            />
            <div>
              <div className="font-medium text-green-900">
                Connected as {authState.user.login}
              </div>
              <div className="text-sm text-green-700">
                {repositories.length} repositories available
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              // Sign out logic would go here
              setAuthState({
                user: null,
                token: null,
                isAuthenticated: false,
                isLoading: false,
                error: null
              });
              setRepositories([]);
              setFilteredRepos([]);
            }}
            className="text-sm text-green-700 hover:text-green-900"
          >
            Sign out
          </button>
        </div>
      );
    }

    if (authState.isLoading) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader className="w-6 h-6 animate-spin mr-2" />
          <span>Connecting to GitHub...</span>
        </div>
      );
    }

    return (
      <div className="text-center p-8">
        <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Github className="w-8 h-8 text-gray-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Connect GitHub Account
        </h3>
        <p className="text-gray-600 mb-6">
          Link your GitHub account to access and clone repositories
        </p>
        <button
          onClick={initiateOAuth}
          className="inline-flex items-center px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Github className="w-5 h-5 mr-2" />
          Connect GitHub
        </button>
        {authState.error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
              <span className="text-sm text-red-800">{authState.error}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render repository list
  const renderRepositoryList = () => {
    if (!authState.isAuthenticated) return null;

    if (loading) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader className="w-6 h-6 animate-spin mr-2" />
          <span>Loading repositories...</span>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-hidden">
        {/* Search and Filters */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search repositories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 text-gray-400 hover:text-gray-600 border border-gray-300 rounded-lg"
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="all">All</option>
                  <option value="owner">My repositories</option>
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                  <option value="member">Member of</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Language
                </label>
                <select
                  value={filters.language}
                  onChange={(e) => setFilters(prev => ({ ...prev, language: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">All languages</option>
                  {getUniqueLanguages().map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Repository List */}
        <div className="flex-1 overflow-y-auto">
          {filteredRepos.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Github className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No repositories found
              </h3>
              <p className="text-gray-600">
                {searchQuery ? 'Try adjusting your search or filters' : 'No repositories available'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredRepos.map((repo) => (
                <div key={repo.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center mb-2">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {repo.name}
                        </h4>
                        {repo.private && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            Private
                          </span>
                        )}
                        {repo.archived && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                            Archived
                          </span>
                        )}
                      </div>

                      {repo.description && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {repo.description}
                        </p>
                      )}

                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        {repo.language && (
                          <span className="flex items-center">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                            {repo.language}
                          </span>
                        )}
                        <span className="flex items-center">
                          <Star className="w-3 h-3 mr-1" />
                          {repo.stargazers_count}
                        </span>
                        <span className="flex items-center">
                          <GitFork className="w-3 h-3 mr-1" />
                          {repo.forks_count}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(repo.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>

                      <button
                        onClick={() => handleRepositorySelect(repo)}
                        disabled={cloning && selectedRepo?.id === repo.id}
                        className="inline-flex items-center px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 disabled:opacity-50"
                      >
                        {cloning && selectedRepo?.id === repo.id ? (
                          <>
                            <Loader className="w-3 h-3 mr-1 animate-spin" />
                            Cloning...
                          </>
                        ) : (
                          <>
                            <Download className="w-3 h-3 mr-1" />
                            Clone
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
              <Github className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Connect GitHub Repository
              </h2>
              <p className="text-sm text-gray-600">
                Select a repository to link with QueryFlow
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Authentication Section */}
        {renderAuthSection()}

        {/* Repository List */}
        {renderRepositoryList()}
      </div>
    </div>
  );
}
