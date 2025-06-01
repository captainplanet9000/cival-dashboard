"use client";

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, ArrowLeft, BarChart2, Clock, Play, RefreshCw, Square, Pause, Terminal } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useElizaAgentManager } from '@/hooks/useElizaAgentManager';
import { AgentPerformanceMetrics } from '@/services/agent-lifecycle-service';
import { ElizaAgentLogs } from './elizaos-agent-logs';
import { ElizaAgentMetrics } from './elizaos-agent-metrics';
import { ElizaAgentConfig } from './elizaos-agent-config';

/**
 * Detailed view of an ElizaOS agent including status, metrics, logs, and controls
 */
export function ElizaOSAgentDetails() {
  const params = useParams();
  const router = useRouter();
  const agentId = typeof params?.id === 'string' ? params.id : '';
  
  const { 
    agents, 
    isLoading, 
    controlAgent, 
    getAgentLogs, 
    getAgentMetrics 
  } = useElizaAgentManager();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [isControlling, setIsControlling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Find the current agent from the list
  const agent = agents.find(a => a.id === agentId);
  
  // Handle agent not found
  if (!isLoading && !agent) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 text-destructive" />
            Agent Not Found
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>The requested agent could not be found. It may have been deleted or you may not have access to it.</p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={() => router.push('/dashboard/eliza-agents')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Agents
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  // Handle loading state
  if (isLoading || !agent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Agent Details...</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }
  
  // Handle agent control actions
  const handleControl = async (action: 'start' | 'stop' | 'pause' | 'resume' | 'restart') => {
    setIsControlling(true);
    try {
      await controlAgent(agent.id, action);
      toast({
        title: 'Success',
        description: `Agent ${action} request processed`,
      });
    } catch (error) {
      console.error(`Failed to ${action} agent:`, error);
      toast({
        title: 'Error',
        description: `Failed to ${action} agent: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setIsControlling(false);
    }
  };
  
  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // This will re-fetch the agent data and logs
      await Promise.all([
        getAgentMetrics(agent.id),
        getAgentLogs(agent.id, { limit: 50 })
      ]);
      toast({
        title: 'Refreshed',
        description: 'Agent data has been refreshed'
      });
    } catch (error) {
      console.error('Error refreshing agent data:', error);
    } finally {
      setRefreshing(false);
    }
  };
  
  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      case 'stopped': return 'bg-gray-500';
      default: return 'bg-blue-500';
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.push('/dashboard/eliza-agents')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Agents
        </Button>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh} 
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          {agent.status === 'running' ? (
            <>
              <Button 
                variant="outline" 
                onClick={() => handleControl('pause')} 
                disabled={isControlling}
              >
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => handleControl('stop')} 
                disabled={isControlling}
              >
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
            </>
          ) : agent.status === 'paused' ? (
            <>
              <Button 
                variant="outline" 
                onClick={() => handleControl('resume')} 
                disabled={isControlling}
              >
                <Play className="h-4 w-4 mr-2" />
                Resume
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => handleControl('stop')} 
                disabled={isControlling}
              >
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
            </>
          ) : (
            <Button 
              variant="default" 
              onClick={() => handleControl('start')} 
              disabled={isControlling}
            >
              <Play className="h-4 w-4 mr-2" />
              Start
            </Button>
          )}
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center">
                {agent.name}
                <Badge 
                  className={`ml-4 ${getStatusColor(agent.status)}`}
                >
                  {agent.status}
                </Badge>
              </CardTitle>
              <CardDescription className="mt-2">
                {agent.description || 'No description provided'}
              </CardDescription>
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center">
                <Terminal className="h-4 w-4 mr-1" />
                <span>{agent.config.strategyType || 'Unknown strategy'}</span>
              </div>
              <div className="flex items-center">
                <BarChart2 className="h-4 w-4 mr-1" />
                <span>
                  {agent.performance_metrics?.commands_processed || 0} commands
                </span>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                <span>
                  Created {new Date(agent.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <Separator />
        
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="config">Configuration</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold capitalize">
                      {agent.status}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Last updated: {new Date(agent.updated_at).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {(agent.performance_metrics?.success_rate * 100).toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Based on {agent.performance_metrics?.commands_processed || 0} commands
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Response Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {agent.performance_metrics?.average_response_time_ms 
                        ? `${(agent.performance_metrics.average_response_time_ms / 1000).toFixed(2)}s` 
                        : 'N/A'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Average execution time
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Agent Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Markets</h4>
                      <div className="flex flex-wrap gap-2">
                        {agent.config.markets?.map((market: string) => (
                          <Badge key={market} variant="outline">{market}</Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Tools</h4>
                      <div className="flex flex-wrap gap-2">
                        {agent.config.tools?.map((tool: string) => (
                          <Badge key={tool} variant="outline">
                            {tool.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <ElizaAgentLogs agentId={agent.id} limit={5} />
                </CardContent>
                <CardFooter>
                  <Button variant="ghost" onClick={() => setActiveTab('logs')}>
                    View All Logs
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="logs">
              <ElizaAgentLogs agentId={agent.id} limit={50} />
            </TabsContent>
            
            <TabsContent value="metrics">
              <ElizaAgentMetrics agent={agent} />
            </TabsContent>
            
            <TabsContent value="config">
              <ElizaAgentConfig agent={agent} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
