import { ExchangeService } from './exchangeService';
import { Database } from '@/types/database.types';
import { exchangeConfigs, ExchangeConfigKey } from '@/config/exchanges';

type ExchangeConfig = {
  exchange: 'coinbase' | 'bybit' | 'hyperliquid';
  apiKey: string;
  secret: string;
  passphrase?: string;
  subaccount?: string;
};

export class ExchangeManager {
  private exchanges: Map<string, ExchangeService> = new Map();
  private rateLimits: Map<string, { lastRequest: number; requests: number }> = new Map();

  constructor() {
    this.initializeExchanges();
  }

  private initializeExchanges() {
    Object.entries(exchangeConfigs).forEach(([key, config]) => {
      this.exchanges.set(key, new ExchangeService(config.exchange, config));
      this.rateLimits.set(key, { lastRequest: 0, requests: 0 });
    });
  }

  private async checkRateLimit(key: string) {
    const now = Date.now();
    const limit = this.rateLimits.get(key)!;
    
    // Reset counter if more than 1 second has passed
    if (now - limit.lastRequest > 1000) {
      limit.requests = 0;
      limit.lastRequest = now;
    }

    // Coinbase: 10 requests/second, Bybit: 20 requests/second
    const maxRequests = key.startsWith('coinbase') ? 10 : 20;
    
    if (limit.requests >= maxRequests) {
      const waitTime = 1000 - (now - limit.lastRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.checkRateLimit(key); // Recursive check after waiting
    }

    limit.requests++;
  }

  async executeOnExchange<T>(
    key: ExchangeConfigKey,
    operation: (service: ExchangeService) => Promise<T>
  ): Promise<T> {
    const service = this.getExchange(key);
    
    await this.checkRateLimit(key);
    
    try {
      return await operation(service);
    } catch (error) {
      console.error(`Exchange operation failed (${key}):`, error);
      throw error;
    }
  }

  getExchange(key: ExchangeConfigKey): ExchangeService {
    const service = this.exchanges.get(key);
    if (!service) {
      throw new Error(`Exchange ${key} not configured`);
    }
    return service;
  }

  // Convenience methods
  async getMarketPrice(key: ExchangeConfigKey, symbol: string) {
    return this.executeOnExchange(key, s => s.getMarketPrice(symbol));
  }

  async executeTrade(
    key: ExchangeConfigKey,
    params: Parameters<ExchangeService['executeTrade']>[0]
  ) {
    return this.executeOnExchange(key, s => s.executeTrade(params));
  }

  async getPortfolio(key: ExchangeConfigKey) {
    return this.executeOnExchange(key, s => s.getPortfolio());
  }
}
