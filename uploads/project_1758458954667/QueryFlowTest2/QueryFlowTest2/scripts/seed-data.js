const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database connection
const dbPath = path.join(__dirname, '..', 'law_database.db');
const db = new sqlite3.Database(dbPath);

// Sample data
const sampleData = {
  lawyers: [
    {
      first_name: 'Sarah',
      last_name: 'Johnson',
      bar_number: 'BAR123456',
      specialization: 'Criminal Defense',
      years_experience: 8,
      email: 'sarah.johnson@lawfirm.com',
      phone: '(555) 123-4567'
    },
    {
      first_name: 'Michael',
      last_name: 'Chen',
      bar_number: 'BAR789012',
      specialization: 'Corporate Law',
      years_experience: 12,
      email: 'michael.chen@lawfirm.com',
      phone: '(555) 234-5678'
    },
    {
      first_name: 'Emily',
      last_name: 'Rodriguez',
      bar_number: 'BAR345678',
      specialization: 'Family Law',
      years_experience: 6,
      email: 'emily.rodriguez@lawfirm.com',
      phone: '(555) 345-6789'
    },
    {
      first_name: 'David',
      last_name: 'Thompson',
      bar_number: 'BAR901234',
      specialization: 'Personal Injury',
      years_experience: 15,
      email: 'david.thompson@lawfirm.com',
      phone: '(555) 456-7890'
    }
  ],
  clients: [
    {
      first_name: 'John',
      last_name: 'Smith',
      email: 'john.smith@email.com',
      phone: '(555) 111-2222',
      address: '123 Main St, Anytown, ST 12345',
      date_of_birth: '1985-03-15'
    },
    {
      first_name: 'Maria',
      last_name: 'Garcia',
      email: 'maria.garcia@email.com',
      phone: '(555) 222-3333',
      address: '456 Oak Ave, Somewhere, ST 67890',
      date_of_birth: '1978-07-22'
    },
    {
      first_name: 'Robert',
      last_name: 'Wilson',
      email: 'robert.wilson@email.com',
      phone: '(555) 333-4444',
      address: '789 Pine Rd, Elsewhere, ST 13579',
      date_of_birth: '1992-11-08'
    },
    {
      first_name: 'Lisa',
      last_name: 'Brown',
      email: 'lisa.brown@email.com',
      phone: '(555) 444-5555',
      address: '321 Elm St, Nowhere, ST 24680',
      date_of_birth: '1989-05-30'
    }
  ],
  cases: [
    {
      case_number: 'CASE-2024-001',
      title: 'Smith vs. City of Anytown',
      description: 'Personal injury case involving slip and fall on city property',
      case_type: 'Personal Injury',
      status: 'open',
      priority: 'high',
      lawyer_id: 4,
      client_id: 1,
      filing_date: '2024-01-15',
      court_name: 'Anytown District Court',
      estimated_value: 50000.00
    },
    {
      case_number: 'CASE-2024-002',
      title: 'Garcia Divorce Proceedings',
      description: 'Divorce and child custody case',
      case_type: 'Family Law',
      status: 'pending',
      priority: 'medium',
      lawyer_id: 3,
      client_id: 2,
      filing_date: '2024-02-10',
      court_name: 'Family Court of Somewhere',
      estimated_value: 25000.00
    },
    {
      case_number: 'CASE-2024-003',
      title: 'Wilson Corporate Merger',
      description: 'Legal consultation for corporate merger and acquisition',
      case_type: 'Corporate Law',
      status: 'open',
      priority: 'urgent',
      lawyer_id: 2,
      client_id: 3,
      filing_date: '2024-03-05',
      court_name: 'Business Court',
      estimated_value: 100000.00
    },
    {
      case_number: 'CASE-2024-004',
      title: 'Brown Criminal Defense',
      description: 'DUI defense case',
      case_type: 'Criminal Defense',
      status: 'open',
      priority: 'high',
      lawyer_id: 1,
      client_id: 4,
      filing_date: '2024-03-20',
      court_name: 'Criminal Court of Nowhere',
      estimated_value: 15000.00
    }
  ],
  court_hearings: [
    {
      case_id: 1,
      hearing_type: 'Initial Hearing',
      hearing_date: '2024-04-15 09:00:00',
      court_room: 'Room 101',
      judge_name: 'Hon. Judge Anderson',
      status: 'scheduled',
      notes: 'Initial case review and discovery timeline'
    },
    {
      case_id: 2,
      hearing_type: 'Mediation',
      hearing_date: '2024-04-20 14:00:00',
      court_room: 'Mediation Room A',
      judge_name: 'Hon. Judge Martinez',
      status: 'scheduled',
      notes: 'Attempting to reach settlement agreement'
    },
    {
      case_id: 3,
      hearing_type: 'Motion Hearing',
      hearing_date: '2024-04-25 10:30:00',
      court_room: 'Room 205',
      judge_name: 'Hon. Judge Williams',
      status: 'scheduled',
      notes: 'Motion for expedited review'
    },
    {
      case_id: 4,
      hearing_type: 'Arraignment',
      hearing_date: '2024-04-18 08:30:00',
      court_room: 'Room 301',
      judge_name: 'Hon. Judge Davis',
      status: 'completed',
      notes: 'Client entered not guilty plea'
    }
  ],
  legal_documents: [
    {
      case_id: 1,
      document_name: 'Complaint.pdf',
      document_type: 'Legal Pleading',
      file_path: '/documents/case-001/complaint.pdf',
      file_size: 245760,
      uploaded_by: 4,
      is_confidential: 0,
      version: '1.0'
    },
    {
      case_id: 1,
      document_name: 'Medical Records.pdf',
      document_type: 'Evidence',
      file_path: '/documents/case-001/medical-records.pdf',
      file_size: 1024000,
      uploaded_by: 4,
      is_confidential: 1,
      version: '1.0'
    },
    {
      case_id: 2,
      document_name: 'Divorce Petition.pdf',
      document_type: 'Legal Pleading',
      file_path: '/documents/case-002/divorce-petition.pdf',
      file_size: 180000,
      uploaded_by: 3,
      is_confidential: 1,
      version: '1.0'
    },
    {
      case_id: 3,
      document_name: 'Merger Agreement.pdf',
      document_type: 'Contract',
      file_path: '/documents/case-003/merger-agreement.pdf',
      file_size: 2048000,
      uploaded_by: 2,
      is_confidential: 1,
      version: '2.1'
    },
    {
      case_id: 4,
      document_name: 'Police Report.pdf',
      document_type: 'Evidence',
      file_path: '/documents/case-004/police-report.pdf',
      file_size: 320000,
      uploaded_by: 1,
      is_confidential: 0,
      version: '1.0'
    }
  ]
};

// Function to insert data
const insertData = (tableName, data) => {
  return new Promise((resolve, reject) => {
    const columns = Object.keys(data[0]).join(', ');
    const placeholders = Object.keys(data[0]).map(() => '?').join(', ');
    const query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;
    
    const stmt = db.prepare(query);
    
    data.forEach((row, index) => {
      const values = Object.values(row);
      stmt.run(values, (err) => {
        if (err) {
          console.error(`Error inserting ${tableName} row ${index + 1}:`, err);
        }
      });
    });
    
    stmt.finalize((err) => {
      if (err) {
        reject(err);
      } else {
        console.log(`✓ Inserted ${data.length} records into ${tableName}`);
        resolve();
      }
    });
  });
};

// Seed database
const seedDatabase = async () => {
  try {
    console.log('Seeding law database with sample data...');
    
    await insertData('lawyers', sampleData.lawyers);
    await insertData('clients', sampleData.clients);
    await insertData('cases', sampleData.cases);
    await insertData('court_hearings', sampleData.court_hearings);
    await insertData('legal_documents', sampleData.legal_documents);
    
    console.log('\n✅ Database seeded successfully!');
    console.log('Sample data includes:');
    console.log('- 4 lawyers with different specializations');
    console.log('- 4 clients with contact information');
    console.log('- 4 legal cases across different practice areas');
    console.log('- 4 court hearings with various statuses');
    console.log('- 5 legal documents with different types');
    
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    db.close();
  }
};

// Run seeding
seedDatabase();
