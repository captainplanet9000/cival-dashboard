/**
 * Order Placement Component
 * 
 * Allows users to place orders on exchanges through a simple interface
 * Supports market and limit orders with various options
 */
"use client"

import { useState, useEffect } from 'react'
import { useOrders, OrderParams } from '@/hooks/use-exchange'
import { ExchangeType } from '@/services/exchange-service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, Info } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { cn } from '@/lib/utils'

// Schema for order form validation
const orderSchema = z.object({
  symbol: z.string().min(1, "Symbol is required"),
  side: z.enum(["Buy", "Sell"]),
  orderType: z.enum(["Market", "Limit"]),
  quantity: z.number().positive("Quantity must be positive"),
  price: z.number().positive("Price must be positive").optional(),
  timeInForce: z.enum(["GTC", "IOC", "FOK"]).optional(),
  reduceOnly: z.boolean().optional(),
})

interface OrderPlacementProps {
  exchange: ExchangeType
  symbols?: string[]
  defaultSymbol?: string
  farmId?: number
  className?: string
  onOrderPlaced?: (order: any) => void
}

export function OrderPlacement({
  exchange = 'bybit',
  symbols = [],
  defaultSymbol = 'BTCUSDT',
  farmId,
  className,
  onOrderPlaced,
}: OrderPlacementProps) {
  const [orderTab, setOrderTab] = useState('market')
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  
  // Get order functionality
  const { placeOrder, isLoading, error } = useOrders(exchange)
  
  // Set up form for placing orders
  const form = useForm<z.infer<typeof orderSchema>>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      symbol: defaultSymbol,
      side: 'Buy',
      orderType: 'Market',
      quantity: 0.01,
      timeInForce: 'GTC',
      reduceOnly: false,
    },
  })
  
  // Update form values when order type changes
  useEffect(() => {
    const orderType = orderTab === 'market' ? 'Market' : 'Limit'
    form.setValue('orderType', orderType)
  }, [orderTab, form])
  
  // Fetch current price for the selected symbol
  useEffect(() => {
    const fetchCurrentPrice = async () => {
      try {
        const symbol = form.getValues('symbol')
        const response = await fetch(`/api/market-data?type=ohlcv&symbol=${symbol}&limit=1`)
        
        if (response.ok) {
          const data = await response.json()
          if (data.data && data.data.length > 0) {
            setCurrentPrice(data.data[0].close)
            
            // Set default limit price if order type is limit
            if (form.getValues('orderType') === 'Limit' && !form.getValues('price')) {
              form.setValue('price', data.data[0].close)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching current price:', error)
      }
    }
    
    fetchCurrentPrice()
    
    // Refresh price every 10 seconds
    const intervalId = setInterval(fetchCurrentPrice, 10000)
    return () => clearInterval(intervalId)
  }, [form.getValues('symbol'), form])
  
  // Handle form submission
  const onSubmit = async (values: z.infer<typeof orderSchema>) => {
    // Create order params
    const orderParams: OrderParams = {
      exchange,
      symbol: values.symbol,
      side: values.side,
      orderType: values.orderType,
      quantity: values.quantity,
      price: values.orderType === 'Limit' ? values.price : undefined,
      timeInForce: values.timeInForce,
      reduceOnly: values.reduceOnly,
      farm_id: farmId,
    }
    
    // Place the order
    const result = await placeOrder(orderParams)
    
    // Notify parent component
    if (result && onOrderPlaced) {
      onOrderPlaced(result)
    }
  }
  
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>Place Order</CardTitle>
        <CardDescription>
          Create a new order on {exchange}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs value={orderTab} onValueChange={setOrderTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="market">Market</TabsTrigger>
            <TabsTrigger value="limit">Limit</TabsTrigger>
          </TabsList>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
              <FormField
                control={form.control}
                name="symbol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Symbol</FormLabel>
                    {symbols.length > 0 ? (
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a symbol" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {symbols.map(symbol => (
                            <SelectItem key={symbol} value={symbol}>
                              {symbol}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <FormControl>
                        <Input placeholder="BTCUSDT" {...field} />
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {currentPrice && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Current Price:</span>
                  <span className="font-medium">{currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</span>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="side"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Side</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select side" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Buy" className="text-green-600">Buy</SelectItem>
                          <SelectItem value="Sell" className="text-red-600">Sell</SelectItem>
                        </SelectContent>
                      </Select>
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
                        <Input
                          type="number"
                          step="0.001"
                          min="0.001"
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {orderTab === 'limit' && (
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value))}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {orderTab === 'limit' && (
                <FormField
                  control={form.control}
                  name="timeInForce"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time In Force</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select time in force" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="GTC">
                            <div className="flex flex-col">
                              <span>Good Till Cancelled (GTC)</span>
                              <span className="text-xs text-muted-foreground">Order remains active until filled or cancelled</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="IOC">
                            <div className="flex flex-col">
                              <span>Immediate or Cancel (IOC)</span>
                              <span className="text-xs text-muted-foreground">Fill immediately, cancel unfilled portion</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="FOK">
                            <div className="flex flex-col">
                              <span>Fill or Kill (FOK)</span>
                              <span className="text-xs text-muted-foreground">Fill entirely immediately or cancel entirely</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <FormField
                control={form.control}
                name="reduceOnly"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <div className="flex items-center">
                        <FormLabel className="mr-2">Reduce Only</FormLabel>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm">
                              When enabled, this order will only reduce your position, not increase it or flip sides.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <FormDescription>
                        Only reduce position size, never increase.
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
              
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="pt-2">
                <Button
                  type="submit"
                  className={cn(
                    "w-full font-bold",
                    form.watch('side') === 'Buy' ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                  )}
                  disabled={isLoading}
                >
                  {isLoading ? 'Submitting...' : `${form.watch('side')} ${form.watch('symbol')}`}
                </Button>
              </div>
            </form>
          </Form>
        </Tabs>
      </CardContent>
    </Card>
  )
}
