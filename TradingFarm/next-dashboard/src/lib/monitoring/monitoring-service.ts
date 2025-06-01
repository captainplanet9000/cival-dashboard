/**
 * Comprehensive Monitoring & Alerting Service
 * 
 * Provides real-time monitoring, alerting, and health tracking
 * for the Trading Farm platform.
 */

import { createServerClient } from '@/utils/supabase/server';
import { createBrowserClient } from '@/utils/supabase/client';

// Metric types for monitoring
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  TIMER = 'timer'
}

// Alert severity levels
export enum AlertSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info'
}

// Metric definition interface
export interface MetricDefinition {
  name: string;
  description: string;
  type: MetricType;
  labels?: string[];
}

// Alert definition interface
export interface AlertDefinition {
  name: string;
  description: string;
  metricName: string;
  condition: string;
  severity: AlertSeverity;
  thresholds: {
    critical?: number;
    high?: number;
    medium?: number;
    low?: number;
  };
  cooldownPeriod?: number; // seconds
  notificationChannels?: string[];
}

// Alert instance interface
export interface Alert {
  id: string;
  name: string;
  severity: AlertSeverity;
  message: string;
  metricName?: string;
  metricValue?: number;
  timestamp: string;
  acknowledged: boolean;
}

// Dashboard definition
export interface Dashboard {
  id: string;
  name: string;
  description: string;
  panels: DashboardPanel[];
}

// Dashboard panel interface
export interface DashboardPanel {
  id: string;
  title: string;
  type: 'graph' | 'stat' | 'table' | 'gauge' | 'heatmap';
  metrics: string[];
  options?: Record<string, any>;
}

/**
 * Monitoring service for Trading Farm platform
 */
export class MonitoringService {
  private supabase: any;
  private isServer: boolean;
  private userId: string | null = null;
  private metrics: Map<string, MetricDefinition> = new Map();
  private alerts: Map<string, AlertDefinition> = new Map();
  private metricValues: Map<string, Map<string, number>> = new Map();
  private lastAlertTime: Map<string, number> = new Map();
  
  // Subscriber callbacks
  private metricSubscribers: Map<string, Set<(value: number, labels?: Record<string, string>) => void>> = new Map();
  private alertSubscribers: Set<(alert: Alert) => void> = new Set();
  
  constructor(
    userId?: string,
    isServer = typeof window === 'undefined'
  ) {
    this.userId = userId || null;
    this.isServer = isServer;
    
    // Initialize Supabase client based on environment
    if (this.isServer) {
      // Will be initialized when needed with createServerClient
      this.supabase = null;
    } else {
      this.supabase = createBrowserClient();
    }
    
    // Initialize with standard metrics
    this.initializeStandardMetrics();
    this.initializeStandardAlerts();
  }
  
  /**
   * Initialize the Supabase client on server
   */
  private async initializeServerClient() {
    if (this.isServer && !this.supabase) {
      this.supabase = await createServerClient();
    }
  }
  
  /**
   * Initialize standard metrics for Trading Farm
   */
  private initializeStandardMetrics() {
    const standardMetrics: MetricDefinition[] = [
      // System metrics
      {
        name: 'system_cpu_usage',
        description: 'CPU usage percentage',
        type: MetricType.GAUGE
      },
      {
        name: 'system_memory_usage',
        description: 'Memory usage in MB',
        type: MetricType.GAUGE
      },
      {
        name: 'api_request_count',
        description: 'Total API request count',
        type: MetricType.COUNTER,
        labels: ['endpoint', 'method', 'status']
      },
      {
        name: 'api_request_duration',
        description: 'API request duration in ms',
        type: MetricType.HISTOGRAM,
        labels: ['endpoint', 'method']
      },
      
      // Trading metrics
      {
        name: 'order_count',
        description: 'Number of orders placed',
        type: MetricType.COUNTER,
        labels: ['exchange', 'symbol', 'order_type', 'side']
      },
      {
        name: 'order_value',
        description: 'Total value of orders placed',
        type: MetricType.COUNTER,
        labels: ['exchange', 'symbol', 'currency']
      },
      {
        name: 'order_execution_time',
        description: 'Time to execute orders in ms',
        type: MetricType.HISTOGRAM,
        labels: ['exchange', 'symbol', 'order_type']
      },
      
      // Agent metrics
      {
        name: 'active_agents',
        description: 'Number of active trading agents',
        type: MetricType.GAUGE
      },
      {
        name: 'agent_trades',
        description: 'Number of trades executed by agents',
        type: MetricType.COUNTER,
        labels: ['agent_id', 'strategy']
      },
      {
        name: 'agent_pnl',
        description: 'Agent profit and loss',
        type: MetricType.GAUGE,
        labels: ['agent_id', 'strategy', 'timeframe']
      },
      
      // Exchange metrics
      {
        name: 'exchange_latency',
        description: 'Exchange API latency in ms',
        type: MetricType.GAUGE,
        labels: ['exchange', 'endpoint']
      },
      {
        name: 'exchange_api_errors',
        description: 'Exchange API error count',
        type: MetricType.COUNTER,
        labels: ['exchange', 'error_type']
      },
      
      // User metrics
      {
        name: 'active_users',
        description: 'Number of active users',
        type: MetricType.GAUGE
      },
      {
        name: 'user_actions',
        description: 'User action count',
        type: MetricType.COUNTER,
        labels: ['action_type']
      }
    ];
    
    // Register standard metrics
    standardMetrics.forEach(metric => {
      this.registerMetric(metric);
    });
  }
  
  /**
   * Initialize standard alerts
   */
  private initializeStandardAlerts() {
    const standardAlerts: AlertDefinition[] = [
      // System alerts
      {
        name: 'high_cpu_usage',
        description: 'CPU usage is high',
        metricName: 'system_cpu_usage',
        condition: 'value > threshold',
        severity: AlertSeverity.MEDIUM,
        thresholds: {
          critical: 90,
          high: 80,
          medium: 70
        },
        cooldownPeriod: 300, // 5 minutes
        notificationChannels: ['email', 'dashboard']
      },
      {
        name: 'high_memory_usage',
        description: 'Memory usage is high',
        metricName: 'system_memory_usage',
        condition: 'value > threshold',
        severity: AlertSeverity.MEDIUM,
        thresholds: {
          critical: 90,
          high: 80,
          medium: 70
        },
        cooldownPeriod: 300, // 5 minutes
        notificationChannels: ['email', 'dashboard']
      },
      
      // API alerts
      {
        name: 'high_api_error_rate',
        description: 'API error rate is high',
        metricName: 'api_error_rate',
        condition: 'value > threshold',
        severity: AlertSeverity.HIGH,
        thresholds: {
          critical: 10,
          high: 5,
          medium: 2
        },
        cooldownPeriod: 60, // 1 minute
        notificationChannels: ['email', 'dashboard', 'slack']
      },
      {
        name: 'slow_api_response',
        description: 'API response time is slow',
        metricName: 'api_request_duration',
        condition: 'value > threshold',
        severity: AlertSeverity.MEDIUM,
        thresholds: {
          critical: 5000, // 5 seconds
          high: 2000, // 2 seconds
          medium: 1000 // 1 second
        },
        cooldownPeriod: 120, // 2 minutes
        notificationChannels: ['dashboard']
      },
      
      // Exchange alerts
      {
        name: 'exchange_connectivity_issue',
        description: 'Exchange connectivity is degraded',
        metricName: 'exchange_latency',
        condition: 'value > threshold',
        severity: AlertSeverity.HIGH,
        thresholds: {
          critical: 5000, // 5 seconds
          high: 2000, // 2 seconds
          medium: 1000 // 1 second
        },
        cooldownPeriod: 60, // 1 minute
        notificationChannels: ['email', 'dashboard', 'slack']
      },
      {
        name: 'high_exchange_error_rate',
        description: 'Exchange API error rate is high',
        metricName: 'exchange_api_errors',
        condition: 'value > threshold',
        severity: AlertSeverity.HIGH,
        thresholds: {
          critical: 10,
          high: 5,
          medium: 2
        },
        cooldownPeriod: 60, // 1 minute
        notificationChannels: ['email', 'dashboard', 'slack']
      },
      
      // Trading alerts
      {
        name: 'large_order_placed',
        description: 'Large order placed',
        metricName: 'order_value',
        condition: 'value > threshold',
        severity: AlertSeverity.MEDIUM,
        thresholds: {
          critical: 100000, // $100,000
          high: 50000, // $50,000
          medium: 10000 // $10,000
        },
        cooldownPeriod: 0, // No cooldown for order alerts
        notificationChannels: ['email', 'dashboard']
      },
      
      // Agent alerts
      {
        name: 'agent_error_rate',
        description: 'Agent error rate is high',
        metricName: 'agent_errors',
        condition: 'value > threshold',
        severity: AlertSeverity.HIGH,
        thresholds: {
          critical: 5,
          high: 3,
          medium: 1
        },
        cooldownPeriod: 300, // 5 minutes
        notificationChannels: ['email', 'dashboard']
      },
      {
        name: 'agent_pnl_decline',
        description: 'Agent PnL is declining rapidly',
        metricName: 'agent_pnl',
        condition: 'value < threshold',
        severity: AlertSeverity.HIGH,
        thresholds: {
          critical: -10, // 10% loss
          high: -5, // 5% loss
          medium: -2 // 2% loss
        },
        cooldownPeriod: 900, // 15 minutes
        notificationChannels: ['email', 'dashboard', 'slack']
      }
    ];
    
    // Register standard alerts
    standardAlerts.forEach(alert => {
      this.registerAlert(alert);
    });
  }
  
  /**
   * Register a new metric
   */
  registerMetric(metric: MetricDefinition): void {
    this.metrics.set(metric.name, metric);
    this.metricValues.set(metric.name, new Map());
  }
  
  /**
   * Register a new alert
   */
  registerAlert(alert: AlertDefinition): void {
    this.alerts.set(alert.name, alert);
  }
  
  /**
   * Record a metric value
   */
  recordMetric(
    metricName: string,
    value: number,
    labels: Record<string, string> = {}
  ): void {
    const metric = this.metrics.get(metricName);
    
    if (!metric) {
      console.warn(`Metric "${metricName}" not registered`);
      return;
    }
    
    // Create a key from labels
    const labelKey = this.getLabelKey(labels);
    
    // Get the metric values map
    const metricValueMap = this.metricValues.get(metricName);
    
    if (!metricValueMap) {
      console.warn(`Metric values map for "${metricName}" not found`);
      return;
    }
    
    // Update value based on metric type
    if (metric.type === MetricType.COUNTER) {
      const currentValue = metricValueMap.get(labelKey) || 0;
      metricValueMap.set(labelKey, currentValue + value);
    } else {
      metricValueMap.set(labelKey, value);
    }
    
    // Check for alerts based on this metric
    this.checkAlerts(metricName, value, labels);
    
    // Notify subscribers
    this.notifyMetricSubscribers(metricName, value, labels);
    
    // Store in database if configured
    this.storeMetric(metricName, value, labels);
  }
  
  /**
   * Get a metric value
   */
  getMetricValue(
    metricName: string,
    labels: Record<string, string> = {}
  ): number | null {
    const metricValueMap = this.metricValues.get(metricName);
    
    if (!metricValueMap) {
      return null;
    }
    
    const labelKey = this.getLabelKey(labels);
    return metricValueMap.get(labelKey) ?? null;
  }
  
  /**
   * Create a key from labels for metric storage
   */
  private getLabelKey(labels: Record<string, string>): string {
    if (Object.keys(labels).length === 0) {
      return '__default__';
    }
    
    return Object.entries(labels)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([key, value]) => `${key}=${value}`)
      .join(',');
  }
  
  /**
   * Check for alerts based on a metric value
   */
  private checkAlerts(
    metricName: string,
    value: number,
    labels: Record<string, string> = {}
  ): void {
    // Find alerts for this metric
    const relevantAlerts = Array.from(this.alerts.values()).filter(
      alert => alert.metricName === metricName
    );
    
    if (relevantAlerts.length === 0) {
      return;
    }
    
    const now = Date.now();
    
    relevantAlerts.forEach(alert => {
      let triggered = false;
      let severity = AlertSeverity.INFO;
      
      // Check thresholds in order of severity
      if (alert.thresholds.critical !== undefined && 
          this.evaluateCondition(alert.condition, value, alert.thresholds.critical)) {
        triggered = true;
        severity = AlertSeverity.CRITICAL;
      } else if (alert.thresholds.high !== undefined && 
                 this.evaluateCondition(alert.condition, value, alert.thresholds.high)) {
        triggered = true;
        severity = AlertSeverity.HIGH;
      } else if (alert.thresholds.medium !== undefined && 
                 this.evaluateCondition(alert.condition, value, alert.thresholds.medium)) {
        triggered = true;
        severity = AlertSeverity.MEDIUM;
      } else if (alert.thresholds.low !== undefined && 
                 this.evaluateCondition(alert.condition, value, alert.thresholds.low)) {
        triggered = true;
        severity = AlertSeverity.LOW;
      }
      
      if (triggered) {
        // Check cooldown period
        const lastAlertTimeKey = `${alert.name}:${this.getLabelKey(labels)}`;
        const lastAlertTime = this.lastAlertTime.get(lastAlertTimeKey) || 0;
        const cooldownPeriod = alert.cooldownPeriod || 0;
        
        if (now - lastAlertTime > cooldownPeriod * 1000) {
          // Generate alert
          const alertInstance: Alert = {
            id: `${alert.name}-${Date.now()}`,
            name: alert.name,
            severity,
            message: this.generateAlertMessage(alert, value, severity, labels),
            metricName,
            metricValue: value,
            timestamp: new Date().toISOString(),
            acknowledged: false
          };
          
          // Update last alert time
          this.lastAlertTime.set(lastAlertTimeKey, now);
          
          // Notify subscribers
          this.notifyAlertSubscribers(alertInstance);
          
          // Store in database
          this.storeAlert(alertInstance);
        }
      }
    });
  }
  
  /**
   * Evaluate an alert condition
   */
  private evaluateCondition(condition: string, value: number, threshold: number): boolean {
    // Simple condition evaluation for common patterns
    if (condition === 'value > threshold') {
      return value > threshold;
    } else if (condition === 'value < threshold') {
      return value < threshold;
    } else if (condition === 'value >= threshold') {
      return value >= threshold;
    } else if (condition === 'value <= threshold') {
      return value <= threshold;
    } else if (condition === 'value == threshold') {
      return value === threshold;
    }
    
    // For more complex conditions, you could use a proper expression evaluator
    return false;
  }
  
  /**
   * Generate a human-readable alert message
   */
  private generateAlertMessage(
    alert: AlertDefinition,
    value: number,
    severity: AlertSeverity,
    labels: Record<string, string> = {}
  ): string {
    let message = `${alert.description}: ${value}`;
    
    // Add threshold information
    let threshold: number | undefined;
    
    switch (severity) {
      case AlertSeverity.CRITICAL:
        threshold = alert.thresholds.critical;
        break;
      case AlertSeverity.HIGH:
        threshold = alert.thresholds.high;
        break;
      case AlertSeverity.MEDIUM:
        threshold = alert.thresholds.medium;
        break;
      case AlertSeverity.LOW:
        threshold = alert.thresholds.low;
        break;
    }
    
    if (threshold !== undefined) {
      const operator = alert.condition.includes('>') ? 'exceeds' : 'below';
      message += ` ${operator} threshold of ${threshold}`;
    }
    
    // Add label information if present
    if (Object.keys(labels).length > 0) {
      const labelStr = Object.entries(labels)
        .map(([key, value]) => `${key}=${value}`)
        .join(', ');
      
      message += ` (${labelStr})`;
    }
    
    return message;
  }
  
  /**
   * Notify metric subscribers of a new value
   */
  private notifyMetricSubscribers(
    metricName: string,
    value: number,
    labels: Record<string, string> = {}
  ): void {
    const subscribers = this.metricSubscribers.get(metricName);
    
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(value, labels);
        } catch (error) {
          console.error(`Error in metric subscriber callback for ${metricName}:`, error);
        }
      });
    }
  }
  
  /**
   * Notify alert subscribers of a new alert
   */
  private notifyAlertSubscribers(alert: Alert): void {
    this.alertSubscribers.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error(`Error in alert subscriber callback:`, error);
      }
    });
  }
  
  /**
   * Store a metric in the database
   */
  private async storeMetric(
    metricName: string,
    value: number,
    labels: Record<string, string> = {}
  ): Promise<void> {
    try {
      await this.initializeServerClient();
      
      await this.supabase
        .from('metrics')
        .insert({
          name: metricName,
          value,
          labels: labels,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error(`Error storing metric ${metricName}:`, error);
    }
  }
  
  /**
   * Store an alert in the database
   */
  private async storeAlert(alert: Alert): Promise<void> {
    try {
      await this.initializeServerClient();
      
      await this.supabase
        .from('alerts')
        .insert({
          name: alert.name,
          severity: alert.severity,
          message: alert.message,
          metric_name: alert.metricName,
          metric_value: alert.metricValue,
          acknowledged: alert.acknowledged,
          created_at: alert.timestamp
        });
    } catch (error) {
      console.error(`Error storing alert ${alert.name}:`, error);
    }
  }
  
  /**
   * Subscribe to metric updates
   */
  subscribeToMetric(
    metricName: string,
    callback: (value: number, labels?: Record<string, string>) => void
  ): () => void {
    let subscribers = this.metricSubscribers.get(metricName);
    
    if (!subscribers) {
      subscribers = new Set();
      this.metricSubscribers.set(metricName, subscribers);
    }
    
    subscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
      const subscribers = this.metricSubscribers.get(metricName);
      if (subscribers) {
        subscribers.delete(callback);
      }
    };
  }
  
  /**
   * Subscribe to all alerts
   */
  subscribeToAlerts(callback: (alert: Alert) => void): () => void {
    this.alertSubscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.alertSubscribers.delete(callback);
    };
  }
  
  /**
   * Get all metrics
   */
  getMetrics(): MetricDefinition[] {
    return Array.from(this.metrics.values());
  }
  
  /**
   * Get all alerts
   */
  getAlerts(): AlertDefinition[] {
    return Array.from(this.alerts.values());
  }
  
  /**
   * Get alert history from database
   */
  async getAlertHistory(
    limit: number = 100,
    offset: number = 0,
    severity?: AlertSeverity
  ): Promise<Alert[]> {
    await this.initializeServerClient();
    
    let query = this.supabase
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1);
    
    if (severity) {
      query = query.eq('severity', severity);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching alert history:', error);
      throw error;
    }
    
    return data.map((alert: any) => ({
      id: alert.id,
      name: alert.name,
      severity: alert.severity,
      message: alert.message,
      metricName: alert.metric_name,
      metricValue: alert.metric_value,
      timestamp: alert.created_at,
      acknowledged: alert.acknowledged
    }));
  }
  
  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string): Promise<void> {
    await this.initializeServerClient();
    
    const { error } = await this.supabase
      .from('alerts')
      .update({ acknowledged: true })
      .eq('id', alertId);
    
    if (error) {
      console.error(`Error acknowledging alert ${alertId}:`, error);
      throw error;
    }
  }
  
  /**
   * Create a monitoring dashboard
   */
  async createDashboard(dashboard: Omit<Dashboard, 'id'>): Promise<Dashboard> {
    await this.initializeServerClient();
    
    const { data, error } = await this.supabase
      .from('dashboards')
      .insert({
        name: dashboard.name,
        description: dashboard.description,
        panels: dashboard.panels
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating dashboard:', error);
      throw error;
    }
    
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      panels: data.panels
    };
  }
  
  /**
   * Get a dashboard by ID
   */
  async getDashboard(dashboardId: string): Promise<Dashboard | null> {
    await this.initializeServerClient();
    
    const { data, error } = await this.supabase
      .from('dashboards')
      .select('*')
      .eq('id', dashboardId)
      .single();
    
    if (error) {
      console.error(`Error fetching dashboard ${dashboardId}:`, error);
      return null;
    }
    
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      panels: data.panels
    };
  }
  
  /**
   * Get metric history from database
   */
  async getMetricHistory(
    metricName: string,
    startTime: string,
    endTime: string,
    labels: Record<string, string> = {},
    aggregation: 'avg' | 'max' | 'min' | 'sum' = 'avg',
    interval: string = '1h'
  ): Promise<{ timestamp: string; value: number }[]> {
    await this.initializeServerClient();
    
    // Construct the query
    // In a real implementation, you would use time-series functions
    // For simplicity, we're using a basic query here
    const { data, error } = await this.supabase
      .rpc('get_metric_history', {
        p_metric_name: metricName,
        p_start_time: startTime,
        p_end_time: endTime,
        p_labels: labels,
        p_aggregation: aggregation,
        p_interval: interval
      });
    
    if (error) {
      console.error(`Error fetching metric history for ${metricName}:`, error);
      throw error;
    }
    
    return data || [];
  }
}
