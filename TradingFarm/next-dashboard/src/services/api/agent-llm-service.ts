/**
 * Agent LLM Service
 * 
 * Provides AI capabilities to Trading Farm agents through integration with 
 * the ElizaOS framework. This service handles selecting the appropriate LLM,
 * tracking usage, and managing context for trading-specific scenarios.
 */

import { Message, LLMRequest, LLMResponse } from '../llm-service';
import { ApiServiceManager, getApiServiceManager, ApiServiceType } from './api-service-manager';
import { OpenRouterClient, OpenRouterModel } from './openrouter-client';

// Agent Message Context Types
export type AgentContextType = 'market' | 'trade' | 'strategy' | 'general' | 'risk' | 'portfolio';

// Agent Message Category
export type AgentMessageCategory = 'command' | 'query' | 'analysis' | 'alert';

// Agent Message Source
export type AgentMessageSource = 'knowledge-base' | 'market-data' | 'strategy' | 'system' | 'user';

// Agent Message Interface
export interface AgentMessage {
  id?: string;
  agentId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  contextType?: AgentContextType;
  category?: AgentMessageCategory;
  source?: AgentMessageSource;
  metadata?: Record<string, any>;
  createdAt?: string;
}

// Agent Message History Interface
export interface AgentMessageHistory {
  messages: AgentMessage[];
  hasMore: boolean;
  total: number;
}

/**
 * Agent LLM Service for Trading Farm
 * Manages language model interactions for trading agents
 */
export class AgentLlmService {
  private apiServiceManager: ApiServiceManager;
  
  constructor() {
    this.apiServiceManager = getApiServiceManager();
  }
  
  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    await this.apiServiceManager.initialize();
  }
  
  /**
   * Get agent LLM configuration
   */
  async getAgentLlmConfig(agentId: string): Promise<{
    hasLlm: boolean;
    serviceType: ApiServiceType;
    providerName: string;
    model: string;
  }> {
    try {
      // Get agent's API services
      const services = await this.apiServiceManager.getAgentApiServices(agentId);
      const llmServices = services.filter(s => s.provider.serviceType === 'llm');
      
      if (llmServices.length === 0) {
        return {
          hasLlm: false,
          serviceType: 'llm',
          providerName: '',
          model: ''
        };
      }
      
      // Get the highest priority LLM service
      const service = llmServices.sort((a, b) => b.service.priority - a.service.priority)[0];
      
      return {
        hasLlm: true,
        serviceType: 'llm',
        providerName: service.provider.name,
        model: service.configuration.configuration.model || ''
      };
    } catch (error) {
      console.error(`Error getting LLM config for agent ${agentId}:`, error);
      return {
        hasLlm: false,
        serviceType: 'llm',
        providerName: '',
        model: ''
      };
    }
  }
  
  /**
   * Get agent message history
   */
  async getAgentMessageHistory(
    agentId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<AgentMessageHistory> {
    try {
      const supabase = this.apiServiceManager.getClient();
      
      // Get total count
      const { count, error: countError } = await supabase
        .from('agent_messages')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agentId);
      
      if (countError) throw countError;
      
      // Get messages
      const { data, error } = await supabase
        .from('agent_messages')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      
      return {
        messages: data.map((msg: any) => ({
          id: msg.id,
          agentId: msg.agent_id,
          role: msg.role,
          content: msg.content,
          contextType: msg.context_type,
          category: msg.category,
          source: msg.source,
          metadata: msg.metadata,
          createdAt: msg.created_at
        })),
        hasMore: count ? offset + limit < count : false,
        total: count || 0
      };
    } catch (error) {
      console.error(`Error getting message history for agent ${agentId}:`, error);
      return {
        messages: [],
        hasMore: false,
        total: 0
      };
    }
  }
  
  /**
   * Create a system message with trading context
   */
  createTradingSystemMessage(
    agentId: string,
    contextType: AgentContextType
  ): Message {
    let content = '';
    
    switch (contextType) {
      case 'market':
        content = `You are an AI assistant specialized in market analysis for trading agent ${agentId}. 
          Focus on providing objective market insights, trend analysis, and data-driven observations. 
          Be concise and factual, avoiding speculative predictions unless specifically requested.`;
        break;
      case 'trade':
        content = `You are an AI assistant specialized in trade execution for trading agent ${agentId}. 
          Help evaluate trade setups, entry/exit points, position sizing, and risk management. 
          Always emphasize risk management and proper trading practices.`;
        break;
      case 'strategy':
        content = `You are an AI assistant specialized in trading strategy for agent ${agentId}. 
          Help refine trading strategies, backtest parameters, and optimization approaches. 
          Focus on systematic, quantitative approaches backed by data.`;
        break;
      case 'risk':
        content = `You are an AI assistant specialized in risk management for trading agent ${agentId}. 
          Help evaluate position risks, portfolio exposure, and risk mitigation strategies. 
          Always emphasize capital preservation and proper risk controls.`;
        break;
      case 'portfolio':
        content = `You are an AI assistant specialized in portfolio management for trading agent ${agentId}. 
          Help analyze portfolio composition, diversification, correlation, and allocation strategies. 
          Focus on optimizing risk-adjusted returns across the entire portfolio.`;
        break;
      case 'general':
      default:
        content = `You are an AI assistant for trading agent ${agentId} in the Trading Farm platform. 
          Provide helpful, accurate, and concise responses to trading questions and commands. 
          When uncertain, acknowledge limitations rather than providing speculative answers.`;
        break;
    }
    
    return {
      role: 'system',
      content
    };
  }
  
  /**
   * Add market context to a message
   */
  async addMarketContext(
    message: string,
    agentId: string
  ): Promise<string> {
    // In a production system, you would fetch real market data here
    // For demo purposes, we're adding simulated data
    
    const currentDate = new Date().toISOString().split('T')[0];
    
    return `${message}\n\nCurrent market context (as of ${currentDate}):\n` +
      `- BTC Price: $62,487 (24h: +2.3%)\n` +
      `- ETH Price: $3,128 (24h: +1.1%)\n` +
      `- Market sentiment: Moderately bullish\n` +
      `- BTC Dominance: 48.2%\n` +
      `- Fear & Greed Index: 65 (Greed)`;
  }
  
  /**
   * Create conversation history for the LLM
   */
  async createConversationContext(
    agentId: string,
    contextType: AgentContextType,
    messageLimit: number = 10
  ): Promise<Message[]> {
    // Get recent messages for context
    const history = await this.getAgentMessageHistory(agentId, messageLimit);
    
    // Create system message
    const systemMessage = this.createTradingSystemMessage(agentId, contextType);
    
    // Convert agent messages to LLM format
    const conversationHistory = history.messages
      .sort((a, b) => new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime())
      .map(msg => ({
        role: msg.role as Message['role'],
        content: msg.content
      }));
    
    // Return system message + conversation history
    return [systemMessage, ...conversationHistory];
  }
  
  /**
   * Process agent message with LLM
   */
  async processAgentMessage(
    agentId: string,
    message: string,
    options?: {
      contextType?: AgentContextType;
      category?: AgentMessageCategory;
      includeMarketContext?: boolean;
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<AgentMessage> {
    try {
      const contextType = options?.contextType || 'general';
      const category = options?.category || 'query';
      
      // Save user message
      const userMessage: AgentMessage = {
        agentId,
        role: 'user',
        content: message,
        contextType,
        category,
        source: 'user',
        createdAt: new Date().toISOString()
      };
      
      await this.saveAgentMessage(userMessage);
      
      // Add market context if requested
      let processedMessage = message;
      if (options?.includeMarketContext) {
        processedMessage = await this.addMarketContext(message, agentId);
      }
      
      // Get conversation history
      const conversationHistory = await this.createConversationContext(agentId, contextType);
      
      // Add the current message
      const messages = [
        ...conversationHistory,
        { role: 'user', content: processedMessage }
      ];
      
      // Get agent's LLM configuration
      const llmConfig = await this.getAgentLlmConfig(agentId);
      
      if (!llmConfig.hasLlm) {
        // Fallback response if no LLM is configured
        const fallbackResponse: AgentMessage = {
          agentId,
          role: 'assistant',
          content: 'I apologize, but I don\'t have access to an AI language model. Please configure a language model for this agent to enable AI responses.',
          contextType,
          category: 'system',
          source: 'system',
          createdAt: new Date().toISOString()
        };
        
        await this.saveAgentMessage(fallbackResponse);
        return fallbackResponse;
      }
      
      // Prepare request
      const request: LLMRequest = {
        messages,
        model: (options?.model || llmConfig.model) as any,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 1000
      };
      
      // Get appropriate LLM client
      let response: LLMResponse;
      
      try {
        // Try to use the agent's configured LLM
        const llmClient = await this.apiServiceManager.getAgentApiClient(agentId, 'llm');
        response = await llmClient.processRequest(request);
      } catch (llmError) {
        console.error(`Error using agent LLM: ${llmError}`);
        
        // Fallback to OpenRouter if available
        try {
          const openRouterClient = this.apiServiceManager.getOpenRouterClient();
          response = await openRouterClient.processRequest(request);
        } catch (orError) {
          throw new Error(`Failed to get response from LLM: ${orError}`);
        }
      }
      
      if (!response || !response.choices || response.choices.length === 0) {
        throw new Error('Empty response from LLM');
      }
      
      // Extract assistant message
      const assistantMessage = response.choices[0].message;
      
      // Save assistant message
      const assistantAgentMessage: AgentMessage = {
        agentId,
        role: 'assistant',
        content: assistantMessage.content,
        contextType,
        category,
        source: llmConfig.providerName.toLowerCase(),
        metadata: {
          model: response.model,
          tokensUsed: response.usage?.total_tokens,
          provider: llmConfig.providerName
        },
        createdAt: new Date().toISOString()
      };
      
      await this.saveAgentMessage(assistantAgentMessage);
      
      // Log usage
      this.logLlmUsage(agentId, llmConfig.providerName, response);
      
      return assistantAgentMessage;
    } catch (error) {
      console.error(`Error processing agent message: ${error}`);
      
      // Create error response
      const errorResponse: AgentMessage = {
        agentId,
        role: 'assistant',
        content: `I encountered an error processing your request: ${error.message}. Please try again or contact support if the issue persists.`,
        contextType: options?.contextType || 'general',
        category: 'system',
        source: 'system',
        createdAt: new Date().toISOString()
      };
      
      await this.saveAgentMessage(errorResponse);
      return errorResponse;
    }
  }
  
  /**
   * Save agent message to database
   */
  private async saveAgentMessage(message: AgentMessage): Promise<void> {
    try {
      const supabase = this.apiServiceManager.getClient();
      
      await supabase
        .from('agent_messages')
        .insert({
          agent_id: message.agentId,
          role: message.role,
          content: message.content,
          context_type: message.contextType,
          category: message.category,
          source: message.source,
          metadata: message.metadata
        });
    } catch (error) {
      console.error(`Error saving agent message: ${error}`);
    }
  }
  
  /**
   * Log LLM usage
   */
  private async logLlmUsage(
    agentId: string,
    provider: string,
    response: LLMResponse
  ): Promise<void> {
    if (!response.usage) return;
    
    try {
      // Get API configuration for this agent + provider
      const services = await this.apiServiceManager.getAgentApiServices(agentId);
      const llmServices = services.filter(
        s => s.provider.name.toLowerCase() === provider.toLowerCase()
      );
      
      if (llmServices.length === 0) return;
      
      const service = llmServices[0];
      
      // Calculate approximate cost based on token usage
      // This is a simplified calculation and should be adjusted based on actual pricing
      let cost = 0;
      const promptTokens = response.usage.prompt_tokens || 0;
      const completionTokens = response.usage.completion_tokens || 0;
      
      // OpenAI-like pricing model (adjust based on actual provider rates)
      if (response.model.includes('gpt-4')) {
        cost = (promptTokens * 0.00003) + (completionTokens * 0.00006);
      } else if (response.model.includes('claude')) {
        cost = (promptTokens * 0.00001) + (completionTokens * 0.00003);
      } else {
        cost = (promptTokens * 0.000001) + (completionTokens * 0.000002);
      }
      
      // Log usage
      await this.apiServiceManager.logApiUsage(
        service.configuration.id,
        'llm_completion',
        'success',
        {
          agentId,
          requestData: {
            model: response.model,
            promptTokens,
            completionTokens
          },
          tokensUsed: response.usage.total_tokens,
          cost,
          durationMs: 0 // Not available in most LLM responses
        }
      );
    } catch (error) {
      console.error(`Error logging LLM usage: ${error}`);
    }
  }
}

// Create singleton instance
let instance: AgentLlmService | null = null;

/**
 * Get the AgentLlmService instance
 */
export function getAgentLlmService(): AgentLlmService {
  if (!instance) {
    instance = new AgentLlmService();
  }
  
  return instance;
}
