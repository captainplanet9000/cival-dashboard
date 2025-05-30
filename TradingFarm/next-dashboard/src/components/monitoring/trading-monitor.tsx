"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate, formatPercent } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { 
  Activity, 
  AlertTriangle, 
  ArrowDownRight, 
  ArrowUpRight, 
  Bell, 
  CheckCircle2, 
  Clock, 
  Eye, 
  MoreHorizontal, 
  RefreshCw, 
  Search, 
  ShieldAlert, 
  XCircle 
} from "lucide-react";

// Types for trading monitor
export interface TradeItem {
  id: string;
  agent: string;
  strategy: string;
  asset: string;
  side: 'buy' | 'sell';
  status: 'pending' | 'executed' | 'canceled' | 'failed';
  price: number;
  quantity: number;
  totalValue: number;
  timestamp: string;
  exchange: string;
}

export interface PositionItem {
  id: string;
  agent: string;
  strategy: string;
  asset: string;
  exchange: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  openDate: string;
}

export interface AgentStatus {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error' | 'paused';
  lastExecuted: string;
  tradesLast24h: number;
  successRate: number;
  errorMessage?: string;
}

export interface ExchangeStatus {
  name: string;
  status: 'connected' | 'disconnected' | 'limited';
  lastConnected: string;
  apiUsage: number;
  apiLimit: number;
  errorMessage?: string;
}

interface TradingMonitorProps {
  farmId: string;
  refreshInterval?: number; // In seconds
  className?: string;
}

export function TradingMonitor({ farmId, refreshInterval = 30, className = '' }: TradingMonitorProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('trades');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // State for each data type
  const [recentTrades, setRecentTrades] = useState<TradeItem[]>([]);
  const [openPositions, setOpenPositions] = useState<PositionItem[]>([]);
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>([]);
  const [exchangeStatuses, setExchangeStatuses] = useState<ExchangeStatus[]>([]);
  const [alerts, setAlerts] = useState<{ id: string; level: 'info' | 'warning' | 'error'; message: string; timestamp: string }[]>([]);
  
  // Load data on mount and at refresh interval
  useEffect(() => {
    loadMonitoringData();
    
    const intervalId = setInterval(() => {
      loadMonitoringData(true);
    }, refreshInterval * 1000);
    
    return () => clearInterval(intervalId);
  }, [farmId, refreshInterval]);
  
  // Function to load monitoring data
  const loadMonitoringData = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      if (silent) setIsRefreshing(true);
      
      // In a real implementation, these would be API calls to fetch live data
      // For now we'll simulate with mock data
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data generation
      setRecentTrades(generateMockTrades());
      setOpenPositions(generateMockPositions());
      setAgentStatuses(generateMockAgentStatuses());
      setExchangeStatuses(generateMockExchangeStatuses());
      setAlerts(generateMockAlerts());
      
      setLastUpdated(new Date());
      
      if (silent) {
        toast({
          title: "Monitor Updated",
          description: "Trading data has been refreshed",
          duration: 3000,
        });
      }
    } catch (error) {
      console.error("Error loading monitoring data:", error);
      toast({
        title: "Error Refreshing",
        description: "Failed to update trading data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };
  
  // Manual refresh handler
  const handleRefresh = () => {
    loadMonitoringData(true);
  };
  
  // Helper to get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
      case 'executed':
      case 'connected':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'pending':
      case 'paused':
      case 'limited':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'inactive':
      case 'disconnected':
        return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
      case 'error':
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Error</Badge>;
      case 'canceled':
        return <Badge className="bg-gray-100 text-gray-800">Canceled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Helper to get PnL display
  const getPnlDisplay = (pnl: number, pnlPercent: number) => {
    const isPositive = pnl >= 0;
    return (
      <div className={`flex items-center ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? 
          <ArrowUpRight className="mr-1 h-4 w-4" /> : 
          <ArrowDownRight className="mr-1 h-4 w-4" />
        }
        <span className="font-medium">{formatCurrency(pnl)}</span>
        <span className="ml-1 text-xs">({formatPercent(pnlPercent)})</span>
      </div>
    );
  };
  
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Trading Monitor</CardTitle>
          <CardDescription>Loading trading activity...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-72 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center">
              <Activity className="mr-2 h-5 w-5 text-primary" />
              Trading Monitor
            </CardTitle>
            <CardDescription>
              Real-time tracking of trading activity and agent performance
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="px-6">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="trades" className="text-xs">Recent Trades</TabsTrigger>
            <TabsTrigger value="positions" className="text-xs">Open Positions</TabsTrigger>
            <TabsTrigger value="agents" className="text-xs">Agent Status</TabsTrigger>
            <TabsTrigger value="exchanges" className="text-xs">Exchange Status</TabsTrigger>
            <TabsTrigger value="alerts" className="text-xs">Alerts & Notifications</TabsTrigger>
          </TabsList>
        </div>
        
        <CardContent className="pt-4 pb-3">
          <TabsContent value="trades" className="m-0">
            {recentTrades.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead>Side</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Exchange</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTrades.map((trade) => (
                    <TableRow key={trade.id}>
                      <TableCell className="text-xs">
                        {new Date(trade.timestamp).toLocaleTimeString()}
                      </TableCell>
                      <TableCell className="font-medium">{trade.agent}</TableCell>
                      <TableCell>{trade.asset}</TableCell>
                      <TableCell>
                        <Badge variant={trade.side === 'buy' ? 'default' : 'outline'}>
                          {trade.side.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(trade.price)}</TableCell>
                      <TableCell>{trade.quantity.toFixed(4)}</TableCell>
                      <TableCell>{formatCurrency(trade.totalValue)}</TableCell>
                      <TableCell>{getStatusBadge(trade.status)}</TableCell>
                      <TableCell className="text-xs">{trade.exchange}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center h-40">
                <p className="text-muted-foreground">No recent trades found</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="positions" className="m-0">
            {openPositions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Entry Price</TableHead>
                    <TableHead>Current Price</TableHead>
                    <TableHead>P&L</TableHead>
                    <TableHead>Open Date</TableHead>
                    <TableHead>Exchange</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {openPositions.map((position) => (
                    <TableRow key={position.id}>
                      <TableCell className="font-medium">{position.asset}</TableCell>
                      <TableCell>{position.agent}</TableCell>
                      <TableCell>{position.quantity.toFixed(4)}</TableCell>
                      <TableCell>{formatCurrency(position.entryPrice)}</TableCell>
                      <TableCell>{formatCurrency(position.currentPrice)}</TableCell>
                      <TableCell>
                        {getPnlDisplay(position.pnl, position.pnlPercent)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(position.openDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs">{position.exchange}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center h-40">
                <p className="text-muted-foreground">No open positions found</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="agents" className="m-0">
            {agentStatuses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {agentStatuses.map((agent) => (
                  <Card key={agent.id} className="border border-border">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{agent.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            Last active: {new Date(agent.lastExecuted).toLocaleString()}
                          </p>
                        </div>
                        {getStatusBadge(agent.status)}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <div className="text-xs">
                          <p className="text-muted-foreground">Trades (24h)</p>
                          <p className="font-medium">{agent.tradesLast24h}</p>
                        </div>
                        <div className="text-xs">
                          <p className="text-muted-foreground">Success Rate</p>
                          <p className="font-medium">{formatPercent(agent.successRate)}</p>
                        </div>
                      </div>
                      
                      {agent.status === 'error' && agent.errorMessage && (
                        <Alert variant="destructive" className="mt-3 py-2">
                          <AlertDescription className="text-xs">
                            {agent.errorMessage}
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40">
                <p className="text-muted-foreground">No agents found</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="exchanges" className="m-0">
            {exchangeStatuses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {exchangeStatuses.map((exchange) => (
                  <Card key={exchange.name} className="border border-border">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{exchange.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            Last connected: {new Date(exchange.lastConnected).toLocaleString()}
                          </p>
                        </div>
                        {getStatusBadge(exchange.status)}
                      </div>
                      
                      <div className="mt-3">
                        <div className="text-xs">
                          <p className="text-muted-foreground">API Usage</p>
                          <div className="flex items-center">
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${
                                  exchange.apiUsage / exchange.apiLimit > 0.8 ? 
                                  'bg-red-500' : 
                                  exchange.apiUsage / exchange.apiLimit > 0.5 ? 
                                  'bg-yellow-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${(exchange.apiUsage / exchange.apiLimit) * 100}%` }}
                              />
                            </div>
                            <span className="ml-2 font-medium">
                              {Math.round((exchange.apiUsage / exchange.apiLimit) * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {exchange.status !== 'connected' && exchange.errorMessage && (
                        <Alert variant="destructive" className="mt-3 py-2">
                          <AlertDescription className="text-xs">
                            {exchange.errorMessage}
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40">
                <p className="text-muted-foreground">No exchange connections found</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="alerts" className="m-0">
            {alerts.length > 0 ? (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <Alert 
                    key={alert.id} 
                    variant={
                      alert.level === 'error' ? 'destructive' : 
                      alert.level === 'warning' ? 'default' : 'outline'
                    }
                  >
                    <div className="flex items-start gap-2">
                      {alert.level === 'error' ? (
                        <ShieldAlert className="h-4 w-4 mt-0.5" />
                      ) : alert.level === 'warning' ? (
                        <AlertTriangle className="h-4 w-4 mt-0.5" />
                      ) : (
                        <Bell className="h-4 w-4 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <AlertTitle className="text-sm">
                          {alert.level === 'error' ? 'Critical Alert' : 
                            alert.level === 'warning' ? 'Warning' : 'Information'}
                        </AlertTitle>
                        <AlertDescription className="text-xs">
                          {alert.message}
                        </AlertDescription>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </Alert>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40">
                <p className="text-muted-foreground">No alerts or notifications</p>
              </div>
            )}
          </TabsContent>
        </CardContent>
      </Tabs>
      
      <CardFooter className="border-t bg-muted/30 flex justify-between py-2 px-6 text-xs text-muted-foreground">
        <div className="flex items-center">
          <Clock className="mr-1 h-3.5 w-3.5" />
          Last updated: {formatDate(lastUpdated)} ({formatRelativeTime(lastUpdated)})
        </div>
        <div>Farm ID: {farmId}</div>
      </CardFooter>
    </Card>
  );
}

// Helper function to format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds} sec ago`;
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} min ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
}

// Mock data generators for demonstration
function generateMockTrades(): TradeItem[] {
  const assets = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'DOT/USDT'];
  const agents = ['Momentum Trader', 'DCA Agent', 'Volatility Bot', 'Swing Trader'];
  const exchanges = ['Binance', 'Coinbase', 'Kraken', 'Bybit'];
  const statuses = ['pending', 'executed', 'executed', 'executed', 'failed', 'canceled'];
  const sides = ['buy', 'sell'];
  
  return Array.from({ length: 10 }, (_, i) => {
    const asset = assets[Math.floor(Math.random() * assets.length)];
    const side = sides[Math.floor(Math.random() * sides.length)];
    const price = 100 + Math.random() * 900;
    const quantity = 0.1 + Math.random() * 2;
    
    return {
      id: `trade-${i + 1}`,
      agent: agents[Math.floor(Math.random() * agents.length)],
      strategy: 'Cross-Chain Yield',
      asset,
      side: side as 'buy' | 'sell',
      status: statuses[Math.floor(Math.random() * statuses.length)] as any,
      price,
      quantity,
      totalValue: price * quantity,
      timestamp: new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000).toISOString(),
      exchange: exchanges[Math.floor(Math.random() * exchanges.length)]
    };
  });
}

function generateMockPositions(): PositionItem[] {
  const assets = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'DOT/USDT'];
  const agents = ['Momentum Trader', 'DCA Agent', 'Volatility Bot', 'Swing Trader'];
  const exchanges = ['Binance', 'Coinbase', 'Kraken', 'Bybit'];
  
  return Array.from({ length: 5 }, (_, i) => {
    const entryPrice = 100 + Math.random() * 900;
    const pnlPercent = -10 + Math.random() * 20;
    const quantity = 0.1 + Math.random() * 2;
    const currentPrice = entryPrice * (1 + pnlPercent / 100);
    
    return {
      id: `position-${i + 1}`,
      agent: agents[Math.floor(Math.random() * agents.length)],
      strategy: 'Cross-Chain Yield',
      asset: assets[Math.floor(Math.random() * assets.length)],
      exchange: exchanges[Math.floor(Math.random() * exchanges.length)],
      quantity,
      entryPrice,
      currentPrice,
      pnl: (currentPrice - entryPrice) * quantity,
      pnlPercent,
      openDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
    };
  });
}

function generateMockAgentStatuses(): AgentStatus[] {
  const agents = [
    { id: 'agent-1', name: 'Momentum Trader' },
    { id: 'agent-2', name: 'DCA Agent' },
    { id: 'agent-3', name: 'Volatility Bot' },
    { id: 'agent-4', name: 'Swing Trader' }
  ];
  
  const statuses = ['active', 'active', 'active', 'paused', 'error', 'inactive'];
  
  return agents.map(agent => {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    return {
      id: agent.id,
      name: agent.name,
      status: status as any,
      lastExecuted: new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000).toISOString(),
      tradesLast24h: Math.floor(Math.random() * 50),
      successRate: 0.7 + Math.random() * 0.29,
      errorMessage: status === 'error' ? 'API rate limit exceeded, retrying in 5 minutes' : undefined
    };
  });
}

function generateMockExchangeStatuses(): ExchangeStatus[] {
  const exchanges = ['Binance', 'Coinbase', 'Kraken', 'Bybit'];
  const statuses = ['connected', 'connected', 'connected', 'limited', 'disconnected'];
  
  return exchanges.map(exchange => {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const apiLimit = 1000 + Math.floor(Math.random() * 4000);
    const apiUsage = Math.floor(Math.random() * apiLimit);
    
    return {
      name: exchange,
      status: status as any,
      lastConnected: new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000).toISOString(),
      apiUsage,
      apiLimit,
      errorMessage: status !== 'connected' ? 
        status === 'limited' ? 'Rate limits approaching capacity, throttling requests' : 
        'Connection lost, attempting reconnection' : 
        undefined
    };
  });
}

function generateMockAlerts(): { id: string; level: 'info' | 'warning' | 'error'; message: string; timestamp: string }[] {
  const alerts = [
    {
      id: 'alert-1',
      level: 'error' as const,
      message: 'Binance API key has expired. Reconnection required to continue trading.',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString()
    },
    {
      id: 'alert-2',
      level: 'warning' as const,
      message: 'Momentum Trader agent has not executed any trades in the last 24 hours.',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'alert-3',
      level: 'info' as const,
      message: 'ETH/USDT position has reached take profit target of 8%.',
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'alert-4',
      level: 'warning' as const,
      message: 'Unusual trading volume detected for BTC/USDT. Consider reviewing position sizes.',
      timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    }
  ];
  
  return alerts;
}
