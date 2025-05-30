import { ExchangeAdapter, Ticker, OrderBook, PublicTrade, Subscription } from './exchange-adapter';
import { ExchangeFactory, ExchangeName } from './exchange-factory';
import { create } from 'zustand';

/**
 * Market Data Service
 * Provides real-time market data streaming and caching for all exchanges
 */

// Types for market data
export interface MarketDataState {
  tickers: Record<string, Ticker>;
  orderBooks: Record<string, OrderBook>;
  lastTrades: Record<string, PublicTrade[]>;
  isConnected: boolean;
  subscriptions: Record<string, Subscription>;
  activeSymbols: string[];
  error: string | null;
}

// Market data store
export const useMarketDataStore = create<MarketDataState>(() => ({
  tickers: {},
  orderBooks: {},
  lastTrades: {},
  isConnected: false,
  subscriptions: {},
  activeSymbols: [],
  error: null
}));

export class MarketDataService {
  private static instance: MarketDataService;
  private exchangeAdapters: Map<string, ExchangeAdapter> = new Map();
  private activeSymbols: Set<string> = new Set();
  private tickerSubscriptions: Map<string, Subscription> = new Map();
  private orderBookSubscriptions: Map<string, Subscription> = new Map();
  private tradeSubscriptions: Map<string, Subscription> = new Map();
  private recentTrades: Map<string, PublicTrade[]> = new Map();
  private maxTradeHistory: number = 100;
  private connectionPromises: Map<string, Promise<void>> = new Map();

  /**
   * Get singleton instance
   */
  static getInstance(): MarketDataService {
    if (!MarketDataService.instance) {
      MarketDataService.instance = new MarketDataService();
    }
    return MarketDataService.instance;
  }

  /**
   * Initialize market data service
   */
  private constructor() {
    // Initialize with empty state
    this.updateState({
      tickers: {},
      orderBooks: {},
      lastTrades: {},
      isConnected: false,
      subscriptions: {},
      activeSymbols: [],
      error: null
    });
  }

  /**
   * Connect to exchange
   */
  async connectExchange(exchangeName: ExchangeName, credentials: any): Promise<void> {
    try {
      // Check if we already have a connection promise for this exchange
      if (this.connectionPromises.has(exchangeName)) {
        await this.connectionPromises.get(exchangeName);
        return;
      }

      // Create a new connection promise
      const connectionPromise = (async () => {
        const { adapter } = await ExchangeFactory.connectToExchange(exchangeName, credentials);
        this.exchangeAdapters.set(exchangeName, adapter);
        this.updateState({ isConnected: true, error: null });
      })();

      this.connectionPromises.set(exchangeName, connectionPromise);
      await connectionPromise;
    } catch (error) {
      this.updateState({ error: `Failed to connect to ${exchangeName}: ${error.message}` });
      throw error;
    } finally {
      this.connectionPromises.delete(exchangeName);
    }
  }

  /**
   * Subscribe to ticker for a symbol
   */
  async subscribeToTicker(exchangeName: ExchangeName, symbol: string): Promise<void> {
    const key = `${exchangeName}:${symbol}`;
    
    if (this.tickerSubscriptions.has(key)) {
      return; // Already subscribed
    }

    try {
      const adapter = this.getAdapter(exchangeName);
      
      const subscription = await adapter.subscribeToTicker(symbol, (ticker) => {
        const state = useMarketDataStore.getState();
        useMarketDataStore.setState({
          tickers: {
            ...state.tickers,
            [key]: ticker
          }
        });
      });
      
      this.tickerSubscriptions.set(key, subscription);
      this.activeSymbols.add(key);
      
      // Update active symbols in state
      this.updateState({ 
        activeSymbols: Array.from(this.activeSymbols),
        subscriptions: {
          ...useMarketDataStore.getState().subscriptions,
          [key]: subscription
        }
      });
    } catch (error) {
      this.updateState({ error: `Failed to subscribe to ticker for ${symbol}: ${error.message}` });
      throw error;
    }
  }

  /**
   * Subscribe to order book for a symbol
   */
  async subscribeToOrderBook(exchangeName: ExchangeName, symbol: string): Promise<void> {
    const key = `${exchangeName}:${symbol}`;
    
    if (this.orderBookSubscriptions.has(key)) {
      return; // Already subscribed
    }

    try {
      const adapter = this.getAdapter(exchangeName);
      
      const subscription = await adapter.subscribeToOrderBook(symbol, (orderBook) => {
        const state = useMarketDataStore.getState();
        useMarketDataStore.setState({
          orderBooks: {
            ...state.orderBooks,
            [key]: orderBook
          }
        });
      });
      
      this.orderBookSubscriptions.set(key, subscription);
      this.activeSymbols.add(key);
      
      // Update active symbols in state
      this.updateState({ 
        activeSymbols: Array.from(this.activeSymbols),
        subscriptions: {
          ...useMarketDataStore.getState().subscriptions,
          [key]: subscription
        }
      });
    } catch (error) {
      this.updateState({ error: `Failed to subscribe to order book for ${symbol}: ${error.message}` });
      throw error;
    }
  }

  /**
   * Subscribe to trades for a symbol
   */
  async subscribeToTrades(exchangeName: ExchangeName, symbol: string): Promise<void> {
    const key = `${exchangeName}:${symbol}`;
    
    if (this.tradeSubscriptions.has(key)) {
      return; // Already subscribed
    }

    try {
      const adapter = this.getAdapter(exchangeName);
      
      // Initialize trade history array
      if (!this.recentTrades.has(key)) {
        this.recentTrades.set(key, []);
      }
      
      const subscription = await adapter.subscribeToTrades(symbol, (trade) => {
        // Add to recent trades
        const trades = this.recentTrades.get(key) || [];
        trades.unshift(trade); // Add to beginning
        
        // Keep only the most recent trades
        if (trades.length > this.maxTradeHistory) {
          trades.length = this.maxTradeHistory;
        }
        
        this.recentTrades.set(key, trades);
        
        // Update state
        const state = useMarketDataStore.getState();
        useMarketDataStore.setState({
          lastTrades: {
            ...state.lastTrades,
            [key]: [...trades]
          }
        });
      });
      
      this.tradeSubscriptions.set(key, subscription);
      this.activeSymbols.add(key);
      
      // Update active symbols in state
      this.updateState({ 
        activeSymbols: Array.from(this.activeSymbols),
        subscriptions: {
          ...useMarketDataStore.getState().subscriptions,
          [key]: subscription
        }
      });
    } catch (error) {
      this.updateState({ error: `Failed to subscribe to trades for ${symbol}: ${error.message}` });
      throw error;
    }
  }

  /**
   * Unsubscribe from all data for a symbol
   */
  async unsubscribeSymbol(exchangeName: ExchangeName, symbol: string): Promise<void> {
    const key = `${exchangeName}:${symbol}`;
    
    try {
      // Unsubscribe from ticker
      if (this.tickerSubscriptions.has(key)) {
        await this.tickerSubscriptions.get(key)?.unsubscribe();
        this.tickerSubscriptions.delete(key);
      }
      
      // Unsubscribe from order book
      if (this.orderBookSubscriptions.has(key)) {
        await this.orderBookSubscriptions.get(key)?.unsubscribe();
        this.orderBookSubscriptions.delete(key);
      }
      
      // Unsubscribe from trades
      if (this.tradeSubscriptions.has(key)) {
        await this.tradeSubscriptions.get(key)?.unsubscribe();
        this.tradeSubscriptions.delete(key);
      }
      
      this.activeSymbols.delete(key);
      
      // Update state
      const state = useMarketDataStore.getState();
      const newSubscriptions = { ...state.subscriptions };
      delete newSubscriptions[key];
      
      this.updateState({
        activeSymbols: Array.from(this.activeSymbols),
        subscriptions: newSubscriptions
      });
    } catch (error) {
      this.updateState({ error: `Failed to unsubscribe from ${symbol}: ${error.message}` });
      throw error;
    }
  }

  /**
   * Subscribe to all data for a symbol
   */
  async subscribeToSymbol(exchangeName: ExchangeName, symbol: string): Promise<void> {
    await Promise.all([
      this.subscribeToTicker(exchangeName, symbol),
      this.subscribeToOrderBook(exchangeName, symbol),
      this.subscribeToTrades(exchangeName, symbol)
    ]);
  }

  /**
   * Get latest ticker for a symbol
   */
  getTicker(exchangeName: ExchangeName, symbol: string): Ticker | null {
    const key = `${exchangeName}:${symbol}`;
    return useMarketDataStore.getState().tickers[key] || null;
  }

  /**
   * Get latest order book for a symbol
   */
  getOrderBook(exchangeName: ExchangeName, symbol: string): OrderBook | null {
    const key = `${exchangeName}:${symbol}`;
    return useMarketDataStore.getState().orderBooks[key] || null;
  }

  /**
   * Get recent trades for a symbol
   */
  getRecentTrades(exchangeName: ExchangeName, symbol: string): PublicTrade[] {
    const key = `${exchangeName}:${symbol}`;
    return useMarketDataStore.getState().lastTrades[key] || [];
  }

  /**
   * Get active symbols
   */
  getActiveSymbols(): string[] {
    return useMarketDataStore.getState().activeSymbols;
  }

  /**
   * Disconnect from all exchanges and clean up subscriptions
   */
  async disconnectAll(): Promise<void> {
    try {
      // Unsubscribe from all tickers
      for (const [key, subscription] of this.tickerSubscriptions.entries()) {
        await subscription.unsubscribe();
      }
      this.tickerSubscriptions.clear();
      
      // Unsubscribe from all order books
      for (const [key, subscription] of this.orderBookSubscriptions.entries()) {
        await subscription.unsubscribe();
      }
      this.orderBookSubscriptions.clear();
      
      // Unsubscribe from all trades
      for (const [key, subscription] of this.tradeSubscriptions.entries()) {
        await subscription.unsubscribe();
      }
      this.tradeSubscriptions.clear();
      
      // Disconnect from all exchanges
      for (const [exchangeName, adapter] of this.exchangeAdapters.entries()) {
        await adapter.disconnect();
      }
      this.exchangeAdapters.clear();
      
      this.activeSymbols.clear();
      this.recentTrades.clear();
      
      // Reset state
      this.updateState({
        tickers: {},
        orderBooks: {},
        lastTrades: {},
        isConnected: false,
        subscriptions: {},
        activeSymbols: [],
        error: null
      });
    } catch (error) {
      this.updateState({ error: `Failed to disconnect: ${error.message}` });
      throw error;
    }
  }

  /**
   * Get exchange adapter
   */
  private getAdapter(exchangeName: ExchangeName): ExchangeAdapter {
    const adapter = this.exchangeAdapters.get(exchangeName);
    
    if (!adapter) {
      throw new Error(`Exchange adapter for ${exchangeName} not found. Please connect first.`);
    }
    
    return adapter;
  }

  /**
   * Update state in store
   */
  private updateState(partialState: Partial<MarketDataState>): void {
    useMarketDataStore.setState((state) => ({
      ...state,
      ...partialState
    }));
  }
}
