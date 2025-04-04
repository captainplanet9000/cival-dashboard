/**
 * Health Dashboard
 * Component for displaying agent health metrics and status
 */
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LineChart, AreaChart } from '@/components/charts';
import { 
  Activity, 
  AlertTriangle, 
  Clock, 
  Cpu, 
  Memory, 
  RefreshCw, 
  CheckCircle2, 
  XCircle,
  Zap,
  Power,
  PowerOff,
  Play,
  Pause
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow, format, formatDuration, intervalToDuration } from 'date-fns';

interface HealthDashboardProps {
  data: any;
  onRefresh: () => void;
}

export function HealthDashboard({ data, onRefresh }: HealthDashboardProps) {
  const { toast } = useToast();
  
  // Calculate health status color
  const getHealthColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'text-green-500';
      case 'offline':
        return 'text-gray-500';
      case 'degraded':
        return 'text-yellow-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-blue-500';
    }
  };
  
  // Format uptime
  const formatUptime = (seconds: number) => {
    if (!seconds) return '0 minutes';
    
    const duration = intervalToDuration({ start: 0, end: seconds * 1000 });
    
    const parts = [];
    if (duration.days) parts.push(`${duration.days} day${duration.days !== 1 ? 's' : ''}`);
    if (duration.hours) parts.push(`${duration.hours} hour${duration.hours !== 1 ? 's' : ''}`);
    if (duration.minutes) parts.push(`${duration.minutes} minute${duration.minutes !== 1 ? 's' : ''}`);
    
    return parts.join(', ') || '< 1 minute';
  };
  
  // Format memory usage
  const formatMemory = (memoryMB?: number) => {
    if (!memoryMB) return 'N/A';
    
    if (memoryMB < 1024) {
      return `${memoryMB.toFixed(1)} MB`;
    } else {
      return `${(memoryMB / 1024).toFixed(2)} GB`;
    }
  };
  
  // Restart agent
  const handleRestartAgent = async () => {
    try {
      const response = await fetch(`/api/agents/${data.agent.id}/restart`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to restart agent');
      }
      
      toast({
        title: "Agent Restart Initiated",
        description: "The agent is being restarted. This may take a few moments."
      });
      
      // Refresh data after a delay
      setTimeout(onRefresh, 5000);
    } catch (error) {
      console.error('Error restarting agent:', error);
      toast({
        title: "Error",
        description: "Failed to restart agent",
        variant: "destructive"
      });
    }
  };
  
  // Pause/Resume agent
  const handleToggleAgentStatus = async () => {
    const newStatus = data.currentHealth.status === 'paused' ? 'resume' : 'pause';
    
    try {
      const response = await fetch(`/api/agents/${data.agent.id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${newStatus} agent`);
      }
      
      toast({
        title: newStatus === 'pause' ? "Agent Paused" : "Agent Resumed",
        description: newStatus === 'pause' ? 
          "The agent has been paused and will not process new tasks." : 
          "The agent has been resumed and will now process tasks."
      });
      
      // Refresh data after a delay
      setTimeout(onRefresh, 2000);
    } catch (error) {
      console.error(`Error ${newStatus}ing agent:`, error);
      toast({
        title: "Error",
        description: `Failed to ${newStatus} agent`,
        variant: "destructive"
      });
    }
  };
  
  // Generate uptime chart data
  const getUptimeChartData = () => {
    if (!data.uptimeHistory || data.uptimeHistory.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [
          {
            label: 'Uptime',
            data: [0],
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            fill: true,
          }
        ]
      };
    }
    
    const labels = data.uptimeHistory.map((item: any) => {
      const date = new Date(item.timestamp);
      return format(date, 'MM/dd HH:mm');
    });
    
    const uptimeData = data.uptimeHistory.map((item: any) => 
      item.uptimeSeconds / 3600 // Convert to hours
    );
    
    const statusData = data.uptimeHistory.map((item: any) => {
      switch (item.status) {
        case 'online':
          return 1;
        case 'degraded':
          return 0.5;
        case 'error':
          return 0.25;
        case 'offline':
        default:
          return 0;
      }
    });
    
    return {
      labels,
      datasets: [
        {
          label: 'Uptime (hours)',
          data: uptimeData,
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          fill: true,
          yAxisID: 'y',
        },
        {
          label: 'Status',
          data: statusData,
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          fill: false,
          borderDash: [5, 5],
          yAxisID: 'y1',
        }
      ]
    };
  };
  
  const chartOptions = {
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Uptime (hours)'
        }
      },
      y1: {
        beginAtZero: true,
        max: 1,
        title: {
          display: true,
          text: 'Status'
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          callback: function(value: any) {
            if (value === 0) return 'Offline';
            if (value === 0.25) return 'Error';
            if (value === 0.5) return 'Degraded';
            if (value === 1) return 'Online';
            return '';
          }
        }
      }
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    responsive: true,
    maintainAspectRatio: false
  };
  
  return (
    <div className="space-y-4">
      {/* Health Status Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center">
              <div className={`text-4xl font-bold ${getHealthColor(data.currentHealth.status)}`}>
                {data.currentHealth.status === 'online' && <CheckCircle2 className="h-12 w-12" />}
                {data.currentHealth.status === 'offline' && <XCircle className="h-12 w-12" />}
                {data.currentHealth.status === 'degraded' && <AlertTriangle className="h-12 w-12" />}
                {data.currentHealth.status === 'error' && <AlertTriangle className="h-12 w-12" />}
              </div>
              <p className="mt-2 text-lg font-semibold capitalize">
                {data.currentHealth.status}
              </p>
              <p className="text-xs text-muted-foreground">
                {data.currentHealth.lastActive 
                  ? `Last active ${formatDistanceToNow(new Date(data.currentHealth.lastActive), { addSuffix: true })}` 
                  : 'No activity recorded'}
              </p>
            </div>
          </CardContent>
        </Card>
        
        {/* Uptime Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center">
              <div className="text-3xl font-bold flex items-center gap-2">
                <Clock className="h-8 w-8 text-blue-500" />
                <span>{Math.floor(data.currentHealth.uptimeSeconds / 3600)}</span>
              </div>
              <p className="mt-2 text-sm">
                {formatUptime(data.currentHealth.uptimeSeconds)}
              </p>
              <div className="w-full mt-2">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Uptime</span>
                  <span>{data.uptimePercentage}%</span>
                </div>
                <Progress value={data.uptimePercentage} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Resource Usage Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Resource Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Memory className="h-4 w-4 mr-2 text-blue-500" />
                  <span className="text-sm">Memory</span>
                </div>
                <span className="text-sm font-medium">
                  {formatMemory(data.currentHealth.memoryUsage)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Cpu className="h-4 w-4 mr-2 text-green-500" />
                  <span className="text-sm">CPU</span>
                </div>
                <span className="text-sm font-medium">
                  {data.currentHealth.cpuUsage 
                    ? `${data.currentHealth.cpuUsage.toFixed(1)}%` 
                    : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Zap className="h-4 w-4 mr-2 text-yellow-500" />
                  <span className="text-sm">Performance</span>
                </div>
                <span className="text-sm font-medium">
                  {data.currentHealth.performanceScore 
                    ? `${data.currentHealth.performanceScore.toFixed(1)}/100` 
                    : 'N/A'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Tasks Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Processed</span>
                <span className="text-sm font-medium">
                  {data.currentHealth.requestsProcessed || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Completed</span>
                <span className="text-sm font-medium">
                  {data.currentHealth.tasksCompleted || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Errors</span>
                <span className={`text-sm font-medium ${
                  data.currentHealth.errorsEncountered > 0 ? 'text-red-500' : ''
                }`}>
                  {data.currentHealth.errorsEncountered || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Health Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Uptime History</CardTitle>
          <CardDescription>
            Agent uptime and status over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <AreaChart data={getUptimeChartData()} options={chartOptions} />
          </div>
        </CardContent>
      </Card>
      
      {/* Agent Health Details */}
      <Card>
        <CardHeader>
          <CardTitle>Health Details</CardTitle>
          <CardDescription>
            Detailed agent health information and metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">Agent Information</h3>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="text-sm font-medium">Agent ID</div>
                  <div className="text-sm">{data.agent.id}</div>
                  <div className="text-sm font-medium">Created</div>
                  <div className="text-sm">
                    {format(new Date(data.agent.createdAt), 'PPP')}
                  </div>
                  <div className="text-sm font-medium">Lifetime</div>
                  <div className="text-sm">
                    {data.agent.totalLifetimeHours > 24 
                      ? `${Math.floor(data.agent.totalLifetimeHours / 24)} days ${data.agent.totalLifetimeHours % 24} hours` 
                      : `${data.agent.totalLifetimeHours} hours`}
                  </div>
                  <div className="text-sm font-medium">Status</div>
                  <div className="text-sm capitalize">{data.agent.status}</div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium">Health Metrics</h3>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="text-sm font-medium">Last Health Check</div>
                  <div className="text-sm">
                    {data.currentHealth.healthCheckTimestamp 
                      ? formatDistanceToNow(new Date(data.currentHealth.healthCheckTimestamp), { addSuffix: true })
                      : 'N/A'}
                  </div>
                  <div className="text-sm font-medium">Memory Usage</div>
                  <div className="text-sm">
                    {formatMemory(data.currentHealth.memoryUsage)}
                  </div>
                  <div className="text-sm font-medium">CPU Usage</div>
                  <div className="text-sm">
                    {data.currentHealth.cpuUsage 
                      ? `${data.currentHealth.cpuUsage.toFixed(1)}%` 
                      : 'N/A'}
                  </div>
                  <div className="text-sm font-medium">Performance Score</div>
                  <div className="text-sm">
                    {data.currentHealth.performanceScore 
                      ? `${data.currentHealth.performanceScore.toFixed(1)}/100` 
                      : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">Task Statistics</h3>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="text-sm font-medium">Requests Processed</div>
                  <div className="text-sm">{data.currentHealth.requestsProcessed || 0}</div>
                  <div className="text-sm font-medium">Tasks Completed</div>
                  <div className="text-sm">{data.currentHealth.tasksCompleted || 0}</div>
                  <div className="text-sm font-medium">Errors Encountered</div>
                  <div className="text-sm">{data.currentHealth.errorsEncountered || 0}</div>
                  <div className="text-sm font-medium">Success Rate</div>
                  <div className="text-sm">
                    {data.currentHealth.tasksCompleted > 0 
                      ? `${(((data.currentHealth.tasksCompleted - data.currentHealth.errorsEncountered) / data.currentHealth.tasksCompleted) * 100).toFixed(1)}%` 
                      : 'N/A'}
                  </div>
                </div>
              </div>
              
              {/* Additional metrics based on metricsData */}
              {data.currentHealth.metricsData && Object.keys(data.currentHealth.metricsData).length > 0 && (
                <div>
                  <h3 className="text-lg font-medium">Additional Metrics</h3>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {Object.entries(data.currentHealth.metricsData)
                      .filter(([key]) => key !== 'lastMonitoringUpdate')
                      .map(([key, value]: [string, any]) => (
                        <React.Fragment key={key}>
                          <div className="text-sm font-medium">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                          </div>
                          <div className="text-sm">
                            {typeof value === 'object' 
                              ? JSON.stringify(value) 
                              : value}
                          </div>
                        </React.Fragment>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRestartAgent}
            >
              <Power className="h-4 w-4 mr-2" />
              Restart Agent
            </Button>
            
            <Button
              variant={data.currentHealth.status === 'paused' ? 'default' : 'secondary'}
              onClick={handleToggleAgentStatus}
            >
              {data.currentHealth.status === 'paused' ? (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Resume Agent
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause Agent
                </>
              )}
            </Button>
          </div>
          
          <Button
            variant="outline"
            onClick={onRefresh}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardFooter>
      </Card>
      
      {/* Show warning if agent has issues */}
      {(data.currentHealth.status === 'degraded' || data.currentHealth.status === 'error') && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Agent Health Issue Detected</AlertTitle>
          <AlertDescription>
            {data.currentHealth.status === 'degraded' 
              ? 'The agent is operating in a degraded state. Some functionality may be limited.'
              : 'The agent is experiencing errors. Action is required to restore normal operation.'}
            {' '}Consider checking the logs for more details or restart the agent.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
