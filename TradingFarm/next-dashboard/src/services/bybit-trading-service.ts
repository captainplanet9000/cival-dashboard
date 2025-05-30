/**
 * Bybit Trading Service
 * Handles interactions with the Bybit API for trading operations
 */

import { createServerClient } from '@/utils/supabase/server';
import { createBrowserClient } from '@/utils/supabase/client';
import { ApiResponse } from '@/types/api';
import { v4 as uuidv4 } from 'uuid';
import { ExchangeCredentials } from '@/utils/exchange/types';

// Bybit API base URL
const BYBIT_MAINNET_URL = 'https://api.bybit.com';
const BYBIT_TESTNET_URL = 'https://api-testnet.bybit.com';

// MarketTypes
export type MarketType = 'spot' | 'linear' | 'inverse';

// Order Types
export type OrderType = 'Market' | 'Limit' | 'post_only' | 'IOC';

// Side
export type OrderSide = 'Buy' | 'Sell';

// Time in force
export type TimeInForce = 'GTC' | 'IOC' | 'FOK' | 'PostOnly';

// Position mode
export type PositionMode = 'both' | 'one-way';

// Trade Request
export interface TradeRequest {
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  quantity: number;
  price?: number; // Required for limit orders
  stopLoss?: number;
  takeProfit?: number;
  timeInForce?: TimeInForce;
  marketType?: MarketType;
  reduceOnly?: boolean;
  closeOnTrigger?: boolean;
}

// Trade Response
export interface TradeResponse {
  orderId: string;
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  price: string;
  qty: string;
  timeInForce: TimeInForce;
  orderStatus: string;
  executedQty: string;
  executedPrice: string;
  lastExecutedQty: string;
  cumExecutedQty: string;
  cumExecutedValue: string;
  cumExecFee: string;
  createdTime: string;
  updatedTime: string;
  reduceOnly: boolean;
  closeOnTrigger: boolean;
  orderLinkId: string;
  takeProfitPrice: string;
  stopLossPrice: string;
}

// Position Response
export interface PositionInfo {
  symbol: string;
  side: string;
  size: string;
  entryPrice: string;
  leverage: string;
  markPrice: string;
  unrealisedPnl: string;
  marginType: string;
  positionBalance: string;
  positionValue: string;
  liqPrice: string;
  bustPrice: string;
  positionStatus: string;
  createdTime: string;
  updatedTime: string;
}

// Order Response
export interface OrderInfo {
  symbol: string;
  orderId: string;
  side: OrderSide;
  orderType: OrderType;
  price: string;
  qty: string;
  timeInForce: TimeInForce;
  orderStatus: string;
  lastExecutedPrice: string;
  cumExecQty: string;
  cumExecValue: string;
  cumExecFee: string;
  createdTime: string;
  updatedTime: string;
}

// AccountInfo
export interface AccountInfo {
  totalEquity: string;
  totalMarginBalance: string;
  totalAvailableBalance: string;
  totalPerpUPL: string;
  totalInitialMargin: string;
  totalMaintenanceMargin: string;
  coin: {
    coin: string;
    equity: string;
    usdValue: string;
    walletBalance: string;
    availableToWithdraw: string;
  }[];
}

// Trading Service
export const bybitTradingService = {
  /**
   * Sign a request to the Bybit API
   */
  async getSignature(
    apiKey: string,
    apiSecret: string,
    timestamp: number,
    params: Record<string, any> = {}
  ): Promise<{ signature: string; timestamp: number; params: string }> {
    const keys = Object.keys(params).sort();
    let paramString = '';
    
    for (const key of keys) {
      paramString += `${key}=${params[key]}&`;
    }
    
    paramString += `timestamp=${timestamp}`;
    
    // In a browser context, we need to use the Web Crypto API
    const encoder = new TextEncoder();
    const secretKey = encoder.encode(apiSecret);
    const message = encoder.encode(paramString);
    
    // Use the crypto API to create an HMAC signature
    const cryptoSubtle = window.crypto.subtle;
    const key = await cryptoSubtle.importKey(
      'raw',
      secretKey,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await cryptoSubtle.sign('HMAC', key, message);
    
    // Convert the signature to hex
    const hashArray = Array.from(new Uint8Array(signature));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return {
      signature: hashHex,
      timestamp,
      params: paramString
    };
  },
  
  /**
   * Make a request to the Bybit API
   */
  async makeRequest<T>(
    credentials: ExchangeCredentials,
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    params: Record<string, any> = {},
    isPrivate: boolean = true
  ): Promise<ApiResponse<T>> {
    try {
      const baseUrl = credentials.testnet ? BYBIT_TESTNET_URL : BYBIT_MAINNET_URL;
      const url = new URL(`${baseUrl}${endpoint}`);
      
      const timestamp = Date.now();
      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // For GET requests, add params to URL
      if (method === 'GET' && Object.keys(params).length) {
        Object.keys(params).forEach(key => {
          url.searchParams.append(key, params[key].toString());
        });
      }
      
      // Only sign private endpoints
      if (isPrivate) {
        const { signature } = await this.getSignature(
          credentials.api_key,
          credentials.api_secret,
          timestamp,
          method === 'GET' ? Object.fromEntries(url.searchParams) : params
        );
        
        headers['X-BAPI-API-KEY'] = credentials.api_key;
        headers['X-BAPI-TIMESTAMP'] = timestamp.toString();
        headers['X-BAPI-SIGN'] = signature;
      }
      
      const requestOptions: RequestInit = {
        method,
        headers,
      };
      
      // For POST requests, add params to body
      if (method === 'POST' && Object.keys(params).length) {
        requestOptions.body = JSON.stringify(params);
      }
      
      const response = await fetch(url.toString(), requestOptions);
      const data = await response.json();
      
      if (data.retCode !== 0) {
        return {
          error: `API Error (${data.retCode}): ${data.retMsg}`,
        };
      }
      
      return {
        data: data.result as T,
      };
    } catch (error) {
      console.error('Bybit API request failed:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },
  
  /**
   * Get exchange credentials from the database
   */
  async getCredentials(exchangeId: string): Promise<ApiResponse<ExchangeCredentials>> {
    try {
      const response = await fetch(`/api/exchange/credentials/${exchangeId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch credentials');
      }
      
      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('Failed to get exchange credentials:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },
  
  /**
   * Get account information
   */
  async getAccountInfo(credentials: ExchangeCredentials): Promise<ApiResponse<AccountInfo>> {
    return this.makeRequest<AccountInfo>(
      credentials,
      '/v5/account/wallet-balance',
      'GET',
      { accountType: 'UNIFIED' }
    );
  },
  
  /**
   * Get all positions
   */
  async getPositions(
    credentials: ExchangeCredentials,
    marketType: MarketType = 'linear',
    symbol?: string
  ): Promise<ApiResponse<{ list: PositionInfo[] }>> {
    const params: Record<string, any> = { category: marketType };
    if (symbol) params.symbol = symbol;
    
    return this.makeRequest<{ list: PositionInfo[] }>(
      credentials,
      '/v5/position/list',
      'GET',
      params
    );
  },
  
  /**
   * Get open orders
   */
  async getOpenOrders(
    credentials: ExchangeCredentials,
    marketType: MarketType = 'linear',
    symbol?: string
  ): Promise<ApiResponse<{ list: OrderInfo[] }>> {
    const params: Record<string, any> = { category: marketType };
    if (symbol) params.symbol = symbol;
    
    return this.makeRequest<{ list: OrderInfo[] }>(
      credentials,
      '/v5/order/realtime',
      'GET',
      params
    );
  },
  
  /**
   * Place a trade
   */
  async placeTrade(
    credentials: ExchangeCredentials,
    trade: TradeRequest
  ): Promise<ApiResponse<TradeResponse>> {
    const marketType = trade.marketType || 'linear';
    
    const params: Record<string, any> = {
      category: marketType,
      symbol: trade.symbol,
      side: trade.side,
      orderType: trade.orderType,
      qty: trade.quantity.toString(),
      timeInForce: trade.timeInForce || 'GTC',
      orderLinkId: uuidv4(),
    };
    
    // Add price for limit orders
    if (trade.orderType === 'Limit' && trade.price) {
      params.price = trade.price.toString();
    }
    
    // Add stop loss and take profit if provided
    if (trade.stopLoss) {
      params.stopLoss = trade.stopLoss.toString();
    }
    
    if (trade.takeProfit) {
      params.takeProfit = trade.takeProfit.toString();
    }
    
    // Add reduceOnly and closeOnTrigger if provided
    if (trade.reduceOnly !== undefined) {
      params.reduceOnly = trade.reduceOnly;
    }
    
    if (trade.closeOnTrigger !== undefined) {
      params.closeOnTrigger = trade.closeOnTrigger;
    }
    
    return this.makeRequest<TradeResponse>(
      credentials,
      '/v5/order/create',
      'POST',
      params
    );
  },
  
  /**
   * Cancel an order
   */
  async cancelOrder(
    credentials: ExchangeCredentials,
    symbol: string,
    orderId?: string,
    orderLinkId?: string,
    marketType: MarketType = 'linear'
  ): Promise<ApiResponse<{ orderId: string; orderLinkId: string }>>{
    if (!orderId && !orderLinkId) {
      return {
        error: 'Either orderId or orderLinkId must be provided',
      };
    }
    
    const params: Record<string, any> = {
      category: marketType,
      symbol,
    };
    
    if (orderId) {
      params.orderId = orderId;
    } else if (orderLinkId) {
      params.orderLinkId = orderLinkId;
    }
    
    return this.makeRequest<{ orderId: string; orderLinkId: string }>(
      credentials,
      '/v5/order/cancel',
      'POST',
      params
    );
  },
  
  /**
   * Get market tickers (last price, 24h volume, etc.)
   */
  async getTickers(
    credentials: ExchangeCredentials,
    marketType: MarketType = 'linear',
    symbol?: string
  ): Promise<ApiResponse<{ list: any[] }>> {
    const params: Record<string, any> = { category: marketType };
    if (symbol) params.symbol = symbol;
    
    return this.makeRequest<{ list: any[] }>(
      credentials,
      '/v5/market/tickers',
      'GET',
      params,
      false // This is a public endpoint, no need for authentication
    );
  },
  
  /**
   * Get kline data (candles)
   */
  async getKlines(
    credentials: ExchangeCredentials,
    symbol: string,
    interval: string = '1h', // 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 12h, 1d, 1w, 1M
    marketType: MarketType = 'linear',
    limit: number = 200,
    start?: number, // timestamp in seconds
    end?: number // timestamp in seconds
  ): Promise<ApiResponse<{ list: any[] }>> {
    const params: Record<string, any> = {
      category: marketType,
      symbol,
      interval,
      limit,
    };
    
    if (start) params.start = start;
    if (end) params.end = end;
    
    return this.makeRequest<{ list: any[] }>(
      credentials,
      '/v5/market/kline',
      'GET',
      params,
      false // This is a public endpoint, no need for authentication
    );
  },
  
  /**
   * Get instrument info (trading pairs, precision, etc.)
   */
  async getInstrumentInfo(
    credentials: ExchangeCredentials,
    marketType: MarketType = 'linear',
    symbol?: string
  ): Promise<ApiResponse<{ list: any[] }>> {
    const params: Record<string, any> = { category: marketType };
    if (symbol) params.symbol = symbol;
    
    return this.makeRequest<{ list: any[] }>(
      credentials,
      '/v5/market/instruments-info',
      'GET',
      params,
      false // This is a public endpoint, no need for authentication
    );
  },
  
  /**
   * Place a market order (simplified interface for agents)
   */
  async placeMarketOrder(
    credentials: ExchangeCredentials,
    symbol: string,
    side: OrderSide,
    quantity: number,
    marketType: MarketType = 'linear',
    stopLoss?: number,
    takeProfit?: number,
    reduceOnly: boolean = false
  ): Promise<ApiResponse<TradeResponse>> {
    return this.placeTrade(credentials, {
      symbol,
      side,
      orderType: 'Market',
      quantity,
      marketType,
      stopLoss,
      takeProfit,
      reduceOnly,
      timeInForce: 'GTC'
    });
  },
  
  /**
   * Place a limit order (simplified interface for agents)
   */
  async placeLimitOrder(
    credentials: ExchangeCredentials,
    symbol: string,
    side: OrderSide,
    quantity: number,
    price: number,
    marketType: MarketType = 'linear',
    stopLoss?: number,
    takeProfit?: number,
    reduceOnly: boolean = false,
    timeInForce: TimeInForce = 'GTC'
  ): Promise<ApiResponse<TradeResponse>> {
    return this.placeTrade(credentials, {
      symbol,
      side,
      orderType: 'Limit',
      quantity,
      price,
      marketType,
      stopLoss,
      takeProfit,
      reduceOnly,
      timeInForce
    });
  },
  
  /**
   * Calculate position size based on risk percentage
   * @param accountBalance Total account balance
   * @param riskPercentage Percentage of account to risk (1-100)
   * @param entryPrice Entry price
   * @param stopLossPrice Stop loss price
   */
  calculatePositionSize(
    accountBalance: number,
    riskPercentage: number,
    entryPrice: number,
    stopLossPrice: number
  ): number {
    // Validate inputs
    if (riskPercentage <= 0 || riskPercentage > 100) {
      throw new Error('Risk percentage must be between 1 and 100');
    }
    
    if (entryPrice <= 0 || stopLossPrice <= 0) {
      throw new Error('Prices must be positive');
    }
    
    // Calculate risk amount
    const riskAmount = (accountBalance * riskPercentage) / 100;
    
    // Calculate risk per unit
    const isLong = entryPrice < stopLossPrice;
    const riskPerUnit = Math.abs(entryPrice - stopLossPrice) / (isLong ? entryPrice : stopLossPrice);
    
    // Calculate position size
    const positionSize = riskAmount / (entryPrice * riskPerUnit);
    
    return positionSize;
  },
  
  /**
   * Calculate take profit based on risk:reward ratio
   * @param entryPrice Entry price
   * @param stopLossPrice Stop loss price
   * @param riskRewardRatio Risk:Reward ratio (e.g., 1:2 = 2)
   */
  calculateTakeProfit(
    entryPrice: number,
    stopLossPrice: number,
    riskRewardRatio: number
  ): number {
    // Validate inputs
    if (riskRewardRatio <= 0) {
      throw new Error('Risk:reward ratio must be positive');
    }
    
    // Calculate risk amount
    const riskAmount = Math.abs(entryPrice - stopLossPrice);
    
    // Calculate take profit
    const isLong = entryPrice < stopLossPrice;
    if (isLong) {
      return entryPrice - (riskAmount * riskRewardRatio);
    } else {
      return entryPrice + (riskAmount * riskRewardRatio);
    }
  }
};

// Export the service
export default bybitTradingService;
