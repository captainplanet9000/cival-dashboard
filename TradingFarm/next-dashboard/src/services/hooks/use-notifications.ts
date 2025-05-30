/**
 * Notifications Hook
 * 
 * React hook for interacting with the notification system
 * Provides real-time notifications, alerts, and message management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getNotificationService, Notification } from '../notification-service';
import { MonitoringService } from '../monitoring-service';

export interface UseNotificationsOptions {
  maxNotifications?: number;
  autoLoad?: boolean;
  requestPermission?: boolean;
}

/**
 * Hook for interacting with the notification system
 */
export default function useNotifications(options: UseNotificationsOptions = {}) {
  const { 
    maxNotifications = 20, 
    autoLoad = true,
    requestPermission = true
  } = options;
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  
  // Notification subscription
  const subscription = useRef<(() => void) | null>(null);
  
  // Initialize service
  const notificationService = getNotificationService();
  
  // Request notification permission if needed
  useEffect(() => {
    if (requestPermission && typeof window !== 'undefined') {
      const checkPermission = async () => {
        const granted = await notificationService.requestNotificationPermission();
        setPermissionGranted(granted);
      };
      
      checkPermission();
    }
  }, [requestPermission]);
  
  // Load notifications and set up subscription when component mounts
  useEffect(() => {
    if (autoLoad) {
      loadNotifications();
      setupSubscription();
    }
    
    return () => {
      if (subscription.current) {
        subscription.current();
        subscription.current = null;
      }
    };
  }, [autoLoad]);
  
  /**
   * Set up notification subscription
   */
  const setupSubscription = useCallback(() => {
    // Clean up existing subscription
    if (subscription.current) {
      subscription.current();
      subscription.current = null;
    }
    
    // Set up new subscription
    subscription.current = notificationService.subscribe((notification) => {
      setNotifications((prev) => {
        // Check if notification already exists
        if (prev.some((n) => n.id === notification.id)) {
          return prev;
        }
        
        // Add new notification at the beginning and limit the number
        const updated = [notification, ...prev];
        if (updated.length > maxNotifications) {
          return updated.slice(0, maxNotifications);
        }
        return updated;
      });
      
      // Update unread count
      if (!notification.read) {
        setUnreadCount((prev) => prev + 1);
      }
    });
    
    return () => {
      if (subscription.current) {
        subscription.current();
        subscription.current = null;
      }
    };
  }, [notificationService, maxNotifications]);
  
  /**
   * Load notifications
   */
  const loadNotifications = useCallback(() => {
    setLoading(true);
    setError(null);
    
    try {
      const loadedNotifications = notificationService.getNotifications(maxNotifications);
      setNotifications(loadedNotifications);
      
      // Calculate unread count
      const unread = loadedNotifications.filter((n) => !n.read).length;
      setUnreadCount(unread);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load notifications');
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: 'Failed to load notifications',
        data: { error }
      });
    } finally {
      setLoading(false);
    }
  }, [notificationService, maxNotifications]);
  
  /**
   * Create a new notification
   */
  const createNotification = useCallback(async (
    title: string,
    message: string,
    level: 'info' | 'success' | 'warning' | 'error' = 'info',
    data?: any
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const notification = await notificationService.createNotification(
        title,
        message,
        level,
        data
      );
      
      return notification;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create notification');
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: 'Failed to create notification',
        data: { error, title, message, level }
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [notificationService]);
  
  /**
   * Mark a notification as read
   */
  const markAsRead = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await notificationService.markAsRead(id);
      
      // Update local state
      setNotifications((prev) => 
        prev.map((n) => 
          n.id === id ? { ...n, read: true } : n
        )
      );
      
      // Update unread count
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to mark notification ${id} as read`);
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to mark notification ${id} as read`,
        data: { error, notificationId: id }
      });
    } finally {
      setLoading(false);
    }
  }, [notificationService]);
  
  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      await notificationService.markAllAsRead();
      
      // Update local state
      setNotifications((prev) => 
        prev.map((n) => ({ ...n, read: true }))
      );
      
      // Reset unread count
      setUnreadCount(0);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to mark all notifications as read');
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: 'Failed to mark all notifications as read',
        data: { error }
      });
    } finally {
      setLoading(false);
    }
  }, [notificationService]);
  
  /**
   * Delete a notification
   */
  const deleteNotification = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await notificationService.deleteNotification(id);
      
      // Update local state
      const wasUnread = notifications.some((n) => n.id === id && !n.read);
      
      setNotifications((prev) => 
        prev.filter((n) => n.id !== id)
      );
      
      // Update unread count if needed
      if (wasUnread) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to delete notification ${id}`);
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to delete notification ${id}`,
        data: { error, notificationId: id }
      });
    } finally {
      setLoading(false);
    }
  }, [notificationService, notifications]);
  
  /**
   * Reset error state
   */
  const resetError = useCallback(() => {
    setError(null);
  }, []);
  
  return {
    notifications,
    unreadCount,
    loading,
    error,
    permissionGranted,
    loadNotifications,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    resetError
  };
}
