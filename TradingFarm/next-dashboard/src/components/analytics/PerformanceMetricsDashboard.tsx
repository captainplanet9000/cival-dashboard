'use client';

// React 19 compatibility
import * as React from 'react';
const { useState, useEffect } = React;
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePerformanceData } from '@/hooks/use-performance-data';
import { LineChart } from '@/components/charts/LineChart';
import { PieChart } from '@/components/charts/PieChart';
import { BarChart } from '@/components/charts/BarChart';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Download } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTradingAnalytics } from '@/utils/analytics/trading-analytics';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, TrendingUp, TrendingDown, BarChart2, Clock, Target } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

interface TimeRange {
  startDate: Date;
  endDate: Date;
  label: string;
}

type MetricCardProps = {
  title: string;
  value: string | number;
  change?: number;
  changePeriod?: string;
  icon: React.ReactNode;
  isLoading?: boolean;
  tooltip?: string;
};

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changePeriod = '30d',
  icon,
  isLoading = false,
  tooltip,
}: MetricCardProps) => {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            <Skeleton className="h-4 w-24" />
          </CardTitle>
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-full mb-2" />
          <Skeleton className="h-4 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground group relative">
          {title}
          {tooltip && (
            <div className="absolute invisible group-hover:visible z-50 bg-popover text-popover-foreground p-2 rounded-md shadow-md text-xs max-w-xs top-full left-0 mt-1">
              {tooltip}
            </div>
          )}
        </CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <p className="text-xs text-muted-foreground flex items-center mt-1">
            {change > 0 ? (
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
            ) : change < 0 ? (
              <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
            ) : (
              <div className="h-3 w-3 mr-1" />
            )}
            <span
              className={cn(
                change > 0 ? "text-green-500" : change < 0 ? "text-red-500" : ""
              )}
            >
              {change > 0 ? "+" : ""}
              {change}%
            </span>
            <span className="ml-1">vs {changePeriod}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
};

const predefinedTimeRanges: TimeRange[] = [
  {
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
    label: '7D',
  },
  {
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
    label: '30D',
  },
  {
    startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
    label: '90D',
  },
  {
    startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
    label: '1Y',
  },
  {
    startDate: new Date(0),
    endDate: new Date(),
    label: 'All',
  },
];

export const PerformanceMetricsDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>(predefinedTimeRanges[1]); // Default to 30D
  const [customDateRange, setCustomDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });
  const [isCustomDateRange, setIsCustomDateRange] = useState(false);
  const [showBenchmark, setShowBenchmark] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const { toast } = useToast();
  const {
    performanceMetrics,
    tradeHistory,
    portfolioHistory,
    strategyPerformance,
    assetAllocation,
    isLoading,
    error,
    refetch,
  } = usePerformanceData();

  const { trackPortfolioPerformance } = useTradingAnalytics();

  useEffect(() => {
    if (!isCustomDateRange) {
      // Fetch data for predefined range
      // Implementation would depend on your API
    } else if (customDateRange.from && customDateRange.to) {
      // Fetch data for custom range
      // Implementation would depend on your API
    }
  }, [timeRange, customDateRange, isCustomDateRange]);

  // Track analytics for portfolio metrics when they load
  useEffect(() => {
    if (performanceMetrics && !isLoading) {
      const period = 
        timeRange.label === '7D' ? 'daily' :
        timeRange.label === '30D' ? 'monthly' :
        timeRange.label === '90D' ? 'quarterly' :
        timeRange.label === '1Y' ? 'yearly' : 'all_time';
        
      trackPortfolioPerformance({
        period,
        startDate: timeRange.startDate.toISOString(),
        endDate: timeRange.endDate.toISOString(),
        startValue: portfolioHistory?.[0]?.value || 0,
        endValue: portfolioHistory?.[portfolioHistory.length - 1]?.value || 0,
        deposits: 0, // This would need to be fetched from your API
        withdrawals: 0, // This would need to be fetched from your API
        pnl: performanceMetrics?.totalPnl || 0,
        pnlPercentage: (performanceMetrics?.totalPnl || 0) / (portfolioHistory?.[0]?.value || 1) * 100,
        sharpeRatio: performanceMetrics?.sharpeRatio || 0,
        sortingRatio: 0, // This would need to be fetched from your API
        maxDrawdown: performanceMetrics?.maxDrawdown || 0,
        volatility: 0, // This would need to be calculated
        bestDay: { date: '', pnl: 0 }, // This would need to be fetched from your API
        worstDay: { date: '', pnl: 0 }, // This would need to be fetched from your API
        winningDays: 0, // This would need to be fetched from your API
        losingDays: 0, // This would need to be fetched from your API
        totalTradingDays: 0, // This would need to be fetched from your API
      });
    }
  }, [performanceMetrics, isLoading, timeRange, portfolioHistory, trackPortfolioPerformance]);

  const handleExportData = (event: React.MouseEvent<HTMLButtonElement>) => {
    // Implementation for exporting data
    toast({
      title: "Export started",
      description: "Your performance data export is being prepared",
    });
    
    // This would be replaced with actual export logic
    setTimeout(() => {
      toast({
        title: "Export complete",
        description: "Performance data has been downloaded",
      });
    }, 2000);
  };

  const handleRangeChange = (range: TimeRange) => {
    setTimeRange(range);
    setIsCustomDateRange(false);
  };

  if (error) {
    return (
      <Card className="w-full p-6">
        <div className="flex items-center text-red-500 mb-4">
          <AlertCircle className="h-5 w-5 mr-2" />
          <CardTitle>Error Loading Performance Data</CardTitle>
        </div>
        <CardDescription>
          {error.toString()}. Please try refreshing the page or contact support if the issue persists.
        </CardDescription>
        <Button onClick={() => refetch()} className="mt-4">
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Performance Analytics</h2>
          <p className="text-muted-foreground">
            Comprehensive metrics and insights into your trading performance
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              {predefinedTimeRanges.map((range) => (
                <Button
                  key={range.label}
                  variant={
                    !isCustomDateRange && timeRange.label === range.label
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => handleRangeChange(range)}
                >
                  {range.label}
                </Button>
              ))}
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={isCustomDateRange ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "justify-start text-left font-normal",
                    !customDateRange.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {isCustomDateRange && customDateRange.from ? (
                    customDateRange.to ? (
                      <>
                        {format(customDateRange.from, "LLL dd, y")} -{" "}
                        {format(customDateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(customDateRange.from, "LLL dd, y")
                    )
                  ) : (
                    "Custom Range"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={customDateRange.from}
                  selected={{
                    from: customDateRange.from,
                    to: customDateRange.to,
                  }}
                  onSelect={(range) => {
                    setCustomDateRange(range || { from: undefined, to: undefined });
                    if (range?.from && range?.to) {
                      setIsCustomDateRange(true);
                      setTimeRange({
                        startDate: range.from,
                        endDate: range.to,
                        label: 'Custom',
                      });
                    }
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button variant="outline" size="sm" onClick={handleExportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total P&L"
          value={isLoading ? "$0.00" : `$${performanceMetrics?.totalPnl?.toFixed(2) || '0.00'}`}
          change={isLoading ? 0 : 5.4} // This would be calculated based on previous period
          icon={<BarChart2 className="h-4 w-4" />}
          isLoading={isLoading}
          tooltip="Total profit/loss across all trades during the selected period"
        />
        <MetricCard
          title="Win Rate"
          value={isLoading ? "0%" : `${(performanceMetrics?.winRate * 100)?.toFixed(1) || '0'}%`}
          change={isLoading ? 0 : 2.1} // This would be calculated based on previous period
          icon={<Target className="h-4 w-4" />}
          isLoading={isLoading}
          tooltip="Percentage of trades that resulted in profit"
        />
        <MetricCard
          title="Sharpe Ratio"
          value={isLoading ? "0.00" : performanceMetrics?.sharpeRatio?.toFixed(2) || '0.00'}
          change={isLoading ? 0 : -0.3} // This would be calculated based on previous period
          icon={<TrendingUp className="h-4 w-4" />}
          isLoading={isLoading}
          tooltip="Risk-adjusted return metric (higher is better)"
        />
        <MetricCard
          title="Max Drawdown"
          value={isLoading ? "0%" : `${performanceMetrics?.maxDrawdown?.toFixed(1) || '0'}%`}
          change={isLoading ? 0 : 1.2} // This would be calculated based on previous period
          icon={<TrendingDown className="h-4 w-4" />}
          isLoading={isLoading}
          tooltip="Largest peak-to-trough decline in portfolio value"
        />
      </div>

      <Tabs defaultValue="overview" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 md:w-auto md:inline-flex">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trades">Trades</TabsTrigger>
          <TabsTrigger value="strategies">Strategies</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card className="w-full">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Portfolio Performance</CardTitle>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-benchmark"
                    checked={showBenchmark}
                    onCheckedChange={setShowBenchmark}
                  />
                  <Label htmlFor="show-benchmark">Show Benchmark (BTC)</Label>
                </div>
              </div>
              <CardDescription>
                Your portfolio value over time compared to market benchmarks
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Skeleton className="h-full w-full" />
                </div>
              ) : (
                <LineChart
                  data={portfolioHistory?.map((point: any) => ({
                    timestamp: new Date(point.timestamp),
                    value: point.value,
                    benchmark: showBenchmark ? point.btcValue : undefined,
                  })) || []}
                  xAxisKey="timestamp"
                  series={[
                    { key: "value", label: "Portfolio" },
                    ...(showBenchmark
                      ? [{ key: "benchmark", label: "BTC" }]
                      : []),
                  ]}
                  showTooltip
                  showLegend
                />
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Daily P&L</CardTitle>
                <CardDescription>
                  Profit and loss for each day in the selected period
                </CardDescription>
              </CardHeader>
              <CardContent className="h-60">
                {isLoading ? (
                  <Skeleton className="h-full w-full" />
                ) : (
                  <BarChart
                    data={Object.values(tradeHistory?.reduce((acc: Record<string, { date: string; pnl: number }>, trade: any) => {
                      const d: string = new Date(trade.entryTime).toLocaleDateString();
                      
                      if (acc[d]) {
                        acc[d].pnl += trade.pnl;
                      } else {
                        acc[d] = { date: d, pnl: trade.pnl };
                      }
                      
                      return acc;
                    }, {}) || {})}
                    xAxisKey="date"
                    series={[{ key: "pnl", label: "P&L", color: (value: number) => value >= 0 ? "#22c55e" : "#ef4444" }]}
                    showTooltip
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Average Holding Time</CardTitle>
                <CardDescription>
                  Average time positions are held by trading pair
                </CardDescription>
              </CardHeader>
              <CardContent className="h-60">
                {isLoading ? (
                  <Skeleton className="h-full w-full" />
                ) : (
                  <BarChart
                    data={tradeHistory?.reduce((acc, trade) => {
                      const existing = acc.find((d) => d.symbol === trade.symbol);
                      const holdingTime = trade.holdingTimeHours || 0;
                      
                      if (existing) {
                        existing.count += 1;
                        existing.totalHours += holdingTime;
                        existing.avgHours = existing.totalHours / existing.count;
                      } else {
                        acc.push({
                          symbol: trade.symbol,
                          avgHours: holdingTime,
                          totalHours: holdingTime,
                          count: 1,
                        });
                      }
                      
                      return acc;
                    }, [] as { symbol: string; avgHours: number; totalHours: number; count: number }[])
                    .sort((a: any, b: any) => b.avgHours - a.avgHours)
                    .slice(0, 10) || []}
                    xAxisKey="symbol"
                    series={[{ key: "avgHours", label: "Hours" }]}
                    showTooltip
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trades" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trade Performance</CardTitle>
              <CardDescription>
                Detailed breakdown of all trades in the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-60 w-full" />
              ) : (
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="py-2 px-4 text-left font-medium">Symbol</th>
                        <th className="py-2 px-4 text-left font-medium">Side</th>
                        <th className="py-2 px-4 text-left font-medium">Entry Price</th>
                        <th className="py-2 px-4 text-left font-medium">Exit Price</th>
                        <th className="py-2 px-4 text-left font-medium">P&L</th>
                        <th className="py-2 px-4 text-left font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tradeHistory?.slice(0, 10).map((trade: any, i: number) => (
                        <tr key={i} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-4">{trade.symbol}</td>
                          <td className="py-2 px-4">
                            <Badge variant={trade.side === 'buy' ? "default" : "destructive"}>
                              {trade.side.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="py-2 px-4">${trade.entryPrice?.toFixed(2)}</td>
                          <td className="py-2 px-4">${trade.exitPrice?.toFixed(2)}</td>
                          <td className={cn(
                            "py-2 px-4 font-medium",
                            trade.pnl >= 0 ? "text-green-500" : "text-red-500"
                          )}>
                            {trade.pnl >= 0 ? "+" : ""}${trade.pnl?.toFixed(2)}
                          </td>
                          <td className="py-2 px-4">
                            {new Date(trade.timestamp).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(tradeHistory?.length || 0) > 10 && (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      Showing 10 of {tradeHistory?.length} trades
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strategies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Strategy Performance</CardTitle>
              <CardDescription>
                Comparison of trading strategies performance
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <BarChart
                  data={strategyPerformance || []}
                  xAxisKey="name"
                  series={[
                    { key: "totalPnl", label: "P&L" },
                    { key: "winRate", label: "Win Rate", secondaryAxis: true }
                  ]}
                  showTooltip
                  showLegend
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Asset Allocation</CardTitle>
              <CardDescription>
                Current distribution of assets in your portfolio
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <div className="flex flex-col lg:flex-row items-center justify-center h-full">
                  <div className="w-full lg:w-1/2 h-full">
                    <PieChart
                      data={assetAllocation?.map((asset: { name: string; balance: number; price: number }) => ({
                        label: asset.name,
                        value: asset.balance * asset.price
                      })) || []}
                      showTooltip
                      showLegend
                    />
                  </div>
                  <div className="w-full lg:w-1/2 h-full">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="py-2 px-4 text-left font-medium">Asset</th>
                          <th className="py-2 px-4 text-right font-medium">Value</th>
                          <th className="py-2 px-4 text-right font-medium">Allocation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assetAllocation?.map((asset: { name: string; balance: number; price: number }, i: number) => (
                          <tr key={i} className="border-b">
                            <td className="py-2 px-4 font-medium">{asset.name}</td>
                            <td className="py-2 px-4 text-right">${(asset.balance * asset.price).toFixed(2)}</td>
                            <td className="py-2 px-4 text-right">{((asset.balance * asset.price) / (portfolioHistory?.[portfolioHistory.length - 1]?.value || 1) * 100).toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
