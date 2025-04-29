import { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ArrowUpCircle, ArrowDownCircle, RefreshCw } from "lucide-react";
import { useOrders, useMarketData } from '@/hooks/use-trading';
import { OrderSide, OrderType, TimeInForce, MarketData } from '@/types/trading';

// Define a schema for order form validation
const orderFormSchema = z.object({
  exchange: z.string().min(1, { message: "Exchange is required" }),
  symbol: z.string().min(1, { message: "Symbol is required" }),
  side: z.nativeEnum(OrderSide),
  type: z.nativeEnum(OrderType),
  quantity: z.string().min(1, { message: "Quantity is required" })
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Quantity must be a positive number",
    }),
  price: z.string()
    .refine((val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) > 0), {
      message: "Price must be a positive number",
    })
    .optional()
    .or(z.literal('')),
  timeInForce: z.nativeEnum(TimeInForce).optional(),
});

type OrderFormValues = z.infer<typeof orderFormSchema>;

interface LiveTradingPanelProps {
  defaultExchange?: string;
  defaultSymbol?: string;
}

export function LiveTradingPanel({ 
  defaultExchange = 'binance', 
  defaultSymbol = 'BTC/USDT' 
}: LiveTradingPanelProps) {
  const { createOrder, isLoading: isOrderLoading } = useOrders();
  const { getMarketData, isLoading: isMarketDataLoading } = useMarketData();
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Define form with default values
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      exchange: defaultExchange,
      symbol: defaultSymbol,
      side: OrderSide.Buy,
      type: OrderType.Market,
      quantity: "",
      price: "",
      timeInForce: TimeInForce.GTC,
    },
  });

  // Monitor selected order type to show/hide price field
  const selectedOrderType = form.watch("type");
  const isPriceRequired = selectedOrderType === OrderType.Limit || 
                         selectedOrderType === OrderType.StopLimit;

  // Fetch market data when exchange or symbol changes
  useEffect(() => {
    const fetchMarketData = async () => {
      const exchange = form.getValues("exchange");
      const symbol = form.getValues("symbol");
      
      if (exchange && symbol) {
        const data = await getMarketData(exchange, symbol);
        if (data) {
          setMarketData(data);
        }
      }
    };

    fetchMarketData();
    
    // Set up interval to refresh market data every 10 seconds
    const interval = setInterval(fetchMarketData, 10000);
    
    return () => clearInterval(interval);
  }, [form.getValues("exchange"), form.getValues("symbol"), getMarketData]);

  // Handle manual refresh of market data
  const handleRefreshMarketData = async () => {
    setIsRefreshing(true);
    const exchange = form.getValues("exchange");
    const symbol = form.getValues("symbol");
    
    if (exchange && symbol) {
      const data = await getMarketData(exchange, symbol);
      if (data) {
        setMarketData(data);
      }
    }
    setIsRefreshing(false);
  };

  // Handle form submission
  const onSubmit = async (values: OrderFormValues) => {
    // Convert string values to numbers
    const quantity = parseFloat(values.quantity);
    const price = values.price ? parseFloat(values.price) : undefined;
    
    // Create order request
    const orderRequest = {
      exchange: values.exchange,
      symbol: values.symbol,
      side: values.side,
      type: values.type,
      quantity,
      price,
      time_in_force: values.timeInForce,
    };
    
    // Call API to create order
    const response = await createOrder(orderRequest);
    
    // If order placed successfully, reset form
    if (response) {
      // Reset quantity and price but keep other values
      form.reset({
        ...values,
        quantity: "",
        price: "",
      });
    }
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Live Trading</span>
          
          {/* Market data display */}
          {marketData && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg">
                {marketData.price.toLocaleString(undefined, { 
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 8
                })}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefreshMarketData}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          )}
        </CardTitle>
        <CardDescription>
          Place live orders on supported exchanges
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="market" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="market">Market</TabsTrigger>
            <TabsTrigger value="limit">Limit</TabsTrigger>
          </TabsList>
          
          <TabsContent value="market">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="exchange"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Exchange</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleRefreshMarketData();
                          }} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select exchange" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="binance">Binance</SelectItem>
                            <SelectItem value="coinbase">Coinbase</SelectItem>
                            <SelectItem value="kraken">Kraken</SelectItem>
                            <SelectItem value="kucoin">KuCoin</SelectItem>
                            <SelectItem value="bybit">Bybit</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="symbol"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Symbol</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="BTC/USDT" 
                            onBlur={() => handleRefreshMarketData()}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="side"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Order Side</FormLabel>
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          type="button" 
                          className={`w-full ${field.value === OrderSide.Buy ? 'bg-green-600 hover:bg-green-700' : 'bg-secondary hover:bg-secondary/80'}`}
                          onClick={() => field.onChange(OrderSide.Buy)}
                        >
                          <ArrowUpCircle className="mr-2 h-4 w-4" />
                          Buy
                        </Button>
                        <Button 
                          type="button" 
                          className={`w-full ${field.value === OrderSide.Sell ? 'bg-red-600 hover:bg-red-700' : 'bg-secondary hover:bg-secondary/80'}`}
                          onClick={() => field.onChange(OrderSide.Sell)}
                        >
                          <ArrowDownCircle className="mr-2 h-4 w-4" />
                          Sell
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Order Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select order type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={OrderType.Market}>Market</SelectItem>
                          <SelectItem value={OrderType.Limit}>Limit</SelectItem>
                          <SelectItem value={OrderType.Stop}>Stop</SelectItem>
                          <SelectItem value={OrderType.StopLimit}>Stop Limit</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {isPriceRequired && (
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="any" placeholder="0.00" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="any" placeholder="0.00" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isOrderLoading}
                >
                  {isOrderLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Placing Order...
                    </>
                  ) : (
                    <>Place Order</>
                  )}
                </Button>
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="limit">
            {/* Limit order form - same as above but with different defaults */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="exchange"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Exchange</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleRefreshMarketData();
                          }} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select exchange" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="binance">Binance</SelectItem>
                            <SelectItem value="coinbase">Coinbase</SelectItem>
                            <SelectItem value="kraken">Kraken</SelectItem>
                            <SelectItem value="kucoin">KuCoin</SelectItem>
                            <SelectItem value="bybit">Bybit</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="symbol"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Symbol</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="BTC/USDT" 
                            onBlur={() => handleRefreshMarketData()}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="side"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Order Side</FormLabel>
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          type="button" 
                          className={`w-full ${field.value === OrderSide.Buy ? 'bg-green-600 hover:bg-green-700' : 'bg-secondary hover:bg-secondary/80'}`}
                          onClick={() => field.onChange(OrderSide.Buy)}
                        >
                          <ArrowUpCircle className="mr-2 h-4 w-4" />
                          Buy
                        </Button>
                        <Button 
                          type="button" 
                          className={`w-full ${field.value === OrderSide.Sell ? 'bg-red-600 hover:bg-red-700' : 'bg-secondary hover:bg-secondary/80'}`}
                          onClick={() => field.onChange(OrderSide.Sell)}
                        >
                          <ArrowDownCircle className="mr-2 h-4 w-4" />
                          Sell
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Order Type</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          // If changing to market, clear price
                          if (value === OrderType.Market) {
                            form.setValue('price', '');
                          } else if (marketData && !form.getValues('price')) {
                            // If changing to limit and price is empty, set current price
                            form.setValue('price', marketData.price.toString());
                          }
                        }} 
                        defaultValue={OrderType.Limit}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select order type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={OrderType.Market}>Market</SelectItem>
                          <SelectItem value={OrderType.Limit}>Limit</SelectItem>
                          <SelectItem value={OrderType.Stop}>Stop</SelectItem>
                          <SelectItem value={OrderType.StopLimit}>Stop Limit</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="any" placeholder="0.00" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="any" placeholder="0.00" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="timeInForce"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time In Force</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select time in force" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={TimeInForce.GTC}>Good Till Cancelled</SelectItem>
                          <SelectItem value={TimeInForce.IOC}>Immediate or Cancel</SelectItem>
                          <SelectItem value={TimeInForce.FOK}>Fill or Kill</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isOrderLoading}
                >
                  {isOrderLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Placing Order...
                    </>
                  ) : (
                    <>Place Order</>
                  )}
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="text-sm text-muted-foreground">
        <p>Trading directly impacts your exchange balance. Always verify orders before submission.</p>
      </CardFooter>
    </Card>
  );
}
