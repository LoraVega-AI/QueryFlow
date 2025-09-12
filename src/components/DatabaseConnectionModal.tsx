'use client';

// Database Connection Modal Component
// Allows users to input database connection details and test the connection

import React, { useState } from 'react';
import { X, Database, TestTube, Loader2, CheckCircle, XCircle, BookOpen, ChevronDown } from 'lucide-react';
import { DATABASE_EXAMPLES } from '../config/databaseExamples';

interface DatabaseCredentials {
  type: 'mysql' | 'postgresql' | 'sqlite';
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  filePath?: string;
}

interface DatabaseConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (connectionId: string, credentials: DatabaseCredentials) => void;
  projectName?: string;
}

export function DatabaseConnectionModal({
  isOpen,
  onClose,
  onConnect,
  projectName
}: DatabaseConnectionModalProps) {
  const [credentials, setCredentials] = useState<DatabaseCredentials>({
    type: 'mysql',
    host: '',
    port: 3306,
    username: '',
    password: '',
    database: '',
    filePath: ''
  });

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    connectionId?: string;
    error?: string;
  } | null>(null);
  const [showExamples, setShowExamples] = useState(false);

  const handleInputChange = (field: keyof DatabaseCredentials, value: string | number) => {
    setCredentials(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear test result when user changes input
    if (testResult) {
      setTestResult(null);
    }
  };

  const handleTypeChange = (type: 'mysql' | 'postgresql' | 'sqlite') => {
    setCredentials(prev => ({
      ...prev,
      type,
      // Reset fields based on type
      port: type === 'mysql' ? 3306 : type === 'postgresql' ? 5432 : undefined,
      host: type === 'sqlite' ? undefined : (prev.host || ''),
      username: type === 'sqlite' ? undefined : (prev.username || ''),
      password: type === 'sqlite' ? undefined : (prev.password || ''),
      database: type === 'sqlite' ? undefined : (prev.database || ''),
      filePath: type === 'sqlite' ? (prev.filePath || ':memory:') : undefined
    }));
    setTestResult(null);
  };

  const loadExample = (example: any) => {
    setCredentials({
      type: example.type,
      ...example.credentials
    });
    setTestResult(null);
    setShowExamples(false);
  };

  const getExamplesForCurrentType = () => {
    return DATABASE_EXAMPLES.filter(example => example.type === credentials.type);
  };

  const testConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/database/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const result = await response.json();
      setTestResult(result);
    } catch (error: any) {
      setTestResult({
        success: false,
        message: 'Network error',
        error: error.message
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleConnect = () => {
    if (testResult?.success && testResult.connectionId) {
      onConnect(testResult.connectionId, credentials);
      onClose();
    }
  };

  const resetForm = () => {
    setCredentials({
      type: 'mysql',
      host: '',
      port: 3306,
      username: '',
      password: '',
      database: '',
      filePath: ''
    });
    setTestResult(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Database className="w-6 h-6 text-orange-400" />
            <div>
              <h2 className="text-lg font-semibold text-white">Connect to Database</h2>
              {projectName && (
                <p className="text-sm text-gray-400">Project: {projectName}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Database Type Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Database Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'mysql', label: 'MySQL' },
              { value: 'postgresql', label: 'PostgreSQL' },
              { value: 'sqlite', label: 'SQLite' }
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => handleTypeChange(value as any)}
                className={`px-3 py-2 rounded-md text-sm transition-colors ${
                  credentials.type === value
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Example Configurations */}
        {getExamplesForCurrentType().length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowExamples(!showExamples)}
              className="flex items-center justify-between w-full px-3 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <BookOpen className="w-4 h-4" />
                <span className="text-sm">Load Example Configuration</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${showExamples ? 'rotate-180' : ''}`} />
            </button>

            {showExamples && (
              <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                {getExamplesForCurrentType().map((example, index) => (
                  <button
                    key={index}
                    onClick={() => loadExample(example)}
                    className="w-full text-left p-3 bg-gray-800 rounded-md hover:bg-gray-700 transition-colors border border-gray-600"
                  >
                    <div className="font-medium text-white text-sm">{example.name}</div>
                    <div className="text-xs text-gray-400 mt-1">{example.description}</div>
                    {example.notes && (
                      <div className="text-xs text-orange-400 mt-1">{example.notes}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Connection Form */}
        <div className="space-y-4 mb-6">
          {credentials.type !== 'sqlite' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Host
                </label>
                <input
                  type="text"
                  value={credentials.host || ''}
                  onChange={(e) => handleInputChange('host', e.target.value)}
                  placeholder="localhost"
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Port
                </label>
                <input
                  type="number"
                  value={credentials.port || ''}
                  onChange={(e) => handleInputChange('port', parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={credentials.username || ''}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={credentials.password || ''}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Database
                </label>
                <input
                  type="text"
                  value={credentials.database || ''}
                  onChange={(e) => handleInputChange('database', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:border-orange-500 focus:outline-none"
                />
              </div>
            </>
          )}

          {credentials.type === 'sqlite' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                File Path
              </label>
              <input
                type="text"
                value={credentials.filePath || ''}
                onChange={(e) => handleInputChange('filePath', e.target.value)}
                placeholder=":memory:"
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:border-orange-500 focus:outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                Use ":memory:" for in-memory database or provide a file path
              </p>
            </div>
          )}
        </div>

        {/* Test Result */}
        {testResult && (
          <div className={`mb-4 p-3 rounded-lg flex items-center space-x-2 ${
            testResult.success
              ? 'bg-green-900 border border-green-700'
              : 'bg-red-900 border border-red-700'
          }`}>
            {testResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400" />
            )}
            <div>
              <p className={`text-sm font-medium ${
                testResult.success ? 'text-green-200' : 'text-red-200'
              }`}>
                {testResult.message}
              </p>
              {testResult.error && (
                <p className="text-sm text-red-300 mt-1">{testResult.error}</p>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-3">
          <button
            onClick={testConnection}
            disabled={isTesting}
            className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <TestTube className="w-4 h-4 mr-2" />
                Test Connection
              </>
            )}
          </button>

          <button
            onClick={handleConnect}
            disabled={!testResult?.success}
            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Connect
          </button>
        </div>
      </div>
    </div>
  );
}
