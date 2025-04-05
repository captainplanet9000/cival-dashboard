import { McpBaseClient } from './mcp-base-client';

/**
 * Client for the Alpha Vantage MCP server
 * Provides market data for both stocks and cryptocurrencies
 */
export class AlphaVantageClient extends McpBaseClient {
  /**
   * Get time series daily data for a symbol
   */
  async getTimeSeriesDaily(
    symbol: string,
    options?: {
      outputSize?: 'compact' | 'full';
    }
  ): Promise<any> {
    return await this.callMcpTool('getTimeSeriesDaily', {
      symbol,
      outputSize: options?.outputSize || 'compact'
    });
  }
  
  /**
   * Get global quote for a symbol
   */
  async getGlobalQuote(symbol: string): Promise<any> {
    return await this.callMcpTool('getGlobalQuote', {
      symbol
    });
  }
  
  /**
   * Search for symbols
   */
  async searchSymbol(keywords: string): Promise<any> {
    return await this.callMcpTool('searchSymbol', {
      keywords
    });
  }
  
  /**
   * Get fundamental data for a symbol
   */
  async getFundamentalData(
    symbol: string,
    function: string = 'OVERVIEW'
  ): Promise<any> {
    return await this.callMcpTool('getFundamentalData', {
      symbol,
      function
    });
  }
  
  /**
   * Get crypto intraday data
   */
  async getCryptoIntraday(
    symbol: string,
    market: string = 'USD',
    interval: string = '5min'
  ): Promise<any> {
    return await this.callMcpTool('getCryptoIntraday', {
      symbol,
      market,
      interval
    });
  }
  
  /**
   * Get crypto daily data
   */
  async getCryptoDaily(
    symbol: string,
    market: string = 'USD'
  ): Promise<any> {
    return await this.callMcpTool('getCryptoDaily', {
      symbol,
      market
    });
  }
  
  /**
   * Get FX daily rates
   */
  async getFxDaily(
    fromCurrency: string,
    toCurrency: string
  ): Promise<any> {
    return await this.callMcpTool('getFxDaily', {
      fromCurrency,
      toCurrency
    });
  }
}
