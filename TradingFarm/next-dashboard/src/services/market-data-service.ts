/**
 * Market Data Service
 * 
 * Production-ready service for fetching real cryptocurrency market data
 * using the CoinGecko API
 */

// Define base API URL
const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';

// Market data types
export interface MarketData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number | null;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number | null;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  last_updated: string;
}

export interface MarketChartData {
  prices: [number, number][];
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

export interface SimplePrice {
  [id: string]: {
    [currency: string]: number;
  };
}

// Market data service class
export class MarketDataService {
  private apiKey: string | null = null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || null;
  }

  /**
   * Get headers for API requests, including API key if available
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['x-cg-pro-api-key'] = this.apiKey;
    }

    return headers;
  }

  /**
   * Get market data for multiple cryptocurrencies
   * @param vsCurrency Currency to compare against (e.g., usd)
   * @param ids List of cryptocurrency IDs
   * @param page Page number
   * @param perPage Number of results per page
   * @returns Array of market data
   */
  async getMarketData(
    vsCurrency: string = 'usd',
    ids?: string[],
    page: number = 1,
    perPage: number = 100
  ): Promise<MarketData[]> {
    const params = new URLSearchParams({
      vs_currency: vsCurrency,
      order: 'market_cap_desc',
      per_page: perPage.toString(),
      page: page.toString(),
      sparkline: 'false',
      price_change_percentage: '24h'
    });

    if (ids && ids.length > 0) {
      params.append('ids', ids.join(','));
    }

    try {
      const response = await fetch(
        `${COINGECKO_API_URL}/coins/markets?${params.toString()}`,
        { headers: this.getHeaders() }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error fetching market data:', error);
      throw error;
    }
  }

  /**
   * Get market chart data for a cryptocurrency
   * @param id Cryptocurrency ID
   * @param vsCurrency Currency to compare against (e.g., usd)
   * @param days Number of days of data to retrieve
   * @returns Market chart data
   */
  async getMarketChart(
    id: string,
    vsCurrency: string = 'usd',
    days: number | 'max' = 7,
    interval?: string
  ): Promise<MarketChartData> {
    const params = new URLSearchParams({
      vs_currency: vsCurrency,
      days: days.toString()
    });

    if (interval) {
      params.append('interval', interval);
    }

    try {
      const response = await fetch(
        `${COINGECKO_API_URL}/coins/${id}/market_chart?${params.toString()}`,
        { headers: this.getHeaders() }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error fetching market chart data:', error);
      throw error;
    }
  }

  /**
   * Get current price for multiple cryptocurrencies
   * @param ids List of cryptocurrency IDs
   * @param vsCurrencies List of currencies to compare against
   * @returns Simple price data
   */
  async getSimplePrice(
    ids: string[],
    vsCurrencies: string[] = ['usd']
  ): Promise<SimplePrice> {
    const params = new URLSearchParams({
      ids: ids.join(','),
      vs_currencies: vsCurrencies.join(','),
      include_market_cap: 'true',
      include_24hr_vol: 'true',
      include_24hr_change: 'true',
      include_last_updated_at: 'true'
    });

    try {
      const response = await fetch(
        `${COINGECKO_API_URL}/simple/price?${params.toString()}`,
        { headers: this.getHeaders() }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error fetching simple price data:', error);
      throw error;
    }
  }

  /**
   * Get trending cryptocurrencies
   * @returns Trending cryptocurrency data
   */
  async getTrending() {
    try {
      const response = await fetch(
        `${COINGECKO_API_URL}/search/trending`,
        { headers: this.getHeaders() }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error fetching trending data:', error);
      throw error;
    }
  }

  /**
   * Search for cryptocurrencies
   * @param query Search query
   * @returns Search results
   */
  async search(query: string) {
    try {
      const response = await fetch(
        `${COINGECKO_API_URL}/search?query=${encodeURIComponent(query)}`,
        { headers: this.getHeaders() }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error searching cryptocurrencies:', error);
      throw error;
    }
  }
}
