'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon } from '@radix-ui/react-icons';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { getAllBrainAssets, getBrainAssetsByType, BrainAsset } from '@/services/brain-assets';
import { runBacktest, BacktestOptions } from '@/services/backtest-service';
import { getMarketDataSources, MarketDataSource } from '@/services/historical-data';

// Define schema for form validation
const backtestFormSchema = z.object({
  strategyId: z.number(),
  symbol: z.string().min(1, { message: 'Symbol is required' }),
  timeframe: z.string().min(1, { message: 'Timeframe is required' }),
  startDate: z.date({ required_error: 'Start date is required' }),
  endDate: z.date({ required_error: 'End date is required' }),
  initialCapital: z.coerce.number().min(1, { message: 'Initial capital must be at least 1' }),
  brainAssetIds: z.array(z.number()).min(1, { message: 'At least one brain asset is required' }),
  source: z.string().optional(),
});

type BacktestFormValues = z.infer<typeof backtestFormSchema>;

const timeframes = [
  { value: '1m', label: '1 Minute' },
  { value: '5m', label: '5 Minutes' },
  { value: '15m', label: '15 Minutes' },
  { value: '30m', label: '30 Minutes' },
  { value: '1h', label: '1 Hour' },
  { value: '4h', label: '4 Hours' },
  { value: '1d', label: '1 Day' },
  { value: '1w', label: '1 Week' },
];

const defaultSymbols = [
  { value: 'BTC/USD', label: 'Bitcoin (BTC/USD)' },
  { value: 'ETH/USD', label: 'Ethereum (ETH/USD)' },
  { value: 'SOL/USD', label: 'Solana (SOL/USD)' },
  { value: 'DOGE/USD', label: 'Dogecoin (DOGE/USD)' },
  { value: 'BNB/USD', label: 'Binance Coin (BNB/USD)' },
  { value: 'XRP/USD', label: 'Ripple (XRP/USD)' },
  { value: 'ADA/USD', label: 'Cardano (ADA/USD)' },
];

interface BacktestFormProps {
  strategyId: number;
  strategyName: string;
  onBacktestComplete: (result: any) => void;
  defaultValues?: Partial<BacktestFormValues>;
}

export function BacktestForm({
  strategyId,
  strategyName,
  onBacktestComplete,
  defaultValues,
}: BacktestFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [brainAssets, setBrainAssets] = React.useState<BrainAsset[]>([]);
  const [pineScriptAssets, setPineScriptAssets] = React.useState<BrainAsset[]>([]);
  const [strategyParams, setStrategyParams] = React.useState<Record<string, any>>({
    riskPerTrade: 0.02,
    feeRate: 0.001,
  });
  const [dataSources, setDataSources] = React.useState<MarketDataSource[]>([]);
  
  // Form default values
  const form = useForm<BacktestFormValues>({
    resolver: zodResolver(backtestFormSchema),
    defaultValues: {
      strategyId,
      symbol: 'BTC/USD',
      timeframe: '1h',
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      endDate: new Date(),
      initialCapital: 10000,
      brainAssetIds: [],
      ...defaultValues,
    },
  });
  
  // Load brain assets and market data sources on component mount
  React.useEffect(() => {
    const loadAssets = async () => {
      try {
        const assets = await getAllBrainAssets();
        setBrainAssets(assets);
        
        const pineScripts = await getBrainAssetsByType('pinescript');
        setPineScriptAssets(pineScripts);
        
        const sources = await getMarketDataSources();
        setDataSources(sources);
      } catch (error) {
        console.error('Error loading assets:', error);
        toast({
          title: 'Error loading assets',
          description: 'Failed to load brain assets for backtesting.',
          variant: 'destructive',
        });
      }
    };
    
    loadAssets();
  }, [toast]);
  
  // Handle form submission
  async function onSubmit(data: BacktestFormValues) {
    setLoading(true);
    
    try {
      // Prepare backtest options
      const options: BacktestOptions = {
        ...data,
        startDate: format(data.startDate, 'yyyy-MM-dd'),
        endDate: format(data.endDate, 'yyyy-MM-dd'),
        strategyParams,
      };
      
      // Run backtest
      const result = await runBacktest(options);
      
      toast({
        title: 'Backtest completed',
        description: `Successfully ran backtest for ${strategyName}`,
      });
      
      // Notify parent
      onBacktestComplete(result);
    } catch (error) {
      console.error('Backtest error:', error);
      toast({
        title: 'Backtest failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }
  
  // Handle strategy parameter changes
  const handleParamChange = (key: string, value: any) => {
    setStrategyParams((prev) => ({
      ...prev,
      [key]: value,
    }));
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Run Backtest: {strategyName}</CardTitle>
        <CardDescription>
          Configure and run a backtest for your trading strategy using brain assets.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Symbol selection */}
              <FormField
                control={form.control}
                name="symbol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Symbol</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select symbol" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {defaultSymbols.map((symbol) => (
                          <SelectItem key={symbol.value} value={symbol.value}>
                            {symbol.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The trading pair to backtest
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Timeframe selection */}
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
                          <SelectValue placeholder="Select timeframe" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {timeframes.map((timeframe) => (
                          <SelectItem key={timeframe.value} value={timeframe.value}>
                            {timeframe.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Candle timeframe for the backtest
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Start date picker */}
              <FormField
                control={form.control}
                name="startDate"
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
                            date > new Date() || date < new Date("2015-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Beginning date for backtest data
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* End date picker */}
              <FormField
                control={form.control}
                name="endDate"
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
                            date > new Date() || date < new Date("2015-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Ending date for backtest data
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Initial capital */}
              <FormField
                control={form.control}
                name="initialCapital"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Capital</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        step={1000}
                        placeholder="10000"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Starting capital for the backtest
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Data source */}
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Source</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select data source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Auto (default)</SelectItem>
                        {dataSources.map((source) => (
                          <SelectItem key={source.id} value={source.name}>
                            {source.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Source of historical market data
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator className="my-4" />
            
            {/* Brain assets selection */}
            <div>
              <h3 className="text-lg font-medium">Brain Assets</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select brain assets to use in the backtest
              </p>

              <Tabs defaultValue="pinescript" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="pinescript">PineScript Indicators</TabsTrigger>
                  <TabsTrigger value="documents">Documents & Knowledge</TabsTrigger>
                </TabsList>
                <TabsContent value="pinescript" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pineScriptAssets.length > 0 ? (
                      pineScriptAssets.map((asset) => (
                        <div key={asset.id} className="flex items-start space-x-3 border rounded-md p-3">
                          <Checkbox
                            id={`ps-${asset.id}`}
                            onCheckedChange={(checked) => {
                              const currentAssets = form.getValues('brainAssetIds');
                              const newAssets = checked
                                ? [...currentAssets, asset.id]
                                : currentAssets.filter(id => id !== asset.id);
                              form.setValue('brainAssetIds', newAssets, { shouldValidate: true });
                            }}
                          />
                          <div className="space-y-1">
                            <label
                              htmlFor={`ps-${asset.id}`}
                              className="text-sm font-medium leading-none cursor-pointer"
                            >
                              {asset.title}
                            </label>
                            <p className="text-xs text-muted-foreground">
                              {asset.description || 'No description available'}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 text-center py-8 border rounded-md bg-muted/50">
                        <p className="text-muted-foreground">No PineScript indicators available</p>
                        <Button 
                          variant="outline" 
                          className="mt-2"
                          onClick={() => window.location.href = '/dashboard/brain/knowledge'}
                        >
                          Upload Indicators
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="documents" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {brainAssets.filter(a => a.asset_type !== 'pinescript').length > 0 ? (
                      brainAssets
                        .filter(a => a.asset_type !== 'pinescript')
                        .map((asset) => (
                          <div key={asset.id} className="flex items-start space-x-3 border rounded-md p-3">
                            <Checkbox
                              id={`doc-${asset.id}`}
                              onCheckedChange={(checked) => {
                                const currentAssets = form.getValues('brainAssetIds');
                                const newAssets = checked
                                  ? [...currentAssets, asset.id]
                                  : currentAssets.filter(id => id !== asset.id);
                                form.setValue('brainAssetIds', newAssets, { shouldValidate: true });
                              }}
                            />
                            <div className="space-y-1">
                              <label
                                htmlFor={`doc-${asset.id}`}
                                className="text-sm font-medium leading-none cursor-pointer"
                              >
                                {asset.title}
                              </label>
                              <p className="text-xs text-muted-foreground">
                                {asset.asset_type} • {asset.description || 'No description available'}
                              </p>
                            </div>
                          </div>
                        ))
                    ) : (
                      <div className="col-span-2 text-center py-8 border rounded-md bg-muted/50">
                        <p className="text-muted-foreground">No knowledge documents available</p>
                        <Button 
                          variant="outline" 
                          className="mt-2"
                          onClick={() => window.location.href = '/dashboard/brain/knowledge'}
                        >
                          Upload Documents
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
              
              {form.formState.errors.brainAssetIds && (
                <p className="text-sm font-medium text-destructive mt-2">
                  {form.formState.errors.brainAssetIds.message}
                </p>
              )}
            </div>

            <Separator className="my-4" />
            
            {/* Strategy parameters */}
            <div>
              <h3 className="text-lg font-medium">Strategy Parameters</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Configure parameters for the backtest
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="riskPerTrade" className="text-sm font-medium">
                    Risk Per Trade (%)
                  </label>
                  <Input
                    id="riskPerTrade"
                    type="number"
                    step={0.01}
                    min={0.01}
                    max={100}
                    value={strategyParams.riskPerTrade * 100}
                    onChange={(e) => handleParamChange('riskPerTrade', Number(e.target.value) / 100)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Percentage of capital at risk per trade
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="feeRate" className="text-sm font-medium">
                    Fee Rate (%)
                  </label>
                  <Input
                    id="feeRate"
                    type="number"
                    step={0.001}
                    min={0}
                    max={10}
                    value={strategyParams.feeRate * 100}
                    onChange={(e) => handleParamChange('feeRate', Number(e.target.value) / 100)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Exchange fee per transaction
                  </p>
                </div>
                
                {/* Add more strategy-specific parameters here */}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Running Backtest...' : 'Run Backtest'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
