// System Catalog Extractor Component
// Provides UI for testing system catalog extraction functionality

import React, { useState } from 'react';

interface SystemCatalogResult {
  tables: any[];
  views: any[];
  indexes: any[];
  triggers: any[];
  sequences: any[];
  functions: any[];
  procedures: any[];
  metadata: {
    databaseType: string;
    version: string;
    encoding?: string;
    collation?: string;
    timezone?: string;
    extractedAt: string;
  };
}

interface ExtractionSummary {
  tables: number;
  views: number;
  indexes: number;
  triggers: number;
  sequences: number;
  functions: number;
  procedures: number;
}

export function SystemCatalogExtractor() {
  const [databaseType, setDatabaseType] = useState<'postgresql' | 'mysql' | 'sqlite' | 'mongodb'>('sqlite');
  const [connectionInfo, setConnectionInfo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SystemCatalogResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ExtractionSummary | null>(null);
  const [selectedTable, setSelectedTable] = useState<any>(null);

  const handleExtract = async () => {
    if (!connectionInfo.trim()) {
      setError('Please provide connection information');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setSummary(null);

    try {
      let connectionData;
      
      if (databaseType === 'sqlite') {
        connectionData = { filePath: connectionInfo };
      } else {
        connectionData = connectionInfo;
      }

      const response = await fetch('/api/database/system-catalog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          databaseType,
          connectionInfo: connectionData
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract system catalog');
      }

      if (data.success) {
        setResult(data.data);
        setSummary(data.metadata.summary);
        console.log('✅ System catalog extraction successful:', data);
      } else {
        throw new Error(data.error || 'Extraction failed');
      }
    } catch (err) {
      console.error('❌ System catalog extraction failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const getConnectionPlaceholder = () => {
    switch (databaseType) {
      case 'sqlite':
        return 'e.g., /path/to/database.db or ./test.db';
      case 'postgresql':
        return 'e.g., postgresql://user:pass@localhost:5432/dbname';
      case 'mysql':
        return 'e.g., mysql://user:pass@localhost:3306/dbname';
      case 'mongodb':
        return 'e.g., mongodb://localhost:27017/dbname';
      default:
        return 'Enter connection information';
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          🔍 System Catalog Extractor
        </h1>
        <p className="text-gray-600 mb-8">
          Extract comprehensive schema metadata from database system catalogs including tables, views, indexes, triggers, and more.
        </p>

        {/* Configuration Form */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Configuration</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Database Type
              </label>
              <select
                value={databaseType}
                onChange={(e) => setDatabaseType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="sqlite">SQLite</option>
                <option value="postgresql">PostgreSQL</option>
                <option value="mysql">MySQL</option>
                <option value="mongodb">MongoDB</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Connection Information
              </label>
              <input
                type="text"
                value={connectionInfo}
                onChange={(e) => setConnectionInfo(e.target.value)}
                placeholder={getConnectionPlaceholder()}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            onClick={handleExtract}
            disabled={isLoading || !connectionInfo.trim()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? '🔄 Extracting...' : '🔍 Extract System Catalog'}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-400">❌</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Extraction Failed</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Summary */}
        {summary && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-green-400">✅</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Extraction Successful</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>Found {summary.tables} tables, {summary.views} views, {summary.indexes} indexes, {summary.triggers} triggers</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Display */}
        {result && (
          <div className="space-y-6">
            {/* Database Info */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Database Information</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Type:</span> {result.metadata.databaseType}
                </div>
                <div>
                  <span className="font-medium">Version:</span> {result.metadata.version}
                </div>
                {result.metadata.encoding && (
                  <div>
                    <span className="font-medium">Encoding:</span> {result.metadata.encoding}
                  </div>
                )}
                {result.metadata.collation && (
                  <div>
                    <span className="font-medium">Collation:</span> {result.metadata.collation}
                  </div>
                )}
              </div>
            </div>

            {/* Tables */}
            {result.tables.length > 0 && (
              <div className="bg-white border rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Tables ({result.tables.length})
                </h3>
                <div className="space-y-2">
                  {result.tables.map((table, index) => (
                    <div
                      key={index}
                      className="border rounded p-3 cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedTable(selectedTable?.id === table.id ? null : table)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-medium">{table.name}</span>
                          <span className="text-gray-500 ml-2">({table.columns.length} columns)</span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {table.statistics?.rowCount || 0} rows
                        </div>
                      </div>
                      
                      {selectedTable?.id === table.id && (
                        <div className="mt-3 pt-3 border-t">
                          <h4 className="font-medium text-gray-700 mb-2">Columns:</h4>
                          <div className="space-y-1">
                            {table.columns.map((column: any, colIndex: number) => (
                              <div key={colIndex} className="text-sm text-gray-600">
                                <span className="font-mono">{column.name}</span>
                                <span className="text-gray-400 ml-2">({column.type})</span>
                                {column.primaryKey && <span className="ml-2 text-blue-600">PK</span>}
                                {!column.nullable && <span className="ml-2 text-red-600">NOT NULL</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Views */}
            {result.views.length > 0 && (
              <div className="bg-white border rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Views ({result.views.length})
                </h3>
                <div className="space-y-2">
                  {result.views.map((view, index) => (
                    <div key={index} className="border rounded p-3">
                      <div className="font-medium">{view.name}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {view.definition.substring(0, 100)}...
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Indexes */}
            {result.indexes.length > 0 && (
              <div className="bg-white border rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Indexes ({result.indexes.length})
                </h3>
                <div className="space-y-2">
                  {result.indexes.map((index, idx) => (
                    <div key={idx} className="border rounded p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-medium">{index.name}</span>
                          <span className="text-gray-500 ml-2">on {index.tableName}</span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {index.unique ? 'UNIQUE' : 'NON-UNIQUE'} • {index.type}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Other Objects */}
            {(result.triggers.length > 0 || result.sequences.length > 0 || result.functions.length > 0 || result.procedures.length > 0) && (
              <div className="bg-white border rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Other Objects</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {result.triggers.length > 0 && (
                    <div>
                      <span className="font-medium">Triggers:</span> {result.triggers.length}
                    </div>
                  )}
                  {result.sequences.length > 0 && (
                    <div>
                      <span className="font-medium">Sequences:</span> {result.sequences.length}
                    </div>
                  )}
                  {result.functions.length > 0 && (
                    <div>
                      <span className="font-medium">Functions:</span> {result.functions.length}
                    </div>
                  )}
                  {result.procedures.length > 0 && (
                    <div>
                      <span className="font-medium">Procedures:</span> {result.procedures.length}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
