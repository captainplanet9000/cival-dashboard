/**
 * HyperLiquid Exchange Connector
 * 
 * Implementation of the ExchangeConnector interface for HyperLiquid.
 * Uses direct API integration with HyperLiquid's API endpoints.
 */

import { createHmac } from 'crypto';
import { Wallet, Contract } from 'ethers';
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

export class HyperliquidConnector implements ExchangeConnector {
  readonly exchangeId: ExchangeId = 'hyperliquid' as ExchangeId;
  readonly name: string = 'HyperLiquid';
  
  private baseUrl: string = 'https://api.hyperliquid.xyz';
  private wsUrl: string = 'wss://api.hyperliquid.xyz/ws';
  private connected: boolean = false;
  private wallet: Wallet | null = null;
  private chainId: number = 1; // Mainnet by default
  private exchange: Contract | null = null;
  private symbolCache: MarketSymbol[] = [];
  private symbolLastUpdate: number = 0;
  
  private capabilities: ExchangeCapabilities = {
    exchange: this.exchangeId,
    hasFetchTickers: true,
    hasFetchOHLCV: true,
    hasFetchOrderBook: true,
    supportedOrderTypes: [
      OrderType.MARKET, 
      OrderType.LIMIT, 
      OrderType.STOP_LOSS, 
      OrderType.STOP_LIMIT
    ],
    supportedTimeInForceOptions: [
      TimeInForce.GTC,
      TimeInForce.IOC,
      TimeInForce.FOK
    ],
    supportsFutures: true,
    supportsMargin: true,
    supportsSpot: false, // HyperLiquid only supports perpetual futures
    fetchDepositAddress: true,
    fetchWithdrawals: true,
    fetchDeposits: true,
    rateLimits: {
      maxRequestsPerSecond: 10,
      maxRequestsPerMinute: 600,
      maxRequestsPerHour: 10000
    }
  };
  
  constructor(config: ExchangeConfig) {
    if (config.credentials.passphrase) {
      // Use private key if available (should be stored securely)
      this.wallet = new Wallet(config.credentials.passphrase);
    }
    
    // For sandbox/testnet
    if (config.credentials.sandboxMode) {
      this.baseUrl = 'https://api.testnet.hyperliquid.xyz';
      this.wsUrl = 'wss://api.testnet.hyperliquid.xyz/ws';
      this.chainId = 5; // Testnet (goerli)
    }
  }
  
  /**
   * Connect to the exchange API
   */
  async connect(): Promise<boolean> {
    try {
      if (!this.wallet) {
        throw new Error('HyperLiquid connection requires a private key');
      }
      
      // Load universe metadata
      const universeResponse = await this.sendRequest('/info', 'GET');
      if (!universeResponse || !universeResponse.universe) {
        throw new Error('Failed to fetch HyperLiquid universe metadata');
      }
      
      // Test authentication with a user data request
      await this.getUserData();
      
      this.connected = true;
      return true;
    } catch (error) {
      console.error('Failed to connect to HyperLiquid:', error);
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
      if (!this.wallet) {
        return {
          success: false,
          hasTrading: false,
          hasMargin: false,
          hasFutures: false,
          hasWithdraw: false,
          message: 'Missing private key'
        };
      }
      
      // Test authentication
      const userData = await this.getUserData();
      
      return {
        success: true,
        hasTrading: true, // HyperLiquid always enables trading
        hasMargin: true,  // HyperLiquid is margin/futures only
        hasFutures: true, // HyperLiquid is futures-focused
        hasWithdraw: false // Withdrawals are handled via the blockchain, not API
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to test connection';
      return {
        success: false,
        hasTrading: false,
        hasMargin: false,
        hasFutures: false,
        hasWithdraw: false,
        message: errorMessage
      };
    }
  }
  
  /**
   * Get market data for a symbol
   */
  async getMarketData(symbol: string): Promise<MarketData> {
    try {
      // Fetch market data
      const marketDataResponse = await this.sendRequest('/info', 'GET');
      
      // Find the specific asset in the response
      const assetIndex = marketDataResponse.universe.metas.findIndex(
        (meta: any) => meta.name === symbol
      );
      
      if (assetIndex === -1) {
        throw new Error(`Symbol ${symbol} not found`);
      }
      
      const metadata = marketDataResponse.universe.metas[assetIndex];
      const stateDayData = marketDataResponse.allMids[assetIndex];
      
      // Get the latest trades for this symbol
      const tradesResponse = await this.sendRequest('/trades', 'POST', {
        coin: symbol,
        limit: 100
      });
      
      // Calculate 24h high, low, and volume
      const nowSeconds = Math.floor(Date.now() / 1000);
      const day24hAgo = nowSeconds - 24 * 60 * 60;
      
      const candleResponse = await this.sendRequest('/candles', 'POST', {
        coin: symbol,
        interval: '1h',
        startTime: day24hAgo,
        endTime: nowSeconds
      });
      
      let volume24h = 0;
      let high24h = 0;
      let low24h = Number.MAX_VALUE;
      let open24h = 0;
      
      if (candleResponse && candleResponse.length > 0) {
        // First candle in the 24h period
        open24h = parseFloat(candleResponse[0].open);
        
        for (const candle of candleResponse) {
          volume24h += parseFloat(candle.volume);
          high24h = Math.max(high24h, parseFloat(candle.high));
          low24h = Math.min(low24h, parseFloat(candle.low));
        }
      }
      
      // Get latest price
      const latestPrice = parseFloat(stateDayData);
      
      // Calculate price change
      const change = latestPrice - open24h;
      const changePercent = open24h !== 0 ? (change / open24h) * 100 : 0;
      
      // Get order book to find bid and ask
      const orderBookResponse = await this.sendRequest('/orderbook', 'POST', {
        coin: symbol,
        depth: 1
      });
      
      const bestBid = orderBookResponse.bids.length > 0 ? parseFloat(orderBookResponse.bids[0][0]) : latestPrice;
      const bestAsk = orderBookResponse.asks.length > 0 ? parseFloat(orderBookResponse.asks[0][0]) : latestPrice;
      
      // Format to our standard MarketData
      return {
        symbol: symbol,
        timestamp: Date.now(),
        bid: bestBid,
        ask: bestAsk,
        last: latestPrice,
        high: high24h,
        low: low24h > 0 && low24h !== Number.MAX_VALUE ? low24h : 0, // Use 0 as fallback instead of undefined
        volume: volume24h,
        quoteVolume: volume24h * latestPrice, // Approximate
        change: change,
        changePercent: changePercent,
        vwap: 0, // Not provided by HyperLiquid, use 0 instead of undefined
        open: open24h || 0, // Use 0 as fallback instead of undefined
        close: latestPrice
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
    
    // Fetch universe info (contains all assets)
    const universeResponse = await this.sendRequest('/info', 'GET');
    
    // Process each symbol
    for (const symbol of symbols) {
      try {
        const marketData = await this.getMarketData(symbol);
        results.set(symbol, marketData);
      } catch (error) {
        console.error(`Error fetching market data for ${symbol}:`, error);
      }
    }
    
    return results;
  }
  
  /**
   * Place an order on the exchange
   */
  async placeOrder(params: OrderParams): Promise<OrderResult> {
    try {
      if (!this.wallet) {
        throw new Error('HyperLiquid wallet not initialized');
      }
      
      // Map order type to HyperLiquid format
      const orderType = this.mapOrderType(params.type);
      
      // Prepare base order data
      const orderData: any = {
        coin: params.symbol,
        is_buy: params.side === OrderSide.BUY,
        sz: params.amount.toString(),
        reduce_only: !!params.reduceOnly,
        client_id: params.clientOrderId || undefined
      };
      
      // Set specific order type details
      if (orderType === 'limit') {
        orderData.limit = {
          px: params.price?.toString(),
          tif: this.mapTimeInForce(params.timeInForce || TimeInForce.GTC)
        };
        
        if (params.postOnly) {
          orderData.limit.post_only = true;
        }
      } else if (orderType === 'market') {
        orderData.market = {};
      } else if (orderType === 'trigger') {
        orderData.trigger = {
          trigger_px: params.stopPrice?.toString(),
          is_market: params.type === OrderType.STOP_LOSS
        };
        
        if (params.type === OrderType.STOP_LIMIT && params.price) {
          orderData.trigger.limit_px = params.price.toString();
        }
      }
      
      // Sign and send order
      const signature = await this.signRequest('order', orderData);
      
      const response = await this.sendSignedRequest('/exchange/order', 'POST', {
        action: orderData,
        signature
      });
      
      if (!response.success) {
        throw new Error(`Order placement failed: ${response.message || 'Unknown error'}`);
      }
      
      // Get order details
      const order = response.data;
      
      // Convert to standard OrderResult format
      return {
        id: order.oid.toString(),
        clientOrderId: params.clientOrderId || '',
        timestamp: Date.now(),
        status: this.mapOrderStatus(order.status),
        symbol: params.symbol,
        type: params.type,
        side: params.side,
        price: params.price,
        amount: params.amount,
        filled: 0, // We don't get this info immediately
        remaining: params.amount,
        cost: 0, // We don't get this info immediately
        fee: undefined, // We don't get this info immediately
        raw: order
      };
    } catch (error) {
      console.error(`Failed to place order on HyperLiquid:`, error);
      throw error;
    }
  }
  
  /**
   * Cancel an existing order
   */
  async cancelOrder(orderId: string, symbol: string): Promise<boolean> {
    try {
      if (!this.wallet) {
        throw new Error('HyperLiquid wallet not initialized');
      }
      
      const cancelData = {
        coin: symbol,
        oid: parseInt(orderId)
      };
      
      const signature = await this.signRequest('cancel', cancelData);
      
      const response = await this.sendSignedRequest('/exchange/cancel', 'POST', {
        action: cancelData,
        signature
      });
      
      return response.success === true;
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
      if (!this.wallet) {
        throw new Error('HyperLiquid wallet not initialized');
      }
      
      // Get all open orders and find the specific one
      const openOrders = await this.getOpenOrders(symbol);
      const openOrder = openOrders.find(order => order.id === orderId);
      
      if (openOrder) {
        return openOrder;
      }
      
      // If not found in open orders, check order history
      const orderHistory = await this.getOrderHistory(symbol, undefined, 100);
      const historicalOrder = orderHistory.find(order => order.id === orderId);
      
      if (historicalOrder) {
        return historicalOrder;
      }
      
      throw new Error(`Order ${orderId} not found`);
    } catch (error) {
      console.error(`Failed to get order status for ${orderId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get all open orders
   */
  async getOpenOrders(symbol?: string): Promise<OrderStatus[]> {
    try {
      if (!this.wallet) {
        throw new Error('HyperLiquid wallet not initialized');
      }
      
      const userData = await this.getUserData();
      
      const openOrders: OrderStatus[] = [];
      
      for (const userAsset of userData.assetPositions) {
        // Skip if specific symbol requested and doesn't match
        if (symbol && userAsset.coin !== symbol) {
          continue;
        }
        
        if (userAsset.orders && userAsset.orders.length > 0) {
          for (const order of userAsset.orders) {
            openOrders.push(this.mapHyperliquidOrderToOrderStatus(order, userAsset.coin));
          }
        }
      }
      
      return openOrders;
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
      if (!this.wallet) {
        throw new Error('HyperLiquid wallet not initialized');
      }
      
      const address = this.wallet.address;
      
      const queryParams: any = {
        user: address,
        limit: limit || 100
      };
      
      if (symbol) {
        queryParams.coin = symbol;
      }
      
      if (since) {
        queryParams.startTime = since;
      }
      
      const response = await this.sendRequest('/fills', 'POST', queryParams);
      
      if (!response || !Array.isArray(response)) {
        throw new Error('Invalid response from HyperLiquid fills API');
      }
      
      // Map fills to order status
      return response.map((fill: any) => {
        const orderSide = fill.side === 'B' ? OrderSide.BUY : OrderSide.SELL;
        const amount = parseFloat(fill.sz);
        
        return {
          id: fill.oid.toString(),
          clientOrderId: '',
          symbol: fill.coin,
          type: this.getOrderTypeFromFill(fill),
          side: orderSide,
          status: OrderStatusType.CLOSED,
          amount: amount,                             // Added for OrderStatus compatibility
          filled: amount,                             // Added for OrderStatus compatibility
          remaining: 0,                               // Added for OrderStatus compatibility
          price: parseFloat(fill.px),
          stopPrice: undefined,
          lastTradeTimestamp: new Date(fill.time * 1000).getTime(),
          timestamp: new Date(fill.time * 1000).getTime(),
          average: parseFloat(fill.px),
          cost: amount * parseFloat(fill.px),         // Added for OrderStatus compatibility
          fee: {
            cost: parseFloat(fill.fee),
            currency: 'USD'
          },
          raw: fill
        };
      });
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
      if (!this.wallet) {
        throw new Error('HyperLiquid wallet not initialized');
      }
      
      const userData = await this.getUserData();
      
      // Calculate balances
      const balances = new Map<string, Balance>();
      
      // HyperLiquid primarily uses USD as the main currency
      balances.set('USD', {
        currency: 'USD',
        free: parseFloat(userData.marginSummary.accountValue),
        used: parseFloat(userData.marginSummary.accountValue) - parseFloat(userData.marginSummary.availableMargin),
        total: parseFloat(userData.marginSummary.accountValue)
      });
      
      // Add positions as additional "balances"
      for (const position of userData.assetPositions) {
        if (parseFloat(position.position.size) !== 0) {
          balances.set(position.coin, {
            currency: position.coin,
            free: parseFloat(position.position.size),
            used: 0,
            total: parseFloat(position.position.size)
          });
        }
      }
      
      return {
        balances,
        permissions: {
          trading: true,
          margin: true,
          futures: true,
          withdraw: false
        },
        tradingEnabled: true,
        marginEnabled: true,
        futuresEnabled: true
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
    const { balances } = await this.getAccountInfo();
    
    if (!currencies || currencies.length === 0) {
      return balances;
    }
    
    // Filter balances by requested currencies
    const filteredBalances = new Map<string, Balance>();
    
    for (const currency of currencies) {
      const balance = balances.get(currency.toUpperCase());
      if (balance) {
        filteredBalances.set(currency, balance);
      }
    }
    
    return filteredBalances;
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
      
      // Get HyperLiquid universe info
      const response = await this.sendRequest('/info', 'GET');
      
      const symbols: MarketSymbol[] = [];
      
      // Process each asset
      for (const meta of response.universe.metas) {
        symbols.push({
          symbol: meta.name,
          base: meta.name,
          quote: 'USD',
          active: true,
          precision: {
            price: meta.szDecimals || 8,
            amount: meta.szDecimals || 8
          },
          limits: {
            price: {
              min: undefined,
              max: undefined
            },
            amount: {
              min: 0.001,
              max: undefined
            },
            cost: {
              min: 1,
              max: undefined
            }
          },
          info: meta
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
    // HyperLiquid typically charges 0.05% for takers and 0.02% for makers
    // These should be fetched from the API when available
    const takerFee = 0.0005;
    const makerFee = 0.0002;
    
    // Use taker fee for calculation (worst case)
    const feePercentage = takerFee;
    const feeCost = amount * price * feePercentage;
    
    return {
      percentage: feePercentage,
      cost: feeCost,
      currency: 'USD'
    };
  }
  
  /**
   * Get user data from HyperLiquid
   */
  private async getUserData(): Promise<any> {
    if (!this.wallet) {
      throw new Error('HyperLiquid wallet not initialized');
    }
    
    // Get user data
    const response = await this.sendRequest('/user', 'POST', {
      user: this.wallet.address
    });
    
    if (!response || !response.marginSummary) {
      throw new Error('Invalid response from HyperLiquid user API');
    }
    
    return response;
  }
  
  /**
   * Sign a request to HyperLiquid
   * (Simplified signing mechanism - actual implementation would use proper EIP-712 signing)
   */
  private async signRequest(action: string, data: any): Promise<string> {
    if (!this.wallet) {
      throw new Error('HyperLiquid wallet not initialized');
    }
    
    // Simplified signing for demonstration
    // In production, would use proper EIP-712 signing
    const message = JSON.stringify({
      action,
      data,
      timestamp: Date.now()
    });
    
    return await this.wallet.signMessage(message);
  }
  
  /**
   * Send unsigned API request to HyperLiquid
   */
  private async sendRequest(endpoint: string, method: string, data?: any): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HyperLiquid API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  /**
   * Send signed API request to HyperLiquid
   */
  private async sendSignedRequest(endpoint: string, method: string, data: any): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    };
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HyperLiquid API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  /**
   * Map order type to HyperLiquid format
   */
  private mapOrderType(type: OrderType): string {
    switch (type) {
      case OrderType.MARKET:
        return 'market';
      case OrderType.LIMIT:
        return 'limit';
      case OrderType.STOP_LOSS:
      case OrderType.STOP_LIMIT:
      case OrderType.TAKE_PROFIT:
      case OrderType.TAKE_PROFIT_LIMIT:
        return 'trigger';
      default:
        return 'limit';
    }
  }
  
  /**
   * Map time in force to HyperLiquid format
   */
  private mapTimeInForce(timeInForce?: TimeInForce): string {
    switch (timeInForce) {
      case TimeInForce.IOC:
        return 'Ioc';
      case TimeInForce.FOK:
        return 'Fok';
      case TimeInForce.GTX:
        return 'Gtc'; // HyperLiquid doesn't support GTX directly
      case TimeInForce.GTC:
      default:
        return 'Gtc';
    }
  }
  
  /**
   * Map HyperLiquid order status to standardized format
   */
  private mapOrderStatus(status: string): OrderStatusType {
    switch (status) {
      case 'open':
        return OrderStatusType.OPEN;
      case 'filled':
        return OrderStatusType.CLOSED;
      case 'cancelled':
        return OrderStatusType.CANCELED;
      case 'rejected':
        return OrderStatusType.REJECTED;
      default:
        return OrderStatusType.PENDING;
    }
  }
  
  /**
   * Map HyperLiquid order to our OrderStatus format
   */
  private mapHyperliquidOrderToOrderStatus(order: any, symbol: string): OrderStatus {
    const isBuy = order.side === 'B';
    
    // Determine order type
    let orderType = OrderType.LIMIT;
    if (order.order_type?.market) {
      orderType = OrderType.MARKET;
    } else if (order.order_type?.trigger) {
      orderType = order.order_type.trigger.is_market ? OrderType.STOP_LOSS : OrderType.STOP_LIMIT;
    }
    
    // Determine order status
    let orderStatus = OrderStatusType.OPEN;
    if (order.status === 'filled') {
      orderStatus = OrderStatusType.CLOSED;
    } else if (order.status === 'cancelled') {
      orderStatus = OrderStatusType.CANCELED;
    } else if (order.status === 'rejected') {
      orderStatus = OrderStatusType.REJECTED;
    } else if (parseFloat(order.filled_sz || '0') > 0 && parseFloat(order.filled_sz || '0') < parseFloat(order.sz)) {
      orderStatus = OrderStatusType.PARTIALLY_FILLED;
    }
    
    return {
      id: order.oid.toString(),
      clientOrderId: order.cloid || '',
      timestamp: new Date(order.time * 1000).getTime(),
      status: orderStatus,
      symbol: symbol,
      type: orderType,
      side: isBuy ? OrderSide.BUY : OrderSide.SELL,
      price: parseFloat(order.limit_px || '0'),
      amount: parseFloat(order.sz),
      filled: parseFloat(order.filled_sz || '0'),
      remaining: parseFloat(order.sz) - parseFloat(order.filled_sz || '0'),
      cost: parseFloat(order.filled_sz || '0') * parseFloat(order.avg_px || order.limit_px || '0'),
      fee: undefined, // Not available from order data
      trades: undefined,
      lastTradeTimestamp: order.last_update_time ? new Date(order.last_update_time * 1000).getTime() : undefined,
      average: parseFloat(order.avg_px || '0'),
      raw: order
    };
  }
  
  /**
   * Determine order type from fill data
   */
  private getOrderTypeFromFill(fill: any): OrderType {
    if (fill.orderType === 'market') {
      return OrderType.MARKET;
    }
    if (fill.orderType === 'limit') {
      return OrderType.LIMIT;
    }
    if (fill.orderType === 'stopMarket') {
      return OrderType.STOP_LOSS;
    }
    if (fill.orderType === 'stopLimit') {
      return OrderType.STOP_LIMIT;
    }
    // Default
    return OrderType.LIMIT;
  }
}
