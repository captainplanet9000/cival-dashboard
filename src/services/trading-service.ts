import { ProtocolFactory } from './exchange/protocol-factory';
import { ExchangeType, OrderSide, OrderType, TimeInForce } from '../types/exchange-types';

/**
 * TradingService for executing trades across different exchanges
 * Provides a unified interface for agents to interact with exchanges
 */
export class TradingService {
  private static instance: TradingService;
  private protocolFactory: ProtocolFactory;
  private agentTradingEnabled: boolean = false;
  
  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.protocolFactory = ProtocolFactory.getInstance();
    this.protocolFactory.initializeConnectors();
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): TradingService {
    if (!TradingService.instance) {
      TradingService.instance = new TradingService();
    }
    return TradingService.instance;
  }
  
  /**
   * Initialize the trading service with test credentials
   */
  public initializeWithTestCredentials(): void {
    this.protocolFactory.initializeWithTestCredentials();
    console.log('Trading service initialized with test credentials');
  }
  
  /**
   * Enable or disable agent trading
   */
  public setAgentTradingEnabled(enabled: boolean): void {
    this.agentTradingEnabled = enabled;
    console.log(`Agent trading ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Check if agent trading is enabled
   */
  public isAgentTradingEnabled(): boolean {
    return this.agentTradingEnabled;
  }
  
  /**
   * Execute a trade on a specific exchange
   */
  public async executeTrade(params: {
    exchange: ExchangeType;
    symbol: string;
    side: OrderSide;
    quantity: number;
    type?: OrderType;
    price?: number;
    timeInForce?: TimeInForce;
    agentId?: string;
  }): Promise<any> {
    // Check if trade is from an agent and if agent trading is enabled
    if (params.agentId && !this.agentTradingEnabled) {
      throw new Error('Agent trading is currently disabled');
    }
    
    try {
      const connector = this.protocolFactory.getConnector(params.exchange);
      
      const orderParams = {
        symbol: params.symbol,
        side: params.side,
        quantity: params.quantity,
        type: params.type || OrderType.MARKET,
        price: params.price,
        timeInForce: params.timeInForce
      };
      
      console.log(`Executing trade on ${params.exchange}:`, orderParams);
      const result = await connector.placeOrder(orderParams);
      
      // Log the trade for audit purposes
      this.logTrade({
        ...params,
        timestamp: Date.now(),
        status: 'completed',
        result
      });
      
      return result;
    } catch (error) {
      console.error(`Error executing trade on ${params.exchange}:`, error);
      
      // Log failed trade
      this.logTrade({
        ...params,
        timestamp: Date.now(),
        status: 'failed',
        error: error.message
      });
      
      throw error;
    }
  }
  
  /**
   * Find the best price across exchanges and execute trade
   */
  public async executeSmartTrade(params: {
    symbol: string;
    side: OrderSide;
    quantity: number;
    type?: OrderType;
    price?: number;
    timeInForce?: TimeInForce;
    agentId?: string;
  }): Promise<any> {
    // Check if trade is from an agent and if agent trading is enabled
    if (params.agentId && !this.agentTradingEnabled) {
      throw new Error('Agent trading is currently disabled');
    }
    
    try {
      console.log(`Finding best exchange for ${params.symbol} ${params.side} order`);
      
      // Get price quotes from all exchanges
      const priceQuotes = await Promise.all(
        Object.values(ExchangeType).map(async (exchange) => {
          try {
            const connector = this.protocolFactory.getConnector(exchange);
            const orderbook = await connector.getOrderBook(params.symbol);
            
            const price = params.side === OrderSide.BUY ? 
              orderbook.asks[0].price : 
              orderbook.bids[0].price;
              
            return { exchange, price };
          } catch (error) {
            console.warn(`Failed to get price from ${exchange}:`, error.message);
            // Return extreme price so this exchange won't be selected
            return { 
              exchange, 
              price: params.side === OrderSide.BUY ? Number.MAX_VALUE : 0 
            };
          }
        })
      );
      
      // Find best exchange based on price
      const bestQuote = priceQuotes.reduce((best, current) => {
        if (params.side === OrderSide.BUY) {
          return current.price < best.price ? current : best;
        } else {
          return current.price > best.price ? current : best;
        }
      });
      
      console.log(`Best price found on ${bestQuote.exchange}: ${bestQuote.price}`);
      
      // Execute trade on the exchange with the best price
      return await this.executeTrade({
        ...params,
        exchange: bestQuote.exchange as ExchangeType,
        price: params.price || bestQuote.price
      });
    } catch (error) {
      console.error('Error executing smart trade:', error);
      throw error;
    }
  }
  
  /**
   * Get account balances across all exchanges
   */
  public async getBalances(): Promise<Record<string, any>> {
    const balances: Record<string, any> = {};
    
    for (const exchange of Object.values(ExchangeType)) {
      try {
        const connector = this.protocolFactory.getConnector(exchange);
        balances[exchange] = await connector.getBalances();
      } catch (error) {
        console.error(`Error getting balances from ${exchange}:`, error);
        balances[exchange] = { error: error.message };
      }
    }
    
    return balances;
  }
  
  /**
   * Get current market prices for a symbol across all exchanges
   */
  public async getMarketPrices(symbol: string): Promise<Record<string, number>> {
    const prices: Record<string, number> = {};
    
    for (const exchange of Object.values(ExchangeType)) {
      try {
        const connector = this.protocolFactory.getConnector(exchange);
        const orderbook = await connector.getOrderBook(symbol);
        
        // Calculate mid price from best bid and ask
        const midPrice = (orderbook.asks[0].price + orderbook.bids[0].price) / 2;
        prices[exchange] = midPrice;
      } catch (error) {
        console.error(`Error getting ${symbol} price from ${exchange}:`, error);
      }
    }
    
    return prices;
  }
  
  /**
   * Test connections to all exchanges
   */
  public async testConnections(): Promise<Record<string, boolean>> {
    return await this.protocolFactory.testConnections();
  }
  
  /**
   * Log a trade for auditing and analysis
   * In a production system, this would write to a database
   */
  private logTrade(tradeInfo: any): void {
    console.log('Trade logged:', tradeInfo);
    // In a real implementation, this would write to a database
    // or call an API to record the trade
  }
} 