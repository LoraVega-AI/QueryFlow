'use client';

// Simple Query Editor Component
// Allows users to execute SELECT queries on connected databases

import React, { useState } from 'react';
import {
  Play,
  X,
  Database,
  Clock,
  Hash,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Download
} from 'lucide-react';

interface QueryEditorProps {
  isOpen: boolean;
  onClose: () => void;
  connectionId: string;
  projectName: string;
  databaseName?: string;
}

interface QueryResult {
  success: boolean;
  data?: any[];
  rowCount?: number;
  executionTime?: number;
  error?: string;
}

export function QueryEditor({
  isOpen,
  onClose,
  connectionId,
  projectName,
  databaseName
}: QueryEditorProps) {
  const [query, setQuery] = useState('SELECT * FROM ');
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [queryHistory, setQueryHistory] = useState<string[]>([]);

  const executeQuery = async () => {
    if (!query.trim()) return;

    setIsExecuting(true);
    setResult(null);

    try {
      const response = await fetch('/api/database/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connectionId,
          sql: query
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          data: data.data.rows,
          rowCount: data.data.rowCount,
          executionTime: data.data.executionTime
        });

        // Add to history
        setQueryHistory(prev => [query, ...prev.slice(0, 9)]); // Keep last 10 queries
      } else {
        setResult({
          success: false,
          error: data.error
        });
      }
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const exportResults = () => {
    if (!result?.success || !result.data) return;

    // Convert to CSV
    const headers = result.data.length > 0 ? Object.keys(result.data[0]) : [];
    const csvContent = [
      headers.join(','),
      ...result.data.map(row =>
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value || '';
        }).join(',')
      )
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_results_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const loadQueryFromHistory = (historyQuery: string) => {
    setQuery(historyQuery);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-6xl mx-4 h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <Database className="w-6 h-6 text-orange-400" />
            <div>
              <h2 className="text-xl font-semibold text-white">Query Editor</h2>
              <p className="text-sm text-gray-400">
                {projectName} - {databaseName || 'Database'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Query Panel */}
          <div className="w-1/2 flex flex-col border-r border-gray-700">
            {/* Query Input */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-300">SQL Query</h3>
                <button
                  onClick={executeQuery}
                  disabled={isExecuting || !query.trim()}
                  className="flex items-center space-x-2 px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExecuting ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Executing...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3" />
                      <span>Execute</span>
                    </>
                  )}
                </button>
              </div>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter your SELECT query here..."
                className="w-full h-32 p-3 bg-gray-900 text-white rounded-md border border-gray-600 focus:border-orange-500 focus:outline-none font-mono text-sm resize-none"
                disabled={isExecuting}
              />
            </div>

            {/* Query History */}
            {queryHistory.length > 0 && (
              <div className="flex-1 p-4 overflow-hidden">
                <h3 className="text-sm font-medium text-gray-300 mb-2">Query History</h3>
                <div className="h-full overflow-y-auto">
                  <div className="space-y-2">
                    {queryHistory.map((historyQuery, index) => (
                      <button
                        key={index}
                        onClick={() => loadQueryFromHistory(historyQuery)}
                        className="w-full text-left p-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
                      >
                        <code className="text-orange-300 text-xs">
                          {historyQuery.length > 60 ? historyQuery.substring(0, 60) + '...' : historyQuery}
                        </code>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results Panel */}
          <div className="w-1/2 flex flex-col">
            {/* Results Header */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-300">Query Results</h3>
                {result?.success && result.data && result.data.length > 0 && (
                  <button
                    onClick={exportResults}
                    className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    <Download className="w-3 h-3" />
                    <span>Export CSV</span>
                  </button>
                )}
              </div>

              {/* Result Status */}
              {result && (
                <div className="mt-2 flex items-center space-x-4 text-sm">
                  {result.success ? (
                    <>
                      <div className="flex items-center space-x-1 text-green-400">
                        <CheckCircle className="w-4 h-4" />
                        <span>Success</span>
                      </div>
                      <div className="flex items-center space-x-1 text-gray-400">
                        <Clock className="w-4 h-4" />
                        <span>{result.executionTime}ms</span>
                      </div>
                      <div className="flex items-center space-x-1 text-gray-400">
                        <Hash className="w-4 h-4" />
                        <span>{result.rowCount} rows</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center space-x-1 text-red-400">
                      <AlertTriangle className="w-4 h-4" />
                      <span>{result.error}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Results Table */}
            <div className="flex-1 overflow-hidden">
              {result?.success && result.data && result.data.length > 0 ? (
                <div className="h-full overflow-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-gray-700 sticky top-0">
                      <tr>
                        {Object.keys(result.data[0]).map((header) => (
                          <th
                            key={header}
                            className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider border-b border-gray-600"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-gray-800 divide-y divide-gray-600">
                      {result.data.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-700">
                          {Object.values(row).map((value: any, cellIndex) => (
                            <td
                              key={cellIndex}
                              className="px-4 py-3 text-sm text-gray-200 border-b border-gray-700 max-w-xs truncate"
                              title={String(value || '')}
                            >
                              {value === null ? 'NULL' : String(value)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : result?.success ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <CheckCircle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                    <p className="text-gray-300">Query executed successfully</p>
                    <p className="text-sm text-gray-400">No results returned</p>
                  </div>
                </div>
              ) : result?.error ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                    <p className="text-red-300">Query failed</p>
                    <p className="text-sm text-red-400 mt-1">{result.error}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Database className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-300">Execute a query to see results</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
