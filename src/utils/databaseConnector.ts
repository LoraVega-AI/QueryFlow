// Database Connector Utility
// Handles database connection testing and validation

import { SchemaIntrospectionService } from '@/services/schemaIntrospectionService';
import { DatabaseSchema } from '@/types/database';

export class DatabaseConnector {
  static async testConnection(type: string, config: any): Promise<{ success: boolean; error?: string; latency?: number }> {
    const startTime = Date.now();
    
    try {
      // For now, we'll assume all SQLite files are valid
      // In a real implementation, this would test the actual connection
      if (type === 'sqlite') {
        const latency = Date.now() - startTime;
        return { success: true, latency };
      }
      
      const latency = Date.now() - startTime;
      return { success: false, error: 'Unsupported database type', latency };
    } catch (error) {
      const latency = Date.now() - startTime;
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        latency
      };
    }
  }

  static async introspectSchema(type: string, config: any): Promise<DatabaseSchema> {
    try {
      return await SchemaIntrospectionService.introspectSchema(type as any, config);
    } catch (error) {
      console.error('Schema introspection failed:', error);
      throw error;
    }
  }
}