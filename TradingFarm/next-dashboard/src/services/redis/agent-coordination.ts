import { getRedisClient } from './redis-service';
import { logger } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';

// Redis keys and prefixes
const COORDINATION_CHANNEL = 'elizaos:coordination';
const COORDINATION_REQUEST_PREFIX = 'elizaos:coord:req:';
const COORDINATION_RESPONSE_PREFIX = 'elizaos:coord:res:';
const AGENT_CHANNEL_PREFIX = 'elizaos:agent:';

// Coordination action types
export enum CoordinationAction {
  ASSIGN_TASK = 'assign_task',
  SHARE_KNOWLEDGE = 'share_knowledge',
  REQUEST_ANALYSIS = 'request_analysis',
  SYNC_STATE = 'sync_state',
  DELEGATE_CONTROL = 'delegate_control'
}

// Coordination request interface
export interface CoordinationRequest {
  id: string;
  coordinator_id: string;
  action: CoordinationAction;
  target_agents: string[];
  parameters: Record<string, any>;
  expiry_ms: number;
  timestamp: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
}

// Coordination response interface
export interface CoordinationResponse {
  request_id: string;
  agent_id: string;
  success: boolean;
  data: any;
  timestamp: number;
  error?: string;
}

/**
 * Redis-backed agent coordination system for ElizaOS
 * Enables communication and task distribution between agents
 */
export class AgentCoordination {
  private static subscribers = new Map<string, (data: any) => void>();

  /**
   * Initialize the coordination system
   * Sets up Redis pub/sub channels for agent communication
   */
  static async initialize(): Promise<void> {
    const redis = getRedisClient();
    if (!redis) {
      logger.warn('Redis unavailable for agent coordination, using fallback mode');
      return;
    }

    try {
      // Create a separate subscriber client
      const subClient = redis.duplicate();
      
      // Subscribe to the main coordination channel
      await subClient.subscribe(COORDINATION_CHANNEL);
      
      // Handler for coordination messages
      subClient.on('message', (channel, message) => {
        try {
          if (channel === COORDINATION_CHANNEL) {
            const data = JSON.parse(message);
            this.handleCoordinationMessage(data);
          } else if (channel.startsWith(AGENT_CHANNEL_PREFIX)) {
            const agentId = channel.substring(AGENT_CHANNEL_PREFIX.length);
            const callback = this.subscribers.get(agentId);
            if (callback) {
              try {
                const data = JSON.parse(message);
                callback(data);
              } catch (e) {
                logger.error(`Error processing message for agent ${agentId}:`, e);
              }
            }
          }
        } catch (e) {
          logger.error('Error handling coordination message:', e);
        }
      });
      
      logger.info('Agent coordination system initialized');
    } catch (error) {
      logger.error('Error initializing agent coordination system:', error);
    }
  }

  /**
   * Register an agent for coordination
   * 
   * @param agentId Agent ID
   * @param callback Callback function for messages
   */
  static async registerAgent(agentId: string, callback: (data: any) => void): Promise<void> {
    const redis = getRedisClient();
    if (!redis) {
      logger.warn('Redis unavailable for agent registration, using fallback mode');
      this.subscribers.set(agentId, callback);
      return;
    }

    try {
      // Create a separate subscriber client
      const subClient = redis.duplicate();
      
      // Subscribe to agent-specific channel
      const channel = AGENT_CHANNEL_PREFIX + agentId;
      await subClient.subscribe(channel);
      
      // Store callback for use in message handler
      this.subscribers.set(agentId, callback);
      
      logger.debug(`Agent ${agentId} registered for coordination`);
    } catch (error) {
      logger.error(`Error registering agent ${agentId} for coordination:`, error);
    }
  }

  /**
   * Send a coordination request to target agents
   * 
   * @param request Coordination request
   * @returns Request ID for tracking
   */
  static async sendCoordinationRequest(
    coordinatorId: string,
    action: CoordinationAction,
    targetAgents: string[],
    parameters: Record<string, any>,
    expiryMs: number = 60000
  ): Promise<string> {
    const redis = getRedisClient();
    if (!redis) {
      logger.warn('Redis unavailable for coordination request, using fallback mode');
      return this.fallbackSendCoordinationRequest(
        coordinatorId, 
        action, 
        targetAgents, 
        parameters, 
        expiryMs
      );
    }

    try {
      // Generate a unique request ID
      const requestId = uuidv4();
      const now = Date.now();
      
      // Create request object
      const request: CoordinationRequest = {
        id: requestId,
        coordinator_id: coordinatorId,
        action,
        target_agents: targetAgents,
        parameters,
        expiry_ms: expiryMs,
        timestamp: now,
        status: 'pending'
      };
      
      // Store request in Redis
      await redis.set(
        COORDINATION_REQUEST_PREFIX + requestId,
        JSON.stringify(request),
        'EX',
        Math.ceil(expiryMs / 1000)
      );
      
      // Publish to coordination channel
      await redis.publish(COORDINATION_CHANNEL, JSON.stringify({
        type: 'request',
        request_id: requestId,
        coordinator_id: coordinatorId,
        target_agents: targetAgents,
        action
      }));
      
      // Publish to each target agent's channel
      for (const agentId of targetAgents) {
        await redis.publish(AGENT_CHANNEL_PREFIX + agentId, JSON.stringify({
          type: 'coordination_request',
          request_id: requestId,
          coordinator_id: coordinatorId,
          action,
          parameters
        }));
      }
      
      logger.debug(`Coordination request ${requestId} sent to ${targetAgents.length} agents`);
      return requestId;
    } catch (error) {
      logger.error('Error sending coordination request:', error);
      return this.fallbackSendCoordinationRequest(
        coordinatorId, 
        action, 
        targetAgents, 
        parameters, 
        expiryMs
      );
    }
  }

  /**
   * Send a response to a coordination request
   * 
   * @param requestId Request ID
   * @param agentId Responding agent ID
   * @param success Whether the request was successful
   * @param data Response data
   * @param error Optional error message
   */
  static async sendCoordinationResponse(
    requestId: string,
    agentId: string,
    success: boolean,
    data: any,
    error?: string
  ): Promise<void> {
    const redis = getRedisClient();
    if (!redis) {
      logger.warn('Redis unavailable for coordination response, using fallback mode');
      this.fallbackSendCoordinationResponse(requestId, agentId, success, data, error);
      return;
    }

    try {
      // Get the original request
      const requestStr = await redis.get(COORDINATION_REQUEST_PREFIX + requestId);
      if (!requestStr) {
        logger.warn(`Coordination request ${requestId} not found`);
        return;
      }
      
      const request = JSON.parse(requestStr) as CoordinationRequest;
      
      // Create response object
      const response: CoordinationResponse = {
        request_id: requestId,
        agent_id: agentId,
        success,
        data,
        timestamp: Date.now(),
        error
      };
      
      // Store response in Redis
      const responseKey = `${COORDINATION_RESPONSE_PREFIX}${requestId}:${agentId}`;
      await redis.set(
        responseKey,
        JSON.stringify(response),
        'EX',
        Math.ceil(request.expiry_ms / 1000)
      );
      
      // Publish to coordinator's channel
      await redis.publish(AGENT_CHANNEL_PREFIX + request.coordinator_id, JSON.stringify({
        type: 'coordination_response',
        request_id: requestId,
        agent_id: agentId,
        success,
        data,
        error
      }));
      
      logger.debug(`Agent ${agentId} responded to coordination request ${requestId}`);
    } catch (error) {
      logger.error('Error sending coordination response:', error);
      this.fallbackSendCoordinationResponse(requestId, agentId, success, data, error);
    }
  }

  /**
   * Get all responses for a coordination request
   * 
   * @param requestId Request ID
   * @returns Array of responses
   */
  static async getCoordinationResponses(requestId: string): Promise<CoordinationResponse[]> {
    const redis = getRedisClient();
    if (!redis) {
      logger.warn('Redis unavailable for coordination responses, using fallback mode');
      return this.fallbackGetCoordinationResponses(requestId);
    }

    try {
      // Get the original request
      const requestStr = await redis.get(COORDINATION_REQUEST_PREFIX + requestId);
      if (!requestStr) {
        logger.warn(`Coordination request ${requestId} not found`);
        return [];
      }
      
      const request = JSON.parse(requestStr) as CoordinationRequest;
      
      // Get all responses
      const responses: CoordinationResponse[] = [];
      
      for (const agentId of request.target_agents) {
        const responseKey = `${COORDINATION_RESPONSE_PREFIX}${requestId}:${agentId}`;
        const responseStr = await redis.get(responseKey);
        
        if (responseStr) {
          try {
            const response = JSON.parse(responseStr) as CoordinationResponse;
            responses.push(response);
          } catch (e) {
            logger.error(`Error parsing response from agent ${agentId}:`, e);
          }
        }
      }
      
      return responses;
    } catch (error) {
      logger.error('Error getting coordination responses:', error);
      return this.fallbackGetCoordinationResponses(requestId);
    }
  }

  /**
   * Update coordination request status
   * 
   * @param requestId Request ID
   * @param status New status
   */
  static async updateRequestStatus(
    requestId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired'
  ): Promise<void> {
    const redis = getRedisClient();
    if (!redis) {
      logger.warn('Redis unavailable for request status update, using fallback mode');
      return;
    }

    try {
      // Get the original request
      const requestStr = await redis.get(COORDINATION_REQUEST_PREFIX + requestId);
      if (!requestStr) {
        logger.warn(`Coordination request ${requestId} not found`);
        return;
      }
      
      const request = JSON.parse(requestStr) as CoordinationRequest;
      
      // Update status
      request.status = status;
      
      // Store updated request
      await redis.set(
        COORDINATION_REQUEST_PREFIX + requestId,
        JSON.stringify(request),
        'EX',
        Math.ceil(request.expiry_ms / 1000)
      );
      
      logger.debug(`Coordination request ${requestId} status updated to ${status}`);
    } catch (error) {
      logger.error('Error updating coordination request status:', error);
    }
  }

  // --- Private methods ---

  /**
   * Handle coordination messages from Redis pub/sub
   */
  private static handleCoordinationMessage(data: any): void {
    // Implementation depends on specific coordination needs
    logger.debug('Received coordination message:', data);
  }

  // --- Fallback implementations ---

  private static fallbackRequests = new Map<string, CoordinationRequest>();
  private static fallbackResponses = new Map<string, Map<string, CoordinationResponse>>();

  private static fallbackSendCoordinationRequest(
    coordinatorId: string,
    action: CoordinationAction,
    targetAgents: string[],
    parameters: Record<string, any>,
    expiryMs: number = 60000
  ): string {
    const requestId = uuidv4();
    const now = Date.now();
    
    const request: CoordinationRequest = {
      id: requestId,
      coordinator_id: coordinatorId,
      action,
      target_agents: targetAgents,
      parameters,
      expiry_ms: expiryMs,
      timestamp: now,
      status: 'pending'
    };
    
    this.fallbackRequests.set(requestId, request);
    this.fallbackResponses.set(requestId, new Map());
    
    // Simulate expiration
    setTimeout(() => {
      if (this.fallbackRequests.has(requestId)) {
        const req = this.fallbackRequests.get(requestId)!;
        req.status = 'expired';
        this.fallbackRequests.set(requestId, req);
      }
    }, expiryMs);
    
    // Notify target agents if they have registered callbacks
    for (const agentId of targetAgents) {
      const callback = this.subscribers.get(agentId);
      if (callback) {
        callback({
          type: 'coordination_request',
          request_id: requestId,
          coordinator_id: coordinatorId,
          action,
          parameters
        });
      }
    }
    
    return requestId;
  }

  private static fallbackSendCoordinationResponse(
    requestId: string,
    agentId: string,
    success: boolean,
    data: any,
    error?: string
  ): void {
    if (!this.fallbackRequests.has(requestId)) {
      logger.warn(`Coordination request ${requestId} not found`);
      return;
    }
    
    const request = this.fallbackRequests.get(requestId)!;
    
    const response: CoordinationResponse = {
      request_id: requestId,
      agent_id: agentId,
      success,
      data,
      timestamp: Date.now(),
      error
    };
    
    // Store response
    if (!this.fallbackResponses.has(requestId)) {
      this.fallbackResponses.set(requestId, new Map());
    }
    this.fallbackResponses.get(requestId)!.set(agentId, response);
    
    // Notify coordinator
    const callback = this.subscribers.get(request.coordinator_id);
    if (callback) {
      callback({
        type: 'coordination_response',
        request_id: requestId,
        agent_id: agentId,
        success,
        data,
        error
      });
    }
  }

  private static fallbackGetCoordinationResponses(requestId: string): CoordinationResponse[] {
    if (!this.fallbackResponses.has(requestId)) {
      return [];
    }
    
    return Array.from(this.fallbackResponses.get(requestId)!.values());
  }
}
