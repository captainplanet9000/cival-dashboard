/**
 * Trading Farm Price Service
 * Service for fetching token prices from various sources
 */

import { createServerClient } from '@/utils/supabase/server';

interface TokenPriceCache {
  [key: string]: {
    price: number;
    timestamp: number;
  };
}

export class PriceService {
  private priceCache: TokenPriceCache = {};
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  constructor() {
    // Initialize service
  }

  /**
   * Get the current price of a token in USD
   * @param chainId Chain identifier (e.g., 'ethereum', 'polygon')
   * @param tokenAddress Contract address of the token
   * @param tokenSymbol Symbol of the token (e.g., 'ETH', 'USDC')
   * @returns Price in USD or null if not available
   */
  async getTokenPrice(chainId: string, tokenAddress: string, tokenSymbol: string): Promise<number | null> {
    try {
      // Generate a cache key
      const cacheKey = `${chainId}:${tokenAddress}`;
      
      // Check if we have a recent cached price
      const cachedData = this.priceCache[cacheKey];
      if (cachedData && Date.now() - cachedData.timestamp < this.CACHE_TTL) {
        return cachedData.price;
      }
      
      // Try to fetch price from our database first
      const supabase = await createServerClient();
      const { data, error } = await supabase
        .from('token_prices')
        .select('price, updated_at')
        .eq('chain_id', chainId)
        .eq('token_address', tokenAddress)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (!error && data) {
        const timestamp = new Date(data.updated_at).getTime();
        if (Date.now() - timestamp < this.CACHE_TTL) {
          // Store in cache and return
          this.priceCache[cacheKey] = {
            price: data.price,
            timestamp: Date.now()
          };
          return data.price;
        }
      }
      
      // If not in DB or too old, fetch from external price API
      const price = await this.fetchTokenPriceFromAPI(chainId, tokenAddress, tokenSymbol);
      
      if (price) {
        // Store in cache
        this.priceCache[cacheKey] = {
          price,
          timestamp: Date.now()
        };
        
        // Store in DB for future use
        await supabase
          .from('token_prices')
          .insert({
            chain_id: chainId,
            token_address: tokenAddress,
            token_symbol: tokenSymbol,
            price,
            updated_at: new Date().toISOString()
          })
          .onConflict('chain_id, token_address')
          .merge();
        
        return price;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching token price:', error);
      return null;
    }
  }

  /**
   * Get multiple token prices in one call
   * @param tokens Array of token information
   * @returns Map of token addresses to prices
   */
  async getMultipleTokenPrices(tokens: Array<{
    chainId: string;
    tokenAddress: string;
    tokenSymbol: string;
  }>): Promise<Map<string, number>> {
    const results = new Map<string, number>();
    
    await Promise.all(
      tokens.map(async ({ chainId, tokenAddress, tokenSymbol }) => {
        const price = await this.getTokenPrice(chainId, tokenAddress, tokenSymbol);
        if (price !== null) {
          results.set(tokenAddress, price);
        }
      })
    );
    
    return results;
  }

  /**
   * Get historical token prices
   * @param chainId Chain identifier
   * @param tokenAddress Contract address of the token
   * @param tokenSymbol Symbol of the token
   * @param days Number of days of history to fetch
   * @param interval Interval between price points ('hour', 'day')
   * @returns Array of price points or null if not available
   */
  async getTokenPriceHistory(
    chainId: string,
    tokenAddress: string,
    tokenSymbol: string,
    days: number = 30,
    interval: 'hour' | 'day' = 'day'
  ): Promise<Array<{ timestamp: number; price: number }> | null> {
    try {
      // Try to fetch from our database first
      const supabase = await createServerClient();
      const { data, error } = await supabase
        .from('token_price_history')
        .select('price, timestamp')
        .eq('chain_id', chainId)
        .eq('token_address', tokenAddress)
        .eq('interval', interval)
        .gte('timestamp', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order('timestamp', { ascending: true });
      
      if (!error && data && data.length > 0) {
        return data.map(item => ({
          timestamp: new Date(item.timestamp).getTime(),
          price: item.price
        }));
      }
      
      // If not in DB, fetch from external API
      return await this.fetchTokenPriceHistoryFromAPI(chainId, tokenAddress, tokenSymbol, days, interval);
    } catch (error) {
      console.error('Error fetching token price history:', error);
      return null;
    }
  }

  /**
   * Fetch token price from external API
   * @private
   */
  private async fetchTokenPriceFromAPI(
    chainId: string,
    tokenAddress: string,
    tokenSymbol: string
  ): Promise<number | null> {
    try {
      // Determine which API to use based on chain and token
      const normalizedChain = chainId.toLowerCase();
      const normalizedSymbol = tokenSymbol.toUpperCase();
      
      // For demonstration, return mock prices
      // In production, this would call CoinGecko, CoinMarketCap, or chain-specific APIs
      
      if (normalizedSymbol === 'ETH') {
        return 3450.75;
      } else if (normalizedSymbol === 'WETH') {
        return 3450.75;
      } else if (normalizedSymbol === 'BTC' || normalizedSymbol === 'WBTC') {
        return 65403.22;
      } else if (normalizedSymbol === 'USDC' || normalizedSymbol === 'USDT' || normalizedSymbol === 'DAI') {
        return 1.00;
      } else if (normalizedSymbol === 'MATIC') {
        return 0.58;
      } else if (normalizedSymbol === 'AVAX') {
        return 28.34;
      } else if (normalizedSymbol === 'ARB') {
        return 0.92;
      } else if (normalizedSymbol === 'OP') {
        return 2.15;
      } else if (normalizedSymbol === 'AAVE') {
        return 112.45;
      } else if (normalizedSymbol === 'UNI') {
        return 8.75;
      } else if (normalizedSymbol === 'LINK') {
        return 15.22;
      } else {
        // Default mock price for unknown tokens
        return 0.01;
      }
    } catch (error) {
      console.error(`Error fetching price for ${tokenSymbol} on ${chainId}:`, error);
      return null;
    }
  }

  /**
   * Fetch token price history from external API
   * @private
   */
  private async fetchTokenPriceHistoryFromAPI(
    chainId: string,
    tokenAddress: string,
    tokenSymbol: string,
    days: number,
    interval: 'hour' | 'day'
  ): Promise<Array<{ timestamp: number; price: number }> | null> {
    try {
      // In production, this would call CoinGecko, CoinMarketCap, or chain-specific APIs
      
      // For demonstration, return mock historical data
      const result: Array<{ timestamp: number; price: number }> = [];
      const intervalMs = interval === 'hour' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
      const currentPrice = await this.fetchTokenPriceFromAPI(chainId, tokenAddress, tokenSymbol) || 1;
      
      // Generate mock price history with some volatility
      const startTime = Date.now() - days * 24 * 60 * 60 * 1000;
      for (let i = 0; i <= days * (interval === 'hour' ? 24 : 1); i++) {
        const timestamp = startTime + i * intervalMs;
        
        // Create some random price movement (±2% per period)
        const volatility = 0.02;
        const randomChange = 1 + (Math.random() * volatility * 2 - volatility);
        const previousPrice = result.length > 0 ? result[result.length - 1].price : currentPrice * 0.9;
        const price = previousPrice * randomChange;
        
        result.push({
          timestamp,
          price
        });
      }
      
      // Make sure the last price matches the current price approximately
      if (result.length > 0) {
        result[result.length - 1].price = currentPrice;
      }
      
      return result;
    } catch (error) {
      console.error(`Error fetching price history for ${tokenSymbol} on ${chainId}:`, error);
      return null;
    }
  }
}
