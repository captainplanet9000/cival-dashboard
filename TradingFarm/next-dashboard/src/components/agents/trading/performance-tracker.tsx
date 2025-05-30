'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LineChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react';

interface PerformanceMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalProfit: number;
  averageProfit: number;
  averageLoss: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  averageHoldingTime: number;
}

interface TradeHistoryItem {
  id: string;
  timestamp: string;
  symbol: string;
  direction: 'buy' | 'sell';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  profit: number;
  profitPercent: number;
  durationMinutes: number;
}

interface EquityHistory {
  timestamp: string;
  equity: number;
  drawdown: number;
}

interface PerformanceTrackerProps {
  agentId: string;
  farmId: string;
  timeframe?: '1d' | '1w' | '1m' | '3m' | 'all';
}

export function PerformanceTracker({ agentId, farmId, timeframe = '1m' }: PerformanceTrackerProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [tradeHistory, setTradeHistory] = useState<TradeHistoryItem[]>([]);
  const [equityHistory, setEquityHistory] = useState<EquityHistory[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1d' | '1w' | '1m' | '3m' | 'all'>(timeframe);

  // Fetch performance data
  const fetchPerformanceData = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would fetch from an API
      // For now, we'll generate sample data
      
      // Sample metrics
      const sampleMetrics: PerformanceMetrics = {
        totalTrades: 42,
        winningTrades: 25,
        losingTrades: 17,
        winRate: 59.5,
        totalProfit: 1250.75,
        averageProfit: 78.45,
        averageLoss: -32.18,
        profitFactor: 2.43,
        sharpeRatio: 1.87,
        maxDrawdown: 12.5,
        averageHoldingTime: 135 // minutes
      };
      
      // Sample trade history
      const sampleTradeHistory: TradeHistoryItem[] = [];
      
      const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT'];
      const now = new Date();
      
      // Generate random trades
      for (let i = 0; i < 20; i++) {
        const direction = Math.random() > 0.5 ? 'buy' : 'sell';
        const entryPrice = Math.random() * 1000 + 100;
        const exitPrice = entryPrice * (1 + (Math.random() * 0.2 - 0.1));
        const quantity = Math.random() * 5 + 0.1;
        const profit = (exitPrice - entryPrice) * quantity * (direction === 'buy' ? 1 : -1);
        const profitPercent = ((exitPrice / entryPrice) - 1) * 100 * (direction === 'buy' ? 1 : -1);
        
        const tradeDate = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
        
        sampleTradeHistory.push({
          id: `trade-${i}`,
          timestamp: tradeDate.toISOString(),
          symbol: symbols[Math.floor(Math.random() * symbols.length)],
          direction,
          entryPrice,
          exitPrice,
          quantity,
          profit,
          profitPercent,
          durationMinutes: Math.floor(Math.random() * 300 + 15)
        });
      }
      
      // Sort by most recent first
      sampleTradeHistory.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      // Sample equity history
      const sampleEquityHistory: EquityHistory[] = [];
      
      // Start with 10,000 and add some random changes
      let equity = 10000;
      let maxEquity = equity;
      
      for (let i = 0; i < 30; i++) {
        const date = new Date(now.getTime() - ((30 - i) * 24 * 60 * 60 * 1000));
        
        // Add some random daily change
        equity += (Math.random() * 500 - 200);
        
        // Update max equity if needed
        if (equity > maxEquity) {
          maxEquity = equity;
        }
        
        // Calculate drawdown
        const drawdown = ((maxEquity - equity) / maxEquity) * 100;
        
        sampleEquityHistory.push({
          timestamp: date.toISOString().split('T')[0],
          equity,
          drawdown
        });
      }
      
      setMetrics(sampleMetrics);
      setTradeHistory(sampleTradeHistory);
      setEquityHistory(sampleEquityHistory);
      
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initialize with sample data
  useEffect(() => {
    fetchPerformanceData();
  }, [agentId, selectedTimeframe]);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  // Format percentage
  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-medium">Trading Performance</CardTitle>
        <div className="flex items-center space-x-2">
          <Tabs value={selectedTimeframe} onValueChange={(v) => setSelectedTimeframe(v as any)}>
            <TabsList className="grid grid-cols-5 w-[300px]">
              <TabsTrigger value="1d">1D</TabsTrigger>
              <TabsTrigger value="1w">1W</TabsTrigger>
              <TabsTrigger value="1m">1M</TabsTrigger>
              <TabsTrigger value="3m">3M</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={fetchPerformanceData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary stats */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-md border p-3">
              <div className="flex flex-row items-center justify-between">
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <Badge variant="outline" className={metrics.winRate >= 50 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}>
                  {metrics.winRate >= 50 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {formatPercent(metrics.winRate)}
                </Badge>
              </div>
              <p className="text-2xl font-bold mt-2">{metrics.winningTrades}/{metrics.totalTrades}</p>
            </div>
            
            <div className="rounded-md border p-3">
              <div className="flex flex-row items-center justify-between">
                <p className="text-sm text-muted-foreground">Total Profit</p>
                <Badge variant="outline" className={metrics.totalProfit >= 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}>
                  {metrics.totalProfit >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  <DollarSign className="h-3 w-3 mr-0" />
                </Badge>
              </div>
              <p className="text-2xl font-bold mt-2">{formatCurrency(metrics.totalProfit)}</p>
            </div>
            
            <div className="rounded-md border p-3">
              <div className="flex flex-row items-center justify-between">
                <p className="text-sm text-muted-foreground">Max Drawdown</p>
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  <Percent className="h-3 w-3 mr-1" />
                </Badge>
              </div>
              <p className="text-2xl font-bold mt-2">{formatPercent(metrics.maxDrawdown)}</p>
            </div>
            
            <div className="rounded-md border p-3">
              <div className="flex flex-row items-center justify-between">
                <p className="text-sm text-muted-foreground">Profit Factor</p>
                <Badge variant="outline" className={metrics.profitFactor >= 1 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}>
                  {metrics.profitFactor >= 1 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                </Badge>
              </div>
              <p className="text-2xl font-bold mt-2">{metrics.profitFactor.toFixed(2)}</p>
            </div>
          </div>
        )}
        
        {/* Equity curve chart */}
        <div className="rounded-md border p-4">
          <h3 className="text-sm font-medium mb-4">Equity Curve</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={equityHistory} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" tick={{fontSize: 12}} tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }} />
                <YAxis yAxisId="left" orientation="left" tick={{fontSize: 12}} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${value}%`} tick={{fontSize: 12}} />
                <Tooltip formatter={(value, name) => {
                  if (name === 'equity') return formatCurrency(value as number);
                  if (name === 'drawdown') return `${(value as number).toFixed(2)}%`;
                  return value;
                }} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="equity" stroke="#4f46e5" dot={false} name="Equity" />
                <Line yAxisId="right" type="monotone" dataKey="drawdown" stroke="#ef4444" dot={false} name="Drawdown %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Trade history table */}
        <div>
          <h3 className="text-sm font-medium mb-2">Recent Trades</h3>
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="py-2 px-2 text-left text-xs font-medium">Date</th>
                  <th className="py-2 px-2 text-left text-xs font-medium">Symbol</th>
                  <th className="py-2 px-2 text-left text-xs font-medium">Type</th>
                  <th className="py-2 px-2 text-right text-xs font-medium">Entry</th>
                  <th className="py-2 px-2 text-right text-xs font-medium">Exit</th>
                  <th className="py-2 px-2 text-right text-xs font-medium">Size</th>
                  <th className="py-2 px-2 text-right text-xs font-medium">P/L</th>
                  <th className="py-2 px-2 text-right text-xs font-medium">P/L%</th>
                </tr>
              </thead>
              <tbody>
                {tradeHistory.map((trade, index) => {
                  const isProfitable = trade.profit > 0;
                  
                  return (
                    <tr key={trade.id} className={index < tradeHistory.length - 1 ? 'border-b' : ''}>
                      <td className="py-2 px-2 text-xs">{formatDate(trade.timestamp)}</td>
                      <td className="py-2 px-2 text-xs font-medium">{trade.symbol}</td>
                      <td className="py-2 px-2">
                        <Badge 
                          variant="outline" 
                          className={trade.direction === 'buy' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}
                        >
                          {trade.direction === 'buy' ? 'LONG' : 'SHORT'}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-xs text-right">{formatCurrency(trade.entryPrice)}</td>
                      <td className="py-2 px-2 text-xs text-right">{formatCurrency(trade.exitPrice)}</td>
                      <td className="py-2 px-2 text-xs text-right">{trade.quantity.toFixed(4)}</td>
                      <td className={`py-2 px-2 text-xs text-right font-medium ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(trade.profit)}
                      </td>
                      <td className={`py-2 px-2 text-xs text-right font-medium ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                        {isProfitable ? '+' : ''}{formatPercent(trade.profitPercent)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
