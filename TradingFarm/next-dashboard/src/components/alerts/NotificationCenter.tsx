import { useState, useEffect } from 'react';
import { Bell, CheckCircle2, AlertCircle, Info, Activity, X, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { Switch } from '@/components/ui/switch';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

export function NotificationCenter() {
  const { toast } = useToast();
  const supabase = createClientComponentClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);

  // Fetch notifications
  useEffect(() => {
    fetchNotifications();
    
    // Set up real-time subscription for new notifications
    const subscription = setupRealtimeSubscription();
    
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Update unread count whenever notifications change
  useEffect(() => {
    setUnreadCount(notifications.filter(notification => !notification.read).length);
  }, [notifications]);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      // In a production app, this would fetch from an API
      const { data: session } = await supabase.auth.getSession();
      
      if (!session?.user) {
        throw new Error("User not authenticated");
      }

      // Call API to get notifications
      const response = await fetch('/api/notifications');
      
      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }

      const data = await response.json();
      setNotifications(data);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      // Use mock data for demonstration
      setNotifications(getMockNotifications());
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    // In a real app, this would subscribe to a WebSocket or other real-time channel
    // For now, simulate with mock updates
    const interval = setInterval(() => {
      if (notificationsEnabled && Math.random() > 0.7) {
        const newNotification = generateMockNotification();
        setNotifications(prev => [newNotification, ...prev]);
        
        // Show a toast for new notifications
        toast({
          title: newNotification.title,
          description: newNotification.message,
          variant: newNotification.type === 'error' ? "destructive" : 
                  newNotification.type === 'warning' ? "default" : "default",
        });
      }
    }, 60000); // Check for new notifications every minute
    
    // Return cleanup function
    return {
      unsubscribe: () => clearInterval(interval)
    };
  };

  const markAsRead = async (id: string) => {
    try {
      // In a production app, this would update the read status via API
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id ? { ...notification, read: true } : notification
        )
      );
      
      // Update in real API would be here
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      // In a production app, this would update all notifications via API
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
      
      // Update in real API would be here
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const clearAllNotifications = async () => {
    try {
      // In a production app, this would clear notifications via API
      setNotifications([]);
      
      // Update in real API would be here
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  };

  const toggleNotificationSettings = () => {
    setNotificationsEnabled(!notificationsEnabled);
    toast({
      title: notificationsEnabled ? "Notifications disabled" : "Notifications enabled",
      description: notificationsEnabled 
        ? "You won't receive new notifications" 
        : "You'll now receive notifications",
    });
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="text-green-500 h-5 w-5" />;
      case 'warning':
        return <AlertCircle className="text-amber-500 h-5 w-5" />;
      case 'error':
        return <AlertCircle className="text-red-500 h-5 w-5" />;
      case 'info':
      default:
        return <Info className="text-blue-500 h-5 w-5" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="relative">
      <DropdownMenu open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notifications</CardTitle>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={markAllAsRead}
                  title="Mark all as read"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={clearAllNotifications}
                  title="Clear all"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CardDescription className="flex items-center justify-between mt-1">
              <span>Trading alerts and system messages</span>
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <Switch 
                  checked={notificationsEnabled} 
                  onCheckedChange={toggleNotificationSettings} 
                  size="sm"
                />
              </div>
            </CardDescription>
          </CardHeader>
          <ScrollArea className="h-[400px]">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center h-20">
                  <Activity className="h-5 w-5 animate-pulse text-muted-foreground" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <BellOff className="h-8 w-8 mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">No notifications</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <div 
                      key={notification.id}
                      className={`p-4 hover:bg-muted/50 ${notification.read ? '' : 'bg-muted/20'}`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex gap-3">
                        <div className="mt-1">
                          {getIconForType(notification.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <div className="font-medium">{notification.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatTimestamp(notification.timestamp)}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{notification.message}</p>
                          {!notification.read && (
                            <Badge variant="outline" className="mt-2 bg-blue-500/10 text-blue-500 text-xs">New</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </ScrollArea>
          <CardFooter className="p-2 flex justify-center border-t">
            <Button variant="link" className="w-full text-sm" asChild>
              <a href="/dashboard/alerts">View All Alerts</a>
            </Button>
          </CardFooter>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Mock data for development/testing
function getMockNotifications(): Notification[] {
  return [
    {
      id: '1',
      title: 'Market volatility alert',
      message: 'BTC volatility exceeding threshold. Consider adjusting position sizes.',
      type: 'warning',
      timestamp: new Date(Date.now() - 15 * 60000).toISOString(), // 15 minutes ago
      read: false
    },
    {
      id: '2',
      title: 'Order executed',
      message: 'Buy order for ETH/USDT executed at $3,542.15',
      type: 'success',
      timestamp: new Date(Date.now() - 2 * 3600000).toISOString(), // 2 hours ago
      read: false
    },
    {
      id: '3',
      title: 'Risk threshold exceeded',
      message: 'Your BTC position exceeds 10% of portfolio. Consider rebalancing.',
      type: 'warning',
      timestamp: new Date(Date.now() - 5 * 3600000).toISOString(), // 5 hours ago
      read: true
    },
    {
      id: '4',
      title: 'Connection issue',
      message: 'Binance API connection temporarily lost. Reconnected successfully.',
      type: 'error',
      timestamp: new Date(Date.now() - 24 * 3600000).toISOString(), // 1 day ago
      read: true
    },
    {
      id: '5',
      title: 'New feature available',
      message: 'Trading Farm now supports stop-loss automations. Try it now!',
      type: 'info',
      timestamp: new Date(Date.now() - 2 * 24 * 3600000).toISOString(), // 2 days ago
      read: true
    }
  ];
}

function generateMockNotification(): Notification {
  const types = ['info', 'success', 'warning', 'error'] as const;
  const type = types[Math.floor(Math.random() * types.length)];
  
  const titles = {
    info: ['New feature available', 'System update scheduled', 'Market analysis ready'],
    success: ['Order executed', 'Position closed profitably', 'Trading goal achieved'],
    warning: ['Market volatility alert', 'Risk threshold approaching', 'Balance running low'],
    error: ['Order failed', 'API connection lost', 'Risk limit exceeded']
  };
  
  const messages = {
    info: [
      'Check out our new portfolio analytics feature.',
      'System maintenance scheduled for tonight at 2am UTC.',
      'New market report is available in your dashboard.'
    ],
    success: [
      'Your limit order was successfully executed.',
      'Position closed with 2.5% profit.',
      'Monthly profit target reached. Congratulations!'
    ],
    warning: [
      'Unusual market volatility detected. Consider reducing positions.',
      'Your position size is approaching risk limits.',
      'Account balance below recommended trading level.'
    ],
    error: [
      'Order placement failed. Please try again.',
      'Lost connection to exchange API. Reconnecting...',
      'Risk limit exceeded. Trading paused for this asset.'
    ]
  };
  
  const title = titles[type][Math.floor(Math.random() * titles[type].length)];
  const message = messages[type][Math.floor(Math.random() * messages[type].length)];
  
  return {
    id: Date.now().toString(),
    title,
    message,
    type,
    timestamp: new Date().toISOString(),
    read: false
  };
}
