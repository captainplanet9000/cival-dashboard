'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Agent, Farm } from '@/hooks';

// Notification types
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: any;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

// Create the context
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Provider props
interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { toast } = useToast();

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Set up real-time event subscriptions
  useEffect(() => {
    const supabase = createBrowserClient();
    
    // Listen for agent status changes
    const agentChannel = supabase
      .channel('agent-status-changes')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'agents',
          filter: 'status=eq.error' // Only notify on error status
        }, 
        (payload) => {
          const agent = payload.new as Agent;
          
          addNotification({
            type: 'error',
            title: 'Agent Error',
            message: `Agent ${agent.id.substring(0, 8)}... reported an error.`,
            data: agent
          });
        }
      )
      .subscribe();
    
    // Listen for farm status changes
    const farmChannel = supabase
      .channel('farm-status-changes')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'farms',
          filter: 'status=eq.error' // Only notify on error status
        }, 
        (payload) => {
          const farm = payload.new as Farm;
          
          addNotification({
            type: 'error',
            title: 'Farm Error',
            message: `Farm ${farm.name} reported an error.`,
            data: farm
          });
        }
      )
      .subscribe();
    
    // Clean up subscriptions on unmount
    return () => {
      supabase.removeChannel(agentChannel);
      supabase.removeChannel(farmChannel);
    };
  }, []);

  // Add a new notification
  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: generateId(),
      timestamp: new Date(),
      read: false
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    
    // Also show a toast
    toast({
      title: notification.title,
      description: notification.message,
      variant: notification.type === 'error' ? 'destructive' : 'default',
    });
  };

  // Mark a notification as read
  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  // Clear all notifications
  const clearNotifications = () => {
    setNotifications([]);
  };

  // Generate a unique ID
  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

// Custom hook to use notifications
export function useNotifications() {
  const context = useContext(NotificationContext);
  
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  
  return context;
} 