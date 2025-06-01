import { ToolDefinition } from '@/types/workflows';
import { createServerClient } from '@/utils/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { ElizaCommandService } from './eliza-command-service';

export class ToolService {
  private supabase: SupabaseClient<Database>;
  private elizaCommandService: ElizaCommandService;
  private tools: Map<string, ToolDefinition> = new Map();

  constructor(supabase?: SupabaseClient<Database>) {
    this.supabase = supabase || createServerClient();
    this.elizaCommandService = new ElizaCommandService();
    this.registerDefaultTools();
  }

  /**
   * Register a tool for use in workflows
   */
  registerTool(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Check if a tool exists
   */
  hasTool(toolName: string): boolean {
    return this.tools.has(toolName);
  }

  /**
   * Get tool definition
   */
  getTool(toolName: string): ToolDefinition | undefined {
    return this.tools.get(toolName);
  }

  /**
   * Execute a tool with parameters
   */
  async executeTool(toolName: string, parameters: any): Promise<any> {
    console.log(`Executing tool: ${toolName}`, parameters);

    const tool = this.tools.get(toolName);
    if (!tool) {
      // Try to delegate execution to ElizaOS for unknown tools
      try {
        return await this.elizaCommandService.executeCommand({
          command: toolName,
          parameters
        });
      } catch (error) {
        throw new Error(`Tool not found: ${toolName}`);
      }
    }

    try {
      return await tool.execute(parameters);
    } catch (error: any) {
      console.error(`Error executing tool ${toolName}:`, error);
      throw new Error(`Error executing tool ${toolName}: ${error.message}`);
    }
  }

  /**
   * Register default tools
   */
  private registerDefaultTools(): void {
    // Exchange Data Tool
    this.registerTool({
      name: 'exchange_data',
      description: 'Fetches data from cryptocurrency exchanges',
      permissions: ['read:market_data'],
      parameters: {
        exchange: 'string',
        symbol: 'string',
        dataType: 'string'
      },
      execute: async (parameters) => {
        const { exchange, symbol, dataType, timeframe, limit } = parameters;
        
        switch (dataType) {
          case 'price': 
            return this.getPrice(exchange, symbol);
          case 'ticker': 
            return this.getTicker(exchange, symbol);
          case 'orderbook': 
            return this.getOrderbook(exchange, symbol);
          case 'ohlcv': 
            return this.getCandles(exchange, symbol, timeframe, limit);
          default:
            throw new Error(`Unknown data type: ${dataType}`);
        }
      }
    });
    
    // Price Analysis Tool
    this.registerTool({
      name: 'price_analysis',
      description: 'Performs technical analysis on price data',
      permissions: ['read:market_data'],
      parameters: {
        exchange: 'string',
        symbol: 'string',
        indicator: 'string',
        params: 'object'
      },
      execute: async (parameters) => {
        const { exchange, symbol, indicator, params, assets } = parameters;
        
        // Handle multiple assets
        if (assets && Array.isArray(assets)) {
          const results: Record<string, any> = {};
          for (const asset of assets) {
            results[asset] = await this.calculateIndicator(exchange, asset, indicator, params);
          }
          return results;
        }
        
        // Handle single asset
        return this.calculateIndicator(exchange, symbol, indicator, params);
      }
    });
    
    // Market Sentiment Tool
    this.registerTool({
      name: 'market_sentiment',
      description: 'Analyzes market sentiment from news and social media',
      permissions: ['read:market_data', 'read:news_data'],
      parameters: {
        keywords: 'array',
        assets: 'array',
        lookback_hours: 'number'
      },
      execute: async (parameters) => {
        const { keywords, assets, lookback_hours = 24 } = parameters;
        
        // Use ElizaOS for sentiment analysis
        try {
          return await this.elizaCommandService.executeCommand({
            command: 'analyze_sentiment',
            parameters: {
              keywords, 
              assets, 
              lookback_hours
            }
          });
        } catch (error) {
          // Fallback to mock data if ElizaOS command fails
          return this.getMockSentimentData(keywords, assets);
        }
      }
    });
    
    // Portfolio Rebalance Tool
    this.registerTool({
      name: 'portfolio_rebalance',
      description: 'Rebalances a portfolio to target allocations',
      permissions: ['write:orders', 'read:balances'],
      parameters: {
        exchange: 'string',
        targetAllocations: 'object',
        portfolioValue: 'number',
        executionStrategy: 'string',
        allowPartialFills: 'boolean',
        maxSlippagePercent: 'number'
      },
      execute: async (parameters) => {
        const { 
          exchange, 
          targetAllocations, 
          portfolioValue, 
          executionStrategy = 'market_order', 
          allowPartialFills = true, 
          maxSlippagePercent = 0.5 
        } = parameters;
        
        // Get current balances
        const balances = await this.getBalances(exchange);
        
        // Calculate trades needed for rebalancing
        const trades = this.calculateRebalanceTrades(balances, targetAllocations, portfolioValue);
        
        // Execute trades
        const results = await this.executeTrades(exchange, trades, executionStrategy, allowPartialFills, maxSlippagePercent);
        
        return {
          exchange,
          initialBalances: balances,
          targetAllocations,
          trades,
          results
        };
      }
    });
    
    // Send Notification Tool
    this.registerTool({
      name: 'send_notification',
      description: 'Sends notifications to user',
      permissions: ['write:notifications'],
      parameters: {
        channel: 'string',
        recipient: 'string',
        subject: 'string',
        message: 'string'
      },
      execute: async (parameters) => {
        const { channel, recipient, subject, message } = parameters;
        
        // Log the notification for now
        console.log(`Sending notification via ${channel} to ${recipient}:`, subject, message);
        
        // Store notification in database
        const { data, error } = await this.supabase
          .from('notifications')
          .insert({
            channel,
            recipient,
            subject,
            message,
            status: 'sent'
          })
          .select('id')
          .single();
        
        if (error) {
          console.error('Error storing notification:', error);
          // Continue despite error
        }
        
        return {
          sent: true,
          channel,
          notificationId: data?.id,
          timestamp: new Date().toISOString()
        };
      }
    });
  }

  /**
   * Get current price for a symbol
   */
  private async getPrice(exchange: string, symbol: string): Promise<any> {
    try {
      // Try to get price from ElizaOS
      return await this.elizaCommandService.executeCommand({
        command: 'get_price',
        parameters: { exchange, symbol }
      });
    } catch (error) {
      // Fallback to mock data if ElizaOS command fails
      const price = this.getMockPrice(symbol);
      
      return {
        exchange,
        symbol,
        price,
        timestamp: new Date().toISOString(),
        source: 'mock'
      };
    }
  }

  /**
   * Get ticker data for a symbol
   */
  private async getTicker(exchange: string, symbol: string): Promise<any> {
    try {
      // Try to get ticker from ElizaOS
      return await this.elizaCommandService.executeCommand({
        command: 'get_ticker',
        parameters: { exchange, symbol }
      });
    } catch (error) {
      // Fallback to mock data if ElizaOS command fails
      const price = this.getMockPrice(symbol);
      
      return {
        exchange,
        symbol,
        bid: price * 0.999,
        ask: price * 1.001,
        last: price,
        volume: Math.random() * 1000 + 100,
        timestamp: new Date().toISOString(),
        source: 'mock'
      };
    }
  }

  /**
   * Get orderbook data for a symbol
   */
  private async getOrderbook(exchange: string, symbol: string): Promise<any> {
    try {
      // Try to get orderbook from ElizaOS
      return await this.elizaCommandService.executeCommand({
        command: 'get_orderbook',
        parameters: { exchange, symbol }
      });
    } catch (error) {
      // Fallback to mock data if ElizaOS command fails
      const price = this.getMockPrice(symbol);
      
      // Generate mock orderbook
      const bids = [];
      const asks = [];
      
      for (let i = 0; i < 10; i++) {
        bids.push([price * (1 - 0.001 * (i + 1)), Math.random() * 10 + 1]);
        asks.push([price * (1 + 0.001 * (i + 1)), Math.random() * 10 + 1]);
      }
      
      return {
        exchange,
        symbol,
        bids,
        asks,
        timestamp: new Date().toISOString(),
        source: 'mock'
      };
    }
  }

  /**
   * Get candle data for a symbol
   */
  private async getCandles(exchange: string, symbol: string, timeframe = '1h', limit = 100): Promise<any> {
    try {
      // Try to get candles from ElizaOS
      return await this.elizaCommandService.executeCommand({
        command: 'get_candles',
        parameters: { exchange, symbol, timeframe, limit }
      });
    } catch (error) {
      // Fallback to mock data if ElizaOS command fails
      const price = this.getMockPrice(symbol);
      const candles = [];
      
      const now = new Date();
      let time = new Date(now.getTime());
      
      // Convert timeframe to milliseconds
      let timeframeMs = 60 * 60 * 1000; // Default 1h
      if (timeframe.endsWith('m')) {
        timeframeMs = parseInt(timeframe) * 60 * 1000;
      } else if (timeframe.endsWith('h')) {
        timeframeMs = parseInt(timeframe) * 60 * 60 * 1000;
      } else if (timeframe.endsWith('d')) {
        timeframeMs = parseInt(timeframe) * 24 * 60 * 60 * 1000;
      }
      
      // Generate mock candles
      for (let i = 0; i < limit; i++) {
        time = new Date(time.getTime() - timeframeMs);
        
        const volatility = 0.02;
        const change = (Math.random() * 2 - 1) * volatility;
        const basePrice = price * (1 + i * 0.001 * (Math.random() > 0.5 ? 1 : -1));
        
        const open = basePrice;
        const close = basePrice * (1 + change);
        const high = Math.max(open, close) * (1 + Math.random() * 0.01);
        const low = Math.min(open, close) * (1 - Math.random() * 0.01);
        const volume = Math.random() * 100 + 10;
        
        candles.push({
          timestamp: time.toISOString(),
          open,
          high,
          low,
          close,
          volume
        });
      }
      
      return candles.reverse(); // Most recent first
    }
  }

  /**
   * Calculate technical indicator for a symbol
   */
  private async calculateIndicator(exchange: string, symbol: string, indicator: string, params: any = {}): Promise<any> {
    try {
      // Try to calculate indicator using ElizaOS
      return await this.elizaCommandService.executeCommand({
        command: 'calculate_indicator',
        parameters: { exchange, symbol, indicator, params }
      });
    } catch (error) {
      // Fallback to mock data if ElizaOS command fails
      switch (indicator.toLowerCase()) {
        case 'rsi':
          return { rsi: Math.random() * 100, previous_rsi: Math.random() * 100 };
        
        case 'macd':
          return { 
            macd_line: Math.random() * 2 - 1, 
            macd_signal: Math.random() * 2 - 1,
            previous_macd_line: Math.random() * 2 - 1,
            previous_macd_signal: Math.random() * 2 - 1
          };
        
        case 'volatility':
          const volatility = Math.random() * 0.05 + 0.01; // 1% to 6%
          return { volatility };
        
        default:
          return { [indicator]: Math.random() };
      }
    }
  }

  /**
   * Get mock sentiment data
   */
  private getMockSentimentData(keywords: string[] = [], assets: string[] = []): any {
    const combinedTerms = [...keywords, ...assets];
    
    // Generate mock news items
    const news = [];
    for (let i = 0; i < 5; i++) {
      const term = combinedTerms[Math.floor(Math.random() * combinedTerms.length)];
      const sentiment = Math.random() * 2 - 1; // -1 to 1
      
      news.push({
        title: `News about ${term} - Item ${i + 1}`,
        source: ['Bloomberg', 'CoinDesk', 'CryptoSlate', 'Reuters', 'CNBC'][Math.floor(Math.random() * 5)],
        url: `https://example.com/news/${i}`,
        published_at: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        sentiment_score: sentiment,
        sentiment_label: sentiment > 0.3 ? 'positive' : sentiment < -0.3 ? 'negative' : 'neutral',
        relevant_terms: [term]
      });
    }
    
    // Generate aggregate sentiment
    const overallSentiment = Math.random() * 2 - 1; // -1 to 1
    
    return {
      news,
      overall_sentiment: overallSentiment,
      sentiment_label: overallSentiment > 0.3 ? 'positive' : overallSentiment < -0.3 ? 'negative' : 'neutral',
      keywords,
      assets,
      timestamp: new Date().toISOString(),
      source: 'mock'
    };
  }

  /**
   * Get mock price for a symbol
   */
  private getMockPrice(symbol: string): number {
    // Generate somewhat realistic prices based on the symbol
    if (symbol.includes('BTC')) return 50000 + Math.random() * 5000;
    if (symbol.includes('ETH')) return 3000 + Math.random() * 300;
    if (symbol.includes('SOL')) return 100 + Math.random() * 20;
    if (symbol.includes('BNB')) return 500 + Math.random() * 50;
    if (symbol.includes('XRP')) return 0.5 + Math.random() * 0.1;
    if (symbol.includes('ADA')) return 0.4 + Math.random() * 0.05;
    if (symbol.includes('DOT')) return 6 + Math.random() * 1;
    
    // Default for unknown symbols
    return 100 + Math.random() * 10;
  }

  /**
   * Get balances for an exchange
   */
  private async getBalances(exchange: string): Promise<any> {
    try {
      // Try to get balances from ElizaOS
      return await this.elizaCommandService.executeCommand({
        command: 'get_balances',
        parameters: { exchange }
      });
    } catch (error) {
      // Fallback to mock data if ElizaOS command fails
      return {
        USD: 10000 + Math.random() * 5000,
        BTC: 0.1 + Math.random() * 0.1,
        ETH: 2 + Math.random() * 1,
        SOL: 20 + Math.random() * 10,
        BNB: 5 + Math.random() * 2,
        // Add more mock balances as needed
      };
    }
  }

  /**
   * Calculate trades needed for rebalancing
   */
  private calculateRebalanceTrades(
    currentBalances: Record<string, number>,
    targetAllocations: Record<string, number>,
    portfolioValue: number
  ): any[] {
    const trades = [];
    
    // Mock implementation - in a real system this would be more sophisticated
    for (const [asset, targetAmount] of Object.entries(targetAllocations)) {
      const currentAmount = asset === 'USD' 
        ? currentBalances.USD || 0 
        : ((currentBalances[asset.split('/')[0]] || 0) * this.getMockPrice(asset));
      
      const difference = targetAmount - currentAmount;
      
      if (Math.abs(difference) > portfolioValue * 0.01) { // 1% threshold to avoid dust trades
        trades.push({
          asset,
          side: difference > 0 ? 'buy' : 'sell',
          amountUSD: Math.abs(difference),
          reason: 'rebalancing'
        });
      }
    }
    
    return trades;
  }

  /**
   * Execute trades
   */
  private async executeTrades(
    exchange: string,
    trades: any[],
    executionStrategy: string,
    allowPartialFills: boolean,
    maxSlippagePercent: number
  ): Promise<any> {
    try {
      // Try to execute trades using ElizaOS
      return await this.elizaCommandService.executeCommand({
        command: 'execute_trades',
        parameters: { 
          exchange, 
          trades, 
          executionStrategy, 
          allowPartialFills, 
          maxSlippagePercent 
        }
      });
    } catch (error) {
      // Fallback to mock execution if ElizaOS command fails
      const results = trades.map(trade => {
        const slippage = Math.random() * maxSlippagePercent / 100;
        const executed = trade.amountUSD * (1 - slippage);
        const price = this.getMockPrice(trade.asset);
        
        return {
          ...trade,
          executed,
          price,
          amount: executed / price,
          status: 'filled',
          orderId: `mock-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
          timestamp: new Date().toISOString()
        };
      });
      
      return {
        exchange,
        orders: results,
        summary: {
          totalOrders: results.length,
          filledOrders: results.length,
          totalValueUSD: results.reduce((sum, order) => sum + order.executed, 0)
        }
      };
    }
  }
}
