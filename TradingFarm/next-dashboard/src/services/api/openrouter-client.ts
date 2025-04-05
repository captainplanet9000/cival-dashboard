/**
 * OpenRouter Client Service
 * 
 * This service provides access to multiple LLMs through OpenRouter's unified API.
 * OpenRouter offers access to models from Anthropic, Google, Meta, Mistral and other providers.
 */

import { Message, LLMRequest, LLMResponse } from '../llm-service';

// Available model families on OpenRouter
export type OpenRouterProvider = 
  | 'anthropic' 
  | 'google' 
  | 'meta' 
  | 'mistral'
  | 'cohere'
  | 'deepinfra'
  | 'fireworks'
  | 'groq'
  | 'perplexity';

// Popular models available through OpenRouter
export type OpenRouterModel =
  // Anthropic models
  | 'anthropic/claude-3-opus-20240229'
  | 'anthropic/claude-3-sonnet-20240229'
  | 'anthropic/claude-3-haiku-20240307'
  // Meta models
  | 'meta/llama-3-70b-instruct'
  | 'meta/llama-3-8b-instruct'
  // Mistral models
  | 'mistral/mistral-large-latest'
  | 'mistral/mistral-medium-latest'
  | 'mistral/mistral-small-latest'
  // Google models
  | 'google/gemini-pro'
  | 'google/gemini-1.5-pro-latest'
  // Other models
  | 'perplexity/sonar-medium-online'
  | 'cohere/command-r-plus'
  | string; // Allow other models as they become available

export interface OpenRouterConfig {
  apiKey: string;
  defaultModel: OpenRouterModel;
  fallbackModels?: OpenRouterModel[];
  maxRetries?: number;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

export interface OpenRouterRequestParams {
  model: OpenRouterModel;
  messages: Message[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  top_k?: number;
  tools?: any[];
  tool_choice?: 'auto' | 'none' | { type: string; function: { name: string } };
  response_format?: {
    type: 'json_object' | 'text';
  };
  stop?: string | string[];
}

export interface OpenRouterUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface OpenRouterResponse {
  id: string;
  model: string;
  created: number;
  object: string;
  choices: Array<{
    index: number;
    message: Message;
    finish_reason: string;
  }>;
  usage: OpenRouterUsage;
}

export interface ModelDetails {
  id: string;
  name: string;
  provider: OpenRouterProvider;
  pricing: {
    prompt: number; // Cost per 1M prompt tokens in USD
    completion: number; // Cost per 1M completion tokens in USD
  };
  context_length: number;
  capabilities: string[];
}

/**
 * OpenRouter client for accessing multiple LLM providers through a single API
 */
export class OpenRouterClient {
  private config: OpenRouterConfig;
  private baseUrl = 'https://openrouter.ai/api/v1';
  private availableModels: ModelDetails[] = [];

  constructor(config: OpenRouterConfig) {
    this.config = {
      maxRetries: 3,
      timeoutMs: 60000,
      ...config
    };
  }

  /**
   * Initialize the client and fetch available models
   */
  async initialize(): Promise<void> {
    try {
      await this.fetchAvailableModels();
    } catch (error) {
      console.error('Failed to initialize OpenRouter client:', error);
    }
  }

  /**
   * Fetch available models from OpenRouter
   */
  async fetchAvailableModels(): Promise<ModelDetails[]> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }

      const data = await response.json();
      this.availableModels = data.data || [];
      return this.availableModels;
    } catch (error) {
      console.error('Error fetching available models:', error);
      throw error;
    }
  }

  /**
   * Get available models with details
   */
  getAvailableModels(): ModelDetails[] {
    return this.availableModels;
  }

  /**
   * Send a completion request to OpenRouter
   */
  async sendCompletion(params: OpenRouterRequestParams): Promise<OpenRouterResponse> {
    try {
      // Use default model if not specified
      const model = params.model || this.config.defaultModel;
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          ...params,
          model,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending completion to OpenRouter:', error);
      
      // Try fallback models if available
      if (this.config.fallbackModels && this.config.fallbackModels.length > 0 && 
          params.model !== this.config.fallbackModels[0]) {
        console.log(`Trying fallback model: ${this.config.fallbackModels[0]}`);
        return this.sendCompletion({
          ...params,
          model: this.config.fallbackModels[0]
        });
      }
      
      throw error;
    }
  }

  /**
   * Convert standard LLM request to OpenRouter format
   */
  async convertRequest(request: LLMRequest): Promise<OpenRouterRequestParams> {
    return {
      model: request.model as OpenRouterModel,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.max_tokens,
      tools: request.tools,
      tool_choice: request.tool_choice,
    };
  }

  /**
   * Convert OpenRouter response to standard LLM response format
   */
  convertResponse(response: OpenRouterResponse): LLMResponse {
    return {
      id: response.id,
      model: response.model,
      created: response.created,
      choices: response.choices,
      usage: response.usage,
    };
  }

  /**
   * Process a standard LLM request through OpenRouter
   */
  async processRequest(request: LLMRequest): Promise<LLMResponse> {
    const openRouterRequest = await this.convertRequest(request);
    const openRouterResponse = await this.sendCompletion(openRouterRequest);
    return this.convertResponse(openRouterResponse);
  }

  /**
   * Get headers for OpenRouter API requests
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
      'HTTP-Referer': 'https://trading-farm.example.com', // Replace with your actual domain
      'X-Title': 'Trading Farm', // Replace with your application name
      ...this.config.headers,
    };
  }

  /**
   * Log usage statistics (can be implemented to store in your database)
   */
  private logUsage(model: string, usage: OpenRouterUsage): void {
    // In a production environment, you would store this in your database
    console.log(`OpenRouter usage - Model: ${model}, Tokens: ${usage.total_tokens}`);
  }
}

/**
 * Create an OpenRouter client with the provided API key
 */
export function createOpenRouterClient(apiKey: string, defaultModel?: OpenRouterModel): OpenRouterClient {
  return new OpenRouterClient({
    apiKey,
    defaultModel: defaultModel || 'anthropic/claude-3-sonnet-20240229',
    fallbackModels: ['anthropic/claude-3-haiku-20240307', 'meta/llama-3-8b-instruct'],
  });
}

/**
 * Initialize OpenRouter client from environment variable
 */
export function createOpenRouterClientFromEnv(): OpenRouterClient | null {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn('OPENROUTER_API_KEY not found in environment variables');
    return null;
  }

  return createOpenRouterClient(apiKey);
}
