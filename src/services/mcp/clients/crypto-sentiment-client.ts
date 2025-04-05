import { McpBaseClient } from './mcp-base-client';

/**
 * Client for the Crypto Sentiment MCP server
 * Provides market sentiment analysis for better trading decisions
 */
export class CryptoSentimentClient extends McpBaseClient {
  /**
   * Get overall market sentiment for a cryptocurrency
   */
  async getSentimentAnalysis(symbol: string): Promise<any> {
    return await this.callMcpTool('getSentimentAnalysis', {
      symbol
    });
  }
  
  /**
   * Get news sentiment analysis
   */
  async getNewsSentiment(
    symbol: string,
    timeRange: string = '7d'
  ): Promise<any> {
    return await this.callMcpTool('getNewsSentiment', {
      symbol,
      timeRange
    });
  }
  
  /**
   * Get social media sentiment analysis
   */
  async getSocialMediaSentiment(
    symbol: string,
    platforms: string[] = ['twitter', 'reddit', 'discord']
  ): Promise<any> {
    return await this.callMcpTool('getSocialMediaSentiment', {
      symbol,
      platforms
    });
  }
  
  /**
   * Get whale activity sentiment
   */
  async getWhaleActivitySentiment(
    symbol: string,
    timeRange: string = '30d'
  ): Promise<any> {
    return await this.callMcpTool('getWhaleActivitySentiment', {
      symbol,
      timeRange
    });
  }
  
  /**
   * Get fear and greed index
   */
  async getFearAndGreedIndex(): Promise<any> {
    return await this.callMcpTool('getFearAndGreedIndex', {});
  }
  
  /**
   * Get sentiment-based trading signals
   */
  async getSentimentSignals(
    symbol: string,
    timeframe: string = '1d'
  ): Promise<any> {
    return await this.callMcpTool('getSentimentSignals', {
      symbol,
      timeframe
    });
  }
  
  /**
   * Get correlation between sentiment and price
   */
  async getSentimentPriceCorrelation(
    symbol: string,
    timeRange: string = '90d'
  ): Promise<any> {
    return await this.callMcpTool('getSentimentPriceCorrelation', {
      symbol,
      timeRange
    });
  }
}
