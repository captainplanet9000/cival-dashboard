/**
 * Hyperliquid Trading Service
 * Handles interactions with the Hyperliquid API for perpetual contract trading on Arbitrum
 * Implements API endpoints from: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api
 */

import { ApiResponse } from '@/types/api';
import { v4 as uuidv4 } from 'uuid';
import { ExchangeCredentials } from '@/utils/exchange/types';
import { ethers } from 'ethers';
import { createServerClient } from '@/utils/supabase/server';
import { createBrowserClient } from '@/utils/supabase/client';

// Hyperliquid API base URLs - updated with explicit endpoint paths
const HYPERLIQUID_INFO_URL = 'https://api.hyperliquid.xyz/info';
const HYPERLIQUID_EXCHANGE_URL = 'https://api.hyperliquid.xyz/exchange';
const HYPERLIQUID_WS_URL = 'wss://api.hyperliquid.xyz/ws';

// Chain type - we'll focus on Arbitrum as requested but include testnet option
export type ChainType = 'arbitrum' | 'arbitrum_goerli';

// Order types
export enum OrderType {
  LIMIT = 'Limit', 
  MARKET = 'Market', 
  STOP_MARKET = 'StopMarket',
  TAKE_PROFIT_MARKET = 'TakeProfitMarket',
  STOP_LIMIT = 'StopLimit',
  TAKE_PROFIT_LIMIT = 'TakeProfitLimit'
}

// Order side
export enum OrderSide {
  BUY = 'B',
  SELL = 'A'
}

// Time in force
export enum TimeInForce {
  GTC = 'Gtc',  // Good till cancelled
  IOC = 'Ioc',  // Immediate or cancel
  POST_ONLY = 'PostOnly'
}

// Request types
export interface HyperliquidOrderRequest {
  symbol: string;  // Asset name
  side: OrderSide;
  size: number;     // Position size in base currency
  limitPrice?: number; // Required for limit orders
  triggerPrice?: number; // For stop/take profit orders
  reduceOnly?: boolean;
  cloid?: string;  // Client order ID
  timeInForce?: TimeInForce;
}

// Response types
export interface HyperliquidOrder {
  oid: number;      // Order ID
  cloid?: string;   // Client order ID
  asset: string;    // Asset name
  side: OrderSide;
  type: OrderType;
  price: string;
  sz: string;       // Size
  reduceOnly: boolean;
  status: string;
  statusTimestamp: number;
}

export interface HyperliquidPosition {
  asset: string;    // Asset name
  position: string; // Position size (negative for short)
  entryPrice: string;
  leverage: string;
  liqPrice: string;  // Liquidation price
  unrealizedPnl: string;
  returnOnEquity: string;
  marginUsed: string;
}

export interface HyperliquidAccountInfo {
  crossMarginSummary: {
    totalNtlPos: string;
    totalRawUsd: string;
    totalMaintMargin: string;
    totalInitMargin: string;
    totalMarginUsed: string;
    leftToUsd: string;
  };
  marginSummary: {
    accountValue: string;
    totalNtlPos: string;
    totalRawUsd: string;
    totalMaintMargin: string;
    totalInitMargin: string;
    totalMarginUsed: string;
    leftToUsd: string;
  };
  withdrawable: string;
  timestamp: number;
}

interface AssetMetadata {
  name: string;
  szDecimals: number;
}

// Trading Service
export const hyperliquidTradingService = {
  /**
   * Create a signature for request using a private key
   */
  async createSignature(
    privateKey: string,
    message: Record<string, any>
  ): Promise<string> {
    try {
      // Create a wallet from the private key
      const wallet = new ethers.Wallet(privateKey);
      
      // Hash the message using keccak256
      const messageStr = JSON.stringify(message);
      const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(messageStr));
      
      // Sign the hash
      const signature = await wallet.signMessage(ethers.utils.arrayify(hash));
      
      return signature;
    } catch (error: any) {
      console.error('Error creating signature:', error);
      throw new Error(`Failed to create signature: ${error.message}`);
    }
  },
  
  /**
   * Updated make request method to match Hyperliquid's API requirements
   * For private endpoints, the signature is created in a different format
   */
  async makeRequest<T>(
    credentials: ExchangeCredentials,
    endpoint: 'info' | 'exchange',
    method: 'GET' | 'POST' = 'POST',
    params: Record<string, any> = {},
    isPrivate: boolean = false
  ): Promise<ApiResponse<T>> {
    try {
      // Select the correct base URL based on the endpoint
      const url = endpoint === 'info' ? HYPERLIQUID_INFO_URL : HYPERLIQUID_EXCHANGE_URL;
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      let requestBody: Record<string, any> = { ...params };
      
      // For private endpoints that require authentication
      if (isPrivate && credentials.privateKey) {
        if (!credentials.walletAddress) {
          return {
            success: false,
            error: 'Wallet address is required for private endpoints'
          };
        }
        
        // Create authentication using the new Hyperliquid authentication format
        // First we need to create a wallet from the private key
        const wallet = new ethers.Wallet(credentials.privateKey);
        
        // Format depends on whether this is an exchange or info endpoint
        if (endpoint === 'exchange') {
          // For exchange endpoints, we need to create a proper signature
          // Format the action and args for the signature
          const action = params.type || '';
          const args = { ...params };
          delete args.type; // Remove type from args
          
          const payload = {
            action,
            args
          };
          
          const message = JSON.stringify(payload);
          const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(message));
          const signature = await wallet.signMessage(ethers.utils.arrayify(hash));
          
          // Set the new request body format
          requestBody = {
            signature,
            wallet: credentials.walletAddress,
            payload
          };
        } else {
          // For info endpoints, we just need to add wallet address 
          // if requesting user-specific data
          if (params.user === undefined && params.address === undefined) {
            requestBody.user = credentials.walletAddress;
          }
        }
      }
      
      // Make the request
      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data
      };
    } catch (error: any) {
      console.error('Hyperliquid API error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  },
  
  /**
   * Get user account information
   */
  async getAccountInfo(credentials: ExchangeCredentials): Promise<ApiResponse<HyperliquidAccountInfo>> {
    return this.makeRequest<HyperliquidAccountInfo>(
      credentials,
      'info',
      'POST',
      { 
        type: 'clearinghouseState',
        user: credentials.walletAddress 
      },
      true // This is a private endpoint, requires authentication
    );
  },
  
  /**
   * Get all open positions
   */
  async getPositions(
    credentials: ExchangeCredentials
  ): Promise<ApiResponse<HyperliquidPosition[]>> {
    const response = await this.makeRequest<any>(
      credentials,
      'info',
      'POST',
      { 
        type: 'userState',
        user: credentials.walletAddress
      },
      true // This is a private endpoint, requires authentication
    );
    
    if (response.success && response.data && response.data.assetPositions) {
      // Transform the response to match our interface
      const positions = response.data.assetPositions.map((pos: any) => ({
        asset: pos.asset,
        position: pos.position,
        entryPrice: pos.entryPx || '0',
        leverage: pos.leverage || '0',
        liqPrice: pos.liqPx || '0',
        unrealizedPnl: pos.unrealizedPnl || '0',
        returnOnEquity: pos.returnOnEquity || '0',
        marginUsed: pos.positionMargin || '0'
      }));
      
      return {
        success: true,
        data: positions
      };
    }
    
    return {
      success: false,
      error: response.error || 'Invalid position data format'
    };
  },
  
  /**
   * Place a trade order with updated API format
   */
  async placeTrade(
    credentials: ExchangeCredentials,
    tradeRequest: HyperliquidOrderRequest
  ): Promise<ApiResponse<HyperliquidOrder>> {
    const {
      symbol,
      side,
      size,
      limitPrice,
      triggerPrice,
      reduceOnly = false,
      cloid = uuidv4(),
      timeInForce = TimeInForce.GTC
    } = tradeRequest;
    
    // Determine order type based on provided parameters
    let orderType = OrderType.LIMIT;
    if (limitPrice === undefined) {
      orderType = OrderType.MARKET;
    } else if (triggerPrice !== undefined) {
      if (side === OrderSide.BUY) {
        orderType = OrderType.STOP_LIMIT;
      } else {
        orderType = OrderType.TAKE_PROFIT_LIMIT;
      }
    }
    
    // Prepare the order arguments with updated API format
    const orderArgs: Record<string, any> = {
      asset: symbol,  // Updated from 'coin' to 'asset'
      side,
      size: size.toString(),
      reduceOnly,
      orderType,
      cloid
    };
    
    // Add price parameters based on order type
    if (orderType !== OrderType.MARKET) {
      orderArgs.limitPx = limitPrice!.toString();
    }
    
    if (triggerPrice !== undefined) {
      orderArgs.triggerPx = triggerPrice.toString();
    }
    
    // Add time in force for limit orders
    if (orderType === OrderType.LIMIT) {
      orderArgs.tif = timeInForce;
    }
    
    // Make the API request with the updated format
    const response = await this.makeRequest<any>(
      credentials,
      'exchange',
      'POST',
      {
        type: 'order',
        order: orderArgs
      },
      true // This is a private endpoint, requires authentication
    );
    
    if (response.success && response.data && response.data.status) {
      const status = response.data.status;
      
      if (status === 'ok') {
        // If order was successful, get the order ID
        const oid = response.data.response?.oid || 0;
        
        // Return order details
        return {
          success: true,
          data: {
            oid,
            cloid,
            asset: symbol,
            side,
            type: orderType,
            price: limitPrice?.toString() || '0',
            sz: size.toString(),
            reduceOnly,
            status: 'open',
            statusTimestamp: Date.now()
          }
        };
      } else {
        // Order placement failed
        return {
          success: false,
          error: response.data.response?.error || 'Order placement failed'
        };
      }
    }
    
    return {
      success: false,
      error: response.error || 'Failed to place order'
    };
  },
  
  /**
   * Cancel an order with updated API format
   */
  async cancelOrder(
    credentials: ExchangeCredentials,
    symbol: string,
    orderId: number
  ): Promise<ApiResponse<boolean>> {
    const response = await this.makeRequest<any>(
      credentials,
      'exchange',
      'POST',
      {
        type: 'cancel',
        cancel: {
          asset: symbol,
          oid: orderId
        }
      },
      true // This is a private endpoint, requires authentication
    );
    
    if (response.success && response.data && response.data.status === 'ok') {
      return {
        success: true,
        data: true
      };
    }
    
    return {
      success: false,
      error: response.data?.response?.error || response.error || 'Failed to cancel order'
    };
  },
  
  /**
   * Get market meta information (available assets, etc.)
   */
  async getMarketMeta(): Promise<ApiResponse<{ universe: Array<AssetMetadata> }>> {
    return this.makeRequest<{ universe: Array<AssetMetadata> }>(
      {} as ExchangeCredentials, // No credentials needed for public endpoint
      'info',
      'POST',
      { type: 'universe' },
      false // This is a public endpoint, no auth needed
    );
  },
  
  /**
   * Get market data for a symbol
   */
  async getMarketData(
    symbol: string
  ): Promise<ApiResponse<any>> {
    return this.makeRequest<any>(
      {} as ExchangeCredentials, // No credentials needed for public endpoint
      'info',
      'POST',
      { 
        type: 'l2Book', 
        asset: symbol 
      },
      false // This is a public endpoint, no auth needed
    );
  },
  
  /**
   * Get funding rates
   */
  async getFundingRates(): Promise<ApiResponse<any>> {
    // First get the universe to know all available assets
    const universeResponse = await this.getMarketMeta();
    
    if (!universeResponse.success) {
      return universeResponse;
    }
    
    // Get funding for each asset individually
    const assets = universeResponse.data.universe.map((asset: AssetMetadata) => asset.name);
    const fundingPromises = assets.map((asset: string) => 
      this.makeRequest<any>(
        {} as ExchangeCredentials,
        'info',
        'POST',
        { 
          type: 'fundingHistory',
          asset,
          limit: 1
        },
        false
      )
    );
    
    try {
      const responses = await Promise.all(fundingPromises);
      const fundingRates: Record<string, any> = {};
      
      // Combine results
      responses.forEach((response: ApiResponse<any>, index: number) => {
        if (response.success && response.data && response.data.length > 0) {
          const asset = assets[index];
          fundingRates[asset] = response.data[0];
        }
      });
      
      return {
        success: true,
        data: fundingRates
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to fetch funding rates: ${error.message}`
      };
    }
  },
  
  /**
   * Get recent trades for a symbol
   */
  async getRecentTrades(
    symbol: string,
    limit: number = 100
  ): Promise<ApiResponse<any>> {
    return this.makeRequest<any>(
      {} as ExchangeCredentials, // No credentials needed for public endpoint
      'info',
      'POST',
      { 
        type: 'recentTrades', 
        asset: symbol,
        limit
      },
      false // This is a public endpoint, no auth needed
    );
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
    const isLong = entryPrice > stopLossPrice;
    const riskPerUnit = Math.abs(entryPrice - stopLossPrice) / (isLong ? entryPrice : stopLossPrice);
    
    // Calculate position size
    const positionSize = riskAmount / (entryPrice * riskPerUnit);
    
    return positionSize;
  }
};

// Export the service
export default hyperliquidTradingService;
