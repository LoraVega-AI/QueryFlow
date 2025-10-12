#!/usr/bin/env node

/**
 * Insert Test Projects Script
 * Directly inserts test projects into the QueryFlow database
 */

const fs = require('fs').promises;
const path = require('path');
const Database = require('better-sqlite3');

// Test project data
const testProjects = [
  {
    id: 'test_ecommerce_django_001',
    name: 'E-Commerce Platform (Django + PostgreSQL)',
    description: 'Full-stack e-commerce platform with Django and PostgreSQL',
    technology: 'django',
    framework: 'Django',
    database: 'postgresql',
    icon: '🛒',
    color: 'green',
    totalTables: 8,
    totalRows: 16055,
    totalColumns: 48
  },
  {
    id: 'test_blog_laravel_002',
    name: 'Blog Platform (Laravel + MySQL)',
    description: 'Modern blog platform with Laravel and MySQL',
    technology: 'laravel',
    framework: 'Laravel',
    database: 'mysql',
    icon: '📝',
    color: 'red',
    totalTables: 8,
    totalRows: 9335,
    totalColumns: 32
  },
  {
    id: 'test_saas_express_003',
    name: 'SaaS Dashboard (Express.js + SQLite)',
    description: 'Multi-tenant SaaS application with Express.js and SQLite',
    technology: 'express',
    framework: 'Express.js',
    database: 'sqlite',
    icon: '📊',
    color: 'blue',
    totalTables: 8,
    totalRows: 18795,
    totalColumns: 40
  },
  {
    id: 'test_cms_nextjs_004',
    name: 'CMS Platform (Next.js + PostgreSQL)',
    description: 'Headless CMS built with Next.js and PostgreSQL',
    technology: 'nextjs',
    framework: 'Next.js',
    database: 'postgresql',
    icon: '📰',
    color: 'purple',
    totalTables: 8,
    totalRows: 10560,
    totalColumns: 24
  },
  {
    id: 'test_inventory_rails_005',
    name: 'Inventory System (Ruby on Rails + MySQL)',
    description: 'Enterprise inventory management with Ruby on Rails and MySQL',
    technology: 'rails',
    framework: 'Ruby on Rails',
    database: 'mysql',
    icon: '📦',
    color: 'red',
    totalTables: 8,
    totalRows: 47462,
    totalColumns: 40
  },
  {
    id: 'test_social_react_006',
    name: 'Social Network (React + SQLite)',
    description: 'Social media platform with React and SQLite',
    technology: 'react',
    framework: 'React',
    database: 'sqlite',
    icon: '👥',
    color: 'blue',
    totalTables: 8,
    totalRows: 212500,
    totalColumns: 24
  },
  {
    id: 'test_finance_spring_007',
    name: 'Finance App (Spring Boot + PostgreSQL)',
    description: 'Personal finance management with Spring Boot and PostgreSQL',
    technology: 'spring',
    framework: 'Spring Boot',
    database: 'postgresql',
    icon: '💰',
    color: 'green',
    totalTables: 8,
    totalRows: 55400,
    totalColumns: 32
  },
  {
    id: 'test_iot_nodejs_008',
    name: 'IoT Dashboard (Node.js + SQLite)',
    description: 'IoT device monitoring with Node.js and SQLite',
    technology: 'nodejs',
    framework: 'Node.js',
    database: 'sqlite',
    icon: '🌐',
    color: 'orange',
    totalTables: 8,
    totalRows: 106255,
    totalColumns: 40
  }
];

async function insertTestProjects() {
  try {
    console.log('🚀 Inserting test projects into QueryFlow database...\n');
    
    // Open the database
    const dbPath = path.join(__dirname, 'queryflow_app.db');
    const db = new Database(dbPath);
    
    console.log('📊 Database opened successfully');
    
    // Check if projects table exists
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='projects'").all();
    if (tables.length === 0) {
      console.log('❌ Projects table not found. Please run the application first to create the database schema.');
      db.close();
      return;
    }
    
    // Clear existing test projects
    const deleteStmt = db.prepare("DELETE FROM projects WHERE id LIKE 'test_%'");
    const deleteResult = deleteStmt.run();
    console.log(`🗑️  Cleared ${deleteResult.changes} existing test projects`);
    
    // Insert test projects
    const insertStmt = db.prepare(`
      INSERT INTO projects (
        id, name, description, technology, status, last_synced, database_count,
        total_tables, total_rows, total_columns, has_foreign_keys, has_indexes,
        icon, color, is_example, schema_data, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const now = new Date().toISOString();
    let insertedCount = 0;
    
    for (const project of testProjects) {
      try {
        const schemaData = JSON.stringify({
          tables: Array.from({ length: project.totalTables }, (_, i) => ({
            id: `table_${i + 1}`,
            name: `table_${i + 1}`,
            columns: Array.from({ length: project.totalColumns / project.totalTables }, (_, j) => ({
              id: `col_${j + 1}`,
              name: `column_${j + 1}`,
              type: 'TEXT'
            }))
          }))
        });
        
        insertStmt.run(
          project.id,
          project.name,
          project.description,
          project.technology,
          'disconnected',
          null,
          1, // database_count
          project.totalTables,
          project.totalRows,
          project.totalColumns,
          1, // has_foreign_keys
          1, // has_indexes
          project.icon,
          project.color,
          0, // is_example
          schemaData,
          now,
          now
        );
        
        insertedCount++;
        console.log(`✅ Inserted: ${project.name} (${project.totalTables} tables, ${project.totalRows.toLocaleString()} rows)`);
        
      } catch (error) {
        console.error(`❌ Failed to insert ${project.name}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Successfully inserted ${insertedCount} test projects!`);
    
    // Verify insertion
    const verifyStmt = db.prepare("SELECT id, name, total_tables, total_rows FROM projects WHERE id LIKE 'test_%' ORDER BY created_at DESC");
    const insertedProjects = verifyStmt.all();
    
    console.log('\n📋 Inserted projects:');
    insertedProjects.forEach(project => {
      console.log(`   ${project.name}: ${project.total_tables} tables, ${parseInt(project.total_rows).toLocaleString()} rows`);
    });
    
    db.close();
    console.log('\n💡 Refresh the QueryFlow Projects tab to see your test projects!');
    
  } catch (error) {
    console.error('❌ Error inserting test projects:', error.message);
  }
}

insertTestProjects().catch(console.error);
