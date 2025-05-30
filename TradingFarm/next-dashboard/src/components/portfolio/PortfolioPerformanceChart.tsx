"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowUp, 
  ArrowDown, 
  RefreshCw, 
  Calendar, 
  TrendingUp,
  TrendingDown 
} from 'lucide-react';
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
import { PortfolioPerformance } from '@/types/portfolio';
import { Button } from '@/components/ui/button';

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

interface PortfolioPerformanceChartProps {
  portfolioId: string;
  timeframe?: 'week' | 'month' | 'year' | 'all';
  showBenchmarks?: boolean;
  benchmarks?: string[]; // e.g., ["BTC/USD", "S&P500"]
  initialPerformanceData?: PortfolioPerformance[];
  onRefresh?: () => void;
}

export function PortfolioPerformanceChart({
  portfolioId,
  timeframe = 'month',
  showBenchmarks = false,
  benchmarks = ["BTC/USD"],
  initialPerformanceData,
  onRefresh
}: PortfolioPerformanceChartProps) {
  const { theme } = useTheme();
  const [performanceData, setPerformanceData] = React.useState<PortfolioPerformance[]>(initialPerformanceData || []);
  const [benchmarkData, setBenchmarkData] = React.useState<Record<string, any[]>>({});
  const [isLoading, setIsLoading] = React.useState(!initialPerformanceData);
  const [selectedTimeframe, setSelectedTimeframe] = React.useState<'week' | 'month' | 'year' | 'all'>(timeframe);

  // Fetch performance data
  React.useEffect(() => {
    if (!initialPerformanceData) {
      fetchPerformanceData();
    }
  }, [portfolioId, selectedTimeframe, initialPerformanceData]);

  // Fetch benchmark data if needed
  React.useEffect(() => {
    if (showBenchmarks) {
      fetchBenchmarkData();
    }
  }, [showBenchmarks, selectedTimeframe]);

  const fetchPerformanceData = async () => {
    setIsLoading(true);
    try {
      // In a real app, this would be an API call
      // For demo purposes, generate mock data
      const mockData = generateMockPerformanceData(selectedTimeframe);
      setPerformanceData(mockData);
    } catch (error) {
      console.error("Error fetching portfolio performance:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBenchmarkData = async () => {
    try {
      // In a real app, this would be an API call
      // For demo purposes, generate mock data
      const mockBenchmarkData: any = {};
      
      for (const benchmark of benchmarks) {
        mockBenchmarkData[benchmark] = generateMockBenchmarkData(benchmark, selectedTimeframe);
      }
      
      setBenchmarkData(mockBenchmarkData);
    } catch (error) {
      console.error("Error fetching benchmark data:", error);
    }
  };

  const handleRefresh = () => {
    fetchPerformanceData();
    if (showBenchmarks) {
      fetchBenchmarkData();
    }
    if (onRefresh) {
      onRefresh();
    }
  };

  // Calculate performance metrics
  const calculateMetrics = () => {
    if (!performanceData || performanceData.length === 0) {
      return { totalReturn: 0, annualizedReturn: 0 };
    }
    
    const firstValue = performanceData[0].value;
    const lastValue = performanceData[performanceData.length - 1].value;
    const totalReturn = ((lastValue - firstValue) / firstValue) * 100;
    
    // Calculate annualized return
    const firstDate = new Date(performanceData[0].date);
    const lastDate = new Date(performanceData[performanceData.length - 1].date);
    const yearFraction = (lastDate.getTime() - firstDate.getTime()) / (365 * 24 * 60 * 60 * 1000);
    
    const annualizedReturn = (Math.pow((lastValue / firstValue), (1 / Math.max(yearFraction, 0.01))) - 1) * 100;
    
    return { totalReturn, annualizedReturn };
  };

  // Prepare chart data
  const prepareChartData = () => {
    if (!performanceData || performanceData.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }
    
    const chartData: any = {
      labels: performanceData.map(item => new Date(item.date).toLocaleDateString()),
      datasets: [
        {
          label: 'Portfolio Value',
          data: performanceData.map(item => item.value),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
          yAxisID: 'y',
        }
      ]
    };
    
    // Add benchmarks if available
    if (showBenchmarks && Object.keys(benchmarkData).length > 0) {
      const colors = {
        'BTC/USD': 'rgb(247, 147, 26)',
        'ETH/USD': 'rgb(115, 115, 115)',
        'S&P500': 'rgb(34, 197, 94)'
      };
      
      Object.entries(benchmarkData).forEach(([key, data]: [string, any[]], index) => {
        chartData.datasets.push({
          label: key,
          data: data.map((item: { value: number; date: string }) => item.value),
          borderColor: (colors as any)[key] || `hsl(${index * 50}, 70%, 50%)`,
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderDash: [5, 5],
          fill: false,
          tension: 0.4,
          yAxisID: 'y1',
        });
      });
    }
    
    return chartData;
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('en-US', { 
                style: 'currency', 
                currency: 'USD' 
              }).format(context.parsed.y);
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Portfolio Value ($)',
        },
        grid: {
          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          callback: function(value: any) {
            return '$' + value.toLocaleString();
          }
        }
      },
      y1: {
        type: 'linear' as const,
        display: showBenchmarks,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
        title: {
          display: true,
          text: 'Benchmark Value',
        },
        ticks: {
          callback: function(value: any) {
            return '$' + value.toLocaleString();
          }
        }
      },
    },
  };

  // Calculate metrics
  const { totalReturn, annualizedReturn } = calculateMetrics();

  // Format percentage for display
  const formatPercentage = (value: number) => {
    return (value > 0 ? '+' : '') + value.toFixed(2) + '%';
  };

  // Get the appropriate icon based on value
  const getIcon = (value: number) => {
    return value > 0 ? (
      <ArrowUp className="h-4 w-4 text-green-500" />
    ) : (
      <ArrowDown className="h-4 w-4 text-red-500" />
    );
  };

  // Get color class based on value
  const getColorClass = (value: number) => {
    return value > 0 ? 'text-green-500' : value < 0 ? 'text-red-500' : 'text-gray-500';
  };

  // Timeline options for filtering
  const timeframeOptions = [
    { value: 'week', label: '1W' },
    { value: 'month', label: '1M' },
    { value: 'year', label: '1Y' },
    { value: 'all', label: 'All' },
  ];

  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-xl font-bold">Portfolio Performance</CardTitle>
          <div className="flex items-center gap-4 mt-1">
            <div className="flex items-center gap-1 text-sm">
              <span className="text-muted-foreground">Total Return:</span>
              <span className={`font-semibold ${getColorClass(totalReturn)}`}>
                {formatPercentage(totalReturn)}
              </span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <span className="text-muted-foreground">Annualized Return:</span>
              <span className={`font-semibold ${getColorClass(annualizedReturn)}`}>
                {formatPercentage(annualizedReturn)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-md p-1">
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
      </CardHeader>
      <CardContent className="pt-0 pb-4">
        {isLoading ? (
          <div className="h-[350px] flex items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="h-[350px]">
            <Line data={prepareChartData()} options={chartOptions} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Generate mock performance data for development
function generateMockPerformanceData(timeframe: string): PortfolioPerformance[] {
  const data: PortfolioPerformance[] = [];
  const now = new Date();
  let startDate = new Date();
  let days = 0;
  
  switch (timeframe) {
    case 'week':
      days = 7;
      startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      days = 30;
      startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      days = 365;
      startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      break;
    case 'all':
      days = 730; // 2 years
      startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      break;
  }
  
  let currentValue = 10000; // Starting portfolio value
  let cumulativeReturn = 0;
  
  // Generate daily data points
  for (let i = 0; i <= days; i++) {
    const currentDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    
    // Skip weekends for realistic data (optional)
    const dayOfWeek = currentDate.getDay();
    if (timeframe !== 'week' && (dayOfWeek === 0 || dayOfWeek === 6)) {
      continue;
    }
    
    // Generate random daily return between -1.5% and +2%
    const dailyReturn = (Math.random() * 0.035) - 0.015;
    const dailyReturnPct = dailyReturn * 100;
    
    // Update portfolio value
    currentValue *= (1 + dailyReturn);
    
    // Update cumulative return
    cumulativeReturn = ((currentValue / 10000) - 1) * 100;
    
    // Calculate drawdown (simplified)
    const drawdown = Math.random() * 5; // Random drawdown percentage
    
    data.push({
      id: `perf-${i}`,
      portfolio_id: 'mock-portfolio',
      date: currentDate.toISOString(),
      value: currentValue,
      daily_return: dailyReturn * currentValue,
      daily_return_pct: dailyReturnPct,
      cumulative_return: currentValue - 10000,
      cumulative_return_pct: cumulativeReturn,
      drawdown: drawdown * (currentValue / 100),
      drawdown_pct: drawdown,
      volatility_30d: 15 + (Math.random() * 5),
      sharpe_ratio_30d: 1.2 + (Math.random() * 0.8),
      sortino_ratio_30d: 1.5 + (Math.random() * 0.8),
      max_drawdown_30d: 8 + (Math.random() * 4),
      max_drawdown_30d_pct: 8 + (Math.random() * 4),
    });
  }
  
  return data;
}

// Generate mock benchmark data for development
function generateMockBenchmarkData(benchmark: string, timeframe: string): any[] {
  const data: any[] = [];
  const now = new Date();
  let startDate = new Date();
  let days = 0;
  
  switch (timeframe) {
    case 'week':
      days = 7;
      startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      days = 30;
      startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      days = 365;
      startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      break;
    case 'all':
      days = 730; // 2 years
      startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      break;
  }
  
  // Set different starting values based on benchmark
  let currentValue = benchmark === 'BTC/USD' ? 30000 : 
                    benchmark === 'ETH/USD' ? 2000 :
                    benchmark === 'S&P500' ? 4500 : 10000;
  
  // Different volatility profiles
  const volatility = benchmark === 'BTC/USD' ? 0.04 : 
                    benchmark === 'ETH/USD' ? 0.05 :
                    benchmark === 'S&P500' ? 0.01 : 0.02;
  
  // Generate daily data points
  for (let i = 0; i <= days; i++) {
    const currentDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    
    // Skip weekends for traditional markets
    const dayOfWeek = currentDate.getDay();
    if (benchmark === 'S&P500' && (dayOfWeek === 0 || dayOfWeek === 6)) {
      continue;
    }
    
    // Generate random daily return
    const dailyReturn = (Math.random() * (volatility * 2)) - volatility;
    
    // Update value
    currentValue *= (1 + dailyReturn);
    
    data.push({
      date: currentDate.toISOString(),
      value: currentValue,
    });
  }
  
  return data;
}
