# E-commerce API

A comprehensive e-commerce REST API built with Node.js, Express, and SQLite.

## Features

- User authentication and authorization
- Product management
- Shopping cart functionality
- Order processing
- Payment integration (simulated)
- Admin dashboard
- API documentation

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite3
- **Authentication**: JWT
- **Validation**: Custom middleware
- **Security**: Helmet, CORS, bcrypt

## Database Schema

### Users
- id (Primary Key)
- email (Unique)
- password (Hashed)
- first_name
- last_name
- created_at
- updated_at

### Products
- id (Primary Key)
- name
- description
- price
- category
- stock_quantity
- image_url
- created_at
- updated_at

### Orders
- id (Primary Key)
- user_id (Foreign Key)
- total_amount
- status
- shipping_address
- created_at
- updated_at

### Order Items
- id (Primary Key)
- order_id (Foreign Key)
- product_id (Foreign Key)
- quantity
- unit_price
- created_at

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Initialize database:
```bash
node init-db.js
```

3. Start the server:
```bash
npm start
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product (Admin)
- `PUT /api/products/:id` - Update product (Admin)

### Orders
- `GET /api/orders` - Get user orders
- `POST /api/orders` - Create new order
- `GET /api/orders/:id` - Get order details

## Configuration

Database configuration is in `config.js`:

```javascript
module.exports = {
  database: {
    filename: './database.sqlite'
  },
  server: {
    port: 3000,
    env: 'development'
  }
};
```
