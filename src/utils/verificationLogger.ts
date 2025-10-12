// Verification Logger
// Structured logging for verification operations

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  category: string;
  message: string;
  details?: any;
  duration?: number;
}

export class VerificationLogger {
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;
  private startTimes: Map<string, number> = new Map();

  /**
   * Log debug message
   */
  debug(category: string, message: string, details?: any): void {
    this.log('debug', category, message, details);
  }

  /**
   * Log info message
   */
  info(category: string, message: string, details?: any): void {
    this.log('info', category, message, details);
    console.log(`ℹ️  [${category}] ${message}`, details || '');
  }

  /**
   * Log warning message
   */
  warn(category: string, message: string, details?: any): void {
    this.log('warn', category, message, details);
    console.warn(`⚠️  [${category}] ${message}`, details || '');
  }

  /**
   * Log error message
   */
  error(category: string, message: string, details?: any): void {
    this.log('error', category, message, details);
    console.error(`❌ [${category}] ${message}`, details || '');
  }

  /**
   * Start timing an operation
   */
  startTimer(operationId: string): void {
    this.startTimes.set(operationId, Date.now());
  }

  /**
   * End timing an operation and log
   */
  endTimer(operationId: string, category: string, message: string): number | undefined {
    const startTime = this.startTimes.get(operationId);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.startTimes.delete(operationId);
      this.info(category, message, { duration: `${duration}ms` });
      return duration;
    }
    return undefined;
  }

  /**
   * Log with timing
   */
  private log(level: LogLevel, category: string, message: string, details?: any): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      category,
      message,
      details,
    };

    this.logs.push(entry);

    // Trim logs if exceeding max
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  /**
   * Get all logs
   */
  getLogs(level?: LogLevel, category?: string): LogEntry[] {
    let filtered = this.logs;

    if (level) {
      filtered = filtered.filter(log => log.level === level);
    }

    if (category) {
      filtered = filtered.filter(log => log.category === category);
    }

    return [...filtered];
  }

  /**
   * Get error logs
   */
  getErrors(): LogEntry[] {
    return this.getLogs('error');
  }

  /**
   * Get warning logs
   */
  getWarnings(): LogEntry[] {
    return this.getLogs('warn');
  }

  /**
   * Clear logs
   */
  clear(): void {
    this.logs = [];
    this.startTimes.clear();
  }

  /**
   * Get log summary
   */
  getSummary(): {
    total: number;
    debug: number;
    info: number;
    warn: number;
    error: number;
  } {
    return {
      total: this.logs.length,
      debug: this.logs.filter(l => l.level === 'debug').length,
      info: this.logs.filter(l => l.level === 'info').length,
      warn: this.logs.filter(l => l.level === 'warn').length,
      error: this.logs.filter(l => l.level === 'error').length,
    };
  }

  /**
   * Export logs as JSON
   */
  exportJSON(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Export logs as text
   */
  exportText(): string {
    return this.logs.map(log => 
      `[${log.timestamp.toISOString()}] [${log.level.toUpperCase()}] [${log.category}] ${log.message}` +
      (log.details ? `\n  ${JSON.stringify(log.details)}` : '')
    ).join('\n');
  }
}

// Export singleton instance
export const verificationLogger = new VerificationLogger();

