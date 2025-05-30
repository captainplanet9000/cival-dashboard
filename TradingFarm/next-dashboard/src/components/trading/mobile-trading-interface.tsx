"use client";

import * as React from 'react';
import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { ChevronDown, ChevronUp, Clock, Plus, Minus, RefreshCw, BarChart2, LineChart, PieChart } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Toggle } from '@/components/ui/toggle';
import { createExchangeConnector } from '@/lib/exchange/connector-factory';
import { useOrientation } from '@/utils/responsive';
import { cn } from '@/lib/utils';

interface MarketData {
  lastPrice: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  bid: number;
  ask: number;
}

interface MobileTradingInterfaceProps {
  exchangeId: string;
  symbol: string;
  credentials: {
    apiKey: string;
    apiSecret: string;
  };
  initialMarketData?: MarketData;
  onOrderPlaced?: (order: any) => void;
  onSymbolChange?: (symbol: string) => void;
}

export function MobileTradingInterface({
  exchangeId,
  symbol,
  credentials,
  initialMarketData,
  onOrderPlaced,
  onSymbolChange
}: MobileTradingInterfaceProps) {
  const [marketData, setMarketData] = useState<MarketData>(initialMarketData || {
    lastPrice: 0,
    change24h: 0,
    high24h: 0,
    low24h: 0,
    volume24h: 0,
    bid: 0,
    ask: 0
  });
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([
    'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT'
  ]);
  const { toast } = useToast();
  const orientation = useOrientation();

  // Function to fetch market data
  const fetchMarketData = async () => {
    if (!credentials.apiKey || !exchangeId) return;
    
    setIsLoading(true);
    try {
      const client = createExchangeConnector(exchangeId, {
        exchangeOptions: {
          apiKey: credentials.apiKey,
          apiSecret: credentials.apiSecret
        }
      });
      
      const ticker = await client.fetchTicker(symbol);
      
      setMarketData({
        lastPrice: ticker.last || 0,
        change24h: ticker.percentage ? ticker.percentage : 0,
        high24h: ticker.high || 0,
        low24h: ticker.low || 0,
        volume24h: ticker.baseVolume || 0,
        bid: ticker.bid || 0,
        ask: ticker.ask || 0
      });
    } catch (error) {
      console.error('Error fetching market data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch market data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to place an order
  const placeOrder = async () => {
    if (!credentials.apiKey || !exchangeId || !amount) {
      toast({
        title: 'Error',
        description: 'Please fill all required fields.',
        variant: 'destructive',
      });
      return;
    }
    
    if (orderType === 'limit' && !price) {
      toast({
        title: 'Error',
        description: 'Please enter a price for limit orders.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const client = createExchangeConnector(exchangeId, {
        exchangeOptions: {
          apiKey: credentials.apiKey,
          apiSecret: credentials.apiSecret
        }
      });
      
      const orderParams = {
        symbol,
        type: orderType,
        side,
        amount: parseFloat(amount),
        price: orderType === 'limit' ? parseFloat(price) : undefined
      };
      
      const order = await client.createOrder(orderParams);
      
      if (onOrderPlaced) {
        onOrderPlaced(order);
      }
      
      toast({
        title: 'Order Placed',
        description: `Successfully placed ${side} order for ${amount} ${symbol.split('/')[0]}`,
      });
      
      // Reset form
      setAmount('');
      if (orderType === 'limit') {
        setPrice('');
      }
    } catch (error) {
      console.error('Error placing order:', error);
      toast({
        title: 'Error',
        description: 'Failed to place order. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle symbol change
  const handleSymbolChange = (newSymbol: string) => {
    if (onSymbolChange) {
      onSymbolChange(newSymbol);
    }
  };

  // Format price with proper decimal places
  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Calculate percentage change color
  const changeColor = marketData.change24h >= 0 ? 'text-green-500' : 'text-red-500';
  const changeIcon = marketData.change24h >= 0 ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;

  return (
    <div className="w-full">
      {/* Price and Market Info Header */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Select value={symbol} onValueChange={handleSymbolChange}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder={symbol} />
                </SelectTrigger>
                <SelectContent>
                  {availableSymbols.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={fetchMarketData}
                disabled={isLoading}
              >
                <RefreshCw className={cn(
                  "h-4 w-4",
                  isLoading && "animate-spin"
                )} />
              </Button>
            </div>
            <div className="flex flex-col items-end">
              <div className="text-2xl font-bold">
                ${marketData.lastPrice ? formatPrice(marketData.lastPrice) : '0.00'}
              </div>
              <div className={cn("flex items-center text-sm", changeColor)}>
                {changeIcon}
                {Math.abs(marketData.change24h).toFixed(2)}%
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground">24h High</p>
              <p className="font-medium">${formatPrice(marketData.high24h)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">24h Low</p>
              <p className="font-medium">${formatPrice(marketData.low24h)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">24h Vol</p>
              <p className="font-medium">${formatPrice(marketData.volume24h)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trading Interface */}
      <Card>
        <CardHeader className="pb-2">
          <Tabs defaultValue="trade" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="trade">Trade</TabsTrigger>
              <TabsTrigger value="chart">Chart</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
            </TabsList>
            <TabsContent value="trade" className="space-y-4 pt-4">
              {/* Order Type Selection */}
              <div className="flex space-x-2">
                <Button
                  variant={orderType === 'market' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setOrderType('market')}
                >
                  Market
                </Button>
                <Button
                  variant={orderType === 'limit' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setOrderType('limit')}
                >
                  Limit
                </Button>
              </div>

              {/* Buy/Sell Tabs */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={side === 'buy' ? 'default' : 'outline'}
                  className={side === 'buy' ? 'bg-green-600 hover:bg-green-700' : ''}
                  onClick={() => setSide('buy')}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Buy
                </Button>
                <Button
                  variant={side === 'sell' ? 'default' : 'outline'}
                  className={side === 'sell' ? 'bg-red-600 hover:bg-red-700' : ''}
                  onClick={() => setSide('sell')}
                >
                  <Minus className="mr-2 h-4 w-4" />
                  Sell
                </Button>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <div className="flex space-x-2">
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <Button variant="outline" onClick={() => setAmount('0.001')}>Min</Button>
                  <Button variant="outline" onClick={() => setAmount('0.01')}>0.01</Button>
                  <Button variant="outline" onClick={() => setAmount('0.1')}>0.1</Button>
                </div>
              </div>

              {/* Price Input (for Limit orders) */}
              {orderType === 'limit' && (
                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="price"
                      type="number"
                      placeholder="0.00"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => marketData.lastPrice && setPrice(marketData.lastPrice.toString())}
                    >
                      Last
                    </Button>
                  </div>
                </div>
              )}

              {/* Percentage Slider */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Amount Percentage</Label>
                  <span className="text-sm text-muted-foreground">Wallet Balance: $10,000</span>
                </div>
                <Slider 
                  defaultValue={[0]} 
                  max={100} 
                  step={10}
                  className="py-2"
                  onValueChange={(vals) => {
                    // In a real implementation, this would calculate the amount based on the wallet balance
                    const percentage = vals[0];
                    if (percentage === 0) {
                      setAmount('');
                    } else {
                      // Example calculation
                      const calculatedAmount = (percentage / 100 * 0.1).toFixed(4);
                      setAmount(calculatedAmount);
                    }
                  }}
                />
                <div className="flex justify-between text-xs">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Order Button */}
              <Button 
                className={cn(
                  "w-full",
                  side === 'buy' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                )}
                disabled={isLoading || !amount || (orderType === 'limit' && !price)}
                onClick={placeOrder}
              >
                {isLoading ? 
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : 
                  side === 'buy' ? <Plus className="mr-2 h-4 w-4" /> : <Minus className="mr-2 h-4 w-4" />
                }
                {`${side.charAt(0).toUpperCase()}${side.slice(1)} ${symbol.split('/')[0]}`}
              </Button>
            </TabsContent>

            <TabsContent value="chart" className="pt-4">
              <div className="flex flex-col items-center justify-center h-[300px] border rounded-md bg-muted/30">
                <LineChart className="h-16 w-16 text-muted" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Advanced charts will be loaded here
                </p>
              </div>
              <div className="flex justify-between mt-4">
                <Button variant="outline" size="sm">
                  <Clock className="mr-2 h-4 w-4" />
                  1H
                </Button>
                <Button variant="outline" size="sm">
                  <Clock className="mr-2 h-4 w-4" />
                  4H
                </Button>
                <Button variant="default" size="sm">
                  <Clock className="mr-2 h-4 w-4" />
                  1D
                </Button>
                <Button variant="outline" size="sm">
                  <Clock className="mr-2 h-4 w-4" />
                  1W
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="orders" className="pt-4">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <h3 className="text-sm font-medium">Open Orders</h3>
                  <Button variant="ghost" size="sm">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                </div>
                <div className="space-y-2">
                  <p className="text-center text-sm text-muted-foreground py-8">
                    No open orders
                  </p>
                </div>
                
                <div className="flex justify-between">
                  <h3 className="text-sm font-medium">Order History</h3>
                </div>
                <div className="space-y-2">
                  {/* Sample Order History Item */}
                  <div className="flex justify-between items-center border-b pb-2">
                    <div>
                      <p className="font-medium text-sm">BTC/USDT Buy</p>
                      <p className="text-xs text-muted-foreground">Market • Filled</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">0.001 BTC</p>
                      <p className="text-xs text-muted-foreground">@ $63,128.45</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <div>
                      <p className="font-medium text-sm">ETH/USDT Sell</p>
                      <p className="text-xs text-muted-foreground">Limit • Filled</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">0.1 ETH</p>
                      <p className="text-xs text-muted-foreground">@ $3,542.18</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardHeader>
      </Card>
    </div>
  );
}
