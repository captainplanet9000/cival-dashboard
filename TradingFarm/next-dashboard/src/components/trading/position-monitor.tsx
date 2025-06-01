import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { createBrowserClient } from '@/utils/supabase/client';
import { formatCurrency, formatPercentage } from '@/lib/formatters';
import { ArrowUpCircle, ArrowDownCircle, AlertCircle, RefreshCcw, XCircle, Clock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRouter } from 'next/navigation';

interface Position {
  id: string;
  symbol: string;
  quantity: number;
  entry_price: number;
  current_price: number;
  unrealized_pnl: number;
  unrealized_pnl_percentage: number;
  realized_pnl: number;
  side: 'LONG' | 'SHORT';
  liquidation_price?: number;
  exchange_name: string;
  agent_id?: string;
  agent_name?: string;
  updated_at: string;
}

interface PositionMonitorProps {
  userId: string;
  agentId?: string;
  refreshInterval?: number; // in milliseconds
  showActions?: boolean;
  height?: string;
  isPaperTrading?: boolean;
}

export function PositionMonitor({
  userId,
  agentId,
  refreshInterval = 10000,
  showActions = true,
  height = 'auto',
  isPaperTrading = false
}: PositionMonitorProps) {
  const [activeTab, setActiveTab] = useState('open');
  const supabase = createBrowserClient();
  const { toast } = useToast();
  const router = useRouter();
  
  // Fetch open positions
  const { 
    data: openPositions, 
    isLoading: isLoadingOpen, 
    isError: isErrorOpen,
    refetch: refetchOpen 
  } = useQuery({
    queryKey: ['positions', userId, agentId, 'open', isPaperTrading],
    queryFn: async () => {
      const table = isPaperTrading ? 'paper_trading_positions' : 'trading_positions';
      
      let query = supabase
        .from(table)
        .select(`
          *,
          agents:elizaos_agents(name)
        `)
        .eq('user_id', userId)
        .neq('quantity', 0);
      
      if (agentId) {
        query = query.eq('agent_id', agentId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching open positions:', error);
        throw new Error('Failed to fetch open positions');
      }
      
      return data.map(mapPosition);
    },
    refetchInterval: refreshInterval
  });
  
  // Fetch closed positions (recent trades)
  const { 
    data: closedPositions, 
    isLoading: isLoadingClosed, 
    isError: isErrorClosed,
    refetch: refetchClosed
  } = useQuery({
    queryKey: ['positions', userId, agentId, 'closed', isPaperTrading],
    queryFn: async () => {
      const table = isPaperTrading ? 'paper_trading_trades' : 'trading_agent_trades';
      
      let query = supabase
        .from(table)
        .select(`
          *,
          agents:elizaos_agents(name)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (agentId) {
        query = query.eq('agent_id', agentId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching closed positions:', error);
        throw new Error('Failed to fetch closed positions');
      }
      
      return data.map(mapTrade);
    },
    enabled: activeTab === 'closed',
    refetchInterval: activeTab === 'closed' ? refreshInterval : false
  });
  
  // Handle manual refresh
  const handleRefresh = () => {
    if (activeTab === 'open') {
      refetchOpen();
    } else {
      refetchClosed();
    }
    
    toast({
      title: 'Refreshed',
      description: 'Position data has been updated.',
      duration: 2000
    });
  };
  
  // Handle close position
  const handleClosePosition = async (position: Position) => {
    try {
      if (isPaperTrading) {
        // For paper trading, directly call the API
        const response = await fetch('/api/trading/paper/close-position', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            symbol: position.symbol,
            quantity: position.quantity
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to close paper trading position');
        }
        
        toast({
          title: 'Position Closed',
          description: `Closed ${position.symbol} position.`,
          duration: 3000
        });
        
        refetchOpen();
      } else {
        // For live trading, navigate to the order entry page with pre-filled values
        router.push(`/dashboard/trading/new-order?symbol=${position.symbol}&side=${position.side === 'LONG' ? 'SELL' : 'BUY'}&quantity=${Math.abs(position.quantity)}&type=MARKET&close=true`);
      }
    } catch (error) {
      console.error('Error closing position:', error);
      toast({
        title: 'Error',
        description: 'Failed to close position. Please try again.',
        variant: 'destructive',
        duration: 5000
      });
    }
  };
  
  // Calculate total P&L
  const totalUnrealizedPnl = openPositions?.reduce((sum, pos) => sum + pos.unrealized_pnl, 0) || 0;
  const totalRealizedPnl = openPositions?.reduce((sum, pos) => sum + pos.realized_pnl, 0) || 0;
  
  // Handle error states
  if (isErrorOpen && activeTab === 'open') {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Positions</span>
            <Button variant="outline" size="icon" onClick={handleRefresh}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-2" />
            <h3 className="text-lg font-semibold">Error Loading Positions</h3>
            <p className="text-muted-foreground mt-1">
              There was a problem loading your position data.
            </p>
            <Button className="mt-4" onClick={refetchOpen}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span>Positions</span>
          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </CardTitle>
        <CardDescription>
          {isPaperTrading ? 'Paper Trading' : 'Live Trading'} positions
        </CardDescription>
      </CardHeader>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="px-6">
          <TabsList className="w-full">
            <TabsTrigger value="open" className="flex-1">Open Positions</TabsTrigger>
            <TabsTrigger value="closed" className="flex-1">Recent Trades</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="open">
          <CardContent className="px-0" style={{ height }}>
            {isLoadingOpen ? (
              <PositionSkeleton count={3} />
            ) : openPositions && openPositions.length > 0 ? (
              <div className="overflow-auto max-h-[70vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Side</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Entry Price</TableHead>
                      <TableHead>Current Price</TableHead>
                      <TableHead>Unrealized P&L</TableHead>
                      {showActions && <TableHead></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {openPositions.map(position => (
                      <TableRow key={`${position.symbol}-${position.agent_id || 'user'}`}>
                        <TableCell>
                          <div className="font-medium">{position.symbol}</div>
                          {position.agent_name && (
                            <div className="text-xs text-muted-foreground">
                              {position.agent_name}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={position.side === 'LONG' ? 'default' : 'destructive'}>
                            {position.side}
                          </Badge>
                        </TableCell>
                        <TableCell>{Math.abs(position.quantity).toFixed(6)}</TableCell>
                        <TableCell>{formatCurrency(position.entry_price, 'USD')}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {formatCurrency(position.current_price, 'USD')}
                            <PositionPriceChange 
                              currentPrice={position.current_price} 
                              entryPrice={position.entry_price}
                              side={position.side}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={`font-medium ${position.unrealized_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(position.unrealized_pnl, 'USD')}
                          </div>
                          <div className={`text-xs ${position.unrealized_pnl_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPercentage(position.unrealized_pnl_percentage)}
                          </div>
                        </TableCell>
                        {showActions && (
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleClosePosition(position)}
                            >
                              Close
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground">No open positions</p>
                {!agentId && (
                  <Button 
                    className="mt-4"
                    onClick={() => router.push('/dashboard/trading/new-order')}
                  >
                    Create New Order
                  </Button>
                )}
              </div>
            )}
          </CardContent>
          {openPositions && openPositions.length > 0 && (
            <CardFooter className="flex justify-between border-t p-4">
              <div>
                <p className="text-sm font-medium">Total Unrealized P&L</p>
                <p className={`text-xl font-bold ${totalUnrealizedPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(totalUnrealizedPnl, 'USD')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">Positions</p>
                <p className="text-xl font-bold">{openPositions.length}</p>
              </div>
            </CardFooter>
          )}
        </TabsContent>
        
        <TabsContent value="closed">
          <CardContent className="px-0" style={{ height }}>
            {isLoadingClosed ? (
              <PositionSkeleton count={3} />
            ) : closedPositions && closedPositions.length > 0 ? (
              <div className="overflow-auto max-h-[70vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Side</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>P&L</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {closedPositions.map(trade => (
                      <TableRow key={trade.id}>
                        <TableCell>
                          <div className="font-medium">{trade.symbol}</div>
                          {trade.agent_name && (
                            <div className="text-xs text-muted-foreground">
                              {trade.agent_name}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={trade.side === 'BUY' ? 'default' : 'destructive'}>
                            {trade.side}
                          </Badge>
                        </TableCell>
                        <TableCell>{Math.abs(trade.quantity).toFixed(6)}</TableCell>
                        <TableCell>{formatCurrency(trade.current_price, 'USD')}</TableCell>
                        <TableCell>
                          {trade.realized_pnl !== undefined && (
                            <div className={`font-medium ${trade.realized_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(trade.realized_pnl, 'USD')}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {formatTimeAgo(new Date(trade.updated_at))}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground">No recent trades</p>
              </div>
            )}
          </CardContent>
        </TabsContent>
      </Tabs>
    </Card>
  );
}

// Helper function to map database position to frontend format
function mapPosition(dbPosition: any): Position {
  const quantity = dbPosition.quantity || 0;
  const side = quantity >= 0 ? 'LONG' : 'SHORT';
  const entryPrice = dbPosition.entry_price || 0;
  const currentPrice = dbPosition.current_price || entryPrice;
  const unrealizedPnl = dbPosition.unrealized_pnl || 0;
  
  let unrealizedPnlPercentage = 0;
  if (entryPrice > 0 && quantity !== 0) {
    unrealizedPnlPercentage = side === 'LONG'
      ? (currentPrice - entryPrice) / entryPrice
      : (entryPrice - currentPrice) / entryPrice;
  }
  
  return {
    id: dbPosition.id,
    symbol: dbPosition.symbol,
    quantity: Math.abs(quantity),
    entry_price: entryPrice,
    current_price: currentPrice,
    unrealized_pnl: unrealizedPnl,
    unrealized_pnl_percentage: unrealizedPnlPercentage,
    realized_pnl: dbPosition.realized_pnl || 0,
    side,
    liquidation_price: dbPosition.liquidation_price,
    exchange_name: dbPosition.exchange_name || 'Unknown',
    agent_id: dbPosition.agent_id,
    agent_name: dbPosition.agents?.name,
    updated_at: dbPosition.updated_at
  };
}

// Helper function to map trade to position format for display
function mapTrade(dbTrade: any): Position {
  return {
    id: dbTrade.id,
    symbol: dbTrade.symbol,
    quantity: dbTrade.quantity || 0,
    entry_price: dbTrade.price || 0,
    current_price: dbTrade.price || 0,
    unrealized_pnl: 0,
    unrealized_pnl_percentage: 0,
    realized_pnl: dbTrade.profit_loss || 0,
    side: dbTrade.side === 'BUY' ? 'LONG' : 'SHORT',
    exchange_name: dbTrade.exchange_name || 'Unknown',
    agent_id: dbTrade.agent_id,
    agent_name: dbTrade.agents?.name,
    updated_at: dbTrade.created_at
  };
}

// Helper component to show price change indicator
function PositionPriceChange({ 
  currentPrice, 
  entryPrice, 
  side 
}: { 
  currentPrice: number; 
  entryPrice: number;
  side: 'LONG' | 'SHORT';
}) {
  const priceChange = currentPrice - entryPrice;
  const isProfit = side === 'LONG' ? priceChange > 0 : priceChange < 0;
  
  if (Math.abs(priceChange) < 0.000001) return null;
  
  return isProfit ? (
    <ArrowUpCircle className="h-4 w-4 text-green-600" />
  ) : (
    <ArrowDownCircle className="h-4 w-4 text-red-600" />
  );
}

// Loading skeleton
function PositionSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2 px-6 py-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex space-x-4 items-center py-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20 ml-auto" />
        </div>
      ))}
    </div>
  );
}

// Format time ago
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  return `${Math.floor(diffSeconds / 86400)}d ago`;
}
