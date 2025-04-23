'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { AgentCard } from './AgentCard';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  Activity,
  CheckCircle,
  Filter,
  LineChart,
  Plus,
  PlusCircle,
  RefreshCw
} from 'lucide-react';
import { createBrowserClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Agent, AgentStatus } from '@/types/agent';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { AgentHealthMonitor, AgentHealthData, HealthStatus } from '@/lib/agents/health-monitor';
import { logEvent } from '@/utils/logging';
import { handleSupabaseError } from '@/utils/error-handling';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Type definitions
type HealthStatusFilter = 'all' | HealthStatus;

// Define an interface for agents with health data
interface AgentWithHealth extends Agent {
  health: AgentHealthData | null;
  events_count: number;
}

/**
 * Props for the AgentList component
 */
export interface AgentListProps {
  /** Optional farm ID to filter agents */
  farmId?: string;
  /** Whether to show filtering options */
  showFilters?: boolean;
  /** Whether to show the header section */
  showHeader?: boolean;
  /** Optional initial agents array */
  initialAgents?: Agent[];
  /** Whether the component is initially loading */
  initialLoading?: boolean;
  /** Maximum number of items to display */
  maxItems?: number;
  /** Callback when an agent is selected */
  onSelectAgent?: (agentId: string) => void;
}

/**
 * AgentList component displays a list of agents with health monitoring capabilities
 */
export function AgentList({
  farmId,
  showFilters = true,
  showHeader = true,
  initialAgents,
  initialLoading = false,
  maxItems,
  onSelectAgent
}: AgentListProps) {
  // Core state management
  const [agents, setAgents] = useState<Agent[]>(initialAgents || []);
  const [loading, setLoading] = useState<boolean>(initialLoading);
  const [error, setError] = useState<string | null>(null);
  
  // Filtering state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [healthFilter, setHealthFilter] = useState<HealthStatusFilter>('all');
  
  // Health monitoring state
  const [agentHealth, setAgentHealth] = useState<Record<string, AgentHealthData>>({});
  const [healthLoading, setHealthLoading] = useState<boolean>(false);
  const [overallHealth, setOverallHealth] = useState<{
    healthy: number;
    warning: number;
    critical: number;
    unknown: number;
  }>({ healthy: 0, warning: 0, critical: 0, unknown: 0 });
  
  // Active tab state
  const [activeTab, setActiveTab] = useState<string>('all');
  
  // Initialize dependencies
  const supabase = createBrowserClient();
  const { toast } = useToast();
  const healthMonitor = useMemo(() => new AgentHealthMonitor(), []);
  
  /**
   * Fetch agents from the database
   */
  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase
        .from('agents')
        .select('*, events:agent_events(count)')
        .order('created_at', { ascending: false });
      
      if (farmId) {
        query = query.eq('farm_id', farmId);
      }
      
      if (maxItems) {
        query = query.limit(maxItems);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      // Transform the data to match Agent type
      const formattedAgents = data.map((agent: any) => ({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        type: agent.type,
        status: agent.status,
        farm_id: agent.farm_id,
        created_at: agent.created_at,
        updated_at: agent.updated_at,
        events_count: agent.events?.[0]?.count || 0
      }));
      
      setAgents(formattedAgents as Agent[]);
      return formattedAgents;
    } catch (error) {
      const errorMessage = handleSupabaseError(error, 'Failed to fetch agents');
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [farmId, maxItems, supabase, toast]);
  
  /**
   * Fetch health data for all agents
   */
  const fetchHealthData = useCallback(async () => {
    try {
      if (agents.length === 0) {
        return;
      }
      
      setHealthLoading(true);
      
      // Get agent IDs
      const agentIds = agents.map((agent: Agent) => agent.id);
      
      // Get health data for all agents
      const healthData = await healthMonitor.getAgentsHealth(agentIds);
      
      // Update health data state
      setAgentHealth(healthData);
      
      // Calculate overall health statistics
      const healthStats = {
        healthy: 0,
        warning: 0,
        critical: 0,
        unknown: 0
      };
      
      Object.values(healthData).forEach((data: AgentHealthData) => {
        if (data.status === 'healthy') healthStats.healthy += 1;
        else if (data.status === 'warning') healthStats.warning += 1;
        else if (data.status === 'critical') healthStats.critical += 1;
        else healthStats.unknown += 1;
      });
      
      setOverallHealth(healthStats);
    } catch (error) {
      const errorMessage = handleSupabaseError(error, 'Failed to fetch health data');
      toast({
        title: 'Warning',
        description: errorMessage,
        variant: 'warning',
      });
    } finally {
      setHealthLoading(false);
    }
  }, [agents, healthMonitor, toast]);
  
  /**
   * Refresh agents and their health data
   */
  const refreshAgents = useCallback(async () => {
    const fetchedAgents = await fetchAgents();
    if (fetchedAgents.length > 0) {
      fetchHealthData();
    }
  }, [fetchAgents, fetchHealthData]);
  
  /**
   * Start an agent
   */
  const startAgent = useCallback(async (agentId: string) => {
    try {
      await healthMonitor.startAgent(agentId);
      toast({
        title: 'Success',
        description: 'Agent started successfully',
        variant: 'success',
      });
      fetchHealthData();
    } catch (error) {
      const errorMessage = handleSupabaseError(error, 'Failed to start agent');
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [healthMonitor, toast, fetchHealthData]);
  
  /**
   * Stop an agent
   */
  const stopAgent = useCallback(async (agentId: string) => {
    try {
      await healthMonitor.stopAgent(agentId);
      toast({
        title: 'Success',
        description: 'Agent stopped successfully',
        variant: 'success',
      });
      fetchHealthData();
    } catch (error) {
      const errorMessage = handleSupabaseError(error, 'Failed to stop agent');
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [healthMonitor, toast, fetchHealthData]);

  /**
   * Restart an agent
   */
  const restartAgent = useCallback(async (agentId: string) => {
    try {
      await healthMonitor.restartAgent(agentId);
      toast({
        title: 'Success',
        description: 'Agent restarted successfully',
        variant: 'success',
      });
      fetchHealthData();
    } catch (error) {
      const errorMessage = handleSupabaseError(error, 'Failed to restart agent');
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [healthMonitor, toast, fetchHealthData]);
  
  /**
   * Reset all filters
   */
  const resetFilters = useCallback(() => {
    setStatusFilter('all');
    setTypeFilter('all');
    setHealthFilter('all');
    setActiveTab('all');
  }, []);
  
  // Get a health status badge based on status
  const getHealthStatusBadge = (status: HealthStatus | undefined) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Healthy</Badge>;
      case 'warning':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Warning</Badge>;
      case 'critical':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Critical</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };
  
  // Get unique agent types for filtering
  const agentTypes = useMemo(() => {
    const types = new Set<string>();
    agents.forEach((agent: Agent) => {
      if (agent.type) {
        types.add(agent.type);
      }
    });
    return Array.from(types);
  }, [agents]);
  
  // Filter agents by status and type
  const filteredAgents = useMemo(() => {
    return agents.filter((agent: Agent) => {
      // Filter by agent status
      if (statusFilter !== 'all' && agent.status !== statusFilter) {
        return false;
      }
      
      // Filter by agent type
      if (typeFilter !== 'all' && agent.type !== typeFilter) {
        return false;
      }
      
      // Filter by health status
      if (healthFilter !== 'all') {
        const health = agentHealth[agent.id];
        if (!health || health.status !== healthFilter) {
          return false;
        }
      }
      
      return true;
    });
  }, [agents, statusFilter, typeFilter, healthFilter, agentHealth]);
  
  // Render agent cards
  const renderAgentCards = useMemo(() => {
    return filteredAgents.map((agent: Agent) => (
      <AgentCard
        key={agent.id}
        agent={agent}
        health={agentHealth[agent.id]}
        healthStatus={agentHealth[agent.id]?.status}
        healthBadge={getHealthStatusBadge(agentHealth[agent.id]?.status)}
        onSelect={onSelectAgent ? () => onSelectAgent(agent.id) : undefined}
        onStart={() => startAgent(agent.id)}
        onStop={() => stopAgent(agent.id)}
        onRestart={() => restartAgent(agent.id)}
      />
    ));
  }, [filteredAgents, agentHealth, getHealthStatusBadge, onSelectAgent, startAgent, stopAgent, restartAgent]);
  
  // Set up real-time subscription for agent health updates
  useEffect(() => {
    // Initial data fetch
    refreshAgents();
    
    // Set up subscription for agent health updates
    const healthChannel = supabase
      .channel('agent-health-updates')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'agent_health' 
      }, () => {
        fetchHealthData();
        logEvent('agent_health_updated', 'Real-time health update received');
      })
      .subscribe();
    
    // Cleanup subscription
    return () => {
      healthChannel.unsubscribe();
    };
  }, [refreshAgents, supabase, fetchHealthData]);
  
  // Set up polling for health data
  useEffect(() => {
    if (agents.length === 0) {
      return;
    }
    
    // Fetch health data immediately
    fetchHealthData();
    
    // Set up polling interval
    const interval = setInterval(() => {
      fetchHealthData();
    }, 30000); // Poll every 30 seconds
    
    return () => {
      clearInterval(interval);
    };
  }, [agents, fetchHealthData]);
  
  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Agents</h2>
            <p className="text-muted-foreground">
              View and manage your agents and their health status.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refreshAgents()}
              disabled={loading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button size="sm">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Agent
            </Button>
          </div>
        </div>
      )}

      {showFilters && (
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="w-[150px]">
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="stopped">Stopped</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="w-[150px]">
              <Select
                value={typeFilter}
                onValueChange={setTypeFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {agentTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="w-[150px]">
              <Select
                value={healthFilter}
                onValueChange={(value) => setHealthFilter(value as HealthStatusFilter)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Health..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Health</SelectItem>
                  <SelectItem value="healthy">Healthy</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            All Agents
            <Badge className="ml-2" variant="outline">{filteredAgents.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="health">
            Health Dashboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border rounded-lg p-4">
                  <Skeleton className="h-6 w-32 mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No agents found matching your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {renderAgentCards}
            </div>
          )}
        </TabsContent>

        <TabsContent value="health" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Healthy Agents</CardTitle>
                <div className="h-4 w-4 rounded-full bg-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overallHealth.healthy}</div>
                <p className="text-xs text-muted-foreground">
                  {overallHealth.healthy > 0
                    ? `${Math.round((overallHealth.healthy / agents.length) * 100)}% of your agents`
                    : 'No healthy agents'}
                </p>
                <Progress 
                  value={overallHealth.healthy > 0 ? (overallHealth.healthy / agents.length) * 100 : 0} 
                  className="h-2 mt-2 bg-green-100" 
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Warning Agents</CardTitle>
                <div className="h-4 w-4 rounded-full bg-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overallHealth.warning}</div>
                <p className="text-xs text-muted-foreground">
                  {overallHealth.warning > 0
                    ? `${Math.round((overallHealth.warning / agents.length) * 100)}% of your agents`
                    : 'No agents with warnings'}
                </p>
                <Progress 
                  value={overallHealth.warning > 0 ? (overallHealth.warning / agents.length) * 100 : 0} 
                  className="h-2 mt-2 bg-yellow-100" 
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Critical Agents</CardTitle>
                <div className="h-4 w-4 rounded-full bg-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overallHealth.critical}</div>
                <p className="text-xs text-muted-foreground">
                  {overallHealth.critical > 0
                    ? `${Math.round((overallHealth.critical / agents.length) * 100)}% of your agents`
                    : 'No agents in critical state'}
                </p>
                <Progress 
                  value={overallHealth.critical > 0 ? (overallHealth.critical / agents.length) * 100 : 0} 
                  className="h-2 mt-2 bg-red-100" 
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unknown Agents</CardTitle>
                <div className="h-4 w-4 rounded-full bg-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overallHealth.unknown}</div>
                <p className="text-xs text-muted-foreground">
                  {overallHealth.unknown > 0
                    ? `${Math.round((overallHealth.unknown / agents.length) * 100)}% of your agents`
                    : 'No agents with unknown status'}
                </p>
                <Progress 
                  value={overallHealth.unknown > 0 ? (overallHealth.unknown / agents.length) * 100 : 0} 
                  className="h-2 mt-2 bg-gray-100" 
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Health Monitoring</CardTitle>
              <CardDescription>Key health metrics for all agents.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {healthLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {agents
                      .filter((a: Agent) => agentHealth[a.id]?.status === 'critical' || agentHealth[a.id]?.status === 'warning')
                      .sort((a: Agent, b: Agent) => {
                        // Sort by status (critical first, then warning)
                        const statusA = agentHealth[a.id]?.status || 'unknown';
                        const statusB = agentHealth[b.id]?.status || 'unknown';
                        if (statusA === 'critical' && statusB !== 'critical') return -1;
                        if (statusA !== 'critical' && statusB === 'critical') return 1;
                        return 0;
                      })
                      .map((agent: Agent) => {
                        const health = agentHealth[agent.id];
                        return (
                          <div 
                            key={agent.id} 
                            className={`p-4 rounded-lg border ${health?.status === 'critical' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <AlertTriangle className={`h-5 w-5 ${health?.status === 'critical' ? 'text-red-600' : 'text-yellow-600'}`} />
                                <span className="font-medium">{agent.name}</span>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => restartAgent(agent.id)}
                              >
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Restart
                              </Button>
                            </div>
                            <div className="mt-2 text-sm text-muted-foreground">
                              {health?.status === 'critical' ? (
                                <span className="text-red-800">{health?.message || 'Critical issue detected'}</span>
                              ) : (
                                <span className="text-yellow-800">{health?.message || 'Warning condition detected'}</span>
                              )}
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground">
                              Last updated: {health ? formatDistanceToNow(new Date(health.updated_at || ''), { addSuffix: true }) : 'Unknown'}
                            </div>
                          </div>
                        );
                      })}
                    
                    {agents.filter((a: Agent) => 
                      agentHealth[a.id]?.status !== 'critical' && 
                      agentHealth[a.id]?.status !== 'warning'
                    ).length === agents.length && (
                      <div className="text-center py-4">
                        <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                        <p className="text-muted-foreground">All agents are healthy!</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}