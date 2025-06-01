import { Database } from '@/types/database.types';
import axios from 'axios';
import crypto from 'crypto';

type Exchange = 'coinbase' | 'bybit' | 'hyperliquid';

interface ExchangeConfig {
  apiKey: string;
  secret: string;
  passphrase?: string; // Coinbase
  subaccount?: string; // Bybit
}

export class ExchangeService {
  private baseUrls = {
    coinbase: 'https://api.pro.coinbase.com',
    bybit: 'https://api.bybit.com',
    hyperliquid: 'https://api.hyperliquid.xyz'
  };

  private maxRetries = 3;
  private retryDelay = 1000;

  constructor(private exchange: Exchange, private config: ExchangeConfig) {}

  private async requestWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let attempts = 0;
    let lastError: Error;
    
    while (attempts < this.maxRetries) {
      try {
        return await fn();
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempts++;
        
        if (axios.isAxiosError(error) && error.response?.status && 
            error.response.status >= 400 && error.response.status < 500) {
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempts));
      }
    }
    
    throw lastError;
  }

  private async authenticatedRequest(method: string, endpoint: string, data?: any) {
    return this.requestWithRetry(async () => {
      const timestamp = Date.now();
      const url = `${this.baseUrls[this.exchange]}${endpoint}`;
      
      let signature: string;
      let headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // Exchange-specific auth
      switch (this.exchange) {
        case 'coinbase':
          const cbTimestamp = Math.floor(Date.now() / 1000);
          const cbSignature = crypto
            .createHmac('sha256', this.config.secret)
            .update(`${cbTimestamp}${method}${endpoint}${JSON.stringify(data || '')}`)
            .digest('hex');
          
          headers = {
            ...headers,
            'CB-ACCESS-KEY': this.config.apiKey,
            'CB-ACCESS-SIGN': cbSignature,
            'CB-ACCESS-TIMESTAMP': cbTimestamp.toString(),
            'CB-ACCESS-PASSPHRASE': this.config.passphrase || ''
          };
          break;
          
        case 'bybit':
          const bybitParams = new URLSearchParams(data).toString();
          const bybitSignature = crypto
            .createHmac('sha256', this.config.secret)
            .update(`${timestamp}${this.config.apiKey}5000${bybitParams}`)
            .digest('hex');
          
          headers = {
            ...headers,
            'X-BAPI-API-KEY': this.config.apiKey,
            'X-BAPI-SIGN': bybitSignature,
            'X-BAPI-TIMESTAMP': timestamp.toString(),
            'X-BAPI-RECV-WINDOW': '5000'
          };
          if (this.config.subaccount) {
            headers['X-BAPI-SUB-ACCOUNT'] = this.config.subaccount;
          }
          break;
      }

      const response = await axios({
        method,
        url,
        data,
        headers
      });

      return response.data;
    });
  }

  async getMarketPrice(symbol: string): Promise<number> {
    try {
      switch (this.exchange) {
        case 'coinbase':
          const cbData = await this.authenticatedRequest('GET', `/products/${symbol}/ticker`);
          return parseFloat(cbData.price);
          
        case 'bybit':
          const bybitData = await this.authenticatedRequest('GET', `/v5/market/tickers?category=spot&symbol=${symbol}`);
          return parseFloat(bybitData.result.list[0].lastPrice);
          
        default:
          throw new Error('Exchange not implemented');
      }
    } catch (error) {
      console.error('Failed to get market price:', error);
      throw error;
    }
  }

  async executeTrade(params: {
    symbol: string;
    side: 'buy' | 'sell';
    amount: number;
    type?: 'market' | 'limit';
    price?: number;
  }): Promise<{
    orderId: string;
    status: 'filled' | 'partial' | 'rejected';
    filledAmount: number;
    avgPrice: number;
  }> {
    try {
      switch (this.exchange) {
        case 'coinbase':
          const cbData = await this.authenticatedRequest('POST', '/orders', {
            type: params.type || 'market',
            side: params.side,
            product_id: params.symbol,
            funds: params.amount.toString(),
            price: params.price ? params.price.toString() : undefined
          });
          return {
            orderId: cbData.id,
            status: cbData.status,
            filledAmount: parseFloat(cbData.filled_size),
            avgPrice: parseFloat(cbData.executed_value) / parseFloat(cbData.filled_size)
          };
          
        case 'bybit':
          const bybitData = await this.authenticatedRequest('POST', '/v5/order/place', {
            category: 'spot',
            symbol: params.symbol,
            side: params.side,
            type: params.type || 'market',
            qty: params.amount.toString(),
            price: params.price ? params.price.toString() : undefined
          });
          return {
            orderId: bybitData.result.order_id,
            status: bybitData.result.status,
            filledAmount: parseFloat(bybitData.result.filled_qty),
            avgPrice: parseFloat(bybitData.result.avg_price)
          };
          
        default:
          throw new Error('Exchange not implemented');
      }
    } catch (error) {
      console.error('Failed to execute trade:', error);
      throw error;
    }
  }

  async getPortfolio(): Promise<{
    balances: Array<{ symbol: string; amount: number; value: number }>;
    totalValue: number;
  }> {
    try {
      switch (this.exchange) {
        case 'coinbase':
          const cbData = await this.authenticatedRequest('GET', '/accounts');
          // Process balances sequentially to properly handle async calls
          const balances = [];
          for (const account of cbData) {
            const price = await this.getMarketPrice(`${account.currency}/USD`);
            balances.push({
              symbol: account.currency,
              amount: parseFloat(account.balance),
              value: parseFloat(account.balance) * price
            });
          }
          return {
            balances,
            totalValue: balances.reduce((acc, balance) => acc + balance.value, 0)
          };
          
        case 'bybit':
          const bybitData = await this.authenticatedRequest('GET', '/v5/account/balances');
          // Process bybit balances sequentially to properly handle async calls
          const spotBalances = bybitData.result.list.filter((balance: any) => balance.type === 'spot');
          const bybitBalances = [];
          for (const balance of spotBalances) {
            const price = await this.getMarketPrice(`${balance.coin}/USDT`);
            bybitBalances.push({
              symbol: balance.coin,
              amount: parseFloat(balance.free),
              value: parseFloat(balance.free) * price
            });
          }
          return {
            balances: bybitBalances,
            totalValue: bybitBalances.reduce((acc, balance) => acc + balance.value, 0)
          };
          
        default:
          throw new Error('Exchange not implemented');
      }
    } catch (error) {
      console.error('Failed to get portfolio:', error);
      throw error;
    }
  }

  async getOrderBook(symbol: string, depth = 20): Promise<{
    bids: { price: number; amount: number }[];
    asks: { price: number; amount: number }[];
  }> {
    try {
      switch (this.exchange) {
        case 'coinbase':
          const cbData = await this.authenticatedRequest('GET', `/products/${symbol}/book?level=2`);
          return {
            bids: cbData.bids.map(([price, amount]: [string, string]) => ({
              price: parseFloat(price),
              amount: parseFloat(amount)
            })),
            asks: cbData.asks.map(([price, amount]: [string, string]) => ({
              price: parseFloat(price),
              amount: parseFloat(amount)
            }))
          };
          
        case 'bybit':
          const bybitData = await this.authenticatedRequest('GET', `/v5/market/orderbook?category=spot&symbol=${symbol}&limit=${depth}`);
          return {
            bids: bybitData.result.b.map(([price, amount]: [string, string]) => ({
              price: parseFloat(price),
              amount: parseFloat(amount)
            })),
            asks: bybitData.result.a.map(([price, amount]: [string, string]) => ({
              price: parseFloat(price),
              amount: parseFloat(amount)
            }))
          };
          
        default:
          throw new Error('Exchange not implemented');
      }
    } catch (error) {
      console.error('Failed to get order book:', error);
      throw error;
    }
  }

  async cancelOrder(orderId: string, symbol: string): Promise<boolean> {
    try {
      switch (this.exchange) {
        case 'coinbase':
          await this.authenticatedRequest('DELETE', `/orders/${orderId}`);
          return true;
          
        case 'bybit':
          const result = await this.authenticatedRequest('POST', '/v5/order/cancel', {
            category: 'spot',
            symbol,
            orderId
          });
          return result.result.success === 1;
          
        default:
          throw new Error('Exchange not implemented');
      }
    } catch (error) {
      console.error('Failed to cancel order:', error);
      return false;
    }
  }

  async getTradeHistory(symbol: string, limit = 100): Promise<Array<{
    id: string;
    symbol: string;
    side: 'buy' | 'sell';
    amount: number;
    price: number;
    fee: number;
    timestamp: string;
  }>> {
    try {
      switch (this.exchange) {
        case 'coinbase':
          const cbData = await this.authenticatedRequest('GET', `/fills?product_id=${symbol}&limit=${limit}`);
          return cbData.map((trade: any) => ({
            id: trade.trade_id,
            symbol: trade.product_id,
            side: trade.side,
            amount: parseFloat(trade.size),
            price: parseFloat(trade.price),
            fee: parseFloat(trade.fee),
            timestamp: trade.created_at
          }));
          
        case 'bybit':
          const bybitData = await this.authenticatedRequest('GET', `/v5/execution/list?category=spot&symbol=${symbol}&limit=${limit}`);
          return bybitData.result.list.map((trade: any) => ({
            id: trade.execId,
            symbol: trade.symbol,
            side: trade.side.toLowerCase(),
            amount: parseFloat(trade.execQty),
            price: parseFloat(trade.execPrice),
            fee: parseFloat(trade.execFee),
            timestamp: trade.execTime
          }));
          
        default:
          throw new Error('Exchange not implemented');
      }
    } catch (error) {
      console.error('Failed to get trade history:', error);
      throw error;
    }
  }
}
