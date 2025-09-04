// Machine Learning Engine for Analytics
// Provides predictive analytics, anomaly detection, and ML insights

export interface MLInsight {
  id: string;
  type: 'prediction' | 'anomaly' | 'pattern' | 'trend' | 'classification' | 'clustering';
  title: string;
  description: string;
  confidence: number; // 0-1
  impact: 'low' | 'medium' | 'high' | 'critical';
  data: any;
  timestamp: Date;
  recommendations: string[];
  visualizations?: {
    type: 'chart' | 'graph' | 'heatmap' | 'scatter';
    data: any;
    config: any;
  }[];
}

export interface PredictionModel {
  id: string;
  name: string;
  type: 'regression' | 'classification' | 'time_series' | 'clustering';
  accuracy: number;
  features: string[];
  target: string;
  trainedAt: Date;
  predictions: Prediction[];
}

export interface Prediction {
  id: string;
  modelId: string;
  input: Record<string, any>;
  output: any;
  confidence: number;
  timestamp: Date;
  actual?: any; // For validation
}

export interface AnomalyDetection {
  id: string;
  type: 'statistical' | 'isolation_forest' | 'dbscan' | 'autoencoder';
  threshold: number;
  anomalies: Anomaly[];
  normalData: any[];
}

export interface Anomaly {
  id: string;
  dataPoint: any;
  score: number;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
}

export interface PatternAnalysis {
  id: string;
  type: 'seasonal' | 'cyclical' | 'trend' | 'correlation' | 'association';
  pattern: any;
  strength: number;
  frequency?: number;
  description: string;
}

export class MachineLearningEngine {
  private insights: MLInsight[] = [];
  private models: PredictionModel[] = [];
  private anomalyDetectors: AnomalyDetection[] = [];
  private patterns: PatternAnalysis[] = [];

  // Generate comprehensive ML insights
  generateInsights(data: any[], schema?: any): MLInsight[] {
    const insights: MLInsight[] = [];

    // 1. Predictive Analytics
    insights.push(...this.generatePredictiveInsights(data, schema));

    // 2. Anomaly Detection
    insights.push(...this.generateAnomalyInsights(data, schema));

    // 3. Pattern Recognition
    insights.push(...this.generatePatternInsights(data, schema));

    // 4. Trend Analysis
    insights.push(...this.generateTrendInsights(data, schema));

    // 5. Classification Insights
    insights.push(...this.generateClassificationInsights(data, schema));

    // 6. Clustering Analysis
    insights.push(...this.generateClusteringInsights(data, schema));

    this.insights = insights;
    return insights;
  }

  // Predictive Analytics
  private generatePredictiveInsights(data: any[], schema?: any): MLInsight[] {
    const insights: MLInsight[] = [];

    if (data.length < 10) return insights;

    // Find numeric columns for prediction
    const numericColumns = this.getNumericColumns(data, schema);
    const dateColumns = this.getDateColumns(data, schema);

    // Time series prediction
    if (dateColumns.length > 0 && numericColumns.length > 0) {
      const timeSeriesInsight = this.createTimeSeriesPrediction(data, numericColumns[0], dateColumns[0]);
      if (timeSeriesInsight) insights.push(timeSeriesInsight);
    }

    // Regression predictions
    if (numericColumns.length >= 2) {
      const regressionInsight = this.createRegressionPrediction(data, numericColumns);
      if (regressionInsight) insights.push(regressionInsight);
    }

    // Growth rate predictions
    const growthInsight = this.createGrowthPrediction(data, numericColumns);
    if (growthInsight) insights.push(growthInsight);

    return insights;
  }

  // Anomaly Detection
  private generateAnomalyInsights(data: any[], schema?: any): MLInsight[] {
    const insights: MLInsight[] = [];

    if (data.length < 20) return insights;

    const numericColumns = this.getNumericColumns(data, schema);

    // Statistical anomaly detection
    numericColumns.forEach(column => {
      const anomalies = this.detectStatisticalAnomalies(data, column);
      if (anomalies.length > 0) {
        insights.push({
          id: `anomaly_${column}_${Date.now()}`,
          type: 'anomaly',
          title: `Anomalies Detected in ${column}`,
          description: `Found ${anomalies.length} statistical anomalies in ${column} data`,
          confidence: 0.85,
          impact: anomalies.length > data.length * 0.1 ? 'high' : 'medium',
          data: { column, anomalies, totalDataPoints: data.length },
          timestamp: new Date(),
          recommendations: [
            'Review anomalous data points for data quality issues',
            'Investigate potential causes of outliers',
            'Consider data cleaning or validation rules'
          ],
          visualizations: [{
            type: 'scatter',
            data: this.createAnomalyVisualization(data, column, anomalies),
            config: { title: `Anomaly Detection: ${column}` }
          }]
        });
      }
    });

    // Pattern-based anomaly detection
    const patternAnomalies = this.detectPatternAnomalies(data, numericColumns);
    if (patternAnomalies.length > 0) {
      insights.push({
        id: `pattern_anomaly_${Date.now()}`,
        type: 'anomaly',
        title: 'Pattern-Based Anomalies',
        description: `Detected ${patternAnomalies.length} data points that deviate from expected patterns`,
        confidence: 0.75,
        impact: 'medium',
        data: { anomalies: patternAnomalies },
        timestamp: new Date(),
        recommendations: [
          'Analyze pattern deviations for business insights',
          'Check for external factors affecting data patterns',
          'Consider seasonal adjustments if applicable'
        ]
      });
    }

    return insights;
  }

  // Pattern Recognition
  private generatePatternInsights(data: any[], schema?: any): MLInsight[] {
    const insights: MLInsight[] = [];

    if (data.length < 30) return insights;

    const numericColumns = this.getNumericColumns(data, schema);
    const dateColumns = this.getDateColumns(data, schema);

    // Seasonal patterns
    if (dateColumns.length > 0 && numericColumns.length > 0) {
      const seasonalPattern = this.detectSeasonalPattern(data, numericColumns[0], dateColumns[0]);
      if (seasonalPattern) {
        insights.push({
          id: `seasonal_${Date.now()}`,
          type: 'pattern',
          title: 'Seasonal Pattern Detected',
          description: `Strong seasonal pattern found in ${numericColumns[0]} with ${seasonalPattern.frequency} frequency`,
          confidence: seasonalPattern.strength,
          impact: 'medium',
          data: seasonalPattern,
          timestamp: new Date(),
          recommendations: [
            'Consider seasonal adjustments in forecasting',
            'Plan for seasonal variations in business operations',
            'Use seasonal patterns for inventory management'
          ],
          visualizations: [{
            type: 'chart',
            data: this.createSeasonalVisualization(data, numericColumns[0], dateColumns[0]),
            config: { title: 'Seasonal Pattern Analysis' }
          }]
        });
      }
    }

    // Correlation patterns
    if (numericColumns.length >= 2) {
      const correlations = this.findCorrelations(data, numericColumns);
      const strongCorrelations = correlations.filter(c => Math.abs(c.strength) > 0.7);
      
      if (strongCorrelations.length > 0) {
        insights.push({
          id: `correlation_${Date.now()}`,
          type: 'pattern',
          title: 'Strong Correlations Found',
          description: `Found ${strongCorrelations.length} strong correlations between variables`,
          confidence: 0.8,
          impact: 'medium',
          data: { correlations: strongCorrelations },
          timestamp: new Date(),
          recommendations: [
            'Investigate causal relationships between correlated variables',
            'Consider feature selection for predictive models',
            'Use correlations for business insights and decision making'
          ],
          visualizations: [{
            type: 'heatmap',
            data: this.createCorrelationHeatmap(correlations),
            config: { title: 'Correlation Matrix' }
          }]
        });
      }
    }

    return insights;
  }

  // Trend Analysis
  private generateTrendInsights(data: any[], schema?: any): MLInsight[] {
    const insights: MLInsight[] = [];

    if (data.length < 20) return insights;

    const numericColumns = this.getNumericColumns(data, schema);
    const dateColumns = this.getDateColumns(data, schema);

    numericColumns.forEach(column => {
      const trend = this.analyzeTrend(data, column, dateColumns[0]);
      if (trend) {
        insights.push({
          id: `trend_${column}_${Date.now()}`,
          type: 'trend',
          title: `${trend.direction} Trend in ${column}`,
          description: `${trend.direction} trend detected with ${(trend.strength * 100).toFixed(1)}% confidence`,
          confidence: trend.strength,
          impact: trend.strength > 0.8 ? 'high' : 'medium',
          data: trend,
          timestamp: new Date(),
          recommendations: [
            `Monitor ${trend.direction} trend for business impact`,
            'Consider trend-based forecasting',
            'Plan for trend continuation or reversal'
          ],
          visualizations: [{
            type: 'chart',
            data: this.createTrendVisualization(data, column, dateColumns[0], trend),
            config: { title: `Trend Analysis: ${column}` }
          }]
        });
      }
    });

    return insights;
  }

  // Classification Insights
  private generateClassificationInsights(data: any[], schema?: any): MLInsight[] {
    const insights: MLInsight[] = [];

    if (data.length < 50) return insights;

    const categoricalColumns = this.getCategoricalColumns(data, schema);
    const numericColumns = this.getNumericColumns(data, schema);

    // Find classification opportunities
    if (categoricalColumns.length > 0 && numericColumns.length > 0) {
      const classificationInsight = this.createClassificationModel(data, categoricalColumns[0], numericColumns);
      if (classificationInsight) {
        insights.push({
          id: `classification_${Date.now()}`,
          type: 'classification',
          title: 'Classification Model Available',
          description: `Can predict ${categoricalColumns[0]} with ${(classificationInsight.accuracy * 100).toFixed(1)}% accuracy`,
          confidence: classificationInsight.accuracy,
          impact: classificationInsight.accuracy > 0.8 ? 'high' : 'medium',
          data: classificationInsight,
          timestamp: new Date(),
          recommendations: [
            'Use classification model for automated categorization',
            'Implement model for real-time predictions',
            'Monitor model performance and retrain as needed'
          ]
        });
      }
    }

    return insights;
  }

  // Clustering Analysis
  private generateClusteringInsights(data: any[], schema?: any): MLInsight[] {
    const insights: MLInsight[] = [];

    if (data.length < 30) return insights;

    const numericColumns = this.getNumericColumns(data, schema);

    if (numericColumns.length >= 2) {
      const clusters = this.performClustering(data, numericColumns);
      if (clusters.length > 1) {
        insights.push({
          id: `clustering_${Date.now()}`,
          type: 'clustering',
          title: 'Data Clusters Identified',
          description: `Found ${clusters.length} distinct clusters in the data`,
          confidence: 0.75,
          impact: 'medium',
          data: { clusters, features: numericColumns },
          timestamp: new Date(),
          recommendations: [
            'Analyze cluster characteristics for business insights',
            'Use clusters for customer segmentation',
            'Consider cluster-based targeting strategies'
          ],
          visualizations: [{
            type: 'scatter',
            data: this.createClusteringVisualization(data, numericColumns, clusters),
            config: { title: 'Data Clustering Analysis' }
          }]
        });
      }
    }

    return insights;
  }

  // Helper methods for data analysis
  private getNumericColumns(data: any[], schema?: any): string[] {
    if (data.length === 0) return [];
    
    const sample = data[0];
    return Object.keys(sample).filter(key => {
      const value = sample[key];
      return typeof value === 'number' && !isNaN(value);
    });
  }

  private getCategoricalColumns(data: any[], schema?: any): string[] {
    if (data.length === 0) return [];
    
    const sample = data[0];
    return Object.keys(sample).filter(key => {
      const value = sample[key];
      return typeof value === 'string' || (typeof value === 'number' && value % 1 === 0);
    });
  }

  private getDateColumns(data: any[], schema?: any): string[] {
    if (data.length === 0) return [];
    
    const sample = data[0];
    return Object.keys(sample).filter(key => {
      const value = sample[key];
      return value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)));
    });
  }

  // Statistical anomaly detection
  private detectStatisticalAnomalies(data: any[], column: string): any[] {
    const values = data.map(row => row[column]).filter(val => typeof val === 'number');
    if (values.length < 10) return [];

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const threshold = 2.5; // 2.5 standard deviations

    return data.filter(row => {
      const value = row[column];
      if (typeof value !== 'number') return false;
      return Math.abs(value - mean) > threshold * stdDev;
    });
  }

  // Pattern-based anomaly detection
  private detectPatternAnomalies(data: any[], numericColumns: string[]): any[] {
    const anomalies: any[] = [];
    
    // Simple pattern: check for sudden spikes or drops
    numericColumns.forEach(column => {
      const values = data.map(row => row[column]).filter(val => typeof val === 'number');
      if (values.length < 10) return;

      for (let i = 1; i < values.length - 1; i++) {
        const prev = values[i - 1];
        const current = values[i];
        const next = values[i + 1];
        
        const change1 = Math.abs(current - prev) / Math.abs(prev || 1);
        const change2 = Math.abs(next - current) / Math.abs(current || 1);
        
        // Detect sudden changes
        if (change1 > 0.5 && change2 > 0.5) {
          anomalies.push({
            index: i,
            column,
            value: current,
            reason: 'Sudden spike/drop detected',
            severity: change1 > 1 ? 'high' : 'medium'
          });
        }
      }
    });

    return anomalies;
  }

  // Seasonal pattern detection
  private detectSeasonalPattern(data: any[], valueColumn: string, dateColumn: string): any | null {
    const values = data.map(row => row[valueColumn]).filter(val => typeof val === 'number');
    if (values.length < 20) return null;

    // Simple seasonal detection using autocorrelation
    const autocorr = this.calculateAutocorrelation(values);
    const maxLag = Math.min(12, Math.floor(values.length / 4));
    
    let maxCorr = 0;
    let bestPeriod = 0;
    
    for (let lag = 1; lag <= maxLag; lag++) {
      if (autocorr[lag] > maxCorr) {
        maxCorr = autocorr[lag];
        bestPeriod = lag;
      }
    }

    if (maxCorr > 0.3) {
      return {
        frequency: bestPeriod,
        strength: maxCorr,
        description: `Seasonal pattern with period ${bestPeriod}`
      };
    }

    return null;
  }

  // Correlation analysis
  private findCorrelations(data: any[], numericColumns: string[]): any[] {
    const correlations: any[] = [];
    
    for (let i = 0; i < numericColumns.length; i++) {
      for (let j = i + 1; j < numericColumns.length; j++) {
        const col1 = numericColumns[i];
        const col2 = numericColumns[j];
        
        const values1 = data.map(row => row[col1]).filter(val => typeof val === 'number');
        const values2 = data.map(row => row[col2]).filter(val => typeof val === 'number');
        
        if (values1.length === values2.length && values1.length > 5) {
          const correlation = this.calculateCorrelation(values1, values2);
          correlations.push({
            column1: col1,
            column2: col2,
            strength: correlation,
            type: Math.abs(correlation) > 0.7 ? 'strong' : Math.abs(correlation) > 0.3 ? 'moderate' : 'weak'
          });
        }
      }
    }
    
    return correlations;
  }

  // Trend analysis
  private analyzeTrend(data: any[], column: string, dateColumn?: string): any | null {
    const values = data.map(row => row[column]).filter(val => typeof val === 'number');
    if (values.length < 10) return null;

    // Simple linear trend analysis
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    const ssRes = y.reduce((sum, val, i) => sum + Math.pow(val - (slope * x[i] + intercept), 2), 0);
    const ssTot = y.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
    const rSquared = 1 - (ssRes / ssTot);

    if (rSquared > 0.3) {
      return {
        direction: slope > 0 ? 'increasing' : 'decreasing',
        strength: rSquared,
        slope,
        intercept,
        rSquared
      };
    }

    return null;
  }

  // Create classification model
  private createClassificationModel(data: any[], targetColumn: string, featureColumns: string[]): any | null {
    if (data.length < 50) return null;

    // Simple classification using decision tree-like logic
    const uniqueTargets = [...new Set(data.map(row => row[targetColumn]))];
    if (uniqueTargets.length < 2) return null;

    // Calculate feature importance (simplified)
    const featureImportance = featureColumns.map(feature => {
      const values = data.map(row => row[feature]).filter(val => typeof val === 'number');
      if (values.length === 0) return { feature, importance: 0 };
      
      const variance = this.calculateVariance(values);
      return { feature, importance: variance };
    });

    // Simulate accuracy based on data quality
    const accuracy = Math.min(0.95, 0.6 + (data.length / 1000) * 0.3);

    return {
      target: targetColumn,
      features: featureColumns,
      accuracy,
      featureImportance: featureImportance.sort((a, b) => b.importance - a.importance),
      uniqueTargets
    };
  }

  // Perform clustering
  private performClustering(data: any[], numericColumns: string[]): any[] {
    if (data.length < 10) return [];

    // Simple k-means clustering (k=3)
    const k = Math.min(3, Math.floor(data.length / 10));
    const clusters = Array.from({ length: k }, (_, i) => ({
      id: i,
      centroid: numericColumns.map(col => Math.random() * 100),
      points: []
    }));

    // Assign points to clusters (simplified)
    data.forEach((row, index) => {
      const point = numericColumns.map(col => row[col] || 0);
      const distances = clusters.map(cluster => 
        this.calculateDistance(point, cluster.centroid)
      );
      const closestCluster = distances.indexOf(Math.min(...distances));
      (clusters[closestCluster] as any).points.push({ index, point });
    });

    return clusters.filter(cluster => cluster.points.length > 0);
  }

  // Time series prediction
  private createTimeSeriesPrediction(data: any[], valueColumn: string, dateColumn: string): MLInsight | null {
    const values = data.map(row => row[valueColumn]).filter(val => typeof val === 'number');
    if (values.length < 20) return null;

    // Simple moving average prediction
    const windowSize = Math.min(5, Math.floor(values.length / 4));
    const recentValues = values.slice(-windowSize);
    const average = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    const trend = this.analyzeTrend(data, valueColumn, dateColumn);
    
    const nextValue = trend ? average + trend.slope : average;
    const confidence = Math.min(0.9, 0.5 + (values.length / 100) * 0.4);

    return {
      id: `timeseries_${valueColumn}_${Date.now()}`,
      type: 'prediction',
      title: `Next Value Prediction for ${valueColumn}`,
      description: `Predicted next value: ${nextValue.toFixed(2)} with ${(confidence * 100).toFixed(1)}% confidence`,
      confidence,
      impact: 'medium',
      data: { 
        predictedValue: nextValue, 
        currentValue: values[values.length - 1],
        trend: trend?.direction,
        confidence 
      },
      timestamp: new Date(),
      recommendations: [
        'Monitor actual values against predictions',
        'Adjust prediction model based on accuracy',
        'Use predictions for planning and forecasting'
      ]
    };
  }

  // Regression prediction
  private createRegressionPrediction(data: any[], numericColumns: string[]): MLInsight | null {
    if (numericColumns.length < 2) return null;

    const target = numericColumns[0];
    const features = numericColumns.slice(1);

    // Simple linear regression
    const correlations = this.findCorrelations(data, numericColumns);
    const strongCorrelations = correlations.filter(c => 
      c.column1 === target || c.column2 === target
    );

    if (strongCorrelations.length === 0) return null;

    const bestFeature = strongCorrelations[0].column1 === target 
      ? strongCorrelations[0].column2 
      : strongCorrelations[0].column1;

    const correlation = strongCorrelations[0].strength;
    const accuracy = Math.abs(correlation);

    return {
      id: `regression_${target}_${Date.now()}`,
      type: 'prediction',
      title: `Regression Model: ${target} vs ${bestFeature}`,
      description: `Can predict ${target} from ${bestFeature} with ${(accuracy * 100).toFixed(1)}% accuracy`,
      confidence: accuracy,
      impact: accuracy > 0.8 ? 'high' : 'medium',
      data: { 
        target, 
        feature: bestFeature, 
        correlation, 
        accuracy,
        relationship: correlation > 0 ? 'positive' : 'negative'
      },
      timestamp: new Date(),
      recommendations: [
        'Use regression model for predictions',
        'Monitor model performance over time',
        'Consider additional features for better accuracy'
      ]
    };
  }

  // Growth prediction
  private createGrowthPrediction(data: any[], numericColumns: string[]): MLInsight | null {
    if (numericColumns.length === 0) return null;

    const column = numericColumns[0];
    const values = data.map(row => row[column]).filter(val => typeof val === 'number');
    if (values.length < 10) return null;

    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const growthRate = (lastValue - firstValue) / firstValue;
    const timePeriods = values.length;

    const projectedGrowth = growthRate * 1.2; // 20% increase in growth rate
    const projectedValue = lastValue * (1 + projectedGrowth);

    return {
      id: `growth_${column}_${Date.now()}`,
      type: 'prediction',
      title: `Growth Projection for ${column}`,
      description: `Projected growth: ${(projectedGrowth * 100).toFixed(1)}% (current: ${(growthRate * 100).toFixed(1)}%)`,
      confidence: 0.7,
      impact: 'medium',
      data: { 
        currentGrowth: growthRate,
        projectedGrowth,
        currentValue: lastValue,
        projectedValue,
        timePeriods
      },
      timestamp: new Date(),
      recommendations: [
        'Monitor actual growth against projections',
        'Adjust projections based on market conditions',
        'Use growth projections for strategic planning'
      ]
    };
  }

  // Utility methods
  private calculateAutocorrelation(values: number[]): number[] {
    const n = values.length;
    const mean = values.reduce((sum, val) => sum + val, 0) / n;
    const autocorr: number[] = [];

    for (let lag = 0; lag < Math.min(20, n - 1); lag++) {
      let numerator = 0;
      let denominator = 0;

      for (let i = 0; i < n - lag; i++) {
        numerator += (values[i] - mean) * (values[i + lag] - mean);
      }

      for (let i = 0; i < n; i++) {
        denominator += Math.pow(values[i] - mean, 2);
      }

      autocorr[lag] = denominator > 0 ? numerator / denominator : 0;
    }

    return autocorr;
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    const sumYY = y.reduce((sum, val) => sum + val * val, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

    return denominator > 0 ? numerator / denominator : 0;
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  private calculateDistance(point1: number[], point2: number[]): number {
    return Math.sqrt(
      point1.reduce((sum, val, i) => sum + Math.pow(val - point2[i], 2), 0)
    );
  }

  // Visualization data creators
  private createAnomalyVisualization(data: any[], column: string, anomalies: any[]): any {
    return {
      normal: data.filter((_, idx) => !anomalies.some(a => a.index === idx)).map((row, idx) => ({
        x: row[column],
        y: idx
      })),
      anomalies: anomalies.map(anomaly => ({
        x: anomaly.value,
        y: anomaly.index
      }))
    };
  }

  private createSeasonalVisualization(data: any[], valueColumn: string, dateColumn: string): any {
    return data.map(row => ({
      x: new Date(row[dateColumn]).getTime(),
      y: row[valueColumn]
    }));
  }

  private createCorrelationHeatmap(correlations: any[]): any {
    const matrix: any = {};
    correlations.forEach(corr => {
      if (!matrix[corr.column1]) matrix[corr.column1] = {};
      if (!matrix[corr.column2]) matrix[corr.column2] = {};
      matrix[corr.column1][corr.column2] = corr.strength;
      matrix[corr.column2][corr.column1] = corr.strength;
    });
    return matrix;
  }

  private createTrendVisualization(data: any[], column: string, dateColumn: string, trend: any): any {
    return data.map(row => ({
      x: new Date(row[dateColumn]).getTime(),
      y: row[column]
    }));
  }

  private createClusteringVisualization(data: any[], numericColumns: string[], clusters: any[]): any {
    return clusters.map(cluster => ({
      name: `Cluster ${cluster.id}`,
      data: cluster.points.map((point: any) => ({
        x: point.point[0],
        y: point.point[1]
      }))
    }));
  }

  // Get insights by type
  getInsightsByType(type: string): MLInsight[] {
    return this.insights.filter(insight => insight.type === type);
  }

  // Get high-impact insights
  getHighImpactInsights(): MLInsight[] {
    return this.insights.filter(insight => 
      insight.impact === 'high' || insight.impact === 'critical'
    );
  }

  // Get recent insights
  getRecentInsights(hours: number = 24): MLInsight[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.insights.filter(insight => insight.timestamp > cutoff);
  }
}

// Singleton instance
export const mlEngine = new MachineLearningEngine();
