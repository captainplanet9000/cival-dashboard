import { RedisCacheService, CacheNamespace, CacheExpiration } from '@/utils/redis/cache-service';
import { RedisPubSubService, PubSubChannel } from '@/utils/redis/pubsub-service';
import { getRedisClient } from '@/utils/redis/client';
import { createServerClient } from '@/utils/supabase/server';
import { CoordinatorAgent, AgentPerformance } from './types';

/**
 * AgentManager
 * Tracks agent state, capabilities, performance, and availability
 */
export class AgentManager {
  private static instance: AgentManager;
  private cache: RedisCacheService;
  private pubsub: RedisPubSubService;
  private redisClient: any;
  
  private constructor() {
    this.cache = new RedisCacheService();
    this.pubsub = new RedisPubSubService();
    this.redisClient = getRedisClient();
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): AgentManager {
    if (!AgentManager.instance) {
      AgentManager.instance = new AgentManager();
    }
    return AgentManager.instance;
  }
  
  /**
   * Register agent for coordination
   */
  public async registerAgent(
    agentId: string, 
    farmId: string,
    name: string,
    capabilities: string[],
    maxConcurrentTasks: number = 3,
    priority: number = 5
  ): Promise<CoordinatorAgent> {
    // Create agent object
    const agent: CoordinatorAgent = {
      id: agentId,
      name,
      farmId,
      status: 'idle',
      capabilities,
      currentTasks: [],
      maxConcurrentTasks,
      priority,
      lastHeartbeat: Date.now(),
      performance: {
        tasksCompleted: 0,
        tasksSuccessRate: 0,
        averageTaskDuration: 0
      }
    };
    
    // Store agent in cache
    await this.cache.set(
      CacheNamespace.FARM_STATE,
      `agent_${agentId}`,
      agent,
      CacheExpiration.DAY
    );
    
    // Add to farm agents sorted set (score is priority for task distribution)
    await this.redisClient.zadd(
      `trading-farm:farm:${farmId}:agents`,
      priority,
      agentId
    );
    
    // Add to capability sets for each capability
    for (const capability of capabilities) {
      await this.redisClient.sadd(
        `trading-farm:capability:${capability}:agents`,
        agentId
      );
    }
    
    // Publish agent registration event
    await this.pubsub.publish(
      PubSubChannel.FARM_UPDATES,
      farmId,
      {
        type: 'agent_registered',
        farmId,
        agentId,
        capabilities,
        timestamp: Date.now(),
      }
    );
    
    return agent;
  }
  
  /**
   * Update agent status
   */
  public async updateAgentStatus(
    agentId: string,
    status: string,
    details?: Record<string, any>
  ): Promise<CoordinatorAgent | null> {
    // Get current agent data
    const agent = await this.getAgent(agentId);
    
    if (!agent) {
      console.error(`Cannot update status for non-existent agent: ${agentId}`);
      return null;
    }
    
    // Update agent data
    const updatedAgent: CoordinatorAgent = {
      ...agent,
      status,
      lastHeartbeat: Date.now(),
    };
    
    // Store updated agent in cache
    await this.cache.set(
      CacheNamespace.FARM_STATE,
      `agent_${agentId}`,
      updatedAgent,
      CacheExpiration.DAY
    );
    
    // Publish agent status update event
    await this.pubsub.publish(
      PubSubChannel.AGENT_ACTIONS,
      'status_updates',
      {
        type: 'agent_status_update',
        agentId,
        farmId: agent.farmId,
        previousStatus: agent.status,
        newStatus: status,
        details,
        timestamp: Date.now(),
      }
    );
    
    return updatedAgent;
  }
  
  /**
   * Update agent heartbeat
   */
  public async updateHeartbeat(agentId: string): Promise<boolean> {
    // Get current agent data
    const agent = await this.getAgent(agentId);
    
    if (!agent) {
      return false;
    }
    
    // Update heartbeat timestamp
    const updatedAgent: CoordinatorAgent = {
      ...agent,
      lastHeartbeat: Date.now(),
    };
    
    // Store updated agent in cache
    await this.cache.set(
      CacheNamespace.FARM_STATE,
      `agent_${agentId}`,
      updatedAgent,
      CacheExpiration.DAY
    );
    
    return true;
  }
  
  /**
   * Get agent by ID
   */
  public async getAgent(agentId: string): Promise<CoordinatorAgent | null> {
    return await this.cache.get<CoordinatorAgent>(CacheNamespace.FARM_STATE, `agent_${agentId}`);
  }
  
  /**
   * Find agents with specific capabilities
   */
  public async findAgentsWithCapabilities(
    farmId: string,
    capabilities: string[],
    status: string = 'idle',
    limit: number = 5
  ): Promise<CoordinatorAgent[]> {
    const agents: CoordinatorAgent[] = [];
    
    // For each capability, get agents that have it
    const agentsByCapability: Record<string, string[]> = {};
    
    for (const capability of capabilities) {
      const agentIds = await this.redisClient.smembers(
        `trading-farm:capability:${capability}:agents`
      );
      
      agentsByCapability[capability] = agentIds;
    }
    
    // Find agents that have all required capabilities
    const allCapabilityAgents = Object.values(agentsByCapability).reduce(
      (intersection, agentIds) => 
        intersection.filter(id => agentIds.includes(id)),
      Object.values(agentsByCapability)[0] || []
    );
    
    // Get agent details for each matching agent
    for (const agentId of allCapabilityAgents) {
      const agent = await this.getAgent(agentId);
      
      if (agent && 
          agent.farmId === farmId && 
          (status === 'any' || agent.status === status) &&
          agent.currentTasks.length < agent.maxConcurrentTasks) {
        agents.push(agent);
        
        // Stop if we have enough agents
        if (agents.length >= limit) {
          break;
        }
      }
    }
    
    // Sort by priority (higher values first)
    return agents.sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * Add task to agent's current tasks
   */
  public async addTaskToAgent(agentId: string, taskId: string): Promise<boolean> {
    // Get current agent data
    const agent = await this.getAgent(agentId);
    
    if (!agent) {
      console.error(`Cannot add task to non-existent agent: ${agentId}`);
      return false;
    }
    
    // Check if agent can accept more tasks
    if (agent.currentTasks.length >= agent.maxConcurrentTasks) {
      console.error(`Agent ${agentId} already has maximum tasks (${agent.maxConcurrentTasks})`);
      return false;
    }
    
    // Add task to agent's current tasks
    const currentTasks = [...agent.currentTasks, taskId];
    
    // Update agent data
    const updatedAgent: CoordinatorAgent = {
      ...agent,
      currentTasks,
      status: currentTasks.length > 0 ? 'busy' : 'idle',
      lastHeartbeat: Date.now(),
    };
    
    // Store updated agent in cache
    await this.cache.set(
      CacheNamespace.FARM_STATE,
      `agent_${agentId}`,
      updatedAgent,
      CacheExpiration.DAY
    );
    
    return true;
  }
  
  /**
   * Remove task from agent's current tasks
   */
  public async removeTaskFromAgent(agentId: string, taskId: string): Promise<boolean> {
    // Get current agent data
    const agent = await this.getAgent(agentId);
    
    if (!agent) {
      console.error(`Cannot remove task from non-existent agent: ${agentId}`);
      return false;
    }
    
    // Remove task from agent's current tasks
    const currentTasks = agent.currentTasks.filter(id => id !== taskId);
    
    // Update agent data
    const updatedAgent: CoordinatorAgent = {
      ...agent,
      currentTasks,
      status: currentTasks.length > 0 ? 'busy' : 'idle',
      lastHeartbeat: Date.now(),
    };
    
    // Store updated agent in cache
    await this.cache.set(
      CacheNamespace.FARM_STATE,
      `agent_${agentId}`,
      updatedAgent,
      CacheExpiration.DAY
    );
    
    return true;
  }
  
  /**
   * Update agent performance metrics
   */
  public async updateAgentPerformance(
    agentId: string,
    metrics: Partial<AgentPerformance>
  ): Promise<boolean> {
    // Get current agent data
    const agent = await this.getAgent(agentId);
    
    if (!agent) {
      console.error(`Cannot update performance for non-existent agent: ${agentId}`);
      return false;
    }
    
    // Update performance metrics
    const performance: AgentPerformance = {
      ...agent.performance,
      ...metrics,
    };
    
    // Update agent data
    const updatedAgent: CoordinatorAgent = {
      ...agent,
      performance,
      lastHeartbeat: Date.now(),
    };
    
    // Store updated agent in cache
    await this.cache.set(
      CacheNamespace.FARM_STATE,
      `agent_${agentId}`,
      updatedAgent,
      CacheExpiration.DAY
    );
    
    return true;
  }
  
  /**
   * Get all agents for a farm
   */
  public async getFarmAgents(farmId: string): Promise<CoordinatorAgent[]> {
    // Get agent IDs from sorted set
    const agentIds = await this.redisClient.zrange(
      `trading-farm:farm:${farmId}:agents`,
      0,
      -1
    );
    
    if (!agentIds || agentIds.length === 0) {
      return [];
    }
    
    // Get agent details
    const agents: CoordinatorAgent[] = [];
    
    for (const agentId of agentIds) {
      const agent = await this.getAgent(agentId);
      if (agent) {
        agents.push(agent);
      }
    }
    
    return agents;
  }
  
  /**
   * Check for inactive agents and mark them as offline
   */
  public async checkInactiveAgents(inactiveThresholdMs: number = 60000): Promise<string[]> {
    const now = Date.now();
    const inactiveAgents: string[] = [];
    
    try {
      // Get all agent keys
      const agentKeys = await this.redisClient.keys('trading-farm:farm:*:agents');
      
      for (const key of agentKeys) {
        // Get agent IDs from sorted set
        const agentIds = await this.redisClient.zrange(key, 0, -1);
        
        for (const agentId of agentIds) {
          const agent = await this.getAgent(agentId);
          
          if (agent && now - agent.lastHeartbeat > inactiveThresholdMs) {
            // Mark agent as offline
            await this.updateAgentStatus(agent.id, 'offline');
            inactiveAgents.push(agent.id);
          }
        }
      }
      
      return inactiveAgents;
    } catch (error) {
      console.error('Error checking inactive agents:', error);
      return [];
    }
  }
}
