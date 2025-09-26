// Test script to verify Django extraction implementation
const path = require('path');
const fs = require('fs').promises;

// Import the ComprehensiveDatabaseExtractor
async function runTest() {
  console.log('🧪 Starting Django extraction test...');
  
  try {
    // Dynamically require the extractor
    const { ComprehensiveDatabaseExtractor } = require('./src/services/comprehensiveDatabaseExtractor.ts');
    
    // Test project path - use test-projects/django-app directory
    const testProjectPath = path.join(__dirname, 'test-projects', 'django-app');
    
    // Verify the test project exists
    try {
      await fs.access(testProjectPath);
      console.log(`✅ Test project found: ${testProjectPath}`);
    } catch (error) {
      console.error(`❌ Test project not found: ${testProjectPath}`);
      console.error('Please ensure the test-projects/django-app directory exists');
      process.exit(1);
    }
    
    // Test migration extraction
    console.log('\n🔍 Testing migration history extraction...');
    const migrationHistory = await ComprehensiveDatabaseExtractor.extractMigrationHistory(testProjectPath);
    
    if (migrationHistory) {
      console.log('✅ Migration history extracted successfully!');
      console.log(`📊 Framework: ${migrationHistory.framework}`);
      console.log(`📊 Migrations: ${migrationHistory.migrations.length}`);
      console.log(`📊 Path: ${migrationHistory.migrationsPath}`);
      
      // Log first few migrations
      if (migrationHistory.migrations.length > 0) {
        console.log('\n📋 First few migrations:');
        migrationHistory.migrations.slice(0, 3).forEach((migration, index) => {
          console.log(`  ${index + 1}. ${migration.name} (${migration.version}) - ${migration.status}`);
        });
      }
    } else {
      console.log('❌ No migration history found');
    }
    
    // Test ORM model extraction
    console.log('\n🔍 Testing ORM model extraction...');
    const ormModels = await ComprehensiveDatabaseExtractor.extractORMModels(testProjectPath);
    
    if (ormModels.length > 0) {
      console.log('✅ ORM models extracted successfully!');
      console.log(`📊 Models found: ${ormModels.length}`);
      
      // Log models
      console.log('\n📋 Models:');
      ormModels.forEach((model, index) => {
        console.log(`  ${index + 1}. ${model.name} (${model.framework})`);
        console.log(`     Properties: ${model.properties?.length || 0}`);
        console.log(`     Relationships: ${model.relationships?.length || 0}`);
        console.log(`     Validations: ${model.validations?.length || 0}`);
        
        // Show first few properties if available
        if (model.properties && model.properties.length > 0) {
          console.log('     Properties sample:');
          model.properties.slice(0, 3).forEach(prop => {
            console.log(`       - ${prop.name}: ${prop.type}`);
          });
        }
        
        // Show relationships if available
        if (model.relationships && model.relationships.length > 0) {
          console.log('     Relationships sample:');
          model.relationships.slice(0, 3).forEach(rel => {
            console.log(`       - ${rel.name}: ${rel.type} -> ${rel.target}`);
          });
        }
      });
    } else {
      console.log('❌ No ORM models found');
    }
    
    // Test index extraction (requires a database file)
    console.log('\n🔍 Testing index extraction...');
    console.log('Note: This requires a SQLite database file to test.');
    console.log('Skipping index extraction test as it requires a database connection.');
    
    console.log('\n✅ Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

runTest().catch(console.error);