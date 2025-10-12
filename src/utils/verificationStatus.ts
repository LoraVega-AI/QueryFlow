// Verification Status Tracker
// Tracks verification progress and status

export type VerificationStage = 
  | 'idle' 
  | 'introspecting' 
  | 'reconciling' 
  | 'analyzing' 
  | 'complete' 
  | 'error';

export interface VerificationStatus {
  stage: VerificationStage;
  progress: number;
  currentOperation: string;
  errors: string[];
  warnings: string[];
  startTime?: Date;
  endTime?: Date;
  duration?: number;
}

export class VerificationStatusTracker {
  private status: VerificationStatus;
  private listeners: Array<(status: VerificationStatus) => void> = [];

  constructor() {
    this.status = {
      stage: 'idle',
      progress: 0,
      currentOperation: 'Waiting to start',
      errors: [],
      warnings: [],
    };
  }

  /**
   * Start verification
   */
  start(): void {
    this.status = {
      stage: 'introspecting',
      progress: 0,
      currentOperation: 'Starting verification',
      errors: [],
      warnings: [],
      startTime: new Date(),
    };
    this.notify();
  }

  /**
   * Update stage
   */
  updateStage(stage: VerificationStage, operation: string): void {
    this.status.stage = stage;
    this.status.currentOperation = operation;
    
    // Update progress based on stage
    switch (stage) {
      case 'introspecting':
        this.status.progress = 25;
        break;
      case 'reconciling':
        this.status.progress = 50;
        break;
      case 'analyzing':
        this.status.progress = 75;
        break;
      case 'complete':
        this.status.progress = 100;
        this.status.endTime = new Date();
        if (this.status.startTime) {
          this.status.duration = this.status.endTime.getTime() - this.status.startTime.getTime();
        }
        break;
      case 'error':
        this.status.progress = 0;
        this.status.endTime = new Date();
        if (this.status.startTime) {
          this.status.duration = this.status.endTime.getTime() - this.status.startTime.getTime();
        }
        break;
    }
    
    this.notify();
  }

  /**
   * Update progress
   */
  updateProgress(progress: number, operation?: string): void {
    this.status.progress = Math.max(0, Math.min(100, progress));
    if (operation) {
      this.status.currentOperation = operation;
    }
    this.notify();
  }

  /**
   * Add error
   */
  addError(error: string): void {
    this.status.errors.push(error);
    this.notify();
  }

  /**
   * Add warning
   */
  addWarning(warning: string): void {
    this.status.warnings.push(warning);
    this.notify();
  }

  /**
   * Complete verification
   */
  complete(): void {
    this.updateStage('complete', 'Verification completed');
  }

  /**
   * Mark as error
   */
  error(message: string): void {
    this.addError(message);
    this.updateStage('error', 'Verification failed');
  }

  /**
   * Reset status
   */
  reset(): void {
    this.status = {
      stage: 'idle',
      progress: 0,
      currentOperation: 'Waiting to start',
      errors: [],
      warnings: [],
    };
    this.notify();
  }

  /**
   * Get current status
   */
  getStatus(): VerificationStatus {
    return { ...this.status };
  }

  /**
   * Subscribe to status changes
   */
  subscribe(listener: (status: VerificationStatus) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify listeners
   */
  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.getStatus());
      } catch (error) {
        console.error('Error in status listener:', error);
      }
    }
  }
}

