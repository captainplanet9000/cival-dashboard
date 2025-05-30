import { RedisPubSubService, PubSubChannel } from '@/utils/redis/pubsub-service';
import { RedisCacheService, CacheNamespace, CacheExpiration } from '@/utils/redis/cache-service';
import { TRADING_EVENTS } from '@/constants/events';
import { createServerClient } from '@/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';

// Message types for agent communication
export enum AgentMessageType {
  COMMAND = 'command',
  RESPONSE = 'response',
  KNOWLEDGE = 'knowledge',
  STATUS = 'status',
  ANALYSIS = 'analysis',
  ALERT = 'alert',
}

// Knowledge types for agent knowledge sharing
export enum KnowledgeType {
  MARKET_ANALYSIS = 'market_analysis',
  TRADING_STRATEGY = 'trading_strategy',
  RISK_ASSESSMENT = 'risk_assessment',
  TECHNICAL_INDICATOR = 'technical_indicator',
  NEWS_SENTIMENT = 'news_sentiment',
  PATTERN_RECOGNITION = 'pattern_recognition',
  CORRELATION_DATA = 'correlation_data',
}

/**
 * ElizaOS Communication Service
 * Handles real-time communication between ElizaOS agents using Redis PubSub and cache
 */
export class ElizaOSCommunicationService {
  private static instance: ElizaOSCommunicationService;
  private pubsub: RedisPubSubService;
  private cache: RedisCacheService;
  private messageHandlers: Map<string, Set<(message: any) => void>> = new Map();
  
  private constructor() {
    this.pubsub = new RedisPubSubService();
    this.cache = new RedisCacheService();
    
    // Initialize message handlers map
    Object.values(AgentMessageType).forEach(type => {
      this.messageHandlers.set(type, new Set());
    });
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): ElizaOSCommunicationService {
    if (!ElizaOSCommunicationService.instance) {
      ElizaOSCommunicationService.instance = new ElizaOSCommunicationService();
    }
    return ElizaOSCommunicationService.instance;
  }
  
  /**
   * Initialize service and subscribe to channels
   */
  public async initialize(): Promise<void> {
    try {
      // Subscribe to agent actions
      await this.pubsub.subscribe(PubSubChannel.AGENT_ACTIONS, 'all', (message) => {
        const { action, agentId, data } = message;
        
        // Route message to appropriate handlers
        if (action === AgentMessageType.COMMAND || action === AgentMessageType.RESPONSE) {
          this.notifyHandlers(AgentMessageType.COMMAND, { agentId, ...data });
        } else if (action === AgentMessageType.KNOWLEDGE) {
          this.notifyHandlers(AgentMessageType.KNOWLEDGE, { agentId, ...data });
        } else if (action === AgentMessageType.STATUS) {
          this.notifyHandlers(AgentMessageType.STATUS, { agentId, ...data });
        } else if (action === AgentMessageType.ANALYSIS) {
          this.notifyHandlers(AgentMessageType.ANALYSIS, { agentId, ...data });
        } else if (action === AgentMessageType.ALERT) {
          this.notifyHandlers(AgentMessageType.ALERT, { agentId, ...data });
        }
        
        // Also route to agent-specific handlers
        this.notifyHandlers(`agent:${agentId}`, message);
      });
      
      // Subscribe to farm updates
      await this.pubsub.subscribe(PubSubChannel.FARM_UPDATES, 'all', (message) => {
        const { farmId, updateType, data } = message;
        this.notifyHandlers(`farm:${farmId}`, { farmId, updateType, ...data });
      });
      
      console.log('ElizaOS Communication Service initialized');
    } catch (error) {
      console.error('Failed to initialize ElizaOS Communication Service:', error);
      throw error;
    }
  }
  
  /**
   * Send command to an agent
   */
  public async sendCommand(
    agentId: string, 
    command: string, 
    parameters: Record<string, any> = {},
    priority: number = 5
  ): Promise<string> {
    const commandId = `cmd_${Date.now()}_${uuidv4().substring(0, 8)}`;
    
    // Publish command to agent channel
    await this.pubsub.publishAgentAction(agentId, AgentMessageType.COMMAND, {
      commandId,
      command,
      parameters,
      priority,
      timestamp: Date.now(),
    });
    
    // Store command in cache for tracking
    await this.cache.set(
      CacheNamespace.AGENT_STATE,
      `command_${commandId}`,
      {
        agentId,
        command,
        parameters,
        priority,
        status: 'sent',
        timestamp: Date.now(),
      },
      CacheExpiration.MEDIUM
    );
    
    // Store in database for persistence
    try {
      const supabase = await createServerClient();
      await supabase.from('elizaos_agent_commands').insert({
        id: commandId,
        agent_id: agentId,
        command_type: command,
        parameters: parameters,
        priority: priority,
        status: 'sent',
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to store command in database:', error);
    }
    
    return commandId;
  }
  
  /**
   * Share knowledge between agents
   */
  public async shareKnowledge(
    sourceAgentId: string,
    knowledgeType: KnowledgeType,
    content: any,
    targetAgentIds?: string[],
    ttl: number = CacheExpiration.DAY
  ): Promise<string> {
    const knowledgeId = `knowledge_${Date.now()}_${uuidv4().substring(0, 8)}`;
    
    // Store knowledge in cache for quick access
    await this.cache.set(
      CacheNamespace.AGENT_STATE,
      `knowledge_${knowledgeId}`,
      {
        id: knowledgeId,
        sourceAgentId,
        knowledgeType,
        content,
        targetAgentIds,
        timestamp: Date.now(),
      },
      ttl
    );
    
    // Publish knowledge to target agents
    if (targetAgentIds && targetAgentIds.length > 0) {
      // Share with specific agents
      for (const targetAgentId of targetAgentIds) {
        await this.pubsub.publishAgentAction(targetAgentId, AgentMessageType.KNOWLEDGE, {
          knowledgeId,
          sourceAgentId,
          knowledgeType,
          timestamp: Date.now(),
        });
      }
    } else {
      // Broadcast to all agents
      await this.pubsub.publish(PubSubChannel.AGENT_ACTIONS, 'knowledge_broadcast', {
        knowledgeId,
        sourceAgentId,
        knowledgeType,
        timestamp: Date.now(),
      });
    }
    
    // Store in database for persistence
    try {
      const supabase = await createServerClient();
      await supabase.from('elizaos_knowledge').insert({
        id: knowledgeId,
        source_agent_id: sourceAgentId,
        knowledge_type: knowledgeType,
        content: content,
        target_agent_ids: targetAgentIds,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to store knowledge in database:', error);
    }
    
    return knowledgeId;
  }
  
  /**
   * Get cached knowledge
   */
  public async getKnowledge(knowledgeId: string): Promise<any | null> {
    return await this.cache.get(CacheNamespace.AGENT_STATE, `knowledge_${knowledgeId}`);
  }
  
  /**
   * Update agent status
   */
  public async updateAgentStatus(
    agentId: string, 
    status: string, 
    details?: Record<string, any>
  ): Promise<void> {
    // Publish status update
    await this.pubsub.publishAgentAction(agentId, AgentMessageType.STATUS, {
      status,
      details,
      timestamp: Date.now(),
    });
    
    // Update status in cache
    await this.cache.set(
      CacheNamespace.AGENT_STATE,
      `agent_${agentId}_status`,
      {
        status,
        details,
        timestamp: Date.now(),
      },
      CacheExpiration.MEDIUM
    );
    
    // Update status in database
    try {
      const supabase = await createServerClient();
      await supabase.from('elizaos_agents').update({
        status: status,
        status_details: details,
        updated_at: new Date().toISOString(),
      }).eq('id', agentId);
    } catch (error) {
      console.error('Failed to update agent status in database:', error);
    }
  }
  
  /**
   * Register handler for specific message type
   */
  public onMessage(
    messageType: AgentMessageType | string, 
    handler: (message: any) => void
  ): () => void {
    // Get or create handler set
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, new Set());
    }
    
    const handlers = this.messageHandlers.get(messageType)!;
    handlers.add(handler);
    
    // Return unsubscribe function
    return () => {
      handlers.delete(handler);
    };
  }
  
  /**
   * Notify all handlers for a specific message type
   */
  private notifyHandlers(messageType: string, message: any): void {
    const handlers = this.messageHandlers.get(messageType);
    
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error(`Error in ${messageType} message handler:`, error);
        }
      });
    }
  }
  
  /**
   * Clean up resources
   */
  public async cleanup(): Promise<void> {
    await this.pubsub.close();
    this.messageHandlers.clear();
  }
}
