'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { useNotifications } from '@/components/notifications/notification-provider';
import { 
  Activity, 
  BarChart2, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Cpu, 
  HardDrive as Memory,
  AlertCircle,
  Signal,
  Wifi,
  WifiOff
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { RealTimePerformanceChart } from './real-time-performance-chart';
import { mockWebSocketService } from '@/services/websocket-monitoring-service';

// Define types
interface RealTimeDashboardProps {
  farmId?: string;
  agentId?: string;
  refreshInterval?: number;
}

interface MetricData {
  name: string;
  value: number;
  status: 'normal' | 'warning' | 'critical';
  change?: {
    value: number;
    trend: 'up' | 'down' | 'stable';
  };
}

interface SystemStatus {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  lastUpdated: Date;
}

interface AlertItem {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  source: 'agent' | 'farm' | 'system';
  entityId?: string;
  entityName?: string;
}

// Define the Notification interface for our app
interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  timestamp: Date;
  data?: any;
}

export function RealTimeDashboard({ 
  farmId, 
  agentId,
  refreshInterval = 30000 // Default 30 seconds
}: RealTimeDashboardProps) {
  // State for metrics and status
  const [activeTab, setActiveTab] = useState('overview');
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    cpu: 0,
    memory: 0,
    disk: 0,
    network: 0,
    lastUpdated: new Date()
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [customRefreshInterval, setCustomRefreshInterval] = useState(refreshInterval);
  const [timeframe, setTimeframe] = useState<'hour' | 'day' | 'week' | 'month'>('day');
  const [webSocketConnected, setWebSocketConnected] = useState(false);
  
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const unsubscribeRefs = useRef<(() => void)[]>([]);
  
  // Access notifications context
  const { notifications, addNotification } = useNotifications();
  const { toast } = useToast();
  
  // Load initial data and set up WebSocket subscriptions
  useEffect(() => {
    // Initial data fetch
    fetchDashboardData();
    
    // Clean up any existing subscriptions
    unsubscribeRefs.current.forEach(unsubscribe => unsubscribe());
    unsubscribeRefs.current = [];
    
    // Subscribe to WebSocket updates
    const systemSub = mockWebSocketService.subscribe('system', handleSystemUpdate);
    unsubscribeRefs.current.push(systemSub);
    
    if (farmId) {
      const farmSub = mockWebSocketService.subscribe('farm', handleFarmUpdate);
      unsubscribeRefs.current.push(farmSub);
    }
    
    if (agentId) {
      const agentSub = mockWebSocketService.subscribe('agent', handleAgentUpdate);
      unsubscribeRefs.current.push(agentSub);
    }
    
    // Set WebSocket connection status
    setWebSocketConnected(true);
    
    // Also set up manual refresh interval as fallback
    startRefreshTimer();
    
    return () => {
      // Clean up all subscriptions and timers
      unsubscribeRefs.current.forEach(unsubscribe => unsubscribe());
      unsubscribeRefs.current = [];
      
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [farmId, agentId]);
  
  // Update when refresh interval changes
  useEffect(() => {
    startRefreshTimer();
  }, [customRefreshInterval]);
  
  // Handler for system updates via WebSocket
  const handleSystemUpdate = (data: any) => {
    setSystemStatus({
      cpu: data.cpu,
      memory: data.memory,
      disk: data.disk,
      network: data.network,
      lastUpdated: new Date()
    });
    
    // Create notifications for critical resources
    if (data.cpu > 80) {
      addNotification({
        type: 'warning',
        title: 'High CPU Usage',
        message: `CPU usage is at ${Math.round(data.cpu)}%`,
        data: { metric: 'cpu', value: data.cpu }
      });
    }
    
    if (data.disk > 85) {
      addNotification({
        type: 'error',
        title: 'Disk Space Critical',
        message: `Disk usage is at ${Math.round(data.disk)}%`,
        data: { metric: 'disk', value: data.disk }
      });
    }
  };
  
  // Handler for farm updates via WebSocket
  const handleFarmUpdate = (data: any) => {
    // Update relevant metrics based on farm data
    const updatedMetrics = [...metrics];
    
    // Find and update the trading volume metric
    const volumeMetricIndex = updatedMetrics.findIndex(m => m.name === 'Trade Success Rate');
    if (volumeMetricIndex >= 0) {
      updatedMetrics[volumeMetricIndex] = {
        ...updatedMetrics[volumeMetricIndex],
        value: data.profitLoss > 0 ? 60 + Math.random() * 30 : 30 + Math.random() * 30,
        status: data.profitLoss > 0 ? 'normal' : (data.profitLoss < -200 ? 'critical' : 'warning'),
        change: { 
          value: Math.abs(data.profitLoss) / 100, 
          trend: data.profitLoss > 0 ? 'up' : 'down' 
        }
      };
    }
    
    setMetrics(updatedMetrics);
    
    // Add farm alerts if necessary
    if (data.profitLoss < -300) {
      addNotification({
        type: 'error',
        title: 'Significant Trading Loss',
        message: `Farm ${data.id} has a loss of $${Math.abs(Math.round(data.profitLoss))}`,
        data: { farmId: data.id, value: data.profitLoss }
      });
    }
  };
  
  // Handler for agent updates via WebSocket
  const handleAgentUpdate = (data: any) => {
    // Update agent-related metrics
    const updatedMetrics = [...metrics];
    
    // Find and update the API errors metric
    const responseTimeIndex = updatedMetrics.findIndex(m => m.name === 'Agent Response Time');
    if (responseTimeIndex >= 0) {
      updatedMetrics[responseTimeIndex] = {
        ...updatedMetrics[responseTimeIndex],
        value: data.responseTime,
        status: data.responseTime > 200 ? 'critical' : data.responseTime > 100 ? 'warning' : 'normal',
        change: { 
          value: 5 + Math.random() * 10, 
          trend: data.responseTime > 150 ? 'up' : 'down' 
        }
      };
    }
    
    // Find and update the win rate metric
    const winRateIndex = updatedMetrics.findIndex(m => m.name === 'Win Rate');
    if (winRateIndex >= 0) {
      updatedMetrics[winRateIndex] = {
        ...updatedMetrics[winRateIndex],
        value: data.winRate,
        status: data.winRate < 40 ? 'critical' : data.winRate < 50 ? 'warning' : 'normal',
        change: { 
          value: 1 + Math.random() * 3, 
          trend: data.winRate > 45 ? 'up' : 'down' 
        }
      };
    }
    
    setMetrics(updatedMetrics);
    
    // Add agent alerts
    if (data.status === 'warning') {
      const alertId = `agent-${data.id}-${Date.now()}`;
      const newAlert: AlertItem = {
        id: alertId,
        timestamp: new Date(),
        level: 'warning',
        message: `Agent ${data.id} performance degrading`,
        source: 'agent',
        entityId: data.id,
        entityName: `Agent ${data.id}`
      };
      
      setAlerts(prevAlerts => [newAlert, ...prevAlerts.slice(0, 19)]);
      
      addNotification({
        type: 'warning',
        title: 'Agent Warning',
        message: `Agent ${data.id} is showing warning signs`,
        data: { agentId: data.id }
      });
    }
  };
  
  // Function to start refresh timer
  const startRefreshTimer = () => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }
    
    refreshTimerRef.current = setInterval(() => {
      fetchDashboardData();
    }, customRefreshInterval);
  };
  
  // Fetch all dashboard data as a fallback to WebSocket
  const fetchDashboardData = async () => {
    setIsRefreshing(true);
    
    try {
      // In a real implementation, these would be separate API calls
      await Promise.all([
        fetchMetrics(),
        fetchAlerts()
      ]);
      
      setSystemStatus(prevState => ({
        ...prevState,
        lastUpdated: new Date()
      }));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to update dashboard data',
        variant: 'destructive'
      });
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Fetch metrics (mock implementation)
  const fetchMetrics = async () => {
    if (metrics.length > 0) return; // We already have metrics from WebSocket
    
    // This would be a real API call in production
    // For now, generate some random metrics for demonstration
    const mockMetrics: MetricData[] = [
      {
        name: 'Trade Success Rate',
        value: 75 + Math.random() * 10,
        status: 'normal',
        change: { value: 2.5, trend: 'up' }
      },
      {
        name: 'Agent Response Time',
        value: 150 + Math.random() * 50,
        status: Math.random() > 0.8 ? 'warning' : 'normal',
        change: { value: 15, trend: 'down' }
      },
      {
        name: 'API Errors',
        value: Math.random() * 5,
        status: Math.random() > 0.9 ? 'critical' : 'normal',
        change: { value: 0.5, trend: 'up' }
      },
      {
        name: 'Active Transactions',
        value: Math.floor(10 + Math.random() * 15),
        status: 'normal',
        change: { value: 3, trend: 'up' }
      }
    ];
    
    setMetrics(mockMetrics);
  };
  
  // Fetch alert history (mock implementation)
  const fetchAlerts = async () => {
    if (alerts.length > 0) return; // We already have alerts from WebSocket
    
    // This would be a real API call in production
    // Generate some random alerts for demonstration
    const sources = ['agent', 'farm', 'system'];
    const levels = ['info', 'warning', 'error', 'critical'];
    const messages = [
      'Connection timeout detected',
      'API rate limit reached',
      'Agent restarted successfully',
      'Memory usage exceeding threshold',
      'Transaction completed successfully',
      'Failed to execute trade strategy',
      'Database connection error',
      'Network latency detected'
    ];
    
    const mockAlerts: AlertItem[] = Array(10).fill(null).map((_, i) => {
      const timestamp = new Date();
      timestamp.setMinutes(timestamp.getMinutes() - Math.floor(Math.random() * 60));
      
      const source = sources[Math.floor(Math.random() * sources.length)] as AlertItem['source'];
      const level = levels[Math.floor(Math.random() * levels.length)] as AlertItem['level'];
      const message = messages[Math.floor(Math.random() * messages.length)];
      
      return {
        id: `alert-${Date.now()}-${i}`,
        timestamp,
        level,
        message,
        source,
        entityId: source === 'system' ? undefined : `${source}-${Math.floor(Math.random() * 100)}`,
        entityName: source === 'system' ? undefined : `${source.charAt(0).toUpperCase() + source.slice(1)} ${Math.floor(Math.random() * 10)}`
      };
    });
    
    // Sort by timestamp, newest first
    mockAlerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    setAlerts(mockAlerts);
  };
  
  // Function to manually disconnect/reconnect WebSocket for testing
  const toggleWebSocket = () => {
    if (webSocketConnected) {
      // Disconnect by cleaning up subscriptions
      unsubscribeRefs.current.forEach(unsubscribe => unsubscribe());
      unsubscribeRefs.current = [];
      setWebSocketConnected(false);
      
      toast({
        title: 'WebSocket Disconnected',
        description: 'Real-time updates paused',
        variant: 'destructive'
      });
    } else {
      // Reconnect WebSocket
      const systemSub = mockWebSocketService.subscribe('system', handleSystemUpdate);
      unsubscribeRefs.current.push(systemSub);
      
      if (farmId) {
        const farmSub = mockWebSocketService.subscribe('farm', handleFarmUpdate);
        unsubscribeRefs.current.push(farmSub);
      }
      
      if (agentId) {
        const agentSub = mockWebSocketService.subscribe('agent', handleAgentUpdate);
        unsubscribeRefs.current.push(agentSub);
      }
      
      setWebSocketConnected(true);
      
      toast({
        title: 'WebSocket Connected',
        description: 'Real-time updates resumed',
        variant: 'default'
      });
    }
  };
  
  // Function to handle refresh interval change
  const handleRefreshIntervalChange = (value: string) => {
    const interval = parseInt(value);
    setCustomRefreshInterval(interval);
    
    toast({
      title: 'Refresh Interval Updated',
      description: `Data will refresh every ${interval / 1000} seconds`
    });
  };
  
  // Function to handle timeframe change for performance charts
  const handleTimeframeChange = (value: string) => {
    setTimeframe(value as 'hour' | 'day' | 'week' | 'month');
  };
  
  // Function to get color for metric status
  const getStatusColor = (status: 'normal' | 'warning' | 'critical') => {
    switch (status) {
      case 'critical':
        return 'text-red-500';
      case 'warning':
        return 'text-amber-500';
      default:
        return 'text-green-500';
    }
  };
  
  // Function to get badge for alert level
  const getAlertBadge = (level: AlertItem['level']) => {
    switch (level) {
      case 'critical':
        return <Badge className="bg-red-500 text-white">Critical</Badge>;
      case 'error':
        return <Badge className="bg-red-500 text-white">Error</Badge>;
      case 'warning':
        return <Badge className="bg-amber-500 text-white">Warning</Badge>;
      default:
        return <Badge className="border border-gray-200 bg-background">Info</Badge>;
    }
  };
  
  // Function to get resource usage status
  const getResourceStatus = (value: number) => {
    if (value >= 80) return 'critical';
    if (value >= 60) return 'warning';
    return 'normal';
  };
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Real-Time Monitoring</h2>
          <p className="text-muted-foreground">
            Last updated: {formatDistanceToNow(systemStatus.lastUpdated, { addSuffix: true })}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-2">
            <Button
              className={`flex items-center gap-1 ${webSocketConnected ? "bg-primary text-primary-foreground" : "border border-input bg-background"} h-8 px-3 text-xs`}
              onClick={toggleWebSocket}
            >
              {webSocketConnected ? (
                <>
                  <Wifi className="h-4 w-4" />
                  <span className="hidden sm:inline">Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4" />
                  <span className="hidden sm:inline">Offline</span>
                </>
              )}
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Refresh:</span>
            <Select
              value={customRefreshInterval.toString()}
              onValueChange={handleRefreshIntervalChange}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="30 seconds" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5000">5 seconds</SelectItem>
                <SelectItem value="15000">15 seconds</SelectItem>
                <SelectItem value="30000">30 seconds</SelectItem>
                <SelectItem value="60000">1 minute</SelectItem>
                <SelectItem value="300000">5 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            className="border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 text-xs"
            onClick={fetchDashboardData}
            disabled={isRefreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
      
      <Tabs 
        defaultValue={activeTab} 
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid grid-cols-1 md:grid-cols-3 w-full">
          <TabsTrigger value="overview" className="flex gap-2 items-center">
            <Activity className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex gap-2 items-center">
            <BarChart2 className="h-4 w-4" />
            <span>Performance</span>
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex gap-2 items-center">
            <AlertTriangle className="h-4 w-4" />
            <span>Alerts</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* System Resources */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  System Resources
                </CardTitle>
                <CardDescription>
                  Current resource utilization across the system
                </CardDescription>
              </div>
              
              {webSocketConnected && (
                <Badge className="flex items-center gap-1 border border-gray-200 bg-background">
                  <Signal className="h-3 w-3" />
                  <span>Real-time</span>
                </Badge>
              )}
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* CPU Usage */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">CPU Usage</span>
                  <span className={`text-sm font-bold ${getStatusColor(getResourceStatus(systemStatus.cpu))}`}>
                    {Math.round(systemStatus.cpu)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${
                      systemStatus.cpu >= 80 ? 'bg-red-500' : 
                      systemStatus.cpu >= 60 ? 'bg-amber-500' : 
                      'bg-green-500'
                    }`}
                    style={{ width: `${systemStatus.cpu}%` }}
                  />
                </div>
              </div>
              
              {/* Memory Usage */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Memory Usage</span>
                  <span className={`text-sm font-bold ${getStatusColor(getResourceStatus(systemStatus.memory))}`}>
                    {Math.round(systemStatus.memory)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${
                      systemStatus.memory >= 80 ? 'bg-red-500' : 
                      systemStatus.memory >= 60 ? 'bg-amber-500' : 
                      'bg-green-500'
                    }`}
                    style={{ width: `${systemStatus.memory}%` }}
                  />
                </div>
              </div>
              
              {/* Disk Usage */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Disk Usage</span>
                  <span className={`text-sm font-bold ${getStatusColor(getResourceStatus(systemStatus.disk))}`}>
                    {Math.round(systemStatus.disk)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${
                      systemStatus.disk >= 80 ? 'bg-red-500' : 
                      systemStatus.disk >= 60 ? 'bg-amber-500' : 
                      'bg-green-500'
                    }`}
                    style={{ width: `${systemStatus.disk}%` }}
                  />
                </div>
              </div>
              
              {/* Network Usage */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Network Usage</span>
                  <span className={`text-sm font-bold ${getStatusColor(getResourceStatus(systemStatus.network))}`}>
                    {Math.round(systemStatus.network)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${
                      systemStatus.network >= 80 ? 'bg-red-500' : 
                      systemStatus.network >= 60 ? 'bg-amber-500' : 
                      'bg-green-500'
                    }`}
                    style={{ width: `${systemStatus.network}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Recent Activity & Notifications */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Recent Notifications */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Recent Notifications
                </CardTitle>
                
                {webSocketConnected && (
                  <Badge className="flex items-center gap-1 border border-gray-200 bg-background">
                    <Signal className="h-3 w-3" />
                    <span>Real-time</span>
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-72">
                  {notifications.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No notifications</p>
                  ) : (
                    <div className="space-y-4">
                      {notifications.slice(0, 5).map((notification: Notification) => (
                        <div 
                          key={notification.id} 
                          className={`p-3 rounded border ${
                            notification.type === 'error' ? 'border-red-200 bg-red-50 dark:bg-red-950/20' :
                            notification.type === 'warning' ? 'border-amber-200 bg-amber-50 dark:bg-amber-950/20' :
                            notification.type === 'success' ? 'border-green-200 bg-green-50 dark:bg-green-950/20' :
                            'border-blue-200 bg-blue-50 dark:bg-blue-950/20'
                          }`}
                        >
                          <div className="flex justify-between">
                            <span className={`font-medium ${
                              notification.type === 'error' ? 'text-red-600 dark:text-red-400' :
                              notification.type === 'warning' ? 'text-amber-600 dark:text-amber-400' :
                              notification.type === 'success' ? 'text-green-600 dark:text-green-400' :
                              'text-blue-600 dark:text-blue-400'
                            }`}>
                              {notification.title}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                            </span>
                          </div>
                          <p className="mt-1 text-sm">{notification.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
              <CardFooter>
                <Button className="w-full border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 text-xs">
                  View All Notifications
                </Button>
              </CardFooter>
            </Card>
            
            {/* Key Metrics */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Key Metrics
                </CardTitle>
                
                {webSocketConnected && (
                  <Badge className="flex items-center gap-1 border border-gray-200 bg-background">
                    <Signal className="h-3 w-3" />
                    <span>Real-time</span>
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.map((metric) => (
                    <div key={metric.name} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{metric.name}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${getStatusColor(metric.status)}`}>
                            {metric.name.includes('Rate') || metric.name.includes('Errors') 
                              ? `${metric.value.toFixed(1)}${metric.name.includes('Rate') ? '%' : ''}`
                              : metric.name.includes('Time') 
                                ? `${metric.value.toFixed(0)}ms` 
                                : metric.value.toFixed(0)}
                          </span>
                          {metric.change && (
                            <span className={`text-xs ${
                              (metric.change.trend === 'up' && !metric.name.includes('Errors')) || 
                              (metric.change.trend === 'down' && metric.name.includes('Errors'))
                                ? 'text-green-500'
                                : (metric.change.trend === 'down' && !metric.name.includes('Errors')) || 
                                  (metric.change.trend === 'up' && metric.name.includes('Errors'))
                                  ? 'text-red-500'
                                  : 'text-muted-foreground'
                            }`}>
                              {metric.change.trend === 'up' ? '↑' : metric.change.trend === 'down' ? '↓' : '→'}
                              {metric.change.value.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${
                            metric.status === 'critical' ? 'bg-red-500' : 
                            metric.status === 'warning' ? 'bg-amber-500' : 
                            'bg-green-500'
                          }`}
                          style={{ 
                            width: `${
                              metric.name.includes('Rate') || metric.name.includes('Usage') 
                                ? metric.value 
                                : Math.min(100, (metric.value / (
                                  metric.name.includes('Time') ? 300 : 
                                  metric.name.includes('Errors') ? 10 : 
                                  metric.name.includes('Transaction') ? 30 : 100
                                )) * 100)
                            }%` 
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 text-xs">
                  View Detailed Metrics
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="flex justify-end mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Timeframe:</span>
              <Select
                value={timeframe}
                onValueChange={handleTimeframeChange}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Daily" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hour">Hour</SelectItem>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <RealTimePerformanceChart 
            farmId={farmId}
            agentId={agentId}
            timeframe={timeframe}
          />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {['Win Rate', 'Avg. Trade Duration', 'API Success Rate', 'Profit Factor'].map((metric, i) => (
              <Card key={metric}>
                <CardHeader className="p-4">
                  <CardTitle className="text-sm">{metric}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-bold">
                    {i === 0 ? '76.4%' : 
                     i === 1 ? '127s' : 
                     i === 2 ? '99.2%' : 
                     '1.85'}
                  </div>
                  <div className={`text-xs mt-1 ${i % 2 === 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {i % 2 === 0 ? '↑' : '↓'} {Math.random().toFixed(2)}% from last period
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Alert History
                </CardTitle>
                <CardDescription>
                  Recent system alerts and notifications
                </CardDescription>
              </div>
              
              {webSocketConnected && (
                <Badge className="flex items-center gap-1 border border-gray-200 bg-background">
                  <Signal className="h-3 w-3" />
                  <span>Real-time</span>
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="flex gap-3 p-3 border rounded">
                      <div className="mt-0.5">
                        {alert.level === 'critical' || alert.level === 'error' ? (
                          <XCircle className="h-5 w-5 text-red-500" />
                        ) : alert.level === 'warning' ? (
                          <AlertTriangle className="h-5 w-5 text-amber-500" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <div className="flex items-center gap-2">
                            {getAlertBadge(alert.level)}
                            {alert.entityName && (
                              <span className="text-sm font-medium">{alert.entityName}</span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(alert.timestamp, { addSuffix: true })}
                          </span>
                        </div>
                        <p className="mt-1">{alert.message}</p>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Source: {alert.source.charAt(0).toUpperCase() + alert.source.slice(1)}
                          {alert.entityId && ` • ID: ${alert.entityId}`}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {alerts.length === 0 && (
                    <div className="flex flex-col items-center justify-center p-8">
                      <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                      <p className="text-muted-foreground">No alerts at this time</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter>
              <div className="flex justify-between w-full">
                <Button className="border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 text-xs">
                  Export Alerts
                </Button>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3 text-xs">
                  Configure Alerts
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 