// Test script for Django migration detection
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// Mock implementation of the migration detection logic
function detectMigrationFramework(filename, content) {
  // Django migration patterns
  if (filename.endsWith('.py')) {
    // Django migration patterns
    if (/^\d{4}_[a-z0-9_]+\.py$/i.test(filename)) {
      console.log('✅ Detected Django migration from filename pattern');
      return 'django';
    }
    if (content.includes('from django.db import migrations')) {
      console.log('✅ Detected Django migration from import statement');
      return 'django';
    }
    if (content.includes('class Migration(migrations.Migration)')) {
      console.log('✅ Detected Django migration from class definition');
      return 'django';
    }
    if (content.includes('operations = [')) {
      console.log('✅ Detected Django migration from operations list');
      return 'django';
    }
    if (content.includes('dependencies = [')) {
      console.log('✅ Detected Django migration from dependencies list');
      return 'django';
    }
  }
  
  return 'unknown';
}

// Test function for Django migration detection
async function testDjangoMigrationDetection() {
  console.log('🧪 Starting Django migration detection test...');
  
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
    console.log(`\n📋 Testing migration file: ${file}`);
    
    const filePath = path.join(migrationsPath, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Test migration detection
    const framework = detectMigrationFramework(file, content);
    console.log(`📊 Detected framework: ${framework}`);
    
    // Extract version from filename
    const versionMatch = file.match(/^(\d{4})_/);
    const version = versionMatch ? versionMatch[1] : '0000';
    console.log(`📊 Migration version: ${version}`);
    
    // Extract name from filename
    const nameMatch = file.match(/^\d{4}_([a-z0-9_]+)\.py$/i);
    const name = nameMatch ? nameMatch[1].replace(/_/g, ' ') : file.replace(/\.py$/, '');
    console.log(`📊 Migration name: ${name}`);
    
    // Extract description from content
    let description = '';
    
    // Try to find class docstring
    const docstringMatch = content.match(/class Migration.*?:\s*?(?:'''|""")(.*?)(?:'''|""")/s);
    if (docstringMatch) {
      description = docstringMatch[1].trim();
    } else {
      // Try to find operations list for a summary
      const operationsMatch = content.match(/operations = \[(.*?)\]/s);
      if (operationsMatch) {
        const operations = operationsMatch[1].trim();
        // Return a summary of the first few operations
        const opLines = operations.split('\n').filter(line => line.trim()).slice(0, 3);
        description = `Operations: ${opLines.map(line => line.trim()).join(', ')}${opLines.length < operations.split('\n').filter(line => line.trim()).length ? '...' : ''}`;
      } else {
        description = 'Django migration';
      }
    }
    
    console.log(`📊 Migration description: ${description}`);
    
    // Extract dependencies
    const dependenciesMatch = content.match(/dependencies\s*=\s*\[(.*?)\]/s);
    if (dependenciesMatch) {
      const dependencies = dependenciesMatch[1];
      const depMatches = dependencies.match(/\((['"].*?['"])\s*,\s*(['"].*?['"])\)/g);
      
      if (depMatches) {
        const deps = depMatches.map(dep => {
          const match = dep.match(/\((['"].*?['"])\s*,\s*(['"].*?['"])\)/);
          if (match) return `${match[1].replace(/['"]/g, '')}.${match[2].replace(/['"]/g, '')}`;
          return dep;
        });
        
        console.log(`📊 Dependencies: ${deps.join(', ')}`);
      } else {
        console.log('❌ No dependencies found in dependencies list');
      }
    } else {
      console.log('❌ No dependencies list found');
    }
    
    // Extract operations
    const operationsMatch = content.match(/operations\s*=\s*\[(.*?)\]/s);
    if (operationsMatch) {
      const operations = operationsMatch[1];
      const opLines = operations.split('\n')
        .filter(line => line.trim())
        .map(line => line.trim())
        .filter(line => line !== ']' && line !== '[' && line !== ',');
      
      const ops = opLines.map(line => {
        // Clean up the line to get just the operation name
        return line.replace(/^migrations\./, '').split('(')[0].trim();
      }).filter(op => op);
      
      console.log(`📊 Operations: ${ops.join(', ')}`);
    } else {
      console.log('❌ No operations list found');
    }
  }
  
  console.log('\n✅ Django migration detection test completed');
}

testDjangoMigrationDetection().catch(console.error);
