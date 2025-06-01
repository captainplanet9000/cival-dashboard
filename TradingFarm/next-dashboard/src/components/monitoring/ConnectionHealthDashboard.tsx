'use client';

import * as React from 'react';
const { useState, useEffect } = React;
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, Clock, RefreshCw, WifiOff, Zap } from 'lucide-react';
import { createBrowserClient } from '@/utils/supabase/client';
import { ConnectionHealth, ConnectionStatus, getConnectionHealthForUser } from '@/utils/supabase/connection-health';
import { formatDistanceToNow } from 'date-fns';

/**
 * Get the appropriate badge color based on connection status
 */
const getStatusColor = (status: ConnectionStatus): string => {
  switch (status) {
    case 'online':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'offline':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    case 'degraded':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    case 'throttled':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  }
};

/**
 * Get the appropriate status icon based on connection status
 */
const StatusIcon = ({ status }: { status: ConnectionStatus }) => {
  switch (status) {
    case 'online':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'offline':
      return <WifiOff className="h-4 w-4 text-red-600" />;
    case 'degraded':
      return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    case 'throttled':
      return <Clock className="h-4 w-4 text-blue-600" />;
    default:
      return <Clock className="h-4 w-4 text-gray-600" />;
  }
};

/**
 * Format latency display with appropriate color
 */
const LatencyDisplay = ({ latency }: { latency?: number | null }) => {
  if (!latency) return <span>N/A</span>;

  let color = 'text-green-600';
  if (latency > 1000) {
    color = 'text-red-600';
  } else if (latency > 500) {
    color = 'text-yellow-600';
  }

  return <span className={color}>{latency}ms</span>;
};

/**
 * Format the last heartbeat time
 */
const LastHeartbeatDisplay = ({ lastHeartbeat }: { lastHeartbeat?: string | null }) => {
  if (!lastHeartbeat) return <span className="text-gray-500">Never</span>;

  try {
    return (
      <span className="text-gray-600">
        {formatDistanceToNow(new Date(lastHeartbeat), { addSuffix: true })}
      </span>
    );
  } catch (error) {
    return <span className="text-gray-500">Invalid date</span>;
  }
};

/**
 * Connection health dashboard component
 */
export function ConnectionHealthDashboard() {
  const { toast } = useToast();
  const supabase = createBrowserClient();
  const [healthData, setHealthData] = useState<ConnectionHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<ConnectionStatus | 'all'>('all');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load connection health data
  useEffect(() => {
    const loadConnectionHealth = async () => {
      setLoading(true);
      
      try {
        // Get the current user
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session?.user) {
          setLoading(false);
          return;
        }
        
        // Get connection health records
        const { data, error } = await getConnectionHealthForUser(supabase, sessionData.session.user.id);
        
        if (error) throw error;
        
        setHealthData(data || []);
      } catch (error: any) {
        console.error('Error loading connection health:', error);
        toast({
          title: 'Error',
          description: 'Failed to load connection health data: ' + (error?.message || 'Unknown error'),
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadConnectionHealth();
  }, [refreshTrigger]);

  // Filter health data based on current tab
  const filteredHealthData = React.useMemo(() => {
    if (currentTab === 'all') return healthData;
    return healthData.filter((item: ConnectionHealth) => item.status === currentTab);
  }, [healthData, currentTab]);

  // Calculate statistics based on connection health records
  const stats = React.useMemo(() => {
    const total = healthData.length;
    const online = healthData.filter((item: ConnectionHealth) => item.status === 'online').length;
    const offline = healthData.filter((item: ConnectionHealth) => item.status === 'offline').length;
    const degraded = healthData.filter((item: ConnectionHealth) => item.status === 'degraded').length;
    const throttled = healthData.filter((item: ConnectionHealth) => item.status === 'throttled').length;
    
    // Calculate average latency (only for online connections)
    const avgLatency = healthData
      .filter((item: ConnectionHealth) => item.status === 'online' && item.latency)
      .reduce((sum: number, item: ConnectionHealth) => sum + (item.latency || 0), 0) / (online || 1);
    
    return {
      total,
      online,
      offline,
      degraded,
      throttled,
      avgLatency: Math.round(avgLatency),
      healthScore: Math.round((online / (total || 1)) * 100)
    };
  }, [healthData]);

  // Handle refresh button click
  const handleRefresh = () => {
    setRefreshTrigger((prev: number) => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Connection Health Monitor</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Connection Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Connections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-800 dark:text-green-300">Online</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-between items-center">
            <div className="text-2xl font-bold">{stats.online}</div>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Degraded</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-between items-center">
            <div className="text-2xl font-bold">{stats.degraded}</div>
            <AlertCircle className="h-5 w-5 text-yellow-600" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-300">Throttled</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-between items-center">
            <div className="text-2xl font-bold">{stats.throttled}</div>
            <Clock className="h-5 w-5 text-blue-600" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-800 dark:text-red-300">Offline</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-between items-center">
            <div className="text-2xl font-bold">{stats.offline}</div>
            <WifiOff className="h-5 w-5 text-red-600" />
          </CardContent>
        </Card>
      </div>

      {/* Connection Details */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Connection Details</CardTitle>
          <CardDescription>
            Detailed status of each exchange connection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" value={currentTab} onValueChange={(value) => setCurrentTab(value as ConnectionStatus | 'all')}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="online" className="text-green-600">Online</TabsTrigger>
              <TabsTrigger value="degraded" className="text-yellow-600">Degraded</TabsTrigger>
              <TabsTrigger value="throttled" className="text-blue-600">Throttled</TabsTrigger>
              <TabsTrigger value="offline" className="text-red-600">Offline</TabsTrigger>
            </TabsList>
            
            <TabsContent value={currentTab} className="mt-4">
              {loading ? (
                <div className="flex justify-center items-center h-32">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredHealthData.length === 0 ? (
                <div className="text-center p-4 text-muted-foreground">
                  No connection data available for the selected filter.
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Exchange</TableHead>
                        <TableHead>Last Heartbeat</TableHead>
                        <TableHead>Latency</TableHead>
                        <TableHead>Errors</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredHealthData.map((connection: ConnectionHealth) => (
                        <TableRow key={connection.id}>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <StatusIcon status={connection.status} />
                              <Badge 
                                variant="outline" 
                                className={getStatusColor(connection.status)}
                              >
                                {connection.status.charAt(0).toUpperCase() + connection.status.slice(1)}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{connection.exchange}</div>
                          </TableCell>
                          <TableCell>
                            <LastHeartbeatDisplay lastHeartbeat={connection.last_heartbeat} />
                          </TableCell>
                          <TableCell>
                            <LatencyDisplay latency={connection.latency} />
                          </TableCell>
                          <TableCell>
                            {connection.error_count > 0 ? (
                              <Badge variant="destructive">{connection.error_count} errors</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-green-100 text-green-800">No errors</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Health Summary Card */}
      {stats.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Connection Health Summary</CardTitle>
            <CardDescription>
              Overall health status of exchange connections
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Status Overview</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <span>Health Score</span>
                    </div>
                    <Badge variant="outline" className={`ml-2 ${stats.healthScore > 80 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {stats.healthScore}%
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <Zap className="h-4 w-4 text-blue-600 mr-2" />
                      <span>Average Latency</span>
                    </div>
                    <LatencyDisplay latency={stats.avgLatency} />
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">Connection Distribution</h3>
                <div className="h-24 flex items-end space-x-2">
                  <div className="flex-1 bg-green-100 dark:bg-green-900" style={{ height: `${(stats.online / stats.total) * 100}%` }}></div>
                  <div className="flex-1 bg-yellow-100 dark:bg-yellow-900" style={{ height: `${(stats.degraded / stats.total) * 100}%` }}></div>
                  <div className="flex-1 bg-blue-100 dark:bg-blue-900" style={{ height: `${(stats.throttled / stats.total) * 100}%` }}></div>
                  <div className="flex-1 bg-red-100 dark:bg-red-900" style={{ height: `${(stats.offline / stats.total) * 100}%` }}></div>
                </div>
                <div className="flex text-xs justify-between mt-1">
                  <span className="text-green-600">Online</span>
                  <span className="text-yellow-600">Degraded</span>
                  <span className="text-blue-600">Throttled</span>
                  <span className="text-red-600">Offline</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
