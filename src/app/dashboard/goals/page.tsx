'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Target, Plus, Filter, Calendar, ChevronRight, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { createBrowserClient } from '@/utils/supabase/client';
import { ExtendedGoal, GoalFilters, GoalStatus, GoalType } from '@/types/goals';
import GoalCreationForm from '@/components/goals/GoalCreationForm';
import GoalCard from '@/components/goals/GoalCard';
import GoalStatusDisplay from '@/components/goals/GoalStatusDisplay';

export default function GoalsPage() {
  const [goals, setGoals] = useState<ExtendedGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [filters, setFilters] = useState<GoalFilters>({
    status: undefined,
    goalType: undefined,
    includeArchived: false,
    includeCompleted: true,
    searchQuery: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchGoals();
  }, [activeTab, filters]);

  async function fetchGoals() {
    try {
      setLoading(true);
      const supabase = createBrowserClient();
      
      // Build query parameters
      const params = new URLSearchParams();
      
      if (activeTab === 'archived') {
        params.set('includeArchived', 'true');
        params.set('includeCompleted', 'true');
      } else if (activeTab === 'completed') {
        params.set('status', 'completed');
      } else {
        // Active tab
        params.set('includeCompleted', filters.includeCompleted ? 'true' : 'false');
      }
      
      if (filters.status) {
        params.set('status', filters.status[0]);
      }
      
      if (filters.goalType) {
        params.set('goalType', filters.goalType[0]);
      }
      
      if (filters.farmId) {
        params.set('farmId', filters.farmId);
      }
      
      if (filters.agentId) {
        params.set('agentId', filters.agentId);
      }
      
      // Fetch goals from API
      const response = await fetch(`/api/goals?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch goals');
      }
      
      const data = await response.json();
      setGoals(data || []);
    } catch (error) {
      console.error('Error fetching goals:', error);
      toast({
        title: 'Error',
        description: 'Failed to load goals. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  const handleCreateGoal = (newGoal: ExtendedGoal) => {
    setGoals([newGoal, ...goals]);
    setActiveTab('active');
    toast({
      title: 'Goal Created',
      description: 'Your new goal has been created successfully.',
    });
  };

  const handleUpdateGoal = (updatedGoal: ExtendedGoal) => {
    setGoals(goals.map(goal => goal.id === updatedGoal.id ? updatedGoal : goal));
    toast({
      title: 'Goal Updated',
      description: 'Your goal has been updated successfully.',
    });
  };

  const handleFilterChange = (key: keyof GoalFilters, value: any) => {
    setFilters({ ...filters, [key]: value });
  };

  const getGoalStats = () => {
    const totalGoals = goals.length;
    const completedGoals = goals.filter(goal => goal.status === 'completed').length;
    const inProgressGoals = goals.filter(goal => goal.status === 'in_progress').length;
    const notStartedGoals = goals.filter(goal => goal.status === 'not_started').length;
    const missedGoals = goals.filter(goal => goal.status === 'missed').length;
    
    return {
      totalGoals,
      completedGoals,
      inProgressGoals,
      notStartedGoals,
      missedGoals,
      completionRate: totalGoals ? Math.round((completedGoals / totalGoals) * 100) : 0
    };
  };

  const renderGoalCards = () => {
    if (loading) {
      return Array(3).fill(0).map((_, index) => (
        <Card key={index} className="mb-4">
          <CardHeader className="pb-2">
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-3 w-full mb-4" />
            <Skeleton className="h-2 w-full mb-2" />
            <div className="flex gap-2 mt-4">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-16" />
            </div>
          </CardContent>
        </Card>
      ));
    }

    if (goals.length === 0) {
      return (
        <Card className="bg-gray-50 border-dashed">
          <CardContent className="pt-6 pb-6 flex flex-col items-center justify-center">
            <Target className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-1">No goals found</h3>
            <p className="text-sm text-gray-500 mb-4">
              {activeTab === 'active' 
                ? "You don't have any active goals yet." 
                : activeTab === 'completed' 
                  ? "You haven't completed any goals yet."
                  : "You don't have any archived goals."}
            </p>
            {activeTab === 'active' && (
              <Button onClick={() => setActiveTab('new')}>
                <Plus className="mr-2 h-4 w-4" />
                Create a Goal
              </Button>
            )}
          </CardContent>
        </Card>
      );
    }

    return goals.map(goal => (
      <GoalCard 
        key={goal.id} 
        goal={goal}
        onUpdate={handleUpdateGoal}
      />
    ));
  };

  const stats = getGoalStats();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Goals</h2>
          <p className="text-muted-foreground">
            Track and manage your trading objectives
          </p>
        </div>
        <Button onClick={() => setActiveTab('new')}>
          <Plus className="mr-2 h-4 w-4" />
          Create Goal
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalGoals}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.completionRate}% completed
            </p>
            <Progress value={stats.completionRate} className="h-1 mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgressGoals}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <RefreshCw className="h-3 w-3 mr-1" />
              Active goals
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedGoals}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <ArrowUp className="h-3 w-3 mr-1 text-green-500" />
              Reached targets
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Not Started</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.notStartedGoals}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <Calendar className="h-3 w-3 mr-1" />
              Pending goals
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
            <TabsTrigger value="new">New Goal</TabsTrigger>
          </TabsList>
          
          {activeTab !== 'new' && (
            <Button variant="outline" size="sm" onClick={fetchGoals}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          )}
        </div>
        
        <TabsContent value="active" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="md:w-1/3">
              <Label htmlFor="goalTypeFilter">Goal Type</Label>
              <Select 
                value={filters.goalType ? filters.goalType[0] : 'all'} 
                onValueChange={(value) => handleFilterChange('goalType', value === 'all' ? undefined : [value as GoalType])}
              >
                <SelectTrigger id="goalTypeFilter">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="profit">Profit</SelectItem>
                  <SelectItem value="roi">ROI</SelectItem>
                  <SelectItem value="trade_count">Trade Count</SelectItem>
                  <SelectItem value="win_rate">Win Rate</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="md:w-1/3">
              <Label htmlFor="statusFilter">Status</Label>
              <Select 
                value={filters.status ? filters.status[0] : 'all'} 
                onValueChange={(value) => handleFilterChange('status', value === 'all' ? undefined : [value as GoalStatus])}
              >
                <SelectTrigger id="statusFilter">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="missed">Missed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="md:w-1/3">
              <Label htmlFor="searchFilter">Search</Label>
              <Input
                id="searchFilter"
                placeholder="Search goals..."
                value={filters.searchQuery || ''}
                onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-4">
            {renderGoalCards()}
          </div>
        </TabsContent>
        
        <TabsContent value="completed" className="space-y-4">
          <div className="space-y-4">
            {renderGoalCards()}
          </div>
        </TabsContent>
        
        <TabsContent value="archived" className="space-y-4">
          <div className="space-y-4">
            {renderGoalCards()}
          </div>
        </TabsContent>
        
        <TabsContent value="new">
          <GoalCreationForm onGoalCreated={handleCreateGoal} />
        </TabsContent>
      </Tabs>
    </div>
  );
} 