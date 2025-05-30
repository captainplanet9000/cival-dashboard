'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  PlayIcon,
  PauseIcon,
  ReloadIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  UpdateIcon,
  ExclamationTriangleIcon,
} from '@radix-ui/react-icons';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Info,
} from 'lucide-react';

import { Goal, GoalMonitoringEvent } from '@/types/goal-types';

interface FarmDetails {
  id: string;
  name: string;
  description?: string;
}

// Status badge mapping
const statusBadge = {
  PENDING: <Badge variant="outline">Pending</Badge>,
  ACTIVE: <Badge variant="success">Active</Badge>,
  PAUSED: <Badge variant="warning">Paused</Badge>,
  COMPLETED: <Badge variant="default">Completed</Badge>,
  FAILED: <Badge variant="destructive">Failed</Badge>,
};

// Severity icon mapping
const severityIcon = {
  INFO: <Info className="h-4 w-4 text-blue-500" />,
  WARNING: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  ERROR: <AlertCircle className="h-4 w-4 text-red-500" />,
  CRITICAL: <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />,
};

// Event type badge mapping
const eventTypeBadge = (type: string) => {
  const types: Record<string, JSX.Element> = {
    'PLANNING_STARTED': <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">Planning Started</Badge>,
    'STRATEGY_PROPOSED': <Badge variant="outline" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">Strategy Proposed</Badge>,
    'STRATEGY_SELECTED': <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Strategy Selected</Badge>,
    'EXECUTION_STARTED': <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">Execution Started</Badge>,
    'TRANSACTION_CONFIRMED': <Badge variant="success">Transaction Confirmed</Badge>,
    'TRANSACTION_FAILED': <Badge variant="destructive">Transaction Failed</Badge>,
    'MARKET_UPDATE': <Badge variant="outline" className="bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300">Market Update</Badge>,
    'ADAPTATION_STARTED': <Badge variant="outline" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">Adaptation Started</Badge>,
    'GOAL_COMPLETED': <Badge variant="default">Goal Completed</Badge>,
  };
  
  return types[type] || <Badge variant="outline">{type}</Badge>;
};

export interface GoalMonitoringDashboardProps {
  refreshInterval?: number; // in milliseconds
  maxGoalsToShow?: number;
  maxEventsToShow?: number;
  showCompletedGoals?: boolean;
  onGoalClick?: (goalId: string) => void;
}

export function GoalMonitoringDashboard({
  refreshInterval = 30000, // Default to 30 seconds
  maxGoalsToShow = 5,
  maxEventsToShow = 10,
  showCompletedGoals = true,
  onGoalClick,
}: GoalMonitoringDashboardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [farms, setFarms] = useState<Record<string, FarmDetails>>({});
  const [monitoringEvents, setMonitoringEvents] = useState<(GoalMonitoringEvent & { goal?: Goal })[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState('active-goals');
  
  // Fetch all required data
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch goals
      const goalsResponse = await fetch('/api/goals/acquisition');
      const goalsResult = await goalsResponse.json();
      
      if (goalsResult.data) {
        setGoals(goalsResult.data);
        
        // Fetch farm details for all farms
        const farmIds = [...new Set(goalsResult.data.map((goal: Goal) => goal.farm_id))];
        const fetchedFarms: Record<string, FarmDetails> = {};
        
        for (const farmId of farmIds) {
          const farmResponse = await fetch(`/api/farms/${farmId}`);
          const farmResult = await farmResponse.json();
          
          if (farmResult.data) {
            fetchedFarms[farmId] = farmResult.data;
          }
        }
        
        setFarms(fetchedFarms);
        
        // Fetch recent monitoring events
        const eventsResponse = await fetch('/api/goals/acquisition/monitoring/recent');
        const eventsResult = await eventsResponse.json();
        
        if (eventsResult.data) {
          // Add goal information to each event
          const eventsWithGoals = eventsResult.data.map((event: GoalMonitoringEvent) => {
            const goal = goalsResult.data.find((g: Goal) => g.id === event.goal_id);
            return { ...event, goal };
          });
          
          setMonitoringEvents(eventsWithGoals);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load monitoring dashboard');
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  };
  
  // Initial data fetch
  useEffect(() => {
    fetchDashboardData();
  }, []);
  
  // Set up refresh interval
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchDashboardData();
    }, refreshInterval);
    
    return () => clearInterval(intervalId);
  }, [refreshInterval]);
  
  // Calculate progress percentage
  const getProgressPercentage = (goal: Goal) => {
    return Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100));
  };
  
  // Navigate to goal details page
  const handleGoalClick = (goalId: string) => {
    if (onGoalClick) {
      onGoalClick(goalId);
    } else {
      router.push(`/dashboard/goals/acquisition/${goalId}`);
    }
  };
  
  // Filter goals by status
  const activeGoals = goals.filter(goal => 
    !['COMPLETED', 'FAILED'].includes(goal.status)
  ).slice(0, maxGoalsToShow);
  
  const completedGoals = goals.filter(goal => 
    ['COMPLETED', 'FAILED'].includes(goal.status)
  ).slice(0, maxGoalsToShow);
  
  // Filter monitoring events
  // Sort by created_at descending and take maxEventsToShow
  const recentEvents = monitoringEvents
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, maxEventsToShow);
  
  // Render loading skeleton
  if (loading && goals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="active-goals">
            <TabsList className="mb-4">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24 ml-2" />
              <Skeleton className="h-9 w-32 ml-2" />
            </TabsList>
            
            <TabsContent value="active-goals">
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-[80px] w-full" />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter>
          <Skeleton className="h-4 w-48" />
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Goal Monitoring Dashboard</CardTitle>
            <CardDescription>
              Track progress of your token acquisition goals
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={fetchDashboardData}
            title="Refresh data"
          >
            <ReloadIcon className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs 
          defaultValue="active-goals" 
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <TabsList className="mb-4">
            <TabsTrigger value="active-goals">
              Active Goals
              {activeGoals.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeGoals.length}
                </Badge>
              )}
            </TabsTrigger>
            {showCompletedGoals && (
              <TabsTrigger value="completed-goals">
                Completed
                {completedGoals.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {completedGoals.length}
                  </Badge>
                )}
              </TabsTrigger>
            )}
            <TabsTrigger value="recent-events">
              Recent Events
              {recentEvents.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {recentEvents.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          {/* Active Goals Tab */}
          <TabsContent value="active-goals">
            {activeGoals.length > 0 ? (
              <div className="space-y-4">
                {activeGoals.map(goal => (
                  <div
                    key={goal.id}
                    className="border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors"
                    onClick={() => handleGoalClick(goal.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium">{goal.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {farms[goal.farm_id]?.name && (
                            <span>Farm: {farms[goal.farm_id].name}</span>
                          )}
                          <span>•</span>
                          <span>
                            {goal.current_amount.toLocaleString()} / {goal.target_amount.toLocaleString()} {goal.selected_asset}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {statusBadge[goal.status]}
                        {goal.status === 'ACTIVE' && (
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center gap-2 mb-1">
                      <Progress value={getProgressPercentage(goal)} className="h-2 flex-grow" />
                      <span className="text-sm font-medium">{getProgressPercentage(goal)}%</span>
                    </div>
                    
                    {goal.status === 'ACTIVE' && goal.phase && (
                      <div className="text-xs text-muted-foreground mt-2">
                        Current Phase: {goal.phase}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border rounded-lg">
                <p className="text-muted-foreground">No active acquisition goals</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => router.push('/dashboard/goals/acquisition/create')}
                >
                  Create Goal
                </Button>
              </div>
            )}
          </TabsContent>
          
          {/* Completed Goals Tab */}
          {showCompletedGoals && (
            <TabsContent value="completed-goals">
              {completedGoals.length > 0 ? (
                <div className="space-y-4">
                  {completedGoals.map(goal => (
                    <div
                      key={goal.id}
                      className="border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors"
                      onClick={() => handleGoalClick(goal.id)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium">{goal.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {farms[goal.farm_id]?.name && (
                              <span>Farm: {farms[goal.farm_id].name}</span>
                            )}
                            <span>•</span>
                            <span>
                              {goal.current_amount.toLocaleString()} / {goal.target_amount.toLocaleString()} {goal.selected_asset}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {statusBadge[goal.status]}
                          {goal.status === 'COMPLETED' ? (
                            <CheckCircledIcon className="h-4 w-4 text-green-500" />
                          ) : (
                            <CrossCircledIcon className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </div>
                      
                      <Progress value={getProgressPercentage(goal)} className="h-2 mb-2" />
                      
                      <div className="text-xs text-muted-foreground mt-2">
                        {goal.completed_at 
                          ? `Completed on ${format(new Date(goal.completed_at), 'PPP')}`
                          : `Last updated on ${format(new Date(goal.updated_at), 'PPP')}`}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border rounded-lg">
                  <p className="text-muted-foreground">No completed acquisition goals</p>
                </div>
              )}
            </TabsContent>
          )}
          
          {/* Recent Events Tab */}
          <TabsContent value="recent-events">
            {recentEvents.length > 0 ? (
              <div className="space-y-3">
                {recentEvents.map(event => (
                  <div 
                    key={event.id} 
                    className="border rounded-lg p-3 hover:border-muted-foreground transition-colors"
                    onClick={event.goal ? () => handleGoalClick(event.goal_id) : undefined}
                    style={{ cursor: event.goal ? 'pointer' : 'default' }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5">
                          {severityIcon[event.severity as keyof typeof severityIcon] || 
                            severityIcon.INFO}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            {eventTypeBadge(event.event_type)}
                            {event.goal && (
                              <span className="text-sm font-medium">
                                {event.goal.name}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {format(new Date(event.created_at), 'PPp')}
                            {event.agent && (
                              <> • Agent: {event.agent.name}</>
                            )}
                          </div>
                        </div>
                      </div>
                      {event.goal && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGoalClick(event.goal_id);
                          }}
                        >
                          <ArrowUpRight className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    
                    {event.event_data && Object.keys(event.event_data).length > 0 && (
                      <div className="mt-2 text-xs bg-muted/40 p-2 rounded">
                        <pre className="whitespace-pre-wrap break-words">
                          {JSON.stringify(event.event_data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border rounded-lg">
                <p className="text-muted-foreground">No recent events</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Last updated: {format(lastRefresh, 'PPp')}
      </CardFooter>
    </Card>
  );
}
