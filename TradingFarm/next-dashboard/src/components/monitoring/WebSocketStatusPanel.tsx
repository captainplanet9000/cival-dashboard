/**
 * WebSocket Status Panel
 * 
 * Displays the status of all WebSocket connections with detailed metrics.
 * Features:
 * - Connection health indicators
 * - Real-time metrics tracking
 * - Connection management capabilities
 * - Subscription details
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from '@/components/ui/card';
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertCircle, 
  CheckCircle, 
  RefreshCw, 
  Activity, 
  X, 
  Link, 
  RefreshCcw,
  Clock,
  Eye
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { 
  WebSocketConnection, 
  ConnectionStatus, 
  WebSocketEvent,
  PoolStatistics,
  ExchangeId 
} from '@/utils/websocket/websocket-types';
import { WebSocketPool } from '@/utils/websocket/websocket-pool';
import { formatDistanceToNow } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Helper for formatting numbers
const formatNumber = (num: number, decimals = 2): string => {
  return num.toFixed(decimals);
};

// Format bytes to human-readable string
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

interface WebSocketStatusPanelProps {
  webSocketPool: WebSocketPool;
}

export function WebSocketStatusPanel({ webSocketPool }: WebSocketStatusPanelProps) {
  const [stats, setStats] = useState<PoolStatistics | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);

  // Update stats periodically
  useEffect(() => {
    // Get initial stats
    setStats(webSocketPool.getStatistics());
    
    // Listen for statistics updates
    const unsubscribe = webSocketPool.on(WebSocketEvent.Statistics, (data) => {
      setStats(data as PoolStatistics);
    });
    
    // Also update when connections change
    const unsubscribeConnect = webSocketPool.on(WebSocketEvent.Connected, () => {
      setStats(webSocketPool.getStatistics());
    });
    
    const unsubscribeDisconnect = webSocketPool.on(WebSocketEvent.Disconnected, () => {
      setStats(webSocketPool.getStatistics());
    });
    
    return () => {
      unsubscribe();
      unsubscribeConnect();
      unsubscribeDisconnect();
    };
  }, [webSocketPool]);

  // Status badge colors by connection status
  const getStatusBadge = (status: ConnectionStatus) => {
    switch (status) {
      case 'open':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Connected
          </Badge>
        );
      case 'connecting':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 flex items-center gap-1">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Connecting
          </Badge>
        );
      case 'closing':
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 flex items-center gap-1">
            <RefreshCcw className="h-3 w-3 animate-spin" />
            Reconnecting
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Error
          </Badge>
        );
      case 'closed':
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 flex items-center gap-1">
            <X className="h-3 w-3" />
            Disconnected
          </Badge>
        );
    }
  };

  // Format time elapsed for better readability
  const getTimeElapsed = (timestamp: number) => {
    return formatDistanceToNow(timestamp, { addSuffix: true });
  };

  // Refresh all connections
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await webSocketPool.disconnectAll();
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay
      await webSocketPool.connectAll();
      toast({
        title: 'Connections Refreshed',
        description: 'All WebSocket connections have been refreshed.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error Refreshing Connections',
        description: 'Failed to refresh connections. Please try again.',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Reconnect a specific connection
  const handleReconnect = async (connectionId: string) => {
    const connection = webSocketPool.getConnection(connectionId);
    if (!connection) return;
    
    try {
      await connection.disconnect();
      await connection.connect();
      toast({
        title: 'Connection Restarted',
        description: `The connection to ${connection.name} has been restarted.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error Restarting Connection',
        description: `Failed to restart connection to ${connection.name}.`,
      });
    }
  };

  // Get the selected connection details
  const selectedConnectionDetails = useMemo(() => {
    if (!selectedConnection || !stats) return null;
    return stats.connections.find(conn => conn.id === selectedConnection);
  }, [selectedConnection, stats]);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>WebSocket Connections</CardTitle>
            <CardDescription>
              Real-time status of all exchange WebSocket connections
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh All'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Global Stats */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="bg-muted rounded-md p-3 flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <div>
              <div className="text-sm font-medium">Active Connections</div>
              <div className="text-2xl font-bold">{stats?.activeConnections || 0}</div>
            </div>
          </div>
          
          <div className="bg-muted rounded-md p-3 flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            <div>
              <div className="text-sm font-medium">Message Rate</div>
              <div className="text-2xl font-bold">{formatNumber(stats?.messageRate || 0)} msg/s</div>
            </div>
          </div>
        </div>
        
        {/* Connections Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Connection</TableHead>
                <TableHead>Exchange</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Messages (Total)</TableHead>
                <TableHead className="text-right">Last Activity</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats?.connections.map((connection) => (
                <TableRow key={connection.id}>
                  <TableCell className="font-medium">{connection.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {connection.exchange}
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(connection.status)}</TableCell>
                  <TableCell>{connection.messagesReceived}</TableCell>
                  <TableCell className="text-right">
                    {connection.lastMessageAt ? (
                      <div className="flex items-center justify-end gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{getTimeElapsed(connection.lastMessageAt)}</span>
                      </div>
                    ) : (
                      'No messages yet'
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedConnection(connection.id);
                          setSubscriptionDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleReconnect(connection.id)}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              
              {(!stats?.connections || stats.connections.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    No active WebSocket connections
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Connection Details Dialog */}
        <Dialog open={subscriptionDialogOpen} onOpenChange={setSubscriptionDialogOpen as any}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Connection Details</DialogTitle>
              <DialogDescription>
                Detailed information about the WebSocket connection
              </DialogDescription>
            </DialogHeader>
            
            {selectedConnectionDetails && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Connection Info</h3>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="font-semibold">Name:</div>
                      <div className="col-span-2">{selectedConnectionDetails.name}</div>
                      
                      <div className="font-semibold">URL:</div>
                      <div className="col-span-2 truncate">
                        {selectedConnectionDetails.url}
                      </div>
                      
                      <div className="font-semibold">Exchange:</div>
                      <div className="col-span-2">
                        <Badge variant="secondary">{selectedConnectionDetails.exchange}</Badge>
                      </div>
                      
                      <div className="font-semibold">Status:</div>
                      <div className="col-span-2">
                        {getStatusBadge(selectedConnectionDetails.status)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Statistics</h3>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="font-semibold">Connected for:</div>
                      <div className="col-span-2">
                        {selectedConnectionDetails.connectedAt 
                          ? getTimeElapsed(selectedConnectionDetails.connectedAt) 
                          : 'Not connected'
                        }
                      </div>
                      
                      <div className="font-semibold">Messages received:</div>
                      <div className="col-span-2">{selectedConnectionDetails.messagesReceived}</div>
                      
                      <div className="font-semibold">Data transferred:</div>
                      <div className="col-span-2">
                        {formatBytes(selectedConnectionDetails.bytesReceived)}
                      </div>
                      
                      <div className="font-semibold">Message rate:</div>
                      <div className="col-span-2">
                        {formatNumber(selectedConnectionDetails.messageRate)} msg/s
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-2">Active Subscriptions</h3>
                  <div className="rounded-md border max-h-60 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Channel</TableHead>
                          <TableHead>Symbols</TableHead>
                          <TableHead className="text-right">Params</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedConnectionDetails.subscriptions.map((sub: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{sub.channel}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {sub.symbols.map((symbol: string) => (
                                  <Badge key={symbol} variant="outline">
                                    {symbol.toUpperCase()}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {sub.params && Object.keys(sub.params).length > 0 
                                ? JSON.stringify(sub.params) 
                                : '-'
                              }
                            </TableCell>
                          </TableRow>
                        ))}
                        
                        {selectedConnectionDetails.subscriptions.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-3 text-muted-foreground">
                              No active subscriptions
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setSubscriptionDialogOpen(false)}
                  >
                    Close
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => handleReconnect(selectedConnectionDetails.id)}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reconnect
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
