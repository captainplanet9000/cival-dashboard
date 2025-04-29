import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button-standardized';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/components/ui/use-toast';
import { useMarketData } from '@/hooks/use-market-data';
import { useOrderManagement } from '@/hooks/use-order-management';
import { useRiskProfiles } from '@/hooks/use-risk-profiles';
import { OrderSide, OrderType, TimeInForce } from '@/utils/trading/order-management-service';

/**
 * @component OrderExecutionPanel
 * @description Provides a comprehensive order entry interface for all order types
 */
export interface OrderExecutionPanelProps {
  symbol: string;
  exchange: string;
  exchangeCredentialId: number;
}

export function OrderExecutionPanel({ 
  symbol, 
  exchange,
  exchangeCredentialId 
}: OrderExecutionPanelProps) {
  // State for order form
  const [side, setSide] = useState<OrderSide>('buy');
  const [orderType, setOrderType] = useState<OrderType>('limit');
  const [quantity, setQuantity] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [stopPrice, setStopPrice] = useState<string>('');
  const [timeInForce, setTimeInForce] = useState<TimeInForce>('GTC');
  const [isPostOnly, setIsPostOnly] = useState<boolean>(false);
  const [isReduceOnly, setIsReduceOnly] = useState<boolean>(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState<boolean>(false);

  // Advanced order state
  const [isAdvancedOrder, setIsAdvancedOrder] = useState<boolean>(false);
  const [advancedType, setAdvancedType] = useState<'twap' | 'vwap' | 'iceberg'>('twap');
  const [sliceCount, setSliceCount] = useState<string>('4');
  const [intervalMinutes, setIntervalMinutes] = useState<string>('15');
  const [visibleQuantity, setVisibleQuantity] = useState<string>('');

  // Risk management state
  const [positionSizePercent, setPositionSizePercent] = useState<number>(5);
  const [maxLossPercent, setMaxLossPercent] = useState<number>(1);
  
  // Hooks
  const { toast } = useToast();
  const { ticker, orderBook } = useMarketData(symbol, exchange);
  const { createOrder, validateOrder } = useOrderManagement();
  const { activeRiskProfile } = useRiskProfiles();

  // Effects
  useEffect(() => {
    // Update price when ticker changes
    if (ticker && ticker.lastPrice) {
      setPrice(ticker.lastPrice.toString());
    }
  }, [ticker]);

  // Calculate derived values
  const baseAsset = symbol.split('/')[0];
  const quoteAsset = symbol.split('/')[1];
  const estimatedValue = parseFloat(quantity) * parseFloat(price) || 0;
  const maxPositionSize = activeRiskProfile ? 
    (activeRiskProfile.maxPositionSize * positionSizePercent / 100) : 0;
  
  // Calculate potential loss
  const stopLoss = orderType.includes('stop') ? parseFloat(stopPrice) : 
    (side === 'buy' ? parseFloat(price) * 0.95 : parseFloat(price) * 1.05);
  const potentialLoss = side === 'buy' 
    ? (parseFloat(price) - stopLoss) * parseFloat(quantity)
    : (stopLoss - parseFloat(price)) * parseFloat(quantity);
  const riskAmount = potentialLoss > 0 ? potentialLoss : 0;
  const riskPercent = (maxPositionSize > 0 && estimatedValue > 0) 
    ? (riskAmount / maxPositionSize) * 100 
    : 0;
  
  // Check if risk exceeds limit
  const isRiskExceeded = riskPercent > maxLossPercent;
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Open confirmation modal if risk is acceptable
    if (isRiskExceeded) {
      toast({
        title: "Risk Limit Exceeded",
        description: `The potential loss (${riskPercent.toFixed(2)}%) exceeds your maximum risk tolerance (${maxLossPercent}%).`,
        variant: "destructive",
      });
      return;
    }
    
    // Prepare order parameters
    const orderParams = {
      symbol,
      side,
      type: orderType,
      quantity: parseFloat(quantity),
      price: ['market', 'stop_market'].includes(orderType) ? undefined : parseFloat(price),
      stopPrice: orderType.includes('stop') ? parseFloat(stopPrice) : undefined,
      timeInForce,
      isPostOnly,
      isReduceOnly,
      exchangeCredentialId,
      metadata: isAdvancedOrder ? {
        advancedParams: {
          type: advancedType,
          ...(advancedType === 'twap' && {
            sliceCount: parseInt(sliceCount),
            intervalMs: parseInt(intervalMinutes) * 60 * 1000,
          }),
          ...(advancedType === 'vwap' && {
            intervalMs: parseInt(intervalMinutes) * 60 * 1000,
            volumeProfile: 'historical',
          }),
          ...(advancedType === 'iceberg' && {
            visibleQty: parseFloat(visibleQuantity),
          }),
        }
      } : {},
    };
    
    // Validate order
    const { isValid, errors } = validateOrder(orderParams);
    if (!isValid) {
      toast({
        title: "Invalid Order",
        description: errors.join(", "),
        variant: "destructive",
      });
      return;
    }
    
    setIsConfirmationOpen(true);
  };
  
  // Execute order after confirmation
  const executeOrder = async () => {
    try {
      const result = await createOrder({
        symbol,
        side,
        type: orderType,
        quantity: parseFloat(quantity),
        price: ['market', 'stop_market'].includes(orderType) ? undefined : parseFloat(price),
        stopPrice: orderType.includes('stop') ? parseFloat(stopPrice) : undefined,
        timeInForce,
        isPostOnly,
        isReduceOnly,
        exchangeCredentialId,
        metadata: isAdvancedOrder ? {
          advancedParams: {
            type: advancedType,
            ...(advancedType === 'twap' && {
              sliceCount: parseInt(sliceCount),
              intervalMs: parseInt(intervalMinutes) * 60 * 1000,
            }),
            ...(advancedType === 'vwap' && {
              intervalMs: parseInt(intervalMinutes) * 60 * 1000,
              volumeProfile: 'historical',
            }),
            ...(advancedType === 'iceberg' && {
              visibleQty: parseFloat(visibleQuantity),
            }),
          }
        } : {},
      });
      
      toast({
        title: "Order Submitted",
        description: `${side.toUpperCase()} ${quantity} ${baseAsset} at ${price} ${quoteAsset}`,
        variant: "success",
      });
      
      // Reset form
      setQuantity('');
      setIsConfirmationOpen(false);
    } catch (error) {
      toast({
        title: "Order Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit}>
          {/* Order type selector */}
          <Tabs 
            defaultValue="limit" 
            value={orderType}
            onValueChange={(value) => setOrderType(value as OrderType)}
            className="mb-4"
          >
            <TabsList className="grid grid-cols-4 mb-2">
              <TabsTrigger value="market">Market</TabsTrigger>
              <TabsTrigger value="limit">Limit</TabsTrigger>
              <TabsTrigger value="stop_limit">Stop Limit</TabsTrigger>
              <TabsTrigger value="stop_market">Stop Market</TabsTrigger>
            </TabsList>
            
            {/* Additional order type options */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={isAdvancedOrder}
                  onCheckedChange={setIsAdvancedOrder}
                  id="advanced-order"
                />
                <Label htmlFor="advanced-order">Advanced Order</Label>
              </div>
              
              {isAdvancedOrder && (
                <Select 
                  value={advancedType} 
                  onValueChange={(value) => setAdvancedType(value as any)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="twap">TWAP</SelectItem>
                    <SelectItem value="vwap">VWAP</SelectItem>
                    <SelectItem value="iceberg">Iceberg</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            
            {/* Buy/Sell selector */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <Button
                type="button"
                variant={side === 'buy' ? 'primary' : 'outline'}
                onClick={() => setSide('buy')}
                className={side === 'buy' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                Buy {baseAsset}
              </Button>
              <Button
                type="button"
                variant={side === 'sell' ? 'destructive' : 'outline'}
                onClick={() => setSide('sell')}
              >
                Sell {baseAsset}
              </Button>
            </div>
            
            {/* Price inputs */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="quantity">Amount ({baseAsset})</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.0001"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>
              
              {orderType !== 'market' && (
                <div>
                  <Label htmlFor="price">Price ({quoteAsset})</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                  />
                </div>
              )}
              
              {orderType.includes('stop') && (
                <div>
                  <Label htmlFor="stopPrice">Trigger Price ({quoteAsset})</Label>
                  <Input
                    id="stopPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={stopPrice}
                    onChange={(e) => setStopPrice(e.target.value)}
                    required
                  />
                </div>
              )}
              
              {/* Advanced order options */}
              {isAdvancedOrder && (
                <div className="border rounded p-3 space-y-3 mt-2">
                  <h4 className="font-medium">Advanced Order Settings</h4>
                  
                  {advancedType === 'twap' && (
                    <>
                      <div>
                        <Label htmlFor="sliceCount">Number of Slices</Label>
                        <Input
                          id="sliceCount"
                          type="number"
                          min="2"
                          value={sliceCount}
                          onChange={(e) => setSliceCount(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="intervalMinutes">Interval (minutes)</Label>
                        <Input
                          id="intervalMinutes"
                          type="number"
                          min="1"
                          value={intervalMinutes}
                          onChange={(e) => setIntervalMinutes(e.target.value)}
                        />
                      </div>
                    </>
                  )}
                  
                  {advancedType === 'vwap' && (
                    <div>
                      <Label htmlFor="intervalMinutes">Interval (minutes)</Label>
                      <Input
                        id="intervalMinutes"
                        type="number"
                        min="1"
                        value={intervalMinutes}
                        onChange={(e) => setIntervalMinutes(e.target.value)}
                      />
                    </div>
                  )}
                  
                  {advancedType === 'iceberg' && (
                    <div>
                      <Label htmlFor="visibleQuantity">Visible Quantity ({baseAsset})</Label>
                      <Input
                        id="visibleQuantity"
                        type="number"
                        step="0.0001"
                        min="0"
                        value={visibleQuantity}
                        onChange={(e) => setVisibleQuantity(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}
              
              {/* Order options */}
              <div className="border rounded p-3 space-y-3">
                <h4 className="font-medium">Order Options</h4>
                
                <div>
                  <Label htmlFor="timeInForce">Time In Force</Label>
                  <Select 
                    value={timeInForce} 
                    onValueChange={(value) => setTimeInForce(value as TimeInForce)}
                  >
                    <SelectTrigger id="timeInForce">
                      <SelectValue placeholder="Select time in force" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GTC">Good Till Cancelled</SelectItem>
                      <SelectItem value="IOC">Immediate or Cancel</SelectItem>
                      <SelectItem value="FOK">Fill or Kill</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={isPostOnly}
                    onCheckedChange={setIsPostOnly}
                    id="post-only"
                  />
                  <Label htmlFor="post-only">Post Only</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={isReduceOnly}
                    onCheckedChange={setIsReduceOnly}
                    id="reduce-only"
                  />
                  <Label htmlFor="reduce-only">Reduce Only</Label>
                </div>
              </div>
              
              {/* Risk management */}
              <div className="border rounded p-3 space-y-3">
                <h4 className="font-medium">Risk Management</h4>
                
                <div>
                  <div className="flex justify-between">
                    <Label htmlFor="position-size">Position Size</Label>
                    <span>{positionSizePercent}% of max</span>
                  </div>
                  <Slider
                    id="position-size"
                    value={[positionSizePercent]}
                    onValueChange={(value) => setPositionSizePercent(value[0])}
                    min={1}
                    max={100}
                    step={1}
                  />
                </div>
                
                <div>
                  <div className="flex justify-between">
                    <Label htmlFor="max-loss">Max Loss</Label>
                    <span>{maxLossPercent}% per trade</span>
                  </div>
                  <Slider
                    id="max-loss"
                    value={[maxLossPercent]}
                    onValueChange={(value) => setMaxLossPercent(value[0])}
                    min={0.1}
                    max={5}
                    step={0.1}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span>Estimated Value:</span>
                    <span className="font-medium">{estimatedValue.toFixed(2)} {quoteAsset}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Potential Risk:</span>
                    <span className={`font-medium ${isRiskExceeded ? 'text-destructive' : ''}`}>
                      {riskPercent.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Submit button */}
              <Button 
                type="submit" 
                className="w-full"
                variant={side === 'buy' ? 'primary' : 'destructive'}
                disabled={!quantity || isRiskExceeded}
              >
                {side === 'buy' ? 'Buy' : 'Sell'} {baseAsset}
              </Button>
            </div>
          </Tabs>
        </form>
      </CardContent>
      
      {/* Order confirmation modal would be implemented here */}
    </Card>
  );
}
