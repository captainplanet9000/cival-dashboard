import { ExchangeConfig } from '@/services/exchangeManager';

export const exchangeConfigs: Record<string, ExchangeConfig> = {
  coinbase_main: {
    exchange: 'coinbase',
    apiKey: process.env.COINBASE_API_KEY || '',
    secret: process.env.COINBASE_API_SECRET || '',
    passphrase: process.env.COINBASE_API_PASSPHRASE || ''
  },
  bybit_main: {
    exchange: 'bybit',
    apiKey: process.env.BYBIT_API_KEY || '',
    secret: process.env.BYBIT_API_SECRET || ''
  },
  bybit_trading: {
    exchange: 'bybit',
    apiKey: process.env.BYBIT_TRADING_API_KEY || '',
    secret: process.env.BYBIT_TRADING_API_SECRET || '',
    subaccount: 'trading'
  }
};

export type ExchangeConfigKey = keyof typeof exchangeConfigs;
