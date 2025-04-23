/**
 * Exchange-related type definitions for Trading Farm
 * 
 * This module defines all the types used in the exchange integration layer
 */

/**
 * Credentials for connecting to an exchange API
 */
export interface ExchangeCredentials {
  /**
   * API key provided by the exchange
   */
  apiKey: string;
  
  /**
   * API secret provided by the exchange
   */
  apiSecret: string;
  
  /**
   * Optional passphrase required by some exchanges
   */
  passphrase?: string;
  
  /**
   * Optional additional parameters required by specific exchanges
   */
  additionalParams?: Record<string, any>;
}

/**
 * Market order types supported by the exchange
 */
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop';

/**
 * Order side (buy or sell)
 */
export type OrderSide = 'buy' | 'sell';

/**
 * Time-in-force options for orders
 */
export type TimeInForce = 'GTC' | 'IOC' | 'FOK';

/**
 * Order status on the exchange
 */
export type OrderStatus = 
  | 'open' 
  | 'partial_fill' 
  | 'filled' 
  | 'canceled' 
  | 'expired' 
  | 'rejected';

/**
 * Parameters for placing an order
 */
export interface OrderParams {
  /**
   * Trading pair (e.g., 'BTC/USDT')
   */
  symbol: string;
  
  /**
   * Order type
   */
  type: OrderType;
  
  /**
   * Order side (buy or sell)
   */
  side: OrderSide;
  
  /**
   * Quantity to buy/sell
   */
  quantity: number;
  
  /**
   * Price for limit orders
   */
  price?: number;
  
  /**
   * Stop price for stop and stop-limit orders
   */
  stopPrice?: number;
  
  /**
   * Time-in-force option
   */
  timeInForce?: TimeInForce;
  
  /**
   * Whether this is a post-only order
   */
  postOnly?: boolean;
  
  /**
   * Reduce-only flag (for futures/margin)
   */
  reduceOnly?: boolean;
  
  /**
   * Client order ID (for tracking/identification)
   */
  clientOrderId?: string;
  
  /**
   * Risk management parameters
   */
  riskParams?: {
    /**
     * Stop loss price
     */
    stopLoss?: number;
    
    /**
     * Take profit price
     */
    takeProfit?: number;
    
    /**
     * Trailing stop offset (percentage or absolute)
     */
    trailingStop?: number;
    
    /**
     * Whether trailing stop is a percentage
     */
    trailingStopIsPercent?: boolean;
  };
  
  /**
   * Additional parameters required by specific exchanges
   */
  additionalParams?: Record<string, any>;
}

/**
 * Order information returned by the exchange
 */
export interface Order {
  /**
   * Exchange-assigned order ID
   */
  id: string;
  
  /**
   * Client-assigned order ID
   */
  clientOrderId?: string;
  
  /**
   * Trading pair
   */
  symbol: string;
  
  /**
   * Order creation timestamp
   */
  timestamp: number;
  
  /**
   * Last update timestamp
   */
  lastUpdateTimestamp: number;
  
  /**
   * Order status
   */
  status: OrderStatus;
  
  /**
   * Order type
   */
  type: OrderType;
  
  /**
   * Order side
   */
  side: OrderSide;
  
  /**
   * Order price (for limit orders)
   */
  price?: number;
  
  /**
   * Stop price (for stop orders)
   */
  stopPrice?: number;
  
  /**
   * Original quantity
   */
  quantity: number;
  
  /**
   * Filled quantity
   */
  filledQuantity: number;
  
  /**
   * Remaining quantity
   */
  remainingQuantity: number;
  
  /**
   * Average fill price
   */
  averageFillPrice?: number;
  
  /**
   * Cumulative quote asset quantity filled
   */
  cumQuoteAssetQuantity?: number;
  
  /**
   * Fee paid
   */
  fee?: {
    /**
     * Fee amount
     */
    amount: number;
    
    /**
     * Fee currency
     */
    currency: string;
  };
  
  /**
   * Raw response from the exchange
   */
  rawData?: any;
}

/**
 * Result of placing an order
 */
export interface OrderResult {
  /**
   * Whether the order was successfully placed
   */
  success: boolean;
  
  /**
   * Error message if the order failed
   */
  error?: string;
  
  /**
   * Order information (if successful)
   */
  order?: Order;
  
  /**
   * Raw response from the exchange
   */
  rawResponse?: any;
}

/**
 * Market data structure
 */
export interface MarketData {
  /**
   * Trading pair
   */
  symbol: string;
  
  /**
   * Timestamp of the market data
   */
  timestamp: number;
  
  /**
   * Best bid price
   */
  bid: number;
  
  /**
   * Best ask price
   */
  ask: number;
  
  /**
   * Last trade price
   */
  last: number;
  
  /**
   * 24-hour high price
   */
  high: number;
  
  /**
   * 24-hour low price
   */
  low: number;
  
  /**
   * 24-hour volume in base currency
   */
  baseVolume: number;
  
  /**
   * 24-hour volume in quote currency
   */
  quoteVolume: number;
  
  /**
   * Percentage price change in 24 hours
   */
  percentChange24h: number;
  
  /**
   * Order book (if requested)
   */
  orderBook?: {
    bids: [number, number][]; // [price, quantity]
    asks: [number, number][]; // [price, quantity]
  };
  
  /**
   * Recent trades (if requested)
   */
  recentTrades?: {
    id: string;
    price: number;
    quantity: number;
    timestamp: number;
    side: OrderSide;
  }[];
  
  /**
   * Additional exchange-specific data
   */
  exchangeSpecific?: Record<string, any>;
}

/**
 * Account balance information
 */
export interface Balance {
  /**
   * Asset/currency symbol
   */
  asset: string;
  
  /**
   * Free (available) balance
   */
  free: number;
  
  /**
   * Used (in orders) balance
   */
  used: number;
  
  /**
   * Total balance (free + used)
   */
  total: number;
}

/**
 * Account information
 */
export interface AccountInfo {
  /**
   * Exchange ID
   */
  exchangeId: string;
  
  /**
   * Name of the exchange
   */
  exchangeName: string;
  
  /**
   * Account balances
   */
  balances: Balance[];
  
  /**
   * Trading fees information
   */
  tradingFees?: {
    /**
     * Maker fee rate
     */
    makerFee: number;
    
    /**
     * Taker fee rate
     */
    takerFee: number;
  };
  
  /**
   * Account positions (for futures/margin)
   */
  positions?: {
    /**
     * Symbol of the position
     */
    symbol: string;
    
    /**
     * Position size (positive for long, negative for short)
     */
    size: number;
    
    /**
     * Entry price
     */
    entryPrice: number;
    
    /**
     * Mark price
     */
    markPrice: number;
    
    /**
     * Liquidation price
     */
    liquidationPrice?: number;
    
    /**
     * Unrealized profit/loss
     */
    unrealizedPnl: number;
    
    /**
     * Position margin
     */
    margin?: number;
    
    /**
     * Position leverage
     */
    leverage?: number;
    
    /**
     * Side of the position (long or short)
     */
    side: 'long' | 'short';
  }[];
  
  /**
   * Account tier/level
   */
  accountTier?: string;
  
  /**
   * Additional permissions (futures, margin, etc.)
   */
  permissions?: string[];
  
  /**
   * Time when account data was fetched
   */
  fetchTimestamp: number;
}
