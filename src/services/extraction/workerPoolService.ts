// Worker Pool Service
// Manages worker threads for parallel processing

import Piscina from 'piscina';
import * as path from 'path';
import {
  WorkerTask,
  WorkerResult,
  ExtractionOptions
} from '@/types/extraction';

export class WorkerPoolService {
  private pool: Piscina | null = null;
  private isInitialized = false;

  constructor() {
    // Pool will be initialized when first used
  }

  /**
   * Initialize worker pool
   */
  async initialize(options: ExtractionOptions): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Only create pool if parallel processing is enabled
      if (options.parallelProcessing && options.maxWorkers > 1) {
        this.pool = new Piscina({
          filename: path.resolve(__dirname, '../workers/extractionWorker.js'),
          maxThreads: options.maxWorkers,
          minThreads: Math.max(1, Math.floor(options.maxWorkers / 2)),
          idleTimeout: 30000, // 30 seconds
          maxQueue: 'auto'
        });

        console.log(`🧵 Initialized worker pool with ${options.maxWorkers} workers`);
      }

      this.isInitialized = true;
    } catch (error) {
      console.warn('Failed to initialize worker pool, falling back to single-threaded:', error instanceof Error ? error.message : 'Unknown error');
      this.pool = null;
      this.isInitialized = true;
    }
  }

  /**
   * Execute task in worker thread
   */
  async runTask(task: WorkerTask): Promise<WorkerResult> {
    if (!this.pool) {
      // Fallback to synchronous processing
      return this.runTaskSync(task);
    }

    try {
      const startTime = Date.now();
      const result = await this.pool.run(task);
      const endTime = Date.now();

      return {
        taskId: task.id,
        success: true,
        result,
        performance: {
          startTime,
          endTime,
          memoryUsage: 0 // Would be reported by worker
        }
      };
    } catch (error) {
      return {
        taskId: task.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        performance: {
          startTime: Date.now(),
          endTime: Date.now(),
          memoryUsage: 0
        }
      };
    }
  }

  /**
   * Execute multiple tasks in parallel
   */
  async runTasks(tasks: WorkerTask[]): Promise<WorkerResult[]> {
    if (!this.pool || tasks.length === 1) {
      // Process sequentially if no pool or single task
      const results: WorkerResult[] = [];
      for (const task of tasks) {
        results.push(await this.runTask(task));
      }
      return results;
    }

    try {
      // Process tasks in parallel
      const promises = tasks.map(task => this.runTask(task));
      return await Promise.all(promises);
    } catch (error) {
      console.error('Batch task execution failed:', error);
      throw error;
    }
  }

  /**
   * Get worker pool statistics
   */
  getStatistics(): {
    isInitialized: boolean;
    hasPool: boolean;
  threadCount?: number;
  queueSize?: number;
  completed?: number;
  } {
    return {
      isInitialized: this.isInitialized,
      hasPool: this.pool !== null,
      threadCount: this.pool?.threads.length,
      queueSize: this.pool?.queueSize,
      completed: this.pool?.completed
    };
  }

  /**
   * Check if pool is available
   */
  isAvailable(): boolean {
    return this.isInitialized && this.pool !== null;
  }

  /**
   * Terminate worker pool
   */
  async terminate(): Promise<void> {
    if (this.pool) {
      try {
        await this.pool.destroy();
        console.log('🧵 Worker pool terminated');
      } catch (error) {
        console.warn('Failed to terminate worker pool:', error instanceof Error ? error.message : 'Unknown error');
      }
      this.pool = null;
    }
    this.isInitialized = false;
  }

  // Private methods

  /**
   * Synchronous task execution fallback
   */
  private async runTaskSync(task: WorkerTask): Promise<WorkerResult> {
    const startTime = Date.now();

    try {
      // Simple task processing without worker threads
      let result;

      switch (task.type) {
        case 'parse':
          result = await this.parseTaskSync(task);
          break;
        case 'extract':
          result = await this.extractTaskSync(task);
          break;
        case 'convert':
          result = await this.convertTaskSync(task);
          break;
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      return {
        taskId: task.id,
        success: true,
        result,
        performance: {
          startTime,
          endTime: Date.now(),
          memoryUsage: process.memoryUsage().heapUsed
        }
      };
    } catch (error) {
      return {
        taskId: task.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        performance: {
          startTime,
          endTime: Date.now(),
          memoryUsage: process.memoryUsage().heapUsed
        }
      };
    }
  }

  /**
   * Synchronous parse task
   */
  private async parseTaskSync(task: WorkerTask): Promise<any> {
    // Placeholder for synchronous parsing
    // In a real implementation, this would handle the parsing logic
    return { parsed: true, taskId: task.id };
  }

  /**
   * Synchronous extract task
   */
  private async extractTaskSync(task: WorkerTask): Promise<any> {
    // Placeholder for synchronous extraction
    return { extracted: true, taskId: task.id };
  }

  /**
   * Synchronous convert task
   */
  private async convertTaskSync(task: WorkerTask): Promise<any> {
    // Placeholder for synchronous conversion
    return { converted: true, taskId: task.id };
  }
}
