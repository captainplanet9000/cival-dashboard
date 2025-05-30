'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createBrowserClient } from '@/utils/supabase/client';
import { Database } from '@/types/database.types';
import { PostgrestError } from '@supabase/supabase-js';
import { UpdateAgentInput } from '@/schemas/agent-schemas';
import { toast } from "@/components/ui/use-toast";

export type Agent = Database['public']['Tables']['agents']['Row'];

// Function to update an agent in Supabase
const updateAgent = async ({ agentId, agentData }: { agentId: string, agentData: UpdateAgentInput }): Promise<Agent> => {
  const supabase = createBrowserClient();
  
  // Filter out undefined values, Supabase update ignores them anyway
  // but explicit check might be useful depending on schema
  const updatePayload: { [key: string]: any } = {};
  for (const key in agentData) {
    if ((agentData as any)[key] !== undefined) {
      updatePayload[key] = (agentData as any)[key];
    }
  }

  // Don't proceed if payload is empty
  if (Object.keys(updatePayload).length === 0) {
    // Optionally return the existing agent data or throw an error
    // For simplicity, we might just skip the DB call
    console.warn("Update called with no changes.");
    // We need to return *something* - let's re-fetch or error
    // Re-fetching might be safer if we expect the hook caller to handle it
    const { data: currentData, error: fetchError } = await supabase
        .from('agents').select('*').eq('id', agentId).single();
    if(fetchError || !currentData) throw fetchError || new Error("Agent not found after empty update attempt.");
    return currentData as Agent; 
  }

  const { data, error } = await supabase
    .from('agents')
    .update(updatePayload)
    .eq('id', agentId)
    .select()
    .single();

  if (error) {
    console.error(`Error updating agent ${agentId}:`, error);
    throw error;
  }
  if (!data) {
    throw new Error('Agent updated successfully, but no data returned.');
  }

  return data as Agent;
};

/**
 * Hook to update an existing agent.
 */
export function useUpdateAgent(agentId: string) {
  const queryClient = useQueryClient();

  return useMutation<Agent, PostgrestError, UpdateAgentInput>({
    // We pass the agentId along with the data to the mutation function
    mutationFn: (agentData) => updateAgent({ agentId, agentData }),
    onSuccess: (updatedAgent) => {
      // Invalidate the list query
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      // Update the cache for this specific agent's detail view
      queryClient.setQueryData(['agent', agentId], updatedAgent);

      toast({
        title: "Agent Updated",
        description: `Agent ${updatedAgent.id.substring(0,8)}... updated successfully.`,
        variant: "default",
      });
    },
    onError: (error) => {
      console.error("Mutation error updating agent:", error);
      toast({
        title: "Error Updating Agent",
        description: error.message || "Failed to update agent. Please try again.",
        variant: "destructive",
      });
    },
  });
} 