'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity, 
  Target,
  Shield,
  Zap,
  BarChart3,
  LineChart,
  ExternalLink,
  RefreshCw,
  Clock
} from "lucide-react";
import { formatPrice, formatPercentage, formatRelativeTime } from "@/lib/utils";
import { PortfolioPerformanceChart } from "@/components/charts/portfolio-performance-chart";
import { usePortfolio } from "@/lib/hooks/usePortfolio";
import Link from "next/link";

export default function OverviewPage() {
  const { data: portfolioData, loading, error, refresh, isStale, lastFetch } = usePortfolio(true);

  // Handle loading state
  if (loading && !portfolioData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
            <p className="text-muted-foreground">Loading your trading performance data...</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-40"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Handle error state
  if (error && !portfolioData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
            <p className="text-muted-foreground text-red-600">Failed to load portfolio data</p>
          </div>
          <Button onClick={refresh} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">Error: {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If we have no data yet, show loading
  if (!portfolioData) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-muted-foreground mt-4">Loading portfolio data...</p>
        </div>
      </div>
    );
  }

  // Prepare metrics data from API response
  const metricsData = [
    {
      title: "Total Portfolio Value",
      value: portfolioData.totalValue,
      change: portfolioData.dailyChange,
      changePercent: portfolioData.dailyChangePercent,
      icon: DollarSign,
      format: "currency",
    },
    {
      title: "Active Strategies",
      value: portfolioData.strategies.filter(s => s.status === 'active').length,
      change: 1, // Could be calculated from historical data
      changePercent: 5.0,
      icon: Activity,
      format: "number",
    },
    {
      title: "Success Rate",
      value: portfolioData.metrics.winRate,
      change: 1.2,
      changePercent: 1.4,
      icon: Target,
      format: "percentage",
    },
    {
      title: "Total Trades Today",
      value: portfolioData.strategies.reduce((sum, s) => sum + s.trades, 0),
      change: 12,
      changePercent: 8.2,
      icon: BarChart3,
      format: "number",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
          <div className="flex items-center gap-4 text-muted-foreground">
            <span>Monitor your algorithmic trading performance and system health</span>
            {lastFetch && (
              <div className="flex items-center gap-1 text-xs">
                <Clock className="h-3 w-3" />
                <span>Updated {formatRelativeTime(lastFetch)}</span>
                {isStale && <span className="text-yellow-600">(stale)</span>}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refresh} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/risk">
              <Shield className="mr-2 h-4 w-4" />
              Risk Report
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/strategies">
              <Zap className="mr-2 h-4 w-4" />
              Manage Strategies
            </Link>
          </Button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metricsData.map((metric) => {
          const Icon = metric.icon;
          const isPositive = metric.change > 0;
          
          return (
            <Card key={metric.title} className={loading ? 'opacity-75' : ''}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {metric.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metric.format === "currency" && formatPrice(metric.value)}
                  {metric.format === "percentage" && `${metric.value.toFixed(1)}%`}
                  {metric.format === "number" && metric.value.toLocaleString()}
                </div>
                <p className={`text-xs ${isPositive ? 'text-trading-profit' : 'text-trading-loss'}`}>
                  {isPositive ? '+' : ''}{metric.format === "currency" ? formatPrice(metric.change) : metric.change} 
                  ({formatPercentage(metric.changePercent / 100)}) from yesterday
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Strategies */}
        <Card>
          <CardHeader>
            <CardTitle>Active Strategies</CardTitle>
            <CardDescription>
              Performance overview of your trading strategies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {portfolioData.strategies.map((strategy) => (
                <div key={strategy.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <div className={`status-indicator ${
                      strategy.status === 'active' ? 'status-online' : 
                      strategy.status === 'paused' ? 'status-warning' : 'status-offline'
                    }`}></div>
                    <div>
                      <p className="font-medium">{strategy.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {strategy.trades} trades • {strategy.winRate.toFixed(1)}% win rate • {strategy.avgHoldTime}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      strategy.totalReturn > 0 ? 'text-trading-profit' : 'text-trading-loss'
                    }`}>
                      {strategy.totalReturn > 0 ? '+' : ''}{strategy.totalReturn.toFixed(2)}%
                    </p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {strategy.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>
              Monitor the status of all trading system components
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {portfolioData.systemHealth.components.map((system) => (
                <div key={system.name} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <div className={`status-indicator ${
                      system.status === 'online' ? 'status-online' : 
                      system.status === 'warning' ? 'status-warning' : 'status-error'
                    }`}></div>
                    <div>
                      <p className="font-medium">{system.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Last check: {formatRelativeTime(system.lastCheck)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{system.uptime}</p>
                    <p className={`text-sm capitalize ${
                      system.status === 'online' ? 'text-status-online' : 
                      system.status === 'warning' ? 'text-status-warning' : 'text-status-error'
                    }`}>
                      {system.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Portfolio Performance Visualization */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LineChart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <CardTitle className="text-lg text-blue-900 dark:text-blue-100">
                  Live Portfolio Performance
                </CardTitle>
                <CardDescription className="text-blue-700 dark:text-blue-300">
                  Python-powered real-time analytics and visualization
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/analytics">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Full Analytics
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <PortfolioPerformanceChart height={350} autoRefresh={true} />
        </CardContent>
      </Card>

      {/* Portfolio Holdings */}
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Holdings</CardTitle>
          <CardDescription>
            Current positions and their performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {portfolioData.holdings.map((holding) => (
              <div key={holding.symbol} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <div>
                    <p className="font-medium">{holding.symbol}</p>
                    <p className="text-sm text-muted-foreground">{holding.name}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-6 text-sm">
                  <div className="text-right">
                    <p className="font-medium">{holding.quantity.toLocaleString()} shares</p>
                    <p className="text-muted-foreground">@ {formatPrice(holding.avgPrice)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatPrice(holding.marketValue)}</p>
                    <p className="text-muted-foreground">{formatPrice(holding.currentPrice)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${holding.pnl >= 0 ? 'text-trading-profit' : 'text-trading-loss'}`}>
                      {holding.pnl >= 0 ? '+' : ''}{formatPrice(holding.pnl)}
                    </p>
                    <p className={`text-sm ${holding.pnlPercent >= 0 ? 'text-trading-profit' : 'text-trading-loss'}`}>
                      {holding.pnlPercent >= 0 ? '+' : ''}{holding.pnlPercent.toFixed(2)}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{holding.allocation.toFixed(1)}%</p>
                    <p className="text-muted-foreground">allocation</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 