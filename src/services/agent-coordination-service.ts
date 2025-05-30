import { farmService, FarmService, Farm, FarmAgent } from './farm/farm-service';
import { ElizaCommandService } from './elizaos-command-service';
import { ApiResponse } from './database/supabase-service'; // Assuming ApiResponse is centrally defined
import { UnifiedBankingService } from './unifiedBankingService'; // Add import

/**
 * Service responsible for coordinating agents within a farm to achieve a specific goal.
 */
export class AgentCoordinationService {
  private farmService: FarmService;
  private elizaService: ElizaCommandService;
  private bankingService: UnifiedBankingService; // Add bankingService instance
  private static instance: AgentCoordinationService;

  private constructor() {
    this.farmService = FarmService.getInstance();
    this.elizaService = new ElizaCommandService();
    this.bankingService = UnifiedBankingService.getInstance(); // Initialize bankingService
  }

  // Get singleton instance
  public static getInstance(): AgentCoordinationService {
    if (!AgentCoordinationService.instance) {
      AgentCoordinationService.instance = new AgentCoordinationService();
    }
    return AgentCoordinationService.instance;
  }

  /**
   * Starts or restarts the workflow for a farm's active goal.
   * Fetches farm details, goal, and agents, then initiates the planning phase.
   * @param farmId - The ID of the farm.
   */
  async activateFarmGoalWorkflow(farmId: number | string): Promise<ApiResponse<null>> {
    console.log(`Activating goal workflow for farm ${farmId}...`);
    try {
      // 1. Fetch farm details including the active goal
      const farmResponse = await this.farmService.getFarmById(farmId);
      if (!farmResponse.success || !farmResponse.data) {
        return { success: false, error: `Farm ${farmId} not found or failed to fetch.` };
      }
      const farm = farmResponse.data;

      // 2. Check if there is an active goal
      if (!farm.goal_status || farm.goal_status !== 'active' || !farm.goal_target_assets || !farm.goal_target_amount) {
        console.log(`Farm ${farmId} does not have an active goal defined.`);
        return { success: true, data: null }; // Not an error, just nothing to activate
      }
      
      // 3. Fetch agents associated with the farm
      const agentsResponse = await this.farmService.getAgents(farmId);
      if (!agentsResponse.success || !agentsResponse.data || agentsResponse.data.length === 0) {
        return { success: false, error: `No agents found for farm ${farmId}. Cannot activate goal.` };
      }
      const agents = agentsResponse.data;

      // 4. Identify lead/analysis agent(s) - simplistic approach for now
      // In a real system, agent roles/types would be more defined
      const analysisAgent = agents.find(agent => agent.type?.toLowerCase().includes('analysis') || agent.type === 'PLANNER'); // Example type matching
      
      if (!analysisAgent) {
         return { success: false, error: `No suitable analysis/planning agent found for farm ${farmId}.` };
      }

      // 5. Issue planning command to the analysis agent
      const goalDescription = farm.goal_description || `Achieve ${farm.goal_target_amount} of ${farm.goal_target_assets.join(' or ')}`;
      const command = `Analyze and propose the best strategy to achieve the current farm goal: "${farm.goal_name || goalDescription}". Current farm assets need assessment (check balances/wallets). Target: ${farm.goal_target_amount} ${farm.goal_target_assets.join('/')}. Deadline: ${farm.goal_deadline || 'N/A'}.`;
      
      console.log(`Issuing planning command to agent ${analysisAgent.id} for farm ${farmId}`);
      
      // We don't await the command execution here, it runs async. 
      // Responses would be handled via webhooks, polling, or another mechanism.
      this.elizaService.executeCommand(
         command, 
         'system', // Source is the coordination service
         analysisAgent.id.toString(), // Assuming agentId is needed as string
         farmId.toString(), // Assuming farmId is needed as string
         { goal: farm } // Provide goal context
      ); 

      return { success: true, data: null };

    } catch (error: any) {
      console.error(`Error activating goal workflow for farm ${farmId}:`, error);
      return { success: false, error: error.message || 'Failed to activate goal workflow.' };
    }
  }

  /**
   * Handles responses received from agents (e.g., analysis results, execution status).
   * This would typically be called by a webhook or polling mechanism monitoring ElizaCommand results.
   * @param agentId - ID of the agent responding.
   * @param commandId - ID of the command being responded to.
   * @param response - The response data from the agent.
   */
  async handleAgentResponse(agentId: string, commandId: string, response: any): Promise<void> {
      console.log(`Handling response from agent ${agentId} for command ${commandId}`);
      
      // Fetch the original command to understand its context
      // Assuming elizaService has a method like getCommandById
      const commandRecord = await this.elizaService.getCommandById(commandId); 
      if (!commandRecord) {
          console.error(`Original command ${commandId} not found.`);
          return;
      }
      
      const farmId = commandRecord.farm_id;
      if (!farmId) {
           console.error(`Command ${commandId} does not have an associated farm ID.`);
          return;
      }

      // --- Response Parsing Logic --- 
      // This is highly dependent on how agents structure their responses.
      // We'll use a hypothetical structure here.
      
      const responseType = response?.type; // e.g., 'STRATEGY_PROPOSAL', 'EXECUTION_CONFIRMATION', 'ANALYSIS_UPDATE'
      const responseData = response?.data;
      const responseSuccess = response?.success;

      if (!responseSuccess) {
           console.error(`Agent ${agentId} reported failure for command ${commandId}. Error: ${response?.error || 'Unknown error'}`);
           // TODO: Implement more nuanced failure handling:
           // - Check if the error is retryable.
           // - Increment failure count for the agent/task.
           // - Potentially try assigning task to a different agent.
           // - Trigger replan only after exceeding retry limits or for critical failures.
           await this.triggerReplan(farmId, `Agent ${agentId} failed on command ${commandId}`);
           return;
      }

      switch (responseType) {
          case 'STRATEGY_PROPOSAL':
              console.log(`Received strategy proposal from agent ${agentId} for farm ${farmId}`);
              if (!responseData?.strategy) {
                   console.error('Strategy proposal response is missing strategy data.');
                   await this.triggerReplan(farmId, `Agent ${agentId} provided invalid strategy proposal.`);
                   return;
              }
              // TODO: Add logic for strategy validation or user approval step if needed
              // For now, assume automatic approval and proceed to execution
              await this.coordinateStrategyExecution(farmId, responseData.strategy);
              break;

          case 'EXECUTION_CONFIRMATION':
              console.log(`Received execution confirmation from agent ${agentId} for farm ${farmId}`);
              if (!responseData?.asset || responseData?.amount === undefined || responseData?.transactionHash === undefined) {
                   console.error('Execution confirmation response is missing required data (asset, amount, transactionHash).');
                   // Don't necessarily replan, could be a reporting issue, but log it.
                   return;
              }
              // Note: We rely on handleTransactionConfirmation (called by TransactionMonitor) 
              // to update goal progress based on the *actual* on-chain event, 
              // not just the agent's report. This confirmation is more for logging/internal state.
              console.log(`Agent ${agentId} confirmed execution for ${responseData.amount} ${responseData.asset}, txHash: ${responseData.transactionHash}`);
              // Optionally store this confirmation or link it to the transaction monitor job
              break;
              
          case 'EXECUTION_FAILURE':
              console.error(`Execution failed for agent ${agentId} on farm ${farmId}. Reason: ${response?.error || responseData?.reason || 'Unknown execution error'}`);
              // Trigger replan because the execution step failed
              await this.triggerReplan(farmId, `Execution failed: ${response?.error || responseData?.reason}`);
              break;

          case 'ANALYSIS_UPDATE':
               console.log(`Received analysis update from agent ${agentId} for farm ${farmId}:`, responseData);
               // Store insights using storeMemory
               if (responseData?.insights && Array.isArray(responseData.insights) && responseData.insights.length > 0) {
                    const insightsContent = `Analysis insights: ${responseData.insights.join('. ')}`;
                    await this.elizaService.storeMemory(
                        agentId, 
                        insightsContent,
                        'insight', // Memory type
                        6, // Importance level (adjust as needed)
                        { command_id: commandId, farm_id: farmId, timestamp: new Date().toISOString() }
                    );
                    console.log(`Stored insights for agent ${agentId}`);
               } else if (responseData?.message) {
                    // Store general message if no specific insights
                     await this.elizaService.storeMemory(
                        agentId, 
                        `Agent provided analysis update: ${responseData.message}`,
                        'observation',
                        4, 
                        { command_id: commandId, farm_id: farmId, timestamp: new Date().toISOString() }
                    );
               }
               
               // TODO: Implement logic to decide if this analysis triggers a replan
               // Example: Check for specific keywords or sentiment
               const shouldReplan = responseData?.flags?.includes('REPLAN_RECOMMENDED') || responseData?.marketSentiment === 'highly_volatile';
               if (shouldReplan) {
                   console.log(`Analysis update from agent ${agentId} triggers replan.`);
                   await this.triggerReplan(farmId, `Replan triggered by analysis update from agent ${agentId}`);
               }
               break;
               
          default:
              console.warn(`Received unhandled response type "${responseType || '(missing type)'}" from agent ${agentId} for command ${commandId}. Response:`, response);
              // Store the response in agent memory anyway
              if (commandRecord && response) {
                   await this.elizaService.storeCommandInMemory(commandRecord, agentId);
              }
      }
  }

  /**
   * Coordinates the execution phase based on the selected strategy.
   * Issues specific tasks (e.g., trades) to execution agents.
   * @param farmId - The ID of the farm.
   * @param strategy - The strategy details decided upon (hypothetical structure).
   */
  async coordinateStrategyExecution(farmId: number | string, strategy: any): Promise<void> {
      console.log(`Coordinating strategy execution for farm ${farmId} using strategy:`, strategy);

      try {
          // 1. Fetch relevant execution agents for the farm
          const agentsResponse = await this.farmService.getAgents(farmId);
          if (!agentsResponse.success || !agentsResponse.data) {
              console.error(`Failed to fetch agents for farm ${farmId} during execution.`);
              return;
          }
          // Example: Find agents with 'TRADING' or 'EXECUTION' type
          const executionAgents = agentsResponse.data.filter(agent => 
              agent.type?.toUpperCase() === 'TRADING' || agent.type?.toUpperCase() === 'EXECUTION'
          );

          if (executionAgents.length === 0) {
              console.error(`No suitable execution agent found for farm ${farmId}.`);
              // TODO: Alert user or trigger agent creation/assignment
              return;
          }
          // Select an agent (e.g., the first one, or based on load/specialization)
          const executionAgent = executionAgents[0]; 

          // 2. Break down the strategy into actionable commands
          if (strategy?.action === 'SWAP' && strategy.fromAsset && strategy.toAsset && strategy.amount && strategy.dex) {
             
              // 3. Check available balances via UnifiedBankingService before issuing trade commands.
              console.log(`Checking balance for ${strategy.amount} ${strategy.fromAsset} on farm ${farmId}...`);
              
              const balanceCheck = await this.bankingService.checkFarmBalance(farmId, strategy.fromAsset, strategy.amount);
              
              if (!balanceCheck.sufficient) { 
                 console.error(`Insufficient balance of ${strategy.fromAsset} (Available: ${balanceCheck.availableAmount}) for farm ${farmId} to execute strategy.`); 
                 await this.triggerReplan(farmId, `Insufficient funds (${strategy.fromAsset}) for swap.`);
                 return; 
              }
              console.log(`Balance sufficient (Available: ${balanceCheck.availableAmount} ${strategy.fromAsset}). Proceeding with command.`);

              // 4. Issue command via elizaService.executeCommand
              const command = `Execute swap: ${strategy.amount} ${strategy.fromAsset} to ${strategy.toAsset} on ${strategy.dex}. Max slippage: 0.5%.`;
              
              console.log(`Issuing execution command to agent ${executionAgent.id}: "${command}"`);
              
              // Again, run async. Confirmation comes via handleAgentResponse / handleTransactionConfirmation
              this.elizaService.executeCommand(
                 command, 
                 'system', 
                 executionAgent.id.toString(), 
                 farmId.toString(), 
                 { strategyDetails: strategy } // Provide context
              );
          } else {
              console.error(`Strategy format not recognized or incomplete for farm ${farmId}:`, strategy);
              // TODO: Trigger replan or alert
              await this.triggerReplan(farmId, 'Invalid strategy format received from analysis agent.');
          }

      } catch (error: any) {
          console.error(`Error coordinating strategy execution for farm ${farmId}. Strategy: ${JSON.stringify(strategy)}`, error);
          // TODO: Handle error (e.g., trigger replan, alert)
           await this.triggerReplan(farmId, `Error during strategy execution coordination: ${error.message}`);
      }
  }
  
  /**
   * Handles confirmation of an on-chain transaction relevant to the goal.
   * Typically called by the TransactionMonitor service.
   * @param farmId - The ID of the farm the transaction belongs to.
   * @param asset - The asset symbol involved (e.g., 'SUI').
   * @param amount - The amount gained/lost relevant to the goal progress.
   */
  async handleTransactionConfirmation(farmId: number | string, asset: string, amount: number): Promise<void> {
      console.log(`Handling transaction confirmation for farm ${farmId}: ${amount} ${asset}`);
      
      // Update the goal progress
      const progressResult = await this.farmService.updateFarmGoalProgress(farmId, asset, amount);
      
      if (!progressResult.success) {
          console.error(`Failed to update goal progress for farm ${farmId} after transaction confirmation:`, progressResult.error);
          // TODO: Add potential retry or alert logic
      } else {
           console.log(`Goal progress updated successfully for farm ${farmId}.`);
           // Note: Goal completion check and action execution is handled within farmService.updateFarmGoalProgress/completeFarmGoal
      }
  }

  /**
   * Initiates a replanning phase, usually triggered by market changes or poor performance.
   * @param farmId - The ID of the farm needing replanning.
   * @param reason - The reason for replanning (e.g., "Market volatility", "Strategy underperforming").
   */
  async triggerReplan(farmId: number | string, reason: string): Promise<void> {
      console.log(`Triggering replan for farm ${farmId} due to: ${reason}`);
      
      try {
           // 1. Fetch analysis/planning agents for the farm.
           const agentsResponse = await this.farmService.getAgents(farmId);
            if (!agentsResponse.success || !agentsResponse.data) {
                console.error(`Failed to fetch agents for farm ${farmId} during replan trigger.`);
                return;
            }
            const analysisAgent = agentsResponse.data.find(agent => 
                agent.type?.toLowerCase().includes('analysis') || agent.type === 'PLANNER'
            );

            if (!analysisAgent) {
                 console.error(`No suitable analysis/planning agent found for farm ${farmId} to handle replan.`);
                 // TODO: Alert user?
                 return;
            }

           // 2. Issue a new analysis command via elizaService, providing the reason and current context.
           const command = `Re-evaluate strategy for current goal on farm ${farmId}. Reason: ${reason}. Provide new recommendations based on current market conditions and farm state.`;
           
           console.log(`Issuing replan command to agent ${analysisAgent.id}: "${command}"`);
           
           this.elizaService.executeCommand(
                command, 
                'system', 
                analysisAgent.id.toString(), 
                farmId.toString(), 
                { replanReason: reason } // Provide context
            );
            
           // 3. Optionally pause the current goal while replanning
           console.log(`Pausing current goal for farm ${farmId} during replan.`);
           await this.farmService.pauseFarmGoal(farmId);

      } catch (error: any) {
          console.error(`Error triggering replan for farm ${farmId}. Reason: ${reason}.`, error);
           // TODO: More robust error handling (e.g., alert admin)
      }
  }

}

// Export singleton instance
export const agentCoordinationService = AgentCoordinationService.getInstance(); 