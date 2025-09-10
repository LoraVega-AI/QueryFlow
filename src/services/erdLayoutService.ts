// ERD Auto-Layout Service for QueryFlow
// Provides various layout algorithms for professional ERD visualization

import { Node, Edge } from '@xyflow/react';
import { Table, DatabaseSchema } from '@/types/database';

export interface LayoutOptions {
  algorithm: 'hierarchical' | 'force-directed' | 'circular' | 'grid' | 'layered' | 'organic';
  direction?: 'horizontal' | 'vertical';
  spacing?: {
    node: number;
    rank: number;
  };
  iterations?: number;
  centerOnCanvas?: boolean;
  avoidOverlaps?: boolean;
  groupByType?: boolean;
}

export interface LayoutResult {
  nodes: Node[];
  edges: Edge[];
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  metadata: {
    algorithm: string;
    executionTime: number;
    nodeCount: number;
    edgeCount: number;
  };
}

export class ERDLayoutService {
  private static readonly DEFAULT_NODE_SIZE = { width: 250, height: 200 };
  private static readonly DEFAULT_SPACING = { node: 100, rank: 150 };

  /**
   * Apply auto-layout to ERD nodes and edges
   */
  static async applyLayout(
    nodes: Node[],
    edges: Edge[],
    options: LayoutOptions
  ): Promise<LayoutResult> {
    const startTime = Date.now();
    
    let layoutNodes: Node[];
    
    switch (options.algorithm) {
      case 'hierarchical':
        layoutNodes = await this.applyHierarchicalLayout(nodes, edges, options);
        break;
      case 'force-directed':
        layoutNodes = await this.applyForceDirectedLayout(nodes, edges, options);
        break;
      case 'circular':
        layoutNodes = await this.applyCircularLayout(nodes, edges, options);
        break;
      case 'grid':
        layoutNodes = await this.applyGridLayout(nodes, edges, options);
        break;
      case 'layered':
        layoutNodes = await this.applyLayeredLayout(nodes, edges, options);
        break;
      case 'organic':
        layoutNodes = await this.applyOrganicLayout(nodes, edges, options);
        break;
      default:
        layoutNodes = nodes;
    }

    // Center nodes on canvas if requested
    if (options.centerOnCanvas) {
      layoutNodes = this.centerNodesOnCanvas(layoutNodes);
    }

    // Calculate bounds
    const bounds = this.calculateBounds(layoutNodes);
    
    const executionTime = Date.now() - startTime;

    return {
      nodes: layoutNodes,
      edges,
      bounds,
      metadata: {
        algorithm: options.algorithm,
        executionTime,
        nodeCount: nodes.length,
        edgeCount: edges.length
      }
    };
  }

  /**
   * Hierarchical layout - arranges tables in layers based on relationships
   */
  private static async applyHierarchicalLayout(
    nodes: Node[],
    edges: Edge[],
    options: LayoutOptions
  ): Promise<Node[]> {
    const spacing = { ...this.DEFAULT_SPACING, ...options.spacing };
    const isHorizontal = options.direction === 'horizontal';

    // Build dependency graph
    const dependencies = this.buildDependencyGraph(nodes, edges);
    
    // Perform topological sort to determine layers
    const layers = this.topologicalSort(nodes, dependencies);
    
    const layoutNodes: Node[] = [];

    layers.forEach((layer, layerIndex) => {
      layer.forEach((node, nodeIndex) => {
        const layerOffset = layerIndex * (this.DEFAULT_NODE_SIZE.height + spacing.rank);
        const nodeOffset = nodeIndex * (this.DEFAULT_NODE_SIZE.width + spacing.node);
        
        // Center nodes in each layer
        const layerWidth = layer.length * (this.DEFAULT_NODE_SIZE.width + spacing.node) - spacing.node;
        const startOffset = -layerWidth / 2;

        layoutNodes.push({
          ...node,
          position: isHorizontal
            ? { x: layerOffset, y: startOffset + nodeOffset }
            : { x: startOffset + nodeOffset, y: layerOffset }
        });
      });
    });

    return layoutNodes;
  }

  /**
   * Force-directed layout - uses physics simulation for natural positioning
   */
  private static async applyForceDirectedLayout(
    nodes: Node[],
    edges: Edge[],
    options: LayoutOptions
  ): Promise<Node[]> {
    const iterations = options.iterations || 300;
    const spacing = { ...this.DEFAULT_SPACING, ...options.spacing };
    
    // Initialize random positions
    const layoutNodes = nodes.map(node => ({
      ...node,
      position: {
        x: (Math.random() - 0.5) * 1000,
        y: (Math.random() - 0.5) * 1000
      }
    }));

    // Physics simulation parameters
    const k = Math.sqrt((1000 * 1000) / nodes.length); // Optimal distance
    const temperature = 100;
    const coolingFactor = 0.95;

    let currentTemp = temperature;

    for (let iteration = 0; iteration < iterations; iteration++) {
      const forces = new Map<string, { x: number; y: number }>();
      
      // Initialize forces
      layoutNodes.forEach(node => {
        forces.set(node.id, { x: 0, y: 0 });
      });

      // Repulsive forces between all nodes
      for (let i = 0; i < layoutNodes.length; i++) {
        for (let j = i + 1; j < layoutNodes.length; j++) {
          const node1 = layoutNodes[i];
          const node2 = layoutNodes[j];
          
          const dx = node1.position.x - node2.position.x;
          const dy = node1.position.y - node2.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          
          const repulsiveForce = (k * k) / distance;
          const fx = (dx / distance) * repulsiveForce;
          const fy = (dy / distance) * repulsiveForce;
          
          const force1 = forces.get(node1.id)!;
          const force2 = forces.get(node2.id)!;
          
          force1.x += fx;
          force1.y += fy;
          force2.x -= fx;
          force2.y -= fy;
        }
      }

      // Attractive forces between connected nodes
      edges.forEach(edge => {
        const sourceNode = layoutNodes.find(n => n.id === edge.source);
        const targetNode = layoutNodes.find(n => n.id === edge.target);
        
        if (sourceNode && targetNode) {
          const dx = sourceNode.position.x - targetNode.position.x;
          const dy = sourceNode.position.y - targetNode.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          
          const attractiveForce = (distance * distance) / k;
          const fx = (dx / distance) * attractiveForce;
          const fy = (dy / distance) * attractiveForce;
          
          const sourceForce = forces.get(sourceNode.id)!;
          const targetForce = forces.get(targetNode.id)!;
          
          sourceForce.x -= fx;
          sourceForce.y -= fy;
          targetForce.x += fx;
          targetForce.y += fy;
        }
      });

      // Apply forces with temperature cooling
      layoutNodes.forEach(node => {
        const force = forces.get(node.id)!;
        const displacement = Math.sqrt(force.x * force.x + force.y * force.y) || 1;
        const limitedDisplacement = Math.min(displacement, currentTemp);
        
        node.position.x += (force.x / displacement) * limitedDisplacement;
        node.position.y += (force.y / displacement) * limitedDisplacement;
      });

      currentTemp *= coolingFactor;

      // Early termination if converged
      if (currentTemp < 1) break;
    }

    return layoutNodes;
  }

  /**
   * Circular layout - arranges tables in a circle
   */
  private static async applyCircularLayout(
    nodes: Node[],
    edges: Edge[],
    options: LayoutOptions
  ): Promise<Node[]> {
    const radius = Math.max(200, nodes.length * 30);
    const angleStep = (2 * Math.PI) / nodes.length;

    return nodes.map((node, index) => {
      const angle = index * angleStep;
      return {
        ...node,
        position: {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius
        }
      };
    });
  }

  /**
   * Grid layout - arranges tables in a grid pattern
   */
  private static async applyGridLayout(
    nodes: Node[],
    edges: Edge[],
    options: LayoutOptions
  ): Promise<Node[]> {
    const spacing = { ...this.DEFAULT_SPACING, ...options.spacing };
    const columns = Math.ceil(Math.sqrt(nodes.length));
    
    return nodes.map((node, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;
      
      return {
        ...node,
        position: {
          x: col * (this.DEFAULT_NODE_SIZE.width + spacing.node),
          y: row * (this.DEFAULT_NODE_SIZE.height + spacing.rank)
        }
      };
    });
  }

  /**
   * Layered layout - groups related tables into layers
   */
  private static async applyLayeredLayout(
    nodes: Node[],
    edges: Edge[],
    options: LayoutOptions
  ): Promise<Node[]> {
    const spacing = { ...this.DEFAULT_SPACING, ...options.spacing };
    
    // Group nodes by relationship density
    const groups = this.groupNodesByRelationships(nodes, edges);
    
    const layoutNodes: Node[] = [];
    let currentY = 0;

    groups.forEach((group, groupIndex) => {
      const groupWidth = group.length * (this.DEFAULT_NODE_SIZE.width + spacing.node);
      const startX = -groupWidth / 2;
      
      group.forEach((node, nodeIndex) => {
        layoutNodes.push({
          ...node,
          position: {
            x: startX + nodeIndex * (this.DEFAULT_NODE_SIZE.width + spacing.node),
            y: currentY
          }
        });
      });
      
      currentY += this.DEFAULT_NODE_SIZE.height + spacing.rank;
    });

    return layoutNodes;
  }

  /**
   * Organic layout - natural-looking layout with clustering
   */
  private static async applyOrganicLayout(
    nodes: Node[],
    edges: Edge[],
    options: LayoutOptions
  ): Promise<Node[]> {
    // Start with force-directed as base
    let layoutNodes = await this.applyForceDirectedLayout(nodes, edges, {
      ...options,
      iterations: 150
    });

    // Add clustering based on table relationships
    const clusters = this.identifyClusters(layoutNodes, edges);
    
    // Adjust positions to enhance clustering
    clusters.forEach(cluster => {
      const center = this.calculateClusterCenter(cluster);
      cluster.forEach(node => {
        const distance = this.calculateDistance(node.position, center);
        if (distance > 300) {
          // Pull distant nodes closer to cluster center
          const pullFactor = 0.3;
          node.position.x += (center.x - node.position.x) * pullFactor;
          node.position.y += (center.y - node.position.y) * pullFactor;
        }
      });
    });

    return layoutNodes;
  }

  /**
   * Smart layout - automatically chooses best layout based on schema structure
   */
  static async applySmartLayout(
    nodes: Node[],
    edges: Edge[],
    schema: DatabaseSchema
  ): Promise<LayoutResult> {
    const nodeCount = nodes.length;
    const edgeCount = edges.length;
    const density = edgeCount / (nodeCount * (nodeCount - 1) / 2);

    let algorithm: LayoutOptions['algorithm'];
    let options: LayoutOptions;

    if (nodeCount <= 5) {
      // Small schemas: use circular layout
      algorithm = 'circular';
      options = { algorithm };
    } else if (density > 0.3) {
      // Dense relationships: use force-directed
      algorithm = 'force-directed';
      options = { algorithm, iterations: 200 };
    } else if (this.hasHierarchicalStructure(nodes, edges)) {
      // Clear hierarchy: use hierarchical layout
      algorithm = 'hierarchical';
      options = { algorithm, direction: 'vertical' };
    } else if (nodeCount > 20) {
      // Large schemas: use layered layout
      algorithm = 'layered';
      options = { algorithm };
    } else {
      // Default: organic layout
      algorithm = 'organic';
      options = { algorithm };
    }

    return this.applyLayout(nodes, edges, {
      ...options,
      centerOnCanvas: true,
      avoidOverlaps: true
    });
  }

  // Helper methods

  private static buildDependencyGraph(nodes: Node[], edges: Edge[]): Map<string, string[]> {
    const dependencies = new Map<string, string[]>();
    
    nodes.forEach(node => {
      dependencies.set(node.id, []);
    });
    
    edges.forEach(edge => {
      const targetDeps = dependencies.get(edge.target) || [];
      targetDeps.push(edge.source);
      dependencies.set(edge.target, targetDeps);
    });
    
    return dependencies;
  }

  private static topologicalSort(nodes: Node[], dependencies: Map<string, string[]>): Node[][] {
    const visited = new Set<string>();
    const layers: Node[][] = [];
    
    while (visited.size < nodes.length) {
      const currentLayer: Node[] = [];
      
      for (const node of nodes) {
        if (!visited.has(node.id)) {
          const deps = dependencies.get(node.id) || [];
          if (deps.every(dep => visited.has(dep))) {
            currentLayer.push(node);
          }
        }
      }
      
      if (currentLayer.length === 0) {
        // Circular dependency - add remaining nodes
        const remaining = nodes.filter(node => !visited.has(node.id));
        currentLayer.push(...remaining);
      }
      
      currentLayer.forEach(node => visited.add(node.id));
      layers.push(currentLayer);
    }
    
    return layers;
  }

  private static groupNodesByRelationships(nodes: Node[], edges: Edge[]): Node[][] {
    const adjacencyMap = new Map<string, Set<string>>();
    
    // Build adjacency map
    nodes.forEach(node => {
      adjacencyMap.set(node.id, new Set());
    });
    
    edges.forEach(edge => {
      adjacencyMap.get(edge.source)?.add(edge.target);
      adjacencyMap.get(edge.target)?.add(edge.source);
    });
    
    // Group nodes by connection density
    const visited = new Set<string>();
    const groups: Node[][] = [];
    
    nodes.forEach(node => {
      if (!visited.has(node.id)) {
        const group = this.breadthFirstSearch(node, nodes, adjacencyMap, visited);
        if (group.length > 0) {
          groups.push(group);
        }
      }
    });
    
    return groups;
  }

  private static breadthFirstSearch(
    startNode: Node,
    allNodes: Node[],
    adjacencyMap: Map<string, Set<string>>,
    visited: Set<string>
  ): Node[] {
    const queue = [startNode];
    const group: Node[] = [];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      
      if (!visited.has(current.id)) {
        visited.add(current.id);
        group.push(current);
        
        const neighbors = adjacencyMap.get(current.id) || new Set();
        neighbors.forEach(neighborId => {
          const neighbor = allNodes.find(n => n.id === neighborId);
          if (neighbor && !visited.has(neighborId)) {
            queue.push(neighbor);
          }
        });
      }
    }
    
    return group;
  }

  private static identifyClusters(nodes: Node[], edges: Edge[]): Node[][] {
    // Simple clustering based on spatial proximity and connectivity
    const clusters: Node[][] = [];
    const visited = new Set<string>();
    
    nodes.forEach(node => {
      if (!visited.has(node.id)) {
        const cluster = [node];
        visited.add(node.id);
        
        // Find nearby connected nodes
        nodes.forEach(otherNode => {
          if (!visited.has(otherNode.id)) {
            const distance = this.calculateDistance(node.position, otherNode.position);
            const isConnected = edges.some(edge => 
              (edge.source === node.id && edge.target === otherNode.id) ||
              (edge.target === node.id && edge.source === otherNode.id)
            );
            
            if (distance < 400 || isConnected) {
              cluster.push(otherNode);
              visited.add(otherNode.id);
            }
          }
        });
        
        clusters.push(cluster);
      }
    });
    
    return clusters;
  }

  private static calculateClusterCenter(cluster: Node[]): { x: number; y: number } {
    const totalX = cluster.reduce((sum, node) => sum + node.position.x, 0);
    const totalY = cluster.reduce((sum, node) => sum + node.position.y, 0);
    
    return {
      x: totalX / cluster.length,
      y: totalY / cluster.length
    };
  }

  private static calculateDistance(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private static centerNodesOnCanvas(nodes: Node[]): Node[] {
    if (nodes.length === 0) return nodes;
    
    const bounds = this.calculateBounds(nodes);
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    
    return nodes.map(node => ({
      ...node,
      position: {
        x: node.position.x - centerX,
        y: node.position.y - centerY
      }
    }));
  }

  private static calculateBounds(nodes: Node[]): { minX: number; minY: number; maxX: number; maxY: number } {
    if (nodes.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    nodes.forEach(node => {
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + this.DEFAULT_NODE_SIZE.width);
      maxY = Math.max(maxY, node.position.y + this.DEFAULT_NODE_SIZE.height);
    });
    
    return { minX, minY, maxX, maxY };
  }

  private static hasHierarchicalStructure(nodes: Node[], edges: Edge[]): boolean {
    // Check if the graph has a clear hierarchical structure
    const inDegree = new Map<string, number>();
    const outDegree = new Map<string, number>();
    
    nodes.forEach(node => {
      inDegree.set(node.id, 0);
      outDegree.set(node.id, 0);
    });
    
    edges.forEach(edge => {
      outDegree.set(edge.source, (outDegree.get(edge.source) || 0) + 1);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    });
    
    // Check for clear root nodes (high out-degree, low in-degree)
    const rootNodes = nodes.filter(node => 
      (outDegree.get(node.id) || 0) > 0 && (inDegree.get(node.id) || 0) === 0
    );
    
    // Check for clear leaf nodes (low out-degree, high in-degree)
    const leafNodes = nodes.filter(node => 
      (outDegree.get(node.id) || 0) === 0 && (inDegree.get(node.id) || 0) > 0
    );
    
    return rootNodes.length > 0 && leafNodes.length > 0;
  }

  /**
   * Get layout suggestions based on schema analysis
   */
  static getLayoutSuggestions(schema: DatabaseSchema): Array<{
    algorithm: LayoutOptions['algorithm'];
    name: string;
    description: string;
    suitability: number;
    reason: string;
  }> {
    const nodeCount = schema.tables.length;
    const relationships = schema.tables.reduce((count, table) => 
      count + table.columns.filter(col => col.foreignKey).length, 0
    );
    
    // Convert schema to nodes and edges for analysis
    const nodes = schema.tables.map(table => ({
      id: table.id,
      type: 'table',
      position: table.position,
      data: { table }
    }));
    
    const edges: Edge[] = [];
    schema.tables.forEach(table => {
      table.columns.forEach(column => {
        if (column.foreignKey && column.foreignKey.tableId) {
          edges.push({
            id: `edge_${table.id}_${column.foreignKey.tableId}`,
            source: table.id,
            target: column.foreignKey.tableId,
            type: 'relationship'
          });
        }
      });
    });
    
    const suggestions = [
      {
        algorithm: 'hierarchical' as const,
        name: 'Hierarchical',
        description: 'Best for schemas with clear parent-child relationships',
        suitability: this.hasHierarchicalStructure(nodes, edges) ? 0.9 : 0.3,
        reason: 'Clear dependency structure detected'
      },
      {
        algorithm: 'force-directed' as const,
        name: 'Force-Directed',
        description: 'Natural layout using physics simulation',
        suitability: nodeCount > 5 && nodeCount < 20 ? 0.8 : 0.6,
        reason: 'Good balance for medium-sized schemas'
      },
      {
        algorithm: 'circular' as const,
        name: 'Circular',
        description: 'Arranges tables in a circle',
        suitability: nodeCount <= 8 ? 0.7 : 0.2,
        reason: 'Optimal for small schemas'
      },
      {
        algorithm: 'layered' as const,
        name: 'Layered',
        description: 'Groups related tables into layers',
        suitability: nodeCount > 15 ? 0.8 : 0.4,
        reason: 'Manages complexity in large schemas'
      },
      {
        algorithm: 'organic' as const,
        name: 'Organic',
        description: 'Natural clustering with relationship awareness',
        suitability: relationships > nodeCount ? 0.9 : 0.7,
        reason: 'Excellent for highly connected schemas'
      }
    ];
    
    return suggestions.sort((a, b) => b.suitability - a.suitability);
  }
}
