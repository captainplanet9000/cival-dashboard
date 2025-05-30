'use client';

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { Tables } from '@/types/database.types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  RefreshCw, 
  ChevronDown, 
  BarChart4, 
  Percent, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Clock,
  XCircle,
  AlertCircle,
  BookOpenCheck
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow, format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

type TradeType = Tables<'trades'>;
type ExecutionStats = {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalPnl: number;
  totalFees: number;
  winRate: number;
  averagePnl: number;
  largestWin: number;
  largestLoss: number;
};

interface ExecutionMonitorProps {
  userId: string;
  className?: string;
}

export function ExecutionMonitor({ userId, className }: ExecutionMonitorProps) {
  const [trades, setTrades] = useState<TradeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState<'today' | '7d' | '30d' | 'all'>('7d');
  const [stats, setStats] = useState<ExecutionStats>({
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    totalPnl: 0,
    totalFees: 0,
    winRate: 0,
    averagePnl: 0,
    largestWin: 0,
    largestLoss: 0
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchTrades();
  }, [userId, timeframe]);

  const fetchTrades = async () => {
    try {
      setLoading(true);
      setRefreshing(true);
      const supabase = createBrowserClient();
      
      let query = supabase
        .from('trades')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Apply timeframe filter
      if (timeframe !== 'all') {
        let startDate = new Date();
        
        if (timeframe === 'today') {
          startDate.setHours(0, 0, 0, 0);
        } else if (timeframe === '7d') {
          startDate.setDate(startDate.getDate() - 7);
        } else if (timeframe === '30d') {
          startDate.setDate(startDate.getDate() - 30);
        }
        
        query = query.gte('created_at', startDate.toISOString());
      }
      
      // Fetch trades
      const { data, error } = await query;
      
      if (error) throw error;
      
      setTrades(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error fetching trades:', error);
      toast({
        title: "Error Loading Trades",
        description: "There was a problem loading your trade executions. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateStats = (tradeData: TradeType[]) => {
    if (!tradeData.length) {
      setStats({
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        totalPnl: 0,
        totalFees: 0,
        winRate: 0,
        averagePnl: 0,
        largestWin: 0,
        largestLoss: 0
      });
      return;
    }
    
    const totalTrades = tradeData.length;
    let totalPnl = 0;
    let totalFees = 0;
    let winningTrades = 0;
    let losingTrades = 0;
    let largestWin = 0;
    let largestLoss = 0;
    
    tradeData.forEach(trade => {
      // Calculate stats
      if (trade.pnl) {
        totalPnl += trade.pnl;
        
        if (trade.pnl > 0) {
          winningTrades++;
          largestWin = Math.max(largestWin, trade.pnl);
        } else if (trade.pnl < 0) {
          losingTrades++;
          largestLoss = Math.min(largestLoss, trade.pnl);
        }
      }
      
      if (trade.fees) {
        totalFees += trade.fees;
      }
    });
    
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const averagePnl = totalTrades > 0 ? totalPnl / totalTrades : 0;
    
    setStats({
      totalTrades,
      winningTrades,
      losingTrades,
      totalPnl,
      totalFees,
      winRate,
      averagePnl,
      largestWin,
      largestLoss: Math.abs(largestLoss) // Convert to positive for display
    });
  };

  const renderTradeTable = () => {
    if (loading && !refreshing && trades.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-6">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Loading trade executions...</p>
        </div>
      );
    }
    
    if (trades.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="rounded-full bg-muted p-3 mb-2">
            <BookOpenCheck className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium mb-1">No trade executions found</p>
          <p className="text-sm text-muted-foreground max-w-[80%]">
            Your trade executions will appear here after orders are filled.
          </p>
        </div>
      );
    }
    
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Symbol</TableHead>
            <TableHead>Side</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Price</TableHead>
            <TableHead className="text-right">P&L</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trades.map((trade) => (
            <TableRow key={trade.id}>
              <TableCell className="font-medium">
                {format(new Date(trade.created_at), 'MMM dd, HH:mm')}
              </TableCell>
              <TableCell>{trade.symbol}</TableCell>
              <TableCell>
                <Badge variant={trade.side === 'buy' ? 'default' : 'destructive'}>
                  {trade.side.toUpperCase()}
                </Badge>
              </TableCell>
              <TableCell>{trade.quantity}</TableCell>
              <TableCell>${trade.price.toFixed(2)}</TableCell>
              <TableCell className="text-right">
                {trade.pnl !== null ? (
                  <span className={trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const renderStats = () => {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Total PnL</p>
                <h3 className={`text-2xl font-bold mt-1 ${stats.totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {stats.totalPnl >= 0 ? '+' : ''}${stats.totalPnl.toFixed(2)}
                </h3>
              </div>
              <div className={`rounded-full p-2 ${stats.totalPnl >= 0 ? 'bg-green-100 text-green-500' : 'bg-red-100 text-red-500'}`}>
                {stats.totalPnl >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Fees: ${stats.totalFees.toFixed(2)}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Win Rate</p>
                <h3 className="text-2xl font-bold mt-1">{stats.winRate.toFixed(1)}%</h3>
              </div>
              <div className="rounded-full p-2 bg-blue-100 text-blue-500">
                <Percent className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.winningTrades} wins / {stats.losingTrades} losses
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Avg. PnL</p>
                <h3 className={`text-2xl font-bold mt-1 ${stats.averagePnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {stats.averagePnl >= 0 ? '+' : ''}${stats.averagePnl.toFixed(2)}
                </h3>
              </div>
              <div className="rounded-full p-2 bg-purple-100 text-purple-500">
                <BarChart4 className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Per trade average</p>
          </CardContent>
        </Card>
        
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Total Trades</p>
                <h3 className="text-2xl font-bold mt-1">{stats.totalTrades}</h3>
              </div>
              <div className="rounded-full p-2 bg-orange-100 text-orange-500">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              In {timeframe === 'today' ? 'today' : 
                timeframe === '7d' ? 'last 7 days' : 
                timeframe === '30d' ? 'last 30 days' : 'all time'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Execution Monitor</CardTitle>
            <CardDescription>Track your trade executions and performance</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <div>
              <select
                className="bg-transparent text-sm border rounded px-2 py-1"
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value as any)}
              >
                <option value="today">Today</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>
            <Button variant="outline" size="sm" onClick={fetchTrades} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {renderStats()}
        <Separator className="my-4" />
        <ScrollArea className="h-[350px]">
          {renderTradeTable()}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
