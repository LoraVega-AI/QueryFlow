'use client';

// Data Editor component for direct data editing
// This component provides a table interface for viewing and editing database records

import React, { useState, useEffect, useCallback } from 'react';
import { DatabaseSchema, Table, DatabaseRecord, QueryResult, QueryError, BulkOperation, DataValidationRule } from '@/types/database';
import { dbManager } from '@/utils/database';
import { BulkOperationsManager } from '@/utils/bulkOperations';
import { DataManagementManager } from '@/utils/dataManagement';
import { Plus, Edit, Trash2, Save, X, RefreshCw, Upload, Download, FileText, AlertTriangle, CheckCircle, Filter, BarChart3, Settings, Eye, Database, TrendingUp, Shield, History, Zap } from 'lucide-react';

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
  
  // Advanced features state
  const [activeTab, setActiveTab] = useState<'editor' | 'quality' | 'import' | 'export' | 'audit' | 'transform'>('editor');
  const [showDataQuality, setShowDataQuality] = useState(false);
  const [showDataImport, setShowDataImport] = useState(false);
  const [showDataExport, setShowDataExport] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [showDataTransform, setShowDataTransform] = useState(false);
  const [qualityReports, setQualityReports] = useState<any[]>([]);
  const [importResults, setImportResults] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [dataTransformations, setDataTransformations] = useState<any[]>([]);

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

  // Advanced data management functions
  const analyzeDataQuality = useCallback(() => {
    if (!selectedTable || records.length === 0) return;
    
    const report = DataManagementManager.analyzeDataQuality(selectedTable, records);
    setQualityReports(prev => [report, ...prev]);
    setShowDataQuality(true);
  }, [selectedTable, records]);

  const handleDataImport = useCallback((csvContent: string, mapping: any[]) => {
    if (!selectedTable) return;
    
    const result = DataManagementManager.importFromCSV(csvContent, selectedTable, mapping);
    setImportResults(prev => [result, ...prev]);
    setShowDataImport(true);
    
    // Reload records if import was successful
    if (result.importedRows > 0) {
      loadRecords();
    }
  }, [selectedTable, loadRecords]);

  const handleDataExport = useCallback((format: string) => {
    if (!selectedTable || records.length === 0) return;
    
    const config = {
      id: `export-${Date.now()}`,
      name: `${selectedTable.name}_export`,
      format: format as any,
      filters: [],
      columns: selectedTable.columns.map(c => c.name),
      includeHeaders: true,
      encoding: 'utf-8'
    };
    
    const exportData = DataManagementManager.exportData(records, config);
    
    // Download the file
    const blob = new Blob([exportData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTable.name}_export.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [selectedTable, records]);

  const logAuditEvent = useCallback((action: string, recordId: string, oldValues?: any, newValues?: any) => {
    if (!selectedTable) return;
    
    DataManagementManager.logAuditEvent(
      selectedTable.id,
      recordId,
      action,
      'current_user',
      oldValues,
      newValues
    );
    
    // Refresh audit logs
    setAuditLogs(DataManagementManager.getAuditLogs(selectedTable.id));
  }, [selectedTable]);

  // Load records when table changes
  useEffect(() => {
    if (selectedTable) {
      loadRecords();
      loadBulkOperations();
      loadValidationRules();
      setQualityReports(DataManagementManager.getQualityReports());
      setImportResults(DataManagementManager.getImportResults());
      setAuditLogs(DataManagementManager.getAuditLogs(selectedTable.id));
      setDataTransformations(DataManagementManager.getTransformations());
    } else {
      setRecords([]);
      setBulkOperations([]);
      setValidationRules([]);
      setQualityReports([]);
      setImportResults([]);
      setAuditLogs([]);
      setDataTransformations([]);
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

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'editor':
        return (
          <div className="flex-1 p-4">
            {!selectedTable ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Database className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No Table Selected</h3>
                  <p className="text-gray-400">Select a table from the dropdown above to start editing data</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {isLoading && (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-orange-500" />
                    <span className="ml-2 text-white">Loading records...</span>
                  </div>
                )}

                {error && (
                  <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded">
                    <div className="flex items-center">
                      <AlertTriangle className="w-5 h-5 mr-2" />
                      <span>{error}</span>
                    </div>
                  </div>
                )}

                {!isLoading && !error && records.length === 0 && (
                  <div className="text-center py-8">
                    <Database className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">No Records Found</h3>
                    <p className="text-gray-400 mb-4">This table doesn't have any data yet</p>
                    <button
                      onClick={handleAddRecord}
                      className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors mx-auto"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add First Record</span>
                    </button>
                  </div>
                )}

                {!isLoading && !error && records.length > 0 && (
                  <div className="bg-gray-800 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-700">
                          <tr>
                            <th className="px-4 py-3 text-left">
                              <input
                                type="checkbox"
                                checked={selectedRecords.size === records.length && records.length > 0}
                                onChange={selectedRecords.size === records.length ? clearSelection : selectAllRecords}
                                className="rounded border-gray-600 bg-gray-700 text-orange-600 focus:ring-orange-500"
                              />
                            </th>
                            {selectedTable.columns.map((column) => (
                              <th key={column.id} className="px-4 py-3 text-left text-white font-medium">
                                {column.name}
                                {column.primaryKey && <span className="ml-1 text-orange-400">*</span>}
                                {!column.nullable && <span className="ml-1 text-red-400">!</span>}
                              </th>
                            ))}
                            <th className="px-4 py-3 text-left text-white font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {records.map((record) => (
                            <tr key={record.id} className="hover:bg-gray-700">
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={selectedRecords.has(record.id)}
                                  onChange={() => toggleRecordSelection(record.id)}
                                  className="rounded border-gray-600 bg-gray-700 text-orange-600 focus:ring-orange-500"
                                />
                              </td>
                              {selectedTable.columns.map((column) => (
                                <td key={column.id} className="px-4 py-3 text-gray-300">
                                  {editingRecord?.id === record.id ? (
                                    <input
                                      type={column.type === 'INTEGER' ? 'number' : 'text'}
                                      value={editingRecord.data[column.name] || ''}
                                      onChange={(e) => setEditingRecord({
                                        ...editingRecord,
                                        data: { ...editingRecord.data, [column.name]: e.target.value }
                                      })}
                                      className="w-full px-2 py-1 bg-gray-600 text-white rounded border border-gray-500 focus:border-orange-500 focus:outline-none"
                                    />
                                  ) : (
                                    <span>{record.data[column.name] || '-'}</span>
                                  )}
                                </td>
                              ))}
                              <td className="px-4 py-3">
                                <div className="flex items-center space-x-2">
                                  {editingRecord?.id === record.id ? (
                                    <>
                                      <button
                                        onClick={handleSaveRecord}
                                        className="p-1 text-green-400 hover:text-green-300"
                                        title="Save"
                                      >
                                        <Save className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={handleCancelEdit}
                                        className="p-1 text-red-400 hover:text-red-300"
                                        title="Cancel"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => handleEditRecord(record)}
                                        className="p-1 text-blue-400 hover:text-blue-300"
                                        title="Edit"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteRecord(record)}
                                        className="p-1 text-red-400 hover:text-red-300"
                                        title="Delete"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      
      case 'quality':
        return (
          <div className="flex-1 p-4">
            <div className="h-full bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Data Quality Analysis</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-2">Total Records</h4>
                    <p className="text-2xl font-bold text-orange-400">{records.length}</p>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-2">Quality Reports</h4>
                    <p className="text-2xl font-bold text-yellow-400">{qualityReports.length}</p>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-2">Avg Quality Score</h4>
                    <p className="text-2xl font-bold text-green-400">
                      {qualityReports.length > 0 
                        ? Math.round(qualityReports.reduce((sum, r) => sum + r.qualityScore, 0) / qualityReports.length)
                        : 0}%
                    </p>
                  </div>
                </div>
                
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-4">Recent Quality Reports</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {qualityReports.slice(0, 5).map((report) => (
                      <div key={report.id} className="flex items-center justify-between p-3 bg-gray-600 rounded">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-white font-medium">
                              {new Date(report.timestamp).toLocaleDateString()}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              report.qualityScore >= 90 ? 'bg-green-600' :
                              report.qualityScore >= 70 ? 'bg-yellow-600' :
                              'bg-red-600'
                            }`}>
                              {report.qualityScore}%
                            </span>
                          </div>
                          <div className="text-sm text-gray-400">
                            {report.totalRecords} records • {report.issues.length} issues
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'import':
        return (
          <div className="flex-1 p-4">
            <div className="h-full bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Data Import</h3>
              <div className="space-y-4">
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-4">Import History</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {importResults.slice(0, 5).map((result) => (
                      <div key={result.id} className="flex items-center justify-between p-3 bg-gray-600 rounded">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-white font-medium">{result.filename}</span>
                            <span className="text-green-400 text-sm">
                              {result.importedRows}/{result.totalRows} imported
                            </span>
                          </div>
                          <div className="text-sm text-gray-400">
                            {new Date(result.timestamp).toLocaleString()} • {result.errors.length} errors
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'export':
        return (
          <div className="flex-1 p-4">
            <div className="h-full bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Data Export</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button
                    onClick={() => handleDataExport('csv')}
                    className="p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-center"
                  >
                    <FileText className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                    <span className="text-white text-sm">CSV</span>
                  </button>
                  <button
                    onClick={() => handleDataExport('json')}
                    className="p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-center"
                  >
                    <FileText className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                    <span className="text-white text-sm">JSON</span>
                  </button>
                  <button
                    onClick={() => handleDataExport('xml')}
                    className="p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-center"
                  >
                    <FileText className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                    <span className="text-white text-sm">XML</span>
                  </button>
                  <button
                    onClick={() => handleDataExport('excel')}
                    className="p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-center"
                  >
                    <FileText className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <span className="text-white text-sm">Excel</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'audit':
        return (
          <div className="flex-1 p-4">
            <div className="h-full bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Audit Trail</h3>
              <div className="space-y-4">
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-4">Recent Activity</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {auditLogs.slice(0, 10).map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-3 bg-gray-600 rounded">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-white font-medium">{log.action.toUpperCase()}</span>
                            <span className="text-gray-400 text-sm">
                              {new Date(log.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-sm text-gray-400">
                            Record: {log.recordId} • User: {log.userId}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'transform':
        return (
          <div className="flex-1 p-4">
            <div className="h-full bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Data Transformations</h3>
              <div className="space-y-4">
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-4">Available Transformations</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {dataTransformations.slice(0, 5).map((transform) => (
                      <div key={transform.id} className="flex items-center justify-between p-3 bg-gray-600 rounded">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-white font-medium">{transform.name}</span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              transform.enabled ? 'bg-green-600' : 'bg-gray-600'
                            }`}>
                              {transform.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          <div className="text-sm text-gray-400">
                            {transform.description} • {transform.rules.length} rules
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

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
          
          {/* Tab Navigation */}
          <div className="flex items-center space-x-1 bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                activeTab === 'editor' ? 'bg-orange-600 text-white' : 'text-gray-300 hover:text-white'
              }`}
            >
              <Database className="w-4 h-4 inline mr-1" />
              Editor
            </button>
            <button
              onClick={() => setActiveTab('quality')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                activeTab === 'quality' ? 'bg-orange-600 text-white' : 'text-gray-300 hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-1" />
              Quality
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                activeTab === 'import' ? 'bg-orange-600 text-white' : 'text-gray-300 hover:text-white'
              }`}
            >
              <Upload className="w-4 h-4 inline mr-1" />
              Import
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                activeTab === 'export' ? 'bg-orange-600 text-white' : 'text-gray-300 hover:text-white'
              }`}
            >
              <Download className="w-4 h-4 inline mr-1" />
              Export
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                activeTab === 'audit' ? 'bg-orange-600 text-white' : 'text-gray-300 hover:text-white'
              }`}
            >
              <History className="w-4 h-4 inline mr-1" />
              Audit
            </button>
            <button
              onClick={() => setActiveTab('transform')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                activeTab === 'transform' ? 'bg-orange-600 text-white' : 'text-gray-300 hover:text-white'
              }`}
            >
              <Zap className="w-4 h-4 inline mr-1" />
              Transform
            </button>
          </div>
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
                onClick={analyzeDataQuality}
                className="flex items-center space-x-2 px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                <span>Quality</span>
              </button>
              <button
                onClick={() => setShowAuditLog(true)}
                className="flex items-center space-x-2 px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                <History className="w-4 h-4" />
                <span>Audit</span>
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

      {/* Tab Content */}
      {renderTabContent()}

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