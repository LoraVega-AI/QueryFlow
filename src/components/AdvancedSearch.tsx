'use client';

// Advanced Search component for comprehensive search across all data
// This component provides full-text search, filtering, and search result management

import React, { useState, useCallback, useEffect } from 'react';
import { SearchResult, SearchFilters } from '@/types/database';
import { AdvancedSearch as AdvancedSearchUtil } from '@/utils/advancedSearch';
import { Search, Filter, Download, Star, Clock, FileText, Database, Table as TableIcon, User, Zap, Target, Layers, BarChart3, Monitor, Activity, TrendingUp, Globe, Shield, Users, Calendar, Timer, Bell, Mail, MessageSquare, Link, ExternalLink, ArrowRight, ArrowDown, ArrowUp, ChevronRight, ChevronDown, ChevronUp, MoreHorizontal, MoreVertical, Bookmark, Share2, Maximize2, Minimize2, RotateCcw, Save, Edit, Copy, Move, Trash, Archive, RefreshCw, Code, GitBranch, AlertTriangle, CheckCircle, XCircle, Info, HelpCircle, Plus, Minus, X, Check, Loader2 } from 'lucide-react';

interface AdvancedSearchProps {
  schema: any;
}

export function AdvancedSearch({ schema }: AdvancedSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    types: [],
    dateRange: undefined,
    tags: []
  });
  const [showFilters, setShowFilters] = useState(false);
  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  
  // Advanced search features
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [searchHistory, setSearchHistory] = useState<any[]>([]);
  const [searchAnalytics, setSearchAnalytics] = useState<any[]>([]);
  const [searchAlerts, setSearchAlerts] = useState<any[]>([]);
  const [searchIndexes, setSearchIndexes] = useState<any[]>([]);
  const [searchAPIs, setSearchAPIs] = useState<any[]>([]);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [rebuildingIndexes, setRebuildingIndexes] = useState<Set<string>>(new Set());
  const [showDocsModal, setShowDocsModal] = useState<{ api: any; visible: boolean }>({ api: null, visible: false });

  // Perform search
  const performSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = AdvancedSearchUtil.search(searchQuery, filters);
      setSearchResults(results);
    } catch (error: any) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, filters]);

  // Handle search input
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    performSearch();
  }, [performSearch]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  // Save search
  const saveSearch = useCallback(() => {
    if (searchQuery.trim()) {
      const savedSearch = {
        id: Date.now().toString(),
        query: searchQuery,
        filters,
        resultsCount: searchResults.length,
        timestamp: new Date()
      };
      setSavedSearches(prev => [savedSearch, ...prev]);
    }
  }, [searchQuery, filters, searchResults]);

  // Load saved search
  const loadSavedSearch = useCallback((savedSearch: any) => {
    setSearchQuery(savedSearch.query);
    setFilters(savedSearch.filters);
  }, []);

  // Rebuild search index
  const rebuildIndex = useCallback(async (indexId: string) => {
    console.log('Rebuild function called with indexId:', indexId);
    
    if (!indexId) {
      console.error('No indexId provided');
      setNotification({ 
        type: 'error', 
        message: 'No index ID provided for rebuild' 
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    
    // Add to rebuilding set
    setRebuildingIndexes(prev => {
      const newSet = new Set(prev);
      newSet.add(indexId);
      console.log('Added to rebuilding set:', Array.from(newSet));
      return newSet;
    });
    
    // Update status to rebuilding immediately
    setSearchIndexes(prev => {
      console.log('Updating index status to rebuilding for:', indexId);
      return prev.map(index => {
        if (index.id === indexId) {
          return {
            ...index,
            status: 'rebuilding'
          };
        }
        return index;
      });
    });
    
    try {
      // Simulate index rebuilding process
      console.log('Starting rebuild process for:', indexId);
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
      
      // Update the index with new data
      setSearchIndexes(prev => {
        console.log('Completing rebuild for:', indexId);
        return prev.map(index => {
          if (index.id === indexId) {
            const newSize = index.id === 'full-text' ? '2.8MB' : '1.4MB';
            console.log(`Rebuild completed for ${index.name}, new size: ${newSize}`);
            return {
              ...index,
              status: 'active',
              lastUpdated: new Date(),
              size: newSize
            };
          }
          return index;
        });
      });
      
      // Get the updated index name for notification
      setSearchIndexes(prev => {
        const updatedIndex = prev.find(i => i.id === indexId);
        setNotification({ 
          type: 'success', 
          message: `${updatedIndex?.name || 'Index'} rebuilt successfully` 
        });
        setTimeout(() => setNotification(null), 3000);
        return prev;
      });
      
    } catch (error: any) {
      console.error('Rebuild error:', error);
      setNotification({ 
        type: 'error', 
        message: `Failed to rebuild index: ${error.message}` 
      });
      setTimeout(() => setNotification(null), 5000);
      
      // Reset status on error
      setSearchIndexes(prev => prev.map(index => {
        if (index.id === indexId) {
          return {
            ...index,
            status: 'active'
          };
        }
        return index;
      }));
    } finally {
      // Remove from rebuilding set
      setRebuildingIndexes(prev => {
        const newSet = new Set(prev);
        newSet.delete(indexId);
        console.log('Removed from rebuilding set:', Array.from(newSet));
        return newSet;
      });
    }
  }, []);

  // View API documentation
  const viewDocs = useCallback((api: any) => {
    setShowDocsModal({ api, visible: true });
  }, []);

  // Load advanced search data
  useEffect(() => {
    // Load search suggestions
    const suggestions = [
      { id: '1', text: 'user authentication', count: 45 },
      { id: '2', text: 'database schema', count: 32 },
      { id: '3', text: 'query optimization', count: 28 }
    ];
    setSearchSuggestions(suggestions);

    // Load search history
    const history = [
      { id: '1', query: 'user management', timestamp: new Date(), results: 12 },
      { id: '2', query: 'database performance', timestamp: new Date(), results: 8 },
      { id: '3', query: 'security policies', timestamp: new Date(), results: 15 }
    ];
    setSearchHistory(history);

    // Load search analytics
    const analytics = [
      {
        id: 'search-volume',
        name: 'Search Volume',
        value: 1250,
        trend: 'up',
        change: 15.2
      },
      {
        id: 'avg-response-time',
        name: 'Avg Response Time',
        value: 0.8,
        trend: 'down',
        change: -8.5
      },
      {
        id: 'success-rate',
        name: 'Success Rate',
        value: 98.5,
        trend: 'up',
        change: 2.1
      }
    ];
    setSearchAnalytics(analytics);

    // Load search alerts
    const alerts = [
      {
        id: 'high-volume',
        name: 'High Search Volume Alert',
        description: 'Search volume exceeded threshold',
        severity: 'medium',
        active: true
      },
      {
        id: 'slow-query',
        name: 'Slow Query Alert',
        description: 'Query response time > 2s',
        severity: 'high',
        active: true
      }
    ];
    setSearchAlerts(alerts);

    // Load search indexes
    const indexes = [
      {
        id: 'full-text',
        name: 'Full-Text Index',
        status: 'active',
        size: '2.5MB',
        lastUpdated: new Date()
      },
      {
        id: 'metadata',
        name: 'Metadata Index',
        status: 'active',
        size: '1.2MB',
        lastUpdated: new Date()
      }
    ];
    setSearchIndexes(indexes);

    // Load search APIs
    const APIs = [
      {
        id: 'rest-api',
        name: 'REST API',
        description: 'RESTful search endpoints',
        status: 'active',
        endpoints: 5
      },
      {
        id: 'graphql',
        name: 'GraphQL API',
        description: 'GraphQL search queries',
        status: 'active',
        endpoints: 3
      }
    ];
    setSearchAPIs(APIs);
  }, []);

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-white">Advanced Search</h2>
          <span className="text-sm text-gray-300">Search across all data and schemas</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
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
                placeholder="Search across tables, queries, schemas, and more..."
                className="w-full pl-10 pr-4 py-3 bg-gray-700 text-white rounded-md border border-gray-600 focus:border-orange-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={!searchQuery.trim() || isSearching}
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
          
          {/* Search Suggestions */}
          {searchSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-400 mr-2">Suggestions:</span>
              {searchSuggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  onClick={() => setSearchQuery(suggestion.text)}
                  className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm hover:bg-gray-600 transition-colors"
                >
                  {suggestion.text} ({suggestion.count})
                </button>
              ))}
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
                {['table', 'query', 'schema', 'audit'].map((type) => (
                  <label key={type} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.types?.includes(type) || false}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilters(prev => ({ ...prev, types: [...(prev.types || []), type] }));
                        } else {
                          setFilters(prev => ({ ...prev, types: (prev.types || []).filter(t => t !== type) }));
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
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: { 
                      ...prev.dateRange, 
                      start: new Date(e.target.value),
                      end: prev.dateRange?.end || new Date()
                    }
                  }))}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:border-orange-500 focus:outline-none"
                />
                <input
                  type="date"
                  value={filters.dateRange?.end ? filters.dateRange.end.toISOString().split('T')[0] : ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: { 
                      ...prev.dateRange, 
                      start: prev.dateRange?.start || new Date(),
                      end: new Date(e.target.value)
                    }
                  }))}
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
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                }))}
              />
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
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
                    onClick={saveSearch}
                    className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Star className="w-4 h-4" />
                    <span>Save Search</span>
                  </button>
                  <button
                    onClick={() => {
                      const csv = searchResults.map(r => `${r.type},${r.title},${r.description}`).join('\n');
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'search_results.csv';
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                  </button>
                </div>
              </div>
              
              <div className="space-y-3">
                {searchResults.map((result) => (
                  <div key={result.id} className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          {result.type === 'table' ? (
                            <TableIcon className="w-5 h-5 text-blue-400" />
                          ) : result.type === 'query' ? (
                            <FileText className="w-5 h-5 text-green-400" />
                          ) : result.type === 'schema' ? (
                            <Database className="w-5 h-5 text-purple-400" />
                          ) : (
                            <User className="w-5 h-5 text-orange-400" />
                          )}
                          <h4 className="text-white font-medium">{result.title}</h4>
                          <span className="text-xs bg-orange-600 text-white px-2 py-1 rounded">
                            {result.type}
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
                      <div className="text-sm text-gray-400">
                        Relevance: {Math.round(result.relevance * 100)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Saved Searches */}
          {savedSearches.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Saved Searches</h3>
              <div className="space-y-2">
                {savedSearches.map((savedSearch) => (
                  <div key={savedSearch.id} className="bg-gray-700 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-white font-medium">{savedSearch.query}</span>
                        <span className="text-gray-400 ml-2">
                          {savedSearch.resultsCount} results
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-400">
                          {savedSearch.timestamp.toLocaleString()}
                        </span>
                        <button
                          onClick={() => loadSavedSearch(savedSearch)}
                          className="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                          title="Load search"
                        >
                          <Search className="w-4 h-4" />
                        </button>
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
                Search across all your database tables, queries, schemas, and audit logs.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
                <div className="bg-gray-800 rounded-lg p-4">
                  <TableIcon className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                  <div className="text-white font-medium">Tables</div>
                  <div className="text-sm text-gray-400">Search table data</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <FileText className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <div className="text-white font-medium">Queries</div>
                  <div className="text-sm text-gray-400">Find query history</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <Database className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                  <div className="text-white font-medium">Schemas</div>
                  <div className="text-sm text-gray-400">Search schema info</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <User className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                  <div className="text-white font-medium">Audit Logs</div>
                  <div className="text-sm text-gray-400">Track activities</div>
                </div>
              </div>
            </div>
          )}

          {/* Advanced Search Features */}
          {!searchQuery && searchResults.length === 0 && (
            <div className="space-y-6 mt-8">
              {/* Search History */}
              {searchHistory.length > 0 && (
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Recent Searches</h3>
                  <div className="space-y-2">
                    {searchHistory.map((history) => (
                      <div key={history.id} className="flex items-center justify-between bg-gray-700 rounded p-3">
                        <div className="flex items-center space-x-3">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-white">{history.query}</span>
                          <span className="text-xs text-gray-400">({history.results} results)</span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {history.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Analytics */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Search Analytics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {searchAnalytics.map((analytic) => (
                    <div key={analytic.id} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-white font-medium">{analytic.name}</h4>
                        <span className={`px-2 py-1 rounded text-xs ${
                          analytic.trend === 'up' ? 'bg-green-600' :
                          analytic.trend === 'down' ? 'bg-red-600' :
                          'bg-gray-600'
                        }`}>
                          {analytic.trend}
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-orange-400 mb-1">
                        {typeof analytic.value === 'number' ? analytic.value.toLocaleString() : analytic.value}
                      </div>
                      <div className="text-sm text-gray-400">
                        {analytic.change > 0 ? '+' : ''}{analytic.change}% from last period
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Search Alerts */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Search Alerts</h3>
                <div className="space-y-3">
                  {searchAlerts.map((alert) => (
                    <div key={alert.id} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-white font-medium">{alert.name}</h4>
                        <span className={`px-2 py-1 rounded text-xs ${
                          alert.severity === 'high' ? 'bg-red-600' :
                          alert.severity === 'medium' ? 'bg-yellow-600' :
                          'bg-green-600'
                        }`}>
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 mb-2">{alert.description}</p>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          alert.active ? 'bg-green-600' : 'bg-gray-600'
                        }`}>
                          {alert.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Search Indexes */}
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Search Indexes</h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-400">
                      Rebuilding: {Array.from(rebuildingIndexes).join(', ') || 'none'}
                    </span>
                    <button 
                      onClick={() => {
                        console.log('Test button clicked');
                        rebuildIndex('full-text');
                      }}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                    >
                      Test Rebuild
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  {searchIndexes.map((index) => (
                    <div key={index.id} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-white font-medium">{index.name}</h4>
                        <span className={`px-2 py-1 rounded text-xs ${
                          index.status === 'active' ? 'bg-green-600' :
                          index.status === 'rebuilding' ? 'bg-yellow-600' :
                          'bg-gray-600'
                        }`}>
                          {index.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-400">
                        <span>Size: {index.size}</span>
                        <span>Updated: {index.lastUpdated.toLocaleString()}</span>
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('Button clicked, calling rebuildIndex with:', index.id);
                            rebuildIndex(index.id);
                          }}
                          disabled={rebuildingIndexes.has(index.id)}
                          className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                        >
                          {rebuildingIndexes.has(index.id) ? 'Rebuilding...' : 'Rebuild'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Search APIs */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Search APIs</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {searchAPIs.map((api) => (
                    <div key={api.id} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-white font-medium">{api.name}</h4>
                        <span className={`px-2 py-1 rounded text-xs ${
                          api.status === 'active' ? 'bg-green-600' : 'bg-gray-600'
                        }`}>
                          {api.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 mb-3">{api.description}</p>
                      <div className="flex items-center justify-between text-sm text-gray-400">
                        <span>{api.endpoints} endpoints</span>
                        <button 
                          onClick={() => viewDocs(api)}
                          className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 transition-colors"
                        >
                          View Docs
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* API Documentation Modal */}
      {showDocsModal.visible && showDocsModal.api && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">{showDocsModal.api.name} Documentation</h3>
              <button
                onClick={() => setShowDocsModal({ api: null, visible: false })}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-6">
              {/* API Overview */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-white mb-3">API Overview</h4>
                <p className="text-gray-300 mb-4">{showDocsModal.api.description}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Status:</span>
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${
                      showDocsModal.api.status === 'active' ? 'bg-green-600' : 'bg-gray-600'
                    }`}>
                      {showDocsModal.api.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Endpoints:</span>
                    <span className="ml-2 text-white">{showDocsModal.api.endpoints}</span>
                  </div>
                </div>
              </div>

              {/* API Endpoints */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-white mb-3">Available Endpoints</h4>
                {showDocsModal.api.id === 'rest-api' ? (
                  <div className="space-y-3">
                    <div className="bg-gray-600 rounded p-3">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="px-2 py-1 bg-green-600 text-white text-xs rounded">GET</span>
                        <code className="text-orange-400">/api/search</code>
                      </div>
                      <p className="text-gray-300 text-sm">Search across all indexed content</p>
                      <div className="mt-2 text-xs text-gray-400">
                        <strong>Parameters:</strong> q (query), type, limit, offset
                      </div>
                    </div>
                    <div className="bg-gray-600 rounded p-3">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">POST</span>
                        <code className="text-orange-400">/api/search/advanced</code>
                      </div>
                      <p className="text-gray-300 text-sm">Advanced search with filters and aggregations</p>
                      <div className="mt-2 text-xs text-gray-400">
                        <strong>Body:</strong> JSON with query, filters, and options
                      </div>
                    </div>
                    <div className="bg-gray-600 rounded p-3">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="px-2 py-1 bg-green-600 text-white text-xs rounded">GET</span>
                        <code className="text-orange-400">/api/search/suggestions</code>
                      </div>
                      <p className="text-gray-300 text-sm">Get search suggestions and autocomplete</p>
                      <div className="mt-2 text-xs text-gray-400">
                        <strong>Parameters:</strong> q (partial query), limit
                      </div>
                    </div>
                    <div className="bg-gray-600 rounded p-3">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="px-2 py-1 bg-green-600 text-white text-xs rounded">GET</span>
                        <code className="text-orange-400">/api/search/analytics</code>
                      </div>
                      <p className="text-gray-300 text-sm">Get search analytics and metrics</p>
                      <div className="mt-2 text-xs text-gray-400">
                        <strong>Parameters:</strong> period, metric
                      </div>
                    </div>
                    <div className="bg-gray-600 rounded p-3">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="px-2 py-1 bg-green-600 text-white text-xs rounded">GET</span>
                        <code className="text-orange-400">/api/search/health</code>
                      </div>
                      <p className="text-gray-300 text-sm">Check search service health and status</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-gray-600 rounded p-3">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded">QUERY</span>
                        <code className="text-orange-400">searchContent</code>
                      </div>
                      <p className="text-gray-300 text-sm">Search across all indexed content</p>
                      <div className="mt-2 text-xs text-gray-400">
                        <strong>Arguments:</strong> query: String!, filters: SearchFilters, limit: Int
                      </div>
                    </div>
                    <div className="bg-gray-600 rounded p-3">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded">QUERY</span>
                        <code className="text-orange-400">searchSuggestions</code>
                      </div>
                      <p className="text-gray-300 text-sm">Get search suggestions and autocomplete</p>
                      <div className="mt-2 text-xs text-gray-400">
                        <strong>Arguments:</strong> query: String!, limit: Int
                      </div>
                    </div>
                    <div className="bg-gray-600 rounded p-3">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded">QUERY</span>
                        <code className="text-orange-400">searchAnalytics</code>
                      </div>
                      <p className="text-gray-300 text-sm">Get search analytics and metrics</p>
                      <div className="mt-2 text-xs text-gray-400">
                        <strong>Arguments:</strong> period: String!, metric: String
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Example Usage */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-white mb-3">Example Usage</h4>
                {showDocsModal.api.id === 'rest-api' ? (
                  <div className="space-y-3">
                    <div>
                      <h5 className="text-white font-medium mb-2">Basic Search</h5>
                      <pre className="bg-gray-800 rounded p-3 text-sm text-gray-300 overflow-x-auto">
{`curl -X GET "http://localhost:3000/api/search?q=user+authentication&limit=10" \\
  -H "Content-Type: application/json"`}
                      </pre>
                    </div>
                    <div>
                      <h5 className="text-white font-medium mb-2">Advanced Search</h5>
                      <pre className="bg-gray-800 rounded p-3 text-sm text-gray-300 overflow-x-auto">
{`curl -X POST "http://localhost:3000/api/search/advanced" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "database schema",
    "filters": {
      "types": ["table", "schema"],
      "dateRange": {
        "start": "2024-01-01",
        "end": "2024-12-31"
      }
    },
    "limit": 20
  }'`}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <h5 className="text-white font-medium mb-2">Basic Search Query</h5>
                      <pre className="bg-gray-800 rounded p-3 text-sm text-gray-300 overflow-x-auto">
{`query SearchContent {
  searchContent(
    query: "user authentication"
    limit: 10
  ) {
    id
    title
    description
    type
    relevance
    metadata
  }
}`}
                      </pre>
                    </div>
                    <div>
                      <h5 className="text-white font-medium mb-2">Advanced Search with Filters</h5>
                      <pre className="bg-gray-800 rounded p-3 text-sm text-gray-300 overflow-x-auto">
{`query AdvancedSearch {
  searchContent(
    query: "database schema"
    filters: {
      types: ["table", "schema"]
      dateRange: {
        start: "2024-01-01"
        end: "2024-12-31"
      }
    }
    limit: 20
  ) {
    id
    title
    description
    type
    relevance
    metadata
  }
}`}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              {/* Response Format */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-white mb-3">Response Format</h4>
                <pre className="bg-gray-800 rounded p-3 text-sm text-gray-300 overflow-x-auto">
{`{
  "success": true,
  "data": {
    "results": [
      {
        "id": "result-1",
        "title": "User Authentication Table",
        "description": "Table containing user authentication data",
        "type": "table",
        "relevance": 0.95,
        "metadata": {
          "tableName": "users",
          "columnCount": 8,
          "recordCount": 1250
        }
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10,
    "query": "user authentication",
    "executionTime": 0.045
  },
  "timestamp": "2024-01-15T10:30:00Z"
}`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

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
