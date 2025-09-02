'use client';

// Query Runner component for executing SQL queries
// This component provides a SQL editor and executes queries against the database schema

import React, { useState, useCallback, useEffect } from 'react';
import { DatabaseSchema, QueryResult, QueryError } from '@/types/database';
import { dbManager } from '@/utils/database';
import { Play, History, Trash2, Copy, Download } from 'lucide-react';

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
  const [queryHistory, setQueryHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load query history from localStorage
  useEffect(() => {
    const history = localStorage.getItem('queryflow_query_history');
    if (history) {
      setQueryHistory(JSON.parse(history));
    }
  }, []);

  // Save query history to localStorage
  const saveQueryHistory = useCallback((newQuery: string) => {
    if (!newQuery.trim()) return;
    
    const updatedHistory = [newQuery, ...queryHistory.filter(q => q !== newQuery)].slice(0, 50);
    setQueryHistory(updatedHistory);
    localStorage.setItem('queryflow_query_history', JSON.stringify(updatedHistory));
  }, [queryHistory]);

  // Execute SQL query
  const executeQuery = useCallback(async () => {
    if (!query.trim() || !schema) return;

    setIsExecuting(true);
    onQueryResult(null, null);

    try {
      // Ensure database is initialized and tables are created
      await dbManager.initialize();
      await dbManager.createTablesFromSchema(schema);

      // Execute the query
      const result = await dbManager.executeQuery(query);
      onQueryResult(result, null);
      saveQueryHistory(query);
    } catch (error: any) {
      console.error('Query execution error:', error);
      const queryError: QueryError = {
        message: error.message || 'Unknown error occurred',
        line: error.line,
        column: error.column,
        executionTime: error.executionTime,
      };
      onQueryResult(null, queryError);
    } finally {
      setIsExecuting(false);
    }
  }, [query, schema, onQueryResult, saveQueryHistory]);

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
              queryHistory.map((historyQuery, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-800 border border-gray-600 rounded text-sm"
                >
                  <code className="flex-1 text-gray-300 truncate mr-2">
                    {historyQuery}
                  </code>
                  <button
                    onClick={() => loadQueryFromHistory(historyQuery)}
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
    </div>
  );
}