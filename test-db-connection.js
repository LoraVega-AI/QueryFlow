// Test script for database connections
// Run with: node test-db-connection.js

const mysql = require('mysql2/promise');
const { Pool } = require('pg');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function testMySQLConnection() {
  console.log('🧪 Testing MySQL connection...');
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'password',
      database: 'test',
      connectTimeout: 5000,
    });

    const [rows] = await connection.execute('SELECT 1 as test, "MySQL Connected!" as message');
    console.log('✅ MySQL connection successful:', rows[0]);

    await connection.end();
  } catch (error) {
    console.log('❌ MySQL connection failed:', error.message);
  }
}

async function testPostgreSQLConnection() {
  console.log('🧪 Testing PostgreSQL connection...');
  try {
    const pool = new Pool({
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: 'password',
      database: 'postgres',
      connectionTimeoutMillis: 5000,
    });

    const client = await pool.connect();
    const result = await client.query('SELECT 1 as test, \'PostgreSQL Connected!\' as message');
    console.log('✅ PostgreSQL connection successful:', result.rows[0]);

    client.release();
    await pool.end();
  } catch (error) {
    console.log('❌ PostgreSQL connection failed:', error.message);
  }
}

async function testSQLiteConnection() {
  console.log('🧪 Testing SQLite connection...');
  try {
    const db = await open({
      filename: ':memory:',
      driver: sqlite3.Database
    });

    const result = await db.get('SELECT 1 as test, \'SQLite Connected!\' as message');
    console.log('✅ SQLite connection successful:', result);

    await db.close();
  } catch (error) {
    console.log('❌ SQLite connection failed:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting database connection tests...\n');

  await testMySQLConnection();
  console.log('');

  await testPostgreSQLConnection();
  console.log('');

  await testSQLiteConnection();
  console.log('');

  console.log('🎉 Database connection tests completed!');
  console.log('\n💡 Note: These tests use default local configurations.');
  console.log('   Modify the connection details in this file to test your specific databases.');
}

runTests().catch(console.error);
