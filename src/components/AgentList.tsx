import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { PlusCircle, Robot, Power, PowerOff, AlertCircle } from 'lucide-react';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { api, handleApiError } from '@/lib/api';
import { Agent } from '@/types';

interface AgentListProps {
  farmId: string;
}

export function AgentList({ farmId }: AgentListProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setLoading(true);
        const agentsData = await api.agents.getByFarmId(farmId);
        setAgents(agentsData);
        setLoading(false);
      } catch (error) {
        handleApiError(error, setError);
        setLoading(false);
      }
    };

    if (farmId) {
      fetchAgents();
    }
  }, [farmId]);

  const handleViewAgent = (agentId: string) => {
    router.push(`/farms/${farmId}/agents/${agentId}`);
  };

  const handleCreateAgent = () => {
    router.push(`/farms/${farmId}/agents/new`);
  };

  const handleStartAgent = async (event: React.MouseEvent, agentId: string) => {
    event.stopPropagation();
    try {
      setActionInProgress(agentId);
      const updatedAgent = await api.agents.start(agentId);
      
      // Update the agent in the local state
      setAgents(agents.map(agent => 
        agent.id === agentId ? updatedAgent : agent
      ));
    } catch (error) {
      handleApiError(error, setError);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleStopAgent = async (event: React.MouseEvent, agentId: string) => {
    event.stopPropagation();
    try {
      setActionInProgress(agentId);
      const updatedAgent = await api.agents.stop(agentId);
      
      // Update the agent in the local state
      setAgents(agents.map(agent => 
        agent.id === agentId ? updatedAgent : agent
      ));
    } catch (error) {
      handleApiError(error, setError);
    } finally {
      setActionInProgress(null);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
      case 'error':
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mb-4">
        <p className="font-medium">Error loading agents</p>
        <p>{error}</p>
        <Button 
          variant="outline" 
          className="mt-2" 
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Agents</h2>
        <Button onClick={handleCreateAgent}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Agent
        </Button>
      </div>

      {agents.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="flex flex-col items-center justify-center space-y-3 py-8">
              <Robot className="h-12 w-12 text-gray-400" />
              <h3 className="text-lg font-medium">No agents found</h3>
              <p className="text-sm text-gray-500">Get started by creating your first agent</p>
              <Button onClick={handleCreateAgent} className="mt-2">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Agent
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <Card 
              key={agent.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleViewAgent(agent.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="flex items-center">
                    <Robot className="mr-2 h-5 w-5" />
                    {agent.name}
                  </CardTitle>
                  <Badge className={getStatusBadgeColor(agent.status)}>
                    {agent.status}
                  </Badge>
                </div>
                <CardDescription>{agent.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {agent.capabilities.map((capability, index) => (
                      <Badge key={index} variant="outline">
                        {capability}
                      </Badge>
                    ))}
                  </div>
                  <div className="text-sm text-gray-500">
                    Type: <span className="font-medium">{agent.type}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-between">
                <div className="text-xs text-gray-500">
                  Created on {new Date(agent.created_at).toLocaleDateString()}
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        disabled={actionInProgress === agent.id}
                        onClick={(e) => agent.status === 'active' 
                          ? handleStopAgent(e, agent.id) 
                          : handleStartAgent(e, agent.id)
                        }
                      >
                        {actionInProgress === agent.id ? (
                          <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                        ) : agent.status === 'active' ? (
                          <PowerOff className="h-4 w-4" />
                        ) : (
                          <Power className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {agent.status === 'active' ? 'Stop Agent' : 'Start Agent'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 
} 