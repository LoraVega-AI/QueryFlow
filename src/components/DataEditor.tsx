'use client';

// Data Editor component for direct data editing
// This component provides a table interface for viewing and editing database records

import React, { useState, useEffect, useCallback } from 'react';
import { DatabaseSchema, Table, DatabaseRecord, QueryResult, QueryError, BulkOperation, DataValidationRule } from '@/types/database';
import { dbManager } from '@/utils/database';
import { BulkOperationsManager } from '@/utils/bulkOperations';
import { Plus, Edit, Trash2, Save, X, RefreshCw, Upload, Download, FileText, AlertTriangle, CheckCircle, Filter } from 'lucide-react';

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
  const [showBulkOperations, setShowBulkOperations] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [bulkOperations, setBulkOperations] = useState<BulkOperation[]>([]);
  const [validationRules, setValidationRules] = useState<DataValidationRule[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [csvData, setCsvData] = useState<string>('');

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
    } catch (error: any) {
      console.error('Error loading records:', error);
      setError(error.message || 'Failed to load records');
    } finally {
      setIsLoading(false);
    }
  }, [selectedTable, schema]);

  // Load bulk operations
  const loadBulkOperations = useCallback(() => {
    if (selectedTable) {
      setBulkOperations(BulkOperationsManager.getOperations());
    }
  }, [selectedTable]);

  // Load validation rules
  const loadValidationRules = useCallback(() => {
    if (selectedTable) {
      setValidationRules(BulkOperationsManager.getValidationRules());
    }
  }, [selectedTable]);



  // Bulk insert from CSV
  const handleBulkInsert = useCallback(async () => {
    if (!selectedTable || !csvData.trim()) return;

    try {
      const lines = csvData.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const data = lines.slice(1).map(line => {
        const values = line.split(',').map(cell => cell.trim().replace(/"/g, ''));
        return headers.reduce((acc, header, index) => {
          acc[header] = values[index] || null;
          return acc;
        }, {} as Record<string, any>);
      });

      const operation = await BulkOperationsManager.bulkInsert(
        selectedTable.id,
        data
      );

      setBulkOperations(prev => [operation, ...prev]);
      await loadRecords();
      setCsvData('');
      setShowBulkOperations(false);
    } catch (error: any) {
      setError(error.message);
    }
  }, [selectedTable, csvData, loadRecords]);

  // Bulk delete selected records
  const handleBulkDelete = useCallback(async () => {
    if (!selectedTable || selectedRecords.size === 0) return;

    try {
      const keyColumn = selectedTable.columns.find(col => col.primaryKey)?.name;
      if (!keyColumn) {
        setError('No primary key found for bulk delete');
        return;
      }

      const selectedData = Array.from(selectedRecords).map(recordId => {
        const record = records.find(r => r.id === recordId);
        return record?.data[keyColumn];
      }).filter(Boolean);

      const operation = await BulkOperationsManager.bulkDelete(
        selectedTable.id,
        keyColumn,
        selectedData
      );

      setBulkOperations(prev => [operation, ...prev]);
      setSelectedRecords(new Set());
      await loadRecords();
    } catch (error: any) {
      setError(error.message);
    }
  }, [selectedTable, selectedRecords, records, loadRecords]);

  // Export to CSV
  const handleExportCSV = useCallback(() => {
    if (!selectedTable || records.length === 0) return;

    const headers = selectedTable.columns.map(col => col.name);
    const csvContent = [
      headers.join(','),
      ...records.map(record => 
        headers.map(header => `"${record.data[header] || ''}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTable.name}_data.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [selectedTable, records]);

  // Toggle record selection
  const toggleRecordSelection = useCallback((recordId: string) => {
    setSelectedRecords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recordId)) {
        newSet.delete(recordId);
      } else {
        newSet.add(recordId);
      }
      return newSet;
    });
  }, []);

  // Select all records
  const selectAllRecords = useCallback(() => {
    setSelectedRecords(new Set(records.map(r => r.id)));
  }, [records]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedRecords(new Set());
  }, []);

  // Load records when table changes
  useEffect(() => {
    if (selectedTable) {
      loadRecords();
      loadBulkOperations();
      loadValidationRules();
    } else {
      setRecords([]);
      setBulkOperations([]);
      setValidationRules([]);
    }
  }, [selectedTable, loadRecords, loadBulkOperations, loadValidationRules]);

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
                onClick={() => setShowBulkOperations(true)}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>Bulk Operations</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => setShowValidation(true)}
                className="flex items-center space-x-2 px-3 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Validation</span>
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
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                      <input
                        type="checkbox"
                        checked={selectedRecords.size === records.length && records.length > 0}
                        onChange={selectedRecords.size === records.length ? clearSelection : selectAllRecords}
                        className="rounded border-gray-600 bg-gray-700 text-orange-600 focus:ring-orange-500"
                      />
                    </th>
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
                    <tr key={record.id} className={`border-b border-gray-700 hover:bg-gray-700 ${selectedRecords.has(record.id) ? 'bg-orange-900 bg-opacity-30' : ''}`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedRecords.has(record.id)}
                          onChange={() => toggleRecordSelection(record.id)}
                          className="rounded border-gray-600 bg-gray-700 text-orange-600 focus:ring-orange-500"
                        />
                      </td>
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

      {/* Bulk Operations Modal */}
      {showBulkOperations && selectedTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Bulk Operations - {selectedTable.name}</h3>
              <button
                onClick={() => setShowBulkOperations(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* CSV Import */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Import from CSV</h4>
                <textarea
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                  placeholder="Paste CSV data here (first row should be column headers)..."
                  className="w-full h-32 p-3 bg-gray-700 text-white rounded-md border border-gray-600 focus:border-orange-500 focus:outline-none font-mono text-sm"
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleBulkInsert}
                    disabled={!csvData.trim()}
                    className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                  >
                    Import Data
                  </button>
                </div>
              </div>

              {/* Bulk Delete */}
              {selectedRecords.size > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3">Bulk Delete</h4>
                  <div className="bg-red-900 border border-red-700 rounded-lg p-4">
                    <p className="text-red-300 mb-3">
                      You have {selectedRecords.size} record(s) selected for deletion. This action cannot be undone.
                    </p>
                    <button
                      onClick={handleBulkDelete}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Delete Selected Records
                    </button>
                  </div>
                </div>
              )}

              {/* Recent Operations */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Recent Operations</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {bulkOperations.map((operation) => (
                    <div key={operation.id} className="bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-white font-medium">{operation.type.toUpperCase()}</span>
                          <span className="text-gray-400 ml-2">{operation.data.length} records</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            operation.status === 'completed' ? 'bg-green-600 text-white' :
                            operation.status === 'failed' ? 'bg-red-600 text-white' :
                            operation.status === 'processing' ? 'bg-yellow-600 text-white' :
                            'bg-gray-600 text-white'
                          }`}>
                            {operation.status}
                          </span>
                          <span className="text-gray-400 text-sm">
                            {Math.round(operation.progress)}%
                          </span>
                        </div>
                      </div>
                      {operation.errors.length > 0 && (
                        <div className="mt-2 text-red-300 text-sm">
                          {operation.errors.length} error(s)
                        </div>
                      )}
                    </div>
                  ))}
                  {bulkOperations.length === 0 && (
                    <p className="text-gray-400 text-center py-4">No bulk operations yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Validation Modal */}
      {showValidation && selectedTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Data Validation - {selectedTable.name}</h3>
              <button
                onClick={() => setShowValidation(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Validation Rules</h4>
                <div className="space-y-2">
                  {validationRules.map((rule) => (
                    <div key={rule.id} className="bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-white font-medium">{rule.type}</span>
                          <span className="text-gray-400 ml-2">{rule.message}</span>
                        </div>
                        <span className="text-xs bg-orange-600 text-white px-2 py-1 rounded">
                          {rule.columnId || 'Table-level'}
                        </span>
                      </div>
                    </div>
                  ))}
                  {validationRules.length === 0 && (
                    <p className="text-gray-400 text-center py-4">No validation rules defined</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Data Quality Check</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="text-2xl font-bold text-white">{records.length}</div>
                    <div className="text-gray-400">Total Records</div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="text-2xl font-bold text-white">
                      {records.filter(r => Object.values(r.data).some(v => v === null || v === undefined)).length}
                    </div>
                    <div className="text-gray-400">Records with Nulls</div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="text-2xl font-bold text-white">
                      {new Set(records.map(r => JSON.stringify(r.data))).size}
                    </div>
                    <div className="text-gray-400">Unique Records</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}