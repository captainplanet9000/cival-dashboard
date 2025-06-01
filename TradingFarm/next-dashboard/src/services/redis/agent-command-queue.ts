import { getRedisClient } from './redis-service';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger';

// Keys and prefixes for Redis storage
const COMMAND_QUEUE_PREFIX = 'elizaos:cmd:queue:';
const COMMAND_RESULT_PREFIX = 'elizaos:cmd:result:';
const COMMAND_PROCESSING_PREFIX = 'elizaos:cmd:processing:';

// Queue settings
const DEFAULT_COMMAND_EXPIRY = 60 * 60; // 1 hour in seconds
const DEFAULT_RESULT_EXPIRY = 60 * 60 * 24; // 24 hours in seconds
const DEFAULT_PROCESSING_TIMEOUT = 30; // 30 seconds

/**
 * Redis-backed command queue for ElizaOS agents
 */
export class AgentCommandQueue {
  /**
   * Push a command to an agent's queue
   * 
   * @param agentId Target agent ID
   * @param command Command object
   * @returns Command ID for tracking
   */
  static async pushCommand(agentId: string, command: any): Promise<string> {
    const redis = getRedisClient();
    if (!redis) {
      logger.warn('Redis unavailable for command queue, using fallback');
      return this.fallbackPushCommand(agentId, command);
    }

    try {
      // Generate a unique command ID
      const commandId = uuidv4();
      
      // Prepare command data with metadata
      const commandData = {
        id: commandId,
        agentId,
        command,
        status: 'queued',
        timestamp: Date.now(),
        ...command
      };
      
      // Add to the queue (LPUSH for FIFO behavior)
      await redis.lpush(
        COMMAND_QUEUE_PREFIX + agentId,
        JSON.stringify(commandData)
      );
      
      // Set expiration on the queue to prevent abandoned queues
      await redis.expire(COMMAND_QUEUE_PREFIX + agentId, DEFAULT_COMMAND_EXPIRY);
      
      logger.debug(`Command ${commandId} pushed to agent ${agentId} queue`);
      return commandId;
    } catch (error) {
      logger.error('Error pushing command to Redis queue:', error);
      return this.fallbackPushCommand(agentId, command);
    }
  }

  /**
   * Get the next command for an agent
   * 
   * @param agentId Agent ID to process commands for
   * @returns Next command or null if queue is empty
   */
  static async getNextCommand(agentId: string): Promise<any | null> {
    const redis = getRedisClient();
    if (!redis) {
      logger.warn('Redis unavailable for command queue, using fallback');
      return this.fallbackGetNextCommand(agentId);
    }

    try {
      // Use BRPOP for blocking pop (waits until an item is available)
      // With a timeout to prevent indefinite blocking
      const result = await redis.brpop(COMMAND_QUEUE_PREFIX + agentId, 1);
      
      if (!result) {
        return null; // No commands in queue
      }
      
      // Parse the command data
      const commandData = JSON.parse(result[1]);
      
      // Mark as being processed
      await redis.set(
        COMMAND_PROCESSING_PREFIX + commandData.id,
        JSON.stringify(commandData),
        'EX',
        DEFAULT_PROCESSING_TIMEOUT
      );
      
      return commandData;
    } catch (error) {
      logger.error('Error getting next command from Redis queue:', error);
      return this.fallbackGetNextCommand(agentId);
    }
  }

  /**
   * Set the result for a processed command
   * 
   * @param commandId Command ID
   * @param result Result object
   * @param success Whether the command was successful
   */
  static async setCommandResult(
    commandId: string, 
    result: any, 
    success: boolean = true
  ): Promise<void> {
    const redis = getRedisClient();
    if (!redis) {
      logger.warn('Redis unavailable for command results, using fallback');
      this.fallbackSetCommandResult(commandId, result, success);
      return;
    }

    try {
      // Remove from processing set
      await redis.del(COMMAND_PROCESSING_PREFIX + commandId);
      
      // Store the result
      const resultData = {
        id: commandId,
        result,
        success,
        timestamp: Date.now()
      };
      
      await redis.set(
        COMMAND_RESULT_PREFIX + commandId,
        JSON.stringify(resultData),
        'EX',
        DEFAULT_RESULT_EXPIRY
      );
      
      logger.debug(`Command ${commandId} result stored: ${success ? 'success' : 'failure'}`);
    } catch (error) {
      logger.error('Error storing command result in Redis:', error);
      this.fallbackSetCommandResult(commandId, result, success);
    }
  }

  /**
   * Get the result of a command
   * 
   * @param commandId Command ID
   * @returns Command result or null if not found
   */
  static async getCommandResult(commandId: string): Promise<any | null> {
    const redis = getRedisClient();
    if (!redis) {
      logger.warn('Redis unavailable for command results, using fallback');
      return this.fallbackGetCommandResult(commandId);
    }

    try {
      const result = await redis.get(COMMAND_RESULT_PREFIX + commandId);
      if (!result) {
        return null;
      }
      
      return JSON.parse(result);
    } catch (error) {
      logger.error('Error getting command result from Redis:', error);
      return this.fallbackGetCommandResult(commandId);
    }
  }

  // --- In-memory fallback implementations ---
  
  // Fallback in-memory command queues
  private static fallbackQueues = new Map<string, Array<any>>();
  private static fallbackResults = new Map<string, any>();

  private static fallbackPushCommand(agentId: string, command: any): string {
    const commandId = uuidv4();
    const commandData = {
      id: commandId,
      agentId,
      command,
      status: 'queued',
      timestamp: Date.now(),
      ...command
    };
    
    if (!this.fallbackQueues.has(agentId)) {
      this.fallbackQueues.set(agentId, []);
    }
    
    this.fallbackQueues.get(agentId)!.unshift(commandData);
    logger.debug(`[FALLBACK] Command ${commandId} pushed to agent ${agentId} queue`);
    return commandId;
  }

  private static fallbackGetNextCommand(agentId: string): any | null {
    const queue = this.fallbackQueues.get(agentId) || [];
    if (queue.length === 0) {
      return null;
    }
    
    return queue.pop();
  }

  private static fallbackSetCommandResult(
    commandId: string, 
    result: any, 
    success: boolean = true
  ): void {
    this.fallbackResults.set(commandId, {
      id: commandId,
      result,
      success,
      timestamp: Date.now()
    });
  }

  private static fallbackGetCommandResult(commandId: string): any | null {
    return this.fallbackResults.get(commandId) || null;
  }
}
