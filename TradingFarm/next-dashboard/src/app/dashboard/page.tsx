"use client";

import React, { useEffect, useState } from "react";
import { dashboardApi, DashboardData } from "../../lib/api-client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSocket } from "@/providers/socket-provider";
import OrderUpdatesStream from "@/components/websocket/order-updates-stream";
import CommandConsole from "@/components/elizaos/command-console";
import RiskMetricsCard from "@/components/risk-management/risk-metrics-card";
import UnifiedDashboard from "@/components/dashboard/unified-dashboard";
import WidgetContainer from "@/components/dashboard/widget-container";
import PriceAlertSystem from "@/components/websocket/price-alert-system";
import ExecutionNotifications from "@/components/websocket/execution-notifications";
import { createBrowserClient } from "@/utils/supabase/client";
import { useTheme } from "next-themes";
import { useToast } from "@/components/ui/use-toast";
import {
  Activity,
  BarChart2,
  Brain,
  LineChart,
  DollarSign,
  LayoutDashboard,
  Layers,
  Percent,
  RefreshCw,
  ShieldAlert,
  Zap,
  Sun,
  Moon,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [farmId, setFarmId] = useState<string>("1"); // Default to first farm
  const [activeTab, setActiveTab] = useState<string>("unified");
  const { isConnected } = useSocket();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const supabase = createBrowserClient();

  // Sample risk metrics data for demonstration
  const riskMetricsData = {
    portfolioValue: 125000,
    totalRisk: 25000,
    riskCapacityUsed: 65,
    maxDrawdown: 12.5,
    currentDrawdown: 3.8,
    sharpeRatio: 1.85,
    dailyVaR: 1250,
    dailyVaRPercentage: 1.0,
    stressTestLoss: 18750,
    stressTestLossPercentage: 15,
    valueAtRisk: 6250,
    valueAtRiskPercentage: 5,
    marginUsagePercentage: 28,
    leverageRatio: 2.5,
    riskRewardRatio: 2.1,
    riskPerTrade: 0.8,
    concentrationRisk: 42,
    riskExposureByAsset: [
      { symbol: "BTC/USD", exposure: 50000, riskContribution: 40 },
      { symbol: "ETH/USD", exposure: 30000, riskContribution: 24 },
      { symbol: "SOL/USD", exposure: 25000, riskContribution: 20 },
      { symbol: "AVAX/USD", exposure: 20000, riskContribution: 16 }
    ],
    riskExposureByStrategy: [
      { strategy: "Momentum", exposure: 75000, riskContribution: 60 },
      { strategy: "Mean Reversion", exposure: 50000, riskContribution: 40 }
    ],
    riskProfile: {
      id: "profile-1",
      name: "Balanced Growth",
      risk_level: "moderate" as "moderate"
    },
    riskLimits: {
      maxPositionSize: 25000,
      maxPositionSizePercentage: 20,
      maxDrawdownPercentage: 15,
      maxDailyLossPercentage: 2
    },
    breachedLimits: [
      {
        limit: "Concentration in BTC",
        currentValue: 40,
        maxValue: 35,
        percentageOver: 14.3
      }
    ],
    largestDrawdowns: [
      {
        startDate: "2025-02-15T00:00:00Z",
        endDate: "2025-02-28T00:00:00Z",
        durationDays: 13,
        drawdownPercentage: 12.5,
        recovered: true
      },
      {
        startDate: "2025-03-20T00:00:00Z",
        endDate: "2025-03-30T00:00:00Z",
        durationDays: 10,
        drawdownPercentage: 3.8,
        recovered: false
      }
    ]
  };

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      const response = await dashboardApi.getDashboardSummary(1); // User ID 1
      
      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        setData(response.data);
      }
      
      setLoading(false);
    }

    fetchDashboardData();

    // Get the current user's farms
    async function getUserFarms() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: farms } = await supabase
          .from('farms')
          .select('id, name')
          .eq('user_id', user.id);
        
        if (farms && farms.length > 0) {
          setFarmId(farms[0].id);
        }
      }
    }

    getUserFarms();

    // Show connection status notification
    if (isConnected) {
      toast({
        title: "WebSocket Connected",
        description: "You are now receiving real-time updates",
        variant: "default",
      });
    }
  }, [supabase, isConnected, toast]);

  const refreshData = () => {
    setLoading(true);
    toast({
      description: "Refreshing dashboard data...",
    });
    
    // Re-fetch data
    dashboardApi.getDashboardSummary(1).then(response => {
      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        setData(response.data);
        toast({
          description: "Dashboard data refreshed successfully",
        });
      }
      setLoading(false);
    });
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-lg bg-destructive/10 p-6 text-center">
          <h3 className="mb-2 text-lg font-semibold text-destructive">Error Loading Dashboard</h3>
          <p className="text-destructive">{error}</p>
          <Button variant="outline" className="mt-4" onClick={refreshData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 px-4 py-2 border-b">
        <h1 className="text-2xl font-bold">Trading Farm Dashboard</h1>
        <div className="flex items-center space-x-4">
          <Badge variant={isConnected ? "outline" : "destructive"} className="px-3 py-1">
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
          <Button variant="outline" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={refreshData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="px-4 flex-grow overflow-auto">
        <Tabs defaultValue="unified" onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="unified">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Unified Dashboard
            </TabsTrigger>
            <TabsTrigger value="overview">
              <BarChart2 className="mr-2 h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="orders">
              <Layers className="mr-2 h-4 w-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="risk">
              <ShieldAlert className="mr-2 h-4 w-4" />
              Risk Management
            </TabsTrigger>
            <TabsTrigger value="elizaos">
              <Brain className="mr-2 h-4 w-4" />
              ElizaOS
            </TabsTrigger>
          </TabsList>

          {/* Unified Dashboard Tab */}
          <TabsContent value="unified" className="space-y-4">
            <UnifiedDashboard farmId={farmId} />
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard 
                title="Portfolio Value" 
                value={data.portfolio.total_value} 
                description="Total value of all assets" 
                trend="up" 
                icon={<DollarSign className="h-4 w-4" />} 
              />
              <StatCard 
                title="24h PnL" 
                value={data.portfolio.daily_pnl} 
                description="Profit/Loss in the last 24h" 
                trend={data.portfolio.daily_pnl_percentage > 0 ? "up" : "down"} 
                icon={<Percent className="h-4 w-4" />} 
              />
              <StatCard 
                title="Active Orders" 
                value={data.orders.active_count} 
                description="Orders currently in the market" 
                trend="neutral" 
                icon={<Activity className="h-4 w-4" />} 
              />
              <StatCard 
                title="Risk Usage" 
                value={riskMetricsData.riskCapacityUsed} 
                description="% of risk capacity used" 
                trend={riskMetricsData.riskCapacityUsed > 75 ? "down" : "neutral"} 
                icon={<ShieldAlert className="h-4 w-4" />} 
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="col-span-2">
                <CardHeader>
                  <CardTitle>Portfolio Performance</CardTitle>
                  <CardDescription>
                    Return on investment over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full bg-muted/30 rounded-md flex items-center justify-center">
                    <p className="text-muted-foreground">Performance Chart</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Asset Allocation</CardTitle>
                  <CardDescription>
                    Current distribution of assets
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full bg-muted/30 rounded-md flex items-center justify-center">
                    <p className="text-muted-foreground">Allocation Chart</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Trades</CardTitle>
                  <CardDescription>Last 5 executed trades</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.trades.recent.map((trade: { symbol: string, timestamp: string, side: string, amount: number, price: number, total_value: number }, i: number) => (
                      <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                        <div>
                          <p className="font-medium">{trade.symbol}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(trade.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium ${trade.side === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                            {trade.side.toUpperCase()} {trade.amount} @ {trade.price}
                          </p>
                          <p className="text-sm text-muted-foreground">${trade.total_value.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Key Metrics</CardTitle>
                  <CardDescription>Performance indicators</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <MetricCard 
                      title="Sharpe Ratio" 
                      value={riskMetricsData.sharpeRatio.toFixed(2)} 
                      trend={riskMetricsData.sharpeRatio > 1 ? "up" : "down"} 
                      icon={<LineChart className="h-4 w-4" />} 
                    />
                    <MetricCard 
                      title="Drawdown" 
                      value={`${riskMetricsData.currentDrawdown.toFixed(1)}%`} 
                      trend="down" 
                      icon={<TrendingDown className="h-4 w-4" />} 
                    />
                    <MetricCard 
                      title="Daily VaR" 
                      value={`$${riskMetricsData.dailyVaR.toLocaleString()}`} 
                      trend="neutral" 
                      icon={<ShieldAlert className="h-4 w-4" />} 
                    />
                    <MetricCard 
                      title="Leverage" 
                      value={`${riskMetricsData.leverageRatio}x`} 
                      trend={riskMetricsData.leverageRatio > 3 ? "down" : "neutral"} 
                      icon={<Zap className="h-4 w-4" />} 
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-1">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle>Order Update Stream</CardTitle>
                    <CardDescription>
                      Real-time updates on your orders
                    </CardDescription>
                  </div>
                  <Badge variant={isConnected ? "outline" : "destructive"}>
                    {isConnected ? "Live" : "Offline"}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <OrderUpdatesStream farmId={farmId} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Price Alerts</CardTitle>
                  <CardDescription>
                    Set and monitor price alerts for assets
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PriceAlertSystem farmId={farmId} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Execution Notifications</CardTitle>
                  <CardDescription>
                    Real-time order execution updates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ExecutionNotifications farmId={farmId} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Risk Management Tab */}
          <TabsContent value="risk" className="space-y-4">
            <RiskMetricsCard data={riskMetricsData} />
          </TabsContent>

          {/* ElizaOS Tab */}
          <TabsContent value="elizaos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>ElizaOS Command Console</CardTitle>
                <CardDescription>
                  AI-powered trading assistant
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CommandConsole farmId={farmId} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  description: string;
  trend: "up" | "down" | "neutral";
  icon?: React.ReactNode;
}

function StatCard({ title, value, description, trend, icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {typeof value === 'number' && title.includes("Value") ? "$" : ""}
          {typeof value === 'number' ? value.toLocaleString() : value}
          {typeof value === 'number' && title.includes("Risk Usage") ? "%" : ""}
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
        {trend && (
          <div className="mt-2 flex items-center text-xs">
            {trend === "up" ? (
              <>
                <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                <span className="text-green-500">Increasing</span>
              </>
            ) : trend === "down" ? (
              <>
                <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                <span className="text-red-500">Decreasing</span>
              </>
            ) : (
              <span className="text-muted-foreground">Stable</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  trend: "up" | "down" | "neutral";
  icon?: React.ReactNode;
}

function MetricCard({ title, value, trend, icon }: MetricCardProps) {
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{title}</h4>
        {icon}
      </div>
      <div className="mt-1 text-lg font-bold">{value}</div>
      <div className="mt-1 flex items-center text-xs">
        {trend === "up" ? (
          <>
            <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
            <span className="text-green-500">Good</span>
          </>
        ) : trend === "down" ? (
          <>
            <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
            <span className="text-red-500">Caution</span>
          </>
        ) : (
          <span className="text-muted-foreground">Neutral</span>
        )}
      </div>
    </div>
  );
}