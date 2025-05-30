import { MemoryItem, MemoryItemRepository } from '../repositories/memory-item-repository';

/**
 * Memory search result with relevance score
 */
export interface MemorySearchResult extends MemoryItem {
  relevance_score: number;
}

/**
 * Cognee Memory Item interface with additional metadata
 */
export interface CogneeMemoryItem {
  id?: string;
  content: string;
  type: MemoryItem['type'];
  importance: number;
  metadata: Record<string, any>;
  expiresInDays?: number;
  embedding?: any;
}

/**
 * Memory search parameters
 */
export interface MemorySearchParams {
  query: string;
  limit?: number;
  minImportance?: number;
  recency?: 'high' | 'medium' | 'low';
  types?: MemoryItem['type'][];
}

/**
 * CogneeClient - Memory management for intelligent agents
 * 
 * This client provides a high-level interface for working with agent memories,
 * including storing, retrieving, and searching memories semantically.
 */
export class CogneeClient {
  private repository: MemoryItemRepository;
  private agentId: string;
  
  constructor(agentId: string) {
    this.agentId = agentId;
    this.repository = new MemoryItemRepository();
  }
  
  /**
   * Store a new memory for the agent
   */
  async storeMemory(memory: CogneeMemoryItem): Promise<MemoryItem | null> {
    const expiresAt = memory.expiresInDays 
      ? new Date(Date.now() + memory.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : undefined;
      
    return this.repository.createMemoryItem({
      agent_id: this.agentId,
      content: memory.content,
      type: memory.type,
      importance: memory.importance,
      metadata: memory.metadata,
      expires_at: expiresAt
    });
  }
  
  /**
   * Store multiple memories in a batch
   */
  async storeMemories(memories: CogneeMemoryItem[]): Promise<MemoryItem[]> {
    const results: MemoryItem[] = [];
    
    for (const memory of memories) {
      const result = await this.storeMemory(memory);
      if (result) {
        results.push(result);
      }
    }
    
    return results;
  }
  
  /**
   * Search for memories semantically
   */
  async searchMemories(params: MemorySearchParams): Promise<MemorySearchResult[]> {
    const searchResults = await this.repository.searchMemories(
      this.agentId,
      params.query,
      params.limit || 10
    );
    
    // Filter by importance if specified
    let filteredResults = searchResults;
    if (params.minImportance !== undefined) {
      filteredResults = filteredResults.filter(item => item.importance >= params.minImportance!);
    }
    
    // Filter by type if specified
    if (params.types && params.types.length > 0) {
      filteredResults = filteredResults.filter(item => params.types!.includes(item.type));
    }
    
    // Apply recency bias if specified
    if (params.recency) {
      filteredResults = this.applyRecencyBias(filteredResults, params.recency);
    }
    
    return filteredResults;
  }
  
  /**
   * Get memories by type
   */
  async getMemoriesByType(type: MemoryItem['type'], limit: number = 20): Promise<MemoryItem[]> {
    return this.repository.getByAgentId(this.agentId, {
      type,
      orderBy: 'importance',
      orderDirection: 'desc',
      notExpired: true,
      maxResults: limit
    });
  }
  
  /**
   * Update memory importance
   */
  async updateImportance(memoryId: string, importance: number): Promise<MemoryItem | null> {
    return this.repository.updateMemoryItem(memoryId, { importance });
  }
  
  /**
   * Delete a memory
   */
  async deleteMemory(memoryId: string): Promise<boolean> {
    return this.repository.deleteMemoryItem(memoryId);
  }
  
  /**
   * Apply recency bias to search results
   */
  private applyRecencyBias(
    memories: MemorySearchResult[], 
    bias: 'high' | 'medium' | 'low'
  ): MemorySearchResult[] {
    const biasMultiplier = bias === 'high' ? 0.7 : bias === 'medium' ? 0.4 : 0.1;
    
    const now = Date.now();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
    
    // Sort by a combination of importance and recency
    return [...memories].sort((a, b) => {
      const aAge = now - new Date(a.created_at).getTime();
      const bAge = now - new Date(b.created_at).getTime();
      
      const aRecencyScore = Math.max(0, 1 - (aAge / maxAge));
      const bRecencyScore = Math.max(0, 1 - (bAge / maxAge));
      
      const aScore = (a.importance / 10) * (1 - biasMultiplier) + aRecencyScore * biasMultiplier;
      const bScore = (b.importance / 10) * (1 - biasMultiplier) + bRecencyScore * biasMultiplier;
      
      return bScore - aScore;
    });
  }
} 