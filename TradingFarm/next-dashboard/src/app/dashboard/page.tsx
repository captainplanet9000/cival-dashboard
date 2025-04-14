'use client';

<<<<<<< HEAD
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
=======
import * as React from 'react';
import { Card, CardContent } from "@/components/ui/card";
>>>>>>> ee530173d166877056f383bf6b7f0704e2a4e0da
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
<<<<<<< HEAD
import UnifiedDashboard from "@/components/dashboard/unified-dashboard";
import RiskMetricsCard from "@/components/risk-management/risk-metrics-card";
import SimplifiedRiskCard from "@/components/risk-management/simplified-risk-card";
import CommandConsole from "@/components/elizaos/command-console";
=======
import { ExtendedAgent, agentService } from "@/services/agent-service";
>>>>>>> ee530173d166877056f383bf6b7f0704e2a4e0da
import OrderUpdatesStream from "@/components/websocket/order-updates-stream";
import ExecutionNotifications from "@/components/websocket/execution-notifications";
import PriceAlertSystem from "@/components/websocket/price-alert-system";
import { WidgetContainer } from "@/components/dashboard/widget-container";
import { ElizaOSCentricLayout, Widget } from '@/components/layouts/elizaos-centric-layout';
import { usePortfolioData } from '@/hooks/use-portfolio-data';
import { useMarketData } from '@/hooks/use-market-data';
import { useAgentStatus } from '@/hooks/use-agent-status';
import { LineChart as ChartComponent, BarChart as BarChartComponent, PieChart } from '@/components/charts';

// Import TanStack Query hooks
import { useFarmAgents } from "@/hooks/react-query/use-agent-queries";
import { useDashboardData, useRiskMetrics } from "@/hooks/react-query/use-dashboard-queries";

// Use the DashboardData interface from our query hook

export default function DashboardPage() {
  // State
  const [farmId, setFarmId] = React.useState<string>("farm-1");
<<<<<<< HEAD
  const [activeTab, setActiveTab] = React.useState<string>("unified");
=======
  const [agents, setAgents] = React.useState<ExtendedAgent[]>([]);
  const [loadingAgents, setLoadingAgents] = React.useState(true);
>>>>>>> ee530173d166877056f383bf6b7f0704e2a4e0da
  const [currentTime, setCurrentTime] = React.useState<string>("");
  const [error, setError] = React.useState<string | null>(null);
  
  // TanStack Query hooks
  const { 
    data: agents = [], 
    isLoading: loadingAgents,
    isError: agentsError,
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

  // Hooks
  const { isConnected } = useSocket();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
<<<<<<< HEAD
=======
  const supabase = createBrowserClient();
  
  // New data hooks
  const { data: portfolioData, isLoading: isLoadingPortfolio } = usePortfolioData(farmId);
  const { data: marketData, isLoading: isLoadingMarket } = useMarketData();
  const { data: agentStatus, isLoading: isLoadingAgents } = useAgentStatus(farmId);
>>>>>>> ee530173d166877056f383bf6b7f0704e2a4e0da

  // Initialize dashboard time and observe agent query errors
  React.useEffect(() => {
<<<<<<< HEAD
    // Update current time immediately
    const now = new Date();
    setCurrentTime(now.toLocaleTimeString());
    
    // Set up timer to update time every minute
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 60000);
    
    // If there's an error with the agents query, show a toast
    if (agentsError) {
      setError("Failed to load agent data");
      toast({
        title: "Error",
        description: "Failed to load agent data",
        variant: "destructive",
      });
    } else {
      // Clear any previous error when query succeeds
      setError(null);
    }
    
    return () => clearInterval(timeInterval);
  }, [agentsError, toast]);

  // Toggle theme function
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // Refresh dashboard data
  const refreshDashboard = async () => {
    setError(null);
    
    try {
      // Update time
      setCurrentTime(new Date().toLocaleTimeString());
      
      // Refetch all data using TanStack Query's refetch methods
      await Promise.all([
        refetchAgents(),
        refetchDashboard(),
        refetchRisk()
      ]);
=======
    async function initDashboard() {
      try {
        setLoading(true);
        
        // Mock dashboard data for now
        const mockDashboardData: DashboardData = {
          portfolioValue: 125000,
          pnl24h: 3450,
          winRate: 68,
          avgTradeDuration: "4h 32m",
          topPair: "BTC/USD",
          riskExposure: 35,
          riskExposureTrend: "neutral"
        };
        
        setData(mockDashboardData);
        
        // Fetch agents
        try {
          const { mockStandardAgents, mockElizaAgents } = await import('@/utils/supabase/mocks-agents');
          
          // Combine and filter agents for this farm
          const farmAgents = [...mockStandardAgents, ...mockElizaAgents]
            .filter(agent => agent.farm_id === farmId)
            .map(agent => ({
              ...agent,
              id: agent.id,
              name: agent.name,
              type: agent.type || 'standard',
              status: agent.status,
              farm_id: agent.farm_id,
              capabilities: agent.capabilities || [],
              performance: agent.performance || {
                win_rate: 0,
                profit_loss: 0,
                total_trades: 0, 
                average_trade_duration: 0
              }
            }));
          
          setAgents(farmAgents);
        } catch (err) {
          console.error("Error fetching agents:", err);
          toast({
            title: "Error",
            description: "Failed to load agent data",
            variant: "destructive",
          });
        } finally {
          setLoadingAgents(false);
        }
        
        // Set current time
        setCurrentTime(new Date().toLocaleString());
      } catch (err) {
        console.error("Error initializing dashboard:", err);
        setError("Failed to load dashboard data");
        toast({
          title: "Error",
          description: "Failed to initialize dashboard",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    
    initDashboard();
    
    // Set up refresh interval
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleString());
    }, 60000); // Update time every minute
    
    return () => clearInterval(interval);
  }, [farmId, toast, supabase]);
  
  // Function to refresh the dashboard
  const refreshDashboard = async () => {
    toast({
      title: "Refreshing",
      description: "Updating dashboard data...",
    });
    
    setLoading(true);
    
    try {
      // This would typically re-fetch data from API
      // For now, just update some mock values
      if (data) {
        setData({
          ...data,
          portfolioValue: data.portfolioValue + Math.random() * 1000 - 500,
          pnl24h: data.pnl24h + Math.random() * 200 - 100,
          winRate: Math.min(100, Math.max(0, data.winRate + Math.random() * 6 - 3)),
        });
      }
      
      // Update current time
      setCurrentTime(new Date().toLocaleString());
>>>>>>> ee530173d166877056f383bf6b7f0704e2a4e0da
      
      toast({
        title: "Refreshed",
        description: "Dashboard data updated",
      });
    } catch (err) {
      console.error("Error refreshing dashboard:", err);
      setError("Failed to refresh dashboard data");
      toast({
        title: "Error",
        description: "Failed to refresh dashboard data",
        variant: "destructive",
      });
    }
  };
  
  // Function to toggle theme
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // Sample top performing asset data
  const topAssets = [
    { asset: 'BTC', allocation: 35, performance: 12.5 },
    { asset: 'ETH', allocation: 25, performance: 8.2 },
    { asset: 'SOL', allocation: 15, performance: 24.8 },
    { asset: 'AVAX', allocation: 10, performance: 15.3 },
    { asset: 'BNB', allocation: 8, performance: 5.1 },
    { asset: 'Others', allocation: 7, performance: 4.3 },
  ];

  // Placeholder data for portfolio allocation chart
  const portfolioAllocationData = {
    labels: topAssets.map(a => a.asset),
    datasets: [
      {
        label: 'Allocation (%)',
        data: topAssets.map(a => a.allocation),
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
        tension: 0.3,
      },
      {
        label: 'ETH Price',
        data: [2700, 2750, 2780, 2760, 2850, 2900, 2880],
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        tension: 0.3,
      },
    ],
  };

  // Agent performance data
  const agentPerformanceData = {
    labels: agentStatus?.agents.map(a => a.name) || ['Agent 1', 'Agent 2', 'Agent 3', 'Agent 4'],
    datasets: [
      {
        label: 'Win Rate (%)',
        data: agentStatus?.agents.map(a => a.performance?.winRate || 0) || [65, 58, 72, 61],
        backgroundColor: 'rgba(75, 192, 192, 0.7)',
      },
    ],
  };

  // If loading, show loading spinner
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
<<<<<<< HEAD
    <div className="p-6 space-y-6">
      {loadingDashboard || (agents.length === 0 && loadingAgents) ? (
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-muted rounded"></div>
          <div className="h-10 bg-muted rounded"></div>
          <div className="h-10 bg-muted rounded"></div>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Trading Farm Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor your trading performance and manage your automated agents.
            </p>
          </div>
          <div className="mt-4 md:mt-0 space-x-2 flex items-center">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              aria-label="Toggle Theme"
            >
              {theme === "dark" ? (
                <Sun className="h-[1.2rem] w-[1.2rem]" />
              ) : (
                <Moon className="h-[1.2rem] w-[1.2rem]" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={refreshDashboard}
              disabled={loadingDashboard || loadingAgents}
              aria-label="Refresh Data"
            >
              <RefreshCw className="h-[1.2rem] w-[1.2rem]" />
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Portfolio Value"
          value={dashboardData?.portfolioValue || 125000}
          description="Total value across all assets"
          trend="up"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          title="24h PnL"
          value={dashboardData?.pnl24h || 3450}
          description="Profit and loss in the last 24 hours"
          trend="up"
          icon={<Activity className="h-4 w-4" />}
        />
        <StatCard
          title="Win Rate"
          value={dashboardData?.winRate || 68}
          description="Percentage of profitable trades"
          trend="neutral"
          icon={<Percent className="h-4 w-4" />}
        />
        <StatCard
          title="Risk Exposure"
          value={dashboardData?.riskExposure || 35}
          description="Current risk exposure percentage"
          trend={dashboardData?.riskExposureTrend || "neutral"}
          icon={<ShieldAlert className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Performance Overview</CardTitle>
            <CardDescription>
              Track your trading farm's performance over time
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <LineChart className="h-16 w-16 mx-auto mb-2" />
              <p>Performance chart will appear here</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Agents</CardTitle>
            <CardDescription>
              {loadingAgents
                ? "Loading agent data..."
                : `${agents.filter((a: any) => a.status === 'active').length} out of ${agents.length} agents are active`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAgents ? (
              <div className="animate-pulse space-y-2">
                <div className="h-12 bg-muted rounded"></div>
                <div className="h-12 bg-muted rounded"></div>
                <div className="h-12 bg-muted rounded"></div>
              </div>
            ) : agentsError ? (
              <div className="text-center p-4">
                <p className="text-red-500">Error loading agents</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => refetchAgents()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              </div>
            ) : agents.length > 0 ? (
              <div className="space-y-4">
                {agents.slice(0, 5).map((agent: any) => (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between p-2 border rounded-md"
                  >
                    <div className="flex items-center">
                      <div
                        className={`w-2 h-2 rounded-full mr-2 ${
                          agent.status === "active"
                            ? "bg-green-500"
                            : agent.status === "paused"
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                      ></div>
                      <div>
                        <p className="font-medium">{agent.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {agent.type}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        agent.status === "active"
                          ? "outline"
                          : agent.status === "paused"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {agent.status}
                    </Badge>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  asChild
                >
                  <Link href="/agents">
                    <Bot className="mr-2 h-4 w-4" />
                    View All Agents
                  </Link>
                </Button>
=======
    <ElizaOSCentricLayout
      farmId={farmId}
      topWidgets={
        <>
          {/* Portfolio Summary Widget */}
          <Widget title="Portfolio Summary" width="medium" height="small">
            {isLoadingPortfolio ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
>>>>>>> ee530173d166877056f383bf6b7f0704e2a4e0da
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex flex-col p-2">
                  <span className="text-xs text-muted-foreground">Total Value</span>
                  <span className="text-2xl font-bold">${data?.portfolioValue.toLocaleString() || "0"}</span>
                  <span className="text-xs text-green-500">+2.4% (24h)</span>
                </div>
                <div className="flex flex-col p-2">
                  <span className="text-xs text-muted-foreground">Daily P&L</span>
                  <span className="text-2xl font-bold text-green-500">+${data?.pnl24h.toLocaleString() || "0"}</span>
                  <span className="text-xs text-muted-foreground">2.6%</span>
                </div>
                <div className="flex flex-col p-2">
                  <span className="text-xs text-muted-foreground">Active Positions</span>
                  <span className="text-2xl font-bold">12</span>
                  <span className="text-xs text-muted-foreground">4 in profit</span>
                </div>
                <div className="flex flex-col p-2">
                  <span className="text-xs text-muted-foreground">Risk Score</span>
                  <span className="text-2xl font-bold">Medium</span>
                  <span className="text-xs text-amber-500">Caution</span>
                </div>
              </div>
            )}
          </Widget>

          {/* Market Overview Widget */}
          <Widget title="Market Overview" width="medium" height="small">
            {isLoadingMarket ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col p-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">BTC/USD</span>
                    <Badge variant="outline" className="text-green-500">+1.8%</Badge>
                  </div>
                  <span className="text-xl">$52,890</span>
                  <span className="text-xs text-muted-foreground">Vol: $23.4B</span>
                </div>
                <div className="flex flex-col p-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">ETH/USD</span>
                    <Badge variant="outline" className="text-green-500">+3.2%</Badge>
                  </div>
                  <span className="text-xl">$2,890</span>
                  <span className="text-xs text-muted-foreground">Vol: $12.1B</span>
                </div>
                <div className="flex flex-col p-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">SOL/USD</span>
                    <Badge variant="outline" className="text-green-500">+4.5%</Badge>
                  </div>
                  <span className="text-xl">$135.20</span>
                  <span className="text-xs text-muted-foreground">Vol: $5.6B</span>
                </div>
              </div>
            )}
          </Widget>
        </>
      }
      leftWidgets={
        <>
          {/* Portfolio Allocation Widget */}
          <Widget title="Portfolio Allocation" height="medium">
            <div className="h-full flex items-center justify-center">
              <PieChart 
                data={portfolioAllocationData}
                options={{
                  plugins: {
                    legend: {
                      position: 'right',
                      labels: {
                        boxWidth: 12,
                        padding: 10,
                      }
                    }
                  }
                }}
              />
            </div>
          </Widget>
          
          {/* Active Agents Widget */}
          <Widget title="Active Agents" height="medium">
            {isLoadingAgents ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                {agentStatus?.agents.slice(0, 4).map(agent => (
                  <div key={agent.id} className="flex justify-between items-center p-2 border rounded-md">
                    <div>
                      <div className="font-medium">{agent.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Last active: {new Date(agent.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <Badge className={
                      agent.status === 'active' ? "bg-green-500" : 
                      agent.status === 'idle' ? "bg-amber-500" : 
                      "bg-red-500"
                    }>
                      {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                    </Badge>
                  </div>
                )) || (
                  <div>No agents available</div>
                )}
                <Button variant="outline" className="w-full mt-2">
                  <Plus className="h-4 w-4 mr-2" /> Add Agent
                </Button>
              </div>
            )}
<<<<<<< HEAD
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="unified" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="unified">Unified Dashboard</TabsTrigger>
            <TabsTrigger value="risk">Risk Management</TabsTrigger>
            <TabsTrigger value="elizaos">ElizaOS</TabsTrigger>
          </TabsList>
          <Badge variant="outline" className="ml-auto h-7">
            {currentTime}
          </Badge>
        </div>
        
        <TabsContent value="unified" className="mt-6">
          <UnifiedDashboard farmId={farmId} hasElizaOS={true} />
        </TabsContent>
        
        <TabsContent value="risk" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {loadingRisk ? (
              <>
                <div className="animate-pulse bg-muted h-60 rounded-md"></div>
                <div className="animate-pulse bg-muted h-60 rounded-md"></div>
              </>
            ) : (
              <>
                <SimplifiedRiskCard 
                  title="Exposure by Asset" 
                  metrics={riskData?.assetExposure || []} 
                  isLoading={loadingRisk}
                  onRefresh={refetchRisk}
                />
                
                <SimplifiedRiskCard 
                  title="Exposure by Exchange" 
                  metrics={riskData?.exchangeExposure || []} 
                  isLoading={loadingRisk}
                  onRefresh={refetchRisk}
                />
              </>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="elizaos" className="space-y-6 mt-6">
          <div className="min-h-[400px]">
            <CommandConsole farmId={farmId} height="full" />
          </div>
        </TabsContent>
      </Tabs>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Real-time Market Updates</CardTitle>
          <CardDescription>
            Get live notifications about your trading activity
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <WidgetContainer 
            id="market-updates"
            title="Market Updates"
            className="h-64"
          >
            <div className="p-4">
              <OrderUpdatesStream />
=======
          </Widget>
        </>
      }
      rightWidgets={
        <>
          {/* Market Performance Widget */}
          <Widget title="Market Performance" height="medium">
            <div className="h-full flex items-center justify-center">
              <ChartComponent 
                data={marketPerformanceData}
                options={{
                  scales: {
                    y: {
                      beginAtZero: false,
                    },
                  },
                }}
              />
            </div>
          </Widget>
          
          {/* Agent Performance Widget */}
          <Widget title="Agent Performance" height="medium">
            <div className="h-full flex items-center justify-center">
              <BarChartComponent 
                data={agentPerformanceData}
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
>>>>>>> ee530173d166877056f383bf6b7f0704e2a4e0da
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