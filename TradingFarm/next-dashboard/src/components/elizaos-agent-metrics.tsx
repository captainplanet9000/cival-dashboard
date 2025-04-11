'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useElizaAgentManager } from '@/hooks/use-elizaos-agent-manager';
import { AgentMetrics } from '@/types/agent-types';
import { createBrowserClient } from '@/utils/supabase/client';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ElizaOSAgentMetricsProps {
  agentId: string;
}

export function ElizaOSAgentMetrics({ agentId }: ElizaOSAgentMetricsProps) {
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [granularity, setGranularity] = useState<string>('minute');
  const [metricsHistory, setMetricsHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { getAgentMetrics, metrics } = useElizaAgentManager(agentId);

  // Fetch initial metrics data
  useEffect(() => {
    getAgentMetrics().catch(err => {
      console.error('Failed to fetch agent metrics:', err);
      setError('Failed to load metrics data');
    });
  }, [agentId, getAgentMetrics]);

  // Subscribe to real-time updates via Supabase Realtime
  useEffect(() => {
    const supabase = createBrowserClient();
    
    // Set up the subscription to agent metrics changes
    const subscription = supabase
      .channel(`agent-metrics-${agentId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'agent_metrics', 
          filter: `agent_id=eq.${agentId}` 
        },
        (payload) => {
          const newMetrics = payload.new as AgentMetrics;
          // Update the metrics state with new data
          getAgentMetrics();
        }
      )
      .subscribe();
    
    // Cleanup subscription when component unmounts
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [agentId, getAgentMetrics]);

  // Fetch historical metrics data based on selected time range and granularity
  useEffect(() => {
    const fetchMetricsHistory = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(
          `/api/elizaos/agents/${agentId}/metrics-history?timeRange=${timeRange}&granularity=${granularity}`
        );
        
        if (!response.ok) {
          throw new Error(`Failed to fetch metrics history: ${response.statusText}`);
        }
        
        const data = await response.json();
        setMetricsHistory(data.data || []);
      } catch (err) {
        console.error('Error fetching metrics history:', err);
        setError('Failed to load historical metrics');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMetricsHistory();
  }, [agentId, timeRange, granularity]);

  // Format timestamp for the chart
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    if (granularity === 'hour') {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (granularity === 'day') {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } else {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  // Calculate KPIs
  const calculateKPIs = () => {
    if (!metrics || metricsHistory.length === 0) {
      return {
        successRate: 0,
        avgResponseTime: 0,
        taskCompletionRate: 0,
        requestsPerMinute: 0
      };
    }
    
    const successfulTasks = metricsHistory.reduce((sum, point) => sum + (point.successful_tasks || 0), 0);
    const totalTasks = metricsHistory.reduce((sum, point) => sum + (point.total_tasks || 0), 0);
    const totalResponseTime = metricsHistory.reduce((sum, point) => sum + (point.avg_response_time || 0), 0);
    
    return {
      successRate: totalTasks > 0 ? (successfulTasks / totalTasks) * 100 : 0,
      avgResponseTime: metricsHistory.length > 0 ? totalResponseTime / metricsHistory.length : 0,
      taskCompletionRate: metrics.task_completion_rate || 0,
      requestsPerMinute: metrics.requests_per_minute || 0
    };
  };

  const kpis = calculateKPIs();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Agent Performance Metrics</CardTitle>
        <CardDescription>
          Monitor the performance and activity of your ElizaOS agent
        </CardDescription>
        <div className="flex space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last 1 hour</SelectItem>
              <SelectItem value="6h">Last 6 hours</SelectItem>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={granularity} onValueChange={setGranularity}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Granularity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minute">By Minute</SelectItem>
              <SelectItem value="hour">By Hour</SelectItem>
              <SelectItem value="day">By Day</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="performance">
          <TabsList className="mb-4">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="requests">Requests</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="memory">Memory Usage</TabsTrigger>
          </TabsList>
          
          {/* KPI Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="p-3">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {loading ? (
                  <Skeleton className="h-8 w-full" />
                ) : (
                  <p className="text-2xl font-bold">{kpis.successRate.toFixed(1)}%</p>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="p-3">
                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {loading ? (
                  <Skeleton className="h-8 w-full" />
                ) : (
                  <p className="text-2xl font-bold">{kpis.avgResponseTime.toFixed(2)}ms</p>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="p-3">
                <CardTitle className="text-sm font-medium">Task Completion</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {loading ? (
                  <Skeleton className="h-8 w-full" />
                ) : (
                  <p className="text-2xl font-bold">{kpis.taskCompletionRate.toFixed(1)}%</p>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="p-3">
                <CardTitle className="text-sm font-medium">Requests/min</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {loading ? (
                  <Skeleton className="h-8 w-full" />
                ) : (
                  <p className="text-2xl font-bold">{kpis.requestsPerMinute.toFixed(1)}</p>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Chart Sections */}
          <TabsContent value="performance" className="min-h-[300px]">
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : error ? (
              <div className="flex items-center justify-center h-[300px] text-destructive">
                {error}
              </div>
            ) : metricsHistory.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No performance data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metricsHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={formatTimestamp}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: number) => [value.toFixed(2), '']} 
                    labelFormatter={(label) => new Date(label).toLocaleString()}
                  />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="avg_response_time" 
                    name="Avg Response Time (ms)" 
                    stroke="#8884d8" 
                    activeDot={{ r: 8 }} 
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="success_rate" 
                    name="Success Rate (%)" 
                    stroke="#82ca9d" 
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </TabsContent>
          
          <TabsContent value="requests" className="min-h-[300px]">
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : error ? (
              <div className="flex items-center justify-center h-[300px] text-destructive">
                {error}
              </div>
            ) : metricsHistory.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No request data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metricsHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={formatTimestamp}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: number) => [value.toFixed(2), '']} 
                    labelFormatter={(label) => new Date(label).toLocaleString()}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="requests_per_minute" 
                    name="Requests/min" 
                    stroke="#ff7300" 
                    activeDot={{ r: 8 }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="successful_requests" 
                    name="Successful Requests" 
                    stroke="#387908" 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="failed_requests" 
                    name="Failed Requests" 
                    stroke="#d32f2f" 
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </TabsContent>
          
          <TabsContent value="tasks" className="min-h-[300px]">
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : error ? (
              <div className="flex items-center justify-center h-[300px] text-destructive">
                {error}
              </div>
            ) : metricsHistory.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No task data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metricsHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={formatTimestamp}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: number) => [value.toFixed(2), '']} 
                    labelFormatter={(label) => new Date(label).toLocaleString()}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="total_tasks" 
                    name="Total Tasks" 
                    stroke="#8884d8" 
                    activeDot={{ r: 8 }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="successful_tasks" 
                    name="Successful Tasks" 
                    stroke="#82ca9d" 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="failed_tasks" 
                    name="Failed Tasks" 
                    stroke="#d32f2f" 
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </TabsContent>
          
          <TabsContent value="memory" className="min-h-[300px]">
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : error ? (
              <div className="flex items-center justify-center h-[300px] text-destructive">
                {error}
              </div>
            ) : metricsHistory.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No memory usage data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metricsHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={formatTimestamp}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: number) => [`${(value / 1024 / 1024).toFixed(2)} MB`, '']} 
                    labelFormatter={(label) => new Date(label).toLocaleString()}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="memory_usage" 
                    name="Memory Usage" 
                    stroke="#8884d8" 
                    activeDot={{ r: 8 }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="memory_allocated" 
                    name="Memory Allocated" 
                    stroke="#82ca9d" 
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
