'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowDown, ArrowUp } from 'lucide-react';
import { orderManagementService, OrderRequest } from '@/utils/trading/order-management-service';
import { executionEngineService, ExecutionStrategy } from '@/utils/trading/execution-engine-service';
import { marketDataService } from '@/utils/exchange/market-data-service';
import { useToast } from '@/components/ui/use-toast';
import { formatPrice } from '@/utils/format';

interface OrderEntryProps {
  defaultSymbol?: string;
  onOrderCreated?: (orderId: number) => void;
  exchangeCredentialId: number;
}

export function OrderEntry({ defaultSymbol = 'BTC/USDT', onOrderCreated, exchangeCredentialId }: OrderEntryProps) {
  const { toast } = useToast();
  
  // Market data state
  const [marketData, setMarketData] = useState<any>(null);
  const [loadingMarketData, setLoadingMarketData] = useState<boolean>(false);
  
  // Order form state
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop_market' | 'stop_limit'>('market');
  const [symbol, setSymbol] = useState<string>(defaultSymbol);
  const [quantity, setQuantity] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [stopPrice, setStopPrice] = useState<string>('');
  const [isPostOnly, setIsPostOnly] = useState<boolean>(false);
  const [isReduceOnly, setIsReduceOnly] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Advanced execution state
  const [useAdvancedExecution, setUseAdvancedExecution] = useState<boolean>(false);
  const [executionType, setExecutionType] = useState<'basic' | 'twap' | 'vwap' | 'iceberg' | 'smart'>('basic');
  const [savedStrategies, setSavedStrategies] = useState<ExecutionStrategy[]>([]);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('');
  const [loadingStrategies, setLoadingStrategies] = useState<boolean>(false);
  
  // TWAP/VWAP parameters
  const [executionDuration, setExecutionDuration] = useState<string>('30');
  const [slices, setSlices] = useState<string>('5');
  const [randomize, setRandomize] = useState<boolean>(true);
  
  // Iceberg parameters
  const [visibleSize, setVisibleSize] = useState<string>('');
  const [variance, setVariance] = useState<string>('10');
  
  // Smart parameters
  const [aggressiveness, setAggressiveness] = useState<string>('5');
  const [adaptiveSpeed, setAdaptiveSpeed] = useState<boolean>(true);
  
  // Fetch market data for the selected symbol
  useEffect(() => {
    const fetchMarketData = async () => {
      if (!symbol) return;
      
      setLoadingMarketData(true);
      try {
        const data = await marketDataService.getMarketData(symbol);
        if (data && data.length > 0) {
          setMarketData(data[0]);
          
          // Pre-fill price with current market price
          if (orderType === 'limit' || orderType === 'stop_limit') {
            const defaultPrice = orderSide === 'buy' ? data[0].bid_price : data[0].ask_price;
            setPrice(defaultPrice ? defaultPrice.toString() : '');
          }
          
          // Pre-fill stop price
          if (orderType === 'stop_market' || orderType === 'stop_limit') {
            const defaultStopPrice = orderSide === 'buy' 
              ? (data[0].last_price * 1.01).toFixed(2) // Default buy stop 1% above
              : (data[0].last_price * 0.99).toFixed(2); // Default sell stop 1% below
            setStopPrice(defaultStopPrice);
          }
        }
      } catch (error: any) {
        console.error('Error fetching market data:', error);
        toast({
          title: 'Error fetching market data',
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        setLoadingMarketData(false);
      }
    };

    fetchMarketData();
    
    // Subscribe to real-time market data updates
    const subscribeToUpdates = async () => {
      try {
        await marketDataService.subscribeToMarketData(symbol, exchangeCredentialId);
      } catch (error) {
        console.error('Error subscribing to market data:', error);
      }
    };
    
    subscribeToUpdates();
    
    return () => {
      // Clean up subscription
      marketDataService.unsubscribeFromMarketData(symbol);
    };
  }, [symbol, orderType, orderSide, exchangeCredentialId, toast]);
  
  // Fetch saved execution strategies
  useEffect(() => {
    const fetchStrategies = async () => {
      if (!useAdvancedExecution) return;
      
      setLoadingStrategies(true);
      try {
        const strategies = await executionEngineService.getStrategies();
        setSavedStrategies(strategies);
        
        // Select first strategy by default if available
        if (strategies.length > 0 && !selectedStrategyId) {
          setSelectedStrategyId(strategies[0].id.toString());
        }
      } catch (error: any) {
        console.error('Error fetching strategies:', error);
      } finally {
        setLoadingStrategies(false);
      }
    };
    
    fetchStrategies();
  }, [useAdvancedExecution, selectedStrategyId]);
  
  // Calculate visible size default value (25% of total quantity)
  useEffect(() => {
    if (executionType === 'iceberg' && quantity) {
      const defaultVisibleSize = (parseFloat(quantity) * 0.25).toFixed(4);
      setVisibleSize(defaultVisibleSize);
    }
  }, [executionType, quantity]);
  
  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      // Validate inputs
      if (!symbol) {
        throw new Error('Symbol is required');
      }
      
      if (!quantity || parseFloat(quantity) <= 0) {
        throw new Error('Valid quantity is required');
      }
      
      if ((orderType === 'limit' || orderType === 'stop_limit') && (!price || parseFloat(price) <= 0)) {
        throw new Error('Valid price is required for limit orders');
      }
      
      if ((orderType === 'stop_market' || orderType === 'stop_limit') && (!stopPrice || parseFloat(stopPrice) <= 0)) {
        throw new Error('Valid stop price is required for stop orders');
      }
      
      // Create order request
      const orderRequest: OrderRequest = {
        symbol,
        side: orderSide,
        type: orderType,
        quantity: parseFloat(quantity),
        exchangeCredentialId,
        isPostOnly,
        isReduceOnly
      };
      
      // Add price for limit orders
      if (orderType === 'limit' || orderType === 'stop_limit') {
        orderRequest.price = parseFloat(price);
      }
      
      // Add stop price for stop orders
      if (orderType === 'stop_market' || orderType === 'stop_limit') {
        orderRequest.stopPrice = parseFloat(stopPrice);
      }
      
      // If using advanced execution
      if (useAdvancedExecution && executionType !== 'basic') {
        // Use saved strategy if selected
        if (selectedStrategyId) {
          await executionEngineService.executeOrder(
            orderRequest,
            parseInt(selectedStrategyId),
          );
          
          toast({
            title: 'Execution started',
            description: `Order execution initiated using ${
              savedStrategies.find(s => s.id.toString() === selectedStrategyId)?.name || 'selected strategy'
            }`,
          });
        } else {
          // Configure execution parameters based on type
          let executionConfig;
          
          switch (executionType) {
            case 'twap':
              executionConfig = {
                strategyType: 'twap',
                parameters: {
                  durationMinutes: parseInt(executionDuration),
                  slices: parseInt(slices),
                  randomize
                }
              };
              break;
              
            case 'vwap':
              executionConfig = {
                strategyType: 'vwap',
                parameters: {
                  durationMinutes: parseInt(executionDuration),
                  volumeProfile: [0.1, 0.15, 0.2, 0.3, 0.15, 0.1] // Default profile
                }
              };
              break;
              
            case 'iceberg':
              executionConfig = {
                strategyType: 'iceberg',
                parameters: {
                  visibleSize: parseFloat(visibleSize),
                  variance: parseInt(variance) / 100
                }
              };
              break;
              
            case 'smart':
              executionConfig = {
                strategyType: 'smart',
                parameters: {
                  aggressiveness: parseInt(aggressiveness),
                  adaptiveSpeed
                }
              };
              break;
          }
          
          await executionEngineService.executeOrder(orderRequest, executionConfig);
          
          toast({
            title: 'Execution started',
            description: `Order execution initiated using ${executionType.toUpperCase()} strategy`,
          });
        }
      } else {
        // Basic order execution
        const order = await orderManagementService.createOrder(orderRequest);
        
        toast({
          title: 'Order placed',
          description: `${orderSide.toUpperCase()} ${orderType.toUpperCase()} order placed for ${quantity} ${symbol}`,
        });
        
        // Notify parent component
        if (onOrderCreated) {
          onOrderCreated(order.id);
        }
      }
      
      // Reset form
      setQuantity('');
      setPrice('');
      setStopPrice('');
    } catch (error: any) {
      console.error('Error placing order:', error);
      toast({
        title: 'Error placing order',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Place Order</CardTitle>
            <CardDescription>Create a new trading order</CardDescription>
          </div>
          {marketData && (
            <div className="text-right">
              <div className="font-bold text-xl">
                {formatPrice(marketData.last_price)}
              </div>
              <Badge 
                variant={marketData.price_change_percent >= 0 ? 'default' : 'destructive'}
                className={`${marketData.price_change_percent >= 0 ? 'bg-green-500' : ''} text-white`}
              >
                {marketData.price_change_percent >= 0 ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
                {Math.abs(marketData.price_change_percent).toFixed(2)}%
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleOrderSubmit}>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="symbol">Symbol</Label>
                <Select value={symbol} onValueChange={setSymbol}>
                  <SelectTrigger id="symbol">
                    <SelectValue placeholder="Select Symbol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BTC/USDT">BTC/USDT</SelectItem>
                    <SelectItem value="ETH/USDT">ETH/USDT</SelectItem>
                    <SelectItem value="SOL/USDT">SOL/USDT</SelectItem>
                    <SelectItem value="BNB/USDT">BNB/USDT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Order Side</Label>
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
                    variant={orderSide === 'sell' ? 'destructive' : 'outline'} 
                    onClick={() => setOrderSide('sell')}
                  >
                    Sell
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Order Type</Label>
              <Tabs defaultValue={orderType} onValueChange={(value) => setOrderType(value as any)}>
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="market">Market</TabsTrigger>
                  <TabsTrigger value="limit">Limit</TabsTrigger>
                  <TabsTrigger value="stop_market">Stop</TabsTrigger>
                  <TabsTrigger value="stop_limit">Stop Limit</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                step="0.0001"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            
            {(orderType === 'limit' || orderType === 'stop_limit') && (
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
            )}
            
            {(orderType === 'stop_market' || orderType === 'stop_limit') && (
              <div className="space-y-2">
                <Label htmlFor="stopPrice">Stop Price</Label>
                <Input
                  id="stopPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={stopPrice}
                  onChange={(e) => setStopPrice(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <Switch
                id="advanced-execution"
                checked={useAdvancedExecution}
                onCheckedChange={setUseAdvancedExecution}
              />
              <Label htmlFor="advanced-execution">Use Advanced Execution</Label>
            </div>
            
            {useAdvancedExecution && (
              <div className="space-y-4 border rounded-md p-4">
                <div className="space-y-2">
                  <Label>Execution Strategy</Label>
                  <Select value={executionType} onValueChange={(value) => setExecutionType(value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Strategy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic (Immediate)</SelectItem>
                      <SelectItem value="twap">TWAP (Time-Weighted)</SelectItem>
                      <SelectItem value="iceberg">Iceberg (Hidden Size)</SelectItem>
                      <SelectItem value="smart">Smart (Adaptive)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {savedStrategies.length > 0 && (
                  <div className="space-y-2">
                    <Label>Saved Strategies</Label>
                    <Select value={selectedStrategyId} onValueChange={setSelectedStrategyId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a saved strategy (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Custom Parameters</SelectItem>
                        {savedStrategies.map((strategy) => (
                          <SelectItem key={strategy.id} value={strategy.id.toString()}>
                            {strategy.name} ({strategy.strategy_type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {!selectedStrategyId && (
                  <>
                    {executionType === 'twap' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="duration">Duration (minutes)</Label>
                          <Input
                            id="duration"
                            type="number"
                            min="1"
                            value={executionDuration}
                            onChange={(e) => setExecutionDuration(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="slices">Number of Slices</Label>
                          <Input
                            id="slices"
                            type="number"
                            min="2"
                            value={slices}
                            onChange={(e) => setSlices(e.target.value)}
                          />
                        </div>
                        <div className="col-span-2 flex items-center space-x-2">
                          <Switch
                            id="randomize"
                            checked={randomize}
                            onCheckedChange={setRandomize}
                          />
                          <Label htmlFor="randomize">Randomize slice sizes</Label>
                        </div>
                      </div>
                    )}
                    
                    {executionType === 'iceberg' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="visibleSize">Visible Size</Label>
                          <Input
                            id="visibleSize"
                            type="number"
                            step="0.0001"
                            min="0.0001"
                            value={visibleSize}
                            onChange={(e) => setVisibleSize(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="variance">Size Variance (%)</Label>
                          <Input
                            id="variance"
                            type="number"
                            min="0"
                            max="50"
                            value={variance}
                            onChange={(e) => setVariance(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                    
                    {executionType === 'smart' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="aggressiveness">Aggressiveness (1-10)</Label>
                          <Input
                            id="aggressiveness"
                            type="number"
                            min="1"
                            max="10"
                            value={aggressiveness}
                            onChange={(e) => setAggressiveness(e.target.value)}
                          />
                          <span className="text-xs text-muted-foreground">
                            Higher = faster execution, potentially higher slippage
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="adaptiveSpeed"
                            checked={adaptiveSpeed}
                            onCheckedChange={setAdaptiveSpeed}
                          />
                          <Label htmlFor="adaptiveSpeed">Adapt to market volatility</Label>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="post-only"
                  checked={isPostOnly}
                  onCheckedChange={setIsPostOnly}
                  disabled={orderType === 'market' || orderType === 'stop_market'}
                />
                <Label htmlFor="post-only">Post Only</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="reduce-only"
                  checked={isReduceOnly}
                  onCheckedChange={setIsReduceOnly}
                />
                <Label htmlFor="reduce-only">Reduce Only</Label>
              </div>
            </div>
          </div>
          
          <CardFooter className="px-0 pt-6">
            <Button 
              type="submit" 
              className={`w-full ${orderSide === 'buy' ? 'bg-green-600 hover:bg-green-700' : ''}`}
              variant={orderSide === 'buy' ? 'default' : 'destructive'}
              disabled={isSubmitting || loadingMarketData}
            >
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
              ) : (
                `${orderSide === 'buy' ? 'Buy' : 'Sell'} ${quantity ? quantity : ''} ${symbol}`
              )}
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
}
