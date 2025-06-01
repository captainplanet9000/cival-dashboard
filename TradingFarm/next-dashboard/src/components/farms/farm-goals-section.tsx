'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { goalService } from '@/services/goal-service';
import { farmService } from '@/services/farm-service';
import { MoreHorizontal, Plus, RefreshCw, Target, Award, LucideIcon } from 'lucide-react';
import { AssignAgentDialog } from './assign-agent-dialog';

interface FarmGoalsSectionProps {
  farmId: string;
}

// Define the Goal type interface with all required properties
interface Goal {
  id: string;
  title: string;
  description?: string;
  status: string;
  progress: number;
  target_value: number;
  current_value: number;
  farm_id?: string;
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'bg-emerald-500';
    case 'in_progress':
      return 'bg-blue-500';
    case 'not_started':
      return 'bg-gray-400';
    case 'cancelled':
      return 'bg-red-500';
    default:
      return 'bg-gray-400';
  }
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'in_progress':
      return 'In Progress';
    case 'not_started':
      return 'Not Started';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Unknown';
  }
};

export function FarmGoalsSection({ farmId }: FarmGoalsSectionProps) {
  const [goals, setGoals] = React.useState<Goal[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = React.useState(false);
  const [selectedGoalId, setSelectedGoalId] = React.useState<string>('');

  const fetchGoals = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await goalService.getGoals(farmId);
      
      if (error) {
        setError(error);
      } else {
        setGoals(data || []);
      }
    } catch (err) {
      setError('Failed to fetch goals');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshFarmStatus = async () => {
    setRefreshing(true);
    try {
      await farmService.refreshFarmStatusSummary(farmId);
      // Reload goals to ensure we have the latest data
      await fetchGoals();
    } catch (err) {
      console.error('Failed to refresh farm status:', err);
    } finally {
      setRefreshing(false);
    }
  };

  React.useEffect(() => {
    if (farmId) {
      fetchGoals();
    }
  }, [farmId]);

  const handleAssignAgent = (goalId: string) => {
    setSelectedGoalId(goalId);
    setAssignDialogOpen(true);
  };

  const handleAssignComplete = () => {
    // Refresh goals after assignment
    fetchGoals();
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Farm Goals</CardTitle>
            <CardDescription>Manage goals and track progress</CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={refreshFarmStatus} 
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Link href={`/dashboard/farms/${farmId}/goals/new`} passHref>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" /> Add Goal
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center p-3 border rounded-md animate-pulse">
                  <div className="h-4 w-1/4 bg-gray-200 rounded-md"></div>
                  <div className="ml-auto h-4 w-24 bg-gray-200 rounded-md"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-4 text-center text-red-500">
              {error}
            </div>
          ) : goals.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="mb-4">No goals set for this farm yet</p>
              <Link href={`/dashboard/farms/${farmId}/goals/new`} passHref>
                <Button variant="outline">Create Your First Goal</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {goals.map((goal: Goal) => (
                <div key={goal.id} className="border rounded-md p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <h3 className="font-medium text-lg">{goal.title}</h3>
                      <Badge className={`ml-2 ${getStatusColor(goal.status)}`}>
                        {getStatusLabel(goal.status)}
                      </Badge>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleAssignAgent(goal.id)}>
                          Assign Agent
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/goals/${goal.id}`}>View Details</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/goals/${goal.id}/edit`}>Edit Goal</Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <p className="text-sm text-gray-500 mb-2">{goal.description}</p>
                  
                  <div className="mb-1 flex justify-between text-xs text-gray-500">
                    <span>Progress</span>
                    <span>{Math.round((goal.progress || 0) * 100)}%</span>
                  </div>
                  <Progress 
                    value={(goal.progress || 0) * 100} 
                    className={`h-2 ${goal.status === 'completed' ? 'bg-emerald-100' : 'bg-gray-100'}`}
                  />
                  
                  <div className="mt-4 flex justify-between text-sm">
                    <div>
                      <span className="text-gray-500">Target:</span>{' '}
                      <span className="font-medium">{goal.target_value || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Current:</span>{' '}
                      <span className="font-medium">{goal.current_value || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <span className="text-sm text-gray-500">
            {goals.length} goal{goals.length !== 1 ? 's' : ''}
          </span>
          <Link href={`/dashboard/goals?farmId=${farmId}`} passHref>
            <Button variant="link" size="sm">View All Goals</Button>
          </Link>
        </CardFooter>
      </Card>
      
      {/* Agent assignment dialog */}
      <AssignAgentDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        farmId={farmId}
        goalId={selectedGoalId}
        onAssignComplete={handleAssignComplete}
      />
    </>
  );
}
