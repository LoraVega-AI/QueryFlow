const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Database connection
const dbPath = path.join(__dirname, 'law_database.db');
const db = new sqlite3.Database(dbPath);

// Helper function to run database queries
const runQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

// Helper function to run database inserts/updates
const runInsert = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
};

// Routes

// Home route
app.get('/', (req, res) => {
  res.json({
    message: 'Law Database API',
    version: '1.0.0',
    endpoints: {
      lawyers: '/api/lawyers',
      clients: '/api/clients',
      cases: '/api/cases',
      hearings: '/api/hearings',
      documents: '/api/documents'
    }
  });
});

// Lawyers endpoints
app.get('/api/lawyers', async (req, res) => {
  try {
    const lawyers = await runQuery('SELECT * FROM lawyers ORDER BY last_name');
    res.json(lawyers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/lawyers/:id', async (req, res) => {
  try {
    const lawyer = await runQuery('SELECT * FROM lawyers WHERE id = ?', [req.params.id]);
    if (lawyer.length === 0) {
      return res.status(404).json({ error: 'Lawyer not found' });
    }
    res.json(lawyer[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/lawyers', async (req, res) => {
  try {
    const { first_name, last_name, bar_number, specialization, years_experience, email, phone } = req.body;
    const result = await runInsert(
      'INSERT INTO lawyers (first_name, last_name, bar_number, specialization, years_experience, email, phone) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [first_name, last_name, bar_number, specialization, years_experience, email, phone]
    );
    res.status(201).json({ id: result.id, message: 'Lawyer created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clients endpoints
app.get('/api/clients', async (req, res) => {
  try {
    const clients = await runQuery('SELECT * FROM clients ORDER BY last_name');
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/clients/:id', async (req, res) => {
  try {
    const client = await runQuery('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    if (client.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json(client[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cases endpoints
app.get('/api/cases', async (req, res) => {
  try {
    const cases = await runQuery(`
      SELECT c.*, 
             l.first_name || ' ' || l.last_name as lawyer_name,
             cl.first_name || ' ' || cl.last_name as client_name
      FROM cases c
      JOIN lawyers l ON c.lawyer_id = l.id
      JOIN clients cl ON c.client_id = cl.id
      ORDER BY c.filing_date DESC
    `);
    res.json(cases);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/cases/:id', async (req, res) => {
  try {
    const caseData = await runQuery(`
      SELECT c.*, 
             l.first_name || ' ' || l.last_name as lawyer_name,
             cl.first_name || ' ' || cl.last_name as client_name
      FROM cases c
      JOIN lawyers l ON c.lawyer_id = l.id
      JOIN clients cl ON c.client_id = cl.id
      WHERE c.id = ?
    `, [req.params.id]);
    
    if (caseData.length === 0) {
      return res.status(404).json({ error: 'Case not found' });
    }
    res.json(caseData[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Court hearings endpoints
app.get('/api/hearings', async (req, res) => {
  try {
    const hearings = await runQuery(`
      SELECT h.*, c.case_number, c.title as case_title
      FROM court_hearings h
      JOIN cases c ON h.case_id = c.id
      ORDER BY h.hearing_date
    `);
    res.json(hearings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/hearings/case/:caseId', async (req, res) => {
  try {
    const hearings = await runQuery(`
      SELECT h.*, c.case_number, c.title as case_title
      FROM court_hearings h
      JOIN cases c ON h.case_id = c.id
      WHERE h.case_id = ?
      ORDER BY h.hearing_date
    `, [req.params.caseId]);
    res.json(hearings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Legal documents endpoints
app.get('/api/documents', async (req, res) => {
  try {
    const documents = await runQuery(`
      SELECT d.*, c.case_number, c.title as case_title,
             l.first_name || ' ' || l.last_name as uploaded_by_name
      FROM legal_documents d
      JOIN cases c ON d.case_id = c.id
      JOIN lawyers l ON d.uploaded_by = l.id
      ORDER BY d.upload_date DESC
    `);
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/documents/case/:caseId', async (req, res) => {
  try {
    const documents = await runQuery(`
      SELECT d.*, c.case_number, c.title as case_title,
             l.first_name || ' ' || l.last_name as uploaded_by_name
      FROM legal_documents d
      JOIN cases c ON d.case_id = c.id
      JOIN lawyers l ON d.uploaded_by = l.id
      WHERE d.case_id = ?
      ORDER BY d.upload_date DESC
    `, [req.params.caseId]);
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Statistics endpoint
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await Promise.all([
      runQuery('SELECT COUNT(*) as count FROM lawyers'),
      runQuery('SELECT COUNT(*) as count FROM clients'),
      runQuery('SELECT COUNT(*) as count FROM cases'),
      runQuery('SELECT COUNT(*) as count FROM court_hearings'),
      runQuery('SELECT COUNT(*) as count FROM legal_documents'),
      runQuery('SELECT COUNT(*) as count FROM cases WHERE status = "open"'),
      runQuery('SELECT COUNT(*) as count FROM cases WHERE status = "closed"')
    ]);

    res.json({
      total_lawyers: stats[0][0].count,
      total_clients: stats[1][0].count,
      total_cases: stats[2][0].count,
      total_hearings: stats[3][0].count,
      total_documents: stats[4][0].count,
      open_cases: stats[5][0].count,
      closed_cases: stats[6][0].count
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Law Database API server running on port ${PORT}`);
  console.log(`📊 Access the API at: http://localhost:${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /api/lawyers`);
  console.log(`   GET  /api/clients`);
  console.log(`   GET  /api/cases`);
  console.log(`   GET  /api/hearings`);
  console.log(`   GET  /api/documents`);
  console.log(`   GET  /api/stats`);
});
