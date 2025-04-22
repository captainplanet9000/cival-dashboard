'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
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
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

import { getAllBrainAssets, getBrainAssetsByType, BrainAsset } from '@/services/brain-assets';
import { startStrategyExecution, runStrategyExecution, ExecutionOptions } from '@/services/strategy-execution';

// Define schema for form validation
const executionFormSchema = z.object({
  strategyId: z.number(),
  agentId: z.number().optional(),
  symbol: z.string().min(1, { message: 'Symbol is required' }),
  timeframe: z.string().min(1, { message: 'Timeframe is required' }),
  liveMode: z.boolean().default(false),
  paperTrading: z.boolean().default(true),
  initialCapital: z.coerce.number().min(1, { message: 'Initial capital must be at least 1' }),
  brainAssetIds: z.array(z.number()).min(1, { message: 'At least one brain asset is required' }),
});

type ExecutionFormValues = z.infer<typeof executionFormSchema>;

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

interface StrategyExecutionFormProps {
  strategyId: number;
  strategyName: string;
  agents?: { id: number; name: string }[];
  onExecutionStart: (executionId: number) => void;
  defaultValues?: Partial<ExecutionFormValues>;
}

export function StrategyExecutionForm({
  strategyId,
  strategyName,
  agents,
  onExecutionStart,
  defaultValues,
}: StrategyExecutionFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [brainAssets, setBrainAssets] = React.useState<BrainAsset[]>([]);
  const [pineScriptAssets, setPineScriptAssets] = React.useState<BrainAsset[]>([]);
  
  // Form default values
  const form = useForm<ExecutionFormValues>({
    resolver: zodResolver(executionFormSchema),
    defaultValues: {
      strategyId,
      symbol: 'BTC/USD',
      timeframe: '1h',
      liveMode: false,
      paperTrading: true,
      initialCapital: 10000,
      brainAssetIds: [],
      ...defaultValues,
    },
  });
  
  // Load brain assets on component mount
  React.useEffect(() => {
    const loadAssets = async () => {
      try {
        const assets = await getAllBrainAssets();
        setBrainAssets(assets);
        
        const pineScripts = await getBrainAssetsByType('pinescript');
        setPineScriptAssets(pineScripts);
      } catch (error) {
        console.error('Error loading assets:', error);
        toast({
          title: 'Error loading assets',
          description: 'Failed to load brain assets for execution.',
          variant: 'destructive',
        });
      }
    };
    
    loadAssets();
  }, [toast]);
  
  // Handle form submission
  async function onSubmit(data: ExecutionFormValues) {
    setLoading(true);
    
    try {
      // Prepare execution options
      const options: ExecutionOptions = {
        ...data,
      };
      
      // Start execution
      const execution = await startStrategyExecution(options);
      
      toast({
        title: 'Execution created',
        description: `Successfully created execution for ${strategyName}`,
      });
      
      // Start running the execution
      await runStrategyExecution(execution.id);
      
      toast({
        title: 'Execution started',
        description: `Execution #${execution.id} is now running`,
      });
      
      // Notify parent
      onExecutionStart(execution.id);
    } catch (error) {
      console.error('Execution error:', error);
      toast({
        title: 'Execution failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }
  
  // Handle live mode change
  const watchLiveMode = form.watch('liveMode');
  React.useEffect(() => {
    if (watchLiveMode) {
      form.setValue('paperTrading', true);
    }
  }, [watchLiveMode, form]);
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Execute Strategy: {strategyName}</CardTitle>
        <CardDescription>
          Configure and execute your trading strategy using brain assets and ElizaOS agents.
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
                      The trading pair to execute
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
                      Candle timeframe for the execution
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
                      Starting capital for the execution
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Agent selection */}
              {agents && agents.length > 0 && (
                <FormField
                  control={form.control}
                  name="agentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ElizaOS Agent (Optional)</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select agent" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {agents.map((agent) => (
                            <SelectItem key={agent.id} value={agent.id.toString()}>
                              {agent.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Agent to manage this execution
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <Separator className="my-4" />
            
            {/* Execution mode */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Execution Mode</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="liveMode"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Live Mode</FormLabel>
                        <FormDescription>
                          Execute strategy with real-time market data
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
                
                <FormField
                  control={form.control}
                  name="paperTrading"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Paper Trading</FormLabel>
                        <FormDescription>
                          Simulate trades without using real funds
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={form.getValues('liveMode')}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              
              {form.getValues('liveMode') && !form.getValues('paperTrading') && (
                <div className="rounded-md bg-destructive/15 p-3 text-destructive">
                  <p className="text-sm font-medium">Warning: Live trading with real funds</p>
                  <p className="text-xs">
                    You are about to execute a strategy with real funds. Please ensure you understand the risks involved.
                  </p>
                </div>
              )}
            </div>

            <Separator className="my-4" />
            
            {/* Brain assets selection */}
            <div>
              <h3 className="text-lg font-medium">Brain Assets</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select brain assets for this execution
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">PineScript Indicators</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
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
                      <div className="text-center py-8 border rounded-md bg-muted/50">
                        <p className="text-muted-foreground">No PineScript indicators available</p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="mt-2"
                          onClick={() => window.location.href = '/dashboard/brain/knowledge'}
                        >
                          Upload Indicators
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Knowledge Documents</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
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
                      <div className="text-center py-8 border rounded-md bg-muted/50">
                        <p className="text-muted-foreground">No knowledge documents available</p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="mt-2"
                          onClick={() => window.location.href = '/dashboard/brain/knowledge'}
                        >
                          Upload Documents
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              {form.formState.errors.brainAssetIds && (
                <p className="text-sm font-medium text-destructive mt-2">
                  {form.formState.errors.brainAssetIds.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Starting Execution...' : 'Start Execution'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
