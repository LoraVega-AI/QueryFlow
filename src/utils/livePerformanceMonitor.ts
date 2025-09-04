// Live Performance Monitor for Real-time Search System
// Provides comprehensive monitoring and analytics for search performance

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  category: 'latency' | 'throughput' | 'memory' | 'cpu' | 'cache' | 'network';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface PerformanceAlert {
  id: string;
  metric: string;
  threshold: number;
  currentValue: number;
  severity: 'warning' | 'error' | 'critical';
  message: string;
  timestamp: number;
  resolved: boolean;
}

export interface PerformanceDashboard {
  metrics: PerformanceMetric[];
  alerts: PerformanceAlert[];
  summary: {
    totalQueries: number;
    averageLatency: number;
    errorRate: number;
    cacheHitRate: number;
    systemHealth: 'healthy' | 'degraded' | 'critical';
  };
  trends: {
    latency: number[];
    throughput: number[];
    memory: number[];
    timestamps: number[];
  };
}

export interface MonitoringConfig {
  collectionInterval: number;
  alertThresholds: {
    latency: { warning: number; error: number; critical: number };
    memory: { warning: number; error: number; critical: number };
    errorRate: { warning: number; error: number; critical: number };
    cacheHitRate: { warning: number; error: number; critical: number };
  };
  retentionPeriod: number;
  enableAlerts: boolean;
}

export class LivePerformanceMonitor {
  private static instance: LivePerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private alerts: PerformanceAlert[] = [];
  private config: MonitoringConfig = {
    collectionInterval: 5000,
    alertThresholds: {
      latency: { warning: 1000, error: 2000, critical: 5000 },
      memory: { warning: 70, error: 85, critical: 95 },
      errorRate: { warning: 1, error: 5, critical: 10 },
      cacheHitRate: { warning: 80, error: 70, critical: 60 }
    },
    retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
    enableAlerts: true
  };
  private collectionTimer: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private eventListeners: Map<string, Array<(data: any) => void>> = new Map();

  private constructor() {
    this.initializeConfig();
  }

  static getInstance(): LivePerformanceMonitor {
    if (!LivePerformanceMonitor.instance) {
      LivePerformanceMonitor.instance = new LivePerformanceMonitor();
    }
    return LivePerformanceMonitor.instance;
  }

  private initializeConfig(): void {
    this.config = {
      collectionInterval: 1000, // 1 second
      alertThresholds: {
        latency: { warning: 100, error: 500, critical: 1000 },
        memory: { warning: 80, error: 90, critical: 95 },
        errorRate: { warning: 5, error: 10, critical: 20 },
        cacheHitRate: { warning: 70, error: 50, critical: 30 }
      },
      retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
      enableAlerts: true
    };
  }

  // Start performance monitoring
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.collectionTimer = setInterval(() => {
      this.collectMetrics();
    }, this.config.collectionInterval);

    console.log('Live performance monitoring started');
  }

  // Stop performance monitoring
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
      this.collectionTimer = null;
    }

    console.log('Live performance monitoring stopped');
  }

  // Collect current performance metrics
  private async collectMetrics(): Promise<void> {
    try {
      const timestamp = Date.now();
      const newMetrics: PerformanceMetric[] = [];

      // Collect search engine metrics
      const { enhancedRealTimeSearchEngine } = await import('./enhancedRealTimeSearchEngine');
      const searchMetrics = enhancedRealTimeSearchEngine.getPerformanceMetrics();

      // Search latency
      newMetrics.push({
        name: 'search_latency',
        value: searchMetrics.searchLatency,
        unit: 'ms',
        timestamp,
        category: 'latency',
        severity: this.getSeverity(searchMetrics.searchLatency, this.config.alertThresholds.latency)
      });

      // Semantic processing time
      newMetrics.push({
        name: 'semantic_processing_time',
        value: searchMetrics.semanticProcessingTime,
        unit: 'ms',
        timestamp,
        category: 'latency',
        severity: this.getSeverity(searchMetrics.semanticProcessingTime, this.config.alertThresholds.latency)
      });

      // Embedding generation time
      newMetrics.push({
        name: 'embedding_generation_time',
        value: searchMetrics.embeddingGenerationTime,
        unit: 'ms',
        timestamp,
        category: 'latency',
        severity: this.getSeverity(searchMetrics.embeddingGenerationTime, this.config.alertThresholds.latency)
      });

      // Cache hit rate
      newMetrics.push({
        name: 'cache_hit_rate',
        value: searchMetrics.cacheHitRate * 100,
        unit: '%',
        timestamp,
        category: 'cache',
        severity: this.getSeverity(searchMetrics.cacheHitRate * 100, this.config.alertThresholds.cacheHitRate, true) // Inverted
      });

      // Memory usage
      newMetrics.push({
        name: 'memory_usage',
        value: searchMetrics.memoryUsage / 1024 / 1024, // Convert to MB
        unit: 'MB',
        timestamp,
        category: 'memory',
        severity: this.getSeverity(searchMetrics.memoryUsage / 1024 / 1024, { warning: 100, error: 200, critical: 500 })
      });

      // Queries per second
      newMetrics.push({
        name: 'queries_per_second',
        value: searchMetrics.queriesPerSecond,
        unit: 'qps',
        timestamp,
        category: 'throughput',
        severity: 'low' // Throughput is generally good
      });

      // Active connections
      newMetrics.push({
        name: 'active_connections',
        value: searchMetrics.activeConnections,
        unit: 'connections',
        timestamp,
        category: 'network',
        severity: this.getSeverity(searchMetrics.activeConnections, { warning: 50, error: 100, critical: 200 })
      });

      // Add new metrics
      this.metrics.push(...newMetrics);

      // Clean up old metrics
      this.cleanupOldMetrics();

      // Check for alerts
      if (this.config.enableAlerts) {
        this.checkAlerts(newMetrics);
      }

      // Emit metrics update event
      this.emitEvent('metrics_update', { metrics: newMetrics, timestamp });

    } catch (error) {
      console.error('Failed to collect performance metrics:', error);
    }
  }

  // Determine severity level based on thresholds
  private getSeverity(value: number, thresholds: { warning: number; error: number; critical: number }, inverted = false): 'low' | 'medium' | 'high' | 'critical' {
    if (inverted) {
      if (value <= thresholds.critical) return 'critical';
      if (value <= thresholds.error) return 'high';
      if (value <= thresholds.warning) return 'medium';
      return 'low';
    } else {
      if (value >= thresholds.critical) return 'critical';
      if (value >= thresholds.error) return 'high';
      if (value >= thresholds.warning) return 'medium';
      return 'low';
    }
  }

  // Check for performance alerts
  private checkAlerts(metrics: PerformanceMetric[]): void {
    for (const metric of metrics) {
      if (metric.severity === 'high' || metric.severity === 'critical') {
        const existingAlert = this.alerts.find(
          alert => alert.metric === metric.name && !alert.resolved
        );

        if (!existingAlert) {
          const alert: PerformanceAlert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            metric: metric.name,
            threshold: this.getThresholdForMetric(metric.name),
            currentValue: metric.value,
            severity: metric.severity === 'critical' ? 'critical' : 'error',
            message: this.generateAlertMessage(metric),
            timestamp: Date.now(),
            resolved: false
          };

          this.alerts.push(alert);
          this.emitEvent('alert_created', alert);
        }
      }
    }
  }

  // Get threshold for a specific metric
  private getThresholdForMetric(metricName: string): number {
    switch (metricName) {
      case 'search_latency':
      case 'semantic_processing_time':
      case 'embedding_generation_time':
        return this.config.alertThresholds.latency.warning;
      case 'cache_hit_rate':
        return this.config.alertThresholds.cacheHitRate.warning;
      case 'memory_usage':
        return 100; // 100MB
      case 'active_connections':
        return 50;
      default:
        return 0;
    }
  }

  // Generate alert message
  private generateAlertMessage(metric: PerformanceMetric): string {
    const metricNames: Record<string, string> = {
      'search_latency': 'Search Latency',
      'semantic_processing_time': 'Semantic Processing Time',
      'embedding_generation_time': 'Embedding Generation Time',
      'cache_hit_rate': 'Cache Hit Rate',
      'memory_usage': 'Memory Usage',
      'queries_per_second': 'Queries Per Second',
      'active_connections': 'Active Connections'
    };

    const name = metricNames[metric.name] || metric.name;
    return `${name} is ${metric.value}${metric.unit} (${metric.severity} level)`;
  }

  // Clean up old metrics
  private cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - this.config.retentionPeriod;
    this.metrics = this.metrics.filter(metric => metric.timestamp > cutoffTime);
  }

  // Record a custom metric
  recordMetric(name: string, value: number, unit: string, category: PerformanceMetric['category']): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      category,
      severity: 'low'
    };

    this.metrics.push(metric);
    this.emitEvent('custom_metric', metric);
  }

  // Record search performance
  recordSearchPerformance(latency: number, resultCount: number, success: boolean): void {
    this.recordMetric('search_latency', latency, 'ms', 'latency');
    this.recordMetric('search_result_count', resultCount, 'results', 'throughput');
    
    if (!success) {
      this.recordMetric('search_errors', 1, 'errors', 'latency');
    }
  }

  // Get current dashboard data
  getDashboard(): PerformanceDashboard {
    const now = Date.now();
    const lastHour = now - (60 * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp > lastHour);

    // Calculate summary
    const searchLatencies = recentMetrics.filter(m => m.name === 'search_latency').map(m => m.value);
    const cacheHitRates = recentMetrics.filter(m => m.name === 'cache_hit_rate').map(m => m.value);
    const errorCount = recentMetrics.filter(m => m.name === 'search_errors').length;
    const totalQueries = recentMetrics.filter(m => m.name === 'queries_per_second').reduce((sum, m) => sum + m.value, 0);

    const averageLatency = searchLatencies.length > 0 ? searchLatencies.reduce((sum, val) => sum + val, 0) / searchLatencies.length : 0;
    const averageCacheHitRate = cacheHitRates.length > 0 ? cacheHitRates.reduce((sum, val) => sum + val, 0) / cacheHitRates.length : 0;
    const errorRate = totalQueries > 0 ? (errorCount / totalQueries) * 100 : 0;

    // Determine system health
    let systemHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (averageLatency > this.config.alertThresholds.latency.error || errorRate > this.config.alertThresholds.errorRate.error) {
      systemHealth = 'critical';
    } else if (averageLatency > this.config.alertThresholds.latency.warning || errorRate > this.config.alertThresholds.errorRate.warning) {
      systemHealth = 'degraded';
    }

    // Generate trends (last 60 data points)
    const trendMetrics = this.metrics.slice(-60);
    const trends = {
      latency: trendMetrics.filter(m => m.name === 'search_latency').map(m => m.value),
      throughput: trendMetrics.filter(m => m.name === 'queries_per_second').map(m => m.value),
      memory: trendMetrics.filter(m => m.name === 'memory_usage').map(m => m.value),
      timestamps: trendMetrics.map(m => m.timestamp)
    };

    return {
      metrics: recentMetrics,
      alerts: this.alerts.filter(alert => !alert.resolved),
      summary: {
        totalQueries,
        averageLatency,
        errorRate,
        cacheHitRate: averageCacheHitRate,
        systemHealth
      },
      trends
    };
  }

  // Get metrics by category
  getMetricsByCategory(category: PerformanceMetric['category']): PerformanceMetric[] {
    return this.metrics.filter(metric => metric.category === category);
  }

  // Get recent alerts
  getRecentAlerts(limit: number = 10): PerformanceAlert[] {
    return this.alerts
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  // Resolve an alert
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      this.emitEvent('alert_resolved', alert);
      return true;
    }
    return false;
  }

  // Update configuration
  updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Get current configuration
  getConfig(): MonitoringConfig {
    return { ...this.config };
  }

  // Event system
  private emitEvent(eventType: string, data: any): void {
    const listeners = this.eventListeners.get(eventType) || [];
    listeners.forEach(listener => listener(data));
  }

  addEventListener(eventType: string, listener: (data: any) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  removeEventListener(eventType: string, listener: (data: any) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Get monitoring status
  isMonitoringActive(): boolean {
    return this.isMonitoring;
  }

  // Get system statistics
  getSystemStats(): {
    totalMetrics: number;
    activeAlerts: number;
    monitoringDuration: number;
    averageLatency: number;
  } {
    const activeAlerts = this.alerts.filter(alert => !alert.resolved).length;
    const searchLatencies = this.metrics.filter(m => m.name === 'search_latency').map(m => m.value);
    const averageLatency = searchLatencies.length > 0 ? 
      searchLatencies.reduce((sum, val) => sum + val, 0) / searchLatencies.length : 0;

    return {
      totalMetrics: this.metrics.length,
      activeAlerts,
      monitoringDuration: this.isMonitoring ? Date.now() - (this.metrics[0]?.timestamp || Date.now()) : 0,
      averageLatency
    };
  }
}

// Export singleton instance
export const livePerformanceMonitor = LivePerformanceMonitor.getInstance();
