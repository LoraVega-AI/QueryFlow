'use client';

// Table Editor component for detailed table structure editing
// This component provides a modal interface for editing table columns and properties

import React, { useState } from 'react';
import { Table, Column, DataType } from '@/types/database';
import { X, Plus, Trash2, Save } from 'lucide-react';

interface TableEditorProps {
  table: Table;
  onSave: (table: Table) => void;
  onClose: () => void;
}

const DATA_TYPES: DataType[] = [
  // Basic SQLite types
  'TEXT',
  'INTEGER',
  'REAL',
  'BLOB',
  'BOOLEAN',
  'DATE',
  'DATETIME',
  // Advanced numeric types
  'BIGINT',
  'DECIMAL',
  'NUMERIC',
  'FLOAT',
  'DOUBLE',
  'SMALLINT',
  'TINYINT',
  'MONEY',
  // String types
  'CHAR',
  'VARCHAR',
  'NCHAR',
  'NVARCHAR',
  'ENUM',
  'SET',
  // Date/Time types
  'TIMESTAMP',
  'INTERVAL',
  'TIME',
  'YEAR',
  // Structured data types
  'JSON',
  'JSONB',
  'XML',
  'BINARY',
  'VARBINARY',
  // Unique identifier
  'UUID',
  'GUID',
  // Array types
  'ARRAY',
  'TEXT_ARRAY',
  'INTEGER_ARRAY',
  'JSON_ARRAY',
  // Spatial/Geographic types
  'GEOMETRY',
  'POINT',
  'POLYGON',
  'LINESTRING',
  'MULTIPOINT',
  'MULTIPOLYGON',
  'MULTILINESTRING',
  'GEOMETRYCOLLECTION',
  // Network types
  'INET',
  'CIDR',
  'MACADDR',
  // Full-text search
  'TSVECTOR',
  'TSQUERY',
  // Custom/User-defined
  'CUSTOM',
];

// Group data types by category for better UX
const DATA_TYPE_CATEGORIES = {
  'Basic Types': ['TEXT', 'INTEGER', 'REAL', 'BLOB', 'BOOLEAN', 'DATE', 'DATETIME'],
  'Numeric Types': ['BIGINT', 'DECIMAL', 'NUMERIC', 'FLOAT', 'DOUBLE', 'SMALLINT', 'TINYINT', 'MONEY'],
  'String Types': ['CHAR', 'VARCHAR', 'NCHAR', 'NVARCHAR', 'ENUM', 'SET'],
  'Date/Time Types': ['TIMESTAMP', 'INTERVAL', 'TIME', 'YEAR'],
  'Structured Types': ['JSON', 'JSONB', 'XML', 'BINARY', 'VARBINARY'],
  'Identifier Types': ['UUID', 'GUID'],
  'Array Types': ['ARRAY', 'TEXT_ARRAY', 'INTEGER_ARRAY', 'JSON_ARRAY'],
  'Spatial Types': ['GEOMETRY', 'POINT', 'POLYGON', 'LINESTRING', 'MULTIPOINT', 'MULTIPOLYGON', 'MULTILINESTRING', 'GEOMETRYCOLLECTION'],
  'Network Types': ['INET', 'CIDR', 'MACADDR'],
  'Search Types': ['TSVECTOR', 'TSQUERY'],
  'Custom Types': ['CUSTOM']
} as const;

export function TableEditor({ table, onSave, onClose }: TableEditorProps) {
  const [editedTable, setEditedTable] = useState<Table>({ ...table });
  const [newColumn, setNewColumn] = useState<Partial<Column>>({
    name: '',
    type: 'TEXT',
    nullable: true,
    primaryKey: false,
    defaultValue: '',
  });

  const handleColumnChange = (columnId: string, field: keyof Column, value: any) => {
    setEditedTable({
      ...editedTable,
      columns: editedTable.columns.map((col) =>
        col.id === columnId ? { ...col, [field]: value } : col
      ),
    });
  };

  const handleAddColumn = () => {
    if (!newColumn.name?.trim()) return;

    const column: Column = {
      id: `col_${Date.now()}`,
      name: newColumn.name.trim(),
      type: newColumn.type || 'TEXT',
      nullable: newColumn.nullable ?? true,
      primaryKey: newColumn.primaryKey ?? false,
      defaultValue: newColumn.defaultValue || undefined,
    };

    setEditedTable({
      ...editedTable,
      columns: [...editedTable.columns, column],
    });

    setNewColumn({
      name: '',
      type: 'TEXT',
      nullable: true,
      primaryKey: false,
      defaultValue: '',
    });
  };

  const handleDeleteColumn = (columnId: string) => {
    setEditedTable({
      ...editedTable,
      columns: editedTable.columns.filter((col) => col.id !== columnId),
    });
  };

  const handleSave = () => {
    onSave(editedTable);
    onClose();
  };

  const getDataTypeColor = (type: DataType): string => {
    const colors: Record<DataType, string> = {
      // Basic SQLite types
      'TEXT': 'bg-green-100 text-green-800',
      'INTEGER': 'bg-blue-100 text-blue-800',
      'REAL': 'bg-purple-100 text-purple-800',
      'BLOB': 'bg-gray-100 text-gray-800',
      'BOOLEAN': 'bg-yellow-100 text-yellow-800',
      'DATE': 'bg-red-100 text-red-800',
      'DATETIME': 'bg-pink-100 text-pink-800',
      // Advanced numeric types
      'BIGINT': 'bg-blue-200 text-blue-900',
      'DECIMAL': 'bg-indigo-100 text-indigo-800',
      'NUMERIC': 'bg-indigo-200 text-indigo-900',
      'FLOAT': 'bg-purple-200 text-purple-900',
      'DOUBLE': 'bg-purple-300 text-purple-900',
      'SMALLINT': 'bg-blue-50 text-blue-700',
      'TINYINT': 'bg-blue-50 text-blue-600',
      'MONEY': 'bg-emerald-100 text-emerald-800',
      // String types
      'CHAR': 'bg-green-200 text-green-900',
      'VARCHAR': 'bg-green-300 text-green-900',
      'NCHAR': 'bg-teal-100 text-teal-800',
      'NVARCHAR': 'bg-teal-200 text-teal-900',
      'ENUM': 'bg-cyan-100 text-cyan-800',
      'SET': 'bg-cyan-200 text-cyan-900',
      // Date/Time types
      'TIMESTAMP': 'bg-red-200 text-red-900',
      'INTERVAL': 'bg-orange-100 text-orange-800',
      'TIME': 'bg-amber-100 text-amber-800',
      'YEAR': 'bg-yellow-200 text-yellow-900',
      // Structured data types
      'JSON': 'bg-violet-100 text-violet-800',
      'JSONB': 'bg-violet-200 text-violet-900',
      'XML': 'bg-lime-100 text-lime-800',
      'BINARY': 'bg-slate-100 text-slate-800',
      'VARBINARY': 'bg-slate-200 text-slate-900',
      // Unique identifier
      'UUID': 'bg-fuchsia-100 text-fuchsia-800',
      'GUID': 'bg-fuchsia-200 text-fuchsia-900',
      // Array types
      'ARRAY': 'bg-rose-100 text-rose-800',
      'TEXT_ARRAY': 'bg-green-50 text-green-700',
      'INTEGER_ARRAY': 'bg-blue-50 text-blue-700',
      'JSON_ARRAY': 'bg-violet-50 text-violet-700',
      // Spatial/Geographic types
      'GEOMETRY': 'bg-emerald-200 text-emerald-900',
      'POINT': 'bg-teal-300 text-teal-900',
      'POLYGON': 'bg-green-400 text-green-900',
      'LINESTRING': 'bg-lime-200 text-lime-900',
      'MULTIPOINT': 'bg-teal-100 text-teal-700',
      'MULTIPOLYGON': 'bg-green-300 text-green-800',
      'MULTILINESTRING': 'bg-lime-300 text-lime-900',
      'GEOMETRYCOLLECTION': 'bg-emerald-300 text-emerald-900',
      // Network types
      'INET': 'bg-sky-100 text-sky-800',
      'CIDR': 'bg-sky-200 text-sky-900',
      'MACADDR': 'bg-cyan-300 text-cyan-900',
      // Full-text search
      'TSVECTOR': 'bg-stone-100 text-stone-800',
      'TSQUERY': 'bg-stone-200 text-stone-900',
      // Custom/User-defined
      'CUSTOM': 'bg-neutral-100 text-neutral-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">
            Edit Table: {table.name}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Table Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-white mb-2">
              Table Name
            </label>
            <input
              type="text"
              value={editedTable.name}
              onChange={(e) =>
                setEditedTable({ ...editedTable, name: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 bg-gray-700 text-white"
            />
          </div>

          {/* Existing Columns */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-white mb-4">Columns</h3>
            <div className="space-y-3">
              {editedTable.columns.map((column) => (
                <div
                  key={column.id}
                  className="grid grid-cols-12 gap-4 p-4 border border-gray-600 rounded-lg bg-gray-700"
                >
                  {/* Column Name */}
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={column.name}
                      onChange={(e) =>
                        handleColumnChange(column.id, 'name', e.target.value)
                      }
                      className="w-full px-2 py-1 text-sm border border-gray-500 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 bg-gray-600 text-white"
                    />
                  </div>

                  {/* Data Type */}
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Type
                    </label>
                    <select
                      value={column.type}
                      onChange={(e) =>
                        handleColumnChange(column.id, 'type', e.target.value as DataType)
                      }
                      className="w-full px-2 py-1 text-sm border border-gray-500 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 bg-gray-600 text-white"
                    >
                      {DATA_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Nullable */}
                  <div className="col-span-1 flex items-center">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={column.nullable}
                        onChange={(e) =>
                          handleColumnChange(column.id, 'nullable', e.target.checked)
                        }
                        className="rounded border-gray-500 text-orange-600 focus:ring-orange-500 bg-gray-600"
                      />
                      <span className="text-xs text-gray-300">Nullable</span>
                    </label>
                  </div>

                  {/* Primary Key */}
                  <div className="col-span-1 flex items-center">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={column.primaryKey}
                        onChange={(e) =>
                          handleColumnChange(column.id, 'primaryKey', e.target.checked)
                        }
                        className="rounded border-gray-500 text-orange-600 focus:ring-orange-500 bg-gray-600"
                      />
                      <span className="text-xs text-gray-300">PK</span>
                    </label>
                  </div>

                  {/* Default Value */}
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Default Value
                    </label>
                    <input
                      type="text"
                      value={column.defaultValue || ''}
                      onChange={(e) =>
                        handleColumnChange(column.id, 'defaultValue', e.target.value || undefined)
                      }
                      className="w-full px-2 py-1 text-sm border border-gray-500 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 bg-gray-600 text-white"
                      placeholder="Optional"
                    />
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex items-center justify-end">
                    <button
                      onClick={() => handleDeleteColumn(column.id)}
                      className="p-1 text-red-400 hover:text-red-300 transition-colors"
                      title="Delete column"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add New Column */}
          <div className="border-t border-gray-600 pt-6">
            <h3 className="text-lg font-medium text-white mb-4">Add New Column</h3>
            <div className="grid grid-cols-12 gap-4 p-4 border border-gray-600 rounded-lg bg-gray-700">
              {/* Column Name */}
              <div className="col-span-3">
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={newColumn.name || ''}
                  onChange={(e) => setNewColumn({ ...newColumn, name: e.target.value })}
                  className="w-full px-2 py-1 text-sm border border-gray-500 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 bg-gray-600 text-white"
                  placeholder="Column name"
                />
              </div>

              {/* Data Type */}
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Type
                </label>
                <select
                  value={newColumn.type || 'TEXT'}
                  onChange={(e) => setNewColumn({ ...newColumn, type: e.target.value as DataType })}
                  className="w-full px-2 py-1 text-sm border border-gray-500 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 bg-gray-600 text-white"
                >
                  {DATA_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nullable */}
              <div className="col-span-1 flex items-center">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={newColumn.nullable ?? true}
                    onChange={(e) => setNewColumn({ ...newColumn, nullable: e.target.checked })}
                    className="rounded border-gray-500 text-orange-600 focus:ring-orange-500 bg-gray-600"
                  />
                  <span className="text-xs text-gray-300">Nullable</span>
                </label>
              </div>

              {/* Primary Key */}
              <div className="col-span-1 flex items-center">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={newColumn.primaryKey ?? false}
                    onChange={(e) => setNewColumn({ ...newColumn, primaryKey: e.target.checked })}
                    className="rounded border-gray-500 text-orange-600 focus:ring-orange-500 bg-gray-600"
                  />
                  <span className="text-xs text-gray-300">PK</span>
                </label>
              </div>

              {/* Default Value */}
              <div className="col-span-3">
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Default Value
                </label>
                <input
                  type="text"
                  value={newColumn.defaultValue || ''}
                  onChange={(e) => setNewColumn({ ...newColumn, defaultValue: e.target.value })}
                  className="w-full px-2 py-1 text-sm border border-gray-500 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 bg-gray-600 text-white"
                  placeholder="Optional"
                />
              </div>

              {/* Add Button */}
              <div className="col-span-2 flex items-center justify-end">
                <button
                  onClick={handleAddColumn}
                  className="flex items-center space-x-1 px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
}