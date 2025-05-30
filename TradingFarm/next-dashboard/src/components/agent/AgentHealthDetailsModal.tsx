'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { LineChart, BarChart, XAxis, YAxis, Tooltip, Legend, Line, Bar, ResponsiveContainer } from 'recharts';
import { Loader2, AlertTriangle, AlertCircle, CheckCircle, Terminal, Timer, History } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { createBrowserClient } from '@/utils/supabase/client';
import { AgentHealthData, CircuitBreakerStatus, AgentEventData } from '@/lib/agents/health-monitor';

interface AgentHealthDetailsModalProps {
  agentId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AgentHealthDetailsModal({ agentId, isOpen, onClose }: AgentHealthDetailsModalProps) {
  const [health, setHealth] = useState<AgentHealthData | null>(null);
  const [events, setEvents] = useState<AgentEventData[]>([]);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('overview');

  useEffect(() => {
    if (isOpen && agentId) {
      loadAgentHealthData();
      
      // Set up real-time subscription
      const supabase = createBrowserClient();
      const healthSubscription = supabase
        .channel(`agent_health:${agentId}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'agent_health',
          filter: `agent_id=eq.${agentId}` 
        }, (payload) => {
          setHealth(payload.new as AgentHealthData);
        })
        .subscribe();
        
      const eventsSubscription = supabase
        .channel(`agent_events:${agentId}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'agent_events',
          filter: `agent_id=eq.${agentId}` 
        }, (payload) => {
          setEvents(prev => [payload.new as AgentEventData, ...prev.slice(0, 19)]);
        })
        .subscribe();
      
      return () => {
        healthSubscription.unsubscribe();
        eventsSubscription.unsubscribe();
      };
    }
  }, [isOpen, agentId]);

  async function loadAgentHealthData() {
    if (!agentId) return;
    
    setIsLoading(true);
    const supabase = createBrowserClient();
    
    try {
      // Fetch current health data
      const { data: healthData, error: healthError } = await supabase
        .from('agent_health')
        .select('*')
        .eq('agent_id', agentId)
        .single();
        
      if (healthError) throw healthError;
      
      // Fetch recent events
      const { data: eventData, error: eventError } = await supabase
        .from('agent_events')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(20);
        
      if (eventError) throw eventError;
      
      // Fetch historical health data for charts (last 24 hours)
      const { data: histData, error: histError } = await supabase
        .from('agent_health_history')
        .select('*')
        .eq('agent_id', agentId)
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('timestamp', { ascending: true });
        
      if (histError) throw histError;
      
      setHealth(healthData || null);
      setEvents(eventData || []);
      
      // Format historical data for charts
      const formattedHistData = (histData || []).map(item => ({
        ...item,
        time: format(new Date(item.timestamp), 'HH:mm'),
        cpu: item.cpu_usage,
        memory: item.memory_usage,
        tasks: item.active_tasks,
      }));
      
      setHistoricalData(formattedHistData);
    } catch (error) {
      console.error('Error loading agent health data:', error);
    } finally {
      setIsLoading(false);
    }
  }
  
  function getStatusColor(status: string) {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'warning': return 'text-amber-500';
      case 'critical': return 'text-red-500';
      case 'inactive': return 'text-gray-500';
      default: return 'text-blue-500';
    }
  }
  
  function getStatusIcon(status: string) {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'critical': return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'inactive': return <Timer className="h-5 w-5 text-gray-500" />;
      default: return null;
    }
  }
  
  function getSeverityColor(severity: string) {
    switch (severity) {
      case 'info': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'warning': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300';
      case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  }
  
  function getCircuitBreakerStatus(status: CircuitBreakerStatus) {
    switch (status) {
      case 'triggered': 
        return <Badge variant="destructive">Circuit Breaker Triggered</Badge>;
      case 'cleared': 
        return <Badge variant="outline">Circuit Breaker Cleared</Badge>;
      case 'none':
      default:
        return <Badge variant="secondary">No Circuit Breaker</Badge>;
    }
  }
  
  if (!isOpen) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agent Health Details</DialogTitle>
          <DialogDescription>
            Comprehensive health metrics and event history
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4 py-4">
              {health ? (
                <>
                  <div className="flex items-center space-x-2 mb-4">
                    {getStatusIcon(health.status)}
                    <span className={`text-lg font-semibold ${getStatusColor(health.status)}`}>
                      {health.status.charAt(0).toUpperCase() + health.status.slice(1)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Resource Utilization</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">CPU Usage</span>
                              <span className="text-sm font-medium">{health.cpu_usage}%</span>
                            </div>
                            <Progress value={health.cpu_usage} className="h-2" />
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Memory Usage</span>
                              <span className="text-sm font-medium">{health.memory_usage}%</span>
                            </div>
                            <Progress value={health.memory_usage} className="h-2" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Activity Metrics</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm text-muted-foreground">Active Tasks</div>
                            <div className="text-2xl font-bold">{health.active_tasks}</div>
                          </div>
                          
                          <div>
                            <div className="text-sm text-muted-foreground">Uptime</div>
                            <div className="text-lg font-medium">
                              {Math.floor(health.uptime_seconds / 3600)}h {Math.floor((health.uptime_seconds % 3600) / 60)}m
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-sm text-muted-foreground">Errors</div>
                            <div className="text-2xl font-bold text-red-500">{health.error_count}</div>
                          </div>
                          
                          <div>
                            <div className="text-sm text-muted-foreground">Warnings</div>
                            <div className="text-2xl font-bold text-amber-500">{health.warning_count}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">System Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Circuit Breaker</span>
                          <div>{getCircuitBreakerStatus(health.circuit_breaker_status)}</div>
                        </div>
                        
                        {health.circuit_breaker_reason && (
                          <div className="text-sm border rounded-md p-2 bg-muted">
                            {health.circuit_breaker_reason}
                          </div>
                        )}
                        
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Last Health Check</span>
                          <span className="text-sm">
                            {formatDistanceToNow(new Date(health.health_check_timestamp), { addSuffix: true })}
                          </span>
                        </div>
                        
                        {health.last_event_timestamp && (
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Last Event</span>
                            <span className="text-sm">
                              {formatDistanceToNow(new Date(health.last_event_timestamp), { addSuffix: true })}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  
                  {events.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Recent Events</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                          {events.slice(0, 5).map((event, i) => (
                            <div key={i} className="flex items-start space-x-2 text-sm border-b pb-2">
                              <Badge className={getSeverityColor(event.severity)}>
                                {event.severity}
                              </Badge>
                              <div className="flex-1">
                                <div>{event.message}</div>
                                <div className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(event.created_at || ''), { addSuffix: true })}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg">No health data available for this agent</p>
                  <p className="text-sm text-muted-foreground">The agent may be new or has not reported health metrics yet</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="metrics" className="space-y-4 py-4">
              <Card>
                <CardHeader>
                  <CardTitle>Resource Metrics</CardTitle>
                  <CardDescription>CPU and memory utilization over time</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {historicalData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={historicalData}>
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="cpu" stroke="#3b82f6" name="CPU %" />
                        <Line type="monotone" dataKey="memory" stroke="#8b5cf6" name="Memory %" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <History className="h-12 w-12 text-muted-foreground mb-2" />
                      <p>No historical metrics available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Activity Metrics</CardTitle>
                  <CardDescription>Agent tasks and error counts</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {historicalData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={historicalData}>
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="tasks" fill="#22c55e" name="Active Tasks" />
                        <Bar dataKey="error_count" fill="#ef4444" name="Errors" />
                        <Bar dataKey="warning_count" fill="#f59e0b" name="Warnings" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <History className="h-12 w-12 text-muted-foreground mb-2" />
                      <p>No historical metrics available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {health?.response_time !== undefined && (
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-muted rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold">{health.response_time}ms</div>
                        <div className="text-sm text-muted-foreground">Response Time</div>
                      </div>
                      
                      <div className="bg-muted rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold">{health.last_execution_time || 'N/A'}ms</div>
                        <div className="text-sm text-muted-foreground">Last Execution</div>
                      </div>
                      
                      <div className="bg-muted rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold">{health.queued_tasks || 0}</div>
                        <div className="text-sm text-muted-foreground">Queued Tasks</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="events" className="py-4">
              <Card>
                <CardHeader>
                  <CardTitle>Event History</CardTitle>
                  <CardDescription>Recent agent events, alerts, and notifications</CardDescription>
                </CardHeader>
                <CardContent>
                  {events.length > 0 ? (
                    <div className="space-y-4 max-h-[600px] overflow-y-auto">
                      {events.map((event, i) => (
                        <div key={i} className="flex border rounded-lg p-3 hover:bg-muted transition-colors">
                          <div className="mr-3">
                            {event.severity === 'critical' || event.severity === 'error' ? (
                              <AlertCircle className="h-5 w-5 text-red-500" />
                            ) : event.severity === 'warning' ? (
                              <AlertTriangle className="h-5 w-5 text-amber-500" />
                            ) : (
                              <Terminal className="h-5 w-5 text-blue-500" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={getSeverityColor(event.severity)}>
                                {event.severity}
                              </Badge>
                              <Badge variant="outline">{event.event_type}</Badge>
                              <span className="text-xs text-muted-foreground ml-auto">
                                {event.created_at && format(new Date(event.created_at), 'MMM d, yyyy HH:mm:ss')}
                              </span>
                            </div>
                            <p className="mb-1">{event.message}</p>
                            {event.metadata && Object.keys(event.metadata).length > 0 && (
                              <div className="text-xs bg-muted p-2 rounded-md font-mono overflow-x-auto">
                                {JSON.stringify(event.metadata, null, 2)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64">
                      <Terminal className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-lg">No events recorded</p>
                      <p className="text-sm text-muted-foreground">Events will appear here as they occur</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="history" className="py-4">
              <Card>
                <CardHeader>
                  <CardTitle>Health History</CardTitle>
                  <CardDescription>24-hour health status timeline</CardDescription>
                </CardHeader>
                <CardContent>
                  {historicalData.length > 0 ? (
                    <div className="space-y-6">
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={historicalData}>
                            <XAxis dataKey="time" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="cpu" stroke="#3b82f6" name="CPU %" />
                            <Line type="monotone" dataKey="memory" stroke="#8b5cf6" name="Memory %" />
                            <Line type="monotone" dataKey="tasks" stroke="#22c55e" name="Tasks" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      
                      <div className="border rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-border">
                          <thead className="bg-muted">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Time</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">CPU</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Memory</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Tasks</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Errors</th>
                            </tr>
                          </thead>
                          <tbody className="bg-card divide-y divide-border">
                            {historicalData.slice(-10).reverse().map((item, i) => (
                              <tr key={i} className="hover:bg-muted/50 transition-colors">
                                <td className="px-4 py-2 text-sm">
                                  {format(new Date(item.timestamp), 'HH:mm:ss')}
                                </td>
                                <td className="px-4 py-2">
                                  <Badge className={
                                    item.status === 'healthy' ? 'bg-green-100 text-green-800' :
                                    item.status === 'warning' ? 'bg-amber-100 text-amber-800' :
                                    item.status === 'critical' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                  }>
                                    {item.status}
                                  </Badge>
                                </td>
                                <td className="px-4 py-2 text-sm">{item.cpu_usage}%</td>
                                <td className="px-4 py-2 text-sm">{item.memory_usage}%</td>
                                <td className="px-4 py-2 text-sm">{item.active_tasks}</td>
                                <td className="px-4 py-2 text-sm">{item.error_count}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64">
                      <History className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-lg">No historical data available</p>
                      <p className="text-sm text-muted-foreground">Health history will appear here as it's collected</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => loadAgentHealthData()}>
            Refresh Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
