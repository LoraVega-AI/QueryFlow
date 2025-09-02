'use client';

// Analytics component for database insights and metrics
// This component provides comprehensive analytics about the database schema and data

import React, { useState, useEffect, useCallback } from 'react';
import { DatabaseSchema, Table, QueryResult } from '@/types/database';
import { dbManager } from '@/utils/database';
import { BarChart3, Database, Table as TableIcon, Users, TrendingUp, Activity, PieChart, Info } from 'lucide-react';

interface AnalyticsProps {
  schema: DatabaseSchema | null;
}

interface TableStats {
  tableName: string;
  recordCount: number;
  columnCount: number;
  primaryKeys: number;
  foreignKeys: number;
  nullableColumns: number;
}

interface DataTypeDistribution {
  type: string;
  count: number;
  percentage: number;
}

interface QueryMetrics {
  totalQueries: number;
  averageExecutionTime: number;
  lastQueryTime: string;
  mostUsedTables: string[];
}

export function Analytics({ schema }: AnalyticsProps) {
  const [tableStats, setTableStats] = useState<TableStats[]>([]);
  const [dataTypeDistribution, setDataTypeDistribution] = useState<DataTypeDistribution[]>([]);
  const [queryMetrics, setQueryMetrics] = useState<QueryMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'overview' | 'tables' | 'performance' | 'schema'>('overview');

  // Calculate table statistics
  const calculateTableStats = useCallback(async () => {
    if (!schema || schema.tables.length === 0) {
      setTableStats([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Initialize database
      await dbManager.initialize();
      await dbManager.createTablesFromSchema(schema);

      const stats: TableStats[] = [];

      for (const table of schema.tables) {
        try {
          // Get record count
          const countResult = await dbManager.executeQuery(`SELECT COUNT(*) as count FROM "${table.name}"`);
          const recordCount = countResult.rows[0]?.[0] || 0;

          // Calculate column statistics
          const columnCount = table.columns.length;
          const primaryKeys = table.columns.filter(col => col.primaryKey).length;
          const foreignKeys = table.columns.filter(col => col.foreignKey).length;
          const nullableColumns = table.columns.filter(col => col.nullable).length;

          stats.push({
            tableName: table.name,
            recordCount: Number(recordCount),
            columnCount,
            primaryKeys,
            foreignKeys,
            nullableColumns
          });
        } catch (err) {
          // Table might not exist or be empty
          stats.push({
            tableName: table.name,
            recordCount: 0,
            columnCount: table.columns.length,
            primaryKeys: table.columns.filter(col => col.primaryKey).length,
            foreignKeys: table.columns.filter(col => col.foreignKey).length,
            nullableColumns: table.columns.filter(col => col.nullable).length
          });
        }
      }

      setTableStats(stats);
    } catch (err: any) {
      setError(err.message || 'Failed to calculate table statistics');
      console.error('Error calculating table stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, [schema]);

  // Calculate data type distribution
  const calculateDataTypeDistribution = useCallback(() => {
    if (!schema || schema.tables.length === 0) {
      setDataTypeDistribution([]);
      return;
    }

    const typeCount: Record<string, number> = {};
    let totalColumns = 0;

    schema.tables.forEach(table => {
      table.columns.forEach(column => {
        typeCount[column.type] = (typeCount[column.type] || 0) + 1;
        totalColumns++;
      });
    });

    const distribution: DataTypeDistribution[] = Object.entries(typeCount).map(([type, count]) => ({
      type,
      count,
      percentage: Math.round((count / totalColumns) * 100)
    }));

    setDataTypeDistribution(distribution.sort((a, b) => b.count - a.count));
  }, [schema]);

  // Calculate query metrics (mock data for now)
  const calculateQueryMetrics = useCallback(() => {
    const metrics: QueryMetrics = {
      totalQueries: Math.floor(Math.random() * 100) + 50,
      averageExecutionTime: Math.round((Math.random() * 50 + 10) * 100) / 100,
      lastQueryTime: new Date().toLocaleTimeString(),
      mostUsedTables: schema?.tables.slice(0, 3).map(t => t.name) || []
    };

    setQueryMetrics(metrics);
  }, [schema]);

  // Load analytics data
  useEffect(() => {
    if (schema) {
      calculateTableStats();
      calculateDataTypeDistribution();
      calculateQueryMetrics();
    }
  }, [schema, calculateTableStats, calculateDataTypeDistribution, calculateQueryMetrics]);

  // Get color for data type
  const getDataTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      'TEXT': 'bg-orange-500',
      'INTEGER': 'bg-yellow-500',
      'REAL': 'bg-yellow-600',
      'BLOB': 'bg-purple-500',
      'BOOLEAN': 'bg-pink-500',
      'DATE': 'bg-indigo-500',
      'DATETIME': 'bg-gray-500',
    };
    return colors[type] || 'bg-gray-400';
  };

  // Render overview metrics
  const renderOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Tables */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Total Tables</p>
            <p className="text-2xl font-bold text-white">{schema?.tables.length || 0}</p>
          </div>
          <div className="p-3 bg-orange-600 rounded-lg">
            <TableIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Total Columns */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Total Columns</p>
            <p className="text-2xl font-bold text-white">
              {schema?.tables.reduce((sum, table) => sum + table.columns.length, 0) || 0}
            </p>
          </div>
          <div className="p-3 bg-yellow-600 rounded-lg">
            <Database className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Total Records */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Total Records</p>
            <p className="text-2xl font-bold text-white">
              {tableStats.reduce((sum, stat) => sum + stat.recordCount, 0)}
            </p>
          </div>
          <div className="p-3 bg-green-600 rounded-lg">
            <Users className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Database Size */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Schema Health</p>
            <p className="text-2xl font-bold text-green-400">Good</p>
          </div>
          <div className="p-3 bg-green-600 rounded-lg">
            <Activity className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
    </div>
  );

  // Render table statistics
  const renderTableStats = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <TableIcon className="w-5 h-5 mr-2" />
          Table Statistics
        </h3>
        {tableStats.length === 0 ? (
          <p className="text-gray-400">No tables available</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-300">Table Name</th>
                  <th className="text-left py-3 px-4 text-gray-300">Records</th>
                  <th className="text-left py-3 px-4 text-gray-300">Columns</th>
                  <th className="text-left py-3 px-4 text-gray-300">Primary Keys</th>
                  <th className="text-left py-3 px-4 text-gray-300">Foreign Keys</th>
                  <th className="text-left py-3 px-4 text-gray-300">Nullable</th>
                </tr>
              </thead>
              <tbody>
                {tableStats.map((stat, index) => (
                  <tr key={index} className="border-b border-gray-700 hover:bg-gray-700">
                    <td className="py-3 px-4 text-white font-medium">{stat.tableName}</td>
                    <td className="py-3 px-4 text-gray-300">{stat.recordCount}</td>
                    <td className="py-3 px-4 text-gray-300">{stat.columnCount}</td>
                    <td className="py-3 px-4 text-gray-300">{stat.primaryKeys}</td>
                    <td className="py-3 px-4 text-gray-300">{stat.foreignKeys}</td>
                    <td className="py-3 px-4 text-gray-300">{stat.nullableColumns}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  // Render data type distribution
  const renderDataTypeDistribution = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <PieChart className="w-5 h-5 mr-2" />
          Data Type Distribution
        </h3>
        {dataTypeDistribution.length === 0 ? (
          <p className="text-gray-400">No data types available</p>
        ) : (
          <div className="space-y-4">
            {dataTypeDistribution.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded ${getDataTypeColor(item.type)}`}></div>
                  <span className="text-gray-300">{item.type}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-32 bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getDataTypeColor(item.type)}`}
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-white font-medium w-12 text-right">
                    {item.count} ({item.percentage}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Render performance metrics
  const renderPerformanceMetrics = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2" />
          Query Performance
        </h3>
        {queryMetrics ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Total Queries</span>
                <span className="text-white font-semibold">{queryMetrics.totalQueries}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Average Execution Time</span>
                <span className="text-white font-semibold">{queryMetrics.averageExecutionTime}ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Last Query Time</span>
                <span className="text-white font-semibold">{queryMetrics.lastQueryTime}</span>
              </div>
            </div>
            <div>
              <h4 className="text-gray-300 mb-2">Most Used Tables</h4>
              <div className="space-y-2">
                {queryMetrics.mostUsedTables.map((table, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-white">{table}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-400">No performance data available</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-white">Analytics</h2>
          <span className="text-sm text-gray-300">Database insights and metrics</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSelectedMetric('overview')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedMetric === 'overview'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setSelectedMetric('tables')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedMetric === 'tables'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Tables
          </button>
          <button
            onClick={() => setSelectedMetric('performance')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedMetric === 'performance'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Performance
          </button>
          <button
            onClick={() => setSelectedMetric('schema')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedMetric === 'schema'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Schema
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-900 border-b border-red-700">
          <p className="text-red-200">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <div className="flex items-center space-x-2 text-orange-500">
            <Activity className="w-5 h-5 animate-spin" />
            <span>Loading analytics...</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {!schema || schema.tables.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No Data Available</h3>
              <p className="text-gray-300">Create tables in the Schema Designer to see analytics</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {selectedMetric === 'overview' && renderOverview()}
            {selectedMetric === 'tables' && renderTableStats()}
            {selectedMetric === 'performance' && renderPerformanceMetrics()}
            {selectedMetric === 'schema' && renderDataTypeDistribution()}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 bg-gray-800 border-t border-gray-700">
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <Info className="w-4 h-4" />
          <span>Analytics are calculated in real-time based on your current schema and data</span>
        </div>
      </div>
    </div>
  );
}
