"use client";

import React from 'react';
import { History, Filter, CheckCircle, XCircle, Clock } from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OrdersTableProps {
  symbol: string;
  exchangeId: string;
  refreshTrigger: number;
}

export function OrdersTable({ symbol, exchangeId, refreshTrigger }: OrdersTableProps) {
  const [orders, setOrders] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<'all' | 'pending' | 'filled' | 'canceled'>('all');
  
  // Fetch orders when component mounts or when refreshTrigger changes
  React.useEffect(() => {
    fetchOrders();
  }, [symbol, exchangeId, refreshTrigger]);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      // In a real app, this would call your API with the symbol and exchangeId
      const data = await fetch(`/api/trading/orders?symbol=${symbol}&exchangeId=${exchangeId}`).then(res => res.json());
      setOrders(data || []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Format number with specific precision
  const formatNumber = (num: number | undefined, precision: number = 2): string => {
    if (num === undefined) return 'N/A';
    return num.toLocaleString('en-US', {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision
    });
  };
  
  // Format date
  const formatDate = (timestamp: number | undefined): string => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };
  
  // Get filtered orders
  const getFilteredOrders = (): any[] => {
    if (filter === 'all') return orders;
    return orders.filter((order: any) => {
      switch (filter) {
        case 'pending':
          return order.status === 'pending' || order.status === 'open';
        case 'filled':
          return order.status === 'filled' || order.status === 'partial';
        case 'canceled':
          return order.status === 'canceled' || order.status === 'rejected';
        default:
          return true;
      }
    });
  };
  
  // Get order type label
  const getOrderTypeLabel = (type: string): string => {
    switch (type) {
      case 'MARKET':
        return 'Market';
      case 'LIMIT':
        return 'Limit';
      case 'STOP':
        return 'Stop';
      case 'STOP_LIMIT':
        return 'Stop Limit';
      default:
        return 'Unknown';
    }
  };
  
  // Get order status badge
  const getOrderStatusBadge = (status: string): React.ReactNode => {
    let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
    let icon = null;
    
    switch (status) {
      case 'filled':
        variant = 'default';
        icon = <CheckCircle className="h-3.5 w-3.5 mr-1 text-green-500" />;
        break;
      case 'pending':
      case 'open':
        variant = 'secondary';
        icon = <Clock className="h-3.5 w-3.5 mr-1 text-yellow-500" />;
        break;
      case 'canceled':
      case 'rejected':
        variant = 'destructive';
        icon = <XCircle className="h-3.5 w-3.5 mr-1 text-red-500" />;
        break;
    }
    
    return (
      <Badge variant={variant} className="flex items-center">
        {icon}
        <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
      </Badge>
    );
  };
  
  // Handle filter selection
  const handleFilterChange = (value: string) => {
    setFilter(value as 'all' | 'pending' | 'filled' | 'canceled');
  };

  // Render empty state
  const renderEmptyState = () => {
    return (
      <div className="p-8 text-center">
        <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No orders found</h3>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          {filter === 'all' 
            ? 'When the agent creates orders, they will appear here.'
            : `No ${filter} orders found. Try changing the filter.`}
        </p>
      </div>
    );
  };
  
  // Render orders table
  const renderOrdersTable = () => {
    const filteredOrders = getFilteredOrders();
    
    if (isLoading) {
      return (
        <div className="p-8 text-center">
          <div className="spinner-border animate-spin inline-block w-8 h-8 border-4 rounded-full text-blue-600" role="status">
            <span className="sr-only">Loading...</span>
          </div>
        </div>
      );
    }
    
    if (filteredOrders.length === 0) {
      return renderEmptyState();
    }
    
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Side</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Filled Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map(order => (
              <TableRow key={order.id}>
                <TableCell>{order.symbol}</TableCell>
                <TableCell>
                  <span className={order.side === 'BUY' ? 'text-green-500' : 'text-red-500'}>
                    {order.side.toUpperCase()}
                  </span>
                </TableCell>
                <TableCell>{getOrderTypeLabel(order.type)}</TableCell>
                <TableCell>{formatNumber(order.quantity, 6)}</TableCell>
                <TableCell>${formatNumber(order.price)}</TableCell>
                <TableCell>
                  {order.filledPrice 
                    ? `$${formatNumber(order.filledPrice)}` 
                    : <span className="text-muted-foreground">-</span>
                  }
                </TableCell>
                <TableCell>{getOrderStatusBadge(order.status)}</TableCell>
                <TableCell>
                  <div className="text-xs">
                    <div>Created: {formatDate(order.createdAt)}</div>
                    {order.filledAt && (
                      <div>Filled: {formatDate(order.filledAt)}</div>
                    )}
                    {order.canceledAt && (
                      <div>Canceled: {formatDate(order.canceledAt)}</div>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-medium">Orders</h3>
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select 
            value={filter} 
            onValueChange={handleFilterChange}
          >
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="filled">Filled</SelectItem>
              <SelectItem value="canceled">Canceled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {renderOrdersTable()}
      </div>
    </div>
  );
}
