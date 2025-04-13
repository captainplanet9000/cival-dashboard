/**
 * Enhanced ElizaOS Agent Skills for Trading
 * 
 * This module defines specialized trading skills that can be assigned to ElizaOS agents
 * for autonomous and semi-autonomous trading operations.
 */

import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';
import { sendElizaCommand, ElizaResponse, AgentContext } from '../eliza-connector';
import { ModelService } from '../ml/model-service';

// Skill definition interfaces
export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  category: 'analysis' | 'execution' | 'monitoring' | 'research' | 'communication';
  permissions: SkillPermission[];
  requires?: string[];
  parameters?: SkillParameter[];
  version: string;
  enabled: boolean;
}

export interface SkillPermission {
  resource: 'exchange' | 'market_data' | 'strategy' | 'knowledge_base' | 'ml_models' | 'user_data' | 'notifications';
  action: 'read' | 'write' | 'execute';
}

export interface SkillParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  default?: any;
  description: string;
}

export interface AgentSkillAssignment {
  id: number;
  agent_id: number;
  skill_id: string;
  parameters: Record<string, any>;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

// Agent skills service
export class AgentSkillsService {
  /**
   * Get all available agent skills
   */
  static async getAllSkills(): Promise<AgentSkill[]> {
    const supabase = createBrowserClient();
    
    try {
      const { data, error } = await supabase
        .from('agent_skills')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      return data as AgentSkill[];
    } catch (error) {
      console.error('Error fetching agent skills:', error);
      return [];
    }
  }
  
  /**
   * Get skills assigned to a specific agent
   */
  static async getAgentSkills(agentId: number): Promise<AgentSkillAssignment[]> {
    const supabase = createBrowserClient();
    
    try {
      const { data, error } = await supabase
        .from('agent_skill_assignments')
        .select(`
          *,
          skill:skill_id (*)
        `)
        .eq('agent_id', agentId);
      
      if (error) throw error;
      
      return data as AgentSkillAssignment[];
    } catch (error) {
      console.error('Error fetching agent skill assignments:', error);
      return [];
    }
  }
  
  /**
   * Assign a skill to an agent
   */
  static async assignSkillToAgent(
    agentId: number,
    skillId: string,
    parameters: Record<string, any> = {}
  ): Promise<AgentSkillAssignment | null> {
    const supabase = createBrowserClient();
    
    try {
      // Check if skill is already assigned
      const { data: existing, error: checkError } = await supabase
        .from('agent_skill_assignments')
        .select('*')
        .eq('agent_id', agentId)
        .eq('skill_id', skillId)
        .maybeSingle();
      
      if (checkError) throw checkError;
      
      if (existing) {
        // Update existing assignment
        const { data, error } = await supabase
          .from('agent_skill_assignments')
          .update({
            parameters,
            enabled: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) throw error;
        
        return data as AgentSkillAssignment;
      } else {
        // Create new assignment
        const { data, error } = await supabase
          .from('agent_skill_assignments')
          .insert({
            agent_id: agentId,
            skill_id: skillId,
            parameters,
            enabled: true
          })
          .select()
          .single();
        
        if (error) throw error;
        
        return data as AgentSkillAssignment;
      }
    } catch (error) {
      console.error('Error assigning skill to agent:', error);
      return null;
    }
  }
  
  /**
   * Remove a skill assignment from an agent
   */
  static async removeSkillFromAgent(assignmentId: number): Promise<boolean> {
    const supabase = createBrowserClient();
    
    try {
      const { error } = await supabase
        .from('agent_skill_assignments')
        .delete()
        .eq('id', assignmentId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error removing skill from agent:', error);
      return false;
    }
  }
  
  /**
   * Enable or disable a skill assignment
   */
  static async setSkillEnabled(assignmentId: number, enabled: boolean): Promise<boolean> {
    const supabase = createBrowserClient();
    
    try {
      const { error } = await supabase
        .from('agent_skill_assignments')
        .update({ enabled })
        .eq('id', assignmentId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error updating skill enabled status:', error);
      return false;
    }
  }
  
  /**
   * Update skill assignment parameters
   */
  static async updateSkillParameters(
    assignmentId: number,
    parameters: Record<string, any>
  ): Promise<boolean> {
    const supabase = createBrowserClient();
    
    try {
      const { error } = await supabase
        .from('agent_skill_assignments')
        .update({ parameters })
        .eq('id', assignmentId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error updating skill parameters:', error);
      return false;
    }
  }
}

// Specialized trading skill implementations
export class TradingSkills {
  /**
   * Market Analysis Skill
   * Performs technical analysis on market data
   */
  static async performMarketAnalysis(
    context: AgentContext,
    symbol: string,
    timeframe: string,
    indicators: string[] = ['rsi', 'macd', 'bollinger_bands']
  ): Promise<ElizaResponse> {
    try {
      const command = {
        command: `Analyze ${symbol} ${timeframe} with indicators: ${indicators.join(', ')}`,
        type: 'analysis',
        params: {
          symbol,
          timeframe,
          indicators
        }
      };
      
      return await sendElizaCommand(command, context);
    } catch (error) {
      console.error('Error performing market analysis:', error);
      return {
        message: `Error performing market analysis: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      };
    }
  }
  
  /**
   * Risk Assessment Skill
   * Evaluates risk for a potential trade
   */
  static async assessTradeRisk(
    context: AgentContext,
    symbol: string,
    direction: 'long' | 'short',
    entryPrice: number,
    stopLoss: number,
    positionSize: number
  ): Promise<ElizaResponse> {
    try {
      const command = {
        command: `Assess risk for ${direction} ${symbol} trade at ${entryPrice}`,
        type: 'analysis',
        params: {
          symbol,
          direction,
          entryPrice,
          stopLoss,
          positionSize
        }
      };
      
      return await sendElizaCommand(command, context);
    } catch (error) {
      console.error('Error assessing trade risk:', error);
      return {
        message: `Error assessing trade risk: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      };
    }
  }
  
  /**
   * Portfolio Analysis Skill
   * Analyzes overall portfolio performance and allocation
   */
  static async analyzePortfolio(
    context: AgentContext,
    timeRange: 'day' | 'week' | 'month' | 'year' = 'week'
  ): Promise<ElizaResponse> {
    try {
      const command = {
        command: `Analyze portfolio performance over the last ${timeRange}`,
        type: 'analysis',
        params: {
          timeRange
        }
      };
      
      return await sendElizaCommand(command, context);
    } catch (error) {
      console.error('Error analyzing portfolio:', error);
      return {
        message: `Error analyzing portfolio: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      };
    }
  }
  
  /**
   * Sentiment Analysis Skill
   * Analyzes market sentiment from news and social media
   */
  static async analyzeSentiment(
    context: AgentContext,
    symbol: string,
    sources: string[] = ['twitter', 'reddit', 'news']
  ): Promise<ElizaResponse> {
    try {
      const command = {
        command: `Analyze sentiment for ${symbol} from sources: ${sources.join(', ')}`,
        type: 'analysis',
        params: {
          symbol,
          sources
        }
      };
      
      return await sendElizaCommand(command, context);
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      return {
        message: `Error analyzing sentiment: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      };
    }
  }
  
  /**
   * Price Prediction Skill
   * Uses ML models to predict future price movements
   */
  static async predictPriceMovement(
    context: AgentContext,
    symbol: string,
    timeframe: string,
    horizon: string
  ): Promise<ElizaResponse> {
    try {
      // First check if we have a ML model for this prediction
      const models = await ModelService.getAllModels();
      const suitable = models.filter(m => 
        m.status === 'ready' && 
        m.type === 'time-series' &&
        m.parameters?.symbol === symbol
      );
      
      let modelResponse = null;
      
      if (suitable.length > 0) {
        // Use ML model for prediction
        const model = suitable[0];
        const predictionData = await ModelService.generateSignals(
          model.id,
          symbol,
          timeframe,
          1
        );
        
        if (predictionData && predictionData.length > 0) {
          modelResponse = {
            prediction: predictionData[0].signal,
            probability: predictionData[0].probability,
            modelName: model.name,
            timestamp: new Date().toISOString()
          };
        }
      }
      
      // Send command to ElizaOS
      const command = {
        command: `Predict price movement for ${symbol} on ${timeframe} timeframe over the next ${horizon}`,
        type: 'analysis',
        params: {
          symbol,
          timeframe,
          horizon,
          modelPrediction: modelResponse
        }
      };
      
      return await sendElizaCommand(command, context);
    } catch (error) {
      console.error('Error predicting price movement:', error);
      return {
        message: `Error predicting price movement: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      };
    }
  }
  
  /**
   * Trade Execution Skill
   * Executes trades based on strategy signals
   */
  static async executeTrade(
    context: AgentContext,
    symbol: string,
    direction: 'long' | 'short',
    entryPrice: number | 'market',
    stopLoss: number,
    takeProfit: number,
    size: number,
    reason: string
  ): Promise<ElizaResponse> {
    try {
      const command = {
        command: `Execute ${direction} trade for ${symbol} at ${entryPrice === 'market' ? 'market price' : entryPrice}`,
        type: 'action',
        params: {
          symbol,
          direction,
          entryPrice,
          stopLoss,
          takeProfit,
          size,
          reason
        }
      };
      
      return await sendElizaCommand(command, context);
    } catch (error) {
      console.error('Error executing trade:', error);
      return {
        message: `Error executing trade: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      };
    }
  }
  
  /**
   * Position Management Skill
   * Manages open positions (trailing stops, partial closes)
   */
  static async managePosition(
    context: AgentContext,
    symbol: string,
    action: 'update_stop' | 'partial_close' | 'move_to_breakeven',
    parameters: Record<string, any>
  ): Promise<ElizaResponse> {
    try {
      const command = {
        command: `Manage ${symbol} position: ${action}`,
        type: 'action',
        params: {
          symbol,
          action,
          ...parameters
        }
      };
      
      return await sendElizaCommand(command, context);
    } catch (error) {
      console.error('Error managing position:', error);
      return {
        message: `Error managing position: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      };
    }
  }
  
  /**
   * Strategy Optimization Skill
   * Optimizes strategy parameters based on historical performance
   */
  static async optimizeStrategy(
    context: AgentContext,
    strategyId: number,
    targetMetric: 'sharpe_ratio' | 'profit_factor' | 'max_drawdown' | 'total_return' = 'sharpe_ratio'
  ): Promise<ElizaResponse> {
    try {
      // Get the current strategy parameters
      const supabase = createBrowserClient();
      const { data: strategy, error } = await supabase
        .from('strategies')
        .select('*')
        .eq('id', strategyId)
        .single();
      
      if (error) throw error;
      
      // Use ML service to optimize strategy
      const optimizationResult = await ModelService.optimizeStrategy(
        strategyId,
        strategy.settings.parameters || {},
        targetMetric
      );
      
      const command = {
        command: `Optimize strategy #${strategyId} to maximize ${targetMetric}`,
        type: 'analysis',
        params: {
          strategyId,
          targetMetric,
          optimizationResult
        }
      };
      
      return await sendElizaCommand(command, context);
    } catch (error) {
      console.error('Error optimizing strategy:', error);
      return {
        message: `Error optimizing strategy: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      };
    }
  }
  
  /**
   * Market Scanning Skill
   * Scans multiple assets for potential trade setups
   */
  static async scanMarket(
    context: AgentContext,
    symbols: string[],
    timeframe: string,
    scanType: 'breakout' | 'trend_reversal' | 'divergence' | 'support_resistance'
  ): Promise<ElizaResponse> {
    try {
      const command = {
        command: `Scan ${symbols.length} symbols on ${timeframe} timeframe for ${scanType} patterns`,
        type: 'analysis',
        params: {
          symbols,
          timeframe,
          scanType
        }
      };
      
      return await sendElizaCommand(command, context);
    } catch (error) {
      console.error('Error scanning market:', error);
      return {
        message: `Error scanning market: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      };
    }
  }
  
  /**
   * News Analysis Skill
   * Analyzes news and events for trading impact
   */
  static async analyzeNews(
    context: AgentContext,
    symbol: string,
    lookbackDays: number = 7
  ): Promise<ElizaResponse> {
    try {
      const command = {
        command: `Analyze recent news for ${symbol} over the last ${lookbackDays} days`,
        type: 'analysis',
        params: {
          symbol,
          lookbackDays
        }
      };
      
      return await sendElizaCommand(command, context);
    } catch (error) {
      console.error('Error analyzing news:', error);
      return {
        message: `Error analyzing news: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      };
    }
  }
  
  /**
   * Risk Management Skill
   * Manages overall portfolio risk
   */
  static async manageRisk(
    context: AgentContext,
    riskLevel: 'low' | 'medium' | 'high',
    maxDrawdown: number,
    maxLeverage: number
  ): Promise<ElizaResponse> {
    try {
      const command = {
        command: `Manage portfolio risk with ${riskLevel} risk profile`,
        type: 'action',
        params: {
          riskLevel,
          maxDrawdown,
          maxLeverage
        }
      };
      
      return await sendElizaCommand(command, context);
    } catch (error) {
      console.error('Error managing risk:', error);
      return {
        message: `Error managing risk: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      };
    }
  }
  
  /**
   * Strategy Backtesting Skill
   * Runs backtests on historical data
   */
  static async runBacktest(
    context: AgentContext,
    strategyId: number,
    symbol: string,
    timeframe: string,
    startDate: string,
    endDate: string,
    initialCapital: number
  ): Promise<ElizaResponse> {
    try {
      const command = {
        command: `Run backtest for strategy #${strategyId} on ${symbol} ${timeframe} from ${startDate} to ${endDate}`,
        type: 'action',
        params: {
          strategyId,
          symbol,
          timeframe,
          startDate,
          endDate,
          initialCapital
        }
      };
      
      return await sendElizaCommand(command, context);
    } catch (error) {
      console.error('Error running backtest:', error);
      return {
        message: `Error running backtest: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      };
    }
  }
  
  /**
   * Trade Journal Skill
   * Maintains a detailed journal of trades and analysis
   */
  static async journalTrade(
    context: AgentContext,
    tradeId: number,
    notes: string,
    ratings: Record<string, number>,
    tags: string[]
  ): Promise<ElizaResponse> {
    try {
      const command = {
        command: `Journal trade #${tradeId} with notes and ratings`,
        type: 'action',
        params: {
          tradeId,
          notes,
          ratings,
          tags
        }
      };
      
      return await sendElizaCommand(command, context);
    } catch (error) {
      console.error('Error journaling trade:', error);
      return {
        message: `Error journaling trade: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      };
    }
  }
  
  /**
   * Asset Correlation Analysis Skill
   * Analyzes correlations between different assets
   */
  static async analyzeCorrelations(
    context: AgentContext,
    symbols: string[],
    timeframe: string,
    lookbackPeriod: string
  ): Promise<ElizaResponse> {
    try {
      const command = {
        command: `Analyze correlations between ${symbols.join(', ')} on ${timeframe} timeframe over the last ${lookbackPeriod}`,
        type: 'analysis',
        params: {
          symbols,
          timeframe,
          lookbackPeriod
        }
      };
      
      return await sendElizaCommand(command, context);
    } catch (error) {
      console.error('Error analyzing correlations:', error);
      return {
        message: `Error analyzing correlations: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      };
    }
  }
  
  /**
   * Alert Management Skill
   * Sets up and manages trading alerts
   */
  static async manageAlerts(
    context: AgentContext,
    action: 'create' | 'update' | 'delete' | 'list',
    alertParams?: Record<string, any>
  ): Promise<ElizaResponse> {
    try {
      const command = {
        command: `${action} trading alert`,
        type: 'action',
        params: {
          action,
          ...alertParams
        }
      };
      
      return await sendElizaCommand(command, context);
    } catch (error) {
      console.error('Error managing alerts:', error);
      return {
        message: `Error managing alerts: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      };
    }
  }
}
