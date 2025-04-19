/**
 * Agent Monitoring Dashboard
 * Provides health metrics, logs, and performance monitoring for trading agents
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import {
  Activity,
  AlertTriangle,
  Clock,
  ClipboardList,
  BarChart,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Download,
  Search,
  CheckCircle,
  Filter,
  MoreHorizontal,
  ListFilter,
  BarChart2,
  Layers,
  Calendar,
  Terminal,
  Cpu,
  Memory,
  Zap
} from 'lucide-react';
import { HealthDashboard } from './health-dashboard';
import { LogsViewer } from './logs-viewer';
import { PerformanceDashboard } from './performance-dashboard';
import { AgentComparison } from './agent-comparison';
import { createClientClient } from '@/utils/supabase/client';
import { useAgentEvents, useAgentAnomalyAlerts } from '@/hooks/useAgentOrchestration';
import { format } from 'date-fns';

interface AgentMonitoringDashboardProps {
  agentId: string;
  initialTab?: string;
}

export function AgentMonitoringDashboard({ 
  agentId, 
  initialTab = 'health' 
}: AgentMonitoringDashboardProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState<any>(null);
  const [healthData, setHealthData] = useState<any>(null);
  const [logData, setLogData] = useState<any>(null);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [comparisonAgents, setComparisonAgents] = useState<string[]>([]);
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const supabase = createClientClient();
  
  // Load initial data
  useEffect(() => {
    loadInitialData();
    
    // Set up periodic refresh
    startRefreshTimer();
    
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [agentId]);
  
  // Reload data when tab changes
  useEffect(() => {
    if (activeTab === 'health') {
      fetchHealthData();
    } else if (activeTab === 'logs') {
      fetchLogData();
    } else if (activeTab === 'performance') {
      fetchPerformanceData();
    } else if (activeTab === 'comparison') {
      fetchComparisonData();
    }
  }, [activeTab]);
  
  // Reload data when timeframe changes for performance metrics
  useEffect(() => {
    if (activeTab === 'performance') {
      fetchPerformanceData();
    } else if (activeTab === 'comparison') {
      fetchComparisonData();
    }
  }, [timeframe]);
  
  // Set up refresh timer
  const startRefreshTimer = () => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }
    
    refreshTimerRef.current = setInterval(() => {
      // Only auto-refresh the active tab
      if (activeTab === 'health') {
        fetchHealthData(false);
      } else if (activeTab === 'logs') {
        fetchLogData(false);
      } else if (activeTab === 'performance') {
        fetchPerformanceData(false);
      } else if (activeTab === 'comparison') {
        fetchComparisonData(false);
      }
    }, refreshInterval);
  };
  
  // Load all initial data
  const loadInitialData = async () => {
    setLoading(true);
    
    try {
      // Fetch agent details
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single();
        
      if (agentError) throw agentError;
      
      setAgent(agentData);
      
      // Fetch data for current tab
      if (activeTab === 'health') {
        await fetchHealthData(false);
      } else if (activeTab === 'logs') {
        await fetchLogData(false);
      } else if (activeTab === 'performance') {
        await fetchPerformanceData(false);
      } else if (activeTab === 'comparison') {
        await fetchComparisonData(false);
      }
      
      // Find potential agents for comparison
      const { data: farmAgents, error: farmAgentsError } = await supabase
        .from('agents')
        .select('id, name')
        .eq('farm_id', agentData.farm_id)
        .neq('id', agentId)
        .limit(4);
        
      if (!farmAgentsError && farmAgents && farmAgents.length > 0) {
        setComparisonAgents(farmAgents.map(a => a.id));
      }
    } catch (error) {
      console.error('Error loading agent data:', error);
      toast({
        title: "Error",
        description: "Failed to load agent data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch health data
  const fetchHealthData = async (showLoading = true) => {
    if (showLoading) setIsRefreshing(true);
    
    try {
      const response = await fetch(`/api/agents/${agentId}/health`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch health data');
      }
      
      const data = await response.json();
      setHealthData(data);
    } catch (error) {
      console.error('Error fetching health data:', error);
      if (showLoading) {
        toast({
          title: "Error",
          description: "Failed to fetch agent health data",
          variant: "destructive"
        });
      }
    } finally {
      if (showLoading) setIsRefreshing(false);
    }
  };
  
  // Fetch log data
  const fetchLogData = async (showLoading = true) => {
    if (showLoading) setIsRefreshing(true);
    
    try {
      const response = await fetch(`/api/agents/${agentId}/logs`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch log data');
      }
      
      const data = await response.json();
      setLogData(data);
    } catch (error) {
      console.error('Error fetching log data:', error);
      if (showLoading) {
        toast({
          title: "Error",
          description: "Failed to fetch agent logs",
          variant: "destructive"
        });
      }
    } finally {
      if (showLoading) setIsRefreshing(false);
    }
  };
  
  // Fetch performance data
  const fetchPerformanceData = async (showLoading = true) => {
    if (showLoading) setIsRefreshing(true);
    
    try {
      const response = await fetch(
        `/api/agents/${agentId}/performance?timeframe=${timeframe}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch performance data');
      }
      
      const data = await response.json();
      setPerformanceData(data);
    } catch (error) {
      console.error('Error fetching performance data:', error);
      if (showLoading) {
        toast({
          title: "Error",
          description: "Failed to fetch agent performance data",
          variant: "destructive"
        });
      }
    } finally {
      if (showLoading) setIsRefreshing(false);
    }
  };
  
  // Fetch comparison data
  const fetchComparisonData = async (showLoading = true) => {
    if (showLoading) setIsRefreshing(true);
    
    try {
      if (comparisonAgents.length === 0) {
        // No agents to compare with
        return;
      }
      
      const allAgents = [agentId, ...comparisonAgents];
      
      const response = await fetch(
        `/api/agents/compare?ids=${allAgents.join(',')}&timeframe=${timeframe}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch comparison data');
      }
      
      const data = await response.json();
      setPerformanceData({
        ...performanceData,
        comparisonData: data
      });
    } catch (error) {
      console.error('Error fetching comparison data:', error);
      if (showLoading) {
        toast({
          title: "Error",
          description: "Failed to fetch agent comparison data",
          variant: "destructive"
        });
      }
    } finally {
      if (showLoading) setIsRefreshing(false);
    }
  };
  
  // Refresh current data
  const refreshData = () => {
    if (activeTab === 'health') {
      fetchHealthData();
    } else if (activeTab === 'logs') {
      fetchLogData();
    } else if (activeTab === 'performance') {
      fetchPerformanceData();
    } else if (activeTab === 'comparison') {
      fetchComparisonData();
    }
  };
  
  // Handle changing refresh interval
  const handleRefreshIntervalChange = (value: string) => {
    const interval = parseInt(value);
    setRefreshInterval(interval);
    
    // Reset refresh timer with new interval
    startRefreshTimer();
    
    toast({
      title: "Refresh Interval Updated",
      description: `Data will refresh every ${interval / 1000} seconds`
    });
  };
  
  if (loading) {
    return <AgentDashboardSkeleton />;
  }
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {agent?.name || 'Agent'} 
            {healthData?.currentHealth?.status && (
              <StatusBadge status={healthData.currentHealth.status} />
            )}
          </h1>
          <p className="text-muted-foreground">
            Agent Monitoring and Performance Dashboard
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Refresh:</span>
            <Select
              value={refreshInterval.toString()}
              onValueChange={handleRefreshIntervalChange}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="30 seconds" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5000">5 seconds</SelectItem>
                <SelectItem value="15000">15 seconds</SelectItem>
                <SelectItem value="30000">30 seconds</SelectItem>
                <SelectItem value="60000">1 minute</SelectItem>
                <SelectItem value="300000">5 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            variant="outline" 
            onClick={refreshData}
            disabled={isRefreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
      
      <Tabs 
        defaultValue={activeTab} 
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
          <TabsTrigger value="health" className="flex gap-2 items-center">
            <Activity className="h-4 w-4" />
            <span className="hidden md:inline">Health</span>
            <span className="inline md:hidden">Health</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex gap-2 items-center">
            <Terminal className="h-4 w-4" />
            <span className="hidden md:inline">Logs</span>
            <span className="inline md:hidden">Logs</span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex gap-2 items-center">
            <BarChart className="h-4 w-4" />
            <span className="hidden md:inline">Performance</span>
            <span className="inline md:hidden">Perf</span>
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex gap-2 items-center">
            <BarChart2 className="h-4 w-4" />
            <span className="hidden md:inline">Comparison</span>
            <span className="inline md:hidden">Compare</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="health" className="space-y-4">
          {healthData ? (
            <HealthDashboard 
              data={healthData} 
              onRefresh={() => fetchHealthData()} 
            />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center h-40">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                  <p className="mt-4 text-sm text-muted-foreground">Loading health data...</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="logs" className="space-y-4">
          {logData ? (
            <LogsViewer 
              data={logData} 
              onRefresh={() => fetchLogData()} 
              agentId={agentId}
            />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center h-40">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                  <p className="mt-4 text-sm text-muted-foreground">Loading logs...</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="performance" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm">Timeframe:</span>
              <Select
                value={timeframe}
                onValueChange={(value) => setTimeframe(value as 'daily' | 'weekly' | 'monthly')}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Weekly" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              variant="outline" 
              onClick={() => fetchPerformanceData()}
              disabled={isRefreshing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          
          {performanceData ? (
            <PerformanceDashboard 
              data={performanceData} 
              timeframe={timeframe}
              onRefresh={() => fetchPerformanceData()} 
            />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center h-40">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                  <p className="mt-4 text-sm text-muted-foreground">Loading performance metrics...</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="comparison" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm">Timeframe:</span>
              <Select
                value={timeframe}
                onValueChange={(value) => setTimeframe(value as 'daily' | 'weekly' | 'monthly')}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Weekly" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              variant="outline" 
              onClick={() => fetchComparisonData()}
              disabled={isRefreshing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          
          {performanceData?.comparisonData ? (
            <AgentComparison 
              data={performanceData.comparisonData} 
              timeframe={timeframe}
              onRefresh={() => fetchComparisonData()} 
              mainAgentId={agentId}
            />
          ) : comparisonAgents.length === 0 ? (
            <Card>
              <CardContent className="py-6">
                <div className="flex flex-col items-center justify-center h-40">
                  <AlertTriangle className="h-12 w-12 text-yellow-500" />
                  <p className="mt-4 text-lg font-medium">No agents to compare</p>
                  <p className="text-sm text-muted-foreground">
                    There are no other agents in this farm to compare performance with.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center h-40">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                  <p className="mt-4 text-sm text-muted-foreground">Loading comparison data...</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'online':
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Online
        </Badge>
      );
    case 'offline':
      return (
        <Badge className="bg-gray-100 text-gray-800">
          <XCircle className="h-3 w-3 mr-1" />
          Offline
        </Badge>
      );
    case 'degraded':
      return (
        <Badge className="bg-yellow-100 text-yellow-800">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Degraded
        </Badge>
      );
    case 'error':
      return (
        <Badge className="bg-red-100 text-red-800">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Error
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          {status}
        </Badge>
      );
  }
}

// Loading skeleton
function AgentDashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    </div>
  );
}
