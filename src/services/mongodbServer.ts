// Server-side only MongoDB operations
// This file should only be imported on the server side

import { MongoClient, Db, Collection } from 'mongodb';

export class MongoDBServer {
  private static clients: Map<string, MongoClient> = new Map();

  /**
   * Get MongoDB client (server-side only)
   */
  static async getClient(connectionString: string): Promise<MongoClient> {
    if (typeof window !== 'undefined') {
      throw new Error('MongoDB operations are not supported in the browser');
    }

    if (this.clients.has(connectionString)) {
      const client = this.clients.get(connectionString)!;
      try {
        await client.db().admin().ping();
        return client;
      } catch (error) {
        // Connection lost, remove and recreate
        this.clients.delete(connectionString);
      }
    }

    const client = new MongoClient(connectionString, {
      maxPoolSize: 10,
      connectTimeoutMS: 30000,
      serverSelectionTimeoutMS: 30000,
    });

    await client.connect();
    this.clients.set(connectionString, client);
    return client;
  }

  /**
   * Get database instance
   */
  static async getDatabase(connectionString: string, dbName?: string): Promise<Db> {
    const client = await this.getClient(connectionString);
    return client.db(dbName);
  }

  /**
   * Get collection instance
   */
  static async getCollection(connectionString: string, collectionName: string, dbName?: string): Promise<Collection> {
    const db = await this.getDatabase(connectionString, dbName);
    return db.collection(collectionName);
  }

  /**
   * Close all connections
   */
  static async closeAll(): Promise<void> {
    for (const [connectionString, client] of this.clients) {
      try {
        await client.close();
      } catch (error) {
        console.error(`Error closing MongoDB connection ${connectionString}:`, error);
      }
    }
    this.clients.clear();
  }

  /**
   * Close specific connection
   */
  static async close(connectionString: string): Promise<void> {
    const client = this.clients.get(connectionString);
    if (client) {
      try {
        await client.close();
        this.clients.delete(connectionString);
      } catch (error) {
        console.error(`Error closing MongoDB connection ${connectionString}:`, error);
      }
    }
  }
}
