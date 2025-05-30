'use client';

import React, { useState, useEffect } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { goalService } from '@/services/goal-service';
import { farmService } from '@/services/farm-service';
import { Goal } from '@/services/goal-service';
import { Search, AlertCircle } from 'lucide-react';

interface AssignAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farmId: string;
  goalId: string;
  onAssignComplete: () => void;
}

export function AssignAgentDialog({ 
  open, 
  onOpenChange, 
  farmId,
  goalId,
  onAssignComplete 
}: AssignAgentDialogProps) {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [elizaAgents, setElizaAgents] = useState<any[]>([]);
  const [assignedAgents, setAssignedAgents] = useState<{[key: string]: boolean}>({});
  const [assignedElizaAgents, setAssignedElizaAgents] = useState<{[key: string]: boolean}>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch goal details when dialog opens
  useEffect(() => {
    if (open && goalId) {
      fetchGoalAndAgents();
    }
  }, [open, goalId]);
  
  const fetchGoalAndAgents = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch goal details
      const { data: goalData, error: goalError } = await goalService.getGoalById(goalId);
      if (goalError || !goalData) {
        throw new Error(goalError || 'Failed to fetch goal details');
      }
      setGoal(goalData);
      
      // Fetch agents for this farm
      const { data: agentsData, error: agentsError } = await farmService.getAgents(farmId);
      if (agentsError) {
        console.error('Error fetching agents:', agentsError);
      } else {
        setAgents(agentsData || []);
      }
      
      // Fetch ElizaOS agents if available
      try {
        const { data: elizaData, error: elizaError } = await farmService.getElizaAgents(farmId);
        if (!elizaError) {
          setElizaAgents(elizaData || []);
        }
      } catch (err) {
        console.warn('ElizaOS agents might not be configured:', err);
      }
      
      // Fetch agents already assigned to this goal
      const { data: assignedData, error: assignedError } = await goalService.getGoalAgents(goalId);
      if (assignedError) {
        console.error('Error fetching assigned agents:', assignedError);
      } else if (assignedData) {
        // Create mapping of assigned agents
        const standardAgentsMap: {[key: string]: boolean} = {};
        const elizaAgentsMap: {[key: string]: boolean} = {};
        
        assignedData.agents?.forEach(agent => {
          standardAgentsMap[agent.id] = true;
        });
        
        assignedData.elizaAgents?.forEach(agent => {
          elizaAgentsMap[agent.id] = true;
        });
        
        setAssignedAgents(standardAgentsMap);
        setAssignedElizaAgents(elizaAgentsMap);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAssignAgent = async (agentId: string, isEliza: boolean) => {
    try {
      setIsLoading(true);
      
      // Check if agent is already assigned
      const isAssigned = isEliza 
        ? assignedElizaAgents[agentId] 
        : assignedAgents[agentId];
      
      if (isAssigned) {
        // Unassign the agent
        await goalService.unassignAgentFromGoal(goalId, agentId, isEliza);
        
        if (isEliza) {
          setAssignedElizaAgents(prev => ({
            ...prev,
            [agentId]: false
          }));
        } else {
          setAssignedAgents(prev => ({
            ...prev,
            [agentId]: false
          }));
        }
      } else {
        // Assign the agent
        await goalService.assignAgentToGoal(goalId, agentId, isEliza);
        
        if (isEliza) {
          setAssignedElizaAgents(prev => ({
            ...prev,
            [agentId]: true
          }));
        } else {
          setAssignedAgents(prev => ({
            ...prev,
            [agentId]: true
          }));
        }
      }
    } catch (err) {
      console.error('Error assigning/unassigning agent:', err);
      setError(err instanceof Error ? err.message : 'Failed to assign agent');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSave = () => {
    onAssignComplete();
    onOpenChange(false);
  };
  
  // Filter agents based on search query
  const filteredAgents = agents.filter(agent => 
    agent.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredElizaAgents = elizaAgents.filter(agent => 
    agent.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Assign Agents to Goal</DialogTitle>
          <DialogDescription>
            {goal ? (
              <span>Select agents to assign to the goal: <strong>{goal.title}</strong></span>
            ) : 'Loading goal details...'}
          </DialogDescription>
        </DialogHeader>
        
        {error && (
          <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-red-800">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}
        
        <div className="relative mb-4">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search agents..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Tabs defaultValue="standard" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="standard">Standard Agents</TabsTrigger>
            <TabsTrigger value="eliza">ElizaOS Agents</TabsTrigger>
          </TabsList>
          
          <TabsContent value="standard" className="h-[300px] overflow-auto">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              </div>
            ) : filteredAgents.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                <p className="text-gray-500">No standard agents found for this farm</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Assign</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAgents.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell>
                        <Checkbox 
                          checked={!!assignedAgents[agent.id]} 
                          onCheckedChange={() => handleAssignAgent(agent.id, false)}
                          disabled={isLoading}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{agent.name}</TableCell>
                      <TableCell>{agent.agent_type || 'Custom'}</TableCell>
                      <TableCell>
                        <Badge variant={agent.is_active ? "default" : "secondary"}>
                          {agent.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
          
          <TabsContent value="eliza" className="h-[300px] overflow-auto">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              </div>
            ) : filteredElizaAgents.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                <p className="text-gray-500">No ElizaOS agents found for this farm</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Assign</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredElizaAgents.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell>
                        <Checkbox 
                          checked={!!assignedElizaAgents[agent.id]} 
                          onCheckedChange={() => handleAssignAgent(agent.id, true)}
                          disabled={isLoading}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{agent.name}</TableCell>
                      <TableCell>{agent.model || 'Default'}</TableCell>
                      <TableCell>
                        <Badge variant={agent.status === 'active' ? "default" : "secondary"}>
                          {agent.status === 'active' ? "Active" : agent.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="flex gap-2 sm:justify-between">
          <DialogClose asChild>
            <Button type="button" variant="secondary">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
