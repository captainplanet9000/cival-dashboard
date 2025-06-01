import { OpenAIEmbeddings } from '../integrations/openai/embeddings';
import { MemoryItemRepository, MemoryItem, MemorySearchResult, CreateMemoryItemData } from '../repositories/memory-item-repository';

/**
 * Enhanced memory service with vector embedding support
 * 
 * This service enhances the memory system with semantic search capabilities
 * using vector embeddings from OpenAI or similar models.
 */
export class EnhancedMemoryService {
  private embeddings: OpenAIEmbeddings;
  private repository: MemoryItemRepository;
  
  constructor() {
    this.embeddings = new OpenAIEmbeddings();
    this.repository = new MemoryItemRepository();
  }
  
  /**
   * Store a memory item with embedding
   * 
   * @param agentId Agent ID
   * @param content Memory content
   * @param type Memory type
   * @param importance Importance score (1-10)
   * @param metadata Additional metadata
   * @param expiresInDays Optional expiration in days
   * @returns Created memory item
   */
  async storeMemory(
    agentId: string,
    content: string,
    type: MemoryItem['type'],
    importance: number,
    metadata: Record<string, any> = {},
    expiresInDays?: number
  ): Promise<MemoryItem | null> {
    try {
      // Generate embedding for the content
      const embedding = await this.embeddings.generateEmbedding(content);
      
      // Calculate expiration date if provided
      const expiresAt = expiresInDays 
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined;
      
      // Generate keywords as fallback
      const keywords = content
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 2);
      
      // Prepare memory item data
      const memoryData: CreateMemoryItemData = {
        agent_id: agentId,
        content,
        type,
        importance,
        metadata,
        expires_at: expiresAt,
        embedding,
        keywords
      };
      
      // Store the memory with embedding
      return await this.repository.createMemoryItem(memoryData);
    } catch (error) {
      console.error('Error storing memory with embedding:', error);
      
      // Try to store without embedding as fallback
      const memoryData: CreateMemoryItemData = {
        agent_id: agentId,
        content,
        type,
        importance,
        metadata,
        expires_at: expiresInDays 
          ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
          : undefined
      };
      
      return await this.repository.createMemoryItem(memoryData);
    }
  }
  
  /**
   * Get memories by time range
   * 
   * @param agentId Agent ID
   * @param fromDate Start date
   * @param toDate End date
   * @param maxItems Maximum items to return
   * @returns Memory items in the time range
   */
  async getMemoriesByTimeRange(
    agentId: string,
    fromDate: string,
    toDate: string,
    maxItems: number = 50
  ): Promise<MemoryItem[]> {
    return await this.repository.getByAgentId(agentId, {
      fromDate,
      toDate,
      maxResults: maxItems,
      orderBy: 'created_at',
      orderDirection: 'desc',
      notExpired: true
    });
  }
  
  /**
   * Get recent memories for an agent
   * 
   * @param agentId Agent ID
   * @param limit Maximum number of memories to return
   * @returns Most recent memory items
   */
  async getRecentMemories(
    agentId: string,
    limit: number = 50
  ): Promise<MemoryItem[]> {
    return await this.repository.getByAgentId(agentId, {
      maxResults: limit,
      orderBy: 'created_at',
      orderDirection: 'desc',
      notExpired: true
    });
  }
  
  /**
   * Search memories using semantic vector search
   * 
   * @param agentId Agent ID
   * @param query Search query
   * @param limit Maximum number of results
   * @param options Additional search options
   * @returns Memory search results with relevance scores
   */
  async searchMemories(
    agentId: string, 
    query: string, 
    limit: number = 10,
    options: {
      minImportance?: number;
      recency?: 'high' | 'medium' | 'low';
      types?: MemoryItem['type'][];
    } = {}
  ): Promise<MemorySearchResult[]> {
    // First try to search using vector similarity
    const searchResults = await this.vectorSearch(agentId, query, limit * 2);
    
    // Apply post-processing filters and reranking
    let filteredResults = searchResults;
    
    // Filter by importance if specified
    if (options.minImportance !== undefined) {
      filteredResults = filteredResults.filter(item => item.importance >= options.minImportance!);
    }
    
    // Filter by type if specified
    if (options.types && options.types.length > 0) {
      filteredResults = filteredResults.filter(item => options.types!.includes(item.type));
    }
    
    // Apply recency bias if specified
    if (options.recency) {
      filteredResults = this.applyRecencyBias(filteredResults, options.recency);
    }
    
    // Return top results
    return filteredResults.slice(0, limit);
  }
  
  /**
   * Execute semantic vector search
   * 
   * @param agentId Agent ID
   * @param query Search query
   * @param limit Maximum results
   * @returns Search results
   */
  private async vectorSearch(
    agentId: string,
    query: string,
    limit: number
  ): Promise<MemorySearchResult[]> {
    try {
      // First generate embedding for the query
      const queryEmbedding = await this.embeddings.generateEmbedding(query);
      
      // Search using repository
      return await this.repository.searchMemories(
        agentId,
        query, // Pass the query directly - repository will handle if vector or text search
        limit,
        0.5 // Similarity threshold
      );
    } catch (error) {
      console.error('Error in vector search:', error);
      // Fall back to repository's text search
      return await this.repository.searchMemories(agentId, query, limit);
    }
  }
  
  /**
   * Apply recency bias to search results
   * 
   * @param memories Search results
   * @param bias Recency bias level
   * @returns Reranked results
   */
  private applyRecencyBias(
    memories: MemorySearchResult[], 
    bias: 'high' | 'medium' | 'low'
  ): MemorySearchResult[] {
    // Adjust weighting based on bias level
    const biasMultiplier = bias === 'high' ? 0.7 : bias === 'medium' ? 0.4 : 0.1;
    
    const now = Date.now();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
    
    // Calculate a new score that combines vector similarity and recency
    return [...memories].map(memory => {
      const age = now - new Date(memory.created_at).getTime();
      const recencyScore = Math.max(0, 1 - (age / maxAge));
      
      // Combine original relevance with recency
      const combinedScore = 
        memory.relevance_score * (1 - biasMultiplier) + 
        recencyScore * biasMultiplier;
      
      return {
        ...memory,
        relevance_score: combinedScore
      };
    }).sort((a, b) => b.relevance_score - a.relevance_score);
  }
  
  /**
   * Get memories by type
   * 
   * @param agentId Agent ID
   * @param type Memory type
   * @param limit Maximum results
   * @returns Memory items
   */
  async getMemoriesByType(
    agentId: string,
    type: MemoryItem['type'],
    limit: number = 20
  ): Promise<MemoryItem[]> {
    return await this.repository.getByAgentId(agentId, {
      type,
      maxResults: limit,
      orderBy: 'importance',
      orderDirection: 'desc',
      notExpired: true
    });
  }
  
  /**
   * Update memory importance
   * 
   * @param memoryId Memory ID to update
   * @param importance New importance value
   * @returns Updated memory item
   */
  async updateImportance(
    memoryId: string,
    importance: number
  ): Promise<MemoryItem | null> {
    return await this.repository.updateMemoryItem(memoryId, { importance });
  }
  
  /**
   * Record memory access
   * 
   * @param memoryId Memory ID that was accessed
   * @returns Success status
   */
  async recordAccess(memoryId: string): Promise<boolean> {
    return await this.repository.markAsAccessed(memoryId);
  }
  
  /**
   * Clean up expired memories
   * 
   * @returns Number of deleted items
   */
  async cleanupExpiredMemories(): Promise<number> {
    return await this.repository.cleanupExpiredMemories();
  }
} 