'use client';

/**
 * ElizaOS Agent Detail Page Content
 */
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, AlertCircle, Play, Pause, RefreshCw, Terminal } from 'lucide-react';
import { agentService, ElizaAgent } from '@/services/agent-service';
import { AgentKnowledgeTab } from '@/components/agents/tabs/AgentKnowledgeTab';
import { AgentSettingsTab } from '@/components/agents/tabs/AgentSettingsTab';
import { AgentRunsTab } from '@/components/agents/tabs/AgentRunsTab';

interface AgentDetailPageContentProps {
  agentId: string;
}

export function AgentDetailPageContent({ agentId }: AgentDetailPageContentProps) {
  const { toast } = useToast();
  const [agent, setAgent] = useState<ElizaAgent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isControlling, setIsControlling] = useState(false);
  
  useEffect(() => {
    loadAgent();
  }, [agentId]);
  
  const loadAgent = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await agentService.getElizaAgentById(agentId);
      if (response.success && response.data) {
        setAgent(response.data);
      } else {
        setError(response.error || 'Failed to load agent');
      }
    } catch (error: any) {
      console.error('Error loading agent details:', error);
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleControlAgent = async (action: 'start' | 'stop' | 'pause' | 'resume') => {
    if (!agent) return;
    
    setIsControlling(true);
    
    try {
      const response = await agentService.controlElizaAgent(agentId, action);
      
      if (response.success) {
        toast({
          title: 'Agent Updated',
          description: `Agent ${agent.name} has been ${action}ed successfully.`,
        });
        
        await loadAgent();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: response.error || `Failed to ${action} agent`,
        });
      }
    } catch (error: any) {
      console.error(`Error ${action}ing agent:`, error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || `An unexpected error occurred while ${action}ing the agent`,
      });
    } finally {
      setIsControlling(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  if (!agent) {
    return (
      <Alert className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Agent Not Found</AlertTitle>
        <AlertDescription>The requested agent could not be found.</AlertDescription>
      </Alert>
    );
  }
  
  const agentStatusColor = () => {
    switch (agent.status) {
      case 'active': return 'text-green-500';
      case 'inactive': return 'text-gray-500';
      case 'paused': return 'text-amber-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };
  
  return (
    <div className="space-y-8">
      {/* Agent Header */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{agent.name}</CardTitle>
              <CardDescription className="text-md mt-1">{agent.description || 'No description provided'}</CardDescription>
            </div>
            <div className="flex gap-2">
              {agent.status === 'active' ? (
                <Button
                  variant="outline"
                  className="flex gap-2 items-center"
                  disabled={isControlling}
                  onClick={() => handleControlAgent('pause')}
                >
                  {isControlling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="h-4 w-4" />}
                  <span>Pause</span>
                </Button>
              ) : (
                <Button
                  variant="default"
                  className="flex gap-2 items-center"
                  disabled={isControlling}
                  onClick={() => handleControlAgent('start')}
                >
                  {isControlling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  <span>Start</span>
                </Button>
              )}
              
              <Button
                variant="outline"
                size="icon"
                disabled={isControlling}
                onClick={loadAgent}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className={`font-medium ${agentStatusColor()}`}>
                {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Model</p>
              <p className="font-medium">{agent.model}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Knowledge Documents</p>
              <p className="font-medium">{Array.isArray(agent.knowledge_ids) ? agent.knowledge_ids.length : 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Agent Tabs */}
      <Tabs defaultValue="knowledge">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
          <TabsTrigger value="runs">Runs & Activity</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="knowledge" className="space-y-4 pt-4">
          <AgentKnowledgeTab agent={agent} onAgentUpdated={loadAgent} />
        </TabsContent>
        
        <TabsContent value="runs" className="space-y-4 pt-4">
          <AgentRunsTab agentId={agent.id} />
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-4 pt-4">
          <AgentSettingsTab agent={agent} onAgentUpdated={loadAgent} />
        </TabsContent>
      </Tabs>
      
      {/* Command Console Quick Action */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Direct commands to this agent via the command console
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="default" 
            className="w-full"
            onClick={() => {
              // Navigate to command console with agent pre-selected
              window.location.href = `/command?agent=${agent.id}`;
            }}
          >
            Open Command Console
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
