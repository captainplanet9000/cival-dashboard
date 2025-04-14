import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { TradingSystemClient } from '@/utils/supabase/trading-system';

interface TradeHistoryTableProps {
  farmId: string;
  symbol?: string;
  isPaperTrading?: boolean;
  limit?: number;
  refreshTrigger?: number; // Used to trigger refresh when changed
}

export function TradeHistoryTable({ 
  farmId, 
  symbol, 
  isPaperTrading,
  limit = 20,
  refreshTrigger = 0
}: TradeHistoryTableProps) {
  const [trades, setTrades] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchTrades = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await TradingSystemClient.getTrades(farmId, {
        symbol,
        isPaperTrading,
        limit
      });
      
      setTrades(data);
    } catch (err) {
      console.error('Error fetching trades:', err);
      setError('Failed to load trade history. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [farmId, symbol, isPaperTrading, limit]);

  React.useEffect(() => {
    fetchTrades();
  }, [fetchTrades, refreshTrigger]);

  if (loading && trades.length === 0) {
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
            <TableHead>Time</TableHead>
            <TableHead>Symbol</TableHead>
            <TableHead>Side</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Value</TableHead>
            <TableHead className="text-right">Fee</TableHead>
            <TableHead className="text-right">Realized PnL</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trades.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                No trades found
              </TableCell>
            </TableRow>
          ) : (
            trades.map((trade) => {
              const tradeValue = trade.quantity * trade.price;
              const isProfitable = trade.realized_pnl > 0;
              
              return (
                <TableRow key={trade.id}>
                  <TableCell className="whitespace-nowrap">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>{formatDistanceToNow(new Date(trade.execution_timestamp), { addSuffix: true })}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {new Date(trade.execution_timestamp).toLocaleString()}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="font-mono">{trade.symbol}</TableCell>
                  <TableCell>
                    <span className={trade.side === 'buy' ? 'text-green-600' : 'text-red-600'}>
                      {trade.side.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {Number(trade.quantity).toLocaleString(undefined, { 
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 8
                    })}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {Number(trade.price).toLocaleString(undefined, {
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 8
                    })}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {tradeValue.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {trade.commission ? Number(trade.commission).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 8
                    }) : '0.00'}
                    {trade.commission_asset && ` ${trade.commission_asset}`}
                  </TableCell>
                  <TableCell className={`text-right font-mono ${
                    trade.realized_pnl === null || trade.realized_pnl === undefined
                      ? 'text-muted-foreground'
                      : isProfitable ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {trade.realized_pnl !== null && trade.realized_pnl !== undefined
                      ? `${isProfitable ? '+' : ''}${Number(trade.realized_pnl).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}`
                      : 'N/A'}
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
