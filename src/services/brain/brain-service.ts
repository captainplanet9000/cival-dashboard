import { SupabaseService, ApiResponse } from '../database/supabase-service';
import { Database } from '@/types/database.types';

// Brain document type
export type BrainDocument = {
  id: number;
  farm_id: number;
  title: string;
  content: string;
  document_type: string;
  metadata: Record<string, any>;
  embedding?: number[];
  tags: string[];
  created_at: string;
  updated_at: string;
};

// Agent memory type
export type AgentMemory = {
  id: number;
  agent_id: number;
  memory_type: 'conversation' | 'document' | 'knowledge' | 'state';
  content: string;
  importance: number;
  embedding?: number[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
};

// Parameters for creating a brain document
export interface CreateBrainDocumentParams {
  farmId: number;
  title: string;
  content: string;
  documentType: string;
  metadata?: Record<string, any>;
  tags?: string[];
}

// Parameters for creating an agent memory
export interface CreateAgentMemoryParams {
  agentId: number;
  memoryType: 'conversation' | 'document' | 'knowledge' | 'state';
  content: string;
  importance?: number;
  metadata?: Record<string, any>;
}

// Command types
export type CommandCategory = 'command' | 'query' | 'analysis' | 'alert';
export type CommandSource = 'knowledge-base' | 'market-data' | 'strategy' | 'system';

// Parameters for creating a brain command
export interface CreateBrainCommandParams {
  farmId: number;
  content: string;
  response?: string;
  category: CommandCategory;
  source: CommandSource;
  metadata?: Record<string, any>;
}

/**
 * Service for managing the Brain Farm component
 * Handles document storage, retrieval, and memory management
 */
export class BrainService {
  private dbService = SupabaseService.getInstance();
  private static instance: BrainService;

  // Private constructor for singleton pattern
  private constructor() {}

  // Get singleton instance
  public static getInstance(): BrainService {
    if (!BrainService.instance) {
      BrainService.instance = new BrainService();
    }
    return BrainService.instance;
  }

  /**
   * Upload a document to the brain
   */
  async uploadDocument(params: CreateBrainDocumentParams): Promise<ApiResponse<BrainDocument>> {
    const documentData = {
      farm_id: params.farmId,
      title: params.title,
      content: params.content,
      document_type: params.documentType,
      metadata: params.metadata || {},
      tags: params.tags || []
    };

    return this.dbService.create<BrainDocument>('brain_documents', documentData, { single: true });
  }

  /**
   * Get documents for a farm
   */
  async getDocuments(farmId: number, documentType?: string): Promise<ApiResponse<BrainDocument[]>> {
    const conditions: Record<string, any> = {
      farm_id: farmId
    };
    
    if (documentType) {
      conditions.document_type = documentType;
    }
    
    return this.dbService.fetch<BrainDocument[]>('brain_documents', '*', {
      eq: conditions,
      order: { column: 'created_at', ascending: false }
    });
  }

  /**
   * Get a document by ID
   */
  async getDocumentById(id: number): Promise<ApiResponse<BrainDocument>> {
    return this.dbService.fetch<BrainDocument>('brain_documents', '*', {
      eq: { id },
      single: true
    });
  }

  /**
   * Delete a document
   */
  async deleteDocument(id: number): Promise<ApiResponse<BrainDocument>> {
    return this.dbService.remove<BrainDocument>('brain_documents', { id });
  }

  /**
   * Search documents using text
   */
  async searchDocuments(farmId: number, query: string): Promise<ApiResponse<BrainDocument[]>> {
    try {
      const { data, error } = await this.dbService.getClient()
        .from('brain_documents')
        .select('*')
        .eq('farm_id', farmId)
        .textSearch('content', query);

      if (error) throw error;
      
      return { data, success: true };
    } catch (err) {
      console.error('Error searching documents:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'An unexpected error occurred'
      };
    }
  }

  /**
   * Create agent memory
   */
  async createMemory(params: CreateAgentMemoryParams): Promise<ApiResponse<AgentMemory>> {
    const memoryData = {
      agent_id: params.agentId,
      memory_type: params.memoryType,
      content: params.content,
      importance: params.importance || 0.5,
      metadata: params.metadata || {}
    };

    return this.dbService.create<AgentMemory>('agent_memory', memoryData, { single: true });
  }

  /**
   * Get memories for an agent
   */
  async getAgentMemories(agentId: number, memoryType?: string): Promise<ApiResponse<AgentMemory[]>> {
    const conditions: Record<string, any> = {
      agent_id: agentId
    };
    
    if (memoryType) {
      conditions.memory_type = memoryType;
    }
    
    return this.dbService.fetch<AgentMemory[]>('agent_memory', '*', {
      eq: conditions,
      order: { column: 'importance', ascending: false }
    });
  }

  /**
   * Create a command
   */
  async createCommand(params: CreateBrainCommandParams): Promise<ApiResponse<any>> {
    const commandData = {
      farm_id: params.farmId,
      content: params.content,
      response: params.response,
      category: params.category,
      source: params.source,
      metadata: params.metadata || {}
    };

    return this.dbService.create('brain_commands', commandData, { single: true });
  }

  /**
   * Get commands for a farm
   */
  async getCommands(farmId: number, limit = 100): Promise<ApiResponse<any[]>> {
    return this.dbService.fetch('brain_commands', '*', {
      eq: { farm_id: farmId },
      limit,
      order: { column: 'created_at', ascending: false }
    });
  }

  /**
   * Subscribe to document changes
   */
  subscribeToDocuments(callback: (payload: any) => void): () => void {
    return this.dbService.subscribe('brain_documents', callback);
  }

  /**
   * Subscribe to memory changes
   */
  subscribeToMemories(callback: (payload: any) => void): () => void {
    return this.dbService.subscribe('agent_memory', callback);
  }

  /**
   * Subscribe to command changes
   */
  subscribeToCommands(callback: (payload: any) => void): () => void {
    return this.dbService.subscribe('brain_commands', callback);
  }
}

// Export singleton instance
export const brainService = BrainService.getInstance(); 