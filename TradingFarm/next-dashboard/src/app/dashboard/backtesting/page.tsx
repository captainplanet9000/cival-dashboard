'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { 
  LineChart, 
  BarChart, 
  Play, 
  Settings, 
  Save, 
  History, 
  TrendingUp,
  Download,
  Share2,
  Loader2
} from 'lucide-react';
import { useSocket } from '@/providers/socket-provider';
import { BacktestResultsTable } from '@/components/backtesting/backtest-results-table';
import { BacktestParametersForm } from '@/components/backtesting/backtest-parameters-form';
import { PerformanceChart } from '@/components/backtesting/performance-chart';
import { MetricsCard } from '@/components/backtesting/metrics-card';

// Mock data for strategy templates
const STRATEGY_TEMPLATES = [
  { id: 'ai-adaptive-strategy', name: 'AI Adaptive Strategy' },
  { id: 'trend-following', name: 'Trend Following Strategy' },
  { id: 'mean-reversion', name: 'Mean Reversion Strategy' },
  { id: 'breakout', name: 'Breakout Strategy' },
];

// Supported timeframes
const TIMEFRAMES = [
  { value: '1m', label: '1 Minute' },
  { value: '5m', label: '5 Minutes' },
  { value: '15m', label: '15 Minutes' },
  { value: '30m', label: '30 Minutes' },
  { value: '1h', label: '1 Hour' },
  { value: '4h', label: '4 Hours' },
  { value: '1d', label: '1 Day' },
];

// Supported trading pairs
const TRADING_PAIRS = [
  { value: 'BTC/USDT', label: 'BTC/USDT' },
  { value: 'ETH/USDT', label: 'ETH/USDT' },
  { value: 'SOL/USDT', label: 'SOL/USDT' },
  { value: 'BNB/USDT', label: 'BNB/USDT' },
  { value: 'XRP/USDT', label: 'XRP/USDT' },
];

export default function BacktestingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { isConnected, latestMessages } = useSocket();
  
  // UI State
  const [activeTab, setActiveTab] = useState('parameters');
  const [selectedStrategy, setSelectedStrategy] = useState(STRATEGY_TEMPLATES[0]);
  
  // Backtest parameters
  const [backtestParams, setBacktestParams] = useState({
    strategyId: STRATEGY_TEMPLATES[0].id,
    strategyParams: {
      timeframe: '1h',
      symbols: ['BTC/USDT'],
      risk: {
        maxPositionSize: 5,
        maxDrawdown: 2,
        stopLossPercent: 2,
        takeProfitPercent: 4,
      },
      parameters: {
        indicatorWeights: {
          trend: 0.4,
          momentum: 0.3,
          volatility: 0.2,
          volume: 0.1,
        },
      },
    },
    startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days ago
    endDate: new Date().toISOString().split('T')[0], // Today
    symbols: ['BTC/USDT'],
    timeframes: ['1h'],
    initialCapital: 10000,
    feesPercentage: 0.1,
    slippagePercentage: 0.05,
    executionDelay: 1000, // 1 second delay
  });
  
  // Results state
  const [isRunning, setIsRunning] = useState(false);
  const [backtestResults, setBacktestResults] = useState<any[]>([]);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  
  // Load previous backtest results on mount
  useEffect(() => {
    fetchBacktestResults();
  }, []);
  
  // Listen for backtest completed events
  useEffect(() => {
    const backtestCompleted = latestMessages?.BACKTEST_COMPLETED;
    if (backtestCompleted) {
      setIsRunning(false);
      toast({
        title: 'Backtest Completed',
        description: `Profit: ${backtestCompleted.profitPercent.toFixed(2)}%`,
      });
      fetchBacktestResults();
    }
    
    const backtestStarted = latestMessages?.BACKTEST_STARTED;
    if (backtestStarted) {
      toast({
        title: 'Backtest Started',
        description: 'Processing your backtest request...',
      });
    }
  }, [latestMessages, toast]);
  
  // Fetch previous backtest results
  const fetchBacktestResults = async () => {
    try {
      const response = await fetch(`/api/elizaos/backtesting?strategyId=${backtestParams.strategyId}`);
      const data = await response.json();
      
      if (data.success) {
        setBacktestResults(data.results);
        // Select the most recent result if available
        if (data.results.length > 0 && !selectedResult) {
          setSelectedResult(data.results[0]);
        }
      } else {
        console.error('Error fetching backtest results:', data.error);
      }
    } catch (error) {
      console.error('Error fetching backtest results:', error);
    }
  };
  
  // Run a new backtest
  const runBacktest = async () => {
    try {
      setIsRunning(true);
      
      const response = await fetch('/api/elizaos/backtesting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(backtestParams),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to run backtest');
      }
      
      // Switch to results tab
      setActiveTab('results');
      
      // Result will be updated via WebSocket notification
    } catch (error: any) {
      console.error('Error running backtest:', error);
      setIsRunning(false);
      
      toast({
        title: 'Backtest Failed',
        description: error.message || 'An error occurred while running the backtest',
        variant: 'destructive',
      });
    }
  };
  
  // Handle parameter changes
  const handleParamChange = (key: string, value: any) => {
    setBacktestParams(prev => ({
      ...prev,
      [key]: value,
    }));
  };
  
  // Handle strategy parameter changes
  const handleStrategyParamChange = (path: string[], value: any) => {
    setBacktestParams(prev => {
      const newParams = { ...prev };
      let current: any = newParams.strategyParams;
      
      // Navigate to the nested property
      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) {
          current[path[i]] = {};
        }
        current = current[path[i]];
      }
      
      // Set the value
      current[path[path.length - 1]] = value;
      
      return newParams;
    });
  };
  
  // Select a backtest result
  const selectResult = (result: any) => {
    setSelectedResult(result);
    setActiveTab('analysis');
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <LineChart className="mr-2 h-8 w-8 text-primary" />
            Strategy Backtesting
          </h1>
          <p className="text-muted-foreground mt-1">
            Test trading strategies with historical data and optimize performance
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/strategies')}
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            Strategies
          </Button>
          
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/backtesting/history')}
          >
            <History className="mr-2 h-4 w-4" />
            History
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3 space-y-6">
          {/* Strategy Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Strategy Template</CardTitle>
              <CardDescription>Select a strategy to backtest</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={backtestParams.strategyId}
                onValueChange={(value) => {
                  handleParamChange('strategyId', value);
                  // Find the corresponding strategy template
                  const strategy = STRATEGY_TEMPLATES.find(s => s.id === value);
                  if (strategy) {
                    setSelectedStrategy(strategy);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a strategy" />
                </SelectTrigger>
                <SelectContent>
                  {STRATEGY_TEMPLATES.map(strategy => (
                    <SelectItem key={strategy.id} value={strategy.id}>
                      {strategy.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="mt-4">
                <Label>Description</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedStrategy.id === 'ai-adaptive-strategy'
                    ? 'An adaptive strategy that uses AI to combine multiple technical indicators with dynamic weights based on market conditions.'
                    : `${selectedStrategy.name} - A predefined strategy template for backtesting.`}
                </p>
              </div>
            </CardContent>
          </Card>
          
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full"
                onClick={runBacktest}
                disabled={isRunning || !isConnected}
              >
                {isRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run Backtest
                  </>
                )}
              </Button>
              
              <Button variant="outline" className="w-full">
                <Save className="mr-2 h-4 w-4" />
                Save Parameters
              </Button>
              
              {selectedResult && (
                <>
                  <Button variant="outline" className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Export Results
                  </Button>
                  
                  <Button variant="outline" className="w-full">
                    <Share2 className="mr-2 h-4 w-4" />
                    Share Report
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
          
          {/* Recent Results */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Results</CardTitle>
              <CardDescription>
                Last {Math.min(backtestResults.length, 5)} backtest runs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {backtestResults.length > 0 ? (
                <div className="space-y-2">
                  {backtestResults.slice(0, 5).map((result) => (
                    <div
                      key={result.id}
                      className={`p-2 rounded-md cursor-pointer flex justify-between items-center ${
                        selectedResult?.id === result.id
                          ? 'bg-primary/10'
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => selectResult(result)}
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {new Date(result.startTime).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {result.trades} trades
                        </p>
                      </div>
                      <div className={`text-sm font-medium ${
                        result.profitPercent >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {result.profitPercent.toFixed(2)}%
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No backtest results yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-9">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="parameters">Parameters</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
            </TabsList>
            
            <TabsContent value="parameters" className="space-y-4 pt-4">
              <BacktestParametersForm
                parameters={backtestParams}
                onParamChange={handleParamChange}
                onStrategyParamChange={handleStrategyParamChange}
                timeframeOptions={TIMEFRAMES}
                symbolOptions={TRADING_PAIRS}
              />
            </TabsContent>
            
            <TabsContent value="results" className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Backtest Results</CardTitle>
                  <CardDescription>
                    View detailed results of your backtest runs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BacktestResultsTable
                    results={backtestResults}
                    onSelectResult={selectResult}
                    selectedResultId={selectedResult?.id}
                    isLoading={isRunning}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="analysis" className="space-y-4 pt-4">
              {selectedResult ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <MetricsCard
                      title="Performance"
                      metrics={[
                        { label: 'Total Return', value: `${selectedResult.profitPercent.toFixed(2)}%` },
                        { label: 'Profit', value: `$${selectedResult.profit.toFixed(2)}` },
                        { label: 'Max Drawdown', value: `${selectedResult.maxDrawdownPercent.toFixed(2)}%` },
                      ]}
                    />
                    
                    <MetricsCard
                      title="Trade Statistics"
                      metrics={[
                        { label: 'Total Trades', value: selectedResult.trades },
                        { label: 'Win Rate', value: `${((selectedResult.winningTrades / selectedResult.trades) * 100).toFixed(2)}%` },
                        { label: 'Profit Factor', value: selectedResult.metadata?.performanceMetrics?.profitFactor?.toFixed(2) || 'N/A' },
                      ]}
                    />
                    
                    <MetricsCard
                      title="Risk Metrics"
                      metrics={[
                        { label: 'Sharpe Ratio', value: selectedResult.sharpeRatio?.toFixed(2) || 'N/A' },
                        { label: 'Sortino Ratio', value: selectedResult.sortinoRatio?.toFixed(2) || 'N/A' },
                        { label: 'Calmar Ratio', value: selectedResult.metadata?.performanceMetrics?.calmarRatio?.toFixed(2) || 'N/A' },
                      ]}
                    />
                  </div>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Equity Curve</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[400px]">
                      <PerformanceChart
                        equityCurve={selectedResult.metadata?.equityCurve || []}
                        initialCapital={selectedResult.initialCapital}
                      />
                    </CardContent>
                  </Card>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Monthly Returns</CardTitle>
                      </CardHeader>
                      <CardContent className="h-[300px]">
                        {/* Monthly returns chart would go here */}
                        <div className="flex items-center justify-center h-full">
                          <p className="text-muted-foreground">Monthly returns chart</p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>Drawdown Analysis</CardTitle>
                      </CardHeader>
                      <CardContent className="h-[300px]">
                        {/* Drawdown chart would go here */}
                        <div className="flex items-center justify-center h-full">
                          <p className="text-muted-foreground">Drawdown chart</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">
                      Select a backtest result to view detailed analysis
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
