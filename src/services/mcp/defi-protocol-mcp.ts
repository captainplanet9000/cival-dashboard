import { ProtocolServiceFactory } from '../defi/protocol-service-factory';
import { ProtocolType, ProtocolAction, ProtocolCategory } from '../../types/defi-protocol-types';
import { crossProtocolAggregator } from '../defi/cross-protocol-aggregator';

/**
 * DeFi Protocol MCP Service
 * Provides AI agents with tools to interact with DeFi protocols
 */
export class DefiProtocolMcpService {
  private static instance: DefiProtocolMcpService;
  
  /**
   * Private constructor for singleton pattern
   */
  private constructor() {}
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): DefiProtocolMcpService {
    if (!DefiProtocolMcpService.instance) {
      DefiProtocolMcpService.instance = new DefiProtocolMcpService();
    }
    return DefiProtocolMcpService.instance;
  }
  
  /**
   * Get list of all supported protocols with metadata
   */
  async getProtocolsList(): Promise<any[]> {
    try {
      const protocols = await ProtocolServiceFactory.getAllProtocolsMetadata();
      return protocols;
    } catch (error: any) {
      console.error('Error getting protocols list:', error);
      throw error;
    }
  }
  
  /**
   * Get protocols filtered by category
   */
  async getProtocolsByCategory(category: ProtocolCategory): Promise<any[]> {
    try {
      const protocols = await ProtocolServiceFactory.getProtocolsByCategory(category);
      return protocols;
    } catch (error: any) {
      console.error(`Error getting ${category} protocols:`, error);
      throw error;
    }
  }
  
  /**
   * Get detailed data for a specific protocol
   */
  async getProtocolData(protocol: ProtocolType, chainId?: number | string): Promise<any> {
    try {
      const connector = await ProtocolServiceFactory.getConnector(protocol, chainId);
      await connector.connect();
      const data = await connector.getProtocolData();
      return data;
    } catch (error: any) {
      console.error(`Error getting protocol data for ${protocol}:`, error);
      throw error;
    }
  }
  
  /**
   * Execute an action on a protocol
   */
  async executeProtocolAction(action: ProtocolAction, userAddress?: string, chainId?: number | string): Promise<any> {
    try {
      const connector = await ProtocolServiceFactory.getConnector(action.protocol, chainId);
      
      // Connect with user address if provided
      if (userAddress) {
        await connector.connect({ address: userAddress });
      } else {
        await connector.connect();
      }
      
      const result = await connector.executeAction(action);
      return result;
    } catch (error: any) {
      console.error(`Error executing action ${action.actionType} on ${action.protocol}:`, error);
      throw error;
    }
  }
  
  /**
   * Get user positions across all protocols
   */
  async getUserPositions(userAddress: string, protocolTypes?: ProtocolType[]): Promise<any[]> {
    try {
      const positions = await crossProtocolAggregator.getAllUserPositions(userAddress, protocolTypes);
      return positions;
    } catch (error: any) {
      console.error('Error getting user positions:', error);
      throw error;
    }
  }
  
  /**
   * Compare swap rates across DEXes
   */
  async compareSwapRates(fromToken: string, toToken: string, amount: string): Promise<any[]> {
    try {
      const rates = await crossProtocolAggregator.getBestSwapRate(fromToken, toToken, amount);
      return rates;
    } catch (error: any) {
      console.error('Error comparing swap rates:', error);
      throw error;
    }
  }
  
  /**
   * Compare lending rates across lending protocols
   */
  async compareLendingRates(asset: string): Promise<any[]> {
    try {
      const rates = await crossProtocolAggregator.compareLendingRates(asset);
      return rates;
    } catch (error: any) {
      console.error('Error comparing lending rates:', error);
      throw error;
    }
  }
  
  /**
   * Compare perpetual trading fees across protocols
   */
  async comparePerpetualsFees(symbol: string): Promise<any[]> {
    try {
      const fees = await crossProtocolAggregator.comparePerpetualsFees(symbol);
      return fees;
    } catch (error: any) {
      console.error('Error comparing perpetuals fees:', error);
      throw error;
    }
  }
  
  /**
   * Execute optimized swap across DEXes
   */
  async executeOptimizedSwap(
    fromToken: string,
    toToken: string,
    amount: string,
    userAddress: string,
    options?: { slippageTolerance?: number; deadline?: number }
  ): Promise<any> {
    try {
      const result = await crossProtocolAggregator.executeOptimizedSwap(
        fromToken,
        toToken,
        amount,
        userAddress,
        options
      );
      return result;
    } catch (error: any) {
      console.error('Error executing optimized swap:', error);
      throw error;
    }
  }
  
  /**
   * Get recommended actions based on user's positions and market conditions
   */
  async getRecommendedActions(userAddress: string): Promise<any[]> {
    try {
      // Get user positions
      const positions = await crossProtocolAggregator.getAllUserPositions(userAddress);
      
      // This would involve more sophisticated analysis in a real implementation
      // For now, return simple recommendations based on position types
      
      const recommendations: any[] = [];
      
      // Check for lending positions with low APY
      const lendingPositions = positions.filter(pos => 
        pos.metadata.type === 'supply' || 
        pos.protocol === ProtocolType.AAVE || 
        pos.protocol === ProtocolType.MORPHO
      );
      
      if (lendingPositions.length > 0) {
        // For each lending position, check if there are better rates elsewhere
        for (const pos of lendingPositions) {
          const asset = pos.assetIn;
          const currentApy = pos.metadata.apy || 0;
          
          // Compare with other lending protocols
          const rates = await this.compareLendingRates(asset);
          const betterOptions = rates.filter(r => r.supplyAPY > currentApy * 1.2); // 20% better
          
          if (betterOptions.length > 0) {
            recommendations.push({
              type: 'yield_optimization',
              currentPosition: pos,
              betterOptions,
              potentialAPYIncrease: betterOptions[0].supplyAPY - currentApy,
              recommendation: `Consider moving your ${asset} deposit from ${pos.protocol} to ${betterOptions[0].protocol} for a higher APY.`
            });
          }
        }
      }
      
      // Check for swaps with better rates
      const tokenHoldings = this.extractTokenHoldings(positions);
      for (const token of Object.keys(tokenHoldings)) {
        if (token !== 'USDC' && token !== 'USDT' && token !== 'DAI') {
          // Check for better swap rates to stablecoins
          const swapRates = await this.compareSwapRates(token, 'USDC', tokenHoldings[token].toString());
          
          if (swapRates.length > 0 && swapRates[0].rate > 0) {
            recommendations.push({
              type: 'swap_opportunity',
              token,
              amount: tokenHoldings[token],
              bestRate: swapRates[0],
              recommendation: `Consider swapping ${tokenHoldings[token]} ${token} to USDC on ${swapRates[0].protocol} for the best rate.`
            });
          }
        }
      }
      
      return recommendations;
    } catch (error: any) {
      console.error('Error getting recommended actions:', error);
      throw error;
    }
  }
  
  /**
   * Extract token holdings from positions
   * Helper method to analyze user's token holdings across protocols
   */
  private extractTokenHoldings(positions: any[]): Record<string, number> {
    const holdings: Record<string, number> = {};
    
    for (const pos of positions) {
      if (pos.assetIn) {
        if (!holdings[pos.assetIn]) {
          holdings[pos.assetIn] = 0;
        }
        
        // Add to holdings for supply positions
        if (
          pos.metadata.type === 'supply' || 
          (pos.protocol === ProtocolType.UNISWAP || pos.protocol === ProtocolType.SUSHISWAP)
        ) {
          holdings[pos.assetIn] += pos.amountIn;
        }
        
        // Subtract from holdings for borrow positions
        if (pos.metadata.type === 'borrow') {
          holdings[pos.assetIn] -= pos.amountIn;
        }
      }
      
      // Also add assetOut for liquidity positions
      if (pos.assetOut) {
        if (!holdings[pos.assetOut]) {
          holdings[pos.assetOut] = 0;
        }
        
        holdings[pos.assetOut] += pos.amountOut || 0;
      }
    }
    
    return holdings;
  }
}

// Export singleton instance
export const defiProtocolMcp = DefiProtocolMcpService.getInstance(); 