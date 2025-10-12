const { DatabaseDefinitionExtractor } = require('./src/services/databaseDefinitionExtractor.ts');
const fs = require('fs');
const path = require('path');

async function testDirectExtraction() {
  try {
    console.log('🧪 Testing direct comprehensive extraction...\n');

    // Read the comprehensive test project files
    const testProjectPath = path.join(__dirname, 'comprehensive-test-project');
    const files = [
      'models/User.js',
      'models/Category.js', 
      'models/Product.js',
      'models/Order.js',
      'models/Review.js',
      'models/OrderItem.js',
      'models/Wishlist.js',
      'index.js',
      'comprehensive_test.db'
    ];

    const fileContents = files.map(filename => {
      const filePath = path.join(testProjectPath, filename);
      if (fs.existsSync(filePath)) {
        return {
          name: filename,
          content: fs.readFileSync(filePath, 'utf8'),
          path: filePath
        };
      }
      return null;
    }).filter(Boolean);

    console.log(`📁 Found ${fileContents.length} files to process`);

    // Initialize the extractor
    const extractor = new DatabaseDefinitionExtractor();
    
    // Extract database definitions
    console.log('🔍 Starting comprehensive extraction...');
    const extractionResult = await extractor.extractFromFiles(fileContents, {
      languages: ['javascript', 'typescript'],
      frameworks: ['sequelize'],
      confidence: { 
        minimum: 50,
        regexWeight: 0.3,
        astWeight: 0.5,
        frameworkWeight: 0.2
      },
      parallelProcessing: true,
      enableASTCaching: true
    });

    console.log('✅ Extraction completed!');
    console.log('\n📊 Extraction result summary:');
    console.log(`   - Tables: ${extractionResult.schema.tables.length}`);
    console.log(`   - Verification: ${extractionResult.verification ? '✅' : '❌'}`);
    console.log(`   - Database Introspection: ${extractionResult.databaseIntrospection ? '✅' : '❌'}`);
    console.log(`   - Schema Objects: ${extractionResult.schemaObjects ? '✅' : '❌'}`);
    console.log(`   - Columns: ${extractionResult.columns ? '✅' : '❌'}`);
    console.log(`   - Constraints: ${extractionResult.constraints ? '✅' : '❌'}`);
    console.log(`   - Statistics: ${extractionResult.statistics ? '✅' : '❌'}`);
    console.log(`   - Functions: ${extractionResult.functions ? '✅' : '❌'}`);
    console.log(`   - Security: ${extractionResult.security ? '✅' : '❌'}`);
    console.log(`   - Runtime State: ${extractionResult.runtimeState ? '✅' : '❌'}`);
    console.log(`   - Engine Features: ${extractionResult.engineFeatures ? '✅' : '❌'}`);

    if (extractionResult.verification) {
      console.log('\n🔍 Verification details:');
      console.log(`   - Verified Tables: ${extractionResult.verification.verifiedTables?.length || 0}`);
      console.log(`   - Phantom Tables: ${extractionResult.verification.phantomTables?.length || 0}`);
      console.log(`   - Accuracy: ${extractionResult.verification.verificationStats?.accuracy || 'N/A'}`);
    }

    if (extractionResult.databaseIntrospection) {
      console.log('\n🔍 Database Introspection details:');
      console.log(`   - Tables: ${extractionResult.databaseIntrospection.tables?.length || 0}`);
      console.log(`   - Views: ${extractionResult.databaseIntrospection.views?.length || 0}`);
      console.log(`   - Indexes: ${extractionResult.databaseIntrospection.indexes?.length || 0}`);
      console.log(`   - Triggers: ${extractionResult.databaseIntrospection.triggers?.length || 0}`);
    }

    console.log('\n✅ Direct extraction test completed!');

  } catch (error) {
    console.error('❌ Direct extraction test failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
  }
}

// Run the test
if (require.main === module) {
  testDirectExtraction()
    .then(() => {
      console.log('\n🎉 Direct extraction test completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Direct extraction test failed:', error);
      process.exit(1);
    });
}

module.exports = { testDirectExtraction };
