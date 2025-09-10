'use client';

// Virtualized Table Component for High-Performance Large Dataset Rendering
// Implements virtual scrolling to handle thousands of records efficiently

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ChevronUp, ChevronDown, Search, Filter, Download, RefreshCw } from 'lucide-react';

interface VirtualizedTableProps {
  data: any[];
  columns: Array<{
    key: string;
    label: string;
    width?: number;
    sortable?: boolean;
    filterable?: boolean;
    render?: (value: any, row: any, index: number) => React.ReactNode;
  }>;
  height?: number;
  rowHeight?: number;
  overscan?: number;
  onRowClick?: (row: any, index: number) => void;
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  onFilter?: (column: string, value: string) => void;
  loading?: boolean;
  className?: string;
  enableSearch?: boolean;
  enableExport?: boolean;
  enableSelection?: boolean;
  selectedRows?: Set<number>;
  onSelectionChange?: (selectedRows: Set<number>) => void;
}

interface VirtualScrollState {
  scrollTop: number;
  containerHeight: number;
  itemHeight: number;
  overscan: number;
}

export function VirtualizedTable({
  data,
  columns,
  height = 400,
  rowHeight = 40,
  overscan = 5,
  onRowClick,
  onSort,
  onFilter,
  loading = false,
  className = '',
  enableSearch = true,
  enableExport = true,
  enableSelection = false,
  selectedRows = new Set(),
  onSelectionChange
}: VirtualizedTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [virtualState, setVirtualState] = useState<VirtualScrollState>({
    scrollTop: 0,
    containerHeight: height,
    itemHeight: rowHeight,
    overscan
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  // Filter and sort data
  const processedData = useMemo(() => {
    let filtered = data;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(row =>
        columns.some(col => {
          const value = row[col.key];
          return value && String(value).toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }

    // Apply column filters
    Object.entries(filters).forEach(([column, value]) => {
      if (value) {
        filtered = filtered.filter(row => {
          const cellValue = row[column];
          return cellValue && String(cellValue).toLowerCase().includes(value.toLowerCase());
        });
      }
    });

    // Apply sorting
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        
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
    }

    return filtered;
  }, [data, searchTerm, filters, sortColumn, sortDirection, columns]);

  // Calculate virtual scrolling parameters
  const virtualParams = useMemo(() => {
    const { scrollTop, containerHeight, itemHeight, overscan } = virtualState;
    const totalHeight = processedData.length * itemHeight;
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(processedData.length - 1, startIndex + visibleCount + overscan * 2);
    const visibleItems = processedData.slice(startIndex, endIndex + 1);
    const offsetY = startIndex * itemHeight;

    return {
      totalHeight,
      visibleCount,
      startIndex,
      endIndex,
      visibleItems,
      offsetY
    };
  }, [processedData, virtualState]);

  // Handle scroll events
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setVirtualState(prev => ({ ...prev, scrollTop }));
  }, []);

  // Handle column sorting
  const handleSort = useCallback((column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    onSort?.(column, sortColumn === column ? (sortDirection === 'asc' ? 'desc' : 'asc') : 'asc');
  }, [sortColumn, sortDirection, onSort]);

  // Handle column filtering
  const handleFilter = useCallback((column: string, value: string) => {
    setFilters(prev => ({ ...prev, [column]: value }));
    onFilter?.(column, value);
  }, [onFilter]);

  // Handle row selection
  const handleRowSelect = useCallback((index: number, checked: boolean) => {
    if (!enableSelection || !onSelectionChange) return;
    
    const newSelection = new Set(selectedRows);
    if (checked) {
      newSelection.add(index);
    } else {
      newSelection.delete(index);
    }
    onSelectionChange(newSelection);
  }, [enableSelection, onSelectionChange, selectedRows]);

  // Handle select all
  const handleSelectAll = useCallback((checked: boolean) => {
    if (!enableSelection || !onSelectionChange) return;
    
    if (checked) {
      const allIndices = new Set(processedData.map((_, index) => index));
      onSelectionChange(allIndices);
    } else {
      onSelectionChange(new Set());
    }
  }, [enableSelection, onSelectionChange, processedData]);

  // Export data
  const handleExport = useCallback(() => {
    const csvContent = [
      columns.map(col => col.label).join(','),
      ...processedData.map(row =>
        columns.map(col => {
          const value = row[col.key];
          const cellStr = String(value || '');
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
    a.download = `data_export_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [processedData, columns]);

  // Update container height on resize
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setVirtualState(prev => ({
          ...prev,
          containerHeight: containerRef.current!.clientHeight
        }));
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const isAllSelected = processedData.length > 0 && selectedRows.size === processedData.length;
  const isPartiallySelected = selectedRows.size > 0 && selectedRows.size < processedData.length;

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Header Controls */}
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-white">
            Data Table ({processedData.length.toLocaleString()} records)
          </h3>
          {loading && (
            <div className="flex items-center space-x-2 text-orange-400">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {enableSearch && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:border-orange-500 focus:outline-none"
              />
            </div>
          )}
          
          {enableExport && (
            <button
              onClick={handleExport}
              className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden"
        style={{ height: `${height}px` }}
      >
        <div
          ref={scrollElementRef}
          className="h-full overflow-auto"
          onScroll={handleScroll}
        >
          {/* Virtual Scroll Spacer */}
          <div style={{ height: `${virtualParams.totalHeight}px`, position: 'relative' }}>
            {/* Table Header */}
            <div
              className="sticky top-0 z-10 bg-gray-700 border-b border-gray-600"
              style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
            >
              <div className="flex">
                {enableSelection && (
                  <div className="flex items-center justify-center p-3 border-r border-gray-600" style={{ width: '50px' }}>
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = isPartiallySelected;
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded"
                    />
                  </div>
                )}
                {columns.map((column) => (
                  <div
                    key={column.key}
                    className="flex items-center justify-between p-3 border-r border-gray-600 hover:bg-gray-600 cursor-pointer"
                    style={{ width: column.width ? `${column.width}px` : '200px' }}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <span className="text-sm font-medium text-gray-300 truncate">
                      {column.label}
                    </span>
                    {column.sortable && (
                      <div className="flex flex-col ml-2">
                        <ChevronUp
                          className={`w-3 h-3 ${
                            sortColumn === column.key && sortDirection === 'asc'
                              ? 'text-orange-400'
                              : 'text-gray-500'
                          }`}
                        />
                        <ChevronDown
                          className={`w-3 h-3 -mt-1 ${
                            sortColumn === column.key && sortDirection === 'desc'
                              ? 'text-orange-400'
                              : 'text-gray-500'
                          }`}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Virtual Rows */}
            <div
              style={{
                position: 'absolute',
                top: `${virtualParams.offsetY + 40}px`, // Account for header height
                left: 0,
                right: 0
              }}
            >
              {virtualParams.visibleItems.map((row, index) => {
                const actualIndex = virtualParams.startIndex + index;
                const isSelected = selectedRows.has(actualIndex);
                
                return (
                  <div
                    key={actualIndex}
                    className={`flex border-b border-gray-700 hover:bg-gray-700 cursor-pointer ${
                      isSelected ? 'bg-blue-900' : ''
                    }`}
                    onClick={() => onRowClick?.(row, actualIndex)}
                    style={{ height: `${rowHeight}px` }}
                  >
                    {enableSelection && (
                      <div className="flex items-center justify-center border-r border-gray-600" style={{ width: '50px' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleRowSelect(actualIndex, e.target.checked);
                          }}
                          className="rounded"
                        />
                      </div>
                    )}
                    {columns.map((column) => (
                      <div
                        key={column.key}
                        className="flex items-center p-3 border-r border-gray-600 truncate"
                        style={{ width: column.width ? `${column.width}px` : '200px' }}
                        title={String(row[column.key] || '')}
                      >
                        {column.render ? (
                          column.render(row[column.key], row, actualIndex)
                        ) : (
                          <span className="text-sm text-gray-200 truncate">
                            {row[column.key] || ''}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between p-2 bg-gray-800 border-t border-gray-700 text-sm text-gray-400">
        <div>
          Showing {virtualParams.startIndex + 1}-{Math.min(virtualParams.endIndex + 1, processedData.length)} of {processedData.length.toLocaleString()}
        </div>
        <div>
          {selectedRows.size > 0 && `${selectedRows.size} selected`}
        </div>
      </div>
    </div>
  );
}
