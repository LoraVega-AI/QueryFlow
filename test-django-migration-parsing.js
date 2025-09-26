// Test script for enhanced Django migration parsing
const path = require('path');
const fs = require('fs');

// Enhanced Django migration parsing functions
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

function extractDjangoModels(content) {
  const models = [];
  const createModelMatches = content.match(/CreateModel\s*\(\s*name=(['"].*?['"])/g);
  
  if (createModelMatches) {
    createModelMatches.forEach(match => {
      const modelNameMatch = match.match(/name=(['"].*?['"])/);
      if (modelNameMatch) {
        const modelName = modelNameMatch[1].replace(/['"]/g, '');
        models.push(modelName);
      }
    });
  }
  
  return models;
}

function extractDjangoFields(content, modelName) {
  const fields = [];
  const modelMatch = content.match(new RegExp(`CreateModel\\s*\\(\\s*name=['"]${modelName}['"]\\s*,\\s*fields=\\[(.*?)\\]`, 's'));
  
  if (modelMatch) {
    const fieldsContent = modelMatch[1];
    const fieldMatches = fieldsContent.match(/\((['"].*?['"])\s*,\s*(.*?)\)/g);
    
    if (fieldMatches) {
      fieldMatches.forEach(match => {
        const fieldParts = match.match(/\((['"].*?['"])\s*,\s*(.*?)\)/);
        if (fieldParts) {
          const fieldName = fieldParts[1].replace(/['"]/g, '');
          const fieldType = fieldParts[2];
          
          fields.push({
            name: fieldName,
            type: fieldType
          });
        }
      });
    }
  }
  
  return fields;
}

// Test function for enhanced Django migration parsing
async function testEnhancedDjangoMigrationParsing() {
  console.log('🧪 Starting enhanced Django migration parsing test...');
  
  // Test project path
  const testProjectPath = path.join(__dirname, 'test-projects', 'django-app');
  const migrationsPath = path.join(testProjectPath, 'analytics', 'migrations');
  
  // Check if migrations directory exists
  if (!fs.existsSync(migrationsPath)) {
    console.log('❌ Migrations directory not found');
    return;
  }
  
  console.log('✅ Migrations directory found');
  
  // Get migration files
  const migrationFiles = fs.readdirSync(migrationsPath)
    .filter(file => file.match(/^\d{4}_.*\.py$/));
  
  if (migrationFiles.length === 0) {
    console.log('❌ No migration files found');
    return;
  }
  
  console.log(`📊 Found ${migrationFiles.length} migration files`);
  
  // Test each migration file
  for (const file of migrationFiles) {
    console.log(`\n📋 Testing enhanced parsing for migration file: ${file}`);
    
    const filePath = path.join(migrationsPath, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Extract version
    const version = extractDjangoMigrationVersion(file);
    console.log(`📊 Migration version: ${version}`);
    
    // Extract name
    const name = extractDjangoMigrationName(file);
    console.log(`📊 Migration name: ${name}`);
    
    // Extract description
    const description = extractDjangoMigrationDescription(content);
    console.log(`📊 Migration description: ${description}`);
    
    // Extract dependencies
    const dependencies = extractDjangoDependencies(content);
    console.log(`📊 Dependencies: ${dependencies.join(', ')}`);
    
    // Extract operations
    const operations = extractDjangoOperations(content);
    console.log(`📊 Operations: ${operations.join(', ')}`);
    
    // Extract models
    const models = extractDjangoModels(content);
    console.log(`📊 Models: ${models.join(', ')}`);
    
    // Extract fields for each model
    for (const model of models) {
      console.log(`\n📋 Fields for model: ${model}`);
      const fields = extractDjangoFields(content, model);
      
      fields.forEach(field => {
        console.log(`  - ${field.name}: ${field.type}`);
      });
    }
  }
  
  console.log('\n✅ Enhanced Django migration parsing test completed');
}

testEnhancedDjangoMigrationParsing().catch(console.error);
