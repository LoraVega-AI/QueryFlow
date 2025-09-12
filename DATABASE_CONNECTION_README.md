# Database Connection & Query System

This document describes the implementation of real database connectivity for the QueryFlow project, allowing users to connect to external databases and execute queries through a secure backend API.

## 🚀 Features Implemented

### ✅ Real Database Connectivity
- **MySQL Support**: Connect to MySQL databases using `mysql2` driver
- **PostgreSQL Support**: Connect to PostgreSQL databases using `pg` driver
- **SQLite Support**: Connect to SQLite databases (file-based or in-memory)
- **Secure Backend**: All database operations handled server-side, credentials never exposed to frontend

### ✅ User Interface
- **Connection Modal**: Intuitive form for entering database credentials
- **Example Configurations**: Pre-built connection examples for testing
- **Sync Functionality**: Real schema fetching and table discovery
- **Query Editor**: Full-featured SQL editor with query execution and results display
- **Error Handling**: Comprehensive error messages and connection status feedback

### ✅ Security & Performance
- **Server-Side Processing**: Database credentials stored only on server
- **Connection Pooling**: Efficient connection management
- **Query Validation**: Only SELECT queries allowed for security
- **Real-time Feedback**: Live status updates and progress indicators

## 📁 File Structure

```
src/
├── utils/
│   └── databaseConnection.ts          # Core database connection manager
├── app/api/database/
│   ├── connect/route.ts               # Test database connections
│   ├── schema/route.ts                # Fetch database schema
│   └── query/route.ts                 # Execute SELECT queries
├── components/
│   ├── DatabaseConnectionModal.tsx    # Connection setup modal
│   └── QueryEditor.tsx                # SQL query editor
├── config/
│   └── databaseExamples.ts            # Example configurations
└── types/
    └── projects.ts                    # Project and database types
```

## 🔧 Installation & Setup

### 1. Install Dependencies
```bash
npm install mysql2 pg sqlite3
```

### 2. Environment Setup
No additional environment variables are required for basic functionality. For production deployments, consider:

```env
# Database connection limits
DB_MAX_CONNECTIONS=10
DB_CONNECTION_TIMEOUT=30000

# Security (for production)
DB_ENCRYPT_CREDENTIALS=true
DB_CONNECTION_LOGGING=false
```

## 🗄️ Supported Databases

### MySQL
```javascript
const credentials = {
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'your_username',
  password: 'your_password',
  database: 'your_database'
};
```

### PostgreSQL
```javascript
const credentials = {
  type: 'postgresql',
  host: 'localhost',
  port: 5432,
  username: 'your_username',
  password: 'your_password',
  database: 'your_database'
};
```

### SQLite
```javascript
const credentials = {
  type: 'sqlite',
  filePath: './database.db'  // or ':memory:' for in-memory
};
```

## 🔌 API Endpoints

### POST `/api/database/connect`
Test database connection and establish connection.

**Request:**
```json
{
  "type": "mysql",
  "host": "localhost",
  "port": 3306,
  "username": "user",
  "password": "pass",
  "database": "test"
}
```

**Response:**
```json
{
  "success": true,
  "message": "MySQL connection successful",
  "connectionId": "conn_1234567890_abc123",
  "data": {
    "type": "mysql",
    "database": "test",
    "host": "localhost"
  }
}
```

### POST `/api/database/schema`
Fetch database schema and table information.

**Request:**
```json
{
  "connectionId": "conn_1234567890_abc123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Schema fetched successfully",
  "data": {
    "tables": [
      {
        "name": "users",
        "columns": [
          {
            "name": "id",
            "type": "int",
            "nullable": false,
            "primaryKey": true
          }
        ],
        "rowCount": 1000
      }
    ]
  }
}
```

### POST `/api/database/query`
Execute SELECT queries on the database.

**Request:**
```json
{
  "connectionId": "conn_1234567890_abc123",
  "sql": "SELECT * FROM users LIMIT 10"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Query executed successfully",
  "data": {
    "rows": [
      { "id": 1, "name": "John Doe", "email": "john@example.com" }
    ],
    "rowCount": 10,
    "executionTime": 45
  }
}
```

## 🎨 User Interface Components

### DatabaseConnectionModal
A modal component for setting up database connections:

```tsx
<DatabaseConnectionModal
  isOpen={true}
  onClose={() => {}}
  onConnect={(connectionId, credentials) => {}}
  projectName="My Project"
/>
```

**Features:**
- Database type selection (MySQL/PostgreSQL/SQLite)
- Credential input forms
- Example configurations dropdown
- Connection testing with real-time feedback
- Error handling and validation

### QueryEditor
A full-featured SQL query editor:

```tsx
<QueryEditor
  isOpen={true}
  onClose={() => {}}
  connectionId="conn_1234567890_abc123"
  projectName="My Project"
  databaseName="test_db"
/>
```

**Features:**
- Syntax-highlighted SQL editor
- Query execution with results display
- Query history (last 10 queries)
- CSV export functionality
- Execution time and row count display
- Error handling and validation

## 🔒 Security Considerations

### Server-Side Only
- Database credentials are never sent to the frontend
- All database operations occur on the server
- Connection IDs are used to reference active connections

### Query Security
- Only SELECT queries are allowed
- SQL injection prevention through parameterized queries
- Query validation and sanitization

### Connection Management
- Automatic connection cleanup on errors
- Connection pooling for performance
- Timeout handling to prevent hanging connections

## 📊 Example Usage

### 1. Connecting to a Database
```javascript
// User clicks "Sync" button
// Opens DatabaseConnectionModal
// User selects MySQL and enters credentials
// Clicks "Test Connection" - API call to /api/database/connect
// If successful, clicks "Connect"
// API call to /api/database/schema fetches schema
// Project status updates to "connected"
```

### 2. Executing Queries
```javascript
// User clicks "Open" button on connected project
// Opens QueryEditor component
// User writes SELECT query
// Clicks "Execute" - API call to /api/database/query
// Results displayed in table format
// User can export results as CSV
```

## 🔧 Configuration Examples

### Local MySQL Database
```json
{
  "name": "Local MySQL",
  "type": "mysql",
  "credentials": {
    "host": "localhost",
    "port": 3306,
    "username": "root",
    "password": "password",
    "database": "test"
  }
}
```

### In-Memory SQLite
```json
{
  "name": "SQLite In-Memory",
  "type": "sqlite",
  "credentials": {
    "filePath": ":memory:"
  }
}
```

### Remote PostgreSQL
```json
{
  "name": "Remote PostgreSQL",
  "type": "postgresql",
  "credentials": {
    "host": "your-db-host.com",
    "port": 5432,
    "username": "your_username",
    "password": "your_password",
    "database": "your_database"
  }
}
```

## 🐛 Error Handling

### Connection Errors
- **Invalid Credentials**: "Access denied for user"
- **Host Not Found**: "Connection refused"
- **Database Not Found**: "Unknown database"
- **Timeout**: "Connection timeout"

### Query Errors
- **Syntax Error**: "You have an error in your SQL syntax"
- **Table Not Found**: "Table doesn't exist"
- **Permission Denied**: "Access denied for table"

### UI Error States
- Red error messages with detailed descriptions
- Connection status indicators
- Disabled buttons when operations fail
- Auto-hide success messages

## 🚀 Deployment Considerations

### Production Setup
1. **Environment Variables**: Store sensitive credentials securely
2. **Connection Limits**: Configure appropriate connection pool sizes
3. **SSL/TLS**: Enable SSL for remote database connections
4. **Logging**: Implement proper error logging and monitoring

### Performance Optimization
1. **Connection Pooling**: Reuse connections for better performance
2. **Query Caching**: Cache frequently executed queries
3. **Timeout Configuration**: Set appropriate timeouts for different operations
4. **Resource Limits**: Monitor memory and CPU usage

## 📝 Future Enhancements

### Planned Features
- **Multiple Connections**: Support multiple simultaneous database connections
- **Query History**: Persistent query history across sessions
- **Saved Queries**: Save and manage frequently used queries
- **Visual Query Builder**: Drag-and-drop query construction
- **Export Options**: Support for JSON, XML, and other formats
- **Collaboration**: Multi-user query editing and sharing

### Advanced Security
- **Connection Encryption**: End-to-end encryption for credentials
- **Audit Logging**: Track all database operations
- **Rate Limiting**: Prevent abuse of query endpoints
- **IP Whitelisting**: Restrict database access by IP address

## 🤝 Contributing

When extending this system:

1. **Maintain Security**: Never expose database credentials to frontend
2. **Add Tests**: Include comprehensive tests for new database types
3. **Error Handling**: Provide clear, actionable error messages
4. **Documentation**: Update this README with new features
5. **Performance**: Monitor and optimize query execution times

This implementation provides a solid foundation for database connectivity in QueryFlow while maintaining security and performance best practices.
