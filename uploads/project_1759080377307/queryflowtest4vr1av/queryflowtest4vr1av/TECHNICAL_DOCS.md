# Technical Documentation

## Database Schema Details

### Table Specifications

#### users (auth_user)
```sql
CREATE TABLE auth_user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    password VARCHAR(128) NOT NULL,
    last_login DATETIME,
    is_superuser BOOLEAN NOT NULL,
    username VARCHAR(150) NOT NULL UNIQUE,
    first_name VARCHAR(150) NOT NULL,
    last_name VARCHAR(150) NOT NULL,
    email VARCHAR(254) NOT NULL,
    is_staff BOOLEAN NOT NULL,
    is_active BOOLEAN NOT NULL,
    date_joined DATETIME NOT NULL
);
```

#### user_profiles
```sql
CREATE TABLE user_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bio TEXT,
    birth_date DATE,
    phone VARCHAR(15) UNIQUE,
    website VARCHAR(200),
    location VARCHAR(100),
    is_verified BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    user_id INTEGER NOT NULL UNIQUE,
    FOREIGN KEY (user_id) REFERENCES auth_user(id)
);
```

#### categories
```sql
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(60) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#007bff',
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL
);
```

#### posts
```sql
CREATE TABLE posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid CHAR(32) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(220) NOT NULL UNIQUE,
    content TEXT NOT NULL,
    excerpt TEXT NOT NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'draft',
    featured BOOLEAN NOT NULL DEFAULT 0,
    allow_comments BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    published_at DATETIME,
    view_count INTEGER UNSIGNED NOT NULL DEFAULT 0,
    like_count INTEGER UNSIGNED NOT NULL DEFAULT 0,
    meta_title VARCHAR(60) NOT NULL,
    meta_description VARCHAR(160) NOT NULL,
    author_id INTEGER NOT NULL,
    category_id BIGINT,
    is_featured BOOLEAN NOT NULL DEFAULT 0,
    reading_time INTEGER UNSIGNED NOT NULL DEFAULT 0,
    FOREIGN KEY (author_id) REFERENCES auth_user(id),
    FOREIGN KEY (category_id) REFERENCES categories(id),
    CHECK (status IN ('draft', 'published', 'archived')),
    CHECK (published_at IS NULL OR status = 'published')
);
```

#### comments
```sql
CREATE TABLE comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    is_approved BOOLEAN NOT NULL DEFAULT 0,
    is_spam BOOLEAN NOT NULL DEFAULT 0,
    moderation_notes TEXT NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    approved_at DATETIME,
    ip_address CHAR(39),
    user_agent TEXT NOT NULL,
    author_id INTEGER NOT NULL,
    parent_id BIGINT,
    post_id INTEGER NOT NULL,
    FOREIGN KEY (author_id) REFERENCES auth_user(id),
    FOREIGN KEY (parent_id) REFERENCES comments(id),
    FOREIGN KEY (post_id) REFERENCES posts(id)
);
```

#### tags
```sql
CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(30) NOT NULL UNIQUE,
    slug VARCHAR(35) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#6c757d',
    created_at DATETIME NOT NULL
);
```

#### post_tags
```sql
CREATE TABLE post_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at DATETIME NOT NULL,
    post_id INTEGER NOT NULL,
    tag_id BIGINT NOT NULL,
    FOREIGN KEY (post_id) REFERENCES posts(id),
    FOREIGN KEY (tag_id) REFERENCES tags(id),
    UNIQUE (post_id, tag_id)
);
```

#### post_likes
```sql
CREATE TABLE post_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at DATETIME NOT NULL,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    FOREIGN KEY (post_id) REFERENCES posts(id),
    FOREIGN KEY (user_id) REFERENCES auth_user(id),
    UNIQUE (post_id, user_id)
);
```

### Indexes

#### Primary Indexes
- All tables have primary key indexes on `id`

#### Foreign Key Indexes
- `user_profiles.user_id`
- `posts.author_id`
- `posts.category_id`
- `comments.author_id`
- `comments.parent_id`
- `comments.post_id`
- `post_tags.post_id`
- `post_tags.tag_id`
- `post_likes.post_id`
- `post_likes.user_id`

#### Composite Indexes
- `posts_author__d284fa_idx` on (author, status)
- `posts_categor_8921c9_idx` on (category, status)
- `posts_feature_7445ee_idx` on (featured, status)
- `posts_created_a4bef6_idx` on (created_at, status)
- `comments_post_id_b59d2a_idx` on (post, is_approved)
- `comments_author__b3902f_idx` on (author, created_at)
- `comments_is_spam_251e33_idx` on (is_spam, is_approved)

#### Single Column Indexes
- `posts_publish_96a4df_idx` on published_at
- `posts_title_2248f14d` on title
- `posts_status_ee0b8224` on status
- `comments_created_at_7df329d3` on created_at
- `comments_is_approved_fe04c38a` on is_approved
- `user_profil_user_id_fbe33d_idx` on user_id
- `user_profil_phone_9c9b5b_idx` on phone
- `user_profil_is_veri_0e3ed5_idx` on is_verified

### Database Views

#### post_statistics
```sql
CREATE VIEW post_statistics AS
SELECT 
    p.id,
    p.title,
    p.author_id,
    p.status,
    p.view_count,
    p.like_count,
    COUNT(c.id) as comment_count,
    COUNT(DISTINCT pt.tag_id) as tag_count,
    p.created_at,
    p.published_at
FROM posts p
LEFT JOIN comments c ON p.id = c.post_id AND c.is_approved = 1
LEFT JOIN post_tags pt ON p.id = pt.post_id
GROUP BY p.id, p.title, p.author_id, p.status, p.view_count, p.like_count, p.created_at, p.published_at;
```

### Triggers

#### calculate_reading_time
```sql
CREATE TRIGGER calculate_reading_time
AFTER INSERT ON posts
BEGIN
    UPDATE posts 
    SET reading_time = (LENGTH(content) / 200) + 1
    WHERE id = NEW.id;
END;
```

#### update_post_like_count_insert
```sql
CREATE TRIGGER update_post_like_count_insert
AFTER INSERT ON post_likes
BEGIN
    UPDATE posts 
    SET like_count = like_count + 1
    WHERE id = NEW.post_id;
END;
```

#### update_post_like_count_delete
```sql
CREATE TRIGGER update_post_like_count_delete
AFTER DELETE ON post_likes
BEGIN
    UPDATE posts 
    SET like_count = like_count - 1
    WHERE id = OLD.post_id;
END;
```

#### increment_view_count
```sql
CREATE TRIGGER increment_view_count
AFTER UPDATE OF view_count ON posts
WHEN NEW.view_count = OLD.view_count + 1
BEGIN
    SELECT 1; -- Placeholder for view count logic
END;
```

## Model Relationships

### One-to-One Relationships
- `User` ↔ `UserProfile` (via `user_id`)

### One-to-Many Relationships
- `User` → `Post` (via `author_id`)
- `User` → `Comment` (via `author_id`)
- `Category` → `Post` (via `category_id`)
- `Post` → `Comment` (via `post_id`)
- `Comment` → `Comment` (via `parent_id` for threading)

### Many-to-Many Relationships
- `Post` ↔ `Tag` (via `PostTag` junction table)

## Constraints and Validations

### Database-Level Constraints
- **Primary Keys**: All tables have auto-incrementing primary keys
- **Foreign Keys**: All relationships have proper foreign key constraints
- **Unique Constraints**: Usernames, emails, slugs, phone numbers
- **Check Constraints**: Status validation, published_at validation
- **NOT NULL**: Required fields are enforced at database level

### Application-Level Validations
- **Field Validators**: MinLengthValidator, MaxLengthValidator, RegexValidator
- **Model Clean Methods**: Custom validation logic for business rules
- **Form Validators**: Django form validation for user input

## Performance Considerations

### Query Optimization
- **select_related()**: Used for foreign key relationships to avoid N+1 queries
- **prefetch_related()**: Used for many-to-many and reverse foreign key relationships
- **Database Indexes**: Comprehensive indexing strategy for common query patterns
- **Query Optimization**: Custom managers and querysets for common operations

### Caching Strategy
- **Database Views**: Pre-computed aggregations for statistics
- **Model Properties**: Cached properties for frequently accessed data
- **Custom Managers**: Optimized querysets for common use cases

## Security Features

### Data Validation
- **Input Sanitization**: All user input is validated and sanitized
- **SQL Injection Prevention**: Django ORM prevents SQL injection attacks
- **XSS Protection**: Template escaping prevents cross-site scripting

### Access Control
- **User Authentication**: Django's built-in authentication system
- **Permission System**: Django's permission and group system
- **Admin Interface**: Secure admin interface with proper permissions

## Migration Strategy

### Migration Files
1. **0001_initial.py**: Complete schema creation
2. **0002_add_additional_fields.py**: Schema evolution example
3. **0003_add_database_objects.py**: Database objects creation

### Migration Best Practices
- **Atomic Migrations**: Each migration is atomic and reversible
- **Data Migrations**: Separate data migrations for complex changes
- **Rollback Strategy**: All migrations can be rolled back safely
- **Testing**: Migrations are tested before deployment

## Monitoring and Maintenance

### Database Monitoring
- **PRAGMA Commands**: Built-in commands for database introspection
- **Query Analysis**: Django debug toolbar for query analysis
- **Performance Metrics**: Custom management commands for monitoring

### Maintenance Tasks
- **Data Cleanup**: Automated cleanup of old data
- **Index Maintenance**: Regular index optimization
- **Backup Strategy**: Regular database backups
- **Migration Testing**: Comprehensive migration testing

## API Design

### RESTful Endpoints
- **Posts API**: CRUD operations for blog posts
- **Comments API**: Comment management and moderation
- **Users API**: User profile management
- **Categories API**: Category management
- **Tags API**: Tag management

### Response Formats
- **JSON**: Standard JSON responses
- **Pagination**: Cursor-based pagination for large datasets
- **Filtering**: Query parameter-based filtering
- **Sorting**: Multiple field sorting support

## Testing Strategy

### Unit Tests
- **Model Tests**: Test model methods and properties
- **Query Tests**: Test ORM queries and performance
- **Validation Tests**: Test data validation and constraints

### Integration Tests
- **API Tests**: Test API endpoints and responses
- **Database Tests**: Test database operations and migrations
- **Performance Tests**: Test query performance and optimization

### Test Data
- **Fixtures**: Reusable test data fixtures
- **Factories**: Model factories for test data generation
- **Mocking**: Mock external dependencies for isolated testing
