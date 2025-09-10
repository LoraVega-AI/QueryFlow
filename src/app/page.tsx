'use client';

// Main page component for QueryFlow
// This component integrates all the core functionality and manages application state

import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { SchemaDesigner } from '@/components/SchemaDesigner';
import { QueryRunner } from '@/components/QueryRunner';
import { ResultsViewer } from '@/components/ResultsViewer';
import { DataEditor } from '@/components/DataEditor';
import { Analytics } from '@/components/Analytics';
import { WorkflowManager } from '@/components/WorkflowManager';
import { AdvancedSearch } from '@/components/AdvancedSearch';
import { ExportImportManager } from '@/components/ExportImportManager';
import { DataValidationManager } from '@/components/DataValidationManager';
import { QueryOptimizationManager } from '@/components/QueryOptimizationManager';
import { CloudStorageManager } from '@/components/CloudStorageManager';
import { CollaborationManager } from '@/components/CollaborationManager';
import { DatabaseSchema, QueryResult, QueryError, DatabaseRecord } from '@/types/database';
import { StorageManager } from '@/utils/storage';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('designer');
  const [schema, setSchema] = useState<DatabaseSchema | null>(null);
  const [records, setRecords] = useState<DatabaseRecord[]>([]);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryError, setQueryError] = useState<QueryError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Mock current user for collaboration
  const [currentUser] = useState({
    id: 'user_1',
    name: 'Demo User',
    email: 'demo@queryflow.dev',
    role: {
      id: 'editor',
      name: 'Editor',
      description: 'Can edit schemas and data',
      level: 2,
      permissions: ['read', 'write', 'comment'],
      isSystem: true,
      color: '#10B981'
    },
    status: 'online' as const,
    lastSeen: new Date(),
    permissions: [],
    preferences: {
      theme: 'light' as const,
      language: 'en',
      timezone: 'UTC',
      notifications: {
        email: true,
        browser: true,
        desktop: false,
        mobile: false,
        frequency: 'immediate' as const,
        types: []
      },
      collaboration: {
        showCursors: true,
        showPresence: true,
        showComments: true,
        autoSave: true,
        conflictResolution: 'manual' as const
      },
      privacy: {
        sharePresence: true,
        shareActivity: true,
        allowMentions: true,
        allowDirectMessages: true
      }
    },
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Load schema and records from localStorage on component mount
  useEffect(() => {
    const savedSchema = StorageManager.loadSchema();
    if (savedSchema) {
      setSchema(savedSchema);
    } else {
      // Create a default schema if none exists
      const defaultSchema: DatabaseSchema = {
        id: 'default_schema',
        name: 'My Database',
        tables: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };
      setSchema(defaultSchema);
    }

    // Load records
    const savedRecords = StorageManager.loadRecords();
    setRecords(savedRecords);
  }, []);

  // Save schema to localStorage whenever it changes
  useEffect(() => {
    if (schema) {
      StorageManager.saveSchema(schema);
    }
  }, [schema]);

  // Save records to localStorage whenever they change
  useEffect(() => {
    StorageManager.saveRecords(records);
  }, [records]);

  // Handle schema changes
  const handleSchemaChange = useCallback((newSchema: DatabaseSchema) => {
    setSchema(newSchema);
  }, []);

  // Handle records changes
  const handleRecordsChange = useCallback((newRecords: DatabaseRecord[]) => {
    setRecords(newRecords);
  }, []);

  // Handle query results
  const handleQueryResult = useCallback((result: QueryResult | null, error: QueryError | null) => {
    setQueryResult(result);
    setQueryError(error);
    setIsLoading(false);
  }, []);

  // Handle query execution start
  const handleQueryStart = useCallback(() => {
    setIsLoading(true);
    setQueryResult(null);
    setQueryError(null);
  }, []);

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'designer':
        return (
          <SchemaDesigner
            schema={schema}
            onSchemaChange={handleSchemaChange}
          />
        );
      case 'query':
        return (
          <div className="flex h-full">
            <div className="flex-1">
              <QueryRunner
                schema={schema}
                onQueryResult={handleQueryResult}
              />
            </div>
            <div className="w-1/2 border-l border-gray-700">
              <ResultsViewer
                result={queryResult}
                error={queryError}
                isLoading={isLoading}
              />
            </div>
          </div>
        );
      case 'data':
        return (
          <DataEditor schema={schema} />
        );
      case 'export':
        return (
          <ExportImportManager
            schema={schema}
            records={records}
            onSchemaChange={handleSchemaChange}
            onRecordsChange={handleRecordsChange}
          />
        );
      case 'validation':
        return (
          <DataValidationManager
            schema={schema}
            records={records}
            onSchemaChange={handleSchemaChange}
          />
        );
      case 'optimization':
        return (
          <QueryOptimizationManager
            schema={schema}
            onSchemaChange={handleSchemaChange}
          />
        );
      case 'cloud':
        return (
          <CloudStorageManager
            schema={schema}
            onSchemaChange={handleSchemaChange}
          />
        );
      case 'collaboration':
        return (
          <CollaborationManager
            schema={schema}
            workspaceId="default"
            currentUser={currentUser}
            onSchemaChange={handleSchemaChange}
          />
        );
      case 'analytics':
        return (
          <Analytics schema={schema} />
        );
      case 'workflow':
        return (
          <WorkflowManager schema={schema} />
        );
      case 'search':
        return (
          <AdvancedSearch schema={schema} />
        );
      default:
        return null;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}