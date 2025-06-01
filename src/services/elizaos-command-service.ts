import { ElizaCommand, ElizaCommandRepository } from '../repositories/eliza-command-repository';
import { MemoryItem, MemoryItemRepository } from '../repositories/memory-item-repository';
import { Farm } from '@/types/farm'; // Import Farm type
import { ProtocolConnectorFactory } from '../services/defi/protocol-connector-factory'; // Import the factory
import { ProtocolType, ProtocolAction } from '@/types/defi-protocol-types'; // Correct import path & import ProtocolAction
import { ProtocolConnectorInterface } from '../services/defi/protocol-connector-interface'; // Import the interface
// Remove ethers import for now
// import { ethers } from 'ethers';

// Remove placeholder DefiService
// class DefiService { ... }

/**
 * Service for handling ElizaOS command processing and memory management
 */
export class ElizaCommandService {
  private commandRepository: ElizaCommandRepository;
  private memoryRepository: MemoryItemRepository;
  // No need for defiService instance anymore, use factory directly
  
  constructor() {
    this.commandRepository = new ElizaCommandRepository();
    this.memoryRepository = new MemoryItemRepository();
    // No need to instantiate placeholder DefiService
  }
  
  /**
   * Execute a command and return the response
   */
  async executeCommand(
    command: string,
    source: ElizaCommand['source'],
    agentId?: string,
    farmId?: string,
    context: Record<string, any> = {}
  ): Promise<ElizaCommand | null> {
    // Create initial command record
    const startTime = Date.now();
    
    const commandRecord = await this.commandRepository.createCommand({
      command,
      source,
      agent_id: agentId,
      farm_id: farmId,
      context,
      status: 'processing'
    });
    
    if (!commandRecord) {
      console.error('Failed to create command record');
      return null;
    }
    
    try {
      // Process command (this is a placeholder for actual command processing logic)
      // In a real implementation, this might call an external API or run a model
      const response = await this.processCommand(command, context);
      
      // Calculate processing time
      const processingTime = Date.now() - startTime;
      
      // Update command record with response
      const updatedCommand = await this.commandRepository.updateStatus(
        commandRecord.id,
        'completed',
        response,
        processingTime
      );
      
      // If command was successful and had agent_id, store in agent's memory
      if (updatedCommand && agentId && response) {
        await this.storeCommandInMemory(updatedCommand, agentId);
      }
      
      return updatedCommand;
    } catch (error) {
      // Update command record with error
      const errorResponse = {
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      };
      
      const processingTime = Date.now() - startTime;
      
      return await this.commandRepository.updateStatus(
        commandRecord.id,
        'failed',
        errorResponse,
        processingTime
      );
    }
  }
  
  /**
   * Get a specific command by its ID.
   * @param commandId - The ID of the command to retrieve.
   */
  async getCommandById(commandId: string): Promise<ElizaCommand | null> {
    // Assuming ElizaCommandRepository has a getById method
    try {
      const command = await this.commandRepository.getById(commandId);
      return command || null;
    } catch (error) {
      console.error(`Failed to get command ${commandId}:`, error);
      return null;
    }
  }
  
  /**
   * Get command history for an agent
   */
  async getCommandHistory(
    agentId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<ElizaCommand[]> {
    return this.commandRepository.getByAgentId(agentId, {
      limit,
      offset,
      orderBy: 'created_at',
      orderDirection: 'desc'
    });
  }
  
  /**
   * Get command history for a farm
   */
  async getFarmCommandHistory(
    farmId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<ElizaCommand[]> {
    return this.commandRepository.getByFarmId(farmId, {
      limit,
      offset,
      orderBy: 'created_at',
      orderDirection: 'desc'
    });
  }
  
  /**
   * Search agent memories
   */
  async searchAgentMemories(
    agentId: string,
    query: string,
    limit: number = 10
  ) {
    return this.memoryRepository.searchMemories(agentId, query, limit);
  }
  
  /**
   * Store a memory item for an agent
   */
  async storeMemory(
    agentId: string,
    content: string,
    type: MemoryItem['type'],
    importance: number,
    metadata: Record<string, any> = {},
    expiresInDays?: number
  ): Promise<MemoryItem | null> {
    const expiresAt = expiresInDays 
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : undefined;
      
    return this.memoryRepository.createMemoryItem({
      agent_id: agentId,
      content,
      type,
      importance,
      metadata,
      expires_at: expiresAt
    });
  }
  
  /**
   * Process a command (placeholder implementation)
   */
  private async processCommand(
    command: string,
    context: Record<string, any>
  ): Promise<Record<string, any>> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500)); // Restore normal delay
    
    const lowerCommand = command.toLowerCase();
    const farmGoal = context?.goal as Farm | undefined;

    // --- Analysis & Strategy Proposal Command Handling ---
    if (lowerCommand.startsWith('analyze and propose') && farmGoal) {
        console.log("Processing ANALYSIS/PROPOSAL command:", command);
        
        // Simulate analysis
        const targetAssets = farmGoal.goal_target_assets || [];
        const targetAmount = farmGoal.goal_target_amount || 0;
        let chosenAsset: string | null = null;
        let estimatedCost = 0;
        let proposedAction = '';
        let details: any = {};

        // Mock analysis: choose first asset, assume swap from USDC on Uniswap (available connector)
        if (targetAssets.length > 0) {
            chosenAsset = targetAssets[0]; 
            const mockPrice = 0.5 + Math.random(); 
            estimatedCost = targetAmount * mockPrice;
            proposedAction = 'SWAP';
            details = {
                action: 'SWAP',
                fromAsset: 'USDC', 
                toAsset: chosenAsset,
                amount: estimatedCost * 0.2, 
                estimatedTotalCost: estimatedCost,
                dex: 'Uniswap' // Use Uniswap as it has a connector
            };
        } else {
             console.error('No target assets defined in goal for analysis.');
              return {
                 type: 'ANALYSIS_FAILURE',
                 data: { reason: 'No target assets specified in the goal context.' },
                 success: false,
                 error: 'Missing target assets in goal'
              };
        }

        return {
             type: 'STRATEGY_PROPOSAL',
             data: {
                 summary: `Proposal: Target ${chosenAsset}. Recommend ${proposedAction} via ${details.dex}. Estimated total cost: ${estimatedCost.toFixed(2)} ${details.fromAsset}. Initial step: ${details.action} ${details.amount.toFixed(2)} ${details.fromAsset} for ${chosenAsset}.`,
                 strategy: details // The actionable strategy part for the coordinator
             },
             success: true
        };
    }

    // --- Swap Command Handling --- 
    const swapMatch = command.match(/execute swap: (\d+(\.\d+)?) (\w+) to (\w+) on (\w+)/i);
    if (swapMatch) {
        console.log("Processing SWAP command:", command);
        const [, amountStr, , fromAsset, toAsset, dex] = swapMatch;
        const amount = parseFloat(amountStr);

        // TODO: Wallet Security - Securely get wallet/signer for the farm/agent
        // const signer = getSignerForFarm(farmGoal?.id); // Replace placeholder below
        const signer = null; // Placeholder - No signer for now
        
        try {
            // Map DEX name string to ProtocolType enum
            let protocolType: ProtocolType;
            switch (dex.toUpperCase()) {
                case 'UNISWAP': protocolType = ProtocolType.UNISWAP; break;
                case 'GMX': protocolType = ProtocolType.GMX; break;
                case 'SUSHISWAP': protocolType = ProtocolType.SUSHISWAP; break;
                // Add other supported DEX/Protocols here
                default:
                    throw new Error(`Unsupported DEX/Protocol specified in command: ${dex}`);
            }
            
            // TODO: Determine correct chainId for the swap
            const chainId = 1; // Placeholder (e.g., Ethereum mainnet)

            // Get the connector instance
            const connector: ProtocolConnectorInterface = await ProtocolConnectorFactory.getConnector(protocolType, chainId);
            
            // TODO: Connect wallet/signer properly if needed by the connector
            // await ProtocolConnectorFactory.connectWallet(protocolType, chainId); 

            console.log(`Attempting swap via ${protocolType} connector using executeAction...`);

            // Define the action parameters for the swap
            const actionParams = {
                fromToken: fromAsset, 
                toToken: toAsset,
                amount: amount.toString(), 
                signer: signer, // Pass null for now, needs real implementation
                slippageTolerance: 0.005 // Example: 0.5%
                // Add other necessary params based on specific connector needs
            };

            // Execute the swap using the generic executeAction method
            // Assume ProtocolAction has a relevant action type like 'SWAP'
            const swapResult = await connector.executeAction(ProtocolAction.SWAP, actionParams);

            // Process swapResult (assuming it has { success: boolean, transactionHash?: string, error?: string })
            if (swapResult.success) {
                 return {
                    type: 'EXECUTION_CONFIRMATION',
                    data: { 
                        action: 'SWAP',
                        amount: amount,
                        asset: toAsset, 
                        fromAsset: fromAsset,
                        dex: dex,
                        transactionHash: swapResult.transactionHash,
                        message: `Successfully executed swap of ${amount} ${fromAsset} to ${toAsset} on ${dex}.`
                    },
                    success: true
                 };
            } else {
                 console.error(`Swap execution failed via ${protocolType}: ${swapResult.error}`);
                 return {
                    type: 'EXECUTION_FAILURE',
                    data: { action: 'SWAP', reason: swapResult.error || `Unknown ${protocolType} error` },
                    success: false,
                    error: swapResult.error || `Unknown ${protocolType} error`
                 };
            }
        } catch (error: any) {
             console.error(`Error during swap execution via connector: ${error.message}`);
             return {
                type: 'EXECUTION_FAILURE',
                data: { action: 'SWAP', reason: error.message || 'Error executing swap via connector' },
                success: false,
                error: error.message || 'Error executing swap via connector'
             };
        }
    }

    // --- Existing Mock Handlers --- 
    if (lowerCommand.includes('market') && lowerCommand.includes('data')) {
      return {
        type: 'market_data',
        data: {
          BTC: { price: 50000 + Math.random() * 1000, change: Math.random() * 5 - 2.5 },
          ETH: { price: 3000 + Math.random() * 200, change: Math.random() * 5 - 2.5 },
          SOL: { price: 100 + Math.random() * 10, change: Math.random() * 6 - 3 },
        },
        success: true
      };
    } else if (lowerCommand.includes('portfolio') || lowerCommand.includes('balance')) {
      return {
        type: 'portfolio',
        data: {
          total_value: 125000 + Math.random() * 5000,
          assets: [
            { symbol: 'BTC', amount: 0.5, value: 25000 + Math.random() * 500 },
            { symbol: 'ETH', amount: 10, value: 30000 + Math.random() * 2000 },
            { symbol: 'SOL', amount: 200, value: 20000 + Math.random() * 1000 },
            { symbol: 'USD', amount: 50000, value: 50000 }
          ]
        },
        success: true
      };
    } else if (lowerCommand.includes('create') && lowerCommand.includes('trade')) {
      return {
        type: 'trade_request',
        data: {
          request_id: `trade-${Date.now()}`,
          status: 'pending',
          message: 'Trade request created and is being processed'
        },
        success: true
      };
    } else if (lowerCommand.includes('performance') || lowerCommand.includes('stats')) {
      return {
        type: 'performance',
        data: {
          daily_return: Math.random() * 4 - 2,
          weekly_return: Math.random() * 10 - 5,
          monthly_return: Math.random() * 20 - 8,
          yearly_return: Math.random() * 40 - 10,
          trades_count: Math.floor(Math.random() * 100) + 50,
          win_rate: Math.random() * 30 + 55, // 55-85%
        },
        success: true
      };
    } else {
      // Default response for unknown commands
      return {
        type: 'general',
        data: {
          message: `I processed your command: "${command}" but I'm not sure what to do with it.`,
          suggestions: [
            'Try asking for market data',
            'Ask about your portfolio balance',
            'Request performance statistics',
            'Create a trade'
          ]
        },
        success: true
      };
    }

    // Fallback if no other handler matched (should ideally be covered by default general response)
     return {
        type: 'general',
        data: {
          message: `Command processed: "${command}", but no specific action taken.`,
        },
        success: true
      };
  }
  
  /**
   * Store a command and its response in agent memory.
   * Made public to allow AgentCoordinationService to store arbitrary relevant info.
   */
  public async storeCommandInMemory(command: ElizaCommand, agentId: string): Promise<void> {
    const { response } = command;
    
    if (!response || typeof response !== 'object') {
      return;
    }
    
    try {
      // Store the command and response as an observation
      await this.memoryRepository.createMemoryItem({
        agent_id: agentId,
        content: `Command "${command.command}" produced response: ${JSON.stringify(response)}`,
        type: 'observation',
        importance: 5, // Medium importance
        metadata: {
          command_id: command.id,
          command_type: response.type || 'unknown',
          timestamp: new Date().toISOString()
        },
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // Expire after 30 days
      });
      
      // For certain types of responses, create additional memory items
      if (response.type === 'market_data' && response.data) {
        // Create insights based on market data
        const marketData = response.data;
        const keyInsights = Object.entries(marketData)
          .filter(([_, data]: [string, any]) => Math.abs(data.change) > 3)
          .map(([symbol, data]: [string, any]) => 
            `${symbol} has shown significant ${data.change > 0 ? 'positive' : 'negative'} movement: ${data.change.toFixed(2)}%`
          );
          
        if (keyInsights.length > 0) {
          await this.memoryRepository.createMemoryItem({
            agent_id: agentId,
            content: `Market insights: ${keyInsights.join('. ')}`,
            type: 'insight',
            importance: 7, // Higher importance for significant market movements
            metadata: {
              command_id: command.id,
              market_data: keyInsights,
              timestamp: new Date().toISOString()
            }
          });
        }
      }
    } catch (error) {
      console.error('Failed to store command in memory', error);
    }
  }
} 