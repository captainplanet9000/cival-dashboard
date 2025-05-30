"use client";

import * as React from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Target, CheckCircle, Clock, ArchiveIcon, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import CreateGoalModal from '@/components/goals/CreateGoalModal';

// Mock hook for goals
function useGoals(farmId: string) {
  // This would be replaced with actual API calls
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  // Mock data
  const goals = [
    {
      id: 'goal-1',
      name: 'Weekly ROI Target',
      description: 'Achieve 3% ROI by end of week',
      type: 'ROI',
      target: 3,
      progress: 2.1,
      status: 'in-progress',
      farm_id: farmId,
      created_at: new Date().toISOString(),
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'goal-2',
      name: 'Monthly Profit',
      description: 'Reach $5000 profit by month end',
      type: 'Profit',
      target: 5000,
      progress: 5000,
      status: 'completed',
      farm_id: farmId,
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    },
    {
      id: 'goal-3',
      name: 'Trade Volume',
      description: 'Complete 500 trades',
      type: 'Volume',
      target: 500,
      progress: 120,
      status: 'in-progress',
      farm_id: farmId,
      created_at: new Date().toISOString(),
    },
    {
      id: 'goal-4',
      name: 'Old Goal',
      description: 'Previous trading goal',
      type: 'Custom',
      status: 'archived',
      farm_id: farmId,
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      archived_at: new Date().toISOString(),
    }
  ];
  
  const activeGoals = goals.filter(goal => goal.status === 'in-progress');
  const completedGoals = goals.filter(goal => goal.status === 'completed');
  const archivedGoals = goals.filter(goal => goal.status === 'archived');
  
  const refresh = () => {
    // This would refetch the data
    console.log('Refreshing goals');
  };
  
  return {
    goals,
    activeGoals,
    completedGoals,
    archivedGoals,
    counts: {
      total: goals.length,
      active: activeGoals.length,
      completed: completedGoals.length,
      archived: archivedGoals.length
    },
    loading,
    error,
    refresh
  };
}

export default function FarmGoalsPage() {
  const params = useParams();
  const farmId = params.id as string;
  
  const { 
    goals, 
    activeGoals, 
    completedGoals, 
    archivedGoals, 
    counts, 
    loading, 
    error, 
    refresh 
  } = useGoals(farmId);
  
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  
  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-10 w-32" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
        <CreateGoalModal 
          isOpen={showCreateModal} 
          onClose={() => setShowCreateModal(false)} 
          farmId={farmId} 
          onSuccess={refresh}
        />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="rounded-md bg-destructive/15 p-4">
        <div className="text-sm font-medium text-destructive">Error loading goals</div>
        <div className="mt-2 text-sm text-destructive/80">{error}</div>
        <Button variant="outline" size="sm" onClick={() => refresh()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Trading Goals</CardTitle>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-2 h-4 w-4" /> New Goal
            </Button>
          </div>
          <CardDescription>
            Set and manage performance goals for this farm's trading operation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">{counts.total}</CardTitle>
                <CardDescription>Total Goals</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">{counts.active}</CardTitle>
                <CardDescription>Active Goals</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">{counts.completed}</CardTitle>
                <CardDescription>Completed</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">{counts.archived}</CardTitle>
                <CardDescription>Archived</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <Tabs defaultValue="active" className="w-full">
            <TabsList>
              <TabsTrigger value="active">Active ({counts.active})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({counts.completed})</TabsTrigger>
              <TabsTrigger value="archived">Archived ({counts.archived})</TabsTrigger>
              <TabsTrigger value="new">+ New Goal</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <TabsContent value="active" className="mt-0">
            <GoalList goals={activeGoals} farmId={farmId} onRefresh={refresh} />
          </TabsContent>
          <TabsContent value="completed" className="mt-0">
            <GoalList goals={completedGoals} farmId={farmId} onRefresh={refresh} />
          </TabsContent>
          <TabsContent value="archived" className="mt-0">
            <GoalList goals={archivedGoals} farmId={farmId} onRefresh={refresh} />
          </TabsContent>
          <TabsContent value="new" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Create New Goal</CardTitle>
                <CardDescription>
                  Define a new trading goal for this farm
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* This would be a form to create a new goal */}
                <p className="text-muted-foreground">Goal creation form would go here.</p>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => {}}>Cancel</Button>
                <Button onClick={() => {}}>Create Goal</Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </CardContent>
      </Card>
    </div>
  );
}

interface GoalListProps {
  goals: any[];
  farmId: string;
  onRefresh: () => void;
}

function GoalList({ goals, farmId, onRefresh }: GoalListProps) {
  if (!goals.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No goals found in this category.
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {goals.map((goal) => (
        <Card key={goal.id} className="overflow-hidden">
          <div className="flex flex-col p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <Target className="h-5 w-5 mr-2 text-primary" />
                <h3 className="font-medium">{goal.name}</h3>
              </div>
              <Badge variant={
                goal.status === 'completed' ? "success" : 
                goal.status === 'archived' ? "outline" : 
                "default"
              }>
                {goal.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                {goal.status === 'in-progress' && <Clock className="h-3 w-3 mr-1" />}
                {goal.status === 'archived' && <ArchiveIcon className="h-3 w-3 mr-1" />}
                {goal.status === 'completed' ? 'Completed' : 
                 goal.status === 'in-progress' ? 'In Progress' : 
                 'Archived'}
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground mb-3">{goal.description}</p>
            
            {goal.progress !== undefined && goal.target !== undefined && (
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{Math.round((goal.progress / goal.target) * 100)}%</span>
                </div>
                <Progress value={(goal.progress / goal.target) * 100} className="h-2" />
              </div>
            )}
            
            <div className="flex items-center justify-between text-sm text-muted-foreground mt-2">
              <div>Type: {goal.type}</div>
              {goal.deadline && (
                <div>Deadline: {new Date(goal.deadline).toLocaleDateString()}</div>
              )}
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  window.location.href = `/dashboard/farms/${farmId}/goals/${goal.id}`;
                }}
              >
                View Details
              </Button>
              
              {goal.status === 'in-progress' && (
                <Button variant="default" className="w-full bg-green-600 hover:bg-green-700" disabled>
                  <ArchiveIcon className="h-4 w-4 mr-1" /> Archive
                </Button>
              )}
              
              {goal.status === 'archived' && (
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
