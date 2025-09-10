'use client';

// Enhanced Results Viewer component for displaying query results
// This component provides a high-performance virtualized data grid for viewing SQL query results

import React, { useState, useMemo, useCallback } from 'react';
import { QueryResult, QueryError } from '@/types/database';
import { Download, Copy, RefreshCw, AlertCircle, CheckCircle, Settings, Zap } from 'lucide-react';
import { VirtualizedTable } from './VirtualizedTable';

interface ResultsViewerProps {
  result: QueryResult | null;
  error: QueryError | null;
  isLoading: boolean;
  enableVirtualization?: boolean;
  maxHeight?: number;
  onRowClick?: (row: any, index: number) => void;
}

export function ResultsViewer({ 
  result, 
  error, 
  isLoading, 
  enableVirtualization = true,
  maxHeight = 600,
  onRowClick 
}: ResultsViewerProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showSettings, setShowSettings] = useState(false);
  const [virtualizationEnabled, setVirtualizationEnabled] = useState(enableVirtualization);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // Prepare data for virtualized table
  const tableData = useMemo(() => {
    if (!result) return [];
    
    return result.rows.map((row, index) => {
      const rowData: Record<string, any> = { _index: index };
      result.columns.forEach((column, colIndex) => {
        rowData[column] = row[colIndex];
      });
      return rowData;
    });
  }, [result]);

  // Prepare columns for virtualized table
  const tableColumns = useMemo(() => {
    if (!result) return [];
    
    return result.columns.map(column => ({
      key: column,
      label: column,
      width: 200,
      sortable: true,
      filterable: true,
      render: (value: any) => (
        <span className="truncate" title={String(value || '')}>
          {formatCellValue(value)}
        </span>
      )
    }));
  }, [result]);

  // Handle sorting
  const handleSort = useCallback((column: string, direction: 'asc' | 'desc') => {
    setSortColumn(column);
    setSortDirection(direction);
  }, []);

  // Handle row selection
  const handleSelectionChange = useCallback((selected: Set<number>) => {
    setSelectedRows(selected);
  }, []);

  // Handle row click
  const handleRowClick = useCallback((row: any, index: number) => {
    onRowClick?.(row, index);
  }, [onRowClick]);

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
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-white">Query Results</h2>
          {isLoading && (
            <div className="flex items-center space-x-2 text-orange-400">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">Executing query...</span>
            </div>
          )}
          {error && (
            <div className="flex items-center space-x-2 text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">Query failed</span>
            </div>
          )}
          {result && !error && (
            <div className="flex items-center space-x-2 text-yellow-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Query executed successfully</span>
            </div>
          )}
        </div>
        {result && !error && (
          <div className="flex items-center space-x-2">
            <button
              onClick={copyToClipboard}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              <Copy className="w-4 h-4" />
              <span>Copy</span>
            </button>
            <button
              onClick={exportAsCSV}
              className="flex items-center space-x-2 px-3 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
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
              <RefreshCw className="w-8 h-8 animate-spin text-orange-400 mx-auto mb-4" />
              <p className="text-gray-300">Executing query...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Query Error</h3>
              <p className="text-red-300 mb-2">{error.message}</p>
              {error.line && (
                <p className="text-sm text-gray-400">
                  Line {error.line}{error.column && `, Column ${error.column}`}
                </p>
              )}
            </div>
          </div>
        )}

        {result && !error && (
          <div className="h-full flex flex-col">
            {/* Results Summary */}
            <div className="bg-gray-700 px-4 py-2 border-b border-gray-600">
              <div className="flex items-center justify-between text-sm text-gray-300">
                <div className="flex items-center space-x-4">
                  <span>
                    {result.rowCount.toLocaleString()} row{result.rowCount !== 1 ? 's' : ''} returned
                  </span>
                  <span>
                    Executed in {result.executionTime.toFixed(2)}ms
                  </span>
                  {result.performanceMetrics && (
                    <span>
                      Memory: {Math.round(result.performanceMetrics.memoryUsage / 1024 / 1024)}MB
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-1 text-gray-400 hover:text-white transition-colors"
                    title="Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  {virtualizationEnabled && (
                    <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                      <Zap className="w-3 h-3 inline mr-1" />
                      Virtualized
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
              <div className="bg-gray-800 border-b border-gray-600 p-4">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={virtualizationEnabled}
                      onChange={(e) => setVirtualizationEnabled(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-300">Enable Virtualization</span>
                  </label>
                  <span className="text-xs text-gray-400">
                    {virtualizationEnabled ? 'Optimized for large datasets' : 'Standard rendering'}
                  </span>
                </div>
              </div>
            )}

            {/* Data Grid */}
            <div className="flex-1 overflow-hidden">
              {result.rowCount === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <CheckCircle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                    <p className="text-gray-300">Query executed successfully</p>
                    <p className="text-sm text-gray-400">No rows returned</p>
                  </div>
                </div>
              ) : virtualizationEnabled && result.rowCount > 100 ? (
                <VirtualizedTable
                  data={tableData}
                  columns={tableColumns}
                  height={maxHeight}
                  onSort={handleSort}
                  onRowClick={handleRowClick}
                  enableSelection={true}
                  selectedRows={selectedRows}
                  onSelectionChange={handleSelectionChange}
                  enableSearch={true}
                  enableExport={true}
                  loading={isLoading}
                />
              ) : (
                <div className="h-full overflow-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-gray-700 sticky top-0">
                      <tr>
                        {result.columns.map((column, index) => (
                          <th
                            key={index}
                            onClick={() => handleSort(column, sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc')}
                            className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider border-b border-gray-600 cursor-pointer hover:bg-gray-600 select-none"
                          >
                            <div className="flex items-center space-x-1">
                              <span>{column}</span>
                              {sortColumn === column && (
                                <span className="text-orange-400">
                                  {sortDirection === 'asc' ? '↑' : '↓'}
                                </span>
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-gray-800 divide-y divide-gray-600">
                      {tableData.map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-gray-700">
                          {result.columns.map((column, cellIndex) => (
                            <td
                              key={cellIndex}
                              className="px-4 py-3 text-sm text-gray-200 border-b border-gray-700"
                            >
                              <div className="max-w-xs truncate" title={formatCellValue(row[column])}>
                                {formatCellValue(row[column])}
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {!result && !error && !isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-gray-400">📊</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No Results</h3>
              <p className="text-gray-300">Execute a query to see results here</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}