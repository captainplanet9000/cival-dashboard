'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Target, 
  Calendar, 
  ChevronRight, 
  BarChart4, 
  CheckCircle, 
  XCircle, 
  Clock, 
  MoreHorizontal,
  PencilLine,
  Archive,
  Trash2,
  AlertCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { ExtendedGoal } from '@/types/goals';
import { formatDistanceToNow, format, isAfter, isPast } from 'date-fns';

interface GoalCardProps {
  goal: ExtendedGoal;
  onUpdate: (updatedGoal: ExtendedGoal) => void;
}

export default function GoalCard({ goal, onUpdate }: GoalCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleStatusChange = async (newStatus: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/goals/${goal.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update goal status');
      }

      const { data } = await response.json();
      onUpdate(data);

      toast({
        title: 'Goal Updated',
        description: `Goal status changed to ${newStatus.replace('_', ' ')}`,
      });
    } catch (error) {
      console.error('Error updating goal:', error);
      toast({
        title: 'Error',
        description: 'Failed to update goal. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchiveToggle = async () => {
    setIsLoading(true);
    try {
      const newArchiveStatus = !goal.archived;
      const response = await fetch(`/api/goals/${goal.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          archived: newArchiveStatus,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${newArchiveStatus ? 'archive' : 'unarchive'} goal`);
      }

      const { data } = await response.json();
      onUpdate(data);

      toast({
        title: newArchiveStatus ? 'Goal Archived' : 'Goal Restored',
        description: newArchiveStatus 
          ? 'Goal has been moved to the archive' 
          : 'Goal has been restored from the archive',
      });
    } catch (error) {
      console.error('Error toggling archive status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update goal. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToDetail = () => {
    router.push(`/dashboard/goals/${goal.id}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'not_started':
        return 'bg-gray-500';
      case 'missed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getGoalTypeLabel = (type: string) => {
    switch (type) {
      case 'profit':
        return 'Profit Target';
      case 'roi':
        return 'ROI';
      case 'trade_count':
        return 'Trade Count';
      case 'win_rate':
        return 'Win Rate';
      case 'custom':
        return 'Custom';
      default:
        return type.replace('_', ' ');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  const getTimeRemaining = () => {
    if (!goal.target_date) return null;
    
    const targetDate = new Date(goal.target_date);
    
    if (isPast(targetDate)) {
      return {
        text: 'Past deadline',
        isOverdue: true,
      };
    }
    
    return {
      text: formatDistanceToNow(targetDate, { addSuffix: true }),
      isOverdue: false,
    };
  };

  const timeRemaining = goal.target_date ? getTimeRemaining() : null;
  const hasRelatedEntities = goal.farm_id || goal.agent_id;
  
  return (
    <Card className="hover:shadow-md transition-shadow relative overflow-hidden">
      {/* Status indicator line at top of card */}
      <div 
        className={`absolute top-0 left-0 right-0 h-1 ${getStatusColor(goal.status)}`}
      ></div>
      
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="flex items-center cursor-pointer" onClick={navigateToDetail}>
              <Target className="mr-2 h-5 w-5 text-primary" />
              {goal.name}
              <ChevronRight className="ml-2 h-4 w-4 text-muted-foreground" />
            </CardTitle>
            {goal.description && (
              <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" disabled={isLoading}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={navigateToDetail}>
                <BarChart4 className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/dashboard/goals/${goal.id}/edit`)}>
                <PencilLine className="mr-2 h-4 w-4" />
                Edit Goal
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {goal.status !== 'completed' && (
                <DropdownMenuItem onClick={() => handleStatusChange('completed')}>
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  Mark as Completed
                </DropdownMenuItem>
              )}
              {goal.status !== 'in_progress' && goal.status !== 'completed' && (
                <DropdownMenuItem onClick={() => handleStatusChange('in_progress')}>
                  <Clock className="mr-2 h-4 w-4 text-blue-500" />
                  Mark as In Progress
                </DropdownMenuItem>
              )}
              {goal.status !== 'missed' && (
                <DropdownMenuItem onClick={() => handleStatusChange('missed')}>
                  <XCircle className="mr-2 h-4 w-4 text-red-500" />
                  Mark as Missed
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleArchiveToggle}>
                {goal.archived ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Restore from Archive
                  </>
                ) : (
                  <>
                    <Archive className="mr-2 h-4 w-4" />
                    Archive Goal
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="pb-4">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-primary/5">
              {getGoalTypeLabel(goal.goal_type)}
            </Badge>
            {goal.farm_id && (
              <Badge variant="secondary">
                Farm: {goal.farm_name || "Unknown Farm"}
              </Badge>
            )}
            {goal.agent_id && (
              <Badge variant="secondary">
                Agent: {goal.agent_name || "Unknown Agent"}
              </Badge>
            )}
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{Math.round(goal.progress_percentage)}%</span>
            </div>
            <Progress value={goal.progress_percentage} className="h-2" />
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            {goal.target_value !== null && (
              <div>
                <span className="text-muted-foreground block">Target</span>
                <span className="font-medium">{goal.target_value}</span>
              </div>
            )}
            {goal.current_value !== null && (
              <div>
                <span className="text-muted-foreground block">Current</span>
                <span className="font-medium">{goal.current_value}</span>
              </div>
            )}
            {goal.start_date && (
              <div>
                <span className="text-muted-foreground block">Started</span>
                <span className="font-medium">{formatDate(goal.start_date)}</span>
              </div>
            )}
            {goal.target_date && (
              <div>
                <span className="text-muted-foreground block">Target Date</span>
                <span className="font-medium">{formatDate(goal.target_date)}</span>
              </div>
            )}
          </div>
          
          {timeRemaining && (
            <div className="flex items-center mt-2">
              <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className={`text-sm ${timeRemaining.isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                {timeRemaining.text}
              </span>
            </div>
          )}
        </div>
      </CardContent>
      
      {goal.status === 'in_progress' && goal.target_date && timeRemaining?.isOverdue && (
        <CardFooter className="pt-0 pb-4">
          <div className="flex items-center w-full bg-red-50 text-red-800 p-2 rounded text-sm">
            <AlertCircle className="h-4 w-4 mr-2" />
            <span>Goal is overdue. Consider adjusting the target date or marking as missed.</span>
          </div>
        </CardFooter>
      )}
    </Card>
  );
} 