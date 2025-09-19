// WebSocket Service for Real-time Updates
// Handles WebSocket connections and real-time project updates

export interface WebSocketMessage {
  type: 'project_created' | 'project_updated' | 'project_deleted' | 'project_synced' | 'ping' | 'pong';
  data?: any;
  timestamp: number;
}

export interface WebSocketService {
  connect: () => void;
  disconnect: () => void;
  isConnected: () => boolean;
  sendMessage: (message: WebSocketMessage) => void;
  onMessage: (callback: (message: WebSocketMessage) => void) => void;
  onConnect: (callback: () => void) => void;
  onDisconnect: (callback: () => void) => void;
  onError: (callback: (error: Event) => void) => void;
}

class WebSocketServiceImpl implements WebSocketService {
  private ws: WebSocket | null = null;
  private messageCallbacks: ((message: WebSocketMessage) => void)[] = [];
  private connectCallbacks: (() => void)[] = [];
  private disconnectCallbacks: (() => void)[] = [];
  private errorCallbacks: ((error: Event) => void)[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private pingInterval: NodeJS.Timeout | null = null;
  private isManualDisconnect = false;

  constructor(private url: string = 'ws://localhost:3001') {}

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = new WebSocket(this.url);
      this.setupEventListeners();
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.handleError(error as Event);
    }
  }

  disconnect(): void {
    this.isManualDisconnect = true;
    this.cleanup();
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  sendMessage(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message);
    }
  }

  onMessage(callback: (message: WebSocketMessage) => void): void {
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
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.isManualDisconnect = false;
      this.startPing();
      this.connectCallbacks.forEach(callback => callback());
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        // Handle pong messages
        if (message.type === 'pong') {
          return;
        }

        console.log('WebSocket message received:', message);
        this.messageCallbacks.forEach(callback => callback(message));
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      this.cleanup();
      
      if (!this.isManualDisconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      } else {
        this.disconnectCallbacks.forEach(callback => callback());
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.handleError(error);
    };
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (!this.isManualDisconnect) {
        this.connect();
      }
    }, delay);
  }

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.sendMessage({
          type: 'ping',
          timestamp: Date.now()
        });
      }
    }, 30000); // Ping every 30 seconds
  }

  private cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private handleError(error: Event): void {
    this.errorCallbacks.forEach(callback => callback(error));
  }
}

// Create singleton instance
export const websocketService = new WebSocketServiceImpl();

// Export factory function for testing
export const createWebSocketService = (url?: string): WebSocketService => {
  return new WebSocketServiceImpl(url);
};
