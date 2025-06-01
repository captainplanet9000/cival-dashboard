import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export interface MemorySearchParams {
  query: string;
  memoryType?: 'conversation' | 'document' | 'knowledge' | 'state';
  limit?: number;
  metadata?: Record<string, any>;
  embedding?: number[];
}

export class AgentMemoryService {
  private supabase;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
  }

  async storeMemory(
    agentId: string,
    memoryType: 'conversation' | 'document' | 'knowledge' | 'state',
    content: any,
    metadata: Record<string, any> = {},
    embedding?: number[]
  ) {
    try {
      const { data, error } = await this.supabase
        .from('agent_memory')
        .insert([{
          agent_id: agentId,
          memory_type: memoryType,
          content,
          metadata,
          embedding
        }])
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to store memory'
      };
    }
  }

  async searchMemory(agentId: string, params: MemorySearchParams) {
    try {
      let query = this.supabase
        .from('agent_memory')
        .select('*')
        .eq('agent_id', agentId);

      if (params.memoryType) {
        query = query.eq('memory_type', params.memoryType);
      }

      if (params.metadata) {
        Object.entries(params.metadata).forEach(([key, value]) => {
          query = query.eq(`metadata->>${key}`, value);
        });
      }

      if (params.embedding) {
        // If we have embeddings, use vector similarity search
        const { data: vectorResults, error: vectorError } = await this.supabase.rpc(
          'match_documents',
          {
            query_embedding: params.embedding,
            match_threshold: 0.7,
            match_count: params.limit || 10
          }
        );

        if (vectorError) throw vectorError;

        return {
          success: true,
          data: vectorResults
        };
      }

      // Regular search without embeddings
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(params.limit || 10);

      if (error) throw error;

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search memory'
      };
    }
  }

  async getMemory(memoryId: string) {
    try {
      const { data, error } = await this.supabase
        .from('agent_memory')
        .select('*')
        .eq('id', memoryId)
        .single();

      if (error) throw error;

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get memory'
      };
    }
  }

  async updateMemory(
    memoryId: string,
    updates: Partial<Database['public']['Tables']['agent_memory']['Update']>
  ) {
    try {
      const { data, error } = await this.supabase
        .from('agent_memory')
        .update(updates)
        .eq('id', memoryId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update memory'
      };
    }
  }

  async deleteMemory(memoryId: string) {
    try {
      const { error } = await this.supabase
        .from('agent_memory')
        .delete()
        .eq('id', memoryId);

      if (error) throw error;

      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete memory'
      };
    }
  }

  async clearAgentMemory(agentId: string, memoryType?: 'conversation' | 'document' | 'knowledge' | 'state') {
    try {
      let query = this.supabase
        .from('agent_memory')
        .delete()
        .eq('agent_id', agentId);

      if (memoryType) {
        query = query.eq('memory_type', memoryType);
      }

      const { error } = await query;

      if (error) throw error;

      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear agent memory'
      };
    }
  }
} 