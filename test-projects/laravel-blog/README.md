# Laravel Blog

A modern blog application built with Laravel and MySQL.

## Features

- User authentication and authorization
- Create, edit, and publish blog posts
- Categories and tags system
- Comments system
- Rich text editor
- SEO optimization
- Responsive design
- Admin dashboard
- REST API

## Tech Stack

- **Backend**: Laravel 10, PHP 8.1
- **Database**: MySQL 8.0
- **Authentication**: Laravel Sanctum
- **Frontend**: Blade templates with Tailwind CSS
- **File Storage**: Local storage (configurable)
- **Caching**: File cache (configurable)

## Database Schema

### Users
- id (Primary Key)
- name
- email (Unique)
- email_verified_at
- password (Hashed)
- remember_token
- created_at
- updated_at

### Posts
- id (Primary Key)
- title
- slug (Unique)
- content
- excerpt
- featured_image
- status (draft, published)
- published_at
- user_id (Foreign Key)
- category_id (Foreign Key)
- created_at
- updated_at

### Categories
- id (Primary Key)
- name
- slug (Unique)
- description
- created_at
- updated_at

### Tags
- id (Primary Key)
- name
- slug (Unique)
- created_at
- updated_at

### Comments
- id (Primary Key)
- content
- user_id (Foreign Key)
- post_id (Foreign Key)
- parent_id (Foreign Key, for nested comments)
- created_at
- updated_at

## Getting Started

1. Install PHP dependencies:
```bash
composer install
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Configure database in `.env`:
```bash
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=laravel_blog
DB_USERNAME=blog_user
DB_PASSWORD=blog_password
```

4. Generate application key:
```bash
php artisan key:generate
```

5. Run migrations:
```bash
php artisan migrate
```

6. Seed the database (optional):
```bash
php artisan db:seed
```

7. Start the development server:
```bash
php artisan serve
```

The application will be available at `http://localhost:8000`

## API Endpoints

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `POST /api/logout` - User logout

### Posts
- `GET /api/posts` - Get all published posts
- `GET /api/posts/{id}` - Get post by ID
- `POST /api/posts` - Create new post (Authenticated)
- `PUT /api/posts/{id}` - Update post (Author/Admin)
- `DELETE /api/posts/{id}` - Delete post (Author/Admin)

### Categories
- `GET /api/categories` - Get all categories
- `GET /api/categories/{id}/posts` - Get posts by category

### Comments
- `GET /api/posts/{id}/comments` - Get comments for post
- `POST /api/posts/{id}/comments` - Add comment to post
- `PUT /api/comments/{id}` - Update comment (Author)
- `DELETE /api/comments/{id}` - Delete comment (Author/Admin)

## Configuration

### Database Configuration
Update `config/database.php` or set environment variables:

```bash
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=laravel_blog
DB_USERNAME=your_username
DB_PASSWORD=your_password
```

### Mail Configuration
Configure mail settings in `.env`:

```bash
MAIL_MAILER=smtp
MAIL_HOST=mailpit
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS="hello@example.com"
MAIL_FROM_NAME="${APP_NAME}"
```

### File Storage
Configure storage in `config/filesystems.php`:

```php
'disks' => [
    'local' => [
        'driver' => 'local',
        'root' => storage_path('app'),
    ],
    'public' => [
        'driver' => 'local',
        'root' => storage_path('app/public'),
        'url' => env('APP_URL').'/storage',
        'visibility' => 'public',
    ],
]
```

## Key Features

### User Authentication
- Registration and login
- Password reset functionality
- Email verification
- Role-based access control

### Blog Management
- Rich text editor for posts
- Draft and publish workflow
- Featured images
- SEO optimization
- Social sharing

### Content Organization
- Hierarchical categories
- Flexible tagging system
- Search functionality
- Archive pages

### Comments System
- Nested comments
- Comment moderation
- Spam protection
- User mentions

### Admin Dashboard
- Post management
- User management
- Category and tag management
- Analytics and reporting

## Development

### Running Tests
```bash
php artisan test
```

### Code Analysis
```bash
./vendor/bin/pint
```

### Database Migrations
```bash
php artisan migrate
php artisan migrate:status
php artisan migrate:rollback
```

### Seeding Data
```bash
php artisan db:seed
php artisan db:seed --class=PostSeeder
```

## Deployment

### Production Configuration
1. Set `APP_ENV=production` in `.env`
2. Configure production database
3. Set secure `APP_KEY`
4. Configure mail settings
5. Set up file storage (S3, etc.)
6. Configure caching (Redis, etc.)
7. Set up SSL certificate

### Environment Variables
```bash
APP_NAME="Laravel Blog"
APP_ENV=production
APP_KEY=base64:your-generated-key
APP_DEBUG=false
APP_URL=https://yourdomain.com

DB_CONNECTION=mysql
DB_HOST=your-db-host
DB_DATABASE=your-db-name
DB_USERNAME=your-db-user
DB_PASSWORD=your-db-password

CACHE_DRIVER=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis

MAIL_MAILER=smtp
MAIL_HOST=your-smtp-host
MAIL_PORT=587
MAIL_USERNAME=your-email@domain.com
MAIL_PASSWORD=your-email-password

AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=your-bucket-name
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
