import { ElizaCommand, ElizaCommandRepository } from '../repositories/eliza-command-repository';
import { MemoryItem, MemoryItemRepository } from '../repositories/memory-item-repository';

/**
 * Service for handling ElizaOS command processing and memory management
 */
export class ElizaCommandService {
  private commandRepository: ElizaCommandRepository;
  private memoryRepository: MemoryItemRepository;
  
  constructor() {
    this.commandRepository = new ElizaCommandRepository();
    this.memoryRepository = new MemoryItemRepository();
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
   * In real implementation, this would call a language model or other service
   */
  private async processCommand(
    command: string,
    context: Record<string, any>
  ): Promise<Record<string, any>> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Simple command parser for demonstration
    const lowerCommand = command.toLowerCase();
    
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
  }
  
  /**
   * Store a command and its response in agent memory
   */
  private async storeCommandInMemory(command: ElizaCommand, agentId: string): Promise<void> {
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