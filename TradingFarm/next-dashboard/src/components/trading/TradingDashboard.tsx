import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ToastAction } from '@/components/ui/toast';
import { useToast } from '@/components/ui/use-toast';
import { LayoutGrid, Wallet, ChevronDown, ChevronUp } from 'lucide-react';

import { OrdersTable } from './OrdersTable';
import { PositionsTable } from './PositionsTable';
import { TradeHistoryTable } from './TradeHistoryTable';
import { MarketDataWidget } from './MarketDataWidget';
import { ExchangeName } from '@/utils/exchanges/exchange-factory';
import { TradingSystem } from '@/utils/supabase/trading-system';
import { MarketDataService } from '@/utils/exchanges/market-data-service';

interface TradingDashboardProps {
  farmId: string;
  defaultExchange?: ExchangeName;
  defaultSymbol?: string;
  isPaperTrading?: boolean;
}

export function TradingDashboard({
  farmId,
  defaultExchange = 'coinbase',
  defaultSymbol = 'BTC/USD',
  isPaperTrading = true
}: TradingDashboardProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('trade');
  const [exchange, setExchange] = useState<ExchangeName>(defaultExchange);
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [markets, setMarkets] = useState<any[]>([]);
  const [exchangeConnections, setExchangeConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isPaper, setIsPaper] = useState(isPaperTrading);
  
  // Order form state
  const [orderType, setOrderType] = useState('market');
  const [orderSide, setOrderSide] = useState('buy');
  const [orderQuantity, setOrderQuantity] = useState('');
  const [orderPrice, setOrderPrice] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);
  
  // Balance display state
  const [showBalance, setShowBalance] = useState(false);
  const [balances, setBalances] = useState<any[]>([]);
  
  // Fetch exchange connections and markets on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch exchange connections
        const connections = await TradingSystem.getExchangeConnections(farmId);
        setExchangeConnections(connections);
        
        // Initialize market data service
        const marketDataService = MarketDataService.getInstance();
        
        // TODO: Replace with actual exchange credentials when available
        // This is just for demo purposes
        await marketDataService.connectExchange(exchange, {
          apiKey: 'demo',
          apiSecret: 'demo'
        });
        
        // Subscribe to market data for the selected symbol
        await marketDataService.subscribeToSymbol(exchange, symbol);
        
        // Fetch balances
        // In a real implementation, this would come from the exchange adapter
        setBalances([
          { currency: 'USD', available: 10000, total: 10000 },
          { currency: 'BTC', available: 0.25, total: 0.25 },
          { currency: 'ETH', available: 2.5, total: 2.5 }
        ]);
        
        // Fetch markets
        // In a real implementation, this would come from the exchange adapter
        setMarkets([
          { symbol: 'BTC/USD', baseCurrency: 'BTC', quoteCurrency: 'USD' },
          { symbol: 'ETH/USD', baseCurrency: 'ETH', quoteCurrency: 'USD' },
          { symbol: 'SOL/USD', baseCurrency: 'SOL', quoteCurrency: 'USD' },
          { symbol: 'LINK/USD', baseCurrency: 'LINK', quoteCurrency: 'USD' },
          { symbol: 'DOT/USD', baseCurrency: 'DOT', quoteCurrency: 'USD' }
        ]);
        
        setLoading(false);
      } catch (error) {
        console.error('Error initializing trading dashboard:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to initialize trading dashboard',
          action: <ToastAction altText="Try again">Try again</ToastAction>,
        });
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Cleanup on unmount
    return () => {
      MarketDataService.getInstance().disconnectAll()
        .catch(error => console.error('Error disconnecting market data:', error));
    };
  }, [farmId, exchange, symbol, toast]);
  
  // Handle placing an order
  const handlePlaceOrder = async () => {
    try {
      setPlacingOrder(true);
      
      // Validate inputs
      if (!orderQuantity || parseFloat(orderQuantity) <= 0) {
        throw new Error('Please enter a valid quantity');
      }
      
      if (orderType !== 'market' && (!orderPrice || parseFloat(orderPrice) <= 0)) {
        throw new Error('Please enter a valid price');
      }
      
      // Get exchange connection ID
      const connection = exchangeConnections[0]; // Use first connection for demo
      if (!connection) {
        throw new Error('No exchange connection available');
      }
      
      // Create order
      const orderParams = {
        farmId,
        exchangeConnectionId: connection.id,
        symbol,
        orderType: orderType as any,
        side: orderSide as any,
        quantity: parseFloat(orderQuantity),
        price: orderType !== 'market' ? parseFloat(orderPrice) : undefined,
        isPaperTrading: isPaper
      };
      
      const order = await TradingSystem.createOrder(orderParams);
      
      // Show success toast
      toast({
        title: 'Order placed',
        description: `Successfully placed ${orderSide} order for ${orderQuantity} ${symbol}`,
      });
      
      // Reset form
      setOrderQuantity('');
      setOrderPrice('');
      
      // Refresh tables
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error placing order:', error);
      toast({
        variant: 'destructive',
        title: 'Order failed',
        description: error.message || 'Failed to place order',
      });
    } finally {
      setPlacingOrder(false);
    }
  };
  
  // Handle canceling an order
  const handleCancelOrder = async (orderId: string) => {
    try {
      // TODO: Implement actual order cancellation via exchange adapter
      // This is just a placeholder
      
      toast({
        title: 'Order canceled',
        description: 'Order has been successfully canceled',
      });
      
      // Refresh tables
      setRefreshTrigger(prev => prev + 1);
      
      return true;
    } catch (error) {
      console.error('Error canceling order:', error);
      toast({
        variant: 'destructive',
        title: 'Cancel failed',
        description: error.message || 'Failed to cancel order',
      });
      return false;
    }
  };
  
  // Handle closing a position
  const handleClosePosition = async (positionId: string, symbol: string, side: string) => {
    try {
      // Get position details
      // In a real implementation, you would fetch the position data
      // and create a market order to close it
      
      toast({
        title: 'Position closed',
        description: `Successfully closed ${side} position for ${symbol}`,
      });
      
      // Refresh tables
      setRefreshTrigger(prev => prev + 1);
      
      return true;
    } catch (error) {
      console.error('Error closing position:', error);
      toast({
        variant: 'destructive',
        title: 'Close failed',
        description: error.message || 'Failed to close position',
      });
      return false;
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <MarketDataWidget
            exchangeName={exchange}
            symbol={symbol}
            showTrades={true}
            showOrderBook={true}
            height="h-[480px]"
          />
        </div>
        
        <div>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Trading</CardTitle>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="paper-mode" className="text-sm">Paper Trading</Label>
                  <Switch
                    id="paper-mode"
                    checked={isPaper}
                    onCheckedChange={setIsPaper}
                  />
                </div>
              </div>
              <CardDescription>
                Place orders for {symbol} on {exchange}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="exchange">Exchange</Label>
                    <Select
                      value={exchange}
                      onValueChange={(value) => setExchange(value as ExchangeName)}
                      disabled={loading}
                    >
                      <SelectTrigger id="exchange">
                        <SelectValue placeholder="Select Exchange" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="coinbase">Coinbase</SelectItem>
                        <SelectItem value="bybit">Bybit</SelectItem>
                        <SelectItem value="hyperliquid">Hyperliquid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="symbol">Symbol</Label>
                    <Select
                      value={symbol}
                      onValueChange={setSymbol}
                      disabled={loading || markets.length === 0}
                    >
                      <SelectTrigger id="symbol">
                        <SelectValue placeholder="Select Symbol" />
                      </SelectTrigger>
                      <SelectContent>
                        {markets.map((market) => (
                          <SelectItem key={market.symbol} value={market.symbol}>
                            {market.symbol}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="border rounded-lg p-3 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="order-type">Order Type</Label>
                      <Select
                        value={orderType}
                        onValueChange={setOrderType}
                      >
                        <SelectTrigger id="order-type">
                          <SelectValue placeholder="Select Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="market">Market</SelectItem>
                          <SelectItem value="limit">Limit</SelectItem>
                          <SelectItem value="stop">Stop</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="order-side">Side</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant={orderSide === 'buy' ? 'default' : 'outline'}
                          className={orderSide === 'buy' ? 'bg-green-600 hover:bg-green-700' : ''}
                          onClick={() => setOrderSide('buy')}
                        >
                          Buy
                        </Button>
                        <Button
                          type="button"
                          variant={orderSide === 'sell' ? 'default' : 'outline'}
                          className={orderSide === 'sell' ? 'bg-red-600 hover:bg-red-700' : ''}
                          onClick={() => setOrderSide('sell')}
                        >
                          Sell
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      placeholder="0.00"
                      value={orderQuantity}
                      onChange={(e) => setOrderQuantity(e.target.value)}
                    />
                  </div>
                  
                  {orderType !== 'market' && (
                    <div className="space-y-2">
                      <Label htmlFor="price">Price</Label>
                      <Input
                        id="price"
                        type="number"
                        placeholder="0.00"
                        value={orderPrice}
                        onChange={(e) => setOrderPrice(e.target.value)}
                      />
                    </div>
                  )}
                  
                  <Button
                    className="w-full"
                    onClick={handlePlaceOrder}
                    disabled={placingOrder}
                    variant={orderSide === 'buy' ? 'default' : 'destructive'}
                  >
                    {placingOrder ? (
                      <>
                        <span className="animate-spin mr-2">⟳</span>
                        Placing Order...
                      </>
                    ) : (
                      `${orderSide === 'buy' ? 'Buy' : 'Sell'} ${symbol.split('/')[0]}`
                    )}
                  </Button>
                </div>
                
                <div className="border rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-sm flex items-center">
                      <Wallet className="h-4 w-4 mr-1" />
                      Balances
                    </h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowBalance(!showBalance)}
                    >
                      {showBalance ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  {showBalance && (
                    <div className="space-y-2">
                      {balances.map((balance) => (
                        <div key={balance.currency} className="flex justify-between items-center">
                          <span className="font-medium">{balance.currency}</span>
                          <span className="font-mono">
                            {balance.available.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 8
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Positions & Orders</CardTitle>
          <CardDescription>
            Manage your active positions and orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="positions" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="positions">Positions</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="history">Trade History</TabsTrigger>
            </TabsList>
            <TabsContent value="positions" className="mt-4">
              <PositionsTable 
                farmId={farmId}
                isPaperTrading={isPaper}
                exchangeName={exchange}
                onClosePosition={handleClosePosition}
                refreshTrigger={refreshTrigger}
              />
            </TabsContent>
            <TabsContent value="orders" className="mt-4">
              <OrdersTable 
                farmId={farmId}
                isPaperTrading={isPaper}
                onCancelOrder={handleCancelOrder}
                refreshTrigger={refreshTrigger}
              />
            </TabsContent>
            <TabsContent value="history" className="mt-4">
              <TradeHistoryTable 
                farmId={farmId}
                isPaperTrading={isPaper}
                limit={30}
                refreshTrigger={refreshTrigger}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
