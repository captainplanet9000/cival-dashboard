'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { PlusIcon } from '@radix-ui/react-icons';
import { GoalMonitoringDashboard } from '@/components/goal-monitoring/goal-monitoring-dashboard';

export function GoalMonitoringSection() {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  
  const handleGoalClick = (goalId: string) => {
    router.push(`/dashboard/goals/acquisition/${goalId}`);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Goal Monitoring</h2>
          <p className="text-muted-foreground">
            Track progress of your acquisition goals across all farms
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Show Less' : 'Show More'}
          </Button>
          <Button 
            size="sm" 
            onClick={() => router.push('/dashboard/goals/acquisition/create')}
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            New Goal
          </Button>
        </div>
      </div>
      
      <GoalMonitoringDashboard 
        maxGoalsToShow={expanded ? 10 : 3}
        maxEventsToShow={expanded ? 10 : 5}
        showCompletedGoals={expanded}
        onGoalClick={handleGoalClick}
      />
      
      <div className="flex justify-end">
        <Button 
          variant="link" 
          asChild
        >
          <Link href="/dashboard/goals/acquisition">
            View All Goals
          </Link>
        </Button>
      </div>
    </div>
  );
}
