'use client';

import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  Clock,
  Check,
  Trash2,
  Settings
} from 'lucide-react';
import { logEvent } from '@/utils/logging';
import { useNotificationsData, Notification } from '@/hooks/useNotificationsData';

interface NotificationsModalProps {
  userId?: string;
  filter?: 'all' | 'unread' | 'important';
  isOpen: boolean;
  onClose: () => void;
}

// Notification interface is now imported from useNotificationsData hook
// Note: The imported interface uses snake_case (is_read, is_important) while our component uses camelCase
// We'll handle the conversion in our component

export function NotificationsModal({ userId, filter = 'all', isOpen, onClose }: NotificationsModalProps) {
  const [activeTab, setActiveTab] = React.useState<'all' | 'unread' | 'important'>(filter);
  const [selectedNotificationIds, setSelectedNotificationIds] = React.useState<string[]>([]);
  const [processing, setProcessing] = React.useState(false);
  
  // Use our custom hook to fetch and manage notifications data
  const {
    notifications: rawNotifications,
    loading,
    error,
    isConnected,
    markAsRead,
    deleteNotifications
  } = useNotificationsData({ userId, filter: activeTab });
  
  // Convert from snake_case to camelCase for component use
  const notifications = React.useMemo(() => {
    return rawNotifications.map((notification: Notification) => ({
      ...notification,
      isRead: notification.is_read,
      isImportant: notification.is_important,
      // Keep original properties for database operations
    }));
  }, [rawNotifications]);
  
  // Update active tab and clear selections when changed
  const handleTabChange = (value: string) => {
    setActiveTab(value as 'all' | 'unread' | 'important');
    setSelectedNotificationIds([]);
  };

  const handleMarkAsRead = async (notificationIds: string[]) => {
    if (notificationIds.length === 0) return;
    
    setProcessing(true);
    try {
      await markAsRead(notificationIds);
      setSelectedNotificationIds([]);
    } catch (err) {
      console.error('Error marking notifications as read:', err);
      alert('Failed to mark notifications as read');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (notificationIds: string[]) => {
    if (notificationIds.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${notificationIds.length} notification(s)?`)) {
      return;
    }
    
    setProcessing(true);
    try {
      await deleteNotifications(notificationIds);
      setSelectedNotificationIds([]);
    } catch (err) {
      console.error('Error deleting notifications:', err);
      alert('Failed to delete notifications');
    } finally {
      setProcessing(false);
    }
  };

  const toggleSelect = (notificationId: string) => {
    setSelectedNotificationIds((prev: string[]) => 
      prev.includes(notificationId)
        ? prev.filter((id: string) => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  const selectAll = () => {
    if (selectedNotificationIds.length === notifications.length) {
      setSelectedNotificationIds([]);
    } else {
      setSelectedNotificationIds(notifications.map(n => n.id));
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin} min ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(openState: boolean) => !openState && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Notifications
            {!loading && (
              <Badge variant="secondary" className="ml-2">
                {notifications.length}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Stay updated with system alerts, trade notifications, and important updates
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">Unread</TabsTrigger>
            <TabsTrigger value="important">Important</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-0 h-[400px] flex flex-col">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <AlertCircle className="h-12 w-12 mb-4 text-destructive" />
                <p>Error loading notifications</p>
                <p className="text-sm mt-1">{error.message}</p>
                <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
              </div>
            ) : notifications.length > 0 ? (
              <>
                <div className="flex justify-between items-center mb-2 px-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={selectAll}
                    className="text-xs"
                  >
                    {selectedNotificationIds.length === notifications.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  
                  <div className="flex gap-1">
                    {selectedNotificationIds.length > 0 && (
                      <>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleMarkAsRead(selectedNotificationIds)}
                          className="text-xs"
                          disabled={processing}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          {processing ? 'Processing...' : 'Mark Read'}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDelete(selectedNotificationIds)}
                          className="text-xs text-destructive"
                          disabled={processing}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          {processing ? 'Processing...' : 'Delete'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                
                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-2">
                    {notifications.map(notification => (
                      <div 
                        key={notification.id} 
                        className={`p-3 rounded-md border flex ${
                          notification.isRead ? 'bg-background' : 'bg-muted/30'
                        } ${
                          selectedNotificationIds.includes(notification.id) ? 'ring-1 ring-primary' : ''
                        }`}
                        onClick={() => toggleSelect(notification.id)}
                      >
                        <div className="mr-3 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium flex items-center">
                              {notification.title}
                              {notification.isImportant && (
                                <Badge variant="secondary" className="ml-2 text-xs h-4">
                                  Important
                                </Badge>
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatTimeAgo(notification.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">
                            {notification.message}
                          </p>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-xs text-muted-foreground">
                              {notification.source}
                            </span>
                            <div className="flex gap-1">
                              {!notification.isRead && (
                                <Button 
                                  variant="ghost" 
                                  size="xs" 
                                  className="h-6 px-2 text-xs"
                                  disabled={processing}
                                  onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    handleMarkAsRead([notification.id]);
                                  }}
                                >
                                  {processing ? '...' : 'Mark as read'}
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 px-2 text-xs text-destructive"
                                disabled={processing}
                                onClick={(e: React.MouseEvent) => {
                                  e.stopPropagation();
                                  handleDelete([notification.id]);
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Bell className="h-12 w-12 mb-4 text-muted" />
                <p>No notifications found</p>
                <p className="text-sm mt-1">
                  {activeTab === 'all' 
                    ? "You don't have any notifications yet" 
                    : activeTab === 'unread' 
                      ? "You don't have any unread notifications" 
                      : "You don't have any important notifications"}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="sm:justify-between">
          <Button 
            variant="outline" 
            size="sm" 
            className="hidden sm:flex items-center"
            onClick={() => {
              // In a real implementation, this would navigate to the settings page
              alert('This would navigate to notification settings');
            }}
          >
            <Settings className="h-4 w-4 mr-2" />
            Notification Settings
          </Button>
          <Button 
            size="sm" 
            disabled={processing || !notifications.some((n: any) => !n.isRead)}
            onClick={async () => {
              // Mark all as read
              await handleMarkAsRead(notifications.filter((n: any) => !n.isRead).map((n: any) => n.id));
              onClose();
            }}
          >
            <Check className="h-4 w-4 mr-2" />
            {processing ? 'Processing...' : 'Mark All as Read & Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
