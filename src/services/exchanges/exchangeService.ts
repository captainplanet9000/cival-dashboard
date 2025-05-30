import ccxt from 'ccxt';
import { PrismaClient, ApiKey } from '@prisma/client';

const prisma = new PrismaClient();

interface ExchangeConfig {
  apiKey: string;
  secret: string;
  exchange: string;
  options?: Record<string, any>;
}

class ExchangeService {
  private exchanges: Map<string, ccxt.Exchange> = new Map();
  
  /**
   * Initialize an exchange connection
   */
  async initializeExchange(config: ExchangeConfig): Promise<ccxt.Exchange> {
    try {
      const exchangeId = config.exchange.toLowerCase();
      
      // Check if exchange is supported by ccxt
      if (!ccxt.exchanges.includes(exchangeId)) {
        throw new Error(`Exchange ${exchangeId} is not supported`);
      }
      
      // Create exchange instance dynamically
      const ExchangeClass = ccxt[exchangeId as keyof typeof ccxt];
      
      if (!ExchangeClass || typeof ExchangeClass !== 'function') {
        throw new Error(`Failed to initialize exchange ${exchangeId}`);
      }
      
      const exchange = new (ExchangeClass as any)({
        apiKey: config.apiKey,
        secret: config.secret,
        ...config.options
      });
      
      // Load markets to ensure the connection works
      await exchange.loadMarkets();
      
      // Store exchange instance in map for reuse
      const exchangeKey = `${exchangeId}-${config.apiKey.substring(0, 8)}`;
      this.exchanges.set(exchangeKey, exchange);
      
      return exchange;
    } catch (error) {
      console.error(`Error initializing exchange: ${error.message}`);
      throw new Error(`Failed to initialize exchange: ${error.message}`);
    }
  }
  
  /**
   * Get exchange instance by API key ID
   */
  async getExchangeByApiKeyId(apiKeyId: string): Promise<ccxt.Exchange> {
    try {
      // Try to find exchange in the map first
      for (const [key, exchange] of this.exchanges.entries()) {
        if (key.includes(apiKeyId)) {
          return exchange;
        }
      }
      
      // If not found, initialize a new exchange connection
      const apiKey = await prisma.apiKey.findUnique({
        where: { id: apiKeyId }
      });
      
      if (!apiKey) {
        throw new Error(`API key with ID ${apiKeyId} not found`);
      }
      
      return this.initializeExchange({
        apiKey: apiKey.key,
        secret: apiKey.secret,
        exchange: apiKey.exchangeName
      });
    } catch (error) {
      console.error(`Error getting exchange: ${error.message}`);
      throw new Error(`Failed to get exchange: ${error.message}`);
    }
  }
  
  /**
   * Get balance for a specific exchange
   */
  async getBalance(exchange: ccxt.Exchange): Promise<any> {
    try {
      return await exchange.fetchBalance();
    } catch (error) {
      console.error(`Error fetching balance: ${error.message}`);
      throw new Error(`Failed to fetch balance: ${error.message}`);
    }
  }
  
  /**
   * Get ticker information for a specific trading pair
   */
  async getTicker(exchange: ccxt.Exchange, symbol: string): Promise<any> {
    try {
      return await exchange.fetchTicker(symbol);
    } catch (error) {
      console.error(`Error fetching ticker for ${symbol}: ${error.message}`);
      throw new Error(`Failed to fetch ticker for ${symbol}: ${error.message}`);
    }
  }
  
  /**
   * Fetch available markets for an exchange
   */
  async getMarkets(exchange: ccxt.Exchange): Promise<any> {
    try {
      return await exchange.fetchMarkets();
    } catch (error) {
      console.error(`Error fetching markets: ${error.message}`);
      throw new Error(`Failed to fetch markets: ${error.message}`);
    }
  }
  
  /**
   * Create a market order
   */
  async createMarketOrder(
    exchange: ccxt.Exchange, 
    symbol: string, 
    side: 'buy' | 'sell', 
    amount: number,
    params: Record<string, any> = {}
  ): Promise<any> {
    try {
      return await exchange.createOrder(symbol, 'market', side, amount, undefined, params);
    } catch (error) {
      console.error(`Error creating market order: ${error.message}`);
      throw new Error(`Failed to create market order: ${error.message}`);
    }
  }
  
  /**
   * Create a limit order
   */
  async createLimitOrder(
    exchange: ccxt.Exchange, 
    symbol: string, 
    side: 'buy' | 'sell', 
    amount: number,
    price: number,
    params: Record<string, any> = {}
  ): Promise<any> {
    try {
      return await exchange.createOrder(symbol, 'limit', side, amount, price, params);
    } catch (error) {
      console.error(`Error creating limit order: ${error.message}`);
      throw new Error(`Failed to create limit order: ${error.message}`);
    }
  }
  
  /**
   * Cancel an order
   */
  async cancelOrder(
    exchange: ccxt.Exchange, 
    orderId: string, 
    symbol: string,
    params: Record<string, any> = {}
  ): Promise<any> {
    try {
      return await exchange.cancelOrder(orderId, symbol, params);
    } catch (error) {
      console.error(`Error cancelling order: ${error.message}`);
      throw new Error(`Failed to cancel order: ${error.message}`);
    }
  }
  
  /**
   * Fetch open orders
   */
  async getOpenOrders(
    exchange: ccxt.Exchange, 
    symbol?: string,
    params: Record<string, any> = {}
  ): Promise<any> {
    try {
      return await exchange.fetchOpenOrders(symbol, undefined, undefined, params);
    } catch (error) {
      console.error(`Error fetching open orders: ${error.message}`);
      throw new Error(`Failed to fetch open orders: ${error.message}`);
    }
  }
  
  /**
   * Fetch historical OHLCV data
   */
  async getOHLCV(
    exchange: ccxt.Exchange, 
    symbol: string, 
    timeframe: string = '1h', 
    since?: number,
    limit?: number,
    params: Record<string, any> = {}
  ): Promise<any> {
    try {
      return await exchange.fetchOHLCV(symbol, timeframe, since, limit, params);
    } catch (error) {
      console.error(`Error fetching OHLCV data: ${error.message}`);
      throw new Error(`Failed to fetch OHLCV data: ${error.message}`);
    }
  }
  
  /**
   * Close all exchange connections
   */
  closeAllConnections(): void {
    this.exchanges.clear();
  }
}

// Export a singleton instance
export const exchangeService = new ExchangeService();

export default exchangeService; 