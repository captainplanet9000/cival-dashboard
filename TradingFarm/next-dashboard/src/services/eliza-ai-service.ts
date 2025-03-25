/**
 * ElizaOS AI Service
 * 
 * Production-ready service for integrating with the Gemma 3 language model
 * to provide natural language processing capabilities for the Trading Farm dashboard
 */

import { Message, MessageType, KnowledgeResult } from "@/types/socket";
import { KnowledgeService } from "./knowledge-service";

// Environment variable for API key
const GEMMA_API_KEY = process.env.NEXT_PUBLIC_GEMMA_API_KEY || '';

// Define Gemma 3 API endpoint
const GEMMA_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemma-3:generateContent';

// Types for Gemma API
interface GemmaRequest {
  contents: {
    role: 'user' | 'model';
    parts: {
      text: string;
    }[];
  }[];
  generationConfig: {
    temperature: number;
    topP: number;
    topK: number;
    maxOutputTokens: number;
  };
}

interface GemmaResponse {
  candidates: {
    content: {
      role: string;
      parts: {
        text: string;
      }[];
    };
    finishReason: string;
    index: number;
    safetyRatings: {
      category: string;
      probability: string;
    }[];
  }[];
}

interface CommandIntent {
  intent: string;
  confidence: number;
  entities: {
    [key: string]: string;
  };
  originalCommand: string;
}

export class ElizaAIService {
  private apiKey: string;
  private knowledgeService: KnowledgeService;
  private useRag: boolean;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || GEMMA_API_KEY;
    this.knowledgeService = new KnowledgeService();
    this.useRag = process.env.NEXT_PUBLIC_USE_RAG === 'true';
  }

  /**
   * Process a natural language command using Gemma 3
   * @param command User's command text
   * @param context Additional context from previous messages
   * @returns AI-processed response
   */
  async processCommand(command: string, context: Message[] = []): Promise<string> {
    try {
      // Check if API key is available
      if (!this.apiKey) {
        console.warn('Gemma API key is not available, using fallback response');
        return this.getFallbackResponse(command);
      }

      // First, detect the intent of the command
      const intent = await this.detectIntent(command);
      
      // If we have a high-confidence intent, we can use structured command handling
      if (intent && intent.confidence > 0.7) {
        // Special handling for knowledge queries
        if (intent.intent === 'knowledge_query' && this.useRag) {
          return this.handleKnowledgeQuery(command, intent);
        }
        return this.handleStructuredCommand(intent);
      }
      
      // Otherwise, use Gemma 3 for natural language response
      // Try RAG-enhanced response if enabled
      if (this.useRag) {
        const ragResponse = await this.generateRagEnhancedResponse(command, context);
        if (ragResponse) {
          return ragResponse;
        }
      }
      
      return this.generateNaturalLanguageResponse(command, context);
    } catch (error) {
      console.error('Error processing command with ElizaAI:', error);
      return `I'm sorry, I encountered an error processing your request. Please try again or use a more specific command.`;
    }
  }

  /**
   * Handle a knowledge query using the KnowledgeService
   * @param query The user's query
   * @param intent The detected intent
   * @returns Response with knowledge from the knowledge base
   */
  private async handleKnowledgeQuery(query: string, intent: CommandIntent): Promise<string> {
    try {
      // Query the knowledge base
      const topic = intent.entities.topic || query;
      const knowledgeResult = await this.knowledgeService.queryKnowledge(topic);
      
      // If no results were found, fall back to LLM response
      if (!knowledgeResult || !knowledgeResult.documents || knowledgeResult.documents.length === 0) {
        return this.generateNaturalLanguageResponse(
          `I couldn't find specific information about "${topic}" in our knowledge base. ${query}`, 
          []
        );
      }
      
      // Generate a response based on the knowledge results
      return this.synthesizeKnowledgeResponse(query, knowledgeResult);
    } catch (error) {
      console.error('Error handling knowledge query:', error);
      return this.generateNaturalLanguageResponse(query, []);
    }
  }
  
  /**
   * Synthesize a response from knowledge base results
   * @param query Original user query
   * @param knowledge Knowledge search results
   * @returns Synthesized response
   */
  private async synthesizeKnowledgeResponse(query: string, knowledge: KnowledgeResult): Promise<string> {
    try {
      // Extract the most relevant passages from documents
      const relevantPassages = knowledge.documents && knowledge.documents.length > 0
        ? knowledge.documents
            .slice(0, 3) // Use top 3 most relevant docs
            .map(doc => doc.snippet)
            .join('\n\n')
        : '';
      
      // Construct a prompt for the LLM to synthesize the information
      const prompt = `
        You are ElizaOS, a trading assistant for the Trading Farm platform.
        
        User query: "${query}"
        
        The following information was retrieved from our knowledge base:
        
        ${relevantPassages}
        
        Based only on the information above, provide a concise and accurate response to the user's query.
        If the information doesn't fully answer the query, acknowledge that and share what you can.
        Keep your response focused on trading, investing, and cryptocurrency topics.
      `;
      
      // Get a synthesized response from the LLM
      const response = await this.callGemmaAPI(prompt);
      
      // Add sources citation if there's more than one source
      if (knowledge.sources && knowledge.sources.length > 1) {
        const sourcesList = Array.from(new Set(knowledge.sources)).join(', ');
        return `${response}\n\nSources: ${sourcesList}`;
      }
      
      return response;
    } catch (error) {
      console.error('Error synthesizing knowledge response:', error);
      // Fall back to a simpler response using the snippets directly
      const topSnippet = knowledge.documents && knowledge.documents.length > 0 
        ? knowledge.documents[0]?.snippet || ''
        : '';
      return `Based on our knowledge base: ${topSnippet}`;
    }
  }
  
  /**
   * Generate a RAG-enhanced response using the knowledge base
   * @param query User's query
   * @param context Conversation context
   * @returns Enhanced response or null if RAG failed
   */
  private async generateRagEnhancedResponse(query: string, context: Message[]): Promise<string | null> {
    try {
      // Query the knowledge base for relevant information
      const knowledgeResult = await this.knowledgeService.queryKnowledge(query, { topK: 5 });
      
      // If no relevant documents found, return null to fallback to standard response
      if (!knowledgeResult || !knowledgeResult.documents || knowledgeResult.documents.length === 0) {
        return null;
      }
      
      // Extract relevant information from the knowledge results
      const relevantContext = knowledgeResult.documents
        .slice(0, 3) // Top 3 most relevant
        .map(doc => `[${doc.source}]: ${doc.snippet}`)
        .join('\n\n');
      
      // Create conversation context
      const contextText = context
        .slice(-5) // Use last 5 messages for context
        .map(msg => {
          const role = msg.type === MessageType.Command ? 'User' : 'ElizaOS';
          return `${role}: ${msg.content}`;
        })
        .join('\n');
      
      // Create RAG prompt
      const prompt = `
        You are ElizaOS, an AI assistant for the Trading Farm platform that helps users with cryptocurrency trading, portfolio management, and market analysis.
        
        Previous conversation:
        ${contextText}
        
        User: ${query}
        
        The following information is from our knowledge base and is relevant to the user's query:
        ${relevantContext}
        
        Using the knowledge base information above, respond as ElizaOS in a helpful, concise, and informative manner.
        Focus on providing accurate trading information and guidance based on the retrieved knowledge.
      `;
      
      // Get enhanced response
      const response = await this.callGemmaAPI(prompt);
      
      return response;
    } catch (error) {
      console.error('Error generating RAG-enhanced response:', error);
      return null; // Fallback to standard response
    }
  }

  /**
   * Detect the intent of a natural language command
   * @param command User's command text
   * @returns Detected intent
   */
  private async detectIntent(command: string): Promise<CommandIntent | null> {
    try {
      const prompt = `
        You are ElizaOS, an AI assistant for a trading platform called Trading Farm.
        Analyze the following user command and extract the intent and entities.
        Respond in JSON format with the following structure:
        {
          "intent": "one of [market_price, portfolio_status, agent_status, trade_execution, knowledge_query, system_help]",
          "confidence": 0.0 to 1.0,
          "entities": {
            "asset": "BTC, ETH, etc. if applicable",
            "amount": "numerical value if applicable",
            "timeframe": "time period if applicable",
            "topic": "knowledge topic if applicable"
          }
        }
        
        User command: "${command}"
      `;

      const response = await this.callGemmaAPI(prompt);
      
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const intentData = JSON.parse(jsonMatch[0]) as CommandIntent;
        intentData.originalCommand = command;
        return intentData;
      }
      
      return null;
    } catch (error) {
      console.error('Error detecting intent:', error);
      return null;
    }
  }

  /**
   * Handle a structured command based on detected intent
   * @param intent Detected command intent
   * @returns Response to the command
   */
  private async handleStructuredCommand(intent: CommandIntent): Promise<string> {
    // This would connect to actual backend services in production
    // For now, we'll return a placeholder that indicates what would happen
    
    switch (intent.intent) {
      case 'market_price':
        const asset = intent.entities.asset?.toUpperCase() || 'BTC';
        return `I would fetch the current market price for ${asset} from our real-time market data service.`;
        
      case 'portfolio_status':
        const timeframe = intent.entities.timeframe || '24h';
        return `I would retrieve your portfolio status over the ${timeframe} timeframe from our portfolio management service.`;
        
      case 'agent_status':
        return `I would check the status of all trading agents or specifically the ones you mentioned.`;
        
      case 'trade_execution':
        const action = intent.originalCommand.toLowerCase().includes('buy') ? 'buy' : 'sell';
        const tradeAsset = intent.entities.asset?.toUpperCase() || 'BTC';
        const amount = intent.entities.amount || 'some';
        return `I would initiate a ${action} order for ${amount} ${tradeAsset} through our trading execution service.`;
        
      case 'knowledge_query':
        const topic = intent.entities.topic || 'general trading';
        return `I would search our knowledge base for information about "${topic}" using vector similarity search.`;
        
      case 'system_help':
        return `
          Here are the commands I can help you with:
          - Check market prices: "What's the price of BTC?" or "Show me ETH price chart"
          - Portfolio management: "How is my portfolio performing?" or "Show my asset allocation"
          - Trading: "Buy 0.1 BTC" or "Sell 5 ETH"
          - Agent management: "Show active agents" or "Pause the BTC momentum agent"
          - Knowledge base: "Explain RSI indicator" or "What is dollar-cost averaging?"
        `;
        
      default:
        return this.generateNaturalLanguageResponse(intent.originalCommand, []);
    }
  }

  /**
   * Generate a natural language response using Gemma 3
   * @param command User's command text
   * @param context Previous messages for conversation context
   * @returns AI-generated response
   */
  private async generateNaturalLanguageResponse(command: string, context: Message[]): Promise<string> {
    // Create a context-aware prompt for Gemma 3
    const contextText = context
      .slice(-5) // Use last 5 messages for context
      .map(msg => {
        const role = msg.type === MessageType.Command ? 'User' : 'ElizaOS';
        return `${role}: ${msg.content}`;
      })
      .join('\n');
    
    const prompt = `
      You are ElizaOS, an AI assistant for the Trading Farm platform that helps users with cryptocurrency trading, portfolio management, and market analysis.
      
      Previous conversation:
      ${contextText}
      
      User: ${command}
      
      Respond as ElizaOS in a helpful, concise, and informative manner. Focus on providing accurate trading information and guidance.
    `;
    
    return this.callGemmaAPI(prompt);
  }
  
  /**
   * Call the Gemma 3 API
   * @param prompt Prompt to send to Gemma 3
   * @returns Gemma 3 response text
   */
  private async callGemmaAPI(prompt: string): Promise<string> {
    try {
      const request: GemmaRequest = {
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 1024
        }
      };
      
      const response = await fetch(`${GEMMA_API_URL}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemma API error: ${response.status} ${errorText}`);
      }
      
      const data = await response.json() as GemmaResponse;
      
      if (data.candidates && data.candidates.length > 0 && 
          data.candidates[0].content && 
          data.candidates[0].content.parts && 
          data.candidates[0].content.parts.length > 0) {
        return data.candidates[0].content.parts[0].text;
      }
      
      throw new Error('No valid response from Gemma API');
    } catch (error) {
      console.error('Error calling Gemma API:', error);
      return this.getFallbackResponse(prompt);
    }
  }
  
  /**
   * Get a fallback response if API calls fail
   * @param command User's command text
   * @returns Fallback response
   */
  private getFallbackResponse(command: string): string {
    const fallbacks = [
      "I understand you're asking about trading. In production, I would connect to real market data to answer this question accurately.",
      "I'd typically process this through our knowledge base, but I'm currently operating in a limited mode. Could you try a more specific command?",
      "I'm designed to help with trading decisions, but I need to connect to our backend services for real-time data.",
      "That's a good question about the markets. In the full version, I would provide detailed analysis based on current market conditions."
    ];
    
    // Attempt to make the fallback somewhat relevant to the command
    if (command.toLowerCase().includes('bitcoin') || command.toLowerCase().includes('btc')) {
      return "You're asking about Bitcoin. In production, I would provide real-time BTC market data and analysis.";
    } else if (command.toLowerCase().includes('portfolio')) {
      return "You're interested in portfolio information. When fully connected, I would display your current holdings and performance metrics.";
    } else if (command.toLowerCase().includes('agent') || command.toLowerCase().includes('bot')) {
      return "You're asking about trading agents. In production, I would display the status and performance of your automated trading strategies.";
    }
    
    // Default random fallback
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
}
