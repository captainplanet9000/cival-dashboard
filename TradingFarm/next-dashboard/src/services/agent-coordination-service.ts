/**
 * Agent Coordination Service
 * Orchestrates agents working towards acquisition goals in the Trading Farm
 */
import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';
import { Goal, GoalStrategy } from '@/types/goal-types';
import { Agent } from '@/types/farm-types';
import { goalAcquisitionService } from './goal-acquisition-service';
import { ElizaCommandResponse } from '@/types/farm-types';

// API response types (matching other services)
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  count?: number;
  total?: number;
}

// Type for coordination state
interface CoordinationState {
  goalId: string;
  phase: 'PLANNING' | 'EXECUTION' | 'MONITORING' | 'ADAPTATION' | 'COMPLETION';
  activeAgents: Record<string, {
    role: string;
    lastCommand?: string;
    lastActivity: string;
  }>;
  selectedStrategy?: string; // Strategy ID
  currentTransaction?: string; // Transaction ID
  marketConditions?: Record<string, any>;
  isAdapting: boolean;
}

// Service to coordinate agents for goal acquisition
export const agentCoordinationService = {
  // In-memory state for coordination (would be persisted in a real implementation)
  coordinationStates: new Map<string, CoordinationState>(),

  /**
   * Handle goal activation
   * This is the entry point for the coordination workflow
   */
  async handleGoalActivation(goalId: string): Promise<ApiResponse<null>> {
    try {
      // Get the goal details
      const { data: goal, error: goalError } = await goalAcquisitionService.getAcquisitionGoal(goalId);
      
      if (goalError || !goal) {
        return { error: goalError || 'Goal not found' };
      }
      
      // Make sure the goal is in ACTIVE status
      if (goal.status !== 'ACTIVE') {
        return { error: 'Goal must be in ACTIVE status to coordinate' };
      }
      
      // Initialize coordination state
      this.coordinationStates.set(goalId, {
        goalId,
        phase: 'PLANNING',
        activeAgents: {},
        isAdapting: false
      });
      
      // Get agents assigned to the farm
      const { data: agents, error: agentsError } = await this.getFarmAgents(goal.farm_id);
      
      if (agentsError) {
        return { error: agentsError };
      }
      
      if (!agents || agents.length === 0) {
        return { error: 'No agents assigned to the farm' };
      }
      
      // Register agents in coordination state
      const state = this.coordinationStates.get(goalId);
      if (state) {
        agents.forEach(agent => {
          // Assign roles based on agent type/capabilities
          const role = this.determineAgentRole(agent);
          if (role) {
            state.activeAgents[agent.id] = {
              role,
              lastActivity: new Date().toISOString()
            };
          }
        });
        this.coordinationStates.set(goalId, state);
      }
      
      // Start the planning phase
      await this.initiateAnalysisPhase(goalId);
      
      return { data: null };
    } catch (error) {
      console.error('Error handling goal activation:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Initiate the analysis phase
   * This starts the process of having agents analyze possible strategies
   */
  async initiateAnalysisPhase(goalId: string): Promise<ApiResponse<null>> {
    try {
      const state = this.coordinationStates.get(goalId);
      if (!state) {
        return { error: 'No coordination state found for this goal' };
      }
      
      // Get the goal details
      const { data: goal, error: goalError } = await goalAcquisitionService.getAcquisitionGoal(goalId);
      
      if (goalError || !goal) {
        return { error: goalError || 'Goal not found' };
      }
      
      // Find analyst agents
      const analystAgents = Object.entries(state.activeAgents)
        .filter(([_, data]) => data.role === 'ANALYST')
        .map(([agentId]) => agentId);
      
      if (analystAgents.length === 0) {
        return { error: 'No analyst agents available for planning' };
      }
      
      // Update state to planning phase
      state.phase = 'PLANNING';
      this.coordinationStates.set(goalId, state);
      
      // Record monitoring event
      await goalAcquisitionService.recordMonitoringEvent(
        goalId,
        Object.keys(state.activeAgents)[0], // Just use the first agent as the reporter
        'PLANNING_STARTED',
        {
          target_assets: goal.target_assets,
          target_amount: goal.target_amount
        }
      );
      
      // Send analysis commands to each analyst agent
      for (const agentId of analystAgents) {
        await this.sendAnalysisCommand(goalId, agentId, goal);
        
        // Update agent's last command in state
        state.activeAgents[agentId].lastCommand = 'ANALYZE_ACQUISITION_STRATEGY';
        state.activeAgents[agentId].lastActivity = new Date().toISOString();
      }
      
      this.coordinationStates.set(goalId, state);
      
      return { data: null };
    } catch (error) {
      console.error('Error initiating analysis phase:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Send command to agent for analyzing acquisition strategy
   */
  async sendAnalysisCommand(goalId: string, agentId: string, goal: Goal): Promise<ApiResponse<null>> {
    try {
      // In a real implementation, this would use the ElizaCommandService
      // to send the command to the specified agent
      
      // For now, we'll simulate the process
      console.log('Sending analysis command to agent:', {
        agentId,
        goalId,
        command: 'ANALYZE_ACQUISITION_STRATEGY',
        parameters: {
          target_assets: goal.target_assets,
          target_amount: goal.target_amount
        }
      });
      
      // In a complete implementation, this would integrate with elizaCommandService
      // Example: await elizaCommandService.sendCommand(agentId, 'ANALYZE_ACQUISITION_STRATEGY', params);
      
      // For demonstration, we'll add a simulated response after a delay
      setTimeout(() => {
        // Simulate agent responding with strategy proposal
        this.processStrategyProposal(agentId, goalId, {
          strategy_type: 'DEX_SWAP',
          target_asset: goal.target_assets[0],
          parameters: {
            exchange: 'Cetus',
            asset_to_swap: 'USDC',
            estimated_price: 2.5,
            estimated_slippage: 0.5
          },
          assessment: {
            feasibility: 'HIGH',
            time_estimate: '2 days',
            risk_level: 'MEDIUM'
          }
        });
      }, 3000); // Simulate 3-second processing time
      
      return { data: null };
    } catch (error) {
      console.error('Error sending analysis command:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Process strategy proposal from an agent
   */
  async processStrategyProposal(
    agentId: string,
    goalId: string,
    proposal: any
  ): Promise<ApiResponse<null>> {
    try {
      const state = this.coordinationStates.get(goalId);
      if (!state) {
        return { error: 'No coordination state found for this goal' };
      }
      
      // Record the strategy proposal
      const { data: strategy, error } = await goalAcquisitionService.addStrategyProposal(
        goalId,
        agentId,
        proposal.strategy_type,
        proposal.parameters
      );
      
      if (error) {
        return { error };
      }
      
      // Update monitoring with the proposal
      await goalAcquisitionService.recordMonitoringEvent(
        goalId,
        agentId,
        'STRATEGY_PROPOSED',
        {
          strategy_type: proposal.strategy_type,
          target_asset: proposal.target_asset,
          assessment: proposal.assessment
        }
      );
      
      // Check if all analyst agents have submitted proposals
      const pendingAnalysts = Object.entries(state.activeAgents)
        .filter(([agentId, data]) => 
          data.role === 'ANALYST' && 
          data.lastCommand === 'ANALYZE_ACQUISITION_STRATEGY'
        );
      
      // If this was the last analyst, proceed to strategy selection
      if (pendingAnalysts.length <= 1) {
        this.selectStrategy(goalId);
      }
      
      return { data: null };
    } catch (error) {
      console.error('Error processing strategy proposal:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Select the best strategy from proposals
   */
  async selectStrategy(goalId: string): Promise<ApiResponse<null>> {
    try {
      // Get all strategies for the goal
      const { data: strategies, error } = await goalAcquisitionService.getGoalStrategies(goalId);
      
      if (error) {
        return { error };
      }
      
      if (!strategies || strategies.length === 0) {
        return { error: 'No strategy proposals found' };
      }
      
      // In a real implementation, you would use more sophisticated selection logic
      // Here we'll just select the first proposal
      const selectedStrategy = strategies[0];
      
      // Get the goal to determine the selected asset
      const { data: goal } = await goalAcquisitionService.getAcquisitionGoal(goalId);
      
      // Select target asset (in this example, we just use the first from the proposal)
      const selectedAsset = goal?.target_assets[0];
      
      // Activate the selected strategy
      const { data, error: selectError } = await goalAcquisitionService.selectStrategy(
        selectedStrategy.id,
        selectedAsset
      );
      
      if (selectError) {
        return { error: selectError };
      }
      
      // Update coordination state
      const state = this.coordinationStates.get(goalId);
      if (state) {
        state.selectedStrategy = selectedStrategy.id;
        state.phase = 'EXECUTION';
        this.coordinationStates.set(goalId, state);
      }
      
      // Record the selection in monitoring
      await goalAcquisitionService.recordMonitoringEvent(
        goalId,
        Object.keys(state?.activeAgents || {})[0], // Just use the first agent
        'STRATEGY_SELECTED',
        {
          strategy_id: selectedStrategy.id,
          strategy_type: selectedStrategy.strategy_type,
          selected_asset: selectedAsset
        }
      );
      
      // Start execution phase
      this.initiateExecutionPhase(goalId, selectedStrategy.id);
      
      return { data: null };
    } catch (error) {
      console.error('Error selecting strategy:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Initiate the execution phase
   */
  async initiateExecutionPhase(goalId: string, strategyId: string): Promise<ApiResponse<null>> {
    try {
      const state = this.coordinationStates.get(goalId);
      if (!state) {
        return { error: 'No coordination state found for this goal' };
      }
      
      // Get the selected strategy
      const { data: strategy, error } = await goalAcquisitionService.getActiveStrategy(goalId);
      
      if (error || !strategy) {
        return { error: error || 'Selected strategy not found' };
      }
      
      // Find execution agents
      const executionAgents = Object.entries(state.activeAgents)
        .filter(([_, data]) => data.role === 'EXECUTION')
        .map(([agentId]) => agentId);
      
      if (executionAgents.length === 0) {
        return { error: 'No execution agents available' };
      }
      
      // Get the goal
      const { data: goal } = await goalAcquisitionService.getAcquisitionGoal(goalId);
      
      if (!goal || !goal.selected_asset) {
        return { error: 'Goal or selected asset not found' };
      }
      
      // Record monitoring event for execution phase start
      await goalAcquisitionService.recordMonitoringEvent(
        goalId,
        executionAgents[0],
        'EXECUTION_STARTED',
        {
          strategy_id: strategyId,
          strategy_type: strategy.strategy_type,
          target_asset: goal.selected_asset
        }
      );
      
      // Send execution command to the first execution agent
      this.sendExecutionCommand(goalId, executionAgents[0], strategy, goal);
      
      // Start monitoring phase concurrently
      this.initiateMonitoringPhase(goalId);
      
      return { data: null };
    } catch (error) {
      console.error('Error initiating execution phase:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Get agents assigned to a farm
   */
  async getFarmAgents(farmId: string): Promise<ApiResponse<Agent[]>> {
    try {
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('farm_id', farmId)
        .eq('is_active', true);
      
      if (error) {
        return { error: error.message };
      }
      
      return { data };
    } catch (error) {
      console.error('Error getting farm agents:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Determine appropriate role for an agent based on its type/configuration
   */
  determineAgentRole(agent: Agent): 'ANALYST' | 'EXECUTION' | 'MONITORING' | null {
    // This is a simplified implementation
    // In a real system, you would check the agent's capabilities, configuration, etc.
    
    // Simple mapping based on agent type
    if (agent.type.includes('analyst') || agent.type.includes('market')) {
      return 'ANALYST';
    } else if (agent.type.includes('trader') || agent.type.includes('execution')) {
      return 'EXECUTION';
    } else if (agent.type.includes('monitor') || agent.type.includes('risk')) {
      return 'MONITORING';
    }
    
    // Default role based on agent name pattern
    if (agent.name.toLowerCase().includes('analyst')) {
      return 'ANALYST';
    } else if (agent.name.toLowerCase().includes('trader') || agent.name.toLowerCase().includes('executor')) {
      return 'EXECUTION';
    } else if (agent.name.toLowerCase().includes('monitor')) {
      return 'MONITORING';
    }
    
    // If we can't determine a specific role, return null
    return null;
  },
  
  /**
   * Send execution command to an agent
   */
  async sendExecutionCommand(
    goalId: string,
    agentId: string,
    strategy: GoalStrategy,
    goal: Goal
  ): Promise<ApiResponse<null>> {
    try {
      // In a real implementation, this would use the ElizaCommandService
      // to send the command to the specified agent
      
      // For now, we'll simulate the process
      console.log('Sending execution command to agent:', {
        agentId,
        goalId,
        command: 'EXECUTE_SWAP',
        parameters: {
          strategy_type: strategy.strategy_type,
          target_asset: goal.selected_asset,
          parameters: strategy.parameters
        }
      });
      
      // Update coordination state
      const state = this.coordinationStates.get(goalId);
      if (state && state.activeAgents[agentId]) {
        state.activeAgents[agentId].lastCommand = 'EXECUTE_SWAP';
        state.activeAgents[agentId].lastActivity = new Date().toISOString();
        this.coordinationStates.set(goalId, state);
      }
      
      // Simulate transaction creation and execution
      setTimeout(async () => {
        // Create a transaction record
        const { data: transaction } = await goalAcquisitionService.recordTransaction(
          goalId,
          'SWAP',
          'USDC',
          1000, // Example amount
          goal.selected_asset,
          400, // Example amount
          'simulated_tx_hash_' + Date.now(),
          strategy.id
        );
        
        if (transaction) {
          // Update coordination state with transaction
          const currentState = this.coordinationStates.get(goalId);
          if (currentState) {
            currentState.currentTransaction = transaction.id;
            this.coordinationStates.set(goalId, currentState);
          }
          
          // Simulate transaction confirmation after a delay
          setTimeout(async () => {
            await this.handleTransactionConfirmation(transaction.id, 'CONFIRMED');
          }, 5000); // 5 seconds delay
        }
      }, 2000); // 2 seconds delay
      
      return { data: null };
    } catch (error) {
      console.error('Error sending execution command:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Handle transaction confirmation
   */
  async handleTransactionConfirmation(
    transactionId: string,
    status: 'CONFIRMED' | 'FAILED'
  ): Promise<ApiResponse<null>> {
    try {
      // Update transaction status
      const { data: transaction, error } = await goalAcquisitionService.updateTransactionStatus(
        transactionId,
        status
      );
      
      if (error) {
        return { error };
      }
      
      if (!transaction) {
        return { error: 'Transaction not found' };
      }
      
      const goalId = transaction.goal_id;
      
      // Find the goal's coordination state
      const state = this.coordinationStates.get(goalId);
      if (!state) {
        return { error: 'No coordination state found for this goal' };
      }
      
      // Update state
      state.currentTransaction = undefined; // Clear current transaction
      
      // Record monitoring event
      await goalAcquisitionService.recordMonitoringEvent(
        goalId,
        Object.keys(state.activeAgents)[0], // Just use the first agent
        `TRANSACTION_${status}`,
        {
          transaction_id: transactionId,
          transaction_type: transaction.transaction_type,
          asset_from: transaction.asset_from,
          amount_from: transaction.amount_from,
          asset_to: transaction.asset_to,
          amount_to: transaction.amount_to
        }
      );
      
      // Get updated goal to check progress
      const { data: goal } = await goalAcquisitionService.getAcquisitionGoal(goalId);
      
      if (!goal) {
        return { error: 'Goal not found' };
      }
      
      // Check if goal is completed
      if (goal.status === 'COMPLETED') {
        await this.handleGoalCompletion(goalId);
      } else if (status === 'CONFIRMED') {
        // Continue execution if more progress needed
        // In a real implementation, you would decide whether to continue execution
        // or adapt the strategy based on market conditions
        
        // For this example, we'll continue execution if not complete
        if (goal.current_amount < goal.target_amount) {
          // Find execution agents
          const executionAgents = Object.entries(state.activeAgents)
            .filter(([_, data]) => data.role === 'EXECUTION')
            .map(([agentId]) => agentId);
          
          if (executionAgents.length > 0) {
            // Get the active strategy
            const { data: strategy } = await goalAcquisitionService.getActiveStrategy(goalId);
            
            if (strategy) {
              // Send another execution command
              await this.sendExecutionCommand(goalId, executionAgents[0], strategy, goal);
            }
          }
        }
      }
      
      return { data: null };
    } catch (error) {
      console.error('Error handling transaction confirmation:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Initiate the monitoring phase (runs concurrently with execution)
   */
  async initiateMonitoringPhase(goalId: string): Promise<ApiResponse<null>> {
    try {
      const state = this.coordinationStates.get(goalId);
      if (!state) {
        return { error: 'No coordination state found for this goal' };
      }
      
      // Find monitoring agents
      const monitoringAgents = Object.entries(state.activeAgents)
        .filter(([_, data]) => data.role === 'MONITORING')
        .map(([agentId]) => agentId);
      
      if (monitoringAgents.length === 0) {
        // If no dedicated monitoring agents, use analyst agents
        const analystAgents = Object.entries(state.activeAgents)
          .filter(([_, data]) => data.role === 'ANALYST')
          .map(([agentId]) => agentId);
        
        if (analystAgents.length > 0) {
          // Send monitoring command to first analyst agent
          this.sendMonitoringCommand(goalId, analystAgents[0]);
        }
      } else {
        // Send monitoring command to first monitoring agent
        this.sendMonitoringCommand(goalId, monitoringAgents[0]);
      }
      
      return { data: null };
    } catch (error) {
      console.error('Error initiating monitoring phase:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Send monitoring command to an agent
   */
  async sendMonitoringCommand(
    goalId: string,
    agentId: string
  ): Promise<ApiResponse<null>> {
    try {
      // In a real implementation, this would use the ElizaCommandService
      // to send the command to the specified agent
      
      // For now, we'll simulate the process
      console.log('Sending monitoring command to agent:', {
        agentId,
        goalId,
        command: 'MONITOR_MARKET_CONDITIONS'
      });
      
      // Update coordination state
      const state = this.coordinationStates.get(goalId);
      if (state && state.activeAgents[agentId]) {
        state.activeAgents[agentId].lastCommand = 'MONITOR_MARKET_CONDITIONS';
        state.activeAgents[agentId].lastActivity = new Date().toISOString();
        this.coordinationStates.set(goalId, state);
      }
      
      // In a real implementation, the agent would continuously monitor
      // For this example, we'll simulate periodic market updates
      
      // Simulate first market update
      setTimeout(() => {
        this.processMarketUpdate(goalId, agentId, {
          prices: {
            'SUI': 2.45,
            'SONIC': 0.87
          },
          volatility: 'MEDIUM',
          trend: 'STABLE',
          liquidity: 'HIGH'
        });
      }, 10000); // 10 seconds
      
      return { data: null };
    } catch (error) {
      console.error('Error sending monitoring command:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Process market update from monitoring agent
   */
  async processMarketUpdate(
    goalId: string,
    agentId: string,
    marketData: any
  ): Promise<ApiResponse<null>> {
    try {
      const state = this.coordinationStates.get(goalId);
      if (!state) {
        return { error: 'No coordination state found for this goal' };
      }
      
      // Update market conditions in state
      state.marketConditions = marketData;
      this.coordinationStates.set(goalId, state);
      
      // Record monitoring event
      await goalAcquisitionService.recordMonitoringEvent(
        goalId,
        agentId,
        'MARKET_UPDATE',
        marketData
      );
      
      // Check if adaptation is needed
      // This would be more sophisticated in a real implementation
      const shouldAdapt = this.checkIfAdaptationNeeded(goalId, marketData);
      
      if (shouldAdapt && !state.isAdapting) {
        // Trigger adaptation phase
        await this.initiateAdaptationPhase(goalId);
      }
      
      // Continue monitoring with periodic updates
      // In a real implementation, this would be more sophisticated
      setTimeout(() => {
        // Only send another update if still in execution or monitoring phase
        if (
          state.phase === 'EXECUTION' || 
          state.phase === 'MONITORING' || 
          state.phase === 'ADAPTATION'
        ) {
          // Simulate slight market changes
          const newMarketData = {
            ...marketData,
            prices: {
              'SUI': marketData.prices.SUI * (1 + (Math.random() * 0.1 - 0.05)), // +/- 5%
              'SONIC': marketData.prices.SONIC * (1 + (Math.random() * 0.1 - 0.05)) // +/- 5%
            }
          };
          
          this.processMarketUpdate(goalId, agentId, newMarketData);
        }
      }, 30000); // 30 seconds
      
      return { data: null };
    } catch (error) {
      console.error('Error processing market update:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Check if strategy adaptation is needed based on market conditions
   */
  checkIfAdaptationNeeded(goalId: string, marketData: any): boolean {
    // This is a simplified implementation
    // In a real system, you would have more sophisticated logic
    
    // Example logic: adapt if volatility is high
    if (marketData.volatility === 'HIGH') {
      return true;
    }
    
    // Example logic: adapt if there's a strong trend
    if (marketData.trend === 'STRONGLY_BULLISH' || marketData.trend === 'STRONGLY_BEARISH') {
      return true;
    }
    
    // By default, no adaptation needed
    return false;
  },
  
  /**
   * Initiate the adaptation phase
   */
  async initiateAdaptationPhase(goalId: string): Promise<ApiResponse<null>> {
    try {
      const state = this.coordinationStates.get(goalId);
      if (!state) {
        return { error: 'No coordination state found for this goal' };
      }
      
      // Set adapting flag and update phase
      state.isAdapting = true;
      state.phase = 'ADAPTATION';
      this.coordinationStates.set(goalId, state);
      
      // Record monitoring event
      await goalAcquisitionService.recordMonitoringEvent(
        goalId,
        Object.keys(state.activeAgents)[0], // Just use the first agent
        'ADAPTATION_STARTED',
        {
          reason: 'Market conditions changed significantly',
          market_conditions: state.marketConditions
        }
      );
      
      // In a real implementation, this would re-trigger the planning phase
      // with the updated market conditions
      
      // For this example, we'll just restart the planning phase
      await this.initiateAnalysisPhase(goalId);
      
      return { data: null };
    } catch (error) {
      console.error('Error initiating adaptation phase:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Handle goal completion
   */
  async handleGoalCompletion(goalId: string): Promise<ApiResponse<null>> {
    try {
      const state = this.coordinationStates.get(goalId);
      if (!state) {
        return { error: 'No coordination state found for this goal' };
      }
      
      // Update phase
      state.phase = 'COMPLETION';
      this.coordinationStates.set(goalId, state);
      
      // Record monitoring event
      await goalAcquisitionService.recordMonitoringEvent(
        goalId,
        Object.keys(state.activeAgents)[0], // Just use the first agent
        'GOAL_COMPLETED',
        {
          completion_time: new Date().toISOString()
        }
      );
      
      // Notify all agents about completion
      for (const agentId of Object.keys(state.activeAgents)) {
        // In a real implementation, this would use the ElizaCommandService
        // await elizaCommandService.sendCommand(agentId, 'NOTIFY_GOAL_COMPLETED', { goalId });
        
        console.log('Notifying agent of goal completion:', {
          agentId,
          goalId,
          command: 'NOTIFY_GOAL_COMPLETED'
        });
      }
      
      // Clean up coordination state (after a delay to allow for final processing)
      setTimeout(() => {
        this.coordinationStates.delete(goalId);
      }, 60000); // 1 minute
      
      return { data: null };
    } catch (error) {
      console.error('Error handling goal completion:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }
};
