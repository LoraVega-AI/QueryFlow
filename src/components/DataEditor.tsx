'use client';

// Data Editor component for direct data editing
// This component provides a table interface for viewing and editing database records

import React, { useState, useEffect, useCallback } from 'react';
import { DatabaseSchema, Table, DatabaseRecord, QueryResult, QueryError } from '@/types/database';
import { dbManager } from '@/utils/database';
import { Plus, Edit, Trash2, Save, X, RefreshCw } from 'lucide-react';

interface DataEditorProps {
  schema: DatabaseSchema | null;
}

interface EditingRecord {
  id: string | null;
  data: Record<string, any>;
  isNew: boolean;
}

export function DataEditor({ schema }: DataEditorProps) {
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [records, setRecords] = useState<DatabaseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<EditingRecord | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Load records when table is selected
  const loadRecords = useCallback(async () => {
    if (!selectedTable || !schema) return;

    setIsLoading(true);
    setError(null);

    try {
      // Initialize database and create tables
      await dbManager.initialize();
      await dbManager.createTablesFromSchema(schema);

      // Load existing records
      const result = await dbManager.executeQuery(`SELECT * FROM "${selectedTable.name}"`);
      
      // Convert query result to DatabaseRecord format
      const loadedRecords: DatabaseRecord[] = result.rows.map((row, index) => ({
        id: `record_${Date.now()}_${index}`,
        tableId: selectedTable.id,
        data: row.reduce((acc, value, colIndex) => {
          acc[result.columns[colIndex]] = value;
          return acc;
        }, {} as Record<string, any>)
      }));

      setRecords(loadedRecords);
    } catch (err: any) {
      setError(err.message || 'Failed to load records');
      console.error('Error loading records:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTable, schema]);

  // Load records when table changes
  useEffect(() => {
    if (selectedTable) {
      loadRecords();
    } else {
      setRecords([]);
    }
  }, [selectedTable, loadRecords]);

  // Handle adding new record
  const handleAddRecord = useCallback(() => {
    if (!selectedTable) return;

    const newRecord: EditingRecord = {
      id: null,
      data: selectedTable.columns.reduce((acc, col) => {
        acc[col.name] = col.defaultValue || '';
        return acc;
      }, {} as Record<string, any>),
      isNew: true
    };

    setEditingRecord(newRecord);
    setShowAddForm(true);
  }, [selectedTable]);

  // Handle editing existing record
  const handleEditRecord = useCallback((record: DatabaseRecord) => {
    const editRecord: EditingRecord = {
      id: record.id,
      data: { ...record.data },
      isNew: false
    };

    setEditingRecord(editRecord);
    setShowAddForm(true);
  }, []);

  // Handle saving record
  const handleSaveRecord = useCallback(async () => {
    if (!editingRecord || !selectedTable || !schema) return;

    setIsLoading(true);
    setError(null);

    try {
      // Initialize database
      await dbManager.initialize();
      await dbManager.createTablesFromSchema(schema);

      if (editingRecord.isNew) {
        // Insert new record
        await dbManager.insertRecord(selectedTable.name, editingRecord.data);
      } else {
        // Update existing record - find primary key for WHERE clause
        const primaryKeyColumn = selectedTable.columns.find(col => col.primaryKey);
        if (primaryKeyColumn && editingRecord.data[primaryKeyColumn.name] !== undefined) {
          const whereClause = `"${primaryKeyColumn.name}" = '${editingRecord.data[primaryKeyColumn.name]}'`;
          await dbManager.updateRecord(selectedTable.name, editingRecord.data, whereClause);
        } else {
          throw new Error('Cannot update record: no primary key found');
        }
      }

      // Reload records
      await loadRecords();
      setShowAddForm(false);
      setEditingRecord(null);
    } catch (err: any) {
      setError(err.message || 'Failed to save record');
      console.error('Error saving record:', err);
    } finally {
      setIsLoading(false);
    }
  }, [editingRecord, selectedTable, schema, loadRecords]);

  // Handle deleting record
  const handleDeleteRecord = useCallback(async (record: DatabaseRecord) => {
    if (!selectedTable || !schema) return;

    if (!confirm('Are you sure you want to delete this record?')) return;

    setIsLoading(true);
    setError(null);

    try {
      // Initialize database
      await dbManager.initialize();
      await dbManager.createTablesFromSchema(schema);

      // Find primary key for WHERE clause
      const primaryKeyColumn = selectedTable.columns.find(col => col.primaryKey);
      if (primaryKeyColumn && record.data[primaryKeyColumn.name] !== undefined) {
        const whereClause = `"${primaryKeyColumn.name}" = '${record.data[primaryKeyColumn.name]}'`;
        await dbManager.deleteRecord(selectedTable.name, whereClause);
      } else {
        throw new Error('Cannot delete record: no primary key found');
      }

      // Reload records
      await loadRecords();
    } catch (err: any) {
      setError(err.message || 'Failed to delete record');
      console.error('Error deleting record:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTable, schema, loadRecords]);

  // Handle input change in edit form
  const handleInputChange = useCallback((columnName: string, value: any) => {
    if (!editingRecord) return;

    setEditingRecord({
      ...editingRecord,
      data: {
        ...editingRecord.data,
        [columnName]: value
      }
    });
  }, [editingRecord]);

  // Cancel editing
  const handleCancelEdit = useCallback(() => {
    setShowAddForm(false);
    setEditingRecord(null);
  }, []);

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-white">Data Editor</h2>
          {selectedTable && (
            <span className="text-sm text-gray-300">
              Editing: {selectedTable.name}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {selectedTable && (
            <>
              <button
                onClick={handleAddRecord}
                className="flex items-center space-x-2 px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Record</span>
              </button>
              <button
                onClick={loadRecords}
                disabled={isLoading}
                className="flex items-center space-x-2 px-3 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Table Selection */}
      <div className="p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-white">Select Table:</label>
          <select
            value={selectedTable?.id || ''}
            onChange={(e) => {
              const table = schema?.tables.find(t => t.id === e.target.value);
              setSelectedTable(table || null);
            }}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Choose a table...</option>
            {schema?.tables.map((table) => (
              <option key={table.id} value={table.id}>
                {table.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-900 border-b border-red-700">
          <p className="text-red-200">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <div className="flex items-center space-x-2 text-orange-500">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Loading...</span>
          </div>
        </div>
      )}

      {/* No Table Selected */}
      {!selectedTable && !isLoading && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-gray-400">📊</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Select a Table</h3>
            <p className="text-gray-300">Choose a table from the dropdown above to start editing data</p>
          </div>
        </div>
      )}

      {/* No Tables Available */}
      {schema && schema.tables.length === 0 && !isLoading && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-gray-400">📊</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No Tables Available</h3>
            <p className="text-gray-300">Create tables in the Schema Designer first</p>
          </div>
        </div>
      )}

      {/* Data Table */}
      {selectedTable && !isLoading && (
        <div className="flex-1 overflow-auto p-4">
          {records.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">No records found in this table</p>
              <button
                onClick={handleAddRecord}
                className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
              >
                Add First Record
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full bg-gray-800 border border-gray-700 rounded-lg">
                <thead>
                  <tr className="bg-gray-900 border-b border-gray-700">
                    {selectedTable.columns.map((column) => (
                      <th key={column.id} className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                        {column.name}
                        {column.primaryKey && (
                          <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded">
                            PK
                          </span>
                        )}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record, index) => (
                    <tr key={record.id} className="border-b border-gray-700 hover:bg-gray-700">
                      {selectedTable.columns.map((column) => (
                        <td key={column.id} className="px-4 py-3 text-sm text-gray-200">
                          {record.data[column.name] !== null && record.data[column.name] !== undefined
                            ? String(record.data[column.name])
                            : <span className="text-gray-500 italic">null</span>
                          }
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditRecord(record)}
                            className="p-1 text-gray-400 hover:text-orange-400 transition-colors"
                            title="Edit record"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(record)}
                            className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                            title="Delete record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showAddForm && editingRecord && selectedTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">
                {editingRecord.isNew ? 'Add New Record' : 'Edit Record'}
              </h3>
              <button
                onClick={handleCancelEdit}
                className="p-1 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {selectedTable.columns.map((column) => (
                <div key={column.id}>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    {column.name}
                    {column.primaryKey && (
                      <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded">
                        PK
                      </span>
                    )}
                    {!column.nullable && (
                      <span className="ml-2 text-xs bg-red-100 text-red-800 px-1 py-0.5 rounded">
                        Required
                      </span>
                    )}
                  </label>
                  <input
                    type={column.type === 'INTEGER' || column.type === 'REAL' ? 'number' : 'text'}
                    value={editingRecord.data[column.name] || ''}
                    onChange={(e) => handleInputChange(column.name, e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder={column.defaultValue || `Enter ${column.name}`}
                    required={!column.nullable}
                  />
                </div>
              ))}
            </div>
            
            <div className="flex items-center justify-end space-x-2 p-4 border-t border-gray-700">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRecord}
                disabled={isLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{isLoading ? 'Saving...' : 'Save'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}