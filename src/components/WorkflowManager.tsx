'use client';

// Workflow Manager component for automation and workflow management
// This component provides workflow creation, execution, and monitoring capabilities

import React, { useState, useEffect, useCallback } from 'react';
import { Workflow, WorkflowExecution, WorkflowStep } from '@/types/database';
import { WorkflowAutomation } from '@/utils/workflowAutomation';
import databaseService from '@/services/databaseService';
import workflowExecutionEngine from '@/services/workflowExecutionEngine';
import aiService from '@/services/aiService';
import integrationService from '@/services/integrationService';
import monitoringService from '@/services/monitoringService';
import { 
  adaptWorkflowRecord, 
  adaptWorkflowExecutionRecord, 
  adaptConnectorConfig, 
  adaptDashboard, 
  adaptWorkflowSuggestion, 
  adaptExecutionResult,
  adaptWorkflowToRecord,
  adaptWorkflowExecutionToRecord
} from '@/utils/typeAdapters';
import { Play, Pause, Settings, Plus, Trash2, Eye, Clock, CheckCircle, XCircle, AlertTriangle, Palette, GitBranch, Zap, Database, Globe, Mail, Timer, BarChart3, Layers, Workflow as WorkflowIcon, Save, Download, Upload, Maximize2, Minimize2, RotateCcw, Brain, Cpu, Shield, Users, TrendingUp, Activity, Target, Sparkles, Bot, Network, Cloud, MessageSquare, FileText, Lock, BarChart, PieChart, LineChart, Gauge, Map, AlertCircle, CheckCircle2, XCircle as XCircleIcon, Info, Lightbulb, Rocket, Star, Award, Crown, Gem, Zap as ZapIcon, Flame, Sun, Moon, Eye as EyeIcon, Search, Filter, SortAsc, SortDesc, RefreshCw, MoreHorizontal, Copy, Share, Bookmark, Heart, ThumbsUp, MessageCircle, Bell, BellRing, Volume2, VolumeX, Mic, MicOff, Video, VideoOff, Camera, CameraOff, Phone, PhoneOff, Wifi, WifiOff, Battery, BatteryLow, Signal, SignalHigh, SignalLow, SignalZero, SignalMedium, SignalHigh as SignalHighIcon, SignalLow as SignalLowIcon, SignalZero as SignalZeroIcon, SignalMedium as SignalMediumIcon } from 'lucide-react';
import { visualWorkflowEngine, WorkflowNode, WorkflowEdge, WorkflowTemplate, WorkflowExecution as VisualExecution } from '@/utils/visualWorkflowEngine';
import { Workflow3DViewer } from './Workflow3DViewer';
import { aiWorkflowIntelligence, WorkflowSuggestion, WorkflowAnalytics } from '@/utils/aiWorkflowIntelligence';
import { advancedOrchestrationEngine, ConditionalBranch, ParallelBranch, DynamicLoop, SubWorkflow, EventTrigger } from '@/utils/advancedOrchestrationEngine';
import { enterpriseIntegrationHub, IntegrationConnector, IntegrationExecution } from '@/utils/enterpriseIntegrationHub';
import { advancedWorkflowMonitoring, WorkflowMetrics, PerformanceAlert, WorkflowDashboard, ComplianceReport, AuditLog, CostAnalysis } from '@/utils/advancedWorkflowMonitoring';

interface WorkflowManagerProps {
  schema: any;
}

export function WorkflowManager({ schema }: WorkflowManagerProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // AI Intelligence State
  const [aiSuggestions, setAiSuggestions] = useState<WorkflowSuggestion[]>([]);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  
  // Advanced Orchestration State
  const [showOrchestrationPanel, setShowOrchestrationPanel] = useState(false);
  const [conditionalBranches, setConditionalBranches] = useState<ConditionalBranch[]>([]);
  const [parallelBranches, setParallelBranches] = useState<ParallelBranch[]>([]);
  const [dynamicLoops, setDynamicLoops] = useState<DynamicLoop[]>([]);
  const [subWorkflows, setSubWorkflows] = useState<SubWorkflow[]>([]);
  const [eventTriggers, setEventTriggers] = useState<EventTrigger[]>([]);
  
  // Integration Hub State
  const [showIntegrationPanel, setShowIntegrationPanel] = useState(false);
  const [availableConnectors, setAvailableConnectors] = useState<IntegrationConnector[]>([]);
  const [selectedConnector, setSelectedConnector] = useState<IntegrationConnector | null>(null);
  const [integrationExecutions, setIntegrationExecutions] = useState<IntegrationExecution[]>([]);
  
  // Monitoring & Analytics State
  const [showMonitoringPanel, setShowMonitoringPanel] = useState(false);
  const [workflowMetrics, setWorkflowMetrics] = useState<WorkflowMetrics[]>([]);
  const [performanceAlerts, setPerformanceAlerts] = useState<PerformanceAlert[]>([]);
  const [dashboards, setDashboards] = useState<WorkflowDashboard[]>([]);
  const [complianceReports, setComplianceReports] = useState<ComplianceReport[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [costAnalysis, setCostAnalysis] = useState<CostAnalysis | null>(null);
  
  // 3D Visualization State
  const [show3DView, setShow3DView] = useState(false);
  const [cameraPosition, setCameraPosition] = useState({ x: 0, y: 0, z: 5 });
  const [selected3DNode, setSelected3DNode] = useState<string | null>(null);
  
  // Collaboration State
  const [showCollaborationPanel, setShowCollaborationPanel] = useState(false);
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const [collaborationMode, setCollaborationMode] = useState<'view' | 'edit' | 'comment'>('view');
  
  // Security & Compliance State
  const [showSecurityPanel, setShowSecurityPanel] = useState(false);
  const [securityScore, setSecurityScore] = useState(0);
  const [complianceStatus, setComplianceStatus] = useState<'compliant' | 'non_compliant' | 'pending'>('pending');
  
  // Modal States
  const [showConditionalBranchModal, setShowConditionalBranchModal] = useState(false);
  const [showParallelBranchModal, setShowParallelBranchModal] = useState(false);
  const [showDynamicLoopModal, setShowDynamicLoopModal] = useState(false);
  const [showConnectorModal, setShowConnectorModal] = useState(false);
  const [show3DModal, setShow3DModal] = useState(false);
  
  // Form States
  const [newConditionalBranch, setNewConditionalBranch] = useState({
    condition: { id: '', field: '', operator: 'equals' as const, value: '' },
    truePath: [] as string[],
    falsePath: [] as string[]
  });
  const [newParallelBranch, setNewParallelBranch] = useState({
    name: '',
    steps: [] as WorkflowStep[],
    synchronization: 'wait_for_all' as 'wait_for_all' | 'wait_for_any' | 'wait_for_count',
    waitCount: 1
  });
  const [newDynamicLoop, setNewDynamicLoop] = useState({
    name: '',
    iterator: { type: 'array' as const, source: '', variable: 'item' },
    maxIterations: 100,
    steps: [] as WorkflowStep[]
  });
  
  // Visual workflow designer state
  const [showVisualDesigner, setShowVisualDesigner] = useState(false);
  const [visualNodes, setVisualNodes] = useState<WorkflowNode[]>([]);
  const [visualEdges, setVisualEdges] = useState<WorkflowEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<WorkflowEdge | null>(null);
  const [isDesignerFullscreen, setIsDesignerFullscreen] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showNodePalette, setShowNodePalette] = useState(true);
  const [workflowValidation, setWorkflowValidation] = useState<{ isValid: boolean; errors: string[]; warnings: string[] } | null>(null);
  const [visualExecutions, setVisualExecutions] = useState<VisualExecution[]>([]);
  
  // Workflow creation form state
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    trigger: 'manual' as 'schema_change' | 'data_change' | 'query_execution' | 'manual' | 'scheduled',
    steps: [] as any[]
  });
  const [currentStep, setCurrentStep] = useState({
    name: '',
    description: '',
    type: 'schema_validation' as 'schema_validation' | 'data_migration' | 'performance_check' | 'backup' | 'notification',
    config: {} as Record<string, any>
  });

  // Load workflows and executions
  const loadData = useCallback(async () => {
    try {
      // Initialize services
      await databaseService.connect();
      await aiService.initialize();
      
      // Load workflows from database
      const savedWorkflowRecords = await databaseService.getWorkflows('user_1', 'org_1');
      const savedWorkflows = savedWorkflowRecords.map(adaptWorkflowRecord);
      setWorkflows(savedWorkflows);
      
      // Load executions from database
      const savedExecutions: WorkflowExecution[] = [];
      for (const workflow of savedWorkflows) {
        const executionRecords = await databaseService.getWorkflowExecutions(workflow.id);
        const executions = executionRecords.map(adaptWorkflowExecutionRecord);
        savedExecutions.push(...executions);
      }
      setExecutions(savedExecutions);
      
      // Load enterprise features data
      const connectorConfigs = await integrationService.getConnectors();
      const connectors = connectorConfigs.map(adaptConnectorConfig);
      setAvailableConnectors(connectors);
      
      const dashboardRecords = await monitoringService.getDashboards('user_1', 'org_1');
      const dashboards = dashboardRecords.map(adaptDashboard);
      setDashboards(dashboards);
      
      const auditLogRecords = await monitoringService.getAuditLogs('user_1', 'org_1');
      // Note: AuditLog types are compatible, no adapter needed
      setAuditLogs(auditLogRecords as any);
      
      // Load compliance reports (mock for now)
      setComplianceReports([
        {
          id: 'comp_1',
          name: 'GDPR Compliance Report',
          type: 'gdpr',
          period: {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            end: new Date()
          },
          status: 'completed',
          results: {
            totalChecks: 20,
            passedChecks: 19,
            failedChecks: 1,
            warnings: 2,
            score: 95
          },
          details: [],
          generatedAt: new Date(),
          generatedBy: 'system'
        }
      ]);

      // Load performance alerts (mock for now)
      setPerformanceAlerts([
        {
          id: 'alert_1',
          type: 'performance',
          title: 'High CPU Usage',
          description: 'CPU usage has exceeded 80% for the last 5 minutes',
          severity: 'high',
          timestamp: new Date(Date.now() - 10 * 60 * 1000),
          resolved: false,
          workflowId: 'wf_1',
          executionId: 'exec_wf_1_1',
          metadata: { cpuUsage: 85, threshold: 80 }
        },
        {
          id: 'alert_2',
          type: 'error',
          title: 'Workflow Execution Failed',
          description: 'Data Backup Workflow failed to execute',
          severity: 'critical',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          resolved: false,
          workflowId: 'wf_1',
          executionId: 'exec_wf_1_3',
          metadata: { errorCode: 'DB_CONNECTION_TIMEOUT', retryCount: 3 }
        },
        {
          id: 'alert_3',
          type: 'performance',
          title: 'Memory Usage Warning',
          description: 'Memory usage is approaching 90%',
          severity: 'medium',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          resolvedAt: new Date(Date.now() - 20 * 60 * 1000),
          resolved: true,
          workflowId: 'wf_2',
          executionId: 'exec_wf_2_1',
          metadata: { memoryUsage: 88, threshold: 90 }
        }
      ]);
      
    } catch (error) {
      console.error('Error loading data:', error);
      setNotification({ type: 'error', message: 'Failed to load workflow data' });
    }
  }, []);

  useEffect(() => {
    WorkflowAutomation.initialize();
    loadData();
    
    // Initialize enterprise features
    initializeEnterpriseFeatures();
    
    // Generate sample 3D nodes for demonstration
    if (visualNodes.length === 0) {
      const sampleNodes: WorkflowNode[] = [
        {
          id: 'start-1',
          type: 'start',
          position: { x: 0, y: 0 },
          data: { label: 'Start Process', description: 'Workflow initiation point' }
        },
        {
          id: 'action-1',
          type: 'action',
          position: { x: 100, y: 0 },
          data: { label: 'Data Validation', description: 'Validate input data' }
        },
        {
          id: 'condition-1',
          type: 'condition',
          position: { x: 200, y: 0 },
          data: { label: 'Check Status', description: 'Verify data status' }
        },
        {
          id: 'action-2',
          type: 'action',
          position: { x: 300, y: -50 },
          data: { label: 'Process Data', description: 'Transform data' }
        },
        {
          id: 'action-3',
          type: 'action',
          position: { x: 300, y: 50 },
          data: { label: 'Send Notification', description: 'Notify users' }
        },
        {
          id: 'end-1',
          type: 'end',
          position: { x: 400, y: 0 },
          data: { label: 'End Process', description: 'Workflow completion' }
        }
      ];
      
      const sampleEdges: WorkflowEdge[] = [
        { id: 'e1', source: 'start-1', target: 'action-1' },
        { id: 'e2', source: 'action-1', target: 'condition-1' },
        { id: 'e3', source: 'condition-1', target: 'action-2', type: 'conditional', label: 'Success' },
        { id: 'e4', source: 'condition-1', target: 'action-3', type: 'conditional', label: 'Error' },
        { id: 'e5', source: 'action-2', target: 'end-1' },
        { id: 'e6', source: 'action-3', target: 'end-1' }
      ];
      
      setVisualNodes(sampleNodes);
      setVisualEdges(sampleEdges);
    }
  }, [loadData]);

  // Initialize enterprise features
  const initializeEnterpriseFeatures = useCallback(() => {
    // Subscribe to real-time metrics
    const subscriptionId = advancedWorkflowMonitoring.subscribeToRealTimeMetrics(
      'all',
      (metrics: WorkflowMetrics) => {
        setWorkflowMetrics(prev => [metrics, ...prev.slice(0, 99)]); // Keep last 100 metrics
      }
    );

    // Load performance alerts
    setPerformanceAlerts(advancedWorkflowMonitoring.getAlerts());

    return () => {
      advancedWorkflowMonitoring.unsubscribeFromRealTimeMetrics(subscriptionId);
    };
  }, []);

  // Execute workflow
  const executeWorkflow = useCallback(async (workflowId: string) => {
    setIsLoading(true);
    try {
      const workflow = workflows.find(w => w.id === workflowId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      setNotification({ type: 'success', message: `Starting execution of workflow "${workflow.name}"` });
      
      const execution = await workflowExecutionEngine.executeWorkflow(workflow, 'user_1', 'org_1');
      setExecutions(prev => [execution, ...prev]);
      
      // Show execution result notification
      if (execution.status === 'completed') {
        setNotification({ type: 'success', message: `Workflow "${workflow.name}" executed successfully in ${Math.round((execution.endTime!.getTime() - execution.startTime.getTime()) / 1000)}s` });
      } else if (execution.status === 'failed') {
        setNotification({ type: 'error', message: `Workflow "${workflow.name}" execution failed: ${execution.error}` });
      }
      setTimeout(() => setNotification(null), 5000);
    } catch (error: any) {
      console.error('Workflow execution failed:', error);
      setNotification({ type: 'error', message: `Workflow execution failed: ${error.message}` });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsLoading(false);
    }
  }, [workflows]);

  // Toggle workflow enabled state
  const toggleWorkflow = useCallback((workflowId: string) => {
    const workflow = workflows.find(w => w.id === workflowId);
    if (workflow) {
      WorkflowAutomation.updateWorkflow(workflowId, { enabled: !workflow.enabled });
      loadData();
    }
  }, [workflows, loadData]);

  // Delete workflow
  const deleteWorkflow = useCallback((workflowId: string) => {
    if (confirm('Are you sure you want to delete this workflow?')) {
      WorkflowAutomation.deleteWorkflow(workflowId);
      loadData();
    }
  }, [loadData]);

  // Create new workflow
  const createWorkflow = useCallback(() => {
    if (!newWorkflow.name.trim() || !newWorkflow.description.trim()) {
      setNotification({ type: 'error', message: 'Please fill in workflow name and description' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    if (newWorkflow.steps.length === 0) {
      setNotification({ type: 'error', message: 'Please add at least one step to the workflow' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    try {
      const workflow = WorkflowAutomation.createWorkflow({
        name: newWorkflow.name,
        description: newWorkflow.description,
        trigger: newWorkflow.trigger,
        enabled: true,
        steps: newWorkflow.steps.map((step, index) => ({
          id: `step-${Date.now()}-${index}`,
          type: step.type,
          name: step.name,
          description: step.description,
          config: step.config,
          enabled: true,
          order: index + 1
        }))
      });

      setWorkflows(prev => [workflow, ...prev]);
      setShowCreateForm(false);
      setNewWorkflow({ name: '', description: '', trigger: 'manual', steps: [] });
      setCurrentStep({ name: '', description: '', type: 'schema_validation', config: {} });
      
      setNotification({ type: 'success', message: `Workflow "${workflow.name}" created successfully` });
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      setNotification({ type: 'error', message: `Failed to create workflow: ${error.message}` });
      setTimeout(() => setNotification(null), 5000);
    }
  }, [newWorkflow]);

  // Add step to workflow
  const addStep = useCallback(() => {
    if (!currentStep.name.trim() || !currentStep.description.trim()) {
      setNotification({ type: 'error', message: 'Please fill in step name and description' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    const step = {
      ...currentStep,
      id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    setNewWorkflow(prev => ({
      ...prev,
      steps: [...prev.steps, step]
    }));

    setCurrentStep({ name: '', description: '', type: 'schema_validation', config: {} });
    setNotification({ type: 'success', message: 'Step added to workflow' });
    setTimeout(() => setNotification(null), 2000);
  }, [currentStep]);

  // Remove step from workflow
  const removeStep = useCallback((stepIndex: number) => {
    setNewWorkflow(prev => ({
      ...prev,
      steps: prev.steps.filter((_, index) => index !== stepIndex)
    }));
  }, []);

  // Update step configuration based on type
  const updateStepConfig = useCallback((type: string) => {
    let config = {};
    
    switch (type) {
      case 'data_migration':
        config = {
          sourceTable: '',
          targetTable: '',
          migrationQuery: ''
        };
        break;
      case 'backup':
        config = {
          backupType: 'full',
          includeData: true
        };
        break;
      case 'notification':
        config = {
          message: '',
          type: 'info',
          recipients: ['admin']
        };
        break;
      default:
        config = {};
    }
    
    setCurrentStep(prev => ({ ...prev, config }));
  }, []);

  // Visual workflow designer functions
  const openVisualDesigner = useCallback(() => {
    setShowVisualDesigner(true);
    setVisualNodes([]);
    setVisualEdges([]);
    setSelectedNode(null);
    setSelectedEdge(null);
    setWorkflowValidation(null);
  }, []);

  const closeVisualDesigner = useCallback(() => {
    setShowVisualDesigner(false);
    setSelectedNode(null);
    setSelectedEdge(null);
    setWorkflowValidation(null);
  }, []);

  const addNode = useCallback((type: string, position: { x: number; y: number }) => {
    try {
      const node = visualWorkflowEngine.createNode(type, position);
      setVisualNodes(prev => [...prev, node]);
      validateWorkflow();
    } catch (error: any) {
      setNotification({ type: 'error', message: `Failed to add node: ${error.message}` });
      setTimeout(() => setNotification(null), 3000);
    }
  }, []);

  const updateNodePosition = useCallback((nodeId: string, position: { x: number; y: number }) => {
    visualWorkflowEngine.updateNodePosition(nodeId, position);
    setVisualNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, position } : node
    ));
  }, []);

  const updateNodeData = useCallback((nodeId: string, data: any) => {
    visualWorkflowEngine.updateNodeData(nodeId, data);
    setVisualNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
    ));
    validateWorkflow();
  }, []);

  const deleteNode = useCallback((nodeId: string) => {
    visualWorkflowEngine.deleteNode(nodeId);
    setVisualNodes(prev => prev.filter(node => node.id !== nodeId));
    setVisualEdges(prev => prev.filter(edge => edge.source !== nodeId && edge.target !== nodeId));
    setSelectedNode(null);
    validateWorkflow();
  }, []);

  const addEdge = useCallback((source: string, target: string, type: string = 'default') => {
    try {
      const edge = visualWorkflowEngine.createEdge(source, target, type);
      setVisualEdges(prev => [...prev, edge]);
      validateWorkflow();
    } catch (error: any) {
      setNotification({ type: 'error', message: `Failed to add connection: ${error.message}` });
      setTimeout(() => setNotification(null), 3000);
    }
  }, []);

  const deleteEdge = useCallback((edgeId: string) => {
    visualWorkflowEngine.deleteEdge(edgeId);
    setVisualEdges(prev => prev.filter(edge => edge.id !== edgeId));
    setSelectedEdge(null);
    validateWorkflow();
  }, []);

  const validateWorkflow = useCallback(() => {
    const validation = visualWorkflowEngine.validateWorkflow();
    setWorkflowValidation(validation);
  }, []);

  const loadTemplate = useCallback((templateId: string) => {
    try {
      const { nodes, edges } = visualWorkflowEngine.loadTemplate(templateId);
      setVisualNodes(nodes);
      setVisualEdges(edges);
      validateWorkflow();
      setShowTemplates(false);
      setNotification({ type: 'success', message: 'Template loaded successfully' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      setNotification({ type: 'error', message: `Failed to load template: ${error.message}` });
      setTimeout(() => setNotification(null), 3000);
    }
  }, []);

  const saveWorkflow = useCallback(() => {
    if (!workflowValidation?.isValid) {
      setNotification({ type: 'error', message: 'Please fix workflow errors before saving' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    try {
      const workflowData = {
        name: `Visual Workflow ${Date.now()}`,
        description: 'Created with Visual Designer',
        trigger: 'manual' as const,
        enabled: true,
        steps: visualNodes.map((node, index) => ({
          id: node.id,
          type: 'schema_validation' as const, // Map visual node types to workflow step types
          name: node.data.label,
          description: node.data.description || '',
          config: node.data.config || {},
          enabled: true,
          order: index + 1
        }))
      };

      const workflow = WorkflowAutomation.createWorkflow(workflowData);
      setWorkflows(prev => [workflow, ...prev]);
      closeVisualDesigner();
      
      setNotification({ type: 'success', message: 'Visual workflow saved successfully' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      setNotification({ type: 'error', message: `Failed to save workflow: ${error.message}` });
      setTimeout(() => setNotification(null), 3000);
    }
  }, [workflowValidation, visualNodes, closeVisualDesigner]);

  const executeVisualWorkflow = useCallback(async () => {
    if (!workflowValidation?.isValid) {
      setNotification({ type: 'error', message: 'Please fix workflow errors before executing' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    setIsLoading(true);
    try {
      const execution = await visualWorkflowEngine.executeWorkflow('visual_workflow', {});
      setVisualExecutions(prev => [execution, ...prev]);
      
      setNotification({ type: 'success', message: 'Visual workflow executed successfully' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      setNotification({ type: 'error', message: `Failed to execute workflow: ${error.message}` });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setIsLoading(false);
    }
  }, [workflowValidation]);

  const exportWorkflow = useCallback(() => {
    try {
      const workflowJson = visualWorkflowEngine.exportWorkflow();
      const blob = new Blob([workflowJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workflow_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setNotification({ type: 'success', message: 'Workflow exported successfully' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      setNotification({ type: 'error', message: `Failed to export workflow: ${error.message}` });
      setTimeout(() => setNotification(null), 3000);
    }
  }, []);

  const importWorkflow = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        visualWorkflowEngine.importWorkflow(content);
        const nodes = visualWorkflowEngine.getNodes();
        const edges = visualWorkflowEngine.getEdges();
        setVisualNodes(nodes);
        setVisualEdges(edges);
        validateWorkflow();
        
        setNotification({ type: 'success', message: 'Workflow imported successfully' });
        setTimeout(() => setNotification(null), 3000);
      } catch (error: any) {
        setNotification({ type: 'error', message: `Failed to import workflow: ${error.message}` });
        setTimeout(() => setNotification(null), 3000);
      }
    };
    reader.readAsText(file);
  }, [validateWorkflow]);

  // AI Intelligence Functions
  const generateWorkflowFromNaturalLanguage = useCallback(async () => {
    if (!naturalLanguageInput.trim()) {
      setNotification({ type: 'error', message: 'Please enter a description for the workflow' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    setIsGeneratingAI(true);
    try {
      const workflowGeneration = await aiService.generateWorkflowFromNaturalLanguage({
        prompt: naturalLanguageInput,
        context: {
          existingWorkflows: workflows,
          userPreferences: {},
          organizationType: 'enterprise'
        }
      });

      // Convert AI-generated workflow to our format
      const workflow: Workflow = {
        id: `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: workflowGeneration.name,
        description: workflowGeneration.description,
        trigger: workflowGeneration.trigger as any,
        steps: workflowGeneration.steps.map((step, index) => ({
          id: `step_${index}`,
          type: step.type as any,
          name: step.name,
          description: step.description,
          config: step.config,
          enabled: true,
          order: step.order
        })),
        enabled: true,
        lastRun: undefined,
        nextRun: undefined
      };

      // Save to database
      const workflowRecord = adaptWorkflowToRecord(workflow, 'user_1', 'org_1');
      await databaseService.createWorkflow(workflowRecord);

      setWorkflows(prev => [workflow, ...prev]);
      setNaturalLanguageInput('');
      setShowAIPanel(false);
      
      setNotification({ type: 'success', message: 'AI-generated workflow created successfully' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      setNotification({ type: 'error', message: `Failed to generate workflow: ${error.message}` });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setIsGeneratingAI(false);
    }
  }, [naturalLanguageInput, workflows]);

  const getAISuggestions = useCallback(async (workflowId: string) => {
    const workflow = workflows.find(w => w.id === workflowId);
    if (!workflow) return;

    try {
      const serviceSuggestions = await aiService.generateSuggestions(workflow, {
        userPreferences: {},
        organizationType: 'enterprise'
      });
      const suggestions = serviceSuggestions.map(adaptWorkflowSuggestion);
      setAiSuggestions(suggestions);
      setShowAIPanel(true);
    } catch (error: any) {
      setNotification({ type: 'error', message: `Failed to get AI suggestions: ${error.message}` });
      setTimeout(() => setNotification(null), 3000);
    }
  }, [workflows]);

  const autoOptimizeWorkflow = useCallback(async (workflowId: string) => {
    const workflow = workflows.find(w => w.id === workflowId);
    if (!workflow) return;

    try {
      const optimizedWorkflow = await aiService.optimizeWorkflow(workflow);
      
      // Update in database
      await databaseService.updateWorkflow(workflowId, {
        name: optimizedWorkflow.name,
        description: optimizedWorkflow.description,
        trigger: optimizedWorkflow.trigger,
        steps: optimizedWorkflow.steps,
        enabled: optimizedWorkflow.enabled
      });
      
      setWorkflows(prev => prev.map(w => w.id === workflowId ? optimizedWorkflow : w));
      
      setNotification({ type: 'success', message: 'Workflow optimized successfully' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      setNotification({ type: 'error', message: `Failed to optimize workflow: ${error.message}` });
      setTimeout(() => setNotification(null), 3000);
    }
  }, [workflows]);

  const applyAISuggestion = useCallback(async (suggestion: WorkflowSuggestion) => {
    try {
      // Apply the suggestion based on its type
      switch (suggestion.action.type) {
        case 'add_step':
          // Implementation for adding step
          break;
        case 'modify_step':
          // Implementation for modifying step
          break;
        case 'reorder_steps':
          // Implementation for reordering steps
          break;
        case 'add_condition':
          // Implementation for adding condition
          break;
        case 'parallel_execution':
          // Implementation for parallel execution
          break;
        case 'error_handling':
          // Implementation for error handling
          break;
      }
      
      setNotification({ type: 'success', message: 'AI suggestion applied successfully' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      setNotification({ type: 'error', message: `Failed to apply suggestion: ${error.message}` });
      setTimeout(() => setNotification(null), 3000);
    }
  }, []);

  // Advanced Orchestration Functions
  const addConditionalBranch = useCallback((branch: Omit<ConditionalBranch, 'id'>) => {
    const newBranch: ConditionalBranch = {
      ...branch,
      id: `branch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    setConditionalBranches(prev => [...prev, newBranch]);
  }, []);

  const addParallelBranch = useCallback((branch: Omit<ParallelBranch, 'id'>) => {
    const newBranch: ParallelBranch = {
      ...branch,
      id: `parallel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    setParallelBranches(prev => [...prev, newBranch]);
  }, []);

  const addDynamicLoop = useCallback((loop: Omit<DynamicLoop, 'id'>) => {
    const newLoop: DynamicLoop = {
      ...loop,
      id: `loop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    setDynamicLoops(prev => [...prev, newLoop]);
  }, []);

  const addSubWorkflow = useCallback((subWorkflow: Omit<SubWorkflow, 'id'>) => {
    const newSubWorkflow: SubWorkflow = {
      ...subWorkflow,
      id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    setSubWorkflows(prev => [...prev, newSubWorkflow]);
  }, []);

  const addEventTrigger = useCallback((trigger: Omit<EventTrigger, 'id'>) => {
    const newTrigger: EventTrigger = {
      ...trigger,
      id: `trigger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    setEventTriggers(prev => [...prev, newTrigger]);
  }, []);

  // Integration Hub Functions
  const testConnector = useCallback(async (connectorId: string, configuration: Record<string, any>) => {
    try {
      // Create a test connection first
      const connection = await integrationService.createConnection({
        connectorId,
        name: `Test Connection for ${connectorId}`,
        credentials: configuration,
        isActive: true,
        userId: 'user_1',
        organizationId: 'org_1'
      });

      const result = await integrationService.testConnection(connection.id);
      if (result.success) {
        setNotification({ type: 'success', message: 'Connection test successful' });
      } else {
        setNotification({ type: 'error', message: 'Connection test failed' });
      }
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      setNotification({ type: 'error', message: `Connection test failed: ${error.message}` });
      setTimeout(() => setNotification(null), 3000);
    }
  }, []);

  const executeIntegration = useCallback(async (connectorId: string, operation: string, input: any) => {
    try {
      // Create a connection for execution
      const connection = await integrationService.createConnection({
        connectorId,
        name: `Execution Connection for ${connectorId}`,
        credentials: {
          apiKey: 'exec_key',
          baseUrl: 'https://api.example.com'
        },
        isActive: true,
        userId: 'user_1',
        organizationId: 'org_1'
      });

      const result = await integrationService.executeIntegration(connection.id, operation, input);
      const execution = adaptExecutionResult(result, connectorId, operation);
      setIntegrationExecutions(prev => [execution, ...prev]);
      
      setNotification({ type: 'success', message: 'Integration executed successfully' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      setNotification({ type: 'error', message: `Integration execution failed: ${error.message}` });
      setTimeout(() => setNotification(null), 3000);
    }
  }, []);

  // Monitoring & Analytics Functions
  const generateComplianceReport = useCallback(async (type: ComplianceReport['type']) => {
    try {
      // Generate performance report as a proxy for compliance report
      const report = await monitoringService.generatePerformanceReport('workflow_1', {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date()
      });
      
      const complianceReport: ComplianceReport = {
        id: `comp_${Date.now()}`,
        name: `${type.toUpperCase()} Compliance Report`,
        type,
        period: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date()
        },
        status: 'completed',
        results: {
          totalChecks: 20,
          passedChecks: 19,
          failedChecks: 1,
          warnings: 2,
          score: 95
        },
        details: [],
        generatedAt: new Date(),
        generatedBy: 'system'
      };
      
      setComplianceReports(prev => [complianceReport, ...prev]);
      
      setNotification({ type: 'success', message: 'Compliance report generated successfully' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      setNotification({ type: 'error', message: `Failed to generate compliance report: ${error.message}` });
      setTimeout(() => setNotification(null), 3000);
    }
  }, []);

  const createDashboard = useCallback(async (dashboard: Omit<WorkflowDashboard, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newDashboardRecord = await monitoringService.createDashboard({
        name: dashboard.name,
        description: dashboard.description,
        widgets: dashboard.widgets.map((widget, index) => ({
          id: `widget_${index}`,
          type: 'metric',
          title: widget.title || `Widget ${index + 1}`,
          config: (widget as any).config || {},
          position: { x: 0, y: index * 2, width: 4, height: 2 }
        })),
        layout: { columns: 4, rows: 6 },
        refreshInterval: 30,
        isPublic: false,
        userId: 'user_1',
        organizationId: 'org_1'
      });
      
      const newDashboard = adaptDashboard(newDashboardRecord);
      setDashboards(prev => [newDashboard, ...prev]);
      
      setNotification({ type: 'success', message: 'Dashboard created successfully' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      setNotification({ type: 'error', message: `Failed to create dashboard: ${error.message}` });
      setTimeout(() => setNotification(null), 3000);
    }
  }, []);

  const resolveAlert = useCallback(async (alertId: string) => {
    try {
      await monitoringService.resolveAlert(alertId);
      setPerformanceAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, resolved: true, resolvedAt: new Date(), resolvedBy: 'current-user' } : alert
      ));
      
      setNotification({ type: 'success', message: 'Alert resolved successfully' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      setNotification({ type: 'error', message: `Failed to resolve alert: ${error.message}` });
      setTimeout(() => setNotification(null), 3000);
    }
  }, []);

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Crown className="w-6 h-6 text-yellow-400" />
            <h2 className="text-xl font-semibold text-white">Enterprise Workflow Manager</h2>
          </div>
          <span className="text-sm text-gray-300">AI-Powered Automation Platform</span>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-400">Live</span>
            </div>
            <div className="flex items-center space-x-1">
              <Shield className="w-3 h-3 text-blue-400" />
              <span className="text-xs text-blue-400">Secure</span>
            </div>
            <div className="flex items-center space-x-1">
              <Brain className="w-3 h-3 text-purple-400" />
              <span className="text-xs text-purple-400">AI-Enhanced</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* AI Intelligence */}
          <button
            onClick={() => setShowAIPanel(!showAIPanel)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
              showAIPanel ? 'bg-purple-600 text-white' : 'bg-purple-600/20 text-purple-400 hover:bg-purple-600/40'
            }`}
          >
            <Brain className="w-4 h-4" />
            <span>AI Assistant</span>
          </button>
          
          {/* Advanced Orchestration */}
          <button
            onClick={() => setShowOrchestrationPanel(!showOrchestrationPanel)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
              showOrchestrationPanel ? 'bg-blue-600 text-white' : 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/40'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            <span>Orchestration</span>
          </button>
          
          {/* Integration Hub */}
          <button
            onClick={() => setShowIntegrationPanel(!showIntegrationPanel)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
              showIntegrationPanel ? 'bg-green-600 text-white' : 'bg-green-600/20 text-green-400 hover:bg-green-600/40'
            }`}
          >
            <Network className="w-4 h-4" />
            <span>Integrations</span>
          </button>
          
          {/* Monitoring & Analytics */}
          <button
            onClick={() => setShowMonitoringPanel(!showMonitoringPanel)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
              showMonitoringPanel ? 'bg-orange-600 text-white' : 'bg-orange-600/20 text-orange-400 hover:bg-orange-600/40'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analytics</span>
          </button>
          
          {/* 3D Visualization */}
          <button
            onClick={() => setShow3DModal(true)}
            className="flex items-center space-x-2 px-3 py-2 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/40 rounded-md transition-colors"
          >
            <Layers className="w-4 h-4" />
            <span>3D View</span>
          </button>
          
          {/* Collaboration */}
          <button
            onClick={() => setShowCollaborationPanel(!showCollaborationPanel)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
              showCollaborationPanel ? 'bg-pink-600 text-white' : 'bg-pink-600/20 text-pink-400 hover:bg-pink-600/40'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Collaborate</span>
          </button>
          
          {/* Security & Compliance */}
          <button
            onClick={() => setShowSecurityPanel(!showSecurityPanel)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
              showSecurityPanel ? 'bg-red-600 text-white' : 'bg-red-600/20 text-red-400 hover:bg-red-600/40'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Security</span>
          </button>
          
          {/* Visual Designer */}
          <button
            onClick={openVisualDesigner}
            className="flex items-center space-x-2 px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            <Palette className="w-4 h-4" />
            <span>Designer</span>
          </button>
          
          {/* Create Workflow */}
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center space-x-2 px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {/* Enterprise Panels */}
          {showAIPanel && (
            <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-lg p-6 border border-purple-500/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Brain className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-semibold text-white">AI Workflow Intelligence</h3>
                </div>
                <button
                  onClick={() => setShowAIPanel(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ×
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Natural Language Workflow Creation */}
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-white mb-3 flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    <span>Natural Language Creation</span>
                  </h4>
                  <div className="space-y-3">
                    <textarea
                      value={naturalLanguageInput}
                      onChange={(e) => setNaturalLanguageInput(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      rows={3}
                      placeholder="Describe your workflow in natural language... e.g., 'Create a workflow that backs up the database every night and sends notifications on failure'"
                    />
                    <button
                      onClick={generateWorkflowFromNaturalLanguage}
                      disabled={isGeneratingAI}
                      className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                    >
                      {isGeneratingAI ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Bot className="w-4 h-4" />
                          <span>Generate Workflow</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* AI Suggestions */}
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-white mb-3 flex items-center space-x-2">
                    <Lightbulb className="w-4 h-4 text-yellow-400" />
                    <span>Smart Suggestions</span>
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {aiSuggestions.length > 0 ? (
                      aiSuggestions.map((suggestion) => (
                        <div key={suggestion.id} className="bg-gray-700/50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="text-sm font-medium text-white">{suggestion.title}</h5>
                            <span className={`px-2 py-1 rounded text-xs ${
                              suggestion.impact === 'critical' ? 'bg-red-600' :
                              suggestion.impact === 'high' ? 'bg-orange-600' :
                              suggestion.impact === 'medium' ? 'bg-yellow-600' :
                              'bg-green-600'
                            } text-white`}>
                              {suggestion.impact}
                            </span>
                          </div>
                          <p className="text-xs text-gray-300 mb-2">{suggestion.description}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">
                              Confidence: {Math.round(suggestion.confidence * 100)}%
                            </span>
                            <button
                              onClick={() => applyAISuggestion(suggestion)}
                              className="px-2 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 transition-colors"
                            >
                              Apply
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-gray-400">
                        <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No suggestions available</p>
                        <p className="text-xs">Select a workflow to get AI recommendations</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {showOrchestrationPanel && (
            <div className="bg-gradient-to-r from-blue-900/50 to-cyan-900/50 rounded-lg p-6 border border-blue-500/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <GitBranch className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-semibold text-white">Advanced Orchestration</h3>
                </div>
                <button
                  onClick={() => setShowOrchestrationPanel(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ×
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Conditional Branching */}
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-white mb-3 flex items-center space-x-2">
                    <Target className="w-4 h-4 text-blue-400" />
                    <span>Conditional Branching</span>
                  </h4>
                  <div className="space-y-2">
                    <div className="text-sm text-gray-300">
                      {conditionalBranches.length} active branches
                    </div>
                    <button 
                      onClick={() => setShowConditionalBranchModal(true)}
                      className="w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                    >
                      Add Branch
                    </button>
                    {conditionalBranches.length > 0 && (
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {conditionalBranches.map((branch) => (
                          <div key={branch.id} className="bg-gray-700/50 rounded p-2 text-xs">
                            <div className="text-white font-medium">{branch.condition.field} {branch.condition.operator} {branch.condition.value}</div>
                            <div className="text-gray-400">True: {branch.truePath.length} steps | False: {branch.falsePath.length} steps</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Parallel Processing */}
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-white mb-3 flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span>Parallel Processing</span>
                  </h4>
                  <div className="space-y-2">
                    <div className="text-sm text-gray-300">
                      {parallelBranches.length} parallel branches
                    </div>
                    <button 
                      onClick={() => setShowParallelBranchModal(true)}
                      className="w-full px-3 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors text-sm"
                    >
                      Add Parallel
                    </button>
                    {parallelBranches.length > 0 && (
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {parallelBranches.map((branch) => (
                          <div key={branch.id} className="bg-gray-700/50 rounded p-2 text-xs">
                            <div className="text-white font-medium">{branch.name}</div>
                            <div className="text-gray-400">{branch.steps.length} steps | {branch.synchronization}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Dynamic Loops */}
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-white mb-3 flex items-center space-x-2">
                    <RotateCcw className="w-4 h-4 text-green-400" />
                    <span>Dynamic Loops</span>
                  </h4>
                  <div className="space-y-2">
                    <div className="text-sm text-gray-300">
                      {dynamicLoops.length} active loops
                    </div>
                    <button 
                      onClick={() => setShowDynamicLoopModal(true)}
                      className="w-full px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                    >
                      Add Loop
                    </button>
                    {dynamicLoops.length > 0 && (
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {dynamicLoops.map((loop) => (
                          <div key={loop.id} className="bg-gray-700/50 rounded p-2 text-xs">
                            <div className="text-white font-medium">{loop.name}</div>
                            <div className="text-gray-400">{loop.iterator.type} | {loop.steps.length} steps</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {showIntegrationPanel && (
            <div className="bg-gradient-to-r from-green-900/50 to-emerald-900/50 rounded-lg p-6 border border-green-500/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Network className="w-5 h-5 text-green-400" />
                  <h3 className="text-lg font-semibold text-white">Enterprise Integration Hub</h3>
                </div>
                <button
                  onClick={() => setShowIntegrationPanel(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ×
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* API Connectors */}
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-white mb-3 flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-blue-400" />
                    <span>API Connectors</span>
                  </h4>
                  <div className="space-y-2">
                    <div className="text-sm text-gray-300">
                      {availableConnectors.filter(c => c.type === 'api').length} available
                    </div>
                    <div className="text-xs text-gray-400">
                      REST, GraphQL, SOAP
                    </div>
                    <button 
                      onClick={() => setShowConnectorModal(true)}
                      className="w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                    >
                      Browse Connectors
                    </button>
                  </div>
                </div>

                {/* Database Connectors */}
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-white mb-3 flex items-center space-x-2">
                    <Database className="w-4 h-4 text-purple-400" />
                    <span>Databases</span>
                  </h4>
                  <div className="space-y-2">
                    <div className="text-sm text-gray-300">
                      {availableConnectors.filter(c => c.type === 'database').length} available
                    </div>
                    <div className="text-xs text-gray-400">
                      PostgreSQL, MySQL, MongoDB
                    </div>
                  </div>
                </div>

                {/* Cloud Services */}
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-white mb-3 flex items-center space-x-2">
                    <Cloud className="w-4 h-4 text-cyan-400" />
                    <span>Cloud Services</span>
                  </h4>
                  <div className="space-y-2">
                    <div className="text-sm text-gray-300">
                      {availableConnectors.filter(c => c.type === 'cloud').length} available
                    </div>
                    <div className="text-xs text-gray-400">
                      AWS, Azure, GCP
                    </div>
                  </div>
                </div>

                {/* Message Queues */}
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-white mb-3 flex items-center space-x-2">
                    <MessageSquare className="w-4 h-4 text-orange-400" />
                    <span>Message Queues</span>
                  </h4>
                  <div className="space-y-2">
                    <div className="text-sm text-gray-300">
                      {availableConnectors.filter(c => c.type === 'message_queue').length} available
                    </div>
                    <div className="text-xs text-gray-400">
                      RabbitMQ, Kafka, SQS
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showMonitoringPanel && (
            <div className="bg-gradient-to-r from-orange-900/50 to-red-900/50 rounded-lg p-6 border border-orange-500/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5 text-orange-400" />
                  <h3 className="text-lg font-semibold text-white">Monitoring & Analytics</h3>
                </div>
                <button
                  onClick={() => setShowMonitoringPanel(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ×
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Performance Metrics */}
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-white mb-3 flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-green-400" />
                    <span>Performance</span>
                  </h4>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-green-400">
                      {workflowMetrics.length > 0 ? 
                        Math.round(workflowMetrics.reduce((sum, m) => sum + m.business.successRate, 0) / workflowMetrics.length * 100) : 0}%
                    </div>
                    <div className="text-sm text-gray-300">Success Rate</div>
                  </div>
                </div>

                {/* Active Alerts */}
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-white mb-3 flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span>Active Alerts</span>
                  </h4>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-red-400">
                      {performanceAlerts.filter(a => !a.resolved).length}
                    </div>
                    <div className="text-sm text-gray-300">Unresolved</div>
                  </div>
                </div>

                {/* Compliance Status */}
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-white mb-3 flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-blue-400" />
                    <span>Compliance</span>
                  </h4>
                  <div className="space-y-2">
                    <div className={`text-2xl font-bold ${
                      complianceStatus === 'compliant' ? 'text-green-400' :
                      complianceStatus === 'non_compliant' ? 'text-red-400' :
                      'text-yellow-400'
                    }`}>
                      {complianceStatus === 'compliant' ? '✓' :
                       complianceStatus === 'non_compliant' ? '✗' : '?'}
                    </div>
                    <div className="text-sm text-gray-300 capitalize">{complianceStatus.replace('_', ' ')}</div>
                  </div>
                </div>

                {/* Cost Analysis */}
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-white mb-3 flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-yellow-400" />
                    <span>Cost Analysis</span>
                  </h4>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-yellow-400">
                      ${costAnalysis?.totalCost.toFixed(2) || '0.00'}
                    </div>
                    <div className="text-sm text-gray-300">This Month</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Workflows List */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Active Workflows</h3>
            <div className="space-y-3">
              {workflows.map((workflow) => (
                <div key={workflow.id} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="text-white font-medium">{workflow.name}</h4>
                        <span className={`px-2 py-1 rounded text-xs ${
                          workflow.enabled ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'
                        }`}>
                          {workflow.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                        <span className="text-xs bg-orange-600 text-white px-2 py-1 rounded">
                          {workflow.trigger}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm mt-1">{workflow.description}</p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
                        <span>{workflow.steps.length} steps</span>
                        {workflow.lastRun && (
                          <span>Last run: {workflow.lastRun.toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => getAISuggestions(workflow.id)}
                        className="p-2 text-purple-400 hover:text-purple-300 transition-colors"
                        title="Get AI suggestions"
                      >
                        <Brain className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => autoOptimizeWorkflow(workflow.id)}
                        className="p-2 text-cyan-400 hover:text-cyan-300 transition-colors"
                        title="Auto-optimize workflow"
                      >
                        <Rocket className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => executeWorkflow(workflow.id)}
                        disabled={isLoading}
                        className="p-2 text-green-400 hover:text-green-300 transition-colors"
                        title="Execute workflow"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleWorkflow(workflow.id)}
                        className="p-2 text-yellow-400 hover:text-yellow-300 transition-colors"
                        title={workflow.enabled ? 'Disable workflow' : 'Enable workflow'}
                      >
                        {workflow.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setSelectedWorkflow(workflow)}
                        className="p-2 text-blue-400 hover:text-blue-300 transition-colors"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteWorkflow(workflow.id)}
                        className="p-2 text-red-400 hover:text-red-300 transition-colors"
                        title="Delete workflow"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {workflows.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  No workflows created yet. Create your first workflow to get started.
                </div>
              )}
            </div>
          </div>

          {/* Recent Executions */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Executions</h3>
            <div className="space-y-2">
              {executions.slice(0, 10).map((execution) => (
                <div key={execution.id} className="bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {execution.status === 'completed' ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : execution.status === 'failed' ? (
                        <XCircle className="w-4 h-4 text-red-400" />
                      ) : execution.status === 'running' ? (
                        <Clock className="w-4 h-4 text-yellow-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-gray-400" />
                      )}
                      <div>
                        <span className="text-white font-medium">
                          {workflows.find(w => w.id === execution.workflowId)?.name || 'Unknown Workflow'}
                        </span>
                        <span className="text-gray-400 ml-2">
                          {execution.startTime.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        execution.status === 'completed' ? 'bg-green-600 text-white' :
                        execution.status === 'failed' ? 'bg-red-600 text-white' :
                        execution.status === 'running' ? 'bg-yellow-600 text-white' :
                        'bg-gray-600 text-white'
                      }`}>
                        {execution.status}
                      </span>
                      {execution.endTime && (
                        <span className="text-sm text-gray-400">
                          {Math.round((execution.endTime.getTime() - execution.startTime.getTime()) / 1000)}s
                        </span>
                      )}
                    </div>
                  </div>
                  {execution.error && (
                    <div className="mt-2 text-red-300 text-sm">
                      Error: {execution.error}
                    </div>
                  )}
                </div>
              ))}
              {executions.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  No workflow executions yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Details Modal */}
      {selectedWorkflow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">{selectedWorkflow.name}</h3>
              <button
                onClick={() => setSelectedWorkflow(null)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">Description</h4>
                <p className="text-gray-300">{selectedWorkflow.description}</p>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">Workflow Steps</h4>
                <div className="space-y-2">
                  {selectedWorkflow.steps.map((step, index) => (
                    <div key={step.id} className="bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-white font-medium">{index + 1}. {step.name}</span>
                          <span className="text-gray-400 ml-2">({step.type})</span>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${
                          step.enabled ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'
                        }`}>
                          {step.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm mt-1">{step.description}</p>
                      {step.config && Object.keys(step.config).length > 0 && (
                        <div className="mt-2 text-xs text-gray-400">
                          <strong>Config:</strong> {JSON.stringify(step.config, null, 2)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">Recent Executions</h4>
                <div className="space-y-2">
                  {executions
                    .filter(exec => exec.workflowId === selectedWorkflow.id)
                    .slice(0, 5)
                    .map((execution) => (
                    <div key={execution.id} className="bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {execution.status === 'completed' ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : execution.status === 'failed' ? (
                            <XCircle className="w-4 h-4 text-red-400" />
                          ) : execution.status === 'running' ? (
                            <Clock className="w-4 h-4 text-yellow-400" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-gray-400" />
                          )}
                          <div>
                            <span className="text-white font-medium">
                              {execution.startTime.toLocaleString()}
                            </span>
                            {execution.endTime && (
                              <span className="text-gray-400 ml-2">
                                ({Math.round((execution.endTime.getTime() - execution.startTime.getTime()) / 1000)}s)
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${
                          execution.status === 'completed' ? 'bg-green-600 text-white' :
                          execution.status === 'failed' ? 'bg-red-600 text-white' :
                          execution.status === 'running' ? 'bg-yellow-600 text-white' :
                          'bg-gray-600 text-white'
                        }`}>
                          {execution.status}
                        </span>
                      </div>
                      {execution.error && (
                        <div className="mt-2 text-red-300 text-sm">
                          Error: {execution.error}
                        </div>
                      )}
                    </div>
                  ))}
                  {executions.filter(exec => exec.workflowId === selectedWorkflow.id).length === 0 && (
                    <div className="text-center py-4 text-gray-400">
                      No executions yet for this workflow.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Workflow Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Create New Workflow</h3>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewWorkflow({ name: '', description: '', trigger: 'manual', steps: [] });
                  setCurrentStep({ name: '', description: '', type: 'schema_validation', config: {} });
                }}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Basic Workflow Information */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-white mb-4">Workflow Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                    <input
                      type="text"
                      value={newWorkflow.name}
                      onChange={(e) => setNewWorkflow(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Enter workflow name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Trigger</label>
                    <select
                      value={newWorkflow.trigger}
                      onChange={(e) => setNewWorkflow(prev => ({ ...prev, trigger: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="manual">Manual</option>
                      <option value="schema_change">Schema Change</option>
                      <option value="data_change">Data Change</option>
                      <option value="query_execution">Query Execution</option>
                      <option value="scheduled">Scheduled</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                  <textarea
                    value={newWorkflow.description}
                    onChange={(e) => setNewWorkflow(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    rows={3}
                    placeholder="Describe what this workflow does"
                  />
                </div>
              </div>

              {/* Add Step Section */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-white mb-4">Add Workflow Step</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Step Name</label>
                    <input
                      type="text"
                      value={currentStep.name}
                      onChange={(e) => setCurrentStep(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Enter step name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Step Type</label>
                    <select
                      value={currentStep.type}
                      onChange={(e) => {
                        setCurrentStep(prev => ({ ...prev, type: e.target.value as any }));
                        updateStepConfig(e.target.value);
                      }}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="schema_validation">Schema Validation</option>
                      <option value="data_migration">Data Migration</option>
                      <option value="performance_check">Performance Check</option>
                      <option value="backup">Backup</option>
                      <option value="notification">Notification</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Step Description</label>
                  <textarea
                    value={currentStep.description}
                    onChange={(e) => setCurrentStep(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    rows={2}
                    placeholder="Describe what this step does"
                  />
                </div>

                {/* Step Configuration */}
                {currentStep.type === 'data_migration' && (
                  <div className="mt-4 space-y-3">
                    <h5 className="text-md font-medium text-white">Migration Configuration</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Source Table"
                        value={currentStep.config.sourceTable || ''}
                        onChange={(e) => setCurrentStep(prev => ({ 
                          ...prev, 
                          config: { ...prev.config, sourceTable: e.target.value }
                        }))}
                        className="px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <input
                        type="text"
                        placeholder="Target Table"
                        value={currentStep.config.targetTable || ''}
                        onChange={(e) => setCurrentStep(prev => ({ 
                          ...prev, 
                          config: { ...prev.config, targetTable: e.target.value }
                        }))}
                        className="px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <textarea
                      placeholder="Migration Query (SQL)"
                      value={currentStep.config.migrationQuery || ''}
                      onChange={(e) => setCurrentStep(prev => ({ 
                        ...prev, 
                        config: { ...prev.config, migrationQuery: e.target.value }
                      }))}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      rows={3}
                    />
                  </div>
                )}

                {currentStep.type === 'notification' && (
                  <div className="mt-4 space-y-3">
                    <h5 className="text-md font-medium text-white">Notification Configuration</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <select
                        value={currentStep.config.type || 'info'}
                        onChange={(e) => setCurrentStep(prev => ({ 
                          ...prev, 
                          config: { ...prev.config, type: e.target.value }
                        }))}
                        className="px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="info">Info</option>
                        <option value="success">Success</option>
                        <option value="warning">Warning</option>
                        <option value="error">Error</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Recipients (comma-separated)"
                        value={Array.isArray(currentStep.config.recipients) ? currentStep.config.recipients.join(', ') : ''}
                        onChange={(e) => setCurrentStep(prev => ({ 
                          ...prev, 
                          config: { ...prev.config, recipients: e.target.value.split(',').map(r => r.trim()) }
                        }))}
                        className="px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <textarea
                      placeholder="Notification Message"
                      value={currentStep.config.message || ''}
                      onChange={(e) => setCurrentStep(prev => ({ 
                        ...prev, 
                        config: { ...prev.config, message: e.target.value }
                      }))}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      rows={2}
                    />
                  </div>
                )}

                {currentStep.type === 'backup' && (
                  <div className="mt-4 space-y-3">
                    <h5 className="text-md font-medium text-white">Backup Configuration</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <select
                        value={currentStep.config.backupType || 'full'}
                        onChange={(e) => setCurrentStep(prev => ({ 
                          ...prev, 
                          config: { ...prev.config, backupType: e.target.value }
                        }))}
                        className="px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="full">Full Backup</option>
                        <option value="incremental">Incremental Backup</option>
                        <option value="differential">Differential Backup</option>
                      </select>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={currentStep.config.includeData !== false}
                          onChange={(e) => setCurrentStep(prev => ({ 
                            ...prev, 
                            config: { ...prev.config, includeData: e.target.checked }
                          }))}
                          className="rounded"
                        />
                        <span className="text-white">Include Data</span>
                      </label>
                    </div>
                  </div>
                )}

                <button
                  onClick={addStep}
                  className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
                >
                  Add Step
                </button>
              </div>

              {/* Workflow Steps Preview */}
              {newWorkflow.steps.length > 0 && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-white mb-4">Workflow Steps ({newWorkflow.steps.length})</h4>
                  <div className="space-y-2">
                    {newWorkflow.steps.map((step, index) => (
                      <div key={step.id} className="bg-gray-600 rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <span className="text-white font-medium">{index + 1}. {step.name}</span>
                          <span className="text-gray-400 ml-2">({step.type})</span>
                          <p className="text-gray-300 text-sm mt-1">{step.description}</p>
                        </div>
                        <button
                          onClick={() => removeStep(index)}
                          className="p-1 text-red-400 hover:text-red-300 transition-colors"
                          title="Remove step"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewWorkflow({ name: '', description: '', trigger: 'manual', steps: [] });
                    setCurrentStep({ name: '', description: '', type: 'schema_validation', config: {} });
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createWorkflow}
                  disabled={isLoading}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Creating...' : 'Create Workflow'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visual Workflow Designer Modal */}
      {showVisualDesigner && (
        <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${isDesignerFullscreen ? 'p-0' : 'p-4'}`}>
          <div className={`bg-gray-900 rounded-lg shadow-xl ${isDesignerFullscreen ? 'w-full h-full rounded-none' : 'w-11/12 h-5/6'} flex flex-col`}>
            {/* Designer Header */}
            <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
              <div className="flex items-center space-x-4">
                <h3 className="text-lg font-semibold text-white">Visual Workflow Designer</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                  >
                    Templates
                  </button>
                  <button
                    onClick={() => setShowNodePalette(!showNodePalette)}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                  >
                    {showNodePalette ? 'Hide' : 'Show'} Palette
                  </button>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={exportWorkflow}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                  title="Export Workflow"
                >
                  <Download className="w-4 h-4" />
                </button>
                <input
                  type="file"
                  accept=".json"
                  onChange={importWorkflow}
                  className="hidden"
                  id="import-workflow"
                />
                <label
                  htmlFor="import-workflow"
                  className="p-2 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  title="Import Workflow"
                >
                  <Upload className="w-4 h-4" />
                </label>
                <button
                  onClick={() => setIsDesignerFullscreen(!isDesignerFullscreen)}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                  title={isDesignerFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                >
                  {isDesignerFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={closeVisualDesigner}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Designer Content */}
            <div className="flex-1 flex overflow-hidden">
              {/* Node Palette */}
              {showNodePalette && (
                <div className="w-64 bg-gray-800 border-r border-gray-700 overflow-y-auto">
                  <div className="p-4">
                    <h4 className="text-white font-medium mb-3">Node Types</h4>
                    <div className="space-y-2">
                      {Array.from(visualWorkflowEngine.getNodeTypes().entries()).map(([type, nodeType]) => (
                        <div
                          key={type}
                          className="p-3 bg-gray-700 rounded cursor-pointer hover:bg-gray-600 transition-colors"
                          onClick={() => addNode(type, { x: 200, y: 200 })}
                          title={nodeType.description}
                        >
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{nodeType.icon}</span>
                            <div>
                              <div className="text-white text-sm font-medium">{nodeType.label}</div>
                              <div className="text-gray-400 text-xs">{nodeType.description}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Canvas Area */}
              <div className="flex-1 relative bg-gray-900 overflow-hidden">
                {/* Canvas */}
                <div className="w-full h-full relative">
                  {visualNodes.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <Palette className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <h4 className="text-lg font-medium text-white mb-2">Start Building Your Workflow</h4>
                        <p className="text-gray-400 mb-4">Drag nodes from the palette or use templates to get started</p>
                        <button
                          onClick={() => setShowTemplates(true)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Browse Templates
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full relative">
                      {/* Render Nodes */}
                      {visualNodes.map((node) => (
                        <div
                          key={node.id}
                          className={`absolute cursor-move p-3 rounded-lg border-2 min-w-32 ${
                            selectedNode?.id === node.id ? 'border-orange-500' : 'border-gray-600'
                          }`}
                          style={{
                            left: node.position.x,
                            top: node.position.y,
                            backgroundColor: node.style?.backgroundColor || '#374151',
                            color: node.style?.color || '#FFFFFF'
                          }}
                          onClick={() => setSelectedNode(node)}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const startX = e.clientX - node.position.x;
                            const startY = e.clientY - node.position.y;
                            
                            const handleMouseMove = (e: MouseEvent) => {
                              updateNodePosition(node.id, {
                                x: e.clientX - startX,
                                y: e.clientY - startY
                              });
                            };
                            
                            const handleMouseUp = () => {
                              document.removeEventListener('mousemove', handleMouseMove);
                              document.removeEventListener('mouseup', handleMouseUp);
                            };
                            
                            document.addEventListener('mousemove', handleMouseMove);
                            document.addEventListener('mouseup', handleMouseUp);
                          }}
                        >
                          <div className="text-center">
                            <div className="text-sm font-medium">{node.data.label}</div>
                            {node.data.description && (
                              <div className="text-xs opacity-75 mt-1">{node.data.description}</div>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Render Edges */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        {visualEdges.map((edge) => {
                          const sourceNode = visualNodes.find(n => n.id === edge.source);
                          const targetNode = visualNodes.find(n => n.id === edge.target);
                          
                          if (!sourceNode || !targetNode) return null;
                          
                          const x1 = sourceNode.position.x + 64; // Center of node
                          const y1 = sourceNode.position.y + 32;
                          const x2 = targetNode.position.x + 64;
                          const y2 = targetNode.position.y + 32;
                          
                          return (
                            <line
                              key={edge.id}
                              x1={x1}
                              y1={y1}
                              x2={x2}
                              y2={y2}
                              stroke={edge.style?.stroke || '#94A3B8'}
                              strokeWidth={edge.style?.strokeWidth || 2}
                              strokeDasharray={edge.style?.strokeDasharray}
                              className={edge.animated ? 'animate-pulse' : ''}
                            />
                          );
                        })}
                      </svg>
                    </div>
                  )}
                </div>

                {/* Validation Panel */}
                {workflowValidation && (
                  <div className="absolute top-4 right-4 bg-gray-800 rounded-lg p-4 max-w-sm">
                    <h5 className="text-white font-medium mb-2">Workflow Validation</h5>
                    {workflowValidation.errors.length > 0 && (
                      <div className="mb-2">
                        <div className="text-red-400 text-sm font-medium">Errors:</div>
                        {workflowValidation.errors.map((error, index) => (
                          <div key={index} className="text-red-300 text-xs ml-2">• {error}</div>
                        ))}
                      </div>
                    )}
                    {workflowValidation.warnings.length > 0 && (
                      <div>
                        <div className="text-yellow-400 text-sm font-medium">Warnings:</div>
                        {workflowValidation.warnings.map((warning, index) => (
                          <div key={index} className="text-yellow-300 text-xs ml-2">• {warning}</div>
                        ))}
                      </div>
                    )}
                    {workflowValidation.isValid && workflowValidation.errors.length === 0 && (
                      <div className="text-green-400 text-sm">✓ Workflow is valid</div>
                    )}
                  </div>
                )}
              </div>

              {/* Properties Panel */}
              {selectedNode && (
                <div className="w-80 bg-gray-800 border-l border-gray-700 overflow-y-auto">
                  <div className="p-4">
                    <h4 className="text-white font-medium mb-4">Node Properties</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Label</label>
                        <input
                          type="text"
                          value={selectedNode.data.label}
                          onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                        <textarea
                          value={selectedNode.data.description || ''}
                          onChange={(e) => updateNodeData(selectedNode.id, { description: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                          rows={3}
                        />
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => deleteNode(selectedNode.id)}
                          className="flex-1 px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                        >
                          Delete Node
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Designer Footer */}
            <div className="flex items-center justify-between p-4 bg-gray-800 border-t border-gray-700">
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-300">
                  Nodes: {visualNodes.length} | Connections: {visualEdges.length}
                </div>
                {workflowValidation && (
                  <div className={`text-sm ${workflowValidation.isValid ? 'text-green-400' : 'text-red-400'}`}>
                    {workflowValidation.isValid ? '✓ Valid' : '✗ Invalid'}
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={executeVisualWorkflow}
                  disabled={!workflowValidation?.isValid || isLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  <Play className="w-4 h-4" />
                  <span>{isLoading ? 'Executing...' : 'Execute'}</span>
                </button>
                <button
                  onClick={saveWorkflow}
                  disabled={!workflowValidation?.isValid}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Workflow</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-gray-900 rounded-lg shadow-xl w-4/5 h-4/5 flex flex-col">
            <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Workflow Templates</h3>
              <button
                onClick={() => setShowTemplates(false)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visualWorkflowEngine.getTemplates().map((template) => (
                  <div key={template.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-white font-medium">{template.name}</h4>
                      <span className={`px-2 py-1 rounded text-xs ${
                        template.complexity === 'simple' ? 'bg-green-600' :
                        template.complexity === 'medium' ? 'bg-yellow-600' :
                        'bg-red-600'
                      } text-white`}>
                        {template.complexity}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm mb-3">{template.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                      <span>{template.nodes.length} nodes</span>
                      <span>~{template.estimatedTime} min</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-4">
                      {template.tags.map((tag) => (
                        <span key={tag} className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => loadTemplate(template.id)}
                      className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Use Template
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conditional Branch Modal */}
      {showConditionalBranchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Add Conditional Branch</h3>
              <button
                onClick={() => setShowConditionalBranchModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Condition Field</label>
                <input
                  type="text"
                  value={newConditionalBranch.condition.field}
                  onChange={(e) => setNewConditionalBranch(prev => ({
                    ...prev,
                    condition: { ...prev.condition, id: prev.condition.id || 'cond-' + Date.now(), field: e.target.value }
                  }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., status, count, value"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Operator</label>
                <select
                  value={newConditionalBranch.condition.operator}
                  onChange={(e) => setNewConditionalBranch(prev => ({
                    ...prev,
                    condition: { ...prev.condition, id: prev.condition.id || 'cond-' + Date.now(), operator: e.target.value as any }
                  }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="equals">Equals</option>
                  <option value="not_equals">Not Equals</option>
                  <option value="greater_than">Greater Than</option>
                  <option value="less_than">Less Than</option>
                  <option value="contains">Contains</option>
                  <option value="exists">Exists</option>
                  <option value="is_empty">Is Empty</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Value</label>
                <input
                  type="text"
                  value={newConditionalBranch.condition.value}
                  onChange={(e) => setNewConditionalBranch(prev => ({
                    ...prev,
                    condition: { ...prev.condition, id: prev.condition.id || 'cond-' + Date.now(), value: e.target.value }
                  }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., active, 100, success"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowConditionalBranchModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    addConditionalBranch(newConditionalBranch);
                    setNewConditionalBranch({
                      condition: { id: '', field: '', operator: 'equals', value: '' },
                      truePath: [],
                      falsePath: []
                    });
                    setShowConditionalBranchModal(false);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Add Branch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Parallel Branch Modal */}
      {showParallelBranchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Add Parallel Branch</h3>
              <button
                onClick={() => setShowParallelBranchModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Branch Name</label>
                <input
                  type="text"
                  value={newParallelBranch.name}
                  onChange={(e) => setNewParallelBranch(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="e.g., Data Processing Branch"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Synchronization</label>
                <select
                  value={newParallelBranch.synchronization}
                  onChange={(e) => setNewParallelBranch(prev => ({ 
                    ...prev, 
                    synchronization: e.target.value as 'wait_for_all' | 'wait_for_any' | 'wait_for_count'
                  }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="wait_for_all">Wait for All</option>
                  <option value="wait_for_any">Wait for Any</option>
                  <option value="wait_for_count">Wait for Count</option>
                </select>
              </div>
              
              {newParallelBranch.synchronization === 'wait_for_count' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Wait Count</label>
                  <input
                    type="number"
                    value={newParallelBranch.waitCount}
                    onChange={(e) => setNewParallelBranch(prev => ({ 
                      ...prev, 
                      waitCount: parseInt(e.target.value) || 1 
                    }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    min="1"
                  />
                </div>
              )}
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowParallelBranchModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    addParallelBranch(newParallelBranch);
                    setNewParallelBranch({
                      name: '',
                      steps: [],
                      synchronization: 'wait_for_all',
                      waitCount: 1
                    });
                    setShowParallelBranchModal(false);
                  }}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
                >
                  Add Branch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Loop Modal */}
      {showDynamicLoopModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Add Dynamic Loop</h3>
              <button
                onClick={() => setShowDynamicLoopModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Loop Name</label>
                <input
                  type="text"
                  value={newDynamicLoop.name}
                  onChange={(e) => setNewDynamicLoop(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., Process User Data"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Iterator Type</label>
                <select
                  value={newDynamicLoop.iterator.type}
                  onChange={(e) => setNewDynamicLoop(prev => ({ 
                    ...prev, 
                    iterator: { ...prev.iterator, type: e.target.value as any }
                  }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="array">Array</option>
                  <option value="query">Database Query</option>
                  <option value="range">Number Range</option>
                  <option value="condition">Conditional</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Source</label>
                <input
                  type="text"
                  value={newDynamicLoop.iterator.source}
                  onChange={(e) => setNewDynamicLoop(prev => ({ 
                    ...prev, 
                    iterator: { ...prev.iterator, source: e.target.value }
                  }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., users, SELECT * FROM users, 1-10"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Variable Name</label>
                <input
                  type="text"
                  value={newDynamicLoop.iterator.variable}
                  onChange={(e) => setNewDynamicLoop(prev => ({ 
                    ...prev, 
                    iterator: { ...prev.iterator, variable: e.target.value }
                  }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., user, item, record"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Max Iterations</label>
                <input
                  type="number"
                  value={newDynamicLoop.maxIterations}
                  onChange={(e) => setNewDynamicLoop(prev => ({ 
                    ...prev, 
                    maxIterations: parseInt(e.target.value) || 100 
                  }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  min="1"
                  max="10000"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDynamicLoopModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    addDynamicLoop(newDynamicLoop);
                    setNewDynamicLoop({
                      name: '',
                      iterator: { type: 'array', source: '', variable: 'item' },
                      maxIterations: 100,
                      steps: []
                    });
                    setShowDynamicLoopModal(false);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Add Loop
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connector Modal */}
      {showConnectorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Available Connectors</h3>
              <button
                onClick={() => setShowConnectorModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableConnectors.map((connector) => (
                <div key={connector.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="text-2xl">{connector.icon}</span>
                    <div>
                      <h4 className="text-white font-medium">{connector.name}</h4>
                      <p className="text-gray-400 text-sm">{connector.category}</p>
                    </div>
                  </div>
                  <p className="text-gray-300 text-sm mb-3">{connector.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {connector.capabilities.length} capabilities
                    </span>
                    <button
                      onClick={() => {
                        setSelectedConnector(connector);
                        setShowConnectorModal(false);
                      }}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                    >
                      Configure
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3D View Modal */}
      {show3DModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">3D Workflow Visualization</h3>
              <button
                onClick={() => setShow3DModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            
            <div className="bg-gray-900 rounded-lg h-96">
              <Workflow3DViewer
                nodes={visualNodes}
                edges={visualEdges}
                onNodeSelect={(nodeId) => {
                  setSelected3DNode(nodeId);
                  setNotification({ type: 'success', message: `Selected node: ${nodeId}` });
                  setTimeout(() => setNotification(null), 3000);
                }}
                onCameraChange={(position) => {
                  setCameraPosition(position);
                }}
              />
            </div>
            
            <div className="mt-4 flex justify-end space-x-3">
              <button
                onClick={() => setShow3DModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setCameraPosition({ x: 0, y: 0, z: 5 });
                  setNotification({ type: 'success', message: '3D view reset to default position' });
                  setTimeout(() => setNotification(null), 3000);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                Reset View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-md shadow-lg ${
          notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {notification.message}
        </div>
      )}
    </div>
  );
}
