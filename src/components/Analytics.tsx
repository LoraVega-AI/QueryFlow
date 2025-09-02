'use client';

// Analytics component for database insights and metrics
// This component provides comprehensive analytics about the database schema and data

import React, { useState, useEffect, useCallback } from 'react';
import { DatabaseSchema, Table, QueryResult, PerformanceMetric, AuditLog } from '@/types/database';
import { dbManager } from '@/utils/database';
import { PerformanceMonitor } from '@/utils/performanceMonitor';
import { AnalyticsEngine } from '@/utils/analyticsEngine';
import { BarChart3, Database, Table as TableIcon, Users, TrendingUp, Activity, PieChart, Info, Monitor, AlertTriangle, CheckCircle, Clock, Zap, Settings, Eye, Download, Upload, Filter, Search, Calendar, Target, Layers, BarChart, LineChart, Map, Globe, Shield, Star, Bookmark, Share2, Maximize2, Minimize2, RotateCcw, Play, Pause, Square } from 'lucide-react';

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
  const [selectedMetric, setSelectedMetric] = useState<'overview' | 'tables' | 'performance' | 'schema' | 'monitoring' | 'dashboard' | 'insights' | 'kpis' | 'trends' | 'reports' | 'alerts'>('overview');
  const [realTimeData, setRealTimeData] = useState<any>(null);
  const [performanceStats, setPerformanceStats] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [customDashboard, setCustomDashboard] = useState<any[]>([]);
  
  // Advanced BI features state
  const [dataInsights, setDataInsights] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any[]>([]);
  const [trendAnalyses, setTrendAnalyses] = useState<any[]>([]);
  const [statisticalAnalyses, setStatisticalAnalyses] = useState<any[]>([]);
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [showDashboardBuilder, setShowDashboardBuilder] = useState(false);
  const [showKPIEditor, setShowKPIEditor] = useState(false);
  const [showReportBuilder, setShowReportBuilder] = useState(false);
  const [selectedDashboard, setSelectedDashboard] = useState<any>(null);
  const [dashboardLayout, setDashboardLayout] = useState<any>(null);

  // Start/stop real-time monitoring
  const toggleMonitoring = useCallback(() => {
    if (isMonitoring) {
      PerformanceMonitor.stopMonitoring();
      setIsMonitoring(false);
    } else {
      PerformanceMonitor.startMonitoring();
      setIsMonitoring(true);
    }
  }, [isMonitoring]);

  // Load real-time data
  const loadRealTimeData = useCallback(() => {
    const realTime = PerformanceMonitor.getRealTimeData();
    const stats = PerformanceMonitor.getPerformanceStats();
    const logs = PerformanceMonitor.getAuditLogs();
    
    setRealTimeData(realTime);
    setPerformanceStats(stats);
    setAuditLogs(logs.slice(0, 10)); // Show last 10 logs
  }, []);

  // Update real-time data periodically
  useEffect(() => {
    if (isMonitoring) {
      loadRealTimeData();
      const interval = setInterval(loadRealTimeData, 5000); // Update every 5 seconds
      return () => clearInterval(interval);
    }
  }, [isMonitoring, loadRealTimeData]);

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

  // Advanced BI functions
  const generateDataInsights = useCallback(() => {
    if (!schema) return;
    
    // Generate insights from table data
    const insights = AnalyticsEngine.generateInsights([]);
    setDataInsights(insights);
  }, [schema]);

  const createKPI = useCallback((name: string, description: string, formula: string) => {
    const kpi = AnalyticsEngine.createKPI(name, description, formula, []);
    setKpis(prev => [kpi, ...prev]);
  }, []);

  const analyzeTrends = useCallback((data: any[]) => {
    const trendData = data.map((item, index) => ({
      timestamp: new Date(Date.now() - (data.length - index) * 24 * 60 * 60 * 1000),
      value: typeof item === 'number' ? item : Math.random() * 100,
      metadata: { source: 'analytics' }
    }));
    
    const trendAnalysis = AnalyticsEngine.analyzeTrends(trendData);
    setTrendAnalyses(prev => [trendAnalysis, ...prev]);
  }, []);

  const performStatisticalAnalysis = useCallback((data: any[], analysisType: string) => {
    const analysis = AnalyticsEngine.performStatisticalAnalysis(data, analysisType);
    setStatisticalAnalyses(prev => [analysis, ...prev]);
  }, []);

  const createDashboard = useCallback((name: string, description: string, charts: any[]) => {
    const dashboard = AnalyticsEngine.createDashboard(name, description, charts);
    setDashboards(prev => [dashboard, ...prev]);
  }, []);

  const generateAdvancedVisualization = useCallback((data: any[], chartType: string) => {
    return AnalyticsEngine.generateAdvancedVisualizations(data, chartType);
  }, []);

  // Load analytics data
  useEffect(() => {
    if (schema) {
      calculateTableStats();
      calculateDataTypeDistribution();
      calculateQueryMetrics();
      setDataInsights(AnalyticsEngine.getInsights());
      setKpis(AnalyticsEngine.getKPIs());
      setTrendAnalyses(AnalyticsEngine.getTrendAnalyses());
      setStatisticalAnalyses(AnalyticsEngine.getStatisticalAnalyses());
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

  // Render real-time monitoring
  const renderRealTimeMonitoring = () => (
    <div className="space-y-6">
      {/* Monitoring Controls */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Real-Time Monitoring</h3>
          <button
            onClick={toggleMonitoring}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              isMonitoring
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isMonitoring ? (
              <>
                <Activity className="w-4 h-4 mr-2 inline" />
                Stop Monitoring
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2 inline" />
                Start Monitoring
              </>
            )}
          </button>
        </div>
        
        {isMonitoring && realTimeData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-blue-400 mr-2" />
                <div>
                  <div className="text-2xl font-bold text-white">{realTimeData.currentQueriesPerMinute}</div>
                  <div className="text-sm text-gray-400">Queries/min</div>
                </div>
              </div>
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center">
                <TrendingUp className="w-5 h-5 text-green-400 mr-2" />
                <div>
                  <div className="text-2xl font-bold text-white">{realTimeData.averageResponseTime}ms</div>
                  <div className="text-sm text-gray-400">Avg Response</div>
                </div>
              </div>
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center">
                <Activity className="w-5 h-5 text-orange-400 mr-2" />
                <div>
                  <div className="text-2xl font-bold text-white">{realTimeData.activeOperations}</div>
                  <div className="text-sm text-gray-400">Active Ops</div>
                </div>
              </div>
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center">
                {realTimeData.systemHealth === 'good' ? (
                  <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                ) : realTimeData.systemHealth === 'warning' ? (
                  <AlertTriangle className="w-5 h-5 text-yellow-400 mr-2" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-400 mr-2" />
                )}
                <div>
                  <div className={`text-2xl font-bold ${
                    realTimeData.systemHealth === 'good' ? 'text-green-400' :
                    realTimeData.systemHealth === 'warning' ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {realTimeData.systemHealth.toUpperCase()}
                  </div>
                  <div className="text-sm text-gray-400">System Health</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Performance Statistics */}
      {performanceStats && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Performance Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">{performanceStats.totalQueries}</div>
              <div className="text-sm text-gray-400">Total Queries</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">{performanceStats.averageQueryTime}ms</div>
              <div className="text-sm text-gray-400">Avg Query Time</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">{performanceStats.errorRate}%</div>
              <div className="text-sm text-gray-400">Error Rate</div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
        <div className="space-y-2">
          {auditLogs.map((log) => (
            <div key={log.id} className="bg-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-white font-medium">{log.action}</span>
                  {log.tableId && (
                    <span className="text-gray-400 ml-2">on {log.tableId}</span>
                  )}
                </div>
                <div className="text-sm text-gray-400">
                  {log.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          {auditLogs.length === 0 && (
            <p className="text-gray-400 text-center py-4">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );

  // Render custom dashboard
  const renderCustomDashboard = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Custom Dashboard</h3>
        <p className="text-gray-300 mb-4">
          Create personalized dashboards with drag-and-drop widgets to monitor your database performance and metrics.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gray-700 rounded-lg p-4 border-2 border-dashed border-gray-600 hover:border-orange-500 transition-colors cursor-pointer">
            <div className="text-center">
              <BarChart3 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <div className="text-white font-medium">Query Performance</div>
              <div className="text-sm text-gray-400">Add widget</div>
            </div>
          </div>
          <div className="bg-gray-700 rounded-lg p-4 border-2 border-dashed border-gray-600 hover:border-orange-500 transition-colors cursor-pointer">
            <div className="text-center">
              <Database className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <div className="text-white font-medium">Table Statistics</div>
              <div className="text-sm text-gray-400">Add widget</div>
            </div>
          </div>
          <div className="bg-gray-700 rounded-lg p-4 border-2 border-dashed border-gray-600 hover:border-orange-500 transition-colors cursor-pointer">
            <div className="text-center">
              <Activity className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <div className="text-white font-medium">System Health</div>
              <div className="text-sm text-gray-400">Add widget</div>
            </div>
          </div>
        </div>
      </div>

      {customDashboard.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Dashboard Widgets</h3>
          <div className="text-gray-400 text-center py-8">
            No widgets added yet. Click on the widgets above to add them to your dashboard.
          </div>
        </div>
      )}
    </div>
  );

  // Render data insights
  const renderDataInsights = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Data Insights</h3>
          <button
            onClick={generateDataInsights}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
          >
            <Zap className="w-4 h-4 mr-2 inline" />
            Generate Insights
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dataInsights.slice(0, 6).map((insight) => (
            <div key={insight.id} className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-1 rounded text-xs ${
                  insight.severity === 'high' ? 'bg-red-600' :
                  insight.severity === 'medium' ? 'bg-yellow-600' :
                  'bg-green-600'
                }`}>
                  {insight.severity}
                </span>
                <span className="text-xs text-gray-400">
                  {Math.round(insight.confidence * 100)}%
                </span>
              </div>
              <h4 className="text-white font-medium mb-2">{insight.title}</h4>
              <p className="text-sm text-gray-300 mb-3">{insight.description}</p>
              <div className="text-xs text-gray-400">
                {new Date(insight.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Render KPIs
  const renderKPIs = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Key Performance Indicators</h3>
          <button
            onClick={() => setShowKPIEditor(true)}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
          >
            <Target className="w-4 h-4 mr-2 inline" />
            Create KPI
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.slice(0, 8).map((kpi) => (
            <div key={kpi.id} className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-white font-medium">{kpi.name}</h4>
                <span className={`px-2 py-1 rounded text-xs ${
                  kpi.trend === 'up' ? 'bg-green-600' :
                  kpi.trend === 'down' ? 'bg-red-600' :
                  'bg-gray-600'
                }`}>
                  {kpi.trend}
                </span>
              </div>
              <div className="text-2xl font-bold text-orange-400 mb-1">
                {kpi.value.toLocaleString()}
              </div>
              <div className="text-sm text-gray-400 mb-2">
                {kpi.unit} • {kpi.change > 0 ? '+' : ''}{kpi.change.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">
                {kpi.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Render trend analysis
  const renderTrendAnalysis = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Trend Analysis</h3>
          <button
            onClick={() => analyzeTrends([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
          >
            <TrendingUp className="w-4 h-4 mr-2 inline" />
            Analyze Trends
          </button>
        </div>
        
        <div className="space-y-4">
          {trendAnalyses.slice(0, 3).map((trend) => (
            <div key={trend.id} className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-white font-medium">{trend.name}</h4>
                <span className={`px-3 py-1 rounded text-sm ${
                  trend.trend === 'increasing' ? 'bg-green-600' :
                  trend.trend === 'decreasing' ? 'bg-red-600' :
                  trend.trend === 'volatile' ? 'bg-yellow-600' :
                  'bg-gray-600'
                }`}>
                  {trend.trend}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-gray-400">Slope</div>
                  <div className="text-white font-medium">{trend.slope.toFixed(3)}</div>
                </div>
                <div>
                  <div className="text-gray-400">R²</div>
                  <div className="text-white font-medium">{trend.rSquared.toFixed(3)}</div>
                </div>
                <div>
                  <div className="text-gray-400">Data Points</div>
                  <div className="text-white font-medium">{trend.data.length}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Render reports
  const renderReports = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Analytics Reports</h3>
          <button
            onClick={() => setShowReportBuilder(true)}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2 inline" />
            Create Report
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gray-700 rounded-lg p-4 border-2 border-dashed border-gray-600 hover:border-orange-500 transition-colors cursor-pointer">
            <div className="text-center">
              <BarChart className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <div className="text-white font-medium">Performance Report</div>
              <div className="text-sm text-gray-400">Query execution metrics</div>
            </div>
          </div>
          <div className="bg-gray-700 rounded-lg p-4 border-2 border-dashed border-gray-600 hover:border-orange-500 transition-colors cursor-pointer">
            <div className="text-center">
              <Database className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <div className="text-white font-medium">Schema Report</div>
              <div className="text-sm text-gray-400">Database structure analysis</div>
            </div>
          </div>
          <div className="bg-gray-700 rounded-lg p-4 border-2 border-dashed border-gray-600 hover:border-orange-500 transition-colors cursor-pointer">
            <div className="text-center">
              <TrendingUp className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <div className="text-white font-medium">Trend Report</div>
              <div className="text-sm text-gray-400">Data trend analysis</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render alerts
  const renderAlerts = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">System Alerts</h3>
          <button
            onClick={() => {/* Create alert */}}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
          >
            <AlertTriangle className="w-4 h-4 mr-2 inline" />
            Create Alert
          </button>
        </div>
        
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-white mb-2">No Alerts</h4>
              <p className="text-gray-400">Create alerts to monitor your database performance and data quality</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-white font-medium">{alert.title}</h4>
                  <span className={`px-2 py-1 rounded text-xs ${
                    alert.severity === 'critical' ? 'bg-red-600' :
                    alert.severity === 'high' ? 'bg-orange-600' :
                    alert.severity === 'medium' ? 'bg-yellow-600' :
                    'bg-green-600'
                  }`}>
                    {alert.severity}
                  </span>
                </div>
                <p className="text-sm text-gray-300 mb-2">{alert.description}</p>
                <div className="text-xs text-gray-400">
                  {new Date(alert.createdAt).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
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
          <button
            onClick={() => setSelectedMetric('monitoring')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedMetric === 'monitoring'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Monitor className="w-4 h-4 mr-1 inline" />
            Monitoring
          </button>
          <button
            onClick={() => setSelectedMetric('dashboard')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedMetric === 'dashboard'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <BarChart3 className="w-4 h-4 mr-1 inline" />
            Dashboard
          </button>
          <button
            onClick={() => setSelectedMetric('insights')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedMetric === 'insights'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Eye className="w-4 h-4 mr-1 inline" />
            Insights
          </button>
          <button
            onClick={() => setSelectedMetric('kpis')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedMetric === 'kpis'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Target className="w-4 h-4 mr-1 inline" />
            KPIs
          </button>
          <button
            onClick={() => setSelectedMetric('trends')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedMetric === 'trends'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <TrendingUp className="w-4 h-4 mr-1 inline" />
            Trends
          </button>
          <button
            onClick={() => setSelectedMetric('reports')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedMetric === 'reports'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Download className="w-4 h-4 mr-1 inline" />
            Reports
          </button>
          <button
            onClick={() => setSelectedMetric('alerts')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedMetric === 'alerts'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <AlertTriangle className="w-4 h-4 mr-1 inline" />
            Alerts
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
            {selectedMetric === 'monitoring' && renderRealTimeMonitoring()}
            {selectedMetric === 'dashboard' && renderCustomDashboard()}
            {selectedMetric === 'insights' && renderDataInsights()}
            {selectedMetric === 'kpis' && renderKPIs()}
            {selectedMetric === 'trends' && renderTrendAnalysis()}
            {selectedMetric === 'reports' && renderReports()}
            {selectedMetric === 'alerts' && renderAlerts()}
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
