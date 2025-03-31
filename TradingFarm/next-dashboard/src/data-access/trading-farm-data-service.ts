import { SupabaseClientFactory } from '../lib/supabase-client';
import { FarmRepository } from './repositories/farm-repository';
import { AgentRepository } from './repositories/agent-repository';
import { WalletRepository } from './repositories/wallet-repository';
import { MarketDataRepository } from './repositories/market-data-repository';
import { OrderRepository } from './repositories/order-repository';
import { TradeRepository } from './repositories/trade-repository';
import { AgentMessageRepository } from './repositories/agent-message-repository';
import { TransactionRepository } from './repositories/transaction-repository';

/**
 * The TradingFarmDataService acts as the central point for accessing all data repositories
 * and provides a unified interface for database operations.
 */
export class TradingFarmDataService {
  private static instance: TradingFarmDataService;
  private initialized: boolean = false;

  // Repositories
  public readonly farmRepository: FarmRepository;
  public readonly agentRepository: AgentRepository;
  public readonly walletRepository: WalletRepository;
  public readonly marketDataRepository: MarketDataRepository;
  public readonly orderRepository: OrderRepository;
  public readonly tradeRepository: TradeRepository;
  public readonly agentMessageRepository: AgentMessageRepository;
  public readonly transactionRepository: TransactionRepository;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Initialize repositories
    this.farmRepository = new FarmRepository();
    this.agentRepository = new AgentRepository();
    this.walletRepository = new WalletRepository();
    this.marketDataRepository = new MarketDataRepository();
    this.orderRepository = new OrderRepository();
    this.tradeRepository = new TradeRepository();
    this.agentMessageRepository = new AgentMessageRepository();
    this.transactionRepository = new TransactionRepository();
  }

  /**
   * Initialize the data service with an optional API key
   */
  public static initialize(apiKey?: string): void {
    // Initialize Supabase with the API key
    SupabaseClientFactory.initialize(apiKey);
    
    // Create instance if it doesn't exist
    if (!TradingFarmDataService.instance) {
      TradingFarmDataService.instance = new TradingFarmDataService();
    }
    
    TradingFarmDataService.instance.initialized = true;
  }

  /**
   * Get the singleton instance of the data service
   */
  public static getInstance(): TradingFarmDataService {
    if (!TradingFarmDataService.instance) {
      TradingFarmDataService.instance = new TradingFarmDataService();
      
      // Auto-initialize with environment variables if not initialized yet
      if (!TradingFarmDataService.instance.initialized) {
        TradingFarmDataService.initialize();
      }
    }
    
    return TradingFarmDataService.instance;
  }

  /**
   * Check connection to the database
   */
  public async testConnection(): Promise<boolean> {
    try {
      // Try to fetch a single farm to test the connection
      await this.farmRepository.findAll({ limit: 1 });
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const tradingFarmData = TradingFarmDataService.getInstance(); 