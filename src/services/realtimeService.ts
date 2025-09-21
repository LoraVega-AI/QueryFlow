// Real-time Service for Project Updates
// Uses Server-Sent Events (SSE) for real-time updates

export interface RealtimeMessage {
  type: 'project_created' | 'project_updated' | 'project_deleted' | 'project_synced' | 'error';
  data?: any;
  timestamp: number;
}

export interface RealtimeService {
  connect: () => void;
  disconnect: () => void;
  isConnected: () => boolean;
  onMessage: (callback: (message: RealtimeMessage) => void) => void;
  onConnect: (callback: () => void) => void;
  onDisconnect: (callback: () => void) => void;
  onError: (callback: (error: Event) => void) => void;
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

  constructor(private url: string = '/api/realtime/events') {}

  connect(): void {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
      console.warn('EventSource not available in this environment');
      return;
    }

    if (this.eventSource?.readyState === EventSource.OPEN) {
      console.log('EventSource already connected');
      return;
    }

    try {
      console.log('Connecting to real-time service:', this.url);
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
      console.error('Real-time connection error:', {
        type: error.type,
        readyState: this.eventSource?.readyState,
        url: this.eventSource?.url,
        reconnectAttempts: this.reconnectAttempts,
        isManualDisconnect: this.isManualDisconnect
      });
      this.handleError(error);
      
      if (!this.isManualDisconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      } else {
        this.disconnectCallbacks.forEach(callback => callback());
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
      type: error.type,
      readyState: this.eventSource?.readyState,
      url: this.eventSource?.url,
      reconnectAttempts: this.reconnectAttempts,
      isManualDisconnect: this.isManualDisconnect,
      timestamp: new Date().toISOString()
    };
    
    // Only log warnings for non-critical errors
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      console.warn('Real-time service error (will retry):', errorInfo);
    } else {
      console.error('Real-time service error (max retries reached):', errorInfo);
    }
    
    this.errorCallbacks.forEach(callback => callback(error));
  }
}

// Create singleton instance
export const realtimeService = new RealtimeServiceImpl();

// Export factory function for testing
export const createRealtimeService = (url?: string): RealtimeService => {
  return new RealtimeServiceImpl(url);
};
