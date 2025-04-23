"use client";

import * as React from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createBrowserClient } from "@/utils/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Users, RefreshCw, AlertTriangle, Info } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAgentAssignments, useCreateAgentAssignment, useDeleteAgentAssignment, useAgentEvents } from '@/hooks/useAgentOrchestration';
import { useAgents } from '@/hooks/use-agents';
import { useFarms } from '@/hooks/use-farms';
import { useStrategies } from '@/hooks/use-strategies';
import { useAuth } from '@/hooks/use-auth';

// Define validation schema for team creation
const agentTeamSchema = z.object({
  name: z.string().min(3, { message: "Team name must be at least 3 characters" }).max(50),
  description: z.string().optional(),
  agent_ids: z.array(z.string()).min(1, { message: "At least one agent must be selected" }),
  farm_id: z.string().optional(),
  strategy_id: z.string().optional(),
  is_active: z.boolean().default(true),
});

// Define validation schema for assignment
const assignmentSchema = z.object({
  agent_id: z.string(),
  farm_id: z.string().optional(),
  strategy_id: z.string().optional(),
  task_type: z.enum(["monitor", "trade", "analyze", "optimize", "custom"]),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  assignment_details: z.string().optional(),
});

type AgentTeamFormValues = z.infer<typeof agentTeamSchema>;
type AssignmentFormValues = z.infer<typeof assignmentSchema>;

interface AgentOrchestrationModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  farmId?: string;
  onSuccess?: () => void;
}

export function AgentOrchestrationModal({ isOpen = false, onClose = () => {}, farmId, onSuccess }: AgentOrchestrationModalProps) {
  const [open, setOpen] = React.useState(isOpen);
  const [activeTab, setActiveTab] = React.useState<string>("assign");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [selectedAgents, setSelectedAgents] = React.useState<string[]>([]);
  const [authError, setAuthError] = React.useState<string | null>(null);
  
  const { toast } = useToast();
  const supabase = createBrowserClient();
  const queryClient = useQueryClient();
  
  // Get auth status
  const { user, refreshSession } = useAuth();
  
  // Fetch data with error handling
  const { agents, loading: isLoadingAgents, error: agentsError } = useAgents({ farmId });
  const { farms, loading: isLoadingFarms, error: farmsError } = useFarms();
  const { strategies, loading: isLoadingStrategies, error: strategiesError } = useStrategies({ farmId });
  const { data: assignments = [], isLoading: isLoadingAssignments, error: assignmentsError } = useAgentAssignments();
  const { data: agentEvents = [], isLoading: isLoadingEvents } = useAgentEvents(farmId, 20);
  
  // Agent status state
  const [agentStatuses, setAgentStatuses] = React.useState<Record<string, { status: string, lastActive: Date }>>({});
  const createAssignment = useCreateAgentAssignment();
  const deleteAssignment = useDeleteAgentAssignment();
  
  // Handle auth errors
  React.useEffect(() => {
    const error = agentsError || farmsError || strategiesError || assignmentsError;
    if (error) {
      const errorMessage = typeof error === 'string' ? error : error.message;
      if (errorMessage && (errorMessage.includes('JWSInvalidSignature') || errorMessage.includes('JWT'))) {
        setAuthError("Authentication error. Please refresh your session.");
        console.error("JWT Authentication error:", error);
      }
    }
  }, [agentsError, farmsError, strategiesError, assignmentsError]);
  
  // Form for team creation
  const teamForm = useForm<AgentTeamFormValues>({
    resolver: zodResolver(agentTeamSchema),
    defaultValues: {
      name: "",
      description: "",
      agent_ids: [],
      farm_id: farmId,
      strategy_id: undefined,
      is_active: true,
    }
  });

  // Form for assignment
  const assignmentForm = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      agent_id: "",
      farm_id: farmId,
      strategy_id: undefined,
      task_type: "monitor",
      priority: "medium",
      assignment_details: "",
    }
  });

  // Handle agent selection for team creation
  const handleAgentToggle = (id: string): void => {
    if (selectedAgents.includes(id)) {
      setSelectedAgents(selectedAgents.filter((agentId: string) => agentId !== id));
      teamForm.setValue('agent_ids', selectedAgents.filter((agentId: string) => agentId !== id));
    } else {
      setSelectedAgents([...selectedAgents, id]);
      teamForm.setValue('agent_ids', [...selectedAgents, id]);
    }
  };
  
  // Handle toggling agent active status
  const handleToggleAgentStatus = async (agentId: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      
      // Update agent status in database
      const { error } = await supabase
        .from('agents')
        .update({ 
          is_active: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', agentId);
      
      if (error) throw error;
      
      // Log the agent status change as an event
      await supabase
        .from('agent_events')
        .insert({
          agent_id: agentId,
          event_type: newStatus ? 'activated' : 'deactivated',
          event_data: { status_change: { from: currentStatus, to: newStatus } },
          created_at: new Date().toISOString(),
          farm_id: farmId
        });
      
      // Refresh the agents data
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      
      toast({
        title: newStatus ? "Agent Activated" : "Agent Deactivated",
        description: `Agent status has been ${newStatus ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error: any) {
      console.error('Error toggling agent status:', error);
      toast({
        title: "Status Update Failed",
        description: error.message || "Could not update agent status",
        variant: "destructive"
      });
    }
  };
  
  // Get the latest agent statuses from the database
  const refreshAgentStatuses = async () => {
    try {
      // Fetch agent health/status data
      const { data, error } = await supabase
        .from('agent_health')
        .select('agent_id, status, last_active, memory_usage, cpu_usage')
        .in('agent_id', agents.map((a: any) => a.id));
      
      if (error) throw error;
      
      if (data) {
        // Update agent statuses
        const statusMap: Record<string, { status: string, lastActive: Date }> = {};
        
        data.forEach((health: any) => {
          statusMap[health.agent_id] = {
            status: health.status,
            lastActive: new Date(health.last_active)
          };
        });
        
        setAgentStatuses(statusMap);
      }
    } catch (error) {
      console.error('Error refreshing agent statuses:', error);
    }
  };

  // Handle team creation submission
  const onTeamSubmit = async (values: AgentTeamFormValues) => {
    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase
        .from('agent_teams')
        .insert({
          name: values.name,
          description: values.description || null,
          agent_ids: values.agent_ids,
          farm_id: values.farm_id || null,
          strategy_id: values.strategy_id || null,
          is_active: values.is_active,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) throw error;

      toast({
        title: "Team Created",
        description: `${values.name} has been created successfully`,
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['agent_teams'] });
      
      // Reset form and close modal
      teamForm.reset();
      setSelectedAgents([]);
      if (onSuccess) onSuccess();
      handleClose();
    } catch (error: any) {
      toast({
        title: "Error Creating Team",
        description: error.message || "Failed to create team. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle assignment submission
  const onAssignmentSubmit = async (values: AssignmentFormValues) => {
    setIsSubmitting(true);
    
    try {
      // Get agent details for the logging
      const agent = agents.find(a => a.id === values.agent_id);
      const farm = farms.find(f => f.id === values.farm_id);
      const strategy = strategies.find(s => s.id === values.strategy_id);
      
      // Check if agent is active
      if (agent && !agent.is_active) {
        // Auto-activate the agent when assigning a task
        await supabase
          .from('agents')
          .update({ is_active: true })
          .eq('id', agent.id);
          
        queryClient.invalidateQueries({ queryKey: ['agents'] });
        
        toast({
          title: "Agent Activated",
          description: `${agent.name} was inactive and has been automatically activated for this assignment.`,
        });
      }
      
      // Create the assignment
      const assignment = await createAssignment.mutateAsync({
        agent_id: values.agent_id,
        farm_id: values.farm_id || null,
        strategy_id: values.strategy_id || null,
        task_type: values.task_type,
        priority: values.priority,
        assignment_details: values.assignment_details || null,
        assigned_at: new Date().toISOString(),
        status: "assigned"
      });

      // Log the assignment event
      await supabase
        .from('agent_events')
        .insert({
          agent_id: values.agent_id,
          event_type: 'assignment_created',
          event_data: {
            assignment_id: assignment.id,
            task_type: values.task_type,
            farm: farm?.name || null,
            strategy: strategy?.name || null,
            priority: values.priority
          },
          created_at: new Date().toISOString(),
          farm_id: values.farm_id || farmId || null
        });

      toast({
        title: "Agent Assigned",
        description: `${agent?.name || 'Agent'} has been assigned to ${values.task_type} task successfully`,
      });

      // Reset form and close modal
      assignmentForm.reset();
      if (onSuccess) onSuccess();
      handleClose();
      
      // Refresh assignments data
      queryClient.invalidateQueries({ queryKey: ['agent_assignments'] });
      queryClient.invalidateQueries({ queryKey: ['agent_events'] });
    } catch (error: any) {
      console.error('Error assigning agent:', error);
      toast({
        title: "Error Assigning Agent",
        description: error.message || "Failed to assign agent. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    onClose();
  };

  React.useEffect(() => {
    setOpen(isOpen);
  }, [isOpen]);
  
  // Fetch agent statuses when the modal opens or when the tab changes to monitor
  React.useEffect(() => {
    if (open && activeTab === 'monitor') {
      refreshAgentStatuses();
    }
  }, [open, activeTab, agents]);

  // Handle refresh session
  const handleRefreshSession = async () => {
    setAuthError(null);
    try {
      await refreshSession();
      // Refetch data
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['farms'] });
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
      queryClient.invalidateQueries({ queryKey: ['agent_assignments'] });
      toast({
        title: "Session refreshed",
        description: "Your authentication session has been renewed."
      });
    } catch (error) {
      console.error("Failed to refresh session:", error);
      setAuthError("Failed to refresh authentication. Please try logging out and in again.");
      toast({
        title: "Authentication error",
        description: "Could not refresh your session. Please try logging out and in again.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value: boolean) => setOpen(value)}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Agent Orchestration</DialogTitle>
          <DialogDescription>
            Coordinate and orchestrate your trading agents across farms and strategies
          </DialogDescription>
        </DialogHeader>
        
        {/* Auth error alert */}
        {authError && (
          <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md mb-4 flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              <span>{authError}</span>
            </div>
            <Button size="sm" variant="outline" onClick={handleRefreshSession}>
              <RefreshCw className="h-3 w-3 mr-1" /> Refresh Session
            </Button>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="assign">Agent Assignment</TabsTrigger>
            <TabsTrigger value="team">Team Creation</TabsTrigger>
            <TabsTrigger value="monitor">Monitoring</TabsTrigger>
          </TabsList>

          {/* Agent Assignment Tab */}
          <TabsContent value="assign">
            <Form {...assignmentForm}>
              <form onSubmit={assignmentForm.handleSubmit(onAssignmentSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={assignmentForm.control}
                    name="agent_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Agent</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select agent" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {agents.map((agent) => (
                              <SelectItem key={agent.id} value={agent.id}>
                                {agent.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={assignmentForm.control}
                    name="task_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Task Type</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select task type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="monitor">Monitor Market</SelectItem>
                            <SelectItem value="trade">Execute Trades</SelectItem>
                            <SelectItem value="analyze">Analyze Data</SelectItem>
                            <SelectItem value="optimize">Optimize Strategy</SelectItem>
                            <SelectItem value="custom">Custom Task</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={assignmentForm.control}
                    name="farm_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Farm (Optional)</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select farm" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">No specific farm</SelectItem>
                            {farms.map((farm: any) => (
                              <SelectItem key={farm.id} value={farm.id}>
                                {farm.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={assignmentForm.control}
                    name="strategy_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Strategy (Optional)</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select strategy" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">No specific strategy</SelectItem>
                            {strategies.map((strategy) => (
                              <SelectItem key={strategy.id} value={strategy.id}>
                                {strategy.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={assignmentForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={assignmentForm.control}
                  name="assignment_details"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Details (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Any specific instructions or details" {...field} />
                      </FormControl>
                      <FormDescription>
                        Provide any additional details for this assignment
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleClose}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Assigning...
                      </>
                    ) : "Assign Agent"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>

          {/* Team Creation Tab */}
          <TabsContent value="team">
            <Form {...teamForm}>
              <form onSubmit={teamForm.handleSubmit(onTeamSubmit)} className="space-y-4">
                <FormField
                  control={teamForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter team name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={teamForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Describe the team's purpose" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={teamForm.control}
                  name="agent_ids"
                  render={() => (
                    <FormItem>
                      <FormLabel>Select Agents</FormLabel>
                      <Card>
                        <CardContent className="pt-4 max-h-40 overflow-y-auto">
                          {isLoadingAgents ? (
                            <div className="flex items-center justify-center p-4">
                              <Loader2 className="h-5 w-5 animate-spin mr-2" />
                              <span>Loading agents...</span>
                            </div>
                          ) : agents.length === 0 ? (
                            <div className="text-center p-4 text-muted-foreground">
                              <Info className="h-5 w-5 mx-auto mb-2" />
                              <p>No agents available to select</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {agents.map((agent: any) => (
                                <div key={agent.id} className="flex items-center space-x-2">
                                  <Checkbox 
                                    id={`agent-${agent.id}`}
                                    checked={selectedAgents.includes(agent.id)}
                                    onCheckedChange={() => handleAgentToggle(agent.id)}
                                  />
                                  <label 
                                    htmlFor={`agent-${agent.id}`}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center justify-between w-full"
                                  >
                                    <span>{agent.name}</span>
                                    <Badge variant="outline">{agent.type}</Badge>
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={teamForm.control}
                    name="farm_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Farm (Optional)</FormLabel>
                        <Select
                          value={field.value || ""}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select farm" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">No specific farm</SelectItem>
                            {farms.map((farm: any) => (
                              <SelectItem key={farm.id} value={farm.id}>
                                {farm.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={teamForm.control}
                    name="strategy_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Strategy (Optional)</FormLabel>
                        <Select
                          value={field.value || ""}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select strategy" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">No specific strategy</SelectItem>
                            {strategies.map((strategy) => (
                              <SelectItem key={strategy.id} value={strategy.id}>
                                {strategy.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={teamForm.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Active Team</FormLabel>
                        <FormDescription>
                          Make this team active immediately after creation
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleClose}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : "Create Team"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>

          {/* Monitoring Tab */}
          <TabsContent value="monitor">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Agent Status</h3>
                <Button variant="outline" size="sm" onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['agents'] });
                  queryClient.invalidateQueries({ queryKey: ['agent_events'] });
                  
                  // Refresh agent statuses from the database
                  refreshAgentStatuses();
                  
                  toast({
                    title: "Refreshed",
                    description: "Agent status data has been updated",
                  });
                }}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
              
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-4 max-h-72 overflow-y-auto">
                    {isLoadingAgents ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        <span>Loading agent status...</span>
                      </div>
                    ) : agents.length === 0 ? (
                      <div className="text-center p-4 text-muted-foreground">
                        <AlertTriangle className="h-5 w-5 mx-auto mb-2" />
                        <p>No agent data available</p>
                      </div>
                    ) : (
                      <>
                        {agents.map((agent) => {
                          const agentStatus = agentStatuses[agent.id] || { status: agent.is_active ? "idle" : "offline", lastActive: new Date() };
                          const statusVariant = {
                            active: "success",
                            running: "success",
                            idle: "default",
                            paused: "warning",
                            error: "destructive",
                            offline: "secondary"
                          }[agentStatus.status] || "default";
                          
                          const activeAssignments = assignments.filter(a => a.agent_id === agent.id && a.status !== 'completed');
                          
                          return (
                            <div key={agent.id} className="border rounded-md p-3 mb-2">
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="font-medium">{agent.name}</div>
                                  <div className="text-sm text-muted-foreground flex items-center">
                                    <span className="capitalize mr-2">{agent.type}</span>
                                    {agent.capabilities && (
                                      <Badge variant="outline" className="font-mono text-xs">
                                        {Array.isArray(agent.capabilities) 
                                          ? agent.capabilities.join(', ')
                                          : typeof agent.capabilities === 'string' 
                                            ? agent.capabilities
                                            : 'Standard'}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Badge variant={statusVariant}>
                                    {agentStatus.status.charAt(0).toUpperCase() + agentStatus.status.slice(1)}
                                  </Badge>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleToggleAgentStatus(agent.id, agent.is_active)}
                                  >
                                    {agent.is_active ? "Deactivate" : "Activate"}
                                  </Button>
                                </div>
                              </div>
                              
                              {activeAssignments.length > 0 && (
                                <div className="mt-2 pt-2 border-t">
                                  <div className="text-xs font-medium mb-1">Current Assignments:</div>
                                  <div className="space-y-1">
                                    {activeAssignments.map((assignment: any) => (
                                      <div key={assignment.id} className="flex justify-between text-xs">
                                        <span className="capitalize">{assignment.task_type}</span>
                                        <Badge variant="outline" className="text-xs capitalize">{assignment.priority}</Badge>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-2">Recent Activity</h3>
                <Card>
                  <CardContent className="pt-4">
                    <div className="max-h-48 overflow-y-auto">
                      {isLoadingEvents ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                          <span>Loading events...</span>
                        </div>
                      ) : agentEvents.length === 0 ? (
                        <div className="text-center p-4 text-muted-foreground">
                          <Info className="h-5 w-5 mx-auto mb-2" />
                          <p>No recent agent activity recorded</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {agentEvents.map((event: any) => {
                            const agent = agents.find((a: any) => a.id === event.agent_id);
                            return (
                              <div key={event.id} className="flex items-start border-b pb-2">
                                <div className="mr-2 mt-1 flex-shrink-0">
                                  <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center">
                                    {event.event_type === 'error' ? '!' : 'i'}
                                  </Badge>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between">
                                    <p className="text-sm font-medium truncate">
                                      {agent?.name || 'Unknown Agent'}
                                    </p>
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(event.created_at).toLocaleTimeString()}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {event.event_data && typeof event.event_data === 'object' 
                                      ? JSON.stringify(event.event_data)
                                      : event.event_data || event.event_type}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            <DialogFooter className="mt-4">
              <Button type="button" onClick={handleClose}>Close</Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default AgentOrchestrationModal;
