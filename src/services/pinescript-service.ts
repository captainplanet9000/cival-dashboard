import { createPineScriptParser, ParsedPineScript } from "../lib/pinescript-parser";
import { StrategyRepository } from "../repositories/strategy-repository";
import { Strategy } from "../models/strategy";
import { supabase } from "../integrations/supabase/client";

/**
 * Service for handling PineScript strategy import and execution
 */
export class PineScriptService {
  private strategyRepo: StrategyRepository;
  
  constructor() {
    this.strategyRepo = new StrategyRepository();
  }
  
  /**
   * Import a PineScript strategy into the trading farm
   * 
   * @param pineScriptCode The raw PineScript code
   * @param name Strategy name
   * @param description Strategy description
   * @param farmId Optional farm ID to associate with the strategy
   * @returns The ID of the created strategy
   */
  async importStrategy(
    pineScriptCode: string, 
    name: string, 
    description: string, 
    farmId?: string
  ): Promise<string> {
    // Parse PineScript to extract indicators and trading rules
    const parsedScript = createPineScriptParser().parse(pineScriptCode);
    
    // Create strategy record
    const strategy = await this.strategyRepo.create({
      name,
      description: description || parsedScript.metadata.description || '',
      strategy_type: 'pinescript',
      parameters: {
        indicators: parsedScript.indicators,
        entryRules: parsedScript.entryRules,
        exitRules: parsedScript.exitRules,
        variables: parsedScript.variables,
        metadata: parsedScript.metadata,
        rawScript: pineScriptCode
      },
      is_active: true,
      performance_metrics: {
        backtest_count: 0,
        avg_profit_loss: 0,
        win_rate: 0,
        sharpe_ratio: 0,
        last_updated: new Date().toISOString()
      }
    });
    
    // If farmId is provided, create a farm_strategy connection
    if (farmId && strategy.id) {
      await this.associateStrategyWithFarm(strategy.id, farmId);
    }
    
    return strategy.id;
  }
  
  /**
   * Associate a strategy with a farm
   */
  private async associateStrategyWithFarm(strategyId: string, farmId: string): Promise<void> {
    await supabase
      .from('farm_strategies')
      .insert({
        farm_id: farmId,
        strategy_id: strategyId,
        allocation: 0, // Default allocation is 0
        is_active: false, // Default to inactive
        config: {},
      });
  }
  
  /**
   * Run a backtest for a PineScript strategy
   * 
   * @param strategyId Strategy ID
   * @param timeframe Timeframe for the backtest (e.g., '1d', '4h')
   * @param startDate Start date for backtest
   * @param endDate End date for backtest
   * @param symbol Symbol to backtest on
   */
  async runBacktest(
    strategyId: string, 
    timeframe: string, 
    startDate: string, 
    endDate: string, 
    symbol: string
  ): Promise<any> {
    // Get the strategy
    const strategy = await this.strategyRepo.getById(strategyId);
    if (!strategy) {
      throw new Error('Strategy not found');
    }
    
    // Get the PineScript code
    const rawScript = strategy.parameters.rawScript;
    if (!rawScript) {
      throw new Error('No PineScript code found for this strategy');
    }
    
    // Implement backtest logic here
    // This would typically:
    // 1. Convert PineScript to a format our backtester can use
    // 2. Load historical data for the symbol and timeframe
    // 3. Execute the strategy against the data
    // 4. Collect and analyze results
    
    // Placeholder for backtest results
    const backtestResults = {
      strategy_id: strategyId,
      timeframe,
      symbol,
      start_date: startDate,
      end_date: endDate,
      total_trades: 0,
      winning_trades: 0,
      losing_trades: 0,
      profit_loss: 0,
      max_drawdown: 0,
      sharpe_ratio: 0,
      execution_time_ms: 0,
      trades: [],
      equity_curve: [],
      executed_at: new Date().toISOString()
    };
    
    // Update strategy with backtest results
    await this.strategyRepo.update(strategyId, {
      backtest_results: backtestResults,
      performance_metrics: {
        backtest_count: (strategy.performance_metrics?.backtest_count || 0) + 1,
        last_backtest_date: new Date().toISOString(),
        avg_profit_loss: backtestResults.profit_loss,
        win_rate: backtestResults.winning_trades / 
          (backtestResults.winning_trades + backtestResults.losing_trades) * 100 || 0,
        sharpe_ratio: backtestResults.sharpe_ratio,
        last_updated: new Date().toISOString()
      }
    });
    
    return backtestResults;
  }
  
  /**
   * Extract indicators from a PineScript strategy
   * 
   * @param strategyId Strategy ID
   * @returns List of indicators
   */
  async extractIndicators(strategyId: string): Promise<any[]> {
    const strategy = await this.strategyRepo.getById(strategyId);
    if (!strategy || !strategy.parameters) {
      throw new Error('Strategy not found or invalid');
    }
    
    return strategy.parameters.indicators || [];
  }
  
  /**
   * Generate TradingView alerts from a PineScript strategy
   * 
   * @param strategyId Strategy ID
   * @returns Alert configurations
   */
  async generateTradingViewAlerts(strategyId: string): Promise<any[]> {
    const strategy = await this.strategyRepo.getById(strategyId);
    if (!strategy || !strategy.parameters) {
      throw new Error('Strategy not found or invalid');
    }
    
    const entryRules = strategy.parameters.entryRules || [];
    const exitRules = strategy.parameters.exitRules || [];
    
    const alerts = [
      // Generate entry alerts
      ...entryRules.map(rule => ({
        name: `${strategy.name} - ${rule.description}`,
        condition: rule.condition,
        message: `{{strategy.order.action}} {{ticker}} at {{close}}`,
        type: 'entry'
      })),
      
      // Generate exit alerts
      ...exitRules.map(rule => ({
        name: `${strategy.name} - ${rule.description}`,
        condition: rule.condition,
        message: `EXIT {{ticker}} at {{close}}`,
        type: 'exit'
      }))
    ];
    
    return alerts;
  }
  
  /**
   * Update a PineScript strategy
   * 
   * @param strategyId Strategy ID
   * @param pineScriptCode New PineScript code
   * @param name New name (optional)
   * @param description New description (optional)
   */
  async updateStrategy(
    strategyId: string, 
    pineScriptCode: string, 
    name?: string, 
    description?: string
  ): Promise<void> {
    // Get the existing strategy
    const existingStrategy = await this.strategyRepo.getById(strategyId);
    if (!existingStrategy) {
      throw new Error('Strategy not found');
    }
    
    // Parse the updated PineScript
    const parsedScript = createPineScriptParser().parse(pineScriptCode);
    
    // Prepare updates
    const updates: Partial<Strategy> = {
      parameters: {
        indicators: parsedScript.indicators,
        entryRules: parsedScript.entryRules,
        exitRules: parsedScript.exitRules,
        variables: parsedScript.variables,
        metadata: parsedScript.metadata,
        rawScript: pineScriptCode
      }
    };
    
    // Update name and description if provided
    if (name) {
      updates.name = name;
    }
    
    if (description) {
      updates.description = description;
    }
    
    // Update the strategy
    await this.strategyRepo.update(strategyId, updates);
  }
} 