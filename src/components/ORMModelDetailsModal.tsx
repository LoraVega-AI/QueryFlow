'use client';

// ORM Model Details Modal Component
// Displays detailed information about a specific ORM model

import React from 'react';
import { X, Database, Code, Link, Shield, FileText, Settings, Eye, Copy, Download } from 'lucide-react';

interface ORMModelDetailsModalProps {
  model: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ORMModelDetailsModal({ model, isOpen, onClose }: ORMModelDetailsModalProps) {
  if (!isOpen || !model) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadModel = () => {
    const content = model.sourceCode || '';
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${model.name}.${model.filePath.split('.').pop()}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Database className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{model.name}</h3>
              <p className="text-sm text-gray-500">
                {model.framework} • {model.filePath}
              </p>
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
            {/* Model Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Framework</label>
                  <p className="mt-1 text-sm text-gray-900">{model.framework}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Table Name</label>
                  <p className="mt-1 text-sm text-gray-900 font-mono">{model.tableName || 'N/A'}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">File Path</label>
                  <p className="mt-1 text-sm text-gray-900 font-mono">{model.filePath}</p>
                </div>
              </div>

              <div className="space-y-4">
                {model.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Description</label>
                    <p className="mt-1 text-sm text-gray-900">{model.description}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-500">Properties Count</label>
                  <p className="mt-1 text-sm text-gray-900">{model.properties?.length || 0}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Relationships Count</label>
                  <p className="mt-1 text-sm text-gray-900">{model.relationships?.length || 0}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Validations Count</label>
                  <p className="mt-1 text-sm text-gray-900">{model.validations?.length || 0}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Hooks Count</label>
                  <p className="mt-1 text-sm text-gray-900">{model.hooks?.length || 0}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Scopes Count</label>
                  <p className="mt-1 text-sm text-gray-900">{model.scopes?.length || 0}</p>
                </div>
              </div>
            </div>

            {/* Properties */}
            {model.properties && model.properties.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium text-gray-900">Properties</h4>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(model.properties, null, 2))}
                      className="flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </button>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {model.properties.map((prop: any, index: number) => (
                      <div key={index} className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">{prop.name}</span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {prop.type}
                          </span>
                        </div>
                        {prop.description && (
                          <p className="text-xs text-gray-600 mb-2">{prop.description}</p>
                        )}
                        <div className="space-y-1">
                          {prop.required && (
                            <span className="inline-block text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                              Required
                            </span>
                          )}
                          {prop.unique && (
                            <span className="inline-block text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                              Unique
                            </span>
                          )}
                          {prop.defaultValue && (
                            <span className="inline-block text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                              Default: {prop.defaultValue}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Relationships */}
            {model.relationships && model.relationships.length > 0 && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Relationships</h4>
                <div className="space-y-3">
                  {model.relationships.map((rel: any, index: number) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Link className="h-4 w-4 text-blue-500" />
                          <span className="font-medium text-gray-900">{rel.name}</span>
                        </div>
                        <span className="text-xs text-gray-500 bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {rel.type}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Target Model:</span>
                          <span className="ml-2 text-gray-900">{rel.targetModel}</span>
                        </div>
                        {rel.foreignKey && (
                          <div>
                            <span className="text-gray-500">Foreign Key:</span>
                            <span className="ml-2 text-gray-900 font-mono">{rel.foreignKey}</span>
                          </div>
                        )}
                        {rel.localKey && (
                          <div>
                            <span className="text-gray-500">Local Key:</span>
                            <span className="ml-2 text-gray-900 font-mono">{rel.localKey}</span>
                          </div>
                        )}
                        {rel.through && (
                          <div>
                            <span className="text-gray-500">Through:</span>
                            <span className="ml-2 text-gray-900 font-mono">{rel.through}</span>
                          </div>
                        )}
                      </div>
                      {rel.options && Object.keys(rel.options).length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs text-gray-500">Options:</span>
                          <pre className="text-xs text-gray-700 bg-white p-2 rounded border mt-1">
                            {JSON.stringify(rel.options, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Validations */}
            {model.validations && model.validations.length > 0 && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Validations</h4>
                <div className="space-y-3">
                  {model.validations.map((validation: any, index: number) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Shield className="h-4 w-4 text-purple-500" />
                          <span className="font-medium text-gray-900">{validation.field}</span>
                        </div>
                        <span className="text-xs text-gray-500 bg-purple-100 text-purple-800 px-2 py-1 rounded">
                          {validation.type}
                        </span>
                      </div>
                      {validation.message && (
                        <p className="text-sm text-gray-600 mb-2">{validation.message}</p>
                      )}
                      {validation.options && Object.keys(validation.options).length > 0 && (
                        <div>
                          <span className="text-xs text-gray-500">Options:</span>
                          <pre className="text-xs text-gray-700 bg-white p-2 rounded border mt-1">
                            {JSON.stringify(validation.options, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hooks */}
            {model.hooks && model.hooks.length > 0 && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Hooks</h4>
                <div className="space-y-3">
                  {model.hooks.map((hook: any, index: number) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Settings className="h-4 w-4 text-orange-500" />
                          <span className="font-medium text-gray-900">{hook.name}</span>
                        </div>
                        <span className="text-xs text-gray-500 bg-orange-100 text-orange-800 px-2 py-1 rounded">
                          {hook.type}
                        </span>
                      </div>
                      {hook.function && (
                        <pre className="text-xs text-gray-700 bg-white p-2 rounded border mt-2">
                          {hook.function}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Source Code */}
            {model.sourceCode && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium text-gray-900">Source Code</h4>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => copyToClipboard(model.sourceCode)}
                      className="flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </button>
                    <button
                      onClick={downloadModel}
                      className="flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </button>
                  </div>
                </div>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{model.sourceCode}</code>
                </pre>
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
        </div>
      </div>
    </div>
  );
}
