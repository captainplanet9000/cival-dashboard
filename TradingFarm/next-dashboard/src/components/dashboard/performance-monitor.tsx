'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, BarChart, PieChart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { useWebSocket } from '@/components/websocket-provider';
import { WebSocketTopic } from '@/services/websocket-service';
import performanceMonitoringService, { PerformanceMetrics } from '@/services/performance-monitoring-service';
import { Skeleton } from '@/components/ui/skeleton';

// Chart components (mock implementation)
const EquityCurveChart = ({ data }: { data?: number[] }) => {
  return (
    <div className="h-60 w-full bg-muted rounded-md flex items-center justify-center">
      {data ? (
        <div className="h-full w-full relative">
          {/* Equity curve visualization would go here */}
          <div className="absolute bottom-0 left-0 w-full h-[60%] bg-gradient-to-t from-primary/10 to-transparent"></div>
        </div>
      ) : (
        <p className="text-muted-foreground">No data available</p>
      )}
    </div>
  );
};

const WinRateChart = ({ winRate }: { winRate?: number }) => {
  const percentage = winRate ? Math.round(winRate * 100) : 0;

  return (
    <div className="h-40 w-full flex items-center justify-center">
      <div className="relative h-32 w-32 rounded-full border-8 border-muted flex items-center justify-center">
        <div 
          className="absolute inset-0 rounded-full border-8 border-primary"
          style={{ clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 ${100 - percentage}%)` }}
        ></div>
        <span className="text-2xl font-bold">{percentage}%</span>
      </div>
    </div>
  );
};

const DrawdownChart = ({ drawdownCurve }: { drawdownCurve?: number[] }) => {
  return (
    <div className="h-40 w-full bg-muted rounded-md flex items-center justify-center">
      {drawdownCurve ? (
        <div className="h-full w-full relative">
          {/* Drawdown visualization would go here */}
          <div className="absolute bottom-0 left-0 w-full h-[40%] bg-gradient-to-t from-red-500/20 to-transparent"></div>
        </div>
      ) : (
        <p className="text-muted-foreground">No drawdown data</p>
      )}
    </div>
  );
};

// Performance Monitor component
interface PerformanceMonitorProps {
  farmId?: string;
  agentId?: string;
  strategyId?: string;
  refreshInterval?: number;
}

export default function PerformanceMonitor({
  farmId,
  agentId,
  strategyId,
  refreshInterval = 30000 // Default to 30 seconds
}: PerformanceMonitorProps) {
  const [activeTab, setActiveTab] = React.useState('overview');
  const [period, setPeriod] = React.useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time'>('daily');
  const [performance, setPerformance] = React.useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [alerts, setAlerts] = React.useState<any[]>([]);
  const { lastMessage } = useWebSocket();

  // Function to load performance data
  const loadPerformanceData = React.useCallback(async () => {
    try {
      setLoading(true);
      let data = null;
      
      if (farmId) {
        data = await performanceMonitoringService.getFarmPerformanceMetrics(farmId, period);
      } else if (agentId) {
        data = await performanceMonitoringService.getAgentPerformanceMetrics(agentId, period);
      } else if (strategyId) {
        data = await performanceMonitoringService.getStrategyPerformanceMetrics(strategyId, period);
      }
      
      setPerformance(data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading performance data:', error);
      setLoading(false);
    }
  }, [farmId, agentId, strategyId, period]);

  // Load active alerts
  const loadAlerts = React.useCallback(async () => {
    try {
      const activeAlerts = await performanceMonitoringService.getActiveAlerts(farmId, agentId);
      setAlerts(activeAlerts || []);
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  }, [farmId, agentId]);

  // Initial data load
  React.useEffect(() => {
    loadPerformanceData();
    loadAlerts();
    
    // Set up refresh interval
    const intervalId = setInterval(() => {
      loadPerformanceData();
    }, refreshInterval);
    
    return () => clearInterval(intervalId);
  }, [loadPerformanceData, loadAlerts, refreshInterval]);

  // Listen for WebSocket performance updates
  React.useEffect(() => {
    const unsubscribe = performanceMonitoringService.subscribeToPerformanceUpdates((data) => {
      // Only update if the data is relevant to the current view
      if (
        (farmId && data.farm_id === farmId) ||
        (agentId && data.agent_id === agentId) ||
        (strategyId && data.strategy_id === strategyId)
      ) {
        setPerformance(prevPerf => ({
          ...prevPerf,
          ...data
        }));
      }
    });
    
    return unsubscribe;
  }, [farmId, agentId, strategyId]);

  // Listen for WebSocket alert updates
  React.useEffect(() => {
    if (lastMessage && lastMessage[WebSocketTopic.ALERTS]) {
      const alertMessage = lastMessage[WebSocketTopic.ALERTS];
      
      // Check if alert is relevant to current view
      if (
        (farmId && alertMessage.farm_id === farmId) ||
        (agentId && alertMessage.agent_id === agentId) ||
        (strategyId && alertMessage.strategy_id === strategyId)
      ) {
        // Update alerts
        loadAlerts();
      }
    }
  }, [lastMessage, farmId, agentId, strategyId, loadAlerts]);

  // Handle period change
  const handlePeriodChange = (newPeriod: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time') => {
    setPeriod(newPeriod);
  };

  // Handle alert acknowledgement
  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await performanceMonitoringService.acknowledgeAlert(alertId);
      // Refresh alerts
      loadAlerts();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="overview" className="flex items-center">
              <LineChart className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="trades">
              <BarChart className="h-4 w-4 mr-2" />
              Trades
            </TabsTrigger>
            <TabsTrigger value="advanced">
              <PieChart className="h-4 w-4 mr-2" />
              Advanced
            </TabsTrigger>
          </TabsList>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handlePeriodChange('daily')}
              className={period === 'daily' ? 'bg-primary/10' : ''}
            >
              Daily
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handlePeriodChange('weekly')}
              className={period === 'weekly' ? 'bg-primary/10' : ''}
            >
              Weekly
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handlePeriodChange('monthly')}
              className={period === 'monthly' ? 'bg-primary/10' : ''}
            >
              Monthly
            </Button>
          </div>
        </div>
        
        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* Alerts Section */}
          {alerts.length > 0 && (
            <div className="space-y-2">
              {alerts.map(alert => (
                <Alert 
                  key={alert.id} 
                  variant={
                    alert.severity === 'critical' ? 'destructive' : 
                    alert.severity === 'warning' ? 'default' : 'outline'
                  }
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <AlertTitle>
                        {alert.alert_type === 'drawdown' && 'Drawdown Alert'}
                        {alert.alert_type === 'win_rate' && 'Win Rate Alert'}
                        {alert.alert_type === 'volatility' && 'Volatility Alert'}
                        {alert.alert_type === 'profit_loss' && 'Profit/Loss Alert'}
                        {alert.alert_type === 'custom' && 'Custom Alert'}
                      </AlertTitle>
                      <AlertDescription>{alert.message}</AlertDescription>
                    </div>
                    {!alert.acknowledged && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleAcknowledgeAlert(alert.id)}
                      >
                        Acknowledge
                      </Button>
                    )}
                  </div>
                </Alert>
              ))}
            </div>
          )}
          
          {/* Main Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">Profit/Loss</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="flex flex-col">
                    <span className={`text-2xl font-bold ${
                      performance?.profit_loss && performance.profit_loss >= 0 
                        ? 'text-green-500' 
                        : 'text-red-500'
                    }`}>
                      {performance?.profit_loss 
                        ? `$${performance.profit_loss.toFixed(2)}` 
                        : '$0.00'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {performance?.profit_loss_percent 
                        ? `${(performance.profit_loss_percent * 100).toFixed(2)}%` 
                        : '0.00%'}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold">
                      {performance?.win_rate 
                        ? `${(performance.win_rate * 100).toFixed(1)}%` 
                        : '0.0%'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {performance 
                        ? `${performance.winning_trades || 0}/${performance.total_trades || 0} trades` 
                        : '0/0 trades'}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">Drawdown</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold text-amber-500">
                      {performance?.max_drawdown 
                        ? `${(performance.max_drawdown * 100).toFixed(2)}%` 
                        : '0.00%'}
                    </span>
                    <span className="text-xs text-muted-foreground">Max Drawdown</span>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">Sharpe Ratio</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold">
                      {performance?.sharpe_ratio 
                        ? performance.sharpe_ratio.toFixed(2) 
                        : '0.00'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {performance?.sharpe_ratio 
                        ? performance.sharpe_ratio > 1 
                          ? 'Good' 
                          : performance.sharpe_ratio > 0.5 
            
          ? 'Moderate'
          : 'Poor' 
                        : 'N/A'}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Equity Curve */}
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-lg font-medium">Equity Curve</CardTitle>
              <CardDescription>Performance over time</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-60 w-full" />
              ) : (
                <EquityCurveChart data={performance?.data?.equity_curve} />
              )}
            </CardContent>
          </Card>
          
          {/* Additional Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-lg font-medium">Win Rate</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-40 w-full" />
                ) : (
                  <WinRateChart winRate={performance?.win_rate} />
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-lg font-medium">Drawdown</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-40 w-full" />
                ) : (
                  <DrawdownChart drawdownCurve={performance?.data?.drawdown_curve} />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="trades" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trade Statistics</CardTitle>
              <CardDescription>Detailed view of trading performance</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Total Trades</h4>
                    <p className="text-2xl font-bold">{performance?.total_trades || 0}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Avg. Trade</h4>
                    <p className="text-2xl font-bold">
                      {performance && performance.total_trades > 0
                        ? `$${(performance.profit_loss / performance.total_trades).toFixed(2)}`
                        : '$0.00'}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Largest Win</h4>
                    <p className="text-2xl font-bold text-green-500">
                      {performance?.largest_win
                        ? `$${performance.largest_win.toFixed(2)}`
                        : '$0.00'}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Largest Loss</h4>
                    <p className="text-2xl font-bold text-red-500">
                      {performance?.largest_loss
                        ? `$${Math.abs(performance.largest_loss).toFixed(2)}`
                        : '$0.00'}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Avg. Win</h4>
                    <p className="text-2xl font-bold text-green-500">
                      {performance?.avg_win
                        ? `$${performance.avg_win.toFixed(2)}`
                        : '$0.00'}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Avg. Loss</h4>
                    <p className="text-2xl font-bold text-red-500">
                      {performance?.avg_loss
                        ? `$${Math.abs(performance.avg_loss).toFixed(2)}`
                        : '$0.00'}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Avg. Duration</h4>
                    <p className="text-2xl font-bold">
                      {performance?.avg_trade_duration
                        ? `${Math.round(performance.avg_trade_duration)} min`
                        : 'N/A'}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">ROI</h4>
                    <p className="text-2xl font-bold">
                      {performance?.roi
                        ? `${(performance.roi * 100).toFixed(2)}%`
                        : '0.00%'}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Recent Trades</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Recent trades would be displayed here */}
              <div className="text-center py-6 text-muted-foreground">
                Recent trades will be displayed here
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="advanced" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Metrics</CardTitle>
              <CardDescription>Detailed performance analysis</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Sharpe Ratio</h4>
                    <p className="text-2xl font-bold">
                      {performance?.sharpe_ratio
                        ? performance.sharpe_ratio.toFixed(2)
                        : 'N/A'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Risk-adjusted return (higher is better)
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Volatility</h4>
                    <p className="text-2xl font-bold">
                      {performance?.volatility
                        ? `${(performance.volatility * 100).toFixed(2)}%`
                        : 'N/A'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Standard deviation of returns
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Win/Loss Ratio</h4>
                    <p className="text-2xl font-bold">
                      {performance && performance.avg_loss !== 0
                        ? (Math.abs(performance.avg_win / performance.avg_loss)).toFixed(2)
                        : 'N/A'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ratio of average win to average loss
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Profit Factor</h4>
                    <p className="text-2xl font-bold">
                      {performance && performance.winning_trades > 0 && performance.losing_trades > 0
                        ? (performance.avg_win * performance.winning_trades / 
                           Math.abs(performance.avg_loss * performance.losing_trades)).toFixed(2)
                        : 'N/A'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Gross profit divided by gross loss
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Max Consecutive Wins</h4>
                    <p className="text-2xl font-bold">
                      {performance?.data?.max_consecutive_wins || 'N/A'}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Max Consecutive Losses</h4>
                    <p className="text-2xl font-bold">
                      {performance?.data?.max_consecutive_losses || 'N/A'}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Order Type Analysis</CardTitle>
              <CardDescription>Performance by order type</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    {['market', 'limit', 'stop', 'trailing_stop', 'oco', 'bracket'].map((type) => (
                      <div key={type} className="flex flex-col items-center p-2 border rounded-md">
                        <Badge variant="outline" className="mb-2 capitalize">
                          {type.replace('_', ' ')}
                        </Badge>
                        <span className="text-lg font-bold">
                          {performance?.data?.[`${type}_win_rate`] 
                            ? `${(performance.data[`${type}_win_rate`] * 100).toFixed(0)}%`
                            : 'N/A'}
                        </span>
                        <span className="text-xs text-muted-foreground">Win Rate</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="text-sm text-muted-foreground text-center mt-4">
                    This analysis shows the win rate for different order types used in your trading strategy.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <div className="flex justify-end">
            <Button onClick={() => window.print()}>
              Export Report
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
