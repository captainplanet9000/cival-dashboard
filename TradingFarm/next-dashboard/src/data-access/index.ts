// Base classes
export * from './lib/base-repository';
export * from './lib/supabase-client';

// Model exports - using explicit re-exports to avoid ambiguity
export { BaseEntity } from './models/base-entity';
export { Farm } from './models/farm';
export { Agent } from './models/agent';
export { MarketData } from './models/market-data';
export { Order } from './models/order';
export { Trade } from './models/trade';
export { Wallet } from './models/wallet';

// Repositories
export * from './repositories/farm-repository';
export * from './repositories/agent-repository';
export * from './repositories/strategy-repository';
export * from './repositories/wallet-repository';
export * from './repositories/market-repository';
export * from './repositories/order-repository';

// Services
export * from './services/eliza-command-service';
export * from './services/realtime-service';

// Memory Systems
export * from './memory/cognee-client';
export * from './memory/graphiti-client';
export * from './memory/trading-farm-memory';

// Import types
import { FarmRepository } from './repositories/farm-repository';
import { AgentRepository } from './repositories/agent-repository';
import { StrategyRepository } from './repositories/strategy-repository';
import { WalletRepository } from './repositories/wallet-repository';
import { MarketDataRepository } from './repositories/market-repository';
import { OrderRepository } from './repositories/order-repository';
import { ElizaCommandService } from './services/eliza-command-service';
import { RealtimeService } from './services/realtime-service';
import { SupabaseClientFactory, getSupabaseClient } from './lib/supabase-client';
import { SupabaseClient } from '@supabase/supabase-js';
import { getCogneeClient } from './memory/cognee-client';
import { getGraphitiClient } from './memory/graphiti-client';
import { getTradingFarmMemory } from './memory/trading-farm-memory';

// Convenience factory for creating all repositories
export class TradingFarmDataService {
  private static instance: TradingFarmDataService;
  
  // Repositories
  private _farmRepository: FarmRepository;
  private _agentRepository: AgentRepository;
  private _strategyRepository: StrategyRepository;
  private _walletRepository: WalletRepository;
  private _marketDataRepository: MarketDataRepository;
  private _orderRepository: OrderRepository;
  
  // Services
  private _elizaCommandService: ElizaCommandService;
  private _realtimeService: RealtimeService;
  
  // Memory Systems
  private _cogneeClient = getCogneeClient();
  private _graphitiClient = getGraphitiClient();
  private _tradingFarmMemory = getTradingFarmMemory();

  private constructor() {
    // Initialize repositories
    this._farmRepository = new FarmRepository();
    this._agentRepository = new AgentRepository();
    this._strategyRepository = new StrategyRepository();
    this._walletRepository = new WalletRepository();
    this._marketDataRepository = new MarketDataRepository();
    this._orderRepository = new OrderRepository();
    
    // Initialize services
    this._elizaCommandService = new ElizaCommandService();
    this._realtimeService = new RealtimeService();
  }
  
  public static getInstance(): TradingFarmDataService {
    if (!TradingFarmDataService.instance) {
      TradingFarmDataService.instance = new TradingFarmDataService();
    }
    return TradingFarmDataService.instance;
  }
  
  public static initialize(apiKey: string): void {
    SupabaseClientFactory.initialize(apiKey);
    
    // Create an instance if it doesn't exist
    if (!TradingFarmDataService.instance) {
      TradingFarmDataService.instance = new TradingFarmDataService();
    }
    
    console.log('Trading Farm Data Service initialized successfully');
  }
  
  // Repositories
  get farmRepository(): FarmRepository {
    return this._farmRepository;
  }
  
  get agentRepository(): AgentRepository {
    return this._agentRepository;
  }
  
  get strategyRepository(): StrategyRepository {
    return this._strategyRepository;
  }
  
  get walletRepository(): WalletRepository {
    return this._walletRepository;
  }
  
  get marketDataRepository(): MarketDataRepository {
    return this._marketDataRepository;
  }
  
  get orderRepository(): OrderRepository {
    return this._orderRepository;
  }
  
  // Services
  get elizaCommandService(): ElizaCommandService {
    return this._elizaCommandService;
  }
  
  get realtimeService(): RealtimeService {
    return this._realtimeService;
  }
  
  // Memory Systems
  get cogneeClient() {
    return this._cogneeClient;
  }
  
  get graphitiClient() {
    return this._graphitiClient;
  }
  
  get tradingFarmMemory() {
    return this._tradingFarmMemory;
  }
  
  // Initialize memory systems with API keys
  public initializeMemorySystems(cogneeApiKey: string, graphitiApiKey: string): void {
    this._cogneeClient.initialize(cogneeApiKey);
    this._graphitiClient.initialize(graphitiApiKey);
    this._tradingFarmMemory.initialize(cogneeApiKey, graphitiApiKey);
    
    // Setup automatic memory updates
    this._tradingFarmMemory.setupAutomaticMemoryUpdates();
    
    console.log('Trading Farm Memory Systems initialized successfully');
  }
  
  public getClient(): SupabaseClient {
    return getSupabaseClient();
  }
}
