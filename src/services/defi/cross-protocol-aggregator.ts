import { ProtocolType, ProtocolPosition, ProtocolCategory } from '../../types/defi-protocol-types';
import { ProtocolServiceFactory } from './protocol-service-factory';

/**
 * Class for aggregating data and operations across multiple DeFi protocols
 */
export class CrossProtocolAggregator {
  private static instance: CrossProtocolAggregator;
  
  private constructor() {}
  
  /**
   * Get singleton instance
   */
  public static getInstance(): CrossProtocolAggregator {
    if (!CrossProtocolAggregator.instance) {
      CrossProtocolAggregator.instance = new CrossProtocolAggregator();
    }
    return CrossProtocolAggregator.instance;
  }
  
  /**
   * Get all user positions across multiple protocols
   */
  async getAllUserPositions(address: string, protocols?: ProtocolType[]): Promise<ProtocolPosition[]> {
    const allPositions: ProtocolPosition[] = [];
    const protocolsToQuery = protocols || Object.values(ProtocolType);
    
    try {
      const positionPromises = protocolsToQuery.map(async (protocol) => {
        try {
          const connector = await ProtocolServiceFactory.getConnector(protocol);
          const positions = await connector.getUserPositions(address);
          return positions;
        } catch (error: unknown) {
          console.error(`Error fetching positions from ${protocol}:`, error);
          return [];
        }
      });
      
      const results = await Promise.allSettled(positionPromises);
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.length > 0) {
          allPositions.push(...result.value);
        }
      });
      
      return allPositions;
    } catch (error: unknown) {
      console.error('Error in getAllUserPositions:', error);
      return [];
    }
  }
  
  /**
   * Get positions by category
   */
  async getPositionsByCategory(address: string, category: ProtocolCategory): Promise<ProtocolPosition[]> {
    // Get all protocols in this category
    const protocolsMetadata = await ProtocolServiceFactory.getAllProtocolsMetadata();
    const protocols = protocolsMetadata
      .filter(metadata => metadata.category === category)
      .map(metadata => metadata.id as ProtocolType);
    
    return this.getAllUserPositions(address, protocols);
  }
  
  /**
   * Get best swap rates across DEXes
   */
  async getBestSwapRate(
    fromToken: string, 
    toToken: string, 
    amount: string, 
    slippageTolerance: number = 0.5
  ): Promise<any[]> {
    const dexProtocols = [ProtocolType.UNISWAP, ProtocolType.SUSHISWAP];
    const results: any[] = [];
    
    try {
      for (const protocol of dexProtocols) {
        try {
          const connector = await ProtocolServiceFactory.getConnector(protocol);
          
          // Each DEX connector should implement a getSwapQuote method
          const quote = await connector.executeAction({
            protocol,
            actionType: 'getSwapQuote',
            params: {
              fromToken,
              toToken,
              amount,
              slippageTolerance
            }
          });
          
          if (quote && quote.amountOut) {
            results.push({
              protocol,
              fromToken,
              toToken,
              amountIn: amount,
              amountOut: quote.amountOut,
              rate: parseFloat(quote.amountOut) / parseFloat(amount),
              priceImpact: quote.priceImpact || 0,
              estimatedGas: quote.estimatedGas || 0,
              route: quote.route || []
            });
          }
        } catch (error: unknown) {
          console.error(`Error getting swap rate from ${protocol}:`, error);
        }
      }
      
      // Sort by best rate (highest amountOut)
      results.sort((a, b) => b.rate - a.rate);
      
      return results;
    } catch (error: unknown) {
      console.error('Error in getBestSwapRate:', error);
      return [];
    }
  }
  
  /**
   * Compare lending rates across protocols
   */
  async compareLendingRates(asset: string): Promise<any[]> {
    const lendingProtocols = [ProtocolType.AAVE, ProtocolType.MORPHO, ProtocolType.SILO];
    const results: any[] = [];
    
    try {
      for (const protocol of lendingProtocols) {
        try {
          const connector = await ProtocolServiceFactory.getConnector(protocol);
          const protocolData = await connector.getProtocolData();
          
          // Extract lending rate for the specific asset
          // The structure will vary by protocol but should contain market data
          let assetData: any = null;
          
          if (protocol === ProtocolType.AAVE) {
            assetData = protocolData.reserves?.find((r: any) => r.symbol.toLowerCase() === asset.toLowerCase());
          } else if (protocol === ProtocolType.MORPHO) {
            assetData = protocolData.markets?.find((m: any) => m.underlying.symbol.toLowerCase() === asset.toLowerCase());
          } else if (protocol === ProtocolType.SILO) {
            assetData = protocolData.markets?.find((m: any) => m.tokenSymbol.toLowerCase() === asset.toLowerCase());
          }
          
          if (assetData) {
            results.push({
              protocol,
              asset,
              supplyAPY: assetData.supplyAPY || assetData.depositAPR || assetData.lendingRate || 0,
              borrowAPY: assetData.borrowAPY || assetData.borrowAPR || assetData.borrowingRate || 0,
              totalSupply: assetData.totalSupply || assetData.totalDeposited || 0,
              totalBorrow: assetData.totalBorrow || assetData.totalBorrowed || 0,
              utilizationRate: assetData.utilizationRate || 0,
              liquidationThreshold: assetData.liquidationThreshold || 0
            });
          }
        } catch (error: unknown) {
          console.error(`Error getting lending rates from ${protocol}:`, error);
        }
      }
      
      // Sort by best supply rate
      results.sort((a, b) => b.supplyAPY - a.supplyAPY);
      
      return results;
    } catch (error: unknown) {
      console.error('Error in compareLendingRates:', error);
      return [];
    }
  }
  
  /**
   * Compare perpetual trading fees across protocols
   */
  async comparePerpetualsFees(symbol: string): Promise<any[]> {
    const perpetualsProtocols = [ProtocolType.GMX, ProtocolType.VERTEX, ProtocolType.HYPERLIQUID, ProtocolType.BLUEFIN];
    const results: any[] = [];
    
    try {
      for (const protocol of perpetualsProtocols) {
        try {
          const connector = await ProtocolServiceFactory.getConnector(protocol);
          const protocolData = await connector.getProtocolData();
          
          // Extract trading fees for the specific asset
          let marketData: any = null;
          
          if (protocol === ProtocolType.GMX) {
            marketData = protocolData.markets?.find((m: any) => 
              m.indexToken.symbol.toLowerCase() === symbol.toLowerCase());
          } else if (protocol === ProtocolType.VERTEX) {
            marketData = protocolData.markets?.find((m: any) => 
              m.symbol.toLowerCase() === symbol.toLowerCase());
          } else if (protocol === ProtocolType.HYPERLIQUID) {
            marketData = protocolData.markets?.find((m: any) => 
              m.symbol.toLowerCase() === symbol.toLowerCase());
          } else if (protocol === ProtocolType.BLUEFIN) {
            marketData = protocolData.markets?.find((m: any) => 
              m.baseToken.toLowerCase() === symbol.toLowerCase());
          }
          
          if (marketData) {
            results.push({
              protocol,
              symbol,
              makerFee: marketData.makerFee || 0,
              takerFee: marketData.takerFee || 0,
              fundingRate: marketData.fundingRate || 0,
              maxLeverage: marketData.maxLeverage || 0,
              liquidationFee: marketData.liquidationFee || 0,
              openInterest: marketData.openInterest || 0,
              volume24h: marketData.volume24h || 0
            });
          }
        } catch (error: unknown) {
          console.error(`Error getting perpetuals fees from ${protocol}:`, error);
        }
      }
      
      // Sort by lowest taker fee
      results.sort((a, b) => a.takerFee - b.takerFee);
      
      return results;
    } catch (error: unknown) {
      console.error('Error in comparePerpetualsFees:', error);
      return [];
    }
  }
  
  /**
   * Execute a cross-protocol action like swap optimization
   */
  async executeOptimizedSwap(
    fromToken: string,
    toToken: string,
    amount: string,
    userAddress: string,
    options: { slippageTolerance?: number; deadline?: number } = {}
  ): Promise<any> {
    try {
      // Get best swap route
      const quotes = await this.getBestSwapRate(
        fromToken,
        toToken,
        amount,
        options.slippageTolerance || 0.5
      );
      
      if (!quotes.length) {
        throw new Error('No swap routes available');
      }
      
      // Select the best option
      const bestQuote = quotes[0];
      
      // Execute the swap on the selected protocol
      const connector = await ProtocolServiceFactory.getConnector(bestQuote.protocol);
      
      const result = await connector.executeAction({
        protocol: bestQuote.protocol,
        actionType: 'swap',
        params: {
          fromToken,
          toToken,
          amount,
          receiver: userAddress,
          slippageTolerance: options.slippageTolerance || 0.5,
          deadline: options.deadline || Math.floor(Date.now() / 1000) + 1200, // 20 minutes
          route: bestQuote.route
        }
      });
      
      return {
        executedOn: bestQuote.protocol,
        txHash: result.txHash,
        amountIn: amount,
        amountOut: bestQuote.amountOut,
        rate: bestQuote.rate,
        executionDetails: result
      };
    } catch (error: unknown) {
      console.error('Error executing optimized swap:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const crossProtocolAggregator = CrossProtocolAggregator.getInstance(); 