/**
 * LLM Service
 * Manages language model interactions for ElizaOS agents
 */
import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';

// LLM Provider Types
export type LLMProvider = 'openai' | 'anthropic' | 'google' | 'local';
export type LLMModel = 
  // OpenAI Models
  | 'gpt-4o' | 'gpt-4-turbo' | 'gpt-4' | 'gpt-3.5-turbo'
  // Anthropic Models
  | 'claude-3-opus' | 'claude-3-sonnet' | 'claude-3-haiku'
  // Google Models
  | 'gemini-pro' | 'gemini-flash'
  // Local Models
  | 'llama-3' | 'local-mistral' | 'ollama-custom';

// LLM Configuration Interface
export interface LLMConfig {
  id: string;
  user_id: string;
  provider: LLMProvider;
  model: LLMModel;
  api_key?: string | null;
  config: Record<string, any>;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// Message Types
export type MessageRole = 'user' | 'assistant' | 'system' | 'function' | 'tool';

export interface Message {
  role: MessageRole;
  content: string;
  metadata?: Record<string, any>;
  name?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
  tool_calls?: Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string;
}

export interface LLMRequest {
  messages: Message[];
  model: LLMModel;
  temperature?: number;
  max_tokens?: number;
  tools?: Array<{
    type: string;
    function: {
      name: string;
      description: string;
      parameters: Record<string, any>;
    };
  }>;
  tool_choice?: 'auto' | 'none' | { type: string; function: { name: string } };
}

export interface LLMResponse {
  id: string;
  model: string;
  created: number;
  choices: Array<{
    index: number;
    message: Message;
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

/**
 * LLM service for managing AI model interactions
 */
export const llmService = {
  /**
   * Get available LLM configurations for the current user
   */
  async getUserLLMConfigs(): Promise<ApiResponse<LLMConfig[]>> {
    try {
      const response = await fetch('/api/llm/configs', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch LLM configs: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.configs || !Array.isArray(result.configs)) {
        return { error: 'Invalid response format' };
      }
      
      return { data: result.configs };
    } catch (error) {
      console.error('Error fetching LLM configs:', error);
      return { error: 'An unexpected error occurred' };
    }
  },

  /**
   * Create a new LLM configuration
   */
  async createLLMConfig(config: Omit<LLMConfig, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<LLMConfig>> {
    try {
      const response = await fetch('/api/llm/configs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create LLM config: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.config) {
        return { error: 'Invalid response format' };
      }
      
      return { data: result.config };
    } catch (error) {
      console.error('Error creating LLM config:', error);
      return { error: 'An unexpected error occurred' };
    }
  },

  /**
   * Update an LLM configuration
   */
  async updateLLMConfig(id: string, updates: Partial<LLMConfig>): Promise<ApiResponse<LLMConfig>> {
    try {
      const response = await fetch(`/api/llm/configs/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update LLM config: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.config) {
        return { error: 'Invalid response format' };
      }
      
      return { data: result.config };
    } catch (error) {
      console.error(`Error updating LLM config ${id}:`, error);
      return { error: 'An unexpected error occurred' };
    }
  },

  /**
   * Delete an LLM configuration
   */
  async deleteLLMConfig(id: string): Promise<ApiResponse<null>> {
    try {
      const response = await fetch(`/api/llm/configs/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete LLM config: ${response.statusText}`);
      }
      
      return { data: null };
    } catch (error) {
      console.error(`Error deleting LLM config ${id}:`, error);
      return { error: 'An unexpected error occurred' };
    }
  },

  /**
   * Send a completion request to an LLM with specified configuration
   */
  async sendCompletion(configId: string, request: LLMRequest): Promise<ApiResponse<LLMResponse>> {
    try {
      const response = await fetch(`/api/llm/completion/${configId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to send LLM completion request: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.completion) {
        return { error: 'Invalid response format' };
      }
      
      return { data: result.completion };
    } catch (error) {
      console.error('Error sending LLM completion request:', error);
      return { error: 'An unexpected error occurred' };
    }
  },

  /**
   * Create a context-enhanced message for agent trading
   * This adds relevant context to the user message before sending to the LLM
   */
  async createContextEnhancedMessage(message: string, agentId: string, contextType: 'market' | 'trade' | 'strategy' | 'general' = 'general'): Promise<ApiResponse<Message>> {
    try {
      const response = await fetch(`/api/agents/${agentId}/llm/context-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          contextType
        }),
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create context-enhanced message: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.message) {
        return { error: 'Invalid response format' };
      }
      
      return { data: result.message };
    } catch (error) {
      console.error('Error creating context-enhanced message:', error);
      return { error: 'An unexpected error occurred' };
    }
  },

  /**
   * Send a message to an agent and get a response using the agent's configured LLM
   */
  async sendAgentMessage(agentId: string, message: string, contextType: 'market' | 'trade' | 'strategy' | 'general' = 'general'): Promise<ApiResponse<Message>> {
    try {
      const response = await fetch(`/api/agents/${agentId}/llm/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          contextType
        }),
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to send agent message: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.response) {
        return { error: 'Invalid response format' };
      }
      
      return { data: result.response };
    } catch (error) {
      console.error(`Error sending message to agent ${agentId}:`, error);
      return { error: 'An unexpected error occurred' };
    }
  }
};
