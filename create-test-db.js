const Database = require('better-sqlite3');
const fs = require('fs');

// Create a test SQLite database with actual tables and data
function createTestDatabase() {
  console.log('🏗️ Creating test SQLite database with real tables...');
  
  // Remove existing test database if it exists
  if (fs.existsSync('law_database.sqlite')) {
    fs.unlinkSync('law_database.sqlite');
  }
  
  const db = new Database('law_database.sqlite');
  
  try {
    // Create tables with real schema
    console.log('📋 Creating tables...');
    
    // Cases table
    db.exec(`
      CREATE TABLE cases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_number VARCHAR(50) UNIQUE NOT NULL,
        title TEXT NOT NULL,
        court VARCHAR(100) NOT NULL,
        filed_date DATE,
        status VARCHAR(20) DEFAULT 'active',
        priority INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Clients table
    db.exec(`
      CREATE TABLE clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        email VARCHAR(100) UNIQUE,
        phone VARCHAR(20),
        address TEXT,
        date_of_birth DATE,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Lawyers table
    db.exec(`
      CREATE TABLE lawyers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bar_number VARCHAR(20) UNIQUE NOT NULL,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        specialization VARCHAR(100),
        email VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        hourly_rate DECIMAL(10,2),
        years_experience INTEGER,
        is_partner BOOLEAN DEFAULT 0,
        hire_date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Case assignments (with foreign keys)
    db.exec(`
      CREATE TABLE case_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER NOT NULL,
        lawyer_id INTEGER NOT NULL,
        client_id INTEGER NOT NULL,
        assignment_date DATE DEFAULT CURRENT_DATE,
        role VARCHAR(50) DEFAULT 'attorney',
        is_lead BOOLEAN DEFAULT 0,
        FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
        FOREIGN KEY (lawyer_id) REFERENCES lawyers(id) ON DELETE CASCADE,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      )
    `);
    
    // Documents table
    db.exec(`
      CREATE TABLE documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER NOT NULL,
        filename VARCHAR(255) NOT NULL,
        document_type VARCHAR(50),
        file_size INTEGER,
        uploaded_by INTEGER,
        upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_confidential BOOLEAN DEFAULT 0,
        FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
        FOREIGN KEY (uploaded_by) REFERENCES lawyers(id)
      )
    `);
    
    // Billing table
    db.exec(`
      CREATE TABLE billing (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER NOT NULL,
        lawyer_id INTEGER NOT NULL,
        description TEXT NOT NULL,
        hours_worked DECIMAL(4,2) NOT NULL,
        hourly_rate DECIMAL(10,2) NOT NULL,
        total_amount DECIMAL(10,2) GENERATED ALWAYS AS (hours_worked * hourly_rate) STORED,
        bill_date DATE DEFAULT CURRENT_DATE,
        is_billed BOOLEAN DEFAULT 0,
        FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
        FOREIGN KEY (lawyer_id) REFERENCES lawyers(id) ON DELETE CASCADE
      )
    `);
    
    // Court hearings table
    db.exec(`
      CREATE TABLE court_hearings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER NOT NULL,
        hearing_date DATETIME NOT NULL,
        court_room VARCHAR(20),
        hearing_type VARCHAR(50),
        judge_name VARCHAR(100),
        notes TEXT,
        outcome VARCHAR(50),
        next_hearing_date DATETIME,
        FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
      )
    `);
    
    // Legal precedents table
    db.exec(`
      CREATE TABLE legal_precedents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        citation VARCHAR(100) UNIQUE NOT NULL,
        case_name TEXT NOT NULL,
        court VARCHAR(100) NOT NULL,
        decision_date DATE,
        summary TEXT,
        legal_principle TEXT,
        jurisdiction VARCHAR(50),
        relevance_score INTEGER DEFAULT 1
      )
    `);
    
    // Create indexes for better performance
    console.log('🔗 Creating indexes...');
    db.exec(`CREATE INDEX idx_cases_status ON cases(status)`);
    db.exec(`CREATE INDEX idx_cases_court ON cases(court)`);
    db.exec(`CREATE INDEX idx_clients_email ON clients(email)`);
    db.exec(`CREATE INDEX idx_lawyers_specialization ON lawyers(specialization)`);
    db.exec(`CREATE INDEX idx_case_assignments_case_id ON case_assignments(case_id)`);
    db.exec(`CREATE INDEX idx_documents_case_id ON documents(case_id)`);
    db.exec(`CREATE INDEX idx_billing_case_id ON billing(case_id)`);
    db.exec(`CREATE UNIQUE INDEX idx_case_assignments_unique ON case_assignments(case_id, lawyer_id, client_id)`);
    
    // Insert sample data
    console.log('📝 Inserting sample data...');
    
    // Sample cases
    const insertCase = db.prepare(`
      INSERT INTO cases (case_number, title, court, filed_date, status, priority)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    insertCase.run('CV-2024-001', 'Smith vs. Johnson Contract Dispute', 'Superior Court', '2024-01-15', 'active', 2);
    insertCase.run('CR-2024-002', 'State vs. Anderson DUI', 'Municipal Court', '2024-02-01', 'pending', 1);
    insertCase.run('CV-2024-003', 'Wilson Personal Injury Claim', 'District Court', '2024-02-10', 'active', 3);
    insertCase.run('CV-2024-004', 'Tech Corp Patent Infringement', 'Federal Court', '2024-01-20', 'discovery', 3);
    insertCase.run('FAM-2024-005', 'Brown Divorce Proceedings', 'Family Court', '2024-03-01', 'mediation', 2);
    
    // Sample clients
    const insertClient = db.prepare(`
      INSERT INTO clients (first_name, last_name, email, phone, address, date_of_birth)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    insertClient.run('John', 'Smith', 'john.smith@email.com', '555-0101', '123 Main St, Anytown', '1980-05-15');
    insertClient.run('Michael', 'Anderson', 'mike.anderson@email.com', '555-0102', '456 Oak Ave, Somewhere', '1975-12-03');
    insertClient.run('Sarah', 'Wilson', 'sarah.wilson@email.com', '555-0103', '789 Pine Rd, Elsewhere', '1988-09-22');
    insertClient.run('Tech', 'Corporation', 'legal@techcorp.com', '555-0104', '100 Business Plaza, Metropolis', null);
    insertClient.run('Jennifer', 'Brown', 'jen.brown@email.com', '555-0105', '321 Elm St, Smalltown', '1985-03-18');
    
    // Sample lawyers
    const insertLawyer = db.prepare(`
      INSERT INTO lawyers (bar_number, first_name, last_name, specialization, email, phone, hourly_rate, years_experience, is_partner, hire_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    insertLawyer.run('BAR123456', 'Robert', 'Davis', 'Contract Law', 'rdavis@lawfirm.com', '555-1001', 350.00, 15, 1, '2010-06-01');
    insertLawyer.run('BAR789012', 'Emily', 'Rodriguez', 'Criminal Defense', 'erodriguez@lawfirm.com', '555-1002', 275.00, 8, 0, '2016-09-15');
    insertLawyer.run('BAR345678', 'David', 'Thompson', 'Personal Injury', 'dthompson@lawfirm.com', '555-1003', 325.00, 12, 1, '2012-03-20');
    insertLawyer.run('BAR901234', 'Lisa', 'Chen', 'Intellectual Property', 'lchen@lawfirm.com', '555-1004', 400.00, 10, 0, '2014-11-10');
    insertLawyer.run('BAR567890', 'Mark', 'Johnson', 'Family Law', 'mjohnson@lawfirm.com', '555-1005', 250.00, 6, 0, '2018-01-08');
    
    // Sample case assignments
    const insertAssignment = db.prepare(`
      INSERT INTO case_assignments (case_id, lawyer_id, client_id, assignment_date, role, is_lead)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    insertAssignment.run(1, 1, 1, '2024-01-16', 'lead attorney', 1);
    insertAssignment.run(2, 2, 2, '2024-02-02', 'defense attorney', 1);
    insertAssignment.run(3, 3, 3, '2024-02-11', 'lead attorney', 1);
    insertAssignment.run(4, 4, 4, '2024-01-21', 'lead attorney', 1);
    insertAssignment.run(5, 5, 5, '2024-03-02', 'family attorney', 1);
    
    // Sample documents
    const insertDocument = db.prepare(`
      INSERT INTO documents (case_id, filename, document_type, file_size, uploaded_by, is_confidential)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    insertDocument.run(1, 'contract_original.pdf', 'Contract', 245760, 1, 0);
    insertDocument.run(1, 'correspondence.pdf', 'Letter', 89432, 1, 1);
    insertDocument.run(2, 'police_report.pdf', 'Evidence', 156890, 2, 0);
    insertDocument.run(3, 'medical_records.pdf', 'Medical', 532100, 3, 1);
    insertDocument.run(4, 'patent_application.pdf', 'Patent', 1245760, 4, 1);
    
    // Sample billing entries
    const insertBilling = db.prepare(`
      INSERT INTO billing (case_id, lawyer_id, description, hours_worked, hourly_rate, bill_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    insertBilling.run(1, 1, 'Contract review and analysis', 4.5, 350.00, '2024-01-20');
    insertBilling.run(1, 1, 'Client consultation and strategy meeting', 2.0, 350.00, '2024-01-22');
    insertBilling.run(2, 2, 'Case preparation and research', 6.0, 275.00, '2024-02-05');
    insertBilling.run(3, 3, 'Initial case assessment', 3.5, 325.00, '2024-02-12');
    insertBilling.run(4, 4, 'Patent research and prior art analysis', 8.5, 400.00, '2024-01-25');
    
    console.log('✅ Successfully created law_database.sqlite with 8 tables and sample data');
    
    // Get database statistics
    const stats = {
      cases: db.prepare('SELECT COUNT(*) as count FROM cases').get().count,
      clients: db.prepare('SELECT COUNT(*) as count FROM clients').get().count,
      lawyers: db.prepare('SELECT COUNT(*) as count FROM lawyers').get().count,
      case_assignments: db.prepare('SELECT COUNT(*) as count FROM case_assignments').get().count,
      documents: db.prepare('SELECT COUNT(*) as count FROM documents').get().count,
      billing: db.prepare('SELECT COUNT(*) as count FROM billing').get().count,
      court_hearings: db.prepare('SELECT COUNT(*) as count FROM court_hearings').get().count,
      legal_precedents: db.prepare('SELECT COUNT(*) as count FROM legal_precedents').get().count
    };
    
    console.log('📊 Database statistics:');
    Object.entries(stats).forEach(([table, count]) => {
      console.log(`   ${table}: ${count} rows`);
    });
    
    const totalRows = Object.values(stats).reduce((sum, count) => sum + count, 0);
    console.log(`   Total rows: ${totalRows}`);
    
  } finally {
    db.close();
  }
}

createTestDatabase();
