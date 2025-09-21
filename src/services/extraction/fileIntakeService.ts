// File Intake Service
// Stage 1: File scanning, detection, MIME analysis, and hashing

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto-js';
import * as chokidar from 'chokidar';
import { lookup } from 'mime-types';
import { fileTypeFromBuffer } from 'file-type';

import {
  FileInfo,
  FileContent,
  ExtractionOptions,
  SupportedLanguage,
  SupportedFramework
} from '@/types/extraction';

export class FileIntakeService {
  private readonly SUPPORTED_EXTENSIONS = new Set([
    // JavaScript/TypeScript
    '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
    // Python
    '.py', '.pyx', '.pyi', '.pyw',
    // PHP
    '.php', '.php3', '.php4', '.php5', '.phtml',
    // Java
    '.java', '.class', '.jar',
    // SQL
    '.sql', '.ddl', '.dml',
    // Config files
    '.json', '.yaml', '.yml', '.toml', '.ini', '.env',
    // Schema files
    '.prisma', '.graphql', '.gql'
  ]);

  private readonly FRAMEWORK_PATTERNS: Record<string, { patterns: RegExp[]; language: SupportedLanguage }> = {
    sequelize: {
      patterns: [/sequelize/i, /\.define\(/i, /DataTypes\./i],
      language: 'javascript'
    },
    prisma: {
      patterns: [/schema\.prisma/i, /@prisma\/client/i, /prisma\./i],
      language: 'typescript'
    },
    mongoose: {
      patterns: [/mongoose/i, /\.Schema\(/i, /model\(/i],
      language: 'javascript'
    },
    typeorm: {
      patterns: [/typeorm/i, /@Entity/i, /@Column/i],
      language: 'typescript'
    },
    django: {
      patterns: [/django\.db/i, /models\.Model/i, /migrations\//i],
      language: 'python'
    },
    sqlalchemy: {
      patterns: [/sqlalchemy/i, /Base\.metadata/i, /Column\(/i],
      language: 'python'
    },
    alembic: {
      patterns: [/alembic/i, /upgrade\(\)/i, /downgrade\(\)/i],
      language: 'python'
    },
    laravel: {
      patterns: [/Illuminate\\Database/i, /Schema::/i, /Migration/i],
      language: 'php'
    },
    eloquent: {
      patterns: [/Eloquent\\Model/i, /belongsTo\(/i, /hasMany\(/i],
      language: 'php'
    },
    hibernate: {
      patterns: [/@Entity/i, /@Table/i, /@Column/i],
      language: 'java'
    },
    jpa: {
      patterns: [/javax\.persistence/i, /@Entity/i, /@Id/i],
      language: 'java'
    },
    'spring-data': {
      patterns: [/JpaRepository/i, /CrudRepository/i, /@Repository/i],
      language: 'java'
    }
  };

  /**
   * Scan project directory for relevant files
   */
  async scanProject(projectPath: string, options: ExtractionOptions): Promise<FileInfo[]> {
    const files: FileInfo[] = [];
    const startTime = Date.now();

    try {
      console.log(`🔍 Scanning project: ${projectPath}`);
      
      // Create glob patterns for chokidar
      const globPatterns = this.createGlobPatterns(options);
      const ignorePatterns = this.createIgnorePatterns(options);

      const watcher = chokidar.watch(globPatterns, {
        cwd: projectPath,
        ignored: ignorePatterns,
        ignoreInitial: false,
        depth: options.maxDepth,
        followSymlinks: false,
        usePolling: false
      });

      const filePromises: Promise<FileInfo | null>[] = [];

      // Set up timeout
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('Scan timeout')), options.scanTimeout);
      });

      const scanPromise = new Promise<void>((resolve) => {
        watcher.on('add', (filePath: string) => {
          const fullPath = path.resolve(projectPath, filePath);
          filePromises.push(this.analyzeFileFromPath(fullPath, filePath));
        });

        watcher.on('ready', () => {
          resolve();
        });
      });

      // Wait for scan to complete or timeout
      await Promise.race([scanPromise, timeoutPromise]);
      
      // Process all files
      const fileResults = await Promise.allSettled(filePromises);
      
      for (const result of fileResults) {
        if (result.status === 'fulfilled' && result.value) {
          files.push(result.value);
        }
      }

      await watcher.close();

      const scanTime = Date.now() - startTime;
      console.log(`📋 Found ${files.length} files in ${scanTime}ms`);
      
      return files.sort((a, b) => a.path.localeCompare(b.path));

    } catch (error) {
      console.error('Failed to scan project:', error);
      throw new Error(`Project scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze file from path
   */
  async analyzeFileFromPath(fullPath: string, relativePath: string): Promise<FileInfo | null> {
    try {
      if (!fs.existsSync(fullPath)) {
        return null;
      }

      const stats = fs.statSync(fullPath);
      if (!stats.isFile()) {
        return null;
      }

      // Read file content for analysis
      const buffer = fs.readFileSync(fullPath);
      const content = buffer.toString('utf8');
      
      return this.analyzeFile(relativePath, content, {
        size: stats.size,
        lastModified: stats.mtime
      });

    } catch (error) {
      console.warn(`Failed to analyze file ${relativePath}:`, error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  /**
   * Analyze file content and create FileInfo
   */
  async analyzeFile(
    filePath: string, 
    content: string, 
    stats?: { size: number; lastModified: Date }
  ): Promise<FileInfo | null> {
    const extension = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath);
    
    // Skip if extension not supported
    if (!this.SUPPORTED_EXTENSIONS.has(extension)) {
      return null;
    }

    // Generate content hash
    const hash = crypto.SHA256(content).toString();

    // Determine MIME type
    const mimeType = lookup(filePath) || 'application/octet-stream';

    // Detect language
    const language = this.detectLanguage(extension, content);

    // Detect framework
    const framework = this.detectFramework(content, language);

    // Detect encoding
    const encoding = this.detectEncoding(content);

    const fileInfo: FileInfo = {
      path: filePath,
      name: fileName,
      extension,
      size: stats?.size || Buffer.byteLength(content, 'utf8'),
      mimeType,
      hash,
      language,
      framework,
      lastModified: stats?.lastModified || new Date(),
      encoding
    };

    return fileInfo;
  }

  /**
   * Create file content object
   */
  async createFileContent(fileInfo: FileInfo, content: string): Promise<FileContent> {
    return {
      info: fileInfo,
      content,
      lines: content.split('\n'),
      // AST will be added by the AST parsing service
      ast: undefined
    };
  }

  /**
   * Detect programming language from extension and content
   */
  private detectLanguage(extension: string, content: string): SupportedLanguage | undefined {
    // Primary detection by extension
    const extensionMap: Record<string, SupportedLanguage> = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.mjs': 'javascript',
      '.cjs': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.pyx': 'python',
      '.pyi': 'python',
      '.pyw': 'python',
      '.php': 'php',
      '.php3': 'php',
      '.php4': 'php',
      '.php5': 'php',
      '.phtml': 'php',
      '.java': 'java'
    };

    const primaryLanguage = extensionMap[extension];
    if (primaryLanguage) {
      return primaryLanguage;
    }

    // Secondary detection by content patterns
    if (content.includes('#!/usr/bin/env node') || content.includes('require(') || content.includes('import ')) {
      if (content.includes('interface ') || content.includes('type ') || content.includes(': string')) {
        return 'typescript';
      }
      return 'javascript';
    }

    if (content.includes('#!/usr/bin/env python') || content.includes('import ') || content.includes('def ')) {
      return 'python';
    }

    if (content.includes('<?php') || content.includes('namespace ') || content.includes('class ')) {
      return 'php';
    }

    if (content.includes('public class ') || content.includes('package ') || content.includes('import java.')) {
      return 'java';
    }

    return undefined;
  }

  /**
   * Detect framework from content patterns
   */
  private detectFramework(content: string, language?: SupportedLanguage): SupportedFramework | undefined {
    const candidates: { framework: SupportedFramework; score: number }[] = [];

    for (const [framework, config] of Object.entries(this.FRAMEWORK_PATTERNS)) {
      if (language && config.language !== language) {
        continue;
      }

      let score = 0;
      for (const pattern of config.patterns) {
        const matches = content.match(pattern);
        if (matches) {
          score += matches.length;
        }
      }

      if (score > 0) {
        candidates.push({ framework: framework as SupportedFramework, score });
      }
    }

    // Return framework with highest score
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.score - a.score);
      return candidates[0].framework;
    }

    return undefined;
  }

  /**
   * Detect text encoding
   */
  private detectEncoding(content: string): string {
    // Simple encoding detection
    try {
      // Try to encode/decode as UTF-8
      const buffer = Buffer.from(content, 'utf8');
      const decoded = buffer.toString('utf8');
      if (decoded === content) {
        return 'utf8';
      }
    } catch (error) {
      // Fallback to ASCII if UTF-8 fails
      return 'ascii';
    }

    return 'utf8';
  }

  /**
   * Create glob patterns for file scanning
   */
  private createGlobPatterns(options: ExtractionOptions): string[] {
    const patterns: string[] = [];

    // Add patterns based on supported languages
    if (options.languages.includes('javascript') || options.languages.includes('typescript')) {
      patterns.push('**/*.{js,jsx,ts,tsx,mjs,cjs}');
    }

    if (options.languages.includes('python')) {
      patterns.push('**/*.{py,pyx,pyi,pyw}');
    }

    if (options.languages.includes('php')) {
      patterns.push('**/*.{php,php3,php4,php5,phtml}');
    }

    if (options.languages.includes('java')) {
      patterns.push('**/*.{java}');
    }

    // Add schema and config files
    patterns.push('**/*.{sql,ddl,dml,prisma,graphql,gql}');
    patterns.push('**/*.{json,yaml,yml,toml,ini,env}');

    return patterns;
  }

  /**
   * Create ignore patterns for file scanning
   */
  private createIgnorePatterns(options: ExtractionOptions): string[] {
    const patterns = [...options.ignorePatterns];

    // Add default ignore patterns if not in hidden mode
    if (!options.includeHidden) {
      patterns.push('**/.*', '**/.git/**', '**/node_modules/**');
    }

    // Add binary and compiled file patterns
    patterns.push(
      '**/*.{exe,dll,so,dylib,class,jar,war,ear}',
      '**/*.{jpg,jpeg,png,gif,bmp,ico,svg}',
      '**/*.{mp3,mp4,avi,mov,wmv,flv}',
      '**/*.{zip,tar,gz,rar,7z}',
      '**/*.min.js',
      '**/*.bundle.js'
    );

    return patterns;
  }

  /**
   * Validate file for processing
   */
  validateFile(fileInfo: FileInfo): { isValid: boolean; reason?: string } {
    // Check file size (skip very large files)
    if (fileInfo.size > 10 * 1024 * 1024) { // 10MB limit
      return { isValid: false, reason: 'File too large' };
    }

    // Check if it's a supported extension
    if (!this.SUPPORTED_EXTENSIONS.has(fileInfo.extension)) {
      return { isValid: false, reason: 'Unsupported file type' };
    }

    // Check if it's a binary file
    if (fileInfo.mimeType.startsWith('image/') || 
        fileInfo.mimeType.startsWith('video/') || 
        fileInfo.mimeType.startsWith('audio/')) {
      return { isValid: false, reason: 'Binary file type' };
    }

    return { isValid: true };
  }

  /**
   * Get file statistics
   */
  getFileStatistics(files: FileInfo[]): {
    totalFiles: number;
    byLanguage: Record<string, number>;
    byFramework: Record<string, number>;
    byExtension: Record<string, number>;
    totalSize: number;
  } {
    const stats = {
      totalFiles: files.length,
      byLanguage: {} as Record<string, number>,
      byFramework: {} as Record<string, number>,
      byExtension: {} as Record<string, number>,
      totalSize: 0
    };

    for (const file of files) {
      // Count by language
      if (file.language) {
        stats.byLanguage[file.language] = (stats.byLanguage[file.language] || 0) + 1;
      }

      // Count by framework
      if (file.framework) {
        stats.byFramework[file.framework] = (stats.byFramework[file.framework] || 0) + 1;
      }

      // Count by extension
      stats.byExtension[file.extension] = (stats.byExtension[file.extension] || 0) + 1;

      // Add to total size
      stats.totalSize += file.size;
    }

    return stats;
  }
}
