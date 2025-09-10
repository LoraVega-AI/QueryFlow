// Web Worker Manager for QueryFlow
// Manages Web Workers for CPU-intensive operations and provides a clean API

export interface WorkerTask<T = any, R = any> {
  id: string;
  type: string;
  data: T;
  resolve: (result: R) => void;
  reject: (error: Error) => void;
  timestamp: number;
  timeout?: number;
}

export interface WorkerConfig {
  maxWorkers: number;
  taskTimeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export class WorkerManager {
  private static instance: WorkerManager;
  private workers: Worker[] = [];
  private taskQueue: WorkerTask[] = [];
  private activeTasks = new Map<string, WorkerTask>();
  private config: WorkerConfig = {
    maxWorkers: navigator.hardwareConcurrency || 4,
    taskTimeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000
  };
  private isInitialized = false;

  private constructor() {
    this.initializeWorkers();
  }

  static getInstance(): WorkerManager {
    if (!WorkerManager.instance) {
      WorkerManager.instance = new WorkerManager();
    }
    return WorkerManager.instance;
  }

  private async initializeWorkers(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create workers
      for (let i = 0; i < this.config.maxWorkers; i++) {
        const worker = new Worker(new URL('../workers/searchWorker.ts', import.meta.url), {
          type: 'module'
        });
        
        worker.onmessage = this.handleWorkerMessage.bind(this);
        worker.onerror = this.handleWorkerError.bind(this);
        
        this.workers.push(worker);
      }

      this.isInitialized = true;
      console.log(`Initialized ${this.workers.length} Web Workers`);
    } catch (error) {
      console.error('Failed to initialize Web Workers:', error);
      // Fallback to main thread processing
      this.isInitialized = false;
    }
  }

  private handleWorkerMessage(event: MessageEvent): void {
    const { type, id, data, progress } = event.data;

    if (type === 'progress') {
      // Handle progress updates
      const task = this.activeTasks.get(id);
      if (task) {
        // Emit progress event if needed
        console.log(`Task ${id} progress: ${progress}%`);
      }
      return;
    }

    const task = this.activeTasks.get(id);
    if (!task) {
      console.warn(`Received response for unknown task: ${id}`);
      return;
    }

    // Remove from active tasks
    this.activeTasks.delete(id);

    if (type === 'error') {
      task.reject(new Error(data.error));
    } else {
      task.resolve(data);
    }

    // Process next task in queue
    this.processNextTask();
  }

  private handleWorkerError(error: ErrorEvent): void {
    console.error('Web Worker error:', error);
    
    // Find and reject all active tasks for this worker
    for (const [taskId, task] of this.activeTasks.entries()) {
      task.reject(new Error(`Worker error: ${error.message}`));
      this.activeTasks.delete(taskId);
    }
  }

  private async processNextTask(): Promise<void> {
    if (this.taskQueue.length === 0) return;

    const availableWorker = this.findAvailableWorker();
    if (!availableWorker) return;

    const task = this.taskQueue.shift();
    if (!task) return;

    // Set timeout
    const timeoutId = setTimeout(() => {
      this.activeTasks.delete(task.id);
      task.reject(new Error(`Task ${task.id} timed out after ${this.config.taskTimeout}ms`));
    }, task.timeout || this.config.taskTimeout);

    // Store timeout ID for cleanup
    (task as any).timeoutId = timeoutId;

    this.activeTasks.set(task.id, task);

    try {
      availableWorker.postMessage({
        type: task.type,
        id: task.id,
        data: task.data
      });
    } catch (error) {
      clearTimeout(timeoutId);
      this.activeTasks.delete(task.id);
      task.reject(error as Error);
    }
  }

  private findAvailableWorker(): Worker | null {
    // Find worker with least active tasks
    let bestWorker = null;
    let minTasks = Infinity;

    for (const worker of this.workers) {
      const activeTaskCount = Array.from(this.activeTasks.values())
        .filter(task => task.timestamp > Date.now() - 60000) // Last minute
        .length;

      if (activeTaskCount < minTasks) {
        minTasks = activeTaskCount;
        bestWorker = worker;
      }
    }

    return bestWorker;
  }

  // Public API methods
  async executeTask<T, R>(
    type: string,
    data: T,
    options: { timeout?: number; priority?: number } = {}
  ): Promise<R> {
    if (!this.isInitialized) {
      throw new Error('Worker manager not initialized');
    }

    return new Promise<R>((resolve, reject) => {
      const task: WorkerTask<T, R> = {
        id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        data,
        resolve: resolve as (result: any) => void,
        reject,
        timestamp: Date.now(),
        timeout: options.timeout
      };

      // Add to queue with priority
      if (options.priority && options.priority > 0) {
        this.taskQueue.unshift(task);
      } else {
        this.taskQueue.push(task);
      }

      this.processNextTask();
    });
  }

  // Semantic search using Web Worker
  async performSemanticSearch(
    query: string,
    documents: any[],
    options: {
      offset?: number;
      limit?: number;
      timeout?: number;
    } = {}
  ): Promise<{
    results: any[];
    total: number;
    query: string;
    executionTime: number;
  }> {
    return this.executeTask('search', {
      query,
      documents,
      options
    }, { timeout: options.timeout });
  }

  // Generate embeddings using Web Worker
  async generateEmbeddings(
    texts: string[],
    options: { timeout?: number } = {}
  ): Promise<{ embeddings: number[][]; texts: string[] }> {
    return this.executeTask('embedding', { texts }, { timeout: options.timeout });
  }

  // Process large datasets using Web Worker
  async processLargeDataset(
    dataset: any[],
    operation: 'filter' | 'sort' | 'transform',
    options: {
      searchTerm?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      transformFunction?: (item: any) => any;
      batchSize?: number;
      timeout?: number;
    } = {}
  ): Promise<any[]> {
    return this.executeTask('process_data', {
      dataset,
      operation,
      options
    }, { timeout: options.timeout });
  }

  // Get worker statistics
  getStats(): {
    totalWorkers: number;
    activeTasks: number;
    queuedTasks: number;
    isInitialized: boolean;
  } {
    return {
      totalWorkers: this.workers.length,
      activeTasks: this.activeTasks.size,
      queuedTasks: this.taskQueue.length,
      isInitialized: this.isInitialized
    };
  }

  // Update configuration
  updateConfig(newConfig: Partial<WorkerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Cleanup all workers
  cleanup(): void {
    // Clear all active tasks
    for (const [taskId, task] of this.activeTasks.entries()) {
      if ((task as any).timeoutId) {
        clearTimeout((task as any).timeoutId);
      }
      task.reject(new Error('Worker manager cleanup'));
    }
    this.activeTasks.clear();

    // Clear task queue
    for (const task of this.taskQueue) {
      if ((task as any).timeoutId) {
        clearTimeout((task as any).timeoutId);
      }
      task.reject(new Error('Worker manager cleanup'));
    }
    this.taskQueue.length = 0;

    // Terminate all workers
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers.length = 0;

    this.isInitialized = false;
    console.log('Worker manager cleaned up');
  }

  // Check if Web Workers are supported
  static isSupported(): boolean {
    return typeof Worker !== 'undefined' && typeof URL !== 'undefined';
  }

  // Fallback to main thread processing
  async executeTaskFallback<T, R>(
    type: string,
    data: T
  ): Promise<R> {
    console.warn('Web Workers not available, falling back to main thread processing');
    
    // Implement fallback logic here
    switch (type) {
      case 'search':
        // Fallback search implementation
        throw new Error('Search fallback not implemented');
      case 'embedding':
        // Fallback embedding implementation
        throw new Error('Embedding fallback not implemented');
      case 'process_data':
        // Fallback data processing implementation
        throw new Error('Data processing fallback not implemented');
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
  }
}

// Export singleton instance
export const workerManager = WorkerManager.getInstance();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    workerManager.cleanup();
  });
}
