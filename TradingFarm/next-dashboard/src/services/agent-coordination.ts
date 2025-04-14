import { RedisCacheService, CacheNamespace, CacheExpiration } from '@/utils/redis/cache-service';
import { RedisPubSubService, PubSubChannel } from '@/utils/redis/pubsub-service';
import { TRADING_EVENTS } from '@/constants/events';

/**
 * Agent Coordination Service
 * Provides real-time coordination between agents using Redis
 */
export class AgentCoordinationService {
  private static instance: AgentCoordinationService;
  private cache: RedisCacheService;
  private pubsub: RedisPubSubService;
  private agentEventHandlers: Map<string, Set<(event: any) => void>>;
  
  private constructor() {
    this.cache = new RedisCacheService();
    this.pubsub = new RedisPubSubService();
    this.agentEventHandlers = new Map();
    
    // Initialize subscribers for agent events
    this.initializeSubscribers();
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): AgentCoordinationService {
    if (!AgentCoordinationService.instance) {
      AgentCoordinationService.instance = new AgentCoordinationService();
    }
    return AgentCoordinationService.instance;
  }
  
  /**
   * Initialize subscribers for agent events
   */
  private async initializeSubscribers(): Promise<void> {
    // Subscribe to agent actions
    await this.pubsub.subscribe(PubSubChannel.AGENT_ACTIONS, 'all', (message) => {
      const { agentId } = message;
      const handlers = this.agentEventHandlers.get(agentId);
      
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(message);
          } catch (err) {
            console.error(`Error in agent event handler for ${agentId}:`, err);
          }
        });
      }
      
      // Also notify global handlers
      const globalHandlers = this.agentEventHandlers.get('global');
      if (globalHandlers) {
        globalHandlers.forEach(handler => {
          try {
            handler(message);
          } catch (err) {
            console.error('Error in global agent event handler:', err);
          }
        });
      }
    });
    
    // Subscribe to farm updates
    await this.pubsub.subscribe(PubSubChannel.FARM_UPDATES, 'all', (message) => {
      const { farmId } = message;
      
      // Notify relevant agents about farm updates
      this.notifyFarmAgents(farmId, message);
    });
  }
  
  /**
   * Notify all agents in a farm about an update
   */
  private async notifyFarmAgents(farmId: string, message: any): Promise<void> {
    try {
      // Get agents in this farm from cache
      const farmAgents = await this.cache.get<string[]>(CacheNamespace.FARM_STATE, `farm_${farmId}_agents`);
      
      if (farmAgents && farmAgents.length > 0) {
        // Publish message to each agent
        for (const agentId of farmAgents) {
          await this.pubsub.publishAgentAction(agentId, 'farm_update', message);
        }
      }
    } catch (err) {
      console.error(`Error notifying farm agents for ${farmId}:`, err);
    }
  }
  
  /**
   * Register an agent with a farm
   */
  async registerAgentWithFarm(agentId: string, farmId: string, agentData: any): Promise<void> {
    try {
      // Store agent data in cache
      await this.cache.set(
        CacheNamespace.AGENT_STATE, 
        `agent_${agentId}`, 
        {
          ...agentData,
          farmId,
          status: 'registered',
          lastUpdateTime: Date.now()
        },
        CacheExpiration.DAY
      );
      
      // Update farm agents list
      const farmAgentsKey = `farm_${farmId}_agents`;
      const existingAgents = await this.cache.get<string[]>(CacheNamespace.FARM_STATE, farmAgentsKey) || [];
      
      if (!existingAgents.includes(agentId)) {
        existingAgents.push(agentId);
        await this.cache.set(CacheNamespace.FARM_STATE, farmAgentsKey, existingAgents, CacheExpiration.DAY);
      }
      
      // Publish registration event
      await this.pubsub.publishAgentAction(agentId, 'registered', {
        agentId,
        farmId,
        timestamp: Date.now()
      });
      
      // Publish farm update
      await this.pubsub.publishFarmUpdate(farmId, 'agent_added', {
        agentId,
        timestamp: Date.now()
      });
    } catch (err) {
      console.error(`Error registering agent ${agentId} with farm ${farmId}:`, err);
      throw err;
    }
  }
  
  /**
   * Update agent status
   */
  async updateAgentStatus(agentId: string, status: string, data?: any): Promise<void> {
    try {
      // Get current agent data
      const agentData = await this.cache.get<any>(CacheNamespace.AGENT_STATE, `agent_${agentId}`);
      
      if (!agentData) {
        throw new Error(`Agent ${agentId} not found`);
      }
      
      // Update agent data
      const updatedData = {
        ...agentData,
        status,
        lastUpdateTime: Date.now(),
        ...(data || {})
      };
      
      // Store updated data
      await this.cache.set(CacheNamespace.AGENT_STATE, `agent_${agentId}`, updatedData, CacheExpiration.DAY);
      
      // Publish status update
      await this.pubsub.publishAgentAction(agentId, 'status_update', {
        agentId,
        status,
        previousStatus: agentData.status,
        farmId: agentData.farmId,
        timestamp: Date.now(),
        ...(data || {})
      });
    } catch (err) {
      console.error(`Error updating agent status for ${agentId}:`, err);
      throw err;
    }
  }
  
  /**
   * Send command to agent
   */
  async sendCommandToAgent(agentId: string, command: string, params?: any): Promise<void> {
    try {
      // Publish command to agent
      await this.pubsub.publishAgentAction(agentId, 'command', {
        agentId,
        command,
        params,
        timestamp: Date.now(),
        commandId: `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      });
    } catch (err) {
      console.error(`Error sending command to agent ${agentId}:`, err);
      throw err;
    }
  }
  
  /**
   * Send command to all agents in a farm
   */
  async broadcastCommandToFarm(farmId: string, command: string, params?: any): Promise<void> {
    try {
      // Get agents in this farm
      const farmAgents = await this.cache.get<string[]>(CacheNamespace.FARM_STATE, `farm_${farmId}_agents`);
      
      if (!farmAgents || farmAgents.length === 0) {
        throw new Error(`No agents found for farm ${farmId}`);
      }
      
      // Generate a single command ID for all agents
      const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Send command to each agent
      for (const agentId of farmAgents) {
        await this.pubsub.publishAgentAction(agentId, 'command', {
          agentId,
          farmId,
          command,
          params,
          timestamp: Date.now(),
          commandId,
          broadcastId: `bc_${farmId}_${Date.now()}`
        });
      }
    } catch (err) {
      console.error(`Error broadcasting command to farm ${farmId}:`, err);
      throw err;
    }
  }
  
  /**
   * Subscribe to agent events
   */
  subscribeToAgentEvents(agentId: string, handler: (event: any) => void): () => void {
    // Initialize handler set if needed
    if (!this.agentEventHandlers.has(agentId)) {
      this.agentEventHandlers.set(agentId, new Set());
    }
    
    // Add handler
    const handlers = this.agentEventHandlers.get(agentId)!;
    handlers.add(handler);
    
    // Return unsubscribe function
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.agentEventHandlers.delete(agentId);
      }
    };
  }
  
  /**
   * Subscribe to all agent events (global)
   */
  subscribeToAllAgentEvents(handler: (event: any) => void): () => void {
    return this.subscribeToAgentEvents('global', handler);
  }
  
  /**
   * Get all agents in a farm
   */
  async getFarmAgents(farmId: string): Promise<any[]> {
    try {
      // Get agent IDs for this farm
      const farmAgents = await this.cache.get<string[]>(CacheNamespace.FARM_STATE, `farm_${farmId}_agents`) || [];
      
      if (farmAgents.length === 0) {
        return [];
      }
      
      // Get details for each agent
      const agentDetails = [];
      
      for (const agentId of farmAgents) {
        const agentData = await this.cache.get<any>(CacheNamespace.AGENT_STATE, `agent_${agentId}`);
        if (agentData) {
          agentDetails.push(agentData);
        }
      }
      
      return agentDetails;
    } catch (err) {
      console.error(`Error getting agents for farm ${farmId}:`, err);
      return [];
    }
  }
  
  /**
   * Get agent details
   */
  async getAgentDetails(agentId: string): Promise<any | null> {
    try {
      return await this.cache.get<any>(CacheNamespace.AGENT_STATE, `agent_${agentId}`);
    } catch (err) {
      console.error(`Error getting details for agent ${agentId}:`, err);
      return null;
    }
  }
  
  /**
   * Coordinate multi-agent tasks
   */
  async coordinateTask(farmId: string, taskType: string, taskData: any): Promise<string> {
    try {
      // Generate task ID
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Store task data
      await this.cache.set(
        CacheNamespace.FARM_STATE,
        `task_${taskId}`,
        {
          taskId,
          farmId,
          type: taskType,
          status: 'initiated',
          data: taskData,
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        CacheExpiration.DAY
      );
      
      // Assign task to relevant agents
      await this.assignTaskToAgents(taskId, farmId, taskType, taskData);
      
      return taskId;
    } catch (err) {
      console.error(`Error coordinating task for farm ${farmId}:`, err);
      throw err;
    }
  }
  
  /**
   * Assign task to agents based on task type and agent capabilities
   */
  private async assignTaskToAgents(taskId: string, farmId: string, taskType: string, taskData: any): Promise<void> {
    try {
      // Get agents in this farm
      const agents = await this.getFarmAgents(farmId);
      
      if (agents.length === 0) {
        throw new Error(`No agents found for farm ${farmId}`);
      }
      
      // Determine which agents should handle this task based on capabilities
      const eligibleAgents = agents.filter(agent => {
        // Check if agent has required capabilities for this task
        if (!agent.capabilities) return false;
        
        switch (taskType) {
          case 'market_analysis':
            return agent.capabilities.marketAnalysis;
          case 'order_execution':
            return agent.capabilities.orderExecution;
          case 'risk_assessment':
            return agent.capabilities.riskAssessment;
          case 'strategy_optimization':
            return agent.capabilities.strategyOptimization;
          default:
            return false;
        }
      });
      
      if (eligibleAgents.length === 0) {
        throw new Error(`No eligible agents found for task type ${taskType} in farm ${farmId}`);
      }
      
      // Store task assignments
      for (const agent of eligibleAgents) {
        // Store in task_assignments_{taskId}
        const assignmentKey = `task_assignments_${taskId}`;
        const existingAssignments = await this.cache.get<string[]>(CacheNamespace.FARM_STATE, assignmentKey) || [];
        
        if (!existingAssignments.includes(agent.agentId)) {
          existingAssignments.push(agent.agentId);
          await this.cache.set(
            CacheNamespace.FARM_STATE,
            assignmentKey,
            existingAssignments,
            CacheExpiration.DAY
          );
        }
        
        // Send task to agent
        await this.sendCommandToAgent(agent.agentId, 'execute_task', {
          taskId,
          taskType,
          taskData
        });
      }
    } catch (err) {
      console.error(`Error assigning task ${taskId}:`, err);
      throw err;
    }
  }
  
  /**
   * Update task status
   */
  async updateTaskStatus(taskId: string, status: string, result?: any): Promise<void> {
    try {
      // Get current task data
      const taskData = await this.cache.get<any>(CacheNamespace.FARM_STATE, `task_${taskId}`);
      
      if (!taskData) {
        throw new Error(`Task ${taskId} not found`);
      }
      
      // Update task data
      const updatedData = {
        ...taskData,
        status,
        updatedAt: Date.now(),
        ...(result ? { result } : {})
      };
      
      // Store updated data
      await this.cache.set(
        CacheNamespace.FARM_STATE,
        `task_${taskId}`,
        updatedData,
        CacheExpiration.DAY
      );
      
      // Publish task update
      await this.pubsub.publish(
        PubSubChannel.FARM_UPDATES,
        taskData.farmId,
        {
          type: TRADING_EVENTS.TASK_UPDATE,
          taskId,
          farmId: taskData.farmId,
          status,
          previousStatus: taskData.status,
          timestamp: Date.now()
        }
      );
    } catch (err) {
      console.error(`Error updating task status for ${taskId}:`, err);
      throw err;
    }
  }
  
  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    await this.pubsub.close();
    this.agentEventHandlers.clear();
  }
}
