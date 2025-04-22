"use client";

import * as React from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
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
      setSelectedAgents(selectedAgents.filter(agentId => agentId !== id));
      teamForm.setValue('agent_ids', selectedAgents.filter(agentId => agentId !== id));
    } else {
      setSelectedAgents([...selectedAgents, id]);
      teamForm.setValue('agent_ids', [...selectedAgents, id]);
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
      await createAssignment.mutateAsync({
        agent_id: values.agent_id,
        farm_id: values.farm_id || null,
        strategy_id: values.strategy_id || null,
        task_type: values.task_type,
        priority: values.priority,
        assignment_details: values.assignment_details || null,
        assigned_at: new Date().toISOString(),
        status: "assigned"
      });

      toast({
        title: "Agent Assigned",
        description: "Agent has been assigned successfully",
      });

      // Reset form and close modal
      assignmentForm.reset();
      if (onSuccess) onSuccess();
      handleClose();
    } catch (error: any) {
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
    <Dialog open={open} onOpenChange={(value) => setOpen(value)}>
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
                            {farms.map((farm) => (
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
                            {farms.map((farm) => (
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
                        {agents.map((agent) => (
                          <div key={agent.id} className="flex justify-between items-center border-b pb-2">
                            <div>
                              <div className="font-medium">{agent.name}</div>
                              <div className="text-sm text-muted-foreground">{agent.type}</div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant={agent.is_active ? "default" : "secondary"}>
                                {agent.is_active ? "Active" : "Inactive"}
                              </Badge>
                              <Button variant="ghost" size="sm">Details</Button>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <div className="text-sm text-muted-foreground text-center">
                <p>Advanced monitoring features will be available in the next update</p>
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
