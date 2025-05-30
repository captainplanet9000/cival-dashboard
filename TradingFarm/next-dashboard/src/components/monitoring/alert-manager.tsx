"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { 
  AlertTriangle, 
  Bell, 
  BellOff, 
  Check, 
  ChevronDown, 
  Info, 
  MoreHorizontal, 
  Plus, 
  ShieldAlert, 
  Trash, 
  X 
} from 'lucide-react';
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { TradingAlert, AlertLevel, AlertRule, NotificationPreferences } from '@/services/monitoring/alert-management-service';

interface AlertManagerProps {
  userId: string;
  farmId?: number;
  className?: string;
}

export function AlertManager({ userId, farmId, className = '' }: AlertManagerProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('alerts');
  const [isLoading, setIsLoading] = useState(true);
  const [alerts, setAlerts] = useState<TradingAlert[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences | null>(null);

  // Load alerts on mount
  useEffect(() => {
    loadAlerts();
    loadAlertRules();
    loadNotificationPreferences();
  }, [userId, farmId]);

  // Function to load alerts
  const loadAlerts = async () => {
    try {
      setIsLoading(true);
      
      // In a real implementation, this would call the API
      // For now, use mock data
      setTimeout(() => {
        setAlerts(getMockAlerts());
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error("Error loading alerts:", error);
      toast({
        title: "Error",
        description: "Failed to load alerts. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  // Function to load alert rules
  const loadAlertRules = async () => {
    try {
      // In a real implementation, this would call the API
      // For now, use mock data
      setTimeout(() => {
        setAlertRules(getMockAlertRules());
      }, 1000);
    } catch (error) {
      console.error("Error loading alert rules:", error);
      toast({
        title: "Error",
        description: "Failed to load alert rules. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Function to load notification preferences
  const loadNotificationPreferences = async () => {
    try {
      // In a real implementation, this would call the API
      // For now, use mock data
      setTimeout(() => {
        setNotificationPrefs(getMockNotificationPreferences());
      }, 1000);
    } catch (error) {
      console.error("Error loading notification preferences:", error);
    }
  };

  // Function to mark alerts as read
  const markAsRead = async (alertIds: number[]) => {
    try {
      // In a real implementation, this would call the API
      // For now, just update the local state
      setAlerts(alerts.map(alert => 
        alertIds.includes(alert.id!) 
          ? { ...alert, is_read: true } 
          : alert
      ));
      
      toast({
        title: "Success",
        description: `${alertIds.length} alert${alertIds.length > 1 ? 's' : ''} marked as read.`,
      });
    } catch (error) {
      console.error("Error marking alerts as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark alerts as read. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Function to acknowledge alerts
  const acknowledgeAlerts = async (alertIds: number[]) => {
    try {
      // In a real implementation, this would call the API
      // For now, just update the local state
      setAlerts(alerts.map(alert => 
        alertIds.includes(alert.id!) 
          ? { ...alert, is_acknowledged: true } 
          : alert
      ));
      
      toast({
        title: "Success",
        description: `${alertIds.length} alert${alertIds.length > 1 ? 's' : ''} acknowledged.`,
      });
    } catch (error) {
      console.error("Error acknowledging alerts:", error);
      toast({
        title: "Error",
        description: "Failed to acknowledge alerts. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Function to toggle alert rule active status
  const toggleAlertRule = async (ruleId: number, isActive: boolean) => {
    try {
      // In a real implementation, this would call the API
      // For now, just update the local state
      setAlertRules(alertRules.map(rule => 
        rule.id === ruleId
          ? { ...rule, is_active: isActive }
          : rule
      ));
      
      toast({
        title: "Success",
        description: `Alert rule ${isActive ? 'activated' : 'deactivated'}.`,
      });
    } catch (error) {
      console.error("Error toggling alert rule:", error);
      toast({
        title: "Error",
        description: "Failed to update alert rule. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Function to delete alert rule
  const deleteAlertRule = async (ruleId: number) => {
    try {
      // In a real implementation, this would call the API
      // For now, just update the local state
      setAlertRules(alertRules.filter(rule => rule.id !== ruleId));
      
      toast({
        title: "Success",
        description: "Alert rule deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting alert rule:", error);
      toast({
        title: "Error",
        description: "Failed to delete alert rule. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Function to update notification preferences
  const updateNotificationPreferences = async (prefs: Partial<NotificationPreferences>) => {
    try {
      // In a real implementation, this would call the API
      // For now, just update the local state
      setNotificationPrefs(prev => prev ? { ...prev, ...prefs } : null);
      
      toast({
        title: "Success",
        description: "Notification preferences updated.",
      });
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      toast({
        title: "Error",
        description: "Failed to update notification preferences. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Helper to get alert level badge
  const getAlertLevelBadge = (level: AlertLevel) => {
    switch (level) {
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Critical</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>;
      case 'info':
        return <Badge className="bg-blue-100 text-blue-800">Info</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  // Helper to get alert icon
  const getAlertIcon = (level: AlertLevel) => {
    switch (level) {
      case 'error':
        return <ShieldAlert className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  // Render unread alerts badge
  const renderUnreadBadge = () => {
    const unreadCount = alerts.filter(a => !a.is_read).length;
    if (unreadCount === 0) return null;
    
    return (
      <Badge className="bg-red-500 text-white ml-2">{unreadCount}</Badge>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center">
              <Bell className="mr-2 h-5 w-5 text-primary" />
              Alert Manager
              {renderUnreadBadge()}
            </CardTitle>
            <CardDescription>
              Manage trading alerts and notification settings
            </CardDescription>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => loadAlerts()}
            >
              Refresh
            </Button>
            
            <Button
              variant="default"
              size="sm"
              onClick={() => markAsRead(alerts.filter(a => !a.is_read).map(a => a.id!))}
              disabled={!alerts.some(a => !a.is_read)}
            >
              Mark All Read
            </Button>
          </div>
        </div>
      </CardHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="px-6">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="alerts" className="relative">
              Alerts
              {activeTab !== 'alerts' && renderUnreadBadge()}
            </TabsTrigger>
            <TabsTrigger value="rules">Alert Rules</TabsTrigger>
            <TabsTrigger value="settings">Notification Settings</TabsTrigger>
          </TabsList>
        </div>

        <CardContent className="pt-4 pb-2">
          <TabsContent value="alerts" className="m-0">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : alerts.length > 0 ? (
              <div className="space-y-4">
                {alerts.map(alert => (
                  <div 
                    key={alert.id} 
                    className={`p-4 border rounded-lg flex items-start gap-3 transition-colors ${
                      !alert.is_read ? 'bg-muted/50 border-muted-foreground/20' : 'border-border'
                    }`}
                  >
                    <div className="flex-shrink-0 mt-1">
                      {getAlertIcon(alert.level)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getAlertLevelBadge(alert.level)}
                          <span className="font-medium">
                            {alert.alert_type.replace(/_/g, ' ')}
                          </span>
                        </div>
                        
                        <div className="text-xs text-muted-foreground">
                          {formatRelativeTime(new Date(alert.created_at!))}
                        </div>
                      </div>
                      
                      <p className="mt-1">{alert.message}</p>
                      
                      {alert.exchange && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Exchange: {alert.exchange}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {!alert.is_read && (
                            <DropdownMenuItem onClick={() => markAsRead([alert.id!])}>
                              <Check className="mr-2 h-4 w-4" />
                              Mark as Read
                            </DropdownMenuItem>
                          )}
                          {!alert.is_acknowledged && (
                            <DropdownMenuItem onClick={() => acknowledgeAlerts([alert.id!])}>
                              <Bell className="mr-2 h-4 w-4" />
                              Acknowledge
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem>
                            <Info className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BellOff className="mx-auto h-12 w-12 mb-3" />
                <p>No alerts to display</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="rules" className="m-0">
            <div className="mb-4 flex justify-between items-center">
              <h3 className="text-lg font-medium">Alert Rules</h3>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Create Rule
              </Button>
            </div>
            
            {alertRules.length > 0 ? (
              <div className="space-y-4">
                {alertRules.map(rule => (
                  <div 
                    key={rule.id} 
                    className="p-4 border rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={rule.is_active}
                          onCheckedChange={(checked) => toggleAlertRule(rule.id!, checked)}
                        />
                        <span className="font-medium">{rule.name}</span>
                        {getAlertLevelBadge(rule.level)}
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Info className="mr-2 h-4 w-4" />
                            Edit Rule
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => deleteAlertRule(rule.id!)}
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Delete Rule
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    {rule.description && (
                      <p className="mt-2 text-sm text-muted-foreground">{rule.description}</p>
                    )}
                    
                    <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Type:</span>{' '}
                        {rule.rule_type.replace(/_/g, ' ')}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Throttle:</span>{' '}
                        {rule.throttle_minutes} minutes
                      </div>
                      <div>
                        <span className="text-muted-foreground">Notifications:</span>{' '}
                        {rule.notification_channels.join(', ')}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Last triggered:</span>{' '}
                        {rule.last_triggered ? formatRelativeTime(new Date(rule.last_triggered)) : 'Never'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="mx-auto h-12 w-12 mb-3" />
                <p>No alert rules configured</p>
                <Button 
                  variant="outline"
                  size="sm"
                  className="mt-4"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Rule
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings" className="m-0">
            {notificationPrefs ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Notification Channels</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="email_alerts">Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive alerts via email
                        </p>
                      </div>
                      <Switch 
                        id="email_alerts" 
                        checked={notificationPrefs.email_alerts}
                        onCheckedChange={(checked) => updateNotificationPreferences({ email_alerts: checked })}
                      />
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="push_notifications">Push Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive alerts in-app
                        </p>
                      </div>
                      <Switch 
                        id="push_notifications" 
                        checked={notificationPrefs.push_notifications}
                        onCheckedChange={(checked) => updateNotificationPreferences({ push_notifications: checked })}
                      />
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="sms_alerts">SMS Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive alerts via text message
                        </p>
                      </div>
                      <Switch 
                        id="sms_alerts" 
                        checked={notificationPrefs.sms_alerts}
                        onCheckedChange={(checked) => updateNotificationPreferences({ sms_alerts: checked })}
                      />
                    </div>
                    
                    {notificationPrefs.sms_alerts && (
                      <div className="pl-8">
                        <Label htmlFor="phone_number">Phone Number</Label>
                        <div className="flex gap-2 mt-1">
                          <Input 
                            id="phone_number" 
                            value={notificationPrefs.phone_number || ''} 
                            placeholder="+1234567890"
                            onChange={(e) => updateNotificationPreferences({ phone_number: e.target.value })}
                          />
                          <Button variant="outline" size="sm">Verify</Button>
                        </div>
                      </div>
                    )}
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="telegram_alerts">Telegram Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive alerts via Telegram
                        </p>
                      </div>
                      <Switch 
                        id="telegram_alerts" 
                        checked={notificationPrefs.telegram_alerts}
                        onCheckedChange={(checked) => updateNotificationPreferences({ telegram_alerts: checked })}
                      />
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Notification Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="min_alert_level">Minimum Alert Level</Label>
                      <Select 
                        value={notificationPrefs.min_alert_level}
                        onValueChange={(value) => updateNotificationPreferences({ min_alert_level: value as AlertLevel })}
                      >
                        <SelectTrigger id="min_alert_level" className="mt-1">
                          <SelectValue placeholder="Select minimum alert level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="info">All Alerts (Info and above)</SelectItem>
                          <SelectItem value="warning">Warnings and Errors</SelectItem>
                          <SelectItem value="error">Critical Errors Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {notificationPrefs.email_alerts && (
                      <div>
                        <Label htmlFor="email_frequency">Email Frequency</Label>
                        <Select 
                          value={notificationPrefs.email_frequency}
                          onValueChange={(value) => updateNotificationPreferences({ 
                            email_frequency: value as 'immediate' | 'hourly' | 'daily'
                          })}
                        >
                          <SelectTrigger id="email_frequency" className="mt-1">
                            <SelectValue placeholder="Select email frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="immediate">Immediate</SelectItem>
                            <SelectItem value="hourly">Hourly Digest</SelectItem>
                            <SelectItem value="daily">Daily Digest</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="quiet_hours_start">Quiet Hours Start</Label>
                        <Input 
                          id="quiet_hours_start" 
                          type="time"
                          className="mt-1"
                          value={notificationPrefs.quiet_hours_start || ''}
                          onChange={(e) => updateNotificationPreferences({ quiet_hours_start: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="quiet_hours_end">Quiet Hours End</Label>
                        <Input 
                          id="quiet_hours_end" 
                          type="time"
                          className="mt-1"
                          value={notificationPrefs.quiet_hours_end || ''}
                          onChange={(e) => updateNotificationPreferences({ quiet_hours_end: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button>Save Notification Settings</Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}
          </TabsContent>
        </CardContent>
      </Tabs>

      <CardFooter className="flex justify-between text-xs text-muted-foreground border-t py-3">
        <div>
          <span className="font-medium">Farm ID:</span> {farmId || 'All Farms'}
        </div>
        <div>
          Last updated: {formatDate(new Date())}
        </div>
      </CardFooter>
    </Card>
  );
}

// Mock data generators for demonstration
function getMockAlerts(): TradingAlert[] {
  const alerts: TradingAlert[] = [
    {
      id: 1,
      user_id: '123',
      alert_type: 'price_change',
      level: 'warning',
      message: 'BTC price dropped by 5% in the last hour.',
      exchange: 'Binance',
      is_read: false,
      is_acknowledged: false,
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    },
    {
      id: 2,
      user_id: '123',
      alert_type: 'api_limit',
      level: 'error',
      message: 'Binance API key has reached 90% of rate limit. Trading may be affected.',
      exchange: 'Binance',
      is_read: false,
      is_acknowledged: false,
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 3,
      user_id: '123',
      farm_id: 1,
      strategy_id: 2,
      alert_type: 'position_drawdown',
      level: 'error',
      message: 'ETH/USDT position has reached 15% drawdown threshold.',
      is_read: true,
      is_acknowledged: true,
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 4,
      user_id: '123',
      farm_id: 1,
      agent_id: 3,
      alert_type: 'agent_status',
      level: 'info',
      message: 'DCA Agent has successfully executed a buy order for BTC/USDT.',
      is_read: true,
      is_acknowledged: false,
      created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    },
  ];
  
  return alerts;
}

function getMockAlertRules(): AlertRule[] {
  const rules: AlertRule[] = [
    {
      id: 1,
      user_id: '123',
      name: 'Large Price Movement',
      description: 'Alert when price changes significantly in a short time',
      rule_type: 'price_change',
      conditions: [
        { metric: 'price_change_percent', operator: 'gt', value: 5, timeframe: '1h' }
      ],
      level: 'warning',
      notification_channels: ['ui', 'email'],
      is_active: true,
      throttle_minutes: 60,
      last_triggered: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 2,
      user_id: '123',
      name: 'Position Drawdown',
      description: 'Alert when a position experiences significant drawdown',
      rule_type: 'position_drawdown',
      conditions: [
        { metric: 'drawdown_percent', operator: 'gt', value: 10 }
      ],
      level: 'error',
      notification_channels: ['ui', 'email', 'sms'],
      is_active: true,
      throttle_minutes: 30,
    },
    {
      id: 3,
      user_id: '123',
      name: 'API Limit Warning',
      rule_type: 'api_limit',
      conditions: [
        { metric: 'api_usage_percent', operator: 'gt', value: 80 }
      ],
      level: 'warning',
      notification_channels: ['ui'],
      is_active: false,
      throttle_minutes: 120,
    },
  ];
  
  return rules;
}

function getMockNotificationPreferences(): NotificationPreferences {
  return {
    id: 1,
    user_id: '123',
    email_alerts: true,
    push_notifications: true,
    sms_alerts: false,
    telegram_alerts: false,
    email_frequency: 'immediate',
    min_alert_level: 'warning',
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
  };
}
