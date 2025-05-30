'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, BarChart, Bar } from 'recharts';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { LazyComponent } from '@/components/lazy-component';
import { formatCurrency, formatPercentage } from '@/lib/formatters';

// Types for strategy performance data
interface StrategyPerformance {
  id: string;
  name: string;
  description: string;
  type: string;
  metrics: {
    totalReturn: number;
    annualizedReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    profitFactor: number;
    volatility: number;
    beta: number;
    alpha: number;
    averageTrade: number;
    tradesPerMonth: number;
  };
  returns: {
    date: string;
    value: number;
  }[];
  drawdowns: {
    date: string;
    value: number;
  }[];
  trades: {
    date: string;
    type: 'buy' | 'sell';
    price: number;
    size: number;
    profit: number;
    symbol: string;
  }[];
  monthlyReturns: {
    month: string;
    return: number;
  }[];
}

/**
 * Strategy Comparison Panel Component
 * 
 * Allows users to select and compare multiple trading strategies with various metrics and visualizations
 */
export function StrategyComparisonPanel() {
  // State for selected strategies and time period
  const [selectedStrategyIds, setSelectedStrategyIds] = useState<string[]>([]);
  const [timePeriod, setTimePeriod] = useState('1y');
  const [activeTab, setActiveTab] = useState('performance');
  const { toast } = useToast();
  
  // Fetch available strategies using React Query/tRPC
  const { data: allStrategies, isLoading: isLoadingStrategies } = trpc.strategies.list.useQuery();
  
  // Custom query to fetch comparison data for selected strategies
  const { data: comparisonData, isLoading: isLoadingComparison } = 
    trpc.strategies.comparePerformance.useQuery(
      { strategyIds: selectedStrategyIds, period: timePeriod },
      { enabled: selectedStrategyIds.length > 0 }
    );
  
  // Memoized filtered strategies based on selection
  const selectedStrategies = useMemo(() => {
    if (!comparisonData) return [];
    return comparisonData;
  }, [comparisonData]);
  
  // Handle strategy selection toggle
  const handleStrategyToggle = (strategyId: string) => {
    setSelectedStrategyIds(prev => {
      if (prev.includes(strategyId)) {
        return prev.filter(id => id !== strategyId);
      } else {
        // Limit to 5 strategies for comparison
        if (prev.length >= 5) {
          toast({
            title: "Maximum strategies reached",
            description: "You can compare up to 5 strategies at once",
            variant: "destructive"
          });
          return prev;
        }
        return [...prev, strategyId];
      }
    });
  };
  
  // Generate colors for each strategy
  const getStrategyColor = (index: number) => {
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe'];
    return colors[index % colors.length];
  };
  
  // Calculate aggregate comparison data
  const comparisonMetrics = useMemo(() => {
    if (!selectedStrategies || selectedStrategies.length === 0) return null;
    
    // Return metrics for comparison table
    return selectedStrategies.map(strategy => ({
      id: strategy.id,
      name: strategy.name,
      metrics: strategy.metrics
    }));
  }, [selectedStrategies]);
  
  // Performance chart data (combined for all selected strategies)
  const performanceChartData = useMemo(() => {
    if (!selectedStrategies || selectedStrategies.length === 0) return [];
    
    // Combine all returns data into a single dataset for the chart
    const allDates = new Set<string>();
    
    // Collect all unique dates
    selectedStrategies.forEach(strategy => {
      strategy.returns.forEach(point => {
        allDates.add(point.date);
      });
    });
    
    // Sort dates chronologically
    const sortedDates = Array.from(allDates).sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
    );
    
    // Create combined dataset with values for each strategy
    return sortedDates.map(date => {
      const dataPoint: Record<string, any> = { date };
      
      selectedStrategies.forEach(strategy => {
        const returnPoint = strategy.returns.find(r => r.date === date);
        dataPoint[strategy.name] = returnPoint ? returnPoint.value : null;
      });
      
      return dataPoint;
    });
  }, [selectedStrategies]);
  
  // Monthly returns data for bar chart
  const monthlyReturnsData = useMemo(() => {
    if (!selectedStrategies || selectedStrategies.length === 0) return [];
    
    // Get last 12 months of data
    const allMonths = new Set<string>();
    
    // Collect unique months
    selectedStrategies.forEach(strategy => {
      strategy.monthlyReturns.forEach(month => {
        allMonths.add(month.month);
      });
    });
    
    // Sort months chronologically
    const sortedMonths = Array.from(allMonths).sort((a, b) => {
      const [yearA, monthA] = a.split('-').map(Number);
      const [yearB, monthB] = b.split('-').map(Number);
      return (yearA * 12 + monthA) - (yearB * 12 + monthB);
    }).slice(-12); // Last 12 months
    
    // Create combined dataset
    return sortedMonths.map(month => {
      const dataPoint: Record<string, any> = { month };
      
      selectedStrategies.forEach(strategy => {
        const monthlyReturn = strategy.monthlyReturns.find(m => m.month === month);
        dataPoint[strategy.name] = monthlyReturn ? monthlyReturn.return * 100 : 0; // Convert to percentage
      });
      
      return dataPoint;
    });
  }, [selectedStrategies]);
  
  // Drawdown chart data
  const drawdownChartData = useMemo(() => {
    if (!selectedStrategies || selectedStrategies.length === 0) return [];
    
    // Combine all drawdown data
    const allDates = new Set<string>();
    
    // Collect unique dates
    selectedStrategies.forEach(strategy => {
      strategy.drawdowns.forEach(point => {
        allDates.add(point.date);
      });
    });
    
    // Sort dates chronologically
    const sortedDates = Array.from(allDates).sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
    );
    
    // Create combined dataset
    return sortedDates.map(date => {
      const dataPoint: Record<string, any> = { date };
      
      selectedStrategies.forEach(strategy => {
        const drawdownPoint = strategy.drawdowns.find(d => d.date === date);
        dataPoint[strategy.name] = drawdownPoint ? drawdownPoint.value * 100 : 0; // Convert to percentage
      });
      
      return dataPoint;
    });
  }, [selectedStrategies]);
  
  // Handle time period change
  const handleTimePeriodChange = (value: string) => {
    setTimePeriod(value);
  };
  
  // No strategies state
  if (isLoadingStrategies) {
    return (
      <Card className="w-full h-[800px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-muted-foreground">Loading strategies...</p>
      </Card>
    );
  }
  
  if (!allStrategies || allStrategies.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Strategy Comparison</CardTitle>
          <CardDescription>
            No strategies available for comparison
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-[400px]">
          <p className="text-muted-foreground text-center">
            Create trading strategies first to enable comparison
          </p>
          <Button className="mt-4" variant="outline" asChild>
            <a href="/strategies/create">Create Strategy</a>
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <CardTitle>Strategy Comparison</CardTitle>
            <CardDescription>
              Compare performance metrics across multiple trading strategies
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timePeriod} onValueChange={handleTimePeriodChange}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">1 Month</SelectItem>
                <SelectItem value="3m">3 Months</SelectItem>
                <SelectItem value="6m">6 Months</SelectItem>
                <SelectItem value="1y">1 Year</SelectItem>
                <SelectItem value="3y">3 Years</SelectItem>
                <SelectItem value="5y">5 Years</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={() => setSelectedStrategyIds([])}
              disabled={selectedStrategyIds.length === 0}
            >
              Clear Selection
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {/* Strategy Selection Panel */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-md">Select Strategies</CardTitle>
                <CardDescription>
                  Choose up to 5 strategies to compare
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-3">
                <ScrollArea className="h-[400px] pr-3">
                  <div className="space-y-4">
                    {allStrategies.map((strategy) => (
                      <div key={strategy.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`strategy-${strategy.id}`}
                          checked={selectedStrategyIds.includes(strategy.id)}
                          onCheckedChange={() => handleStrategyToggle(strategy.id)}
                        />
                        <label
                          htmlFor={`strategy-${strategy.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {strategy.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
              <CardFooter>
                <p className="text-xs text-muted-foreground">
                  {selectedStrategyIds.length} of 5 strategies selected
                </p>
              </CardFooter>
            </Card>
          </div>
          
          {/* Charts and Metrics Panel */}
          <div className="md:col-span-2 lg:col-span-3">
            {isLoadingComparison ? (
              <div className="h-[450px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2">Loading comparison data...</p>
              </div>
            ) : selectedStrategyIds.length === 0 ? (
              <div className="h-[450px] flex flex-col items-center justify-center">
                <p className="text-muted-foreground">Select strategies to compare</p>
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="performance">Performance</TabsTrigger>
                  <TabsTrigger value="returns">Monthly Returns</TabsTrigger>
                  <TabsTrigger value="drawdowns">Drawdowns</TabsTrigger>
                  <TabsTrigger value="metrics">Key Metrics</TabsTrigger>
                </TabsList>
                
                <TabsContent value="performance" className="mt-0">
                  <LazyComponent>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-md">Cumulative Performance</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[350px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={performanceChartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis 
                                dataKey="date" 
                                tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
                              />
                              <YAxis tickFormatter={(value) => `${value}%`} />
                              <Tooltip 
                                formatter={(value) => [`${Number(value).toFixed(2)}%`, '']}
                                labelFormatter={(date) => new Date(date).toLocaleDateString()}
                              />
                              <Legend />
                              <ReferenceLine y={0} stroke="#666" />
                              {selectedStrategies.map((strategy, idx) => (
                                <Line
                                  key={strategy.id}
                                  type="monotone"
                                  dataKey={strategy.name}
                                  stroke={getStrategyColor(idx)}
                                  activeDot={{ r: 8 }}
                                  connectNulls
                                />
                              ))}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </LazyComponent>
                </TabsContent>
                
                <TabsContent value="returns" className="mt-0">
                  <LazyComponent>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-md">Monthly Returns</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[350px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyReturnsData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis 
                                dataKey="month" 
                                tickFormatter={(monthStr) => {
                                  const [year, month] = monthStr.split('-');
                                  return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(month) - 1]} ${year.slice(2)}`;
                                }}
                              />
                              <YAxis tickFormatter={(value) => `${value}%`} />
                              <Tooltip 
                                formatter={(value) => [`${Number(value).toFixed(2)}%`, '']}
                                labelFormatter={(month) => {
                                  const [year, monthNum] = month.split('-');
                                  return `${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][Number(monthNum) - 1]} ${year}`;
                                }}
                              />
                              <Legend />
                              <ReferenceLine y={0} stroke="#666" />
                              {selectedStrategies.map((strategy, idx) => (
                                <Bar
                                  key={strategy.id}
                                  dataKey={strategy.name}
                                  fill={getStrategyColor(idx)}
                                />
                              ))}
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </LazyComponent>
                </TabsContent>
                
                <TabsContent value="drawdowns" className="mt-0">
                  <LazyComponent>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-md">Drawdowns</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[350px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={drawdownChartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis 
                                dataKey="date" 
                                tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
                              />
                              <YAxis tickFormatter={(value) => `${value}%`} />
                              <Tooltip 
                                formatter={(value) => [`${Number(value).toFixed(2)}%`, '']}
                                labelFormatter={(date) => new Date(date).toLocaleDateString()}
                              />
                              <Legend />
                              {selectedStrategies.map((strategy, idx) => (
                                <Line
                                  key={strategy.id}
                                  type="monotone"
                                  dataKey={strategy.name}
                                  stroke={getStrategyColor(idx)}
                                  connectNulls
                                />
                              ))}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </LazyComponent>
                </TabsContent>
                
                <TabsContent value="metrics" className="mt-0">
                  <LazyComponent>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-md">Key Performance Metrics</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {comparisonMetrics && (
                          <ScrollArea className="h-[350px]">
                            <div className="w-full">
                              <table className="w-full border-collapse">
                                <thead>
                                  <tr className="border-b">
                                    <th className="text-left p-2">Metric</th>
                                    {comparisonMetrics.map((strategy) => (
                                      <th key={strategy.id} className="text-center p-2">{strategy.name}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr className="border-b hover:bg-muted/50">
                                    <td className="p-2 font-medium">Total Return</td>
                                    {comparisonMetrics.map((strategy) => (
                                      <td key={strategy.id} className="text-center p-2">
                                        {formatPercentage(strategy.metrics.totalReturn)}
                                      </td>
                                    ))}
                                  </tr>
                                  <tr className="border-b hover:bg-muted/50">
                                    <td className="p-2 font-medium">Annualized Return</td>
                                    {comparisonMetrics.map((strategy) => (
                                      <td key={strategy.id} className="text-center p-2">
                                        {formatPercentage(strategy.metrics.annualizedReturn)}
                                      </td>
                                    ))}
                                  </tr>
                                  <tr className="border-b hover:bg-muted/50">
                                    <td className="p-2 font-medium">Sharpe Ratio</td>
                                    {comparisonMetrics.map((strategy) => (
                                      <td key={strategy.id} className="text-center p-2">
                                        {strategy.metrics.sharpeRatio.toFixed(2)}
                                      </td>
                                    ))}
                                  </tr>
                                  <tr className="border-b hover:bg-muted/50">
                                    <td className="p-2 font-medium">Max Drawdown</td>
                                    {comparisonMetrics.map((strategy) => (
                                      <td key={strategy.id} className="text-center p-2 text-destructive">
                                        {formatPercentage(strategy.metrics.maxDrawdown)}
                                      </td>
                                    ))}
                                  </tr>
                                  <tr className="border-b hover:bg-muted/50">
                                    <td className="p-2 font-medium">Win Rate</td>
                                    {comparisonMetrics.map((strategy) => (
                                      <td key={strategy.id} className="text-center p-2">
                                        {formatPercentage(strategy.metrics.winRate)}
                                      </td>
                                    ))}
                                  </tr>
                                  <tr className="border-b hover:bg-muted/50">
                                    <td className="p-2 font-medium">Profit Factor</td>
                                    {comparisonMetrics.map((strategy) => (
                                      <td key={strategy.id} className="text-center p-2">
                                        {strategy.metrics.profitFactor.toFixed(2)}
                                      </td>
                                    ))}
                                  </tr>
                                  <tr className="border-b hover:bg-muted/50">
                                    <td className="p-2 font-medium">Volatility</td>
                                    {comparisonMetrics.map((strategy) => (
                                      <td key={strategy.id} className="text-center p-2">
                                        {formatPercentage(strategy.metrics.volatility)}
                                      </td>
                                    ))}
                                  </tr>
                                  <tr className="border-b hover:bg-muted/50">
                                    <td className="p-2 font-medium">Alpha</td>
                                    {comparisonMetrics.map((strategy) => (
                                      <td key={strategy.id} className="text-center p-2">
                                        {formatPercentage(strategy.metrics.alpha)}
                                      </td>
                                    ))}
                                  </tr>
                                  <tr className="border-b hover:bg-muted/50">
                                    <td className="p-2 font-medium">Beta</td>
                                    {comparisonMetrics.map((strategy) => (
                                      <td key={strategy.id} className="text-center p-2">
                                        {strategy.metrics.beta.toFixed(2)}
                                      </td>
                                    ))}
                                  </tr>
                                  <tr className="border-b hover:bg-muted/50">
                                    <td className="p-2 font-medium">Avg. Trade</td>
                                    {comparisonMetrics.map((strategy) => (
                                      <td key={strategy.id} className="text-center p-2">
                                        {formatCurrency(strategy.metrics.averageTrade)}
                                      </td>
                                    ))}
                                  </tr>
                                  <tr className="hover:bg-muted/50">
                                    <td className="p-2 font-medium">Trades/Month</td>
                                    {comparisonMetrics.map((strategy) => (
                                      <td key={strategy.id} className="text-center p-2">
                                        {strategy.metrics.tradesPerMonth.toFixed(1)}
                                      </td>
                                    ))}
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </ScrollArea>
                        )}
                      </CardContent>
                    </Card>
                  </LazyComponent>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-t pt-4">
        <div className="text-sm text-muted-foreground">
          Data shown for {timePeriod === 'all' ? 'all time' : timePeriod} period
        </div>
        <Button variant="outline" className="mt-2 sm:mt-0" asChild>
          <a href="/strategies">
            Manage Strategies
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}
