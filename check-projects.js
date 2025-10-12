const Database = require('better-sqlite3');
const path = require('path');

async function checkProjects() {
  try {
    console.log('🔍 Checking projects in database...\n');

    // Connect to the database
    const dbPath = path.join(__dirname, 'queryflow_app.db');
    const db = new Database(dbPath);

    // Get all projects
    const projects = db.prepare('SELECT id, name, description, created_at FROM projects ORDER BY created_at DESC LIMIT 5').all();
    
    console.log(`📊 Found ${projects.length} projects:`);
    projects.forEach((project, index) => {
      console.log(`   ${index + 1}. ${project.name} (${project.id})`);
      console.log(`      Description: ${project.description}`);
      console.log(`      Created: ${project.created_at}`);
    });

    if (projects.length > 0) {
      // Get the latest project details
      const latestProject = projects[0];
      const projectDetails = db.prepare('SELECT * FROM projects WHERE id = ?').get(latestProject.id);
      
      console.log('\n🔍 Latest project details:');
      console.log(`   - ID: ${projectDetails.id}`);
      console.log(`   - Name: ${projectDetails.name}`);
      console.log(`   - Has verification_data: ${projectDetails.verification_data ? 'Yes' : 'No'}`);
      console.log(`   - Has database_introspection: ${projectDetails.database_introspection ? 'Yes' : 'No'}`);
      console.log(`   - Has schema_objects: ${projectDetails.schema_objects ? 'Yes' : 'No'}`);
      console.log(`   - Has columns_data: ${projectDetails.columns_data ? 'Yes' : 'No'}`);
      console.log(`   - Has constraints_data: ${projectDetails.constraints_data ? 'Yes' : 'No'}`);
      console.log(`   - Has statistics_data: ${projectDetails.statistics_data ? 'Yes' : 'No'}`);
      console.log(`   - Has functions_data: ${projectDetails.functions_data ? 'Yes' : 'No'}`);
      console.log(`   - Has security_data: ${projectDetails.security_data ? 'Yes' : 'No'}`);
      console.log(`   - Has runtime_state: ${projectDetails.runtime_state ? 'Yes' : 'No'}`);
      console.log(`   - Has engine_features: ${projectDetails.engine_features ? 'Yes' : 'No'}`);

      // Check if verification data exists
      if (projectDetails.verification_data) {
        try {
          const verificationData = JSON.parse(projectDetails.verification_data);
          console.log('\n📊 Verification data:');
          console.log(`   - Verified Tables: ${verificationData.verifiedTables?.length || 0}`);
          console.log(`   - Phantom Tables: ${verificationData.phantomTables?.length || 0}`);
          console.log(`   - Accuracy: ${verificationData.verificationStats?.accuracy || 'N/A'}`);
        } catch (error) {
          console.log('   - Error parsing verification data:', error.message);
        }
      }

      // Check if database introspection data exists
      if (projectDetails.database_introspection) {
        try {
          const introspectionData = JSON.parse(projectDetails.database_introspection);
          console.log('\n🔍 Database introspection data:');
          console.log(`   - Tables: ${introspectionData.tables?.length || 0}`);
          console.log(`   - Views: ${introspectionData.views?.length || 0}`);
          console.log(`   - Indexes: ${introspectionData.indexes?.length || 0}`);
          console.log(`   - Triggers: ${introspectionData.triggers?.length || 0}`);
        } catch (error) {
          console.log('   - Error parsing introspection data:', error.message);
        }
      }
    }

    db.close();
    console.log('\n✅ Database check completed!');

  } catch (error) {
    console.error('❌ Database check failed:', error);
  }
}

// Run the check
if (require.main === module) {
  checkProjects();
}

module.exports = { checkProjects };
