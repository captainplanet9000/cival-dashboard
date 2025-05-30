/**
 * Real-time Orders Widget for Trading Farm Dashboard
 * Performance-optimized component using virtualization and WebSockets
 */
'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button-standardized';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CircleAlertIcon, ClockIcon, RefreshCw, Filter, CheckCircle2, XCircle, Clock8 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VirtualizedTable, Column } from '@/components/ui/virtualized-table';
import { DashboardWidgetState } from '@/components/ui/dashboard-states';
import { useRealTimeOrders } from '@/hooks/queries/use-real-time-orders';
import { Order, OrderStatus, OrderType } from '@/hooks/queries/use-orders';
import { formatDistance } from 'date-fns';

interface RealTimeOrdersWidgetProps {
  farmId?: string;
  walletId?: string;
  title?: string;
  description?: string;
  className?: string;
  onOrderClick?: (order: Order) => void;
  maxHeight?: number;
}

/**
 * Widget for displaying real-time order updates with optimized performance
 * Uses virtualization for large datasets and WebSockets for real-time updates
 */
export function RealTimeOrdersWidget({
  farmId,
  walletId,
  title = 'Orders',
  description = 'Real-time order status and updates',
  className,
  onOrderClick,
  maxHeight = 400,
}: RealTimeOrdersWidgetProps) {
  // State for filters
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  
  // Create status filter array based on selection
  const statusFilters = useMemo(() => {
    if (statusFilter === 'all') {
      return ['open', 'pending', 'partially_filled', 'filled', 'canceled', 'rejected'];
    }
    return [statusFilter];
  }, [statusFilter]);
  
  // Use the real-time orders hook with optimized performance
  const {
    data: orders,
    isLoading,
    isError,
    error,
    refetch,
    pendingUpdateCount,
  } = useRealTimeOrders({
    farmId,
    walletId,
    statuses: statusFilters,
    limit: 100,
    includeHistory: true,
    onOrderStatusChange: (order, previousStatus) => {
      // You could add notifications or sounds here for important changes
      console.log(`Order ${order.id} changed from ${previousStatus} to ${order.status}`);
    },
  });
  
  // Helper function to format currency values
  const formatCurrency = (value: number) => {
    if (value < 0.01) return `$${value.toFixed(6)}`;
    if (value < 1) return `$${value.toFixed(4)}`;
    if (value < 1000) return `$${value.toFixed(2)}`;
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  };
  
  // Get status badge color and icon
  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'open':
        return { icon: <Clock8 className="h-3 w-3 mr-1" />, variant: 'default', label: 'Open' };
      case 'filled':
        return { icon: <CheckCircle2 className="h-3 w-3 mr-1" />, variant: 'success', label: 'Filled' };
      case 'partially_filled':
        return { icon: <Clock8 className="h-3 w-3 mr-1" />, variant: 'warning', label: 'Partial' };
      case 'pending':
        return { icon: <ClockIcon className="h-3 w-3 mr-1" />, variant: 'outline', label: 'Pending' };
      case 'canceled':
        return { icon: <XCircle className="h-3 w-3 mr-1" />, variant: 'secondary', label: 'Canceled' };
      case 'rejected':
        return { icon: <CircleAlertIcon className="h-3 w-3 mr-1" />, variant: 'destructive', label: 'Rejected' };
      default:
        return { icon: <ClockIcon className="h-3 w-3 mr-1" />, variant: 'outline', label: status };
    }
  };
  
  // Format the relative time
  const getRelativeTime = (timestamp: string) => {
    try {
      return formatDistance(new Date(timestamp), new Date(), { addSuffix: true });
    } catch (e) {
      return 'Invalid date';
    }
  };
  
  // Define table columns with memoization to prevent unnecessary re-renders
  const columns = useMemo<Column<Order>[]>(() => [
    {
      id: 'symbol',
      header: 'Symbol',
      cell: (order) => <div className="font-medium">{order.symbol}</div>,
      className: 'w-24',
    },
    {
      id: 'side',
      header: 'Side',
      cell: (order) => (
        <Badge 
          variant={order.side === 'buy' ? 'success' : 'destructive'}
          className={cn(
            "uppercase text-xs",
            order.side === 'buy' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : 'bg-red-100 text-red-800 hover:bg-red-100'
          )}
        >
          {order.side}
        </Badge>
      ),
      className: 'w-20',
    },
    {
      id: 'type',
      header: 'Type',
      cell: (order) => <div className="text-muted-foreground text-xs capitalize">{order.type.replace('_', ' ')}</div>,
      className: 'w-24',
    },
    {
      id: 'quantity',
      header: 'Quantity',
      cell: (order) => <div className="font-mono text-right">{order.quantity.toFixed(4)}</div>,
      className: 'w-24 text-right',
    },
    {
      id: 'price',
      header: 'Price',
      cell: (order) => (
        <div className="font-mono text-right">
          {order.price ? formatCurrency(order.price) : 'Market'}
        </div>
      ),
      className: 'w-28 text-right',
    },
    {
      id: 'filled',
      header: 'Filled',
      cell: (order) => (
        <div className="font-mono text-right">
          {order.filled_quantity > 0
            ? `${((order.filled_quantity / order.quantity) * 100).toFixed(0)}%`
            : '0%'}
        </div>
      ),
      className: 'w-20 text-right',
    },
    {
      id: 'status',
      header: 'Status',
      cell: (order) => {
        const { icon, variant, label } = getStatusBadge(order.status);
        return (
          <Badge variant={variant as any} className="whitespace-nowrap">
            {icon}
            {label}
          </Badge>
        );
      },
      className: 'w-24',
    },
    {
      id: 'created',
      header: 'Created',
      cell: (order) => <div className="text-xs text-muted-foreground">{getRelativeTime(order.created_at)}</div>,
      className: 'w-28',
    },
  ], []);
  
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="px-6 py-4 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
            <SelectTrigger className="w-[130px]">
              <Filter className="mr-2 h-4 w-4" />
              <span>{statusFilter === 'all' ? 'All Statuses' : statusFilter}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="partially_filled">Partially Filled</SelectItem>
              <SelectItem value="filled">Filled</SelectItem>
              <SelectItem value="canceled">Canceled</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => refetch()}
            className="ml-auto relative"
          >
            <RefreshCw className="h-4 w-4" />
            {pendingUpdateCount > 0 && (
              <Badge 
                variant="default" 
                className="absolute -top-1 -right-1 w-4 h-4 p-0 flex items-center justify-center"
              >
                {pendingUpdateCount}
              </Badge>
            )}
            <span className="sr-only">Refresh orders</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-0">
        <DashboardWidgetState
          data={orders}
          isLoading={isLoading}
          isError={isError}
          error={error as Error}
          onRetry={() => refetch()}
        >
          <VirtualizedTable
            data={orders}
            columns={columns}
            keyExtractor={(order) => order.id}
            maxHeight={maxHeight}
            onRowClick={onOrderClick}
            stickyHeader
          />
        </DashboardWidgetState>
      </CardContent>
    </Card>
  );
}

export default RealTimeOrdersWidget;
