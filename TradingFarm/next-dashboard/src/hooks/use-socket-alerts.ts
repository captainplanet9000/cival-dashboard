"use client";

import { useEffect, useState } from "react";
import { useSocket, TRADING_EVENTS } from "@/providers/socket-provider";

export type AlertSeverity = "info" | "warning" | "error" | "success";

export type SystemAlert = {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  timestamp: number;
  source: string;
  read: boolean;
  category: string;
  link?: string;
  actions?: Array<{
    label: string;
    action: string;
    data?: any;
  }>;
};

export const useSocketAlerts = () => {
  const { socket, isConnected, sendMessage } = useSocket();
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!socket || !isConnected) return;

    setIsLoading(true);

    // Handle system alerts
    const handleSystemAlert = (data: SystemAlert) => {
      setIsLoading(false);
      
      setAlerts(prevAlerts => {
        // Check if alert already exists
        const existingAlertIndex = prevAlerts.findIndex(alert => alert.id === data.id);
        
        if (existingAlertIndex >= 0) {
          // Update existing alert
          const updatedAlerts = [...prevAlerts];
          updatedAlerts[existingAlertIndex] = data;
          return updatedAlerts;
        } else {
          // Add new alert to the beginning of the array
          return [data, ...prevAlerts].slice(0, 100); // Limit to 100 alerts
        }
      });
    };

    // Register event handler
    socket.on(TRADING_EVENTS.SYSTEM_ALERT, handleSystemAlert);

    // Request initial alerts
    socket.emit("alert:list", { limit: 50 });

    return () => {
      socket.off(TRADING_EVENTS.SYSTEM_ALERT, handleSystemAlert);
    };
  }, [socket, isConnected]);

  // Mark alerts as read
  const markAsRead = (alertIds: string[]) => {
    if (!socket || !isConnected) {
      console.error("Cannot mark alerts as read: Socket not connected");
      return false;
    }

    sendMessage("alert:markRead", { alertIds });
    
    // Optimistically update local state
    setAlerts(prevAlerts => 
      prevAlerts.map(alert => 
        alertIds.includes(alert.id) 
          ? { ...alert, read: true } 
          : alert
      )
    );
    
    return true;
  };

  // Execute an alert action
  const executeAlertAction = (alertId: string, actionName: string, actionData?: any) => {
    if (!socket || !isConnected) {
      console.error("Cannot execute alert action: Socket not connected");
      return false;
    }

    sendMessage("alert:executeAction", { alertId, actionName, actionData });
    return true;
  };

  return {
    alerts,
    unreadCount: alerts.filter(alert => !alert.read).length,
    isLoading,
    isConnected,
    markAsRead,
    executeAlertAction,
  };
};
