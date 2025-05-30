'use client';

import React, { useState, useEffect } from 'react';
import { WebSocketStatus } from '@/types/websocket';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Activity, Wifi, WifiOff } from 'lucide-react';

interface ConnectionStatusProps {
  websocketUrl?: string;
  apiEndpoint?: string;
  pollingInterval?: number;
}

/**
 * Component that displays and monitors system connection status
 * Tracks WebSocket, API and other system connections
 */
export function ConnectionStatus({
  websocketUrl = process.env.NEXT_PUBLIC_WS_URL || 'wss://api.tradingfarm.com/ws',
  apiEndpoint = '/api/health',
  pollingInterval = 30000
}: ConnectionStatusProps) {
  const [wsStatus, setWsStatus] = useState<WebSocketStatus>('disconnected');
  const [apiStatus, setApiStatus] = useState<'online' | 'offline' | 'degraded'>('online');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  
  // WebSocket connection monitoring
  useEffect(() => {
    // In development or test environments, we can mock the connection
    if (process.env.NODE_ENV !== 'production') {
      setWsStatus('connected');
      setApiStatus('online');
      return;
    }
    
    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout;
    let pingInterval: NodeJS.Timeout;
    
    const connectWebSocket = () => {
      if (ws) {
        ws.close();
      }
      
      ws = new WebSocket(websocketUrl);
      
      ws.onopen = () => {
        setWsStatus('connected');
        // Set up ping interval to keep connection alive and check status
        pingInterval = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };
      
      ws.onclose = () => {
        setWsStatus('disconnected');
        clearInterval(pingInterval);
        // Attempt to reconnect after a delay
        reconnectTimer = setTimeout(connectWebSocket, 5000);
      };
      
      ws.onerror = () => {
        setWsStatus('error');
        ws?.close();
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'pong') {
            setWsStatus('connected');
            setLastChecked(new Date());
          }
        } catch (error) {
          console.error('WebSocket message parsing error:', error);
        }
      };
    };
    
    // Initial connection
    connectWebSocket();
    
    // Check API health
    const checkApiHealth = async () => {
      try {
        const response = await fetch(apiEndpoint);
        if (response.ok) {
          const data = await response.json();
          setApiStatus(data.status || 'online');
        } else {
          setApiStatus('degraded');
        }
      } catch (error) {
        setApiStatus('offline');
      }
      setLastChecked(new Date());
    };
    
    // Initial API health check
    checkApiHealth();
    
    // Set up polling for API health
    const apiHealthInterval = setInterval(checkApiHealth, pollingInterval);
    
    // Cleanup
    return () => {
      if (ws) {
        ws.close();
      }
      clearTimeout(reconnectTimer);
      clearInterval(pingInterval);
      clearInterval(apiHealthInterval);
    };
  }, [websocketUrl, apiEndpoint, pollingInterval]);
  
  // Status indicator for overall system
  const overallStatus = getOverallStatus(wsStatus, apiStatus);
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center space-x-2 cursor-default">
            <StatusIndicator status={overallStatus} />
            <span className="text-xs text-muted-foreground">
              {getStatusText(overallStatus)}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="p-4 max-w-xs">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">System Status</h4>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center space-x-2">
                <div className={`h-2 w-2 rounded-full ${getStatusColor(wsStatus === 'connected' ? 'online' : 'offline')}`} />
                <span>WebSocket</span>
              </div>
              <span className="text-right">{wsStatus === 'connected' ? 'Connected' : wsStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}</span>
              
              <div className="flex items-center space-x-2">
                <div className={`h-2 w-2 rounded-full ${getStatusColor(apiStatus)}`} />
                <span>API</span>
              </div>
              <span className="text-right capitalize">{apiStatus}</span>
            </div>
            
            {lastChecked && (
              <div className="text-xs text-muted-foreground pt-1">
                Last updated: {formatTimeAgo(lastChecked)}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Helper components and functions
function StatusIndicator({ status }: { status: 'online' | 'offline' | 'degraded' }) {
  switch (status) {
    case 'online':
      return <Wifi className="h-4 w-4 text-green-500" />;
    case 'offline':
      return <WifiOff className="h-4 w-4 text-destructive" />;
    case 'degraded':
      return <Activity className="h-4 w-4 text-amber-500" />;
  }
}

function getStatusColor(status: 'online' | 'offline' | 'degraded'): string {
  switch (status) {
    case 'online':
      return 'bg-green-500';
    case 'offline':
      return 'bg-red-500';
    case 'degraded':
      return 'bg-amber-500';
  }
}

function getStatusText(status: 'online' | 'offline' | 'degraded'): string {
  switch (status) {
    case 'online':
      return 'All Systems Operational';
    case 'offline':
      return 'Connection Lost';
    case 'degraded':
      return 'Degraded Performance';
  }
}

function getOverallStatus(
  wsStatus: WebSocketStatus, 
  apiStatus: 'online' | 'offline' | 'degraded'
): 'online' | 'offline' | 'degraded' {
  if (wsStatus === 'error' || wsStatus === 'disconnected' || apiStatus === 'offline') {
    return 'offline';
  }
  
  if (wsStatus === 'connecting' || apiStatus === 'degraded') {
    return 'degraded';
  }
  
  return 'online';
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
}
