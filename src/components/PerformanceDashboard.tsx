'use client';

// Performance Dashboard Component
// Provides real-time monitoring of application performance metrics

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, 
  Memory, 
  Cpu, 
  Database, 
  Zap, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Settings,
  BarChart3
} from 'lucide-react';
import { memoryManager } from '../utils/memoryManager';
import { enhancedCacheManager } from '../utils/enhancedCacheManager';
import { workerManager } from '../utils/workerManager';

interface PerformanceMetrics {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cache: {
    hitRate: number;
    totalEntries: number;
    totalSize: number;
  };
  workers: {
    activeTasks: number;
    queuedTasks: number;
    totalWorkers: number;
  };
  rendering: {
    averageRenderTime: number;
    renderCount: number;
  };
}

export function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(1000);
  const [showDetails, setShowDetails] = useState(false);

  const updateMetrics = useCallback(() => {
    const memoryStats = memoryManager.getMemoryStats();
    const cacheStats = enhancedCacheManager.getStats();
    const workerStats = workerManager.getStats();

    setMetrics({
      memory: {
        used: memoryStats.used,
        total: memoryStats.total,
        percentage: memoryStats.percentage
      },
      cache: {
        hitRate: cacheStats.hitRate,
        totalEntries: cacheStats.totalEntries,
        totalSize: cacheStats.totalSize
      },
      workers: {
        activeTasks: workerStats.activeTasks,
        queuedTasks: workerStats.queuedTasks,
        totalWorkers: workerStats.totalWorkers
      },
      rendering: {
        averageRenderTime: 0, // Would be populated by performance monitoring
        renderCount: 0
      }
    });
  }, []);

  useEffect(() => {
    if (isMonitoring) {
      updateMetrics();
      const interval = setInterval(updateMetrics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [isMonitoring, refreshInterval, updateMetrics]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  const getMemoryStatus = (percentage: number): 'good' | 'warning' | 'critical' => {
    if (percentage < 70) return 'good';
    if (percentage < 85) return 'warning';
    return 'critical';
  };

  const getCacheStatus = (hitRate: number): 'good' | 'warning' | 'critical' => {
    if (hitRate > 80) return 'good';
    if (hitRate > 60) return 'warning';
    return 'critical';
  };

  if (!metrics) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="w-6 h-6 animate-spin text-orange-400" />
          <span className="ml-2 text-gray-300">Loading performance metrics...</span>
        </div>
      </div>
    );
  }

  const memoryStatus = getMemoryStatus(metrics.memory.percentage);
  const cacheStatus = getCacheStatus(metrics.cache.hitRate);

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <BarChart3 className="w-6 h-6 text-orange-400" />
          <h3 className="text-lg font-semibold text-white">Performance Dashboard</h3>
          {isMonitoring && (
            <div className="flex items-center space-x-2 text-green-400">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm">Live</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMonitoring(!isMonitoring)}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              isMonitoring
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isMonitoring ? 'Stop' : 'Start'} Monitoring
          </button>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Toggle details"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Memory Usage */}
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Memory className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-medium text-gray-300">Memory Usage</span>
            </div>
            <div className={`w-3 h-3 rounded-full ${
              memoryStatus === 'good' ? 'bg-green-400' :
              memoryStatus === 'warning' ? 'bg-yellow-400' : 'bg-red-400'
            }`} />
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {formatPercentage(metrics.memory.percentage)}
          </div>
          <div className="text-sm text-gray-400">
            {formatBytes(metrics.memory.used)} / {formatBytes(metrics.memory.total)}
          </div>
          <div className="mt-2 bg-gray-600 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                memoryStatus === 'good' ? 'bg-green-400' :
                memoryStatus === 'warning' ? 'bg-yellow-400' : 'bg-red-400'
              }`}
              style={{ width: `${Math.min(metrics.memory.percentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Cache Performance */}
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Database className="w-5 h-5 text-green-400" />
              <span className="text-sm font-medium text-gray-300">Cache Hit Rate</span>
            </div>
            <div className={`w-3 h-3 rounded-full ${
              cacheStatus === 'good' ? 'bg-green-400' :
              cacheStatus === 'warning' ? 'bg-yellow-400' : 'bg-red-400'
            }`} />
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {formatPercentage(metrics.cache.hitRate)}
          </div>
          <div className="text-sm text-gray-400">
            {metrics.cache.totalEntries.toLocaleString()} entries
          </div>
          <div className="mt-2 bg-gray-600 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                cacheStatus === 'good' ? 'bg-green-400' :
                cacheStatus === 'warning' ? 'bg-yellow-400' : 'bg-red-400'
              }`}
              style={{ width: `${Math.min(metrics.cache.hitRate, 100)}%` }}
            />
          </div>
        </div>

        {/* Web Workers */}
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Cpu className="w-5 h-5 text-purple-400" />
              <span className="text-sm font-medium text-gray-300">Web Workers</span>
            </div>
            <div className={`w-3 h-3 rounded-full ${
              metrics.workers.activeTasks > 0 ? 'bg-green-400' : 'bg-gray-400'
            }`} />
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {metrics.workers.activeTasks}
          </div>
          <div className="text-sm text-gray-400">
            {metrics.workers.queuedTasks} queued, {metrics.workers.totalWorkers} total
          </div>
        </div>

        {/* Cache Size */}
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-orange-400" />
              <span className="text-sm font-medium text-gray-300">Cache Size</span>
            </div>
            <div className="w-3 h-3 rounded-full bg-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {formatBytes(metrics.cache.totalSize)}
          </div>
          <div className="text-sm text-gray-400">
            {metrics.cache.totalEntries.toLocaleString()} entries
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      {showDetails && (
        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-white mb-4">Detailed Metrics</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h5 className="text-sm font-medium text-gray-300 mb-2">Memory Details</h5>
              <div className="space-y-1 text-sm text-gray-400">
                <div>Used: {formatBytes(metrics.memory.used)}</div>
                <div>Total: {formatBytes(metrics.memory.total)}</div>
                <div>Available: {formatBytes(metrics.memory.total - metrics.memory.used)}</div>
              </div>
            </div>
            <div>
              <h5 className="text-sm font-medium text-gray-300 mb-2">Cache Details</h5>
              <div className="space-y-1 text-sm text-gray-400">
                <div>Hit Rate: {formatPercentage(metrics.cache.hitRate)}</div>
                <div>Miss Rate: {formatPercentage(100 - metrics.cache.hitRate)}</div>
                <div>Average Access Time: {metrics.cache.averageAccessTime.toFixed(2)}ms</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Alerts */}
      <div className="mt-4 space-y-2">
        {memoryStatus === 'critical' && (
          <div className="flex items-center space-x-2 p-3 bg-red-900 border border-red-700 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="text-red-200">High memory usage detected. Consider clearing cache or reducing data load.</span>
          </div>
        )}
        {cacheStatus === 'critical' && (
          <div className="flex items-center space-x-2 p-3 bg-yellow-900 border border-yellow-700 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <span className="text-yellow-200">Low cache hit rate. Consider adjusting cache strategy.</span>
          </div>
        )}
        {memoryStatus === 'good' && cacheStatus === 'good' && (
          <div className="flex items-center space-x-2 p-3 bg-green-900 border border-green-700 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-green-200">All performance metrics are within normal ranges.</span>
          </div>
        )}
      </div>

      {/* Refresh Interval Control */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-300">Refresh Interval:</label>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="bg-gray-700 text-white rounded px-2 py-1 text-sm"
          >
            <option value={500}>0.5s</option>
            <option value={1000}>1s</option>
            <option value={2000}>2s</option>
            <option value={5000}>5s</option>
          </select>
        </div>
        <button
          onClick={updateMetrics}
          className="flex items-center space-x-1 px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-500 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>
    </div>
  );
}
