'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { ArrowUpIcon, ArrowDownIcon, InfoIcon, AlertIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';

import { createBrowserClient } from '@/utils/supabase/client';
import {
  getStrategyExecution,
  getExecutionSignals,
  getExecutionTrades,
  getExecutionLogs,
  pauseStrategyExecution,
  stopStrategyExecution,
  runStrategyExecution,
  StrategyExecution,
  StrategySignal,
  ExecutionTrade,
  ExecutionLog,
} from '@/services/strategy-execution';

interface ExecutionMonitorProps {
  executionId: number;
}

export function ExecutionMonitor({ executionId }: ExecutionMonitorProps) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [execution, setExecution] = React.useState<StrategyExecution | null>(null);
  const [signals, setSignals] = React.useState<StrategySignal[]>([]);
  const [trades, setTrades] = React.useState<ExecutionTrade[]>([]);
  const [logs, setLogs] = React.useState<ExecutionLog[]>([]);
  const [activeTab, setActiveTab] = React.useState('overview');
  
  // Initial data load
  React.useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const executionData = await getStrategyExecution(executionId);
        setExecution(executionData);
        
        const signalsData = await getExecutionSignals(executionId);
        setSignals(signalsData);
        
        const tradesData = await getExecutionTrades(executionId);
        setTrades(tradesData);
        
        const logsData = await getExecutionLogs(executionId);
        setLogs(logsData);
      } catch (error) {
        console.error('Error loading execution data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load execution data.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [executionId, toast]);
  
  // Setup real-time updates
  React.useEffect(() => {
    const supabase = createBrowserClient();
    
    // Subscribe to execution updates
    const executionSubscription = supabase
      .channel('execution-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'strategy_executions',
          filter: `id=eq.${executionId}`,
        },
        (payload) => {
          setExecution(payload.new as StrategyExecution);
        }
      )
      .subscribe();
    
    // Subscribe to signals
    const signalSubscription = supabase
      .channel('execution-signals')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'strategy_signals',
          filter: `execution_id=eq.${executionId}`,
        },
        async (payload) => {
          // Fetch updated signals
          const updatedSignals = await getExecutionSignals(executionId);
          setSignals(updatedSignals);
          
          // Show toast for new signal
          const signal = payload.new as StrategySignal;
          if (signal.type === 'entry' || signal.type === 'exit') {
            toast({
              title: `New ${signal.type.toUpperCase()} Signal`,
              description: signal.message || `${signal.direction?.toUpperCase() || ''} signal at ${formatPrice(signal.price)}`,
            });
          }
        }
      )
      .subscribe();
    
    // Subscribe to trades
    const tradeSubscription = supabase
      .channel('execution-trades')
      .on(
        'postgres_changes',
        {
          event: '*', // All events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'execution_trades',
          filter: `execution_id=eq.${executionId}`,
        },
        async () => {
          // Fetch updated trades
          const updatedTrades = await getExecutionTrades(executionId);
          setTrades(updatedTrades);
        }
      )
      .subscribe();
    
    // Subscribe to logs
    const logSubscription = supabase
      .channel('execution-logs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'execution_logs',
          filter: `execution_id=eq.${executionId}`,
        },
        async () => {
          // Fetch updated logs
          const updatedLogs = await getExecutionLogs(executionId);
          setLogs(updatedLogs);
        }
      )
      .subscribe();
    
    // Cleanup subscriptions
    return () => {
      executionSubscription.unsubscribe();
      signalSubscription.unsubscribe();
      tradeSubscription.unsubscribe();
      logSubscription.unsubscribe();
    };
  }, [executionId, toast]);
  
  // Handle execution actions
  const handlePause = async () => {
    try {
      await pauseStrategyExecution(executionId);
      toast({
        title: 'Execution paused',
        description: 'The strategy execution has been paused.',
      });
    } catch (error) {
      console.error('Error pausing execution:', error);
      toast({
        title: 'Error',
        description: 'Failed to pause execution.',
        variant: 'destructive',
      });
    }
  };
  
  const handleResume = async () => {
    try {
      await runStrategyExecution(executionId);
      toast({
        title: 'Execution resumed',
        description: 'The strategy execution has been resumed.',
      });
    } catch (error) {
      console.error('Error resuming execution:', error);
      toast({
        title: 'Error',
        description: 'Failed to resume execution.',
        variant: 'destructive',
      });
    }
  };
  
  const handleStop = async () => {
    try {
      await stopStrategyExecution(executionId);
      toast({
        title: 'Execution stopped',
        description: 'The strategy execution has been stopped.',
      });
    } catch (error) {
      console.error('Error stopping execution:', error);
      toast({
        title: 'Error',
        description: 'Failed to stop execution.',
        variant: 'destructive',
      });
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-t-2 border-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading execution data...</p>
        </div>
      </div>
    );
  }
  
  // Missing execution
  if (!execution) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-xl font-medium">Execution not found</p>
        <p className="text-muted-foreground">The requested execution could not be found.</p>
        <Button onClick={() => window.history.back()}>Go Back</Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Execution #{executionId}
          </h2>
          <p className="text-muted-foreground">
            {execution.symbol} {execution.timeframe} • Started{' '}
            {execution.start_time ? formatDate(execution.start_time) : 'pending'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <StatusBadge status={execution.status} />
          
          {execution.status === 'running' && (
            <Button onClick={handlePause} variant="outline">
              Pause
            </Button>
          )}
          
          {execution.status === 'paused' && (
            <Button onClick={handleResume} variant="outline">
              Resume
            </Button>
          )}
          
          {(execution.status === 'running' || execution.status === 'paused') && (
            <Button onClick={handleStop} variant="destructive">
              Stop
            </Button>
          )}
        </div>
      </div>
      
      {/* Main content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full md:w-[600px] grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="signals">Signals</TabsTrigger>
          <TabsTrigger value="trades">Trades</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Execution Details */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Execution Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Symbol</span>
                    <span>{execution.symbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Timeframe</span>
                    <span>{execution.timeframe}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Mode</span>
                    <span>
                      {execution.live_mode ? 'Live' : 'Backfill'}{' '}
                      {execution.paper_trading && '(Paper)'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Started</span>
                    <span>{execution.start_time ? formatDate(execution.start_time) : 'Pending'}</span>
                  </div>
                  {execution.end_time && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">Ended</span>
                      <span>{formatDate(execution.end_time)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Performance Metrics */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Initial Capital</span>
                    <span>${formatNumber(execution.initial_capital)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Current Capital</span>
                    <span>${formatNumber(execution.current_capital)}</span>
                  </div>
                  {execution.initial_capital && execution.current_capital && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-sm">Profit/Loss</span>
                        <span className={cn(
                          execution.current_capital - execution.initial_capital >= 0 
                            ? 'text-green-500' 
                            : 'text-red-500'
                        )}>
                          ${formatNumber(execution.current_capital - execution.initial_capital)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-sm">Return %</span>
                        <span className={cn(
                          execution.current_capital - execution.initial_capital >= 0 
                            ? 'text-green-500' 
                            : 'text-red-500'
                        )}>
                          {formatNumber((execution.current_capital / execution.initial_capital - 1) * 100)}%
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Total Trades</span>
                    <span>{trades.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Open Trades</span>
                    <span>{trades.filter(t => t.status === 'open').length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Brain Assets */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Brain Assets</CardTitle>
              </CardHeader>
              <CardContent>
                {execution.brain_assets.length > 0 ? (
                  <div className="space-y-2">
                    {execution.brain_assets.map((asset: any, index: number) => (
                      <div key={index} className="border rounded-md p-2">
                        <p className="text-sm font-medium">{asset.title}</p>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{asset.asset_type}</span>
                          <Badge variant="outline" className="text-xs">
                            {asset.role}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No brain assets assigned
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Latest Signals */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Latest Signals</CardTitle>
            </CardHeader>
            <CardContent>
              {signals.length > 0 ? (
                <div className="space-y-2">
                  {signals.slice(0, 5).map((signal) => (
                    <div 
                      key={signal.id} 
                      className={cn(
                        "border rounded-md p-3 flex items-start",
                        signal.type === 'entry' && "border-green-200 bg-green-50 dark:bg-green-950/20",
                        signal.type === 'exit' && "border-red-200 bg-red-50 dark:bg-red-950/20",
                        signal.type === 'alert' && "border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20"
                      )}
                    >
                      <div className="mr-3">
                        {signal.type === 'entry' && <ArrowUpIcon className="h-5 w-5 text-green-500" />}
                        {signal.type === 'exit' && <ArrowDownIcon className="h-5 w-5 text-red-500" />}
                        {signal.type === 'alert' && <AlertIcon className="h-5 w-5 text-yellow-500" />}
                        {signal.type === 'info' && <InfoIcon className="h-5 w-5 text-blue-500" />}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center">
                          <span className="font-medium text-sm">
                            {signal.type.toUpperCase()}{' '}
                            {signal.direction && `(${signal.direction.toUpperCase()})`}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {formatTime(signal.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm">
                          {signal.message || 'No message'}
                          {signal.price && ` at ${formatPrice(signal.price)}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No signals generated yet
                </p>
              )}
              
              {signals.length > 5 && (
                <Button 
                  variant="link" 
                  className="w-full mt-2" 
                  onClick={() => setActiveTab('signals')}
                >
                  View all {signals.length} signals
                </Button>
              )}
            </CardContent>
          </Card>
          
          {/* Messages */}
          {execution.messages && execution.messages.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Strategy Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {execution.messages.map((message, index) => (
                      <div key={index} className="border rounded-md p-3">
                        <p className="text-sm">{message}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="signals" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Strategy Signals</CardTitle>
              <CardDescription>
                All signals generated by this strategy execution
              </CardDescription>
            </CardHeader>
            <CardContent>
              {signals.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {signals.map((signal) => (
                      <TableRow key={signal.id}>
                        <TableCell>{formatTime(signal.timestamp)}</TableCell>
                        <TableCell>
                          <Badge variant={getSignalVariant(signal.type)}>
                            {signal.type.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {signal.direction ? (
                            <Badge variant="outline">
                              {signal.direction.toUpperCase()}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {signal.price ? formatPrice(signal.price) : "-"}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {signal.message || 'No message'}
                        </TableCell>
                        <TableCell>{signal.source || 'system'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-8 text-muted-foreground">
                  No signals have been generated yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="trades" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Execution Trades</CardTitle>
              <CardDescription>
                All trades executed by this strategy
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trades.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Direction</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Entry Time</TableHead>
                      <TableHead>Entry Price</TableHead>
                      <TableHead>Exit Time</TableHead>
                      <TableHead>Exit Price</TableHead>
                      <TableHead className="text-right">P&L</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trades.map((trade) => (
                      <TableRow key={trade.id}>
                        <TableCell>
                          <Badge variant={trade.direction === 'long' ? 'default' : 'secondary'}>
                            {trade.direction.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getTradeStatusVariant(trade.status)}>
                            {trade.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {trade.entry_time ? formatTime(trade.entry_time) : "-"}
                        </TableCell>
                        <TableCell>
                          {trade.entry_price ? formatPrice(trade.entry_price) : "-"}
                        </TableCell>
                        <TableCell>
                          {trade.exit_time ? formatTime(trade.exit_time) : "-"}
                        </TableCell>
                        <TableCell>
                          {trade.exit_price ? formatPrice(trade.exit_price) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {trade.pnl ? (
                            <span className={cn(
                              "font-medium",
                              trade.pnl >= 0 ? "text-green-500" : "text-red-500"
                            )}>
                              {trade.pnl >= 0 ? "+" : ""}{formatNumber(trade.pnl)}
                              {trade.pnl_percentage && ` (${trade.pnl_percentage >= 0 ? "+" : ""}${formatNumber(trade.pnl_percentage)}%)`}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-8 text-muted-foreground">
                  No trades have been executed yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="logs" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Execution Logs</CardTitle>
              <CardDescription>
                System logs for this execution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {logs.length > 0 ? (
                  <div className="space-y-2">
                    {logs.map((log) => (
                      <div 
                        key={log.id} 
                        className={cn(
                          "border rounded-md p-3",
                          log.level === 'error' || log.level === 'critical' 
                            ? "border-red-200 bg-red-50 dark:bg-red-950/20" 
                            : log.level === 'warning'
                            ? "border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20"
                            : "border-gray-200"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant={getLogLevelVariant(log.level)}>
                            {log.level.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(log.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm mb-1">{log.message}</p>
                        {log.source && (
                          <div className="text-xs text-muted-foreground">
                            Source: {log.source}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">
                    No logs available
                  </p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper components
function StatusBadge({ status }: { status: string }) {
  const getVariant = () => {
    switch (status) {
      case 'running':
        return 'bg-green-500 hover:bg-green-600';
      case 'paused':
        return 'bg-yellow-500 hover:bg-yellow-600';
      case 'completed':
        return 'bg-blue-500 hover:bg-blue-600';
      case 'failed':
        return 'bg-red-500 hover:bg-red-600';
      case 'stopped':
        return 'bg-gray-500 hover:bg-gray-600';
      default:
        return '';
    }
  };
  
  return (
    <Badge className={cn(getVariant(), 'capitalize')}>
      {status}
    </Badge>
  );
}

// Helper functions
function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString(undefined, { 
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    return dateString;
  }
}

function formatTime(dateString: string): string {
  try {
    return new Date(dateString).toLocaleString(undefined, { 
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (e) {
    return dateString;
  }
}

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0';
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return '-';
  return `$${formatNumber(price)}`;
}

function getSignalVariant(type: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (type) {
    case 'entry':
      return 'default';
    case 'exit':
      return 'destructive';
    case 'alert':
      return 'secondary';
    default:
      return 'outline';
  }
}

function getTradeStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'open':
      return 'default';
    case 'closed':
      return 'outline';
    case 'canceled':
      return 'secondary';
    case 'failed':
      return 'destructive';
    default:
      return 'outline';
  }
}

function getLogLevelVariant(level: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (level) {
    case 'info':
      return 'default';
    case 'warning':
      return 'secondary';
    case 'error':
    case 'critical':
      return 'destructive';
    default:
      return 'outline';
  }
}
