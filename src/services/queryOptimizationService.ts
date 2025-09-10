// Query Optimization Service for QueryFlow
// Advanced SQL query analysis, optimization, and performance profiling

import { DatabaseSchema, Table, Column, QueryResult } from '@/types/database';

export interface QueryPlan {
  id: string;
  query: string;
  estimatedCost: number;
  estimatedRows: number;
  executionTimeMs?: number;
  actualRows?: number;
  steps: QueryPlanStep[];
  indexes: IndexUsage[];
  warnings: string[];
  recommendations: QueryRecommendation[];
  createdAt: Date;
}

export interface QueryPlanStep {
  id: string;
  operation: 'scan' | 'seek' | 'join' | 'sort' | 'filter' | 'aggregate' | 'insert' | 'update' | 'delete';
  table?: string;
  index?: string;
  condition?: string;
  estimatedCost: number;
  estimatedRows: number;
  actualCost?: number;
  actualRows?: number;
  children: QueryPlanStep[];
  level: number;
}

export interface IndexUsage {
  indexName: string;
  tableName: string;
  columns: string[];
  seekCount: number;
  scanCount: number;
  lookupCount: number;
  efficiency: number; // 0-100
  recommendation?: string;
}

export interface QueryRecommendation {
  id: string;
  type: 'index' | 'rewrite' | 'schema' | 'configuration' | 'statistics';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  before?: string;
  after?: string;
  estimatedImprovement: number; // Percentage improvement
  sqlExample?: string;
}

export interface QueryPerformanceMetrics {
  queryId: string;
  query: string;
  avgExecutionTime: number;
  minExecutionTime: number;
  maxExecutionTime: number;
  executionCount: number;
  totalCpuTime: number;
  totalIoTime: number;
  cacheHitRatio: number;
  lastExecuted: Date;
  trend: 'improving' | 'stable' | 'degrading';
  alertLevel: 'none' | 'warning' | 'critical';
}

export interface PerformanceReport {
  id: string;
  schemaId: string;
  generatedAt: Date;
  timeRange: {
    start: Date;
    end: Date;
  };
  summary: {
    totalQueries: number;
    avgResponseTime: number;
    slowQueries: number;
    improvementOpportunities: number;
    overallScore: number; // 0-100
  };
  topSlowQueries: QueryPerformanceMetrics[];
  indexRecommendations: IndexRecommendation[];
  queryOptimizations: QueryRecommendation[];
  trendAnalysis: TrendAnalysis;
  alerts: PerformanceAlert[];
}

export interface IndexRecommendation {
  id: string;
  type: 'create' | 'drop' | 'modify' | 'rebuild';
  priority: 'low' | 'medium' | 'high' | 'critical';
  tableName: string;
  columns: string[];
  indexName?: string;
  reason: string;
  impact: string;
  queries: string[];
  estimatedImprovement: number;
  storageImpact: number; // MB
  maintenanceImpact: 'low' | 'medium' | 'high';
  ddlStatement: string;
}

export interface TrendAnalysis {
  performanceTrend: 'improving' | 'stable' | 'degrading';
  queryCountTrend: 'increasing' | 'stable' | 'decreasing';
  resourceUsageTrend: 'increasing' | 'stable' | 'decreasing';
  regressionQueries: string[];
  improvedQueries: string[];
  newBottlenecks: string[];
}

export interface PerformanceAlert {
  id: string;
  type: 'regression' | 'threshold' | 'anomaly' | 'resource';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  description: string;
  query?: string;
  metric: string;
  threshold?: number;
  currentValue: number;
  detectedAt: Date;
  acknowledged: boolean;
  actionRequired: string;
}

export interface QueryCache {
  [queryHash: string]: {
    plan: QueryPlan;
    lastUsed: Date;
    useCount: number;
  };
}

export class QueryOptimizationService {
  private static queryCache: QueryCache = {};
  private static performanceHistory: Map<string, QueryPerformanceMetrics[]> = new Map();
  
  /**
   * Analyze query and generate optimization recommendations
   */
  static async analyzeQuery(
    query: string,
    schema: DatabaseSchema,
    executionStats?: Partial<QueryPerformanceMetrics>
  ): Promise<QueryPlan> {
    const startTime = Date.now();
    
    // Check cache first
    const queryHash = this.hashQuery(query);
    const cached = this.queryCache[queryHash];
    if (cached && (Date.now() - cached.lastUsed.getTime()) < 300000) { // 5-minute cache
      cached.lastUsed = new Date();
      cached.useCount++;
      return cached.plan;
    }

    // Parse and analyze query
    const parsedQuery = this.parseQuery(query);
    const plan = await this.generateExecutionPlan(parsedQuery, schema);
    
    // Add execution statistics if available
    if (executionStats) {
      plan.executionTimeMs = executionStats.avgExecutionTime;
      plan.actualRows = executionStats.executionCount;
    }

    // Generate recommendations
    plan.recommendations = await this.generateRecommendations(plan, schema, parsedQuery);
    plan.warnings = this.generateWarnings(plan, parsedQuery);

    // Cache the result
    this.queryCache[queryHash] = {
      plan,
      lastUsed: new Date(),
      useCount: 1
    };

    return plan;
  }

  /**
   * Generate comprehensive performance report
   */
  static async generatePerformanceReport(
    schema: DatabaseSchema,
    timeRange: { start: Date; end: Date }
  ): Promise<PerformanceReport> {
    const queryMetrics = this.getQueryMetrics(timeRange);
    const slowQueries = queryMetrics
      .filter(m => m.avgExecutionTime > 1000) // Queries slower than 1 second
      .sort((a, b) => b.avgExecutionTime - a.avgExecutionTime)
      .slice(0, 10);

    const indexRecommendations = await this.generateIndexRecommendations(schema, queryMetrics);
    const queryOptimizations = await this.generateQueryOptimizations(queryMetrics);
    const trendAnalysis = this.analyzeTrends(queryMetrics, timeRange);
    const alerts = this.generateAlerts(queryMetrics, trendAnalysis);

    return {
      id: `perf_report_${Date.now()}`,
      schemaId: schema.id,
      generatedAt: new Date(),
      timeRange,
      summary: {
        totalQueries: queryMetrics.length,
        avgResponseTime: this.calculateAverageResponseTime(queryMetrics),
        slowQueries: slowQueries.length,
        improvementOpportunities: indexRecommendations.length + queryOptimizations.length,
        overallScore: this.calculatePerformanceScore(queryMetrics, indexRecommendations)
      },
      topSlowQueries: slowQueries,
      indexRecommendations,
      queryOptimizations,
      trendAnalysis,
      alerts
    };
  }

  /**
   * Suggest indexes based on query patterns
   */
  static async suggestIndexes(
    schema: DatabaseSchema,
    queries: string[]
  ): Promise<IndexRecommendation[]> {
    const recommendations: IndexRecommendation[] = [];
    const columnUsage = this.analyzeColumnUsage(queries, schema);
    
    // Analyze each table for indexing opportunities
    for (const table of schema.tables) {
      const tableUsage = columnUsage.get(table.name) || new Map();
      
      // Single column indexes
      for (const [column, usage] of tableUsage) {
        if (usage.whereCount > 5 || usage.joinCount > 3) {
          recommendations.push({
            id: `idx_${table.name}_${column}_${Date.now()}`,
            type: 'create',
            priority: usage.whereCount > 10 ? 'high' : 'medium',
            tableName: table.name,
            columns: [column],
            reason: `Frequently used in WHERE clauses (${usage.whereCount} times) and JOINs (${usage.joinCount} times)`,
            impact: `Estimated ${this.estimateIndexImpact(usage)}% improvement in query performance`,
            queries: usage.queries,
            estimatedImprovement: this.estimateIndexImpact(usage),
            storageImpact: this.estimateStorageImpact(table, [column]),
            maintenanceImpact: 'low',
            ddlStatement: `CREATE INDEX idx_${table.name}_${column} ON ${table.name} (${column});`
          });
        }
      }

      // Composite indexes for common column combinations
      const compositeOpportunities = this.findCompositeIndexOpportunities(tableUsage);
      for (const opportunity of compositeOpportunities) {
        recommendations.push({
          id: `idx_${table.name}_composite_${Date.now()}`,
          type: 'create',
          priority: 'medium',
          tableName: table.name,
          columns: opportunity.columns,
          reason: opportunity.reason,
          impact: `Estimated ${opportunity.improvement}% improvement for ${opportunity.queryCount} queries`,
          queries: opportunity.queries,
          estimatedImprovement: opportunity.improvement,
          storageImpact: this.estimateStorageImpact(table, opportunity.columns),
          maintenanceImpact: 'medium',
          ddlStatement: `CREATE INDEX idx_${table.name}_${opportunity.columns.join('_')} ON ${table.name} (${opportunity.columns.join(', ')});`
        });
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Detect query performance regressions
   */
  static detectRegressions(
    currentMetrics: QueryPerformanceMetrics[],
    historicalMetrics: QueryPerformanceMetrics[]
  ): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];
    
    for (const current of currentMetrics) {
      const historical = historicalMetrics.find(h => h.queryId === current.queryId);
      if (!historical) continue;

      const performanceChange = (current.avgExecutionTime - historical.avgExecutionTime) / historical.avgExecutionTime;
      
      if (performanceChange > 0.5) { // 50% slower
        alerts.push({
          id: `regression_${current.queryId}_${Date.now()}`,
          type: 'regression',
          severity: performanceChange > 2 ? 'critical' : 'warning',
          title: 'Query Performance Regression Detected',
          description: `Query execution time increased by ${Math.round(performanceChange * 100)}%`,
          query: current.query,
          metric: 'execution_time',
          threshold: historical.avgExecutionTime * 1.5,
          currentValue: current.avgExecutionTime,
          detectedAt: new Date(),
          acknowledged: false,
          actionRequired: 'Review query plan and check for schema changes or missing statistics'
        });
      }
    }

    return alerts;
  }

  /**
   * Optimize query by rewriting
   */
  static async optimizeQuery(query: string, schema: DatabaseSchema): Promise<{
    originalQuery: string;
    optimizedQuery: string;
    improvements: string[];
    estimatedImprovement: number;
  }> {
    const optimizations: string[] = [];
    let optimizedQuery = query;

    // Remove unnecessary DISTINCT
    if (query.includes('DISTINCT') && !this.needsDistinct(query)) {
      optimizedQuery = optimizedQuery.replace(/DISTINCT\s+/gi, '');
      optimizations.push('Removed unnecessary DISTINCT clause');
    }

    // Optimize EXISTS vs IN
    optimizedQuery = this.optimizeSubqueries(optimizedQuery);
    if (optimizedQuery !== query) {
      optimizations.push('Converted IN subquery to EXISTS for better performance');
    }

    // Suggest index hints
    const indexHints = this.suggestIndexHints(query, schema);
    if (indexHints.length > 0) {
      optimizations.push(`Consider adding indexes: ${indexHints.join(', ')}`);
    }

    // Optimize JOINs
    const joinOptimizations = this.optimizeJoins(optimizedQuery);
    optimizedQuery = joinOptimizations.query;
    optimizations.push(...joinOptimizations.improvements);

    return {
      originalQuery: query,
      optimizedQuery,
      improvements: optimizations,
      estimatedImprovement: this.estimateOptimizationImpact(optimizations)
    };
  }

  // Private helper methods

  private static hashQuery(query: string): string {
    // Simple hash function for query caching
    let hash = 0;
    const normalizedQuery = query.trim().toLowerCase().replace(/\s+/g, ' ');
    for (let i = 0; i < normalizedQuery.length; i++) {
      const char = normalizedQuery.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  private static parseQuery(query: string): {
    type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
    tables: string[];
    columns: string[];
    conditions: string[];
    joins: string[];
    orderBy: string[];
    groupBy: string[];
  } {
    const normalizedQuery = query.trim().toLowerCase();
    
    // Simple SQL parsing (would use a proper SQL parser in production)
    return {
      type: this.getQueryType(normalizedQuery),
      tables: this.extractTables(normalizedQuery),
      columns: this.extractColumns(normalizedQuery),
      conditions: this.extractConditions(normalizedQuery),
      joins: this.extractJoins(normalizedQuery),
      orderBy: this.extractOrderBy(normalizedQuery),
      groupBy: this.extractGroupBy(normalizedQuery)
    };
  }

  private static async generateExecutionPlan(
    parsedQuery: any,
    schema: DatabaseSchema
  ): Promise<QueryPlan> {
    // Simulate execution plan generation
    const steps: QueryPlanStep[] = [];
    let totalCost = 0;
    let totalRows = 0;

    // Generate plan steps based on query structure
    for (const table of parsedQuery.tables) {
      const tableInfo = schema.tables.find(t => t.name === table);
      if (!tableInfo) continue;

      const estimatedRows = 1000; // Would calculate based on table statistics
      const stepCost = this.calculateStepCost(parsedQuery, table, estimatedRows);
      
      steps.push({
        id: `step_${steps.length + 1}`,
        operation: 'scan',
        table,
        estimatedCost: stepCost,
        estimatedRows,
        children: [],
        level: 0
      });

      totalCost += stepCost;
      totalRows += estimatedRows;
    }

    // Add JOIN steps
    for (const join of parsedQuery.joins) {
      const joinCost = totalRows * 0.1; // Simplified cost calculation
      steps.push({
        id: `step_${steps.length + 1}`,
        operation: 'join',
        condition: join,
        estimatedCost: joinCost,
        estimatedRows: totalRows * 0.8,
        children: [],
        level: 1
      });
      totalCost += joinCost;
    }

    return {
      id: `plan_${Date.now()}`,
      query: parsedQuery.type,
      estimatedCost: totalCost,
      estimatedRows: totalRows,
      steps,
      indexes: [],
      warnings: [],
      recommendations: [],
      createdAt: new Date()
    };
  }

  private static async generateRecommendations(
    plan: QueryPlan,
    schema: DatabaseSchema,
    parsedQuery: any
  ): Promise<QueryRecommendation[]> {
    const recommendations: QueryRecommendation[] = [];

    // High-cost operations
    const expensiveSteps = plan.steps.filter(step => step.estimatedCost > 100);
    for (const step of expensiveSteps) {
      if (step.operation === 'scan' && step.table) {
        recommendations.push({
          id: `rec_index_${step.table}`,
          type: 'index',
          priority: 'high',
          title: `Add Index for Table Scan`,
          description: `Table '${step.table}' is being scanned entirely. Consider adding an index.`,
          impact: 'Significant performance improvement for filtering operations',
          effort: 'low',
          estimatedImprovement: 60,
          sqlExample: `CREATE INDEX idx_${step.table}_common ON ${step.table} (frequently_queried_column);`
        });
      }
    }

    // Missing WHERE clause
    if (parsedQuery.conditions.length === 0 && parsedQuery.type === 'SELECT') {
      recommendations.push({
        id: 'rec_where_clause',
        type: 'rewrite',
        priority: 'medium',
        title: 'Add WHERE Clause',
        description: 'Query without WHERE clause may return more data than needed',
        impact: 'Reduced data transfer and faster execution',
        effort: 'low',
        estimatedImprovement: 30
      });
    }

    // Inefficient JOINs
    if (parsedQuery.joins.length > 3) {
      recommendations.push({
        id: 'rec_join_optimization',
        type: 'rewrite',
        priority: 'medium',
        title: 'Optimize Multiple JOINs',
        description: 'Multiple JOINs may benefit from query restructuring',
        impact: 'Better join order and reduced intermediate results',
        effort: 'medium',
        estimatedImprovement: 25
      });
    }

    return recommendations;
  }

  private static generateWarnings(plan: QueryPlan, parsedQuery: any): string[] {
    const warnings: string[] = [];

    if (plan.estimatedCost > 1000) {
      warnings.push('High estimated execution cost - consider optimization');
    }

    if (plan.estimatedRows > 10000) {
      warnings.push('Large result set expected - consider adding LIMIT clause');
    }

    if (parsedQuery.type === 'SELECT' && parsedQuery.columns.includes('*')) {
      warnings.push('SELECT * may retrieve unnecessary columns');
    }

    return warnings;
  }

  private static getQueryMetrics(timeRange: { start: Date; end: Date }): QueryPerformanceMetrics[] {
    // Simulate query metrics retrieval
    const metrics: QueryPerformanceMetrics[] = [];
    
    // In a real implementation, this would query the performance monitoring system
    for (let i = 0; i < 10; i++) {
      metrics.push({
        queryId: `query_${i}`,
        query: `SELECT * FROM table_${i} WHERE id = ?`,
        avgExecutionTime: Math.random() * 2000 + 100,
        minExecutionTime: 50,
        maxExecutionTime: Math.random() * 5000 + 500,
        executionCount: Math.floor(Math.random() * 1000) + 10,
        totalCpuTime: Math.random() * 10000,
        totalIoTime: Math.random() * 5000,
        cacheHitRatio: Math.random() * 100,
        lastExecuted: new Date(),
        trend: Math.random() > 0.7 ? 'degrading' : Math.random() > 0.3 ? 'stable' : 'improving',
        alertLevel: Math.random() > 0.8 ? 'warning' : 'none'
      });
    }

    return metrics;
  }

  private static async generateIndexRecommendations(
    schema: DatabaseSchema,
    metrics: QueryPerformanceMetrics[]
  ): Promise<IndexRecommendation[]> {
    // Simulate index recommendations based on slow queries
    const recommendations: IndexRecommendation[] = [];
    
    const slowQueries = metrics.filter(m => m.avgExecutionTime > 1000);
    
    for (const table of schema.tables) {
      const relevantQueries = slowQueries.filter(q => q.query.includes(table.name));
      
      if (relevantQueries.length > 0) {
        recommendations.push({
          id: `idx_rec_${table.id}`,
          type: 'create',
          priority: relevantQueries.length > 2 ? 'high' : 'medium',
          tableName: table.name,
          columns: ['id'], // Simplified - would analyze actual query patterns
          reason: `${relevantQueries.length} slow queries detected on this table`,
          impact: `Expected 40-60% improvement in query performance`,
          queries: relevantQueries.map(q => q.query),
          estimatedImprovement: 50,
          storageImpact: 10,
          maintenanceImpact: 'low',
          ddlStatement: `CREATE INDEX idx_${table.name}_performance ON ${table.name} (id);`
        });
      }
    }

    return recommendations;
  }

  private static async generateQueryOptimizations(
    metrics: QueryPerformanceMetrics[]
  ): Promise<QueryRecommendation[]> {
    const optimizations: QueryRecommendation[] = [];
    
    const slowQueries = metrics.filter(m => m.avgExecutionTime > 2000);
    
    for (const query of slowQueries) {
      optimizations.push({
        id: `opt_${query.queryId}`,
        type: 'rewrite',
        priority: 'high',
        title: 'Query Rewrite Opportunity',
        description: `Query is consistently slow (avg: ${Math.round(query.avgExecutionTime)}ms)`,
        impact: 'Significant performance improvement expected',
        effort: 'medium',
        before: query.query,
        after: this.suggestQueryRewrite(query.query),
        estimatedImprovement: 40
      });
    }

    return optimizations;
  }

  private static analyzeTrends(
    metrics: QueryPerformanceMetrics[],
    timeRange: { start: Date; end: Date }
  ): TrendAnalysis {
    const degradingQueries = metrics.filter(m => m.trend === 'degrading');
    const improvingQueries = metrics.filter(m => m.trend === 'improving');
    
    return {
      performanceTrend: degradingQueries.length > improvingQueries.length ? 'degrading' : 'stable',
      queryCountTrend: 'stable', // Would calculate from historical data
      resourceUsageTrend: 'stable', // Would calculate from resource metrics
      regressionQueries: degradingQueries.map(q => q.query),
      improvedQueries: improvingQueries.map(q => q.query),
      newBottlenecks: metrics.filter(m => m.alertLevel === 'warning').map(m => m.query)
    };
  }

  private static generateAlerts(
    metrics: QueryPerformanceMetrics[],
    trends: TrendAnalysis
  ): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];
    
    // Slow query alerts
    const criticallySlowQueries = metrics.filter(m => m.avgExecutionTime > 5000);
    for (const query of criticallySlowQueries) {
      alerts.push({
        id: `alert_slow_${query.queryId}`,
        type: 'threshold',
        severity: 'critical',
        title: 'Critically Slow Query',
        description: `Query execution time exceeds 5 seconds`,
        query: query.query,
        metric: 'avg_execution_time',
        threshold: 5000,
        currentValue: query.avgExecutionTime,
        detectedAt: new Date(),
        acknowledged: false,
        actionRequired: 'Immediate optimization required'
      });
    }

    return alerts;
  }

  // Additional helper methods
  private static getQueryType(query: string): 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' {
    if (query.startsWith('select')) return 'SELECT';
    if (query.startsWith('insert')) return 'INSERT';
    if (query.startsWith('update')) return 'UPDATE';
    if (query.startsWith('delete')) return 'DELETE';
    return 'SELECT';
  }

  private static extractTables(query: string): string[] {
    // Simplified table extraction
    const fromMatch = query.match(/from\s+(\w+)/gi);
    const joinMatches = query.match(/join\s+(\w+)/gi);
    
    const tables = [];
    if (fromMatch) tables.push(...fromMatch.map(m => m.split(' ')[1]));
    if (joinMatches) tables.push(...joinMatches.map(m => m.split(' ')[1]));
    
    return [...new Set(tables)];
  }

  private static extractColumns(query: string): string[] {
    // Simplified column extraction
    const selectMatch = query.match(/select\s+(.*?)\s+from/i);
    if (!selectMatch) return [];
    
    return selectMatch[1].split(',').map(col => col.trim()).filter(col => col !== '*');
  }

  private static extractConditions(query: string): string[] {
    const whereMatch = query.match(/where\s+(.*?)(?:\s+group by|\s+order by|\s+limit|$)/i);
    return whereMatch ? [whereMatch[1].trim()] : [];
  }

  private static extractJoins(query: string): string[] {
    const joinMatches = query.match(/\w+\s+join\s+\w+\s+on\s+[^;]*/gi);
    return joinMatches || [];
  }

  private static extractOrderBy(query: string): string[] {
    const orderMatch = query.match(/order by\s+(.*?)(?:\s+limit|$)/i);
    return orderMatch ? orderMatch[1].split(',').map(col => col.trim()) : [];
  }

  private static extractGroupBy(query: string): string[] {
    const groupMatch = query.match(/group by\s+(.*?)(?:\s+order by|\s+limit|$)/i);
    return groupMatch ? groupMatch[1].split(',').map(col => col.trim()) : [];
  }

  private static calculateStepCost(parsedQuery: any, table: string, rows: number): number {
    // Simplified cost calculation
    let cost = rows * 0.1; // Base scan cost
    
    if (parsedQuery.conditions.length === 0) {
      cost *= 2; // Full table scan penalty
    }
    
    return cost;
  }

  private static analyzeColumnUsage(queries: string[], schema: DatabaseSchema) {
    const usage = new Map<string, Map<string, {
      whereCount: number;
      joinCount: number;
      orderCount: number;
      queries: string[];
    }>>();

    // Analyze each query for column usage patterns
    for (const query of queries) {
      const normalizedQuery = query.toLowerCase();
      
      for (const table of schema.tables) {
        if (!normalizedQuery.includes(table.name.toLowerCase())) continue;
        
        if (!usage.has(table.name)) {
          usage.set(table.name, new Map());
        }
        
        const tableUsage = usage.get(table.name)!;
        
        for (const column of table.columns) {
          if (!normalizedQuery.includes(column.name.toLowerCase())) continue;
          
          if (!tableUsage.has(column.name)) {
            tableUsage.set(column.name, {
              whereCount: 0,
              joinCount: 0,
              orderCount: 0,
              queries: []
            });
          }
          
          const columnUsage = tableUsage.get(column.name)!;
          columnUsage.queries.push(query);
          
          if (normalizedQuery.includes(`where`) && normalizedQuery.includes(column.name.toLowerCase())) {
            columnUsage.whereCount++;
          }
          
          if (normalizedQuery.includes(`join`) && normalizedQuery.includes(column.name.toLowerCase())) {
            columnUsage.joinCount++;
          }
          
          if (normalizedQuery.includes(`order by`) && normalizedQuery.includes(column.name.toLowerCase())) {
            columnUsage.orderCount++;
          }
        }
      }
    }

    return usage;
  }

  private static estimateIndexImpact(usage: any): number {
    // Estimate performance improvement from adding an index
    let impact = 20; // Base improvement
    
    if (usage.whereCount > 10) impact += 30;
    if (usage.joinCount > 5) impact += 20;
    if (usage.orderCount > 3) impact += 15;
    
    return Math.min(80, impact); // Cap at 80% improvement
  }

  private static estimateStorageImpact(table: Table, columns: string[]): number {
    // Simplified storage impact calculation (MB)
    const avgRowSize = table.columns.length * 50; // Assume 50 bytes per column
    const estimatedRows = 10000; // Would get from table statistics
    const indexSize = columns.length * avgRowSize * estimatedRows / (1024 * 1024);
    
    return Math.round(indexSize);
  }

  private static findCompositeIndexOpportunities(tableUsage: Map<string, any>) {
    const opportunities = [];
    const columns = Array.from(tableUsage.keys());
    
    // Look for column pairs that are frequently used together
    for (let i = 0; i < columns.length - 1; i++) {
      for (let j = i + 1; j < columns.length; j++) {
        const col1Usage = tableUsage.get(columns[i])!;
        const col2Usage = tableUsage.get(columns[j])!;
        
        // Find common queries
        const commonQueries = col1Usage.queries.filter((q: string) => 
          col2Usage.queries.includes(q)
        );
        
        if (commonQueries.length > 3) {
          opportunities.push({
            columns: [columns[i], columns[j]],
            queryCount: commonQueries.length,
            queries: commonQueries,
            improvement: 35,
            reason: `Columns frequently used together in ${commonQueries.length} queries`
          });
        }
      }
    }
    
    return opportunities;
  }

  private static calculateAverageResponseTime(metrics: QueryPerformanceMetrics[]): number {
    if (metrics.length === 0) return 0;
    return metrics.reduce((sum, m) => sum + m.avgExecutionTime, 0) / metrics.length;
  }

  private static calculatePerformanceScore(
    metrics: QueryPerformanceMetrics[],
    recommendations: IndexRecommendation[]
  ): number {
    let score = 100;
    
    const slowQueries = metrics.filter(m => m.avgExecutionTime > 1000).length;
    const totalQueries = metrics.length;
    
    if (totalQueries > 0) {
      score -= (slowQueries / totalQueries) * 50;
    }
    
    score -= Math.min(30, recommendations.length * 3);
    
    return Math.max(0, Math.round(score));
  }

  private static needsDistinct(query: string): boolean {
    // Simple heuristic - in production would do proper analysis
    return query.toLowerCase().includes('join') && query.toLowerCase().includes('group by');
  }

  private static optimizeSubqueries(query: string): string {
    // Convert IN subqueries to EXISTS for better performance
    return query.replace(
      /WHERE\s+(\w+)\s+IN\s*\(\s*SELECT/gi,
      'WHERE EXISTS (SELECT 1 FROM'
    );
  }

  private static suggestIndexHints(query: string, schema: DatabaseSchema): string[] {
    const hints = [];
    const tables = this.extractTables(query.toLowerCase());
    
    for (const tableName of tables) {
      const table = schema.tables.find(t => t.name.toLowerCase() === tableName);
      if (table) {
        hints.push(`${tableName}(id)`); // Suggest primary key index
      }
    }
    
    return hints;
  }

  private static optimizeJoins(query: string): { query: string; improvements: string[] } {
    const improvements = [];
    let optimizedQuery = query;
    
    // Suggest using INNER JOIN instead of WHERE clauses for relationships
    if (query.toLowerCase().includes('where') && query.includes('=')) {
      improvements.push('Consider using explicit JOIN syntax instead of WHERE clause joins');
    }
    
    return { query: optimizedQuery, improvements };
  }

  private static estimateOptimizationImpact(optimizations: string[]): number {
    return optimizations.length * 15; // 15% improvement per optimization
  }

  private static suggestQueryRewrite(query: string): string {
    // Simple query rewrite suggestions
    let rewritten = query;
    
    // Add LIMIT if not present
    if (!query.toLowerCase().includes('limit')) {
      rewritten += ' LIMIT 1000';
    }
    
    // Replace SELECT * with specific columns
    if (query.includes('SELECT *')) {
      rewritten = rewritten.replace('SELECT *', 'SELECT id, name, created_at');
    }
    
    return rewritten;
  }
}
