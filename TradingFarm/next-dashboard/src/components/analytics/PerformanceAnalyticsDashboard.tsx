"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { usePerformanceData } from '@/hooks/use-performance-data';

/**
 * Performance Analytics Dashboard component
 * 
 * Displays comprehensive performance metrics, equity curve visualization,
 * and strategy comparison tools.
 */
export interface PerformanceAnalyticsDashboardProps {
  userId: number;
  timeRange?: 'day' | 'week' | 'month' | 'year' | 'all';
}

export function PerformanceAnalyticsDashboard({ 
  userId, 
  timeRange = 'month' 
}: PerformanceAnalyticsDashboardProps) {
  // State
  const [selectedTab, setSelectedTab] = useState<string>('overview');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>(timeRange);
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>([]);
  
  // Fetch performance data
  const { 
    equityCurveData, 
    performanceMetrics, 
    drawdownData, 
    tradeDistribution,
    strategyPerformance,
    isLoading,
    error
  } = usePerformanceData(userId, selectedTimeframe as any);
  
  // Chart colors
  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444'];
  
  // Format percentage for display
  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };
  
  // Format currency for display
  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  // Prepare data for strategy comparison
  const strategyComparisonData = useMemo(() => {
    if (!strategyPerformance || strategyPerformance.length === 0) {
      return [];
    }
    
    // If no strategies are selected, use all strategies
    const strategiesToUse = 
      selectedStrategies.length > 0 
        ? strategyPerformance.filter(s => selectedStrategies.includes(s.id))
        : strategyPerformance.slice(0, 5); // Show top 5 by default
    
    // Transform data for comparison chart
    return strategiesToUse.map(strategy => ({
      name: strategy.name,
      return: strategy.totalReturn,
      sharpe: strategy.sharpeRatio,
      drawdown: strategy.maxDrawdown,
      winRate: strategy.winRate * 100
    }));
  }, [strategyPerformance, selectedStrategies]);
  
  return (
    <div className="space-y-4">
      {/* Time Range Selection */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Performance Analytics</h2>
        <Select 
          value={selectedTimeframe} 
          onValueChange={setSelectedTimeframe}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Performance Metrics Summary */}
      {performanceMetrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Total Return</div>
              <div className={`text-2xl font-bold ${performanceMetrics.totalReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatPercent(performanceMetrics.totalReturn)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Sharpe Ratio</div>
              <div className="text-2xl font-bold">
                {performanceMetrics.sharpeRatio.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Max Drawdown</div>
              <div className="text-2xl font-bold text-red-500">
                {formatPercent(performanceMetrics.maxDrawdown)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Win Rate</div>
              <div className="text-2xl font-bold">
                {formatPercent(performanceMetrics.winRate * 100)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trades">Trades</TabsTrigger>
          <TabsTrigger value="drawdown">Drawdown</TabsTrigger>
          <TabsTrigger value="strategies">Strategies</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Equity Curve */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Equity Curve</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {equityCurveData && equityCurveData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={equityCurveData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(date) => {
                          const d = new Date(date);
                          return d.toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          });
                        }}
                      />
                      <YAxis 
                        tickFormatter={(value) => `$${value.toLocaleString()}`}
                      />
                      <Tooltip 
                        formatter={(value) => [formatCurrency(value as number), 'Equity']}
                        labelFormatter={(date) => new Date(date).toLocaleDateString('en-US', { 
                          year: 'numeric',
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="equity" 
                        stroke="#10b981" 
                        fill="#10b98133"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    {isLoading ? 'Loading equity data...' : 'No equity data available'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Performance Metrics Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Trading Activity */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Trading Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {performanceMetrics && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-sm text-muted-foreground">Total Trades</div>
                        <div className="text-xl font-semibold">{performanceMetrics.totalTrades}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Winning Trades</div>
                        <div className="text-xl font-semibold text-green-500">{performanceMetrics.winningTrades}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Losing Trades</div>
                        <div className="text-xl font-semibold text-red-500">{performanceMetrics.losingTrades}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Avg Holding Time</div>
                        <div className="text-xl font-semibold">{performanceMetrics.avgHoldingTime}</div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Profit Factor</div>
                      <div className="flex items-center space-x-2">
                        <div className="text-xl font-semibold">{performanceMetrics.profitFactor.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">(Gross Profit / Gross Loss)</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Profit Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Profit Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-52">
                  {tradeDistribution && tradeDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={tradeDistribution}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {tradeDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      {isLoading ? 'Loading distribution data...' : 'No trade distribution data available'}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Trades Tab */}
        <TabsContent value="trades" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Trade Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {performanceMetrics && performanceMetrics.monthlyReturns ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={performanceMetrics.monthlyReturns}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => `${value}%`} />
                      <Tooltip 
                        formatter={(value) => [`${value}%`, 'Return']}
                        labelFormatter={(label) => `Month: ${label}`}
                      />
                      <Bar 
                        dataKey="return" 
                        name="Monthly Return" 
                        fill="#10b981"
                        color={({ return: value }) => (value >= 0 ? '#10b981' : '#ef4444')}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    {isLoading ? 'Loading trade data...' : 'No monthly return data available'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Additional trade metrics would go here */}
        </TabsContent>
        
        {/* Drawdown Tab */}
        <TabsContent value="drawdown" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Drawdown Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {drawdownData && drawdownData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={drawdownData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(date) => {
                          const d = new Date(date);
                          return d.toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          });
                        }}
                      />
                      <YAxis 
                        tickFormatter={(value) => `${value}%`}
                      />
                      <Tooltip 
                        formatter={(value) => [`${value}%`, 'Drawdown']}
                        labelFormatter={(date) => new Date(date).toLocaleDateString('en-US', { 
                          year: 'numeric',
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="drawdown" 
                        stroke="#ef4444" 
                        fill="#ef444433"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    {isLoading ? 'Loading drawdown data...' : 'No drawdown data available'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Additional drawdown metrics would go here */}
        </TabsContent>
        
        {/* Strategies Tab */}
        <TabsContent value="strategies" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Strategy Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {strategyComparisonData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={strategyComparisonData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 50, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(value) => `${value}%`} />
                      <YAxis type="category" dataKey="name" />
                      <Tooltip formatter={(value) => [`${value}%`, 'Return']} />
                      <Legend />
                      <Bar dataKey="return" name="Return %" fill="#10b981" />
                      <Bar dataKey="winRate" name="Win Rate %" fill="#3b82f6" />
                      <Bar dataKey="drawdown" name="Max Drawdown %" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    {isLoading ? 'Loading strategy data...' : 'No strategy comparison data available'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Strategy selection would go here */}
        </TabsContent>
      </Tabs>
    </div>
  );
}
