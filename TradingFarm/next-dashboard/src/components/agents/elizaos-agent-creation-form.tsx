// @ts-nocheck
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/utils/supabase/client';
import { 
  Bot, 
  Landmark, 
  BarChart2, 
  Activity, 
  Globe, 
  AlertTriangle, 
  Check, 
  Loader2,
  ChevronRight,
  BrainCircuit,
  Settings,
  Wrench,
  Key,
  Code,
  ArrowRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { agentService, AgentCreationRequest } from '@/services/agent-service';
import { elizaAgentService } from '@/services/eliza-agent-service';
import { toolService, AgentTool } from '@/services/tool-service';
import { llmService, LLMConfig, LLMModel, LLMProvider } from '@/services/llm-service';
import { mockFarms, mockMarkets, mockTools, mockStrategyTypes } from '@/services/mock-data-service';
import { useElizaAgentsWithFallback } from '@/hooks/useElizaAgentsWithFallback';

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

// Define the form schema with Zod
const formSchema = z.object({
  // Basic Information
  name: z.string().min(3, { message: "Agent name must be at least 3 characters." }),
  description: z.string().optional(),
  farm_id: z.coerce.number({ required_error: "Please select a farm." }),
  type: z.string().default('eliza'),
  
  // Trading Configuration
  strategy_type: z.string({ required_error: "Please select a strategy type." }),
  risk_level: z.string({ required_error: "Please select a risk level." }),
  target_markets: z.array(z.string()).min(1, { message: "Select at least one market." }),
  exchange_account_id: z.string().optional(),
  max_drawdown_percent: z.coerce.number().min(1).max(100).optional(),
  
  // Advanced Settings
  auto_start: z.boolean().default(false),
  use_advanced_config: z.boolean().default(false),
  capital_allocation: z.coerce.number().min(1).max(100).default(10),
  leverage: z.coerce.number().min(1).max(10).default(1),
  
  // ElizaOS Specific
  instructions: z.string().optional(),
  
  // LLM Configuration
  llm_provider: z.string().optional(),
  llm_model: z.string().optional(),
  llm_config: z.record(z.any()).optional(),
  
  // Tools 
  selected_tools: z.array(z.string()).optional(),
  tools_config: z.record(z.any()).optional(),
  
  // Additional configuration
  config: z.record(z.any()).optional(),
});

// Types
type FormValues = z.infer<typeof formSchema>;
type FarmType = { id: number; name: string };

interface ElizaOSAgentCreationFormProps {
  onSuccess?: (agent: any) => void;
  onCancel?: () => void;
  redirectAfterSuccess?: boolean;
  defaultValues?: Partial<FormValues>;
  initialFarm?: number;
}

export const ElizaOSAgentCreationForm = ({ onSuccess, onCancel, redirectAfterSuccess, defaultValues, initialFarm }: ElizaOSAgentCreationFormProps) => {
  // Initialize Supabase client
  const supabase = createBrowserClient();

  // Form state
  const [strategyTypes, setStrategyTypes] = React.useState<string[]>([]);
  const [farms, setFarms] = React.useState<any[]>([]);
  const [markets, setMarkets] = React.useState<string[]>([]);
  const [tools, setTools] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isCreating, setIsCreating] = React.useState(false);
  const [selectedTools, setSelectedTools] = React.useState<string[]>([]);
  const [usingMockData, setUsingMockData] = React.useState(false);
  const router = useRouter();
  const { createAgent } = useElizaAgentsWithFallback();
  const [availableModels, setAvailableModels] = React.useState<{[key in LLMProvider]: LLMModel[]}>({
    'openai': ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
    'anthropic': ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    'google': ['gemini-pro', 'gemini-flash'],
    'local': ['llama-3', 'local-mistral', 'ollama-custom']
  });

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      llm_provider: 'openai' as LLMProvider,
      llm_model: 'gpt-4o',
      strategy_type: 'momentum',
      risk_level: 'medium',
      target_markets: ['BTC/USD'],
      auto_start: false,
      max_drawdown_percent: 20,
      capital_allocation: 10,
      leverage: 1,
      use_advanced_config: false,
      selected_tools: [],
    },
  });

  // Load data from props if provided
  React.useEffect(() => {
    // If initial values are provided, set them in the form
    if (defaultValues) {
      Object.entries(defaultValues).forEach(([key, value]) => {
        if (value !== undefined) {
          form.setValue(key as any, value);
        }
      });
    }
    
    // If initialFarm is provided, set it
    if (initialFarm) {
      form.setValue('farm_id', initialFarm);
    }
  }, [defaultValues, initialFarm, form]);

  // Fetch form data on component mount
  React.useEffect(() => {
    fetchFormData();
  }, []);

  // Helper to fetch farms, markets, and strategy types for form dropdowns
  async function fetchFormData() {
    setLoading(true);
    try {
      // Fetch farms
      const { data: farmsData, error: farmsError } = await supabase
        .from('farms')
        .select('id, name');

      if (farmsError) {
        console.error('Error fetching farms:', farmsError);
        setFarms(mockFarms);
        setUsingMockData(true);
      } else {
        setFarms(farmsData || []);
      }

      // Fetch markets
      const { data: marketsData, error: marketsError } = await supabase
        .from('markets')
        .select('symbol');

      if (marketsError) {
        console.error('Error fetching markets:', marketsError);
        setMarkets(mockMarkets.map((m: any) => m.symbol));
        setUsingMockData(true);
      } else {
        setMarkets(marketsData?.map((m: any) => m.symbol) || []);
      }

      // Fetch strategy types
      const { data: strategiesData, error: strategiesError } = await supabase
        .from('strategy_types')
        .select('name');

      if (strategiesError) {
        console.error('Error fetching strategy types:', strategiesError);
        setStrategyTypes(mockStrategyTypes.map((s: any) => s.name));
        setUsingMockData(true);
      } else {
        setStrategyTypes(strategiesData?.map((s: any) => s.name) || []);
      }

      // Fetch tools
      const { data: toolsData, error: toolsError } = await supabase
        .from('eliza_tools')
        .select('*');

      if (toolsError) {
        console.error('Error fetching tools:', toolsError);
        setTools(mockTools);
        setUsingMockData(true);
      } else {
        setTools(toolsData || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      // Use mock data as fallback
      setFarms(mockFarms);
      setMarkets(mockMarkets.map(m => m.symbol));
      setTools(mockTools);
      setStrategyTypes(mockStrategyTypes.map(s => s.name));
      setUsingMockData(true);
    } finally {
      setLoading(false);
    }
  }

  // Submit form data to create an ElizaOS agent
  const onSubmit = async (data: FormValues) => {
    setIsCreating(true);
    try {
      // Prepare agent data with selected tools
      const agentData = {
        ...data,
        tools: selectedTools,
      };

      // Try to create agent using our robust hook first
      try {
        const agent = await createAgent({
          name: data.name,
          description: data.description || '',
          config: {
            agentType: 'elizaos',
            farmId: data.farm_id,
            riskLevel: data.risk_level,
            strategyType: data.strategy_type,
            markets: data.target_markets,
            tools: selectedTools,
            apiAccess: data.exchange_account_id,
            tradingPermissions: data.max_drawdown_percent,
            autoRecovery: data.auto_start,
            initialInstructions: data.instructions || '',
          }
        });

        toast({
          title: 'Agent Created',
          description: `${data.name} has been created successfully`,
        });

        // Reset form after successful creation
        form.reset();
        setSelectedTools([]);

        // Call onSuccess callback if provided
        if (onSuccess) {
          onSuccess(agent);
        }

        // Redirect if specified
        if (redirectAfterSuccess) {
          router.push('/dashboard/eliza-agents');
        }
        
        return;
      } catch (agentCreateError) {
        console.error('Error using createAgent hook:', agentCreateError);
        // Fall through to try direct API call
      }

      // Fallback to direct API call if hook fails
      const response = await fetch('/api/elizaos/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agentData),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const result = await response.json();

      toast({
        title: 'Agent Created',
        description: `${data.name} has been created successfully`,
      });

      // Reset form after successful creation
      form.reset();
      setSelectedTools([]);

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess(result.agent);
      }

      // Redirect if specified
      if (redirectAfterSuccess) {
        router.push('/dashboard/eliza-agents');
      }
    } catch (error) {
      console.error('Error creating agent:', error);
      toast({
        title: 'Creation Failed',
        description: error instanceof Error ? error.message : 'Failed to create agent',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Render form
  return (
    <div className="space-y-6">
      {/* Demo Mode Banner */}
      {usingMockData && (
        <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-md">
          <h3 className="font-medium text-amber-800">Demo Mode Active</h3>
          <p className="text-sm text-amber-700 mt-1">
            Using example data because you're not authenticated or the server connection failed.
            The agent will be saved to temporary storage only.
          </p>
        </div>
      )}
      
      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-sm text-muted-foreground">Loading form data...</p>
          </div>
        </div>
      )}
      
      {/* Form */}
      {!loading && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-6 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Agent Details</CardTitle>
                  <CardDescription>
                    Basic information about your ElizaOS trading agent
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Agent Name */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Agent Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., BTC Momentum Trader" {...field} />
                        </FormControl>
                        <FormDescription>
                          Give your agent a descriptive name that reflects its purpose.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Description */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe what this agent does, its strategy, and any other important details..."
                            className="min-h-[80px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          A detailed description helps you remember the agent's purpose.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Farm Selection */}
                  <FormField
                    control={form.control}
                    name="farm_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assign to Farm</FormLabel>
                        <Select 
                          onValueChange={(value: string) => field.onChange(parseInt(value))}
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a farm" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {farms.length > 0 ? (
                              farms.map((farm: any) => (
                                <SelectItem key={farm.id} value={farm.id.toString()}>
                                  {farm.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="0" disabled>
                                No farms available
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          The farm this agent will belong to and collaborate with other agents.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Auto-start Switch */}
                  <FormField
                    control={form.control}
                    name="auto_start"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Auto-start Agent
                          </FormLabel>
                          <FormDescription>
                            Automatically activate the agent after creation
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
                </CardContent>
                <CardFooter className="flex justify-between">
                  {onCancel && (
                    <Button variant="outline" onClick={onCancel}>
                      Cancel
                    </Button>
                  )}
                  <Button
                    type="button"
                    onClick={() => setActiveTab('trading')}
                  >
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* Trading Configuration Tab */}
            <TabsContent value="trading" className="space-y-6 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Trading Configuration</CardTitle>
                  <CardDescription>
                    Configure the trading parameters for your agent
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Strategy Type */}
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
                            {strategyTypes.length > 0 ? (
                              strategyTypes.map((type: string) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))
                            ) : (
                              <>
                                <SelectItem value="trend_following">Trend Following</SelectItem>
                                <SelectItem value="mean_reversion">Mean Reversion</SelectItem>
                                <SelectItem value="momentum">Momentum</SelectItem>
                                <SelectItem value="breakout">Breakout</SelectItem>
                                <SelectItem value="market_making">Market Making</SelectItem>
                                <SelectItem value="arbitrage">Arbitrage</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          The trading strategy this agent will implement
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Risk Level */}
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
                            {['low', 'medium', 'high'].map((level: string) => (
                              <SelectItem key={level} value={level}>
                                {level}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Determines position sizing and risk management parameters
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Target Markets */}
                  <FormField
                    control={form.control}
                    name="target_markets"
                    render={() => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel className="text-base">Target Markets</FormLabel>
                          <FormDescription>
                            Select the markets this agent will trade
                          </FormDescription>
                        </div>
                        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                          {markets.map((market: string) => (
                            <FormField
                              key={market}
                              control={form.control}
                              name="target_markets"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={market}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(market)}
                                        onCheckedChange={(checked: boolean) => {
                                          return checked
                                            ? field.onChange([...field.value, market])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== market
                                                )
                                              )
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                      {market}
                                    </FormLabel>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Max Drawdown */}
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
                            placeholder="e.g., 20"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Maximum drawdown percentage allowed before the agent stops trading
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Capital Allocation */}
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
                              defaultValue={[field.value]}
                              onValueChange={(vals) => field.onChange(vals[0])}
                            />
                            <div className="flex justify-between">
                              <span className="text-xs text-muted-foreground">1%</span>
                              <span className="text-xs font-medium">{field.value}%</span>
                              <span className="text-xs text-muted-foreground">100%</span>
                            </div>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Percentage of farm's capital this agent can use
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Leverage */}
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
                              defaultValue={[field.value]}
                              onValueChange={(vals) => field.onChange(vals[0])}
                            />
                            <div className="flex justify-between">
                              <span className="text-xs text-muted-foreground">1x</span>
                              <span className="text-xs font-medium">{field.value}x</span>
                              <span className="text-xs text-muted-foreground">10x</span>
                            </div>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Maximum leverage the agent can use in its trades
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Advanced Configuration Switch */}
                  <FormField
                    control={form.control}
                    name="use_advanced_config"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Advanced Configuration
                          </FormLabel>
                          <FormDescription>
                            Enable additional configuration options
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

                  {/* Advanced Configuration Fields (conditional) */}
                  {form.watch('use_advanced_config') && (
                    <div className="pt-4 space-y-4">
                      <h3 className="text-sm font-medium">Advanced Configuration</h3>
                      <p className="text-sm text-muted-foreground">Additional configuration options will go here.</p>
                      {/* Additional fields can be added here as needed */}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab('basic')}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setActiveTab('ai')}
                  >
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* AI & LLM Tab */}
            <TabsContent value="ai" className="space-y-6 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>AI & Language Model Configuration</CardTitle>
                  <CardDescription>
                    Configure the AI capabilities of your ElizaOS agent
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Agent Instructions */}
                  <FormField
                    control={form.control}
                    name="instructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Agent Instructions</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Provide detailed instructions for your agent..."
                            className="min-h-[160px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Instructions guide your agent's behavior and decision-making.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* LLM Provider */}
                  <FormField
                    control={form.control}
                    name="llm_provider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>LLM Provider</FormLabel>
                        <Select 
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a provider" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="openai">OpenAI</SelectItem>
                            <SelectItem value="anthropic">Anthropic</SelectItem>
                            <SelectItem value="google">Google</SelectItem>
                            <SelectItem value="local">Local Models</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          The AI provider that will power your agent's intelligence
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* LLM Model */}
                  <FormField
                    control={form.control}
                    name="llm_model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>LLM Model</FormLabel>
                        <Select 
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a model" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {selectedProvider && 
                              availableModels[selectedProvider as LLMProvider]?.map((model: string) => (
                                <SelectItem key={model} value={model}>
                                  {model}
                                </SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          The specific model your agent will use for reasoning
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Additional LLM options could be added here */}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab('trading')}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setActiveTab('tools')}
                  >
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* Tools Tab */}
            <TabsContent value="tools" className="space-y-6 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Agent Tools</CardTitle>
                  <CardDescription>
                    Configure the tools and capabilities your agent can use
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Tool Selection */}
                  <FormField
                    control={form.control}
                    name="selected_tools"
                    render={() => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel className="text-base">Available Tools</FormLabel>
                          <FormDescription>
                            Select the tools this agent can use
                          </FormDescription>
                        </div>
                        <ScrollArea className="h-[300px] rounded-md border p-4">
                          <div className="space-y-4">
                            {availableTools.map((tool: any) => (
                              <FormField
                                key={tool.id}
                                control={form.control}
                                name="selected_tools"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={tool.id}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(tool.id)}
                                          onCheckedChange={(checked: boolean) => {
                                            return checked
                                              ? field.onChange([...field.value || [], tool.id])
                                              : field.onChange(
                                                  field.value?.filter(
                                                    (value) => value !== tool.id
                                                  )
                                                )
                                          }}
                                        />
                                      </FormControl>
                                      <div className="space-y-1 leading-none">
                                        <FormLabel className="font-medium">
                                          {tool.name}
                                        </FormLabel>
                                        <p className="text-sm text-muted-foreground">
                                          {tool.description || `A ${tool.tool_type} tool`}
                                        </p>
                                      </div>
                                    </FormItem>
                                  )
                                }}
                              />
                            ))}
                          </div>
                        </ScrollArea>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab('ai')}
                  >
                    Back
                  </Button>
                  <Button 
                    type="submit"
                    disabled={isCreating}
                  >
                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Agent
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </form>
          </Form>
      )}
      </Tabs>
    </div>
  );

};
