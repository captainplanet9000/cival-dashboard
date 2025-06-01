'use server';

import { createServerClient } from '@/utils/supabase/server';
import { 
  PositionReconciliationService, 
  Position, 
  ReconciliationResult 
} from '@/services/position-reconciliation-service';
import { revalidatePath } from 'next/cache';

/**
 * Get all positions with filtering options
 */
export async function getFilteredPositions(params: {
  farm_id?: string;
  agent_id?: string;
  symbol?: string;
  exchange?: string;
  side?: 'long' | 'short';
  reconciliation_status?: string;
  limit?: number;
  offset?: number;
}) {
  const supabase = createServerClient();
  
  // Start building the query
  let query = supabase
    .from('positions')
    .select('*')
    .order('created_at', { ascending: false });
  
  // Apply filters
  if (params.farm_id) query = query.eq('farm_id', params.farm_id);
  if (params.agent_id) query = query.eq('agent_id', params.agent_id);
  if (params.symbol) query = query.eq('symbol', params.symbol);
  if (params.exchange) query = query.eq('exchange', params.exchange);
  if (params.side) query = query.eq('side', params.side);
  if (params.reconciliation_status) query = query.eq('reconciliation_status', params.reconciliation_status);
  
  // Apply pagination
  if (params.limit) query = query.limit(params.limit);
  if (params.offset) query = query.range(params.offset, params.offset + (params.limit || 50) - 1);
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching positions:', error);
    return { success: false, error: error.message, data: [] };
  }
  
  return { success: true, data: data || [] };
}

/**
 * Get position details by ID
 */
export async function getPositionById(positionId: string) {
  try {
    const supabase = createServerClient();
    
    // Fetch the position
    const { data: position, error } = await supabase
      .from('positions')
      .select('*, exchange_accounts(*)')
      .eq('id', positionId)
      .single();
    
    if (error) {
      console.error('Error fetching position:', error);
      return { success: false, error: error.message };
    }
    
    if (!position) {
      return { success: false, error: 'Position not found' };
    }
    
    // Calculate PnL percentage
    const positionWithPnl = await calculateUnrealizedPnl(position);
    
    return {
      success: true,
      position: positionWithPnl
    };
  } catch (error) {
    console.error('Error in getPositionById:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Reconcile a single position with exchange data
 */
export async function reconcilePosition(positionId: string) {
  try {
    const supabase = createServerClient();
    const { data: position, error } = await supabase
      .from('positions')
      .select('*, exchange_accounts:farm_exchange_accounts!inner(api_keys)')
      .eq('id', positionId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch position: ${error.message}`);
    }

    if (!position) {
      throw new Error('Position not found');
    }

    // Convert database position to the format expected by the reconciliation service
    const positionForReconciliation: Position = {
      id: position.id,
      farm_id: position.farm_id,
      agent_id: position.agent_id,
      exchange: position.exchange,
      symbol: position.symbol,
      side: position.side as 'long' | 'short',
      quantity: position.quantity,
      entry_price: position.entry_price,
      current_price: position.current_price,
      unrealized_pnl: position.unrealized_pnl,
      status: position.status,
      open_date: position.created_at, // Use created_at as open_date
      close_date: position.status === 'closed' ? position.last_updated : null, // Use last_updated as close_date for closed positions
      metadata: position.metadata ? JSON.parse(JSON.stringify(position.metadata)) : {},
      created_at: position.created_at,
      updated_at: position.updated_at
    };

    // Call the reconciliation service
    const reconciliationService = new PositionReconciliationService();
    const result = await reconciliationService.reconcilePosition(positionId, positionForReconciliation);
    
    if (result.success) {
      // Update the position with reconciliation results
      const { error: updateError } = await supabase
        .from('positions')
        .update({
          reconciliation_status: 'reconciled',
          metadata: {
            ...(position.metadata || {}),
            last_reconciliation: {
              timestamp: result.reconciliation_time,
              result
            }
          }
        })
        .eq('id', positionId);

      if (updateError) {
        console.error('Error updating position after reconciliation:', updateError);
        return { success: false, error: updateError.message };
      }

      return { success: true, result };
    } else {
      console.error('Reconciliation failed:', result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('Error in reconcilePosition:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

/**
 * Reconcile all positions for a farm
 */
export async function reconcileAllPositions(farmId: string) {
  try {
    const reconciliationService = new PositionReconciliationService();
    const supabase = createServerClient();
    
    // Get all positions for the farm
    const { data: positions, error } = await supabase
      .from('positions')
      .select('*, exchange_accounts:farm_exchange_accounts!inner(api_keys)')
      .eq('farm_id', farmId)
      .eq('status', 'open');
    
    if (error) {
      throw new Error(`Failed to fetch positions: ${error.message}`);
    }
    
    if (!positions || positions.length === 0) {
      return { success: true, message: 'No open positions to reconcile', results: [] };
    }
    
    // Convert database positions to the format expected by the reconciliation service
    const positionsForReconciliation = positions.map((position: any) => ({
      id: position.id,
      farm_id: position.farm_id,
      agent_id: position.agent_id,
      exchange: position.exchange,
      symbol: position.symbol,
      side: position.side as 'long' | 'short',
      quantity: position.quantity,
      entry_price: position.entry_price,
      current_price: position.current_price,
      unrealized_pnl: position.unrealized_pnl,
      status: position.status,
      open_date: position.created_at, // Use created_at as open_date
      close_date: position.status === 'closed' ? position.last_updated : null, // Use last_updated as close_date for closed positions
      metadata: position.metadata ? JSON.parse(JSON.stringify(position.metadata)) : {},
      created_at: position.created_at,
      updated_at: position.updated_at
    }));
    
    // Reconcile all positions
    const results = await reconciliationService.reconcileAllPositions(farmId, positionsForReconciliation);
    
    // Update positions with reconciliation results
    const updateErrors: { positionId: string; error: string }[] = [];
    
    for (const result of results) {
      if (result.success && result.positionId) {
        const position = positions.find((p: any) => p.id === result.positionId);
        
        if (position) {
          const { error: updateError } = await supabase
            .from('positions')
            .update({
              reconciliation_status: result.hasDiscrepancy ? 'discrepancy' : 'verified',
              last_updated: new Date().toISOString(),
              metadata: {
                ...(position.metadata || {}),
                reconciliation_details: {
                  timestamp: result.reconciliation_time,
                  details: result.details
                }
              }
            })
            .eq('id', position.id);

          if (updateError) {
            updateErrors.push({ positionId: position.id, error: updateError.message });
          }
        }
      }
    }
    
    revalidatePath('/trading/positions');
    
    return {
      success: true,
      results,
      updateErrors: updateErrors.length > 0 ? updateErrors : undefined
    };
  } catch (error) {
    console.error('Error in reconcileAllPositions:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Create a position adjustment record (manual adjustment)
 */
export async function createPositionAdjustment(adjustmentData: {
  position_id: string;
  adjustment_type: 'quantity' | 'cost_basis' | 'entry_price';
  previous_value: number;
  new_value: number;
  reason: string;
  notes?: string;
}) {
  try {
    const supabase = createServerClient();
    
    // Insert the adjustment record
    const { data: adjustment, error } = await supabase
      .from('position_adjustments')
      .insert({
        position_id: adjustmentData.position_id,
        adjustment_type: adjustmentData.adjustment_type,
        previous_value: adjustmentData.previous_value,
        new_value: adjustmentData.new_value,
        reason: adjustmentData.reason,
        notes: adjustmentData.notes,
        created_by_user_id: 'system', // This would be the authenticated user in a real app
        status: 'pending'
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Error creating position adjustment:', error);
      return { success: false, error: error.message };
    }
    
    revalidatePath('/trading/positions');
    
    return { success: true, data: adjustment };
  } catch (error) {
    console.error('Error creating position adjustment:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Approve a position adjustment
 */
export async function approvePositionAdjustment(adjustmentId: string) {
  try {
    const supabase = createServerClient();
    
    // Get the adjustment details first
    const { data: adjustment, error: fetchError } = await supabase
      .from('position_adjustments')
      .select('*')
      .eq('id', adjustmentId)
      .single();
    
    if (fetchError || !adjustment) {
      console.error('Error fetching adjustment:', fetchError);
      return { success: false, error: fetchError?.message || 'Adjustment not found' };
    }
    
    // Start a transaction to update both the adjustment and position
    const { data, error } = await supabase.rpc('approve_position_adjustment', {
      p_adjustment_id: adjustmentId,
      p_approved_by_user_id: 'system' // This would be the authenticated user in a real app
    });
    
    if (error) {
      console.error('Error approving position adjustment:', error);
      return { success: false, error: error.message };
    }
    
    revalidatePath('/trading/positions');
    
    return { success: true, data };
  } catch (error) {
    console.error('Error approving position adjustment:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Reject a position adjustment
 */
export async function rejectPositionAdjustment(adjustmentId: string, reason: string) {
  try {
    const supabase = createServerClient();
    
    // Update adjustment status
    const { error } = await supabase
      .from('position_adjustments')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        rejected_by_user_id: 'system', // This would be the authenticated user in a real app
        rejected_at: new Date().toISOString()
      })
      .eq('id', adjustmentId);
    
    if (error) {
      console.error('Error rejecting position adjustment:', error);
      return { success: false, error: error.message };
    }
    
    revalidatePath('/trading/positions');
    
    return { success: true };
  } catch (error) {
    console.error('Error rejecting position adjustment:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Create position import job
 */
export async function createPositionImportJob(importData: {
  farm_id: string;
  exchange: string;
  exchange_account_id?: string;
  symbols?: string[];
  import_all: boolean;
  metadata?: Record<string, any>;
}) {
  try {
    const supabase = createServerClient();
    
    // Insert the import job
    const { data: importJob, error } = await supabase
      .from('position_import_jobs')
      .insert({
        farm_id: importData.farm_id,
        exchange: importData.exchange,
        exchange_account_id: importData.exchange_account_id,
        symbols: importData.symbols,
        import_all: importData.import_all,
        status: 'pending',
        metadata: importData.metadata
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Error creating position import job:', error);
      return { success: false, error: error.message };
    }
    
    // In a real app, this would trigger a background job to import positions
    // For now, we'll just update the status to simulate the job running
    setTimeout(async () => {
      const { error: updateError } = await supabase
        .from('position_import_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          positions_imported: 5,
          positions_updated: 3,
          positions_errors: 0
        })
        .eq('id', importJob.id);
      
      if (updateError) {
        console.error('Error updating import job status:', updateError);
      }
      
      revalidatePath('/trading/positions');
    }, 3000);
    
    return { success: true, data: importJob };
  } catch (error) {
    console.error('Error creating position import job:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get portfolio metrics and summary
 */
export async function getPortfolioMetrics(params: {
  farm_id?: string;
  agent_id?: string;
  period?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time';
  start_date?: string;
  end_date?: string;
}) {
  try {
    const supabase = createServerClient();
    
    // Construct the query parameters
    const queryParams: Record<string, any> = {};
    
    if (params.farm_id) queryParams.p_farm_id = params.farm_id;
    if (params.agent_id) queryParams.p_agent_id = params.agent_id;
    if (params.period) queryParams.p_period = params.period;
    if (params.start_date) queryParams.p_start_date = params.start_date;
    if (params.end_date) queryParams.p_end_date = params.end_date;
    
    // Call the appropriate RPC function based on what filters are provided
    let rpcFunction = 'get_portfolio_metrics';
    
    if (params.farm_id && params.agent_id) {
      rpcFunction = 'get_agent_portfolio_metrics';
    } else if (params.farm_id) {
      rpcFunction = 'get_farm_portfolio_metrics';
    }
    
    const { data, error } = await supabase.rpc(rpcFunction, queryParams);
    
    if (error) {
      console.error(`Error fetching portfolio metrics (${rpcFunction}):`, error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching portfolio metrics:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get ElizaOS insights for a position
 */
export async function getPositionAiInsights(positionId: string) {
  try {
    const supabase = createServerClient();
    
    const { data, error } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('reference_id', positionId)
      .eq('reference_type', 'position')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching AI insights:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, insights: data || [] };
  } catch (error) {
    console.error('Error fetching AI insights:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Generate ElizaOS insights for a position
 */
export async function generatePositionAiInsights(positionId: string, promptData?: {
  query?: string;
  focus_areas?: string[];
}) {
  try {
    const supabase = createServerClient();
    
    // Get position details
    const positionResult = await getPositionById(positionId);
    
    if (!positionResult.success || !positionResult.position) {
      return { success: false, error: positionResult.error || 'Position not found' };
    }
    
    const position = positionResult.position;
    
    // In a real implementation, this would call the ElizaOS API with the position data
    // For now we'll just insert a mock insight
    const { data: insight, error } = await supabase
      .from('ai_insights')
      .insert({
        reference_id: positionId,
        reference_type: 'position',
        insight_type: 'analysis',
        content: `This ${position.side} position in ${position.symbol} has shown a ${
          position.unrealized_pnl_percentage > 0 ? 'positive' : 'negative'
        } return of ${Math.abs(position.unrealized_pnl_percentage || 0).toFixed(2)}% since entry. 
        Market conditions suggest ${
          Math.random() > 0.5 ? 'maintaining' : 'reducing'
        } exposure at this time based on current volatility and trend direction.`,
        metadata: {
          query: promptData?.query,
          focus_areas: promptData?.focus_areas,
          position_details: {
            symbol: position.symbol,
            side: position.side,
            entry_price: position.entry_price,
            current_price: position.current_price
          }
        }
      })
      .select();
    
    if (error) {
      console.error('Error generating AI insight:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, insight: insight[0] };
  } catch (error) {
    console.error('Error in generatePositionAiInsights:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Calculate unrealized PnL percentage for a position
 */
async function calculateUnrealizedPnl(position: any) {
  try {
    // If the position is already closed, we don't need to calculate the unrealized PnL
    if (position.status === 'closed') {
      return {
        ...position,
        unrealized_pnl_percentage: 0
      };
    }

    // Calculate the unrealized PnL percentage
    const entryValue = position.entry_price * position.quantity;
    const currentValue = position.current_price * position.quantity;
    
    // For long positions: (currentValue - entryValue) / entryValue * 100
    // For short positions: (entryValue - currentValue) / entryValue * 100
    const pnlDifference = position.side === 'long' 
      ? (currentValue - entryValue) 
      : (entryValue - currentValue);
      
    const unrealizedPnlPercentage = (pnlDifference / entryValue) * 100;
    
    return {
      ...position,
      unrealized_pnl_percentage: unrealizedPnlPercentage
    };
  } catch (error) {
    console.error('Error calculating unrealized PnL:', error);
    // Return the original position without modifying it
    return position;
  }
}

/**
 * Get analytics insights for a position
 */
export async function getAnalyticsInsights(positionId: string) {
  try {
    const supabase = createServerClient();

    // Get position details
    const positionResult = await getPositionById(positionId);
    if (!positionResult.success) {
      return { success: false, error: 'Failed to fetch position' };
    }

    // Fetch AI insights for this position
    const { data: insights, error } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('reference_id', positionId)
      .eq('reference_type', 'position')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching AI insights:', error);
      return { success: false, error: error.message };
    }
    
    return {
      success: true,
      position: positionResult.position,
      insights: insights || []
    };
  } catch (error) {
    console.error('Error in getAnalyticsInsights:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Update position status and price
 */
export async function updatePositionStatus(positionId: string, status: string, price?: number) {
  try {
    const supabase = createServerClient();

    // Check if the position exists
    const positionResult = await getPositionById(positionId);
    if (!positionResult.success) {
      return { success: false, error: 'Position not found' };
    }

    // Construct the update data
    const updateData: Record<string, any> = { status };
    
    // Add close_date if the status is 'closed'
    if (status === 'closed') {
      updateData.close_date = new Date().toISOString();
    }
    
    // Add price update if provided
    if (price !== undefined) {
      updateData.current_price = price;
    }

    // Update the position
    const { error } = await supabase
      .from('positions')
      .update(updateData)
      .eq('id', positionId);

    if (error) {
      console.error('Error updating position status:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updatePositionStatus:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
