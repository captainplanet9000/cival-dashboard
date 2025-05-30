'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, Target, Calendar, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react';
import { formatDate, formatRelativeDate } from '@/utils/date-utils';

interface GoalProgressPreviewProps {
  goal: {
    id: string;
    name: string;
    description?: string;
    target_amount: number;
    current_amount: number;
    target_date?: string | null;
    status: string;
    progress_percentage?: number;
    farm_id?: string;
    farm_name?: string;
    created_at: string;
  };
  className?: string;
  showFarmName?: boolean;
}

export function GoalProgressPreview({ 
  goal, 
  className = '', 
  showFarmName = true 
}: GoalProgressPreviewProps) {
  // Calculate progress percentage if not provided
  const progressPercentage = goal.progress_percentage !== undefined
    ? goal.progress_percentage
    : goal.target_amount > 0 
      ? (goal.current_amount / goal.target_amount) * 100 
      : 0;
  
  // Format amounts for display
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    });
  };
  
  // Get status badge config
  const getStatusBadge = () => {
    switch (goal.status.toUpperCase()) {
      case 'COMPLETED':
        return { 
          label: 'Completed', 
          variant: 'default' as const,
          icon: <CheckCircle className="h-3 w-3 mr-1" /> 
        };
      case 'ACTIVE':
        return { 
          label: 'Active', 
          variant: 'secondary' as const,
          icon: <Clock className="h-3 w-3 mr-1" /> 
        };
      case 'PAUSED':
        return { 
          label: 'Paused', 
          variant: 'outline' as const,
          icon: null 
        };
      case 'FAILED':
        return { 
          label: 'Failed', 
          variant: 'destructive' as const,
          icon: <AlertCircle className="h-3 w-3 mr-1" /> 
        };
      default:
        return { 
          label: goal.status, 
          variant: 'outline' as const,
          icon: null 
        };
    }
  };
  
  // Check if target date is past due
  const isOverdue = () => {
    if (!goal.target_date) return false;
    return new Date(goal.target_date) < new Date() && goal.status.toUpperCase() !== 'COMPLETED';
  };
  
  // Get target date display
  const getTargetDateDisplay = () => {
    if (!goal.target_date) return 'No deadline';
    
    return (
      <div className="flex items-center">
        <Calendar className="h-3 w-3 mr-1" />
        <span className={isOverdue() ? 'text-red-500' : ''}>
          {formatDate(goal.target_date)} 
          {isOverdue() && ' (Overdue)'}
        </span>
      </div>
    );
  };
  
  const statusBadge = getStatusBadge();

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="line-clamp-1">{goal.name}</CardTitle>
            {showFarmName && goal.farm_name && (
              <CardDescription className="line-clamp-1">
                {goal.farm_name}
              </CardDescription>
            )}
          </div>
          <Badge variant={statusBadge.variant} className="flex items-center">
            {statusBadge.icon}
            {statusBadge.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span className="font-medium">{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
        
        {/* Target and current amounts */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-muted rounded-md p-2">
            <div className="text-xs text-muted-foreground mb-1">Current</div>
            <div className="font-medium">
              {formatCurrency(goal.current_amount)}
            </div>
          </div>
          
          <div className="bg-muted rounded-md p-2">
            <div className="text-xs text-muted-foreground mb-1">Target</div>
            <div className="font-medium">
              {formatCurrency(goal.target_amount)}
            </div>
          </div>
        </div>
        
        {/* Additional information */}
        <div className="text-sm space-y-1">
          {/* Target date if available */}
          {goal.target_date && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Due:</span>
              {getTargetDateDisplay()}
            </div>
          )}
          
          {/* Created date */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Created:</span>
            <span>{formatRelativeDate(goal.created_at)}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button size="sm" variant="outline" className="w-full" asChild>
          <Link 
            href={`/dashboard/goals/tracking?goalId=${goal.id}${goal.farm_id ? `&farmId=${goal.farm_id}` : ''}`}
          >
            <Target className="h-4 w-4 mr-2" />
            View Goal Details
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
