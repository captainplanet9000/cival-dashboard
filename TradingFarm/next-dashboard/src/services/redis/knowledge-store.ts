import { getRedisClient } from './redis-service';
import { logger } from '@/utils/logger';
import { Database } from '@/types/database.types';

// Redis keys and prefixes
const KNOWLEDGE_PREFIX = 'elizaos:knowledge:';
const KNOWLEDGE_INDEX_PREFIX = 'elizaos:knowledge:index:';
const KNOWLEDGE_AGENT_PREFIX = 'elizaos:knowledge:agent:';

// Default TTL settings
const DEFAULT_TTL = 60 * 60 * 24; // 24 hours in seconds
const DEFAULT_PUBLIC_TTL = 60 * 60 * 24 * 7; // 7 days in seconds

// Knowledge type definition
export interface ElizaKnowledge {
  id: string;
  topic: string;
  content: any;
  source_agent: string;
  target_agents?: string[];
  ttl_ms: number;
  access_level: 'private' | 'shared' | 'public';
  created_at: number;
  expires_at: number;
}

/**
 * Redis-backed knowledge store for ElizaOS agents
 * Provides persistent storage for agent knowledge with TTL support
 */
export class KnowledgeStore {
  /**
   * Store knowledge from an agent
   * 
   * @param knowledge Knowledge object to store
   * @returns ID of the stored knowledge
   */
  static async storeKnowledge(knowledge: Omit<ElizaKnowledge, 'id' | 'created_at' | 'expires_at'>): Promise<string> {
    const redis = getRedisClient();
    if (!redis) {
      logger.warn('Redis unavailable for knowledge store, using fallback');
      return this.fallbackStoreKnowledge(knowledge);
    }

    try {
      // Generate a unique ID using timestamp and a random suffix
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      
      // Calculate expiration timestamp
      const ttlSeconds = Math.floor(knowledge.ttl_ms / 1000);
      const now = Date.now();
      const expires = now + knowledge.ttl_ms;
      
      // Complete knowledge object
      const completeKnowledge: ElizaKnowledge = {
        ...knowledge,
        id,
        created_at: now,
        expires_at: expires
      };
      
      // Store the knowledge with expiration
      await redis.set(
        KNOWLEDGE_PREFIX + id,
        JSON.stringify(completeKnowledge),
        'EX',
        ttlSeconds
      );
      
      // Add to the source agent's knowledge index
      await redis.sadd(KNOWLEDGE_AGENT_PREFIX + knowledge.source_agent, id);
      
      // Add to topic index
      await redis.sadd(KNOWLEDGE_INDEX_PREFIX + knowledge.topic, id);
      
      // If public, add to public knowledge index
      if (knowledge.access_level === 'public') {
        await redis.sadd(KNOWLEDGE_INDEX_PREFIX + 'public', id);
      }
      
      // If shared, add to target agents' indices
      if (knowledge.access_level === 'shared' && knowledge.target_agents?.length) {
        for (const agentId of knowledge.target_agents) {
          await redis.sadd(KNOWLEDGE_AGENT_PREFIX + agentId, id);
        }
      }
      
      logger.debug(`Knowledge ${id} stored by agent ${knowledge.source_agent}`);
      return id;
    } catch (error) {
      logger.error('Error storing knowledge in Redis:', error);
      return this.fallbackStoreKnowledge(knowledge);
    }
  }

  /**
   * Retrieve knowledge by ID
   * 
   * @param id Knowledge ID
   * @returns Knowledge object or null if not found
   */
  static async getKnowledge(id: string): Promise<ElizaKnowledge | null> {
    const redis = getRedisClient();
    if (!redis) {
      logger.warn('Redis unavailable for knowledge retrieval, using fallback');
      return this.fallbackGetKnowledge(id);
    }

    try {
      const result = await redis.get(KNOWLEDGE_PREFIX + id);
      if (!result) {
        return null;
      }
      
      return JSON.parse(result);
    } catch (error) {
      logger.error('Error retrieving knowledge from Redis:', error);
      return this.fallbackGetKnowledge(id);
    }
  }

  /**
   * Query knowledge by topic
   * 
   * @param topic Knowledge topic
   * @param accessLevel Minimum access level
   * @returns Array of knowledge objects
   */
  static async queryByTopic(
    topic: string,
    accessLevel: 'private' | 'shared' | 'public' = 'public'
  ): Promise<ElizaKnowledge[]> {
    const redis = getRedisClient();
    if (!redis) {
      logger.warn('Redis unavailable for knowledge query, using fallback');
      return this.fallbackQueryByTopic(topic, accessLevel);
    }

    try {
      // Get all knowledge IDs for this topic
      const ids = await redis.smembers(KNOWLEDGE_INDEX_PREFIX + topic);
      if (!ids.length) {
        return [];
      }
      
      // Retrieve all knowledge objects
      const pipeline = redis.pipeline();
      for (const id of ids) {
        pipeline.get(KNOWLEDGE_PREFIX + id);
      }
      
      const results = await pipeline.exec();
      if (!results) {
        return [];
      }
      
      // Filter and parse results
      const knowledge: ElizaKnowledge[] = [];
      for (const [err, result] of results) {
        if (err || !result) continue;
        
        try {
          const item = JSON.parse(result as string) as ElizaKnowledge;
          
          // Filter by access level
          if (
            (accessLevel === 'public' && item.access_level === 'public') ||
            (accessLevel === 'shared' && ['shared', 'public'].includes(item.access_level)) ||
            (accessLevel === 'private')
          ) {
            knowledge.push(item);
          }
        } catch (e) {
          logger.error('Error parsing knowledge item:', e);
        }
      }
      
      return knowledge;
    } catch (error) {
      logger.error('Error querying knowledge by topic from Redis:', error);
      return this.fallbackQueryByTopic(topic, accessLevel);
    }
  }

  /**
   * Get knowledge for a specific agent
   * 
   * @param agentId Agent ID
   * @returns Array of knowledge objects
   */
  static async getAgentKnowledge(agentId: string): Promise<ElizaKnowledge[]> {
    const redis = getRedisClient();
    if (!redis) {
      logger.warn('Redis unavailable for agent knowledge query, using fallback');
      return this.fallbackGetAgentKnowledge(agentId);
    }

    try {
      // Get all knowledge IDs for this agent
      const ids = await redis.smembers(KNOWLEDGE_AGENT_PREFIX + agentId);
      if (!ids.length) {
        return [];
      }
      
      // Retrieve all knowledge objects
      const pipeline = redis.pipeline();
      for (const id of ids) {
        pipeline.get(KNOWLEDGE_PREFIX + id);
      }
      
      const results = await pipeline.exec();
      if (!results) {
        return [];
      }
      
      // Filter and parse results
      const knowledge: ElizaKnowledge[] = [];
      for (const [err, result] of results) {
        if (err || !result) continue;
        
        try {
          const item = JSON.parse(result as string) as ElizaKnowledge;
          knowledge.push(item);
        } catch (e) {
          logger.error('Error parsing knowledge item:', e);
        }
      }
      
      return knowledge;
    } catch (error) {
      logger.error('Error getting agent knowledge from Redis:', error);
      return this.fallbackGetAgentKnowledge(agentId);
    }
  }

  /**
   * Delete knowledge by ID
   * 
   * @param id Knowledge ID
   * @returns Whether deletion was successful
   */
  static async deleteKnowledge(id: string): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis) {
      logger.warn('Redis unavailable for knowledge deletion, using fallback');
      return this.fallbackDeleteKnowledge(id);
    }

    try {
      // Get the knowledge first to update indices
      const knowledge = await this.getKnowledge(id);
      if (!knowledge) {
        return false;
      }
      
      // Delete from all indices
      await redis.srem(KNOWLEDGE_INDEX_PREFIX + knowledge.topic, id);
      await redis.srem(KNOWLEDGE_AGENT_PREFIX + knowledge.source_agent, id);
      
      if (knowledge.access_level === 'public') {
        await redis.srem(KNOWLEDGE_INDEX_PREFIX + 'public', id);
      }
      
      if (knowledge.access_level === 'shared' && knowledge.target_agents?.length) {
        for (const agentId of knowledge.target_agents) {
          await redis.srem(KNOWLEDGE_AGENT_PREFIX + agentId, id);
        }
      }
      
      // Delete the knowledge itself
      await redis.del(KNOWLEDGE_PREFIX + id);
      
      logger.debug(`Knowledge ${id} deleted`);
      return true;
    } catch (error) {
      logger.error('Error deleting knowledge from Redis:', error);
      return this.fallbackDeleteKnowledge(id);
    }
  }

  /**
   * Save all knowledge to database
   * Useful for backup or shutdown
   */
  static async persistToDatabase(): Promise<void> {
    const redis = getRedisClient();
    if (!redis) {
      logger.warn('Redis unavailable for knowledge persistence');
      return;
    }

    try {
      // Get all public knowledge
      const publicIds = await redis.smembers(KNOWLEDGE_INDEX_PREFIX + 'public');
      if (!publicIds.length) {
        return;
      }
      
      // Retrieve all knowledge objects
      const pipeline = redis.pipeline();
      for (const id of publicIds) {
        pipeline.get(KNOWLEDGE_PREFIX + id);
      }
      
      const results = await pipeline.exec();
      if (!results) {
        return;
      }
      
      // TODO: Save to database using Supabase
      // This would be implemented as part of the database update system
      
      logger.info(`Persisted ${results.length} knowledge items to database`);
    } catch (error) {
      logger.error('Error persisting knowledge to database:', error);
    }
  }

  // --- In-memory fallback implementations ---
  
  private static fallbackKnowledge = new Map<string, ElizaKnowledge>();
  private static fallbackTopicIndex = new Map<string, Set<string>>();
  private static fallbackAgentIndex = new Map<string, Set<string>>();

  private static fallbackStoreKnowledge(
    knowledge: Omit<ElizaKnowledge, 'id' | 'created_at' | 'expires_at'>
  ): string {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const now = Date.now();
    const expires = now + knowledge.ttl_ms;
    
    const completeKnowledge: ElizaKnowledge = {
      ...knowledge,
      id,
      created_at: now,
      expires_at: expires
    };
    
    this.fallbackKnowledge.set(id, completeKnowledge);
    
    // Update topic index
    if (!this.fallbackTopicIndex.has(knowledge.topic)) {
      this.fallbackTopicIndex.set(knowledge.topic, new Set());
    }
    this.fallbackTopicIndex.get(knowledge.topic)!.add(id);
    
    // Update agent index
    if (!this.fallbackAgentIndex.has(knowledge.source_agent)) {
      this.fallbackAgentIndex.set(knowledge.source_agent, new Set());
    }
    this.fallbackAgentIndex.get(knowledge.source_agent)!.add(id);
    
    if (knowledge.access_level === 'shared' && knowledge.target_agents?.length) {
      for (const agentId of knowledge.target_agents) {
        if (!this.fallbackAgentIndex.has(agentId)) {
          this.fallbackAgentIndex.set(agentId, new Set());
        }
        this.fallbackAgentIndex.get(agentId)!.add(id);
      }
    }
    
    // Set expiration
    setTimeout(() => {
      this.fallbackKnowledge.delete(id);
      this.fallbackTopicIndex.get(knowledge.topic)?.delete(id);
      this.fallbackAgentIndex.get(knowledge.source_agent)?.delete(id);
      
      if (knowledge.target_agents?.length) {
        for (const agentId of knowledge.target_agents) {
          this.fallbackAgentIndex.get(agentId)?.delete(id);
        }
      }
    }, knowledge.ttl_ms);
    
    return id;
  }

  private static fallbackGetKnowledge(id: string): ElizaKnowledge | null {
    return this.fallbackKnowledge.get(id) || null;
  }

  private static fallbackQueryByTopic(
    topic: string,
    accessLevel: 'private' | 'shared' | 'public' = 'public'
  ): ElizaKnowledge[] {
    const ids = this.fallbackTopicIndex.get(topic) || new Set();
    const results: ElizaKnowledge[] = [];
    
    for (const id of ids) {
      const knowledge = this.fallbackKnowledge.get(id);
      if (!knowledge) continue;
      
      if (
        (accessLevel === 'public' && knowledge.access_level === 'public') ||
        (accessLevel === 'shared' && ['shared', 'public'].includes(knowledge.access_level)) ||
        (accessLevel === 'private')
      ) {
        results.push(knowledge);
      }
    }
    
    return results;
  }

  private static fallbackGetAgentKnowledge(agentId: string): ElizaKnowledge[] {
    const ids = this.fallbackAgentIndex.get(agentId) || new Set();
    const results: ElizaKnowledge[] = [];
    
    for (const id of ids) {
      const knowledge = this.fallbackKnowledge.get(id);
      if (knowledge) {
        results.push(knowledge);
      }
    }
    
    return results;
  }

  private static fallbackDeleteKnowledge(id: string): boolean {
    const knowledge = this.fallbackKnowledge.get(id);
    if (!knowledge) {
      return false;
    }
    
    this.fallbackKnowledge.delete(id);
    this.fallbackTopicIndex.get(knowledge.topic)?.delete(id);
    this.fallbackAgentIndex.get(knowledge.source_agent)?.delete(id);
    
    if (knowledge.target_agents?.length) {
      for (const agentId of knowledge.target_agents) {
        this.fallbackAgentIndex.get(agentId)?.delete(id);
      }
    }
    
    return true;
  }
}
