'use client';

import React, { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Bot, 
  BrainCircuit, 
  MoreHorizontal, 
  Play, 
  Pause, 
  Edit, 
  Trash2, 
  Copy, 
  Users, 
  MessageSquare, 
  Settings, 
  EyeIcon 
} from 'lucide-react';
import Link from 'next/link';
import { agentService } from '@/services/agent-service';
import { toast } from '@/components/ui/use-toast';

interface FarmAgentsTableProps {
  agents: any[];
  elizaAgents: any[];
  farmId: string;
}

export function FarmAgentsTable({ agents, elizaAgents, farmId }: FarmAgentsTableProps) {
  const [allAgents, setAllAgents] = useState([...agents, ...elizaAgents].map(agent => ({
    ...agent,
    type: agent.type === 'elizaos' || elizaAgents.some(ea => ea.id === agent.id) ? 'elizaos' : agent.type || 'standard',
    is_active: agent.is_active || agent.status === 'active'
  })));
  
  const [filterQuery, setFilterQuery] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Filtering logic
  const filteredAgents = allAgents.filter(agent => 
    agent.name?.toLowerCase().includes(filterQuery.toLowerCase()) || 
    agent.description?.toLowerCase().includes(filterQuery.toLowerCase()) ||
    agent.type?.toLowerCase().includes(filterQuery.toLowerCase())
  );
  
  // Handler for toggling agent active state
  const handleToggleAgentStatus = async (agent: any) => {
    try {
      setIsProcessing(true);
      
      const isElizaAgent = agent.type === 'elizaos';
      const newStatus = !agent.is_active;
      
      // Call appropriate API endpoint based on agent type
      if (isElizaAgent) {
        // For ElizaOS agents
        const response = await fetch(`/api/agents/${agent.id}/eliza/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: newStatus ? 'active' : 'inactive'
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to update ElizaOS agent status');
        }
      } else {
        // For standard agents
        const response = await agentService.updateAgent(agent.id, {
          ...agent,
          status: newStatus ? 'active' : 'inactive'
        });
        
        if (response.error) {
          throw new Error(response.error);
        }
      }
      
      // Update local state
      setAllAgents(allAgents.map(a => 
        a.id === agent.id ? { ...a, is_active: newStatus } : a
      ));
      
      toast({
        title: `Agent ${newStatus ? 'Activated' : 'Paused'}`,
        description: `${agent.name} has been ${newStatus ? 'activated' : 'paused'} successfully.`,
      });
    } catch (error) {
      console.error('Error toggling agent status:', error);
      toast({
        title: 'Operation Failed',
        description: error instanceof Error ? error.message : 'Failed to update agent status',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handler for deleting an agent
  const handleDeleteAgent = async () => {
    if (!selectedAgent) return;
    
    try {
      setIsProcessing(true);
      
      const isElizaAgent = selectedAgent.type === 'elizaos';
      
      if (isElizaAgent) {
        // Delete ElizaOS agent
        const response = await fetch(`/api/agents/${selectedAgent.id}/eliza`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          throw new Error('Failed to delete ElizaOS agent');
        }
      } else {
        // Delete standard agent
        const response = await agentService.deleteAgent(selectedAgent.id);
        
        if (response.error) {
          throw new Error(response.error);
        }
      }
      
      // Remove from local state
      setAllAgents(allAgents.filter(a => a.id !== selectedAgent.id));
      
      toast({
        title: 'Agent Deleted',
        description: `${selectedAgent.name} has been deleted successfully.`,
      });
      
      setShowDeleteDialog(false);
      setSelectedAgent(null);
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast({
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Failed to delete agent',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handler for cloning an agent
  const handleCloneAgent = async (agent: any) => {
    try {
      setIsProcessing(true);
      
      const isElizaAgent = agent.type === 'elizaos';
      
      if (isElizaAgent) {
        // Clone ElizaOS agent
        const response = await fetch(`/api/agents/${agent.id}/eliza/clone`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: `${agent.name} (Copy)`,
            farm_id: farmId
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to clone ElizaOS agent');
        }
        
        const data = await response.json();
        
        // Add to local state
        setAllAgents([...allAgents, {
          ...data.agent,
          type: 'elizaos',
          is_active: false
        }]);
      } else {
        // Clone standard agent
        const cloneResponse = await agentService.cloneAgent(agent.id, {
          name: `${agent.name} (Copy)`,
          farm_id: farmId
        });
        
        if (cloneResponse.error) {
          throw new Error(cloneResponse.error);
        }
        
        // Add to local state
        if (cloneResponse.data) {
          setAllAgents([...allAgents, {
            ...cloneResponse.data,
            is_active: false
          }]);
        }
      }
      
      toast({
        title: 'Agent Cloned',
        description: `A copy of ${agent.name} has been created successfully.`,
      });
    } catch (error) {
      console.error('Error cloning agent:', error);
      toast({
        title: 'Clone Failed',
        description: error instanceof Error ? error.message : 'Failed to clone agent',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filtering and Actions */}
      <div className="flex flex-col sm:flex-row justify-between gap-2">
        <div className="max-w-sm">
          <Input
            placeholder="Filter agents..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/farms/${farmId}/agents/new`}>
              + Standard Agent
            </Link>
          </Button>
          
          <Button asChild>
            <Link href={`/dashboard/farms/${farmId}/agents/new?type=elizaos`}>
              + ElizaOS Agent
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Main Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Win Rate</TableHead>
              <TableHead>P/L</TableHead>
              <TableHead>Trades</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAgents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  {filterQuery ? (
                    <div className="text-center text-muted-foreground">
                      No agents match your filter criteria
                    </div>
                  ) : (
                    <div className="text-center">
                      <Bot className="h-10 w-10 mx-auto mb-2 opacity-20" />
                      <p className="text-muted-foreground">No agents found</p>
                      <p className="text-xs text-muted-foreground mb-2">Create your first agent to start trading</p>
                      <Button size="sm" asChild>
                        <Link href={`/dashboard/farms/${farmId}/agents/new`}>
                          + Add Agent
                        </Link>
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filteredAgents.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell>
                    <div className="flex items-start gap-2">
                      {agent.type === 'elizaos' ? (
                        <BrainCircuit className="h-5 w-5 text-blue-500 mt-0.5" />
                      ) : (
                        <Bot className="h-5 w-5 text-primary mt-0.5" />
                      )}
                      <div>
                        <div className="font-medium">{agent.name}</div>
                        {agent.description && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {agent.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={agent.type === 'elizaos' ? 'secondary' : 'outline'}>
                      {agent.type === 'elizaos' ? 'ElizaOS' : agent.strategy_type || 'Standard'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={agent.is_active ? 'default' : 'outline'} className={agent.is_active ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''}>
                      {agent.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {agent.performance_metrics?.win_rate
                      ? `${(agent.performance_metrics.win_rate * 100).toFixed(1)}%`
                      : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {agent.performance_metrics?.profit_loss
                      ? `${agent.performance_metrics.profit_loss > 0 ? '+' : ''}${agent.performance_metrics.profit_loss.toFixed(2)}`
                      : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {agent.performance_metrics?.total_trades || 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleAgentStatus(agent)}
                        disabled={isProcessing}
                      >
                        {agent.is_active ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/agents/${agent.id}`}>
                              <EyeIcon className="mr-2 h-4 w-4" />
                              View
                            </Link>
                          </DropdownMenuItem>
                          
                          {agent.type === 'elizaos' && (
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/agents/${agent.id}/console`}>
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Console
                              </Link>
                            </DropdownMenuItem>
                          )}
                          
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/agents/${agent.id}/edit`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem onClick={() => handleCloneAgent(agent)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Clone
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/agents/${agent.id}/tools`}>
                              <Settings className="mr-2 h-4 w-4" />
                              Tools
                            </Link>
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/farms/${farmId}/collaborations?agent=${agent.id}`}>
                              <Users className="mr-2 h-4 w-4" />
                              Collaborations
                            </Link>
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem 
                            className="text-red-600" 
                            onClick={() => {
                              setSelectedAgent(agent);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Agent</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedAgent?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteAgent}
              disabled={isProcessing}
            >
              {isProcessing ? 'Deleting...' : 'Delete Agent'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
