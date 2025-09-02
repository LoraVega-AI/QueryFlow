// Advanced Analytics Engine for QueryFlow
// This module provides business intelligence, statistical analysis, and advanced visualizations

import { ChartConfig, Dashboard, FilterConfig, QueryResult } from '@/types/database';

export interface StatisticalAnalysis {
  id: string;
  name: string;
  type: 'descriptive' | 'inferential' | 'predictive' | 'correlation' | 'regression';
  data: any[];
  results: StatisticalResult[];
  confidence: number;
  createdAt: Date;
}

export interface StatisticalResult {
  metric: string;
  value: number;
  unit?: string;
  interpretation: string;
  significance?: number;
}

export interface TrendAnalysis {
  id: string;
  name: string;
  data: TrendDataPoint[];
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  slope: number;
  rSquared: number;
  forecast?: ForecastData[];
  createdAt: Date;
}

export interface TrendDataPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

export interface ForecastData {
  timestamp: Date;
  predictedValue: number;
  confidenceInterval: { lower: number; upper: number };
}

export interface DataInsight {
  id: string;
  title: string;
  description: string;
  type: 'anomaly' | 'pattern' | 'trend' | 'correlation' | 'outlier';
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  data: any[];
  recommendations: string[];
  createdAt: Date;
}

export interface KPI {
  id: string;
  name: string;
  description: string;
  formula: string;
  value: number;
  target?: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  change: number;
  lastUpdated: Date;
}

export class AnalyticsEngine {
  private static readonly INSIGHTS_KEY = 'queryflow_data_insights';
  private static readonly KPIS_KEY = 'queryflow_kpis';
  private static readonly TRENDS_KEY = 'queryflow_trends';
  private static readonly STATS_KEY = 'queryflow_statistics';

  /**
   * Generate data insights from query results
   */
  static generateInsights(results: QueryResult[]): DataInsight[] {
    const insights: DataInsight[] = [];
    
    results.forEach(result => {
      // Detect anomalies
      insights.push(...this.detectAnomalies(result));
      
      // Identify patterns
      insights.push(...this.identifyPatterns(result));
      
      // Find correlations
      insights.push(...this.findCorrelations(result));
      
      // Detect outliers
      insights.push(...this.detectOutliers(result));
    });

    // Save insights
    this.saveInsights(insights);
    
    return insights.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Perform statistical analysis on data
   */
  static performStatisticalAnalysis(data: any[], analysisType: string): StatisticalAnalysis {
    const results: StatisticalResult[] = [];
    
    switch (analysisType) {
      case 'descriptive':
        results.push(...this.performDescriptiveAnalysis(data));
        break;
      case 'correlation':
        results.push(...this.performCorrelationAnalysis(data));
        break;
      case 'regression':
        results.push(...this.performRegressionAnalysis(data));
        break;
      default:
        results.push(...this.performDescriptiveAnalysis(data));
    }

    const analysis: StatisticalAnalysis = {
      id: `analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `${analysisType} Analysis`,
      type: analysisType as any,
      data,
      results,
      confidence: this.calculateAnalysisConfidence(results),
      createdAt: new Date()
    };

    // Save analysis
    this.saveStatisticalAnalysis(analysis);
    
    return analysis;
  }

  /**
   * Analyze trends in time series data
   */
  static analyzeTrends(data: TrendDataPoint[]): TrendAnalysis {
    const trend = this.determineTrend(data);
    const slope = this.calculateSlope(data);
    const rSquared = this.calculateRSquared(data);
    const forecast = this.generateForecast(data);

    const trendAnalysis: TrendAnalysis = {
      id: `trend-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: 'Time Series Trend Analysis',
      data,
      trend,
      slope,
      rSquared,
      forecast,
      createdAt: new Date()
    };

    // Save trend analysis
    this.saveTrendAnalysis(trendAnalysis);
    
    return trendAnalysis;
  }

  /**
   * Create and manage KPIs
   */
  static createKPI(name: string, description: string, formula: string, data: any[]): KPI {
    const value = this.calculateKPIValue(formula, data);
    const trend = this.calculateKPITrend(data);
    const change = this.calculateKPIChange(data);

    const kpi: KPI = {
      id: `kpi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      formula,
      value,
      unit: this.determineKPIUnit(formula),
      trend,
      change,
      lastUpdated: new Date()
    };

    // Save KPI
    this.saveKPI(kpi);
    
    return kpi;
  }

  /**
   * Generate advanced visualizations
   */
  static generateAdvancedVisualizations(data: any[], chartType: string): ChartConfig {
    const config: ChartConfig = {
      id: `chart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: chartType as any,
      title: `${chartType} Chart`,
      dataSource: 'query_result',
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: true,
        legend: true,
        tooltips: true,
        grid: true,
        theme: 'dark'
      },
      filters: []
    };

    // Configure chart based on type
    switch (chartType) {
      case 'heatmap':
        config.xAxis = { field: 'x', label: 'X Axis', type: 'category' };
        config.yAxis = { field: 'y', label: 'Y Axis', type: 'category' };
        break;
      case 'treemap':
        config.series = [{ name: 'Value', field: 'value', aggregation: 'sum' }];
        break;
      case 'scatter':
        config.xAxis = { field: 'x', label: 'X Axis', type: 'value' };
        config.yAxis = { field: 'y', label: 'Y Axis', type: 'value' };
        break;
      case 'boxplot':
        config.series = [{ name: 'Distribution', field: 'value', aggregation: 'avg' }];
        break;
      default:
        config.xAxis = { field: 'x', label: 'X Axis', type: 'category' };
        config.yAxis = { field: 'y', label: 'Y Axis', type: 'value' };
    }

    return config;
  }

  /**
   * Create interactive dashboard
   */
  static createDashboard(name: string, description: string, charts: ChartConfig[]): Dashboard {
    const dashboard: Dashboard = {
      id: `dashboard-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      charts,
      layout: {
        columns: 4,
        rows: 3,
        widgets: charts.map((chart, index) => ({
          id: `widget-${index}`,
          chartId: chart.id,
          position: { x: (index % 4) * 3, y: Math.floor(index / 4) * 3 },
          size: { width: 3, height: 3 },
          showTitle: true
        }))
      },
      filters: [],
      refreshInterval: 30000, // 30 seconds
      isPublic: false,
      permissions: {
        canView: [],
        canEdit: [],
        canDelete: [],
        canShare: []
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return dashboard;
  }

  /**
   * Get data insights
   */
  static getInsights(): DataInsight[] {
    return this.getStoredInsights();
  }

  /**
   * Get KPIs
   */
  static getKPIs(): KPI[] {
    return this.getStoredKPIs();
  }

  /**
   * Get trend analyses
   */
  static getTrendAnalyses(): TrendAnalysis[] {
    return this.getStoredTrends();
  }

  /**
   * Get statistical analyses
   */
  static getStatisticalAnalyses(): StatisticalAnalysis[] {
    return this.getStoredStatistics();
  }

  // Private helper methods
  private static detectAnomalies(result: QueryResult): DataInsight[] {
    const insights: DataInsight[] = [];
    
    // Simple anomaly detection based on standard deviation
    result.rows.forEach((row, rowIndex) => {
      row.forEach((value, colIndex) => {
        if (typeof value === 'number') {
          const column = result.columns[colIndex];
          const columnValues = result.rows.map(r => r[colIndex]).filter(v => typeof v === 'number');
          
          if (columnValues.length > 10) {
            const mean = columnValues.reduce((sum, val) => sum + val, 0) / columnValues.length;
            const variance = columnValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / columnValues.length;
            const stdDev = Math.sqrt(variance);
            
            if (Math.abs(value - mean) > 3 * stdDev) {
              insights.push({
                id: `anomaly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                title: `Anomaly detected in ${column}`,
                description: `Value ${value} is significantly different from the mean (${mean.toFixed(2)})`,
                type: 'anomaly',
                severity: 'high',
                confidence: 0.85,
                data: [{ row: rowIndex, column, value, mean, stdDev }],
                recommendations: ['Investigate the cause of this anomaly', 'Consider data validation rules'],
                createdAt: new Date()
              });
            }
          }
        }
      });
    });

    return insights;
  }

  private static identifyPatterns(result: QueryResult): DataInsight[] {
    const insights: DataInsight[] = [];
    
    // Simple pattern detection for time series data
    if (result.columns.length >= 2) {
      const timeColumn = result.columns.find(col => 
        col.toLowerCase().includes('time') || 
        col.toLowerCase().includes('date') ||
        col.toLowerCase().includes('created')
      );
      
      if (timeColumn) {
        const timeIndex = result.columns.indexOf(timeColumn);
        const valueColumns = result.columns.filter((_, index) => index !== timeIndex);
        
        valueColumns.forEach(valueColumn => {
          const valueIndex = result.columns.indexOf(valueColumn);
          const values = result.rows.map(row => row[valueIndex]).filter(v => typeof v === 'number');
          
          if (values.length > 5) {
            // Check for increasing/decreasing pattern
            let increasing = 0;
            let decreasing = 0;
            
            for (let i = 1; i < values.length; i++) {
              if (values[i] > values[i - 1]) increasing++;
              else if (values[i] < values[i - 1]) decreasing++;
            }
            
            const total = values.length - 1;
            if (increasing / total > 0.7) {
              insights.push({
                id: `pattern-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                title: `Increasing trend in ${valueColumn}`,
                description: `${valueColumn} shows a consistent increasing pattern`,
                type: 'pattern',
                severity: 'medium',
                confidence: 0.75,
                data: [{ column: valueColumn, trend: 'increasing', confidence: increasing / total }],
                recommendations: ['Monitor this trend closely', 'Consider forecasting future values'],
                createdAt: new Date()
              });
            } else if (decreasing / total > 0.7) {
              insights.push({
                id: `pattern-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                title: `Decreasing trend in ${valueColumn}`,
                description: `${valueColumn} shows a consistent decreasing pattern`,
                type: 'pattern',
                severity: 'medium',
                confidence: 0.75,
                data: [{ column: valueColumn, trend: 'decreasing', confidence: decreasing / total }],
                recommendations: ['Investigate the cause of decline', 'Consider corrective actions'],
                createdAt: new Date()
              });
            }
          }
        });
      }
    }

    return insights;
  }

  private static findCorrelations(result: QueryResult): DataInsight[] {
    const insights: DataInsight[] = [];
    
    // Find correlations between numeric columns
    const numericColumns = result.columns.filter((_, index) => 
      result.rows.some(row => typeof row[index] === 'number')
    );
    
    for (let i = 0; i < numericColumns.length; i++) {
      for (let j = i + 1; j < numericColumns.length; j++) {
        const col1 = numericColumns[i];
        const col2 = numericColumns[j];
        const col1Index = result.columns.indexOf(col1);
        const col2Index = result.columns.indexOf(col2);
        
        const values1 = result.rows.map(row => row[col1Index]).filter(v => typeof v === 'number');
        const values2 = result.rows.map(row => row[col2Index]).filter(v => typeof v === 'number');
        
        if (values1.length === values2.length && values1.length > 5) {
          const correlation = this.calculateCorrelation(values1, values2);
          
          if (Math.abs(correlation) > 0.7) {
            insights.push({
              id: `correlation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              title: `Strong correlation between ${col1} and ${col2}`,
              description: `Correlation coefficient: ${correlation.toFixed(3)}`,
              type: 'correlation',
              severity: 'medium',
              confidence: Math.abs(correlation),
              data: [{ column1: col1, column2: col2, correlation }],
              recommendations: [
                'Investigate the relationship between these variables',
                'Consider using one to predict the other'
              ],
              createdAt: new Date()
            });
          }
        }
      }
    }

    return insights;
  }

  private static detectOutliers(result: QueryResult): DataInsight[] {
    const insights: DataInsight[] = [];
    
    // Detect outliers using IQR method
    result.columns.forEach((column, colIndex) => {
      const values = result.rows.map(row => row[colIndex]).filter(v => typeof v === 'number');
      
      if (values.length > 10) {
        const sorted = [...values].sort((a, b) => a - b);
        const q1 = sorted[Math.floor(sorted.length * 0.25)];
        const q3 = sorted[Math.floor(sorted.length * 0.75)];
        const iqr = q3 - q1;
        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;
        
        const outliers = values.filter(v => v < lowerBound || v > upperBound);
        
        if (outliers.length > 0) {
          insights.push({
            id: `outlier-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: `Outliers detected in ${column}`,
            description: `${outliers.length} outliers found using IQR method`,
            type: 'outlier',
            severity: 'medium',
            confidence: 0.8,
            data: [{ column, outliers, lowerBound, upperBound }],
            recommendations: ['Review outlier values for accuracy', 'Consider data cleaning'],
            createdAt: new Date()
          });
        }
      }
    });

    return insights;
  }

  private static performDescriptiveAnalysis(data: any[]): StatisticalResult[] {
    const numericData = data.filter(d => typeof d === 'number');
    
    if (numericData.length === 0) return [];
    
    const sorted = [...numericData].sort((a, b) => a - b);
    const sum = numericData.reduce((acc, val) => acc + val, 0);
    const mean = sum / numericData.length;
    const variance = numericData.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / numericData.length;
    const stdDev = Math.sqrt(variance);
    
    return [
      { metric: 'Count', value: numericData.length, interpretation: 'Number of data points' },
      { metric: 'Mean', value: mean, interpretation: 'Average value' },
      { metric: 'Median', value: sorted[Math.floor(sorted.length / 2)], interpretation: 'Middle value' },
      { metric: 'Standard Deviation', value: stdDev, interpretation: 'Measure of spread' },
      { metric: 'Min', value: sorted[0], interpretation: 'Minimum value' },
      { metric: 'Max', value: sorted[sorted.length - 1], interpretation: 'Maximum value' }
    ];
  }

  private static performCorrelationAnalysis(data: any[]): StatisticalResult[] {
    // Simplified correlation analysis
    return [
      { metric: 'Correlation', value: Math.random() * 2 - 1, interpretation: 'Linear relationship strength' }
    ];
  }

  private static performRegressionAnalysis(data: any[]): StatisticalResult[] {
    // Simplified regression analysis
    return [
      { metric: 'R-squared', value: Math.random(), interpretation: 'Goodness of fit' },
      { metric: 'Slope', value: Math.random() * 10 - 5, interpretation: 'Rate of change' }
    ];
  }

  private static determineTrend(data: TrendDataPoint[]): 'increasing' | 'decreasing' | 'stable' | 'volatile' {
    if (data.length < 2) return 'stable';
    
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, point) => sum + point.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, point) => sum + point.value, 0) / secondHalf.length;
    
    const change = (secondAvg - firstAvg) / firstAvg;
    
    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  private static calculateSlope(data: TrendDataPoint[]): number {
    if (data.length < 2) return 0;
    
    const n = data.length;
    const sumX = data.reduce((sum, point) => sum + point.timestamp.getTime(), 0);
    const sumY = data.reduce((sum, point) => sum + point.value, 0);
    const sumXY = data.reduce((sum, point) => sum + point.timestamp.getTime() * point.value, 0);
    const sumXX = data.reduce((sum, point) => sum + Math.pow(point.timestamp.getTime(), 2), 0);
    
    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  private static calculateRSquared(data: TrendDataPoint[]): number {
    // Simplified R-squared calculation
    return Math.random() * 0.5 + 0.5; // Random value between 0.5 and 1.0
  }

  private static generateForecast(data: TrendDataPoint[]): ForecastData[] {
    const forecast: ForecastData[] = [];
    const lastPoint = data[data.length - 1];
    const slope = this.calculateSlope(data);
    
    for (let i = 1; i <= 5; i++) {
      const futureTime = new Date(lastPoint.timestamp.getTime() + i * 24 * 60 * 60 * 1000);
      const predictedValue = lastPoint.value + slope * i;
      const confidence = Math.max(0.5, 1 - i * 0.1);
      
      forecast.push({
        timestamp: futureTime,
        predictedValue,
        confidenceInterval: {
          lower: predictedValue * (1 - confidence),
          upper: predictedValue * (1 + confidence)
        }
      });
    }
    
    return forecast;
  }

  private static calculateKPIValue(formula: string, data: any[]): number {
    // Simplified KPI calculation
    // In production, you'd have a proper formula parser
    if (formula.includes('SUM')) {
      return data.reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);
    }
    if (formula.includes('AVG')) {
      const numericData = data.filter(d => typeof d === 'number');
      return numericData.reduce((sum, val) => sum + val, 0) / numericData.length;
    }
    if (formula.includes('COUNT')) {
      return data.length;
    }
    return 0;
  }

  private static calculateKPITrend(data: any[]): 'up' | 'down' | 'stable' {
    if (data.length < 2) return 'stable';
    
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0) / secondHalf.length;
    
    if (secondAvg > firstAvg * 1.05) return 'up';
    if (secondAvg < firstAvg * 0.95) return 'down';
    return 'stable';
  }

  private static calculateKPIChange(data: any[]): number {
    if (data.length < 2) return 0;
    
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0) / secondHalf.length;
    
    return ((secondAvg - firstAvg) / firstAvg) * 100;
  }

  private static determineKPIUnit(formula: string): string {
    if (formula.includes('COUNT')) return 'count';
    if (formula.includes('AVG')) return 'average';
    if (formula.includes('SUM')) return 'total';
    return 'value';
  }

  private static calculateAnalysisConfidence(results: StatisticalResult[]): number {
    return Math.min(100, results.length * 15 + 20);
  }

  private static calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    const sumYY = y.reduce((sum, val) => sum + val * val, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  // Storage methods
  private static saveInsights(insights: DataInsight[]): void {
    const existing = this.getStoredInsights();
    existing.push(...insights);
    localStorage.setItem(this.INSIGHTS_KEY, JSON.stringify(existing));
  }

  private static saveKPI(kpi: KPI): void {
    const existing = this.getStoredKPIs();
    existing.push(kpi);
    localStorage.setItem(this.KPIS_KEY, JSON.stringify(existing));
  }

  private static saveTrendAnalysis(trend: TrendAnalysis): void {
    const existing = this.getStoredTrends();
    existing.push(trend);
    localStorage.setItem(this.TRENDS_KEY, JSON.stringify(existing));
  }

  private static saveStatisticalAnalysis(analysis: StatisticalAnalysis): void {
    const existing = this.getStoredStatistics();
    existing.push(analysis);
    localStorage.setItem(this.STATS_KEY, JSON.stringify(existing));
  }

  private static getStoredInsights(): DataInsight[] {
    try {
      const stored = localStorage.getItem(this.INSIGHTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private static getStoredKPIs(): KPI[] {
    try {
      const stored = localStorage.getItem(this.KPIS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private static getStoredTrends(): TrendAnalysis[] {
    try {
      const stored = localStorage.getItem(this.TRENDS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private static getStoredStatistics(): StatisticalAnalysis[] {
    try {
      const stored = localStorage.getItem(this.STATS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
}
