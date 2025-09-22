// Real-time broadcast utility for Server-Sent Events
// Provides real-time updates for project changes

// Store active connections
const connections = new Set<ReadableStreamDefaultController>();

// Broadcast message to all connected clients
export function broadcastMessage(message: any) {
  const data = `data: ${JSON.stringify(message)}\n\n`;
  
  connections.forEach(controller => {
    try {
      controller.enqueue(new TextEncoder().encode(data));
    } catch (error) {
      console.error('Failed to send message to client:', error);
      connections.delete(controller);
    }
  });
}

// Add connection to the set
export function addConnection(controller: ReadableStreamDefaultController) {
  connections.add(controller);
  console.log('Real-time connection added. Total connections:', connections.size);
}

// Remove connection from the set
export function removeConnection(controller: ReadableStreamDefaultController) {
  connections.delete(controller);
  console.log('Real-time connection removed. Total connections:', connections.size);
}

// Get connection count
export function getConnectionCount(): number {
  return connections.size;
}
