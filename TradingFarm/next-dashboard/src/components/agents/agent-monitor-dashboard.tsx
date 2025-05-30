"use client";

import { useState, useEffect } from 'react';
import { useSocket } from '@/providers/socket-provider';
import { AIAgentV2 } from '@/context/ai-agent-v2-context';
import { TRADING_EVENTS } from '@/constants/socket-events';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { 
  Activity, 
  AlertCircle, 
  ArrowDownRight, 
  ArrowUpRight, 
  BarChart4, 
  Bot, 
  Brain, 
  Clock, 
  Play, 
  Pause, 
  RefreshCw, 
  Settings2, 
  Wallet,
  LineChart,
  MessageSquare,
  DollarSign,
  Layers
} from 'lucide-react';

// Types for agent monitoring
interface AgentPerformanceMetrics {
  totalTrades: number;
  winRate: number;
  profitLoss: number;
  profitLossPercent: number;
  averageTradeTime: number;
  tradesPerDay: number;
  lastTradeTime: string;
  drawdown: number;
}

interface AgentAlert {
  id: string;
  agentId: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

interface AgentTrade {
  id: string;
  agentId: string;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  timestamp: string;
  status: 'open' | 'closed';
  profitLoss?: number;
  profitLossPercent?: number;
}

interface AgentMonitorProps {
  agentId: string;
  initialData?: AIAgentV2;
}

export function AgentMonitorDashboard({ agentId, initialData }: AgentMonitorProps) {
  const { socket } = useSocket();
  const { toast } = useToast();
  
  const [agent, setAgent] = useState<AIAgentV2 | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [performance, setPerformance] = useState<AgentPerformanceMetrics | null>(null);
  const [trades, setTrades] = useState<AgentTrade[]>([]);
  const [alerts, setAlerts] = useState<AgentAlert[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Fetch agent data on mount if not provided
  useEffect(() => {
    if (!initialData && agentId) {
      fetchAgentData();
    }
    
    // Set up socket listeners
    if (socket) {
      setupSocketListeners();
    }
    
    return () => {
      if (socket) {
        cleanupSocketListeners();
      }
    };
  }, [socket, agentId, initialData]);
  
  const fetchAgentData = async () => {
    try {
      setLoading(true);
      // Fetch agent data from API
      // const response = await fetch(`/api/agents/${agentId}`);
      // const data = await response.json();
      // setAgent(data);
      
      // For demo purposes, create some sample data
      setAgent({
        id: agentId,
        name: "Trend Navigator",
        status: "active",
        specialization: ["trend_following"],
        wallet_address: "0x1234567890abcdef1234567890abcdef12345678",
        farm_id: "farm-001",
        settings: {
          automation_level: "full",
          risk_level: 3,
          max_drawdown: 15,
          timeframes: ["15m", "1h", "4h"],
          indicators: ["RSI", "MACD", "Moving Averages"],
          trade_size: 250,
          trades_per_day: 5,
          position_size_percent: 10,
          max_open_positions: 3,
          strategyType: "trend_following"
        },
        instructions: [
          "Focus on strong trends only",
          "Exit positions when RSI indicates overbought/oversold"
        ],
        exchange: {
          name: "Binance",
          apiKey: "***********",
          apiSecret: "***********",
          apiPassphrase: "",
          apiEndpoint: ""
        }
      });
      
      // Sample performance data
      setPerformance({
        totalTrades: 32,
        winRate: 68.5,
        profitLoss: 278.45,
        profitLossPercent: 12.8,
        averageTradeTime: 4.3, // hours
        tradesPerDay: 2.4,
        lastTradeTime: new Date().toISOString(),
        drawdown: 5.7
      });
      
      // Sample trades
      setTrades([
        {
          id: "trade-001",
          agentId: agentId,
          symbol: "BTC/USDT",
          side: "buy",
          amount: 0.05,
          price: 43250.75,
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          status: "open"
        },
        {
          id: "trade-002",
          agentId: agentId,
          symbol: "ETH/USDT",
          side: "sell",
          amount: 0.8,
          price: 2324.50,
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          status: "closed",
          profitLoss: 32.50,
          profitLossPercent: 1.75
        },
        {
          id: "trade-003",
          agentId: agentId,
          symbol: "SOL/USDT",
          side: "buy",
          amount: 5,
          price: 143.25,
          timestamp: new Date(Date.now() - 172800000).toISOString(),
          status: "closed",
          profitLoss: -18.75,
          profitLossPercent: -2.62
        }
      ]);
      
      // Sample alerts
      setAlerts([
        {
          id: "alert-001",
          agentId: agentId,
          type: "success",
          message: "Successfully executed BTC/USDT trade",
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          acknowledged: true
        },
        {
          id: "alert-002",
          agentId: agentId,
          type: "warning",
          message: "Maximum drawdown approaching threshold (5.7%)",
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          acknowledged: false
        },
        {
          id: "alert-003",
          agentId: agentId,
          type: "info",
          message: "Strategy executed: Trend following on BTC/USDT 1h timeframe",
          timestamp: new Date(Date.now() - 10800000).toISOString(),
          acknowledged: true
        }
      ]);
      
    } catch (error) {
      console.error("Error fetching agent data:", error);
      toast({
        title: "Error",
        description: "Failed to load agent data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const setupSocketListeners = () => {
    if (!socket) return;
    
    // Listen for agent status updates
    socket.on(TRADING_EVENTS.AGENT_STATUS, (data: any) => {
      if (data.agentId === agentId) {
        setAgent(prev => prev ? { ...prev, status: data.status } : null);
        setLastUpdated(new Date());
      }
    });
    
    // Listen for agent performance updates
    socket.on(TRADING_EVENTS.AGENT_PERFORMANCE, (data: any) => {
      if (data.agentId === agentId) {
        setPerformance(data.performance);
        setLastUpdated(new Date());
      }
    });
    
    // Listen for agent trade updates
    socket.on(TRADING_EVENTS.AGENT_TRADE, (data: any) => {
      if (data.agentId === agentId) {
        setTrades(prev => {
          // Check if trade already exists
          const existingTradeIndex = prev.findIndex(trade => trade.id === data.trade.id);
          
          if (existingTradeIndex >= 0) {
            // Update existing trade
            const updatedTrades = [...prev];
            updatedTrades[existingTradeIndex] = data.trade;
            return updatedTrades;
          } else {
            // Add new trade
            return [data.trade, ...prev];
          }
        });
        setLastUpdated(new Date());
      }
    });
    
    // Listen for agent alerts
    socket.on(TRADING_EVENTS.AGENT_ALERT, (data: any) => {
      if (data.agentId === agentId) {
        setAlerts(prev => [data.alert, ...prev]);
        setLastUpdated(new Date());
        
        // Show toast for new alerts
        if (data.alert.type === 'error' || data.alert.type === 'warning') {
          toast({
            title: data.alert.type === 'error' ? 'Agent Error' : 'Agent Warning',
            description: data.alert.message,
            variant: data.alert.type === 'error' ? 'destructive' : 'default'
          });
        }
      }
    });
  };
  
  const cleanupSocketListeners = () => {
    if (!socket) return;
    
    socket.off(TRADING_EVENTS.AGENT_STATUS);
    socket.off(TRADING_EVENTS.AGENT_PERFORMANCE);
    socket.off(TRADING_EVENTS.AGENT_TRADE);
    socket.off(TRADING_EVENTS.AGENT_ALERT);
  };
  
  const handleRefresh = () => {
    fetchAgentData();
  };
  
  const handlePauseAgent = () => {
    if (!socket || !agent) return;
    
    // Send command to pause agent
    socket.emit(TRADING_EVENTS.AGENT_COMMAND, {
      agentId: agentId,
      command: 'pause',
      params: {}
    });
    
    // Optimistically update UI
    setAgent(prev => prev ? { ...prev, status: 'paused' } : null);
    
    toast({
      title: "Agent Paused",
      description: `${agent.name} has been paused.`
    });
  };
  
  const handleResumeAgent = () => {
    if (!socket || !agent) return;
    
    // Send command to resume agent
    socket.emit(TRADING_EVENTS.AGENT_COMMAND, {
      agentId: agentId,
      command: 'resume',
      params: {}
    });
    
    // Optimistically update UI
    setAgent(prev => prev ? { ...prev, status: 'active' } : null);
    
    toast({
      title: "Agent Resumed",
      description: `${agent.name} is now active.`
    });
  };
  
  const handleAcknowledgeAlert = (alertId: string) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, acknowledged: true } 
          : alert
      )
    );
    
    // In a real app, you'd also send this to the backend
    if (socket) {
      socket.emit(TRADING_EVENTS.AGENT_COMMAND, {
        agentId: agentId,
        command: 'acknowledge_alert',
        params: { alertId }
      });
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-60">
        <RefreshCw className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center h-60 space-y-4">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <h3 className="text-lg font-medium">Agent Not Found</h3>
        <p className="text-muted-foreground">Unable to load agent data. The agent may have been deleted.</p>
        <Button onClick={handleRefresh}>Retry</Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Bot className="h-8 w-8" />
          <div>
            <h2 className="text-2xl font-bold">{agent.name}</h2>
            <div className="flex items-center space-x-2">
              <Badge 
                variant={
                  agent.status === 'active' ? 'default' : 
                  agent.status === 'paused' ? 'outline' : 
                  'secondary'
                }
              >
                {agent.status === 'active' ? 'Active' : 
                 agent.status === 'paused' ? 'Paused' : 
                 'Offline'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {agent.status === 'active' ? (
            <Button variant="outline" size="sm" onClick={handlePauseAgent}>
              <Pause className="h-4 w-4 mr-2" />
              Pause Agent
            </Button>
          ) : (
            <Button variant="default" size="sm" onClick={handleResumeAgent}>
              <Play className="h-4 w-4 mr-2" />
              Resume Agent
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Performance Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <BarChart4 className="h-4 w-4 mr-2 text-primary" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performance && performance.profitLossPercent}%
              <span className={`text-sm ml-2 ${performance && performance.profitLossPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                ${performance ? performance.profitLoss.toFixed(2) : '0.00'}
                {performance && performance.profitLossPercent >= 0 ? 
                  <ArrowUpRight className="h-4 w-4 inline ml-1" /> : 
                  <ArrowDownRight className="h-4 w-4 inline ml-1" />
                }
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Profit/Loss</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Activity className="h-4 w-4 mr-2 text-primary" />
              Win Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performance?.winRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Based on {performance?.totalTrades} total trades</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <AlertCircle className="h-4 w-4 mr-2 text-primary" />
              Drawdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performance?.drawdown}%
              <span className="text-sm ml-2 text-muted-foreground">
                (Max: {agent?.settings?.max_drawdown || agent?.settings?.maxDrawdown || 0}%)
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {performance && agent?.settings && 
               ((performance.drawdown < ((agent.settings.max_drawdown || agent.settings.maxDrawdown || 0) / 2)) ? 'Safe' : 
               (performance.drawdown < (agent.settings.max_drawdown || agent.settings.maxDrawdown || 0)) ? 'Warning' : 'Critical')}
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabs for Trades, Alerts, and Settings */}
      <Tabs defaultValue="trades" className="mt-6">
        <TabsList>
          <TabsTrigger value="trades" className="flex items-center">
            <LineChart className="h-4 w-4 mr-2" />
            Trades
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            Alerts
            {alerts.filter(a => !a.acknowledged).length > 0 && (
              <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                {alerts.filter(a => !a.acknowledged).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center">
            <Settings2 className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="trades" className="space-y-4">
          <div className="rounded-md border">
            <div className="grid grid-cols-7 gap-2 p-4 border-b bg-muted/50 font-medium text-sm">
              <div>Symbol</div>
              <div>Side</div>
              <div>Amount</div>
              <div>Price</div>
              <div>Status</div>
              <div>P/L</div>
              <div>Time</div>
            </div>
            
            {trades.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No trades recorded yet
              </div>
            ) : (
              <div className="divide-y">
                {trades.map(trade => (
                  <div key={trade.id} className="grid grid-cols-7 gap-2 p-4 text-sm">
                    <div className="font-medium">{trade.symbol}</div>
                    <div>
                      <Badge variant={trade.side === 'buy' ? 'default' : 'destructive'}>
                        {trade.side.toUpperCase()}
                      </Badge>
                    </div>
                    <div>{trade.amount}</div>
                    <div>${trade.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div>
                      <Badge variant={trade.status === 'open' ? 'outline' : 'secondary'}>
                        {trade.status}
                      </Badge>
                    </div>
                    <div className={trade.profitLossPercent !== undefined && trade.profitLossPercent >= 0 ? 'text-green-500' : 
                      trade.profitLossPercent !== undefined && trade.profitLossPercent < 0 ? 'text-red-500' : 'text-muted-foreground'}>
                      {trade.profitLossPercent !== undefined ? 
                        `${trade.profitLossPercent >= 0 ? '+' : ''}${trade.profitLossPercent.toFixed(2)}%` : 
                        '-'}
                    </div>
                    <div className="text-muted-foreground">
                      {new Date(trade.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="alerts" className="space-y-4">
          {alerts.length === 0 ? (
            <div className="text-center p-12 border rounded-md">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <AlertCircle className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-medium">No alerts</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                There are no alerts for this agent yet.
              </p>
            </div>
          ) : (
            <div className="divide-y border rounded-md">
              {alerts.map(alert => (
                <div key={alert.id} className={`p-4 ${alert.acknowledged ? '' : 'bg-muted/30'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`mt-0.5 ${
                        alert.type === 'error' ? 'text-destructive' : 
                        alert.type === 'warning' ? 'text-yellow-500' : 
                        alert.type === 'success' ? 'text-green-500' : 
                        'text-blue-500'
                      }`}>
                        <AlertCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-medium">
                          {alert.type === 'error' ? 'Error' : 
                           alert.type === 'warning' ? 'Warning' : 
                           alert.type === 'success' ? 'Success' : 
                           'Information'}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    {!alert.acknowledged && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleAcknowledgeAlert(alert.id)}
                      >
                        Acknowledge
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center">
                  <Brain className="h-5 w-5 mr-2" />
                  Trading Strategy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">Strategy Type</h4>
                  <p className="text-sm capitalize">{agent?.settings?.strategyType 
                    ? agent.settings.strategyType.replace(/_/g, ' ') 
                    : 'Not specified'}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-1">Timeframes</h4>
                  <div className="flex flex-wrap gap-2">
                    {agent?.settings?.timeframes?.length 
                      ? agent.settings.timeframes.map(timeframe => (
                        <Badge key={timeframe} variant="outline">
                          {timeframe}
                        </Badge>
                      ))
                      : <p className="text-sm text-muted-foreground">No timeframes specified</p>
                    }
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-1">Indicators</h4>
                  <div className="flex flex-wrap gap-2">
                    {agent?.settings?.indicators?.length 
                      ? agent.settings.indicators.map(indicator => (
                        <Badge key={indicator} variant="outline">
                          {indicator}
                        </Badge>
                      ))
                      : <p className="text-sm text-muted-foreground">No indicators specified</p>
                    }
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center">
                  <Settings2 className="h-5 w-5 mr-2" />
                  Risk Parameters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">Risk Level</h4>
                  <p className="text-sm">{agent.settings.risk_level} / 5</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-1">Position Size</h4>
                  <p className="text-sm">{agent.settings.position_size_percent}% of balance</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-1">Max Drawdown</h4>
                  <p className="text-sm">{agent.settings.max_drawdown}%</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-1">Max Open Positions</h4>
                  <p className="text-sm">{agent.settings.max_open_positions}</p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                <Wallet className="h-5 w-5 mr-2" />
                Exchange Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">Exchange</h4>
                  <p className="text-sm">{agent?.exchange?.name || 'Not configured'}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-1">API Credentials</h4>
                  <div className="space-y-2">
                    {agent?.exchange ? (
                      <>
                        <div className="flex items-center">
                          <span className="text-sm text-muted-foreground mr-2">API Key:</span>
                          <Badge variant="outline">•••••••••••••</Badge>
                        </div>
                        <div className="flex items-center">
                          <span className="text-sm text-muted-foreground mr-2">API Secret:</span>
                          <Badge variant="outline">•••••••••••••</Badge>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No API credentials configured</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
