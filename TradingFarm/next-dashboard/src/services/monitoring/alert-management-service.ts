/**
 * Alert Management Service
 * Handles creating, retrieving, and updating trading alerts and alert rules
 */

import { createServerClient } from '@/utils/supabase/server';

export type AlertLevel = 'info' | 'warning' | 'error';

export type NotificationChannel = 'ui' | 'email' | 'sms' | 'telegram';

export interface TradingAlert {
  id?: number;
  user_id: string;
  farm_id?: number;
  strategy_id?: number;
  agent_id?: number;
  exchange?: string;
  alert_type: string;
  level: AlertLevel;
  message: string;
  details?: Record<string, any>;
  is_read: boolean;
  is_acknowledged: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AlertRule {
  id?: number;
  user_id: string;
  farm_id?: number;
  name: string;
  description?: string;
  rule_type: AlertRuleType;
  conditions: AlertCondition[];
  level: AlertLevel;
  notification_channels: NotificationChannel[];
  is_active: boolean;
  throttle_minutes: number;
  last_triggered?: string;
  created_at?: string;
  updated_at?: string;
}

export type AlertRuleType = 
  | 'price_change' 
  | 'volume_change'
  | 'position_drawdown'
  | 'strategy_performance'
  | 'agent_status'
  | 'exchange_status'
  | 'api_limit'
  | 'profit_target'
  | 'stop_loss'
  | 'custom';

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'neq' | 'gte' | 'lte' | 'between' | 'contains' | 'not_contains';
  value: number | string | boolean | any[];
  value2?: number | string; // For 'between' operator
  timeframe?: string; // For time-based comparisons (e.g., '1h', '24h', '7d')
}

export interface NotificationPreferences {
  id?: number;
  user_id: string;
  email_alerts: boolean;
  push_notifications: boolean;
  sms_alerts: boolean;
  telegram_alerts: boolean;
  email_frequency: 'immediate' | 'hourly' | 'daily';
  min_alert_level: AlertLevel;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  telegram_chat_id?: string;
  phone_number?: string;
}

export class AlertManagementService {
  /**
   * Create a new trading alert
   */
  static async createAlert(alert: Omit<TradingAlert, 'is_read' | 'is_acknowledged'>): Promise<TradingAlert | null> {
    try {
      const supabase = await createServerClient();
      
      const { data, error } = await supabase
        .from('trading_alerts')
        .insert({
          ...alert,
          is_read: false,
          is_acknowledged: false
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Check if we should send notifications based on user preferences
      await this.sendNotifications(data);
      
      return data;
    } catch (error) {
      console.error('Error creating alert:', error);
      return null;
    }
  }
  
  /**
   * Get all alerts for a user with optional filtering
   */
  static async getAlerts(
    userId: string, 
    options?: {
      farmId?: number;
      strategyId?: number;
      agentId?: number;
      exchange?: string;
      level?: AlertLevel;
      unreadOnly?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<TradingAlert[]> {
    try {
      const supabase = await createServerClient();
      
      let query = supabase
        .from('trading_alerts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      // Apply filters if provided
      if (options?.farmId) {
        query = query.eq('farm_id', options.farmId);
      }
      
      if (options?.strategyId) {
        query = query.eq('strategy_id', options.strategyId);
      }
      
      if (options?.agentId) {
        query = query.eq('agent_id', options.agentId);
      }
      
      if (options?.exchange) {
        query = query.eq('exchange', options.exchange);
      }
      
      if (options?.level) {
        query = query.eq('level', options.level);
      }
      
      if (options?.unreadOnly) {
        query = query.eq('is_read', false);
      }
      
      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching alerts:', error);
      return [];
    }
  }
  
  /**
   * Mark alerts as read or acknowledged
   */
  static async updateAlertStatus(
    userId: string,
    alertIds: number[],
    updates: { is_read?: boolean; is_acknowledged?: boolean }
  ): Promise<boolean> {
    try {
      const supabase = await createServerClient();
      
      const { error } = await supabase
        .from('trading_alerts')
        .update(updates)
        .eq('user_id', userId)
        .in('id', alertIds);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error updating alert status:', error);
      return false;
    }
  }
  
  /**
   * Create or update an alert rule
   */
  static async saveAlertRule(rule: Omit<AlertRule, 'created_at' | 'updated_at'>): Promise<AlertRule | null> {
    try {
      const supabase = await createServerClient();
      
      // If rule has an ID, update it; otherwise create new
      if (rule.id) {
        const { data, error } = await supabase
          .from('alert_rules')
          .update(rule)
          .eq('id', rule.id)
          .eq('user_id', rule.user_id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('alert_rules')
          .insert(rule)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Error saving alert rule:', error);
      return null;
    }
  }
  
  /**
   * Get alert rules for a user
   */
  static async getAlertRules(
    userId: string,
    options?: {
      farmId?: number;
      activeOnly?: boolean;
    }
  ): Promise<AlertRule[]> {
    try {
      const supabase = await createServerClient();
      
      let query = supabase
        .from('alert_rules')
        .select('*')
        .eq('user_id', userId);
      
      if (options?.farmId) {
        query = query.eq('farm_id', options.farmId);
      }
      
      if (options?.activeOnly) {
        query = query.eq('is_active', true);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching alert rules:', error);
      return [];
    }
  }
  
  /**
   * Delete an alert rule
   */
  static async deleteAlertRule(userId: string, ruleId: number): Promise<boolean> {
    try {
      const supabase = await createServerClient();
      
      const { error } = await supabase
        .from('alert_rules')
        .delete()
        .eq('id', ruleId)
        .eq('user_id', userId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error deleting alert rule:', error);
      return false;
    }
  }
  
  /**
   * Get user notification preferences
   */
  static async getNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const supabase = await createServerClient();
      
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) throw error;
      
      // If no preferences exist, create default ones
      if (!data) {
        return this.createDefaultNotificationPreferences(userId);
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      return null;
    }
  }
  
  /**
   * Update notification preferences
   */
  static async updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences | null> {
    try {
      const supabase = await createServerClient();
      
      // Check if preferences exist
      const { data: existing } = await supabase
        .from('notification_preferences')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (existing) {
        // Update existing preferences
        const { data, error } = await supabase
          .from('notification_preferences')
          .update({
            ...preferences,
            user_id: userId
          })
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // Create new preferences
        return this.createDefaultNotificationPreferences(userId, preferences);
      }
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return null;
    }
  }
  
  /**
   * Create default notification preferences
   */
  private static async createDefaultNotificationPreferences(
    userId: string,
    overrides?: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences | null> {
    try {
      const supabase = await createServerClient();
      
      const defaultPreferences: NotificationPreferences = {
        user_id: userId,
        email_alerts: true,
        push_notifications: true,
        sms_alerts: false,
        telegram_alerts: false,
        email_frequency: 'immediate',
        min_alert_level: 'warning',
        ...overrides
      };
      
      const { data, error } = await supabase
        .from('notification_preferences')
        .insert(defaultPreferences)
        .select()
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error creating default notification preferences:', error);
      return null;
    }
  }
  
  /**
   * Send notifications based on user preferences
   * In a real implementation, this would integrate with email, SMS, etc.
   */
  private static async sendNotifications(alert: TradingAlert): Promise<void> {
    try {
      const supabase = await createServerClient();
      
      // Get user notification preferences
      const { data: preferences } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', alert.user_id)
        .maybeSingle();
      
      if (!preferences) return;
      
      // Check if this alert meets the minimum level
      const alertLevelPriority = { 'info': 1, 'warning': 2, 'error': 3 };
      const minLevelPriority = alertLevelPriority[preferences.min_alert_level];
      const currentAlertPriority = alertLevelPriority[alert.level];
      
      if (currentAlertPriority < minLevelPriority) return;
      
      // Check quiet hours if set
      if (preferences.quiet_hours_start && preferences.quiet_hours_end) {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinutes = now.getMinutes();
        
        const startParts = preferences.quiet_hours_start.split(':');
        const endParts = preferences.quiet_hours_end.split(':');
        
        const startHour = parseInt(startParts[0]);
        const startMinutes = parseInt(startParts[1]);
        const endHour = parseInt(endParts[0]);
        const endMinutes = parseInt(endParts[1]);
        
        const currentTime = currentHour * 60 + currentMinutes;
        const startTime = startHour * 60 + startMinutes;
        const endTime = endHour * 60 + endMinutes;
        
        // Check if current time is within quiet hours
        if (
          (startTime < endTime && currentTime >= startTime && currentTime <= endTime) ||
          (startTime > endTime && (currentTime >= startTime || currentTime <= endTime))
        ) {
          // It's quiet hours, don't send notifications except for errors
          if (alert.level !== 'error') return;
        }
      }
      
      // In a real implementation, we would send notifications through various channels
      // For now, we'll just log what would happen
      
      if (preferences.email_alerts && preferences.email_frequency === 'immediate') {
        console.log(`[NOTIFICATION] Would send email for alert: ${alert.id}`);
        // In a real implementation:
        // await EmailService.sendAlertEmail(alert.user_id, alert);
      }
      
      if (preferences.push_notifications) {
        console.log(`[NOTIFICATION] Would send push notification for alert: ${alert.id}`);
        // In a real implementation:
        // await PushNotificationService.sendAlert(alert.user_id, alert);
      }
      
      if (preferences.sms_alerts && preferences.phone_number) {
        console.log(`[NOTIFICATION] Would send SMS to ${preferences.phone_number} for alert: ${alert.id}`);
        // In a real implementation:
        // await SmsService.sendAlert(preferences.phone_number, alert);
      }
      
      if (preferences.telegram_alerts && preferences.telegram_chat_id) {
        console.log(`[NOTIFICATION] Would send Telegram message to ${preferences.telegram_chat_id} for alert: ${alert.id}`);
        // In a real implementation:
        // await TelegramService.sendAlert(preferences.telegram_chat_id, alert);
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  }
  
  /**
   * Check alert rules against current data
   * This would be called by a background job or webhook
   */
  static async evaluateAlertRules(farmId: number): Promise<void> {
    try {
      const supabase = await createServerClient();
      
      // Get all active alert rules for this farm
      const { data: rules, error } = await supabase
        .from('alert_rules')
        .select('*')
        .eq('farm_id', farmId)
        .eq('is_active', true);
      
      if (error) throw error;
      if (!rules || rules.length === 0) return;
      
      // For each rule, evaluate conditions
      for (const rule of rules) {
        // Check throttle
        if (rule.last_triggered) {
          const lastTriggered = new Date(rule.last_triggered);
          const now = new Date();
          const diffMinutes = (now.getTime() - lastTriggered.getTime()) / (1000 * 60);
          
          if (diffMinutes < rule.throttle_minutes) {
            // Skip this rule, it was triggered recently
            continue;
          }
        }
        
        // In a real implementation, we would fetch relevant data and evaluate the rule
        // For now, just log that we would check the rule
        console.log(`[ALERT] Would evaluate rule: ${rule.name}`);
        
        // Mark as triggered (this would only happen if conditions are met)
        await supabase
          .from('alert_rules')
          .update({ last_triggered: new Date().toISOString() })
          .eq('id', rule.id);
      }
    } catch (error) {
      console.error('Error evaluating alert rules:', error);
    }
  }
}
