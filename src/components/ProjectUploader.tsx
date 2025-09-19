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
    
    // Validate file types
    const validExtensions = ['.db', '.sqlite', '.sqlite3', '.db3', '.s3db', '.sl3'];
    const invalidFiles = files.filter(file => {
      const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      return !validExtensions.includes(ext);
    });

    if (invalidFiles.length > 0) {
      setUploadState(prev => ({
        ...prev,
        status: 'error',
        progress: 0,
        message: 'Invalid file types detected',
        error: `Please upload only database files (.db, .sqlite, .sqlite3, .db3, .s3db, .sl3). Invalid files: ${invalidFiles.map(f => f.name).join(', ')}`
      }));
      return;
    }
    
    setUploadState({
      status: 'uploading',
      progress: 10,
      message: 'Uploading database files...',
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
      
      setUploadState(prev => ({
        ...prev,
        status: 'completed',
        progress: 100,
        message: `Database uploaded successfully! Found ${result.databases.length} database(s) with schema information.`,
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
      fileInputRef.current.click();
    } else {
      console.log('❌ File input ref not found');
    }
  }, []);

  // Render upload area
  const renderUploadArea = () => {
    if (uploadState.status === 'idle') {
      return (
        <div className="text-center py-12">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <Database className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Upload Database Files
            </h3>
            <p className="text-gray-600 mb-4">
              Drag and drop SQLite database files or click to select
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-2">
                <div className="w-5 h-5 text-blue-500 mt-0.5">💡</div>
                <div className="text-left text-sm text-blue-800">
                  <p className="font-medium mb-1">What happens when you upload:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-700">
                    <li>Database schema is automatically extracted</li>
                    <li>Tables and relationships are analyzed</li>
                    <li>Project is created and saved to QueryFlow</li>
                    <li>Database becomes available in Schema Designer</li>
                    <li>You can query and edit data immediately</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={openFileDialog}
              className="inline-flex items-center px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
            >
              <Database className="w-5 h-5 mr-2" />
              Select Database Files
            </button>

            <div className="text-sm text-gray-500">
              <div className="font-medium mb-1">Supported formats:</div>
              <div className="flex flex-wrap justify-center gap-2">
                {['.db', '.sqlite', '.sqlite3', '.db3', '.s3db', '.sl3'].map(ext => (
                  <span key={ext} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
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
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Database Uploaded Successfully!
          </h3>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-center mb-3">
              <Database className="w-6 h-6 mr-2 text-green-500" />
              <span className="font-medium text-lg">
                {result.projectName}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex items-center justify-center">
                <Database className="w-4 h-4 mr-2 text-green-500" />
                <span className="font-medium">{result.databases.length} database(s) found</span>
              </div>
              
              {result.databases.map((db, index) => (
                <div key={index} className="bg-white rounded p-3 border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Database className="w-4 h-4 mr-2 text-blue-500" />
                      <span className="font-medium">{db.name}</span>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${
                      db.status === 'ready' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {db.status === 'ready' ? 'Ready' : 'Error'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Type: {db.type} • Path: {db.config.filePath}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-center space-x-2 text-green-800">
              <CheckCircle className="w-4 h-4" />
              <span className="font-medium">Ready to use!</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              Your database is now available in the Projects tab and Schema Designer
            </p>
          </div>

          <p className="text-sm text-gray-600">
            Connecting to QueryFlow...
          </p>
        </div>
      );
    }

    if (uploadState.status === 'error') {
      return (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Upload Failed
          </h3>

          <p className="text-red-600 mb-4">
            {uploadState.error}
          </p>

          <button
            onClick={() => setUploadState({
              status: 'idle',
              progress: 0,
              message: 'Ready to upload project',
              files: []
            })}
            className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    // Processing state
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto bg-orange-100 rounded-full flex items-center justify-center mb-4">
          <Loader className="w-8 h-8 text-orange-600 animate-spin" />
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {uploadState.message}
        </h3>

        <div className="w-full max-w-xs mx-auto mb-4">
          <div className="bg-gray-200 rounded-full h-2">
            <div
              className="bg-orange-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadState.progress}%` }}
            />
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {uploadState.progress}% complete
          </div>
        </div>

        <div className="text-sm text-gray-600">
          Found {uploadState.files.length} files
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
              <Database className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Upload Database
              </h2>
              <p className="text-sm text-gray-600">
                Upload SQLite database files to QueryFlow
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Options Panel */}
        {showOptions && (
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3">Upload Options</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Depth
                </label>
                <input
                  type="number"
                  value={uploadOptions.maxDepth}
                  onChange={(e) => setUploadOptions(prev => ({
                    ...prev,
                    maxDepth: parseInt(e.target.value) || 5
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  min="1"
                  max="10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scan Timeout (ms)
                </label>
                <input
                  type="number"
                  value={uploadOptions.scanTimeout}
                  onChange={(e) => setUploadOptions(prev => ({
                    ...prev,
                    scanTimeout: parseInt(e.target.value) || 30000
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  min="5000"
                  max="120000"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ignore Patterns
                </label>
                <input
                  type="text"
                  value={uploadOptions.ignorePatterns.join(', ')}
                  onChange={(e) => setUploadOptions(prev => ({
                    ...prev,
                    ignorePatterns: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="node_modules, .git, dist"
                />
              </div>
            </div>
          </div>
        )}

        {/* Upload Area */}
        <div
          className={`p-6 ${
            uploadState.status === 'idle'
              ? `border-2 border-dashed transition-colors ${
                  isDragOver
                    ? 'border-orange-400 bg-orange-50'
                    : 'border-gray-300 hover:border-gray-400'
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
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span className="flex items-center">
              <Database className="w-4 h-4 mr-1" />
              Supports SQLite databases
            </span>
          </div>

          <div className="text-sm text-gray-500">
            Database files are stored securely in QueryFlow
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileInputChange}
        multiple
        accept=".db,.sqlite,.sqlite3,.db3,.s3db,.sl3"
      />
    </div>
  );
}
