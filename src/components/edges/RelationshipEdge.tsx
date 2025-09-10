'use client';

// Enhanced Relationship Edge component for React Flow
// Professional ERD edge with cardinality notation and relationship types

import React from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer, BaseEdge, Edge } from '@xyflow/react';

export interface RelationshipEdgeData extends Record<string, unknown> {
  relationshipType: 'one-to-one' | 'one-to-many' | 'many-to-many' | 'self-referencing';
  sourceCardinality: string;
  targetCardinality: string;
  label?: string;
  constraintName?: string;
  isIdentifying?: boolean;
  cascadeDelete?: boolean;
  cascadeUpdate?: boolean;
  theme?: 'default' | 'modern' | 'minimal' | 'colorful';
}

export function RelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  selected,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const theme = (data as RelationshipEdgeData)?.theme || 'default';
  const isIdentifying = (data as RelationshipEdgeData)?.isIdentifying || false;
  const relationshipType = (data as RelationshipEdgeData)?.relationshipType || 'one-to-many';

  // Calculate cardinality positions
  const sourceCardinalityX = sourceX + (labelX - sourceX) * 0.2;
  const sourceCardinalityY = sourceY + (labelY - sourceY) * 0.2;
  const targetCardinalityX = targetX + (labelX - targetX) * 0.2;
  const targetCardinalityY = targetY + (labelY - targetY) * 0.2;

  // Get theme colors
  const getThemeColors = () => {
    switch (theme) {
      case 'modern':
        return {
          stroke: selected ? '#3b82f6' : '#6b7280',
          strokeWidth: selected ? 3 : 2,
          labelBg: selected ? 'bg-blue-100' : 'bg-gray-100',
          labelText: selected ? 'text-blue-800' : 'text-gray-700',
          cardinalityBg: 'bg-white',
          cardinalityText: 'text-gray-600',
          border: selected ? 'border-blue-300' : 'border-gray-300'
        };
      case 'minimal':
        return {
          stroke: selected ? '#000000' : '#666666',
          strokeWidth: selected ? 2 : 1,
          labelBg: 'bg-white',
          labelText: 'text-gray-800',
          cardinalityBg: 'bg-white',
          cardinalityText: 'text-gray-600',
          border: 'border-gray-400'
        };
      case 'colorful':
        return {
          stroke: selected ? '#f59e0b' : getRelationshipColor(relationshipType),
          strokeWidth: selected ? 3 : 2,
          labelBg: selected ? 'bg-amber-100' : getRelationshipBg(relationshipType),
          labelText: selected ? 'text-amber-800' : getRelationshipTextColor(relationshipType),
          cardinalityBg: 'bg-white',
          cardinalityText: getRelationshipTextColor(relationshipType),
          border: selected ? 'border-amber-300' : getRelationshipBorderColor(relationshipType)
        };
      default:
        return {
          stroke: selected ? '#f97316' : '#ea580c',
          strokeWidth: selected ? 3 : 2,
          labelBg: selected ? 'bg-orange-100' : 'bg-orange-50',
          labelText: selected ? 'text-orange-800' : 'text-orange-700',
          cardinalityBg: 'bg-white',
          cardinalityText: 'text-orange-600',
          border: selected ? 'border-orange-300' : 'border-orange-200'
        };
    }
  };

  const colors = getThemeColors();

  // Get cardinality symbols
  const getCardinalitySymbol = (cardinality: string, isSource: boolean) => {
    switch (relationshipType) {
      case 'one-to-one':
        return '1';
      case 'one-to-many':
        return isSource ? '1' : '∞';
      case 'many-to-many':
        return '∞';
      case 'self-referencing':
        return isSource ? '1' : '∞';
      default:
        return (data as RelationshipEdgeData)?.sourceCardinality || (data as RelationshipEdgeData)?.targetCardinality || '1';
    }
  };

  const sourceCardinalitySymbol = getCardinalitySymbol((data as RelationshipEdgeData)?.sourceCardinality || '', true);
  const targetCardinalitySymbol = getCardinalitySymbol((data as RelationshipEdgeData)?.targetCardinality || '', false);

  // Get relationship label
  const getRelationshipLabel = () => {
    if ((data as RelationshipEdgeData)?.label) return (data as RelationshipEdgeData).label;
    
    switch (relationshipType) {
      case 'one-to-one':
        return '1:1';
      case 'one-to-many':
        return '1:M';
      case 'many-to-many':
        return 'M:M';
      case 'self-referencing':
        return 'Self';
      default:
        return 'FK';
    }
  };

  return (
    <>
      {/* Main relationship line */}
      <BaseEdge
        id={id as string}
        path={edgePath}
        style={{
          stroke: colors.stroke,
          strokeWidth: colors.strokeWidth,
          strokeDasharray: isIdentifying ? '0' : '5,5',
          ...(style as React.CSSProperties),
        }}
      />

      {/* Relationship markers at ends */}
      {relationshipType === 'one-to-many' && (
        <>
          {/* One side marker (circle) */}
          <circle
            cx={sourceX}
            cy={sourceY}
            r="4"
            fill="white"
            stroke={colors.stroke}
            strokeWidth="2"
          />
          {/* Many side marker (crow's foot) */}
          <g transform={`translate(${targetX}, ${targetY})`}>
            <path
              d="M-8,-4 L0,0 L-8,4 M-8,0 L0,0"
              stroke={colors.stroke}
              strokeWidth="2"
              fill="none"
            />
          </g>
        </>
      )}

      {relationshipType === 'one-to-one' && (
        <>
          {/* Both sides have circles */}
          <circle
            cx={sourceX}
            cy={sourceY}
            r="4"
            fill="white"
            stroke={colors.stroke}
            strokeWidth="2"
          />
          <circle
            cx={targetX}
            cy={targetY}
            r="4"
            fill="white"
            stroke={colors.stroke}
            strokeWidth="2"
          />
        </>
      )}

      {relationshipType === 'many-to-many' && (
        <>
          {/* Both sides have crow's feet */}
          <g transform={`translate(${sourceX}, ${sourceY})`}>
            <path
              d="M8,-4 L0,0 L8,4 M8,0 L0,0"
              stroke={colors.stroke}
              strokeWidth="2"
              fill="none"
            />
          </g>
          <g transform={`translate(${targetX}, ${targetY})`}>
            <path
              d="M-8,-4 L0,0 L-8,4 M-8,0 L0,0"
              stroke={colors.stroke}
              strokeWidth="2"
              fill="none"
            />
          </g>
        </>
      )}

      <EdgeLabelRenderer>
        {/* Source cardinality */}
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${sourceCardinalityX}px,${sourceCardinalityY}px)`,
            fontSize: 12,
            pointerEvents: 'none',
          }}
          className="nodrag nopan"
        >
          <div className={`${colors.cardinalityBg} ${colors.cardinalityText} px-1 py-0.5 rounded text-xs font-bold border ${colors.border} shadow-sm`}>
            {sourceCardinalitySymbol}
          </div>
        </div>

        {/* Target cardinality */}
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${targetCardinalityX}px,${targetCardinalityY}px)`,
            fontSize: 12,
            pointerEvents: 'none',
          }}
          className="nodrag nopan"
        >
          <div className={`${colors.cardinalityBg} ${colors.cardinalityText} px-1 py-0.5 rounded text-xs font-bold border ${colors.border} shadow-sm`}>
            {targetCardinalitySymbol}
          </div>
        </div>

        {/* Main relationship label */}
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <div className={`${colors.labelBg} ${colors.labelText} px-2 py-1 rounded text-xs font-medium border ${colors.border} shadow-sm`}>
            <div className="flex items-center gap-1">
              {isIdentifying && <span className="text-xs">●</span>}
              {getRelationshipLabel()}
              {(data as RelationshipEdgeData)?.cascadeDelete && <span className="text-xs" title="Cascade Delete">⚡</span>}    
              {(data as RelationshipEdgeData)?.cascadeUpdate && <span className="text-xs" title="Cascade Update">⟲</span>}     
            </div>
            {(data as RelationshipEdgeData)?.constraintName && (
              <div className="text-xs opacity-75 mt-0.5">{(data as RelationshipEdgeData).constraintName}</div>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

// Helper functions for colorful theme
function getRelationshipColor(type: string): string {
  switch (type) {
    case 'one-to-one': return '#10b981';
    case 'one-to-many': return '#f59e0b';
    case 'many-to-many': return '#ef4444';
    case 'self-referencing': return '#8b5cf6';
    default: return '#f97316';
  }
}

function getRelationshipBg(type: string): string {
  switch (type) {
    case 'one-to-one': return 'bg-emerald-100';
    case 'one-to-many': return 'bg-amber-100';
    case 'many-to-many': return 'bg-red-100';
    case 'self-referencing': return 'bg-purple-100';
    default: return 'bg-orange-100';
  }
}

function getRelationshipTextColor(type: string): string {
  switch (type) {
    case 'one-to-one': return 'text-emerald-800';
    case 'one-to-many': return 'text-amber-800';
    case 'many-to-many': return 'text-red-800';
    case 'self-referencing': return 'text-purple-800';
    default: return 'text-orange-800';
  }
}

function getRelationshipBorderColor(type: string): string {
  switch (type) {
    case 'one-to-one': return 'border-emerald-300';
    case 'one-to-many': return 'border-amber-300';
    case 'many-to-many': return 'border-red-300';
    case 'self-referencing': return 'border-purple-300';
    default: return 'border-orange-300';
  }
}