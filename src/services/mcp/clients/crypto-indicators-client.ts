import { McpBaseClient } from './mcp-base-client';

/**
 * Client for the Crypto Indicators MCP server
 * Provides technical analysis indicators for trading strategies
 */
export class CryptoIndicatorsClient extends McpBaseClient {
  /**
   * Get all indicators for a symbol
   */
  async getAllIndicators(
    symbol: string,
    interval: string = '1d'
  ): Promise<any> {
    return await this.callMcpTool('getAllIndicators', {
      symbol,
      interval
    });
  }
  
  /**
   * Get RSI (Relative Strength Index)
   */
  async getRSI(
    symbol: string,
    interval: string = '1d',
    period: number = 14
  ): Promise<any> {
    return await this.callMcpTool('getRSI', {
      symbol,
      interval,
      period
    });
  }
  
  /**
   * Get MACD (Moving Average Convergence Divergence)
   */
  async getMACD(
    symbol: string,
    interval: string = '1d',
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
  ): Promise<any> {
    return await this.callMcpTool('getMACD', {
      symbol,
      interval,
      fastPeriod,
      slowPeriod,
      signalPeriod
    });
  }
  
  /**
   * Get Bollinger Bands
   */
  async getBollingerBands(
    symbol: string,
    interval: string = '1d',
    period: number = 20,
    stdDev: number = 2
  ): Promise<any> {
    return await this.callMcpTool('getBollingerBands', {
      symbol,
      interval,
      period,
      stdDev
    });
  }
  
  /**
   * Get trading signals based on technical indicators
   */
  async getTradingSignals(
    symbol: string, 
    interval: string = '1d'
  ): Promise<any> {
    return await this.callMcpTool('getTradingSignals', {
      symbol,
      interval
    });
  }
  
  /**
   * Get support and resistance levels
   */
  async getSupportResistanceLevels(
    symbol: string,
    interval: string = '1d',
    lookbackPeriods: number = 90
  ): Promise<any> {
    return await this.callMcpTool('getSupportResistanceLevels', {
      symbol,
      interval,
      lookbackPeriods
    });
  }
  
  /**
   * Get trading strategy recommendations
   */
  async getStrategyRecommendations(
    symbol: string,
    interval: string = '1d',
    riskProfile: 'conservative' | 'moderate' | 'aggressive' = 'moderate'
  ): Promise<any> {
    return await this.callMcpTool('getStrategyRecommendations', {
      symbol,
      interval,
      riskProfile
    });
  }
}
