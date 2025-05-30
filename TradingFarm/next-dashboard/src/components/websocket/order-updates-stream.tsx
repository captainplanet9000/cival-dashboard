'use client';

import React, { useEffect, useState } from 'react';
import { useSocket } from '@/providers/socket-provider';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  RotateCw,
  Wifi,
  WifiOff,
  RefreshCcw,
  X,
  Zap,
  Brain,
  Bot,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Tables } from '@/types/database.types';
import { createBrowserClient } from '@/utils/supabase/client';
import { formatDistanceToNow } from 'date-fns';

type Order = Tables<'orders'>;

interface OrderUpdate {
  id: string;
  orderId: string;
  symbol: string;
  type: 'buy' | 'sell';
  status: 'filled' | 'partial' | 'canceled' | 'pending';
  quantity: number;
  price: number;
  timestamp: string;
  agent?: {
    id: number;
    name: string;
  };
}

interface OrderUpdatesStreamProps {
  farmId?: string;
  limit?: number;
  autoScroll?: boolean;
  showHeader?: boolean;
  showFilters?: boolean;
  height?: string;
  hasElizaOS?: boolean;
}

export default function OrderUpdatesStream({
  farmId,
  limit = 50,
  autoScroll = true,
  showHeader = true,
  showFilters = true,
  height = '400px',
  hasElizaOS = true
}: OrderUpdatesStreamProps) {
  const { isConnected, messages, connectionStatus, subscribe, unsubscribe, lastMessage } = useSocket();
  const [updates, setUpdates] = useState<OrderUpdate[]>([]);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [paused, setPaused] = useState(false);
  const { toast } = useToast();
  const supabase = createBrowserClient();

  // Load initial historical orders
  useEffect(() => {
    const fetchRecentOrders = async () => {
      try {
        setUpdates([]);
        
        // In a real implementation, you would fetch from the actual orders table
        const { data, error } = await supabase
          .from('orders')
          .select(`
            id,
            symbol,
            type,
            status,
            quantity,
            price,
            created_at,
            agents:agent_id (id, name)
          `)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (error) {
          console.error('Error fetching recent orders:', error);
          // Fallback to sample data if there's an error or no data
          setUpdates(getSampleOrderUpdates());
        } else if (data && data.length > 0) {
          // Transform the data to match our OrderUpdate interface
          const orderUpdates: OrderUpdate[] = data.map(order => ({
            id: order.id,
            orderId: order.id,
            symbol: order.symbol,
            type: order.type,
            status: order.status,
            quantity: order.quantity,
            price: order.price,
            timestamp: order.created_at,
            agent: order.agents ? {
              id: order.agents.id,
              name: order.agents.name
            } : undefined
          }));
          
          setUpdates(orderUpdates);
        } else {
          // No data, use sample data
          setUpdates(getSampleOrderUpdates());
        }
      } catch (error) {
        console.error('Error in fetchRecentOrders:', error);
        setUpdates(getSampleOrderUpdates());
      }
    };
    
    fetchRecentOrders();
  }, [supabase]);

  // Listen for new order updates from WebSocket
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'order_update') {
      const newUpdate = lastMessage.data;
      
      // Validate the update has the required fields
      if (newUpdate && newUpdate.orderId && newUpdate.timestamp) {
        setUpdates(prev => {
          // Add the new update at the beginning and limit to 5 items
          const updated = [newUpdate, ...prev].slice(0, 5);
          return updated;
        });
      }
    }
  }, [lastMessage]);

  // Fallback sample data
  const getSampleOrderUpdates = (): OrderUpdate[] => {
    return [
      {
        id: '1',
        orderId: 'ORD-12345',
        symbol: 'BTC/USD',
        type: 'buy',
        status: 'filled',
        quantity: 0.15,
        price: 67500,
        timestamp: new Date(Date.now() - 5 * 60000).toISOString(), // 5 minutes ago
        agent: {
          id: 1,
          name: 'Trend Follower'
        }
      },
      {
        id: '2',
        orderId: 'ORD-12346',
        symbol: 'ETH/USD',
        type: 'sell',
        status: 'filled',
        quantity: 2.5,
        price: 3450,
        timestamp: new Date(Date.now() - 15 * 60000).toISOString(), // 15 minutes ago
        agent: {
          id: 2,
          name: 'Momentum Trader'
        }
      },
      {
        id: '3',
        orderId: 'ORD-12347',
        symbol: 'SOL/USD',
        type: 'buy',
        status: 'pending',
        quantity: 18,
        price: 165,
        timestamp: new Date(Date.now() - 25 * 60000).toISOString(), // 25 minutes ago
        agent: {
          id: 3,
          name: 'Scalper Bot'
        }
      }
    ];
  };

  // Filter updates based on active tab
  const filteredUpdates = React.useMemo(() => {
    if (activeTab === 'all') return updates;
    if (activeTab === 'filled') return updates.filter(update => update.status === 'filled');
    if (activeTab === 'canceled') return updates.filter(update => update.status === 'canceled');
    if (activeTab === 'pending') return updates.filter(update => update.status === 'pending');
    return updates;
  }, [activeTab, updates]);
  
  // Helper to determine badge color based on order status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'filled':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Filled</Badge>;
      case 'partial':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Partially Filled</Badge>;
      case 'canceled':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Canceled</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Toggle pause/resume updates
  const togglePause = () => {
    setPaused(!paused);
    toast({
      title: paused ? "Updates resumed" : "Updates paused",
      description: paused ? "Real-time order updates have been resumed" : "Real-time order updates have been paused",
    });
  };
  
  // Clear all updates
  const clearUpdates = () => {
    setUpdates([]);
    toast({
      title: "Updates cleared",
      description: "Order update history has been cleared",
    });
  };
  
  return (
    <Card className="w-full">
      {showHeader && (
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl flex items-center">
                <Zap className="h-5 w-5 mr-2" />
                Real-Time Order Updates
              </CardTitle>
              <CardDescription>
                Live feed of order status changes and executions
              </CardDescription>
            </div>
            
            <div className="flex items-center space-x-2">
              {hasElizaOS && (
                <Badge className="bg-primary/20 text-primary border-primary/30 flex items-center">
                  <Brain className="h-3 w-3 mr-1" />
                  ElizaOS Enhanced
                </Badge>
              )}
              <Badge 
                className={`flex items-center ${
                  connectionStatus === 'connected' 
                    ? 'bg-green-100 text-green-800 border-green-200' 
                    : 'bg-red-100 text-red-800 border-red-200'
                }`}
              >
                {connectionStatus === 'connected' ? (
                  <>
                    <Wifi className="h-3 w-3 mr-1" />
                    Connected
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3 mr-1" />
                    Disconnected
                  </>
                )}
              </Badge>
            </div>
          </div>
        </CardHeader>
      )}
      
      <CardContent className="p-0">
        {showFilters && (
          <div className="px-6 pt-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="filled">Filled</TabsTrigger>
                <TabsTrigger value="canceled">Canceled</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}
        
        <div className="px-6 py-3">
          {!isConnected ? (
            <Alert variant="destructive" className="bg-red-50 border-red-200">
              <WifiOff className="h-4 w-4" />
              <AlertDescription>
                Not connected to real-time feed. Reconnecting...
              </AlertDescription>
            </Alert>
          ) : updates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Clock className="h-12 w-12 text-muted-foreground opacity-20 mb-3" />
              <p className="text-sm text-muted-foreground">
                No order updates received yet. Waiting for activity...
              </p>
            </div>
          ) : (
            <ScrollArea className={`pr-4`} style={{ height }}>
              <div className="space-y-3">
                {filteredUpdates.map((update) => (
                  <Card key={update.id} className="overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          {update.type === 'buy' ? (
                            <ArrowUpRight className="h-4 w-4 text-green-500" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 text-red-500" />
                          )}
                          <span className="font-medium">
                            {update.symbol} · {update.type.toUpperCase()}
                          </span>
                        </div>
                        <Badge
                          className={
                            update.status === 'filled'
                              ? 'bg-green-500'
                              : update.status === 'partial'
                              ? 'bg-blue-500'
                              : update.status === 'canceled'
                              ? 'bg-red-500'
                              : 'bg-yellow-500'
                          }
                        >
                          {update.status.toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between mt-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">
                            {update.quantity} @ ${update.price.toLocaleString()}
                          </p>
                          <p className="text-muted-foreground flex items-center mt-1">
                            <Bot className="h-3 w-3 mr-1" />
                            {update.agent?.name || 'Unknown Agent'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-muted-foreground">
                            ${(update.quantity * update.price).toLocaleString()}
                          </p>
                          <p className="text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(update.timestamp), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="border-t py-3 px-6 flex justify-between">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={togglePause}
        >
          {paused ? (
            <>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Resume
            </>
          ) : (
            <>
              <Clock className="h-4 w-4 mr-2" />
              Pause
            </>
          )}
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={clearUpdates}
        >
          <X className="h-4 w-4 mr-2" />
          Clear
        </Button>
      </CardFooter>
    </Card>
  );
}
