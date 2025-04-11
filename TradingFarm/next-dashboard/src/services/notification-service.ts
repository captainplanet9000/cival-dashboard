/**
 * Notification Service
 * 
 * Provides real-time notifications and alerts for the Trading Farm dashboard
 * Supports Server-Sent Events (SSE), WebSockets, and in-app notifications
 */

import { createBrowserClient } from '@/utils/supabase/client';
import { MonitoringService } from './monitoring-service';

type NotificationLevel = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  title: string;
  message: string;
  level: NotificationLevel;
  timestamp: string;
  read: boolean;
  data?: any;
  source: string;
  expiresAt?: string;
  actions?: {
    label: string;
    action: string;
    data?: any;
  }[];
}

type NotificationCallback = (notification: Notification) => void;

export class NotificationService {
  private static instance: NotificationService;
  private notifications: Notification[] = [];
  private subscribers: Set<NotificationCallback> = new Set();
  private eventSource: EventSource | null = null;
  private supabaseSubscription: any = null;
  private notificationCount = 0;
  
  private constructor() {
    this.initializeSubscriptions();
  }
  
  // Singleton pattern
  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }
  
  /**
   * Initialize subscriptions for real-time notifications
   */
  private initializeSubscriptions(): void {
    if (typeof window === 'undefined') return; // Skip on server-side
    
    try {
      // Set up SSE for system notifications
      this.setupSSEConnection();
      
      // Set up Supabase real-time subscription for user notifications
      this.setupSupabaseSubscription();
    } catch (error) {
      MonitoringService.logEvent({
        type: 'system.error',
        message: 'Failed to initialize notification subscriptions',
        data: { error }
      });
    }
  }
  
  /**
   * Set up Server-Sent Events connection
   */
  private setupSSEConnection(): void {
    try {
      this.eventSource = new EventSource('/api/notifications/events');
      
      this.eventSource.onopen = () => {
        MonitoringService.logEvent({
          type: 'info',
          message: 'Notification SSE connection established',
          data: {}
        });
      };
      
      this.eventSource.onmessage = (event) => {
        try {
          const notification: Notification = JSON.parse(event.data);
          this.addNotification(notification);
        } catch (error) {
          MonitoringService.logEvent({
            type: 'error',
            message: 'Failed to parse notification event',
            data: { error, rawData: event.data }
          });
        }
      };
      
      this.eventSource.onerror = (error) => {
        MonitoringService.logEvent({
          type: 'error',
          message: 'Notification SSE connection error',
          data: { error }
        });
        
        // Reconnect after delay
        setTimeout(() => {
          this.closeSSEConnection();
          this.setupSSEConnection();
        }, 5000);
      };
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: 'Failed to setup notification SSE connection',
        data: { error }
      });
    }
  }
  
  /**
   * Close SSE connection
   */
  private closeSSEConnection(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
  
  /**
   * Set up Supabase real-time subscription
   */
  private async setupSupabaseSubscription(): Promise<void> {
    try {
      const supabase = createBrowserClient();
      
      // Subscribe to user_notifications table
      this.supabaseSubscription = supabase
        .channel('notification-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_notifications'
          },
          (payload) => {
            // Transform into our notification format
            const data = payload.new;
            const notification: Notification = {
              id: data.id,
              title: data.title,
              message: data.message,
              level: data.level || 'info',
              timestamp: data.created_at,
              read: data.read || false,
              data: data.data,
              source: 'database'
            };
            
            this.addNotification(notification);
          }
        )
        .subscribe();
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: 'Failed to setup Supabase notification subscription',
        data: { error }
      });
    }
  }
  
  /**
   * Add a new notification and notify subscribers
   */
  private addNotification(notification: Notification): void {
    // Add unique ID if not present
    if (!notification.id) {
      notification.id = `notification-${Date.now()}-${++this.notificationCount}`;
    }
    
    // Add to local cache
    this.notifications.unshift(notification);
    
    // Keep only the most recent 100 notifications
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100);
    }
    
    // Notify subscribers
    this.notifySubscribers(notification);
    
    // Show browser notification if the page is not visible
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      this.showBrowserNotification(notification);
    }
  }
  
  /**
   * Notify all subscribers of a new notification
   */
  private notifySubscribers(notification: Notification): void {
    this.subscribers.forEach((callback) => {
      try {
        callback(notification);
      } catch (error) {
        MonitoringService.logEvent({
          type: 'error',
          message: 'Error in notification subscriber callback',
          data: { error }
        });
      }
    });
  }
  
  /**
   * Show a browser notification
   */
  private showBrowserNotification(notification: Notification): void {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return;
    }
    
    try {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico'
      });
    } catch (error) {
      // Silently fail if browser notifications aren't supported
    }
  }
  
  /**
   * Subscribe to notifications
   */
  public subscribe(callback: NotificationCallback): () => void {
    this.subscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }
  
  /**
   * Get recent notifications
   */
  public getNotifications(limit: number = 20): Notification[] {
    return this.notifications.slice(0, limit);
  }
  
  /**
   * Create a new notification
   */
  public async createNotification(
    title: string,
    message: string,
    level: NotificationLevel = 'info',
    data?: any
  ): Promise<Notification> {
    const notification: Notification = {
      id: `local-${Date.now()}-${++this.notificationCount}`,
      title,
      message,
      level,
      timestamp: new Date().toISOString(),
      read: false,
      data,
      source: 'local'
    };
    
    this.addNotification(notification);
    
    // Also persist the notification to the database
    try {
      const supabase = createBrowserClient();
      
      await supabase
        .from('user_notifications')
        .insert({
          title,
          message,
          level,
          data,
          read: false
        });
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: 'Failed to persist notification to database',
        data: { error, notification }
      });
    }
    
    return notification;
  }
  
  /**
   * Mark a notification as read
   */
  public async markAsRead(id: string): Promise<void> {
    // Update local cache
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
    }
    
    // Update in database if it's a database notification
    if (notification && notification.source === 'database') {
      try {
        const supabase = createBrowserClient();
        
        await supabase
          .from('user_notifications')
          .update({ read: true })
          .eq('id', id);
      } catch (error) {
        MonitoringService.logEvent({
          type: 'error',
          message: 'Failed to mark notification as read in database',
          data: { error, notificationId: id }
        });
      }
    }
  }
  
  /**
   * Mark all notifications as read
   */
  public async markAllAsRead(): Promise<void> {
    // Update local cache
    this.notifications.forEach(notification => {
      notification.read = true;
    });
    
    // Update all in database
    try {
      const supabase = createBrowserClient();
      
      await supabase
        .from('user_notifications')
        .update({ read: true })
        .eq('read', false);
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: 'Failed to mark all notifications as read in database',
        data: { error }
      });
    }
  }
  
  /**
   * Delete a notification
   */
  public async deleteNotification(id: string): Promise<void> {
    // Remove from local cache
    this.notifications = this.notifications.filter(n => n.id !== id);
    
    // Delete from database if it's a database notification
    const notification = this.notifications.find(n => n.id === id);
    if (notification && notification.source === 'database') {
      try {
        const supabase = createBrowserClient();
        
        await supabase
          .from('user_notifications')
          .delete()
          .eq('id', id);
      } catch (error) {
        MonitoringService.logEvent({
          type: 'error',
          message: 'Failed to delete notification from database',
          data: { error, notificationId: id }
        });
      }
    }
  }
  
  /**
   * Request browser notification permission
   */
  public async requestNotificationPermission(): Promise<boolean> {
    if (typeof Notification === 'undefined') {
      return false;
    }
    
    if (Notification.permission === 'granted') {
      return true;
    }
    
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    
    return false;
  }
  
  /**
   * Clean up resources
   */
  public dispose(): void {
    this.closeSSEConnection();
    
    if (this.supabaseSubscription) {
      this.supabaseSubscription.unsubscribe();
      this.supabaseSubscription = null;
    }
    
    this.subscribers.clear();
  }
}

// Export singleton getter
export const getNotificationService = (): NotificationService => NotificationService.getInstance();
