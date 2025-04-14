import { getRedisClient, createNewRedisClient } from './client';
import Redis from 'ioredis';
import { TRADING_EVENTS } from '@/constants/events';

/**
 * Channel categories for organizing pub/sub topics
 */
export enum PubSubChannel {
  MARKET_UPDATES = 'market_updates',
  AGENT_ACTIONS = 'agent_actions',
  SYSTEM_EVENTS = 'system_events',
  FARM_UPDATES = 'farm_updates',
  TRADING_SIGNALS = 'trading_signals',
  EXCHANGE_EVENTS = 'exchange_events',
  USER_ACTIVITY = 'user_activity',
}

/**
 * Redis PubSub Service for Trading Farm
 * Enables real-time communication between components and agents
 */
export class RedisPubSubService {
  private publisher: Redis;
  private subscriber: Redis;
  private handlers: Map<string, Set<(message: any) => void>>;
  private isSubscribed: boolean;
  
  constructor() {
    // Use separate connections for pub/sub
    this.publisher = getRedisClient();
    this.subscriber = createNewRedisClient();
    this.handlers = new Map();
    this.isSubscribed = false;
    
    // Setup message handler
    this.subscriber.on('message', (channel, message) => {
      try {
        const parsed = JSON.parse(message);
        const handlers = this.handlers.get(channel);
        
        if (handlers) {
          handlers.forEach(handler => {
            try {
              handler(parsed);
            } catch (err) {
              console.error(`Error in Redis PubSub handler for channel ${channel}:`, err);
            }
          });
        }
      } catch (err) {
        console.error('Error parsing Redis PubSub message:', err);
      }
    });
  }
  
  /**
   * Generate a full channel name with category
   */
  private getFullChannelName(category: PubSubChannel, channel: string): string {
    return `trading-farm:${category}:${channel}`;
  }
  
  /**
   * Publish a message to a channel
   */
  async publish(category: PubSubChannel, channel: string, message: any): Promise<number> {
    const fullChannel = this.getFullChannelName(category, channel);
    const serialized = typeof message === 'object' ? JSON.stringify(message) : message;
    return await this.publisher.publish(fullChannel, serialized);
  }
  
  /**
   * Subscribe to a channel
   */
  async subscribe(category: PubSubChannel, channel: string, handler: (message: any) => void): Promise<void> {
    const fullChannel = this.getFullChannelName(category, channel);
    
    // Initialize handler set if it doesn't exist
    if (!this.handlers.has(fullChannel)) {
      this.handlers.set(fullChannel, new Set());
      
      // Subscribe to Redis channel
      await this.subscriber.subscribe(fullChannel);
    }
    
    // Add handler to set
    const handlers = this.handlers.get(fullChannel);
    handlers?.add(handler);
    
    this.isSubscribed = true;
  }
  
  /**
   * Unsubscribe from a channel
   */
  async unsubscribe(category: PubSubChannel, channel: string, handler?: (message: any) => void): Promise<void> {
    const fullChannel = this.getFullChannelName(category, channel);
    const handlers = this.handlers.get(fullChannel);
    
    if (!handlers) return;
    
    if (handler) {
      // Remove specific handler
      handlers.delete(handler);
      
      // If no handlers left, unsubscribe from channel
      if (handlers.size === 0) {
        this.handlers.delete(fullChannel);
        await this.subscriber.unsubscribe(fullChannel);
      }
    } else {
      // Remove all handlers and unsubscribe
      this.handlers.delete(fullChannel);
      await this.subscriber.unsubscribe(fullChannel);
    }
    
    // Check if still subscribed to any channels
    this.isSubscribed = this.handlers.size > 0;
  }
  
  /**
   * Publish a market update
   */
  async publishMarketUpdate(symbol: string, data: any): Promise<number> {
    return await this.publish(PubSubChannel.MARKET_UPDATES, symbol, {
      type: TRADING_EVENTS.MARKET_UPDATE,
      symbol,
      data,
      timestamp: Date.now(),
    });
  }
  
  /**
   * Publish an agent action
   */
  async publishAgentAction(agentId: string, action: string, data: any): Promise<number> {
    return await this.publish(PubSubChannel.AGENT_ACTIONS, agentId, {
      type: TRADING_EVENTS.AGENT_ACTION,
      agentId,
      action,
      data,
      timestamp: Date.now(),
    });
  }
  
  /**
   * Publish a farm update
   */
  async publishFarmUpdate(farmId: string, updateType: string, data: any): Promise<number> {
    return await this.publish(PubSubChannel.FARM_UPDATES, farmId, {
      type: TRADING_EVENTS.FARM_UPDATE,
      farmId,
      updateType,
      data,
      timestamp: Date.now(),
    });
  }
  
  /**
   * Publish a trading signal
   */
  async publishTradingSignal(strategy: string, symbol: string, signal: string, data: any): Promise<number> {
    const channel = `${strategy}_${symbol}`;
    return await this.publish(PubSubChannel.TRADING_SIGNALS, channel, {
      type: TRADING_EVENTS.TRADING_SIGNAL,
      strategy,
      symbol,
      signal,
      data,
      timestamp: Date.now(),
    });
  }
  
  /**
   * Close all subscriptions and connections
   */
  async close(): Promise<void> {
    if (this.isSubscribed) {
      await this.subscriber.unsubscribe();
    }
    
    await this.subscriber.quit();
    this.handlers.clear();
    this.isSubscribed = false;
  }
}
