/**
 * Notification Service
 * Handles delivery of notifications through multiple channels (email, SMS, etc.)
 */

import { createServerClient } from '@/utils/supabase/server';
import { NotificationPreferences, AlertLevel, TradingAlert } from './alert-management-service';
import nodemailer from 'nodemailer';

interface NotificationResult {
  success: boolean;
  channel: string;
  error?: string;
}

export class NotificationService {
  /**
   * Send notifications for an alert based on user preferences
   */
  static async sendNotifications(alert: TradingAlert): Promise<NotificationResult[]> {
    try {
      // Get user notification preferences
      const preferences = await this.getUserNotificationPreferences(alert.user_id);
      
      if (!preferences) {
        console.warn(`No notification preferences found for user ${alert.user_id}`);
        return [{ success: true, channel: 'ui' }]; // Default to UI only
      }
      
      // Check if this alert meets the minimum level
      const alertLevelPriority = { 'info': 1, 'warning': 2, 'error': 3 };
      const minLevelPriority = alertLevelPriority[preferences.min_alert_level];
      const currentAlertPriority = alertLevelPriority[alert.level];
      
      if (currentAlertPriority < minLevelPriority) {
        console.log(`Alert ${alert.id} priority (${alert.level}) is below user minimum threshold (${preferences.min_alert_level})`);
        return [{ success: true, channel: 'none', error: 'Below minimum alert level' }];
      }
      
      // Check quiet hours
      if (this.isInQuietHours(preferences) && alert.level !== 'error') {
        console.log(`Alert ${alert.id} suppressed due to quiet hours`);
        return [{ success: true, channel: 'none', error: 'In quiet hours' }];
      }
      
      // Send notifications through enabled channels
      const results: NotificationResult[] = [];
      
      // UI notification is always enabled (stored in database)
      results.push({ success: true, channel: 'ui' });
      
      // Email notifications
      if (preferences.email_alerts && this.shouldSendEmail(preferences, alert)) {
        try {
          await this.sendEmailNotification(alert, preferences);
          results.push({ success: true, channel: 'email' });
        } catch (error) {
          console.error('Error sending email notification:', error);
          results.push({ 
            success: false, 
            channel: 'email', 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      }
      
      // SMS notifications
      if (preferences.sms_alerts && preferences.phone_number) {
        try {
          await this.sendSmsNotification(alert, preferences);
          results.push({ success: true, channel: 'sms' });
        } catch (error) {
          console.error('Error sending SMS notification:', error);
          results.push({ 
            success: false, 
            channel: 'sms', 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      }
      
      // Telegram notifications
      if (preferences.telegram_alerts && preferences.telegram_chat_id) {
        try {
          await this.sendTelegramNotification(alert, preferences);
          results.push({ success: true, channel: 'telegram' });
        } catch (error) {
          console.error('Error sending Telegram notification:', error);
          results.push({ 
            success: false, 
            channel: 'telegram', 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      }
      
      // Record notification delivery in database
      await this.recordNotificationDelivery(alert.id!, results);
      
      return results;
    } catch (error) {
      console.error('Error sending notifications:', error);
      return [{ 
        success: false, 
        channel: 'all', 
        error: error instanceof Error ? error.message : String(error) 
      }];
    }
  }
  
  /**
   * Get user notification preferences
   */
  private static async getUserNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const supabase = await createServerClient();
      
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      return null;
    }
  }
  
  /**
   * Check if current time is within quiet hours
   */
  private static isInQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quiet_hours_start || !preferences.quiet_hours_end) {
      return false;
    }
    
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
    if (startTime < endTime) {
      // Normal case (e.g., 22:00 to 06:00)
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Overnight case (e.g., 22:00 to 06:00)
      return currentTime >= startTime || currentTime <= endTime;
    }
  }
  
  /**
   * Check if email should be sent based on frequency setting
   */
  private static shouldSendEmail(preferences: NotificationPreferences, alert: TradingAlert): boolean {
    // For critical alerts, always send immediately
    if (alert.level === 'error') {
      return true;
    }
    
    // For other levels, check frequency
    switch (preferences.email_frequency) {
      case 'immediate':
        return true;
      case 'hourly':
      case 'daily':
        // In a real implementation, we would queue these for digest emails
        // For now, just log and return false
        console.log(`Alert ${alert.id} queued for ${preferences.email_frequency} digest email`);
        return false;
      default:
        return true;
    }
  }
  
  /**
   * Send email notification
   */
  private static async sendEmailNotification(
    alert: TradingAlert,
    preferences: NotificationPreferences
  ): Promise<void> {
    // In a production environment, this would use a real email service
    // For now, we'll just log the email that would be sent
    
    console.log(`[EMAIL NOTIFICATION] Would send email for alert: ${alert.id}`);
    console.log(`Subject: ${this.getAlertSubject(alert)}`);
    console.log(`Body: ${this.getAlertEmailBody(alert)}`);
    
    // For a real implementation, uncomment the following:
    /*
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: userEmail, // You would need to get this from the user profile
      subject: this.getAlertSubject(alert),
      html: this.getAlertEmailBody(alert),
    };
    
    await transporter.sendMail(mailOptions);
    */
  }
  
  /**
   * Send SMS notification
   */
  private static async sendSmsNotification(
    alert: TradingAlert,
    preferences: NotificationPreferences
  ): Promise<void> {
    // In a production environment, this would use a real SMS service like Twilio
    // For now, we'll just log the SMS that would be sent
    
    console.log(`[SMS NOTIFICATION] Would send SMS to ${preferences.phone_number} for alert: ${alert.id}`);
    console.log(`Message: ${this.getAlertSmsText(alert)}`);
    
    // For a real implementation with Twilio, you would use:
    /*
    const twilioClient = require('twilio')(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    
    await twilioClient.messages.create({
      body: this.getAlertSmsText(alert),
      from: process.env.TWILIO_PHONE_NUMBER,
      to: preferences.phone_number
    });
    */
  }
  
  /**
   * Send Telegram notification
   */
  private static async sendTelegramNotification(
    alert: TradingAlert,
    preferences: NotificationPreferences
  ): Promise<void> {
    // In a production environment, this would use the Telegram Bot API
    // For now, we'll just log the message that would be sent
    
    console.log(`[TELEGRAM NOTIFICATION] Would send message to chat ID ${preferences.telegram_chat_id} for alert: ${alert.id}`);
    console.log(`Message: ${this.getAlertTelegramText(alert)}`);
    
    // For a real implementation, you would use:
    /*
    const response = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: preferences.telegram_chat_id,
          text: this.getAlertTelegramText(alert),
          parse_mode: 'HTML',
        }),
      }
    );
    
    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(`Telegram API error: ${data.description}`);
    }
    */
  }
  
  /**
   * Record notification delivery in database
   */
  private static async recordNotificationDelivery(
    alertId: number,
    results: NotificationResult[]
  ): Promise<void> {
    try {
      const supabase = await createServerClient();
      
      const deliveryRecord = {
        alert_id: alertId,
        channels_attempted: results.map(r => r.channel),
        successful_channels: results.filter(r => r.success).map(r => r.channel),
        failed_channels: results.filter(r => !r.success).map(r => r.channel),
        errors: results.filter(r => r.error).map(r => ({ channel: r.channel, error: r.error })),
        delivered_at: new Date().toISOString(),
      };
      
      // In a real implementation, you would store this in a notification_deliveries table
      console.log('Notification delivery record:', deliveryRecord);
    } catch (error) {
      console.error('Error recording notification delivery:', error);
    }
  }
  
  /**
   * Get alert email subject
   */
  private static getAlertSubject(alert: TradingAlert): string {
    const prefix = this.getAlertLevelPrefix(alert.level);
    const type = alert.alert_type.replace(/_/g, ' ');
    return `${prefix} Trading Farm Alert: ${type}`;
  }
  
  /**
   * Get alert email body
   */
  private static getAlertEmailBody(alert: TradingAlert): string {
    const levelColor = this.getAlertLevelColor(alert.level);
    const levelText = this.getAlertLevelText(alert.level);
    
    let detailsHtml = '';
    if (alert.details && Object.keys(alert.details).length > 0) {
      detailsHtml = '<h3>Details:</h3><ul>';
      for (const [key, value] of Object.entries(alert.details)) {
        detailsHtml += `<li><strong>${key}:</strong> ${value}</li>`;
      }
      detailsHtml += '</ul>';
    }
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
          <h2 style="margin-top: 0; color: ${levelColor};">${levelText} Alert</h2>
          <p style="font-size: 16px; line-height: 1.5;">${alert.message}</p>
          <p style="font-size: 14px; color: #666;">Alert Type: ${alert.alert_type.replace(/_/g, ' ')}</p>
          <p style="font-size: 14px; color: #666;">Time: ${new Date(alert.created_at!).toLocaleString()}</p>
        </div>
        ${detailsHtml}
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
          <p>This is an automated notification from Trading Farm. You can manage your notification preferences in your account settings.</p>
        </div>
      </div>
    `;
  }
  
  /**
   * Get alert SMS text
   */
  private static getAlertSmsText(alert: TradingAlert): string {
    const prefix = this.getAlertLevelPrefix(alert.level);
    return `${prefix} Trading Farm: ${alert.message}`;
  }
  
  /**
   * Get alert Telegram text
   */
  private static getAlertTelegramText(alert: TradingAlert): string {
    const levelEmoji = this.getAlertLevelEmoji(alert.level);
    const typeFormatted = alert.alert_type.replace(/_/g, ' ');
    
    let detailsText = '';
    if (alert.details && Object.keys(alert.details).length > 0) {
      detailsText = '\n\n<b>Details:</b>\n';
      for (const [key, value] of Object.entries(alert.details)) {
        detailsText += `- <b>${key}:</b> ${value}\n`;
      }
    }
    
    return `${levelEmoji} <b>Trading Farm Alert</b> ${levelEmoji}\n\n${alert.message}\n\n<b>Type:</b> ${typeFormatted}${detailsText}`;
  }
  
  /**
   * Get alert level prefix
   */
  private static getAlertLevelPrefix(level: AlertLevel): string {
    switch (level) {
      case 'error':
        return '[CRITICAL]';
      case 'warning':
        return '[WARNING]';
      case 'info':
        return '[INFO]';
      default:
        return '';
    }
  }
  
  /**
   * Get alert level text
   */
  private static getAlertLevelText(level: AlertLevel): string {
    switch (level) {
      case 'error':
        return 'Critical';
      case 'warning':
        return 'Warning';
      case 'info':
        return 'Information';
      default:
        return 'Alert';
    }
  }
  
  /**
   * Get alert level color
   */
  private static getAlertLevelColor(level: AlertLevel): string {
    switch (level) {
      case 'error':
        return '#dc3545';
      case 'warning':
        return '#ffc107';
      case 'info':
        return '#0d6efd';
      default:
        return '#6c757d';
    }
  }
  
  /**
   * Get alert level emoji
   */
  private static getAlertLevelEmoji(level: AlertLevel): string {
    switch (level) {
      case 'error':
        return '🚨';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '🔔';
    }
  }
}
