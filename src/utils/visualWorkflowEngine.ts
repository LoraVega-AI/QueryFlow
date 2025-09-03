// Visual Workflow Designer Engine
// Provides drag-and-drop workflow creation with visual flowcharts

export interface WorkflowNode {
  id: string;
  type: 'start' | 'end' | 'action' | 'condition' | 'loop' | 'parallel' | 'delay' | 'notification' | 'data_transform' | 'api_call' | 'database_query';
  position: { x: number; y: number };
  data: {
    label: string;
    description?: string;
    config?: any;
    inputs?: string[];
    outputs?: string[];
    conditions?: WorkflowCondition[];
    actions?: WorkflowAction[];
  };
  style?: {
    backgroundColor?: string;
    borderColor?: string;
    color?: string;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  type?: 'default' | 'conditional' | 'error' | 'success';
  label?: string;
  condition?: string;
  style?: {
    stroke?: string;
    strokeWidth?: number;
    strokeDasharray?: string;
  };
  animated?: boolean;
}

export interface WorkflowCondition {
  id: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'exists' | 'is_empty';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface WorkflowAction {
  id: string;
  type: 'query' | 'transform' | 'notification' | 'api_call' | 'delay' | 'condition';
  config: any;
  order: number;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'data_processing' | 'automation' | 'monitoring' | 'integration' | 'custom';
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  tags: string[];
  complexity: 'simple' | 'medium' | 'complex';
  estimatedTime: number; // in minutes
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  startTime: Date;
  endTime?: Date;
  currentNode?: string;
  variables: Record<string, any>;
  logs: WorkflowLog[];
  error?: string;
}

export interface WorkflowLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  nodeId?: string;
  data?: any;
}

export class VisualWorkflowEngine {
  private nodes: WorkflowNode[] = [];
  private edges: WorkflowEdge[] = [];
  private templates: WorkflowTemplate[] = [];
  private executions: WorkflowExecution[] = [];
  private nodeTypes: Map<string, any> = new Map();

  constructor() {
    this.initializeNodeTypes();
    this.initializeTemplates();
  }

  // Initialize available node types
  private initializeNodeTypes(): void {
    this.nodeTypes.set('start', {
      label: 'Start',
      description: 'Workflow entry point',
      icon: '▶️',
      color: '#10B981',
      inputs: [],
      outputs: ['output']
    });

    this.nodeTypes.set('end', {
      label: 'End',
      description: 'Workflow exit point',
      icon: '🏁',
      color: '#EF4444',
      inputs: ['input'],
      outputs: []
    });

    this.nodeTypes.set('action', {
      label: 'Action',
      description: 'Execute a specific action',
      icon: '⚡',
      color: '#3B82F6',
      inputs: ['input'],
      outputs: ['success', 'error']
    });

    this.nodeTypes.set('condition', {
      label: 'Condition',
      description: 'Branch based on conditions',
      icon: '❓',
      color: '#F59E0B',
      inputs: ['input'],
      outputs: ['true', 'false']
    });

    this.nodeTypes.set('loop', {
      label: 'Loop',
      description: 'Repeat actions',
      icon: '🔄',
      color: '#8B5CF6',
      inputs: ['input'],
      outputs: ['output', 'break']
    });

    this.nodeTypes.set('parallel', {
      label: 'Parallel',
      description: 'Execute multiple branches',
      icon: '⚡',
      color: '#06B6D4',
      inputs: ['input'],
      outputs: ['branch1', 'branch2', 'branch3']
    });

    this.nodeTypes.set('delay', {
      label: 'Delay',
      description: 'Wait for specified time',
      icon: '⏱️',
      color: '#6B7280',
      inputs: ['input'],
      outputs: ['output']
    });

    this.nodeTypes.set('notification', {
      label: 'Notification',
      description: 'Send notification',
      icon: '📧',
      color: '#EC4899',
      inputs: ['input'],
      outputs: ['output']
    });

    this.nodeTypes.set('data_transform', {
      label: 'Data Transform',
      description: 'Transform data',
      icon: '🔄',
      color: '#059669',
      inputs: ['input'],
      outputs: ['output']
    });

    this.nodeTypes.set('api_call', {
      label: 'API Call',
      description: 'Make external API call',
      icon: '🌐',
      color: '#DC2626',
      inputs: ['input'],
      outputs: ['success', 'error']
    });

    this.nodeTypes.set('database_query', {
      label: 'Database Query',
      description: 'Execute database query',
      icon: '🗄️',
      color: '#7C3AED',
      inputs: ['input'],
      outputs: ['success', 'error']
    });
  }

  // Initialize workflow templates
  private initializeTemplates(): void {
    this.templates = [
      {
        id: 'data_processing_basic',
        name: 'Basic Data Processing',
        description: 'Simple data transformation workflow',
        category: 'data_processing',
        complexity: 'simple',
        estimatedTime: 5,
        tags: ['data', 'transform', 'basic'],
        nodes: [
          {
            id: 'start_1',
            type: 'start',
            position: { x: 100, y: 100 },
            data: { label: 'Start' }
          },
          {
            id: 'query_1',
            type: 'database_query',
            position: { x: 300, y: 100 },
            data: {
              label: 'Fetch Data',
              config: { query: 'SELECT * FROM users' }
            }
          },
          {
            id: 'transform_1',
            type: 'data_transform',
            position: { x: 500, y: 100 },
            data: {
              label: 'Transform Data',
              config: { operation: 'clean' }
            }
          },
          {
            id: 'end_1',
            type: 'end',
            position: { x: 700, y: 100 },
            data: { label: 'End' }
          }
        ],
        edges: [
          { id: 'e1', source: 'start_1', target: 'query_1' },
          { id: 'e2', source: 'query_1', target: 'transform_1' },
          { id: 'e3', source: 'transform_1', target: 'end_1' }
        ]
      },
      {
        id: 'conditional_workflow',
        name: 'Conditional Processing',
        description: 'Workflow with conditional branching',
        category: 'automation',
        complexity: 'medium',
        estimatedTime: 10,
        tags: ['conditional', 'branching', 'automation'],
        nodes: [
          {
            id: 'start_2',
            type: 'start',
            position: { x: 100, y: 100 },
            data: { label: 'Start' }
          },
          {
            id: 'condition_1',
            type: 'condition',
            position: { x: 300, y: 100 },
            data: {
              label: 'Check Status',
              conditions: [{
                id: 'c1',
                field: 'status',
                operator: 'equals',
                value: 'active'
              }]
            }
          },
          {
            id: 'action_1',
            type: 'action',
            position: { x: 500, y: 50 },
            data: { label: 'Process Active' }
          },
          {
            id: 'action_2',
            type: 'action',
            position: { x: 500, y: 150 },
            data: { label: 'Process Inactive' }
          },
          {
            id: 'end_2',
            type: 'end',
            position: { x: 700, y: 100 },
            data: { label: 'End' }
          }
        ],
        edges: [
          { id: 'e4', source: 'start_2', target: 'condition_1' },
          { id: 'e5', source: 'condition_1', target: 'action_1', type: 'conditional', label: 'Yes' },
          { id: 'e6', source: 'condition_1', target: 'action_2', type: 'conditional', label: 'No' },
          { id: 'e7', source: 'action_1', target: 'end_2' },
          { id: 'e8', source: 'action_2', target: 'end_2' }
        ]
      },
      {
        id: 'monitoring_workflow',
        name: 'Data Monitoring',
        description: 'Monitor data and send alerts',
        category: 'monitoring',
        complexity: 'medium',
        estimatedTime: 15,
        tags: ['monitoring', 'alerts', 'data'],
        nodes: [
          {
            id: 'start_3',
            type: 'start',
            position: { x: 100, y: 100 },
            data: { label: 'Start' }
          },
          {
            id: 'query_2',
            type: 'database_query',
            position: { x: 300, y: 100 },
            data: {
              label: 'Check Data',
              config: { query: 'SELECT COUNT(*) FROM logs WHERE created_at > NOW() - INTERVAL 1 HOUR' }
            }
          },
          {
            id: 'condition_2',
            type: 'condition',
            position: { x: 500, y: 100 },
            data: {
              label: 'Threshold Check',
              conditions: [{
                id: 'c2',
                field: 'count',
                operator: 'greater_than',
                value: 1000
              }]
            }
          },
          {
            id: 'notification_1',
            type: 'notification',
            position: { x: 700, y: 50 },
            data: {
              label: 'Send Alert',
              config: { type: 'email', message: 'High data volume detected' }
            }
          },
          {
            id: 'delay_1',
            type: 'delay',
            position: { x: 700, y: 150 },
            data: {
              label: 'Wait 5 min',
              config: { duration: 300000 }
            }
          },
          {
            id: 'end_3',
            type: 'end',
            position: { x: 900, y: 100 },
            data: { label: 'End' }
          }
        ],
        edges: [
          { id: 'e9', source: 'start_3', target: 'query_2' },
          { id: 'e10', source: 'query_2', target: 'condition_2' },
          { id: 'e11', source: 'condition_2', target: 'notification_1', type: 'conditional', label: 'High' },
          { id: 'e12', source: 'condition_2', target: 'delay_1', type: 'conditional', label: 'Normal' },
          { id: 'e13', source: 'notification_1', target: 'end_3' },
          { id: 'e14', source: 'delay_1', target: 'end_3' }
        ]
      }
    ];
  }

  // Create a new workflow node
  createNode(type: string, position: { x: number; y: number }, data?: any): WorkflowNode {
    const nodeType = this.nodeTypes.get(type);
    if (!nodeType) {
      throw new Error(`Unknown node type: ${type}`);
    }

    const node: WorkflowNode = {
      id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: type as any,
      position,
      data: {
        label: data?.label || nodeType.label,
        description: data?.description || nodeType.description,
        config: data?.config || {},
        inputs: nodeType.inputs,
        outputs: nodeType.outputs,
        conditions: data?.conditions || [],
        actions: data?.actions || []
      },
      style: {
        backgroundColor: nodeType.color,
        borderColor: nodeType.color,
        color: '#FFFFFF'
      }
    };

    this.nodes.push(node);
    return node;
  }

  // Create a new workflow edge
  createEdge(source: string, target: string, type: string = 'default', data?: any): WorkflowEdge {
    const edge: WorkflowEdge = {
      id: `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      source,
      target,
      type: type as any,
      label: data?.label,
      condition: data?.condition,
      style: this.getEdgeStyle(type),
      animated: data?.animated || false
    };

    this.edges.push(edge);
    return edge;
  }

  // Get edge style based on type
  private getEdgeStyle(type: string): any {
    const styles = {
      default: { stroke: '#94A3B8', strokeWidth: 2 },
      conditional: { stroke: '#F59E0B', strokeWidth: 2, strokeDasharray: '5,5' },
      error: { stroke: '#EF4444', strokeWidth: 2 },
      success: { stroke: '#10B981', strokeWidth: 2 },
      animated: { stroke: '#3B82F6', strokeWidth: 2, strokeDasharray: '10,5' }
    };
    return styles[type as keyof typeof styles] || styles.default;
  }

  // Update node position
  updateNodePosition(nodeId: string, position: { x: number; y: number }): void {
    const node = this.nodes.find(n => n.id === nodeId);
    if (node) {
      node.position = position;
    }
  }

  // Update node data
  updateNodeData(nodeId: string, data: any): void {
    const node = this.nodes.find(n => n.id === nodeId);
    if (node) {
      node.data = { ...node.data, ...data };
    }
  }

  // Delete node and related edges
  deleteNode(nodeId: string): void {
    this.nodes = this.nodes.filter(n => n.id !== nodeId);
    this.edges = this.edges.filter(e => e.source !== nodeId && e.target !== nodeId);
  }

  // Delete edge
  deleteEdge(edgeId: string): void {
    this.edges = this.edges.filter(e => e.id !== edgeId);
  }

  // Get all nodes
  getNodes(): WorkflowNode[] {
    return [...this.nodes];
  }

  // Get all edges
  getEdges(): WorkflowEdge[] {
    return [...this.edges];
  }

  // Get node types
  getNodeTypes(): Map<string, any> {
    return new Map(this.nodeTypes);
  }

  // Get workflow templates
  getTemplates(): WorkflowTemplate[] {
    return [...this.templates];
  }

  // Load template
  loadTemplate(templateId: string): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
    const template = this.templates.find(t => t.id === templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Clear current workflow
    this.nodes = [];
    this.edges = [];

    // Load template nodes and edges
    this.nodes = template.nodes.map(node => ({ ...node }));
    this.edges = template.edges.map(edge => ({ ...edge }));

    return { nodes: this.nodes, edges: this.edges };
  }

  // Validate workflow
  validateWorkflow(): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for start node
    const startNodes = this.nodes.filter(n => n.type === 'start');
    if (startNodes.length === 0) {
      errors.push('Workflow must have at least one start node');
    } else if (startNodes.length > 1) {
      warnings.push('Multiple start nodes detected');
    }

    // Check for end node
    const endNodes = this.nodes.filter(n => n.type === 'end');
    if (endNodes.length === 0) {
      errors.push('Workflow must have at least one end node');
    }

    // Check for orphaned nodes
    const connectedNodes = new Set<string>();
    this.edges.forEach(edge => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });

    const orphanedNodes = this.nodes.filter(n => !connectedNodes.has(n.id));
    if (orphanedNodes.length > 0) {
      warnings.push(`${orphanedNodes.length} orphaned nodes detected`);
    }

    // Check for cycles
    if (this.hasCycles()) {
      warnings.push('Workflow contains cycles');
    }

    // Check node configurations
    this.nodes.forEach(node => {
      if (node.type === 'condition' && (!node.data.conditions || node.data.conditions.length === 0)) {
        errors.push(`Condition node ${node.id} has no conditions defined`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Check for cycles in workflow
  private hasCycles(): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycleDFS = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) {
        return true;
      }

      if (visited.has(nodeId)) {
        return false;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const outgoingEdges = this.edges.filter(e => e.source === nodeId);
      for (const edge of outgoingEdges) {
        if (hasCycleDFS(edge.target)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of this.nodes) {
      if (!visited.has(node.id)) {
        if (hasCycleDFS(node.id)) {
          return true;
        }
      }
    }

    return false;
  }

  // Execute workflow
  async executeWorkflow(workflowId: string, variables: Record<string, any> = {}): Promise<WorkflowExecution> {
    const execution: WorkflowExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      workflowId,
      status: 'pending',
      startTime: new Date(),
      variables,
      logs: []
    };

    this.executions.push(execution);

    try {
      execution.status = 'running';
      this.addLog(execution.id, 'info', 'Workflow execution started');

      // Find start node
      const startNode = this.nodes.find(n => n.type === 'start');
      if (!startNode) {
        throw new Error('No start node found');
      }

      // Execute workflow
      await this.executeNode(execution, startNode.id);

      execution.status = 'completed';
      execution.endTime = new Date();
      this.addLog(execution.id, 'success', 'Workflow execution completed');

    } catch (error: any) {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.error = error.message;
      this.addLog(execution.id, 'error', `Workflow execution failed: ${error.message}`);
    }

    return execution;
  }

  // Execute a specific node
  private async executeNode(execution: WorkflowExecution, nodeId: string): Promise<void> {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }

    execution.currentNode = nodeId;
    this.addLog(execution.id, 'info', `Executing node: ${node.data.label}`);

    // Simulate node execution based on type
    switch (node.type) {
      case 'start':
        await this.executeStartNode(execution, node);
        break;
      case 'end':
        await this.executeEndNode(execution, node);
        break;
      case 'action':
        await this.executeActionNode(execution, node);
        break;
      case 'condition':
        await this.executeConditionNode(execution, node);
        break;
      case 'loop':
        await this.executeLoopNode(execution, node);
        break;
      case 'parallel':
        await this.executeParallelNode(execution, node);
        break;
      case 'delay':
        await this.executeDelayNode(execution, node);
        break;
      case 'notification':
        await this.executeNotificationNode(execution, node);
        break;
      case 'data_transform':
        await this.executeDataTransformNode(execution, node);
        break;
      case 'api_call':
        await this.executeApiCallNode(execution, node);
        break;
      case 'database_query':
        await this.executeDatabaseQueryNode(execution, node);
        break;
      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  }

  // Execute start node
  private async executeStartNode(execution: WorkflowExecution, node: WorkflowNode): Promise<void> {
    this.addLog(execution.id, 'info', 'Starting workflow execution');
    
    // Find next nodes
    const nextEdges = this.edges.filter(e => e.source === node.id);
    for (const edge of nextEdges) {
      await this.executeNode(execution, edge.target);
    }
  }

  // Execute end node
  private async executeEndNode(execution: WorkflowExecution, node: WorkflowNode): Promise<void> {
    this.addLog(execution.id, 'success', 'Workflow execution completed');
  }

  // Execute action node
  private async executeActionNode(execution: WorkflowExecution, node: WorkflowNode): Promise<void> {
    this.addLog(execution.id, 'info', `Executing action: ${node.data.label}`);
    
    // Simulate action execution
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Find next nodes
    const nextEdges = this.edges.filter(e => e.source === node.id);
    for (const edge of nextEdges) {
      await this.executeNode(execution, edge.target);
    }
  }

  // Execute condition node
  private async executeConditionNode(execution: WorkflowExecution, node: WorkflowNode): Promise<void> {
    this.addLog(execution.id, 'info', `Evaluating condition: ${node.data.label}`);
    
    // Simulate condition evaluation
    const result = Math.random() > 0.5; // Random result for demo
    
    this.addLog(execution.id, 'info', `Condition result: ${result}`);
    
    // Find next nodes based on condition result
    const nextEdges = this.edges.filter(e => e.source === node.id);
    const targetEdge = result 
      ? nextEdges.find(e => e.type === 'conditional' && e.label === 'Yes') || nextEdges[0]
      : nextEdges.find(e => e.type === 'conditional' && e.label === 'No') || nextEdges[1];
    
    if (targetEdge) {
      await this.executeNode(execution, targetEdge.target);
    }
  }

  // Execute loop node
  private async executeLoopNode(execution: WorkflowExecution, node: WorkflowNode): Promise<void> {
    this.addLog(execution.id, 'info', `Starting loop: ${node.data.label}`);
    
    const iterations = 3; // Simulate 3 iterations
    for (let i = 0; i < iterations; i++) {
      this.addLog(execution.id, 'info', `Loop iteration ${i + 1}/${iterations}`);
      
      // Find loop body nodes
      const loopEdges = this.edges.filter(e => e.source === node.id && e.type !== 'default');
      for (const edge of loopEdges) {
        if (edge.target !== node.id) { // Avoid infinite recursion
          await this.executeNode(execution, edge.target);
        }
      }
    }
    
    // Find exit edge
    const exitEdge = this.edges.find(e => e.source === node.id && e.type === 'default');
    if (exitEdge) {
      await this.executeNode(execution, exitEdge.target);
    }
  }

  // Execute parallel node
  private async executeParallelNode(execution: WorkflowExecution, node: WorkflowNode): Promise<void> {
    this.addLog(execution.id, 'info', `Starting parallel execution: ${node.data.label}`);
    
    // Find parallel branches
    const parallelEdges = this.edges.filter(e => e.source === node.id);
    
    // Execute all branches in parallel
    const promises = parallelEdges.map(edge => this.executeNode(execution, edge.target));
    await Promise.all(promises);
    
    this.addLog(execution.id, 'success', 'All parallel branches completed');
  }

  // Execute delay node
  private async executeDelayNode(execution: WorkflowExecution, node: WorkflowNode): Promise<void> {
    const duration = node.data.config?.duration || 5000; // Default 5 seconds
    this.addLog(execution.id, 'info', `Waiting for ${duration}ms: ${node.data.label}`);
    
    await new Promise(resolve => setTimeout(resolve, Math.min(duration, 2000))); // Cap at 2 seconds for demo
    
    // Find next nodes
    const nextEdges = this.edges.filter(e => e.source === node.id);
    for (const edge of nextEdges) {
      await this.executeNode(execution, edge.target);
    }
  }

  // Execute notification node
  private async executeNotificationNode(execution: WorkflowExecution, node: WorkflowNode): Promise<void> {
    this.addLog(execution.id, 'info', `Sending notification: ${node.data.label}`);
    
    // Simulate notification sending
    await new Promise(resolve => setTimeout(resolve, 500));
    
    this.addLog(execution.id, 'success', 'Notification sent successfully');
    
    // Find next nodes
    const nextEdges = this.edges.filter(e => e.source === node.id);
    for (const edge of nextEdges) {
      await this.executeNode(execution, edge.target);
    }
  }

  // Execute data transform node
  private async executeDataTransformNode(execution: WorkflowExecution, node: WorkflowNode): Promise<void> {
    this.addLog(execution.id, 'info', `Transforming data: ${node.data.label}`);
    
    // Simulate data transformation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.addLog(execution.id, 'success', 'Data transformation completed');
    
    // Find next nodes
    const nextEdges = this.edges.filter(e => e.source === node.id);
    for (const edge of nextEdges) {
      await this.executeNode(execution, edge.target);
    }
  }

  // Execute API call node
  private async executeApiCallNode(execution: WorkflowExecution, node: WorkflowNode): Promise<void> {
    this.addLog(execution.id, 'info', `Making API call: ${node.data.label}`);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    this.addLog(execution.id, 'success', 'API call completed successfully');
    
    // Find next nodes
    const nextEdges = this.edges.filter(e => e.source === node.id);
    for (const edge of nextEdges) {
      await this.executeNode(execution, edge.target);
    }
  }

  // Execute database query node
  private async executeDatabaseQueryNode(execution: WorkflowExecution, node: WorkflowNode): Promise<void> {
    this.addLog(execution.id, 'info', `Executing database query: ${node.data.label}`);
    
    // Simulate database query
    await new Promise(resolve => setTimeout(resolve, 800));
    
    this.addLog(execution.id, 'success', 'Database query executed successfully');
    
    // Find next nodes
    const nextEdges = this.edges.filter(e => e.source === node.id);
    for (const edge of nextEdges) {
      await this.executeNode(execution, edge.target);
    }
  }

  // Add log entry
  private addLog(executionId: string, level: 'info' | 'warning' | 'error' | 'success', message: string, nodeId?: string, data?: any): void {
    const execution = this.executions.find(e => e.id === executionId);
    if (execution) {
      execution.logs.push({
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        level,
        message,
        nodeId,
        data
      });
    }
  }

  // Get execution by ID
  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.find(e => e.id === executionId);
  }

  // Get all executions
  getExecutions(): WorkflowExecution[] {
    return [...this.executions];
  }

  // Clear workflow
  clearWorkflow(): void {
    this.nodes = [];
    this.edges = [];
  }

  // Export workflow as JSON
  exportWorkflow(): string {
    return JSON.stringify({
      nodes: this.nodes,
      edges: this.edges,
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0'
      }
    }, null, 2);
  }

  // Import workflow from JSON
  importWorkflow(json: string): void {
    try {
      const data = JSON.parse(json);
      this.nodes = data.nodes || [];
      this.edges = data.edges || [];
    } catch (error) {
      throw new Error('Invalid workflow JSON format');
    }
  }
}

// Singleton instance
export const visualWorkflowEngine = new VisualWorkflowEngine();
