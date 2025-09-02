// Query Optimization Manager for QueryFlow
// This module provides advanced query analysis, optimization, and performance monitoring

import { QueryResult, ExecutionPlan, PerformanceMetrics, QueryMetadata } from '@/types/database';

export interface QueryOptimization {
  id: string;
  originalQuery: string;
  optimizedQuery: string;
  improvements: OptimizationImprovement[];
  performanceGain: number;
  confidence: number;
  createdAt: Date;
}

export interface OptimizationImprovement {
  type: 'index_suggestion' | 'join_optimization' | 'subquery_rewrite' | 'predicate_pushdown' | 'aggregation_optimization';
  description: string;
  impact: 'low' | 'medium' | 'high';
  estimatedImprovement: number;
  sqlSuggestion?: string;
}

export interface QueryProfile {
  id: string;
  query: string;
  executionCount: number;
  averageExecutionTime: number;
  totalExecutionTime: number;
  slowestExecution: number;
  fastestExecution: number;
  lastExecuted: Date;
  performanceTrend: 'improving' | 'stable' | 'degrading';
  optimizationSuggestions: OptimizationImprovement[];
}

export interface IndexSuggestion {
  table: string;
  columns: string[];
  type: 'btree' | 'hash' | 'gin' | 'gist';
  reason: string;
  estimatedBenefit: number;
  sql: string;
}

export class QueryOptimizationManager {
  private static readonly PROFILES_KEY = 'queryflow_query_profiles';
  private static readonly OPTIMIZATIONS_KEY = 'queryflow_query_optimizations';
  private static readonly INDEX_SUGGESTIONS_KEY = 'queryflow_index_suggestions';

  /**
   * Analyze query performance and provide optimization suggestions
   */
  static analyzeQuery(query: string, result: QueryResult): QueryOptimization {
    const improvements: OptimizationImprovement[] = [];
    
    // Analyze execution plan
    if (result.executionPlan) {
      improvements.push(...this.analyzeExecutionPlan(result.executionPlan));
    }

    // Analyze query structure
    improvements.push(...this.analyzeQueryStructure(query));

    // Analyze performance metrics
    if (result.performanceMetrics) {
      improvements.push(...this.analyzePerformanceMetrics(result.performanceMetrics));
    }

    // Calculate performance gain
    const performanceGain = this.calculatePerformanceGain(improvements);
    
    // Generate optimized query
    const optimizedQuery = this.generateOptimizedQuery(query, improvements);

    const optimization: QueryOptimization = {
      id: `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      originalQuery: query,
      optimizedQuery,
      improvements,
      performanceGain,
      confidence: this.calculateConfidence(improvements),
      createdAt: new Date()
    };

    // Save optimization
    this.saveOptimization(optimization);
    
    return optimization;
  }

  /**
   * Profile query performance over time
   */
  static profileQuery(query: string, executionTime: number): QueryProfile {
    const profiles = this.getQueryProfiles();
    const queryHash = this.generateQueryHash(query);
    
    let profile = profiles.find(p => p.query === query);
    
    if (!profile) {
      profile = {
        id: `profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        query,
        executionCount: 0,
        averageExecutionTime: 0,
        totalExecutionTime: 0,
        slowestExecution: 0,
        fastestExecution: Infinity,
        lastExecuted: new Date(),
        performanceTrend: 'stable',
        optimizationSuggestions: []
      };
      profiles.push(profile);
    }

    // Update profile statistics
    profile.executionCount++;
    profile.totalExecutionTime += executionTime;
    profile.averageExecutionTime = profile.totalExecutionTime / profile.executionCount;
    profile.slowestExecution = Math.max(profile.slowestExecution, executionTime);
    profile.fastestExecution = Math.min(profile.fastestExecution, executionTime);
    profile.lastExecuted = new Date();
    
    // Analyze performance trend
    profile.performanceTrend = this.analyzePerformanceTrend(profile);
    
    // Generate optimization suggestions
    profile.optimizationSuggestions = this.generateOptimizationSuggestions(query, profile);

    // Save updated profile
    localStorage.setItem(this.PROFILES_KEY, JSON.stringify(profiles));
    
    return profile;
  }

  /**
   * Generate index suggestions based on query patterns
   */
  static generateIndexSuggestions(queries: string[]): IndexSuggestion[] {
    const suggestions: IndexSuggestion[] = [];
    const tableUsage = this.analyzeTableUsage(queries);
    
    for (const [table, usage] of Object.entries(tableUsage)) {
      // Analyze WHERE clauses
      const whereColumns = this.extractWhereColumns(queries, table);
      if (whereColumns.length > 0) {
        suggestions.push({
          table,
          columns: whereColumns,
          type: 'btree',
          reason: 'Frequent WHERE clause usage',
          estimatedBenefit: this.estimateIndexBenefit(whereColumns, usage),
          sql: `CREATE INDEX idx_${table}_${whereColumns.join('_')} ON ${table} (${whereColumns.join(', ')});`
        });
      }

      // Analyze JOIN conditions
      const joinColumns = this.extractJoinColumns(queries, table);
      if (joinColumns.length > 0) {
        suggestions.push({
          table,
          columns: joinColumns,
          type: 'btree',
          reason: 'Frequent JOIN usage',
          estimatedBenefit: this.estimateIndexBenefit(joinColumns, usage),
          sql: `CREATE INDEX idx_${table}_join_${joinColumns.join('_')} ON ${table} (${joinColumns.join(', ')});`
        });
      }

      // Analyze ORDER BY clauses
      const orderColumns = this.extractOrderColumns(queries, table);
      if (orderColumns.length > 0) {
        suggestions.push({
          table,
          columns: orderColumns,
          type: 'btree',
          reason: 'Frequent ORDER BY usage',
          estimatedBenefit: this.estimateIndexBenefit(orderColumns, usage),
          sql: `CREATE INDEX idx_${table}_order_${orderColumns.join('_')} ON ${table} (${orderColumns.join(', ')});`
        });
      }
    }

    // Save suggestions
    localStorage.setItem(this.INDEX_SUGGESTIONS_KEY, JSON.stringify(suggestions));
    
    return suggestions.sort((a, b) => b.estimatedBenefit - a.estimatedBenefit);
  }

  /**
   * Get slow queries
   */
  static getSlowQueries(threshold: number = 1000): QueryProfile[] {
    const profiles = this.getQueryProfiles();
    return profiles
      .filter(p => p.averageExecutionTime > threshold)
      .sort((a, b) => b.averageExecutionTime - a.averageExecutionTime);
  }



  /**
   * Get query performance trends
   */
  static getPerformanceTrends(): { query: string; trend: string; change: number }[] {
    const profiles = this.getQueryProfiles();
    return profiles.map(profile => ({
      query: profile.query.substring(0, 100) + (profile.query.length > 100 ? '...' : ''),
      trend: profile.performanceTrend,
      change: this.calculatePerformanceChange(profile)
    }));
  }

  /**
   * Get optimization history
   */
  static getOptimizationHistory(): QueryOptimization[] {
    return this.getOptimizations();
  }

  // Private helper methods
  private static analyzeExecutionPlan(plan: ExecutionPlan): OptimizationImprovement[] {
    const improvements: OptimizationImprovement[] = [];
    
    // Check for full table scans
    const fullScans = plan.steps.filter(step => 
      step.operation.toLowerCase().includes('scan') && 
      !step.operation.toLowerCase().includes('index')
    );
    
    if (fullScans.length > 0) {
      improvements.push({
        type: 'index_suggestion',
        description: 'Full table scan detected - consider adding indexes',
        impact: 'high',
        estimatedImprovement: 50,
        sqlSuggestion: 'CREATE INDEX ON table_name (column_name);'
      });
    }

    // Check for expensive operations
    const expensiveOps = plan.steps.filter(step => step.cost > 1000);
    if (expensiveOps.length > 0) {
      improvements.push({
        type: 'join_optimization',
        description: 'Expensive join operations detected',
        impact: 'medium',
        estimatedImprovement: 30
      });
    }

    return improvements;
  }

  private static analyzeQueryStructure(query: string): OptimizationImprovement[] {
    const improvements: OptimizationImprovement[] = [];
    const lowerQuery = query.toLowerCase();
    
    // Check for SELECT *
    if (lowerQuery.includes('select *')) {
      improvements.push({
        type: 'subquery_rewrite',
        description: 'Avoid SELECT * - specify only needed columns',
        impact: 'medium',
        estimatedImprovement: 20
      });
    }

    // Check for subqueries that could be JOINs
    if (lowerQuery.includes('where') && lowerQuery.includes('(select')) {
      improvements.push({
        type: 'subquery_rewrite',
        description: 'Consider rewriting subquery as JOIN',
        impact: 'high',
        estimatedImprovement: 40
      });
    }

    // Check for missing WHERE clause on large tables
    if (!lowerQuery.includes('where') && lowerQuery.includes('from')) {
      improvements.push({
        type: 'predicate_pushdown',
        description: 'Consider adding WHERE clause to limit results',
        impact: 'medium',
        estimatedImprovement: 25
      });
    }

    return improvements;
  }

  private static analyzePerformanceMetrics(metrics: PerformanceMetrics): OptimizationImprovement[] {
    const improvements: OptimizationImprovement[] = [];
    
    // Check memory usage
    if (metrics.memoryUsage > 1000000) { // 1MB threshold
      improvements.push({
        type: 'aggregation_optimization',
        description: 'High memory usage detected - consider optimizing aggregations',
        impact: 'medium',
        estimatedImprovement: 15
      });
    }

    // Check disk reads
    if (metrics.diskReads > 1000) {
      improvements.push({
        type: 'index_suggestion',
        description: 'High disk I/O detected - indexes may help',
        impact: 'high',
        estimatedImprovement: 35
      });
    }

    return improvements;
  }

  private static generateOptimizedQuery(originalQuery: string, improvements: OptimizationImprovement[]): string {
    let optimizedQuery = originalQuery;
    
    // Apply basic optimizations
    improvements.forEach(improvement => {
      if (improvement.sqlSuggestion) {
        // This is a simplified implementation
        // In production, you'd have more sophisticated query rewriting
        optimizedQuery = this.applyOptimization(optimizedQuery, improvement);
      }
    });

    return optimizedQuery;
  }

  private static applyOptimization(query: string, improvement: OptimizationImprovement): string {
    // Simplified optimization application
    // In production, this would be much more sophisticated
    return query;
  }

  private static calculatePerformanceGain(improvements: OptimizationImprovement[]): number {
    return improvements.reduce((total, improvement) => total + improvement.estimatedImprovement, 0);
  }

  private static calculateConfidence(improvements: OptimizationImprovement[]): number {
    // Calculate confidence based on improvement types and impact
    const highImpactCount = improvements.filter(i => i.impact === 'high').length;
    const mediumImpactCount = improvements.filter(i => i.impact === 'medium').length;
    
    return Math.min(100, (highImpactCount * 30) + (mediumImpactCount * 20) + 10);
  }

  private static analyzePerformanceTrend(profile: QueryProfile): 'improving' | 'stable' | 'degrading' {
    // Simplified trend analysis
    // In production, you'd analyze historical data
    if (profile.executionCount < 5) return 'stable';
    
    // Mock trend analysis
    const random = Math.random();
    if (random < 0.3) return 'improving';
    if (random < 0.7) return 'stable';
    return 'degrading';
  }

  private static generateOptimizationSuggestions(query: string, profile: QueryProfile): OptimizationImprovement[] {
    // Generate suggestions based on query profile
    const suggestions: OptimizationImprovement[] = [];
    
    if (profile.averageExecutionTime > 1000) {
      suggestions.push({
        type: 'index_suggestion',
        description: 'Query is slow - consider adding indexes',
        impact: 'high',
        estimatedImprovement: 40
      });
    }

    return suggestions;
  }

  private static analyzeTableUsage(queries: string[]): Record<string, number> {
    const usage: Record<string, number> = {};
    
    queries.forEach(query => {
      const tables = this.extractTableNames(query);
      tables.forEach(table => {
        usage[table] = (usage[table] || 0) + 1;
      });
    });

    return usage;
  }

  private static extractTableNames(query: string): string[] {
    const fromMatch = query.match(/from\s+(\w+)/gi);
    const joinMatch = query.match(/join\s+(\w+)/gi);
    
    const tables: string[] = [];
    if (fromMatch) tables.push(...fromMatch.map(m => m.replace(/from\s+/i, '')));
    if (joinMatch) tables.push(...joinMatch.map(m => m.replace(/join\s+/i, '')));
    
    return tables;
  }

  private static extractWhereColumns(queries: string[], table: string): string[] {
    // Simplified column extraction
    // In production, you'd use a proper SQL parser
    const columns: string[] = [];
    
    queries.forEach(query => {
      const whereMatch = query.match(new RegExp(`where\\s+${table}\\.(\\w+)`, 'gi'));
      if (whereMatch) {
        whereMatch.forEach(match => {
          const column = match.replace(new RegExp(`where\\s+${table}\\.`, 'i'), '');
          if (!columns.includes(column)) {
            columns.push(column);
          }
        });
      }
    });

    return columns;
  }

  private static extractJoinColumns(queries: string[], table: string): string[] {
    // Simplified join column extraction
    const columns: string[] = [];
    
    queries.forEach(query => {
      const joinMatch = query.match(new RegExp(`join\\s+${table}\\s+on\\s+${table}\\.(\\w+)`, 'gi'));
      if (joinMatch) {
        joinMatch.forEach(match => {
          const column = match.replace(new RegExp(`join\\s+${table}\\s+on\\s+${table}\\.`, 'i'), '');
          if (!columns.includes(column)) {
            columns.push(column);
          }
        });
      }
    });

    return columns;
  }

  private static extractOrderColumns(queries: string[], table: string): string[] {
    // Simplified ORDER BY column extraction
    const columns: string[] = [];
    
    queries.forEach(query => {
      const orderMatch = query.match(new RegExp(`order\\s+by\\s+${table}\\.(\\w+)`, 'gi'));
      if (orderMatch) {
        orderMatch.forEach(match => {
          const column = match.replace(new RegExp(`order\\s+by\\s+${table}\\.`, 'i'), '');
          if (!columns.includes(column)) {
            columns.push(column);
          }
        });
      }
    });

    return columns;
  }

  private static estimateIndexBenefit(columns: string[], usage: number): number {
    // Simplified benefit estimation
    return Math.min(100, columns.length * usage * 10);
  }

  private static calculatePerformanceChange(profile: QueryProfile): number {
    // Simplified performance change calculation
    return Math.random() * 20 - 10; // -10% to +10% change
  }

  private static generateQueryHash(query: string): string {
    // Simple hash generation
    return btoa(query).substr(0, 16);
  }

  static getQueryProfiles(): QueryProfile[] {
    try {
      const stored = localStorage.getItem(this.PROFILES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private static getOptimizations(): QueryOptimization[] {
    try {
      const stored = localStorage.getItem(this.OPTIMIZATIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private static saveOptimization(optimization: QueryOptimization): void {
    const optimizations = this.getOptimizations();
    optimizations.push(optimization);
    localStorage.setItem(this.OPTIMIZATIONS_KEY, JSON.stringify(optimizations));
  }
}
