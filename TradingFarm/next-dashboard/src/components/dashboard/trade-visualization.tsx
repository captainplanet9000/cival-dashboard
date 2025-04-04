'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LineChart, BarChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Calendar,
  DollarSign,
  Percent,
  PieChart as PieChartIcon,
  BarChart2
} from 'lucide-react';

interface TradeData {
  date: string;
  profit: number;
  trades: number;
  winRate: number;
  cumulativeProfit: number;
}

interface AssetAllocation {
  asset: string;
  value: number;
  color: string;
}

interface RiskMetrics {
  maxDrawdown: number;
  sharpeRatio: number;
  volatility: number;
  profitFactor: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  successfulTrades: number;
  failedTrades: number;
}

interface TradeVisualizationProps {
  farmId: string;
}

export function TradeVisualization({ farmId }: TradeVisualizationProps) {
  const [timeframe, setTimeframe] = useState<'1d' | '1w' | '1m' | '3m' | 'all'>('1m');
  const [loading, setLoading] = useState(false);
  const [tradeHistory, setTradeHistory] = useState<TradeData[]>([]);
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [assetAllocation, setAssetAllocation] = useState<AssetAllocation[]>([]);

  // Fetch trade visualization data
  useEffect(() => {
    fetchTradeData();
  }, [farmId, timeframe]);

  const fetchTradeData = async () => {
    setLoading(true);
    try {
      // Mock data for demonstration
      const mockTradeHistory: TradeData[] = generateMockTradeHistory();
      const mockAssetAllocation: AssetAllocation[] = [
        { asset: 'BTC', value: 45, color: '#FF8C00' },
        { asset: 'ETH', value: 25, color: '#6495ED' },
        { asset: 'SOL', value: 15, color: '#9370DB' },
        { asset: 'DOGE', value: 8, color: '#20B2AA' },
        { asset: 'Other', value: 7, color: '#A9A9A9' }
      ];
      const mockRiskMetrics: RiskMetrics = {
        maxDrawdown: 12.5,
        sharpeRatio: 1.7,
        volatility: 14.2,
        profitFactor: 2.3,
        winRate: 68.5,
        averageWin: 205.75,
        averageLoss: -95.20,
        successfulTrades: 48,
        failedTrades: 22
      };
      
      setTradeHistory(mockTradeHistory);
      setAssetAllocation(mockAssetAllocation);
      setRiskMetrics(mockRiskMetrics);
    } catch (error) {
      console.error('Error fetching trade data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch trade visualization data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate mock trade history data
  const generateMockTradeHistory = (): TradeData[] => {
    const data: TradeData[] = [];
    const now = new Date();
    let cumulative = 0;
    
    // Generate daily data for the past 30 days
    for (let i = 30; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      // Generate random profit between -200 and 500
      const dailyProfit = Math.random() * 700 - 200;
      cumulative += dailyProfit;
      
      // Generate random number of trades between 1 and 10
      const dailyTrades = Math.floor(Math.random() * 10) + 1;
      
      // Generate random win rate between 40% and 80%
      const dailyWinRate = Math.random() * 40 + 40;
      
      data.push({
        date: dateString,
        profit: dailyProfit,
        trades: dailyTrades,
        winRate: dailyWinRate,
        cumulativeProfit: cumulative
      });
    }
    
    return data;
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Format percentage
  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Trade Performance Dashboard</CardTitle>
            <CardDescription>
              Visualize trading performance and key metrics
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Select
              value={timeframe}
              onValueChange={(value) => setTimeframe(value as any)}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">Last Day</SelectItem>
                <SelectItem value="1w">Last Week</SelectItem>
                <SelectItem value="1m">Last Month</SelectItem>
                <SelectItem value="3m">Last 3 Months</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchTradeData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        {riskMetrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-md border p-3">
              <div className="flex flex-row items-center justify-between">
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <Badge variant="outline" className={riskMetrics.winRate >= 50 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}>
                  {riskMetrics.winRate >= 50 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {formatPercent(riskMetrics.winRate)}
                </Badge>
              </div>
              <p className="text-2xl font-bold mt-2">{riskMetrics.successfulTrades}/{riskMetrics.successfulTrades + riskMetrics.failedTrades}</p>
            </div>
            
            <div className="rounded-md border p-3">
              <div className="flex flex-row items-center justify-between">
                <p className="text-sm text-muted-foreground">Profit Factor</p>
                <Badge variant="outline" className={riskMetrics.profitFactor >= 1 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}>
                  {riskMetrics.profitFactor >= 1 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {riskMetrics.profitFactor.toFixed(2)}
                </Badge>
              </div>
              <p className="text-2xl font-bold mt-2">{riskMetrics.profitFactor.toFixed(2)}</p>
            </div>
            
            <div className="rounded-md border p-3">
              <div className="flex flex-row items-center justify-between">
                <p className="text-sm text-muted-foreground">Max Drawdown</p>
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  <Percent className="h-3 w-3 mr-1" />
                </Badge>
              </div>
              <p className="text-2xl font-bold mt-2">{formatPercent(riskMetrics.maxDrawdown)}</p>
            </div>
            
            <div className="rounded-md border p-3">
              <div className="flex flex-row items-center justify-between">
                <p className="text-sm text-muted-foreground">Sharpe Ratio</p>
                <Badge variant="outline" className={riskMetrics.sharpeRatio >= 1 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}>
                  {riskMetrics.sharpeRatio >= 1 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                </Badge>
              </div>
              <p className="text-2xl font-bold mt-2">{riskMetrics.sharpeRatio.toFixed(2)}</p>
            </div>
          </div>
        )}
        
        {/* Performance Charts */}
        <Tabs defaultValue="performance" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="performance">
              <TrendingUp className="h-4 w-4 mr-2" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="allocation">
              <PieChartIcon className="h-4 w-4 mr-2" />
              Allocation
            </TabsTrigger>
            <TabsTrigger value="metrics">
              <BarChart2 className="h-4 w-4 mr-2" />
              Risk Metrics
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="performance" className="space-y-4">
            <div className="rounded-md border p-4">
              <h3 className="text-sm font-medium mb-4">Profit & Loss (P&L)</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={tradeHistory} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      }} 
                    />
                    <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'profit') return formatCurrency(value as number);
                        if (name === 'cumulativeProfit') return formatCurrency(value as number);
                        return value;
                      }}
                      labelFormatter={(label) => {
                        const date = new Date(label);
                        return date.toLocaleDateString('en-US', { 
                          weekday: 'long',
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        });
                      }}
                    />
                    <Legend />
                    <Bar 
                      yAxisId="left" 
                      dataKey="profit" 
                      name="Daily P&L" 
                      fill={(d: any, index: number) => (d.profit >= 0 ? '#10b981' : '#ef4444')}
                    />
                    <Line 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="cumulativeProfit" 
                      name="Cumulative P&L" 
                      stroke="#4f46e5" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-md border p-4">
                <h3 className="text-sm font-medium mb-4">Daily Trades</h3>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tradeHistory} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        }}
                        interval={4} 
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value) => [`${value} trades`, 'Number of Trades']}
                        labelFormatter={(label) => {
                          const date = new Date(label);
                          return date.toLocaleDateString('en-US', { 
                            weekday: 'long',
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          });
                        }}
                      />
                      <Bar dataKey="trades" name="Number of Trades" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="rounded-md border p-4">
                <h3 className="text-sm font-medium mb-4">Win Rate</h3>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={tradeHistory} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        }}
                        interval={4} 
                      />
                      <YAxis 
                        domain={[30, 90]} 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `${value}%`} 
                      />
                      <Tooltip 
                        formatter={(value) => [`${(value as number).toFixed(1)}%`, 'Win Rate']}
                        labelFormatter={(label) => {
                          const date = new Date(label);
                          return date.toLocaleDateString('en-US', { 
                            weekday: 'long',
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          });
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="winRate" 
                        name="Win Rate" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        dot={{ fill: '#10b981', strokeWidth: 2 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="allocation" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-md border p-4">
                <h3 className="text-sm font-medium mb-4">Asset Allocation</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={assetAllocation}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="asset"
                        label={(entry) => `${entry.asset}: ${entry.value}%`}
                      >
                        {assetAllocation.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [`${value}%`, 'Allocation']}
                      />
                      <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="rounded-md border p-4">
                <h3 className="text-sm font-medium mb-4">Asset Allocation Details</h3>
                <div className="space-y-4">
                  {assetAllocation.map((asset) => (
                    <div key={asset.asset} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: asset.color }} />
                        <span className="font-medium">{asset.asset}</span>
                      </div>
                      <div className="flex items-center">
                        <Badge variant="outline">{asset.value}%</Badge>
                      </div>
                    </div>
                  ))}
                </div>
                <Separator className="my-4" />
                <div className="rounded-md bg-muted p-3">
                  <h4 className="text-xs font-medium mb-2">Asset Allocation Strategy</h4>
                  <p className="text-xs text-muted-foreground">
                    Current allocation focuses on high-liquidity pairs with BTC and ETH representing the majority
                    of positions. This provides stability while allowing for growth with emerging assets like SOL.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="metrics" className="space-y-4">
            {riskMetrics && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-md border p-4">
                  <h3 className="text-sm font-medium mb-4">Risk Metrics</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Sharpe Ratio</span>
                        <Badge 
                          variant="outline"
                          className={
                            riskMetrics.sharpeRatio > 1.5 
                              ? 'bg-green-50 text-green-700 border-green-200' 
                              : riskMetrics.sharpeRatio > 1 
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }
                        >
                          {riskMetrics.sharpeRatio.toFixed(2)}
                        </Badge>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${Math.min(riskMetrics.sharpeRatio / 3 * 100, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Measures excess return per unit of risk. Higher is better.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Max Drawdown</span>
                        <Badge 
                          variant="outline"
                          className={
                            riskMetrics.maxDrawdown < 10
                              ? 'bg-green-50 text-green-700 border-green-200' 
                              : riskMetrics.maxDrawdown < 20
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }
                        >
                          {formatPercent(riskMetrics.maxDrawdown)}
                        </Badge>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-red-500 h-2 rounded-full" 
                          style={{ width: `${Math.min(riskMetrics.maxDrawdown / 50 * 100, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        The largest drop from peak to trough. Lower is better.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Profit Factor</span>
                        <Badge 
                          variant="outline"
                          className={
                            riskMetrics.profitFactor > 2
                              ? 'bg-green-50 text-green-700 border-green-200' 
                              : riskMetrics.profitFactor > 1
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }
                        >
                          {riskMetrics.profitFactor.toFixed(2)}
                        </Badge>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${Math.min(riskMetrics.profitFactor / 4 * 100, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Ratio of gross profits to gross losses. Higher is better.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Volatility</span>
                        <Badge 
                          variant="outline"
                          className={
                            riskMetrics.volatility < 15
                              ? 'bg-green-50 text-green-700 border-green-200' 
                              : riskMetrics.volatility < 25
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }
                        >
                          {formatPercent(riskMetrics.volatility)}
                        </Badge>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-500 h-2 rounded-full" 
                          style={{ width: `${Math.min(riskMetrics.volatility / 40 * 100, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Standard deviation of returns. Lower typically indicates lower risk.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="rounded-md border p-4">
                  <h3 className="text-sm font-medium mb-4">Trade Analysis</h3>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Win Rate</span>
                      <Badge 
                        variant="outline"
                        className={
                          riskMetrics.winRate > 60
                            ? 'bg-green-50 text-green-700 border-green-200' 
                            : riskMetrics.winRate > 50
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }
                      >
                        {formatPercent(riskMetrics.winRate)}
                      </Badge>
                    </div>
                    
                    <div className="h-[100px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Winning Trades', value: riskMetrics.successfulTrades, color: '#10b981' },
                              { name: 'Losing Trades', value: riskMetrics.failedTrades, color: '#ef4444' }
                            ]}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={40}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {[
                              { name: 'Winning Trades', value: riskMetrics.successfulTrades, color: '#10b981' },
                              { name: 'Losing Trades', value: riskMetrics.failedTrades, color: '#ef4444' }
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <Separator />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Average Win</p>
                        <p className="text-lg font-bold text-green-600">{formatCurrency(riskMetrics.averageWin)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Average Loss</p>
                        <p className="text-lg font-bold text-red-600">{formatCurrency(riskMetrics.averageLoss)}</p>
                      </div>
                    </div>
                    
                    <div className="rounded-md bg-muted p-3">
                      <h4 className="text-xs font-medium mb-2">Risk Assessment</h4>
                      <p className="text-xs text-muted-foreground">
                        Current trading performance shows a positive risk-reward profile with a profit factor of {riskMetrics.profitFactor.toFixed(2)}.
                        The win rate of {formatPercent(riskMetrics.winRate)} combined with a positive average trade result indicates a sustainable strategy.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
