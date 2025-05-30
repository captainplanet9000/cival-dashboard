'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { createBrowserClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useElizaAgentsWithFallback } from '@/hooks/useElizaAgentsWithFallback';
import { mockDataService } from '@/services/mock-data-service';

// Components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckboxItem, CheckboxList } from '@/components/ui/checkbox-list';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle } from 'lucide-react';

// Define the form schema with Zod
const formSchema = z.object({
  // Basic Information
  name: z.string().min(3, { message: "Agent name must be at least 3 characters." }),
  description: z.string().optional(),
  farm_id: z.coerce.number().optional(),
  type: z.string().default('eliza'),
  
  // Trading Configuration
  strategy_type: z.string().optional(),
  risk_level: z.string().optional(),
  target_markets: z.array(z.string()).optional(),
  exchange_account_id: z.string().optional(),
  
  // Advanced Settings
  auto_start: z.boolean().default(false),
  execution_mode: z.enum(['live', 'dry-run', 'backtest']).default('dry-run'),
  
  // Additional configuration
  config: z.record(z.any()).optional(),
});

// Types
type FormValues = z.infer<typeof formSchema>;
type FarmType = { id: number; name: string };

interface CreateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialFarmId?: number;
  onSuccess?: (agent: any) => void;
}

export function CreateAgentDialog({ 
  open, 
  onOpenChange, 
  initialFarmId,
  onSuccess 
}: CreateAgentDialogProps) {
  // State
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [strategyTypes, setStrategyTypes] = useState<string[]>([]);
  const [riskLevels, setRiskLevels] = useState<string[]>([]);
  const [availableMarkets, setAvailableMarkets] = useState<string[]>([]);
  const [farms, setFarms] = useState<FarmType[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  // Hooks
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createBrowserClient();
  const { createAgent } = useElizaAgentsWithFallback();
  
  // Form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      type: 'eliza',
      strategy_type: '',
      risk_level: 'medium',
      target_markets: [],
      auto_start: false,
      execution_mode: 'dry-run',
      farm_id: initialFarmId || undefined,
    },
  });
  
  // Load options for form dropdowns
  useEffect(() => {
    async function fetchFormData() {
      setLoadingOptions(true);
      try {
        // Try to load from API
        let farmsData = [];
        let marketsData = [];
        let strategyTypesData = [];
        let riskLevelsData = ['low', 'medium', 'high'];
        
        try {
          // Get farms from Supabase
          const { data: farmsResult, error: farmsError } = await supabase
            .from('farms')
            .select('id, name')
            .order('name');
            
          if (farmsError) throw farmsError;
          farmsData = farmsResult || [];
          
          // Get markets from Supabase or API
          const { data: marketsResult, error: marketsError } = await supabase
            .from('markets')
            .select('symbol')
            .order('symbol');
            
          if (marketsError) throw marketsError;
          marketsData = marketsResult?.map(m => m.symbol) || [];
          
          // Get strategy types from Supabase or API
          const { data: strategyResult, error: strategyError } = await supabase
            .from('strategy_types')
            .select('name')
            .order('name');
            
          if (strategyError) throw strategyError;
          strategyTypesData = strategyResult?.map(s => s.name) || [];
          
        } catch (error) {
          console.warn('Error loading options from API, using mock data:', error);
          // Fallback to mock data
          farmsData = mockDataService.getFarms();
          marketsData = mockDataService.getMarkets();
          strategyTypesData = mockDataService.getStrategyTypes();
        }
        
        // Set the data
        setFarms(farmsData);
        setAvailableMarkets(marketsData);
        setStrategyTypes(strategyTypesData);
        setRiskLevels(riskLevelsData);
        
        // If we have an initialFarmId and it exists in farms, set it in the form
        if (initialFarmId && farmsData.some(farm => farm.id === initialFarmId)) {
          form.setValue('farm_id', initialFarmId);
        }
        
      } catch (error) {
        console.error('Error fetching form data:', error);
        setFormError('Failed to load form options. Some selections may be unavailable.');
      } finally {
        setLoadingOptions(false);
      }
    }
    
    fetchFormData();
  }, [supabase, form, initialFarmId]);
  
  // Handle form submission
  const onSubmit = async (data: FormValues) => {
    setIsCreating(true);
    setFormError(null);
    
    try {
      // Format the agent data for creation
      const agentData = {
        ...data,
        // Only include farm_id if it was actually selected
        farm_id: data.farm_id || null,
        // Ensure status is set for new agents
        status: data.auto_start ? 'active' : 'inactive',
        // Set required fields
        type: data.type || 'eliza',
      };
      
      // First try to create through the direct API
      try {
        const response = await fetch('/api/agents/create-direct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(agentData),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create agent through API');
        }
        
        const result = await response.json();
        
        // Success!
        toast({
          title: "Agent Created",
          description: "New agent created successfully",
        });
        
        // Call the success callback if provided
        if (onSuccess) {
          onSuccess(result.agent);
        }
        
        // Close the dialog
        onOpenChange(false);
        
        return;
      } catch (apiError) {
        console.warn('Direct API creation failed, trying fallback method:', apiError);
        // If direct API fails, try the fallback method
      }
      
      // Fallback: Create through the hook
      const agent = await createAgent({
        name: data.name,
        description: data.description,
        config: agentData
      });
      
      if (!agent) {
        throw new Error('Failed to create agent through fallback method');
      }
      
      // Success!
      toast({
        title: "Agent Created",
        description: "New agent created successfully (fallback mode)",
      });
      
      // Call the success callback if provided
      if (onSuccess) {
        onSuccess(agent);
      }
      
      // Close the dialog
      onOpenChange(false);
      
    } catch (error) {
      console.error('Error creating agent:', error);
      setFormError(error instanceof Error ? error.message : 'Failed to create agent');
      
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : 'Failed to create agent',
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Agent</DialogTitle>
          <DialogDescription>
            Create an AI agent to help with trading and market analysis.
          </DialogDescription>
        </DialogHeader>
        
        {formError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 mb-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 mr-3" />
              <div className="text-sm text-red-800 dark:text-red-300">{formError}</div>
            </div>
          </div>
        )}
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="trading">Trading Setup</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <TabsContent value="basic" className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agent Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Market Analyst" {...field} />
                      </FormControl>
                      <FormDescription>A descriptive name for your agent</FormDescription>
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
                          placeholder="This agent analyzes market trends and recommends potential trades." 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>Brief description of what this agent does</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="farm_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign to Farm</FormLabel>
                      <Select 
                        disabled={loadingOptions || farms.length === 0}
                        onValueChange={(value) => field.onChange(Number(value))}
                        value={field.value?.toString() || ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a farm" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">None (Independent Agent)</SelectItem>
                          {farms.map((farm) => (
                            <SelectItem key={farm.id} value={farm.id.toString()}>
                              {farm.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Optionally assign this agent to a farm</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              <TabsContent value="trading" className="space-y-4">
                <FormField
                  control={form.control}
                  name="strategy_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Strategy Type</FormLabel>
                      <Select 
                        disabled={loadingOptions || strategyTypes.length === 0}
                        onValueChange={field.onChange}
                        value={field.value || ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a strategy" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {strategyTypes.map((strategy) => (
                            <SelectItem key={strategy} value={strategy}>
                              {strategy.charAt(0).toUpperCase() + strategy.slice(1).replace(/_/g, ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Trading strategy this agent will use</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="risk_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Risk Level</FormLabel>
                      <Select 
                        disabled={loadingOptions}
                        onValueChange={field.onChange}
                        value={field.value || 'medium'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select risk level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {riskLevels.map((level) => (
                            <SelectItem key={level} value={level}>
                              {level.charAt(0).toUpperCase() + level.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Risk tolerance level for trading decisions</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="target_markets"
                  render={() => (
                    <FormItem>
                      <FormLabel>Target Markets</FormLabel>
                      <FormControl>
                        <CheckboxList
                          items={availableMarkets}
                          selectedItems={form.watch('target_markets') || []}
                          onItemToggle={(market) => {
                            const currentMarkets = form.watch('target_markets') || [];
                            const updatedMarkets = currentMarkets.includes(market)
                              ? currentMarkets.filter(m => m !== market)
                              : [...currentMarkets, market];
                            form.setValue('target_markets', updatedMarkets);
                          }}
                          renderItem={(market) => (
                            <div className="flex items-center justify-between">
                              <span>{market}</span>
                              {form.watch('target_markets')?.includes(market) && (
                                <Badge variant="outline" className="ml-auto">Selected</Badge>
                              )}
                            </div>
                          )}
                          isLoading={loadingOptions}
                          emptyMessage="No markets available"
                        />
                      </FormControl>
                      <FormDescription>Markets this agent will trade in</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              <TabsContent value="advanced" className="space-y-4">
                <FormField
                  control={form.control}
                  name="execution_mode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Execution Mode</FormLabel>
                      <Select 
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select execution mode" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="dry-run">Dry Run (Paper Trading)</SelectItem>
                          <SelectItem value="backtest">Backtest</SelectItem>
                          <SelectItem value="live">Live Trading</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>How the agent will execute trades</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="auto_start"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="accent-primary"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Auto-start agent</FormLabel>
                        <FormDescription>
                          Agent will automatically activate after creation
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Agent
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
