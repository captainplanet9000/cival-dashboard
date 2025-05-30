"use client";

import { useState, useEffect } from 'react';
import { BacktestResult } from '@/types/backtesting';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, BarChart4, ListFilter, Activity } from 'lucide-react';
import { BacktestResultsHeader } from './BacktestResultsHeader';
import { BacktestResultsCharts } from './BacktestResultsCharts';
import { BacktestTradesList } from './BacktestTradesList';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface BacktestResultsProps {
  backtestId: string;
  initialResult?: BacktestResult;
}

export function BacktestResults({ backtestId, initialResult }: BacktestResultsProps) {
  const { toast } = useToast();
  const supabase = createClientComponentClient();
  const [result, setResult] = useState<BacktestResult | null>(initialResult || null);
  const [isLoading, setIsLoading] = useState(!initialResult);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!initialResult) {
      fetchBacktestResult();
    }
    
    // Set up polling for running backtests
    let intervalId: NodeJS.Timeout | null = null;
    if (result && result.status === 'running') {
      intervalId = setInterval(fetchBacktestResult, 5000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [backtestId, result?.status]);

  const fetchBacktestResult = async () => {
    setIsLoading(prevLoading => !isRefreshing && prevLoading);
    setIsRefreshing(true);
    
    try {
      // In a real app, get data from API
      // For demo, use mock data
      const mockResult = getMockBacktestResult(backtestId);
      setResult(mockResult);
      
      if (mockResult.status === 'completed' && isRefreshing) {
        toast({
          title: "Backtest Completed",
          description: "Your backtest has finished running successfully.",
        });
      } else if (mockResult.status === 'failed' && isRefreshing) {
        toast({
          variant: "destructive",
          title: "Backtest Failed",
          description: mockResult.error || "An error occurred during backtest execution.",
        });
      }
    } catch (error) {
      console.error("Error fetching backtest result:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load backtest results.",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchBacktestResult();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-6">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-40" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
            </div>
          </CardContent>
        </Card>
        
        <Skeleton className="h-[400px] rounded-lg" />
        <Skeleton className="h-[400px] rounded-lg" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Backtest result not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BacktestResultsHeader 
        result={result} 
        onRefresh={handleRefresh} 
        isRefreshing={isRefreshing} 
      />
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="charts" className="flex items-center gap-2">
            <LineChart className="h-4 w-4" />
            <span>Charts</span>
          </TabsTrigger>
          <TabsTrigger value="trades" className="flex items-center gap-2">
            <ListFilter className="h-4 w-4" />
            <span>Trades</span>
          </TabsTrigger>
          <TabsTrigger value="statistics" className="flex items-center gap-2">
            <BarChart4 className="h-4 w-4" />
            <span>Statistics</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="py-4 space-y-6">
          <BacktestResultsCharts result={result} />
          <BacktestTradesList trades={result.trades.slice(0, 5)} />
        </TabsContent>
        
        <TabsContent value="charts" className="py-4">
          <BacktestResultsCharts result={result} />
        </TabsContent>
        
        <TabsContent value="trades" className="py-4">
          <BacktestTradesList trades={result.trades} />
        </TabsContent>
        
        <TabsContent value="statistics" className="py-4">
          <Card>
            <CardContent className="py-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Performance Metrics</h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between py-2 border-b">
                      <dt className="text-muted-foreground">Total Return</dt>
                      <dd className={result.profit_loss >= 0 ? 'text-green-500' : 'text-red-500'}>
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD'
                        }).format(result.profit_loss)}
                      </dd>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <dt className="text-muted-foreground">Win Rate</dt>
                      <dd>
                        {(result.win_rate).toFixed(2)}%
                      </dd>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <dt className="text-muted-foreground">Sharpe Ratio</dt>
                      <dd>
                        {result.sharpe_ratio.toFixed(2)}
                      </dd>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <dt className="text-muted-foreground">Sortino Ratio</dt>
                      <dd>
                        {result.sortino_ratio.toFixed(2)}
                      </dd>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <dt className="text-muted-foreground">Max Drawdown</dt>
                      <dd className="text-red-500">
                        {(result.max_drawdown).toFixed(2)}%
                      </dd>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <dt className="text-muted-foreground">Total Trades</dt>
                      <dd>
                        {result.total_trades}
                      </dd>
                    </div>
                  </dl>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Additional Metrics</h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between py-2 border-b">
                      <dt className="text-muted-foreground">Average Win</dt>
                      <dd className="text-green-500">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD'
                        }).format(result.metrics.average_win)}
                      </dd>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <dt className="text-muted-foreground">Average Loss</dt>
                      <dd className="text-red-500">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD'
                        }).format(result.metrics.average_loss)}
                      </dd>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <dt className="text-muted-foreground">Profit Factor</dt>
                      <dd>
                        {result.metrics.profit_factor.toFixed(2)}
                      </dd>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <dt className="text-muted-foreground">Max Consecutive Wins</dt>
                      <dd>
                        {result.metrics.max_consecutive_wins}
                      </dd>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <dt className="text-muted-foreground">Max Consecutive Losses</dt>
                      <dd>
                        {result.metrics.max_consecutive_losses}
                      </dd>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <dt className="text-muted-foreground">Annualized Return</dt>
                      <dd className={result.metrics.annualized_return >= 0 ? 'text-green-500' : 'text-red-500'}>
                        {result.metrics.annualized_return.toFixed(2)}%
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Mock data generator for development
function getMockBacktestResult(backtestId: string): BacktestResult {
  const now = new Date();
  const startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
  
  // Generate 100 days of equity curve data
  const equityCurve = [];
  let currentValue = 10000; // Starting capital
  
  for (let i = 0; i < 90; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    
    // Random daily return between -1.5% and +2%
    const dailyReturn = (Math.random() * 0.035) - 0.015;
    currentValue *= (1 + dailyReturn);
    
    equityCurve.push({
      timestamp: date.getTime(),
      value: currentValue
    });
  }
  
  // Generate trade data
  const trades = [];
  let entryTime = new Date(startDate);
  let direction: 'long' | 'short' = Math.random() > 0.5 ? 'long' : 'short';
  let totalTrades = 45;
  let winningTrades = 0;
  
  for (let i = 0; i < totalTrades; i++) {
    // Alternate between long and short positions
    direction = direction === 'long' ? 'short' : 'long';
    
    // Random hold time between 1 and 5 days
    const holdTime = Math.floor(Math.random() * 5 * 24) + 24; // hours
    
    // Entry and exit times
    entryTime = new Date(entryTime.getTime() + Math.floor(Math.random() * 24) * 60 * 60 * 1000); // Random hours forward
    const exitTime = new Date(entryTime.getTime() + holdTime * 60 * 60 * 1000);
    
    // Random prices
    const entryPrice = direction === 'long' ? 30000 + (Math.random() * 5000) : 30000 + (Math.random() * 5000);
    
    // Determine if winning trade (60% win rate)
    const isWin = Math.random() < 0.6;
    if (isWin) winningTrades++;
    
    const priceChange = isWin 
      ? (direction === 'long' ? Math.random() * 0.05 + 0.01 : -(Math.random() * 0.05 + 0.01))
      : (direction === 'long' ? -(Math.random() * 0.03 + 0.01) : Math.random() * 0.03 + 0.01);
    
    const exitPrice = entryPrice * (1 + priceChange);
    
    // Random quantity between 0.1 and 2
    const quantity = 0.1 + (Math.random() * 1.9);
    
    // Calculate P&L
    const profitLoss = direction === 'long'
      ? (exitPrice - entryPrice) * quantity
      : (entryPrice - exitPrice) * quantity;
    
    const profitLossPct = direction === 'long'
      ? ((exitPrice - entryPrice) / entryPrice) * 100
      : ((entryPrice - exitPrice) / entryPrice) * 100;
    
    // Random exit reason
    const exitReasons = ['take_profit', 'stop_loss', 'signal', 'end_of_period'];
    const exitReason = isWin 
      ? (Math.random() > 0.7 ? 'end_of_period' : 'take_profit') 
      : (Math.random() > 0.7 ? 'end_of_period' : 'stop_loss');
    
    trades.push({
      entry_time: entryTime.toISOString(),
      exit_time: exitTime.toISOString(),
      symbol: 'BTC/USDT',
      direction,
      entry_price: entryPrice,
      exit_price: exitPrice,
      quantity,
      profit_loss: profitLoss,
      profit_loss_pct: profitLossPct,
      exit_reason: exitReason
    });
  }
  
  // Generate monthly returns
  const monthlyReturns = [];
  const months = ['Jan', 'Feb', 'Mar'];
  for (let i = 0; i < 3; i++) {
    monthlyReturns.push({
      month: `${months[i]} ${now.getFullYear()}`,
      return_pct: (Math.random() * 30) - 10
    });
  }
  
  // Calculate metrics
  const winRate = (winningTrades / totalTrades) * 100;
  
  const winningTradesData = trades.filter(t => t.profit_loss > 0);
  const losingTradesData = trades.filter(t => t.profit_loss < 0);
  
  const averageWin = winningTradesData.reduce((sum, trade) => sum + trade.profit_loss, 0) / winningTradesData.length;
  const averageLoss = Math.abs(losingTradesData.reduce((sum, trade) => sum + trade.profit_loss, 0) / losingTradesData.length);
  
  // Calculate max drawdown
  let maxDrawdown = 0;
  let peak = equityCurve[0].value;
  
  for (const point of equityCurve) {
    if (point.value > peak) {
      peak = point.value;
    }
    
    const drawdown = ((peak - point.value) / peak) * 100;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  }
  
  // Final P&L
  const finalValue = equityCurve[equityCurve.length - 1].value;
  const totalReturn = finalValue - 10000;
  
  return {
    id: backtestId,
    backtest_id: backtestId,
    user_id: 'user-123',
    total_trades: totalTrades,
    win_rate: winRate,
    profit_loss: totalReturn,
    max_drawdown: maxDrawdown,
    sharpe_ratio: 1.8 + (Math.random() * 0.5),
    sortino_ratio: 2.1 + (Math.random() * 0.5),
    status: 'completed',
    equity_curve: equityCurve,
    trades,
    monthly_returns: monthlyReturns,
    metrics: {
      average_win: averageWin,
      average_loss: averageLoss,
      max_consecutive_wins: Math.floor(Math.random() * 5) + 3,
      max_consecutive_losses: Math.floor(Math.random() * 3) + 2,
      profit_factor: (winningTradesData.reduce((sum, t) => sum + t.profit_loss, 0)) / 
                    Math.abs(losingTradesData.reduce((sum, t) => sum + t.profit_loss, 0)),
      recovery_factor: totalReturn / maxDrawdown,
      expected_payoff: (averageWin * (winRate / 100)) - (averageLoss * (1 - (winRate / 100))),
      annualized_return: ((finalValue / 10000) - 1) * (365 / 90) * 100, // Annualized from 90 days
    },
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    updated_at: new Date().toISOString()
  };
}
