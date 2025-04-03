'use client';

import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { 
  Bot, 
  Landmark, 
  BarChart2, 
  Activity, 
  Globe, 
  AlertTriangle, 
  Check, 
  Loader2,
  ChevronRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { agentService, AgentCreationRequest } from '@/services/agent-service';

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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const formSchema = z.object({
  name: z.string().min(3, { message: "Agent name must be at least 3 characters." }),
  description: z.string().optional(),
  farm_id: z.coerce.number({ required_error: "Please select a farm." }),
  strategy_type: z.string({ required_error: "Please select a strategy type." }),
  risk_level: z.string({ required_error: "Please select a risk level." }),
  target_markets: z.array(z.string()).min(1, { message: "Select at least one market." }),
  exchange_account_id: z.string().optional(),
  max_drawdown_percent: z.coerce.number().min(1).max(100).optional(),
  auto_start: z.boolean().default(false),
  use_advanced_config: z.boolean().default(false),
  capital_allocation: z.coerce.number().min(1).max(100).default(10),
  leverage: z.coerce.number().min(1).max(10).default(1),
  config: z.record(z.any()).optional(),
});

// Types
type FormValues = z.infer<typeof formSchema>;
type FarmType = { id: number; name: string };

export interface AgentCreationFormProps {
  onSuccess?: (agent: any) => void;
  onCancel?: () => void;
}

export function AgentCreationForm({ onSuccess, onCancel }: AgentCreationFormProps) {
  const [strategyTypes, setStrategyTypes] = React.useState<string[]>([]);
  const [riskLevels, setRiskLevels] = React.useState<string[]>([]);
  const [availableMarkets, setAvailableMarkets] = React.useState<string[]>([]);
  const [farms, setFarms] = React.useState<FarmType[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState(1);
  const router = useRouter();

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      strategy_type: '',
      risk_level: 'medium',
      target_markets: [],
      auto_start: false,
      use_advanced_config: false,
      capital_allocation: 10,
      leverage: 1,
    },
  });
  
  // Load options from the agent service
  React.useEffect(() => {
    async function loadOptions() {
      setIsLoading(true);
      try {
        // Load all options in parallel
        const [
          strategyTypesResponse, 
          riskLevelsResponse, 
          marketsResponse,
          farmsResponse
        ] = await Promise.all([
          agentService.getStrategyTypes(),
          agentService.getRiskLevels(),
          agentService.getAvailableMarkets(),
          agentService.getAvailableFarms()
        ]);
        
        if (strategyTypesResponse.data) {
          setStrategyTypes(strategyTypesResponse.data);
        }
        
        if (riskLevelsResponse.data) {
          setRiskLevels(riskLevelsResponse.data);
        }
        
        if (marketsResponse.data) {
          setAvailableMarkets(marketsResponse.data);
        }
        
        if (farmsResponse.data) {
          // Ensure farms is always an array
          const farmsArray = Array.isArray(farmsResponse.data) 
            ? farmsResponse.data 
            : (farmsResponse.data as any)?.farms || [];
          
          setFarms(farmsArray);
          
          // Auto-select first farm if only one is available
          if (farmsArray.length === 1) {
            form.setValue('farm_id', farmsArray[0].id.toString());
          }
        }
      } catch (error) {
        console.error('Error loading agent options:', error);
        toast({
          variant: "destructive",
          title: "Failed to load options",
          description: "Could not load strategy types and other options.",
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    loadOptions();
  }, [form]);
  
  // Handle form submission
  async function onSubmit(values: FormValues) {
    setIsCreating(true);
    
    try {
      // Convert form values to agent creation request
      const agentData: AgentCreationRequest = {
        name: values.name,
        description: values.description,
        farm_id: values.farm_id?.toString(), // Convert number to string for Supabase
        type: 'eliza', // Set the agent type explicitly to match database schema
        strategy_type: values.strategy_type,
        risk_level: values.risk_level,
        target_markets: values.target_markets,
        config: {
          exchange_account_id: values.exchange_account_id,
          max_drawdown_percent: values.max_drawdown_percent,
          auto_start: values.auto_start,
          capital_allocation: values.capital_allocation,
          leverage: values.leverage,
          ...(values.use_advanced_config ? values.config : {})
        }
      };
      
      // First try to use the direct API endpoint to bypass schema cache issues
      try {
        const directResponse = await fetch('/api/agents/create-direct', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(agentData),
        });
        
        if (directResponse.ok) {
          const data = await directResponse.json();
          toast({
            title: "Agent Created Successfully",
            description: `${data.agent.name} has been created and is being initialized.`,
          });
          
          if (onSuccess) {
            onSuccess(data.agent);
          } else {
            // Navigate to the agent details page
            router.push(`/dashboard/agents/${data.agent.id}`);
          }
          return;
        }
      } catch (directError) {
        console.error('Direct API endpoint failed:', directError);
        // Continue to regular API as fallback
      }
      
      // Fallback to using the agent service
      const response = await agentService.createAgent(agentData);
      
      if (response.error) {
        toast({
          variant: "destructive",
          title: "Agent Creation Failed",
          description: response.error,
        });
      } else if (response.data) {
        toast({
          title: "Agent Created Successfully",
          description: `${response.data.name} has been created and is being initialized.`,
        });
        
        if (onSuccess) {
          onSuccess(response.data);
        } else {
          // Navigate to the agent details page
          router.push(`/dashboard/agents/${response.data.id}`);
        }
      }
    } catch (error) {
      console.error('Error creating agent:', error);
      toast({
        variant: "destructive",
        title: "Agent Creation Failed",
        description: "An unexpected error occurred while creating the agent.",
      });
    } finally {
      setIsCreating(false);
    }
  }
  
  // Helper to format strategy types for display
  const formatStrategyType = (type: string): string => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  // Helper to format risk levels for display
  const formatRiskLevel = (level: string): string => {
    return level
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  // Navigate to next step
  const nextStep = () => {
    // Validate current step fields before proceeding
    if (currentStep === 1) {
      const { name, farm_id } = form.getValues();
      if (!name || !farm_id) {
        form.trigger(['name', 'farm_id']);
        return;
      }
    } else if (currentStep === 2) {
      const { strategy_type, risk_level, target_markets } = form.getValues();
      if (!strategy_type || !risk_level || !target_markets.length) {
        form.trigger(['strategy_type', 'risk_level', 'target_markets']);
        return;
      }
    }
    
    setCurrentStep((curr: number) => curr + 1);
  };
  
  // Navigate to previous step
  const prevStep = () => {
    setCurrentStep((curr: number) => Math.max(1, curr - 1));
  };
  
  const handleMarketToggle = (market: string) => {
    const currentTargetMarkets = form.getValues('target_markets') || [];
    const marketIndex = currentTargetMarkets.indexOf(market);
    
    if (marketIndex > -1) {
      // Remove market if already selected
      const updatedMarkets = currentTargetMarkets.filter((m: string) => m !== market);
      form.setValue('target_markets', updatedMarkets, { shouldValidate: true });
    } else {
      // Add market if not selected
      form.setValue('target_markets', [...currentTargetMarkets, market], { shouldValidate: true });
    }
  };
  
  const isMarketSelected = (market: string) => {
    const currentTargetMarkets = form.getValues('target_markets') || [];
    return currentTargetMarkets.includes(market);
  };
  
  // Helper to get rating based on risk level
  const getRiskRating = (level: string): number => {
    const riskRatings: Record<string, number> = {
      'very_low': 1,
      'low': 2,
      'medium': 3,
      'high': 4,
      'very_high': 5
    };
    return riskRatings[level] || 3;
  };
  
  // Handle advanced config toggle
  const handleAdvancedConfigToggle = (value: boolean) => {
    form.setValue('use_advanced_config', value, { shouldValidate: true });
  };
  
  // Apply JSON configuration from a string
  const applyJsonConfig = (value: string) => {
    try {
      const parsedConfig = JSON.parse(value);
      form.setValue('config', parsedConfig, { shouldValidate: true });
      toast({
        title: "Configuration Applied",
        description: "The JSON configuration has been successfully parsed and applied.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Invalid JSON",
        description: "Please provide a valid JSON configuration.",
      });
    }
  };
  
  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Loading agent options...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="text-center">
                <Bot className="mx-auto h-12 w-12 text-primary" />
                <h2 className="mt-2 text-xl font-semibold">Agent Details</h2>
                <p className="text-sm text-muted-foreground">Basic information about your trading agent</p>
              </div>
              
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
                      Choose a descriptive name for your trading agent
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
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the purpose of this agent"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="farm_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Farm</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a farm" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {farms.map((farm: FarmType) => (
                          <SelectItem key={farm.id} value={farm.id.toString()}>
                            {farm.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The farm this agent will be associated with
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
          
          {/* Step 2: Strategy Configuration */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="text-center">
                <BarChart2 className="mx-auto h-12 w-12 text-primary" />
                <h2 className="mt-2 text-xl font-semibold">Strategy Configuration</h2>
                <p className="text-sm text-muted-foreground">Configure how your agent will trade</p>
              </div>
              
              <FormField
                control={form.control}
                name="strategy_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Strategy Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a strategy type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {strategyTypes.map((type: string) => (
                          <SelectItem key={type} value={type}>
                            {formatStrategyType(type)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The trading strategy this agent will implement
                    </FormDescription>
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
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a risk level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {riskLevels.map((level: string) => (
                          <SelectItem key={level} value={level}>
                            {formatRiskLevel(level)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The risk level affects position sizing and stop-loss settings
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="target_markets"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel>Target Markets</FormLabel>
                      <FormDescription>
                        Select the markets this agent will trade in
                      </FormDescription>
                      <FormMessage />
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                      {availableMarkets.map((market: string) => (
                        <div key={market} className="flex items-start space-x-2">
                          <Checkbox
                            checked={isMarketSelected(market)}
                            onCheckedChange={() => handleMarketToggle(market)}
                            id={`market-${market}`}
                          />
                          <label
                            htmlFor={`market-${market}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {market.toUpperCase()}
                          </label>
                        </div>
                      ))}
                    </div>
                  </FormItem>
                )}
              />
            </div>
          )}
          
          {/* Step 3: Advanced Settings */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="text-center">
                <Activity className="mx-auto h-12 w-12 text-primary" />
                <h2 className="mt-2 text-xl font-semibold">Trading Parameters</h2>
                <p className="text-sm text-muted-foreground">Configure additional trading parameters</p>
              </div>
              
              <FormField
                control={form.control}
                name="capital_allocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capital Allocation (%)</FormLabel>
                    <div className="space-y-2">
                      <FormControl>
                        <Slider
                          min={1}
                          max={100}
                          step={1}
                          defaultValue={[field.value]}
                          onValueChange={(value: number[]) => field.onChange(value[0])}
                        />
                      </FormControl>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Conservative (1%)</span>
                        <span>Current: {field.value}%</span>
                        <span>Aggressive (100%)</span>
                      </div>
                    </div>
                    <FormDescription>
                      Percentage of available capital allocated to this agent
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="leverage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Leverage</FormLabel>
                    <div className="space-y-2">
                      <FormControl>
                        <Slider
                          min={1}
                          max={10}
                          step={1}
                          defaultValue={[field.value]}
                          onValueChange={(value: number[]) => field.onChange(value[0])}
                        />
                      </FormControl>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>1x</span>
                        <span>Current: {field.value}x</span>
                        <span>10x</span>
                      </div>
                    </div>
                    <FormDescription>
                      Maximum leverage that can be applied to positions
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="max_drawdown_percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum Drawdown (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        placeholder="20"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Agent will stop trading if drawdown exceeds this percentage
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="exchange_account_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exchange Account ID (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter exchange account ID" {...field} />
                    </FormControl>
                    <FormDescription>
                      Specify a particular exchange account to use, if any
                    </FormDescription>
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
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Auto-start trading</FormLabel>
                      <FormDescription>
                        If checked, the agent will start trading immediately after creation
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <div className="rounded-md border p-4">
                <div className="flex items-center justify-between pb-4">
                  <div className="space-y-0.5">
                    <h3 className="text-base font-semibold">Advanced Configuration</h3>
                    <p className="text-sm text-muted-foreground">
                      JSON configuration for advanced users
                    </p>
                  </div>
                  <Switch
                    checked={form.getValues('use_advanced_config')}
                    onCheckedChange={handleAdvancedConfigToggle}
                  />
                </div>
                
                {form.getValues('use_advanced_config') && (
                  <div className="space-y-4 pt-2">
                    <Textarea
                      id="json-config"
                      placeholder={`{\n  "example_param": "value",\n  "numeric_param": 123\n}`}
                      className="font-mono text-sm h-40"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const textarea = document.getElementById('json-config') as HTMLTextAreaElement;
                        if (textarea) {
                          applyJsonConfig(textarea.value);
                        }
                      }}
                    >
                      Apply Configuration
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Navigation and submit buttons */}
          <div className="flex justify-between pt-4">
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
              >
                Previous
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
              >
                Cancel
              </Button>
            )}
            
            {currentStep < 3 ? (
              <Button
                type="button"
                onClick={nextStep}
              >
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Agent'
                )}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
