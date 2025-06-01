/**
 * Performance Metrics Panel Component
 *
 * Displays trading performance metrics, charts, and historical performance data.
 */

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { monitoringService, PerformanceMetric } from '@/utils/trading/monitoring-service';
import { format } from 'date-fns';
import { 
  BarChart3, 
  LineChart, 
  RefreshCcw, 
  TrendingUp, 
  TrendingDown, 
  Loader2 
} from 'lucide-react';

export interface PerformanceMetricsPanelProps {
  userId: string;
}

export default function PerformanceMetricsPanel({ userId }: PerformanceMetricsPanelProps) {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [metricType, setMetricType] = useState<string>('all');
  const [timePeriod, setTimePeriod] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Load performance metrics
  useEffect(() => {
    const loadMetrics = async () => {
      setIsLoading(true);
      try {
        const metricTypeFilter = metricType !== 'all' ? metricType : undefined;
        const timePeriodFilter = timePeriod !== 'all' ? timePeriod : undefined;
        
        const data = await monitoringService.getPerformanceMetrics(
          userId,
          metricTypeFilter,
          undefined, // agentId
          timePeriodFilter,
          100
        );
        
        setMetrics(data);
      } catch (error) {
        console.error('Error loading performance metrics:', error);
        toast({
          title: "Failed to load metrics",
          description: "There was an error loading your performance metrics. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    if (userId) {
      loadMetrics();
    }
  }, [userId, metricType, timePeriod, toast]);

  // Handle manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const metricTypeFilter = metricType !== 'all' ? metricType : undefined;
      const timePeriodFilter = timePeriod !== 'all' ? timePeriod : undefined;
      
      const data = await monitoringService.getPerformanceMetrics(
        userId,
        metricTypeFilter,
        undefined, // agentId
        timePeriodFilter,
        100
      );
      
      setMetrics(data);
      
      toast({
        title: "Metrics refreshed",
        description: "Performance metrics have been updated.",
      });
    } catch (error) {
      console.error('Error refreshing metrics:', error);
      toast({
        title: "Failed to refresh metrics",
        description: "There was an error refreshing your performance metrics. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Group metrics by type
  const metricsByType = metrics.reduce((groups: Record<string, PerformanceMetric[]>, metric) => {
    const group = groups[metric.metric_type] || [];
    group.push(metric);
    groups[metric.metric_type] = group;
    return groups;
  }, {});

  // Render metric value with trend indicator
  const renderMetricValue = (value: number, metricType: string) => {
    // Format based on metric type
    let formattedValue = '';
    if (metricType.includes('percent') || metricType.includes('ratio')) {
      formattedValue = `${(value * 100).toFixed(2)}%`;
    } else if (metricType.includes('count')) {
      formattedValue = value.toFixed(0);
    } else {
      formattedValue = value.toFixed(2);
    }
    
    // Determine if trend should be shown and which direction
    const showTrend = 
      metricType.includes('return') || 
      metricType.includes('profit') || 
      metricType.includes('drawdown');
    
    if (!showTrend) {
      return formattedValue;
    }
    
    const isPositive = 
      (value > 0 && !metricType.includes('drawdown')) || 
      (value < 0 && metricType.includes('drawdown'));
    
    return (
      <div className="flex items-center gap-1">
        {isPositive ? (
          <TrendingUp className="h-4 w-4 text-green-500" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-500" />
        )}
        <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
          {formattedValue}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Performance Metrics</h2>
        <div className="flex gap-2">
          <Select value={metricType} onValueChange={setMetricType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Metric Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Metrics</SelectItem>
              <SelectItem value="return">Returns</SelectItem>
              <SelectItem value="drawdown">Drawdown</SelectItem>
              <SelectItem value="sharpe">Sharpe Ratio</SelectItem>
              <SelectItem value="volatility">Volatility</SelectItem>
              <SelectItem value="winrate">Win Rate</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Time Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Periods</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : metrics.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Performance Summary Card */}
          <Card className="col-span-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance Summary
              </CardTitle>
              <CardDescription>
                Key performance indicators across all trading activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Key Metrics Cards */}
                {Object.entries(metricsByType).slice(0, 4).map(([type, metrics]) => {
                  // Get the most recent metric
                  const latestMetric = metrics.sort((a, b) => 
                    new Date(b.end_time).getTime() - new Date(a.end_time).getTime()
                  )[0];
                  
                  return (
                    <Card key={type} className="bg-muted/30">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          {type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold">
                          {renderMetricValue(latestMetric.value, type)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {latestMetric.time_period.charAt(0).toUpperCase() + latestMetric.time_period.slice(1)}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Metrics by Type */}
          {Object.entries(metricsByType).map(([type, typeMetrics]) => (
            <Card key={type}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 capitalize">
                  <LineChart className="h-5 w-5" />
                  {type.replace(/_/g, ' ')}
                </CardTitle>
                <CardDescription>
                  Historical {type.replace(/_/g, ' ')} metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Date Range</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {typeMetrics
                      .sort((a, b) => new Date(b.end_time).getTime() - new Date(a.end_time).getTime())
                      .slice(0, 5)
                      .map((metric) => (
                        <TableRow key={metric.id}>
                          <TableCell className="font-medium capitalize">
                            {metric.time_period}
                          </TableCell>
                          <TableCell>
                            {format(new Date(metric.start_time), 'MMM d')} - {format(new Date(metric.end_time), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-right">
                            {renderMetricValue(metric.value, type)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>No Performance Data</CardTitle>
            <CardDescription>
              We don't have any performance metrics for your account yet.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No metrics available</p>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              Performance metrics will appear here once you start trading. 
              Metrics include returns, drawdowns, Sharpe ratio, and win rate.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
