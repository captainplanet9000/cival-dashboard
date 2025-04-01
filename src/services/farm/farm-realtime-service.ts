import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import type { PerformanceMetrics, Trade } from './farm-performance-service';

export interface RealtimeSubscriptionHandler<T = any> {
  onInsert?: (newItem: T) => void;
  onUpdate?: (oldItem: T, newItem: T) => void;
  onDelete?: (oldItem: T) => void;
  onError?: (error: any) => void;
}

export class FarmRealtimeService {
  private supabase;
  private activeSubscriptions: Map<string, any>;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
    this.activeSubscriptions = new Map();
  }

  /**
   * Subscribe to real-time farm updates
   */
  subscribeFarmUpdates(farmId: string, handler: RealtimeSubscriptionHandler) {
    const channel = this.supabase
      .channel(`farm-${farmId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'farms',
        filter: `id=eq.${farmId}`
      }, (payload) => {
        switch (payload.eventType) {
          case 'INSERT':
            handler.onInsert?.(payload.new);
            break;
          case 'UPDATE':
            handler.onUpdate?.(payload.old, payload.new);
            break;
          case 'DELETE':
            handler.onDelete?.(payload.old);
            break;
        }
      })
      .subscribe((status, err) => {
        if (err) {
          handler.onError?.(err);
        }
      });

    this.activeSubscriptions.set(`farm-${farmId}`, channel);
    return () => this.unsubscribe(`farm-${farmId}`);
  }

  /**
   * Subscribe to real-time farm wallet updates
   */
  subscribeFarmWallets(farmId: string, handler: RealtimeSubscriptionHandler) {
    const channel = this.supabase
      .channel(`farm-wallets-${farmId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'farm_wallets',
        filter: `farm_id=eq.${farmId}`
      }, (payload) => {
        switch (payload.eventType) {
          case 'INSERT':
            handler.onInsert?.(payload.new);
            break;
          case 'UPDATE':
            handler.onUpdate?.(payload.old, payload.new);
            break;
          case 'DELETE':
            handler.onDelete?.(payload.old);
            break;
        }
      })
      .subscribe((status, err) => {
        if (err) {
          handler.onError?.(err);
        }
      });

    this.activeSubscriptions.set(`farm-wallets-${farmId}`, channel);
    return () => this.unsubscribe(`farm-wallets-${farmId}`);
  }

  /**
   * Subscribe to real-time agent wallet updates
   */
  subscribeAgentWallets(agentId: string, handler: RealtimeSubscriptionHandler) {
    const channel = this.supabase
      .channel(`agent-wallets-${agentId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'agent_wallets',
        filter: `agent_id=eq.${agentId}`
      }, (payload) => {
        switch (payload.eventType) {
          case 'INSERT':
            handler.onInsert?.(payload.new);
            break;
          case 'UPDATE':
            handler.onUpdate?.(payload.old, payload.new);
            break;
          case 'DELETE':
            handler.onDelete?.(payload.old);
            break;
        }
      })
      .subscribe((status, err) => {
        if (err) {
          handler.onError?.(err);
        }
      });

    this.activeSubscriptions.set(`agent-wallets-${agentId}`, channel);
    return () => this.unsubscribe(`agent-wallets-${agentId}`);
  }

  /**
   * Subscribe to real-time trade updates for a specific farm
   */
  subscribeFarmTrades(farmId: string, handler: RealtimeSubscriptionHandler<Trade>) {
    const channel = this.supabase
      .channel(`farm-trades-${farmId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'farm_trades',
        filter: `farmId=eq.${farmId}`
      }, (payload) => {
        handler.onInsert?.(payload.new as Trade);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'farm_trades',
        filter: `farmId=eq.${farmId}`
      }, (payload) => {
        handler.onUpdate?.(payload.old as Trade, payload.new as Trade);
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'farm_trades',
        filter: `farmId=eq.${farmId}`
      }, (payload) => {
        handler.onDelete?.(payload.old as Trade);
      })
      .subscribe((status, err) => {
        if (err) {
          handler.onError?.(err);
        }
      });

    this.activeSubscriptions.set(`farm-trades-${farmId}`, channel);
    return () => this.unsubscribe(`farm-trades-${farmId}`);
  }

  /**
   * Subscribe to real-time performance metrics updates for a specific farm
   */
  subscribeFarmPerformance(farmId: string, handler: RealtimeSubscriptionHandler<PerformanceMetrics>) {
    const channel = this.supabase
      .channel(`farm-performance-${farmId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'farm_performance_history',
        filter: `farm_id=eq.${farmId}`
      }, (payload) => {
        switch (payload.eventType) {
          case 'INSERT':
            handler.onInsert?.(payload.new.metrics as PerformanceMetrics);
            break;
          case 'UPDATE':
            handler.onUpdate?.(
              payload.old.metrics as PerformanceMetrics,
              payload.new.metrics as PerformanceMetrics
            );
            break;
          case 'DELETE':
            handler.onDelete?.(payload.old.metrics as PerformanceMetrics);
            break;
        }
      })
      .subscribe((status, err) => {
        if (err) {
          handler.onError?.(err);
        }
      });

    this.activeSubscriptions.set(`farm-performance-${farmId}`, channel);
    return () => this.unsubscribe(`farm-performance-${farmId}`);
  }

  /**
   * Subscribe to real-time agent updates for a specific farm
   */
  subscribeFarmAgents(farmId: string, handler: RealtimeSubscriptionHandler<any>) {
    const channel = this.supabase
      .channel(`farm-agents-${farmId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'agents',
        filter: `farmId=eq.${farmId}`
      }, (payload) => {
        switch (payload.eventType) {
          case 'INSERT':
            handler.onInsert?.(payload.new);
            break;
          case 'UPDATE':
            handler.onUpdate?.(payload.old, payload.new);
            break;
          case 'DELETE':
            handler.onDelete?.(payload.old);
            break;
        }
      })
      .subscribe((status, err) => {
        if (err) {
          handler.onError?.(err);
        }
      });

    this.activeSubscriptions.set(`farm-agents-${farmId}`, channel);
    return () => this.unsubscribe(`farm-agents-${farmId}`);
  }

  /**
   * Subscribe to real-time agent tool updates
   */
  subscribeAgentTools(agentId: string, handler: RealtimeSubscriptionHandler) {
    const channel = this.supabase
      .channel(`agent-tools-${agentId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'agent_tools',
        filter: `agent_id=eq.${agentId}`
      }, (payload) => {
        switch (payload.eventType) {
          case 'INSERT':
            handler.onInsert?.(payload.new);
            break;
          case 'UPDATE':
            handler.onUpdate?.(payload.old, payload.new);
            break;
          case 'DELETE':
            handler.onDelete?.(payload.old);
            break;
        }
      })
      .subscribe((status, err) => {
        if (err) {
          handler.onError?.(err);
        }
      });

    this.activeSubscriptions.set(`agent-tools-${agentId}`, channel);
    return () => this.unsubscribe(`agent-tools-${agentId}`);
  }

  /**
   * Subscribe to real-time agent API updates
   */
  subscribeAgentApis(agentId: string, handler: RealtimeSubscriptionHandler) {
    const channel = this.supabase
      .channel(`agent-apis-${agentId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'agent_apis',
        filter: `agent_id=eq.${agentId}`
      }, (payload) => {
        switch (payload.eventType) {
          case 'INSERT':
            handler.onInsert?.(payload.new);
            break;
          case 'UPDATE':
            handler.onUpdate?.(payload.old, payload.new);
            break;
          case 'DELETE':
            handler.onDelete?.(payload.old);
            break;
        }
      })
      .subscribe((status, err) => {
        if (err) {
          handler.onError?.(err);
        }
      });

    this.activeSubscriptions.set(`agent-apis-${agentId}`, channel);
    return () => this.unsubscribe(`agent-apis-${agentId}`);
  }

  /**
   * Unsubscribe from a specific subscription
   */
  private unsubscribe(key: string) {
    const channel = this.activeSubscriptions.get(key);
    if (channel) {
      this.supabase.removeChannel(channel);
      this.activeSubscriptions.delete(key);
    }
  }

  /**
   * Unsubscribe from all active subscriptions
   */
  unsubscribeAll() {
    for (const key of this.activeSubscriptions.keys()) {
      this.unsubscribe(key);
    }
  }
} 