'use client';

/**
 * Goals Dashboard Component
 * Displays and manages all trading goals
 */
import { useState, useEffect } from 'react';
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

export function GoalsDashboard() {
  // State for goals
  const [goals, setGoals] = useState<any[]>([]);
  const [filteredGoals, setFilteredGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters and search
  const [searchQuery, setSearchQuery] = useState('');
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
  
  const handleGoalProgressUpdated = (data: any) => {
    // Update the specific goal's progress
    setGoals(prevGoals => {
      return prevGoals.map(goal => {
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
  
  const loadGoals = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await acquisitionGoalService.getAcquisitionGoals();
      
      if (response.success && response.data) {
        setGoals(response.data);
        setFilteredGoals(response.data);
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
  
  const applyFilters = () => {
    let filtered = [...goals];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(goal => 
        goal.trading_goal.name.toLowerCase().includes(query) ||
        (goal.trading_goal.description && goal.trading_goal.description.toLowerCase().includes(query)) ||
        goal.target_asset.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(goal => goal.trading_goal.status === statusFilter);
    }
    
    // Apply type filter (currently all are acquisition, but prepared for future types)
    if (typeFilter !== 'all') {
      filtered = filtered.filter(goal => goal.trading_goal.goal_type === typeFilter);
    }
    
    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(goal => goal.trading_goal.priority === priorityFilter);
    }
    
    setFilteredGoals(filtered);
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
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  const getGoalIcon = (goalType: string) => {
    switch (goalType) {
      case 'acquisition':
        return <Target className="h-4 w-4" />;
      case 'profit':
        return <TrendingUp className="h-4 w-4" />;
      case 'portfolio':
        return <BarChart4 className="h-4 w-4" />;
      case 'risk_management':
        return <Briefcase className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
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
          
          <ScrollArea className="h-[calc(100vh-320px)] min-h-[400px]">
            <div className="space-y-4 pr-3">
              {filteredGoals.length > 0 ? (
                filteredGoals.map((goal) => (
                  <Link 
                    key={goal.goal_id}
                    href={`/goals/${goal.goal_id}`} 
                    className="block"
                  >
                    <div className="border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                            {getGoalIcon(goal.trading_goal.goal_type)}
                          </div>
                          
                          <div>
                            <h3 className="font-medium">{goal.trading_goal.name}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {goal.trading_goal.description || 
                                `Acquire ${goal.target_amount} ${goal.target_asset}`}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2 sm:mt-0">
                          <Badge variant={getStatusBadgeVariant(goal.trading_goal.status)}>
                            {goal.trading_goal.status.charAt(0).toUpperCase() + goal.trading_goal.status.slice(1)}
                          </Badge>
                          
                          <Badge variant="outline">
                            {goal.target_asset}
                          </Badge>
                          
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
                          
                          <span>
                            {goal.trading_goal.progress?.percentage?.toFixed(2) || '0.00'}%
                          </span>
                        </div>
                        
                        <Progress 
                          value={goal.trading_goal.progress?.percentage || 0} 
                          className="h-2 w-full"
                        />
                      </div>
                      
                      <div className="mt-4 pt-3 border-t flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Bot className="h-3 w-3" />
                            <span>
                              {(goal.execution_parameters?.selectedAgentIds?.length || 0) > 0
                                ? `${goal.execution_parameters.selectedAgentIds.length} agents assigned`
                                : 'No agents assigned'}
                            </span>
                          </div>
                        </div>
                        
                        <div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 rounded-full"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Link>
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
                  {goals.length === 0 && (
                    <Link href="/goals/create">
                      <Button className="flex items-center gap-2">
                        <PlusCircle className="h-4 w-4" />
                        <span>Create Goal</span>
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
