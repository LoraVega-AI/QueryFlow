// Example database connection configurations for testing
// These are sample configurations that can be used to test the database connection functionality

export interface DatabaseExample {
  name: string;
  type: 'mysql' | 'postgresql' | 'sqlite';
  description: string;
  credentials: {
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    database?: string;
    filePath?: string;
  };
  notes?: string;
}

export const DATABASE_EXAMPLES: DatabaseExample[] = [
  {
    name: 'Local MySQL',
    type: 'mysql',
    description: 'Connect to a local MySQL database',
    credentials: {
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'password',
      database: 'test'
    },
    notes: 'Make sure MySQL is running locally with these credentials'
  },
  {
    name: 'Local PostgreSQL',
    type: 'postgresql',
    description: 'Connect to a local PostgreSQL database',
    credentials: {
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'password',
      database: 'postgres'
    },
    notes: 'Make sure PostgreSQL is running locally with these credentials'
  },
  {
    name: 'SQLite In-Memory',
    type: 'sqlite',
    description: 'Create an in-memory SQLite database',
    credentials: {
      filePath: ':memory:'
    },
    notes: 'This creates a temporary database that exists only during the session'
  },
  {
    name: 'SQLite File',
    type: 'sqlite',
    description: 'Connect to a SQLite database file',
    credentials: {
      filePath: './database.db'
    },
    notes: 'This will create database.db in the project root if it doesn\'t exist'
  },
  {
    name: 'Remote MySQL',
    type: 'mysql',
    description: 'Connect to a remote MySQL database',
    credentials: {
      host: 'your-mysql-host.com',
      port: 3306,
      username: 'your_username',
      password: 'your_password',
      database: 'your_database'
    },
    notes: 'Replace with your actual remote database credentials'
  },
  {
    name: 'Remote PostgreSQL',
    type: 'postgresql',
    description: 'Connect to a remote PostgreSQL database',
    credentials: {
      host: 'your-postgres-host.com',
      port: 5432,
      username: 'your_username',
      password: 'your_password',
      database: 'your_database'
    },
    notes: 'Replace with your actual remote database credentials'
  }
];

export const getExampleCredentials = (type: 'mysql' | 'postgresql' | 'sqlite'): DatabaseExample | undefined => {
  return DATABASE_EXAMPLES.find(example => example.type === type);
};

export const getAllExamplesForType = (type: 'mysql' | 'postgresql' | 'sqlite'): DatabaseExample[] => {
  return DATABASE_EXAMPLES.filter(example => example.type === type);
};
