'use client';

// Query Optimization Manager Component
// Advanced SQL query analysis, performance monitoring, and optimization interface

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Zap, TrendingUp, TrendingDown, BarChart3, Activity, Clock, Target, 
  AlertTriangle, CheckCircle, XCircle, Play, Pause, RotateCcw, Settings,
  Download, Filter, Search, Eye, EyeOff, Database, FileText, PieChart,
  LineChart, Layers, Code, Brain, Lightbulb, Award, Bookmark, ArrowRight,
  ChevronDown, ChevronRight, Info, AlertCircle, Star, ThumbsUp, ThumbsDown
} from 'lucide-react';

import { DatabaseSchema } from '@/types/database';
import {
  QueryOptimizationService,
  QueryPlan,
  QueryPerformanceMetrics,
  PerformanceReport,
  IndexRecommendation,
  QueryRecommendation,
  PerformanceAlert
} from '@/services/queryOptimizationService';

interface QueryOptimizationManagerProps {
  schema: DatabaseSchema | null;
  onSchemaChange?: (schema: DatabaseSchema) => void;
}

export function QueryOptimizationManager({ schema, onSchemaChange }: QueryOptimizationManagerProps) {
  // State
  const [activeTab, setActiveTab] = useState<'analyzer' | 'performance' | 'recommendations' | 'alerts' | 'reports'>('analyzer');
  const [query, setQuery] = useState('');
  const [currentPlan, setCurrentPlan] = useState<QueryPlan | null>(null);
  const [performanceReport, setPerformanceReport] = useState<PerformanceReport | null>(null);
  const [indexRecommendations, setIndexRecommendations] = useState<IndexRecommendation[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [showExecutionPlan, setShowExecutionPlan] = useState(true);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');
  const [autoAnalyze, setAutoAnalyze] = useState(false);

  // Refs
  const queryEditorRef = useRef<HTMLTextAreaElement>(null);

  // Sample queries for testing
  const sampleQueries = [
    "SELECT * FROM users WHERE status = 'active'",
    "SELECT u.name, COUNT(o.id) as order_count FROM users u LEFT JOIN orders o ON u.id = o.user_id GROUP BY u.id",
    "SELECT p.name, p.price FROM products p WHERE p.category_id IN (SELECT id FROM categories WHERE name = 'Electronics')",
    "UPDATE users SET last_login = NOW() WHERE id = 123",
    "SELECT DISTINCT u.email FROM users u JOIN orders o ON u.id = o.user_id WHERE o.created_at > '2024-01-01'"
  ];

  // Initialize performance report
  useEffect(() => {
    if (schema && !performanceReport) {
      generatePerformanceReport();
    }
  }, [schema]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-analyze query when it changes
  useEffect(() => {
    if (autoAnalyze && query.trim() && schema) {
      const timeoutId = setTimeout(() => {
        analyzeQuery();
      }, 1000); // Debounce

      return () => clearTimeout(timeoutId);
    }
  }, [query, autoAnalyze, schema]); // eslint-disable-line react-hooks/exhaustive-deps

  // Analyze current query
  const analyzeQuery = useCallback(async () => {
    if (!query.trim() || !schema) return;

    setIsAnalyzing(true);
    try {
      const plan = await QueryOptimizationService.analyzeQuery(query, schema);
      setCurrentPlan(plan);
    } catch (error) {
      console.error('Query analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [query, schema]);

  // Generate performance report
  const generatePerformanceReport = useCallback(async () => {
    if (!schema) return;

    setIsGeneratingReport(true);
    try {
      const timeRange = {
        start: new Date(Date.now() - getTimeRangeMs(selectedTimeRange)),
        end: new Date()
      };
      
      const report = await QueryOptimizationService.generatePerformanceReport(schema, timeRange);
      setPerformanceReport(report);
    } catch (error) {
      console.error('Performance report generation failed:', error);
    } finally {
      setIsGeneratingReport(false);
    }
  }, [schema, selectedTimeRange]);

  // Generate index recommendations
  const generateIndexRecommendations = useCallback(async () => {
    if (!schema) return;

    try {
      const queries = sampleQueries; // In production, would use actual query log
      const recommendations = await QueryOptimizationService.suggestIndexes(schema, queries);
      setIndexRecommendations(recommendations);
    } catch (error) {
      console.error('Index recommendation generation failed:', error);
    }
  }, [schema]);

  // Optimize current query
  const optimizeQuery = useCallback(async () => {
    if (!query.trim() || !schema) return;

    try {
      const optimization = await QueryOptimizationService.optimizeQuery(query, schema);
      setQuery(optimization.optimizedQuery);
    } catch (error) {
      console.error('Query optimization failed:', error);
    }
  }, [query, schema]);

  // Toggle execution plan step
  const toggleStep = useCallback((stepId: string) => {
    setExpandedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  }, []);

  // Export report
  const exportReport = useCallback(() => {
    if (!performanceReport) return;

    const reportData = {
      report: performanceReport,
      exportedAt: new Date().toISOString(),
      schema: schema?.name || 'Unknown'
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `performance-report-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [performanceReport, schema]);

  // Get time range in milliseconds
  const getTimeRangeMs = (range: string): number => {
    switch (range) {
      case '1h': return 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      case '30d': return 30 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  };

  // Render execution plan step
  const renderPlanStep = (step: any, level: number = 0) => (
    <div key={step.id} className={`ml-${level * 4}`}>
      <div className="flex items-center p-3 border border-gray-200 rounded-lg mb-2 bg-white">
        <div className="flex items-center flex-1">
          {step.children && step.children.length > 0 && (
            <button
              onClick={() => toggleStep(step.id)}
              className="mr-2 text-gray-400 hover:text-gray-600"
            >
              {expandedSteps.has(step.id) ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          )}
          
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-3 ${
              step.operation === 'scan' ? 'bg-red-400' :
              step.operation === 'seek' ? 'bg-green-400' :
              step.operation === 'join' ? 'bg-blue-400' :
              step.operation === 'sort' ? 'bg-yellow-400' :
              step.operation === 'filter' ? 'bg-purple-400' :
              'bg-gray-400'
            }`} />
            
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900 capitalize">{step.operation}</span>
                {step.table && (
                  <span className="text-sm text-gray-500">on {step.table}</span>
                )}
                {step.index && (
                  <span className="text-xs bg-green-100 text-green-800 px-1 py-0.5 rounded">
                    Index: {step.index}
                  </span>
                )}
              </div>
              {step.condition && (
                <div className="text-sm text-gray-600 mt-1">{step.condition}</div>
              )}
            </div>
          </div>
        </div>
        
        <div className="text-right text-sm">
          <div className="text-gray-900 font-medium">
            Cost: {Math.round(step.estimatedCost)}
          </div>
          <div className="text-gray-500">
            Rows: {step.estimatedRows.toLocaleString()}
          </div>
        </div>
      </div>
      
      {expandedSteps.has(step.id) && step.children && (
        <div className="ml-4 space-y-2">
          {step.children.map((child: any) => renderPlanStep(child, level + 1))}
        </div>
      )}
    </div>
  );

  // Render query analyzer
  const renderAnalyzer = () => (
    <div className="space-y-6">
      {/* Query Input */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Query Analyzer</h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="auto-analyze"
                checked={autoAnalyze}
                onChange={(e) => setAutoAnalyze(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <label htmlFor="auto-analyze" className="text-sm text-gray-700">
                Auto-analyze
              </label>
            </div>
            
            <select
              onChange={(e) => setQuery(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Sample Queries</option>
              {sampleQueries.map((sample, index) => (
                <option key={index} value={sample}>
                  Query {index + 1}
                </option>
              ))}
            </select>
            
            <button
              onClick={analyzeQuery}
              disabled={isAnalyzing || !query.trim()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
            >
              <Zap className={`w-4 h-4 mr-2 ${isAnalyzing ? 'animate-pulse' : ''}`} />
              {isAnalyzing ? 'Analyzing...' : 'Analyze'}
            </button>
            
            <button
              onClick={optimizeQuery}
              disabled={!query.trim() || !schema}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Brain className="w-4 h-4 mr-2" />
              Optimize
            </button>
          </div>
        </div>
        
        <textarea
          ref={queryEditorRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter your SQL query here..."
          rows={8}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
        />
      </div>

      {/* Analysis Results */}
      {currentPlan && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Query Metrics */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Query Metrics</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Estimated Cost:</span>
                <span className="font-medium text-gray-900">
                  {Math.round(currentPlan.estimatedCost)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Estimated Rows:</span>
                <span className="font-medium text-gray-900">
                  {currentPlan.estimatedRows.toLocaleString()}
                </span>
              </div>
              {currentPlan.executionTimeMs && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Execution Time:</span>
                  <span className="font-medium text-gray-900">
                    {currentPlan.executionTimeMs}ms
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Plan Steps:</span>
                <span className="font-medium text-gray-900">
                  {currentPlan.steps.length}
                </span>
              </div>
            </div>

            {/* Performance Score */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Performance Score:</span>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  currentPlan.estimatedCost < 100 ? 'bg-green-100 text-green-800' :
                  currentPlan.estimatedCost < 500 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  <Award className="w-4 h-4 mr-1" />
                  {currentPlan.estimatedCost < 100 ? 'Excellent' :
                   currentPlan.estimatedCost < 500 ? 'Good' : 'Needs Optimization'}
                </div>
              </div>
            </div>
          </div>

          {/* Warnings & Recommendations */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recommendations</h3>
            
            {currentPlan.warnings.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-amber-800 mb-2 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Warnings
                </h4>
                <div className="space-y-2">
                  {currentPlan.warnings.map((warning, index) => (
                    <div key={index} className="p-2 bg-amber-50 rounded text-sm text-amber-700">
                      {warning}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentPlan.recommendations.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
                  <Lightbulb className="w-4 h-4 mr-1" />
                  Suggestions
                </h4>
                <div className="space-y-3">
                  {currentPlan.recommendations.map((rec) => (
                    <div key={rec.id} className="p-3 bg-blue-50 rounded">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm font-medium text-blue-900">{rec.title}</div>
                          <div className="text-sm text-blue-700 mt-1">{rec.description}</div>
                          <div className="text-xs text-blue-600 mt-1">
                            Impact: {rec.impact}
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded ${
                          rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                          rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {rec.priority}
                        </span>
                      </div>
                      {rec.sqlExample && (
                        <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono">
                          {rec.sqlExample}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentPlan.warnings.length === 0 && currentPlan.recommendations.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p className="text-sm">Query looks optimized!</p>
              </div>
            )}
          </div>

          {/* Index Usage */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Index Usage</h3>
            
            {currentPlan.indexes.length > 0 ? (
              <div className="space-y-3">
                {currentPlan.indexes.map((index, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded">
                    <div className="text-sm font-medium text-gray-900">{index.indexName}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Table: {index.tableName}
                    </div>
                    <div className="text-sm text-gray-600">
                      Columns: {index.columns.join(', ')}
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-gray-500">
                      <span>Seeks: {index.seekCount}</span>
                      <span>Scans: {index.scanCount}</span>
                      <span>Efficiency: {index.efficiency}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <Database className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No indexes detected in query plan</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Execution Plan */}
      {currentPlan && showExecutionPlan && (
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Execution Plan</h3>
            <button
              onClick={() => setShowExecutionPlan(!showExecutionPlan)}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              {showExecutionPlan ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          
          <div className="space-y-2">
            {currentPlan.steps.map((step) => renderPlanStep(step))}
          </div>
        </div>
      )}
    </div>
  );

  // Render performance dashboard
  const renderPerformance = () => (
    <div className="space-y-6">
      {/* Performance Overview */}
      {performanceReport && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BarChart3 className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Overall Score</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {performanceReport.summary.overallScore}/100
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Activity className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Avg Response</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Math.round(performanceReport.summary.avgResponseTime)}ms
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Slow Queries</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {performanceReport.summary.slowQueries}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Target className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Opportunities</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {performanceReport.summary.improvementOpportunities}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Slow Queries */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Slowest Queries</h3>
            <div className="space-y-4">
              {performanceReport.topSlowQueries.map((query) => (
                <div key={query.queryId} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-mono text-gray-900 mb-2">
                        {query.query.length > 100 ? `${query.query.substring(0, 100)}...` : query.query}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>Avg: {Math.round(query.avgExecutionTime)}ms</span>
                        <span>Max: {Math.round(query.maxExecutionTime)}ms</span>
                        <span>Count: {query.executionCount}</span>
                        <span>Cache Hit: {Math.round(query.cacheHitRatio)}%</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded ${
                        query.trend === 'improving' ? 'bg-green-100 text-green-800' :
                        query.trend === 'degrading' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {query.trend === 'improving' ? (
                          <TrendingUp className="w-3 h-3 inline mr-1" />
                        ) : query.trend === 'degrading' ? (
                          <TrendingDown className="w-3 h-3 inline mr-1" />
                        ) : null}
                        {query.trend}
                      </span>
                      {query.alertLevel !== 'none' && (
                        <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                          Alert
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trend Analysis */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Trends</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  performanceReport.trendAnalysis.performanceTrend === 'improving' ? 'bg-green-100 text-green-800' :
                  performanceReport.trendAnalysis.performanceTrend === 'degrading' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {performanceReport.trendAnalysis.performanceTrend === 'improving' ? (
                    <TrendingUp className="w-4 h-4 mr-1" />
                  ) : performanceReport.trendAnalysis.performanceTrend === 'degrading' ? (
                    <TrendingDown className="w-4 h-4 mr-1" />
                  ) : (
                    <Activity className="w-4 h-4 mr-1" />
                  )}
                  {performanceReport.trendAnalysis.performanceTrend}
                </div>
                <div className="text-sm text-gray-500 mt-1">Performance Trend</div>
              </div>

              <div className="text-center">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  performanceReport.trendAnalysis.queryCountTrend === 'increasing' ? 'bg-blue-100 text-blue-800' :
                  performanceReport.trendAnalysis.queryCountTrend === 'decreasing' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  <BarChart3 className="w-4 h-4 mr-1" />
                  {performanceReport.trendAnalysis.queryCountTrend}
                </div>
                <div className="text-sm text-gray-500 mt-1">Query Volume</div>
              </div>

              <div className="text-center">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  performanceReport.trendAnalysis.resourceUsageTrend === 'increasing' ? 'bg-red-100 text-red-800' :
                  performanceReport.trendAnalysis.resourceUsageTrend === 'decreasing' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  <Activity className="w-4 h-4 mr-1" />
                  {performanceReport.trendAnalysis.resourceUsageTrend}
                </div>
                <div className="text-sm text-gray-500 mt-1">Resource Usage</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  // Render recommendations
  const renderRecommendations = () => (
    <div className="space-y-6">
      {/* Index Recommendations */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Index Recommendations</h3>
          <button
            onClick={generateIndexRecommendations}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <Lightbulb className="w-4 h-4 mr-2" />
            Generate Recommendations
          </button>
        </div>

        {indexRecommendations.length > 0 ? (
          <div className="space-y-4">
            {indexRecommendations.map((rec) => (
              <div key={rec.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 capitalize">
                      {rec.type} Index: {rec.indexName || `idx_${rec.tableName}_${rec.columns.join('_')}`}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">{rec.reason}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${
                    rec.priority === 'critical' ? 'bg-red-100 text-red-800' :
                    rec.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {rec.priority}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Table:</span>
                    <span className="ml-2 text-sm text-gray-900">{rec.tableName}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Columns:</span>
                    <span className="ml-2 text-sm text-gray-900">{rec.columns.join(', ')}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Improvement:</span>
                    <span className="ml-2 text-sm text-green-600 font-medium">{rec.estimatedImprovement}%</span>
                  </div>
                </div>

                <div className="bg-gray-50 rounded p-3 mb-3">
                  <div className="text-sm font-medium text-gray-700 mb-1">DDL Statement:</div>
                  <code className="text-sm text-gray-900 font-mono">{rec.ddlStatement}</code>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Storage Impact: {rec.storageImpact}MB</span>
                  <span>Maintenance: {rec.maintenanceImpact}</span>
                  <span>Queries Affected: {rec.queries.length}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No index recommendations available.</p>
            <p className="text-sm mt-2">Generate recommendations based on your query patterns.</p>
          </div>
        )}
      </div>

      {/* Query Optimizations */}
      {performanceReport && performanceReport.queryOptimizations.length > 0 && (
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Query Optimizations</h3>
          <div className="space-y-4">
            {performanceReport.queryOptimizations.map((opt) => (
              <div key={opt.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{opt.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{opt.description}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${
                    opt.priority === 'high' ? 'bg-red-100 text-red-800' :
                    opt.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {opt.priority}
                  </span>
                </div>

                {opt.before && opt.after && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-3">
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">Before:</div>
                      <div className="bg-red-50 p-2 rounded text-sm font-mono text-red-800">
                        {opt.before}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">After:</div>
                      <div className="bg-green-50 p-2 rounded text-sm font-mono text-green-800">
                        {opt.after}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Expected Improvement: <span className="font-medium text-green-600">{opt.estimatedImprovement}%</span></span>
                  <span className="text-gray-600">Effort: <span className="font-medium">{opt.effort}</span></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Render alerts
  const renderAlerts = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Performance Alerts</h3>
      
      {performanceReport?.alerts && performanceReport.alerts.length > 0 ? (
        <div className="space-y-4">
          {performanceReport.alerts.map((alert) => (
            <div key={alert.id} className={`p-4 border-l-4 rounded-lg ${
              alert.severity === 'critical' ? 'border-red-400 bg-red-50' :
              alert.severity === 'error' ? 'border-orange-400 bg-orange-50' :
              alert.severity === 'warning' ? 'border-yellow-400 bg-yellow-50' :
              'border-blue-400 bg-blue-50'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start">
                  {alert.severity === 'critical' ? (
                    <XCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3" />
                  ) : alert.severity === 'error' ? (
                    <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 mr-3" />
                  ) : alert.severity === 'warning' ? (
                    <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 mr-3" />
                  ) : (
                    <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-3" />
                  )}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{alert.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
                    {alert.query && (
                      <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono">
                        {alert.query.length > 100 ? `${alert.query.substring(0, 100)}...` : alert.query}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {alert.currentValue} {alert.metric.replace('_', ' ')}
                  </div>
                  {alert.threshold && (
                    <div className="text-xs text-gray-500">
                      Threshold: {alert.threshold}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-3 p-3 bg-blue-50 rounded">
                <p className="text-sm text-blue-800">
                  <strong>Action Required:</strong> {alert.actionRequired}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
          <p>No performance alerts.</p>
          <p className="text-sm mt-2">Your system is performing well!</p>
        </div>
      )}
    </div>
  );

  if (!schema) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Database className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Schema Available</h3>
          <p className="text-gray-500">Please load a schema to start query optimization.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Query Optimization</h1>
            <p className="text-sm text-gray-500 mt-1">
              Analyze query performance and get optimization recommendations
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
            
            <button
              onClick={generatePerformanceReport}
              disabled={isGeneratingReport}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
            >
              <BarChart3 className={`w-4 h-4 mr-2 ${isGeneratingReport ? 'animate-pulse' : ''}`} />
              {isGeneratingReport ? 'Generating...' : 'Generate Report'}
            </button>
            
            {performanceReport && (
              <button
                onClick={exportReport}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4">
          <nav className="flex space-x-8">
            {[
              { id: 'analyzer', label: 'Query Analyzer', icon: Zap },
              { id: 'performance', label: 'Performance', icon: BarChart3 },
              { id: 'recommendations', label: 'Recommendations', icon: Lightbulb },
              { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
              { id: 'reports', label: 'Reports', icon: FileText }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'analyzer' && renderAnalyzer()}
        {activeTab === 'performance' && renderPerformance()}
        {activeTab === 'recommendations' && renderRecommendations()}
        {activeTab === 'alerts' && renderAlerts()}
        {activeTab === 'reports' && (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Performance reports will be available here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
