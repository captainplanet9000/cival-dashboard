'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  LineChart, 
  Calendar, 
  Sliders, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp,
  TrendingDown, 
  TrendingUp 
} from 'lucide-react';

import { usePerformanceData, useTradeDistribution, useAnalyticsSummary, type AnalyticsFilters } from '@/hooks/react-query/use-analytics-queries';
import { Skeleton } from '@/components/ui/skeleton';

export interface PerformanceMonitorProps {
  farmId: string;
  initialFilters?: Omit<AnalyticsFilters, 'farmId'>;
  showFilters?: boolean;
}

export default function PerformanceMonitor({
  farmId,
  initialFilters = {},
  showFilters = true,
}: PerformanceMonitorProps) {
  // State for tab and filters
  const [activeTab, setActiveTab] = useState('overview');
  const [timeframe, setTimeframe] = useState(initialFilters.timeframe || '1d');
  const [dateRange, setDateRange] = useState({
    startDate: initialFilters.startDate || undefined,
    endDate: initialFilters.endDate || undefined,
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Merge filters
  const filters: AnalyticsFilters = {
    farmId,
    timeframe: timeframe as '1h' | '4h' | '1d' | '1w' | '1m',
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    ...initialFilters,
  };
  
  // Fetch data using our query hooks
  const { 
    data: performanceData,
    fetchNextPage: fetchMorePerformance,
    hasNextPage: hasMorePerformance,
    isLoading: loadingPerformance,
    refetch: refetchPerformance,
    isFetchingNextPage
  } = usePerformanceData(filters);
  
  const { 
    data: tradeDistribution,
    isLoading: loadingTradeDistribution,
    refetch: refetchTradeDistribution,
  } = useTradeDistribution(filters);
  
  const {
    data: analyticsSummary,
    isLoading: loadingSummary,
    refetch: refetchSummary,
  } = useAnalyticsSummary(filters);
  
  // Handle refresh of all data
  const handleRefresh = async () => {
    await Promise.all([
      refetchPerformance(),
      refetchTradeDistribution(),
      refetchSummary()
    ]);
  };
  
  // Handle timeframe change
  const handleTimeframeChange = (value: string) => {
    setTimeframe(value);
  };
  
  // Determine loading state
  const isLoading = loadingPerformance || loadingTradeDistribution || loadingSummary;
  
  // Flatten the performance data from infinite query
  const flattenedPerformanceData = performanceData?.pages.flatMap(page => page.data) || [];
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Performance Monitor</CardTitle>
            <CardDescription>
              Analyze trading performance and metrics
            </CardDescription>
          </div>
          
          <div className="flex items-center space-x-2 mt-4 md:mt-0">
            {showFilters && (
              <Select 
                value={timeframe} 
                onValueChange={handleTimeframeChange}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">1 Hour</SelectItem>
                  <SelectItem value="4h">4 Hours</SelectItem>
                  <SelectItem value="1d">1 Day</SelectItem>
                  <SelectItem value="1w">1 Week</SelectItem>
                  <SelectItem value="1m">1 Month</SelectItem>
                </SelectContent>
              </Select>
            )}
            
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            
            {showFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                <Sliders className="h-4 w-4 mr-2" />
                Filters
                {showAdvancedFilters ? 
                  <ChevronUp className="h-4 w-4 ml-2" /> : 
                  <ChevronDown className="h-4 w-4 ml-2" />
                }
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="px-6">
          <TabsList className="mb-4">
            <TabsTrigger value="overview" className="flex items-center">
              <LineChart className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="distribution" className="flex items-center">
              <BarChart className="h-4 w-4 mr-2" />
              Distribution
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Calendar
            </TabsTrigger>
          </TabsList>
        </div>
        
        <CardContent>
          {isLoading ? (
            // Loading state
            <div className="space-y-4">
              <Skeleton className="h-[400px] w-full rounded-md" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton className="h-24 w-full rounded-md" />
                <Skeleton className="h-24 w-full rounded-md" />
                <Skeleton className="h-24 w-full rounded-md" />
              </div>
            </div>
          ) : (
            // Render content based on active tab
            <>
              <TabsContent value="overview" className="space-y-6 mt-2">
                {/* Summary cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <SummaryCard 
                    title="Total PnL"
                    value={analyticsSummary?.totalPnl || 0}
                    isCurrency
                    trend={analyticsSummary?.totalPnl && analyticsSummary.totalPnl > 0 ? 'up' : 'down'}
                  />
                  <SummaryCard 
                    title="Win Rate"
                    value={analyticsSummary?.winRate || 0}
                    isPercentage
                    trend={analyticsSummary?.winRate && analyticsSummary.winRate > 50 ? 'up' : 'down'}
                  />
                  <SummaryCard 
                    title="Total Trades"
                    value={analyticsSummary?.totalTrades || 0}
                    trend="neutral"
                  />
                  <SummaryCard 
                    title="Max Drawdown"
                    value={Math.abs(analyticsSummary?.maxDrawdown || 0)}
                    isPercentage
                    trend="down"
                    invertTrend
                  />
                </div>
                
                {/* Performance chart */}
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">Performance</h3>
                    <Badge variant="outline">
                      {timeframe === '1h' ? 'Hourly' : 
                       timeframe === '4h' ? '4-Hour' :
                       timeframe === '1d' ? 'Daily' :
                       timeframe === '1w' ? 'Weekly' : 'Monthly'} Data
                    </Badge>
                  </div>
                  
                  <div className="h-[300px] flex items-center justify-center bg-muted/30 rounded-md mb-4">
                    {/* This would be a real chart in production */}
                    <div className="text-muted-foreground text-center">
                      <LineChart className="h-12 w-12 mx-auto mb-2" />
                      <p>Performance chart with {flattenedPerformanceData.length} data points</p>
                    </div>
                  </div>
                  
                  {hasMorePerformance && (
                    <div className="flex justify-center">
                      <Button 
                        variant="outline"
                        onClick={() => fetchMorePerformance()}
                        disabled={isFetchingNextPage}
                      >
                        {isFetchingNextPage ? 'Loading more...' : 'Load more data'}
                      </Button>
                    </div>
                  )}
                </Card>
                
                {/* Metrics table */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Key Metrics</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y">
                        <MetricRow name="Profit Factor" value={analyticsSummary?.profitFactor?.toFixed(2) || '-'} />
                        <MetricRow name="Sharpe Ratio" value={analyticsSummary?.sharpeRatio?.toFixed(2) || '-'} />
                        <MetricRow name="Sortino Ratio" value={analyticsSummary?.sortinoRatio?.toFixed(2) || '-'} />
                        <MetricRow name="Calmar Ratio" value={analyticsSummary?.calmarRatio?.toFixed(2) || '-'} />
                        <MetricRow name="Avg Trade Length" value={`${analyticsSummary?.averageTradeLength || '-'} h`} />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Best & Worst</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y">
                        <MetricRow 
                          name="Best Trade" 
                          value={analyticsSummary?.bestTrade ? 
                            `${analyticsSummary.bestTrade.symbol} (${formatCurrency(analyticsSummary.bestTrade.pnl)})` : 
                            '-'
                          } 
                          trend="up"
                        />
                        <MetricRow 
                          name="Worst Trade" 
                          value={analyticsSummary?.worstTrade ? 
                            `${analyticsSummary.worstTrade.symbol} (${formatCurrency(analyticsSummary.worstTrade.pnl)})` : 
                            '-'
                          } 
                          trend="down"
                        />
                        <MetricRow 
                          name="Largest Drawdown" 
                          value={analyticsSummary?.largestDrawdowns && analyticsSummary.largestDrawdowns.length > 0 ? 
                            `${analyticsSummary.largestDrawdowns[0].maxDrawdownPercentage.toFixed(2)}%` : 
                            '-'
                          } 
                          trend="down"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="distribution" className="space-y-6 mt-2">
                {/* Symbol distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Trade Distribution by Symbol</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {tradeDistribution && tradeDistribution.length > 0 ? (
                        tradeDistribution.map((item, index) => (
                          <div key={index} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center">
                                <span className="font-medium">{item.symbol}</span>
                                <Badge variant="outline" className="ml-2">
                                  {item.count} trades
                                </Badge>
                              </div>
                              <div className="flex items-center space-x-4">
                                <span className="text-sm">
                                  {item.winRate.toFixed(1)}% win rate
                                </span>
                                <span className={`text-sm ${item.totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                  {formatCurrency(item.totalPnl)}
                                </span>
                              </div>
                            </div>
                            <div className="w-full bg-muted h-2 rounded-full">
                              <div 
                                className="bg-primary h-2 rounded-full" 
                                style={{ width: `${item.percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-muted-foreground py-8">
                          No trade distribution data available
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="calendar" className="space-y-6 mt-2">
                {/* Monthly performance */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Monthly Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analyticsSummary?.monthlyPerformance && analyticsSummary.monthlyPerformance.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {analyticsSummary.monthlyPerformance.slice(0, 6).map((month, index) => (
                          <Card key={index} className="overflow-hidden">
                            <CardHeader className="p-4 pb-2">
                              <CardTitle className="text-sm font-medium">{formatMonth(month.month)}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                              <div className="flex justify-between items-center mt-1">
                                <span className={`text-lg font-semibold ${month.pnlPercentage >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                  {month.pnlPercentage.toFixed(2)}%
                                </span>
                                <div className="flex items-center text-sm text-muted-foreground">
                                  <span>{month.trades} trades</span>
                                  <span className="mx-2">•</span>
                                  <span>{month.winRate.toFixed(1)}% win</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        No monthly performance data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </>
          )}
        </CardContent>
      </Tabs>
      
      <CardFooter className="flex justify-between border-t pt-6">
        <div className="text-xs text-muted-foreground">
          Data updated: {new Date().toLocaleString()}
        </div>
        <div className="text-xs">
          {loadingPerformance ? (
            <span className="text-muted-foreground">Loading data...</span>
          ) : (
            <span>
              {flattenedPerformanceData.length} data points loaded
            </span>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

// Helper components
interface SummaryCardProps {
  title: string;
  value: number;
  isCurrency?: boolean;
  isPercentage?: boolean;
  trend: 'up' | 'down' | 'neutral';
  invertTrend?: boolean;
}

function SummaryCard({ title, value, isCurrency, isPercentage, trend, invertTrend }: SummaryCardProps) {
  // Invert trend if needed (e.g., for drawdown, lower is better)
  const displayTrend = invertTrend ? (trend === 'up' ? 'down' : trend === 'down' ? 'up' : trend) : trend;
  
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold mt-1">
              {isCurrency 
                ? formatCurrency(value) 
                : isPercentage 
                  ? `${value.toFixed(1)}%` 
                  : value.toLocaleString()}
            </h3>
          </div>
          <div>
            {displayTrend === 'up' && (
              <div className="p-2 bg-green-500/10 rounded-full">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
            )}
            {displayTrend === 'down' && (
              <div className="p-2 bg-red-500/10 rounded-full">
                <TrendingDown className="h-5 w-5 text-red-500" />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface MetricRowProps {
  name: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
}

function MetricRow({ name, value, trend }: MetricRowProps) {
  return (
    <div className="flex justify-between items-center p-4">
      <span className="text-sm font-medium">{name}</span>
      <div className="flex items-center">
        <span className="font-mono">{value}</span>
        {trend === 'up' && <TrendingUp className="ml-2 h-4 w-4 text-green-500" />}
        {trend === 'down' && <TrendingDown className="ml-2 h-4 w-4 text-red-500" />}
      </div>
    </div>
  );
}

// Helper functions
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatMonth(monthString: string): string {
  const [year, month] = monthString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleString('default', { month: 'short', year: 'numeric' });
}
