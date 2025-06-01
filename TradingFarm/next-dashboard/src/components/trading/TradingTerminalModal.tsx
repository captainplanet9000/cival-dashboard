'use client';

import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { DialogWrapper } from '@/components/ui/dialog-wrapper';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  LineChart,
  BarChart3,
  ArrowRightLeft,
  ChevronUp,
  ChevronDown,
  Settings,
  Eye,
  ArrowDownUp,
  Layers,
  PlusCircle,
  Save,
  Clock,
  BarChart,
  Wallet
} from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { logEvent } from '@/utils/logging';
import { 
  validateForm, 
  ValidationError, 
  tradingOrderSchema, 
  marketOrderSchema, 
  limitOrderSchema 
} from '@/utils/formValidation';

/**
 * Trading Terminal Modal Props
 * 
 * @interface TradingTerminalModalProps
 * @property {string} [symbol] - Initial trading symbol (default: 'BTC/USDT')
 * @property {string} [exchange] - Initial exchange (default: 'binance')
 * @property {boolean} isOpen - Whether the modal is open
 * @property {() => void} onClose - Function to call when the modal is closed
 * @property {(orderId: string) => void} [onSuccess] - Optional callback when an order is successfully placed
 */
interface TradingTerminalModalProps {
  symbol?: string;
  exchange?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (orderId: string) => void;
}

interface MarketData {
  price: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  change24h: number;
  changePercent24h: number;
  bid: number;
  ask: number;
  fundingRate?: number;
  nextFundingTime?: string;
}

/**
 * Trading Terminal Modal Component
 * 
 * A comprehensive trading interface for executing trades, viewing market data,
 * and managing orders across different exchanges and trading pairs.
 * Standardized to work with the modal controller pattern.
 */
export function TradingTerminalModal({ 
  symbol = 'BTC/USDT', 
  exchange = 'binance', 
  isOpen, 
  onClose,
  onSuccess 
}: TradingTerminalModalProps) {
  const [activeTab, setActiveTab] = React.useState('trade');
  const [selectedSymbol, setSelectedSymbol] = React.useState(symbol);
  const [selectedExchange, setSelectedExchange] = React.useState(exchange);
  const [orderType, setOrderType] = React.useState<'market' | 'limit'>('market');
  const [side, setSide] = React.useState<'buy' | 'sell'>('buy');
  const [price, setPrice] = React.useState('0');
  const [amount, setAmount] = React.useState('0');
  const [leverage, setLeverage] = React.useState(3);
  const [marketData, setMarketData] = React.useState<MarketData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [formErrors, setFormErrors] = React.useState<ValidationError[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  React.useEffect(() => {
    if (isOpen) {
      loadMarketData();
      
      // Log view event
      logEvent({
        category: 'trading',
        action: 'open_terminal',
        label: selectedSymbol,
        value: 1
      });
    }
  }, [isOpen, selectedSymbol, selectedExchange]);

  const loadMarketData = async () => {
    setLoading(true);
    
    try {
      // In a real implementation, this would fetch market data from the exchange API
      // For now, we'll use mock data
      setTimeout(() => {
        const basePrice = selectedSymbol.startsWith('BTC') ? 42500 : 
                         selectedSymbol.startsWith('ETH') ? 2250 : 
                         selectedSymbol.startsWith('SOL') ? 105 : 
                         selectedSymbol.startsWith('XRP') ? 0.58 : 1000;
        
        const priceVariation = basePrice * 0.0001 * (Math.random() * 10);
        const currentPrice = basePrice + (Math.random() > 0.5 ? priceVariation : -priceVariation);
        
        const mockData: MarketData = {
          price: currentPrice,
          high24h: currentPrice * 1.05,
          low24h: currentPrice * 0.95,
          volume24h: basePrice * 1000 + Math.random() * basePrice * 500,
          change24h: currentPrice * 0.02 * (Math.random() > 0.5 ? 1 : -1),
          changePercent24h: 2 * (Math.random() > 0.5 ? 1 : -1),
          bid: currentPrice - (currentPrice * 0.0001),
          ask: currentPrice + (currentPrice * 0.0001),
          fundingRate: 0.01 * (Math.random() > 0.5 ? 1 : -1),
          nextFundingTime: new Date(Date.now() + 28800000).toISOString() // 8 hours from now
        };
        
        setMarketData(mockData);
        setPrice(mockData.price.toFixed(2));
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error('Error loading market data:', error);
      setLoading(false);
    }
  };

  const handleSymbolChange = (newSymbol: string) => {
    setSelectedSymbol(newSymbol);
    
    // Log symbol change event
    logEvent({
      category: 'trading',
      action: 'change_symbol',
      label: newSymbol,
      value: 1
    });
  };

  const handleExchangeChange = (newExchange: string) => {
    setSelectedExchange(newExchange);
    
    // Log exchange change event
    logEvent({
      category: 'trading',
      action: 'change_exchange',
      label: newExchange,
      value: 1
    });
  };

  // Helper function to get error for a specific field
  const getError = (field: string): string | undefined => {
    const error = formErrors.find((err: ValidationError) => err.path[0] === field);
    return error?.message;
  };

  const validateOrderForm = () => {
    const formData = {
      orderType,
      side,
      price,
      amount,
      leverage,
      symbol: selectedSymbol,
      exchange: selectedExchange
    };

    // Reset errors
    setFormErrors([]);
    
    // Validate using the appropriate schema
    const schema = orderType === 'market' ? marketOrderSchema : limitOrderSchema;
    // Using any here because of the discriminated union type complexity
    const result = validateForm(schema as any, formData);
    
    if (!result.success && result.errors) {
      setFormErrors(result.errors);
      return false;
    }
    
    return true;
  };

  const createOrder = () => {
    setIsSubmitting(true);
    
    // Validate form based on order type
    let validationSchema;
    if (orderType === 'market') {
      validationSchema = marketOrderSchema;
    } else {
      validationSchema = limitOrderSchema;
    }
    
    // Build order payload
    const orderPayload = {
      symbol: selectedSymbol,
      exchange: selectedExchange,
      type: orderType,
      side,
      amount: parseFloat(amount),
      price: orderType === 'limit' ? parseFloat(price) : undefined,
      leverage: leverage
    };
    
    try {
      // Validate the order
      validateForm(orderPayload, validationSchema as any);
      
      // Log order submission
      logEvent({
        category: 'trading',
        action: 'create_order',
        label: `${side}_${orderType}_${selectedSymbol}`,
        value: parseFloat(amount)
      });
      
      // Simulate API call with timeout
      setTimeout(() => {
        console.log('Order created:', orderPayload);
        setIsSubmitting(false);
        
        // Generate a mock order ID
        const mockOrderId = `ORDER-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        // Call onSuccess callback if provided
        if (onSuccess) {
          onSuccess(mockOrderId);
        }
        
        // Show success message with toast in real implementation
      }, 1500);
      
    } catch (errors) {
      setFormErrors(errors as ValidationError[]);
      setIsSubmitting(false);
    }
  };

  const handleCreateOrder = () => {
    // Set submitting state to show loading indicators
    createOrder();
  };

  const setOrderSizePercentage = (percentage: number) => {
    // In a real implementation, this would calculate the amount based on available balance
    const mockBalance = 10000;
    const orderSize = (mockBalance * percentage) / parseFloat(price);
    setAmount(orderSize.toFixed(6));
  };

  const formatNumber = (num: number, decimals: number = 2): string => {
    return num.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  const OrderBook = () => (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Order Book</CardTitle>
      </CardHeader>
      <CardContent className="p-2 h-[300px] flex flex-col">
        <div className="flex justify-between text-xs text-muted-foreground mb-1 px-2">
          <span>Price ({selectedSymbol.split('/')[1]})</span>
          <span>Amount ({selectedSymbol.split('/')[0]})</span>
          <span>Total</span>
        </div>
        
        <ScrollArea className="flex-1 mb-1 border-b">
          <div className="space-y-1">
            {/* Sell orders (asks) - in real implementation, this would be dynamic */}
            {[...Array(10)].map((_, i) => {
              const price = marketData ? marketData.ask * (1 + (0.001 * (9 - i))) : 0;
              const amount = 0.1 + (Math.random() * 2);
              return (
                <div key={`ask-${i}`} className="flex justify-between text-xs px-2 py-1 hover:bg-muted/50">
                  <span className="text-red-500">{formatNumber(price, 2)}</span>
                  <span>{formatNumber(amount, 4)}</span>
                  <span>{formatNumber(price * amount, 2)}</span>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        
        <div className="py-2 px-2 bg-muted/20 flex justify-between items-center">
          <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
          <span className="font-bold">
            {marketData ? formatNumber(marketData.price, 2) : '-'}
          </span>
          <span className={`text-xs ${marketData && marketData.changePercent24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {marketData ? (marketData.changePercent24h >= 0 ? '+' : '') + marketData.changePercent24h.toFixed(2) + '%' : '-'}
          </span>
        </div>
        
        <ScrollArea className="flex-1 mt-1">
          <div className="space-y-1">
            {/* Buy orders (bids) - in real implementation, this would be dynamic */}
            {[...Array(10)].map((_, i) => {
              const price = marketData ? marketData.bid * (1 - (0.001 * i)) : 0;
              const amount = 0.1 + (Math.random() * 2);
              return (
                <div key={`bid-${i}`} className="flex justify-between text-xs px-2 py-1 hover:bg-muted/50">
                  <span className="text-green-500">{formatNumber(price, 2)}</span>
                  <span>{formatNumber(amount, 4)}</span>
                  <span>{formatNumber(price * amount, 2)}</span>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );

  const TradeHistory = () => (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Recent Trades</CardTitle>
      </CardHeader>
      <CardContent className="p-2 h-[300px]">
        <div className="flex justify-between text-xs text-muted-foreground mb-1 px-2">
          <span>Price</span>
          <span>Amount</span>
          <span>Time</span>
        </div>
        
        <ScrollArea className="h-[270px]">
          <div className="space-y-1">
            {/* Recent trades - in real implementation, this would be dynamic */}
            {[...Array(20)].map((_, i) => {
              const isBuy = Math.random() > 0.5;
              const price = marketData ? 
                marketData.price * (1 + (0.001 * (Math.random() > 0.5 ? 1 : -1) * Math.random())) : 
                0;
              const amount = 0.01 + (Math.random() * 0.5);
              const time = new Date(Date.now() - (i * 10000)).toLocaleTimeString(); // 10 sec intervals
              
              return (
                <div key={`trade-${i}`} className="flex justify-between text-xs px-2 py-1 hover:bg-muted/50">
                  <span className={isBuy ? 'text-green-500' : 'text-red-500'}>
                    {formatNumber(price, 2)}
                  </span>
                  <span>{formatNumber(amount, 4)}</span>
                  <span className="text-muted-foreground">{time}</span>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );

  // Use Dialog directly with type assertion to fix TypeScript issues
  const DialogComponent = Dialog as React.FC<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
  }>;
  
  return (
    <DialogWrapper
      open={isOpen}
      onOpenChange={(open: boolean) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-[1000px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center">
            <LineChart className="h-5 w-5 mr-2" />
            Trading Terminal
            {marketData && (
              <Badge 
                variant={marketData.changePercent24h >= 0 ? 'default' : 'destructive'} 
                className="ml-2"
              >
                {marketData.changePercent24h >= 0 ? '+' : ''}
                {marketData.changePercent24h.toFixed(2)}%
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Advanced trading interface for executing and managing trades
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={selectedExchange} onValueChange={handleExchangeChange}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Exchange" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="binance">Binance</SelectItem>
                <SelectItem value="bybit">Bybit</SelectItem>
                <SelectItem value="kucoin">KuCoin</SelectItem>
                <SelectItem value="coinbase">Coinbase</SelectItem>
                <SelectItem value="kraken">Kraken</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedSymbol} onValueChange={handleSymbolChange}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Symbol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BTC/USDT">BTC/USDT</SelectItem>
                <SelectItem value="ETH/USDT">ETH/USDT</SelectItem>
                <SelectItem value="SOL/USDT">SOL/USDT</SelectItem>
                <SelectItem value="XRP/USDT">XRP/USDT</SelectItem>
                <SelectItem value="BNB/USDT">BNB/USDT</SelectItem>
              </SelectContent>
            </Select>
            
            {marketData && (
              <div className="flex items-center ml-auto space-x-4">
                <div className="text-sm">
                  <span className="text-muted-foreground">24h High: </span>
                  <span className="font-medium">{formatNumber(marketData.high24h)}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">24h Low: </span>
                  <span className="font-medium">{formatNumber(marketData.low24h)}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">24h Vol: </span>
                  <span className="font-medium">{formatNumber(marketData.volume24h)}</span>
                </div>
                {marketData.fundingRate !== undefined && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-sm cursor-help">
                          <span className="text-muted-foreground">Funding: </span>
                          <span className={marketData.fundingRate >= 0 ? 'text-green-500' : 'text-red-500'}>
                            {marketData.fundingRate >= 0 ? '+' : ''}
                            {(marketData.fundingRate * 100).toFixed(4)}%
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Next funding in {marketData.nextFundingTime ? new Date(marketData.nextFundingTime).toLocaleTimeString() : 'N/A'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-auto md:h-[500px]">
            <div className="col-span-1 md:col-span-2 bg-muted/20 rounded-lg p-2 flex items-center justify-center border h-[300px] md:h-auto">
              <div className="text-center">
                <LineChart className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">Chart component would be integrated here</p>
                <p className="text-xs text-muted-foreground">(TradingView or custom chart library)</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="trade">Trade</TabsTrigger>
                  <TabsTrigger value="orders">Orders</TabsTrigger>
                </TabsList>
                
                <TabsContent value="trade" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant={side === 'buy' ? 'default' : 'outline'} 
                      className={side === 'buy' ? 'bg-green-500 hover:bg-green-600' : ''}
                      onClick={() => setSide('buy')}
                    >
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Buy
                    </Button>
                    <Button 
                      variant={side === 'sell' ? 'default' : 'outline'} 
                      className={side === 'sell' ? 'bg-red-500 hover:bg-red-600' : ''}
                      onClick={() => setSide('sell')}
                    >
                      <ChevronDown className="h-4 w-4 mr-1" />
                      Sell
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant={orderType === 'market' ? 'secondary' : 'outline'} 
                      onClick={() => setOrderType('market')}
                      size="sm"
                    >
                      Market
                    </Button>
                    <Button 
                      variant={orderType === 'limit' ? 'secondary' : 'outline'} 
                      onClick={() => setOrderType('limit')}
                      size="sm"
                    >
                      Limit
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="leverage">Leverage ({leverage}x)</Label>
                    <div className="flex items-center space-x-2">
                      <Slider 
                        id="leverage"
                        value={[leverage]} 
                        min={1} 
                        max={20} 
                        step={1}
                        onValueChange={(values) => setLeverage(values[0])}
                      />
                    </div>
                  </div>
                  
                  {orderType === 'limit' && (
                    <div className="space-y-2">
                      <Label htmlFor="price">Price ({selectedSymbol.split('/')[1]})</Label>
                      <Input 
                        id="price" 
                        type="number" 
                        value={price} 
                        onChange={(e) => setPrice(e.target.value)}
                        className={getError('price') ? 'border-red-500' : ''}
                      />
                      {getError('price') && (
                        <p className="text-sm text-red-500">{getError('price')}</p>
                      )}
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount ({selectedSymbol.split('/')[0]})</Label>
                    <Input 
                      id="amount" 
                      type="number" 
                      value={amount} 
                      onChange={(e) => setAmount(e.target.value)}
                      className={getError('amount') ? 'border-red-500' : ''}
                    />
                    {getError('amount') && (
                      <p className="text-sm text-red-500">{getError('amount')}</p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-4 gap-1">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setOrderSizePercentage(0.25)}
                      className="text-xs"
                    >
                      25%
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setOrderSizePercentage(0.5)}
                      className="text-xs"
                    >
                      50%
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setOrderSizePercentage(0.75)}
                      className="text-xs"
                    >
                      75%
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setOrderSizePercentage(1)}
                      className="text-xs"
                    >
                      100%
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total:</span>
                      <span>
                        {formatNumber(parseFloat(price) * parseFloat(amount || '0'))} {selectedSymbol.split('/')[1]}
                      </span>
                    </div>
                    
                    {getError('form') && (
                      <p className="text-sm text-red-500 text-center">{getError('form')}</p>
                    )}
                    <Button 
                      onClick={handleCreateOrder} 
                      className={`w-full ${side === 'buy' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </span>
                      ) : (
                        <>{side === 'buy' ? 'Buy' : 'Sell'} {selectedSymbol.split('/')[0]}</>
                      )}
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="orders" className="mt-4">
                  <Tabs defaultValue="open">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="open" className="text-xs">Open</TabsTrigger>
                      <TabsTrigger value="history" className="text-xs">History</TabsTrigger>
                      <TabsTrigger value="triggers" className="text-xs">Triggers</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="open" className="mt-2">
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No open orders</p>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="history" className="mt-2">
                      <ScrollArea className="h-[250px]">
                        <div className="space-y-2">
                          {[...Array(5)].map((_, i) => {
                            const isBuy = Math.random() > 0.5;
                            const time = new Date(Date.now() - (86400000 * (i + 1))).toLocaleDateString();
                            return (
                              <div key={i} className="p-2 border rounded-md text-xs">
                                <div className="flex justify-between">
                                  <span className={isBuy ? 'text-green-500' : 'text-red-500'}>
                                    {isBuy ? 'Buy' : 'Sell'} {selectedSymbol}
                                  </span>
                                  <span className="text-muted-foreground">{time}</span>
                                </div>
                                <div className="mt-1">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Amount:</span>
                                    <span>{(0.1 + Math.random()).toFixed(4)} {selectedSymbol.split('/')[0]}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Price:</span>
                                    <span>{formatNumber(marketData?.price || 0 * (0.95 + Math.random() * 0.1), 2)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Type:</span>
                                    <span>{Math.random() > 0.5 ? 'Market' : 'Limit'}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                    
                    <TabsContent value="triggers" className="mt-2">
                      <div className="flex justify-center py-4">
                        <Button variant="outline" size="sm">
                          <PlusCircle className="h-4 w-4 mr-2" />
                          Add Stop Loss/Take Profit
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </TabsContent>
              </Tabs>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-auto sm:h-[300px]">
            <OrderBook />
            <TradeHistory />
          </div>
        </div>
      </DialogContent>
    </DialogWrapper>
  );
}
