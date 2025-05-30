'use client'

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createBrowserClient } from '@/utils/supabase/client';
import { Target, RefreshCw, ExternalLink, Unlink, Link } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface Goal {
  id: string;
  name: string;
  description: string;
  goal_type: string;
  target_value: number;
  current_value: number;
  progress_percentage: number;
  status: string;
  start_date: string | null;
  target_date: string | null;
}

interface GoalSelectorProps {
  strategyId: string;
  currentGoalId?: string | null;
  onGoalChange: (goalId: string | null) => Promise<void>;
}

export default function GoalSelector({ strategyId, currentGoalId, onGoalChange }: GoalSelectorProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(currentGoalId || null);
  const [showGoalDetails, setShowGoalDetails] = useState(false);
  const { toast } = useToast();

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const supabase = createBrowserClient();
      
      // Fetch available goals
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('archived', false)
        .in('status', ['not_started', 'in_progress']) // Only active goals
        .order('created_at', { ascending: false });
        
      if (error) {
        throw error;
      }
      
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
  };

  const handleGoalSelect = async (goalId: string | null) => {
    if (goalId === selectedGoalId) return;
    
    try {
      setUpdating(true);
      
      // Update the strategy with the new goal ID
      await onGoalChange(goalId);
      
      // Update local state
      setSelectedGoalId(goalId);
      
      toast({
        title: goalId ? 'Goal Linked' : 'Goal Unlinked',
        description: goalId 
          ? 'Strategy is now linked to the selected goal.' 
          : 'Strategy has been unlinked from its goal.',
      });
    } catch (error) {
      console.error('Error linking goal:', error);
      toast({
        title: 'Error',
        description: 'Failed to link goal to strategy. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const getSelectedGoal = () => {
    return goals.find(goal => goal.id === selectedGoalId);
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  useEffect(() => {
    if (currentGoalId) {
      setSelectedGoalId(currentGoalId);
    }
  }, [currentGoalId]);

  const selectedGoal = getSelectedGoal();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-xl flex items-center">
              <Target className="h-5 w-5 mr-2" />
              Goal Tracking
            </CardTitle>
            <CardDescription>
              Link this strategy to a goal for performance tracking
            </CardDescription>
          </div>
          {selectedGoalId && (
            <Button
              onClick={() => handleGoalSelect(null)}
              disabled={updating}
            >
              <Unlink className="h-4 w-4 mr-2" />
              Unlink Goal
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-24">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-full">
                <Select
                  value={selectedGoalId || ''}
                  onValueChange={(value: string) => handleGoalSelect(value || null)}
                  disabled={updating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a goal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Goal Selected</SelectItem>
                    {goals.map(goal => (
                      <SelectItem key={goal.id} value={goal.id}>
                        {goal.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={fetchGoals}
                disabled={updating || loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            
            {selectedGoal && (
              <div>
                <div className="rounded-md border p-4 mt-2">
                  <div className="flex justify-between mb-2">
                    <h3 className="font-medium">{selectedGoal.name}</h3>
                    <Badge className={
                      selectedGoal.status === 'in_progress' ? 'bg-blue-500' : 
                      selectedGoal.status === 'completed' ? 'bg-green-500' : 
                      'bg-gray-500'
                    }>
                      {selectedGoal.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  {selectedGoal.description && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {selectedGoal.description}
                    </p>
                  )}
                  
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span>{Math.round(selectedGoal.progress_percentage)}%</span>
                      </div>
                      <Progress 
                        value={selectedGoal.progress_percentage} 
                        className="h-2" 
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground block">Target Value</span>
                        <span className="font-medium">{selectedGoal.target_value}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Current Value</span>
                        <span className="font-medium">{selectedGoal.current_value}</span>
                      </div>
                    </div>
                    
                    {selectedGoal.target_date && (
                      <div className="text-sm">
                        <span className="text-muted-foreground block">Target Date</span>
                        <span className="font-medium">
                          {formatDistanceToNow(new Date(selectedGoal.target_date), { addSuffix: true })}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-2 pt-2 flex justify-end">
                    <Button
                      onClick={() => window.open(`/dashboard/goals/${selectedGoal.id}`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {!selectedGoal && !loading && (
              <div className="text-center py-4 border border-dashed rounded-md">
                <Target className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground mb-2">
                  No goal selected
                </p>
                <p className="text-sm text-muted-foreground">
                  Link a goal to track this strategy's performance against specific objectives
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 