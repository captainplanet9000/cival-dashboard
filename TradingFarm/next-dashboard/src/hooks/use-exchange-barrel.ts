/**
 * Barrel file for exchange hooks
 * This file exports all the hooks from either real implementations or mocks based on build environment
 */

// Import from mock implementations during build
import { 
  useExchangeSymbols,
  useMarketData,
  useExchangeWebSocket,
  useOrders,
  useOrderBook,
  useExchangeAccounts,
  useExchangeCredentials,
  cancelOrderById
} from './use-exchange-mocks';

// Re-export all the hooks
export {
  useExchangeSymbols,
  useMarketData,
  useExchangeWebSocket, 
  useOrders,
  useOrderBook,
  useExchangeAccounts,
  useExchangeCredentials,
  cancelOrderById
};

// Re-export types
export type { 
  ExchangeType,
  ExchangeDataType,
  ConnectionState,
  OHLCV,
  OrderBook,
  OrderBookLevel
} from './use-exchange-mocks';
