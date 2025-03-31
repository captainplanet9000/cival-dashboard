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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Performance Metrics</h2>
        
        <div className="flex items-center gap-4">
          <Tabs value={timeframe} onValueChange={setTimeframe} className="w-[400px]">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="1d">1D</TabsTrigger>
              <TabsTrigger value="1w">1W</TabsTrigger>
              <TabsTrigger value="1m">1M</TabsTrigger>
              <TabsTrigger value="3m">3M</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Button 
            variant="outline" 
            size="icon" 
            onClick={loadMetrics}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
          <p className="font-medium">Error loading metrics</p>
          <p>{error}</p>
        </div>
      )}
      
      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Total Profit/Loss</CardTitle>
            <TrendingUp className={`h-4 w-4 ${(metrics.total_profit_loss || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(metrics.total_profit_loss || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {formatCurrency(metrics.total_profit_loss)}
            </div>
            <p className="text-xs text-muted-foreground">
              {timeframe === '1d' ? 'Last 24 hours' : 
               timeframe === '1w' ? 'Last 7 days' : 
               timeframe === '1m' ? 'Last 30 days' : 
               timeframe === '3m' ? 'Last 90 days' : 'All time'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(metrics.win_rate)}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.trades_count} total trades
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Profit Factor</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.profit_factor?.toFixed(2) || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Gross profit / gross loss
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Win</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">
              {formatCurrency(metrics.average_win)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Loss</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {formatCurrency(Math.abs(metrics.average_loss || 0))}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Best Trade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">
              {formatCurrency(metrics.best_trade || 0)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Worst Trade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {formatCurrency(Math.abs(metrics.worst_trade || 0))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Chart Placeholder */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Performance Chart</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex justify-center items-center bg-muted/10">
          <div className="text-center text-muted-foreground">
            <LineChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Performance chart visualization will be displayed here.</p>
            <p className="text-sm">Data will reflect the selected time period.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 