// Comprehensive test for Django extraction
const path = require('path');
const fs = require('fs');

// Mock implementation of the comprehensive Django extraction
async function extractDjangoProject(projectPath) {
  console.log(`🔍 Extracting Django project from: ${projectPath}`);
  
  // Extract results
  const result = {
    models: [],
    migrations: [],
    relationships: [],
    indexes: []
  };
  
  // Find Django models
  await extractDjangoModels(projectPath, result);
  
  // Find Django migrations
  await extractDjangoMigrations(projectPath, result);
  
  return result;
}

// Extract Django models
async function extractDjangoModels(projectPath, result) {
  console.log(`🔍 Searching for Django models in: ${projectPath}`);
  
  // Common Django app directories
  const possibleAppDirs = [
    '', // Project root
    'app',
    'apps',
    'src',
    'core',
    'api',
    'users',
    'accounts',
    'blog',
    'posts',
    'products',
    'analytics'
  ];
  
  // Check each possible app directory for models.py
  for (const appDir of possibleAppDirs) {
    const appPath = path.join(projectPath, appDir);
    
    // Skip if the app directory doesn't exist
    if (!fs.existsSync(appPath)) {
      continue;
    }
    
    // Check if it's a directory
    try {
      const appStats = fs.statSync(appPath);
      if (!appStats.isDirectory()) {
        continue;
      }
    } catch (error) {
      continue;
    }
    
    console.log(`📁 Checking app directory: ${appPath}`);
    
    // Look for models.py
    const modelsPath = path.join(appPath, 'models.py');
    if (fs.existsSync(modelsPath)) {
      console.log(`✅ Found models.py: ${modelsPath}`);
      
      // Read models.py
      const modelsContent = fs.readFileSync(modelsPath, 'utf-8');
      
      // Extract models
      const models = extractDjangoModelClasses(modelsContent);
      
      if (models.length > 0) {
        console.log(`📊 Found ${models.length} Django model classes`);
        result.models.push(...models);
      } else {
        console.log('❌ No Django model classes found');
      }
    }
    
    // Check subdirectories
    try {
      const subDirs = fs.readdirSync(appPath);
      
      for (const subDir of subDirs) {
        const subDirPath = path.join(appPath, subDir);
        
        // Skip if not a directory
        try {
          const subDirStats = fs.statSync(subDirPath);
          if (!subDirStats.isDirectory()) {
            continue;
          }
        } catch (error) {
          continue;
        }
        
        // Skip migrations directory
        if (subDir === 'migrations') {
          continue;
        }
        
        console.log(`📁 Checking subdirectory: ${subDirPath}`);
        
        // Look for models.py
        const subModelsPath = path.join(subDirPath, 'models.py');
        if (fs.existsSync(subModelsPath)) {
          console.log(`✅ Found models.py: ${subModelsPath}`);
          
          // Read models.py
          const modelsContent = fs.readFileSync(subModelsPath, 'utf-8');
          
          // Extract models
          const models = extractDjangoModelClasses(modelsContent);
          
          if (models.length > 0) {
            console.log(`📊 Found ${models.length} Django model classes`);
            result.models.push(...models);
          } else {
            console.log('❌ No Django model classes found');
          }
        }
      }
    } catch (error) {
      // Skip if we can't read the directory
    }
  }
}

// Extract Django model classes from content
function extractDjangoModelClasses(content) {
  const models = [];
  
  // Find model classes
  const modelClassRegex = /class\s+(\w+)\s*\(\s*models\.Model\s*\)\s*:/g;
  let match;
  
  while ((match = modelClassRegex.exec(content)) !== null) {
    const modelName = match[1];
    
    // Extract model fields
    const modelStart = match.index;
    const modelEnd = findModelEnd(content, modelStart);
    const modelBody = content.substring(modelStart, modelEnd);
    
    // Extract fields
    const fields = extractDjangoModelFields(modelBody);
    
    // Extract relationships
    const relationships = extractDjangoModelRelationships(modelBody);
    
    // Extract meta
    const meta = extractDjangoModelMeta(modelBody);
    
    models.push({
      name: modelName,
      fields,
      relationships,
      meta
    });
  }
  
  return models;
}

// Find the end of a model class definition
function findModelEnd(content, start) {
  // Find the next class definition or the end of the file
  const nextClassMatch = content.substring(start + 1).match(/class\s+\w+/);
  
  if (nextClassMatch) {
    return start + 1 + nextClassMatch.index;
  }
  
  return content.length;
}

// Extract Django model fields
function extractDjangoModelFields(modelBody) {
  const fields = [];
  
  // Find field definitions
  const fieldRegex = /(\w+)\s*=\s*models\.(\w+)\(([^)]*)\)/g;
  let match;
  
  while ((match = fieldRegex.exec(modelBody)) !== null) {
    const fieldName = match[1];
    const fieldType = match[2];
    const fieldArgs = match[3];
    
    // Skip relationship fields
    if (['ForeignKey', 'OneToOneField', 'ManyToManyField'].includes(fieldType)) {
      continue;
    }
    
    fields.push({
      name: fieldName,
      type: fieldType,
      args: fieldArgs
    });
  }
  
  return fields;
}

// Extract Django model relationships
function extractDjangoModelRelationships(modelBody) {
  const relationships = [];
  
  // Find relationship definitions
  const relationshipRegex = /(\w+)\s*=\s*models\.(ForeignKey|OneToOneField|ManyToManyField)\(([^)]+)\)/g;
  let match;
  
  while ((match = relationshipRegex.exec(modelBody)) !== null) {
    const fieldName = match[1];
    const relationType = match[2];
    const relationArgs = match[3];
    
    relationships.push({
      name: fieldName,
      type: relationType,
      args: relationArgs
    });
  }
  
  return relationships;
}

// Extract Django model meta
function extractDjangoModelMeta(modelBody) {
  const meta = {};
  
  // Find meta class
  const metaMatch = modelBody.match(/class\s+Meta\s*:\s*([^}]+?)(?:class|$)/s);
  
  if (metaMatch) {
    const metaBody = metaMatch[1];
    
    // Extract table name
    const tableNameMatch = metaBody.match(/db_table\s*=\s*['"]([^'"]+)['"]/);
    if (tableNameMatch) {
      meta.tableName = tableNameMatch[1];
    }
    
    // Extract ordering
    const orderingMatch = metaBody.match(/ordering\s*=\s*\[([^\]]+)\]/);
    if (orderingMatch) {
      meta.ordering = orderingMatch[1];
    }
    
    // Extract unique together
    const uniqueTogetherMatch = metaBody.match(/unique_together\s*=\s*\(([^)]+)\)/);
    if (uniqueTogetherMatch) {
      meta.uniqueTogether = uniqueTogetherMatch[1];
    }
  }
  
  return meta;
}

// Extract Django migrations
async function extractDjangoMigrations(projectPath, result) {
  console.log(`🔍 Searching for Django migrations in: ${projectPath}`);
  
  // Find migration directories
  const migrationDirs = await findDjangoMigrationDirectories(projectPath);
  
  console.log(`📊 Found ${migrationDirs.length} migration directories`);
  
  // Process each migration directory
  for (const dir of migrationDirs) {
    console.log(`\n📋 Processing migration directory: ${dir.path}`);
    
    // Process each migration file
    for (const file of dir.files) {
      const filePath = path.join(dir.path, file);
      console.log(`📋 Processing migration file: ${file}`);
      
      // Read migration file
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Extract migration information
      const migration = {
        file,
        version: extractDjangoMigrationVersion(file),
        name: extractDjangoMigrationName(file),
        description: extractDjangoMigrationDescription(content),
        dependencies: extractDjangoDependencies(content),
        operations: extractDjangoOperations(content)
      };
      
      result.migrations.push(migration);
    }
  }
}

// Find Django migration directories
async function findDjangoMigrationDirectories(projectPath) {
  console.log(`🔍 Searching for Django migration directories in: ${projectPath}`);
  
  // Common Django app directories
  const possibleAppDirs = [
    '', // Project root
    'app',
    'apps',
    'src',
    'core',
    'api',
    'users',
    'accounts',
    'blog',
    'posts',
    'products',
    'analytics'
  ];
  
  const migrationDirs = [];
  const processedPaths = new Set(); // To avoid duplicates
  
  // Check each possible app directory for a migrations subdirectory
  for (const appDir of possibleAppDirs) {
    const appPath = path.join(projectPath, appDir);
    
    // Skip if the app directory doesn't exist
    if (!fs.existsSync(appPath)) {
      continue;
    }
    
    // Check if it's a directory
    try {
      const appStats = fs.statSync(appPath);
      if (!appStats.isDirectory()) {
        continue;
      }
    } catch (error) {
      continue;
    }
    
    console.log(`📁 Checking app directory: ${appPath}`);
    
    // Look for a migrations subdirectory
    const migrationsPath = path.join(appPath, 'migrations');
    if (fs.existsSync(migrationsPath) && !processedPaths.has(migrationsPath)) {
      processedPaths.add(migrationsPath);
      
      try {
        const migrationsStats = fs.statSync(migrationsPath);
        if (migrationsStats.isDirectory()) {
          console.log(`✅ Found migrations directory: ${migrationsPath}`);
          
          // Check if it contains migration files
          const files = fs.readdirSync(migrationsPath);
          const migrationFiles = files.filter(file => file.match(/^\d{4}_.*\.py$/));
          
          if (migrationFiles.length > 0) {
            console.log(`📊 Found ${migrationFiles.length} migration files`);
            migrationDirs.push({
              path: migrationsPath,
              files: migrationFiles
            });
          } else {
            console.log('❌ No migration files found in directory');
          }
        }
      } catch (error) {
        console.log(`❌ Error reading migrations directory: ${error.message}`);
      }
    }
    
    // Check subdirectories
    try {
      const subDirs = fs.readdirSync(appPath);
      
      for (const subDir of subDirs) {
        const subDirPath = path.join(appPath, subDir);
        
        // Skip if not a directory
        try {
          const subDirStats = fs.statSync(subDirPath);
          if (!subDirStats.isDirectory()) {
            continue;
          }
        } catch (error) {
          continue;
        }
        
        console.log(`📁 Checking subdirectory: ${subDirPath}`);
        
        // Look for a migrations subdirectory
        const subMigrationsPath = path.join(subDirPath, 'migrations');
        if (fs.existsSync(subMigrationsPath) && !processedPaths.has(subMigrationsPath)) {
          processedPaths.add(subMigrationsPath);
          
          try {
            const subMigrationsStats = fs.statSync(subMigrationsPath);
            if (subMigrationsStats.isDirectory()) {
              console.log(`✅ Found migrations directory: ${subMigrationsPath}`);
              
              // Check if it contains migration files
              const files = fs.readdirSync(subMigrationsPath);
              const migrationFiles = files.filter(file => file.match(/^\d{4}_.*\.py$/));
              
              if (migrationFiles.length > 0) {
                console.log(`📊 Found ${migrationFiles.length} migration files`);
                migrationDirs.push({
                  path: subMigrationsPath,
                  files: migrationFiles
                });
              } else {
                console.log('❌ No migration files found in directory');
              }
            }
          } catch (error) {
            console.log(`❌ Error reading migrations directory: ${error.message}`);
          }
        }
      }
    } catch (error) {
      // Skip if we can't read the directory
    }
  }
  
  return migrationDirs;
}

// Helper functions for Django migration parsing
function extractDjangoMigrationVersion(filename) {
  const match = filename.match(/^(\d{4})_/);
  return match ? match[1] : '0000';
}

function extractDjangoMigrationName(filename) {
  const match = filename.match(/^\d{4}_([a-z0-9_]+)\.py$/i);
  return match ? match[1].replace(/_/g, ' ') : filename.replace(/\.py$/, '');
}

function extractDjangoMigrationDescription(content) {
  // Try to find class docstring
  const docstringMatch = content.match(/class Migration.*?:\s*?(?:'''|""")(.*?)(?:'''|""")/s);
  if (docstringMatch) return docstringMatch[1].trim();
  
  // Try to find operations list for a summary
  const operationsMatch = content.match(/operations = \[(.*?)\]/s);
  if (operationsMatch) {
    const operations = operationsMatch[1].trim();
    // Return a summary of the first few operations
    const opLines = operations.split('\n').filter(line => line.trim()).slice(0, 3);
    return `Operations: ${opLines.map(line => line.trim()).join(', ')}${opLines.length < operations.split('\n').filter(line => line.trim()).length ? '...' : ''}`;
  }
  
  return 'Django migration';
}

function extractDjangoDependencies(content) {
  const dependenciesMatch = content.match(/dependencies\s*=\s*\[(.*?)\]/s);
  if (!dependenciesMatch) return [];
  
  const dependencies = dependenciesMatch[1];
  const depMatches = dependencies.match(/\((['"].*?['"])\s*,\s*(['"].*?['"])\)/g);
  
  if (!depMatches) return [];
  
  return depMatches.map(dep => {
    const match = dep.match(/\((['"].*?['"])\s*,\s*(['"].*?['"])\)/);
    if (match) return `${match[1].replace(/['"]/g, '')}.${match[2].replace(/['"]/g, '')}`;
    return dep;
  });
}

function extractDjangoOperations(content) {
  const operationsMatch = content.match(/operations\s*=\s*\[(.*?)\]/s);
  if (!operationsMatch) return [];
  
  const operations = operationsMatch[1];
  const opLines = operations.split('\n')
    .filter(line => line.trim())
    .map(line => line.trim())
    .filter(line => line !== ']' && line !== '[' && line !== ',');
  
  return opLines.map(line => {
    // Clean up the line to get just the operation name
    return line.replace(/^migrations\./, '').split('(')[0].trim();
  }).filter(op => op);
}

// Test function for comprehensive Django extraction
async function testComprehensiveDjangoExtraction() {
  console.log('🧪 Starting comprehensive Django extraction test...');
  
  // Test project path
  const testProjectPath = path.join(__dirname, 'test-projects', 'django-app');
  
  // Check if the project exists
  if (!fs.existsSync(testProjectPath)) {
    console.log('❌ Test project not found');
    return;
  }
  
  console.log('✅ Test project found');
  
  // Extract Django project
  const result = await extractDjangoProject(testProjectPath);
  
  // Print results
  console.log('\n📊 Extraction results:');
  console.log(`📊 Models: ${result.models.length}`);
  console.log(`📊 Migrations: ${result.migrations.length}`);
  
  // Print model details
  console.log('\n📋 Models:');
  result.models.forEach((model, index) => {
    console.log(`\n📋 Model ${index + 1}: ${model.name}`);
    console.log(`📊 Fields: ${model.fields.length}`);
    console.log(`📊 Relationships: ${model.relationships.length}`);
    
    // Print fields
    if (model.fields.length > 0) {
      console.log('\n📋 Fields:');
      model.fields.forEach(field => {
        console.log(`  - ${field.name}: ${field.type}`);
      });
    }
    
    // Print relationships
    if (model.relationships.length > 0) {
      console.log('\n📋 Relationships:');
      model.relationships.forEach(rel => {
        console.log(`  - ${rel.name}: ${rel.type}`);
      });
    }
    
    // Print meta
    if (Object.keys(model.meta).length > 0) {
      console.log('\n📋 Meta:');
      Object.entries(model.meta).forEach(([key, value]) => {
        console.log(`  - ${key}: ${value}`);
      });
    }
  });
  
  // Print migration details
  console.log('\n📋 Migrations:');
  result.migrations.forEach((migration, index) => {
    console.log(`\n📋 Migration ${index + 1}: ${migration.file}`);
    console.log(`📊 Version: ${migration.version}`);
    console.log(`📊 Name: ${migration.name}`);
    console.log(`📊 Description: ${migration.description}`);
    console.log(`📊 Dependencies: ${migration.dependencies.join(', ')}`);
    console.log(`📊 Operations: ${migration.operations.join(', ')}`);
  });
  
  console.log('\n✅ Comprehensive Django extraction test completed');
}

testComprehensiveDjangoExtraction().catch(console.error);
