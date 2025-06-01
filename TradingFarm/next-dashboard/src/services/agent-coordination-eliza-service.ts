/**
 * Agent Coordination ElizaOS Service
 * Extends the Agent Coordination Service with ElizaOS capabilities
 */

import { agentCoordinationService, ApiResponse } from './agent-coordination-service';
import { elizaGoalConnector, GoalAcquisitionMemory } from './elizaos-integration/goal-acquisition-connector';
import { Goal, GoalStrategy, GoalTransaction } from '@/types/goal-types';
import { Agent } from '@/types/farm-types';
import { goalAcquisitionService } from './goal-acquisition-service';

/**
 * Extended Agent Coordination Service with ElizaOS Integration
 * This service handles the coordination of agents via ElizaOS for goal acquisition
 */
export const agentCoordinationElizaService = {

  /**
   * Initialize ElizaOS agents for goal acquisition
   */
  async initializeElizaAgentsForGoal(
    goalId: string,
    agents: Agent[]
  ): Promise<ApiResponse<null>> {
    try {
      // Get the goal details
      const { data: goal, error: goalError } = await goalAcquisitionService.getAcquisitionGoal(goalId);
      
      if (goalError || !goal) {
        return { error: goalError || 'Goal not found' };

// Export as agentCoordinationService to match the import in route.ts
export const agentCoordinationService = agentCoordinationElizaService;
      }
      
      // Initialize ElizaOS agents with goal knowledge
      for (const agent of agents) {
        // Determine agent role
        const role = agentCoordinationService.determineAgentRole(agent);
        if (!role) continue;
        
        // Store initial goal memory
        await elizaGoalConnector.storeMemory(agent.id, {
          goalId,
          memoryType: 'STRATEGY',
          content: `Assigned to goal: ${goal.name} - Acquire ${goal.target_amount} ${goal.selected_asset}`,
          metadata: {
            role,
            goalDetails: {
              name: goal.name,
              target_amount: goal.target_amount,
              selected_asset: goal.selected_asset,
              description: goal.description
            }
          },
          importance: 0.9
        });
        
        // Record initialization in monitoring
        await goalAcquisitionService.recordMonitoringEvent(
          goalId,
          agent.id,
          'AGENT_INITIALIZED',
          {
            agent_name: agent.name,
            agent_role: role,
            timestamp: new Date().toISOString()
          }
        );
      }
      
      return { data: null };

// Export as agentCoordinationService to match the import in route.ts
export const agentCoordinationService = agentCoordinationElizaService;
    } catch (error) {
      console.error('Error initializing ElizaOS agents for goal:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };

// Export as agentCoordinationService to match the import in route.ts
export const agentCoordinationService = agentCoordinationElizaService;
    }
  },
  
  /**
   * Send analysis command to ElizaOS agent
   */
  async sendElizaAnalysisCommand(
    goalId: string,
    agentId: string,
    goal: Goal
  ): Promise<ApiResponse<null>> {
    try {
      // Get market data (in a real implementation, this would come from a market data service)
      const mockMarketData = {
        prices: {
          'SUI': 0.57,
          'SONIC': 1.25,
          'USDC': 1.0,
          'WETH': 3245.78
        },
        liquidity: {
          'SUI/USDC': 'HIGH',
          'SONIC/SUI': 'MEDIUM',
          'WETH/USDC': 'HIGH'
        },
        trends: {
          'SUI': 'BULLISH',
          'SONIC': 'NEUTRAL',
          'WETH': 'BULLISH'
        },
        volatility: 'MEDIUM'
      };

// Export as agentCoordinationService to match the import in route.ts
export const agentCoordinationService = agentCoordinationElizaService;
      
      // Send analysis command to ElizaOS
      const response = await elizaGoalConnector.requestMarketAnalysis(
        agentId,
        goalId,
        goal.selected_asset,
        mockMarketData
      );
      
      if (!response.success) {
        return { error: response.message };

// Export as agentCoordinationService to match the import in route.ts
export const agentCoordinationService = agentCoordinationElizaService;
      }
      
      // Update the coordination state
      const state = agentCoordinationService.coordinationStates.get(goalId);
      if (state) {
        if (state.activeAgents[agentId]) {
          state.activeAgents[agentId].lastCommand = 'ANALYZE_MARKET';
          state.activeAgents[agentId].lastActivity = new Date().toISOString();
        }
        agentCoordinationService.coordinationStates.set(goalId, state);
      }
      
      // Record the command in monitoring
      await goalAcquisitionService.recordMonitoringEvent(
        goalId,
        agentId,
        'COMMAND_SENT',
        {
          command_type: 'ANALYZE_MARKET',
          timestamp: new Date().toISOString()
        }
      );
      
      return { data: null };

// Export as agentCoordinationService to match the import in route.ts
export const agentCoordinationService = agentCoordinationElizaService;
    } catch (error) {
      console.error('Error sending ElizaOS analysis command:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };

// Export as agentCoordinationService to match the import in route.ts
export const agentCoordinationService = agentCoordinationElizaService;
    }
  },
  
  /**
   * Process market analysis from ElizaOS agent
   */
  async processElizaMarketAnalysis(
    goalId: string,
    agentId: string,
    analysis: any
  ): Promise<ApiResponse<null>> {
    try {
      // Get the goal details
      const { data: goal, error: goalError } = await goalAcquisitionService.getAcquisitionGoal(goalId);
      
      if (goalError || !goal) {
        return { error: goalError || 'Goal not found' };

// Export as agentCoordinationService to match the import in route.ts
export const agentCoordinationService = agentCoordinationElizaService;
      }
      
      // Store analysis as a memory
      await elizaGoalConnector.storeMemory(agentId, {
        goalId,
        memoryType: 'MARKET_CONDITION',
        content: `Market analysis for ${goal.selected_asset} acquisition: ${analysis.summary || JSON.stringify(analysis)}`,
        metadata: {
          analysis,
          timestamp: new Date().toISOString()
        },
        importance: 0.8
      });
      
      // Record the analysis in monitoring
      await goalAcquisitionService.recordMonitoringEvent(
        goalId,
        agentId,
        'MARKET_UPDATE',
        {
          analysis: analysis,
          timestamp: new Date().toISOString()
        }
      );
      
      // Update coordination state with market conditions
      const state = agentCoordinationService.coordinationStates.get(goalId);
      if (state) {
        state.marketConditions = analysis;
        agentCoordinationService.coordinationStates.set(goalId, state);
      }
      
      // Request strategy proposal based on analysis
      return this.requestElizaStrategyProposal(goalId, agentId, goal, analysis);
    } catch (error) {
      console.error('Error processing ElizaOS market analysis:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };

// Export as agentCoordinationService to match the import in route.ts
export const agentCoordinationService = agentCoordinationElizaService;
    }
  },
  
  /**
   * Request strategy proposal from ElizaOS agent
   */
  async requestElizaStrategyProposal(
    goalId: string,
    agentId: string,
    goal: Goal,
    marketAnalysis: any
  ): Promise<ApiResponse<null>> {
    try {
      // Send strategy proposal command to ElizaOS
      const response = await elizaGoalConnector.requestStrategyProposal(
        agentId,
        goalId,
        goal,
        marketAnalysis
      );
      
      if (!response.success) {
        return { error: response.message };

// Export as agentCoordinationService to match the import in route.ts
export const agentCoordinationService = agentCoordinationElizaService;
      }
      
      // Update the coordination state
      const state = agentCoordinationService.coordinationStates.get(goalId);
      if (state) {
        if (state.activeAgents[agentId]) {
          state.activeAgents[agentId].lastCommand = 'PROPOSE_STRATEGY';
          state.activeAgents[agentId].lastActivity = new Date().toISOString();
        }
        agentCoordinationService.coordinationStates.set(goalId, state);
      }
      
      // Record the command in monitoring
      await goalAcquisitionService.recordMonitoringEvent(
        goalId,
        agentId,
        'COMMAND_SENT',
        {
          command_type: 'PROPOSE_STRATEGY',
          timestamp: new Date().toISOString()
        }
      );
      
      return { data: null };

// Export as agentCoordinationService to match the import in route.ts
export const agentCoordinationService = agentCoordinationElizaService;
    } catch (error) {
      console.error('Error requesting ElizaOS strategy proposal:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };

// Export as agentCoordinationService to match the import in route.ts
export const agentCoordinationService = agentCoordinationElizaService;
    }
  },
  
  /**
   * Process strategy proposal from ElizaOS agent
   */
  async processElizaStrategyProposal(
    goalId: string,
    agentId: string,
    proposal: any
  ): Promise<ApiResponse<null>> {
    try {
      // Get the goal details
      const { data: goal, error: goalError } = await goalAcquisitionService.getAcquisitionGoal(goalId);
      
      if (goalError || !goal) {
        return { error: goalError || 'Goal not found' };

// Export as agentCoordinationService to match the import in route.ts
export const agentCoordinationService = agentCoordinationElizaService;
      }
      
      // Format the proposal for storage
      const formattedProposal = {
        goal_id: goalId,
        agent_id: agentId,
        strategy_type: proposal.strategy_type,
        parameters: proposal.parameters,
        rationale: proposal.rationale,
        is_active: false,
        proposed_at: new Date().toISOString()
      };

// Export as agentCoordinationService to match the import in route.ts
export const agentCoordinationService = agentCoordinationElizaService;
      
      // Store the proposal in the database
      const { data: strategy, error: strategyError } = await goalAcquisitionService.createStrategy(formattedProposal);
      
      if (strategyError) {
        return { error: strategyError };

// Export as agentCoordinationService to match the import in route.ts
export const agentCoordinationService = agentCoordinationElizaService;
      }
      
      // Store the proposal as a memory
      await elizaGoalConnector.storeMemory(agentId, {
        goalId,
        memoryType: 'STRATEGY',
        content: `Proposed ${proposal.strategy_type} strategy for ${goal.selected_asset} acquisition: ${proposal.rationale || ''}`,
        metadata: {
          proposal,
          strategy_id: strategy.id,
          timestamp: new Date().toISOString()
        },
        importance: 0.85
      });
      
      // Record the proposal in monitoring
      await goalAcquisitionService.recordMonitoringEvent(
        goalId,
        agentId,
        'STRATEGY_PROPOSED',
        {
          strategy_type: proposal.strategy_type,
          rationale: proposal.rationale,
          parameters: proposal.parameters,
          timestamp: new Date().toISOString()
        }
      );
      
      return { data: null };

// Export as agentCoordinationService to match the import in route.ts
export const agentCoordinationService = agentCoordinationElizaService;
    } catch (error) {
      console.error('Error processing ElizaOS strategy proposal:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };

// Export as agentCoordinationService to match the import in route.ts
export const agentCoordinationService = agentCoordinationElizaService;
    }
  },
  
  /**
   * Send execution command to ElizaOS agent
   */
  async sendElizaExecutionCommand(
    goalId: string,
    agentId: string,
    strategy: GoalStrategy
  ): Promise<ApiResponse<null>> {
    try {
      // Get the goal details
      const { data: goal, error: goalError } = await goalAcquisitionService.getAcquisitionGoal(goalId);
      
      if (goalError || !goal) {
        return { error: goalError || 'Goal not found' };

// Export as agentCoordinationService to match the import in route.ts
export const agentCoordinationService = agentCoordinationElizaService;
      }
      
      // Send execution command to ElizaOS
      const response = await elizaGoalConnector.requestExecution(
        agentId,
        goalId,
        strategy
      );
      
      if (!response.success) {
        return { error: response.message };

// Export as agentCoordinationService to match the import in route.ts
export const agentCoordinationService = agentCoordinationElizaService;
      }
      
      // Update the coordination state
      const state = agentCoordinationService.coordinationStates.get(goalId);
      if (state) {
        if (state.activeAgents[agentId]) {
          state.activeAgents[agentId].lastCommand = 'EXECUTE_TRADE';
          state.activeAgents[agentId].lastActivity = new Date().toISOString();
        }
        state.currentTransaction = response.data.id;
        agentCoordinationService.coordinationStates.set(goalId, state);
      }
      
      // Record the command in monitoring
      await goalAcquisitionService.recordMonitoringEvent(
        goalId,
        agentId,
        'EXECUTION_STARTED',
        {
          strategy_id: strategy.id,
          strategy_type: strategy.strategy_type,
          timestamp: new Date().toISOString()
        }
      );
      
      return { data: null };

// Export as agentCoordinationService to match the import in route.ts
export const agentCoordinationService = agentCoordinationElizaService;
    } catch (error) {
      console.error('Error sending ElizaOS execution command:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };

// Export as agentCoordinationService to match the import in route.ts
export const agentCoordinationService = agentCoordinationElizaService;
    }
  },
  
  /**
   * Process execution result from ElizaOS agent
   */
  async processElizaExecutionResult(
    goalId: string,
    agentId: string,
    result: any
  ): Promise<ApiResponse<null>> {
    try {
      // Format the transaction for storage
      const formattedTransaction = {
        goal_id: goalId,
        agent_id: agentId,
        transaction_type: result.transaction_type,
        asset_from: result.asset_from,
        amount_from: result.amount_from,
        asset_to: result.asset_to,
        amount_to: result.amount_to,
        transaction_hash: result.transaction_hash,
        protocol: result.protocol,
        status: result.status || 'PENDING',
        metadata: {
          execution_time: result.execution_time,
          gas_cost: result.gas_cost,
          price_impact: result.price_impact,
          exchange_rate: result.exchange_rate
        }
      };

// Export as agentCoordinationService to match the import in route.ts
export const agentCoordinationService = agentCoordinationElizaService;
      
      // Store the transaction in the database
      const { data: transaction, error: transactionError } = await goalAcquisitionService.recordTransaction(formattedTransaction);
      
      if (transactionError) {
        return { error: transactionError };

// Export as agentCoordinationService to match the import in route.ts
export const agentCoordinationService = agentCoordinationElizaService;
      }
      
      // Store the execution result as a memory
      await elizaGoalConnector.storeMemory(agentId, {
        goalId,
        memoryType: 'EXECUTION',
        content: `Executed ${result.transaction_type} transaction: ${result.amount_from} ${result.asset_from} → ${result.amount_to} ${result.asset_to}`,
        metadata: {
          result,
          transaction_id: transaction.id,
          timestamp: new Date().toISOString()
        },
        importance: 0.9
      });
      
      // Record the execution in monitoring
      const eventType = result.status === 'CONFIRMED' ? 'TRANSACTION_CONFIRMED' : 'TRANSACTION_FAILED';
      await goalAcquisitionService.recordMonitoringEvent(
        goalId,
        agentId,
        eventType,
        {
          transaction_id: transaction.id,
          transaction_type: result.transaction_type,
          asset_from: result.asset_from,
          amount_from: result.amount_from,
          asset_to: result.asset_to,
          amount_to: result.amount_to,
          status: result.status,
          timestamp: new Date().toISOString()
        }
      );
      
      return { data: null };

// Export as agentCoordinationService to match the import in route.ts
export const agentCoordinationService = agentCoordinationElizaService;
    } catch (error) {
      console.error('Error processing ElizaOS execution result:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };

// Export as agentCoordinationService to match the import in route.ts
export const agentCoordinationService = agentCoordinationElizaService;
    }
  },
  
  /**
   * Request monitoring update from ElizaOS agent
   */
  async requestElizaMonitoringUpdate(
    goalId: string,
    agentId: string
  ): Promise<ApiResponse<null>> {
    try {
      // Get the goal details
      const { data: goal, error: goalError } = await goalAcquisitionService.getAcquisitionGoal(goalId);
      
      if (goalError || !goal) {
        return { error: goalError || 'Goal not found' };

// Export as agentCoordinationService to match the import in route.ts
export const agentCoordinationService = agentCoordinationElizaService;
      }
      
      // Send monitoring command to ElizaOS
      const response = await elizaGoalConnector.requestMonitoringUpdate(
        agentId,
        goalId,
        goal.current_amount,
        goal.target_amount,
        goal.selected_asset
      );
      
      if (!response.success) {
        return { error: response.message };

// Export as agentCoordinationService to match the import in route.ts
export const agentCoordinationService = agentCoordinationElizaService;
      }
      
      // Update the coordination state
      const state = agentCoordinationService.coordinationStates.get(goalId);
      if (state) {
        if (state.activeAgents[agentId]) {
          state.activeAgents[agentId].lastCommand = 'MONITOR_PROGRESS';
          state.activeAgents[agentId].lastActivity = new Date().toISOString();
        }
        agentCoordinationService.coordinationStates.set(goalId, state);
      }
      
      return { data: null };

// Export as agentCoordinationService to match the import in route.ts
export const agentCoordinationService = agentCoordinationElizaService;
    } catch (error) {
      console.error('Error requesting ElizaOS monitoring update:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };

// Export as agentCoordinationService to match the import in route.ts
export const agentCoordinationService = agentCoordinationElizaService;
    }
  },
  
  /**
   * Get goal acquisition memories from ElizaOS
   */
  async getGoalAcquisitionMemories(
    goalId: string,
    memoryType?: string,
    limit?: number
  ): Promise<ApiResponse<any[]>> {
    try {
      // Get memories from ElizaOS
      const response = await elizaGoalConnector.getGoalMemories(
        goalId,
        memoryType,
        limit
      );
      
      if (!response.success) {
        return { error: response.message };

// Export as agentCoordinationService to match the import in route.ts
export const agentCoordinationService = agentCoordinationElizaService;
      }
      
      return { data: response.data };

// Export as agentCoordinationService to match the import in route.ts
export const agentCoordinationService = agentCoordinationElizaService;
    } catch (error) {
      console.error('Error getting goal acquisition memories:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };

// Export as agentCoordinationService to match the import in route.ts
export const agentCoordinationService = agentCoordinationElizaService;
    }
  }
};

// Export as agentCoordinationService to match the import in route.ts
export const agentCoordinationService = agentCoordinationElizaService;
