import { createClient } from '@supabase/supabase-js';
import type { McpMessage, McpEvent, McpSubscription } from '@/services/mcp/supabase-mcp-server';
import type { Database } from '@/types/database.types';

/**
 * Type definitions for MCP tool parameters
 */
export type McpToolParams = {
  run_query: {
    query?: string;
    table: string;
    select?: string;
    where?: Record<string, any>;
    order?: string;
    limit?: number;
  };
  insert_record: {
    table: string;
    data: Record<string, any>;
    returning?: string;
  };
  update_record: {
    table: string;
    data: Record<string, any>;
    where: Record<string, any>;
    returning?: string;
  };
  delete_record: {
    table: string;
    where: Record<string, any>;
    returning?: string;
  };
  run_sql: {
    sql: string;
  };
  sql_transaction: {
    statements: string[];
  };
  create_farm: {
    name: string;
    description?: string;
    user_id?: string;
  };
  create_agent: {
    name: string;
    farm_id: number;
    status?: string;
    type?: string;
    configuration?: Record<string, any>;
  };
  create_wallet: {
    name: string;
    address: string;
    balance?: number;
    farm_id?: number;
    user_id?: string;
  };
  record_transaction: {
    type: string;
    amount: number;
    wallet_id: number;
    farm_id?: number;
    status?: string;
  };
  get_farm_details: {
    farm_id: number;
  };
  run_migration: {
    sql: string;
  };
};

export interface McpToolResponse<T = any> {
  success: boolean;
  error?: string;
  data?: T;
}

class SupabaseMcpClient {
  private supabase;
  private pollingIntervals: Record<string, NodeJS.Timeout> = {};
  private POLLING_INTERVAL = 1000; // 1 second

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
  }

  async sendMessage(message: Omit<McpMessage, 'id' | 'status'>) {
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

  async broadcastEvent(event: McpEvent) {
    try {
      const { data: subscriptions, error: subError } = await this.supabase
        .from('mcp_subscriptions')
        .select('agent_id')
        .eq('topic', event.topic);

      if (subError) throw subError;

      const messages = subscriptions.map(sub => ({
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

  async subscribeToTopic(subscription: Omit<McpSubscription, 'id'>) {
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

  async getPendingMessages(agentId: string) {
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

  async markMessageDelivered(messageId: string) {
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
      if (result.success && result.data.length > 0) {
        onMessages(result.data);
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

  async updateAgentStatus(agentId: string, status: string, metadata?: any) {
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

  /**
   * Execute an MCP tool
   */
  private async executeTool<T extends keyof McpToolParams>(
    tool: T,
    params: McpToolParams[T]
  ): Promise<McpToolResponse> {
    try {
      const response = await fetch(`${this.serverUrl}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool,
          params,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`MCP request failed: ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Run a database migration SQL script
   */
  async runMigration(sql: string): Promise<McpToolResponse<any>> {
    return this.executeTool('run_migration', { sql });
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