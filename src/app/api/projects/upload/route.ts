// API route for uploading projects with database files
// POST /api/projects/upload

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readdir, stat, readFile } from 'fs/promises';
import path, { join, extname, basename } from 'path';
import { dbConnectionManager } from '@/utils/databaseConnection';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createGunzip } from 'zlib';
import { createUnzip } from 'zlib';
import { DatabaseFileDetector } from '@/utils/databaseFileDetector';
import { broadcastMessage } from '@/utils/realtimeBroadcast';

export async function POST(request: NextRequest) {
  try {
    console.log('📤 Upload API called');
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const projectName = formData.get('projectName') as string;
    const projectDescription = formData.get('projectDescription') as string;

    console.log('📁 Files received:', files.length);
    console.log('📁 File details:', files.map(f => ({ name: f.name, size: f.size, type: f.type })));
    console.log('📝 Project name:', projectName);
    console.log('📝 Project description:', projectDescription);
    
    // Log all form data entries
    console.log('📋 All form data entries:');
    for (const [key, value] of formData.entries()) {
      console.log(`  ${key}:`, value);
    }

    if (!files || files.length === 0) {
      console.log('❌ No files provided');
      return NextResponse.json({
        success: false,
        message: 'No files provided'
      }, { status: 400 });
    }

    // Create upload directory
    const uploadDir = join(process.cwd(), 'uploads', `project_${Date.now()}`);
    console.log('📁 Creating upload directory:', uploadDir);
    await mkdir(uploadDir, { recursive: true });
    console.log('✅ Upload directory created successfully');

    // Save uploaded files and extract if needed
    const filePaths: string[] = [];
    const zipFiles: string[] = [];

    for (const file of files) {
      const filePath = join(uploadDir, file.name);
      // Handle binary files properly
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);
      filePaths.push(filePath);

      console.log(`Saved file: ${file.name} (${buffer.length} bytes)`);

      // Collect zip files for later extraction
      if (file.name.toLowerCase().endsWith('.zip')) {
        zipFiles.push(filePath);
      }
    }

    // Extract all zip files to subdirectories
    for (const zipFile of zipFiles) {
      await extractZipFile(zipFile, uploadDir);
    }

    // Get all files after extraction (including those from zip files)
    const allFiles = await findAllFiles(uploadDir);
    console.log(`📁 Total files after extraction: ${allFiles.length}`);

    // Log some sample files for debugging
    if (allFiles.length > 0) {
      console.log('📄 Sample files found:', allFiles.slice(0, 10).map(f => basename(f)));
      if (allFiles.length > 10) {
        console.log(`... and ${allFiles.length - 10} more files`);
      }
    }

    // Detect project type using all files
    console.log('🔍 Detecting project type...');
    const detectionResult = detectProjectType(allFiles);
    console.log('📋 Project type detected:', detectionResult);

    // Extract and analyze database files from the upload directory
    console.log('🗄️ Extracting database files...');
    const databaseFiles = await extractDatabaseFiles(uploadDir);
    console.log('📊 Found database files:', databaseFiles.length);

    // Log database file details with data extraction info
    if (databaseFiles.length > 0) {
      console.log('🗃️ Database files found:');
      databaseFiles.forEach((db, index) => {
        const totalDataRows = db.tables?.reduce((sum: number, table: any) => sum + (table.data?.length || 0), 0) || 0;
        console.log(`  ${index + 1}. ${db.name} (${db.type}) - ${db.status}`);
        console.log(`      Tables: ${db.tables?.length || 0}, Total Data Rows Extracted: ${totalDataRows}`);
      });
    }

    // Also extract database definitions from source code using the new extractor
    console.log('🔍 Extracting database definitions from source code...');
    console.log('📁 All files for extraction:', allFiles.slice(0, 10).map(f => path.basename(f)));
    console.log('📁 All files count:', allFiles.length);
    console.log('📁 Upload directory:', uploadDir);
    
    // Extract database definitions from source code
    const { extractDatabaseDefinitionsFromSourceCode } = await import('./simpleExtraction.js');
    const sourceCodeDatabases = await extractDatabaseDefinitionsFromSourceCode(allFiles, uploadDir);
    console.log('📊 Found source code databases:', sourceCodeDatabases.length);
    console.log('📊 Source code databases details:', sourceCodeDatabases.map(db => ({ name: db.name, type: db.type, tables: db.tables?.length || 0 })));

    // Extract migration history and ORM models
    console.log('🔍 Extracting migration history and ORM models...');
    const { ComprehensiveDatabaseExtractor } = await import('@/services/comprehensiveDatabaseExtractor');
    
    const migrationHistory = await ComprehensiveDatabaseExtractor.extractMigrationHistory(uploadDir);
    const ormModels = await ComprehensiveDatabaseExtractor.extractORMModels(uploadDir);
    
    console.log(`📋 Found migration history: ${migrationHistory ? 'Yes' : 'No'}`);
    console.log(`📋 Found ORM models: ${ormModels.length}`);
    
    if (migrationHistory) {
      console.log(`   📄 ${migrationHistory.migrations.length} migrations (${migrationHistory.framework})`);
    }
    if (ormModels.length > 0) {
      console.log(`   🏗️ ORM models: ${ormModels.map(m => `${m.name} (${m.framework})`).join(', ')}`);
    }

    // Combine both actual database files and extracted definitions
    const allDatabases = [...databaseFiles, ...sourceCodeDatabases];
    console.log('📊 Total databases found:', allDatabases.length);

    // Check if we have any databases at all
    if (allDatabases.length === 0) {
      console.log('❌ No databases found (neither actual files nor extracted definitions)');
      return NextResponse.json({
        success: false,
        message: 'No database files or database definitions found in the uploaded content. Please ensure your project contains database files (.db, .sqlite) or source code with database models (Sequelize, Django, Laravel, etc.)'
      }, { status: 400 });
    }
    
    // Create project with database information
    console.log('🏗️ Creating project object...');
    
    // Merge schemas from all databases (both actual files and extracted definitions)
    const allTables = allDatabases.flatMap(db => db.tables || []);
    const allRelationships = allDatabases.flatMap(db => db.schema?.relationships || []);
    const allIndexes = allDatabases.flatMap(db => db.schema?.indexes || []);
    
    // Create comprehensive schema with enhanced metadata
    const mergedSchema = {
      id: `schema_${Date.now()}`,
      name: `${projectName || 'Uploaded Project'} Schema`,
      tables: allTables,
      relationships: allRelationships,
      indexes: allIndexes,
      migrationHistory,
      ormModels,
      databaseInfo: allDatabases[0]?.schema?.databaseInfo || {
        type: 'mixed',
        version: 'unknown',
        encoding: 'UTF-8'
      },
      views: allDatabases.flatMap(db => db.schema?.views || []),
      triggers: allDatabases.flatMap(db => db.schema?.triggers || []),
      functions: allDatabases.flatMap(db => db.schema?.functions || []),
      procedures: allDatabases.flatMap(db => db.schema?.procedures || []),
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    };
    
    const project = {
      id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: projectName || detectionResult.projectName || 'Uploaded Project',
      description: projectDescription || `Database project with ${allDatabases.length} file(s) uploaded via QueryFlow`,
      technology: 'sqlite',
      status: 'disconnected',
      lastSynced: null,
      databaseCount: allDatabases.length,
      icon: '🗄️',
      color: 'blue',
      isExample: false,
      databases: allDatabases,
      schema: mergedSchema,
      tables: allTables,
      queries: [],
      uploadPath: uploadDir,
      originalFiles: filePaths,
      // Additional metadata
      totalTables: allTables.length,
      totalRows: allDatabases.reduce((sum, db) => sum + (db.totalRows || 0), 0),
      hasForeignKeys: allRelationships.length > 0,
      hasIndexes: allIndexes.length > 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('📋 Project object created:', {
      id: project.id,
      name: project.name,
      technology: project.technology,
      databaseCount: project.databaseCount,
      databases: project.databases.length
    });

    // Save project to database
    try {
      console.log('🔄 Initializing app data...');
      await dbConnectionManager.initializeAppData();
      console.log('✅ App data initialized successfully');
      
      console.log('💾 Saving project to database...');
      await dbConnectionManager.saveProject(project);
      console.log('✅ Project saved to database successfully');
      
      // Broadcast real-time update
      try {
        broadcastMessage({
          type: 'project_created',
          data: {
            id: project.id,
            name: project.name,
            databaseCount: project.databaseCount,
            totalTables: project.totalTables,
            totalRows: project.totalRows
          },
          timestamp: Date.now()
        });
        console.log('📡 Real-time update broadcasted');
      } catch (error) {
        console.warn('⚠️ Failed to broadcast real-time update:', error);
      }
      
      console.log('✅ Project created successfully:', {
        id: project.id,
        name: project.name,
        technology: project.technology,
        databaseCount: project.databaseCount,
        databases: project.databases.length
      });
    } catch (dbError) {
      console.error('❌ Database save failed:', dbError);
      console.error('❌ Database error type:', typeof dbError);
      console.error('❌ Database error message:', dbError instanceof Error ? dbError.message : 'Unknown error');
      console.error('❌ Database error stack:', dbError instanceof Error ? dbError.stack : 'No stack');
      throw new Error(`Failed to save project to database: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
    }

    const response = {
      success: true,
      message: 'Project uploaded successfully',
      data: project
    };
    
    console.log('📤 Sending response:', {
      success: response.success,
      message: response.message,
      projectId: response.data.id,
      projectName: response.data.name,
      databaseCount: response.data.databaseCount
    });
    
    return NextResponse.json(response);

  } catch (error: any) {
    console.error('❌ Project upload error:', error);
    console.error('❌ Error type:', typeof error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    
    const errorResponse = {
      success: false,
      message: 'Failed to upload project',
      error: error.message,
      details: {
        type: typeof error,
        stack: error.stack
      }
    };
    console.log('📤 Sending error response:', errorResponse);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

async function extractDatabaseFiles(uploadDir: string): Promise<any[]> {
  const databaseFiles: any[] = [];
  
  try {
    console.log('🔍 Searching for comprehensive database files in:', uploadDir);
    
    // Use new DatabaseFileDetector to find all database-related files
    const detectedFiles = await DatabaseFileDetector.findDatabaseFiles(uploadDir);
    console.log('📁 Found database-related files:', detectedFiles.length);

    if (detectedFiles.length === 0) {
      console.log('⚠️ No actual database files found in upload directory');
      // Don't return error here - we'll check for extracted definitions later
    }

    // Convert detected files to a standardized format with enhanced error handling
    const convertedDatabases = await DatabaseFileDetector.convertDatabaseFiles(detectedFiles, uploadDir);

    // Filter and process converted databases with detailed logging
    const validDatabases: any[] = [];
    const errorDatabases: any[] = [];
    const skippedDatabases: any[] = [];

    for (const database of convertedDatabases) {
      console.log('🔬 Processing database:', database.name, '- Status:', database.status);

      switch (database.status) {
        case 'ready':
          console.log('✅ Database ready for use:', database.name);
          validDatabases.push(database);
          break;
        case 'error':
          console.log('❌ Database conversion failed:', database.name, database.error);
          errorDatabases.push(database);
          break;
        case 'skipped':
          console.log('⏭️ Database skipped:', database.name);
          skippedDatabases.push(database);
          break;
        case 'unknown':
          console.log('❓ Unknown database type:', database.name);
          skippedDatabases.push(database);
          break;
        default:
          console.log('⚠️ Unexpected database status:', database.status, database.name);
          skippedDatabases.push(database);
      }
    }

    // Log detailed conversion summary
    console.log('📊 Database Conversion Summary:');
    console.log(`   ✅ Valid databases: ${validDatabases.length}`);
    console.log(`   ❌ Failed conversions: ${errorDatabases.length}`);
    console.log(`   ⏭️ Skipped/Unknown: ${skippedDatabases.length}`);
    console.log(`   📁 Total processed: ${convertedDatabases.length}`);

    // If no valid databases were found, return error
    if (validDatabases.length === 0) {
      const errorMessages = errorDatabases.map(db => db.error).filter(Boolean);
      const primaryError = errorMessages.length > 0 ? errorMessages[0] : 'No valid databases could be processed';

      console.log('❌ No valid databases found after processing');
      // Return empty array instead of NextResponse - the error will be handled by the calling function
      return [];
    }

    // Use valid databases for project creation
    databaseFiles.push(...validDatabases);
  } catch (error) {
    console.error('❌ Error extracting database files:', error);
  }

  console.log('📊 Total database files processed:', databaseFiles.length);
  return databaseFiles;
}

async function findDatabaseFiles(dir: string): Promise<string[]> {
  const dbFiles: string[] = [];
  const dbExtensions = ['.db', '.sqlite', '.sqlite3', '.db3', '.s3db', '.sl3'];
  
  console.log(`Searching for database files in: ${dir}`);
  
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    console.log(`Found ${entries.length} entries in directory`);
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      console.log(`Checking entry: ${entry.name} (isDirectory: ${entry.isDirectory()})`);
      
      if (entry.isDirectory()) {
        // Recursively search subdirectories
        const subFiles = await findDatabaseFiles(fullPath);
        dbFiles.push(...subFiles);
      } else if (entry.isFile()) {
        const ext = extname(entry.name).toLowerCase();
        console.log(`File: ${entry.name}, Extension: ${ext}, Matches: ${dbExtensions.includes(ext)}`);
        if (dbExtensions.includes(ext)) {
          dbFiles.push(fullPath);
          console.log(`Added database file: ${fullPath}`);
        }
      }
    }
  } catch (error) {
    console.error('Error finding database files:', error);
  }

  console.log(`Found ${dbFiles.length} database files:`, dbFiles);
  return dbFiles;
}

async function analyzeDatabaseFile(filePath: string, uploadDir: string): Promise<any | null> {
  try {
    console.log('🔍 Analyzing database file:', filePath);
    const fileName = basename(filePath);
    const relativePath = filePath.replace(uploadDir, '').replace(/\\/g, '/');
    
    console.log('📝 File details:', { fileName, relativePath });
    
    // Test if it's a valid SQLite database
    console.log('🧪 Testing database file...');
    const testResult = await testDatabaseFile(filePath);
    console.log('🧪 Test result:', testResult);
    
    if (testResult.success) {
      const dbInfo = {
        id: `db_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: fileName.replace(extname(fileName), ''),
        type: 'sqlite',
        connectionString: filePath,
        filePath: filePath,
        relativePath: relativePath,
        isConnected: false,
        lastSync: null,
        tables: testResult.tables || [],
        schema: testResult.schema || null,
        size: (await stat(filePath)).size,
        status: 'ready',
        // Additional metadata
        tableCount: testResult.tables?.length || 0,
        totalRows: testResult.tables?.reduce((sum, table) => sum + (table.rowCount || 0), 0) || 0,
        hasForeignKeys: testResult.tables?.some(table => table.relationships?.length > 0) || false,
        hasIndexes: testResult.tables?.some(table => table.indexes?.length > 0) || false
      };
      console.log('✅ Database info created:', {
        name: dbInfo.name,
        tableCount: dbInfo.tableCount,
        totalRows: dbInfo.totalRows,
        hasSchema: !!dbInfo.schema
      });
      return dbInfo;
    } else {
      console.log('❌ Database test failed for:', filePath);
    }
  } catch (error) {
    console.error(`❌ Error analyzing database file ${filePath}:`, error);
  }

  return null;
}

async function testDatabaseFile(filePath: string): Promise<{ success: boolean; tables?: any[]; schema?: any }> {
  try {
    console.log(`🧪 Testing database file with comprehensive extraction: ${filePath}`);
    
    // Check if file exists and is readable
    const fileStats = await stat(filePath);
    console.log(`📊 File stats:`, { size: fileStats.size, isFile: fileStats.isFile() });
    
    if (!fileStats.isFile()) {
      console.log('❌ Not a file:', filePath);
      return { success: false };
    }
    
    // Use comprehensive database extractor
    console.log('🔍 Starting comprehensive database extraction...');
    const { ComprehensiveDatabaseExtractor } = await import('@/services/comprehensiveDatabaseExtractor');
    
    const extractionResult = await ComprehensiveDatabaseExtractor.extractSQLiteDatabase(filePath);
    console.log('✅ Comprehensive extraction completed');
    console.log(`📊 Extracted ${extractionResult.tables.length} tables with full metadata`);
    
    // Use the comprehensive extraction result
    const schemaTables = extractionResult.tables;
    
    // Create comprehensive schema object with enhanced metadata
    const schema = {
      id: `schema_${Date.now()}`,
      name: `Database Schema`,
      tables: schemaTables,
      relationships: schemaTables.flatMap(table => table.relationships || []),
      indexes: extractionResult.indexes || [],
      views: extractionResult.views || [],
      triggers: extractionResult.triggers || [],
      databaseInfo: extractionResult.databaseInfo,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    };
    
    console.log('✅ Comprehensive database extraction completed successfully');
    
    return {
      success: true,
      tables: schemaTables,
      schema: schema
    };

  } catch (error) {
    console.error('❌ Error testing database file:', error);
    return { success: false };
  }
}

function detectProjectType(filePaths: string[]): { projectName: string; projectType: string } {
  // Create a set of file names for quick lookup
  const fileNames = new Set(filePaths.map(f => basename(f).toLowerCase()));

  // Create a set of directory names for quick lookup
  const directories = new Set();
  filePaths.forEach(f => {
    const parts = f.split('/');
    for (let i = 0; i < parts.length - 1; i++) {
      directories.add(parts.slice(0, i + 1).join('/').toLowerCase());
    }
  });

  console.log('🔍 Analyzing project structure...');
  console.log('📁 Found files:', Array.from(fileNames));
  console.log('📂 Found directories:', Array.from(directories));

  // Check for Node.js projects
  if (fileNames.has('package.json')) {
    console.log('📦 Detected Node.js project');
    return { projectName: 'Node.js Project', projectType: 'nodejs' };
  }

  // Check for Python projects
  if (fileNames.has('requirements.txt') || fileNames.has('setup.py') || fileNames.has('pyproject.toml')) {
    console.log('🐍 Detected Python project');
    return { projectName: 'Python Project', projectType: 'python' };
  }

  // Check for Django
  if (fileNames.has('manage.py') || fileNames.has('settings.py')) {
    console.log('🎸 Detected Django project');
    return { projectName: 'Django Project', projectType: 'django' };
  }

  // Check for Laravel
  if (fileNames.has('artisan') || fileNames.has('composer.json')) {
    console.log('🎼 Detected Laravel project');
    return { projectName: 'Laravel Project', projectType: 'laravel' };
  }

  // Check for Ruby/Rails
  if (fileNames.has('gemfile') || fileNames.has('rails') || fileNames.has('config.ru')) {
    console.log('💎 Detected Ruby/Rails project');
    return { projectName: 'Ruby on Rails Project', projectType: 'rails' };
  }

  // Check for PHP projects
  if (fileNames.has('composer.json') && !fileNames.has('artisan')) {
    console.log('🐘 Detected PHP project');
    return { projectName: 'PHP Project', projectType: 'php' };
  }

  // Check for Java projects
  if (fileNames.has('pom.xml') || fileNames.has('build.gradle') || fileNames.has('build.gradle.kts')) {
    console.log('☕ Detected Java project');
    return { projectName: 'Java Project', projectType: 'java' };
  }

  // Check for React
  if (fileNames.has('src/app.js') || fileNames.has('src/index.js') ||
      (fileNames.has('package.json') && directories.has('src'))) {
    console.log('⚛️ Detected React project');
    return { projectName: 'React Project', projectType: 'react' };
  }

  // Check for Next.js
  if (fileNames.has('next.config.js') || directories.has('pages') || directories.has('app')) {
    console.log('▲ Detected Next.js project');
    return { projectName: 'Next.js Project', projectType: 'nextjs' };
  }

  // Check for Vue.js
  if (fileNames.has('vue.config.js') || fileNames.has('vite.config.js')) {
    console.log('💚 Detected Vue.js project');
    return { projectName: 'Vue.js Project', projectType: 'vue' };
  }

  // Check for Angular
  if (fileNames.has('angular.json') || directories.has('src/app')) {
    console.log('🅰️ Detected Angular project');
    return { projectName: 'Angular Project', projectType: 'angular' };
  }

  // Check for .NET/C#
  if (fileNames.has('project.csproj') || fileNames.has('project.sln') || fileNames.has('appsettings.json')) {
    console.log('🔷 Detected .NET/C# project');
    return { projectName: 'C#/.NET Project', projectType: 'csharp' };
  }

  // Check for Go projects
  if (fileNames.has('go.mod') || fileNames.has('main.go')) {
    console.log('🐹 Detected Go project');
    return { projectName: 'Go Project', projectType: 'go' };
  }

  // Check for Rust projects
  if (fileNames.has('cargo.toml')) {
    console.log('🦀 Detected Rust project');
    return { projectName: 'Rust Project', projectType: 'rust' };
  }

  // Check for database-heavy projects
  if (fileNames.has('schema.rb') || directories.has('migrations') || fileNames.has('schema.prisma')) {
    console.log('🗄️ Detected database-focused project');
    return { projectName: 'Database Project', projectType: 'database' };
  }

  console.log('❓ Could not determine specific project type');
  return { projectName: 'Uploaded Project', projectType: 'unknown' };
}

function getProjectIcon(projectType: string): string {
  const icons: { [key: string]: string } = {
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
    java: '☕',
    csharp: '🔷',
    go: '🐹',
    rust: '🦀',
    database: '🗄️',
    unknown: '❓'
  };
  
  return icons[projectType] || '📁';
}

async function extractZipFile(zipPath: string, extractDir: string): Promise<void> {
  try {
    const zipFileName = basename(zipPath, '.zip');
    const extractionSubdir = join(extractDir, zipFileName);

    console.log(`📦 Extracting zip file to subdirectory: ${extractionSubdir}`);

    // Use adm-zip for extraction
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(zipPath);

    // Create extraction subdirectory
    await mkdir(extractionSubdir, { recursive: true });

    // Extract all files to subdirectory
    zip.extractAllTo(extractionSubdir, true);

    console.log(`✅ Extracted zip file ${zipPath} to ${extractionSubdir}`);

    // List extracted files for debugging
    const extractedFiles = await readdir(extractionSubdir, { withFileTypes: true });
    console.log(`📁 Extracted ${extractedFiles.length} items:`, extractedFiles.map(f => f.name));

  } catch (error) {
    console.error('Error extracting zip file:', error);
    throw error;
  }
}

// Helper function to recursively find all files in a directory
async function findAllFiles(dir: string): Promise<string[]> {
  const allFiles: string[] = [];

  async function scanDirectory(currentDir: string): Promise<void> {
    const entries = await readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules and other common directories we don't want to scan
        if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== '__pycache__') {
          await scanDirectory(fullPath);
        }
      } else {
        allFiles.push(fullPath);
      }
    }
  }

  await scanDirectory(dir);
  return allFiles;
}

/**
 * Extract database definitions from source code files using the Database Definition Extractor
 */
async function extractDatabaseDefinitionsFromSourceCode(allFiles: string[], uploadDir: string): Promise<any[]> {
  try {
    console.log('🔍 Starting database definition extraction from source code...');
    console.log('🔍 Upload directory:', uploadDir);
    console.log('🔍 All files count:', allFiles.length);
    
    // Import the Database Definition Extractor
    const { DatabaseDefinitionExtractor } = await import('@/services/databaseDefinitionExtractor');
    
    // Filter source code files that might contain database definitions
    const sourceCodeFiles = allFiles.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.js', '.jsx', '.ts', '.tsx', '.py', '.php', '.java', '.prisma', '.sql'].includes(ext);
    });
    
    console.log(`📄 Found ${sourceCodeFiles.length} source code files to analyze`);
    console.log('📄 Source code files:', sourceCodeFiles.slice(0, 5).map(f => path.basename(f)));
    console.log('📄 Full source code files paths:', sourceCodeFiles);
    
    if (sourceCodeFiles.length === 0) {
      console.log('⚠️ No source code files found for database definition extraction');
      return [];
    }
    
    // Read file contents
    const fileContents = [];
    for (const filePath of sourceCodeFiles) {
      try {
        const content = await readFile(filePath, 'utf-8');
        const relativePath = filePath.replace(uploadDir, '').replace(/\\/g, '/');
        
        fileContents.push({
          name: relativePath,
          content: content
        });
      } catch (error) {
        console.warn(`Failed to read file ${filePath}:`, error instanceof Error ? error.message : 'Unknown error');
      }
    }
    
    console.log(`📖 Read ${fileContents.length} source code files`);
    console.log('📖 Sample file contents:', fileContents.slice(0, 2).map(f => ({ name: f.name, contentLength: f.content.length, preview: f.content.substring(0, 100) })));
    
    if (fileContents.length === 0) {
      return [];
    }
    
    // Initialize the extractor
    console.log('🔧 Initializing Database Definition Extractor...');
    console.log('🔧 File contents for extraction:', fileContents.map(f => ({ name: f.name, contentLength: f.content.length })));
    const extractor = new DatabaseDefinitionExtractor();
    
    // Extract database definitions
    console.log('🔍 Starting extraction process...');
    let extractionResult;
    try {
      extractionResult = await extractor.extractFromFiles(fileContents, {
        languages: ['javascript', 'typescript', 'python', 'php', 'java'],
        frameworks: ['sequelize', 'prisma', 'mongoose', 'typeorm', 'django', 'sqlalchemy', 'laravel', 'hibernate'],
        confidence: { 
          minimum: 50,
          regexWeight: 0.3,
          astWeight: 0.5,
          frameworkWeight: 0.2
        },
        parallelProcessing: true,
        enableASTCaching: true
      });
    } catch (extractionError) {
      console.error('❌ Extraction failed:', extractionError);
      console.error('❌ Extraction error details:', {
        message: extractionError instanceof Error ? extractionError.message : 'Unknown error',
        stack: extractionError instanceof Error ? extractionError.stack : 'No stack'
      });
      return [];
    }
    
    console.log(`🎉 Extraction completed! Found ${extractionResult.schema.tables.length} tables`);
    console.log('📊 Extraction result:', {
      tablesCount: extractionResult.schema.tables.length,
      hasSchema: !!extractionResult.schema,
      hasMetadata: !!extractionResult.metadata,
      confidence: extractionResult.metadata?.confidence
    });
    
    // Convert extraction result to database format
    if (extractionResult.schema.tables.length > 0) {
      const extractedDatabase = {
        id: `extracted_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: 'Extracted Schema',
        type: 'extracted',
        connectionString: 'extracted',
        filePath: 'extracted',
        relativePath: 'extracted',
        isConnected: false,
        lastSync: null,
        tables: extractionResult.schema.tables.map(table => ({
          id: table.name,
          name: table.name,
          columns: table.fields.map(field => ({
            id: field.name,
            name: field.name,
            type: field.type,
            nullable: field.nullable,
            primaryKey: field.primaryKey,
            defaultValue: field.defaultValue,
            foreignKey: field.foreignKey ? {
              tableId: field.foreignKey.table,
              columnId: field.foreignKey.field,
              relationshipType: 'one-to-many',
              onDelete: field.foreignKey.onDelete,
              onUpdate: field.foreignKey.onUpdate
            } : undefined,
            unique: field.unique,
            autoIncrement: field.autoIncrement,
            indexed: field.indexes && field.indexes.length > 0,
            constraints: field.constraints
          })),
          position: { x: 0, y: 0 },
          size: { width: 200, height: 100 },
          documentation: table.metadata.documentation,
          tags: table.metadata.tags
        })),
        schema: {
          tables: extractionResult.schema.tables,
          relationships: extractionResult.schema.relationships,
          metadata: extractionResult.schema.metadata
        },
        size: 0,
        status: 'ready',
        tableCount: extractionResult.schema.tables.length,
        totalRows: 0,
        hasForeignKeys: extractionResult.schema.relationships.length > 0,
        hasIndexes: extractionResult.schema.tables.some(table => table.indexes && table.indexes.length > 0),
        // Extraction metadata
        extractionMetadata: {
          confidence: extractionResult.metadata.confidence,
          frameworks: extractionResult.schema.metadata.frameworks,
          languages: extractionResult.schema.metadata.languages,
          sourceFiles: extractionResult.schema.sourceFiles,
          extractionTime: extractionResult.performance.totalTime
        }
      };
      
      console.log(`✅ Created extracted database with ${extractedDatabase.tableCount} tables`);
      return [extractedDatabase];
    }
    
    return [];
    
  } catch (error) {
    console.error('❌ Failed to extract database definitions from source code:', error);
    console.error('❌ Error type:', typeof error);
    console.error('❌ Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
    return [];
  }
}
