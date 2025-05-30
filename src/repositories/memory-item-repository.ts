import { BaseRepository, QueryOptions } from '../lib/base-repository';
import { supabase } from '../integrations/supabase/client';

/**
 * Memory Item entity
 */
export interface MemoryItem {
  id: string;
  agent_id: string;
  content: string;
  type: 'fact' | 'observation' | 'insight' | 'decision' | 'feedback';
  importance: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  last_accessed_at?: string;
  embedding?: any; // Vector type if pgvector is used
  keywords?: string[]; // Used if pgvector is not available
}

/**
 * Memory search result with relevance score
 */
export interface MemorySearchResult extends MemoryItem {
  relevance_score: number;
}

/**
 * Extended query options for memory items
 */
export interface MemoryItemQueryOptions extends QueryOptions {
  type?: MemoryItem['type'];
  minImportance?: number;
  maxImportance?: number;
  fromDate?: string;
  toDate?: string;
  notExpired?: boolean;
  maxResults?: number;
}

/**
 * Memory item creation data
 */
export interface CreateMemoryItemData {
  agent_id: string;
  content: string;
  type: MemoryItem['type'];
  importance: number;
  metadata: Record<string, any>;
  expires_at?: string;
  embedding?: Float32Array;
  keywords?: string[];
}

/**
 * Repository for managing memory items
 */
export class MemoryItemRepository extends BaseRepository<MemoryItem> {
  constructor() {
    super('memory_items', supabase);
  }
  
  /**
   * Create a new memory item
   */
  async createMemoryItem(data: CreateMemoryItemData): Promise<MemoryItem | null> {
    const { data: result, error } = await this.client
      .from(this.tableName)
      .insert({
        agent_id: data.agent_id,
        content: data.content,
        type: data.type,
        importance: data.importance,
        metadata: data.metadata,
        expires_at: data.expires_at,
        embedding: data.embedding ? Array.from(data.embedding) : undefined,
        keywords: data.keywords
      })
      .select()
      .single();
    
    if (error) {
      this.handleError(error);
      return null;
    }
    
    return result as MemoryItem;
  }
  
  /**
   * Get memory items by agent ID with filtering
   */
  async getByAgentId(agentId: string, options: MemoryItemQueryOptions = {}): Promise<MemoryItem[]> {
    let query = this.client
      .from(this.tableName)
      .select('*')
      .eq('agent_id', agentId);
    
    // Apply filters
    if (options.type) {
      query = query.eq('type', options.type);
    }
    
    if (options.minImportance !== undefined) {
      query = query.gte('importance', options.minImportance);
    }
    
    if (options.maxImportance !== undefined) {
      query = query.lte('importance', options.maxImportance);
    }
    
    if (options.fromDate) {
      query = query.gte('created_at', options.fromDate);
    }
    
    if (options.toDate) {
      query = query.lte('created_at', options.toDate);
    }
    
    if (options.notExpired) {
      // Only include items that haven't expired
      query = query.or('expires_at.is.null,expires_at.gt.now()');
    }
    
    // Apply ordering
    if (options.orderBy) {
      const direction = options.orderDirection || 'desc';
      query = query.order(options.orderBy, { ascending: direction === 'asc' });
    } else {
      // Default order by importance and recency
      query = query.order('importance', { ascending: false })
        .order('created_at', { ascending: false });
    }
    
    // Apply pagination
    if (options.maxResults) {
      query = query.limit(options.maxResults);
    } else if (options.limit) {
      query = query.limit(options.limit);
    }
    
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }
    
    const { data, error } = await query;
    
    if (error) {
      this.handleError(error);
      return [];
    }
    
    return data as MemoryItem[];
  }
  
  /**
   * Update a memory item
   */
  async updateMemoryItem(id: string, updates: Partial<MemoryItem>): Promise<MemoryItem | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      this.handleError(error);
      return null;
    }
    
    return data as MemoryItem;
  }
  
  /**
   * Search memories using vector similarity (if available)
   */
  async searchMemories(
    agentId: string,
    query: string,
    limit: number = 10,
    threshold: number = 0.5
  ): Promise<MemorySearchResult[]> {
    try {
      // Check if vector search is supported by looking for the search_memory_items function
      const { data: functionExists, error: functionCheckError } = await this.client
        .rpc('search_memory_items', {
          p_query_embedding: query, // In this case we're just checking if the function exists
          p_agent_id: agentId,
          p_match_threshold: threshold,
          p_match_count: limit
        });
      
      if (functionExists) {
        // Vector search is supported
        const { data, error } = await this.client
          .rpc('search_memory_items', {
            p_query_embedding: query, // Handled by the function whether vector or not
            p_agent_id: agentId,
            p_match_threshold: threshold,
            p_match_count: limit
          });
        
        if (error) {
          this.handleError(error);
          return this.fallbackSearch(agentId, query, limit);
        }
        
        return data as MemorySearchResult[];
      } else {
        // Vector search not supported, fall back to basic text search
        return this.fallbackSearch(agentId, query, limit);
      }
    } catch (error) {
      this.handleError(error as Error);
      return this.fallbackSearch(agentId, query, limit);
    }
  }
  
  /**
   * Fallback search using basic text matching
   */
  private async fallbackSearch(
    agentId: string,
    query: string,
    limit: number = 10
  ): Promise<MemorySearchResult[]> {
    // Try to search using keywords if available
    const hasKeywords = await this.checkIfColumnExists('keywords');
    
    if (hasKeywords) {
      const keywords = query.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 2);
      
      if (keywords.length > 0) {
        const { data, error } = await this.client
          .from(this.tableName)
          .select('*')
          .eq('agent_id', agentId)
          .contains('keywords', keywords)
          .order('importance', { ascending: false })
          .limit(limit);
        
        if (!error && data.length > 0) {
          return data.map(item => ({
            ...item,
            relevance_score: 0.5 // Default score for keyword matches
          })) as MemorySearchResult[];
        }
      }
    }
    
    // Fall back to basic text search
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('agent_id', agentId)
      .ilike('content', `%${query}%`)
      .order('importance', { ascending: false })
      .limit(limit);
    
    if (error) {
      this.handleError(error);
      return [];
    }
    
    return data.map(item => ({
      ...item,
      relevance_score: 0.3 // Lower default score for text matches
    })) as MemorySearchResult[];
  }
  
  /**
   * Check if a column exists in the table
   */
  private async checkIfColumnExists(columnName: string): Promise<boolean> {
    try {
      // Query the database information schema
      const { data, error } = await this.client
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', this.tableName)
        .eq('column_name', columnName);
      
      if (error) {
        return false;
      }
      
      return data && data.length > 0;
    } catch {
      return false;
    }
  }
  
  /**
   * Delete a memory item
   */
  async deleteMemoryItem(id: string): Promise<boolean> {
    const { error } = await this.client
      .from(this.tableName)
      .delete()
      .eq('id', id);
    
    if (error) {
      this.handleError(error);
      return false;
    }
    
    return true;
  }
  
  /**
   * Mark a memory as accessed
   */
  async markAsAccessed(id: string): Promise<boolean> {
    const { error } = await this.client
      .from(this.tableName)
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) {
      this.handleError(error);
      return false;
    }
    
    return true;
  }
  
  /**
   * Delete expired memories
   */
  async cleanupExpiredMemories(): Promise<number> {
    const { data, error } = await this.client
      .from(this.tableName)
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id');
    
    if (error) {
      this.handleError(error);
      return 0;
    }
    
    return data.length;
  }
} 