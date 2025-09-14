'use client';

// Advanced Search component for comprehensive search across project data
// This component provides real-time search, filtering, and analytics for project databases

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Search, Filter, Download, Star, Clock, FileText, Database, Table as TableIcon, User, Zap, Target, Layers, BarChart3, Monitor, Activity, TrendingUp, Globe, Shield, Users, Calendar, Timer, Bell, Mail, MessageSquare, Link, ExternalLink, ArrowRight, ArrowDown, ArrowUp, ChevronRight, ChevronDown, ChevronUp, MoreHorizontal, MoreVertical, Bookmark, Share2, Maximize2, Minimize2, RotateCcw, Save, Edit, Copy, Move, Trash, Archive, RefreshCw, Code, GitBranch, AlertTriangle, CheckCircle, XCircle, Info, HelpCircle, Plus, Minus, X, Check, Loader2, MessageCircle, Lightbulb, Settings, Folder, Tag, Eye, EyeOff, Play, Pause, SortAsc, SortDesc, Filter as FilterIcon, Menu } from 'lucide-react';
import { useProjectData } from '@/hooks/useProjectData';

interface AdvancedSearchProps {
  schema?: any; // Made optional since we get it from project
}

interface SearchResult {
  id: string;
  title: string;
  description: string;
  type: 'table' | 'column' | 'query' | 'data' | 'schema' | 'audit';
  relevance: number;
  metadata?: Record<string, any>;
  timestamp?: Date;
}

interface SearchFilters {
  types?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
}

export function AdvancedSearch({ schema: propSchema }: AdvancedSearchProps) {
  // Use project data hook to get current project schema
  const {
    currentProject,
    projectSchema,
    hasProject,
    executeProjectQuery,
    getTableNames,
    getColumnNames
  } = useProjectData();

  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'alphabetical'>('relevance');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Use project schema if available, otherwise fall back to prop
  const schema = projectSchema || propSchema;

  // Debounced search query for real-time search
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Perform search
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim() || !hasProject) return;

    setIsSearching(true);
    setNotification(null);

    try {
      const results: SearchResult[] = [];

      // Search in table names
      const tableNames = getTableNames();
      tableNames.forEach(tableName => {
        if (tableName.toLowerCase().includes(query.toLowerCase())) {
          results.push({
            id: `table-${tableName}`,
            title: tableName,
            description: `Database table with columns: ${getColumnNames(tableName).join(', ')}`,
            type: 'table',
            relevance: 0.9,
            metadata: {
              tableName,
              columnCount: getColumnNames(tableName).length
            }
          });
        }
      });

      // Search in column names
      tableNames.forEach(tableName => {
        const columnNames = getColumnNames(tableName);
        columnNames.forEach(columnName => {
          if (columnName.toLowerCase().includes(query.toLowerCase())) {
            results.push({
              id: `column-${tableName}-${columnName}`,
              title: `${tableName}.${columnName}`,
              description: `Column in table ${tableName}`,
              type: 'column',
              relevance: 0.8,
              metadata: {
                tableName,
                columnName
              }
            });
          }
        });
      });

      // Search in actual data (sample rows)
      if (tableNames.length > 0) {
        for (const tableName of tableNames.slice(0, 5)) { // Limit to first 5 tables for performance
          try {
            const result = await executeProjectQuery(`SELECT * FROM "${tableName}" LIMIT 10`);
            if (result.rows && result.rows.length > 0) {
              result.rows.forEach((row: any, rowIndex: number) => {
                Object.entries(row).forEach(([columnName, value]) => {
                  if (value && String(value).toLowerCase().includes(query.toLowerCase())) {
                    results.push({
                      id: `data-${tableName}-${rowIndex}-${columnName}`,
                      title: `${tableName} - Row ${rowIndex + 1}`,
                      description: `${columnName}: ${String(value).substring(0, 100)}...`,
                      type: 'data',
                      relevance: 0.7,
                      metadata: {
                        tableName,
                        columnName,
                        rowIndex: rowIndex + 1,
                        value: String(value)
                      }
                    });
                  }
                });
              });
            }
          } catch (error) {
            console.warn(`Could not search table ${tableName}:`, error);
          }
        }
      }

      // Sort results by relevance
      results.sort((a, b) => b.relevance - a.relevance);

      setSearchResults(results);
      setNotification({
        type: 'success',
        message: `Found ${results.length} results for "${query}"`
      });

      // Auto-dismiss notification
      setTimeout(() => setNotification(null), 3000);

    } catch (error: any) {
      console.error('Search failed:', error);
      setNotification({
        type: 'error',
        message: 'Search failed. Please try again.'
      });
    } finally {
      setIsSearching(false);
    }
  }, [hasProject, getTableNames, getColumnNames, executeProjectQuery]);

  // Trigger search when debounced query changes
  useEffect(() => {
    if (debouncedSearchQuery.trim()) {
      performSearch(debouncedSearchQuery);
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearchQuery, performSearch]);

  // Handle search input
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      performSearch(searchQuery);
    }
  }, [searchQuery, performSearch]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedResults(new Set());
    setNotification(null);
  }, []);

  // Export results
  const exportResults = useCallback(() => {
    if (searchResults.length === 0) return;

    const csv = searchResults.map(result =>
      `${result.type},${result.title},${result.description},${result.relevance}`
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `search_results_${currentProject?.name || 'project'}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setNotification({
      type: 'success',
      message: 'Results exported successfully'
    });
    setTimeout(() => setNotification(null), 3000);
  }, [searchResults, currentProject]);

  // Select all results
  const selectAllResults = useCallback(() => {
    if (selectedResults.size === searchResults.length) {
      setSelectedResults(new Set());
    } else {
      setSelectedResults(new Set(searchResults.map(r => r.id)));
    }
  }, [searchResults, selectedResults]);

  // Toggle result selection
  const toggleResultSelection = useCallback((resultId: string) => {
    const newSelected = new Set(selectedResults);
    if (newSelected.has(resultId)) {
      newSelected.delete(resultId);
    } else {
      newSelected.add(resultId);
    }
    setSelectedResults(newSelected);
  }, [selectedResults]);

  // Sort results
  const sortedResults = useMemo(() => {
    const sorted = [...searchResults];

    switch (sortBy) {
      case 'relevance':
        sorted.sort((a, b) => (sortOrder === 'desc' ? b.relevance - a.relevance : a.relevance - b.relevance));
        break;
      case 'alphabetical':
        sorted.sort((a, b) => (sortOrder === 'desc' ? b.title.localeCompare(a.title) : a.title.localeCompare(b.title)));
        break;
      case 'date':
        sorted.sort((a, b) => {
          const aDate = a.timestamp || new Date(0);
          const bDate = b.timestamp || new Date(0);
          return sortOrder === 'desc' ? bDate.getTime() - aDate.getTime() : aDate.getTime() - bDate.getTime();
        });
        break;
    }

    return sorted;
  }, [searchResults, sortBy, sortOrder]);

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-white">Advanced Search</h2>
            {currentProject && (
              <div className="flex items-center space-x-2 bg-orange-600 text-white px-3 py-1 rounded-md text-sm">
                <Database className="w-4 h-4" />
                <span>{currentProject.name}</span>
              </div>
            )}
          </div>
          <span className="text-sm text-gray-300">Next-generation enterprise search platform</span>
        </div>

        {/* Header Actions */}
        <div className="flex items-center space-x-2">
          {searchResults.length > 0 && (
            <>
              <button
                onClick={selectAllResults}
                className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
              >
                {selectedResults.size === searchResults.length ? 'Deselect All' : 'Select All'}
              </button>
              <button
                onClick={exportResults}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors flex items-center space-x-1"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            </>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 transition-colors ${showFilters ? 'text-orange-400' : 'text-gray-400 hover:text-white'}`}
            title="Toggle Filters"
          >
            <FilterIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4 bg-gray-800 border-b border-gray-700">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search across tables, columns, and data..."
                className="w-full pl-10 pr-4 py-3 bg-gray-700 text-white rounded-md border border-gray-600 focus:border-orange-500 focus:outline-none"
                disabled={!hasProject}
              />
            </div>
            <button
              type="submit"
              disabled={!searchQuery.trim() || isSearching || !hasProject}
              className="px-6 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="px-4 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {/* Search Stats */}
          {searchResults.length > 0 && (
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>{searchResults.length} results found</span>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span>Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="alphabetical">Alphabetical</option>
                    <option value="date">Date</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="p-1 text-gray-400 hover:text-white"
                  >
                    {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="p-4 bg-gray-800 border-b border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Content Types</label>
              <div className="space-y-2">
                {['table', 'column', 'data', 'query', 'schema'].map((type) => (
                  <label key={type} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.types?.includes(type) || false}
                      onChange={(e) => {
                        const newTypes = filters.types || [];
                        if (e.target.checked) {
                          setFilters({ ...filters, types: [...newTypes, type] });
                        } else {
                          setFilters({ ...filters, types: newTypes.filter(t => t !== type) });
                        }
                      }}
                      className="rounded border-gray-600 bg-gray-700 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="ml-2 text-gray-300 capitalize">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Date Range</label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={filters.dateRange?.start ? filters.dateRange.start.toISOString().split('T')[0] : ''}
                  onChange={(e) => setFilters({
                    ...filters,
                    dateRange: {
                      ...filters.dateRange,
                      start: new Date(e.target.value),
                      end: filters.dateRange?.end || new Date()
                    }
                  })}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:border-orange-500 focus:outline-none"
                />
                <input
                  type="date"
                  value={filters.dateRange?.end ? filters.dateRange.end.toISOString().split('T')[0] : ''}
                  onChange={(e) => setFilters({
                    ...filters,
                    dateRange: {
                      ...filters.dateRange,
                      start: filters.dateRange?.start || new Date(),
                      end: new Date(e.target.value)
                    }
                  })}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Tags</label>
              <input
                type="text"
                placeholder="Enter tags (comma-separated)"
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:border-orange-500 focus:outline-none"
                onChange={(e) => setFilters({
                  ...filters,
                  tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                })}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {!hasProject ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Database className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No Project Selected</h3>
              <p className="text-gray-300 mb-4">Please select a project to perform advanced searches</p>
              <button
                onClick={() => window.location.hash = '#projects'}
                className="px-6 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
              >
                Select Project
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    Search Results ({searchResults.length})
                  </h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedResults(new Set())}
                      className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      <Star className="w-4 h-4" />
                      <span>Bookmark Selected ({selectedResults.size})</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {sortedResults.map((result) => (
                    <div key={result.id} className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <input
                            type="checkbox"
                            checked={selectedResults.has(result.id)}
                            onChange={() => toggleResultSelection(result.id)}
                            className="mt-1 rounded border-gray-600 bg-gray-700 text-orange-600 focus:ring-orange-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              {result.type === 'table' ? (
                                <TableIcon className="w-5 h-5 text-blue-400" />
                              ) : result.type === 'column' ? (
                                <FileText className="w-5 h-5 text-green-400" />
                              ) : result.type === 'data' ? (
                                <Database className="w-5 h-5 text-purple-400" />
                              ) : (
                                <User className="w-5 h-5 text-orange-400" />
                              )}
                              <h4 className="text-white font-medium">{result.title}</h4>
                              <span className="text-xs bg-orange-600 text-white px-2 py-1 rounded">
                                {result.type}
                              </span>
                              <span className="text-xs text-gray-400">
                                {Math.round(result.relevance * 100)}% relevance
                              </span>
                            </div>
                            <p className="text-gray-300 text-sm mb-2">{result.description}</p>
                            {result.metadata && Object.keys(result.metadata).length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(result.metadata).map(([key, value]) => (
                                  <span key={key} className="text-xs bg-gray-600 text-gray-300 px-2 py-1 rounded">
                                    {key}: {String(value)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {searchQuery && searchResults.length === 0 && !isSearching && (
              <div className="text-center py-12">
                <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No Results Found</h3>
                <p className="text-gray-300">
                  Try adjusting your search terms or filters to find what you're looking for.
                </p>
              </div>
            )}

            {/* Welcome Message */}
            {!searchQuery && searchResults.length === 0 && (
              <div className="text-center py-12">
                <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Advanced Search</h3>
                <p className="text-gray-300 mb-4">
                  Search across all your database tables, columns, and data within the selected project.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <TableIcon className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                    <div className="text-white font-medium">Tables</div>
                    <div className="text-sm text-gray-400">Search table structures</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <FileText className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <div className="text-white font-medium">Columns</div>
                    <div className="text-sm text-gray-400">Find column definitions</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <Database className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                    <div className="text-white font-medium">Data</div>
                    <div className="text-sm text-gray-400">Search actual data values</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-md shadow-lg ${
          notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {notification.message}
        </div>
      )}
    </div>
  );
}
