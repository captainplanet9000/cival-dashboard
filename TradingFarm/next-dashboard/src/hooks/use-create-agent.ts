'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createBrowserClient } from '@/utils/supabase/client';
import { Database } from '@/types/database.types';
import { PostgrestError } from '@supabase/supabase-js';
import { CreateAgentInput } from '@/schemas/agent-schemas'; // Import the input type
import { toast } from "@/components/ui/use-toast";

// Type for the agent row (can be imported from use-agent if preferred)
export type Agent = Database['public']['Tables']['agents']['Row'];

// Function to insert a new agent into Supabase
const createAgent = async (agentData: CreateAgentInput): Promise<Agent> => {
  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from('agents')
    .insert({
      ...agentData,
      // Set default status if not provided and needed
      status: 'initializing', // Example default status
    })
    .select() // Select the newly created agent data
    .single(); // Expect a single row back

  if (error) {
    console.error('Error creating agent:', error);
    throw error;
  }
  if (!data) {
    throw new Error('Agent created successfully, but no data returned.');
  }

  return data as Agent;
};

/**
 * Hook to create a new agent.
 */
export function useCreateAgent() {
  const queryClient = useQueryClient();

  return useMutation<Agent, PostgrestError, CreateAgentInput>({
    mutationFn: createAgent,
    onSuccess: (newAgent) => {
      // Invalidate queries that fetch the list of agents to show the new one
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      // Optionally, pre-populate the cache for the new agent's detail view
      queryClient.setQueryData(['agent', newAgent.id], newAgent);

      toast({
        title: "Agent Created",
        description: `New agent (${newAgent.agent_type}) created successfully.`,
        variant: "default",
      });
    },
    onError: (error) => {
      console.error("Mutation error creating agent:", error);
      toast({
        title: "Error Creating Agent",
        description: error.message || "Failed to create agent. Please try again.",
        variant: "destructive",
      });
    },
  });
} 