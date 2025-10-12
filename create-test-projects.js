#!/usr/bin/env node

/**
 * Test Project Generator
 * Creates 8 diverse test projects with different databases and frameworks
 */

const fs = require('fs').promises;
const path = require('path');
const { Database } = require('better-sqlite3');

// Test project configurations
const testProjects = [
  {
    id: 'test_ecommerce_django',
    name: 'E-Commerce Platform (Django)',
    description: 'Full-stack e-commerce platform built with Django and PostgreSQL',
    technology: 'django',
    framework: 'Django',
    database: 'postgresql',
    icon: '🛒',
    color: 'green',
    tables: [
      { name: 'users', columns: ['id', 'username', 'email', 'password_hash', 'created_at'], rowCount: 1250 },
      { name: 'products', columns: ['id', 'name', 'description', 'price', 'category_id', 'stock'], rowCount: 340 },
      { name: 'orders', columns: ['id', 'user_id', 'total', 'status', 'created_at'], rowCount: 2890 },
      { name: 'order_items', columns: ['id', 'order_id', 'product_id', 'quantity', 'price'], rowCount: 5670 },
      { name: 'categories', columns: ['id', 'name', 'description', 'parent_id'], rowCount: 25 },
      { name: 'reviews', columns: ['id', 'product_id', 'user_id', 'rating', 'comment'], rowCount: 890 },
      { name: 'payments', columns: ['id', 'order_id', 'amount', 'method', 'status'], rowCount: 2890 },
      { name: 'addresses', columns: ['id', 'user_id', 'street', 'city', 'country', 'postal_code'], rowCount: 2100 }
    ]
  },
  {
    id: 'test_blog_laravel',
    name: 'Blog Platform (Laravel)',
    description: 'Modern blog platform with Laravel and MySQL',
    technology: 'laravel',
    framework: 'Laravel',
    database: 'mysql',
    icon: '📝',
    color: 'red',
    tables: [
      { name: 'users', columns: ['id', 'name', 'email', 'password', 'role', 'created_at'], rowCount: 450 },
      { name: 'posts', columns: ['id', 'title', 'slug', 'content', 'author_id', 'status', 'published_at'], rowCount: 1200 },
      { name: 'categories', columns: ['id', 'name', 'slug', 'description'], rowCount: 15 },
      { name: 'tags', columns: ['id', 'name', 'slug'], rowCount: 80 },
      { name: 'comments', columns: ['id', 'post_id', 'user_id', 'content', 'approved', 'created_at'], rowCount: 3400 },
      { name: 'post_tag', columns: ['post_id', 'tag_id'], rowCount: 2100 },
      { name: 'post_category', columns: ['post_id', 'category_id'], rowCount: 1200 },
      { name: 'media', columns: ['id', 'post_id', 'filename', 'path', 'type', 'size'], rowCount: 890 }
    ]
  },
  {
    id: 'test_saas_express',
    name: 'SaaS Dashboard (Express.js)',
    description: 'Multi-tenant SaaS application with Express.js and SQLite',
    technology: 'express',
    framework: 'Express.js',
    database: 'sqlite',
    icon: '📊',
    color: 'blue',
    tables: [
      { name: 'tenants', columns: ['id', 'name', 'domain', 'plan', 'status', 'created_at'], rowCount: 45 },
      { name: 'users', columns: ['id', 'tenant_id', 'email', 'role', 'last_login'], rowCount: 1200 },
      { name: 'subscriptions', columns: ['id', 'tenant_id', 'plan', 'status', 'billing_cycle'], rowCount: 45 },
      { name: 'analytics', columns: ['id', 'tenant_id', 'event', 'data', 'timestamp'], rowCount: 15000 },
      { name: 'api_keys', columns: ['id', 'tenant_id', 'key', 'permissions', 'expires_at'], rowCount: 180 },
      { name: 'webhooks', columns: ['id', 'tenant_id', 'url', 'events', 'secret'], rowCount: 90 },
      { name: 'billing', columns: ['id', 'tenant_id', 'amount', 'status', 'due_date'], rowCount: 135 },
      { name: 'notifications', columns: ['id', 'user_id', 'type', 'message', 'read'], rowCount: 2100 }
    ]
  },
  {
    id: 'test_cms_nextjs',
    name: 'CMS Platform (Next.js)',
    description: 'Headless CMS built with Next.js and PostgreSQL',
    technology: 'nextjs',
    framework: 'Next.js',
    database: 'postgresql',
    icon: '📰',
    color: 'purple',
    tables: [
      { name: 'content_types', columns: ['id', 'name', 'schema', 'created_at'], rowCount: 12 },
      { name: 'content_entries', columns: ['id', 'type_id', 'title', 'slug', 'data', 'status'], rowCount: 2500 },
      { name: 'media_library', columns: ['id', 'filename', 'path', 'type', 'size', 'alt_text'], rowCount: 1200 },
      { name: 'users', columns: ['id', 'username', 'email', 'role', 'permissions'], rowCount: 25 },
      { name: 'workflows', columns: ['id', 'name', 'steps', 'active'], rowCount: 8 },
      { name: 'publications', columns: ['id', 'entry_id', 'version', 'published_at'], rowCount: 1800 },
      { name: 'webhooks', columns: ['id', 'event', 'url', 'secret', 'active'], rowCount: 15 },
      { name: 'api_logs', columns: ['id', 'endpoint', 'method', 'status', 'timestamp'], rowCount: 5000 }
    ]
  },
  {
    id: 'test_inventory_rails',
    name: 'Inventory System (Ruby on Rails)',
    description: 'Enterprise inventory management with Ruby on Rails and MySQL',
    technology: 'rails',
    framework: 'Ruby on Rails',
    database: 'mysql',
    icon: '📦',
    color: 'red',
    tables: [
      { name: 'products', columns: ['id', 'sku', 'name', 'description', 'category_id'], rowCount: 5000 },
      { name: 'inventory', columns: ['id', 'product_id', 'warehouse_id', 'quantity', 'reserved'], rowCount: 15000 },
      { name: 'warehouses', columns: ['id', 'name', 'address', 'capacity', 'manager_id'], rowCount: 12 },
      { name: 'suppliers', columns: ['id', 'name', 'contact', 'email', 'phone'], rowCount: 150 },
      { name: 'purchase_orders', columns: ['id', 'supplier_id', 'status', 'total', 'created_at'], rowCount: 800 },
      { name: 'shipments', columns: ['id', 'order_id', 'tracking', 'status', 'shipped_at'], rowCount: 1200 },
      { name: 'transactions', columns: ['id', 'product_id', 'type', 'quantity', 'reason'], rowCount: 25000 },
      { name: 'reports', columns: ['id', 'type', 'data', 'generated_at', 'user_id'], rowCount: 300 }
    ]
  },
  {
    id: 'test_social_react',
    name: 'Social Network (React)',
    description: 'Social media platform with React and SQLite',
    technology: 'react',
    framework: 'React',
    database: 'sqlite',
    icon: '👥',
    color: 'blue',
    tables: [
      { name: 'users', columns: ['id', 'username', 'email', 'bio', 'avatar', 'created_at'], rowCount: 5000 },
      { name: 'posts', columns: ['id', 'user_id', 'content', 'image', 'likes', 'created_at'], rowCount: 25000 },
      { name: 'follows', columns: ['follower_id', 'following_id', 'created_at'], rowCount: 15000 },
      { name: 'comments', columns: ['id', 'post_id', 'user_id', 'content', 'created_at'], rowCount: 45000 },
      { name: 'likes', columns: ['user_id', 'post_id', 'created_at'], rowCount: 80000 },
      { name: 'messages', columns: ['id', 'sender_id', 'receiver_id', 'content', 'read'], rowCount: 12000 },
      { name: 'notifications', columns: ['id', 'user_id', 'type', 'data', 'read'], rowCount: 30000 },
      { name: 'hashtags', columns: ['id', 'name', 'usage_count'], rowCount: 500 }
    ]
  },
  {
    id: 'test_finance_spring',
    name: 'Finance App (Spring Boot)',
    description: 'Personal finance management with Spring Boot and PostgreSQL',
    technology: 'spring',
    framework: 'Spring Boot',
    database: 'postgresql',
    icon: '💰',
    color: 'green',
    tables: [
      { name: 'accounts', columns: ['id', 'user_id', 'name', 'type', 'balance', 'currency'], rowCount: 2500 },
      { name: 'transactions', columns: ['id', 'account_id', 'amount', 'description', 'category', 'date'], rowCount: 50000 },
      { name: 'categories', columns: ['id', 'name', 'type', 'color', 'icon'], rowCount: 50 },
      { name: 'budgets', columns: ['id', 'user_id', 'category_id', 'amount', 'period'], rowCount: 800 },
      { name: 'goals', columns: ['id', 'user_id', 'name', 'target_amount', 'current_amount'], rowCount: 300 },
      { name: 'investments', columns: ['id', 'user_id', 'symbol', 'shares', 'purchase_price'], rowCount: 1200 },
      { name: 'reports', columns: ['id', 'user_id', 'type', 'data', 'generated_at'], rowCount: 150 },
      { name: 'alerts', columns: ['id', 'user_id', 'type', 'message', 'triggered_at'], rowCount: 400 }
    ]
  },
  {
    id: 'test_iot_nodejs',
    name: 'IoT Dashboard (Node.js)',
    description: 'IoT device monitoring with Node.js and SQLite',
    technology: 'nodejs',
    framework: 'Node.js',
    database: 'sqlite',
    icon: '🌐',
    color: 'orange',
    tables: [
      { name: 'devices', columns: ['id', 'name', 'type', 'location', 'status', 'last_seen'], rowCount: 200 },
      { name: 'sensors', columns: ['id', 'device_id', 'type', 'unit', 'min_value', 'max_value'], rowCount: 800 },
      { name: 'readings', columns: ['id', 'sensor_id', 'value', 'timestamp', 'quality'], rowCount: 100000 },
      { name: 'alerts', columns: ['id', 'device_id', 'sensor_id', 'condition', 'threshold'], rowCount: 150 },
      { name: 'users', columns: ['id', 'username', 'email', 'role', 'permissions'], rowCount: 25 },
      { name: 'dashboards', columns: ['id', 'user_id', 'name', 'layout', 'widgets'], rowCount: 50 },
      { name: 'rules', columns: ['id', 'name', 'condition', 'action', 'enabled'], rowCount: 30 },
      { name: 'logs', columns: ['id', 'device_id', 'level', 'message', 'timestamp'], rowCount: 5000 }
    ]
  }
];

async function createTestDatabase(project) {
  const dbPath = path.join(__dirname, 'test-databases', `${project.id}.db`);
  const dbDir = path.dirname(dbPath);
  
  // Create directory if it doesn't exist
  await fs.mkdir(dbDir, { recursive: true });
  
  const db = new Database(dbPath);
  
  console.log(`📊 Creating database for ${project.name}...`);
  
  // Create tables with sample data
  for (const table of project.tables) {
    const columns = table.columns.map(col => `${col} TEXT`).join(', ');
    const createTableSQL = `CREATE TABLE IF NOT EXISTS ${table.name} (${columns})`;
    db.exec(createTableSQL);
    
    // Insert sample data
    const placeholders = table.columns.map(() => '?').join(', ');
    const insertSQL = `INSERT INTO ${table.name} (${table.columns.join(', ')}) VALUES (${placeholders})`;
    
    const stmt = db.prepare(insertSQL);
    
    for (let i = 0; i < table.rowCount; i++) {
      const rowData = table.columns.map(col => {
        if (col === 'id') return i + 1;
        if (col.includes('email')) return `user${i + 1}@example.com`;
        if (col.includes('username') || col.includes('name')) return `${table.name}_${i + 1}`;
        if (col.includes('created_at') || col.includes('timestamp')) return new Date().toISOString();
        if (col.includes('amount') || col.includes('price') || col.includes('balance')) return (Math.random() * 1000).toFixed(2);
        if (col.includes('quantity') || col.includes('count')) return Math.floor(Math.random() * 100) + 1;
        if (col.includes('status')) return ['active', 'inactive', 'pending'][Math.floor(Math.random() * 3)];
        if (col.includes('type')) return ['primary', 'secondary', 'admin'][Math.floor(Math.random() * 3)];
        return `sample_${col}_${i + 1}`;
      });
      
      stmt.run(rowData);
    }
    
    console.log(`   ✅ Created table ${table.name} with ${table.rowCount} rows`);
  }
  
  db.close();
  console.log(`✅ Database created: ${dbPath}`);
  return dbPath;
}

async function createProjectFiles(project) {
  const projectDir = path.join(__dirname, 'test-projects', project.id);
  await fs.mkdir(projectDir, { recursive: true });
  
  // Create framework-specific files
  const files = [];
  
  if (project.framework === 'Django') {
    files.push(
      { path: 'models.py', content: generateDjangoModels(project) },
      { path: 'views.py', content: generateDjangoViews(project) },
      { path: 'urls.py', content: generateDjangoUrls(project) },
      { path: 'settings.py', content: generateDjangoSettings(project) }
    );
  } else if (project.framework === 'Laravel') {
    files.push(
      { path: 'app/Models/User.php', content: generateLaravelModels(project) },
      { path: 'app/Http/Controllers/PostController.php', content: generateLaravelControllers(project) },
      { path: 'routes/web.php', content: generateLaravelRoutes(project) },
      { path: 'database/migrations/2024_01_01_000000_create_posts_table.php', content: generateLaravelMigrations(project) }
    );
  } else if (project.framework === 'Express.js') {
    files.push(
      { path: 'app.js', content: generateExpressApp(project) },
      { path: 'routes/api.js', content: generateExpressRoutes(project) },
      { path: 'models/User.js', content: generateExpressModels(project) },
      { path: 'package.json', content: generatePackageJson(project) }
    );
  } else if (project.framework === 'Next.js') {
    files.push(
      { path: 'pages/api/posts.js', content: generateNextApi(project) },
      { path: 'components/PostList.js', content: generateNextComponents(project) },
      { path: 'lib/db.js', content: generateNextDb(project) },
      { path: 'package.json', content: generatePackageJson(project) }
    );
  } else if (project.framework === 'Ruby on Rails') {
    files.push(
      { path: 'app/models/product.rb', content: generateRailsModels(project) },
      { path: 'app/controllers/products_controller.rb', content: generateRailsControllers(project) },
      { path: 'config/routes.rb', content: generateRailsRoutes(project) },
      { path: 'db/migrate/20240101000001_create_products.rb', content: generateRailsMigrations(project) }
    );
  } else if (project.framework === 'React') {
    files.push(
      { path: 'src/components/Post.js', content: generateReactComponents(project) },
      { path: 'src/services/api.js', content: generateReactApi(project) },
      { path: 'src/App.js', content: generateReactApp(project) },
      { path: 'package.json', content: generatePackageJson(project) }
    );
  } else if (project.framework === 'Spring Boot') {
    files.push(
      { path: 'src/main/java/com/example/Account.java', content: generateSpringModels(project) },
      { path: 'src/main/java/com/example/AccountController.java', content: generateSpringControllers(project) },
      { path: 'src/main/resources/application.properties', content: generateSpringConfig(project) },
      { path: 'pom.xml', content: generateMavenPom(project) }
    );
  } else if (project.framework === 'Node.js') {
    files.push(
      { path: 'server.js', content: generateNodeServer(project) },
      { path: 'routes/devices.js', content: generateNodeRoutes(project) },
      { path: 'models/Device.js', content: generateNodeModels(project) },
      { path: 'package.json', content: generatePackageJson(project) }
    );
  }
  
  // Write files
  for (const file of files) {
    const filePath = path.join(projectDir, file.path);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, file.content);
  }
  
  console.log(`✅ Created ${files.length} files for ${project.name}`);
  return projectDir;
}

// Framework-specific code generators
function generateDjangoModels(project) {
  return `from django.db import models
from django.contrib.auth.models import User

class ${project.tables[0].name.charAt(0).toUpperCase() + project.tables[0].name.slice(1)}(models.Model):
    ${project.tables[0].columns.slice(1).map(col => `${col} = models.CharField(max_length=255)`).join('\n    ')}
    
    class Meta:
        db_table = '${project.tables[0].name}'
`;
}

function generateLaravelModels(project) {
  return `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Model;

class User extends Model
{
    protected $fillable = [${project.tables[0].columns.slice(1).map(col => `'${col}'`).join(', ')}];
    
    protected $table = '${project.tables[0].name}';
}
`;
}

function generateExpressApp(project) {
  return `const express = require('express');
const app = express();

app.use(express.json());

// Routes
app.use('/api', require('./routes/api'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('Server running on port ' + PORT);
});
`;
}

function generateNextApi(project) {
  return `export default function handler(req, res) {
    res.status(200).json({ 
        message: '${project.name} API',
        tables: ${JSON.stringify(project.tables.map(t => t.name))}
    });
}
`;
}

function generateRailsModels(project) {
  return `class Product < ApplicationRecord
    validates :name, presence: true
    validates :price, presence: true, numericality: { greater_than: 0 }
    
    belongs_to :category, optional: true
    has_many :order_items
end
`;
}

function generateReactComponents(project) {
  return `import React from 'react';

const Post = ({ post }) => {
    return (
        <div className="post">
            <h3>{post.title}</h3>
            <p>{post.content}</p>
        </div>
    );
};

export default Post;
`;
}

function generateSpringModels(project) {
  return `package com.example;

import javax.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "accounts")
public class Account {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String name;
    private String type;
    private BigDecimal balance;
    private String currency;
    
    // Getters and setters
}
`;
}

function generateNodeServer(project) {
  return `const express = require('express');
const sqlite3 = require('sqlite3');
const app = express();

const db = new sqlite3.Database('./${project.id}.db');

app.use(express.json());

app.get('/api/devices', (req, res) => {
    db.all('SELECT * FROM devices', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('IoT Dashboard running on port ' + PORT);
});
`;
}

function generateExpressRoutes(project) {
  return `const express = require('express');
const router = express.Router();

router.get('/${project.tables[0].name}', (req, res) => {
    res.json({ message: '${project.tables[0].name} endpoint' });
});

module.exports = router;
`;
}

function generateExpressModels(project) {
  return `const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    ${project.tables[0].columns.slice(1).map(col => `${col}: String`).join(',\n    ')}
});

module.exports = mongoose.model('User', userSchema);
`;
}

function generateNextComponents(project) {
  return `import React from 'react';

const PostList = ({ posts }) => {
    return (
        <div className="post-list">
            {posts.map(post => (
                <div key={post.id} className="post">
                    <h3>{post.title}</h3>
                    <p>{post.content}</p>
                </div>
            ))}
        </div>
    );
};

export default PostList;
`;
}

function generateNextDb(project) {
  return `import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export default pool;
`;
}

function generateLaravelControllers(project) {
  return `<?php

namespace App\\Http\\Controllers;

use Illuminate\\Http\\Request;

class PostController extends Controller
{
    public function index()
    {
        return response()->json(['message' => 'Posts endpoint']);
    }
}
`;
}

function generateLaravelRoutes(project) {
  return `<?php

use Illuminate\\Support\\Facades\\Route;

Route::get('/posts', [App\\Http\\Controllers\\PostController::class, 'index']);
`;
}

function generateLaravelMigrations(project) {
  return `<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

class CreatePostsTable extends Migration
{
    public function up()
    {
        Schema::create('posts', function (Blueprint $table) {
            $table->id();
            ${project.tables[0].columns.slice(1).map(col => `$table->string('${col}');`).join('\n            ')}
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('posts');
    }
}
`;
}

function generateRailsControllers(project) {
  return `class ProductsController < ApplicationController
    def index
        @products = Product.all
        render json: @products
    end
end
`;
}

function generateRailsRoutes(project) {
  return `Rails.application.routes.draw do
    resources :products
end
`;
}

function generateRailsMigrations(project) {
  return `class CreateProducts < ActiveRecord::Migration[7.0]
    def change
        create_table :products do |t|
            ${project.tables[0].columns.slice(1).map(col => `t.string :${col}`).join('\n            ')}
            t.timestamps
        end
    end
end
`;
}

function generateSpringControllers(project) {
  return `package com.example;

import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/accounts")
public class AccountController {
    
    @GetMapping
    public List<Account> getAllAccounts() {
        return List.of();
    }
}
`;
}

function generateSpringConfig(project) {
  return `spring.datasource.url=jdbc:postgresql://localhost:5432/${project.id}
spring.datasource.username=postgres
spring.datasource.password=password
spring.jpa.hibernate.ddl-auto=update
`;
}

function generateMavenPom(project) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.example</groupId>
    <artifactId>${project.id}</artifactId>
    <version>1.0.0</version>
    <packaging>jar</packaging>
    
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>2.7.0</version>
    </parent>
    
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
    </dependencies>
</project>
`;
}

function generateNodeRoutes(project) {
  return `const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.json({ message: 'Devices endpoint' });
});

module.exports = router;
`;
}

function generateNodeModels(project) {
  return `const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
    name: String,
    type: String,
    location: String,
    status: String,
    last_seen: Date
});

module.exports = mongoose.model('Device', deviceSchema);
`;
}

function generateReactApi(project) {
  return `const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export const api = {
    getPosts: () => fetch(\`\${API_BASE_URL}/api/posts\`).then(res => res.json()),
    createPost: (post) => fetch(\`\${API_BASE_URL}/api/posts\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(post)
    }).then(res => res.json())
};
`;
}

function generateReactApp(project) {
  return `import React, { useState, useEffect } from 'react';
import PostList from './components/PostList';
import { api } from './services/api';
import './App.css';

function App() {
    const [posts, setPosts] = useState([]);

    useEffect(() => {
        api.getPosts().then(setPosts);
    }, []);

    return (
        <div className="App">
            <header className="App-header">
                <h1>${project.name}</h1>
                <PostList posts={posts} />
            </header>
        </div>
    );
}

export default App;
`;
}

function generatePackageJson(project) {
  return JSON.stringify({
    name: project.id,
    version: "1.0.0",
    description: project.description,
    main: "app.js",
    scripts: {
      start: "node app.js",
      dev: "nodemon app.js"
    },
    dependencies: {
      express: "^4.18.0",
      sqlite3: "^5.1.0",
      mongoose: "^6.0.0"
    },
    devDependencies: {
      nodemon: "^2.0.0"
    }
  }, null, 2);
}

async function main() {
  console.log('🚀 Creating 8 test projects...\n');
  
  for (const project of testProjects) {
    console.log(`\n📁 Creating project: ${project.name}`);
    console.log(`   Framework: ${project.framework}`);
    console.log(`   Database: ${project.database}`);
    console.log(`   Tables: ${project.tables.length}`);
    
    try {
      // Create database
      const dbPath = await createTestDatabase(project);
      
      // Create project files
      const projectDir = await createProjectFiles(project);
      
      console.log(`✅ Project created successfully!`);
      console.log(`   Database: ${dbPath}`);
      console.log(`   Files: ${projectDir}`);
      
    } catch (error) {
      console.error(`❌ Failed to create project ${project.name}:`, error.message);
    }
  }
  
  console.log('\n🎉 All test projects created successfully!');
  console.log('\n📋 Summary:');
  testProjects.forEach(project => {
    console.log(`   ${project.icon} ${project.name} (${project.framework}) - ${project.tables.length} tables`);
  });
  
  console.log('\n💡 Next steps:');
  console.log('   1. Upload these projects through the QueryFlow interface');
  console.log('   2. Test the table counts in the projects tab');
  console.log('   3. Verify the data accuracy matches the extraction results');
}

main().catch(console.error);
