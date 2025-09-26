// Test script for enhanced SQLite index extraction
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

// Create a test database with various index types
async function createTestDatabase() {
  console.log('🔧 Creating test database with various index types...');
  
  const dbPath = path.join(__dirname, 'test-indexes.db');
  
  // Delete existing database if it exists
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }
      
      console.log('✅ Database created');
      
      // Run in sequence
      db.serialize(() => {
        // Create tables
        db.run(`
          CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            first_name TEXT,
            last_name TEXT,
            is_active BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) console.error('Error creating users table:', err);
          else console.log('✅ Created users table');
        });
        
        db.run(`
          CREATE TABLE posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT,
            user_id INTEGER NOT NULL,
            status TEXT DEFAULT 'draft',
            published_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) console.error('Error creating posts table:', err);
          else console.log('✅ Created posts table');
        });
        
        db.run(`
          CREATE TABLE comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            is_approved BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) console.error('Error creating comments table:', err);
          else console.log('✅ Created comments table');
        });
        
        // Create various types of indexes
        
        // 1. Simple index
        db.run(`
          CREATE INDEX idx_posts_title ON posts(title)
        `, (err) => {
          if (err) console.error('Error creating simple index:', err);
          else console.log('✅ Created simple index on posts.title');
        });
        
        // 2. Unique index
        db.run(`
          CREATE UNIQUE INDEX idx_users_email ON users(email)
        `, (err) => {
          if (err) console.error('Error creating unique index:', err);
          else console.log('✅ Created unique index on users.email');
        });
        
        // 3. Composite index
        db.run(`
          CREATE INDEX idx_comments_post_user ON comments(post_id, user_id)
        `, (err) => {
          if (err) console.error('Error creating composite index:', err);
          else console.log('✅ Created composite index on comments.post_id, comments.user_id');
        });
        
        // 4. Partial index
        db.run(`
          CREATE INDEX idx_posts_published ON posts(published_at) WHERE status = 'published'
        `, (err) => {
          if (err) console.error('Error creating partial index:', err);
          else console.log('✅ Created partial index on posts.published_at WHERE status = published');
        });
        
        // 5. Descending index
        db.run(`
          CREATE INDEX idx_posts_created_desc ON posts(created_at DESC)
        `, (err) => {
          if (err) console.error('Error creating descending index:', err);
          else console.log('✅ Created descending index on posts.created_at DESC');
        });
        
        // 6. Composite unique index
        db.run(`
          CREATE UNIQUE INDEX idx_comments_unique_user_post ON comments(user_id, post_id)
        `, (err) => {
          if (err) console.error('Error creating composite unique index:', err);
          else console.log('✅ Created composite unique index on comments.user_id, comments.post_id');
        });
        
        // 7. Expression index
        db.run(`
          CREATE INDEX idx_users_name ON users(first_name || ' ' || last_name)
        `, (err) => {
          if (err) console.error('Error creating expression index:', err);
          else console.log('✅ Created expression index on users.first_name || " " || users.last_name');
        });
        
        // Finalize
        db.run('PRAGMA foreign_keys = ON', (err) => {
          if (err) console.error('Error enabling foreign keys:', err);
          else console.log('✅ Enabled foreign keys');
          
          // Close the database
          db.close((err) => {
            if (err) {
              reject(err);
            } else {
              console.log('✅ Database closed');
              resolve(dbPath);
            }
          });
        });
      });
    });
  });
}

// Extract indexes from the database
async function extractIndexes(dbPath) {
  console.log(`\n🔍 Extracting indexes from database: ${dbPath}`);
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        reject(err);
        return;
      }
      
      console.log('✅ Database opened');
      
      // Get all indexes
      db.all(`
        SELECT name, tbl_name, sql, type
        FROM sqlite_master
        WHERE type='index'
        ORDER BY tbl_name, name
      `, (err, indexes) => {
        if (err) {
          db.close();
          reject(err);
          return;
        }
        
        console.log(`📊 Found ${indexes.length} indexes`);
        
        // Process each index
        const processedIndexes = [];
        let processed = 0;
        
        if (indexes.length === 0) {
          db.close();
          resolve(processedIndexes);
          return;
        }
        
        indexes.forEach((index) => {
          console.log(`\n📋 Processing index: ${index.name} on table ${index.tbl_name}`);
          console.log(`📋 SQL: ${index.sql}`);
          
          // Get index info
          db.all(`PRAGMA index_info(${index.name})`, (err, indexInfo) => {
            if (err) {
              console.error(`Error getting index info for ${index.name}:`, err);
              processed++;
              
              if (processed === indexes.length) {
                db.close();
                resolve(processedIndexes);
              }
              
              return;
            }
            
            console.log(`📊 Index ${index.name} has ${indexInfo.length} columns`);
            
            // Determine if this is a composite index
            const isComposite = indexInfo.length > 1;
            
            // Determine if this is a unique index
            const isUnique = index.sql && index.sql.toUpperCase().includes('UNIQUE');
            
            // Determine if this is a partial index
            const isPartial = index.sql && index.sql.toUpperCase().includes('WHERE');
            
            // Extract WHERE clause if this is a partial index
            let whereClause = null;
            if (isPartial) {
              const whereMatch = index.sql.match(/WHERE\s+(.*?)$/i);
              if (whereMatch) {
                whereClause = whereMatch[1];
              }
            }
            
            // Determine index type
            let indexType = 'btree'; // SQLite default
            
            // Determine index origin
            let origin = 'index'; // Default
            if (index.name.startsWith('sqlite_autoindex_')) {
              origin = 'pk'; // Primary key
            } else if (isUnique) {
              origin = 'u'; // Unique constraint
            }
            
            // Get column details
            const columnDetails = indexInfo.map((col) => {
              return {
                name: col.name,
                position: col.seqno,
                collation: 'BINARY', // SQLite default
                direction: 'ASC' // SQLite default
              };
            });
            
            // Get table columns to add more details
            db.all(`PRAGMA table_info(${index.tbl_name})`, (err, tableInfo) => {
              if (err) {
                console.error(`Error getting table info for ${index.tbl_name}:`, err);
              } else {
                // Enhance column details with table column info
                columnDetails.forEach((col) => {
                  const tableCol = tableInfo.find((tc) => tc.name === col.name);
                  if (tableCol) {
                    col.type = tableCol.type;
                    col.nullable = tableCol.notnull === 0;
                    col.primaryKey = tableCol.pk === 1;
                  }
                });
              }
              
              // Create processed index object
              const processedIndex = {
                id: `idx_${index.name}`,
                name: index.name,
                tableName: index.tbl_name,
                columns: indexInfo.map((col) => col.name),
                columnDetails,
                unique: isUnique,
                type: indexType,
                origin,
                composite: isComposite,
                partial: isPartial,
                whereClause,
                expression: index.sql,
                createdAt: new Date()
              };
              
              processedIndexes.push(processedIndex);
              processed++;
              
              console.log(`✅ Processed index: ${index.name}`);
              
              if (processed === indexes.length) {
                // Also check for implicit primary key indexes
                db.all(`
                  SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
                `, (err, tables) => {
                  if (err) {
                    console.error('Error getting tables:', err);
                    db.close();
                    resolve(processedIndexes);
                    return;
                  }
                  
                  // Process each table to find primary keys that might not have explicit indexes
                  let tablesProcessed = 0;
                  
                  if (tables.length === 0) {
                    db.close();
                    resolve(processedIndexes);
                    return;
                  }
                  
                  tables.forEach((table) => {
                    db.all(`PRAGMA table_info(${table.name})`, (err, tableInfo) => {
                      if (err) {
                        console.error(`Error getting table info for ${table.name}:`, err);
                        tablesProcessed++;
                        
                        if (tablesProcessed === tables.length) {
                          db.close();
                          resolve(processedIndexes);
                        }
                        
                        return;
                      }
                      
                      // Find primary key columns
                      const pkColumns = tableInfo.filter((col) => col.pk > 0);
                      
                      if (pkColumns.length > 0) {
                        // Check if we already have an index for this primary key
                        const pkColumnNames = pkColumns.map((col) => col.name);
                        const pkIndexName = `sqlite_autoindex_${table.name}_1`;
                        
                        // Check if we already have this index
                        const existingIndex = processedIndexes.find((idx) => idx.name === pkIndexName);
                        
                        if (!existingIndex) {
                          console.log(`📋 Adding implicit primary key index for ${table.name}`);
                          
                          // Create implicit primary key index
                          const implicitIndex = {
                            id: `idx_${pkIndexName}`,
                            name: pkIndexName,
                            tableName: table.name,
                            columns: pkColumnNames,
                            columnDetails: pkColumns.map((col) => ({
                              name: col.name,
                              position: col.pk,
                              type: col.type,
                              nullable: col.notnull === 0,
                              primaryKey: true,
                              collation: 'BINARY',
                              direction: 'ASC'
                            })),
                            unique: true,
                            type: 'btree',
                            origin: 'pk',
                            composite: pkColumns.length > 1,
                            partial: false,
                            whereClause: null,
                            expression: `PRIMARY KEY (${pkColumnNames.join(', ')})`,
                            implicit: true,
                            createdAt: new Date()
                          };
                          
                          processedIndexes.push(implicitIndex);
                        }
                      }
                      
                      tablesProcessed++;
                      
                      if (tablesProcessed === tables.length) {
                        db.close();
                        resolve(processedIndexes);
                      }
                    });
                  });
                });
              }
            });
          });
        });
      });
    });
  });
}

// Analyze index SQL for additional metadata
function analyzeIndexSQL(sql) {
  if (!sql) return {};
  
  const result = {
    covering: false,
    clustered: false,
    method: 'btree', // SQLite default
    condition: null
  };
  
  // Check for WHERE clause (partial index)
  const whereMatch = sql.match(/WHERE\s+(.*?)$/i);
  if (whereMatch) {
    result.condition = whereMatch[1];
  }
  
  return result;
}

// Test function for enhanced SQLite index extraction
async function testEnhancedSQLiteIndexExtraction() {
  console.log('🧪 Starting enhanced SQLite index extraction test...');
  
  try {
    // Create test database
    const dbPath = await createTestDatabase();
    
    // Extract indexes
    const indexes = await extractIndexes(dbPath);
    
    // Print results
    console.log('\n📊 Extracted indexes:');
    indexes.forEach((index, i) => {
      console.log(`\n📋 Index ${i + 1}: ${index.name}`);
      console.log(`📊 Table: ${index.tableName}`);
      console.log(`📊 Columns: ${index.columns.join(', ')}`);
      console.log(`📊 Unique: ${index.unique}`);
      console.log(`📊 Type: ${index.type}`);
      console.log(`📊 Origin: ${index.origin}`);
      console.log(`📊 Composite: ${index.composite}`);
      console.log(`📊 Partial: ${index.partial}`);
      
      if (index.whereClause) {
        console.log(`📊 Where clause: ${index.whereClause}`);
      }
      
      if (index.implicit) {
        console.log(`📊 Implicit: ${index.implicit}`);
      }
      
      // Print column details
      if (index.columnDetails && index.columnDetails.length > 0) {
        console.log('\n📋 Column details:');
        index.columnDetails.forEach((col) => {
          console.log(`  - ${col.name}: pos=${col.position}${col.type ? ', type=' + col.type : ''}${col.primaryKey ? ', PK' : ''}${col.nullable ? ', nullable' : ''}`);
        });
      }
    });
    
    console.log('\n✅ Enhanced SQLite index extraction test completed');
    
    // Clean up
    fs.unlinkSync(dbPath);
    console.log('✅ Test database deleted');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

testEnhancedSQLiteIndexExtraction().catch(console.error);
