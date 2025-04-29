import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { useTheme } from 'next-themes';
import { useToast } from '@/components/ui/use-toast';
import { 
  Activity, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  BarChart4, 
  Clock, 
  CircleDollarSign, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowUp,
  ArrowDown,
  Wallet
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface TradingDashboardProps {
  agentId?: string;
}

interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
}

interface OrderUpdate {
  symbol: string;
  side: 'buy' | 'sell';
  type: string;
  status: string;
  amount: number;
  price: number;
  timestamp: string;
}

interface AgentStatus {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'error';
  lastAction: string;
  uptime: string;
  performance24h: number;
}

interface BalanceUpdate {
  currency: string;
  total: number;
  available: number;
  inOrder: number;
  valueUSD: number;
}

export function TradingDashboard({ agentId }: TradingDashboardProps) {
  const { toast } = useToast();
  const { theme } = useTheme();
  const supabase = createClientComponentClient();
  
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [recentOrders, setRecentOrders] = useState<OrderUpdate[]>([]);
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>([]);
  const [balances, setBalances] = useState<BalanceUpdate[]>([]);
  const [chartData, setChartData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC/USDT');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Initialize and fetch data on component mount
  useEffect(() => {
    initializeData();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      refreshData(false);
    }, 30000);
    
    return () => clearInterval(interval);
  }, [agentId]);

  // Update chart data when selected symbol changes
  useEffect(() => {
    if (selectedSymbol && marketData.length > 0) {
      generateChartData(selectedSymbol);
    }
  }, [selectedSymbol, marketData, theme]);

  const initializeData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchMarketData(),
        fetchRecentOrders(),
        fetchAgentStatuses(),
        fetchBalances()
      ]);
      
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error("Error initializing dashboard data:", error);
      toast({
        title: "Data Load Error",
        description: "Could not load some dashboard components. Using demo data.",
        variant: "destructive",
      });
      
      // Use mock data if API calls fail
      setMarketData(getMockMarketData());
      setRecentOrders(getMockOrderUpdates());
      setAgentStatuses(getMockAgentStatuses());
      setBalances(getMockBalances());
      
      setLastUpdated(new Date().toLocaleTimeString() + " (Demo Data)");
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async (showToast = true) => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchMarketData(),
        fetchRecentOrders(),
        fetchAgentStatuses(),
        fetchBalances()
      ]);
      
      setLastUpdated(new Date().toLocaleTimeString());
      
      if (showToast) {
        toast({
          title: "Dashboard Refreshed",
          description: "Latest trading data loaded",
        });
      }
    } catch (error) {
      console.error("Error refreshing dashboard data:", error);
      if (showToast) {
        toast({
          title: "Refresh Failed",
          description: "Could not refresh some components",
          variant: "destructive",
        });
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchMarketData = async () => {
    try {
      // In a production app, this would be an API call
      // For demonstration, use mock data
      setMarketData(getMockMarketData());
    } catch (error) {
      console.error("Error fetching market data:", error);
      throw error;
    }
  };

  const fetchRecentOrders = async () => {
    try {
      // In a production app, this would be an API call
      // For demonstration, use mock data
      setRecentOrders(getMockOrderUpdates());
    } catch (error) {
      console.error("Error fetching recent orders:", error);
      throw error;
    }
  };

  const fetchAgentStatuses = async () => {
    try {
      // In a production app, this would be an API call
      // For demonstration, use mock data
      setAgentStatuses(getMockAgentStatuses());
    } catch (error) {
      console.error("Error fetching agent statuses:", error);
      throw error;
    }
  };

  const fetchBalances = async () => {
    try {
      // In a production app, this would be an API call
      // For demonstration, use mock data
      setBalances(getMockBalances());
    } catch (error) {
      console.error("Error fetching balances:", error);
      throw error;
    }
  };

  const generateChartData = (symbol: string) => {
    // In a real app, we would fetch historical price data for the selected symbol
    // For now, generate random price movement data
    const labels = generateTimeLabels(24); // Last 24 hours
    const data = generatePriceData(24, symbol === 'BTC/USDT' ? 30000 : 2000);
    
    // Create chart configuration
    const chartData = {
      labels,
      datasets: [
        {
          label: symbol,
          data,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          fill: true,
          tension: 0.4,
        },
      ],
    };
    
    setChartData(chartData);
  };

  // Helper function to generate time labels for the chart
  const generateTimeLabels = (count: number) => {
    const now = new Date();
    const labels = [];
    
    for (let i = count - 1; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 3600000); // Hourly data
      labels.push(time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
    
    return labels;
  };

  // Helper function to generate random price data
  const generatePriceData = (count: number, basePrice: number) => {
    const volatility = basePrice * 0.02; // 2% volatility
    let lastPrice = basePrice;
    const data = [];
    
    for (let i = 0; i < count; i++) {
      const change = (Math.random() - 0.5) * volatility;
      lastPrice = lastPrice + change;
      data.push(lastPrice.toFixed(2));
    }
    
    return data;
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        grid: {
          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          callback: function(value: any) {
            return '$' + value;
          },
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  };

  // Format currency for display
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Format large numbers with K, M, B suffix
  const formatLargeNumber = (value: number) => {
    if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
    if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
    if (value >= 1e3) return (value / 1e3).toFixed(1) + 'K';
    return value.toFixed(2);
  };

  // Format percentage for display
  const formatPercentage = (value: number) => {
    return (value > 0 ? '+' : '') + value.toFixed(2) + '%';
  };

  // Get status icon based on agent status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="text-green-500 h-4 w-4" />;
      case 'paused':
        return <Clock className="text-amber-500 h-4 w-4" />;
      case 'error':
        return <XCircle className="text-red-500 h-4 w-4" />;
      default:
        return <Activity className="text-blue-500 h-4 w-4" />;
    }
  };

  // Get color class based on price change
  const getPriceChangeColorClass = (change: number) => {
    return change > 0 ? 'text-green-500' : change < 0 ? 'text-red-500' : 'text-muted-foreground';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold">Live Trading Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Last updated: {lastUpdated} {isRefreshing && <span className="animate-pulse">• Refreshing...</span>}
          </p>
        </div>
        <Button
          onClick={() => refreshData(true)}
          variant="outline"
          disabled={isRefreshing || isLoading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Dashboard
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-80">
          <div className="flex flex-col items-center">
            <Activity className="h-10 w-10 animate-pulse text-primary" />
            <p className="mt-4 text-muted-foreground">Loading dashboard data...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Main Chart Section - 8 columns */}
          <Card className="lg:col-span-8">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle>Market Overview</CardTitle>
                <div className="flex space-x-2">
                  <select
                    className="text-sm bg-background border rounded-md px-2 py-1"
                    value={selectedSymbol}
                    onChange={(e) => setSelectedSymbol(e.target.value)}
                  >
                    {marketData.map((item) => (
                      <option key={item.symbol} value={item.symbol}>
                        {item.symbol}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <CardDescription>
                {selectedSymbol} Price Chart
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {chartData ? (
                  <Line data={chartData} options={chartOptions} />
                ) : (
                  <div className="flex justify-center items-center h-full">
                    <p className="text-muted-foreground">No chart data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Market Data Cards - 4 columns */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Market Data</CardTitle>
                <CardDescription>Top trading pairs</CardDescription>
              </CardHeader>
              <CardContent className="px-2">
                <div className="space-y-2">
                  {marketData.slice(0, 5).map((item) => (
                    <div 
                      key={item.symbol} 
                      className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelectedSymbol(item.symbol)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="font-semibold">{item.symbol.split('/')[0]}</div>
                        <div className="text-sm text-muted-foreground">{item.symbol.split('/')[1]}</div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="font-mono font-semibold">
                          {formatCurrency(item.price)}
                        </div>
                        <div className={`text-xs flex items-center gap-1 ${getPriceChangeColorClass(item.change24h)}`}>
                          {item.change24h > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                          {formatPercentage(item.change24h)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Balance Summary</CardTitle>
                <CardDescription>Top assets by value</CardDescription>
              </CardHeader>
              <CardContent className="px-2">
                <div className="space-y-2">
                  {balances.slice(0, 4).map((item) => (
                    <div key={item.currency} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-primary" />
                        <div className="font-semibold">{item.currency}</div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="font-mono font-semibold">
                          {item.total.toFixed(6)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(item.valueUSD)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Agent Status Section - 6 columns */}
          <Card className="lg:col-span-6">
            <CardHeader className="pb-2">
              <CardTitle>Trading Agents</CardTitle>
              <CardDescription>Status and performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {agentStatuses.map((agent) => (
                  <div key={agent.id} className="flex items-center gap-4 p-3 border rounded-lg">
                    <div className="flex-shrink-0">
                      {getStatusIcon(agent.status)}
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex justify-between items-start">
                        <div className="font-medium truncate">{agent.name}</div>
                        <Badge 
                          variant={agent.status === 'active' ? 'default' : 
                                 agent.status === 'paused' ? 'outline' : 'destructive'}
                          className="ml-2"
                        >
                          {agent.status.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {agent.lastAction} • Uptime: {agent.uptime}
                      </div>
                    </div>
                    <div className={`text-right font-medium ${agent.performance24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatPercentage(agent.performance24h)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Orders Section - 6 columns */}
          <Card className="lg:col-span-6">
            <CardHeader className="pb-2">
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Latest 5 orders across exchanges</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="text-left font-medium p-2">Symbol</th>
                      <th className="text-left font-medium p-2">Side</th>
                      <th className="text-right font-medium p-2">Price</th>
                      <th className="text-right font-medium p-2">Amount</th>
                      <th className="text-right font-medium p-2">Status</th>
                      <th className="text-right font-medium p-2">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order, index) => (
                      <tr key={index} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="p-2 text-left">{order.symbol}</td>
                        <td className="p-2 text-left">
                          {order.side === 'buy' ? (
                            <Badge variant="outline" className="bg-green-500/10 text-green-500 font-normal">
                              BUY
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-500/10 text-red-500 font-normal">
                              SELL
                            </Badge>
                          )}
                        </td>
                        <td className="p-2 text-right font-mono">
                          {formatCurrency(order.price)}
                        </td>
                        <td className="p-2 text-right font-mono">
                          {order.amount.toFixed(6)}
                        </td>
                        <td className="p-2 text-right">
                          <Badge 
                            variant={order.status === 'filled' ? 'default' : 
                                   order.status === 'open' ? 'outline' : 'secondary'}
                          >
                            {order.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="p-2 text-right text-sm text-muted-foreground">
                          {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Mock data generators for development/testing
function getMockMarketData(): MarketData[] {
  return [
    {
      symbol: 'BTC/USDT',
      price: 32450.75,
      change24h: 2.35,
      volume24h: 1230000000,
      high24h: 32850.12,
      low24h: 31789.45
    },
    {
      symbol: 'ETH/USDT',
      price: 1845.32,
      change24h: -0.78,
      volume24h: 580000000,
      high24h: 1880.25,
      low24h: 1835.19
    },
    {
      symbol: 'SOL/USDT',
      price: 82.45,
      change24h: 5.23,
      volume24h: 320000000,
      high24h: 83.75,
      low24h: 78.92
    },
    {
      symbol: 'ADA/USDT',
      price: 0.48,
      change24h: 1.21,
      volume24h: 98000000,
      high24h: 0.49,
      low24h: 0.47
    },
    {
      symbol: 'DOT/USDT',
      price: 7.82,
      change24h: -2.15,
      volume24h: 42000000,
      high24h: 8.05,
      low24h: 7.75
    }
  ];
}

function getMockOrderUpdates(): OrderUpdate[] {
  return [
    {
      symbol: 'BTC/USDT',
      side: 'buy',
      type: 'limit',
      status: 'filled',
      amount: 0.12,
      price: 32415.75,
      timestamp: new Date(Date.now() - 5 * 60000).toISOString() // 5 minutes ago
    },
    {
      symbol: 'ETH/USDT',
      side: 'sell',
      type: 'market',
      status: 'filled',
      amount: 1.5,
      price: 1848.32,
      timestamp: new Date(Date.now() - 25 * 60000).toISOString() // 25 minutes ago
    },
    {
      symbol: 'BTC/USDT',
      side: 'buy',
      type: 'limit',
      status: 'open',
      amount: 0.05,
      price: 32100.00,
      timestamp: new Date(Date.now() - 40 * 60000).toISOString() // 40 minutes ago
    },
    {
      symbol: 'SOL/USDT',
      side: 'buy',
      type: 'market',
      status: 'filled',
      amount: 15,
      price: 82.15,
      timestamp: new Date(Date.now() - 120 * 60000).toISOString() // 2 hours ago
    },
    {
      symbol: 'ADA/USDT',
      side: 'sell',
      type: 'limit',
      status: 'cancelled',
      amount: 1000,
      price: 0.49,
      timestamp: new Date(Date.now() - 180 * 60000).toISOString() // 3 hours ago
    }
  ];
}

function getMockAgentStatuses(): AgentStatus[] {
  return [
    {
      id: '1',
      name: 'BTC/ETH Momentum Trader',
      status: 'active',
      lastAction: 'Bought 0.12 BTC @ $32,415.75',
      uptime: '5d 12h 34m',
      performance24h: 2.15
    },
    {
      id: '2',
      name: 'Altcoin Swing Trader',
      status: 'active',
      lastAction: 'Sold 15 SOL @ $82.15',
      uptime: '2d 8h 17m',
      performance24h: 3.78
    },
    {
      id: '3',
      name: 'DCA Bot',
      status: 'paused',
      lastAction: 'Paused by user',
      uptime: '14d 5h 22m',
      performance24h: 0.45
    },
    {
      id: '4',
      name: 'Volatility Arbitrage',
      status: 'error',
      lastAction: 'API connection failed',
      uptime: '0d 2h 7m',
      performance24h: -1.23
    }
  ];
}

function getMockBalances(): BalanceUpdate[] {
  return [
    {
      currency: 'USDT',
      total: 25432.45,
      available: 20145.78,
      inOrder: 5286.67,
      valueUSD: 25432.45
    },
    {
      currency: 'BTC',
      total: 0.72,
      available: 0.65,
      inOrder: 0.07,
      valueUSD: 23364.54
    },
    {
      currency: 'ETH',
      total: 5.45,
      available: 5.45,
      inOrder: 0,
      valueUSD: 10056.99
    },
    {
      currency: 'SOL',
      total: 62.75,
      available: 47.75,
      inOrder: 15,
      valueUSD: 5173.74
    }
  ];
}
