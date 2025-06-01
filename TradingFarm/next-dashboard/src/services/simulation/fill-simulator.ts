/**
 * FillSimulator
 * 
 * Simulates realistic order fills for limit orders in the dry-run trading simulation.
 * Determines if and how limit orders would be filled based on market conditions.
 */
import { FillModel } from '../simulation-service';

export interface OrderDetails {
  symbol: string;
  side: 'buy' | 'sell';
  type: 'limit' | 'market' | 'stop' | 'stop_limit';
  amount: number;
  limitPrice?: number;
  stopPrice?: number;
}

export interface MarketSnapshot {
  timestamp: number;
  lastPrice: number;
  high: number;
  low: number;
  open: number;
  close: number;
  volume: number;
  orderBook?: {
    bids: Array<[number, number]>;  // price, quantity
    asks: Array<[number, number]>;  // price, quantity
  };
}

export interface FillResult {
  filled: boolean;
  partialFill: boolean;
  filledAmount: number;
  remainingAmount: number;
  fillPrice: number;
  reason?: string;
}

export class FillSimulator {
  /**
   * Simulate order fill based on current market conditions
   * 
   * @param order Order details
   * @param market Current market snapshot
   * @param model Fill model to use
   * @returns Fill result indicating if/how the order would be filled
   */
  static simulateOrderFill(
    order: OrderDetails,
    market: MarketSnapshot,
    model: FillModel
  ): FillResult {
    // Market orders are always filled immediately in simulation
    if (order.type === 'market') {
      return {
        filled: true,
        partialFill: false,
        filledAmount: order.amount,
        remainingAmount: 0,
        fillPrice: market.lastPrice
      };
    }
    
    // For limit orders, need to check if price conditions are met
    if (order.type === 'limit' && order.limitPrice) {
      switch (model.parameters.type) {
        case 'full':
          return this.simulateFullFill(order, market);
          
        case 'volume':
          return this.simulateVolumeBasedFill(order, market, model.parameters.volumeThreshold || 0.1);
          
        case 'probabilistic':
          return this.simulateProbabilisticFill(order, market, model.parameters);
          
        default:
          // Default to full fill model
          return this.simulateFullFill(order, market);
      }
    }
    
    // For stop orders, check if stop price is triggered
    if ((order.type === 'stop' || order.type === 'stop_limit') && order.stopPrice) {
      const stopTriggered = order.side === 'buy'
        ? market.lastPrice >= order.stopPrice
        : market.lastPrice <= order.stopPrice;
      
      if (!stopTriggered) {
        return {
          filled: false,
          partialFill: false,
          filledAmount: 0,
          remainingAmount: order.amount,
          fillPrice: 0,
          reason: 'Stop price not triggered'
        };
      }
      
      // If stop is triggered and it's a market stop, fill immediately
      if (order.type === 'stop') {
        return {
          filled: true,
          partialFill: false,
          filledAmount: order.amount,
          remainingAmount: 0,
          fillPrice: market.lastPrice
        };
      }
      
      // If it's a stop-limit, check the limit price condition
      if (order.type === 'stop_limit' && order.limitPrice) {
        // After stop triggers, treat it as a limit order
        const limitOrder = {
          ...order,
          type: 'limit' as const
        };
        return this.simulateOrderFill(limitOrder, market, model);
      }
    }
    
    // Default - not filled
    return {
      filled: false,
      partialFill: false,
      filledAmount: 0,
      remainingAmount: order.amount,
      fillPrice: 0,
      reason: 'Invalid order type or missing required prices'
    };
  }
  
  /**
   * Simulate a full fill for a limit order if price conditions are met
   */
  private static simulateFullFill(
    order: OrderDetails, 
    market: MarketSnapshot
  ): FillResult {
    if (!order.limitPrice) {
      return {
        filled: false,
        partialFill: false,
        filledAmount: 0,
        remainingAmount: order.amount,
        fillPrice: 0,
        reason: 'No limit price specified'
      };
    }
    
    // Check if price conditions are met
    const priceMet = order.side === 'buy'
      ? market.low <= order.limitPrice  // Buy limit order fills if price dips below limit
      : market.high >= order.limitPrice; // Sell limit order fills if price rises above limit
    
    if (priceMet) {
      return {
        filled: true,
        partialFill: false,
        filledAmount: order.amount,
        remainingAmount: 0,
        fillPrice: order.limitPrice
      };
    } else {
      return {
        filled: false,
        partialFill: false,
        filledAmount: 0,
        remainingAmount: order.amount,
        fillPrice: 0,
        reason: 'Price conditions not met'
      };
    }
  }
  
  /**
   * Simulate fill based on order size relative to volume
   */
  private static simulateVolumeBasedFill(
    order: OrderDetails,
    market: MarketSnapshot,
    volumeThreshold: number
  ): FillResult {
    // First check if price conditions are met at all
    const basicFill = this.simulateFullFill(order, market);
    if (!basicFill.filled) {
      return basicFill;
    }
    
    // Calculate order size as percentage of volume
    const orderVolumePercent = (order.amount * (order.limitPrice || market.lastPrice)) / market.volume;
    
    // If order is large relative to volume, it might be partially filled
    if (orderVolumePercent > volumeThreshold) {
      // Calculate fill percentage based on volume ratio
      const fillRatio = Math.min(1, volumeThreshold / orderVolumePercent);
      const filledAmount = order.amount * fillRatio;
      
      return {
        filled: true,
        partialFill: true,
        filledAmount,
        remainingAmount: order.amount - filledAmount,
        fillPrice: order.limitPrice || market.lastPrice,
        reason: 'Large order partially filled due to volume constraints'
      };
    }
    
    // Small orders get filled completely
    return basicFill;
  }
  
  /**
   * Simulate fill based on probabilistic model
   */
  private static simulateProbabilisticFill(
    order: OrderDetails,
    market: MarketSnapshot,
    parameters: any
  ): FillResult {
    // First check if price conditions are met at all
    const basicFill = this.simulateFullFill(order, market);
    if (!basicFill.filled) {
      return basicFill;
    }
    
    // Calculate distance from current price as a percentage
    const priceDistance = order.limitPrice
      ? Math.abs(order.limitPrice - market.lastPrice) / market.lastPrice
      : 0;
    
    // Base fill probability - closer to market price = higher probability
    let fillProbability = 1 - (priceDistance * (parameters.distanceImpact || 10));
    
    // Adjust for order size - larger orders have lower fill probability
    const orderVolumePercent = (order.amount * (order.limitPrice || market.lastPrice)) / market.volume;
    fillProbability *= 1 - (orderVolumePercent * (parameters.sizeImpact || 5));
    
    // Ensure probability is between 0 and 1
    fillProbability = Math.min(1, Math.max(0, fillProbability));
    
    // Random fill chance
    if (Math.random() < fillProbability) {
      // Determine if it's a partial fill
      if (orderVolumePercent > (parameters.partialFillThreshold || 0.05) && Math.random() < (parameters.partialFillChance || 0.3)) {
        // Calculate random fill amount between 10% and 90%
        const fillRatio = 0.1 + (Math.random() * 0.8);
        const filledAmount = order.amount * fillRatio;
        
        return {
          filled: true,
          partialFill: true,
          filledAmount,
          remainingAmount: order.amount - filledAmount,
          fillPrice: order.limitPrice || market.lastPrice,
          reason: 'Order probabilistically partially filled'
        };
      }
      
      // Full fill
      return basicFill;
    }
    
    // Not filled probabilistically
    return {
      filled: false,
      partialFill: false,
      filledAmount: 0,
      remainingAmount: order.amount,
      fillPrice: 0,
      reason: 'Order not filled probabilistically'
    };
  }
  
  /**
   * Get default fill model
   */
  static getDefaultFillModel(): FillModel {
    return {
      id: 'default-fill',
      userId: '00000000-0000-0000-0000-000000000000',
      name: 'Realistic Fill Model',
      modelType: 'fill',
      isSystemModel: true,
      parameters: {
        type: 'probabilistic',
        distanceImpact: 10,
        sizeImpact: 5,
        partialFillThreshold: 0.05,
        partialFillChance: 0.3,
        description: 'Realistic probabilistic fill model based on price distance and order size'
      },
      createdAt: new Date().toISOString()
    };
  }
}
