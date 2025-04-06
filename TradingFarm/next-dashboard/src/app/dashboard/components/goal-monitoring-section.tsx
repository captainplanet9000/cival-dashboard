'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusIcon } from '@radix-ui/react-icons';
import { GoalMonitoringDashboard } from '@/components/goal-monitoring/goal-monitoring-dashboard';
import { RealTimeMonitoringFeed } from '@/components/goal-monitoring/real-time-monitoring-feed';
import { toast } from 'sonner';
import { GoalMonitoringEvent } from '@/types/goal-types';

export function GoalMonitoringSection() {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');
  const [selectedGoalId, setSelectedGoalId] = useState<string | undefined>(undefined);
  
  // Get the most recently active goal on component mount
  useEffect(() => {
    const fetchActiveGoals = async () => {
      try {
        const response = await fetch('/api/goals/acquisition?status=ACTIVE&limit=1');
        if (!response.ok) {
          throw new Error('Failed to fetch active goals');
        }
        
        const result = await response.json();
        if (result.data && result.data.length > 0) {
          setSelectedGoalId(result.data[0].id);
        }
      } catch (error) {
        console.error('Error fetching active goals:', error);
      }
    };
    
    fetchActiveGoals();
  }, []);
  
  const handleGoalClick = (goalId: string) => {
    setSelectedGoalId(goalId);
    if (activeTab === 'summary') {
      setActiveTab('live');
    }
  };
  
  const handleEventClick = (event: GoalMonitoringEvent) => {
    // Navigate to the goal details page when an event is clicked
    if (event.goal_id) {
      router.push(`/dashboard/goals/acquisition/${event.goal_id}`);
    }
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
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="summary">Goal Summary</TabsTrigger>
          <TabsTrigger value="live">Live Updates</TabsTrigger>
        </TabsList>
        
        <TabsContent value="summary" className="space-y-4">
          <GoalMonitoringDashboard 
            maxGoalsToShow={expanded ? 10 : 3}
            maxEventsToShow={expanded ? 10 : 5}
            showCompletedGoals={expanded}
            onGoalClick={handleGoalClick}
          />
        </TabsContent>
        
        <TabsContent value="live">
          <RealTimeMonitoringFeed 
            goalId={selectedGoalId} 
            maxEvents={expanded ? 20 : 10}
            height={expanded ? "500px" : "400px"}
            onEventClick={handleEventClick}
          />
        </TabsContent>
      </Tabs>
      
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
