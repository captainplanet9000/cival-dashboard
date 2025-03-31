'use server';

import { createServerClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Create a new trading agent
 */
export async function createAgent(agentData: {
  farm_id: string;
  name: string;
  description: string;
  strategy_id?: string;
  capital_allocation: number;
  risk_profile_id?: string;
  is_active: boolean;
  parameters: any;
}) {
  try {
    const supabase = await createServerClient();
    
    // Insert agent into database
    const { data: agent, error } = await supabase
      .from('agents')
      .insert({
        farm_id: agentData.farm_id,
        name: agentData.name,
        description: agentData.description,
        strategy_id: agentData.strategy_id,
        capital_allocation: agentData.capital_allocation,
        risk_profile_id: agentData.risk_profile_id,
        is_active: agentData.is_active,
        parameters: agentData.parameters
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Error creating agent:', error);
      return { success: false, error: error.message };
    }
    
    revalidatePath('/agents');
    
    return { success: true, data: agent };
  } catch (error) {
    console.error('Error creating agent:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Update an existing agent
 */
export async function updateAgent(
  id: string,
  agentData: Partial<{
    name: string;
    description: string;
    strategy_id: string;
    capital_allocation: number;
    risk_profile_id: string;
    is_active: boolean;
    parameters: any;
  }>
) {
  try {
    const supabase = await createServerClient();
    
    // Update agent in database
    const { error } = await supabase
      .from('agents')
      .update({
        ...agentData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) {
      console.error('Error updating agent:', error);
      return { success: false, error: error.message };
    }
    
    revalidatePath('/agents');
    
    return { success: true };
  } catch (error) {
    console.error('Error updating agent:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Delete an agent
 */
export async function deleteAgent(id: string) {
  try {
    const supabase = await createServerClient();
    
    // Delete agent from database
    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting agent:', error);
      return { success: false, error: error.message };
    }
    
    revalidatePath('/agents');
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting agent:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Toggle agent active status
 */
export async function toggleAgentActive(id: string, isActive: boolean) {
  try {
    const supabase = await createServerClient();
    
    // Update agent in database
    const { error } = await supabase
      .from('agents')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) {
      console.error('Error toggling agent active state:', error);
      return { success: false, error: error.message };
    }
    
    revalidatePath('/agents');
    
    return { success: true };
  } catch (error) {
    console.error('Error toggling agent active state:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Allocate capital to an agent
 */
export async function allocateCapital(id: string, amount: number) {
  try {
    const supabase = await createServerClient();
    
    // First get current allocation
    const { data: agent, error: fetchError } = await supabase
      .from('agents')
      .select('capital_allocation, farm_id')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      console.error('Error fetching agent:', fetchError);
      return { success: false, error: fetchError.message };
    }
    
    // Update agent capital allocation
    const { error: updateError } = await supabase
      .from('agents')
      .update({
        capital_allocation: amount,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (updateError) {
      console.error('Error updating agent capital allocation:', updateError);
      return { success: false, error: updateError.message };
    }
    
    // Log capital allocation change
    const { error: logError } = await supabase
      .from('capital_allocation_logs')
      .insert({
        agent_id: id,
        farm_id: agent.farm_id,
        previous_amount: agent.capital_allocation,
        new_amount: amount,
        change_amount: amount - agent.capital_allocation,
        notes: `Capital allocation changed from ${agent.capital_allocation} to ${amount}`
      });
    
    if (logError) {
      console.error('Error logging capital allocation change:', logError);
      // Non-critical error, continue
    }
    
    revalidatePath('/agents');
    
    return { success: true };
  } catch (error) {
    console.error('Error allocating capital:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get agent performance metrics
 */
export async function getAgentPerformance(id: string, timeframe: 'day' | 'week' | 'month' | 'year' = 'month') {
  try {
    const supabase = await createServerClient();
    
    // Calculate start date based on timeframe
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeframe) {
      case 'day':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }
    
    // Format dates for SQL query
    const startDateStr = startDate.toISOString();
    const endDateStr = endDate.toISOString();
    
    // Get orders for the agent within the date range
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('agent_id', id)
      .gte('created_at', startDateStr)
      .lte('created_at', endDateStr)
      .order('created_at', { ascending: true });
    
    if (ordersError) {
      console.error('Error fetching agent orders:', ordersError);
      return { success: false, error: ordersError.message };
    }
    
    // Get trades for the agent within the date range
    const { data: trades, error: tradesError } = await supabase
      .from('trades')
      .select('*, orders!inner(agent_id)')
      .eq('orders.agent_id', id)
      .gte('executed_at', startDateStr)
      .lte('executed_at', endDateStr)
      .order('executed_at', { ascending: true });
    
    if (tradesError) {
      console.error('Error fetching agent trades:', tradesError);
      return { success: false, error: tradesError.message };
    }
    
    // Get agent details
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();
    
    if (agentError) {
      console.error('Error fetching agent details:', agentError);
      return { success: false, error: agentError.message };
    }
    
    // Calculate performance metrics
    let totalProfit = 0;
    let winCount = 0;
    let lossCount = 0;
    const dailyPnL: { [date: string]: number } = {};
    
    // Process closed trades
    trades.forEach((trade: any) => {
      // Skip trades without PnL data
      if (!trade.metadata?.pnl) return;
      
      const pnl = parseFloat(trade.metadata.pnl);
      totalProfit += pnl;
      
      if (pnl > 0) winCount++;
      if (pnl < 0) lossCount++;
      
      // Aggregate by date for daily PnL
      const date = new Date(trade.executed_at).toISOString().split('T')[0];
      dailyPnL[date] = (dailyPnL[date] || 0) + pnl;
    });
    
    // Calculate win rate
    const totalTrades = winCount + lossCount;
    const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;
    
    // Calculate drawdown
    let maxCapital = agent.capital_allocation;
    let currentCapital = agent.capital_allocation;
    let maxDrawdown = 0;
    
    Object.values(dailyPnL).forEach((pnl) => {
      currentCapital += pnl;
      
      if (currentCapital > maxCapital) {
        maxCapital = currentCapital;
      } else {
        const drawdown = (maxCapital - currentCapital) / maxCapital * 100;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      }
    });
    
    // Format performance data for chart
    const performanceData = Object.entries(dailyPnL).map(([date, pnl]) => ({
      date,
      pnl
    }));
    
    // Construct performance metrics
    const performanceMetrics = {
      totalProfit,
      winRate,
      totalTrades,
      winCount,
      lossCount,
      maxDrawdown,
      initialCapital: agent.capital_allocation,
      currentCapital,
      returnPercentage: ((currentCapital - agent.capital_allocation) / agent.capital_allocation) * 100,
      activePositions: orders.filter((order: any) => ['new', 'open', 'partial_fill'].includes(order.status)).length,
      performanceData
    };
    
    return { success: true, data: performanceMetrics };
  } catch (error) {
    console.error('Error getting agent performance:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
