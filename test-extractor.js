const { DatabaseDefinitionExtractor } = require('./src/services/databaseDefinitionExtractor');

async function testExtractor() {
  try {
    console.log('🧪 Testing Database Definition Extractor...');
    
    const extractor = new DatabaseDefinitionExtractor();
    
    // Test with our Sequelize model
    const testFiles = [
      {
        name: 'models/User.js',
        content: `const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  });

  return User;
};`
      }
    ];
    
    console.log('📁 Test files:', testFiles.map(f => f.name));
    
    const result = await extractor.extractFromFiles(testFiles, {
      languages: ['javascript', 'typescript'],
      frameworks: ['sequelize'],
      confidence: { 
        minimum: 50,
        regexWeight: 0.3,
        astWeight: 0.5,
        frameworkWeight: 0.2
      },
      parallelProcessing: false,
      enableASTCaching: false
    });
    
    console.log('🎉 Extraction result:', {
      success: !!result,
      tablesCount: result?.schema?.tables?.length || 0,
      hasSchema: !!result?.schema,
      hasMetadata: !!result?.metadata
    });
    
    if (result?.schema?.tables?.length > 0) {
      console.log('📊 Tables found:');
      result.schema.tables.forEach(table => {
        console.log(`  - ${table.name}: ${table.fields?.length || 0} fields`);
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('❌ Stack:', error.stack);
  }
}

testExtractor();
