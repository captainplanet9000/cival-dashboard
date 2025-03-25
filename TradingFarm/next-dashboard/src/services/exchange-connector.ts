"use client";

import { useToast } from "@/components/ui/use-toast";
import { Socket } from "socket.io-client";
import { TradingEvent } from "@/types/socket";

/**
 * Supported cryptocurrency exchanges
 */
export enum Exchange {
  BINANCE = "binance",
  COINBASE = "coinbase",
  KRAKEN = "kraken",
  KUCOIN = "kucoin",
  BYBIT = "bybit",
  FTX = "ftx",
  OKEX = "okex",
  HUOBI = "huobi",
  BITFINEX = "bitfinex",
  BITSTAMP = "bitstamp",
}

/**
 * Exchange credentials interface
 */
export interface ExchangeCredentials {
  apiKey: string;
  apiSecret: string;
  apiPassphrase?: string;
  testnet?: boolean;
}

/**
 * Order types supported by exchanges
 */
export enum OrderType {
  MARKET = "market",
  LIMIT = "limit",
  STOP = "stop",
  STOP_LIMIT = "stop_limit",
}

/**
 * Side of the trade
 */
export enum OrderSide {
  BUY = "buy",
  SELL = "sell",
}

/**
 * Market data interface
 */
export interface MarketData {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  change24h: number;
  timestamp: number;
}

/**
 * Order placement interface
 */
export interface Order {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;
  stopPrice?: number;
  clientOrderId?: string;
  timeInForce?: string;
  options?: Record<string, any>;
}

/**
 * Order placement result
 */
export interface OrderResult {
  orderId: string;
  clientOrderId?: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  price?: number;
  quantity: number;
  status: string;
  timestamp: number;
  error?: string;
}

/**
 * Balance interface
 */
export interface Balance {
  asset: string;
  free: number;
  locked: number;
  total: number;
}

/**
 * Connection status of the exchange connector
 */
export enum ConnectionStatus {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  ERROR = "error",
}

/**
 * ExchangeConnector class for interfacing with cryptocurrency exchanges
 */
export class ExchangeConnector {
  private exchange: Exchange;
  private credentials: ExchangeCredentials;
  private socket: Socket | null = null;
  private status: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private listeners: Record<string, Function[]> = {};
  private balances: Balance[] = [];
  private marketData: Record<string, MarketData> = {};
  private activeOrders: Record<string, OrderResult> = {};
  private orderHistoryCache: OrderResult[] = [];
  private options: Record<string, any> = {};
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 3000;
  private lastError: Error | null = null;
  private rateLimitRemaining: number = 1000;
  private rateLimitResetTime: number = 0;

  /**
   * Constructor for the ExchangeConnector
   * @param exchange The exchange to connect to
   * @param credentials API credentials for the exchange
   * @param socket Optional socket.io client for real-time updates
   * @param options Additional options for the connector
   */
  constructor(
    exchange: Exchange,
    credentials: ExchangeCredentials,
    socket?: Socket | null,
    options: Record<string, any> = {}
  ) {
    this.exchange = exchange;
    this.credentials = this.sanitizeCredentials(credentials);
    this.socket = socket || null;
    this.options = options;
    this.setupDefaultOptions();
  }

  /**
   * Sanitize credentials to prevent logging sensitive data
   */
  private sanitizeCredentials(credentials: ExchangeCredentials): ExchangeCredentials {
    // Create a proxy that prevents logging or stringifying the actual credentials
    return {
      ...credentials,
      toString: () => "[REDACTED CREDENTIALS]",
      toJSON: () => ({ message: "[REDACTED FOR SECURITY]" }),
    };
  }

  /**
   * Setup default options for the connector
   */
  private setupDefaultOptions() {
    this.options = {
      reconnectOnError: true,
      logLevel: "info",
      rateLimit: {
        enabled: true,
        maxRequests: 1000,
        perTimeWindow: 60000,
      },
      ...this.options,
    };
  }

  /**
   * Connect to the exchange API and WebSocket if available
   */
  async connect(): Promise<boolean> {
    try {
      this.status = ConnectionStatus.CONNECTING;
      this.emit("connecting", { exchange: this.exchange });

      // Check credentials
      if (!this.credentials.apiKey || !this.credentials.apiSecret) {
        throw new Error("Missing API credentials");
      }

      // Simulate a REST API auth check
      await this.simulateAuthCheck();

      // Connect to WebSocket for real-time data if socket is provided
      if (this.socket) {
        this.setupSocketListeners();
      }

      // Cache initial account balances
      await this.fetchBalances();

      this.status = ConnectionStatus.CONNECTED;
      this.emit("connected", { exchange: this.exchange });
      
      return true;
    } catch (error) {
      this.handleConnectionError(error as Error);
      return false;
    }
  }

  /**
   * Simulates an authentication check with the exchange
   */
  private async simulateAuthCheck(): Promise<void> {
    // In a real implementation, this would make an API call to verify credentials
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (this.credentials.apiKey.startsWith("test_invalid")) {
          reject(new Error("Invalid API credentials"));
        } else {
          resolve();
        }
      }, 500);
    });
  }

  /**
   * Handles connection errors
   */
  private handleConnectionError(error: Error) {
    this.lastError = error;
    this.status = ConnectionStatus.ERROR;
    console.error(`[${this.exchange}] Connection error:`, error);
    this.emit("error", { error, exchange: this.exchange });

    // Attempt reconnection if enabled
    if (this.options.reconnectOnError && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), this.reconnectDelay * this.reconnectAttempts);
    }
  }

  /**
   * Setup socket listeners for real-time updates
   */
  private setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on(TradingEvent.MARKET_UPDATE, (data) => {
      if (data.exchange === this.exchange) {
        this.updateMarketData(data.symbol, data);
        this.emit("marketUpdate", data);
      }
    });

    this.socket.on(TradingEvent.TRADE_EXECUTION, (data) => {
      if (data.exchange === this.exchange) {
        this.updateOrderStatus(data);
        this.emit("orderUpdate", data);
      }
    });

    // Subscribe to market data
    this.socket.emit("exchange:subscribe", {
      exchange: this.exchange,
      credentials: {
        apiKey: this.credentials.apiKey,
        // Don't send the secret over the socket
      },
    });
  }

  /**
   * Update market data cache
   */
  private updateMarketData(symbol: string, data: any) {
    this.marketData[symbol] = {
      ...data,
      timestamp: Date.now(),
    };
  }

  /**
   * Update order status cache
   */
  private updateOrderStatus(data: any) {
    if (data.orderId) {
      if (data.status === "filled" || data.status === "canceled" || data.status === "rejected") {
        delete this.activeOrders[data.orderId];
        this.orderHistoryCache.push(data);
        
        // Keep history cache limited to 100 orders
        if (this.orderHistoryCache.length > 100) {
          this.orderHistoryCache.shift();
        }
      } else {
        this.activeOrders[data.orderId] = data;
      }
    }
  }

  /**
   * Fetch account balances
   */
  async fetchBalances(): Promise<Balance[]> {
    try {
      // In a real implementation, this would make an API call to get balances
      this.balances = [
        { asset: "BTC", free: 0.5, locked: 0.1, total: 0.6 },
        { asset: "ETH", free: 5.0, locked: 1.0, total: 6.0 },
        { asset: "USDT", free: 10000, locked: 2000, total: 12000 },
      ];
      
      return this.balances;
    } catch (error) {
      console.error(`[${this.exchange}] Error fetching balances:`, error);
      throw error;
    }
  }

  /**
   * Get market data for a symbol
   */
  async getMarketData(symbol: string): Promise<MarketData> {
    // If we have cached data that's less than 5 seconds old, use it
    const cachedData = this.marketData[symbol];
    if (cachedData && (Date.now() - cachedData.timestamp) < 5000) {
      return cachedData;
    }

    try {
      // In a real implementation, this would make an API call if no cached data is available
      const mockData: MarketData = {
        symbol,
        price: 50000 + (Math.random() * 1000) - 500,
        bid: 49950 + (Math.random() * 900) - 450,
        ask: 50050 + (Math.random() * 900) - 450,
        high24h: 51000,
        low24h: 49000,
        volume24h: 1000 + (Math.random() * 200),
        change24h: (Math.random() * 5) - 2.5,
        timestamp: Date.now(),
      };

      this.marketData[symbol] = mockData;
      return mockData;
    } catch (error) {
      console.error(`[${this.exchange}] Error fetching market data for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Place an order on the exchange
   */
  async placeOrder(order: Order): Promise<OrderResult> {
    try {
      this.checkRateLimit();

      // In a real implementation, this would make an API call to place the order
      const mockOrderResult: OrderResult = {
        orderId: `order-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        clientOrderId: order.clientOrderId || `client-${Date.now()}`,
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        price: order.price,
        quantity: order.quantity,
        status: "new",
        timestamp: Date.now(),
      };

      // Cache the order
      this.activeOrders[mockOrderResult.orderId] = mockOrderResult;

      // Emit order event if socket is connected
      if (this.socket) {
        this.socket.emit(TradingEvent.TRADE_EXECUTION, {
          ...mockOrderResult,
          exchange: this.exchange,
        });
      }

      return mockOrderResult;
    } catch (error) {
      console.error(`[${this.exchange}] Error placing order:`, error);
      throw error;
    }
  }

  /**
   * Check rate limit before making API calls
   */
  private checkRateLimit() {
    if (!this.options.rateLimit.enabled) return;

    const now = Date.now();
    
    // Reset rate limit if time window has passed
    if (now > this.rateLimitResetTime) {
      this.rateLimitRemaining = this.options.rateLimit.maxRequests;
      this.rateLimitResetTime = now + this.options.rateLimit.perTimeWindow;
    }

    if (this.rateLimitRemaining <= 0) {
      const resetInSeconds = Math.ceil((this.rateLimitResetTime - now) / 1000);
      throw new Error(`Rate limit exceeded. Reset in ${resetInSeconds} seconds`);
    }

    this.rateLimitRemaining--;
  }

  /**
   * Cancel an order on the exchange
   */
  async cancelOrder(orderId: string, symbol: string): Promise<boolean> {
    try {
      this.checkRateLimit();

      // In a real implementation, this would make an API call to cancel the order
      const order = this.activeOrders[orderId];
      if (!order) {
        throw new Error(`Order ${orderId} not found or already filled/canceled`);
      }

      const canceledOrder: OrderResult = {
        ...order,
        status: "canceled",
        timestamp: Date.now(),
      };

      // Update order cache
      delete this.activeOrders[orderId];
      this.orderHistoryCache.push(canceledOrder);

      // Emit order event if socket is connected
      if (this.socket) {
        this.socket.emit(TradingEvent.TRADE_EXECUTION, {
          ...canceledOrder,
          exchange: this.exchange,
        });
      }

      return true;
    } catch (error) {
      console.error(`[${this.exchange}] Error canceling order:`, error);
      throw error;
    }
  }

  /**
   * Get all active orders
   */
  getActiveOrders(): OrderResult[] {
    return Object.values(this.activeOrders);
  }

  /**
   * Get order history (limited to cached orders)
   */
  getOrderHistory(): OrderResult[] {
    return [...this.orderHistoryCache];
  }

  /**
   * Get current account balances
   */
  getBalances(): Balance[] {
    return [...this.balances];
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Add an event listener
   */
  on(event: string, callback: Function): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * Remove an event listener
   */
  off(event: string, callback: Function): void {
    if (!this.listeners[event]) return;
    
    this.listeners[event] = this.listeners[event].filter(
      (listener) => listener !== callback
    );
  }

  /**
   * Emit an event to all listeners
   */
  private emit(event: string, data: any): void {
    if (!this.listeners[event]) return;
    
    for (const callback of this.listeners[event]) {
      try {
        callback(data);
      } catch (error) {
        console.error(`[${this.exchange}] Error in event listener:`, error);
      }
    }
  }

  /**
   * Close the connection to the exchange
   */
  disconnect(): void {
    // Remove all socket listeners
    if (this.socket) {
      this.socket.off(TradingEvent.MARKET_UPDATE);
      this.socket.off(TradingEvent.TRADE_EXECUTION);
      this.socket.emit("exchange:unsubscribe", { exchange: this.exchange });
    }

    this.status = ConnectionStatus.DISCONNECTED;
    this.emit("disconnected", { exchange: this.exchange });
  }
}

/**
 * React hook for using the exchange connector
 */
export function useExchangeConnector(
  exchange: Exchange,
  credentials: ExchangeCredentials,
  socket?: Socket | null,
  options: Record<string, any> = {}
) {
  const { toast } = useToast();
  
  // Create a new connector instance (in a real app, this would be done with useState/useRef)
  const connector = new ExchangeConnector(exchange, credentials, socket, options);
  
  // Connect to the exchange with error notifications
  const connectWithToast = async () => {
    try {
      const success = await connector.connect();
      if (success) {
        toast({
          title: "Connected to Exchange",
          description: `Successfully connected to ${exchange}`,
        });
      }
      return success;
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: `Failed to connect to ${exchange}: ${(error as Error).message}`,
        variant: "destructive",
      });
      return false;
    }
  };
  
  // Place an order with error handling and notifications
  const placeOrderWithToast = async (order: Order) => {
    try {
      const result = await connector.placeOrder(order);
      toast({
        title: "Order Placed",
        description: `${order.side.toUpperCase()} ${order.quantity} ${order.symbol} at ${order.price || 'MARKET'}`,
      });
      return result;
    } catch (error) {
      toast({
        title: "Order Failed",
        description: `Failed to place order: ${(error as Error).message}`,
        variant: "destructive",
      });
      throw error;
    }
  };
  
  return {
    connector,
    connect: connectWithToast,
    placeOrder: placeOrderWithToast,
    getMarketData: (symbol: string) => connector.getMarketData(symbol),
    getBalances: () => connector.getBalances(),
    getActiveOrders: () => connector.getActiveOrders(),
    getOrderHistory: () => connector.getOrderHistory(),
    cancelOrder: async (orderId: string, symbol: string) => {
      try {
        const result = await connector.cancelOrder(orderId, symbol);
        if (result) {
          toast({
            title: "Order Canceled",
            description: `Successfully canceled order ${orderId}`,
          });
        }
        return result;
      } catch (error) {
        toast({
          title: "Cancel Failed",
          description: `Failed to cancel order: ${(error as Error).message}`,
          variant: "destructive",
        });
        throw error;
      }
    },
    getStatus: () => connector.getStatus(),
    on: (event: string, callback: Function) => connector.on(event, callback),
    off: (event: string, callback: Function) => connector.off(event, callback),
    disconnect: () => connector.disconnect(),
  };
}
