# Schema-to-Database Upload System

This document describes the enhanced upload system that automatically converts extracted schemas into actual queryable SQLite database files.

## 🚀 Overview

The upload system now automatically:
1. **Extracts schemas** from uploaded zip files (SQL files, ORM models, etc.)
2. **Creates actual SQLite databases** from the extracted schemas
3. **Auto-connects** the created databases to QueryFlow
4. **Makes them immediately queryable** through the normal interface
5. **Shows them in the database panel** with special indicators

## 🔧 How It Works

### 1. Schema Extraction
When a zip file is uploaded with `advancedScanning` enabled:
- The system scans for SQL files, ORM models, and configuration files
- Extracts table definitions, relationships, indexes, and constraints
- Normalizes schemas from different sources (SQL, ORM, config)

### 2. Database Creation
The `SchemaToDatabaseService` converts extracted schemas to SQLite databases:
- Creates actual `.db` files in the upload directory
- Generates proper SQLite CREATE TABLE statements
- Handles data type mapping (VARCHAR → TEXT, etc.)
- Creates foreign key constraints and indexes
- Inserts realistic sample data

### 3. Auto-Connection
The `AutoConnectionService` automatically connects to created databases:
- Tests database connectivity
- Creates connection objects for QueryFlow
- Saves connections to the application database
- Updates connection status

### 4. UI Integration
The interface shows auto-created databases with:
- Special "Auto-Created" badges
- Table and row count information
- "Query Now" buttons for immediate access
- Connection status indicators

## 📁 File Structure

```
src/
├── services/
│   ├── schemaToDatabaseService.ts    # Converts schemas to SQLite databases
│   └── autoConnectionService.ts      # Handles auto-connection to databases
├── app/api/projects/upload/
│   └── route.ts                      # Enhanced upload API with schema conversion
└── components/
    ├── ProjectUploader.tsx           # Updated upload interface
    └── DatabaseLinker.tsx            # Enhanced database panel
```

## 🛠️ Services

### SchemaToDatabaseService

Converts extracted schemas into actual SQLite database files.

**Key Methods:**
- `convertSchemasToDatabases()` - Main conversion method
- `createDatabaseFromSchema()` - Creates single database from schema
- `generateSampleData()` - Generates realistic sample data
- `createDatabaseConnection()` - Creates QueryFlow connection config

**Features:**
- Data type mapping (VARCHAR → TEXT, etc.)
- Foreign key constraint handling
- Index creation
- Sample data generation with realistic values
- File system sanitization

### AutoConnectionService

Handles automatic connection to created databases.

**Key Methods:**
- `autoConnectDatabase()` - Connects to single database
- `autoConnectMultipleDatabases()` - Connects to multiple databases
- `testDatabaseConnection()` - Tests database connectivity
- `getProjectConnectionStatus()` - Gets connection status

**Features:**
- Connection testing and validation
- Error handling and reporting
- Status tracking
- Integration with QueryFlow's connection system

## 🔄 Upload Process Flow

```
1. Upload Zip File
   ↓
2. Extract Files
   ↓
3. Advanced Scanning
   ↓
4. Extract Schemas
   ↓
5. Convert to SQLite Databases
   ↓
6. Generate Sample Data
   ↓
7. Auto-Connect to Databases
   ↓
8. Update UI with Results
   ↓
9. Ready for Querying!
```

## 📊 Supported Schema Sources

### SQL Files
- `.sql` files with CREATE TABLE statements
- Migration files
- Schema dump files

### ORM Models
- **Sequelize** (Node.js)
- **TypeORM** (Node.js/TypeScript)
- **Prisma** (Node.js/TypeScript)
- **Django Models** (Python)
- **SQLAlchemy** (Python)
- **Laravel Eloquent** (PHP)
- **Rails ActiveRecord** (Ruby)

### Configuration Files
- Database connection strings
- Environment files (`.env`)
- Framework configuration files

## 🎯 Sample Data Generation

The system generates realistic sample data based on:
- Column names (email, username, title, etc.)
- Data types (INTEGER, TEXT, DATETIME, etc.)
- Table relationships
- Common patterns in database design

**Sample Data Examples:**
- `email` columns → `user1@example.com`
- `username` columns → `user1`, `user2`
- `title` columns → `Sample Title 1`
- `created_at` columns → Current timestamp
- `id` columns → Sequential numbers

## 🧪 Testing

Run the test script to verify the system works:

```bash
node test-schema-to-database.js
```

This will:
1. Create a test project with SQL schemas
2. Package it into a zip file
3. Upload it to QueryFlow
4. Verify database creation and connection
5. Test database queries
6. Clean up test files

## 🎨 UI Enhancements

### Project Uploader
- Shows detailed upload progress
- Displays schema and database counts
- Indicates auto-created databases
- Shows connection status

### Database Panel
- "Auto-Created" badges for generated databases
- Table and row count information
- "Query Now" buttons for immediate access
- Enhanced status indicators
- Connection error reporting

## 🔧 Configuration

### Upload Options
```javascript
const scanOptions = {
  includeHidden: false,
  maxDepth: 5,
  ignorePatterns: ['node_modules', '.git', 'dist', 'build'],
  scanTimeout: 30000
};
```

### Database Creation Options
- Sample data row count: 5-10 rows per table
- Data type mapping: Configurable in `SchemaToDatabaseService`
- File naming: Sanitized and unique
- Directory structure: `uploads/project_*/databases/`

## 🚨 Error Handling

The system handles various error scenarios:
- Invalid schema files
- Database creation failures
- Connection test failures
- File system errors
- SQL parsing errors

Errors are logged and reported to the user while allowing the upload to continue with successful parts.

## 🔮 Future Enhancements

Potential improvements:
- Support for more database types (PostgreSQL, MySQL)
- Custom sample data templates
- Schema validation and optimization
- Migration script generation
- Data import from existing databases
- Schema visualization and editing

## 📝 Usage Examples

### Basic Upload
1. Create a zip file with your project
2. Include SQL files or ORM models
3. Upload through QueryFlow interface
4. Enable "Advanced Scanning"
5. Wait for automatic database creation
6. Start querying immediately!

### Advanced Configuration
```javascript
// Custom scan options
const options = {
  includeHidden: true,
  maxDepth: 10,
  ignorePatterns: ['node_modules', '.git'],
  scanTimeout: 60000
};
```

### Programmatic Usage
```javascript
import { SchemaToDatabaseService } from '@/services/schemaToDatabaseService';

const service = SchemaToDatabaseService.getInstance();
const results = await service.convertSchemasToDatabases(
  extractedSchemas,
  projectId,
  projectName,
  uploadPath
);
```

## 🎉 Benefits

1. **Immediate Queryability** - No manual database setup required
2. **Realistic Testing** - Sample data for immediate testing
3. **Schema Preservation** - Maintains all relationships and constraints
4. **User-Friendly** - Clear indicators and easy access
5. **Robust** - Handles various schema sources and formats
6. **Integrated** - Works seamlessly with existing QueryFlow features

The enhanced upload system transforms QueryFlow from a simple query tool into a comprehensive database management platform that can automatically create and manage databases from project schemas.
