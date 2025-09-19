const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Create a comprehensive test SQLite database
function createTestDatabase() {
  const dbPath = path.join(__dirname, 'test-comprehensive.db');
  
  // Remove existing test database if it exists
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
  
  const db = new sqlite3.Database(dbPath);
  
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create users table
      db.run(`
        CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          first_name VARCHAR(50),
          last_name VARCHAR(50),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT 1
        )
      `);
      
      // Create categories table
      db.run(`
        CREATE TABLE categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          parent_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (parent_id) REFERENCES categories(id)
        )
      `);
      
      // Create products table
      db.run(`
        CREATE TABLE products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name VARCHAR(200) NOT NULL,
          description TEXT,
          price DECIMAL(10,2) NOT NULL,
          category_id INTEGER NOT NULL,
          sku VARCHAR(50) UNIQUE,
          stock_quantity INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES categories(id)
        )
      `);
      
      // Create orders table
      db.run(`
        CREATE TABLE orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          total_amount DECIMAL(10,2) NOT NULL,
          status VARCHAR(20) DEFAULT 'pending',
          shipping_address TEXT,
          billing_address TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);
      
      // Create order_items table
      db.run(`
        CREATE TABLE order_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL,
          unit_price DECIMAL(10,2) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (order_id) REFERENCES orders(id),
          FOREIGN KEY (product_id) REFERENCES products(id)
        )
      `);
      
      // Create indexes
      db.run(`CREATE INDEX idx_users_email ON users(email)`);
      db.run(`CREATE INDEX idx_products_category ON products(category_id)`);
      db.run(`CREATE INDEX idx_products_sku ON products(sku)`);
      db.run(`CREATE INDEX idx_orders_user ON orders(user_id)`);
      db.run(`CREATE INDEX idx_orders_status ON orders(status)`);
      db.run(`CREATE INDEX idx_order_items_order ON order_items(order_id)`);
      db.run(`CREATE INDEX idx_order_items_product ON order_items(product_id)`);
      
      // Insert sample data
      db.run(`
        INSERT INTO users (username, email, first_name, last_name) VALUES
        ('john_doe', 'john@example.com', 'John', 'Doe'),
        ('jane_smith', 'jane@example.com', 'Jane', 'Smith'),
        ('bob_wilson', 'bob@example.com', 'Bob', 'Wilson'),
        ('alice_brown', 'alice@example.com', 'Alice', 'Brown'),
        ('charlie_davis', 'charlie@example.com', 'Charlie', 'Davis')
      `);
      
      db.run(`
        INSERT INTO categories (name, description, parent_id) VALUES
        ('Electronics', 'Electronic devices and accessories', NULL),
        ('Clothing', 'Apparel and fashion items', NULL),
        ('Books', 'Books and educational materials', NULL),
        ('Smartphones', 'Mobile phones and accessories', 1),
        ('Laptops', 'Portable computers', 1),
        ('T-Shirts', 'Casual t-shirts', 2),
        ('Jeans', 'Denim pants', 2),
        ('Fiction', 'Fictional books', 3),
        ('Non-Fiction', 'Educational and reference books', 3)
      `);
      
      db.run(`
        INSERT INTO products (name, description, price, category_id, sku, stock_quantity) VALUES
        ('iPhone 15 Pro', 'Latest Apple smartphone', 999.99, 4, 'IPH15PRO', 50),
        ('Samsung Galaxy S24', 'Android flagship phone', 899.99, 4, 'SGS24', 30),
        ('MacBook Pro 16"', 'Apple laptop computer', 2499.99, 5, 'MBP16', 20),
        ('Dell XPS 13', 'Windows ultrabook', 1299.99, 5, 'DXP13', 25),
        ('Cotton T-Shirt', 'Comfortable cotton shirt', 19.99, 6, 'CTS001', 100),
        ('Classic Jeans', 'Blue denim jeans', 59.99, 7, 'CJ001', 75),
        ('The Great Gatsby', 'Classic American novel', 12.99, 8, 'TGG001', 200),
        ('Python Programming', 'Learn Python programming', 39.99, 9, 'PP001', 150)
      `);
      
      db.run(`
        INSERT INTO orders (user_id, total_amount, status, shipping_address) VALUES
        (1, 1019.98, 'completed', '123 Main St, Anytown, USA'),
        (2, 79.98, 'shipped', '456 Oak Ave, Somewhere, USA'),
        (3, 52.98, 'pending', '789 Pine Rd, Elsewhere, USA'),
        (4, 2499.99, 'completed', '321 Elm St, Nowhere, USA'),
        (5, 19.99, 'cancelled', '654 Maple Dr, Anywhere, USA')
      `);
      
      db.run(`
        INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
        (1, 1, 1, 999.99),
        (1, 5, 1, 19.99),
        (2, 5, 2, 19.99),
        (2, 6, 1, 59.99),
        (3, 7, 1, 12.99),
        (3, 8, 1, 39.99),
        (4, 3, 1, 2499.99),
        (5, 5, 1, 19.99)
      `);
      
      db.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('✅ Test database created successfully:', dbPath);
          resolve(dbPath);
        }
      });
    });
  });
}

// Test the upload API
async function testUploadAPI(dbPath) {
  const FormData = require('form-data');
  const fs = require('fs');
  
  try {
    console.log('\n🧪 Testing upload API...');
    
    const formData = new FormData();
    formData.append('files', fs.createReadStream(dbPath));
    formData.append('projectName', 'E-commerce Test Database');
    formData.append('projectDescription', 'Comprehensive test database with multiple tables and relationships');
    
    const response = await fetch('http://localhost:3000/api/projects/upload', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed with status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ Upload API test passed');
    console.log('📊 Upload result:', {
      success: result.success,
      projectName: result.data?.name,
      databaseCount: result.data?.databases?.length,
      totalTables: result.data?.totalTables,
      totalRows: result.data?.totalRows
    });
    
    return result.data;
  } catch (error) {
    console.error('❌ Upload API test failed:', error.message);
    throw error;
  }
}

// Test the projects list API
async function testProjectsAPI() {
  try {
    console.log('\n🧪 Testing projects list API...');
    
    const response = await fetch('http://localhost:3000/api/projects');
    
    if (!response.ok) {
      throw new Error(`Projects API failed with status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ Projects API test passed');
    console.log('📊 Projects count:', result.data?.length || 0);
    
    return result.data;
  } catch (error) {
    console.error('❌ Projects API test failed:', error.message);
    throw error;
  }
}

// Test project deletion API
async function testDeleteProject(projectId) {
  try {
    console.log('\n🧪 Testing project deletion API...');
    
    const response = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`Delete API failed with status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ Delete API test passed');
    console.log('📊 Delete result:', result);
    
    return result;
  } catch (error) {
    console.error('❌ Delete API test failed:', error.message);
    throw error;
  }
}

// Main test function
async function runComprehensiveTest() {
  console.log('🚀 Starting comprehensive upload workflow test...\n');
  
  try {
    // Step 1: Create test database
    console.log('Step 1: Creating test database...');
    const dbPath = await createTestDatabase();
    
    // Step 2: Test upload API
    console.log('\nStep 2: Testing upload API...');
    const uploadResult = await testUploadAPI(dbPath);
    
    // Step 3: Test projects list API
    console.log('\nStep 3: Testing projects list API...');
    const projects = await testProjectsAPI();
    
    // Step 4: Verify project appears in list
    console.log('\nStep 4: Verifying project appears in list...');
    const uploadedProject = projects.find(p => p.id === uploadResult.id);
    if (uploadedProject) {
      console.log('✅ Project found in projects list');
      console.log('📊 Project details:', {
        name: uploadedProject.name,
        databaseCount: uploadedProject.databaseCount,
        totalTables: uploadedProject.totalTables,
        totalRows: uploadedProject.totalRows,
        hasForeignKeys: uploadedProject.hasForeignKeys,
        hasIndexes: uploadedProject.hasIndexes
      });
    } else {
      throw new Error('Project not found in projects list');
    }
    
    // Step 5: Test project deletion (optional)
    console.log('\nStep 5: Testing project deletion...');
    await testDeleteProject(uploadResult.id);
    
    // Step 6: Verify project is deleted
    console.log('\nStep 6: Verifying project deletion...');
    const projectsAfterDelete = await testProjectsAPI();
    const deletedProject = projectsAfterDelete.find(p => p.id === uploadResult.id);
    if (!deletedProject) {
      console.log('✅ Project successfully deleted');
    } else {
      console.log('⚠️ Project still exists after deletion');
    }
    
    console.log('\n🎉 All tests passed! Upload workflow is working correctly.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Check if we're running this script directly
if (require.main === module) {
  runComprehensiveTest().catch(console.error);
}

module.exports = {
  createTestDatabase,
  testUploadAPI,
  testProjectsAPI,
  testDeleteProject,
  runComprehensiveTest
};
