const Database = require('better-sqlite3');
const path = require('path');

async function checkExtractionStats() {
  console.log('📊 Checking Extraction Statistics...\n');
  
  const dbPath = path.join(__dirname, 'queryflow_app.db');
  const db = new Database(dbPath);
  
  // Get the most recent project
  const project = db.prepare(`
    SELECT 
      id, name, 
      total_tables, total_rows, total_columns,
      actual_database_tables, extracted_models,
      database_introspection, statistics_data
    FROM projects 
    ORDER BY updated_at DESC 
    LIMIT 1
  `).get();
  
  if (!project) {
    console.log('❌ No projects found');
    return;
  }
  
  console.log('📋 Latest Project:', project.name);
  console.log('   ID:', project.id);
  console.log('\n📊 COUNTS FROM DATABASE:');
  console.log(`   Total Tables: ${project.total_tables}`);
  console.log(`   Total Rows: ${project.total_rows}`);
  console.log(`   Total Columns: ${project.total_columns}`);
  
  // Parse actual database tables
  if (project.actual_database_tables) {
    const actualTables = JSON.parse(project.actual_database_tables);
    console.log('\n📦 ACTUAL DATABASE TABLES:');
    console.log(`   Count: ${actualTables.length}`);
    actualTables.forEach(table => {
      console.log(`      - ${table.name}: ${table.rowCount || 0} rows, ${table.columns?.length || 0} cols`);
    });
    
    const totalRows = actualTables.reduce((sum, t) => sum + (t.rowCount || 0), 0);
    const totalCols = actualTables.reduce((sum, t) => sum + (t.columns?.length || 0), 0);
    console.log(`\n   Calculated Total Rows: ${totalRows}`);
    console.log(`   Calculated Total Columns: ${totalCols}`);
  }
  
  // Parse extracted models
  if (project.extracted_models) {
    const extractedModels = JSON.parse(project.extracted_models);
    console.log('\n🔧 EXTRACTED ORM MODELS:');
    console.log(`   Count: ${extractedModels.length}`);
    if (extractedModels.length <= 10) {
      extractedModels.forEach(model => {
        console.log(`      - ${model.name}`);
      });
    } else {
      extractedModels.slice(0, 5).forEach(model => {
        console.log(`      - ${model.name}`);
      });
      console.log(`      ... and ${extractedModels.length - 5} more`);
    }
  }
  
  // Parse statistics
  if (project.statistics_data) {
    const stats = JSON.parse(project.statistics_data);
    console.log('\n📈 STATISTICS DATA:');
    console.log(`   Total Tables: ${stats.totalTables}`);
    console.log(`   Total Rows: ${stats.totalRows}`);
    console.log(`   Database Size: ${stats.databaseSize || 'N/A'}`);
  }
  
  // Parse database introspection
  if (project.database_introspection) {
    const introspection = JSON.parse(project.database_introspection);
    console.log('\n🔍 DATABASE INTROSPECTION:');
    console.log(`   Tables: ${introspection.tables?.length || 0}`);
    console.log(`   Indexes: ${introspection.indexes?.length || 0}`);
    console.log(`   Views: ${introspection.views?.length || 0}`);
    console.log(`   Triggers: ${introspection.triggers?.length || 0}`);
    
    if (introspection.statistics) {
      console.log(`   Statistics Total Rows: ${introspection.statistics.totalRows || 0}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('EXPECTED FOR COMPREHENSIVE-TEST-PROJECT:');
  console.log('   Tables: 7');
  console.log('   Rows: 91');
  console.log('   Columns: 57');
  console.log('='.repeat(60));
  
  db.close();
}

checkExtractionStats().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

