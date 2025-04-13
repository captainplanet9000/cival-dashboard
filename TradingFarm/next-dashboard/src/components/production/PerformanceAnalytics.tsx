"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  LineChart,
  Calendar,
  Download,
  BarChart2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calculator,
  Clock
} from "lucide-react";
import { 
  LineChart as RechartsLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from "recharts";

export function PerformanceAnalytics() {
  // State
  const [timeframe, setTimeframe] = useState("30d");
  const [selectedAgent, setSelectedAgent] = useState("all");
  
  // Mock performance data
  const performanceData = [
    { date: "2025-03-14", equity: 225000, pl: 1250, trades: 8, success: 5 },
    { date: "2025-03-15", equity: 227500, pl: 2500, trades: 12, success: 8 },
    { date: "2025-03-16", equity: 228750, pl: 1250, trades: 6, success: 4 },
    { date: "2025-03-17", equity: 231250, pl: 2500, trades: 10, success: 7 },
    { date: "2025-03-18", equity: 229500, pl: -1750, trades: 9, success: 3 },
    { date: "2025-03-19", equity: 230750, pl: 1250, trades: 7, success: 5 },
    { date: "2025-03-20", equity: 233000, pl: 2250, trades: 11, success: 8 },
    { date: "2025-03-21", equity: 231500, pl: -1500, trades: 8, success: 3 },
    { date: "2025-03-22", equity: 234000, pl: 2500, trades: 10, success: 7 },
    { date: "2025-03-23", equity: 235500, pl: 1500, trades: 6, success: 4 },
    { date: "2025-03-24", equity: 238000, pl: 2500, trades: 12, success: 9 },
    { date: "2025-03-25", equity: 236500, pl: -1500, trades: 9, success: 4 },
    { date: "2025-03-26", equity: 238000, pl: 1500, trades: 7, success: 5 },
    { date: "2025-03-27", equity: 239500, pl: 1500, trades: 8, success: 6 },
    { date: "2025-03-28", equity: 236000, pl: -3500, trades: 11, success: 4 },
    { date: "2025-03-29", equity: 238500, pl: 2500, trades: 9, success: 7 },
    { date: "2025-03-30", equity: 241000, pl: 2500, trades: 10, success: 8 },
    { date: "2025-03-31", equity: 242250, pl: 1250, trades: 6, success: 4 },
    { date: "2025-04-01", equity: 244750, pl: 2500, trades: 12, success: 9 },
    { date: "2025-04-02", equity: 243500, pl: -1250, trades: 8, success: 4 },
    { date: "2025-04-03", equity: 241000, pl: -2500, trades: 10, success: 3 },
    { date: "2025-04-04", equity: 243500, pl: 2500, trades: 9, success: 7 },
    { date: "2025-04-05", equity: 245750, pl: 2250, trades: 11, success: 8 },
    { date: "2025-04-06", equity: 244500, pl: -1250, trades: 7, success: 3 },
    { date: "2025-04-07", equity: 246750, pl: 2250, trades: 10, success: 7 },
    { date: "2025-04-08", equity: 248000, pl: 1250, trades: 6, success: 4 },
    { date: "2025-04-09", equity: 247000, pl: -1000, trades: 8, success: 3 },
    { date: "2025-04-10", equity: 245000, pl: -2000, trades: 9, success: 3 },
    { date: "2025-04-11", equity: 247500, pl: 2500, trades: 12, success: 9 },
    { date: "2025-04-12", equity: 248500, pl: 1000, trades: 7, success: 5 }
  ];
  
  // Agent performance data
  const agentPerformance = [
    { name: "Momentum Trader", trades: 95, winRate: 68.4, profit: 12500, sharpe: 1.42, maxDD: 2.8 },
    { name: "Mean Reversion", trades: 82, winRate: 62.2, profit: 8750, sharpe: 1.38, maxDD: 3.6 },
    { name: "Volatility Harvester", trades: 65, winRate: 58.5, profit: 2750, sharpe: 0.92, maxDD: 4.2 }
  ];
  
  // Asset allocation data
  const assetAllocation = [
    { name: "BTC", value: 35 },
    { name: "ETH", value: 25 },
    { name: "SOL", value: 15 },
    { name: "XRP", value: 10 },
    { name: "ADA", value: 8 },
    { name: "Other", value: 7 }
  ];
  
  // Trading stats summary
  const tradingStats = {
    totalTrades: 242,
    winRate: 64.5,
    profitFactor: 1.82,
    averageWin: 1458,
    averageLoss: 875,
    largestWin: 3500,
    largestLoss: 2800,
    profitableDays: 21,
    unprofitableDays: 9,
    maxConsecutiveWins: 6,
    maxConsecutiveLosses: 2
  };
  
  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  
  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };
  
  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  // Filter data based on timeframe
  const getFilteredData = () => {
    const days = timeframe === "7d" ? 7 : 
                 timeframe === "30d" ? 30 : 
                 timeframe === "90d" ? 90 : 30;
    
    return performanceData.slice(-days);
  };
  
  // Filtered performance data
  const filteredData = getFilteredData();
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Performance Analytics</h2>
          <p className="text-muted-foreground">
            Comprehensive analysis of live trading performance
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Select
            value={timeframe}
            onValueChange={setTimeframe}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
            </SelectContent>
          </Select>
          
          <Select
            value={selectedAgent}
            onValueChange={setSelectedAgent}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents</SelectItem>
              <SelectItem value="momentum">Momentum Trader</SelectItem>
              <SelectItem value="reversion">Mean Reversion</SelectItem>
              <SelectItem value="volatility">Volatility Harvester</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Portfolio Value</CardTitle>
            <CardDescription>Current total value</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(filteredData[filteredData.length - 1].equity)}</div>
            <div className="flex items-center text-green-500 text-sm">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span>+{formatCurrency(filteredData[filteredData.length - 1].equity - filteredData[0].equity)} (+{((filteredData[filteredData.length - 1].equity / filteredData[0].equity - 1) * 100).toFixed(1)}%)</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Total P&L</CardTitle>
            <CardDescription>Period profit/loss</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{formatCurrency(filteredData.reduce((sum, day) => sum + day.pl, 0))}</div>
            <div className="flex items-center text-green-500 text-sm">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span>+{((filteredData.reduce((sum, day) => sum + day.pl, 0) / filteredData[0].equity) * 100).toFixed(1)}% return</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Win Rate</CardTitle>
            <CardDescription>Successful trades</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(filteredData.reduce((sum, day) => sum + day.success, 0) / filteredData.reduce((sum, day) => sum + day.trades, 0) * 100)}</div>
            <div className="flex items-center text-muted-foreground text-sm">
              <Calculator className="h-4 w-4 mr-1" />
              <span>{filteredData.reduce((sum, day) => sum + day.success, 0)} of {filteredData.reduce((sum, day) => sum + day.trades, 0)} trades</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Trading Volume</CardTitle>
            <CardDescription>Period activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredData.reduce((sum, day) => sum + day.trades, 0)} trades</div>
            <div className="flex items-center text-muted-foreground text-sm">
              <Clock className="h-4 w-4 mr-1" />
              <span>Avg {(filteredData.reduce((sum, day) => sum + day.trades, 0) / filteredData.length).toFixed(1)}/day</span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="equity">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="equity">
            <LineChart className="h-4 w-4 mr-2" />
            Equity Curve
          </TabsTrigger>
          <TabsTrigger value="pl">
            <BarChart className="h-4 w-4 mr-2" />
            Daily P&L
          </TabsTrigger>
          <TabsTrigger value="agents">
            <BarChart2 className="h-4 w-4 mr-2" />
            Agent Performance
          </TabsTrigger>
          <TabsTrigger value="allocation">
            <Calendar className="h-4 w-4 mr-2" />
            Asset Allocation
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="equity" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Equity Curve</CardTitle>
              <CardDescription>
                Historical portfolio value over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart
                    data={filteredData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate} 
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      tickFormatter={(value) => formatCurrency(value)} 
                      domain={['dataMin - 5000', 'dataMax + 5000']}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      formatter={(value: any) => [formatCurrency(value), "Equity"]}
                      labelFormatter={(label) => {
                        const date = new Date(label);
                        return date.toLocaleDateString();
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="equity" 
                      stroke="#3b82f6" 
                      activeDot={{ r: 8 }} 
                      strokeWidth={2}
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="pl" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Profit/Loss</CardTitle>
              <CardDescription>
                Daily trading results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={filteredData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate} 
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      tickFormatter={(value) => formatCurrency(value)} 
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      formatter={(value: any) => [formatCurrency(value), "P&L"]}
                      labelFormatter={(label) => {
                        const date = new Date(label);
                        return date.toLocaleDateString();
                      }}
                    />
                    <Bar 
                      dataKey="pl" 
                      fill={(data) => data.pl >= 0 ? "#22c55e" : "#ef4444"} 
                      name="Daily P&L"
                      radius={[4, 4, 0, 0]}
                    >
                      {filteredData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.pl >= 0 ? "#22c55e" : "#ef4444"} />
                      ))}
                    </Bar>
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="agents" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Performance Comparison</CardTitle>
              <CardDescription>
                Performance metrics by trading agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart
                    data={agentPerformance}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={120} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="profit" fill="#3b82f6" name="Total Profit ($)" />
                    <Bar dataKey="winRate" fill="#22c55e" name="Win Rate (%)" />
                    <Bar dataKey="trades" fill="#f59e0b" name="Number of Trades" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-6 grid grid-cols-3 gap-4">
                {agentPerformance.map((agent, index) => (
                  <Card key={index} className="bg-muted/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{agent.name}</CardTitle>
                      <CardDescription>{agent.trades} trades, {agent.winRate}% win rate</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <div className="text-2xl font-bold">{formatCurrency(agent.profit)}</div>
                      <div className="mt-2 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Sharpe Ratio:</span>
                          <span className="font-medium">{agent.sharpe.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Max Drawdown:</span>
                          <span className="font-medium">{agent.maxDD}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="allocation" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Asset Allocation</CardTitle>
              <CardDescription>
                Portfolio distribution by asset
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="h-[350px] flex items-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={assetAllocation}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={130}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {assetAllocation.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value}%`, 'Allocation']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-medium">Trading Statistics Summary</h3>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Trades:</span>
                      <span className="font-medium">{tradingStats.totalTrades}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Win Rate:</span>
                      <span className="font-medium">{tradingStats.winRate}%</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Profit Factor:</span>
                      <span className="font-medium">{tradingStats.profitFactor}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Average Win:</span>
                      <span className="font-medium">{formatCurrency(tradingStats.averageWin)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Average Loss:</span>
                      <span className="font-medium">{formatCurrency(tradingStats.averageLoss)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Largest Win:</span>
                      <span className="font-medium">{formatCurrency(tradingStats.largestWin)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Largest Loss:</span>
                      <span className="font-medium">{formatCurrency(tradingStats.largestLoss)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Profitable Days:</span>
                      <span className="font-medium">{tradingStats.profitableDays}/{tradingStats.profitableDays + tradingStats.unprofitableDays}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Consecutive Wins:</span>
                      <span className="font-medium">{tradingStats.maxConsecutiveWins}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Consecutive Losses:</span>
                      <span className="font-medium">{tradingStats.maxConsecutiveLosses}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
