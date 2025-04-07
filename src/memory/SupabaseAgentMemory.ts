import { AgentMemory } from './AgentMemory';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types'; // Import generated types

// Define the structure for the agent_memory table row based on generated types
type AgentMemoryRow = Database['public']['Tables']['agent_memory']['Row'];
type AgentMemoryInsert = Database['public']['Tables']['agent_memory']['Insert'];

/**
 * Supabase-backed implementation of AgentMemory.
 * Stores key-value pairs associated with a specific agent ID in the agent_memory table.
 */
export class SupabaseAgentMemory implements AgentMemory {
    private supabase: SupabaseClient<Database>;
    private agentId: string;

    constructor(supabaseClient: SupabaseClient<Database>, agentId: string) {
        if (!supabaseClient) {
            throw new Error('Supabase client instance is required.');
        }
        if (!agentId) {
             throw new Error('Agent ID is required for SupabaseAgentMemory.');
        }
        this.supabase = supabaseClient;
        this.agentId = agentId;
        console.log(`[SupabaseAgentMemory] Initialized for agent ${this.agentId}`);
    }

    async store(key: string, value: any): Promise<void> {
        console.log(`[SupabaseAgentMemory] Storing key: ${key} for agent ${this.agentId}`);
        const memoryData: AgentMemoryInsert = {
            agent_id: this.agentId,
            key: key,
            value: value as any, // Store the value as JSONB
            // created_at and updated_at are handled by triggers/defaults
        };

        const { error } = await this.supabase
            .from('agent_memory')
            .upsert(memoryData, { onConflict: 'agent_id, key' }); // Upsert based on the composite key

        if (error) {
            console.error(`[SupabaseAgentMemory] Error storing key ${key} for agent ${this.agentId}:`, error);
            throw new Error(`Failed to store memory: ${error.message}`);
        }
    }

    async retrieve(key: string): Promise<any> {
        console.log(`[SupabaseAgentMemory] Retrieving key: ${key} for agent ${this.agentId}`);
        const { data, error } = await this.supabase
            .from('agent_memory')
            .select('value')
            .eq('agent_id', this.agentId)
            .eq('key', key)
            .maybeSingle(); // Use maybeSingle() to get null if not found, or the single row

        if (error) {
            console.error(`[SupabaseAgentMemory] Error retrieving key ${key} for agent ${this.agentId}:`, error);
            throw new Error(`Failed to retrieve memory: ${error.message}`);
        }

        console.log(`[SupabaseAgentMemory] Retrieved key: ${key} - Found: ${data !== null}`);
        return data?.value ?? undefined; // Return the value or undefined if data is null/row not found
    }

    async remove(key: string): Promise<void> {
        console.log(`[SupabaseAgentMemory] Removing key: ${key} for agent ${this.agentId}`);
        const { error } = await this.supabase
            .from('agent_memory')
            .delete()
            .eq('agent_id', this.agentId)
            .eq('key', key);

        if (error) {
            console.error(`[SupabaseAgentMemory] Error removing key ${key} for agent ${this.agentId}:`, error);
            throw new Error(`Failed to remove memory: ${error.message}`);
        }
    }

    async clear(): Promise<void> {
        console.warn(`[SupabaseAgentMemory] Clearing ALL memory for agent ${this.agentId}`);
        const { error } = await this.supabase
            .from('agent_memory')
            .delete()
            .eq('agent_id', this.agentId);

        if (error) {
            console.error(`[SupabaseAgentMemory] Error clearing memory for agent ${this.agentId}:`, error);
            throw new Error(`Failed to clear memory: ${error.message}`);
        }
    }
} 