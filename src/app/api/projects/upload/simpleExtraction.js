// Comprehensive database extraction function that handles multiple database types
const fs = require('fs').promises;
const path = require('path');
const { DatabaseIntrospectionService } = require('../../../../services/extraction/databaseIntrospectionService');

async function extractDatabaseDefinitionsFromSourceCode(allFiles, uploadDir) {
  try {
    console.log('🔍 Starting COMPREHENSIVE database definition extraction...');
    console.log('🔍 Upload directory:', uploadDir);
    console.log('🔍 All files count:', allFiles.length);
    
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
    
    console.log(`📄 Found ${sqlFiles.length} SQL files`);
    for (const filePath of sqlFiles) {
      try {
        const dbResult = await introspectionService.parseSQLDump(filePath);
        if (dbResult && dbResult.tables) {
          extractedTables.push(...dbResult.tables);
          console.log(`✅ Parsed SQL ${path.basename(filePath)}: ${dbResult.tables.length} tables (${dbResult.databaseType})`);
        }
      } catch (error) {
        console.log(`⚠️ Failed to parse SQL ${path.basename(filePath)}:`, error.message);
      }
    }
    
    // 3. Extract from JavaScript/TypeScript files (Sequelize, Mongoose, etc.)
    const jsFiles = allFiles.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.js', '.ts'].includes(ext);
    });
    
    console.log(`📄 Found ${jsFiles.length} JS/TS files`);
    for (const filePath of jsFiles) {
      try {
        const tables = await extractFromJSFile(filePath);
        extractedTables.push(...tables);
        if (tables.length > 0) {
          console.log(`✅ Extracted ${tables.length} tables from JS/TS: ${path.basename(filePath)}`);
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
          extractedTables.push(...dbResult.tables);
          console.log(`✅ Parsed Prisma ${path.basename(filePath)}: ${dbResult.tables.length} models`);
        }
      } catch (error) {
        console.log(`⚠️ Failed to parse Prisma ${path.basename(filePath)}:`, error.message);
      }
    }

    // 5. Extract from Python files (Django, SQLAlchemy)
    const pyFiles = allFiles.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.py'].includes(ext);
    });
    
    console.log(`📄 Found ${pyFiles.length} Python files`);
    for (const filePath of pyFiles) {
      try {
        const tables = await extractFromPythonFile(filePath);
        extractedTables.push(...tables);
        if (tables.length > 0) {
          console.log(`✅ Extracted ${tables.length} tables from Python: ${path.basename(filePath)}`);
        }
      } catch (error) {
        console.log(`⚠️ Failed to extract from Python ${path.basename(filePath)}:`, error.message);
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
      schema: {
        id: `extracted_schema_${Date.now()}`,
        name: 'Extracted Schema',
        tables: extractedTables,
        relationships: extractedTables.flatMap(t => t.foreignKeys || []),
        indexes: extractedTables.flatMap(t => t.indexes || [])
      },
      status: 'ready',
      processingStartTime: new Date().toISOString(),
      processingTime: 0,
      conversionLogs: [
        `[${new Date().toISOString()}] Extracted ${extractedTables.length} tables from multiple sources`,
        `[${new Date().toISOString()}] Total rows: ${totalRows}`,
        `[${new Date().toISOString()}] Foreign keys: ${hasForeignKeys ? 'Yes' : 'No'}`,
        `[${new Date().toISOString()}] Indexes: ${hasIndexes ? 'Yes' : 'No'}`
      ],
      metadata: {
        totalTables: extractedTables.length,
        totalColumns: extractedTables.reduce((sum, table) => sum + (table.columns?.length || 0), 0),
        totalRows: totalRows,
        hasForeignKeys: hasForeignKeys,
        hasIndexes: hasIndexes
      }
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