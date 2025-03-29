import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../lib/supabase-client';

/**
 * Subscription handler interface for processing realtime updates
 */
export interface SubscriptionHandler<T = any> {
  onInsert?: (newItem: T) => void;
  onUpdate?: (oldItem: T, newItem: T) => void;
  onDelete?: (oldItem: T) => void;
  onError?: (error: any) => void;
}

/**
 * Trading Farm Realtime Service for managing Supabase subscriptions
 */
export class RealtimeService {
  private client: SupabaseClient;
  private activeSubscriptions: Map<string, any>;

  constructor() {
    this.client = getSupabaseClient();
    this.activeSubscriptions = new Map();
  }

  /**
   * Subscribe to changes on a specific table
   */
  subscribeToTable<T>(
    tableName: string, 
    handler: SubscriptionHandler<T>,
    filter?: { field: string; value: any }
  ): string {
    // Generate a unique subscription ID
    const subscriptionId = `${tableName}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Create channel with the table name
    let channel = this.client.channel(subscriptionId);
    
    // Configure PostgreSQL changes listener
    let config: any = {
      event: '*',
      schema: 'public',
      table: tableName
    };
    
    // Add filter if provided
    if (filter) {
      config.filter = `${filter.field}=eq.${filter.value}`;
    }
    
    // Subscribe to changes
    channel = channel.on('postgres_changes', config, (payload) => {
      const eventType = payload.eventType;
      
      try {
        switch (eventType) {
          case 'INSERT':
            if (handler.onInsert) {
              handler.onInsert(payload.new as T);
            }
            break;
            
          case 'UPDATE':
            if (handler.onUpdate) {
              handler.onUpdate(payload.old as T, payload.new as T);
            }
            break;
            
          case 'DELETE':
            if (handler.onDelete) {
              handler.onDelete(payload.old as T);
            }
            break;
            
          default:
            console.warn(`Unknown event type: ${eventType}`);
        }
      } catch (error) {
        console.error('Error in subscription handler:', error);
        if (handler.onError) {
          handler.onError(error);
        }
      }
    });
    
    // Handle subscription errors
    channel.subscribe((status: string, err?: any) => {
      if (status !== 'SUBSCRIBED') {
        console.error(`Subscription to ${tableName} failed:`, status, err);
        if (handler.onError) {
          handler.onError(err || new Error(`Subscription failed with status: ${status}`));
        }
      } else {
        console.log(`Successfully subscribed to ${tableName}`);
      }
    });
    
    // Store subscription for later cleanup
    this.activeSubscriptions.set(subscriptionId, channel);
    
    return subscriptionId;
  }

  /**
   * Unsubscribe from a specific subscription
   */
  unsubscribe(subscriptionId: string): boolean {
    const channel = this.activeSubscriptions.get(subscriptionId);
    
    if (!channel) {
      console.warn(`Subscription ${subscriptionId} not found`);
      return false;
    }
    
    try {
      this.client.removeChannel(channel);
      this.activeSubscriptions.delete(subscriptionId);
      console.log(`Unsubscribed from ${subscriptionId}`);
      return true;
    } catch (error) {
      console.error(`Error unsubscribing from ${subscriptionId}:`, error);
      return false;
    }
  }

  /**
   * Unsubscribe from all active subscriptions
   */
  unsubscribeAll(): void {
    this.activeSubscriptions.forEach((channel, id) => {
      try {
        this.client.removeChannel(channel);
        console.log(`Unsubscribed from ${id}`);
      } catch (error) {
        console.error(`Error unsubscribing from ${id}:`, error);
      }
    });
    
    this.activeSubscriptions.clear();
  }

  /**
   * Subscribe to Farm updates
   */
  subscribeFarm(farmId: number, handler: SubscriptionHandler): string {
    return this.subscribeToTable('farms', handler, { field: 'id', value: farmId });
  }

  /**
   * Subscribe to Agent updates
   */
  subscribeAgent(agentId: number, handler: SubscriptionHandler): string {
    return this.subscribeToTable('agents', handler, { field: 'id', value: agentId });
  }

  /**
   * Subscribe to Wallet updates
   */
  subscribeWallet(walletId: number, handler: SubscriptionHandler): string {
    return this.subscribeToTable('wallets', handler, { field: 'id', value: walletId });
  }

  /**
   * Subscribe to new transactions for a wallet
   */
  subscribeWalletTransactions(walletId: number, handler: SubscriptionHandler): string[] {
    const incomingSubscriptionId = this.subscribeToTable(
      'transactions',
      handler,
      { field: 'destination_wallet_id', value: walletId }
    );
    
    const outgoingSubscriptionId = this.subscribeToTable(
      'transactions',
      handler,
      { field: 'source_wallet_id', value: walletId }
    );
    
    return [incomingSubscriptionId, outgoingSubscriptionId];
  }

  /**
   * Subscribe to new orders for a farm
   */
  subscribeFarmOrders(farmId: number, handler: SubscriptionHandler): string {
    return this.subscribeToTable('orders', handler, { field: 'farm_id', value: farmId });
  }

  /**
   * Subscribe to new ElizaOS commands
   */
  subscribeElizaCommands(source: string, handler: SubscriptionHandler): string {
    return this.subscribeToTable('eliza_commands', handler, { field: 'source', value: source });
  }

  /**
   * Subscribe to market data for a specific symbol
   */
  subscribeMarketData(symbol: string, handler: SubscriptionHandler): string {
    return this.subscribeToTable('market_data', handler, { field: 'symbol', value: symbol });
  }
}
