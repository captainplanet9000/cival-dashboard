/**
 * Exchange Service Factory
 * 
 * Creates and configures the appropriate exchange service based on the agent's configuration.
 * Handles switching between live trading and dry-run modes with safety mechanisms.
 */
import { 
  ExchangeService, 
  ExchangeType,
  BybitApiService,
  CoinbaseApiService,
  HyperliquidApiService,
  MockExchangeService,
  DryRunExchangeService,
  BaseExchangeService
} from './exchange-service';
import { SimulationService } from './simulation-service';
import { MonitoringService } from './monitoring-service';
import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';

export interface AgentConfig {
  id: string;
  userId: string;
  name: string;
  description?: string;
  exchangeType: ExchangeType;
  executionMode: 'live' | 'dry-run';
  liveModeConfirmed: boolean;
  // Add any other agent configuration fields here
}

export interface TradingCredentials {
  apiKey: string;
  apiSecret: string;
  [key: string]: any; // Additional exchange-specific credentials
}

/**
 * Create the appropriate exchange service based on agent configuration
 */
export async function createExchangeServiceForAgent(
  agentConfig: AgentConfig,
  isServerSide = false
): Promise<ExchangeService> {
  try {
    // Safety check: If executionMode is 'live' but liveModeConfirmed is false,
    // force dry-run mode for safety
    const actualMode = (agentConfig.executionMode === 'live' && agentConfig.liveModeConfirmed)
      ? 'live'
      : 'dry-run';
    
    // Always log mode switching/initialization for audit trail
    MonitoringService.logEvent({
      type: 'system.startup',
      severity: 'info',
      subject: 'Exchange Service Initialization',
      message: `Creating ${actualMode} exchange service for agent ${agentConfig.name} (${agentConfig.id})`,
      source: 'exchange-service-factory',
      details: {
        agentId: agentConfig.id,
        exchangeType: agentConfig.exchangeType,
        requestedMode: agentConfig.executionMode,
        actualMode
      },
      user_id: agentConfig.userId
    }, isServerSide);
    
    // Create the base exchange service
    const baseService = await createBaseExchangeService(agentConfig, isServerSide);
    
    // If dry-run mode is active, wrap the base service in DryRunExchangeService
    if (actualMode === 'dry-run') {
      // Load the agent's simulation configuration
      const simConfig = await SimulationService.getAgentSimulationConfig(agentConfig.id, isServerSide);
      
      // Create default balances if no configuration exists
      const initialBalances = simConfig?.initialBalances || {
        'USDT': 10000,
        'BTC': 0.5,
        'ETH': 5,
        'SOL': 100
      };
      
      // Create and return the dry-run service
      const dryRunService = new DryRunExchangeService(baseService, agentConfig.userId, initialBalances);
      
      // Start a new simulation run if one doesn't exist
      startSimulationRunIfNeeded(agentConfig, initialBalances, isServerSide);
      
      return dryRunService;
    }
    
    // For live mode, return the base service directly
    return baseService;
  } catch (error) {
    // Log the error
    MonitoringService.logEvent({
      type: 'system.error',
      severity: 'error',
      subject: 'Exchange Service Creation Failed',
      message: `Failed to create exchange service for agent ${agentConfig.name}: ${(error as Error).message}`,
      source: 'exchange-service-factory',
      details: {
        agentId: agentConfig.id,
        exchangeType: agentConfig.exchangeType,
        requestedMode: agentConfig.executionMode,
        error
      },
      user_id: agentConfig.userId
    }, isServerSide);
    
    // Fall back to mock service for safety
    console.error('Failed to create exchange service, falling back to mock:', error);
    return new MockExchangeService();
  }
}

/**
 * Create the base exchange service for the specified exchange type
 */
async function createBaseExchangeService(
  agentConfig: AgentConfig,
  isServerSide = false
): Promise<ExchangeService> {
  switch (agentConfig.exchangeType) {
    case 'bybit':
      const bybitCredentials = await getExchangeCredentials(agentConfig.userId, 'bybit', isServerSide);
      return new BybitApiService(bybitCredentials);
      
    case 'coinbase':
      const coinbaseCredentials = await getExchangeCredentials(agentConfig.userId, 'coinbase', isServerSide);
      return new CoinbaseApiService(coinbaseCredentials);
      
    case 'hyperliquid':
      const hyperCredentials = await getExchangeCredentials(agentConfig.userId, 'hyperliquid', isServerSide);
      return new HyperliquidApiService(hyperCredentials);
      
    case 'mock':
      return new MockExchangeService();
      
    default:
      // Default to mock for unknown exchange types
      console.warn(`Unknown exchange type: ${agentConfig.exchangeType}, using mock exchange`);
      return new MockExchangeService();
  }
}

/**
 * Get exchange credentials from the database
 */
async function getExchangeCredentials(
  userId: string,
  exchange: ExchangeType,
  isServerSide = false
): Promise<TradingCredentials | null> {
  try {
    const supabase = isServerSide
      ? await createServerClient()
      : createBrowserClient();
    
    const { data, error } = await supabase
      .from('exchange_credentials')
      .select('*')
      .eq('user_id', userId)
      .eq('exchange', exchange)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No credentials found
        console.error(`No credentials found for ${exchange}`);
        return null;
      }
      throw error;
    }
    
    return {
      apiKey: data.api_key,
      apiSecret: data.api_secret,
      ...data.additional_params
    };
  } catch (error) {
    console.error(`Error fetching ${exchange} credentials:`, error);
    return null;
  }
}

/**
 * Start a new simulation run if an active one doesn't exist for this agent
 */
async function startSimulationRunIfNeeded(
  agentConfig: AgentConfig,
  initialBalances: Record<string, number>,
  isServerSide = false
): Promise<void> {
  try {
    // Check if there's already an active simulation run for this agent
    const { runs } = await SimulationService.getSimulationRuns(
      { agentId: agentConfig.id, status: 'active', limit: 1 },
      isServerSide
    );
    
    // If an active run exists, don't create a new one
    if (runs.length > 0) {
      return;
    }
    
    // Start a new simulation run
    await SimulationService.startSimulationRun({
      agentId: agentConfig.id,
      name: `${agentConfig.name} - ${new Date().toLocaleString()}`,
      description: `Simulation run for ${agentConfig.name} on ${agentConfig.exchangeType}`,
      initialBalances,
      parameters: {
        exchange: agentConfig.exchangeType,
        startedBy: 'system',
        startTime: new Date().toISOString()
      }
    }, isServerSide);
  } catch (error) {
    console.error('Error starting simulation run:', error);
  }
}

/**
 * Update agent execution mode
 */
export async function updateAgentExecutionMode(
  agentId: string,
  mode: 'live' | 'dry-run',
  confirmLive = false,
  isServerSide = false
): Promise<boolean> {
  try {
    const supabase = isServerSide
      ? await createServerClient()
      : createBrowserClient();
    
    // Get current agent config first for logging
    const { data: currentAgent, error: getError } = await supabase
      .from('trading_agents')
      .select('execution_mode, live_mode_confirmed, name, user_id')
      .eq('id', agentId)
      .single();
    
    if (getError) {
      throw getError;
    }
    
    // If switching to live mode but not confirmed, force confirmation
    if (mode === 'live' && !confirmLive) {
      throw new Error('Live mode must be explicitly confirmed for safety');
    }
    
    // Update the agent's mode
    const { error: updateError } = await supabase
      .from('trading_agents')
      .update({
        execution_mode: mode,
        live_mode_confirmed: mode === 'live' ? confirmLive : false
      })
      .eq('id', agentId);
    
    if (updateError) {
      throw updateError;
    }
    
    // Log the mode change
    MonitoringService.logEvent({
      type: 'system.warning', // Using warning to ensure this is noticed
      severity: 'warning',
      subject: 'Agent Execution Mode Changed',
      message: `Agent ${currentAgent.name} execution mode changed from ${currentAgent.execution_mode} to ${mode}`,
      source: 'exchange-service-factory',
      details: {
        agentId,
        previousMode: currentAgent.execution_mode,
        newMode: mode,
        liveModeConfirmed: mode === 'live' ? confirmLive : false
      },
      user_id: currentAgent.user_id
    }, isServerSide);
    
    return true;
  } catch (error) {
    console.error('Error updating agent execution mode:', error);
    return false;
  }
}
