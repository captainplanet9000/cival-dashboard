/**
 * Position Tracker
 * 
 * Tracks and manages positions, calculates P&L,
 * and provides real-time portfolio visibility.
 */

import { Order, Position, Balance } from '@/types/orders';
import { createServerClient } from '@/utils/supabase/server';
import { Database } from '@/types/database.types';

interface TradeRecord {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  price: number;
  quantity: number;
  timestamp: Date;
  fee: number;
  orderId: string;
}

interface PositionState {
  symbol: string;
  avgEntryPrice: number;
  quantity: number;
  side: 'long' | 'short' | 'flat';
  unrealizedPnl: number;
  realizedPnl: number;
  markPrice: number;
  leverage: number;
  liquidationPrice?: number;
  marginType: 'isolated' | 'cross';
  lastUpdated: Date;
  trades: TradeRecord[];
}

export class PositionTracker {
  private positions: Map<string, PositionState> = new Map();
  private farmId: string;
  private strategyId: string;
  private paperBalances: Map<string, number> = new Map();
  
  constructor(
    farmId: string, 
    strategyId: string,
    initialPaperFunds?: number
  ) {
    this.farmId = farmId;
    this.strategyId = strategyId;
    
    // Initialize paper trading account if needed
    if (initialPaperFunds) {
      this.paperBalances.set('USDT', initialPaperFunds);
    }
  }
  
  /**
   * Load position data from the database
   */
  async loadPositionsFromDB(supabase: ReturnType<typeof createServerClient>) {
    try {
      // Get positions from DB
      const { data: positionData, error } = await supabase
        .from('positions')
        .select('*')
        .eq('farm_id', this.farmId)
        .eq('strategy_id', this.strategyId);
      
      if (error) throw error;
      
      // Load into memory
      for (const dbPosition of positionData) {
        if (dbPosition.quantity === 0) continue; // Skip flat positions
        
        const position: PositionState = {
          symbol: dbPosition.symbol,
          avgEntryPrice: dbPosition.entry_price,
          quantity: dbPosition.quantity,
          side: dbPosition.side as 'long' | 'short' | 'flat',
          unrealizedPnl: dbPosition.unrealized_pnl,
          realizedPnl: dbPosition.realized_pnl || 0,
          markPrice: dbPosition.current_price,
          leverage: dbPosition.leverage || 1,
          liquidationPrice: dbPosition.liquidation_price,
          marginType: (dbPosition.margin_type as 'isolated' | 'cross') || 'cross',
          lastUpdated: new Date(dbPosition.updated_at),
          trades: []
        };
        
        this.positions.set(dbPosition.symbol, position);
      }
      
      // Load historical trades if needed for each position
      const positionSymbols = Array.from(this.positions.keys());
      
      if (positionSymbols.length > 0) {
        const { data: trades, error: tradesError } = await supabase
          .from('trades')
          .select('*')
          .eq('farm_id', this.farmId)
          .eq('strategy_id', this.strategyId)
          .in('symbol', positionSymbols);
        
        if (!tradesError && trades) {
          // Add trades to positions
          for (const trade of trades) {
            const position = this.positions.get(trade.symbol);
            if (position) {
              position.trades.push({
                id: trade.id,
                symbol: trade.symbol,
                side: trade.side as 'buy' | 'sell',
                price: trade.price,
                quantity: trade.quantity,
                timestamp: new Date(trade.executed_at),
                fee: trade.fee,
                orderId: trade.order_id
              });
            }
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Failed to load positions from DB', error);
      return false;
    }
  }
  
  /**
   * Update a position based on an order execution
   */
  async updatePosition(order: Order): Promise<Position> {
    // Skip if order not filled or partially filled
    if (order.status !== 'filled' && order.status !== 'partially_filled') {
      throw new Error('Cannot update position with unfilled order');
    }
    
    // Get existing position or create new one
    let position = this.positions.get(order.symbol);
    
    if (!position) {
      position = {
        symbol: order.symbol,
        avgEntryPrice: 0,
        quantity: 0,
        side: 'flat',
        unrealizedPnl: 0,
        realizedPnl: 0,
        markPrice: order.avgPrice || order.price || 0,
        leverage: 1,
        marginType: 'cross',
        lastUpdated: new Date(),
        trades: []
      };
      this.positions.set(order.symbol, position);
    }
    
    // Record the trade
    const trade: TradeRecord = {
      id: `${order.id}_${Date.now()}`,
      symbol: order.symbol,
      side: order.side,
      price: order.avgPrice || order.price || 0,
      quantity: order.filledQuantity,
      timestamp: order.updatedAt,
      fee: 0, // Fees would come from a separate API call or calculation
      orderId: order.id
    };
    
    position.trades.push(trade);
    
    // Update position data
    const currentQty = position.quantity;
    const orderEffect = order.side === 'buy' ? order.filledQuantity : -order.filledQuantity;
    const newQty = currentQty + orderEffect;
    
    // Determine if this is a new position, add to position, reduce position, or flip position
    if (currentQty === 0) {
      // New position
      position.avgEntryPrice = trade.price;
      position.quantity = newQty;
      position.side = newQty > 0 ? 'long' : 'short';
    } else if ((currentQty > 0 && newQty > 0) || (currentQty < 0 && newQty < 0)) {
      // Adding to existing position - update average entry price
      const currentValue = Math.abs(currentQty) * position.avgEntryPrice;
      const newValue = order.filledQuantity * trade.price;
      position.avgEntryPrice = (currentValue + newValue) / Math.abs(newQty);
      position.quantity = newQty;
    } else if ((currentQty > 0 && newQty <= 0) || (currentQty < 0 && newQty >= 0)) {
      // Reducing or closing position - calculate realized PnL
      const closedQty = Math.min(Math.abs(currentQty), Math.abs(orderEffect));
      const priceDiff = currentQty > 0 
        ? trade.price - position.avgEntryPrice 
        : position.avgEntryPrice - trade.price;
      
      position.realizedPnl += closedQty * priceDiff;
      
      // Update paper balances for paper trading
      if (this.paperBalances.size > 0) {
        const profit = closedQty * priceDiff;
        const balance = this.paperBalances.get('USDT') || 0;
        this.paperBalances.set('USDT', balance + profit);
      }
      
      if (newQty === 0) {
        // Position is now closed
        position.quantity = 0;
        position.side = 'flat';
        position.avgEntryPrice = 0;
        position.unrealizedPnl = 0;
      } else {
        // Position flipped from long to short or vice versa
        position.quantity = newQty;
        position.side = newQty > 0 ? 'long' : 'short';
        position.avgEntryPrice = trade.price;
      }
    }
    
    // Update mark price
    position.markPrice = trade.price;
    position.lastUpdated = new Date();
    
    // Calculate unrealized PnL
    if (position.quantity !== 0) {
      const priceDiff = position.side === 'long'
        ? position.markPrice - position.avgEntryPrice
        : position.avgEntryPrice - position.markPrice;
      
      position.unrealizedPnl = position.quantity * priceDiff;
    }
    
    // Update paper balances if closing/reducing
    if (this.paperBalances.size > 0 && orderEffect !== 0) {
      // If buying, reduce balance; if selling, increase balance
      const tradeValue = order.filledQuantity * trade.price;
      const currentBalance = this.paperBalances.get('USDT') || 0;
      
      if (order.side === 'buy') {
        this.paperBalances.set('USDT', currentBalance - tradeValue);
      } else {
        this.paperBalances.set('USDT', currentBalance + tradeValue);
      }
    }
    
    // Return the updated position in a format suitable for external use
    return this.convertPosition(position);
  }
  
  /**
   * Update the mark price for a position
   */
  updateMarkPrice(symbol: string, markPrice: number): Position | null {
    const position = this.positions.get(symbol);
    
    if (!position) return null;
    
    position.markPrice = markPrice;
    position.lastUpdated = new Date();
    
    // Recalculate unrealized PnL
    if (position.quantity !== 0) {
      const priceDiff = position.side === 'long'
        ? position.markPrice - position.avgEntryPrice
        : position.avgEntryPrice - position.markPrice;
      
      position.unrealizedPnl = position.quantity * priceDiff;
    }
    
    return this.convertPosition(position);
  }
  
  /**
   * Get all tracked positions
   */
  async getPositions(): Promise<Position[]> {
    return Array.from(this.positions.values())
      .map(pos => this.convertPosition(pos));
  }
  
  /**
   * Get a specific position by symbol
   */
  getPosition(symbol: string): Position | null {
    const position = this.positions.get(symbol);
    return position ? this.convertPosition(position) : null;
  }
  
  /**
   * Get paper trading balances
   */
  getPaperBalances(): Balance[] {
    const balances: Balance[] = [];
    
    for (const [asset, amount] of this.paperBalances.entries()) {
      balances.push({
        asset,
        free: amount,
        locked: 0,
        total: amount
      });
    }
    
    return balances;
  }
  
  /**
   * Convert internal position state to external Position interface
   */
  private convertPosition(position: PositionState): Position {
    return {
      symbol: position.symbol,
      side: position.side,
      entryPrice: position.avgEntryPrice,
      markPrice: position.markPrice,
      quantity: position.quantity,
      leverage: position.leverage,
      liquidationPrice: position.liquidationPrice,
      marginType: position.marginType,
      unrealizedPnl: position.unrealizedPnl,
      realizedPnl: position.realizedPnl,
      createdAt: position.trades[0]?.timestamp || new Date(),
      updatedAt: position.lastUpdated
    };
  }
  
  /**
   * Set the leverage for a position
   */
  setLeverage(symbol: string, leverage: number): boolean {
    const position = this.positions.get(symbol);
    
    if (!position) return false;
    
    position.leverage = leverage;
    
    // Recalculate liquidation price if needed
    if (position.marginType === 'isolated' && position.quantity !== 0) {
      // Simple liquidation price calculation (would be different per exchange)
      if (position.side === 'long') {
        position.liquidationPrice = position.avgEntryPrice * (1 - 1/leverage);
      } else {
        position.liquidationPrice = position.avgEntryPrice * (1 + 1/leverage);
      }
    }
    
    return true;
  }
  
  /**
   * Set the margin type for a position
   */
  setMarginType(symbol: string, marginType: 'isolated' | 'cross'): boolean {
    const position = this.positions.get(symbol);
    
    if (!position) return false;
    
    position.marginType = marginType;
    
    // Update liquidation price calculation accordingly
    if (marginType === 'cross') {
      // Cross margin uses account-wide collateral, so individual liquidation
      // price is harder to calculate and depends on the exchange
      position.liquidationPrice = undefined;
    } else if (position.quantity !== 0) {
      // Isolated margin liquidation price calculation
      if (position.side === 'long') {
        position.liquidationPrice = position.avgEntryPrice * (1 - 1/position.leverage);
      } else {
        position.liquidationPrice = position.avgEntryPrice * (1 + 1/position.leverage);
      }
    }
    
    return true;
  }
  
  /**
   * Get realized profit and loss
   */
  getTotalRealizedPnl(): number {
    return Array.from(this.positions.values())
      .reduce((sum, pos) => sum + pos.realizedPnl, 0);
  }
  
  /**
   * Get unrealized profit and loss
   */
  getTotalUnrealizedPnl(): number {
    return Array.from(this.positions.values())
      .reduce((sum, pos) => sum + pos.unrealizedPnl, 0);
  }
  
  /**
   * Get total position value
   */
  getTotalPositionValue(): number {
    return Array.from(this.positions.values())
      .reduce((sum, pos) => sum + Math.abs(pos.quantity * pos.markPrice), 0);
  }
  
  /**
   * Check if a symbol has an open position
   */
  hasPosition(symbol: string): boolean {
    const position = this.positions.get(symbol);
    return !!position && position.quantity !== 0;
  }
  
  /**
   * Reset a position manually (for emergency use)
   */
  resetPosition(symbol: string): boolean {
    return this.positions.delete(symbol);
  }
}
