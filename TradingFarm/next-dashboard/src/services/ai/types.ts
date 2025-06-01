/**
 * AI Service Types
 * Define type definitions for AI services used in Trading Farm
 */

export type AIModelProvider = 'openai' | 'anthropic' | 'google' | 'localai';

export interface AIModelConfig {
  provider: AIModelProvider;
  modelName: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface AIServiceOptions {
  model: AIModelConfig;
  streaming?: boolean;
  callbacks?: any[];
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
  functionCall?: {
    name: string;
    arguments: string;
  };
}

export interface AICompletionRequest {
  messages: AIMessage[];
  functions?: AIFunctionDefinition[];
  temperature?: number;
  maxTokens?: number;
}

export interface AICompletionResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  functionCall?: {
    name: string;
    arguments: Record<string, any>;
  };
}

export interface AIFunctionDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface AIStreamCallbacks {
  onStart?: () => void;
  onToken?: (token: string) => void;
  onComplete?: (completion: AICompletionResponse) => void;
  onError?: (error: Error) => void;
}

// Vector Store types
export interface VectorStoreDocument {
  id: string;
  pageContent: string;
  metadata: Record<string, any>;
  embedding?: number[];
}

export type TradingFarmAICapability = 
  | 'market-analysis'
  | 'strategy-recommendation'
  | 'risk-assessment'
  | 'performance-insights'
  | 'sentiment-analysis'
  | 'portfolio-optimization';
