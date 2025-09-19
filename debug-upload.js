// Debug script to test upload functionality
const fs = require('fs');
const path = require('path');

async function testDatabaseDetection() {
  console.log('=== TESTING DATABASE DETECTION ===');
  
  // Test the findDatabaseFiles function logic
  const uploadDir = path.join(process.cwd(), 'uploads', 'project_1758194076515');
  console.log(`Checking directory: ${uploadDir}`);
  
  if (!fs.existsSync(uploadDir)) {
    console.log('Upload directory does not exist');
    return;
  }
  
  const dbExtensions = ['.db', '.sqlite', '.sqlite3', '.db3', '.s3db', '.sl3'];
  const dbFiles = [];
  
  try {
    const entries = fs.readdirSync(uploadDir, { withFileTypes: true });
    console.log(`Found ${entries.length} entries in directory`);
    
    for (const entry of entries) {
      const fullPath = path.join(uploadDir, entry.name);
      console.log(`Checking entry: ${entry.name} (isDirectory: ${entry.isDirectory()})`);
      
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        console.log(`File: ${entry.name}, Extension: ${ext}, Matches: ${dbExtensions.includes(ext)}`);
        if (dbExtensions.includes(ext)) {
          dbFiles.push(fullPath);
          console.log(`Added database file: ${fullPath}`);
        }
      }
    }
  } catch (error) {
    console.error('Error finding database files:', error);
  }
  
  console.log(`Found ${dbFiles.length} database files:`, dbFiles);
  
  // Test database file analysis
  for (const dbFile of dbFiles) {
    console.log(`\n=== TESTING DATABASE FILE: ${dbFile} ===`);
    
    try {
      // Test if it's a valid SQLite database
      const sqlite3 = require('sqlite3');
      const { open } = require('sqlite');
      
      const db = await open({
        filename: dbFile,
        driver: sqlite3.Database
      });
      
      console.log('Database opened successfully');
      
      // Get table names
      const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
      console.log(`Found ${tables.length} tables:`, tables.map(t => t.name));
      
      // Get table info for each table
      for (const table of tables) {
        const columns = await db.all(`PRAGMA table_info(${table.name})`);
        console.log(`Table ${table.name} has ${columns.length} columns:`, columns.map(c => c.name));
      }
      
      await db.close();
      console.log('Database closed successfully');
      
    } catch (error) {
      console.error(`Error analyzing database file ${dbFile}:`, error);
    }
  }
}

testDatabaseDetection().catch(console.error);
