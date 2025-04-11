/**
 * Monitoring Service
 * 
 * Provides comprehensive monitoring, logging, and alerting capabilities for the Trading Farm platform
 * Tracks system health, agent performance, trading activities, and critical events
 * 
 * Enhanced features for ElizaOS integration:
 * - Security monitoring and auditing
 * - Smart alert throttling to reduce alert fatigue
 * - Contextual information for better incident response
 * - Event aggregation for pattern detection
 * - Improved error classification and handling
 */
import { createServerClient } from '@/utils/supabase/server';
import { createBrowserClient } from '@/utils/supabase/client';

// Use a more generic type for agents until we have access to the exact type
type ElizaAgent = {
  id: string;
  name: string;
  [key: string]: any;
};

// Counters for metrics
let eventCounter = 0;
let alertCounter = 0;
let errorCounter = 0;
const startTime = new Date();

// Error throttling mechanism
let lastErrorTime = 0;
let errorCount = 0;
const ERROR_THROTTLE_WINDOW = 60000; // 1 minute
const ERROR_THROTTLE_MAX = 5; // Max errors in the window

// Network status tracking
let isOffline = false;
if (typeof window !== 'undefined') {
  // Initialize network status
  isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
  
  // Listen to online/offline events
  window.addEventListener('online', () => {
    isOffline = false;
    console.log('Network connection restored. Monitoring service resumed.');
  });
  
  window.addEventListener('offline', () => {
    isOffline = true;
    console.warn('Network connection lost. Monitoring service paused.');
  });
}

export type MonitoringEventType = 
  // System events
  'system.startup' | 'system.shutdown' | 'system.error' | 'system.warning' | 
  // Agent events
  'agent.created' | 'agent.started' | 'agent.stopped' | 'agent.error' | 
  'agent.success' | 'agent.warning' | 'agent.command' | 'agent.timeout' |
  // Trading events
  'trade.executed' | 'trade.failed' | 'trade.cancelled' | 'trade.timeout' |
  // User events
  'user.login' | 'user.logout' | 'user.action' |
  // Farm events
  'farm.created' | 'farm.updated' | 'farm.deleted' |
  // Market data events
  'market.data_received' | 'market.data_error' | 'market.data_stale' |
  // Security events
  'security.api_key_access' | 'security.api_key_unauthorized' | 'security.login_failed' | 
  'security.permission_denied' | 'security.suspicious_activity' |
  // Custom events
  'custom';

export type MonitoringSeverity = 'debug' | 'info' | 'warning' | 'error' | 'critical';

export interface MonitoringEvent {
  id?: string;
  timestamp: string;
  type: MonitoringEventType;
  severity: MonitoringSeverity;
  level?: MonitoringSeverity; // Alias for severity for compatibility
  subject: string;
  message: string;
  details?: any;
  user_id?: string;
  farm_id?: string;
  agent_id?: string;
  source: string;
  tags?: string[];
  error_type?: 'transient' | 'external_persistent' | 'internal' | 'unknown';
  event_hash?: string; // For de-duplication and aggregation
  related_events?: string[]; // IDs of related events for correlation
  resolution_status?: 'open' | 'acknowledged' | 'resolved' | 'ignored';
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  event_type: MonitoringEventType | 'any';
  severity_threshold: MonitoringSeverity;
  subject_pattern?: string;
  message_pattern?: string;
  conditions?: {
    field: string;
    operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'not_contains';
    value: any;
  }[];
  actions: {
    type: 'email' | 'slack' | 'webhook' | 'in_app';
    config: any;
  }[];
  is_active: boolean;
  cooldown_minutes: number;
  last_triggered_at?: string;
  owner_id: string;
  scope: 'user' | 'farm' | 'system';
  throttling?: {
    max_alerts_per_hour?: number;
    max_alerts_per_day?: number;
    group_similar_events?: boolean;
    silence_period_minutes?: number;
  };
  error_types?: Array<'transient' | 'external_persistent' | 'internal' | 'unknown'>;
  context_enrichment?: {
    include_recent_events?: boolean;
    include_system_status?: boolean;
    include_agent_metrics?: boolean;
  };
}

export interface SystemStatus {
  overall_health: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    [key: string]: {
      status: 'operational' | 'degraded' | 'down';
      last_checked: string;
      details?: string;
    };
  };
  active_alerts: number;
  unresolved_errors: number;
  active_agents: number;
  system_load: number;
  uptime_seconds: number;
  last_updated: string;
}

/**
 * Service for monitoring, logging, and alerting
 */
export class MonitoringService {
  // Keep track of alert rates for throttling
  private static alertCounts: Record<string, { hourly: number; daily: number; lastTriggered: Date }> = {};
  
  /**
   * Check if error logging should be throttled
   */
  private static shouldThrottleError(): boolean {
    const now = Date.now();
    // Reset counter if outside throttle window
    if (now - lastErrorTime > ERROR_THROTTLE_WINDOW) {
      errorCount = 0;
      lastErrorTime = now;
      return false;
    }
    
    // Increment counter and check if we should throttle
    errorCount++;
    return errorCount > ERROR_THROTTLE_MAX;
  }

  /**
   * Format error for logging in a safe way
   * Handles empty error objects that cause "Error in logEvent: {}" messages
   */
  private static formatError(error: any): string {
    if (!error) return 'Unknown error (null or undefined)';
    
    // If error is an empty object
    if (typeof error === 'object' && Object.keys(error).length === 0) {
      return 'Empty error object - likely a network or connection issue';
    }
    
    // If error has a message property
    if (error.message) return error.message;
    
    // If error is a string
    if (typeof error === 'string') return error;
    
    // Fallback: stringify the error object
    try {
      return JSON.stringify(error);
    } catch (e) {
      return 'Error object could not be stringified';
    }
  }

  /**
   * Check if system is offline
   */
  private static isSystemOffline(): boolean {
    return typeof window !== 'undefined' && isOffline;
  }

  /**
   * Log a monitoring event
   */
  static async logEvent(
    eventData: Omit<MonitoringEvent, 'id' | 'timestamp'> & {
      level?: MonitoringSeverity;
      subject?: string; 
      source?: string;
    },
    isServerSide = true
  ): Promise<string | null> {
    // Skip logging if data is invalid
    if (!eventData || typeof eventData !== 'object') {
      return null;
    }
    
    // Skip logging if offline and in browser
    if (!isServerSide && this.isSystemOffline()) {
      return null;
    }
    try {
      const supabase = isServerSide 
        ? await createServerClient()
        : createBrowserClient();
      
      const timestamp = new Date().toISOString();
      
      // Prepare the event object with default values and handle level/severity compatibility
      const event: MonitoringEvent = {
        timestamp,
        severity: eventData.level || eventData.severity || 'info',
        type: eventData.type,
        subject: eventData.subject || 'System Event',
        message: eventData.message,
        details: eventData.details,
        source: eventData.source || 'system',
        user_id: eventData.user_id,
        farm_id: eventData.farm_id,
        agent_id: eventData.agent_id,
        tags: eventData.tags,
        error_type: eventData.error_type,
        event_hash: this.generateEventHash(eventData)
      };
      
      // Track counts by severity
      eventCounter++;
      if (event.severity === 'error' || event.severity === 'critical') {
        errorCounter++;
      }
      
      // Store event in database
      const { data, error } = await supabase
        .from('monitoring_events')
        .insert(event)
        .select('id')
        .single();
      
      if (error) {
        // Only log error if not being throttled
        if (!this.shouldThrottleError()) {
          const formattedError = this.formatError(error);
          console.warn('Error logging monitoring event:', formattedError);
        }
        return null;
      }
      
      // Process alerts
      this.processAlerts({
        id: data.id,
        ...event,
        timestamp
      }, isServerSide).catch(err => {
        console.error('Error processing alerts:', err);
        errorCounter++;
      });
      
      return data.id;
    } catch (error) {
      console.error('Error in logEvent:', error);
      errorCounter++;
      // Fallback to console logging
      console.log(`MONITORING EVENT [${eventData.severity || eventData.level || 'info'}] ${eventData.type}: ${eventData.message}`, eventData);
      return null;
    }
  }
  
  /**
   * Log system event
   */
  static async logSystemEvent(
    type: 'system.startup' | 'system.shutdown' | 'system.error' | 'system.warning',
    message: string,
    details?: any,
    severity: MonitoringSeverity = 'info',
    isServerSide = true
  ): Promise<string | null> {
    return this.logEvent({
      type,
      severity,
      subject: 'System',
      message,
      details,
      source: 'system',
      tags: ['system', type.split('.')[1]]
    }, isServerSide);
  }
  
  /**
   * Log agent event
   */
  static async logAgentEvent(
    agent: ElizaAgent | string,
    type: 'agent.created' | 'agent.started' | 'agent.stopped' | 'agent.error' | 'agent.success' | 'agent.warning' | 'agent.command' | 'agent.timeout',
    message: string,
    details?: any,
    severity: MonitoringSeverity = 'info',
    isServerSide = true
  ): Promise<string | null> {
    const agentId = typeof agent === 'string' ? agent : agent.id;
    const agentName = typeof agent === 'string' ? `Agent ${agent}` : agent.name;
    
    return this.logEvent({
      type,
      severity,
      subject: agentName,
      message,
      details,
      agent_id: agentId,
      source: 'agent',
      tags: ['agent', type.split('.')[1]]
    }, isServerSide);
  }
  
  /**
   * Log trade event
   */
  static async logTradeEvent(
    type: 'trade.executed' | 'trade.failed' | 'trade.cancelled' | 'trade.timeout',
    symbol: string,
    tradeData: any,
    agentId?: string,
    userId?: string,
    farmId?: string,
    isServerSide = true
  ): Promise<string | null> {
    return this.logEvent({
      type,
      severity: type === 'trade.executed' ? 'info' : 'warning',
      subject: `Trade ${symbol}`,
      message: `${type.split('.')[1].toUpperCase()} trade for ${symbol}`,
      details: tradeData,
      agent_id: agentId,
      user_id: userId,
      farm_id: farmId,
      source: 'trade',
      tags: ['trade', type.split('.')[1], symbol]
    }, isServerSide);
  }

  /**
   * Get monitoring events with filtering
   */
  static async getEvents(
    filters: {
      types?: MonitoringEventType[];
      severities?: MonitoringSeverity[];
      startTime?: Date;
      endTime?: Date;
      userId?: string;
      farmId?: string;
      agentId?: string;
      search?: string;
      tags?: string[];
      limit?: number;
      offset?: number;
    } = {},
    isServerSide = true
  ): Promise<{ events: MonitoringEvent[]; total: number }> {
    try {
      const supabase = isServerSide 
        ? await createServerClient()
        : createBrowserClient();
      
      let query = supabase
        .from('monitoring_events')
        .select('*', { count: 'exact' });
      
      // Apply filters
      if (filters.types && filters.types.length > 0) {
        query = query.in('type', filters.types);
      }
      
      if (filters.severities && filters.severities.length > 0) {
        query = query.in('severity', filters.severities);
      }
      
      if (filters.startTime) {
        query = query.gte('timestamp', filters.startTime.toISOString());
      }
      
      if (filters.endTime) {
        query = query.lte('timestamp', filters.endTime.toISOString());
      }
      
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      
      if (filters.farmId) {
        query = query.eq('farm_id', filters.farmId);
      }
      
      if (filters.agentId) {
        query = query.eq('agent_id', filters.agentId);
      }
      
      if (filters.search) {
        query = query.or(`message.ilike.%${filters.search}%,subject.ilike.%${filters.search}%`);
      }
      
      if (filters.tags && filters.tags.length > 0) {
        // This assumes 'tags' is an array column in Postgres
        // For each tag, we check if it's contained in the tags array
        filters.tags.forEach(tag => {
          query = query.contains('tags', [tag]);
        });
      }
      
      // Add pagination
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      query = query.order('timestamp', { ascending: false }).range(offset, offset + limit - 1);
      
      const { data, error, count } = await query;
      
      if (error) {
        console.error('Error fetching monitoring events:', error);
        return { events: [], total: 0 };
      }
      
      return {
        events: data as MonitoringEvent[],
        total: count || 0
      };
    } catch (error) {
      console.error('Error in getEvents:', error);
      return { events: [], total: 0 };
    }
  }

  /**
   * Determine if an event should be processed for alerts (for throttling/deduplication)
   */
  private static shouldProcessForAlerts(event: MonitoringEvent): boolean {
    // Always process critical events
    if (event.severity === 'critical') return true;
    
    // Skip processing for events that are already resolved or ignored
    if (event.resolution_status === 'resolved' || event.resolution_status === 'ignored') {
      return false;
    }
    
    // Check for duplicate events in the last minute (basic deduplication)
    // In a real implementation, this would check the database
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    // This is a simplified implementation. In a real system, you'd query the DB
    // for similar events based on the event_hash within the last 5 minutes
    // and decide whether to process this one or not
    
    return true;
  }
  
  /**
   * Generate a hash for event deduplication
   */
  private static generateEventHash(event: Partial<MonitoringEvent>): string {
    // Create a string that uniquely identifies this type of event
    const hashBase = `${event.type}:${event.source}:${event.subject}:${event.message}`;
    
    // Use a simple hash function
    let hash = 0;
    for (let i = 0; i < hashBase.length; i++) {
      const char = hashBase.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return hash.toString(16);
  }
  
  /**
   * Process alerts for an event
   */
  static async processAlerts(
    event: MonitoringEvent,
    isServerSide = true
  ): Promise<void> {
    try {
      const supabase = isServerSide 
        ? await createServerClient()
        : createBrowserClient();
      
      // Get active alert rules that match the event
      const { data: rules, error } = await supabase
        .from('alert_rules')
        .select('*')
        .eq('is_active', true)
        .or(`event_type.eq.${event.type},event_type.eq.any`);
      
      if (error) {
        console.error('Error fetching alert rules:', error);
        errorCounter++;
        return;
      }
      
      if (!rules || rules.length === 0) {
        return; // No matching rules
      }
      
      // Process each rule
      for (const rule of rules as AlertRule[]) {
        // Check if rule should trigger based on event criteria
        if (this.evaluateAlertRule(rule, event)) {
          // Check cooldown period
          const now = new Date();
          if (rule.last_triggered_at) {
            const lastTriggered = new Date(rule.last_triggered_at);
            const cooldownMinutes = rule.cooldown_minutes || 15; // Default: 15 minutes
            const cooldownMs = cooldownMinutes * 60 * 1000;
            
            if (now.getTime() - lastTriggered.getTime() < cooldownMs) {
              continue; // Skip this rule, it's still in cooldown
            }
          }
          
          // Update last triggered time
          await supabase
            .from('alert_rules')
            .update({ last_triggered_at: now.toISOString() })
            .eq('id', rule.id);
          
          // Execute alert actions
          await this.executeAlertActions(rule, event);
          
          // Increment alert counter for metrics
          alertCounter++;
        }
      }
    } catch (error) {
      console.error('Error processing alerts:', error);
      errorCounter++;
    }
  }

  /**
   * Evaluate if an alert rule should trigger for an event
   */
  private static evaluateAlertRule(rule: AlertRule, event: MonitoringEvent): boolean {
    // Check event type
    if (rule.event_type !== 'any' && rule.event_type !== event.type) {
      return false;
    }
    
    // Check severity threshold
    const severityLevels: { [key in MonitoringSeverity]: number } = {
      'debug': 0,
      'info': 1,
      'warning': 2,
      'error': 3,
      'critical': 4
    };
    
    if (severityLevels[event.severity] < severityLevels[rule.severity_threshold]) {
      return false;
    }
    
    // Check error types if specified
    if (rule.error_types && rule.error_types.length > 0 && event.error_type) {
      if (!rule.error_types.includes(event.error_type)) {
        return false;
      }
    }
    
    // Check subject pattern
    if (rule.subject_pattern && !new RegExp(rule.subject_pattern).test(event.subject)) {
      return false;
    }
    
    // Check message pattern
    if (rule.message_pattern && !new RegExp(rule.message_pattern).test(event.message)) {
      return false;
    }
    
    // Check custom conditions
    if (rule.conditions && rule.conditions.length > 0) {
      for (const condition of rule.conditions) {
        const { field, operator, value } = condition;
        
        // Handle nested fields using dot notation (e.g., "details.api_status")
        let fieldValue: any = event;
        
        // Handle nested fields
        const fieldParts = field.split('.');
        for (const part of fieldParts) {
          if (fieldValue === undefined || fieldValue === null) {
            break;
          }
          fieldValue = fieldValue[part];
        }
        
        // Skip condition if field doesn't exist
        if (fieldValue === undefined) {
          continue;
        }
        
        // Evaluate condition
        switch (operator) {
          case 'eq':
            if (fieldValue !== value) return false;
            break;
          case 'neq':
            if (fieldValue === value) return false;
            break;
          case 'gt':
            if (typeof fieldValue !== 'number' || fieldValue <= value) return false;
            break;
          case 'lt':
            if (typeof fieldValue !== 'number' || fieldValue >= value) return false;
            break;
          case 'contains':
            if (typeof fieldValue !== 'string' || !fieldValue.includes(value)) return false;
            break;
          case 'not_contains':
            if (typeof fieldValue === 'string' && fieldValue.includes(value)) return false;
            break;
        }
      }
    }
    
    // All checks passed
    return true;
  }
  
  /**
   * Execute alert actions based on the rule configuration
   */
  private static async executeAlertActions(rule: AlertRule, event: MonitoringEvent): Promise<void> {
    for (const action of rule.actions) {
      try {
        switch (action.type) {
          case 'email':
            await this.sendEmailAlert(rule, event, action.config);
            break;
          case 'slack':
            await this.sendSlackAlert(rule, event, action.config);
            break;
          case 'webhook':
            await this.sendWebhookAlert(rule, event, action.config);
            break;
          case 'in_app':
            await this.createInAppAlert(rule, event, action.config);
            break;
        }
      } catch (error) {
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'Unknown error';
        
        console.error(`Error executing alert action ${action.type}:`, errorMessage);
        errorCounter++;
      }
    }
  }
  
  /**
   * Send email alert
   */
  private static async sendEmailAlert(rule: AlertRule, event: MonitoringEvent, config: any): Promise<void> {
    // In a production environment, this would use an email service like SendGrid, Mailgun, etc.
    console.log(`[Email Alert] Rule "${rule.name}" to ${config.recipients?.join(', ') || 'admin'}: ${event.message}`);
    
    // Example implementation with Supabase Edge Function
    const supabase = await createServerClient();
    await supabase.functions.invoke('send-alert-email', {
      body: {
        rule: {
          id: rule.id,
          name: rule.name,
          description: rule.description
        },
        event: {
          id: event.id,
          type: event.type,
          severity: event.severity,
          subject: event.subject,
          message: event.message,
          timestamp: event.timestamp
        },
        recipients: config.recipients || [],
        template: config.template || 'default'
      }
    });
  }
  
  /**
   * Send Slack alert
   */
  private static async sendSlackAlert(rule: AlertRule, event: MonitoringEvent, config: any): Promise<void> {
    if (!config.webhook_url) {
      console.error('Missing Slack webhook URL for alert action');
      return;
    }
    
    // Basic Slack webhook implementation
    const payload = {
      text: `*ALERT: ${rule.name}*`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `⚠️ Alert: ${rule.name}`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Type:*\n${event.type}`
            },
            {
              type: 'mrkdwn',
              text: `*Severity:*\n${event.severity.toUpperCase()}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Subject:* ${event.subject}\n*Message:* ${event.message}`
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Triggered at ${new Date(event.timestamp).toLocaleString()}`
            }
          ]
        }
      ]
    };
    
    await fetch(config.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }
  
  /**
   * Send webhook alert
   */
  private static async sendWebhookAlert(rule: AlertRule, event: MonitoringEvent, config: any): Promise<void> {
    // Skip if system is offline
    if (this.isSystemOffline()) {
      return;
    }
    
    if (!config.url) {
      console.warn('Missing webhook URL for alert action');
      return;
    }
    
    const payload = {
      rule: {
        id: rule.id,
        name: rule.name,
        description: rule.description
      },
      event: {
        id: event.id,
        type: event.type,
        severity: event.severity,
        subject: event.subject,
        message: event.message,
        timestamp: event.timestamp,
        source: event.source
      },
      timestamp: new Date().toISOString()
    };
    
    try {
      await fetch(config.url, {
        method: config.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.headers || {})
        },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      // Only log error if not being throttled
      if (!this.shouldThrottleError()) {
        // Provide more detailed error message using our formatter
        const errorMsg = this.formatError(error);
        console.warn('Error in monitoring service:', errorMsg);
      }
      // Don't return anything from this void function
    }
  }
  
  /**
   * Create in-app alert
   */
  private static async createInAppAlert(rule: AlertRule, event: MonitoringEvent, config: any): Promise<void> {
    const supabase = await createServerClient();
    
    await supabase
      .from('user_notifications')
      .insert({
        user_id: config.user_id || rule.owner_id,
        title: `Alert: ${rule.name}`,
        message: event.message,
        data: {
          event_id: event.id,
          rule_id: rule.id,
          type: event.type,
          severity: event.severity,
          subject: event.subject
        },
        read: false,
        created_at: new Date().toISOString()
      });
  }
  
  /**
   * Get system status
   */
  static async getSystemStatus(isServerSide = true): Promise<SystemStatus> {
    try {
      const supabase = isServerSide
        ? await createServerClient()
        : createBrowserClient();
      
      // Get component statuses
      const { data: statusData, error: statusError } = await supabase
        .from('system_status')
        .select('*')
        .single();
      
      if (statusError || !statusData) {
        console.error('Error fetching system status:', statusError);
        return this.generateFallbackStatus();
      }
      
      return statusData as SystemStatus;
    } catch (error) {
      console.error('Error in getSystemStatus:', error);
      return this.generateFallbackStatus();
    }
  }
  
  /**
   * Generate fallback status when status fetch fails
   */
  private static generateFallbackStatus(): SystemStatus {
    return {
      overall_health: 'degraded',
      components: {
        database: {
          status: 'degraded',
          last_checked: new Date().toISOString(),
          details: 'Status unknown - fallback mode'
        },
        api: {
          status: 'operational',
          last_checked: new Date().toISOString()
        },
        agents: {
          status: 'degraded', // Changed from 'unknown' to valid enum value
          last_checked: new Date().toISOString(),
          details: 'Status unknown - fallback mode'
        }
      },
      active_alerts: 0,
      unresolved_errors: 0,
      active_agents: 0,
      system_load: 0,
      uptime_seconds: 0,
      last_updated: new Date().toISOString()
    };
  }
  
  /**
   * Get monitoring service metrics
   */
  static getMetrics(): { eventCount: number; alertCount: number; errorCount: number; uptime: number } {
    const uptime = (new Date().getTime() - startTime.getTime()) / 1000;
    return {
      eventCount: eventCounter,
      alertCount: alertCounter,
      errorCount: errorCounter,
      uptime
    };
  }
  
  /**
   * Reset metrics counters (useful for testing)
   */
  static resetMetrics(): void {
    eventCounter = 0;
    alertCounter = 0;
    errorCounter = 0;
  }
}

// Export singleton instance
export const monitoringService = MonitoringService;
