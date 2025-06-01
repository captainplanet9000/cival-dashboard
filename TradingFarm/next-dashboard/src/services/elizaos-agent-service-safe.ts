/**
 * ElizaOS Agent Service Safe Wrapper
 * 
 * This is a safety wrapper around the ElizaOS agent service that implements
 * throttling, caching, and debouncing to prevent infinite update cycles.
 * 
 * It wraps all methods from the original service but adds safeguards against
 * excessive updates that can cause React rendering issues.
 */

import { elizaOSAgentService, ElizaAgent, ElizaAgentCommand, ElizaAgentMetrics, ElizaAgentCreationRequest } from './elizaos-agent-service';

// Cache timeouts for different operations (in milliseconds)
const CACHE_DURATION = {
  GET_AGENTS: 5000,      // 5 seconds
  GET_AGENT_BY_ID: 5000, // 5 seconds
  GET_COMMANDS: 3000,    // 3 seconds
  GET_METRICS: 10000,    // 10 seconds
};

// Cache storage
interface CacheItem<T> {
  data: T;
  timestamp: number;
}

type CacheStore = {
  agents: CacheItem<ElizaAgent[]> | null;
  agentById: Record<string, CacheItem<ElizaAgent>>;
  commands: Record<string, CacheItem<ElizaAgentCommand[]>>;
  metrics: Record<string, CacheItem<ElizaAgentMetrics>>;
}

// Initialize cache
const cache: CacheStore = {
  agents: null,
  agentById: {},
  commands: {},
  metrics: {},
};

// Throttling controls
const lastUpdateTime: Record<string, number> = {};
const MIN_UPDATE_INTERVAL = 2000; // Minimum 2 seconds between operations of the same type

// Check if throttling is needed for an operation
const shouldThrottle = (operationKey: string): boolean => {
  const now = Date.now();
  const lastUpdate = lastUpdateTime[operationKey] || 0;
  
  if (now - lastUpdate < MIN_UPDATE_INTERVAL) {
    console.log(`Throttling operation: ${operationKey}`);
    return true;
  }
  
  lastUpdateTime[operationKey] = now;
  return false;
};

// Check if we can use the cached value
const canUseCache = <T>(cacheItem: CacheItem<T> | null, duration: number): boolean => {
  if (!cacheItem) return false;
  
  const now = Date.now();
  return (now - cacheItem.timestamp) < duration;
};

/**
 * Safe wrapper around elizaOSAgentService to prevent update loops
 */
class ElizaOSAgentServiceSafe {
  /**
   * Get all agents with caching and throttling
   */
  async getAgents(): Promise<ElizaAgent[]> {
    const operationKey = 'getAgents';
    
    // Return cached data if available and not expired
    if (canUseCache(cache.agents, CACHE_DURATION.GET_AGENTS)) {
      return cache.agents!.data;
    }
    
    // Throttle updates if called too frequently
    if (shouldThrottle(operationKey)) {
      // Return existing cache even if expired, or empty array if no cache
      return cache.agents?.data || [];
    }
    
    try {
      // Get fresh data
      const agents = await elizaOSAgentService.getAgents();
      
      // Update cache
      cache.agents = {
        data: agents,
        timestamp: Date.now()
      };
      
      return agents;
    } catch (error) {
      console.error('Error in getAgents:', error);
      
      // Return cached data if available, even if expired
      if (cache.agents) {
        return cache.agents.data;
      }
      
      throw error;
    }
  }
  
  /**
   * Get agent by ID with caching and throttling
   */
  async getAgentById(agentId: string): Promise<ElizaAgent> {
    const operationKey = `getAgentById-${agentId}`;
    
    // Return cached data if available and not expired
    if (canUseCache(cache.agentById[agentId], CACHE_DURATION.GET_AGENT_BY_ID)) {
      return cache.agentById[agentId].data;
    }
    
    // Throttle updates if called too frequently
    if (shouldThrottle(operationKey)) {
      // Return existing cache even if expired
      if (cache.agentById[agentId]) {
        return cache.agentById[agentId].data;
      }
    }
    
    try {
      // Get fresh data
      const agent = await elizaOSAgentService.getAgentById(agentId);
      
      // Update cache
      cache.agentById[agentId] = {
        data: agent,
        timestamp: Date.now()
      };
      
      return agent;
    } catch (error) {
      console.error(`Error in getAgentById for ${agentId}:`, error);
      
      // Return cached data if available, even if expired
      if (cache.agentById[agentId]) {
        return cache.agentById[agentId].data;
      }
      
      throw error;
    }
  }
  
  /**
   * Create a new agent (no caching, but throttled)
   */
  async createAgent(request: ElizaAgentCreationRequest): Promise<ElizaAgent> {
    const operationKey = 'createAgent';
    
    // Throttle updates if called too frequently
    if (shouldThrottle(operationKey)) {
      throw new Error('Please wait a moment before creating another agent.');
    }
    
    const agent = await elizaOSAgentService.createAgent(request);
    
    // Invalidate the agents cache when a new agent is created
    cache.agents = null;
    
    return agent;
  }
  
  /**
   * Update an agent (no caching, but throttled)
   */
  async updateAgent(agentId: string, updates: Partial<ElizaAgent>): Promise<ElizaAgent> {
    const operationKey = `updateAgent-${agentId}`;
    
    // Throttle updates if called too frequently
    if (shouldThrottle(operationKey)) {
      // If throttled, try to return existing agent from cache
      if (cache.agentById[agentId]) {
        return cache.agentById[agentId].data;
      }
      throw new Error('Please wait a moment before updating the agent again.');
    }
    
    const updatedAgent = await elizaOSAgentService.updateAgent(agentId, updates);
    
    // Invalidate both the specific agent cache and the agents list cache
    cache.agentById[agentId] = {
      data: updatedAgent,
      timestamp: Date.now()
    };
    cache.agents = null;
    
    return updatedAgent;
  }
  
  /**
   * Delete an agent (no caching, but throttled)
   */
  async deleteAgent(agentId: string): Promise<void> {
    const operationKey = `deleteAgent-${agentId}`;
    
    // Throttle updates if called too frequently
    if (shouldThrottle(operationKey)) {
      throw new Error('Please wait a moment before deleting another agent.');
    }
    
    await elizaOSAgentService.deleteAgent(agentId);
    
    // Invalidate caches
    delete cache.agentById[agentId];
    cache.agents = null;
  }
  
  /**
   * Control an agent (no caching, but throttled)
   */
  async controlAgent(agentId: string, action: 'start' | 'stop' | 'pause' | 'resume'): Promise<ElizaAgent> {
    const operationKey = `controlAgent-${agentId}-${action}`;
    
    // Throttle updates if called too frequently
    if (shouldThrottle(operationKey)) {
      // If throttled, try to return existing agent from cache
      if (cache.agentById[agentId]) {
        return cache.agentById[agentId].data;
      }
      throw new Error(`Please wait a moment before ${action}ing the agent again.`);
    }
    
    const updatedAgent = await elizaOSAgentService.controlAgent(agentId, action);
    
    // Update caches
    cache.agentById[agentId] = {
      data: updatedAgent,
      timestamp: Date.now()
    };
    
    // Invalidate agents list cache
    cache.agents = null;
    
    return updatedAgent;
  }
  
  /**
   * Get agent commands with caching and throttling
   */
  async getAgentCommands(agentId: string, limit: number = 50): Promise<ElizaAgentCommand[]> {
    const cacheKey = `${agentId}-${limit}`;
    const operationKey = `getAgentCommands-${cacheKey}`;
    
    // Return cached data if available and not expired
    if (canUseCache(cache.commands[cacheKey], CACHE_DURATION.GET_COMMANDS)) {
      return cache.commands[cacheKey].data;
    }
    
    // Throttle updates if called too frequently
    if (shouldThrottle(operationKey)) {
      // Return existing cache even if expired
      if (cache.commands[cacheKey]) {
        return cache.commands[cacheKey].data;
      }
      // Return empty array if no cache exists yet
      return [];
    }
    
    try {
      // Get fresh data
      const commands = await elizaOSAgentService.getAgentCommands(agentId, limit);
      
      // Update cache
      cache.commands[cacheKey] = {
        data: commands,
        timestamp: Date.now()
      };
      
      return commands;
    } catch (error) {
      console.error(`Error in getAgentCommands for ${agentId}:`, error);
      
      // Return cached data if available, even if expired
      if (cache.commands[cacheKey]) {
        return cache.commands[cacheKey].data;
      }
      
      return [];
    }
  }
  
  /**
   * Add agent command (no caching, but throttled)
   */
  async addAgentCommand(agentId: string, commandText: string): Promise<ElizaAgentCommand> {
    const operationKey = `addAgentCommand-${agentId}`;
    
    // Throttle updates if called too frequently
    if (shouldThrottle(operationKey)) {
      throw new Error('Please wait a moment before sending another command.');
    }
    
    const command = await elizaOSAgentService.addAgentCommand(agentId, commandText);
    
    // Invalidate commands cache for this agent
    Object.keys(cache.commands).forEach(key => {
      if (key.startsWith(agentId)) {
        delete cache.commands[key];
      }
    });
    
    return command;
  }
  
  /**
   * Get agent metrics with caching and throttling
   */
  async getAgentMetrics(agentId: string): Promise<ElizaAgentMetrics> {
    const operationKey = `getAgentMetrics-${agentId}`;
    
    // Return cached data if available and not expired
    if (canUseCache(cache.metrics[agentId], CACHE_DURATION.GET_METRICS)) {
      return cache.metrics[agentId].data;
    }
    
    // Throttle updates if called too frequently
    if (shouldThrottle(operationKey)) {
      // Return existing cache even if expired
      if (cache.metrics[agentId]) {
        return cache.metrics[agentId].data;
      }
    }
    
    try {
      // Get fresh data
      const metrics = await elizaOSAgentService.getAgentMetrics(agentId);
      
      // Update cache
      cache.metrics[agentId] = {
        data: metrics,
        timestamp: Date.now()
      };
      
      return metrics;
    } catch (error) {
      console.error(`Error in getAgentMetrics for ${agentId}:`, error);
      
      // Return cached data if available, even if expired
      if (cache.metrics[agentId]) {
        return cache.metrics[agentId].data;
      }
      
      throw error;
    }
  }
  
  // Pass through other methods from the original service
  // (add more as needed - these are just the most commonly used)
}

// Export a singleton instance
export const elizaOSAgentServiceSafe = new ElizaOSAgentServiceSafe();
