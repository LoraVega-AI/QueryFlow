// Real-time Data Streaming Utility
// Provides WebSocket-based real-time data updates and live collaboration

export interface DataStreamEvent {
  type: 'data_update' | 'user_activity' | 'collaboration' | 'error' | 'connection_status';
  tableName?: string;
  recordId?: string;
  operation?: 'insert' | 'update' | 'delete';
  data?: any;
  userId?: string;
  userName?: string;
  timestamp: Date;
  message?: string;
}

export interface UserActivity {
  userId: string;
  userName: string;
  tableName: string;
  operation: string;
  recordId?: string;
  timestamp: Date;
  cursor?: { x: number; y: number };
}

export interface CollaborationState {
  activeUsers: Map<string, UserActivity>;
  lastActivity: Date;
  isConnected: boolean;
}

export class RealtimeDataStream {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private eventListeners: Map<string, ((event: DataStreamEvent) => void)[]> = new Map();
  private collaborationState: CollaborationState = {
    activeUsers: new Map(),
    lastActivity: new Date(),
    isConnected: false
  };

  constructor(private serverUrl: string = 'ws://localhost:8080/ws') {}

  // Connect to WebSocket server
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.serverUrl);
        
        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.collaborationState.isConnected = true;
          this.reconnectAttempts = 0;
          this.emit('connection_status', { 
            type: 'connection_status', 
            message: 'Connected to real-time data stream',
            timestamp: new Date()
          });
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.collaborationState.isConnected = false;
          this.emit('connection_status', { 
            type: 'connection_status', 
            message: 'Disconnected from real-time data stream',
            timestamp: new Date()
          });
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.emit('error', { 
            type: 'error', 
            message: 'WebSocket connection error',
            timestamp: new Date()
          });
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  // Disconnect from WebSocket
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.collaborationState.isConnected = false;
  }

  // Subscribe to table updates
  subscribeToTable(tableName: string): void {
    this.send({
      type: 'subscribe',
      tableName,
      timestamp: new Date()
    });
  }

  // Unsubscribe from table updates
  unsubscribeFromTable(tableName: string): void {
    this.send({
      type: 'unsubscribe',
      tableName,
      timestamp: new Date()
    });
  }

  // Send data update
  sendDataUpdate(tableName: string, operation: 'insert' | 'update' | 'delete', recordId: string, data?: any): void {
    this.send({
      type: 'data_update',
      tableName,
      operation,
      recordId,
      data,
      timestamp: new Date()
    });
  }

  // Send user activity
  sendUserActivity(tableName: string, operation: string, recordId?: string, cursor?: { x: number; y: number }): void {
    const activity: UserActivity = {
      userId: this.getCurrentUserId(),
      userName: this.getCurrentUserName(),
      tableName,
      operation,
      recordId,
      timestamp: new Date(),
      cursor
    };

    this.collaborationState.activeUsers.set(activity.userId, activity);
    this.collaborationState.lastActivity = new Date();

    this.send({
      type: 'user_activity',
      ...activity,
      timestamp: new Date()
    });
  }

  // Add event listener
  on(eventType: string, callback: (event: DataStreamEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(callback);
  }

  // Remove event listener
  off(eventType: string, callback: (event: DataStreamEvent) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Get collaboration state
  getCollaborationState(): CollaborationState {
    return { ...this.collaborationState };
  }

  // Get active users for a table
  getActiveUsersForTable(tableName: string): UserActivity[] {
    return Array.from(this.collaborationState.activeUsers.values())
      .filter(user => user.tableName === tableName);
  }

  // Simulate real-time data updates (for demo purposes)
  simulateDataUpdates(tableName: string, interval: number = 5000): void {
    const simulateUpdate = () => {
      if (this.collaborationState.isConnected) {
        // Simulate random data updates
        const operations: ('insert' | 'update' | 'delete')[] = ['insert', 'update', 'update', 'update'];
        const operation = operations[Math.floor(Math.random() * operations.length)];
        const recordId = `record_${Math.floor(Math.random() * 1000)}`;
        
        const mockData = {
          id: recordId,
          name: `Updated Record ${Math.floor(Math.random() * 100)}`,
          timestamp: new Date().toISOString(),
          value: Math.floor(Math.random() * 1000)
        };

        this.emit('data_update', {
          type: 'data_update',
          tableName,
          operation,
          recordId,
          data: mockData,
          timestamp: new Date()
        });
      }
    };

    setInterval(simulateUpdate, interval);
  }

  // Private methods
  private send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private handleMessage(data: any): void {
    const event: DataStreamEvent = {
      type: data.type,
      tableName: data.tableName,
      recordId: data.recordId,
      operation: data.operation,
      data: data.data,
      userId: data.userId,
      userName: data.userName,
      timestamp: new Date(data.timestamp),
      message: data.message
    };

    // Update collaboration state
    if (data.type === 'user_activity' && data.userId) {
      this.collaborationState.activeUsers.set(data.userId, {
        userId: data.userId,
        userName: data.userName,
        tableName: data.tableName,
        operation: data.operation,
        recordId: data.recordId,
        timestamp: new Date(data.timestamp),
        cursor: data.cursor
      });
      this.collaborationState.lastActivity = new Date();
    }

    this.emit(data.type, event);
  }

  private emit(eventType: string, event: DataStreamEvent): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => callback(event));
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect().catch(error => {
          console.error('Reconnection failed:', error);
        });
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
      this.emit('error', { 
        type: 'error', 
        message: 'Failed to reconnect to real-time data stream',
        timestamp: new Date()
      });
    }
  }

  private getCurrentUserId(): string {
    // In a real app, this would come from authentication
    return 'user_' + Math.floor(Math.random() * 1000);
  }

  private getCurrentUserName(): string {
    // In a real app, this would come from authentication
    const names = ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Wilson', 'David Brown'];
    return names[Math.floor(Math.random() * names.length)];
  }
}

// Singleton instance
export const realtimeDataStream = new RealtimeDataStream();
