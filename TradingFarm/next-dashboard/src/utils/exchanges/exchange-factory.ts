import { ExchangeAdapter, ExchangeCredentials } from './exchange-adapter';
import { CoinbaseAdapter } from './coinbase-adapter';
import { BybitAdapter } from './bybit-adapter';
import { HyperliquidAdapter } from './hyperliquid-adapter';

export type ExchangeName = 'coinbase' | 'bybit' | 'hyperliquid';

/**
 * Exchange Factory
 * Creates appropriate exchange adapters based on name and configuration
 */
export class ExchangeFactory {
  /**
   * Create a new exchange adapter
   */
  static createAdapter(exchangeName: ExchangeName): ExchangeAdapter {
    switch (exchangeName.toLowerCase()) {
      case 'coinbase':
        return new CoinbaseAdapter();
      case 'bybit':
        return new BybitAdapter();
      case 'hyperliquid':
        return new HyperliquidAdapter();
      default:
        throw new Error(`Unsupported exchange: ${exchangeName}`);
    }
  }

  /**
   * Connect to an exchange with the appropriate adapter
   */
  static async connectToExchange(
    exchangeName: ExchangeName,
    credentials: ExchangeCredentials
  ): Promise<{
    adapter: ExchangeAdapter;
    connectionResult: { success: boolean; message: string; permissions?: any };
  }> {
    const adapter = this.createAdapter(exchangeName);
    const connectionResult = await adapter.connect(credentials);

    return {
      adapter,
      connectionResult
    };
  }

  /**
   * Get exchange features and capabilities
   */
  static getExchangeFeatures(exchangeName: ExchangeName): {
    supportsMargin: boolean;
    supportsFutures: boolean;
    supportsOptions: boolean;
    supportsLeverage: boolean;
    supportsStopOrders: boolean;
    supportsBulkOrders: boolean;
    hasWebsocket: boolean;
    hasPaperTrading: boolean;
    depositMethods: string[];
    withdrawalMethods: string[];
    description: string;
  } {
    switch (exchangeName.toLowerCase()) {
      case 'coinbase':
        return {
          supportsMargin: false,
          supportsFutures: false,
          supportsOptions: false,
          supportsLeverage: false,
          supportsStopOrders: true,
          supportsBulkOrders: false,
          hasWebsocket: true,
          hasPaperTrading: false,
          depositMethods: ['crypto', 'bank', 'card'],
          withdrawalMethods: ['crypto', 'bank'],
          description: 'Coinbase is a popular cryptocurrency exchange based in the United States, offering spot trading with an easy-to-use interface and high security standards.'
        };
      case 'bybit':
        return {
          supportsMargin: true,
          supportsFutures: true,
          supportsOptions: true,
          supportsLeverage: true,
          supportsStopOrders: true,
          supportsBulkOrders: true,
          hasWebsocket: true,
          hasPaperTrading: true,
          depositMethods: ['crypto'],
          withdrawalMethods: ['crypto'],
          description: 'Bybit is a global cryptocurrency derivatives exchange with a focus on perpetual contracts, futures, and options trading, supporting high leverage and advanced order types.'
        };
      case 'hyperliquid':
        return {
          supportsMargin: true,
          supportsFutures: true,
          supportsOptions: false,
          supportsLeverage: true,
          supportsStopOrders: true,
          supportsBulkOrders: false,
          hasWebsocket: true,
          hasPaperTrading: false,
          depositMethods: ['crypto'],
          withdrawalMethods: ['crypto'],
          description: 'Hyperliquid is a decentralized perpetual futures exchange focused on providing low fees, high leverage, and a seamless trading experience for crypto derivatives.'
        };
      default:
        throw new Error(`Unsupported exchange: ${exchangeName}`);
    }
  }

  /**
   * Get exchange API documentation URL
   */
  static getExchangeDocsUrl(exchangeName: ExchangeName): string {
    switch (exchangeName.toLowerCase()) {
      case 'coinbase':
        return 'https://docs.cloud.coinbase.com/advanced-trade-api/docs/welcome';
      case 'bybit':
        return 'https://bybit-exchange.github.io/docs/v5/intro';
      case 'hyperliquid':
        return 'https://hyperliquid.gitbook.io/hyperliquid-docs/';
      default:
        return '';
    }
  }
}
