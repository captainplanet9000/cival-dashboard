import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StrategyConfig } from '@/utils/trading/decision-engine';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { createBrowserClient } from '@/utils/supabase/client';

// Define the form schema
const formSchema = z.object({
  name: z.string().min(3, 'Strategy name must be at least 3 characters'),
  description: z.string().optional(),
  type: z.enum(['trend_following', 'mean_reversion', 'breakout', 'custom']),
  exchange: z.string().min(1, 'Exchange is required'),
  symbols: z.array(z.string()).min(1, 'At least one symbol is required'),
  timeframes: z.array(z.string()).min(1, 'At least one timeframe is required'),
  enabled: z.boolean().default(true),
  // Parameters will depend on the strategy type
  parameters: z.record(z.any()),
  positionSizing: z.enum(['fixed', 'percentage', 'risk_based']),
  positionSizingValue: z.number().min(0.1),
  maxPositions: z.number().int().min(1),
  buyThreshold: z.number().min(0).max(100),
  sellThreshold: z.number().min(0).max(100),
});

export type StrategyFormValues = z.infer<typeof formSchema>;

interface StrategyFormDialogProps {
  strategy: StrategyConfig | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (strategy: StrategyConfig) => void;
}

export function StrategyFormDialog({
  strategy,
  open,
  onOpenChange,
  onSave,
}: StrategyFormDialogProps) {
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
  const [symbolInput, setSymbolInput] = useState('');
  const [activeTab, setActiveTab] = useState('general');
  const supabase = createBrowserClient();

  // Set up form
  const form = useForm<StrategyFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: strategy?.name || '',
      description: strategy?.description || '',
      type: (strategy?.type as any) || 'trend_following',
      exchange: strategy?.exchange || 'binance',
      symbols: strategy?.symbols || [],
      timeframes: strategy?.timeframes || ['1h'],
      enabled: strategy?.enabled ?? true,
      parameters: strategy?.parameters || {},
      positionSizing: (strategy?.position?.sizing as any) || 'percentage',
      positionSizingValue: strategy?.position?.sizingValue || 5,
      maxPositions: strategy?.position?.maxPositions || 10,
      buyThreshold: strategy?.signalThresholds?.buy || 70,
      sellThreshold: strategy?.signalThresholds?.sell || 30,
    },
  });

  // Fetch available symbols
  const fetchSymbols = async (exchange: string) => {
    try {
      // For demo, we'll use a predefined list
      // In a real app, this would fetch from your market data API
      if (exchange === 'binance') {
        setAvailableSymbols([
          'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT',
          'ADA/USDT', 'DOGE/USDT', 'MATIC/USDT', 'LINK/USDT',
          'DOT/USDT', 'AVAX/USDT', 'UNI/USDT', 'SHIB/USDT'
        ]);
      } else if (exchange === 'coinbase') {
        setAvailableSymbols([
          'BTC/USD', 'ETH/USD', 'SOL/USD', 'XRP/USD',
          'ADA/USD', 'DOGE/USD', 'MATIC/USD', 'LINK/USD'
        ]);
      } else {
        setAvailableSymbols([]);
      }
    } catch (error) {
      console.error('Error fetching symbols:', error);
    }
  };

  // Add symbol to the list
  const addSymbol = () => {
    if (!symbolInput.trim()) return;
    
    const currentSymbols = form.getValues('symbols');
    if (!currentSymbols.includes(symbolInput)) {
      form.setValue('symbols', [...currentSymbols, symbolInput]);
    }
    setSymbolInput('');
  };

  // Remove symbol from the list
  const removeSymbol = (symbol: string) => {
    const currentSymbols = form.getValues('symbols');
    form.setValue('symbols', currentSymbols.filter(s => s !== symbol));
  };

  // Handle form submission
  const onSubmit = (values: StrategyFormValues) => {
    // Convert form values to StrategyConfig
    const strategyConfig: StrategyConfig = {
      id: strategy?.id || '', // Will be empty for new strategies
      name: values.name,
      description: values.description,
      type: values.type,
      symbols: values.symbols,
      exchange: values.exchange,
      parameters: values.parameters,
      timeframes: values.timeframes,
      indicators: strategy?.indicators || [],
      signalThresholds: {
        buy: values.buyThreshold,
        sell: values.sellThreshold
      },
      position: {
        sizing: values.positionSizing,
        sizingValue: values.positionSizingValue,
        maxPositions: values.maxPositions
      },
      enabled: values.enabled
    };
    
    onSave(strategyConfig);
  };

  // Update available symbols when exchange changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'exchange') {
        fetchSymbols(value.exchange as string);
      }
    });
    
    // Fetch initial symbols
    fetchSymbols(form.getValues('exchange'));
    
    return () => subscription.unsubscribe();
  }, [form, form.watch]);

  // Define parameter fields based on strategy type
  const renderParameterFields = () => {
    const strategyType = form.watch('type');
    
    switch (strategyType) {
      case 'trend_following':
        return (
          <>
            <FormField
              control={form.control}
              name="parameters.shortPeriod"
              defaultValue={strategy?.parameters?.shortPeriod || 9}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Short MA Period</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                  </FormControl>
                  <FormDescription>
                    Number of periods for the short moving average
                  </FormDescription>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="parameters.longPeriod"
              defaultValue={strategy?.parameters?.longPeriod || 21}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Long MA Period</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                  </FormControl>
                  <FormDescription>
                    Number of periods for the long moving average
                  </FormDescription>
                </FormItem>
              )}
            />
          </>
        );
        
      case 'mean_reversion':
        return (
          <>
            <FormField
              control={form.control}
              name="parameters.period"
              defaultValue={strategy?.parameters?.period || 14}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RSI Period</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                  </FormControl>
                  <FormDescription>
                    Number of periods for RSI calculation
                  </FormDescription>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="parameters.oversold"
              defaultValue={strategy?.parameters?.oversold || 30}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Oversold Threshold</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                  </FormControl>
                  <FormDescription>
                    RSI level to consider market oversold (buy signal)
                  </FormDescription>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="parameters.overbought"
              defaultValue={strategy?.parameters?.overbought || 70}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Overbought Threshold</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                  </FormControl>
                  <FormDescription>
                    RSI level to consider market overbought (sell signal)
                  </FormDescription>
                </FormItem>
              )}
            />
          </>
        );
        
      case 'breakout':
        return (
          <>
            <FormField
              control={form.control}
              name="parameters.lookbackPeriod"
              defaultValue={strategy?.parameters?.lookbackPeriod || 20}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lookback Period</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                  </FormControl>
                  <FormDescription>
                    Number of periods to find support/resistance
                  </FormDescription>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="parameters.volumeThreshold"
              defaultValue={strategy?.parameters?.volumeThreshold || 1.5}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Volume Threshold</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.1" 
                      {...field} 
                      onChange={e => field.onChange(Number(e.target.value))} 
                    />
                  </FormControl>
                  <FormDescription>
                    Volume multiple required for breakout confirmation
                  </FormDescription>
                </FormItem>
              )}
            />
          </>
        );
        
      case 'custom':
        return (
          <FormItem>
            <FormLabel>Custom Parameters</FormLabel>
            <FormDescription className="mt-2 mb-4">
              Custom strategies can be configured with custom parameters. Add them in the strategy code.
            </FormDescription>
          </FormItem>
        );
        
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{strategy ? 'Edit Strategy' : 'Create Strategy'}</DialogTitle>
          <DialogDescription>
            Configure your trading strategy parameters and settings.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs 
              defaultValue="general" 
              value={activeTab} 
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="parameters">Parameters</TabsTrigger>
                <TabsTrigger value="symbols">Symbols</TabsTrigger>
                <TabsTrigger value="position">Position</TabsTrigger>
              </TabsList>
              
              {/* General Tab */}
              <TabsContent value="general" className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Strategy Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My Trading Strategy" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your strategy..." 
                          {...field} 
                          className="resize-none h-20"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Strategy Type</FormLabel>
                      <FormControl>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a strategy type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="trend_following">Trend Following</SelectItem>
                            <SelectItem value="mean_reversion">Mean Reversion</SelectItem>
                            <SelectItem value="breakout">Breakout</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormDescription>
                        The type of strategy determines the indicators and parameters
                      </FormDescription>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="exchange"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exchange</FormLabel>
                      <FormControl>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select an exchange" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="binance">Binance</SelectItem>
                            <SelectItem value="coinbase">Coinbase</SelectItem>
                            <SelectItem value="kraken">Kraken</SelectItem>
                            <SelectItem value="kucoin">KuCoin</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="timeframes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Timeframes</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={(value) => {
                            const currentTimeframes = field.value;
                            if (!currentTimeframes.includes(value)) {
                              field.onChange([...currentTimeframes, value]);
                            }
                          }}
                          value={field.value[0]}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Add a timeframe" />
                          </SelectTrigger>
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
                      </FormControl>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {field.value.map((timeframe) => (
                          <Badge key={timeframe} variant="secondary">
                            {timeframe}
                            <button
                              type="button"
                              className="ml-1 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                field.onChange(field.value.filter((t) => t !== timeframe));
                              }}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Enabled</FormLabel>
                        <FormDescription>
                          Activate this strategy for trading
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
              </TabsContent>
              
              {/* Parameters Tab */}
              <TabsContent value="parameters" className="space-y-4 pt-4">
                {renderParameterFields()}
                
                <div className="space-y-4 border-t pt-4">
                  <FormField
                    control={form.control}
                    name="buyThreshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Buy Signal Threshold ({field.value})</FormLabel>
                        <FormControl>
                          <Slider
                            value={[field.value]}
                            min={0}
                            max={100}
                            step={1}
                            onValueChange={(value) => field.onChange(value[0])}
                          />
                        </FormControl>
                        <FormDescription>
                          Minimum confidence required for buy signals
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="sellThreshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sell Signal Threshold ({field.value})</FormLabel>
                        <FormControl>
                          <Slider
                            value={[field.value]}
                            min={0}
                            max={100}
                            step={1}
                            onValueChange={(value) => field.onChange(value[0])}
                          />
                        </FormControl>
                        <FormDescription>
                          Minimum confidence required for sell signals
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
              
              {/* Symbols Tab */}
              <TabsContent value="symbols" className="space-y-4 pt-4">
                <div className="flex space-x-2">
                  <div className="flex-1">
                    <Select
                      onValueChange={(value) => setSymbolInput(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a symbol" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSymbols.map((symbol) => (
                          <SelectItem key={symbol} value={symbol}>{symbol}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="button" onClick={addSymbol}>Add</Button>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-4">
                  {form.watch('symbols').map((symbol) => (
                    <Badge key={symbol} variant="secondary" className="text-sm py-1">
                      {symbol}
                      <button
                        type="button"
                        className="ml-2 text-muted-foreground hover:text-foreground"
                        onClick={() => removeSymbol(symbol)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
                
                {form.watch('symbols').length === 0 && (
                  <p className="text-sm text-muted-foreground">No symbols selected</p>
                )}
                
                <FormField
                  control={form.control}
                  name="symbols"
                  render={() => (
                    <FormItem>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              {/* Position Tab */}
              <TabsContent value="position" className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="positionSizing"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Position Sizing Method</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="fixed" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Fixed Size
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="percentage" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Percentage of Portfolio
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="risk_based" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Risk-Based Sizing
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="positionSizingValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {form.watch('positionSizing') === 'fixed' && 'Fixed Size (Units)'}
                        {form.watch('positionSizing') === 'percentage' && 'Portfolio Percentage (%)'}
                        {form.watch('positionSizing') === 'risk_based' && 'Risk Per Trade (%)'}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1" 
                          {...field} 
                          onChange={e => field.onChange(Number(e.target.value))} 
                        />
                      </FormControl>
                      <FormDescription>
                        {form.watch('positionSizing') === 'fixed' && 'Number of units to trade'}
                        {form.watch('positionSizing') === 'percentage' && 'Percentage of portfolio to allocate per trade'}
                        {form.watch('positionSizing') === 'risk_based' && 'Percentage of portfolio to risk per trade'}
                      </FormDescription>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="maxPositions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Open Positions</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={e => field.onChange(Number(e.target.value))} 
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum number of open positions allowed for this strategy
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>
            
            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {strategy ? 'Update Strategy' : 'Create Strategy'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
