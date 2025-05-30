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
    // type TradingAgentWithWallet, // This type might need to be TradingAgentDetailsInterface now
    createTradingAgent,
    TradingAgentDetailsInterface // Assuming this is the return type from createTradingAgent now
} from '@/lib/clients/apiClient';
// Assuming CreateAgentClientPayload is what createTradingAgent expects now
import { type CreateAgentClientPayload, type CrewAgentConfigInterface } from '@/types/generated/py_models'; 
import { CrewAgentConfigFormFields } from './CrewAgentConfigFormFields'; // Import the new component

// Zod schema for the CrewAgentConfig part of the form
const crewAgentConfigSchemaForForm = z.object({
  role: z.string().min(3, "Role must be at least 3 characters."),
  goal: z.string().min(10, "Goal must be at least 10 characters."),
  backstory: z.string().min(10, "Backstory must be at least 10 characters."),
  llm_identifier: z.string().optional().nullable().transform(val => val === "" ? null : val), // Allow empty string to mean null
  allow_delegation: z.boolean().default(false),
  verbose: z.boolean().default(true),
  // strategy_specific_params is a JSON string in the form, validated then parsed
  strategy_specific_params: z.string().refine((val) => {
    if (val.trim() === "") return true; // Allow empty string (will become empty object)
    try {
      JSON.parse(val);
      return true;
    } catch (e) {
      return false;
    }
  }, { message: "Must be a valid JSON string if provided, or empty." }).default("{}"),
  tools: z.array(z.any()).optional().nullable(), // Assuming tools are not directly editable in this form for now
});


const agentCreationFormSchema = z.object({
  agent_name: z.string().min(1, { message: "Agent name is required." }).max(100, { message: "Agent name can be at most 100 characters." }),
  assigned_strategy_id: z.string().uuid({ message: "Please select a valid trading strategy." }),
  configuration_parameters: crewAgentConfigSchemaForForm, // Use the nested schema
  initial_capital: z.coerce.number().positive({ message: "Initial capital must be a positive number." }),
  funding_currency: z.string().min(1, { message: "Please select a funding currency." }),
  description: z.string().optional().nullable(),
});

type AgentCreationFormValues = z.infer<typeof agentCreationFormSchema>;

interface AgentCreationFormProps {
  strategies: TradingStrategy[];
  userWallets: Wallet[]; 
  availableLlms: string[]; // Added prop
  onSuccess?: (createdAgent: TradingAgentDetailsInterface) => void;
}

export function AgentCreationForm({ strategies, userWallets, availableLlms, onSuccess }: AgentCreationFormProps) {
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
      agent_name: '',
      assigned_strategy_id: strategies?.[0]?.strategy_id || '',
      configuration_parameters: { // Default values for the nested form
        role: '',
        goal: '',
        backstory: '',
        llm_identifier: null, // Default to null (which means crew default)
        allow_delegation: false,
        verbose: true,
        strategy_specific_params: '{}', // Default to empty JSON string
        tools: null, // Default tools to null
      },
      initial_capital: 1000, // Sensible default
      funding_currency: availableCurrencies?.[0] || '',
      description: '',
    },
  });

  async function onSubmit(values: AgentCreationFormValues) {
    setIsSubmitting(true);
    
    let strategyParamsObject: Record<string, any> = {};
    if (values.configuration_parameters.strategy_specific_params && values.configuration_parameters.strategy_specific_params.trim() !== "") {
        try {
            strategyParamsObject = JSON.parse(values.configuration_parameters.strategy_specific_params);
        } catch (e) {
            form.setError("configuration_parameters.strategy_specific_params", {
                type: "manual",
                message: "Strategy Specific Parameters must be a valid JSON string or empty.",
            });
            setIsSubmitting(false);
            return;
        }
    }

    const apiPayload: CreateAgentClientPayload = {
      agent_name: values.agent_name,
      assigned_strategy_id: values.assigned_strategy_id,
      configuration_parameters: {
        ...values.configuration_parameters,
        // Ensure llm_identifier is null if empty string was selected, Zod transform handles this
        llm_identifier: values.configuration_parameters.llm_identifier || null,
        strategy_specific_params: strategyParamsObject,
        // tools are not directly in form, default to null or omit if Pydantic handles default
        tools: values.configuration_parameters.tools || null, 
      },
      initial_capital: values.initial_capital,
      funding_currency: values.funding_currency,
      description: values.description || null,
    };

    try {
      const createdAgent = await createTradingAgent(apiPayload);
      
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
          name="agent_name"
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
          name="assigned_strategy_id"
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
          // Removed old Textarea for configuration_parameters
        />

        {/* New Structured Configuration Fields */}
        <CrewAgentConfigFormFields form={form} availableLlms={availableLlms} />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Briefly describe this agent's purpose or any specific notes."
                  {...field}
                  value={field.value ?? ''} // Handle null value for textarea
                />
              </FormControl>
              <FormDescription>An optional description for this agent.</FormDescription>
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
