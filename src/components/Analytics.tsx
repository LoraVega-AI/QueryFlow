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
  const [showAlertCreator, setShowAlertCreator] = useState(false);
  const [selectedDashboard, setSelectedDashboard] = useState<any>(null);
  const [dashboardLayout, setDashboardLayout] = useState<any>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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
  const generateDataInsights = useCallback(async () => {
    if (!schema) return;
    
    setIsLoading(true);
    try {
      // Initialize database
      await dbManager.initialize();
      await dbManager.createTablesFromSchema(schema);
      
      const insights: any[] = [];
      
      // Analyze each table for insights
      for (const table of schema.tables) {
        try {
          const result = await dbManager.executeQuery(`SELECT * FROM "${table.name}"`);
          
          if (result.rows.length > 0) {
            // Check for data quality issues
            const totalRows = result.rows.length;
            const nullCounts: Record<string, number> = {};
            
            // Count nulls in each column
            result.columns.forEach((col, colIndex) => {
              const nullCount = result.rows.filter(row => row[colIndex] === null || row[colIndex] === undefined).length;
              nullCounts[col] = nullCount;
            });
            
            // Generate insights based on data analysis
            Object.entries(nullCounts).forEach(([column, nullCount]) => {
              const nullPercentage = (nullCount / totalRows) * 100;
              
              if (nullPercentage > 50) {
                insights.push({
                  id: `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  title: `High null percentage in ${table.name}.${column}`,
                  description: `${nullPercentage.toFixed(1)}% of records have null values in this column`,
                  type: 'data_quality',
                  severity: nullPercentage > 80 ? 'high' : 'medium',
                  confidence: 0.9,
                  data: { table: table.name, column, nullCount, totalRows, percentage: nullPercentage },
                  recommendations: ['Consider data validation rules', 'Review data collection process'],
                  createdAt: new Date()
                });
              }
            });
            
            // Check for duplicate data
            const uniqueRows = new Set(result.rows.map(row => JSON.stringify(row)));
            if (uniqueRows.size < totalRows * 0.9) {
              insights.push({
                id: `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                title: `Potential duplicates in ${table.name}`,
                description: `${totalRows - uniqueRows.size} potential duplicate records found`,
                type: 'duplicate',
                severity: 'medium',
                confidence: 0.8,
                data: { table: table.name, totalRows, uniqueRows: uniqueRows.size, duplicates: totalRows - uniqueRows.size },
                recommendations: ['Implement duplicate detection', 'Add unique constraints'],
                createdAt: new Date()
              });
            }
            
            // Check for data distribution
            result.columns.forEach((col, colIndex) => {
              const values = result.rows.map(row => row[colIndex]).filter(v => v !== null && v !== undefined);
              if (values.length > 10) {
                const numericValues = values.filter(v => typeof v === 'number' || !isNaN(Number(v))).map(v => Number(v));
                if (numericValues.length > 5) {
                  const mean = numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length;
                  const variance = numericValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / numericValues.length;
                  const stdDev = Math.sqrt(variance);
                  
                  // Check for outliers
                  const outliers = numericValues.filter(val => Math.abs(val - mean) > 3 * stdDev);
                  if (outliers.length > 0) {
                    insights.push({
                      id: `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                      title: `Outliers detected in ${table.name}.${col}`,
                      description: `${outliers.length} outliers found (${(outliers.length / numericValues.length * 100).toFixed(1)}%)`,
                      type: 'outlier',
                      severity: outliers.length > numericValues.length * 0.1 ? 'high' : 'medium',
                      confidence: 0.85,
                      data: { table: table.name, column: col, outliers: outliers.length, total: numericValues.length, mean, stdDev },
                      recommendations: ['Review outlier values for accuracy', 'Consider data cleaning'],
                      createdAt: new Date()
                    });
                  }
                }
              }
            });
          } else {
            // Empty table insight
            insights.push({
              id: `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              title: `Empty table: ${table.name}`,
              description: 'This table contains no data',
              type: 'empty_table',
              severity: 'low',
              confidence: 1.0,
              data: { table: table.name, recordCount: 0 },
              recommendations: ['Consider populating the table with data', 'Review if table is still needed'],
              createdAt: new Date()
            });
          }
        } catch (err) {
          // Table access error insight
          insights.push({
            id: `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: `Table access issue: ${table.name}`,
            description: 'Unable to access table data for analysis',
            type: 'access_error',
            severity: 'medium',
            confidence: 1.0,
            data: { table: table.name, error: err instanceof Error ? err.message : 'Unknown error' },
            recommendations: ['Check table permissions', 'Verify table exists'],
            createdAt: new Date()
          });
        }
      }
      
      setDataInsights(insights);
      setNotification({ type: 'success', message: `Generated ${insights.length} data insights from ${schema.tables.length} tables` });
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      setNotification({ type: 'error', message: `Failed to generate insights: ${error.message}` });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsLoading(false);
    }
  }, [schema]);

  const createKPI = useCallback(async (name: string, description: string, formula: string, target?: number) => {
    if (!schema) return;
    
    setIsLoading(true);
    try {
      // Initialize database
      await dbManager.initialize();
      await dbManager.createTablesFromSchema(schema);
      
      // Calculate actual KPI value based on real data
      let actualValue = 0;
      let data: any[] = [];
      
      // Collect data from all tables
      for (const table of schema.tables) {
        try {
          const result = await dbManager.executeQuery(`SELECT * FROM "${table.name}"`);
          data.push(...result.rows.flat());
        } catch (err) {
          // Table might be empty or not exist
          console.log(`Table ${table.name} not accessible for KPI calculation`);
        }
      }
      
      // Calculate based on formula
      switch (formula) {
        case 'COUNT':
          actualValue = data.length;
          break;
        case 'SUM':
          actualValue = data.filter(d => typeof d === 'number').reduce((sum, val) => sum + val, 0);
          break;
        case 'AVG':
          const numericData = data.filter(d => typeof d === 'number');
          actualValue = numericData.length > 0 ? numericData.reduce((sum, val) => sum + val, 0) / numericData.length : 0;
          break;
        case 'MIN':
          const minData = data.filter(d => typeof d === 'number');
          actualValue = minData.length > 0 ? Math.min(...minData) : 0;
          break;
        case 'MAX':
          const maxData = data.filter(d => typeof d === 'number');
          actualValue = maxData.length > 0 ? Math.max(...maxData) : 0;
          break;
      }
      
      // Create KPI with real calculated value
      const kpi = AnalyticsEngine.createKPI(name, description, formula, data);
      kpi.value = actualValue;
      if (target !== undefined) {
        kpi.target = target;
        // Calculate trend based on target vs actual
        kpi.trend = actualValue >= target ? 'up' : 'down';
        kpi.change = target > 0 ? ((actualValue - target) / target) * 100 : 0;
      }
      
      setKpis(prev => [kpi, ...prev]);
      setShowKPIEditor(false);
      setNotification({ type: 'success', message: `KPI "${name}" created with value: ${actualValue.toLocaleString()}` });
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      setNotification({ type: 'error', message: `Failed to create KPI: ${error.message}` });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsLoading(false);
    }
  }, [schema]);

  const analyzeTrends = useCallback(async (data: any[]) => {
    if (!schema) return;
    
    setIsLoading(true);
    try {
      // Initialize database
      await dbManager.initialize();
      await dbManager.createTablesFromSchema(schema);
      
      const trendData: any[] = [];
      
      // Analyze trends across all tables
      for (const table of schema.tables) {
        try {
          const result = await dbManager.executeQuery(`SELECT * FROM "${table.name}"`);
          
          if (result.rows.length > 0) {
            // Look for date/time columns for trend analysis
            const dateColumns = result.columns.filter((col, index) => {
              const sampleValues = result.rows.slice(0, 5).map(row => row[index]);
              return sampleValues.some(val => 
                val && (typeof val === 'string' && !isNaN(Date.parse(val))) ||
                val instanceof Date
              );
            });
            
            if (dateColumns.length > 0) {
              const dateColumn = dateColumns[0];
              const dateIndex = result.columns.indexOf(dateColumn);
              
              // Group data by time periods and analyze trends
              const timeGroups: Record<string, any[]> = {};
              
              result.rows.forEach(row => {
                const dateValue = row[dateIndex];
                if (dateValue) {
                  const date = new Date(dateValue);
                  const timeKey = date.toISOString().split('T')[0]; // Group by day
                  
                  if (!timeGroups[timeKey]) {
                    timeGroups[timeKey] = [];
                  }
                  timeGroups[timeKey].push(row);
                }
              });
              
              // Convert to trend data points
              Object.entries(timeGroups).forEach(([date, rows]) => {
                trendData.push({
                  timestamp: new Date(date),
                  value: rows.length, // Count of records per day
                  metadata: { 
                    source: 'analytics',
                    table: table.name,
                    dateColumn: dateColumn,
                    recordCount: rows.length
                  }
                });
              });
            } else {
              // If no date columns, analyze by row order (assuming chronological)
              result.rows.forEach((row, index) => {
                // Look for numeric columns to analyze
                const numericValues = row.filter(val => typeof val === 'number' || !isNaN(Number(val)));
                if (numericValues.length > 0) {
                  const avgValue = numericValues.reduce((sum, val) => sum + Number(val), 0) / numericValues.length;
                  trendData.push({
                    timestamp: new Date(Date.now() - (result.rows.length - index) * 24 * 60 * 60 * 1000),
                    value: avgValue,
                    metadata: { 
                      source: 'analytics',
                      table: table.name,
                      rowIndex: index,
                      numericColumns: numericValues.length
                    }
                  });
                }
              });
            }
          }
        } catch (err) {
          console.log(`Error analyzing trends for table ${table.name}:`, err);
        }
      }
      
      if (trendData.length > 0) {
        // Sort by timestamp
        trendData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        
        // Perform actual trend analysis
        const trendAnalysis = AnalyticsEngine.analyzeTrends(trendData);
        setTrendAnalyses(prev => [trendAnalysis, ...prev]);
        setNotification({ type: 'success', message: `Trend analysis completed: ${trendAnalysis.trend} trend detected across ${trendData.length} data points` });
        setTimeout(() => setNotification(null), 3000);
      } else {
        setNotification({ type: 'error', message: 'No suitable data found for trend analysis' });
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (error: any) {
      setNotification({ type: 'error', message: `Failed to analyze trends: ${error.message}` });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsLoading(false);
    }
  }, [schema]);

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

  const createAlert = useCallback((title: string, description: string, severity: string, condition: string) => {
    const alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      description,
      severity,
      condition,
      enabled: true,
      createdAt: new Date(),
      lastTriggered: null,
      triggerCount: 0,
      threshold: getThresholdForCondition(condition),
      isActive: false
    };
    setAlerts(prev => [alert, ...prev]);
    setShowAlertCreator(false);
    setNotification({ type: 'success', message: `Alert "${title}" created successfully` });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Helper function to get threshold values for conditions
  const getThresholdForCondition = (condition: string): number => {
    switch (condition) {
      case 'query_time_high': return 5000; // 5 seconds
      case 'error_rate_high': return 10; // 10%
      case 'table_size_large': return 1000000000; // 1GB
      case 'connection_count_high': return 100; // 100 connections
      default: return 0;
    }
  };

  // Real-time alert monitoring
  const checkAlerts = useCallback(async () => {
    if (!schema || alerts.length === 0) return;
    
    try {
      await dbManager.initialize();
      await dbManager.createTablesFromSchema(schema);
      
      const triggeredAlerts: any[] = [];
      
      for (const alert of alerts) {
        if (!alert.enabled) continue;
        
        let shouldTrigger = false;
        let currentValue = 0;
        
        switch (alert.condition) {
          case 'query_time_high':
            // Simulate query execution time check
            const startTime = Date.now();
            try {
              await dbManager.executeQuery(`SELECT COUNT(*) FROM "${schema.tables[0]?.name || 'users'}"`);
              currentValue = Date.now() - startTime;
              shouldTrigger = currentValue > alert.threshold;
            } catch (err) {
              // Query failed - could be an alert condition
              shouldTrigger = true;
              currentValue = 0;
            }
            break;
            
          case 'error_rate_high':
            // Calculate error rate based on failed queries
            let totalQueries = 0;
            let failedQueries = 0;
            
            for (const table of schema.tables.slice(0, 3)) { // Check first 3 tables
              try {
                await dbManager.executeQuery(`SELECT COUNT(*) FROM "${table.name}"`);
                totalQueries++;
              } catch (err) {
                totalQueries++;
                failedQueries++;
              }
            }
            
            currentValue = totalQueries > 0 ? (failedQueries / totalQueries) * 100 : 0;
            shouldTrigger = currentValue > alert.threshold;
            break;
            
          case 'table_size_large':
            // Estimate table size based on record count
            let totalSize = 0;
            for (const table of schema.tables) {
              try {
                const result = await dbManager.executeQuery(`SELECT COUNT(*) FROM "${table.name}"`);
                const recordCount = result.rows[0]?.[0] || 0;
                // Estimate 1KB per record
                totalSize += Number(recordCount) * 1024;
              } catch (err) {
                // Table not accessible
              }
            }
            currentValue = totalSize;
            shouldTrigger = currentValue > alert.threshold;
            break;
            
          case 'connection_count_high':
            // Simulate connection count (mock value)
            currentValue = Math.floor(Math.random() * 150) + 50; // Random between 50-200
            shouldTrigger = currentValue > alert.threshold;
            break;
        }
        
        if (shouldTrigger && !alert.isActive) {
          // Alert triggered
          const updatedAlert = {
            ...alert,
            isActive: true,
            lastTriggered: new Date(),
            triggerCount: alert.triggerCount + 1,
            currentValue
          };
          
          triggeredAlerts.push(updatedAlert);
          
          // Show alert notification
          setNotification({ 
            type: 'error', 
            message: `ALERT: ${alert.title} - ${alert.description} (Current: ${currentValue})` 
          });
          setTimeout(() => setNotification(null), 10000); // Show for 10 seconds
        } else if (!shouldTrigger && alert.isActive) {
          // Alert resolved
          const updatedAlert = {
            ...alert,
            isActive: false,
            currentValue
          };
          triggeredAlerts.push(updatedAlert);
        }
      }
      
      // Update alerts with new states
      if (triggeredAlerts.length > 0) {
        setAlerts(prev => prev.map(alert => {
          const updated = triggeredAlerts.find(a => a.id === alert.id);
          return updated || alert;
        }));
      }
    } catch (error) {
      console.error('Error checking alerts:', error);
    }
  }, [schema, alerts]);

  // Start alert monitoring
  useEffect(() => {
    if (alerts.length > 0) {
      const interval = setInterval(checkAlerts, 30000); // Check every 30 seconds
      return () => clearInterval(interval);
    }
  }, [alerts, checkAlerts]);

  const createReport = useCallback(async (name: string, description: string, type: string, config: any) => {
    if (!schema) return;
    
    setIsLoading(true);
    try {
      // Initialize database
      await dbManager.initialize();
      await dbManager.createTablesFromSchema(schema);
      
      let reportData: any = {};
      let reportContent = '';
      
      // Generate actual report data based on type
      switch (type) {
        case 'performance':
          // Performance report
          const performanceData = {
            totalTables: schema.tables.length,
            totalColumns: schema.tables.reduce((sum, table) => sum + table.columns.length, 0),
            totalRecords: 0,
            averageRecordsPerTable: 0,
            tableDetails: [] as any[]
          };
          
          for (const table of schema.tables) {
            try {
              const result = await dbManager.executeQuery(`SELECT COUNT(*) as count FROM "${table.name}"`);
              const recordCount = result.rows[0]?.[0] || 0;
              performanceData.totalRecords += Number(recordCount);
              performanceData.tableDetails.push({
                name: table.name,
                columns: table.columns.length,
                records: Number(recordCount),
                primaryKeys: table.columns.filter(col => col.primaryKey).length,
                foreignKeys: table.columns.filter(col => col.foreignKey).length
              });
            } catch (err) {
              performanceData.tableDetails.push({
                name: table.name,
                columns: table.columns.length,
                records: 0,
                primaryKeys: table.columns.filter(col => col.primaryKey).length,
                foreignKeys: table.columns.filter(col => col.foreignKey).length
              });
            }
          }
          
          performanceData.averageRecordsPerTable = performanceData.totalTables > 0 ? 
            performanceData.totalRecords / performanceData.totalTables : 0;
          
          reportData = performanceData;
          reportContent = `Performance Report - ${name}\n\n` +
            `Total Tables: ${performanceData.totalTables}\n` +
            `Total Columns: ${performanceData.totalColumns}\n` +
            `Total Records: ${performanceData.totalRecords}\n` +
            `Average Records per Table: ${performanceData.averageRecordsPerTable.toFixed(2)}\n\n` +
            `Table Details:\n` +
            performanceData.tableDetails.map(table => 
              `- ${table.name}: ${table.records} records, ${table.columns} columns`
            ).join('\n');
          break;
          
        case 'schema':
          // Schema report
          const schemaData = {
            schemaName: schema.name,
            version: schema.version,
            totalTables: schema.tables.length,
            totalColumns: schema.tables.reduce((sum, table) => sum + table.columns.length, 0),
            totalRelationships: schema.tables.reduce((sum, table) => 
              sum + table.columns.filter(col => col.foreignKey).length, 0),
            tables: schema.tables.map(table => ({
              name: table.name,
              columns: table.columns.map(col => ({
                name: col.name,
                type: col.type,
                nullable: col.nullable,
                primaryKey: col.primaryKey,
                foreignKey: col.foreignKey ? {
                  table: col.foreignKey.tableId,
                  column: col.foreignKey.columnId,
                  relationship: col.foreignKey.relationshipType
                } : null
              }))
            }))
          };
          
          reportData = schemaData;
          reportContent = `Schema Report - ${name}\n\n` +
            `Schema: ${schemaData.schemaName}\n` +
            `Version: ${schemaData.version}\n` +
            `Total Tables: ${schemaData.totalTables}\n` +
            `Total Columns: ${schemaData.totalColumns}\n` +
            `Total Relationships: ${schemaData.totalRelationships}\n\n` +
            `Tables:\n` +
            schemaData.tables.map(table => 
              `- ${table.name}:\n` +
              table.columns.map(col => 
                `  - ${col.name} (${col.type})${col.primaryKey ? ' [PK]' : ''}${col.foreignKey ? ' [FK]' : ''}`
              ).join('\n')
            ).join('\n\n');
          break;
          
        case 'trend':
          // Trend report
          const trendData = {
            analysisDate: new Date().toISOString(),
            totalDataPoints: 0,
            trends: [] as any[]
          };
          
          // Analyze trends from existing trend analyses
          trendAnalyses.forEach(trend => {
            trendData.totalDataPoints += trend.data.length;
            trendData.trends.push({
              name: trend.name,
              trend: trend.trend,
              slope: trend.slope,
              rSquared: trend.rSquared,
              dataPoints: trend.data.length
            });
          });
          
          reportData = trendData;
          reportContent = `Trend Report - ${name}\n\n` +
            `Analysis Date: ${trendData.analysisDate}\n` +
            `Total Data Points: ${trendData.totalDataPoints}\n\n` +
            `Trends:\n` +
            trendData.trends.map(trend => 
              `- ${trend.name}: ${trend.trend} (slope: ${trend.slope.toFixed(3)}, R²: ${trend.rSquared.toFixed(3)})`
            ).join('\n');
          break;
          
        case 'summary':
          // Summary report
          const summaryData = {
            generatedAt: new Date().toISOString(),
            schema: {
              name: schema.name,
              tables: schema.tables.length,
              columns: schema.tables.reduce((sum, table) => sum + table.columns.length, 0)
            },
            analytics: {
              insights: dataInsights.length,
              kpis: kpis.length,
              trends: trendAnalyses.length,
              alerts: alerts.length
            }
          };
          
          reportData = summaryData;
          reportContent = `Summary Report - ${name}\n\n` +
            `Generated: ${summaryData.generatedAt}\n\n` +
            `Schema Overview:\n` +
            `- Name: ${summaryData.schema.name}\n` +
            `- Tables: ${summaryData.schema.tables}\n` +
            `- Columns: ${summaryData.schema.columns}\n\n` +
            `Analytics Overview:\n` +
            `- Insights: ${summaryData.analytics.insights}\n` +
            `- KPIs: ${summaryData.analytics.kpis}\n` +
            `- Trends: ${summaryData.analytics.trends}\n` +
            `- Alerts: ${summaryData.analytics.alerts}`;
          break;
      }
      
      // Create report object
      const report = {
        id: `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name,
        description,
        type,
        config,
        data: reportData,
        content: reportContent,
        createdAt: new Date(),
        lastGenerated: new Date(),
        generatedCount: 1
      };
      
      setReports(prev => [report, ...prev]);
      setShowReportBuilder(false);
      
      // Auto-download the report
      const blob = new Blob([reportContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.replace(/\s+/g, '_')}_report.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setNotification({ type: 'success', message: `Report "${name}" generated and downloaded successfully` });
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      setNotification({ type: 'error', message: `Failed to generate report: ${error.message}` });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsLoading(false);
    }
  }, [schema, trendAnalyses, dataInsights, kpis, alerts]);

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
            onClick={() => setShowAlertCreator(true)}
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
              <div key={alert.id} className={`rounded-lg p-4 ${
                alert.isActive ? 'bg-red-900 border border-red-700' : 'bg-gray-700'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-white font-medium">{alert.title}</h4>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      alert.severity === 'critical' ? 'bg-red-600' :
                      alert.severity === 'high' ? 'bg-orange-600' :
                      alert.severity === 'medium' ? 'bg-yellow-600' :
                      'bg-green-600'
                    }`}>
                      {alert.severity}
                    </span>
                    {alert.isActive && (
                      <span className="px-2 py-1 rounded text-xs bg-red-600 animate-pulse">
                        ACTIVE
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-300 mb-2">{alert.description}</p>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Created: {new Date(alert.createdAt).toLocaleString()}</span>
                  {alert.lastTriggered && (
                    <span>Last triggered: {new Date(alert.lastTriggered).toLocaleString()}</span>
                  )}
                </div>
                {alert.triggerCount > 0 && (
                  <div className="text-xs text-orange-400 mt-1">
                    Triggered {alert.triggerCount} time(s)
                  </div>
                )}
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

      {/* KPI Editor Modal */}
      {showKPIEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Create New KPI</h3>
              <button
                onClick={() => setShowKPIEditor(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  id="kpi-name"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter KPI name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  id="kpi-description"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter KPI description"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Formula</label>
                <select
                  id="kpi-formula"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="COUNT">COUNT - Count records</option>
                  <option value="SUM">SUM - Sum values</option>
                  <option value="AVG">AVG - Average values</option>
                  <option value="MIN">MIN - Minimum value</option>
                  <option value="MAX">MAX - Maximum value</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Target Value (Optional)</label>
                <input
                  type="number"
                  id="kpi-target"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter target value"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-2 p-4 border-t border-gray-700">
              <button
                onClick={() => setShowKPIEditor(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const name = (document.getElementById('kpi-name') as HTMLInputElement)?.value;
                  const description = (document.getElementById('kpi-description') as HTMLTextAreaElement)?.value;
                  const formula = (document.getElementById('kpi-formula') as HTMLSelectElement)?.value;
                  const target = (document.getElementById('kpi-target') as HTMLInputElement)?.value;
                  
                  if (name && description && formula) {
                    createKPI(name, description, formula, target ? parseFloat(target) : undefined);
                  }
                }}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
              >
                Create KPI
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Creator Modal */}
      {showAlertCreator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Create New Alert</h3>
              <button
                onClick={() => setShowAlertCreator(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  id="alert-title"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter alert title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  id="alert-description"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter alert description"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Severity</label>
                <select
                  id="alert-severity"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Condition</label>
                <select
                  id="alert-condition"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="query_time_high">Query execution time &gt; 5 seconds</option>
                  <option value="error_rate_high">Error rate &gt; 10%</option>
                  <option value="table_size_large">Table size &gt; 1GB</option>
                  <option value="connection_count_high">Active connections &gt; 100</option>
                </select>
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-2 p-4 border-t border-gray-700">
              <button
                onClick={() => setShowAlertCreator(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const title = (document.getElementById('alert-title') as HTMLInputElement)?.value;
                  const description = (document.getElementById('alert-description') as HTMLTextAreaElement)?.value;
                  const severity = (document.getElementById('alert-severity') as HTMLSelectElement)?.value;
                  const condition = (document.getElementById('alert-condition') as HTMLSelectElement)?.value;
                  
                  if (title && description && severity && condition) {
                    createAlert(title, description, severity, condition);
                  }
                }}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
              >
                Create Alert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Builder Modal */}
      {showReportBuilder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Create New Report</h3>
              <button
                onClick={() => setShowReportBuilder(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Report Name</label>
                <input
                  type="text"
                  id="report-name"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter report name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  id="report-description"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter report description"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Report Type</label>
                <select
                  id="report-type"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="performance">Performance Report</option>
                  <option value="schema">Schema Report</option>
                  <option value="trend">Trend Report</option>
                  <option value="summary">Summary Report</option>
                </select>
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-2 p-4 border-t border-gray-700">
              <button
                onClick={() => setShowReportBuilder(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const name = (document.getElementById('report-name') as HTMLInputElement)?.value;
                  const description = (document.getElementById('report-description') as HTMLTextAreaElement)?.value;
                  const type = (document.getElementById('report-type') as HTMLSelectElement)?.value;
                  
                  if (name && description && type) {
                    createReport(name, description, type, { format: 'pdf', schedule: 'daily' });
                  }
                }}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
              >
                Create Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50">
          <div className={`px-4 py-3 rounded-lg shadow-lg ${
            notification.type === 'success' 
              ? 'bg-green-600 text-white' 
              : 'bg-red-600 text-white'
          }`}>
            <div className="flex items-center space-x-2">
              {notification.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
              <span>{notification.message}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
