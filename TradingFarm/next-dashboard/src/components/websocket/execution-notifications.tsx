"use client";

import React, { useState, useEffect } from "react";
import { useSocket } from "@/providers/socket-provider";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Check, RefreshCw, Clock, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const [notifications, setNotifications] = useState<ExecutionNotification[]>([]);
  const { isConnected, messages } = useSocket();
  const { toast } = useToast();

  useEffect(() => {
    // Filter execution messages for this farm
    const executionMessages = messages.filter(
      (msg) => msg.type === "EXECUTION_UPDATE" && msg.farm_id === farmId
    );

    if (executionMessages.length > 0) {
      // Process the latest execution message
      const latestMessage = executionMessages[executionMessages.length - 1];
      
      const newNotification: ExecutionNotification = {
        id: `exec-${Date.now()}`,
        symbol: latestMessage.symbol || "Unknown",
        side: latestMessage.side || "buy",
        amount: latestMessage.amount || 0,
        price: latestMessage.price || 0,
        timestamp: new Date(),
        status: latestMessage.status || "executed",
        orderId: latestMessage.order_id || "",
        executionSpeed: latestMessage.execution_speed || 0
      };

      // Update the notifications list, keeping the most recent ones based on the limit
      setNotifications(prev => {
        const updated = [newNotification, ...prev].slice(0, limit);
        return updated;
      });

      // Show toast for new execution
      toast({
        title: `Order ${newNotification.status.charAt(0).toUpperCase() + newNotification.status.slice(1)}`,
        description: `${newNotification.side.toUpperCase()} ${newNotification.amount} ${newNotification.symbol} @ ${newNotification.price}`,
        variant: newNotification.status === "executed" ? "default" : "destructive",
      });
    }
  }, [messages, farmId, limit, toast]);

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

  return (
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

      <ScrollArea className="h-[250px]">
        {notifications.length > 0 ? (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <div key={notification.id} className="rounded-md border p-3 transition-all">
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
      </ScrollArea>
    </div>
  );
}
