'use client';

import React from 'react';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { createBrowserClient } from '@/utils/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { 
  Bot, 
  Sparkles,
  PlusCircle, 
  Loader2,
  CheckCircle2,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';

// Hooks
import { useElizaAgentsWithFallback } from '@/hooks/useElizaAgentsWithFallback';
import { agentService } from '@/services/agent-service';
// Import mock data for fallback
import { mockFarms, mockMarkets, mockStrategyTypes } from '@/services/mock-data-service';

// Schema for form validation
const formSchema = z.object({
  name: z.string().min(3, { message: "Agent name must be at least 3 characters" }),
  farm_id: z.coerce.number({ required_error: "Please select a farm" }),
  agent_type: z.enum(["standard", "eliza"], { required_error: "Please select an agent type" }),
  description: z.string().optional(),
  risk_level: z.enum(["low", "medium", "high"], { required_error: "Please select a risk level" }),
  strategy_type: z.string().min(1, { message: "Please select a strategy type" }),
  target_markets: z.array(z.string()).min(1, { message: "Please select at least one market" }),
  // ElizaOS specific fields
  apiAccess: z.boolean().default(false).optional(),
  tradingPermissions: z.string().default("read").optional(),
  autoRecovery: z.boolean().default(true).optional(),
  initialInstructions: z.string().optional(),
  // Standard agent specific fields
  auto_start: z.boolean().default(false).optional(),
  capital_allocation: z.coerce.number().min(1).max(100).default(10).optional(),
  leverage: z.coerce.number().min(1).max(10).default(1).optional(),
});

// Type for form values
type FormValues = z.infer<typeof formSchema>;

// Props for the dialog component
interface UnifiedAgentCreationDialogProps {
  farmId?: number;
  onSuccess?: (agent: any) => void;
  buttonText?: string;
  className?: string;
}

export function UnifiedAgentCreationDialog({
  farmId,
  onSuccess,
  buttonText = "Create Agent",
  className
}: UnifiedAgentCreationDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState(1);
  const [selectedMarkets, setSelectedMarkets] = React.useState<string[]>(['BTC-USD']);
  const [availableMarkets, setAvailableMarkets] = React.useState<string[]>([]);
  const [strategyTypes, setStrategyTypes] = React.useState<string[]>([]);
  const [farms, setFarms] = React.useState<{ id: number, name: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [usingMockData, setUsingMockData] = React.useState(false);
  const router = useRouter();
  // Use the robust hook with fallback
  const { createAgent: createElizaAgent } = useElizaAgentsWithFallback();
  const supabase = createBrowserClient();

  const defaultAgent = farmId 
    ? { farm_id: farmId, agent_type: "standard", risk_level: "medium" }
    : { agent_type: "standard", risk_level: "medium" };

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultAgent as any,
  });

  // Watch the agent type to conditionally show fields
  const agentType = form.watch("agent_type");

  // Fetch farms, markets, and strategy types
  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch farms
        const { data: farmData, error: farmError } = await supabase
          .from('farms')
          .select('id, name')
          .order('name');

        if (farmError) {
          console.error('Error fetching farms:', farmError);
          toast({
            title: 'Error',
            description: 'Failed to load farms data',
            variant: 'destructive',
          });
          // Fallback farms data
          setFarms([
            { id: 1, name: 'Bitcoin Momentum Farm' },
            { id: 2, name: 'Altcoin Swing Trader' },
            { id: 3, name: 'DeFi Yield Farm' }
          ]);
        } else {
          setFarms(farmData);
        }

        // Fetch strategy types
        let strategyTypesArray = [];
        try {
          const response = await agentService.getStrategyTypes();
          if (response.data) {
            strategyTypesArray = response.data;
          }
        } catch (error) {
          console.error('Error fetching strategy types:', error);
          // Fallback strategy types
          strategyTypesArray = ['momentum', 'swing', 'yield', 'arbitrage', 'mean_reversion', 'trend_following'];
        }
        setStrategyTypes(strategyTypesArray);

        // Fetch or fallback to hardcoded markets
        try {
          const { data: marketData, error: marketError } = await supabase
            .from('markets')
            .select('symbol')
            .eq('is_active', true)
            .order('symbol');

          if (marketError) {
            throw new Error('Failed to fetch markets');
          }
          setAvailableMarkets(marketData.map(m => m.symbol));
        } catch (error) {
          console.error('Error fetching markets:', error);
          // Fallback markets
          setAvailableMarkets([
            'BTC-USD', 'ETH-USD', 'SOL-USD', 'AVAX-USD', 'MATIC-USD',
            'DOT-USD', 'ADA-USD', 'XRP-USD', 'DOGE-USD', 'LINK-USD'
          ]);
        }
      } catch (err) {
        console.error("Error fetching initial form data:", err);
        // Use mock data as fallback
        setFarms([
          { id: 1, name: 'Demo Farm 1' },
          { id: 2, name: 'Demo Farm 2' },
          { id: 3, name: 'Demo Farm 3' }
        ]);
        setStrategyTypes(['momentum', 'mean_reversion', 'trend_following']);
        setAvailableMarkets(['BTC-USD', 'ETH-USD', 'SOL-USD', 'AVAX-USD']);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [open]);

  // Toggle market selection
  const handleMarketToggle = (market: string) => {
    setSelectedMarkets(prevMarkets => {
      if (prevMarkets.includes(market)) {
        return prevMarkets.filter(m => m !== market);
      } else {
        return [...prevMarkets, market];
      }
    });
    
    // Update form value
    form.setValue('target_markets', selectedMarkets);
  };

  // Check if a market is selected
  const isMarketSelected = (market: string) => {
    return selectedMarkets.includes(market);
  };

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    console.log("Form submitted with values:", values);
    
    try {
      console.log('Creating agent with values:', values);
      
      // Ensure selected markets are in the form values
      values.target_markets = selectedMarkets;
      
      let agent;
      
      if (values.agent_type === 'eliza') {
        // Create ElizaOS agent
        agent = await createElizaAgent({
          name: values.name,
          farmId: values.farm_id,
          agentType: values.strategy_type,
          riskLevel: values.risk_level,
          targetMarkets: values.target_markets,
          apiAccess: values.apiAccess || false,
          tradingPermissions: values.tradingPermissions || 'read',
          autoRecovery: values.autoRecovery || true,
          initialInstructions: values.initialInstructions || '',
        });
      } else {
        // Create standard agent
        const response = await agentService.createAgent({
          name: values.name,
          farm_id: values.farm_id,
          description: values.description || '',
          strategy_type: values.strategy_type,
          risk_level: values.risk_level,
          target_markets: values.target_markets,
          auto_start: values.auto_start || false,
          capital_allocation: values.capital_allocation || 10,
          leverage: values.leverage || 1,
        });
        
        agent = response.data;
      }
      
      toast({
        title: 'Agent Created',
        description: `${values.name} has been created successfully.`,
      });
      
      setOpen(false);
      setCurrentStep(1);
      
      // Reset form
      form.reset();
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess(agent);
      } else {
        // Refresh the page
        setTimeout(() => {
          router.refresh();
        }, 500);
      }
    } catch (error: any) {
      console.error('Error creating agent:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create agent',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Navigate to next step
  const nextStep = () => {
    const currentValues = form.getValues();
    let isValid = true;
    
    if (currentStep === 1) {
      // Validate fields in step 1
      if (!currentValues.name || currentValues.name.length < 3) {
        form.setError('name', { message: 'Name must be at least 3 characters' });
        isValid = false;
      }
      
      if (!currentValues.farm_id) {
        form.setError('farm_id', { message: 'Please select a farm' });
        isValid = false;
      }
      
      if (!currentValues.agent_type) {
        form.setError('agent_type', { message: 'Please select an agent type' });
        isValid = false;
      }
    } else if (currentStep === 2) {
      // Validate fields in step 2
      if (!currentValues.strategy_type) {
        form.setError('strategy_type', { message: 'Please select a strategy type' });
        isValid = false;
      }
      
      if (!currentValues.risk_level) {
        form.setError('risk_level', { message: 'Please select a risk level' });
        isValid = false;
      }
      
      if (!selectedMarkets.length) {
        form.setError('target_markets', { message: 'Please select at least one market' });
        isValid = false;
      } else {
        form.setValue('target_markets', selectedMarkets);
      }
    }
    
    if (isValid) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  // Navigate to previous step
  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button id="create-agent-trigger" className={className}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Agent</DialogTitle>
          <DialogDescription>
            Configure your new trading agent to automate your trading strategies.
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4 mt-2">
          <div className="flex justify-between text-sm">
            <div className={`flex items-center ${currentStep >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-primary mr-2">
                {currentStep > 1 ? <CheckCircle2 className="h-4 w-4" /> : "1"}
              </div>
              <span>Basics</span>
            </div>
            <div className={`flex items-center ${currentStep >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-primary mr-2">
                {currentStep > 2 ? <CheckCircle2 className="h-4 w-4" /> : "2"}
              </div>
              <span>Strategy</span>
            </div>
            <div className={`flex items-center ${currentStep >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-primary mr-2">
                {currentStep > 3 ? <CheckCircle2 className="h-4 w-4" /> : "3"}
              </div>
              <span>Configuration</span>
            </div>
          </div>
          <div className="mt-2 h-2 rounded-full bg-muted">
            <div 
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${(currentStep / 3) * 100}%` }}
            />
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Only show the form when not loading */}
            {!loading && (
              <>
                {/* Step 1: Basic Information */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    {/* Agent Type Selection */}
                    <FormField
                      control={form.control}
                      name="agent_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Agent Type</FormLabel>
                          <div className="grid grid-cols-2 gap-4 pt-2">
                            <Card 
                              className={`cursor-pointer transition-all ${field.value === 'standard' ? 'ring-2 ring-primary' : 'hover:border-muted-foreground'}`}
                              onClick={() => form.setValue('agent_type', 'standard')}
                            >
                              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                <Bot className="h-12 w-12 mb-2 text-primary" />
                                <h3 className="font-medium">Standard Agent</h3>
                                <p className="text-sm text-muted-foreground mt-1">Basic trading bot with customizable strategies</p>
                              </CardContent>
                            </Card>
                            
                            <Card 
                              className={`cursor-pointer transition-all ${field.value === 'eliza' ? 'ring-2 ring-primary' : 'hover:border-muted-foreground'}`}
                              onClick={() => form.setValue('agent_type', 'eliza')}
                            >
                              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                <Sparkles className="h-12 w-12 mb-2 text-primary" />
                                <h3 className="font-medium">ElizaOS Agent</h3>
                                <p className="text-sm text-muted-foreground mt-1">Advanced AI-powered trading with language capabilities</p>
                              </CardContent>
                            </Card>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
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
                            A descriptive name for your trading agent
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
                              placeholder="Describe what this agent does..."
                              className="resize-y"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Brief overview of the agent's purpose and strategy
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
                          <FormLabel>Farm</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            defaultValue={field.value?.toString()}
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a farm" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {farms.map((farm) => (
                                <SelectItem key={farm.id} value={farm.id.toString()}>
                                  {farm.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            The trading farm this agent will belong to
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
                    {/* Strategy Type */}
                    <FormField
                      control={form.control}
                      name="strategy_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Strategy Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select strategy type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {strategyTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            The type of trading strategy this agent will use
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select risk level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">
                                <div className="flex items-center">
                                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 mr-2">Low</Badge>
                                  Conservative strategy with minimal risk
                                </div>
                              </SelectItem>
                              <SelectItem value="medium">
                                <div className="flex items-center">
                                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300 mr-2">Medium</Badge>
                                  Balanced approach to risk and reward
                                </div>
                              </SelectItem>
                              <SelectItem value="high">
                                <div className="flex items-center">
                                  <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 mr-2">High</Badge>
                                  Aggressive strategy with higher potential returns
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            The level of risk this agent will take in its trading decisions
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
                          <FormLabel>Target Markets</FormLabel>
                          <FormControl>
                            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                              {availableMarkets.map((market) => (
                                <Badge
                                  key={market}
                                  variant={isMarketSelected(market) ? "default" : "outline"}
                                  className={`cursor-pointer ${isMarketSelected(market) ? "bg-primary" : ""} px-3 py-2 text-center`}
                                  onClick={() => handleMarketToggle(market)}
                                >
                                  {market}
                                </Badge>
                              ))}
                            </div>
                          </FormControl>
                          <FormDescription>
                            Select the markets this agent will trade in
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
                
                {/* Step 3: Advanced Configuration */}
                {currentStep === 3 && (
                  <div className="space-y-4">
                    {/* Show different configuration based on agent type */}
                    {agentType === 'standard' ? (
                      <>
                        {/* Standard Agent Configuration */}
                        <FormField
                          control={form.control}
                          name="auto_start"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Auto Start</FormLabel>
                                <FormDescription>
                                  Automatically start trading when the agent is created
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
                          name="capital_allocation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Capital Allocation (%)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={1}
                                  max={100}
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                Percentage of farm capital to allocate to this agent
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
                              <FormLabel>Leverage (1-10x)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={1}
                                  max={10}
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                Maximum leverage the agent can use for trading
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    ) : (
                      <>
                        {/* ElizaOS Agent Configuration */}
                        <FormField
                          control={form.control}
                          name="apiAccess"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">API Access</FormLabel>
                                <FormDescription>
                                  Allow the agent to access external APIs
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
                          name="tradingPermissions"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Trading Permissions</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                disabled={!form.getValues('apiAccess')}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select permissions" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="read">Read Only</SelectItem>
                                  <SelectItem value="suggest">Suggest Trades</SelectItem>
                                  <SelectItem value="execute">Execute Trades</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                What trading actions the agent can perform
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="autoRecovery"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Auto Recovery</FormLabel>
                                <FormDescription>
                                  Automatically restart the agent if it encounters an error
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
                          name="initialInstructions"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Initial Instructions</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Enter any specific instructions for this agent..."
                                  className="resize-y min-h-[100px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                Optional instructions to guide the agent's behavior
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                  </div>
                )}
                
                {/* Navigation and submit buttons */}
                <DialogFooter className="flex justify-between">
                  {currentStep > 1 ? (
                    <Button type="button" variant="outline" onClick={prevStep}>
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                  )}
                  
                  {currentStep < 3 ? (
                    <Button type="button" onClick={nextStep}>
                      Next
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create Agent'
                      )}
                    </Button>
                  )}
                </DialogFooter>
              </>
            )}
            
            {/* Show a loader while fetching initial data */}
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                  <p className="mt-2 text-sm text-muted-foreground">Loading agent data...</p>
                </div>
              </div>
            )}
          </form>
        </Form>
      </DialogContent>
    </DialogPrimitive.Root>
  );
}
