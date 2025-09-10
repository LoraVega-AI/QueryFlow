'use client';

// Export/Import Manager component for QueryFlow
// Provides comprehensive export and import functionality with multiple format support

import React, { useState, useCallback, useRef } from 'react';
import { DatabaseSchema, DatabaseRecord } from '@/types/database';
import { ExportService, ExportOptions, ExportFormat, ExportResult } from '@/services/exportService';
import { ImportService, ImportOptions, ImportFormat, ImportResult } from '@/services/importService';
import { 
  Download, Upload, FileText, Database, Globe, Code, 
  Settings, CheckCircle, AlertTriangle, X, ChevronDown,
  File, FileSpreadsheet, FileCode, FileJson, Archive
} from 'lucide-react';

interface ExportImportManagerProps {
  schema: DatabaseSchema | null;
  records: DatabaseRecord[];
  onSchemaChange?: (schema: DatabaseSchema) => void;
  onRecordsChange?: (records: DatabaseRecord[]) => void;
}

type TabType = 'export' | 'import';

const EXPORT_FORMATS: { value: ExportFormat; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'sql', label: 'SQL Script', icon: <Database className="w-4 h-4" />, description: 'Complete schema and data as SQL' },
  { value: 'postgres', label: 'PostgreSQL', icon: <Database className="w-4 h-4" />, description: 'PostgreSQL-specific SQL' },
  { value: 'mysql', label: 'MySQL', icon: <Database className="w-4 h-4" />, description: 'MySQL-specific SQL' },
  { value: 'mssql', label: 'SQL Server', icon: <Database className="w-4 h-4" />, description: 'SQL Server T-SQL' },
  { value: 'csv', label: 'CSV', icon: <FileSpreadsheet className="w-4 h-4" />, description: 'Comma-separated values' },
  { value: 'json', label: 'JSON', icon: <FileJson className="w-4 h-4" />, description: 'JSON format with schema and data' },
  { value: 'xml', label: 'XML', icon: <FileCode className="w-4 h-4" />, description: 'XML format with schema and data' },
  { value: 'yaml', label: 'YAML', icon: <FileText className="w-4 h-4" />, description: 'YAML format for configuration' },
  { value: 'toml', label: 'TOML', icon: <FileText className="w-4 h-4" />, description: 'TOML configuration format' },
  { value: 'graphql', label: 'GraphQL Schema', icon: <Code className="w-4 h-4" />, description: 'GraphQL type definitions' },
  { value: 'openapi', label: 'OpenAPI Spec', icon: <Globe className="w-4 h-4" />, description: 'OpenAPI 3.0 specification' },
];

const IMPORT_FORMATS: { value: ImportFormat; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'sql', label: 'SQL Script', icon: <Database className="w-4 h-4" />, description: 'Import from SQL files' },
  { value: 'csv', label: 'CSV', icon: <FileSpreadsheet className="w-4 h-4" />, description: 'Import from CSV files' },
  { value: 'json', label: 'JSON', icon: <FileJson className="w-4 h-4" />, description: 'Import from JSON files' },
  { value: 'xml', label: 'XML', icon: <FileCode className="w-4 h-4" />, description: 'Import from XML files' },
  { value: 'yaml', label: 'YAML', icon: <FileText className="w-4 h-4" />, description: 'Import from YAML files' },
  { value: 'toml', label: 'TOML', icon: <FileText className="w-4 h-4" />, description: 'Import from TOML files' },
  { value: 'api', label: 'API Endpoint', icon: <Globe className="w-4 h-4" />, description: 'Import from REST API' },
];

export function ExportImportManager({ schema, records, onSchemaChange, onRecordsChange }: ExportImportManagerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('export');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ExportResult | ImportResult | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export state
  const [exportFormat, setExportFormat] = useState<ExportFormat>('sql');
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'sql',
    includeSchema: true,
    includeData: true,
    includeIndexes: true,
    includeTriggers: false,
    includeConstraints: true,
    compress: false
  });

  // Import state
  const [importFormat, setImportFormat] = useState<ImportFormat>('sql');
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    format: 'sql',
    validateSchema: true,
    validateData: true,
    skipErrors: false,
    overwriteExisting: false,
    createMissingTables: true,
    mergeMode: 'append'
  });

  const [apiUrl, setApiUrl] = useState('');
  const [apiHeaders, setApiHeaders] = useState('{}');

  const handleExport = useCallback(async () => {
    if (!schema) {
      setResult({
        success: false,
        filename: '',
        size: 0,
        format: exportFormat,
        errors: ['No schema available to export']
      });
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      const result = await ExportService.exportDatabase(schema, records, {
        ...exportOptions,
        format: exportFormat
      });

      setResult(result);

      if (result.success && result.data) {
        // Download the file
        const blob = new Blob([result.data as string], { 
          type: getContentType(exportFormat) 
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      setResult({
        success: false,
        filename: '',
        size: 0,
        format: exportFormat,
        errors: [error instanceof Error ? error.message : 'Export failed']
      });
    } finally {
      setIsProcessing(false);
    }
  }, [schema, records, exportFormat, exportOptions]);

  const handleImport = useCallback(async (source: string | File) => {
    setIsProcessing(true);
    setResult(null);

    try {
      let result: ImportResult;

      if (importFormat === 'api') {
        // Handle API import
        const apiConnection = {
          url: apiUrl,
          method: 'GET' as const,
          headers: JSON.parse(apiHeaders || '{}')
        };
        result = await ImportService.importData(apiConnection, {
          ...importOptions,
          format: importFormat
        });
      } else {
        // Handle file import
        result = await ImportService.importData(source, {
          ...importOptions,
          format: importFormat
        });
      }

      setResult(result);

      if (result.success) {
        // Update schema and records if import was successful
        if (result.schema && onSchemaChange) {
          onSchemaChange(result.schema);
        }
        if (result.records && onRecordsChange) {
          onRecordsChange(result.records);
        }
      }
    } catch (error) {
      setResult({
        success: false,
        tablesCreated: 0,
        tablesUpdated: 0,
        recordsImported: 0,
        recordsSkipped: 0,
        recordsErrors: 0,
        errors: [{
          type: 'format',
          message: error instanceof Error ? error.message : 'Import failed',
          severity: 'error'
        }],
        warnings: []
      });
    } finally {
      setIsProcessing(false);
    }
  }, [importFormat, importOptions, apiUrl, apiHeaders, onSchemaChange, onRecordsChange]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImport(file);
    }
  }, [handleImport]);

  const handleApiImport = useCallback(() => {
    if (apiUrl.trim()) {
      handleImport(apiUrl);
    }
  }, [apiUrl, handleImport]);

  const getContentType = (format: ExportFormat): string => {
    const contentTypes: Record<ExportFormat, string> = {
      sql: 'text/sql',
      postgres: 'text/sql',
      mysql: 'text/sql',
      mssql: 'text/sql',
      sqlite: 'text/sql',
      csv: 'text/csv',
      json: 'application/json',
      xml: 'application/xml',
      yaml: 'application/x-yaml',
      toml: 'text/plain',
      graphql: 'text/plain',
      openapi: 'application/json',
      excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      parquet: 'application/octet-stream'
    };
    return contentTypes[format] || 'text/plain';
  };

  const renderExportTab = () => (
    <div className="space-y-6">
      {/* Format Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">Export Format</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {EXPORT_FORMATS.map((format) => (
            <button
              key={format.value}
              onClick={() => {
                setExportFormat(format.value);
                setExportOptions(prev => ({ ...prev, format: format.value }));
              }}
              className={`p-3 rounded-lg border text-left transition-colors ${
                exportFormat === format.value
                  ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                  : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {format.icon}
                <span className="text-sm font-medium">{format.label}</span>
              </div>
              <p className="text-xs text-gray-400">{format.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Options */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-300">Export Options</label>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-300"
          >
            <span>Advanced</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <div className="space-y-3">
          {/* Basic Options */}
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={exportOptions.includeSchema}
                onChange={(e) => setExportOptions(prev => ({ ...prev, includeSchema: e.target.checked }))}
                className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-300">Include Schema</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={exportOptions.includeData}
                onChange={(e) => setExportOptions(prev => ({ ...prev, includeData: e.target.checked }))}
                className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-300">Include Data</span>
            </label>
          </div>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-700">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={exportOptions.includeIndexes}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeIndexes: e.target.checked }))}
                  className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-300">Include Indexes</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={exportOptions.includeTriggers}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeTriggers: e.target.checked }))}
                  className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-300">Include Triggers</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={exportOptions.includeConstraints}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeConstraints: e.target.checked }))}
                  className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-300">Include Constraints</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={exportOptions.compress}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, compress: e.target.checked }))}
                  className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-300">Compress Output</span>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={isProcessing || !schema}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Download className="w-4 h-4" />
        {isProcessing ? 'Exporting...' : 'Export Database'}
      </button>
    </div>
  );

  const renderImportTab = () => (
    <div className="space-y-6">
      {/* Format Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">Import Format</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {IMPORT_FORMATS.map((format) => (
            <button
              key={format.value}
              onClick={() => {
                setImportFormat(format.value);
                setImportOptions(prev => ({ ...prev, format: format.value }));
              }}
              className={`p-3 rounded-lg border text-left transition-colors ${
                importFormat === format.value
                  ? 'border-green-500 bg-green-500/10 text-green-400'
                  : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {format.icon}
                <span className="text-sm font-medium">{format.label}</span>
              </div>
              <p className="text-xs text-gray-400">{format.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Import Source */}
      {importFormat === 'api' ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">API URL</label>
            <input
              type="url"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://api.example.com/data"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Headers (JSON)</label>
            <textarea
              value={apiHeaders}
              onChange={(e) => setApiHeaders(e.target.value)}
              placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
              rows={3}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleApiImport}
            disabled={isProcessing || !apiUrl.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Globe className="w-4 h-4" />
            {isProcessing ? 'Importing...' : 'Import from API'}
          </button>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Select File</label>
          <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-gray-500 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept={getFileAccept(importFormat)}
              className="hidden"
            />
            <File className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-300 mb-2">Drop your file here or click to browse</p>
            <p className="text-sm text-gray-400 mb-4">Supported formats: {getFileExtensions(importFormat)}</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Choose File
            </button>
          </div>
        </div>
      )}

      {/* Import Options */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-300">Import Options</label>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-300"
          >
            <span>Advanced</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <div className="space-y-3">
          {/* Basic Options */}
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={importOptions.validateSchema}
                onChange={(e) => setImportOptions(prev => ({ ...prev, validateSchema: e.target.checked }))}
                className="rounded border-gray-600 bg-gray-700 text-green-500 focus:ring-green-500"
              />
              <span className="text-sm text-gray-300">Validate Schema</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={importOptions.validateData}
                onChange={(e) => setImportOptions(prev => ({ ...prev, validateData: e.target.checked }))}
                className="rounded border-gray-600 bg-gray-700 text-green-500 focus:ring-green-500"
              />
              <span className="text-sm text-gray-300">Validate Data</span>
            </label>
          </div>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="space-y-3 pt-3 border-t border-gray-700">
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={importOptions.skipErrors}
                    onChange={(e) => setImportOptions(prev => ({ ...prev, skipErrors: e.target.checked }))}
                    className="rounded border-gray-600 bg-gray-700 text-green-500 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-300">Skip Errors</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={importOptions.overwriteExisting}
                    onChange={(e) => setImportOptions(prev => ({ ...prev, overwriteExisting: e.target.checked }))}
                    className="rounded border-gray-600 bg-gray-700 text-green-500 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-300">Overwrite Existing</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={importOptions.createMissingTables}
                    onChange={(e) => setImportOptions(prev => ({ ...prev, createMissingTables: e.target.checked }))}
                    className="rounded border-gray-600 bg-gray-700 text-green-500 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-300">Create Missing Tables</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Merge Mode</label>
                <select
                  value={importOptions.mergeMode}
                  onChange={(e) => setImportOptions(prev => ({ ...prev, mergeMode: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
                >
                  <option value="replace">Replace Existing Data</option>
                  <option value="append">Append New Data</option>
                  <option value="update">Update Existing Records</option>
                  <option value="upsert">Upsert (Insert or Update)</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderResult = () => {
    if (!result) return null;

    const isSuccess = result.success;
    const isExportResult = 'filename' in result;

    return (
      <div className={`p-4 rounded-lg border ${
        isSuccess 
          ? 'border-green-500 bg-green-500/10' 
          : 'border-red-500 bg-red-500/10'
      }`}>
        <div className="flex items-start gap-3">
          {isSuccess ? (
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          )}

          <div className="flex-1 min-w-0">
            <h4 className={`font-medium ${isSuccess ? 'text-green-400' : 'text-red-400'}`}>
              {isSuccess 
                ? (isExportResult ? 'Export Successful' : 'Import Successful')
                : (isExportResult ? 'Export Failed' : 'Import Failed')
              }
            </h4>

            {isSuccess && (
              <div className="mt-2 text-sm text-gray-300 space-y-1">
                {isExportResult ? (
                  <>
                    <p>File: {(result as ExportResult).filename}</p>
                    <p>Size: {Math.round((result as ExportResult).size / 1024)} KB</p>
                  </>
                ) : (
                  <>
                    <p>Tables Created: {(result as ImportResult).tablesCreated}</p>
                    <p>Records Imported: {(result as ImportResult).recordsImported}</p>
                    {(result as ImportResult).recordsSkipped > 0 && (
                      <p>Records Skipped: {(result as ImportResult).recordsSkipped}</p>
                    )}
                  </>
                )}
              </div>
            )}

            {(result.errors && result.errors.length > 0) && (
              <div className="mt-3">
                <p className="text-sm font-medium text-red-400 mb-2">Errors:</p>
                <div className="space-y-1">
                  {result.errors.slice(0, 3).map((error, index) => (
                    <p key={index} className="text-sm text-red-300">
                      {typeof error === 'string' ? error : error.message}
                    </p>
                  ))}
                  {result.errors.length > 3 && (
                    <p className="text-sm text-red-400">
                      ...and {result.errors.length - 3} more errors
                    </p>
                  )}
                </div>
              </div>
            )}

            {(result.warnings && result.warnings.length > 0) && (
              <div className="mt-3">
                <p className="text-sm font-medium text-yellow-400 mb-2">Warnings:</p>
                <div className="space-y-1">
                  {result.warnings.slice(0, 2).map((warning, index) => (
                    <p key={index} className="text-sm text-yellow-300">{warning}</p>
                  ))}
                  {result.warnings.length > 2 && (
                    <p className="text-sm text-yellow-400">
                      ...and {result.warnings.length - 2} more warnings
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setResult(null)}
            className="text-gray-400 hover:text-gray-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const getFileAccept = (format: ImportFormat): string => {
    const accepts: Record<ImportFormat, string> = {
      sql: '.sql,.txt',
      csv: '.csv,.txt',
      json: '.json,.txt',
      xml: '.xml,.txt',
      yaml: '.yaml,.yml,.txt',
      toml: '.toml,.txt',
      excel: '.xlsx,.xls',
      parquet: '.parquet',
      database: '',
      api: ''
    };
    return accepts[format] || '';
  };

  const getFileExtensions = (format: ImportFormat): string => {
    const extensions: Record<ImportFormat, string> = {
      sql: 'SQL, TXT',
      csv: 'CSV, TXT',
      json: 'JSON, TXT',
      xml: 'XML, TXT',
      yaml: 'YAML, YML, TXT',
      toml: 'TOML, TXT',
      excel: 'XLSX, XLS',
      parquet: 'PARQUET',
      database: '',
      api: ''
    };
    return extensions[format] || '';
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-700">
        <h2 className="text-xl font-semibold text-white">Export & Import</h2>
        <div className="flex bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('export')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'export'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <Download className="w-4 h-4 inline mr-2" />
            Export
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'import'
                ? 'bg-green-600 text-white'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4 inline mr-2" />
            Import
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'export' ? renderExportTab() : renderImportTab()}
        
        {/* Result */}
        {result && (
          <div className="mt-6">
            {renderResult()}
          </div>
        )}
      </div>
    </div>
  );
}
