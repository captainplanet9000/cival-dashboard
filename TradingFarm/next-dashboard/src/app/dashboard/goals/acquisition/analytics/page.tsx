'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { FileBarChart, Goal, Home, RefreshCw } from 'lucide-react';

import { GoalAnalyticsDashboard } from '@/components/goal-monitoring/goal-analytics-dashboard';
import { Goal as GoalType } from '@/types/goal-types';

export default function GoalAnalyticsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<GoalType[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  
  // On mount, fetch available goals
  useEffect(() => {
    const fetchGoals = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/goals/acquisition');
        if (!response.ok) {
          throw new Error('Failed to fetch goals');
        }
        
        const result = await response.json();
        if (result.data) {
          setGoals(result.data);
          
          // If we have a goal ID in the URL, use that
          const goalIdFromUrl = searchParams.get('goal_id');
          if (goalIdFromUrl && result.data.some((goal: GoalType) => goal.id === goalIdFromUrl)) {
            setSelectedGoalId(goalIdFromUrl);
          } 
          // Otherwise use the first active goal, or just the first goal
          else if (result.data.length > 0) {
            const activeGoal = result.data.find((goal: GoalType) => goal.status === 'ACTIVE');
            setSelectedGoalId(activeGoal ? activeGoal.id : result.data[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching goals:', error);
        toast.error('Failed to load acquisition goals');
      } finally {
        setLoading(false);
      }
    };
    
    fetchGoals();
  }, []);
  
  // Handle goal selection change
  const handleGoalChange = (goalId: string) => {
    setSelectedGoalId(goalId);
    
    // Update URL with the selected goal ID
    const params = new URLSearchParams(window.location.search);
    params.set('goal_id', goalId);
    router.push(`${window.location.pathname}?${params.toString()}`);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/dashboard">
                  <Home className="h-4 w-4 mr-1" />
                  Home
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/dashboard/goals/acquisition">Goals</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink>Analytics</BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Goal Analytics</h1>
            <p className="text-muted-foreground">
              Performance insights and optimization recommendations for your acquisition goals
            </p>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[500px] w-full" />
            </CardContent>
          </Card>
        </div>
      ) : goals.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Goals Found</CardTitle>
            <CardDescription>
              You don't have any acquisition goals set up yet.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Goal className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Create your first goal</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Set up an acquisition goal to start tracking your progress and get insights on your strategy performance.
            </p>
            <Button asChild>
              <Link href="/dashboard/goals/acquisition/create">
                Create Acquisition Goal
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileBarChart className="h-5 w-5" />
                  Goal Selection
                </CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/goals/acquisition/create">
                    Create New Goal
                  </Link>
                </Button>
              </div>
              <CardDescription>
                Select a goal to view detailed analytics and performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="col-span-3">
                  <Select
                    value={selectedGoalId || undefined}
                    onValueChange={handleGoalChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a goal" />
                    </SelectTrigger>
                    <SelectContent>
                      {goals.map((goal) => (
                        <SelectItem key={goal.id} value={goal.id}>
                          {goal.name} ({goal.current_amount || 0}/{goal.target_amount} {goal.selected_asset})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setSelectedGoalId(selectedGoalId)}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {selectedGoalId && (
            <GoalAnalyticsDashboard goalId={selectedGoalId} />
          )}
        </div>
      )}
    </div>
  );
}
