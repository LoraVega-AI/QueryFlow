// Credential Management Service for QueryFlow
// Secure storage and management of database and cloud credentials

export interface CredentialVault {
  id: string;
  name: string;
  description?: string;
  type: 'local' | 'aws-secrets-manager' | 'azure-key-vault' | 'gcp-secret-manager' | 'hashicorp-vault';
  config: VaultConfiguration;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface VaultConfiguration {
  // AWS Secrets Manager
  awsRegion?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  
  // Azure Key Vault
  azureClientId?: string;
  azureClientSecret?: string;
  azureTenantId?: string;
  azureVaultUrl?: string;
  
  // Google Cloud Secret Manager
  gcpProjectId?: string;
  gcpKeyFile?: string;
  
  // HashiCorp Vault
  vaultUrl?: string;
  vaultToken?: string;
  vaultNamespace?: string;
  
  // Local storage encryption key
  encryptionKey?: string;
}

export interface StoredCredential {
  id: string;
  name: string;
  description?: string;
  type: CredentialType;
  vaultId: string;
  secretPath: string;
  fields: CredentialField[];
  tags: string[];
  expiresAt?: Date;
  rotationEnabled: boolean;
  rotationIntervalDays?: number;
  lastRotated?: Date;
  nextRotation?: Date;
  accessCount: number;
  lastAccessed?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  metadata?: Record<string, any>;
}

export interface CredentialField {
  name: string;
  type: 'text' | 'password' | 'token' | 'key' | 'certificate' | 'json';
  encrypted: boolean;
  required: boolean;
  description?: string;
  validation?: string; // Regex pattern
  masked: boolean; // Whether to show value in UI
}

export type CredentialType = 
  | 'database-password'
  | 'api-key'
  | 'oauth-token'
  | 'ssh-key'
  | 'ssl-certificate'
  | 'aws-credentials'
  | 'azure-credentials'
  | 'gcp-credentials'
  | 'jwt-token'
  | 'custom';

export interface CredentialUsage {
  credentialId: string;
  usedBy: string; // Connection ID or service name
  usedAt: Date;
  operation: string;
  success: boolean;
  errorMessage?: string;
}

export interface CredentialAuditLog {
  id: string;
  credentialId: string;
  action: 'created' | 'read' | 'updated' | 'deleted' | 'rotated' | 'accessed';
  userId: string;
  timestamp: Date;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface CredentialPolicy {
  id: string;
  name: string;
  description?: string;
  rules: PolicyRule[];
  appliesTo: string[]; // Credential types or tags
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PolicyRule {
  type: 'expiration' | 'rotation' | 'access' | 'strength' | 'usage';
  condition: string;
  action: 'allow' | 'deny' | 'warn' | 'require-approval';
  message?: string;
  parameters?: Record<string, any>;
}

export interface CredentialTemplate {
  id: string;
  name: string;
  description?: string;
  type: CredentialType;
  fields: CredentialField[];
  defaultVaultId?: string;
  policies: string[];
  isSystemTemplate: boolean;
}

export class CredentialManagementService {
  private static vaults: Map<string, CredentialVault> = new Map();
  private static credentials: Map<string, StoredCredential> = new Map();
  private static usageLogs: CredentialUsage[] = [];
  private static auditLogs: CredentialAuditLog[] = [];
  private static policies: Map<string, CredentialPolicy> = new Map();
  private static templates: Map<string, CredentialTemplate> = new Map();
  private static encryptionKey: string = 'default-encryption-key'; // In production, use secure key management

  static {
    // Initialize with default local vault
    this.createDefaultVault();
    this.createDefaultTemplates();
    this.createDefaultPolicies();
  }

  /**
   * Create or update credential vault
   */
  static async createVault(vault: Omit<CredentialVault, 'id' | 'createdAt' | 'updatedAt'>): Promise<CredentialVault> {
    const newVault: CredentialVault = {
      ...vault,
      id: `vault_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Test vault connection
    await this.testVaultConnection(newVault);

    this.vaults.set(newVault.id, newVault);
    
    this.logAudit({
      id: `audit_${Date.now()}`,
      credentialId: '',
      action: 'created',
      userId: 'system',
      timestamp: new Date(),
      details: { vaultId: newVault.id, vaultName: newVault.name }
    });

    return newVault;
  }

  /**
   * Get all vaults
   */
  static getVaults(): CredentialVault[] {
    return Array.from(this.vaults.values());
  }

  /**
   * Get vault by ID
   */
  static getVault(id: string): CredentialVault | null {
    return this.vaults.get(id) || null;
  }

  /**
   * Delete vault
   */
  static async deleteVault(id: string): Promise<void> {
    const vault = this.vaults.get(id);
    if (!vault) {
      throw new Error('Vault not found');
    }

    if (vault.isDefault) {
      throw new Error('Cannot delete default vault');
    }

    // Check for credentials using this vault
    const credentialsInVault = Array.from(this.credentials.values())
      .filter(cred => cred.vaultId === id);
    
    if (credentialsInVault.length > 0) {
      throw new Error(`Cannot delete vault with ${credentialsInVault.length} credentials`);
    }

    this.vaults.delete(id);
    
    this.logAudit({
      id: `audit_${Date.now()}`,
      credentialId: '',
      action: 'deleted',
      userId: 'system',
      timestamp: new Date(),
      details: { vaultId: id, vaultName: vault.name }
    });
  }

  /**
   * Store credential securely
   */
  static async storeCredential(
    credential: Omit<StoredCredential, 'id' | 'createdAt' | 'updatedAt' | 'accessCount' | 'createdBy'>,
    values: Record<string, any>,
    userId: string = 'system'
  ): Promise<StoredCredential> {
    const vault = this.vaults.get(credential.vaultId);
    if (!vault) {
      throw new Error('Vault not found');
    }

    const newCredential: StoredCredential = {
      ...credential,
      id: `cred_${Date.now()}`,
      accessCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId
    };

    // Encrypt sensitive values
    const encryptedValues = await this.encryptCredentialValues(values, newCredential.fields);
    
    // Store in vault
    await this.storeInVault(vault, newCredential.secretPath, encryptedValues);

    this.credentials.set(newCredential.id, newCredential);
    
    this.logAudit({
      id: `audit_${Date.now()}`,
      credentialId: newCredential.id,
      action: 'created',
      userId,
      timestamp: new Date(),
      details: { name: newCredential.name, type: newCredential.type }
    });

    return newCredential;
  }

  /**
   * Retrieve credential values
   */
  static async getCredentialValues(
    credentialId: string,
    userId: string = 'system'
  ): Promise<Record<string, any>> {
    const credential = this.credentials.get(credentialId);
    if (!credential) {
      throw new Error('Credential not found');
    }

    const vault = this.vaults.get(credential.vaultId);
    if (!vault) {
      throw new Error('Vault not found');
    }

    // Check policies
    await this.checkPolicies(credential, 'access', userId);

    // Retrieve from vault
    const encryptedValues = await this.retrieveFromVault(vault, credential.secretPath);
    
    // Decrypt values
    const decryptedValues = await this.decryptCredentialValues(encryptedValues, credential.fields);

    // Update access tracking
    credential.accessCount++;
    credential.lastAccessed = new Date();

    this.logUsage({
      credentialId,
      usedBy: userId,
      usedAt: new Date(),
      operation: 'read',
      success: true
    });

    this.logAudit({
      id: `audit_${Date.now()}`,
      credentialId,
      action: 'accessed',
      userId,
      timestamp: new Date()
    });

    return decryptedValues;
  }

  /**
   * Update credential
   */
  static async updateCredential(
    credentialId: string,
    updates: Partial<StoredCredential>,
    values?: Record<string, any>,
    userId: string = 'system'
  ): Promise<StoredCredential> {
    const credential = this.credentials.get(credentialId);
    if (!credential) {
      throw new Error('Credential not found');
    }

    const vault = this.vaults.get(credential.vaultId);
    if (!vault) {
      throw new Error('Vault not found');
    }

    // Check policies
    await this.checkPolicies(credential, 'updated', userId);

    const updatedCredential: StoredCredential = {
      ...credential,
      ...updates,
      id: credentialId,
      updatedAt: new Date()
    };

    // Update values if provided
    if (values) {
      const encryptedValues = await this.encryptCredentialValues(values, updatedCredential.fields);
      await this.storeInVault(vault, updatedCredential.secretPath, encryptedValues);
    }

    this.credentials.set(credentialId, updatedCredential);
    
    this.logAudit({
      id: `audit_${Date.now()}`,
      credentialId,
      action: 'updated',
      userId,
      timestamp: new Date(),
      details: { updatedFields: Object.keys(updates) }
    });

    return updatedCredential;
  }

  /**
   * Delete credential
   */
  static async deleteCredential(credentialId: string, userId: string = 'system'): Promise<void> {
    const credential = this.credentials.get(credentialId);
    if (!credential) {
      throw new Error('Credential not found');
    }

    const vault = this.vaults.get(credential.vaultId);
    if (!vault) {
      throw new Error('Vault not found');
    }

    // Check policies
    await this.checkPolicies(credential, 'deleted', userId);

    // Remove from vault
    await this.deleteFromVault(vault, credential.secretPath);

    this.credentials.delete(credentialId);
    
    this.logAudit({
      id: `audit_${Date.now()}`,
      credentialId,
      action: 'deleted',
      userId,
      timestamp: new Date(),
      details: { name: credential.name }
    });
  }

  /**
   * Rotate credential
   */
  static async rotateCredential(credentialId: string, userId: string = 'system'): Promise<void> {
    const credential = this.credentials.get(credentialId);
    if (!credential) {
      throw new Error('Credential not found');
    }

    if (!credential.rotationEnabled) {
      throw new Error('Rotation not enabled for this credential');
    }

    // Generate new credential values based on type
    const newValues = await this.generateNewCredentialValues(credential);

    // Update credential with new values
    await this.updateCredential(credentialId, {
      lastRotated: new Date(),
      nextRotation: this.calculateNextRotation(credential)
    }, newValues, userId);

    this.logAudit({
      id: `audit_${Date.now()}`,
      credentialId,
      action: 'rotated',
      userId,
      timestamp: new Date()
    });
  }

  /**
   * Get credentials
   */
  static getCredentials(filters?: {
    type?: CredentialType;
    vaultId?: string;
    tags?: string[];
    expiringWithinDays?: number;
  }): StoredCredential[] {
    let credentials = Array.from(this.credentials.values());

    if (filters) {
      if (filters.type) {
        credentials = credentials.filter(c => c.type === filters.type);
      }
      if (filters.vaultId) {
        credentials = credentials.filter(c => c.vaultId === filters.vaultId);
      }
      if (filters.tags && filters.tags.length > 0) {
        credentials = credentials.filter(c => 
          filters.tags!.some(tag => c.tags.includes(tag))
        );
      }
      if (filters.expiringWithinDays) {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + filters.expiringWithinDays);
        credentials = credentials.filter(c => 
          c.expiresAt && c.expiresAt <= expirationDate
        );
      }
    }

    return credentials;
  }

  /**
   * Get credential templates
   */
  static getTemplates(): CredentialTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get usage logs
   */
  static getUsageLogs(credentialId?: string): CredentialUsage[] {
    if (credentialId) {
      return this.usageLogs.filter(log => log.credentialId === credentialId);
    }
    return this.usageLogs.slice(-1000); // Return last 1000 entries
  }

  /**
   * Get audit logs
   */
  static getAuditLogs(credentialId?: string): CredentialAuditLog[] {
    if (credentialId) {
      return this.auditLogs.filter(log => log.credentialId === credentialId);
    }
    return this.auditLogs.slice(-1000); // Return last 1000 entries
  }

  /**
   * Get credentials needing rotation
   */
  static getCredentialsNeedingRotation(): StoredCredential[] {
    const now = new Date();
    return Array.from(this.credentials.values())
      .filter(c => c.rotationEnabled && c.nextRotation && c.nextRotation <= now);
  }

  /**
   * Get expiring credentials
   */
  static getExpiringCredentials(withinDays: number = 30): StoredCredential[] {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + withinDays);
    
    return Array.from(this.credentials.values())
      .filter(c => c.expiresAt && c.expiresAt <= expirationDate);
  }

  // Private helper methods

  private static createDefaultVault(): void {
    const defaultVault: CredentialVault = {
      id: 'default',
      name: 'Local Vault',
      description: 'Default local credential storage',
      type: 'local',
      config: {
        encryptionKey: this.encryptionKey
      },
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.vaults.set(defaultVault.id, defaultVault);
  }

  private static createDefaultTemplates(): void {
    const templates: CredentialTemplate[] = [
      {
        id: 'database-password-template',
        name: 'Database Password',
        description: 'Standard database connection credentials',
        type: 'database-password',
        fields: [
          { name: 'username', type: 'text', encrypted: false, required: true, masked: false },
          { name: 'password', type: 'password', encrypted: true, required: true, masked: true },
          { name: 'host', type: 'text', encrypted: false, required: false, masked: false },
          { name: 'port', type: 'text', encrypted: false, required: false, masked: false }
        ],
        policies: [],
        isSystemTemplate: true
      },
      {
        id: 'api-key-template',
        name: 'API Key',
        description: 'API key for external services',
        type: 'api-key',
        fields: [
          { name: 'api_key', type: 'key', encrypted: true, required: true, masked: true },
          { name: 'api_secret', type: 'key', encrypted: true, required: false, masked: true },
          { name: 'endpoint', type: 'text', encrypted: false, required: false, masked: false }
        ],
        policies: [],
        isSystemTemplate: true
      },
      {
        id: 'aws-credentials-template',
        name: 'AWS Credentials',
        description: 'AWS access credentials',
        type: 'aws-credentials',
        fields: [
          { name: 'access_key_id', type: 'key', encrypted: true, required: true, masked: true },
          { name: 'secret_access_key', type: 'key', encrypted: true, required: true, masked: true },
          { name: 'session_token', type: 'token', encrypted: true, required: false, masked: true },
          { name: 'region', type: 'text', encrypted: false, required: false, masked: false }
        ],
        policies: [],
        isSystemTemplate: true
      }
    ];

    templates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  private static createDefaultPolicies(): void {
    const policies: CredentialPolicy[] = [
      {
        id: 'default-expiration-policy',
        name: 'Default Expiration Policy',
        description: 'Warn when credentials expire within 30 days',
        rules: [
          {
            type: 'expiration',
            condition: 'expires_within_days <= 30',
            action: 'warn',
            message: 'Credential expires within 30 days'
          }
        ],
        appliesTo: ['*'],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'rotation-policy',
        name: 'Rotation Policy',
        description: 'Require rotation for sensitive credentials',
        rules: [
          {
            type: 'rotation',
            condition: 'type in ["database-password", "api-key", "aws-credentials"]',
            action: 'require-approval',
            message: 'Rotation required for sensitive credentials'
          }
        ],
        appliesTo: ['database-password', 'api-key', 'aws-credentials'],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    policies.forEach(policy => {
      this.policies.set(policy.id, policy);
    });
  }

  private static async testVaultConnection(vault: CredentialVault): Promise<void> {
    // Simulate vault connection test
    switch (vault.type) {
      case 'local':
        // Always succeeds for local vault
        break;
      case 'aws-secrets-manager':
        if (!vault.config.awsRegion || !vault.config.awsAccessKeyId) {
          throw new Error('AWS credentials required');
        }
        break;
      case 'azure-key-vault':
        if (!vault.config.azureVaultUrl || !vault.config.azureClientId) {
          throw new Error('Azure credentials required');
        }
        break;
      case 'gcp-secret-manager':
        if (!vault.config.gcpProjectId) {
          throw new Error('GCP project ID required');
        }
        break;
      case 'hashicorp-vault':
        if (!vault.config.vaultUrl || !vault.config.vaultToken) {
          throw new Error('Vault URL and token required');
        }
        break;
    }
  }

  private static async encryptCredentialValues(
    values: Record<string, any>, 
    fields: CredentialField[]
  ): Promise<Record<string, any>> {
    const encrypted: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(values)) {
      const field = fields.find(f => f.name === key);
      if (field && field.encrypted) {
        encrypted[key] = this.encrypt(String(value));
      } else {
        encrypted[key] = value;
      }
    }
    
    return encrypted;
  }

  private static async decryptCredentialValues(
    values: Record<string, any>, 
    fields: CredentialField[]
  ): Promise<Record<string, any>> {
    const decrypted: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(values)) {
      const field = fields.find(f => f.name === key);
      if (field && field.encrypted && typeof value === 'string') {
        decrypted[key] = this.decrypt(value);
      } else {
        decrypted[key] = value;
      }
    }
    
    return decrypted;
  }

  private static async storeInVault(
    vault: CredentialVault, 
    path: string, 
    values: Record<string, any>
  ): Promise<void> {
    // Simulate storing in different vault types
    // In production, this would use actual vault APIs
    console.log(`Storing credential at ${path} in ${vault.type} vault`);
  }

  private static async retrieveFromVault(
    vault: CredentialVault, 
    path: string
  ): Promise<Record<string, any>> {
    // Simulate retrieving from different vault types
    // In production, this would use actual vault APIs
    console.log(`Retrieving credential from ${path} in ${vault.type} vault`);
    
    // Return mock data for demo
    return {
      username: 'demo_user',
      password: this.encrypt('demo_password'),
      host: 'localhost',
      port: '5432'
    };
  }

  private static async deleteFromVault(vault: CredentialVault, path: string): Promise<void> {
    // Simulate deleting from vault
    console.log(`Deleting credential at ${path} from ${vault.type} vault`);
  }

  private static async checkPolicies(
    credential: StoredCredential, 
    action: string, 
    userId: string
  ): Promise<void> {
    const applicablePolicies = Array.from(this.policies.values())
      .filter(policy => 
        policy.enabled && 
        (policy.appliesTo.includes('*') || 
         policy.appliesTo.includes(credential.type) ||
         credential.tags.some(tag => policy.appliesTo.includes(tag)))
      );

    for (const policy of applicablePolicies) {
      for (const rule of policy.rules) {
        // Simple policy evaluation - in production, use a proper rule engine
        if (rule.action === 'deny') {
          throw new Error(rule.message || 'Access denied by policy');
        }
      }
    }
  }

  private static async generateNewCredentialValues(credential: StoredCredential): Promise<Record<string, any>> {
    // Generate new values based on credential type
    const newValues: Record<string, any> = {};
    
    credential.fields.forEach(field => {
      switch (field.type) {
        case 'password':
          newValues[field.name] = this.generatePassword();
          break;
        case 'key':
        case 'token':
          newValues[field.name] = this.generateApiKey();
          break;
        default:
          // Keep existing value for non-generated fields
          break;
      }
    });
    
    return newValues;
  }

  private static generatePassword(length: number = 16): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  private static generateApiKey(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    for (let i = 0; i < length; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  }

  private static calculateNextRotation(credential: StoredCredential): Date | undefined {
    if (!credential.rotationEnabled || !credential.rotationIntervalDays) {
      return undefined;
    }
    
    const nextRotation = new Date();
    nextRotation.setDate(nextRotation.getDate() + credential.rotationIntervalDays);
    return nextRotation;
  }

  private static logUsage(usage: CredentialUsage): void {
    this.usageLogs.push(usage);
    
    // Keep only last 10000 usage logs
    if (this.usageLogs.length > 10000) {
      this.usageLogs = this.usageLogs.slice(-10000);
    }
  }

  private static logAudit(log: CredentialAuditLog): void {
    this.auditLogs.push(log);
    
    // Keep only last 10000 audit logs
    if (this.auditLogs.length > 10000) {
      this.auditLogs = this.auditLogs.slice(-10000);
    }
  }

  // Encryption helpers (simplified - use proper encryption in production)
  private static encrypt(value: string): string {
    // This is a simple base64 encoding for demo purposes
    // In production, use proper encryption with secure key management
    return Buffer.from(value).toString('base64');
  }

  private static decrypt(encryptedValue: string): string {
    // This is a simple base64 decoding for demo purposes
    return Buffer.from(encryptedValue, 'base64').toString();
  }
}
