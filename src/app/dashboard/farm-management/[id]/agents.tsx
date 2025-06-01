"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Activity, AlertCircle, AlertTriangle, 
  Brain, Cpu, Database, Edit, LineChart, 
  MoreHorizontal, Play, Power, RefreshCw, 
  Settings, Trash2, Plus, Pause, Terminal 
} from 'lucide-react';
import { 
  Card, CardContent, CardDescription, 
  CardHeader, CardTitle 
} from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Dialog, DialogContent } from '../../../../components/ui/dialog';
import { api } from '../../../../lib/api-client';
import CreateAgent from '../create-agent';
import AgentMetrics from './agent-metrics';
import AgentCommands from './agent-commands';

interface AgentsManagementProps {
  farmId: number;
}

export default function AgentsManagement({ farmId }: AgentsManagementProps) {
  const router = useRouter();
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  const [selectedView, setSelectedView] = useState<'overview' | 'metrics' | 'commands'>('overview');
  const [executingCommand, setExecutingCommand] = useState(false);

  // Fetch agents from API
  useEffect(() => {
    const loadAgents = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await api.getAgents(farmId);
        
        if (response.error) {
          setError(response.error);
        } else {
          setAgents(response.data || []);
        }
      } catch (err) {
        setError('Failed to load agents');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    loadAgents();
  }, [farmId]);
  
  // Fetch single agent details
  const loadAgentDetails = async (agentId: number) => {
    try {
      const response = await api.getAgent(agentId);
      
      if (response.error) {
        console.error('Error loading agent details:', response.error);
        return null;
      }
      
      return response.data;
    } catch (err) {
      console.error('Error loading agent details:', err);
      return null;
    }
  };
  
  // Handle agent creation
  const handleAgentCreated = async () => {
    setShowCreateDialog(false);
    
    // Reload agents list
    try {
      const response = await api.getAgents(farmId);
      if (!response.error) {
        setAgents(response.data || []);
      }
    } catch (err) {
      console.error('Error reloading agents:', err);
    }
  };
  
  // Handle agent command execution
  const executeAgentCommand = async (agentId: number, command: string, params: any = {}) => {
    setExecutingCommand(true);
    try {
      const response = await api.executeAgentCommand(agentId, command, params);
      
      if (response.error) {
        console.error(`Error executing ${command}:`, response.error);
        return false;
      }
      
      // Reload the agent list to reflect changes
      const agentsResponse = await api.getAgents(farmId);
      if (!agentsResponse.error) {
        setAgents(agentsResponse.data || []);
      }
      
      // If we're viewing an agent, reload its details
      if (selectedAgent && selectedAgent.id === agentId) {
        const updatedAgent = await loadAgentDetails(agentId);
        if (updatedAgent) {
          setSelectedAgent(updatedAgent);
        }
      }
      
      return true;
    } catch (err) {
      console.error(`Error executing ${command}:`, err);
      return false;
    } finally {
      setExecutingCommand(false);
    }
  };
  
  // Handle agent starting/stopping
  const toggleAgentStatus = async (agent: any) => {
    if (agent.is_active) {
      // Stop the agent
      await executeAgentCommand(agent.id, 'stop');
    } else {
      // Start the agent
      await executeAgentCommand(agent.id, 'start');
    }
  };
  
  // Handle agent deletion
  const deleteAgent = async (agent: any) => {
    if (!confirm(`Are you sure you want to delete agent "${agent.name}"?`)) {
      return;
    }
    
    try {
      const response = await api.deleteAgent(agent.id);
      
      if (response.error) {
        console.error('Error deleting agent:', response.error);
        return;
      }
      
      // Close details view if this was the selected agent
      if (selectedAgent && selectedAgent.id === agent.id) {
        setSelectedAgent(null);
      }
      
      // Reload agents list
      const agentsResponse = await api.getAgents(farmId);
      if (!agentsResponse.error) {
        setAgents(agentsResponse.data || []);
      }
    } catch (err) {
      console.error('Error deleting agent:', err);
    }
  };
  
  // View agent details
  const viewAgentDetails = async (agent: any) => {
    const agentDetails = await loadAgentDetails(agent.id);
    if (agentDetails) {
      setSelectedAgent(agentDetails);
      setSelectedView('overview');
    }
  };
  
  // Get status indicator based on agent status
  const getStatusIndicator = (agent: any) => {
    let color = "bg-gray-400";
    let label = "Unknown";
    
    if (!agent.is_active) {
      color = "bg-gray-400";
      label = "Inactive";
    } else if (agent.status === 'running') {
      color = "bg-green-500";
      label = "Running";
    } else if (agent.status === 'initializing') {
      color = "bg-blue-400";
      label = "Initializing";
    } else if (agent.status === 'error') {
      color = "bg-red-500";
      label = "Error";
    } else if (agent.status === 'paused') {
      color = "bg-yellow-500";
      label = "Paused";
    }
    
    return (
      <div className="flex items-center">
        <span className={`inline-block h-2 w-2 rounded-full mr-1.5 ${color}`}></span>
        <span className="text-sm">{label}</span>
      </div>
    );
  };
  
  // Get agent type icon based on agent_type
  const getAgentTypeIcon = (agentType: string) => {
    switch (agentType) {
      case 'market_maker':
        return <Database className="h-4 w-4 text-blue-500" />;
      case 'trend_follower':
        return <LineChart className="h-4 w-4 text-green-500" />;
      case 'arbitrage':
        return <RefreshCw className="h-4 w-4 text-purple-500" />;
      case 'ml_predictor':
        return <Brain className="h-4 w-4 text-indigo-500" />;
      case 'grid_trader':
        return <Activity className="h-4 w-4 text-orange-500" />;
      default:
        return <Settings className="h-4 w-4 text-gray-500" />;
    }
  };
  
  // Render agent list
  const renderAgentList = () => {
    if (loading) {
      return (
        <div className="text-center py-8">
          <div className="inline-block animate-spin mr-2">
            <RefreshCw size={20} />
          </div>
          Loading agents...
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="text-center py-8 text-red-500">
          <AlertCircle className="inline-block mb-2" size={24} />
          <p>{error}</p>
        </div>
      );
    }
    
    if (agents.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <p className="mb-4">No agents found for this farm</p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Your First Agent
          </Button>
        </div>
      );
    }
    
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <Card key={agent.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  {getAgentTypeIcon(agent.agent_type)}
                  <CardTitle className="text-lg ml-2">{agent.name}</CardTitle>
                </div>
                {getStatusIndicator(agent)}
              </div>
              <CardDescription className="line-clamp-2">
                {agent.description || 'No description provided'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div className="text-muted-foreground">Type:</div>
                  <div className="capitalize">{agent.agent_type.replace(/_/g, ' ')}</div>
                  
                  <div className="text-muted-foreground">Trades:</div>
                  <div>{agent.metrics?.trades_executed || 0}</div>
                  
                  <div className="text-muted-foreground">Win Rate:</div>
                  <div>{(agent.metrics?.win_rate || 0) * 100}%</div>
                  
                  <div className="text-muted-foreground">P/L:</div>
                  <div className={`${(agent.metrics?.profit_loss || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${(agent.metrics?.profit_loss || 0).toFixed(2)}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => viewAgentDetails(agent)}
                >
                  Details
                </Button>
                
                <div className="space-x-2">
                  <Button
                    variant={agent.is_active ? "outline" : "default"}
                    size="sm"
                    disabled={executingCommand}
                    onClick={() => toggleAgentStatus(agent)}
                  >
                    {agent.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:bg-red-100"
                    disabled={executingCommand}
                    onClick={() => deleteAgent(agent)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };
  
  // Render agent details
  const renderAgentDetails = () => {
    if (!selectedAgent) return null;
    
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Button variant="outline" size="sm" onClick={() => setSelectedAgent(null)} className="mr-2">
              Back
            </Button>
            <h2 className="text-xl font-semibold">{selectedAgent.name}</h2>
          </div>
          <div className="flex space-x-2">
            <Button
              variant={selectedView === 'overview' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedView('overview')}
            >
              Overview
            </Button>
            <Button
              variant={selectedView === 'metrics' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedView('metrics')}
            >
              Metrics
            </Button>
            <Button
              variant={selectedView === 'commands' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedView('commands')}
            >
              Commands
            </Button>
          </div>
        </div>
        
        {selectedView === 'overview' && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Agent Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1 border-b">
                    <span className="text-muted-foreground">Status</span>
                    <div className="font-medium">{getStatusIndicator(selectedAgent)}</div>
                  </div>
                  
                  <div className="flex justify-between items-center py-1 border-b">
                    <span className="text-muted-foreground">Type</span>
                    <div className="font-medium flex items-center">
                      {getAgentTypeIcon(selectedAgent.agent_type)}
                      <span className="ml-1 capitalize">{selectedAgent.agent_type.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center py-1 border-b">
                    <span className="text-muted-foreground">Created</span>
                    <div className="font-medium">
                      {new Date(selectedAgent.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center py-1 border-b">
                    <span className="text-muted-foreground">ElizaOS ID</span>
                    <div className="font-medium text-sm font-mono">
                      {selectedAgent.eliza_agent_id}
                    </div>
                  </div>
                  
                  {selectedAgent.eliza_status && (
                    <>
                      <div className="flex justify-between items-center py-1 border-b">
                        <span className="text-muted-foreground">CPU Usage</span>
                        <div className="font-medium">
                          {Math.round(selectedAgent.eliza_status.cpu_usage)}%
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center py-1 border-b">
                        <span className="text-muted-foreground">Memory Usage</span>
                        <div className="font-medium">
                          {Math.round(selectedAgent.eliza_status.memory_usage)}%
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center py-1 border-b">
                        <span className="text-muted-foreground">Last Active</span>
                        <div className="font-medium">
                          {new Date(selectedAgent.eliza_status.last_active).toLocaleString()}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/20 rounded-md p-3">
                      <div className="text-xs text-muted-foreground mb-1">Total Trades</div>
                      <div className="text-lg font-semibold">{selectedAgent.metrics?.trades_executed || 0}</div>
                    </div>
                    
                    <div className="bg-muted/20 rounded-md p-3">
                      <div className="text-xs text-muted-foreground mb-1">Win Rate</div>
                      <div className="text-lg font-semibold">
                        {((selectedAgent.metrics?.win_rate || 0) * 100).toFixed(1)}%
                      </div>
                    </div>
                    
                    <div className="bg-muted/20 rounded-md p-3">
                      <div className="text-xs text-muted-foreground mb-1">Profit/Loss</div>
                      <div className={`text-lg font-semibold ${(selectedAgent.metrics?.profit_loss || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${(selectedAgent.metrics?.profit_loss || 0).toFixed(2)}
                      </div>
                    </div>
                    
                    <div className="bg-muted/20 rounded-md p-3">
                      <div className="text-xs text-muted-foreground mb-1">Avg Trade Duration</div>
                      <div className="text-lg font-semibold">
                        {selectedAgent.metrics?.avg_trade_duration || 0} min
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <h4 className="text-sm font-medium mb-2">Quick Actions</h4>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        size="sm"
                        variant="outline"
                        disabled={executingCommand}
                        onClick={() => executeAgentCommand(selectedAgent.id, selectedAgent.is_active ? 'stop' : 'start')}
                      >
                        {selectedAgent.is_active ? (
                          <>
                            <Pause className="mr-1 h-3 w-3" />
                            Stop Agent
                          </>
                        ) : (
                          <>
                            <Play className="mr-1 h-3 w-3" />
                            Start Agent
                          </>
                        )}
                      </Button>
                      
                      <Button 
                        size="sm"
                        variant="outline"
                        disabled={executingCommand || !selectedAgent.is_active}
                        onClick={() => executeAgentCommand(selectedAgent.id, 'restart')}
                      >
                        <RefreshCw className="mr-1 h-3 w-3" />
                        Restart
                      </Button>
                      
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedView('commands')}
                      >
                        <Terminal className="mr-1 h-3 w-3" />
                        More Commands
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Agent Parameters Card */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Agent Parameters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {selectedAgent.parameters && Object.entries(selectedAgent.parameters).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center py-1 border-b">
                      <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                      <div className="font-medium">
                        {typeof value === 'boolean' 
                          ? (value ? 'Yes' : 'No')
                          : Array.isArray(value)
                            ? value.join(', ')
                            : String(value)
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {selectedView === 'metrics' && (
          <AgentMetrics agentId={selectedAgent.id} />
        )}
        
        {selectedView === 'commands' && (
          <AgentCommands 
            agent={selectedAgent} 
            onExecuteCommand={executeAgentCommand}
            isExecuting={executingCommand}
          />
        )}
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      {!selectedAgent ? (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Trading Agents</h2>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Agent
            </Button>
          </div>
          
          {renderAgentList()}
        </>
      ) : (
        renderAgentDetails()
      )}
      
      {/* Create Agent Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <CreateAgent 
            farmId={farmId} 
            onClose={() => setShowCreateDialog(false)}
            onSuccess={handleAgentCreated}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
} 