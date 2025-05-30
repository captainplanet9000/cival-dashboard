import knowledgeService from '@/services/knowledge-service-factory';
import { ConsoleMessage, MessageCategory, MessageSource } from '@/types/elizaos.types';
import { SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

export interface CommandResult {
  success: boolean;
  message: ConsoleMessage;
  error?: string;
}

export interface CommandContext {
  supabase: SupabaseClient | null;
  userId: string | null;
  farmId: string | number;
}

export class CommandProcessor {
  private context: CommandContext;
  
  constructor(context: CommandContext) {
    this.context = context;
  }
  
  /**
   * Process a user command and generate appropriate response
   */
  async processCommand(command: string): Promise<CommandResult> {
    // Normalize command by trimming and converting to lowercase
    const normalizedCommand = command.trim().toLowerCase();
    
    try {
      // Process different command types
      if (this.isKnowledgeQuery(normalizedCommand)) {
        return await this.processKnowledgeQuery(command);
      } else if (this.isAgentAction(normalizedCommand)) {
        return await this.processAgentAction(command);
      } else if (this.isTradeCommand(normalizedCommand)) {
        return await this.processTradeCommand(command);
      } else if (this.isHelpCommand(normalizedCommand)) {
        return this.getHelpResponse();
      } else {
        // Default to general query processing
        return await this.processGeneralQuery(command);
      }
    } catch (error: any) {
      console.error("Command processing error:", error);
      return {
        success: false,
        message: this.createErrorMessage(
          "An error occurred while processing your command: " + (error.message || "Unknown error")
        ),
        error: error.message || "Unknown error"
      };
    }
  }
  
  /**
   * Determine if the command is a knowledge query
   */
  private isKnowledgeQuery(command: string): boolean {
    const knowledgeKeywords = [
      'find', 'search', 'what is', 'explain', 'tell me about',
      'document', 'knowledge', 'information', 'learn', 'research'
    ];
    
    return knowledgeKeywords.some(keyword => command.includes(keyword));
  }
  
  /**
   * Determine if the command is an agent action
   */
  private isAgentAction(command: string): boolean {
    const agentKeywords = [
      'agent', 'create agent', 'modify agent', 'delete agent',
      'activate', 'deactivate', 'run', 'execute', 'stop',
      'start trading', 'pause trading'
    ];
    
    return agentKeywords.some(keyword => command.includes(keyword));
  }
  
  /**
   * Determine if the command is a trade-related instruction
   */
  private isTradeCommand(command: string): boolean {
    const tradeKeywords = [
      'buy', 'sell', 'trade', 'order', 'position', 'entry',
      'exit', 'market', 'limit', 'stop', 'price', 'size'
    ];
    
    return tradeKeywords.some(keyword => command.includes(keyword));
  }
  
  /**
   * Determine if this is a help command
   */
  private isHelpCommand(command: string): boolean {
    return command === 'help' || command === '?' || 
           command.startsWith('help ') || 
           command.includes('command list') ||
           command.includes('available commands');
  }
  
  /**
   * Process a knowledge query by searching the knowledge base
   */
  private async processKnowledgeQuery(query: string): Promise<CommandResult> {
    // Tell the user we're searching
    const processingMessage = this.createSystemMessage(
      "Searching knowledge base for information...",
      "processing",
      "system"
    );
    
    // Perform the actual search
    const searchResult = await knowledgeService.searchKnowledge(query);
    
    if (searchResult.success && searchResult.data.length > 0) {
      // Format search results for display
      const formattedResults = this.formatKnowledgeResults(searchResult.data);
      
      const message = this.createMessage({
        content: formattedResults,
        category: "knowledge",
        source: "knowledge-base",
        sender: "elizaos",
        metadata: {
          farmId: this.context.farmId,
          query,
          resultCount: searchResult.data.length
        }
      });
      
      return {
        success: true,
        message
      };
    } else {
      // No results found
      return {
        success: false,
        message: this.createMessage({
          content: `I couldn't find any relevant information for "${query}" in the knowledge base. Try rephrasing your query or adding a new document with this information.`,
          category: "knowledge",
          source: "knowledge-base",
          sender: "elizaos"
        }),
        error: searchResult.error || "No knowledge found"
      };
    }
  }
  
  /**
   * Process an agent action command
   */
  private async processAgentAction(command: string): Promise<CommandResult> {
    // This is a placeholder - in a real implementation, this would
    // interact with the agent service to execute actions
    
    return {
      success: true,
      message: this.createMessage({
        content: `I've received your agent action request: "${command}"\n\nAgent actions are currently being implemented. In the future, you'll be able to control agents directly through this console.`,
        category: "agent",
        source: "agent-manager",
        sender: "elizaos" 
      })
    };
  }
  
  /**
   * Process a trade-related command
   */
  private async processTradeCommand(command: string): Promise<CommandResult> {
    // This is a placeholder - in a real implementation, this would
    // check trade permissions and execute trades or provide trade info
    
    return {
      success: true,
      message: this.createMessage({
        content: `I've received your trading command: "${command}"\n\nTrading actions require additional security verification. Please use the Trading Dashboard to execute trades directly.`,
        category: "trading",
        source: "trade-manager",
        sender: "elizaos"
      })
    };
  }
  
  /**
   * Process a general query by routing to appropriate service
   */
  private async processGeneralQuery(query: string): Promise<CommandResult> {
    // In a production environment, this would use an AI service to
    // interpret the command and route to appropriate handlers
    
    return {
      success: true,
      message: this.createMessage({
        content: `I received your command: "${query}"\n\nThe ElizaOS command processing system is being implemented. Soon you'll be able to use natural language to control all aspects of your trading farm.`,
        category: "response",
        source: "system",
        sender: "elizaos"
      })
    };
  }
  
  /**
   * Get help documentation
   */
  private getHelpResponse(): CommandResult {
    const helpContent = `
# ElizaOS Command Console Help

This console allows you to interact with the ElizaOS AI system using natural language commands.

## Available Command Categories:

### Knowledge Queries
- **Search knowledge base**: "find information about trading strategies"
- **Get specific document**: "show document about risk management"
- **Ask questions**: "what is dollar cost averaging?"

### Agent Management
- **Create agent**: "create a new trading agent for Bitcoin"
- **Modify agent**: "update the stop loss parameters for BTC agent"
- **Control agent**: "activate/deactivate the ETH trading agent"

### Trading Operations
- **Check positions**: "show my current positions"
- **Market information**: "what's the current price of Bitcoin?"
- **Portfolio status**: "show my portfolio performance"

### System Commands
- **help**: Show this help information
- **clear**: Clear the console

Type your commands naturally. The system will interpret your intent and respond accordingly.
    `;
    
    return {
      success: true,
      message: this.createMessage({
        content: helpContent,
        category: "system",
        source: "help",
        sender: "system"
      })
    };
  }
  
  /**
   * Format knowledge search results into readable content
   */
  private formatKnowledgeResults(results: any[]): string {
    if (results.length === 0) return "No results found.";
    
    // When we have just one highly relevant result, show more content
    if (results.length === 1 && results[0].similarity > 0.85) {
      const result = results[0];
      return `
# ${result.document?.title || 'Knowledge Result'}

${result.content}

**Source**: ${result.document?.source || 'Knowledge Base'}
**Document Type**: ${result.document?.document_type || 'Document'}
**Relevance**: ${Math.round(result.similarity * 100)}%
      `;
    }
    
    // Format multiple results as a list
    let formattedContent = `# Found ${results.length} relevant results\n\n`;
    
    results.forEach((result, index) => {
      formattedContent += `## ${index + 1}. ${result.document?.title || 'Untitled Document'}\n\n`;
      formattedContent += `${result.content.substring(0, 250)}${result.content.length > 250 ? '...' : ''}\n\n`;
      formattedContent += `**Relevance**: ${Math.round(result.similarity * 100)}%\n\n`;
    });
    
    return formattedContent;
  }
  
  /**
   * Create a system message
   */
  private createSystemMessage(
    content: string,
    category: MessageCategory = "system",
    source: MessageSource = "system"
  ): ConsoleMessage {
    return this.createMessage({
      content,
      category,
      source,
      sender: "system"
    });
  }
  
  /**
   * Create an error message
   */
  private createErrorMessage(content: string): ConsoleMessage {
    return this.createMessage({
      content,
      category: "error",
      source: "system",
      sender: "system"
    });
  }
  
  /**
   * Create a message with default values
   */
  private createMessage(params: {
    content: string;
    category: MessageCategory;
    source: MessageSource;
    sender: string;
    metadata?: Record<string, any>;
  }): ConsoleMessage {
    return {
      id: uuidv4(),
      content: params.content,
      timestamp: new Date().toISOString(),
      category: params.category,
      source: params.source,
      isUser: false,
      sender: params.sender,
      metadata: {
        ...params.metadata,
        farmId: this.context.farmId
      }
    };
  }
}
