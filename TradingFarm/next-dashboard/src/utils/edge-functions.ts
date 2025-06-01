'use client';

import { createBrowserClient } from '@/utils/supabase/client';

/**
 * Utility for invoking Supabase Edge Functions in the Trading Farm application
 */
export const edgeFunctions = {
  /**
   * Update farm metrics for a specific farm or all farms
   * 
   * @param farmId Optional farm ID to update specific farm metrics
   * @returns Response from the edge function
   */
  async updateFarmMetrics(farmId?: number) {
    const supabase = createBrowserClient();
    return supabase.functions.invoke('update-farm-metrics', {
      body: { farmId }
    });
  },

  /**
   * Monitor goals and send notifications for deadlines and progress
   * 
   * @param goalId Optional goal ID to monitor a specific goal
   * @returns Response from the edge function
   */
  async monitorGoals(goalId?: string) {
    const supabase = createBrowserClient();
    return supabase.functions.invoke('goal-monitor', {
      body: { goalId }
    });
  },

  /**
   * Reconcile vault account balances with transaction history
   * 
   * @param accountId Optional account ID to reconcile a specific account
   * @param autoCorrect Whether to automatically correct discrepancies (defaults to false)
   * @returns Response from the edge function
   */
  async reconcileVaultAccounts(accountId?: number, autoCorrect = false) {
    const supabase = createBrowserClient();
    return supabase.functions.invoke('vault-reconciliation', {
      body: { accountId, autoCorrect }
    });
  },

  /**
   * Simulate trading activity for a farm
   * 
   * @param farmId The farm ID to generate trades for
   * @param count Number of trades to generate (default: 1)
   * @param timeSpan Time distribution for trades: 'now', 'day', 'week', 'month', 'year' (default: 'now')
   * @param affectBalance Whether to update the farm balance (default: true)
   * @returns Response from the edge function
   */
  async simulateTrading(
    farmId: number, 
    count = 1, 
    timeSpan: 'now' | 'day' | 'week' | 'month' | 'year' = 'now',
    affectBalance = true
  ) {
    const supabase = createBrowserClient();
    return supabase.functions.invoke('trading-simulator', {
      body: { farmId, count, timeSpan, affectBalance }
    });
  },

  /**
   * Receive and process webhook data from external systems
   * This is typically called by external systems, but can be invoked 
   * for testing with a valid signature
   * 
   * @param payload The webhook payload
   * @param signature The webhook signature for verification
   * @returns Response from the edge function
   */
  async processWebhook(payload: any, signature: string) {
    const supabase = createBrowserClient();
    
    // Set up the headers with the signature
    const headers = {
      'x-webhook-signature': signature,
    };
    
    return supabase.functions.invoke('webhook-handler', {
      body: payload,
      headers
    });
  }
};
