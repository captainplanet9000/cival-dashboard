/**
 * Risk Management Service
 * 
 * This service provides risk management functionality for trading:
 * - Position sizing calculation
 * - Risk limit enforcement
 * - Order validation against risk parameters
 * - Drawdown monitoring
 */

import { createBrowserClient } from '@/utils/supabase/client';
import websocketService, { WebSocketTopic } from './websocket-service';
import { Order } from './advanced-order-service';

// Risk Profile Interface
export interface RiskProfile {
  id: string;
  name: string;
  max_position_size: number;
  max_drawdown_percent: number;
  max_daily_trades: number;
  max_risk_per_trade_percent: number;
  leverage_limit: number;
  position_sizing_method: 'fixed' | 'percent_of_balance' | 'risk_based' | 'kelly_criterion' | 'custom';
  auto_hedging: boolean;
  max_open_positions: number;
}

// Risk Check Result Interface
export interface RiskCheckResult {
  passed: boolean;
  message?: string;
  risk_score?: number;
  warnings?: string[];
  details?: any;
}

// Position Sizing Result Interface
export interface PositionSizingResult {
  suggested_size: number;
  risk_amount: number;
  risk_percent: number;
  position_value: number;
  max_loss: number;
}

/**
 * Get risk profiles for a user
 */
export async function getRiskProfiles() {
  const supabase = createBrowserClient();
  
  try {
    const { data, error } = await supabase
      .from('risk_profiles')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error fetching risk profiles:', error);
    throw error;
  }
}

/**
 * Create a new risk profile
 */
export async function createRiskProfile(profile: Omit<RiskProfile, 'id'>) {
  const supabase = createBrowserClient();
  
  try {
    const { data, error } = await supabase
      .from('risk_profiles')
      .insert(profile)
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error creating risk profile:', error);
    throw error;
  }
}

/**
 * Update an existing risk profile
 */
export async function updateRiskProfile(id: string, updates: Partial<RiskProfile>) {
  const supabase = createBrowserClient();
  
  try {
    const { data, error } = await supabase
      .from('risk_profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error updating risk profile:', error);
    throw error;
  }
}

/**
 * Delete a risk profile
 */
export async function deleteRiskProfile(id: string) {
  const supabase = createBrowserClient();
  
  try {
    const { error } = await supabase
      .from('risk_profiles')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error deleting risk profile:', error);
    throw error;
  }
}

/**
 * Assign a risk profile to an agent
 */
export async function assignRiskProfileToAgent(agentId: string, riskProfileId: string, overrideParams?: any) {
  const supabase = createBrowserClient();
  
  try {
    const { data, error } = await supabase
      .from('agent_risk_assignments')
      .insert({
        agent_id: agentId,
        risk_profile_id: riskProfileId,
        active: true,
        override_params: overrideParams
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error assigning risk profile to agent:', error);
    throw error;
  }
}

/**
 * Get assigned risk profile for an agent
 */
export async function getAgentRiskProfile(agentId: string) {
  const supabase = createBrowserClient();
  
  try {
    const { data, error } = await supabase
      .from('agent_risk_assignments')
      .select(`
        id,
        active,
        override_params,
        risk_profiles:risk_profile_id (*)
      `)
      .eq('agent_id', agentId)
      .eq('active', true)
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error fetching agent risk profile:', error);
    throw error;
  }
}

/**
 * Check if an order complies with risk limits
 */
export async function checkOrderAgainstRiskLimits(order: Order, agentId?: string): Promise<RiskCheckResult> {
  const supabase = createBrowserClient();
  
  try {
    // Get agent risk profile if agentId is provided
    let riskProfile: RiskProfile | null = null;
    if (agentId) {
      const assignment = await getAgentRiskProfile(agentId);
      if (assignment && assignment.risk_profiles) {
        riskProfile = assignment.risk_profiles as unknown as RiskProfile;
      }
    }
    
    // If no risk profile found, use default checks
    if (!riskProfile) {
      // Basic order validation
      return validateOrderBasic(order);
    }
    
    // Comprehensive risk checking with risk profile
    return validateOrderWithRiskProfile(order, riskProfile);
  } catch (error) {
    console.error('Error checking order against risk limits:', error);
    return { 
      passed: false, 
      message: 'Error checking risk limits',
      details: error
    };
  }
}

/**
 * Calculate position size based on risk parameters
 */
export function calculatePositionSize(
  accountBalance: number,
  entryPrice: number,
  stopLossPrice: number,
  riskPercent: number,
  leverage: number = 1
): PositionSizingResult {
  // Calculate risk amount (how much money we're willing to risk)
  const riskAmount = accountBalance * (riskPercent / 100);
  
  // Calculate price difference for stop loss
  const priceDifference = Math.abs(entryPrice - stopLossPrice);
  const riskPerUnit = priceDifference / entryPrice;
  
  // Calculate position size
  const positionSize = riskAmount / (entryPrice * riskPerUnit) * leverage;
  
  // Calculate position value
  const positionValue = positionSize * entryPrice;
  
  // Calculate maximum loss (should be close to risk amount)
  const maxLoss = positionSize * priceDifference;
  
  return {
    suggested_size: positionSize,
    risk_amount: riskAmount,
    risk_percent: riskPercent,
    position_value: positionValue,
    max_loss: maxLoss
  };
}

/**
 * Calculate Kelly Criterion position size
 */
export function calculateKellyPositionSize(
  accountBalance: number,
  winRate: number,
  averageWin: number,
  averageLoss: number
): number {
  // Kelly formula: f* = (p * b - q) / b
  // where:
  // f* = fraction of bankroll to bet
  // p = probability of win
  // q = probability of loss (1 - p)
  // b = net odds received on the bet
  
  const b = averageWin / averageLoss;
  const q = 1 - winRate;
  
  // Calculate Kelly percentage
  const kellyPercentage = (winRate * b - q) / b;
  
  // Limit to range [0, 1]
  const limitedKellyPercentage = Math.max(0, Math.min(1, kellyPercentage));
  
  // Calculate position size (often using half-Kelly for safety)
  const halfKelly = limitedKellyPercentage * 0.5;
  
  return accountBalance * halfKelly;
}

/**
 * Basic order validation without a risk profile
 */
function validateOrderBasic(order: Order): RiskCheckResult {
  const warnings: string[] = [];
  
  // Check for negative or zero quantities
  if (order.quantity <= 0) {
    return {
      passed: false,
      message: 'Order quantity must be greater than zero',
      risk_score: 100
    };
  }
  
  // Check for market orders with large quantities (potential fat-finger)
  if (order.order_type === 'market' && order.quantity > 100) {
    warnings.push('Large market order detected - please confirm quantity');
  }
  
  // All basic checks passed
  return {
    passed: true,
    warnings: warnings.length > 0 ? warnings : undefined,
    risk_score: warnings.length > 0 ? 50 : 20
  };
}

/**
 * Validate order against a specific risk profile
 */
function validateOrderWithRiskProfile(order: Order, riskProfile: RiskProfile): RiskCheckResult {
  const warnings: string[] = [];
  
  // Check position size against max_position_size
  if (order.quantity > riskProfile.max_position_size) {
    return {
      passed: false,
      message: `Order quantity exceeds maximum position size (${riskProfile.max_position_size})`,
      risk_score: 90,
      details: {
        order_quantity: order.quantity,
        max_position_size: riskProfile.max_position_size
      }
    };
  }
  
  // Check daily trade count
  // (would require fetching today's trade count from database)
  
  // Add warnings for approaching limits
  if (order.quantity > riskProfile.max_position_size * 0.8) {
    warnings.push(`Order quantity is approaching maximum position size (${order.quantity} / ${riskProfile.max_position_size})`);
  }
  
  // Calculate risk score based on how close to limits
  const positionSizeRatio = order.quantity / riskProfile.max_position_size;
  const riskScore = Math.min(100, Math.round(positionSizeRatio * 100));
  
  return {
    passed: true,
    warnings: warnings.length > 0 ? warnings : undefined,
    risk_score: riskScore,
    details: {
      position_size_ratio: positionSizeRatio,
      risk_profile_name: riskProfile.name
    }
  };
}

/**
 * Get risk metrics for a specific agent
 */
export async function getAgentRiskMetrics(agentId: string) {
  const supabase = createBrowserClient();
  
  try {
    // Get performance metrics
    const { data: performanceData, error: performanceError } = await supabase
      .from('performance_metrics')
      .select('*')
      .eq('agent_id', agentId)
      .order('period_end', { ascending: false })
      .limit(1);
    
    if (performanceError) throw performanceError;
    
    // Get open positions
    const { data: positions, error: positionsError } = await supabase
      .from('positions')
      .select('*')
      .eq('agent_id', agentId)
      .eq('status', 'open');
    
    if (positionsError) throw positionsError;
    
    // Calculate current exposure
    const totalExposure = positions?.reduce((sum, position) => {
      return sum + (position.quantity * (position.current_price || position.entry_price));
    }, 0) || 0;
    
    return {
      performance: performanceData?.[0] || null,
      open_positions: positions?.length || 0,
      total_exposure: totalExposure,
      drawdown: performanceData?.[0]?.max_drawdown || 0,
      risk_utilization: calculateRiskUtilization(agentId, totalExposure, performanceData?.[0])
    };
  } catch (error) {
    console.error('Error fetching agent risk metrics:', error);
    throw error;
  }
}

/**
 * Calculate risk utilization percentage
 */
function calculateRiskUtilization(
  agentId: string,
  exposure: number,
  performance: any
): number {
  // This would involve comparing current exposure to capital allocation
  // and considering drawdown, etc.
  // Simplified for example:
  
  if (!performance) return 0;
  
  // If we have drawdown data, factor it in
  if (performance.max_drawdown) {
    // Increase risk utilization as drawdown increases
    const drawdownFactor = performance.max_drawdown / 0.25; // 25% as reference point
    return Math.min(100, Math.round((exposure / 10000) * 100 * (1 + drawdownFactor)));
  }
  
  // Simple calculation based just on exposure
  return Math.min(100, Math.round((exposure / 10000) * 100));
}

export default {
  getRiskProfiles,
  createRiskProfile,
  updateRiskProfile,
  deleteRiskProfile,
  assignRiskProfileToAgent,
  getAgentRiskProfile,
  checkOrderAgainstRiskLimits,
  calculatePositionSize,
  calculateKellyPositionSize,
  getAgentRiskMetrics
};
