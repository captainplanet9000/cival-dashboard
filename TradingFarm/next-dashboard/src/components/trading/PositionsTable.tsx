import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { X } from 'lucide-react';
import { TradingSystemClient } from '@/utils/supabase/trading-system';
import { useMarketDataStore } from '@/utils/exchanges/market-data-service';

interface PositionsTableProps {
  farmId: string;
  symbol?: string;
  isPaperTrading?: boolean;
  exchangeName?: string;
  onClosePosition?: (positionId: string, symbol: string, side: string) => Promise<void>;
  refreshTrigger?: number; // Used to trigger refresh when changed
}

export function PositionsTable({ 
  farmId, 
  symbol, 
  isPaperTrading,
  exchangeName = 'coinbase', 
  onClosePosition,
  refreshTrigger = 0
}: PositionsTableProps) {
  const [positions, setPositions] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const tickers = useMarketDataStore(state => state.tickers);

  const fetchPositions = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await TradingSystemClient.getPositions(farmId, {
        symbol,
        isPaperTrading,
        status: 'open'
      });
      
      setPositions(data);
    } catch (err) {
      console.error('Error fetching positions:', err);
      setError('Failed to load positions. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [farmId, symbol, isPaperTrading]);

  React.useEffect(() => {
    fetchPositions();
    
    // Refresh positions every 15 seconds to update PnL
    const intervalId = setInterval(fetchPositions, 15000);
    
    return () => clearInterval(intervalId);
  }, [fetchPositions, refreshTrigger]);

  const handleClosePosition = async (positionId: string, symbol: string, side: string) => {
    if (onClosePosition) {
      try {
        await onClosePosition(positionId, symbol, side);
        // Refresh positions
        fetchPositions();
      } catch (err) {
        console.error('Error closing position:', err);
      }
    }
  };

  // Calculate real-time PnL using market data if available
  const calculateRealtimePnL = (position: any) => {
    const tickerKey = `${exchangeName}:${position.symbol}`;
    const currentTicker = tickers[tickerKey];
    
    if (!currentTicker) {
      return {
        unrealizedPnl: position.unrealized_pnl,
        pnlPercent: ((position.unrealized_pnl / (position.quantity * position.entry_price)) * 100) || 0
      };
    }
    
    const currentPrice = currentTicker.last;
    let unrealizedPnl = 0;
    
    if (position.side === 'long') {
      unrealizedPnl = position.quantity * (currentPrice - position.entry_price);
    } else {
      unrealizedPnl = position.quantity * (position.entry_price - currentPrice);
    }
    
    const pnlPercent = ((unrealizedPnl / (position.quantity * position.entry_price)) * 100) || 0;
    
    return { unrealizedPnl, pnlPercent };
  };

  if (loading && positions.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4 my-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Symbol</TableHead>
            <TableHead>Side</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Entry Price</TableHead>
            <TableHead className="text-right">Current Price</TableHead>
            <TableHead className="text-right">Unrealized PnL</TableHead>
            <TableHead className="text-right">PnL %</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {positions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                No open positions
              </TableCell>
            </TableRow>
          ) : (
            positions.map((position) => {
              const { unrealizedPnl, pnlPercent } = calculateRealtimePnL(position);
              const isProfitable = unrealizedPnl > 0;
              
              return (
                <TableRow key={position.id}>
                  <TableCell className="font-mono">{position.symbol}</TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={position.side === 'long' 
                        ? 'bg-green-100 text-green-800 border-green-200' 
                        : 'bg-red-100 text-red-800 border-red-200'}
                    >
                      {position.side.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {Number(position.quantity).toLocaleString(undefined, { 
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 8
                    })}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {Number(position.entry_price).toLocaleString(undefined, {
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 8
                    })}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {Number(position.current_price).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 8
                    })}
                  </TableCell>
                  <TableCell className={`text-right font-mono ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                    {(isProfitable ? '+' : '') + unrealizedPnl.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </TableCell>
                  <TableCell className={`text-right font-mono ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                    {(isProfitable ? '+' : '') + pnlPercent.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}%
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleClosePosition(position.id, position.symbol, position.side)}
                      title="Close Position"
                    >
                      <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
