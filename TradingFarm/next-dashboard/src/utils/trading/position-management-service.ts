/**
 * Position Management Service
 * 
 * This service manages trading positions, including:
 * - Position creation and tracking
 * - Position updates and PnL calculations
 * - Stop loss and take profit management
 * - Position closing
 */

import { createServerClient } from '@/utils/supabase/server';
import { createBrowserClient } from '@/utils/supabase/client';
import { exchangeService } from '@/utils/exchange/exchange-service';
import { marketDataService } from '@/utils/exchange/market-data-service';
import { orderManagementService, Order, OrderRequest } from './order-management-service';

export type PositionSide = 'long' | 'short';
export type PositionStatus = 'open' | 'closed' | 'liquidated';

export interface Position {
  id: number;
  user_id: string;
  exchange_credential_id: number;
  agent_id?: number;
  symbol: string;
  position_size: number;
  entry_price: number;
  current_price: number;
  unrealized_pnl: number;
  realized_pnl: number;
  side: PositionSide;
  leverage: number;
  liquidation_price?: number;
  margin_used?: number;
  status: PositionStatus;
  stop_loss?: number;
  take_profit?: number;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  metadata?: Record<string, any>;
}

export interface PositionRequest {
  symbol: string;
  side: PositionSide;
  position_size: number;
  entry_price?: number; // If not provided, use market price
  leverage?: number;
  stop_loss?: number;
  take_profit?: number;
  exchange_credential_id: number;
  agent_id?: number;
  metadata?: Record<string, any>;
}

export interface PositionUpdateRequest {
  position_size?: number;
  current_price?: number;
  stop_loss?: number;
  take_profit?: number;
  leverage?: number;
  metadata?: Record<string, any>;
}

export interface PositionCloseRequest {
  exit_price?: number; // If not provided, use market price
  close_size?: number; // If not provided, close entire position
  metadata?: Record<string, any>;
}

export interface PnLCalculation {
  unrealized_pnl: number;
  unrealized_pnl_percent: number;
  realized_pnl: number;
  realized_pnl_percent: number;
  total_pnl: number;
  total_pnl_percent: number;
}

class PositionManagementService {
  private static instance: PositionManagementService;
  private positionUpdateSubscriptions: Map<string, any> = new Map();
  private stopLossOrders: Map<string, number> = new Map(); // positionId -> orderId
  private takeProfitOrders: Map<string, number> = new Map(); // positionId -> orderId

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  /**
   * Get singleton instance of PositionManagementService
   */
  public static getInstance(): PositionManagementService {
    if (!PositionManagementService.instance) {
      PositionManagementService.instance = new PositionManagementService();
    }
    return PositionManagementService.instance;
  }

  /**
   * Open a new position
   * @param positionRequest Position request details
   * @param userId User ID (for server-side use)
   * @returns Created position
   */
  public async openPosition(positionRequest: PositionRequest, userId?: string): Promise<Position> {
    try {
      // Get the current market price if entry price not provided
      if (!positionRequest.entry_price) {
        const marketData = await marketDataService.getMarketData(positionRequest.symbol);
        if (!marketData || marketData.length === 0) {
          throw new Error(`Could not get market data for ${positionRequest.symbol}`);
        }
        positionRequest.entry_price = marketData[0].last_price;
      }

      // Set default leverage if not provided
      if (!positionRequest.leverage || positionRequest.leverage < 1) {
        positionRequest.leverage = 1;
      }

      // Calculate margin used
      const marginUsed = positionRequest.position_size * positionRequest.entry_price / positionRequest.leverage;

      // Calculate liquidation price (simplified)
      // For a real implementation, this would depend on the exchange's specific formula
      let liquidationPrice: number | undefined;
      if (positionRequest.leverage > 1) {
        const liquidationThreshold = 0.8 / positionRequest.leverage; // 80% of margin
        if (positionRequest.side === 'long') {
          liquidationPrice = positionRequest.entry_price * (1 - liquidationThreshold);
        } else {
          liquidationPrice = positionRequest.entry_price * (1 + liquidationThreshold);
        }
      }

      // Create the position in the database
      const supabase = userId ? await createServerClient() : createBrowserClient();
      
      const { data: position, error } = await supabase
        .from('positions')
        .insert({
          user_id: userId || (await supabase.auth.getUser()).data.user?.id,
          exchange_credential_id: positionRequest.exchange_credential_id,
          agent_id: positionRequest.agent_id,
          symbol: positionRequest.symbol,
          position_size: positionRequest.position_size,
          entry_price: positionRequest.entry_price,
          current_price: positionRequest.entry_price,
          unrealized_pnl: 0,
          realized_pnl: 0,
          side: positionRequest.side,
          leverage: positionRequest.leverage,
          liquidation_price: liquidationPrice,
          margin_used: marginUsed,
          status: 'open',
          stop_loss: positionRequest.stop_loss,
          take_profit: positionRequest.take_profit,
          metadata: positionRequest.metadata
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create position: ${error.message}`);
      }

      // Set up stop loss and take profit orders if specified
      await this.setupStopLossAndTakeProfitOrders(position, userId);

      // Subscribe to position updates
      this.subscribeToPositionUpdates(position.id);

      return position;
    } catch (error: any) {
      throw new Error(`Failed to open position: ${error.message}`);
    }
  }

  /**
   * Get a position by ID
   * @param positionId Position ID
   * @param userId User ID (for server-side use)
   * @returns Position details
   */
  public async getPosition(positionId: number, userId?: string): Promise<Position> {
    try {
      const supabase = userId ? await createServerClient() : createBrowserClient();
      
      const { data: position, error } = await supabase
        .from('positions')
        .select('*')
        .eq('id', positionId)
        .single();
      
      if (error || !position) {
        throw new Error(`Position not found: ${error?.message || 'Not found'}`);
      }

      // Update the position with current market price and PnL
      return await this.updatePositionPriceAndPnL(position, userId);
    } catch (error: any) {
      throw new Error(`Failed to get position: ${error.message}`);
    }
  }

  /**
   * Get all positions for a user
   * @param userId User ID (for server-side use)
   * @param filters Optional filters (status, symbol, etc.)
   * @returns List of positions
   */
  public async getPositions(
    userId?: string,
    filters?: { status?: PositionStatus; symbol?: string; agentId?: number }
  ): Promise<Position[]> {
    try {
      const supabase = userId ? await createServerClient() : createBrowserClient();
      
      let query = supabase
        .from('positions')
        .select('*');
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters?.symbol) {
        query = query.eq('symbol', filters.symbol);
      }
      
      if (filters?.agentId) {
        query = query.eq('agent_id', filters.agentId);
      }
      
      const { data: positions, error } = await query;
      
      if (error) {
        throw new Error(`Failed to get positions: ${error.message}`);
      }

      // Update positions with current prices and PnL
      const updatedPositions = await Promise.all(
        (positions || []).map(position => this.updatePositionPriceAndPnL(position, userId))
      );

      return updatedPositions;
    } catch (error: any) {
      throw new Error(`Failed to get positions: ${error.message}`);
    }
  }

  /**
   * Update a position
   * @param positionId Position ID to update
   * @param updateRequest Update request details
   * @param userId User ID (for server-side use)
   * @returns Updated position
   */
  public async updatePosition(
    positionId: number,
    updateRequest: PositionUpdateRequest,
    userId?: string
  ): Promise<Position> {
    try {
      // Get the current position
      const currentPosition = await this.getPosition(positionId, userId);
      
      // Check if position is already closed
      if (currentPosition.status !== 'open') {
        throw new Error(`Cannot update a ${currentPosition.status} position`);
      }

      // Build update object
      const updates: any = { ...updateRequest };
      
      // If position size changed, recalculate margin and liquidation
      if (updateRequest.position_size && updateRequest.position_size !== currentPosition.position_size) {
        const leverage = updateRequest.leverage || currentPosition.leverage;
        
        // Calculate new margin used
        updates.margin_used = updateRequest.position_size * currentPosition.entry_price / leverage;
        
        // Recalculate liquidation price
        if (leverage > 1) {
          const liquidationThreshold = 0.8 / leverage; // 80% of margin
          if (currentPosition.side === 'long') {
            updates.liquidation_price = currentPosition.entry_price * (1 - liquidationThreshold);
          } else {
            updates.liquidation_price = currentPosition.entry_price * (1 + liquidationThreshold);
          }
        }
      }

      // Update the position in the database
      const supabase = userId ? await createServerClient() : createBrowserClient();
      
      const { data: updatedPosition, error } = await supabase
        .from('positions')
        .update(updates)
        .eq('id', positionId)
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to update position: ${error.message}`);
      }

      // If stop loss or take profit was updated, update the orders
      if (updateRequest.stop_loss !== undefined || updateRequest.take_profit !== undefined) {
        await this.updateStopLossAndTakeProfitOrders(updatedPosition, userId);
      }

      // Update with current market price and PnL
      return await this.updatePositionPriceAndPnL(updatedPosition, userId);
    } catch (error: any) {
      throw new Error(`Failed to update position: ${error.message}`);
    }
  }

  /**
   * Close a position (fully or partially)
   * @param positionId Position ID to close
   * @param closeRequest Close request details
   * @param userId User ID (for server-side use)
   * @returns Closed position details
   */
  public async closePosition(
    positionId: number,
    closeRequest: PositionCloseRequest = {},
    userId?: string
  ): Promise<Position> {
    try {
      // Get the current position
      const position = await this.getPosition(positionId, userId);
      
      // Check if position is already closed
      if (position.status !== 'open') {
        throw new Error(`Cannot close a ${position.status} position`);
      }

      // Get exit price (either provided or current market price)
      let exitPrice = closeRequest.exit_price;
      if (!exitPrice) {
        const marketData = await marketDataService.getMarketData(position.symbol);
        if (!marketData || marketData.length === 0) {
          throw new Error(`Could not get market data for ${position.symbol}`);
        }
        exitPrice = marketData[0].last_price;
      }

      // Determine close size (either provided or full position)
      const closeSize = closeRequest.close_size || position.position_size;
      
      // Calculate realized PnL
      let realizedPnL = 0;
      if (position.side === 'long') {
        realizedPnL = closeSize * (exitPrice - position.entry_price);
      } else { // short
        realizedPnL = closeSize * (position.entry_price - exitPrice);
      }

      // Adjust for leverage
      realizedPnL *= position.leverage;

      const supabase = userId ? await createServerClient() : createBrowserClient();
      
      // If partial close
      if (closeSize < position.position_size) {
        // Update the position
        const remainingSize = position.position_size - closeSize;
        const { data: updatedPosition, error } = await supabase
          .from('positions')
          .update({
            position_size: remainingSize,
            realized_pnl: position.realized_pnl + realizedPnL,
            margin_used: remainingSize * position.entry_price / position.leverage,
            metadata: {
              ...position.metadata,
              ...closeRequest.metadata,
              partial_closes: [
                ...(position.metadata?.partial_closes || []),
                {
                  close_size: closeSize,
                  exit_price: exitPrice,
                  realized_pnl: realizedPnL,
                  close_time: new Date().toISOString()
                }
              ]
            }
          })
          .eq('id', positionId)
          .select()
          .single();
        
        if (error) {
          throw new Error(`Failed to update position: ${error.message}`);
        }

        // Update stop loss and take profit orders for the reduced position
        await this.updateStopLossAndTakeProfitOrders(updatedPosition, userId);
        
        return updatedPosition;
      } else {
        // Full close
        // Cancel any existing stop loss and take profit orders
        await this.cancelStopLossAndTakeProfitOrders(position.id, userId);
        
        // Update the position to closed
        const { data: closedPosition, error } = await supabase
          .from('positions')
          .update({
            position_size: 0,
            realized_pnl: position.realized_pnl + realizedPnL,
            unrealized_pnl: 0,
            status: 'closed',
            closed_at: new Date().toISOString(),
            metadata: {
              ...position.metadata,
              ...closeRequest.metadata,
              exit_price: exitPrice,
              final_realized_pnl: position.realized_pnl + realizedPnL
            }
          })
          .eq('id', positionId)
          .select()
          .single();
        
        if (error) {
          throw new Error(`Failed to close position: ${error.message}`);
        }
        
        // Unsubscribe from position updates
        this.unsubscribeFromPositionUpdates(position.id);
        
        return closedPosition;
      }
    } catch (error: any) {
      throw new Error(`Failed to close position: ${error.message}`);
    }
  }

  /**
   * Update a position's price and PnL calculations
   * @param position Position to update
   * @param userId User ID (for server-side use)
   * @returns Updated position
   */
  private async updatePositionPriceAndPnL(position: Position, userId?: string): Promise<Position> {
    try {
      // Skip for closed positions
      if (position.status !== 'open') {
        return position;
      }

      // Get current market price
      const marketData = await marketDataService.getMarketData(position.symbol);
      if (!marketData || marketData.length === 0) {
        return position; // Return unchanged if no market data
      }

      const currentPrice = marketData[0].last_price;
      
      // Calculate unrealized PnL
      let unrealizedPnL = 0;
      if (position.side === 'long') {
        unrealizedPnL = position.position_size * (currentPrice - position.entry_price);
      } else { // short
        unrealizedPnL = position.position_size * (position.entry_price - currentPrice);
      }

      // Adjust for leverage
      unrealizedPnL *= position.leverage;

      // Check for stop loss or take profit hit
      let statusUpdate = {};
      
      // Only perform these checks for open positions with price updates
      if (position.status === 'open' && currentPrice !== position.current_price) {
        // Stop loss check
        if (position.stop_loss !== null && position.stop_loss !== undefined) {
          if ((position.side === 'long' && currentPrice <= position.stop_loss) ||
              (position.side === 'short' && currentPrice >= position.stop_loss)) {
            // Stop loss triggered
            return await this.closePosition(position.id, { exit_price: position.stop_loss, metadata: { closed_by: 'stop_loss' } }, userId);
          }
        }
        
        // Take profit check
        if (position.take_profit !== null && position.take_profit !== undefined) {
          if ((position.side === 'long' && currentPrice >= position.take_profit) ||
              (position.side === 'short' && currentPrice <= position.take_profit)) {
            // Take profit triggered
            return await this.closePosition(position.id, { exit_price: position.take_profit, metadata: { closed_by: 'take_profit' } }, userId);
          }
        }
        
        // Liquidation check for leveraged positions
        if (position.leverage > 1 && position.liquidation_price !== null && position.liquidation_price !== undefined) {
          if ((position.side === 'long' && currentPrice <= position.liquidation_price) ||
              (position.side === 'short' && currentPrice >= position.liquidation_price)) {
            // Position liquidated
            const supabase = userId ? await createServerClient() : createBrowserClient();
            
            await supabase
              .from('positions')
              .update({
                current_price: currentPrice,
                unrealized_pnl: 0,
                realized_pnl: -position.margin_used!, // Full loss of margin
                status: 'liquidated',
                closed_at: new Date().toISOString(),
                metadata: {
                  ...position.metadata,
                  liquidation_price: position.liquidation_price,
                  liquidation_time: new Date().toISOString()
                }
              })
              .eq('id', position.id);
              
            // Cancel any stop loss and take profit orders
            await this.cancelStopLossAndTakeProfitOrders(position.id, userId);
            
            // Unsubscribe from position updates
            this.unsubscribeFromPositionUpdates(position.id);
            
            // Log risk event
            await this.logRiskEvent({
              user_id: position.user_id,
              event_type: 'position_liquidated',
              position_id: position.id,
              symbol: position.symbol,
              original_value: position.margin_used || 0,
              new_value: 0,
              description: `Position liquidated at ${currentPrice}`,
              severity: 'critical'
            }, userId);
            
            // Return updated position
            return await this.getPosition(position.id, userId);
          }
        }
      }

      // Update the position if price changed
      if (currentPrice !== position.current_price) {
        const supabase = userId ? await createServerClient() : createBrowserClient();
        
        const { data: updatedPosition, error } = await supabase
          .from('positions')
          .update({
            current_price: currentPrice,
            unrealized_pnl: unrealizedPnL,
            ...statusUpdate
          })
          .eq('id', position.id)
          .select()
          .single();
        
        if (!error && updatedPosition) {
          return updatedPosition;
        }
      }

      // If no update was made, return the position with calculated PnL
      return {
        ...position,
        current_price: currentPrice,
        unrealized_pnl: unrealizedPnL
      };
    } catch (error: any) {
      console.error(`Error updating position price and PnL: ${error.message}`);
      return position; // Return original position on error
    }
  }

  /**
   * Calculate PnL for a position
   * @param position Position to calculate PnL for
   * @returns PnL calculation result
   */
  public calculatePnL(position: Position): PnLCalculation {
    const totalInvestment = position.position_size * position.entry_price;
    
    const unrealizedPnLPercent = totalInvestment > 0
      ? (position.unrealized_pnl / totalInvestment) * 100
      : 0;
      
    const realizedPnLPercent = totalInvestment > 0
      ? (position.realized_pnl / totalInvestment) * 100
      : 0;
      
    const totalPnL = position.unrealized_pnl + position.realized_pnl;
    const totalPnLPercent = totalInvestment > 0
      ? (totalPnL / totalInvestment) * 100
      : 0;
      
    return {
      unrealized_pnl: position.unrealized_pnl,
      unrealized_pnl_percent: unrealizedPnLPercent,
      realized_pnl: position.realized_pnl,
      realized_pnl_percent: realizedPnLPercent,
      total_pnl: totalPnL,
      total_pnl_percent: totalPnLPercent
    };
  }

  /**
   * Subscribe to real-time position updates
   * @param positionId Position ID to subscribe to
   * @param onUpdate Optional callback for updates
   */
  public subscribeToPositionUpdates(positionId: number, onUpdate?: (position: Position) => void): void {
    if (this.positionUpdateSubscriptions.has(positionId.toString())) {
      return; // Already subscribed
    }

    const supabase = createBrowserClient();
    
    const subscription = supabase
      .channel(`position_${positionId}`)
      .on('postgres_changes', 
          { event: 'UPDATE', schema: 'public', table: 'positions', filter: `id=eq.${positionId}` }, 
          (payload) => {
            const updatedPosition = payload.new as Position;
            if (onUpdate) {
              onUpdate(updatedPosition);
            }
          })
      .subscribe();

    this.positionUpdateSubscriptions.set(positionId.toString(), subscription);
  }

  /**
   * Unsubscribe from position updates
   * @param positionId Position ID to unsubscribe from
   */
  public unsubscribeFromPositionUpdates(positionId: number): void {
    const subscriptionKey = positionId.toString();
    if (this.positionUpdateSubscriptions.has(subscriptionKey)) {
      const subscription = this.positionUpdateSubscriptions.get(subscriptionKey);
      const supabase = createBrowserClient();
      supabase.removeChannel(subscription);
      this.positionUpdateSubscriptions.delete(subscriptionKey);
    }
  }

  /**
   * Setup stop loss and take profit orders for a position
   * @param position Position to setup orders for
   * @param userId User ID (for server-side use)
   */
  private async setupStopLossAndTakeProfitOrders(position: Position, userId?: string): Promise<void> {
    try {
      // Setup stop loss order if specified
      if (position.stop_loss !== null && position.stop_loss !== undefined) {
        const stopLossOrder: OrderRequest = {
          symbol: position.symbol,
          side: position.side === 'long' ? 'sell' : 'buy',
          type: 'stop_market',
          quantity: position.position_size,
          stopPrice: position.stop_loss,
          exchangeCredentialId: position.exchange_credential_id,
          agentId: position.agent_id,
          isReduceOnly: true,
          metadata: {
            positionId: position.id,
            orderType: 'stop_loss'
          }
        };
        
        const order = await orderManagementService.createOrder(stopLossOrder, userId);
        this.stopLossOrders.set(position.id.toString(), order.id);
      }
      
      // Setup take profit order if specified
      if (position.take_profit !== null && position.take_profit !== undefined) {
        const takeProfitOrder: OrderRequest = {
          symbol: position.symbol,
          side: position.side === 'long' ? 'sell' : 'buy',
          type: 'limit',
          quantity: position.position_size,
          price: position.take_profit,
          exchangeCredentialId: position.exchange_credential_id,
          agentId: position.agent_id,
          isReduceOnly: true,
          metadata: {
            positionId: position.id,
            orderType: 'take_profit'
          }
        };
        
        const order = await orderManagementService.createOrder(takeProfitOrder, userId);
        this.takeProfitOrders.set(position.id.toString(), order.id);
      }
    } catch (error: any) {
      console.error(`Error setting up stop loss and take profit orders: ${error.message}`);
    }
  }

  /**
   * Update stop loss and take profit orders for a position
   * @param position Position to update orders for
   * @param userId User ID (for server-side use)
   */
  private async updateStopLossAndTakeProfitOrders(position: Position, userId?: string): Promise<void> {
    try {
      // Cancel existing orders
      await this.cancelStopLossAndTakeProfitOrders(position.id, userId);
      
      // Setup new orders
      await this.setupStopLossAndTakeProfitOrders(position, userId);
    } catch (error: any) {
      console.error(`Error updating stop loss and take profit orders: ${error.message}`);
    }
  }

  /**
   * Cancel stop loss and take profit orders for a position
   * @param positionId Position ID to cancel orders for
   * @param userId User ID (for server-side use)
   */
  private async cancelStopLossAndTakeProfitOrders(positionId: number, userId?: string): Promise<void> {
    try {
      const positionIdStr = positionId.toString();
      
      // Cancel stop loss order if exists
      if (this.stopLossOrders.has(positionIdStr)) {
        const orderId = this.stopLossOrders.get(positionIdStr)!;
        try {
          await orderManagementService.cancelOrder(orderId, userId);
        } catch (error) {
          // Ignore errors, order may already be filled or canceled
        }
        this.stopLossOrders.delete(positionIdStr);
      }
      
      // Cancel take profit order if exists
      if (this.takeProfitOrders.has(positionIdStr)) {
        const orderId = this.takeProfitOrders.get(positionIdStr)!;
        try {
          await orderManagementService.cancelOrder(orderId, userId);
        } catch (error) {
          // Ignore errors, order may already be filled or canceled
        }
        this.takeProfitOrders.delete(positionIdStr);
      }
    } catch (error: any) {
      console.error(`Error canceling stop loss and take profit orders: ${error.message}`);
    }
  }

  /**
   * Log a risk event
   * @param eventData Risk event data
   * @param userId User ID (for server-side use)
   */
  private async logRiskEvent(
    eventData: {
      user_id: string;
      event_type: string;
      position_id?: number;
      symbol?: string;
      original_value?: number;
      new_value?: number;
      description?: string;
      severity: 'info' | 'warning' | 'critical';
      metadata?: Record<string, any>;
    },
    userId?: string
  ): Promise<void> {
    try {
      const supabase = userId ? await createServerClient() : createBrowserClient();
      
      await supabase
        .from('risk_events')
        .insert({
          user_id: eventData.user_id,
          event_type: eventData.event_type,
          position_id: eventData.position_id,
          symbol: eventData.symbol,
          original_value: eventData.original_value,
          new_value: eventData.new_value,
          description: eventData.description,
          severity: eventData.severity,
          metadata: eventData.metadata
        });
    } catch (error: any) {
      console.error(`Error logging risk event: ${error.message}`);
    }
  }
}

// Export singleton instance
export const positionManagementService = PositionManagementService.getInstance();
