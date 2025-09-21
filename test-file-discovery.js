// Test script to verify file discovery functionality
const fs = require('fs').promises;
const path = require('path');

async function findAllFiles(dir) {
  const allFiles = [];

  async function scanDirectory(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules and other common directories we don't want to scan
        if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== '__pycache__') {
          await scanDirectory(fullPath);
        }
      } else {
        allFiles.push(fullPath);
      }
    }
  }

  await scanDirectory(dir);
  return allFiles;
}

async function testFileDiscovery() {
  console.log('🧪 Testing File Discovery Functionality');

  const testDir = path.join(process.cwd(), 'test-zip-extraction', 'test-project');

  try {
    const allFiles = await findAllFiles(testDir);
    console.log(`📁 Found ${allFiles.length} files in ${testDir}:`);

    allFiles.forEach((file, index) => {
      console.log(`  ${index + 1}. ${path.basename(file)}`);
    });

    // Test that we can find database files
    const dbFiles = allFiles.filter(f => path.extname(f).toLowerCase() === '.db');
    console.log(`\n🗄️ Found ${dbFiles.length} database files:`);
    dbFiles.forEach(file => console.log(`  - ${path.basename(file)}`));

    // Test that we can find config files
    const configFiles = allFiles.filter(f =>
      ['.json', '.env', '.yaml', '.yml', '.toml'].includes(path.extname(f).toLowerCase())
    );
    console.log(`\n⚙️ Found ${configFiles.length} config files:`);
    configFiles.forEach(file => console.log(`  - ${path.basename(file)}`));

    // Test that we can find source code files
    const sourceFiles = allFiles.filter(f =>
      ['.js', '.ts', '.py', '.php', '.rb', '.java', '.cs', '.go'].includes(path.extname(f).toLowerCase())
    );
    console.log(`\n💻 Found ${sourceFiles.length} source code files:`);
    sourceFiles.forEach(file => console.log(`  - ${path.basename(file)}`));

    console.log('\n✅ File discovery test completed successfully!');

  } catch (error) {
    console.error('❌ Error during file discovery test:', error);
  }
}

testFileDiscovery();
