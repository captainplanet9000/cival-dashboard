'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createAgentSchema, CreateAgentInput } from '@/schemas/agent-schemas';
import { useCreateAgent } from '@/hooks/use-create-agent';
import { useFarms } from '@/hooks/use-farms';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // For agent type
import { ArrowLeft, Loader2 } from 'lucide-react';
import { TradingAgentForm } from '@/components/agents/trading-agent-form';

export default function CreateAgentPage() {
  const router = useRouter();
  const createAgentMutation = useCreateAgent();
  const { data: farms, isLoading: isLoadingFarms } = useFarms(true);
  const [tradingAgentConfig, setTradingAgentConfig] = useState<any>(null);

  const form = useForm<CreateAgentInput>({
    resolver: zodResolver(createAgentSchema),
    defaultValues: {
      agent_type: '',
      farm_id: null,
    },
  });
  
  // Watch for agent type changes to conditionally show configuration forms
  const selectedAgentType = form.watch('agent_type');

  const onSubmit = async (values: CreateAgentInput) => {
    // Create the base payload
    const payload = {
      ...values,
      farm_id: values.farm_id ? Number(values.farm_id) : null,
    };
    
    // Add agent-specific configuration
    if (values.agent_type === 'trading' && tradingAgentConfig) {
      payload.configuration = {
        ...tradingAgentConfig,
        // Ensure numbers are properly converted
        initial_capital: Number(tradingAgentConfig.initial_capital),
        max_position_size_percent: Number(tradingAgentConfig.max_position_size_percent),
        max_drawdown_percent: Number(tradingAgentConfig.max_drawdown_percent),
        stop_loss_percent: Number(tradingAgentConfig.stop_loss_percent),
        take_profit_percent: Number(tradingAgentConfig.take_profit_percent),
        trailing_stop_percent: tradingAgentConfig.trailing_stop_percent ? Number(tradingAgentConfig.trailing_stop_percent) : undefined,
      };
    }
    
    try {
      const newAgent = await createAgentMutation.mutateAsync(payload);
      router.push(`/dashboard/agents/${newAgent.id}`);
    } catch (error) {
      console.error("Create agent submission failed:", error);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-2xl mx-auto">
      <Button variant="outline" size="sm" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Agents List
      </Button>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Create New Agent</CardTitle>
              <CardDescription>
                Configure the basic details for your new agent.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="agent_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agent Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select agent type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="trading">Trading Agent</SelectItem>
                        <SelectItem value="research">Research Agent</SelectItem>
                        <SelectItem value="monitoring">Monitoring Agent</SelectItem>
                        <SelectItem value="manager">Manager Agent</SelectItem>
                        <SelectItem value="custom">Custom Agent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the primary role for this agent.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="farm_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign to Farm (Optional)</FormLabel>
                    <Select 
                       onValueChange={(value: string) => field.onChange(value ? parseInt(value, 10) : null)} 
                       value={field.value?.toString() ?? ''}
                       disabled={isLoadingFarms}
                     >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingFarms ? "Loading farms..." : "Select a farm"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">-- No Farm --</SelectItem> 
                        {farms?.map((farm) => (
                          <SelectItem key={farm.id} value={farm.id.toString()}>
                            {farm.name} (ID: {farm.id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Optionally assign this agent to one of your farms.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Brain ID Field */}
              <FormField
                control={form.control}
                name="brain_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brain ID (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter Brain UUID (optional)" 
                        {...field} 
                        // Ensure value is always string or empty string for Input
                        value={field.value ?? ''} 
                      />
                    </FormControl>
                    <FormDescription>
                      Optionally link this agent to a specific Brain configuration.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Display agent-specific configuration forms */}
              {selectedAgentType === 'trading' && (
                <div className="mt-6 border-t pt-6">
                  <h3 className="text-lg font-medium mb-4">Trading Agent Configuration</h3>
                  <TradingAgentForm onConfigChange={setTradingAgentConfig} />
                </div>
              )}
              
              {/* Show placeholders for other agent types */}
              {selectedAgentType === 'research' && (
                <div className="mt-6 border-t pt-6">
                  <h3 className="text-lg font-medium mb-4">Research Agent Configuration</h3>
                  <p className="text-muted-foreground">Research agent configuration options will appear here.</p>
                </div>
              )}
              
              {selectedAgentType === 'monitoring' && (
                <div className="mt-6 border-t pt-6">
                  <h3 className="text-lg font-medium mb-4">Monitoring Agent Configuration</h3>
                  <p className="text-muted-foreground">Monitoring agent configuration options will appear here.</p>
                </div>
              )}
              
              {selectedAgentType === 'manager' && (
                <div className="mt-6 border-t pt-6">
                  <h3 className="text-lg font-medium mb-4">Manager Agent Configuration</h3>
                  <p className="text-muted-foreground">Manager agent configuration options will appear here.</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createAgentMutation.isPending || isLoadingFarms || (selectedAgentType === 'trading' && !tradingAgentConfig)}
              >
                {(createAgentMutation.isPending || isLoadingFarms) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Agent
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
} 