// Database Connector Utility
// Handles database connection testing and validation

import { SchemaIntrospectionService } from '@/services/schemaIntrospectionService';
import { DatabaseSchema } from '@/types/database';

export class DatabaseConnector {
  static async testConnection(type: string, config: any): Promise<{ success: boolean; error?: string }> {
    try {
      // For now, we'll assume all SQLite files are valid
      // In a real implementation, this would test the actual connection
      if (type === 'sqlite') {
        return { success: true };
      }
      
      return { success: false, error: 'Unsupported database type' };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
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