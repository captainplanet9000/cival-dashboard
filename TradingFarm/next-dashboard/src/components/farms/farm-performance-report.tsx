/**
 * Farm Performance Report Component
 * Displays performance metrics and reports for a farm
 */
import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FarmPerformanceReport } from '@/services/performance-service';
import { performanceService } from '@/services/performance-service';
import { Activity, Award, Clock, Goal, Target, Users, Loader2, BarChart3, TrendingUp, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface FarmPerformanceReportProps {
  farmId: string;
  className?: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

export const FarmPerformanceReport: React.FC<FarmPerformanceReportProps> = ({
  farmId,
  className = '',
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [performanceData, setPerformanceData] = useState<FarmPerformanceReport | null>(null);
  const [timePeriod, setTimePeriod] = useState<'day' | 'week' | 'month' | 'year' | 'all'>('month');

  // Fetch performance data
  useEffect(() => {
    const fetchPerformanceData = async () => {
      setLoading(true);
      try {
        const { data, error } = await performanceService.getFarmPerformanceReport(farmId, timePeriod);
        
        if (error) {
          setError(error);
          return;
        }
        
        if (data) {
          setPerformanceData(data);
          setError(null);
        }
      } catch (err) {
        console.error('Error fetching performance data:', err);
        setError('Failed to load performance data');
      } finally {
        setLoading(false);
      }
    };

    fetchPerformanceData();
  }, [farmId, timePeriod]);

  // Prepare chart data
  const prepareActivityData = () => {
    if (!performanceData || !performanceData.daily_activity) {
      return [];
    }

    return performanceData.daily_activity.map(day => ({
      date: formatDate(day.date),
      updates: day.updates_count,
      completed: day.goals_completed,
      progress: day.goal_progress
    }));
  };

  const prepareGoalStatusData = () => {
    if (!performanceData) {
      return [];
    }

    return [
      {
        name: 'Completed',
        value: performanceData.goals_metrics.completed
      },
      {
        name: 'In Progress',
        value: performanceData.goals_metrics.in_progress
      },
      {
        name: 'Not Started',
        value: performanceData.goals_metrics.not_started
      },
      {
        name: 'Cancelled',
        value: performanceData.goals_metrics.cancelled
      }
    ].filter(item => item.value > 0);
  };

  const prepareAgentStatusData = () => {
    if (!performanceData) {
      return [];
    }

    return [
      {
        name: 'Active',
        value: performanceData.agents_metrics.active
      },
      {
        name: 'Inactive',
        value: performanceData.agents_metrics.inactive
      }
    ];
  };

  const activityData = prepareActivityData();
  const goalStatusData = prepareGoalStatusData();
  const agentStatusData = prepareAgentStatusData();

  // Custom tooltip for activity chart
  const ActivityTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-sm text-sm">
          <p className="font-medium">{label}</p>
          <p className="text-blue-500">Updates: {payload[0].value}</p>
          {payload[1] && <p className="text-green-500">Goals Completed: {payload[1].value}</p>}
          {payload[2] && <p className="text-amber-500">Progress Added: {payload[2].value}</p>}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card className={`${className} min-h-[300px] flex items-center justify-center`}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`${className} min-h-[300px]`}>
        <CardHeader>
          <CardTitle>Performance Report</CardTitle>
          <CardDescription>Farm performance metrics and analytics</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center">
          <AlertCircle className="h-12 w-12 text-red-500 mb-2" />
          <p className="text-sm text-gray-500">{error}</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => setLoading(true)}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!performanceData) {
    return (
      <Card className={`${className} min-h-[300px]`}>
        <CardHeader>
          <CardTitle>Performance Report</CardTitle>
          <CardDescription>No performance data available</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center">
          <BarChart3 className="h-12 w-12 text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">No performance data available for this farm</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Performance Report</CardTitle>
            <CardDescription>
              {new Date(performanceData.start_date).toLocaleDateString()} - {new Date(performanceData.end_date).toLocaleDateString()}
            </CardDescription>
          </div>
          <Select value={timePeriod} onValueChange={(value: any) => setTimePeriod(value)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Last Day</SelectItem>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent className="pb-2">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Goals Progress Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Goals Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Target className="h-5 w-5 text-blue-500" />
                    <div className="text-2xl font-bold">
                      {performanceData.goals_metrics.completed} / {performanceData.goals_metrics.total}
                    </div>
                  </div>
                  <Progress className="h-2 mt-2" value={(performanceData.goals_metrics.completed / Math.max(1, performanceData.goals_metrics.total)) * 100} />
                  <p className="text-xs text-gray-500 mt-1">
                    {Math.round((performanceData.goals_metrics.completion_rate || 0) * 100)}% completion rate
                  </p>
                </CardContent>
              </Card>
              
              {/* Active Agents Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-emerald-500" />
                    <div className="text-2xl font-bold">
                      {performanceData.agents_metrics.active} / {performanceData.agents_metrics.total}
                    </div>
                  </div>
                  <Progress 
                    className="h-2 mt-2" 
                    value={(performanceData.agents_metrics.active / Math.max(1, performanceData.agents_metrics.total)) * 100} 
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Including {performanceData.agents_metrics.elizaos_count} ElizaOS agents
                  </p>
                </CardContent>
              </Card>
              
              {/* Activity Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Activity className="h-5 w-5 text-purple-500" />
                    <div className="text-2xl font-bold">
                      {performanceData.agents_metrics.total_updates}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    <div className="flex justify-between">
                      <span>Updates per day:</span>
                      <span className="font-medium">
                        {performanceData.agents_metrics.updates_per_day.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Average Completion Time Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Completion Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-amber-500" />
                    <div className="text-2xl font-bold">
                      {performanceData.goals_metrics.average_days_to_completion 
                        ? `${performanceData.goals_metrics.average_days_to_completion.toFixed(1)} days` 
                        : 'N/A'}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Based on {performanceData.goals_metrics.completed} completed goals
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Activity Chart */}
            <Card className="mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Daily Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  {activityData.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={activityData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} />
                        <Tooltip content={<ActivityTooltip />} />
                        <Legend verticalAlign="top" height={36} />
                        <Line type="monotone" dataKey="updates" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Updates" />
                        <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Goals Completed" />
                        <Line type="monotone" dataKey="progress" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Progress Added" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      Not enough data for time period
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Goals Tab */}
          <TabsContent value="goals">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Goals Status Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Goals by Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    {goalStatusData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={goalStatusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={2}
                            dataKey="value"
                            nameKey="name"
                          >
                            {goalStatusData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend verticalAlign="bottom" />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        No goals data available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Goals Metrics */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Goal Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4">
                    <li className="flex items-start justify-between">
                      <div className="flex items-center">
                        <div className="h-4 w-4 rounded-full bg-green-500 mr-2"></div>
                        <span>Completed Goals</span>
                      </div>
                      <span className="font-medium">{performanceData.goals_metrics.completed}</span>
                    </li>
                    <li className="flex items-start justify-between">
                      <div className="flex items-center">
                        <div className="h-4 w-4 rounded-full bg-blue-500 mr-2"></div>
                        <span>In Progress Goals</span>
                      </div>
                      <span className="font-medium">{performanceData.goals_metrics.in_progress}</span>
                    </li>
                    <li className="flex items-start justify-between">
                      <div className="flex items-center">
                        <div className="h-4 w-4 rounded-full bg-gray-300 mr-2"></div>
                        <span>Not Started Goals</span>
                      </div>
                      <span className="font-medium">{performanceData.goals_metrics.not_started}</span>
                    </li>
                    <li className="flex items-start justify-between">
                      <div className="flex items-center">
                        <div className="h-4 w-4 rounded-full bg-red-500 mr-2"></div>
                        <span>Cancelled Goals</span>
                      </div>
                      <span className="font-medium">{performanceData.goals_metrics.cancelled}</span>
                    </li>
                    <li className="border-t pt-4 flex items-start justify-between">
                      <div className="flex items-center">
                        <Award className="h-4 w-4 text-amber-500 mr-2" />
                        <span>Completion Rate</span>
                      </div>
                      <span className="font-medium">
                        {Math.round((performanceData.goals_metrics.completion_rate || 0) * 100)}%
                      </span>
                    </li>
                    <li className="flex items-start justify-between">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-purple-500 mr-2" />
                        <span>Avg. Completion Time</span>
                      </div>
                      <span className="font-medium">
                        {performanceData.goals_metrics.average_days_to_completion 
                          ? `${performanceData.goals_metrics.average_days_to_completion.toFixed(1)} days` 
                          : 'N/A'}
                      </span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Agents Tab */}
          <TabsContent value="agents">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Agents Status Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Agent Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    {agentStatusData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={agentStatusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={2}
                            dataKey="value"
                            nameKey="name"
                          >
                            <Cell fill="#10b981" />
                            <Cell fill="#d1d5db" />
                          </Pie>
                          <Tooltip />
                          <Legend verticalAlign="bottom" />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        No agents data available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Agents Metrics */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Agent Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4">
                    <li className="flex items-start justify-between">
                      <div className="flex items-center">
                        <div className="h-4 w-4 rounded-full bg-blue-500 mr-2"></div>
                        <span>Standard Agents</span>
                      </div>
                      <span className="font-medium">{performanceData.agents_metrics.standard_count}</span>
                    </li>
                    <li className="flex items-start justify-between">
                      <div className="flex items-center">
                        <div className="h-4 w-4 rounded-full bg-purple-500 mr-2"></div>
                        <span>ElizaOS Agents</span>
                      </div>
                      <span className="font-medium">{performanceData.agents_metrics.elizaos_count}</span>
                    </li>
                    <li className="flex items-start justify-between">
                      <div className="flex items-center">
                        <div className="h-4 w-4 rounded-full bg-green-500 mr-2"></div>
                        <span>Active Agents</span>
                      </div>
                      <span className="font-medium">{performanceData.agents_metrics.active}</span>
                    </li>
                    <li className="flex items-start justify-between">
                      <div className="flex items-center">
                        <div className="h-4 w-4 rounded-full bg-gray-300 mr-2"></div>
                        <span>Inactive Agents</span>
                      </div>
                      <span className="font-medium">{performanceData.agents_metrics.inactive}</span>
                    </li>
                    <li className="border-t pt-4 flex items-start justify-between">
                      <div className="flex items-center">
                        <Activity className="h-4 w-4 text-amber-500 mr-2" />
                        <span>Total Updates</span>
                      </div>
                      <span className="font-medium">{performanceData.agents_metrics.total_updates}</span>
                    </li>
                    <li className="flex items-start justify-between">
                      <div className="flex items-center">
                        <TrendingUp className="h-4 w-4 text-blue-500 mr-2" />
                        <span>Updates Per Day</span>
                      </div>
                      <span className="font-medium">{performanceData.agents_metrics.updates_per_day.toFixed(1)}</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="pt-2 text-xs text-gray-500">
        <p>Last updated: {new Date(performanceData.end_date).toLocaleString()}</p>
      </CardFooter>
    </Card>
  );
};
