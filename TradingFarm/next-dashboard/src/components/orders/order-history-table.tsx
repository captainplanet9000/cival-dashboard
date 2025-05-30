'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDown,
  MoreHorizontal,
  Eye,
  ClipboardCopy,
  RotateCcw,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  BarChart2,
  CopyPlus,
  Trash2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cancelOrderById } from '@/app/actions/order-actions';
import { useToast } from '@/components/ui/use-toast';
import { OrderType } from '@/services/advanced-order-service';

// Types for the order history
type OrderStatus = 'new' | 'open' | 'filled' | 'partial_fill' | 'canceled' | 'rejected' | 'expired';

interface Order {
  id: string;
  farm_id: string;
  agent_id?: string;
  strategy_id?: string;
  exchange: string;
  exchange_account_id?: string;
  symbol: string;
  order_type: OrderType;
  side: 'buy' | 'sell';
  quantity: number;
  filled_quantity: number;
  price?: number;
  stop_price?: number;
  trail_value?: number;
  trail_type?: 'amount' | 'percentage';
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
  // Additional fields for specific order types
  [key: string]: any;
}

interface OrderHistoryTableProps {
  orders: Order[];
  onRefresh?: () => void;
  loading?: boolean;
  farmId?: string;
  agentId?: string;
}

export default function OrderHistoryTable({ 
  orders, 
  onRefresh, 
  loading = false,
  farmId,
  agentId,
}: OrderHistoryTableProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [processingOrder, setProcessingOrder] = useState<string | null>(null);

  // Function to handle order cancellation
  const handleCancelOrder = async (orderId: string) => {
    try {
      setProcessingOrder(orderId);
      const result = await cancelOrderById(orderId);
      
      if (result.success) {
        toast({
          title: 'Order canceled',
          description: 'The order has been successfully canceled.',
        });
        if (onRefresh) onRefresh();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to cancel order',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error canceling order:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setProcessingOrder(null);
    }
  };

  // Function to copy an order as a new order
  const handleCopyOrder = (order: Order) => {
    const baseParams = new URLSearchParams({
      farm_id: order.farm_id,
    });
    
    if (order.agent_id) baseParams.append('agent_id', order.agent_id);
    if (order.strategy_id) baseParams.append('strategy_id', order.strategy_id);
    
    // Redirect to create order page with prefilled values
    router.push(`/trading/orders/create?${baseParams.toString()}&copy_from=${order.id}`);
  };

  // View order details
  const handleViewOrder = (orderId: string) => {
    router.push(`/trading/orders/${orderId}`);
  };

  // Order analysis
  const handleAnalyzeOrder = (orderId: string) => {
    router.push(`/trading/orders/${orderId}/analysis`);
  };

  // Function to get the badge color based on order status
  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'new':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Clock className="mr-1 h-3 w-3" />
            New
          </Badge>
        );
      case 'open':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Clock className="mr-1 h-3 w-3" />
            Open
          </Badge>
        );
      case 'filled':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Filled
          </Badge>
        );
      case 'partial_fill':
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            <BarChart2 className="mr-1 h-3 w-3" />
            Partial
          </Badge>
        );
      case 'canceled':
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            <XCircle className="mr-1 h-3 w-3" />
            Canceled
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Rejected
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            <Clock className="mr-1 h-3 w-3" />
            Expired
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        );
    }
  };

  // Function to format order type for display
  const formatOrderType = (type: OrderType) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="rounded-md border">
      <div className="flex items-center justify-between p-4">
        <h3 className="text-lg font-medium">Order History</h3>
        <Button 
          variant="outline" 
          size="sm"
          disabled={loading}
          onClick={onRefresh}
        >
          <RotateCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Symbol</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Side</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Filled</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Exchange</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  No orders found
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell>{order.symbol}</TableCell>
                  <TableCell>{formatOrderType(order.order_type)}</TableCell>
                  <TableCell>
                    <span className={order.side === 'buy' ? 'text-green-600' : 'text-red-600'}>
                      {order.side.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell>
                    {order.price ? (
                      `$${order.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    ) : order.stop_price ? (
                      `$${order.stop_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    ) : (
                      'Market'
                    )}
                  </TableCell>
                  <TableCell>{order.quantity}</TableCell>
                  <TableCell>
                    {order.filled_quantity > 0 ? (
                      <div className="flex flex-col">
                        <span>{order.filled_quantity}</span>
                        {order.quantity > 0 && (
                          <span className="text-xs text-muted-foreground">
                            ({((order.filled_quantity / order.quantity) * 100).toFixed(1)}%)
                          </span>
                        )}
                      </div>
                    ) : (
                      '0'
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell>{order.exchange}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={processingOrder === order.id}>
                          {processingOrder === order.id ? (
                            <RotateCcw className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreHorizontal className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewOrder(order.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem onClick={() => handleCopyOrder(order)}>
                          <CopyPlus className="mr-2 h-4 w-4" />
                          Copy as New Order
                        </DropdownMenuItem>

                        {(order.status === 'new' || order.status === 'open' || order.status === 'partial_fill') && (
                          <DropdownMenuItem onClick={() => handleCancelOrder(order.id)}>
                            <XCircle className="mr-2 h-4 w-4" />
                            Cancel Order
                          </DropdownMenuItem>
                        )}
                        
                        {(order.status === 'filled' || order.status === 'partial_fill') && (
                          <DropdownMenuItem onClick={() => handleAnalyzeOrder(order.id)}>
                            <BarChart2 className="mr-2 h-4 w-4" />
                            Analyze Execution
                          </DropdownMenuItem>
                        )}
                        
                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(order.id)}>
                          <ClipboardCopy className="mr-2 h-4 w-4" />
                          Copy Order ID
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
