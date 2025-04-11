/**
 * SlippageCalculator
 * 
 * Calculates order slippage based on different models for the dry-run trading simulation.
 */
import { SlippageModel } from '../simulation-service';

export interface MarketContext {
  lastPrice: number;
  highPrice?: number;
  lowPrice?: number;
  volume?: number;
  volatility?: number;  // calculated volatility if available
  bid?: number;         // best bid if available
  ask?: number;         // best ask if available
  spread?: number;      // calculated spread if available
  depth?: {             // order book depth if available
    bids: Array<[number, number]>;  // price, quantity
    asks: Array<[number, number]>;  // price, quantity
  };
}

export class SlippageCalculator {
  /**
   * Calculate slippage for a market order based on the specified model
   * 
   * @param side 'buy' or 'sell'
   * @param quantity Amount to trade
   * @param marketContext Current market data
   * @param model Slippage model to use
   * @returns Executed price after slippage
   */
  static calculateMarketSlippage(
    side: 'buy' | 'sell',
    quantity: number,
    marketContext: MarketContext,
    model: SlippageModel
  ): number {
    const lastPrice = marketContext.lastPrice;
    
    switch (model.parameters.type) {
      case 'fixed':
        return this.calculateFixedSlippage(side, lastPrice, model.parameters.slippageBps || 5);
        
      case 'volatility':
        // Get volatility from context or calculate a basic estimate
        const volatility = marketContext.volatility || this.estimateVolatility(marketContext);
        return this.calculateVolatilityBasedSlippage(
          side, 
          lastPrice, 
          volatility,
          model.parameters.baseSlippageBps || 2,
          model.parameters.volatilityMultiplier || 0.5
        );
        
      case 'spread':
        // Get spread from context or calculate from bid/ask
        const spread = marketContext.spread || this.calculateSpread(marketContext);
        return this.calculateSpreadBasedSlippage(
          side,
          lastPrice,
          spread,
          model.parameters.spreadMultiplier || 0.75
        );
        
      default:
        // Default to 0.05% slippage if model is invalid
        return this.calculateFixedSlippage(side, lastPrice, 5);
    }
  }
  
  /**
   * Calculate slippage with a fixed percentage
   */
  private static calculateFixedSlippage(
    side: 'buy' | 'sell',
    price: number,
    slippageBps: number
  ): number {
    // Convert basis points to percentage (1 bps = 0.01%)
    const slippagePercent = slippageBps / 10000;
    
    // Apply slippage in the disadvantageous direction based on order side
    return side === 'buy'
      ? price * (1 + slippagePercent)  // Higher price for buys
      : price * (1 - slippagePercent); // Lower price for sells
  }
  
  /**
   * Calculate slippage based on market volatility
   */
  private static calculateVolatilityBasedSlippage(
    side: 'buy' | 'sell',
    price: number,
    volatility: number,
    baseSlippageBps: number,
    volatilityMultiplier: number
  ): number {
    // Base slippage in percentage
    const baseSlippagePercent = baseSlippageBps / 10000;
    
    // Additional slippage based on volatility
    // Higher volatility = higher slippage
    const volatilitySlippage = volatility * volatilityMultiplier / 100;
    
    // Total slippage percentage
    const totalSlippagePercent = baseSlippagePercent + volatilitySlippage;
    
    // Apply slippage in the appropriate direction
    return side === 'buy'
      ? price * (1 + totalSlippagePercent)
      : price * (1 - totalSlippagePercent);
  }
  
  /**
   * Calculate slippage based on current spread
   */
  private static calculateSpreadBasedSlippage(
    side: 'buy' | 'sell',
    price: number,
    spread: number,
    spreadMultiplier: number
  ): number {
    // Spread is already in percentage
    const spreadPercentage = spread / 100;
    
    // Slippage as a factor of the spread
    const slippagePercent = spreadPercentage * spreadMultiplier;
    
    // Apply half the slippage (since we're starting from mid-price)
    return side === 'buy'
      ? price * (1 + slippagePercent / 2)
      : price * (1 - slippagePercent / 2);
  }
  
  /**
   * Estimate volatility from available market data
   */
  private static estimateVolatility(marketContext: MarketContext): number {
    if (marketContext.highPrice && marketContext.lowPrice) {
      // Simple volatility estimate based on the high-low range as a percentage of the price
      return ((marketContext.highPrice - marketContext.lowPrice) / marketContext.lastPrice) * 100;
    }
    
    // Default volatility estimate if no high/low data available
    return 0.5; // 0.5% estimated volatility
  }
  
  /**
   * Calculate spread from bid/ask if available
   */
  private static calculateSpread(marketContext: MarketContext): number {
    if (marketContext.bid && marketContext.ask) {
      // Spread as a percentage of mid price
      const midPrice = (marketContext.bid + marketContext.ask) / 2;
      return ((marketContext.ask - marketContext.bid) / midPrice) * 100;
    }
    
    // Default spread if no bid/ask data available
    return 0.1; // 0.1% estimated spread
  }
}
