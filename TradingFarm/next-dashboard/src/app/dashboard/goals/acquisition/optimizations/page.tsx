import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { GoalAnalyticsDashboard } from '@/components/goal-monitoring/goal-analytics-dashboard';
import { StrategyOptimizer } from '@/components/goal-monitoring/strategy-optimizer';
import { AgentMemoryViewer } from '@/components/goal-monitoring/agent-memory-viewer';
import { createServerClient } from '@/utils/supabase/server';
import { goalAcquisitionService } from '@/services/goal-acquisition-service';
import { goalAnalyticsService } from '@/services/goal-analytics-service';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, BarChart3, Brain, ChevronRight, Lightbulb, Zap } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Goal Optimization | Trading Farm',
  description: 'Optimize your acquisition strategies with AI-powered recommendations',
};

interface PageProps {
  searchParams: {
    goalId?: string;
  };
}

export default async function StrategyOptimizationPage({ searchParams }: PageProps) {
  const goalId = searchParams.goalId;
  
  if (!goalId) {
    return notFound();
  }
  
  // Create server client
  const supabase = createServerClient();
  
  // Get session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return notFound();
  }
  
  // Get goal data
  const { data: goal, error: goalError } = await goalAcquisitionService.getAcquisitionGoal(goalId);
  
  if (goalError || !goal) {
    console.error('Error fetching goal:', goalError);
    return notFound();
  }
  
  // Check if user owns this goal
  if (goal.user_id !== session.user.id) {
    return notFound();
  }
  
  // Get analytics data
  const { data: analytics, error: analyticsError } = await goalAnalyticsService.getGoalAnalytics(goalId);
  
  if (analyticsError) {
    console.error('Error fetching analytics:', analyticsError);
    // We'll continue without analytics, the component will handle this case
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-1 text-muted-foreground mb-1 text-sm">
            <Link href="/dashboard/goals/acquisition" className="hover:underline flex items-center">
              <ArrowLeft className="h-3 w-3 mr-1" />
              Goals
            </Link>
            <ChevronRight className="h-3 w-3" />
            <Link href={`/dashboard/goals/acquisition?id=${goalId}`} className="hover:underline">
              {goal.name}
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span>Optimizations</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Strategy Optimizer</h1>
          <p className="text-muted-foreground">
            AI-powered recommendations to improve your acquisition strategy for {goal.name}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href={`/dashboard/goals/acquisition/analytics?goalId=${goalId}`}>
              <BarChart3 className="h-4 w-4 mr-2" />
              View Analytics
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/dashboard/goals/acquisition?id=${goalId}`}>
              <Zap className="h-4 w-4 mr-2" />
              Go to Goal
            </Link>
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <Lightbulb className="h-5 w-5 text-primary mr-2" />
                AI Strategy Optimization
              </CardTitle>
              <CardDescription>
                ElizaOS analyzes your goal performance and market conditions to recommend strategy improvements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                These AI-generated recommendations are based on historical performance, agent memories, 
                and current market conditions. Each recommendation includes a detailed explanation of 
                expected benefits and level of confidence.
              </p>
            </CardContent>
          </Card>
          
          {/* Strategy Optimizer Component */}
          <StrategyOptimizer 
            goalId={goalId} 
            analytics={analytics || undefined} 
          />
          
          {/* Analytics Summary */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 text-primary mr-2" />
                Performance Snapshot
              </CardTitle>
              <CardDescription>
                Current performance metrics for this acquisition goal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <GoalAnalyticsDashboard 
                  goalId={goalId} 
                  analytics={analytics || undefined}
                  compactMode={true}
                />
              </div>
            </CardContent>
            <CardFooter className="border-t">
              <div className="w-full flex justify-end">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/dashboard/goals/acquisition/analytics?goalId=${goalId}`}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Full Analytics
                  </Link>
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
        
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="h-5 w-5 text-primary mr-2" />
                Agent Insights
              </CardTitle>
              <CardDescription>
                Recent agent memories that inform our recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                ElizaOS agents continually analyze and record observations about market conditions,
                execution quality, and potential opportunities. These insights drive optimization
                recommendations.
              </p>
              
              <div className="h-[500px] overflow-y-auto">
                <AgentMemoryViewer goalId={goalId} maxMemories={10} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
