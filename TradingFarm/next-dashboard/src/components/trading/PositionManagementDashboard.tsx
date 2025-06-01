import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button-standardized';
import { usePositions } from '@/hooks/use-positions';
import { useOrderManagement } from '@/hooks/use-order-management';
import { useMarketData } from '@/hooks/use-market-data';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell 
} from '@/components/ui/table';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/components/ui/use-toast';

/**
 * Position Management Dashboard component
 * 
 * Displays current positions, P&L tracking, position history, and margin utilization
 */
export interface PositionManagementDashboardProps {
  exchange: string;
  exchangeCredentialId: number;
}

export function PositionManagementDashboard({
  exchange,
  exchangeCredentialId
}: PositionManagementDashboardProps) {
  // State for TP/SL modal
  const [isTPSLModalOpen, setIsTPSLModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<any>(null);
  const [takeProfitPrice, setTakeProfitPrice] = useState<string>('');
  const [stopLossPrice, setStopLossPrice] = useState<string>('');
  const [trailingPercent, setTrailingPercent] = useState<number>(0);
  const [positionClosePercent, setPositionClosePercent] = useState<number>(100);

  // Hooks
  const { toast } = useToast();
  const { positions, positionHistory, accountSummary } = usePositions(exchange, exchangeCredentialId);
  const { createOrder } = useOrderManagement();
  
  // Calculate aggregated position stats
  const positionStats = useMemo(() => {
    if (!positions || positions.length === 0) {
      return {
        totalValue: 0,
        totalPnl: 0,
        totalPnlPercent: 0,
        totalMarginUsed: 0,
        marginUtilization: 0
      };
    }
    
    const stats = positions.reduce(
      (acc, position) => {
        acc.totalValue += position.notionalValue;
        acc.totalPnl += position.unrealizedPnl;
        acc.totalMarginUsed += position.initialMargin;
        return acc;
      },
      { totalValue: 0, totalPnl: 0, totalMarginUsed: 0 }
    );
    
    const totalPnlPercent = stats.totalValue > 0 
      ? (stats.totalPnl / stats.totalValue) * 100 
      : 0;
      
    const marginUtilization = accountSummary?.totalMargin > 0 
      ? (stats.totalMarginUsed / accountSummary.totalMargin) * 100 
      : 0;
    
    return {
      ...stats,
      totalPnlPercent,
      marginUtilization
    };
  }, [positions, accountSummary]);
  
  // Format position history data for chart
  const pnlChartData = useMemo(() => {
    return positionHistory.map(entry => ({
      time: new Date(entry.timestamp).toLocaleTimeString(),
      pnl: entry.cumulativePnl
    }));
  }, [positionHistory]);
  
  // Handle position exit
  const handleClosePosition = async (position: any, percent: number = 100) => {
    if (!position) return;
    
    try {
      const closeQuantity = (position.size * percent) / 100;
      
      await createOrder({
        symbol: position.symbol,
        side: position.side === 'long' ? 'sell' : 'buy',
        type: 'market',
        quantity: Math.abs(closeQuantity),
        reduceOnly: true,
        exchangeCredentialId
      });
      
      toast({
        title: "Position Closed",
        description: `${percent}% of your ${position.side} position in ${position.symbol} has been closed.`,
        variant: "success"
      });
    } catch (error) {
      toast({
        title: "Close Position Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  };
  
  // Handle take profit / stop loss
  const handleSetTPSL = async () => {
    if (!selectedPosition) return;
    
    try {
      const isLong = selectedPosition.side === 'long';
      const closeQty = (Math.abs(selectedPosition.size) * positionClosePercent) / 100;
      
      // Create take profit order if provided
      if (takeProfitPrice && parseFloat(takeProfitPrice) > 0) {
        await createOrder({
          symbol: selectedPosition.symbol,
          side: isLong ? 'sell' : 'buy',
          type: 'limit',
          price: parseFloat(takeProfitPrice),
          quantity: closeQty,
          reduceOnly: true,
          exchangeCredentialId,
          metadata: {
            orderTag: 'take-profit'
          }
        });
      }
      
      // Create stop loss order if provided
      if (stopLossPrice && parseFloat(stopLossPrice) > 0) {
        await createOrder({
          symbol: selectedPosition.symbol,
          side: isLong ? 'sell' : 'buy',
          type: 'stop_market',
          stopPrice: parseFloat(stopLossPrice),
          quantity: closeQty,
          reduceOnly: true,
          exchangeCredentialId,
          metadata: {
            orderTag: 'stop-loss'
          }
        });
      }
      
      // Create trailing stop if specified
      if (trailingPercent > 0) {
        await createOrder({
          symbol: selectedPosition.symbol,
          side: isLong ? 'sell' : 'buy',
          type: 'trailing_stop',
          quantity: closeQty,
          trailingPercent,
          reduceOnly: true,
          exchangeCredentialId,
          metadata: {
            orderTag: 'trailing-stop'
          }
        });
      }
      
      toast({
        title: "Orders Created",
        description: "Take profit and/or stop loss orders have been created.",
        variant: "success"
      });
      
      setIsTPSLModalOpen(false);
    } catch (error) {
      toast({
        title: "Order Creation Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  };
  
  // Open TP/SL modal for a position
  const openTPSLModal = (position: any) => {
    setSelectedPosition(position);
    
    // Set initial values based on the position
    const currentPrice = position.markPrice || position.entryPrice;
    const isLong = position.side === 'long';
    
    // Default TP at +5% from current price
    setTakeProfitPrice(
      (isLong ? currentPrice * 1.05 : currentPrice * 0.95).toFixed(2)
    );
    
    // Default SL at -2% from current price
    setStopLossPrice(
      (isLong ? currentPrice * 0.98 : currentPrice * 1.02).toFixed(2)
    );
    
    setTrailingPercent(0);
    setPositionClosePercent(100);
    setIsTPSLModalOpen(true);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Position Overview Card */}
      <Card className="lg:col-span-3">
        <CardHeader className="py-3">
          <CardTitle className="text-base font-medium">Position Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="text-sm text-muted-foreground">Total Position Value</div>
              <div className="text-xl font-semibold mt-1">
                ${positionStats.totalValue.toFixed(2)}
              </div>
            </div>
            
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="text-sm text-muted-foreground">Unrealized P&L</div>
              <div className={`text-xl font-semibold mt-1 ${
                positionStats.totalPnl > 0 ? 'text-green-500' : 
                positionStats.totalPnl < 0 ? 'text-red-500' : ''
              }`}>
                ${positionStats.totalPnl.toFixed(2)} 
                <span className="text-sm">
                  ({positionStats.totalPnlPercent.toFixed(2)}%)
                </span>
              </div>
            </div>
            
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="text-sm text-muted-foreground">Margin Used</div>
              <div className="text-xl font-semibold mt-1">
                ${positionStats.totalMarginUsed.toFixed(2)}
              </div>
            </div>
            
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="text-sm text-muted-foreground">Margin Utilization</div>
              <div className="text-xl font-semibold mt-1">
                {positionStats.marginUtilization.toFixed(2)}%
                <Progress 
                  value={positionStats.marginUtilization} 
                  max={100}
                  className="h-2 mt-2"
                  variant={
                    positionStats.marginUtilization > 80 ? "destructive" :
                    positionStats.marginUtilization > 50 ? "warning" : "default"
                  }
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Active Positions Table */}
      <Card className="lg:col-span-2">
        <CardHeader className="py-3">
          <CardTitle className="text-base font-medium">Active Positions</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Entry Price</TableHead>
                  <TableHead>Mark Price</TableHead>
                  <TableHead>Liquidation</TableHead>
                  <TableHead>PNL</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No open positions
                    </TableCell>
                  </TableRow>
                ) : (
                  positions.map((position) => (
                    <TableRow key={`${position.symbol}-${position.side}`}>
                      <TableCell className="font-medium">
                        {position.symbol}
                      </TableCell>
                      <TableCell>
                        <Badge variant={position.side === 'long' ? 'success' : 'destructive'}>
                          {position.side.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{Math.abs(position.size).toFixed(4)}</TableCell>
                      <TableCell>${position.entryPrice.toFixed(2)}</TableCell>
                      <TableCell>${position.markPrice.toFixed(2)}</TableCell>
                      <TableCell>${position.liquidationPrice?.toFixed(2) || 'N/A'}</TableCell>
                      <TableCell className={
                        position.unrealizedPnl > 0 ? 'text-green-500' : 
                        position.unrealizedPnl < 0 ? 'text-red-500' : ''
                      }>
                        ${position.unrealizedPnl.toFixed(2)}
                        <div className="text-xs">
                          ({position.unrealizedPnlPercent?.toFixed(2) || 0}%)
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openTPSLModal(position)}
                          >
                            TP/SL
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleClosePosition(position)}
                          >
                            Close
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {/* PNL Chart */}
      <Card className="lg:col-span-1">
        <CardHeader className="py-3">
          <CardTitle className="text-base font-medium">P&L History</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="today" className="space-y-4">
            <TabsList>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
            
            <TabsContent value="today" className="space-y-4">
              <div className="h-[250px]">
                {pnlChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={pnlChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="time" 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(time) => time.split(':').slice(0, 2).join(':')}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `$${value}`}
                      />
                      <Tooltip 
                        formatter={(value) => [`$${Number(value).toFixed(2)}`, 'P&L']}
                        labelFormatter={(time) => `Time: ${time}`}
                      />
                      <Line 
                        type="monotone"
                        dataKey="pnl"
                        stroke="#10b981"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    No P&L history available for today
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-muted/50 p-2 rounded-md">
                  <div className="text-xs text-muted-foreground">Daily High</div>
                  <div className="font-medium">
                    ${Math.max(...pnlChartData.map(d => d.pnl), 0).toFixed(2)}
                  </div>
                </div>
                <div className="bg-muted/50 p-2 rounded-md">
                  <div className="text-xs text-muted-foreground">Daily Low</div>
                  <div className="font-medium">
                    ${Math.min(...pnlChartData.map(d => d.pnl), 0).toFixed(2)}
                  </div>
                </div>
                <div className="bg-muted/50 p-2 rounded-md">
                  <div className="text-xs text-muted-foreground">Current</div>
                  <div className={`font-medium ${
                    positionStats.totalPnl > 0 ? 'text-green-500' : 
                    positionStats.totalPnl < 0 ? 'text-red-500' : ''
                  }`}>
                    ${positionStats.totalPnl.toFixed(2)}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="week">
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Weekly view would display P&L data for the past 7 days
              </div>
            </TabsContent>
            
            <TabsContent value="month">
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Monthly view would display P&L data for the past 30 days
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Take Profit / Stop Loss Modal */}
      <Dialog open={isTPSLModalOpen} onOpenChange={setIsTPSLModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Take Profit / Stop Loss</DialogTitle>
            <DialogDescription>
              {selectedPosition && (
                <div>
                  Position: {selectedPosition.symbol} {selectedPosition.side.toUpperCase()}
                  <div className="text-sm">
                    Entry Price: ${selectedPosition.entryPrice.toFixed(2)} | 
                    Current Price: ${selectedPosition.markPrice.toFixed(2)}
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="positionPercent">Position Close Percentage</Label>
              <div className="flex items-center justify-between">
                <Slider
                  id="positionPercent"
                  value={[positionClosePercent]}
                  onValueChange={(value) => setPositionClosePercent(value[0])}
                  max={100}
                  step={5}
                  className="flex-grow mr-4"
                />
                <span className="min-w-[40px] text-right">{positionClosePercent}%</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="takeProfit">Take Profit Price</Label>
              <Input
                id="takeProfit"
                type="number"
                step="0.01"
                value={takeProfitPrice}
                onChange={(e) => setTakeProfitPrice(e.target.value)}
                placeholder="Enter take profit price"
              />
              {selectedPosition && (
                <div className="text-xs text-muted-foreground">
                  {selectedPosition.side === 'long' ? 'Profit at price higher than entry' : 'Profit at price lower than entry'}
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="stopLoss">Stop Loss Price</Label>
              <Input
                id="stopLoss"
                type="number"
                step="0.01"
                value={stopLossPrice}
                onChange={(e) => setStopLossPrice(e.target.value)}
                placeholder="Enter stop loss price"
              />
              {selectedPosition && (
                <div className="text-xs text-muted-foreground">
                  {selectedPosition.side === 'long' ? 'Stop at price lower than entry' : 'Stop at price higher than entry'}
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="trailingStop">Trailing Stop (%)</Label>
              <div className="flex items-center justify-between">
                <Slider
                  id="trailingStop"
                  value={[trailingPercent]}
                  onValueChange={(value) => setTrailingPercent(value[0])}
                  max={10}
                  step={0.1}
                  className="flex-grow mr-4"
                />
                <span className="min-w-[40px] text-right">{trailingPercent.toFixed(1)}%</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Trailing stop follows the price, maintaining the specified percentage distance
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsTPSLModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSetTPSL}>
              Set Orders
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
