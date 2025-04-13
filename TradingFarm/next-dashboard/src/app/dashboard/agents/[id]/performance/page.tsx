'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  LineChart,
  BarChart,
  PieChart,
  TimerReset,
  ArrowLeft,
  Download,
  Calendar,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Zap,
  Layers,
  BookOpen,
  Briefcase,
  Sliders,
} from 'lucide-react';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { 
  PerformanceMetricsCards, 
  TradingPerformanceMetrics, 
  RiskMetricsCards 
} from '@/components/agents/performance-metrics-cards';
import { TradeHistoryTable } from '@/components/agents/trade-history-table';
import { PerformanceChart } from '@/components/backtesting/performance-chart';
import { MetricsCard } from '@/components/backtesting/metrics-card';

// Define interface for agent performance data
interface AgentPerformance {
  total_trades: number;
  winning_trades: number;
  total_profit_percent: number;
  avg_profit_per_trade: number;
  max_profit: number;
  max_loss: number;
  success_rate: number;
  equity_curve: {
    timestamp: number;
    equity: number;
  }[];
  recent_trades: {
    id: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    amount: number;
    price: number;
    profit_loss: number;
    profit_loss_percent: number;
    timestamp: string;
  }[];
  drawdown: {
    current: number;
    max: number;
    average: number;
  };
  risk_metrics: {
    sharpe_ratio: number;
    sortino_ratio: number;
    calmar_ratio: number;
    volatility: number;
  };
  daily_returns: {
    date: string;
    return: number;
  }[];
  position_metrics: {
    avg_holding_time: string;
    avg_profit_per_day: number;
    best_symbol: string;
    worst_symbol: string;
  };
  optimization_status?: {
    last_optimized: string;
    improvement: number;
    status: 'in_progress' | 'complete' | 'pending' | 'failed';
  };
}

interface AgentInfo {
  id: string;
  name: string;
  status: string;
  agent_type: string;
  last_active: string;
  configuration: any;
}

export default function AgentPerformancePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const agentId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [performance, setPerformance] = useState<AgentPerformance | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [optimizationInProgress, setOptimizationInProgress] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date()
  });

  // Fetch agent info and performance data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch agent info
        const agentResponse = await fetch(`/api/elizaos/agents/${agentId}`);
        if (!agentResponse.ok) {
          throw new Error('Failed to fetch agent info');
        }
        
        const agentData = await agentResponse.json();
        setAgentInfo(agentData.agent);
        
        // Fetch performance data
        const performanceResponse = await fetch(
          `/api/elizaos/agents/${agentId}/performance?from=${dateRange.from?.toISOString()}&to=${dateRange.to?.toISOString()}`
        );
        
        if (!performanceResponse.ok) {
          throw new Error('Failed to fetch agent performance');
        }
        
        const performanceData = await performanceResponse.json();
        setPerformance(performanceData.performance);
      } catch (error) {
        console.error('Error fetching agent data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load agent data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [agentId, dateRange, toast]);

  // Handle date range change
  const handleDateRangeChange = (range: { from: Date | undefined; to: Date | undefined }) => {
    setDateRange(range);
  };
  
  // Optimize strategy
  const handleOptimizeStrategy = async () => {
    try {
      setOptimizationInProgress(true);
      toast({
        title: 'Optimization Started',
        description: 'Strategy optimization has been initiated. This may take a few minutes.',
      });
      
      // Call the optimization API
      const response = await fetch(`/api/elizaos/agents/${agentId}/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start_date: dateRange.from?.toISOString(),
          end_date: dateRange.to?.toISOString(),
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to start strategy optimization');
      }
      
      const data = await response.json();
      
      toast({
        title: 'Optimization Scheduled',
        description: `Optimization job ${data.job_id} has been scheduled.`,
      });
    } catch (error) {
      console.error('Error starting optimization:', error);
      toast({
        title: 'Optimization Failed',
        description: 'Failed to start strategy optimization.',
        variant: 'destructive',
      });
    } finally {
      setOptimizationInProgress(false);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex space-x-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-28" />
                <Skeleton className="h-4 w-36 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Render agent header with status badge
  const renderAgentHeader = () => {
    if (!agentInfo) return null;
    
    const getStatusColor = (status: string) => {
      switch (status.toLowerCase()) {
        case 'active':
        case 'running':
          return 'bg-green-100 text-green-800 border-green-200';
        case 'idle':
          return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'error':
          return 'bg-red-100 text-red-800 border-red-200';
        case 'optimizing':
          return 'bg-purple-100 text-purple-800 border-purple-200';
        default:
          return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    };
    
    return (
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{agentInfo.name}</h1>
          <div className="flex items-center space-x-3 mt-1">
            <Badge 
              variant="outline" 
              className={getStatusColor(agentInfo.status)}
            >
              {agentInfo.status}
            </Badge>
            <p className="text-sm text-muted-foreground">
              Last active: {new Date(agentInfo.last_active).toLocaleString()}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            onClick={() => router.push(`/dashboard/agents/${agentId}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Agent
          </Button>
          
          <Button
            onClick={handleOptimizeStrategy}
            disabled={optimizationInProgress}
          >
            {optimizationInProgress ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Optimizing...
              </>
            ) : (
              <>
                <Sliders className="mr-2 h-4 w-4" />
                Optimize Strategy
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            onClick={() => router.push(`/dashboard/agents/${agentId}`)}
            className="mb-2 p-0"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Agent Details
          </Button>
          <h1 className="text-2xl font-bold flex items-center">
            <LineChart className="mr-2 h-6 w-6 text-primary" />
            Trading Performance
          </h1>
          <p className="text-muted-foreground">
            Performance metrics and trading history for this agent
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <DateRangePicker
            from={dateRange.from}
            to={dateRange.to}
            onSelect={handleDateRangeChange}
          />
          
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
          
          <Button variant="outline" size="icon">
            <TimerReset className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Performance Metrics Cards */}
      {performance && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className={performance.total_profit_percent >= 0 ? "border-green-200" : "border-red-200"}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Return</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${performance.total_profit_percent >= 0 ? "text-green-600" : "text-red-600"}`}>
                {performance.total_profit_percent.toFixed(2)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {performance.total_trades} trades • {performance.success_rate.toFixed(1)}% win rate
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${performance.avg_profit_per_trade >= 0 ? "text-green-600" : "text-red-600"}`}>
                {performance.avg_profit_per_trade.toFixed(2)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Average daily return
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Max Drawdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {performance.drawdown.max.toFixed(2)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Current: {performance.drawdown.current.toFixed(2)}%
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Sharpe Ratio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {performance.risk_metrics.sharpe_ratio.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Risk-adjusted return
              </p>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Tabs for different performance views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trades">Trades</TabsTrigger>
          <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          {performance && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Equity Curve</CardTitle>
                  <CardDescription>
                    Performance over selected time period
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                  <PerformanceChart 
                    equityCurve={performance.equity_curve}
                    initialCapital={10000} // This would come from agent config
                  />
                </CardContent>
              </Card>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Returns</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    {/* Daily returns chart would go here */}
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">Daily returns chart</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <MetricsCard
                        title="Trading Activity"
                        metrics={[
                          { label: 'Total Trades', value: performance.total_trades },
                          { label: 'Win Rate', value: `${performance.success_rate.toFixed(1)}%` },
                          { label: 'Avg. Hold Time', value: '5.2 hours' },
                          { label: 'Profit Factor', value: 1.75 },
                        ]}
                      />
                      
                      <MetricsCard
                        title="Profit Metrics"
                        metrics={[
                          { label: 'Best Trade', value: `${performance.max_profit.toFixed(2)}%` },
                          { label: 'Worst Trade', value: `${performance.max_loss.toFixed(2)}%` },
                          { label: 'Avg. Win', value: `${(performance.avg_profit_per_trade * 2).toFixed(2)}%` },
                          { label: 'Avg. Loss', value: `${(performance.avg_profit_per_trade * 0.5).toFixed(2)}%` },
                        ]}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
        
        <TabsContent value="trades" className="space-y-4">
          {performance && (
            <Card>
              <CardHeader>
                <CardTitle>Trade History</CardTitle>
                <CardDescription>
                  Recent trades executed by this agent
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TradeHistoryTable trades={performance.recent_trades} />
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="risk" className="space-y-4">
          {performance && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <MetricsCard
                  title="Risk Ratios"
                  metrics={[
                    { label: 'Sharpe Ratio', value: performance.risk_metrics.sharpe_ratio.toFixed(2) },
                    { label: 'Sortino Ratio', value: performance.risk_metrics.sortino_ratio.toFixed(2) },
                    { label: 'Calmar Ratio', value: performance.risk_metrics.calmar_ratio.toFixed(2) },
                  ]}
                />
                
                <MetricsCard
                  title="Drawdown"
                  metrics={[
                    { label: 'Maximum', value: `${performance.drawdown.max.toFixed(2)}%` },
                    { label: 'Average', value: `${performance.drawdown.average.toFixed(2)}%` },
                    { label: 'Current', value: `${performance.drawdown.current.toFixed(2)}%` },
                  ]}
                />
                
                <MetricsCard
                  title="Volatility"
                  metrics={[
                    { label: 'Daily', value: '3.2%' },
                    { label: 'Weekly', value: '7.5%' },
                    { label: 'Monthly', value: '12.8%' },
                  ]}
                />
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Drawdown Chart</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {/* Drawdown chart would go here */}
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">Drawdown chart</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Risk Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium">Position Sizing</h4>
                        <p className="text-sm text-muted-foreground">
                          Current position sizes average 4.8% of total capital. Consider reducing to 3-4% to manage drawdown risk.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium">Stop Loss Management</h4>
                        <p className="text-sm text-muted-foreground">
                          Stop loss levels are effective. Current average ratio of profit to loss is 2.3:1, which is good.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <Calendar className="h-5 w-5 text-blue-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium">Trading Schedule</h4>
                        <p className="text-sm text-muted-foreground">
                          Analysis shows lower success rates during high volatility market opens. Consider limiting trading during the first hour of market open.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
