'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  timestamp: Date;
  data?: any;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'timestamp'>) => string;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

interface NotificationProviderProps {
  children: React.ReactNode;
  maxNotifications?: number;
  localStorageKey?: string;
  subscribeToPushEvents?: boolean;
}

export function NotificationProvider({
  children,
  maxNotifications = 100,
  localStorageKey = 'tradingfarm_notifications',
  subscribeToPushEvents = true,
}: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Load notifications from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedNotifications = localStorage.getItem(localStorageKey);
        if (savedNotifications) {
          const parsedNotifications = JSON.parse(savedNotifications);
          // Ensure all timestamp strings are converted back to Date objects
          const fixedNotifications = parsedNotifications.map((notification: any) => ({
            ...notification,
            timestamp: new Date(notification.timestamp)
          }));
          setNotifications(fixedNotifications);
          setUnreadCount(fixedNotifications.filter((n: Notification) => !n.read).length);
        }
      } catch (error) {
        console.error('Failed to load notifications from localStorage:', error);
      }
    }
  }, [localStorageKey]);
  
  // Save notifications to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined' && notifications.length > 0) {
      try {
        localStorage.setItem(localStorageKey, JSON.stringify(notifications));
      } catch (error) {
        console.error('Failed to save notifications to localStorage:', error);
      }
    }
  }, [notifications, localStorageKey]);
  
  // Count unread notifications whenever notifications change
  useEffect(() => {
    const count = notifications.filter(n => !n.read).length;
    setUnreadCount(count);
  }, [notifications]);
  
  // Set up WebSocket or Server-Sent Events for real-time notifications
  useEffect(() => {
    if (!subscribeToPushEvents) return;
    
    // This is a mock implementation. In a real app, you would connect to a real WebSocket or SSE endpoint
    const handlePushNotification = (event: any) => {
      const data = JSON.parse(event.data);
      if (data.type === 'notification') {
        addNotification({
          type: data.notificationType,
          title: data.title,
          message: data.message,
          data: data.data
        });
      }
    };
    
    // Mock WebSocket subscriptions for system events
    const eventTypes = ['system-alerts', 'farm-updates', 'agent-status', 'trading-events'];
    const cleanupFns: (() => void)[] = [];
    
    // In a real implementation, this would use actual WebSockets
    // For now, we just simulate occasional notifications
    const intervalIds = eventTypes.map(type => {
      return setInterval(() => {
        // Simulate a random notification for the given type (only occasionally)
        if (Math.random() > 0.9) { // 10% chance of notification
          const notificationData = simulateNotification(type);
          addNotification(notificationData);
        }
      }, 60000); // Check every minute
    });
    
    // Clean up on unmount
    return () => {
      intervalIds.forEach(id => clearInterval(id));
      cleanupFns.forEach(fn => fn());
    };
  }, [subscribeToPushEvents]);
  
  // Simulate a notification based on the event type
  const simulateNotification = (eventType: string): Omit<Notification, 'id' | 'read' | 'timestamp'> => {
    switch (eventType) {
      case 'system-alerts':
        return {
          type: Math.random() > 0.7 ? 'warning' : 'error',
          title: 'System Alert',
          message: `Detected ${Math.random() > 0.5 ? 'high CPU usage' : 'low disk space'} on server.`,
          data: { source: 'system', metric: Math.random() > 0.5 ? 'cpu' : 'disk' }
        };
      case 'farm-updates':
        return {
          type: 'info',
          title: 'Farm Update',
          message: `Farm ${Math.floor(Math.random() * 10)} has been ${Math.random() > 0.5 ? 'updated' : 'rebalanced'}.`,
          data: { source: 'farm', farmId: `farm-${Math.floor(Math.random() * 10)}` }
        };
      case 'agent-status':
        return {
          type: Math.random() > 0.6 ? 'warning' : 'info',
          title: 'Agent Status',
          message: `Agent ${Math.floor(Math.random() * 20)} is ${Math.random() > 0.6 ? 'experiencing delays' : 'performing normally'}.`,
          data: { source: 'agent', agentId: `agent-${Math.floor(Math.random() * 20)}` }
        };
      case 'trading-events':
        return {
          type: Math.random() > 0.7 ? 'success' : 'info',
          title: 'Trading Event',
          message: `Successfully ${Math.random() > 0.5 ? 'executed' : 'completed'} trade #${Math.floor(Math.random() * 1000)}.`,
          data: { source: 'trading', tradeId: `trade-${Math.floor(Math.random() * 1000)}` }
        };
      default:
        return {
          type: 'info',
          title: 'Notification',
          message: 'You have a new notification.',
          data: { source: 'unknown' }
        };
    }
  };
  
  // Add a notification
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'read' | 'timestamp'>) => {
    const id = uuidv4();
    const newNotification: Notification = {
      ...notification,
      id,
      read: false,
      timestamp: new Date()
    };
    
    setNotifications(prev => {
      // Add new notification at the beginning, then limit the array length
      const updated = [newNotification, ...prev].slice(0, maxNotifications);
      return updated;
    });
    
    return id;
  }, [maxNotifications]);
  
  // Mark a notification as read
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true } 
          : notification
      )
    );
  }, []);
  
  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  }, []);
  
  // Clear all notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);
  
  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        unreadCount
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
} 