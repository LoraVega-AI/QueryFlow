'use client';

// Results Viewer component for displaying query results
// This component provides a styled data grid for viewing SQL query results

import React, { useState, useMemo } from 'react';
import { QueryResult, QueryError } from '@/types/database';
import { Download, Copy, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

interface ResultsViewerProps {
  result: QueryResult | null;
  error: QueryError | null;
  isLoading: boolean;
}

export function ResultsViewer({ result, error, isLoading }: ResultsViewerProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Sort data based on selected column
  const sortedData = useMemo(() => {
    if (!result || !sortColumn) return result?.rows || [];

    const columnIndex = result.columns.indexOf(sortColumn);
    if (columnIndex === -1) return result.rows;

    return [...result.rows].sort((a, b) => {
      const aVal = a[columnIndex];
      const bVal = b[columnIndex];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      
      if (sortDirection === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });
  }, [result, sortColumn, sortDirection]);

  // Handle column header click for sorting
  const handleColumnClick = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Export data as CSV
  const exportAsCSV = () => {
    if (!result) return;

    const csvContent = [
      result.columns.join(','),
      ...sortedData.map(row => 
        row.map(cell => {
          const cellStr = String(cell || '');
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(',')
      )
    ].join('\n');

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

  // Copy data to clipboard
  const copyToClipboard = async () => {
    if (!result) return;

    const textContent = [
      result.columns.join('\t'),
      ...sortedData.map(row => row.map(cell => String(cell || '')).join('\t'))
    ].join('\n');

    try {
      await navigator.clipboard.writeText(textContent);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  // Format cell value for display
  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE';
    }
    if (typeof value === 'number') {
      return value.toString();
    }
    return String(value);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-800">Query Results</h2>
          {isLoading && (
            <div className="flex items-center space-x-2 text-blue-600">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">Executing query...</span>
            </div>
          )}
          {error && (
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">Query failed</span>
            </div>
          )}
          {result && !error && (
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Query executed successfully</span>
            </div>
          )}
        </div>
        {result && !error && (
          <div className="flex items-center space-x-2">
            <button
              onClick={copyToClipboard}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              <Copy className="w-4 h-4" />
              <span>Copy</span>
            </button>
            <button
              onClick={exportAsCSV}
              className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Executing query...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Query Error</h3>
              <p className="text-red-600 mb-2">{error.message}</p>
              {error.line && (
                <p className="text-sm text-gray-500">
                  Line {error.line}{error.column && `, Column ${error.column}`}
                </p>
              )}
            </div>
          </div>
        )}

        {result && !error && (
          <div className="h-full flex flex-col">
            {/* Results Summary */}
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  {result.rowCount} row{result.rowCount !== 1 ? 's' : ''} returned
                </span>
                <span>
                  Executed in {result.executionTime.toFixed(2)}ms
                </span>
              </div>
            </div>

            {/* Data Grid */}
            <div className="flex-1 overflow-auto">
              {result.rowCount === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-gray-600">Query executed successfully</p>
                    <p className="text-sm text-gray-500">No rows returned</p>
                  </div>
                </div>
              ) : (
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      {result.columns.map((column, index) => (
                        <th
                          key={index}
                          onClick={() => handleColumnClick(column)}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 cursor-pointer hover:bg-gray-100 select-none"
                        >
                          <div className="flex items-center space-x-1">
                            <span>{column}</span>
                            {sortColumn === column && (
                              <span className="text-blue-600">
                                {sortDirection === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedData.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-gray-50">
                        {row.map((cell, cellIndex) => (
                          <td
                            key={cellIndex}
                            className="px-4 py-3 text-sm text-gray-900 border-b border-gray-100"
                          >
                            <div className="max-w-xs truncate" title={formatCellValue(cell)}>
                              {formatCellValue(cell)}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {!result && !error && !isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-gray-400">📊</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No Results</h3>
              <p className="text-gray-600">Execute a query to see results here</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
