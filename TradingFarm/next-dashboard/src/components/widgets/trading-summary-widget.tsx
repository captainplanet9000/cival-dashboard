'use client';

import { useState, useEffect } from 'react';
import { DashboardWidget } from '@/components/ui/dashboard-widget';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronUp, CreditCard, DollarSign, TrendingDown, TrendingUp } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Position {
  symbol: string;
  side: 'buy' | 'sell';
  size: number;
  entryPrice: number;
  markPrice: number;
  pnl: number;
  pnlPercentage: number;
  liquidationPrice?: number;
  leverage: number;
}

interface AssetBalance {
  asset: string;
  free: number;
  locked: number;
  total: number;
  usdValue: number;
}

interface RecentTrade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  price: number;
  amount: number;
  value: number;
  fee: number;
  timestamp: string;
}

interface TradingSummaryWidgetProps {
  farmId?: string;
  accountId?: string;
  className?: string;
  isLoading?: boolean;
  onRefresh?: () => Promise<void>;
  positions?: Position[];
  balances?: AssetBalance[];
  recentTrades?: RecentTrade[];
}

export function TradingSummaryWidget({
  farmId,
  accountId,
  className,
  isLoading = false,
  onRefresh,
  positions = [],
  balances = [],
  recentTrades = []
}: TradingSummaryWidgetProps) {
  const [activeTab, setActiveTab] = useState<'positions' | 'balances' | 'trades'>('positions');
  
  // Generate mock data if real data is not provided
  useEffect(() => {
    if (!isLoading && positions.length === 0 && balances.length === 0 && recentTrades.length === 0) {
      // This would normally fetch data from an API
      console.log('Would fetch trading data for', { farmId, accountId });
    }
  }, [isLoading, positions.length, balances.length, recentTrades.length, farmId, accountId]);
  
  // Create mock data for display purposes
  const mockPositions: Position[] = positions.length > 0 ? positions : [
    {
      symbol: 'BTC/USDT',
      side: 'buy',
      size: 0.5,
      entryPrice: 45000,
      markPrice: 47500,
      pnl: 1250,
      pnlPercentage: 5.56,
      liquidationPrice: 28000,
      leverage: 5
    },
    {
      symbol: 'ETH/USDT',
      side: 'sell',
      size: 2.5,
      entryPrice: 3200,
      markPrice: 3100,
      pnl: 250,
      pnlPercentage: 3.12,
      liquidationPrice: 4800,
      leverage: 10
    },
    {
      symbol: 'SOL/USDT',
      side: 'buy',
      size: 15,
      entryPrice: 110,
      markPrice: 105,
      pnl: -75,
      pnlPercentage: -4.55,
      liquidationPrice: 60,
      leverage: 3
    }
  ];
  
  const mockBalances: AssetBalance[] = balances.length > 0 ? balances : [
    { asset: 'USDT', free: 12500.75, locked: 7500, total: 20000.75, usdValue: 20000.75 },
    { asset: 'BTC', free: 0.25, locked: 0.5, total: 0.75, usdValue: 35625 },
    { asset: 'ETH', free: 3, locked: 2.5, total: 5.5, usdValue: 17050 },
    { asset: 'SOL', free: 50, locked: 15, total: 65, usdValue: 6825 }
  ];
  
  const mockTrades: RecentTrade[] = recentTrades.length > 0 ? recentTrades : [
    {
      id: '1',
      symbol: 'BTC/USDT',
      side: 'buy',
      price: 46750,
      amount: 0.1,
      value: 4675,
      fee: 2.34,
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString()
    },
    {
      id: '2',
      symbol: 'ETH/USDT',
      side: 'sell',
      price: 3120,
      amount: 0.5,
      value: 1560,
      fee: 0.78,
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString()
    },
    {
      id: '3',
      symbol: 'SOL/USDT',
      side: 'buy',
      price: 104.5,
      amount: 5,
      value: 522.5,
      fee: 0.26,
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString()
    }
  ];
  
  // Calculate portfolio allocation for pie chart
  const portfolioAllocation = mockBalances.map(balance => ({
    name: balance.asset,
    value: balance.usdValue
  }));
  
  // Calculate total portfolio value
  const totalPortfolioValue = portfolioAllocation.reduce((sum, item) => sum + item.value, 0);
  
  // Calculate total PnL
  const totalPnl = mockPositions.reduce((sum, position) => sum + position.pnl, 0);
  
  // Format currency with $ and 2 decimal places
  const formatCurrency = (value: number, includeCurrency = true) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value).replace('$', includeCurrency ? '$' : '');
  };
  
  // Format crypto amount with appropriate decimal places
  const formatCrypto = (value: number, asset: string) => {
    // Bitcoin and high-value assets show more decimal places
    const decimalPlaces = asset === 'BTC' ? 8 : 
                          ['ETH', 'BNB'].includes(asset) ? 6 : 
                          asset === 'USDT' ? 2 : 4;
                          
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimalPlaces,
    }).format(value);
  };
  
  // Format percentage with 2 decimal places and % sign
  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value / 100);
  };
  
  // Format timestamp as relative time
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
  
  // Colors for pie chart
  const COLORS = ['#3B82F6', '#F97316', '#10B981', '#8B5CF6', '#EC4899', '#FCD34D', '#A1A1AA'];

  return (
    <DashboardWidget
      title="Trading Summary"
      description="Current positions, balances, and recent trades"
      className={className}
      isLoading={isLoading}
      isRefreshable={!!onRefresh}
      isExpandable
      onRefresh={onRefresh}
    >
      <div className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="p-3">
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">Portfolio Value</div>
              <DollarSign className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-xl font-bold">
              {isLoading ? (
                <Skeleton className="h-7 w-28" />
              ) : (
                formatCurrency(totalPortfolioValue)
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Across {mockBalances.length} assets
            </div>
          </Card>
          
          <Card className="p-3">
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">Total PnL</div>
              {totalPnl > 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </div>
            <div className={cn("text-xl font-bold", 
              totalPnl > 0 ? "text-green-600" : "text-red-600")}>
              {isLoading ? (
                <Skeleton className="h-7 w-28" />
              ) : (
                formatCurrency(totalPnl)
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              From {mockPositions.length} open positions
            </div>
          </Card>
          
          <Card className="p-3">
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">Recent Activity</div>
              <CreditCard className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-xl font-bold">
              {isLoading ? (
                <Skeleton className="h-7 w-28" />
              ) : (
                `${mockTrades.length} trades`
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Last trade {formatTime(mockTrades[0]?.timestamp || new Date().toISOString())}
            </div>
          </Card>
        </div>
        
        {/* Tabs for different data views */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="positions">Positions</TabsTrigger>
            <TabsTrigger value="balances">Balances</TabsTrigger>
            <TabsTrigger value="trades">Recent Trades</TabsTrigger>
          </TabsList>
          
          <TabsContent value="positions" className="space-y-4">
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : mockPositions.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Side</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Entry Price</TableHead>
                      <TableHead>Mark Price</TableHead>
                      <TableHead className="text-right">PnL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockPositions.map((position, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{position.symbol}</TableCell>
                        <TableCell>
                          <Badge variant={position.side === 'buy' ? 'success' : 'destructive'}>
                            {position.side.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatCrypto(position.size, position.symbol.split('/')[0])}
                          {position.leverage > 1 && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({position.leverage}x)
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{formatCurrency(position.entryPrice, false)}</TableCell>
                        <TableCell>{formatCurrency(position.markPrice, false)}</TableCell>
                        <TableCell className="text-right">
                          <div className={position.pnl >= 0 ? "text-green-600" : "text-red-600"}>
                            {formatCurrency(position.pnl)}
                            <span className="text-xs ml-1">
                              ({position.pnl >= 0 ? '+' : ''}{position.pnlPercentage.toFixed(2)}%)
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] bg-muted/20 rounded-md">
                <div className="text-center">
                  <p className="text-muted-foreground mb-2">No open positions</p>
                  <Button size="sm" variant="outline">Open Position</Button>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="balances" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Asset Distribution Chart */}
              <Card className="p-4">
                <h3 className="text-sm font-medium mb-2">Asset Distribution</h3>
                {isLoading ? (
                  <Skeleton className="h-[200px] w-full" />
                ) : (
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={portfolioAllocation}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {portfolioAllocation.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Legend />
                        <Tooltip
                          formatter={(value: number) => [formatCurrency(value), 'Value']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>
              
              {/* Asset Balances Table */}
              <Card className="p-4">
                <h3 className="text-sm font-medium mb-2">Asset Balances</h3>
                {isLoading ? (
                  <Skeleton className="h-[200px] w-full" />
                ) : (
                  <div className="rounded-md border max-h-[200px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Asset</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mockBalances.map((balance, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{balance.asset}</TableCell>
                            <TableCell className="text-right">
                              {formatCrypto(balance.total, balance.asset)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(balance.usdValue)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="trades">
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : mockTrades.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Side</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockTrades.map((trade) => (
                      <TableRow key={trade.id}>
                        <TableCell className="text-sm">
                          {formatTime(trade.timestamp)}
                        </TableCell>
                        <TableCell className="font-medium">{trade.symbol}</TableCell>
                        <TableCell>
                          <Badge variant={trade.side === 'buy' ? 'success' : 'destructive'}>
                            {trade.side.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(trade.price, false)}</TableCell>
                        <TableCell>
                          {formatCrypto(trade.amount, trade.symbol.split('/')[0])}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(trade.value)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] bg-muted/20 rounded-md">
                <p className="text-muted-foreground">No recent trades</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardWidget>
  );
}
