'use client';

import { useState, useEffect } from 'react';
import { DashboardWidget } from '@/components/ui/dashboard-widget';
import { Card } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowDown, ArrowUp, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PerformanceData {
  date: string;
  value: number;
  profit?: number;
  balance?: number;
  roi?: number;
}

interface PerformanceMetrics {
  totalProfit: number;
  dailyChange: number;
  weeklyChange: number;
  monthlyChange: number;
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

interface PerformanceWidgetProps {
  entityId?: string; // ID of farm or agent
  entityType: 'farm' | 'agent' | 'account' | 'portfolio';
  className?: string;
  isLoading?: boolean;
  onRefresh?: () => Promise<void>;
  performanceData?: PerformanceData[];
  metrics?: PerformanceMetrics;
}

export function PerformanceWidget({
  entityId,
  entityType,
  className,
  isLoading = false,
  onRefresh,
  performanceData = [],
  metrics,
}: PerformanceWidgetProps) {
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [chartData, setChartData] = useState<PerformanceData[]>([]);
  
  // Simulate fetching data if not provided
  useEffect(() => {
    if (!isLoading && performanceData.length === 0 && !metrics) {
      // Generate mock data when real data is not available
      const mockData: PerformanceData[] = [];
      const now = new Date();
      
      const numPoints = timeframe === 'day' ? 24 : 
                        timeframe === 'week' ? 7 : 
                        timeframe === 'month' ? 30 : 365;
      
      let balance = 10000;
      
      for (let i = 0; i < numPoints; i++) {
        const date = new Date(now);
        date.setHours(date.getHours() - (timeframe === 'day' ? i : 0));
        date.setDate(date.getDate() - (timeframe !== 'day' ? i : 0));
        
        const change = (Math.random() * 200) - 100;
        balance += change;
        
        mockData.unshift({
          date: date.toISOString(),
          value: balance,
          profit: change,
          balance: balance,
          roi: (change / (balance - change)) * 100
        });
      }
      
      setChartData(mockData);
    } else if (performanceData.length > 0) {
      setChartData(performanceData);
    }
  }, [isLoading, performanceData, timeframe]);
  
  // Format data for different timeframes
  const formatChartData = () => {
    if (chartData.length === 0) return [];
    
    // Filter and format data based on selected timeframe
    const now = new Date();
    let filteredData;
    
    switch (timeframe) {
      case 'day':
        filteredData = chartData.filter(d => {
          const date = new Date(d.date);
          return date >= new Date(now.setHours(now.getHours() - 24));
        });
        break;
      case 'week':
        filteredData = chartData.filter(d => {
          const date = new Date(d.date);
          return date >= new Date(now.setDate(now.getDate() - 7));
        });
        break;
      case 'month':
        filteredData = chartData.filter(d => {
          const date = new Date(d.date);
          return date >= new Date(now.setMonth(now.getMonth() - 1));
        });
        break;
      case 'year':
        filteredData = chartData.filter(d => {
          const date = new Date(d.date);
          return date >= new Date(now.setFullYear(now.getFullYear() - 1));
        });
        break;
      default:
        filteredData = chartData;
    }
    
    // Format date labels based on timeframe
    return filteredData.map(item => {
      const date = new Date(item.date);
      let formattedDate;
      
      switch (timeframe) {
        case 'day':
          formattedDate = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          break;
        case 'week':
          formattedDate = date.toLocaleDateString([], { weekday: 'short' });
          break;
        case 'month':
          formattedDate = date.toLocaleDateString([], { day: '2-digit', month: 'short' });
          break;
        case 'year':
          formattedDate = date.toLocaleDateString([], { month: 'short' });
          break;
      }
      
      return {
        ...item,
        formattedDate
      };
    });
  };
  
  const formattedData = formatChartData();
  
  // Calculate metrics if not provided
  const calculatedMetrics = metrics || (chartData.length > 0 ? {
    totalProfit: chartData[chartData.length - 1].value - chartData[0].value,
    dailyChange: chartData.length > 1 ? chartData[chartData.length - 1].value - chartData[chartData.length - 2].value : 0,
    weeklyChange: chartData.length > 7 ? chartData[chartData.length - 1].value - chartData[chartData.length - 8].value : 0,
    monthlyChange: chartData.length > 30 ? chartData[chartData.length - 1].value - chartData[chartData.length - 31].value : 0,
    winRate: 0.65, // Mock win rate
    sharpeRatio: 1.8, // Mock Sharpe ratio
    maxDrawdown: 12.5 // Mock max drawdown
  } : {
    totalProfit: 0,
    dailyChange: 0,
    weeklyChange: 0,
    monthlyChange: 0,
    winRate: 0,
    sharpeRatio: 0,
    maxDrawdown: 0
  });

  // Generate title based on entity type
  const widgetTitle = `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} Performance`;
  
  // Format currency with $ and 2 decimal places
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };
  
  // Format percentage with 2 decimal places and % sign
  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value / 100);
  };

  return (
    <DashboardWidget
      title={widgetTitle}
      description="Performance metrics and historical data"
      className={className}
      isLoading={isLoading}
      isRefreshable={!!onRefresh}
      isExpandable
      onRefresh={onRefresh}
    >
      <div className="space-y-4">
        {/* Metrics Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="p-3">
            <div className="text-sm text-muted-foreground">Total Profit/Loss</div>
            <div className={cn("text-xl font-bold", 
              calculatedMetrics.totalProfit > 0 ? "text-green-600" : "text-red-600")}>
              {isLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <>
                  {formatCurrency(calculatedMetrics.totalProfit)}
                  <span className="text-sm ml-1">
                    {calculatedMetrics.totalProfit > 0 ? (
                      <ArrowUp className="inline h-4 w-4" />
                    ) : (
                      <ArrowDown className="inline h-4 w-4" />
                    )}
                  </span>
                </>
              )}
            </div>
          </Card>
          
          <Card className="p-3">
            <div className="text-sm text-muted-foreground">24h Change</div>
            <div className={cn("text-xl font-bold", 
              calculatedMetrics.dailyChange > 0 ? "text-green-600" : "text-red-600")}>
              {isLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <>
                  {formatCurrency(calculatedMetrics.dailyChange)}
                  <span className="text-sm ml-1">
                    {formatPercentage(calculatedMetrics.dailyChange / 
                      (chartData[chartData.length - 2]?.value || 1) * 100)}
                  </span>
                </>
              )}
            </div>
          </Card>
          
          <Card className="p-3">
            <div className="text-sm text-muted-foreground">Win Rate</div>
            <div className="text-xl font-bold">
              {isLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                formatPercentage(calculatedMetrics.winRate)
              )}
            </div>
          </Card>
          
          <Card className="p-3">
            <div className="text-sm text-muted-foreground">Max Drawdown</div>
            <div className="text-xl font-bold text-red-600">
              {isLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                formatPercentage(calculatedMetrics.maxDrawdown)
              )}
            </div>
          </Card>
        </div>
        
        {/* Performance Chart */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Historical Performance</h3>
            <Tabs 
              value={timeframe} 
              onValueChange={(value) => setTimeframe(value as any)}
              className="w-auto"
            >
              <TabsList className="grid grid-cols-4 w-[240px]">
                <TabsTrigger value="day">Day</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="year">Year</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <div className="h-[300px] w-full">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : formattedData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={formattedData}
                  margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                  <XAxis 
                    dataKey="formattedDate" 
                    tick={{ fontSize: 12 }} 
                    tickMargin={10}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }} 
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                    width={80}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Value']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    name="Balance" 
                    stroke="#2563EB" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                  {timeframe !== 'year' && (
                    <Line 
                      type="monotone" 
                      dataKey="profit" 
                      name="Profit/Loss" 
                      stroke="#10B981" 
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Not enough data to display chart</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Additional Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div>
            <div className="text-sm text-muted-foreground">Weekly Change</div>
            <div className={cn("font-medium", 
              calculatedMetrics.weeklyChange > 0 ? "text-green-600" : "text-red-600")}>
              {isLoading ? (
                <Skeleton className="h-5 w-20" />
              ) : (
                formatCurrency(calculatedMetrics.weeklyChange)
              )}
            </div>
          </div>
          
          <div>
            <div className="text-sm text-muted-foreground">Monthly Change</div>
            <div className={cn("font-medium", 
              calculatedMetrics.monthlyChange > 0 ? "text-green-600" : "text-red-600")}>
              {isLoading ? (
                <Skeleton className="h-5 w-20" />
              ) : (
                formatCurrency(calculatedMetrics.monthlyChange)
              )}
            </div>
          </div>
          
          <div>
            <div className="text-sm text-muted-foreground">Sharpe Ratio</div>
            <div className="font-medium">
              {isLoading ? (
                <Skeleton className="h-5 w-20" />
              ) : (
                calculatedMetrics.sharpeRatio.toFixed(2)
              )}
            </div>
          </div>
          
          <div>
            <div className="text-sm text-muted-foreground">Status</div>
            <div>
              {isLoading ? (
                <Skeleton className="h-5 w-20" />
              ) : (
                <Badge variant={calculatedMetrics.totalProfit > 0 ? "success" : "destructive"}>
                  {calculatedMetrics.totalProfit > 0 ? "Profitable" : "Loss"}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardWidget>
  );
}
