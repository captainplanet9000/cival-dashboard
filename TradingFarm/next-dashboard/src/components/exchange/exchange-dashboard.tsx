import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown, Wallet, TrendingUp, BarChart3, ArrowLeftRight, AlertCircle } from 'lucide-react';
import { createBrowserClient } from '@/utils/supabase/client';
import { BybitBalance, BybitOrder, BybitPosition, MarketData, OrderParams } from '@/utils/exchange/types';
import useExchange from '@/hooks/use-exchange';

interface ExchangeDashboardProps {
  exchangeId: string | null;
  onExchangeChange: (exchangeId: string | null) => void;
}

export default function ExchangeDashboard({ exchangeId, onExchangeChange }: ExchangeDashboardProps) {
  const supabase = createBrowserClient();
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [availableExchanges, setAvailableExchanges] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
  const [orderForm, setOrderForm] = useState({
    symbol: '',
    side: 'Buy' as 'Buy' | 'Sell',
    orderType: 'Market' as 'Market' | 'Limit',
    qty: '',
    price: '',
    reduceOnly: false
  });
  
  // Use the exchange hook
  const {
    isLoading, 
    isConnected,
    balances, 
    positions, 
    activeOrders, 
    orderHistory,
    marketData,
    connectExchange,
    disconnectExchange,
    refreshBalances,
    refreshPositions,
    refreshOrders,
    refreshOrderHistory,
    refreshMarketData,
    createOrder,
    cancelOrder,
    getExchangeConfig
  } = useExchange(exchangeId || undefined);

  // Fetch available exchanges
  const fetchAvailableExchanges = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;
      
      const { data, error } = await supabase
        .from('exchange_configs')
        .select('id, name')
        .eq('user_id', session.user.id);
      
      if (error) throw error;
      
      setAvailableExchanges(data || []);
    } catch (error) {
      console.error('Error fetching available exchanges:', error);
    }
  };

  // Handle exchange change
  const handleExchangeChange = async (id: string) => {
    if (isConnected) {
      await disconnectExchange();
    }
    
    onExchangeChange(id);
    await connectExchange(id);
  };

  // Setup refresh interval
  useEffect(() => {
    if (isConnected && exchangeId) {
      // Initial data fetch
      refreshBalances();
      refreshPositions();
      refreshOrders();
      refreshOrderHistory();
      refreshMarketData();
      
      // Set up refresh interval (every 15 seconds)
      const interval = setInterval(() => {
        refreshBalances();
        refreshPositions();
        refreshOrders();
        refreshMarketData();
      }, 15000);
      
      setRefreshInterval(interval);
      
      return () => {
        if (interval) clearInterval(interval);
      };
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }
  }, [isConnected, exchangeId]);

  // Fetch available exchanges on mount
  useEffect(() => {
    fetchAvailableExchanges();
  }, []);

  // Update available symbols when market data changes
  useEffect(() => {
    if (marketData.length > 0) {
      const symbols = marketData.map(item => item.symbol);
      setAvailableSymbols(symbols);
      
      // Set selected symbol if not already set
      if (!selectedSymbol && symbols.length > 0) {
        setSelectedSymbol(symbols[0]);
        setOrderForm(prev => ({ ...prev, symbol: symbols[0] }));
      }
    }
  }, [marketData]);

  // Handle order form changes
  const handleOrderFormChange = (field: string, value: any) => {
    setOrderForm(prev => ({ ...prev, [field]: value }));
  };

  // Handle order submission
  const handleSubmitOrder = async () => {
    try {
      // Validate form
      if (!orderForm.symbol) {
        toast({
          title: 'Validation Error',
          description: 'Symbol is required',
          variant: 'destructive',
        });
        return;
      }
      
      if (!orderForm.qty || parseFloat(orderForm.qty) <= 0) {
        toast({
          title: 'Validation Error',
          description: 'Quantity must be greater than 0',
          variant: 'destructive',
        });
        return;
      }
      
      if (orderForm.orderType === 'Limit' && (!orderForm.price || parseFloat(orderForm.price) <= 0)) {
        toast({
          title: 'Validation Error',
          description: 'Price is required for Limit orders',
          variant: 'destructive',
        });
        return;
      }
      
      // Create order params
      const params: OrderParams = {
        symbol: orderForm.symbol,
        side: orderForm.side,
        orderType: orderForm.orderType,
        qty: orderForm.qty,
        price: orderForm.orderType === 'Limit' ? orderForm.price : undefined,
        reduceOnly: orderForm.reduceOnly
      };
      
      // Submit order
      const result = await createOrder(params);
      
      if (result) {
        // Success, reset form
        setOrderForm(prev => ({
          ...prev,
          qty: '',
          price: ''
        }));
        
        // Refresh data
        refreshBalances();
        refreshPositions();
        refreshOrders();
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      toast({
        title: 'Order Error',
        description: error instanceof Error ? error.message : 'Failed to submit order',
        variant: 'destructive',
      });
    }
  };

  // Handle order cancellation
  const handleCancelOrder = async (symbol: string, orderId: string) => {
    try {
      const success = await cancelOrder(symbol, orderId);
      
      if (success) {
        // Refresh orders
        refreshOrders();
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast({
        title: 'Cancel Error',
        description: error instanceof Error ? error.message : 'Failed to cancel order',
        variant: 'destructive',
      });
    }
  };

  // Get selected market data
  const getSelectedMarketData = () => {
    return marketData.find(item => item.symbol === selectedSymbol);
  };

  // Format currency amount
  const formatCurrency = (amount: string | number, digits: number = 2) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return num.toLocaleString(undefined, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  };

  // Calculate total balance in USD
  const getTotalBalanceUSD = () => {
    return balances.reduce((total, balance) => {
      const usdValue = balance.usdValue ? parseFloat(balance.usdValue) : 0;
      return total + usdValue;
    }, 0);
  };

  // Get current exchange config
  const exchangeConfig = getExchangeConfig();

  // Render loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-8 w-8 border-2 border-current border-t-transparent rounded-full"></div>
              <span className="ml-3">Loading exchange data...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render not connected state
  if (!isConnected || !exchangeId) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Exchange Dashboard</CardTitle>
            <CardDescription>Connect to an exchange to view your trading dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Exchange</Label>
                <Select
                  value={exchangeId || ''}
                  onValueChange={handleExchangeChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an exchange" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableExchanges.map(exchange => (
                      <SelectItem key={exchange.id} value={exchange.id}>
                        {exchange.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {availableExchanges.length === 0 && (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <AlertCircle className="h-8 w-8 mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">No exchanges found. Add an exchange in the "Add Exchange" tab.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get currently selected market data
  const selectedMarketData = getSelectedMarketData();

  return (
    <div className="space-y-6">
      {/* Exchange Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{exchangeConfig?.name || 'Exchange'}</h2>
          <div className="flex items-center mt-1 space-x-2">
            <Badge className="capitalize">
              {exchangeConfig?.exchange || 'unknown'}
            </Badge>
            <Badge variant="outline">
              {exchangeConfig?.testnet ? 'Testnet' : 'Mainnet'}
            </Badge>
            <Badge variant="secondary" className="bg-green-100 dark:bg-green-900">
              Connected
            </Badge>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Select
            value={exchangeId}
            onValueChange={handleExchangeChange}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Switch Exchange" />
            </SelectTrigger>
            <SelectContent>
              {availableExchanges.map(exchange => (
                <SelectItem key={exchange.id} value={exchange.id}>
                  {exchange.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            onClick={() => {
              refreshBalances();
              refreshPositions();
              refreshOrders();
              refreshOrderHistory();
              refreshMarketData();
              
              toast({
                title: 'Refreshed',
                description: 'Data refreshed successfully',
              });
            }}
          >
            Refresh
          </Button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Balance</p>
                <h3 className="text-2xl font-bold">${formatCurrency(getTotalBalanceUSD())}</h3>
              </div>
              <Wallet className="h-8 w-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Positions</p>
                <h3 className="text-2xl font-bold">{positions.length}</h3>
              </div>
              <TrendingUp className="h-8 w-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Orders</p>
                <h3 className="text-2xl font-bold">{activeOrders.length}</h3>
              </div>
              <ArrowLeftRight className="h-8 w-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Trading Pairs</p>
                <h3 className="text-2xl font-bold">{availableSymbols.length}</h3>
              </div>
              <BarChart3 className="h-8 w-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Trading and Symbol Selection */}
        <div className="lg:col-span-1 space-y-6">
          {/* Symbol Selection */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Trading Pair</CardTitle>
              <CardDescription>Select a trading pair</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedSymbol}
                onValueChange={(value) => {
                  setSelectedSymbol(value);
                  setOrderForm(prev => ({ ...prev, symbol: value }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a symbol" />
                </SelectTrigger>
                <SelectContent>
                  {availableSymbols.map(symbol => (
                    <SelectItem key={symbol} value={symbol}>
                      {symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedMarketData && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Last Price:</span>
                    <span className="font-medium">{formatCurrency(selectedMarketData.lastPrice, 4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">24h Change:</span>
                    <span className={`font-medium ${
                      parseFloat(selectedMarketData.priceChangePercent24h) >= 0 
                        ? 'text-green-500' 
                        : 'text-red-500'
                    }`}>
                      {parseFloat(selectedMarketData.priceChangePercent24h).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">24h High:</span>
                    <span className="font-medium">{formatCurrency(selectedMarketData.high24h, 4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">24h Low:</span>
                    <span className="font-medium">{formatCurrency(selectedMarketData.low24h, 4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">24h Volume:</span>
                    <span className="font-medium">{formatCurrency(selectedMarketData.volume24h, 2)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Order Form */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Create Order</CardTitle>
              <CardDescription>Place a new order</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="order-side">Side</Label>
                    <div className="flex mt-1">
                      <Button
                        type="button"
                        variant={orderForm.side === 'Buy' ? 'default' : 'outline'}
                        className={`w-full rounded-r-none ${orderForm.side === 'Buy' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                        onClick={() => handleOrderFormChange('side', 'Buy')}
                      >
                        <ArrowUp className="mr-1 h-4 w-4" /> Buy
                      </Button>
                      <Button
                        type="button"
                        variant={orderForm.side === 'Sell' ? 'default' : 'outline'}
                        className={`w-full rounded-l-none ${orderForm.side === 'Sell' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                        onClick={() => handleOrderFormChange('side', 'Sell')}
                      >
                        <ArrowDown className="mr-1 h-4 w-4" /> Sell
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="order-type">Order Type</Label>
                    <Select
                      value={orderForm.orderType}
                      onValueChange={(value) => handleOrderFormChange('orderType', value)}
                    >
                      <SelectTrigger id="order-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Market">Market</SelectItem>
                        <SelectItem value="Limit">Limit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="order-quantity">Quantity</Label>
                  <Input
                    id="order-quantity"
                    type="number"
                    placeholder="Enter quantity"
                    value={orderForm.qty}
                    onChange={(e) => handleOrderFormChange('qty', e.target.value)}
                  />
                </div>
                
                {orderForm.orderType === 'Limit' && (
                  <div className="space-y-2">
                    <Label htmlFor="order-price">Price</Label>
                    <Input
                      id="order-price"
                      type="number"
                      placeholder="Enter price"
                      value={orderForm.price}
                      onChange={(e) => handleOrderFormChange('price', e.target.value)}
                    />
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="reduce-only"
                    checked={orderForm.reduceOnly}
                    onChange={(e) => handleOrderFormChange('reduceOnly', e.target.checked)}
                  />
                  <Label htmlFor="reduce-only">Reduce Only</Label>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                type="button" 
                className={`w-full ${
                  orderForm.side === 'Buy' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
                onClick={handleSubmitOrder}
              >
                {orderForm.side === 'Buy' ? 'Buy' : 'Sell'} {selectedSymbol}
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        {/* Right Column - Positions, Orders, Balances */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="positions">
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="positions">Positions</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="balances">Balances</TabsTrigger>
            </TabsList>
            
            {/* Positions Tab */}
            <TabsContent value="positions">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Open Positions</CardTitle>
                  <CardDescription>Current open positions</CardDescription>
                </CardHeader>
                <CardContent>
                  {positions.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      No open positions found
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 px-2">Symbol</th>
                            <th className="text-left py-2 px-2">Side</th>
                            <th className="text-right py-2 px-2">Size</th>
                            <th className="text-right py-2 px-2">Entry Price</th>
                            <th className="text-right py-2 px-2">Mark Price</th>
                            <th className="text-right py-2 px-2">PnL</th>
                            <th className="text-right py-2 px-2">PnL%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {positions.map((position, index) => (
                            <tr key={`${position.symbol}-${index}`} className="border-b border-border">
                              <td className="py-2 px-2">{position.symbol}</td>
                              <td className={`py-2 px-2 ${
                                position.side === 'Buy' ? 'text-green-500' : 'text-red-500'
                              }`}>
                                {position.side}
                              </td>
                              <td className="text-right py-2 px-2">{formatCurrency(position.size, 4)}</td>
                              <td className="text-right py-2 px-2">{formatCurrency(position.entryPrice, 4)}</td>
                              <td className="text-right py-2 px-2">{formatCurrency(position.markPrice, 4)}</td>
                              <td className={`text-right py-2 px-2 ${
                                parseFloat(position.unrealisedPnl) >= 0 ? 'text-green-500' : 'text-red-500'
                              }`}>
                                {formatCurrency(position.unrealisedPnl, 4)}
                              </td>
                              <td className={`text-right py-2 px-2 ${
                                position.unrealisedPnlPct && position.unrealisedPnlPct >= 0 ? 'text-green-500' : 'text-red-500'
                              }`}>
                                {position.unrealisedPnlPct ? position.unrealisedPnlPct.toFixed(2) : 0}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Orders Tab */}
            <TabsContent value="orders">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Active Orders</CardTitle>
                  <CardDescription>Current active orders</CardDescription>
                </CardHeader>
                <CardContent>
                  {activeOrders.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      No active orders found
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 px-2">Symbol</th>
                            <th className="text-left py-2 px-2">Side</th>
                            <th className="text-left py-2 px-2">Type</th>
                            <th className="text-right py-2 px-2">Price</th>
                            <th className="text-right py-2 px-2">Quantity</th>
                            <th className="text-right py-2 px-2">Status</th>
                            <th className="text-right py-2 px-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeOrders.map((order) => (
                            <tr key={order.orderId} className="border-b border-border">
                              <td className="py-2 px-2">{order.symbol}</td>
                              <td className={`py-2 px-2 ${
                                order.side === 'Buy' ? 'text-green-500' : 'text-red-500'
                              }`}>
                                {order.side}
                              </td>
                              <td className="py-2 px-2">{order.orderType}</td>
                              <td className="text-right py-2 px-2">{formatCurrency(order.price, 4)}</td>
                              <td className="text-right py-2 px-2">{formatCurrency(order.qty, 4)}</td>
                              <td className="text-right py-2 px-2">{order.orderStatus}</td>
                              <td className="text-right py-2 px-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-destructive"
                                  onClick={() => handleCancelOrder(order.symbol, order.orderId)}
                                >
                                  Cancel
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Balances Tab */}
            <TabsContent value="balances">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Wallet Balances</CardTitle>
                  <CardDescription>Available funds in your wallet</CardDescription>
                </CardHeader>
                <CardContent>
                  {balances.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      No balances found
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 px-2">Coin</th>
                            <th className="text-right py-2 px-2">Total Balance</th>
                            <th className="text-right py-2 px-2">Available Balance</th>
                            <th className="text-right py-2 px-2">USD Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {balances
                            .filter(balance => parseFloat(balance.walletBalance) > 0)
                            .sort((a, b) => {
                              const aUsdValue = a.usdValue ? parseFloat(a.usdValue) : 0;
                              const bUsdValue = b.usdValue ? parseFloat(b.usdValue) : 0;
                              return bUsdValue - aUsdValue;
                            })
                            .map((balance) => (
                              <tr key={balance.coin} className="border-b border-border">
                                <td className="py-2 px-2">{balance.coin}</td>
                                <td className="text-right py-2 px-2">{formatCurrency(balance.walletBalance, 6)}</td>
                                <td className="text-right py-2 px-2">{formatCurrency(balance.availableBalance, 6)}</td>
                                <td className="text-right py-2 px-2">
                                  ${balance.usdValue ? formatCurrency(balance.usdValue, 2) : '0.00'}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
