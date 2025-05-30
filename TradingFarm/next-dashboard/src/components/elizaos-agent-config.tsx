'use client';

import React, { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { useElizaAgentManager } from '@/hooks/use-elizaos-agent-manager';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { agentConfigSchema } from '@/schemas/agent-config';

interface ElizaOSAgentConfigProps {
  agentId: string;
}

export function ElizaOSAgentConfig({ agentId }: ElizaOSAgentConfigProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawJsonMode, setRawJsonMode] = useState(false);
  const [rawJsonValue, setRawJsonValue] = useState('');
  const [rawJsonError, setRawJsonError] = useState<string | null>(null);
  
  const { getAgentConfig, updateAgentConfig, config } = useElizaAgentManager(agentId);
  
  const form = useForm<z.infer<typeof agentConfigSchema>>({
    resolver: zodResolver(agentConfigSchema),
    defaultValues: {
      id: '',
      name: '',
      description: '',
      trading_pairs: [],
      risk_level: 'medium',
      max_allocation: 0,
      active: false,
      strategy_config: {},
    },
  });
  
  // Load initial configuration
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    
    getAgentConfig()
      .then((config) => {
        if (config) {
          // Reset form with loaded data
          form.reset(config);
          
          // Update raw JSON display
          setRawJsonValue(JSON.stringify(config, null, 2));
        }
      })
      .catch((err) => {
        console.error('Failed to load agent configuration:', err);
        setError('Failed to load agent configuration. Please try again.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [agentId, getAgentConfig, form]);
  
  // Update form when config changes
  useEffect(() => {
    if (config && !isLoading) {
      form.reset(config);
      setRawJsonValue(JSON.stringify(config, null, 2));
    }
  }, [config, form, isLoading]);
  
  // Handle form submission
  const onSubmit = async (values: z.infer<typeof agentConfigSchema>) => {
    setIsSaving(true);
    setError(null);
    
    try {
      await updateAgentConfig(values);
      toast.success('Agent configuration saved successfully');
    } catch (err) {
      console.error('Failed to save agent configuration:', err);
      setError('Failed to save configuration. Please try again.');
      toast.error('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle raw JSON editing
  const handleRawJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRawJsonValue(e.target.value);
    setRawJsonError(null);
    
    try {
      const parsed = JSON.parse(e.target.value);
      // Validate with schema
      agentConfigSchema.parse(parsed);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setRawJsonError(`Validation error: ${err.errors[0].message}`);
      } else if (err instanceof SyntaxError) {
        setRawJsonError(`Invalid JSON: ${err.message}`);
      } else {
        setRawJsonError('Invalid configuration format');
      }
    }
  };
  
  // Apply raw JSON changes
  const applyRawJson = () => {
    try {
      const parsed = JSON.parse(rawJsonValue);
      const validated = agentConfigSchema.parse(parsed);
      
      form.reset(validated);
      setRawJsonMode(false);
      
      // Save the changes
      onSubmit(validated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setRawJsonError(`Validation error: ${err.errors[0].message}`);
      } else if (err instanceof SyntaxError) {
        setRawJsonError(`Invalid JSON: ${err.message}`);
      } else {
        setRawJsonError('Invalid configuration format');
      }
    }
  };
  
  const tradingPairsString = form.watch('trading_pairs')?.join(', ') || '';
  
  const handleTradingPairsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pairs = e.target.value.split(',').map(pair => pair.trim()).filter(Boolean);
    form.setValue('trading_pairs', pairs);
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Agent Configuration</CardTitle>
        <CardDescription>
          Configure your ElizaOS agent settings and behavior
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <ExclamationTriangleIcon className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <Tabs defaultValue="basic">
            <TabsList className="mb-4">
              <TabsTrigger value="basic">Basic Settings</TabsTrigger>
              <TabsTrigger value="strategy">Strategy</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
              <TabsTrigger value="json" onClick={() => setRawJsonMode(true)}>Raw JSON</TabsTrigger>
            </TabsList>
            
            {rawJsonMode ? (
              <div className="space-y-4">
                <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded-md border border-amber-200 dark:border-amber-800">
                  <p className="text-amber-800 dark:text-amber-300 text-sm">
                    Warning: Editing raw JSON directly is advanced and may cause issues if not properly formatted.
                    All changes will be validated before saving.
                  </p>
                </div>
                
                <Textarea
                  value={rawJsonValue}
                  onChange={handleRawJsonChange}
                  className="font-mono text-sm h-96"
                />
                
                {rawJsonError && (
                  <p className="text-destructive text-sm">{rawJsonError}</p>
                )}
                
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setRawJsonMode(false)}>
                    Cancel
                  </Button>
                  <Button onClick={applyRawJson} disabled={!!rawJsonError || isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Apply Changes
                  </Button>
                </div>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <TabsContent value="basic" className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Agent Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter agent name" {...field} />
                          </FormControl>
                          <FormDescription>
                            A descriptive name for your ElizaOS agent
                          </FormDescription>
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
                              placeholder="Describe the purpose and behavior of this agent" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="trading_pairs"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trading Pairs</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="BTC/USDT, ETH/USDT, etc." 
                              value={tradingPairsString}
                              onChange={handleTradingPairsChange}
                            />
                          </FormControl>
                          <FormDescription>
                            Comma-separated list of trading pairs this agent can operate on
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="active"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Active Status</FormLabel>
                            <FormDescription>
                              Enable or disable this agent
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
                  
                  <TabsContent value="strategy" className="space-y-4">
                    <FormField
                      control={form.control}
                      name="risk_level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Risk Level</FormLabel>
                          <FormControl>
                            <select
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              value={field.value}
                              onChange={field.onChange}
                            >
                              <option value="low">Low Risk</option>
                              <option value="medium">Medium Risk</option>
                              <option value="high">High Risk</option>
                            </select>
                          </FormControl>
                          <FormDescription>
                            Determines the agent's risk tolerance for trading
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="max_allocation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Maximum Allocation (%)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              max="100" 
                              step="0.1"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Maximum percentage of available funds this agent can allocate to trading
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Strategy-specific fields would go here - this is a simplified example */}
                    <div className="bg-muted p-4 rounded-md">
                      <p className="text-sm text-muted-foreground">
                        Additional strategy configuration options would be displayed here based on the agent type.
                      </p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="advanced" className="space-y-4">
                    <div className="bg-muted p-4 rounded-md">
                      <p className="text-sm text-muted-foreground">
                        Advanced configuration options for API connectivity, reporting, and execution parameters.
                      </p>
                    </div>
                    
                    {/* Advanced fields would go here - this is a simplified example */}
                  </TabsContent>
                  
                  <div className="flex justify-end space-x-2">
                    <Button type="submit" disabled={isSaving}>
                      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Configuration
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
