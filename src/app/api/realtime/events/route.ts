// Real-time events API endpoint for Server-Sent Events
// GET /api/realtime/events

import { NextRequest } from 'next/server';
import { addConnection, removeConnection } from '@/utils/realtimeBroadcast';

export async function GET(request: NextRequest) {
  console.log('🔌 Real-time events endpoint called');
  
  // Set up Server-Sent Events headers
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  });

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      console.log('📡 New real-time connection established');
      
      // Add this connection to the broadcast system
      addConnection(controller);
      
      // Send initial connection message
      const initialMessage = {
        type: 'connected',
        data: {
          message: 'Real-time connection established',
          timestamp: Date.now()
        },
        timestamp: Date.now()
      };
      
      try {
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify(initialMessage)}\n\n`)
        );
      } catch (error) {
        console.error('Failed to send initial message:', error);
      }
      
      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        console.log('📡 Real-time connection closed by client');
        removeConnection(controller);
        
        try {
          controller.close();
        } catch (error) {
          console.error('Error closing controller:', error);
        }
      });
      
      // Keep connection alive with periodic heartbeat
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = {
            type: 'heartbeat',
            data: {
              timestamp: Date.now(),
              connections: getConnectionCount()
            },
            timestamp: Date.now()
          };
          
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify(heartbeat)}\n\n`)
          );
        } catch (error) {
          console.error('Failed to send heartbeat:', error);
          clearInterval(heartbeatInterval);
          removeConnection(controller);
        }
      }, 30000); // Send heartbeat every 30 seconds
      
      // Clean up interval when connection closes
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
      });
    },
    
    cancel() {
      console.log('📡 Real-time connection cancelled');
      // Clean up connection when cancelled
    }
  });

  return new Response(stream, { headers });
}

// Handle OPTIONS request for CORS
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}

// Helper function to get connection count
function getConnectionCount(): number {
  // This would normally be imported from the broadcast utility
  // For now, we'll return a placeholder
  return 1;
}