"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Button } from '../../../components/ui/button';
import { api } from '../../../lib/api-client';
import { LineChart, BarChart2, PieChart, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

interface PerformanceMetricsProps {
  farmId: number;
  initialMetrics?: {
    win_rate: number;
    profit_factor?: number;
    trades_count: number;
    total_profit_loss?: number;
    average_win?: number;
    average_loss?: number;
  };
  refreshInterval?: number;
}

export default function PerformanceMetrics({ 
  farmId, 
  initialMetrics,
  refreshInterval = 30000 
}: PerformanceMetricsProps) {
  const [metrics, setMetrics] = useState(initialMetrics || {
    win_rate: 0,
    profit_factor: 0,
    trades_count: 0,
    total_profit_loss: 0,
    average_win: 0,
    average_loss: 0
  });
  
  const [timeframe, setTimeframe] = useState('1w');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Load performance metrics
  const loadMetrics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.getFarmPerformance(farmId);
      
      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        setMetrics(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load performance metrics');
    } finally {
      setLoading(false);
    }
  };
  
  // Refresh metrics periodically
  useEffect(() => {
    loadMetrics();
    
    const intervalId = setInterval(() => {
      loadMetrics();
    }, refreshInterval);
    
    return () => clearInterval(intervalId);
  }, [farmId, refreshInterval]);
  
  // Format currency
  const formatCurrency = (value?: number) => {
    if (value === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };
  
  // Format percentage
  const formatPercentage = (value?: number) => {
    if (value === undefined) return 'N/A';
    return `${(value * 100).toFixed(2)}%`;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>Performance Metrics</CardTitle>
          <Button variant="ghost" size="sm" onClick={loadMetrics} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="p-4 text-center text-red-500">
            Error loading metrics: {error}
          </div>
        ) : (
          <>
            {/* Time Period Selection */}
            <div className="mb-6">
              <Tabs defaultValue={timeframe} onValueChange={setTimeframe}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="1d">Day</TabsTrigger>
                  <TabsTrigger value="1w">Week</TabsTrigger>
                  <TabsTrigger value="1m">Month</TabsTrigger>
                  <TabsTrigger value="all">All Time</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            {/* Key Metrics Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <MetricCard 
                title="Win Rate" 
                value={formatPercentage(metrics.win_rate)} 
                icon={<TrendingUp className="h-4 w-4 text-green-500" />} 
              />
              <MetricCard 
                title="Profit Factor" 
                value={metrics.profit_factor?.toFixed(2) || 'N/A'} 
                icon={<BarChart2 className="h-4 w-4 text-blue-500" />} 
              />
              <MetricCard 
                title="Total P/L" 
                value={formatCurrency(metrics.total_profit_loss)} 
                icon={metrics.total_profit_loss && metrics.total_profit_loss > 0 
                  ? <TrendingUp className="h-4 w-4 text-green-500" />
                  : <TrendingDown className="h-4 w-4 text-red-500" />} 
              />
              <MetricCard 
                title="Total Trades" 
                value={metrics.trades_count?.toString() || '0'} 
                icon={<PieChart className="h-4 w-4 text-purple-500" />} 
              />
            </div>
            
            {/* Detailed Metrics */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Trade Statistics</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Average Win</p>
                  <p className="text-sm font-medium">{formatCurrency(metrics.average_win)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Average Loss</p>
                  <p className="text-sm font-medium">{formatCurrency(metrics.average_loss)}</p>
                </div>
              </div>
              
              <div className="pt-2">
                <h3 className="text-sm font-medium mb-2">Win/Loss Ratio</h3>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full" 
                    style={{ width: `${metrics.win_rate * 100}%` }}
                  ></div>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-muted-foreground">
                    {metrics.trades_count ? Math.round(metrics.win_rate * metrics.trades_count) : 0} Wins
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {metrics.trades_count ? metrics.trades_count - Math.round(metrics.win_rate * metrics.trades_count) : 0} Losses
                  </span>
                </div>
              </div>
              
              {/* Placeholder for charts */}
              <div className="pt-4 mt-4 border-t">
                <div className="text-center py-8 bg-muted/20 rounded-md">
                  <p className="text-sm text-muted-foreground">Charts visualization would be displayed here</p>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  icon?: React.ReactNode;
}

function MetricCard({ title, value, icon }: MetricCardProps) {
  return (
    <div className="bg-muted/20 rounded-md p-3">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-xs font-medium text-muted-foreground">{title}</h4>
        {icon}
      </div>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
} 