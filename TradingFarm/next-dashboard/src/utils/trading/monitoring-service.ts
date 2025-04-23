/**
 * Monitoring & Operations Service
 *
 * Handles:
 * - Alert configuration and triggering
 * - Performance metrics tracking
 * - Audit logging
 * - Notification preferences
 */

import { createServerClient } from '@/utils/supabase/server';
import { createBrowserClient } from '@/utils/supabase/client';
import { Session } from '@supabase/supabase-js';

// Alert Config Interface
export interface AlertConfig {
  id: number;
  user_id: string;
  metric_name: string;
  condition: string;
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
  notification_channels?: Record<string, any>;
  agent_id?: number | null;
  created_at: string;
  updated_at: string;
}

// Triggered Alert Interface
export interface TriggeredAlert {
  id: number;
  alert_config_id: number;
  user_id: string;
  metric_value: number;
  triggered_at: string;
  acknowledged: boolean;
  acknowledged_at?: string | null;
  message: string;
  metadata?: Record<string, any>;
}

// Performance Metric Interface
export interface PerformanceMetric {
  id: number;
  user_id: string;
  agent_id?: number | null;
  metric_type: string;
  time_period: string;
  value: number;
  start_time: string;
  end_time: string;
  metadata?: Record<string, any>;
  created_at: string;
}

// Audit Log Interface
export interface AuditLog {
  id: number;
  user_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  details?: Record<string, any>;
  ip_address?: string | null;
  created_at: string;
}

// Notification Preference Interface
export interface NotificationPreference {
  id: number;
  user_id: string;
  channel: string;
  enabled: boolean;
  config?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

class MonitoringService {
  private static instance: MonitoringService;
  private constructor() {}

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  /**
   * Get alert configs for a user
   */
  public async getAlertConfigs(userId: string): Promise<AlertConfig[]> {
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('alert_configs')
      .select('*')
      .eq('user_id', userId);
      
    if (error || !data) {
      console.error('Error fetching alert configs:', error);
      return [];
    }
    
    return data as AlertConfig[];
  }

  /**
   * Create or update an alert config
   */
  public async upsertAlertConfig(userId: string, config: Partial<AlertConfig>): Promise<AlertConfig | null> {
    const supabase = await createServerClient();
    
    const configData = {
      ...config,
      user_id: userId
    };
    
    const { data, error } = await supabase
      .from('alert_configs')
      .upsert(configData, { onConflict: 'id' })
      .select()
      .single();
      
    if (error) {
      console.error('Error upserting alert config:', error);
      return null;
    }
    
    return data as AlertConfig;
  }

  /**
   * Delete an alert config
   */
  public async deleteAlertConfig(userId: string, configId: number): Promise<boolean> {
    const supabase = await createServerClient();
    
    const { error } = await supabase
      .from('alert_configs')
      .delete()
      .eq('id', configId)
      .eq('user_id', userId);
      
    return !error;
  }

  /**
   * Get triggered alerts for a user
   */
  public async getTriggeredAlerts(userId: string, limit: number = 10, acknowledged: boolean = false): Promise<TriggeredAlert[]> {
    const supabase = await createServerClient();
    
    const query = supabase
      .from('triggered_alerts')
      .select('*')
      .eq('user_id', userId)
      .eq('acknowledged', acknowledged)
      .order('triggered_at', { ascending: false })
      .limit(limit);
      
    const { data, error } = await query;
      
    if (error || !data) {
      console.error('Error fetching triggered alerts:', error);
      return [];
    }
    
    return data as TriggeredAlert[];
  }

  /**
   * Acknowledge a triggered alert
   */
  public async acknowledgeAlert(userId: string, alertId: number): Promise<boolean> {
    const supabase = await createServerClient();
    
    const { error } = await supabase
      .from('triggered_alerts')
      .update({ 
        acknowledged: true,
        acknowledged_at: new Date().toISOString()
      })
      .eq('id', alertId)
      .eq('user_id', userId);
      
    return !error;
  }

  /**
   * Trigger a new alert
   */
  public async triggerAlert(
    userId: string,
    alertConfigId: number,
    metricValue: number,
    message: string,
    metadata?: Record<string, any>
  ): Promise<TriggeredAlert | null> {
    const supabase = await createServerClient();
    
    const alertData = {
      alert_config_id: alertConfigId,
      user_id: userId,
      metric_value: metricValue,
      message,
      metadata,
      triggered_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('triggered_alerts')
      .insert(alertData)
      .select()
      .single();
      
    if (error) {
      console.error('Error triggering alert:', error);
      return null;
    }
    
    // Send notifications based on user preferences
    await this.sendAlertNotifications(userId, data as TriggeredAlert);
    
    return data as TriggeredAlert;
  }

  /**
   * Check if an alert should be triggered
   */
  public evaluateMetricForAlert(
    config: AlertConfig,
    metricValue: number
  ): boolean {
    switch (config.condition) {
      case '>':
        return metricValue > config.threshold;
      case '>=':
        return metricValue >= config.threshold;
      case '<':
        return metricValue < config.threshold;
      case '<=':
        return metricValue <= config.threshold;
      case '==':
        return metricValue === config.threshold;
      case '!=':
        return metricValue !== config.threshold;
      default:
        return false;
    }
  }

  /**
   * Send notifications for triggered alert based on user preferences
   */
  private async sendAlertNotifications(userId: string, alert: TriggeredAlert): Promise<void> {
    const supabase = await createServerClient();
    
    // Get user notification preferences
    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('enabled', true);
      
    if (!preferences || preferences.length === 0) {
      console.log('No enabled notification preferences found for user');
      return;
    }
    
    // Get alert config to check notification channels
    const { data: alertConfig } = await supabase
      .from('alert_configs')
      .select('*')
      .eq('id', alert.alert_config_id)
      .single();
      
    if (!alertConfig) {
      console.error('Alert config not found');
      return;
    }
    
    // Send notifications based on preferences and alert config
    for (const pref of preferences) {
      const notifPref = pref as NotificationPreference;
      
      // Only send if this channel is specified in the alert config
      if (alertConfig.notification_channels && 
          alertConfig.notification_channels[notifPref.channel] === true) {
        
        switch (notifPref.channel) {
          case 'email':
            // Email notification logic would go here
            console.log(`Sending email notification for alert ${alert.id} to user ${userId}`);
            break;
            
          case 'push':
            // Push notification logic would go here
            console.log(`Sending push notification for alert ${alert.id} to user ${userId}`);
            break;
            
          case 'sms':
            // SMS notification logic would go here
            console.log(`Sending SMS notification for alert ${alert.id} to user ${userId}`);
            break;
            
          default:
            console.log(`Unknown notification channel: ${notifPref.channel}`);
        }
      }
    }
  }

  /**
   * Record a performance metric
   */
  public async recordPerformanceMetric(
    userId: string,
    metricType: string,
    timePeriod: string,
    value: number,
    startTime: string,
    endTime: string,
    agentId?: number,
    metadata?: Record<string, any>
  ): Promise<PerformanceMetric | null> {
    const supabase = await createServerClient();
    
    const metricData = {
      user_id: userId,
      agent_id: agentId,
      metric_type: metricType,
      time_period: timePeriod,
      value,
      start_time: startTime,
      end_time: endTime,
      metadata
    };
    
    const { data, error } = await supabase
      .from('performance_metrics')
      .insert(metricData)
      .select()
      .single();
      
    if (error) {
      console.error('Error recording performance metric:', error);
      return null;
    }
    
    // Check if any alerts should be triggered for this metric
    await this.checkAlertsForMetric(userId, metricType, value, agentId);
    
    return data as PerformanceMetric;
  }

  /**
   * Check if any alerts should be triggered for a metric
   */
  private async checkAlertsForMetric(
    userId: string,
    metricType: string,
    value: number,
    agentId?: number
  ): Promise<void> {
    const supabase = await createServerClient();
    
    // Get matching alert configs
    let query = supabase
      .from('alert_configs')
      .select('*')
      .eq('user_id', userId)
      .eq('metric_name', metricType)
      .eq('enabled', true);
      
    if (agentId) {
      query = query.or(`agent_id.is.null,agent_id.eq.${agentId}`);
    } else {
      query = query.is('agent_id', null);
    }
    
    const { data: alertConfigs, error } = await query;
    
    if (error || !alertConfigs || alertConfigs.length === 0) {
      return;
    }
    
    // Evaluate each matching alert config
    for (const config of alertConfigs) {
      const alertConfig = config as AlertConfig;
      
      if (this.evaluateMetricForAlert(alertConfig, value)) {
        const message = `${alertConfig.metric_name} ${alertConfig.condition} ${alertConfig.threshold} (current value: ${value})`;
        
        await this.triggerAlert(
          userId,
          alertConfig.id,
          value,
          message,
          { metricType, agentId }
        );
      }
    }
  }

  /**
   * Get performance metrics
   */
  public async getPerformanceMetrics(
    userId: string,
    metricType?: string,
    agentId?: number,
    timePeriod?: string,
    limit: number = 100
  ): Promise<PerformanceMetric[]> {
    const supabase = await createServerClient();
    
    let query = supabase
      .from('performance_metrics')
      .select('*')
      .eq('user_id', userId)
      .order('end_time', { ascending: false })
      .limit(limit);
      
    if (metricType) {
      query = query.eq('metric_type', metricType);
    }
    
    if (agentId) {
      query = query.eq('agent_id', agentId);
    }
    
    if (timePeriod) {
      query = query.eq('time_period', timePeriod);
    }
    
    const { data, error } = await query;
    
    if (error || !data) {
      console.error('Error fetching performance metrics:', error);
      return [];
    }
    
    return data as PerformanceMetric[];
  }

  /**
   * Log an audit event
   */
  public async logAudit(
    action: string,
    entityType: string,
    entityId?: string,
    details?: Record<string, any>,
    userId?: string,
    ipAddress?: string
  ): Promise<AuditLog | null> {
    const supabase = await createServerClient();
    
    // If userId wasn't provided, try to get it from the current session
    if (!userId) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        userId = session.user.id;
      }
    }
    
    const auditData = {
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      ip_address: ipAddress,
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('audit_logs')
      .insert(auditData)
      .select()
      .single();
      
    if (error) {
      console.error('Error logging audit:', error);
      return null;
    }
    
    return data as AuditLog;
  }

  /**
   * Get audit logs
   */
  public async getAuditLogs(
    userId?: string,
    entityType?: string,
    entityId?: string,
    limit: number = 100
  ): Promise<AuditLog[]> {
    const supabase = await createServerClient();
    
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
      
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    if (entityType) {
      query = query.eq('entity_type', entityType);
    }
    
    if (entityId) {
      query = query.eq('entity_id', entityId);
    }
    
    const { data, error } = await query;
    
    if (error || !data) {
      console.error('Error fetching audit logs:', error);
      return [];
    }
    
    return data as AuditLog[];
  }

  /**
   * Get notification preferences
   */
  public async getNotificationPreferences(userId: string): Promise<NotificationPreference[]> {
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId);
      
    if (error || !data) {
      console.error('Error fetching notification preferences:', error);
      return [];
    }
    
    return data as NotificationPreference[];
  }

  /**
   * Update notification preference
   */
  public async updateNotificationPreference(
    userId: string,
    prefId: number,
    updates: Partial<NotificationPreference>
  ): Promise<NotificationPreference | null> {
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('notification_preferences')
      .update(updates)
      .eq('id', prefId)
      .eq('user_id', userId)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating notification preference:', error);
      return null;
    }
    
    return data as NotificationPreference;
  }
}

export const monitoringService = MonitoringService.getInstance();
