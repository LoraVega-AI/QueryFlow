// Test script for AdvancedProjectScanner
const { AdvancedProjectScanner } = require('./src/services/advancedProjectScanner.ts');

async function testScanner() {
  console.log('🧪 Testing AdvancedProjectScanner...');
  
  try {
    const scanner = new AdvancedProjectScanner();
    const testDir = './test-upload-project';
    
    console.log(`📁 Scanning directory: ${testDir}`);
    
    const result = await scanner.scanProject(testDir, {
      includeHidden: false,
      maxDepth: 5,
      ignorePatterns: ['node_modules', '.git', 'dist', 'build', '__pycache__'],
      scanTimeout: 30000
    });
    
    console.log('📊 Scan results:');
    console.log(`  Project Name: ${result.projectName}`);
    console.log(`  Project Type: ${result.projectType}`);
    console.log(`  Confidence: ${result.confidence}`);
    console.log(`  Total Files: ${result.totalFiles}`);
    console.log(`  Processed Files: ${result.processedFiles}`);
    console.log(`  Extracted Schemas: ${result.extractedSchemas.length}`);
    console.log(`  Database Files: ${result.databaseFiles.length}`);
    console.log(`  Config Files: ${result.configFiles.length}`);
    console.log(`  Errors: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log('❌ Errors:');
      result.errors.forEach(error => {
        console.log(`  - ${error.file}: ${error.error}`);
      });
    }
    
    if (result.extractedSchemas.length > 0) {
      console.log('📋 Extracted Schemas:');
      result.extractedSchemas.forEach(schema => {
        console.log(`  - ${schema.name} (${schema.type}): ${schema.tables.length} tables`);
        schema.tables.forEach(table => {
          console.log(`    - ${table.name}: ${table.columns.length} columns`);
        });
      });
    }
    
  } catch (error) {
    console.error('❌ Scanner test failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

testScanner();
