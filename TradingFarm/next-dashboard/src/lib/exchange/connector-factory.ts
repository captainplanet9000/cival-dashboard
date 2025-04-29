"use client";

/**
 * Exchange Connector Factory
 * 
 * Factory function to create the appropriate exchange connector based on the exchange name.
 * This centralizes connector instantiation and makes it easy to add new exchange connectors.
 */

import { IExchangeConnector } from './types';
import { BinanceConnector } from './connectors/binance-connector';
import { HyperliquidConnector } from './connectors/hyperliquid-connector';
import { CoinbaseConnector } from './connectors/coinbase-connector';
import { BybitConnector } from './connectors/bybit-connector';

/**
 * Options for creating an exchange connector
 */
export interface ConnectorOptions {
  /**
   * Whether to use testnet rather than production
   */
  useTestnet?: boolean;
  
  /**
   * Exchange-specific options
   */
  exchangeOptions?: Record<string, any>;
}

/**
 * Create an exchange connector for the specified exchange
 * 
 * @param exchange - The name of the exchange to connect to
 * @param options - Optional configuration for the connector
 * @returns An implementation of IExchangeConnector for the specified exchange
 * @throws Error if the exchange is not supported
 */
export function createExchangeConnector(
  exchange: string,
  options: ConnectorOptions = {}
): IExchangeConnector {
  const { useTestnet = false, exchangeOptions = {} } = options;
  
  // Normalize exchange name
  const normalizedExchange = exchange.toLowerCase().trim();
  
  // Create the appropriate connector based on the exchange name
  switch (normalizedExchange) {
    case 'binance':
      return new BinanceConnector(useTestnet);
    
    case 'hyperliquid':
      // Pass universe option if provided
      const universe = exchangeOptions.universe || 'main';
      return new HyperliquidConnector(useTestnet, universe);
    
    case 'coinbase':
      return new CoinbaseConnector(useTestnet);
    
    case 'bybit':
      return new BybitConnector(useTestnet);
      
    // Add more exchange connectors here as they are implemented
    
    default:
      throw new Error(`Unsupported exchange: ${exchange}`);
  }
}

/**
 * Get a list of supported exchanges
 * 
 * @returns Array of supported exchange names
 */
export function getSupportedExchanges(): string[] {
  return [
    'binance',
    'hyperliquid',
    'coinbase',
    'bybit'
    // Add more exchanges here as they are implemented
  ];
}

/**
 * Check if an exchange is supported
 * 
 * @param exchange - The name of the exchange to check
 * @returns Boolean indicating whether the exchange is supported
 */
export function isExchangeSupported(exchange: string): boolean {
  const normalizedExchange = exchange.toLowerCase().trim();
  return getSupportedExchanges().map(e => e.toLowerCase()).includes(normalizedExchange);
}
