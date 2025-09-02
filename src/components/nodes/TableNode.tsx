'use client';

// Custom Table Node component for React Flow
// This component renders individual table nodes in the schema designer

import React, { useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Table, Column, DataType } from '@/types/database';
import { Edit, Trash2, Plus } from 'lucide-react';

interface TableNodeData {
  table: Table;
  onUpdateTable: (table: Table) => void;
  onDeleteTable: (tableId: string) => void;
}

export function TableNode({ data, selected }: NodeProps<TableNodeData>) {
  const { table, onUpdateTable, onDeleteTable } = data;
  const [isEditing, setIsEditing] = useState(false);
  const [tableName, setTableName] = useState(table.name);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTableName(e.target.value);
  };

  const handleNameSubmit = () => {
    if (tableName.trim() && tableName !== table.name) {
      onUpdateTable({
        ...table,
        name: tableName.trim(),
      });
    }
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSubmit();
    } else if (e.key === 'Escape') {
      setTableName(table.name);
      setIsEditing(false);
    }
  };

  const handleAddColumn = () => {
    const newColumn: Column = {
      id: `col_${Date.now()}`,
      name: `column_${table.columns.length + 1}`,
      type: 'TEXT',
      nullable: true,
      primaryKey: false,
    };

    onUpdateTable({
      ...table,
      columns: [...table.columns, newColumn],
    });
  };

  const handleDeleteColumn = (columnId: string) => {
    onUpdateTable({
      ...table,
      columns: table.columns.filter((col) => col.id !== columnId),
    });
  };

  const handleColumnUpdate = (columnId: string, updates: Partial<Column>) => {
    onUpdateTable({
      ...table,
      columns: table.columns.map((col) =>
        col.id === columnId ? { ...col, ...updates } : col
      ),
    });
  };

  const getDataTypeColor = (type: DataType): string => {
    const colors: Record<DataType, string> = {
      'TEXT': 'bg-blue-100 text-blue-800',
      'INTEGER': 'bg-green-100 text-green-800',
      'REAL': 'bg-yellow-100 text-yellow-800',
      'BLOB': 'bg-purple-100 text-purple-800',
      'BOOLEAN': 'bg-pink-100 text-pink-800',
      'DATE': 'bg-indigo-100 text-indigo-800',
      'DATETIME': 'bg-gray-100 text-gray-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div
      className={`bg-white border-2 rounded-lg shadow-lg min-w-[200px] ${
        selected ? 'border-blue-500' : 'border-gray-300'
      }`}
    >
      {/* Table Header */}
      <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 rounded-t-lg">
        <div className="flex items-center justify-between">
          {isEditing ? (
            <input
              type="text"
              value={tableName}
              onChange={handleNameChange}
              onBlur={handleNameSubmit}
              onKeyDown={handleKeyPress}
              className="flex-1 text-sm font-semibold bg-white border border-gray-300 rounded px-2 py-1"
              autoFocus
            />
          ) : (
            <h3
              className="text-sm font-semibold text-gray-800 cursor-pointer hover:text-blue-600"
              onDoubleClick={() => setIsEditing(true)}
            >
              {table.name}
            </h3>
          )}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
              title="Edit table name"
            >
              <Edit className="w-3 h-3" />
            </button>
            <button
              onClick={() => onDeleteTable(table.id)}
              className="p-1 text-gray-500 hover:text-red-600 transition-colors"
              title="Delete table"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Columns */}
      <div className="p-2 space-y-1">
        {table.columns.map((column, index) => (
          <div key={column.id} className="flex items-center space-x-2">
            {/* Column Handle for Foreign Keys */}
            <Handle
              type="source"
              position={Position.Right}
              id={column.id}
              className="w-2 h-2 bg-blue-500 border-0"
              style={{ top: 20 + index * 25 }}
            />
            <Handle
              type="target"
              position={Position.Left}
              id={column.id}
              className="w-2 h-2 bg-green-500 border-0"
              style={{ top: 20 + index * 25 }}
            />

            {/* Column Info */}
            <div className="flex-1 flex items-center space-x-2">
              <span className="text-xs font-medium text-gray-700 min-w-0 flex-1 truncate">
                {column.name}
              </span>
              <span
                className={`text-xs px-1 py-0.5 rounded ${getDataTypeColor(column.type)}`}
              >
                {column.type}
              </span>
              {column.primaryKey && (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded">
                  PK
                </span>
              )}
              {!column.nullable && (
                <span className="text-xs bg-red-100 text-red-800 px-1 py-0.5 rounded">
                  NOT NULL
                </span>
              )}
            </div>

            {/* Column Actions */}
            <button
              onClick={() => handleDeleteColumn(column.id)}
              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
              title="Delete column"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}

        {/* Add Column Button */}
        <button
          onClick={handleAddColumn}
          className="w-full flex items-center justify-center space-x-1 py-1 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
        >
          <Plus className="w-3 h-3" />
          <span>Add Column</span>
        </button>
      </div>
    </div>
  );
}
