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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { XCircle } from 'lucide-react';
import { TradingSystemClient } from '@/utils/supabase/trading-system';

// Order status badge colors
const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  open: 'bg-blue-100 text-blue-800 border-blue-200',
  partially_filled: 'bg-purple-100 text-purple-800 border-purple-200',
  filled: 'bg-green-100 text-green-800 border-green-200',
  canceled: 'bg-gray-100 text-gray-800 border-gray-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  expired: 'bg-orange-100 text-orange-800 border-orange-200'
};

interface OrdersTableProps {
  farmId: string;
  symbol?: string;
  isPaperTrading?: boolean;
  onCancelOrder?: (orderId: string) => Promise<void>;
  refreshTrigger?: number; // Used to trigger refresh when changed
}

export function OrdersTable({ 
  farmId, 
  symbol, 
  isPaperTrading, 
  onCancelOrder,
  refreshTrigger = 0
}: OrdersTableProps) {
  const [orders, setOrders] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchOrders = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await TradingSystemClient.getOrders(farmId, {
        symbol,
        isPaperTrading,
        limit: 50
      });
      
      setOrders(data);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [farmId, symbol, isPaperTrading]);

  React.useEffect(() => {
    fetchOrders();
  }, [fetchOrders, refreshTrigger]);

  const handleCancelOrder = async (orderId: string) => {
    if (onCancelOrder) {
      try {
        await onCancelOrder(orderId);
        // Refresh orders
        fetchOrders();
      } catch (err) {
        console.error('Error canceling order:', err);
      }
    }
  };

  const getStatusBadgeClass = (status: string) => {
    return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';
  };

  if (loading && orders.length === 0) {
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
            <TableHead>Type</TableHead>
            <TableHead>Side</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Filled</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                No orders found
              </TableCell>
            </TableRow>
          ) : (
            orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="whitespace-nowrap">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>{formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {new Date(order.created_at).toLocaleString()}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell className="font-mono">{order.symbol}</TableCell>
                <TableCell className="capitalize">{order.order_type.replace('_', ' ')}</TableCell>
                <TableCell>
                  <span className={order.side === 'buy' ? 'text-green-600' : 'text-red-600'}>
                    {order.side.toUpperCase()}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getStatusBadgeClass(order.status)}>
                    {order.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {Number(order.quantity).toLocaleString(undefined, { 
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 8
                  })}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {order.price ? Number(order.price).toLocaleString(undefined, {
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 8
                  }) : 'Market'}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {order.filled_quantity ? (
                    <span>
                      {Number(order.filled_quantity).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 8
                      })}
                      <span className="text-muted-foreground ml-1">
                        ({Math.round((order.filled_quantity / order.quantity) * 100)}%)
                      </span>
                    </span>
                  ) : '0'}
                </TableCell>
                <TableCell className="text-center">
                  {['open', 'partially_filled', 'pending'].includes(order.status) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCancelOrder(order.id)}
                      title="Cancel Order"
                    >
                      <XCircle className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
