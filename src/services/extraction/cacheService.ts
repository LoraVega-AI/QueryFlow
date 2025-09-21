// Cache Service
// Manages caching for AST parsing and extraction results

import {
  CacheEntry,
  CacheOptions,
  FileInfo
} from '@/types/extraction';

export class CacheService {
  private cache: Map<string, CacheEntry> = new Map();
  private options: CacheOptions;
  private hits = 0;
  private misses = 0;

  constructor(options?: Partial<CacheOptions>) {
    this.options = {
      maxSize: 1000, // Maximum number of entries
      maxAge: 3600000, // 1 hour in milliseconds
      enableCompression: false, // Would compress large entries
      enablePersistence: false, // Would persist to disk
      evictionPolicy: 'lru',
      ...options
    };
  }

  /**
   * Get cached entry
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Update access time for LRU
    entry.lastAccessed = new Date();
    entry.hits++;
    this.hits++;

    return entry.value as T;
  }

  /**
   * Set cache entry
   */
  set<T>(key: string, value: T): void {
    // Check if we need to evict entries
    if (this.cache.size >= this.options.maxSize) {
      this.evictEntries();
    }

    const entry: CacheEntry = {
      key,
      value,
      createdAt: new Date(),
      lastAccessed: new Date(),
      hits: 0,
      size: this.calculateSize(value)
    };

    this.cache.set(key, entry);
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry !== undefined && !this.isExpired(entry);
  }

  /**
   * Delete cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   */
  getStatistics(): {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
    totalSize: number;
    oldestEntry?: Date;
    newestEntry?: Date;
  } {
    const entries = Array.from(this.cache.values());
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    const oldestEntry = entries.reduce((oldest, entry) => 
      !oldest || entry.createdAt < oldest ? entry.createdAt : oldest, null as Date | null);
    const newestEntry = entries.reduce((newest, entry) => 
      !newest || entry.createdAt > newest ? entry.createdAt : newest, null as Date | null);

    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0;

    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      totalSize,
      oldestEntry: oldestEntry || undefined,
      newestEntry: newestEntry || undefined
    };
  }

  /**
   * Get or compute cached value
   */
  async getOrSet<T>(
    key: string,
    computeFn: () => Promise<T> | T
  ): Promise<T> {
    // Try to get from cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Compute value and cache it
    const value = await computeFn();
    this.set(key, value);
    return value;
  }

  /**
   * Generate cache key for file content
   */
  generateFileKey(file: FileInfo, type: 'ast' | 'extraction' | 'validation'): string {
    return `${type}:${file.hash}:${file.language}:${file.framework || 'none'}`;
  }

  /**
   * Generate cache key for extraction candidate
   */
  generateCandidateKey(candidate: any): string {
    const contentHash = this.hashString(candidate.content);
    return `candidate:${contentHash}:${candidate.framework}:${candidate.type}`;
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    let removed = 0;
    const now = new Date();

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry, now)) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Get cache size in bytes (approximate)
   */
  getCacheSize(): number {
    return Array.from(this.cache.values())
      .reduce((total, entry) => total + entry.size, 0);
  }

  /**
   * Export cache for persistence
   */
  export(): string {
    const exportData = {
      entries: Array.from(this.cache.entries()),
      stats: {
        hits: this.hits,
        misses: this.misses
      },
      timestamp: new Date().toISOString()
    };

    return JSON.stringify(exportData);
  }

  /**
   * Import cache from persistence
   */
  import(data: string): void {
    try {
      const importData = JSON.parse(data);
      
      this.cache.clear();
      
      for (const [key, entry] of importData.entries) {
        // Only import non-expired entries
        if (!this.isExpired(entry)) {
          this.cache.set(key, entry);
        }
      }

      if (importData.stats) {
        this.hits = importData.stats.hits || 0;
        this.misses = importData.stats.misses || 0;
      }

    } catch (error) {
      console.warn('Failed to import cache data:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Private methods

  /**
   * Check if cache entry has expired
   */
  private isExpired(entry: CacheEntry, now?: Date): boolean {
    const currentTime = now || new Date();
    const age = currentTime.getTime() - entry.createdAt.getTime();
    return age > this.options.maxAge;
  }

  /**
   * Evict cache entries based on policy
   */
  private evictEntries(): void {
    const entriesToRemove = Math.ceil(this.options.maxSize * 0.1); // Remove 10%

    switch (this.options.evictionPolicy) {
      case 'lru':
        this.evictLRU(entriesToRemove);
        break;
      case 'lfu':
        this.evictLFU(entriesToRemove);
        break;
      case 'ttl':
        this.evictExpired();
        break;
      default:
        this.evictLRU(entriesToRemove);
    }
  }

  /**
   * Evict least recently used entries
   */
  private evictLRU(count: number): void {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.lastAccessed.getTime() - b.lastAccessed.getTime());

    for (let i = 0; i < Math.min(count, entries.length); i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  /**
   * Evict least frequently used entries
   */
  private evictLFU(count: number): void {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.hits - b.hits);

    for (let i = 0; i < Math.min(count, entries.length); i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  /**
   * Evict expired entries
   */
  private evictExpired(): void {
    const now = new Date();
    
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry, now)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Calculate approximate size of cached value
   */
  private calculateSize(value: any): number {
    try {
      // Rough approximation of memory usage
      const jsonString = JSON.stringify(value);
      return jsonString.length * 2; // Assume 2 bytes per character
    } catch (error) {
      // Fallback for non-serializable objects
      return 1000; // Default size estimate
    }
  }

  /**
   * Generate hash for string content
   */
  private hashString(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }
}
