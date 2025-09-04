// Integration Engine for Webhooks, Third-Party Services, and API Gateway
// Provides comprehensive integration capabilities for external systems

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers: Record<string, string>;
  events: string[];
  active: boolean;
  retryCount: number;
  timeout: number;
  secret?: string;
  filters?: Record<string, any>;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: any;
  timestamp: Date;
  source: string;
  metadata?: Record<string, any>;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventId: string;
  status: 'pending' | 'delivered' | 'failed' | 'retrying';
  attempts: number;
  lastAttempt: Date;
  nextRetry?: Date;
  response?: {
    status: number;
    headers: Record<string, string>;
    body: string;
  };
  error?: string;
}

export interface ThirdPartyIntegration {
  id: string;
  name: string;
  type: 'slack' | 'discord' | 'teams' | 'email' | 'sms' | 'webhook' | 'api';
  config: Record<string, any>;
  active: boolean;
  lastSync: Date;
  syncInterval: number; // in minutes
}

export interface APIGatewayConfig {
  baseUrl: string;
  version: string;
  rateLimit: {
    requests: number;
    window: number; // in seconds
  };
  authentication: {
    type: 'none' | 'api_key' | 'oauth' | 'jwt';
    config: Record<string, any>;
  };
  endpoints: Array<{
    path: string;
    method: string;
    description: string;
    parameters: any[];
    response: any;
  }>;
}

export interface IntegrationMetrics {
  webhookDeliveries: number;
  webhookFailures: number;
  apiRequests: number;
  apiErrors: number;
  averageResponseTime: number;
  activeIntegrations: number;
}

export class IntegrationEngine {
  private static instance: IntegrationEngine;
  private webhooks: Map<string, WebhookConfig> = new Map();
  private webhookDeliveries: Map<string, WebhookDelivery> = new Map();
  private integrations: Map<string, ThirdPartyIntegration> = new Map();
  private apiGateway!: APIGatewayConfig;
  private metrics!: IntegrationMetrics;
  private eventQueue: WebhookEvent[] = [];
  private isProcessing: boolean = false;

  private constructor() {
    this.initializeAPIGateway();
    this.initializeMetrics();
    this.startEventProcessor();
    this.loadDefaultIntegrations();
  }

  static getInstance(): IntegrationEngine {
    if (!IntegrationEngine.instance) {
      IntegrationEngine.instance = new IntegrationEngine();
    }
    return IntegrationEngine.instance;
  }

  private initializeAPIGateway(): void {
    this.apiGateway = {
      baseUrl: '/api/v1',
      version: '1.0.0',
      rateLimit: {
        requests: 1000,
        window: 3600 // 1 hour
      },
      authentication: {
        type: 'api_key',
        config: {
          headerName: 'X-API-Key',
          required: true
        }
      },
      endpoints: [
        {
          path: '/search',
          method: 'POST',
          description: 'Perform advanced search',
          parameters: [
            { name: 'query', type: 'string', required: true },
            { name: 'filters', type: 'object', required: false },
            { name: 'limit', type: 'number', required: false }
          ],
          response: {
            results: 'array',
            total: 'number',
            suggestions: 'array'
          }
        },
        {
          path: '/analytics',
          method: 'GET',
          description: 'Get search analytics',
          parameters: [
            { name: 'period', type: 'string', required: false },
            { name: 'metrics', type: 'array', required: false }
          ],
          response: {
            metrics: 'object',
            trends: 'array'
          }
        },
        {
          path: '/webhooks',
          method: 'GET',
          description: 'List webhooks',
          parameters: [],
          response: {
            webhooks: 'array'
          }
        }
      ]
    };
  }

  private initializeMetrics(): void {
    this.metrics = {
      webhookDeliveries: 0,
      webhookFailures: 0,
      apiRequests: 0,
      apiErrors: 0,
      averageResponseTime: 0,
      activeIntegrations: 0
    };
  }

  private loadDefaultIntegrations(): void {
    // Load default webhook configurations
    const defaultWebhooks: WebhookConfig[] = [
      {
        id: 'search_analytics',
        name: 'Search Analytics Webhook',
        url: 'https://analytics.example.com/webhook/search',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'QueryFlow-Webhook/1.0'
        },
        events: ['search.completed', 'search.failed'],
        active: true,
        retryCount: 3,
        timeout: 5000
      },
      {
        id: 'user_notifications',
        name: 'User Notifications',
        url: 'https://notifications.example.com/webhook',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        events: ['user.search', 'user.saved_search'],
        active: true,
        retryCount: 2,
        timeout: 3000
      }
    ];

    defaultWebhooks.forEach(webhook => {
      this.webhooks.set(webhook.id, webhook);
    });

    // Load default third-party integrations
    const defaultIntegrations: ThirdPartyIntegration[] = [
      {
        id: 'slack_notifications',
        name: 'Slack Notifications',
        type: 'slack',
        config: {
          webhookUrl: 'https://hooks.slack.com/services/...',
          channel: '#search-alerts',
          username: 'QueryFlow Bot'
        },
        active: false,
        lastSync: new Date(),
        syncInterval: 60
      },
      {
        id: 'email_reports',
        name: 'Email Reports',
        type: 'email',
        config: {
          smtp: {
            host: 'smtp.example.com',
            port: 587,
            secure: false,
            auth: {
              user: 'noreply@example.com',
              pass: 'password'
            }
          },
          from: 'noreply@example.com',
          to: ['admin@example.com']
        },
        active: false,
        lastSync: new Date(),
        syncInterval: 1440 // 24 hours
      }
    ];

    defaultIntegrations.forEach(integration => {
      this.integrations.set(integration.id, integration);
    });
  }

  private startEventProcessor(): void {
    setInterval(() => {
      this.processEventQueue();
    }, 1000); // Process events every second
  }

  private async processEventQueue(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) return;

    this.isProcessing = true;
    const event = this.eventQueue.shift();
    if (event) {
      await this.deliverWebhookEvent(event);
    }
    this.isProcessing = false;
  }

  // Webhook management
  createWebhook(config: Omit<WebhookConfig, 'id'>): WebhookConfig {
    const webhook: WebhookConfig = {
      id: `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...config
    };
    
    this.webhooks.set(webhook.id, webhook);
    this.metrics.activeIntegrations = this.webhooks.size + this.integrations.size;
    
    return webhook;
  }

  updateWebhook(id: string, updates: Partial<WebhookConfig>): WebhookConfig | null {
    const webhook = this.webhooks.get(id);
    if (webhook) {
      const updatedWebhook = { ...webhook, ...updates };
      this.webhooks.set(id, updatedWebhook);
      return updatedWebhook;
    }
    return null;
  }

  deleteWebhook(id: string): boolean {
    return this.webhooks.delete(id);
  }

  getWebhook(id: string): WebhookConfig | null {
    return this.webhooks.get(id) || null;
  }

  getWebhooks(): WebhookConfig[] {
    return Array.from(this.webhooks.values());
  }

  // Event handling
  emitEvent(event: Omit<WebhookEvent, 'id' | 'timestamp'>): void {
    const webhookEvent: WebhookEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...event
    };

    // Add to event queue
    this.eventQueue.push(webhookEvent);

    // Find matching webhooks
    const matchingWebhooks = this.getWebhooks().filter(webhook => 
      webhook.active && webhook.events.includes(event.type)
    );

    // Create delivery records
    matchingWebhooks.forEach(webhook => {
      const delivery: WebhookDelivery = {
        id: `delivery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        webhookId: webhook.id,
        eventId: webhookEvent.id,
        status: 'pending',
        attempts: 0,
        lastAttempt: new Date()
      };
      
      this.webhookDeliveries.set(delivery.id, delivery);
    });
  }

  private async deliverWebhookEvent(event: WebhookEvent): Promise<void> {
    const deliveries = Array.from(this.webhookDeliveries.values())
      .filter(delivery => delivery.eventId === event.id && delivery.status === 'pending');

    for (const delivery of deliveries) {
      await this.deliverWebhook(delivery, event);
    }
  }

  private async deliverWebhook(delivery: WebhookDelivery, event: WebhookEvent): Promise<void> {
    const webhook = this.webhooks.get(delivery.webhookId);
    if (!webhook) return;

    delivery.attempts++;
    delivery.lastAttempt = new Date();
    delivery.status = 'retrying';

    try {
      const payload = {
        event: {
          id: event.id,
          type: event.type,
          timestamp: event.timestamp,
          source: event.source
        },
        data: event.data,
        metadata: event.metadata
      };

      const response = await this.makeWebhookRequest(webhook, payload);
      
      delivery.status = 'delivered';
      delivery.response = {
        status: response.status,
        headers: response.headers,
        body: response.body
      };
      
      this.metrics.webhookDeliveries++;
      
    } catch (error: any) {
      delivery.error = error.message;
      
      if (delivery.attempts < webhook.retryCount) {
        delivery.status = 'retrying';
        delivery.nextRetry = new Date(Date.now() + Math.pow(2, delivery.attempts) * 1000); // Exponential backoff
      } else {
        delivery.status = 'failed';
        this.metrics.webhookFailures++;
      }
    }

    this.webhookDeliveries.set(delivery.id, delivery);
  }

  private async makeWebhookRequest(webhook: WebhookConfig, payload: any): Promise<{
    status: number;
    headers: Record<string, string>;
    body: string;
  }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), webhook.timeout);

    try {
      const response = await fetch(webhook.url, {
        method: webhook.method,
        headers: {
          ...webhook.headers,
          ...(webhook.secret && { 'X-Webhook-Signature': this.generateSignature(payload, webhook.secret) })
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseBody = await response.text();
      
      return {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseBody
      };
    } catch (error: any) {
      clearTimeout(timeoutId);
      throw new Error(`Webhook delivery failed: ${error.message}`);
    }
  }

  private generateSignature(payload: any, secret: string): string {
    // Simple HMAC signature generation (in production, use proper crypto library)
    const data = JSON.stringify(payload);
    return btoa(data + secret); // Simplified for demo
  }

  // Third-party integrations
  createIntegration(config: Omit<ThirdPartyIntegration, 'id'>): ThirdPartyIntegration {
    const integration: ThirdPartyIntegration = {
      id: `integration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...config
    };
    
    this.integrations.set(integration.id, integration);
    this.metrics.activeIntegrations = this.webhooks.size + this.integrations.size;
    
    return integration;
  }

  updateIntegration(id: string, updates: Partial<ThirdPartyIntegration>): ThirdPartyIntegration | null {
    const integration = this.integrations.get(id);
    if (integration) {
      const updatedIntegration = { ...integration, ...updates };
      this.integrations.set(id, updatedIntegration);
      return updatedIntegration;
    }
    return null;
  }

  deleteIntegration(id: string): boolean {
    return this.integrations.delete(id);
  }

  getIntegration(id: string): ThirdPartyIntegration | null {
    return this.integrations.get(id) || null;
  }

  getIntegrations(): ThirdPartyIntegration[] {
    return Array.from(this.integrations.values());
  }

  // Integration actions
  async sendSlackNotification(integrationId: string, message: string, channel?: string): Promise<boolean> {
    const integration = this.integrations.get(integrationId);
    if (!integration || integration.type !== 'slack' || !integration.active) {
      return false;
    }

    try {
      const payload = {
        text: message,
        channel: channel || integration.config.channel,
        username: integration.config.username
      };

      const response = await fetch(integration.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      return response.ok;
    } catch (error) {
      console.error('Slack notification failed:', error);
      return false;
    }
  }

  async sendEmailReport(integrationId: string, subject: string, content: string): Promise<boolean> {
    const integration = this.integrations.get(integrationId);
    if (!integration || integration.type !== 'email' || !integration.active) {
      return false;
    }

    try {
      // In a real implementation, you would use an email service
      console.log(`Email sent to ${integration.config.to.join(', ')}: ${subject}`);
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }

  // API Gateway
  getAPIGatewayConfig(): APIGatewayConfig {
    return { ...this.apiGateway };
  }

  updateAPIGatewayConfig(updates: Partial<APIGatewayConfig>): void {
    this.apiGateway = { ...this.apiGateway, ...updates };
  }

  // Metrics and monitoring
  getMetrics(): IntegrationMetrics {
    return { ...this.metrics };
  }

  getWebhookDeliveries(): WebhookDelivery[] {
    return Array.from(this.webhookDeliveries.values());
  }

  getWebhookDelivery(id: string): WebhookDelivery | null {
    return this.webhookDeliveries.get(id) || null;
  }

  // Utility methods
  testWebhook(webhookId: string): Promise<boolean> {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) return Promise.resolve(false);

    const testEvent: WebhookEvent = {
      id: 'test_event',
      type: 'test',
      data: { message: 'Test webhook delivery' },
      timestamp: new Date(),
      source: 'test'
    };

    return this.makeWebhookRequest(webhook, testEvent)
      .then(() => true)
      .catch(() => false);
  }

  retryFailedWebhook(deliveryId: string): void {
    const delivery = this.webhookDeliveries.get(deliveryId);
    if (delivery && delivery.status === 'failed') {
      delivery.status = 'pending';
      delivery.attempts = 0;
      delivery.nextRetry = undefined;
      this.webhookDeliveries.set(deliveryId, delivery);
    }
  }

  clearOldDeliveries(olderThanDays: number = 30): void {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    
    for (const [id, delivery] of this.webhookDeliveries.entries()) {
      if (delivery.lastAttempt < cutoffDate) {
        this.webhookDeliveries.delete(id);
      }
    }
  }

  // Export/Import
  exportConfiguration(): string {
    return JSON.stringify({
      webhooks: Array.from(this.webhooks.entries()),
      integrations: Array.from(this.integrations.entries()),
      apiGateway: this.apiGateway
    }, null, 2);
  }

  importConfiguration(configJson: string): boolean {
    try {
      const data = JSON.parse(configJson);
      
      if (data.webhooks) {
        this.webhooks = new Map(data.webhooks);
      }
      
      if (data.integrations) {
        this.integrations = new Map(data.integrations);
      }
      
      if (data.apiGateway) {
        this.apiGateway = data.apiGateway;
      }
      
      this.metrics.activeIntegrations = this.webhooks.size + this.integrations.size;
      
      return true;
    } catch (error) {
      console.error('Failed to import configuration:', error);
      return false;
    }
  }
}

// Export singleton instance
export const integrationEngine = IntegrationEngine.getInstance();
