// Monitoring Service
// Provides real-time monitoring, metrics collection, and alerting

export interface Metric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags: Record<string, string>;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
}

export interface Alert {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'resolved' | 'acknowledged';
  condition: {
    metric: string;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    threshold: number;
    duration: number; // in seconds
  };
  triggeredAt?: Date;
  resolvedAt?: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  workflowId?: string;
  executionId?: string;
}

export interface Dashboard {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  layout: {
    columns: number;
    rows: number;
  };
  refreshInterval: number; // in seconds
  isPublic: boolean;
  userId: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'alert' | 'log';
  title: string;
  config: {
    metric?: string;
    chartType?: 'line' | 'bar' | 'pie' | 'gauge';
    timeRange?: string;
    filters?: Record<string, any>;
    query?: string;
  };
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface PerformanceReport {
  id: string;
  workflowId: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    totalExecutionTime: number;
    throughput: number; // executions per hour
    errorRate: number;
    cost: number;
  };
  trends: {
    executionTime: Array<{ timestamp: Date; value: number }>;
    successRate: Array<{ timestamp: Date; value: number }>;
    throughput: Array<{ timestamp: Date; value: number }>;
  };
  recommendations: string[];
  generatedAt: Date;
}

export interface AuditLog {
  id: string;
  userId: string;
  organizationId: string;
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

class MonitoringService {
  private metrics: Map<string, Metric[]> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private dashboards: Map<string, Dashboard> = new Map();
  private auditLogs: AuditLog[] = [];
  private subscribers: Map<string, ((data: any) => void)[]> = new Map();
  private alertCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startAlertMonitoring();
    this.startMetricsCollection();
  }

  private startAlertMonitoring(): void {
    // Check alerts every 30 seconds
    this.alertCheckInterval = setInterval(() => {
      this.checkAlerts();
    }, 30000);
  }

  private startMetricsCollection(): void {
    // Collect system metrics every 10 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 10000);
  }

  private async collectSystemMetrics(): Promise<void> {
    const timestamp = new Date();
    
    // Collect CPU usage
    const cpuUsage = Math.random() * 100;
    this.recordMetric({
      id: `cpu_usage_${timestamp.getTime()}`,
      name: 'system.cpu.usage',
      value: cpuUsage,
      unit: 'percent',
      timestamp,
      tags: { host: 'localhost', type: 'system' },
      type: 'gauge'
    });

    // Collect memory usage
    const memoryUsage = Math.random() * 100;
    this.recordMetric({
      id: `memory_usage_${timestamp.getTime()}`,
      name: 'system.memory.usage',
      value: memoryUsage,
      unit: 'percent',
      timestamp,
      tags: { host: 'localhost', type: 'system' },
      type: 'gauge'
    });

    // Collect workflow execution metrics
    const activeExecutions = Math.floor(Math.random() * 10);
    this.recordMetric({
      id: `active_executions_${timestamp.getTime()}`,
      name: 'workflow.executions.active',
      value: activeExecutions,
      unit: 'count',
      timestamp,
      tags: { type: 'workflow' },
      type: 'gauge'
    });
  }

  recordMetric(metric: Metric): void {
    if (!this.metrics.has(metric.name)) {
      this.metrics.set(metric.name, []);
    }
    
    const metrics = this.metrics.get(metric.name)!;
    metrics.push(metric);
    
    // Keep only last 1000 metrics per name
    if (metrics.length > 1000) {
      metrics.splice(0, metrics.length - 1000);
    }

    // Emit metric event
    this.emit('metric', metric);
  }

  async getMetrics(name: string, timeRange?: { start: Date; end: Date }): Promise<Metric[]> {
    const metrics = this.metrics.get(name) || [];
    
    if (timeRange) {
      return metrics.filter(metric => 
        metric.timestamp >= timeRange.start && metric.timestamp <= timeRange.end
      );
    }
    
    return metrics;
  }

  async getMetricNames(): Promise<string[]> {
    return Array.from(this.metrics.keys());
  }

  async createAlert(alert: Omit<Alert, 'id'>): Promise<Alert> {
    const id = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newAlert: Alert = {
      ...alert,
      id
    };

    this.alerts.set(id, newAlert);
    
    // Emit alert created event
    this.emit('alert_created', newAlert);
    
    return newAlert;
  }

  async getAlerts(workflowId?: string): Promise<Alert[]> {
    const alerts = Array.from(this.alerts.values());
    
    if (workflowId) {
      return alerts.filter(alert => alert.workflowId === workflowId);
    }
    
    return alerts;
  }

  async updateAlert(id: string, updates: Partial<Alert>): Promise<Alert> {
    const alert = this.alerts.get(id);
    if (!alert) {
      throw new Error('Alert not found');
    }

    const updatedAlert = { ...alert, ...updates };
    this.alerts.set(id, updatedAlert);
    
    // Emit alert updated event
    this.emit('alert_updated', updatedAlert);
    
    return updatedAlert;
  }

  async acknowledgeAlert(id: string, userId: string): Promise<Alert> {
    return this.updateAlert(id, {
      status: 'acknowledged',
      acknowledgedAt: new Date(),
      acknowledgedBy: userId
    });
  }

  async resolveAlert(id: string): Promise<Alert> {
    return this.updateAlert(id, {
      status: 'resolved',
      resolvedAt: new Date()
    });
  }

  private async checkAlerts(): Promise<void> {
    const activeAlerts = Array.from(this.alerts.values()).filter(alert => alert.status === 'active');
    
    for (const alert of activeAlerts) {
      try {
        const metrics = await this.getMetrics(alert.condition.metric, {
          start: new Date(Date.now() - alert.condition.duration * 1000),
          end: new Date()
        });

        if (metrics.length === 0) continue;

        const latestMetric = metrics[metrics.length - 1];
        const shouldTrigger = this.evaluateCondition(latestMetric.value, alert.condition);

        if (shouldTrigger && !alert.triggeredAt) {
          // Trigger alert
          const triggeredAlert = await this.updateAlert(alert.id, {
            status: 'active',
            triggeredAt: new Date()
          });

          // Emit alert triggered event
          this.emit('alert_triggered', triggeredAlert);
        } else if (!shouldTrigger && alert.triggeredAt) {
          // Resolve alert
          await this.resolveAlert(alert.id);
        }
      } catch (error) {
        console.error(`Error checking alert ${alert.id}:`, error);
      }
    }
  }

  private evaluateCondition(value: number, condition: Alert['condition']): boolean {
    switch (condition.operator) {
      case 'gt':
        return value > condition.threshold;
      case 'lt':
        return value < condition.threshold;
      case 'eq':
        return value === condition.threshold;
      case 'gte':
        return value >= condition.threshold;
      case 'lte':
        return value <= condition.threshold;
      default:
        return false;
    }
  }

  async createDashboard(dashboard: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>): Promise<Dashboard> {
    const id = `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const newDashboard: Dashboard = {
      ...dashboard,
      id,
      createdAt: now,
      updatedAt: now
    };

    this.dashboards.set(id, newDashboard);
    
    // Emit dashboard created event
    this.emit('dashboard_created', newDashboard);
    
    return newDashboard;
  }

  async getDashboards(userId: string, organizationId: string): Promise<Dashboard[]> {
    // For demo purposes, return mock dashboards
    const mockDashboards: Dashboard[] = [
      {
        id: 'dashboard_1',
        name: 'Workflow Performance Dashboard',
        description: 'Monitor workflow execution performance and metrics',
        widgets: [
          {
            id: 'widget_1',
            type: 'metric',
            title: 'Total Executions',
            config: { metric: 'workflow.executions.total' },
            position: { x: 0, y: 0, width: 4, height: 2 }
          },
          {
            id: 'widget_2',
            type: 'chart',
            title: 'Execution Success Rate',
            config: { chartType: 'line', metric: 'workflow.executions.success_rate' },
            position: { x: 4, y: 0, width: 4, height: 2 }
          },
          {
            id: 'widget_3',
            type: 'table',
            title: 'Recent Executions',
            config: { query: 'SELECT * FROM executions ORDER BY start_time DESC LIMIT 10' },
            position: { x: 0, y: 2, width: 8, height: 4 }
          }
        ],
        layout: { columns: 8, rows: 6 },
        refreshInterval: 30,
        isPublic: false,
        userId: userId,
        organizationId: organizationId,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'dashboard_2',
        name: 'System Health Dashboard',
        description: 'Monitor system health and resource usage',
        widgets: [
          {
            id: 'widget_4',
            type: 'chart',
            title: 'CPU Usage',
            config: { metric: 'system.cpu.usage', chartType: 'gauge' },
            position: { x: 0, y: 0, width: 3, height: 3 }
          },
          {
            id: 'widget_5',
            type: 'chart',
            title: 'Memory Usage',
            config: { metric: 'system.memory.usage', chartType: 'gauge' },
            position: { x: 3, y: 0, width: 3, height: 3 }
          },
          {
            id: 'widget_6',
            type: 'chart',
            title: 'Active Workflows',
            config: { chartType: 'bar', metric: 'workflow.active_count' },
            position: { x: 6, y: 0, width: 3, height: 3 }
          }
        ],
        layout: { columns: 9, rows: 6 },
        refreshInterval: 10,
        isPublic: true,
        userId: userId,
        organizationId: organizationId,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      }
    ];

    return mockDashboards;
  }

  async getDashboard(id: string): Promise<Dashboard | null> {
    return this.dashboards.get(id) || null;
  }

  async updateDashboard(id: string, updates: Partial<Dashboard>): Promise<Dashboard> {
    const dashboard = this.dashboards.get(id);
    if (!dashboard) {
      throw new Error('Dashboard not found');
    }

    const updatedDashboard = { 
      ...dashboard, 
      ...updates, 
      updatedAt: new Date() 
    };
    this.dashboards.set(id, updatedDashboard);
    
    // Emit dashboard updated event
    this.emit('dashboard_updated', updatedDashboard);
    
    return updatedDashboard;
  }

  async deleteDashboard(id: string): Promise<void> {
    const dashboard = this.dashboards.get(id);
    if (!dashboard) {
      throw new Error('Dashboard not found');
    }

    this.dashboards.delete(id);
    
    // Emit dashboard deleted event
    this.emit('dashboard_deleted', { id });
  }

  async generatePerformanceReport(
    workflowId: string,
    period: { start: Date; end: Date }
  ): Promise<PerformanceReport> {
    const id = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const report: PerformanceReport = {
      id,
      workflowId,
      period,
      metrics: {
        totalExecutions: Math.floor(Math.random() * 1000) + 100,
        successfulExecutions: Math.floor(Math.random() * 900) + 90,
        failedExecutions: Math.floor(Math.random() * 100) + 10,
        averageExecutionTime: Math.random() * 5000 + 1000,
        totalExecutionTime: Math.random() * 1000000 + 100000,
        throughput: Math.random() * 100 + 10,
        errorRate: Math.random() * 0.1,
        cost: Math.random() * 1000 + 100
      },
      trends: {
        executionTime: this.generateTrendData(period),
        successRate: this.generateTrendData(period),
        throughput: this.generateTrendData(period)
      },
      recommendations: [
        'Consider optimizing step 2 for better performance',
        'Add error handling for external API calls',
        'Implement caching for frequently accessed data'
      ],
      generatedAt: new Date()
    };

    // Emit report generated event
    this.emit('report_generated', report);
    
    return report;
  }

  private generateTrendData(period: { start: Date; end: Date }): Array<{ timestamp: Date; value: number }> {
    const data = [];
    const interval = (period.end.getTime() - period.start.getTime()) / 24; // 24 data points
    
    for (let i = 0; i < 24; i++) {
      data.push({
        timestamp: new Date(period.start.getTime() + i * interval),
        value: Math.random() * 100
      });
    }
    
    return data;
  }

  async logAuditEvent(event: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    const auditLog: AuditLog = {
      ...event,
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    this.auditLogs.push(auditLog);
    
    // Keep only last 10000 audit logs
    if (this.auditLogs.length > 10000) {
      this.auditLogs.splice(0, this.auditLogs.length - 10000);
    }

    // Emit audit event
    this.emit('audit_log', auditLog);
  }

  async getAuditLogs(
    userId?: string,
    organizationId?: string,
    limit: number = 100
  ): Promise<AuditLog[]> {
    // For demo purposes, return mock audit logs
    const mockAuditLogs: AuditLog[] = [
      {
        id: 'audit_1',
        userId: userId || 'user_1',
        organizationId: organizationId || 'org_1',
        action: 'workflow_executed',
        resource: 'workflow',
        resourceId: 'wf_1',
        details: { workflowName: 'Data Backup Workflow', status: 'completed' },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        id: 'audit_2',
        userId: userId || 'user_1',
        organizationId: organizationId || 'org_1',
        action: 'workflow_created',
        resource: 'workflow',
        resourceId: 'wf_2',
        details: { workflowName: 'Data Validation Pipeline', trigger: 'manual' },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'audit_3',
        userId: userId || 'user_1',
        organizationId: organizationId || 'org_1',
        action: 'workflow_updated',
        resource: 'workflow',
        resourceId: 'wf_3',
        details: { workflowName: 'User Onboarding Automation', changes: ['steps', 'config'] },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'audit_4',
        userId: userId || 'user_1',
        organizationId: organizationId || 'org_1',
        action: 'dashboard_created',
        resource: 'dashboard',
        resourceId: 'dashboard_1',
        details: { dashboardName: 'Workflow Performance Dashboard', widgets: 3 },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'audit_5',
        userId: userId || 'user_1',
        organizationId: organizationId || 'org_1',
        action: 'user_login',
        resource: 'user',
        resourceId: userId || 'user_1',
        details: { loginMethod: 'password', success: true },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      }
    ];

    let logs = [...mockAuditLogs];
    
    if (userId) {
      logs = logs.filter(log => log.userId === userId);
    }
    
    if (organizationId) {
      logs = logs.filter(log => log.organizationId === organizationId);
    }
    
    // Sort by timestamp descending
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return logs.slice(0, limit);
  }

  // Real-time subscriptions
  subscribe(event: string, callback: (data: any) => void): string {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }
    
    this.subscribers.get(event)!.push(callback);
    
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  unsubscribe(event: string, callback: (data: any) => void): void {
    const subscribers = this.subscribers.get(event);
    if (subscribers) {
      const index = subscribers.indexOf(callback);
      if (index > -1) {
        subscribers.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const subscribers = this.subscribers.get(event);
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event subscriber for ${event}:`, error);
        }
      });
    }
  }

  // Health check
  async healthCheck(): Promise<{ 
    status: string; 
    metrics: number; 
    alerts: number; 
    dashboards: number; 
    auditLogs: number; 
    timestamp: Date 
  }> {
    return {
      status: 'healthy',
      metrics: Array.from(this.metrics.values()).reduce((sum, metrics) => sum + metrics.length, 0),
      alerts: this.alerts.size,
      dashboards: this.dashboards.size,
      auditLogs: this.auditLogs.length,
      timestamp: new Date()
    };
  }

  // Cleanup
  destroy(): void {
    if (this.alertCheckInterval) {
      clearInterval(this.alertCheckInterval);
    }
  }
}

// Create singleton instance
const monitoringService = new MonitoringService();

export default monitoringService;
