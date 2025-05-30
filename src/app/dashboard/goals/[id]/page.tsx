'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Target, 
  ArrowLeft,
  Calendar, 
  BarChart4, 
  History, 
  RefreshCw, 
  ChevronRight, 
  Clock,
  PencilLine,
  Archive,
  Trash2,
  AlertCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { createBrowserClient } from '@/utils/supabase/client';
import { ExtendedGoal, GoalHistory } from '@/types/goals';
import GoalStatusDisplay from '@/components/goals/GoalStatusDisplay';
import { 
  LineChart, 
  Line, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { format, parseISO, formatDistanceToNow } from 'date-fns';

export default function GoalDetailPage({ params }: { params: { id: string } }) {
  const [goal, setGoal] = useState<ExtendedGoal | null>(null);
  const [history, setHistory] = useState<GoalHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchGoalDetails = async () => {
      try {
        setLoading(true);
        
        // Fetch goal with history
        const response = await fetch(`/api/goals/${params.id}?includeHistory=true`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch goal details');
        }
        
        const data = await response.json();
        setGoal(data);
        setHistory(data.history || []);
      } catch (error) {
        console.error('Error fetching goal details:', error);
        toast({
          title: 'Error',
          description: 'Failed to load goal details. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchGoalDetails();
  }, [params.id, toast]);

  const handleStatusChange = async (newStatus: string) => {
    if (!goal) return;
    
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/goals/${goal.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update goal status');
      }

      const { data } = await response.json();
      setGoal(data);

      toast({
        title: 'Goal Updated',
        description: `Goal status changed to ${newStatus.replace('_', ' ')}`,
      });
    } catch (error) {
      console.error('Error updating goal:', error);
      toast({
        title: 'Error',
        description: 'Failed to update goal. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleArchiveToggle = async () => {
    if (!goal) return;
    
    setIsUpdating(true);
    try {
      const newArchiveStatus = !goal.archived;
      const response = await fetch(`/api/goals/${goal.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          archived: newArchiveStatus,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${newArchiveStatus ? 'archive' : 'unarchive'} goal`);
      }

      const { data } = await response.json();
      setGoal(data);

      toast({
        title: newArchiveStatus ? 'Goal Archived' : 'Goal Restored',
        description: newArchiveStatus 
          ? 'Goal has been moved to the archive' 
          : 'Goal has been restored from the archive',
      });
    } catch (error) {
      console.error('Error toggling archive status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update goal. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getGoalTypeLabel = (type: string) => {
    switch (type) {
      case 'profit':
        return 'Profit Target';
      case 'roi':
        return 'ROI';
      case 'trade_count':
        return 'Trade Count';
      case 'win_rate':
        return 'Win Rate';
      case 'custom':
        return 'Custom';
      default:
        return type.replace('_', ' ');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  const getTimeRemainingText = () => {
    if (!goal?.target_date) return 'No deadline set';
    
    const targetDate = new Date(goal.target_date);
    const now = new Date();
    
    if (targetDate < now) {
      return `Deadline passed ${formatDistanceToNow(targetDate, { addSuffix: false })} ago`;
    }
    
    return `${formatDistanceToNow(targetDate)} remaining`;
  };

  const getChartData = () => {
    if (!history.length) return [];
    
    return history
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
      .map(record => ({
        date: format(new Date(record.recorded_at), 'MMM d'),
        value: parseFloat(record.value.toString()),
        progress: parseFloat(record.progress_percentage.toString()),
      }));
  };

  const calculateProjection = () => {
    if (!goal || !history || history.length < 2) return null;
    
    // Sort history by date
    const sortedHistory = [...history].sort(
      (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    );
    
    // Get first and last data points
    const firstRecord = sortedHistory[0];
    const lastRecord = sortedHistory[sortedHistory.length - 1];
    
    // Calculate time difference in days
    const daysDiff = (
      new Date(lastRecord.recorded_at).getTime() - 
      new Date(firstRecord.recorded_at).getTime()
    ) / (1000 * 60 * 60 * 24);
    
    if (daysDiff < 1) return null;
    
    // Calculate daily rate of change
    const valueChange = parseFloat(lastRecord.value.toString()) - parseFloat(firstRecord.value.toString());
    const dailyChange = valueChange / daysDiff;
    
    // If no target date or no target value, we can't project
    if (!goal.target_date || goal.target_value === null) return null;
    
    // Calculate days until target date
    const daysRemaining = (
      new Date(goal.target_date).getTime() - 
      new Date().getTime()
    ) / (1000 * 60 * 60 * 24);
    
    if (daysRemaining <= 0) return null;
    
    // Project final value
    const currentValue = parseFloat(goal.current_value?.toString() || '0');
    const projectedValue = currentValue + (dailyChange * daysRemaining);
    
    // Calculate if on track
    const targetValue = parseFloat(goal.target_value.toString());
    const isOnTrack = dailyChange > 0 
      ? projectedValue >= targetValue 
      : projectedValue <= targetValue;
    
    return {
      projectedValue,
      isOnTrack,
      dailyChange,
      daysRemaining: Math.round(daysRemaining),
    };
  };

  const projection = calculateProjection();

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Skeleton className="h-8 w-1/3" />
        </div>
        
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Goal Not Found</h2>
        <p className="text-muted-foreground mb-6">
          The goal you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <Button onClick={() => router.push('/dashboard/goals')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Goals
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.push('/dashboard/goals')}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center">
              <Target className="mr-2 h-6 w-6 text-primary" />
              {goal.name}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <GoalStatusDisplay status={goal.status} size="md" />
              <span className="text-sm text-muted-foreground">
                {goal.archived && '(Archived)'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => router.push(`/dashboard/goals/${goal.id}/edit`)}
          >
            <PencilLine className="mr-2 h-4 w-4" />
            Edit
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost">
                Actions
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {goal.status !== 'completed' && (
                <DropdownMenuItem
                  onClick={() => handleStatusChange('completed')}
                  disabled={isUpdating}
                >
                  Mark as Completed
                </DropdownMenuItem>
              )}
              {goal.status !== 'in_progress' && goal.status !== 'completed' && (
                <DropdownMenuItem
                  onClick={() => handleStatusChange('in_progress')}
                  disabled={isUpdating}
                >
                  Mark as In Progress
                </DropdownMenuItem>
              )}
              {goal.status !== 'not_started' && (
                <DropdownMenuItem
                  onClick={() => handleStatusChange('not_started')}
                  disabled={isUpdating}
                >
                  Mark as Not Started
                </DropdownMenuItem>
              )}
              {goal.status !== 'missed' && (
                <DropdownMenuItem
                  onClick={() => handleStatusChange('missed')}
                  disabled={isUpdating}
                >
                  Mark as Missed
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem
                onClick={handleArchiveToggle}
                disabled={isUpdating}
              >
                {goal.archived ? 'Restore from Archive' : 'Archive Goal'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {goal.description && (
        <p className="text-muted-foreground max-w-3xl">{goal.description}</p>
      )}
      
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{Math.round(goal.progress_percentage)}%</div>
            <Progress value={goal.progress_percentage} className="h-2 mt-2" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0%</span>
              <span>100%</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Target vs. Current</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between text-2xl font-bold">
              <span>{goal.current_value || 0}</span>
              <span className="text-muted-foreground">/</span>
              <span>{goal.target_value || 0}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Current</span>
              <span>Target</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Time Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {!goal.target_date ? (
                <span className="text-muted-foreground text-lg">No deadline</span>
              ) : (
                formatDistanceToNow(new Date(goal.target_date), { addSuffix: true })
              )}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <Calendar className="h-3 w-3 mr-1" />
              <span>
                {goal.target_date ? formatDate(goal.target_date) : 'No target date set'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="overview" className="space-y-4" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Type</div>
                      <div>{getGoalTypeLabel(goal.goal_type)}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-muted-foreground">Status</div>
                      <div><GoalStatusDisplay status={goal.status} /></div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-muted-foreground">Start Date</div>
                      <div>{goal.start_date ? formatDate(goal.start_date) : 'Not set'}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-muted-foreground">Target Date</div>
                      <div>{goal.target_date ? formatDate(goal.target_date) : 'Not set'}</div>
                    </div>
                    
                    {goal.farm_id && (
                      <div>
                        <div className="text-sm text-muted-foreground">Farm</div>
                        <div>{goal.farm_name || 'Unknown Farm'}</div>
                      </div>
                    )}
                    
                    {goal.agent_id && (
                      <div>
                        <div className="text-sm text-muted-foreground">Agent</div>
                        <div>{goal.agent_name || 'Unknown Agent'}</div>
                      </div>
                    )}
                    
                    {goal.parent_goal_id && (
                      <div>
                        <div className="text-sm text-muted-foreground">Parent Goal</div>
                        <div>{goal.parent?.name || 'Unknown Goal'}</div>
                      </div>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <div className="text-sm text-muted-foreground">Created</div>
                    <div>{formatDate(goal.created_at)}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-muted-foreground">Last Updated</div>
                    <div>{formatDate(goal.updated_at)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Progress Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {projection ? (
                    <>
                      <div className="p-4 rounded-md border bg-card">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium">Projected Outcome</h4>
                          <Badge variant={projection.isOnTrack ? 'success' : 'destructive'}>
                            {projection.isOnTrack ? 'On Track' : 'Off Track'}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Current Value</div>
                            <div className="font-medium">{goal.current_value || 0}</div>
                          </div>
                          
                          <div>
                            <div className="text-muted-foreground">Projected Value</div>
                            <div className="font-medium">{projection.projectedValue.toFixed(2)}</div>
                          </div>
                          
                          <div>
                            <div className="text-muted-foreground">Daily Change</div>
                            <div className="font-medium">{projection.dailyChange.toFixed(4)}</div>
                          </div>
                          
                          <div>
                            <div className="text-muted-foreground">Days Remaining</div>
                            <div className="font-medium">{projection.daysRemaining}</div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <p>Not enough data to calculate projections.</p>
                      <p className="text-xs mt-1">Need at least 2 history points over time.</p>
                    </div>
                  )}
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <h4 className="font-medium">Recent Updates</h4>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setActiveTab('history')}
                      >
                        View All
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                    
                    {history.length > 0 ? (
                      <div className="space-y-2">
                        {history
                          .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())
                          .slice(0, 3)
                          .map(record => (
                            <div key={record.id} className="flex items-center justify-between px-2 py-1 text-sm border-b">
                              <div className="flex items-center">
                                <History className="mr-2 h-4 w-4 text-muted-foreground" />
                                <span>{format(new Date(record.recorded_at), 'MMM d, yyyy h:mm a')}</span>
                              </div>
                              <div className="font-medium">{record.value}</div>
                            </div>
                          ))
                        }
                      </div>
                    ) : (
                      <div className="text-center py-2 text-sm text-muted-foreground">
                        No history records available
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {(history.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Progress Chart</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getChartData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        yAxisId="left"
                        orientation="left"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 12 }}
                        domain={[0, 100]}
                        unit="%"
                      />
                      <Tooltip />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="value"
                        stroke="#6366f1"
                        name="Value"
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="progress"
                        stroke="#10b981"
                        name="Progress %"
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Goal History</CardTitle>
              <CardDescription>
                Track of all changes to this goal's progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              {history.length > 0 ? (
                <div className="space-y-4">
                  <div className="overflow-hidden border rounded-md">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted">
                          <th className="px-4 py-2 text-left font-medium">Date</th>
                          <th className="px-4 py-2 text-right font-medium">Value</th>
                          <th className="px-4 py-2 text-right font-medium">Progress %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history
                          .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())
                          .map((record, index) => (
                            <tr 
                              key={record.id} 
                              className={index % 2 === 0 ? 'bg-card' : 'bg-muted/30'}
                            >
                              <td className="px-4 py-2">
                                {format(new Date(record.recorded_at), 'MMM d, yyyy h:mm a')}
                              </td>
                              <td className="px-4 py-2 text-right font-medium">{record.value}</td>
                              <td className="px-4 py-2 text-right">
                                {record.progress_percentage}%
                              </td>
                            </tr>
                          ))
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-1">No History Data</h3>
                  <p className="text-muted-foreground mb-4">
                    There are no progress updates recorded for this goal yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Goal Analysis</CardTitle>
              <CardDescription>
                Advanced insights and trend analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {history.length >= 2 ? (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 border rounded-md">
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">
                        Avg. Daily Progress
                      </h3>
                      <div className="text-2xl font-bold">
                        {projection ? (
                          `${Math.abs(projection.dailyChange).toFixed(4)} / day`
                        ) : '—'}
                      </div>
                    </div>
                    
                    <div className="p-4 border rounded-md">
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">
                        Projected Completion
                      </h3>
                      <div className="text-2xl font-bold">
                        {projection && projection.isOnTrack ? (
                          'On track'
                        ) : (
                          <span className="text-red-500">Off track</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-4 border rounded-md">
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">
                        Volatility
                      </h3>
                      <div className="text-2xl font-bold">
                        {history.length >= 3 ? 'Low' : '—'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded-md">
                    <h3 className="font-medium mb-3">Detailed Projection</h3>
                    {projection ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Target Value</div>
                            <div className="font-medium">{goal.target_value}</div>
                          </div>
                          
                          <div>
                            <div className="text-muted-foreground">Current Value</div>
                            <div className="font-medium">{goal.current_value}</div>
                          </div>
                          
                          <div>
                            <div className="text-muted-foreground">Projected Final</div>
                            <div className="font-medium">{projection.projectedValue.toFixed(2)}</div>
                          </div>
                          
                          <div>
                            <div className="text-muted-foreground">Days Remaining</div>
                            <div className="font-medium">{projection.daysRemaining}</div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-muted-foreground mb-1">Projection Status</div>
                          <div className="flex items-center">
                            {projection.isOnTrack ? (
                              <>
                                <Badge variant="success" className="mr-2">On Track</Badge>
                                <span className="text-sm">
                                  At the current rate, you will 
                                  {projection.dailyChange > 0 ? ' exceed ' : ' meet '}
                                  your target by 
                                  {' '}{Math.abs(projection.projectedValue - parseFloat(goal.target_value?.toString() || '0')).toFixed(2)}.
                                </span>
                              </>
                            ) : (
                              <>
                                <Badge variant="destructive" className="mr-2">Off Track</Badge>
                                <span className="text-sm">
                                  At the current rate, you will 
                                  {projection.dailyChange > 0 ? ' miss ' : ' exceed '}
                                  your target by 
                                  {' '}{Math.abs(projection.projectedValue - parseFloat(goal.target_value?.toString() || '0')).toFixed(2)}.
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        <p>Not enough data to calculate projections.</p>
                        <p className="text-xs mt-1">Need at least 2 history points over time.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <BarChart4 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-1">Insufficient Data</h3>
                  <p className="text-muted-foreground mb-4">
                    At least 2 progress updates are needed to generate analysis.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 