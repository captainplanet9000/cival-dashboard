"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BacktestResult, BacktestTrade } from '@/types/backtesting';
import { useTheme } from 'next-themes';
import { 
  LineChart as LineChartIcon, 
  BarChart as BarChartIcon, 
  Calendar, 
  TrendingUp, 
  TrendingDown 
} from 'lucide-react';
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
  Filler,
} from 'chart.js';

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
  Filler
);

interface BacktestResultsChartsProps {
  result: BacktestResult;
}

export function BacktestResultsCharts({ result }: BacktestResultsChartsProps) {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('equity');
  
  // Create data for equity curve chart
  const equityChartData = {
    labels: result.equity_curve.map(point => new Date(point.timestamp).toLocaleDateString()),
    datasets: [
      {
        label: 'Portfolio Value',
        data: result.equity_curve.map(point => point.value),
        fill: true,
        backgroundColor: theme === 'dark' 
          ? 'rgba(59, 130, 246, 0.1)' 
          : 'rgba(59, 130, 246, 0.1)',
        borderColor: 'rgb(59, 130, 246)',
        tension: 0.4,
      },
    ],
  };

  // Chart options for equity curve
  const equityChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: function(context: any) {
            return `Value: ${new Intl.NumberFormat('en-US', { 
              style: 'currency', 
              currency: 'USD' 
            }).format(context.parsed.y)}`;
          }
        }
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
            return '$' + value.toLocaleString();
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

  // Create data for trades chart
  const tradesChartData = {
    labels: result.trades.map(trade => new Date(trade.entry_time).toLocaleDateString()),
    datasets: [
      {
        label: 'Trade P&L',
        data: result.trades.map(trade => trade.profit_loss),
        backgroundColor: result.trades.map(trade => 
          trade.profit_loss >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)'
        ),
        borderColor: result.trades.map(trade => 
          trade.profit_loss >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'
        ),
        borderWidth: 1,
      },
    ],
  };

  // Chart options for trades
  const tradesChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `P&L: ${new Intl.NumberFormat('en-US', { 
              style: 'currency', 
              currency: 'USD' 
            }).format(context.parsed.y)}`;
          }
        }
      },
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        grid: {
          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          callback: function(value: any) {
            return '$' + value.toLocaleString();
          },
        },
      },
    },
  };

  // Create data for monthly returns chart
  const monthlyReturnsData = {
    labels: result.monthly_returns.map(item => item.month),
    datasets: [
      {
        label: 'Monthly Returns (%)',
        data: result.monthly_returns.map(item => item.return_pct),
        backgroundColor: result.monthly_returns.map(item => 
          item.return_pct >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)'
        ),
        borderColor: result.monthly_returns.map(item => 
          item.return_pct >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'
        ),
        borderWidth: 1,
      },
    ],
  };

  // Chart options for monthly returns
  const monthlyReturnsOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `Return: ${context.parsed.y.toFixed(2)}%`;
          }
        }
      },
    },
    scales: {
      y: {
        grid: {
          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          callback: function(value: any) {
            return value + '%';
          },
        },
      },
    },
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle>Performance Charts</CardTitle>
      </CardHeader>
      <CardContent className="py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="equity" className="flex items-center gap-2">
              <LineChartIcon className="h-4 w-4" />
              <span>Equity Curve</span>
            </TabsTrigger>
            <TabsTrigger value="trades" className="flex items-center gap-2">
              <BarChartIcon className="h-4 w-4" />
              <span>Trades</span>
            </TabsTrigger>
            <TabsTrigger value="monthly" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Monthly Returns</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="equity" className="h-[400px]">
            <Line data={equityChartData} options={equityChartOptions} />
          </TabsContent>

          <TabsContent value="trades" className="h-[400px]">
            <Bar data={tradesChartData} options={tradesChartOptions} />
          </TabsContent>

          <TabsContent value="monthly" className="h-[400px]">
            <Bar data={monthlyReturnsData} options={monthlyReturnsOptions} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
