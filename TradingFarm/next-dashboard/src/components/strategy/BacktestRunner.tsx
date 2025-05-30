'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Play, Download, BarChart3, Info } from 'lucide-react';
import { StrategyFactory } from '@/lib/strategy/strategy-factory';
import { StrategyInstance, StrategyMeta, BacktestResult, Timeframe } from '@/lib/strategy/types';
import { createBrowserClient } from '@/utils/supabase/client';
import BacktestResultsChart from './BacktestResultsChart';
import BacktestPerformanceMetrics from './BacktestPerformanceMetrics';
import BacktestTradesTable from './BacktestTradesTable';

interface BacktestRunnerProps {
  strategyId?: string; // Optional: if provided, pre-selects the strategy
}

export default function BacktestRunner({ strategyId }: BacktestRunnerProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [userStrategies, setUserStrategies] = useState<StrategyInstance[]>([]);
  const [riskProfiles, setRiskProfiles] = useState<any[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningBacktest, setRunningBacktest] = useState(false);
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [previousBacktests, setPreviousBacktests] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    initialCapital: 10000,
    startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
    endDate: new Date(),
    timeframe: Timeframe.D1,
    riskProfileId: '',
    commission: 0.1, // 0.1%
    slippage: 0.05, // 0.05%
  });
  
  const supabase = createBrowserClient();
  const strategyFactory = new StrategyFactory();
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get user ID
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');
        setUserId(user.id);

        // Fetch user's strategies
        const strategies = await strategyFactory.getUserStrategies(user.id);
        setUserStrategies(strategies);

        // Fetch risk profiles
        const { data: riskProfilesData, error: riskProfilesError } = await supabase
          .from('risk_profiles')
          .select('*')
          .eq('user_id', user.id);

        if (riskProfilesError) throw riskProfilesError;
        setRiskProfiles(riskProfilesData);

        // Set default risk profile (if any exists)
        const defaultProfile = riskProfilesData.find(p => p.is_default);
        if (defaultProfile) {
          setFormData(prev => ({ ...prev, riskProfileId: defaultProfile.id }));
        }

        // If strategyId is provided, select it
        if (strategyId) {
          const strategy = strategies.find(s => s.id === strategyId);
          if (strategy) {
            setSelectedStrategy(strategy);
          }
        }

        // Fetch previous backtests
        await fetchPreviousBacktests(user.id, strategyId);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load necessary data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [strategyId]);

  const fetchPreviousBacktests = async (userId: string, strategyId?: string) => {
    try {
      let query = supabase
        .from('backtest_results')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (strategyId) {
        query = query.eq('strategy_id', strategyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPreviousBacktests(data || []);
    } catch (error) {
      console.error('Error fetching previous backtests:', error);
    }
  };

  const handleStrategyChange = (id: string) => {
    const strategy = userStrategies.find(s => s.id === id);
    setSelectedStrategy(strategy || null);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRunBacktest = async () => {
    if (!selectedStrategy || !userId) return;

    try {
      setRunningBacktest(true);
      toast({
        title: 'Backtest Started',
        description: 'Running backtest simulation...',
      });

      const result = await strategyFactory.runBacktest(
        selectedStrategy.strategyId,
        selectedStrategy.parameters,
        selectedStrategy.symbols,
        formData.startDate.toISOString(),
        formData.endDate.toISOString(),
        formData.initialCapital,
        formData.timeframe,
        formData.riskProfileId || undefined
      );

      setBacktestResult(result);
      await fetchPreviousBacktests(userId, selectedStrategy.id);

      toast({
        title: 'Backtest Complete',
        description: `Successfully completed backtest with ${result.trades.length} trades`,
      });
    } catch (error) {
      console.error('Error running backtest:', error);
      toast({
        title: 'Backtest Failed',
        description: 'An error occurred while running the backtest',
        variant: 'destructive',
      });
    } finally {
      setRunningBacktest(false);
    }
  };

  const handleDownloadResults = () => {
    if (!backtestResult) return;

    // Create a JSON blob and download it
    const blob = new Blob([JSON.stringify(backtestResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backtest-${backtestResult.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLoadPreviousBacktest = async (backtestId: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('backtest_results')
        .select('*')
        .eq('id', backtestId)
        .single();
      
      if (error) throw error;
      
      // Format the data to match the BacktestResult type
      const result: BacktestResult = {
        id: data.id,
        config: {
          strategyId: data.strategy_id,
          parameters: data.parameters,
          symbols: data.symbols,
          startDate: data.start_date,
          endDate: data.end_date,
          initialCapital: data.initial_capital,
          timeframe: data.timeframe as Timeframe,
          commission: 0.1,
          slippage: 0.05,
          includeFees: true,
          riskProfile: data.risk_profile || undefined
        },
        performance: data.result.performance,
        trades: data.result.trades,
        signals: data.result.signals,
        createdAt: data.created_at,
        completedAt: data.updated_at,
        status: data.status,
        errorMessage: data.error_message
      };
      
      setBacktestResult(result);
      
      toast({
        title: 'Backtest Loaded',
        description: 'Successfully loaded previous backtest results',
      });
    } catch (error) {
      console.error('Error loading backtest:', error);
      toast({
        title: 'Error',
        description: 'Failed to load backtest results',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    return (
      selectedStrategy &&
      formData.initialCapital > 0 &&
      formData.startDate < formData.endDate
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Strategy Backtester</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Backtest Configuration */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Backtest Configuration</CardTitle>
            <CardDescription>Configure and run your backtests</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="strategy">Strategy</Label>
                  <Select
                    value={selectedStrategy?.id || ''}
                    onValueChange={handleStrategyChange}
                    disabled={!!strategyId} // Disable if strategy is pre-selected
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a strategy" />
                    </SelectTrigger>
                    <SelectContent>
                      {userStrategies.map(strategy => (
                        <SelectItem key={strategy.id} value={strategy.id}>
                          {strategy.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedStrategy && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="initialCapital">Initial Capital</Label>
                      <Input
                        id="initialCapital"
                        type="number"
                        value={formData.initialCapital}
                        onChange={e => handleInputChange('initialCapital', parseFloat(e.target.value))}
                        min={100}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button 
                              variant="outline" 
                              className="w-full justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {format(formData.startDate, 'PP')}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={formData.startDate}
                              onSelect={date => date && handleInputChange('startDate', date)}
                              initialFocus
                              disabled={date => date > new Date() || date > formData.endDate}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label>End Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button 
                              variant="outline" 
                              className="w-full justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {format(formData.endDate, 'PP')}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={formData.endDate}
                              onSelect={date => date && handleInputChange('endDate', date)}
                              initialFocus
                              disabled={date => date > new Date() || date < formData.startDate}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="timeframe">Timeframe</Label>
                      <Select
                        value={formData.timeframe}
                        onValueChange={val => handleInputChange('timeframe', val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select timeframe" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(Timeframe).map(tf => (
                            <SelectItem key={tf} value={tf}>
                              {tf}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="riskProfile">Risk Profile</Label>
                      <Select
                        value={formData.riskProfileId}
                        onValueChange={val => handleInputChange('riskProfileId', val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select risk profile" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Default Profile</SelectItem>
                          {riskProfiles.map(profile => (
                            <SelectItem key={profile.id} value={profile.id}>
                              {profile.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="commission">Commission (%)</Label>
                        <span className="text-xs text-muted-foreground">{formData.commission}%</span>
                      </div>
                      <Input
                        id="commission"
                        type="number"
                        value={formData.commission}
                        onChange={e => handleInputChange('commission', parseFloat(e.target.value))}
                        min={0}
                        max={5}
                        step={0.01}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="slippage">Slippage (%)</Label>
                        <span className="text-xs text-muted-foreground">{formData.slippage}%</span>
                      </div>
                      <Input
                        id="slippage"
                        type="number"
                        value={formData.slippage}
                        onChange={e => handleInputChange('slippage', parseFloat(e.target.value))}
                        min={0}
                        max={5}
                        step={0.01}
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full"
              onClick={handleRunBacktest}
              disabled={!isFormValid() || runningBacktest || loading}
            >
              {runningBacktest ? 'Running...' : 'Run Backtest'}
              {!runningBacktest && <Play className="ml-2 h-4 w-4" />}
            </Button>
          </CardFooter>
        </Card>

        {/* Backtest Results */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Backtest Results</CardTitle>
            <CardDescription>
              Performance metrics and trade analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {runningBacktest ? (
              <div className="flex flex-col items-center justify-center p-12">
                <Skeleton className="h-[200px] w-full mb-4" />
                <p className="text-muted-foreground">Running backtest, please wait...</p>
              </div>
            ) : backtestResult ? (
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="w-full justify-start px-6 pt-2">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="equity">Equity Curve</TabsTrigger>
                  <TabsTrigger value="trades">Trades</TabsTrigger>
                  <TabsTrigger value="signals">Signals</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="px-6 py-4">
                  <BacktestPerformanceMetrics performance={backtestResult.performance} />
                </TabsContent>
                
                <TabsContent value="equity" className="px-6 py-4">
                  <BacktestResultsChart result={backtestResult} />
                </TabsContent>
                
                <TabsContent value="trades" className="px-6 py-4">
                  <BacktestTradesTable trades={backtestResult.trades} />
                </TabsContent>
                
                <TabsContent value="signals" className="px-6 py-4">
                  <div className="rounded-md border">
                    <ScrollArea className="h-[400px]">
                      <table className="w-full">
                        <thead className="sticky top-0 bg-card">
                          <tr className="border-b">
                            <th className="p-2 text-left font-medium">Symbol</th>
                            <th className="p-2 text-left font-medium">Type</th>
                            <th className="p-2 text-left font-medium">Price</th>
                            <th className="p-2 text-left font-medium">Strength</th>
                            <th className="p-2 text-left font-medium">Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {backtestResult.signals.map((signal, index) => (
                            <tr 
                              key={index} 
                              className="border-b hover:bg-muted/50"
                            >
                              <td className="p-2">{signal.symbol}</td>
                              <td className="p-2">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  signal.type.includes('BUY') ? 'bg-green-500/20 text-green-700' : 
                                  signal.type.includes('SELL') ? 'bg-red-500/20 text-red-700' : 
                                  'bg-yellow-500/20 text-yellow-700'
                                }`}>
                                  {signal.type}
                                </span>
                              </td>
                              <td className="p-2">{signal.price.toFixed(2)}</td>
                              <td className="p-2">{signal.strength.toFixed(0)}%</td>
                              <td className="p-2">{new Date(signal.timestamp).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </ScrollArea>
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex flex-col items-center justify-center p-12">
                <div className="rounded-full bg-primary/10 p-3 mb-4">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-medium mb-2">No Backtest Results</h3>
                <p className="text-center text-muted-foreground mb-4">
                  Configure your strategy and run a backtest to see performance metrics and analysis
                </p>
                
                {previousBacktests.length > 0 && (
                  <div className="w-full">
                    <h4 className="text-sm font-medium mb-2">Previous Backtests</h4>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {previousBacktests.map(backtest => (
                          <div 
                            key={backtest.id} 
                            className="flex items-center justify-between p-2 border rounded-md hover:bg-accent cursor-pointer"
                            onClick={() => handleLoadPreviousBacktest(backtest.id)}
                          >
                            <div>
                              <p className="text-sm font-medium">{backtest.strategy_id}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(backtest.created_at).toLocaleString()}
                              </p>
                            </div>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}
          </CardContent>
          {backtestResult && (
            <CardFooter className="flex justify-between">
              <div className="text-sm text-muted-foreground">
                Backtest ID: {backtestResult.id.substring(0, 8)}
              </div>
              <Button variant="outline" onClick={handleDownloadResults}>
                <Download className="mr-2 h-4 w-4" /> Download Results
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
