// Project Detection Utility
// Analyzes uploaded files to detect project type and database files

import { ProjectType, ProjectDetectionResult, ProjectUploadOptions } from '@/types/project';

export class ProjectDetector {
  static async detectProject(files: string[], options: ProjectUploadOptions): Promise<ProjectDetectionResult> {
    // This is a simplified version for the upload API
    // In a real implementation, this would analyze the actual file contents
    const projectType = this.detectProjectType(files);
    const databases = this.findDatabaseFiles(files);
    const configFiles = this.findConfigFiles(files);

    return {
      projectName: this.extractProjectName(files),
      projectType,
      confidence: this.calculateConfidence(files, projectType),
      configFiles,
      databases: databases.map(db => ({
        name: db.name,
        type: db.type,
        config: {
          filePath: db.path,
          database: db.name
        },
        status: 'ready'
      }))
    };
  }

  private static detectProjectType(files: string[]): ProjectType {
    const fileNames = files.map(f => f.toLowerCase());
    
    // Check for package.json (Node.js)
    if (fileNames.some(f => f.includes('package.json'))) {
      return 'nodejs';
    }
    
    // Check for requirements.txt or setup.py (Python)
    if (fileNames.some(f => f.includes('requirements.txt') || f.includes('setup.py'))) {
      return 'python';
    }
    
    // Check for Django
    if (fileNames.some(f => f.includes('manage.py') || f.includes('settings.py'))) {
      return 'django';
    }
    
    // Check for Laravel
    if (fileNames.some(f => f.includes('artisan') || f.includes('composer.json'))) {
      return 'laravel';
    }
    
    // Check for React
    if (fileNames.some(f => f.includes('src/app.js') || f.includes('src/index.js'))) {
      return 'react';
    }
    
    // Check for Next.js
    if (fileNames.some(f => f.includes('next.config.js') || f.includes('pages/'))) {
      return 'nextjs';
    }
    
    return 'unknown';
  }

  private static findDatabaseFiles(files: string[]): Array<{name: string, type: string, path: string}> {
    const dbFiles: Array<{name: string, type: string, path: string}> = [];
    const dbExtensions = ['.db', '.sqlite', '.sqlite3', '.db3', '.s3db', '.sl3'];
    
    for (const file of files) {
      const fileName = file.toLowerCase();
      const extension = fileName.substring(fileName.lastIndexOf('.'));
      
      if (dbExtensions.includes(extension)) {
        dbFiles.push({
          name: file.split('/').pop()?.replace(extension, '') || 'database',
          type: 'sqlite',
          path: file
        });
      }
    }
    
    return dbFiles;
  }

  private static findConfigFiles(files: string[]): string[] {
    const configFiles: string[] = [];
    const configPatterns = [
      'package.json',
      'composer.json',
      'requirements.txt',
      'setup.py',
      'manage.py',
      'settings.py',
      'config.py',
      'app.js',
      'index.js',
      'next.config.js',
      'webpack.config.js',
      'tsconfig.json',
      'pyproject.toml',
      'Cargo.toml',
      'pom.xml',
      'build.gradle'
    ];
    
    for (const file of files) {
      const fileName = file.toLowerCase();
      if (configPatterns.some(pattern => fileName.includes(pattern))) {
        configFiles.push(file);
      }
    }
    
    return configFiles;
  }

  private static extractProjectName(files: string[]): string {
    // Try to find the root directory name
    const rootFiles = files.filter(f => !f.includes('/') || f.split('/').length === 1);
    if (rootFiles.length > 0) {
      return rootFiles[0].split('/')[0];
    }
    
    // Fallback to a generic name
    return 'Uploaded Project';
  }

  private static calculateConfidence(files: string[], projectType: ProjectType): number {
    if (projectType === 'unknown') {
      return 0;
    }
    
    // Base confidence on number of relevant files found
    const relevantFiles = files.filter(f => {
      const fileName = f.toLowerCase();
      return fileName.includes('package.json') ||
             fileName.includes('requirements.txt') ||
             fileName.includes('manage.py') ||
             fileName.includes('composer.json') ||
             fileName.includes('src/') ||
             fileName.includes('app/');
    });
    
    return Math.min(95, 50 + (relevantFiles.length * 10));
  }
}