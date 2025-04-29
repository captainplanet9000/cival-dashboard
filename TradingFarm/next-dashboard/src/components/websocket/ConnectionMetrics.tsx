/**
 * WebSocket Connection Metrics Component
 * 
 * Displays real-time metrics for a WebSocket connection.
 * 
 * @module components/websocket
 */

import React from 'react';
import { Activity, ArrowDown, ArrowUp, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { WebSocketConnectionMetric } from '@/lib/websocket/types';

/**
 * Props for the ConnectionMetrics component
 */
interface ConnectionMetricsProps {
  /**
   * The connection ID to display metrics for
   */
  connectionId: number;
  
  /**
   * Array of metrics for the connection
   */
  metrics: WebSocketConnectionMetric[];
}

/**
 * Format bytes to human-readable string
 * 
 * @param bytes - Number of bytes
 * @param decimals - Number of decimal places
 * @returns Formatted string
 */
function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format latency value to human-readable string
 * 
 * @param latency - Latency in milliseconds
 * @returns Formatted string
 */
function formatLatency(latency: number): string {
  if (latency < 1) {
    return `${(latency * 1000).toFixed(0)}μs`;
  }
  
  if (latency < 1000) {
    return `${latency.toFixed(0)}ms`;
  }
  
  return `${(latency / 1000).toFixed(2)}s`;
}

/**
 * Get latency color class based on value
 * 
 * @param latency - Latency in milliseconds
 * @returns CSS color class
 */
function getLatencyColorClass(latency: number): string {
  if (latency < 100) {
    return 'text-green-500';
  }
  
  if (latency < 300) {
    return 'text-amber-500';
  }
  
  return 'text-red-500';
}

/**
 * ConnectionMetrics component
 * 
 * Displays real-time metrics for a WebSocket connection.
 */
export function ConnectionMetrics({ connectionId, metrics }: ConnectionMetricsProps): React.ReactElement {
  // Get the most recent metrics
  const latestMetric = React.useMemo(() => {
    if (metrics.length === 0) return null;
    
    // Sort by timestamp in descending order
    return metrics.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
  }, [metrics]);
  
  // Calculate average latency over last 5 metrics
  const averageLatency = React.useMemo(() => {
    if (metrics.length === 0) return null;
    
    const recentMetrics = metrics
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
    
    const sum = recentMetrics.reduce((acc, metric) => acc + (metric.latency || 0), 0);
    return sum / recentMetrics.length;
  }, [metrics]);
  
  // If no metrics are available
  if (!latestMetric) {
    return (
      <div className="col-span-3 text-sm text-muted-foreground">
        No metrics available for this connection.
      </div>
    );
  }
  
  return (
    <>
      <Card className="overflow-hidden p-0 shadow-none border border-border">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ArrowUp className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Sent</span>
            </div>
            <div className="text-sm font-bold">
              {formatBytes(latestMetric.bytes_sent || 0)}
            </div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {latestMetric.messages_sent || 0} messages
          </div>
        </CardContent>
      </Card>
      
      <Card className="overflow-hidden p-0 shadow-none border border-border">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ArrowDown className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Received</span>
            </div>
            <div className="text-sm font-bold">
              {formatBytes(latestMetric.bytes_received || 0)}
            </div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {latestMetric.messages_received || 0} messages
          </div>
        </CardContent>
      </Card>
      
      <Card className="overflow-hidden p-0 shadow-none border border-border">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className={`h-4 w-4 ${getLatencyColorClass(averageLatency || 0)}`} />
                    <span className="text-sm font-medium">Latency</span>
                  </div>
                  <div className={`text-sm font-bold ${getLatencyColorClass(averageLatency || 0)}`}>
                    {formatLatency(averageLatency || 0)}
                  </div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Last updated: {new Date(latestMetric.created_at).toLocaleTimeString()}
                </div>
              </CardContent>
            </TooltipTrigger>
            <TooltipContent side="top">
              <div className="text-xs">
                <div className="font-semibold mb-1">Connection Latency</div>
                <div>Current: {formatLatency(latestMetric.latency || 0)}</div>
                <div>Average (last 5): {formatLatency(averageLatency || 0)}</div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </Card>
    </>
  );
}
