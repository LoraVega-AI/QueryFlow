// Real-Time Data Stream for Live Search Updates
// Provides WebSocket-like functionality for real-time search result streaming

export interface StreamEvent {
  id: string;
  type: 'search_start' | 'search_progress' | 'search_result' | 'search_complete' | 'search_error' | 'suggestion' | 'expansion' | 'insight';
  timestamp: number;
  data: any;
  query?: string;
  sessionId?: string;
  progress?: number;
  error?: string;
}

export interface StreamSubscription {
  id: string;
  eventTypes: string[];
  callback: (event: StreamEvent) => void;
  active: boolean;
  createdAt: number;
}

export interface StreamSession {
  id: string;
  userId?: string;
  active: boolean;
  subscriptions: Map<string, StreamSubscription>;
  lastActivity: number;
  createdAt: number;
}

export interface DataStreamEvent {
  tableName?: string;
  operation?: string;
  userId?: string;
  userName?: string;
  recordId?: string;
  timestamp?: Date;
  message?: string;
  data?: any;
}

export interface UserActivity {
  userId: string;
  userName: string;
  tableName: string;
  operation: string;
  recordId?: string;
  timestamp?: Date;
  cursor?: any;
}

export class RealTimeDataStream {
  private static instance: RealTimeDataStream;
  private sessions: Map<string, StreamSession> = new Map();
  private eventQueue: StreamEvent[] = [];
  private isProcessing = false;

  private constructor() {
    this.startHeartbeat();
  }

  static getInstance(): RealTimeDataStream {
    if (!RealTimeDataStream.instance) {
      RealTimeDataStream.instance = new RealTimeDataStream();
    }
    return RealTimeDataStream.instance;
  }

  // Create a new streaming session
  createSession(userId?: string): StreamSession {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: StreamSession = {
      id: sessionId,
      userId,
      active: true,
      subscriptions: new Map(),
      lastActivity: Date.now(),
      createdAt: Date.now()
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  // Subscribe to specific event types
  subscribe(
    sessionId: string,
    eventTypes: string[],
    callback: (event: StreamEvent) => void
  ): string | null {
    const session = this.sessions.get(sessionId);
    if (!session || !session.active) {
      return null;
    }

    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const subscription: StreamSubscription = {
      id: subscriptionId,
      eventTypes,
      callback,
      active: true,
      createdAt: Date.now()
    };

    session.subscriptions.set(subscriptionId, subscription);
    session.lastActivity = Date.now();

    return subscriptionId;
  }

  // Publish an event to all relevant subscribers
  publish(event: Omit<StreamEvent, 'id' | 'timestamp'>): void {
    const streamEvent: StreamEvent = {
      ...event,
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    this.eventQueue.push(streamEvent);
    this.processEventQueue();
  }

  // Process the event queue
  private async processEventQueue(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) return;

    this.isProcessing = true;

    try {
      const batch = this.eventQueue.splice(0, 10);
      for (const event of batch) {
        await this.deliverEvent(event);
      }
    } catch (error) {
      console.error('Error processing event queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Deliver event to all relevant sessions
  private async deliverEvent(event: StreamEvent): Promise<void> {
    const activeSessions = Array.from(this.sessions.values()).filter(session => session.active);

    for (const session of activeSessions) {
      const relevantSubscriptions = Array.from(session.subscriptions.values())
        .filter(sub => sub.active && sub.eventTypes.includes(event.type));

      for (const subscription of relevantSubscriptions) {
        try {
          subscription.callback(event);
          session.lastActivity = Date.now();
        } catch (error) {
          console.error('Error delivering event:', error);
        }
      }
    }
  }

  // Start heartbeat to keep sessions alive
  private startHeartbeat(): void {
    setInterval(() => {
      this.publish({
        type: 'search_start',
        data: { type: 'heartbeat' }
      });
    }, 30000);
  }

  // Close a session
  closeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.active = false;
    session.subscriptions.clear();
    this.sessions.delete(sessionId);
    return true;
  }

  // Get session statistics
  getSessionStats(): {
    totalSessions: number;
    activeSessions: number;
    queuedEvents: number;
  } {
    const activeSessions = Array.from(this.sessions.values()).filter(session => session.active);

    return {
      totalSessions: this.sessions.size,
      activeSessions: activeSessions.length,
      queuedEvents: this.eventQueue.length
    };
  }

  // Additional methods for DataEditor compatibility
  async connect(): Promise<void> {
    // Mock connection - in a real implementation this would connect to a WebSocket
    console.log('RealTimeDataStream connected');
  }

  disconnect(): void {
    // Mock disconnection
    console.log('RealTimeDataStream disconnected');
  }

  subscribeToTable(tableName: string): void {
    // Mock table subscription
    console.log(`Subscribed to table: ${tableName}`);
  }

  on(eventType: string, callback: (event: DataStreamEvent) => void): void {
    // Mock event listener - in a real implementation this would set up event listeners
    console.log(`Event listener added for: ${eventType}`);
  }

  simulateDataUpdates(tableName: string, interval: number): void {
    // Mock data simulation
    console.log(`Simulating data updates for table: ${tableName} every ${interval}ms`);
  }

  sendUserActivity(tableName: string, operation: string, recordId?: string): void {
    // Mock user activity sending
    console.log(`User activity: ${operation} on ${tableName}${recordId ? ` (record: ${recordId})` : ''}`);
  }
}

// Export singleton instance
export const realTimeDataStream = RealTimeDataStream.getInstance();
export const realtimeDataStream = RealTimeDataStream.getInstance();