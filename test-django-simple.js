// Simple test script for Django extraction
const path = require('path');
const fs = require('fs');

// Test function to manually check Django project structure
async function testDjangoProject() {
  console.log('🧪 Starting Django project structure test...');
  
  // Test project path
  const testProjectPath = path.join(__dirname, 'test-projects', 'django-app');
  console.log(`📁 Test project path: ${testProjectPath}`);
  
  // Check if the project exists
  if (fs.existsSync(testProjectPath)) {
    console.log('✅ Project directory found');
  } else {
    console.log('❌ Project directory not found');
    return;
  }
  
  // Check for Django models
  const modelsPath = path.join(testProjectPath, 'analytics', 'models.py');
  if (fs.existsSync(modelsPath)) {
    console.log('✅ Django models file found');
    const modelsContent = fs.readFileSync(modelsPath, 'utf-8');
    
    // Count model classes
    const modelMatches = modelsContent.match(/class\s+\w+\s*\(\s*models\.Model\s*\)/g);
    if (modelMatches) {
      console.log(`📊 Found ${modelMatches.length} Django model classes`);
      console.log(`📋 Models: ${modelMatches.map(m => m.match(/class\s+(\w+)/)[1]).join(', ')}`);
    } else {
      console.log('❌ No Django model classes found');
    }
    
    // Count relationships
    const relationshipMatches = modelsContent.match(/models\.(ForeignKey|OneToOneField|ManyToManyField)/g);
    if (relationshipMatches) {
      console.log(`📊 Found ${relationshipMatches.length} relationships`);
      console.log(`📋 Relationship types: ${[...new Set(relationshipMatches.map(r => r.split('.')[1]))].join(', ')}`);
    } else {
      console.log('❌ No relationships found');
    }
  } else {
    console.log('❌ Django models file not found');
  }
  
  // Check for migrations
  const migrationsPath = path.join(testProjectPath, 'analytics', 'migrations');
  if (fs.existsSync(migrationsPath)) {
    console.log('✅ Migrations directory found');
    
    const migrationFiles = fs.readdirSync(migrationsPath)
      .filter(file => file.match(/^\d{4}_.*\.py$/));
    
    if (migrationFiles.length > 0) {
      console.log(`📊 Found ${migrationFiles.length} migration files`);
      console.log(`📋 Migrations: ${migrationFiles.join(', ')}`);
      
      // Check first migration file
      const firstMigration = path.join(migrationsPath, migrationFiles[0]);
      const migrationContent = fs.readFileSync(firstMigration, 'utf-8');
      
      // Check for Migration class
      if (migrationContent.includes('class Migration(migrations.Migration)')) {
        console.log('✅ Migration class found');
      } else {
        console.log('❌ Migration class not found');
      }
      
      // Check for dependencies
      if (migrationContent.includes('dependencies = [')) {
        console.log('✅ Dependencies found');
      } else {
        console.log('❌ Dependencies not found');
      }
      
      // Check for operations
      if (migrationContent.includes('operations = [')) {
        console.log('✅ Operations found');
      } else {
        console.log('❌ Operations not found');
      }
    } else {
      console.log('❌ No migration files found');
    }
  } else {
    console.log('❌ Migrations directory not found');
  }
  
  console.log('✅ Django project structure test completed');
}

testDjangoProject().catch(console.error);
