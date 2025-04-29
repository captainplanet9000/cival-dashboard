import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { createBrowserClient } from '@/utils/supabase/client';
import { SignalType, SignalSource, SignalStrength } from '@/utils/trading/decision-engine';
import { CircleAlert, ArrowUpRight, ArrowDownRight, RefreshCw, Play, Pause, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface AutomatedTradingMonitorProps {
  portfolioId: string;
}

export function AutomatedTradingMonitor({ portfolioId }: AutomatedTradingMonitorProps) {
  const [signals, setSignals] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({
    totalSignals: 0,
    executedSignals: 0,
    successRate: 0,
    winRate: 0,
    profitFactor: 0,
    netPnl: 0,
    activeStrategies: 0,
  });
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState('signals');
  const [automationEnabled, setAutomationEnabled] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [circuitBreaker, setCircuitBreaker] = useState<{active: boolean, reason: string} | null>(null);
  const supabase = createBrowserClient();
  const { toast } = useToast();

  // Fetch data on component mount and when portfolioId changes
  useEffect(() => {
    fetchData();
    
    // Set up refresh interval (30 seconds)
    const interval = setInterval(() => {
      fetchData();
    }, 30000);
    
    setRefreshInterval(interval);
    
    // Clear interval on unmount
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [portfolioId]);

  // Fetch all data
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch portfolio details first
      const { data: portfolio, error: portfolioError } = await supabase
        .from('portfolios')
        .select('*')
        .eq('id', portfolioId)
        .single();
        
      if (portfolioError) throw portfolioError;
      
      setAutomationEnabled(portfolio.automated_trading_enabled || false);
      
      // Fetch trading signals
      const { data: signalsData, error: signalsError } = await supabase
        .from('trading_signals')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .order('timestamp', { ascending: false })
        .limit(50);
        
      if (signalsError) throw signalsError;
      setSignals(signalsData || []);
      
      // Fetch positions
      const { data: positionsData, error: positionsError } = await supabase
        .from('positions')
        .select('*')
        .eq('portfolio_id', portfolioId);
        
      if (positionsError) throw positionsError;
      setPositions(positionsData || []);
      
      // Fetch circuit breaker status
      const { data: riskData, error: riskError } = await supabase
        .from('risk_status')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .single();
        
      if (!riskError && riskData) {
        setCircuitBreaker({
          active: riskData.circuit_breaker_active || false,
          reason: riskData.circuit_breaker_reason || ''
        });
      }
      
      // Calculate metrics
      calculateMetrics(signalsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to load data',
        description: 'There was an error loading trading data.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate trading metrics
  const calculateMetrics = (signalsData: any[]) => {
    if (!signalsData.length) {
      setMetrics({
        totalSignals: 0,
        executedSignals: 0,
        successRate: 0,
        winRate: 0,
        profitFactor: 0,
        netPnl: 0,
        activeStrategies: 0,
      });
      return;
    }
    
    const totalSignals = signalsData.length;
    const executedSignals = signalsData.filter(s => s.executed).length;
    const successRate = executedSignals > 0 ? (executedSignals / totalSignals) * 100 : 0;
    
    // Calculate PnL metrics for executed signals
    const executedWithPnl = signalsData.filter(s => s.executed && s.execution_details?.profitLoss !== undefined);
    const wins = executedWithPnl.filter(s => s.execution_details.profitLoss > 0);
    const losses = executedWithPnl.filter(s => s.execution_details.profitLoss < 0);
    
    const winRate = executedWithPnl.length > 0 ? (wins.length / executedWithPnl.length) * 100 : 0;
    
    const totalProfit = wins.reduce((sum, s) => sum + (s.execution_details.profitLoss || 0), 0);
    const totalLoss = Math.abs(losses.reduce((sum, s) => sum + (s.execution_details.profitLoss || 0), 0));
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;
    
    const netPnl = totalProfit - totalLoss;
    
    // Count unique active strategies
    const activeStrategies = new Set(
      signalsData
        .filter(s => s.timestamp > new Date(Date.now() - 24*60*60*1000).toISOString())
        .map(s => s.strategy_id)
    ).size;
    
    setMetrics({
      totalSignals,
      executedSignals,
      successRate,
      winRate,
      profitFactor,
      netPnl,
      activeStrategies,
    });
  };

  // Generate signals (and optionally execute them)
  const handleGenerateSignals = async (execute = false) => {
    setExecuting(true);
    try {
      const response = await fetch(`/api/trading/automated?portfolioId=${portfolioId}&execute=${execute}`, {
        method: 'GET',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate signals');
      }
      
      const data = await response.json();
      
      toast({
        title: execute ? 'Signals executed' : 'Signals generated',
        description: `Generated ${data.signals_count} signals${execute ? ` and executed ${data.execution?.executedSignals || 0}` : ''}.`,
      });
      
      // Refresh data after signal generation
      fetchData();
    } catch (error) {
      console.error('Error generating/executing signals:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to process signals',
        description: error.message || 'There was an error processing trading signals.',
      });
    } finally {
      setExecuting(false);
    }
  };

  // Toggle automated trading for the portfolio
  const toggleAutomation = async () => {
    try {
      const { error } = await supabase
        .from('portfolios')
        .update({ automated_trading_enabled: !automationEnabled })
        .eq('id', portfolioId);
        
      if (error) throw error;
      
      setAutomationEnabled(!automationEnabled);
      
      toast({
        title: !automationEnabled ? 'Automation enabled' : 'Automation disabled',
        description: !automationEnabled 
          ? 'Automated trading has been enabled for this portfolio.' 
          : 'Automated trading has been disabled for this portfolio.',
      });
    } catch (error) {
      console.error('Error toggling automation:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to update settings',
        description: 'There was an error updating automation settings.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Trading Monitor</h2>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchData} 
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            size="sm" 
            variant={automationEnabled ? "destructive" : "default"}
            onClick={toggleAutomation}
          >
            {automationEnabled ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Disable Automation
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Enable Automation
              </>
            )}
          </Button>
        </div>
      </div>
      
      {circuitBreaker?.active && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Trading Halted</AlertTitle>
          <AlertDescription>
            Circuit breaker activated: {circuitBreaker.reason}. Trading is currently halted for this portfolio.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle>Trading Performance</CardTitle>
            <CardDescription>
              Overview of your automated trading performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div className="bg-card/50 rounded-lg p-3">
                <div className="text-sm font-medium text-muted-foreground">Signals (24h)</div>
                <div className="text-2xl font-bold">{metrics.totalSignals}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {metrics.executedSignals} executed ({metrics.successRate.toFixed(1)}%)
                </div>
              </div>
              
              <div className="bg-card/50 rounded-lg p-3">
                <div className="text-sm font-medium text-muted-foreground">Win Rate</div>
                <div className={`text-2xl font-bold ${metrics.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                  {metrics.winRate.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Profit Factor: {metrics.profitFactor.toFixed(2)}
                </div>
              </div>
              
              <div className="bg-card/50 rounded-lg p-3">
                <div className="text-sm font-medium text-muted-foreground">Net PnL</div>
                <div className={`text-2xl font-bold ${metrics.netPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${Math.abs(metrics.netPnl).toFixed(2)}
                  {metrics.netPnl >= 0 ? '' : ' loss'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  From {metrics.executedSignals} trades
                </div>
              </div>
              
              <div className="bg-card/50 rounded-lg p-3">
                <div className="text-sm font-medium text-muted-foreground">Active Strategies</div>
                <div className="text-2xl font-bold">{metrics.activeStrategies}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Running in last 24h
                </div>
              </div>
            </div>
            
            <div className="mt-6 space-y-2">
              <div className="flex justify-between">
                <h3 className="text-sm font-medium">Active Positions</h3>
                <span className="text-sm text-muted-foreground">{positions.length} positions</span>
              </div>
              
              {positions.length === 0 ? (
                <div className="text-sm text-muted-foreground py-2">
                  No active positions
                </div>
              ) : (
                <div className="border rounded-lg divide-y">
                  {positions.slice(0, 5).map((position) => (
                    <div key={position.id} className="flex justify-between items-center p-2 text-sm">
                      <div className="flex items-center">
                        <Badge variant={position.side === 'buy' ? 'default' : 'destructive'} className="mr-2">
                          {position.side.toUpperCase()}
                        </Badge>
                        <span className="font-medium">{position.symbol}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div>
                          <span className="text-muted-foreground text-xs">Qty:</span> {position.quantity.toFixed(4)}
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Entry:</span> ${position.entry_price.toFixed(2)}
                        </div>
                        <div>
                          <span className={`${position.unrealized_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {position.unrealized_pnl >= 0 ? '+' : ''}
                            {position.unrealized_pnl.toFixed(2)} USD
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {positions.length > 5 && (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      +{positions.length - 5} more positions
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex justify-center mt-4 space-x-4">
              <Button 
                variant="outline" 
                onClick={() => handleGenerateSignals(false)}
                disabled={executing}
              >
                Generate Signals
              </Button>
              <Button 
                onClick={() => handleGenerateSignals(true)}
                disabled={executing || circuitBreaker?.active}
              >
                {executing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Execute Trades'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>Recent Signals</CardTitle>
            <CardDescription>
              Latest trading signals generated
            </CardDescription>
          </CardHeader>
          <CardContent>
            {signals.length === 0 ? (
              <div className="text-center py-6">
                <CircleAlert className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">No signals generated yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {signals.slice(0, 10).map((signal) => (
                  <div key={signal.id} className="flex justify-between items-center border-b pb-2 last:border-0 last:pb-0">
                    <div>
                      <div className="flex items-center">
                        {signal.type === 'buy' ? (
                          <ArrowUpRight className="h-4 w-4 text-green-600 mr-1" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-red-600 mr-1" />
                        )}
                        <span className={`font-semibold ${signal.type === 'buy' ? 'text-green-600' : 'text-red-600'}`}>
                          {signal.type.toUpperCase()}
                        </span>
                        <span className="ml-2 font-medium">{signal.symbol}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {signal.source}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {format(new Date(signal.timestamp), 'MMM d, h:mm a')}
                        {signal.executed && signal.execution_timestamp && (
                          <span className="ml-2">
                            • Executed: {format(new Date(signal.execution_timestamp), 'h:mm a')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono">${signal.price.toFixed(2)}</div>
                      <div className="text-xs">
                        {signal.executed ? (
                          <Badge variant="success" className="text-xs">Executed</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Pending</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
