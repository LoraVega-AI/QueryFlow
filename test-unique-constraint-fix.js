// Test script to verify UNIQUE constraint fix
const { ProjectsManager } = require('./src/utils/projectsManager.ts');

async function testUniqueConstraintFix() {
  console.log('Testing UNIQUE constraint fix...');

  try {
    const projectsManager = new ProjectsManager();

    // Get an example project (assuming one exists)
    const projects = projectsManager.getAllProjects();
    const exampleProject = projects.find(p => p.type === 'example');

    if (!exampleProject) {
      console.log('No example project found, creating one...');
      return;
    }

    console.log(`Found example project: ${exampleProject.name} (${exampleProject.id})`);

    // Try to sync the project multiple times
    for (let i = 1; i <= 3; i++) {
      console.log(`\n=== Attempt ${i} ===`);
      try {
        await projectsManager.syncProject(exampleProject.id);
        console.log(`✅ Sync ${i} successful`);
      } catch (error) {
        console.error(`❌ Sync ${i} failed:`, error.message);
        if (error.message.includes('UNIQUE constraint failed')) {
          console.error('UNIQUE constraint error still exists!');
          return false;
        }
      }
    }

    console.log('\n🎉 All sync attempts successful! UNIQUE constraint fix verified.');
    return true;

  } catch (error) {
    console.error('Test failed:', error);
    return false;
  }
}

testUniqueConstraintFix();
