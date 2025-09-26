// Real-time Service for Project Updates
// Uses Server-Sent Events (SSE) for real-time updates

export interface RealtimeMessage {
  type: 'project_created' | 'project_updated' | 'project_deleted' | 'project_synced' | 'error';
  data?: any;
  timestamp: number;
}

export interface RealtimeService {
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnected: () => boolean;
  onMessage: (callback: (message: RealtimeMessage) => void) => void;
  onConnect: (callback: () => void) => void;
  onDisconnect: (callback: () => void) => void;
  onError: (callback: (error: Event) => void) => void;
  testConnection: () => Promise<boolean>;
  getConnectionStatus: () => any;
}

class RealtimeServiceImpl implements RealtimeService {
  private eventSource: EventSource | null = null;
  private messageCallbacks: ((message: RealtimeMessage) => void)[] = [];
  private connectCallbacks: (() => void)[] = [];
  private disconnectCallbacks: (() => void)[] = [];
  private errorCallbacks: ((error: Event) => void)[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isManualDisconnect = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor(private url: string = '/api/realtime/events') {
    console.log('RealtimeService initialized with URL:', this.url);
  }

  async connect(): Promise<void> {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
      console.warn('EventSource not available in this environment');
      return;
    }

    if (this.eventSource?.readyState === EventSource.OPEN) {
      console.log('EventSource already connected');
      return;
    }

    // Clean up existing connection
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    try {
      console.log('Connecting to real-time service:', this.url);
      console.log('Current window location:', typeof window !== 'undefined' ? window.location.href : 'N/A');
      console.log('Full URL will be:', typeof window !== 'undefined' ? new URL(this.url, window.location.origin).href : this.url);
      
      // Test connection first
      const isAvailable = await this.testConnection();
      if (!isAvailable) {
        console.warn('Real-time endpoint not available, skipping connection');
        return;
      }
      
      this.eventSource = new EventSource(this.url);
      this.setupEventListeners();
    } catch (error) {
      console.error('Failed to create EventSource connection:', error);
      this.handleError(error as Event);
    }
  }

  disconnect(): void {
    this.isManualDisconnect = true;
    this.cleanup();
  }

  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }

  onMessage(callback: (message: RealtimeMessage) => void): void {
    this.messageCallbacks.push(callback);
  }

  onConnect(callback: () => void): void {
    this.connectCallbacks.push(callback);
  }

  onDisconnect(callback: () => void): void {
    this.disconnectCallbacks.push(callback);
  }

  onError(callback: (error: Event) => void): void {
    this.errorCallbacks.push(callback);
  }

  // Test if the endpoint is available
  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing real-time endpoint availability...');
      const response = await fetch(this.url, {
        method: 'HEAD',
        cache: 'no-cache'
      });
      console.log('Connection test response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  // Get detailed connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected(),
      readyState: this.eventSource?.readyState,
      url: this.eventSource?.url,
      reconnectAttempts: this.reconnectAttempts,
      isManualDisconnect: this.isManualDisconnect,
      hasEventSource: !!this.eventSource
    };
  }

  private setupEventListeners(): void {
    if (!this.eventSource) return;

    this.eventSource.onopen = () => {
      console.log('Real-time connection opened', {
        url: this.eventSource?.url,
        readyState: this.eventSource?.readyState,
        reconnectAttempts: this.reconnectAttempts
      });
      this.reconnectAttempts = 0;
      this.isManualDisconnect = false;
      this.connectCallbacks.forEach(callback => callback());
    };

    this.eventSource.onmessage = (event) => {
      try {
        const message: RealtimeMessage = JSON.parse(event.data);
        console.log('Real-time message received:', message);
        this.messageCallbacks.forEach(callback => callback(message));
      } catch (error) {
        console.error('Failed to parse real-time message:', error);
      }
    };

    this.eventSource.onerror = (error) => {
      const errorDetails = {
        type: error?.type || 'unknown',
        readyState: this.eventSource?.readyState,
        url: this.eventSource?.url,
        reconnectAttempts: this.reconnectAttempts,
        isManualDisconnect: this.isManualDisconnect,
        errorObject: error,
        timestamp: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
        connectionState: typeof navigator !== 'undefined' ? (navigator as any).connection?.effectiveType : 'N/A'
      };
      
      // Only log errors if we haven't exceeded max retry attempts
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        console.warn('Real-time connection error (will retry):', errorDetails);
      } else {
        console.error('Real-time connection error (max retries reached):', errorDetails);
      }
      
      // Log additional debugging information
      if (this.eventSource) {
        console.warn('EventSource state:', {
          readyState: this.eventSource.readyState,
          url: this.eventSource.url,
          withCredentials: this.eventSource.withCredentials
        });
      }
      
      this.handleError(error);
      
      if (!this.isManualDisconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      } else {
        // Notify disconnect callbacks with error handling
        this.disconnectCallbacks.forEach(callback => {
          try {
            callback();
          } catch (callbackError) {
            console.error('Error in disconnect callback:', callbackError);
          }
        });
      }
    };
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimeout = setTimeout(() => {
      if (!this.isManualDisconnect) {
        this.connect();
      }
    }, delay);
  }

  private cleanup(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  private handleError(error: Event): void {
    const errorInfo = {
      type: error?.type || 'unknown',
      readyState: this.eventSource?.readyState,
      url: this.eventSource?.url,
      reconnectAttempts: this.reconnectAttempts,
      isManualDisconnect: this.isManualDisconnect,
      timestamp: new Date().toISOString(),
      errorObject: error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined
    };
    
    // Only log warnings for non-critical errors
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      console.warn('Real-time service error (will retry):', errorInfo);
    } else {
      console.error('Real-time service error (max retries reached):', errorInfo);
    }
    
    // Notify error callbacks with proper error handling
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (callbackError) {
        console.error('Error in error callback:', callbackError);
      }
    });
  }
}

// Create singleton instance
export const realtimeService = new RealtimeServiceImpl();

// Export factory function for testing
export const createRealtimeService = (url?: string): RealtimeService => {
  return new RealtimeServiceImpl(url);
};
