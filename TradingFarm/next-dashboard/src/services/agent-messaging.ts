import { createBrowserClient } from '@/utils/supabase/client';

export interface AgentMessage {
  id: string;
  sender_id: number;
  sender_name: string;
  recipient_id: number | null;
  content: string;
  message_type: 'broadcast' | 'direct' | 'command' | 'status';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: string;
  read: boolean;
  metadata: {
    intent?: string;
    action_required?: boolean;
    tags?: string[];
    related_trades?: number[];
    [key: string]: any;
  };
}

export interface AgentCommunicationResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: any;
}

class AgentMessagingService {
  /**
   * Send a message from one agent to another
   */
  async sendMessage(
    senderId: number,
    recipientId: number | null,
    content: string,
    messageType: AgentMessage['message_type'] = 'direct',
    priority: AgentMessage['priority'] = 'medium',
    metadata: AgentMessage['metadata'] = {}
  ): Promise<AgentCommunicationResponse> {
    try {
      const supabase = createBrowserClient();
      
      // Get sender agent details
      const { data: senderData, error: senderError } = await supabase
        .from('agents')
        .select('name')
        .eq('id', senderId)
        .single();
        
      if (senderError) {
        throw new Error(`Failed to get sender details: ${senderError.message}`);
      }
      
      const message: Omit<AgentMessage, 'id'> = {
        sender_id: senderId,
        sender_name: senderData.name,
        recipient_id: recipientId,
        content,
        message_type: messageType,
        priority,
        timestamp: new Date().toISOString(),
        read: false,
        metadata
      };
      
      const { data, error } = await supabase
        .from('agent_messages')
        .insert(message)
        .select()
        .single();
        
      if (error) {
        console.error('Error sending agent message:', error);
        return {
          success: false,
          error: error.message
        };
      }
      
      // Publish real-time event to notify agents
      const eventType = recipientId ? 'direct_message' : 'broadcast_message';
      await supabase.channel('agent-messages')
        .send({
          type: eventType,
          event: 'new_message',
          payload: data
        });
      
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Agent message error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Broadcast a message to all agents in a farm
   */
  async broadcastToFarm(
    senderId: number,
    farmId: number,
    content: string,
    priority: AgentMessage['priority'] = 'medium',
    metadata: AgentMessage['metadata'] = {}
  ): Promise<AgentCommunicationResponse> {
    return this.sendMessage(
      senderId,
      null, // null recipient means broadcast
      content,
      'broadcast',
      priority,
      { ...metadata, farm_id: farmId }
    );
  }
  
  /**
   * Get messages for a specific agent
   */
  async getMessagesForAgent(
    agentId: number,
    limit: number = 50,
    includeRead: boolean = false
  ): Promise<AgentCommunicationResponse> {
    try {
      const supabase = createBrowserClient();
      
      let query = supabase
        .from('agent_messages')
        .select('*')
        .or(`recipient_id.eq.${agentId},recipient_id.is.null`)
        .order('timestamp', { ascending: false })
        .limit(limit);
        
      if (!includeRead) {
        query = query.eq('read', false);
      }
      
      const { data, error } = await query;
      
      if (error) {
        return {
          success: false,
          error: error.message
        };
      }
      
      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<AgentCommunicationResponse> {
    try {
      const supabase = createBrowserClient();
      
      const { error } = await supabase
        .from('agent_messages')
        .update({ read: true })
        .eq('id', messageId);
        
      if (error) {
        return {
          success: false,
          error: error.message
        };
      }
      
      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Subscribe to agent messages
   */
  subscribeToMessages(
    agentId: number,
    callback: (message: AgentMessage) => void
  ): () => void {
    const supabase = createBrowserClient();
    
    const channel = supabase.channel('agent-messages')
      .on('broadcast', { event: 'new_message' }, (payload) => {
        callback(payload.payload as AgentMessage);
      })
      .on('presence', { event: 'sync' }, () => {
        console.log('Agents online:', channel.presenceState());
      })
      .subscribe();
      
    // Return unsubscribe function
    return () => {
      supabase.removeChannel(channel);
    };
  }
}

export const agentMessagingService = new AgentMessagingService();
