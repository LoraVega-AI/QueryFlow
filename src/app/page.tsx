'use client';

// Main page component for QueryFlow
// This component integrates all the core functionality and manages application state

import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { SchemaDesigner } from '@/components/SchemaDesigner';
import { QueryRunner } from '@/components/QueryRunner';
import { ResultsViewer } from '@/components/ResultsViewer';
import { DataEditor } from '@/components/DataEditor';
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
          <div className="flex items-center justify-center h-full bg-gray-900">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-gray-400">📈</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Analytics</h3>
              <p className="text-gray-300">Coming soon - Database analytics and insights</p>
            </div>
          </div>
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