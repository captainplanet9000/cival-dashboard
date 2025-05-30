import { createServerClient } from '@/utils/supabase/server';
import { createBrowserClient } from '@/utils/supabase/client';
import { Database } from '@/types/database.types';

/**
 * Trading System Types
 */
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop' | 'oco' | 'post_only';
export type OrderSide = 'buy' | 'sell';
export type OrderStatus = 'pending' | 'open' | 'partially_filled' | 'filled' | 'canceled' | 'rejected' | 'expired';
export type PositionSide = 'long' | 'short';
export type PositionType = 'spot' | 'margin' | 'futures' | 'options';
export type PositionStatus = 'open' | 'closed';

export interface OrderParams {
  farmId: string;
  exchangeConnectionId: string;
  strategyId?: string;
  agentId?: string;
  symbol: string;
  orderType: OrderType;
  side: OrderSide;
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: string;
  isPaperTrading?: boolean;
  additionalParams?: Record<string, any>;
}

export interface TradeParams {
  orderId?: string;
  farmId: string;
  exchangeConnectionId: string;
  exchangeTradeId?: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  price: number;
  commission?: number;
  commissionAsset?: string;
  realizedPnl?: number;
  executionTimestamp: Date;
  isPaperTrading?: boolean;
  rawExchangeData?: Record<string, any>;
}

export interface PositionUpdateParams {
  id?: string;
  farmId: string;
  exchangeConnectionId: string;
  strategyId?: string;
  symbol: string;
  side: PositionSide;
  quantity: number;
  entryPrice: number;
  currentPrice?: number;
  liquidationPrice?: number;
  unrealizedPnl?: number;
  realizedPnl?: number;
  marginUsed?: number;
  leverage?: number;
  status?: PositionStatus;
  isPaperTrading?: boolean;
}

export interface RiskCheckParams {
  farmId: string;
  strategyId?: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  price: number;
  riskParameterId?: string;
}

/**
 * Trading System Functions - Server Side
 */
export class TradingSystem {
  /**
   * Creates a new order
   */
  static async createOrder(params: OrderParams) {
    const supabase = await createServerClient();
    const user = await supabase.auth.getUser();
    
    if (!user.data.user) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await supabase
      .from('orders')
      .insert({
        owner_id: user.data.user.id,
        farm_id: params.farmId,
        exchange_connection_id: params.exchangeConnectionId,
        strategy_id: params.strategyId,
        agent_id: params.agentId,
        symbol: params.symbol,
        order_type: params.orderType,
        side: params.side,
        quantity: params.quantity,
        price: params.price,
        status: 'pending',
        is_paper_trading: params.isPaperTrading || false,
        metadata: params.additionalParams ? JSON.stringify(params.additionalParams) : null
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  /**
   * Fetches orders with pagination and filtering
   */
  static async getOrders(farmId: string, options?: {
    symbol?: string,
    status?: OrderStatus,
    limit?: number,
    offset?: number,
    startDate?: Date,
    endDate?: Date,
    isPaperTrading?: boolean
  }) {
    const supabase = await createServerClient();
    
    let query = supabase
      .from('orders')
      .select('*')
      .eq('farm_id', farmId);
    
    if (options?.symbol) {
      query = query.eq('symbol', options.symbol);
    }
    
    if (options?.status) {
      query = query.eq('status', options.status);
    }
    
    if (options?.isPaperTrading !== undefined) {
      query = query.eq('is_paper_trading', options.isPaperTrading);
    }
    
    if (options?.startDate) {
      query = query.gte('created_at', options.startDate.toISOString());
    }
    
    if (options?.endDate) {
      query = query.lte('created_at', options.endDate.toISOString());
    }
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }
  
  /**
   * Records a new trade
   */
  static async recordTrade(params: TradeParams) {
    const supabase = await createServerClient();
    const user = await supabase.auth.getUser();
    
    if (!user.data.user) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await supabase
      .from('trades')
      .insert({
        owner_id: user.data.user.id,
        farm_id: params.farmId,
        order_id: params.orderId,
        exchange_connection_id: params.exchangeConnectionId,
        exchange_trade_id: params.exchangeTradeId,
        symbol: params.symbol,
        side: params.side,
        quantity: params.quantity,
        price: params.price,
        commission: params.commission,
        commission_asset: params.commissionAsset,
        realized_pnl: params.realizedPnl,
        execution_timestamp: params.executionTimestamp.toISOString(),
        is_paper_trading: params.isPaperTrading || false,
        raw_exchange_data: params.rawExchangeData ? JSON.stringify(params.rawExchangeData) : null
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  /**
   * Updates or creates a position
   */
  static async updatePosition(params: PositionUpdateParams) {
    const supabase = await createServerClient();
    const user = await supabase.auth.getUser();
    
    if (!user.data.user) {
      throw new Error('User not authenticated');
    }
    
    // If position ID is provided, update an existing position
    if (params.id) {
      const { data, error } = await supabase
        .from('positions')
        .update({
          quantity: params.quantity,
          current_price: params.currentPrice,
          unrealized_pnl: params.unrealizedPnl,
          realized_pnl: params.realizedPnl || 0,
          status: params.status,
          last_update_timestamp: new Date().toISOString()
        })
        .eq('id', params.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } 
    // Otherwise check if a position exists for this symbol
    else {
      // Try to find an existing open position for this symbol
      const { data: existingPositions } = await supabase
        .from('positions')
        .select('*')
        .eq('farm_id', params.farmId)
        .eq('exchange_connection_id', params.exchangeConnectionId)
        .eq('symbol', params.symbol)
        .eq('status', 'open');
      
      if (existingPositions && existingPositions.length > 0) {
        const existingPosition = existingPositions[0];
        
        // Calculate new position details
        let newQuantity = existingPosition.quantity;
        let newEntryPrice = existingPosition.entry_price;
        let newRealizedPnl = existingPosition.realized_pnl || 0;
        let newStatus: PositionStatus = 'open';
        
        // Same direction: add to position
        if (existingPosition.side === params.side) {
          const totalValue = (existingPosition.quantity * existingPosition.entry_price) + 
                            (params.quantity * params.entryPrice);
          const totalQuantity = existingPosition.quantity + params.quantity;
          
          newQuantity = totalQuantity;
          newEntryPrice = totalValue / totalQuantity;
        } 
        // Opposite direction: reduce or close position
        else {
          const positionSize = existingPosition.quantity;
          const reducingAmount = params.quantity;
          
          // Calculate realized PNL
          const priceDiff = params.entryPrice - existingPosition.entry_price;
          const pnlFactor = existingPosition.side === 'long' ? 1 : -1;
          const reducingPnl = Math.min(positionSize, reducingAmount) * priceDiff * pnlFactor;
          
          newRealizedPnl += reducingPnl;
          
          // Reduce position
          if (positionSize > reducingAmount) {
            newQuantity = positionSize - reducingAmount;
          }
          // Close position
          else if (positionSize === reducingAmount) {
            newQuantity = 0;
            newStatus = 'closed';
          }
          // Flip position
          else {
            newQuantity = reducingAmount - positionSize;
            newEntryPrice = params.entryPrice;
          }
        }
        
        // Update the position
        const { data, error } = await supabase
          .from('positions')
          .update({
            quantity: newQuantity,
            entry_price: newEntryPrice,
            current_price: params.currentPrice,
            realized_pnl: newRealizedPnl,
            status: newStatus,
            last_update_timestamp: new Date().toISOString()
          })
          .eq('id', existingPosition.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } 
      // Create a new position
      else {
        const { data, error } = await supabase
          .from('positions')
          .insert({
            owner_id: user.data.user.id,
            farm_id: params.farmId,
            exchange_connection_id: params.exchangeConnectionId,
            strategy_id: params.strategyId,
            symbol: params.symbol,
            position_type: 'spot',
            side: params.side,
            quantity: params.quantity,
            entry_price: params.entryPrice,
            current_price: params.currentPrice || params.entryPrice,
            liquidation_price: params.liquidationPrice,
            unrealized_pnl: params.unrealizedPnl || 0,
            realized_pnl: params.realizedPnl || 0,
            margin_used: params.marginUsed || 0,
            leverage: params.leverage || 1,
            status: 'open',
            last_update_timestamp: new Date().toISOString(),
            is_paper_trading: params.isPaperTrading || false
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    }
  }
  
  /**
   * Performs a risk check for a potential trade
   */
  static async performRiskCheck(params: RiskCheckParams) {
    const supabase = await createServerClient();
    
    // Get risk parameters
    const { data: riskParams } = await supabase
      .from('risk_parameters')
      .select('*')
      .eq('farm_id', params.farmId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (!riskParams || riskParams.length === 0) {
      return {
        passed: true,
        warnings: ['No risk parameters found for this farm']
      };
    }
    
    const riskParam = riskParams[0];
    
    // Get current positions
    const { data: positions } = await supabase
      .from('positions')
      .select('*')
      .eq('farm_id', params.farmId)
      .eq('symbol', params.symbol)
      .eq('status', 'open');
    
    // Calculate current position size
    let currentPositionSize = 0;
    if (positions && positions.length > 0) {
      for (const position of positions) {
        currentPositionSize += position.quantity * (position.current_price || position.entry_price);
      }
    }
    
    // Calculate new position size
    const newPositionSize = currentPositionSize + (params.quantity * params.price);
    
    // Check position size limit
    let passed = true;
    const errors = [];
    
    if (riskParam.max_position_size && newPositionSize > riskParam.max_position_size) {
      passed = false;
      errors.push(`Position size (${newPositionSize}) exceeds maximum (${riskParam.max_position_size})`);
    }
    
    // Get daily PNL
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: trades } = await supabase
      .from('trades')
      .select('realized_pnl')
      .eq('farm_id', params.farmId)
      .gte('execution_timestamp', today.toISOString());
    
    let dailyPnl = 0;
    if (trades && trades.length > 0) {
      for (const trade of trades) {
        dailyPnl += trade.realized_pnl || 0;
      }
    }
    
    // Check daily loss limit
    if (riskParam.max_daily_loss && dailyPnl < -riskParam.max_daily_loss) {
      passed = false;
      errors.push(`Daily loss (${-dailyPnl}) exceeds maximum (${riskParam.max_daily_loss})`);
    }
    
    return {
      passed,
      errors,
      details: {
        riskParameterId: riskParam.id,
        maxPositionSize: riskParam.max_position_size,
        currentPositionSize: newPositionSize,
        maxDailyLoss: riskParam.max_daily_loss,
        currentDailyPnl: dailyPnl
      }
    };
  }
  
  /**
   * Get exchange connections for a farm
   */
  static async getExchangeConnections(farmId: string, includeSecrets = false) {
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('exchange_connections')
      .select(includeSecrets 
        ? '*' 
        : 'id, farm_id, owner_id, exchange_name, exchange_type, is_testnet, connection_status, last_connected_at, permissions, metadata, created_at, updated_at'
      )
      .eq('farm_id', farmId);
    
    if (error) throw error;
    return data;
  }
}

/**
 * Trading System Functions - Client Side
 */
export class TradingSystemClient {
  /**
   * Gets orders for the current user's farm
   */
  static async getOrders(farmId: string, options?: {
    symbol?: string,
    status?: OrderStatus,
    limit?: number,
    offset?: number,
    startDate?: Date,
    endDate?: Date,
    isPaperTrading?: boolean
  }) {
    const supabase = createBrowserClient();
    
    let query = supabase
      .from('orders')
      .select('*')
      .eq('farm_id', farmId);
    
    if (options?.symbol) {
      query = query.eq('symbol', options.symbol);
    }
    
    if (options?.status) {
      query = query.eq('status', options.status);
    }
    
    if (options?.isPaperTrading !== undefined) {
      query = query.eq('is_paper_trading', options.isPaperTrading);
    }
    
    if (options?.startDate) {
      query = query.gte('created_at', options.startDate.toISOString());
    }
    
    if (options?.endDate) {
      query = query.lte('created_at', options.endDate.toISOString());
    }
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }
  
  /**
   * Gets positions for the current user's farm
   */
  static async getPositions(farmId: string, options?: {
    symbol?: string,
    status?: PositionStatus,
    isPaperTrading?: boolean
  }) {
    const supabase = createBrowserClient();
    
    let query = supabase
      .from('positions')
      .select('*')
      .eq('farm_id', farmId);
    
    if (options?.symbol) {
      query = query.eq('symbol', options.symbol);
    }
    
    if (options?.status) {
      query = query.eq('status', options.status);
    }
    
    if (options?.isPaperTrading !== undefined) {
      query = query.eq('is_paper_trading', options.isPaperTrading);
    }
    
    const { data, error } = await query.order('updated_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }
  
  /**
   * Gets trades for the current user's farm
   */
  static async getTrades(farmId: string, options?: {
    symbol?: string,
    limit?: number,
    offset?: number,
    startDate?: Date,
    endDate?: Date,
    isPaperTrading?: boolean
  }) {
    const supabase = createBrowserClient();
    
    let query = supabase
      .from('trades')
      .select('*')
      .eq('farm_id', farmId);
    
    if (options?.symbol) {
      query = query.eq('symbol', options.symbol);
    }
    
    if (options?.isPaperTrading !== undefined) {
      query = query.eq('is_paper_trading', options.isPaperTrading);
    }
    
    if (options?.startDate) {
      query = query.gte('execution_timestamp', options.startDate.toISOString());
    }
    
    if (options?.endDate) {
      query = query.lte('execution_timestamp', options.endDate.toISOString());
    }
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }
    
    const { data, error } = await query.order('execution_timestamp', { ascending: false });
    
    if (error) throw error;
    return data;
  }
  
  /**
   * Gets risk parameters for the current user's farm
   */
  static async getRiskParameters(farmId: string, activeOnly = true) {
    const supabase = createBrowserClient();
    
    let query = supabase
      .from('risk_parameters')
      .select('*')
      .eq('farm_id', farmId);
    
    if (activeOnly) {
      query = query.eq('is_active', true);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }
  
  /**
   * Gets exchange connections for the current user's farm
   */
  static async getExchangeConnections(farmId: string) {
    const supabase = createBrowserClient();
    
    const { data, error } = await supabase
      .from('exchange_connections')
      .select('id, farm_id, owner_id, exchange_name, exchange_type, is_testnet, connection_status, last_connected_at, permissions, created_at, updated_at')
      .eq('farm_id', farmId);
    
    if (error) throw error;
    return data;
  }
}
