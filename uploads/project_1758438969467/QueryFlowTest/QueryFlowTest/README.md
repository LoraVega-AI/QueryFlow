# QueryFlow Test Project

A simple Node.js project with SQLite database containing three tables: users, posts, and comments.

## Project Structure

- `package.json` - Node.js project configuration
- `index.js` - Main application file
- `database.db` - SQLite database file (created when you run the project)

## Database Schema

### Users Table
- `id` (INTEGER PRIMARY KEY)
- `username` (TEXT UNIQUE)
- `email` (TEXT UNIQUE)
- `created_at` (DATETIME)

### Posts Table
- `id` (INTEGER PRIMARY KEY)
- `title` (TEXT)
- `content` (TEXT)
- `user_id` (INTEGER, FOREIGN KEY)
- `created_at` (DATETIME)

### Comments Table
- `id` (INTEGER PRIMARY KEY)
- `content` (TEXT)
- `post_id` (INTEGER, FOREIGN KEY)
- `user_id` (INTEGER, FOREIGN KEY)
- `created_at` (DATETIME)

## Setup and Usage

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the project:
   ```bash
   npm start
   ```

The application will:
- Create the SQLite database file (`database.db`)
- Create the three tables with proper relationships
- Insert sample data
- Display all data in a formatted table
- Show joined data (posts with authors and comment counts)

## Sample Data

The project includes sample data:
- 3 users (john_doe, jane_smith, bob_wilson)
- 4 posts with different authors
- 8 comments distributed across the posts

## Database File

After running the project, you'll have a `database.db` file that you can use with any SQLite-compatible tool or library.
