// src/components/agent/AgentCreationForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

import { 
    type Wallet, 
    type TradingStrategy, 
    type TradingAgentWithWallet,
    createTradingAgent
} from '@/lib/clients/apiClient';
import { type CreateAgentPayload } from '@/lib/types/agent';

const agentCreationFormSchema = z.object({
  name: z.string().min(1, { message: "Agent name is required." }).max(100, { message: "Agent name can be at most 100 characters." }),
  strategy_id: z.string().uuid({ message: "Please select a valid trading strategy." }),
  configuration_parameters: z.string().refine((val) => {
    try {
      JSON.parse(val);
      return true;
    } catch (e) {
      return false;
    }
  }, { message: "Configuration parameters must be a valid JSON string." }),
  initial_capital: z.coerce.number().positive({ message: "Initial capital must be a positive number." }),
  funding_currency: z.string().min(1, { message: "Please select a funding currency." }),
});

type AgentCreationFormValues = z.infer<typeof agentCreationFormSchema>;

interface AgentCreationFormProps {
  strategies: TradingStrategy[];
  userWallets: Wallet[]; // Used to derive available funding currencies
  onSuccess?: (createdAgent: TradingAgentWithWallet) => void;
}

export function AgentCreationForm({ strategies, userWallets, onSuccess }: AgentCreationFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableCurrencies = useMemo(() => {
    const currencies = new Set(userWallets.map(wallet => wallet.currency));
    return Array.from(currencies);
  }, [userWallets]);

  const form = useForm<AgentCreationFormValues>({
    resolver: zodResolver(agentCreationFormSchema),
    defaultValues: {
      name: '',
      strategy_id: strategies?.[0]?.strategy_id || '',
      configuration_parameters: '{}', // Default to empty JSON object string
      initial_capital: 0,
      funding_currency: availableCurrencies?.[0] || '',
    },
  });

  async function onSubmit(values: AgentCreationFormValues) {
    setIsSubmitting(true);
    let parsedConfigParams;
    try {
      parsedConfigParams = JSON.parse(values.configuration_parameters);
    } catch (error) {
      // This should ideally be caught by Zod, but as a safeguard:
      toast({ title: "Validation Error", description: "Configuration parameters are not valid JSON.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    try {
      const payload: CreateAgentPayload = {
        name: values.name,
        strategy_id: values.strategy_id,
        configuration_parameters: parsedConfigParams,
        initial_capital: values.initial_capital,
        funding_currency: values.funding_currency,
      };
      
      const createdAgent = await createTradingAgent(payload);
      
      toast({
        title: "Agent Creation Successful",
        description: `Agent "${createdAgent.name}" created with ID: ${createdAgent.agent_id.substring(0,8)}...`,
        variant: "default",
      });

      if (onSuccess) {
        onSuccess(createdAgent);
      } else {
        // Default redirect if no onSuccess provided
        router.push('/dashboard/agents');
      }
      // Optionally reset form, though typically navigating away
      // form.reset(); 

    } catch (error: any) {
      console.error("Agent creation failed:", error);
      toast({
        title: "Agent Creation Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  if (!userWallets || userWallets.length === 0) {
    return (
      <div className="p-4 border rounded-lg text-center">
        <p className="text-muted-foreground">
          You need at least one wallet to determine available funding currencies. Please create a wallet first.
        </p>
      </div>
    );
  }
  if (!strategies || strategies.length === 0) {
    return (
      <div className="p-4 border rounded-lg text-center">
        <p className="text-muted-foreground">
          No trading strategies available. Please ensure strategies are configured.
        </p>
      </div>
    );
  }


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Agent Name</FormLabel>
              <FormControl>
                <Input placeholder="My Profitable Agent" {...field} />
              </FormControl>
              <FormDescription>A unique name for your trading agent.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="strategy_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Trading Strategy</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a strategy" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {strategies.map((strategy) => (
                    <SelectItem key={strategy.strategy_id} value={strategy.strategy_id}>
                      {strategy.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>The strategy this agent will execute.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="configuration_parameters"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Configuration Parameters (JSON)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder='{ "param1": "value1", "param2": 123 }'
                  className="min-h-[100px] font-mono"
                  {...field}
                />
              </FormControl>
              <FormDescription>Strategy-specific parameters in JSON format.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="initial_capital"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Initial Capital</FormLabel>
              <FormControl>
                <Input type="number" placeholder="1000.00" {...field} step="0.01" />
              </FormControl>
              <FormDescription>The amount of capital to allocate to this agent.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="funding_currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Funding Currency</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={availableCurrencies.length === 0}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select funding currency" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableCurrencies.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>The currency for the initial capital, based on your available wallets.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Agent...
            </>
          ) : (
            "Create Agent"
          )}
        </Button>
      </form>
    </Form>
  );
}
