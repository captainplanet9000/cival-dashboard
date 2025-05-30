/**
 * ElizaOS Messaging Adapter
 * 
 * This adapter bridges the old messaging service API with the new ElizaOS agent service,
 * ensuring compatibility while allowing gradual migration to the new service.
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  elizaOSAgentService, 
  ElizaAgent, 
  ElizaAgentCommand 
} from '@/services/elizaos-agent-service';
import { createBrowserClient } from '@/utils/supabase/client';

// Types from the old messaging service that we need to maintain compatibility with
export type MessageSourceType = 'knowledge-base' | 'market-data' | 'strategy' | 'system' | 'user' | 'tool' | 'exchange';
export type MessageCategoryType = 'command' | 'query' | 'analysis' | 'alert' | 'status';

export interface AgentMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  recipient_id: string | null;
  content: string;
  message_type: 'broadcast' | 'direct' | 'command' | 'status' | 'query' | 'analysis' | 'alert';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: string;
  read: boolean;
  metadata: {
    intent?: string;
    action_required?: boolean;
    tags?: string[];
    related_trades?: string[];
    source?: 'knowledge-base' | 'market-data' | 'strategy' | 'system';
    is_response?: boolean;
    response_text?: string;
    [key: string]: any;
  };
  parent_message_id?: string | null;
  status?: string;
  requires_response?: boolean;
}

export interface AgentCommunicationResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: any;
}

export type CommandResponseType = 'COMMAND_RESPONSE' | 'KNOWLEDGE_RESPONSE' | 'SYSTEM_RESPONSE' | 'ERROR_RESPONSE' | 'TRADE_EXECUTION' | 'MARKET_DATA' | 'TOOL_EXECUTION';

export interface ElizaCommandResponse {
  id: string;
  agentId: string;
  type: CommandResponseType;
  content: string;
  category: AgentMessage['message_type'];
  source: MessageSourceType;
  metadata?: any;
  timestamp: string;
}

/**
 * Adapter class that implements the old messaging service API 
 * but uses the new ElizaOS agent service internally
 */
class ElizaOSMessagingAdapter {
  /**
   * Send a message directly to an agent
   */
  async sendMessage(
    senderId: string,
    recipientId: string | null,
    content: string,
    messageType: AgentMessage['message_type'] = 'direct',
    priority: AgentMessage['priority'] = 'medium',
    metadata: AgentMessage['metadata'] = {}
  ): Promise<AgentCommunicationResponse> {
    try {
      // Format as a command if sending to an agent
      if (recipientId && messageType === 'command') {
        return this.sendElizaCommand(recipientId, content, metadata);
      }
      
      // For other message types, use the messaging API
      const message = {
        id: uuidv4(),
        sender_id: senderId,
        sender_name: 'Agent ' + senderId,
        recipient_id: recipientId,
        content,
        message_type: messageType,
        priority,
        timestamp: new Date().toISOString(),
        read: false,
        metadata
      };
      
      const response = await fetch('/api/agents/communication', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data: data
      };
    } catch (error: any) {
      console.error('Error sending agent message:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Broadcast a message to all agents in a farm
   */
  async broadcastToFarm(
    senderId: string,
    farmId: string,
    content: string,
    priority: AgentMessage['priority'] = 'medium',
    metadata: AgentMessage['metadata'] = {}
  ): Promise<AgentCommunicationResponse> {
    return this.sendMessage(
      senderId,
      null,
      content,
      'broadcast',
      priority,
      { ...metadata, farm_id: farmId }
    );
  }

  /**
   * Get messages for an agent
   */
  async getMessagesForAgent(
    agentId: string,
    limit: number = 50,
    includeRead: boolean = false
  ): Promise<AgentCommunicationResponse> {
    try {
      // Use the ElizaOS agent command history as a fallback for messages
      try {
        const commands = await elizaOSAgentService.getAgentCommands(agentId, limit);
        
        // Convert commands to message format
        const messages = commands.map((cmd: ElizaAgentCommand) => ({
          id: cmd.id,
          sender_id: 'user', // Assume the command was sent by a user
          sender_name: 'User',
          recipient_id: cmd.agent_id,
          content: cmd.command_text,
          message_type: cmd.command_text.startsWith('?') ? 'query' : 'command',
          priority: 'medium',
          timestamp: cmd.created_at,
          read: true,
          metadata: {
            source: 'user',
            is_response: false,
            response_text: cmd.response_text || '',
            status: cmd.status,
            execution_time_ms: cmd.execution_time_ms || 0,
            ...(cmd.metadata || {})
          }
        }));
        
        return {
          success: true,
          data: messages
        };
      } catch (serviceError: any) {
        // Fallback to regular API if ElizaOS service fails
        const url = `/api/agents/communication?agentId=${agentId}&limit=${limit}&includeRead=${includeRead}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        
        return {
          success: true,
          data: data.messages || []
        };
      }
    } catch (error: any) {
      console.error('Error fetching agent messages:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Mark a message as read
   */
  async markAsRead(messageId: string): Promise<AgentCommunicationResponse> {
    try {
      const response = await fetch(`/api/agents/communication/${messageId}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      return {
        success: true
      };
    } catch (error: any) {
      console.error('Error marking message as read:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send a command to an ElizaOS agent
   * Handles natural language processing for commands and queries
   */
  async sendElizaCommand(
    agentId: string,
    command: string,
    context: Record<string, any> = {}
  ): Promise<AgentCommunicationResponse> {
    try {
      // Determine the type of command
      const isCommandFormat = command.startsWith('/');
      let commandText: string;
      
      if (isCommandFormat) {
        // Strip the leading / for command format
        commandText = command.substring(1);
      } else {
        // Process as a message rather than a command
        // Add context about the message type based on content
        const category = 
          command.endsWith('?') ? 'query' :
          command.toLowerCase().includes('analyze') ? 'analysis' :
          'command';
        commandText = `[${category}] ${command}`;
      }
      
      try {
        // Use the ElizaOS agent service to send the command
        const commandResult = await elizaOSAgentService.addAgentCommand(agentId, commandText);
        
        // Return a standardized response
        return {
          success: true,
          data: {
            id: commandResult.id,
            content: commandResult.command_text,
            response: commandResult.response_text || '',
            status: commandResult.status,
            timestamp: commandResult.created_at
          }
        };
      } catch (serviceError: any) {
        return {
          success: false,
          error: serviceError.message || 'Failed to send command'
        };
      }
    } catch (error: any) {
      console.error('Error sending ElizaOS command:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Query the agent's knowledge base
   */
  async queryKnowledgeBase(
    agentId: string,
    query: string,
    filters: Record<string, any> = {}
  ): Promise<AgentCommunicationResponse> {
    try {
      // Use the ElizaOS agent command system for knowledge queries
      const commandText = `?knowledge: ${query}`;
      
      try {
        const commandResult = await elizaOSAgentService.addAgentCommand(agentId, commandText);
        
        // Format the knowledge results
        return {
          success: true,
          data: {
            id: commandResult.id,
            query: query,
            results: commandResult.response_text ? [{ content: commandResult.response_text }] : [],
            timestamp: commandResult.created_at
          }
        };
      } catch (serviceError: any) {
        console.error('Service error querying knowledge base:', serviceError);
        return {
          success: false,
          error: serviceError.message || 'Failed to query knowledge base'
        };
      }
    } catch (error: any) {
      console.error('Error querying knowledge base:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get conversation history for the agent
   */
  async getElizaMessages(
    agentId: string,
    limit: number = 50
  ): Promise<AgentCommunicationResponse> {
    try {
      // Get the agent's recent commands
      try {
        const commands = await elizaOSAgentService.getAgentCommands(agentId, limit);
        
        // Map the commands to message format for the UI
        const messages = commands.map((cmd: ElizaAgentCommand) => ({
          id: cmd.id,
          sender_id: 'user', // Assume the command was sent by a user
          sender_name: 'User',
          recipient_id: cmd.agent_id,
          content: cmd.command_text,
          message_type: cmd.command_text.startsWith('?') ? 'query' : 'command',
          priority: 'medium',
          timestamp: cmd.created_at,
          read: true,
          metadata: {
            source: 'user',
            is_response: false,
            response_text: cmd.response_text || '',
            status: cmd.status,
            execution_time_ms: cmd.execution_time_ms || 0,
            ...(cmd.metadata || {})
          }
        }));
        
        return {
          success: true,
          data: messages
        };
      } catch (serviceError: any) {
        return {
          success: false,
          error: serviceError.message || 'Failed to fetch conversation history'
        };
      }
    } catch (error: any) {
      console.error('Error fetching ElizaOS messages:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute a trading action through the agent
   */
  async executeTradingAction(
    agentId: string,
    action: string,
    symbol: string,
    amount: number,
    additionalParams: Record<string, any> = {}
  ): Promise<AgentCommunicationResponse> {
    try {
      // Format the trading action
      const actionType = action.toUpperCase() as 'BUY' | 'SELL' | 'CLOSE' | 'MODIFY';
      const quantity = amount;
      
      // Build a properly formatted trading command
      let priceStr = '';
      if (additionalParams.price) {
        priceStr = ` at ${additionalParams.price}`;
      }
      
      const actionCommand = `trade ${actionType} ${symbol} ${quantity}${priceStr}`;
      
      try {
        // Send the command through the ElizaOS agent service
        const commandResult = await elizaOSAgentService.addAgentCommand(agentId, actionCommand);
        
        // Return a standardized response
        return {
          success: true,
          data: {
            id: commandResult.id,
            action_type: actionType,
            symbol: symbol,
            quantity: quantity,
            status: commandResult.status,
            timestamp: commandResult.created_at,
            response: commandResult.response_text || ''
          }
        };
      } catch (serviceError: any) {
        return {
          success: false,
          error: serviceError.message || 'Failed to execute trading action'
        };
      }
    } catch (error: any) {
      console.error('Error executing trading action:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get the trading permissions for an agent
   */
  async getTradingPermissions(
    agentId: string
  ): Promise<AgentCommunicationResponse> {
    try {
      try {
        // Get the agent by ID to check its configuration
        const agent = await elizaOSAgentService.getAgentById(agentId);
        
        // Extract and parse trading permissions from the agent config
        let parsedPermissions: Record<string, any> = {};
        
        // Handle string-based trading permissions (need to parse JSON)
        if (typeof agent.config?.trading_permissions === 'string') {
          try {
            parsedPermissions = JSON.parse(agent.config.trading_permissions);
          } catch (e) {
            // If parsing fails, use as a simple enabled flag
            parsedPermissions = { enabled: agent.config.trading_permissions === 'true' };
          }
        } 
        // Handle object-based trading permissions
        else if (agent.config?.trading_permissions) {
          parsedPermissions = agent.config.trading_permissions as Record<string, any>;
        }
        
        // Create a standardized permissions object
        const permissions = {
          exchanges: agent.config?.markets || [],
          enabled: true,
          risk_level: agent.config?.risk_level || 'low',
          ...parsedPermissions
        };
        
        return {
          success: true,
          data: { permissions }
        };
      } catch (serviceError: any) {
        return {
          success: false,
          error: serviceError.message || 'Failed to get trading permissions'
        };
      }
    } catch (error: any) {
      console.error('Error getting trading permissions:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Subscribe to agent messages
   */
  subscribeToMessages(
    agentId: string,
    callback: (message: AgentMessage) => void
  ): () => void {
    const supabase = createBrowserClient();
    
    const channel = supabase.channel('agent-messages');
    
    channel
      .on('broadcast', { event: 'broadcast_message' }, (payload: any) => {
        callback(payload.payload as AgentMessage);
      })
      .on('broadcast', { event: 'direct_message' }, (payload: any) => {
        const message = payload.payload as AgentMessage;
        if (message.recipient_id === agentId) {
          callback(message);
        }
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Subscribe to ElizaOS command console events
   */
  subscribeToElizaEvents(
    agentId: string,
    callback: (response: ElizaCommandResponse) => void
  ): () => void {
    const supabase = createBrowserClient();
    
    const channel = supabase.channel(`agent-${agentId}`);
    
    channel
      .on('broadcast', { event: 'COMMAND_RESPONSE' }, (payload: any) => {
        callback(payload.payload as ElizaCommandResponse);
      })
      .on('broadcast', { event: 'KNOWLEDGE_RESPONSE' }, (payload: any) => {
        callback(payload.payload as ElizaCommandResponse);
      })
      .on('broadcast', { event: 'SYSTEM_RESPONSE' }, (payload: any) => {
        callback(payload.payload as ElizaCommandResponse);
      })
      .on('broadcast', { event: 'ERROR_RESPONSE' }, (payload: any) => {
        callback(payload.payload as ElizaCommandResponse);
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }
}

// Export a singleton instance of the adapter
export const elizaOSMessagingAdapter = new ElizaOSMessagingAdapter();
