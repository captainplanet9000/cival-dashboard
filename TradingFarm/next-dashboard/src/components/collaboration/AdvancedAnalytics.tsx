"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart2, 
  PieChart, 
  LineChart, 
  Calendar, 
  Download, 
  Filter, 
  Share2,
  Clock,
  TrendingUp,
  TrendingDown,
  Layers,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Target
} from "lucide-react";
import { 
  Area, 
  AreaChart, 
  Bar, 
  BarChart, 
  CartesianGrid, 
  Legend, 
  Line, 
  LineChart as RechartLine, 
  Pie, 
  PieChart as RechartPie, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis 
} from "recharts";

export function AdvancedAnalytics() {
  // State for filters
  const [selectedTimeframe, setSelectedTimeframe] = useState("30d");
  const [selectedStrategy, setSelectedStrategy] = useState("all");
  const [selectedAsset, setSelectedAsset] = useState("all");
  
  // Mock data for performance overview
  const performanceData = {
    trades: 325,
    winRate: 67.4,
    profitFactor: 2.15,
    expectancy: 1.32,
    avgProfit: 430.28,
    avgLoss: -215.64,
    netProfit: 85820.45,
    maxDrawdown: 12.8,
    sharpeRatio: 1.86,
    sortinoRatio: 2.31,
    winningTrades: 219,
    losingTrades: 106
  };
  
  // Mock data for profit over time chart
  const profitData = [
    { date: "Apr 01", profit: 0 },
    { date: "Apr 02", profit: 1250 },
    { date: "Apr 03", profit: 2840 },
    { date: "Apr 04", profit: 2360 },
    { date: "Apr 05", profit: 4820 },
    { date: "Apr 06", profit: 5940 },
    { date: "Apr 07", profit: 9250 },
    { date: "Apr 08", profit: 12380 },
    { date: "Apr 09", profit: 11850 },
    { date: "Apr 10", profit: 14520 },
    { date: "Apr 11", profit: 18940 },
    { date: "Apr 12", profit: 24650 },
    { date: "Apr 13", profit: 28420 },
    { date: "Apr 14", profit: 32180 },
    { date: "Apr 15", profit: 38920 },
    { date: "Apr 16", profit: 43650 },
    { date: "Apr 17", profit: 42850 },
    { date: "Apr 18", profit: 46320 },
    { date: "Apr 19", profit: 51840 },
    { date: "Apr 20", profit: 54920 },
    { date: "Apr 21", profit: 52450 },
    { date: "Apr 22", profit: 56820 },
    { date: "Apr 23", profit: 62380 },
    { date: "Apr 24", profit: 67840 },
    { date: "Apr 25", profit: 72450 },
    { date: "Apr 26", profit: 75920 },
    { date: "Apr 27", profit: 80540 },
    { date: "Apr 28", profit: 82380 },
    { date: "Apr 29", profit: 84220 },
    { date: "Apr 30", profit: 85820 }
  ];
  
  // Mock data for trade distribution by asset chart
  const assetDistributionData = [
    { name: "BTC", value: 125, fill: "#0066FF" },
    { name: "ETH", value: 82, fill: "#6A30FF" },
    { name: "SOL", value: 56, fill: "#FB40FF" },
    { name: "XRP", value: 28, fill: "#FF5733" },
    { name: "DOGE", value: 23, fill: "#FFD700" },
    { name: "Others", value: 11, fill: "#9ca3af" }
  ];
  
  // Mock data for win/loss by time of day
  const timeOfDayData = [
    { hour: "00:00", wins: 8, losses: 3 },
    { hour: "02:00", wins: 5, losses: 2 },
    { hour: "04:00", wins: 4, losses: 5 },
    { hour: "06:00", wins: 12, losses: 3 },
    { hour: "08:00", wins: 18, losses: 6 },
    { hour: "10:00", wins: 25, losses: 8 },
    { hour: "12:00", wins: 20, losses: 12 },
    { hour: "14:00", wins: 32, losses: 14 },
    { hour: "16:00", wins: 28, losses: 15 },
    { hour: "18:00", wins: 24, losses: 10 },
    { hour: "20:00", wins: 22, losses: 16 },
    { hour: "22:00", wins: 21, losses: 12 }
  ];
  
  // Mock data for strategies comparison
  const strategyComparisonData = [
    { name: "Momentum Breakout", winRate: 72.3, profitFactor: 2.48, avgReturn: 1.82, trades: 94 },
    { name: "Mean Reversion", winRate: 68.9, profitFactor: 2.15, avgReturn: 1.34, trades: 87 },
    { name: "Volatility Expansion", winRate: 62.5, profitFactor: 1.95, avgReturn: 1.65, trades: 72 },
    { name: "VWAP Deviation", winRate: 75.1, profitFactor: 2.35, avgReturn: 1.12, trades: 52 },
    { name: "Order Flow Imbalance", winRate: 58.8, profitFactor: 1.76, avgReturn: 1.98, trades: 20 }
  ];
  
  // Mock data for monthly performance
  const monthlyPerformanceData = [
    { month: "Jan", profit: 35640, drawdown: 8.2 },
    { month: "Feb", profit: 28950, drawdown: 10.4 },
    { month: "Mar", profit: 42380, drawdown: 7.6 },
    { month: "Apr", profit: 85820, drawdown: 12.8 }
  ];
  
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
  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };
  
  // Mock recent trades data
  const recentTrades = [
    { 
      id: "trade-325", 
      asset: "BTC/USD", 
      type: "long", 
      entryPrice: 68245.32, 
      exitPrice: 69380.45, 
      profit: 1135.13, 
      profitPercentage: 1.66, 
      strategy: "Momentum Breakout", 
      date: "2025-04-30T14:23:15Z",
      status: "win"
    },
    { 
      id: "trade-324", 
      asset: "ETH/USD", 
      type: "short", 
      entryPrice: 3845.65, 
      exitPrice: 3792.18, 
      profit: 53.47, 
      profitPercentage: 1.39, 
      strategy: "Mean Reversion", 
      date: "2025-04-30T12:45:32Z",
      status: "win"
    },
    { 
      id: "trade-323", 
      asset: "SOL/USD", 
      type: "long", 
      entryPrice: 152.38, 
      exitPrice: 148.92, 
      profit: -3.46, 
      profitPercentage: -2.27, 
      strategy: "VWAP Deviation", 
      date: "2025-04-29T22:18:45Z",
      status: "loss"
    },
    { 
      id: "trade-322", 
      asset: "BTC/USD", 
      type: "short", 
      entryPrice: 67320.45, 
      exitPrice: 66845.23, 
      profit: 475.22, 
      profitPercentage: 0.71, 
      strategy: "Volatility Expansion", 
      date: "2025-04-29T18:52:08Z",
      status: "win"
    },
    { 
      id: "trade-321", 
      asset: "ETH/USD", 
      type: "long", 
      entryPrice: 3780.22, 
      exitPrice: 3845.65, 
      profit: 65.43, 
      profitPercentage: 1.73, 
      strategy: "Momentum Breakout", 
      date: "2025-04-29T15:34:27Z",
      status: "win"
    }
  ];
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Advanced Analytics</h2>
          <p className="text-muted-foreground">
            Deep statistical analysis of trading performance
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
          <Button variant="outline">
            <Share2 className="h-4 w-4 mr-2" />
            Share Report
          </Button>
        </div>
      </div>
      
      <div className="flex gap-4 items-center">
        <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
          <SelectTrigger className="w-[160px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="ytd">Year to date</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={selectedStrategy} onValueChange={setSelectedStrategy}>
          <SelectTrigger className="w-[200px]">
            <Layers className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Select strategy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All strategies</SelectItem>
            <SelectItem value="momentum-breakout">Momentum Breakout</SelectItem>
            <SelectItem value="mean-reversion">Mean Reversion</SelectItem>
            <SelectItem value="volatility-expansion">Volatility Expansion</SelectItem>
            <SelectItem value="vwap-deviation">VWAP Deviation</SelectItem>
            <SelectItem value="order-flow">Order Flow Imbalance</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={selectedAsset} onValueChange={setSelectedAsset}>
          <SelectTrigger className="w-[160px]">
            <Target className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Select asset" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All assets</SelectItem>
            <SelectItem value="btc">BTC/USD</SelectItem>
            <SelectItem value="eth">ETH/USD</SelectItem>
            <SelectItem value="sol">SOL/USD</SelectItem>
            <SelectItem value="xrp">XRP/USD</SelectItem>
            <SelectItem value="doge">DOGE/USD</SelectItem>
          </SelectContent>
        </Select>
        
        <Button variant="outline" size="icon" className="ml-auto">
          <Filter className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Net Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {formatCurrency(performanceData.netProfit)}
            </div>
            <div className="flex items-center text-sm text-green-500">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              <span>+24.8% from previous period</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(performanceData.winRate)}
            </div>
            <div className="flex items-center text-sm text-green-500">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              <span>+3.2% from previous period</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Profit Factor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performanceData.profitFactor.toFixed(2)}
            </div>
            <div className="flex items-center text-sm text-green-500">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              <span>+0.35 from previous period</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Max Drawdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">
              {formatPercentage(performanceData.maxDrawdown)}
            </div>
            <div className="flex items-center text-sm text-red-500">
              <ArrowDownRight className="h-4 w-4 mr-1" />
              <span>+1.4% from previous period</span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-12 gap-6">
        <Card className="col-span-8">
          <CardHeader>
            <CardTitle>Profit Growth</CardTitle>
            <CardDescription>Cumulative profit over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={profitData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0066FF" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#0066FF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} />
                <CartesianGrid strokeDasharray="3 3" />
                <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Profit']} />
                <Area 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#0066FF" 
                  fillOpacity={1} 
                  fill="url(#profitGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Trade Distribution</CardTitle>
            <CardDescription>Trades by asset</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartPie>
                <Pie
                  data={assetDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                />
                <Tooltip formatter={(value) => [`${value} trades`, 'Count']} />
              </RechartPie>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">
            <LineChart className="h-4 w-4 mr-2" />
            Performance Metrics
          </TabsTrigger>
          <TabsTrigger value="trades">
            <BarChart2 className="h-4 w-4 mr-2" />
            Trade Analysis
          </TabsTrigger>
          <TabsTrigger value="strategies">
            <Layers className="h-4 w-4 mr-2" />
            Strategy Comparison
          </TabsTrigger>
          <TabsTrigger value="journal">
            <Clock className="h-4 w-4 mr-2" />
            Trade Journal
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Key trading statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Trades</span>
                    <span className="font-medium">{performanceData.trades}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Winning Trades</span>
                    <span className="font-medium text-green-500">{performanceData.winningTrades}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Losing Trades</span>
                    <span className="font-medium text-red-500">{performanceData.losingTrades}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Win Rate</span>
                    <span className="font-medium">{formatPercentage(performanceData.winRate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Profit Factor</span>
                    <span className="font-medium">{performanceData.profitFactor.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expectancy</span>
                    <span className="font-medium">${performanceData.expectancy.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Average Win</span>
                    <span className="font-medium text-green-500">${performanceData.avgProfit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Average Loss</span>
                    <span className="font-medium text-red-500">${performanceData.avgLoss.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Drawdown</span>
                    <span className="font-medium">{formatPercentage(performanceData.maxDrawdown)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sharpe Ratio</span>
                    <span className="font-medium">{performanceData.sharpeRatio.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sortino Ratio</span>
                    <span className="font-medium">{performanceData.sortinoRatio.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Monthly Performance</CardTitle>
                <CardDescription>Profit and drawdown by month</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={monthlyPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" orientation="left" tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${value}%`} />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'profit' ? `$${Number(value).toLocaleString()}` : `${value}%`, 
                        name === 'profit' ? 'Profit' : 'Max Drawdown'
                      ]} 
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="profit" fill="#0066FF" name="Profit" />
                    <Bar yAxisId="right" dataKey="drawdown" fill="#f87171" name="Max Drawdown" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Time of Day Analysis</CardTitle>
                <CardDescription>Win/loss by hour of day</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={timeOfDayData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="wins" fill="#10b981" name="Wins" />
                    <Bar dataKey="losses" fill="#f87171" name="Losses" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="trades" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Trades</CardTitle>
              <CardDescription>Last 5 executed trades</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentTrades.map((trade) => (
                  <Card key={trade.id} className="overflow-hidden">
                    <div className="flex items-center p-4">
                      <div className={`h-10 w-1 rounded-full ${trade.status === 'win' ? 'bg-green-500' : 'bg-red-500'} mr-4`}></div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{trade.asset}</div>
                            <div className="text-xs text-muted-foreground">
                              {trade.strategy} • {formatDate(trade.date)}
                            </div>
                          </div>
                          <div className="flex items-center">
                            <Badge variant={trade.type === 'long' ? 'default' : 'destructive'}>
                              {trade.type === 'long' ? 'LONG' : 'SHORT'}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center mt-2 text-sm">
                          <div className="flex gap-4">
                            <div>
                              <span className="text-muted-foreground">Entry: </span>
                              <span className="font-medium">${trade.entryPrice.toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Exit: </span>
                              <span className="font-medium">${trade.exitPrice.toFixed(2)}</span>
                            </div>
                          </div>
                          <div className={`font-medium ${trade.profit > 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {trade.profit > 0 ? '+' : ''}{formatCurrency(trade.profit)} ({trade.profit > 0 ? '+' : ''}{trade.profitPercentage.toFixed(2)}%)
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="strategies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Strategy Comparison</CardTitle>
              <CardDescription>Performance metrics by strategy</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 font-medium">Strategy</th>
                      <th className="text-center py-3 font-medium">Win Rate</th>
                      <th className="text-center py-3 font-medium">Profit Factor</th>
                      <th className="text-center py-3 font-medium">Avg Return</th>
                      <th className="text-center py-3 font-medium">Trades</th>
                    </tr>
                  </thead>
                  <tbody>
                    {strategyComparisonData.map((strat, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-3">{strat.name}</td>
                        <td className="text-center py-3">{formatPercentage(strat.winRate)}</td>
                        <td className="text-center py-3">{strat.profitFactor.toFixed(2)}</td>
                        <td className="text-center py-3 text-green-500">+{formatPercentage(strat.avgReturn)}</td>
                        <td className="text-center py-3">{strat.trades}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="journal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trading Journal</CardTitle>
              <CardDescription>Notes and insights from your trading</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground space-y-2">
                <Clock className="h-12 w-12 mx-auto opacity-20" />
                <p>Trading journal functionality coming soon</p>
                <p className="text-sm">This feature will allow you to record observations and insights about your trading performance.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
