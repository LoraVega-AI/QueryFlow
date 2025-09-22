// Hook for Real-time Project Updates
// Manages real-time connection and project updates

import { useEffect, useCallback, useRef } from 'react';
import { realtimeService, RealtimeMessage } from '../services/realtimeService';

export interface UseRealtimeUpdatesOptions {
  onProjectCreated?: (data: any) => void;
  onProjectUpdated?: (data: any) => void;
  onProjectDeleted?: (data: any) => void;
  onProjectSynced?: (data: any) => void;
  onError?: (error: Event) => void;
  autoConnect?: boolean;
}

export function useRealtimeUpdates(options: UseRealtimeUpdatesOptions = {}) {
  const {
    onProjectCreated,
    onProjectUpdated,
    onProjectDeleted,
    onProjectSynced,
    onError,
    autoConnect = true
  } = options;

  const isConnectedRef = useRef(false);

  const handleMessage = useCallback((message: RealtimeMessage) => {
    switch (message.type) {
      case 'project_created':
        onProjectCreated?.(message.data);
        break;
      case 'project_updated':
        onProjectUpdated?.(message.data);
        break;
      case 'project_deleted':
        onProjectDeleted?.(message.data);
        break;
      case 'project_synced':
        onProjectSynced?.(message.data);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }, [onProjectCreated, onProjectUpdated, onProjectDeleted, onProjectSynced]);

  const handleConnect = useCallback(() => {
    console.log('Real-time connection established');
    isConnectedRef.current = true;
  }, []);

  const handleDisconnect = useCallback(() => {
    console.log('Real-time connection lost');
    isConnectedRef.current = false;
  }, []);

  const handleError = useCallback((error: Event) => {
    const errorInfo = {
      type: error?.type || 'unknown',
      timestamp: new Date().toISOString(),
      isConnected: isConnectedRef.current,
      errorObject: error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined
    };
    
    console.error('Real-time connection error:', errorInfo);
    onError?.(error);
  }, [onError]);

  // Connect to real-time updates
  const connect = useCallback(async () => {
    if (!isConnectedRef.current && typeof window !== 'undefined') {
      await realtimeService.connect();
    }
  }, []);

  // Disconnect from real-time updates
  const disconnect = useCallback(() => {
    if (isConnectedRef.current) {
      realtimeService.disconnect();
    }
  }, []);

  // Check connection status
  const isConnected = useCallback(() => {
    return realtimeService.isConnected();
  }, []);

  // Set up event listeners
  useEffect(() => {
    realtimeService.onMessage(handleMessage);
    realtimeService.onConnect(handleConnect);
    realtimeService.onDisconnect(handleDisconnect);
    realtimeService.onError(handleError);

    return () => {
      // Clean up event listeners
      realtimeService.disconnect();
    };
  }, [handleMessage, handleConnect, handleDisconnect, handleError]);

  // Auto-connect if enabled
  useEffect(() => {
    if (autoConnect && typeof window !== 'undefined') {
      connect().catch(error => {
        console.error('Auto-connect failed:', error);
      });
    }

    return () => {
      if (typeof window !== 'undefined') {
        disconnect();
      }
    };
  }, [autoConnect, connect, disconnect]);

  return {
    connect,
    disconnect,
    isConnected
  };
}
