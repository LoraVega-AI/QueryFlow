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
  'TEXT',
  'INTEGER',
  'REAL',
  'BLOB',
  'BOOLEAN',
  'DATE',
  'DATETIME',
];

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
      'TEXT': 'bg-orange-100 text-orange-800',
      'INTEGER': 'bg-yellow-100 text-yellow-800',
      'REAL': 'bg-yellow-200 text-yellow-900',
      'BLOB': 'bg-purple-100 text-purple-800',
      'BOOLEAN': 'bg-pink-100 text-pink-800',
      'DATE': 'bg-indigo-100 text-indigo-800',
      'DATETIME': 'bg-gray-100 text-gray-800',
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