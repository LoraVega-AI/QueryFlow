// Performance Integration Module
// Integrates all performance optimizations and provides a unified API

import { memoryManager } from './memoryManager';
import { enhancedCacheManager } from './enhancedCacheManager';
import { workerManager, WorkerManager } from './workerManager';

export interface PerformanceConfig {
  enableMemoryManagement: boolean;
  enableCaching: boolean;
  enableWebWorkers: boolean;
  enableVirtualization: boolean;
  memoryThreshold: number;
  cacheSize: number;
  workerCount: number;
}

export class PerformanceIntegration {
  private static instance: PerformanceIntegration;
  private config: PerformanceConfig = {
    enableMemoryManagement: true,
    enableCaching: true,
    enableWebWorkers: true,
    enableVirtualization: true,
    memoryThreshold: 80,
    cacheSize: 50 * 1024 * 1024, // 50MB
    workerCount: navigator.hardwareConcurrency || 4
  };
  private isInitialized = false;

  private constructor() {
    this.initialize();
  }

  static getInstance(): PerformanceIntegration {
    if (!PerformanceIntegration.instance) {
      PerformanceIntegration.instance = new PerformanceIntegration();
    }
    return PerformanceIntegration.instance;
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize memory management
      if (this.config.enableMemoryManagement) {
        memoryManager.startMonitoring();
        console.log('Memory management initialized');
      }

      // Initialize caching
      if (this.config.enableCaching) {
        enhancedCacheManager.updateConfig({
          maxSize: this.config.cacheSize,
          storageStrategy: 'hybrid'
        });
        console.log('Enhanced caching initialized');
      }

      // Initialize Web Workers
      if (this.config.enableWebWorkers && WorkerManager.isSupported()) {
        await workerManager.initialize();
        console.log('Web Workers initialized');
      }

      this.isInitialized = true;
      console.log('Performance integration initialized successfully');
    } catch (error) {
      console.error('Failed to initialize performance integration:', error);
    }
  }

  // Update configuration
  updateConfig(newConfig: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Apply configuration changes
    if (this.config.enableMemoryManagement) {
      memoryManager.updateThresholds({
        warning: this.config.memoryThreshold * 0.8,
        critical: this.config.memoryThreshold,
        maxCacheSize: this.config.cacheSize,
        maxHistorySize: 10000,
        cleanupInterval: 30000
      });
    }

    if (this.config.enableCaching) {
      enhancedCacheManager.updateConfig({
        maxSize: this.config.cacheSize,
        storageStrategy: 'hybrid'
      });
    }

    if (this.config.enableWebWorkers) {
      workerManager.updateConfig({
        maxWorkers: this.config.workerCount,
        taskTimeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000
      });
    }
  }

  // Get current configuration
  getConfig(): PerformanceConfig {
    return { ...this.config };
  }

  // Get performance statistics
  getPerformanceStats(): {
    memory: any;
    cache: any;
    workers: any;
    isInitialized: boolean;
  } {
    return {
      memory: memoryManager.getMemoryStats(),
      cache: enhancedCacheManager.getStats(),
      workers: workerManager.getStats(),
      isInitialized: this.isInitialized
    };
  }

  // Perform cleanup
  async performCleanup(): Promise<void> {
    try {
      // Cleanup memory
      if (this.config.enableMemoryManagement) {
        await memoryManager.performCleanup();
      }

      // Cleanup cache
      if (this.config.enableCaching) {
        await enhancedCacheManager.clear();
      }

      // Cleanup workers
      if (this.config.enableWebWorkers) {
        workerManager.cleanup();
      }

      console.log('Performance cleanup completed');
    } catch (error) {
      console.error('Performance cleanup failed:', error);
    }
  }

  // Check if performance optimizations are available
  isOptimizationAvailable(type: 'memory' | 'cache' | 'workers' | 'virtualization'): boolean {
    switch (type) {
      case 'memory':
        return this.config.enableMemoryManagement && typeof performance !== 'undefined' && 'memory' in performance;
      case 'cache':
        return this.config.enableCaching && typeof localStorage !== 'undefined';
      case 'workers':
        return this.config.enableWebWorkers && workerManager.isSupported();
      case 'virtualization':
        return this.config.enableVirtualization;
      default:
        return false;
    }
  }

  // Get optimization recommendations
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    const stats = this.getPerformanceStats();

    // Memory recommendations
    if (stats.memory.percentage > 85) {
      recommendations.push('High memory usage detected. Consider reducing data load or enabling more aggressive cleanup.');
    }

    // Cache recommendations
    if (stats.cache.hitRate < 60) {
      recommendations.push('Low cache hit rate. Consider adjusting cache strategy or increasing cache size.');
    }

    // Worker recommendations
    if (stats.workers.activeTasks > stats.workers.totalWorkers * 0.8) {
      recommendations.push('High worker utilization. Consider increasing worker count or optimizing task distribution.');
    }

    return recommendations;
  }

  // Cleanup on page unload
  cleanup(): void {
    if (this.config.enableMemoryManagement) {
      memoryManager.cleanup();
    }

    if (this.config.enableCaching) {
      enhancedCacheManager.cleanup();
    }

    if (this.config.enableWebWorkers) {
      workerManager.cleanup();
    }

    this.isInitialized = false;
  }
}

// Export singleton instance
export const performanceIntegration = PerformanceIntegration.getInstance();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    performanceIntegration.cleanup();
  });
}
