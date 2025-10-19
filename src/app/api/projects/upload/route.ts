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

    // Log ALL SQL files found
    const sqlFilesFound = allFiles.filter(f => f.toLowerCase().endsWith('.sql'));
    console.log(`📄 SQL FILES FOUND: ${sqlFilesFound.length}`);
    sqlFilesFound.forEach((file, index) => {
      console.log(`   ${index + 1}. ${path.basename(file)} - Full path: ${file}`);
    });

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
    console.log('📊 databaseFiles details:', JSON.stringify(databaseFiles.map(db => ({ 
      name: db.name, 
      type: db.type, 
      status: db.status,
      filePath: db.filePath,
      allKeys: Object.keys(db)
    })), null, 2));

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
    let sourceCodeDatabases = await extractDatabaseDefinitionsFromSourceCode(allFiles, uploadDir);
    console.log('📊 Found source code databases:', sourceCodeDatabases.length);
    console.log('📊 Source code databases details:', sourceCodeDatabases.map(db => ({ name: db.name, type: db.type, tables: db.tables?.length || 0 })));
    
    // Find SQLite database files for comprehensive verification
    // BYPASS databaseFiles array and scan upload directory directly
    console.log('🔍 Scanning upload directory for actual SQLite database files...');
    
    const sqliteDatabaseFiles: any[] = [];
    try {
      console.log('🔍 Starting file scan in:', uploadDir);
      const { readdir, stat } = await import('fs/promises');
      
      const findDbFiles = async (dir: string, files: any[]): Promise<void> => {
        try {
          const entries = await readdir(dir, { withFileTypes: true });
          console.log(`🔍 Scanning directory: ${dir} (${entries.length} entries)`);
          
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
              await findDbFiles(fullPath, files);
            } else if (entry.isFile()) {
              const ext = path.extname(entry.name).toLowerCase();
              const fileName = entry.name.toLowerCase();
              
              // Check if it's a database file (not converted)
              if ((ext === '.db' || ext === '.sqlite' || ext === '.sqlite3') && 
                  !fileName.includes('_converted_') && 
                  !fileName.includes('converted.sqlite')) {
                
                const stats = await stat(fullPath);
                console.log(`📁 Found DB file: ${entry.name} (${stats.size} bytes)`);
                
                // Only include non-empty files
                if (stats.size > 1024) { // At least 1KB
                  files.push({
                    id: `db_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    name: entry.name.replace(ext, ''),
                    type: 'sqlite',
                    filePath: fullPath,
                    size: stats.size,
                    status: 'ready'
                  });
                  console.log(`✅ Added to list: ${entry.name} (${(stats.size / 1024).toFixed(2)} KB)`);
                } else {
                  console.log(`⚠️ Skipped (too small): ${entry.name}`);
                }
              }
            }
          }
        } catch (dirError) {
          console.error(`❌ Error reading directory ${dir}:`, dirError);
        }
      };
      
      await findDbFiles(uploadDir, sqliteDatabaseFiles);
      console.log(`🔍 File scan complete. Found ${sqliteDatabaseFiles.length} database files`);
    } catch (error) {
      console.error('❌ Error scanning for database files:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    }
    
    console.log(`🔍 Found ${sqliteDatabaseFiles.length} actual SQLite database files`);
    if (sqliteDatabaseFiles.length > 0) {
      console.log('📊 SQLite files:', sqliteDatabaseFiles.map(db => ({ name: db.name, path: db.filePath, size: db.size })));
    } else {
      console.log('⚠️ No actual SQLite database files found in upload directory');
      console.log('⚠️ Upload directory was:', uploadDir);
    }
    
    // PRIORITY: If we have an actual SQLite database file, introspect it FIRST for real data
    let actualDatabaseIntrospection = null;
    let actualDatabaseTables = [];
    let actualTotalRows = 0;
    let actualTotalColumns = 0;
    
    if (sqliteDatabaseFiles.length > 0) {
      console.log('🔍 PRIORITY: Introspecting actual database file for real statistics...');
      console.log('🔍 First file to introspect:', sqliteDatabaseFiles[0]);
      try {
        const { DatabaseVerificationService } = await import('@/services/extraction/databaseVerificationService');
        const verificationService = new DatabaseVerificationService();
        
        const actualDbFile = sqliteDatabaseFiles[0];
        console.log(`📁 Using actual database file: ${actualDbFile.filePath}`);
        
        // Introspect the actual database FIRST to get real data
        actualDatabaseIntrospection = await verificationService.introspectDatabase(
          'sqlite',
          { filePath: actualDbFile.filePath }
        );
        
        console.log('✅ Actual database introspection completed:', {
          tables: actualDatabaseIntrospection.tables?.length || 0,
          indexes: actualDatabaseIntrospection.indexes?.length || 0,
          totalRows: actualDatabaseIntrospection.statistics?.totalRows || 0
        });
        
        // Extract actual tables from database
        actualDatabaseTables = actualDatabaseIntrospection.tables || [];
        // Calculate totalRows from actual table row counts
        actualTotalRows = actualDatabaseTables.reduce((sum: number, table: any) => sum + (table.rowCount || 0), 0);
        actualTotalColumns = actualDatabaseTables.reduce((sum, table) => sum + (table.columns?.length || 0), 0);
        
        console.log(`📊 Actual database statistics: ${actualDatabaseTables.length} tables, ${actualTotalRows} rows, ${actualTotalColumns} columns`);
    console.log(`📊 Extracted models count: ${allTables.length} tables`);
    console.log(`📊 Database files table counts: ${allDatabases.map(db => ({ name: db.name, count: db.tableCount || 0 }))}`);
        
      } catch (introspectionError) {
        console.error('❌ Actual database introspection failed:', introspectionError);
      }
    }
    
    // Now perform verification if we have both actual DB and extracted schemas
    if (sqliteDatabaseFiles.length > 0 && sourceCodeDatabases.length > 0) {
      console.log('🔍 Running comprehensive verification (comparing ORM models vs actual DB)...');
      try {
        const extractedSchema = sourceCodeDatabases.find(db => db.type === 'extracted');
        if (extractedSchema && extractedSchema.schema?.tables) {
          const { DatabaseVerificationService } = await import('@/services/extraction/databaseVerificationService');
          const verificationService = new DatabaseVerificationService();
          
          const actualDbFile = sqliteDatabaseFiles[0];
          console.log(`📋 Verifying ${extractedSchema.schema.tables.length} extracted ORM models against actual DB`);
          
          // Perform comprehensive verification against the actual database
          const comprehensiveVerification = await verificationService.verifyTables(
            extractedSchema.schema.tables,
            'sqlite',
            { filePath: actualDbFile.filePath }
          );
          
          console.log('✅ Comprehensive verification completed:', {
            verifiedTables: comprehensiveVerification.verifiedTables.length,
            phantomTables: comprehensiveVerification.phantomTables.length,
            accuracy: comprehensiveVerification.verificationStats.accuracy
          });
          
          // Use the already-introspected actual database data (from earlier)
          // Update the extracted schema with verification results
          extractedSchema.verification = comprehensiveVerification;
          extractedSchema.databaseIntrospection = actualDatabaseIntrospection;
          extractedSchema.schemaObjects = {
            tables: actualDatabaseIntrospection.tables || [],
            views: actualDatabaseIntrospection.views || [],
            indexes: actualDatabaseIntrospection.indexes || [],
            triggers: actualDatabaseIntrospection.triggers || [],
            sequences: actualDatabaseIntrospection.sequences || [],
            materializedViews: actualDatabaseIntrospection.materializedViews || []
          };
          extractedSchema.columns = {
            totalColumns: actualTotalColumns,
            columnTypes: [],
            columnMetadata: actualDatabaseIntrospection.tables?.flatMap((t: any) => t.columns || []) || []
          };
          extractedSchema.constraints = {
            primaryKeys: actualDatabaseIntrospection.constraints?.filter((c: any) => c.type === 'PRIMARY KEY') || [],
            foreignKeys: actualDatabaseIntrospection.constraints?.filter((c: any) => c.type === 'FOREIGN KEY') || [],
            unique: actualDatabaseIntrospection.constraints?.filter((c: any) => c.type === 'UNIQUE') || [],
            check: actualDatabaseIntrospection.constraints?.filter((c: any) => c.type === 'CHECK') || [],
            totalConstraints: actualDatabaseIntrospection.constraints?.length || 0
          };
          extractedSchema.statistics = {
            totalTables: actualDatabaseTables.length,
            totalRows: actualTotalRows,
            databaseSize: actualDatabaseIntrospection.statistics?.databaseSize || 0,
            tableStats: actualDatabaseIntrospection.statistics?.tableStatistics || []
          };
          extractedSchema.functions = {
            storedProcedures: actualDatabaseIntrospection.procedures || [],
            userDefinedFunctions: actualDatabaseIntrospection.functions || [],
            triggers: actualDatabaseIntrospection.triggers || []
          };
          extractedSchema.security = actualDatabaseIntrospection.security || null;
          extractedSchema.runtimeState = actualDatabaseIntrospection.runtimeState || null;
          extractedSchema.engineFeatures = {
            extensions: actualDatabaseIntrospection.extensions || [],
            partitioning: actualDatabaseIntrospection.partitioning || [],
            engineInfo: actualDatabaseIntrospection.engineInfo || {},
            pragmas: actualDatabaseIntrospection.pragmas || {},
            mongoOptions: actualDatabaseIntrospection.mongoOptions || null
          };
          
          console.log('✅ Extracted schema updated with comprehensive verification data');
        }
      } catch (verificationError) {
        console.error('❌ Comprehensive verification failed:', verificationError);
        console.error('Error details:', {
          message: verificationError instanceof Error ? verificationError.message : 'Unknown error',
          stack: verificationError instanceof Error ? verificationError.stack : 'No stack'
        });
      }
    }

    // Extract migration history and ORM models with enhanced logging
    console.log('🔍 Extracting migration history and ORM models...');
    console.log('🔍 Upload directory for migration scanning:', uploadDir);
    
    let migrationHistory = null;
    let ormModels: any[] = [];
    
    try {
      const { ComprehensiveDatabaseExtractor } = await import('@/services/comprehensiveDatabaseExtractor');
      
      console.log('🔄 Starting migration history extraction...');
      migrationHistory = await ComprehensiveDatabaseExtractor.extractMigrationHistory(uploadDir);
      console.log('✅ Migration history extraction completed');
      
      console.log('🔄 Starting ORM models extraction...');
      ormModels = await ComprehensiveDatabaseExtractor.extractORMModels(uploadDir);
      console.log('✅ ORM models extraction completed');
      
    } catch (extractionError) {
      console.error('❌ Error during migration/ORM extraction:', extractionError);
      console.error('❌ Error details:', {
        message: extractionError instanceof Error ? extractionError.message : 'Unknown error',
        stack: extractionError instanceof Error ? extractionError.stack : 'No stack'
      });
    }
    
    console.log(`📋 Found migration history: ${migrationHistory ? 'Yes' : 'No'}`);
    console.log(`📋 Found ORM models: ${ormModels?.length || 0}`);
    
    if (migrationHistory) {
      console.log(`   📄 ${migrationHistory.migrations.length} migrations (${migrationHistory.framework})`);
      console.log(`   📊 Migration details:`);
      migrationHistory.migrations.slice(0, 5).forEach((migration, index) => {
        console.log(`      ${index + 1}. ${migration.filename} (${migration.framework}) - ${migration.status}`);
      });
      if (migrationHistory.migrations.length > 5) {
        console.log(`      ... and ${migrationHistory.migrations.length - 5} more`);
      }
    }
    
    if (ormModels && ormModels.length > 0) {
      console.log(`   🏗️ ORM models: ${ormModels.map(m => `${m.name} (${m.framework})`).join(', ')}`);
    }

    // Combine both actual database files and extracted definitions
    const allDatabases = [...databaseFiles, ...sourceCodeDatabases];
    console.log('📊 Total databases found:', allDatabases.length);
    
      // Extract system catalog information from database files
      console.log('🔍 Starting system catalog extraction...');
      console.log('📊 allDatabases length:', allDatabases.length);
      console.log('📊 allDatabases structure:', JSON.stringify(allDatabases.map(db => ({ 
        name: db.name, 
        type: db.type, 
        status: db.status, 
        filePath: db.filePath,
        allKeys: Object.keys(db)
      })), null, 2));
    
    // Set default values
    let systemCatalogData = null;
    const testValue = 'SYSTEM_CATALOG_TEST_REACHED';
    const testSqliteFiles = allDatabases.filter(db => db.filePath && db.filePath.endsWith('.db'));
    let testCatalogResult = null;
    let testError = null;
    
    try {
      // Find SQLite database files for system catalog extraction
      console.log('🔍 Looking for SQLite files in allDatabases:', allDatabases.length);
      console.log('📊 Database types:', allDatabases.map(db => ({ type: db.type, filePath: db.filePath, name: db.name, status: db.status })));
      
      // Look for SQLite files in multiple ways
      let sqliteFiles = allDatabases.filter(db => db.type === 'sqlite' && db.filePath);
      console.log('🔍 First pass - files with type="sqlite":', sqliteFiles.length);
      
      // If no files found with type='sqlite', try looking for files with .db extension
      if (sqliteFiles.length === 0) {
        console.log('🔍 No files with type="sqlite", looking for .db files...');
        sqliteFiles = allDatabases.filter(db => {
          const hasDbExtension = db.filePath && (db.filePath.endsWith('.db') || db.filePath.endsWith('.sqlite') || db.filePath.endsWith('.sqlite3'));
          const hasReadyStatus = db.status === 'ready';
          console.log(`🔍 Checking file: ${db.filePath}, hasDbExtension: ${hasDbExtension}, status: ${db.status}`);
          return hasDbExtension && hasReadyStatus;
        });
        console.log('🔍 Second pass - files with .db extension:', sqliteFiles.length);
      }
      
      // If still no files found, try looking in the originalFiles array
      if (sqliteFiles.length === 0) {
        console.log('🔍 No files found in allDatabases, checking originalFiles...');
        const originalFiles = filePaths || [];
        const dbFiles = originalFiles.filter(file => file.endsWith('.db') || file.endsWith('.sqlite') || file.endsWith('.sqlite3'));
        console.log('📊 Found database files in originalFiles:', dbFiles);
        
        if (dbFiles.length > 0) {
          // Create a mock database object for the first file
          sqliteFiles = [{
            type: 'sqlite',
            filePath: dbFiles[0],
            name: 'uploaded_database',
            status: 'ready'
          }];
        }
      }
      
      console.log('📊 Found SQLite files:', sqliteFiles.length);
      console.log('📊 SQLite files details:', sqliteFiles.map(f => ({ name: f.name, filePath: f.filePath, type: f.type, status: f.status })));
      
      if (sqliteFiles.length > 0) {
        console.log(`📊 Found ${sqliteFiles.length} SQLite files for system catalog extraction`);
        
        // Use the first SQLite file for system catalog extraction
        const primaryDbFile = sqliteFiles[0];
        console.log(`🔍 Extracting system catalog from: ${primaryDbFile.filePath}`);
        console.log(`🔍 File exists check: ${require('fs').existsSync(primaryDbFile.filePath)}`);
        
        // Import and use the JavaScript system catalog extractor
        console.log('📦 Importing system catalog extractor...');
        try {
          const { extractSQLiteSystemCatalog } = require('../../../../services/extraction/systemCatalogExtractor.js');
          console.log('✅ System catalog extractor imported successfully');
          
          // Extract system catalog data
          console.log('🔍 Starting system catalog extraction...');
          console.log('🔍 Calling extractSQLiteSystemCatalog with:', primaryDbFile.filePath);
          
          try {
            systemCatalogData = await extractSQLiteSystemCatalog(primaryDbFile.filePath);
            console.log('✅ System catalog extraction completed successfully');
            console.log('📊 System catalog data tables count:', systemCatalogData?.tables?.length || 0);
            console.log('📊 System catalog data views count:', systemCatalogData?.views?.length || 0);
            console.log('📊 System catalog data indexes count:', systemCatalogData?.indexes?.length || 0);
            testCatalogResult = systemCatalogData;
          } catch (extractionError: any) {
            console.error('❌ System catalog extraction failed:', extractionError);
            console.error('❌ Extraction error details:', extractionError.message);
            console.error('❌ Extraction error stack:', extractionError.stack);
            systemCatalogData = null;
            testCatalogResult = null;
            testError = `Extraction Error: ${extractionError.message}`;
          }
        } catch (importError: any) {
          console.error('❌ Failed to import system catalog extractor:', importError);
          console.error('❌ Import error details:', importError.message);
          console.error('❌ Import error stack:', importError.stack);
          systemCatalogData = null;
          testCatalogResult = null;
          testError = `Import Error: ${importError.message}`;
        }
      } else {
        console.log('⚠️ No SQLite files found for system catalog extraction');
        console.log('📊 allDatabases structure:', JSON.stringify(allDatabases.map(db => ({ 
          name: db.name, 
          type: db.type, 
          status: db.status, 
          filePath: db.filePath,
          allKeys: Object.keys(db)
        })), null, 2));
      }
      
      console.log(`✅ System catalog extraction completed:`, {
        tables: systemCatalogData?.tables?.length || 0,
        views: systemCatalogData?.views?.length || 0,
        indexes: systemCatalogData?.indexes?.length || 0,
        triggers: systemCatalogData?.triggers?.length || 0
      });
    } catch (catalogError: any) {
      console.error('❌ System catalog extraction failed:', catalogError);
      console.error('❌ Error details:', catalogError.message);
      console.error('❌ Error stack:', catalogError.stack);
      testError = `Catalog Error: ${catalogError.message}`;
      // Continue without system catalog data
    }

    // Detect anomalies across the entire project
    console.log('🔍 Starting comprehensive anomaly detection...');
    const projectAnomalies = await detectProjectAnomalies(uploadDir, allDatabases, migrationHistory, ormModels);
    console.log(`🚨 Found anomalies: ${projectAnomalies.length}`);

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
    // Prioritize actual database files over extracted definitions to avoid duplicates and phantom tables
    const actualDatabaseFiles = allDatabases.filter(db => db.type === 'sqlite' && db.tables && db.tables.length > 0);
    const extractedDatabases = allDatabases.filter(db => db.type === 'extracted' && db.tables && db.tables.length > 0);
    
    console.log(`📊 Database sources: ${actualDatabaseFiles.length} actual files, ${extractedDatabases.length} extracted definitions`);
    
    let allTables: any[] = [];
    let allRelationships: any[] = [];

    if (actualDatabaseFiles.length > 0) {
      console.log('🎯 Using actual database files as primary source');
      allTables = actualDatabaseFiles.flatMap(db => db.tables || []);
      allRelationships = actualDatabaseFiles.flatMap(db => db.schema?.relationships || db.relationships || []);
      console.log(`📊 Found ${allTables.length} tables and ${allRelationships.length} relationships from actual database files`);
      
      // Also include extracted tables that might not be in the database yet
      if (extractedDatabases.length > 0) {
        console.log('🔄 Merging extracted definitions with actual database tables');
        const existingTableNames = new Set(allTables.map(t => t.name.toLowerCase()));
        const extractedTables = extractedDatabases.flatMap(db => db.tables || []);
        const extractedRelationships = extractedDatabases.flatMap(db => db.relationships || []);
        
        const newTables = extractedTables.filter(t => !existingTableNames.has(t.name.toLowerCase()));
        console.log(`📊 Adding ${newTables.length} additional tables from extracted definitions`);
        allTables.push(...newTables);
        allRelationships.push(...extractedRelationships);
      }
    } else if (extractedDatabases.length > 0) {
      // Fallback to extracted definitions if no actual database files
      console.log('⚠️ No actual database files found, using extracted definitions');
      allTables = extractedDatabases.flatMap(db => db.tables || []);
      allRelationships = extractedDatabases.flatMap(db => db.relationships || []);
      console.log(`📊 Found ${allTables.length} tables and ${allRelationships.length} relationships from extracted definitions`);
    } else {
      // Fallback to all databases if no clear categorization
      console.log('⚠️ No clear database categorization, using all databases');
      allTables = allDatabases.flatMap(db => db.tables || []);
      allRelationships = allDatabases.flatMap(db => db.relationships || []);
      console.log(`📊 Found ${allTables.length} tables and ${allRelationships.length} relationships from all databases`);
    }
    
    // UNIVERSAL TABLE FILTERING - Remove ALL phantom, metadata, and duplicate tables
    const tableMap = new Map<string, any>();
    const duplicateTables: string[] = [];
    const phantomTables: string[] = [];
    
    // CONSERVATIVE patterns - only filter obvious phantom tables
    const universalPhantomPatterns = [
      // System tables (all databases)
      /^sqlite_/,
      /^information_schema\./,
      /^pg_/,
      /^mysql\./,
      /^sys\./,
      
      // Framework metadata tables (only obvious ones)
      /^django_admin_log$/,
      /^django_content_type$/,
      /^django_migrations$/,
      /^django_session$/,
      /^laravel_migrations$/,
      /^rails_schema_migrations$/,
      
      // Migration tables (only obvious ones)
      /^schema_migrations$/,
      /^ar_internal_metadata$/,
      /^schema_info$/,
      /^schema_versions$/,
      
      // Session tables (only obvious ones)
      /^sessions$/,
      /^cache$/,
      
      // Admin logging (only obvious ones)
      /^admin_log$/,
      /^audit_log$/,
      
      // Content type (only obvious ones)
      /^content_types$/,
      
      // User management metadata (only obvious ones)
      /^user_groups$/,
      /^user_permissions$/,
      /^group_permissions$/,
      
      // ORM model classes (only obvious ones)
      /Model$/,
      /Entity$/,
      /Schema$/,
      /Repository$/,
      /Service$/,
      
      // Common phantom patterns (only obvious ones)
      /^User$/,
      /^Group$/,
      /^Permission$/,
      /^ContentType$/,
      /^Session$/,
      /^LogEntry$/,
      /^Migration$/,
      /^Schema$/,
      /^Model$/,
      /^Entity$/
    ];
    
    // Check if a table name matches universal phantom patterns
    const isPhantomTable = (tableName: string): boolean => {
      return universalPhantomPatterns.some(pattern => pattern.test(tableName));
    };
    
    // Check if a table is a metadata view (VERY CONSERVATIVE)
    const isMetadataView = (table: any): boolean => {
      if (!table.columns || table.columns.length === 0) return true;
      
      // Only filter if it has VERY specific metadata column patterns AND very few columns
      if (table.columns.length <= 2) {
        const strictMetadataColumns = ['app_label', 'model', 'content_type_id'];
        const hasOnlyStrictMetadataColumns = table.columns.every((col: any) => 
          strictMetadataColumns.includes(col.name?.toLowerCase())
        );
        if (hasOnlyStrictMetadataColumns) return true;
      }
      
      // Only filter if it has migration-specific columns AND very few columns
      const migrationColumns = ['migration', 'version', 'batch', 'schema_version'];
      const hasMigrationColumns = table.columns.some((col: any) => 
        migrationColumns.some(pattern => 
          col.name?.toLowerCase().includes(pattern)
        )
      );
      
      // Only filter if it has session-specific columns AND very few columns
      const sessionColumns = ['session_key', 'session_data', 'expire_date'];
      const hasSessionColumns = table.columns.some((col: any) => 
        sessionColumns.some(pattern => 
          col.name?.toLowerCase().includes(pattern)
        )
      );
      
      // Only filter if it has very few columns AND specific metadata patterns
      return (hasMigrationColumns || hasSessionColumns) && table.columns.length <= 3;
    };
    
    // Check if table has suspicious structure (VERY CONSERVATIVE)
    const hasSuspiciousStructure = (table: any): boolean => {
      if (!table.columns) return true;
      
      // Only filter if it has NO columns at all
      if (table.columns.length === 0) return true;
      
      // Only filter if it has exactly 1 column and it's not a primary key
      if (table.columns.length === 1) {
        const hasPrimaryKey = table.columns.some((col: any) => 
          col.primaryKey || col.name?.toLowerCase() === 'id'
        );
        return !hasPrimaryKey;
      }
      
      // Don't filter anything else - be very conservative
      return false;
    };
    
    console.log(`🎯 BEFORE FILTERING: ${allTables.length} tables`);
    console.log(`   Tables: ${allTables.map(t => t.name).join(', ')}`);
    
    // CONSERVATIVE filtering - only remove obvious phantom tables
    for (const table of allTables) {
      const tableName = table.name?.toLowerCase();
      if (!tableName) continue;
      
      // 1. Skip only obvious phantom tables by name pattern
      if (isPhantomTable(table.name)) {
        phantomTables.push(table.name);
        console.log(`👻 Skipping phantom table: ${table.name} (matches phantom pattern)`);
        continue;
      }
      
      // 2. Skip only tables with no columns
      if (!table.columns || table.columns.length === 0) {
        phantomTables.push(table.name);
        console.log(`👻 Skipping empty table: ${table.name} (no columns found)`);
        continue;
      }
      
      // 3. Skip only obvious metadata views (very strict criteria)
      if (isMetadataView(table)) {
        phantomTables.push(table.name);
        console.log(`👻 Skipping metadata view: ${table.name} (metadata structure)`);
        continue;
      }
      
      // 4. Skip only tables with very suspicious structure
      if (hasSuspiciousStructure(table)) {
        phantomTables.push(table.name);
        console.log(`👻 Skipping suspicious table: ${table.name} (suspicious structure)`);
        continue;
      }
      
      // 5. Skip only extracted tables that are clearly ORM classes
      if (table.type === 'extracted' && table.name && 
          (table.name.endsWith('Model') || table.name.endsWith('Entity') || 
           table.name.endsWith('Schema') || table.name.endsWith('Repository') ||
           table.name.endsWith('Service') || table.name.endsWith('Controller'))) {
        phantomTables.push(table.name);
        console.log(`👻 Skipping ORM class: ${table.name} (not a database table)`);
        continue;
      }
      
      // 6. Deduplicate by name (case-insensitive)
      if (tableMap.has(tableName)) {
        duplicateTables.push(table.name);
        console.log(`🔄 Found duplicate table: ${table.name} (keeping first occurrence)`);
        continue;
      }
      
      // 7. Table passed all filters - keep it (be conservative!)
      tableMap.set(tableName, table);
      console.log(`✅ Keeping table: ${table.name} (${table.columns.length} columns)`);
    }
    
    console.log(`🎯 AFTER FILTERING: ${tableMap.size} unique tables`);
    console.log(`   Tables: ${Array.from(tableMap.values()).map(t => t.name).join(', ')}`);
    console.log(`   Phantom tables removed: ${phantomTables.length}`);
    console.log(`   Duplicate tables removed: ${duplicateTables.length}`);
    
    allTables = Array.from(tableMap.values());
    
    if (duplicateTables.length > 0) {
      console.log(`🧹 Removed ${duplicateTables.length} duplicate tables: ${duplicateTables.join(', ')}`);
    }
    
    if (phantomTables.length > 0) {
      console.log(`👻 Filtered out ${phantomTables.length} phantom tables: ${phantomTables.join(', ')}`);
    }
    
    // Additional validation: Cross-reference with actual database schema if available
    // Use actualDatabaseTables from comprehensive introspection if available, otherwise fall back to actualDatabaseFiles
    const databaseTablesForValidation = actualDatabaseTables.length > 0 ? actualDatabaseTables : actualDatabaseFiles.flatMap(db => db.tables || []);
    
    if (databaseTablesForValidation.length > 0) {
      console.log(`🔍 Validating against ${databaseTablesForValidation.length} actual database tables`);
      const actualTableNames = new Set(
        databaseTablesForValidation
          .map(table => table.name?.toLowerCase())
          .filter(Boolean)
      );
      
      // FIXED: Only validate ORM/migration tables, trust SQL files
      console.log(`🔍 DEBUG: Checking table sources...`);
      allTables.forEach((table, index) => {
        console.log(`   Table ${index + 1}: ${table.name} - source: ${table.source || 'undefined'}, sourceFile: ${table.sourceFile || 'undefined'}`);
      });
      
      const sqlSourceTables = allTables.filter(table => table.source === 'sql_file');
      const ormSourceTables = allTables.filter(table => table.source !== 'sql_file');
      
      console.log(`📊 Source breakdown: ${sqlSourceTables.length} SQL file tables, ${ormSourceTables.length} ORM/migration tables`);
      
      // Only validate ORM/migration tables against actual database
      const validatedOrmTables = ormSourceTables.filter(table => {
        const tableName = table.name?.toLowerCase();
        if (!tableName) return false;
        
        if (actualTableNames.has(tableName)) {
          return true;
        }
        
        // Log ORM tables that don't exist in actual database
        console.log(`⚠️ ORM table ${table.name} not found in actual database schema`);
        return false;
      });
      
      // Keep all SQL file tables (they are the source of truth) + validated ORM tables
      allTables = [...sqlSourceTables, ...validatedOrmTables];
      
      if (validatedOrmTables.length !== ormSourceTables.length) {
        const removedCount = ormSourceTables.length - validatedOrmTables.length;
        console.log(`🔍 Removed ${removedCount} ORM tables that don't exist in actual database`);
        console.log(`✅ Kept all ${sqlSourceTables.length} SQL file tables (trusted as source of truth)`);
      }
    }
    
    console.log(`✅ Final table count: ${allTables.length} unique tables`);
    console.log(`📋 Table names: ${allTables.map(t => t.name).join(', ')}`);
    
    // Log table source information for debugging
    allTables.forEach(table => {
      const source = table.source === 'sql_file' ? 'SQL file' : 
                    table.source === 'orm_model' ? 'ORM model' : 
                    table.type === 'sqlite' ? 'actual database' : 'extracted';
      const sourceFile = table.sourceFile ? ` (${table.sourceFile})` : '';
      console.log(`📊 Table ${table.name}: ${source}${sourceFile} (${table.columns?.length || 0} columns)`);
    });
    
    // FIXED: Log the final counts that will be used for the project
    const finalTableCount = actualDatabaseTables.length > 0 ? actualDatabaseTables.length : (allDatabases.reduce((sum, db) => sum + (db.tableCount || 0), 0) || allTables.length);
    console.log(`🎯 FINAL PROJECT COUNTS:`);
    console.log(`   - Actual database tables: ${actualDatabaseTables.length}`);
    console.log(`   - Database files total: ${allDatabases.reduce((sum, db) => sum + (db.tableCount || 0), 0)}`);
    console.log(`   - Extracted models: ${allTables.length}`);
    console.log(`   - FINAL totalTables: ${finalTableCount}`);
    
    const allIndexes = allDatabases.flatMap(db => db.schema?.indexes || db.indexes || []);
    
    // Merge extraction metadata from all databases
    const allExtractionMetadata = allDatabases
      .filter(db => db.extractionMetadata)
      .map(db => db.extractionMetadata);
    
    // Combine frameworks, languages, and source files from all extraction metadata
    const combinedFrameworks = [...new Set(allExtractionMetadata.flatMap(meta => meta.frameworks || []))];
    const combinedLanguages = [...new Set(allExtractionMetadata.flatMap(meta => meta.languages || []))];
    const combinedSourceFiles = [...new Set(allExtractionMetadata.flatMap(meta => meta.sourceFiles || []))];
    const avgConfidence = allExtractionMetadata.length > 0 
      ? Math.round(allExtractionMetadata.reduce((sum, meta) => sum + (meta.confidence || 0), 0) / allExtractionMetadata.length)
      : 0;
    const totalExtractionTime = allExtractionMetadata.reduce((sum, meta) => sum + (meta.extractionTime || 0), 0);

    // If no extraction metadata, create basic metadata from project detection
    const basicMetadata = {
      frameworks: detectionResult.projectType ? [detectionResult.projectType] : ['sqlite'],
      languages: detectionResult.projectType === 'django' ? ['python'] : 
                detectionResult.projectType === 'laravel' ? ['php'] :
                detectionResult.projectType === 'rails' ? ['ruby'] :
                detectionResult.projectType === 'nodejs' ? ['javascript'] : ['sql'],
      sourceFiles: filePaths.length,
      confidence: 85, // Default confidence for basic detection
      extractionTime: 0,
      extractionCount: 0
    };

    // Create comprehensive schema with enhanced metadata
    const mergedSchema = {
      id: `schema_${Date.now()}`,
      name: `${projectName || 'Uploaded Project'} Schema`,
      tables: allTables,
      relationships: allRelationships,
      indexes: allIndexes,
      migrationHistory,
      ormModels,
      anomalies: projectAnomalies,
      databaseInfo: allDatabases[0]?.schema?.databaseInfo || {
        type: 'mixed',
        version: 'unknown',
        encoding: 'UTF-8'
      },
      views: allDatabases.flatMap(db => db.schema?.views || []),
      triggers: allDatabases.flatMap(db => db.schema?.triggers || []),
      functions: allDatabases.flatMap(db => db.schema?.functions || []),
      procedures: allDatabases.flatMap(db => db.schema?.procedures || []),
      // Add extraction metadata to schema (use combined or fall back to basic)
      metadata: allExtractionMetadata.length > 0 ? {
        frameworks: combinedFrameworks,
        languages: combinedLanguages,
        sourceFiles: combinedSourceFiles,
        confidence: avgConfidence,
        extractionTime: totalExtractionTime,
        extractionCount: allExtractionMetadata.length
      } : basicMetadata,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    };
    
    // Extract comprehensive data from the first database that has it
    console.log('🔍 Looking for comprehensive data in allDatabases...');
    console.log('📊 allDatabases structure:', allDatabases.map(db => ({
      name: db.name,
      type: db.type,
      hasVerification: !!db.verification,
      hasDatabaseIntrospection: !!db.databaseIntrospection,
      hasSchemaObjects: !!db.schemaObjects,
      hasColumns: !!db.columns,
      hasConstraints: !!db.constraints,
      hasStatistics: !!db.statistics,
      hasFunctions: !!db.functions,
      hasSecurity: !!db.security,
      hasRuntimeState: !!db.runtimeState,
      hasEngineFeatures: !!db.engineFeatures
    })));
    
    const comprehensiveData = allDatabases.find(db => 
      db.verification || db.databaseIntrospection || db.schemaObjects
    );
    
    console.log('🔍 Comprehensive data found:', !!comprehensiveData);
    if (comprehensiveData) {
      console.log('📊 Comprehensive data details:', {
        hasVerification: !!comprehensiveData.verification,
        hasDatabaseIntrospection: !!comprehensiveData.databaseIntrospection,
        hasSchemaObjects: !!comprehensiveData.schemaObjects,
        hasColumns: !!comprehensiveData.columns,
        hasConstraints: !!comprehensiveData.constraints,
        hasStatistics: !!comprehensiveData.statistics,
        hasFunctions: !!comprehensiveData.functions,
        hasSecurity: !!comprehensiveData.security,
        hasRuntimeState: !!comprehensiveData.runtimeState,
        hasEngineFeatures: !!comprehensiveData.engineFeatures
      });
    }

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
      // FIXED: Use actual database tables for schema designer, keep ORM extracted models separate
      tables: actualDatabaseTables.length > 0 ? actualDatabaseTables : allTables,
      extractedModels: allTables, // Keep extracted ORM models for comparison/verification
      actualDatabaseTables: actualDatabaseTables, // Explicit actual DB tables
      queries: [],
      uploadPath: uploadDir,
      originalFiles: filePaths,
    // Additional metadata - USE ACTUAL DATABASE STATISTICS
    // FIXED: Use actual schema tables count for accurate table count
    totalTables: mergedSchema?.tables?.length || 0,
    totalRows: actualTotalRows > 0 ? actualTotalRows : allDatabases.reduce((sum, db) => sum + (db.totalRows || 0), 0),
    totalColumns: actualTotalColumns > 0 ? actualTotalColumns : allTables.reduce((sum, t) => sum + (t.columns?.length || 0), 0),
      hasForeignKeys: allRelationships.length > 0,
      hasIndexes: allIndexes.length > 0,
      systemCatalog: systemCatalogData,
      // Comprehensive sections
      verification: comprehensiveData?.verification || null,
      databaseIntrospection: comprehensiveData?.databaseIntrospection || null,
      schemaObjects: comprehensiveData?.schemaObjects || null,
      columns: comprehensiveData?.columns || null,
      constraints: comprehensiveData?.constraints || null,
      statistics: comprehensiveData?.statistics || null,
      functions: comprehensiveData?.functions || null,
      security: comprehensiveData?.security || null,
      runtimeState: comprehensiveData?.runtimeState || null,
      engineFeatures: comprehensiveData?.engineFeatures || null,
      verificationStatus: comprehensiveData?.verificationStatus || null,
        testValue: testValue, // Add test value to response
        testSqliteFilesCount: testSqliteFiles.length, // Add test SQLite files count
        testSqliteFiles: testSqliteFiles.map(db => ({ name: db.name, filePath: db.filePath })), // Add test SQLite files
        testCatalogResult: testCatalogResult ? 'SUCCESS' : 'FAILED', // Add test catalog result
        testError: testError, // Add test error to response
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('📋 Project object created:', {
      id: project.id,
      name: project.name,
      technology: project.technology,
      databaseCount: project.databaseCount,
      databases: project.databases.length,
      schemaMetadata: mergedSchema.metadata
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
      relationships: schemaTables.flatMap((table: any) => table.relationships || []),
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

  // Check for Django (must come before general Python check)
  if (fileNames.has('manage.py') || fileNames.has('settings.py') || directories.has('django') || 
      filePaths.some(f => f.includes('django') || f.includes('manage.py') || f.includes('settings.py'))) {
    console.log('🎸 Detected Django project');
    return { projectName: 'Django Project', projectType: 'django' };
  }

  // Check for Flask
  if (fileNames.has('app.py') || fileNames.has('flask_app.py') || 
      filePaths.some(f => f.includes('flask') && f.endsWith('.py'))) {
    console.log('🧪 Detected Flask project');
    return { projectName: 'Flask Project', projectType: 'flask' };
  }

  // Check for FastAPI
  if (fileNames.has('main.py') && filePaths.some(f => f.includes('fastapi') || f.includes('uvicorn'))) {
    console.log('⚡ Detected FastAPI project');
    return { projectName: 'FastAPI Project', projectType: 'fastapi' };
  }

  // Check for Python projects (general Python - must come after specific frameworks)
  if (fileNames.has('requirements.txt') || fileNames.has('setup.py') || fileNames.has('pyproject.toml')) {
    console.log('🐍 Detected Python project');
    return { projectName: 'Python Project', projectType: 'python' };
  }

  // Check for Laravel (must come before general PHP check)
  if (fileNames.has('artisan') || fileNames.has('composer.json') || 
      filePaths.some(f => f.includes('laravel') || f.includes('artisan'))) {
    console.log('🎼 Detected Laravel project');
    return { projectName: 'Laravel Project', projectType: 'laravel' };
  }

  // Check for Ruby/Rails (must come before general Ruby check)
  if (fileNames.has('gemfile') || fileNames.has('rails') || fileNames.has('config.ru') ||
      filePaths.some(f => f.includes('rails') || f.includes('gemfile'))) {
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

  // Check for Next.js (must come before React check)
  if (fileNames.has('next.config.js') || directories.has('pages') || directories.has('app') ||
      filePaths.some(f => f.includes('next.config') || f.includes('_app.js') || f.includes('_document.js'))) {
    console.log('▲ Detected Next.js project');
    return { projectName: 'Next.js Project', projectType: 'nextjs' };
  }

  // Check for React (must come after Next.js check)
  if (fileNames.has('src/app.js') || fileNames.has('src/index.js') ||
      (fileNames.has('package.json') && directories.has('src')) ||
      filePaths.some(f => f.includes('react') && f.endsWith('.js'))) {
    console.log('⚛️ Detected React project');
    return { projectName: 'React Project', projectType: 'react' };
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
    // Exclude test files, spec files, and non-model directories
    const sourceCodeFiles = allFiles.filter(file => {
      const ext = path.extname(file).toLowerCase();
      const normalizedPath = file.replace(/\\/g, '/').toLowerCase();
      
      // Only include supported file types
      if (!['.js', '.jsx', '.ts', '.tsx', '.py', '.php', '.java', '.prisma', '.sql'].includes(ext)) {
        return false;
      }
      
      // Exclude test files and directories
      const excludePatterns = [
        '/test/',
        '/tests/',
        '/__tests__/',
        '/spec/',
        '/__mocks__/',
        '.test.',
        '.spec.',
        '_test.',
        '_spec.',
        '/test-',
        '/testing/'
      ];
      
      if (excludePatterns.some(pattern => normalizedPath.includes(pattern))) {
        return false;
      }
      
      // For JS/TS files, prefer files in model directories
      if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
        const modelPatterns = [
          '/models/',
          '/model/',
          '/entities/',
          '/entity/',
          '/schemas/',
          '/schema/',
          '/database/',
          '/db/'
        ];
        
        // If file is in a model directory, include it
        if (modelPatterns.some(pattern => normalizedPath.includes(pattern))) {
          return true;
        }
        
        // Also check if it's a main index file that might aggregate models
        if (normalizedPath.endsWith('/index.js') || normalizedPath.endsWith('/index.ts')) {
          return true;
        }
        
        // Exclude other JS/TS files that aren't in model directories
        return false;
      }
      
      // Include all other file types (Prisma, SQL, etc.)
      return true;
    });
    
    console.log(`📄 Found ${sourceCodeFiles.length} source code files to analyze`);

    // Log SQL files specifically
    const sqlSourceFiles = sourceCodeFiles.filter(f => f.toLowerCase().endsWith('.sql'));
    console.log(`📄 SQL FILES AFTER FILTERING: ${sqlSourceFiles.length}`);
    sqlSourceFiles.forEach((file, index) => {
      console.log(`   ${index + 1}. ${path.basename(file)} - Full path: ${file}`);
    });

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
      confidence: extractionResult.metadata?.confidence,
      hasVerification: !!extractionResult.verification,
      verifiedTables: extractionResult.verification?.verifiedTables?.length || 0,
      hasDatabaseIntrospection: !!extractionResult.databaseIntrospection
    });
    
    // Log verification results if available
    if (extractionResult.verification) {
      console.log('✅ Verification data available:', {
        verifiedTables: extractionResult.verification.verifiedTables.length,
        phantomTables: extractionResult.verification.phantomTables.length,
        duplicateTables: extractionResult.verification.duplicateTables.length,
        accuracy: extractionResult.verification.verificationStats.accuracy
      });
    }
    
    // Log database introspection if available
    if (extractionResult.databaseIntrospection) {
      console.log('🔍 Database introspection available:', {
        actualTables: extractionResult.databaseIntrospection.actualTables.length,
        views: extractionResult.databaseIntrospection.views?.length || 0,
        indexes: extractionResult.databaseIntrospection.indexes?.length || 0,
        triggers: extractionResult.databaseIntrospection.triggers?.length || 0
      });
    }
    
    // If we have an actual SQLite database file, perform comprehensive verification against it
    console.log('🔍 Checking if we can run comprehensive verification...');
    console.log(`   - SQLite database files found: ${sqliteDatabaseFiles.length}`);
    console.log(`   - Extracted tables count: ${extractionResult.schema.tables.length}`);
    
    if (sqliteDatabaseFiles.length > 0 && extractionResult.schema.tables.length > 0) {
      console.log('✅ Running comprehensive verification against actual database file...');
      try {
        const { DatabaseVerificationService } = await import('@/services/extraction/databaseVerificationService');
        const verificationService = new DatabaseVerificationService();
        
        const actualDbFile = sqliteDatabaseFiles[0];
        console.log(`📁 Using database file: ${actualDbFile.filePath}`);
        
        // Perform comprehensive verification against the actual database
        const comprehensiveVerification = await verificationService.verifyTables(
          extractionResult.schema.tables,
          'sqlite',
          { filePath: actualDbFile.filePath }
        );
        
        // Perform comprehensive database introspection on the actual database
        const comprehensiveIntrospection = await verificationService.introspectDatabase(
          'sqlite',
          { filePath: actualDbFile.filePath }
        );
        
        console.log('✅ Comprehensive verification completed:', {
          verifiedTables: comprehensiveVerification.verifiedTables.length,
          phantomTables: comprehensiveVerification.phantomTables.length,
          accuracy: comprehensiveVerification.verificationStats.accuracy,
          introspectedTables: comprehensiveIntrospection.tables?.length || 0,
          introspectedIndexes: comprehensiveIntrospection.indexes?.length || 0
        });
        
        // Override the extraction result with comprehensive verification data
        extractionResult.verification = comprehensiveVerification;
        extractionResult.databaseIntrospection = comprehensiveIntrospection;
        extractionResult.schemaObjects = {
          tables: comprehensiveIntrospection.tables || [],
          views: comprehensiveIntrospection.views || [],
          indexes: comprehensiveIntrospection.indexes || [],
          triggers: comprehensiveIntrospection.triggers || [],
          sequences: comprehensiveIntrospection.sequences || [],
          materializedViews: comprehensiveIntrospection.materializedViews || []
        };
        extractionResult.columns = {
          totalColumns: comprehensiveIntrospection.tables?.reduce((sum: number, t: any) => sum + (t.columns?.length || 0), 0) || 0,
          columnTypes: [],
          columnMetadata: comprehensiveIntrospection.tables?.flatMap((t: any) => t.columns || []) || []
        };
        extractionResult.constraints = {
          primaryKeys: comprehensiveIntrospection.constraints?.filter((c: any) => c.type === 'PRIMARY KEY') || [],
          foreignKeys: comprehensiveIntrospection.constraints?.filter((c: any) => c.type === 'FOREIGN KEY') || [],
          unique: comprehensiveIntrospection.constraints?.filter((c: any) => c.type === 'UNIQUE') || [],
          check: comprehensiveIntrospection.constraints?.filter((c: any) => c.type === 'CHECK') || [],
          totalConstraints: comprehensiveIntrospection.constraints?.length || 0
        };
        extractionResult.statistics = {
          totalTables: comprehensiveIntrospection.statistics?.tableCount || 0,
          totalRows: comprehensiveIntrospection.statistics?.totalRows || 0,
          databaseSize: comprehensiveIntrospection.statistics?.databaseSize || 0,
          tableStats: comprehensiveIntrospection.statistics?.tableStatistics || []
        };
        extractionResult.functions = {
          storedProcedures: comprehensiveIntrospection.procedures || [],
          userDefinedFunctions: comprehensiveIntrospection.functions || [],
          triggers: comprehensiveIntrospection.triggers || []
        };
        extractionResult.security = comprehensiveIntrospection.security || null;
        extractionResult.runtimeState = comprehensiveIntrospection.runtimeState || null;
        extractionResult.engineFeatures = {
          extensions: comprehensiveIntrospection.extensions || [],
          partitioning: comprehensiveIntrospection.partitioning || [],
          engineInfo: comprehensiveIntrospection.engineInfo || {},
          pragmas: comprehensiveIntrospection.pragmas || {},
          mongoOptions: comprehensiveIntrospection.mongoOptions || null
        };
        
        console.log('✅ Extraction result updated with comprehensive verification data');
      } catch (verificationError) {
        console.error('❌ Comprehensive verification failed:', verificationError);
        console.error('Error details:', {
          message: verificationError instanceof Error ? verificationError.message : 'Unknown error',
          stack: verificationError instanceof Error ? verificationError.stack : 'No stack'
        });
      }
    }
    
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
        // Include verification data
        verification: extractionResult.verification,
        databaseIntrospection: extractionResult.databaseIntrospection,
        schemaObjects: extractionResult.schemaObjects,
        columns: extractionResult.columns,
        constraints: extractionResult.constraints,
        statistics: extractionResult.statistics,
        functions: extractionResult.functions,
        security: extractionResult.security,
        runtimeState: extractionResult.runtimeState,
        engineFeatures: extractionResult.engineFeatures,
        verificationStatus: extractionResult.verificationStatus,
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

/**
 * Comprehensive anomaly detection across the entire project
 */
async function detectProjectAnomalies(
  projectPath: string, 
  databases: any[], 
  migrationHistory: any, 
  ormModels: any[]
): Promise<any[]> {
  console.log('🔍 Starting comprehensive project anomaly detection...');
  const anomalies: any[] = [];
  
  try {
    // Import anomaly detection services
    const { ProjectAnomalyDetector } = await import('./projectAnomalyDetector');
    
    // Detect schema-level anomalies
    const schemaAnomalies = await ProjectAnomalyDetector.detectSchemaAnomalies(databases);
    anomalies.push(...schemaAnomalies);
    
    // Detect migration anomalies
    if (migrationHistory) {
      const migrationAnomalies = await ProjectAnomalyDetector.detectMigrationAnomalies(migrationHistory);
      anomalies.push(...migrationAnomalies);
    }
    
    // Detect ORM anomalies
    if (ormModels?.length > 0) {
      const ormAnomalies = await ProjectAnomalyDetector.detectORMAnomalies(ormModels);
      anomalies.push(...ormAnomalies);
    }
    
    // Detect file-based anomalies across ALL directories
    const fileAnomalies = await ProjectAnomalyDetector.detectFileAnomalies(projectPath);
    anomalies.push(...fileAnomalies);
    
    // Detect architecture anomalies
    const architectureAnomalies = await ProjectAnomalyDetector.detectArchitectureAnomalies(projectPath, databases, ormModels);
    anomalies.push(...architectureAnomalies);
    
    console.log(`✅ Anomaly detection completed. Found ${anomalies.length} anomalies`);
    console.log(`📊 Anomaly breakdown:`, {
      schemaAnomalies: schemaAnomalies.length,
      migrationAnomalies: migrationHistory ? (await ProjectAnomalyDetector.detectMigrationAnomalies(migrationHistory)).length : 0,
      ormAnomalies: ormModels?.length > 0 ? (await ProjectAnomalyDetector.detectORMAnomalies(ormModels)).length : 0,
      fileAnomalies: fileAnomalies.length,
      architectureAnomalies: architectureAnomalies.length
    });
    
  } catch (error) {
    console.error('❌ Error during anomaly detection:', error);
    
    // Fallback to basic anomaly detection
    const basicAnomalies = await detectBasicAnomalies(databases, migrationHistory, ormModels);
    anomalies.push(...basicAnomalies);
  }
  
  return anomalies;
}

/**
 * Fallback basic anomaly detection
 */
async function detectBasicAnomalies(
  databases: any[], 
  migrationHistory: any, 
  ormModels: any[]
): Promise<any[]> {
  const anomalies: any[] = [];
  
  // Check for missing primary keys
  databases.forEach(db => {
    db.tables?.forEach((table: any) => {
      const hasPrimaryKey = table.columns?.some((col: any) => col.isPrimaryKey || (Array.isArray(col.constraints) && col.constraints.includes('PRIMARY KEY')));
      if (!hasPrimaryKey) {
        anomalies.push({
          id: `anomaly_missing_pk_${table.name}_${Date.now()}`,
          type: 'schema',
          severity: 'warning',
          title: 'Missing Primary Key',
          description: `Table "${table.name}" does not have a primary key defined`,
          affectedTable: table.name,
          recommendation: 'Add a primary key constraint to ensure data integrity',
          detectedAt: new Date()
        });
      }
    });
  });
  
  // Check for ORM-database mismatches
  if (ormModels?.length > 0 && databases.length > 0) {
    const dbTableNames = new Set(databases.flatMap(db => db.tables?.map((t: any) => t.name) || []));
    const ormTableNames = new Set(ormModels.map(model => model.tableName).filter(Boolean));
    
    ormTableNames.forEach(ormTable => {
      if (!dbTableNames.has(ormTable)) {
        anomalies.push({
          id: `anomaly_orm_mismatch_${ormTable}_${Date.now()}`,
          type: 'consistency',
          severity: 'warning',
          title: 'ORM-Database Mismatch',
          description: `ORM model references table "${ormTable}" but table not found in database schema`,
          affectedTable: ormTable,
          recommendation: 'Ensure ORM models match database schema or run migrations',
          detectedAt: new Date()
        });
      }
    });
  }
  
  return anomalies;
}
