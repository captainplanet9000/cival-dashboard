"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { 
  TrendingUp, TrendingDown, BarChart2, LineChart as LineChartIcon, 
  PieChart as PieChartIcon, Activity, DollarSign, PercentIcon
} from "lucide-react";

interface AgentPerformanceMetricsProps {
  agentId?: string;
  simulationId?: string;
  metrics?: {
    totalReturn: number;
    winRate: number;
    maxDrawdown: number;
    sharpeRatio: number;
    trades: number;
    profitFactor: number;
    averageTrade: number;
    equity: number[];
    tradeResults: ('win' | 'loss')[];
    longShortRatio: {
      long: number;
      short: number;
    };
  };
}

export function AgentPerformanceMetrics({
  agentId,
  simulationId,
  metrics
}: AgentPerformanceMetricsProps) {
  // Default metrics if none provided
  const defaultMetrics = {
    totalReturn: 18.7,
    winRate: 62.5,
    maxDrawdown: 12.3,
    sharpeRatio: 1.8,
    trades: 24,
    profitFactor: 2.1,
    averageTrade: 0.78,
    equity: Array.from({ length: 30 }, (_, i) => ({
      time: i,
      value: 10000 * (1 + (Math.sin(i / 5) * 0.02 + i * 0.01))
    })),
    tradeResults: Array.from({ length: 24 }, (_, i) => 
      Math.random() > 0.375 ? 'win' : 'loss'
    ) as ('win' | 'loss')[],
    longShortRatio: {
      long: 16,
      short: 8
    }
  };

  // Use provided metrics or defaults
  const performanceMetrics = metrics || defaultMetrics;

  // Calculate trade distribution
  const wins = performanceMetrics.tradeResults.filter(result => result === 'win').length;
  const losses = performanceMetrics.tradeResults.filter(result => result === 'loss').length;
  
  // Calculate consecutive wins/losses
  let currentStreak = 1;
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  
  for (let i = 1; i < performanceMetrics.tradeResults.length; i++) {
    if (performanceMetrics.tradeResults[i] === performanceMetrics.tradeResults[i - 1]) {
      currentStreak++;
    } else {
      if (performanceMetrics.tradeResults[i - 1] === 'win') {
        maxWinStreak = Math.max(maxWinStreak, currentStreak);
      } else {
        maxLossStreak = Math.max(maxLossStreak, currentStreak);
      }
      currentStreak = 1;
    }
  }
  
  // Update final streak
  if (performanceMetrics.tradeResults.length > 0) {
    if (performanceMetrics.tradeResults[performanceMetrics.tradeResults.length - 1] === 'win') {
      maxWinStreak = Math.max(maxWinStreak, currentStreak);
    } else {
      maxLossStreak = Math.max(maxLossStreak, currentStreak);
    }
  }
  
  // Prepare trade distribution data for pie chart
  const tradeDistributionData = [
    { name: 'Wins', value: wins, color: '#10b981' },
    { name: 'Losses', value: losses, color: '#ef4444' }
  ];
  
  // Prepare position type data for pie chart
  const positionTypeData = [
    { name: 'Long', value: performanceMetrics.longShortRatio.long, color: '#2563eb' },
    { name: 'Short', value: performanceMetrics.longShortRatio.short, color: '#9333ea' }
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Agent Performance Metrics</CardTitle>
        <CardDescription>
          Real-time performance statistics for the simulated agent
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Total Return</span>
                <Badge
                  variant="outline"
                  className={performanceMetrics.totalReturn >= 0 ? "text-green-600" : "text-red-600"}
                >
                  {performanceMetrics.totalReturn >= 0 ? <TrendingUp className="h-3.5 w-3.5 mr-1" /> : <TrendingDown className="h-3.5 w-3.5 mr-1" />}
                  {performanceMetrics.totalReturn}%
                </Badge>
              </div>
              <Progress 
                value={Math.min(Math.abs(performanceMetrics.totalReturn) * 2, 100)} 
                className={`h-2 ${performanceMetrics.totalReturn >= 0 ? "bg-green-100" : "bg-red-100"}`}
              />
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Win Rate</span>
                <span className="font-medium">{performanceMetrics.winRate}%</span>
              </div>
              <Progress value={performanceMetrics.winRate} className="h-2" />
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Max Drawdown</span>
                <span className="font-medium text-red-600">-{performanceMetrics.maxDrawdown}%</span>
              </div>
              <Progress value={performanceMetrics.maxDrawdown} className="h-2 bg-red-100" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col justify-center items-center p-2 bg-muted/40 rounded-md">
              <DollarSign className="h-4 w-4 mb-1 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Profit Factor</span>
              <span className="text-lg font-medium">{performanceMetrics.profitFactor.toFixed(2)}</span>
            </div>
            
            <div className="flex flex-col justify-center items-center p-2 bg-muted/40 rounded-md">
              <Activity className="h-4 w-4 mb-1 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Sharpe Ratio</span>
              <span className="text-lg font-medium">{performanceMetrics.sharpeRatio.toFixed(2)}</span>
            </div>
            
            <div className="flex flex-col justify-center items-center p-2 bg-muted/40 rounded-md">
              <PercentIcon className="h-4 w-4 mb-1 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Avg Trade</span>
              <span className="text-lg font-medium">
                {performanceMetrics.averageTrade >= 0 ? '+' : ''}
                {performanceMetrics.averageTrade.toFixed(2)}%
              </span>
            </div>
            
            <div className="flex flex-col justify-center items-center p-2 bg-muted/40 rounded-md">
              <BarChart2 className="h-4 w-4 mb-1 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Trades</span>
              <span className="text-lg font-medium">{performanceMetrics.trades}</span>
            </div>
          </div>
        </div>
        
        <Tabs defaultValue="equity">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="equity" className="text-xs">
              <LineChartIcon className="h-3.5 w-3.5 mr-1" />
              Equity Curve
            </TabsTrigger>
            <TabsTrigger value="distribution" className="text-xs">
              <PieChartIcon className="h-3.5 w-3.5 mr-1" />
              Trade Distribution
            </TabsTrigger>
            <TabsTrigger value="streak" className="text-xs">
              <BarChart2 className="h-3.5 w-3.5 mr-1" />
              Trade Streaks
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="equity" className="mt-3">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={performanceMetrics.equity}
                  margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="time" 
                    tickFormatter={(value) => `${value}`}
                  />
                  <YAxis 
                    tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                  />
                  <Tooltip 
                    formatter={(value: any) => [`$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 'Equity']}
                    labelFormatter={(value) => `Trade ${value}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#2563eb" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="distribution" className="mt-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="h-[200px]">
                <div className="text-xs font-medium text-center mb-2">Win/Loss Distribution</div>
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie
                      data={tradeDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {tradeDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name) => [`${value} trades`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="h-[200px]">
                <div className="text-xs font-medium text-center mb-2">Position Types</div>
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie
                      data={positionTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {positionTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name) => [`${value} trades`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="streak" className="mt-3">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Max Win Streak', value: maxWinStreak, color: '#10b981' },
                    { name: 'Max Loss Streak', value: maxLossStreak, color: '#ef4444' },
                    { name: 'Avg Trade Size', value: performanceMetrics.averageTrade * 100, color: '#2563eb' },
                    { name: 'Profit per Trade', value: performanceMetrics.totalReturn / performanceMetrics.trades, color: '#f59e0b' }
                  ]}
                  margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name, props) => {
                      if (name === 'Max Win Streak' || name === 'Max Loss Streak') {
                        return [`${value} trades`, name];
                      }
                      return [`${value.toFixed(2)}%`, name];
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    name="Value"
                  >
                    {[
                      { name: 'Max Win Streak', value: maxWinStreak, color: '#10b981' },
                      { name: 'Max Loss Streak', value: maxLossStreak, color: '#ef4444' },
                      { name: 'Avg Trade Size', value: performanceMetrics.averageTrade * 100, color: '#2563eb' },
                      { name: 'Profit per Trade', value: performanceMetrics.totalReturn / performanceMetrics.trades, color: '#f59e0b' }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
