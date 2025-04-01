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
          setFarms(farmsResponse.data);
          
          // Auto-select first farm if only one is available
          if (farmsResponse.data.length === 1) {
            form.setValue('farm_id', farmsResponse.data[0].id);
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
        farm_id: values.farm_id,
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
      
      console.log('Creating Eliza agent with data:', agentData);
      
      // First try our most direct approach - the eliza-direct endpoint
      try {
        const directResponse = await fetch('/api/agents/eliza-direct', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(agentData),
        });
        
        const responseData = await directResponse.json();
        
        if (directResponse.ok) {
          console.log('Eliza agent created successfully with direct approach:', responseData);
          toast({
            title: "Agent Created Successfully",
            description: `${responseData.agent.name} has been created and is initializing.`,
          });
          
          if (onSuccess) {
            onSuccess(responseData.agent);
          } else {
            // Navigate to the agent details page
            router.push(`/dashboard/agents/${responseData.agent.id}`);
          }
          return;
        } else {
          console.error(`Direct creation endpoint failed (${directResponse.status}):`, responseData.error);
        }
      } catch (directError) {
        console.error('Direct endpoint error:', directError);
      }
      
      // If direct approach failed, try the specialized Eliza endpoint
      try {
        const elizaResponse = await fetch('/api/agents/eliza-create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(agentData),
        });
        
        const responseData = await elizaResponse.json();
        
        if (elizaResponse.ok) {
          console.log('Eliza agent created successfully:', responseData);
          toast({
            title: "Agent Created Successfully",
            description: `${responseData.agent.name} has been created and is initializing.`,
          });
          
          if (onSuccess) {
            onSuccess(responseData.agent);
          } else {
            // Navigate to the agent details page
            router.push(`/dashboard/agents/${responseData.agent.id}`);
          }
          return;
        } else {
          console.error(`Eliza creation endpoint failed (${elizaResponse.status}):`, responseData.error);
        }
      } catch (elizaError) {
        console.error('Eliza endpoint error:', elizaError);
      }
      
      // Try with our fallback approaches if the Eliza-specific endpoints fail
      const fallbackEndpoints = [
        { name: 'basic create', url: '/api/agents/basic-create' },
        { name: 'direct insert', url: '/api/agents/direct-insert' },
        { name: 'custom create', url: '/api/agents/custom-create' },
      ];
      
      for (const endpoint of fallbackEndpoints) {
        try {
          console.log(`Attempting ${endpoint.name}...`);
          const response = await fetch(endpoint.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(agentData),
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log(`${endpoint.name} succeeded:`, data);
            
            toast({
              title: "Agent Created Successfully",
              description: `${data.agent.name} has been created, but some backend features may be limited.`,
            });
            
            if (onSuccess) {
              onSuccess(data.agent);
            } else {
              // Navigate to the agent details page
              router.push(`/dashboard/agents/${data.agent.id}`);
            }
            return;
          } else {
            const errorText = await response.text();
            console.error(`${endpoint.name} failed (${response.status}):`, errorText);
          }
        } catch (error) {
          console.error(`${endpoint.name} API error:`, error);
        }
      }
      
      // Last resort: original agent service
      console.log('Attempting original agent service...');
      const response = await agentService.createAgent(agentData);
      
      if (response.error) {
        console.error('Original service failed:', response.error);
        toast({
          variant: "destructive",
          title: "Agent Creation Failed",
          description: response.error,
        });
      } else if (response.data) {
        console.log('Original service succeeded:', response.data);
        toast({
          title: "Agent Created Successfully",
          description: `${response.data.name} has been created, but some backend features may be limited.`,
        });
        
        if (onSuccess) {
          onSuccess(response.data);
        } else {
          // Navigate to the agent details page
          router.push(`/dashboard/agents/${response.data.id}`);
        }
      } else {
        // If all else fails, show an error
        toast({
          variant: "destructive",
          title: "Agent Creation Failed",
          description: "All creation methods failed. Please try again later.",
        });
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
                      onValueChange={(value: string) => form.setValue('farm_id', parseInt(value))}
                      defaultValue={form.getValues('farm_id')?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
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
                      Select the farm where this agent will be deployed
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="strategy_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Strategy Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
            </div>
          )}
          
          {/* Step 2: Risk and Markets */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="text-center">
                <Globe className="mx-auto h-12 w-12 text-primary" />
                <h2 className="mt-2 text-xl font-semibold">Markets & Risk</h2>
                <p className="text-sm text-muted-foreground">Define where and how your agent will trade</p>
              </div>
              
              <FormField
                control={form.control}
                name="risk_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Risk Level</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select risk level" />
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
                      Set how aggressively your agent will trade
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
                      <FormLabel className="text-base">Target Markets</FormLabel>
                      <FormDescription>
                        Select the markets this agent will trade on
                      </FormDescription>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {availableMarkets.map((market: string) => (
                        <div key={market} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`market-${market}`}
                            checked={isMarketSelected(market)}
                            onCheckedChange={() => handleMarketToggle(market)}
                          />
                          <label
                            htmlFor={`market-${market}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {market}
                          </label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
          
          {/* Step 3: Advanced Configuration */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="text-center">
                <Activity className="mx-auto h-12 w-12 text-primary" />
                <h2 className="mt-2 text-xl font-semibold">Trading Configuration</h2>
                <p className="text-sm text-muted-foreground">Fine-tune your agent's trading parameters</p>
              </div>
              
              <FormField
                control={form.control}
                name="capital_allocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capital Allocation (%)</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Slider
                          min={1}
                          max={100}
                          step={1}
                          defaultValue={[field.value || 10]}
                          onValueChange={(vals) => field.onChange(vals[0])}
                        />
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">1%</span>
                          <span className="text-xs font-medium">{field.value || 10}%</span>
                          <span className="text-xs text-muted-foreground">100%</span>
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Percentage of farm capital allocated to this agent
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
                    <FormControl>
                      <div className="space-y-2">
                        <Slider
                          min={1}
                          max={10}
                          step={1}
                          defaultValue={[field.value || 1]}
                          onValueChange={(vals) => field.onChange(vals[0])}
                        />
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">1x</span>
                          <span className="text-xs font-medium">{field.value || 1}x</span>
                          <span className="text-xs text-muted-foreground">10x</span>
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Maximum leverage the agent can use
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
                    <FormLabel>Max Drawdown (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        {...field}
                        placeholder="25"
                      />
                    </FormControl>
                    <FormDescription>
                      Maximum allowed drawdown before agent stops trading
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="auto_start"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Auto-start Agent</FormLabel>
                      <FormDescription>
                        Start trading immediately after creation
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
            </div>
          )}
          
          {/* Form navigation */}
          <div className="flex justify-between pt-4">
            {currentStep > 1 ? (
              <Button 
                type="button" 
                variant="outline" 
                onClick={prevStep}
                disabled={isCreating}
              >
                Back
              </Button>
            ) : (
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                disabled={isCreating}
              >
                Cancel
              </Button>
            )}
            
            {currentStep < 3 ? (
              <Button 
                type="button" 
                onClick={nextStep}
                disabled={isCreating}
              >
                Next <ChevronRight className="ml-2 h-4 w-4" />
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
                  <>Create Agent</>
                )}
              </Button>
            )}
          </div>
          
          {/* Step indicator */}
          <div className="flex justify-center gap-2 pt-2">
            {[1, 2, 3].map((step) => (
              <div 
                key={step}
                className={`w-3 h-3 rounded-full ${
                  currentStep === step 
                    ? 'bg-primary' 
                    : currentStep > step 
                      ? 'bg-primary/60' 
                      : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </form>
      </Form>
    </div>
  );
}
