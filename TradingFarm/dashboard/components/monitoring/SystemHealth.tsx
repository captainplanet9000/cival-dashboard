import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { 
  ArrowUpRight, 
  AlertTriangle, 
  AlertCircle, 
  Database, 
  Server, 
  RefreshCw, 
  Activity, 
  Cpu, 
  HardDrive, 
  Zap, 
  Loader2 
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { MonitoringData, SystemStatus, ExchangeStatus } from './types';
import ResourceMonitor from './ResourceMonitor';

// Mock data generator for demonstration
const generateMockMonitoringData = (): MonitoringData => {
  const now = new Date();
  const timestamps = Array.from({length: 24}, (_, i) => {
    const time = new Date(now);
    time.setMinutes(now.getMinutes() - (24 - i) * 5);
    return time.toISOString();
  });

  // Helper to create system metrics history
  const createMetricsHistory = (min: number, max: number) => {
    return timestamps.map(timestamp => ({
      timestamp,
      value: min + Math.random() * (max - min)
    }));
  };

  return {
    system: {
      id: 'system-1',
      lastUpdated: now.toISOString(),
      uptime: 345600, // 4 days in seconds
      cpu: {
        id: 'cpu-1',
        name: 'CPU Usage',
        current: 45 + Math.random() * 20,
        max: 100,
        unit: '%',
        status: 'normal',
        history: createMetricsHistory(30, 70)
      },
      memory: {
        id: 'memory-1',
        name: 'Memory Usage',
        current: 6.2 + Math.random() * 2,
        max: 16,
        unit: 'GB',
        status: 'normal',
        history: createMetricsHistory(4, 8)
      },
      disk: {
        id: 'disk-1',
        name: 'Disk Usage',
        current: 120 + Math.random() * 30,
        max: 500,
        unit: 'GB',
        status: Math.random() > 0.8 ? 'warning' : 'normal',
        history: createMetricsHistory(100, 150)
      },
      network: {
        in: {
          id: 'network-in-1',
          name: 'Network In',
          current: 2.5 + Math.random() * 1.5,
          max: 10,
          unit: 'MB/s',
          status: 'normal',
          history: createMetricsHistory(1, 4)
        },
        out: {
          id: 'network-out-1',
          name: 'Network Out',
          current: 1.2 + Math.random() * 0.8,
          max: 10,
          unit: 'MB/s',
          status: 'normal',
          history: createMetricsHistory(0.5, 2)
        }
      },
      processes: 68,
      alerts: {
        critical: Math.floor(Math.random() * 2),
        warning: Math.floor(Math.random() * 5),
        info: Math.floor(Math.random() * 10)
      }
    },
    exchanges: [
      {
        id: 'exchange-1',
        name: 'Binance',
        connected: true,
        lastSyncTime: new Date(now.getTime() - 35000).toISOString(),
        apiRateLimit: {
          current: 15,
          max: 1200,
          resetTime: new Date(now.getTime() + 60000).toISOString()
        },
        latency: 85 + Math.random() * 30,
        status: 'operational',
        errors: []
      },
      {
        id: 'exchange-2',
        name: 'Coinbase',
        connected: true,
        lastSyncTime: new Date(now.getTime() - 28000).toISOString(),
        apiRateLimit: {
          current: 8,
          max: 100,
          resetTime: new Date(now.getTime() + 50000).toISOString()
        },
        latency: 120 + Math.random() * 40,
        status: 'operational',
        errors: []
      },
      {
        id: 'exchange-3',
        name: 'Kraken',
        connected: Math.random() > 0.2,
        lastSyncTime: new Date(now.getTime() - 180000).toISOString(),
        apiRateLimit: {
          current: 3,
          max: 60,
          resetTime: new Date(now.getTime() + 40000).toISOString()
        },
        latency: 200 + Math.random() * 100,
        status: Math.random() > 0.7 ? 'operational' : 'degraded',
        errors: Math.random() > 0.7 ? [] : [
          {
            timestamp: new Date(now.getTime() - 180000).toISOString(),
            message: 'API rate limit warning'
          }
        ]
      }
    ],
    databases: [
      {
        id: 'db-1',
        name: 'Time Series DB',
        queryLatency: 12 + Math.random() * 8,
        connectionCount: 5,
        status: 'operational',
        errorRate: 0.1,
        diskUsage: {
          used: 85 + Math.random() * 10,
          total: 200,
          unit: 'GB'
        }
      },
      {
        id: 'db-2',
        name: 'Strategy State DB',
        queryLatency: 8 + Math.random() * 5,
        connectionCount: 3,
        status: 'operational',
        errorRate: 0.05,
        diskUsage: {
          used: 42 + Math.random() * 5,
          total: 100,
          unit: 'GB'
        }
      }
    ],
    strategies: [
      {
        id: 'strategy-1',
        name: 'Momentum Breakout',
        executionLatency: 230 + Math.random() * 50,
        lastExecutionTime: new Date(now.getTime() - 45000).toISOString(),
        errorCount: 0,
        status: 'running'
      },
      {
        id: 'strategy-2',
        name: 'Mean Reversion',
        executionLatency: 180 + Math.random() * 40,
        lastExecutionTime: new Date(now.getTime() - 62000).toISOString(),
        errorCount: 0,
        status: 'running'
      },
      {
        id: 'strategy-3',
        name: 'Elliott Wave',
        executionLatency: 310 + Math.random() * 60,
        lastExecutionTime: new Date(now.getTime() - 31000).toISOString(),
        errorCount: Math.random() > 0.8 ? 1 : 0,
        status: Math.random() > 0.8 ? 'error' : 'running'
      }
    ],
    errorLogs: [
      {
        timestamp: new Date(now.getTime() - 1800000).toISOString(),
        level: 'warning',
        source: 'Kraken Exchange',
        message: 'High API latency detected (305ms)'
      },
      {
        timestamp: new Date(now.getTime() - 3600000).toISOString(),
        level: 'error',
        source: 'Elliott Wave Strategy',
        message: 'Failed to identify wave pattern, insufficient data'
      },
      {
        timestamp: new Date(now.getTime() - 7200000).toISOString(),
        level: 'info',
        source: 'System',
        message: 'Daily database backup completed'
      }
    ]
  };
};

interface SystemHealthProps {
  className?: string;
  refreshInterval?: number; // milliseconds
}

const SystemHealth: React.FC<SystemHealthProps> = ({ 
  className,
  refreshInterval = 60000 // default: 1 minute
}) => {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mockData = generateMockMonitoringData();
      setData(mockData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch monitoring data', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    return `${days}d ${hours}h ${minutes}m`;
  };

  const getStatusBadge = (status: 'operational' | 'degraded' | 'down' | 'maintenance') => {
    switch (status) {
      case 'operational':
        return <Badge className="bg-green-500">Operational</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-500">Degraded</Badge>;
      case 'down':
        return <Badge className="bg-red-500">Down</Badge>;
      case 'maintenance':
        return <Badge className="bg-blue-500">Maintenance</Badge>;
      default:
        return <Badge>{status}</Badge>;
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

  const renderExchangeStatus = (exchange: ExchangeStatus) => {
    return (
      <Card key={exchange.id} className="col-span-1">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              {exchange.name}
            </CardTitle>
            {getStatusBadge(exchange.status)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground">Connected</p>
                <p className={exchange.connected ? "text-green-500" : "text-red-500"}>
                  {exchange.connected ? "Yes" : "No"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Sync</p>
                <p>{formatTimeDifference(exchange.lastSyncTime)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Latency</p>
                <p className={
                  exchange.latency < 100 ? "text-green-500" : 
                  exchange.latency < 200 ? "text-yellow-500" : "text-red-500"
                }>
                  {exchange.latency.toFixed(0)} ms
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">API Rate</p>
                <p>{exchange.apiRateLimit.current}/{exchange.apiRateLimit.max}</p>
              </div>
            </div>
            
            {exchange.errors.length > 0 && (
              <div className="mt-2 text-sm">
                <p className="text-muted-foreground mb-1">Recent Errors</p>
                <ul className="space-y-1">
                  {exchange.errors.slice(0, 2).map((error, idx) => (
                    <li key={idx} className="text-red-500">
                      {error.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading && !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No monitoring data available</h3>
          <Button className="mt-4" onClick={fetchData}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">System Health</h2>
          <p className="text-muted-foreground">
            Monitor your trading system's performance and resource usage
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : ''}
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 w-8 p-0" 
              onClick={fetchData}
            >
              <RefreshCw className="h-4 w-4" />
              <span className="sr-only">Refresh</span>
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">Auto Refresh</p>
            <Button 
              variant={autoRefresh ? "default" : "outline"} 
              size="sm" 
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? 'On' : 'Off'}
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="exchanges">Exchanges</TabsTrigger>
          <TabsTrigger value="databases">Databases</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">
                      {data.system.alerts.critical > 0 ? 'Critical' : 
                       data.system.alerts.warning > 0 ? 'Warning' : 'Healthy'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Uptime: {formatUptime(data.system.uptime)}
                    </p>
                  </div>
                  <div className={
                    data.system.alerts.critical > 0 ? 'text-red-500' : 
                    data.system.alerts.warning > 0 ? 'text-yellow-500' : 'text-green-500'
                  }>
                    {data.system.alerts.critical > 0 ? <AlertCircle className="h-8 w-8" /> : 
                     data.system.alerts.warning > 0 ? <AlertTriangle className="h-8 w-8" /> : 
                     <ArrowUpRight className="h-8 w-8" />}
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-red-500 font-medium">{data.system.alerts.critical}</p>
                    <p className="text-muted-foreground">Critical</p>
                  </div>
                  <div>
                    <p className="text-yellow-500 font-medium">{data.system.alerts.warning}</p>
                    <p className="text-muted-foreground">Warnings</p>
                  </div>
                  <div>
                    <p className="text-blue-500 font-medium">{data.system.alerts.info}</p>
                    <p className="text-muted-foreground">Info</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <ResourceMonitor resource={data.system.cpu} showChart={false} />
            <ResourceMonitor resource={data.system.memory} showChart={false} />
            <ResourceMonitor resource={data.system.disk} showChart={false} />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="col-span-1 md:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Exchange Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.exchanges.map(exchange => (
                    <div key={exchange.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div className="flex items-center gap-2">
                        <div className={
                          exchange.status === 'operational' ? 'text-green-500' : 
                          exchange.status === 'degraded' ? 'text-yellow-500' : 'text-red-500'
                        }>
                          {exchange.status === 'operational' ? <ArrowUpRight className="h-4 w-4" /> : 
                           exchange.status === 'degraded' ? <AlertTriangle className="h-4 w-4" /> : 
                           <AlertCircle className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="font-medium">{exchange.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {exchange.connected ? 'Connected' : 'Disconnected'} • 
                            Last sync: {formatTimeDifference(exchange.lastSyncTime)}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm">
                        <span className={
                          exchange.latency < 100 ? "text-green-500" : 
                          exchange.latency < 200 ? "text-yellow-500" : "text-red-500"
                        }>
                          {exchange.latency.toFixed(0)} ms
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Strategy Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.strategies.map(strategy => (
                    <div key={strategy.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div>
                        <p className="font-medium">{strategy.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Last execution: {formatTimeDifference(strategy.lastExecutionTime)}
                        </p>
                      </div>
                      <div>
                        <Badge className={
                          strategy.status === 'running' ? 'bg-green-500' : 
                          strategy.status === 'paused' ? 'bg-yellow-500' : 'bg-red-500'
                        }>
                          {strategy.status.charAt(0).toUpperCase() + strategy.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Recent Error Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.errorLogs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No recent errors
                  </p>
                ) : (
                  data.errorLogs.map((log, index) => (
                    <div key={index} className="flex items-start gap-2 border-b pb-2 last:border-0">
                      <div className={
                        log.level === 'critical' ? 'text-red-500' : 
                        log.level === 'error' ? 'text-red-500' : 
                        log.level === 'warning' ? 'text-yellow-500' : 'text-blue-500'
                      }>
                        {log.level === 'critical' || log.level === 'error' ? <AlertCircle className="h-4 w-4" /> : 
                         log.level === 'warning' ? <AlertTriangle className="h-4 w-4" /> : 
                         <ArrowUpRight className="h-4 w-4" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{log.source}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatTimeDifference(log.timestamp)}
                          </p>
                        </div>
                        <p className="text-sm">{log.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="resources" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ResourceMonitor resource={data.system.cpu} />
            <ResourceMonitor resource={data.system.memory} />
            <ResourceMonitor resource={data.system.disk} />
            <div className="grid grid-cols-1 gap-4">
              <ResourceMonitor resource={data.system.network.in} />
              <ResourceMonitor resource={data.system.network.out} />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="exchanges" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.exchanges.map(renderExchangeStatus)}
          </div>
        </TabsContent>
        
        <TabsContent value="databases" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.databases.map(db => (
              <Card key={db.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">
                      {db.name}
                    </CardTitle>
                    <Badge className={
                      db.status === 'operational' ? 'bg-green-500' : 
                      db.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                    }>
                      {db.status.charAt(0).toUpperCase() + db.status.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Query Latency</p>
                      <p className={
                        db.queryLatency < 15 ? "text-green-500" : 
                        db.queryLatency < 30 ? "text-yellow-500" : "text-red-500"
                      }>
                        {db.queryLatency.toFixed(1)} ms
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Connections</p>
                      <p>{db.connectionCount}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Error Rate</p>
                      <p className={
                        db.errorRate < 0.1 ? "text-green-500" : 
                        db.errorRate < 1 ? "text-yellow-500" : "text-red-500"
                      }>
                        {(db.errorRate * 100).toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Disk Usage</p>
                      <p>{db.diskUsage.used} / {db.diskUsage.total} {db.diskUsage.unit}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle>System Logs</CardTitle>
                <Select defaultValue="all">
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.errorLogs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No logs found
                  </p>
                ) : (
                  data.errorLogs.map((log, index) => (
                    <div key={index} className="flex items-start gap-2 border-b pb-2 last:border-0">
                      <div className={
                        log.level === 'critical' ? 'text-red-500' : 
                        log.level === 'error' ? 'text-red-500' : 
                        log.level === 'warning' ? 'text-yellow-500' : 'text-blue-500'
                      }>
                        {log.level === 'critical' || log.level === 'error' ? <AlertCircle className="h-4 w-4" /> : 
                         log.level === 'warning' ? <AlertTriangle className="h-4 w-4" /> : 
                         <ArrowUpRight className="h-4 w-4" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{log.source}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(log.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <p className="text-sm">{log.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemHealth;
