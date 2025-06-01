/**
 * Streaming Monitoring Service
 * Provides real-time updates for goal acquisition monitoring
 */

import { createBrowserClient } from '@/utils/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { GoalMonitoringEvent, Goal } from '@/types/goal-types';

// Event types for monitoring updates
type MonitoringUpdateEvent = 'agent_activity' | 'goal_progress' | 'transaction_update' | 'market_condition';

// Listener type for monitoring updates
type MonitoringUpdateListener = (event: GoalMonitoringEvent) => void;

// State for managing subscriptions
interface SubscriptionState {
  channel: RealtimeChannel | null;
  listeners: Map<string, MonitoringUpdateListener[]>;
  activeGoals: Set<string>;
  isInitialized: boolean;
}

/**
 * Service for streaming real-time monitoring updates
 * Connects to Supabase realtime channels for goal monitoring events
 */
class StreamingMonitoringService {
  private state: SubscriptionState = {
    channel: null,
    listeners: new Map(),
    activeGoals: new Set(),
    isInitialized: false
  };

  /**
   * Initialize the streaming service
   */
  public initialize(): void {
    if (this.state.isInitialized) return;
    this.setupRealtimeChannel();
    this.state.isInitialized = true;
  }

  /**
   * Subscribe to monitoring updates for a specific goal
   */
  public subscribeToGoal(goalId: string, listener: MonitoringUpdateListener): () => void {
    if (!this.state.isInitialized) {
      this.initialize();
    }

    // Add goal to active set
    this.state.activeGoals.add(goalId);

    // Add listener for this goal
    if (!this.state.listeners.has(goalId)) {
      this.state.listeners.set(goalId, []);
    }
    this.state.listeners.get(goalId)?.push(listener);

    // Return unsubscribe function
    return () => {
      const listeners = this.state.listeners.get(goalId) || [];
      const index = listeners.indexOf(listener);
      if (index >= 0) {
        listeners.splice(index, 1);
      }

      // If no more listeners for this goal, remove it from active set
      if (listeners.length === 0) {
        this.state.listeners.delete(goalId);
        this.state.activeGoals.delete(goalId);
      }
    };
  }

  /**
   * Setup Supabase realtime channel for monitoring events
   */
  private setupRealtimeChannel(): void {
    const supabase = createBrowserClient();

    // Subscribe to goal_monitoring table inserts
    this.state.channel = supabase
      .channel('goal-monitoring-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'goal_monitoring',
        },
        (payload) => {
          const event = payload.new as GoalMonitoringEvent;
          this.handleMonitoringEvent(event);
        }
      )
      .subscribe((status) => {
        console.log('Streaming monitoring channel status:', status);
      });
  }

  /**
   * Handle incoming monitoring events
   */
  private handleMonitoringEvent(event: GoalMonitoringEvent): void {
    // Check if we have listeners for this goal
    if (this.state.activeGoals.has(event.goal_id)) {
      // Notify all listeners for this goal
      const listeners = this.state.listeners.get(event.goal_id) || [];
      listeners.forEach(listener => listener(event));
    }
  }

  /**
   * Request immediate refresh of goal data
   */
  public async refreshGoalData(goalId: string): Promise<Goal | null> {
    try {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('id', goalId)
        .single();

      if (error) {
        console.error('Error fetching goal data:', error);
        return null;
      }

      return data as Goal;
    } catch (error) {
      console.error('Error refreshing goal data:', error);
      return null;
    }
  }

  /**
   * Request immediate agent coordination state update
   */
  public async refreshCoordinationState(goalId: string): Promise<any | null> {
    try {
      const response = await fetch(`/api/goals/acquisition/coordination?goal_id=${goalId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch coordination state: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error refreshing coordination state:', error);
      return null;
    }
  }

  /**
   * Publishes a recent event for testing (only available in development)
   */
  public async publishTestEvent(goalId: string, eventType: string): Promise<boolean> {
    if (process.env.NODE_ENV !== 'development') {
      console.warn('Test events can only be published in development mode');
      return false;
    }

    try {
      const supabase = createBrowserClient();
      const { error } = await supabase
        .from('goal_monitoring')
        .insert({
          goal_id: goalId,
          event_type: eventType,
          severity: 'INFO',
          event_data: {
            timestamp: new Date().toISOString(),
            test: true,
            message: `Test event of type ${eventType}`
          }
        });

      if (error) {
        console.error('Error publishing test event:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error publishing test event:', error);
      return false;
    }
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.state.channel) {
      this.state.channel.unsubscribe();
      this.state.channel = null;
    }
    this.state.listeners.clear();
    this.state.activeGoals.clear();
    this.state.isInitialized = false;
  }
}

// Export as singleton
export const streamingMonitoringService = new StreamingMonitoringService();
