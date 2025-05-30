'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  AlertCircle, 
  AlertTriangle, 
  Bell, 
  CheckCircle2, 
  Clock, 
  Info,
  Zap,
  RefreshCw
} from 'lucide-react';

import { streamingMonitoringService } from '@/services/streaming-monitoring-service';
import { GoalMonitoringEvent } from '@/types/goal-types';

// Severity icon mapping
const severityIcon = {
  INFO: <Info className="h-4 w-4 text-blue-500" />,
  WARNING: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  ERROR: <AlertCircle className="h-4 w-4 text-red-500" />,
  SUCCESS: <CheckCircle2 className="h-4 w-4 text-green-500" />,
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
    'AGENT_ACTIVITY': <Badge variant="outline" className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300">Agent Activity</Badge>,
    'AGENT_INITIALIZED': <Badge variant="outline" className="bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300">Agent Initialized</Badge>,
  };
  
  return types[type] || <Badge variant="outline">{type}</Badge>;
};

export interface RealTimeMonitoringFeedProps {
  goalId?: string;
  maxEvents?: number;
  height?: string;
  showGoalSelector?: boolean;
  onEventClick?: (event: GoalMonitoringEvent) => void;
}

export function RealTimeMonitoringFeed({
  goalId,
  maxEvents = 10,
  height = "400px",
  showGoalSelector = false,
  onEventClick
}: RealTimeMonitoringFeedProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<GoalMonitoringEvent[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  // On mount, initialize streaming service and fetch initial events
  useEffect(() => {
    streamingMonitoringService.initialize();
    fetchInitialEvents();
    
    return () => {
      // No need to cleanup the streaming service on component unmount
      // as it's a singleton that may be used by other components
    };
  }, [goalId]);
  
  // Subscribe to real-time updates
  useEffect(() => {
    if (!goalId) return;
    
    // Subscribe to updates for this goal
    const unsubscribe = streamingMonitoringService.subscribeToGoal(goalId, (event) => {
      // Add new event to the list and maintain max count
      setEvents(prev => {
        const newEvents = [event, ...prev];
        if (newEvents.length > maxEvents) {
          return newEvents.slice(0, maxEvents);
        }
        return newEvents;
      });
      
      setLastUpdate(new Date());
      
      // Show toast notification for important events
      if (event.severity === 'ERROR' || event.severity === 'WARNING') {
        toast(event.event_type, {
          description: `${new Date(event.created_at).toLocaleTimeString()}: ${JSON.stringify(event.event_data || {}).slice(0, 100)}...`,
          action: {
            label: "View",
            onClick: () => onEventClick?.(event),
          },
        });
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [goalId, maxEvents, onEventClick]);
  
  // Filter events when filter changes
  useEffect(() => {
    if (filter === 'all') return;
    
    setEvents(prev => 
      prev.filter(event => 
        filter === 'errors' 
          ? event.severity === 'ERROR' 
          : filter === 'transactions'
            ? event.event_type.includes('TRANSACTION')
            : filter === 'agents'
              ? event.event_type.includes('AGENT')
              : true
      )
    );
  }, [filter]);
  
  // Fetch initial events
  const fetchInitialEvents = async () => {
    setLoading(true);
    try {
      const url = `/api/goals/acquisition/monitoring/recent?limit=${maxEvents}${goalId ? `&goal_id=${goalId}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.data) {
        setEvents(result.data);
      }
    } catch (error) {
      console.error('Error fetching monitoring events:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Refresh events
  const refreshEvents = () => {
    fetchInitialEvents();
    setLastUpdate(new Date());
  };
  
  // Format date for display
  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'HH:mm:ss');
    } catch (error) {
      return dateString;
    }
  };
  
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle>Real-time Monitoring</CardTitle>
          </div>
          <Button size="sm" variant="ghost" onClick={refreshEvents}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
        <CardDescription>
          Live updates of goal acquisition activities
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full" onValueChange={setFilter}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All Events</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="agents">Agent Activity</TabsTrigger>
            <TabsTrigger value="errors">Errors</TabsTrigger>
          </TabsList>
          
          <ScrollArea className="h-[300px] mt-2">
            {loading ? (
              <div className="space-y-2 mt-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            ) : events.length > 0 ? (
              <div className="space-y-2 pt-2">
                {events.map((event) => (
                  <div 
                    key={event.id} 
                    className="border-b pb-2 last:border-b-0 hover:bg-muted/20 p-2 rounded-md cursor-pointer transition-colors"
                    onClick={() => onEventClick?.(event)}
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5">
                        {severityIcon[event.severity as keyof typeof severityIcon] || 
                          severityIcon.INFO}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{formatTime(event.created_at)}</span>
                          </div>
                          {eventTypeBadge(event.event_type)}
                        </div>
                        <div className="mt-1 text-xs line-clamp-2">
                          {event.event_data ? (
                            <pre className="whitespace-pre-wrap font-mono text-xs">
                              {JSON.stringify(event.event_data, null, 2).slice(0, 150)}
                              {JSON.stringify(event.event_data, null, 2).length > 150 ? '...' : ''}
                            </pre>
                          ) : (
                            <span className="text-muted-foreground">No additional data</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-8">
                <Bell className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No events to display</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Events will appear here as agents work on your goals
                </p>
              </div>
            )}
          </ScrollArea>
        </Tabs>
      </CardContent>
      <CardFooter className="pt-2 text-xs text-muted-foreground flex justify-between">
        <div>
          Last updated: {format(lastUpdate, 'HH:mm:ss')}
        </div>
        {goalId && (
          <Button 
            variant="link" 
            size="sm" 
            className="h-auto p-0"
            onClick={() => router.push(`/dashboard/goals/acquisition/${goalId}`)}
          >
            View Goal Details
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
