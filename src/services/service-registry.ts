import { ExchangeConnector } from './exchange/exchange-connector';
import { MarketStackService } from './market-data/market-stack-service';
import { OpenAIService } from './ai/openai-service';
import { NeonPgVectorService } from './vector/neon-pgvector-service';
import { AlchemyService } from './blockchain/alchemy-service';
import { Network } from 'alchemy-sdk';

/**
 * Central registry for all Trading Farm services
 */
export class ServiceRegistry {
  private static instance: ServiceRegistry;
  
  // Exchange connector
  private _exchangeConnector: ExchangeConnector;
  
  // Market data services
  private _marketStackService: MarketStackService;
  
  // AI services
  private _openAIService: OpenAIService;
  
  // Vector/memory services
  private _neonPgVectorService: NeonPgVectorService;
  
  // Blockchain services
  private _alchemyService: AlchemyService;
  
  private constructor() {
    // Services are initialized lazily
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    
    return ServiceRegistry.instance;
  }
  
  /**
   * Initialize all services with API keys
   */
  public initialize(apiKeys: {
    bybit?: { apiKey: string, apiSecret: string },
    coinbase?: { apiKey: string, privateKey: string },
    hyperliquid?: { address: string, privateKey: string },
    marketStack?: string,
    openAI?: string,
    neonPostgres?: string,
    alchemy?: string
  }) {
    // Initialize exchange connector if keys are provided
    if (apiKeys.bybit || apiKeys.coinbase || apiKeys.hyperliquid) {
      this._exchangeConnector = new ExchangeConnector();
    }
    
    // Initialize market data services
    if (apiKeys.marketStack) {
      this._marketStackService = new MarketStackService(apiKeys.marketStack);
    }
    
    // Initialize AI services
    if (apiKeys.openAI) {
      this._openAIService = new OpenAIService(apiKeys.openAI);
    }
    
    // Initialize vector/memory services
    if (apiKeys.neonPostgres && apiKeys.openAI) {
      this._neonPgVectorService = new NeonPgVectorService(
        apiKeys.neonPostgres,
        apiKeys.openAI
      );
    }
    
    // Initialize blockchain services
    if (apiKeys.alchemy) {
      this._alchemyService = new AlchemyService(
        apiKeys.alchemy,
        Network.ETH_MAINNET
      );
    }
  }
  
  /**
   * Get exchange connector
   */
  get exchangeConnector(): ExchangeConnector {
    if (!this._exchangeConnector) {
      throw new Error('Exchange connector not initialized');
    }
    
    return this._exchangeConnector;
  }
  
  /**
   * Get MarketStack service
   */
  get marketStackService(): MarketStackService {
    if (!this._marketStackService) {
      throw new Error('MarketStack service not initialized');
    }
    
    return this._marketStackService;
  }
  
  /**
   * Get OpenAI service
   */
  get openAIService(): OpenAIService {
    if (!this._openAIService) {
      throw new Error('OpenAI service not initialized');
    }
    
    return this._openAIService;
  }
  
  /**
   * Get Neon PgVector service
   */
  get neonPgVectorService(): NeonPgVectorService {
    if (!this._neonPgVectorService) {
      throw new Error('Neon PgVector service not initialized');
    }
    
    return this._neonPgVectorService;
  }
  
  /**
   * Get Alchemy service
   */
  get alchemyService(): AlchemyService {
    if (!this._alchemyService) {
      throw new Error('Alchemy service not initialized');
    }
    
    return this._alchemyService;
  }
} 