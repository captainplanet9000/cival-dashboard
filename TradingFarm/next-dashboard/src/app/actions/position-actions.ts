'use server';

import { createServerClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { PositionReconciliationService } from '@/services/position-reconciliation-service';

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
  const supabase = await createServerClient();
  
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
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('positions')
      .select(`
        *,
        farms:farm_id(name),
        agents:agent_id(name),
        exchange_accounts:exchange_account_id(name, api_key_name)
      `)
      .eq('id', positionId)
      .single();
    
    if (error) {
      console.error('Error fetching position:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching position:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Reconcile a single position with exchange data
 */
export async function reconcilePosition(positionId: string) {
  try {
    const reconciliationService = new PositionReconciliationService();
    
    // Get position data first
    const { data: position, error } = await getPositionById(positionId);
    
    if (error || !position) {
      return { success: false, error: error || 'Position not found' };
    }
    
    // Perform the reconciliation
    const result = await reconciliationService.reconcileSinglePosition(position);
    
    if (result.success) {
      // Update the position's reconciliation status in the database
      const supabase = await createServerClient();
      
      const { error: updateError } = await supabase
        .from('positions')
        .update({
          reconciliation_status: result.hasDiscrepancy ? 'discrepancy' : 'verified',
          last_reconciled: new Date().toISOString(),
          metadata: {
            ...position.metadata,
            reconciliation_details: result.details
          }
        })
        .eq('id', positionId);
      
      if (updateError) {
        console.error('Error updating position reconciliation status:', updateError);
        return { success: false, error: updateError.message };
      }
      
      revalidatePath('/trading/positions');
      
      return { 
        success: true, 
        data: {
          ...result,
          positionId
        } 
      };
    }
    
    return { success: false, error: result.error || 'Failed to reconcile position' };
  } catch (error) {
    console.error('Error reconciling position:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Reconcile all positions for a farm
 */
export async function reconcileAllPositions(farmId: string) {
  try {
    const reconciliationService = new PositionReconciliationService();
    
    // Get all positions for the farm
    const { data: positions, error } = await getFilteredPositions({ farm_id: farmId });
    
    if (error || !positions) {
      return { success: false, error: error || 'Failed to fetch positions' };
    }
    
    // Reconcile all positions
    const results = await reconciliationService.reconcilePositions(positions, farmId);
    
    if (results.success) {
      revalidatePath('/trading/positions');
      
      return { 
        success: true, 
        data: {
          totalPositions: positions.length,
          reconciled: results.reconciled,
          discrepancies: results.discrepancies,
          details: results.details
        } 
      };
    }
    
    return { success: false, error: results.error || 'Failed to reconcile positions' };
  } catch (error) {
    console.error('Error reconciling positions:', error);
    return { success: false, error: 'An unexpected error occurred' };
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
    const supabase = await createServerClient();
    
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
    const supabase = await createServerClient();
    
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
    const supabase = await createServerClient();
    
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
    const supabase = await createServerClient();
    
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
    const supabase = await createServerClient();
    
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
    const supabase = await createServerClient();
    
    // In a real implementation, this would call the ElizaOS API
    // For now we'll fetch from a database table
    const { data, error } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('reference_id', positionId)
      .eq('reference_type', 'position')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('Error fetching AI insights:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data: data || [] };
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
    const supabase = await createServerClient();
    
    // Get position details
    const { data: position, error: positionError } = await getPositionById(positionId);
    
    if (positionError || !position) {
      return { success: false, error: positionError || 'Position not found' };
    }
    
    // In a real implementation, this would call the ElizaOS API with the position data
    // For now we'll just insert a mock insight
    const { data: insight, error } = await supabase
      .from('ai_insights')
      .insert({
        reference_id: positionId,
        reference_type: 'position',
        title: `${position.symbol} Position Analysis`,
        content: `This ${position.side} position in ${position.symbol} has shown a ${
          position.unrealized_pnl_percentage > 0 ? 'positive' : 'negative'
        } return of ${Math.abs(position.unrealized_pnl_percentage).toFixed(2)}% since entry. 
        Market conditions suggest ${
          Math.random() > 0.5 ? 'maintaining' : 'reducing'
        } exposure at this time based on current volatility and trend direction.`,
        insight_type: 'analysis',
        metadata: {
          query: promptData?.query,
          focus_areas: promptData?.focus_areas,
          position_details: {
            symbol: position.symbol,
            side: position.side,
            entry_price: position.entry_price,
            current_price: position.current_price,
            unrealized_pnl_percentage: position.unrealized_pnl_percentage
          }
        }
      })
      .select('*')
      .single();
    
    if (error) {
      console.error('Error creating AI insight:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data: insight };
  } catch (error) {
    console.error('Error generating AI insights:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
