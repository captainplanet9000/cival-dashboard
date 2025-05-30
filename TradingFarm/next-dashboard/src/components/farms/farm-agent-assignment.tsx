'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useElizaAgentsWithFallback } from '@/hooks/useElizaAgentsWithFallback';
import { createBrowserClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Bot, Plus, Loader2, AlertTriangle, Check, X } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

interface FarmAgentAssignmentProps {
  farmId: string | number;
  onAgentsUpdated?: () => void;
}

export function FarmAgentAssignment({ farmId, onAgentsUpdated }: FarmAgentAssignmentProps) {
  // Ensure farmId is handled as a number for comparisons
  const numericFarmId = typeof farmId === 'string' ? parseInt(farmId, 10) : farmId;
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignedAgents, setAssignedAgents] = useState<any[]>([]);
  const [availableAgents, setAvailableAgents] = useState<any[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const supabase = createBrowserClient();
  const { toast } = useToast();
  
  // Use our enhanced agent hook with fallback capability
  const { 
    agents: allAgents, 
    loading: agentsLoading, 
    error: agentsError,
    updateAgent,
    refreshAgents,
    isConnected
  } = useElizaAgentsWithFallback();

  // Load assigned and available agents
  useEffect(() => {
    if (!agentsLoading && allAgents && numericFarmId) {
      const assigned = allAgents.filter(agent => agent.farm_id === numericFarmId);
      const available = allAgents.filter(agent => !agent.farm_id || agent.farm_id === null);
      
      setAssignedAgents(assigned);
      setAvailableAgents(available);
    }
  }, [allAgents, agentsLoading, numericFarmId]);

  // Handle agent selection for assignment
  const handleAgentSelect = (agentId: string) => {
    setSelectedAgents(prev => {
      if (prev.includes(agentId)) {
        return prev.filter(id => id !== agentId);
      } else {
        return [...prev, agentId];
      }
    });
  };

  // Assign selected agents to the farm
  const handleAssignAgents = async () => {
    if (!selectedAgents.length) return;
    
    setLoading(true);
    
    try {
      // Update each selected agent
      for (const agentId of selectedAgents) {
        await updateAgent(agentId, { farm_id: numericFarmId });
      }
      
      // Refresh the agents list
      await refreshAgents();
      
      // Update UI
      setSelectedAgents([]);
      setDialogOpen(false);
      
      // Notify parent component
      if (onAgentsUpdated) {
        onAgentsUpdated();
      }
      
      toast({
        title: "Agents Assigned",
        description: `${selectedAgents.length} agent(s) assigned to this farm`,
      });
      
    } catch (error) {
      console.error("Error assigning agents to farm:", error);
      toast({
        title: "Assignment Failed",
        description: error instanceof Error ? error.message : "Failed to assign agents to farm",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Remove an agent from the farm
  const handleRemoveAgent = async (agentId: string) => {
    setLoading(true);
    
    try {
      await updateAgent(agentId, { farm_id: null });
      
      // Refresh the agents list
      await refreshAgents();
      
      // Notify parent component
      if (onAgentsUpdated) {
        onAgentsUpdated();
      }
      
      toast({
        title: "Agent Removed",
        description: "Agent removed from this farm",
      });
      
    } catch (error) {
      console.error("Error removing agent from farm:", error);
      toast({
        title: "Removal Failed",
        description: error instanceof Error ? error.message : "Failed to remove agent from farm",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Farm Agents</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={availableAgents.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              Assign Agents
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Agents to Farm</DialogTitle>
              <DialogDescription>
                Select agents to assign to this farm. Assigned agents will work together toward farm goals.
              </DialogDescription>
            </DialogHeader>
            
            {availableAgents.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">
                <Bot className="mx-auto h-12 w-12 opacity-20" />
                <p className="mt-2">No available agents to assign.</p>
                <p className="text-sm">Create new agents or unassign them from other farms first.</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {availableAgents.map(agent => (
                    <Card key={agent.id} className={`cursor-pointer border transition-colors ${selectedAgents.includes(agent.id) ? 'border-primary' : ''}`}>
                      <CardContent className="p-3">
                        <div className="flex items-center space-x-3">
                          <Checkbox 
                            checked={selectedAgents.includes(agent.id)}
                            onCheckedChange={() => handleAgentSelect(agent.id)}
                            id={`agent-${agent.id}`}
                          />
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {agent.name ? agent.name.charAt(0).toUpperCase() : 'A'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{agent.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {agent.type && agent.type.charAt(0).toUpperCase() + agent.type.slice(1)} Agent
                              </p>
                            </div>
                          </div>
                          {agent.strategy_type && (
                            <Badge variant="outline" className="ml-auto">
                              {agent.strategy_type}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssignAgents} disabled={selectedAgents.length === 0 || loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Assign {selectedAgents.length > 0 ? `(${selectedAgents.length})` : ''}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {agentsLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-3">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-full bg-muted" />
                  <div className="space-y-2">
                    <div className="h-4 w-32 rounded bg-muted" />
                    <div className="h-3 w-24 rounded bg-muted" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : assignedAgents.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-6 text-center text-muted-foreground">
            <Bot className="mx-auto h-12 w-12 opacity-20" />
            <p className="mt-2">No agents assigned to this farm yet.</p>
            <p className="text-sm">Assign agents to help achieve farm goals.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {assignedAgents.map(agent => (
            <Card key={agent.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {agent.name ? agent.name.charAt(0).toUpperCase() : 'A'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{agent.name}</p>
                      <div className="flex items-center space-x-2">
                        <p className="text-xs text-muted-foreground">
                          {agent.type && agent.type.charAt(0).toUpperCase() + agent.type.slice(1)}
                        </p>
                        {agent.status && (
                          <Badge variant={agent.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                            {agent.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleRemoveAgent(agent.id)}
                    disabled={loading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
