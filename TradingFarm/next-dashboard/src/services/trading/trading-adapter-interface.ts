/**
 * Trading Farm Multi-Chain Integration
 * ITradingAdapter Interface - Standardized interface for executing trades across different chains
 */

export interface OrderParams {
  symbol: string;           // Trading pair (e.g., "BTC/USDT")
  side: 'buy' | 'sell';     // Order side
  type: 'market' | 'limit'; // Order type
  amount: number;           // Amount to buy/sell
  price?: number;           // Limit price (required for limit orders)
  timeInForce?: 'GTC' | 'IOC' | 'FOK'; // Good Till Cancelled, Immediate Or Cancel, Fill Or Kill
  clientOrderId?: string;   // Optional client order ID
  reduceOnly?: boolean;     // Whether the order should only reduce position
  postOnly?: boolean;       // Whether the order should only be a maker
  leverage?: number;        // Leverage for margin/futures trading
  maxSlippage?: number;     // Maximum allowed slippage (percentage)
}

export interface OrderResult {
  orderId: string;          // Exchange-assigned order ID
  txHash?: string;          // Transaction hash on the blockchain
  status: 'open' | 'closed' | 'canceled' | 'rejected' | 'pending';
  filled: number;           // Amount filled
  remaining: number;        // Amount remaining to be filled
  avgPrice?: number;        // Average fill price
  cost?: number;            // Total cost (filled * price)
  fee?: {                   // Fee information
    currency: string;
    cost: number;
  };
  trades?: any[];           // List of trades
  timestamp: number;        // Timestamp when the order was placed
  multisigAddress: string;  // Address of the multisig wallet that executed the trade
  chainSlug: string;        // Chain identifier (evm, sonic, sui, solana)
}

export interface MarketInfo {
  symbol: string;           // Trading pair (e.g., "BTC/USDT")
  base: string;             // Base currency (e.g., "BTC")
  quote: string;            // Quote currency (e.g., "USDT")
  bid: number;              // Highest buy price
  ask: number;              // Lowest sell price
  last: number;             // Last trade price
  baseVolume: number;       // Base currency volume (24h)
  quoteVolume: number;      // Quote currency volume (24h)
  high: number;             // Highest price (24h)
  low: number;              // Lowest price (24h)
  change: number;           // Price change (24h)
  changePercent: number;    // Price change percentage (24h)
  timestamp: number;        // Timestamp of the market data
  exchange: string;         // Exchange name
  dex: string;              // DEX name (e.g., "UniswapV3", "DeepBook", "Jupiter")
  chainSlug: string;        // Chain identifier (evm, sonic, sui, solana)
}

/**
 * ITradingAdapter - Interface for chain-specific trading adapters
 */
export interface ITradingAdapter {
  /**
   * Get the chain slug this adapter supports
   */
  readonly chainSlug: string;
  
  /**
   * Get the DEX name this adapter supports
   */
  readonly dexName: string;
  
  /**
   * Execute a trade order using the multisig wallet on the chain
   * @param multisigAddress Address of the multisig wallet to use for the trade
   * @param params Order parameters
   * @returns Order result with transaction details
   */
  executeOrder(multisigAddress: string, params: OrderParams): Promise<OrderResult>;
  
  /**
   * Get the current market price for a trading pair
   * @param symbol Trading pair symbol (e.g., "BTC/USDT")
   * @returns Market information including price data
   */
  getMarketInfo(symbol: string): Promise<MarketInfo>;
  
  /**
   * Get a list of available markets on the DEX
   * @returns List of available trading pairs
   */
  getAvailableMarkets(): Promise<string[]>;
  
  /**
   * Cancel an open order
   * @param multisigAddress Address of the multisig wallet that placed the order
   * @param orderId ID of the order to cancel
   * @returns Success status and transaction details
   */
  cancelOrder(multisigAddress: string, orderId: string): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }>;
  
  /**
   * Get the status of an order
   * @param multisigAddress Address of the multisig wallet that placed the order
   * @param orderId ID of the order to check
   * @returns Current order status
   */
  getOrderStatus(multisigAddress: string, orderId: string): Promise<OrderResult>;
  
  /**
   * Get open orders for a wallet
   * @param multisigAddress Address of the multisig wallet
   * @param symbol Optional trading pair to filter by
   * @returns List of open orders
   */
  getOpenOrders(multisigAddress: string, symbol?: string): Promise<OrderResult[]>;
}
