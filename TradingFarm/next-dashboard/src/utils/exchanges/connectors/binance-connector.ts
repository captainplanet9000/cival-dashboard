/**
 * Binance Exchange Connector
 * 
 * Implementation of the ExchangeConnector interface for Binance.
 * Uses CCXT library to handle API interactions.
 */

import ccxt from 'ccxt';
import { 
  ApiCredentials, 
  ExchangeConfig, 
  MarketData, 
  OrderParams, 
  OrderResult, 
  OrderStatus, 
  OrderStatusType,
  AccountInfo, 
  Balance,
  MarketSymbol,
  ExchangeCapabilities,
  OrderType,
  OrderSide,
  TimeInForce,
  OrderBook,
} from '../exchange-types';
import { ExchangeConnector } from '../exchange-connector';
import { ExchangeId } from '../../websocket/websocket-types';

export class BinanceConnector implements ExchangeConnector {
  readonly exchangeId: ExchangeId = 'binance';
  readonly name: string = 'Binance';
  
  private exchange: ccxt.binance;
  private connected: boolean = false;
  private capabilities: ExchangeCapabilities;
  private symbolCache: MarketSymbol[] = [];
  private symbolLastUpdate: number = 0;
  
  constructor(config: ExchangeConfig) {
    // Create ccxt exchange instance
    this.exchange = new ccxt.binance({
      apiKey: config.credentials.apiKey,
      secret: config.credentials.apiSecret,
      enableRateLimit: true,
      options: {
        adjustForTimeDifference: true,
        recvWindow: 60000, // Increased receive window for slower connections
        ...config.defaultOptions
      }
    });
    
    // Set up exchange capabilities
    this.capabilities = {
      exchange: this.exchangeId,
      hasFetchTickers: true,
      hasFetchOHLCV: true,
      hasFetchOrderBook: true,
      supportedOrderTypes: [
        OrderType.MARKET, 
        OrderType.LIMIT, 
        OrderType.STOP_LOSS, 
        OrderType.STOP_LIMIT,
        OrderType.TAKE_PROFIT,
        OrderType.TAKE_PROFIT_LIMIT
      ],
      supportedTimeInForceOptions: [
        TimeInForce.GTC,
        TimeInForce.IOC,
        TimeInForce.FOK
      ],
      supportsFutures: true,
      supportsMargin: true,
      supportsSpot: true,
      fetchDepositAddress: true,
      fetchWithdrawals: true,
      fetchDeposits: true,
      rateLimits: {
        maxRequestsPerSecond: 10,
        maxRequestsPerMinute: 1200,
        maxRequestsPerHour: 48000
      }
    };
  }
  
  /**
   * Connect to the exchange API
   */
  async connect(): Promise<boolean> {
    try {
      // Load markets to initialize the exchange
      await this.exchange.loadMarkets();
      this.connected = true;
      return true;
    } catch (error) {
      console.error('Failed to connect to Binance:', error);
      this.connected = false;
      return false;
    }
  }
  
  /**
   * Test API key permissions and connection status
   */
  async testConnection(): Promise<{
    success: boolean;
    hasTrading: boolean;
    hasMargin: boolean;
    hasFutures: boolean;
    hasWithdraw: boolean;
    message?: string;
  }> {
    try {
      // Check if we're connected
      if (!this.connected) {
        await this.connect();
      }
      
      // Test the account endpoint to verify API key permissions
      const response = await this.exchange.fetchBalance();
      
      // For Binance, we need an additional call to check permissions
      const accountInfo = await this.exchange.privateGetAccount();
      
      const permissions = accountInfo.permissions || ['spot'];
      
      return {
        success: true,
        hasTrading: true, // If we can fetch balance, we can trade
        hasMargin: permissions.includes('margin'),
        hasFutures: permissions.includes('futures'),
        hasWithdraw: permissions.includes('withdrawals'),
      };
    } catch (error: any) {
      return {
        success: false,
        hasTrading: false,
        hasMargin: false,
        hasFutures: false,
        hasWithdraw: false,
        message: error.message || 'Failed to test connection'
      };
    }
  }
  
  /**
   * Get market data for a symbol
   */
  async getMarketData(symbol: string): Promise<MarketData> {
    try {
      // Ensure the symbol is in the correct format
      const formattedSymbol = this.formatSymbol(symbol);
      
      // Fetch ticker data
      const ticker = await this.exchange.fetchTicker(formattedSymbol);
      
      // Convert to our standard format
      return {
        symbol: symbol,
        timestamp: ticker.timestamp,
        bid: ticker.bid,
        ask: ticker.ask,
        last: ticker.last,
        high: ticker.high,
        low: ticker.low,
        volume: ticker.volume,
        quoteVolume: ticker.quoteVolume || 0,
        change: ticker.change || 0,
        changePercent: ticker.percentage || 0,
        vwap: ticker.vwap,
        open: ticker.open,
        close: ticker.close
      };
    } catch (error) {
      console.error(`Failed to get market data for ${symbol}:`, error);
      throw error;
    }
  }
  
  /**
   * Get multiple market data at once
   */
  async getMultipleMarketData(symbols: string[]): Promise<Map<string, MarketData>> {
    const results = new Map<string, MarketData>();
    
    try {
      // Format all symbols
      const formattedSymbols = symbols.map(s => this.formatSymbol(s));
      
      // Fetch all tickers at once if possible
      const tickers = await this.exchange.fetchTickers(formattedSymbols);
      
      // Process each ticker
      for (const [tickerSymbol, ticker] of Object.entries(tickers)) {
        // Find the original symbol
        const originalSymbol = symbols.find(s => this.formatSymbol(s) === tickerSymbol) || tickerSymbol;
        
        results.set(originalSymbol, {
          symbol: originalSymbol,
          timestamp: ticker.timestamp,
          bid: ticker.bid,
          ask: ticker.ask,
          last: ticker.last,
          high: ticker.high,
          low: ticker.low,
          volume: ticker.volume,
          quoteVolume: ticker.quoteVolume || 0,
          change: ticker.change || 0,
          changePercent: ticker.percentage || 0,
          vwap: ticker.vwap,
          open: ticker.open,
          close: ticker.close
        });
      }
      
      return results;
    } catch (error) {
      // If bulk fetch fails, fall back to individual fetches
      console.warn('Bulk market data fetch failed, falling back to individual fetches');
      
      for (const symbol of symbols) {
        try {
          const marketData = await this.getMarketData(symbol);
          results.set(symbol, marketData);
        } catch (error) {
          console.error(`Failed to get market data for ${symbol}:`, error);
        }
      }
      
      return results;
    }
  }
  
  /**
   * Place an order on the exchange
   */
  async placeOrder(params: OrderParams): Promise<OrderResult> {
    try {
      // Format the symbol
      const formattedSymbol = this.formatSymbol(params.symbol);
      
      // Map our order type to CCXT format
      const type = this.mapOrderType(params.type);
      
      // Map our side to CCXT format
      const side = params.side.toLowerCase();
      
      // Prepare order parameters
      const orderParams: any = {
        symbol: formattedSymbol,
        type,
        side,
        amount: params.amount
      };
      
      // Add price for limit orders
      if (params.price && type !== 'market') {
        orderParams.price = params.price;
      }
      
      // Add stop price for stop orders
      if (params.stopPrice && (type === 'stop' || type === 'stop_limit')) {
        orderParams.stopPrice = params.stopPrice;
      }
      
      // Add time in force for limit orders
      if (params.timeInForce && type !== 'market') {
        orderParams.timeInForce = this.mapTimeInForce(params.timeInForce);
      }
      
      // Add client order ID if provided
      if (params.clientOrderId) {
        orderParams.clientOrderId = params.clientOrderId;
      }
      
      // Add additional parameters
      if (params.params) {
        Object.assign(orderParams, params.params);
      }
      
      // Place the order
      const order = await this.exchange.createOrder(
        formattedSymbol,
        type,
        side,
        params.amount,
        params.price,
        orderParams
      );
      
      // Convert to our standard format
      return this.mapOrderToOrderResult(order);
    } catch (error) {
      console.error(`Failed to place order for ${params.symbol}:`, error);
      throw error;
    }
  }
  
  /**
   * Cancel an existing order
   */
  async cancelOrder(orderId: string, symbol: string): Promise<boolean> {
    try {
      // Format the symbol
      const formattedSymbol = this.formatSymbol(symbol);
      
      // Cancel the order
      await this.exchange.cancelOrder(orderId, formattedSymbol);
      
      return true;
    } catch (error) {
      console.error(`Failed to cancel order ${orderId} for ${symbol}:`, error);
      return false;
    }
  }
  
  /**
   * Get status of an existing order
   */
  async getOrderStatus(orderId: string, symbol: string): Promise<OrderStatus> {
    try {
      // Format the symbol
      const formattedSymbol = this.formatSymbol(symbol);
      
      // Get the order
      const order = await this.exchange.fetchOrder(orderId, formattedSymbol);
      
      // Convert to our standard format
      return this.mapOrderToOrderStatus(order);
    } catch (error) {
      console.error(`Failed to get order status for ${orderId} (${symbol}):`, error);
      throw error;
    }
  }
  
  /**
   * Get all open orders
   */
  async getOpenOrders(symbol?: string): Promise<OrderStatus[]> {
    try {
      // Format the symbol if provided
      const formattedSymbol = symbol ? this.formatSymbol(symbol) : undefined;
      
      // Get open orders
      const orders = await this.exchange.fetchOpenOrders(formattedSymbol);
      
      // Convert to our standard format
      return orders.map(order => this.mapOrderToOrderStatus(order));
    } catch (error) {
      console.error('Failed to get open orders:', error);
      throw error;
    }
  }
  
  /**
   * Get historical orders
   */
  async getOrderHistory(symbol?: string, limit?: number, since?: number): Promise<OrderStatus[]> {
    try {
      // Format the symbol if provided
      const formattedSymbol = symbol ? this.formatSymbol(symbol) : undefined;
      
      // Get order history
      const orders = await this.exchange.fetchClosedOrders(formattedSymbol, since, limit);
      
      // Convert to our standard format
      return orders.map(order => this.mapOrderToOrderStatus(order));
    } catch (error) {
      console.error('Failed to get order history:', error);
      throw error;
    }
  }
  
  /**
   * Get account information including balances
   */
  async getAccountInfo(): Promise<AccountInfo> {
    try {
      // Fetch balance information
      const balanceData = await this.exchange.fetchBalance();
      
      // Convert to our standard format
      const balances = new Map<string, Balance>();
      
      // Process each currency
      for (const [currency, free] of Object.entries(balanceData.free)) {
        const used = balanceData.used[currency] || 0;
        const total = balanceData.total[currency] || 0;
        
        // Only include non-zero balances
        if (total > 0) {
          balances.set(currency, {
            currency,
            free,
            used,
            total
          });
        }
      }
      
      // Get account info to check permissions
      let permissions = {
        trading: true,
        margin: false,
        futures: false,
        withdraw: false
      };
      
      try {
        const accountInfo = await this.exchange.privateGetAccount();
        
        // Check permissions from the account info
        if (accountInfo.permissions) {
          permissions = {
            trading: true, // If we can fetch balance, we can trade
            margin: accountInfo.permissions.includes('margin'),
            futures: accountInfo.permissions.includes('futures'),
            withdraw: accountInfo.permissions.includes('withdrawals')
          };
        }
      } catch (e) {
        // If we can't fetch account info, assume basic permissions
        console.warn('Failed to fetch detailed account permissions:', e);
      }
      
      return {
        balances,
        permissions,
        tradingEnabled: permissions.trading,
        marginEnabled: permissions.margin,
        futuresEnabled: permissions.futures
      };
    } catch (error) {
      console.error('Failed to get account info:', error);
      throw error;
    }
  }
  
  /**
   * Get balances for specific currencies
   */
  async getBalances(currencies?: string[]): Promise<Map<string, Balance>> {
    try {
      // Fetch all balances
      const { balances } = await this.getAccountInfo();
      
      // Filter by requested currencies if provided
      if (currencies && currencies.length > 0) {
        const filteredBalances = new Map<string, Balance>();
        
        for (const currency of currencies) {
          const balance = balances.get(currency.toUpperCase());
          if (balance) {
            filteredBalances.set(currency, balance);
          }
        }
        
        return filteredBalances;
      }
      
      return balances;
    } catch (error) {
      console.error('Failed to get balances:', error);
      throw error;
    }
  }
  
  /**
   * Get available trading pairs from the exchange
   */
  async getAvailableSymbols(): Promise<MarketSymbol[]> {
    try {
      // Check cache first
      const now = Date.now();
      if (this.symbolCache.length > 0 && now - this.symbolLastUpdate < 3600000) { // 1 hour cache
        return this.symbolCache;
      }
      
      // Reload markets if needed
      if (!this.exchange.markets) {
        await this.exchange.loadMarkets();
      }
      
      // Convert to our standard format
      const symbols: MarketSymbol[] = [];
      
      for (const [symbol, market] of Object.entries(this.exchange.markets)) {
        // Skip inactive markets
        if (!market.active) continue;
        
        symbols.push({
          symbol: symbol,
          base: market.base,
          quote: market.quote,
          active: market.active,
          precision: {
            price: market.precision.price || 8,
            amount: market.precision.amount || 8
          },
          limits: {
            price: {
              min: market.limits?.price?.min,
              max: market.limits?.price?.max
            },
            amount: {
              min: market.limits?.amount?.min,
              max: market.limits?.amount?.max
            },
            cost: {
              min: market.limits?.cost?.min,
              max: market.limits?.cost?.max
            }
          },
          info: market.info
        });
      }
      
      // Update cache
      this.symbolCache = symbols;
      this.symbolLastUpdate = now;
      
      return symbols;
    } catch (error) {
      console.error('Failed to get available symbols:', error);
      throw error;
    }
  }
  
  /**
   * Get exchange capabilities and limitations
   */
  getExchangeCapabilities(): ExchangeCapabilities {
    return this.capabilities;
  }
  
  /**
   * Calculate trading fees
   */
  async calculateFees(symbol: string, side: OrderSide, amount: number, price: number): Promise<{
    percentage: number;
    cost: number;
    currency: string;
  }> {
    try {
      // Format the symbol
      const formattedSymbol = this.formatSymbol(symbol);
      
      // Make sure markets are loaded
      if (!this.exchange.markets) {
        await this.exchange.loadMarkets();
      }
      
      // Get market info
      const market = this.exchange.market(formattedSymbol);
      
      // Get fee info
      let feeTier;
      try {
        // Try to get account trading fee tier
        const response = await this.exchange.fetchTradingFee(formattedSymbol);
        feeTier = response;
      } catch (e) {
        // Fall back to default fees
        feeTier = {
          maker: market.maker || 0.001,
          taker: market.taker || 0.001
        };
      }
      
      // Use maker fee for limit orders, taker fee for market orders
      const feePercentage = side === OrderSide.BUY ? feeTier.taker : feeTier.maker;
      
      // Calculate cost
      const total = amount * price;
      const feeCost = total * feePercentage;
      
      return {
        percentage: feePercentage,
        cost: feeCost,
        currency: market.quote
      };
    } catch (error) {
      console.error(`Failed to calculate fees for ${symbol}:`, error);
      
      // Return a default estimate
      return {
        percentage: 0.001, // 0.1% default
        cost: amount * price * 0.001,
        currency: symbol.split('/')[1] || 'USDT'
      };
    }
  }
  
  /**
   * Format symbol to match exchange requirements
   */
  private formatSymbol(symbol: string): string {
    // Binance uses the standard BTC/USDT format from CCXT
    // But we'll handle different input formats
    
    // If already has a slash, just return
    if (symbol.includes('/')) {
      return symbol;
    }
    
    // If using dash format, convert to slash
    if (symbol.includes('-')) {
      return symbol.replace('-', '/');
    }
    
    // Handle formats like BTCUSDT -> BTC/USDT
    const commonQuotes = ['USDT', 'BTC', 'ETH', 'BNB', 'BUSD', 'USD', 'USDC'];
    
    for (const quote of commonQuotes) {
      if (symbol.endsWith(quote)) {
        const base = symbol.substring(0, symbol.length - quote.length);
        return `${base}/${quote}`;
      }
    }
    
    // Return as is if we can't parse it
    return symbol;
  }
  
  /**
   * Map our order type to CCXT format
   */
  private mapOrderType(type: OrderType): string {
    switch (type) {
      case OrderType.MARKET:
        return 'market';
      case OrderType.LIMIT:
        return 'limit';
      case OrderType.STOP_LOSS:
        return 'stop_loss';
      case OrderType.STOP_LIMIT:
        return 'stop_limit';
      case OrderType.TAKE_PROFIT:
        return 'take_profit';
      case OrderType.TAKE_PROFIT_LIMIT:
        return 'take_profit_limit';
      default:
        return 'limit';
    }
  }
  
  /**
   * Map our time in force to CCXT format
   */
  private mapTimeInForce(timeInForce: TimeInForce): string {
    switch (timeInForce) {
      case TimeInForce.GTC:
        return 'GTC';
      case TimeInForce.IOC:
        return 'IOC';
      case TimeInForce.FOK:
        return 'FOK';
      case TimeInForce.GTX:
        return 'GTX';
      default:
        return 'GTC';
    }
  }
  
  /**
   * Map CCXT order status to our format
   */
  private mapOrderStatus(status: string): OrderStatusType {
    switch (status) {
      case 'open':
        return OrderStatusType.OPEN;
      case 'closed':
        return OrderStatusType.CLOSED;
      case 'canceled':
        return OrderStatusType.CANCELED;
      case 'expired':
        return OrderStatusType.EXPIRED;
      case 'rejected':
        return OrderStatusType.REJECTED;
      default:
        return OrderStatusType.PENDING;
    }
  }
  
  /**
   * Map CCXT order to our OrderResult format
   */
  private mapOrderToOrderResult(order: any): OrderResult {
    return {
      id: order.id,
      clientOrderId: order.clientOrderId,
      timestamp: order.timestamp,
      status: this.mapOrderStatus(order.status),
      symbol: order.symbol,
      type: order.type as OrderType,
      side: order.side as OrderSide,
      price: order.price,
      amount: order.amount,
      filled: order.filled,
      remaining: order.remaining,
      cost: order.cost,
      fee: order.fee ? {
        cost: order.fee.cost,
        currency: order.fee.currency,
        rate: order.fee.rate
      } : undefined,
      trades: order.trades,
      raw: order
    };
  }
  
  /**
   * Map CCXT order to our OrderStatus format
   */
  private mapOrderToOrderStatus(order: any): OrderStatus {
    const result = this.mapOrderToOrderResult(order);
    
    return {
      ...result,
      lastTradeTimestamp: order.lastTradeTimestamp,
      average: order.average
    };
  }
  
  /**
   * Get order book for a symbol
   */
  async getOrderBook(symbol: string, limit?: number): Promise<OrderBook> {
    try {
      // Format the symbol
      const formattedSymbol = this.formatSymbol(symbol);
      
      // Fetch order book
      const orderbook = await this.exchange.fetchOrderBook(formattedSymbol, limit);
      
      return {
        symbol: symbol,
        timestamp: orderbook.timestamp,
        bids: orderbook.bids,
        asks: orderbook.asks,
        nonce: orderbook.nonce
      };
    } catch (error) {
      console.error(`Failed to get order book for ${symbol}:`, error);
      throw error;
    }
  }
}
