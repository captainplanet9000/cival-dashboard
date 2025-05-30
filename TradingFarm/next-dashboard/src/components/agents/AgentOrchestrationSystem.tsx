import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button-standardized';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell 
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { PlusIcon, Cross2Icon, ArrowRightIcon, PlayIcon, PauseIcon, ReloadIcon } from '@radix-ui/react-icons';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { useAgentSystem } from '@/hooks/use-agent-system';
import { useStrategyManagement } from '@/hooks/use-strategy-management';
import { useRiskManagement } from '@/hooks/use-risk-management';

/**
 * Agent Orchestration System
 * 
 * A comprehensive system for managing trading agents with:
 * - Agent lifecycle management
 * - Communication protocol
 * - Health monitoring
 * - Execution safety controls
 */
export interface AgentOrchestrationSystemProps {
  userId: number;
}

export function AgentOrchestrationSystem({ userId }: AgentOrchestrationSystemProps) {
  // State
  const [activeTab, setActiveTab] = useState<string>('agents');
  const [newAgentDialogOpen, setNewAgentDialogOpen] = useState<boolean>(false);
  const [newStrategyDialogOpen, setNewStrategyDialogOpen] = useState<boolean>(false);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<any>(null);
  
  // Form state
  const [newAgentName, setNewAgentName] = useState<string>('');
  const [newAgentType, setNewAgentType] = useState<string>('technical');
  const [newAgentDescription, setNewAgentDescription] = useState<string>('');
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('');
  const [selectedRiskProfileId, setSelectedRiskProfileId] = useState<string>('');
  
  // Hooks
  const { toast } = useToast();
  const { 
    agents, 
    agentLogs, 
    agentHealth, 
    createAgent, 
    startAgent, 
    stopAgent, 
    restartAgent, 
    deleteAgent,
    updateAgentConfig
  } = useAgentSystem(userId);
  
  const {
    strategies,
    createStrategy,
    deleteStrategy,
    runBacktest,
    strategiesLoading
  } = useStrategyManagement(userId);
  
  const {
    riskProfiles,
    createRiskProfile,
    updateRiskProfile,
    deleteRiskProfile
  } = useRiskManagement(userId);
  
  // Create a new agent
  const handleCreateAgent = async () => {
    if (!newAgentName || !selectedStrategyId || !selectedRiskProfileId) {
      toast({
        title: "Missing Information",
        description: "Please provide all required fields",
        variant: "destructive"
      });
      return;
    }
    
    try {
      await createAgent({
        name: newAgentName,
        type: newAgentType,
        description: newAgentDescription,
        strategyId: selectedStrategyId,
        riskProfileId: selectedRiskProfileId
      });
      
      toast({
        title: "Agent Created",
        description: `Agent "${newAgentName}" has been created successfully`,
        variant: "success"
      });
      
      // Reset form
      setNewAgentName('');
      setNewAgentType('technical');
      setNewAgentDescription('');
      setSelectedStrategyId('');
      setSelectedRiskProfileId('');
      setNewAgentDialogOpen(false);
    } catch (error) {
      toast({
        title: "Agent Creation Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  };
  
  // Create a new strategy
  const handleCreateStrategy = async (data: any) => {
    try {
      await createStrategy(data);
      toast({
        title: "Strategy Created",
        description: `Strategy "${data.name}" has been created successfully`,
        variant: "success"
      });
      setNewStrategyDialogOpen(false);
    } catch (error) {
      toast({
        title: "Strategy Creation Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  };
  
  // Agent action handlers
  const handleAgentAction = async (agentId: string, action: 'start' | 'stop' | 'restart' | 'delete') => {
    try {
      if (action === 'start') {
        await startAgent(agentId);
        toast({
          title: "Agent Started",
          description: "Agent has been started successfully",
          variant: "success"
        });
      } else if (action === 'stop') {
        await stopAgent(agentId);
        toast({
          title: "Agent Stopped",
          description: "Agent has been stopped successfully",
          variant: "success"
        });
      } else if (action === 'restart') {
        await restartAgent(agentId);
        toast({
          title: "Agent Restarted",
          description: "Agent has been restarted successfully",
          variant: "success"
        });
      } else if (action === 'delete') {
        await deleteAgent(agentId);
        toast({
          title: "Agent Deleted",
          description: "Agent has been deleted successfully",
          variant: "success"
        });
      }
    } catch (error) {
      toast({
        title: `Agent ${action.charAt(0).toUpperCase() + action.slice(1)} Failed`,
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  };
  
  // Get agent status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge variant="success">Running</Badge>;
      case 'stopped':
        return <Badge variant="secondary">Stopped</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'starting':
        return <Badge variant="warning">Starting</Badge>;
      case 'stopping':
        return <Badge variant="warning">Stopping</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };
  
  // Get agent health indicator
  const getHealthIndicator = (agentId: string) => {
    const health = agentHealth.find(h => h.agentId === agentId);
    if (!health) return null;
    
    let healthColor = 'bg-red-500';
    if (health.score >= 80) healthColor = 'bg-green-500';
    else if (health.score >= 60) healthColor = 'bg-yellow-500';
    
    return (
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${healthColor}`}></div>
        <span>{health.score}%</span>
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Agent Orchestration System</h2>
        <div className="flex space-x-2">
          <Button onClick={() => setNewAgentDialogOpen(true)}>
            <PlusIcon className="mr-2 h-4 w-4" />
            New Agent
          </Button>
          <Button variant="outline" onClick={() => setNewStrategyDialogOpen(true)}>
            <PlusIcon className="mr-2 h-4 w-4" />
            New Strategy
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="strategies">Strategies</TabsTrigger>
          <TabsTrigger value="risk">Risk Management</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>
        
        {/* Agents Tab */}
        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Active Trading Agents</CardTitle>
              <CardDescription>
                Manage and monitor your active trading agents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Strategy</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Health</TableHead>
                      <TableHead>Last Trade</TableHead>
                      <TableHead>P&L (24h)</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No active agents
                        </TableCell>
                      </TableRow>
                    ) : (
                      agents.map((agent) => (
                        <TableRow key={agent.id}>
                          <TableCell className="font-medium">
                            {agent.name}
                          </TableCell>
                          <TableCell>{agent.type}</TableCell>
                          <TableCell>{agent.strategyName}</TableCell>
                          <TableCell>{getStatusBadge(agent.status)}</TableCell>
                          <TableCell>{getHealthIndicator(agent.id)}</TableCell>
                          <TableCell>
                            {agent.lastTradeTime 
                              ? new Date(agent.lastTradeTime).toLocaleString() 
                              : 'No trades'}
                          </TableCell>
                          <TableCell className={
                            agent.pnl24h > 0 ? 'text-green-500' : 
                            agent.pnl24h < 0 ? 'text-red-500' : ''
                          }>
                            {agent.pnl24h > 0 ? '+' : ''}{agent.pnl24h}%
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {agent.status === 'running' ? (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleAgentAction(agent.id, 'stop')}
                                >
                                  <PauseIcon className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleAgentAction(agent.id, 'start')}
                                >
                                  <PlayIcon className="h-4 w-4" />
                                </Button>
                              )}
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleAgentAction(agent.id, 'restart')}
                              >
                                <ReloadIcon className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => handleAgentAction(agent.id, 'delete')}
                              >
                                <Cross2Icon className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Strategies Tab */}
        <TabsContent value="strategies" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Trading Strategies</CardTitle>
              <CardDescription>
                Manage your trading strategies and run backtests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Strategy</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Markets</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {strategiesLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Loading strategies...
                        </TableCell>
                      </TableRow>
                    ) : strategies.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No strategies found
                        </TableCell>
                      </TableRow>
                    ) : (
                      strategies.map((strategy) => (
                        <TableRow key={strategy.id}>
                          <TableCell className="font-medium">
                            {strategy.name}
                          </TableCell>
                          <TableCell>{strategy.type}</TableCell>
                          <TableCell>
                            {strategy.markets.map((market) => (
                              <Badge key={market} variant="outline" className="mr-1">
                                {market}
                              </Badge>
                            ))}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={strategy.status === 'active' ? 'success' : 'secondary'}
                            >
                              {strategy.status}
                            </Badge>
                          </TableCell>
                          <TableCell className={
                            strategy.performance > 0 ? 'text-green-500' : 
                            strategy.performance < 0 ? 'text-red-500' : ''
                          }>
                            {strategy.performance > 0 ? '+' : ''}{strategy.performance}%
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => runBacktest(strategy.id)}
                              >
                                Backtest
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedStrategy(strategy)}
                              >
                                Edit
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => deleteStrategy(strategy.id)}
                              >
                                <Cross2Icon className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Risk Management Tab */}
        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Risk Profiles</CardTitle>
              <CardDescription>
                Configure portfolio-wide risk management settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Profile Name</TableHead>
                      <TableHead>Max Position Size</TableHead>
                      <TableHead>Max Drawdown</TableHead>
                      <TableHead>Daily Loss Limit</TableHead>
                      <TableHead>Leverage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {riskProfiles.map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell className="font-medium">
                          {profile.name}
                        </TableCell>
                        <TableCell>${profile.maxPositionSize}</TableCell>
                        <TableCell>{profile.maxDrawdown}%</TableCell>
                        <TableCell>${profile.dailyLossLimit}</TableCell>
                        <TableCell>{profile.maxLeverage}x</TableCell>
                        <TableCell>
                          <Badge 
                            variant={profile.isActive ? 'success' : 'secondary'}
                          >
                            {profile.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                // Edit profile logic
                              }}
                            >
                              Edit
                            </Button>
                            <Button 
                              variant={profile.isActive ? 'secondary' : 'outline'} 
                              size="sm"
                              onClick={() => {
                                updateRiskProfile(profile.id, {
                                  ...profile,
                                  isActive: !profile.isActive
                                });
                              }}
                            >
                              {profile.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card className="h-[500px] overflow-y-auto">
            <CardHeader className="pb-2 sticky top-0 bg-background z-10">
              <CardTitle>Agent Logs</CardTitle>
              <CardDescription>
                Event logs and debugging information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {agentLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No logs available
                  </div>
                ) : (
                  agentLogs.map((log, index) => (
                    <div 
                      key={index} 
                      className={`p-2 rounded-md text-sm font-mono ${
                        log.level === 'error' ? 'bg-red-500/10 text-red-500' :
                        log.level === 'warning' ? 'bg-yellow-500/10 text-yellow-500' :
                        log.level === 'info' ? 'bg-blue-500/10' : ''
                      }`}
                    >
                      <div className="flex justify-between">
                        <span className="font-semibold">[{log.agentName}]</span>
                        <span className="text-muted-foreground">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-1">{log.message}</div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* New Agent Dialog */}
      <Dialog open={newAgentDialogOpen} onOpenChange={setNewAgentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Trading Agent</DialogTitle>
            <DialogDescription>
              Configure your new trading agent
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="agent-name">Agent Name</Label>
              <Input
                id="agent-name"
                value={newAgentName}
                onChange={(e) => setNewAgentName(e.target.value)}
                placeholder="e.g., BTC Momentum Trader"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="agent-type">Agent Type</Label>
              <Select value={newAgentType} onValueChange={setNewAgentType}>
                <SelectTrigger id="agent-type">
                  <SelectValue placeholder="Select agent type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="fundamental">Fundamental</SelectItem>
                  <SelectItem value="statistical">Statistical</SelectItem>
                  <SelectItem value="sentiment">Sentiment</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="agent-description">Description</Label>
              <Input
                id="agent-description"
                value={newAgentDescription}
                onChange={(e) => setNewAgentDescription(e.target.value)}
                placeholder="Brief description of the agent's purpose"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="strategy-selection">Trading Strategy</Label>
              <Select value={selectedStrategyId} onValueChange={setSelectedStrategyId}>
                <SelectTrigger id="strategy-selection">
                  <SelectValue placeholder="Select a strategy" />
                </SelectTrigger>
                <SelectContent>
                  {strategies.map((strategy) => (
                    <SelectItem key={strategy.id} value={strategy.id}>
                      {strategy.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="risk-profile">Risk Profile</Label>
              <Select value={selectedRiskProfileId} onValueChange={setSelectedRiskProfileId}>
                <SelectTrigger id="risk-profile">
                  <SelectValue placeholder="Select a risk profile" />
                </SelectTrigger>
                <SelectContent>
                  {riskProfiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="secondary" onClick={() => setNewAgentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAgent}>
              Create Agent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* New Strategy Dialog would be implemented here */}
    </div>
  );
}
