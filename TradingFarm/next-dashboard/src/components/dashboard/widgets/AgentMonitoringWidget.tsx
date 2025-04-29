'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createBrowserClient } from '@/utils/supabase/client';
import { useSupabaseQuery } from '@/hooks/use-supabase';
import { handleSupabaseError } from '@/utils/error-handling';
import { logEvent } from '@/utils/logging';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn, widgetContainerStyles, statusBadgeStyles } from '@/utils/component-styles';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertCircle, CheckCircle, RefreshCw, Activity, Clock } from 'lucide-react';
import AgentList from '@/components/agent/AgentList';
import { format } from 'date-fns';

type AgentEvent = {
  id: string;
  agent_id: string;
  event_type: string;
  event_details: Record<string, any>;
  severity: 'info' | 'warning' | 'error';
  created_at: string;
};

type AgentEventsData = {
  events: AgentEvent[];
  eventTypes: {
    type: string;
    count: number;
  }[];
  eventSeverity: {
    name: string;
    value: number;
  }[];
  loading: boolean;
  error: string | null;
};

type AgentHealthSummary = {
  total: number;
  online: number;
  offline: number;
  warning: number;
  error: number;
};

const SEVERITY_COLORS = {
  info: '#3b82f6',
  warning: '#f59e0b',
  error: '#ef4444',
};

const PIE_COLORS = ['#16a34a', '#d97706', '#dc2626', '#6b7280'];

interface AgentMonitoringWidgetProps {
  farmId: string;
  className?: string;
}

export default function AgentMonitoringWidget({ farmId, className }: AgentMonitoringWidgetProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [agentEvents, setAgentEvents] = useState<AgentEventsData>({
    events: [],
    eventTypes: [],
    eventSeverity: [],
    loading: true,
    error: null,
  });
  const [healthSummary, setHealthSummary] = useState<AgentHealthSummary>({
    total: 0,
    online: 0,
    offline: 0,
    warning: 0,
    error: 0,
  });

  // Fetch agent events
  const fetchAgentEvents = async () => {
    if (!farmId) return;
    
    try {
      const supabase = createBrowserClient();
      
      setAgentEvents(prev => ({ ...prev, loading: true, error: null }));
      
      // Get recent events
      const { data: events, error } = await supabase
        .from('agent_events')
        .select('*')
        .eq('farm_id', farmId)
        .order('created_at', { ascending: false })
        .limit(100);
        
      if (error) throw error;
      
      // Calculate event type distribution
      const typeCounts: Record<string, number> = {};
      const severityCounts: Record<string, number> = { info: 0, warning: 0, error: 0 };
      
      events?.forEach(event => {
        // Count by event type
        if (!typeCounts[event.event_type]) {
          typeCounts[event.event_type] = 0;
        }
        typeCounts[event.event_type]++;
        
        // Count by severity
        if (severityCounts[event.severity] !== undefined) {
          severityCounts[event.severity]++;
        }
      });
      
      // Format for charts
      const eventTypes = Object.entries(typeCounts).map(([type, count]) => ({
        type,
        count,
      })).sort((a, b) => b.count - a.count);
      
      const eventSeverity = Object.entries(severityCounts).map(([name, value]) => ({
        name,
        value,
      }));
      
      // Update state with all the event data
      setAgentEvents({
        events: events || [],
        eventTypes,
        eventSeverity,
        loading: false,
        error: null,
      });
      
      // Log successful fetch
      logEvent({
        category: 'agents',
        action: 'fetch_agent_events',
        label: `Fetched ${events?.length || 0} events for farm ${farmId}`,
      });
      
    } catch (err) {
      const errorMessage = handleSupabaseError(err, 'Failed to fetch agent events');
      setAgentEvents(prev => ({ ...prev, loading: false, error: errorMessage }));
      
      // Log error
      logEvent({
        category: 'agents',
        action: 'fetch_agent_events_error',
        label: errorMessage,
        error: err,
      });
    }
  };
  
  // Fetch agent health summary
  const fetchHealthSummary = async () => {
    if (!farmId) return;
    
    try {
      const supabase = createBrowserClient();
      
      // Get overall health status counts
      const { data, error } = await supabase
        .from('agent_health')
        .select('status, count(*)')
        .eq('farm_id', farmId)
        .group('status');
        
      if (error) throw error;
      
      // Calculate summary counts
      let total = 0;
      let online = 0;
      let offline = 0;
      let warning = 0;
      let errorCount = 0;
      
      data?.forEach(item => {
        const count = parseInt(item.count);
        total += count;
        
        switch (item.status.toLowerCase()) {
          case 'online':
          case 'active':
            online += count;
            break;
          case 'offline':
          case 'inactive':
            offline += count;
            break;
          case 'warning':
            warning += count;
            break;
          case 'error':
            errorCount += count;
            break;
        }
      });
      
      setHealthSummary({
        total,
        online,
        offline,
        warning,
        error: errorCount,
      });
      
    } catch (err) {
      // Log error but don't show to user (will rely on AgentList error handling)
      logEvent({
        category: 'agents',
        action: 'fetch_health_summary_error',
        label: 'Failed to fetch agent health summary',
        error: err,
      });
    }
  };
  
  // Setup real-time subscription for agent events
  useEffect(() => {
    if (!farmId) return;
    
    const supabase = createBrowserClient();
    
    // Initial fetch
    fetchAgentEvents();
    fetchHealthSummary();
    
    // Subscribe to new events
    const subscription = supabase
      .channel('agent-events-monitoring')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_events',
          filter: `farm_id=eq.${farmId}`,
        },
        () => {
          // Refresh data when new events occur
          fetchAgentEvents();
          fetchHealthSummary();
        }
      )
      .subscribe();
      
    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [farmId]);
  
  // Format event time
  const formatEventTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, h:mm:ss a');
    } catch (e) {
      return 'Invalid date';
    }
  };
  
  // Render severity icon
  const renderSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <Activity className="h-4 w-4 text-yellow-500" />;
      case 'info':
      default:
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
    }
  };
  
  // Format event content for display
  const formatEventContent = (event: AgentEvent) => {
    // Format based on event type
    switch (event.event_type) {
      case 'status_change':
        return `Status changed to ${event.event_details.new_status}`;
      case 'command_executed':
        return `Executed command: ${event.event_details.command || 'Unknown command'}`;
      case 'performance_alert':
        return `Performance alert: ${event.event_details.message || 'Unusual metrics detected'}`;
      case 'error_occurred':
        return `Error: ${event.event_details.message || 'Unknown error'}`;
      case 'task_completed':
        return `Task completed: ${event.event_details.task_name || 'Unnamed task'}`;
      default:
        // Generic format if type is not specifically handled
        return event.event_details.message || `${event.event_type} event occurred`;
    }
  };
  
  return (
    <div className={cn(widgetContainerStyles({ size: 'auto' }), className)}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between px-6 pt-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Agent Monitoring</h2>
            <p className="text-muted-foreground">
              Monitor agent health and activity
            </p>
          </div>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="overview" className="p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-0">
                  <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
                </div>
                <div className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{healthSummary.total}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-0">
                  <CardTitle className="text-sm font-medium">Online</CardTitle>
                </div>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{healthSummary.online}</div>
                <p className="text-xs text-muted-foreground">
                  {healthSummary.total ? Math.round((healthSummary.online / healthSummary.total) * 100) : 0}% of agents
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-0">
                  <CardTitle className="text-sm font-medium">Warnings</CardTitle>
                </div>
                <Activity className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{healthSummary.warning}</div>
                <p className="text-xs text-muted-foreground">
                  {healthSummary.total ? Math.round((healthSummary.warning / healthSummary.total) * 100) : 0}% of agents
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-0">
                  <CardTitle className="text-sm font-medium">Errors</CardTitle>
                </div>
                <AlertCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{healthSummary.error}</div>
                <p className="text-xs text-muted-foreground">
                  {healthSummary.total ? Math.round((healthSummary.error / healthSummary.total) * 100) : 0}% of agents
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-4 mt-4 md:grid-cols-2">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Agent Status Distribution</CardTitle>
                <CardDescription>Current agent health status</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center">
                {healthSummary.total > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Online', value: healthSummary.online },
                          { name: 'Warning', value: healthSummary.warning },
                          { name: 'Error', value: healthSummary.error },
                          { name: 'Offline', value: healthSummary.offline },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => 
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {PIE_COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-muted-foreground text-center py-10">
                    No agent data available
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Event Types</CardTitle>
                <CardDescription>Distribution of recent event types</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {agentEvents.eventTypes.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={agentEvents.eventTypes.slice(0, 5)}
                      layout="vertical"
                      margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
                    >
                      <XAxis type="number" />
                      <YAxis 
                        type="category" 
                        dataKey="type" 
                        tick={{ fontSize: 12 }}
                        width={120}
                      />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-muted-foreground text-center py-10">
                    {agentEvents.loading ? 
                      <div className="flex flex-col items-center">
                        <RefreshCw className="h-8 w-8 animate-spin mb-2" />
                        <span>Loading event data...</span>
                      </div> : 
                      'No event data available'}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Agent Events</CardTitle>
                <CardDescription>Latest 5 events across all agents</CardDescription>
              </CardHeader>
              <CardContent>
                {agentEvents.events.length > 0 ? (
                  <div className="space-y-4">
                    {agentEvents.events.slice(0, 5).map(event => (
                      <div key={event.id} className="flex items-start space-x-3 p-3 rounded-md bg-muted/40">
                        <div className="mt-0.5">
                          {renderSeverityIcon(event.severity)}
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium">{formatEventContent(event)}</p>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 mr-1" />
                            <span>{formatEventTime(event.created_at)}</span>
                            <Badge 
                              variant="outline" 
                              className={cn("ml-2 text-[10px]", 
                                event.severity === 'error' ? "text-red-500 border-red-200" : 
                                event.severity === 'warning' ? "text-yellow-500 border-yellow-200" : 
                                "text-blue-500 border-blue-200"
                              )}
                            >
                              {event.severity}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground text-center py-6">
                    {agentEvents.loading ? 
                      <div className="flex flex-col items-center">
                        <RefreshCw className="h-8 w-8 animate-spin mb-2" />
                        <span>Loading event data...</span>
                      </div> : 
                      'No recent events found'}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="agents" className="px-6 pb-6">
          <AgentList farmId={farmId} />
        </TabsContent>
        
        <TabsContent value="events" className="px-6 pb-6">
          <Card>
            <CardHeader>
              <CardTitle>Agent Event Log</CardTitle>
              <CardDescription>
                Showing the latest {agentEvents.events.length} events from all agents
              </CardDescription>
            </CardHeader>
            <CardContent>
              {agentEvents.loading ? (
                <div className="flex items-center justify-center py-10">
                  <RefreshCw className="h-8 w-8 animate-spin mr-2" />
                  <span>Loading event data...</span>
                </div>
              ) : agentEvents.events.length === 0 ? (
                <div className="text-muted-foreground text-center py-8">
                  No events found for this farm
                </div>
              ) : (
                <div className="space-y-4">
                  {agentEvents.events.map(event => (
                    <div key={event.id} className="flex gap-4 items-start p-4 border rounded-md">
                      <div className="mt-0.5">
                        {renderSeverityIcon(event.severity)}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-1">
                          <p className="font-medium">{event.event_type}</p>
                          <div className="flex items-center text-xs text-muted-foreground mt-1 sm:mt-0">
                            <Clock className="h-3 w-3 mr-1" />
                            <span>{formatEventTime(event.created_at)}</span>
                          </div>
                        </div>
                        <p className="text-sm">{formatEventContent(event)}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              event.severity === 'error' ? "text-red-500 border-red-200" : 
                              event.severity === 'warning' ? "text-yellow-500 border-yellow-200" : 
                              "text-blue-500 border-blue-200"
                            )}
                          >
                            {event.severity}
                          </Badge>
                          {Object.entries(event.event_details)
                            .filter(([key]) => !['message'].includes(key))
                            .slice(0, 3)
                            .map(([key, value]) => (
                              <Badge key={key} variant="outline" className="text-xs">
                                {key}: {typeof value === 'string' ? value : JSON.stringify(value)}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
