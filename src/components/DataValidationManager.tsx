'use client';

// Data Validation Manager Component
// Professional data quality monitoring and validation interface

import React, { useState, useCallback, useEffect } from 'react';
import {
  Shield, AlertTriangle, CheckCircle, XCircle, TrendingUp, TrendingDown,
  BarChart3, Activity, Settings, RefreshCw, Download, Filter, Search,
  Eye, EyeOff, Target, Zap, Clock, AlertCircle, Info, Database,
  FileText, PieChart, LineChart, Users, Award, Bookmark
} from 'lucide-react';

import { DatabaseSchema, DatabaseRecord } from '@/types/database';
import {
  DataValidationService,
  ValidationRule,
  ValidationReport,
  DataQualityMetrics,
  TableProfile,
  ValidationResult,
  AnomalyDetectionResult
} from '@/services/dataValidationService';

interface DataValidationManagerProps {
  schema: DatabaseSchema | null;
  records: DatabaseRecord[];
  onSchemaChange?: (schema: DatabaseSchema) => void;
}

export function DataValidationManager({ schema, records, onSchemaChange }: DataValidationManagerProps) {
  // State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'rules' | 'report' | 'anomalies' | 'profiles'>('dashboard');
  const [validationRules, setValidationRules] = useState<ValidationRule[]>([]);
  const [currentReport, setCurrentReport] = useState<ValidationReport | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [autoValidation, setAutoValidation] = useState(true);
  const [showFailedOnly, setShowFailedOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<'all' | 'error' | 'warning' | 'info'>('all');

  // Initialize default validation rules
  useEffect(() => {
    if (schema && validationRules.length === 0) {
      const defaultRules = generateDefaultRules(schema);
      setValidationRules(defaultRules);
    }
  }, [schema, validationRules.length]);

  // Auto-validation on data changes
  useEffect(() => {
    if (autoValidation && schema && records.length > 0 && validationRules.length > 0) {
      runValidation();
    }
  }, [records, validationRules, autoValidation]); // eslint-disable-line react-hooks/exhaustive-deps

  // Run validation
  const runValidation = useCallback(async () => {
    if (!schema || validationRules.length === 0) return;

    setIsValidating(true);
    try {
      const report = await DataValidationService.validateData(schema, records, validationRules);
      setCurrentReport(report);
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setIsValidating(false);
    }
  }, [schema, records, validationRules]);

  // Add custom validation rule
  const addValidationRule = useCallback(() => {
    const newRule: ValidationRule = {
      id: `rule_${Date.now()}`,
      name: 'New Validation Rule',
      description: 'Custom validation rule',
      type: 'custom',
      severity: 'warning',
      enabled: true,
      expression: '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setValidationRules(prev => [...prev, newRule]);
  }, []);

  // Update validation rule
  const updateValidationRule = useCallback((ruleId: string, updates: Partial<ValidationRule>) => {
    setValidationRules(prev => prev.map(rule => 
      rule.id === ruleId 
        ? { ...rule, ...updates, updatedAt: new Date() }
        : rule
    ));
  }, []);

  // Delete validation rule
  const deleteValidationRule = useCallback((ruleId: string) => {
    setValidationRules(prev => prev.filter(rule => rule.id !== ruleId));
  }, []);

  // Export validation report
  const exportReport = useCallback(() => {
    if (!currentReport) return;

    const reportData = {
      report: currentReport,
      exportedAt: new Date().toISOString(),
      schema: schema?.name || 'Unknown'
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `validation-report-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [currentReport, schema]);

  // Filter validation results
  const filteredResults = currentReport?.validationResults.filter(result => {
    const matchesSearch = searchTerm === '' || 
      result.ruleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.tableName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.columnName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSeverity = selectedSeverity === 'all' || result.severity === selectedSeverity;
    const matchesStatus = !showFailedOnly || !result.passed;

    return matchesSearch && matchesSeverity && matchesStatus;
  }) || [];

  // Render quality score with color
  const renderQualityScore = (score: number) => {
    const getScoreColor = (score: number) => {
      if (score >= 90) return 'text-green-600 bg-green-100';
      if (score >= 70) return 'text-yellow-600 bg-yellow-100';
      if (score >= 50) return 'text-orange-600 bg-orange-100';
      return 'text-red-600 bg-red-100';
    };

    return (
      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(score)}`}>
        <Award className="w-4 h-4 mr-1" />
        {score}%
      </div>
    );
  };

  // Render main dashboard
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Quality Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Overall Quality</p>
              <p className="text-2xl font-bold text-gray-900">
                {currentReport?.overallQuality.overallScore || 0}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Database className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Valid Records</p>
              <p className="text-2xl font-bold text-gray-900">
                {currentReport?.overallQuality.validRecords || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Issues Found</p>
              <p className="text-2xl font-bold text-gray-900">
                {currentReport?.failedRules || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Target className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Anomalies</p>
              <p className="text-2xl font-bold text-gray-900">
                {currentReport?.anomalies.length || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quality Dimensions */}
      {currentReport && (
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Data Quality Dimensions</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Completeness', value: currentReport.overallQuality.completeness, icon: BarChart3 },
              { label: 'Accuracy', value: currentReport.overallQuality.accuracy, icon: Target },
              { label: 'Consistency', value: currentReport.overallQuality.consistency, icon: CheckCircle },
              { label: 'Uniqueness', value: currentReport.overallQuality.uniqueness, icon: Award },
              { label: 'Validity', value: currentReport.overallQuality.validity, icon: Shield },
              { label: 'Timeliness', value: currentReport.overallQuality.timeliness, icon: Clock }
            ].map((dimension) => (
              <div key={dimension.label} className="text-center">
                <dimension.icon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <div className="text-2xl font-bold text-gray-900">{dimension.value}%</div>
                <div className="text-sm text-gray-500">{dimension.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Issues */}
      {currentReport && currentReport.validationResults.length > 0 && (
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Recent Issues</h3>
            <button
              onClick={() => setActiveTab('report')}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              View All →
            </button>
          </div>
          <div className="space-y-3">
            {currentReport.validationResults
              .filter(r => !r.passed)
              .slice(0, 5)
              .map((result) => (
                <div key={result.ruleId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    {result.severity === 'error' ? (
                      <XCircle className="h-5 w-5 text-red-500 mr-3" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-yellow-500 mr-3" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{result.ruleName}</p>
                      <p className="text-sm text-gray-500">{result.message}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {result.affectedRecords} records
                    </div>
                    <div className="text-xs text-gray-500">
                      {result.tableName || 'Multiple tables'}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );

  // Render validation rules management
  const renderRules = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Validation Rules</h3>
        <button
          onClick={addValidationRule}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <Settings className="w-4 h-4 mr-2" />
          Add Rule
        </button>
      </div>

      <div className="space-y-4">
        {validationRules.map((rule) => (
          <div key={rule.id} className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={(e) => updateValidationRule(rule.id, { enabled: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded mr-3"
                />
                <div>
                  <h4 className="text-lg font-medium text-gray-900">{rule.name}</h4>
                  <p className="text-sm text-gray-500">{rule.description}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  rule.severity === 'error' ? 'bg-red-100 text-red-800' :
                  rule.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {rule.severity}
                </span>
                <button
                  onClick={() => deleteValidationRule(rule.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rule Name
                </label>
                <input
                  type="text"
                  value={rule.name}
                  onChange={(e) => updateValidationRule(rule.id, { name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Severity
                </label>
                <select
                  value={rule.severity}
                  onChange={(e) => updateValidationRule(rule.id, { severity: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="error">Error</option>
                  <option value="warning">Warning</option>
                  <option value="info">Info</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={rule.description}
                onChange={(e) => updateValidationRule(rule.id, { description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {rule.type === 'custom' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Validation Expression
                </label>
                <textarea
                  value={rule.expression || ''}
                  onChange={(e) => updateValidationRule(rule.id, { expression: e.target.value })}
                  rows={2}
                  placeholder="e.g., value > 0 AND value < 100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // Render validation report
  const renderReport = () => (
    <div className="space-y-6">
      {/* Report Controls */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Validation Report</h3>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search results..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value as any)}
            className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Severities</option>
            <option value="error">Errors Only</option>
            <option value="warning">Warnings Only</option>
            <option value="info">Info Only</option>
          </select>
          <button
            onClick={() => setShowFailedOnly(!showFailedOnly)}
            className={`px-3 py-1 text-sm rounded ${
              showFailedOnly ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {showFailedOnly ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {showFailedOnly ? 'Show All' : 'Failed Only'}
          </button>
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-3">
        {filteredResults.map((result) => (
          <div
            key={`${result.ruleId}_${result.timestamp}`}
            className={`bg-white rounded-lg p-4 border-l-4 ${
              result.passed 
                ? 'border-green-400 bg-green-50' 
                : result.severity === 'error'
                ? 'border-red-400 bg-red-50'
                : result.severity === 'warning'
                ? 'border-yellow-400 bg-yellow-50'
                : 'border-blue-400 bg-blue-50'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                {result.passed ? (
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3" />
                ) : result.severity === 'error' ? (
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3" />
                ) : result.severity === 'warning' ? (
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 mr-3" />
                ) : (
                  <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-3" />
                )}
                <div>
                  <h4 className="text-sm font-medium text-gray-900">{result.ruleName}</h4>
                  <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                  {result.details && (
                    <p className="text-xs text-gray-500 mt-1">{result.details}</p>
                  )}
                  {result.suggestions && result.suggestions.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-700">Suggestions:</p>
                      <ul className="text-xs text-gray-600 list-disc list-inside mt-1">
                        {result.suggestions.map((suggestion, index) => (
                          <li key={index}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {result.tableName && (
                    <div className="text-xs text-gray-500">
                      {result.tableName}
                      {result.columnName && `.${result.columnName}`}
                    </div>
                  )}
                  {result.affectedRecords !== undefined && (
                    <div className="text-xs text-gray-600">
                      {result.affectedRecords} records affected
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredResults.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No validation results found matching your filters.</p>
        </div>
      )}
    </div>
  );

  // Render anomalies
  const renderAnomalies = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Data Anomalies</h3>
      
      {currentReport?.anomalies && currentReport.anomalies.length > 0 ? (
        <div className="space-y-4">
          {currentReport.anomalies.map((anomaly) => (
            <div key={anomaly.id} className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start">
                  <AlertTriangle className={`h-5 w-5 mt-0.5 mr-3 ${
                    anomaly.severity === 'critical' ? 'text-red-500' :
                    anomaly.severity === 'high' ? 'text-orange-500' :
                    anomaly.severity === 'medium' ? 'text-yellow-500' :
                    'text-blue-500'
                  }`} />
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 capitalize">
                      {anomaly.type} Anomaly
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">{anomaly.description}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  anomaly.severity === 'critical' ? 'bg-red-100 text-red-800' :
                  anomaly.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                  anomaly.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {anomaly.severity}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Affected Table:</span>
                  <span className="ml-2 text-gray-900">{anomaly.affectedTable}</span>
                </div>
                {anomaly.affectedColumn && (
                  <div>
                    <span className="font-medium text-gray-700">Affected Column:</span>
                    <span className="ml-2 text-gray-900">{anomaly.affectedColumn}</span>
                  </div>
                )}
                <div>
                  <span className="font-medium text-gray-700">Confidence:</span>
                  <span className="ml-2 text-gray-900">{Math.round(anomaly.confidence * 100)}%</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Records Affected:</span>
                  <span className="ml-2 text-gray-900">{anomaly.affectedRecords.length}</span>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Suggested Action:</strong> {anomaly.suggestedAction}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No data anomalies detected.</p>
          <p className="text-sm mt-2">Your data appears to be consistent and well-structured.</p>
        </div>
      )}
    </div>
  );

  // Render table profiles
  const renderProfiles = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Table Profiles</h3>
      
      {currentReport?.tableProfiles && currentReport.tableProfiles.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {currentReport.tableProfiles.map((profile) => (
            <div key={profile.tableId} className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-gray-900">{profile.tableName}</h4>
                {renderQualityScore(profile.qualityScore)}
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{profile.totalRecords}</div>
                  <div className="text-sm text-gray-500">Total Records</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{profile.validRecords}</div>
                  <div className="text-sm text-gray-500">Valid Records</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Invalid Records:</span>
                  <span className="font-medium text-red-600">{profile.invalidRecords}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Duplicate Records:</span>
                  <span className="font-medium text-yellow-600">{profile.duplicateRecords}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Relationship Integrity:</span>
                  <span className="font-medium text-blue-600">{profile.relationshipIntegrity}%</span>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h5 className="text-sm font-medium text-gray-700 mb-2">Column Summary</h5>
                <div className="space-y-2">
                  {profile.columnProfiles.slice(0, 3).map((column) => (
                    <div key={column.columnId} className="flex justify-between text-sm">
                      <span className="text-gray-600">{column.columnName}:</span>
                      <span className="font-medium">
                        {renderQualityScore(column.qualityScore)}
                      </span>
                    </div>
                  ))}
                  {profile.columnProfiles.length > 3 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{profile.columnProfiles.length - 3} more columns
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No table profiles available.</p>
          <p className="text-sm mt-2">Run validation to generate table profiles.</p>
        </div>
      )}
    </div>
  );

  if (!schema) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Database className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Schema Available</h3>
          <p className="text-gray-500">Please load a schema to start data validation.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Data Validation</h1>
            <p className="text-sm text-gray-500 mt-1">
              Monitor data quality and ensure schema compliance
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="auto-validation"
                checked={autoValidation}
                onChange={(e) => setAutoValidation(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <label htmlFor="auto-validation" className="text-sm text-gray-700">
                Auto-validate
              </label>
            </div>
            
            <button
              onClick={runValidation}
              disabled={isValidating}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isValidating ? 'animate-spin' : ''}`} />
              {isValidating ? 'Validating...' : 'Run Validation'}
            </button>
            
            {currentReport && (
              <button
                onClick={exportReport}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4">
          <nav className="flex space-x-8">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'rules', label: 'Rules', icon: Settings },
              { id: 'report', label: 'Report', icon: FileText },
              { id: 'anomalies', label: 'Anomalies', icon: Target },
              { id: 'profiles', label: 'Profiles', icon: PieChart }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'rules' && renderRules()}
        {activeTab === 'report' && renderReport()}
        {activeTab === 'anomalies' && renderAnomalies()}
        {activeTab === 'profiles' && renderProfiles()}
      </div>
    </div>
  );
}

// Helper function to generate default validation rules
function generateDefaultRules(schema: DatabaseSchema): ValidationRule[] {
  const rules: ValidationRule[] = [];
  
  // Add default constraint validation rules
  schema.tables.forEach(table => {
    table.columns.forEach(column => {
      // Primary key rule
      if (column.primaryKey) {
        rules.push({
          id: `pk_${table.id}_${column.id}`,
          name: `Primary Key: ${table.name}.${column.name}`,
          description: `Ensure ${column.name} in ${table.name} is unique and not null`,
          type: 'constraint',
          severity: 'error',
          tableId: table.id,
          columnId: column.id,
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      // Not null rule
      if (!column.nullable) {
        rules.push({
          id: `nn_${table.id}_${column.id}`,
          name: `Not Null: ${table.name}.${column.name}`,
          description: `Ensure ${column.name} in ${table.name} is not null`,
          type: 'constraint',
          severity: 'error',
          tableId: table.id,
          columnId: column.id,
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      // Unique constraint rule
      if (column.constraints?.unique) {
        rules.push({
          id: `uq_${table.id}_${column.id}`,
          name: `Unique: ${table.name}.${column.name}`,
          description: `Ensure ${column.name} in ${table.name} has unique values`,
          type: 'constraint',
          severity: 'error',
          tableId: table.id,
          columnId: column.id,
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      // Data type validation rule
      rules.push({
        id: `dt_${table.id}_${column.id}`,
        name: `Data Type: ${table.name}.${column.name}`,
        description: `Ensure ${column.name} in ${table.name} contains valid ${column.type} values`,
        type: 'constraint',
        severity: 'warning',
        tableId: table.id,
        columnId: column.id,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
  });

  return rules;
}
