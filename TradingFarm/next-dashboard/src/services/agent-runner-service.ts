/**
 * AgentRunner Service
 * 
 * Responsible for orchestrating the autonomous execution of trading agents:
 * - Fetches market data
 * - Evaluates trading strategies
 * - Applies risk management rules
 * - Executes trades
 * - Tracks positions
 * - Handles errors with proper isolation
 * 
 * Designed for reliability, state consistency, and proper error handling
 */

import { createServerClient } from '@/utils/supabase/server';
import { MonitoringService } from './monitoring-service';
import { MarketDataService } from './market-data-service';
import { ExchangeService } from './exchange-service';
import { ApiKeyVaultService } from './api-key-vault-service';
import { RiskManagementService } from './risk-management-service';
import { PositionService } from './position-service';

interface AgentRunnerOptions {
  runAllAgents?: boolean;
  agentId?: string;
  farmId?: string;
  dryRun?: boolean;
}

export class AgentRunnerService {
  private marketDataService: MarketDataService;
  private exchangeService: ExchangeService;
  private apiKeyVaultService: ApiKeyVaultService;
  private riskManagementService: RiskManagementService;
  private positionService: PositionService;
  
  constructor() {
    this.marketDataService = new MarketDataService();
    this.exchangeService = new ExchangeService();
    this.apiKeyVaultService = new ApiKeyVaultService();
    this.riskManagementService = new RiskManagementService();
    this.positionService = new PositionService();
  }
  
  /**
   * Main entry point to run agents
   */
  async runAgents(options: AgentRunnerOptions = { runAllAgents: true, dryRun: false }) {
    try {
      // Log the start of the agent runner
      await MonitoringService.logSystemEvent(
        'system.startup',
        `Agent runner started with options: ${JSON.stringify(options)}`,
        options,
        'info'
      );
      
      // Fetch agents to run based on options
      const agents = await this.fetchAgentsToRun(options);
      
      if (agents.length === 0) {
        await MonitoringService.logSystemEvent(
          'system.warning',
          'No agents found to run',
          options,
          'warning'
        );
        return { total: 0, succeeded: 0, failed: 0, skipped: 0 };
      }
      
      // Process each agent independently with error isolation
      const results = await Promise.allSettled(agents.map(agent => 
        this.runSingleAgent(agent, options.dryRun || false)
      ));
      
      // Analyze results
      const summary = {
        total: results.length,
        succeeded: results.filter(r => r.status === 'fulfilled' && r.value.success).length,
        failed: results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length,
        skipped: results.filter(r => r.status === 'fulfilled' && r.value.skipped).length
      };
      
      // Log summary
      await MonitoringService.logSystemEvent(
        'system.info',
        `Agent runner completed. Summary: ${JSON.stringify(summary)}`,
        { summary, agents: agents.map(a => a.id) },
        'info'
      );
      
      return summary;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await MonitoringService.logSystemEvent(
        'system.error',
        `Agent runner failed: ${errorMessage}`,
        { error: errorMessage, stack: error instanceof Error ? error.stack : undefined },
        'error'
      );
      throw error;
    }
  }
  
  /**
   * Fetch agents that need to be run based on options
   */
  private async fetchAgentsToRun(options: AgentRunnerOptions): Promise<any[]> {
    const supabase = await createServerClient();
    
    let query = supabase
      .from('elizaos_agents')
      .select('id, name, farm_id, status, active, config, current_position_id')
      .eq('active', true);
      
    if (options.agentId) {
      query = query.eq('id', options.agentId);
    } else if (options.farmId) {
      query = query.eq('farm_id', options.farmId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Failed to fetch agents: ${error.message}`);
    }
    
    return data || [];
  }
  
  /**
   * Run a single agent with error handling and isolation
   */
  private async runSingleAgent(agent: any, dryRun: boolean) {
    try {
      const startTime = Date.now();
      
      // Set agent to running state
      await this.updateAgentStatus(agent.id, 'running');
      
      // Log agent run start
      await MonitoringService.logAgentEvent(
        agent,
        'agent.started',
        `Agent ${agent.name} (${agent.id}) run started`,
        { farm_id: agent.farm_id, dry_run: dryRun },
        'info'
      );
      
      // Load the latest configuration
      const config = await this.loadAgentConfig(agent);
      
      // Verify agent is still active and not paused
      if (!config.active || agent.status === 'paused') {
        await this.updateAgentStatus(agent.id, 'paused');
        return { agentId: agent.id, success: true, skipped: true, reason: 'Agent inactive or paused' };
      }
      
      // Get API keys for the exchange
      const exchangeApiKeys = await this.apiKeyVaultService.getExchangeApiKeys(
        agent.farm_id, 
        config.exchange
      );
      
      if (!exchangeApiKeys) {
        throw new AgentRunnerError(
          `API keys not found for exchange ${config.exchange}`,
          'api_keys_missing',
          'configuration'
        );
      }
      
      // Fetch market data for all trading pairs with timestamp verification
      const marketDataResults = await Promise.all(
        config.trading_pairs.map(async (pair: string) => {
          const marketData = await this.marketDataService.fetchCandles(
            pair,
            config.exchange,
            config.timeframe,
            config.lookback_periods || 100
          );
          
          if (!this.isDataFreshEnough(marketData, config.timeframe)) {
            throw new AgentRunnerError(
              `Market data for ${pair} is stale`,
              'stale_market_data',
              'market_data'
            );
          }
          
          return { pair, data: marketData };
        })
      );
      
      // Get current positions
      const currentPosition = agent.current_position_id 
        ? await this.positionService.getPosition(agent.current_position_id)
        : null;
      
      // Load strategy module
      const strategy = await this.loadStrategy(config.strategy.type);
      
      // Process each trading pair according to strategy
      const signals = await Promise.all(
        marketDataResults.map(async ({ pair, data }) => {
          // Evaluate strategy
          const signal = await strategy.evaluate(data, config.strategy.parameters);
          
          // If we have a signal, apply risk management
          if (signal.action !== 'hold') {
            // Apply risk management rules
            const orderParams = await this.riskManagementService.applyRiskRules({
              agent,
              signal,
              marketData: data,
              position: currentPosition,
              config
            });
            
            return {
              pair,
              signal,
              orderParams,
              marketData: data
            };
          }
          
          return { pair, signal, orderParams: null, marketData: data };
        })
      );
      
      // Execute trades or log intents in dry run
      const executionResults = await Promise.all(
        signals
          .filter(s => s.orderParams !== null)
          .map(async (signalData) => {
            if (dryRun) {
              // Log trade intent in dry run mode
              await MonitoringService.logTradeEvent(
                'trade.executed',
                signalData.pair,
                {
                  price: signalData.marketData.close[signalData.marketData.close.length - 1],
                  size: signalData.orderParams?.size,
                  side: signalData.signal.action,
                  dry_run: true
                },
                agent.id,
                undefined,
                agent.farm_id
              );
              
              return {
                pair: signalData.pair,
                success: true,
                dry_run: true,
                order: signalData.orderParams
              };
            } else {
              // Execute actual trade
              return this.executeTradeWithConsistency(
                agent,
                signalData.pair,
                signalData.orderParams,
                exchangeApiKeys
              );
            }
          })
      );
      
      // Update agent metrics
      await this.updateAgentMetrics(agent.id, {
        last_run: new Date().toISOString(),
        signals_generated: signals.filter(s => s.signal.action !== 'hold').length,
        orders_placed: executionResults.length,
        orders_succeeded: executionResults.filter(r => r.success).length,
        run_duration_ms: Date.now() - startTime
      });
      
      // Set agent back to active state
      await this.updateAgentStatus(agent.id, 'active');
      
      // Log agent run completion
      await MonitoringService.logAgentEvent(
        agent,
        'agent.success',
        `Agent ${agent.name} (${agent.id}) run completed successfully`,
        {
          farm_id: agent.farm_id,
          dry_run: dryRun,
          signals: signals.length,
          orders: executionResults.length
        },
        'info'
      );
      
      return { 
        agentId: agent.id, 
        success: true, 
        skipped: false,
        signals: signals.length,
        orders: executionResults.length
      };
    } catch (error) {
      // Handle error appropriately based on type
      const agentError = error instanceof AgentRunnerError
        ? error
        : new AgentRunnerError(
            error instanceof Error ? error.message : 'Unknown error',
            'unknown_error',
            'execution'
          );
      
      // Log detailed error
      await MonitoringService.logAgentEvent(
        agent,
        'agent.error',
        `Agent ${agent.name} (${agent.id}) run failed: ${agentError.message}`,
        {
          error_type: agentError.errorType,
          error_category: agentError.category,
          stack: agentError.stack,
          farm_id: agent.farm_id,
          dry_run: dryRun
        },
        'error'
      );
      
      // Update agent status to error
      await this.updateAgentStatus(agent.id, 'error', agentError.message);
      
      // For specific error types, set appropriate recovery actions
      if (agentError.errorType === 'insufficient_funds' || 
          agentError.errorType === 'invalid_api_keys') {
        // These need manual intervention
        await this.setAgentNeedsAttention(agent.id, agentError.message);
      } else if (agentError.errorType === 'rate_limit' || 
                agentError.errorType === 'temporary_exchange_error') {
        // These can be retried automatically after a delay
        await this.scheduleAgentRetry(agent.id, 15); // retry after 15 minutes
      }
      
      return { 
        agentId: agent.id, 
        success: false, 
        error: {
          message: agentError.message,
          type: agentError.errorType,
          category: agentError.category
        }
      };
    }
  }
  
  /**
   * Update agent status in the database
   */
  private async updateAgentStatus(agentId: string, status: string, errorMessage?: string) {
    const supabase = await createServerClient();
    
    const { error } = await supabase
      .from('elizaos_agents')
      .update({ 
        status,
        last_error: errorMessage,
        updated_at: new Date().toISOString()
      })
      .eq('id', agentId);
    
    if (error) {
      console.error(`Failed to update agent status: ${error.message}`);
    }
  }
  
  /**
   * Load agent configuration
   */
  private async loadAgentConfig(agent: any) {
    // For now, use the config directly from the agent record
    // In a more advanced implementation, you might want to fetch this separately
    return agent.config || {};
  }
  
  /**
   * Check if market data is fresh enough for the given timeframe
   */
  private isDataFreshEnough(marketData: any, timeframe: string): boolean {
    if (!marketData || !marketData.time || marketData.time.length === 0) {
      return false;
    }
    
    const lastTimestamp = marketData.time[marketData.time.length - 1];
    const now = Date.now();
    
    // Define maximum allowable age for data based on timeframe
    const maxAgeMap: { [key: string]: number } = {
      '1m': 2 * 60 * 1000, // 2 minutes
      '5m': 10 * 60 * 1000, // 10 minutes
      '15m': 30 * 60 * 1000, // 30 minutes
      '1h': 2 * 60 * 60 * 1000, // 2 hours
      '4h': 8 * 60 * 60 * 1000, // 8 hours
      '1d': 48 * 60 * 60 * 1000, // 48 hours
    };
    
    const maxAge = maxAgeMap[timeframe] || 15 * 60 * 1000; // default to 15 minutes
    
    return (now - lastTimestamp) <= maxAge;
  }
  
  /**
   * Load a strategy module by type
   */
  private async loadStrategy(strategyType: string) {
    try {
      // In a real implementation, this would dynamically import the strategy module
      // For now, we'll use a simple mapping
      const strategies: { [key: string]: any } = {
        'macd': await import('@/strategies/macd').then(m => m.default),
        'bollinger_bands': await import('@/strategies/bollinger-bands').then(m => m.default),
        'rsi': await import('@/strategies/rsi').then(m => m.default),
        // Add more strategies as needed
      };
      
      if (!strategies[strategyType]) {
        throw new AgentRunnerError(
          `Strategy type '${strategyType}' not found`,
          'invalid_strategy',
          'configuration'
        );
      }
      
      return strategies[strategyType];
    } catch (error) {
      throw new AgentRunnerError(
        `Failed to load strategy '${strategyType}': ${error instanceof Error ? error.message : 'Unknown error'}`,
        'strategy_load_failed',
        'configuration'
      );
    }
  }
  
  /**
   * Execute a trade with proper error handling and state consistency
   */
  private async executeTradeWithConsistency(agent: any, symbol: string, orderParams: any, apiKeys: any) {
    const supabase = await createServerClient();
    
    try {
      // Start a transaction to ensure state consistency
      const { data, error } = await supabase.rpc('execute_trade_transaction', {
        p_agent_id: agent.id,
        p_farm_id: agent.farm_id,
        p_symbol: symbol,
        p_order_type: orderParams.type,
        p_side: orderParams.side,
        p_quantity: orderParams.size,
        p_price: orderParams.price,
        p_exchange: orderParams.exchange
      });
      
      if (error) {
        throw new AgentRunnerError(
          `Database transaction failed: ${error.message}`,
          'transaction_failed',
          'database'
        );
      }
      
      const { position_id, order_id } = data;
      
      // Now actually submit the order to the exchange
      const orderResult = await this.exchangeService.placeOrder({
        symbol,
        type: orderParams.type,
        side: orderParams.side,
        amount: orderParams.size,
        price: orderParams.price,
        exchange: orderParams.exchange,
        apiKeys
      });
      
      // Update the order with the exchange order ID
      await supabase
        .from('orders')
        .update({
          exchange_order_id: orderResult.id,
          status: orderResult.status,
          filled_amount: orderResult.filled,
          average_price: orderResult.average,
          last_update: new Date().toISOString()
        })
        .eq('id', order_id);
      
      // Start order confirmation process asynchronously
      this.confirmOrderFill(order_id, position_id, orderResult.id, orderParams.exchange, apiKeys)
        .catch(error => {
          console.error(`Order confirmation process failed: ${error.message}`);
          // Log this but don't throw as this is an async process
          MonitoringService.logSystemEvent(
            'system.error',
            `Order confirmation process failed for order ${order_id}`,
            { error: error.message, order_id, position_id },
            'error'
          );
        });
      
      // Log the trade
      await MonitoringService.logTradeEvent(
        'trade.executed',
        symbol,
        {
          price: orderParams.price,
          size: orderParams.size,
          side: orderParams.side,
          order_id,
          position_id,
          exchange_order_id: orderResult.id
        },
        agent.id,
        undefined,
        agent.farm_id
      );
      
      return {
        pair: symbol,
        success: true,
        order_id,
        position_id,
        exchange_order_id: orderResult.id
      };
    } catch (error) {
      // Classify exchange errors appropriately
      if (error instanceof Error) {
        if (error.message.includes('insufficient balance') || 
            error.message.includes('insufficient funds')) {
          throw new AgentRunnerError(
            `Insufficient funds for trade on ${symbol}`,
            'insufficient_funds',
            'exchange'
          );
        } else if (error.message.includes('Invalid API key') || 
                  error.message.includes('authentication failed')) {
          throw new AgentRunnerError(
            `Invalid API keys for exchange`,
            'invalid_api_keys',
            'configuration'
          );
        } else if (error.message.includes('Rate limit exceeded')) {
          throw new AgentRunnerError(
            `Exchange rate limit exceeded`,
            'rate_limit',
            'exchange'
          );
        }
      }
      
      // For other errors
      throw new AgentRunnerError(
        `Failed to execute trade: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'trade_execution_failed',
        'exchange'
      );
    }
  }
  
  /**
   * Confirm an order fill asynchronously
   */
  private async confirmOrderFill(
    orderId: string, 
    positionId: string,
    exchangeOrderId: string,
    exchange: string,
    apiKeys: any
  ): Promise<void> {
    const supabase = await createServerClient();
    const maxAttempts = 10;
    const initialDelay = 2000; // 2 seconds
    
    let attempts = 0;
    let orderFilled = false;
    
    while (attempts < maxAttempts && !orderFilled) {
      try {
        // Exponential backoff
        const delay = initialDelay * Math.pow(1.5, attempts);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Check order status
        const orderStatus = await this.exchangeService.checkOrderStatus(
          exchangeOrderId, 
          exchange, 
          apiKeys
        );
        
        // Update order record
        await supabase
          .from('orders')
          .update({
            status: orderStatus.status,
            filled_amount: orderStatus.filled,
            average_price: orderStatus.average,
            last_update: new Date().toISOString()
          })
          .eq('id', orderId);
        
        // If order is filled or cancelled, update position
        if (orderStatus.status === 'filled' || orderStatus.status === 'canceled') {
          // Update position with fill information
          await supabase
            .from('positions')
            .update({
              status: orderStatus.status === 'filled' ? 'open' : 'cancelled',
              filled_amount: orderStatus.filled,
              entry_price: orderStatus.average,
              last_update: new Date().toISOString()
            })
            .eq('id', positionId);
          
          orderFilled = true;
          
          // Log fill confirmation
          await MonitoringService.logSystemEvent(
            'system.info',
            `Order ${orderId} confirmed as ${orderStatus.status}`,
            {
              order_id: orderId,
              position_id: positionId,
              status: orderStatus.status,
              filled: orderStatus.filled,
              average_price: orderStatus.average
            },
            'info'
          );
        }
        
        attempts++;
      } catch (error) {
        attempts++;
        
        // Log the error but continue trying
        console.error(`Attempt ${attempts} to confirm order failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        if (attempts >= maxAttempts) {
          // Max attempts reached, log critical error
          await MonitoringService.logSystemEvent(
            'system.error',
            `Failed to confirm order ${orderId} after ${maxAttempts} attempts`,
            {
              order_id: orderId,
              position_id: positionId,
              exchange_order_id: exchangeOrderId,
              error: error instanceof Error ? error.message : 'Unknown error'
            },
            'error'
          );
          
          // Mark order status as 'unknown' to flag for manual review
          await supabase
            .from('orders')
            .update({
              status: 'unknown',
              last_update: new Date().toISOString()
            })
            .eq('id', orderId);
            
          // This will be caught by the catch block in the calling function
          throw new Error(`Order confirmation failed after ${maxAttempts} attempts`);
        }
      }
    }
  }
  
  /**
   * Update agent metrics in the database
   */
  private async updateAgentMetrics(agentId: string, metrics: any) {
    try {
      const supabase = await createServerClient();
      
      // First check if a metrics record exists
      const { data, error: fetchError } = await supabase
        .from('agent_metrics')
        .select('*')
        .eq('agent_id', agentId)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        // Error other than "not found"
        throw new Error(`Failed to check agent metrics: ${fetchError.message}`);
      }
      
      if (data) {
        // Update existing metrics record
        const { error } = await supabase
          .from('agent_metrics')
          .update({
            ...metrics,
            updated_at: new Date().toISOString()
          })
          .eq('agent_id', agentId);
        
        if (error) {
          throw new Error(`Failed to update agent metrics: ${error.message}`);
        }
      } else {
        // Insert new metrics record
        const { error } = await supabase
          .from('agent_metrics')
          .insert({
            agent_id: agentId,
            ...metrics,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (error) {
          throw new Error(`Failed to insert agent metrics: ${error.message}`);
        }
      }
      
      // Also insert into history table
      await supabase
        .from('agent_metrics_history')
        .insert({
          agent_id: agentId,
          ...metrics,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      console.error(`Failed to update agent metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Don't throw here to avoid failing the entire agent run
    }
  }
  
  /**
   * Mark an agent as needing attention
   */
  private async setAgentNeedsAttention(agentId: string, reason: string) {
    const supabase = await createServerClient();
    
    await supabase
      .from('elizaos_agents')
      .update({
        needs_attention: true,
        attention_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', agentId);
  }
  
  /**
   * Schedule an agent for retry
   */
  private async scheduleAgentRetry(agentId: string, minutesDelay: number) {
    const supabase = await createServerClient();
    
    const retryTime = new Date();
    retryTime.setMinutes(retryTime.getMinutes() + minutesDelay);
    
    await supabase
      .from('elizaos_agents')
      .update({
        next_run_at: retryTime.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', agentId);
  }
}

/**
 * Custom error class for agent runner errors
 */
class AgentRunnerError extends Error {
  errorType: string;
  category: string;
  
  constructor(message: string, errorType: string, category: string) {
    super(message);
    this.name = 'AgentRunnerError';
    this.errorType = errorType;
    this.category = category;
  }
}

// Export singleton instance
export const agentRunnerService = new AgentRunnerService();
