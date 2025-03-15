import React, { useState, useEffect } from 'react';
import { 
  BellRing, 
  X, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  Check, 
  ChevronRight, 
  Settings, 
  Filter, 
  Loader2 
} from 'lucide-react';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "../ui/popover";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "../ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "../ui/tabs";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  CardFooter 
} from "../ui/card";
import { 
  Alert as AlertComponent, 
  AlertDescription, 
  AlertTitle 
} from "../ui/alert";
import { Checkbox } from "../ui/checkbox";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "../ui/select";
import { ScrollArea } from "../ui/scroll-area";
import { Alert, AlertSeverity, AlertCategory, AlertStatus } from './types';
import { toast } from "../ui/use-toast";

interface AlertCenterProps {
  className?: string;
}

// Mock alerts for demonstration
const generateMockAlerts = (): Alert[] => {
  const now = new Date();
  
  const mockAlerts: Alert[] = [
    {
      id: '1',
      title: 'Kraken API Connection Issue',
      message: 'Unable to connect to Kraken API. Check credentials and network status.',
      timestamp: new Date(now.getTime() - 5 * 60000).toISOString(),
      severity: AlertSeverity.ERROR,
      category: AlertCategory.EXCHANGE,
      status: AlertStatus.NEW,
      source: 'Exchange Manager',
      actions: [
        {
          id: 'view-exchange',
          label: 'View Exchange',
          actionType: 'navigate',
          destination: '/exchanges/kraken'
        },
        {
          id: 'retry-connection',
          label: 'Retry Connection',
          actionType: 'run_command'
        }
      ]
    },
    {
      id: '2',
      title: 'High CPU Usage Detected',
      message: 'System CPU usage exceeded 85% for more than 5 minutes.',
      timestamp: new Date(now.getTime() - 12 * 60000).toISOString(),
      severity: AlertSeverity.WARNING,
      category: AlertCategory.SYSTEM,
      status: AlertStatus.NEW,
      source: 'System Monitor',
      actions: [
        {
          id: 'view-system',
          label: 'View System Health',
          actionType: 'navigate',
          destination: '/monitoring'
        }
      ]
    },
    {
      id: '3',
      title: 'Strategy Stop Loss Triggered',
      message: 'Momentum Breakout strategy stop loss triggered for BTC/USDT position. Trade closed with 2.3% loss.',
      timestamp: new Date(now.getTime() - 25 * 60000).toISOString(),
      severity: AlertSeverity.WARNING,
      category: AlertCategory.STRATEGY,
      status: AlertStatus.ACKNOWLEDGED,
      source: 'Risk Manager',
      actions: [
        {
          id: 'view-strategy',
          label: 'View Strategy',
          actionType: 'navigate',
          destination: '/strategies/1'
        }
      ]
    },
    {
      id: '4',
      title: 'ElizaOS Analysis Complete',
      message: 'Market analysis for ETH/USDT completed. New opportunity detected with 78% confidence.',
      timestamp: new Date(now.getTime() - 38 * 60000).toISOString(),
      severity: AlertSeverity.INFO,
      category: AlertCategory.ELIZAOS,
      status: AlertStatus.NEW,
      source: 'ElizaOS',
      actions: [
        {
          id: 'view-analysis',
          label: 'View Analysis',
          actionType: 'navigate',
          destination: '/elizaos/analysis/eth-usdt'
        }
      ]
    },
    {
      id: '5',
      title: 'Database Backup Completed',
      message: 'Daily database backup completed successfully. All trading data secured.',
      timestamp: new Date(now.getTime() - 120 * 60000).toISOString(),
      severity: AlertSeverity.INFO,
      category: AlertCategory.DATABASE,
      status: AlertStatus.RESOLVED,
      source: 'Database Manager'
    }
  ];
  
  return mockAlerts;
};

const AlertCenter: React.FC<AlertCenterProps> = ({ className }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filters, setFilters] = useState<{
    severity: AlertSeverity[];
    category: AlertCategory[];
    status: AlertStatus[];
  }>({
    severity: [],
    category: [],
    status: [],
  });

  useEffect(() => {
    const fetchAlerts = async () => {
      setIsLoading(true);
      try {
        // Replace with actual API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        const mockAlerts = generateMockAlerts();
        setAlerts(mockAlerts);
      } catch (error) {
        console.error('Failed to fetch alerts', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load alerts. Please try again."
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlerts();

    // Simulate receiving new alerts
    const interval = setInterval(() => {
      const random = Math.random();
      if (random > 0.7) {
        const newAlert: Alert = {
          id: Date.now().toString(),
          title: random > 0.9 ? 'Critical System Event' : 'New Market Opportunity',
          message: random > 0.9 
            ? 'Memory usage exceeded critical threshold. Consider restarting services.' 
            : 'ElizaOS detected potential reversal pattern for BTC/USDT.',
          timestamp: new Date().toISOString(),
          severity: random > 0.9 ? AlertSeverity.CRITICAL : AlertSeverity.INFO,
          category: random > 0.9 ? AlertCategory.SYSTEM : AlertCategory.ELIZAOS,
          status: AlertStatus.NEW,
          source: random > 0.9 ? 'System Monitor' : 'ElizaOS',
          actions: random > 0.9 
            ? [{ id: 'view-system', label: 'View System', actionType: 'navigate', destination: '/monitoring' }]
            : [{ id: 'view-analysis', label: 'View Analysis', actionType: 'navigate', destination: '/market/btc-usdt' }]
        };
        
        setAlerts(prev => [newAlert, ...prev]);
        
        if (random > 0.9) {
          // Show toast for critical alerts
          toast({
            variant: "destructive",
            title: "Critical Alert",
            description: newAlert.title,
          });
        } else if (random > 0.8) {
          // Show toast for important non-critical alerts
          toast({
            title: "New Alert",
            description: newAlert.title,
          });
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Calculate unread count
    const count = alerts.filter(alert => 
      alert.status === AlertStatus.NEW
    ).length;
    setUnreadCount(count);
  }, [alerts]);

  const handleAlertAction = (alertId: string, action: { id: string; actionType: string; }) => {
    console.log(`Action ${action.id} for alert ${alertId}`);
    
    if (action.actionType === 'resolve' || action.actionType === 'acknowledge') {
      const newStatus = action.actionType === 'resolve' 
        ? AlertStatus.RESOLVED 
        : AlertStatus.ACKNOWLEDGED;
      
      setAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, status: newStatus } 
            : alert
        )
      );
      
      toast({
        title: `Alert ${action.actionType === 'resolve' ? 'Resolved' : 'Acknowledged'}`,
        description: `The alert has been ${action.actionType === 'resolve' ? 'resolved' : 'acknowledged'}.`
      });
    }
  };

  const markAllAsRead = () => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.status === AlertStatus.NEW 
          ? { ...alert, status: AlertStatus.ACKNOWLEDGED } 
          : alert
      )
    );
    
    toast({
      title: "All Alerts Acknowledged",
      description: "All alerts have been marked as read."
    });
  };

  const clearResolvedAlerts = () => {
    setAlerts(prev => 
      prev.filter(alert => 
        alert.status !== AlertStatus.RESOLVED
      )
    );
    
    toast({
      title: "Cleared Resolved Alerts",
      description: "All resolved alerts have been cleared."
    });
  };

  const toggleFilter = (type: 'severity' | 'category' | 'status', value: string) => {
    setFilters(prev => {
      const currentValues = [...prev[type]];
      const valueIndex = currentValues.indexOf(value as any);
      
      if (valueIndex >= 0) {
        currentValues.splice(valueIndex, 1);
      } else {
        currentValues.push(value as any);
      }
      
      return {
        ...prev,
        [type]: currentValues,
      };
    });
  };

  const filteredAlerts = alerts.filter(alert => {
    // Filter by tab
    if (activeTab === 'unread' && alert.status !== AlertStatus.NEW) {
      return false;
    }
    
    // Apply additional filters
    if (filters.severity.length > 0 && !filters.severity.includes(alert.severity)) {
      return false;
    }
    
    if (filters.category.length > 0 && !filters.category.includes(alert.category)) {
      return false;
    }
    
    if (filters.status.length > 0 && !filters.status.includes(alert.status)) {
      return false;
    }
    
    return true;
  });

  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case AlertSeverity.CRITICAL:
      case AlertSeverity.ERROR:
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case AlertSeverity.WARNING:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case AlertSeverity.INFO:
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityClass = (severity: AlertSeverity) => {
    switch (severity) {
      case AlertSeverity.CRITICAL:
      case AlertSeverity.ERROR:
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950';
      case AlertSeverity.WARNING:
        return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950';
      case AlertSeverity.INFO:
      default:
        return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950';
    }
  };

  const getStatusBadge = (status: AlertStatus) => {
    switch (status) {
      case AlertStatus.NEW:
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">New</Badge>;
      case AlertStatus.ACKNOWLEDGED:
        return <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">Acknowledged</Badge>;
      case AlertStatus.RESOLVED:
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Resolved</Badge>;
      case AlertStatus.DISMISSED:
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">Dismissed</Badge>;
      default:
        return null;
    }
  };

  const formatTimeDifference = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    if (diffMs < 60000) { // less than 1 minute
      return 'Just now';
    } else if (diffMs < 3600000) { // less than 1 hour
      const minutes = Math.floor(diffMs / 60000);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffMs < 86400000) { // less than 1 day
      const hours = Math.floor(diffMs / 3600000);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffMs / 86400000);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  };

  // Notification Center Popover
  const renderNotificationPopover = () => {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="icon" 
            className="relative"
          >
            <BellRing className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-0">
          <div className="flex items-center justify-between border-b p-3">
            <h4 className="font-medium">Notifications</h4>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-2" 
                disabled={unreadCount === 0}
                onClick={markAllAsRead}
              >
                <Check className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-2"
                  onClick={() => setSheetOpen(true)}
                >
                  View all
                </Button>
              </SheetTrigger>
            </div>
          </div>
          
          <ScrollArea className="h-[300px]">
            {filteredAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-4">
                <div className="rounded-full bg-muted p-3">
                  <BellRing className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">No notifications</h3>
                <p className="text-sm text-muted-foreground text-center mt-1">
                  {activeTab === 'unread' 
                    ? "You don't have any unread notifications." 
                    : "You don't have any notifications."}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredAlerts.slice(0, 5).map(alert => (
                  <div 
                    key={alert.id} 
                    className={`p-3 hover:bg-muted/50 ${alert.status === AlertStatus.NEW ? 'bg-muted/20' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {getSeverityIcon(alert.severity)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between">
                          <p className="text-sm font-medium">{alert.title}</p>
                          <p className="text-xs text-muted-foreground">{formatTimeDifference(alert.timestamp)}</p>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{alert.message}</p>
                        
                        {alert.actions && alert.actions.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {alert.actions.map(action => (
                              <Button 
                                key={action.id} 
                                variant="outline" 
                                size="sm" 
                                className="h-7 text-xs" 
                                onClick={() => handleAlertAction(alert.id, action)}
                              >
                                {action.label}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {filteredAlerts.length > 5 && (
                  <div className="p-3 text-center">
                    <SheetTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full" 
                        onClick={() => setSheetOpen(true)}
                      >
                        View all {filteredAlerts.length} notifications
                      </Button>
                    </SheetTrigger>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>
    );
  };

  // Full Alert List in Sheet
  const renderAlertSheet = () => {
    return (
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Notification Center</SheetTitle>
          </SheetHeader>
          
          <div className="mt-4 flex justify-between items-center">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">
                  All
                </TabsTrigger>
                <TabsTrigger value="unread">
                  Unread {unreadCount > 0 && `(${unreadCount})`}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-1" />
                    Filter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Severity</DropdownMenuLabel>
                  {Object.values(AlertSeverity).map(severity => (
                    <DropdownMenuItem 
                      key={severity} 
                      className="flex items-center gap-2"
                      onClick={() => toggleFilter('severity', severity)}
                    >
                      <Checkbox 
                        checked={filters.severity.includes(severity)} 
                        onCheckedChange={() => {}}
                      />
                      <span className="flex-1">{severity.charAt(0).toUpperCase() + severity.slice(1)}</span>
                      {getSeverityIcon(severity)}
                    </DropdownMenuItem>
                  ))}
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Category</DropdownMenuLabel>
                  {Object.values(AlertCategory).map(category => (
                    <DropdownMenuItem 
                      key={category} 
                      className="flex items-center gap-2"
                      onClick={() => toggleFilter('category', category)}
                    >
                      <Checkbox 
                        checked={filters.category.includes(category)} 
                        onCheckedChange={() => {}}
                      />
                      <span>{category.charAt(0).toUpperCase() + category.slice(1)}</span>
                    </DropdownMenuItem>
                  ))}
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Status</DropdownMenuLabel>
                  {Object.values(AlertStatus).map(status => (
                    <DropdownMenuItem 
                      key={status} 
                      className="flex items-center gap-2"
                      onClick={() => toggleFilter('status', status)}
                    >
                      <Checkbox 
                        checked={filters.status.includes(status)} 
                        onCheckedChange={() => {}}
                      />
                      <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearResolvedAlerts}
              >
                <X className="h-4 w-4 mr-1" />
                Clear Resolved
              </Button>
            </div>
          </div>
          
          <ScrollArea className="h-[calc(100vh-180px)] mt-4">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="rounded-full bg-muted p-4">
                  <BellRing className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">No notifications</h3>
                <p className="text-sm text-muted-foreground text-center mt-1 max-w-sm">
                  {activeTab === 'unread' 
                    ? "You don't have any unread notifications." 
                    : filters.severity.length > 0 || filters.category.length > 0 || filters.status.length > 0
                      ? "No notifications match your filters."
                      : "You don't have any notifications."}
                </p>
                
                {(filters.severity.length > 0 || filters.category.length > 0 || filters.status.length > 0) && (
                  <Button 
                    variant="outline" 
                    className="mt-4" 
                    onClick={() => setFilters({ severity: [], category: [], status: [] })}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4 px-1">
                {filteredAlerts.map(alert => (
                  <AlertComponent 
                    key={alert.id} 
                    className={getSeverityClass(alert.severity)}
                  >
                    <div className="flex items-start">
                      <div className="mr-2 mt-0.5">
                        {getSeverityIcon(alert.severity)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <AlertTitle>
                            {alert.title}
                          </AlertTitle>
                          {getStatusBadge(alert.status)}
                        </div>
                        <AlertDescription className="mt-1">
                          {alert.message}
                        </AlertDescription>
                        
                        <div className="mt-2 flex items-center justify-between text-sm">
                          <div className="text-muted-foreground">
                            {alert.source} • {formatTimeDifference(alert.timestamp)}
                          </div>
                          
                          <div className="flex gap-1">
                            {alert.status === AlertStatus.NEW && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-6 text-xs px-2" 
                                onClick={() => handleAlertAction(alert.id, { id: 'acknowledge', actionType: 'acknowledge' })}
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Acknowledge
                              </Button>
                            )}
                            
                            {(alert.status === AlertStatus.NEW || alert.status === AlertStatus.ACKNOWLEDGED) && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-6 text-xs px-2" 
                                onClick={() => handleAlertAction(alert.id, { id: 'resolve', actionType: 'resolve' })}
                              >
                                Resolve
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {alert.actions && alert.actions.length > 0 && (
                          <div className="flex gap-2 mt-3">
                            {alert.actions.map(action => (
                              <Button 
                                key={action.id} 
                                variant="secondary" 
                                size="sm" 
                                className="h-7 text-xs" 
                                onClick={() => handleAlertAction(alert.id, action)}
                              >
                                {action.label}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </AlertComponent>
                ))}
              </div>
            )}
          </ScrollArea>
          
          <div className="mt-4 flex justify-end">
            <Button 
              variant="outline" 
              asChild
            >
              <div className="flex items-center">
                <Settings className="h-4 w-4 mr-2" />
                <span>Notification Settings</span>
                <ChevronRight className="h-4 w-4 ml-2" />
              </div>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  };

  return (
    <>
      {renderNotificationPopover()}
      {renderAlertSheet()}
    </>
  );
};

export default AlertCenter;
