// Server-Sent Events API for Real-time Project Updates
// Provides real-time updates for project changes

import { NextRequest } from 'next/server';
import { addConnection, removeConnection } from '@/utils/realtimeBroadcast';

export async function GET(request: NextRequest) {
  console.log('Real-time events endpoint called:', {
    url: request.url,
    headers: Object.fromEntries(request.headers.entries()),
    timestamp: new Date().toISOString()
  });

  // Create a readable stream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      console.log('Real-time connection started');
      
      // Add this connection to the set
      addConnection(controller);
      
      // Send initial connection message
      const welcomeMessage = {
        type: 'connected',
        data: { message: 'Connected to real-time updates' },
        timestamp: Date.now()
      };
      
      try {
        controller.enqueue(new TextEncoder().encode(
          `data: ${JSON.stringify(welcomeMessage)}\n\n`
        ));
        console.log('Welcome message sent to client');
      } catch (error) {
        console.error('Failed to send welcome message:', error);
      }
      
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
          console.log('Ping sent to client');
        } catch (error) {
          console.error('Failed to send ping:', error);
          clearInterval(pingInterval);
          removeConnection(controller);
        }
      }, 30000);
      
      // Clean up on close
      request.signal.addEventListener('abort', () => {
        console.log('Real-time connection aborted');
        clearInterval(pingInterval);
        removeConnection(controller);
        try {
          controller.close();
          console.log('Real-time connection closed');
        } catch (error) {
          console.log('Connection already closed:', error);
        }
      });
      
      // Store controller reference for cancel
      (controller as any).__pingInterval = pingInterval;
    },
    
    cancel(controller) {
      console.log('Real-time connection cancelled');
      removeConnection(controller);
      if ((controller as any).__pingInterval) {
        clearInterval((controller as any).__pingInterval);
        console.log('Ping interval cleared');
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
