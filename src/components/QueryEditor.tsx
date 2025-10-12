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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-3xl w-full max-w-7xl mx-4 h-[95vh] flex flex-col shadow-2xl border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-10 border-b border-gray-700/50" style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(147, 51, 234, 0.08) 50%, rgba(236, 72, 153, 0.08) 100%)',
          borderBottom: '1px solid rgba(59, 130, 246, 0.2)'
        }}>
          <div className="flex items-center space-x-6">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 via-orange-600 to-red-500 rounded-3xl flex items-center justify-center shadow-2xl border border-orange-400/30" style={{
              boxShadow: '0 10px 25px -5px rgba(251, 146, 60, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)'
            }}>
              <Database className="w-8 h-8 text-white" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent mb-2">
                Query Editor
              </h2>
              <p className="text-xl text-gray-300 font-semibold">
                {projectName} - {databaseName || 'Database'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-4 text-gray-400 hover:text-white hover:bg-gradient-to-r hover:from-gray-700/50 hover:to-gray-600/50 rounded-3xl transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <X className="w-7 h-7" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Query Panel */}
          <div className="w-1/2 flex flex-col border-r border-gray-700/50">
            {/* Query Input */}
            <div className="p-8 border-b border-gray-700/50" style={{
              background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.3) 0%, rgba(17, 24, 39, 0.3) 100%)'
            }}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">SQL Query</h3>
                <button
                  onClick={executeQuery}
                  disabled={isExecuting || !query.trim()}
                  className="flex items-center space-x-4 px-8 py-4 bg-gradient-to-r from-orange-500 via-orange-600 to-red-500 text-white text-lg font-bold rounded-3xl hover:from-orange-600 hover:via-orange-700 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-110 hover:-translate-y-1 disabled:transform-none border border-orange-400/20"
                  style={{
                    boxShadow: '0 10px 25px -5px rgba(251, 146, 60, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                  }}
                >
                  {isExecuting ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span>Executing...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-6 h-6" />
                      <span>Execute</span>
                    </>
                  )}
                </button>
              </div>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter your SELECT query here..."
                className="w-full h-48 p-6 bg-gradient-to-br from-gray-900/80 to-gray-800/80 text-white rounded-3xl border border-gray-600/30 focus:border-orange-500 focus:outline-none font-mono text-lg resize-none shadow-2xl focus:shadow-3xl transition-all duration-300 backdrop-blur-sm"
                disabled={isExecuting}
                style={{
                  background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.8) 0%, rgba(31, 41, 55, 0.8) 100%)',
                  backdropFilter: 'blur(10px)'
                }}
              />
            </div>

            {/* Query History */}
            {queryHistory.length > 0 && (
              <div className="flex-1 p-8 overflow-hidden" style={{
                background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.2) 0%, rgba(17, 24, 39, 0.2) 100%)'
              }}>
                <h3 className="text-xl font-bold bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent mb-6">Query History</h3>
                <div className="h-full overflow-y-auto">
                  <div className="space-y-4">
                    {queryHistory.map((historyQuery, index) => (
                      <button
                        key={index}
                        onClick={() => loadQueryFromHistory(historyQuery)}
                        className="w-full text-left p-5 bg-gradient-to-r from-gray-700/60 to-gray-600/60 rounded-3xl hover:from-gray-600/60 hover:to-gray-500/60 transition-all duration-300 border border-gray-600/40 hover:border-orange-500/50 shadow-lg hover:shadow-xl transform hover:scale-105 hover:-translate-y-1"
                        style={{
                          background: 'linear-gradient(135deg, rgba(55, 65, 81, 0.6) 0%, rgba(31, 41, 55, 0.6) 100%)',
                          backdropFilter: 'blur(10px)'
                        }}
                      >
                        <code className="text-orange-300 text-base font-mono">
                          {historyQuery.length > 100 ? historyQuery.substring(0, 100) + '...' : historyQuery}
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
            <div className="p-8 border-b border-gray-700/50" style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(147, 51, 234, 0.05) 50%, rgba(236, 72, 153, 0.05) 100%)'
            }}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">Query Results</h3>
                {result?.success && result.data && result.data.length > 0 && (
                  <button
                    onClick={exportResults}
                    className="flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 text-white text-base font-bold rounded-3xl hover:from-green-600 hover:via-green-700 hover:to-emerald-700 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-110 hover:-translate-y-1 border border-green-400/20"
                    style={{
                      boxShadow: '0 10px 25px -5px rgba(34, 197, 94, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <Download className="w-5 h-5" />
                    <span>Export CSV</span>
                  </button>
                )}
              </div>

              {/* Result Status */}
              {result && (
                <div className="flex items-center space-x-8 text-lg">
                  {result.success ? (
                    <>
                      <div className="flex items-center space-x-3 text-green-400 font-bold bg-green-500/10 px-4 py-2 rounded-2xl border border-green-500/20">
                        <CheckCircle className="w-6 h-6" />
                        <span>Success</span>
                      </div>
                      <div className="flex items-center space-x-3 text-gray-300 bg-gray-700/30 px-4 py-2 rounded-2xl border border-gray-600/30">
                        <Clock className="w-6 h-6" />
                        <span>{result.executionTime}ms</span>
                      </div>
                      <div className="flex items-center space-x-3 text-gray-300 bg-gray-700/30 px-4 py-2 rounded-2xl border border-gray-600/30">
                        <Hash className="w-6 h-6" />
                        <span>{result.rowCount} rows</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center space-x-3 text-red-400 font-bold bg-red-500/10 px-4 py-2 rounded-2xl border border-red-500/20">
                      <AlertTriangle className="w-6 h-6" />
                      <span>{result.error}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Results Table */}
            <div className="flex-1 overflow-hidden" style={{
              background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.2) 0%, rgba(17, 24, 39, 0.2) 100%)'
            }}>
              {result?.success && result.data && result.data.length > 0 ? (
                <div className="h-full overflow-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-gradient-to-r from-gray-700 via-gray-800 to-gray-900 sticky top-0 shadow-2xl" style={{
                      background: 'linear-gradient(135deg, rgba(55, 65, 81, 0.9) 0%, rgba(31, 41, 55, 0.9) 50%, rgba(17, 24, 39, 0.9) 100%)',
                      backdropFilter: 'blur(10px)'
                    }}>
                      <tr>
                        {Object.keys(result.data[0]).map((header) => (
                          <th
                            key={header}
                            className="px-8 py-6 text-left text-base font-bold text-white uppercase tracking-wider border-b border-gray-600/50"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-gray-800/30 divide-y divide-gray-600/20">
                      {result.data.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-700/40 transition-all duration-300 hover:shadow-lg">
                          {Object.values(row).map((value: any, cellIndex) => (
                            <td
                              key={cellIndex}
                              className="px-8 py-5 text-base text-gray-200 border-b border-gray-700/20 max-w-xs truncate"
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
                    <CheckCircle className="w-16 h-16 text-yellow-400 mx-auto mb-6" />
                    <p className="text-2xl text-gray-300 font-bold">Query executed successfully</p>
                    <p className="text-xl text-gray-400 mt-3">No results returned</p>
                  </div>
                </div>
              ) : result?.error ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-6" />
                    <p className="text-2xl text-red-300 font-bold">Query failed</p>
                    <p className="text-xl text-red-400 mt-3">{result.error}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Database className="w-12 h-12 text-gray-400 mx-auto mb-8" />
                    <p className="text-xl text-gray-300 font-semibold">Execute a query to see results</p>
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
