import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export interface McpMessage {
  id?: string;
  agent_id: string;
  topic: string;
  payload: any;
  status?: 'pending' | 'delivered';
}

export interface McpEvent {
  topic: string;
  payload: any;
}

export interface McpSubscription {
  id?: string;
  agent_id: string;
  topic: string;
}

interface SuccessResponse<T = void> {
  success: true;
  data?: T;
}

interface ErrorResponse {
  success: false;
  error: string;
}

type ApiResponse<T = void> = SuccessResponse<T> | ErrorResponse;

class SupabaseMcpClient {
  private supabase;
  private pollingIntervals: Record<string, NodeJS.Timeout> = {};
  private POLLING_INTERVAL = 1000; // 1 second

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
  }

  async sendMessage(message: Omit<McpMessage, 'id' | 'status'>): Promise<ApiResponse<McpMessage>> {
    try {
      const { data, error } = await this.supabase
        .from('mcp_messages')
        .insert([{ ...message, status: 'pending' }])
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send message'
      };
    }
  }

  async broadcastEvent(event: McpEvent): Promise<ApiResponse<{ recipientCount: number }>> {
    try {
      const { data: subscriptions, error: subError } = await this.supabase
        .from('mcp_subscriptions')
        .select('agent_id')
        .eq('topic', event.topic);

      if (subError) throw subError;

      const messages = subscriptions.map((sub: { agent_id: string }) => ({
        agent_id: sub.agent_id,
        topic: event.topic,
        payload: event.payload,
        status: 'pending'
      }));

      if (messages.length > 0) {
        const { error: msgError } = await this.supabase
          .from('mcp_messages')
          .insert(messages);

        if (msgError) throw msgError;
      }

      return {
        success: true,
        data: { recipientCount: messages.length }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to broadcast event'
      };
    }
  }

  async subscribeToTopic(subscription: Omit<McpSubscription, 'id'>): Promise<ApiResponse<McpSubscription>> {
    try {
      const { data, error } = await this.supabase
        .from('mcp_subscriptions')
        .upsert([subscription])
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to subscribe to topic'
      };
    }
  }

  async getPendingMessages(agentId: string): Promise<ApiResponse<McpMessage[]>> {
    try {
      const { data, error } = await this.supabase
        .from('mcp_messages')
        .select()
        .eq('agent_id', agentId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get pending messages'
      };
    }
  }

  async markMessageDelivered(messageId: string): Promise<ApiResponse> {
    try {
      const { error } = await this.supabase
        .from('mcp_messages')
        .update({ status: 'delivered' })
        .eq('id', messageId);

      if (error) throw error;

      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark message as delivered'
      };
    }
  }

  startPolling(agentId: string, onMessages: (messages: McpMessage[]) => void) {
    // Stop any existing polling for this agent
    this.stopPolling(agentId);

    const poll = async () => {
      const result = await this.getPendingMessages(agentId);
      if (result.success && result.data) {
        const messages = result.data;
        if (messages.length > 0) {
          onMessages(messages);
        }
      }
    };

    // Start polling
    poll(); // Initial poll
    this.pollingIntervals[agentId] = setInterval(poll, this.POLLING_INTERVAL);
  }

  stopPolling(agentId: string) {
    if (this.pollingIntervals[agentId]) {
      clearInterval(this.pollingIntervals[agentId]);
      delete this.pollingIntervals[agentId];
    }
  }

  async updateAgentStatus(agentId: string, status: string, metadata?: any): Promise<ApiResponse<Database['public']['Tables']['mcp_agent_status']['Row']>> {
    try {
      const { data, error } = await this.supabase
        .from('mcp_agent_status')
        .upsert([{
          agent_id: agentId,
          status,
          metadata,
          last_seen: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update agent status'
      };
    }
  }
}

// Singleton instance
let mcpClient: SupabaseMcpClient | null = null;

export function getSupabaseMcpClient() {
  if (!mcpClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration is missing');
    }

    mcpClient = new SupabaseMcpClient(supabaseUrl, supabaseKey);
  }

  return mcpClient;
} 