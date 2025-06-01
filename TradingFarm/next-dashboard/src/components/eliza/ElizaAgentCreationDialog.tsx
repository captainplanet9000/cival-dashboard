'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { createBrowserClient } from '@/utils/supabase/client';
import { toast } from '@/components/ui/use-toast';
import * as DialogPrimitive from "@radix-ui/react-dialog";

// UI Components
import { Button } from '@/components/ui/button';
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { PlusCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

// Hooks and Services
import { useElizaAgents } from '@/hooks/useElizaAgents';

// Schema for form validation
const formSchema = z.object({
  name: z.string().min(3, { message: "Agent name must be at least 3 characters" }),
  farmId: z.coerce.number({ required_error: "Please select a farm" }),
  agentType: z.string().min(1, { message: "Please select an agent type" }),
  riskLevel: z.enum(["low", "medium", "high"], { required_error: "Please select a risk level" }),
  targetMarkets: z.array(z.string()).min(1, { message: "Please select at least one market" }),
  apiAccess: z.boolean().default(false),
  tradingPermissions: z.string().default("read"),
  autoRecovery: z.boolean().default(true),
  initialInstructions: z.string().optional(),
});

// Type for form values
type FormValues = z.infer<typeof formSchema>;

// Props for the dialog component
interface ElizaAgentCreationDialogProps {
  farmId?: number;
  onSuccess?: () => void;
  buttonText?: string;
  className?: string;
}

export function ElizaAgentCreationDialog({
  farmId,
  onSuccess,
  buttonText = "Create ElizaOS Agent",
  className
}: ElizaAgentCreationDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedMarkets, setSelectedMarkets] = React.useState<string[]>(['BTC-USD']);
  const [availableMarkets, setAvailableMarkets] = React.useState<string[]>([]);
  const [farms, setFarms] = React.useState<{ id: number, name: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();
  const { createAgent } = useElizaAgents();
  const supabase = createBrowserClient();

  // Fetch farms and markets data from backend
  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch farms from the database
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
        } else {
          setFarms(farmData);
        }

        // Fetch available markets from the database or API
        const { data: marketData, error: marketError } = await supabase
          .from('markets')
          .select('symbol')
          .eq('is_active', true)
          .order('symbol');

        if (marketError) {
          console.error('Error fetching markets:', marketError);
          // Fallback to hardcoded markets if database fetch fails
          setAvailableMarkets([
            'BTC-USD', 'ETH-USD', 'SOL-USD', 'AVAX-USD', 'MATIC-USD',
            'DOT-USD', 'ADA-USD', 'XRP-USD', 'DOGE-USD', 'LINK-USD'
          ]);
        } else {
          const marketSymbols = marketData.map((market: { symbol: string }) => market.symbol);
          setAvailableMarkets(marketSymbols.length > 0 ? marketSymbols : [
            'BTC-USD', 'ETH-USD', 'SOL-USD', 'AVAX-USD', 'MATIC-USD',
            'DOT-USD', 'ADA-USD', 'XRP-USD', 'DOGE-USD', 'LINK-USD'
          ]);
        }
      } catch (error) {
        console.error('Error in data fetching:', error);
        toast({
          title: 'Error',
          description: 'Failed to load configuration data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchData();
    }
  }, [open, supabase]);

  // Initialize form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      farmId: farmId || undefined,
      agentType: 'trading',
      riskLevel: 'medium',
      targetMarkets: ['BTC-USD'],
      apiAccess: false,
      tradingPermissions: 'read',
      autoRecovery: true,
      initialInstructions: '',
    }
  });

  // Toggle market selection
  const handleMarketToggle = (market: string) => {
    if (selectedMarkets.includes(market)) {
      const filtered = selectedMarkets.filter((m: string) => m !== market);
      setSelectedMarkets(filtered);
      form.setValue('targetMarkets', filtered);
    } else {
      const updated = [...selectedMarkets, market];
      setSelectedMarkets(updated);
      form.setValue('targetMarkets', updated);
    }
  };

  // Check if a market is selected
  const isMarketSelected = (market: string) => {
    return selectedMarkets.includes(market);
  };

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    
    try {
      await createAgent(
        values.name,
        values.farmId,
        {
          agentType: values.agentType,
          markets: values.targetMarkets,
          riskLevel: values.riskLevel,
          apiAccess: values.apiAccess,
          tradingPermissions: values.tradingPermissions,
          autoRecovery: values.autoRecovery
        }
      );
      
      setOpen(false);
      form.reset();
      
      // Wait for dialog to close
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else {
          // Refresh the current page
          router.refresh();
        }
      }, 500);
      
    } catch (error) {
      // Error handling is done in the hook
      console.error('Failed to create ElizaOS agent:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <Button className={className}>
          {buttonText}
        </Button>
      </DialogPrimitive.Trigger>
      
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create ElizaOS Agent</DialogTitle>
          <DialogDescription>
            Create a new ElizaOS agent to automate your trading strategies and market analysis.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            {/* Agent Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agent Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="My Trading Agent" />
                  </FormControl>
                  <FormDescription>
                    A descriptive name for your agent
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Farm Selection */}
            <FormField
              control={form.control}
              name="farmId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Farm</FormLabel>
                  <Select
                    onValueChange={(value: string) => field.onChange(parseInt(value))}
                    defaultValue={field.value?.toString()}
                    disabled={loading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a farm" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {loading ? (
                        <div className="p-2 flex items-center justify-center">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...
                        </div>
                      ) : farms.length > 0 ? (
                        farms.map((farm: { id: number, name: string }) => (
                          <SelectItem key={farm.id} value={farm.id.toString()}>
                            {farm.name}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-center text-muted-foreground">
                          No farms found
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select the farm where this agent will operate
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Agent Type */}
            <FormField
              control={form.control}
              name="agentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agent Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select agent type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="trading">Trading Agent</SelectItem>
                      <SelectItem value="research">Research Agent</SelectItem>
                      <SelectItem value="monitor">Monitoring Agent</SelectItem>
                      <SelectItem value="coordinator">Coordinator Agent</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The type determines the agent's primary function
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Risk Level */}
            <FormField
              control={form.control}
              name="riskLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Risk Level</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select risk level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Low Risk</SelectItem>
                      <SelectItem value="medium">Medium Risk</SelectItem>
                      <SelectItem value="high">High Risk</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Determines the agent's risk tolerance for trading
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Target Markets */}
            <FormField
              control={form.control}
              name="targetMarkets"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Markets</FormLabel>
                  <FormControl>
                    <div className="border rounded-md p-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {loading ? (
                          <>
                            {[...Array(9)].map((_, i) => (
                              <div key={i} className="h-8 bg-muted animate-pulse rounded-md" />
                            ))}
                          </>
                        ) : (
                          availableMarkets.map((market: string) => (
                            <Badge
                              key={market}
                              variant={isMarketSelected(market) ? "default" : "outline"}
                              className="cursor-pointer justify-center"
                              onClick={() => handleMarketToggle(market)}
                            >
                              {market}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Select the markets this agent will target
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* API Access */}
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
            
            {/* Trading Permissions */}
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
            
            {/* Auto Recovery */}
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
            
            {/* Initial Instructions */}
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
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
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
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </DialogPrimitive.Root>
  );
}
