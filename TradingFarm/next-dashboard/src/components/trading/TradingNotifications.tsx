import { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { createBrowserClient } from '@/utils/supabase/client';
import { Bell, CheckCircle, AlertCircle, TrendingUp, TrendingDown, Zap, MailOpen, RefreshCw } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TradingNotification {
  id: string;
  user_id: string;
  type: 'trade' | 'signal' | 'risk' | 'system';
  title: string;
  message: string;
  metadata: any;
  is_read: boolean;
  created_at: string;
  priority: 'low' | 'medium' | 'high';
}

interface NotificationPreferences {
  email_enabled: boolean;
  push_enabled: boolean;
  trade_executed: boolean;
  signal_generated: boolean;
  position_threshold: boolean;
  risk_alert: boolean;
  system_notification: boolean;
}

interface TradingNotificationsProps {
  userId: string;
}

export function TradingNotifications({ userId }: TradingNotificationsProps) {
  const [notifications, setNotifications] = useState<TradingNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_enabled: true,
    push_enabled: false,
    trade_executed: true,
    signal_generated: true,
    position_threshold: true,
    risk_alert: true,
    system_notification: true,
  });
  const [showPreferences, setShowPreferences] = useState(false);
  const supabase = createBrowserClient();
  const { toast } = useToast();
  
  // Load notifications
  useEffect(() => {
    fetchNotifications();
    fetchPreferences();
    
    // Subscribe to notifications
    const channel = supabase
      .channel('trading_notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'trading_notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        // Add new notification to state
        setNotifications(prev => [payload.new as TradingNotification, ...prev]);
        
        // Show toast for high priority notifications
        if (payload.new.priority === 'high') {
          toast({
            title: payload.new.title,
            description: payload.new.message,
            variant: 'destructive',
          });
        }
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
  
  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setRefreshing(true);
      const { data, error } = await supabase
        .from('trading_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (error) throw error;
      
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to load notifications',
        description: 'There was an error loading your notifications.'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Fetch notification preferences
  const fetchPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();
        
      if (error) {
        if (error.code !== 'PGRST116') { // Not found error
          throw error;
        }
        // If preferences don't exist, we'll use the defaults
        return;
      }
      
      if (data) {
        setPreferences(data);
      }
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
    }
  };
  
  // Mark a notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      // Update local state first for UI responsiveness
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true } 
            : notification
        )
      );
      
      // Update in database
      const { error } = await supabase
        .from('trading_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
        
      if (error) throw error;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to update notification',
        description: 'There was an error marking notification as read.'
      });
    }
  };
  
  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      // Update local state first
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, is_read: true }))
      );
      
      // Update in database
      const { error } = await supabase
        .from('trading_notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .is('is_read', false);
        
      if (error) throw error;
      
      toast({
        title: 'All notifications marked as read',
        description: 'All notifications have been marked as read.'
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to update notifications',
        description: 'There was an error marking notifications as read.'
      });
    }
  };
  
  // Update notification preferences
  const updatePreferences = async () => {
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          ...preferences
        });
        
      if (error) throw error;
      
      toast({
        title: 'Preferences updated',
        description: 'Your notification preferences have been updated.'
      });
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to update preferences',
        description: 'There was an error updating your notification preferences.'
      });
    }
  };
  
  // Toggle a preference
  const togglePreference = (key: keyof NotificationPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  
  // Get the icon for a notification type
  const getNotificationIcon = (type: string, priority: string) => {
    switch (type) {
      case 'trade':
        return priority === 'high' 
          ? <AlertCircle className="h-5 w-5 text-red-500" /> 
          : <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'signal':
        return priority === 'high'
          ? <Zap className="h-5 w-5 text-amber-500" />
          : type === 'buy' 
            ? <TrendingUp className="h-5 w-5 text-blue-500" />
            : <TrendingDown className="h-5 w-5 text-purple-500" />;
      case 'risk':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'system':
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };
  
  // Get color for the notification card based on type and priority
  const getNotificationColor = (type: string, priority: string, isRead: boolean) => {
    if (isRead) return '';
    
    if (priority === 'high') return 'border-l-4 border-l-red-500';
    
    switch (type) {
      case 'trade': return 'border-l-4 border-l-green-500';
      case 'signal': return 'border-l-4 border-l-blue-500';
      case 'risk': return 'border-l-4 border-l-amber-500';
      default: return '';
    }
  };
  
  // Format the notification time
  const formatNotificationTime = (timestamp: string) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInHours = (now.getTime() - notificationTime.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return formatDistanceToNow(notificationTime, { addSuffix: true });
    }
    
    return format(notificationTime, 'MMM d, yyyy');
  };
  
  // Count unread notifications
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <CardTitle>Notifications</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowPreferences(!showPreferences)}
            >
              {showPreferences ? 'Hide Preferences' : 'Preferences'}
            </Button>
            <Button variant="ghost" size="icon" onClick={fetchNotifications} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <CardDescription>
          Trading alerts and system notifications
        </CardDescription>
      </CardHeader>
      
      {showPreferences ? (
        <CardContent>
          <div className="space-y-4">
            <h3 className="font-medium">Notification Channels</h3>
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                </div>
                <Switch 
                  id="email-notifications" 
                  checked={preferences.email_enabled} 
                  onCheckedChange={() => togglePreference('email_enabled')} 
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="push-notifications">Push Notifications</Label>
                </div>
                <Switch 
                  id="push-notifications" 
                  checked={preferences.push_enabled} 
                  onCheckedChange={() => togglePreference('push_enabled')} 
                />
              </div>
            </div>
            
            <h3 className="font-medium pt-2">Notification Types</h3>
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="trade-executed">Trade Executed</Label>
                </div>
                <Switch 
                  id="trade-executed" 
                  checked={preferences.trade_executed} 
                  onCheckedChange={() => togglePreference('trade_executed')} 
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="signal-generated">Signal Generated</Label>
                </div>
                <Switch 
                  id="signal-generated" 
                  checked={preferences.signal_generated} 
                  onCheckedChange={() => togglePreference('signal_generated')} 
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="position-threshold">Position Thresholds</Label>
                </div>
                <Switch 
                  id="position-threshold" 
                  checked={preferences.position_threshold} 
                  onCheckedChange={() => togglePreference('position_threshold')} 
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="risk-alert">Risk Alerts</Label>
                </div>
                <Switch 
                  id="risk-alert" 
                  checked={preferences.risk_alert} 
                  onCheckedChange={() => togglePreference('risk_alert')} 
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="system-notification">System Notifications</Label>
                </div>
                <Switch 
                  id="system-notification" 
                  checked={preferences.system_notification} 
                  onCheckedChange={() => togglePreference('system_notification')} 
                />
              </div>
            </div>
            
            <div className="pt-4">
              <Button onClick={updatePreferences}>Save Preferences</Button>
            </div>
          </div>
        </CardContent>
      ) : (
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40">
              <Bell className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] px-4">
              <div className="space-y-2 py-2">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`border rounded-lg p-3 bg-card/50 transition-colors ${
                      getNotificationColor(notification.type, notification.priority, notification.is_read)
                    } ${notification.is_read ? 'bg-background/50' : 'bg-background shadow-sm'}`}
                    onClick={() => !notification.is_read && markAsRead(notification.id)}
                  >
                    <div className="flex items-start">
                      <div className="mr-3 mt-0.5">
                        {getNotificationIcon(notification.type, notification.priority)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h4 className="font-medium truncate mr-2">{notification.title}</h4>
                          <div className="flex items-center">
                            <span className="text-xs text-muted-foreground">
                              {formatNotificationTime(notification.created_at)}
                            </span>
                            {!notification.is_read && (
                              <span className="ml-2 w-2 h-2 rounded-full bg-blue-500"></span>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{notification.message}</p>
                        
                        {/* Display metadata if available */}
                        {notification.metadata && (
                          <div className="mt-2 text-xs bg-muted p-2 rounded">
                            {notification.type === 'trade' && (
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="outline">
                                  {notification.metadata.symbol}
                                </Badge>
                                <span>
                                  {notification.metadata.side === 'buy' ? 'Buy' : 'Sell'} @ ${notification.metadata.price}
                                </span>
                                <span>
                                  Qty: {notification.metadata.quantity}
                                </span>
                              </div>
                            )}
                            
                            {notification.type === 'risk' && (
                              <div>
                                {notification.metadata.message || JSON.stringify(notification.metadata)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {!notification.is_read && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="ml-2 h-7 w-7" 
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                        >
                          <MailOpen className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      )}
      
      <CardFooter className="flex justify-between">
        <Button 
          variant="ghost" 
          size="sm" 
          disabled={!notifications.some(n => !n.is_read)}
          onClick={markAllAsRead}
        >
          Mark all as read
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          asChild
        >
          <a href="/dashboard/trading/notifications">View All</a>
        </Button>
      </CardFooter>
    </Card>
  );
}
