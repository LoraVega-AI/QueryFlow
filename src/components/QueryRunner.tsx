'use client';

// Query Runner component for executing SQL queries
// This component provides a SQL editor and executes queries against the database schema

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { DatabaseSchema, QueryResult, QueryError, QueryHistoryItem, QueryTemplate } from '@/types/database';
import { dbManager } from '@/utils/database';
import { QueryManager } from '@/utils/queryManager';
import { Play, History, Trash2, Copy, Download, FileText, Search, Bookmark, Star, Clock, AlertCircle } from 'lucide-react';

interface QueryRunnerProps {
  schema: DatabaseSchema | null;
  onQueryResult: (result: QueryResult | null, error: QueryError | null) => void;
}

const SAMPLE_QUERIES = [
  'SELECT 1 as test;',
  'SELECT datetime(\'now\') as current_time;',
  'SELECT \'Hello QueryFlow!\' as message;',
  'SELECT * FROM sqlite_master WHERE type=\'table\';',
  'PRAGMA table_list;',
];

export function QueryRunner({ schema, onQueryResult }: QueryRunnerProps) {
  const [query, setQuery] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryHistory, setQueryHistory] = useState<QueryHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<QueryTemplate | null>(null);
  const [templateParams, setTemplateParams] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Load query history from QueryManager
  useEffect(() => {
    setQueryHistory(QueryManager.getHistory());
  }, []);

  // Validate query
  const validateQuery = useCallback(() => {
    const validation = QueryManager.validateQuery(query);
    setValidationErrors(validation.errors);
    return validation.isValid;
  }, [query]);

  // Get filtered templates
  const filteredTemplates = useMemo(() => {
    if (!templateSearch) return QueryManager.getAllTemplates();
    return QueryManager.searchTemplates(templateSearch);
  }, [templateSearch]);

  // Load template
  const loadTemplate = useCallback((template: QueryTemplate) => {
    setSelectedTemplate(template);
    setTemplateParams({});
    setShowTemplates(false);
  }, []);

  // Apply template
  const applyTemplate = useCallback(() => {
    if (selectedTemplate) {
      const processedQuery = QueryManager.processTemplate(selectedTemplate, templateParams);
      setQuery(processedQuery);
      setSelectedTemplate(null);
      setTemplateParams({});
    }
  }, [selectedTemplate, templateParams]);

  // Execute SQL query
  const executeQuery = useCallback(async () => {
    if (!query.trim() || !schema) return;

    // Validate query first
    if (!validateQuery()) {
      return;
    }

    setIsExecuting(true);
    onQueryResult(null, null);
    const startTime = Date.now();

    try {
      // Ensure database is initialized and tables are created
      await dbManager.initialize();
      await dbManager.createTablesFromSchema(schema);

      // Execute the query
      const result = await dbManager.executeQuery(query);
      const executionTime = Date.now() - startTime;

      // Save to history using QueryManager
      QueryManager.saveToHistory(query, executionTime, result.rowCount);

      // Update result with execution time
      const resultWithTime: QueryResult = {
        ...result,
        executionTime,
      };

      onQueryResult(resultWithTime, null);
      
      // Refresh history
      setQueryHistory(QueryManager.getHistory());
    } catch (error: any) {
      console.error('Query execution error:', error);
      const executionTime = Date.now() - startTime;
      const queryError: QueryError = {
        message: error.message || 'Unknown error occurred',
        line: error.line,
        column: error.column,
        executionTime,
      };
      onQueryResult(null, queryError);
    } finally {
      setIsExecuting(false);
    }
  }, [query, schema, onQueryResult, validateQuery]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      executeQuery();
    }
  }, [executeQuery]);

  // Insert sample query
  const insertSampleQuery = useCallback((sampleQuery: string) => {
    setQuery(sampleQuery);
  }, []);

  // Load query from history
  const loadQueryFromHistory = useCallback((historyQuery: string) => {
    setQuery(historyQuery);
    setShowHistory(false);
  }, []);

  // Clear query
  const clearQuery = useCallback(() => {
    setQuery('');
  }, []);

  // Copy query to clipboard
  const copyQuery = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(query);
    } catch (error) {
      console.error('Failed to copy query:', error);
    }
  }, [query]);

  // Export query
  const exportQuery = useCallback(() => {
    const blob = new Blob([query], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_${Date.now()}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [query]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-white">Query Runner</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={executeQuery}
              disabled={!query.trim() || isExecuting || !schema}
              className="flex items-center space-x-2 px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="w-4 h-4" />
              <span>{isExecuting ? 'Executing...' : 'Execute'}</span>
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              <History className="w-4 h-4" />
              <span>History</span>
            </button>
            <button
              onClick={() => setShowTemplates(true)}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>Templates</span>
            </button>
            <button
              onClick={clearQuery}
              className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear</span>
            </button>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={copyQuery}
            disabled={!query.trim()}
            className="p-2 text-gray-400 hover:text-white disabled:text-gray-600 transition-colors"
            title="Copy query"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={exportQuery}
            disabled={!query.trim()}
            className="p-2 text-gray-400 hover:text-white disabled:text-gray-600 transition-colors"
            title="Export query"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Query History Panel */}
      {showHistory && (
        <div className="bg-gray-700 border-b border-gray-600 p-4">
          <h3 className="text-sm font-medium text-white mb-3">Query History</h3>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {queryHistory.length === 0 ? (
              <p className="text-sm text-gray-400">No query history available</p>
            ) : (
              queryHistory.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 bg-gray-800 border border-gray-600 rounded text-sm"
                >
                  <code className="flex-1 text-gray-300 truncate mr-2">
                    {item.query.substring(0, 50)}{item.query.length > 50 ? '...' : ''}
                  </code>
                  <button
                    onClick={() => loadQueryFromHistory(item.query)}
                    className="px-2 py-1 text-orange-400 hover:text-orange-300 transition-colors"
                  >
                    Load
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Sample Queries */}
      <div className="bg-orange-900 border-b border-orange-700 p-4">
        <h3 className="text-sm font-medium text-orange-200 mb-3">Sample Queries</h3>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_QUERIES.map((sampleQuery, index) => (
            <button
              key={index}
              onClick={() => insertSampleQuery(sampleQuery)}
              className="px-3 py-1 bg-orange-800 text-orange-200 rounded text-sm hover:bg-orange-700 transition-colors"
            >
              {sampleQuery.split(' ')[0]}...
            </button>
          ))}
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-900 border-b border-red-700 p-4">
          <div className="flex items-center mb-2">
            <AlertCircle className="w-4 h-4 text-red-400 mr-2" />
            <h3 className="text-sm font-medium text-red-200">Query Validation Errors</h3>
          </div>
          <div className="space-y-1">
            {validationErrors.map((error, index) => (
              <p key={index} className="text-red-300 text-sm">{error}</p>
            ))}
          </div>
        </div>
      )}

      {/* SQL Editor */}
      <div className="flex-1 p-4">
        <div className="h-full">
          <label className="block text-sm font-medium text-white mb-2">
            SQL Query
          </label>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter your SQL query here... (Ctrl+Enter to execute)"
            className="w-full h-full p-3 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-sm resize-none bg-gray-800 text-white"
            disabled={!schema}
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-t border-gray-700 text-sm text-gray-400">
        <div>
          {schema ? (
            schema.tables.length > 0 ? (
              <span>Ready to execute queries on {schema.tables.length} tables</span>
            ) : (
              <span className="text-yellow-400">No tables in schema - create tables in Schema Designer first</span>
            )
          ) : (
            <span>No schema loaded</span>
          )}
        </div>
        <div>
          <span>Ctrl+Enter to execute</span>
        </div>
      </div>

      {/* Enhanced History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Query History</h3>
              <button
                onClick={() => setShowHistory(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-2 overflow-y-auto max-h-96">
              {queryHistory.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <code className="text-orange-300 text-sm font-mono bg-gray-800 px-2 py-1 rounded">
                          {item.query.substring(0, 100)}{item.query.length > 100 ? '...' : ''}
                        </code>
                        {item.isBookmarked && (
                          <Star className="w-4 h-4 text-yellow-500 ml-2" />
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {item.executedAt.toLocaleString()}
                        </div>
                        <div>Execution: {item.executionTime}ms</div>
                        <div>Results: {item.resultCount}</div>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs bg-gray-600 text-gray-300 px-2 py-1 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => {
                          setQuery(item.query);
                          setShowHistory(false);
                        }}
                        className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
                      >
                        Use
                      </button>
                      <button
                        onClick={() => QueryManager.toggleBookmark(item.id)}
                        className="p-1 text-gray-400 hover:text-yellow-500"
                      >
                        <Star className={`w-4 h-4 ${item.isBookmarked ? 'text-yellow-500' : ''}`} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {queryHistory.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  No query history yet. Execute some queries to see them here.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Query Templates</h3>
              <button
                onClick={() => setShowTemplates(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto max-h-96">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors cursor-pointer"
                  onClick={() => loadTemplate(template)}
                >
                  <h4 className="text-lg font-semibold text-white mb-2">{template.name}</h4>
                  <p className="text-gray-300 text-sm mb-3">{template.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs bg-orange-600 text-white px-2 py-1 rounded">
                      {template.category}
                    </span>
                    <span className="text-xs text-gray-400">
                      {template.parameters.length} parameters
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {template.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-gray-600 text-gray-300 px-2 py-1 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Template Parameters Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Template Parameters</h3>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            
            <div className="mb-4">
              <h4 className="text-lg font-semibold text-white mb-2">{selectedTemplate.name}</h4>
              <p className="text-gray-300 text-sm mb-4">{selectedTemplate.description}</p>
            </div>

            <div className="space-y-4 mb-6">
              {selectedTemplate.parameters.map((param) => (
                <div key={param.name}>
                  <label className="block text-sm font-medium text-white mb-1">
                    {param.name} {param.required && <span className="text-red-400">*</span>}
                  </label>
                  <input
                    type="text"
                    value={templateParams[param.name] || ''}
                    onChange={(e) => setTemplateParams(prev => ({ ...prev, [param.name]: e.target.value }))}
                    placeholder={param.defaultValue || `Enter ${param.name}`}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:border-orange-500 focus:outline-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">Type: {param.type}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setSelectedTemplate(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={applyTemplate}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
              >
                Apply Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}