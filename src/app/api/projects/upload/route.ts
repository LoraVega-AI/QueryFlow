// API route for uploading projects with database files
// POST /api/projects/upload

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readdir, stat } from 'fs/promises';
import { join, extname, basename } from 'path';
import { dbConnectionManager } from '@/utils/databaseConnection';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createGunzip } from 'zlib';
import { createUnzip } from 'zlib';
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
    for (const file of files) {
      const filePath = join(uploadDir, file.name);
      // Handle binary files properly
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);
      filePaths.push(filePath);
      
      console.log(`Saved file: ${file.name} (${buffer.length} bytes)`);
      
      // If it's a zip file, extract it
      if (file.name.toLowerCase().endsWith('.zip')) {
        await extractZipFile(filePath, uploadDir);
      }
    }

    // Detect project type and databases
    console.log('🔍 Detecting project type...');
    const detectionResult = detectProjectType(filePaths);
    console.log('📋 Project type detected:', detectionResult);
    
    // Extract and analyze database files from the upload directory
    console.log('🗄️ Extracting database files...');
    const databaseFiles = await extractDatabaseFiles(uploadDir);
    console.log('📊 Found database files:', databaseFiles.length);
    
    // Create project with database information
    console.log('🏗️ Creating project object...');
    
    // Merge schemas from all databases
    const allTables = databaseFiles.flatMap(db => db.tables || []);
    const allRelationships = databaseFiles.flatMap(db => db.schema?.relationships || []);
    const allIndexes = databaseFiles.flatMap(db => db.schema?.indexes || []);
    
    // Create comprehensive schema
    const mergedSchema = {
      id: `schema_${Date.now()}`,
      name: `${projectName || 'Uploaded Project'} Schema`,
      tables: allTables,
      relationships: allRelationships,
      indexes: allIndexes,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    };
    
    const project = {
      id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: projectName || detectionResult.projectName || 'Uploaded Project',
      description: projectDescription || `Database project with ${databaseFiles.length} file(s) uploaded via QueryFlow`,
      technology: 'sqlite',
      status: 'disconnected',
      lastSynced: null,
      databaseCount: databaseFiles.length,
      icon: '🗄️',
      color: 'blue',
      isExample: false,
      databases: databaseFiles,
      schema: mergedSchema,
      tables: allTables,
      queries: [],
      uploadPath: uploadDir,
      originalFiles: filePaths,
      // Additional metadata
      totalTables: allTables.length,
      totalRows: databaseFiles.reduce((sum, db) => sum + (db.totalRows || 0), 0),
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
    console.log('🔍 Searching for database files in:', uploadDir);
    // Find all potential database files
    const dbFiles = await findDatabaseFiles(uploadDir);
    console.log('📁 Found database files:', dbFiles);
    
    for (const dbFile of dbFiles) {
      console.log('🔬 Analyzing database file:', dbFile);
      const dbInfo = await analyzeDatabaseFile(dbFile, uploadDir);
      if (dbInfo) {
        console.log('✅ Database file analyzed successfully:', dbInfo.name);
        databaseFiles.push(dbInfo);
      } else {
        console.log('❌ Failed to analyze database file:', dbFile);
      }
    }
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
    console.log(`🧪 Testing database file: ${filePath}`);
    
    // Check if file exists and is readable
    const fileStats = await stat(filePath);
    console.log(`📊 File stats:`, { size: fileStats.size, isFile: fileStats.isFile() });
    
    if (!fileStats.isFile()) {
      console.log('❌ Not a file:', filePath);
      return { success: false };
    }
    
    // Test database file directly using sqlite3
    console.log('🔌 Loading SQLite modules...');
    const sqlite3 = require('sqlite3');
    const { open } = require('sqlite');
    
    console.log('🔓 Opening database...');
    console.log('🔓 Database file path:', filePath);
    console.log('🔓 File exists:', require('fs').existsSync(filePath));
    
    const db = await open({
      filename: filePath,
      driver: sqlite3.Database
    });
    
    console.log('✅ Database opened successfully');
    
    // Get table names
    console.log('📋 Getting table names...');
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    console.log(`📊 Found ${tables.length} tables:`, tables.map((t: any) => t.name));
    
    // Get table info for each table
    const schemaTables = [];
    for (const table of tables) {
      console.log(`🔍 Analyzing table: ${table.name}`);
      const columns = await db.all(`PRAGMA table_info(${table.name})`);
      console.log(`📝 Table ${table.name} has ${columns.length} columns:`, columns.map((c: any) => c.name));
      
      // Get row count
      let rowCount = 0;
      try {
        const countResult = await db.get(`SELECT COUNT(*) as count FROM ${table.name}`);
        rowCount = countResult.count;
      } catch (countError) {
        console.warn(`Could not get row count for table ${table.name}:`, countError);
      }
      
      // Get foreign key information
      const foreignKeys = await db.all(`PRAGMA foreign_key_list(${table.name})`);
      console.log(`🔗 Table ${table.name} has ${foreignKeys.length} foreign keys`);
      
      // Get indexes
      const indexes = await db.all(`PRAGMA index_list(${table.name})`);
      console.log(`📇 Table ${table.name} has ${indexes.length} indexes`);
      
      schemaTables.push({
        id: `table_${table.name}_${Date.now()}`,
        name: table.name,
        rowCount: rowCount,
        columns: columns.map((col: any, index: number) => ({
          id: `col_${col.name}_${index}`,
          name: col.name,
          type: col.type,
          nullable: !col.notnull,
          primaryKey: col.pk === 1,
          defaultValue: col.dflt_value,
          unique: false, // SQLite doesn't expose this in PRAGMA table_info
          autoIncrement: col.type.toUpperCase().includes('INTEGER') && col.pk === 1
        })),
        relationships: foreignKeys.map((fk: any, index: number) => ({
          id: `fk_${table.name}_${index}`,
          fromColumn: fk.from,
          toTable: fk.table,
          toColumn: fk.to,
          onUpdate: fk.on_update,
          onDelete: fk.on_delete
        })),
        indexes: indexes.map((idx: any, index: number) => ({
          id: `idx_${idx.name}_${index}`,
          name: idx.name,
          unique: idx.unique === 1,
          type: 'btree' // SQLite default
        })),
        position: { x: schemaTables.length * 200, y: schemaTables.length * 100 },
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    // Create comprehensive schema object
    const schema = {
      id: `schema_${Date.now()}`,
      name: `Database Schema`,
      tables: schemaTables,
      relationships: schemaTables.flatMap(table => table.relationships),
      indexes: schemaTables.flatMap(table => table.indexes),
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    };
    
    console.log('🔒 Closing database...');
    await db.close();
    console.log('✅ Database closed successfully');
    
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
  const fileNames = filePaths.map(f => f.toLowerCase());
  
  // Check for package.json (Node.js)
  if (fileNames.some(f => f.includes('package.json'))) {
    return { projectName: 'Node.js Project', projectType: 'nodejs' };
  }
  
  // Check for requirements.txt or setup.py (Python)
  if (fileNames.some(f => f.includes('requirements.txt') || f.includes('setup.py'))) {
    return { projectName: 'Python Project', projectType: 'python' };
  }
  
  // Check for Django
  if (fileNames.some(f => f.includes('manage.py') || f.includes('settings.py'))) {
    return { projectName: 'Django Project', projectType: 'django' };
  }
  
  // Check for Laravel
  if (fileNames.some(f => f.includes('artisan') || f.includes('composer.json'))) {
    return { projectName: 'Laravel Project', projectType: 'laravel' };
  }
  
  // Check for React
  if (fileNames.some(f => f.includes('src/app.js') || f.includes('src/index.js'))) {
    return { projectName: 'React Project', projectType: 'react' };
  }
  
  // Check for Next.js
  if (fileNames.some(f => f.includes('next.config.js') || f.includes('pages/'))) {
    return { projectName: 'Next.js Project', projectType: 'nextjs' };
  }
  
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
    unknown: '❓'
  };
  
  return icons[projectType] || '📁';
}

async function extractZipFile(zipPath: string, extractDir: string): Promise<void> {
  try {
    // Use adm-zip for extraction
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(zipPath);
    
    // Create extraction directory
    await mkdir(extractDir, { recursive: true });
    
    // Extract all files
    zip.extractAllTo(extractDir, true);
    
    console.log(`Extracted zip file ${zipPath} to ${extractDir}`);
    
    // List extracted files for debugging
    const extractedFiles = await readdir(extractDir, { withFileTypes: true });
    console.log(`Extracted ${extractedFiles.length} items:`, extractedFiles.map(f => f.name));
    
  } catch (error) {
    console.error('Error extracting zip file:', error);
    throw error;
  }
}
