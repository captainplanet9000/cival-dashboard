'use client';

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { Tables } from '@/types/database.types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  ChevronDown, 
  ArrowUpDown, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  RefreshCw,
  PlusCircle,
  Send,
  XCircle
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { formatDistance } from 'date-fns';

type OrderType = Tables<'orders'>;

interface OrderManagementProps {
  userId: string;
  className?: string;
  selectedSymbol?: string;
  selectedExchange?: string;
  currentPrice?: number;
  onOrderPlaced?: (order: any) => void;
}

export function OrderManagement({ 
  userId, 
  className, 
  selectedSymbol, 
  selectedExchange,
  currentPrice,
  onOrderPlaced 
}: OrderManagementProps) {
  // State for orders management
  const [activeOrders, setActiveOrders] = useState<OrderType[]>([]);
  const [orderHistory, setOrderHistory] = useState<OrderType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connectedExchanges, setConnectedExchanges] = useState<any[]>([]);

  // State for order form
  const [orderForm, setOrderForm] = useState({
    exchange: selectedExchange || '',
    symbol: selectedSymbol || '',
    orderType: 'market',
    side: 'buy',
    quantity: 0,
    price: currentPrice || 0,
    postOnly: false,
    reduceOnly: false,
    timeInForce: 'GTC'
  });

  // State for leverage and risk management
  const [leverage, setLeverage] = useState(1);
  const [maxPositionSize, setMaxPositionSize] = useState(0);
  const [riskPercentage, setRiskPercentage] = useState(1);

  const { toast } = useToast();

  // Load active orders
  useEffect(() => {
    fetchOrders();
    fetchConnectedExchanges();
  }, [userId]);

  // Update form when selected symbol/exchange changes
  useEffect(() => {
    if (selectedSymbol) {
      setOrderForm(prev => ({...prev, symbol: selectedSymbol}));
    }
    if (selectedExchange) {
      setOrderForm(prev => ({...prev, exchange: selectedExchange}));
    }
    if (currentPrice) {
      setOrderForm(prev => ({...prev, price: currentPrice}));
    }
  }, [selectedSymbol, selectedExchange, currentPrice]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setRefreshing(true);
      const supabase = createBrowserClient();
      
      // Fetch active orders
      const { data: activeData, error: activeError } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['open', 'partially_filled', 'pending'])
        .order('created_at', { ascending: false });
      
      if (activeError) throw activeError;
      setActiveOrders(activeData || []);
      
      // Fetch order history
      const { data: historyData, error: historyError } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['filled', 'cancelled', 'rejected', 'expired'])
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (historyError) throw historyError;
      setOrderHistory(historyData || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Error Loading Orders",
        description: "There was a problem loading your orders. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchConnectedExchanges = async () => {
    try {
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('exchange_credentials')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);
      
      if (error) throw error;
      setConnectedExchanges(data || []);
      
      // If we have a connected exchange but no selected exchange, set the first one
      if (data && data.length > 0 && !orderForm.exchange) {
        setOrderForm(prev => ({...prev, exchange: data[0].exchange}));
      }
    } catch (error) {
      console.error('Error fetching connected exchanges:', error);
    }
  };

  const handleOrderFormChange = (field: string, value: any) => {
    setOrderForm(prev => ({...prev, [field]: value}));
    
    // If we're changing the order type to market, remove the price
    if (field === 'orderType' && value === 'market') {
      setOrderForm(prev => ({...prev, [field]: value, price: 0}));
    }
  };

  const calculatePositionSize = () => {
    // Simple position sizing based on risk percentage
    // In a real implementation, this would consider account balance and more complex risk models
    try {
      const supabase = createBrowserClient();
      
      // For Phase 2, we'll use a simple calculation
      // In Phase 3, we'd integrate with the risk management system
      const accountValue = 10000; // Mock account value, would come from API
      const riskAmount = accountValue * (riskPercentage / 100);
      
      // Simple position size calculation (would be more complex in production)
      const positionSize = riskAmount / currentPrice!;
      
      setMaxPositionSize(positionSize * leverage);
    } catch (error) {
      console.error('Error calculating position size:', error);
    }
  };

  const validateOrder = () => {
    if (!orderForm.exchange) {
      toast({
        title: "Exchange Required",
        description: "Please select an exchange to place your order.",
        variant: "destructive"
      });
      return false;
    }
    
    if (!orderForm.symbol) {
      toast({
        title: "Symbol Required",
        description: "Please select a trading pair for your order.",
        variant: "destructive"
      });
      return false;
    }
    
    if (orderForm.quantity <= 0) {
      toast({
        title: "Invalid Quantity",
        description: "Please enter a quantity greater than zero.",
        variant: "destructive"
      });
      return false;
    }
    
    if (orderForm.orderType === 'limit' && orderForm.price <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price for your limit order.",
        variant: "destructive"
      });
      return false;
    }
    
    return true;
  };

  const placeOrder = async () => {
    if (!validateOrder()) return;
    
    try {
      // In Phase 2, this would connect to the order management system
      // For now, we'll simulate order placement with a direct DB entry
      const supabase = createBrowserClient();
      
      const newOrder = {
        user_id: userId,
        agent_id: null, // Orders can be placed by users or agents
        exchange: orderForm.exchange,
        symbol: orderForm.symbol,
        order_type: orderForm.orderType,
        side: orderForm.side,
        quantity: orderForm.quantity,
        price: orderForm.orderType === 'market' ? null : orderForm.price,
        status: 'pending',
        external_id: null, // Would be populated after exchange confirmation
        filled_quantity: 0,
        average_price: null,
        fees: null,
        metadata: {
          post_only: orderForm.postOnly,
          reduce_only: orderForm.reduceOnly,
          time_in_force: orderForm.timeInForce,
          leverage: leverage
        }
      };
      
      const { data, error } = await supabase
        .from('orders')
        .insert([newOrder])
        .select();
      
      if (error) throw error;
      
      toast({
        title: "Order Submitted",
        description: `Your ${orderForm.side} order for ${orderForm.quantity} ${orderForm.symbol} has been submitted.`,
      });
      
      // Reset form
      setOrderForm(prev => ({
        ...prev,
        quantity: 0,
        price: currentPrice || 0,
        postOnly: false,
        reduceOnly: false
      }));
      
      // In a real implementation, we would now send the order to the exchange
      // and update it with the response
      
      // Refresh orders
      fetchOrders();
      
      // Notify parent component
      if (onOrderPlaced && data) {
        onOrderPlaced(data[0]);
      }
    } catch (error) {
      console.error('Error placing order:', error);
      toast({
        title: "Order Placement Failed",
        description: "There was a problem submitting your order. Please try again.",
        variant: "destructive"
      });
    }
  };

  const cancelOrder = async (orderId: string) => {
    try {
      // In Phase 2, this would connect to the exchange API
      // For now, we'll simulate order cancellation
      const supabase = createBrowserClient();
      
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .eq('user_id', userId); // Security check
      
      if (error) throw error;
      
      toast({
        title: "Order Cancelled",
        description: "Your order has been cancelled successfully.",
      });
      
      // Refresh orders
      fetchOrders();
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast({
        title: "Cancellation Failed",
        description: "There was a problem cancelling your order. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getOrderStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: "default" | "outline" | "secondary" | "destructive", icon: React.ReactNode }> = {
      'open': { variant: 'default', icon: <Clock className="h-3 w-3 mr-1" /> },
      'pending': { variant: 'secondary', icon: <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> },
      'partially_filled': { variant: 'secondary', icon: <ArrowUpDown className="h-3 w-3 mr-1" /> },
      'filled': { variant: 'default', icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
      'cancelled': { variant: 'outline', icon: <XCircle className="h-3 w-3 mr-1" /> },
      'rejected': { variant: 'destructive', icon: <AlertCircle className="h-3 w-3 mr-1" /> },
      'expired': { variant: 'outline', icon: <Clock className="h-3 w-3 mr-1" /> }
    };
    
    const { variant, icon } = statusMap[status] || { variant: 'outline', icon: null };
    
    return (
      <Badge variant={variant} className="flex items-center">
        {icon}
        <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
      </Badge>
    );
  };

  const renderOrderForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="exchange">Exchange</Label>
          <Select 
            value={orderForm.exchange} 
            onValueChange={(value) => handleOrderFormChange('exchange', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select exchange" />
            </SelectTrigger>
            <SelectContent>
              {connectedExchanges.map((exchange) => (
                <SelectItem key={exchange.id} value={exchange.exchange}>
                  {exchange.exchange.charAt(0).toUpperCase() + exchange.exchange.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="symbol">Symbol</Label>
          <Input 
            id="symbol" 
            value={orderForm.symbol} 
            onChange={(e) => handleOrderFormChange('symbol', e.target.value.toUpperCase())} 
            placeholder="BTC/USD"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="side">Side</Label>
          <div className="flex space-x-2">
            <Button
              type="button"
              variant={orderForm.side === 'buy' ? 'default' : 'outline'}
              onClick={() => handleOrderFormChange('side', 'buy')}
              className="flex-1"
            >
              Buy
            </Button>
            <Button
              type="button"
              variant={orderForm.side === 'sell' ? 'destructive' : 'outline'}
              onClick={() => handleOrderFormChange('side', 'sell')}
              className="flex-1"
            >
              Sell
            </Button>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="orderType">Order Type</Label>
          <Select 
            value={orderForm.orderType} 
            onValueChange={(value) => handleOrderFormChange('orderType', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select order type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="market">Market</SelectItem>
              <SelectItem value="limit">Limit</SelectItem>
              <SelectItem value="stop">Stop</SelectItem>
              <SelectItem value="stop_limit">Stop Limit</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity</Label>
          <Input 
            id="quantity" 
            type="number" 
            min={0}
            value={orderForm.quantity || ''} 
            onChange={(e) => handleOrderFormChange('quantity', parseFloat(e.target.value))} 
          />
        </div>
        
        {orderForm.orderType !== 'market' && (
          <div className="space-y-2">
            <Label htmlFor="price">Price</Label>
            <Input 
              id="price" 
              type="number" 
              min={0}
              value={orderForm.price || ''} 
              onChange={(e) => handleOrderFormChange('price', parseFloat(e.target.value))} 
            />
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="leverage">Leverage: {leverage}x</Label>
          <span className="text-xs text-muted-foreground">Max Position: {maxPositionSize.toFixed(4)}</span>
        </div>
        <Slider
          id="leverage"
          min={1}
          max={20}
          step={1}
          value={[leverage]}
          onValueChange={(value) => setLeverage(value[0])}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="postOnly"
            checked={orderForm.postOnly}
            onCheckedChange={(checked) => handleOrderFormChange('postOnly', checked)}
          />
          <Label htmlFor="postOnly">Post Only</Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch
            id="reduceOnly"
            checked={orderForm.reduceOnly}
            onCheckedChange={(checked) => handleOrderFormChange('reduceOnly', checked)}
          />
          <Label htmlFor="reduceOnly">Reduce Only</Label>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Label htmlFor="timeInForce">Time In Force:</Label>
        <Select 
          value={orderForm.timeInForce} 
          onValueChange={(value) => handleOrderFormChange('timeInForce', value)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Select TIF" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GTC">Good Till Cancelled</SelectItem>
            <SelectItem value="IOC">Immediate or Cancel</SelectItem>
            <SelectItem value="FOK">Fill or Kill</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <Button 
        className="w-full" 
        onClick={placeOrder}
        disabled={loading}
      >
        <Send className="h-4 w-4 mr-2" />
        Place {orderForm.side.charAt(0).toUpperCase() + orderForm.side.slice(1)} Order
      </Button>
    </div>
  );

  const renderActiveOrders = () => {
    if (loading && !refreshing && activeOrders.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-6">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Loading active orders...</p>
        </div>
      );
    }
    
    if (activeOrders.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="rounded-full bg-muted p-3 mb-2">
            <ClipboardIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium mb-1">No active orders</p>
          <p className="text-sm text-muted-foreground max-w-[80%]">
            Your active orders will appear here. Use the form to place new orders.
          </p>
        </div>
      );
    }
    
    return (
      <ScrollArea className="h-[300px] pr-4">
        <div className="space-y-3">
          {activeOrders.map((order) => (
            <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-1">
                <div className="flex items-center">
                  <Badge 
                    variant={order.side === 'buy' ? 'default' : 'destructive'} 
                    className="mr-2"
                  >
                    {order.side.toUpperCase()}
                  </Badge>
                  <span className="font-medium">{order.symbol}</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <span>{order.quantity} @ {order.price || 'Market'}</span>
                  <span className="mx-2">•</span>
                  <span>{order.order_type.replace('_', ' ').toUpperCase()}</span>
                </div>
                <div className="flex items-center">
                  {getOrderStatusBadge(order.status)}
                  <span className="text-xs text-muted-foreground ml-2">
                    {formatDistance(new Date(order.created_at), new Date(), { addSuffix: true })}
                  </span>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => cancelOrder(order.id)}
                disabled={order.status === 'filled'}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  };

  const renderOrderHistory = () => {
    if (loading && !refreshing && orderHistory.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-6">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Loading order history...</p>
        </div>
      );
    }
    
    if (orderHistory.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="rounded-full bg-muted p-3 mb-2">
            <Clock className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium mb-1">No order history</p>
          <p className="text-sm text-muted-foreground max-w-[80%]">
            Your order history will appear here after you've placed orders.
          </p>
        </div>
      );
    }
    
    return (
      <ScrollArea className="h-[300px] pr-4">
        <div className="space-y-3">
          {orderHistory.map((order) => (
            <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-1">
                <div className="flex items-center">
                  <Badge 
                    variant={order.side === 'buy' ? 'default' : 'destructive'} 
                    className="mr-2"
                  >
                    {order.side.toUpperCase()}
                  </Badge>
                  <span className="font-medium">{order.symbol}</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <span>{order.quantity} @ {order.average_price || order.price || 'Market'}</span>
                  <span className="mx-2">•</span>
                  <span>{order.order_type.replace('_', ' ').toUpperCase()}</span>
                </div>
                <div className="flex items-center">
                  {getOrderStatusBadge(order.status)}
                  <span className="text-xs text-muted-foreground ml-2">
                    {formatDistance(new Date(order.created_at), new Date(), { addSuffix: true })}
                  </span>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  // Clone the order for re-use (except for the id and status)
                  const { id, status, created_at, updated_at, ...orderDetails } = order;
                  setOrderForm({
                    exchange: orderDetails.exchange,
                    symbol: orderDetails.symbol,
                    orderType: orderDetails.order_type,
                    side: orderDetails.side,
                    quantity: orderDetails.quantity,
                    price: orderDetails.price || 0,
                    postOnly: orderDetails.metadata?.post_only || false,
                    reduceOnly: orderDetails.metadata?.reduce_only || false,
                    timeInForce: orderDetails.metadata?.time_in_force || 'GTC'
                  });
                  setLeverage(orderDetails.metadata?.leverage || 1);
                }}
              >
                Reuse
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Order Management</span>
          <Button variant="outline" size="sm" onClick={fetchOrders} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardTitle>
        <CardDescription>Manage your trading orders</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="newOrder" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="newOrder">New Order</TabsTrigger>
            <TabsTrigger value="activeOrders">Active ({activeOrders.length})</TabsTrigger>
            <TabsTrigger value="orderHistory">History</TabsTrigger>
          </TabsList>
          <TabsContent value="newOrder" className="p-6">
            {renderOrderForm()}
          </TabsContent>
          <TabsContent value="activeOrders" className="p-6">
            {renderActiveOrders()}
          </TabsContent>
          <TabsContent value="orderHistory" className="p-6">
            {renderOrderHistory()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Clipboard icon component for empty state
function ClipboardIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </svg>
  );
}
