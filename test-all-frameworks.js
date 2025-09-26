// Test script to verify extraction for all frameworks
const path = require('path');
const fs = require('fs').promises;

// Import the ComprehensiveDatabaseExtractor
async function runTest() {
  console.log('🧪 Starting comprehensive extraction test for all frameworks...');
  
  try {
    // Dynamically require the extractor
    const { ComprehensiveDatabaseExtractor } = require('./src/services/comprehensiveDatabaseExtractor');
    
    // Test project paths
    const testProjects = [
      {
        name: 'Django Project',
        path: path.join(__dirname, 'test-projects', 'django-app')
      },
      {
        name: 'Laravel Project',
        path: path.join(__dirname, 'test-projects', 'laravel-blog')
      },
      {
        name: 'Node.js Project',
        path: path.join(__dirname, 'test-projects', 'nodejs-api')
      }
    ];
    
    // Test each project
    for (const project of testProjects) {
      console.log(`\n🔍 Testing extraction for ${project.name} at ${project.path}`);
      
      try {
        await fs.access(project.path);
        console.log(`✅ Project found: ${project.path}`);
      } catch (error) {
        console.error(`❌ Project not found: ${project.path}`);
        console.error('Please ensure the project directory exists');
        continue;
      }
      
      // Test migration extraction
      console.log('\n📋 Testing migration history extraction...');
      const migrationHistory = await ComprehensiveDatabaseExtractor.extractMigrationHistory(project.path);
      
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
      console.log('\n📋 Testing ORM model extraction...');
      const ormModels = await ComprehensiveDatabaseExtractor.extractORMModels(project.path);
      
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
              console.log(`       - ${rel.name || rel.type}: ${rel.type} -> ${rel.target}`);
            });
          }
        });
      } else {
        console.log('❌ No ORM models found');
      }
    }
    
    console.log('\n✅ Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

runTest().catch(console.error);
