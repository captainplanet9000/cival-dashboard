/**
 * Exchange Connector
 * Provides integration with various cryptocurrency exchanges
 * This is a simulated implementation - in production, you would use libraries like ccxt
 */
import { generateUniqueId } from '@/utils/helpers';

// Exchange types
export type ExchangeType = 'binance' | 'coinbase' | 'kraken' | 'kucoin' | 'ftx' | 'mock';

// Symbol information
export interface SymbolInfo {
  symbol: string;
  baseCurrency: string;
  quoteCurrency: string;
  minQuantity: number;
  maxQuantity: number;
  priceDecimals: number;
  quantityDecimals: number;
  tradable: boolean;
}

// Ticker price data
export interface TickerPrice {
  symbol: string;
  price: number;
  timestamp: number;
  bid?: number;
  ask?: number;
  volume?: number;
}

// Order types
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit';
export type OrderSide = 'buy' | 'sell';
export type OrderStatus = 'open' | 'filled' | 'partially_filled' | 'canceled' | 'rejected';

// Order interface
export interface Order {
  id: string;
  symbol: string;
  type: OrderType;
  side: OrderSide;
  price?: number;
  stopPrice?: number;
  quantity: number;
  filled: number;
  status: OrderStatus;
  clientOrderId?: string;
  timestamp: number;
  fees?: {
    amount: number;
    currency: string;
  };
}

// Exchange account information
export interface AccountInfo {
  balances: {
    [currency: string]: {
      free: number;
      locked: number;
      total: number;
    };
  };
  canTrade: boolean;
  canDeposit: boolean;
  canWithdraw: boolean;
  lastUpdated: number;
}

// Exchange connection options
export interface ExchangeOptions {
  type: ExchangeType;
  apiKey?: string;
  apiSecret?: string;
  apiPassphrase?: string;
  testnet?: boolean;
  proxy?: string;
}

// Exchange connector interface
export interface ExchangeConnector {
  type: ExchangeType;
  isConnected: boolean;
  connect(): Promise<boolean>;
  disconnect(): Promise<boolean>;
  getSymbols(): Promise<SymbolInfo[]>;
  getTicker(symbol: string): Promise<TickerPrice>;
  getAccountInfo(): Promise<AccountInfo>;
  placeOrder(order: Omit<Order, 'id' | 'status' | 'filled' | 'timestamp'>): Promise<Order>;
  cancelOrder(orderId: string, symbol: string): Promise<boolean>;
  getOrder(orderId: string, symbol: string): Promise<Order | null>;
  getOpenOrders(symbol?: string): Promise<Order[]>;
  getOrderHistory(symbol?: string, limit?: number): Promise<Order[]>;
}

// Mock price data for simulation
const mockPrices: Record<string, number> = {
  'BTC/USDT': 65000,
  'ETH/USDT': 3500,
  'SOL/USDT': 140,
  'XRP/USDT': 0.65,
  'ADA/USDT': 0.45,
  'AVAX/USDT': 32,
  'LINK/USDT': 15,
  'DOT/USDT': 7.5,
  'DOGE/USDT': 0.12,
  'SHIB/USDT': 0.000025,
};

// Mock balances for simulation
const mockBalances: Record<string, number> = {
  'BTC': 0.05,
  'ETH': 2.5,
  'SOL': 50,
  'USDT': 25000,
  'USD': 15000,
};

// Implementation of the mock exchange connector
class MockExchangeConnector implements ExchangeConnector {
  type: ExchangeType = 'mock';
  isConnected = false;
  private mockOrders: Order[] = [];
  private lastPriceUpdate = 0;
  private updateInterval: NodeJS.Timeout | null = null;
  
  private simulateMarketMovement() {
    // Update prices every 5 seconds with small random changes
    if (Date.now() - this.lastPriceUpdate > 5000) {
      Object.keys(mockPrices).forEach(symbol => {
        const changePercent = (Math.random() * 2 - 1) * 0.005; // -0.5% to +0.5%
        mockPrices[symbol] = mockPrices[symbol] * (1 + changePercent);
      });
      this.lastPriceUpdate = Date.now();
    }
  }
  
  async connect(): Promise<boolean> {
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.isConnected = true;
    
    // Start price update simulation
    if (!this.updateInterval) {
      this.updateInterval = setInterval(() => this.simulateMarketMovement(), 5000);
    }
    
    return true;
  }
  
  async disconnect(): Promise<boolean> {
    // Simulate disconnection delay
    await new Promise(resolve => setTimeout(resolve, 500));
    this.isConnected = false;
    
    // Stop price update simulation
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    return true;
  }
  
  async getSymbols(): Promise<SymbolInfo[]> {
    if (!this.isConnected) throw new Error('Exchange not connected');
    
    // Create mock symbol info from price data
    return Object.keys(mockPrices).map(symbol => {
      const [base, quote] = symbol.split('/');
      return {
        symbol,
        baseCurrency: base,
        quoteCurrency: quote,
        minQuantity: 0.0001,
        maxQuantity: 100000,
        priceDecimals: quote === 'USDT' ? (base === 'SHIB' ? 8 : 2) : 8,
        quantityDecimals: base === 'BTC' ? 8 : (base === 'ETH' ? 6 : 2),
        tradable: true
      };
    });
  }
  
  async getTicker(symbol: string): Promise<TickerPrice> {
    if (!this.isConnected) throw new Error('Exchange not connected');
    
    if (!mockPrices[symbol]) {
      throw new Error(`Symbol ${symbol} not found`);
    }
    
    this.simulateMarketMovement();
    
    const price = mockPrices[symbol];
    const bid = price * 0.999;
    const ask = price * 1.001;
    
    return {
      symbol,
      price,
      bid,
      ask,
      volume: Math.random() * 1000 + 500,
      timestamp: Date.now()
    };
  }
  
  async getAccountInfo(): Promise<AccountInfo> {
    if (!this.isConnected) throw new Error('Exchange not connected');
    
    const balances: AccountInfo['balances'] = {};
    
    Object.keys(mockBalances).forEach(currency => {
      const total = mockBalances[currency];
      const locked = this.calculateLockedBalance(currency);
      balances[currency] = {
        free: total - locked,
        locked,
        total
      };
    });
    
    return {
      balances,
      canTrade: true,
      canDeposit: true,
      canWithdraw: true,
      lastUpdated: Date.now()
    };
  }
  
  private calculateLockedBalance(currency: string): number {
    return this.mockOrders
      .filter(order => 
        order.status === 'open' && 
        order.symbol.startsWith(currency + '/') && 
        order.side === 'sell'
      )
      .reduce((total, order) => total + (order.quantity - order.filled), 0);
  }
  
  async placeOrder(orderParams: Omit<Order, 'id' | 'status' | 'filled' | 'timestamp'>): Promise<Order> {
    if (!this.isConnected) throw new Error('Exchange not connected');
    
    // Validate symbol
    if (!mockPrices[orderParams.symbol]) {
      throw new Error(`Symbol ${orderParams.symbol} not found`);
    }
    
    const currentPrice = mockPrices[orderParams.symbol];
    
    // Create new order
    const newOrder: Order = {
      ...orderParams,
      id: generateUniqueId(),
      status: 'open',
      filled: 0,
      timestamp: Date.now()
    };
    
    // Simulate market orders being filled immediately
    if (orderParams.type === 'market') {
      newOrder.price = currentPrice;
      newOrder.status = 'filled';
      newOrder.filled = orderParams.quantity;
      
      // Update balances for market orders
      const [base, quote] = orderParams.symbol.split('/');
      
      if (orderParams.side === 'buy') {
        const cost = orderParams.quantity * currentPrice;
        mockBalances[base] = (mockBalances[base] || 0) + orderParams.quantity;
        mockBalances[quote] = (mockBalances[quote] || 0) - cost;
      } else {
        const proceeds = orderParams.quantity * currentPrice;
        mockBalances[base] = (mockBalances[base] || 0) - orderParams.quantity;
        mockBalances[quote] = (mockBalances[quote] || 0) + proceeds;
      }
    } else {
      // For limit orders, check if they would be immediately filled
      if (orderParams.price) {
        if ((orderParams.side === 'buy' && orderParams.price >= currentPrice) ||
            (orderParams.side === 'sell' && orderParams.price <= currentPrice)) {
          newOrder.status = 'filled';
          newOrder.filled = orderParams.quantity;
          
          // Update balances for filled limit orders
          const [base, quote] = orderParams.symbol.split('/');
          
          if (orderParams.side === 'buy') {
            const cost = orderParams.quantity * orderParams.price;
            mockBalances[base] = (mockBalances[base] || 0) + orderParams.quantity;
            mockBalances[quote] = (mockBalances[quote] || 0) - cost;
          } else {
            const proceeds = orderParams.quantity * orderParams.price;
            mockBalances[base] = (mockBalances[base] || 0) - orderParams.quantity;
            mockBalances[quote] = (mockBalances[quote] || 0) + proceeds;
          }
        }
      }
    }
    
    // Add fees
    newOrder.fees = {
      amount: newOrder.filled * (newOrder.price || currentPrice) * 0.001,
      currency: orderParams.symbol.split('/')[1]
    };
    
    this.mockOrders.push(newOrder);
    return newOrder;
  }
  
  async cancelOrder(orderId: string, symbol: string): Promise<boolean> {
    if (!this.isConnected) throw new Error('Exchange not connected');
    
    const orderIndex = this.mockOrders.findIndex(
      order => order.id === orderId && order.symbol === symbol
    );
    
    if (orderIndex === -1) {
      throw new Error(`Order ${orderId} not found`);
    }
    
    if (this.mockOrders[orderIndex].status !== 'open') {
      throw new Error(`Cannot cancel order with status ${this.mockOrders[orderIndex].status}`);
    }
    
    this.mockOrders[orderIndex].status = 'canceled';
    return true;
  }
  
  async getOrder(orderId: string, symbol: string): Promise<Order | null> {
    if (!this.isConnected) throw new Error('Exchange not connected');
    
    const order = this.mockOrders.find(
      order => order.id === orderId && order.symbol === symbol
    );
    
    return order || null;
  }
  
  async getOpenOrders(symbol?: string): Promise<Order[]> {
    if (!this.isConnected) throw new Error('Exchange not connected');
    
    return this.mockOrders.filter(order => 
      order.status === 'open' &&
      (!symbol || order.symbol === symbol)
    );
  }
  
  async getOrderHistory(symbol?: string, limit = 50): Promise<Order[]> {
    if (!this.isConnected) throw new Error('Exchange not connected');
    
    return this.mockOrders
      .filter(order => 
        order.status !== 'open' &&
        (!symbol || order.symbol === symbol)
      )
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
}

// Factory function to create exchange connectors
export function createExchangeConnector(options: ExchangeOptions): ExchangeConnector {
  switch (options.type) {
    case 'mock':
      return new MockExchangeConnector();
    default:
      throw new Error(`Exchange type ${options.type} not implemented yet`);
  }
}

// Singleton instance for mock exchange (for easy access in development)
export const mockExchange = new MockExchangeConnector();

// Helper function to format price with appropriate decimals
export function formatPrice(price: number, symbol: string): string {
  const quoteCurrency = symbol.split('/')[1];
  const decimals = quoteCurrency === 'USDT' ? 2 : 8;
  return price.toFixed(decimals);
}

// Helper function to format currency amount
export function formatCurrency(amount: number, currency: string): string {
  if (currency === 'BTC') return amount.toFixed(8);
  if (currency === 'ETH') return amount.toFixed(6);
  if (currency === 'USDT' || currency === 'USD') return amount.toFixed(2);
  return amount.toFixed(4);
}
