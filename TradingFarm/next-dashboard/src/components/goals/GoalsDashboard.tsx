'use client';

/**
 * Goals Dashboard Component
 * Displays and manages all trading goals
 */
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, Filter, Target, Calendar, PlusCircle, 
  ChevronRight, Clock, AlertCircle, RefreshCw, Bot, 
  TrendingUp, BarChart4, Briefcase
} from 'lucide-react';

import { TradingEventEmitter, TRADING_EVENTS } from '@/utils/events/trading-events';
import { acquisitionGoalService } from '@/services/acquisition-goal-service';

interface GoalsDashboardProps {
  farmId?: string;
}

export function GoalsDashboard({ farmId }: GoalsDashboardProps) {
  // State for goals
  type Agent = { id: string; name: string; status: 'active' | 'paused' | 'unknown' };
  type TradingGoal = {
    id: string;
    name: string;
    description?: string;
    farm_id?: string;
    status: string;
    goal_type: string;
    priority?: string;
    progress?: { percentage: number; current_amount?: number; last_update?: string };
  };
  type Goal = {
    goal_id: string;
    trading_goal: TradingGoal;
    assigned_agent_ids?: string[];
    assigned_agents?: Agent[];
    current_amount?: number;
    target_amount: number;
    target_asset: string;
    created_at: string;
  };
  const [goals, setGoals] = useState<Goal[]>([]);
  const [filteredGoals, setFilteredGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [detailOpen, setDetailOpen] = useState<boolean>(false);

  // Fetch assigned agents for each goal (simulate, adapt to your backend)
  useEffect(() => {
    if (!goals.length) return;
    // Example: fetch agent info for each goal's assigned_agent_ids
    // Replace with real API call as needed
    setGoals(prevGoals => prevGoals.map(goal => ({
      ...goal,
      assigned_agents: (goal.assigned_agent_ids || []).map((id: string, i: number) => ({
        id,
        name: `Agent ${id}`,
        status: i % 2 === 0 ? 'active' : 'paused', // Simulate status
      }))
    })));
  }, [goals.length]);

  // Handler: Edit Goal
  const handleEditGoal = (goal: Goal) => {
    toast({ title: 'Edit Goal', description: `Would open edit dialog for ${goal.trading_goal.name}` });
    // TODO: Implement edit logic/modal
  };

  // Handler: Pause/Resume Goal
  const handlePauseResumeGoal = async (goal: Goal) => {
    try {
      // Simulate status toggle, replace with real API call
      setGoals((prevGoals: Goal[]) =>
        prevGoals.map((g: Goal) =>
          g.goal_id === goal.goal_id
            ? {
                ...g,
                trading_goal: {
                  ...g.trading_goal,
                  status: g.trading_goal.status === 'paused' ? 'active' : 'paused',
                },
              }
            : g
        )
      );
      toast({ title: `${goal.trading_goal.status === 'paused' ? 'Resumed' : 'Paused'} Goal`, description: goal.trading_goal.name });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to pause/resume goal', variant: 'destructive' });
    }
  };

  // Handler: Delete Goal
  const handleDeleteGoal = async (goal: Goal) => {
    try {
      setGoals((prevGoals: Goal[]) => prevGoals.filter((g: Goal) => g.goal_id !== goal.goal_id));
      toast({ title: 'Deleted Goal', description: goal.trading_goal.name });
      setDetailOpen(false);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to delete goal', variant: 'destructive' });
    }
  };

  // Filters and search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  
  useEffect(() => {
    loadGoals();
    
    // Subscribe to goal events
    const goalCreatedSubscription = TradingEventEmitter.on(
      TRADING_EVENTS.GOAL_CREATED,
      handleGoalCreated
    );
    
    const goalProgressSubscription = TradingEventEmitter.on(
      TRADING_EVENTS.GOAL_PROGRESS_UPDATED,
      handleGoalProgressUpdated
    );
    
    return () => {
      goalCreatedSubscription.off();
      goalProgressSubscription.off();
    };
  }, []);
  
  useEffect(() => {
    applyFilters();
  }, [goals, searchQuery, statusFilter, typeFilter, priorityFilter]);
  
  const handleGoalCreated = () => {
    // Refresh goals when a new one is created
    loadGoals();
  };
  
  type GoalProgressData = { goalId: string; currentAmount: number; percentage: number; timestamp: string };
  const handleGoalProgressUpdated = (data: GoalProgressData) => {
    setGoals((prevGoals: Goal[]) => {
      return prevGoals.map((goal: Goal) => {
        if (goal.trading_goal.id === data.goalId) {
          return {
            ...goal,
            current_amount: data.currentAmount,
            trading_goal: {
              ...goal.trading_goal,
              progress: {
                ...goal.trading_goal.progress,
                current_amount: data.currentAmount,
                percentage: data.percentage,
                last_update: data.timestamp
              }
            }
          };
        }
        return goal;
      });
    });
  };
  
  const loadGoals = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await acquisitionGoalService.getAcquisitionGoals();
      
      if (response.success && response.data) {
        let goalsData = response.data;
        if (farmId) {
          goalsData = goalsData.filter((goal: any) => goal.trading_goal.farm_id === farmId);
        }
        setGoals(goalsData);
        setFilteredGoals(goalsData);
      } else {
        setError(response.error || 'Failed to load goals');
      }
    } catch (error: any) {
      console.error('Error loading goals:', error);
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const applyFilters = (): void => {
    let filtered = [...goals];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((goal: Goal) => 
        goal.trading_goal.name.toLowerCase().includes(query) ||
        (goal.trading_goal.description && goal.trading_goal.description.toLowerCase().includes(query)) ||
        goal.target_asset.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((goal: Goal) => goal.trading_goal.status === statusFilter);
    }
    
    // Apply type filter (currently all are acquisition, but prepared for future types)
    if (typeFilter !== 'all') {
      filtered = filtered.filter((goal: Goal) => goal.trading_goal.goal_type === typeFilter);
    }
    
    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter((goal: Goal) => goal.trading_goal.priority === priorityFilter);
    }
    
    setFilteredGoals(filtered);
  };
  
  const getStatusBadgeVariant = (status: string): 'default' | 'destructive' | 'secondary' | 'outline' => {
    switch (status) {
      case 'active':
      case 'in_progress':
      case 'completed':
        return 'default';
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
  
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  const getGoalIcon = (goalType: string): React.ReactNode => {
    switch (goalType) {
      case 'acquisition':
        return <Badge className="bg-green-500" variant="default">Online</Badge>;
      case 'profit':
        return <TrendingUp className="h-4 w-4" />;
      case 'portfolio':
        return <BarChart4 className="h-4 w-4" />;
      case 'risk_management':
        return <Briefcase className="h-4 w-4" />;
      default:
        return <Badge className="bg-green-500" variant="default">Online</Badge>;
    }
  };
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-[150px]" />
            <Skeleton className="h-10 w-[120px]" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between mb-4">
              <Skeleton className="h-10 w-[250px]" />
              <Skeleton className="h-10 w-[150px]" />
            </div>
            
            <Skeleton className="h-[72px] w-full" />
            <Skeleton className="h-[72px] w-full" />
            <Skeleton className="h-[72px] w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>All Trading Goals</CardTitle>
            <CardDescription>
              {filteredGoals.length} goal{filteredGoals.length !== 1 ? 's' : ''} found
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={loadGoals}
              className="flex items-center gap-1"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </Button>
            
            <Link href="/goals/create">
              <Button 
                size="sm"
                className="flex items-center gap-1"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>New Goal</span>
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search goals..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap sm:flex-nowrap gap-2">
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-full sm:w-[120px]">
                  <div className="flex items-center gap-2">
                    <span>Status</span>
                    {statusFilter !== 'all' && (
                      <Badge variant="secondary" className="ml-auto mr-2">1</Badge>
                    )}
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              
              <Select
                value={typeFilter}
                onValueChange={setTypeFilter}
              >
                <SelectTrigger className="w-full sm:w-[120px]">
                  <div className="flex items-center gap-2">
                    <span>Type</span>
                    {typeFilter !== 'all' && (
                      <Badge variant="secondary" className="ml-auto mr-2">1</Badge>
                    )}
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="acquisition">Acquisition</SelectItem>
                  <SelectItem value="profit">Profit</SelectItem>
                  <SelectItem value="portfolio">Portfolio</SelectItem>
                  <SelectItem value="risk_management">Risk Mgmt</SelectItem>
                </SelectContent>
              </Select>
              
              <Select
                value={priorityFilter}
                onValueChange={setPriorityFilter}
              >
                <SelectTrigger className="w-full sm:w-[120px]">
                  <div className="flex items-center gap-2">
                    <span>Priority</span>
                    {priorityFilter !== 'all' && (
                      <Badge variant="secondary" className="ml-auto mr-2">1</Badge>
                    )}
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-4 pr-3">
            {filteredGoals.length > 0 ? (
              filteredGoals.map((goal: Goal) => (
                <div
                  key={goal.goal_id}
                  className="block"
                >
                  <div
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => { setSelectedGoal(goal); setDetailOpen(true); }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                          {getGoalIcon(goal.trading_goal.goal_type)}
                        </div>
                        <div>
                          <h3 className="font-medium">{goal.trading_goal.name}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {goal.trading_goal.description || `Acquire ${goal.target_amount} ${goal.target_asset}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2 sm:mt-0">
                        <Badge variant={getStatusBadgeVariant(goal.trading_goal.status) as "default" | "destructive" | "secondary" | "outline" | undefined}>
                          {goal.trading_goal.status.charAt(0).toUpperCase() + goal.trading_goal.status.slice(1)}
                        </Badge>
                        <Badge variant="outline">{goal.target_asset}</Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(goal.created_at)}</span>
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <div className="flex items-center gap-1">
                          <Target className="h-3.5 w-3.5 text-primary" />
                          <span>
                            {goal.current_amount} / {goal.target_amount} {goal.target_asset}
                          </span>
                        </div>
                      </div>
                      <Progress value={goal.trading_goal.progress?.percentage || 0} className="h-2 w-full mt-2" />
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 p-0"
                          onClick={e => { e.stopPropagation(); handleEditGoal(goal); }}
                          title="Edit"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536M9 13h3l8-8a2.828 2.828 0 00-4-4l-8 8v3zm0 0v3h3" /></svg>
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 p-0"
                          onClick={e => { e.stopPropagation(); handlePauseResumeGoal(goal); }}
                          title={goal.trading_goal.status === 'paused' ? 'Resume' : 'Pause'}
                        >
                          {goal.trading_goal.status === 'paused' ? (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                          ) : (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10 9v6m4-6v6" /></svg>
                          )}
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-7 w-7 p-0"
                          onClick={e => { e.stopPropagation(); handleDeleteGoal(goal); }}
                          title="Delete"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center border rounded-lg py-16">
                <Target className="h-12 w-12 text-muted-foreground mb-3" />
                <h3 className="text-lg font-medium">No goals found</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-6">
                  {goals.length > 0 
                    ? 'Try adjusting your filters to see more results.' 
                    : 'Create your first trading goal to get started.'}
                </p>
                <Link href="/goals/create">
                  <Button className="flex items-center gap-2">
                    <PlusCircle className="h-4 w-4" />
                    <span>Create Goal</span>
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
