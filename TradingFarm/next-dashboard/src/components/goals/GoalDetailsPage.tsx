'use client';

/**
 * Goal Details Page Component
 * Displays comprehensive information about a trading goal and its progress
 */
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  AlertCircle, Target, CalendarClock, TrendingUp, BarChart, Clock, 
  Play, Square, Settings, RefreshCw, ChevronRight, CheckCircle, 
  XCircle, MessageSquare, Activity, PlusCircle, Bot
} from 'lucide-react';
import { acquisitionGoalService } from '@/services/acquisition-goal-service';
import { agentService } from '@/services/agent-service';
import { TradingEventEmitter, TRADING_EVENTS } from '@/utils/events/trading-events';

interface GoalDetailsPageProps {
  goalId: string;
}

export function GoalDetailsPage({ goalId }: GoalDetailsPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  
  // Goal data state
  const [goal, setGoal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Agent selection state
  const [availableAgents, setAvailableAgents] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [isAgentDialogOpen, setIsAgentDialogOpen] = useState(false);
  
  // Activity log state
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  
  // Run state
  const [isRunning, setIsRunning] = useState(false);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  
  useEffect(() => {
    loadGoalDetails();
    loadAvailableAgents();
    
    // Subscribe to events
    const progressSubscription = TradingEventEmitter.on(
      TRADING_EVENTS.GOAL_PROGRESS_UPDATED,
      handleProgressUpdate
    );
    
    const stepStartedSubscription = TradingEventEmitter.on(
      TRADING_EVENTS.GOAL_STEP_STARTED,
      handleStepStarted
    );
    
    return () => {
      progressSubscription.off();
      stepStartedSubscription.off();
    };
  }, [goalId]);
  
  const handleProgressUpdate = (data: any) => {
    if (data.goalId === goalId) {
      // Refresh goal details to show updated progress
      loadGoalDetails();
    }
  };
  
  const handleStepStarted = (data: any) => {
    if (data.goalId === goalId) {
      // Update run state
      setIsRunning(true);
      setCurrentRunId(data.runId);
      
      // Refresh goal details
      loadGoalDetails();
      
      // Show toast notification
      toast({
        title: "Step Started",
        description: `Step execution started with ElizaOS agent`,
      });
    }
  };
  
  const loadGoalDetails = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await acquisitionGoalService.getAcquisitionGoal(goalId);
      
      if (response.success && response.data) {
        setGoal(response.data);
        
        // Check if any steps are currently in progress
        const inProgressStep = response.data.steps?.find((step: any) => step.status === 'in_progress');
        if (inProgressStep) {
          setIsRunning(true);
          // Note: We don't have the runId here, it would be stored separately or in the step metadata
        }
        
        // Load activity logs
        loadActivityLogs();
      } else {
        setError(response.error || 'Failed to load goal details');
      }
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const loadActivityLogs = async () => {
    setLoadingActivities(true);
    
    try {
      // In a real implementation, you would fetch this from a backend API
      // For now, we'll create some sample data
      const mockActivities = [
        {
          id: '1',
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          type: 'GOAL_CREATED',
          description: 'Goal created',
          agent_id: null,
          metadata: {}
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
          type: 'AGENT_ASSIGNED',
          description: 'Agent assigned to Market Analysis step',
          agent_id: 'agent-1',
          metadata: { step_name: 'Market Analysis' }
        },
        {
          id: '3',
          timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
          type: 'STEP_STARTED',
          description: 'Market Analysis step started',
          agent_id: 'agent-1',
          metadata: { step_name: 'Market Analysis' }
        },
        {
          id: '4',
          timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
          type: 'PROGRESS_UPDATED',
          description: 'Progress updated to 10%',
          agent_id: null,
          metadata: { percentage: 10 }
        }
      ];
      
      setActivities(mockActivities);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoadingActivities(false);
    }
  };
  
  const loadAvailableAgents = async () => {
    try {
      const response = await agentService.getElizaAgents();
      
      if (response.success && response.data) {
        // Filter for active agents only
        const activeAgents = response.data.filter((agent: any) => 
          agent.status === 'active' || agent.status === 'inactive'
        );
        setAvailableAgents(activeAgents);
      }
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  };
  
  const handleAssignAgent = async () => {
    if (!selectedAgent || !selectedStep) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select both an agent and a step",
      });
      return;
    }
    
    try {
      const response = await acquisitionGoalService.assignAgentToStep(selectedStep, selectedAgent);
      
      if (response.success) {
        toast({
          title: "Agent Assigned",
          description: "Agent has been assigned to the step successfully",
        });
        
        // Close dialog and refresh data
        setIsAgentDialogOpen(false);
        loadGoalDetails();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.error || "Failed to assign agent",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "An unexpected error occurred",
      });
    }
  };
  
  const handleStartStep = async (stepId: string) => {
    try {
      const response = await acquisitionGoalService.startStepWithAgent(stepId);
      
      if (response.success) {
        toast({
          title: "Step Started",
          description: "Step execution has been started successfully",
        });
        
        // Update UI state
        setIsRunning(true);
        if (response.data?.runId) {
          setCurrentRunId(response.data.runId);
        }
        
        // Refresh goal details
        loadGoalDetails();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.error || "Failed to start step",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "An unexpected error occurred",
      });
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
      case 'in_progress':
        return 'default';
      case 'completed':
        return 'success';
      case 'failed':
        return 'destructive';
      case 'pending':
        return 'secondary';
      case 'paused':
        return 'outline';
      default:
        return 'outline';
    }
  };
  
  const getGoalProgress = () => {
    if (!goal) return 0;
    
    if (goal.trading_goal?.progress?.percentage) {
      return goal.trading_goal.progress.percentage;
    }
    
    // Calculate manually if not available
    if (goal.target_amount > 0) {
      return (goal.current_amount / goal.target_amount) * 100;
    }
    
    return 0;
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading goal details...</p>
        </div>
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
  
  if (!goal) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <XCircle className="h-12 w-12 text-muted-foreground mb-2" />
        <h3 className="text-lg font-medium">Goal Not Found</h3>
        <p className="text-muted-foreground">The requested goal could not be found.</p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => router.push('/goals')}
        >
          Return to Goals
        </Button>
      </div>
    );
  }
  
  const progressPercentage = getGoalProgress();
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{goal.trading_goal.name}</h1>
          <p className="text-muted-foreground">{goal.trading_goal.description || 'No description provided'}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant={getStatusBadgeVariant(goal.trading_goal.status)}>
            {goal.trading_goal.status.charAt(0).toUpperCase() + goal.trading_goal.status.slice(1)}
          </Badge>
          
          <Badge variant="outline" className="ml-2">
            Priority: {goal.trading_goal.priority.charAt(0).toUpperCase() + goal.trading_goal.priority.slice(1)}
          </Badge>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Acquisition Progress</CardTitle>
            <CardDescription>
              Target: {goal.target_amount} {goal.target_asset}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Current: {goal.current_amount} {goal.target_asset}</span>
                <span>{progressPercentage.toFixed(2)}%</span>
              </div>
              <Progress value={progressPercentage} />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="flex flex-col bg-secondary/50 p-4 rounded-lg">
                <span className="text-sm text-muted-foreground">Target Asset</span>
                <span className="text-lg font-medium">{goal.target_asset}</span>
              </div>
              
              <div className="flex flex-col bg-secondary/50 p-4 rounded-lg">
                <span className="text-sm text-muted-foreground">Price Range</span>
                <span className="text-lg font-medium">
                  {goal.target_price_range?.min ? `$${goal.target_price_range.min}` : 'Any'} - 
                  {goal.target_price_range?.max ? `$${goal.target_price_range.max}` : 'Any'}
                </span>
              </div>
              
              <div className="flex flex-col bg-secondary/50 p-4 rounded-lg">
                <span className="text-sm text-muted-foreground">Timeline</span>
                <span className="text-lg font-medium">
                  {goal.timeline_days ? `${goal.timeline_days} days` : 'No deadline'}
                </span>
              </div>
              
              {goal.source_assets && goal.source_assets.length > 0 && (
                <div className="flex flex-col bg-secondary/50 p-4 rounded-lg col-span-full">
                  <span className="text-sm text-muted-foreground">Source Assets</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {goal.source_assets.map((asset: string) => (
                      <Badge key={asset} variant="outline">{asset}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Created</h3>
              <p className="text-sm text-muted-foreground">
                {formatDate(goal.created_at)}
              </p>
              
              {goal.trading_goal.timeline?.target_completion_date && (
                <>
                  <h3 className="text-sm font-medium mt-4">Target Completion</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(goal.trading_goal.timeline.target_completion_date)}
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Steps & Progress</CardTitle>
            <CardDescription>
              Execution steps for this goal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {goal.steps?.map((step: any, index: number) => (
                <div 
                  key={step.id} 
                  className={`border p-3 rounded-md relative ${
                    step.status === 'in_progress' ? 'border-primary' : ''
                  }`}
                >
                  {step.status === 'in_progress' && (
                    <span className="absolute -top-2 -right-2 h-4 w-4 bg-primary rounded-full animate-pulse" />
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center h-6 w-6 rounded-full bg-muted text-xs font-medium">
                        {index + 1}
                      </div>
                      <span className="font-medium">{step.name}</span>
                    </div>
                    <Badge variant={getStatusBadgeVariant(step.status)}>
                      {step.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  {step.description && (
                    <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                  )}
                  
                  <div className="mt-2 pt-2 border-t flex justify-between items-center">
                    <div className="flex items-center">
                      {step.assigned_agent_id ? (
                        <div className="flex items-center gap-1 text-xs">
                          <Bot className="h-3 w-3" />
                          <span>
                            {availableAgents.find((a) => a.id === step.assigned_agent_id)?.name || 'Agent'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No agent assigned</span>
                      )}
                    </div>
                    
                    <div className="flex gap-1">
                      {step.status === 'pending' && step.assigned_agent_id && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-7 px-2"
                          onClick={() => handleStartStep(step.id)}
                        >
                          <Play className="h-3 w-3" />
                          <span className="ml-1">Start</span>
                        </Button>
                      )}
                      
                      {step.status === 'in_progress' && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-7 px-2"
                          disabled={true}
                        >
                          <Square className="h-3 w-3" />
                          <span className="ml-1">Stop</span>
                        </Button>
                      )}
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-7 w-7 p-0"
                          >
                            <Settings className="h-3 w-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{step.name}</DialogTitle>
                            <DialogDescription>
                              Manage this goal step
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium">Current Status</h4>
                              <p className="text-sm text-muted-foreground">
                                {step.status.replace('_', ' ')}
                              </p>
                            </div>
                            
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium">Assigned Agent</h4>
                              {step.assigned_agent_id ? (
                                <div className="p-2 border rounded-md flex items-center gap-2">
                                  <Bot className="h-4 w-4 text-primary" />
                                  <div>
                                    <p className="text-sm font-medium">
                                      {availableAgents.find((a) => a.id === step.assigned_agent_id)?.name || 'Unknown Agent'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">ID: {step.assigned_agent_id}</p>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">No agent assigned</p>
                              )}
                            </div>
                            
                            <Button 
                              variant="outline" 
                              className="w-full"
                              onClick={() => {
                                setSelectedStep(step.id);
                                setSelectedAgent(step.assigned_agent_id || null);
                                setIsAgentDialogOpen(true);
                              }}
                            >
                              {step.assigned_agent_id ? 'Change Agent' : 'Assign Agent'}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              ))}
              
              {(!goal.steps || goal.steps.length === 0) && (
                <div className="text-center p-4 border rounded-md">
                  <p className="text-muted-foreground">No steps defined for this goal</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="activity">
        <TabsList>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>
                Recent activity for this acquisition goal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-4">
                  {activities.length > 0 ? (
                    activities.map((activity) => (
                      <div key={activity.id} className="flex gap-4 pb-4 last:pb-0 border-b last:border-b-0">
                        <div className="flex-shrink-0 flex flex-col items-center">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            {activity.type === 'GOAL_CREATED' && <Target className="h-5 w-5 text-primary" />}
                            {activity.type === 'AGENT_ASSIGNED' && <Bot className="h-5 w-5 text-primary" />}
                            {activity.type === 'STEP_STARTED' && <Play className="h-5 w-5 text-primary" />}
                            {activity.type === 'PROGRESS_UPDATED' && <Activity className="h-5 w-5 text-primary" />}
                          </div>
                          <div className="w-px h-full bg-border mt-2" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h4 className="text-sm font-medium">{activity.description}</h4>
                            <p className="text-xs text-muted-foreground">{formatDate(activity.timestamp)}</p>
                          </div>
                          
                          {activity.agent_id && (
                            <div className="mt-1 text-xs flex items-center gap-1 text-muted-foreground">
                              <Bot className="h-3 w-3" />
                              <span>
                                {availableAgents.find((a) => a.id === activity.agent_id)?.name || 'Agent'}
                              </span>
                            </div>
                          )}
                          
                          {activity.type === 'PROGRESS_UPDATED' && (
                            <div className="mt-2">
                              <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary rounded-full" 
                                  style={{ width: `${activity.metadata.percentage}%` }}
                                />
                              </div>
                              <p className="text-xs text-right mt-1">{activity.metadata.percentage}%</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center p-4">
                      <p className="text-muted-foreground">No activity records found</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Goal Analytics</CardTitle>
              <CardDescription>
                Performance metrics and analytics for this goal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-[300px]">
                <div className="text-center">
                  <BarChart className="h-10 w-10 text-muted-foreground mx-auto" />
                  <p className="mt-2 text-muted-foreground">Analytics will be available once execution begins</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Goal Settings</CardTitle>
              <CardDescription>
                Manage settings for this acquisition goal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Danger Zone</h3>
                  <p className="text-sm text-muted-foreground">
                    These actions cannot be undone.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-2 mt-2">
                    <Button variant="outline" disabled={isRunning}>
                      Reset Progress
                    </Button>
                    <Button variant="destructive" disabled={isRunning}>
                      Delete Goal
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Agent Assignment Dialog */}
      <Dialog open={isAgentDialogOpen} onOpenChange={setIsAgentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign ElizaOS Agent</DialogTitle>
            <DialogDescription>
              Select an agent to assign to this goal step
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {availableAgents.length === 0 ? (
                <div className="text-center p-4 border rounded-md">
                  <Bot className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">No agents available</p>
                </div>
              ) : (
                availableAgents.map((agent) => (
                  <div 
                    key={agent.id}
                    className={`p-3 border rounded-md flex items-center gap-3 cursor-pointer hover:bg-accent/50 ${
                      selectedAgent === agent.id ? 'bg-primary/10 border-primary/30' : ''
                    }`}
                    onClick={() => setSelectedAgent(agent.id)}
                  >
                    <div className={`h-2 w-2 rounded-full ${
                      agent.status === 'active' ? 'bg-green-500' : 'bg-gray-500'
                    }`} />
                    <div className="flex-1">
                      <p className="font-medium">{agent.name}</p>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {agent.description || `ElizaOS ${agent.model} Agent`}
                      </p>
                    </div>
                    <input 
                      type="radio" 
                      checked={selectedAgent === agent.id}
                      onChange={() => {}}
                      className="h-4 w-4"
                    />
                  </div>
                ))
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAgentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignAgent} disabled={!selectedAgent}>
              Assign Agent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
