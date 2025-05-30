import * as ccxt from 'ccxt';
import { logger } from '../logging/winston-service';
import { cacheService } from '../cache/node-cache-service';
import { Decimal } from 'decimal.js';

// Types for exchange capabilities
export interface ExchangeCapabilities {
  exchange: string;
  hasFetchOHLCV: boolean;
  hasFetchOrderBook: boolean;
  hasFetchTicker: boolean;
  hasFetchTrades: boolean;
  hasFetchBalance: boolean;
  hasCreateOrder: boolean;
  hasCancelOrder: boolean;
  hasFetchOrders: boolean;
  hasFetchOpenOrders: boolean;
  hasFetchClosedOrders: boolean;
  hasFetchMyTrades: boolean;
  timeframes: string[];
  symbols: string[];
}

// Market data types
export interface MarketData {
  symbol: string;
  timestamp: number;
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  exchange: string;
}

// Order types
export interface OrderParams {
  symbol: string;
  type: 'market' | 'limit';
  side: 'buy' | 'sell';
  amount: number;
  price?: number;
  params?: any;
}

/**
 * CCXT Integration Service
 * Provides unified access to cryptocurrency exchanges
 */
export class CCXTService {
  private static instance: CCXTService;
  private exchanges: Map<string, ccxt.Exchange> = new Map();
  private readonly supportedExchanges = [
    'binance', 'bybit', 'okx', 'kucoin', 'coinbase', 'kraken'
  ];

  private constructor() {
    this.initializeCCXT();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): CCXTService {
    if (!CCXTService.instance) {
      CCXTService.instance = new CCXTService();
    }
    return CCXTService.instance;
  }

  /**
   * Initialize CCXT library and supported exchanges
   */
  private initializeCCXT(): void {
    logger.info('Initializing CCXT service with supported exchanges');
    
    // Register exchanges
    for (const exchangeId of this.supportedExchanges) {
      try {
        if (ccxt.exchanges.includes(exchangeId)) {
          logger.debug(`Exchange ${exchangeId} is supported by CCXT`);
        } else {
          logger.warn(`Exchange ${exchangeId} is not supported by CCXT`);
        }
      } catch (error) {
        logger.error(`Error checking CCXT support for ${exchangeId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    logger.info(`CCXT initialized. Available exchanges: ${this.supportedExchanges.join(', ')}`);
  }

  /**
   * Create an exchange instance with provided credentials
   */
  public createExchangeInstance(
    exchangeId: string,
    apiKey?: string,
    secret?: string,
    password?: string,
    options: any = {}
  ): ccxt.Exchange | null {
    try {
      if (!this.supportedExchanges.includes(exchangeId)) {
        logger.warn(`Exchange ${exchangeId} is not in the supported list`);
      }

      if (!ccxt.exchanges.includes(exchangeId)) {
        logger.error(`Exchange ${exchangeId} is not supported by CCXT`);
        return null;
      }

      // Create exchange instance
      const exchangeClass = ccxt[exchangeId as keyof typeof ccxt];
      
      if (!exchangeClass || typeof exchangeClass !== 'function') {
        logger.error(`Failed to load exchange class for ${exchangeId}`);
        return null;
      }

      const config: any = {
        enableRateLimit: true,
        ...options
      };

      if (apiKey && secret) {
        config.apiKey = apiKey;
        config.secret = secret;
        
        if (password) {
          config.password = password;
        }
      }

      const exchange = new exchangeClass(config);
      this.exchanges.set(exchangeId, exchange);
      
      logger.info(`Created ${exchangeId} exchange instance${apiKey ? ' with authentication' : ' (public access only)'}`);
      return exchange;
    } catch (error) {
      logger.error(`Failed to create ${exchangeId} exchange instance: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Get an exchange instance, create if doesn't exist
   */
  public getExchange(
    exchangeId: string,
    apiKey?: string,
    secret?: string,
    password?: string
  ): ccxt.Exchange | null {
    // If already exists, return it
    if (this.exchanges.has(exchangeId)) {
      return this.exchanges.get(exchangeId) || null;
    }

    // Otherwise create new instance
    return this.createExchangeInstance(exchangeId, apiKey, secret, password);
  }

  /**
   * Remove an exchange instance
   */
  public removeExchange(exchangeId: string): boolean {
    if (this.exchanges.has(exchangeId)) {
      this.exchanges.delete(exchangeId);
      logger.info(`Removed ${exchangeId} exchange instance`);
      return true;
    }
    return false;
  }

  /**
   * Get exchange capabilities
   */
  public async getExchangeCapabilities(exchangeId: string): Promise<ExchangeCapabilities | null> {
    const cacheKey = `exchange_capabilities_${exchangeId}`;
    const cachedCapabilities = cacheService.get<ExchangeCapabilities>(cacheKey);
    
    if (cachedCapabilities) {
      return cachedCapabilities;
    }

    const exchange = this.getExchange(exchangeId);
    
    if (!exchange) {
      return null;
    }

    try {
      await exchange.loadMarkets();

      const capabilities: ExchangeCapabilities = {
        exchange: exchangeId,
        hasFetchOHLCV: exchange.has['fetchOHLCV'],
        hasFetchOrderBook: exchange.has['fetchOrderBook'],
        hasFetchTicker: exchange.has['fetchTicker'],
        hasFetchTrades: exchange.has['fetchTrades'],
        hasFetchBalance: exchange.has['fetchBalance'],
        hasCreateOrder: exchange.has['createOrder'],
        hasCancelOrder: exchange.has['cancelOrder'],
        hasFetchOrders: exchange.has['fetchOrders'],
        hasFetchOpenOrders: exchange.has['fetchOpenOrders'],
        hasFetchClosedOrders: exchange.has['fetchClosedOrders'],
        hasFetchMyTrades: exchange.has['fetchMyTrades'],
        timeframes: Object.keys(exchange.timeframes || {}),
        symbols: Object.keys(exchange.markets || {})
      };

      cacheService.setLong(cacheKey, capabilities);
      return capabilities;
    } catch (error) {
      logger.error(`Error fetching capabilities for ${exchangeId}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Fetch market data (OHLCV) for a symbol
   */
  public async fetchOHLCV(
    exchangeId: string,
    symbol: string,
    timeframe: string = '1h',
    since?: number,
    limit?: number
  ): Promise<MarketData[]> {
    const exchange = this.getExchange(exchangeId);
    
    if (!exchange || !exchange.has['fetchOHLCV']) {
      logger.error(`Exchange ${exchangeId} does not support fetchOHLCV`);
      return [];
    }

    try {
      await exchange.loadMarkets();
      
      if (!exchange.markets[symbol]) {
        logger.error(`Symbol ${symbol} not found on ${exchangeId}`);
        return [];
      }

      const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, since, limit);
      
      return ohlcv.map(candle => ({
        symbol,
        timestamp: candle[0],
        datetime: new Date(candle[0]).toISOString(),
        open: candle[1],
        high: candle[2],
        low: candle[3],
        close: candle[4],
        volume: candle[5],
        exchange: exchangeId
      }));
    } catch (error) {
      logger.error(`Error fetching OHLCV for ${symbol} on ${exchangeId}: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Fetch account balance
   */
  public async fetchBalance(
    exchangeId: string,
    apiKey: string,
    secret: string,
    password?: string
  ): Promise<any> {
    const exchange = this.getExchange(exchangeId, apiKey, secret, password);
    
    if (!exchange || !exchange.has['fetchBalance']) {
      logger.error(`Exchange ${exchangeId} does not support fetchBalance or missing credentials`);
      return null;
    }

    try {
      const balance = await exchange.fetchBalance();
      logger.debug(`Fetched balance for ${exchangeId}`);
      return balance;
    } catch (error) {
      logger.error(`Error fetching balance on ${exchangeId}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Create an order
   */
  public async createOrder(
    exchangeId: string,
    apiKey: string,
    secret: string,
    orderParams: OrderParams,
    password?: string
  ): Promise<any> {
    const exchange = this.getExchange(exchangeId, apiKey, secret, password);
    
    if (!exchange || !exchange.has['createOrder']) {
      logger.error(`Exchange ${exchangeId} does not support createOrder or missing credentials`);
      return null;
    }

    try {
      let order;
      
      if (orderParams.type === 'market') {
        order = await exchange.createMarketOrder(
          orderParams.symbol,
          orderParams.side,
          orderParams.amount,
          orderParams.price,
          orderParams.params
        );
      } else {
        order = await exchange.createLimitOrder(
          orderParams.symbol,
          orderParams.side,
          orderParams.amount,
          orderParams.price!,
          orderParams.params
        );
      }

      logger.info(`Created ${orderParams.side} ${orderParams.type} order for ${orderParams.amount} ${orderParams.symbol} on ${exchangeId}`);
      return order;
    } catch (error) {
      logger.error(`Error creating order on ${exchangeId}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Cancel an order
   */
  public async cancelOrder(
    exchangeId: string,
    apiKey: string,
    secret: string,
    orderId: string,
    symbol: string,
    password?: string
  ): Promise<boolean> {
    const exchange = this.getExchange(exchangeId, apiKey, secret, password);
    
    if (!exchange || !exchange.has['cancelOrder']) {
      logger.error(`Exchange ${exchangeId} does not support cancelOrder or missing credentials`);
      return false;
    }

    try {
      await exchange.cancelOrder(orderId, symbol);
      logger.info(`Canceled order ${orderId} for ${symbol} on ${exchangeId}`);
      return true;
    } catch (error) {
      logger.error(`Error canceling order on ${exchangeId}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Fetch my trades
   */
  public async fetchMyTrades(
    exchangeId: string,
    apiKey: string,
    secret: string,
    symbol?: string,
    since?: number,
    limit?: number,
    password?: string
  ): Promise<any[]> {
    const exchange = this.getExchange(exchangeId, apiKey, secret, password);
    
    if (!exchange || !exchange.has['fetchMyTrades']) {
      logger.error(`Exchange ${exchangeId} does not support fetchMyTrades or missing credentials`);
      return [];
    }

    try {
      const trades = await exchange.fetchMyTrades(symbol, since, limit);
      logger.debug(`Fetched ${trades.length} trades for ${symbol || 'all symbols'} on ${exchangeId}`);
      return trades;
    } catch (error) {
      logger.error(`Error fetching trades on ${exchangeId}: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Fetch ticker for a symbol
   */
  public async fetchTicker(exchangeId: string, symbol: string): Promise<any> {
    const cacheKey = `ticker_${exchangeId}_${symbol}`;
    const cachedTicker = cacheService.get(cacheKey);
    
    if (cachedTicker) {
      return cachedTicker;
    }

    const exchange = this.getExchange(exchangeId);
    
    if (!exchange || !exchange.has['fetchTicker']) {
      logger.error(`Exchange ${exchangeId} does not support fetchTicker`);
      return null;
    }

    try {
      const ticker = await exchange.fetchTicker(symbol);
      cacheService.setShort(cacheKey, ticker);
      return ticker;
    } catch (error) {
      logger.error(`Error fetching ticker for ${symbol} on ${exchangeId}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Calculate position size based on risk parameters
   */
  public calculatePositionSize(
    accountBalance: number,
    riskPercentage: number,
    entryPrice: number,
    stopLoss: number
  ): number {
    try {
      // Convert to Decimal for precise calculation
      const balance = new Decimal(accountBalance);
      const risk = new Decimal(riskPercentage).div(100);
      const entry = new Decimal(entryPrice);
      const stop = new Decimal(stopLoss);
      
      // Calculate risk amount
      const riskAmount = balance.mul(risk);
      
      // Calculate position size
      const priceDifference = entry.sub(stop).abs();
      const positionSize = riskAmount.div(priceDifference);
      
      return positionSize.toNumber();
    } catch (error) {
      logger.error(`Error calculating position size: ${error instanceof Error ? error.message : String(error)}`);
      return 0;
    }
  }

  /**
   * Sync market data for all supported exchanges and symbols
   */
  public async syncMarketData(): Promise<void> {
    logger.info('Starting market data synchronization');
    
    for (const exchangeId of this.supportedExchanges) {
      try {
        const exchange = this.getExchange(exchangeId);
        
        if (!exchange) {
          continue;
        }
        
        await exchange.loadMarkets();
        const symbols = Object.keys(exchange.markets || {}).filter(s => 
          s.includes('/USDT') || s.includes('/USD') || s.includes('/BUSD')
        ).slice(0, 10); // Limit to top 10 pairs
        
        logger.info(`Syncing market data for ${exchangeId}: ${symbols.length} symbols`);
        
        for (const symbol of symbols) {
          try {
            if (exchange.has['fetchOHLCV']) {
              await this.fetchOHLCV(exchangeId, symbol, '1h', undefined, 100);
              logger.debug(`Synced OHLCV for ${symbol} on ${exchangeId}`);
            }
            
            if (exchange.has['fetchTicker']) {
              await this.fetchTicker(exchangeId, symbol);
              logger.debug(`Synced ticker for ${symbol} on ${exchangeId}`);
            }
          } catch (err) {
            logger.error(`Error syncing ${symbol} on ${exchangeId}: ${err instanceof Error ? err.message : String(err)}`);
          }
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        logger.error(`Error syncing market data for ${exchangeId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    logger.info('Market data synchronization completed');
  }
}

// Export singleton instance
export const ccxtService = CCXTService.getInstance();
