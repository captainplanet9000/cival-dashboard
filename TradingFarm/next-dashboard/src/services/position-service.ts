/**
 * Position Service
 * 
 * Manages trading positions with high reliability and data consistency.
 * This service is critical for autonomous agent trading and provides:
 * - Robust position tracking and updates
 * - Position lifecycle management
 * - Status validation for trading decisions
 * - Position history and metrics
 */

import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';
import { MonitoringService } from './monitoring-service';
import { ExchangeService } from './exchange-service';

// Position status types
export type PositionStatus = 'pending' | 'open' | 'partially_closed' | 'closed' | 'cancelled' | 'error';

// Position interface
export interface Position {
  id: string;
  farm_id: string;
  agent_id?: string;
  symbol: string;
  exchange: string;
  side: 'buy' | 'sell';
  size: number;
  entry_price: number;
  current_price?: number;
  take_profit?: number;
  stop_loss?: number;
  status: PositionStatus;
  open_order_id?: string;
  close_order_id?: string;
  realized_pnl?: number;
  unrealized_pnl?: number;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  execution_tags?: string[];
  metadata?: any;
}

/**
 * Position Service implementation
 */
export class PositionService {
  private exchangeService: ExchangeService;

  constructor() {
    this.exchangeService = new ExchangeService();
  }

  /**
   * Get a position by ID
   */
  async getPosition(positionId: string): Promise<Position | null> {
    try {
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .eq('id', positionId)
        .single();
      
      if (error) {
        console.error('Error fetching position:', error);
        return null;
      }
      
      return data as Position;
    } catch (error) {
      console.error('Error in getPosition:', error);
      MonitoringService.logSystemEvent(
        'system.error',
        `Failed to get position: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { position_id: positionId },
        'error'
      );
      return null;
    }
  }

  /**
   * Get open position for an agent
   */
  async getAgentOpenPosition(agentId: string): Promise<Position | null> {
    try {
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .eq('agent_id', agentId)
        .in('status', ['pending', 'open', 'partially_closed'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No position found - not an error
          return null;
        }
        console.error('Error fetching agent position:', error);
        return null;
      }
      
      return data as Position;
    } catch (error) {
      console.error('Error in getAgentOpenPosition:', error);
      return null;
    }
  }

  /**
   * Create a new position
   */
  async createPosition(
    farmId: string,
    agentId: string | undefined,
    symbol: string,
    exchange: string,
    side: 'buy' | 'sell',
    size: number,
    entryPrice: number,
    takeProfit?: number,
    stopLoss?: number,
    openOrderId?: string,
    metadata?: any
  ): Promise<Position | null> {
    try {
      const supabase = createBrowserClient();
      
      const position = {
        farm_id: farmId,
        agent_id: agentId,
        symbol,
        exchange,
        side,
        size,
        entry_price: entryPrice,
        current_price: entryPrice,
        take_profit: takeProfit,
        stop_loss: stopLoss,
        status: 'pending' as const,
        open_order_id: openOrderId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        execution_tags: ['autonomous'],
        metadata
      };
      
      const { data, error } = await supabase
        .from('positions')
        .insert(position)
        .select()
        .single();
      
      if (error) {
        console.error('Error creating position:', error);
        
        MonitoringService.logSystemEvent(
          'system.error',
          `Failed to create position for ${symbol}`,
          { 
            error: error.message, 
            agent_id: agentId,
            symbol,
            side 
          },
          'error'
        );
        
        return null;
      }
      
      // If this is an agent position, update the agent's current_position_id
      if (agentId) {
        await this.updateAgentPosition(agentId, data.id);
      }
      
      // Log position creation
      MonitoringService.logSystemEvent(
        'system.info',
        `Position created for ${symbol}`,
        { 
          position_id: data.id,
          agent_id: agentId,
          symbol,
          side,
          size,
          entry_price: entryPrice
        },
        'info'
      );
      
      return data as Position;
    } catch (error) {
      console.error('Error in createPosition:', error);
      
      MonitoringService.logSystemEvent(
        'system.error',
        `Exception creating position: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { 
          agent_id: agentId,
          symbol,
          side
        },
        'error'
      );
      
      return null;
    }
  }

  /**
   * Update position status
   */
  async updatePositionStatus(
    positionId: string,
    status: PositionStatus,
    updates: Partial<Position> = {}
  ): Promise<boolean> {
    try {
      const supabase = createBrowserClient();
      
      const updateData = {
        status,
        updated_at: new Date().toISOString(),
        ...updates
      };
      
      // Add closed_at timestamp if we're closing the position
      if (status === 'closed') {
        updateData.closed_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('positions')
        .update(updateData)
        .eq('id', positionId);
      
      if (error) {
        console.error('Error updating position status:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in updatePositionStatus:', error);
      return false;
    }
  }

  /**
   * Close a position
   */
  async closePosition(
    positionId: string,
    closePrice: number,
    closeOrderId?: string
  ): Promise<boolean> {
    try {
      const position = await this.getPosition(positionId);
      if (!position) {
        throw new Error(`Position ${positionId} not found`);
      }
      
      if (position.status === 'closed') {
        return true; // Already closed
      }
      
      // Calculate realized PnL
      const realizedPnl = this.calculatePnl(
        position.side,
        position.entry_price,
        closePrice,
        position.size
      );
      
      const success = await this.updatePositionStatus(positionId, 'closed', {
        close_order_id: closeOrderId,
        realized_pnl: realizedPnl,
        current_price: closePrice
      });
      
      if (success && position.agent_id) {
        // Clear the agent's current position reference
        await this.clearAgentPosition(position.agent_id);
        
        // Log position closing
        MonitoringService.logAgentEvent(
          position.agent_id,
          'agent.success',
          `Position closed for ${position.symbol}`,
          {
            position_id: positionId,
            realized_pnl: realizedPnl,
            close_price: closePrice,
            position_side: position.side
          },
          realizedPnl > 0 ? 'info' : 'warning'
        );
      }
      
      return success;
    } catch (error) {
      console.error('Error in closePosition:', error);
      
      MonitoringService.logSystemEvent(
        'system.error',
        `Failed to close position: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { position_id: positionId },
        'error'
      );
      
      return false;
    }
  }

  /**
   * Get all open positions for a farm
   */
  async getFarmOpenPositions(farmId: string): Promise<Position[]> {
    try {
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .eq('farm_id', farmId)
        .in('status', ['pending', 'open', 'partially_closed'])
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching farm positions:', error);
        return [];
      }
      
      return data as Position[];
    } catch (error) {
      console.error('Error in getFarmOpenPositions:', error);
      return [];
    }
  }

  /**
   * Update the current market price for a position
   */
  async updatePositionPrice(positionId: string, currentPrice: number): Promise<boolean> {
    try {
      const supabase = createBrowserClient();
      
      // First get the position to calculate unrealized PnL
      const { data: position, error: fetchError } = await supabase
        .from('positions')
        .select('*')
        .eq('id', positionId)
        .single();
      
      if (fetchError || !position) {
        console.error('Error fetching position for price update:', fetchError);
        return false;
      }
      
      // Calculate unrealized PnL
      const unrealizedPnl = this.calculatePnl(
        position.side,
        position.entry_price,
        currentPrice,
        position.size
      );
      
      // Update the position
      const { error } = await supabase
        .from('positions')
        .update({
          current_price: currentPrice,
          unrealized_pnl: unrealizedPnl,
          updated_at: new Date().toISOString()
        })
        .eq('id', positionId);
      
      if (error) {
        console.error('Error updating position price:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in updatePositionPrice:', error);
      return false;
    }
  }

  /**
   * Check if stop loss or take profit has been triggered
   */
  async checkTakeProfitStopLoss(positionId: string): Promise<{ triggered: boolean; action: 'take_profit' | 'stop_loss' | null }> {
    try {
      const position = await this.getPosition(positionId);
      if (!position || position.status !== 'open') {
        return { triggered: false, action: null };
      }
      
      // Ensure we have the current price
      if (!position.current_price) {
        const latestPrice = await this.exchangeService.getLatestPrice(position.symbol, position.exchange);
        if (!latestPrice) {
          return { triggered: false, action: null };
        }
        
        await this.updatePositionPrice(positionId, latestPrice);
        position.current_price = latestPrice;
      }
      
      // Check for take profit trigger
      if (position.take_profit && (
        (position.side === 'buy' && position.current_price >= position.take_profit) ||
        (position.side === 'sell' && position.current_price <= position.take_profit)
      )) {
        return { triggered: true, action: 'take_profit' };
      }
      
      // Check for stop loss trigger
      if (position.stop_loss && (
        (position.side === 'buy' && position.current_price <= position.stop_loss) ||
        (position.side === 'sell' && position.current_price >= position.stop_loss)
      )) {
        return { triggered: true, action: 'stop_loss' };
      }
      
      return { triggered: false, action: null };
    } catch (error) {
      console.error('Error checking TP/SL:', error);
      return { triggered: false, action: null };
    }
  }

  /**
   * Update the agent's current position ID
   */
  private async updateAgentPosition(agentId: string, positionId: string): Promise<boolean> {
    try {
      const supabase = createBrowserClient();
      
      const { error } = await supabase
        .from('elizaos_agents')
        .update({
          current_position_id: positionId,
          updated_at: new Date().toISOString()
        })
        .eq('id', agentId);
      
      if (error) {
        console.error('Error updating agent position reference:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in updateAgentPosition:', error);
      return false;
    }
  }

  /**
   * Clear the agent's current position ID (when position is closed)
   */
  private async clearAgentPosition(agentId: string): Promise<boolean> {
    try {
      const supabase = createBrowserClient();
      
      const { error } = await supabase
        .from('elizaos_agents')
        .update({
          current_position_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', agentId);
      
      if (error) {
        console.error('Error clearing agent position reference:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in clearAgentPosition:', error);
      return false;
    }
  }

  /**
   * Calculate PnL for a position
   */
  private calculatePnl(
    side: 'buy' | 'sell',
    entryPrice: number,
    currentPrice: number,
    size: number
  ): number {
    if (side === 'buy') {
      // For long positions, profit = (current - entry) * size
      return (currentPrice - entryPrice) * size;
    } else {
      // For short positions, profit = (entry - current) * size
      return (entryPrice - currentPrice) * size;
    }
  }
}

// Export singleton instance
export const positionService = new PositionService();

export default positionService;
