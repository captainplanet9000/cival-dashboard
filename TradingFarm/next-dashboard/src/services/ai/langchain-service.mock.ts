/**
 * Mock LangChain Integration Service for build compatibility
 * This file replaces the actual LangChain implementation to avoid Node.js module dependencies
 */

import { AIModelConfig, AIMessage, AICompletionRequest, AICompletionResponse, AIStreamCallbacks } from './types';

/**
 * Mock Document class
 */
export class Document {
  pageContent: string;
  metadata: Record<string, any>;

  constructor(pageContent: string, metadata: Record<string, any> = {}) {
    this.pageContent = pageContent;
    this.metadata = metadata;
  }
}

/**
 * Mock LangChain service for Trading Farm
 */
export class LangChainService {
  private defaultModelConfig: AIModelConfig;
  private vectorStore: any = null;
  
  constructor(defaultModelConfig?: AIModelConfig) {
    this.defaultModelConfig = defaultModelConfig || {
      provider: 'openai',
      modelName: 'gpt-4o',
      temperature: 0.7,
    };
  }

  /**
   * Simple chat completion
   */
  async chatCompletion(request: AICompletionRequest, modelConfig?: AIModelConfig): Promise<AICompletionResponse> {
    // This is a mock implementation that always returns a fixed response
    return {
      content: "This is a mock AI response for build compatibility. The real implementation would use LangChain.",
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30
      }
    };
  }

  /**
   * Streaming chat completion with callbacks
   */
  async streamingChatCompletion(
    request: AICompletionRequest,
    callbacks: AIStreamCallbacks,
    modelConfig?: AIModelConfig
  ): Promise<void> {
    // This is a mock implementation that immediately calls the callbacks
    callbacks.onStart?.();
    callbacks.onToken?.("This is a mock streaming AI response for build compatibility.");
    callbacks.onComplete?.({
      content: "This is a mock streaming AI response for build compatibility.",
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30
      }
    });
  }

  /**
   * Create a prompt chain using LangChain
   */
  createPromptChain(systemPrompt: string, userPromptTemplate: string, outputParser: any = { parse: (text: string) => text }) {
    // Return a simple function that returns the mock response
    return async (input: any) => {
      return "This is a mock chain response from a prompt template.";
    };
  }

  /**
   * Initialize vector store for document embedding and retrieval
   */
  async initVectorStore(documents: Document[], embeddingModelName = 'text-embedding-3-small') {
    // Just store the documents in memory
    this.vectorStore = {
      documents,
      similaritySearch: (query: string, k = 4) => {
        return documents.slice(0, k);
      }
    };
    return this.vectorStore;
  }

  /**
   * Perform similarity search on vector store
   */
  async similaritySearch(query: string, k = 4) {
    if (!this.vectorStore) {
      return [];
    }
    return this.vectorStore.documents.slice(0, k);
  }

  /**
   * Set default model configuration
   */
  setDefaultModelConfig(config: AIModelConfig) {
    this.defaultModelConfig = config;
  }
}

export default LangChainService;
