'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, 
  Search, 
  Calendar, 
  TrendingUp, 
  BarChart,
  Download,
  Share2
} from 'lucide-react';
import { BacktestResultsTable } from '@/components/backtesting/backtest-results-table';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { PerformanceChart } from '@/components/backtesting/performance-chart';
import { MetricsCard } from '@/components/backtesting/metrics-card';

export default function BacktestHistoryPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // UI states
  const [activeTab, setActiveTab] = useState('results');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStrategy, setSelectedStrategy] = useState<string>('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('all');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  
  // Results states
  const [backtestResults, setBacktestResults] = useState<any[]>([]);
  const [filteredResults, setFilteredResults] = useState<any[]>([]);
  const [selectedResults, setSelectedResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Strategy options
  const STRATEGY_OPTIONS = [
    { id: 'all', name: 'All Strategies' },
    { id: 'ai-adaptive-strategy', name: 'AI Adaptive Strategy' },
    { id: 'trend-following', name: 'Trend Following Strategy' },
    { id: 'mean-reversion', name: 'Mean Reversion Strategy' },
    { id: 'breakout', name: 'Breakout Strategy' },
  ];
  
  // Supported timeframes
  const TIMEFRAME_OPTIONS = [
    { value: 'all', label: 'All Timeframes' },
    { value: '1m', label: '1 Minute' },
    { value: '5m', label: '5 Minutes' },
    { value: '15m', label: '15 Minutes' },
    { value: '30m', label: '30 Minutes' },
    { value: '1h', label: '1 Hour' },
    { value: '4h', label: '4 Hours' },
    { value: '1d', label: '1 Day' },
  ];
  
  // Supported trading pairs
  const SYMBOL_OPTIONS = [
    { value: 'all', label: 'All Symbols' },
    { value: 'BTC/USDT', label: 'BTC/USDT' },
    { value: 'ETH/USDT', label: 'ETH/USDT' },
    { value: 'SOL/USDT', label: 'SOL/USDT' },
    { value: 'BNB/USDT', label: 'BNB/USDT' },
    { value: 'XRP/USDT', label: 'XRP/USDT' },
  ];
  
  // Fetch backtest results on mount
  useEffect(() => {
    fetchBacktestResults();
  }, []);
  
  // Apply filters when filter parameters change
  useEffect(() => {
    applyFilters();
  }, [backtestResults, searchQuery, selectedStrategy, selectedTimeframe, selectedSymbol, dateRange]);
  
  // Fetch all backtest results
  const fetchBacktestResults = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/elizaos/backtesting');
      const data = await response.json();
      
      if (data.success) {
        setBacktestResults(data.results);
        setFilteredResults(data.results);
      } else {
        console.error('Error fetching backtest results:', data.error);
        toast({
          title: 'Failed to load history',
          description: data.error || 'Could not load backtest history',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error fetching backtest results:', error);
      toast({
        title: 'Failed to load history',
        description: error.message || 'Could not load backtest history',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Apply filters to the results
  const applyFilters = () => {
    if (!backtestResults.length) return;
    
    let results = [...backtestResults];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      results = results.filter(result => 
        result.strategyId.toLowerCase().includes(query) ||
        result.strategyName?.toLowerCase().includes(query) ||
        result.symbols.some((symbol: string) => symbol.toLowerCase().includes(query))
      );
    }
    
    // Apply strategy filter
    if (selectedStrategy !== 'all') {
      results = results.filter(result => result.strategyId === selectedStrategy);
    }
    
    // Apply timeframe filter
    if (selectedTimeframe !== 'all') {
      results = results.filter(result => result.timeframes.includes(selectedTimeframe));
    }
    
    // Apply symbol filter
    if (selectedSymbol !== 'all') {
      results = results.filter(result => result.symbols.includes(selectedSymbol));
    }
    
    // Apply date range filter
    if (dateRange.from) {
      results = results.filter(result => new Date(result.startTime) >= dateRange.from!);
    }
    if (dateRange.to) {
      results = results.filter(result => new Date(result.startTime) <= dateRange.to!);
    }
    
    setFilteredResults(results);
  };
  
  // Handle result selection for comparison
  const toggleResultSelection = (resultId: string) => {
    setSelectedResults(prev => {
      if (prev.includes(resultId)) {
        return prev.filter(id => id !== resultId);
      } else {
        // Limit to max 3 selections for comparison
        if (prev.length >= 3) {
          toast({
            title: 'Selection limit reached',
            description: 'You can compare up to 3 backtest results',
          });
          return prev;
        }
        return [...prev, resultId];
      }
    });
  };
  
  // Get the selected backtest results for comparison
  const getSelectedBacktests = () => {
    return filteredResults.filter(result => selectedResults.includes(result.id));
  };
  
  // Reset all filters
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedStrategy('all');
    setSelectedTimeframe('all');
    setSelectedSymbol('all');
    setDateRange({ from: undefined, to: undefined });
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/backtesting')}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Backtesting
          </Button>
          
          <h1 className="text-3xl font-bold flex items-center">
            <BarChart className="mr-2 h-8 w-8 text-primary" />
            Backtest History
          </h1>
          <p className="text-muted-foreground mt-1">
            View, filter, and compare past backtest results
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {selectedResults.length > 0 && (
            <>
              <Button
                variant="outline"
                onClick={() => setActiveTab('compare')}
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                Compare Selected ({selectedResults.length})
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setSelectedResults([])}
              >
                Clear Selection
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* Filters */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle>Filter Results</CardTitle>
          <CardDescription>
            Narrow down results by strategy, timeframe, symbol, or date range
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="search" className="mb-2 block">
                Search
              </Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="strategy" className="mb-2 block">
                Strategy
              </Label>
              <Select
                value={selectedStrategy}
                onValueChange={setSelectedStrategy}
              >
                <SelectTrigger id="strategy">
                  <SelectValue placeholder="Select strategy" />
                </SelectTrigger>
                <SelectContent>
                  {STRATEGY_OPTIONS.map(option => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="timeframe" className="mb-2 block">
                Timeframe
              </Label>
              <Select
                value={selectedTimeframe}
                onValueChange={setSelectedTimeframe}
              >
                <SelectTrigger id="timeframe">
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEFRAME_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="symbol" className="mb-2 block">
                Symbol
              </Label>
              <Select
                value={selectedSymbol}
                onValueChange={setSelectedSymbol}
              >
                <SelectTrigger id="symbol">
                  <SelectValue placeholder="Select symbol" />
                </SelectTrigger>
                <SelectContent>
                  {SYMBOL_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="mb-2 block">
                Date Range
              </Label>
              <DateRangePicker
                from={dateRange.from}
                to={dateRange.to}
                onSelect={setDateRange}
              />
            </div>
          </div>
          
          <div className="flex justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              {filteredResults.length} results found
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
            >
              Reset Filters
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger 
            value="compare"
            disabled={selectedResults.length === 0}
          >
            Compare ({selectedResults.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle>Backtest Results</CardTitle>
              <CardDescription>
                Select up to 3 backtests to compare performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="bg-muted rounded-md p-2 text-sm flex items-center justify-between">
                  <div className="flex items-center">
                    <Checkbox id="select-all" className="mr-2" />
                    <Label htmlFor="select-all">Select all results</Label>
                  </div>
                  <div>
                    {selectedResults.length > 0 && (
                      <span className="text-muted-foreground">
                        {selectedResults.length} selected
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                {filteredResults.map(result => (
                  <div 
                    key={result.id}
                    className={`border rounded-md p-4 ${
                      selectedResults.includes(result.id)
                        ? 'border-primary bg-primary/5'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id={`select-${result.id}`}
                          checked={selectedResults.includes(result.id)}
                          onCheckedChange={() => toggleResultSelection(result.id)}
                        />
                        
                        <div>
                          <div className="font-medium">
                            {result.strategyName || result.strategyId}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(result.startTime).toLocaleDateString()} - {new Date(result.endTime).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Symbols: {result.symbols.join(', ')} • Timeframe: {result.timeframes.join(', ')}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`font-medium ${
                          result.profitPercent >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {result.profitPercent.toFixed(2)}%
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {result.trades} trades • Win rate: {((result.winningTrades / result.trades) * 100).toFixed(1)}%
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Initial: ${result.initialCapital.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // Navigate to backtest details
                          router.push(`/dashboard/backtesting?id=${result.id}`);
                        }}
                      >
                        View Details
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          toast({
                            title: 'Export not implemented',
                            description: 'Export functionality is coming soon',
                          });
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {filteredResults.length === 0 && !isLoading && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-2">No results match your filters</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetFilters}
                    >
                      Clear Filters
                    </Button>
                  </div>
                )}
                
                {isLoading && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Loading results...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="compare">
          {selectedResults.length > 0 ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Comparison</CardTitle>
                  <CardDescription>
                    Comparing {selectedResults.length} selected backtest results
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    {/* This would be a comparison chart comparing the selected backtests */}
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">Performance comparison chart</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {getSelectedBacktests().map(result => (
                  <Card key={result.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{result.strategyName || result.strategyId}</CardTitle>
                      <CardDescription>
                        {new Date(result.startTime).toLocaleDateString()} - {new Date(result.endTime).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <MetricsCard
                        title="Performance Metrics"
                        metrics={[
                          { label: 'Total Return', value: `${result.profitPercent.toFixed(2)}%` },
                          { label: 'Win Rate', value: `${((result.winningTrades / result.trades) * 100).toFixed(1)}%` },
                          { label: 'Profit Factor', value: result.metadata?.performanceMetrics?.profitFactor?.toFixed(2) || 'N/A' },
                          { label: 'Max Drawdown', value: `${result.maxDrawdownPercent.toFixed(2)}%` },
                          { label: 'Sharpe Ratio', value: result.sharpeRatio?.toFixed(2) || 'N/A' },
                          { label: 'Total Trades', value: result.trades },
                        ]}
                      />
                      
                      <div className="mt-4 flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            router.push(`/dashboard/backtesting?id=${result.id}`);
                          }}
                        >
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Comparison Table</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Metric</th>
                          {getSelectedBacktests().map(result => (
                            <th key={result.id} className="text-left p-2">
                              {result.strategyName || result.strategyId}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="p-2">Total Return</td>
                          {getSelectedBacktests().map(result => (
                            <td key={result.id} className={`p-2 ${
                              result.profitPercent >= 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {result.profitPercent.toFixed(2)}%
                            </td>
                          ))}
                        </tr>
                        
                        <tr className="border-b">
                          <td className="p-2">Win Rate</td>
                          {getSelectedBacktests().map(result => (
                            <td key={result.id} className="p-2">
                              {((result.winningTrades / result.trades) * 100).toFixed(1)}%
                            </td>
                          ))}
                        </tr>
                        
                        <tr className="border-b">
                          <td className="p-2">Profit Factor</td>
                          {getSelectedBacktests().map(result => (
                            <td key={result.id} className="p-2">
                              {result.metadata?.performanceMetrics?.profitFactor?.toFixed(2) || 'N/A'}
                            </td>
                          ))}
                        </tr>
                        
                        <tr className="border-b">
                          <td className="p-2">Max Drawdown</td>
                          {getSelectedBacktests().map(result => (
                            <td key={result.id} className="p-2 text-red-500">
                              {result.maxDrawdownPercent.toFixed(2)}%
                            </td>
                          ))}
                        </tr>
                        
                        <tr className="border-b">
                          <td className="p-2">Sharpe Ratio</td>
                          {getSelectedBacktests().map(result => (
                            <td key={result.id} className="p-2">
                              {result.sharpeRatio?.toFixed(2) || 'N/A'}
                            </td>
                          ))}
                        </tr>
                        
                        <tr className="border-b">
                          <td className="p-2">Total Trades</td>
                          {getSelectedBacktests().map(result => (
                            <td key={result.id} className="p-2">
                              {result.trades}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground mb-4">
                  Select backtest results to compare
                </p>
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('results')}
                >
                  Go to Results
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
