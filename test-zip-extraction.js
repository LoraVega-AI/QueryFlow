// Test script to verify zip extraction functionality
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

async function testZipExtraction() {
  console.log('🧪 Testing Zip Extraction Functionality');

  // Create test directory
  const testDir = path.join(process.cwd(), 'test-zip-extraction');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  // Create a test zip file
  const zipPath = path.join(testDir, 'test-project.zip');
  const zip = new AdmZip();

  // Add some test files to the zip
  zip.addLocalFile(path.join(process.cwd(), 'test-zip-contents', 'package.json'));
  zip.addLocalFile(path.join(process.cwd(), 'test-zip-contents', 'index.js'));
  zip.addLocalFile(path.join(process.cwd(), 'test-zip-contents', 'README.md'));
  zip.addLocalFile(path.join(process.cwd(), 'test-zip-contents', 'database.json'));

  // Create a simple test database file
  const dbBuffer = Buffer.from(`
-- Test SQLite database
CREATE TABLE test_table (
  id INTEGER PRIMARY KEY,
  name TEXT,
  value TEXT
);

INSERT INTO test_table (name, value) VALUES ('test1', 'value1');
INSERT INTO test_table (name, value) VALUES ('test2', 'value2');
  `.trim());

  zip.addFile('test.db', dbBuffer);

  // Write the zip file
  zip.writeZip(zipPath);
  console.log(`✅ Created test zip file: ${zipPath}`);

  // Test the extraction function
  console.log('📦 Testing extraction...');

  try {
    const zipFileName = path.basename(zipPath, '.zip');
    const extractionSubdir = path.join(testDir, zipFileName);

    console.log(`📂 Extracting to: ${extractionSubdir}`);

    // Create extraction subdirectory
    if (!fs.existsSync(extractionSubdir)) {
      fs.mkdirSync(extractionSubdir, { recursive: true });
    }

    // Extract all files to subdirectory
    zip.extractAllTo(extractionSubdir, true);

    console.log(`✅ Successfully extracted zip to: ${extractionSubdir}`);

    // List extracted files
    const extractedFiles = fs.readdirSync(extractionSubdir);
    console.log(`📁 Extracted files:`, extractedFiles);

    // Verify database file exists
    const dbFile = path.join(extractionSubdir, 'test.db');
    if (fs.existsSync(dbFile)) {
      console.log(`✅ Database file created: ${dbFile}`);
      console.log(`📊 Database file size: ${fs.statSync(dbFile).size} bytes`);
    } else {
      console.log('❌ Database file not found');
    }

    console.log('🎉 Zip extraction test completed successfully!');

  } catch (error) {
    console.error('❌ Error during zip extraction test:', error);
  }
}

testZipExtraction();
