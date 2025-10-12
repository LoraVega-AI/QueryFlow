const { Sequelize } = require('sequelize');
const path = require('path');

// Connect to the generated database
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'comprehensive_test.db'),
  logging: false
});

async function verifyDatabase() {
  try {
    console.log('🔍 Verifying database structure...\n');

    // Get table information
    const [tables] = await sequelize.query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);

    console.log('📋 Tables found:');
    tables.forEach(table => console.log(`   - ${table.name}`));

    // Get column count for each table
    console.log('\n📊 Table statistics:');
    for (const table of tables) {
      const [columns] = await sequelize.query(`PRAGMA table_info(${table.name})`);
      const [rowCount] = await sequelize.query(`SELECT COUNT(*) as count FROM ${table.name}`);
      console.log(`   - ${table.name}: ${columns.length} columns, ${rowCount[0].count} rows`);
    }

    // Get foreign key information
    console.log('\n🔗 Foreign keys:');
    for (const table of tables) {
      try {
        const [foreignKeys] = await sequelize.query(`PRAGMA foreign_key_list(${table.name})`);
        if (foreignKeys && foreignKeys.length > 0) {
          console.log(`   - ${table.name}:`);
          foreignKeys.forEach(fk => {
            console.log(`     * ${fk.from} -> ${fk.table}.${fk.to}`);
          });
        }
      } catch (error) {
        console.log(`   - ${table.name}: No foreign keys or error querying`);
      }
    }

    // Get index information
    console.log('\n📇 Indexes:');
    for (const table of tables) {
      const [indexes] = await sequelize.query(`PRAGMA index_list(${table.name})`);
      if (indexes.length > 0) {
        console.log(`   - ${table.name}:`);
        indexes.forEach(idx => {
          console.log(`     * ${idx.name} (unique: ${idx.unique ? 'yes' : 'no'})`);
        });
      }
    }

    // Verify specific requirements
    console.log('\n✅ Requirements verification:');
    
    // Count total columns across all tables
    let totalColumns = 0;
    for (const table of tables) {
      const [columns] = await sequelize.query(`PRAGMA table_info(${table.name})`);
      totalColumns += columns.length;
    }
    console.log(`   - Total columns: ${totalColumns} (target: 25)`);

    // Count foreign keys
    let totalForeignKeys = 0;
    for (const table of tables) {
      try {
        const [foreignKeys] = await sequelize.query(`PRAGMA foreign_key_list(${table.name})`);
        if (foreignKeys) {
          totalForeignKeys += foreignKeys.length;
        }
      } catch (error) {
        // Skip tables with foreign key query errors
      }
    }
    console.log(`   - Total foreign keys: ${totalForeignKeys} (target: 6)`);

    // Count indexes
    let totalIndexes = 0;
    for (const table of tables) {
      const [indexes] = await sequelize.query(`PRAGMA index_list(${table.name})`);
      totalIndexes += indexes.length;
    }
    console.log(`   - Total indexes: ${totalIndexes} (target: 8)`);

    // Count unique constraints
    let totalUniqueConstraints = 0;
    for (const table of tables) {
      const [indexes] = await sequelize.query(`PRAGMA index_list(${table.name})`);
      totalUniqueConstraints += indexes.filter(idx => idx.unique).length;
    }
    console.log(`   - Total unique constraints: ${totalUniqueConstraints} (target: 4)`);

    // Count total rows
    let totalRows = 0;
    for (const table of tables) {
      const [rowCount] = await sequelize.query(`SELECT COUNT(*) as count FROM ${table.name}`);
      totalRows += rowCount[0].count;
    }
    console.log(`   - Total rows: ${totalRows} (target: 50+)`);

    console.log('\n🎯 Model relationships:');
    console.log('   - User -> Order (1:many)');
    console.log('   - Category -> Product (1:many)');
    console.log('   - Product -> Order (many:many via OrderItem)');
    console.log('   - User -> Review (1:many)');
    console.log('   - Product -> Review (1:many)');
    console.log('   - User -> Product (many:many via Wishlist)');

    console.log('\n✅ Database verification complete!');

  } catch (error) {
    console.error('❌ Error verifying database:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the verification
if (require.main === module) {
  verifyDatabase();
}

module.exports = { verifyDatabase };
