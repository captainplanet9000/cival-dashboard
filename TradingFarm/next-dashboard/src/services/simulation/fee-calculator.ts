/**
 * FeeCalculator
 * 
 * Calculates trading fees based on different exchange fee models for dry-run simulation.
 */
import { FeeModel } from '../simulation-service';

export interface OrderContext {
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  symbol: string;
  amount: number;
  price: number;
  totalCost: number;
  exchange: string;
  userVipLevel?: number;  // For exchanges with tiered fees based on VIP levels
  isMaker?: boolean;      // For limit orders that provide liquidity
}

export class FeeCalculator {
  /**
   * Calculate trading fee for an order
   * 
   * @param orderContext Details about the order
   * @param feeModel Fee model to use
   * @returns Fee amount and currency
   */
  static calculateFee(
    orderContext: OrderContext,
    feeModel: FeeModel
  ): { amount: number; currency: string } {
    // Determine if order is maker or taker
    // Default to taker for market orders, maker for limit orders unless specified
    const isMaker = orderContext.isMaker !== undefined
      ? orderContext.isMaker
      : orderContext.type === 'limit';
    
    // Get the appropriate fee rate in basis points
    const feeBps = isMaker 
      ? feeModel.parameters.makerFeeBps 
      : feeModel.parameters.takerFeeBps;
    
    // Convert basis points to percentage (1 bps = 0.01%)
    const feePercentage = feeBps / 10000;
    
    // Calculate fee amount
    const feeAmount = orderContext.totalCost * feePercentage;
    
    // Determine fee currency (usually quote currency)
    const feeCurrency = this.determineFeeAsset(orderContext.symbol, orderContext.exchange);
    
    return {
      amount: feeAmount,
      currency: feeCurrency
    };
  }
  
  /**
   * Determine which asset the fee is charged in
   */
  private static determineFeeAsset(symbol: string, exchange: string): string {
    // Most exchanges charge fees in the quote currency (second part of the pair)
    // Some exchanges like Binance offer BNB discounts, but we're simplifying here
    
    // Extract quote currency from symbol
    if (symbol.endsWith('USDT')) {
      return 'USDT';
    } else if (symbol.endsWith('USD')) {
      return 'USD';
    } else if (symbol.endsWith('USDC')) {
      return 'USDC';
    } else if (symbol.endsWith('BTC')) {
      return 'BTC';
    } else if (symbol.endsWith('ETH')) {
      return 'ETH';
    }
    
    // Default to USDT if we can't determine
    return 'USDT';
  }
  
  /**
   * Get standard fee model for a specific exchange
   * Used as fallback when no custom model is provided
   */
  static getStandardFeeModel(exchange: string): FeeModel {
    const userId = '00000000-0000-0000-0000-000000000000'; // System user ID
    
    switch (exchange.toLowerCase()) {
      case 'bybit':
        return {
          id: 'default-bybit',
          userId,
          name: 'Bybit Standard',
          modelType: 'fee',
          isSystemModel: true,
          parameters: {
            makerFeeBps: 1,   // 0.01%
            takerFeeBps: 6,   // 0.06%
            description: 'Standard Bybit fee structure'
          },
          createdAt: new Date().toISOString()
        };
        
      case 'coinbase':
        return {
          id: 'default-coinbase',
          userId,
          name: 'Coinbase Standard',
          modelType: 'fee',
          isSystemModel: true,
          parameters: {
            makerFeeBps: 40,  // 0.4%
            takerFeeBps: 60,  // 0.6%
            description: 'Standard Coinbase fee structure'
          },
          createdAt: new Date().toISOString()
        };
        
      case 'binance':
        return {
          id: 'default-binance',
          userId,
          name: 'Binance Standard',
          modelType: 'fee',
          isSystemModel: true,
          parameters: {
            makerFeeBps: 1,   // 0.01%
            takerFeeBps: 4,   // 0.04%
            description: 'Standard Binance fee structure'
          },
          createdAt: new Date().toISOString()
        };
        
      case 'hyperliquid':
        return {
          id: 'default-hyperliquid',
          userId,
          name: 'Hyperliquid Standard',
          modelType: 'fee',
          isSystemModel: true,
          parameters: {
            makerFeeBps: -1,  // -0.01% (rebate)
            takerFeeBps: 5,   // 0.05%
            description: 'Standard Hyperliquid fee structure with maker rebates'
          },
          createdAt: new Date().toISOString()
        };
        
      default:
        // Generic fee model
        return {
          id: 'default-generic',
          userId,
          name: 'Generic Exchange',
          modelType: 'fee',
          isSystemModel: true,
          parameters: {
            makerFeeBps: 10,  // 0.1%
            takerFeeBps: 10,  // 0.1%
            description: 'Generic exchange fee structure'
          },
          createdAt: new Date().toISOString()
        };
    }
  }
}
