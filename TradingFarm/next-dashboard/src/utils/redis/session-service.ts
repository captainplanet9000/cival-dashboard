import { getRedisClient } from './client';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

/**
 * Session expiration time in seconds
 */
export enum SessionExpiration {
  SHORT = 1800, // 30 minutes
  MEDIUM = 3600, // 1 hour
  LONG = 86400, // 1 day
  EXTENDED = 604800, // 1 week
}

/**
 * Trading Farm Redis Session Service
 * Manages user sessions, preferences, and temporary state
 */
export class RedisSessionService {
  private client: Redis;
  private prefix: string = 'trading-farm:session:';
  
  constructor() {
    this.client = getRedisClient();
  }
  
  /**
   * Generate a session key
   */
  private getSessionKey(sessionId: string): string {
    return `${this.prefix}${sessionId}`;
  }
  
  /**
   * Create a new session
   */
  async createSession(userData: any, expiration: SessionExpiration = SessionExpiration.MEDIUM): Promise<string> {
    const sessionId = uuidv4();
    const sessionKey = this.getSessionKey(sessionId);
    
    const session = {
      ...userData,
      created: Date.now(),
      updated: Date.now(),
    };
    
    await this.client.set(sessionKey, JSON.stringify(session), 'EX', expiration);
    return sessionId;
  }
  
  /**
   * Get session data
   */
  async getSession<T = any>(sessionId: string): Promise<T | null> {
    const sessionKey = this.getSessionKey(sessionId);
    const data = await this.client.get(sessionKey);
    
    if (!data) return null;
    
    try {
      return JSON.parse(data) as T;
    } catch (e) {
      console.error('Error parsing session data:', e);
      return null;
    }
  }
  
  /**
   * Update session data
   */
  async updateSession(sessionId: string, data: any, expiration: SessionExpiration = SessionExpiration.MEDIUM): Promise<boolean> {
    const sessionKey = this.getSessionKey(sessionId);
    const existingData = await this.client.get(sessionKey);
    
    if (!existingData) return false;
    
    try {
      const session = JSON.parse(existingData);
      const updatedSession = {
        ...session,
        ...data,
        updated: Date.now(),
      };
      
      await this.client.set(sessionKey, JSON.stringify(updatedSession), 'EX', expiration);
      return true;
    } catch (e) {
      console.error('Error updating session:', e);
      return false;
    }
  }
  
  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    const sessionKey = this.getSessionKey(sessionId);
    const result = await this.client.del(sessionKey);
    return result === 1;
  }
  
  /**
   * Extend session expiration
   */
  async extendSession(sessionId: string, expiration: SessionExpiration = SessionExpiration.MEDIUM): Promise<boolean> {
    const sessionKey = this.getSessionKey(sessionId);
    const result = await this.client.expire(sessionKey, expiration);
    return result === 1;
  }
  
  /**
   * Store user preferences (persists longer than session)
   */
  async storeUserPreferences(userId: string, preferences: any): Promise<void> {
    const key = `trading-farm:user:${userId}:preferences`;
    
    // Get existing preferences to merge
    const existing = await this.client.get(key);
    let updatedPrefs;
    
    if (existing) {
      try {
        const existingPrefs = JSON.parse(existing);
        updatedPrefs = {
          ...existingPrefs,
          ...preferences,
          updated: Date.now(),
        };
      } catch (e) {
        updatedPrefs = {
          ...preferences,
          updated: Date.now(),
        };
      }
    } else {
      updatedPrefs = {
        ...preferences,
        created: Date.now(),
        updated: Date.now(),
      };
    }
    
    // Store with a very long expiration (30 days)
    await this.client.set(key, JSON.stringify(updatedPrefs), 'EX', 2592000);
  }
  
  /**
   * Get user preferences
   */
  async getUserPreferences<T = any>(userId: string): Promise<T | null> {
    const key = `trading-farm:user:${userId}:preferences`;
    const data = await this.client.get(key);
    
    if (!data) return null;
    
    try {
      return JSON.parse(data) as T;
    } catch (e) {
      console.error('Error parsing user preferences:', e);
      return null;
    }
  }
  
  /**
   * Store ElizaOS command history for a user
   */
  async storeElizaCommandHistory(userId: string, command: any): Promise<void> {
    const key = `trading-farm:user:${userId}:eliza_history`;
    
    try {
      // Get existing history
      const existing = await this.client.lrange(key, 0, -1);
      const commandWithTimestamp = {
        ...command,
        timestamp: Date.now(),
      };
      
      // Add new command to the beginning of the list
      await this.client.lpush(key, JSON.stringify(commandWithTimestamp));
      
      // Trim list to 100 items
      await this.client.ltrim(key, 0, 99);
      
      // Set expiration (7 days)
      await this.client.expire(key, 604800);
    } catch (e) {
      console.error('Error storing ElizaOS command history:', e);
    }
  }
  
  /**
   * Get ElizaOS command history for a user
   */
  async getElizaCommandHistory(userId: string, limit: number = 20): Promise<any[]> {
    const key = `trading-farm:user:${userId}:eliza_history`;
    
    try {
      const items = await this.client.lrange(key, 0, limit - 1);
      return items.map(item => JSON.parse(item));
    } catch (e) {
      console.error('Error getting ElizaOS command history:', e);
      return [];
    }
  }
  
  /**
   * Store active trading farm state
   */
  async storeFarmState(farmId: string, state: any): Promise<void> {
    const key = `trading-farm:farm:${farmId}:state`;
    await this.client.set(key, JSON.stringify(state), 'EX', 3600); // 1 hour expiration
  }
  
  /**
   * Get active trading farm state
   */
  async getFarmState<T = any>(farmId: string): Promise<T | null> {
    const key = `trading-farm:farm:${farmId}:state`;
    const data = await this.client.get(key);
    
    if (!data) return null;
    
    try {
      return JSON.parse(data) as T;
    } catch (e) {
      console.error('Error parsing farm state:', e);
      return null;
    }
  }
}
