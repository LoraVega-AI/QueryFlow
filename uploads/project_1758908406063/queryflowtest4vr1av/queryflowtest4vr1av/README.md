# Django Blog Project with SQLite Database

A comprehensive Django blog application demonstrating advanced database design, ORM features, and SQLite capabilities.

## Project Overview

This project showcases a modern blog application built with Django and SQLite, featuring:

- **3 Related Tables**: Users, Posts, and Comments with proper relationships
- **Advanced Database Features**: Primary keys, foreign keys, constraints, indexes, auto-increment fields
- **Database Metadata**: Accessible via SQLite PRAGMA commands
- **Sample Data**: 50+ rows across all tables
- **Migration History**: Multiple migration steps demonstrating schema evolution
- **ORM Models**: With relationships, validations, hooks, and scopes
- **Database Objects**: Views, triggers, and functions

## Database Schema

### Core Tables

#### 1. Users (Django's built-in User model + UserProfile)
- **Primary Key**: Auto-incrementing ID
- **Foreign Keys**: One-to-one relationship with UserProfile
- **Constraints**: NOT NULL, UNIQUE (username, email)
- **Indexes**: On username, email, and profile fields

#### 2. Posts
- **Primary Key**: Auto-incrementing ID
- **Foreign Keys**: 
  - `author_id` → `auth_user.id` (CASCADE)
  - `category_id` → `categories.id` (SET_NULL)
- **Constraints**: 
  - NOT NULL on required fields
  - CHECK constraints for status validation
  - UNIQUE on slug and UUID
- **Indexes**: On author+status, category+status, published_at, featured+status, created_at+status
- **Auto-increment**: Primary key with UUID for external references

#### 3. Comments
- **Primary Key**: Auto-incrementing ID
- **Foreign Keys**:
  - `post_id` → `posts.id` (CASCADE)
  - `author_id` → `auth_user.id` (CASCADE)
  - `parent_id` → `comments.id` (CASCADE) for threaded comments
- **Constraints**: NOT NULL on required fields, CHECK for content length
- **Indexes**: On post+is_approved, author+created_at, parent, is_spam+is_approved

#### 4. Additional Tables
- **Categories**: Blog post categories with color coding
- **Tags**: Post tags with many-to-many relationship
- **PostTags**: Junction table for posts and tags
- **PostLikes**: User likes for posts

### Database Objects

#### Views
- **post_statistics**: Aggregated view showing post metrics including comment counts and tag counts

#### Triggers
- **calculate_reading_time**: Automatically calculates reading time based on content length
- **update_post_like_count_insert**: Updates like count when new likes are added
- **update_post_like_count_delete**: Updates like count when likes are removed
- **increment_view_count**: Placeholder trigger for view count updates

## Features

### ORM Models with Advanced Features

#### Model Relationships
- **One-to-One**: User ↔ UserProfile
- **One-to-Many**: User → Posts, User → Comments, Category → Posts, Post → Comments
- **Many-to-Many**: Posts ↔ Tags (through PostTags)
- **Self-Referencing**: Comments → Comments (for threaded comments)

#### Model Validations
- **Field Validators**: MinLengthValidator, MaxLengthValidator, RegexValidator
- **Model Clean Methods**: Custom validation logic
- **Database Constraints**: CHECK constraints for data integrity

#### Model Hooks and Signals
- **post_save Signals**: Auto-update like counts and approval times
- **User Creation**: Auto-create user profiles
- **Model Methods**: Custom properties and methods for business logic

#### Custom Managers
- **PublishedPostManager**: Custom manager for published posts with additional methods:
  - `featured()`: Get featured posts
  - `by_category(category)`: Filter by category
  - `recent(days=30)`: Get recent posts

### Database Metadata

The project includes comprehensive database metadata accessible via SQLite PRAGMA commands:

```bash
python manage.py show_db_metadata
```

This command displays:
- Table schemas with column details
- Indexes and constraints
- Foreign key relationships
- Database views and triggers
- Record counts
- Sample data from views

### Sample Data

The project includes a data population command that creates realistic sample data:

```bash
python manage.py populate_sample_data --users 15 --posts 25 --comments 40
```

This creates:
- 15 users with profiles
- 8 categories
- 10 tags
- 25+ posts with realistic content
- 40+ comments with threading
- 100+ post likes

### ORM Query Demonstrations

A comprehensive demonstration of Django ORM features:

```bash
python manage.py demo_orm_queries
```

This showcases:
- Basic queries and filtering
- Relationship queries with select_related and prefetch_related
- Aggregation queries with Count, Sum, Avg, Max, Min
- Custom manager usage
- Complex queries with Q objects
- Model methods and properties
- Advanced features like F expressions and raw SQL

## Installation and Setup

### Prerequisites
- Python 3.8+
- pip

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd blog_project
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run migrations**:
   ```bash
   python manage.py migrate
   ```

4. **Create superuser** (optional):
   ```bash
   python manage.py createsuperuser
   ```

5. **Populate sample data**:
   ```bash
   python manage.py populate_sample_data
   ```

6. **Run the development server**:
   ```bash
   python manage.py runserver
   ```

## Project Structure

```
blog_project/
├── blog/
│   ├── models.py              # Django models with relationships and validations
│   ├── admin.py               # Django admin configuration
│   ├── management/
│   │   └── commands/
│   │       ├── show_db_metadata.py      # Database metadata display
│   │       ├── populate_sample_data.py  # Sample data population
│   │       └── demo_orm_queries.py      # ORM demonstrations
│   └── migrations/            # Database migration files
├── blog_project/
│   ├── settings.py            # Django settings
│   ├── urls.py               # URL configuration
│   └── wsgi.py               # WSGI configuration
├── requirements.txt          # Python dependencies
├── manage.py                 # Django management script
└── db.sqlite3               # SQLite database file
```

## Migration History

The project demonstrates a complete migration history:

1. **0001_initial.py**: Initial schema creation with all tables, indexes, and constraints
2. **0002_add_additional_fields.py**: Added reading_time and is_featured fields
3. **0003_add_database_objects.py**: Added database views, triggers, and functions

## Database Constraints

### NOT NULL Constraints
- All primary keys
- Required fields like title, content, author
- Timestamps (created_at, updated_at)

### UNIQUE Constraints
- User username and email
- Post slug and UUID
- Category and tag names/slugs
- Phone numbers in user profiles
- Unique together constraints for many-to-many relationships

### CHECK Constraints
- Post status validation (draft, published, archived)
- Published_at requires published status
- Color format validation for categories and tags

### DEFAULT Values
- Boolean fields default to False
- Timestamps auto-populate
- UUID fields auto-generate
- Reading time calculated automatically

## Indexes

The database includes comprehensive indexing:

- **Primary Key Indexes**: All tables
- **Foreign Key Indexes**: All foreign key relationships
- **Composite Indexes**: Multi-column indexes for common query patterns
- **Unique Indexes**: For unique constraints
- **Custom Indexes**: For frequently queried fields

## Usage Examples

### Basic Queries
```python
# Get published posts
published_posts = Post.published.all()

# Get featured posts
featured_posts = Post.published.featured()

# Get posts by category
tech_posts = Post.published.by_category(technology_category)
```

### Relationship Queries
```python
# Get posts with authors and categories (avoid N+1)
posts = Post.objects.select_related('author', 'category').filter(status='published')

# Get posts with tags
posts_with_tags = Post.objects.prefetch_related('post_tags__tag')
```

### Aggregation Queries
```python
# Post statistics by category
from django.db.models import Count, Avg
category_stats = Post.objects.values('category__name').annotate(
    post_count=Count('id'),
    avg_views=Avg('view_count')
)
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is for educational purposes and demonstrates advanced Django and SQLite features.

## Contact

For questions or suggestions, please open an issue in the repository.
