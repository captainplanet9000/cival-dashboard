/**
 * Trading Agent Controller
 * 
 * Central orchestration component that ties together:
 * - Trading Engine
 * - Exchange Adapters
 * - Risk Management
 * - Position Tracking
 * - ElizaOS Integration
 * 
 * Serves as the main entry point for the Trading Farm autonomous agent system.
 */

import { TradingEngine, TradingEngineConfig, ExecutionMode } from './trading-engine';
import { RiskManager, RiskParameters } from './risk-manager';
import { PositionTracker } from './position-tracker';
import { LogManager } from './log-manager';
import { ElizaOSIntegration, TradingAgentConfig } from './elizaos-integration';
import { ExchangeAdapter } from '@/utils/exchanges/exchange-adapter';
import { BybitAdapter } from '@/utils/exchanges/bybit-adapter';
import { CoinbaseAdapter } from '@/utils/exchanges/coinbase-adapter';
import { HyperliquidAdapter } from '@/utils/exchanges/hyperliquid-adapter';
import { OrderRequest, Position, Balance } from '@/types/orders';
import { createServerClient } from '@/utils/supabase/server';
import { Database } from '@/types/database.types';
import { ServerVaultService } from '@/utils/server-vault';

export type AgentStatus = 'initializing' | 'ready' | 'running' | 'paused' | 'error' | 'shutdown';

export interface AgentControllerConfig {
  farmId: string;
  strategyId: string;
  agentId: string;
  exchangeId: string;
  exchangeType: 'bybit' | 'coinbase' | 'hyperliquid';
  userId: string;
  executionMode: ExecutionMode;
  useElizaOS: boolean;
  elizaConfig?: Partial<TradingAgentConfig>;
  riskParams: RiskParameters;
  allowedSymbols: string[];
  maxPositions: number;
  initialFunds?: number; // For paper trading
}

// ElizaOS client interface (mock for now, would be replaced with actual ElizaOS client)
interface ElizaOSClient {
  createAgent: (config: any) => Promise<any>;
  getAgent: (agentId: string) => Promise<any>;
  deleteAgent: (agentId: string) => Promise<boolean>;
  getAgents: () => Promise<any[]>;
}

export class TradingAgentController {
  private config: AgentControllerConfig;
  private tradingEngine: TradingEngine | null = null;
  private elizaIntegration: ElizaOSIntegration | null = null;
  private adapter: ExchangeAdapter | null = null;
  private status: AgentStatus = 'initializing';
  private logManager: LogManager;
  private supabase: ReturnType<typeof createServerClient>;
  
  constructor(config: AgentControllerConfig) {
    this.config = config;
    this.logManager = new LogManager(
      config.farmId, 
      config.strategyId, 
      config.agentId, 
      'agent-controller'
    );
    this.supabase = createServerClient();
  }
  
  /**
   * Initialize the agent controller
   */
  async initialize(): Promise<boolean> {
    try {
      this.logManager.info('Initializing trading agent controller', {
        farmId: this.config.farmId,
        strategyId: this.config.strategyId,
        executionMode: this.config.executionMode
      });
      
      // 1. Initialize the appropriate exchange adapter
      this.adapter = await this.initializeAdapter();
      
      if (!this.adapter) {
        throw new Error('Failed to initialize exchange adapter');
      }
      
      // 2. Initialize the trading engine
      const tradingEngineConfig: TradingEngineConfig = {
        farmId: this.config.farmId,
        strategyId: this.config.strategyId,
        agentId: this.config.agentId,
        exchangeId: this.config.exchangeId,
        executionMode: this.config.executionMode,
        riskParams: this.config.riskParams,
        allowedSymbols: this.config.allowedSymbols,
        maxPositions: this.config.maxPositions,
        initialFunds: this.config.initialFunds
      };
      
      this.tradingEngine = new TradingEngine(
        this.adapter,
        tradingEngineConfig,
        this.supabase
      );
      
      const engineInitialized = await this.tradingEngine.initialize();
      if (!engineInitialized) {
        throw new Error('Failed to initialize trading engine');
      }
      
      // 3. Initialize ElizaOS integration if enabled
      if (this.config.useElizaOS) {
        await this.initializeElizaOSIntegration();
      }
      
      this.status = 'ready';
      this.logManager.info('Trading agent controller initialized successfully');
      return true;
    } catch (error) {
      this.status = 'error';
      this.logManager.error('Failed to initialize trading agent controller', { error });
      return false;
    }
  }
  
  /**
   * Start the trading agent
   */
  async start(): Promise<boolean> {
    if (this.status !== 'ready' && this.status !== 'paused') {
      this.logManager.error(`Cannot start agent in ${this.status} state`);
      return false;
    }
    
    try {
      this.logManager.info('Starting trading agent');
      
      // If using ElizaOS, start the agent
      if (this.config.useElizaOS && this.elizaIntegration) {
        const elizaStarted = await this.elizaIntegration.start();
        if (!elizaStarted) {
          throw new Error('Failed to start ElizaOS agent');
        }
      }
      
      this.status = 'running';
      this.logManager.info('Trading agent started successfully');
      
      // Update agent status in database
      await this.updateAgentStatus('active');
      
      return true;
    } catch (error) {
      this.status = 'error';
      this.logManager.error('Failed to start trading agent', { error });
      return false;
    }
  }
  
  /**
   * Pause the trading agent
   */
  async pause(): Promise<boolean> {
    if (this.status !== 'running') {
      this.logManager.error(`Cannot pause agent in ${this.status} state`);
      return false;
    }
    
    try {
      this.logManager.info('Pausing trading agent');
      
      if (this.tradingEngine) {
        await this.tradingEngine.pause('User requested pause');
      }
      
      // If using ElizaOS, stop the agent
      if (this.config.useElizaOS && this.elizaIntegration) {
        await this.elizaIntegration.stop();
      }
      
      this.status = 'paused';
      this.logManager.info('Trading agent paused successfully');
      
      // Update agent status in database
      await this.updateAgentStatus('paused');
      
      return true;
    } catch (error) {
      this.logManager.error('Failed to pause trading agent', { error });
      return false;
    }
  }
  
  /**
   * Resume the trading agent
   */
  async resume(): Promise<boolean> {
    if (this.status !== 'paused') {
      this.logManager.error(`Cannot resume agent in ${this.status} state`);
      return false;
    }
    
    try {
      this.logManager.info('Resuming trading agent');
      
      if (this.tradingEngine) {
        await this.tradingEngine.resume();
      }
      
      // If using ElizaOS, start the agent
      if (this.config.useElizaOS && this.elizaIntegration) {
        await this.elizaIntegration.start();
      }
      
      this.status = 'running';
      this.logManager.info('Trading agent resumed successfully');
      
      // Update agent status in database
      await this.updateAgentStatus('active');
      
      return true;
    } catch (error) {
      this.logManager.error('Failed to resume trading agent', { error });
      return false;
    }
  }
  
  /**
   * Shutdown the trading agent
   */
  async shutdown(): Promise<boolean> {
    try {
      this.logManager.info('Shutting down trading agent');
      
      if (this.tradingEngine) {
        await this.tradingEngine.shutdown();
      }
      
      // If using ElizaOS, stop the agent
      if (this.config.useElizaOS && this.elizaIntegration) {
        await this.elizaIntegration.stop();
      }
      
      this.status = 'shutdown';
      this.logManager.info('Trading agent shut down successfully');
      
      // Update agent status in database
      await this.updateAgentStatus('inactive');
      
      return true;
    } catch (error) {
      this.logManager.error('Failed to shut down trading agent', { error });
      return false;
    }
  }
  
  /**
   * Execute a trade order
   */
  async executeOrder(orderRequest: OrderRequest): Promise<any> {
    if (this.status !== 'running') {
      throw new Error(`Cannot execute orders in ${this.status} state`);
    }
    
    if (!this.tradingEngine) {
      throw new Error('Trading engine not initialized');
    }
    
    try {
      // If using ElizaOS, let the agent evaluate the trade
      if (this.config.useElizaOS && this.elizaIntegration) {
        return await this.elizaIntegration.requestTrade(orderRequest);
      } else {
        // Otherwise, execute directly with the trading engine
        return await this.tradingEngine.executeOrder(orderRequest);
      }
    } catch (error) {
      this.logManager.error('Failed to execute order', { error, orderRequest });
      throw error;
    }
  }
  
  /**
   * Get agent status
   */
  getStatus(): AgentStatus {
    return this.status;
  }
  
  /**
   * Get detailed agent information
   */
  async getAgentInfo(): Promise<any> {
    try {
      // Get positions
      const positions = this.tradingEngine 
        ? await this.tradingEngine.getPositions() 
        : [];
      
      // Get agent status from ElizaOS if available
      let elizaStatus = null;
      if (this.config.useElizaOS && this.elizaIntegration) {
        elizaStatus = await this.elizaIntegration.getAgentStatus();
      }
      
      // Get recent trades from database
      const { data: recentTrades } = await this.supabase
        .from('orders')
        .select('*')
        .eq('farm_id', this.config.farmId)
        .eq('strategy_id', this.config.strategyId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      return {
        agentId: this.config.agentId,
        farmId: this.config.farmId,
        strategyId: this.config.strategyId,
        status: this.status,
        executionMode: this.config.executionMode,
        positions,
        positionCount: positions.length,
        elizaStatus,
        recentTrades,
        usingElizaOS: this.config.useElizaOS
      };
    } catch (error) {
      this.logManager.error('Failed to get agent info', { error });
      throw error;
    }
  }
  
  /**
   * Initialize the appropriate exchange adapter
   */
  private async initializeAdapter(): Promise<ExchangeAdapter> {
    try {
      // Retrieve exchange credentials from vault
      const vaultService = new ServerVaultService();
      const credentials = await vaultService.getApiCredentials(
        this.config.userId,
        this.config.exchangeId
      );
      
      let adapter: ExchangeAdapter;
      
      // Create the appropriate adapter based on exchange type
      switch (this.config.exchangeType) {
        case 'bybit':
          adapter = new BybitAdapter();
          break;
        case 'coinbase':
          adapter = new CoinbaseAdapter();
          break;
        case 'hyperliquid':
          adapter = new HyperliquidAdapter();
          break;
        default:
          throw new Error(`Unsupported exchange type: ${this.config.exchangeType}`);
      }
      
      // Connect to the exchange
      const connectionResult = await adapter.connect(credentials);
      
      if (!connectionResult.success) {
        throw new Error(`Failed to connect to exchange: ${connectionResult.message}`);
      }
      
      this.logManager.info('Successfully connected to exchange', {
        exchange: this.config.exchangeType,
        mode: this.config.executionMode
      });
      
      return adapter;
    } catch (error) {
      this.logManager.error('Failed to initialize exchange adapter', { error });
      throw error;
    }
  }
  
  /**
   * Initialize ElizaOS integration
   */
  private async initializeElizaOSIntegration(): Promise<void> {
    try {
      if (!this.tradingEngine) {
        throw new Error('Trading engine must be initialized before ElizaOS integration');
      }
      
      this.logManager.info('Initializing ElizaOS integration');
      
      // Create ElizaOS client (mock for now)
      const elizaClient: ElizaOSClient = {
        createAgent: async (config: any) => ({
          id: config.strategyId,
          name: config.name,
          description: config.description,
          capabilities: config.capabilities,
          modelProvider: config.modelProvider,
          modelName: config.modelName,
          memory: {
            addMemory: async (memory: any) => {},
            getMemories: async (filter?: any) => [],
            searchMemories: async (query: string) => []
          },
          executeAction: async (action: string, params: any) => {
            if (action === 'make_trading_decision') {
              return { trades: [] }; // No trades for now in the mock
            }
            return {};
          },
          ask: async (question: string, context?: any) => "I'm monitoring the markets and adjusting positions as needed.",
          observe: async (observation: any) => {}
        }),
        getAgent: async (agentId: string) => null,
        deleteAgent: async (agentId: string) => true,
        getAgents: async () => []
      };
      
      // Create ElizaOS trading agent config
      const defaultElizaConfig: TradingAgentConfig = {
        name: `Trading Agent for Strategy ${this.config.strategyId}`,
        description: `Trading agent for farm ${this.config.farmId}, strategy ${this.config.strategyId}`,
        capabilities: [
          'market_analysis',
          'order_execution',
          'position_management',
          'risk_assessment'
        ],
        modelProvider: 'openai',
        modelName: 'gpt-4-turbo',
        farmId: this.config.farmId,
        strategyId: this.config.strategyId,
        executionMode: this.config.executionMode,
        allowedSymbols: this.config.allowedSymbols,
        maxPositions: this.config.maxPositions,
        riskProfile: 'moderate',
        orderTypes: ['market', 'limit', 'stop'],
        goals: [
          'Maximize risk-adjusted returns',
          'Maintain appropriate position sizing',
          'React to changing market conditions',
          'Follow the trading strategy guidelines'
        ]
      };
      
      // Merge with user-provided config
      const elizaConfig = {
        ...defaultElizaConfig,
        ...this.config.elizaConfig
      };
      
      // Create ElizaOS integration
      this.elizaIntegration = new ElizaOSIntegration(
        this.tradingEngine,
        elizaClient,
        elizaConfig,
        this.supabase
      );
      
      // Initialize ElizaOS integration
      const elizaInitialized = await this.elizaIntegration.initialize();
      if (!elizaInitialized) {
        throw new Error('Failed to initialize ElizaOS integration');
      }
      
      this.logManager.info('ElizaOS integration initialized successfully');
    } catch (error) {
      this.logManager.error('Failed to initialize ElizaOS integration', { error });
      throw error;
    }
  }
  
  /**
   * Update agent status in database
   */
  private async updateAgentStatus(status: 'active' | 'paused' | 'inactive'): Promise<void> {
    try {
      await this.supabase
        .from('agents')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', this.config.agentId);
    } catch (error) {
      this.logManager.error('Failed to update agent status in database', { error });
    }
  }
}
