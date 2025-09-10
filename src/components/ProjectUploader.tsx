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
  onProjectDetected: (result: ProjectDetectionResult) => void;
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

    const items = Array.from(e.dataTransfer.items);
    const files = await processFileItems(items);

    if (files.length > 0) {
      await processFiles(files);
    }
  }, []);

  // Process dropped file items
  const processFileItems = async (items: DataTransferItem[]): Promise<string[]> => {
    const files: string[] = [];

    for (const item of items) {
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry();
        if (entry) {
          const entryFiles = await getAllFilesFromEntry(entry);
          files.push(...entryFiles);
        }
      }
    }

    return files;
  };

  // Recursively get all files from directory entry
  const getAllFilesFromEntry = async (entry: any, path = ''): Promise<string[]> => {
    const files: string[] = [];

    if (entry.kind === 'file') {
      files.push(path + entry.name);
    } else if (entry.kind === 'directory') {
      const dirReader = entry.createReader();
      const entries = await new Promise<any[]>((resolve) => {
        dirReader.readEntries(resolve);
      });

      for (const childEntry of entries) {
        const childFiles = await getAllFilesFromEntry(
          childEntry,
          path + entry.name + '/'
        );
        files.push(...childFiles);
      }
    }

    return files;
  };

  // Handle file input change
  const handleFileInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      // For directory selection, we need to handle differently
      if (files[0].webkitRelativePath) {
        const filePaths = files.map(f => f.webkitRelativePath);
        await processFiles(filePaths);
      }
    }
  }, []);

  // Process selected/uploaded files
  const processFiles = async (files: string[]) => {
    setUploadState({
      status: 'uploading',
      progress: 10,
      message: 'Scanning project files...',
      files
    });

    try {
      // Simulate file processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      setUploadState(prev => ({
        ...prev,
        status: 'detecting',
        progress: 30,
        message: 'Detecting project type...'
      }));

      // Detect project
      const result = await ProjectDetector.detectProject(files, uploadOptions);

      setUploadState(prev => ({
        ...prev,
        status: 'detecting',
        progress: 70,
        message: 'Analyzing databases...'
      }));

      // Test database connections
      for (const db of result.databases) {
        const testResult = await DatabaseConnector.testConnection(db.type, db.config);
        db.status = testResult.success ? 'connected' : 'error';
      }

      setUploadState(prev => ({
        ...prev,
        status: 'completed',
        progress: 100,
        message: 'Project analysis complete!',
        result
      }));

      // Auto-close after success
      setTimeout(() => {
        onProjectDetected(result);
        onClose();
      }, 2000);

    } catch (error) {
      setUploadState(prev => ({
        ...prev,
        status: 'error',
        progress: 0,
        message: 'Failed to process project',
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  };

  // Open folder selection dialog
  const openFolderDialog = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('webkitdirectory', '');
      fileInputRef.current.click();
    }
  }, []);

  // Render upload area
  const renderUploadArea = () => {
    if (uploadState.status === 'idle') {
      return (
        <div className="text-center py-12">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <Upload className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Upload Your Project
            </h3>
            <p className="text-gray-600">
              Drag and drop your project folder or click to select
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={openFolderDialog}
              className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              Select Folder
            </button>

            <div className="text-sm text-gray-500">
              Supports Node.js, Python, Django, Laravel, Rails, and more
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
            Project Detected Successfully!
          </h3>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-center mb-2">
              <span className="text-2xl mr-2">
                {PROJECT_TYPE_ICONS[result.projectType]}
              </span>
              <span className="font-medium">
                {PROJECT_TYPE_NAMES[result.projectType]}
              </span>
              <span className="ml-2 text-sm text-gray-500">
                ({result.confidence}% confidence)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center">
                <FileText className="w-4 h-4 mr-2 text-blue-500" />
                {result.configFiles.length} config files
              </div>
              <div className="flex items-center">
                <Database className="w-4 h-4 mr-2 text-green-500" />
                {result.databases.length} databases
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600">
            Redirecting to project setup...
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
              <Upload className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Link Project
              </h2>
              <p className="text-sm text-gray-600">
                Connect your existing project to QueryFlow
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
              <Github className="w-4 h-4 mr-1" />
              Also supports GitHub repos
            </span>
          </div>

          <div className="text-sm text-gray-500">
            Need help? Check our documentation
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
      />
    </div>
  );
}
