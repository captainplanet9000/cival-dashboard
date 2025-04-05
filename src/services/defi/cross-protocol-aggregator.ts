import { ProtocolType, ProtocolPosition, ProtocolCategory, ProtocolAction } from '../../types/defi-protocol-types';
import { ProtocolServiceFactory } from './protocol-service-factory';
import { ProtocolConnectorFactory } from './protocol-connector-factory';
import { ErrorHandler } from './error-handler';

interface SwapRate {
  protocol: ProtocolType;
  inputToken: string;
  outputToken: string;
  inputAmount: string;
  outputAmount: string;
  priceImpact: number;
  fees: number;
  route?: any;
  estimatedGas?: string;
  estimatedTimeMs?: number;
}

interface LendingRate {
  protocol: ProtocolType;
  token: string;
  supplyAPY: number;
  borrowAPY: number;
  totalSupply: string;
  totalBorrow: string;
  utilizationRate: number;
  ltv: number;
  liquidationThreshold: number;
}

interface BorrowRate {
  protocol: ProtocolType;
  token: string;
  stableRate?: number;
  variableRate: number;
  availableLiquidity: string;
  totalBorrowed: string;
  collateralRequired: number;
}

interface PositionAggregation {
  totalValueUSD: number;
  positionsByProtocol: Record<ProtocolType, number>;
  positionsByAsset: Record<string, number>;
  positions: any[];
}

/**
 * Class for aggregating data and operations across multiple DeFi protocols
 */
export class CrossProtocolAggregator {
  private static instance: CrossProtocolAggregator;
  private errorHandler: ErrorHandler;
  
  private constructor() {
    this.errorHandler = ErrorHandler.getInstance();
  }
  
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
  
  /**
   * Get all supported protocols
   */
  public getSupportedProtocols(): ProtocolType[] {
    return [
      ProtocolType.AAVE,
      ProtocolType.UNISWAP,
      ProtocolType.VERTEX,
      ProtocolType.GMX,
      ProtocolType.SUSHISWAP,
      ProtocolType.MORPHO
    ];
  }
  
  /**
   * Get best swap rates across multiple DEX protocols
   */
  public async getBestSwapRates(
    inputToken: string,
    outputToken: string,
    inputAmount: string,
    chainId: number = 1
  ): Promise<SwapRate[]> {
    const swapProtocols = [
      ProtocolType.UNISWAP,
      ProtocolType.SUSHISWAP
    ];
    
    const ratesPromises = swapProtocols.map(async (protocol) => {
      try {
        const connector = await ProtocolConnectorFactory.getConnector(protocol, chainId);
        
        // Handle different DEX interfaces - each might have different method for quotes
        if (protocol === ProtocolType.UNISWAP) {
          // We need to cast the connector to access specific connector methods
          const uniswapConnector = connector as any;
          if (typeof uniswapConnector.getSwapQuote === 'function') {
            const quote = await uniswapConnector.getSwapQuote({
              tokenIn: inputToken,
              tokenOut: outputToken,
              amount: inputAmount,
              exactIn: true
            });
            
            return {
              protocol,
              inputToken,
              outputToken,
              inputAmount,
              outputAmount: quote.amountOut,
              priceImpact: quote.priceImpact,
              fees: 0.003, // 0.3% for most pools
              route: quote.route,
              estimatedGas: '150000'
            };
          }
        } 
        else if (protocol === ProtocolType.SUSHISWAP) {
          // We need to cast the connector to access specific connector methods
          const sushiConnector = connector as any;
          if (typeof sushiConnector.getQuote === 'function') {
            const quote = await sushiConnector.getQuote(
              inputToken,
              outputToken,
              inputAmount
            );
            
            return {
              protocol,
              inputToken,
              outputToken,
              inputAmount,
              outputAmount: quote.outputAmount,
              priceImpact: quote.priceImpact,
              fees: 0.003, // 0.3% for most pools
              route: quote.path,
              estimatedGas: quote.estimatedGas
            };
          }
        }
        
        return null;
      } catch (error) {
        this.errorHandler.handleError(error, protocol.toString(), "GET_SWAP_RATE");
        return null;
      }
    });
    
    const results = await Promise.all(ratesPromises);
    
    // Filter out null results and sort by output amount (descending)
    return results
      .filter(Boolean)
      .sort((a, b) => 
        parseFloat((b?.outputAmount as string) || '0') - parseFloat((a?.outputAmount as string) || '0')
      ) as SwapRate[];
  }
  
  /**
   * Get best lending rates across lending protocols
   */
  public async getBestLendingRates(
    token: string,
    chainId: number = 1
  ): Promise<LendingRate[]> {
    const lendingProtocols = [
      ProtocolType.AAVE,
      ProtocolType.MORPHO
    ];
    
    const ratesPromises = lendingProtocols.map(async (protocol) => {
      try {
        const connector = await ProtocolConnectorFactory.getConnector(protocol, chainId);
        
        if (protocol === ProtocolType.AAVE) {
          // We need to cast the connector to access specific connector methods
          const aaveConnector = connector as any;
          if (typeof aaveConnector.getReserveData === 'function') {
            const reserveData = await aaveConnector.getReserveData();
            const tokenData = reserveData.find((r: any) => 
              r.address.toLowerCase() === token.toLowerCase() || 
              r.symbol.toLowerCase() === token.toLowerCase()
            );
            
            if (!tokenData) return null;
            
            return {
              protocol,
              token: tokenData.symbol,
              supplyAPY: tokenData.supplyAPY,
              borrowAPY: tokenData.borrowAPY,
              totalSupply: tokenData.totalSupply,
              totalBorrow: tokenData.totalBorrow,
              utilizationRate: tokenData.utilizationRate,
              ltv: tokenData.ltv,
              liquidationThreshold: tokenData.liquidationThreshold
            };
          }
        }
        else if (protocol === ProtocolType.MORPHO) {
          // We need to cast the connector to access specific connector methods
          const morphoConnector = connector as any;
          if (typeof morphoConnector.getMarkets === 'function') {
            const markets = await morphoConnector.getMarkets();
            const tokenMarket = markets.find((m: any) => 
              m.underlyingToken?.toLowerCase() === token.toLowerCase() || 
              m.symbol?.toLowerCase() === token.toLowerCase()
            );
            
            if (!tokenMarket) return null;
            
            return {
              protocol,
              token: tokenMarket.symbol,
              supplyAPY: tokenMarket.supplyAPY,
              borrowAPY: tokenMarket.borrowAPY,
              totalSupply: tokenMarket.totalSupply,
              totalBorrow: tokenMarket.totalBorrow,
              utilizationRate: tokenMarket.utilizationRate,
              ltv: tokenMarket.ltv,
              liquidationThreshold: tokenMarket.liquidationThreshold
            };
          }
        }
        
        return null;
      } catch (error) {
        this.errorHandler.handleError(error, protocol.toString(), "GET_LENDING_RATE");
        return null;
      }
    });
    
    const results = await Promise.all(ratesPromises);
    
    // Filter out null results and sort by supply APY (descending)
    return results
      .filter(Boolean)
      .sort((a, b) => ((b?.supplyAPY as number) || 0) - ((a?.supplyAPY as number) || 0)) as LendingRate[];
  }
  
  /**
   * Get best borrowing rates across lending protocols
   */
  public async getBestBorrowRates(
    token: string,
    chainId: number = 1
  ): Promise<BorrowRate[]> {
    const lendingProtocols = [
      ProtocolType.AAVE,
      ProtocolType.MORPHO
    ];
    
    const ratesPromises = lendingProtocols.map(async (protocol) => {
      try {
        const connector = await ProtocolConnectorFactory.getConnector(protocol, chainId);
        
        if (protocol === ProtocolType.AAVE) {
          // We need to cast the connector to access specific connector methods
          const aaveConnector = connector as any;
          if (typeof aaveConnector.getReserveData === 'function') {
            const reserveData = await aaveConnector.getReserveData();
            const tokenData = reserveData.find((r: any) => 
              r.address.toLowerCase() === token.toLowerCase() || 
              r.symbol.toLowerCase() === token.toLowerCase()
            );
            
            if (!tokenData) return null;
            
            return {
              protocol,
              token: tokenData.symbol,
              variableRate: tokenData.borrowAPY,
              availableLiquidity: (
                parseFloat(tokenData.totalSupply) - parseFloat(tokenData.totalBorrow)
              ).toString(),
              totalBorrowed: tokenData.totalBorrow,
              collateralRequired: 1 / tokenData.ltv
            };
          }
        }
        else if (protocol === ProtocolType.MORPHO) {
          // We need to cast the connector to access specific connector methods
          const morphoConnector = connector as any;
          if (typeof morphoConnector.getMarkets === 'function') {
            const markets = await morphoConnector.getMarkets();
            const tokenMarket = markets.find((m: any) => 
              m.underlyingToken?.toLowerCase() === token.toLowerCase() || 
              m.symbol?.toLowerCase() === token.toLowerCase()
            );
            
            if (!tokenMarket) return null;
            
            return {
              protocol,
              token: tokenMarket.symbol,
              variableRate: tokenMarket.borrowAPY,
              availableLiquidity: (
                parseFloat(tokenMarket.totalSupply) - parseFloat(tokenMarket.totalBorrow)
              ).toString(),
              totalBorrowed: tokenMarket.totalBorrow,
              collateralRequired: 1 / tokenMarket.ltv
            };
          }
        }
        
        return null;
      } catch (error) {
        this.errorHandler.handleError(error, protocol.toString(), "GET_BORROW_RATE");
        return null;
      }
    });
    
    const results = await Promise.all(ratesPromises);
    
    // Filter out null results and sort by variable rate (ascending)
    return results
      .filter(Boolean)
      .sort((a, b) => ((a?.variableRate as number) || 0) - ((b?.variableRate as number) || 0)) as BorrowRate[];
  }
  
  /**
   * Execute swap using the best available route
   */
  public async executeBestSwap(
    inputToken: string,
    outputToken: string,
    inputAmount: string,
    minOutputAmount: string,
    walletAddress: string,
    chainId: number = 1
  ): Promise<any> {
    // 1. Get best swap rates
    const rates = await this.getBestSwapRates(
      inputToken,
      outputToken,
      inputAmount,
      chainId
    );
    
    if (!rates.length) {
      throw new Error(`No available routes found for ${inputToken} -> ${outputToken}`);
    }
    
    // 2. Select best rate (already sorted)
    const bestRoute = rates[0];
    
    // 3. Execute swap using the protocol with best rate
    const connector = await ProtocolConnectorFactory.getConnector(bestRoute.protocol, chainId);
    
    // Connect wallet if needed
    await ProtocolConnectorFactory.connectWallet(bestRoute.protocol);
    
    // 4. Execute the swap with retry mechanism
    return await this.errorHandler.retryWithBackoff(
      async () => {
        return await connector.executeAction(
          ProtocolAction.SWAP,
          {
            tokenIn: inputToken,
            tokenOut: outputToken,
            amountIn: inputAmount,
            minAmountOut: minOutputAmount,
            recipient: walletAddress
          }
        );
      },
      { maxRetries: 3 },
      bestRoute.protocol.toString(),
      "EXECUTE_SWAP"
    );
  }
  
  /**
   * Aggregate user positions across protocols
   */
  public async aggregatePositions(
    walletAddress: string,
    chainIds: number[] = [1, 42161, 137, 10] // Ethereum, Arbitrum, Polygon, Optimism
  ): Promise<PositionAggregation> {
    const protocols = this.getSupportedProtocols();
    const allPositions = [];
    let totalValueUSD = 0;
    const positionsByProtocol: Record<ProtocolType, number> = {} as Record<ProtocolType, number>;
    const positionsByAsset: Record<string, number> = {};
    
    // Initialize positionsByProtocol with 0 values
    protocols.forEach(protocol => {
      positionsByProtocol[protocol] = 0;
    });
    
    // For each chain and protocol, get user positions
    for (const chainId of chainIds) {
      for (const protocol of protocols) {
        try {
          const connector = await ProtocolConnectorFactory.getConnector(protocol, chainId);
          
          // Skip if connector doesn't support this chain
          if (!connector) continue;
          
          // Connect connector (read-only)
          await connector.connect({ address: walletAddress });
          
          // Get positions for this protocol on this chain
          const positions = await connector.getUserPositions(walletAddress);
          
          if (positions.length > 0) {
            // Add chain and protocol info to positions
            const enhancedPositions = positions.map(pos => ({
              ...pos,
              chainId,
              protocol
            }));
            
            // Add to all positions
            allPositions.push(...enhancedPositions);
            
            // Calculate value for this protocol and add to running totals
            const protocolValue = enhancedPositions.reduce(
              (sum, pos) => sum + (pos.positionValue || 0), 
              0
            );
            
            // Update totals
            totalValueUSD += protocolValue;
            positionsByProtocol[protocol] += protocolValue;
            
            // Update by asset
            enhancedPositions.forEach(pos => {
              const assetKey = pos.assetSymbol || 'unknown';
              positionsByAsset[assetKey] = (positionsByAsset[assetKey] || 0) + (pos.positionValue || 0);
            });
          }
        } catch (error) {
          this.errorHandler.handleError(error, protocol.toString(), "AGGREGATE_POSITIONS");
          // Continue with next protocol even if this one fails
        }
      }
    }
    
    return {
      totalValueUSD,
      positionsByProtocol,
      positionsByAsset,
      positions: allPositions
    };
  }
}

// Export singleton instance
export const crossProtocolAggregator = CrossProtocolAggregator.getInstance(); 