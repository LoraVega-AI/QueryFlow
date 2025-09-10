'use client';

// Enhanced Table Node component for React Flow
// Professional ERD table visualization with theming and advanced features

import React, { useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Table, Column, DataType } from '@/types/database';
import { 
  Edit, Trash2, Plus, Key, Link, Lock, Eye, EyeOff, 
  Hash, Type, Calendar, FileText, Database, Star 
} from 'lucide-react';

interface TableNodeData {
  table: Table;
  onUpdateTable: (table: Table) => void;
  onDeleteTable: (tableId: string) => void;
  showColumnTypes?: boolean;
  showConstraints?: boolean;
  compactMode?: boolean;
}

export function TableNode(props: any) {
  const { data, selected } = props;
  const { 
    table, 
    onUpdateTable, 
    onDeleteTable, 
    showColumnTypes = true,
    showConstraints = true,
    compactMode = false
  } = data;
  const [isEditing, setIsEditing] = useState(false);
  const [tableName, setTableName] = useState(table.name);
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);

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
      columns: table.columns.filter((col: Column) => col.id !== columnId),
    });
  };

  // Default dark theme styling
  const styles = {
    container: selected 
      ? 'bg-gray-800 border-2 border-orange-500 shadow-xl' 
      : 'bg-gray-800 border border-gray-600 shadow-lg hover:shadow-xl',
    header: 'bg-gray-700 text-white',
    headerBorder: 'border-b border-gray-600',
    text: 'text-gray-200',
    mutedText: 'text-gray-400',
    hoverBg: 'hover:bg-gray-700',
    input: 'bg-gray-600 border-gray-500 text-white'
  };

  // Enhanced data type colors with full coverage
  const getDataTypeColor = (type: DataType): string => {
    const colorMap: Record<DataType, string> = {
      // Basic SQLite types
      'TEXT': 'bg-green-100 text-green-800 border-green-200',
      'INTEGER': 'bg-blue-100 text-blue-800 border-blue-200',
      'REAL': 'bg-purple-100 text-purple-800 border-purple-200',
      'BLOB': 'bg-gray-100 text-gray-800 border-gray-200',
      'BOOLEAN': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'DATE': 'bg-red-100 text-red-800 border-red-200',
      'DATETIME': 'bg-pink-100 text-pink-800 border-pink-200',
      // Advanced numeric types
      'BIGINT': 'bg-blue-200 text-blue-900 border-blue-300',
      'DECIMAL': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'NUMERIC': 'bg-indigo-200 text-indigo-900 border-indigo-300',
      'FLOAT': 'bg-purple-200 text-purple-900 border-purple-300',
      'DOUBLE': 'bg-purple-300 text-purple-900 border-purple-400',
      'SMALLINT': 'bg-blue-50 text-blue-700 border-blue-100',
      'TINYINT': 'bg-blue-50 text-blue-600 border-blue-100',
      'MONEY': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      // String types
      'CHAR': 'bg-green-200 text-green-900 border-green-300',
      'VARCHAR': 'bg-green-300 text-green-900 border-green-400',
      'NCHAR': 'bg-teal-100 text-teal-800 border-teal-200',
      'NVARCHAR': 'bg-teal-200 text-teal-900 border-teal-300',
      'ENUM': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      'SET': 'bg-cyan-200 text-cyan-900 border-cyan-300',
      // Date/Time types
      'TIMESTAMP': 'bg-red-200 text-red-900 border-red-300',
      'INTERVAL': 'bg-orange-100 text-orange-800 border-orange-200',
      'TIME': 'bg-amber-100 text-amber-800 border-amber-200',
      'YEAR': 'bg-yellow-200 text-yellow-900 border-yellow-300',
      // Structured data types
      'JSON': 'bg-violet-100 text-violet-800 border-violet-200',
      'JSONB': 'bg-violet-200 text-violet-900 border-violet-300',
      'XML': 'bg-lime-100 text-lime-800 border-lime-200',
      'BINARY': 'bg-slate-100 text-slate-800 border-slate-200',
      'VARBINARY': 'bg-slate-200 text-slate-900 border-slate-300',
      // Unique identifier
      'UUID': 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
      'GUID': 'bg-fuchsia-200 text-fuchsia-900 border-fuchsia-300',
      // Array types
      'ARRAY': 'bg-rose-100 text-rose-800 border-rose-200',
      'TEXT_ARRAY': 'bg-green-50 text-green-700 border-green-100',
      'INTEGER_ARRAY': 'bg-blue-50 text-blue-700 border-blue-100',
      'JSON_ARRAY': 'bg-violet-50 text-violet-700 border-violet-100',
      // Spatial/Geographic types
      'GEOMETRY': 'bg-emerald-200 text-emerald-900 border-emerald-300',
      'POINT': 'bg-teal-300 text-teal-900 border-teal-400',
      'POLYGON': 'bg-green-400 text-green-900 border-green-500',
      'LINESTRING': 'bg-lime-200 text-lime-900 border-lime-300',
      'MULTIPOINT': 'bg-teal-100 text-teal-700 border-teal-200',
      'MULTIPOLYGON': 'bg-green-300 text-green-800 border-green-400',
      'MULTILINESTRING': 'bg-lime-300 text-lime-900 border-lime-400',
      'GEOMETRYCOLLECTION': 'bg-emerald-300 text-emerald-900 border-emerald-400',
      // Network types
      'INET': 'bg-sky-100 text-sky-800 border-sky-200',
      'CIDR': 'bg-sky-200 text-sky-900 border-sky-300',
      'MACADDR': 'bg-cyan-300 text-cyan-900 border-cyan-400',
      // Full-text search
      'TSVECTOR': 'bg-stone-100 text-stone-800 border-stone-200',
      'TSQUERY': 'bg-stone-200 text-stone-900 border-stone-300',
      // Custom/User-defined
      'CUSTOM': 'bg-neutral-100 text-neutral-800 border-neutral-200',
    };
    return colorMap[type] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Get icon for data type
  const getDataTypeIcon = (type: DataType) => {
    if (['INTEGER', 'BIGINT', 'SMALLINT', 'TINYINT'].includes(type)) {
      return <Hash className="w-3 h-3" />;
    }
    if (['TEXT', 'VARCHAR', 'CHAR'].includes(type)) {
      return <Type className="w-3 h-3" />;
    }
    if (['DATE', 'DATETIME', 'TIMESTAMP'].includes(type)) {
      return <Calendar className="w-3 h-3" />;
    }
    if (['JSON', 'JSONB', 'XML'].includes(type)) {
      return <FileText className="w-3 h-3" />;
    }
    return <Database className="w-3 h-3" />;
  };

  // Get column statistics
  const primaryKeyColumns = table.columns.filter((col: any) => col.primaryKey);
  const foreignKeyColumns = table.columns.filter((col: any) => col.foreignKey);
  const requiredColumns = table.columns.filter((col: any) => !col.nullable);

  return (
    <div className={`rounded-lg transition-all duration-200 min-w-[250px] max-w-[400px] ${styles.container}`}>
      {/* Table Header */}
      <div className={`px-4 py-3 rounded-t-lg ${styles.header} ${styles.headerBorder}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4" />
            {isEditing ? (
              <input
                type="text"
                value={tableName}
                onChange={handleNameChange}
                onBlur={handleNameSubmit}
                onKeyDown={handleKeyPress}
                className={`flex-1 text-sm font-semibold rounded px-2 py-1 ${styles.input}`}
                autoFocus
              />
            ) : (
              <h3
                className="text-sm font-bold cursor-pointer hover:opacity-80 transition-opacity"
                onDoubleClick={() => setIsEditing(true)}
                title="Double-click to edit"
              >
                {table.name}
              </h3>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            {/* Table Statistics */}
            <div className="flex items-center space-x-1 mr-2 opacity-75">
              <span className="text-xs">{table.columns.length}</span>
              {primaryKeyColumns.length > 0 && (
                <div className="flex items-center space-x-0.5">
                  <Key className="w-3 h-3" />
                  <span className="text-xs">{primaryKeyColumns.length}</span>
                </div>
              )}
              {foreignKeyColumns.length > 0 && (
                <div className="flex items-center space-x-0.5">
                  <Link className="w-3 h-3" />
                  <span className="text-xs">{foreignKeyColumns.length}</span>
                </div>
              )}
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              title="Edit table name"
            >
              <Edit className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Delete button clicked, table ID:', table.id);
                console.log('onDeleteTable function:', onDeleteTable);
                if (onDeleteTable) {
                  onDeleteTable(table.id);
                } else {
                  console.error('onDeleteTable function is not defined');
                }
              }}
              className="p-1 hover:bg-red-500/20 rounded transition-colors"
              title="Delete table"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
        
        {/* Table Description */}
        {table.documentation && !compactMode && (
          <div className="mt-2 text-xs opacity-75">
            {table.documentation}
          </div>
        )}
      </div>

      {/* Columns */}
      <div className={`${compactMode ? 'p-1' : 'p-3'} space-y-1`}>
        {table.columns.map((column: Column, index: number) => (
          <div 
            key={column.id} 
            className={`group relative flex items-center space-x-2 p-1 rounded transition-colors ${
              hoveredColumn === column.id ? styles.hoverBg : ''
            }`}
            onMouseEnter={() => setHoveredColumn(column.id)}
            onMouseLeave={() => setHoveredColumn(null)}
          >
            {/* Column Handles for Relationships */}
            <Handle
              type="source"
              position={Position.Right}
              id={column.id}
              className="w-2 h-2 bg-orange-500 border-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ top: compactMode ? 15 + index * 28 : 20 + index * 32 }}
            />
            <Handle
              type="target"
              position={Position.Left}
              id={column.id}
              className="w-2 h-2 bg-blue-500 border-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ top: compactMode ? 15 + index * 28 : 20 + index * 32 }}
            />

            {/* Column Content */}
            <div className="flex-1 flex items-center space-x-2 min-w-0">
              {/* Column Icons */}
              <div className="flex items-center space-x-0.5">
                {column.primaryKey && (
                  <Key className="w-3 h-3 text-yellow-600" />
                )}
                {column.foreignKey && (
                  <Link className="w-3 h-3 text-blue-600" />
                )}
                {!column.nullable && (
                  <Lock className="w-3 h-3 text-red-600" />
                )}
                {column.constraints?.unique && (
                  <Star className="w-3 h-3 text-purple-600" />
                )}
                {column.indexed && (
                  <div title={`Indexed (${column.indexType || 'B-tree'})`}>
                    <Hash className="w-3 h-3 text-green-600" />
                  </div>
                )}
              </div>

              {/* Column Name */}
              <span className={`text-sm font-medium ${styles.text} min-w-0 flex-1 truncate`}>
                {column.name}
              </span>

              {/* Column Type */}
              {showColumnTypes && (
                <div className="flex items-center space-x-1">
                  {getDataTypeIcon(column.type)}
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${getDataTypeColor(column.type)}`}>
                    {column.type}
                  </span>
                </div>
              )}

              {/* Additional Constraints */}
              {showConstraints && !compactMode && (
                <div className="flex items-center space-x-1">
                  {column.constraints?.autoIncrement && (
                    <span className="text-xs bg-green-100 text-green-800 px-1 py-0.5 rounded border border-green-200">
                      AI
                    </span>
                  )}
                  {column.constraints?.check && (
                    <span className="text-xs bg-orange-100 text-orange-800 px-1 py-0.5 rounded border border-orange-200">
                      CHK
                    </span>
                  )}
                  {column.defaultValue && (
                    <span className="text-xs bg-gray-100 text-gray-800 px-1 py-0.5 rounded border border-gray-200">
                      DEF
                    </span>
                  )}
                  {column.indexed && (
                    <span className="text-xs bg-green-100 text-green-800 px-1 py-0.5 rounded border border-green-200" title={`Index: ${column.indexName || 'idx_' + column.name}`}>
                      IDX
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Column Actions */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteColumn(column.id);
                }}
                className={`p-1 ${styles.mutedText} hover:text-red-500 transition-colors`}
                title="Delete column"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}

        {/* Add Column Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onUpdateTable) {
              handleAddColumn();
            }
          }}
          className={`w-full flex items-center justify-center space-x-1 py-2 text-xs ${styles.mutedText} ${styles.hoverBg} rounded transition-colors border-2 border-dashed border-gray-300 hover:border-gray-400`}
        >
          <Plus className="w-3 h-3" />
          <span>Add Column</span>
        </button>
      </div>

      {/* Table Footer with Stats */}
      {!compactMode && (
        <div className={`px-3 py-2 text-xs ${styles.mutedText} border-t border-gray-600`}>
          <div className="flex justify-between items-center">
            <span>{table.columns.length} columns</span>
            <div className="flex space-x-3">
              <span>{primaryKeyColumns.length} PK</span>
              <span>{foreignKeyColumns.length} FK</span>
              <span>{requiredColumns.length} Required</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}