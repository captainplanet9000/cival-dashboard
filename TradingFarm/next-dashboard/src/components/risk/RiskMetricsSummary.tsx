/**
 * Risk Metrics Summary Component
 * Displays key risk metrics and analytics across trading accounts, strategies and ElizaOS agents
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  AlertCircle, BarChart3, TrendingUp, TrendingDown, 
  RefreshCw, Clock, DollarSign, Percent, Activity,
  LineChart, Users, Brain, BarChart4, PieChart
} from 'lucide-react';
import { enhancedRiskService, RiskMetricsRecord } from '@/services/enhanced-risk-service';
import { Skeleton } from '@/components/ui/skeleton';

// Mock metrics data generator
const generateMockMetrics = (period: string): RiskMetricsRecord[] => {
  const today = new Date();
  const daysToSubtract = period === 'daily' ? 14 : period === 'weekly' ? 12 : 6;
  
  return Array.from({ length: daysToSubtract }).map((_, i) => {
    const date = new Date();
    date.setDate(today.getDate() - i);
    
    const startingBalance = 10000 + Math.random() * 2000;
    const drawdownPercentage = Math.random() * 5;
    const profitFactor = 1 + Math.random();
    
    return {
      id: `metric-${i}`,
      user_id: 'user-1',
      account_id: 'account-1',
      date: date.toISOString().split('T')[0],
      period: period as 'daily' | 'weekly' | 'monthly',
      starting_balance: startingBalance,
      ending_balance: startingBalance * (1 - drawdownPercentage / 100 + Math.random() * 0.1),
      drawdown_percentage: drawdownPercentage,
      max_drawdown_percentage: drawdownPercentage + Math.random() * 2,
      total_trades: period === 'daily' ? 5 + Math.floor(Math.random() * 10) : 
                  period === 'weekly' ? 20 + Math.floor(Math.random() * 30) :
                  50 + Math.floor(Math.random() * 100),
      winning_trades: Math.floor(Math.random() * 10) + 10,
      losing_trades: Math.floor(Math.random() * 5) + 5,
      average_risk_per_trade: 1 + Math.random() * 3,
      largest_loss: 100 + Math.random() * 300,
      largest_gain: 200 + Math.random() * 400,
      profit_factor: profitFactor,
      sharpe_ratio: 0.5 + Math.random() * 1.5,
      volatility: 1 + Math.random() * 4,
      custom_metrics: {
        agent_involvement: Math.random() * 100,
        autonomous_decisions: Math.floor(Math.random() * 50),
        elizaos_confidence: 60 + Math.random() * 40
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  });
};

export function RiskMetricsSummary() {
  const [metrics, setMetrics] = useState<RiskMetricsRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('daily');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  
  useEffect(() => {
    loadRiskMetrics();
  }, [selectedPeriod, selectedAccount]);
  
  const loadRiskMetrics = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real implementation, we would fetch from the API
      // For now, we'll use mock data
      setTimeout(() => {
        setMetrics(generateMockMetrics(selectedPeriod));
        setIsLoading(false);
      }, 1000);
    } catch (error: any) {
      setError(error.message || 'An error occurred while loading risk metrics');
      setIsLoading(false);
    }
  };
  
  // Extract values for charts
  const dates = metrics.map(m => {
    const date = new Date(m.date);
    return selectedPeriod === 'daily'
      ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : selectedPeriod === 'weekly'
      ? `Week ${Math.ceil(date.getDate() / 7)} ${date.toLocaleDateString('en-US', { month: 'short' })}`
      : date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }).reverse();
  
  const drawdowns = metrics.map(m => m.drawdown_percentage).reverse();
  const maxDrawdowns = metrics.map(m => m.max_drawdown_percentage || m.drawdown_percentage).reverse();
  const profitFactors = metrics.map(m => m.profit_factor || 1).reverse();
  const sharpeRatios = metrics.map(m => m.sharpe_ratio || 0).reverse();
  const volatilities = metrics.map(m => m.volatility || 0).reverse();
  const winRates = metrics.map(m => 
    m.total_trades > 0 ? (m.winning_trades / m.total_trades) * 100 : 0
  ).reverse();
  
  // Calculate current risk metrics from the most recent data
  const currentMetrics = metrics.length > 0 ? metrics[0] : null;
  
  // Calculate aggregated statistics
  const calculateAggregates = () => {
    if (metrics.length === 0) return null;
    
    const totalTrades = metrics.reduce((sum, m) => sum + m.total_trades, 0);
    const totalWinningTrades = metrics.reduce((sum, m) => sum + m.winning_trades, 0);
    const totalLosingTrades = metrics.reduce((sum, m) => sum + m.losing_trades, 0);
    const avgWinRate = totalTrades > 0 ? (totalWinningTrades / totalTrades) * 100 : 0;
    const avgDrawdown = metrics.reduce((sum, m) => sum + m.drawdown_percentage, 0) / metrics.length;
    const maxDrawdown = Math.max(...metrics.map(m => m.max_drawdown_percentage || 0));
    const avgProfitFactor = metrics.reduce((sum, m) => sum + (m.profit_factor || 1), 0) / metrics.length;
    const avgSharpe = metrics.reduce((sum, m) => sum + (m.sharpe_ratio || 0), 0) / metrics.length;
    
    return {
      totalTrades,
      totalWinningTrades,
      totalLosingTrades,
      avgWinRate,
      avgDrawdown,
      maxDrawdown,
      avgProfitFactor,
      avgSharpe
    };
  };
  
  const aggregates = calculateAggregates();
  
  // Loading skeletons
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-10 w-[150px]" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-[180px] w-full" />
          <Skeleton className="h-[180px] w-full" />
          <Skeleton className="h-[180px] w-full" />
        </div>
        
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Filters */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium">Risk Metrics</h2>
          <p className="text-sm text-muted-foreground">
            Performance and risk analytics for your trading activity
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
          <Select
            value={selectedPeriod}
            onValueChange={setSelectedPeriod}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
          
          <Select
            value={selectedAccount}
            onValueChange={setSelectedAccount}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              <SelectItem value="main">Main Trading Account</SelectItem>
              <SelectItem value="bot">ElizaOS Trading Account</SelectItem>
              <SelectItem value="dca">DCA Strategy Account</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => loadRiskMetrics()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span>Drawdown Risk</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentMetrics && (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold">
                    {currentMetrics.drawdown_percentage.toFixed(2)}%
                  </span>
                  <Badge 
                    variant={currentMetrics.drawdown_percentage > 10 ? "destructive" : 
                            currentMetrics.drawdown_percentage > 5 ? "default" : "outline"}
                  >
                    {currentMetrics.drawdown_percentage <= 3 ? 'Low Risk' : 
                     currentMetrics.drawdown_percentage <= 7 ? 'Medium Risk' : 'High Risk'}
                  </Badge>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Current Drawdown</span>
                    <span>{currentMetrics.drawdown_percentage.toFixed(2)}%</span>
                  </div>
                  <Progress value={currentMetrics.drawdown_percentage * 5} className="h-1" />
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Maximum Drawdown</span>
                    <span>{currentMetrics.max_drawdown_percentage?.toFixed(2) || '0.00'}%</span>
                  </div>
                  <Progress value={(currentMetrics.max_drawdown_percentage || 0) * 4} className="h-1" />
                </div>
                
                <div className="text-xs text-muted-foreground pt-2">
                  {aggregates && (
                    <div className="flex items-center gap-1">
                      <TrendingDown className="h-3 w-3" />
                      <span>Average drawdown: {aggregates.avgDrawdown.toFixed(2)}%</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span>Trading Performance</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentMetrics && (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold">
                    {((currentMetrics.winning_trades / currentMetrics.total_trades) * 100).toFixed(1)}%
                  </span>
                  <Badge 
                    variant={currentMetrics.winning_trades / currentMetrics.total_trades > 0.6 ? "default" : 
                            currentMetrics.winning_trades / currentMetrics.total_trades > 0.4 ? "secondary" : "outline"}
                  >
                    Win Rate
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Win / Loss</span>
                      <span>{currentMetrics.winning_trades} / {currentMetrics.losing_trades}</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full"
                        style={{ 
                          width: `${(currentMetrics.winning_trades / currentMetrics.total_trades) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Profit Factor</span>
                      <span>{currentMetrics.profit_factor?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full"
                        style={{ 
                          width: `${Math.min((currentMetrics.profit_factor || 0) * 33, 100)}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Total Trades</div>
                    <div className="font-medium">{currentMetrics.total_trades}</div>
                  </div>
                  
                  <div>
                    <div className="text-xs text-muted-foreground">Sharpe Ratio</div>
                    <div className="font-medium">{currentMetrics.sharpe_ratio?.toFixed(2) || '0.00'}</div>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground pt-1">
                  {currentMetrics.custom_metrics?.elizaos_confidence && (
                    <div className="flex items-center gap-1">
                      <Brain className="h-3 w-3" />
                      <span>ElizaOS Confidence: {currentMetrics.custom_metrics.elizaos_confidence.toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <span>ElizaOS Agent Metrics</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentMetrics && currentMetrics.custom_metrics && (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold">
                    {currentMetrics.custom_metrics.agent_involvement?.toFixed(1) || '0.0'}%
                  </span>
                  <Badge variant="secondary">
                    AI Involvement
                  </Badge>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Autonomous Decisions</span>
                    <span>{currentMetrics.custom_metrics.autonomous_decisions || 0}</span>
                  </div>
                  <Progress 
                    value={currentMetrics.custom_metrics.agent_involvement || 0} 
                    className="h-1" 
                  />
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Agent Confidence</span>
                    <span>{currentMetrics.custom_metrics.elizaos_confidence?.toFixed(1) || '0.0'}%</span>
                  </div>
                  <Progress 
                    value={currentMetrics.custom_metrics.elizaos_confidence || 0} 
                    className="h-1" 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="flex items-center gap-2 border rounded p-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <div className="text-xs">
                      <div className="font-medium">Smart Risk Enforcement</div>
                      <div className="text-muted-foreground">Enabled</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 border rounded p-2">
                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                    <div className="text-xs">
                      <div className="font-medium">AI Circuit Breakers</div>
                      <div className="text-muted-foreground">Ready</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Charts */}
      <Tabs defaultValue="drawdown">
        <TabsList>
          <TabsTrigger value="drawdown" className="flex items-center gap-1">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Drawdown</span>
          </TabsTrigger>
          <TabsTrigger value="winrate" className="flex items-center gap-1">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Win Rate</span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Performance</span>
          </TabsTrigger>
          <TabsTrigger value="agents" className="flex items-center gap-1">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">ElizaOS Agents</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="drawdown">
          <Card>
            <CardHeader>
              <CardTitle>Drawdown Analysis</CardTitle>
              <CardDescription>
                Historical drawdown measurements and risk exposure over time
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] relative">
              {/* This would be a real chart component in production */}
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <div className="w-full h-full bg-muted/30 rounded-lg border flex items-center justify-center">
                  <div className="text-center">
                    <LineChart className="h-10 w-10 text-primary mx-auto mb-2" />
                    <p className="text-muted-foreground">
                      In a real implementation, this would be a chart showing drawdown metrics over time
                    </p>
                    <div className="text-xs text-muted-foreground mt-4">
                      <div className="flex flex-col gap-1 items-center">
                        <div>Chart Data:</div>
                        <div className="flex items-center gap-2">
                          <span>Dates:</span>
                          <span className="font-mono">{dates.join(', ')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>Drawdowns:</span>
                          <span className="font-mono">{drawdowns.map(d => d.toFixed(1)).join('%, ')}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="winrate">
          <Card>
            <CardHeader>
              <CardTitle>Win Rate Analysis</CardTitle>
              <CardDescription>
                Trading win rate metrics and performance analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] relative">
              {/* This would be a real chart component in production */}
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <div className="w-full h-full bg-muted/30 rounded-lg border flex items-center justify-center">
                  <div className="text-center">
                    <BarChart4 className="h-10 w-10 text-primary mx-auto mb-2" />
                    <p className="text-muted-foreground">
                      In a real implementation, this would be a chart showing win rate metrics over time
                    </p>
                    <div className="text-xs text-muted-foreground mt-4">
                      <div className="flex flex-col gap-1 items-center">
                        <div>Chart Data:</div>
                        <div className="flex items-center gap-2">
                          <span>Dates:</span>
                          <span className="font-mono">{dates.join(', ')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>Win Rates:</span>
                          <span className="font-mono">{winRates.map(w => w.toFixed(1)).join('%, ')}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>
                Profit factor, Sharpe ratio, and other performance indicators
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] relative">
              {/* This would be a real chart component in production */}
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <div className="w-full h-full bg-muted/30 rounded-lg border flex items-center justify-center">
                  <div className="text-center">
                    <Activity className="h-10 w-10 text-primary mx-auto mb-2" />
                    <p className="text-muted-foreground">
                      In a real implementation, this would be a chart showing performance metrics over time
                    </p>
                    <div className="text-xs text-muted-foreground mt-4">
                      <div className="flex flex-col gap-1 items-center">
                        <div>Chart Data:</div>
                        <div className="flex items-center gap-2">
                          <span>Profit Factors:</span>
                          <span className="font-mono">{profitFactors.map(p => p.toFixed(2)).join(', ')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>Sharpe Ratios:</span>
                          <span className="font-mono">{sharpeRatios.map(s => s.toFixed(2)).join(', ')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="agents">
          <Card>
            <CardHeader>
              <CardTitle>ElizaOS Agent Metrics</CardTitle>
              <CardDescription>
                AI agent involvement and performance statistics
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] relative">
              {/* This would be a real chart component in production */}
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <div className="w-full h-full bg-muted/30 rounded-lg border flex items-center justify-center">
                  <div className="text-center">
                    <Brain className="h-10 w-10 text-primary mx-auto mb-2" />
                    <p className="text-muted-foreground">
                      In a real implementation, this would be a chart showing ElizaOS agent performance metrics
                    </p>
                    <div className="text-xs text-muted-foreground mt-4">
                      <div>
                        Currently tracking {currentMetrics?.custom_metrics?.elizaos_confidence ? 'ElizaOS agent metrics' : 'no agent metrics'}
                      </div>
                      <div className="mt-2">
                        {currentMetrics?.custom_metrics?.elizaos_confidence && (
                          <div>
                            Agent confidence: {currentMetrics.custom_metrics.elizaos_confidence.toFixed(1)}%
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Aggregated Stats */}
      {aggregates && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Summary Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Total Trades</div>
                <div className="text-lg font-medium">{aggregates.totalTrades}</div>
              </div>
              
              <div>
                <div className="text-xs text-muted-foreground">Average Win Rate</div>
                <div className="text-lg font-medium">{aggregates.avgWinRate.toFixed(1)}%</div>
              </div>
              
              <div>
                <div className="text-xs text-muted-foreground">Maximum Drawdown</div>
                <div className="text-lg font-medium">{aggregates.maxDrawdown.toFixed(2)}%</div>
              </div>
              
              <div>
                <div className="text-xs text-muted-foreground">Average Profit Factor</div>
                <div className="text-lg font-medium">{aggregates.avgProfitFactor.toFixed(2)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
