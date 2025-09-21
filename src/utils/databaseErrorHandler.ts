import { writeFile } from 'fs/promises';
import path from 'path';

export interface DatabaseError {
  id: string;
  timestamp: string;
  operation: string;
  filePath?: string;
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  context?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DatabaseLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  operation: string;
  filePath?: string;
  message: string;
  metadata?: Record<string, any>;
  duration?: number;
}

export class DatabaseErrorHandler {
  private static instance: DatabaseErrorHandler;
  private errors: DatabaseError[] = [];
  private logs: DatabaseLogEntry[] = [];
  private logFilePath: string;
  private errorFilePath: string;

  private constructor() {
    // Initialize log file paths
    this.logFilePath = path.join(process.cwd(), 'logs', 'database_conversion.log');
    this.errorFilePath = path.join(process.cwd(), 'logs', 'database_errors.log');

    // Ensure log directory exists
    this.ensureLogDirectory();
  }

  static getInstance(): DatabaseErrorHandler {
    if (!DatabaseErrorHandler.instance) {
      DatabaseErrorHandler.instance = new DatabaseErrorHandler();
    }
    return DatabaseErrorHandler.instance;
  }

  /**
   * Log an informational message
   */
  logInfo(operation: string, message: string, metadata?: Record<string, any>, filePath?: string): string {
    return this.logEntry({
      level: 'info',
      operation,
      message,
      metadata,
      filePath
    });
  }

  /**
   * Log a warning message
   */
  logWarning(operation: string, message: string, metadata?: Record<string, any>, filePath?: string): string {
    return this.logEntry({
      level: 'warn',
      operation,
      message,
      metadata,
      filePath
    });
  }

  /**
   * Log an error message
   */
  logError(operation: string, message: string, error?: Error, context?: Record<string, any>, filePath?: string): string {
    return this.logEntry({
      level: 'error',
      operation,
      message,
      metadata: {
        errorMessage: error?.message,
        stackTrace: error?.stack,
        ...context
      },
      filePath
    });
  }

  /**
   * Log a debug message
   */
  logDebug(operation: string, message: string, metadata?: Record<string, any>, filePath?: string): string {
    return this.logEntry({
      level: 'debug',
      operation,
      message,
      metadata,
      filePath
    });
  }

  /**
   * Record a database error with full context
   */
  recordError(
    operation: string,
    error: Error | string,
    context: Record<string, any> = {},
    filePath?: string,
    severity: DatabaseError['severity'] = 'medium'
  ): string {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const dbError: DatabaseError = {
      id: errorId,
      timestamp: new Date().toISOString(),
      operation,
      filePath,
      errorType: error instanceof Error ? error.constructor.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : String(error),
      stackTrace: error instanceof Error ? error.stack : undefined,
      context,
      severity
    };

    this.errors.push(dbError);

    // Log the error
    this.logError(operation, `Database error recorded: ${dbError.errorMessage}`, error instanceof Error ? error : undefined, context, filePath);

    // Write to error file
    this.writeErrorToFile(dbError);

    // Console output based on severity
    this.logErrorToConsole(dbError);

    return errorId;
  }

  /**
   * Get all errors for a specific file or operation
   */
  getErrors(filePath?: string, operation?: string): DatabaseError[] {
    return this.errors.filter(error => {
      if (filePath && error.filePath !== filePath) return false;
      if (operation && error.operation !== operation) return false;
      return true;
    });
  }

  /**
   * Get logs with filtering
   */
  getLogs(level?: DatabaseLogEntry['level'], operation?: string): DatabaseLogEntry[] {
    return this.logs.filter(log => {
      if (level && log.level !== level) return false;
      if (operation && log.operation !== operation) return false;
      return true;
    });
  }

  /**
   * Clear old errors and logs
   */
  clearOldEntries(maxAgeHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

    this.errors = this.errors.filter(error => new Date(error.timestamp) > cutoffTime);
    this.logs = this.logs.filter(log => new Date(log.timestamp) > cutoffTime);

    this.logInfo('cleanup', `Cleared entries older than ${maxAgeHours} hours`);
  }

  /**
   * Export logs to file
   */
  async exportLogsToFile(): Promise<string> {
    try {
      const logContent = JSON.stringify(this.logs, null, 2);
      await writeFile(this.logFilePath, logContent);
      return this.logFilePath;
    } catch (error) {
      console.error('Failed to export logs to file:', error);
      return '';
    }
  }

  /**
   * Get error summary
   */
  getErrorSummary(): {
    total: number;
    bySeverity: Record<DatabaseError['severity'], number>;
    byOperation: Record<string, number>;
    recentErrors: DatabaseError[];
  } {
    const summary = {
      total: this.errors.length,
      bySeverity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      } as Record<DatabaseError['severity'], number>,
      byOperation: {} as Record<string, number>,
      recentErrors: this.errors.slice(-10) // Last 10 errors
    };

    this.errors.forEach(error => {
      summary.bySeverity[error.severity]++;
      summary.byOperation[error.operation] = (summary.byOperation[error.operation] || 0) + 1;
    });

    return summary;
  }

  /**
   * Create a performance log entry
   */
  logPerformance(operation: string, duration: number, metadata?: Record<string, any>, filePath?: string): string {
    return this.logEntry({
      level: 'info',
      operation,
      message: `Operation completed in ${duration}ms`,
      metadata: {
        duration,
        performance: true,
        ...metadata
      },
      filePath
    });
  }

  /**
   * Private method to create log entry
   */
  private logEntry(entry: Omit<DatabaseLogEntry, 'id' | 'timestamp'>): string {
    const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const logEntry: DatabaseLogEntry = {
      id: logId,
      timestamp: new Date().toISOString(),
      ...entry
    };

    this.logs.push(logEntry);

    // Write to log file
    this.writeLogToFile(logEntry);

    // Console output for important logs
    if (entry.level === 'error' || entry.level === 'warn') {
      this.logToConsole(logEntry);
    }

    return logId;
  }

  /**
   * Write log to file
   */
  private async writeLogToFile(logEntry: DatabaseLogEntry): Promise<void> {
    try {
      const logLine = JSON.stringify(logEntry) + '\n';
      await writeFile(this.logFilePath, logLine, { flag: 'a' });
    } catch (error) {
      // Silently fail for log writing errors to avoid recursion
      console.error('Failed to write log to file:', error);
    }
  }

  /**
   * Write error to file
   */
  private async writeErrorToFile(error: DatabaseError): Promise<void> {
    try {
      const errorLine = JSON.stringify(error) + '\n';
      await writeFile(this.errorFilePath, errorLine, { flag: 'a' });
    } catch (error) {
      // Silently fail for error writing errors to avoid recursion
      console.error('Failed to write error to file:', error);
    }
  }

  /**
   * Log to console with formatting
   */
  private logToConsole(logEntry: DatabaseLogEntry): void {
    const timestamp = new Date(logEntry.timestamp).toLocaleTimeString();
    const prefix = `[${timestamp}] [${logEntry.level.toUpperCase()}] ${logEntry.operation}`;

    switch (logEntry.level) {
      case 'error':
        console.error(`${prefix}: ${logEntry.message}`, logEntry.metadata);
        break;
      case 'warn':
        console.warn(`${prefix}: ${logEntry.message}`, logEntry.metadata);
        break;
      case 'debug':
        console.debug(`${prefix}: ${logEntry.message}`, logEntry.metadata);
        break;
      default:
        console.log(`${prefix}: ${logEntry.message}`, logEntry.metadata);
    }
  }

  /**
   * Log error to console with enhanced formatting
   */
  private logErrorToConsole(error: DatabaseError): void {
    const timestamp = new Date(error.timestamp).toLocaleTimeString();
    const prefix = `[${timestamp}] [ERROR] ${error.operation}`;

    console.error(`${prefix}: ${error.errorMessage}`);
    if (error.filePath) {
      console.error(`   File: ${error.filePath}`);
    }
    if (error.context && Object.keys(error.context).length > 0) {
      console.error(`   Context:`, error.context);
    }
    if (error.stackTrace) {
      console.error(`   Stack Trace:`, error.stackTrace);
    }
  }

  /**
   * Ensure log directory exists
   */
  private async ensureLogDirectory(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const logDir = path.dirname(this.logFilePath);
      await fs.mkdir(logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  /**
   * Get system performance metrics
   */
  getSystemMetrics(): Record<string, any> {
    return {
      memory: {
        used: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
        total: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
        external: Math.round((process.memoryUsage().external / 1024 / 1024) * 100) / 100
      },
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString()
    };
  }
}

export default DatabaseErrorHandler;
