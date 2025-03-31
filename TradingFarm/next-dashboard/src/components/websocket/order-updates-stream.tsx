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
  Brain
} from 'lucide-react';
import { Tables } from '@/types/database.types';

type Order = Tables<'orders'>;

interface OrderUpdate {
  id: string;
  order_id: string;
  status: string;
  previous_status?: string;
  timestamp: string;
  details?: any;
  symbol?: string;
  size?: number;
  price?: number;
  farm_id?: string;
  exchange_id?: string;
  is_buy?: boolean;
  value?: number;
  message?: string;
  trigger_source?: 'manual' | 'system' | 'strategy' | 'api' | 'elizaos';
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
  const { isConnected, messages, connectionStatus, subscribe, unsubscribe } = useSocket();
  const [orderUpdates, setOrderUpdates] = useState<OrderUpdate[]>([]);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [paused, setPaused] = useState(false);
  const { toast } = useToast();
  
  // Subscribe to ORDER_UPDATE messages on component mount
  useEffect(() => {
    // Subscribe to farmId-specific room if provided, otherwise global updates
    const roomName = farmId ? `farm:${farmId}:orders` : 'orders';
    subscribe(roomName);
    
    // Cleanup on unmount
    return () => {
      unsubscribe(roomName);
    };
  }, [farmId, subscribe, unsubscribe]);
  
  // Process incoming order update messages
  useEffect(() => {
    if (paused) return;
    
    const orderUpdateMessages = messages.filter(
      (msg) => msg.type === 'ORDER_UPDATE' && (!farmId || msg.farm_id === farmId)
    );
    
    if (orderUpdateMessages.length > 0) {
      const updates = orderUpdateMessages.map((msg) => ({
        id: `${msg.data.order_id}-${msg.timestamp}`,
        ...msg.data,
        timestamp: msg.timestamp
      }));
      
      setOrderUpdates((prev) => {
        // Combine with previous updates, removing duplicates by id
        const combined = [...prev, ...updates];
        const unique = combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
        
        // Sort by timestamp (newest first) and limit
        return unique
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, limit);
      });
    }
  }, [messages, farmId, paused, limit]);
  
  // Filter updates based on active tab
  const filteredUpdates = React.useMemo(() => {
    if (activeTab === 'all') return orderUpdates;
    if (activeTab === 'filled') return orderUpdates.filter(update => update.status === 'FILLED');
    if (activeTab === 'canceled') return orderUpdates.filter(update => update.status === 'CANCELED');
    if (activeTab === 'rejected') return orderUpdates.filter(update => update.status === 'REJECTED');
    if (activeTab === 'ai') return orderUpdates.filter(update => update.trigger_source === 'elizaos');
    return orderUpdates;
  }, [activeTab, orderUpdates]);
  
  // Helper to determine badge color based on order status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NEW':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">New</Badge>;
      case 'PARTIALLY_FILLED':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Partially Filled</Badge>;
      case 'FILLED':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Filled</Badge>;
      case 'CANCELED':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Canceled</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>;
      case 'EXPIRED':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Get icon for trigger source
  const getTriggerSourceIcon = (source?: string) => {
    switch (source) {
      case 'manual':
        return null;
      case 'system':
        return <Zap className="h-3.5 w-3.5 text-amber-500 mr-1" />;
      case 'strategy':
        return <RotateCw className="h-3.5 w-3.5 text-blue-500 mr-1" />;
      case 'api':
        return <Wifi className="h-3.5 w-3.5 text-purple-500 mr-1" />;
      case 'elizaos':
        return <Brain className="h-3.5 w-3.5 text-primary mr-1" />;
      default:
        return null;
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
    setOrderUpdates([]);
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
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
                <TabsTrigger value="ai" className="flex items-center">
                  <Brain className="h-3.5 w-3.5 mr-1" />
                  AI
                </TabsTrigger>
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
          ) : orderUpdates.length === 0 ? (
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
                  <div 
                    key={update.id} 
                    className={`border rounded-lg p-3 transition-colors ${
                      update.status === 'FILLED' ? 'border-green-200 bg-green-50/50' :
                      update.status === 'REJECTED' ? 'border-red-200 bg-red-50/50' :
                      update.status === 'CANCELED' ? 'border-amber-200 bg-amber-50/50' :
                      update.trigger_source === 'elizaos' ? 'border-primary/20 bg-primary/5' :
                      'border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2">
                          {getTriggerSourceIcon(update.trigger_source)}
                          <span className="font-medium">
                            {update.symbol} {update.is_buy ? 'Buy' : 'Sell'} Order
                          </span>
                          {update.order_id && (
                            <span className="text-xs text-muted-foreground">
                              #{update.order_id.slice(0, 8)}
                            </span>
                          )}
                        </div>
                        
                        {update.previous_status && (
                          <div className="text-sm mt-1 flex items-center">
                            <span className="text-muted-foreground">Status changed:</span>
                            <span className="mx-1">{getStatusBadge(update.previous_status)}</span>
                            <span className="mx-1">→</span>
                            <span>{getStatusBadge(update.status)}</span>
                          </div>
                        )}
                        
                        <div className="mt-1 text-sm">
                          {update.size && (
                            <span className="mr-2">
                              <span className="text-muted-foreground">Size:</span> {update.size}
                            </span>
                          )}
                          {update.price && (
                            <span className="mr-2">
                              <span className="text-muted-foreground">Price:</span> ${update.price.toFixed(2)}
                            </span>
                          )}
                          {update.value && (
                            <span>
                              <span className="text-muted-foreground">Value:</span> ${update.value.toFixed(2)}
                            </span>
                          )}
                        </div>
                        
                        {update.message && (
                          <div className="mt-1 text-sm text-muted-foreground">
                            {update.message}
                          </div>
                        )}
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(update.timestamp), 'HH:mm:ss')}
                      </div>
                    </div>
                  </div>
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
