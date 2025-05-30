import { supabase } from '@/integrations/supabase/client';

export interface Message {
  id: string;
  message_id: string;
  sender_id: string;
  recipient_id: string | null;
  specialization: string | null;
  topic: string | null;
  correlation_id: string | null;
  message_type: string;
  delivery_mode: string;
  priority: number;
  payload: any;
  status: string;
  created_at: string;
  updated_at: string;
  delivered_at: string | null;
  processed_at: string | null;
  scheduled_for: string | null;
  expires_at: string | null;
  retries: number;
  max_retries: number;
  metadata: any;
}

export interface Subscription {
  id: string;
  agent_id: string;
  topic: string;
  created_at: string;
  updated_at: string;
  filter_criteria: any;
  active: boolean;
}

// Message Queue Service to interact with the MCP Message Queue
export const MessageQueueService = {
  // Message methods
  async sendMessage(message: Partial<Message>) {
    try {
      const response = await fetch(`${supabase.supabaseUrl}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.supabaseKey}`
        },
        body: JSON.stringify(message)
      });
      
      if (!response.ok) {
        throw new Error(`Error sending message: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error in sendMessage:', error);
      throw error;
    }
  },

  async getMessagesForAgent(agentId: string, options = {}) {
    try {
      const queryParams = new URLSearchParams({ agent_id: agentId, ...options } as Record<string, string>).toString();
      const response = await fetch(`${supabase.supabaseUrl}/api/messages/agent/${agentId}?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.supabaseKey}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error fetching messages: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error in getMessagesForAgent for ${agentId}:`, error);
      throw error;
    }
  },

  async markMessageDelivered(messageId: string, recipientId: string) {
    try {
      const response = await fetch(`${supabase.supabaseUrl}/api/messages/${messageId}/deliver`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.supabaseKey}`
        },
        body: JSON.stringify({ recipient_id: recipientId })
      });
      
      if (!response.ok) {
        throw new Error(`Error marking message as delivered: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error in markMessageDelivered for ${messageId}:`, error);
      throw error;
    }
  },

  async markMessageRead(messageId: string, recipientId: string) {
    try {
      const response = await fetch(`${supabase.supabaseUrl}/api/messages/${messageId}/read`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.supabaseKey}`
        },
        body: JSON.stringify({ recipient_id: recipientId })
      });
      
      if (!response.ok) {
        throw new Error(`Error marking message as read: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error in markMessageRead for ${messageId}:`, error);
      throw error;
    }
  },

  async respondToMessage(messageId: string, responseData: any) {
    try {
      const response = await fetch(`${supabase.supabaseUrl}/api/messages/${messageId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.supabaseKey}`
        },
        body: JSON.stringify(responseData)
      });
      
      if (!response.ok) {
        throw new Error(`Error responding to message: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error in respondToMessage for ${messageId}:`, error);
      throw error;
    }
  },

  // Subscription methods
  async subscribeToTopic(agentId: string, topic: string, filterCriteria = {}) {
    try {
      const response = await fetch(`${supabase.supabaseUrl}/api/coordinator/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.supabaseKey}`
        },
        body: JSON.stringify({
          agent_id: agentId,
          topic: topic,
          filter_criteria: filterCriteria
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error subscribing to topic: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error in subscribeToTopic for ${agentId} to ${topic}:`, error);
      throw error;
    }
  },

  async unsubscribeFromTopic(agentId: string, topic: string) {
    try {
      const response = await fetch(`${supabase.supabaseUrl}/api/coordinator/subscriptions?agent_id=${agentId}&topic=${topic}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.supabaseKey}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error unsubscribing from topic: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error in unsubscribeFromTopic for ${agentId} from ${topic}:`, error);
      throw error;
    }
  },

  async getSubscriptions(agentId: string, activeOnly = true) {
    try {
      const response = await fetch(`${supabase.supabaseUrl}/api/coordinator/subscriptions?agent_id=${agentId}&active_only=${activeOnly}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.supabaseKey}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error getting subscriptions: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error in getSubscriptions for ${agentId}:`, error);
      throw error;
    }
  },

  // Broadcasting and publishing
  async broadcastMessage(messageType: string, payload: any, priority?: number) {
    try {
      const response = await fetch(`${supabase.supabaseUrl}/api/coordinator/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.supabaseKey}`
        },
        body: JSON.stringify({
          message_type: messageType,
          payload: payload,
          priority: priority
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error broadcasting message: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error in broadcastMessage of type ${messageType}:`, error);
      throw error;
    }
  },

  async publishToTopic(topic: string, messageType: string, payload: any, priority?: number) {
    try {
      const response = await fetch(`${supabase.supabaseUrl}/api/coordinator/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.supabaseKey}`
        },
        body: JSON.stringify({
          topic: topic,
          message_type: messageType,
          payload: payload,
          priority: priority
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error publishing to topic: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error in publishToTopic ${topic} with message type ${messageType}:`, error);
      throw error;
    }
  }
}; 