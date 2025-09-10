// Advanced Memory Management System for QueryFlow
// Handles memory optimization, cleanup strategies, and resource monitoring

export interface MemoryStats {
  used: number;
  total: number;
  percentage: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
}

export interface MemoryThresholds {
  warning: number; // percentage
  critical: number; // percentage
  maxCacheSize: number; // bytes
  maxHistorySize: number; // items
  cleanupInterval: number; // milliseconds
}

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  size: number;
  timestamp: number;
  lastAccessed: number;
  accessCount: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface MemoryCleanupStrategy {
  name: string;
  priority: number;
  condition: (stats: MemoryStats) => boolean;
  action: () => Promise<number>; // returns bytes freed
  description: string;
}

export class MemoryManager {
  private static instance: MemoryManager;
  private cache = new Map<string, CacheEntry>();
  private memoryThresholds: MemoryThresholds = {
    warning: 70,
    critical: 85,
    maxCacheSize: 50 * 1024 * 1024, // 50MB
    maxHistorySize: 10000,
    cleanupInterval: 30000 // 30 seconds
  };
  private cleanupTimer: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private eventListeners = new Map<string, Array<(data: any) => void>>();
  private cleanupStrategies: MemoryCleanupStrategy[] = [];

  private constructor() {
    this.initializeCleanupStrategies();
    this.startMonitoring();
  }

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  private initializeCleanupStrategies(): void {
    this.cleanupStrategies = [
      {
        name: 'Clear Old Cache Entries',
        priority: 1,
        condition: (stats) => stats.percentage > this.memoryThresholds.warning,
        action: async () => this.clearOldCacheEntries(),
        description: 'Remove cache entries older than 1 hour'
      },
      {
        name: 'Clear Low Priority Cache',
        priority: 2,
        condition: (stats) => stats.percentage > this.memoryThresholds.warning,
        action: async () => this.clearLowPriorityCache(),
        description: 'Remove low priority cache entries'
      },
      {
        name: 'Clear Search History',
        priority: 3,
        condition: (stats) => stats.percentage > this.memoryThresholds.critical,
        action: async () => this.clearSearchHistory(),
        description: 'Clear old search history entries'
      },
      {
        name: 'Clear Large Objects',
        priority: 4,
        condition: (stats) => stats.percentage > this.memoryThresholds.critical,
        action: async () => this.clearLargeObjects(),
        description: 'Remove large cached objects'
      },
      {
        name: 'Force Garbage Collection',
        priority: 5,
        condition: (stats) => stats.percentage > this.memoryThresholds.critical,
        action: async () => this.forceGarbageCollection(),
        description: 'Trigger garbage collection'
      }
    ];
  }

  // Get current memory statistics
  getMemoryStats(): MemoryStats {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
        heapUsed: memory.usedJSHeapSize,
        heapTotal: memory.totalJSHeapSize,
        external: memory.jsHeapSizeLimit - memory.totalJSHeapSize,
        arrayBuffers: 0 // Not available in all browsers
      };
    }

    // Fallback estimation
    const estimatedUsed = this.estimateMemoryUsage();
    return {
      used: estimatedUsed,
      total: estimatedUsed * 1.5, // Rough estimation
      percentage: 50, // Conservative estimate
      heapUsed: estimatedUsed,
      heapTotal: estimatedUsed * 1.5,
      external: 0,
      arrayBuffers: 0
    };
  }

  // Estimate memory usage based on cache and stored data
  private estimateMemoryUsage(): number {
    let totalSize = 0;

    // Calculate cache size
    for (const entry of this.cache.values()) {
      totalSize += entry.size;
    }

    // Estimate localStorage usage
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('queryflow_')) {
          const value = localStorage.getItem(key);
          if (value) {
            totalSize += key.length * 2 + value.length * 2; // Rough estimation
          }
        }
      }
    } catch (error) {
      console.warn('Could not estimate localStorage usage:', error);
    }

    return totalSize;
  }

  // Cache management
  setCache<T>(key: string, value: T, priority: CacheEntry['priority'] = 'medium'): void {
    const size = this.calculateObjectSize(value);
    const now = Date.now();

    this.cache.set(key, {
      key,
      value,
      size,
      timestamp: now,
      lastAccessed: now,
      accessCount: 1,
      priority
    });

    this.checkMemoryThresholds();
  }

  getCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Update access statistics
    entry.lastAccessed = Date.now();
    entry.accessCount++;

    return entry.value as T;
  }

  deleteCache(key: string): boolean {
    return this.cache.delete(key);
  }

  clearCache(): number {
    const totalSize = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size, 0);
    this.cache.clear();
    return totalSize;
  }

  // Calculate approximate object size in bytes
  private calculateObjectSize(obj: any): number {
    if (obj === null || obj === undefined) return 0;
    
    if (typeof obj === 'string') return obj.length * 2;
    if (typeof obj === 'number') return 8;
    if (typeof obj === 'boolean') return 4;
    
    if (Array.isArray(obj)) {
      return obj.reduce((size, item) => size + this.calculateObjectSize(item), 0);
    }
    
    if (typeof obj === 'object') {
      let size = 0;
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          size += key.length * 2; // Key size
          size += this.calculateObjectSize(obj[key]);
        }
      }
      return size;
    }
    
    return 0;
  }

  // Memory monitoring
  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, this.memoryThresholds.cleanupInterval);

    console.log('Memory monitoring started');
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    console.log('Memory monitoring stopped');
  }

  // Check memory thresholds and trigger cleanup if needed
  private checkMemoryThresholds(): void {
    const stats = this.getMemoryStats();
    
    if (stats.percentage > this.memoryThresholds.critical) {
      this.emitEvent('memory_critical', stats);
      this.performCleanup();
    } else if (stats.percentage > this.memoryThresholds.warning) {
      this.emitEvent('memory_warning', stats);
    }
  }

  // Perform memory cleanup using strategies
  private async performCleanup(): Promise<void> {
    const stats = this.getMemoryStats();
    let totalFreed = 0;

    // Sort strategies by priority
    const sortedStrategies = [...this.cleanupStrategies].sort((a, b) => a.priority - b.priority);

    for (const strategy of sortedStrategies) {
      if (strategy.condition(stats)) {
        try {
          const freed = await strategy.action();
          totalFreed += freed;
          
          console.log(`Memory cleanup: ${strategy.name} freed ${this.formatBytes(freed)}`);
          
          // Check if we've freed enough memory
          const newStats = this.getMemoryStats();
          if (newStats.percentage < this.memoryThresholds.warning) {
            break;
          }
        } catch (error) {
          console.error(`Memory cleanup failed for ${strategy.name}:`, error);
        }
      }
    }

    if (totalFreed > 0) {
      this.emitEvent('memory_cleanup', { bytesFreed: totalFreed, strategies: sortedStrategies.length });
    }
  }

  // Cleanup strategies implementation
  private async clearOldCacheEntries(): Promise<number> {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    let freed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oneHourAgo && entry.priority !== 'critical') {
        freed += entry.size;
        this.cache.delete(key);
      }
    }

    return freed;
  }

  private async clearLowPriorityCache(): Promise<number> {
    let freed = 0;
    const lowPriorityEntries = Array.from(this.cache.entries())
      .filter(([_, entry]) => entry.priority === 'low')
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    // Remove oldest low priority entries
    const toRemove = Math.ceil(lowPriorityEntries.length * 0.3); // Remove 30%
    for (let i = 0; i < toRemove; i++) {
      const [key, entry] = lowPriorityEntries[i];
      freed += entry.size;
      this.cache.delete(key);
    }

    return freed;
  }

  private async clearSearchHistory(): Promise<number> {
    try {
      const historyKey = 'queryflow_search_history';
      const history = localStorage.getItem(historyKey);
      if (!history) return 0;

      const historyData = JSON.parse(history);
      const originalSize = history.length * 2; // Rough estimation

      // Keep only last 1000 entries
      const trimmedHistory = historyData.slice(-1000);
      localStorage.setItem(historyKey, JSON.stringify(trimmedHistory));

      return originalSize - (JSON.stringify(trimmedHistory).length * 2);
    } catch (error) {
      console.error('Failed to clear search history:', error);
      return 0;
    }
  }

  private async clearLargeObjects(): Promise<number> {
    let freed = 0;
    const largeEntries = Array.from(this.cache.entries())
      .filter(([_, entry]) => entry.size > 1024 * 1024) // > 1MB
      .sort((a, b) => b[1].size - a[1].size);

    // Remove largest entries
    const toRemove = Math.ceil(largeEntries.length * 0.5); // Remove 50% of large entries
    for (let i = 0; i < toRemove; i++) {
      const [key, entry] = largeEntries[i];
      freed += entry.size;
      this.cache.delete(key);
    }

    return freed;
  }

  private async forceGarbageCollection(): Promise<number> {
    // Force garbage collection if available
    if (typeof window !== 'undefined' && 'gc' in window) {
      (window as any).gc();
    }

    // Return estimated freed memory
    return 1024 * 1024; // 1MB estimation
  }

  // Update memory thresholds
  updateThresholds(thresholds: Partial<MemoryThresholds>): void {
    this.memoryThresholds = { ...this.memoryThresholds, ...thresholds };
  }

  // Get cache statistics
  getCacheStats(): {
    totalEntries: number;
    totalSize: number;
    averageSize: number;
    oldestEntry: number;
    newestEntry: number;
    priorityDistribution: Record<string, number>;
  } {
    const entries = Array.from(this.cache.values());
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    const timestamps = entries.map(entry => entry.timestamp);
    const priorityDistribution = entries.reduce((dist, entry) => {
      dist[entry.priority] = (dist[entry.priority] || 0) + 1;
      return dist;
    }, {} as Record<string, number>);

    return {
      totalEntries: entries.length,
      totalSize,
      averageSize: entries.length > 0 ? totalSize / entries.length : 0,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : 0,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : 0,
      priorityDistribution
    };
  }

  // Format bytes for display
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  // Cleanup on page unload
  cleanup(): void {
    this.stopMonitoring();
    this.clearCache();
    this.eventListeners.clear();
  }
}

// Export singleton instance
export const memoryManager = MemoryManager.getInstance();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    memoryManager.cleanup();
  });
}
