import { createBrowserClient } from '@/utils/supabase/client';
import { v4 as uuidv4 } from 'uuid';

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
    response_type?: string;
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

// ElizaOS Command Response Types
export type CommandResponseType = 'COMMAND_RESPONSE' | 'KNOWLEDGE_RESPONSE' | 'SYSTEM_RESPONSE' | 'ERROR_RESPONSE';

export interface ElizaCommandResponse {
  id: string;
  agentId: string;
  type: CommandResponseType;
  content: string;
  category: AgentMessage['message_type'];
  source: 'knowledge-base' | 'market-data' | 'strategy' | 'system';
  metadata?: any;
  timestamp: string;
}

class AgentMessagingService {
  async sendMessage(
    senderId: string,
    recipientId: string | null,
    content: string,
    messageType: AgentMessage['message_type'] = 'direct',
    priority: AgentMessage['priority'] = 'medium',
    metadata: AgentMessage['metadata'] = {}
  ): Promise<AgentCommunicationResponse> {
    const supabase = createBrowserClient();
    
    try {
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

  async getMessagesForAgent(
    agentId: string,
    limit: number = 50,
    includeRead: boolean = false
  ): Promise<AgentCommunicationResponse> {
    try {
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
        data: data
      };
    } catch (error: any) {
      console.error('Error fetching agent messages:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async markAsRead(messageId: string): Promise<AgentCommunicationResponse> {
    const supabase = createBrowserClient();
    
    try {
      const response = await fetch(`/api/agents/communication/${messageId}/read`, {
        method: 'PATCH',
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
        data: data
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
      const response = await fetch('/api/agents/eliza-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId,
          command,
          context
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data: data.response
      };
    } catch (error: any) {
      console.error('Error sending ElizaOS command:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Ask the agent's knowledge base a question
   * Retrieves information using RAG technology
   */
  async queryKnowledgeBase(
    agentId: string,
    query: string,
    filters: Record<string, any> = {}
  ): Promise<AgentCommunicationResponse> {
    return this.sendElizaCommand(agentId, query, { 
      type: 'knowledge_query',
      filters 
    });
  }

  subscribeToMessages(
    agentId: string,
    callback: (message: AgentMessage) => void
  ): () => void {
    const supabase = createBrowserClient();
    
    const channel = supabase.channel('agent-messages');
    
    channel
      .on('broadcast', { event: 'broadcast_message' }, (payload) => {
        callback(payload.payload as AgentMessage);
      })
      .on('broadcast', { event: 'direct_message' }, (payload) => {
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
   * Handles COMMAND_RESPONSE, KNOWLEDGE_RESPONSE and other event types
   */
  subscribeToElizaEvents(
    agentId: string,
    callback: (response: ElizaCommandResponse) => void
  ): () => void {
    const supabase = createBrowserClient();
    
    const channel = supabase.channel(`agent-${agentId}`);
    
    channel
      .on('broadcast', { event: 'COMMAND_RESPONSE' }, (payload) => {
        callback(payload.payload as ElizaCommandResponse);
      })
      .on('broadcast', { event: 'KNOWLEDGE_RESPONSE' }, (payload) => {
        callback(payload.payload as ElizaCommandResponse);
      })
      .on('broadcast', { event: 'SYSTEM_RESPONSE' }, (payload) => {
        callback(payload.payload as ElizaCommandResponse);
      })
      .on('broadcast', { event: 'ERROR_RESPONSE' }, (payload) => {
        callback(payload.payload as ElizaCommandResponse);
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }
}

export const agentMessagingService = new AgentMessagingService();
