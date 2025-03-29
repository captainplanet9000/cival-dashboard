import { TradingFarmDataService } from './index';
import { RealtimeChannel, SupabaseClient, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { Farm, Agent, MarketData, Order, Trade, Wallet } from './index';
import { getSupabaseClient } from './lib/supabase-client';

/**
 * Dashboard Integration class to manage real-time updates and visualization
 * of Trading Farm data including memory systems
 */
export class TradingFarmDashboardIntegration {
  private static instance: TradingFarmDashboardIntegration;
  private dataService: TradingFarmDataService;
  private activeSubscriptions: Map<string, RealtimeChannel>;
  private isInitialized: boolean = false;
  private supabase: SupabaseClient;
  
  constructor() {
    this.dataService = TradingFarmDataService.getInstance();
    this.activeSubscriptions = new Map();
    this.supabase = getSupabaseClient();
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): TradingFarmDashboardIntegration {
    if (!TradingFarmDashboardIntegration.instance) {
      TradingFarmDashboardIntegration.instance = new TradingFarmDashboardIntegration();
    }
    return TradingFarmDashboardIntegration.instance;
  }
  
  /**
   * Initialize the dashboard integration with API keys
   */
  public initialize(apiKey: string, cogneeApiKey?: string, graphitiApiKey?: string): void {
    if (this.isInitialized) {
      console.warn('Trading Farm Dashboard Integration is already initialized');
      return;
    }
    
    TradingFarmDataService.initialize(apiKey);
    this.isInitialized = true;
    
    // Initialize memory systems if keys are provided
    if (cogneeApiKey && graphitiApiKey) {
      this.dataService.initializeMemorySystems(cogneeApiKey, graphitiApiKey);
    }
    
    console.log('Trading Farm Dashboard Integration initialized successfully');
  }
  
  /**
   * Subscribe to real-time updates for farms
   */
  public subscribeFarmUpdates(callback: (payload: RealtimePostgresChangesPayload<Farm>) => void): void {
    const channel = this.supabase
      .channel('farm-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'farms' }, 
        (payload) => callback(payload as RealtimePostgresChangesPayload<Farm>)
      )
      .subscribe();
    
    this.activeSubscriptions.set('farms', channel);
  }
  
  /**
   * Subscribe to real-time updates for agents
   */
  public subscribeAgentUpdates(callback: (payload: RealtimePostgresChangesPayload<Agent>) => void): void {
    const channel = this.supabase
      .channel('agent-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'agents' }, 
        (payload) => callback(payload as RealtimePostgresChangesPayload<Agent>)
      )
      .subscribe();
    
    this.activeSubscriptions.set('agents', channel);
  }
  
  /**
   * Subscribe to real-time updates for market data
   */
  public subscribeMarketDataUpdates(callback: (payload: RealtimePostgresChangesPayload<MarketData>) => void): void {
    const channel = this.supabase
      .channel('market-data-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'market_data' }, 
        (payload) => callback(payload as RealtimePostgresChangesPayload<MarketData>)
      )
      .subscribe();
    
    this.activeSubscriptions.set('market_data', channel);
  }
  
  /**
   * Get memory insights for an agent
   */
  public async getAgentMemoryInsights(agentId: number): Promise<any> {
    return this.dataService.tradingFarmMemory.analyzeAgentMemory(agentId);
  }
  
  /**
   * Get market relationship insights from the knowledge graph
   */
  public async getMarketRelationships(symbol: string): Promise<any> {
    return this.dataService.tradingFarmMemory.getMarketCorrelations(symbol);
  }
  
  /**
   * Cleanup subscriptions and resources
   */
  public cleanup(): void {
    this.activeSubscriptions.forEach((channel) => {
      channel.unsubscribe();
    });
    
    this.activeSubscriptions.clear();
  }
}

// Export a singleton instance
export const tradingFarmDashboard = TradingFarmDashboardIntegration.getInstance();
