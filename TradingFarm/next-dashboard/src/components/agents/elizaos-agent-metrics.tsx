"use client";

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useElizaAgentManager } from '@/hooks/useElizaAgentManager';
import { AgentPerformanceMetrics } from '@/services/agent-lifecycle-service';
import { ElizaAgent } from '@/types/agent-types';

// Import chart component - using recharts for visualization
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface ElizaAgentMetricsProps {
  agent: ElizaAgent;
}

export function ElizaAgentMetrics({ agent }: ElizaAgentMetricsProps) {
  const { getAgentMetrics } = useElizaAgentManager();
  const [metrics, setMetrics] = useState<AgentPerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [historyData, setHistoryData] = useState<any[]>([]);
  
  // Fetch metrics and historical data
  const fetchMetricsData = async () => {
    setIsLoading(true);
    try {
      // Get current metrics
      const currentMetrics = await getAgentMetrics(agent.id);
      setMetrics(currentMetrics);
      
      // Fetch historical metrics from monitoring_events table
      // This would normally come from a dedicated API endpoint
      const response = await fetch(`/api/elizaos/agents/${agent.id}/metrics-history`);
      if (response.ok) {
        const data = await response.json();
        setHistoryData(data.history || []);
      }
    } catch (error) {
      console.error('Error fetching agent metrics:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch agent metrics',
        variant: 'destructive'
      });
      
      // Use metrics from agent object as fallback
      setMetrics(agent.performance_metrics as AgentPerformanceMetrics);
      
      // Generate mock history data for demonstration
      generateMockHistoryData();
    } finally {
      setIsLoading(false);
    }
  };
  
  // Generate mock history data for demonstration or when API fails
  const generateMockHistoryData = () => {
    const now = new Date();
    const mockData = [];
    
    // Generate data for the last 30 days
    for (let i = 30; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // Start with baseline metrics and add some variance
      const baseSuccessRate = (agent.performance_metrics?.success_rate || 0.95) * 100;
      const baseResponseTime = agent.performance_metrics?.average_response_time_ms || 500;
      const baseCommandsPerDay = 5 + Math.floor(Math.random() * 10);
      
      // Add some trend and variance
      const successRate = Math.max(0, Math.min(100, baseSuccessRate + (Math.random() * 6 - 3)));
      const responseTime = Math.max(100, baseResponseTime + (Math.random() * 200 - 100));
      
      mockData.push({
        date: date.toISOString().split('T')[0],
        successRate,
        responseTime,
        commandsProcessed: baseCommandsPerDay,
        errors: Math.max(0, Math.floor(baseCommandsPerDay * (1 - successRate / 100) + Math.random())),
      });
    }
    
    setHistoryData(mockData);
  };
  
  // Fetch metrics on component mount
  useEffect(() => {
    fetchMetricsData();
  }, [agent.id]);
  
  // Handle refresh button click
  const handleRefresh = () => {
    fetchMetricsData();
    toast({
      title: 'Metrics Refreshed',
      description: 'Agent metrics have been refreshed',
    });
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h3 className="text-lg font-medium">Performance Metrics</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh} 
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics ? `${(metrics.success_rate * 100).toFixed(1)}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on all commands processed
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.average_response_time_ms 
                ? `${(metrics.average_response_time_ms / 1000).toFixed(2)}s` 
                : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Average execution time
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Commands</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.commands_processed.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total commands processed
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.uptime_percentage 
                ? `${metrics.uptime_percentage.toFixed(1)}%` 
                : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Percentage of scheduled time active
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Historical Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Success Rate Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Success Rate History</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={historyData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  formatter={(value: any) => [`${value.toFixed(1)}%`, 'Success Rate']}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="successRate" 
                  stroke="#10b981" 
                  fill="#10b981" 
                  fillOpacity={0.2} 
                  name="Success Rate (%)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {/* Response Time Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Response Time History</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={historyData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value: any) => [`${(value / 1000).toFixed(2)}s`, 'Response Time']}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="responseTime" 
                  stroke="#6366f1" 
                  name="Response Time (ms)" 
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {/* Commands Processed Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Commands</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={historyData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar 
                  dataKey="commandsProcessed" 
                  name="Commands" 
                  fill="#3b82f6" 
                />
                <Bar 
                  dataKey="errors" 
                  name="Errors" 
                  fill="#ef4444" 
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {/* System Load Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Agent Activity</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={historyData.map((item, index) => ({
                  ...item,
                  // Generate a mock "activity" metric that looks like CPU usage
                  activity: 20 + Math.sin(index / 2) * 10 + Math.random() * 30
                }))}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  formatter={(value: any) => [`${value.toFixed(1)}%`, 'System Load']}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="activity" 
                  stroke="#f59e0b" 
                  name="Agent Activity (%)" 
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
