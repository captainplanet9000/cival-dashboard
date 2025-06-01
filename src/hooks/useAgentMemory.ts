import { useState, useCallback } from 'react';
import { AgentMemoryService, MemorySearchParams } from '@/services/agent/agent-memory-service';
import type { Database } from '@/types/database.types';

type AgentMemory = Database['public']['Tables']['agent_memory']['Row'];

interface UseAgentMemoryOptions {
  supabaseUrl: string;
  supabaseKey: string;
  agentId: string;
}

interface UseAgentMemoryReturn {
  memories: AgentMemory[];
  isLoading: boolean;
  error: string | null;
  storeMemory: (
    memoryType: 'conversation' | 'document' | 'knowledge' | 'state',
    content: any,
    metadata?: Record<string, any>,
    embedding?: number[]
  ) => Promise<{ success: boolean; data?: AgentMemory; error?: string }>;
  searchMemories: (params: MemorySearchParams) => Promise<void>;
  clearMemories: (memoryType?: 'conversation' | 'document' | 'knowledge' | 'state') => Promise<{ success: boolean; error?: string }>;
  deleteMemory: (memoryId: string) => Promise<{ success: boolean; error?: string }>;
}

export function useAgentMemory({ supabaseUrl, supabaseKey, agentId }: UseAgentMemoryOptions): UseAgentMemoryReturn {
  const [memories, setMemories] = useState<AgentMemory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const memoryService = new AgentMemoryService(supabaseUrl, supabaseKey);

  const storeMemory = async (
    memoryType: 'conversation' | 'document' | 'knowledge' | 'state',
    content: any,
    metadata: Record<string, any> = {},
    embedding?: number[]
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await memoryService.storeMemory(
        agentId,
        memoryType,
        content,
        metadata,
        embedding
      );

      if (result.success && result.data) {
        setMemories(prev => [result.data as AgentMemory, ...prev]);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to store memory';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const searchMemories = async (params: MemorySearchParams) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await memoryService.searchMemory(agentId, params);
      if (result.success && result.data) {
        setMemories(result.data as AgentMemory[]);
      } else {
        setError(result.error || 'Failed to search memories');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const clearMemories = async (memoryType?: 'conversation' | 'document' | 'knowledge' | 'state') => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await memoryService.clearAgentMemory(agentId, memoryType);
      if (result.success) {
        setMemories(prev => 
          memoryType 
            ? prev.filter(memory => memory.memory_type !== memoryType)
            : []
        );
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear memories';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const deleteMemory = async (memoryId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await memoryService.deleteMemory(memoryId);
      if (result.success) {
        setMemories(prev => prev.filter(memory => memory.id !== memoryId));
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete memory';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    memories,
    isLoading,
    error,
    storeMemory,
    searchMemories,
    clearMemories,
    deleteMemory
  };
} 