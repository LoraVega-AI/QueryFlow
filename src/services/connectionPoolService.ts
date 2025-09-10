// Connection Pool Service for QueryFlow
// Advanced connection pooling and resource management for database connections

export interface ConnectionPoolConfig {
  id: string;
  connectionId: string;
  minConnections: number;
  maxConnections: number;
  acquireTimeoutMs: number;
  idleTimeoutMs: number;
  maxLifetimeMs: number;
  testOnBorrow: boolean;
  testOnReturn: boolean;
  testWhileIdle: boolean;
  validationQuery?: string;
  validationInterval: number;
  evictionInterval: number;
  retryAttempts: number;
  retryDelay: number;
  healthCheckInterval: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PooledConnection {
  id: string;
  poolId: string;
  connectionId: string;
  status: 'idle' | 'active' | 'testing' | 'evicted' | 'error';
  createdAt: Date;
  lastUsed: Date;
  usageCount: number;
  errorCount: number;
  lastError?: string;
  testResults: TestResult[];
  metadata: {
    clientInfo?: any;
    sessionInfo?: any;
    transactionState?: 'none' | 'active' | 'committed' | 'rolled-back';
  };
}

export interface TestResult {
  timestamp: Date;
  type: 'borrow' | 'return' | 'idle' | 'health';
  success: boolean;
  responseTime: number;
  error?: string;
}

export interface PoolMetrics {
  poolId: string;
  timestamp: Date;
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  pendingAcquisitions: number;
  successfulAcquisitions: number;
  failedAcquisitions: number;
  timeouts: number;
  averageAcquisitionTime: number;
  averageUsageTime: number;
  connectionCreations: number;
  connectionDestructions: number;
  validationFailures: number;
  evictions: number;
  throughput: number; // operations per second
  errorRate: number; // percentage
}

export interface ResourceLimits {
  maxTotalMemory: number; // MB
  maxConnectionMemory: number; // MB per connection
  maxQueryTime: number; // seconds
  maxConcurrentQueries: number;
  maxResultSetSize: number; // MB
  maxCacheSize: number; // MB
  quotas: ResourceQuota[];
}

export interface ResourceQuota {
  type: 'daily' | 'hourly' | 'monthly';
  resource: 'queries' | 'data-transfer' | 'connections' | 'cpu-time';
  limit: number;
  used: number;
  resetAt: Date;
  enforced: boolean;
}

export interface LoadBalancingConfig {
  algorithm: 'round-robin' | 'least-connections' | 'weighted' | 'latency-based' | 'resource-based';
  weights?: Record<string, number>;
  healthCheckEnabled: boolean;
  failoverEnabled: boolean;
  stickySession: boolean;
  sessionTimeout: number;
}

export interface PoolAlert {
  id: string;
  poolId: string;
  type: 'resource-exhaustion' | 'high-latency' | 'connection-failure' | 'quota-exceeded' | 'health-check-failed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: Record<string, any>;
  triggeredAt: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;
  escalated: boolean;
}

export class ConnectionPoolService {
  private static pools: Map<string, ConnectionPoolConfig> = new Map();
  private static connections: Map<string, PooledConnection> = new Map();
  private static metrics: PoolMetrics[] = [];
  private static alerts: PoolAlert[] = [];
  private static resourceLimits: Map<string, ResourceLimits> = new Map();
  private static loadBalancers: Map<string, LoadBalancingConfig> = new Map();

  // Active monitoring
  private static metricsInterval: NodeJS.Timeout | null = null;
  private static healthCheckInterval: NodeJS.Timeout | null = null;
  private static evictionInterval: NodeJS.Timeout | null = null;

  static {
    this.startMonitoring();
  }

  /**
   * Create connection pool
   */
  static createPool(config: Omit<ConnectionPoolConfig, 'id' | 'createdAt' | 'updatedAt'>): ConnectionPoolConfig {
    const pool: ConnectionPoolConfig = {
      ...config,
      id: `pool_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.validatePoolConfig(pool);
    this.pools.set(pool.id, pool);

    // Initialize minimum connections if pool is enabled
    if (pool.enabled) {
      this.initializeMinConnections(pool.id);
    }

    return pool;
  }

  /**
   * Get pool configuration
   */
  static getPool(poolId: string): ConnectionPoolConfig | null {
    return this.pools.get(poolId) || null;
  }

  /**
   * Update pool configuration
   */
  static updatePool(poolId: string, updates: Partial<ConnectionPoolConfig>): ConnectionPoolConfig {
    const existing = this.pools.get(poolId);
    if (!existing) {
      throw new Error('Pool not found');
    }

    const updated: ConnectionPoolConfig = {
      ...existing,
      ...updates,
      id: poolId,
      updatedAt: new Date()
    };

    this.validatePoolConfig(updated);
    this.pools.set(poolId, updated);

    // Adjust pool size if needed
    this.adjustPoolSize(poolId);

    return updated;
  }

  /**
   * Delete pool
   */
  static async deletePool(poolId: string): Promise<void> {
    const pool = this.pools.get(poolId);
    if (!pool) {
      throw new Error('Pool not found');
    }

    // Close all connections in the pool
    const poolConnections = Array.from(this.connections.values())
      .filter(conn => conn.poolId === poolId);

    for (const connection of poolConnections) {
      await this.destroyConnection(connection.id);
    }

    this.pools.delete(poolId);
    this.resourceLimits.delete(poolId);
    this.loadBalancers.delete(poolId);
  }

  /**
   * Acquire connection from pool
   */
  static async acquireConnection(poolId: string, clientInfo?: any): Promise<PooledConnection> {
    const pool = this.pools.get(poolId);
    if (!pool) {
      throw new Error('Pool not found');
    }

    if (!pool.enabled) {
      throw new Error('Pool is disabled');
    }

    const startTime = Date.now();
    const timeoutAt = startTime + pool.acquireTimeoutMs;

    // Check resource limits
    await this.checkResourceLimits(poolId);

    while (Date.now() < timeoutAt) {
      // Try to get idle connection
      const idleConnection = this.getIdleConnection(poolId);
      if (idleConnection) {
        // Test connection if required
        if (pool.testOnBorrow) {
          const testResult = await this.testConnection(idleConnection);
          if (!testResult.success) {
            await this.destroyConnection(idleConnection.id);
            continue;
          }
        }

        // Mark as active
        idleConnection.status = 'active';
        idleConnection.lastUsed = new Date();
        idleConnection.usageCount++;
        idleConnection.metadata.clientInfo = clientInfo;

        this.recordMetric(poolId, 'successful-acquisition', Date.now() - startTime);
        return idleConnection;
      }

      // Try to create new connection if under max
      const activeConnections = this.getActiveConnectionCount(poolId);
      if (activeConnections < pool.maxConnections) {
        try {
          const newConnection = await this.createConnection(poolId, pool.connectionId);
          newConnection.status = 'active';
          newConnection.metadata.clientInfo = clientInfo;
          this.recordMetric(poolId, 'successful-acquisition', Date.now() - startTime);
          return newConnection;
        } catch (error) {
          this.recordMetric(poolId, 'failed-acquisition');
          // Continue to wait for available connection
        }
      }

      // Wait briefly before retrying
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Timeout occurred
    this.recordMetric(poolId, 'timeout');
    this.createAlert(poolId, 'resource-exhaustion', 'critical', 
      'Connection acquisition timeout', { timeoutMs: pool.acquireTimeoutMs });
    
    throw new Error(`Connection acquisition timeout after ${pool.acquireTimeoutMs}ms`);
  }

  /**
   * Release connection back to pool
   */
  static async releaseConnection(connectionId: string, error?: Error): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    const pool = this.pools.get(connection.poolId);
    if (!pool) {
      throw new Error('Pool not found');
    }

    // Handle connection error
    if (error) {
      connection.errorCount++;
      connection.lastError = error.message;
      
      // Destroy connection if too many errors
      if (connection.errorCount >= pool.retryAttempts) {
        await this.destroyConnection(connectionId);
        return;
      }
    }

    // Test connection if required
    if (pool.testOnReturn) {
      const testResult = await this.testConnection(connection);
      if (!testResult.success) {
        await this.destroyConnection(connectionId);
        return;
      }
    }

    // Reset connection state
    connection.status = 'idle';
    connection.lastUsed = new Date();
    connection.metadata.clientInfo = undefined;
    connection.metadata.transactionState = 'none';

    this.recordMetric(connection.poolId, 'connection-returned');
  }

  /**
   * Get pool metrics
   */
  static getPoolMetrics(poolId: string, timeRange?: { start: Date; end: Date }): PoolMetrics[] {
    let metrics = this.metrics.filter(m => m.poolId === poolId);

    if (timeRange) {
      metrics = metrics.filter(m => 
        m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
      );
    }

    return metrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get pool status
   */
  static getPoolStatus(poolId: string): {
    config: ConnectionPoolConfig;
    connections: PooledConnection[];
    metrics: PoolMetrics;
    alerts: PoolAlert[];
    resourceUsage: {
      memoryUsage: number;
      cpuUsage: number;
      networkUsage: number;
    };
  } {
    const config = this.pools.get(poolId);
    if (!config) {
      throw new Error('Pool not found');
    }

    const connections = Array.from(this.connections.values())
      .filter(conn => conn.poolId === poolId);

    const latestMetrics = this.metrics
      .filter(m => m.poolId === poolId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

    const alerts = this.alerts
      .filter(alert => alert.poolId === poolId && !alert.resolved)
      .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime());

    return {
      config,
      connections,
      metrics: latestMetrics || this.createEmptyMetrics(poolId),
      alerts,
      resourceUsage: this.calculateResourceUsage(poolId)
    };
  }

  /**
   * Configure resource limits
   */
  static setResourceLimits(poolId: string, limits: ResourceLimits): void {
    this.resourceLimits.set(poolId, limits);
  }

  /**
   * Configure load balancing
   */
  static setLoadBalancing(poolId: string, config: LoadBalancingConfig): void {
    this.loadBalancers.set(poolId, config);
  }

  /**
   * Get alerts
   */
  static getAlerts(poolId?: string, severity?: PoolAlert['severity']): PoolAlert[] {
    let alerts = this.alerts;

    if (poolId) {
      alerts = alerts.filter(alert => alert.poolId === poolId);
    }

    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }

    return alerts.sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime());
  }

  /**
   * Acknowledge alert
   */
  static acknowledgeAlert(alertId: string, userId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedBy = userId;
      alert.acknowledgedAt = new Date();
    }
  }

  /**
   * Health check for all pools
   */
  static async performHealthCheck(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [poolId, pool] of this.pools) {
      if (!pool.enabled) {
        results[poolId] = false;
        continue;
      }

      try {
        const connection = await this.acquireConnection(poolId);
        const testResult = await this.testConnection(connection);
        await this.releaseConnection(connection.id);
        results[poolId] = testResult.success;
      } catch (error) {
        results[poolId] = false;
        this.createAlert(poolId, 'health-check-failed', 'high',
          'Pool health check failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    return results;
  }

  // Private helper methods

  private static validatePoolConfig(config: ConnectionPoolConfig): void {
    if (config.minConnections < 0) {
      throw new Error('Minimum connections cannot be negative');
    }
    
    if (config.maxConnections <= 0) {
      throw new Error('Maximum connections must be positive');
    }
    
    if (config.minConnections > config.maxConnections) {
      throw new Error('Minimum connections cannot exceed maximum connections');
    }
    
    if (config.acquireTimeoutMs <= 0) {
      throw new Error('Acquire timeout must be positive');
    }
  }

  private static async initializeMinConnections(poolId: string): Promise<void> {
    const pool = this.pools.get(poolId);
    if (!pool) return;

    for (let i = 0; i < pool.minConnections; i++) {
      try {
        await this.createConnection(poolId, pool.connectionId);
      } catch (error) {
        console.error(`Failed to create initial connection for pool ${poolId}:`, error);
      }
    }
  }

  private static async createConnection(poolId: string, connectionId: string): Promise<PooledConnection> {
    const connection: PooledConnection = {
      id: `conn_${Date.now()}_${Math.random()}`,
      poolId,
      connectionId,
      status: 'idle',
      createdAt: new Date(),
      lastUsed: new Date(),
      usageCount: 0,
      errorCount: 0,
      testResults: [],
      metadata: {
        transactionState: 'none'
      }
    };

    // Simulate connection creation delay
    await new Promise(resolve => setTimeout(resolve, 100));

    this.connections.set(connection.id, connection);
    this.recordMetric(poolId, 'connection-created');

    return connection;
  }

  private static async destroyConnection(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Simulate connection cleanup delay
    await new Promise(resolve => setTimeout(resolve, 50));

    this.connections.delete(connectionId);
    this.recordMetric(connection.poolId, 'connection-destroyed');
  }

  private static getIdleConnection(poolId: string): PooledConnection | null {
    const idleConnections = Array.from(this.connections.values())
      .filter(conn => conn.poolId === poolId && conn.status === 'idle')
      .sort((a, b) => a.lastUsed.getTime() - b.lastUsed.getTime()); // Oldest first

    return idleConnections[0] || null;
  }

  private static getActiveConnectionCount(poolId: string): number {
    return Array.from(this.connections.values())
      .filter(conn => conn.poolId === poolId && conn.status === 'active')
      .length;
  }

  private static async testConnection(connection: PooledConnection): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const result: TestResult = {
        timestamp: new Date(),
        type: 'borrow',
        success: Math.random() > 0.05, // 95% success rate
        responseTime: Date.now() - startTime
      };

      connection.testResults.push(result);
      
      // Keep only last 10 test results
      if (connection.testResults.length > 10) {
        connection.testResults = connection.testResults.slice(-10);
      }

      return result;
    } catch (error) {
      const result: TestResult = {
        timestamp: new Date(),
        type: 'borrow',
        success: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Test failed'
      };

      connection.testResults.push(result);
      return result;
    }
  }

  private static async checkResourceLimits(poolId: string): Promise<void> {
    const limits = this.resourceLimits.get(poolId);
    if (!limits) return;

    // Check quotas
    for (const quota of limits.quotas) {
      if (quota.enforced && quota.used >= quota.limit) {
        this.createAlert(poolId, 'quota-exceeded', 'high',
          `${quota.resource} quota exceeded`, { quota });
        throw new Error(`${quota.resource} quota exceeded`);
      }
    }

    // Check memory limits
    const currentMemory = this.calculateMemoryUsage(poolId);
    if (currentMemory > limits.maxTotalMemory) {
      this.createAlert(poolId, 'resource-exhaustion', 'high',
        'Memory limit exceeded', { currentMemory, limit: limits.maxTotalMemory });
      throw new Error('Memory limit exceeded');
    }
  }

  private static calculateMemoryUsage(poolId: string): number {
    // Simulate memory calculation
    const connectionCount = Array.from(this.connections.values())
      .filter(conn => conn.poolId === poolId).length;
    
    return connectionCount * 10; // 10MB per connection
  }

  private static calculateResourceUsage(poolId: string): { memoryUsage: number; cpuUsage: number; networkUsage: number } {
    return {
      memoryUsage: this.calculateMemoryUsage(poolId),
      cpuUsage: Math.random() * 100, // Simulate CPU usage
      networkUsage: Math.random() * 1000 // Simulate network usage in MB
    };
  }

  private static adjustPoolSize(poolId: string): void {
    const pool = this.pools.get(poolId);
    if (!pool || !pool.enabled) return;

    const connections = Array.from(this.connections.values())
      .filter(conn => conn.poolId === poolId);

    // Add connections if below minimum
    if (connections.length < pool.minConnections) {
      const needed = pool.minConnections - connections.length;
      for (let i = 0; i < needed; i++) {
        this.createConnection(poolId, pool.connectionId);
      }
    }

    // Remove excess idle connections if above maximum
    if (connections.length > pool.maxConnections) {
      const idleConnections = connections
        .filter(conn => conn.status === 'idle')
        .sort((a, b) => a.lastUsed.getTime() - b.lastUsed.getTime());

      const excess = connections.length - pool.maxConnections;
      for (let i = 0; i < Math.min(excess, idleConnections.length); i++) {
        this.destroyConnection(idleConnections[i].id);
      }
    }
  }

  private static recordMetric(poolId: string, type: string, value?: number): void {
    // This would typically update metrics aggregation
    // For now, we'll just track the event
    console.log(`Pool ${poolId}: ${type}${value ? ` (${value}ms)` : ''}`);
  }

  private static createEmptyMetrics(poolId: string): PoolMetrics {
    return {
      poolId,
      timestamp: new Date(),
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      pendingAcquisitions: 0,
      successfulAcquisitions: 0,
      failedAcquisitions: 0,
      timeouts: 0,
      averageAcquisitionTime: 0,
      averageUsageTime: 0,
      connectionCreations: 0,
      connectionDestructions: 0,
      validationFailures: 0,
      evictions: 0,
      throughput: 0,
      errorRate: 0
    };
  }

  private static createAlert(
    poolId: string,
    type: PoolAlert['type'],
    severity: PoolAlert['severity'],
    message: string,
    details: Record<string, any> = {}
  ): void {
    const alert: PoolAlert = {
      id: `alert_${Date.now()}`,
      poolId,
      type,
      severity,
      message,
      details,
      triggeredAt: new Date(),
      acknowledged: false,
      resolved: false,
      escalated: false
    };

    this.alerts.push(alert);

    // Keep only last 1000 alerts
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }
  }

  private static startMonitoring(): void {
    // Metrics collection
    this.metricsInterval = setInterval(() => {
      for (const [poolId] of this.pools) {
        this.collectMetrics(poolId);
      }
    }, 60000); // Every minute

    // Health checks
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 300000); // Every 5 minutes

    // Connection eviction
    this.evictionInterval = setInterval(() => {
      this.evictIdleConnections();
    }, 30000); // Every 30 seconds
  }

  private static collectMetrics(poolId: string): void {
    const connections = Array.from(this.connections.values())
      .filter(conn => conn.poolId === poolId);

    const metrics: PoolMetrics = {
      poolId,
      timestamp: new Date(),
      totalConnections: connections.length,
      activeConnections: connections.filter(c => c.status === 'active').length,
      idleConnections: connections.filter(c => c.status === 'idle').length,
      pendingAcquisitions: 0, // Would track actual pending requests
      successfulAcquisitions: 0, // Would track from recent period
      failedAcquisitions: 0,
      timeouts: 0,
      averageAcquisitionTime: 0,
      averageUsageTime: 0,
      connectionCreations: 0,
      connectionDestructions: 0,
      validationFailures: 0,
      evictions: 0,
      throughput: 0,
      errorRate: 0
    };

    this.metrics.push(metrics);

    // Keep only last 1440 metrics (24 hours at 1-minute intervals)
    if (this.metrics.length > 1440) {
      this.metrics = this.metrics.slice(-1440);
    }
  }

  private static evictIdleConnections(): void {
    const now = new Date();

    for (const [poolId, pool] of this.pools) {
      if (!pool.enabled) continue;

      const connections = Array.from(this.connections.values())
        .filter(conn => conn.poolId === poolId && conn.status === 'idle');

      for (const connection of connections) {
        const idleTime = now.getTime() - connection.lastUsed.getTime();
        const lifetime = now.getTime() - connection.createdAt.getTime();

        // Evict if idle too long or exceeded max lifetime
        if (idleTime > pool.idleTimeoutMs || lifetime > pool.maxLifetimeMs) {
          // Don't evict below minimum connections
          const remainingConnections = connections.length - 1;
          if (remainingConnections >= pool.minConnections) {
            this.destroyConnection(connection.id);
            this.recordMetric(poolId, 'eviction');
          }
        }
      }
    }
  }

  /**
   * Cleanup on service shutdown
   */
  static shutdown(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.evictionInterval) {
      clearInterval(this.evictionInterval);
      this.evictionInterval = null;
    }
  }
}
