// Project-related type definitions

export type ProjectType = 
  | 'nodejs'
  | 'python'
  | 'django'
  | 'flask'
  | 'fastapi'
  | 'laravel'
  | 'rails'
  | 'spring'
  | 'dotnet'
  | 'react'
  | 'vue'
  | 'angular'
  | 'nextjs'
  | 'express'
  | 'php'
  | 'unknown';

export interface ProjectUploadOptions {
  includeHidden: boolean;
  maxDepth: number;
  ignorePatterns: string[];
  scanTimeout: number;
}

export interface ProjectDetectionResult {
  projectName: string;
  projectType: ProjectType;
  confidence: number;
  configFiles: string[];
  databases: Array<{
    name: string;
    type: string;
    config: {
      filePath: string;
      database: string;
    };
    status: 'ready' | 'connected' | 'error';
  }>;
  uploadPath?: string;
  projectId?: string;
  projectData?: any; // Full project data from API response
}

export interface DatabaseConnector {
  testConnection(type: string, config: any): Promise<{ success: boolean; error?: string }>;
}