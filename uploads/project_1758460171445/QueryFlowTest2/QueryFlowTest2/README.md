# Law Database Test Project

A Node.js test project with SQLite database containing 5 law-themed tables for managing legal practice data.

## 🏛️ Database Schema

The project includes 5 interconnected tables:

1. **lawyers** - Legal professionals with specializations
2. **clients** - Individuals seeking legal services  
3. **cases** - Legal matters and proceedings
4. **court_hearings** - Scheduled court appearances
5. **legal_documents** - Case-related files and evidence

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Initialize the database:**
   ```bash
   npm run init-db
   ```

3. **Seed with sample data:**
   ```bash
   npm run seed-data
   ```

4. **Start the server:**
   ```bash
   npm start
   ```

The API will be available at `http://localhost:3000`

## 📊 API Endpoints

### Lawyers
- `GET /api/lawyers` - Get all lawyers
- `GET /api/lawyers/:id` - Get specific lawyer
- `POST /api/lawyers` - Create new lawyer

### Clients
- `GET /api/clients` - Get all clients
- `GET /api/clients/:id` - Get specific client

### Cases
- `GET /api/cases` - Get all cases with lawyer and client info
- `GET /api/cases/:id` - Get specific case details

### Court Hearings
- `GET /api/hearings` - Get all hearings
- `GET /api/hearings/case/:caseId` - Get hearings for specific case

### Legal Documents
- `GET /api/documents` - Get all documents
- `GET /api/documents/case/:caseId` - Get documents for specific case

### Statistics
- `GET /api/stats` - Get database statistics

## 🗃️ Sample Data

The database comes pre-populated with:

- **4 Lawyers** with different specializations:
  - Criminal Defense
  - Corporate Law  
  - Family Law
  - Personal Injury

- **4 Clients** with contact information

- **4 Legal Cases** across different practice areas:
  - Personal injury case
  - Divorce proceedings
  - Corporate merger
  - Criminal defense

- **4 Court Hearings** with various statuses

- **5 Legal Documents** with different types and confidentiality levels

## 🛠️ Development

### Available Scripts

- `npm start` - Start the server
- `npm run dev` - Start with nodemon for development
- `npm run init-db` - Initialize database tables
- `npm run seed-data` - Populate with sample data

### Database Structure

The database file is created as `law_database.db` in the project root and includes:

- Foreign key relationships between tables
- Proper indexing on key fields
- Data validation constraints
- Timestamps for audit trails

## 📝 Example API Usage

### Get all cases with details:
```bash
curl http://localhost:3000/api/cases
```

### Get statistics:
```bash
curl http://localhost:3000/api/stats
```

### Create a new lawyer:
```bash
curl -X POST http://localhost:3000/api/lawyers \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Jane",
    "last_name": "Doe", 
    "bar_number": "BAR999999",
    "specialization": "Environmental Law",
    "years_experience": 5,
    "email": "jane.doe@lawfirm.com",
    "phone": "(555) 999-0000"
  }'
```

## 🔧 Customization

You can modify the database schema by editing `scripts/init-database.js` and the sample data in `scripts/seed-data.js`.

## 📄 License

MIT License - feel free to use this project for testing and learning purposes.
