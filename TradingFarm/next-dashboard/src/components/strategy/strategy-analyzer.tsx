'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ChevronRight, 
  RefreshCw, 
  LineChart, 
  BarChart, 
  Check, 
  AlertTriangle,
  Clock, 
  PlayCircle, 
  PauseCircle, 
  ListChecks,
  Settings,
  BoxSelect
} from 'lucide-react';

import { useStrategyAnalytics } from '@/hooks/react-query/use-strategy-queries';
import { ScrollArea } from '@/components/ui/scroll-area';

interface StrategyAnalyzerProps {
  strategyId: string;
}

export default function StrategyAnalyzer({ strategyId }: StrategyAnalyzerProps) {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Use our combined strategy analytics hook
  const {
    strategy,
    backtests,
    executions,
    isLoading,
    isError,
    refetch
  } = useStrategyAnalytics(strategyId);
  
  // Functions to format data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };
  
  const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };
  
  const formatPercentage = (value: number | undefined) => {
    if (value === undefined) return '-';
    return `${value.toFixed(2)}%`;
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Strategy Analyzer</CardTitle>
          <CardDescription>Loading strategy data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-[40px] w-[200px] rounded-md" />
            <Skeleton className="h-[300px] w-full rounded-md" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-[100px] w-full rounded-md" />
              <Skeleton className="h-[100px] w-full rounded-md" />
              <Skeleton className="h-[100px] w-full rounded-md" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (isError || !strategy) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Strategy Analyzer</CardTitle>
          <CardDescription>Error loading strategy</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-6">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <p className="mb-4">Failed to load strategy data. Please try again.</p>
            <Button onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-xl">{strategy.name}</CardTitle>
            <CardDescription>
              {strategy.description || `${strategy.type} strategy created ${formatDate(strategy.createdAt)}`}
            </CardDescription>
          </div>
          
          <div className="mt-4 md:mt-0 space-x-2 flex items-center">
            <Badge 
              variant={strategy.status === 'active' ? 'default' : strategy.status === 'paused' ? 'outline' : 'secondary'}
              className="capitalize"
            >
              {strategy.status}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="px-6">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">
              <LineChart className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="backtests">
              <BarChart className="h-4 w-4 mr-2" />
              Backtests
            </TabsTrigger>
            <TabsTrigger value="executions">
              <ListChecks className="h-4 w-4 mr-2" />
              Executions
            </TabsTrigger>
            <TabsTrigger value="config">
              <Settings className="h-4 w-4 mr-2" />
              Configuration
            </TabsTrigger>
          </TabsList>
        </div>
        
        <CardContent className="p-0">
          <TabsContent value="overview" className="pt-2 px-6 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard 
                title="Win Rate" 
                value={formatPercentage(strategy.performance?.winRate)}
                icon={<Check className="h-4 w-4" />}
                trend={strategy.performance?.winRate && strategy.performance.winRate > 55 ? 'positive' : 'neutral'}
              />
              <StatCard 
                title="Profit/Loss" 
                value={formatCurrency(strategy.performance?.profitLoss)}
                icon={<LineChart className="h-4 w-4" />}
                trend={strategy.performance?.profitLoss && strategy.performance.profitLoss > 0 ? 'positive' : 'negative'}
              />
              <StatCard 
                title="Total Trades" 
                value={strategy.performance?.totalTrades?.toString() || '-'}
                icon={<BoxSelect className="h-4 w-4" />}
              />
              <StatCard 
                title="Avg Trade Length" 
                value={`${strategy.performance?.averageTradeLength?.toFixed(1) || '-'} h`}
                icon={<Clock className="h-4 w-4" />}
              />
            </div>
            
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Performance Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] flex items-center justify-center bg-muted/30 rounded-md">
                    <LineChart className="h-16 w-16 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Recent Backtests</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {backtests && backtests.length > 0 ? (
                      <div className="divide-y">
                        {backtests.slice(0, 3).map((backtest, index) => (
                          <div key={index} className="p-4 hover:bg-muted/50 transition-colors">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium text-sm">
                                  {new Date(backtest.startDate).toLocaleDateString()} - {new Date(backtest.endDate).toLocaleDateString()}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {backtest.totalTrades} trades, {backtest.winRate.toFixed(1)}% win rate
                                </p>
                              </div>
                              <div className={`text-sm font-semibold ${backtest.pnlPercentage >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {backtest.pnlPercentage.toFixed(2)}%
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-muted-foreground">
                        No backtest data available
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Recent Executions</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {executions && executions.length > 0 ? (
                      <div className="divide-y">
                        {executions.slice(0, 3).map((execution, index) => (
                          <div key={index} className="p-4 hover:bg-muted/50 transition-colors">
                            <div className="flex justify-between items-center mb-1">
                              <p className="font-medium text-sm">
                                {new Date(execution.startTime).toLocaleString()}
                              </p>
                              <Badge 
                                variant={
                                  execution.status === 'completed' ? 'default' : 
                                  execution.status === 'running' ? 'outline' : 
                                  'destructive'
                                }
                                className="capitalize"
                              >
                                {execution.status}
                              </Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              <p className="text-xs text-muted-foreground">
                                {execution.signals.length} signals generated
                              </p>
                              {execution.performance && (
                                <span className={`text-sm font-semibold ${execution.performance.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                  {formatCurrency(execution.performance.pnl)}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-muted-foreground">
                        No execution data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="backtests" className="pt-2 px-6 pb-6">
            <div className="space-y-6">
              {backtests && backtests.length > 0 ? (
                backtests.map((backtest, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">
                          Backtest #{index + 1}
                        </CardTitle>
                        <Badge variant="outline">
                          {new Date(backtest.startDate).toLocaleDateString()} - {new Date(backtest.endDate).toLocaleDateString()}
                        </Badge>
                      </div>
                      <CardDescription>
                        {backtest.totalTrades} trades with {backtest.winRate.toFixed(1)}% win rate
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <StatCard 
                          title="Initial Balance" 
                          value={formatCurrency(backtest.initialBalance)}
                        />
                        <StatCard 
                          title="Final Balance" 
                          value={formatCurrency(backtest.finalBalance)}
                          trend={backtest.finalBalance > backtest.initialBalance ? 'positive' : 'negative'}
                        />
                        <StatCard 
                          title="Total PnL" 
                          value={`${formatCurrency(backtest.totalPnl)} (${backtest.pnlPercentage.toFixed(2)}%)`}
                          trend={backtest.totalPnl > 0 ? 'positive' : 'negative'}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Performance Metrics</CardTitle>
                          </CardHeader>
                          <CardContent className="p-0">
                            <div className="divide-y">
                              <MetricRow label="Winning Trades" value={`${backtest.winningTrades} (${(backtest.winningTrades / backtest.totalTrades * 100).toFixed(1)}%)`} />
                              <MetricRow label="Losing Trades" value={`${backtest.losingTrades} (${(backtest.losingTrades / backtest.totalTrades * 100).toFixed(1)}%)`} />
                              <MetricRow label="Profit Factor" value={backtest.profitFactor.toFixed(2)} />
                              <MetricRow label="Sharpe Ratio" value={backtest.sharpeRatio.toFixed(2)} />
                              <MetricRow label="Max Drawdown" value={`${backtest.maxDrawdownPercentage.toFixed(2)}%`} />
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Backtest Parameters</CardTitle>
                          </CardHeader>
                          <CardContent className="p-0">
                            <div className="divide-y">
                              <MetricRow label="Timeframe" value={backtest.parameters.timeframe} />
                              <MetricRow label="Symbols" value={backtest.parameters.symbols.join(', ')} />
                              <MetricRow label="Risk Mgmt" value={`Stop Loss: ${backtest.parameters.riskManagement.stopLoss}%, Take Profit: ${backtest.parameters.riskManagement.takeProfit}%`} />
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Equity Curve</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-[200px] flex items-center justify-center bg-muted/30 rounded-md">
                            <LineChart className="h-12 w-12 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="py-12 text-center">
                  <LineChart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No Backtest Data</h3>
                  <p className="text-muted-foreground">This strategy has no backtest results yet.</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="executions" className="pt-2 px-6 pb-6">
            <div className="space-y-6">
              {executions && executions.length > 0 ? (
                executions.map((execution, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">
                          Execution #{index + 1}
                        </CardTitle>
                        <Badge 
                          variant={
                            execution.status === 'completed' ? 'default' : 
                            execution.status === 'running' ? 'outline' : 
                            'destructive'
                          }
                          className="capitalize"
                        >
                          {execution.status}
                        </Badge>
                      </div>
                      <CardDescription>
                        Started at {new Date(execution.startTime).toLocaleString()}
                        {execution.endTime && ` - Ended at ${new Date(execution.endTime).toLocaleString()}`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {execution.status === 'failed' && execution.error && (
                        <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 mb-6">
                          <div className="flex items-start">
                            <AlertTriangle className="h-5 w-5 text-destructive mr-2 mt-0.5" />
                            <div>
                              <h4 className="font-medium text-destructive">Execution Failed</h4>
                              <p className="text-sm">{execution.error}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {execution.status === 'completed' && execution.performance && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          <StatCard 
                            title="Total PnL" 
                            value={formatCurrency(execution.performance.pnl)}
                            trend={execution.performance.pnl > 0 ? 'positive' : 'negative'}
                          />
                          <StatCard 
                            title="Trades" 
                            value={`${execution.performance.winningTrades} / ${execution.performance.losingTrades}`}
                            subtext="win / loss"
                          />
                          <StatCard 
                            title="Win Rate" 
                            value={`${(execution.performance.winningTrades / execution.performance.trades * 100).toFixed(1)}%`}
                            trend={execution.performance.winningTrades > execution.performance.losingTrades ? 'positive' : 'negative'}
                          />
                        </div>
                      )}
                      
                      <div className="space-y-4">
                        {execution.signals.length > 0 && (
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm">Trading Signals</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                              <ScrollArea className="h-[200px]">
                                <div className="divide-y">
                                  {execution.signals.map((signal, sigIndex) => (
                                    <div key={sigIndex} className="p-3 hover:bg-muted/50 transition-colors">
                                      <div className="flex justify-between mb-1">
                                        <span className="text-sm font-medium">
                                          {signal.symbol} - {signal.direction.toUpperCase()}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          {new Date(signal.timestamp).toLocaleString()}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-xs">
                                          {signal.reason} {signal.confidence && `(${signal.confidence.toFixed(1)}% confidence)`}
                                        </span>
                                        <span className="text-xs font-mono">
                                          ${signal.price.toFixed(2)}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </CardContent>
                          </Card>
                        )}
                        
                        {execution.logs && execution.logs.length > 0 && (
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm">Execution Logs</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                              <ScrollArea className="h-[150px]">
                                <div className="divide-y">
                                  {execution.logs.map((log, logIndex) => (
                                    <div 
                                      key={logIndex} 
                                      className={`p-2 text-xs font-mono ${
                                        log.level === 'error' ? 'text-red-500 bg-red-50 dark:bg-red-950/20' : 
                                        log.level === 'warning' ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/20' : 
                                        'text-muted-foreground'
                                      }`}
                                    >
                                      <span className="text-xs text-muted-foreground mr-2">
                                        {new Date(log.timestamp).toLocaleTimeString()}
                                      </span>
                                      {log.message}
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="py-12 text-center">
                  <PlayCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No Execution Data</h3>
                  <p className="text-muted-foreground">This strategy has not been executed yet.</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="config" className="pt-2 px-6 pb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Strategy Configuration</CardTitle>
                <CardDescription>
                  Settings and parameters for this strategy
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Basic Information</h3>
                      <div className="rounded-md border divide-y">
                        <MetricRow label="Strategy Type" value={strategy.type} />
                        <MetricRow label="Created At" value={formatDate(strategy.createdAt)} />
                        <MetricRow label="Last Updated" value={formatDate(strategy.updatedAt)} />
                        <MetricRow label="Last Run" value={strategy.lastRunAt ? formatDate(strategy.lastRunAt) : 'Never'} />
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium mb-2">Status & Tags</h3>
                      <div className="rounded-md border divide-y">
                        <div className="p-3 flex justify-between">
                          <span className="text-sm">Status</span>
                          <Badge variant="outline" className="capitalize">{strategy.status}</Badge>
                        </div>
                        <div className="p-3 flex justify-between">
                          <span className="text-sm">Tags</span>
                          <div className="flex flex-wrap gap-1 justify-end">
                            {strategy.tags && strategy.tags.length > 0 ? (
                              strategy.tags.map((tag, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">No tags</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {strategy.parameters && (
                    <>
                      <div>
                        <h3 className="text-sm font-medium mb-2">Trading Parameters</h3>
                        <div className="rounded-md border divide-y">
                          <MetricRow label="Timeframe" value={strategy.parameters.timeframe} />
                          <MetricRow label="Symbols" value={strategy.parameters.symbols.join(', ')} />
                          <div className="p-3">
                            <h4 className="text-sm font-medium mb-2">Risk Management</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              <div className="bg-muted/50 rounded p-2">
                                <div className="text-xs text-muted-foreground">Max Position</div>
                                <div className="font-medium">{(strategy.parameters.riskManagement.maxPositionSize * 100).toFixed(1)}%</div>
                              </div>
                              {strategy.parameters.riskManagement.stopLoss && (
                                <div className="bg-muted/50 rounded p-2">
                                  <div className="text-xs text-muted-foreground">Stop Loss</div>
                                  <div className="font-medium">{strategy.parameters.riskManagement.stopLoss}%</div>
                                </div>
                              )}
                              {strategy.parameters.riskManagement.takeProfit && (
                                <div className="bg-muted/50 rounded p-2">
                                  <div className="text-xs text-muted-foreground">Take Profit</div>
                                  <div className="font-medium">{strategy.parameters.riskManagement.takeProfit}%</div>
                                </div>
                              )}
                              {strategy.parameters.riskManagement.trailingStop && (
                                <div className="bg-muted/50 rounded p-2">
                                  <div className="text-xs text-muted-foreground">Trailing Stop</div>
                                  <div className="font-medium">{strategy.parameters.riskManagement.trailingStop}%</div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {strategy.config && (
                        <div>
                          <h3 className="text-sm font-medium mb-2">Technical Configuration</h3>
                          <Card className="bg-muted/30">
                            <CardContent className="p-3">
                              <pre className="text-xs overflow-auto p-2">
                                {JSON.stringify(strategy.config, null, 2)}
                              </pre>
                            </CardContent>
                          </Card>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}

// Helper Components
interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: 'positive' | 'negative' | 'neutral';
  subtext?: string;
}

function StatCard({ title, value, icon, trend, subtext }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {icon && (
              <div className="mr-2 h-8 w-8 rounded-full bg-primary/10 p-1.5 text-primary">
                {icon}
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              <div className="flex items-center">
                <h3 className="text-2xl font-bold">{value}</h3>
                {trend === 'positive' && <TrendingUp className="ml-2 h-4 w-4 text-green-500" />}
                {trend === 'negative' && <TrendingDown className="ml-2 h-4 w-4 text-red-500" />}
              </div>
              {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface MetricRowProps {
  label: string;
  value: string | number;
}

function MetricRow({ label, value }: MetricRowProps) {
  return (
    <div className="p-3 flex justify-between items-center">
      <span className="text-sm">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
