import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export interface FarmEvent {
  type: 'market_update' | 'risk_alert' | 'performance_update' | 'agent_status' | 'wallet_update';
  farmId: string;
  data: any;
  timestamp: string;
}

export class FarmMcpService {
  private supabase;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
  }

  async broadcastFarmEvent(event: FarmEvent) {
    try {
      const { error } = await this.supabase
        .from('mcp_messages')
        .insert([{
          topic: `farm:${event.farmId}:${event.type}`,
          payload: event.data,
          metadata: {
            timestamp: event.timestamp,
            farm_id: event.farmId,
            event_type: event.type
          }
        }]);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to broadcast farm event'
      };
    }
  }

  async subscribeFarmEvents(farmId: string, eventTypes: FarmEvent['type'][] = []) {
    try {
      const topics = eventTypes.length > 0
        ? eventTypes.map(type => `farm:${farmId}:${type}`)
        : [`farm:${farmId}:*`];

      const { data, error } = await this.supabase
        .from('mcp_subscriptions')
        .insert(topics.map(topic => ({
          topic,
          subscriber_id: `farm_${farmId}`,
          metadata: {
            farm_id: farmId
          }
        })))
        .select();

      if (error) throw error;

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to subscribe to farm events'
      };
    }
  }

  async getFarmEvents(farmId: string, eventType?: FarmEvent['type'], limit = 100) {
    try {
      let query = this.supabase
        .from('mcp_messages')
        .select('*')
        .like('topic', `farm:${farmId}:%`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (eventType) {
        query = query.eq('topic', `farm:${farmId}:${eventType}`);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data.map(msg => ({
          type: msg.topic.split(':')[2] as FarmEvent['type'],
          farmId,
          data: msg.payload,
          timestamp: msg.created_at
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get farm events'
      };
    }
  }
} 