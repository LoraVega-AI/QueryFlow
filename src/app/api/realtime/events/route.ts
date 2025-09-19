// Server-Sent Events API for Real-time Project Updates
// Provides real-time updates for project changes

import { NextRequest } from 'next/server';
import { addConnection, removeConnection } from '@/utils/realtimeBroadcast';

export async function GET(request: NextRequest) {
  // Create a readable stream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      // Add this connection to the set
      addConnection(controller);
      
      // Send initial connection message
      const welcomeMessage = {
        type: 'connected',
        data: { message: 'Connected to real-time updates' },
        timestamp: Date.now()
      };
      
      controller.enqueue(new TextEncoder().encode(
        `data: ${JSON.stringify(welcomeMessage)}\n\n`
      ));
      
      // Send ping every 30 seconds to keep connection alive
      const pingInterval = setInterval(() => {
        try {
          const pingMessage = {
            type: 'ping',
            data: { message: 'ping' },
            timestamp: Date.now()
          };
          
          controller.enqueue(new TextEncoder().encode(
            `data: ${JSON.stringify(pingMessage)}\n\n`
          ));
        } catch (error) {
          console.error('Failed to send ping:', error);
          clearInterval(pingInterval);
          removeConnection(controller);
        }
      }, 30000);
      
      // Clean up on close
      request.signal.addEventListener('abort', () => {
        clearInterval(pingInterval);
        removeConnection(controller);
        try {
          controller.close();
        } catch (error) {
          // Connection already closed
        }
      });
      
      // Store controller reference for cancel
      (controller as any).__pingInterval = pingInterval;
    },
    
    cancel(controller) {
      removeConnection(controller);
      if ((controller as any).__pingInterval) {
        clearInterval((controller as any).__pingInterval);
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}
