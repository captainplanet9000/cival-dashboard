/**
 * LangChain Integration Service
 * Provides unified access to LangChain functionality for Trading Farm features
 */

import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage, AIMessage, FunctionMessage } from '@langchain/core/messages';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { HNSWLib } from '@langchain/community/vectorstores/hnswlib';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Document } from '@langchain/core/documents';

import { AIModelConfig, AIMessage as AIServiceMessage, AICompletionRequest, AICompletionResponse, AIStreamCallbacks } from './types';

/**
 * Creates a LangChain chat model based on the provided model config
 */
function createChatModel(config: AIModelConfig) {
  const { provider, modelName, temperature = 0.7, maxTokens } = config;
  
  const modelConfig = {
    temperature,
    modelName,
    maxTokens,
    streaming: false,
  };
  
  switch (provider) {
    case 'openai':
      return new ChatOpenAI({
        ...modelConfig,
        openAIApiKey: config.apiKey,
      });
    case 'anthropic':
      return new ChatAnthropic({
        ...modelConfig,
        anthropicApiKey: config.apiKey,
      });
    case 'google':
      return new ChatGoogleGenerativeAI({
        ...modelConfig,
        apiKey: config.apiKey,
      });
    default:
      throw new Error(`Unsupported model provider: ${provider}`);
  }
}

/**
 * Converts service messages to LangChain messages
 */
function convertToLangChainMessages(messages: AIServiceMessage[]) {
  return messages.map(message => {
    switch (message.role) {
      case 'system':
        return new SystemMessage(message.content);
      case 'user':
        return new HumanMessage(message.content);
      case 'assistant':
        return new AIMessage(message.content);
      case 'function':
        return new FunctionMessage({
          content: message.content,
          name: message.name || 'function',
        });
      default:
        return new HumanMessage(message.content);
    }
  });
}

/**
 * LangChain service for Trading Farm
 */
export class LangChainService {
  private defaultModelConfig: AIModelConfig;
  private vectorStore: HNSWLib | null = null;
  
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
    const config = modelConfig || this.defaultModelConfig;
    const model = createChatModel(config);
    
    const lcMessages = convertToLangChainMessages(request.messages);
    const response = await model.invoke(lcMessages);
    
    return {
      content: response.content,
      usage: {
        promptTokens: 0, // LangChain doesn't expose these directly
        completionTokens: 0,
        totalTokens: 0,
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
    const config = modelConfig || this.defaultModelConfig;
    const lcMessages = convertToLangChainMessages(request.messages);
    
    try {
      callbacks.onStart?.();
      
      // Create a streaming model
      const model = createChatModel({
        ...config,
        streaming: true,
      });
      
      const stream = await model.stream(lcMessages);
      
      let completeContent = '';
      for await (const chunk of stream) {
        if (chunk.content) {
          completeContent += chunk.content;
          callbacks.onToken?.(chunk.content);
        }
      }
      
      callbacks.onComplete?.({
        content: completeContent,
      });
    } catch (error) {
      callbacks.onError?.(error as Error);
    }
  }

  /**
   * Create a prompt chain using LangChain
   */
  createPromptChain(systemPrompt: string, userPromptTemplate: string, outputParser = new StringOutputParser()) {
    const model = createChatModel(this.defaultModelConfig);
    
    const promptTemplate = PromptTemplate.fromTemplate(userPromptTemplate);
    
    return RunnableSequence.from([
      promptTemplate,
      (formattedPrompt) => [
        new SystemMessage(systemPrompt),
        new HumanMessage(formattedPrompt),
      ],
      model,
      outputParser,
    ]);
  }

  /**
   * Initialize vector store for document embedding and retrieval
   */
  async initVectorStore(documents: Document[], embeddingModelName = 'text-embedding-3-small') {
    const embeddings = new OpenAIEmbeddings({
      modelName: embeddingModelName,
      openAIApiKey: this.defaultModelConfig.apiKey,
    });
    
    this.vectorStore = await HNSWLib.fromDocuments(documents, embeddings);
    return this.vectorStore;
  }

  /**
   * Perform similarity search on vector store
   */
  async similaritySearch(query: string, k = 4) {
    if (!this.vectorStore) {
      throw new Error('Vector store not initialized. Call initVectorStore first.');
    }
    
    return this.vectorStore.similaritySearch(query, k);
  }

  /**
   * Set default model configuration
   */
  setDefaultModelConfig(config: AIModelConfig) {
    this.defaultModelConfig = config;
  }
}

export default LangChainService;
