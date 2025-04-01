"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { api } from '../../../../lib/api-client';
import { RefreshCw, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { Button } from '../../../../components/ui/button';

interface AgentMetricsProps {
  agentId: number;
}

export default function AgentMetrics({ agentId }: AgentMetricsProps) {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number | null>(30000); // 30 seconds

  // Load metrics data
  const loadMetrics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.getAgentMetrics(agentId);
      
      if (response.error) {
        setError(response.error);
      } else {
        setMetrics(response.data);
      }
    } catch (err) {
      setError('Failed to load agent metrics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Initial load and refresh setup
  useEffect(() => {
    loadMetrics();
    
    // Set up interval for refreshing
    if (refreshInterval) {
      const intervalId = setInterval(loadMetrics, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [agentId, refreshInterval]);
  
  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };
  
  // Format percentage
  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };
  
  // Toggle auto-refresh
  const toggleAutoRefresh = () => {
    if (refreshInterval) {
      setRefreshInterval(null); // Turn off auto-refresh
    } else {
      setRefreshInterval(30000); // Turn on auto-refresh (30 seconds)
      loadMetrics(); // Refresh immediately
    }
  };
  
  // Render loading state
  if (loading && !metrics) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin mr-2">
          <RefreshCw size={20} />
        </div>
        Loading metrics...
      </div>
    );
  }
  
  // Render error state
  if (error && !metrics) {
    return (
      <div className="text-center py-8 text-red-500">
        <AlertCircle className="inline-block mb-2" size={24} />
        <p>{error}</p>
        <Button variant="outline" size="sm" onClick={loadMetrics} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }
  
  // If no metrics data yet, show empty state
  if (!metrics || !metrics.history || metrics.history.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No metrics data available for this agent yet.</p>
        <Button variant="outline" size="sm" onClick={loadMetrics} className="mt-4">
          Refresh
        </Button>
      </div>
    );
  }
  
  // Render metrics
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Agent Performance Metrics</h2>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleAutoRefresh}
          >
            {refreshInterval ? 'Stop Auto-refresh' : 'Auto-refresh'}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadMetrics}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
      
      {/* Key Metrics Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(metrics.summary.current_cpu)}%</div>
            <p className="text-xs text-muted-foreground">Avg: {Math.round(metrics.summary.avg_cpu)}%</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(metrics.summary.current_memory)}%</div>
            <p className="text-xs text-muted-foreground">Avg: {Math.round(metrics.summary.avg_memory)}%</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.summary.total_trades}</div>
            <p className="text-xs text-muted-foreground">Lifetime total</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.floor(metrics.summary.uptime / 3600)}h {Math.floor((metrics.summary.uptime % 3600) / 60)}m
            </div>
            <p className="text-xs text-muted-foreground">Since last restart</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Historical Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Performance History</CardTitle>
        </CardHeader>
        <CardContent>
          {/* This would normally contain charts, but we'll use a simple table for now */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 text-left font-medium">Timestamp</th>
                  <th className="pb-2 text-right font-medium">CPU</th>
                  <th className="pb-2 text-right font-medium">Memory</th>
                  <th className="pb-2 text-right font-medium">Trades</th>
                  <th className="pb-2 text-right font-medium">Success Rate</th>
                </tr>
              </thead>
              <tbody>
                {metrics.history.slice(0, 10).map((entry: any, index: number) => (
                  <tr key={index} className="border-b">
                    <td className="py-2 text-left">{formatTimestamp(entry.timestamp)}</td>
                    <td className="py-2 text-right">{Math.round(entry.cpu_usage)}%</td>
                    <td className="py-2 text-right">{Math.round(entry.memory_usage)}%</td>
                    <td className="py-2 text-right">{entry.trades_executed}</td>
                    <td className="py-2 text-right">
                      <span className={entry.success_rate >= 0.5 ? 'text-green-600' : 'text-red-600'}>
                        {formatPercentage(entry.success_rate)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Visualization placeholder */}
          <div className="mt-6">
            <div className="text-center py-8 bg-muted/20 rounded-md">
              <p className="text-sm text-muted-foreground">Performance charts would be displayed here</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* System Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>System Resource Usage</CardTitle>
        </CardHeader>
        <CardContent>
          {/* CPU and Memory usage bars */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm">CPU Usage</span>
                <span className="text-sm font-medium">{Math.round(metrics.summary.current_cpu)}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    metrics.summary.current_cpu > 80 ? 'bg-red-500' : 
                    metrics.summary.current_cpu > 60 ? 'bg-yellow-500' : 
                    'bg-green-500'
                  }`} 
                  style={{ width: `${Math.min(100, metrics.summary.current_cpu)}%` }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm">Memory Usage</span>
                <span className="text-sm font-medium">{Math.round(metrics.summary.current_memory)}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    metrics.summary.current_memory > 80 ? 'bg-red-500' : 
                    metrics.summary.current_memory > 60 ? 'bg-yellow-500' : 
                    'bg-green-500'
                  }`} 
                  style={{ width: `${Math.min(100, metrics.summary.current_memory)}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          {/* Visualization placeholder */}
          <div className="mt-6">
            <div className="text-center py-8 bg-muted/20 rounded-md">
              <p className="text-sm text-muted-foreground">Resource usage charts would be displayed here</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 