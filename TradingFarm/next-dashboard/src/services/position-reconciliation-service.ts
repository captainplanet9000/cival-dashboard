/**
 * Position Reconciliation Service
 * 
 * This service provides functionality for reconciling positions across multiple exchanges:
 * - Syncing positions between local database and exchanges
 * - Detecting and resolving discrepancies
 * - Generating reconciliation reports
 * - Automatic position correction
 */

import { createBrowserClient } from '@/utils/supabase/client';
import websocketService, { WebSocketTopic } from './websocket-service';

// Position interface
export interface Position {
  id?: string;
  user_id?: string;
  farm_id: string;
  agent_id?: string;
  exchange: string;
  exchange_account_id?: string;
  symbol: string;
  side: 'long' | 'short';
  quantity: number;
  entry_price: number;
  current_price?: number;
  unrealized_pnl?: number;
  realized_pnl?: number;
  status: 'open' | 'closed' | 'liquidated';
  open_time?: Date | string;
  close_time?: Date | string;
  metadata?: Record<string, any>;
}

// Reconciliation Result interface
export interface ReconciliationResult {
  success: boolean;
  exchange: string;
  exchange_account_id?: string;
  reconciliation_time: string;
  discrepancies_found: number;
  discrepancies_resolved: number;
  details: {
    added_positions: Position[];
    updated_positions: Position[];
    closed_positions: string[];
    failed_updates: any[];
    error_details?: any;
  };
}

// Exchange Position interface (as returned from exchange APIs)
export interface ExchangePosition {
  symbol: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  markPrice?: number;
  unrealizedPnl?: number;
  leverage?: number;
  marginType?: string;
  isolatedMargin?: number;
  liquidationPrice?: number;
  positionId?: string;
  timestamp?: number;
}

/**
 * Get positions for a user
 */
export async function getUserPositions(farmId?: string, status: 'open' | 'closed' | 'all' = 'open') {
  const supabase = createBrowserClient();
  
  try {
    let query = supabase
      .from('positions')
      .select('*');
    
    if (farmId) {
      query = query.eq('farm_id', farmId);
    }
    
    if (status !== 'all') {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query.order('updated_at', { ascending: false });
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error fetching positions:', error);
    throw error;
  }
}

/**
 * Get positions for an agent
 */
export async function getAgentPositions(agentId: string, status: 'open' | 'closed' | 'all' = 'open') {
  const supabase = createBrowserClient();
  
  try {
    let query = supabase
      .from('positions')
      .select('*')
      .eq('agent_id', agentId);
    
    if (status !== 'all') {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query.order('updated_at', { ascending: false });
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error fetching agent positions:', error);
    throw error;
  }
}

/**
 * Run position reconciliation for a specific exchange account
 */
export async function reconcilePositions(exchangeAccountId: string): Promise<ReconciliationResult> {
  try {
    const response = await fetch(`/api/reconcile/positions/${exchangeAccountId}`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to reconcile positions');
    }

    return await response.json();
  } catch (error) {
    console.error('Error reconciling positions:', error);
    throw error;
  }
}

/**
 * Run position reconciliation for all exchange accounts
 */
export async function reconcileAllPositions(): Promise<ReconciliationResult[]> {
  try {
    const response = await fetch('/api/reconcile/positions/all', {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to reconcile all positions');
    }

    return await response.json();
  } catch (error) {
    console.error('Error reconciling all positions:', error);
    throw error;
  }
}

/**
 * Get reconciliation logs for a user
 */
export async function getReconciliationLogs(limit: number = 20) {
  const supabase = createBrowserClient();
  
  try {
    const { data, error } = await supabase
      .from('position_reconciliation_logs')
      .select('*')
      .order('reconciliation_time', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error fetching reconciliation logs:', error);
    throw error;
  }
}

/**
 * Manually add a position
 */
export async function addPosition(position: Omit<Position, 'id' | 'user_id'>) {
  const supabase = createBrowserClient();
  
  try {
    const { data, error } = await supabase
      .from('positions')
      .insert(position)
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error adding position:', error);
    throw error;
  }
}

/**
 * Update a position
 */
export async function updatePosition(id: string, updates: Partial<Position>) {
  const supabase = createBrowserClient();
  
  try {
    const { data, error } = await supabase
      .from('positions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error updating position:', error);
    throw error;
  }
}

/**
 * Close a position
 */
export async function closePosition(id: string, closingDetails: { 
  close_time?: Date | string, 
  realized_pnl?: number,
  metadata?: Record<string, any>
}) {
  const supabase = createBrowserClient();
  
  try {
    const closeTime = closingDetails.close_time || new Date().toISOString();
    
    const { data, error } = await supabase
      .from('positions')
      .update({
        status: 'closed',
        close_time: closeTime,
        realized_pnl: closingDetails.realized_pnl,
        metadata: closingDetails.metadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error closing position:', error);
    throw error;
  }
}

/**
 * Update position pricing
 */
export async function updatePositionPricing(id: string, currentPrice: number, unrealizedPnl?: number) {
  const supabase = createBrowserClient();
  
  try {
    const updates: any = {
      current_price: currentPrice,
      updated_at: new Date().toISOString()
    };
    
    if (unrealizedPnl !== undefined) {
      updates.unrealized_pnl = unrealizedPnl;
    }
    
    const { data, error } = await supabase
      .from('positions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error updating position pricing:', error);
    throw error;
  }
}

/**
 * Subscribe to position updates
 */
export function subscribeToPositionUpdates(callback: (data: any) => void) {
  return websocketService.subscribe(WebSocketTopic.POSITION_UPDATES, (message) => {
    callback(message);
  });
}

/**
 * Create position from trade
 */
export async function createPositionFromTrade(tradeData: {
  farm_id: string;
  agent_id?: string;
  exchange: string;
  exchange_account_id?: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  metadata?: Record<string, any>;
}) {
  const supabase = createBrowserClient();
  
  try {
    // Determine position side based on trade side
    const positionSide = tradeData.side === 'buy' ? 'long' : 'short';
    
    // Create new position
    const { data, error } = await supabase
      .from('positions')
      .insert({
        farm_id: tradeData.farm_id,
        agent_id: tradeData.agent_id,
        exchange: tradeData.exchange,
        exchange_account_id: tradeData.exchange_account_id,
        symbol: tradeData.symbol,
        side: positionSide,
        quantity: tradeData.quantity,
        entry_price: tradeData.price,
        current_price: tradeData.price,
        status: 'open',
        open_time: new Date().toISOString(),
        metadata: tradeData.metadata
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error creating position from trade:', error);
    throw error;
  }
}

export default {
  getUserPositions,
  getAgentPositions,
  reconcilePositions,
  reconcileAllPositions,
  getReconciliationLogs,
  addPosition,
  updatePosition,
  closePosition,
  updatePositionPricing,
  subscribeToPositionUpdates,
  createPositionFromTrade
};
