import * as React from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { useSupabaseRealtime } from './useSupabaseRealtime';
import { logEvent } from '@/utils/logging';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  is_read: boolean;
  is_important: boolean;
  timestamp: string;
  source: string;
  action_url?: string;
  user_id: string;
}

interface NotificationsFilter {
  userId?: string;
  filter?: 'all' | 'unread' | 'important';
}

export function useNotificationsData({ userId, filter = 'all' }: NotificationsFilter) {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const supabase = createBrowserClient();
  
  // Subscribe to realtime updates for notifications
  const { isConnected } = useSupabaseRealtime('notifications', ['notifications', filter]);

  React.useEffect(() => {
    async function fetchNotifications() {
      setLoading(true);
      setError(null);
      
      try {
        // Start building query
        let query = supabase
          .from('notifications')
          .select('*')
          .order('timestamp', { ascending: false });
        
        // Apply user filter if provided
        if (userId) {
          query = query.eq('user_id', userId);
        }
        
        // Apply category filter
        if (filter === 'unread') {
          query = query.eq('is_read', false);
        } else if (filter === 'important') {
          query = query.eq('is_important', true);
        }
        
        // Execute query
        const { data, error } = await query;
        
        if (error) throw error;
        
        if (data) {
          setNotifications(data as Notification[]);
          
          // Log event
          logEvent({
            category: 'notifications',
            action: 'fetch',
            label: filter,
            value: data.length
          });
        }
      } catch (err) {
        console.error('Error fetching notifications:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        
        // Log error
        logEvent({
          category: 'error',
          action: 'fetch_notifications_error',
          label: filter,
          value: 1
        });
      } finally {
        setLoading(false);
      }
    }
    
    fetchNotifications();
  }, [supabase, userId, filter]);

  // Function to mark notifications as read
  const markAsRead = async (notificationIds: string[]) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', notificationIds);
      
      if (error) throw error;
      
      // Optimistically update local state
      setNotifications((prev: Notification[]) => 
        prev.map((notification: Notification) => 
          notificationIds.includes(notification.id) 
            ? { ...notification, is_read: true } 
            : notification
        )
      );
      
      // Log event
      logEvent({
        category: 'notifications',
        action: 'mark_as_read',
        label: 'bulk',
        value: notificationIds.length
      });
      
      return true;
    } catch (err) {
      console.error('Error marking notifications as read:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      return false;
    }
  };

  // Function to delete notifications
  const deleteNotifications = async (notificationIds: string[]) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .in('id', notificationIds);
      
      if (error) throw error;
      
      // Optimistically update local state
      setNotifications((prev: Notification[]) => 
        prev.filter((notification: Notification) => !notificationIds.includes(notification.id))
      );
      
      // Log event
      logEvent({
        category: 'notifications',
        action: 'delete',
        label: 'bulk',
        value: notificationIds.length
      });
      
      return true;
    } catch (err) {
      console.error('Error deleting notifications:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      return false;
    }
  };

  return {
    notifications,
    loading,
    error,
    isConnected,
    markAsRead,
    deleteNotifications
  };
}
