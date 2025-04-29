"use client";

import { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, RefreshCw, PlayCircle, LineChart, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { cn } from '@/lib/utils';
import { BacktestParameters, Strategy, TimeframeUnit } from '@/types/backtesting';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Validation schema for backtest form
const backtestFormSchema = z.object({
  name: z.string().min(3, { message: "Backtest name must be at least 3 characters." }),
  description: z.string().optional(),
  strategy_id: z.string().min(1, { message: "A strategy must be selected." }),
  exchange: z.string().min(1, { message: "Exchange is required." }),
  symbol: z.string().min(1, { message: "Trading pair is required." }),
  start_date: z.date({
    required_error: "Start date is required.",
  }),
  end_date: z.date({
    required_error: "End date is required.",
  }).refine((date) => date > new Date("2020-01-01"), {
    message: "End date must be after January 1, 2020.",
  }),
  timeframe_value: z.coerce.number().min(1),
  timeframe_unit: z.nativeEnum(TimeframeUnit),
  initial_capital: z.coerce.number().min(100, { message: "Initial capital must be at least 100." }),
  leverage: z.coerce.number().min(1).max(10, { message: "Leverage must be between 1 and 10." }),
});

type BacktestFormValues = z.infer<typeof backtestFormSchema>;

interface BacktestRunnerProps {
  strategy?: Strategy;
  strategies?: Strategy[];
  onBacktestStart?: (params: BacktestParameters) => void;
  onBacktestComplete?: (resultId: string) => void;
}

export function BacktestRunner({ strategy, strategies = [], onBacktestStart, onBacktestComplete }: BacktestRunnerProps) {
  const { toast } = useToast();
  const supabase = createClientComponentClient();
  const [isLoading, setIsLoading] = useState(false);
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
  const [availableExchanges, setAvailableExchanges] = useState<string[]>(['binance', 'coinbase', 'kucoin']);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Initialize form with default values
  const form = useForm<BacktestFormValues>({
    resolver: zodResolver(backtestFormSchema),
    defaultValues: {
      name: strategy ? `${strategy.name} Backtest` : "New Backtest",
      description: "",
      strategy_id: strategy?.id || "",
      exchange: "binance",
      symbol: "BTC/USDT",
      start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      end_date: new Date(),
      timeframe_value: 1,
      timeframe_unit: TimeframeUnit.DAY,
      initial_capital: 10000,
      leverage: 1,
    }
  });

  // Fetch available symbols when exchange changes
  useEffect(() => {
    const fetchSymbols = async () => {
      try {
        const exchange = form.watch('exchange');
        if (!exchange) return;

        // In a real app, fetch from API
        // For demo, use a predefined list
        const predefinedSymbols = {
          'binance': ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'ADA/USDT', 'BNB/USDT'],
          'coinbase': ['BTC/USD', 'ETH/USD', 'LINK/USD', 'SOL/USD', 'AVAX/USD'],
          'kucoin': ['BTC/USDT', 'ETH/USDT', 'KCS/USDT', 'DOT/USDT', 'ADA/USDT'],
        };

        setAvailableSymbols(predefinedSymbols[exchange as keyof typeof predefinedSymbols] || []);
      } catch (error) {
        console.error("Error fetching symbols:", error);
      }
    };

    fetchSymbols();
  }, [form.watch('exchange')]);

  // Validate date range and show warnings
  useEffect(() => {
    const startDate = form.watch('start_date');
    const endDate = form.watch('end_date');
    const timeframeValue = form.watch('timeframe_value');
    const timeframeUnit = form.watch('timeframe_unit');
    
    const warnings = [];

    // Check date range
    if (startDate && endDate) {
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 365) {
        warnings.push("Backtesting over periods longer than 1 year may take significant time to process.");
      }
      
      // Check timeframe granularity
      if (timeframeUnit === TimeframeUnit.MINUTE && diffDays > 30) {
        warnings.push("Using minute-level data over periods longer than 30 days may impact performance.");
      }
    }

    setWarnings(warnings);
  }, [
    form.watch('start_date'), 
    form.watch('end_date'), 
    form.watch('timeframe_value'), 
    form.watch('timeframe_unit')
  ]);

  // Handle form submission
  const onSubmit = async (values: BacktestFormValues) => {
    setIsLoading(true);
    try {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("You must be logged in to run a backtest");
      }

      // Construct backtest parameters
      const backtestParams: BacktestParameters = {
        user_id: session.user.id,
        name: values.name,
        description: values.description,
        strategy_type: strategies.find(s => s.id === values.strategy_id)?.type || strategy?.type,
        exchange: values.exchange,
        symbol: values.symbol,
        start_date: values.start_date.toISOString(),
        end_date: values.end_date.toISOString(),
        timeframe: {
          value: values.timeframe_value,
          unit: values.timeframe_unit
        },
        initial_capital: values.initial_capital,
        parameters: {
          ...strategies.find(s => s.id === values.strategy_id)?.parameters || strategy?.parameters || {},
          leverage: values.leverage
        }
      };

      // In a real app, we would send this to an API
      if (onBacktestStart) {
        onBacktestStart(backtestParams);
      }

      // Mock API call and response
      toast({
        title: "Backtest Started",
        description: "Your backtest is now running. Results will be available soon.",
      });

      // Simulate backtest completion after a delay
      setTimeout(() => {
        if (onBacktestComplete) {
          // Generate a mock result ID
          const resultId = `backtest-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          onBacktestComplete(resultId);
        }
        
        setIsLoading(false);
      }, 3000);
    } catch (error: any) {
      console.error("Error starting backtest:", error);
      toast({
        variant: "destructive",
        title: "Backtest Failed",
        description: error.message || "Failed to start backtest. Please try again.",
      });
      setIsLoading(false);
    }
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Backtest Configuration</CardTitle>
        <CardDescription>
          Configure and run a backtest for your trading strategy
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Backtest Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My Strategy Backtest" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="strategy_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Strategy</FormLabel>
                      <Select 
                        value={field.value || (strategy?.id || "")} 
                        onValueChange={field.onChange}
                        disabled={!!strategy}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a strategy" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {strategy ? (
                            <SelectItem value={strategy.id || ""}>{strategy.name}</SelectItem>
                          ) : (
                            strategies.map(s => (
                              <SelectItem key={s.id} value={s.id || ""}>{s.name}</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
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
                      <Input placeholder="Optional description of this backtest run" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="exchange"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exchange</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select exchange" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableExchanges.map(exchange => (
                            <SelectItem key={exchange} value={exchange}>
                              {exchange.charAt(0).toUpperCase() + exchange.slice(1)}
                            </SelectItem>
                          ))}
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
                      <FormLabel>Trading Pair</FormLabel>
                      <Select 
                        value={field.value} 
                        onValueChange={field.onChange}
                        disabled={availableSymbols.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select trading pair" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableSymbols.map(symbol => (
                            <SelectItem key={symbol} value={symbol}>{symbol}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("2018-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date(form.getValues('start_date'))
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex space-x-4">
                  <FormField
                    control={form.control}
                    name="timeframe_value"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Timeframe Value</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="timeframe_unit"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Timeframe Unit</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={TimeframeUnit.MINUTE}>Minute</SelectItem>
                            <SelectItem value={TimeframeUnit.HOUR}>Hour</SelectItem>
                            <SelectItem value={TimeframeUnit.DAY}>Day</SelectItem>
                            <SelectItem value={TimeframeUnit.WEEK}>Week</SelectItem>
                            <SelectItem value={TimeframeUnit.MONTH}>Month</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="initial_capital"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Capital (USD)</FormLabel>
                      <FormControl>
                        <Input type="number" min={100} {...field} />
                      </FormControl>
                      <FormDescription>
                        Starting capital for the backtest
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="leverage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Leverage (1-10x)</FormLabel>
                    <div className="flex items-center gap-4">
                      <FormControl>
                        <Slider
                          min={1}
                          max={10}
                          step={1}
                          value={[field.value]}
                          onValueChange={(vals) => field.onChange(vals[0])}
                        />
                      </FormControl>
                      <div className="w-12 text-center font-mono">
                        {field.value}x
                      </div>
                    </div>
                    <FormDescription>
                      Higher leverage increases both potential profits and risks
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {warnings.length > 0 && (
                <Alert variant="warning">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Backtest Warnings</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pl-4 text-sm">
                      {warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Running Backtest...
                </>
              ) : (
                <>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Run Backtest
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="border-t px-6 py-4">
        <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
          <div>Historical data provided by the Trading Farm market data service</div>
          <Button variant="link" size="sm" className="text-xs p-0 h-auto">
            <LineChart className="h-3 w-3 mr-1" />
            View Data Coverage
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
