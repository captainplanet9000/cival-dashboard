import { ExchangeConnector } from './exchange-connector';
import { BybitConnector } from './connectors/bybit-connector';
import { BinanceConnector } from './connectors/binance-connector';
import { CoinbaseConnector } from './connectors/coinbase-connector';
import { KrakenConnector } from './connectors/kraken-connector';
import { HyperliquidConnector } from './connectors/hyperliquid-connector';
import { OKXConnector } from './connectors/okx-connector';
import { FTXConnector } from './connectors/ftx-connector';
import { ExchangeType } from '../../types/exchange-types';

/**
 * Protocol Factory for creating and managing exchange protocol connectors
 * Implements the Factory pattern for creating different exchange connectors
 */
export class ProtocolFactory {
  private static instance: ProtocolFactory;
  private connectors: Map<string, any> = new Map();
  private initialized: boolean = false;
  
  /**
   * Private constructor for singleton pattern
   */
  private constructor() {}
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): ProtocolFactory {
    if (!ProtocolFactory.instance) {
      ProtocolFactory.instance = new ProtocolFactory();
    }
    return ProtocolFactory.instance;
  }
  
  /**
   * Initialize all protocol connectors
   * Can be called with specific API keys or using environment variables
   */
  public initializeConnectors(config?: {
    bybit?: { apiKey: string; apiSecret: string; testnet?: boolean };
    binance?: { apiKey: string; apiSecret: string; testnet?: boolean };
    coinbase?: { apiKey: string; apiSecret: string };
    kraken?: { apiKey: string; apiSecret: string };
    hyperliquid?: { address: string; privateKey: string; testnet?: boolean };
    okx?: { apiKey: string; apiSecret: string; passphrase: string; testnet?: boolean };
    ftx?: { apiKey: string; apiSecret: string; subAccount?: string; isUS?: boolean };
  }): void {
    // Initialize Bybit connector
    this.connectors.set(
      ExchangeType.BYBIT,
      new BybitConnector(
        config?.bybit?.apiKey || process.env.BYBIT_API_KEY || '',
        config?.bybit?.apiSecret || process.env.BYBIT_API_SECRET || '',
        config?.bybit?.testnet || process.env.BYBIT_TESTNET === 'true'
      )
    );
    
    // Initialize Binance connector
    this.connectors.set(
      ExchangeType.BINANCE,
      new BinanceConnector(
        config?.binance?.apiKey || process.env.BINANCE_API_KEY || '',
        config?.binance?.apiSecret || process.env.BINANCE_API_SECRET || '',
        config?.binance?.testnet || process.env.BINANCE_TESTNET === 'true'
      )
    );
    
    // Initialize Coinbase connector
    this.connectors.set(
      ExchangeType.COINBASE,
      new CoinbaseConnector(
        config?.coinbase?.apiKey || process.env.COINBASE_API_KEY || '',
        config?.coinbase?.apiSecret || process.env.COINBASE_API_SECRET || ''
      )
    );
    
    // Initialize Kraken connector
    this.connectors.set(
      ExchangeType.KRAKEN,
      new KrakenConnector(
        config?.kraken?.apiKey || process.env.KRAKEN_API_KEY || '',
        config?.kraken?.apiSecret || process.env.KRAKEN_API_SECRET || ''
      )
    );
    
    // Initialize Hyperliquid connector
    this.connectors.set(
      ExchangeType.HYPERLIQUID,
      new HyperliquidConnector(
        config?.hyperliquid?.address || process.env.HYPERLIQUID_ADDRESS || '',
        config?.hyperliquid?.privateKey || process.env.HYPERLIQUID_PRIVATE_KEY || '',
        config?.hyperliquid?.testnet || process.env.HYPERLIQUID_TESTNET === 'true'
      )
    );
    
    // Initialize OKX connector
    this.connectors.set(
      ExchangeType.OKX,
      new OKXConnector(
        config?.okx?.apiKey || process.env.OKX_API_KEY || '',
        config?.okx?.apiSecret || process.env.OKX_API_SECRET || '',
        config?.okx?.passphrase || process.env.OKX_PASSPHRASE || '',
        config?.okx?.testnet || process.env.OKX_TESTNET === 'true'
      )
    );
    
    // Initialize FTX connector
    this.connectors.set(
      ExchangeType.FTX,
      new FTXConnector(
        config?.ftx?.apiKey || process.env.FTX_API_KEY || '',
        config?.ftx?.apiSecret || process.env.FTX_API_SECRET || '',
        config?.ftx?.subAccount || process.env.FTX_SUBACCOUNT,
        config?.ftx?.isUS || process.env.FTX_IS_US === 'true'
      )
    );
    
    this.initialized = true;
  }
  
  /**
   * Get a specific protocol connector by exchange type
   */
  public getConnector(exchangeType: ExchangeType): any {
    if (!this.initialized) {
      this.initializeConnectors();
    }
    
    const connector = this.connectors.get(exchangeType);
    if (!connector) {
      throw new Error(`Connector for exchange ${exchangeType} not found`);
    }
    
    return connector;
  }
  
  /**
   * Get all available connectors
   */
  public getAllConnectors(): Map<string, any> {
    if (!this.initialized) {
      this.initializeConnectors();
    }
    
    return this.connectors;
  }
  
  /**
   * Initialize connectors with specific API keys
   */
  public initializeWithTestCredentials(): void {
    this.initializeConnectors({
      // Hyperliquid testnet config
      hyperliquid: {
        address: '0xAe93892da6055a6ed3d5AAa53A05Ce54ee28dDa2',
        privateKey: '0x694d2495cfee9ae3432c2d4b27e477c0ada36e55fd5b1ec47a3b23330143ceb7',
        testnet: true
      },
      // Coinbase config
      coinbase: {
        apiKey: 'ba89aa7d-dc13-460a-962c-d88922e770c1',
        apiSecret: 'RtG+0ulq5iaB/F8XsRapQi20HuSHlzx6S2kyVm9+NQaAjZuMTalPSn4HbYZu9ZMrSxKA4akPJSKvkkRtt1JKog=='
      },
      // OKX config
      okx: {
        apiKey: '19e6ece6-9687-44a4-bb25-761a038873b7',
        apiSecret: '7B53C760E630CF2C32F2B02163EBB44E',
        passphrase: 'farm',
        testnet: true
      }
    });
  }
  
  /**
   * Test connections to all exchanges
   */
  public async testConnections(): Promise<Record<string, boolean>> {
    if (!this.initialized) {
      this.initializeConnectors();
    }
    
    const results: Record<string, boolean> = {};
    
    for (const [exchange, connector] of this.connectors.entries()) {
      try {
        results[exchange] = await connector.testConnection();
      } catch (error) {
        console.error(`Error testing connection to ${exchange}:`, error);
        results[exchange] = false;
      }
    }
    
    return results;
  }
} 