'use client';

// Migration Details Modal Component
// Displays detailed information about a specific migration

import React from 'react';
import { Migration } from '@/types/database';
import { X, FileText, Clock, GitBranch, Code, Download, Copy, CheckCircle, AlertTriangle } from 'lucide-react';

interface MigrationDetailsModalProps {
  migration: Migration | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MigrationDetailsModal({ migration, isOpen, onClose }: MigrationDetailsModalProps) {
  if (!isOpen || !migration) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadMigration = () => {
    const content = migration.up || migration.down || '';
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${migration.filename}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <GitBranch className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{migration.name}</h3>
              <p className="text-sm text-gray-500">Version: {migration.version}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="space-y-6">
            {/* Migration Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      migration.status === 'executed' ? 'bg-green-100 text-green-800' :
                      migration.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      migration.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {migration.status === 'executed' && <CheckCircle className="h-3 w-3 mr-1" />}
                      {migration.status === 'failed' && <AlertTriangle className="h-3 w-3 mr-1" />}
                      {migration.status}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Framework</label>
                  <p className="mt-1 text-sm text-gray-900">{migration.framework}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Filename</label>
                  <p className="mt-1 text-sm text-gray-900 font-mono">{migration.filename}</p>
                </div>

                {migration.executedAt && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Executed At</label>
                    <p className="mt-1 text-sm text-gray-900 flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {new Date(migration.executedAt).toLocaleString()}
                    </p>
                  </div>
                )}

                {migration.executionTime && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Execution Time</label>
                    <p className="mt-1 text-sm text-gray-900">{migration.executionTime}ms</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {migration.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Description</label>
                    <p className="mt-1 text-sm text-gray-900">{migration.description}</p>
                  </div>
                )}

                {migration.author && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Author</label>
                    <p className="mt-1 text-sm text-gray-900">{migration.author}</p>
                  </div>
                )}

                {migration.batch && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Batch</label>
                    <p className="mt-1 text-sm text-gray-900">#{migration.batch}</p>
                  </div>
                )}

                {migration.checksum && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Checksum</label>
                    <p className="mt-1 text-sm text-gray-900 font-mono">{migration.checksum}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Dependencies */}
            {migration.dependencies && migration.dependencies.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-500 mb-2 block">Dependencies</label>
                <div className="flex flex-wrap gap-2">
                  {migration.dependencies.map((dep, index) => (
                    <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                      {dep}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Migration Code */}
            {(migration.up || migration.down) && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-medium text-gray-900">Migration Code</h4>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => copyToClipboard(migration.up || migration.down || '')}
                      className="flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </button>
                    <button
                      onClick={downloadMigration}
                      className="flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {migration.up && (
                    <div>
                      <div className="flex items-center mb-2">
                        <Code className="h-4 w-4 mr-2 text-green-600" />
                        <span className="text-sm font-medium text-gray-700">Up Migration</span>
                      </div>
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                        <code>{migration.up}</code>
                      </pre>
                    </div>
                  )}

                  {migration.down && (
                    <div>
                      <div className="flex items-center mb-2">
                        <Code className="h-4 w-4 mr-2 text-red-600" />
                        <span className="text-sm font-medium text-gray-700">Down Migration (Rollback)</span>
                      </div>
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                        <code>{migration.down}</code>
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Rollback File */}
            {migration.rollbackFile && (
              <div>
                <label className="text-sm font-medium text-gray-500">Rollback File</label>
                <p className="mt-1 text-sm text-gray-900 font-mono">{migration.rollbackFile}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Close
          </button>
          {migration.status === 'pending' && (
            <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700">
              Run Migration
            </button>
          )}
          {migration.status === 'executed' && (
            <button className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700">
              Rollback
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
