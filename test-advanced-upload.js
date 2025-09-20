// Test script for advanced project upload functionality
// This demonstrates the new capabilities of QueryFlow's upload system

const fs = require('fs');
const path = require('path');

// Create a test project structure
const testProjectDir = path.join(__dirname, 'test-advanced-project');
const testFiles = {
  // SQL files
  'schema.sql': `
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_users_email ON users(email);
`,

  // Migration files
  'migrations/001_create_users.sql': `
-- Up Migration
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Down Migration
DROP TABLE users;
`,

  // Django models
  'models.py': `
from django.db import models

class User(models.Model):
    username = models.CharField(max_length=50, unique=True)
    email = models.EmailField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'users'

class Post(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    content = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'posts'
`,

  // Sequelize models
  'models/User.js': `
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'users',
    timestamps: true
  });

  return User;
};
`,

  // TypeORM entity
  'entities/Post.ts': `
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
`,

  // Configuration files
  '.env': `
DATABASE_URL=sqlite:///app.db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=myapp
DB_USERNAME=postgres
DB_PASSWORD=secret
`,

  'config/database.js': `
module.exports = {
  development: {
    username: 'postgres',
    password: 'secret',
    database: 'myapp_dev',
    host: 'localhost',
    port: 5432,
    dialect: 'postgres'
  },
  production: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres'
  }
};
`,

  // Package.json for project detection
  'package.json': `
{
  "name": "test-advanced-project",
  "version": "1.0.0",
  "description": "Test project for advanced upload scanning",
  "main": "index.js",
  "dependencies": {
    "sequelize": "^6.0.0",
    "typeorm": "^0.3.0"
  }
}
`,

  // Database file
  'data.db': 'SQLite database file content would go here'
};

async function createTestProject() {
  console.log('🧪 Creating test project structure...');
  
  // Create main directory
  if (!fs.existsSync(testProjectDir)) {
    fs.mkdirSync(testProjectDir, { recursive: true });
  }

  // Create subdirectories
  fs.mkdirSync(path.join(testProjectDir, 'migrations'), { recursive: true });
  fs.mkdirSync(path.join(testProjectDir, 'models'), { recursive: true });
  fs.mkdirSync(path.join(testProjectDir, 'entities'), { recursive: true });
  fs.mkdirSync(path.join(testProjectDir, 'config'), { recursive: true });

  // Create test files
  for (const [filePath, content] of Object.entries(testFiles)) {
    const fullPath = path.join(testProjectDir, filePath);
    fs.writeFileSync(fullPath, content);
    console.log(`✅ Created: ${filePath}`);
  }

  console.log('🎉 Test project created successfully!');
  console.log(`📁 Location: ${testProjectDir}`);
  console.log('');
  console.log('📋 Test project includes:');
  console.log('  • SQL schema files');
  console.log('  • Migration files');
  console.log('  • Django models (Python)');
  console.log('  • Sequelize models (JavaScript)');
  console.log('  • TypeORM entities (TypeScript)');
  console.log('  • Configuration files (.env, config)');
  console.log('  • Package.json for project detection');
  console.log('  • Database file');
  console.log('');
  console.log('🚀 You can now test the advanced upload feature by:');
  console.log('  1. Zipping the test-advanced-project folder');
  console.log('  2. Uploading it through QueryFlow\'s ProjectUploader');
  console.log('  3. Observing the advanced schema extraction');
}

async function cleanupTestProject() {
  if (fs.existsSync(testProjectDir)) {
    fs.rmSync(testProjectDir, { recursive: true, force: true });
    console.log('🧹 Cleaned up test project');
  }
}

// Command line interface
const command = process.argv[2];

if (command === 'create') {
  createTestProject();
} else if (command === 'cleanup') {
  cleanupTestProject();
} else {
  console.log('Usage:');
  console.log('  node test-advanced-upload.js create    - Create test project');
  console.log('  node test-advanced-upload.js cleanup   - Clean up test project');
}
