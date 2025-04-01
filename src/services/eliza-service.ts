import { ApiResponse } from '@/services/farm-service';

export interface ElizaMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    source?: 'knowledge-base' | 'market-data' | 'farm-analytics' | 'risk-assessment';
    confidence?: number;
    tokens_used?: number;
    [key: string]: any;
  };
  created_at: string;
}

export interface ElizaConversation {
  id: string;
  user_id: string;
  title: string;
  context?: string;
  farm_id?: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  source_url?: string;
  created_at: string;
  updated_at: string;
}

const SUPABASE_MCP_URL = 'https://mcp.composio.dev/supabase/ancient-brash-planet-yjteSe';

export const elizaService = {
  /**
   * Get user's conversations
   */
  async getConversations(userId: string): Promise<ApiResponse<ElizaConversation[]>> {
    try {
      const response = await fetch(SUPABASE_MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'run_query',
          params: {
            table: 'eliza_conversations',
            select: '*',
            where: { user_id: userId },
            order: 'updated_at.desc'
          }
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch conversations');
      }
      
      return { data: result.data };
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Create a new conversation
   */
  async createConversation(data: Omit<ElizaConversation, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<ElizaConversation>> {
    try {
      const response = await fetch(SUPABASE_MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'insert_record',
          params: {
            table: 'eliza_conversations',
            data,
            returning: '*'
          }
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create conversation');
      }
      
      return { data: result.data };
    } catch (error) {
      console.error('Error creating conversation:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Get messages for a conversation
   */
  async getConversationMessages(conversationId: string): Promise<ApiResponse<ElizaMessage[]>> {
    try {
      const response = await fetch(SUPABASE_MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'run_query',
          params: {
            table: 'eliza_messages',
            select: '*',
            where: { conversation_id: conversationId },
            order: 'created_at.asc'
          }
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch conversation messages');
      }
      
      return { data: result.data };
    } catch (error) {
      console.error('Error fetching conversation messages:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Send a message to ElizaOS
   */
  async sendMessage(message: { 
    conversation_id: string;
    content: string;
    farm_id?: string;
  }): Promise<ApiResponse<ElizaMessage>> {
    try {
      // First, add the user message to the database
      const userMessageResponse = await fetch(SUPABASE_MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'insert_record',
          params: {
            table: 'eliza_messages',
            data: {
              conversation_id: message.conversation_id,
              role: 'user',
              content: message.content
            },
            returning: '*'
          }
        })
      });
      
      const userMessageResult = await userMessageResponse.json();
      
      if (!userMessageResult.success) {
        throw new Error(userMessageResult.error || 'Failed to save user message');
      }

      // Use custom SQL to call the Eliza AI function
      const aiResponse = await fetch(SUPABASE_MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'run_sql',
          params: {
            sql: `
              SELECT eliza_ai_response(
                '${message.conversation_id}', 
                '${message.content}', 
                ${message.farm_id ? `'${message.farm_id}'` : 'NULL'}
              ) as response;
            `
          }
        })
      });
      
      const aiResult = await aiResponse.json();
      
      if (!aiResult.success) {
        throw new Error(aiResult.error || 'Failed to get AI response');
      }
      
      const response = aiResult.data[0]?.response;
      
      if (!response) {
        throw new Error('AI returned no response');
      }
      
      // Save the AI response to the database
      const saveResponse = await fetch(SUPABASE_MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'insert_record',
          params: {
            table: 'eliza_messages',
            data: {
              conversation_id: message.conversation_id,
              role: 'assistant',
              content: response.content,
              metadata: response.metadata || {}
            },
            returning: '*'
          }
        })
      });
      
      const saveResult = await saveResponse.json();
      
      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Failed to save AI response');
      }
      
      // Update the conversation's last updated timestamp
      await fetch(SUPABASE_MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'update_record',
          params: {
            table: 'eliza_conversations',
            data: {
              updated_at: new Date().toISOString()
            },
            where: { id: message.conversation_id }
          }
        })
      });
      
      return { data: saveResult.data };
    } catch (error) {
      console.error('Error sending message:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Search the knowledge base
   */
  async searchKnowledgeBase(query: string): Promise<ApiResponse<KnowledgeItem[]>> {
    try {
      const response = await fetch(SUPABASE_MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'run_sql',
          params: {
            sql: `
              SELECT *
              FROM knowledge_base
              WHERE document @@ to_tsquery('english', '${query}')
              OR title ILIKE '%${query}%'
              OR category ILIKE '%${query}%'
              OR '${query}' = ANY(tags)
              ORDER BY ts_rank(document, to_tsquery('english', '${query}')) DESC
              LIMIT 20;
            `
          }
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to search knowledge base');
      }
      
      return { data: result.data };
    } catch (error) {
      console.error('Error searching knowledge base:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Execute a trading farm command
   */
  async executeCommand(params: { 
    command: string; 
    farmId?: string; 
    parameters?: Record<string, any>;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(SUPABASE_MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'run_sql',
          params: {
            sql: `
              SELECT execute_farm_command(
                '${params.command}',
                ${params.farmId ? `'${params.farmId}'` : 'NULL'},
                '${JSON.stringify(params.parameters || {})}'::jsonb
              ) as result;
            `
          }
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to execute command');
      }
      
      const commandResult = result.data[0]?.result;
      
      if (!commandResult) {
        return { error: 'Command returned no results' };
      }
      
      return { data: commandResult };
    } catch (error) {
      console.error('Error executing command:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Get command suggestions for a farm
   */
  async getCommandSuggestions(farmId: string): Promise<ApiResponse<string[]>> {
    try {
      const response = await fetch(SUPABASE_MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'run_sql',
          params: {
            sql: `
              SELECT get_farm_command_suggestions('${farmId}') as suggestions;
            `
          }
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to get command suggestions');
      }
      
      const suggestions = result.data[0]?.suggestions;
      
      if (!suggestions) {
        return { data: [] };
      }
      
      return { data: suggestions };
    } catch (error) {
      console.error('Error getting command suggestions:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Add an item to the knowledge base
   */
  async addKnowledgeItem(item: Omit<KnowledgeItem, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<KnowledgeItem>> {
    try {
      const response = await fetch(SUPABASE_MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'insert_record',
          params: {
            table: 'knowledge_base',
            data: item,
            returning: '*'
          }
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to add knowledge item');
      }
      
      return { data: result.data };
    } catch (error) {
      console.error('Error adding knowledge item:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Generate a risk assessment report for a farm
   */
  async generateRiskReport(farmId: string): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(SUPABASE_MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'run_sql',
          params: {
            sql: `
              SELECT generate_farm_risk_report('${farmId}') as report;
            `
          }
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate risk report');
      }
      
      const report = result.data[0]?.report;
      
      if (!report) {
        return { error: 'Failed to generate report' };
      }
      
      return { data: report };
    } catch (error) {
      console.error('Error generating risk report:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }
}; 