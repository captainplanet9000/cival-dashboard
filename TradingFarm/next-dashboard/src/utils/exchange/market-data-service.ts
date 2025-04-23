import { createServerClient } from '@/utils/supabase/server';
import { exchangeService } from './exchange-service';
import { SupabaseClient } from '@supabase/supabase-js';
import { MarketData } from './types';

/**
 * Service to handle market data retrieval and caching.
 * Provides real-time and historical market data for trading decisions.
 */
export class MarketDataService {
  private intervalId: NodeJS.Timeout | null = null;
  private pollingIntervalMs: number;
  private isPolling: boolean = false;
  private lastPollTime: Date | null = null;
  private marketDataCache: Map<string, MarketData> = new Map();
  private subscribedSymbols: Set<string> = new Set();
  private exchangeConnections: Map<string, string> = new Map(); // symbol -> exchangeId

  constructor(pollingIntervalMs: number = 60000) { // Default: 1 minute
    this.pollingIntervalMs = pollingIntervalMs;
  }

  /**
   * Start the market data polling service
   */
  public async start(): Promise<void> {
    if (this.isPolling) {
      console.log('Market data polling is already running');
      return;
    }

    console.log(`Starting market data service with interval: ${this.pollingIntervalMs}ms`);
    this.isPolling = true;
    
    // Run immediately on start
    await this.pollMarketData();
    
    // Then set up interval
    this.intervalId = setInterval(async () => {
      await this.pollMarketData();
    }, this.pollingIntervalMs);
  }

  /**
   * Stop the market data polling service
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isPolling = false;
      console.log('Market data service stopped');
    }
  }

  /**
   * Subscribe to market data for a specific symbol
   * @param symbol The trading pair symbol (e.g., 'BTC/USDT')
   * @param exchangeId The exchange ID to use
   */
  public async subscribeToMarketData(symbol: string, exchangeId: string): Promise<boolean> {
    try {
      // Validate exchange connection
      if (!exchangeService.isExchangeConnected(exchangeId)) {
        console.error(`Exchange ${exchangeId} is not connected`);
        return false;
      }
      
      // Add to subscribed symbols
      this.subscribedSymbols.add(symbol);
      this.exchangeConnections.set(symbol, exchangeId);
      
      // Initialize WebSocket subscription if possible
      try {
        await this.initializeWebSocketForSymbol(symbol, exchangeId);
      } catch (wsError) {
        console.warn(`Failed to initialize WebSocket for ${symbol}, falling back to polling`, wsError);
      }
      
      // Immediately fetch initial data
      await this.fetchMarketDataForSymbol(symbol, exchangeId);
      
      console.log(`Subscribed to market data for symbol: ${symbol}`);
      return true;
    } catch (error) {
      console.error(`Error subscribing to market data for ${symbol}:`, error);
      return false;
    }
  }

  /**
   * Unsubscribe from market data for a specific symbol
   */
  public unsubscribeFromMarketData(symbol: string): void {
    this.subscribedSymbols.delete(symbol);
    this.exchangeConnections.delete(symbol);
    console.log(`Unsubscribed from market data for symbol: ${symbol}`);
  }

  /**
   * Initialize WebSocket connection for real-time market data
   */
  private async initializeWebSocketForSymbol(symbol: string, exchangeId: string): Promise<void> {
    // Register WebSocket callback for this symbol
    exchangeService.registerWebSocketCallback(
      exchangeId,
      'market-data',
      `market-data-${symbol}`,
      (data) => {
        if (data.symbol === symbol && data.data) {
          this.handleWebSocketMarketData(symbol, data.data);
        }
      }
    );
  }

  /**
   * Handle WebSocket market data updates
   */
  private async handleWebSocketMarketData(symbol: string, data: any): Promise<void> {
    try {
      // Process and store the market data
      const marketData: MarketData = {
        symbol,
        lastPrice: data.lastPrice || data.last_price,
        bidPrice: data.bidPrice || data.bid_price || data.bid,
        askPrice: data.askPrice || data.ask_price || data.ask,
        high24h: data.high24h || data.high_24h,
        low24h: data.low24h || data.low_24h,
        volume24h: data.volume24h || data.volume_24h,
        timestamp: new Date().toISOString(),
        priceChangePercent: data.priceChangePercent || data.price_change_percent,
      };

      // Update the cache
      this.marketDataCache.set(symbol, marketData);

      // Store in database
      await this.storeMarketData(marketData);
    } catch (error) {
      console.error(`Error handling WebSocket market data for ${symbol}:`, error);
    }
  }

  /**
   * Fetch market data for all subscribed symbols
   */
  private async pollMarketData(): Promise<void> {
    try {
      console.log('Polling market data...');
      this.lastPollTime = new Date();
      
      // Poll each subscribed symbol
      const promises = Array.from(this.subscribedSymbols).map(symbol => {
        const exchangeId = this.exchangeConnections.get(symbol);
        if (!exchangeId) {
          return Promise.resolve(); // Skip if no exchange ID
        }
        return this.fetchMarketDataForSymbol(symbol, exchangeId);
      });
      
      await Promise.allSettled(promises);
      
      console.log('Market data polling completed');
    } catch (error) {
      console.error('Error in market data polling:', error);
    }
  }

  /**
   * Fetch market data for a specific symbol
   */
  private async fetchMarketDataForSymbol(symbol: string, exchangeId: string): Promise<void> {
    try {
      // Check if exchange is connected
      if (!exchangeService.isExchangeConnected(exchangeId)) {
        console.log(`Exchange ${exchangeId} not connected, initializing...`);
        
        // Get exchange details
        const supabase = await createServerClient();
        const { data: credential } = await supabase
          .from('exchange_credentials')
          .select('user_id, exchange, testnet')
          .eq('id', exchangeId)
          .single();
          
        if (!credential) {
          throw new Error(`Exchange credential not found for ID: ${exchangeId}`);
        }
        
        // Initialize exchange
        const exchangeConfig = {
          id: exchangeId,
          user_id: credential.user_id,
          name: credential.exchange,
          exchange: credential.exchange,
          active: true,
          testnet: credential.testnet || false,
          margin_enabled: false
        };
        
        const connected = await exchangeService.initializeExchange(exchangeConfig);
        
        if (!connected) {
          throw new Error(`Failed to connect to exchange: ${credential.exchange}`);
        }
      }
      
      // Fetch market data
      const marketDataList = await exchangeService.getMarketData(exchangeId, symbol);
      
      if (!marketDataList || marketDataList.length === 0) {
        console.log(`No market data available for ${symbol}`);
        return;
      }
      
      const marketData = marketDataList[0];
      
      // Update cache
      this.marketDataCache.set(symbol, marketData);
      
      // Store in database
      await this.storeMarketData(marketData);
      
      console.log(`Updated market data for ${symbol}: ${marketData.lastPrice}`);
    } catch (error) {
      console.error(`Error fetching market data for ${symbol}:`, error);
    }
  }

  /**
   * Store market data in the database
   */
  private async storeMarketData(marketData: MarketData): Promise<void> {
    try {
      const supabase = await createServerClient();
      
      // Store in market_data table
      const { error } = await supabase
        .from('market_data')
        .upsert({
          symbol: marketData.symbol,
          last_price: marketData.lastPrice,
          bid_price: marketData.bidPrice,
          ask_price: marketData.askPrice,
          high_24h: marketData.high24h,
          low_24h: marketData.low24h,
          volume_24h: marketData.volume24h,
          price_change_percent: marketData.priceChangePercent,
          timestamp: marketData.timestamp
        }, {
          onConflict: 'symbol'
        });
        
      if (error) {
        throw new Error(`Failed to store market data: ${error.message}`);
      }
    } catch (error) {
      console.error('Error storing market data:', error);
    }
  }

  /**
   * Get market data for a symbol
   */
  public getMarketData(symbol: string): MarketData | null {
    return this.marketDataCache.get(symbol) || null;
  }

  /**
   * Get all cached market data
   */
  public getAllMarketData(): { symbol: string; data: MarketData }[] {
    return Array.from(this.marketDataCache.entries()).map(([symbol, data]) => ({
      symbol,
      data
    }));
  }

  /**
   * Get the status of the market data service
   */
  public getStatus() {
    return {
      isPolling: this.isPolling,
      pollingIntervalMs: this.pollingIntervalMs,
      lastPollTime: this.lastPollTime,
      subscribedSymbolsCount: this.subscribedSymbols.size,
      subscribedSymbols: Array.from(this.subscribedSymbols)
    };
  }
}

// Create singleton instance
export const marketDataService = new MarketDataService(
  process.env.NEXT_PUBLIC_MARKET_DATA_POLL_INTERVAL ? 
    parseInt(process.env.NEXT_PUBLIC_MARKET_DATA_POLL_INTERVAL) : 
    60000
);
