/**
 * Risk Management Service
 * 
 * This service provides risk management functionality for trading:
 * - Position sizing calculation
 * - Risk limit enforcement
 * - Order validation against risk parameters
 * - Drawdown monitoring
 * - Autonomous agent risk enforcement
 * - Per-agent customized risk rules
 * - Trading limits and circuit breakers
 */

import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';
import websocketService, { WebSocketTopic } from './websocket-service';
import { Order } from './advanced-order-service';
import { MonitoringService } from './monitoring-service';

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
  // Enhanced risk rules for autonomous agents
  agent_circuit_breakers: AgentCircuitBreakers;
  slippage_tolerance_percent: number;
  max_position_value_usd: number;
  max_aggregate_position_value_usd: number;
  enable_hedging: boolean;
  max_daily_drawdown_percent: number;
}

// Circuit breakers for autonomous agents
export interface AgentCircuitBreakers {
  consecutive_losses_limit: number;
  daily_loss_limit_percent: number;
  volatility_threshold: number;
  pause_minutes_after_trigger: number;
  require_manual_reset: boolean;
}

// Agent risk signal input interface
export interface AgentRiskInput {
  agent: any;
  signal: {
    action: 'buy' | 'sell' | 'hold' | 'close';
    confidence?: number;
    entry_price?: number;
    take_profit?: number;
    stop_loss?: number;
  };
  marketData: {
    close: number[];
    high: number[];
    low: number[];
    open: number[];
    volume: number[];
    time: number[];
  };
  position: any | null;
  config: any;
}

// Order parameters output
export interface OrderParameters {
  symbol: string;
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  side: 'buy' | 'sell';
  size: number;
  price?: number;
  stop_price?: number;
  time_in_force?: 'GTC' | 'IOC' | 'FOK';
  exchange: string;
  take_profit?: number;
  stop_loss?: number;
  risk_to_reward?: number;
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
  leverage: number = 1,
  side: 'buy' | 'sell' = 'buy'
): PositionSizingResult {
  // Validate inputs with defensive programming
  if (!accountBalance || !entryPrice || !riskPercent) {
    throw new Error('Missing required parameters for position sizing');
  }
  
  if (accountBalance <= 0 || entryPrice <= 0 || riskPercent <= 0) {
    throw new Error('Invalid parameters for position sizing: values must be positive');
  }
  
  if (leverage <= 0) {
    throw new Error('Leverage must be positive');
  }
  
  if (riskPercent > 100) {
    throw new Error('Risk percent cannot exceed 100%');
  }
  
  if (stopLossPrice <= 0) {
    throw new Error('Stop loss price must be positive');
  }
  
  // For long positions, stop loss should be below entry
  // For short positions, stop loss should be above entry
  const isStopLossValid = (side === 'buy' && stopLossPrice < entryPrice) || 
                          (side === 'sell' && stopLossPrice > entryPrice);
                          
  if (!isStopLossValid) {
    throw new Error(
      side === 'buy' 
        ? 'For long positions, stop loss must be lower than entry price' 
        : 'For short positions, stop loss must be higher than entry price'
    );
  }
  
  // Calculate risk amount in account currency
  const riskAmount = accountBalance * (riskPercent / 100);
  
  // Calculate the price difference (absolute value)
  const priceDifference = Math.abs(entryPrice - stopLossPrice);
  
  // Risk-to-reward ratio calculation (if we had a take profit)
  // const riskToReward = takeProfitPrice ? Math.abs(takeProfitPrice - entryPrice) / priceDifference : undefined;
  
  // Calculate the position size
  const positionSize = (riskAmount / priceDifference) * leverage;
  const positionValue = positionSize * entryPrice;
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

/**
 * Apply risk management rules to an agent trading signal
 * This is the main entry point for the AgentRunner service
 */
export async function applyRiskRules(
  input: AgentRiskInput
): Promise<OrderParameters | null> {
  try {
    const { agent, signal, marketData, position, config } = input;
    
    // If signal is 'hold', no order needed
    if (signal.action === 'hold') {
      return null;
    }
    
    // Get the agent's risk profile
    const riskProfileData = await getAgentRiskProfile(agent.id);
    if (!riskProfileData) {
      throw new Error(`No risk profile found for agent ${agent.id}`);
    }
    
    const riskProfile = riskProfileData.risk_profiles;
    const overrideParams = riskProfileData.override_params || {};
    
    // Combine risk profile with overrides
    const effectiveRiskProfile = {
      ...riskProfile,
      ...overrideParams
    };
    
    // Check for circuit breakers
    const circuitBreakerStatus = await checkCircuitBreakers(agent.id, effectiveRiskProfile);
    if (circuitBreakerStatus.triggered) {
      // Log circuit breaker trigger
      await MonitoringService.logAgentEvent(
        agent.id,
        'agent.warning',
        `Circuit breaker triggered: ${circuitBreakerStatus.reason}`,
        {
          reason: circuitBreakerStatus.reason,
          details: circuitBreakerStatus.details
        },
        'warning'
      );
      
      // If circuit breaker is triggered, don't place an order
      return null;
    }
    
    // Check if we're exceeding the max number of open positions
    const openPositionsCount = await getOpenPositionsCount(agent.farm_id);
    if (openPositionsCount >= effectiveRiskProfile.max_open_positions) {
      await MonitoringService.logAgentEvent(
        agent.id,
        'agent.warning',
        `Max open positions limit reached (${openPositionsCount}/${effectiveRiskProfile.max_open_positions})`,
        { current: openPositionsCount, limit: effectiveRiskProfile.max_open_positions },
        'warning'
      );
      return null;
    }
    
    // Get the latest price from market data
    const latestPrice = marketData.close[marketData.close.length - 1];
    if (!latestPrice) {
      throw new Error('Invalid market data: missing latest price');
    }
    
    // For closing positions
    if (signal.action === 'close') {
      if (!position) {
        return null; // No position to close
      }
      
      return {
        symbol: position.symbol,
        type: 'market',
        side: position.side === 'buy' ? 'sell' : 'buy', // Opposite of position side
        size: position.size,
        exchange: config.exchange || 'bybit'
      };
    }
    
    // Determine entry price (use signal price or latest market price)
    const entryPrice = signal.entry_price || latestPrice;
    
    // Ensure we have a stop loss
    if (!signal.stop_loss) {
      // If no stop loss provided, calculate a default one based on the risk profile
      // For example, 2% below entry for buys, 2% above for sells
      const defaultStopDistance = entryPrice * (effectiveRiskProfile.max_risk_per_trade_percent / 100);
      signal.stop_loss = signal.action === 'buy' 
        ? entryPrice - defaultStopDistance
        : entryPrice + defaultStopDistance;
    }
    
    // Get the latest account balance for this farm/exchange
    const accountBalance = await getAccountBalance(agent.farm_id, config.exchange);
    
    // Calculate the position size based on risk rules
    const positionSizing = calculatePositionSize(
      accountBalance,
      entryPrice,
      signal.stop_loss,
      effectiveRiskProfile.max_risk_per_trade_percent,
      config.leverage || 1,
      signal.action as 'buy' | 'sell'
    );
    
    // Ensure position size doesn't exceed limits
    let finalSize = positionSizing.suggested_size;
    
    // Cap by max position size if needed
    if (finalSize > effectiveRiskProfile.max_position_size) {
      finalSize = effectiveRiskProfile.max_position_size;
    }
    
    // Cap by position value if needed
    const positionValue = finalSize * entryPrice;
    if (positionValue > effectiveRiskProfile.max_position_value_usd) {
      finalSize = effectiveRiskProfile.max_position_value_usd / entryPrice;
    }
    
    // Calculate take profit if provided in signal
    const takeProfitPrice = signal.take_profit || null;
    
    // Calculate risk/reward ratio if both take profit and stop loss are provided
    let riskToReward;
    if (takeProfitPrice && signal.stop_loss) {
      const reward = Math.abs(takeProfitPrice - entryPrice);
      const risk = Math.abs(signal.stop_loss - entryPrice);
      riskToReward = risk > 0 ? reward / risk : null;
    }
    
    // Return the order parameters
    return {
      symbol: config.trading_pairs?.[0] || 'BTCUSDT',  // Default to BTCUSDT if not specified
      type: 'limit',
      side: signal.action as 'buy' | 'sell',
      size: finalSize,
      price: entryPrice,
      time_in_force: 'GTC',
      exchange: config.exchange || 'bybit',
      take_profit: takeProfitPrice,
      stop_loss: signal.stop_loss,
      risk_to_reward: riskToReward
    };
  } catch (error) {
    console.error('Error applying risk rules:', error);
    await MonitoringService.logSystemEvent(
      'system.error',
      `Risk management error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { error: error instanceof Error ? error.stack : 'Unknown error' },
      'error'
    );
    throw error;
  }
}

/**
 * Check if any circuit breakers are triggered for an agent
 */
async function checkCircuitBreakers(agentId: string, riskProfile: RiskProfile) {
  try {
    const supabase = createBrowserClient();
    
    // Check consecutive losses
    const { data: trades, error: tradesError } = await supabase
      .from('trades')
      .select('id, profit_loss, created_at')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(riskProfile.agent_circuit_breakers?.consecutive_losses_limit + 1 || 5);
    
    if (tradesError) throw tradesError;
    
    // Check for consecutive losses
    if (trades && trades.length > 0) {
      let consecutiveLosses = 0;
      for (const trade of trades) {
        if (trade.profit_loss < 0) {
          consecutiveLosses++;
        } else {
          break; // Stop counting after a profitable trade
        }
      }
      
      const lossLimit = riskProfile.agent_circuit_breakers?.consecutive_losses_limit || 5;
      if (consecutiveLosses >= lossLimit) {
        return {
          triggered: true,
          reason: `Consecutive losses circuit breaker (${consecutiveLosses}/${lossLimit})`,
          details: { consecutiveLosses, limit: lossLimit }
        };
      }
    }
    
    // Check for daily loss limit
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    const { data: todayPerformance, error: perfError } = await supabase
      .from('performance_metrics')
      .select('daily_pnl, daily_pnl_percent')
      .eq('agent_id', agentId)
      .gte('period_end', today.toISOString())
      .limit(1);
    
    if (perfError) throw perfError;
    
    if (todayPerformance && todayPerformance.length > 0) {
      const dailyLossLimit = riskProfile.agent_circuit_breakers?.daily_loss_limit_percent || 5;
      const dailyPnlPercent = todayPerformance[0].daily_pnl_percent || 0;
      
      if (dailyPnlPercent < -dailyLossLimit) {
        return {
          triggered: true,
          reason: `Daily loss limit circuit breaker (${dailyPnlPercent.toFixed(2)}% / -${dailyLossLimit}%)`,
          details: { currentLoss: dailyPnlPercent, limit: dailyLossLimit }
        };
      }
    }
    
    // Check for volatility threshold
    // This would be implemented with a calculation of recent volatility
    // For now, we'll just return not triggered
    
    return { triggered: false };
  } catch (error) {
    console.error('Error checking circuit breakers:', error);
    // In case of error, default to allowing the trade (don't trigger circuit breaker)
    return { triggered: false };
  }
}

/**
 * Get count of open positions for a farm
 */
async function getOpenPositionsCount(farmId: string): Promise<number> {
  try {
    const supabase = createBrowserClient();
    
    const { count, error } = await supabase
      .from('positions')
      .select('id', { count: 'exact' })
      .eq('farm_id', farmId)
      .eq('status', 'open');
    
    if (error) throw error;
    
    return count || 0;
  } catch (error) {
    console.error('Error getting open positions count:', error);
    return 0; // Default to 0 in case of error
  }
}

/**
 * Get account balance for a farm and exchange
 */
async function getAccountBalance(farmId: string, exchange: string): Promise<number> {
  try {
    const supabase = createBrowserClient();
    
    const { data, error } = await supabase
      .from('exchange_accounts')
      .select('balance_usd')
      .eq('farm_id', farmId)
      .eq('exchange', exchange)
      .single();
    
    if (error) throw error;
    
    return data?.balance_usd || 10000; // Default to 10000 if not found
  } catch (error) {
    console.error('Error getting account balance:', error);
    return 10000; // Default value in case of error
  }
}

/**
 * Create RiskManagementService class
 */
export class RiskManagementService {
  async applyRiskRules(input: AgentRiskInput): Promise<OrderParameters | null> {
    return applyRiskRules(input);
  }
  
  getRiskProfiles() {
    return getRiskProfiles();
  }
  
  createRiskProfile(profile: Omit<RiskProfile, 'id'>) {
    return createRiskProfile(profile);
  }
  
  updateRiskProfile(id: string, updates: Partial<RiskProfile>) {
    return updateRiskProfile(id, updates);
  }
  
  deleteRiskProfile(id: string) {
    return deleteRiskProfile(id);
  }
  
  assignRiskProfileToAgent(agentId: string, riskProfileId: string, overrideParams?: any) {
    return assignRiskProfileToAgent(agentId, riskProfileId, overrideParams);
  }
  
  getAgentRiskProfile(agentId: string) {
    return getAgentRiskProfile(agentId);
  }
  
  checkOrderAgainstRiskLimits(order: Order, agentId?: string) {
    return checkOrderAgainstRiskLimits(order, agentId);
  }
  
  calculatePositionSize(
    accountBalance: number,
    entryPrice: number,
    stopLossPrice: number,
    riskPercent: number,
    leverage: number = 1,
    side: 'buy' | 'sell' = 'buy'
  ) {
    return calculatePositionSize(accountBalance, entryPrice, stopLossPrice, riskPercent, leverage, side);
  }
  
  calculateKellyPositionSize(
    accountBalance: number,
    winRate: number,
    averageWin: number,
    averageLoss: number
  ) {
    return calculateKellyPositionSize(accountBalance, winRate, averageWin, averageLoss);
  }
  
  getAgentRiskMetrics(agentId: string) {
    return getAgentRiskMetrics(agentId);
  }
}

export default new RiskManagementService();
