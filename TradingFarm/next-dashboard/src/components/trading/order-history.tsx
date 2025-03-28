'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowDown, 
  ArrowUp, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  HelpCircle,
  StopCircle
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Card, CardContent } from '@/components/ui/card';

import { cn, formatDate as formatDateUtil } from '@/components/utils';
import {
  format
} from 'date-fns';

interface OrderHistoryProps {
  orders?: any[];
  loading?: boolean;
  showCancelButton?: boolean;
  onCancelOrder?: (orderId: string) => void;
  refreshTrigger?: number;
  symbol?: string;
}

export default function OrderHistory({ 
  orders: initialOrders = [], 
  loading: initialLoading = false, 
  showCancelButton = true,
  onCancelOrder,
  refreshTrigger,
  symbol
}: OrderHistoryProps) {
  const [expandedOrderId, setExpandedOrderId] = React.useState<string | null>(null);
  const [orders, setOrders] = React.useState<any[]>(initialOrders);
  const [loading, setLoading] = React.useState<boolean>(initialLoading);
  
  // Fetch orders when component mounts or when refreshTrigger changes
  React.useEffect(() => {
    if (refreshTrigger !== undefined) {
      fetchOrderHistory();
    }
  }, [refreshTrigger, symbol]);
  
  const fetchOrderHistory = async () => {
    setLoading(true);
    try {
      // In a real app, this would call your API with the symbol
      const url = symbol 
        ? `/api/trading/order-history?symbol=${symbol}` 
        : '/api/trading/order-history';
      
      const data = await fetch(url).then(res => res.json());
      setOrders(data || []);
    } catch (error) {
      console.error('Failed to fetch order history:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle order expansion
  const toggleOrderDetails = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };
  
  // Handle order cancellation
  const handleCancelOrder = (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCancelOrder) {
      onCancelOrder(orderId);
    }
  };
  
  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
      case 'new':
      case 'active':
        return (
          <Badge className="bg-blue-500 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Open</span>
          </Badge>
        );
      case 'filled':
      case 'completed':
      case 'closed':
        return (
          <Badge className="bg-green-500 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            <span>Filled</span>
          </Badge>
        );
      case 'canceled':
      case 'cancelled':
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <StopCircle className="h-3 w-3" />
            <span>Canceled</span>
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            <span>Rejected</span>
          </Badge>
        );
      case 'partial':
      case 'partially_filled':
        return (
          <Badge variant="outline" className="bg-amber-500 text-white flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            <span>Partial</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <HelpCircle className="h-3 w-3" />
            <span>{status}</span>
          </Badge>
        );
    }
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMM dd, yyyy HH:mm:ss');
    } catch (e) {
      return dateString;
    }
  };
  
  // Format price with fixed precision
  const formatPrice = (price: number) => {
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    });
  };
  
  if (loading) {
    return (
      <div className="space-y-2">
        <div className="flex justify-between mb-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }
  
  if (!orders || orders.length === 0) {
    return (
      <Card className="border border-dashed bg-transparent">
        <CardContent className="flex flex-col items-center justify-center py-6">
          <XCircle className="h-10 w-10 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">No orders found</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <Table className="border-b">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Date</TableHead>
              <TableHead>Symbol</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Side</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order: any) => (
              <Collapsible
                key={order.id}
                open={expandedOrderId === order.id}
                onOpenChange={() => {}}
                className="w-full"
              >
                <CollapsibleTrigger asChild>
                  <TableRow 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleOrderDetails(order.id)}
                  >
                    <TableCell className="font-medium">
                      {formatDate(order.created_at).split(' ')[0]}
                      <div className="text-xs text-muted-foreground">
                        {formatDate(order.created_at).split(' ')[1]}
                      </div>
                    </TableCell>
                    <TableCell>{order.symbol}</TableCell>
                    <TableCell>
                      <span className="capitalize">{order.type}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={order.side === 'buy' ? 'default' : 'destructive'}
                        className={order.side === 'buy' ? 'bg-green-500' : ''}
                      >
                        {order.side === 'buy' ? (
                          <ArrowUp className="h-3 w-3 mr-1" />
                        ) : (
                          <ArrowDown className="h-3 w-3 mr-1" />
                        )}
                        {order.side.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {order.price ? `$${formatPrice(order.price)}` : 'Market'}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPrice(order.quantity)}
                      {order.filled_quantity && order.filled_quantity !== order.quantity && (
                        <div className="text-xs text-muted-foreground">
                          Filled: {formatPrice(order.filled_quantity)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="flex justify-end">
                      {order.status.toLowerCase() === 'open' && showCancelButton ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => handleCancelOrder(order.id, e)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      ) : (
                        <div className="flex items-center">
                          {expandedOrderId === order.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <TableRow className="bg-muted/30 hover:bg-muted/50">
                    <TableCell colSpan={8} className="p-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Order ID</div>
                          <div className="font-mono text-xs break-all">{order.id}</div>
                        </div>
                        
                        <div>
                          <div className="text-muted-foreground">Order Type</div>
                          <div className="capitalize">
                            {order.type} {order.time_in_force && `(${order.time_in_force})`}
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-muted-foreground">Created At</div>
                          <div>{formatDate(order.created_at)}</div>
                        </div>
                        
                        <div>
                          <div className="text-muted-foreground">Updated At</div>
                          <div>{formatDate(order.updated_at || order.created_at)}</div>
                        </div>
                        
                        <div>
                          <div className="text-muted-foreground">Price</div>
                          <div>
                            {order.price ? `$${formatPrice(order.price)}` : 'Market'}
                            {order.avg_price && (
                              <div className="text-xs text-muted-foreground">
                                Avg: ${formatPrice(order.avg_price)}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-muted-foreground">Total Value</div>
                          <div>
                            ${formatPrice((order.price || order.avg_price || 0) * order.quantity)}
                          </div>
                        </div>
                        
                        {order.stop_price && (
                          <div>
                            <div className="text-muted-foreground">Stop Price</div>
                            <div>${formatPrice(order.stop_price)}</div>
                          </div>
                        )}
                        
                        {order.wallet_id && (
                          <div>
                            <div className="text-muted-foreground">Wallet</div>
                            <div className="font-mono text-xs">{order.wallet_id}</div>
                          </div>
                        )}
                        
                        {order.exchange && (
                          <div>
                            <div className="text-muted-foreground">Exchange</div>
                            <div>{order.exchange}</div>
                          </div>
                        )}
                        
                        {order.agent_id && (
                          <div>
                            <div className="text-muted-foreground">Agent</div>
                            <div className="font-mono text-xs">{order.agent_id}</div>
                          </div>
                        )}
                        
                        {order.farm_id && (
                          <div>
                            <div className="text-muted-foreground">Farm</div>
                            <div className="font-mono text-xs">{order.farm_id}</div>
                          </div>
                        )}
                        
                        {order.status.toLowerCase() === 'rejected' && order.reject_reason && (
                          <div className="col-span-2 md:col-span-4">
                            <div className="text-muted-foreground">Rejected Reason</div>
                            <div className="text-red-500">{order.reject_reason}</div>
                          </div>
                        )}
                        
                        {order.trades && order.trades.length > 0 && (
                          <div className="col-span-2 md:col-span-4 mt-2">
                            <div className="text-muted-foreground mb-1">Trade Executions</div>
                            <div className="border rounded-md overflow-hidden">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="text-xs">Trade ID</TableHead>
                                    <TableHead className="text-xs">Time</TableHead>
                                    <TableHead className="text-xs text-right">Price</TableHead>
                                    <TableHead className="text-xs text-right">Quantity</TableHead>
                                    <TableHead className="text-xs text-right">Fee</TableHead>
                                    <TableHead className="text-xs w-[30px]"></TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {order.trades.map((trade: any) => (
                                    <TableRow key={trade.id}>
                                      <TableCell className="text-xs font-mono">
                                        {trade.id.substring(0, 8)}...
                                      </TableCell>
                                      <TableCell className="text-xs">
                                        {formatDate(trade.executed_at || trade.created_at)}
                                      </TableCell>
                                      <TableCell className="text-xs text-right">
                                        ${formatPrice(trade.price)}
                                      </TableCell>
                                      <TableCell className="text-xs text-right">
                                        {formatPrice(trade.quantity)}
                                      </TableCell>
                                      <TableCell className="text-xs text-right">
                                        {trade.fee ? `${trade.fee} ${trade.fee_currency || ''}` : '-'}
                                      </TableCell>
                                      <TableCell>
                                        {trade.explorer_url && (
                                          <a 
                                            href={trade.explorer_url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-blue-500 hover:text-blue-600"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <ExternalLink className="h-3 w-3" />
                                          </a>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
