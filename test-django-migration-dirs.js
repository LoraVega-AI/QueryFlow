// Test script for Django migration directory detection
const path = require('path');
const fs = require('fs');

// Mock implementation of the migration directory detection logic
async function findDjangoMigrationDirectories(projectPath) {
  console.log(`🔍 Searching for Django migration directories in: ${projectPath}`);
  
  // Common Django app directories
  const possibleAppDirs = [
    '', // Project root
    'app',
    'apps',
    'src',
    'core',
    'api',
    'users',
    'accounts',
    'blog',
    'posts',
    'products',
    'analytics'
  ];
  
  const migrationDirs = [];
  
  // Check each possible app directory for a migrations subdirectory
  for (const appDir of possibleAppDirs) {
    const appPath = path.join(projectPath, appDir);
    
    // Skip if the app directory doesn't exist
    if (!fs.existsSync(appPath)) {
      continue;
    }
    
    // Check if it's a directory
    const appStats = fs.statSync(appPath);
    if (!appStats.isDirectory()) {
      continue;
    }
    
    console.log(`📁 Checking app directory: ${appPath}`);
    
    // Look for a migrations subdirectory
    const migrationsPath = path.join(appPath, 'migrations');
    if (fs.existsSync(migrationsPath)) {
      const migrationsStats = fs.statSync(migrationsPath);
      if (migrationsStats.isDirectory()) {
        console.log(`✅ Found migrations directory: ${migrationsPath}`);
        
        // Check if it contains migration files
        const files = fs.readdirSync(migrationsPath);
        const migrationFiles = files.filter(file => file.match(/^\d{4}_.*\.py$/));
        
        if (migrationFiles.length > 0) {
          console.log(`📊 Found ${migrationFiles.length} migration files`);
          migrationDirs.push({
            path: migrationsPath,
            files: migrationFiles
          });
        } else {
          console.log('❌ No migration files found in directory');
        }
      }
    }
    
    // If the app directory has subdirectories, check each one for a migrations subdirectory
    try {
      const subDirs = fs.readdirSync(appPath);
      
      for (const subDir of subDirs) {
        const subDirPath = path.join(appPath, subDir);
        
        // Skip if not a directory
        try {
          const subDirStats = fs.statSync(subDirPath);
          if (!subDirStats.isDirectory()) {
            continue;
          }
        } catch (error) {
          continue;
        }
        
        console.log(`📁 Checking subdirectory: ${subDirPath}`);
        
        // Look for a migrations subdirectory
        const subMigrationsPath = path.join(subDirPath, 'migrations');
        if (fs.existsSync(subMigrationsPath)) {
          const subMigrationsStats = fs.statSync(subMigrationsPath);
          if (subMigrationsStats.isDirectory()) {
            console.log(`✅ Found migrations directory: ${subMigrationsPath}`);
            
            // Check if it contains migration files
            const files = fs.readdirSync(subMigrationsPath);
            const migrationFiles = files.filter(file => file.match(/^\d{4}_.*\.py$/));
            
            if (migrationFiles.length > 0) {
              console.log(`📊 Found ${migrationFiles.length} migration files`);
              migrationDirs.push({
                path: subMigrationsPath,
                files: migrationFiles
              });
            } else {
              console.log('❌ No migration files found in directory');
            }
          }
        }
      }
    } catch (error) {
      // Skip if we can't read the directory
    }
  }
  
  return migrationDirs;
}

// Test function for Django migration directory detection
async function testDjangoMigrationDirectoryDetection() {
  console.log('🧪 Starting Django migration directory detection test...');
  
  // Test project path
  const testProjectPath = path.join(__dirname, 'test-projects', 'django-app');
  
  // Check if the project exists
  if (!fs.existsSync(testProjectPath)) {
    console.log('❌ Test project not found');
    return;
  }
  
  console.log('✅ Test project found');
  
  // Find Django migration directories
  const migrationDirs = await findDjangoMigrationDirectories(testProjectPath);
  
  console.log(`\n📊 Found ${migrationDirs.length} migration directories`);
  
  // Print details for each migration directory
  migrationDirs.forEach((dir, index) => {
    console.log(`\n📋 Migration directory ${index + 1}: ${dir.path}`);
    console.log(`📊 Migration files: ${dir.files.join(', ')}`);
  });
  
  console.log('\n✅ Django migration directory detection test completed');
}

testDjangoMigrationDirectoryDetection().catch(console.error);
