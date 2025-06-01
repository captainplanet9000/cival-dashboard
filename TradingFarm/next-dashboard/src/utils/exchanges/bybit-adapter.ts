import { ExchangeAdapter, ExchangeCredentials, ConnectionResult, Market, Ticker, OrderBook, 
  Subscription, Balance, Position, OrderRequest, Order, Trade, PublicTrade } from './exchange-adapter';
import { createHmac } from 'crypto';

/**
 * Bybit Exchange Adapter
 * Implements the ExchangeAdapter interface for Bybit API
 */
export class BybitAdapter implements ExchangeAdapter {
  private apiKey: string = '';
  private apiSecret: string = '';
  private isTestnet: boolean = false;
  private baseUrl: string = '';
  private wsUrl: string = '';
  private isConnected: boolean = false;
  private websocket: WebSocket | null = null;
  private subscriptions: Map<string, Subscription> = new Map();

  /**
   * Connect to Bybit with API credentials
   */
  async connect(credentials: ExchangeCredentials): Promise<ConnectionResult> {
    try {
      this.apiKey = credentials.apiKey;
      this.apiSecret = credentials.apiSecret;
      this.isTestnet = credentials.isTestnet || false;

      // Set base URLs based on testnet or mainnet
      if (this.isTestnet) {
        this.baseUrl = 'https://api-testnet.bybit.com';
        this.wsUrl = 'wss://stream-testnet.bybit.com/v5/public';
      } else {
        this.baseUrl = 'https://api.bybit.com';
        this.wsUrl = 'wss://stream.bybit.com/v5/public';
      }

      // Test connection with a wallet balance request
      const balances = await this.getBalances();
      
      this.isConnected = true;
      return {
        success: true,
        message: `Successfully connected to Bybit ${this.isTestnet ? 'Testnet' : 'Mainnet'}`,
        permissions: {
          trading: true,
          margin: true,
          futures: true,
          withdrawal: false // Assume no withdrawal permission unless specified
        }
      };
    } catch (error) {
      this.isConnected = false;
      return {
        success: false,
        message: `Failed to connect to Bybit: ${error.message}`
      };
    }
  }

  /**
   * Disconnect from Bybit
   */
  async disconnect(): Promise<void> {
    this.closeWebsocket();
    this.isConnected = false;
    this.apiKey = '';
    this.apiSecret = '';
  }

  /**
   * Check if connected to Bybit
   */
  async checkConnection(): Promise<boolean> {
    if (!this.isConnected) return false;
    
    try {
      await this.getBalances();
      return true;
    } catch (error) {
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Get available markets from Bybit
   */
  async getMarkets(): Promise<Market[]> {
    const spotMarkets = await this.sendRequest('/v5/market/instruments-info?category=spot', 'GET');
    const linearMarkets = await this.sendRequest('/v5/market/instruments-info?category=linear', 'GET');
    
    const markets: Market[] = [];
    
    // Process spot markets
    if (spotMarkets.result?.list) {
      for (const item of spotMarkets.result.list) {
        markets.push({
          symbol: item.symbol,
          baseCurrency: item.baseCoin,
          quoteCurrency: item.quoteCoin,
          pricePrecision: parseInt(item.priceScale),
          quantityPrecision: parseInt(item.lotSizeScale),
          minQuantity: parseFloat(item.minOrderQty),
          maxQuantity: parseFloat(item.maxOrderQty),
          minNotional: parseFloat(item.minNotional),
          status: item.status === 'Trading' ? 'active' : 'inactive',
          type: 'spot',
          metadata: {
            leverageFilter: null,
            marketTakeBound: parseFloat(item.takerFeeRate)
          }
        });
      }
    }
    
    // Process linear perpetual futures markets
    if (linearMarkets.result?.list) {
      for (const item of linearMarkets.result.list) {
        markets.push({
          symbol: item.symbol,
          baseCurrency: item.baseCoin,
          quoteCurrency: item.quoteCoin,
          pricePrecision: parseInt(item.priceScale),
          quantityPrecision: parseInt(item.lotSizeScale),
          minQuantity: parseFloat(item.minOrderQty),
          maxQuantity: parseFloat(item.maxOrderQty),
          minNotional: parseFloat(item.minNotional || "0"),
          status: item.status === 'Trading' ? 'active' : 'inactive',
          type: 'futures',
          metadata: {
            leverageFilter: {
              minLeverage: parseInt(item.leverageFilter?.minLeverage || "1"),
              maxLeverage: parseInt(item.leverageFilter?.maxLeverage || "100")
            },
            marketTakeBound: parseFloat(item.takerFeeRate)
          }
        });
      }
    }
    
    return markets;
  }

  /**
   * Get ticker for a symbol
   */
  async getTicker(symbol: string): Promise<Ticker> {
    const response = await this.sendRequest(`/v5/market/tickers?category=spot&symbol=${symbol}`, 'GET');
    
    if (!response.result?.list || response.result.list.length === 0) {
      throw new Error(`No ticker data found for symbol ${symbol}`);
    }
    
    const ticker = response.result.list[0];
    
    return {
      symbol: ticker.symbol,
      bid: parseFloat(ticker.bid1Price),
      ask: parseFloat(ticker.ask1Price),
      last: parseFloat(ticker.lastPrice),
      high: parseFloat(ticker.highPrice24h),
      low: parseFloat(ticker.lowPrice24h),
      volume: parseFloat(ticker.volume24h),
      quoteVolume: parseFloat(ticker.turnover24h),
      timestamp: new Date(),
      percentChange24h: parseFloat(ticker.price24hPcnt) * 100
    };
  }

  /**
   * Get order book for a symbol
   */
  async getOrderBook(symbol: string, depth: number = 50): Promise<OrderBook> {
    const limit = depth <= 50 ? 50 : depth <= 200 ? 200 : 500;
    const response = await this.sendRequest(`/v5/market/orderbook?category=spot&symbol=${symbol}&limit=${limit}`, 'GET');
    
    if (!response.result) {
      throw new Error(`No orderbook data found for symbol ${symbol}`);
    }
    
    return {
      symbol: symbol,
      bids: response.result.b.slice(0, depth).map((bid: string[]) => [parseFloat(bid[0]), parseFloat(bid[1])]),
      asks: response.result.a.slice(0, depth).map((ask: string[]) => [parseFloat(ask[0]), parseFloat(ask[1])]),
      timestamp: new Date(response.result.ts)
    };
  }

  /**
   * Subscribe to ticker updates
   */
  async subscribeToTicker(symbol: string, callback: (ticker: Ticker) => void): Promise<Subscription> {
    const topic = `tickers.${symbol}`;
    const subscriptionId = topic;
    
    await this.initWebsocket();
    
    const message = {
      op: 'subscribe',
      args: [topic]
    };
    
    this.websocket?.send(JSON.stringify(message));
    
    const subscription: Subscription = {
      id: subscriptionId,
      unsubscribe: async () => {
        if (this.websocket?.readyState === WebSocket.OPEN) {
          this.websocket.send(JSON.stringify({
            op: 'unsubscribe',
            args: [topic]
          }));
        }
        this.subscriptions.delete(subscriptionId);
      }
    };
    
    this.subscriptions.set(subscriptionId, subscription);
    
    // Handle ticker messages from websocket
    this.handleWebsocketMessage((data) => {
      if (data.topic === topic) {
        const tickerData = data.data;
        
        const ticker: Ticker = {
          symbol: tickerData.symbol,
          bid: parseFloat(tickerData.bid1Price),
          ask: parseFloat(tickerData.ask1Price),
          last: parseFloat(tickerData.lastPrice),
          high: parseFloat(tickerData.highPrice24h),
          low: parseFloat(tickerData.lowPrice24h),
          volume: parseFloat(tickerData.volume24h),
          quoteVolume: parseFloat(tickerData.turnover24h),
          timestamp: new Date(tickerData.timestamp),
          percentChange24h: parseFloat(tickerData.price24hPcnt) * 100
        };
        
        callback(ticker);
      }
    });
    
    return subscription;
  }

  /**
   * Subscribe to order book updates
   */
  async subscribeToOrderBook(symbol: string, callback: (orderBook: OrderBook) => void): Promise<Subscription> {
    const topic = `orderbook.50.${symbol}`;
    const subscriptionId = topic;
    
    await this.initWebsocket();
    
    const message = {
      op: 'subscribe',
      args: [topic]
    };
    
    this.websocket?.send(JSON.stringify(message));
    
    const subscription: Subscription = {
      id: subscriptionId,
      unsubscribe: async () => {
        if (this.websocket?.readyState === WebSocket.OPEN) {
          this.websocket.send(JSON.stringify({
            op: 'unsubscribe',
            args: [topic]
          }));
        }
        this.subscriptions.delete(subscriptionId);
      }
    };
    
    this.subscriptions.set(subscriptionId, subscription);
    
    // Handle orderbook messages from websocket
    this.handleWebsocketMessage((data) => {
      if (data.topic === topic) {
        const obData = data.data;
        
        const orderBook: OrderBook = {
          symbol: symbol,
          bids: obData.b.map((item: string[]) => [parseFloat(item[0]), parseFloat(item[1])]),
          asks: obData.a.map((item: string[]) => [parseFloat(item[0]), parseFloat(item[1])]),
          timestamp: new Date(obData.ts)
        };
        
        callback(orderBook);
      }
    });
    
    return subscription;
  }

  /**
   * Subscribe to public trades
   */
  async subscribeToTrades(symbol: string, callback: (trade: PublicTrade) => void): Promise<Subscription> {
    const topic = `publicTrade.${symbol}`;
    const subscriptionId = topic;
    
    await this.initWebsocket();
    
    const message = {
      op: 'subscribe',
      args: [topic]
    };
    
    this.websocket?.send(JSON.stringify(message));
    
    const subscription: Subscription = {
      id: subscriptionId,
      unsubscribe: async () => {
        if (this.websocket?.readyState === WebSocket.OPEN) {
          this.websocket.send(JSON.stringify({
            op: 'unsubscribe',
            args: [topic]
          }));
        }
        this.subscriptions.delete(subscriptionId);
      }
    };
    
    this.subscriptions.set(subscriptionId, subscription);
    
    // Handle trade messages from websocket
    this.handleWebsocketMessage((data) => {
      if (data.topic === topic) {
        for (const tradeData of data.data) {
          const trade: PublicTrade = {
            id: tradeData.i,
            symbol: tradeData.s,
            price: parseFloat(tradeData.p),
            quantity: parseFloat(tradeData.v),
            side: tradeData.S.toLowerCase(),
            timestamp: new Date(tradeData.T)
          };
          
          callback(trade);
        }
      }
    });
    
    return subscription;
  }

  /**
   * Get account balances
   */
  async getBalances(): Promise<Balance[]> {
    const response = await this.sendSignedRequest('/v5/account/wallet-balance?accountType=UNIFIED', 'GET');
    
    if (!response.result?.list || response.result.list.length === 0) {
      return [];
    }
    
    const balances: Balance[] = [];
    
    for (const account of response.result.list) {
      for (const coin of account.coin) {
        balances.push({
          currency: coin.coin,
          total: parseFloat(coin.walletBalance),
          available: parseFloat(coin.availableToWithdraw),
          inOrder: parseFloat(coin.walletBalance) - parseFloat(coin.availableToWithdraw),
          btcValue: parseFloat(coin.btcValue || '0')
        });
      }
    }
    
    return balances;
  }

  /**
   * Get open positions
   */
  async getPositions(symbol?: string): Promise<Position[]> {
    let endpoint = '/v5/position/list?category=linear';
    
    if (symbol) {
      endpoint += `&symbol=${symbol}`;
    }
    
    const response = await this.sendSignedRequest(endpoint, 'GET');
    
    if (!response.result?.list) {
      return [];
    }
    
    const positions: Position[] = [];
    
    for (const pos of response.result.list) {
      // Skip empty positions
      if (parseFloat(pos.size) === 0) continue;
      
      positions.push({
        symbol: pos.symbol,
        side: parseFloat(pos.size) > 0 ? 'long' : 'short',
        quantity: Math.abs(parseFloat(pos.size)),
        entryPrice: parseFloat(pos.entryPrice),
        markPrice: parseFloat(pos.markPrice),
        liquidationPrice: parseFloat(pos.liqPrice),
        marginType: pos.tradeMode === 0 ? 'cross' : 'isolated',
        leverage: parseFloat(pos.leverage),
        unrealizedPnl: parseFloat(pos.unrealisedPnl),
        unrealizedPnlPercent: parseFloat(pos.unrealisedPnlPct) * 100,
        collateral: parseFloat(pos.positionIM),
        notional: parseFloat(pos.positionValue),
        timestamp: new Date()
      });
    }
    
    return positions;
  }

  /**
   * Place an order on Bybit
   */
  async placeOrder(params: OrderRequest): Promise<Order> {
    // Determine the category based on symbol type (spot or linear futures)
    const category = this.isFuturesSymbol(params.symbol) ? 'linear' : 'spot';
    
    const orderData: any = {
      category,
      symbol: params.symbol,
      side: params.side.toUpperCase(),
      orderType: this.mapOrderType(params.type),
      qty: params.quantity.toString()
    };
    
    if (params.price && params.type !== 'market') {
      orderData.price = params.price.toString();
    }
    
    if (params.timeInForce) {
      orderData.timeInForce = this.mapTimeInForce(params.timeInForce);
    } else {
      orderData.timeInForce = 'GTC';
    }
    
    if (params.clientOrderId) {
      orderData.orderLinkId = params.clientOrderId;
    }
    
    if (params.postOnly) {
      orderData.isLeverage = 0;
      orderData.orderFilter = 'Order';
    }
    
    if (params.reduceOnly) {
      orderData.reduceOnly = true;
    }
    
    if (category === 'linear' && params.leverage && params.leverage > 1) {
      // Set leverage first before placing the order
      try {
        await this.sendSignedRequest('/v5/position/set-leverage', 'POST', {
          category: 'linear',
          symbol: params.symbol,
          buyLeverage: params.leverage.toString(),
          sellLeverage: params.leverage.toString()
        });
      } catch (error) {
        console.error('Error setting leverage:', error);
        // Continue anyway, the order might still work with current leverage
      }
    }
    
    const response = await this.sendSignedRequest('/v5/order/create', 'POST', orderData);
    
    if (!response.result) {
      throw new Error(`Failed to place order: ${response.retMsg}`);
    }
    
    // Get the order details
    const order = await this.getOrder(response.result.orderId, params.symbol);
    return order;
  }

  /**
   * Cancel an order on Bybit
   */
  async cancelOrder(orderId: string, symbol: string): Promise<boolean> {
    // Determine the category based on symbol type
    const category = this.isFuturesSymbol(symbol) ? 'linear' : 'spot';
    
    const response = await this.sendSignedRequest('/v5/order/cancel', 'POST', {
      category,
      symbol,
      orderId
    });
    
    return response.retCode === 0;
  }

  /**
   * Get order details
   */
  async getOrder(orderId: string, symbol: string): Promise<Order> {
    // Determine the category based on symbol type
    const category = this.isFuturesSymbol(symbol) ? 'linear' : 'spot';
    
    const response = await this.sendSignedRequest(`/v5/order/history?category=${category}&symbol=${symbol}&orderId=${orderId}`, 'GET');
    
    if (!response.result?.list || response.result.list.length === 0) {
      throw new Error(`Order not found: ${orderId}`);
    }
    
    const orderData = response.result.list[0];
    return this.mapBybitOrder(orderData);
  }

  /**
   * Get open orders
   */
  async getOpenOrders(symbol?: string): Promise<Order[]> {
    const orders: Order[] = [];
    
    // Get spot open orders
    const spotEndpoint = symbol 
      ? `/v5/order/realtime?category=spot&symbol=${symbol}` 
      : `/v5/order/realtime?category=spot`;
    
    const spotResponse = await this.sendSignedRequest(spotEndpoint, 'GET');
    
    if (spotResponse.result?.list && spotResponse.result.list.length > 0) {
      for (const order of spotResponse.result.list) {
        orders.push(this.mapBybitOrder(order));
      }
    }
    
    // Get linear futures open orders if needed
    if (!symbol || this.isFuturesSymbol(symbol)) {
      const linearEndpoint = symbol 
        ? `/v5/order/realtime?category=linear&symbol=${symbol}` 
        : `/v5/order/realtime?category=linear`;
      
      const linearResponse = await this.sendSignedRequest(linearEndpoint, 'GET');
      
      if (linearResponse.result?.list && linearResponse.result.list.length > 0) {
        for (const order of linearResponse.result.list) {
          orders.push(this.mapBybitOrder(order));
        }
      }
    }
    
    return orders;
  }

  /**
   * Get order history
   */
  async getOrderHistory(symbol?: string, since?: Date, limit: number = 50): Promise<Order[]> {
    const orders: Order[] = [];
    const startTime = since ? since.getTime() : undefined;
    
    // Get spot order history
    const spotEndpoint = `/v5/order/history?category=spot${symbol ? `&symbol=${symbol}` : ''}${startTime ? `&startTime=${startTime}` : ''}&limit=${limit}`;
    const spotResponse = await this.sendSignedRequest(spotEndpoint, 'GET');
    
    if (spotResponse.result?.list && spotResponse.result.list.length > 0) {
      for (const order of spotResponse.result.list) {
        orders.push(this.mapBybitOrder(order));
      }
    }
    
    // Get linear futures order history if needed
    if (!symbol || this.isFuturesSymbol(symbol)) {
      const linearEndpoint = `/v5/order/history?category=linear${symbol ? `&symbol=${symbol}` : ''}${startTime ? `&startTime=${startTime}` : ''}&limit=${limit}`;
      const linearResponse = await this.sendSignedRequest(linearEndpoint, 'GET');
      
      if (linearResponse.result?.list && linearResponse.result.list.length > 0) {
        for (const order of linearResponse.result.list) {
          orders.push(this.mapBybitOrder(order));
        }
      }
    }
    
    return orders;
  }

  /**
   * Get trade history
   */
  async getTrades(symbol?: string, since?: Date, limit: number = 50): Promise<Trade[]> {
    const trades: Trade[] = [];
    const startTime = since ? since.getTime() : undefined;
    
    // Get trades from execution list
    const endpoint = `/v5/execution/list${symbol ? `&symbol=${symbol}` : ''}${startTime ? `&startTime=${startTime}` : ''}&limit=${limit}`;
    const response = await this.sendSignedRequest(endpoint, 'GET');
    
    if (response.result?.list && response.result.list.length > 0) {
      for (const execution of response.result.list) {
        trades.push({
          id: execution.execId,
          orderId: execution.orderId,
          symbol: execution.symbol,
          side: execution.side.toLowerCase(),
          quantity: parseFloat(execution.execQty),
          price: parseFloat(execution.execPrice),
          fee: parseFloat(execution.execFee),
          feeCurrency: execution.feeCurrency,
          timestamp: new Date(execution.execTime),
          rawExchangeData: execution
        });
      }
    }
    
    return trades;
  }

  /**
   * Initialize WebSocket connection
   */
  private async initWebsocket(): Promise<void> {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      return;
    }
    
    return new Promise((resolve, reject) => {
      this.closeWebsocket();
      
      this.websocket = new WebSocket(this.wsUrl);
      
      this.websocket.onopen = () => {
        console.log('Bybit WebSocket connected');
        resolve();
      };
      
      this.websocket.onerror = (error) => {
        console.error('Bybit WebSocket error:', error);
        reject(error);
      };
      
      this.websocket.onclose = () => {
        console.log('Bybit WebSocket closed');
      };
    });
  }

  /**
   * Close WebSocket connection
   */
  private closeWebsocket(): void {
    if (this.websocket) {
      try {
        this.websocket.close();
      } catch (error) {
        console.error('Error closing Bybit WebSocket:', error);
      } finally {
        this.websocket = null;
      }
    }
  }

  /**
   * Handle WebSocket messages
   */
  private handleWebsocketMessage(handler: (data: any) => void): void {
    if (!this.websocket) return;
    
    this.websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);
        handler(data);
      } catch (error) {
        console.error('Error handling Bybit WebSocket message:', error);
      }
    };
  }

  /**
   * Send unsigned API request to Bybit
   */
  private async sendRequest(endpoint: string, method: string, data?: any): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(url, options);
    const result = await response.json();
    
    if (result.retCode !== 0) {
      throw new Error(`Bybit API error: ${result.retMsg}`);
    }
    
    return result;
  }

  /**
   * Send signed API request to Bybit
   */
  private async sendSignedRequest(endpoint: string, method: string, data?: any): Promise<any> {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('Bybit API credentials not set');
    }
    
    const timestamp = Date.now().toString();
    const recvWindow = '5000';
    
    const params = method === 'GET' ? new URLSearchParams(endpoint.split('?')[1] || '') : new URLSearchParams();
    const queryString = params.toString();
    
    const payload = method === 'GET' 
      ? timestamp + this.apiKey + recvWindow + queryString
      : timestamp + this.apiKey + recvWindow + JSON.stringify(data || {});
    
    const signature = createHmac('sha256', this.apiSecret)
      .update(payload)
      .digest('hex');
    
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: HeadersInit = {
      'X-BAPI-API-KEY': this.apiKey,
      'X-BAPI-SIGN': signature,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': recvWindow,
      'Content-Type': 'application/json'
    };
    
    const options: RequestInit = {
      method,
      headers
    };
    
    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(url, options);
    const result = await response.json();
    
    if (result.retCode !== 0) {
      throw new Error(`Bybit API error: ${result.retMsg}`);
    }
    
    return result;
  }

  /**
   * Check if a symbol is a futures symbol (linear perpetual)
   */
  private isFuturesSymbol(symbol: string): boolean {
    // Typically futures symbols end with USDT
    return symbol.endsWith('USDT') && !symbol.includes('/');
  }

  /**
   * Map Bybit order to standardized Order format
   */
  private mapBybitOrder(bybitOrder: any): Order {
    return {
      id: bybitOrder.orderId,
      clientOrderId: bybitOrder.orderLinkId,
      symbol: bybitOrder.symbol,
      type: this.reverseMapOrderType(bybitOrder.orderType),
      side: bybitOrder.side.toLowerCase(),
      status: this.mapOrderStatus(bybitOrder.orderStatus),
      quantity: parseFloat(bybitOrder.qty),
      filledQuantity: parseFloat(bybitOrder.cumExecQty),
      remainingQuantity: parseFloat(bybitOrder.leavesQty),
      price: bybitOrder.price ? parseFloat(bybitOrder.price) : undefined,
      stopPrice: bybitOrder.triggerPrice ? parseFloat(bybitOrder.triggerPrice) : undefined,
      avgFillPrice: bybitOrder.avgPrice ? parseFloat(bybitOrder.avgPrice) : undefined,
      timestamp: new Date(bybitOrder.createdTime),
      lastUpdateTime: new Date(bybitOrder.updatedTime),
      timeInForce: this.reverseMapTimeInForce(bybitOrder.timeInForce),
      reduceOnly: bybitOrder.reduceOnly,
      postOnly: false, // Not directly indicated in API response
      rawExchangeData: bybitOrder
    };
  }

  /**
   * Map order type to Bybit format
   */
  private mapOrderType(type: string): string {
    switch (type) {
      case 'market':
        return 'Market';
      case 'limit':
        return 'Limit';
      case 'stop':
        return 'Market';
      case 'stop_limit':
        return 'Limit';
      case 'post_only':
        return 'Limit';
      default:
        return 'Limit';
    }
  }

  /**
   * Reverse map order type from Bybit format
   */
  private reverseMapOrderType(type: string): string {
    switch (type) {
      case 'Market':
        return 'market';
      case 'Limit':
        return 'limit';
      default:
        return type.toLowerCase();
    }
  }

  /**
   * Map time in force to Bybit format
   */
  private mapTimeInForce(timeInForce: string): string {
    switch (timeInForce) {
      case 'GTC':
        return 'GTC';
      case 'IOC':
        return 'IOC';
      case 'FOK':
        return 'FOK';
      default:
        return 'GTC';
    }
  }

  /**
   * Reverse map time in force from Bybit format
   */
  private reverseMapTimeInForce(timeInForce: string): string {
    return timeInForce;
  }

  /**
   * Map order status from Bybit format
   */
  private mapOrderStatus(status: string): 'new' | 'open' | 'partially_filled' | 'filled' | 'canceled' | 'rejected' | 'expired' {
    switch (status) {
      case 'Created':
        return 'new';
      case 'New':
        return 'new';
      case 'Active':
        return 'open';
      case 'PartiallyFilled':
        return 'partially_filled';
      case 'Filled':
        return 'filled';
      case 'Cancelled':
        return 'canceled';
      case 'Rejected':
        return 'rejected';
      case 'Triggered':
        return 'open';
      case 'Deactivated':
        return 'canceled';
      default:
        return 'open';
    }
  }
}
