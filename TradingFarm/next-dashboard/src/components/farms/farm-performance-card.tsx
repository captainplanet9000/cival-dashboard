'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, BarChart2, TrendingUp, TrendingDown, Percent, DollarSign, BarChart, Clock } from 'lucide-react';
import { farmService } from '@/services/farm-service';

interface FarmPerformanceCardProps {
  farmId: string;
}

export function FarmPerformanceCard({ farmId }: FarmPerformanceCardProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState('7d');
  const [performanceData, setPerformanceData] = useState<any>({
    win_rate: null,
    profit_factor: null,
    sharpe_ratio: null,
    max_drawdown: null,
    total_trades: 0,
    profit_loss: 0,
    avg_trade_duration: 0,
    performance_over_time: []
  });
  
  // Helper functions for demo/placeholder data
  const generateTimeSeriesData = (days: number, baseValue: number = 100, volatility: number = 0.05) => {
    const data = [];
    const isUptrend = Math.random() > 0.3; // 70% chance of uptrend
    let currentValue = baseValue;
    
    for (let i = 0; i < days; i++) {
      const change = currentValue * volatility * (Math.random() - (isUptrend ? 0.3 : 0.7));
      currentValue += change;
      
      data.push({
        timestamp: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toISOString(),
        value: Math.max(0, currentValue),
      });
    }
    
    return data;
  };
  
  const getRandomWinRate = () => (0.5 + Math.random() * 0.3).toFixed(2);
  const getRandomProfitFactor = () => (1 + Math.random() * 2).toFixed(2);
  const getRandomSharpeRatio = () => (0.8 + Math.random() * 1.7).toFixed(2);
  const getRandomDrawdown = () => (-(0.05 + Math.random() * 0.15)).toFixed(2);
  const getRandomProfitLoss = (positive: boolean = true) => 
    ((positive ? 1 : -1) * (100 + Math.random() * 500)).toFixed(2);
  
  // Fetch farm performance data
  useEffect(() => {
    const fetchPerformanceData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // In a real implementation, this would fetch actual data from an API
        // For now, we'll generate some demo data
        
        // Calculate the number of days based on the timeframe
        let days = 7;
        switch (timeframe) {
          case '24h': days = 1; break;
          case '7d': days = 7; break;
          case '30d': days = 30; break;
          case '90d': days = 90; break;
          case 'all': days = 180; break;
        }
        
        // Simulate a small delay for realism
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const isProfitable = Math.random() > 0.3; // 70% chance of profitability
        
        setPerformanceData({
          win_rate: getRandomWinRate(),
          profit_factor: getRandomProfitFactor(),
          sharpe_ratio: getRandomSharpeRatio(),
          max_drawdown: getRandomDrawdown(),
          total_trades: Math.floor(10 + Math.random() * 90),
          profit_loss: getRandomProfitLoss(isProfitable),
          avg_trade_duration: Math.floor(30 + Math.random() * 270), // minutes
          performance_over_time: generateTimeSeriesData(days)
        });
      } catch (err) {
        console.error('Failed to fetch performance data:', err);
        setError('Failed to load performance data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPerformanceData();
  }, [farmId, timeframe]);
  
  // Format profit/loss with sign and currency symbol
  const formatProfitLoss = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}$${parseFloat(value.toString()).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  // Format percentages
  const formatPercent = (value: number) => {
    return `${(parseFloat(value.toString()) * 100).toFixed(1)}%`;
  };
  
  // Format max drawdown (make sure it's shown as negative)
  const formatDrawdown = (value: number) => {
    const numValue = parseFloat(value.toString());
    return `${numValue <= 0 ? '' : '-'}${Math.abs(numValue * 100).toFixed(1)}%`;
  };
  
  // Calculate chart dimensions
  const chartWidth = 600;
  const chartHeight = 200;
  const chartPadding = 24;
  
  // Generate SVG path for performance chart
  const generateChartPath = (data: any[], width: number, height: number) => {
    if (!data || data.length === 0) return '';
    
    const values = data.map(d => d.value);
    const minValue = Math.min(...values) * 0.95;
    const maxValue = Math.max(...values) * 1.05;
    const valueRange = maxValue - minValue;
    
    const xStep = (width - chartPadding * 2) / (data.length - 1);
    
    const points = data.map((d, i) => {
      const x = chartPadding + i * xStep;
      const y = height - chartPadding - ((d.value - minValue) / valueRange) * (height - chartPadding * 2);
      return `${x},${y}`;
    });
    
    return `M ${points.join(' L ')}`;
  };
  
  // Generate chart area (filled area under the line)
  const generateChartArea = (data: any[], width: number, height: number) => {
    if (!data || data.length === 0) return '';
    
    const values = data.map(d => d.value);
    const minValue = Math.min(...values) * 0.95;
    const maxValue = Math.max(...values) * 1.05;
    const valueRange = maxValue - minValue;
    
    const xStep = (width - chartPadding * 2) / (data.length - 1);
    
    const startPoint = `${chartPadding},${height - chartPadding}`;
    const endPoint = `${width - chartPadding},${height - chartPadding}`;
    
    const points = data.map((d, i) => {
      const x = chartPadding + i * xStep;
      const y = height - chartPadding - ((d.value - minValue) / valueRange) * (height - chartPadding * 2);
      return `${x},${y}`;
    });
    
    return `M ${startPoint} L ${points.join(' L ')} L ${endPoint} Z`;
  };
  
  const chartColor = performanceData.profit_loss >= 0 ? '#22c55e' : '#ef4444';
  const chartPathOpacity = 0.8;
  const chartAreaOpacity = 0.1;
  
  return (
    <div className="space-y-4">
      {/* Timeframe Selection */}
      <div className="flex justify-between items-center">
        <Tabs value={timeframe} onValueChange={setTimeframe} className="w-auto">
          <TabsList className="grid grid-cols-5 w-auto">
            <TabsTrigger value="24h">24h</TabsTrigger>
            <TabsTrigger value="7d">7d</TabsTrigger>
            <TabsTrigger value="30d">30d</TabsTrigger>
            <TabsTrigger value="90d">90d</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <Badge variant={performanceData.profit_loss >= 0 ? 'default' : 'destructive'} className="px-3 py-1">
          {performanceData.profit_loss >= 0 ? (
            <TrendingUp className="h-3.5 w-3.5 mr-1" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 mr-1" />
          )}
          {loading ? (
            <Skeleton className="h-4 w-16" />
          ) : (
            formatProfitLoss(performanceData.profit_loss)
          )}
        </Badge>
      </div>
      
      {/* Main Chart */}
      <div className="aspect-video bg-card rounded-md border relative overflow-hidden">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Skeleton className="h-full w-full" />
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-muted-foreground">Failed to load performance data</p>
          </div>
        ) : (
          <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
            {/* Chart grid lines */}
            <g className="chart-grid" opacity="0.1">
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
                <line 
                  key={i}
                  x1={chartPadding}
                  y1={chartPadding + ratio * (chartHeight - chartPadding * 2)}
                  x2={chartWidth - chartPadding}
                  y2={chartPadding + ratio * (chartHeight - chartPadding * 2)}
                  stroke="currentColor"
                  strokeDasharray="4,4"
                />
              ))}
            </g>
            
            {/* Chart area (filled) */}
            <path
              d={generateChartArea(performanceData.performance_over_time, chartWidth, chartHeight)}
              fill={chartColor}
              opacity={chartAreaOpacity}
            />
            
            {/* Chart line */}
            <path
              d={generateChartPath(performanceData.performance_over_time, chartWidth, chartHeight)}
              fill="none"
              stroke={chartColor}
              strokeWidth="2"
              opacity={chartPathOpacity}
            />
            
            {/* Chart dots for each data point */}
            {performanceData.performance_over_time.map((point: any, i: number) => {
              const values = performanceData.performance_over_time.map((d: any) => d.value);
              const minValue = Math.min(...values) * 0.95;
              const maxValue = Math.max(...values) * 1.05;
              const valueRange = maxValue - minValue;
              const xStep = (chartWidth - chartPadding * 2) / (performanceData.performance_over_time.length - 1);
              const x = chartPadding + i * xStep;
              const y = chartHeight - chartPadding - ((point.value - minValue) / valueRange) * (chartHeight - chartPadding * 2);
              
              // Only show dots for first, last, min, and max points to avoid clutter
              const isFirstOrLast = i === 0 || i === performanceData.performance_over_time.length - 1;
              const isMinOrMax = point.value === minValue || point.value === maxValue;
              
              if (isFirstOrLast || isMinOrMax) {
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r="3"
                    fill={chartColor}
                  />
                );
              }
              return null;
            })}
          </svg>
        )}
      </div>
      
      {/* Performance Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Win Rate</span>
            </div>
            {loading ? (
              <Skeleton className="h-6 w-16 mt-1" />
            ) : (
              <p className="text-lg font-bold mt-1">
                {formatPercent(performanceData.win_rate)}
              </p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-muted-foreground">Profit Factor</span>
            </div>
            {loading ? (
              <Skeleton className="h-6 w-16 mt-1" />
            ) : (
              <p className="text-lg font-bold mt-1">
                {performanceData.profit_factor}
              </p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-muted-foreground">Sharpe Ratio</span>
            </div>
            {loading ? (
              <Skeleton className="h-6 w-16 mt-1" />
            ) : (
              <p className="text-lg font-bold mt-1">
                {performanceData.sharpe_ratio}
              </p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span className="text-sm text-muted-foreground">Max Drawdown</span>
            </div>
            {loading ? (
              <Skeleton className="h-6 w-16 mt-1" />
            ) : (
              <p className="text-lg font-bold mt-1">
                {formatDrawdown(performanceData.max_drawdown)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Additional Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="flex justify-between items-center px-4 py-2 rounded-md border">
          <span className="text-sm text-muted-foreground">Total Trades</span>
          {loading ? (
            <Skeleton className="h-5 w-12" />
          ) : (
            <span className="font-medium">{performanceData.total_trades}</span>
          )}
        </div>
        
        <div className="flex justify-between items-center px-4 py-2 rounded-md border">
          <span className="text-sm text-muted-foreground">Avg Duration</span>
          {loading ? (
            <Skeleton className="h-5 w-16" />
          ) : (
            <span className="font-medium">{performanceData.avg_trade_duration} min</span>
          )}
        </div>
        
        <div className="flex justify-between items-center px-4 py-2 rounded-md border">
          <span className="text-sm text-muted-foreground">Total P/L</span>
          {loading ? (
            <Skeleton className="h-5 w-20" />
          ) : (
            <span className={`font-medium ${performanceData.profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatProfitLoss(performanceData.profit_loss)}
            </span>
          )}
        </div>
      </div>
      
      <div className="flex justify-end">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/dashboard/farms/${farmId}/performance`}>
            View Detailed Performance
          </Link>
        </Button>
      </div>
    </div>
  );
}

// For simplicity, include the Link component definition in the same file
function Link({ href, children, className }: { href: string, children: React.ReactNode, className?: string }) {
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}
