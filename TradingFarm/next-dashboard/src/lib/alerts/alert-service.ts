/**
 * Alert Service
 * 
 * Manages alert creation, notification, and handling.
 */

import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';
import { 
  Alert, 
  AlertAction, 
  AlertCategory, 
  AlertRule, 
  AlertSeverity, 
  AlertSource, 
  AlertStatus 
} from './types';

export class AlertService {
  private userId: string | null = null;
  private supabase = createBrowserClient();
  
  constructor(userId?: string) {
    if (userId) {
      this.userId = userId;
    }
  }
  
  /**
   * Set the user ID for the alert service
   */
  public setUserId(userId: string): void {
    this.userId = userId;
  }
  
  /**
   * Create a new alert
   */
  public async createAlert(
    title: string,
    message: string,
    severity: AlertSeverity,
    category: AlertCategory,
    source: AlertSource,
    metadata: Record<string, any> = {},
    actionRequired: boolean = false,
    actions: AlertAction[] = [],
    relatedEntityId?: string,
    relatedEntityType?: string,
    expiresAt?: Date
  ): Promise<Alert | null> {
    if (!this.userId) {
      console.error('No user ID set for alert service');
      return null;
    }
    
    try {
      const { data, error } = await this.supabase
        .from('alerts')
        .insert({
          user_id: this.userId,
          title,
          message,
          severity,
          category,
          source,
          status: AlertStatus.ACTIVE,
          metadata,
          action_required: actionRequired,
          actions: actions.length > 0 ? actions : undefined,
          related_entity_id: relatedEntityId,
          related_entity_type: relatedEntityType,
          expires_at: expiresAt?.toISOString()
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      // Format the response to match our Alert interface
      return {
        id: data.id,
        userId: data.user_id,
        title: data.title,
        message: data.message,
        severity: data.severity,
        category: data.category,
        source: data.source,
        status: data.status,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        acknowledgedAt: data.acknowledged_at,
        resolvedAt: data.resolved_at,
        dismissedAt: data.dismissed_at,
        expiresAt: data.expires_at,
        metadata: data.metadata || {},
        relatedEntityId: data.related_entity_id,
        relatedEntityType: data.related_entity_type,
        actionRequired: data.action_required,
        actions: data.actions || []
      };
    } catch (error) {
      console.error('Error creating alert:', error);
      return null;
    }
  }
  
  /**
   * Get all active alerts for the user
   */
  public async getActiveAlerts(): Promise<Alert[]> {
    if (!this.userId) {
      console.error('No user ID set for alert service');
      return [];
    }
    
    try {
      const { data, error } = await this.supabase
        .from('alerts')
        .select('*')
        .eq('user_id', this.userId)
        .in('status', [AlertStatus.ACTIVE, AlertStatus.ACKNOWLEDGED])
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      // Format the response to match our Alert interface
      return data.map((item: any) => ({
        id: item.id,
        userId: item.user_id,
        title: item.title,
        message: item.message,
        severity: item.severity,
        category: item.category,
        source: item.source,
        status: item.status,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        acknowledgedAt: item.acknowledged_at,
        resolvedAt: item.resolved_at,
        dismissedAt: item.dismissed_at,
        expiresAt: item.expires_at,
        metadata: item.metadata || {},
        relatedEntityId: item.related_entity_id,
        relatedEntityType: item.related_entity_type,
        actionRequired: item.action_required,
        actions: item.actions || []
      }));
    } catch (error) {
      console.error('Error fetching active alerts:', error);
      return [];
    }
  }
  
  /**
   * Update alert status
   */
  public async updateAlertStatus(alertId: string, status: AlertStatus): Promise<boolean> {
    if (!this.userId) {
      console.error('No user ID set for alert service');
      return false;
    }
    
    try {
      const updates: Record<string, any> = {
        status,
        updated_at: new Date().toISOString()
      };
      
      // Add status-specific timestamp
      if (status === AlertStatus.ACKNOWLEDGED) {
        updates.acknowledged_at = new Date().toISOString();
      } else if (status === AlertStatus.RESOLVED) {
        updates.resolved_at = new Date().toISOString();
      } else if (status === AlertStatus.DISMISSED) {
        updates.dismissed_at = new Date().toISOString();
      }
      
      const { error } = await this.supabase
        .from('alerts')
        .update(updates)
        .eq('id', alertId)
        .eq('user_id', this.userId);
      
      if (error) {
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Error updating alert status:', error);
      return false;
    }
  }
  
  /**
   * Get alert statistics
   */
  public async getAlertStats(): Promise<Record<string, any>> {
    if (!this.userId) {
      console.error('No user ID set for alert service');
      return {};
    }
    
    try {
      const { data, error } = await this.supabase
        .rpc('get_alert_stats', { p_user_id: this.userId });
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching alert stats:', error);
      return {};
    }
  }
  
  /**
   * Create a system alert for all users or specific user
   * Only for server-side use
   */
  public static async createSystemAlert(
    title: string,
    message: string,
    severity: AlertSeverity,
    category: AlertCategory,
    metadata: Record<string, any> = {},
    actionRequired: boolean = false,
    actions: AlertAction[] = [],
    userId?: string,
    supabaseServerClient?: any
  ): Promise<void> {
    try {
      const supabase = supabaseServerClient || (await createServerClient());
      
      const alertData = {
        title,
        message,
        severity,
        category,
        source: AlertSource.SYSTEM,
        status: AlertStatus.ACTIVE,
        metadata,
        action_required: actionRequired,
        actions: actions.length > 0 ? actions : undefined,
      };
      
      if (userId) {
        // Create alert for specific user
        await supabase
          .from('alerts')
          .insert({
            ...alertData,
            user_id: userId
          });
      } else {
        // Create alert for all users
        // We'll use a stored procedure for this
        await supabase
          .rpc('create_system_alert_for_all_users', {
            p_title: title,
            p_message: message,
            p_severity: severity,
            p_category: category,
            p_metadata: metadata,
            p_action_required: actionRequired,
            p_actions: actions.length > 0 ? actions : null
          });
      }
    } catch (error) {
      console.error('Error creating system alert:', error);
    }
  }
  
  /**
   * Create alerts based on rules
   */
  public async evaluateAlertRules(): Promise<void> {
    if (!this.userId) {
      console.error('No user ID set for alert service');
      return;
    }
    
    try {
      // This will execute stored procedure that evaluates alert rules
      await this.supabase
        .rpc('evaluate_alert_rules', { p_user_id: this.userId });
    } catch (error) {
      console.error('Error evaluating alert rules:', error);
    }
  }
  
  /**
   * Create a new alert rule
   */
  public async createAlertRule(rule: Omit<AlertRule, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<AlertRule | null> {
    if (!this.userId) {
      console.error('No user ID set for alert service');
      return null;
    }
    
    try {
      const { data, error } = await this.supabase
        .from('alert_rules')
        .insert({
          user_id: this.userId,
          name: rule.name,
          description: rule.description,
          enabled: rule.enabled,
          conditions: rule.conditions,
          severity: rule.severity,
          message: rule.message,
          action_required: rule.actionRequired,
          category: rule.category,
          throttling_period: rule.throttlingPeriod,
          cooldown_period: rule.cooldownPeriod
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      // Format the response to match our AlertRule interface
      return {
        id: data.id,
        userId: data.user_id,
        name: data.name,
        description: data.description,
        enabled: data.enabled,
        conditions: data.conditions,
        severity: data.severity,
        message: data.message,
        actionRequired: data.action_required,
        category: data.category,
        throttlingPeriod: data.throttling_period,
        lastTriggeredAt: data.last_triggered_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        cooldownPeriod: data.cooldown_period
      };
    } catch (error) {
      console.error('Error creating alert rule:', error);
      return null;
    }
  }
  
  /**
   * Get alert rules for the user
   */
  public async getAlertRules(): Promise<AlertRule[]> {
    if (!this.userId) {
      console.error('No user ID set for alert service');
      return [];
    }
    
    try {
      const { data, error } = await this.supabase
        .from('alert_rules')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      // Format the response to match our AlertRule interface
      return data.map((item: any) => ({
        id: item.id,
        userId: item.user_id,
        name: item.name,
        description: item.description,
        enabled: item.enabled,
        conditions: item.conditions,
        severity: item.severity,
        message: item.message,
        actionRequired: item.action_required,
        category: item.category,
        throttlingPeriod: item.throttling_period,
        lastTriggeredAt: item.last_triggered_at,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        cooldownPeriod: item.cooldown_period
      }));
    } catch (error) {
      console.error('Error fetching alert rules:', error);
      return [];
    }
  }
}
