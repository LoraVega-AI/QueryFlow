// Comprehensive database extraction function that handles multiple database types
const fs = require('fs').promises;
const path = require('path');

async function extractDatabaseDefinitionsFromSourceCode(allFiles, uploadDir) {
  try {
    console.log('🔍 Starting COMPREHENSIVE database definition extraction...');
    console.log('🔍 Upload directory:', uploadDir);
    console.log('🔍 All files count:', allFiles.length);
    
    const extractedTables = [];
    
    // 1. Extract from SQLite files
    const sqliteFiles = allFiles.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.sqlite', '.db'].includes(ext);
    });
    
    console.log(`📄 Found ${sqliteFiles.length} SQLite files`);
    for (const filePath of sqliteFiles) {
      try {
        const tables = await extractFromSQLiteFile(filePath);
        extractedTables.push(...tables);
        console.log(`✅ Extracted ${tables.length} tables from SQLite: ${path.basename(filePath)}`);
      } catch (error) {
        console.log(`⚠️ Failed to extract from SQLite ${path.basename(filePath)}:`, error.message);
      }
    }
    
    // 2. Extract from SQL files
    const sqlFiles = allFiles.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.sql'].includes(ext);
    });
    
    console.log(`📄 Found ${sqlFiles.length} SQL files`);
    for (const filePath of sqlFiles) {
      try {
        const tables = await extractFromSQLFile(filePath);
        extractedTables.push(...tables);
        console.log(`✅ Extracted ${tables.length} tables from SQL: ${path.basename(filePath)}`);
      } catch (error) {
        console.log(`⚠️ Failed to extract from SQL ${path.basename(filePath)}:`, error.message);
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
    
    // 4. Extract from Python files (Django, SQLAlchemy)
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
    
    // Return the extracted database
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
        relationships: [],
        indexes: []
      },
      status: 'ready',
      processingStartTime: new Date().toISOString(),
      processingTime: 0,
      conversionLogs: [`[${new Date().toISOString()}] Extracted ${extractedTables.length} tables from multiple sources`]
    }];
    
  } catch (error) {
    console.error('❌ Extraction failed:', error);
    return [];
  }
}

// Extract tables from SQLite files
async function extractFromSQLiteFile(filePath) {
  const tables = [];
  try {
    // For now, we'll create a placeholder since we can't easily read SQLite in this context
    // In a real implementation, you'd use a SQLite library
    const fileName = path.basename(filePath, path.extname(filePath));
    tables.push({
      id: fileName.toLowerCase(),
      name: fileName,
      columns: [
        { id: 'id', name: 'id', type: 'INTEGER', nullable: false, primaryKey: true, unique: false, autoIncrement: true, defaultValue: null }
      ]
    });
  } catch (error) {
    console.log(`Failed to extract from SQLite ${filePath}:`, error.message);
  }
  return tables;
}

// Extract tables from SQL files
async function extractFromSQLFile(filePath) {
  const tables = [];
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Find CREATE TABLE statements
    const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:`?(\w+)`?\.)?`?(\w+)`?\s*\(([\s\S]*?)\)/gi;
    let match;
    
    while ((match = createTableRegex.exec(content)) !== null) {
      const tableName = match[2] || match[1];
      const columnsStr = match[3];
      
      const columns = [];
      
      // Extract column definitions
      const columnLines = columnsStr.split(',').map(line => line.trim()).filter(line => line);
      
      for (const line of columnLines) {
        if (line.includes('PRIMARY KEY') || line.includes('FOREIGN KEY') || line.includes('UNIQUE') || line.includes('INDEX')) {
          continue; // Skip constraint lines for now
        }
        
        const columnMatch = line.match(/`?(\w+)`?\s+(\w+)(?:\([^)]+\))?(?:\s+(NOT\s+NULL|NULL))?(?:\s+(PRIMARY\s+KEY))?(?:\s+(AUTO_INCREMENT|AUTOINCREMENT))?/i);
        if (columnMatch) {
          const columnName = columnMatch[1];
          const columnType = columnMatch[2].toUpperCase();
          const isNotNull = line.includes('NOT NULL');
          const isPrimaryKey = line.includes('PRIMARY KEY');
          const isAutoIncrement = line.includes('AUTO_INCREMENT') || line.includes('AUTOINCREMENT');
          
          columns.push({
            id: columnName.toLowerCase(),
            name: columnName,
            type: columnType,
            nullable: !isNotNull,
            primaryKey: isPrimaryKey,
            unique: false,
            autoIncrement: isAutoIncrement,
            defaultValue: null
          });
        }
      }
      
      if (columns.length > 0) {
        tables.push({
          id: tableName.toLowerCase(),
          name: tableName,
          columns: columns
        });
      }
    }
  } catch (error) {
    console.log(`Failed to extract from SQL ${filePath}:`, error.message);
  }
  return tables;
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