# QueryFlow Database Upload Workflow Test Guide

This guide provides comprehensive testing instructions for the QueryFlow database upload and integration system.

## 🎯 Test Overview

The upload workflow test verifies that:
- Database files can be uploaded successfully
- Projects appear immediately in the Projects tab
- Database schemas are extracted and displayed correctly
- Real-time updates work without manual refreshes
- Projects persist across application restarts
- Schema Designer shows real database structures
- Data can be queried and edited from uploaded databases

## 🚀 Quick Start

### 1. Start the Development Server
```bash
npm run dev
```

### 2. Create Test Database (Optional)
```bash
node manual-test.js
```
This creates a `manual-test.db` file with sample data for testing.

### 3. Run Automated Tests
```bash
node test-workflow-runner.js
```
This runs a comprehensive automated test suite.

## 📋 Manual Testing Steps

### Step 1: Upload Database
1. Open QueryFlow in your browser (http://localhost:3000)
2. Navigate to the **Projects** tab
3. Click the **"Upload Database"** button or the upload icon
4. Select a SQLite database file (`.db`, `.sqlite`, `.sqlite3`, etc.)
5. Wait for the upload to complete

### Step 2: Verify Project Creation
1. Check that the project appears immediately in the Projects list
2. Verify the project shows:
   - Project name (derived from filename)
   - Database count
   - Total tables and rows
   - Foreign key and index indicators
   - Upload timestamp

### Step 3: Test Schema Designer
1. Click on the uploaded project
2. Navigate to the **Schema Designer** tab
3. Verify that:
   - Tables are displayed with correct structure
   - Column types are shown accurately
   - Foreign key relationships are visible
   - Indexes are indicated
   - Table row counts are displayed

### Step 4: Test Query Runner
1. Navigate to the **Query Runner** tab
2. Try running queries against the uploaded database:
   ```sql
   SELECT * FROM users LIMIT 5;
   SELECT COUNT(*) FROM posts;
   SELECT u.name, p.title FROM users u JOIN posts p ON u.id = p.user_id;
   ```

### Step 5: Test Data Editor
1. Navigate to the **Data Editor** tab
2. Select a table from the uploaded database
3. Verify that:
   - Data is displayed correctly
   - You can edit cell values
   - Changes are saved to the database
   - Foreign key constraints are respected

### Step 6: Test Persistence
1. Close the browser tab
2. Restart the development server
3. Open QueryFlow again
4. Verify that the uploaded project still appears in the Projects list
5. Confirm that the database connection still works

## 🧪 Automated Test Suite

The automated test suite (`test-upload-workflow.js`) performs the following tests:

### Test 1: Database Creation
- Creates a comprehensive test database with multiple tables
- Includes foreign key relationships and indexes
- Populates with sample data

### Test 2: Upload API
- Tests the `/api/projects/upload` endpoint
- Verifies file upload and processing
- Checks schema extraction and analysis

### Test 3: Projects List API
- Tests the `/api/projects` endpoint
- Verifies project storage in the database
- Checks metadata accuracy

### Test 4: Project Deletion
- Tests the `/api/projects/[id]` DELETE endpoint
- Verifies project removal from database
- Checks cleanup of associated files

### Test 5: Real-time Updates
- Verifies that projects appear immediately after upload
- Tests auto-refresh functionality
- Checks UI state management

## 📊 Test Database Schema

The test database includes:

### Tables
- **users**: User information with constraints
- **categories**: Hierarchical category structure
- **products**: Product catalog with foreign keys
- **orders**: Order management
- **order_items**: Order line items

### Relationships
- `categories.parent_id` → `categories.id` (self-reference)
- `products.category_id` → `categories.id`
- `orders.user_id` → `users.id`
- `order_items.order_id` → `orders.id`
- `order_items.product_id` → `products.id`

### Indexes
- Email uniqueness on users
- Category lookups on products
- Order lookups by user and status
- Order item lookups by order and product

## 🔍 Troubleshooting

### Common Issues

#### Upload Fails
- Check file format (must be SQLite)
- Verify file permissions
- Check server logs for errors
- Ensure database is not corrupted

#### Project Not Appearing
- Check browser console for errors
- Verify API response
- Check database connection
- Try refreshing the page

#### Schema Not Loading
- Verify database file is valid SQLite
- Check schema extraction logs
- Ensure tables exist in database
- Verify foreign key constraints

#### Data Not Queryable
- Check database connection status
- Verify table names and column names
- Check for SQL syntax errors
- Ensure proper permissions

### Debug Commands

```bash
# Check database file
sqlite3 manual-test.db ".tables"
sqlite3 manual-test.db ".schema"

# Check QueryFlow database
sqlite3 queryflow_app.db "SELECT * FROM projects;"
sqlite3 queryflow_app.db "SELECT * FROM databases;"

# View server logs
npm run dev 2>&1 | grep -i error
```

## 📈 Performance Testing

### Large Database Testing
1. Create a database with 10,000+ records
2. Test upload performance
3. Verify schema extraction speed
4. Check query execution time
5. Test UI responsiveness

### Multiple Database Testing
1. Upload multiple database files
2. Test project switching
3. Verify schema isolation
4. Check memory usage
5. Test concurrent operations

## ✅ Success Criteria

The upload workflow test is successful when:

- [ ] Database uploads complete without errors
- [ ] Projects appear immediately in the UI
- [ ] Schema is extracted and displayed correctly
- [ ] Data can be queried and edited
- [ ] Projects persist across restarts
- [ ] Real-time updates work smoothly
- [ ] Error handling provides clear feedback
- [ ] Performance is acceptable for typical use cases

## 🚨 Known Limitations

- Currently supports SQLite databases only
- Large databases (>100MB) may have performance issues
- Complex foreign key relationships may not display perfectly
- Some SQLite-specific features may not be fully supported

## 📝 Test Results

After running tests, document:
- Test execution time
- Memory usage
- Any errors encountered
- Performance bottlenecks
- User experience issues
- Suggestions for improvement

## 🔄 Continuous Testing

Set up automated testing to run:
- On every code change
- Before releases
- On different operating systems
- With various database sizes
- Under different load conditions

---

**Note**: This test guide is part of the QueryFlow database upload and integration system. For more information, see the main README.md file.
