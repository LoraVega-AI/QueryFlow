const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database connection
const dbPath = path.join(__dirname, '..', 'law_database.db');
const db = new sqlite3.Database(dbPath);

// Create tables
const createTables = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 1. Lawyers table
      db.run(`
        CREATE TABLE IF NOT EXISTS lawyers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          bar_number TEXT UNIQUE NOT NULL,
          specialization TEXT NOT NULL,
          years_experience INTEGER NOT NULL,
          email TEXT UNIQUE NOT NULL,
          phone TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 2. Clients table
      db.run(`
        CREATE TABLE IF NOT EXISTS clients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          phone TEXT NOT NULL,
          address TEXT NOT NULL,
          date_of_birth DATE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 3. Cases table
      db.run(`
        CREATE TABLE IF NOT EXISTS cases (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          case_number TEXT UNIQUE NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          case_type TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('open', 'closed', 'pending', 'settled')),
          priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
          lawyer_id INTEGER NOT NULL,
          client_id INTEGER NOT NULL,
          filing_date DATE NOT NULL,
          court_name TEXT NOT NULL,
          estimated_value DECIMAL(15,2),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (lawyer_id) REFERENCES lawyers (id),
          FOREIGN KEY (client_id) REFERENCES clients (id)
        )
      `);

      // 4. Court Hearings table
      db.run(`
        CREATE TABLE IF NOT EXISTS court_hearings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          case_id INTEGER NOT NULL,
          hearing_type TEXT NOT NULL,
          hearing_date DATETIME NOT NULL,
          court_room TEXT NOT NULL,
          judge_name TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('scheduled', 'completed', 'cancelled', 'postponed')),
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (case_id) REFERENCES cases (id)
        )
      `);

      // 5. Legal Documents table
      db.run(`
        CREATE TABLE IF NOT EXISTS legal_documents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          case_id INTEGER NOT NULL,
          document_name TEXT NOT NULL,
          document_type TEXT NOT NULL,
          file_path TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          uploaded_by INTEGER NOT NULL,
          upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_confidential BOOLEAN DEFAULT 0,
          version TEXT DEFAULT '1.0',
          FOREIGN KEY (case_id) REFERENCES cases (id),
          FOREIGN KEY (uploaded_by) REFERENCES lawyers (id)
        )
      `, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
};

// Initialize database
const initDatabase = async () => {
  try {
    console.log('Initializing law database...');
    await createTables();
    console.log('Database tables created successfully!');
    console.log('Tables created:');
    console.log('- lawyers');
    console.log('- clients');
    console.log('- cases');
    console.log('- court_hearings');
    console.log('- legal_documents');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    db.close();
  }
};

// Run initialization
initDatabase();
