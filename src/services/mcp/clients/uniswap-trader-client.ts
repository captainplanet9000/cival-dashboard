import { McpBaseClient } from './mcp-base-client';

/**
 * Client for the Uniswap Trader MCP server
 * Enhances the existing Uniswap connector with AI-driven trading capabilities
 */
export class UniswapTraderClient extends McpBaseClient {
  /**
   * Get quote for a token swap
   */
  async getSwapQuote(
    fromToken: string,
    toToken: string,
    amount: string,
    options?: {
      slippageTolerance?: number;
      chainId?: number;
    }
  ): Promise<any> {
    return await this.callMcpTool('getSwapQuote', {
      fromToken,
      toToken,
      amount,
      slippageTolerance: options?.slippageTolerance || 0.5,
      chainId: options?.chainId || 1
    });
  }
  
  /**
   * Execute a token swap on Uniswap
   */
  async executeSwap(
    fromToken: string,
    toToken: string,
    amount: string,
    walletAddress: string,
    options?: {
      slippageTolerance?: number;
      deadline?: number;
      chainId?: number;
    }
  ): Promise<any> {
    return await this.callMcpTool('executeSwap', {
      fromToken,
      toToken,
      amount,
      walletAddress,
      slippageTolerance: options?.slippageTolerance || 0.5,
      deadline: options?.deadline || Math.floor(Date.now() / 1000) + 1200, // 20 minutes
      chainId: options?.chainId || 1
    });
  }
  
  /**
   * Find optimal swap routes across multiple pools
   */
  async findOptimalSwapRoute(
    fromToken: string,
    toToken: string,
    amount: string,
    options?: {
      chainId?: number;
      maxHops?: number;
    }
  ): Promise<any> {
    return await this.callMcpTool('findOptimalSwapRoute', {
      fromToken,
      toToken,
      amount,
      chainId: options?.chainId || 1,
      maxHops: options?.maxHops || 3
    });
  }
  
  /**
   * Add liquidity to a pool
   */
  async addLiquidity(
    token0: string,
    token1: string,
    amount0: string,
    amount1: string,
    walletAddress: string,
    options?: {
      slippageTolerance?: number;
      chainId?: number;
    }
  ): Promise<any> {
    return await this.callMcpTool('addLiquidity', {
      token0,
      token1,
      amount0,
      amount1,
      walletAddress,
      slippageTolerance: options?.slippageTolerance || 0.5,
      chainId: options?.chainId || 1
    });
  }
  
  /**
   * Get historical performance metrics of a swap
   */
  async getSwapPerformanceMetrics(
    fromToken: string,
    toToken: string,
    timeRange: string = '30d',
    chainId: number = 1
  ): Promise<any> {
    return await this.callMcpTool('getSwapPerformanceMetrics', {
      fromToken,
      toToken,
      timeRange,
      chainId
    });
  }
}
