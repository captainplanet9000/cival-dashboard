'use client';

import { useState, useEffect } from 'react';
import { DashboardWidget } from '@/components/ui/dashboard-widget';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TradingAgent, AgentStatus } from '@/types/agent-types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Activity, 
  AlertTriangle, 
  Brain, 
  CheckCircle2, 
  ChevronRight, 
  Clock, 
  PauseCircle, 
  PlayCircle, 
  Plus, 
  Settings, 
  XCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentPerformance {
  agent_id: string;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  profit_loss: number;
  win_rate: number;
  average_win: number;
  average_loss: number;
  largest_win: number;
  largest_loss: number;
  max_drawdown: number;
  sharpe_ratio: number;
}

interface AgentManagementWidgetProps {
  farmId?: string;
  className?: string;
  isLoading?: boolean;
  onRefresh?: () => Promise<void>;
  agents?: TradingAgent[];
  onAgentClick?: (agent: TradingAgent) => void;
  onCreateAgent?: () => void;
  onStartAgent?: (agentId: string) => Promise<void>;
  onStopAgent?: (agentId: string) => Promise<void>;
  onSettingsClick?: (agentId: string) => void;
}

export function AgentManagementWidget({
  farmId,
  className,
  isLoading = false,
  onRefresh,
  agents = [],
  onAgentClick,
  onCreateAgent,
  onStartAgent,
  onStopAgent,
  onSettingsClick
}: AgentManagementWidgetProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'details'>('overview');
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  
  // Generate mock data if real data is not provided
  const mockAgents: TradingAgent[] = agents.length > 0 ? agents : [
    {
      id: '1',
      name: 'BTC Trend Follower',
      description: 'Long-term trend following strategy for Bitcoin',
      farm_id: farmId || '1',
      strategy_id: 'trend-following',
      status: 'running',
      is_live: true,
      trading_pair: 'BTC/USDT',
      exchange_id: 'binance',
      risk_level: 'medium',
      created_at: '2023-01-15T10:00:00Z',
      updated_at: '2023-04-27T15:30:00Z',
      last_active: '2023-04-28T08:45:12Z',
      strategy: {
        id: 'trend-following',
        name: 'Trend Following',
        description: 'Follows medium to long-term market trends',
        category: 'trend',
        risk_level: 'medium',
        default_parameters: {
          maxOrderSize: 0.1,
          maxPositionSize: 1.0,
          maxLeverage: 3,
          maxDrawdown: 10,
          stopLossPercentage: 2,
          takeProfitPercentage: 5
        },
        required_indicators: ['EMA', 'RSI', 'MACD'],
        timeframes: ['1h', '4h', '1d'],
        markets: ['BTC/USDT', 'ETH/USDT'],
        created_at: '2022-12-01T00:00:00Z',
        updated_at: '2023-03-15T00:00:00Z',
        version: '2.1.0',
        author: 'TradingFarm Team',
        is_public: true,
        performance_metrics: {
          win_rate: 68,
          profit_factor: 2.3,
          sharpe_ratio: 1.7,
          max_drawdown: 15,
          average_trade: 1.2
        }
      },
      performance: {
        total_trades: 127,
        winning_trades: 82,
        losing_trades: 45,
        profit_loss: 3750,
        win_rate: 64.6,
        average_win: 150,
        average_loss: 90,
        largest_win: 850,
        largest_loss: 320,
        max_drawdown: 1200,
        sharpe_ratio: 1.85
      }
    },
    {
      id: '2',
      name: 'ETH Swing Trader',
      description: 'Short-term swing trading for Ethereum with moderate risk',
      farm_id: farmId || '1',
      strategy_id: 'swing-trading',
      status: 'idle',
      is_live: false,
      trading_pair: 'ETH/USDT',
      exchange_id: 'binance',
      risk_level: 'medium',
      created_at: '2023-02-10T14:30:00Z',
      updated_at: '2023-04-26T09:15:00Z',
      last_active: '2023-04-26T09:15:00Z',
      strategy: {
        id: 'swing-trading',
        name: 'Swing Trading',
        description: 'Captures short to medium-term price movements',
        category: 'swing',
        risk_level: 'medium',
        default_parameters: {
          maxOrderSize: 0.5,
          maxPositionSize: 2.0,
          maxLeverage: 5,
          maxDrawdown: 15,
          stopLossPercentage: 3,
          takeProfitPercentage: 8
        },
        required_indicators: ['Bollinger Bands', 'RSI', 'Volume'],
        timeframes: ['15m', '1h', '4h'],
        markets: ['ETH/USDT', 'BNB/USDT'],
        created_at: '2022-11-15T00:00:00Z',
        updated_at: '2023-02-28T00:00:00Z',
        version: '1.8.0',
        author: 'TradingFarm Team',
        is_public: true,
        performance_metrics: {
          win_rate: 55,
          profit_factor: 1.8,
          sharpe_ratio: 1.4,
          max_drawdown: 22,
          average_trade: 0.9
        }
      },
      performance: {
        total_trades: 93,
        winning_trades: 48,
        losing_trades: 45,
        profit_loss: 2150,
        win_rate: 51.6,
        average_win: 125,
        average_loss: 105,
        largest_win: 560,
        largest_loss: 280,
        max_drawdown: 820,
        sharpe_ratio: 1.25
      }
    },
    {
      id: '3',
      name: 'SOL Scalper',
      description: 'High-frequency scalping strategy for Solana',
      farm_id: farmId || '1',
      strategy_id: 'scalping',
      status: 'error',
      is_live: false,
      trading_pair: 'SOL/USDT',
      exchange_id: 'bybit',
      risk_level: 'high',
      created_at: '2023-03-05T08:20:00Z',
      updated_at: '2023-04-27T18:45:00Z',
      last_active: '2023-04-27T18:40:32Z',
      strategy: {
        id: 'scalping',
        name: 'Scalping',
        description: 'Captures small price movements with high frequency',
        category: 'scalping',
        risk_level: 'high',
        default_parameters: {
          maxOrderSize: 5.0,
          maxPositionSize: 10.0,
          maxLeverage: 10,
          maxDrawdown: 25,
          stopLossPercentage: 1,
          takeProfitPercentage: 2
        },
        required_indicators: ['Stochastic', 'Moving Averages', 'Order Book Depth'],
        timeframes: ['1m', '5m', '15m'],
        markets: ['SOL/USDT', 'AVAX/USDT'],
        created_at: '2023-01-10T00:00:00Z',
        updated_at: '2023-03-22T00:00:00Z',
        version: '1.3.5',
        author: 'TradingFarm Team',
        is_public: true,
        performance_metrics: {
          win_rate: 72,
          profit_factor: 1.5,
          sharpe_ratio: 1.1,
          max_drawdown: 30,
          average_trade: 0.5
        }
      },
      performance: {
        total_trades: 312,
        winning_trades: 218,
        losing_trades: 94,
        profit_loss: 1890,
        win_rate: 69.9,
        average_win: 35,
        average_loss: 40,
        largest_win: 210,
        largest_loss: 180,
        max_drawdown: 580,
        sharpe_ratio: 1.05
      }
    }
  ];
  
  // Calculate performance summary data
  const totalAgents = mockAgents.length;
  const activeAgents = mockAgents.filter(a => a.status === 'running').length;
  const totalProfitLoss = mockAgents.reduce((sum, agent) => sum + (agent.performance?.profit_loss || 0), 0);
  const averageWinRate = mockAgents.reduce((sum, agent) => sum + (agent.performance?.win_rate || 0), 0) / totalAgents;
  
  // Format currency with $ and 2 decimal places
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };
  
  // Format time as relative time
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };
  
  // Handle agent actions
  const handleStartAgent = async (agentId: string) => {
    if (!onStartAgent) return;
    
    setActionLoading(prev => ({ ...prev, [agentId]: true }));
    try {
      await onStartAgent(agentId);
    } finally {
      setActionLoading(prev => ({ ...prev, [agentId]: false }));
    }
  };
  
  const handleStopAgent = async (agentId: string) => {
    if (!onStopAgent) return;
    
    setActionLoading(prev => ({ ...prev, [agentId]: true }));
    try {
      await onStopAgent(agentId);
    } finally {
      setActionLoading(prev => ({ ...prev, [agentId]: false }));
    }
  };
  
  // Get status icon based on agent status
  const getStatusIcon = (status: AgentStatus) => {
    switch (status) {
      case 'running':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'idle':
        return <PauseCircle className="h-4 w-4 text-gray-400" />;
      case 'starting':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'stopping':
        return <Clock className="h-4 w-4 text-orange-500 animate-pulse" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-400" />;
    }
  };
  
  // Get status text and class based on agent status
  const getStatusDetails = (status: AgentStatus) => {
    switch (status) {
      case 'running':
        return { text: 'Running', class: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' };
      case 'idle':
        return { text: 'Idle', class: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' };
      case 'starting':
        return { text: 'Starting', class: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' };
      case 'stopping':
        return { text: 'Stopping', class: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' };
      case 'error':
        return { text: 'Error', class: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' };
      case 'paused':
        return { text: 'Paused', class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' };
      default:
        return { text: status, class: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' };
    }
  };
  
  // Performance chart data
  const performanceData = mockAgents.map(agent => ({
    name: agent.name,
    profit: agent.performance?.profit_loss || 0,
    winRate: agent.performance?.win_rate || 0,
  }));

  return (
    <DashboardWidget
      title="Agent Management"
      description="Manage and monitor your trading agents"
      className={className}
      isLoading={isLoading}
      isRefreshable={!!onRefresh}
      isExpandable
      onRefresh={onRefresh}
      footerContent={
        <Button onClick={onCreateAgent} size="sm" className="w-full" disabled={isLoading}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Agent
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3">
            <div className="text-sm text-muted-foreground">Total Agents</div>
            <div className="text-xl font-bold">
              {isLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                totalAgents
              )}
            </div>
          </Card>
          
          <Card className="p-3">
            <div className="text-sm text-muted-foreground">Active Agents</div>
            <div className="text-xl font-bold">
              {isLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                activeAgents
              )}
            </div>
          </Card>
          
          <Card className="p-3">
            <div className="text-sm text-muted-foreground">Total P&L</div>
            <div className={cn("text-xl font-bold", 
              totalProfitLoss > 0 ? "text-green-600" : "text-red-600")}>
              {isLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                formatCurrency(totalProfitLoss)
              )}
            </div>
          </Card>
          
          <Card className="p-3">
            <div className="text-sm text-muted-foreground">Avg. Win Rate</div>
            <div className="text-xl font-bold">
              {isLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                `${averageWinRate.toFixed(1)}%`
              )}
            </div>
          </Card>
        </div>
        
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : mockAgents.length > 0 ? (
              <div className="space-y-3">
                {mockAgents.map((agent) => (
                  <Card 
                    key={agent.id}
                    className={cn(
                      "p-3 cursor-pointer hover:bg-muted/40 transition-colors",
                      agent.status === 'error' && "border-red-300"
                    )}
                    onClick={() => onAgentClick?.(agent)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-9 w-9 bg-primary/10">
                          <AvatarFallback className="text-xs">
                            <Brain className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{agent.name}</div>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Badge 
                              variant="outline" 
                              className={cn("mr-2 px-1 py-0", 
                                getStatusDetails(agent.status).class
                              )}
                            >
                              {getStatusDetails(agent.status).text}
                            </Badge>
                            <span>{agent.trading_pair}</span>
                            {agent.is_live && (
                              <Badge variant="secondary" className="ml-2 px-1 py-0">LIVE</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {agent.status === 'running' && onStopAgent && (
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStopAgent(agent.id);
                            }}
                            disabled={actionLoading[agent.id]}
                          >
                            <PauseCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {(agent.status === 'idle' || agent.status === 'error') && onStartAgent && (
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartAgent(agent.id);
                            }}
                            disabled={actionLoading[agent.id]}
                          >
                            <PlayCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {onSettingsClick && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSettingsClick(agent.id);
                            }}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    
                    {/* Performance stats */}
                    <div className="grid grid-cols-2 mt-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Profit/Loss: </span>
                        <span className={agent.performance?.profit_loss && agent.performance.profit_loss > 0 ? 
                          "text-green-600" : "text-red-600"}>
                          {formatCurrency(agent.performance?.profit_loss || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Win Rate: </span>
                        <span>{agent.performance?.win_rate?.toFixed(1) || 0}%</span>
                      </div>
                    </div>
                    
                    {/* Last active */}
                    <div className="mt-2 flex items-center text-xs text-muted-foreground">
                      <Activity className="h-3 w-3 mr-1" />
                      Last active: {formatTime(agent.last_active || agent.updated_at)}
                    </div>
                    
                    {/* Progress bar for running agents */}
                    {agent.status === 'running' && (
                      <Progress value={75} className="h-1 mt-2" />
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[150px] bg-muted/20 rounded-md">
                <div className="text-center">
                  <p className="text-muted-foreground mb-2">No agents configured</p>
                  <Button size="sm" onClick={onCreateAgent}>Create Agent</Button>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="details">
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <div className="space-y-4">
                {/* Performance chart */}
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={performanceData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                      <XAxis dataKey="name" />
                      <YAxis yAxisId="left" orientation="left" stroke="#3B82F6" />
                      <YAxis yAxisId="right" orientation="right" stroke="#10B981" />
                      <Tooltip />
                      <Bar yAxisId="left" dataKey="profit" name="Profit" fill="#3B82F6" />
                      <Bar yAxisId="right" dataKey="winRate" name="Win Rate %" fill="#10B981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Detailed table */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Agent</TableHead>
                        <TableHead>Strategy</TableHead>
                        <TableHead>Trades</TableHead>
                        <TableHead>Win Rate</TableHead>
                        <TableHead>P&L</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockAgents.map((agent) => (
                        <TableRow key={agent.id}>
                          <TableCell>
                            {getStatusIcon(agent.status)}
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{agent.name}</span>
                              <span className="text-xs text-muted-foreground">{agent.trading_pair}</span>
                            </div>
                          </TableCell>
                          <TableCell>{agent.strategy?.name || '-'}</TableCell>
                          <TableCell>{agent.performance?.total_trades || 0}</TableCell>
                          <TableCell>{agent.performance?.win_rate?.toFixed(1) || 0}%</TableCell>
                          <TableCell className={agent.performance?.profit_loss && agent.performance.profit_loss > 0 ? 
                            "text-green-600" : "text-red-600"}>
                            {formatCurrency(agent.performance?.profit_loss || 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              {agent.status === 'running' && onStopAgent && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleStopAgent(agent.id)}
                                  disabled={actionLoading[agent.id]}
                                >
                                  Stop
                                </Button>
                              )}
                              {(agent.status === 'idle' || agent.status === 'error') && onStartAgent && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleStartAgent(agent.id)}
                                  disabled={actionLoading[agent.id]}
                                >
                                  Start
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => onAgentClick?.(agent)}
                              >
                                Details
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardWidget>
  );
}
