'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { goalService } from '@/services/goal-service';
import { agentService } from '@/services/agent-service';
import { GoalTrackingDashboard } from '@/components/dashboards/goal-tracking-dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, RefreshCw, Plus } from 'lucide-react';
import Link from 'next/link';
import { format, subDays, addDays } from 'date-fns';
import { DEMO_MODE } from '@/utils/demo-data';

// Generate demo goals for testing
const generateDemoGoals = (count = 5) => {
  const today = new Date();
  const statuses = ['ACTIVE', 'COMPLETED', 'PAUSED', 'FAILED'];
  
  return Array(count).fill(0).map((_, index) => {
    const targetAmount = Math.floor(Math.random() * 50000) + 10000;
    const progressPercentage = Math.random() * 100;
    const currentAmount = (targetAmount * progressPercentage) / 100;
    const status = statuses[Math.min(Math.floor(Math.random() * statuses.length), 3)];
    
    // Set some goals to have past dates, some future dates, and some with no dates
    let targetDate = null;
    if (index % 3 === 0) {
      targetDate = format(subDays(today, Math.floor(Math.random() * 30)), 'yyyy-MM-dd');
    } else if (index % 3 === 1) {
      targetDate = format(addDays(today, Math.floor(Math.random() * 60) + 1), 'yyyy-MM-dd');
    }
    
    return {
      id: `goal-${index + 1}`,
      name: `Goal ${index + 1}: ${['Profit Target', 'Risk Management', 'Trade Volume', 'ROI Target', 'Drawdown Limit'][index % 5]}`,
      description: `This is a sample ${['profit', 'risk', 'volume', 'ROI', 'drawdown'][index % 5]} goal for demonstration purposes.`,
      target_amount: targetAmount,
      current_amount: currentAmount,
      target_date: targetDate,
      status,
      progress_percentage: progressPercentage,
      farm_id: index % 2 === 0 ? 'farm-1' : 'farm-2',
      farm_name: index % 2 === 0 ? 'Crypto Trading' : 'Stock Trading',
      created_at: format(subDays(today, Math.floor(Math.random() * 60) + 30), 'yyyy-MM-dd'),
      updated_at: format(subDays(today, Math.floor(Math.random() * 10)), 'yyyy-MM-dd'),
    };
  });
};

// Generate demo agents for testing
const generateDemoAgents = (goalIds, count = 8) => {
  const statuses = ['ACTIVE', 'PAUSED'];
  
  return Array(count).fill(0).map((_, index) => {
    const assignedGoalIndex = index % goalIds.length;
    
    return {
      id: `agent-${index + 1}`,
      name: `Agent ${index + 1}: ${['Trend Follower', 'Breakout Scanner', 'Volatility Trader', 'Mean Reversion'][index % 4]}`,
      allocation_percentage: Math.floor(Math.random() * 50) + 10,
      goal_id: goalIds[assignedGoalIndex],
      farm_id: index % 3 === 0 ? 'farm-1' : 'farm-2',
      status: statuses[Math.min(Math.floor(Math.random() * statuses.length), 1)],
    };
  });
};

// Generate demo progress updates for testing
const generateDemoProgressUpdates = (goalIds, count = 15) => {
  const today = new Date();
  
  return Array(count).fill(0).map((_, index) => {
    const assignedGoalIndex = index % goalIds.length;
    const isPositive = Math.random() > 0.3;
    
    return {
      id: `update-${index + 1}`,
      goal_id: goalIds[assignedGoalIndex],
      amount_change: isPositive 
        ? Math.floor(Math.random() * 2000) + 500 
        : -Math.floor(Math.random() * 1000) - 100,
      notes: `Progress update ${isPositive ? 'increase' : 'adjustment'} based on ${['recent trades', 'market conditions', 'strategy adjustment', 'external factors'][index % 4]}.`,
      update_date: format(subDays(today, Math.floor(Math.random() * 30)), 'yyyy-MM-dd'),
      created_at: format(subDays(today, Math.floor(Math.random() * 30)), 'yyyy-MM-dd'),
    };
  });
};

export default function GoalTrackingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const farmIdParam = searchParams.get('farmId');
  const goalIdParam = searchParams.get('goalId');
  
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [goals, setGoals] = useState([]);
  const [agents, setAgents] = useState([]);
  const [progressUpdates, setProgressUpdates] = useState([]);
  const [selectedGoalId, setSelectedGoalId] = useState(null);

  useEffect(() => {
    fetchGoalsData();
  }, [farmIdParam]);

  useEffect(() => {
    // If a goal ID is specified in the URL, select it
    if (goalIdParam && goals.length > 0) {
      const goalExists = goals.some(goal => goal.id.toString() === goalIdParam);
      if (goalExists) {
        setSelectedGoalId(goalIdParam);
      }
    }
  }, [goalIdParam, goals]);

  const fetchGoalsData = async () => {
    setIsLoading(true);
    
    try {
      if (DEMO_MODE) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Generate demo data
        const demoGoals = generateDemoGoals();
        const goalIds = demoGoals.map(goal => goal.id);
        const demoAgents = generateDemoAgents(goalIds);
        const demoProgressUpdates = generateDemoProgressUpdates(goalIds);
        
        setGoals(demoGoals);
        setAgents(demoAgents);
        setProgressUpdates(demoProgressUpdates);
        
        // If a goal ID param exists, validate it against demo goals
        if (goalIdParam) {
          const goalExists = demoGoals.some(goal => goal.id.toString() === goalIdParam);
          if (goalExists) {
            setSelectedGoalId(goalIdParam);
          } else {
            setSelectedGoalId(demoGoals[0].id);
          }
        } else {
          setSelectedGoalId(demoGoals[0].id);
        }
        
        setIsLoading(false);
        return;
      }
      
      // Fetch real data
      const options = farmIdParam ? { farm_id: farmIdParam } : {};
      const goalsResponse = await goalService.getGoals(options);
      
      if (goalsResponse.error) {
        toast({
          title: 'Error loading goals',
          description: goalsResponse.error,
          variant: 'destructive',
        });
        return;
      }
      
      if (goalsResponse.data && goalsResponse.data.length > 0) {
        setGoals(goalsResponse.data);
        
        // If a goal is specified in URL, select it
        if (goalIdParam) {
          const goalExists = goalsResponse.data.some(goal => goal.id.toString() === goalIdParam);
          if (goalExists) {
            setSelectedGoalId(goalIdParam);
          } else {
            setSelectedGoalId(goalsResponse.data[0].id);
          }
        } else {
          setSelectedGoalId(goalsResponse.data[0].id);
        }
        
        // Fetch agents assigned to these goals
        const goalIds = goalsResponse.data.map(goal => goal.id);
        
        // This would be an actual endpoint in production
        const agentsResponse = await agentService.getAgentsByGoals(goalIds);
        if (agentsResponse.data) {
          setAgents(agentsResponse.data);
        }
        
        // Fetch progress updates for these goals
        const progressResponse = await goalService.getGoalProgressUpdates(goalIds);
        if (progressResponse.data) {
          setProgressUpdates(progressResponse.data);
        }
      } else {
        toast({
          title: 'No goals found',
          description: farmIdParam 
            ? 'No goals are associated with this farm.' 
            : 'No goals have been created yet.',
        });
      }
    } catch (error) {
      console.error('Error fetching goals data:', error);
      toast({
        title: 'Failed to load goals data',
        description: 'An unexpected error occurred. Using demo data instead.',
        variant: 'destructive',
      });
      
      // Fallback to demo data
      const demoGoals = generateDemoGoals();
      const goalIds = demoGoals.map(goal => goal.id);
      const demoAgents = generateDemoAgents(goalIds);
      const demoProgressUpdates = generateDemoProgressUpdates(goalIds);
      
      setGoals(demoGoals);
      setAgents(demoAgents);
      setProgressUpdates(demoProgressUpdates);
      setSelectedGoalId(demoGoals[0].id);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoalChange = (goalId) => {
    setSelectedGoalId(goalId);
    
    // Update URL without reloading page
    const newUrl = farmIdParam
      ? `/dashboard/goals/tracking?farmId=${farmIdParam}&goalId=${goalId}`
      : `/dashboard/goals/tracking?goalId=${goalId}`;
    
    router.push(newUrl, { scroll: false });
  };

  const handleRefreshData = () => {
    fetchGoalsData();
    toast({
      title: 'Refreshing data',
      description: 'Fetching the latest goal tracking data.',
    });
  };

  const handleAddProgressUpdate = (goalId) => {
    router.push(`/dashboard/goals/${goalId}/progress/add`);
  };

  const handleEditGoal = (goalId) => {
    router.push(`/dashboard/goals/${goalId}/edit`);
  };

  // Handle loading state
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/goals">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Goals
            </Link>
          </Button>
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  // Handle no goals
  if (!goals || goals.length === 0) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/goals">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Goals
            </Link>
          </Button>
        </div>
        <div className="p-12 text-center">
          <h2 className="text-2xl font-semibold mb-2">No Goals Found</h2>
          <p className="text-muted-foreground mb-6">
            {farmIdParam
              ? 'No goals are associated with this farm yet.'
              : 'No goals have been created in the system.'}
          </p>
          <Button asChild>
            <Link href="/dashboard/goals/create">
              <Plus className="h-4 w-4 mr-2" />
              Create a Goal
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/goals">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Goals
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleRefreshData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
          <Button size="sm" asChild>
            <Link href="/dashboard/goals/create">
              <Plus className="h-4 w-4 mr-2" />
              New Goal
            </Link>
          </Button>
        </div>
      </div>
      
      <GoalTrackingDashboard
        goals={goals}
        agents={agents}
        progressUpdates={progressUpdates}
        isLoading={isLoading}
        onGoalChange={handleGoalChange}
        onRefreshData={handleRefreshData}
        onAddProgressUpdate={handleAddProgressUpdate}
        onEditGoal={handleEditGoal}
      />
    </div>
  );
}
