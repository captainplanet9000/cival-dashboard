'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { 
  LineChart, 
  BarChart2 as BarChart, 
  ArrowUp, 
  ArrowDown, 
  ArrowRight, 
  TrendingUp, 
  TrendingDown,
  RefreshCw, 
  Zap, 
  Activity,
  Sun,
  Moon,
  DollarSign,
  Bot,
  Plus,
  LayoutDashboard,
  Layers,
  Percent,
  ShieldAlert,
  Loader2
} from "lucide-react";
import { useSocket } from "@/providers/socket-provider";
import { useTheme } from "next-themes";
import Link from "next/link";
import OrderUpdatesStream from "@/components/websocket/order-updates-stream";
import ExecutionNotifications from "@/components/websocket/execution-notifications";
import PriceAlertSystem from "@/components/websocket/price-alert-system";
import { WidgetContainer } from "@/components/dashboard/widget-container";
import { ElizaOSCentricLayout, Widget } from '@/components/layouts/elizaos-centric-layout';
import { LineChart as ChartComponent, BarChart as BarChartComponent, PieChart } from '@/components/charts';

// Import TanStack Query hooks
import { useFarmAgents } from "@/hooks/react-query/use-agent-queries";
import { useDashboardData, useRiskMetrics } from "@/hooks/react-query/use-dashboard-queries";
import { useMarketData } from "@/hooks/react-query/use-market-queries";
import { usePortfolioData } from "@/hooks/react-query/use-portfolio-queries";
import { getCacheTimeForEntity } from "@/utils/react-query/enhanced-cache-config";

// Types for dashboard data
interface Agent {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'inactive';
  type: string;
  capabilities: string[];
  performance: {
    winRate: number;
    profitLoss: number;
  };
}

export default function DashboardPage() {
  // State
  const [farmId, setFarmId] = React.useState<string>("farm-1");
  const [activeTab, setActiveTab] = React.useState<string>("unified");
  const [currentTime, setCurrentTime] = React.useState<string>("");
  
  // Hooks
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { isConnected } = useSocket();
  
  // TanStack Query hooks with enhanced cache configuration
  const { 
    data: agents = [], 
    isLoading: loadingAgents,
    isError: agentsError,
    error: agentsErrorData,
    refetch: refetchAgents
  } = useFarmAgents(farmId);
  
  // Dashboard data using TanStack Query
  const {
    data: dashboardData,
    isLoading: loadingDashboard,
    isError: dashboardError,
    refetch: refetchDashboard
  } = useDashboardData(farmId);
  
  // Risk metrics data using TanStack Query
  const {
    data: riskData,
    isLoading: loadingRisk,
    refetch: refetchRisk
  } = useRiskMetrics(farmId);
  
  // Market data 
  const {
    data: marketData,
    isLoading: loadingMarket,
  } = useMarketData();
  
  // Portfolio data
  const {
    data: portfolioData,
    isLoading: loadingPortfolio,
  } = usePortfolioData(farmId);

  // Initialize dashboard time and observe agent query errors
  React.useEffect(() => {
    // Update current time immediately
    const now = new Date();
    setCurrentTime(now.toLocaleTimeString());
    
    // Set up timer to update time every minute
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 60000);
    
    // Show error toast if there's an issue with agent data
    if (agentsError) {
      toast({
        title: "Error loading agents",
        description: agentsErrorData instanceof Error 
          ? agentsErrorData.message 
          : "An unknown error occurred",
        variant: "destructive",
      });
    }
    
    return () => clearInterval(timeInterval);
  }, [agentsError, agentsErrorData, toast]);

  // Toggle theme function
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // Refresh dashboard data
  const refreshDashboard = async () => {
    try {
      // Update time
      setCurrentTime(new Date().toLocaleTimeString());
      
      // Refetch all data using TanStack Query's refetch methods
      await Promise.all([
        refetchAgents(),
        refetchDashboard(),
        refetchRisk()
      ]);
      
      toast({
        title: "Dashboard refreshed",
        description: `Last updated: ${new Date().toLocaleTimeString()}`,
      });
    } catch (error) {
      toast({
        title: "Error refreshing dashboard",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };

  // Sample top performing asset data
  const topAssets = [
    { asset: 'BTC', allocation: 35, performance: 12.5 },
    { asset: 'ETH', allocation: 25, performance: 8.2 },
    { asset: 'SOL', allocation: 15, performance: 24.8 },
    { asset: 'BNB', allocation: 10, performance: 5.3 },
    { asset: 'DOT', allocation: 8, performance: -2.1 },
    { asset: 'AVAX', allocation: 7, performance: 15.7 },
  ];

  // Asset allocation chart data
  const assetAllocationData = {
    labels: topAssets.map(asset => asset.asset),
    datasets: [
      {
        label: 'Allocation %',
        data: topAssets.map(asset => asset.allocation),
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)',
          'rgba(255, 159, 64, 0.7)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Market performance chart data (weekly)
  const marketPerformanceData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'BTC Price',
        data: [50200, 50800, 51200, 50600, 52000, 53500, 53000],
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        tension: 0.2,
      },
      {
        label: 'ETH Price',
        data: [2800, 2750, 2900, 3000, 3100, 3050, 3200],
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        tension: 0.2,
      },
    ],
  };

  // Show loading state if any critical data is still loading
  if (loadingDashboard && loadingAgents) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <ElizaOSCentricLayout
      title="Trading Farm Dashboard"
      description={`Last updated: ${currentTime} | ${isConnected ? 'Connected' : 'Disconnected'}`}
      actions={
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="mr-2"
            aria-label="Toggle Theme"
          >
            {theme === "dark" ? <Sun className="h-[1.2rem] w-[1.2rem]" /> : <Moon className="h-[1.2rem] w-[1.2rem]" />}
          </Button>
          <Button
            onClick={refreshDashboard}
            disabled={loadingDashboard || loadingAgents}
            aria-label="Refresh Data"
          >
            <RefreshCw className="h-[1.2rem] w-[1.2rem]" />
          </Button>
        </>
      }
      leftWidgets={
        <>
          {/* Portfolio Summary */}
          <Widget title="Portfolio Summary" width="full" height="medium">
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <Card className="shadow-sm border-2 border-muted">
                  <CardContent className="pt-6 px-6 pb-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-base font-medium text-muted-foreground mb-1.5">Total Balance</p>
                        <div className="flex flex-col">
                          <h3 className="text-3xl font-bold tracking-tight mb-0.5">$186,432.80</h3>
                          <span className="text-sm text-muted-foreground">As of today</span>
                        </div>
                      </div>
                      <div className="bg-primary/10 p-3 rounded-full">
                        <DollarSign className="h-7 w-7 text-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="shadow-sm border-2 border-muted">
                  <CardContent className="pt-6 px-6 pb-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-base font-medium text-muted-foreground mb-1.5">Active Positions</p>
                        <div className="flex flex-col">
                          <h3 className="text-3xl font-bold tracking-tight mb-0.5">14</h3>
                          <span className="text-sm text-muted-foreground">Across all markets</span>
                        </div>
                      </div>
                      <div className="bg-primary/10 p-3 rounded-full">
                        <Layers className="h-7 w-7 text-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="shadow-sm border-2 border-muted">
                  <CardContent className="pt-6 px-6 pb-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-base font-medium text-muted-foreground mb-1.5">24h Change</p>
                        <div className="flex flex-col">
                          <h3 className="text-3xl font-bold tracking-tight text-green-500 mb-0.5">+$3,240.50</h3>
                          <span className="text-sm text-green-500/80">Up 1.7% today</span>
                        </div>
                      </div>
                      <div className="bg-green-500/10 p-3 rounded-full">
                        <TrendingUp className="h-7 w-7 text-green-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="shadow-sm border-2 border-muted">
                  <CardContent className="pt-6 px-6 pb-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-base font-medium text-muted-foreground mb-1.5">ROI (30d)</p>
                        <div className="flex flex-col">
                          <h3 className="text-3xl font-bold tracking-tight text-green-500 mb-0.5">+8.2%</h3>
                          <span className="text-sm text-green-500/80">Outperforming market</span>
                        </div>
                      </div>
                      <div className="bg-green-500/10 p-3 rounded-full">
                        <Percent className="h-7 w-7 text-green-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <h4 className="text-sm font-medium mb-3">Asset Allocation</h4>
              <div className="h-[200px]">
                <PieChart
                  data={assetAllocationData}
                />
              </div>
            </div>
          </Widget>
          
          {/* Risk Metrics */}
          <Widget title="Risk Overview" width="full" height="small">
            {loadingRisk ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                  <Card className="shadow-sm border-2 border-muted">
                    <CardContent className="py-5 px-5">
                      <div className="flex flex-col items-center">
                        <p className="text-base font-medium text-muted-foreground mb-3">Portfolio Risk</p>
                        <div className="relative w-20 h-20 mb-3">
                          <div className="absolute inset-0 rounded-full bg-yellow-200 dark:bg-yellow-900/50"></div>
                          <div className="absolute inset-1 rounded-full bg-background flex items-center justify-center">
                            <span className="text-xl font-semibold">Med</span>
                          </div>
                        </div>
                        <p className="text-sm font-medium">72/100</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="shadow-sm border-2 border-muted">
                    <CardContent className="py-5 px-5">
                      <div className="flex flex-col items-center">
                        <p className="text-base font-medium text-muted-foreground mb-3">Drawdown</p>
                        <h3 className="text-3xl font-bold mb-3">8.4%</h3>
                        <p className="text-sm font-medium text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30 py-1 px-3 rounded-full">Warning</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="shadow-sm border-2 border-muted">
                    <CardContent className="py-5 px-5">
                      <div className="flex flex-col items-center">
                        <p className="text-base font-medium text-muted-foreground mb-3">Volatility</p>
                        <h3 className="text-3xl font-bold mb-3">5.2%</h3>
                        <p className="text-sm font-medium text-green-500 bg-green-100 dark:bg-green-900/30 py-1 px-3 rounded-full">Normal</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="flex items-center space-x-2 text-sm">
                  <ShieldAlert className="h-4 w-4 text-yellow-500" />
                  <span className="text-yellow-500 font-medium">Risk Alert:</span>
                  <span>BTC position exceeds allocation target by 5%</span>
                </div>
              </div>
            )}
          </Widget>
          
          {/* Agent Status */}
          <Widget title="Trading Agents" width="full" height="medium">
            {loadingAgents ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="p-1">
                <div className="grid gap-3">
                  {agents.slice(0, 4).map((agent: {
                    id: string;
                    name: string;
                    status: 'active' | 'paused' | 'inactive';
                    type: string;
                    performance: {
                      profitLoss: number;
                      winRate: number;
                    };
                  }) => (
                    <Card key={agent.id} className="bg-muted/40">
                      <CardContent className="p-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-3">
                            <div className="bg-primary/10 p-2 rounded-full">
                              <Bot className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{agent.name}</p>
                              <div className="flex items-center text-xs text-muted-foreground">
                                <span className="mr-2">{agent.type}</span>
                                <Badge variant={
                                  agent.status === 'active' ? 'default' : 
                                  agent.status === 'paused' ? 'outline' : 'secondary'
                                }>
                                  {agent.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-medium ${agent.performance.profitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {agent.performance.profitLoss >= 0 ? '+' : ''}{agent.performance.profitLoss}%
                            </p>
                            <p className="text-xs text-muted-foreground">{agent.performance.winRate}% win rate</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="mt-3 text-center">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/agents">
                      <Plus className="h-4 w-4 mr-1" />
                      View All Agents
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </Widget>
        </>
      }
      centerWidgets={
        <>
          {/* Market Overview */}
          <Widget title="Market Overview" width="full" height="medium">
            {loadingMarket ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="p-1">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <Card className="bg-muted/40">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-muted-foreground">BTC/USDT</p>
                          <h3 className="text-xl font-bold">$52,890.40</h3>
                          <p className="text-xs text-green-500">+2.4% (24h)</p>
                        </div>
                        <div className="bg-green-500/10 p-1.5 rounded">
                          <ArrowUp className="h-5 w-5 text-green-500" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-muted/40">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-muted-foreground">ETH/USDT</p>
                          <h3 className="text-xl font-bold">$2,890.75</h3>
                          <p className="text-xs text-green-500">+1.8% (24h)</p>
                        </div>
                        <div className="bg-green-500/10 p-1.5 rounded">
                          <ArrowUp className="h-5 w-5 text-green-500" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-muted/40">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-muted-foreground">SOL/USDT</p>
                          <h3 className="text-xl font-bold">$134.80</h3>
                          <p className="text-xs text-red-500">-0.7% (24h)</p>
                        </div>
                        <div className="bg-red-500/10 p-1.5 rounded">
                          <ArrowDown className="h-5 w-5 text-red-500" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-muted/40">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-muted-foreground">BNB/USDT</p>
                          <h3 className="text-xl font-bold">$410.50</h3>
                          <p className="text-xs text-green-500">+0.5% (24h)</p>
                        </div>
                        <div className="bg-green-500/10 p-1.5 rounded">
                          <ArrowRight className="h-5 w-5 text-green-500" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <h4 className="text-sm font-medium mb-3">7-Day Performance</h4>
                <div className="h-[200px]">
                  <ChartComponent
                    data={marketPerformanceData}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: {
                          position: 'top',
                        },
                      },
                    }}
                  />
                </div>
              </div>
            )}
          </Widget>
          
          {/* Top Performing Assets */}
          <Widget title="Top Performing Assets" width="full" height="small">
            <div className="p-1">
              <div className="h-[150px]">
                <BarChartComponent
                  data={{
                    labels: topAssets.map(asset => asset.asset),
                    datasets: [
                      {
                        label: 'Performance %',
                        data: topAssets.map(asset => asset.performance),
                        backgroundColor: topAssets.map(asset => 
                          asset.performance >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)'
                        ),
                      },
                    ],
                  }}
                  options={{
                    indexAxis: 'y',
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                  }}
                />
              </div>
            </div>
          </Widget>
        </>
      }
      bottomWidgets={
        <>
          {/* Recent Trades Widget */}
          <Widget title="Recent Trades" width="full" height="small">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Time</th>
                    <th className="text-left p-2">Pair</th>
                    <th className="text-left p-2">Side</th>
                    <th className="text-left p-2">Price</th>
                    <th className="text-left p-2">Amount</th>
                    <th className="text-left p-2">Value</th>
                    <th className="text-left p-2">Agent</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-2">13:25:44</td>
                    <td className="p-2">BTC/USD</td>
                    <td className="p-2 text-green-500">Buy</td>
                    <td className="p-2">$52,890</td>
                    <td className="p-2">0.05 BTC</td>
                    <td className="p-2">$2,644.50</td>
                    <td className="p-2">Trend Follower</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2">12:18:32</td>
                    <td className="p-2">ETH/USD</td>
                    <td className="p-2 text-green-500">Buy</td>
                    <td className="p-2">$2,890</td>
                    <td className="p-2">1.2 ETH</td>
                    <td className="p-2">$3,468.00</td>
                    <td className="p-2">Market Analyst</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2">11:42:15</td>
                    <td className="p-2">SOL/USD</td>
                    <td className="p-2 text-red-500">Sell</td>
                    <td className="p-2">$134.80</td>
                    <td className="p-2">10 SOL</td>
                    <td className="p-2">$1,348.00</td>
                    <td className="p-2">Portfolio Optimizer</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2">09:30:08</td>
                    <td className="p-2">BNB/USD</td>
                    <td className="p-2 text-red-500">Sell</td>
                    <td className="p-2">$410.50</td>
                    <td className="p-2">2.5 BNB</td>
                    <td className="p-2">$1,026.25</td>
                    <td className="p-2">Risk Manager</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Widget>
          
          {/* Price Alert System */}
          <Widget title="Market Alerts" width="full" height="small">
            <div className="p-1">
              {isConnected ? (
                <Badge className="mb-2" variant="outline">
                  <span className="h-2 w-2 rounded-full bg-green-500 mr-1 inline-block"></span>
                  Connected
                </Badge>
              ) : (
                <Badge className="mb-2" variant="outline">
                  <span className="h-2 w-2 rounded-full bg-red-500 mr-1 inline-block"></span>
                  Disconnected
                </Badge>
              )}
              <div className="bg-muted/30 p-2 rounded-md">
                <PriceAlertSystem farmId={farmId} />
                <ExecutionNotifications farmId={farmId} />
              </div>
            </div>
          </Widget>
        </>
      }
    />
  );
}
