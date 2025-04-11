/**
 * Helper utilities for Supabase realtime subscriptions
 * Provides consistent error handling and fallback mechanisms
 */

import { RealtimeChannel } from '@supabase/supabase-js';
import { createBrowserClient } from './client';

interface RealtimeOptions {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  filterValue?: any;
  schema?: string;
}

/**
 * Sets up a realtime subscription with proper error handling and mock data fallback
 * 
 * @param options Configuration options for the realtime subscription
 * @param onData Callback function when data is received
 * @returns A RealtimeChannel that can be used to unsubscribe
 */
export function setupRealtimeSubscription(
  options: RealtimeOptions,
  onData: (payload: any) => void
): RealtimeChannel {
  const supabase = createBrowserClient();
  const { table, event = '*', filter, filterValue, schema = 'public' } = options;
  
  // Create channel with a unique name to avoid conflicts
  const channelName = `${table}_${event}_${Date.now()}`;
  
  try {
    let channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event,
          schema,
          table,
          filter: filter ? `${filter}=eq.${filterValue}` : undefined,
        },
        (payload) => {
          onData(payload);
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Realtime subscription to ${table} established successfully`);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`Error with realtime subscription to ${table}:`, err);
          // In a real app, you might want to implement retry logic here
        }
      });

    return channel;
  } catch (error) {
    console.error(`Error setting up realtime subscription to ${table}:`, error);
    
    // Return a dummy channel that implements the interface but does nothing
    // This prevents the app from crashing
    return {
      unsubscribe: () => {},
    } as unknown as RealtimeChannel;
  }
}

/**
 * Helper to safely unsubscribe from a channel
 * @param channel The channel to unsubscribe from
 */
export function safeUnsubscribe(channel: RealtimeChannel | null) {
  if (channel) {
    try {
      channel.unsubscribe();
    } catch (error) {
      console.warn('Error unsubscribing from channel:', error);
    }
  }
}
