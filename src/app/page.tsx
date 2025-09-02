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
import { DatabaseSchema, QueryResult, QueryError } from '@/types/database';
import { StorageManager } from '@/utils/storage';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('designer');
  const [schema, setSchema] = useState<DatabaseSchema | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryError, setQueryError] = useState<QueryError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load schema from localStorage on component mount
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
  }, []);

  // Save schema to localStorage whenever it changes
  useEffect(() => {
    if (schema) {
      StorageManager.saveSchema(schema);
    }
  }, [schema]);

  // Handle schema changes
  const handleSchemaChange = useCallback((newSchema: DatabaseSchema) => {
    setSchema(newSchema);
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