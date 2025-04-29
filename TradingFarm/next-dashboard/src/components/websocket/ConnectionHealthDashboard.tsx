"use client";

/**
 * WebSocket Connection Health Dashboard
 * 
 * A dashboard component for monitoring WebSocket connections across exchanges.
 * Features connection status visualization, real-time metrics, and management controls.
 * 
 * @module components/websocket
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { TabsContent, Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { AlertCircle, CheckCircle, RefreshCw, XCircle } from 'lucide-react';
import { ConnectionStatus } from './ConnectionStatus';
import { ConnectionMetrics } from './ConnectionMetrics';
import { ConnectionControls } from './ConnectionControls';
import { useWebSocketConnections } from '@/hooks/useWebSocketConnections';
import {
  WebSocketConnectionStatus,
  WebSocketConnection,
  WebSocketConnectionMetric
} from '@/lib/websocket/types';

/**
 * Props for the ConnectionHealthDashboard component
 */
interface ConnectionHealthDashboardProps {
  /**
   * Optional user ID to filter connections by
   */
  userId?: string;
  
  /**
   * Optional refresh interval in milliseconds (defaults to 10 seconds)
   */
  refreshInterval?: number;
  
  /**
   * Whether to allow connection management (defaults to true)
   */
  allowManagement?: boolean;
}

/**
 * ConnectionHealthDashboard component
 * 
 * Displays health information, metrics, and statuses for all WebSocket connections.
 * Allows management of connections if enabled.
 */
export function ConnectionHealthDashboard({
  userId,
  refreshInterval = 10000,
  allowManagement = true,
}: ConnectionHealthDashboardProps): React.ReactElement {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = React.useState<string>('all');
  
  // Fetch connections using the custom hook
  const {
    connections,
    metrics,
    isLoading,
    error,
    refreshData,
    connectToExchange,
    disconnectFromExchange,
  } = useWebSocketConnections({
    userId,
    refreshInterval,
  });
  
  // Filter connections by status when tab changes
  const filteredConnections = React.useMemo(() => {
    if (activeTab === 'all') {
      return connections;
    }
    
    return connections.filter((connection: WebSocketConnection) => connection.status === activeTab);
  }, [connections, activeTab]);
  
  // Calculate connection statistics
  const stats = React.useMemo(() => {
    const total = connections.length;
    const connected = connections.filter((c: WebSocketConnection) => c.status === 'connected').length;
    const error = connections.filter((c: WebSocketConnection) => c.status === 'error').length;
    const disconnected = connections.filter((c: WebSocketConnection) => c.status === 'disconnected').length;
    const connecting = connections.filter((c: WebSocketConnection) => c.status === 'connecting').length;
    
    // Calculate health score (percentage of healthy connections)
    const healthyConnectionsPercentage = total > 0 
      ? Math.round((connected / total) * 100) 
      : 0;
      
    return {
      total,
      connected,
      error,
      disconnected,
      connecting,
      healthScore: healthyConnectionsPercentage
    };
  }, [connections]);
  
  // Handle manual refresh
  const handleRefresh = () => {
    refreshData();
    toast({
      title: 'Refreshing data',
      description: 'Connection health data is being updated...',
    });
  };
  
  if (isLoading && connections.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connection Health Dashboard</CardTitle>
          <CardDescription>Loading connection data...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error loading connection data</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : 'Unknown error occurred'}
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Connection Health Dashboard</CardTitle>
            <CardDescription>
              Monitor WebSocket connection health across exchanges
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Health Score & Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Health Score</CardTitle>
              {stats.healthScore >= 80 ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : stats.healthScore >= 50 ? (
                <AlertCircle className="h-4 w-4 text-amber-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.healthScore}%</div>
              <Progress value={stats.healthScore} className="mt-2" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Connections</CardTitle>
              <span className="rounded-full bg-primary/10 p-1">
                <RefreshCw className="h-4 w-4 text-primary" />
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                Across {new Set(connections.map((c: WebSocketConnection) => c.exchange)).size} exchanges
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Connected</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.connected}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0 ? Math.round((stats.connected / stats.total) * 100) : 0}% of total connections
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Issues</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.error}</div>
              <p className="text-xs text-muted-foreground">
                {stats.disconnected} disconnected, {stats.connecting} connecting
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Connection Listing */}
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="all">
                All
                <Badge variant="outline" className="ml-2">{connections.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="connected">
                Connected
                <Badge variant="outline" className="ml-2">{stats.connected}</Badge>
              </TabsTrigger>
              <TabsTrigger value="error">
                Error
                <Badge variant="outline" className="ml-2">{stats.error}</Badge>
              </TabsTrigger>
              <TabsTrigger value="disconnected">
                Disconnected
                <Badge variant="outline" className="ml-2">{stats.disconnected}</Badge>
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value={activeTab} className="mt-6">
            {filteredConnections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="rounded-full bg-muted p-3">
                  <RefreshCw className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">No connections found</h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-xs">
                  {activeTab === 'all' 
                    ? 'There are no WebSocket connections to display.' 
                    : `There are no connections with status "${activeTab}".`}
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredConnections.map((connection: WebSocketConnection) => (
                  <Card key={`${connection.exchange}-${connection.connection_id}`} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">{connection.exchange}</CardTitle>
                          <CardDescription className="text-xs truncate max-w-[300px]">
                            {connection.connection_url}
                          </CardDescription>
                        </div>
                        <ConnectionStatus status={connection.status as WebSocketConnectionStatus} />
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pb-2">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <ConnectionMetrics 
                          connectionId={connection.id} 
                          metrics={metrics.filter((m: WebSocketConnectionMetric) => m.connection_id === connection.id)} 
                        />
                      </div>
                    </CardContent>
                    
                    {allowManagement && (
                      <>
                        <Separator />
                        <CardFooter className="pt-4">
                          <ConnectionControls 
                            connection={connection}
                            onConnect={() => connectToExchange(connection.exchange, connection.connection_id)}
                            onDisconnect={() => disconnectFromExchange(connection.id)}
                          />
                        </CardFooter>
                      </>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
