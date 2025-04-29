'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { getMetrics, getMetricsByType, generatePerformanceReport, clearMetrics } from '@/utils/performance/performance-monitor';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DialogWrapper } from '@/components/ui/dialog-wrapper';
import { DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

/**
 * Performance Monitoring Panel Component
 * Displays real-time performance metrics for the application
 */
export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [report, setReport] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [detailMetric, setDetailMetric] = useState<any>(null);
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);

  // Load metrics on initial render and when refreshInterval changes
  useEffect(() => {
    // Initial load
    updateMetrics();
    
    // Set up refresh interval if enabled
    if (refreshInterval) {
      const interval = setInterval(() => {
        updateMetrics();
      }, refreshInterval);
      
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  // Update metrics from performance monitor
  const updateMetrics = () => {
    const allMetrics = getMetrics();
    setMetrics(allMetrics);
    
    // Generate a new report
    setReport(generatePerformanceReport());
  };

  // Calculate average duration by metric type
  const getAverageByType = () => {
    const typeGroups: Record<string, { count: number, totalDuration: number }> = {};
    
    metrics.forEach(metric => {
      if (!typeGroups[metric.type]) {
        typeGroups[metric.type] = { count: 0, totalDuration: 0 };
      }
      
      typeGroups[metric.type].count += 1;
      typeGroups[metric.type].totalDuration += metric.duration;
    });
    
    return Object.entries(typeGroups).map(([type, data]) => ({
      name: type,
      value: data.totalDuration / data.count
    }));
  };

  // View details for a specific metric
  const viewMetricDetails = (metricType: string) => {
    const typeMetrics = getMetricsByType(metricType);
    setDetailMetric({
      type: metricType,
      metrics: typeMetrics,
      averageDuration: typeMetrics.reduce((acc, m) => acc + m.duration, 0) / typeMetrics.length
    });
    setShowDetails(true);
  };

  // Reset metrics collection
  const handleReset = () => {
    clearMetrics();
    updateMetrics();
  };

  // Toggle auto-refresh
  const toggleAutoRefresh = () => {
    setRefreshInterval(refreshInterval ? null : 5000);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Performance Monitor</CardTitle>
            <CardDescription>Real-time application performance metrics</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={toggleAutoRefresh}>
              {refreshInterval ? 'Disable Auto-Refresh' : 'Enable Auto-Refresh'}
            </Button>
            <Button variant="outline" size="sm" onClick={updateMetrics}>
              Refresh
            </Button>
            <Button variant="destructive" size="sm" onClick={handleReset}>
              Reset
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="components">Components</TabsTrigger>
            <TabsTrigger value="data">Data Fetching</TabsTrigger>
            <TabsTrigger value="interactions">Interactions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard 
                  title="Total Metrics"
                  value={metrics.length.toString()}
                  description="Total number of performance measurements"
                />
                
                <MetricCard 
                  title="Avg Component Render"
                  value={`${(metrics.filter(m => m.type === 'component-render')
                    .reduce((acc, m) => acc + m.duration, 0) / 
                    Math.max(1, metrics.filter(m => m.type === 'component-render').length)).toFixed(2)}ms`}
                  description="Average component render time"
                  status={getPerformanceStatus(metrics.filter(m => m.type === 'component-render')
                    .reduce((acc, m) => acc + m.duration, 0) / 
                    Math.max(1, metrics.filter(m => m.type === 'component-render').length))}
                />
                
                <MetricCard 
                  title="Avg Data Fetch"
                  value={`${(metrics.filter(m => m.type === 'data-fetch')
                    .reduce((acc, m) => acc + m.duration, 0) / 
                    Math.max(1, metrics.filter(m => m.type === 'data-fetch').length)).toFixed(2)}ms`}
                  description="Average data fetch time"
                  status={getPerformanceStatus(metrics.filter(m => m.type === 'data-fetch')
                    .reduce((acc, m) => acc + m.duration, 0) / 
                    Math.max(1, metrics.filter(m => m.type === 'data-fetch').length), 200, 500)}
                />
              </div>
              
              {report && report.slowestOperations && report.slowestOperations.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-3">Slowest Operations</h3>
                  <div className="space-y-2">
                    {report.slowestOperations.slice(0, 5).map((op: any, i: number) => (
                      <div key={i} className="flex justify-between items-center p-2 bg-muted rounded-md">
                        <div className="flex-1">
                          <p className="font-medium truncate" title={op.name}>{op.name}</p>
                          <p className="text-xs text-muted-foreground">{op.type}</p>
                        </div>
                        <Badge variant={getDurationVariant(op.duration)}>
                          {op.duration.toFixed(2)}ms
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="mt-6 h-72">
                <h3 className="text-lg font-medium mb-3">Average Duration by Type</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getAverageByType()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis label={{ value: 'Duration (ms)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value: any) => [`${value.toFixed(2)} ms`, 'Avg Duration']} />
                    <Bar dataKey="value" fill="#8884d8" onClick={(data) => viewMetricDetails(data.name)} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="components">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Component Render Performance</h3>
              {getComponentPerformanceTable()}
            </div>
          </TabsContent>
          
          <TabsContent value="data">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Data Fetching Performance</h3>
              {getDataFetchingTable()}
            </div>
          </TabsContent>
          
          <TabsContent value="interactions">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">User Interaction Performance</h3>
              {getInteractionTable()}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="border-t pt-4">
        <p className="text-sm text-muted-foreground">
          Performance data is collected in real-time as you use the application.
          {refreshInterval && ' Auto-refreshing every 5 seconds.'}
        </p>
      </CardFooter>
      
      {/* Metric Details Dialog */}
      <DialogWrapper open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detailMetric?.type} Metrics</DialogTitle>
            <DialogDescription>
              Detailed performance metrics for {detailMetric?.type}
            </DialogDescription>
          </DialogHeader>
          
          {detailMetric && (
            <div className="space-y-4 my-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-medium">Average Duration</h4>
                  <p className="text-2xl font-bold">{detailMetric.averageDuration.toFixed(2)}ms</p>
                </div>
                <div>
                  <h4 className="font-medium">Total Metrics</h4>
                  <p className="text-2xl font-bold">{detailMetric.metrics.length}</p>
                </div>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Name</th>
                      <th className="text-right py-2">Duration</th>
                      <th className="text-right py-2">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailMetric.metrics.map((metric: any, i: number) => (
                      <tr key={i} className="border-b">
                        <td className="py-2 truncate" title={metric.name}>{metric.name}</td>
                        <td className="py-2 text-right">{metric.duration.toFixed(2)}ms</td>
                        <td className="py-2 text-right">{new Date(metric.timestamp).toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setShowDetails(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </DialogWrapper>
    </Card>
  );

  // Helper function to get component performance table
  function getComponentPerformanceTable() {
    const componentMetrics = metrics.filter(m => m.type === 'component-render');
    
    if (componentMetrics.length === 0) {
      return <p className="text-muted-foreground">No component metrics collected yet.</p>;
    }
    
    // Group by component name
    const groupedMetrics: Record<string, any[]> = {};
    componentMetrics.forEach(metric => {
      const name = metric.name.split('-')[0];
      if (!groupedMetrics[name]) {
        groupedMetrics[name] = [];
      }
      groupedMetrics[name].push(metric);
    });
    
    return (
      <div className="space-y-4">
        {Object.entries(groupedMetrics).map(([name, compMetrics]) => {
          const avgDuration = compMetrics.reduce((acc, m) => acc + m.duration, 0) / compMetrics.length;
          
          return (
            <div key={name} className="p-4 border rounded-md">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">{name}</h4>
                <Badge variant={getDurationVariant(avgDuration)}>
                  {avgDuration.toFixed(2)}ms
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Rendered {compMetrics.length} times
              </p>
            </div>
          );
        })}
      </div>
    );
  }

  // Helper function to get data fetching table
  function getDataFetchingTable() {
    const fetchMetrics = metrics.filter(m => m.type === 'data-fetch');
    
    if (fetchMetrics.length === 0) {
      return <p className="text-muted-foreground">No data fetching metrics collected yet.</p>;
    }
    
    return (
      <div className="space-y-2">
        {fetchMetrics.map((metric, i) => (
          <div key={i} className="p-3 border rounded-md">
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <h4 className="font-medium truncate" title={metric.name}>{metric.name}</h4>
                <p className="text-xs text-muted-foreground">
                  {new Date(metric.timestamp).toLocaleTimeString()}
                </p>
              </div>
              <Badge variant={getDurationVariant(metric.duration)}>
                {metric.duration.toFixed(2)}ms
              </Badge>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Helper function to get interaction performance table
  function getInteractionTable() {
    const interactionMetrics = metrics.filter(m => m.type === 'interaction');
    
    if (interactionMetrics.length === 0) {
      return <p className="text-muted-foreground">No interaction metrics collected yet.</p>;
    }
    
    return (
      <div className="space-y-2">
        {interactionMetrics.map((metric, i) => (
          <div key={i} className="p-3 border rounded-md">
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <h4 className="font-medium truncate" title={metric.name}>{metric.name}</h4>
                <p className="text-xs text-muted-foreground">
                  {new Date(metric.timestamp).toLocaleTimeString()}
                </p>
              </div>
              <Badge variant={getDurationVariant(metric.duration, 50, 100)}>
                {metric.duration.toFixed(2)}ms
              </Badge>
            </div>
          </div>
        ))}
      </div>
    );
  }
}

// Helper component for displaying metric cards
interface MetricCardProps {
  title: string;
  value: string;
  description: string;
  status?: 'good' | 'warning' | 'bad';
}

function MetricCard({ title, value, description, status = 'good' }: MetricCardProps) {
  return (
    <div className="p-4 border rounded-md">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <div className="flex items-end justify-between mt-1">
        <p className={`text-2xl font-bold ${status === 'warning' ? 'text-amber-500' : 
                                           status === 'bad' ? 'text-red-500' : 
                                           'text-green-500'}`}>
          {value}
        </p>
        <Badge variant={status === 'good' ? 'outline' : 
                       status === 'warning' ? 'secondary' : 
                       'destructive'}>
          {status}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  );
}

// Helper function to determine performance status
function getPerformanceStatus(duration: number, warningThreshold = 50, errorThreshold = 100): 'good' | 'warning' | 'bad' {
  if (duration < warningThreshold) return 'good';
  if (duration < errorThreshold) return 'warning';
  return 'bad';
}

// Helper function to get badge variant based on duration
function getDurationVariant(duration: number, warningThreshold = 50, errorThreshold = 100): 'outline' | 'secondary' | 'destructive' {
  if (duration < warningThreshold) return 'outline';
  if (duration < errorThreshold) return 'secondary';
  return 'destructive';
}
