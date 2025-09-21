// Database Definition Extractor Component
// UI component for the database definition extraction system

'use client';

import React, { useState, useCallback } from 'react';
import { Upload, Download, Settings, Play, Eye, FileText, Database } from 'lucide-react';
import {
  ExtractionOptions,
  ExtractionResult,
  SupportedLanguage,
  SupportedFramework,
  ExtractionProgress
} from '@/types/extraction';

interface DatabaseDefinitionExtractorProps {
  onSchemaExtracted?: (result: ExtractionResult) => void;
  onSQLiteGenerated?: (database: ArrayBuffer) => void;
}

export default function DatabaseDefinitionExtractor({
  onSchemaExtracted,
  onSQLiteGenerated
}: DatabaseDefinitionExtractorProps) {
  const [extractionMode, setExtractionMode] = useState<'upload' | 'project'>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [projectPath, setProjectPath] = useState('');
  const [options, setOptions] = useState<Partial<ExtractionOptions>>({
    languages: ['javascript', 'typescript', 'python', 'php', 'java'],
    frameworks: ['sequelize', 'prisma', 'django', 'laravel', 'hibernate'],
    confidence: { 
      minimum: 60,
      regexWeight: 0.3,
      astWeight: 0.5,
      frameworkWeight: 0.2
    },
    parallelProcessing: true,
    enableASTCaching: true
  });
  
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [progress, setProgress] = useState<ExtractionProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);

  /**
   * Handle file upload
   */
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(event.target.files || []);
    setFiles(uploadedFiles);
    setError(null);
  }, []);

  /**
   * Start extraction process
   */
  const startExtraction = useCallback(async () => {
    if (!files.length && !projectPath.trim()) {
      setError('Please upload files or specify a project path');
      return;
    }

    setIsExtracting(true);
    setError(null);
    setProgress(null);
    setExtractionResult(null);

    try {
      // Prepare request body
      const requestBody: any = { options };

      if (extractionMode === 'upload' && files.length > 0) {
        // Convert files to text content
        const fileContents = await Promise.all(
          files.map(async (file) => ({
            name: file.name,
            content: await file.text()
          }))
        );
        requestBody.files = fileContents;
      } else if (extractionMode === 'project') {
        requestBody.projectPath = projectPath;
      }

      // Start extraction
      const response = await fetch('/api/extract-database-definitions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Extraction failed');
      }

      if (result.success) {
        // Convert base64 SQLite back to ArrayBuffer
        let sqliteDb: ArrayBuffer | undefined;
        if (result.sqliteDatabase) {
          const binaryString = atob(result.sqliteDatabase);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          sqliteDb = bytes.buffer;
        }

        const extractionResult: ExtractionResult = {
          ...result,
          sqliteDb,
          performance: {
            ...result.performance,
            startTime: new Date(result.performance.startTime),
            endTime: new Date(result.performance.endTime)
          }
        };

        setExtractionResult(extractionResult);

        // Notify parent components
        if (onSchemaExtracted) {
          onSchemaExtracted(extractionResult);
        }
        if (onSQLiteGenerated && sqliteDb) {
          onSQLiteGenerated(sqliteDb);
        }

        console.log('🎉 Database schema extracted successfully!');
        console.log(`📊 Found ${extractionResult.schema.tables.length} tables`);
        console.log(`🔗 Found ${extractionResult.schema.relationships.length} relationships`);
        console.log(`⏱️ Extraction took ${extractionResult.performance.totalTime}ms`);
        console.log(`📈 Overall confidence: ${extractionResult.metadata.confidence}%`);

      } else {
        throw new Error(result.message || 'Unknown extraction error');
      }

    } catch (error) {
      console.error('Extraction failed:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsExtracting(false);
    }
  }, [files, projectPath, options, extractionMode, onSchemaExtracted, onSQLiteGenerated]);

  /**
   * Download SQLite database
   */
  const downloadSQLite = useCallback(() => {
    if (!extractionResult?.sqliteDb) return;

    const blob = new Blob([extractionResult.sqliteDb], { type: 'application/x-sqlite3' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${extractionResult.schema.name}.db`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [extractionResult]);

  /**
   * Download schema as JSON
   */
  const downloadSchema = useCallback(() => {
    if (!extractionResult?.schema) return;

    const blob = new Blob([JSON.stringify(extractionResult.schema, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${extractionResult.schema.name}_schema.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [extractionResult]);

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Database Definition Extractor
        </h1>
        <p className="text-gray-600">
          Extract database schemas from your codebase using AST parsing and framework adapters
        </p>
      </div>

      {/* Extraction Mode Selection */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Extraction Mode</h2>
        <div className="flex space-x-4">
          <button
            onClick={() => setExtractionMode('upload')}
            className={`px-4 py-2 rounded-md flex items-center space-x-2 ${
              extractionMode === 'upload' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            <Upload size={20} />
            <span>Upload Files</span>
          </button>
          <button
            onClick={() => setExtractionMode('project')}
            className={`px-4 py-2 rounded-md flex items-center space-x-2 ${
              extractionMode === 'project' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            <FileText size={20} />
            <span>Project Path</span>
          </button>
        </div>
      </div>

      {/* File Upload */}
      {extractionMode === 'upload' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Upload Source Files</h2>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <label htmlFor="file-upload" className="cursor-pointer">
              <span className="text-lg font-medium text-gray-900">
                Drop files here or click to browse
              </span>
              <input
                id="file-upload"
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
                accept=".js,.jsx,.ts,.tsx,.py,.php,.java,.prisma,.sql"
              />
            </label>
            <p className="text-gray-500 mt-2">
              Supports: JS, TS, Python, PHP, Java, Prisma, SQL files
            </p>
          </div>
          
          {files.length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Uploaded Files ({files.length}):</h3>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {files.map((file, index) => (
                  <div key={index} className="text-sm text-gray-600 px-2 py-1 bg-gray-50 rounded">
                    {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Project Path */}
      {extractionMode === 'project' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Project Path</h2>
          <input
            type="text"
            value={projectPath}
            onChange={(e) => setProjectPath(e.target.value)}
            placeholder="/path/to/your/project"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-sm text-gray-500 mt-2">
            Specify the absolute path to your project directory
          </p>
        </div>
      )}

      {/* Options */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Extraction Options</h2>
          <button
            onClick={() => setShowOptions(!showOptions)}
            className="px-3 py-1 text-sm bg-gray-100 rounded-md flex items-center space-x-1"
          >
            <Settings size={16} />
            <span>{showOptions ? 'Hide' : 'Show'} Options</span>
          </button>
        </div>

        {showOptions && (
          <div className="space-y-4">
            {/* Language Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Languages</label>
              <div className="flex flex-wrap gap-2">
                {(['javascript', 'typescript', 'python', 'php', 'java'] as SupportedLanguage[]).map(lang => (
                  <label key={lang} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={options.languages?.includes(lang) || false}
                      onChange={(e) => {
                        const languages = options.languages || [];
                        if (e.target.checked) {
                          setOptions({ ...options, languages: [...languages, lang] });
                        } else {
                          setOptions({ ...options, languages: languages.filter(l => l !== lang) });
                        }
                      }}
                    />
                    <span className="text-sm capitalize">{lang}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Framework Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Frameworks</label>
              <div className="flex flex-wrap gap-2">
                {(['sequelize', 'prisma', 'mongoose', 'django', 'laravel', 'hibernate'] as SupportedFramework[]).map(framework => (
                  <label key={framework} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={options.frameworks?.includes(framework) || false}
                      onChange={(e) => {
                        const frameworks = options.frameworks || [];
                        if (e.target.checked) {
                          setOptions({ ...options, frameworks: [...frameworks, framework] });
                        } else {
                          setOptions({ ...options, frameworks: frameworks.filter(f => f !== framework) });
                        }
                      }}
                    />
                    <span className="text-sm capitalize">{framework}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Confidence Threshold */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Minimum Confidence: {options.confidence?.minimum || 60}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={options.confidence?.minimum || 60}
                onChange={(e) => setOptions({
                  ...options,
                  confidence: { 
                    minimum: parseInt(e.target.value),
                    regexWeight: options.confidence?.regexWeight || 0.3,
                    astWeight: options.confidence?.astWeight || 0.5,
                    frameworkWeight: options.confidence?.frameworkWeight || 0.2
                  }
                })}
                className="w-full"
              />
            </div>

            {/* Performance Options */}
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={options.parallelProcessing || false}
                  onChange={(e) => setOptions({ ...options, parallelProcessing: e.target.checked })}
                />
                <span className="text-sm">Parallel Processing</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={options.enableASTCaching || false}
                  onChange={(e) => setOptions({ ...options, enableASTCaching: e.target.checked })}
                />
                <span className="text-sm">AST Caching</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Extract Button */}
      <div className="text-center">
        <button
          onClick={startExtraction}
          disabled={isExtracting || (!files.length && !projectPath.trim())}
          className="px-8 py-3 bg-blue-500 text-white rounded-lg font-medium flex items-center space-x-2 mx-auto disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <Play size={20} />
          <span>{isExtracting ? 'Extracting...' : 'Extract Database Schema'}</span>
        </button>
      </div>

      {/* Progress */}
      {progress && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Extraction Progress</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Stage: {progress.stage}</span>
              <span>{progress.filesProcessed}/{progress.filesTotal} files</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progress.filesProcessed / progress.filesTotal) * 100}%` }}
              />
            </div>
            <div className="text-xs text-gray-500">
              Found {progress.candidatesFound} candidates, extracted {progress.tablesExtracted} tables
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <div className="text-red-600">⚠️</div>
            <div>
              <h3 className="text-red-800 font-medium">Extraction Failed</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {extractionResult && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Extraction Results</h3>
          
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {extractionResult.schema.tables.length}
              </div>
              <div className="text-sm text-blue-800">Tables</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {extractionResult.schema.tables.reduce((sum, t) => sum + t.fields.length, 0)}
              </div>
              <div className="text-sm text-green-800">Fields</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {extractionResult.schema.relationships.length}
              </div>
              <div className="text-sm text-purple-800">Relationships</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {extractionResult.metadata.confidence}%
              </div>
              <div className="text-sm text-orange-800">Confidence</div>
            </div>
          </div>

          {/* Performance */}
          <div className="mb-6">
            <h4 className="font-medium mb-2">Performance</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div>Extraction time: {extractionResult.performance.totalTime}ms</div>
              <div>Files processed: {extractionResult.metadata.processedFiles}/{extractionResult.metadata.totalFiles}</div>
              <div>Cache hits: {extractionResult.performance.cacheHits}</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-4">
            <button
              onClick={downloadSchema}
              className="px-4 py-2 bg-green-500 text-white rounded-md flex items-center space-x-2"
            >
              <Download size={16} />
              <span>Download Schema JSON</span>
            </button>
            
            {extractionResult.sqliteDb && (
              <button
                onClick={downloadSQLite}
                className="px-4 py-2 bg-blue-500 text-white rounded-md flex items-center space-x-2"
              >
                <Database size={16} />
                <span>Download SQLite DB</span>
              </button>
            )}
          </div>

          {/* Schema Preview */}
          <div className="mt-6">
            <h4 className="font-medium mb-2">Tables Preview</h4>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {extractionResult.schema.tables.slice(0, 10).map((table, index) => (
                <div key={index} className="border border-gray-200 rounded p-3">
                  <div className="font-medium">{table.name}</div>
                  <div className="text-sm text-gray-600">
                    {table.fields.length} fields, Framework: {table.metadata.framework}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {table.fields.slice(0, 3).map(f => f.name).join(', ')}
                    {table.fields.length > 3 && '...'}
                  </div>
                </div>
              ))}
              {extractionResult.schema.tables.length > 10 && (
                <div className="text-sm text-gray-500 text-center py-2">
                  And {extractionResult.schema.tables.length - 10} more tables...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
