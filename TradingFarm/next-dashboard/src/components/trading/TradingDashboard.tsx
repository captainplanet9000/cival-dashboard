'use client';

import * as React from 'react';
const { useState, useEffect } = React;
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToastAction } from '@/components/ui/toast';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, ChevronDown, ChevronUp, Eye, EyeOff, RefreshCcw, Wallet, LayoutGrid } from 'lucide-react';
import { MarketDataWidget } from '@/components/trading/MarketDataWidget';
import { createExchangeConnector } from '@/lib/exchange/connector-factory';
import { ExchangeCredentialManager } from '@/components/exchange/ExchangeCredentialManager';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { createBrowserClient } from '@/utils/supabase/client';
import * as exchangeCredentialsService from '@/utils/supabase/exchange-credentials';
import { ExchangeCredential } from '@/utils/supabase/exchange-credentials';
import { AccountInfo, MarketData, OrderParams } from '@/lib/exchange/types';

// Importing necessary components
import { OrdersTable } from './OrdersTable';
import { PositionsTable } from './PositionsTable';
import { TradeHistoryTable } from './TradeHistoryTable';

// Define the exchange names type
type ExchangeName = 'binance' | 'coinbase' | 'bybit' | 'kucoin' | 'okx';

interface TradingDashboardProps {
  farmId: number;
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
  const supabase = createBrowserClient();

  // State management
  const [activeTab, setActiveTab] = useState('trade');
  const [exchange, setExchange] = useState<string>(defaultExchange);
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [credentials, setCredentials] = useState<ExchangeCredential[]>([]);
  const [selectedCredential, setSelectedCredential] = useState<ExchangeCredential | null>(null);
  const [showCredentialManager, setShowCredentialManager] = useState(false);
  const [loading, setLoading] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isPaper, setIsPaper] = useState(isPaperTrading);
  const [showBalance, setShowBalance] = useState(false);
  const [balances, setBalances] = useState<{currency: string, available: number, total: number}[]>([]);

  // Order form state
  const [orderType, setOrderType] = useState('market');
  const [orderSide, setOrderSide] = useState('buy');
  const [orderQuantity, setOrderQuantity] = useState('');
  const [orderPrice, setOrderPrice] = useState('');

  
  // Load credentials on component mount
  useEffect(() => {
    loadCredentials();
  }, [refreshTrigger]);
  
  // When credentials or exchange changes, load market data
  useEffect(() => {
    if (selectedCredential) {
      loadMarketData();
      loadAccountInfo();
    }
  }, [selectedCredential, exchange, symbol, refreshTrigger]);
  
  // Load exchange credentials
  const loadCredentials = async () => {
    setLoading(true);
    try {
      // Get the current user
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setLoading(false);
        setShowCredentialManager(true);
        return;
      }
      
      // Load credentials from the database
      const { data, error } = await exchangeCredentialsService.listCredentials(
        supabase,
        sessionData.session.user.id
      );
      
      if (error) throw error;
      
      setCredentials(data || []);
      
      // If we have credentials and none selected yet, select the first one for the default exchange
      if (data && data.length > 0 && !selectedCredential) {
        // First try to find a credential for the default exchange
        const defaultCred = data.find((cred: ExchangeCredential) => 
          cred.exchange === exchange && cred.is_active && cred.is_default
        ) || data.find((cred: ExchangeCredential) => 
          cred.exchange === exchange && cred.is_active
        );
        
        if (defaultCred) {
          setSelectedCredential(defaultCred);
        } else {
          // If no credential for the default exchange, just use the first active one
          const firstActive = data.find((cred: ExchangeCredential) => cred.is_active);
          if (firstActive) {
            setSelectedCredential(firstActive);
            setExchange(firstActive.exchange);
          } else {
            // No active credentials
            setShowCredentialManager(true);
          }
        }
      } else if (!data || data.length === 0) {
        // No credentials at all
        setShowCredentialManager(true);
      }
      
      setLoading(false);
    } catch (error: any) {
      console.error('Error loading credentials:', error);
      toast({
        title: 'Error',
        description: 'Failed to load exchange credentials: ' + (error?.message || 'Unknown error'),
        variant: 'destructive',
      });
      setLoading(false);
      setShowCredentialManager(true);
    }
  };
  
  // Load market data using the exchange connector
  const loadMarketData = async () => {
    if (!selectedCredential) return;
    
    setLoading(true);
    try {
      // Create exchange connector
      const connector = createExchangeConnector(selectedCredential.exchange, {
        useTestnet: selectedCredential.is_testnet
      });
      
      // Connect using the selected credentials
      const connected = await connector.connect({
        apiKey: selectedCredential.api_key,
        secretKey: selectedCredential.api_secret,
        passphrase: selectedCredential.api_passphrase || undefined
      });
      
      if (!connected) {
        throw new Error('Failed to connect to exchange');
      }
      
      // Get markets
      const marketData = await connector.getMarkets();
      setMarkets(marketData);
      
      // If the current symbol is not available in this exchange, reset it to default
      const currentSymbolExists = marketData.some((m: MarketData) => m.symbol === symbol);
      if (!currentSymbolExists && marketData.length > 0) {
        // Try to find BTC market or use the first available
        const btcMarket = marketData.find((m: MarketData) => m.symbol.includes('BTC/'));
        setSymbol(btcMarket ? btcMarket.symbol : marketData[0].symbol);
      }
      
      setLoading(false);
    } catch (error: any) {
      console.error('Error loading markets:', error);
      toast({
        title: 'Error',
        description: 'Failed to load market data: ' + (error?.message || 'Unknown error'),
        variant: 'destructive',
      });
      setLoading(false);
    }
  };
  
  // Load account info and balances
  const loadAccountInfo = async () => {
    if (!selectedCredential) return;
    
    try {
      // Create exchange connector
      const connector = createExchangeConnector(selectedCredential.exchange, {
        useTestnet: selectedCredential.is_testnet
      });
      
      // Connect using the selected credentials
      const connected = await connector.connect({
        apiKey: selectedCredential.api_key,
        secretKey: selectedCredential.api_secret,
        passphrase: selectedCredential.api_passphrase || undefined
      });
      
      if (!connected) {
        throw new Error('Failed to connect to exchange');
      }
      
      // Get account info
      const accountInfoData = await connector.getAccountInfo();
      setAccountInfo(accountInfoData);
      
      // Set balances from account info
      if (accountInfoData.balances) {
        setBalances(accountInfoData.balances.map(b => ({
          currency: b.asset,
          available: b.free,
          total: b.total
        })));
      }
    } catch (error: any) {
      console.error('Error loading account info:', error);
      // Don't show toast for account info to avoid too many notifications
    }
  };
  
  // Handle placing an order
  const handlePlaceOrder = async () => {
    if (!selectedCredential) {
      toast({
        title: 'No Exchange Connected',
        description: 'Please connect to an exchange first',
        variant: 'destructive',
      });
      return;
    }

    try {
      setPlacingOrder(true);
      
      // Validate inputs
      if (!orderQuantity || parseFloat(orderQuantity) <= 0) {
        throw new Error('Please enter a valid quantity');
      }
      
      if (orderType !== 'market' && (!orderPrice || parseFloat(orderPrice) <= 0)) {
        throw new Error('Please enter a valid price');
      }
      
      // Create exchange connector
      const connector = createExchangeConnector(selectedCredential.exchange, {
        useTestnet: selectedCredential.is_testnet
      });
      
      // Connect using the selected credentials
      const connected = await connector.connect({
        apiKey: selectedCredential.api_key,
        secretKey: selectedCredential.api_secret,
        passphrase: selectedCredential.api_passphrase || undefined
      });
      
      if (!connected) {
        throw new Error('Failed to connect to exchange');
      }
      
      // Prepare order parameters
      const orderParams: OrderParams = {
        symbol,
        side: orderSide as 'buy' | 'sell',
        type: orderType as 'market' | 'limit',
        quantity: parseFloat(orderQuantity),
      };
      
      // Add price for limit orders
      if (orderType === 'limit' && orderPrice) {
        orderParams.price = parseFloat(orderPrice);
      }
      
      // Place the order
      const orderResult = await connector.placeOrder(orderParams);
      
      // Show success toast
      toast({
        title: 'Order placed',
        description: `Successfully placed ${orderSide} order for ${orderQuantity} ${symbol}`,
      });
      
      // Reset form
      setOrderQuantity('');
      setOrderPrice('');
      
      // Refresh account info and balances
      setTimeout(() => {
        loadAccountInfo();
        setRefreshTrigger((prev: number) => prev + 1);
      }, 2000);
    } catch (error: any) {
      console.error('Error placing order:', error);
      toast({
        variant: 'destructive',
        title: 'Order failed',
        description: error?.message || 'Failed to place order',
      });
    } finally {
      setPlacingOrder(false);
    }
  };
  
  // Handle canceling an order
  const handleCancelOrder = async (orderId: string): Promise<void> => {
    if (!selectedCredential) {
      toast({
        title: 'No Exchange Connected',
        description: 'Please connect to an exchange first',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Create exchange connector
      const connector = createExchangeConnector(selectedCredential.exchange, {
        useTestnet: selectedCredential.is_testnet
      });
      
      // Connect using the selected credentials
      const connected = await connector.connect({
        apiKey: selectedCredential.api_key,
        secretKey: selectedCredential.api_secret,
        passphrase: selectedCredential.api_passphrase || undefined
      });
      
      if (!connected) {
        throw new Error('Failed to connect to exchange');
      }
      
      // Cancel the order
      await connector.cancelOrder(orderId, symbol);
      
      toast({
        title: 'Order canceled',
        description: 'Order has been successfully canceled',
      });
      
      // Refresh account info
      setTimeout(() => {
        loadAccountInfo();
        setRefreshTrigger((prev: number) => prev + 1);
      }, 1000);
    } catch (error: any) {
      console.error('Error canceling order:', error);
      toast({
        variant: 'destructive',
        title: 'Cancel failed',
        description: error?.message || 'Failed to cancel order',
      });
    }
  };
  
  // Handle closing a position
  const handleClosePosition = async (positionId: string, symbol: string, side: string): Promise<void> => {
    if (!selectedCredential) {
      toast({
        title: 'No Exchange Connected',
        description: 'Please connect to an exchange first',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Create exchange connector
      const connector = createExchangeConnector(selectedCredential.exchange, {
        useTestnet: selectedCredential.is_testnet
      });
      
      // Connect using the selected credentials
      const connected = await connector.connect({
        apiKey: selectedCredential.api_key,
        secretKey: selectedCredential.api_secret,
        passphrase: selectedCredential.api_passphrase || undefined
      });
      
      if (!connected) {
        throw new Error('Failed to connect to exchange');
      }
      
      // Get the position from the connector
      const accountInfo = await connector.getAccountInfo();
      const position = accountInfo.positions?.find(p => p.symbol === symbol);
      
      if (!position) {
        throw new Error(`Position not found for ${symbol}`);
      }
      
      // Create a market order to close the position
      // The side should be opposite of the position side
      const closeSide = side === 'long' ? 'sell' : 'buy';
      
      // Place a market order to close the position
      await connector.placeOrder({
        symbol: symbol,
        side: closeSide as 'buy' | 'sell',
        type: 'market',
        quantity: Math.abs(position.size || 0),
        reduceOnly: true
      });
      
      toast({
        title: 'Position closed',
        description: `Successfully closed ${side} position for ${symbol}`,
      });
      
      // Refresh account info
      setTimeout(() => {
        loadAccountInfo();
        setRefreshTrigger((prev: number) => prev + 1);
      }, 1000);
    } catch (error: any) {
      console.error('Error closing position:', error);
      toast({
        variant: 'destructive',
        title: 'Close failed',
        description: error?.message || 'Failed to close position',
      });
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
                      onValueChange={(value) => setExchange(value as string)}
                      disabled={false}
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
                    {markets.length > 0 ? (
                    <div className="mb-4">
                      <Label htmlFor="symbol">Symbol</Label>
                      <Select value={symbol} onValueChange={(value: string) => setSymbol(value)}>
                        <SelectTrigger id="symbol">
                          <SelectValue placeholder="Select symbol" />
                        </SelectTrigger>
                        <SelectContent>
                          {markets.map((market: MarketData) => (
                            <SelectItem key={market.symbol} value={market.symbol}>
                              {market.symbol}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
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
                      <CardDescription>
                        Select the side of your order
                      </CardDescription>
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
                      <CardDescription>
                        Balances
                      </CardDescription>
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
                      {balances.map((balance: {currency: string, available: number, total: number}) => (
                        <div key={balance.currency} className="flex justify-between text-sm">
                          <span>{balance.currency}</span>
                          <span className="font-mono">{balance.available.toFixed(8)}</span>
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
                farmId={String(farmId)}
                isPaperTrading={isPaper}
                exchangeName={exchange}
                onClosePosition={handleClosePosition}
                refreshTrigger={refreshTrigger}
              />
            </TabsContent>
            <TabsContent value="orders" className="mt-4">
              <OrdersTable 
                farmId={String(farmId)}
                isPaperTrading={isPaper}
                onCancelOrder={handleCancelOrder}
                refreshTrigger={refreshTrigger}
              />
            </TabsContent>
            <TabsContent value="history" className="mt-4">
              <TradeHistoryTable 
                farmId={String(farmId)}
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
