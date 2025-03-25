/**
 * Knowledge Management Service
 * 
 * This service integrates with ElizaOS's knowledge management infrastructure,
 * providing vector-based similarity search and Retrieval-Augmented Generation (RAG).
 */

import { KnowledgeResult, KnowledgeDocument } from "@/types/socket";
import { PineconeClient } from "@pinecone-database/pinecone";

export interface QueryOptions {
  filters?: Record<string, any>;
  topK?: number;
  includeMetadata?: boolean;
  namespace?: string;
}

/**
 * Knowledge Management Service for ElizaOS integration
 */
export class KnowledgeService {
  private pineconeClient: PineconeClient | null = null;
  private pineconeIndex: any = null;
  private initialized: boolean = false;
  private indexName: string;
  private embedding_model: string = "text-embedding-ada-002"; // Default model

  constructor() {
    this.indexName = process.env.NEXT_PUBLIC_PINECONE_INDEX || "trading-farm-knowledge";
    this.initPinecone();
  }

  /**
   * Initialize Pinecone client for vector search
   */
  private async initPinecone(): Promise<void> {
    if (this.initialized) return;

    try {
      // Check if knowledge base is enabled
      if (process.env.NEXT_PUBLIC_KNOWLEDGE_BASE_ENABLED !== "true") {
        console.log("Knowledge base is disabled. Skipping initialization.");
        return;
      }

      // Initialize Pinecone client
      this.pineconeClient = new PineconeClient();
      await this.pineconeClient.init({
        apiKey: process.env.NEXT_PUBLIC_PINECONE_API_KEY || "",
        environment: process.env.NEXT_PUBLIC_PINECONE_ENVIRONMENT || "",
      });

      // Get the index
      if (this.pineconeClient) {
        const indexList = await this.pineconeClient.listIndexes();
        
        if (indexList.includes(this.indexName)) {
          this.pineconeIndex = this.pineconeClient.Index(this.indexName);
          this.initialized = true;
          console.log(`Knowledge service initialized with index: ${this.indexName}`);
        } else {
          console.warn(`Knowledge index '${this.indexName}' not found in Pinecone.`);
        }
      }
    } catch (error) {
      console.error("Failed to initialize knowledge service:", error);
    }
  }

  /**
   * Query the knowledge base using natural language
   */
  async queryKnowledge(query: string, options: QueryOptions = {}): Promise<KnowledgeResult> {
    // Default options
    const defaultOptions = {
      topK: 5,
      includeMetadata: true
    };
    
    const queryOptions = { ...defaultOptions, ...options };
    
    try {
      if (!this.initialized) {
        await this.initPinecone();
        
        // If still not initialized, return a fallback response
        if (!this.initialized) {
          return this.getFallbackResponse(query);
        }
      }
      
      // Get embeddings for the query
      const queryEmbedding = await this.getEmbedding(query);
      
      // Perform vector search
      const searchRequest = {
        vector: queryEmbedding,
        topK: queryOptions.topK,
        includeMetadata: queryOptions.includeMetadata,
        namespace: queryOptions.namespace,
      };
      
      if (queryOptions.filters) {
        searchRequest["filter"] = queryOptions.filters;
      }
      
      const searchResponse = await this.pineconeIndex.query(searchRequest);
      
      // Parse and format results
      const documents = searchResponse.matches.map(match => ({
        id: match.id,
        title: match.metadata?.title || "Untitled Document",
        relevance: match.score,
        snippet: match.metadata?.text?.substring(0, 150) + "..." || "No preview available",
        source: match.metadata?.source || "Trading Farm Knowledge Base",
        url: match.metadata?.url,
        timestamp: match.metadata?.timestamp,
        tags: match.metadata?.tags,
      }));
      
      // Generate related queries
      const relatedQueries = this.generateRelatedQueries(query, documents);
      
      return {
        query,
        totalResults: documents.length,
        timestamp: new Date().toISOString(),
        documents,
        sources: [...new Set(documents.map(doc => doc.source))],
        relatedQueries
      };
    } catch (error) {
      console.error("Error querying knowledge base:", error);
      return this.getFallbackResponse(query);
    }
  }
  
  /**
   * Generate embedding for text using OpenAI API
   * This is a simplified version for the frontend
   */
  private async getEmbedding(text: string): Promise<number[]> {
    // In a real implementation, you would call an embedding API
    // For now, we'll generate mock embeddings for testing
    return Array.from({ length: 1536 }, () => Math.random() * 2 - 1);
  }
  
  /**
   * Generate related queries based on the current query and results
   */
  private generateRelatedQueries(query: string, documents: KnowledgeDocument[]): string[] {
    // Simple implementation for related queries
    const queryTerms = query.toLowerCase().split(/\s+/);
    const relatedTerms = new Set<string>();
    
    // Extract potential related terms from document titles and snippets
    documents.forEach(doc => {
      const title = doc.title?.toLowerCase() || '';
      const snippet = doc.snippet.toLowerCase();
      
      // Extract terms that might be related
      const allTerms = [...title.split(/\s+/), ...snippet.split(/\s+/)];
      
      allTerms.forEach(term => {
        // Filter out common words and short terms
        if (term.length > 4 && !["what", "when", "where", "which", "how", "the", "and", "for"].includes(term)) {
          relatedTerms.add(term);
        }
      });
    });
    
    // Filter out terms already in the query
    const filteredTerms = Array.from(relatedTerms).filter(term => !queryTerms.includes(term));
    
    // Construct related queries
    const relatedQueries = [
      `Latest ${queryTerms[queryTerms.length - 1] || 'market'} trends`,
      `${queryTerms[0] || 'trading'} strategies`,
    ];
    
    // Add some queries based on filtered terms
    if (filteredTerms.length > 0) {
      relatedQueries.push(`${queryTerms[0] || ''} ${filteredTerms[0]}`);
    }
    
    if (filteredTerms.length > 1) {
      relatedQueries.push(`${filteredTerms[1]} analysis`);
    }
    
    return relatedQueries.slice(0, 4);
  }
  
  /**
   * Get a fallback response when the knowledge base is unavailable
   */
  private getFallbackResponse(query: string): KnowledgeResult {
    return {
      query,
      totalResults: 0,
      timestamp: new Date().toISOString(),
      documents: [],
      sources: [],
      relatedQueries: [
        "Bitcoin market trends",
        "Ethereum price analysis",
        "Trading strategies for beginners",
        "Crypto market overview"
      ]
    };
  }
}
