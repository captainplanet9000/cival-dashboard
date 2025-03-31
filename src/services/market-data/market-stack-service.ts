import axios from 'axios';

export class MarketStackService {
  private apiKey: string;
  private baseUrl: string = 'http://api.marketstack.com/v1';
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  /**
   * Get latest end-of-day data for a stock symbol
   */
  async getEndOfDay(symbol: string) {
    const endpoint = '/eod/latest';
    const params = {
      access_key: this.apiKey,
      symbols: symbol
    };
    
    try {
      const response = await axios.get(`${this.baseUrl}${endpoint}`, { params });
      
      if (response.data.data && response.data.data.length > 0) {
        return response.data.data[0];
      } else {
        throw new Error(`No data found for symbol ${symbol}`);
      }
    } catch (error) {
      console.error('MarketStack API Error:', error.message);
      throw error;
    }
  }
  
  /**
   * Get historical end-of-day data for a stock symbol
   */
  async getHistoricalData(symbol: string, from: string, to: string, limit: number = 100) {
    const endpoint = '/eod';
    const params = {
      access_key: this.apiKey,
      symbols: symbol,
      date_from: from,
      date_to: to,
      limit
    };
    
    try {
      const response = await axios.get(`${this.baseUrl}${endpoint}`, { params });
      
      if (response.data.data && response.data.data.length > 0) {
        return response.data.data;
      } else {
        throw new Error(`No historical data found for symbol ${symbol}`);
      }
    } catch (error) {
      console.error('MarketStack API Error:', error.message);
      throw error;
    }
  }
  
  /**
   * Get intraday price data for a stock symbol
   */
  async getIntraday(symbol: string, interval: string = '1min', limit: number = 100) {
    const endpoint = '/intraday';
    const params = {
      access_key: this.apiKey,
      symbols: symbol,
      interval,
      limit
    };
    
    try {
      const response = await axios.get(`${this.baseUrl}${endpoint}`, { params });
      
      if (response.data.data && response.data.data.length > 0) {
        return response.data.data;
      } else {
        throw new Error(`No intraday data found for symbol ${symbol}`);
      }
    } catch (error) {
      console.error('MarketStack API Error:', error.message);
      throw error;
    }
  }
  
  /**
   * Search for tickers by keyword
   */
  async tickerSearch(search: string, limit: number = 10) {
    const endpoint = '/tickers';
    const params = {
      access_key: this.apiKey,
      search,
      limit
    };
    
    try {
      const response = await axios.get(`${this.baseUrl}${endpoint}`, { params });
      
      if (response.data.data) {
        return response.data.data;
      } else {
        return [];
      }
    } catch (error) {
      console.error('MarketStack API Error:', error.message);
      throw error;
    }
  }
} 