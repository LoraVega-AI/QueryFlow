// Cloud Security Service for QueryFlow
// Enterprise-grade security features for cloud database connections

import { DatabaseConnection, CloudProvider } from './cloudDatabaseService';
import { CredentialManagementService } from './credentialManagementService';

export interface SecurityPolicy {
  id: string;
  name: string;
  description?: string;
  type: 'connection' | 'network' | 'access' | 'data' | 'audit';
  rules: SecurityRule[];
  appliesTo: string[]; // Connection IDs, provider types, or tags
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface SecurityRule {
  id: string;
  condition: string;
  action: 'allow' | 'deny' | 'warn' | 'audit' | 'encrypt' | 'mask';
  parameters?: Record<string, any>;
  message?: string;
}

export interface SSLConfiguration {
  enabled: boolean;
  mode: 'require' | 'prefer' | 'allow' | 'disable';
  version: 'TLSv1.2' | 'TLSv1.3' | 'auto';
  certificateValidation: boolean;
  clientCertificate?: {
    certificateId: string;
    privateKeyId: string;
    caCertificateId?: string;
  };
  cipherSuites?: string[];
  protocols?: string[];
}

export interface IAMConfiguration {
  enabled: boolean;
  provider: 'aws' | 'azure' | 'gcp' | 'custom';
  roleArn?: string; // AWS
  servicePrincipal?: string; // Azure
  serviceAccount?: string; // GCP
  scopes: string[];
  permissions: Permission[];
  mfa: {
    enabled: boolean;
    methods: ('totp' | 'sms' | 'email' | 'hardware')[];
    required: boolean;
  };
  sessionDuration: number; // minutes
  refreshTokenRotation: boolean;
}

export interface Permission {
  resource: string;
  actions: string[];
  conditions?: Record<string, any>;
  effect: 'allow' | 'deny';
}

export interface VPCConfiguration {
  enabled: boolean;
  vpcId: string;
  subnetIds: string[];
  securityGroupIds: string[];
  routeTableIds?: string[];
  natGatewayIds?: string[];
  internetGatewayId?: string;
  dnsResolution: boolean;
  dnsHostnames: boolean;
  privateEndpoints: PrivateEndpoint[];
}

export interface PrivateEndpoint {
  id: string;
  serviceName: string;
  vpcEndpointId: string;
  routeTableIds: string[];
  securityGroupIds: string[];
}

export interface NetworkACL {
  id: string;
  name: string;
  rules: NetworkRule[];
  priority: number;
  appliesTo: string[];
}

export interface NetworkRule {
  id: string;
  direction: 'inbound' | 'outbound';
  protocol: 'tcp' | 'udp' | 'icmp' | 'all';
  port?: number | { from: number; to: number };
  sourceIp?: string;
  destinationIp?: string;
  action: 'allow' | 'deny';
  priority: number;
}

export interface AuditConfiguration {
  enabled: boolean;
  logLevel: 'none' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
  events: AuditEvent[];
  retention: {
    days: number;
    location: 'local' | 's3' | 'azure-logs' | 'gcp-logging' | 'splunk' | 'elasticsearch';
    compression: boolean;
    encryption: boolean;
  };
  realTimeAlerts: {
    enabled: boolean;
    webhooks: string[];
    emailAddresses: string[];
    slackChannels: string[];
  };
}

export interface AuditEvent {
  type: 'connection' | 'authentication' | 'authorization' | 'query' | 'data-access' | 'configuration' | 'error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  includeQueryData: boolean;
  includeResultData: boolean;
  maskSensitiveData: boolean;
}

export interface SecurityScan {
  id: string;
  connectionId: string;
  scanType: 'vulnerability' | 'compliance' | 'configuration' | 'permissions' | 'network';
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  findings: SecurityFinding[];
  summary: {
    totalFindings: number;
    criticalFindings: number;
    highFindings: number;
    mediumFindings: number;
    lowFindings: number;
    score: number; // 0-100
  };
}

export interface SecurityFinding {
  id: string;
  type: 'vulnerability' | 'misconfiguration' | 'weakness' | 'policy-violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  recommendation: string;
  references?: string[];
  affectedResource: string;
  evidenceLocation?: string;
  cvssScore?: number;
  cveId?: string;
  remediationSteps: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
  status: 'open' | 'investigating' | 'resolved' | 'false-positive' | 'accepted-risk';
  assignedTo?: string;
  dueDate?: Date;
}

export interface ComplianceFramework {
  id: string;
  name: string;
  version: string;
  controls: ComplianceControl[];
  applicableRegions: string[];
  industries: string[];
}

export interface ComplianceControl {
  id: string;
  name: string;
  description: string;
  requirements: string[];
  implementationGuidance: string;
  automatedChecks: string[];
  evidence: string[];
  status: 'compliant' | 'non-compliant' | 'not-applicable' | 'under-review';
  lastAssessed: Date;
  nextAssessment: Date;
}

export interface ThreatIntelligence {
  id: string;
  type: 'ip' | 'domain' | 'url' | 'hash' | 'signature';
  value: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  description: string;
  firstSeen: Date;
  lastSeen: Date;
  confidence: number; // 0-100
  tags: string[];
}

export class CloudSecurityService {
  private static securityPolicies: Map<string, SecurityPolicy> = new Map();
  private static networkACLs: Map<string, NetworkACL> = new Map();
  private static securityScans: Map<string, SecurityScan> = new Map();
  private static complianceFrameworks: Map<string, ComplianceFramework> = new Map();
  private static threatIntelligence: Map<string, ThreatIntelligence> = new Map();

  static {
    this.initializeDefaultPolicies();
    this.initializeComplianceFrameworks();
  }

  /**
   * Configure SSL/TLS for connection
   */
  static async configureSSL(
    connectionId: string,
    sslConfig: SSLConfiguration
  ): Promise<void> {
    // Validate SSL configuration
    this.validateSSLConfiguration(sslConfig);

    // Store SSL configuration securely
    await CredentialManagementService.storeCredential({
      name: `SSL Config - ${connectionId}`,
      description: 'SSL/TLS configuration for database connection',
      type: 'ssl-certificate',
      vaultId: 'default',
      secretPath: `ssl/${connectionId}`,
      fields: [
        { name: 'config', type: 'json', encrypted: true, required: true, masked: false }
      ],
      tags: ['ssl', 'connection', connectionId],
      rotationEnabled: false
    }, {
      config: JSON.stringify(sslConfig)
    });
  }

  /**
   * Configure IAM for connection
   */
  static async configureIAM(
    connectionId: string,
    iamConfig: IAMConfiguration
  ): Promise<void> {
    // Validate IAM configuration
    this.validateIAMConfiguration(iamConfig);

    // Store IAM configuration securely
    await CredentialManagementService.storeCredential({
      name: `IAM Config - ${connectionId}`,
      description: 'IAM configuration for database connection',
      type: 'custom',
      vaultId: 'default',
      secretPath: `iam/${connectionId}`,
      fields: [
        { name: 'config', type: 'json', encrypted: true, required: true, masked: false }
      ],
      tags: ['iam', 'connection', connectionId],
      rotationEnabled: iamConfig.refreshTokenRotation,
      rotationIntervalDays: 30
    }, {
      config: JSON.stringify(iamConfig)
    });
  }

  /**
   * Configure VPC for connection
   */
  static async configureVPC(
    connectionId: string,
    vpcConfig: VPCConfiguration
  ): Promise<void> {
    // Validate VPC configuration
    this.validateVPCConfiguration(vpcConfig);

    // Store VPC configuration
    await CredentialManagementService.storeCredential({
      name: `VPC Config - ${connectionId}`,
      description: 'VPC configuration for database connection',
      type: 'custom',
      vaultId: 'default',
      secretPath: `vpc/${connectionId}`,
      fields: [
        { name: 'config', type: 'json', encrypted: false, required: true, masked: false }
      ],
      tags: ['vpc', 'network', connectionId],
      rotationEnabled: false
    }, {
      config: JSON.stringify(vpcConfig)
    });
  }

  /**
   * Create security policy
   */
  static createSecurityPolicy(policy: Omit<SecurityPolicy, 'id' | 'createdAt' | 'updatedAt'>): SecurityPolicy {
    const newPolicy: SecurityPolicy = {
      ...policy,
      id: `policy_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.securityPolicies.set(newPolicy.id, newPolicy);
    return newPolicy;
  }

  /**
   * Get security policies
   */
  static getSecurityPolicies(filters?: {
    type?: SecurityPolicy['type'];
    severity?: SecurityPolicy['severity'];
    enabled?: boolean;
  }): SecurityPolicy[] {
    let policies = Array.from(this.securityPolicies.values());

    if (filters) {
      if (filters.type) {
        policies = policies.filter(p => p.type === filters.type);
      }
      if (filters.severity) {
        policies = policies.filter(p => p.severity === filters.severity);
      }
      if (filters.enabled !== undefined) {
        policies = policies.filter(p => p.enabled === filters.enabled);
      }
    }

    return policies;
  }

  /**
   * Evaluate security policies for connection
   */
  static async evaluateSecurityPolicies(
    connection: DatabaseConnection,
    operation: string
  ): Promise<{
    allowed: boolean;
    violations: SecurityPolicyViolation[];
    warnings: SecurityPolicyViolation[];
  }> {
    const violations: SecurityPolicyViolation[] = [];
    const warnings: SecurityPolicyViolation[] = [];

    const applicablePolicies = Array.from(this.securityPolicies.values())
      .filter(policy => 
        policy.enabled && 
        this.isPolicyApplicable(policy, connection)
      );

    for (const policy of applicablePolicies) {
      for (const rule of policy.rules) {
        const evaluation = await this.evaluateSecurityRule(rule, connection, operation);
        
        if (!evaluation.passed) {
          const violation: SecurityPolicyViolation = {
            policyId: policy.id,
            policyName: policy.name,
            ruleId: rule.id,
            severity: policy.severity,
            message: evaluation.message || rule.message || 'Security policy violation',
            action: rule.action
          };

          if (rule.action === 'deny') {
            violations.push(violation);
          } else if (rule.action === 'warn') {
            warnings.push(violation);
          }
        }
      }
    }

    return {
      allowed: violations.length === 0,
      violations,
      warnings
    };
  }

  /**
   * Run security scan
   */
  static async runSecurityScan(
    connectionId: string,
    scanType: SecurityScan['scanType']
  ): Promise<SecurityScan> {
    const scan: SecurityScan = {
      id: `scan_${Date.now()}`,
      connectionId,
      scanType,
      status: 'running',
      startedAt: new Date(),
      findings: [],
      summary: {
        totalFindings: 0,
        criticalFindings: 0,
        highFindings: 0,
        mediumFindings: 0,
        lowFindings: 0,
        score: 0
      }
    };

    this.securityScans.set(scan.id, scan);

    // Simulate scan execution
    setTimeout(async () => {
      const findings = await this.performSecurityScan(connectionId, scanType);
      
      scan.findings = findings;
      scan.summary = this.calculateScanSummary(findings);
      scan.status = 'completed';
      scan.completedAt = new Date();
      
      this.securityScans.set(scan.id, scan);
    }, 3000);

    return scan;
  }

  /**
   * Get security scans
   */
  static getSecurityScans(connectionId?: string): SecurityScan[] {
    const scans = Array.from(this.securityScans.values());
    
    if (connectionId) {
      return scans.filter(scan => scan.connectionId === connectionId);
    }
    
    return scans.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  /**
   * Get compliance status
   */
  static getComplianceStatus(frameworkId: string, connectionId?: string): {
    framework: ComplianceFramework;
    overallStatus: 'compliant' | 'non-compliant' | 'partial';
    compliantControls: number;
    totalControls: number;
    findings: SecurityFinding[];
  } {
    const framework = this.complianceFrameworks.get(frameworkId);
    if (!framework) {
      throw new Error('Compliance framework not found');
    }

    const compliantControls = framework.controls.filter(c => c.status === 'compliant').length;
    const totalControls = framework.controls.length;
    
    let overallStatus: 'compliant' | 'non-compliant' | 'partial' = 'compliant';
    if (compliantControls === 0) {
      overallStatus = 'non-compliant';
    } else if (compliantControls < totalControls) {
      overallStatus = 'partial';
    }

    // Get related findings
    const findings = Array.from(this.securityScans.values())
      .filter(scan => !connectionId || scan.connectionId === connectionId)
      .flatMap(scan => scan.findings)
      .filter(finding => finding.type === 'policy-violation');

    return {
      framework,
      overallStatus,
      compliantControls,
      totalControls,
      findings
    };
  }

  /**
   * Configure audit logging
   */
  static async configureAuditLogging(
    connectionId: string,
    auditConfig: AuditConfiguration
  ): Promise<void> {
    await CredentialManagementService.storeCredential({
      name: `Audit Config - ${connectionId}`,
      description: 'Audit logging configuration',
      type: 'custom',
      vaultId: 'default',
      secretPath: `audit/${connectionId}`,
      fields: [
        { name: 'config', type: 'json', encrypted: false, required: true, masked: false }
      ],
      tags: ['audit', 'logging', connectionId],
      rotationEnabled: false
    }, {
      config: JSON.stringify(auditConfig)
    });
  }

  /**
   * Get threat intelligence
   */
  static getThreatIntelligence(filters?: {
    type?: ThreatIntelligence['type'];
    severity?: ThreatIntelligence['severity'];
    confidence?: number;
  }): ThreatIntelligence[] {
    let threats = Array.from(this.threatIntelligence.values());

    if (filters) {
      if (filters.type) {
        threats = threats.filter(t => t.type === filters.type);
      }
      if (filters.severity) {
        threats = threats.filter(t => t.severity === filters.severity);
      }
      if (filters.confidence !== undefined) {
        threats = threats.filter(t => t.confidence >= (filters.confidence || 0));
      }
    }

    return threats.sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());
  }

  /**
   * Check against threat intelligence
   */
  static checkThreatIntelligence(value: string, type: ThreatIntelligence['type']): ThreatIntelligence | null {
    for (const threat of this.threatIntelligence.values()) {
      if (threat.type === type && threat.value === value) {
        return threat;
      }
    }
    return null;
  }

  /**
   * Get security dashboard metrics
   */
  static getSecurityDashboard(): {
    totalConnections: number;
    secureConnections: number;
    activePolicies: number;
    recentScans: number;
    criticalFindings: number;
    complianceScore: number;
    threatAlerts: number;
  } {
    const totalScans = Array.from(this.securityScans.values());
    const recentScans = totalScans.filter(scan => 
      scan.startedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length;

    const criticalFindings = totalScans
      .flatMap(scan => scan.findings)
      .filter(finding => finding.severity === 'critical' && finding.status === 'open')
      .length;

    const activePolicies = Array.from(this.securityPolicies.values())
      .filter(policy => policy.enabled).length;

    const highSeverityThreats = Array.from(this.threatIntelligence.values())
      .filter(threat => ['high', 'critical'].includes(threat.severity)).length;

    return {
      totalConnections: 0, // Would be populated from connection service
      secureConnections: 0, // Would be calculated based on SSL/VPC configuration
      activePolicies,
      recentScans,
      criticalFindings,
      complianceScore: 85, // Would be calculated from compliance assessments
      threatAlerts: highSeverityThreats
    };
  }

  // Private helper methods

  private static initializeDefaultPolicies(): void {
    const defaultPolicies: SecurityPolicy[] = [
      {
        id: 'ssl-required',
        name: 'SSL Required',
        description: 'Require SSL/TLS encryption for all database connections',
        type: 'connection',
        rules: [
          {
            id: 'ssl-check',
            condition: 'ssl.enabled == true',
            action: 'deny',
            message: 'SSL/TLS encryption is required for all database connections'
          }
        ],
        appliesTo: ['*'],
        enabled: true,
        severity: 'high',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system'
      },
      {
        id: 'strong-authentication',
        name: 'Strong Authentication Required',
        description: 'Require strong authentication mechanisms',
        type: 'access',
        rules: [
          {
            id: 'auth-strength',
            condition: 'authentication.method in ["certificate", "kerberos", "oauth2"]',
            action: 'warn',
            message: 'Consider using stronger authentication methods'
          }
        ],
        appliesTo: ['*'],
        enabled: true,
        severity: 'medium',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system'
      },
      {
        id: 'audit-logging',
        name: 'Audit Logging Required',
        description: 'Require audit logging for all database operations',
        type: 'audit',
        rules: [
          {
            id: 'audit-enabled',
            condition: 'audit.enabled == true',
            action: 'warn',
            message: 'Audit logging should be enabled for compliance'
          }
        ],
        appliesTo: ['*'],
        enabled: true,
        severity: 'medium',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system'
      }
    ];

    defaultPolicies.forEach(policy => {
      this.securityPolicies.set(policy.id, policy);
    });
  }

  private static initializeComplianceFrameworks(): void {
    const frameworks: ComplianceFramework[] = [
      {
        id: 'gdpr',
        name: 'GDPR',
        version: '2018',
        controls: [
          {
            id: 'gdpr-25',
            name: 'Data Protection by Design and by Default',
            description: 'Implement data protection measures from the outset',
            requirements: ['Data minimization', 'Pseudonymization', 'Encryption'],
            implementationGuidance: 'Implement encryption and access controls',
            automatedChecks: ['encryption-check', 'access-control-check'],
            evidence: ['Configuration files', 'Access logs'],
            status: 'compliant',
            lastAssessed: new Date(),
            nextAssessment: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          }
        ],
        applicableRegions: ['EU'],
        industries: ['*']
      },
      {
        id: 'sox',
        name: 'Sarbanes-Oxley Act',
        version: '2002',
        controls: [
          {
            id: 'sox-404',
            name: 'Internal Controls over Financial Reporting',
            description: 'Establish and maintain internal controls',
            requirements: ['Audit trails', 'Access controls', 'Change management'],
            implementationGuidance: 'Implement comprehensive audit logging',
            automatedChecks: ['audit-logging-check', 'change-control-check'],
            evidence: ['Audit logs', 'Change records'],
            status: 'compliant',
            lastAssessed: new Date(),
            nextAssessment: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          }
        ],
        applicableRegions: ['US'],
        industries: ['financial']
      }
    ];

    frameworks.forEach(framework => {
      this.complianceFrameworks.set(framework.id, framework);
    });
  }

  private static validateSSLConfiguration(config: SSLConfiguration): void {
    if (config.enabled && !config.mode) {
      throw new Error('SSL mode is required when SSL is enabled');
    }
    
    if (config.clientCertificate && !config.clientCertificate.certificateId) {
      throw new Error('Certificate ID is required for client certificate authentication');
    }
  }

  private static validateIAMConfiguration(config: IAMConfiguration): void {
    if (config.enabled && !config.provider) {
      throw new Error('IAM provider is required when IAM is enabled');
    }
    
    if (config.sessionDuration < 5 || config.sessionDuration > 1440) {
      throw new Error('Session duration must be between 5 and 1440 minutes');
    }
  }

  private static validateVPCConfiguration(config: VPCConfiguration): void {
    if (config.enabled && !config.vpcId) {
      throw new Error('VPC ID is required when VPC is enabled');
    }
    
    if (config.enabled && config.subnetIds.length === 0) {
      throw new Error('At least one subnet ID is required');
    }
  }

  private static isPolicyApplicable(policy: SecurityPolicy, connection: DatabaseConnection): boolean {
    return policy.appliesTo.includes('*') || 
           policy.appliesTo.includes(connection.provider) ||
           policy.appliesTo.includes(connection.id);
  }

  private static async evaluateSecurityRule(
    rule: SecurityRule,
    connection: DatabaseConnection,
    operation: string
  ): Promise<{ passed: boolean; message?: string }> {
    // Simplified rule evaluation - in production, use a proper rule engine
    try {
      // Mock evaluation based on connection properties
      if (rule.condition.includes('ssl.enabled')) {
        return { passed: connection.ssl === true };
      }
      
      if (rule.condition.includes('authentication.method')) {
        // Mock - assume password authentication
        return { passed: false, message: 'Using basic password authentication' };
      }
      
      if (rule.condition.includes('audit.enabled')) {
        // Mock - assume audit not configured
        return { passed: false, message: 'Audit logging not configured' };
      }
      
      return { passed: true };
    } catch (error) {
      return { passed: false, message: 'Rule evaluation failed' };
    }
  }

  private static async performSecurityScan(
    connectionId: string,
    scanType: SecurityScan['scanType']
  ): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    // Simulate findings based on scan type
    switch (scanType) {
      case 'vulnerability':
        findings.push({
          id: `finding_${Date.now()}_1`,
          type: 'vulnerability',
          severity: 'medium',
          title: 'Outdated Database Version',
          description: 'Database version is outdated and may contain security vulnerabilities',
          impact: 'Potential exposure to known vulnerabilities',
          recommendation: 'Update to the latest stable version',
          affectedResource: connectionId,
          remediationSteps: [
            'Schedule maintenance window',
            'Backup database',
            'Update to latest version',
            'Verify functionality'
          ],
          estimatedEffort: 'medium',
          status: 'open'
        });
        break;
        
      case 'configuration':
        findings.push({
          id: `finding_${Date.now()}_2`,
          type: 'misconfiguration',
          severity: 'high',
          title: 'Weak SSL Configuration',
          description: 'SSL/TLS configuration uses weak cipher suites',
          impact: 'Potential man-in-the-middle attacks',
          recommendation: 'Configure strong cipher suites and disable weak protocols',
          affectedResource: connectionId,
          remediationSteps: [
            'Review SSL configuration',
            'Update cipher suites',
            'Test connectivity',
            'Monitor for issues'
          ],
          estimatedEffort: 'low',
          status: 'open'
        });
        break;
        
      case 'permissions':
        findings.push({
          id: `finding_${Date.now()}_3`,
          type: 'weakness',
          severity: 'medium',
          title: 'Overprivileged Database User',
          description: 'Database user has excessive privileges',
          impact: 'Potential for privilege escalation',
          recommendation: 'Apply principle of least privilege',
          affectedResource: connectionId,
          remediationSteps: [
            'Review current permissions',
            'Identify minimum required privileges',
            'Update user permissions',
            'Test application functionality'
          ],
          estimatedEffort: 'medium',
          status: 'open'
        });
        break;
    }

    return findings;
  }

  private static calculateScanSummary(findings: SecurityFinding[]): SecurityScan['summary'] {
    const summary = {
      totalFindings: findings.length,
      criticalFindings: findings.filter(f => f.severity === 'critical').length,
      highFindings: findings.filter(f => f.severity === 'high').length,
      mediumFindings: findings.filter(f => f.severity === 'medium').length,
      lowFindings: findings.filter(f => f.severity === 'low').length,
      score: 0
    };

    // Calculate security score (0-100)
    const weights = { critical: 40, high: 20, medium: 10, low: 5 };
    const maxPossibleDeductions = 100;
    const deductions = summary.criticalFindings * weights.critical +
                      summary.highFindings * weights.high +
                      summary.mediumFindings * weights.medium +
                      summary.lowFindings * weights.low;

    summary.score = Math.max(0, 100 - Math.min(deductions, maxPossibleDeductions));

    return summary;
  }
}

export interface SecurityPolicyViolation {
  policyId: string;
  policyName: string;
  ruleId: string;
  severity: SecurityPolicy['severity'];
  message: string;
  action: SecurityRule['action'];
}
