/**
 * Position Management Types
 * 
 * Type definitions for the position management system.
 */

/**
 * Position information for a trading position
 */
export interface Position {
  /**
   * Unique position ID
   */
  id: string;
  
  /**
   * User ID who owns the position
   */
  user_id: string;
  
  /**
   * Exchange where the position is held
   */
  exchange: string;
  
  /**
   * Trading symbol of the position
   */
  symbol: string;
  
  /**
   * Size of the position (positive for long, negative for short)
   */
  position_size: number;
  
  /**
   * Average entry price of the position
   */
  entry_price: number;
  
  /**
   * Price at which the position will be liquidated (if applicable)
   */
  liquidation_price?: number | null;
  
  /**
   * Unrealized profit and loss in asset terms
   */
  unrealized_pnl: number;
  
  /**
   * Realized profit and loss from partial closes
   */
  realized_pnl: number;
  
  /**
   * Margin amount allocated to this position
   */
  margin_used?: number | null;
  
  /**
   * Leverage multiplier for the position
   */
  leverage: number;
  
  /**
   * Last known price of the asset
   */
  last_updated_price: number;
  
  /**
   * Percentage profit/loss of the position
   */
  pnl_percentage?: number;
  
  /**
   * Additional metadata for the position
   */
  metadata?: Record<string, any>;
  
  /**
   * When the position was created
   */
  created_at: string;
  
  /**
   * When the position was last updated
   */
  updated_at: string;
}

/**
 * Update data for modifying a position
 */
export interface PositionUpdate {
  /**
   * New position size
   */
  positionSize?: number;
  
  /**
   * New entry price
   */
  entryPrice?: number;
  
  /**
   * New liquidation price
   */
  liquidationPrice?: number | null;
  
  /**
   * Updated unrealized P&L
   */
  unrealizedPnl?: number;
  
  /**
   * Updated realized P&L
   */
  realizedPnl?: number;
  
  /**
   * Updated margin used
   */
  marginUsed?: number | null;
  
  /**
   * Updated leverage
   */
  leverage?: number;
  
  /**
   * Last known price
   */
  lastPrice?: number;
  
  /**
   * Additional metadata to merge with existing metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Risk metrics for a position
 */
export interface PositionRiskMetrics {
  /**
   * Exchange of the position
   */
  exchange: string;
  
  /**
   * Symbol of the position
   */
  symbol: string;
  
  /**
   * Current value of the position in asset terms
   */
  positionValue: number;
  
  /**
   * Value of the position at entry
   */
  entryValue: number;
  
  /**
   * Notional value of the position (typically positionValue * leverage)
   */
  notionalValue: number;
  
  /**
   * Leverage used for the position
   */
  leverage: number;
  
  /**
   * Maximum historical drawdown (as decimal)
   */
  maxDrawdown: number;
  
  /**
   * Maximum drawdown in value terms
   */
  maxDrawdownValue: number;
  
  /**
   * Price at which the position will be liquidated
   */
  liquidationPrice: number | null;
  
  /**
   * Percentage distance to liquidation
   */
  liquidationDistance: number | null;
  
  /**
   * Percentage price change needed to break even
   */
  breakEvenPriceChange: number;
  
  /**
   * Delta - sensitivity to price change
   */
  delta: number;
  
  /**
   * Value at Risk (VaR)
   */
  valueAtRisk: number;
  
  /**
   * Margin ratio (percentage)
   */
  marginRatio: number;
}

/**
 * Summary of all positions for a user
 */
export interface PositionSummary {
  /**
   * Total value of all positions
   */
  totalPositionValue: number;
  
  /**
   * Total unrealized P&L across all positions
   */
  totalUnrealizedPnL: number;
  
  /**
   * Total realized P&L across all positions
   */
  totalRealizedPnL: number;
  
  /**
   * Total P&L for the current day
   */
  totalDailyPnL: number;
  
  /**
   * Total number of positions
   */
  numberOfPositions: number;
  
  /**
   * Number of exchanges with positions
   */
  numberOfExchanges: number;
  
  /**
   * Number of unique assets with positions
   */
  numberOfAssets: number;
  
  /**
   * Number of long positions
   */
  countLongPositions: number;
  
  /**
   * Number of short positions
   */
  countShortPositions: number;
  
  /**
   * When the summary was last updated
   */
  lastUpdated: Date;
}
