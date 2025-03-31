'use client';

import { useState } from 'react';
import { useElizaAgents, ElizaAgent } from '../../lib/elizaos';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { AlertCircle, ChevronDown, Clock, Play, Square, Pause } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface ElizaAgentManagerProps {
  farmId?: number;
  showCreateButton?: boolean;
}

/**
 * ElizaOS Agent Manager Component
 * 
 * Displays and allows management of ElizaOS agents
 */
export default function ElizaAgentManager({ farmId, showCreateButton = true }: ElizaAgentManagerProps) {
  const { agents, loading, error, createAgent, updateAgent, deleteAgent, controlAgent } = useElizaAgents();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newAgentData, setNewAgentData] = useState({
    name: '',
    agentType: 'trading',
    markets: ['BTC-USD', 'ETH-USD'],
    riskLevel: 'medium' as 'low' | 'medium' | 'high'
  });

  // For delete confirmation
  const [agentToDelete, setAgentToDelete] = useState<ElizaAgent | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleCreateAgent = async () => {
    if (!newAgentData.name) return;
    
    const fId = farmId || 1; // Default to farm ID 1 if not provided
    await createAgent(
      newAgentData.name,
      fId,
      {
        agentType: newAgentData.agentType,
        markets: newAgentData.markets,
        riskLevel: newAgentData.riskLevel
      }
    );
    
    // Reset form and close dialog
    setNewAgentData({
      name: '',
      agentType: 'trading',
      markets: ['BTC-USD', 'ETH-USD'],
      riskLevel: 'medium'
    });
    setIsCreateDialogOpen(false);
  };

  const handleDeleteAgent = async () => {
    if (!agentToDelete) return;
    
    await deleteAgent(agentToDelete.id);
    setAgentToDelete(null);
    setIsDeleteDialogOpen(false);
  };

  const handleControlAgent = async (agent: ElizaAgent, action: 'start' | 'stop' | 'pause' | 'resume') => {
    await controlAgent(agent.id, action);
  };

  // Helper to get status color
  const getStatusColor = (status: ElizaAgent['status']) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'idle': return 'bg-blue-500';
      case 'paused': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      case 'initializing': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">ElizaOS Agents</h2>
        
        {showCreateButton && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>Create New Agent</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Agent</DialogTitle>
                <DialogDescription>
                  Create a new ElizaOS agent for your trading farm.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Agent Name</Label>
                  <Input
                    id="name"
                    value={newAgentData.name}
                    onChange={(e) => setNewAgentData({ ...newAgentData, name: e.target.value })}
                    placeholder="e.g., Bitcoin Trend Follower"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="agent-type">Agent Type</Label>
                  <Select
                    value={newAgentData.agentType}
                    onValueChange={(value) => setNewAgentData({ ...newAgentData, agentType: value })}
                  >
                    <SelectTrigger id="agent-type">
                      <SelectValue placeholder="Select Agent Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trading">Trading</SelectItem>
                      <SelectItem value="analysis">Analysis</SelectItem>
                      <SelectItem value="monitor">Monitoring</SelectItem>
                      <SelectItem value="research">Research</SelectItem>
                      <SelectItem value="strategy">Strategy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="risk-level">Risk Level</Label>
                  <Select
                    value={newAgentData.riskLevel}
                    onValueChange={(value: any) => setNewAgentData({ ...newAgentData, riskLevel: value })}
                  >
                    <SelectTrigger id="risk-level">
                      <SelectValue placeholder="Select Risk Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low Risk</SelectItem>
                      <SelectItem value="medium">Medium Risk</SelectItem>
                      <SelectItem value="high">High Risk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateAgent}>Create Agent</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      
      {loading && <div className="text-center py-4">Loading agents...</div>}
      
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md flex items-center space-x-2">
          <AlertCircle className="h-5 w-5" />
          <span>Error: {error}</span>
        </div>
      )}
      
      {!loading && !error && agents.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No agents found. Create your first agent to get started.
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <Card key={agent.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{agent.name}</CardTitle>
                  <CardDescription>{agent.description || `A ${agent.agent_type} agent`}</CardDescription>
                </div>
                <div className="flex items-center space-x-1">
                  <div className={`h-3 w-3 rounded-full ${getStatusColor(agent.status)}`} />
                  <span className="text-xs font-medium capitalize">{agent.status}</span>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pb-2">
              <div className="flex flex-wrap gap-1 mb-2">
                {agent.capabilities.map((capability) => (
                  <Badge key={capability} variant="secondary" className="text-xs">
                    {capability}
                  </Badge>
                ))}
              </div>
              
              <div className="text-sm text-muted-foreground flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>
                  {agent.last_active_at 
                    ? `Last active: ${new Date(agent.last_active_at).toLocaleString()}`
                    : 'Not active yet'}
                </span>
              </div>
            </CardContent>
            
            <CardFooter className="pt-2 flex justify-between">
              <div className="flex space-x-2">
                <TooltipProvider>
                  {agent.status !== 'active' ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          size="icon" 
                          variant="outline"
                          onClick={() => handleControlAgent(agent, 'start')}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Start Agent</TooltipContent>
                    </Tooltip>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          size="icon" 
                          variant="outline"
                          onClick={() => handleControlAgent(agent, 'pause')}
                        >
                          <Pause className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Pause Agent</TooltipContent>
                    </Tooltip>
                  )}
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        size="icon" 
                        variant="outline"
                        onClick={() => handleControlAgent(agent, 'stop')}
                      >
                        <Square className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Stop Agent</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              <div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-xs"
                    >
                      View Details
                      <ChevronDown className="ml-1 h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{agent.name} Details</DialogTitle>
                    </DialogHeader>
                    
                    <div className="mt-4 space-y-4">
                      <div>
                        <h4 className="font-medium mb-1">Agent Information</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><span className="text-muted-foreground">ID:</span> {agent.id}</div>
                          <div><span className="text-muted-foreground">Type:</span> {agent.agent_type}</div>
                          <div><span className="text-muted-foreground">Status:</span> {agent.status}</div>
                          <div><span className="text-muted-foreground">Created:</span> {new Date(agent.created_at).toLocaleString()}</div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-1">Configuration</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><span className="text-muted-foreground">Memory Enabled:</span> {agent.config.memory_enabled ? 'Yes' : 'No'}</div>
                          <div><span className="text-muted-foreground">API Access:</span> {agent.config.api_access ? 'Yes' : 'No'}</div>
                          <div><span className="text-muted-foreground">Trading Permissions:</span> {agent.config.trading_permissions}</div>
                          <div><span className="text-muted-foreground">Risk Level:</span> {agent.config.risk_level}</div>
                          <div><span className="text-muted-foreground">Auto Recovery:</span> {agent.config.auto_recovery ? 'Yes' : 'No'}</div>
                          {agent.config.max_concurrent_tasks && (
                            <div><span className="text-muted-foreground">Max Concurrent Tasks:</span> {agent.config.max_concurrent_tasks}</div>
                          )}
                        </div>
                      </div>
                      
                      {agent.config.allowed_markets && agent.config.allowed_markets.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-1">Markets</h4>
                          <div className="flex flex-wrap gap-1">
                            {agent.config.allowed_markets.map((market) => (
                              <Badge key={market} variant="secondary">{market}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {agent.performance_metrics && (
                        <div>
                          <h4 className="font-medium mb-1">Performance Metrics</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div><span className="text-muted-foreground">Commands Processed:</span> {agent.performance_metrics.commands_processed}</div>
                            <div><span className="text-muted-foreground">Success Rate:</span> {agent.performance_metrics.success_rate * 100}%</div>
                            <div><span className="text-muted-foreground">Avg Response Time:</span> {agent.performance_metrics.average_response_time_ms}ms</div>
                            {agent.performance_metrics.uptime_percentage && (
                              <div><span className="text-muted-foreground">Uptime:</span> {agent.performance_metrics.uptime_percentage}%</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <DialogFooter className="mt-6">
                      <Button
                        variant="destructive"
                        onClick={() => {
                          setAgentToDelete(agent);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        Delete Agent
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Agent</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the agent "{agentToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAgent}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 