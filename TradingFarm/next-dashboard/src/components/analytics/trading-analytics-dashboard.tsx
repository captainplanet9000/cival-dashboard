/**
 * Trading Analytics Dashboard Component
 * Provides comprehensive trading performance metrics and visualizations
 */
'use client';

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { Database } from '@/types/database.types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button-standardized';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DashboardLoading, DashboardError, DashboardEmpty } from '@/components/ui/dashboard-states';
import { cn } from '@/lib/utils';
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  BarChart4,
  Calendar,
  ArrowRight,
  Zap,
  Download,
  Info,
  AlertTriangle,
  BarChart,
  LineChart,
  PieChart,
} from 'lucide-react';

// Mock data structure for analytics
interface PerformanceMetrics {
  totalPnl: number;
  pnlChange: number;
  winRate: number;
  winRateChange: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  profitFactorChange: number;
  sharpeRatio: number;
  maxDrawdown: number;
  maxDrawdownChange: number;
  tradeCount: number;
  tradeCountChange: number;
  bestTrade: {
    symbol: string;
    profit: number;
    percent: number;
  };
  worstTrade: {
    symbol: string;
    profit: number;
    percent: number;
  };
}

interface AssetPerformance {
  symbol: string;
  pnl: number;
  pnlPercent: number;
  trades: number;
  winRate: number;
  averageHoldingTime: string;
}

// Sample data for demonstration
const samplePerformanceData: PerformanceMetrics = {
  totalPnl: 12583.75,
  pnlChange: 8.7,
  winRate: 62.4,
  winRateChange: 3.2,
  averageWin: 450.25,
  averageLoss: -215.65,
  profitFactor: 2.15,
  profitFactorChange: 0.3,
  sharpeRatio: 1.78,
  maxDrawdown: 15.2,
  maxDrawdownChange: -2.1,
  tradeCount: 128,
  tradeCountChange: 18,
  bestTrade: {
    symbol: 'ETH',
    profit: 1876.50,
    percent: 12.4,
  },
  worstTrade: {
    symbol: 'SOL',
    profit: -942.30,
    percent: -8.3,
  },
};

const sampleAssetPerformance: AssetPerformance[] = [
  { symbol: 'BTC', pnl: 5432.75, pnlPercent: 7.2, trades: 32, winRate: 68.8, averageHoldingTime: '2d 14h' },
  { symbol: 'ETH', pnl: 3218.50, pnlPercent: 12.4, trades: 41, winRate: 70.7, averageHoldingTime: '1d 8h' },
  { symbol: 'SOL', pnl: -832.40, pnlPercent: -5.7, trades: 28, winRate: 42.9, averageHoldingTime: '18h' },
  { symbol: 'BNB', pnl: 1283.15, pnlPercent: 3.8, trades: 15, winRate: 60.0, averageHoldingTime: '3d 2h' },
  { symbol: 'ADA', pnl: 327.90, pnlPercent: 2.1, trades: 12, winRate: 58.3, averageHoldingTime: '1d 20h' },
];

interface TradingAnalyticsDashboardProps {
  userId: string;
}

/**
 * Trading analytics dashboard component providing comprehensive performance metrics
 */
export function TradingAnalyticsDashboard({ userId }: TradingAnalyticsDashboardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [performanceData, setPerformanceData] = useState<PerformanceMetrics | null>(null);
  const [assetPerformance, setAssetPerformance] = useState<AssetPerformance[]>([]);
  const [timeframe, setTimeframe] = useState('30d');
  const supabase = createBrowserClient<Database>();

  // Load analytics data
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setIsLoading(true);
        setHasError(false);

        // In a real implementation, this would fetch data from the database
        // For demonstration, we're using sample data with a simulated delay
        setTimeout(() => {
          setPerformanceData(samplePerformanceData);
          setAssetPerformance(sampleAssetPerformance);
          setIsLoading(false);
        }, 1500);
      } catch (error) {
        console.error('Failed to fetch analytics data:', error);
        setHasError(true);
        setIsLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [userId, timeframe]);

  // Handle timeframe change
  const handleTimeframeChange = (value: string) => {
    setTimeframe(value);
  };

  // Generate PDF report
  const generateReport = () => {
    console.log('Generating PDF report for timeframe:', timeframe);
    // In a real implementation, this would generate a PDF report
    alert('Report generation started. Your PDF will be available shortly.');
  };

  if (isLoading) {
    return <DashboardLoading title="Loading Analytics" message="Analyzing your trading performance..." />;
  }

  if (hasError) {
    return <DashboardError title="Analytics Error" message="We encountered an error loading your performance data. Please try again later." />;
  }

  if (!performanceData) {
    return <DashboardEmpty title="No Analytics Data" message="There is no performance data available for the selected period." />;
  }

  return (
    <div className="space-y-6">
      {/* Header with filter controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Trading Analytics</h2>
          <p className="text-muted-foreground">Analyze your trading performance and identify opportunities.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue={timeframe} onValueChange={handleTimeframeChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={generateReport} variant="outline" size="sm" className="gap-1">
            <Download className="h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              performanceData.totalPnl >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {performanceData.totalPnl >= 0 ? '+' : ''}{performanceData.totalPnl.toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD',
              })}
            </div>
            <div className="flex items-center mt-1">
              {performanceData.pnlChange >= 0 ? (
                <div className="flex items-center text-green-600">
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                  <span className="text-sm">+{performanceData.pnlChange}% vs previous</span>
                </div>
              ) : (
                <div className="flex items-center text-red-600">
                  <ArrowDownRight className="h-4 w-4 mr-1" />
                  <span className="text-sm">{performanceData.pnlChange}% vs previous</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceData.winRate}%</div>
            <div className="flex items-center mt-1">
              {performanceData.winRateChange >= 0 ? (
                <div className="flex items-center text-green-600">
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                  <span className="text-sm">+{performanceData.winRateChange}% vs previous</span>
                </div>
              ) : (
                <div className="flex items-center text-red-600">
                  <ArrowDownRight className="h-4 w-4 mr-1" />
                  <span className="text-sm">{performanceData.winRateChange}% vs previous</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Profit Factor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceData.profitFactor.toFixed(2)}</div>
            <div className="flex items-center mt-1">
              {performanceData.profitFactorChange >= 0 ? (
                <div className="flex items-center text-green-600">
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                  <span className="text-sm">+{performanceData.profitFactorChange} vs previous</span>
                </div>
              ) : (
                <div className="flex items-center text-red-600">
                  <ArrowDownRight className="h-4 w-4 mr-1" />
                  <span className="text-sm">{performanceData.profitFactorChange} vs previous</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Max Drawdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{performanceData.maxDrawdown}%</div>
            <div className="flex items-center mt-1">
              {performanceData.maxDrawdownChange <= 0 ? (
                <div className="flex items-center text-green-600">
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                  <span className="text-sm">{performanceData.maxDrawdownChange}% vs previous</span>
                </div>
              ) : (
                <div className="flex items-center text-red-600">
                  <ArrowDownRight className="h-4 w-4 mr-1" />
                  <span className="text-sm">+{performanceData.maxDrawdownChange}% vs previous</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="overview" className="w-full space-y-5">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart4 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="by-asset" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            By Asset
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <LineChart className="h-4 w-4" />
            Advanced Metrics
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Performance Chart */}
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Cumulative P&L</CardTitle>
                <CardDescription>Your profit and loss over time</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <div className="h-full w-full flex items-center justify-center bg-muted/10 rounded-md">
                  <div className="text-center">
                    <BarChart className="h-12 w-12 text-primary mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Performance Chart</p>
                    <p className="text-sm text-muted-foreground">In a real implementation, this would show a chart</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Trade Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Trade Statistics</CardTitle>
                <CardDescription>Key metrics about your trading activity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Trades</span>
                    <span className="font-medium">{performanceData.tradeCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Average Win</span>
                    <span className="font-medium text-green-600">
                      ${performanceData.averageWin.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Average Loss</span>
                    <span className="font-medium text-red-600">
                      ${performanceData.averageLoss.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Sharpe Ratio</span>
                    <span className="font-medium">{performanceData.sharpeRatio.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Best Trade</h4>
                  <div className="rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{performanceData.bestTrade.symbol}</div>
                      <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
                        +{performanceData.bestTrade.percent}%
                      </Badge>
                    </div>
                    <div className="mt-1 text-sm text-green-600 font-medium">
                      +${performanceData.bestTrade.profit.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Worst Trade</h4>
                  <div className="rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{performanceData.worstTrade.symbol}</div>
                      <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50">
                        {performanceData.worstTrade.percent}%
                      </Badge>
                    </div>
                    <div className="mt-1 text-sm text-red-600 font-medium">
                      ${performanceData.worstTrade.profit.toFixed(2)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* By Asset Tab */}
        <TabsContent value="by-asset" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Asset Performance</CardTitle>
              <CardDescription>P&L breakdown by trading instrument</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Asset P&L Chart Placeholder */}
                <div className="h-64 w-full flex items-center justify-center bg-muted/10 rounded-md">
                  <div className="text-center">
                    <PieChart className="h-12 w-12 text-primary mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Asset Allocation Chart</p>
                    <p className="text-sm text-muted-foreground">In a real implementation, this would show a pie chart</p>
                  </div>
                </div>

                {/* Asset Performance Table */}
                <div className="rounded-md border">
                  <div className="grid grid-cols-6 bg-muted/50 p-3 text-sm font-medium">
                    <div className="col-span-1">Asset</div>
                    <div className="col-span-1 text-right">P&L</div>
                    <div className="col-span-1 text-right">P&L %</div>
                    <div className="col-span-1 text-right">Trades</div>
                    <div className="col-span-1 text-right">Win Rate</div>
                    <div className="col-span-1 text-right">Avg Hold</div>
                  </div>
                  {assetPerformance.map((asset, index) => (
                    <div key={asset.symbol} className={cn(
                      "grid grid-cols-6 p-3 text-sm",
                      index !== assetPerformance.length - 1 && "border-b"
                    )}>
                      <div className="col-span-1 font-medium">{asset.symbol}</div>
                      <div className={cn(
                        "col-span-1 text-right font-medium",
                        asset.pnl >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {asset.pnl >= 0 ? '+' : ''}${Math.abs(asset.pnl).toFixed(2)}
                      </div>
                      <div className={cn(
                        "col-span-1 text-right",
                        asset.pnlPercent >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {asset.pnlPercent >= 0 ? '+' : ''}{asset.pnlPercent}%
                      </div>
                      <div className="col-span-1 text-right">{asset.trades}</div>
                      <div className="col-span-1 text-right">{asset.winRate}%</div>
                      <div className="col-span-1 text-right">{asset.averageHoldingTime}</div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Metrics Tab */}
        <TabsContent value="advanced" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Trading Consistency</CardTitle>
                <CardDescription>Stability of your trading performance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Daily Win Rate Consistency</span>
                      <span className="font-medium">84%</span>
                    </div>
                    <Progress value={84} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Return Consistency</span>
                      <span className="font-medium">68%</span>
                    </div>
                    <Progress value={68} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Risk Management Score</span>
                      <span className="font-medium">76%</span>
                    </div>
                    <Progress value={76} className="h-2" />
                  </div>
                </div>

                <div className="rounded-md border p-4 bg-muted/10">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium">Consistency Analysis</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your trading shows good consistency across time periods. Consider reducing position sizes on your least consistent assets to improve overall stability.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Metrics</CardTitle>
                <CardDescription>Advanced risk management indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-md border p-3">
                    <div className="text-sm text-muted-foreground">Sharpe Ratio</div>
                    <div className="text-xl font-bold mt-1">{performanceData.sharpeRatio.toFixed(2)}</div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-sm text-muted-foreground">Sortino Ratio</div>
                    <div className="text-xl font-bold mt-1">2.12</div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-sm text-muted-foreground">Calmar Ratio</div>
                    <div className="text-xl font-bold mt-1">1.93</div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-sm text-muted-foreground">Max Drawdown</div>
                    <div className="text-xl font-bold mt-1 text-amber-600">{performanceData.maxDrawdown}%</div>
                  </div>
                </div>

                <div className="rounded-md border p-4 bg-amber-50/50">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium">Risk Alert</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your position sizing on SOL appears to be higher than optimal based on its volatility. Consider reducing allocation to improve your risk-adjusted returns.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default TradingAnalyticsDashboard;
