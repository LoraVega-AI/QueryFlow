const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create or connect to the database
const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

// Initialize database with tables and sample data
function initializeDatabase() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Create users table
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Create posts table
            db.run(`CREATE TABLE IF NOT EXISTS posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT,
                user_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`);

            // Create comments table
            db.run(`CREATE TABLE IF NOT EXISTS comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT NOT NULL,
                post_id INTEGER,
                user_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (post_id) REFERENCES posts (id),
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`);

            // Insert sample users
            const users = [
                ['john_doe', 'john@example.com'],
                ['jane_smith', 'jane@example.com'],
                ['bob_wilson', 'bob@example.com']
            ];

            const insertUser = db.prepare(`INSERT OR IGNORE INTO users (username, email) VALUES (?, ?)`);
            users.forEach(([username, email]) => {
                insertUser.run(username, email);
            });
            insertUser.finalize();

            // Insert sample posts
            const posts = [
                ['My First Post', 'This is the content of my first post!', 1],
                ['Learning SQLite', 'SQLite is a great database for small projects.', 1],
                ['Node.js Tips', 'Here are some useful Node.js tips and tricks.', 2],
                ['Database Design', 'Best practices for designing relational databases.', 3]
            ];

            const insertPost = db.prepare(`INSERT OR IGNORE INTO posts (title, content, user_id) VALUES (?, ?, ?)`);
            posts.forEach(([title, content, user_id]) => {
                insertPost.run(title, content, user_id);
            });
            insertPost.finalize();

            // Insert sample comments
            const comments = [
                ['Great post!', 1, 2],
                ['Thanks for sharing!', 1, 3],
                ['Very helpful information.', 2, 2],
                ['I learned a lot from this.', 2, 3],
                ['Excellent tips!', 3, 1],
                ['This helped me a lot.', 3, 3],
                ['Good design principles.', 4, 1],
                ['Thanks for the insights.', 4, 2]
            ];

            const insertComment = db.prepare(`INSERT OR IGNORE INTO comments (content, post_id, user_id) VALUES (?, ?, ?)`);
            comments.forEach(([content, post_id, user_id]) => {
                insertComment.run(content, post_id, user_id);
            });
            insertComment.finalize();

            console.log('Database initialized successfully!');
            resolve();
        });
    });
}

// Function to display all data
function displayAllData() {
    return new Promise((resolve, reject) => {
        console.log('\n=== USERS ===');
        db.all('SELECT * FROM users', (err, rows) => {
            if (err) {
                console.error('Error fetching users:', err);
                reject(err);
            } else {
                console.table(rows);
                
                console.log('\n=== POSTS ===');
                db.all('SELECT * FROM posts', (err, rows) => {
                    if (err) {
                        console.error('Error fetching posts:', err);
                        reject(err);
                    } else {
                        console.table(rows);
                        
                        console.log('\n=== COMMENTS ===');
                        db.all('SELECT * FROM comments', (err, rows) => {
                            if (err) {
                                console.error('Error fetching comments:', err);
                                reject(err);
                            } else {
                                console.table(rows);
                                resolve();
                            }
                        });
                    }
                });
            }
        });
    });
}

// Function to display joined data
function displayJoinedData() {
    return new Promise((resolve, reject) => {
        console.log('\n=== POSTS WITH AUTHORS AND COMMENTS ===');
        const query = `
            SELECT 
                p.id as post_id,
                p.title,
                p.content as post_content,
                u.username as author,
                u.email as author_email,
                COUNT(c.id) as comment_count
            FROM posts p
            LEFT JOIN users u ON p.user_id = u.id
            LEFT JOIN comments c ON p.id = c.post_id
            GROUP BY p.id, p.title, p.content, u.username, u.email
            ORDER BY p.id
        `;
        
        db.all(query, (err, rows) => {
            if (err) {
                console.error('Error fetching joined data:', err);
                reject(err);
            } else {
                console.table(rows);
                resolve();
            }
        });
    });
}

// Main execution
async function main() {
    try {
        await initializeDatabase();
        await displayAllData();
        await displayJoinedData();
        
        console.log('\nDatabase operations completed successfully!');
        console.log('You can now use the database.db file in your applications.');
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err);
            } else {
                console.log('Database connection closed.');
            }
        });
    }
}

// Run the main function
main();
