'use client';

// Project Uploader Component
// Handles project upload, detection, and initial setup

import React, { useState, useCallback, useRef } from 'react';
import {
  Upload,
  FolderOpen,
  FileText,
  Database,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader,
  X,
  Settings,
  Github
} from 'lucide-react';
import {
  ProjectDetectionResult,
  ProjectUploadOptions,
  ProjectType
} from '@/types/project';
import { ProjectDetector } from '@/utils/projectDetector';
import { DatabaseConnector } from '@/utils/databaseConnector';

interface ProjectUploaderProps {
  onProjectDetected?: (result: ProjectDetectionResult) => void;
  onClose: () => void;
}

interface UploadState {
  status: 'idle' | 'uploading' | 'detecting' | 'completed' | 'error';
  progress: number;
  message: string;
  files: string[];
  result?: ProjectDetectionResult;
  error?: string;
}

const PROJECT_TYPE_ICONS: Record<ProjectType, string> = {
  nodejs: '📦',
  python: '🐍',
  django: '🎸',
  flask: '🧪',
  fastapi: '⚡',
  laravel: '🎭',
  rails: '🚂',
  spring: '🌱',
  dotnet: '🔷',
  react: '⚛️',
  vue: '💚',
  angular: '🅰️',
  nextjs: '▲',
  express: '🚀',
  php: '🐘',
  unknown: '❓'
};

const PROJECT_TYPE_NAMES: Record<ProjectType, string> = {
  nodejs: 'Node.js',
  python: 'Python',
  django: 'Django',
  flask: 'Flask',
  fastapi: 'FastAPI',
  laravel: 'Laravel',
  rails: 'Ruby on Rails',
  spring: 'Spring Boot',
  dotnet: '.NET',
  react: 'React',
  vue: 'Vue.js',
  angular: 'Angular',
  nextjs: 'Next.js',
  express: 'Express.js',
  php: 'PHP',
  unknown: 'Unknown'
};

export function ProjectUploader({ onProjectDetected, onClose }: ProjectUploaderProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
    message: 'Ready to upload project',
    files: []
  });

  const [uploadOptions, setUploadOptions] = useState<ProjectUploadOptions>({
    includeHidden: false,
    maxDepth: 5,
    ignorePatterns: ['node_modules', '.git', 'dist', 'build', '__pycache__'],
    scanTimeout: 30000
  });

  const [isDragOver, setIsDragOver] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  // Handle drag and drop events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    console.log('📁 Drag and drop triggered');
    const items = Array.from(e.dataTransfer.items);
    console.log('📁 DataTransfer items:', items.length);
    const files = await processFileItems(items);
    console.log('📁 Processed files:', files.length, 'files');
    console.log('📁 File details:', files.map(f => ({ name: f.name, size: f.size, type: f.type })));

    if (files.length > 0) {
      await processFiles(files);
    }
  }, []);

  // Process dropped file items
  const processFileItems = async (items: DataTransferItem[]): Promise<File[]> => {
    const files: File[] = [];

    console.log('📁 Processing DataTransfer items:', items.length);
    for (const item of items) {
      console.log('📁 Item kind:', item.kind, 'type:', item.type);
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          console.log('📁 File extracted:', file.name, file.size, 'bytes');
          files.push(file);
        } else {
          console.log('❌ Failed to extract file from DataTransfer item');
        }
      }
    }

    console.log('📁 Total files processed:', files.length);
    return files;
  };

  // Handle file input change
  const handleFileInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('📁 File input changed');
    const files = Array.from(e.target.files || []);
    console.log('📁 Files selected:', files.length, 'files');
    console.log('📁 File details:', files.map(f => ({ name: f.name, size: f.size, type: f.type })));
    if (files.length > 0) {
      await processFiles(files);
    }
  }, []);

  // Process selected/uploaded files
  const processFiles = async (files: File[]) => {
    console.log('🚀 Starting file upload process with files:', files.map(f => f.name));
    
    // (Server-side will handle file verification). No extension restriction client-side.
    
    // Check if any zip files are included
    const hasZipFiles = files.some(file => file.name.toLowerCase().endsWith('.zip'));

    setUploadState({
      status: 'uploading',
      progress: 10,
      message: hasZipFiles
        ? 'Uploading database files and zip archives...'
        : 'Uploading database files...',
      files: files.map(f => f.name)
    });

    try {
      // Upload files to server
      console.log('📦 Creating FormData...');
      const formData = new FormData();
      files.forEach(file => {
        console.log('📁 Adding file to FormData:', file.name, file.size, 'bytes', 'type:', file.type);
        formData.append('files', file);
      });
      
      // Generate project name from first file
      const projectName = files[0]?.name.replace(/\.[^/.]+$/, '') || 'Database Project';
      formData.append('projectName', projectName);
      formData.append('projectDescription', `Database project with ${files.length} file(s) uploaded via QueryFlow`);
      
      console.log('📤 FormData created, sending request...');
      console.log('📤 FormData entries:');
      for (const [key, value] of formData.entries()) {
        console.log(`  ${key}:`, value);
      }

      setUploadState(prev => ({
        ...prev,
        status: 'detecting',
        progress: 30,
        message: 'Analyzing database structure...'
      }));

      console.log('🌐 Making fetch request to /api/projects/upload...');
      console.log('🌐 Request URL:', window.location.origin + '/api/projects/upload');
      console.log('🌐 Request method: POST');
      console.log('🌐 FormData size:', formData.get('files') ? 'Files present' : 'No files');
      
      const uploadResponse = await fetch('/api/projects/upload', {
        method: 'POST',
        body: formData
      });
      console.log('🌐 Fetch request completed');

      console.log('Upload response status:', uploadResponse.status);
      console.log('Upload response ok:', uploadResponse.ok);

      let uploadData;
      try {
        uploadData = await uploadResponse.json();
        console.log('Upload response data:', uploadData);
      } catch (jsonError) {
        console.error('Failed to parse JSON response:', jsonError);
        throw new Error('Invalid response from server');
      }

      if (!uploadResponse.ok) {
        console.error('Upload failed with status:', uploadResponse.status);
        throw new Error(`Upload failed with status ${uploadResponse.status}: ${uploadData.message || 'Unknown error'}`);
      }

      if (!uploadData.success) {
        console.error('Upload failed:', uploadData);
        throw new Error(uploadData.message || 'Failed to upload project');
      }

      setUploadState(prev => ({
        ...prev,
        status: 'detecting',
        progress: 70,
        message: 'Extracting database schema...'
      }));

      // Process the uploaded project data
      const result: ProjectDetectionResult = {
        projectName: uploadData.data.name,
        projectType: uploadData.data.technology as ProjectType,
        confidence: 95,
        configFiles: [],
        databases: (uploadData.data.databases || []).map((db: any) => ({
          name: db.name,
          type: db.type,
          config: {
            filePath: db.connectionString || db.filePath,
            database: db.name
          },
          status: db.status === 'ready' ? 'ready' : 'error'
        })),
        uploadPath: uploadData.data.uploadPath,
        projectId: uploadData.data.id,
        // Add the full project data for connection
        projectData: uploadData.data
      };

      console.log('✅ Upload completed successfully, setting success state...');
      console.log('📊 ProjectDetectionResult created:', {
        projectName: result.projectName,
        projectType: result.projectType,
        databases: result.databases.length,
        projectId: result.projectId
      });
      
      const hasZipFiles = files.some(file => file.name.toLowerCase().endsWith('.zip'));
      const successMessage = hasZipFiles
        ? `Project uploaded successfully! Found ${result.databases.length} database(s) from ${files.length} file(s) including zip archives.`
        : `Database uploaded successfully! Found ${result.databases.length} database(s) with schema information.`;

      setUploadState(prev => ({
        ...prev,
        status: 'completed',
        progress: 100,
        message: successMessage,
        result
      }));

      // Auto-close after success
      setTimeout(() => {
        console.log('🎉 Calling onProjectDetected with result:', result);
        onProjectDetected?.(result);
        console.log('🎉 Calling onClose');
        onClose();
      }, 2000);

    } catch (error) {
      console.error('❌ Upload error:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
      
      setUploadState(prev => ({
        ...prev,
        status: 'error',
        progress: 0,
        message: 'Failed to upload database',
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  };

  // Open file selection dialog
  const openFileDialog = useCallback(() => {
    console.log('📁 Opening file dialog...');
    if (fileInputRef.current) {
      console.log('📁 File input ref found, clicking');
      console.log('📁 File input accept attribute:', fileInputRef.current.accept);
      console.log('📁 File input multiple:', fileInputRef.current.multiple);
      fileInputRef.current.click();
    } else {
      console.log('❌ File input ref not found');
    }
  }, []);

  // Render upload area
  const renderUploadArea = () => {
    if (uploadState.status === 'idle') {
      return (
        <div className="text-center py-16">
          <div className="mb-8">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
              <Database className="w-10 h-10 text-orange-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Upload Database Files or Project Archives
            </h3>
            <p className="text-lg text-gray-600 mb-6">
              Drag and drop SQLite database files, zip archives, or click to select
            </p>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 mb-8 shadow-sm">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 text-blue-500 mt-0.5 text-xl">💡</div>
                <div className="text-left">
                  <p className="font-semibold text-blue-900 mb-3 text-lg">What happens when you upload:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-800">
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      <span>Zip files are automatically extracted</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      <span>Database files are detected and processed</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      <span>Project structure is analyzed</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      <span>All databases converted to SQLite</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      <span>Project saved to QueryFlow</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      <span>Available in Schema Designer</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={openFileDialog}
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-2xl hover:from-orange-700 hover:to-orange-800 transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Database className="w-6 h-6 mr-3" />
                Select Any Files
              </button>
              <button
                onClick={() => zipInputRef.current?.click()}
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <FileText className="w-6 h-6 mr-3" />
                Select Zip Files Only
              </button>
            </div>

            <div className="text-sm text-gray-600">
              <div className="font-semibold mb-3 text-gray-800">Supported formats:</div>
              <div className="flex flex-wrap justify-center gap-3">
                {['.db', '.sqlite', '.sqlite3', '.db3', '.s3db', '.sl3', '.zip'].map(ext => (
                  <span key={ext} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    ext === '.zip'
                      ? 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border border-orange-300 shadow-sm'
                      : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border border-gray-300 shadow-sm'
                  }`}>
                    {ext}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (uploadState.status === 'completed' && uploadState.result) {
      const { result } = uploadState;
      return (
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>

          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Database Uploaded Successfully!
          </h3>

          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6 mb-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-center mb-4">
              <Database className="w-8 h-8 mr-3 text-green-500" />
              <span className="font-bold text-xl text-gray-900">
                {result.projectName}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between items-center p-3 bg-white rounded-xl">
                <span className="text-gray-600 font-medium">Project Type:</span>
                <span className="font-bold text-gray-900">
                  {PROJECT_TYPE_NAMES[result.projectType as ProjectType] || result.projectType}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-white rounded-xl">
                <span className="text-gray-600 font-medium">Databases Found:</span>
                <span className="font-bold text-green-600 text-lg">
                  {result.databases.length}
                </span>
              </div>
              
              {result.databases.length > 0 && (
                <div className="md:col-span-2 mt-4">
                  <div className="text-gray-700 font-semibold mb-3">Database Details:</div>
                  <div className="space-y-2">
                    {result.databases.map((db, index) => (
                      <div key={index} className="bg-white rounded-xl p-4 border border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-gray-900">{db.name}</span>
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">{db.type}</span>
                        </div>
                        {(db as any).tableCount !== undefined && (
                          <div className="text-gray-600 text-sm">
                            {(db as any).tableCount} tables
                            {(db as any).totalRows !== undefined && ` • ${(db as any).totalRows} rows`}
                          </div>
                        )}
                        {(db as any).extractionMetadata && (
                          <div className="text-gray-500 text-xs mt-1">
                            Extracted from {(db as any).extractionMetadata.frameworks?.join(', ')} 
                            ({(db as any).extractionMetadata.confidence}% confidence)
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 mb-6 shadow-sm">
            <div className="flex items-center justify-center space-x-3 text-green-800 mb-2">
              <CheckCircle className="w-6 h-6" />
              <span className="font-bold text-lg">Ready to use!</span>
            </div>
            <p className="text-green-700 font-medium">
              Your database is now available in the Projects tab and Schema Designer
            </p>
          </div>

          <div className="flex items-center justify-center space-x-2 text-gray-600">
            <Loader className="w-4 h-4 animate-spin" />
            <span className="font-medium">Connecting to QueryFlow...</span>
          </div>
        </div>
      );
    }

    if (uploadState.status === 'error') {
      return (
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-red-100 to-red-200 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>

          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Upload Failed
          </h3>

          <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-2xl p-6 mb-6 shadow-sm">
            <p className="text-red-800 font-medium text-lg">
              {uploadState.error}
            </p>
          </div>

          <button
            onClick={() => setUploadState({
              status: 'idle',
              progress: 0,
              message: 'Ready to upload project',
              files: []
            })}
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-2xl hover:from-orange-700 hover:to-orange-800 transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Upload className="w-6 h-6 mr-3" />
            Try Again
          </button>
        </div>
      );
    }

    // Processing state
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
          <Loader className="w-10 h-10 text-orange-600 animate-spin" />
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mb-4">
          {uploadState.message}
        </h3>

        <div className="w-full max-w-md mx-auto mb-6">
          <div className="bg-gray-200 rounded-full h-3 shadow-inner">
            <div
              className="bg-gradient-to-r from-orange-500 to-orange-600 h-3 rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${uploadState.progress}%` }}
            />
          </div>
          <div className="text-lg text-gray-700 mt-3 font-semibold">
            {uploadState.progress}% complete
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-center space-x-2 text-blue-800">
            <Database className="w-5 h-5" />
            <span className="font-medium">Processing {uploadState.files.length} files</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
              <Database className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Upload Database
              </h2>
              <p className="text-gray-600 font-medium">
                Upload SQLite database files to QueryFlow
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Options Panel */}
        {showOptions && (
          <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <h4 className="font-bold text-gray-900 mb-4 text-lg">Upload Options</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Max Depth
                </label>
                <input
                  type="number"
                  value={uploadOptions.maxDepth}
                  onChange={(e) => setUploadOptions(prev => ({
                    ...prev,
                    maxDepth: parseInt(e.target.value) || 5
                  }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 bg-white"
                  min="1"
                  max="10"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Scan Timeout (ms)
                </label>
                <input
                  type="number"
                  value={uploadOptions.scanTimeout}
                  onChange={(e) => setUploadOptions(prev => ({
                    ...prev,
                    scanTimeout: parseInt(e.target.value) || 30000
                  }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 bg-white"
                  min="5000"
                  max="120000"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Ignore Patterns
                </label>
                <input
                  type="text"
                  value={uploadOptions.ignorePatterns.join(', ')}
                  onChange={(e) => setUploadOptions(prev => ({
                    ...prev,
                    ignorePatterns: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                  }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 bg-white"
                  placeholder="node_modules, .git, dist"
                />
              </div>
            </div>
          </div>
        )}

        {/* Upload Area */}
        <div
          className={`p-8 ${
            uploadState.status === 'idle'
              ? `border-2 border-dashed transition-all duration-300 ${
                  isDragOver
                    ? 'border-orange-400 bg-gradient-to-br from-orange-50 to-orange-100 shadow-lg'
                    : 'border-gray-300 hover:border-orange-300 hover:bg-gray-50'
                }`
              : ''
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {renderUploadArea()}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-6 text-sm text-gray-600">
            <span className="flex items-center font-medium">
              <Database className="w-5 h-5 mr-2 text-orange-500" />
              Supports SQLite databases
            </span>
          </div>

          <div className="text-sm text-gray-500 font-medium">
            Database files are stored securely in QueryFlow
          </div>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileInputChange}
        multiple
      />
      <input
        ref={zipInputRef}
        type="file"
        className="hidden"
        onChange={handleFileInputChange}
        multiple
        accept=".zip"
      />
    </div>
  );
}
