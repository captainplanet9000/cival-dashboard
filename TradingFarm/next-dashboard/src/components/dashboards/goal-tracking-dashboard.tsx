'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GoalProgressChart } from '@/components/charts/goal-progress-chart';
import { DataTable } from '@/components/tables/data-table';
import { Badge } from '@/components/ui/badge';
import { Calendar, RefreshCw, CheckCircle2, Clock, Target } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { 
  formatDate, 
  formatDeadline, 
  getTimeDescription,
  formatRelativeDate 
} from '@/utils/date-utils';
import { Progress } from '@/components/ui/progress';

// Goal data interface
interface Goal {
  id: string | number;
  name: string;
  description?: string;
  target_amount: number;
  current_amount: number;
  target_date?: string | null;
  status: 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'FAILED' | string;
  farm_id?: string | number;
  farm_name?: string;
  progress_percentage: number;
  created_at: string;
  updated_at: string;
}

// Agent data interface
interface Agent {
  id: string | number;
  name: string;
  allocation_percentage: number;
  goal_id: string | number;
  farm_id?: string | number;
  status: 'ACTIVE' | 'PAUSED' | string;
}

// Progress update interface
interface ProgressUpdate {
  id: string | number;
  goal_id: string | number;
  amount_change: number;
  notes?: string;
  update_date: string;
  created_at: string;
}

// Dashboard props interface
interface GoalTrackingDashboardProps {
  goals: Goal[];
  agents?: Agent[];
  progressUpdates?: ProgressUpdate[];
  className?: string;
  isLoading?: boolean;
  onGoalChange?: (goalId: string | number) => void;
  onRefreshData?: () => void;
  onAddProgressUpdate?: (goalId: string | number) => void;
  onEditGoal?: (goalId: string | number) => void;
}

/**
 * Goal Tracking Dashboard component
 * Provides a comprehensive view of goal progress, agent assignments, and recent updates
 */
export function GoalTrackingDashboard({
  goals,
  agents = [],
  progressUpdates = [],
  className = '',
  isLoading = false,
  onGoalChange,
  onRefreshData,
  onAddProgressUpdate,
  onEditGoal,
}: GoalTrackingDashboardProps) {
  // State for the selected goal
  const [selectedGoalId, setSelectedGoalId] = useState<string | number | undefined>(
    goals.length > 0 ? goals[0].id : undefined
  );
  
  // Find the selected goal
  const selectedGoal = goals.find(goal => goal.id === selectedGoalId);
  
  // Filter agents and progress updates for the selected goal
  const goalAgents = agents.filter(agent => agent.goal_id === selectedGoalId);
  const goalProgressUpdates = progressUpdates
    .filter(update => update.goal_id === selectedGoalId)
    .sort((a, b) => new Date(b.update_date).getTime() - new Date(a.update_date).getTime());
  
  // Function to handle goal change
  const handleGoalChange = (goalId: string) => {
    setSelectedGoalId(goalId);
    if (onGoalChange) {
      onGoalChange(goalId);
    }
  };
  
  // Handle refresh button click
  const handleRefresh = () => {
    if (onRefreshData) {
      onRefreshData();
    }
  };
  
  // Calculate overall stats
  const activeGoals = goals.filter(goal => goal.status === 'ACTIVE').length;
  const completedGoals = goals.filter(goal => goal.status === 'COMPLETED').length;
  const overdueGoals = goals.filter(goal => {
    if (!goal.target_date || goal.status !== 'ACTIVE') return false;
    return new Date(goal.target_date) < new Date();
  }).length;
  
  // Calculate average progress percentage
  const averageProgress = goals.length > 0
    ? goals.reduce((sum, goal) => sum + goal.progress_percentage, 0) / goals.length
    : 0;
  
  // Agent columns for the data table
  const agentColumns: ColumnDef<Agent>[] = [
    {
      accessorKey: 'name',
      header: 'Agent Name',
    },
    {
      accessorKey: 'allocation_percentage',
      header: 'Allocation',
      cell: ({ row }) => (
        <div>{`${row.original.allocation_percentage}%`}</div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <Badge className={status === 'ACTIVE' ? 'bg-green-500' : 'bg-amber-500'}>
            {status}
          </Badge>
        );
      },
    },
  ];
  
  // Progress update columns for the data table
  const progressUpdateColumns: ColumnDef<ProgressUpdate>[] = [
    {
      accessorKey: 'update_date',
      header: 'Date',
      cell: ({ row }) => (
        <div className="text-sm">
          {formatDate(row.original.update_date, 'MMM d, yyyy')}
          <div className="text-xs text-muted-foreground">
            {formatDate(row.original.update_date, 'h:mm a')}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'amount_change',
      header: 'Amount Change',
      cell: ({ row }) => {
        const amount = row.original.amount_change;
        const isPositive = amount >= 0;
        
        return (
          <div className={`font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {isPositive ? '+' : ''}
            {amount.toLocaleString('en-US', {
              style: 'currency',
              currency: 'USD',
            })}
          </div>
        );
      },
    },
    {
      accessorKey: 'notes',
      header: 'Notes',
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate" title={row.original.notes}>
          {row.original.notes || '-'}
        </div>
      ),
    },
  ];

  // Early return if no data is available
  if (goals.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center h-64">
            <p className="text-xl font-semibold mb-2">No goals available</p>
            <p className="text-muted-foreground">Create a goal to track progress</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Dashboard header with controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Goal Tracking</h1>
          <p className="text-muted-foreground">
            Track and manage trading performance goals
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Goal selector */}
          <Select
            value={selectedGoalId?.toString()}
            onValueChange={handleGoalChange}
          >
            <SelectTrigger className="w-[220px]">
              <Target className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select goal" />
            </SelectTrigger>
            <SelectContent>
              {goals.map((goal) => (
                <SelectItem key={goal.id.toString()} value={goal.id.toString()}>
                  {goal.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Action buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => selectedGoal && onAddProgressUpdate && onAddProgressUpdate(selectedGoal.id)}
            disabled={!selectedGoal || isLoading}
          >
            Update Progress
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => selectedGoal && onEditGoal && onEditGoal(selectedGoal.id)}
            disabled={!selectedGoal || isLoading}
          >
            Edit Goal
          </Button>
          
          {/* Refresh button */}
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
      
      {/* Quick stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Goals
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeGoals}
            </div>
            <p className="text-xs text-muted-foreground">
              {activeGoals === 1 ? 'Goal' : 'Goals'} in progress
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completed Goals
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {completedGoals}
            </div>
            <p className="text-xs text-muted-foreground">
              {completedGoals === 1 ? 'Goal' : 'Goals'} achieved
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Overdue Goals
            </CardTitle>
            <Calendar className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overdueGoals}
            </div>
            <p className="text-xs text-muted-foreground">
              {overdueGoals === 1 ? 'Goal' : 'Goals'} past deadline
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Progress
            </CardTitle>
            <Target className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {averageProgress.toFixed(1)}%
            </div>
            <Progress value={averageProgress} className="h-2 mt-2" />
          </CardContent>
        </Card>
      </div>
      
      {/* Selected goal details and progress */}
      {selectedGoal && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Goal progress chart */}
          <GoalProgressChart
            goal={selectedGoal}
            showTargetDate={true}
          />
          
          {/* Goal details card */}
          <Card>
            <CardHeader>
              <CardTitle>Goal Details</CardTitle>
              <CardDescription>
                Comprehensive information about this goal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Goal details */}
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="font-medium">Name</span>
                  <span>{selectedGoal.name}</span>
                </div>
                
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="font-medium">Status</span>
                  <Badge
                    className={`
                      ${selectedGoal.status === 'COMPLETED' ? 'bg-green-500' : ''}
                      ${selectedGoal.status === 'ACTIVE' ? 'bg-blue-500' : ''}
                      ${selectedGoal.status === 'PAUSED' ? 'bg-amber-500' : ''}
                      ${selectedGoal.status === 'FAILED' ? 'bg-red-500' : ''}
                    `}
                  >
                    {selectedGoal.status}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="font-medium">Target Amount</span>
                  <span className="font-mono">
                    {selectedGoal.target_amount.toLocaleString('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    })}
                  </span>
                </div>
                
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="font-medium">Current Amount</span>
                  <span className="font-mono">
                    {selectedGoal.current_amount.toLocaleString('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    })}
                  </span>
                </div>
                
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="font-medium">Progress</span>
                  <span>{selectedGoal.progress_percentage.toFixed(1)}%</span>
                </div>
                
                {selectedGoal.target_date && (
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="font-medium">Target Date</span>
                    <div className="text-right">
                      <div>{formatDate(selectedGoal.target_date)}</div>
                      <div className={`text-sm ${
                          new Date(selectedGoal.target_date) < new Date() 
                            ? 'text-red-500' 
                            : 'text-muted-foreground'
                        }`}
                      >
                        {formatRelativeDate(selectedGoal.target_date)}
                      </div>
                    </div>
                  </div>
                )}
                
                {selectedGoal.farm_name && (
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="font-medium">Associated Farm</span>
                    <span>{selectedGoal.farm_name}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="font-medium">Created</span>
                  <span>{formatDate(selectedGoal.created_at)}</span>
                </div>
                
                {selectedGoal.description && (
                  <div className="pt-2">
                    <div className="font-medium mb-1">Description:</div>
                    <p className="text-sm text-muted-foreground">
                      {selectedGoal.description}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Tabs for agents and progress updates */}
      <Tabs defaultValue="updates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="updates">Progress Updates</TabsTrigger>
          <TabsTrigger value="agents">Assigned Agents</TabsTrigger>
        </TabsList>
        
        {/* Progress updates tab */}
        <TabsContent value="updates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Progress History</CardTitle>
              <CardDescription>
                Recent progress updates for {selectedGoal?.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {goalProgressUpdates.length > 0 ? (
                <DataTable
                  columns={progressUpdateColumns}
                  data={goalProgressUpdates}
                  searchPlaceholder="Search updates..."
                  searchColumn="notes"
                />
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  No progress updates recorded yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Agents tab */}
        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assigned Agents</CardTitle>
              <CardDescription>
                Agents working on {selectedGoal?.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {goalAgents.length > 0 ? (
                <DataTable
                  columns={agentColumns}
                  data={goalAgents}
                  searchPlaceholder="Search agents..."
                  searchColumn="name"
                />
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  No agents assigned to this goal yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
