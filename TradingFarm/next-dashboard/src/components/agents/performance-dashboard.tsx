/**
 * Performance Dashboard
 * Component for displaying agent performance metrics and trends
 */
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LineChart, BarChart } from '@/components/charts';
import { 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  Clock,
  AlertTriangle,
  Activity
} from 'lucide-react';
import { format, subDays } from 'date-fns';

interface PerformanceDashboardProps {
  data: any;
  onRefresh: () => void;
}

export function PerformanceDashboard({ data, onRefresh }: PerformanceDashboardProps) {
  const [timeframe, setTimeframe] = useState('7d');
  const [chartType, setChartType] = useState('success');
  
  // Calculate performance trend
  const calculateTrend = (current: number, previous: number) => {
    if (!previous) return { value: 0, direction: 'neutral' };
    const trend = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(trend).toFixed(1),
      direction: trend > 0 ? 'up' : trend < 0 ? 'down' : 'neutral'
    };
  };
  
  // Format large numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    } else {
      return num.toString();
    }
  };
  
  // Time periods for dropdown
  const timePeriods = [
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' }
  ];
  
  // Get days based on selected timeframe
  const getDaysFromTimeframe = () => {
    switch (timeframe) {
      case '24h': return 1;
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      default: return 7;
    }
  };
  
  // Generate performance chart data
  const getPerformanceChartData = () => {
    if (!data.performanceHistory || !data.performanceHistory.length) {
      return {
        labels: ['No Data'],
        datasets: [
          {
            label: 'No Data',
            data: [0],
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75,, 192, 192, 0.2)',
          }
        ]
      };
    }
    
    // Sort by timestamp
    const sortedData = [...data.performanceHistory].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    // Generate labels (dates)
    const labels = sortedData.map(item => 
      format(new Date(item.timestamp), 'MM/dd')
    );
    
    // Get datasets based on selected chart type
    let datasets = [];
    
    if (chartType === 'success') {
      // Success rate dataset
      datasets.push({
        label: 'Success Rate (%)',
        data: sortedData.map(item => item.successRate * 100),
        borderColor: 'rgba(52, 211, 153, 1)', // green
        backgroundColor: 'rgba(52, 211, 153, 0.2)',
        tension: 0.2,
      });
    } else if (chartType === 'latency') {
      // Response time dataset
      datasets.push({
        label: 'Avg. Response Time (ms)',
        data: sortedData.map(item => item.avgResponseTime),
        borderColor: 'rgba(79, 70, 229, 1)', // indigo
        backgroundColor: 'rgba(79, 70, 229, 0.2)',
        tension: 0.2,
      });
      
      // Max response time dataset
      datasets.push({
        label: 'Max Response Time (ms)',
        data: sortedData.map(item => item.maxResponseTime),
        borderColor: 'rgba(220, 38, 38, 1)', // red
        borderDash: [5, 5],
        backgroundColor: 'rgba(220, 38, 38, 0.1)',
        tension: 0.2,
      });
    } else if (chartType === 'errors') {
      // Error counts
      datasets.push({
        label: 'Errors',
        data: sortedData.map(item => item.errorCount),
        borderColor: 'rgba(239, 68, 68, 1)', // red
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        tension: 0.2,
      });
    } else if (chartType === 'throughput') {
      // Requests dataset
      datasets.push({
        label: 'Requests Processed',
        data: sortedData.map(item => item.requestCount),
        borderColor: 'rgba(59, 130, 246, 1)', // blue
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        tension: 0.2,
      });
    }
    
    return { labels, datasets };
  };
  
  // Get specific metric stats
  const getMetricSummary = (metricKey: string, format: (val: number) => string = val => val.toString()) => {
    if (!data.currentMetrics || !data.previousMetrics) {
      return { current: 'N/A', previous: 'N/A', trend: { value: 0, direction: 'neutral' } };
    }
    
    const current = data.currentMetrics[metricKey];
    const previous = data.previousMetrics[metricKey];
    
    return {
      current: format(current),
      previous: format(previous),
      trend: calculateTrend(current, previous)
    };
  };
  
  // Calculate throughput data
  const throughputData = getMetricSummary('requestCount', formatNumber);
  
  // Calculate success rate data
  const successRateData = getMetricSummary('successRate', val => `${(val * 100).toFixed(1)}%`);
  
  // Calculate response time data
  const responseTimeData = getMetricSummary('avgResponseTime', val => `${val.toFixed(0)} ms`);
  
  // Calculate error rate data
  const errorRateData = getMetricSummary('errorRate', val => `${(val * 100).toFixed(1)}%`);
  
  return (
    <div className="space-y-4">
      {/* Dashboard Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Performance Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor agent performance metrics and trends
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select
            value={timeframe}
            onValueChange={setTimeframe}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Time Period" />
            </SelectTrigger>
            <SelectContent>
              {timePeriods.map(period => (
                <SelectItem key={period.value} value={period.value}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            onClick={onRefresh}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Throughput Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Throughput</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <div className="text-3xl font-bold">{throughputData.current}</div>
              <p className="text-xs text-muted-foreground mb-1">
                vs {throughputData.previous} (prev. period)
              </p>
              <div className="flex items-center gap-1">
                {throughputData.trend.direction === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : throughputData.trend.direction === 'down' ? (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                ) : (
                  <span className="h-4 w-4">-</span>
                )}
                <span className={`text-sm font-medium ${
                  throughputData.trend.direction === 'up' ? 'text-green-500' : 
                  throughputData.trend.direction === 'down' ? 'text-red-500' : 
                  ''
                }`}>
                  {throughputData.trend.value}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Success Rate Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <div className="text-3xl font-bold">{successRateData.current}</div>
              <p className="text-xs text-muted-foreground mb-1">
                vs {successRateData.previous} (prev. period)
              </p>
              <div className="flex items-center gap-1">
                {successRateData.trend.direction === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : successRateData.trend.direction === 'down' ? (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                ) : (
                  <span className="h-4 w-4">-</span>
                )}
                <span className={`text-sm font-medium ${
                  successRateData.trend.direction === 'up' ? 'text-green-500' : 
                  successRateData.trend.direction === 'down' ? 'text-red-500' : 
                  ''
                }`}>
                  {successRateData.trend.value}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Response Time Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg. Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <div className="text-3xl font-bold">{responseTimeData.current}</div>
              <p className="text-xs text-muted-foreground mb-1">
                vs {responseTimeData.previous} (prev. period)
              </p>
              <div className="flex items-center gap-1">
                {responseTimeData.trend.direction === 'down' ? (
                  <TrendingDown className="h-4 w-4 text-green-500" />
                ) : responseTimeData.trend.direction === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-red-500" />
                ) : (
                  <span className="h-4 w-4">-</span>
                )}
                <span className={`text-sm font-medium ${
                  responseTimeData.trend.direction === 'down' ? 'text-green-500' : 
                  responseTimeData.trend.direction === 'up' ? 'text-red-500' : 
                  ''
                }`}>
                  {responseTimeData.trend.value}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Error Rate Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <div className="text-3xl font-bold">{errorRateData.current}</div>
              <p className="text-xs text-muted-foreground mb-1">
                vs {errorRateData.previous} (prev. period)
              </p>
              <div className="flex items-center gap-1">
                {errorRateData.trend.direction === 'down' ? (
                  <TrendingDown className="h-4 w-4 text-green-500" />
                ) : errorRateData.trend.direction === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-red-500" />
                ) : (
                  <span className="h-4 w-4">-</span>
                )}
                <span className={`text-sm font-medium ${
                  errorRateData.trend.direction === 'down' ? 'text-green-500' : 
                  errorRateData.trend.direction === 'up' ? 'text-red-500' : 
                  ''
                }`}>
                  {errorRateData.trend.value}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Performance Charts */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>
                Historical performance over the selected time period
              </CardDescription>
            </div>
            
            <Tabs 
              value={chartType} 
              onValueChange={setChartType}
              className="w-full sm:w-auto"
            >
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="success">Success</TabsTrigger>
                <TabsTrigger value="latency">Latency</TabsTrigger>
                <TabsTrigger value="errors">Errors</TabsTrigger>
                <TabsTrigger value="throughput">Throughput</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <LineChart 
              data={getPerformanceChartData()} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                  mode: 'index',
                  intersect: false,
                }
              }}
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Task Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Task Performance</CardTitle>
          <CardDescription>
            Success rates by task type
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.taskPerformance ? (
            <div className="h-80">
              <BarChart 
                data={{
                  labels: data.taskPerformance.map((task: any) => task.taskType),
                  datasets: [
                    {
                      label: 'Success Rate (%)',
                      data: data.taskPerformance.map((task: any) => task.successRate * 100),
                      backgroundColor: 'rgba(52, 211, 153, 0.8)',
                    },
                    {
                      label: 'Error Rate (%)',
                      data: data.taskPerformance.map((task: any) => task.errorRate * 100),
                      backgroundColor: 'rgba(239, 68, 68, 0.8)',
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top',
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                      title: {
                        display: true,
                        text: 'Percentage (%)'
                      }
                    }
                  }
                }}
              />
            </div>
          ) : (
            <div className="flex justify-center items-center h-60">
              <p className="text-muted-foreground">No task performance data available</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Performance Insights */}
      {data.insights && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.insights.map((insight: any, index: number) => (
                <Alert key={index} variant={insight.type === 'warning' ? 'destructive' : 'default'}>
                  {insight.type === 'warning' && <AlertTriangle className="h-4 w-4" />}
                  {insight.type === 'info' && <Activity className="h-4 w-4" />}
                  <AlertTitle>{insight.title}</AlertTitle>
                  <AlertDescription>{insight.description}</AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-sm text-muted-foreground">
              Last updated: {data.lastUpdated ? format(new Date(data.lastUpdated), 'PPpp') : 'Unknown'}
            </p>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
