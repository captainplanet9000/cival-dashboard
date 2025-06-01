/**
 * Trading Strategy Form
 * 
 * Form for creating and editing trading strategies
 */
"use client"

import { useState, useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useExchangeSymbols } from '@/hooks/use-exchange'
import { useStrategyParameters } from '@/hooks/use-trading-strategy'
import { StrategyConfig, StrategyType } from '@/services/trading-strategy-service'
import { ExchangeType } from '@/services/exchange-service'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AlertCircle, Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// Define form schema
const strategyFormSchema = z.object({
  name: z.string().min(3, 'Strategy name must be at least 3 characters'),
  description: z.string().optional(),
  strategyType: z.enum([
    'trend_following',
    'mean_reversion',
    'breakout',
    'grid_trading',
    'scalping',
    'arbitrage',
    'custom'
  ]),
  exchange: z.string().min(1, 'Exchange is required'),
  symbol: z.string().min(1, 'Symbol is required'),
  timeframe: z.string().min(1, 'Timeframe is required'),
  parameters: z.record(z.any()),
  isActive: z.boolean().default(false),
  maxDrawdown: z.number().min(0).max(100).optional(),
  maxPositionSize: z.number().min(0).optional(),
  stopLoss: z.number().min(0).max(100).optional(),
  takeProfit: z.number().min(0).max(1000).optional(),
});

// Form properties
interface StrategyFormProps {
  farmId: number
  strategy?: StrategyConfig
  onSubmit: (values: Omit<StrategyConfig, 'id'>) => void
  onCancel: () => void
}

export function StrategyForm({ farmId, strategy, onSubmit, onCancel }: StrategyFormProps) {
  const [strategyType, setStrategyType] = useState<StrategyType>(
    strategy?.strategyType || 'trend_following'
  );
  const [exchange, setExchange] = useState<ExchangeType>(
    (strategy?.exchange as ExchangeType) || 'bybit'
  );
  
  // Get exchange symbols
  const { symbols, isLoading: isLoadingSymbols } = useExchangeSymbols(exchange);
  
  // Get default parameters based on strategy type
  const { defaultParameters, parameterDescriptions } = useStrategyParameters(strategyType);
  
  // Setup form with default values
  const form = useForm<z.infer<typeof strategyFormSchema>>({
    resolver: zodResolver(strategyFormSchema),
    defaultValues: {
      name: strategy?.name || '',
      description: strategy?.description || '',
      strategyType: strategy?.strategyType || 'trend_following',
      exchange: strategy?.exchange || 'bybit',
      symbol: strategy?.symbol || (symbols.length > 0 ? symbols[0] : 'BTCUSDT'),
      timeframe: strategy?.timeframe || '1h',
      parameters: strategy?.parameters || defaultParameters,
      isActive: strategy?.isActive || false,
      maxDrawdown: strategy?.maxDrawdown || 10,
      maxPositionSize: strategy?.maxPositionSize || 0.01,
      stopLoss: strategy?.stopLoss || 5,
      takeProfit: strategy?.takeProfit || 10,
    },
  });
  
  // Update form when strategy type changes
  useEffect(() => {
    const currentParams = form.getValues('parameters');
    
    // Merge current parameters with default parameters to preserve custom values
    const mergedParams = {
      ...defaultParameters,
      ...currentParams,
    };
    
    form.setValue('parameters', mergedParams);
  }, [strategyType, form, defaultParameters]);
  
  // Update available symbols when exchange changes
  useEffect(() => {
    if (symbols.length > 0 && !symbols.includes(form.getValues('symbol'))) {
      form.setValue('symbol', symbols[0]);
    }
  }, [symbols, form]);
  
  // Handle form submission
  const handleSubmit = (values: z.infer<typeof strategyFormSchema>) => {
    onSubmit({
      farmId,
      ...values,
    });
  };
  
  return (
    <div className="space-y-4 py-2 pb-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Strategy Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Trading Strategy" {...field} />
                  </FormControl>
                  <FormDescription>
                    A descriptive name for your trading strategy
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="strategyType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Strategy Type</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      setStrategyType(value as StrategyType);
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a strategy type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="trend_following">Trend Following</SelectItem>
                      <SelectItem value="mean_reversion">Mean Reversion</SelectItem>
                      <SelectItem value="breakout">Breakout</SelectItem>
                      <SelectItem value="grid_trading">Grid Trading</SelectItem>
                      <SelectItem value="scalping">Scalping</SelectItem>
                      <SelectItem value="arbitrage">Arbitrage</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The type of trading strategy to implement
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe your trading strategy..."
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Optional description for your strategy
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Separator />
          
          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="exchange"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Exchange</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      setExchange(value as ExchangeType);
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an exchange" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="bybit">Bybit</SelectItem>
                      <SelectItem value="coinbase">Coinbase</SelectItem>
                      <SelectItem value="hyperliquid">Hyperliquid</SelectItem>
                      <SelectItem value="mock">Mock (Testing)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The exchange to trade on
                  </FormDescription>
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
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoadingSymbols}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a trading pair" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <ScrollArea className="h-80">
                        {symbols.map((symbol) => (
                          <SelectItem key={symbol} value={symbol}>
                            {symbol}
                          </SelectItem>
                        ))}
                        {symbols.length === 0 && (
                          <SelectItem value="BTCUSDT">BTCUSDT</SelectItem>
                        )}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The trading pair to monitor and trade
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="timeframe"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timeframe</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a timeframe" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1m">1 Minute</SelectItem>
                      <SelectItem value="5m">5 Minutes</SelectItem>
                      <SelectItem value="15m">15 Minutes</SelectItem>
                      <SelectItem value="30m">30 Minutes</SelectItem>
                      <SelectItem value="1h">1 Hour</SelectItem>
                      <SelectItem value="4h">4 Hours</SelectItem>
                      <SelectItem value="1d">1 Day</SelectItem>
                      <SelectItem value="1w">1 Week</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The chart timeframe for strategy analysis
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <Separator />
          
          <h3 className="text-lg font-medium">Risk Management</h3>
          
          <div className="grid grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="maxDrawdown"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center">
                    <FormLabel>Max Drawdown (%)</FormLabel>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground ml-2" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          The maximum allowed drawdown before the strategy stops trading. A drawdown is a peak-to-trough decline in your account balance.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex items-center space-x-4">
                    <FormControl>
                      <Slider
                        value={[field.value || 10]}
                        min={1}
                        max={50}
                        step={1}
                        onValueChange={(values) => field.onChange(values[0])}
                      />
                    </FormControl>
                    <Input
                      type="number"
                      value={field.value || 10}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      className="w-20"
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="maxPositionSize"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center">
                    <FormLabel>Max Position Size</FormLabel>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground ml-2" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          The maximum size for any single position. This is used to limit your exposure to any single trade.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.001"
                      min="0.001"
                      placeholder="0.01"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="stopLoss"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center">
                    <FormLabel>Stop Loss (%)</FormLabel>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground ml-2" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          The percentage below entry price where a stop loss order will be placed to limit losses.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex items-center space-x-4">
                    <FormControl>
                      <Slider
                        value={[field.value || 5]}
                        min={0.5}
                        max={20}
                        step={0.5}
                        onValueChange={(values) => field.onChange(values[0])}
                      />
                    </FormControl>
                    <Input
                      type="number"
                      value={field.value || 5}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      className="w-20"
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="takeProfit"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center">
                    <FormLabel>Take Profit (%)</FormLabel>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground ml-2" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          The percentage above entry price where a take profit order will be placed to secure profits.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex items-center space-x-4">
                    <FormControl>
                      <Slider
                        value={[field.value || 10]}
                        min={1}
                        max={50}
                        step={1}
                        onValueChange={(values) => field.onChange(values[0])}
                      />
                    </FormControl>
                    <Input
                      type="number"
                      value={field.value || 10}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      className="w-20"
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <Separator />
          
          <h3 className="text-lg font-medium">Strategy Parameters</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Configure specific parameters for your selected strategy type
          </p>
          
          <Card>
            <CardContent className="pt-6 pb-4">
              <StrategyParameters 
                form={form} 
                strategyType={strategyType}
                parameters={defaultParameters}
                descriptions={parameterDescriptions}
              />
            </CardContent>
          </Card>
          
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Activate Strategy</FormLabel>
                  <FormDescription>
                    Start this strategy immediately after creation
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          
          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">
              {strategy ? 'Update Strategy' : 'Create Strategy'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

// Dynamic strategy parameters component
function StrategyParameters({ 
  form, 
  strategyType,
  parameters,
  descriptions
}: { 
  form: any
  strategyType: StrategyType
  parameters: Record<string, any>
  descriptions: Record<string, string>
}) {
  // Different parameter fields based on strategy type
  return (
    <Accordion type="multiple" defaultValue={Object.keys(parameters)} className="w-full">
      {Object.entries(parameters).map(([key, value]) => (
        <AccordionItem key={key} value={key}>
          <AccordionTrigger className="text-sm font-medium capitalize">
            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
          </AccordionTrigger>
          <AccordionContent>
            <div className="py-2">
              {typeof value === 'number' && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {descriptions[key] || `Configure ${key} parameter`}
                  </p>
                  
                  <div className="flex items-center space-x-4 pt-2">
                    {key.includes('Period') || key === 'lookbackPeriod' || key === 'gridLevels' ? (
                      <>
                        <Slider
                          value={[form.getValues(`parameters.${key}`) || value]}
                          min={1}
                          max={50}
                          step={1}
                          onValueChange={(values) => {
                            form.setValue(`parameters.${key}`, values[0]);
                          }}
                          className="flex-grow"
                        />
                        <Input
                          type="number"
                          value={form.getValues(`parameters.${key}`) || value}
                          onChange={(e) => {
                            form.setValue(`parameters.${key}`, Number(e.target.value));
                          }}
                          className="w-20"
                        />
                      </>
                    ) : (
                      <Input
                        type="number"
                        step="0.001"
                        value={form.getValues(`parameters.${key}`) || value}
                        onChange={(e) => {
                          form.setValue(`parameters.${key}`, Number(e.target.value));
                        }}
                        className="w-full"
                      />
                    )}
                  </div>
                </div>
              )}
              
              {typeof value === 'boolean' && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {descriptions[key] || `Configure ${key} parameter`}
                  </p>
                  
                  <Switch
                    checked={form.getValues(`parameters.${key}`) || false}
                    onCheckedChange={(checked) => {
                      form.setValue(`parameters.${key}`, checked);
                    }}
                  />
                </div>
              )}
              
              {Array.isArray(value) && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {descriptions[key] || `Configure ${key} parameter`}
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    {value.map((item, index) => (
                      <div key={index} className="flex items-center">
                        <Input
                          value={form.getValues(`parameters.${key}`)?.[index] || item}
                          onChange={(e) => {
                            const currentArray = [...(form.getValues(`parameters.${key}`) || value)];
                            currentArray[index] = e.target.value;
                            form.setValue(`parameters.${key}`, currentArray);
                          }}
                          className="w-32"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
