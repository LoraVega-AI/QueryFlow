# QueryFlow - Visual Database Builder

QueryFlow is a modern, web-based visual database builder that allows you to design database schemas, run SQL queries, and manage data through an intuitive drag-and-drop interface. Built with Next.js, React, and TailwindCSS.

![QueryFlow Logo](https://via.placeholder.com/400x100/3B82F6/FFFFFF?text=QueryFlow)

## ✨ Features

### 🎨 Visual Schema Designer
- **Drag-and-drop interface** for creating database tables
- **Interactive table nodes** with column management
- **Foreign key relationships** with visual connections
- **Real-time schema updates** with automatic persistence

### 🔍 Query Runner
- **SQL editor** with syntax highlighting and auto-completion
- **Query history** with quick access to previous queries
- **Sample queries** for common operations
- **Keyboard shortcuts** (Ctrl+Enter to execute)

### 📊 Results Viewer
- **Styled data grid** with sortable columns
- **Export functionality** (CSV format)
- **Copy to clipboard** for easy data sharing
- **Performance metrics** showing execution time

### 💾 Data Persistence
- **Local storage** for schemas and data
- **Automatic saving** of changes
- **Session persistence** across browser refreshes

### 🎯 Additional Features
- **Responsive design** for desktop and mobile
- **Modern UI** with TailwindCSS styling
- **TypeScript** for type safety
- **Modular architecture** for easy expansion

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/QueryFlow.git
   cd QueryFlow
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🏗️ Project Structure

```
QueryFlow/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── layout.tsx         # Root layout component
│   │   ├── page.tsx           # Main page component
│   │   └── globals.css        # Global styles
│   ├── components/            # React components
│   │   ├── Layout.tsx         # Main application layout
│   │   ├── SchemaDesigner.tsx # Visual schema designer
│   │   ├── QueryRunner.tsx    # SQL query interface
│   │   ├── ResultsViewer.tsx  # Query results display
│   │   ├── TableEditor.tsx    # Table structure editor
│   │   ├── nodes/             # React Flow custom nodes
│   │   │   └── TableNode.tsx  # Table node component
│   │   └── edges/             # React Flow custom edges
│   │       └── RelationshipEdge.tsx # Foreign key edge
│   ├── types/                 # TypeScript type definitions
│   │   └── database.ts        # Database schema types
│   └── utils/                 # Utility functions
│       ├── database.ts        # SQLite database manager
│       └── storage.ts         # Local storage utilities
├── package.json               # Dependencies and scripts
└── README.md                  # This file
```

## 🎮 Usage Guide

### Creating a Database Schema

1. **Start with the Schema Designer**
   - Click "Add Table" to create a new table
   - Double-click table names to rename them
   - Click the edit icon to open the detailed table editor

2. **Design Table Structure**
   - Add columns with different data types (TEXT, INTEGER, REAL, etc.)
   - Set primary keys and nullable constraints
   - Add default values for columns

3. **Create Relationships**
   - Drag from a column handle to another table's column
   - This creates a foreign key relationship
   - Visual indicators show the relationship type

### Running SQL Queries

1. **Switch to Query Runner**
   - Use the navigation to switch to the "Query Runner" tab
   - The interface splits into query editor and results viewer

2. **Write SQL Queries**
   - Use the built-in SQL editor
   - Try sample queries for common operations
   - Use Ctrl+Enter to execute queries quickly

3. **View Results**
   - Results appear in the styled data grid
   - Sort columns by clicking headers
   - Export data as CSV or copy to clipboard

### Managing Data

- **Insert Records**: Use INSERT statements in the query runner
- **Update Records**: Use UPDATE statements with WHERE clauses
- **Delete Records**: Use DELETE statements with WHERE clauses
- **View Data**: Use SELECT statements to query your data

## 🛠️ Technical Details

### Architecture

QueryFlow is built with a modular architecture that separates concerns:

- **Schema Management**: Handles database schema definitions and relationships
- **Query Execution**: Manages SQLite-WASM integration for query processing
- **Data Persistence**: Uses localStorage for client-side data storage
- **UI Components**: React components with TypeScript for type safety

### Key Technologies

- **Next.js 14**: React framework with App Router
- **React 18**: UI library with hooks and modern patterns
- **TypeScript**: Type-safe JavaScript development
- **TailwindCSS**: Utility-first CSS framework
- **React Flow**: Node-based editor for visual schema design
- **SQLite-WASM**: In-browser SQLite database engine

### Data Flow

1. **Schema Creation**: Users design tables in the visual interface
2. **Schema Storage**: Schemas are saved to localStorage automatically
3. **Query Processing**: SQL queries are executed against SQLite-WASM
4. **Result Display**: Query results are shown in a styled data grid
5. **Data Persistence**: All changes are automatically saved locally

## 🔧 Development

### Available Scripts

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Type checking
npm run type-check
```

### Adding New Features

The modular architecture makes it easy to add new features:

1. **New Components**: Add to `src/components/`
2. **New Types**: Extend `src/types/database.ts`
3. **New Utilities**: Add to `src/utils/`
4. **New Pages**: Add to `src/app/`

### Code Organization

- **Components**: Reusable UI components with clear interfaces
- **Types**: Centralized TypeScript definitions
- **Utils**: Pure functions for data manipulation
- **Storage**: Client-side persistence layer

## 🚀 Future Enhancements

### Planned Features

- **Export/Import**: Schema and data export in multiple formats
- **Advanced Data Types**: Support for more SQL data types
- **ERD Visualization**: Enhanced entity-relationship diagrams
- **Collaboration**: Multi-user editing capabilities
- **Cloud Storage**: Integration with cloud databases
- **Query Optimization**: Query performance analysis
- **Data Validation**: Schema validation and constraints

### Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **React Flow** for the excellent node-based editor
- **SQLite-WASM** for in-browser database capabilities
- **TailwindCSS** for the beautiful utility-first styling
- **Next.js** for the powerful React framework

## 📞 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Report bugs and request features on GitHub Issues
- **Discussions**: Join community discussions on GitHub Discussions

---

**QueryFlow** - Making database design visual and accessible for everyone! 🎯
