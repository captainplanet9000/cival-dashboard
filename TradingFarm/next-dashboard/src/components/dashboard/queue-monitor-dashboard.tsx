"use client";

/**
 * Queue Monitor Dashboard
 * A dashboard for monitoring Bull queues and jobs
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { QueueNames } from '@/services/queue/config';
import { LineChart, PieChart, AreaChart } from '@/components/charts';
import { formatDistanceToNow } from 'date-fns';

// Job status colors for UI
const JOB_STATUS_COLORS = {
  completed: 'bg-green-500',
  failed: 'bg-red-500',
  delayed: 'bg-yellow-500',
  active: 'bg-blue-500',
  waiting: 'bg-gray-500',
  paused: 'bg-purple-500',
};

// Queue monitor stats interface
interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
  totalJobs: number;
}

// Job interface
interface Job {
  id: string;
  name: string;
  data: any;
  queue: string;
  timestamp: string;
  processedOn?: string;
  finishedOn?: string;
  status: 'completed' | 'failed' | 'delayed' | 'active' | 'waiting' | 'paused';
  progress: number;
  returnvalue?: any;
  stacktrace?: string[];
  attemptsMade: number;
}

export function QueueMonitorDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [queueStats, setQueueStats] = useState<QueueStats[]>([]);
  const [jobs, setJobs] = useState<Record<string, Job[]>>({});
  const [selectedQueue, setSelectedQueue] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(10000); // 10 seconds
  const [showErrorDetails, setShowErrorDetails] = useState<Record<string, boolean>>({});
  const [historicalStats, setHistoricalStats] = useState<any[]>([]);

  // Fetch queue stats
  const fetchQueueStats = async () => {
    try {
      const response = await fetch('/api/queue/stats');
      const data = await response.json();
      setQueueStats(data);
      
      // Also update selected queue if needed
      if (!selectedQueue && data.length > 0) {
        setSelectedQueue(data[0].name);
      }
      
    } catch (error) {
      console.error('Error fetching queue stats:', error);
    }
  };

  // Fetch jobs for a specific queue
  const fetchJobs = async (queue: string, status?: string) => {
    try {
      const queryParams = status ? `?status=${status}` : '';
      const response = await fetch(`/api/queue/jobs/${queue}${queryParams}`);
      const data = await response.json();
      
      setJobs(prev => ({
        ...prev,
        [queue]: data
      }));
    } catch (error) {
      console.error(`Error fetching jobs for queue ${queue}:`, error);
    }
  };

  // Fetch historical stats
  const fetchHistoricalStats = async () => {
    try {
      const response = await fetch('/api/queue/historical-stats');
      const data = await response.json();
      setHistoricalStats(data);
    } catch (error) {
      console.error('Error fetching historical stats:', error);
    }
  };

  // Initial data load and refresh timer
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchQueueStats();
      await fetchHistoricalStats();
      setIsLoading(false);
    };

    loadData();

    // Set up refresh interval
    const intervalId = setInterval(() => {
      fetchQueueStats();
      if (selectedQueue) {
        fetchJobs(selectedQueue);
      }
      // Fetch historical less frequently to reduce load
      if (Math.random() < 0.2) { // 20% chance each refresh
        fetchHistoricalStats();
      }
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [refreshInterval]);

  // Fetch jobs when selected queue changes
  useEffect(() => {
    if (selectedQueue) {
      fetchJobs(selectedQueue);
    }
  }, [selectedQueue]);

  // Toggle error details
  const toggleErrorDetails = (jobId: string) => {
    setShowErrorDetails(prev => ({
      ...prev,
      [jobId]: !prev[jobId]
    }));
  };

  // Job action handlers
  const retryJob = async (queueName: string, jobId: string) => {
    try {
      await fetch(`/api/queue/jobs/${queueName}/${jobId}/retry`, {
        method: 'POST'
      });
      // Refresh jobs after action
      if (selectedQueue) {
        fetchJobs(selectedQueue);
      }
    } catch (error) {
      console.error(`Error retrying job ${jobId}:`, error);
    }
  };

  const removeJob = async (queueName: string, jobId: string) => {
    try {
      await fetch(`/api/queue/jobs/${queueName}/${jobId}`, {
        method: 'DELETE'
      });
      // Refresh jobs after action
      if (selectedQueue) {
        fetchJobs(selectedQueue);
      }
    } catch (error) {
      console.error(`Error removing job ${jobId}:`, error);
    }
  };

  const pauseQueue = async (queueName: string) => {
    try {
      await fetch(`/api/queue/${queueName}/pause`, {
        method: 'POST'
      });
      fetchQueueStats();
    } catch (error) {
      console.error(`Error pausing queue ${queueName}:`, error);
    }
  };

  const resumeQueue = async (queueName: string) => {
    try {
      await fetch(`/api/queue/${queueName}/resume`, {
        method: 'POST'
      });
      fetchQueueStats();
    } catch (error) {
      console.error(`Error resuming queue ${queueName}:`, error);
    }
  };

  const cleanQueue = async (queueName: string) => {
    try {
      await fetch(`/api/queue/${queueName}/clean`, {
        method: 'POST'
      });
      fetchQueueStats();
      if (selectedQueue === queueName) {
        fetchJobs(queueName);
      }
    } catch (error) {
      console.error(`Error cleaning queue ${queueName}:`, error);
    }
  };

  // Generate overview chart data
  const getOverviewChartData = () => {
    return {
      labels: queueStats.map(q => q.name),
      datasets: [
        {
          label: 'Completed Jobs',
          data: queueStats.map(q => q.completed),
          backgroundColor: 'rgba(34, 197, 94, 0.5)',
        },
        {
          label: 'Failed Jobs',
          data: queueStats.map(q => q.failed),
          backgroundColor: 'rgba(239, 68, 68, 0.5)',
        },
        {
          label: 'Active Jobs',
          data: queueStats.map(q => q.active),
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
        },
        {
          label: 'Waiting Jobs',
          data: queueStats.map(q => q.waiting),
          backgroundColor: 'rgba(107, 114, 128, 0.5)',
        },
      ]
    };
  };

  // Generate historical data chart
  const getHistoricalChartData = () => {
    if (!historicalStats.length) return null;
    
    return {
      labels: historicalStats.map(stat => stat.timestamp),
      datasets: [
        {
          label: 'Job Completion Rate',
          data: historicalStats.map(stat => stat.completionRate),
          borderColor: 'rgba(34, 197, 94, 1)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          fill: true,
        },
        {
          label: 'Failure Rate',
          data: historicalStats.map(stat => stat.failureRate),
          borderColor: 'rgba(239, 68, 68, 1)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: true,
        }
      ]
    };
  };

  // Generate queue health pie chart data
  const getQueueHealthData = (queue: QueueStats) => {
    return {
      labels: ['Completed', 'Failed', 'Active', 'Waiting', 'Delayed'],
      datasets: [
        {
          data: [
            queue.completed, 
            queue.failed, 
            queue.active, 
            queue.waiting, 
            queue.delayed
          ],
          backgroundColor: [
            'rgba(34, 197, 94, 0.7)',
            'rgba(239, 68, 68, 0.7)',
            'rgba(59, 130, 246, 0.7)',
            'rgba(107, 114, 128, 0.7)',
            'rgba(245, 158, 11, 0.7)',
          ],
          borderWidth: 1,
        },
      ],
    };
  };

  // Render loading skeletons
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Queue Monitoring Dashboard</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Refresh: </span>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="text-sm border rounded p-1"
          >
            <option value={5000}>5s</option>
            <option value={10000}>10s</option>
            <option value={30000}>30s</option>
            <option value={60000}>60s</option>
          </select>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              fetchQueueStats();
              if (selectedQueue) fetchJobs(selectedQueue);
              fetchHistoricalStats();
            }}
          >
            Refresh Now
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="queues">Queues</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.values(QueueNames).map(queueName => {
              const queueStat = queueStats.find(q => q.name === queueName) || {
                name: queueName,
                waiting: 0,
                active: 0,
                completed: 0,
                failed: 0,
                delayed: 0,
                paused: 0,
                totalJobs: 0
              };
              
              return (
                <Card key={queueName} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{queueName}</CardTitle>
                    <CardDescription>
                      {queueStat.paused ? 
                        <Badge variant="outline" className="bg-yellow-100">Paused</Badge> : 
                        <Badge variant="outline" className="bg-green-100">Active</Badge>
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Health:</span>
                      <span className={
                        queueStat.failed > queueStat.completed * 0.1 ? 'text-red-500' : 
                        queueStat.delayed > queueStat.waiting * 0.5 ? 'text-yellow-500' : 
                        'text-green-500'
                      }>
                        {queueStat.failed > queueStat.completed * 0.1 ? 'At Risk' : 
                         queueStat.delayed > queueStat.waiting * 0.5 ? 'Warning' : 
                         'Healthy'}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>Active: {queueStat.active}</span>
                        <span>Waiting: {queueStat.waiting}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Completed: {queueStat.completed}</span>
                        <span className={queueStat.failed > 0 ? "text-red-600 font-semibold" : ""}>
                          Failed: {queueStat.failed}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full text-xs"
                      onClick={() => {
                        setSelectedQueue(queueName);
                        setActiveTab('jobs');
                      }}
                    >
                      View Jobs
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Queue Status Overview</CardTitle>
                <CardDescription>Job counts by queue</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {queueStats.length > 0 && (
                  <AreaChart data={getOverviewChartData()} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Historical Performance</CardTitle>
                <CardDescription>Job completion rates over time</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {historicalStats.length > 0 ? (
                  <LineChart data={getHistoricalChartData()} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No historical data available yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Queues Tab */}
        <TabsContent value="queues" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {queueStats.map(queue => (
              <Card key={queue.name} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle>{queue.name}</CardTitle>
                    <div className="flex space-x-1">
                      {queue.paused ? (
                        <Button size="sm" variant="outline" onClick={() => resumeQueue(queue.name)}>
                          Resume
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => pauseQueue(queue.name)}>
                          Pause
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => cleanQueue(queue.name)}>
                        Clean
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    Total Jobs: {queue.totalJobs} | Active: {queue.active} | Failed: {queue.failed}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="h-40">
                    <PieChart data={getQueueHealthData(queue)} />
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="text-xs flex justify-between">
                        <span>Waiting Jobs</span>
                        <span>{queue.waiting}</span>
                      </div>
                      <Progress value={(queue.waiting / (queue.totalJobs || 1)) * 100} className="h-2" />
                    </div>
                    <div>
                      <div className="text-xs flex justify-between">
                        <span>Active Jobs</span>
                        <span>{queue.active}</span>
                      </div>
                      <Progress value={(queue.active / (queue.totalJobs || 1)) * 100} className="h-2 bg-blue-100" />
                    </div>
                    <div>
                      <div className="text-xs flex justify-between">
                        <span>Completed Jobs</span>
                        <span>{queue.completed}</span>
                      </div>
                      <Progress value={(queue.completed / (queue.totalJobs || 1)) * 100} className="h-2 bg-green-100" />
                    </div>
                    <div>
                      <div className="text-xs flex justify-between">
                        <span>Failed Jobs</span>
                        <span>{queue.failed}</span>
                      </div>
                      <Progress value={(queue.failed / (queue.totalJobs || 1)) * 100} className="h-2 bg-red-100" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Jobs Tab */}
        <TabsContent value="jobs" className="space-y-4">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
            <div className="flex space-x-2 items-center">
              <select
                value={selectedQueue || ''}
                onChange={(e) => setSelectedQueue(e.target.value)}
                className="border rounded p-1.5"
              >
                {Object.values(QueueNames).map(queueName => (
                  <option key={queueName} value={queueName}>
                    {queueName}
                  </option>
                ))}
              </select>
              
              {selectedQueue && (
                <div className="flex space-x-1">
                  <Button size="sm" variant="outline" onClick={() => fetchJobs(selectedQueue, 'active')}>
                    Active
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => fetchJobs(selectedQueue, 'waiting')}>
                    Waiting
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => fetchJobs(selectedQueue, 'failed')}>
                    Failed
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => fetchJobs(selectedQueue, 'completed')}>
                    Completed
                  </Button>
                </div>
              )}
            </div>
            
            {selectedQueue && (
              <div className="flex space-x-1">
                {queueStats.find(q => q.name === selectedQueue)?.paused ? (
                  <Button size="sm" onClick={() => resumeQueue(selectedQueue)}>
                    Resume Queue
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => pauseQueue(selectedQueue)}>
                    Pause Queue
                  </Button>
                )}
                <Button size="sm" variant="destructive" onClick={() => cleanQueue(selectedQueue)}>
                  Clean Queue
                </Button>
              </div>
            )}
          </div>
          
          {selectedQueue && jobs[selectedQueue] ? (
            jobs[selectedQueue].length > 0 ? (
              <div className="space-y-2">
                {jobs[selectedQueue].map(job => (
                  <Card key={job.id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                        <div className="flex items-center space-x-2">
                          <CardTitle className="text-base">{job.name}</CardTitle>
                          <Badge className={JOB_STATUS_COLORS[job.status]}>{job.status}</Badge>
                        </div>
                        <CardDescription>
                          ID: {job.id} | Queue: {job.queue}
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="font-medium">Created: </span>
                            {job.timestamp ? formatDistanceToNow(new Date(job.timestamp), { addSuffix: true }) : 'Unknown'}
                          </div>
                          {job.processedOn && (
                            <div>
                              <span className="font-medium">Processed: </span>
                              {formatDistanceToNow(new Date(job.processedOn), { addSuffix: true })}
                            </div>
                          )}
                          {job.finishedOn && (
                            <div>
                              <span className="font-medium">Finished: </span>
                              {formatDistanceToNow(new Date(job.finishedOn), { addSuffix: true })}
                            </div>
                          )}
                          <div>
                            <span className="font-medium">Attempts: </span>
                            {job.attemptsMade}
                          </div>
                        </div>
                        
                        {job.status === 'active' && (
                          <div>
                            <span className="text-sm font-medium">Progress: </span>
                            <Progress value={job.progress} className="h-2" />
                          </div>
                        )}
                        
                        {job.status === 'failed' && (
                          <div className="space-y-1">
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-red-600">Error: </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 ml-2 text-xs"
                                onClick={() => toggleErrorDetails(job.id)}
                              >
                                {showErrorDetails[job.id] ? 'Hide Details' : 'Show Details'}
                              </Button>
                            </div>
                            {showErrorDetails[job.id] && job.stacktrace && (
                              <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto max-h-40">
                                {job.stacktrace.join('\n')}
                              </pre>
                            )}
                          </div>
                        )}
                        
                        <div className="text-sm">
                          <span className="font-medium">Data: </span>
                          <pre className="inline-block text-xs bg-gray-100 p-1 rounded overflow-x-auto max-w-full">
                            {JSON.stringify(job.data, null, 2)}
                          </pre>
                        </div>
                        
                        {job.status === 'completed' && job.returnvalue && (
                          <div className="text-sm">
                            <span className="font-medium">Result: </span>
                            <pre className="inline-block text-xs bg-gray-100 p-1 rounded overflow-x-auto max-w-full">
                              {JSON.stringify(job.returnvalue, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0 flex justify-end space-x-2">
                      {job.status === 'failed' && (
                        <Button size="sm" variant="outline" onClick={() => retryJob(job.queue, job.id)}>
                          Retry
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => removeJob(job.queue, job.id)}
                      >
                        Remove
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  No jobs found in this queue matching the current filter
                </CardContent>
              </Card>
            )
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                {selectedQueue ? 'Loading jobs...' : 'Select a queue to view jobs'}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
