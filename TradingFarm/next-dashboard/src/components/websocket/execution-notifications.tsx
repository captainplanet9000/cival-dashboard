"use client";

import React from "react";
import { useSocket } from "@/providers/socket-provider";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Clock, RefreshCw, Trash2 } from "lucide-react";

interface ExecutionNotification {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  amount: number;
  price: number;
  timestamp: Date;
  status: "executed" | "partial" | "rejected" | "canceled";
  orderId: string;
  executionSpeed: number; // in milliseconds
}

interface ExecutionNotificationsProps {
  farmId: string;
  limit?: number;
}

export default function ExecutionNotifications({ 
  farmId, 
  limit = 10 
}: ExecutionNotificationsProps) {
  const [notifications, setNotifications] = React.useState<ExecutionNotification[]>([]);
  const { isConnected, subscribe, latestMessages } = useSocket();
  const { toast } = useToast();

  // Initialize mock data once on mount
  React.useEffect(() => {
    // Add mock data for development purposes
    if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true') {
      const mockNotifications: ExecutionNotification[] = [
        {
          id: 'exec-1',
          symbol: 'BTC/USD',
          side: 'buy',
          amount: 0.05,
          price: 52890,
          timestamp: new Date(Date.now() - 120000), // 2 minutes ago
          status: 'executed',
          orderId: 'ord-' + Math.random().toString(36).substring(2, 8),
          executionSpeed: 350,
        },
        {
          id: 'exec-2',
          symbol: 'ETH/USD',
          side: 'sell',
          amount: 1.2,
          price: 2875,
          timestamp: new Date(Date.now() - 360000), // 6 minutes ago
          status: 'partial',
          orderId: 'ord-' + Math.random().toString(36).substring(2, 8),
          executionSpeed: 420,
        },
      ];
      setNotifications(mockNotifications);
    }
  }, []); // Empty dependency array means this runs once on mount
  
  // Subscribe to execution updates in a separate effect
  React.useEffect(() => {
    subscribe('EXECUTION_NOTIFICATION');
    
    return () => {
      // Cleanup will be handled by the provider
    };
  }, [subscribe]); // Only subscribe once on mount
  
  // Store the latest message in a ref to avoid re-renders
  const latestMessageRef = React.useRef<any>(null);
  
  // Update ref when latestMessages changes
  React.useEffect(() => {
    if (latestMessages?.EXECUTION_NOTIFICATION) {
      latestMessageRef.current = latestMessages.EXECUTION_NOTIFICATION;
    }
  }, [latestMessages]);
  
  // Process new execution messages with a separate effect and stable dependencies
  React.useEffect(() => {
    // Skip if no message
    if (!latestMessageRef.current) return;
    
    const message = latestMessageRef.current;
    // Reset the ref to avoid processing the same message multiple times
    latestMessageRef.current = null;
    
    // Only process messages for the current farm
    if (message.farmId !== farmId) return;
    
    const newNotification: ExecutionNotification = {
      id: `exec-${Date.now()}`,
      symbol: message.symbol || "Unknown",
      side: message.side || "buy",
      amount: message.amount || 0,
      price: message.price || 0,
      timestamp: new Date(),
      status: message.status || "executed",
      orderId: message.order_id || "",
      executionSpeed: message.execution_speed || 0
    };

    // Update the notifications list, keeping the most recent ones based on the limit
    setNotifications((prev: ExecutionNotification[]) => {
      const updated = [newNotification, ...prev].slice(0, limit);
      return updated;
    });

    // Show toast for new execution
    toast({
      title: `Order ${newNotification.status.charAt(0).toUpperCase() + newNotification.status.slice(1)}`,
      description: `${newNotification.side.toUpperCase()} ${newNotification.amount} ${newNotification.symbol} @ ${newNotification.price}`,
      variant: newNotification.status === "executed" ? "default" : "destructive",
    });
  }, [farmId, limit, toast]); // Removed latestMessages from dependencies

  // Clear all notifications
  const clearNotifications = () => {
    setNotifications([]);
  };

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "executed":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400">Executed</Badge>;
      case "partial":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-400">Partial</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400">Rejected</Badge>;
      case "canceled":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-400">Canceled</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  // Memoize the UI to prevent unnecessary re-rendering
  return React.useMemo(() => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Badge variant={isConnected ? "outline" : "destructive"} className="px-2 py-1">
          {isConnected ? "Connected" : "Offline"}
        </Badge>
        
        {notifications.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearNotifications}>
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            Clear All
          </Button>
        )}
      </div>

      <div className="h-[250px] overflow-auto">
        {notifications.length > 0 ? (
          <div className="space-y-2">
            {notifications.map((notification: ExecutionNotification) => (
              <div key={notification.id} className="rounded-md border p-3 transition-all hover:bg-accent/50">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <div className={`text-sm font-medium ${notification.side === "buy" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                      {notification.side.toUpperCase()}
                    </div>
                    <div className="text-sm font-medium">{notification.symbol}</div>
                  </div>
                  {getStatusBadge(notification.status)}
                </div>
                
                <div className="text-sm">
                  {notification.amount} @ {notification.price.toLocaleString()}
                </div>
                
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <div>{notification.timestamp.toLocaleTimeString()}</div>
                  
                  <div className="flex items-center">
                    {notification.status === "executed" ? (
                      <div className="flex items-center">
                        <Clock className="mr-1 h-3 w-3" />
                        <span>{(notification.executionSpeed / 1000).toFixed(2)}s</span>
                      </div>
                    ) : (
                      <span>Order ID: {notification.orderId.slice(-6)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center rounded-md border-2 border-dashed text-center p-4">
            {isConnected ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Waiting for execution updates...</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Connect to receive execution updates</p>
            )}
          </div>
        )}
      </div>
    </div>
  ), [notifications, isConnected, clearNotifications, getStatusBadge]);
}
