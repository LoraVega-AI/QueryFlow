// Comprehensive database extraction function that handles multiple database types
const fs = require('fs').promises;
const path = require('path');
const { DatabaseIntrospectionService } = require('../../../../services/extraction/databaseIntrospectionService');

async function extractDatabaseDefinitionsFromSourceCode(allFiles, uploadDir) {
  try {
    console.log('🔍 ===== SIMPLE EXTRACTION START =====');
    console.log('🔍 Upload directory:', uploadDir);
    console.log('🔍 All files count:', allFiles.length);
    
    // Log ALL SQL files received
    const sqlFilesReceived = allFiles.filter(f => {
      const ext = path.extname(f).toLowerCase();
      return ext === '.sql' || ext === '.ddl';
    });
    console.log(`🔍 SQL FILES RECEIVED: ${sqlFilesReceived.length}`);
    sqlFilesReceived.forEach((file, index) => {
      console.log(`   ${index + 1}. ${path.basename(file)}`);
    });
    
    const introspectionService = new DatabaseIntrospectionService();
    const extractedTables = [];
    let totalRows = 0;
    let hasForeignKeys = false;
    let hasIndexes = false;
    
    // 1. Extract from SQLite files using real introspection
    const sqliteFiles = allFiles.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.sqlite', '.db', '.sqlite3', '.db3'].includes(ext);
    });
    
    console.log(`📄 Found ${sqliteFiles.length} SQLite files`);
    for (const filePath of sqliteFiles) {
      try {
        const dbResult = await introspectionService.introspectSQLiteDatabase(filePath);
        if (dbResult && dbResult.tables) {
          extractedTables.push(...dbResult.tables);
          totalRows += dbResult.metadata?.totalRows || 0;
          hasForeignKeys = hasForeignKeys || dbResult.metadata?.hasForeignKeys || false;
          hasIndexes = hasIndexes || dbResult.metadata?.hasIndexes || false;
          console.log(`✅ Introspected SQLite ${path.basename(filePath)}: ${dbResult.tables.length} tables, ${dbResult.metadata?.totalRows || 0} total rows`);
        }
      } catch (error) {
        console.log(`⚠️ Failed to introspect SQLite ${path.basename(filePath)}:`, error.message);
      }
    }
    
    // 2. Extract from SQL files using enhanced parsing
    const sqlFiles = allFiles.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.sql', '.ddl'].includes(ext);
    });
    
    console.log(`📄 Found ${sqlFiles.length} SQL files: ${sqlFiles.map(f => path.basename(f)).join(', ')}`);
    const sqlResults = [];
    const allSqlRelationships = [];  // NEW
    const allSqlIndexes = [];  // NEW

    for (const filePath of sqlFiles) {
      try {
        console.log(`🔍 Processing SQL file: ${path.basename(filePath)}`);
        const dbResult = await introspectionService.parseSQLDump(filePath);
        if (dbResult && dbResult.tables) {
          sqlResults.push({
            file: path.basename(filePath),
            tableCount: dbResult.tables.length,
            tables: dbResult.tables,
            relationships: dbResult.relationships || [],  // NEW
            indexes: dbResult.indexes || []  // NEW
          });
          
          // Tag tables with source information
          const taggedTables = dbResult.tables.map(table => ({
            ...table,
            source: 'sql_file',
            sourceFile: path.basename(filePath),
            sourceType: 'schema_definition'
          }));
          console.log(`🔍 DEBUG: Tagged ${taggedTables.length} tables from ${path.basename(filePath)} with source: sql_file`);
          console.log(`   Sample table: ${taggedTables[0]?.name} - source: ${taggedTables[0]?.source}, sourceFile: ${taggedTables[0]?.sourceFile}`);
          extractedTables.push(...taggedTables);
          
          // Collect relationships and indexes  // NEW
          if (dbResult.relationships) {
            allSqlRelationships.push(...dbResult.relationships);
            console.log(`   Relationships: ${dbResult.relationships.length}`);
          }
          if (dbResult.indexes) {
            allSqlIndexes.push(...dbResult.indexes);
            console.log(`   Indexes: ${dbResult.indexes.length}`);
          }
          
          console.log(`✅ Parsed SQL ${path.basename(filePath)}: ${dbResult.tables.length} tables (${dbResult.databaseType})`);
          console.log(`   Tables: ${dbResult.tables.map(t => t.name).join(', ')}`);
        } else {
          console.log(`⚠️ No tables extracted from ${path.basename(filePath)}`);
        }
      } catch (error) {
        console.log(`⚠️ Failed to parse SQL ${path.basename(filePath)}:`, error.message);
        console.error(error);
      }
    }

    console.log(`📊 SQL Processing Summary: ${sqlResults.length} files processed, ${extractedTables.length} total tables`);
    console.log(`📊 Total relationships: ${allSqlRelationships.length}, Total indexes: ${allSqlIndexes.length}`);

    // Enhanced per-file logging
    console.log('📊 DETAILED SQL FILE BREAKDOWN:');
    sqlResults.forEach((r, index) => {
      console.log(`   ${index + 1}. ${r.file}:`);
      console.log(`      - Tables: ${r.tableCount}`);
      console.log(`      - Relationships: ${r.relationships?.length || 0}`);
      console.log(`      - Indexes: ${r.indexes?.length || 0}`);
      console.log(`      - Table names: ${r.tables.map(t => t.name).join(', ')}`);
    });
    
    // 3. Extract from JavaScript/TypeScript files using enhanced parsing
    const jsFiles = allFiles.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.js', '.ts', '.jsx', '.tsx'].includes(ext);
    });
    
    console.log(`📄 Found ${jsFiles.length} JS/TS files`);
    for (const filePath of jsFiles) {
      try {
        // Try enhanced introspection service first
        const dbResult = await introspectionService.extractDatabaseContent(filePath);
        if (dbResult && dbResult.tables) {
          // Tag tables with source information
          const taggedTables = dbResult.tables.map(table => ({
            ...table,
            source: 'orm_model',
            sourceFile: path.basename(filePath),
            sourceType: 'orm_definition'
          }));
          extractedTables.push(...taggedTables);
          console.log(`✅ Enhanced extraction from ${path.basename(filePath)}: ${dbResult.tables.length} tables (${dbResult.databaseType})`);
        } else {
          // Fallback to old method
          const tables = await extractFromJSFile(filePath);
          const taggedTables = tables.map(table => ({
            ...table,
            source: 'orm_model',
            sourceFile: path.basename(filePath),
            sourceType: 'orm_definition'
          }));
          extractedTables.push(...taggedTables);
          if (tables.length > 0) {
            console.log(`✅ Fallback extraction from JS/TS: ${tables.length} tables from ${path.basename(filePath)}`);
          }
        }
      } catch (error) {
        console.log(`⚠️ Failed to extract from JS/TS ${path.basename(filePath)}:`, error.message);
      }
    }
    
    // 4. Extract from Prisma schema files
    const prismaFiles = allFiles.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.prisma'].includes(ext);
    });
    
    console.log(`📄 Found ${prismaFiles.length} Prisma files`);
    for (const filePath of prismaFiles) {
      try {
        const dbResult = await introspectionService.parsePrismaSchema(filePath);
        if (dbResult && dbResult.tables) {
          // Tag tables with source information
          const taggedTables = dbResult.tables.map(table => ({
            ...table,
            source: 'orm_model',
            sourceFile: path.basename(filePath),
            sourceType: 'prisma_schema'
          }));
          extractedTables.push(...taggedTables);
          console.log(`✅ Parsed Prisma ${path.basename(filePath)}: ${dbResult.tables.length} models`);
        }
      } catch (error) {
        console.log(`⚠️ Failed to parse Prisma ${path.basename(filePath)}:`, error.message);
      }
    }

    // 5. Extract from Python files using enhanced parsing
    const pyFiles = allFiles.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.py'].includes(ext);
    });
    
    console.log(`📄 Found ${pyFiles.length} Python files`);
    for (const filePath of pyFiles) {
      try {
        // Try enhanced introspection service first
        const dbResult = await introspectionService.extractDatabaseContent(filePath);
        if (dbResult && dbResult.tables) {
          // Tag tables with source information
          const taggedTables = dbResult.tables.map(table => ({
            ...table,
            source: 'orm_model',
            sourceFile: path.basename(filePath),
            sourceType: 'python_orm'
          }));
          extractedTables.push(...taggedTables);
          console.log(`✅ Enhanced extraction from ${path.basename(filePath)}: ${dbResult.tables.length} tables (${dbResult.databaseType})`);
        } else {
          // Fallback to old method
          const tables = await extractFromPythonFile(filePath);
          const taggedTables = tables.map(table => ({
            ...table,
            source: 'orm_model',
            sourceFile: path.basename(filePath),
            sourceType: 'python_orm'
          }));
          extractedTables.push(...taggedTables);
          if (tables.length > 0) {
            console.log(`✅ Fallback extraction from Python: ${tables.length} tables from ${path.basename(filePath)}`);
          }
        }
      } catch (error) {
        console.log(`⚠️ Failed to extract from Python ${path.basename(filePath)}:`, error.message);
      }
    }

    // 6. Extract from PHP files (Laravel Eloquent)
    const phpFiles = allFiles.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.php'].includes(ext);
    });
    
    console.log(`📄 Found ${phpFiles.length} PHP files`);
    for (const filePath of phpFiles) {
      try {
        const dbResult = await introspectionService.extractDatabaseContent(filePath);
        if (dbResult && dbResult.tables) {
          // Tag tables with source information
          const taggedTables = dbResult.tables.map(table => ({
            ...table,
            source: 'orm_model',
            sourceFile: path.basename(filePath),
            sourceType: 'php_eloquent'
          }));
          extractedTables.push(...taggedTables);
          console.log(`✅ Extracted from PHP ${path.basename(filePath)}: ${dbResult.tables.length} tables (${dbResult.databaseType})`);
        }
      } catch (error) {
        console.log(`⚠️ Failed to extract from PHP ${path.basename(filePath)}:`, error.message);
      }
    }

    // 7. Extract from Java files (Hibernate/JPA)
    const javaFiles = allFiles.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.java'].includes(ext);
    });
    
    console.log(`📄 Found ${javaFiles.length} Java files`);
    for (const filePath of javaFiles) {
      try {
        const dbResult = await introspectionService.extractDatabaseContent(filePath);
        if (dbResult && dbResult.tables) {
          // Tag tables with source information
          const taggedTables = dbResult.tables.map(table => ({
            ...table,
            source: 'orm_model',
            sourceFile: path.basename(filePath),
            sourceType: 'java_hibernate'
          }));
          extractedTables.push(...taggedTables);
          console.log(`✅ Extracted from Java ${path.basename(filePath)}: ${dbResult.tables.length} tables (${dbResult.databaseType})`);
        }
      } catch (error) {
        console.log(`⚠️ Failed to extract from Java ${path.basename(filePath)}:`, error.message);
      }
    }

    // 8. Extract from C# files (Entity Framework)
    const csFiles = allFiles.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.cs'].includes(ext);
    });
    
    console.log(`📄 Found ${csFiles.length} C# files`);
    for (const filePath of csFiles) {
      try {
        const dbResult = await introspectionService.extractDatabaseContent(filePath);
        if (dbResult && dbResult.tables) {
          // Tag tables with source information
          const taggedTables = dbResult.tables.map(table => ({
            ...table,
            source: 'orm_model',
            sourceFile: path.basename(filePath),
            sourceType: 'csharp_entity_framework'
          }));
          extractedTables.push(...taggedTables);
          console.log(`✅ Extracted from C# ${path.basename(filePath)}: ${dbResult.tables.length} tables (${dbResult.databaseType})`);
        }
      } catch (error) {
        console.log(`⚠️ Failed to extract from C# ${path.basename(filePath)}:`, error.message);
      }
    }
    
    if (extractedTables.length === 0) {
      console.log('⚠️ No database definitions found in any files');
      return [];
    }
    
    console.log(`🎉 Total extracted tables: ${extractedTables.length}`);
    console.log('📊 Tables:', extractedTables.map(t => t.name));
    console.log('📊 Total rows across all tables:', totalRows);
    console.log('📊 Has foreign keys:', hasForeignKeys);
    console.log('📊 Has indexes:', hasIndexes);
    console.log('📊 SQL Relationships collected:', allSqlRelationships.length);
    console.log('📊 SQL Indexes collected:', allSqlIndexes.length);
    console.log('📊 SQL Files processed:', sqlResults.map(r => `${r.file} (${r.tableCount} tables, ${r.relationships?.length || 0} relationships, ${r.indexes?.length || 0} indexes)`));
    
    // Return the extracted database with enhanced metadata
    return [{
      id: `extracted_schema_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: 'Extracted Schema',
      type: 'extracted',
      connectionString: 'extracted',
      filePath: 'extracted',
      relativePath: 'extracted',
      isConnected: false,
      lastSync: null,
      tables: extractedTables,
      relationships: allSqlRelationships,  // CHANGED: Use collected relationships
      indexes: allSqlIndexes,  // CHANGED: Use collected indexes
      schema: {
        id: `extracted_schema_${Date.now()}`,
        name: 'Extracted Schema',
        tables: extractedTables,
        relationships: allSqlRelationships,  // CHANGED
        indexes: allSqlIndexes  // CHANGED
      },
      status: 'ready',
      processingStartTime: new Date().toISOString(),
      processingTime: 0,
      conversionLogs: [
        `[${new Date().toISOString()}] Extracted ${extractedTables.length} tables from multiple sources`,
        `[${new Date().toISOString()}] SQL files processed: ${sqlResults.length}`,
        `[${new Date().toISOString()}] Total relationships: ${allSqlRelationships.length}`,
        `[${new Date().toISOString()}] Total indexes: ${allSqlIndexes.length}`,
        `[${new Date().toISOString()}] Total rows: ${totalRows}`,
        `[${new Date().toISOString()}] Foreign keys: ${hasForeignKeys ? 'Yes' : 'No'}`,
        `[${new Date().toISOString()}] Indexes: ${hasIndexes ? 'Yes' : 'No'}`
      ],
      metadata: {
        totalTables: extractedTables.length,
        totalColumns: extractedTables.reduce((sum, table) => sum + (table.columns?.length || 0), 0),
        totalRows: totalRows,
        totalRelationships: allSqlRelationships.length,  // NEW
        totalIndexes: allSqlIndexes.length,  // NEW
        hasForeignKeys: hasForeignKeys || allSqlRelationships.length > 0,  // ENHANCED
        hasIndexes: hasIndexes || allSqlIndexes.length > 0  // ENHANCED
      },
      sqlFiles: sqlResults  // NEW: Track which SQL files were processed
    }];
    
  } catch (error) {
    console.error('❌ Extraction failed:', error);
    return [];
  }
}

// Extract tables from JavaScript/TypeScript files (Sequelize, Mongoose, etc.)
async function extractFromJSFile(filePath) {
  const tables = [];
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    
    // 1. Sequelize models
    const sequelizeMatch = content.match(/sequelize\.define\(['"]([^'"]+)['"]\s*,\s*{([\s\S]+?)\s*}\s*\)/);
    if (sequelizeMatch) {
      const modelName = sequelizeMatch[1];
      const fieldsStr = sequelizeMatch[2];
      
      const fields = [];
      const fieldMatches = fieldsStr.matchAll(/(\w+):\s*{\s*([\s\S]*?)\s*}/g);
      
      for (const fieldMatch of fieldMatches) {
        const fieldName = fieldMatch[1];
        const fieldDef = fieldMatch[2];
        
        const typeMatch = fieldDef.match(/type:\s*DataTypes\.(\w+)/);
        const allowNullMatch = fieldDef.match(/allowNull:\s*(true|false)/);
        const primaryKeyMatch = fieldDef.match(/primaryKey:\s*(true|false)/);
        const uniqueMatch = fieldDef.match(/unique:\s*(true|false)/);
        const autoIncrementMatch = fieldDef.match(/autoIncrement:\s*(true|false)/);
        
        const field = {
          id: fieldName,
          name: fieldName,
          type: typeMatch ? typeMatch[1] : 'STRING',
          nullable: allowNullMatch ? allowNullMatch[1] === 'true' : true,
          primaryKey: primaryKeyMatch ? primaryKeyMatch[1] === 'true' : false,
          unique: uniqueMatch ? uniqueMatch[1] === 'true' : false,
          autoIncrement: autoIncrementMatch ? autoIncrementMatch[1] === 'true' : false,
          defaultValue: null
        };
        
        fields.push(field);
      }
      
      if (fields.length > 0) {
        tables.push({
          id: modelName.toLowerCase(),
          name: modelName,
          columns: fields
        });
      }
    }
    
    // 2. Mongoose schemas - look for mongoose.model() calls
    const mongooseModelMatches = content.matchAll(/mongoose\.model\s*\(\s*['"]([^'"]+)['"]\s*,\s*([^)]+)\)/g);
    for (const match of mongooseModelMatches) {
      const modelName = match[1];
      const schemaVar = match[2];
      
      // Find the schema definition
      const schemaMatch = content.match(new RegExp(`const\\s+${schemaVar}\\s*=\\s*new\\s+mongoose\\.Schema\\s*\\(\\s*{([\\s\\S]*?)}\\s*\\)`));
      if (schemaMatch) {
        const schemaStr = schemaMatch[1];
        
        const fields = [];
        const fieldMatches = schemaStr.matchAll(/(\w+):\s*{([\s\S]*?)}\s*,?/g);
        
        for (const fieldMatch of fieldMatches) {
          const fieldName = fieldMatch[1];
          const fieldDef = fieldMatch[2];
          
          const typeMatch = fieldDef.match(/type:\s*(\w+)/);
          const requiredMatch = fieldMatch[0].includes('required:');
          
          const field = {
            id: fieldName,
            name: fieldName,
            type: typeMatch ? typeMatch[1].toUpperCase() : 'MIXED',
            nullable: !requiredMatch,
            primaryKey: fieldName === '_id',
            unique: false,
            autoIncrement: false,
            defaultValue: null
          };
          
          fields.push(field);
        }
        
        if (fields.length > 0) {
          tables.push({
            id: modelName.toLowerCase(),
            name: modelName,
            columns: fields
          });
        }
      }
    }
    
  } catch (error) {
    console.log(`Failed to extract from JS/TS ${filePath}:`, error.message);
  }
  return tables;
}

// Extract tables from Python files (Django, SQLAlchemy)
async function extractFromPythonFile(filePath) {
  const tables = [];
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Django models
    const djangoMatches = content.matchAll(/class\s+(\w+)\s*\([^)]*models\.Model[^)]*\):([\s\S]*?)(?=class|\Z)/g);
    for (const match of djangoMatches) {
      const modelName = match[1];
      const modelBody = match[2];
      
      const fields = [];
      const fieldMatches = modelBody.matchAll(/(\w+)\s*=\s*models\.(\w+)\([^)]*\)/g);
      
      for (const fieldMatch of fieldMatches) {
        const fieldName = fieldMatch[1];
        const fieldType = fieldMatch[2];
        
        const field = {
          id: fieldName,
          name: fieldName,
          type: fieldType.toUpperCase(),
          nullable: !fieldMatch[0].includes('null=False'),
          primaryKey: fieldMatch[0].includes('primary_key=True'),
          unique: fieldMatch[0].includes('unique=True'),
          autoIncrement: fieldType === 'AutoField',
          defaultValue: null
        };
        
        fields.push(field);
      }
      
      if (fields.length > 0) {
        tables.push({
          id: modelName.toLowerCase(),
          name: modelName,
          columns: fields
        });
      }
    }
    
  } catch (error) {
    console.log(`Failed to extract from Python ${filePath}:`, error.message);
  }
  return tables;
}

module.exports = { extractDatabaseDefinitionsFromSourceCode };