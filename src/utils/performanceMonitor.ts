// Performance monitoring utilities for QueryFlow
// This module provides real-time performance tracking and metrics

import { PerformanceMetric, AuditLog } from '@/types/database';

export class PerformanceMonitor {
  private static readonly METRICS_KEY = 'queryflow_performance_metrics';
  private static readonly AUDIT_KEY = 'queryflow_audit_logs';
  private static readonly MAX_METRICS = 1000;
  private static readonly MAX_AUDIT_LOGS = 500;

  private static metrics: PerformanceMetric[] = [];
  private static auditLogs: AuditLog[] = [];
  private static isMonitoring = false;

  /**
   * Start performance monitoring
   */
  static startMonitoring(): void {
    this.isMonitoring = true;
    this.loadMetrics();
    this.loadAuditLogs();
  }

  /**
   * Stop performance monitoring
   */
  static stopMonitoring(): void {
    this.isMonitoring = false;
  }

  /**
   * Record a performance metric
   */
  static recordMetric(
    type: 'query' | 'table' | 'index',
    name: string,
    value: number,
    unit: string,
    metadata: Record<string, any> = {}
  ): void {
    if (!this.isMonitoring) return;

    const metric: PerformanceMetric = {
      id: `metric-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      name,
      value,
      unit,
      timestamp: new Date(),
      metadata
    };

    this.metrics.push(metric);
    
    // Keep only the most recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    this.saveMetrics();
  }

  /**
   * Record query execution metrics
   */
  static recordQueryExecution(
    query: string,
    executionTime: number,
    resultCount: number,
    error?: string
  ): void {
    this.recordMetric('query', 'query_execution', executionTime, 'ms', {
      query: query.substring(0, 100), // Truncate for storage
      resultCount,
      hasError: !!error,
      error: error?.substring(0, 200)
    });

    // Record audit log
    this.recordAuditLog('query_execution', undefined, undefined, {
      query: query.substring(0, 100),
      executionTime,
      resultCount,
      error
    });
  }

  /**
   * Record table operation metrics
   */
  static recordTableOperation(
    tableName: string,
    operation: 'select' | 'insert' | 'update' | 'delete',
    recordCount: number,
    executionTime: number
  ): void {
    this.recordMetric('table', `${operation}_operation`, executionTime, 'ms', {
      tableName,
      operation,
      recordCount
    });

    this.recordAuditLog(`${operation}_table`, undefined, undefined, {
      tableName,
      recordCount,
      executionTime
    });
  }

  /**
   * Record audit log entry
   */
  static recordAuditLog(
    action: string,
    tableId?: string,
    recordId?: string,
    details: Record<string, any> = {}
  ): void {
    if (!this.isMonitoring) return;

    const auditLog: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      action,
      tableId,
      recordId,
      userId: 'current_user', // In a real app, this would come from auth
      timestamp: new Date(),
      details
    };

    this.auditLogs.push(auditLog);
    
    // Keep only the most recent audit logs
    if (this.auditLogs.length > this.MAX_AUDIT_LOGS) {
      this.auditLogs = this.auditLogs.slice(-this.MAX_AUDIT_LOGS);
    }

    this.saveAuditLogs();
  }

  /**
   * Get performance metrics
   */
  static getMetrics(
    type?: 'query' | 'table' | 'index',
    timeRange?: { start: Date; end: Date }
  ): PerformanceMetric[] {
    let filteredMetrics = this.metrics;

    if (type) {
      filteredMetrics = filteredMetrics.filter(metric => metric.type === type);
    }

    if (timeRange) {
      filteredMetrics = filteredMetrics.filter(metric => 
        metric.timestamp >= timeRange.start && metric.timestamp <= timeRange.end
      );
    }

    return filteredMetrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get audit logs
   */
  static getAuditLogs(
    action?: string,
    tableId?: string,
    timeRange?: { start: Date; end: Date }
  ): AuditLog[] {
    let filteredLogs = this.auditLogs;

    if (action) {
      filteredLogs = filteredLogs.filter(log => log.action === action);
    }

    if (tableId) {
      filteredLogs = filteredLogs.filter(log => log.tableId === tableId);
    }

    if (timeRange) {
      filteredLogs = filteredLogs.filter(log => 
        log.timestamp >= timeRange.start && log.timestamp <= timeRange.end
      );
    }

    return filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get performance statistics
   */
  static getPerformanceStats(timeRange?: { start: Date; end: Date }): {
    totalQueries: number;
    averageQueryTime: number;
    slowestQuery: PerformanceMetric | null;
    fastestQuery: PerformanceMetric | null;
    errorRate: number;
    totalOperations: number;
  } {
    const queryMetrics = this.getMetrics('query', timeRange);
    const allMetrics = this.getMetrics(undefined, timeRange);

    const totalQueries = queryMetrics.length;
    const averageQueryTime = totalQueries > 0 ? 
      queryMetrics.reduce((sum, metric) => sum + metric.value, 0) / totalQueries : 0;
    
    const slowestQuery = queryMetrics.length > 0 ? 
      queryMetrics.reduce((max, metric) => metric.value > max.value ? metric : max) : null;
    
    const fastestQuery = queryMetrics.length > 0 ? 
      queryMetrics.reduce((min, metric) => metric.value < min.value ? metric : min) : null;
    
    const errorCount = queryMetrics.filter(metric => metric.metadata.hasError).length;
    const errorRate = totalQueries > 0 ? (errorCount / totalQueries) * 100 : 0;
    
    const totalOperations = allMetrics.length;

    return {
      totalQueries,
      averageQueryTime: Math.round(averageQueryTime * 100) / 100,
      slowestQuery,
      fastestQuery,
      errorRate: Math.round(errorRate * 100) / 100,
      totalOperations
    };
  }

  /**
   * Get real-time performance data
   */
  static getRealTimeData(): {
    currentQueriesPerMinute: number;
    averageResponseTime: number;
    activeOperations: number;
    systemHealth: 'good' | 'warning' | 'critical';
  } {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    
    const recentMetrics = this.getMetrics(undefined, { start: oneMinuteAgo, end: now });
    const queryMetrics = recentMetrics.filter(m => m.type === 'query');
    
    const currentQueriesPerMinute = queryMetrics.length;
    const averageResponseTime = queryMetrics.length > 0 ? 
      queryMetrics.reduce((sum, metric) => sum + metric.value, 0) / queryMetrics.length : 0;
    
    const activeOperations = recentMetrics.length;
    
    let systemHealth: 'good' | 'warning' | 'critical' = 'good';
    if (averageResponseTime > 1000) {
      systemHealth = 'critical';
    } else if (averageResponseTime > 500 || currentQueriesPerMinute > 50) {
      systemHealth = 'warning';
    }

    return {
      currentQueriesPerMinute,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      activeOperations,
      systemHealth
    };
  }

  /**
   * Get performance trends
   */
  static getPerformanceTrends(hours: number = 24): {
    timeLabels: string[];
    queryCounts: number[];
    averageTimes: number[];
    errorRates: number[];
  } {
    const now = new Date();
    const startTime = new Date(now.getTime() - hours * 60 * 60 * 1000);
    
    const timeLabels: string[] = [];
    const queryCounts: number[] = [];
    const averageTimes: number[] = [];
    const errorRates: number[] = [];
    
    const intervalMs = hours * 60 * 60 * 1000 / 12; // 12 data points
    
    for (let i = 0; i < 12; i++) {
      const intervalStart = new Date(startTime.getTime() + i * intervalMs);
      const intervalEnd = new Date(intervalStart.getTime() + intervalMs);
      
      const intervalMetrics = this.getMetrics('query', { start: intervalStart, end: intervalEnd });
      
      timeLabels.push(intervalStart.toLocaleTimeString());
      queryCounts.push(intervalMetrics.length);
      
      const avgTime = intervalMetrics.length > 0 ? 
        intervalMetrics.reduce((sum, metric) => sum + metric.value, 0) / intervalMetrics.length : 0;
      averageTimes.push(Math.round(avgTime * 100) / 100);
      
      const errorCount = intervalMetrics.filter(metric => metric.metadata.hasError).length;
      const errorRate = intervalMetrics.length > 0 ? (errorCount / intervalMetrics.length) * 100 : 0;
      errorRates.push(Math.round(errorRate * 100) / 100);
    }
    
    return {
      timeLabels,
      queryCounts,
      averageTimes,
      errorRates
    };
  }

  /**
   * Clear all metrics
   */
  static clearMetrics(): void {
    this.metrics = [];
    this.saveMetrics();
  }

  /**
   * Clear all audit logs
   */
  static clearAuditLogs(): void {
    this.auditLogs = [];
    this.saveAuditLogs();
  }

  /**
   * Export metrics to CSV
   */
  static exportMetricsToCSV(): string {
    const headers = ['Timestamp', 'Type', 'Name', 'Value', 'Unit', 'Metadata'];
    const csvLines = [headers.join(',')];
    
    this.metrics.forEach(metric => {
      const values = [
        metric.timestamp.toISOString(),
        metric.type,
        metric.name,
        metric.value,
        metric.unit,
        JSON.stringify(metric.metadata)
      ];
      csvLines.push(values.join(','));
    });
    
    return csvLines.join('\n');
  }

  /**
   * Export audit logs to CSV
   */
  static exportAuditLogsToCSV(): string {
    const headers = ['Timestamp', 'Action', 'Table ID', 'Record ID', 'User ID', 'Details'];
    const csvLines = [headers.join(',')];
    
    this.auditLogs.forEach(log => {
      const values = [
        log.timestamp.toISOString(),
        log.action,
        log.tableId || '',
        log.recordId || '',
        log.userId || '',
        JSON.stringify(log.details)
      ];
      csvLines.push(values.join(','));
    });
    
    return csvLines.join('\n');
  }

  /**
   * Load metrics from localStorage
   */
  private static loadMetrics(): void {
    try {
      const stored = localStorage.getItem(this.METRICS_KEY);
      if (stored) {
        this.metrics = JSON.parse(stored).map((metric: any) => ({
          ...metric,
          timestamp: new Date(metric.timestamp)
        }));
      }
    } catch (error) {
      console.error('Error loading performance metrics:', error);
      this.metrics = [];
    }
  }

  /**
   * Save metrics to localStorage
   */
  private static saveMetrics(): void {
    try {
      localStorage.setItem(this.METRICS_KEY, JSON.stringify(this.metrics));
    } catch (error) {
      console.error('Error saving performance metrics:', error);
    }
  }

  /**
   * Load audit logs from localStorage
   */
  private static loadAuditLogs(): void {
    try {
      const stored = localStorage.getItem(this.AUDIT_KEY);
      if (stored) {
        this.auditLogs = JSON.parse(stored).map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp)
        }));
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
      this.auditLogs = [];
    }
  }

  /**
   * Save audit logs to localStorage
   */
  private static saveAuditLogs(): void {
    try {
      localStorage.setItem(this.AUDIT_KEY, JSON.stringify(this.auditLogs));
    } catch (error) {
      console.error('Error saving audit logs:', error);
    }
  }
}
