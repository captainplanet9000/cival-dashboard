import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { BarChart, LineChart, RefreshCw, Percent, ArrowUp, ArrowDown, Calendar } from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface PerformanceData {
  equity_curve: {
    timestamp: string;
    value: number;
  }[];
  trades: {
    date: string;
    profit_loss: number;
  }[];
  metrics: {
    total_return: number;
    win_rate: number;
    sharpe_ratio: number;
    max_drawdown: number;
    profit_factor: number;
    average_win: number;
    average_loss: number;
  };
  monthly_returns: {
    month: string;
    return_pct: number;
  }[];
}

interface PerformanceMetricsProps {
  agentId?: string;
  timeframe?: 'week' | 'month' | 'year' | 'all';
}

export function PerformanceMetrics({ agentId, timeframe = 'month' }: PerformanceMetricsProps) {
  const { toast } = useToast();
  const supabase = createClientComponentClient();
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'year' | 'all'>(timeframe);

  // Fetch performance data
  useEffect(() => {
    fetchPerformanceData();
  }, [agentId, selectedTimeframe]);

  const fetchPerformanceData = async () => {
    setIsLoading(true);
    try {
      // In a production app, this would be an API call to fetch the data
      // For now, we'll mock some data
      const { data: session } = await supabase.auth.getSession();
      
      if (!session?.user) {
        throw new Error("User not authenticated");
      }

      // Call API to get performance data
      const response = await fetch(`/api/analytics/performance?timeframe=${selectedTimeframe}${agentId ? `&agentId=${agentId}` : ''}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch performance data");
      }

      const data = await response.json();
      setPerformanceData(data);
    } catch (error) {
      console.error("Error fetching performance data:", error);
      // If API is not implemented yet, use mock data
      setPerformanceData(getMockPerformanceData(selectedTimeframe));
      
      toast({
        title: "Using sample data",
        description: "Connected to sample performance data for demonstration",
        variant: "default",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchPerformanceData();
  };

  // Formatting for the equity curve chart
  const equityChartData = {
    labels: performanceData?.equity_curve.map(point => new Date(point.timestamp)) || [],
    datasets: [
      {
        label: 'Portfolio Value',
        data: performanceData?.equity_curve.map(point => point.value) || [],
        fill: false,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.1,
      },
    ],
  };

  const equityChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Equity Curve',
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: selectedTimeframe === 'week' ? 'day' : 
                selectedTimeframe === 'month' ? 'day' : 
                selectedTimeframe === 'year' ? 'month' : 'month',
        },
        title: {
          display: true,
          text: 'Date',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Value ($)',
        },
      },
    },
  };

  // Formatting for the trade profit/loss chart
  const tradeChartData = {
    labels: performanceData?.trades.map(trade => trade.date) || [],
    datasets: [
      {
        label: 'Profit/Loss per Trade',
        data: performanceData?.trades.map(trade => trade.profit_loss) || [],
        backgroundColor: performanceData?.trades.map(trade => 
          trade.profit_loss >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)'
        ) || [],
        borderColor: performanceData?.trades.map(trade => 
          trade.profit_loss >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'
        ) || [],
        borderWidth: 1,
      },
    ],
  };

  const tradeChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Trade P&L',
      },
    },
    scales: {
      y: {
        title: {
          display: true,
          text: 'P&L ($)',
        },
      },
    },
  };

  // Monthly returns chart
  const monthlyReturnsData = {
    labels: performanceData?.monthly_returns.map(item => item.month) || [],
    datasets: [
      {
        label: 'Monthly Returns (%)',
        data: performanceData?.monthly_returns.map(item => item.return_pct) || [],
        backgroundColor: performanceData?.monthly_returns.map(item => 
          item.return_pct >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)'
        ) || [],
        borderColor: performanceData?.monthly_returns.map(item => 
          item.return_pct >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'
        ) || [],
        borderWidth: 1,
      },
    ],
  };

  const monthlyReturnsOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Monthly Returns',
      },
    },
    scales: {
      y: {
        title: {
          display: true,
          text: 'Return (%)',
        },
      },
    },
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  // Timeline options for filtering
  const timeframeOptions = [
    { value: 'week', label: '1W', icon: <Calendar className="h-4 w-4" /> },
    { value: 'month', label: '1M', icon: <Calendar className="h-4 w-4" /> },
    { value: 'year', label: '1Y', icon: <Calendar className="h-4 w-4" /> },
    { value: 'all', label: 'All', icon: <Calendar className="h-4 w-4" /> },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>Performance Metrics</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1 bg-muted rounded-md p-1">
              {timeframeOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={selectedTimeframe === option.value ? "default" : "ghost"}
                  size="sm"
                  className="h-8 px-3"
                  onClick={() => setSelectedTimeframe(option.value as any)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <Button variant="outline" size="icon" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CardDescription>Trading performance analysis and statistics</CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-80">
            <div className="flex flex-col items-center">
              <RefreshCw className="h-10 w-10 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">Loading performance data...</p>
            </div>
          </div>
        ) : performanceData ? (
          <div className="space-y-8">
            {/* Key metrics section */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-background rounded-lg p-4 border">
                <div className="text-sm font-medium text-muted-foreground mb-1">Total Return</div>
                <div className={`text-2xl font-bold ${performanceData.metrics.total_return >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatPercentage(performanceData.metrics.total_return)}
                </div>
              </div>
              <div className="bg-background rounded-lg p-4 border">
                <div className="text-sm font-medium text-muted-foreground mb-1">Win Rate</div>
                <div className="text-2xl font-bold">
                  {formatPercentage(performanceData.metrics.win_rate)}
                </div>
              </div>
              <div className="bg-background rounded-lg p-4 border">
                <div className="text-sm font-medium text-muted-foreground mb-1">Sharpe Ratio</div>
                <div className="text-2xl font-bold">
                  {performanceData.metrics.sharpe_ratio.toFixed(2)}
                </div>
              </div>
              <div className="bg-background rounded-lg p-4 border">
                <div className="text-sm font-medium text-muted-foreground mb-1">Max Drawdown</div>
                <div className="text-2xl font-bold text-red-500">
                  {formatPercentage(performanceData.metrics.max_drawdown)}
                </div>
              </div>
            </div>

            {/* Additional metrics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-background rounded-lg p-4 border">
                <div className="text-sm font-medium text-muted-foreground mb-1">Profit Factor</div>
                <div className="text-xl font-bold">
                  {performanceData.metrics.profit_factor.toFixed(2)}
                </div>
              </div>
              <div className="bg-background rounded-lg p-4 border">
                <div className="text-sm font-medium text-muted-foreground mb-1">Average Win</div>
                <div className="text-xl font-bold text-green-500">
                  {formatCurrency(performanceData.metrics.average_win)}
                </div>
              </div>
              <div className="bg-background rounded-lg p-4 border">
                <div className="text-sm font-medium text-muted-foreground mb-1">Average Loss</div>
                <div className="text-xl font-bold text-red-500">
                  {formatCurrency(performanceData.metrics.average_loss)}
                </div>
              </div>
            </div>

            {/* Charts */}
            <Tabs defaultValue="equity">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="equity" className="flex items-center gap-2">
                  <LineChart className="h-4 w-4" />
                  <span>Equity Curve</span>
                </TabsTrigger>
                <TabsTrigger value="trades" className="flex items-center gap-2">
                  <BarChart className="h-4 w-4" />
                  <span>Trade Analysis</span>
                </TabsTrigger>
                <TabsTrigger value="monthly" className="flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  <span>Monthly Returns</span>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="equity" className="pt-4">
                <div className="h-80">
                  <Line data={equityChartData} options={equityChartOptions} />
                </div>
              </TabsContent>
              <TabsContent value="trades" className="pt-4">
                <div className="h-80">
                  <Bar data={tradeChartData} options={tradeChartOptions} />
                </div>
              </TabsContent>
              <TabsContent value="monthly" className="pt-4">
                <div className="h-80">
                  <Bar data={monthlyReturnsData} options={monthlyReturnsOptions} />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex justify-center items-center h-80">
            <div className="text-center">
              <p className="text-muted-foreground">No performance data available</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Mock data generator for development/testing
function getMockPerformanceData(timeframe: string): PerformanceData {
  const today = new Date();
  const equityCurve = [];
  const trades = [];
  const monthlyReturns = [];
  
  // Generate equity curve data
  let dataPoints = 0;
  let startDate = new Date();
  
  if (timeframe === 'week') {
    dataPoints = 7;
    startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 7);
  } else if (timeframe === 'month') {
    dataPoints = 30;
    startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 30);
  } else if (timeframe === 'year') {
    dataPoints = 12; // Monthly points for year
    startDate = new Date(today);
    startDate.setFullYear(startDate.getFullYear() - 1);
  } else {
    dataPoints = 24; // Show 2 years for 'all'
    startDate = new Date(today);
    startDate.setFullYear(startDate.getFullYear() - 2);
  }
  
  let currentValue = 10000; // Starting capital
  
  // Generate equity curve
  if (timeframe === 'year' || timeframe === 'all') {
    // Monthly data points
    for (let i = 0; i < dataPoints; i++) {
      const date = new Date(startDate);
      date.setMonth(startDate.getMonth() + i);
      
      // Random monthly return between -5% and +10%
      const monthlyReturn = (Math.random() * 0.15) - 0.05;
      currentValue *= (1 + monthlyReturn);
      
      equityCurve.push({
        timestamp: date.toISOString(),
        value: currentValue
      });
      
      // Also generate monthly returns data
      monthlyReturns.push({
        month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
        return_pct: monthlyReturn * 100
      });
    }
  } else {
    // Daily data points
    for (let i = 0; i < dataPoints; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      // Random daily return between -1% and +2%
      const dailyReturn = (Math.random() * 0.03) - 0.01;
      currentValue *= (1 + dailyReturn);
      
      equityCurve.push({
        timestamp: date.toISOString(),
        value: currentValue
      });
    }
    
    // Generate monthly returns for shorter timeframes
    const months = new Set();
    equityCurve.forEach(point => {
      const date = new Date(point.timestamp);
      const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      months.add(monthYear);
    });
    
    months.forEach(month => {
      monthlyReturns.push({
        month: month as string,
        return_pct: (Math.random() * 16) - 6  // Random monthly return between -6% and +10%
      });
    });
  }
  
  // Generate trade data
  const numTrades = timeframe === 'week' ? 10 : 
                    timeframe === 'month' ? 25 : 
                    timeframe === 'year' ? 50 : 100;
  
  // Win rate around 60%
  const winRate = 0.6;
  
  for (let i = 0; i < numTrades; i++) {
    const dateSeed = Math.floor(Math.random() * equityCurve.length);
    const date = new Date(equityCurve[dateSeed].timestamp);
    
    // Determine if win or loss
    const isWin = Math.random() < winRate;
    
    // Generate realistic profit/loss numbers
    const profitLoss = isWin 
      ? Math.random() * 500 + 100 // Wins between $100 and $600
      : -(Math.random() * 400 + 100); // Losses between $100 and $500
    
    trades.push({
      date: date.toLocaleDateString(),
      profit_loss: profitLoss
    });
  }
  
  // Calculate aggregate metrics
  const totalReturn = (currentValue - 10000) / 10000;
  const wins = trades.filter(t => t.profit_loss > 0);
  const losses = trades.filter(t => t.profit_loss < 0);
  
  const actualWinRate = wins.length / trades.length;
  const averageWin = wins.reduce((sum, trade) => sum + trade.profit_loss, 0) / wins.length;
  const averageLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.profit_loss, 0) / losses.length);
  const profitFactor = (wins.reduce((sum, trade) => sum + trade.profit_loss, 0)) / 
                      Math.abs(losses.reduce((sum, trade) => sum + trade.profit_loss, 0));
  
  // Calculate max drawdown
  let maxDrawdown = 0;
  let peak = equityCurve[0].value;
  
  for (const point of equityCurve) {
    if (point.value > peak) {
      peak = point.value;
    }
    
    const drawdown = (peak - point.value) / peak;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  }
  
  return {
    equity_curve: equityCurve,
    trades: trades,
    metrics: {
      total_return: totalReturn,
      win_rate: actualWinRate,
      sharpe_ratio: 1.2 + (Math.random() * 0.8), // Random sharpe between 1.2 and 2.0
      max_drawdown: maxDrawdown,
      profit_factor: profitFactor,
      average_win: averageWin,
      average_loss: averageLoss
    },
    monthly_returns: monthlyReturns
  };
}
