'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
    type TradingStrategy, 
    updateTradingAgent,
    type TradingAgentDetailsInterface // Using the consistent interface
} from '@/lib/clients/apiClient';
import { 
    type UpdateAgentClientPayload, 
    type CrewAgentConfigInterface 
} from '@/types/generated/py_models';
import { CrewAgentConfigFormFields } from './CrewAgentConfigFormFields';

// Zod schema for the CrewAgentConfig part of the form (similar to creation)
// Note: For edits, fields are often optional if not being changed.
// However, for a structured object like configuration_parameters, we typically send the whole object.
// The Pydantic model on the backend (UpdateAgentApiPayload) has optional fields.
const crewAgentConfigEditSchema = z.object({
  role: z.string().min(3, "Role must be at least 3 characters."),
  goal: z.string().min(10, "Goal must be at least 10 characters."),
  backstory: z.string().min(10, "Backstory must be at least 10 characters."),
  llm_identifier: z.string().optional().nullable().transform(val => val === "" ? null : val),
  allow_delegation: z.boolean().default(false),
  verbose: z.boolean().default(true),
  strategy_specific_params: z.string().refine((val) => {
    if (val.trim() === "") return true;
    try { JSON.parse(val); return true; } catch (e) { return false; }
  }, { message: "Must be a valid JSON string if provided, or empty." }).default("{}"),
  tools: z.array(z.any()).optional().nullable(), // Not directly editable in this form
});

// Schema for the main edit form
const agentEditFormSchema = z.object({
  agent_name: z.string().min(1, "Agent name is required.").max(100),
  assigned_strategy_id: z.string().uuid("Invalid strategy ID.").optional().nullable(), // Strategy can be optional or unassigned
  description: z.string().optional().nullable(),
  configuration_parameters: crewAgentConfigEditSchema.optional(), // Entire config block is optional for update
});

type AgentEditFormValues = z.infer<typeof agentEditFormSchema>;

interface AgentEditFormProps {
  agent: TradingAgentDetailsInterface;
  strategies: TradingStrategy[];
  availableLlms: string[]; // Added prop
  // userWallets: Wallet[]; 
  onSuccess?: (updatedAgent: TradingAgentDetailsInterface) => void;
}

export function AgentEditForm({ agent, strategies, availableLlms, onSuccess }: AgentEditFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AgentEditFormValues>({
    resolver: zodResolver(agentEditFormSchema),
    defaultValues: {
      agent_name: agent.agent_name || '',
      assigned_strategy_id: agent.assigned_strategy_id || null,
      description: agent.description || '',
      configuration_parameters: {
        role: agent.configuration_parameters?.role || '',
        goal: agent.configuration_parameters?.goal || '',
        backstory: agent.configuration_parameters?.backstory || '',
        llm_identifier: agent.configuration_parameters?.llm_identifier || null,
        allow_delegation: agent.configuration_parameters?.allow_delegation || false,
        verbose: agent.configuration_parameters?.verbose || true,
        strategy_specific_params: agent.configuration_parameters?.strategy_specific_params 
            ? JSON.stringify(agent.configuration_parameters.strategy_specific_params, null, 2) 
            : '{}',
        tools: agent.configuration_parameters?.tools || null,
      },
    },
  });
  
  // Watch for changes in agent prop to reset form if a different agent is loaded
  useEffect(() => {
    form.reset({
        agent_name: agent.agent_name || '',
        assigned_strategy_id: agent.assigned_strategy_id || null,
        description: agent.description || '',
        configuration_parameters: {
            role: agent.configuration_parameters?.role || '',
            goal: agent.configuration_parameters?.goal || '',
            backstory: agent.configuration_parameters?.backstory || '',
            llm_identifier: agent.configuration_parameters?.llm_identifier || null,
            allow_delegation: agent.configuration_parameters?.allow_delegation || false,
            verbose: agent.configuration_parameters?.verbose !== undefined ? agent.configuration_parameters.verbose : true, // Handle explicit true/false
            strategy_specific_params: agent.configuration_parameters?.strategy_specific_params
                ? JSON.stringify(agent.configuration_parameters.strategy_specific_params, null, 2)
                : '{}',
            tools: agent.configuration_parameters?.tools || null,
        },
    });
  }, [agent, form]);


  async function onSubmit(values: AgentEditFormValues) {
    setIsSubmitting(true);
    
    let strategyParamsObject: Record<string, any> = {};
    if (values.configuration_parameters?.strategy_specific_params && values.configuration_parameters.strategy_specific_params.trim() !== "") {
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

    // Construct payload, only including fields that are meant to be updated.
    // The backend Pydantic model UpdateAgentApiPayload uses exclude_unset=True (or similar)
    // or optional fields.
    const apiPayload: UpdateAgentClientPayload = {
        agent_name: values.agent_name !== agent.agent_name ? values.agent_name : undefined,
        assigned_strategy_id: values.assigned_strategy_id !== agent.assigned_strategy_id ? values.assigned_strategy_id : undefined,
        description: values.description !== agent.description ? values.description : undefined,
    };

    // Only include configuration_parameters if they were provided in the form
    // and potentially changed. The backend will handle partial updates if structure allows.
    if (values.configuration_parameters) {
        apiPayload.configuration_parameters = {
            ...values.configuration_parameters,
            llm_identifier: values.configuration_parameters.llm_identifier || null,
            strategy_specific_params: strategyParamsObject,
            tools: values.configuration_parameters.tools || null,
        };
    } else {
        // If the entire configuration_parameters block is optional and not provided,
        // it can be omitted from the payload.
        apiPayload.configuration_parameters = undefined;
    }
    
    // Filter out undefined fields to send a cleaner payload for partial updates
    const cleanedPayload = Object.fromEntries(
        Object.entries(apiPayload).filter(([_, v]) => v !== undefined)
    ) as UpdateAgentClientPayload;


    try {
      if (Object.keys(cleanedPayload).length === 0) {
        toast({
            title: "No Changes",
            description: "No changes were made to the agent.",
            variant: "default",
        });
        if (onSuccess) onSuccess(agent); // Return original agent if no changes
        return;
      }

      const updatedAgent = await updateTradingAgent(agent.agent_id, cleanedPayload);
      
      toast({
        title: "Agent Update Successful",
        description: `Agent "${updatedAgent.agent_name}" updated.`,
        variant: "default",
      });

      if (onSuccess) {
        onSuccess(updatedAgent);
      } else {
        router.push(`/dashboard/agents/${agent.agent_id}`); // Default redirect
      }
    } catch (error: any) {
      console.error("Agent update failed:", error);
      toast({
        title: "Agent Update Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="agent_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Agent Name</FormLabel>
              <FormControl>
                <Input placeholder="My Profitable Agent" {...field} />
              </FormControl>
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
                  placeholder="Briefly describe this agent's purpose or any specific notes."
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
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
              <Select onValueChange={field.onChange} value={field.value || undefined} defaultValue={field.value || undefined}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a strategy (or leave unassigned)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="null"><em>None (Unassign Strategy)</em></SelectItem>
                  {strategies.map((strategy) => (
                    <SelectItem key={strategy.strategy_id} value={strategy.strategy_id}>
                      {strategy.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>The strategy this agent will execute. Can be unassigned.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Structured Configuration Fields for CrewAI agents */}
        {/* Conditionally render or always show, assuming it might be a CrewAI agent */}
        <CrewAgentConfigFormFields form={form} availableLlms={availableLlms} />
        
        <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving Changes...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </form>
    </Form>
  );
}
