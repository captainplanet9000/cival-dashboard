'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Plus, AlertTriangle, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

// Import the mutation hooks
import { 
  useCreateAgent, 
  useUpdateAgent, 
  AgentInput, 
  AgentUpdateInput 
} from '@/hooks/react-query/use-agent-mutations';

// Import query hooks for exchange accounts
import { useExchangeAccounts } from '@/hooks/react-query/use-exchange-queries';

// Define schema for form validation
const agentFormSchema = z.object({
  farmId: z.string().min(1, 'Farm ID is required'),
  name: z.string().min(3, 'Name must be at least 3 characters').max(50, 'Name must be at most 50 characters'),
  description: z.string().optional(),
  type: z.string().min(1, 'Agent type is required'),
  status: z.enum(['active', 'paused', 'inactive']),
  capabilities: z.array(z.string()).optional(),
  exchangeAccounts: z.array(z.string()).optional(),
});

type AgentFormValues = z.infer<typeof agentFormSchema>;

interface AgentFormProps {
  agentId?: string;
  initialData?: any;
  farmId: string;
}

export function AgentForm({ agentId, initialData, farmId }: AgentFormProps) {
  const router = useRouter();
  const [capabilityInput, setCapabilityInput] = useState('');
  
  // Use the mutation hooks
  const createAgent = useCreateAgent();
  const updateAgent = useUpdateAgent();
  
  // Fetch exchange accounts for the farm
  const { data: exchangeAccounts, isLoading: loadingAccounts } = useExchangeAccounts(farmId);
  
  // Determine if we're editing or creating
  const isEditing = !!agentId;
  
  // Setup default values for the form
  const defaultValues: Partial<AgentFormValues> = initialData ? {
    ...initialData,
    farmId: initialData.farmId || farmId,
    capabilities: initialData.capabilities || [],
    exchangeAccounts: initialData.exchangeAccounts || [],
  } : {
    farmId,
    name: '',
    description: '',
    type: 'trader',
    status: 'inactive',
    capabilities: [],
    exchangeAccounts: [],
  };
  
  // Initialize the form
  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentFormSchema),
    defaultValues,
  });
  
  // Watch form values
  const watchedCapabilities = form.watch('capabilities') || [];
  const watchedExchangeAccounts = form.watch('exchangeAccounts') || [];
  
  // Handle form submission
  const onSubmit = (data: AgentFormValues) => {
    if (isEditing) {
      // Update existing agent
      const updateData: AgentUpdateInput = {
        id: agentId,
        ...data,
      };
      
      updateAgent.mutate(updateData, {
        onSuccess: () => {
          router.push(`/agents/${agentId}`);
        }
      });
    } else {
      // Create new agent
      const agentData: AgentInput = {
        ...data,
      };
      
      createAgent.mutate(agentData, {
        onSuccess: (newAgent) => {
          router.push(`/agents/${newAgent.id}`);
        }
      });
    }
  };
  
  // Handle capability input
  const addCapability = () => {
    if (!capabilityInput.trim()) return;
    
    const normalizedCapability = capabilityInput.trim();
    const currentCapabilities = form.getValues('capabilities') || [];
    
    // Don't add duplicates
    if (!currentCapabilities.includes(normalizedCapability)) {
      form.setValue('capabilities', [...currentCapabilities, normalizedCapability]);
    }
    
    setCapabilityInput('');
  };
  
  const removeCapability = (capability: string) => {
    const currentCapabilities = form.getValues('capabilities') || [];
    form.setValue(
      'capabilities', 
      currentCapabilities.filter(c => c !== capability)
    );
  };
  
  // Toggle exchange account selection
  const toggleExchangeAccount = (accountId: string) => {
    const currentAccounts = form.getValues('exchangeAccounts') || [];
    const accountIndex = currentAccounts.indexOf(accountId);
    
    if (accountIndex >= 0) {
      // Remove the account
      form.setValue(
        'exchangeAccounts',
        currentAccounts.filter(id => id !== accountId)
      );
    } else {
      // Add the account
      form.setValue('exchangeAccounts', [...currentAccounts, accountId]);
    }
  };
  
  // Check if form is being submitted
  const isSubmitting = createAgent.isPending || updateAgent.isPending;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit Agent' : 'Create New Agent'}</CardTitle>
        <CardDescription>
          {isEditing 
            ? 'Modify your existing trading agent' 
            : 'Configure a new automated trading agent'}
        </CardDescription>
      </CardHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            {/* Basic Info Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
              
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
                      A unique name to identify your agent
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
                        {...field} 
                        placeholder="Describe your agent's purpose and behavior"
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional details about what this agent does
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agent Type</FormLabel>
                      <Select 
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an agent type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="trader">Trader</SelectItem>
                          <SelectItem value="analyzer">Market Analyzer</SelectItem>
                          <SelectItem value="rebalancer">Portfolio Rebalancer</SelectItem>
                          <SelectItem value="assistant">Trading Assistant</SelectItem>
                          <SelectItem value="customized">Customized</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The primary function of your agent
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Status</FormLabel>
                      <Select 
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="paused">Paused</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Set to "inactive" or "paused" while configuring
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            {/* Capabilities Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Agent Capabilities</h3>
              <FormItem>
                <FormLabel>Capabilities</FormLabel>
                <div className="flex items-center space-x-2">
                  <Input
                    placeholder="Add a capability"
                    value={capabilityInput}
                    onChange={(e) => setCapabilityInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCapability())}
                  />
                  <Button type="button" size="sm" onClick={addCapability}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {watchedCapabilities.map((capability) => (
                    <Badge key={capability} variant="secondary" className="px-2 py-1">
                      {capability}
                      <button
                        type="button"
                        className="ml-1 rounded-full outline-none focus:ring-2"
                        onClick={() => removeCapability(capability)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {watchedCapabilities.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Add capabilities like "technical analysis", "swing trading", etc.
                    </p>
                  )}
                </div>
                <FormDescription>
                  Define what this agent can do
                </FormDescription>
              </FormItem>
            </div>
            
            {/* Exchange Accounts Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Exchange Access</h3>
              <FormItem>
                <FormLabel>Connected Exchange Accounts</FormLabel>
                
                {loadingAccounts ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Loading exchange accounts...</span>
                  </div>
                ) : exchangeAccounts && exchangeAccounts.length > 0 ? (
                  <div className="space-y-2 border rounded-md p-4">
                    {exchangeAccounts.map(account => (
                      <div key={account.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`account-${account.id}`} 
                          checked={watchedExchangeAccounts.includes(account.id)}
                          onCheckedChange={() => toggleExchangeAccount(account.id)}
                        />
                        <label
                          htmlFor={`account-${account.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {account.name} ({account.exchange})
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border rounded-md p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      No exchange accounts found. Add an exchange account first.
                    </p>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => router.push('/settings/exchanges/add')}
                    >
                      Add Exchange Account
                    </Button>
                  </div>
                )}
                
                <FormDescription>
                  Select which exchange accounts this agent can access
                </FormDescription>
                <FormMessage />
              </FormItem>
            </div>
            
            {/* Error display */}
            {(createAgent.isError || updateAgent.isError) && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 flex items-start">
                <AlertTriangle className="h-5 w-5 text-destructive mr-2 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Error</p>
                  <p className="text-sm text-destructive/90">
                    {createAgent.error instanceof Error ? createAgent.error.message : 
                     updateAgent.error instanceof Error ? updateAgent.error.message : 
                     'An unexpected error occurred. Please try again.'}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update Agent' : 'Create Agent'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
