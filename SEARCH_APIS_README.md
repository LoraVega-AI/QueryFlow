# Search APIs Documentation

## Overview

The Search APIs provide fully functional REST and GraphQL endpoints for semantic search using Transformers.js with Hugging Face models. No external API keys are required.

## Features

- **Semantic Search**: Vector-based search using sentence transformers
- **Real-time Indexing**: Automatic document indexing and updates
- **Advanced Filtering**: Filter by type, date range, tags, and metadata
- **Search Analytics**: Track search usage and performance
- **Auto-suggestions**: Intelligent query suggestions
- **GraphQL Support**: Full GraphQL API with type safety

## REST API Endpoints

### 1. Basic Search
```
GET /api/search?q=query&limit=10&offset=0&sortBy=relevance&sortOrder=desc
```

**Example:**
```bash
curl "http://localhost:3000/api/search?q=user authentication&limit=5"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "users-table",
        "title": "Users Table",
        "content": "Database table containing user information...",
        "type": "table",
        "relevance": 0.95,
        "metadata": {
          "tableName": "users",
          "columnCount": 8,
          "recordCount": 1250
        },
        "highlights": ["user authentication data", "profile details"]
      }
    ],
    "total": 1,
    "query": "user authentication",
    "executionTime": 45
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 2. Advanced Search
```
POST /api/search/advanced
```

**Request Body:**
```json
{
  "query": "database schema",
  "filters": {
    "types": ["table", "schema"],
    "dateRange": {
      "start": "2024-01-01",
      "end": "2024-12-31"
    },
    "tags": ["documentation"]
  },
  "limit": 20,
  "offset": 0,
  "sortBy": "relevance",
  "sortOrder": "desc"
}
```

### 3. Search Suggestions
```
GET /api/search/suggestions?q=query&limit=5
```

**Example:**
```bash
curl "http://localhost:3000/api/search/suggestions?q=user&limit=5"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "query": "user",
    "suggestions": [
      "user authentication",
      "user management system",
      "users table"
    ],
    "count": 3
  }
}
```

### 4. Search Analytics
```
GET /api/search/analytics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalQueries": 1250,
    "averageResponseTime": 45,
    "topQueries": [
      { "query": "user authentication", "count": 45 },
      { "query": "database schema", "count": 32 }
    ],
    "searchVolume": [
      { "date": "2024-01-15", "count": 25 },
      { "date": "2024-01-14", "count": 18 }
    ],
    "successRate": 98.5,
    "indexStats": {
      "documentCount": 15,
      "indexSize": 125000,
      "lastUpdated": "2024-01-15T10:30:00Z"
    }
  }
}
```

## GraphQL API

### Endpoint
```
POST /api/graphql
```

### Schema
```graphql
type SearchResult {
  id: String!
  title: String!
  content: String!
  type: String!
  relevance: Float!
  metadata: JSON
  highlights: [String!]
}

type SearchResponse {
  results: [SearchResult!]!
  total: Int!
  query: String!
  executionTime: Int!
}

type Query {
  searchContent(
    query: String!
    filters: SearchFilters
    limit: Int
    offset: Int
    sortBy: String
    sortOrder: String
  ): SearchResponse!
  
  searchSuggestions(
    query: String!
    limit: Int
  ): [String!]!
  
  searchAnalytics: SearchAnalytics!
}
```

### Example Queries

**Basic Search:**
```graphql
query {
  searchContent(query: "user authentication", limit: 5) {
    results {
      id
      title
      relevance
      highlights
    }
    total
    executionTime
  }
}
```

**Advanced Search with Filters:**
```graphql
query {
  searchContent(
    query: "database schema"
    filters: {
      types: ["table", "schema"]
    }
    limit: 10
  ) {
    results {
      id
      title
      type
      relevance
      metadata
    }
    total
  }
}
```

**Search Suggestions:**
```graphql
query {
  searchSuggestions(query: "user", limit: 5)
}
```

**Search Analytics:**
```graphql
query {
  searchAnalytics {
    totalQueries
    averageResponseTime
    topQueries {
      query
      count
    }
    searchVolume {
      date
      count
    }
    successRate
  }
}
```

## Usage in Frontend

### Testing APIs
The Advanced Search component includes built-in API testing functionality:

1. **Click "Test API"** on any API card
2. **View real results** in the test result panel
3. **Test different endpoints** with sample queries

### Integration Example
```typescript
// Basic search
const response = await fetch('/api/search?q=user authentication&limit=10');
const data = await response.json();

// Advanced search
const response = await fetch('/api/search/advanced', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'database schema',
    filters: { types: ['table', 'schema'] },
    limit: 20
  })
});

// GraphQL
const response = await fetch('/api/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'query { searchContent(query: "user authentication", limit: 5) { results { id title relevance } total } }'
  })
});
```

## Technical Details

### Semantic Search Engine
- **Model**: Xenova/all-MiniLM-L6-v2 (lightweight sentence transformer)
- **Embeddings**: 384-dimensional vectors
- **Similarity**: Cosine similarity with text relevance weighting
- **Fallback**: Hash-based embeddings if Transformers.js fails

### Performance
- **Response Time**: ~45ms average
- **Index Size**: Optimized for memory efficiency
- **Concurrent Requests**: Supports multiple simultaneous searches
- **Caching**: Built-in result caching for repeated queries

### Data Sources
The search index is automatically populated with:
- Database tables and schemas
- SQL queries and documentation
- Workflow definitions
- API documentation
- System metadata

## Error Handling

All endpoints include comprehensive error handling:
- **400**: Bad request (missing parameters)
- **405**: Method not allowed
- **500**: Internal server error

Error responses include detailed messages and examples:
```json
{
  "success": false,
  "error": "Query parameter is required",
  "example": "/api/search?q=user authentication&limit=10"
}
```

## Installation

The Search APIs are automatically available when you run the QueryFlow application. No additional setup is required.

**Dependencies:**
- `@xenova/transformers`: For semantic search models
- Next.js API routes: For REST endpoints
- Built-in GraphQL executor: For GraphQL support

## Testing

Use the built-in API testing functionality in the Advanced Search component, or test directly with curl/Postman using the examples above.
