// Enhanced Cache Manager for QueryFlow
// Provides intelligent caching with multiple storage strategies and automatic cleanup

export interface CacheConfig {
  maxSize: number; // bytes
  maxEntries: number;
  ttl: number; // milliseconds
  cleanupInterval: number; // milliseconds
  storageStrategy: 'memory' | 'localStorage' | 'indexedDB' | 'hybrid';
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
}

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  size: number;
  timestamp: number;
  lastAccessed: number;
  accessCount: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  ttl: number;
  compressed?: boolean;
  encrypted?: boolean;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  averageAccessTime: number;
  memoryUsage: number;
  storageUsage: number;
}

export class EnhancedCacheManager {
  private static instance: EnhancedCacheManager;
  private memoryCache = new Map<string, CacheEntry>();
  private config: CacheConfig = {
    maxSize: 50 * 1024 * 1024, // 50MB
    maxEntries: 10000,
    ttl: 30 * 60 * 1000, // 30 minutes
    cleanupInterval: 5 * 60 * 1000, // 5 minutes
    storageStrategy: 'hybrid',
    compressionEnabled: true,
    encryptionEnabled: false
  };
  private stats = {
    hits: 0,
    misses: 0,
    totalAccessTime: 0,
    lastCleanup: Date.now()
  };
  private cleanupTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;

  private constructor() {
    this.initialize();
  }

  static getInstance(): EnhancedCacheManager {
    if (!EnhancedCacheManager.instance) {
      EnhancedCacheManager.instance = new EnhancedCacheManager();
    }
    return EnhancedCacheManager.instance;
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize IndexedDB if using hybrid or IndexedDB strategy
      if (this.config.storageStrategy === 'indexedDB' || this.config.storageStrategy === 'hybrid') {
        await this.initializeIndexedDB();
      }

      // Start cleanup timer
      this.startCleanupTimer();

      // Load existing cache from storage
      await this.loadFromStorage();

      this.isInitialized = true;
      console.log('Enhanced cache manager initialized');
    } catch (error) {
      console.error('Failed to initialize cache manager:', error);
      this.isInitialized = false;
    }
  }

  private async initializeIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('QueryFlowCache', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }
      };
    });
  }

  private db: IDBDatabase | null = null;

  // Set cache entry
  async set<T>(key: string, value: T, options: {
    ttl?: number;
    priority?: CacheEntry['priority'];
    compress?: boolean;
    encrypt?: boolean;
  } = {}): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const ttl = options.ttl || this.config.ttl;
    const priority = options.priority || 'medium';
    const compress = options.compress ?? this.config.compressionEnabled;
    const encrypt = options.encrypt ?? this.config.encryptionEnabled;

    let processedValue = value;
    let size = this.calculateSize(value);
    let compressed = false;
    let encrypted = false;

    // Compress if enabled and beneficial
    if (compress && size > 1024) {
      try {
        processedValue = await this.compress(value);
        compressed = true;
        size = this.calculateSize(processedValue);
      } catch (error) {
        console.warn('Compression failed, storing uncompressed:', error);
      }
    }

    // Encrypt if enabled
    if (encrypt) {
      try {
        processedValue = await this.encrypt(processedValue);
        encrypted = true;
      } catch (error) {
        console.warn('Encryption failed, storing unencrypted:', error);
      }
    }

    const entry: CacheEntry<T> = {
      key,
      value: processedValue,
      size,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 1,
      priority,
      ttl,
      compressed,
      encrypted
    };

    // Store in memory cache
    this.memoryCache.set(key, entry);

    // Store in persistent storage if needed
    if (this.config.storageStrategy === 'localStorage' || this.config.storageStrategy === 'hybrid') {
      await this.storeInLocalStorage(entry);
    }

    if (this.config.storageStrategy === 'indexedDB' || this.config.storageStrategy === 'hybrid') {
      await this.storeInIndexedDB(entry);
    }

    // Check if we need to evict entries
    await this.evictIfNeeded();
  }

  // Get cache entry
  async get<T>(key: string): Promise<T | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    let entry = this.memoryCache.get(key);

    // If not in memory cache, try persistent storage
    if (!entry) {
      if (this.config.storageStrategy === 'localStorage' || this.config.storageStrategy === 'hybrid') {
        entry = await this.getFromLocalStorage(key);
      }
      if (!entry && (this.config.storageStrategy === 'indexedDB' || this.config.storageStrategy === 'hybrid')) {
        entry = await this.getFromIndexedDB(key);
      }
    }

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      await this.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access statistics
    entry.lastAccessed = Date.now();
    entry.accessCount++;

    // Process value
    let value = entry.value;

    // Decrypt if needed
    if (entry.encrypted) {
      try {
        value = await this.decrypt(value);
      } catch (error) {
        console.error('Decryption failed:', error);
        await this.delete(key);
        this.stats.misses++;
        return null;
      }
    }

    // Decompress if needed
    if (entry.compressed) {
      try {
        value = await this.decompress(value);
      } catch (error) {
        console.error('Decompression failed:', error);
        await this.delete(key);
        this.stats.misses++;
        return null;
      }
    }

    // Update stats
    this.stats.hits++;
    this.stats.totalAccessTime += Date.now() - startTime;

    // Move to memory cache if not already there
    if (!this.memoryCache.has(key)) {
      this.memoryCache.set(key, entry);
    }

    return value as T;
  }

  // Delete cache entry
  async delete(key: string): Promise<boolean> {
    const deleted = this.memoryCache.delete(key);
    
    if (this.config.storageStrategy === 'localStorage' || this.config.storageStrategy === 'hybrid') {
      localStorage.removeItem(`cache_${key}`);
    }

    if (this.config.storageStrategy === 'indexedDB' || this.config.storageStrategy === 'hybrid') {
      await this.deleteFromIndexedDB(key);
    }

    return deleted;
  }

  // Clear all cache
  async clear(): Promise<void> {
    this.memoryCache.clear();
    
    if (this.config.storageStrategy === 'localStorage' || this.config.storageStrategy === 'hybrid') {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('cache_'));
      keys.forEach(key => localStorage.removeItem(key));
    }

    if (this.config.storageStrategy === 'indexedDB' || this.config.storageStrategy === 'hybrid') {
      await this.clearIndexedDB();
    }

    this.stats = { hits: 0, misses: 0, totalAccessTime: 0, lastCleanup: Date.now() };
  }

  // Get cache statistics
  getStats(): CacheStats {
    const totalEntries = this.memoryCache.size;
    const totalSize = Array.from(this.memoryCache.values()).reduce((sum, entry) => sum + entry.size, 0);
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;
    const missRate = totalRequests > 0 ? (this.stats.misses / totalRequests) * 100 : 0;
    const averageAccessTime = this.stats.hits > 0 ? this.stats.totalAccessTime / this.stats.hits : 0;

    return {
      totalEntries,
      totalSize,
      hitRate,
      missRate,
      averageAccessTime,
      memoryUsage: totalSize,
      storageUsage: totalSize // Simplified for now
    };
  }

  // Update configuration
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Private helper methods
  private calculateSize(obj: any): number {
    if (obj === null || obj === undefined) return 0;
    
    if (typeof obj === 'string') return obj.length * 2;
    if (typeof obj === 'number') return 8;
    if (typeof obj === 'boolean') return 4;
    
    if (Array.isArray(obj)) {
      return obj.reduce((size, item) => size + this.calculateSize(item), 0);
    }
    
    if (typeof obj === 'object') {
      let size = 0;
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          size += key.length * 2;
          size += this.calculateSize(obj[key]);
        }
      }
      return size;
    }
    
    return 0;
  }

  private async compress(data: any): Promise<any> {
    // Simple compression using JSON stringify/parse
    // In a real implementation, you'd use a proper compression library
    const jsonString = JSON.stringify(data);
    return btoa(jsonString); // Base64 encoding as simple compression
  }

  private async decompress(data: any): Promise<any> {
    try {
      const jsonString = atob(data);
      return JSON.parse(jsonString);
    } catch (error) {
      throw new Error('Decompression failed');
    }
  }

  private async encrypt(data: any): Promise<any> {
    // Simple encryption using btoa (not secure, just for demonstration)
    // In a real implementation, you'd use proper encryption
    return btoa(JSON.stringify(data));
  }

  private async decrypt(data: any): Promise<any> {
    try {
      const jsonString = atob(data);
      return JSON.parse(jsonString);
    } catch (error) {
      throw new Error('Decryption failed');
    }
  }

  private async storeInLocalStorage(entry: CacheEntry): Promise<void> {
    try {
      localStorage.setItem(`cache_${entry.key}`, JSON.stringify(entry));
    } catch (error) {
      console.warn('Failed to store in localStorage:', error);
    }
  }

  private async getFromLocalStorage(key: string): Promise<CacheEntry | null> {
    try {
      const stored = localStorage.getItem(`cache_${key}`);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Failed to get from localStorage:', error);
      return null;
    }
  }

  private async storeInIndexedDB(entry: CacheEntry): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.put(entry);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getFromIndexedDB(key: string): Promise<CacheEntry | null> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.get(key);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  private async deleteFromIndexedDB(key: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.delete(key);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async clearIndexedDB(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async loadFromStorage(): Promise<void> {
    // Load frequently accessed items from persistent storage to memory
    if (this.config.storageStrategy === 'localStorage' || this.config.storageStrategy === 'hybrid') {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('cache_'));
      for (const key of keys.slice(0, 100)) { // Load first 100 items
        const entry = await this.getFromLocalStorage(key.replace('cache_', ''));
        if (entry && entry.priority === 'high' || entry.priority === 'critical') {
          this.memoryCache.set(entry.key, entry);
        }
      }
    }
  }

  private async evictIfNeeded(): Promise<void> {
    const stats = this.getStats();
    
    if (stats.totalSize > this.config.maxSize || stats.totalEntries > this.config.maxEntries) {
      await this.evictEntries();
    }
  }

  private async evictEntries(): Promise<void> {
    const entries = Array.from(this.memoryCache.values());
    
    // Sort by priority and last accessed time
    entries.sort((a, b) => {
      const priorityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.lastAccessed - b.lastAccessed;
    });

    // Remove lowest priority and oldest entries
    const toRemove = Math.ceil(entries.length * 0.2); // Remove 20%
    for (let i = 0; i < toRemove; i++) {
      const entry = entries[i];
      await this.delete(entry.key);
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, this.config.cleanupInterval);
  }

  private async performCleanup(): Promise<void> {
    const now = Date.now();
    const entriesToDelete: string[] = [];

    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        entriesToDelete.push(key);
      }
    }

    for (const key of entriesToDelete) {
      await this.delete(key);
    }

    this.stats.lastCleanup = now;
  }

  // Cleanup on page unload
  cleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Export singleton instance
export const enhancedCacheManager = EnhancedCacheManager.getInstance();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    enhancedCacheManager.cleanup();
  });
}
