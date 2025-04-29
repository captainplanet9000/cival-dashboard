import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { usePositions, useOrders } from '@/hooks/use-trading';
import { Position, OrderSide, OrderType } from '@/types/trading';

interface ActivePositionsTableProps {
  onSelectClosePosition?: (position: Position) => void;
}

export function ActivePositionsTable({ onSelectClosePosition }: ActivePositionsTableProps) {
  const { toast } = useToast();
  const { getPositions, updatePositionsPnl, isLoading: isPositionsLoading } = usePositions();
  const { createOrder, isLoading: isOrderLoading } = useOrders();
  const [positions, setPositions] = useState<Position[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load positions on component mount
  useEffect(() => {
    loadPositions();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      updatePositionsPnl().then(() => loadPositions());
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Load positions data
  const loadPositions = async () => {
    const data = await getPositions();
    if (data) {
      setPositions(data);
    }
  };

  // Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await updatePositionsPnl();
    await loadPositions();
    setIsRefreshing(false);
  };

  // Create a market order to close position
  const handleClosePosition = async (position: Position) => {
    if (onSelectClosePosition) {
      // If callback is provided, use it (for custom closing UI)
      onSelectClosePosition(position);
      return;
    }
    
    // Default close position behavior
    try {
      // Create an order in the opposite direction
      const closeOrderRequest = {
        symbol: position.symbol,
        exchange: 'binance', // This would need to be stored with the position
        side: position.quantity > 0 ? OrderSide.Sell : OrderSide.Buy,
        type: OrderType.Market,
        quantity: Math.abs(position.quantity),
      };
      
      // Get confirmation from user
      if (window.confirm(`Close ${position.symbol} position of ${Math.abs(position.quantity)} ${position.quantity > 0 ? 'with SELL' : 'with BUY'}?`)) {
        const response = await createOrder(closeOrderRequest);
        
        if (response) {
          toast({
            title: "Position Closing",
            description: `Order placed to close ${position.symbol} position`,
          });
          
          // Refresh positions after a delay
          setTimeout(() => loadPositions(), 2000);
        }
      }
    } catch (error) {
      console.error("Error closing position:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to close position. Please try again.",
      });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl font-bold">Active Positions</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing || isPositionsLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {positions.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            No active positions found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Avg. Price</TableHead>
                  <TableHead className="text-right">Unrealized P&L</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((position) => (
                  <TableRow key={`${position.symbol}-${position.id}`}>
                    <TableCell className="font-medium">{position.symbol}</TableCell>
                    <TableCell>
                      {position.quantity > 0 ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-500 flex w-[80px] justify-center items-center">
                          <TrendingUp className="mr-1 h-3.5 w-3.5" />
                          LONG
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-500/10 text-red-500 flex w-[80px] justify-center items-center">
                          <TrendingDown className="mr-1 h-3.5 w-3.5" />
                          SHORT
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {Math.abs(position.quantity).toLocaleString(undefined, { 
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 8
                      })}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {position.avg_price.toLocaleString(undefined, { 
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 8
                      })}
                    </TableCell>
                    <TableCell className={`text-right font-mono ${position.unrealised_pnl > 0 ? 'text-green-500' : position.unrealised_pnl < 0 ? 'text-red-500' : ''}`}>
                      {position.unrealised_pnl.toLocaleString(undefined, { 
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                        signDisplay: 'always'
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleClosePosition(position)}
                        disabled={isOrderLoading}
                      >
                        Close
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
