"use client";

import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSocket } from "@/providers/socket-provider";
import OrderUpdatesStream from "@/components/websocket/order-updates-stream";
import CommandConsole from "@/components/elizaos/command-console";
import RiskMetricsCard from "@/components/risk-management/risk-metrics-card";
import UnifiedDashboard from "@/components/dashboard/unified-dashboard";
import { WidgetContainer } from "@/components/dashboard/widget-container";
import PriceAlertSystem from "@/components/websocket/price-alert-system";
import ExecutionNotifications from "@/components/websocket/execution-notifications";
import { createBrowserClient } from "@/utils/supabase/client";
import { useTheme } from "next-themes";
import { useToast } from "@/components/ui/use-toast";
import { ExtendedAgent, agentService } from "@/services/agent-service";
import Link from "next/link";
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
  Bot,
  Plus,
} from "lucide-react";

// Define mock dashboard data interface
interface DashboardData {
  portfolioValue: number;
  pnl24h: number;
  winRate: number;
  avgTradeDuration: string;
  topPair: string;
  riskExposure: number;
  riskExposureTrend: 'up' | 'down' | 'neutral';
}

export default function DashboardPage() {
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [farmId, setFarmId] = React.useState<string>("1"); // Default to first farm
  const [activeTab, setActiveTab] = React.useState<string>("unified");
  const [agents, setAgents] = React.useState<ExtendedAgent[]>([]);
  const [loadingAgents, setLoadingAgents] = React.useState(true);
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
        startDate: "2025-01-05T00:00:00Z",
        endDate: "2025-01-12T00:00:00Z",
        durationDays: 7,
        drawdownPercentage: 8.2,
        recovered: true
      }
    ]
  };

  // Fetch dashboard data
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // In production, replace with actual API call
        // const response = await dashboardApi.getDashboard(farmId);
        // const dashboardData = response.data;
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
        setError(null);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Failed to load dashboard data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [farmId]);

  // Fetch agent data
  React.useEffect(() => {
    const fetchAgents = async () => {
      try {
        setLoadingAgents(true);
        const response = await agentService.getAgents(parseInt(farmId));
        if (response.error) {
          console.error("Error fetching agents:", response.error);
          toast({
            title: "Error",
            description: "Failed to load agent data. Please try again later.",
            variant: "destructive",
          });
        } else if (response.data) {
          setAgents(response.data);
        }
      } catch (err) {
        console.error("Error fetching agents:", err);
      } finally {
        setLoadingAgents(false);
      }
    };

    fetchAgents();
  }, [farmId, toast]);

  // Handle theme toggle
  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  // Refresh dashboard data
  const refreshData = async () => {
    try {
      setLoading(true);
      // In production, replace with actual API call
      // const response = await dashboardApi.getDashboard(farmId);
      // const dashboardData = response.data;
      const mockDashboardData: DashboardData = {
        portfolioValue: 126500,
        pnl24h: 3780,
        winRate: 70,
        avgTradeDuration: "4h 45m",
        topPair: "BTC/USD",
        riskExposure: 32,
        riskExposureTrend: "down"
      };
      setData(mockDashboardData);
      setError(null);
      toast({
        title: "Dashboard refreshed",
        description: "Latest data has been loaded.",
      });
    } catch (err) {
      console.error("Error refreshing dashboard data:", err);
      toast({
        title: "Refresh failed",
        description: "Could not refresh dashboard data. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 pb-16 space-y-6">
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
            size="sm"
            onClick={toggleTheme}
          >
            {theme === "light" ? <Moon className="h-4 w-4 mr-2" /> : <Sun className="h-4 w-4 mr-2" />}
            {theme === "light" ? "Dark Mode" : "Light Mode"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md">
          <p>{error}</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Portfolio Value"
          value={data?.portfolioValue || 125000}
          description="Total value across all assets"
          trend="up"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          title="24h PnL"
          value={data?.pnl24h || 3450}
          description="+2.8% from yesterday"
          trend="up"
          icon={<Activity className="h-4 w-4" />}
        />
        <StatCard
          title="Active Agents"
          value={agents.filter((a: ExtendedAgent) => a.status === 'active').length}
          description="Trading agents currently active"
          trend="neutral"
          icon={<Bot className="h-4 w-4" />}
        />
        <StatCard
          title="Risk Exposure"
          value={data?.riskExposure || 35}
          description="Percentage of portfolio at risk"
          trend={data?.riskExposureTrend || "neutral"}
          icon={<ShieldAlert className="h-4 w-4" />}
        />
      </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="unified">
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Unified
          </TabsTrigger>
          <TabsTrigger value="performance">
            <BarChart2 className="h-4 w-4 mr-2" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="agents">
            <Bot className="h-4 w-4 mr-2" />
            Agents
          </TabsTrigger>
          <TabsTrigger value="risk">
            <ShieldAlert className="h-4 w-4 mr-2" />
            Risk
          </TabsTrigger>
          <TabsTrigger value="console">
            <Zap className="h-4 w-4 mr-2" />
            Console
          </TabsTrigger>
        </TabsList>

        <TabsContent value="unified" className="space-y-4">
          <UnifiedDashboard farmId={farmId} />
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              title="Win Rate"
              value={`${data?.winRate || 68}%`}
              trend="up"
              icon={<Percent className="h-4 w-4" />}
            />
            <MetricCard
              title="Avg Trade Duration"
              value={data?.avgTradeDuration || "4h 32m"}
              trend="neutral"
              icon={<BarChart2 className="h-4 w-4" />}
            />
            <MetricCard
              title="Top Pair"
              value={data?.topPair || "BTC/USD"}
              trend="up"
              icon={<LineChart className="h-4 w-4" />}
            />
          </div>

          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Performance Overview</CardTitle>
                <CardDescription>
                  Trading performance across all strategies
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Performance chart will appear here
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Asset Allocation</CardTitle>
                <CardDescription>Current portfolio distribution</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Asset allocation chart will appear here
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Trading Agents</CardTitle>
                <CardDescription>
                  Manage your automated trading agents
                </CardDescription>
              </div>
              <Link href="/dashboard/agents/create">
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Agent
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {loadingAgents ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-10 bg-muted rounded"></div>
                  <div className="h-10 bg-muted rounded"></div>
                  <div className="h-10 bg-muted rounded"></div>
                </div>
              ) : agents.length === 0 ? (
                <div className="text-center py-10">
                  <Bot className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-20" />
                  <h3 className="text-lg font-medium mb-2">No agents yet</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto mb-4">
                    You haven't created any trading agents yet. Agents can help you automate your trading strategies.
                  </p>
                  <Link href="/dashboard/agents/create">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Agent
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {agents.map((agent: ExtendedAgent) => (
                    <div key={agent.id} className="border rounded-md p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 p-2 rounded-full">
                            <Bot className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-medium">{agent.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {agent.type || agent.strategy_type || "Trading Agent"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={
                            agent.status === 'active' ? 'bg-green-500' :
                            agent.status === 'paused' ? 'bg-yellow-500' :
                            agent.status === 'inactive' ? 'bg-gray-500' :
                            'bg-blue-500'
                          }>
                            {agent.status || 'Unknown'}
                          </Badge>
                          <Link href={`/dashboard/agents/${agent.id}`}>
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-center pt-2">
                    <Link href="/dashboard/agents">
                      <Button variant="outline">
                        View All Agents
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Agent Performance</CardTitle>
                <CardDescription>
                  Performance metrics for all active agents
                </CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Agent performance chart will appear here
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Agent Activity</CardTitle>
                <CardDescription>
                  Latest actions from your trading agents
                </CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                {loadingAgents ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-8 bg-muted rounded"></div>
                    <div className="h-8 bg-muted rounded"></div>
                    <div className="h-8 bg-muted rounded"></div>
                  </div>
                ) : agents.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No agent activity yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="border-b pb-2 text-sm">
                      <div className="flex justify-between">
                        <span>{agents[0]?.name} - Status changed to {agents[0]?.status}</span>
                        <span className="text-muted-foreground">5m ago</span>
                      </div>
                    </div>
                    <div className="border-b pb-2 text-sm">
                      <div className="flex justify-between">
                        <span>Trading strategy updated</span>
                        <span className="text-muted-foreground">1h ago</span>
                      </div>
                    </div>
                    <div className="border-b pb-2 text-sm">
                      <div className="flex justify-between">
                        <span>New agent created</span>
                        <span className="text-muted-foreground">3h ago</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <RiskMetricsCard metrics={riskMetricsData} />
        </TabsContent>

        <TabsContent value="console" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ElizaOS Command Console</CardTitle>
              <CardDescription>
                Interact with your trading farm using natural language
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[500px]">
              <CommandConsole />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid gap-4 grid-cols-1">
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
                <div className="bg-muted p-4 rounded-md">
                  <PriceAlertSystem farmId={farmId} />
                  <ExecutionNotifications farmId={farmId} />
                </div>
              </div>
            </WidgetContainer>
          </CardContent>
        </Card>
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
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-center space-x-2">
            {icon && (
              <div className="bg-primary/10 p-2 rounded-full">{icon}</div>
            )}
            <div>
              <p className="text-sm font-medium">{title}</p>
              <h3 className="text-2xl font-bold">
                {title.includes("Value") || title.includes("PnL")
                  ? `$${value.toLocaleString()}`
                  : value.toLocaleString()}
              </h3>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
          <div>
            {trend === "up" && (
              <div className="flex items-center text-green-500">
                <TrendingUp className="h-4 w-4 mr-1" />
              </div>
            )}
            {trend === "down" && (
              <div className="flex items-center text-red-500">
                <TrendingDown className="h-4 w-4 mr-1" />
              </div>
            )}
          </div>
        </div>
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
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center space-x-2">
          {icon && <div className="bg-primary/10 p-2 rounded-full">{icon}</div>}
          <div>
            <p className="text-sm font-medium">{title}</p>
            <div className="flex items-center">
              <h3 className="text-2xl font-bold mr-2">{value}</h3>
              {trend === "up" && (
                <TrendingUp className="h-4 w-4 text-green-500" />
              )}
              {trend === "down" && (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}