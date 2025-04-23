'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MoreHorizontal, 
  RefreshCw, 
  XCircle, 
  CheckCircle, 
  AlertCircle 
} from 'lucide-react';
import { 
  orderManagementService, 
  Order, 
  OrderStatus 
} from '@/utils/trading/order-management-service';
import { useToast } from '@/components/ui/use-toast';
import { formatPrice } from '@/utils/format';

interface OrdersListProps {
  exchangeCredentialId: number;
  refreshTrigger?: number;
}

export function OrdersList({ exchangeCredentialId, refreshTrigger = 0 }: OrdersListProps) {
  const { toast } = useToast();
  
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [loadingActive, setLoadingActive] = useState<boolean>(false);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [selectedTab, setSelectedTab] = useState<string>('active');
  
  // Load orders
  const loadOrders = async () => {
    if (selectedTab === 'active') {
      setLoadingActive(true);
      try {
        const orders = await orderManagementService.getOrders(
          undefined,
          { status: 'new' as OrderStatus }
        );
        setActiveOrders(orders.filter(order => 
          !['filled', 'canceled', 'rejected', 'expired'].includes(order.status)
        ));
      } catch (error: any) {
        console.error('Error loading active orders:', error);
        toast({
          title: 'Error loading orders',
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        setLoadingActive(false);
      }
    } else {
      setLoadingHistory(true);
      try {
        const orders = await orderManagementService.getOrders(
          undefined,
          undefined,
          100 // Limit to 100 orders
        );
        setHistoryOrders(orders.filter(order => 
          ['filled', 'canceled', 'rejected', 'expired'].includes(order.status)
        ));
      } catch (error: any) {
        console.error('Error loading order history:', error);
        toast({
          title: 'Error loading order history',
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        setLoadingHistory(false);
      }
    }
  };
  
  // Initial load and refresh on tab change, exchange change or manual refresh
  useEffect(() => {
    loadOrders();
  }, [selectedTab, exchangeCredentialId, refreshTrigger]);
  
  // Set up real-time subscriptions to order updates
  useEffect(() => {
    // Subscribe to active order updates
    activeOrders.forEach(order => {
      orderManagementService.subscribeToOrderUpdates(order.id, (updatedOrder) => {
        // Update the order in our local state
        if (['filled', 'canceled', 'rejected', 'expired'].includes(updatedOrder.status)) {
          // Remove from active orders
          setActiveOrders(prev => prev.filter(o => o.id !== updatedOrder.id));
          // Add to history orders
          setHistoryOrders(prev => [updatedOrder, ...prev]);
        } else {
          // Update in active orders
          setActiveOrders(prev => 
            prev.map(o => o.id === updatedOrder.id ? updatedOrder : o)
          );
        }
      });
    });
    
    // Cleanup subscriptions on unmount
    return () => {
      activeOrders.forEach(order => {
        orderManagementService.unsubscribeFromOrderUpdates(order.id);
      });
    };
  }, [activeOrders]);
  
  const handleCancelOrder = async (orderId: number) => {
    try {
      await orderManagementService.cancelOrder(orderId);
      
      toast({
        title: 'Order cancelled',
        description: 'The order has been cancelled successfully',
      });
      
      // Refresh orders
      loadOrders();
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      toast({
        title: 'Error cancelling order',
        description: error.message,
        variant: 'destructive',
      });
    }
  };
  
  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'new':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">New</Badge>;
      case 'partially_filled':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800">Partially Filled</Badge>;
      case 'filled':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Filled</Badge>;
      case 'canceled':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Cancelled</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Rejected</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const renderOrderRow = (order: Order, isHistory: boolean = false) => (
    <TableRow key={order.id}>
      <TableCell className="font-medium">
        {order.symbol}
      </TableCell>
      <TableCell>
        <Badge variant={order.side === 'buy' ? 'default' : 'destructive'} className={`${order.side === 'buy' ? 'bg-green-500' : ''} text-white`}>
          {order.side.toUpperCase()}
        </Badge>
      </TableCell>
      <TableCell>{order.order_type.replace('_', ' ').toUpperCase()}</TableCell>
      <TableCell>{order.quantity}</TableCell>
      <TableCell>{order.price ? formatPrice(order.price) : 'Market'}</TableCell>
      <TableCell>
        {getStatusBadge(order.status as OrderStatus)}
      </TableCell>
      <TableCell>{order.executed_quantity > 0 ? order.executed_quantity : '-'}</TableCell>
      <TableCell>{order.executed_price ? formatPrice(order.executed_price) : '-'}</TableCell>
      <TableCell>{new Date(order.created_at).toLocaleString()}</TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => orderManagementService.checkOrderStatus(order.id)}
            >
              Refresh Status
            </DropdownMenuItem>
            {!isHistory && !['filled', 'canceled', 'rejected', 'expired'].includes(order.status) && (
              <DropdownMenuItem
                onClick={() => handleCancelOrder(order.id)}
                className="text-red-600"
              >
                Cancel Order
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between">
          <div>
            <CardTitle>Orders</CardTitle>
            <CardDescription>
              Manage your active orders and view order history
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadOrders}
            disabled={loadingActive || loadingHistory}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${(loadingActive || loadingHistory) ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs 
          defaultValue="active" 
          value={selectedTab}
          onValueChange={setSelectedTab}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active">
              Active Orders
              {activeOrders.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeOrders.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history">Order History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="active" className="mt-4">
            {loadingActive ? (
              <div className="flex justify-center items-center h-40">
                <RefreshCw className="h-8 w-8 animate-spin opacity-30" />
              </div>
            ) : activeOrders.length > 0 ? (
              <div className="rounded-md border overflow-auto max-h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Side</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Filled</TableHead>
                      <TableHead>Avg. Price</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeOrders.map(order => renderOrderRow(order))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 border rounded-md">
                <XCircle className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No active orders</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="history" className="mt-4">
            {loadingHistory ? (
              <div className="flex justify-center items-center h-40">
                <RefreshCw className="h-8 w-8 animate-spin opacity-30" />
              </div>
            ) : historyOrders.length > 0 ? (
              <div className="rounded-md border overflow-auto max-h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Side</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Filled</TableHead>
                      <TableHead>Avg. Price</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyOrders.map(order => renderOrderRow(order, true))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 border rounded-md">
                <AlertCircle className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No order history</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
