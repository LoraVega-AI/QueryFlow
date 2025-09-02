'use client';

// Advanced Search component for comprehensive search across all data
// This component provides full-text search, filtering, and search result management

import React, { useState, useCallback, useEffect } from 'react';
import { SearchResult, SearchFilters } from '@/types/database';
import { AdvancedSearch as AdvancedSearchUtil } from '@/utils/advancedSearch';
import { Search, Filter, Download, Star, Clock, FileText, Database, Table as TableIcon, User } from 'lucide-react';

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
        <form onSubmit={handleSearch} className="flex items-center space-x-4">
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
        </div>
      </div>
    </div>
  );
}
