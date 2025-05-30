'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Loader2, 
  ArrowUp, 
  ArrowDown, 
  DollarSign, 
  TrendingUp,
  BarChart4,
  ChevronsUp,
  ChevronsDown
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Import mutation hooks
import { useCreateOrder, OrderInput } from '@/hooks/react-query/use-position-mutations';
// Import query hooks to fetch accounts
import { useExchangeAccounts } from '@/hooks/react-query/use-exchange-queries';

// Define schema for form validation
const orderFormSchema = z.object({
  farmId: z.string().min(1, 'Farm ID is required'),
  exchangeAccountId: z.string().min(1, 'Exchange account is required'),
  symbol: z.string().min(1, 'Symbol is required'),
  side: z.enum(['buy', 'sell']),
  type: z.enum(['market', 'limit', 'stop', 'stop_limit']),
  quantity: z.number().positive('Quantity must be positive'),
  price: z.number().optional(),
  stopPrice: z.number().optional(),
  timeInForce: z.enum(['gtc', 'ioc', 'fok']).optional(),
  reduceOnly: z.boolean().optional(),
  positionId: z.string().optional(),
  agentId: z.string().optional(),
});

type OrderFormValues = z.infer<typeof orderFormSchema>;

interface OrderFormProps {
  farmId: string;
  initialSymbol?: string;
  positionId?: string;
  agentId?: string;
  exchangeAccountId?: string;
  initialSide?: 'buy' | 'sell';
}

export function OrderForm({
  farmId,
  initialSymbol = '',
  positionId,
  agentId,
  exchangeAccountId,
  initialSide = 'buy'
}: OrderFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced'>('basic');
  const [marketPrice, setMarketPrice] = useState<number | null>(null);
  
  // Use the create order mutation
  const createOrder = useCreateOrder();
  
  // Fetch exchange accounts for the farm
  const { data: exchangeAccounts, isLoading: loadingAccounts } = useExchangeAccounts(farmId);
  
  // Setup default values for the form
  const defaultValues: Partial<OrderFormValues> = {
    farmId,
    symbol: initialSymbol,
    side: initialSide,
    type: 'market',
    quantity: 1,
    timeInForce: 'gtc',
    reduceOnly: false,
    positionId,
    agentId,
    exchangeAccountId: exchangeAccountId || '',
  };
  
  // Initialize the form
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues,
  });
  
  // Watch form values to conditionally render components
  const watchedType = form.watch('type');
  const watchedSide = form.watch('side');
  const watchedSymbol = form.watch('symbol');
  
  // Simulated function to fetch market price - in a real app, this would call an API
  const fetchMarketPrice = async (symbol: string) => {
    // This is a mock implementation - real implementation would fetch from API
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Generate a realistic price based on the symbol
      let basePrice = 0;
      if (symbol.includes('BTC')) basePrice = 50000 + Math.random() * 5000;
      else if (symbol.includes('ETH')) basePrice = 3000 + Math.random() * 300;
      else if (symbol.includes('SOL')) basePrice = 100 + Math.random() * 10;
      else basePrice = 10 + Math.random() * 100;
      
      setMarketPrice(parseFloat(basePrice.toFixed(2)));
      
      // If it's a limit or stop limit order, set the price field
      const orderType = form.getValues('type');
      if (orderType === 'limit' || orderType === 'stop_limit') {
        form.setValue('price', parseFloat(basePrice.toFixed(2)));
      }
      
      if (orderType === 'stop' || orderType === 'stop_limit') {
        const side = form.getValues('side');
        // Set stop price slightly above or below market price based on side
        const stopPriceModifier = side === 'buy' ? 1.02 : 0.98; // 2% above for buy stop, 2% below for sell stop
        form.setValue('stopPrice', parseFloat((basePrice * stopPriceModifier).toFixed(2)));
      }
    } catch (error) {
      console.error('Error fetching market price:', error);
      toast({
        title: 'Price fetch failed',
        description: 'Unable to fetch current market price',
        variant: 'destructive',
      });
    }
  };
  
  // When symbol changes, fetch market price
  React.useEffect(() => {
    if (watchedSymbol) {
      fetchMarketPrice(watchedSymbol);
    }
  }, [watchedSymbol]);
  
  // Calculate order total value
  const calculateTotal = () => {
    const quantity = form.getValues('quantity') || 0;
    const price = form.getValues('price') || marketPrice || 0;
    return quantity * price;
  };
  
  // Handle form submission
  const onSubmit = (data: OrderFormValues) => {
    // Check if required fields are filled for the selected order type
    if ((data.type === 'limit' || data.type === 'stop_limit') && !data.price) {
      form.setError('price', { 
        type: 'manual', 
        message: 'Price is required for limit orders' 
      });
      return;
    }
    
    if ((data.type === 'stop' || data.type === 'stop_limit') && !data.stopPrice) {
      form.setError('stopPrice', { 
        type: 'manual', 
        message: 'Stop price is required for stop orders' 
      });
      return;
    }
    
    // Prepare order data
    const orderData: OrderInput = {
      ...data,
      // Clean up any undefined or null values
      price: data.price || undefined,
      stopPrice: data.stopPrice || undefined,
      timeInForce: data.timeInForce || undefined,
      reduceOnly: data.reduceOnly || undefined,
      positionId: data.positionId || undefined,
      agentId: data.agentId || undefined,
    };
    
    // Create the order using the mutation hook
    createOrder.mutate(orderData, {
      onSuccess: () => {
        // Redirect to orders list or position details
        if (positionId) {
          router.push(`/trading/positions/${positionId}`);
        } else {
          router.push('/trading/orders');
        }
      },
    });
  };
  
  // Handle price refresh
  const handleRefreshPrice = () => {
    if (watchedSymbol) {
      fetchMarketPrice(watchedSymbol);
    } else {
      toast({
        title: 'Symbol required',
        description: 'Please enter a trading symbol first',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Order</CardTitle>
        <CardDescription>
          Submit a new trading order to the exchange
        </CardDescription>
      </CardHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            {/* Market Price Display */}
            {marketPrice && watchedSymbol && (
              <div className="bg-muted/40 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Current Market Price</h3>
                    <div className="flex items-center mt-1">
                      <span className="text-2xl font-bold">${marketPrice.toLocaleString()}</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="ml-2 h-8 w-8 p-0" 
                        onClick={handleRefreshPrice}
                      >
                        <TrendingUp className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Last updated: {new Date().toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <h3 className="text-sm font-medium text-muted-foreground">Estimated Total</h3>
                    <p className="text-2xl font-bold">${calculateTotal().toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {form.getValues('quantity') || 0} × ${form.getValues('price') || marketPrice || 0}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Buy/Sell Tabs */}
            <div>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      className={`flex items-center justify-center py-6 ${
                        watchedSide === 'buy'
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                      onClick={() => form.setValue('side', 'buy')}
                    >
                      <ArrowUp className={`h-6 w-6 mr-2 ${watchedSide === 'buy' ? 'text-white' : 'text-green-600'}`} />
                      <span className="text-lg font-medium">Buy</span>
                    </Button>
                    <Button
                      type="button"
                      className={`flex items-center justify-center py-6 ${
                        watchedSide === 'sell'
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                      onClick={() => form.setValue('side', 'sell')}
                    >
                      <ArrowDown className={`h-6 w-6 mr-2 ${watchedSide === 'sell' ? 'text-white' : 'text-red-600'}`} />
                      <span className="text-lg font-medium">Sell</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Type Selector */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Order Type</FormLabel>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <Button
                      type="button"
                      variant={field.value === 'market' ? 'default' : 'outline'}
                      className="justify-start"
                      onClick={() => {
                        field.onChange('market');
                        form.clearErrors('price');
                        form.clearErrors('stopPrice');
                      }}
                    >
                      <BarChart4 className="h-4 w-4 mr-2" />
                      Market
                    </Button>
                    <Button
                      type="button"
                      variant={field.value === 'limit' ? 'default' : 'outline'}
                      className="justify-start"
                      onClick={() => {
                        field.onChange('limit');
                        if (marketPrice) form.setValue('price', marketPrice);
                      }}
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      Limit
                    </Button>
                    <Button
                      type="button"
                      variant={field.value === 'stop' ? 'default' : 'outline'}
                      className="justify-start"
                      onClick={() => {
                        field.onChange('stop');
                        if (marketPrice) {
                          const stopPriceModifier = watchedSide === 'buy' ? 1.02 : 0.98;
                          form.setValue('stopPrice', parseFloat((marketPrice * stopPriceModifier).toFixed(2)));
                        }
                      }}
                    >
                      {watchedSide === 'buy' ? (
                        <ChevronsUp className="h-4 w-4 mr-2" />
                      ) : (
                        <ChevronsDown className="h-4 w-4 mr-2" />
                      )}
                      Stop
                    </Button>
                    <Button
                      type="button"
                      variant={field.value === 'stop_limit' ? 'default' : 'outline'}
                      className="justify-start"
                      onClick={() => {
                        field.onChange('stop_limit');
                        if (marketPrice) {
                          form.setValue('price', marketPrice);
                          const stopPriceModifier = watchedSide === 'buy' ? 1.02 : 0.98;
                          form.setValue('stopPrice', parseFloat((marketPrice * stopPriceModifier).toFixed(2)));
                        }
                      }}
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Stop Limit
                    </Button>
                  </div>
                  <FormDescription>
                    Choose the type of order you want to place
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Exchange Account */}
            <FormField
              control={form.control}
              name="exchangeAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Exchange Account</FormLabel>
                  <Select 
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={loadingAccounts}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={loadingAccounts ? "Loading accounts..." : "Select an exchange account"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {exchangeAccounts?.map(account => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} ({account.exchange})
                        </SelectItem>
                      ))}
                      {!loadingAccounts && (!exchangeAccounts || exchangeAccounts.length === 0) && (
                        <SelectItem value="none" disabled>
                          No exchange accounts found
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The exchange account to use for this order
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'basic' | 'advanced')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4 pt-4">
                {/* Symbol */}
                <FormField
                  control={form.control}
                  name="symbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Symbol</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="BTCUSDT" />
                      </FormControl>
                      <FormDescription>
                        Trading pair in exchange format (e.g., BTCUSDT)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Quantity */}
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="Amount to trade"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Amount of base asset to trade
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Price (for limit and stop_limit) */}
                {(watchedType === 'limit' || watchedType === 'stop_limit') && (
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            placeholder="Limit price"
                            {...field}
                            value={field.value === undefined ? '' : field.value}
                            onChange={(e) => {
                              const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          Price at which to execute the order
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                {/* Stop Price (for stop and stop_limit) */}
                {(watchedType === 'stop' || watchedType === 'stop_limit') && (
                  <FormField
                    control={form.control}
                    name="stopPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stop Price</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            placeholder="Trigger price"
                            {...field}
                            value={field.value === undefined ? '' : field.value}
                            onChange={(e) => {
                              const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          Price at which the order will be triggered
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </TabsContent>
              
              <TabsContent value="advanced" className="space-y-4 pt-4">
                {/* Time In Force */}
                <FormField
                  control={form.control}
                  name="timeInForce"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time In Force</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value as 'gtc' | 'ioc' | 'fok')}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select time in force" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="gtc">GTC - Good Till Cancelled</SelectItem>
                          <SelectItem value="ioc">IOC - Immediate Or Cancel</SelectItem>
                          <SelectItem value="fok">FOK - Fill Or Kill</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        How long the order will remain active
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Reduce Only Switch */}
                <FormField
                  control={form.control}
                  name="reduceOnly"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Reduce Only</FormLabel>
                        <FormDescription>
                          Order will only reduce your position, not increase it
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>
            
            {/* Error display */}
            {createOrder.isError && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 flex items-start">
                <AlertTriangle className="h-5 w-5 text-destructive mr-2 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Error</p>
                  <p className="text-sm text-destructive/90">
                    {createOrder.error instanceof Error 
                      ? createOrder.error.message 
                      : 'An unexpected error occurred. Please try again.'}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={createOrder.isPending}
            >
              Cancel
            </Button>
            
            <Button 
              type="submit" 
              disabled={createOrder.isPending}
              className={watchedSide === 'buy' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {createOrder.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {watchedSide === 'buy' ? 'Place Buy Order' : 'Place Sell Order'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
