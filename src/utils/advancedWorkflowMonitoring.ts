// Advanced Workflow Monitoring & Analytics System
// Provides real-time monitoring, performance analytics, and compliance reporting

import { Workflow, WorkflowExecution } from './workflowAutomation';
import { IntegrationExecution } from './enterpriseIntegrationHub';

export interface WorkflowMetrics {
  executionId: string;
  workflowId: string;
  timestamp: Date;
  performance: {
    executionTime: number;
    memoryUsage: number;
    cpuUsage: number;
    networkIO: number;
    diskIO: number;
  };
  business: {
    successRate: number;
    errorRate: number;
    throughput: number; // executions per hour
    latency: number; // average execution time
    cost: number;
  };
  quality: {
    dataAccuracy: number;
    completeness: number;
    consistency: number;
    timeliness: number;
  };
  compliance: {
    securityScore: number;
    auditTrail: boolean;
    dataRetention: boolean;
    accessControl: boolean;
  };
}

export interface PerformanceAlert {
  id: string;
  type: 'performance' | 'error' | 'security' | 'compliance' | 'cost';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  workflowId: string;
  executionId?: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  metadata: Record<string, any>;
}

export interface WorkflowDashboard {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  layout: DashboardLayout;
  filters: DashboardFilter[];
  refreshInterval: number; // seconds
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'metric' | 'table' | 'alert' | 'map' | 'gauge' | 'heatmap';
  title: string;
  description: string;
  position: { x: number; y: number; width: number; height: number };
  configuration: {
    dataSource: string;
    query: string;
    visualization: any;
    refreshInterval?: number;
  };
  filters: string[];
}

export interface DashboardLayout {
  columns: number;
  rows: number;
  gridSize: number;
  responsive: boolean;
}

export interface DashboardFilter {
  id: string;
  name: string;
  type: 'date_range' | 'dropdown' | 'text' | 'number' | 'boolean';
  field: string;
  options?: any[];
  defaultValue?: any;
  required: boolean;
}

export interface ComplianceReport {
  id: string;
  name: string;
  type: 'gdpr' | 'hipaa' | 'sox' | 'pci' | 'iso27001' | 'custom';
  period: {
    start: Date;
    end: Date;
  };
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  results: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    warnings: number;
    score: number;
  };
  details: ComplianceCheck[];
  generatedAt: Date;
  generatedBy: string;
}

export interface ComplianceCheck {
  id: string;
  name: string;
  description: string;
  category: 'data_protection' | 'access_control' | 'audit_trail' | 'encryption' | 'retention';
  status: 'pass' | 'fail' | 'warning' | 'not_applicable';
  evidence: string[];
  recommendations: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  sessionId: string;
  result: 'success' | 'failure';
  errorMessage?: string;
}

export interface CostAnalysis {
  workflowId: string;
  period: {
    start: Date;
    end: Date;
  };
  totalCost: number;
  breakdown: {
    compute: number;
    storage: number;
    network: number;
    integrations: number;
    licenses: number;
  };
  trends: {
    daily: number[];
    weekly: number[];
    monthly: number[];
  };
  optimization: {
    potentialSavings: number;
    recommendations: string[];
  };
}

export interface WorkflowDependency {
  id: string;
  sourceWorkflowId: string;
  targetWorkflowId: string;
  type: 'data' | 'trigger' | 'resource' | 'schedule';
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  lastAnalyzed: Date;
}

export class AdvancedWorkflowMonitoring {
  private static instance: AdvancedWorkflowMonitoring;
  private metrics: Map<string, WorkflowMetrics[]> = new Map();
  private alerts: Map<string, PerformanceAlert> = new Map();
  private dashboards: Map<string, WorkflowDashboard> = new Map();
  private auditLogs: AuditLog[] = [];
  private complianceReports: Map<string, ComplianceReport> = new Map();
  private dependencies: Map<string, WorkflowDependency[]> = new Map();
  private realTimeSubscribers: Map<string, (metrics: WorkflowMetrics) => void> = new Map();

  private constructor() {
    this.initializeDefaultDashboards();
    this.startRealTimeMonitoring();
  }

  static getInstance(): AdvancedWorkflowMonitoring {
    if (!AdvancedWorkflowMonitoring.instance) {
      AdvancedWorkflowMonitoring.instance = new AdvancedWorkflowMonitoring();
    }
    return AdvancedWorkflowMonitoring.instance;
  }

  /**
   * Record workflow metrics
   */
  recordMetrics(metrics: WorkflowMetrics): void {
    const workflowMetrics = this.metrics.get(metrics.workflowId) || [];
    workflowMetrics.push(metrics);
    
    // Keep only last 1000 metrics per workflow
    if (workflowMetrics.length > 1000) {
      workflowMetrics.splice(0, workflowMetrics.length - 1000);
    }
    
    this.metrics.set(metrics.workflowId, workflowMetrics);
    
    // Check for alerts
    this.checkAlerts(metrics);
    
    // Notify real-time subscribers
    this.notifyRealTimeSubscribers(metrics);
  }

  /**
   * Get workflow metrics
   */
  getMetrics(
    workflowId: string,
    timeRange?: { start: Date; end: Date },
    aggregation?: 'minute' | 'hour' | 'day' | 'week' | 'month'
  ): WorkflowMetrics[] {
    let workflowMetrics = this.metrics.get(workflowId) || [];
    
    // Filter by time range
    if (timeRange) {
      workflowMetrics = workflowMetrics.filter(
        m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
      );
    }
    
    // Apply aggregation
    if (aggregation) {
      return this.aggregateMetrics(workflowMetrics, aggregation);
    }
    
    return workflowMetrics;
  }

  /**
   * Get performance analytics
   */
  getPerformanceAnalytics(workflowId: string, period: 'day' | 'week' | 'month' | 'year'): {
    trends: {
      executionTime: number[];
      successRate: number[];
      throughput: number[];
      cost: number[];
    };
    summary: {
      averageExecutionTime: number;
      totalExecutions: number;
      successRate: number;
      totalCost: number;
      peakThroughput: number;
    };
    comparisons: {
      previousPeriod: {
        executionTime: number;
        successRate: number;
        throughput: number;
        cost: number;
      };
      change: {
        executionTime: number;
        successRate: number;
        throughput: number;
        cost: number;
      };
    };
  } {
    const metrics = this.getMetrics(workflowId);
    const now = new Date();
    const periodMs = this.getPeriodMs(period);
    const startTime = new Date(now.getTime() - periodMs);
    
    const periodMetrics = metrics.filter(m => m.timestamp >= startTime);
    const previousStartTime = new Date(startTime.getTime() - periodMs);
    const previousMetrics = metrics.filter(
      m => m.timestamp >= previousStartTime && m.timestamp < startTime
    );
    
    return {
      trends: this.calculateTrends(periodMetrics, period),
      summary: this.calculateSummary(periodMetrics),
      comparisons: this.calculateComparisons(periodMetrics, previousMetrics)
    };
  }

  /**
   * Create performance alert
   */
  createAlert(alert: Omit<PerformanceAlert, 'id' | 'timestamp' | 'resolved'>): PerformanceAlert {
    const newAlert: PerformanceAlert = {
      ...alert,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      resolved: false
    };
    
    this.alerts.set(newAlert.id, newAlert);
    return newAlert;
  }

  /**
   * Get alerts
   */
  getAlerts(
    workflowId?: string,
    severity?: PerformanceAlert['severity'],
    resolved?: boolean
  ): PerformanceAlert[] {
    let alerts = Array.from(this.alerts.values());
    
    if (workflowId) {
      alerts = alerts.filter(a => a.workflowId === workflowId);
    }
    
    if (severity) {
      alerts = alerts.filter(a => a.severity === severity);
    }
    
    if (resolved !== undefined) {
      alerts = alerts.filter(a => a.resolved === resolved);
    }
    
    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string, resolvedBy: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      alert.resolvedBy = resolvedBy;
      return true;
    }
    return false;
  }

  /**
   * Create dashboard
   */
  createDashboard(dashboard: Omit<WorkflowDashboard, 'id' | 'createdAt' | 'updatedAt'>): WorkflowDashboard {
    const newDashboard: WorkflowDashboard = {
      ...dashboard,
      id: `dashboard-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.dashboards.set(newDashboard.id, newDashboard);
    return newDashboard;
  }

  /**
   * Get dashboard
   */
  getDashboard(dashboardId: string): WorkflowDashboard | undefined {
    return this.dashboards.get(dashboardId);
  }

  /**
   * Get dashboards
   */
  getDashboards(userId?: string): WorkflowDashboard[] {
    let dashboards = Array.from(this.dashboards.values());
    
    if (userId) {
      dashboards = dashboards.filter(d => d.createdBy === userId || d.isPublic);
    }
    
    return dashboards.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Update dashboard
   */
  updateDashboard(dashboardId: string, updates: Partial<WorkflowDashboard>): boolean {
    const dashboard = this.dashboards.get(dashboardId);
    if (dashboard) {
      Object.assign(dashboard, updates);
      dashboard.updatedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Delete dashboard
   */
  deleteDashboard(dashboardId: string): boolean {
    return this.dashboards.delete(dashboardId);
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    type: ComplianceReport['type'],
    period: { start: Date; end: Date },
    generatedBy: string
  ): Promise<ComplianceReport> {
    const report: ComplianceReport = {
      id: `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `${type.toUpperCase()} Compliance Report`,
      type,
      period,
      status: 'in_progress',
      results: {
        totalChecks: 0,
        passedChecks: 0,
        failedChecks: 0,
        warnings: 0,
        score: 0
      },
      details: [],
      generatedAt: new Date(),
      generatedBy
    };
    
    this.complianceReports.set(report.id, report);
    
    // Generate compliance checks based on type
    const checks = await this.generateComplianceChecks(type, period);
    report.details = checks;
    
    // Calculate results
    report.results = this.calculateComplianceResults(checks);
    report.status = 'completed';
    
    return report;
  }

  /**
   * Get compliance reports
   */
  getComplianceReports(type?: ComplianceReport['type']): ComplianceReport[] {
    let reports = Array.from(this.complianceReports.values());
    
    if (type) {
      reports = reports.filter(r => r.type === type);
    }
    
    return reports.sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
  }

  /**
   * Record audit log
   */
  recordAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): void {
    const auditLog: AuditLog = {
      ...log,
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };
    
    this.auditLogs.push(auditLog);
    
    // Keep only last 10000 audit logs
    if (this.auditLogs.length > 10000) {
      this.auditLogs.splice(0, this.auditLogs.length - 10000);
    }
  }

  /**
   * Get audit logs
   */
  getAuditLogs(
    userId?: string,
    action?: string,
    resource?: string,
    timeRange?: { start: Date; end: Date }
  ): AuditLog[] {
    let logs = [...this.auditLogs];
    
    if (userId) {
      logs = logs.filter(l => l.userId === userId);
    }
    
    if (action) {
      logs = logs.filter(l => l.action === action);
    }
    
    if (resource) {
      logs = logs.filter(l => l.resource === resource);
    }
    
    if (timeRange) {
      logs = logs.filter(
        l => l.timestamp >= timeRange.start && l.timestamp <= timeRange.end
      );
    }
    
    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Analyze workflow dependencies
   */
  analyzeDependencies(workflowId: string): WorkflowDependency[] {
    const dependencies: WorkflowDependency[] = [];
    
    // Analyze data dependencies
    const dataDeps = this.analyzeDataDependencies(workflowId);
    dependencies.push(...dataDeps);
    
    // Analyze trigger dependencies
    const triggerDeps = this.analyzeTriggerDependencies(workflowId);
    dependencies.push(...triggerDeps);
    
    // Analyze resource dependencies
    const resourceDeps = this.analyzeResourceDependencies(workflowId);
    dependencies.push(...resourceDeps);
    
    this.dependencies.set(workflowId, dependencies);
    return dependencies;
  }

  /**
   * Get workflow dependencies
   */
  getDependencies(workflowId: string): WorkflowDependency[] {
    return this.dependencies.get(workflowId) || [];
  }

  /**
   * Calculate cost analysis
   */
  calculateCostAnalysis(
    workflowId: string,
    period: { start: Date; end: Date }
  ): CostAnalysis {
    const metrics = this.getMetrics(workflowId, period);
    
    const totalCost = metrics.reduce((sum, m) => sum + m.business.cost, 0);
    
    const breakdown = {
      compute: totalCost * 0.4,
      storage: totalCost * 0.2,
      network: totalCost * 0.1,
      integrations: totalCost * 0.2,
      licenses: totalCost * 0.1
    };
    
    const trends = this.calculateCostTrends(metrics);
    
    const optimization = {
      potentialSavings: totalCost * 0.15, // 15% potential savings
      recommendations: [
        'Optimize resource allocation',
        'Use spot instances for non-critical workloads',
        'Implement auto-scaling',
        'Review integration costs'
      ]
    };
    
    return {
      workflowId,
      period,
      totalCost,
      breakdown,
      trends,
      optimization
    };
  }

  /**
   * Subscribe to real-time metrics
   */
  subscribeToRealTimeMetrics(
    workflowId: string,
    callback: (metrics: WorkflowMetrics) => void
  ): string {
    const subscriptionId = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.realTimeSubscribers.set(subscriptionId, callback);
    return subscriptionId;
  }

  /**
   * Unsubscribe from real-time metrics
   */
  unsubscribeFromRealTimeMetrics(subscriptionId: string): boolean {
    return this.realTimeSubscribers.delete(subscriptionId);
  }

  // Private helper methods

  private checkAlerts(metrics: WorkflowMetrics): void {
    // Check performance alerts
    if (metrics.performance.executionTime > 30000) { // 30 seconds
      this.createAlert({
        type: 'performance',
        severity: 'high',
        title: 'High Execution Time',
        description: `Workflow ${metrics.workflowId} execution time exceeded 30 seconds`,
        workflowId: metrics.workflowId,
        executionId: metrics.executionId,
        metadata: { executionTime: metrics.performance.executionTime }
      });
    }
    
    // Check error rate alerts
    if (metrics.business.errorRate > 0.1) { // 10% error rate
      this.createAlert({
        type: 'error',
        severity: 'critical',
        title: 'High Error Rate',
        description: `Workflow ${metrics.workflowId} error rate exceeded 10%`,
        workflowId: metrics.workflowId,
        executionId: metrics.executionId,
        metadata: { errorRate: metrics.business.errorRate }
      });
    }
    
    // Check cost alerts
    if (metrics.business.cost > 100) { // $100 cost
      this.createAlert({
        type: 'cost',
        severity: 'medium',
        title: 'High Cost',
        description: `Workflow ${metrics.workflowId} cost exceeded $100`,
        workflowId: metrics.workflowId,
        executionId: metrics.executionId,
        metadata: { cost: metrics.business.cost }
      });
    }
  }

  private notifyRealTimeSubscribers(metrics: WorkflowMetrics): void {
    this.realTimeSubscribers.forEach(callback => {
      try {
        callback(metrics);
      } catch (error) {
        console.error('Error in real-time metrics callback:', error);
      }
    });
  }

  private aggregateMetrics(metrics: WorkflowMetrics[], aggregation: string): WorkflowMetrics[] {
    // Implementation for aggregating metrics by time period
    // This is a simplified version
    return metrics;
  }

  private getPeriodMs(period: string): number {
    const periods = {
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      year: 365 * 24 * 60 * 60 * 1000
    };
    return periods[period as keyof typeof periods] || periods.day;
  }

  private calculateTrends(metrics: WorkflowMetrics[], period: string): any {
    // Implementation for calculating trends
    return {
      executionTime: metrics.map(m => m.performance.executionTime),
      successRate: metrics.map(m => m.business.successRate),
      throughput: metrics.map(m => m.business.throughput),
      cost: metrics.map(m => m.business.cost)
    };
  }

  private calculateSummary(metrics: WorkflowMetrics[]): any {
    if (metrics.length === 0) {
      return {
        averageExecutionTime: 0,
        totalExecutions: 0,
        successRate: 0,
        totalCost: 0,
        peakThroughput: 0
      };
    }
    
    return {
      averageExecutionTime: metrics.reduce((sum, m) => sum + m.performance.executionTime, 0) / metrics.length,
      totalExecutions: metrics.length,
      successRate: metrics.reduce((sum, m) => sum + m.business.successRate, 0) / metrics.length,
      totalCost: metrics.reduce((sum, m) => sum + m.business.cost, 0),
      peakThroughput: Math.max(...metrics.map(m => m.business.throughput))
    };
  }

  private calculateComparisons(current: WorkflowMetrics[], previous: WorkflowMetrics[]): any {
    const currentSummary = this.calculateSummary(current);
    const previousSummary = this.calculateSummary(previous);
    
    return {
      previousPeriod: previousSummary,
      change: {
        executionTime: currentSummary.averageExecutionTime - previousSummary.averageExecutionTime,
        successRate: currentSummary.successRate - previousSummary.successRate,
        throughput: currentSummary.peakThroughput - previousSummary.peakThroughput,
        cost: currentSummary.totalCost - previousSummary.totalCost
      }
    };
  }

  private async generateComplianceChecks(
    type: ComplianceReport['type'],
    period: { start: Date; end: Date }
  ): Promise<ComplianceCheck[]> {
    // Implementation for generating compliance checks based on type
    // This is a simplified version
    return [];
  }

  private calculateComplianceResults(checks: ComplianceCheck[]): ComplianceReport['results'] {
    const totalChecks = checks.length;
    const passedChecks = checks.filter(c => c.status === 'pass').length;
    const failedChecks = checks.filter(c => c.status === 'fail').length;
    const warnings = checks.filter(c => c.status === 'warning').length;
    const score = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 0;
    
    return {
      totalChecks,
      passedChecks,
      failedChecks,
      warnings,
      score
    };
  }

  private analyzeDataDependencies(workflowId: string): WorkflowDependency[] {
    // Implementation for analyzing data dependencies
    return [];
  }

  private analyzeTriggerDependencies(workflowId: string): WorkflowDependency[] {
    // Implementation for analyzing trigger dependencies
    return [];
  }

  private analyzeResourceDependencies(workflowId: string): WorkflowDependency[] {
    // Implementation for analyzing resource dependencies
    return [];
  }

  private calculateCostTrends(metrics: WorkflowMetrics[]): any {
    // Implementation for calculating cost trends
    return {
      daily: [],
      weekly: [],
      monthly: []
    };
  }

  private initializeDefaultDashboards(): void {
    // Create default dashboards
    const defaultDashboard: WorkflowDashboard = {
      id: 'default',
      name: 'Default Workflow Dashboard',
      description: 'Default dashboard for workflow monitoring',
      widgets: [],
      layout: {
        columns: 12,
        rows: 8,
        gridSize: 1,
        responsive: true
      },
      filters: [],
      refreshInterval: 30,
      isPublic: true,
      createdBy: 'system',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.dashboards.set(defaultDashboard.id, defaultDashboard);
  }

  private startRealTimeMonitoring(): void {
    // Start real-time monitoring loop
    setInterval(() => {
      // Simulate real-time metrics collection
      this.collectRealTimeMetrics();
    }, 5000); // Every 5 seconds
  }

  private collectRealTimeMetrics(): void {
    // Implementation for collecting real-time metrics
    // This would integrate with actual monitoring systems
  }
}

// Export singleton instance
export const advancedWorkflowMonitoring = AdvancedWorkflowMonitoring.getInstance();
