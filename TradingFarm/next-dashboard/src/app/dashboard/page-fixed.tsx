'use client';

import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  ShieldAlert
} from "lucide-react";
import { useSocket } from "@/providers/socket-provider";
import { useTheme } from "next-themes";
import { createBrowserClient } from "@/utils/supabase/client";
import Link from "next/link";
import { ExtendedAgent, agentService } from "@/services/agent-service";
import UnifiedDashboard from "@/components/dashboard/unified-dashboard";
import RiskMetricsCard from "@/components/risk-management/risk-metrics-card";
import CommandConsole from "@/components/elizaos/command-console";
import OrderUpdatesStream from "@/components/websocket/order-updates-stream";
import ExecutionNotifications from "@/components/websocket/execution-notifications";
import PriceAlertSystem from "@/components/websocket/price-alert-system";
import { WidgetContainer } from "@/components/dashboard/widget-container";

// Dashboard data interface
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
  // State
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [farmId, setFarmId] = React.useState<string>("farm-1");
  const [activeTab, setActiveTab] = React.useState<string>("unified");
  const [agents, setAgents] = React.useState<ExtendedAgent[]>([]);
  const [loadingAgents, setLoadingAgents] = React.useState(true);
  const [currentTime, setCurrentTime] = React.useState<string>("");

  // Hooks
  const { isConnected } = useSocket();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const supabase = createBrowserClient();

  // Initialize dashboard
  React.useEffect(() => {
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
      } catch (err) {
        console.error("Error loading dashboard:", err);
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }
    
    initDashboard();
    
    // Update current time
    const now = new Date();
    setCurrentTime(now.toLocaleTimeString());
    
    // Set up timer to update time every minute
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 60000);
    
    return () => clearInterval(timeInterval);
  }, [farmId, toast]);

  // Toggle theme function
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // Refresh dashboard data
  const refreshDashboard = async () => {
    setLoading(true);
    
    try {
      // Update with slightly randomized data for demo purposes
      const updatedData: DashboardData = {
        portfolioValue: 125000 + Math.floor(Math.random() * 5000) - 2500,
        pnl24h: 3450 + Math.floor(Math.random() * 500) - 250,
        winRate: 68 + Math.floor(Math.random() * 5) - 2,
        avgTradeDuration: `4h ${Math.floor(Math.random() * 60)}m`,
        topPair: Math.random() > 0.3 ? "BTC/USD" : "ETH/USD",
        riskExposure: 35 + Math.floor(Math.random() * 10) - 5,
        riskExposureTrend: Math.random() > 0.6 ? "neutral" : (Math.random() > 0.5 ? "up" : "down")
      };
      
      setData(updatedData);
      toast({
        title: "Dashboard Updated",
        description: "Latest data has been loaded",
      });
    } catch (err) {
      console.error("Error refreshing dashboard:", err);
      toast({
        title: "Update Failed",
        description: "Could not refresh dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Show error screen if needed
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] p-6">
        <div className="text-destructive text-xl mb-4">{error}</div>
        <Button onClick={refreshDashboard}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  // Main dashboard render
  return (
    <div className="p-6 space-y-6">
      {loading ? (
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
              disabled={loading}
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
          value={data?.portfolioValue || 125000}
          description="Total value across all assets"
          trend="up"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          title="24h PnL"
          value={data?.pnl24h || 3450}
          description="Profit and loss in the last 24 hours"
          trend="up"
          icon={<Activity className="h-4 w-4" />}
        />
        <StatCard
          title="Win Rate"
          value={data?.winRate || 68}
          description="Percentage of profitable trades"
          trend="neutral"
          icon={<Percent className="h-4 w-4" />}
        />
        <StatCard
          title="Risk Exposure"
          value={data?.riskExposure || 35}
          description="Current risk exposure percentage"
          trend={data?.riskExposureTrend || "neutral"}
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
                : `${agents.filter(a => a.status === 'active').length} out of ${agents.length} agents are active`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAgents ? (
              <div className="animate-pulse space-y-2">
                <div className="h-12 bg-muted rounded"></div>
                <div className="h-12 bg-muted rounded"></div>
                <div className="h-12 bg-muted rounded"></div>
              </div>
            ) : agents.length > 0 ? (
              <div className="space-y-4">
                {agents.slice(0, 5).map(agent => (
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
              </div>
            ) : (
              <div className="text-center p-4">
                <Bot className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">No agents found</p>
                <Button variant="outline" size="sm" className="mt-2" asChild>
                  <Link href="/agents/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Agent
                  </Link>
                </Button>
              </div>
            )}
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
            <RiskMetricsCard title="Exposure by Asset" metrics={[
              { name: 'BTC/USD', value: '40%', status: 'warning' },
              { name: 'ETH/USD', value: '24%', status: 'normal' },
              { name: 'SOL/USD', value: '20%', status: 'normal' },
              { name: 'AVAX/USD', value: '16%', status: 'normal' }
            ]} />
            
            <RiskMetricsCard title="Exposure by Exchange" metrics={[
              { name: 'Binance', value: '42%', status: 'warning' },
              { name: 'FTX', value: '0%', status: 'danger' },
              { name: 'Kraken', value: '35%', status: 'normal' },
              { name: 'Coinbase', value: '23%', status: 'normal' }
            ]} />
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
  );
}

// Helper components
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
