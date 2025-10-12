'use client';

// Verification Dashboard Component
// Displays comprehensive verification and database introspection results

import React, { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Database,
  Table,
  Eye,
  Zap,
  Shield,
  Activity,
  Settings,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';

interface VerificationDashboardProps {
  verification?: any;
  databaseIntrospection?: any;
  schemaObjects?: any;
  columns?: any;
  constraints?: any;
  statistics?: any;
  functions?: any;
  security?: any;
  runtimeState?: any;
  engineFeatures?: any;
  verificationStatus?: any;
}

export function VerificationDashboard({
  verification,
  databaseIntrospection,
  schemaObjects,
  columns,
  constraints,
  statistics,
  functions,
  security,
  runtimeState,
  engineFeatures,
  verificationStatus
}: VerificationDashboardProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['verification']));

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  // If no verification data, return null
  if (!verification && !databaseIntrospection && !schemaObjects) {
    return null;
  }

  const accuracy = verification?.verificationStats?.accuracy || 0;
  const verifiedCount = verification?.verifiedTables?.length || 0;
  const phantomCount = verification?.phantomTables?.length || 0;
  const duplicateCount = verification?.duplicateTables?.length || 0;

  return (
    <div className="space-y-4 mt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 flex items-center">
          <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
          Verification & Analysis
        </h3>
      </div>

      {/* Verification Summary Card */}
      {verification && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg p-4">
          <button
            onClick={() => toggleSection('verification')}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <h4 className="font-bold text-gray-900">Verification Results</h4>
                <p className="text-sm text-gray-600">Schema accuracy and consistency checks</p>
              </div>
            </div>
            {expandedSections.has('verification') ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </button>

          {expandedSections.has('verification') && (
            <div className="mt-4 space-y-4">
              {/* Accuracy Score */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Accuracy Score</span>
                  <span className={`text-2xl font-bold ${accuracy >= 90 ? 'text-green-600' : accuracy >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {accuracy.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${accuracy >= 90 ? 'bg-green-600' : accuracy >= 70 ? 'bg-yellow-600' : 'bg-red-600'}`}
                    style={{ width: `${accuracy}%` }}
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-lg p-3 shadow-sm text-center">
                  <div className="text-2xl font-bold text-green-600">{verifiedCount}</div>
                  <div className="text-xs text-gray-600 mt-1">Verified Tables</div>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm text-center">
                  <div className="text-2xl font-bold text-orange-600">{phantomCount}</div>
                  <div className="text-xs text-gray-600 mt-1">Phantom Tables</div>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm text-center">
                  <div className="text-2xl font-bold text-blue-600">{duplicateCount}</div>
                  <div className="text-xs text-gray-600 mt-1">Duplicates</div>
                </div>
              </div>

              {/* Phantom Tables Warning */}
              {phantomCount > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-orange-900">Phantom Tables Detected</p>
                      <p className="text-xs text-orange-700 mt-1">
                        {phantomCount} table(s) found in ORM but not in actual database
                      </p>
                      {verification.phantomTables?.slice(0, 3).map((table: any, idx: number) => (
                        <div key={idx} className="text-xs text-orange-600 mt-1">
                          • {table.tableName || table.name}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ORM Consistency */}
              {verification.extractionConsistency && (
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <h5 className="text-sm font-bold text-gray-900 mb-2">ORM Consistency</h5>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Unused Models:</span>
                      <span className="font-medium">{verification.extractionConsistency.consistencyMetrics?.unusedModelCount || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phantom Structures:</span>
                      <span className="font-medium">{verification.extractionConsistency.consistencyMetrics?.phantomStructureCount || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Constraint Issues:</span>
                      <span className="font-medium">{verification.extractionConsistency.consistencyMetrics?.constraintDiscrepancyCount || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Consistency Score:</span>
                      <span className="font-bold text-green-600">
                        {(verification.extractionConsistency.consistencyMetrics?.overallConsistencyScore || 0).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Database Introspection */}
      {databaseIntrospection && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <button
            onClick={() => toggleSection('introspection')}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center space-x-3">
              <Database className="w-6 h-6 text-blue-600" />
              <div>
                <h4 className="font-bold text-gray-900">Database Introspection</h4>
                <p className="text-sm text-gray-600">Actual database schema analysis</p>
              </div>
            </div>
            {expandedSections.has('introspection') ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </button>

          {expandedSections.has('introspection') && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <Table className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                <div className="text-xl font-bold text-blue-900">{databaseIntrospection.actualTables?.length || 0}</div>
                <div className="text-xs text-blue-700">Tables</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 text-center">
                <Eye className="w-6 h-6 text-purple-600 mx-auto mb-1" />
                <div className="text-xl font-bold text-purple-900">{databaseIntrospection.views?.length || 0}</div>
                <div className="text-xs text-purple-700">Views</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <Zap className="w-6 h-6 text-green-600 mx-auto mb-1" />
                <div className="text-xl font-bold text-green-900">{databaseIntrospection.indexes?.length || 0}</div>
                <div className="text-xs text-green-700">Indexes</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 text-center">
                <Activity className="w-6 h-6 text-orange-600 mx-auto mb-1" />
                <div className="text-xl font-bold text-orange-900">{databaseIntrospection.triggers?.length || 0}</div>
                <div className="text-xs text-orange-700">Triggers</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Statistics */}
      {statistics && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <button
            onClick={() => toggleSection('statistics')}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center space-x-3">
              <TrendingUp className="w-6 h-6 text-indigo-600" />
              <div>
                <h4 className="font-bold text-gray-900">Database Statistics</h4>
                <p className="text-sm text-gray-600">Performance metrics and size analysis</p>
              </div>
            </div>
            {expandedSections.has('statistics') ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </button>

          {expandedSections.has('statistics') && (
            <div className="mt-4 space-y-2 text-sm">
              {statistics.tableStatistics?.slice(0, 5).map((stat: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center bg-gray-50 rounded p-2">
                  <span className="font-medium text-gray-900">{stat.tableName}</span>
                  <div className="flex items-center space-x-4 text-xs text-gray-600">
                    <span>{stat.rowCount?.toLocaleString() || 0} rows</span>
                    <span>{((stat.dataSize || 0) / 1024).toFixed(1)} KB</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Security */}
      {security && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <button
            onClick={() => toggleSection('security')}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center space-x-3">
              <Shield className="w-6 h-6 text-red-600" />
              <div>
                <h4 className="font-bold text-gray-900">Security & Permissions</h4>
                <p className="text-sm text-gray-600">Users, roles, and access control</p>
              </div>
            </div>
            {expandedSections.has('security') ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </button>

          {expandedSections.has('security') && (
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-red-900">{security.users?.length || 0}</div>
                <div className="text-xs text-red-700">Users</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-orange-900">{security.roles?.length || 0}</div>
                <div className="text-xs text-orange-700">Roles</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-yellow-900">{security.permissions?.length || 0}</div>
                <div className="text-xs text-yellow-700">Permissions</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Engine Features */}
      {engineFeatures && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <button
            onClick={() => toggleSection('engine')}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center space-x-3">
              <Settings className="w-6 h-6 text-gray-600" />
              <div>
                <h4 className="font-bold text-gray-900">Engine-Specific Features</h4>
                <p className="text-sm text-gray-600">Database-specific configurations</p>
              </div>
            </div>
            {expandedSections.has('engine') ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </button>

          {expandedSections.has('engine') && (
            <div className="mt-4 space-y-2 text-xs">
              {engineFeatures.extensions && (
                <div className="bg-gray-50 rounded p-2">
                  <span className="font-medium">Extensions:</span> {engineFeatures.extensions.installed?.length || 0} installed
                </div>
              )}
              {engineFeatures.partitioning && (
                <div className="bg-gray-50 rounded p-2">
                  <span className="font-medium">Partitioned Tables:</span> {engineFeatures.partitioning.partitionedTables?.length || 0}
                </div>
              )}
              {engineFeatures.databaseConfiguration && (
                <div className="bg-gray-50 rounded p-2">
                  <span className="font-medium">Encoding:</span> {engineFeatures.databaseConfiguration.encoding || 'N/A'}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Verification Status */}
      {verificationStatus && (
        <div className={`border-2 rounded-lg p-3 ${
          verificationStatus.stage === 'complete' ? 'bg-green-50 border-green-300' :
          verificationStatus.stage === 'error' ? 'bg-red-50 border-red-300' :
          'bg-blue-50 border-blue-300'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Info className={`w-5 h-5 ${
                verificationStatus.stage === 'complete' ? 'text-green-600' :
                verificationStatus.stage === 'error' ? 'text-red-600' :
                'text-blue-600'
              }`} />
              <div>
                <div className="text-sm font-bold">{verificationStatus.currentOperation}</div>
                <div className="text-xs text-gray-600">Stage: {verificationStatus.stage}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold">{verificationStatus.progress}%</div>
            </div>
          </div>
          {verificationStatus.errors?.length > 0 && (
            <div className="mt-2 text-xs text-red-600">
              {verificationStatus.errors.slice(0, 2).map((error: string, idx: number) => (
                <div key={idx}>• {error}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

