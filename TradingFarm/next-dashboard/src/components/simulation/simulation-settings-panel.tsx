'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/components/ui/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { SimulationService, AgentSimulationConfig } from '@/services/simulation-service';

const initialBalancesSchema = z.object({
  USDT: z.number().min(0),
  BTC: z.number().min(0),
  ETH: z.number().min(0),
  SOL: z.number().min(0),
  // Add more assets as needed
});

const simulationConfigSchema = z.object({
  agentId: z.string().uuid(),
  exchange: z.string(),
  symbols: z.array(z.string()).min(1),
  slippageModelId: z.string().uuid().optional(),
  feeModelId: z.string().uuid().optional(),
  latencyModelId: z.string().uuid().optional(),
  fillModelId: z.string().uuid().optional(),
  errorModelId: z.string().uuid().optional(),
  initialBalances: initialBalancesSchema
});

type SimulationConfigFormValues = z.infer<typeof simulationConfigSchema>;

interface SimulationSettingsPanelProps {
  agentId: string;
  agentName: string;
  exchange: string;
}

export default function SimulationSettingsPanel({ 
  agentId, 
  agentName,
  exchange 
}: SimulationSettingsPanelProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [slippageModels, setSlippageModels] = useState<any[]>([]);
  const [feeModels, setFeeModels] = useState<any[]>([]);
  const [latencyModels, setLatencyModels] = useState<any[]>([]);
  const [fillModels, setFillModels] = useState<any[]>([]);
  const [errorModels, setErrorModels] = useState<any[]>([]);
  const { toast } = useToast();
  
  const form = useForm<SimulationConfigFormValues>({
    resolver: zodResolver(simulationConfigSchema),
    defaultValues: {
      agentId,
      exchange,
      symbols: ['BTCUSDT', 'ETHUSDT'],
      initialBalances: {
        USDT: 10000,
        BTC: 0.5,
        ETH: 5,
        SOL: 100
      }
    }
  });
  
  // Load simulation models and agent configuration
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      try {
        // Load all simulation models
        const [slippageModelsData, feeModelsData, latencyModelsData, fillModelsData, errorModelsData] = await Promise.all([
          SimulationService.getSimulationModels('slippage'),
          SimulationService.getSimulationModels('fee'),
          SimulationService.getSimulationModels('latency'),
          SimulationService.getSimulationModels('fill'),
          SimulationService.getSimulationModels('error')
        ]);
        
        setSlippageModels(slippageModelsData);
        setFeeModels(feeModelsData);
        setLatencyModels(latencyModelsData);
        setFillModels(fillModelsData);
        setErrorModels(errorModelsData);
        
        // Load agent simulation config if exists
        const config = await SimulationService.getAgentSimulationConfig(agentId);
        
        if (config) {
          form.reset({
            agentId: config.agentId,
            exchange: config.exchange,
            symbols: config.symbols,
            slippageModelId: config.slippageModelId,
            feeModelId: config.feeModelId,
            latencyModelId: config.latencyModelId,
            fillModelId: config.fillModelId,
            errorModelId: config.errorModelId,
            initialBalances: config.initialBalances
          });
        }
      } catch (error) {
        console.error('Error loading simulation data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load simulation settings',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [agentId, form, toast]);
  
  // Handle form submission
  const onSubmit = async (values: SimulationConfigFormValues) => {
    try {
      setIsLoading(true);
      console.log('Saving simulation settings for agent:', agentId);
      console.log('Form values:', values);
      
      // Handle demo agents or connection issues with fallback behavior
      if (agentId.startsWith('demo')) {
        console.log('Demo agent detected - simulating save action');
        
        // Simulate a delay for better UX
        await new Promise(resolve => setTimeout(resolve, 800));
        
        toast({
          title: 'Demo Mode',
          description: 'Settings would be saved (demo mode active)'
        });
        return;
      }
      
      try {
        await SimulationService.saveAgentSimulationConfig({
          agentId: values.agentId,
          exchange: values.exchange,
          symbols: values.symbols,
          slippageModelId: values.slippageModelId,
          feeModelId: values.feeModelId,
          latencyModelId: values.latencyModelId,
          fillModelId: values.fillModelId,
          errorModelId: values.errorModelId,
          initialBalances: values.initialBalances
        });
        
        console.log('Settings saved successfully');
        
        toast({
          title: 'Settings Saved',
          description: 'Simulation settings have been saved successfully'
        });
      } catch (apiError) {
        console.error('API error when saving settings:', apiError);
        
        // Check if it's an authentication error
        const errorMessage = (apiError as Error).message;
        if (errorMessage.includes('auth') || errorMessage.includes('unauthorized') || errorMessage.includes('Unauthorized')) {
          console.log('Authentication issue detected - fallback to demo behavior');
          toast({
            title: 'Authentication Required',
            description: 'Please log in to save settings. Settings remain in local state only.',
            variant: 'warning'
          });
        } else {
          // Re-throw for main error handler
          throw apiError;
        }
      }
    } catch (error) {
      console.error('Error saving simulation settings:', error);
      toast({
        title: 'Warning: Partial Save',
        description: 'Settings applied in UI but not saved to database. ' + (error as Error).message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Reset balances to default
  const resetBalances = () => {
    console.log('Reset balances button clicked');
    form.setValue('initialBalances', {
      USDT: 10000,
      BTC: 0.5,
      ETH: 5,
      SOL: 100
    });
    
    // Show confirmation toast
    toast({
      title: 'Balances Reset',
      description: 'Initial balances have been reset to default values'
    });
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Simulation Settings</CardTitle>
        <CardDescription>
          Configure how the dry-run trading simulation behaves for {agentName}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="balances" className="w-full">
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="balances">Balances</TabsTrigger>
                <TabsTrigger value="slippage">Slippage</TabsTrigger>
                <TabsTrigger value="fees">Fees</TabsTrigger>
                <TabsTrigger value="latency">Latency</TabsTrigger>
                <TabsTrigger value="errors">Errors</TabsTrigger>
              </TabsList>
              
              {/* Balances Tab */}
              <TabsContent value="balances" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="initialBalances.USDT"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>USDT Balance</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="1"
                            min="0"
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="initialBalances.BTC"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>BTC Balance</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.001"
                            min="0"
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="initialBalances.ETH"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ETH Balance</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="initialBalances.SOL"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SOL Balance</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={(e) => {
                    e.preventDefault(); // Prevent any form submission
                    console.log('Reset balances button clicked');
                    resetBalances();
                  }}
                  disabled={isLoading}
                >
                  Reset to Default Balances
                </Button>
              </TabsContent>
              
              {/* Slippage Tab */}
              <TabsContent value="slippage" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="slippageModelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slippage Model</FormLabel>
                      <Select 
                        disabled={isLoading || slippageModels.length === 0}
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a slippage model" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {slippageModels.map(model => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.name} - {model.parameters.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Determines how market orders deviate from the quoted price
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Display selected model details */}
                {form.watch('slippageModelId') && (
                  <div className="border rounded-md p-3 mt-2">
                    <h4 className="font-medium text-sm mb-2">Model Details</h4>
                    <p className="text-sm text-muted-foreground">
                      {slippageModels.find(m => m.id === form.watch('slippageModelId'))?.parameters.description}
                    </p>
                  </div>
                )}
              </TabsContent>
              
              {/* Fees Tab */}
              <TabsContent value="fees" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="feeModelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fee Model</FormLabel>
                      <Select 
                        disabled={isLoading || feeModels.length === 0}
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a fee model" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {feeModels.map(model => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.name} - {model.parameters.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Determines trading fees for maker and taker orders
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Display selected model details */}
                {form.watch('feeModelId') && (
                  <div className="border rounded-md p-3 mt-2">
                    <h4 className="font-medium text-sm mb-2">Model Details</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Maker Fee:</span>{' '}
                        {feeModels.find(m => m.id === form.watch('feeModelId'))?.parameters.makerFeeBps / 100}%
                      </div>
                      <div>
                        <span className="text-muted-foreground">Taker Fee:</span>{' '}
                        {feeModels.find(m => m.id === form.watch('feeModelId'))?.parameters.takerFeeBps / 100}%
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              {/* Latency Tab */}
              <TabsContent value="latency" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="latencyModelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latency Model</FormLabel>
                      <Select 
                        disabled={isLoading || latencyModels.length === 0}
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a latency model" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {latencyModels.map(model => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.name} - {model.parameters.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Simulates network and exchange response delays
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              {/* Errors Tab */}
              <TabsContent value="errors" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="errorModelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Error Simulation Model</FormLabel>
                      <Select 
                        disabled={isLoading || errorModels.length === 0}
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an error simulation model" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {errorModels.map(model => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.name} - {model.parameters.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Simulates exchange errors to test agent error handling
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Display selected model details */}
                {form.watch('errorModelId') && (
                  <div className="border rounded-md p-3 mt-2">
                    <h4 className="font-medium text-sm mb-2">Error Model Details</h4>
                    {errorModels.find(m => m.id === form.watch('errorModelId'))?.parameters.type === 'random' && (
                      <div className="space-y-2 text-sm">
                        <p>This model randomly simulates these errors with the following probabilities:</p>
                        <ul className="list-disc list-inside">
                          <li>Network Errors: {(errorModels.find(m => m.id === form.watch('errorModelId'))?.parameters.networkErrorRate || 0) * 100}%</li>
                          <li>Rate Limit Errors: {(errorModels.find(m => m.id === form.watch('errorModelId'))?.parameters.rateLimitErrorRate || 0) * 100}%</li>
                          <li>Insufficient Funds: {(errorModels.find(m => m.id === form.watch('errorModelId'))?.parameters.insufficientFundsRate || 0) * 100}%</li>
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={isLoading}
                onClick={() => console.log('Form submit button clicked')}
              >
                {isLoading ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
