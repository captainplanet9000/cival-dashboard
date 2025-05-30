/**
 * Knowledge Management Service for Trading Farm + ElizaOS Integration
 * 
 * Provides a unified interface for accessing and managing knowledge across 
 * the Trading Farm ecosystem, leveraging ElizaOS's RAG capabilities.
 */

import { createBrowserClient } from '@/utils/supabase/client';
import { elizaOS } from '@/integrations/elizaos';
import { TRADING_EVENTS } from '@/types/elizaos';

export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  content: string;
  metadata: Record<string, any>;
  embedding: number[] | null;
}

export interface SearchResult {
  document: KnowledgeDocument;
  relevance: number;
  context?: string;
}

export interface KnowledgeQuery {
  query: string;
  filters?: Record<string, any>;
  limit?: number;
  minRelevance?: number;
}

export interface KnowledgeStatistics {
  documentCount: number;
  chunkCount: number;
  categoryBreakdown: Record<string, number>;
  lastUpdated: string;
}

class KnowledgeService {
  private supabase;
  private isElizaConnected: boolean;
  private messageListeners: Array<(message: any) => void> = [];

  constructor() {
    this.supabase = createBrowserClient();
    this.isElizaConnected = elizaOS.isConnected;
    
    // Set up ElizaOS event listeners
    elizaOS.addEventListener('message', this.handleElizaMessage.bind(this));
    elizaOS.addStatusListener(this.handleElizaStatusChange.bind(this));
  }

  /**
   * Handle ElizaOS status changes
   */
  private handleElizaStatusChange(status: boolean) {
    this.isElizaConnected = status;
  }

  /**
   * Handle messages from ElizaOS
   */
  private handleElizaMessage(message: any) {
    // Handle knowledge-related messages
    if (message.type === TRADING_EVENTS.KNOWLEDGE_RESPONSE) {
      this.notifyMessageListeners(message);
    }
  }

  /**
   * Add a listener for knowledge messages
   */
  public addMessageListener(listener: (message: any) => void) {
    this.messageListeners.push(listener);
  }

  /**
   * Remove a listener for knowledge messages
   */
  public removeMessageListener(listener: (message: any) => void) {
    this.messageListeners = this.messageListeners.filter(l => l !== listener);
  }

  /**
   * Notify all message listeners
   */
  private notifyMessageListeners(message: any) {
    this.messageListeners.forEach(listener => listener(message));
  }

  /**
   * Check if ElizaOS is connected
   */
  public isConnected(): boolean {
    return this.isElizaConnected;
  }

  /**
   * Get all knowledge documents
   */
  public async getDocuments(): Promise<KnowledgeDocument[]> {
    const { data, error } = await this.supabase
      .from('knowledge_documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  }

  /**
   * Get a specific knowledge document by ID
   */
  public async getDocument(id: string): Promise<KnowledgeDocument> {
    const { data, error } = await this.supabase
      .from('knowledge_documents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * Create a new knowledge document
   */
  public async createDocument(document: Partial<KnowledgeDocument>): Promise<KnowledgeDocument> {
    // Prepare document for insertion
    const documentToInsert = {
      title: document.title,
      content: document.content,
      metadata: document.metadata || {}
    };

    // If ElizaOS is connected, use its embeddings feature
    if (this.isElizaConnected) {
      try {
        // ElizaOS will process and chunk the document
        await elizaOS.sendCommand('process_knowledge_document', {
          title: document.title,
          content: document.content,
          metadata: document.metadata
        });
      } catch (error) {
        console.error('Error processing document with ElizaOS:', error);
        // Continue with creating the document even if ElizaOS fails
      }
    }

    // Insert document into database
    const { data, error } = await this.supabase
      .from('knowledge_documents')
      .insert(documentToInsert)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * Update an existing knowledge document
   */
  public async updateDocument(id: string, document: Partial<KnowledgeDocument>): Promise<KnowledgeDocument> {
    // Prepare document for update
    const documentToUpdate = {
      title: document.title,
      content: document.content,
      metadata: document.metadata
    };

    // If ElizaOS is connected, use its embeddings feature to reprocess the document
    if (this.isElizaConnected) {
      try {
        await elizaOS.sendCommand('update_knowledge_document', {
          document_id: id,
          title: document.title,
          content: document.content,
          metadata: document.metadata
        });
      } catch (error) {
        console.error('Error updating document with ElizaOS:', error);
        // Continue with updating the document even if ElizaOS fails
      }
    }

    // Update document in database
    const { data, error } = await this.supabase
      .from('knowledge_documents')
      .update(documentToUpdate)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * Delete a knowledge document
   */
  public async deleteDocument(id: string): Promise<void> {
    // If ElizaOS is connected, notify it about the document deletion
    if (this.isElizaConnected) {
      try {
        await elizaOS.sendCommand('delete_knowledge_document', {
          document_id: id
        });
      } catch (error) {
        console.error('Error deleting document from ElizaOS:', error);
        // Continue with deleting the document even if ElizaOS fails
      }
    }

    // Delete document from database
    const { error } = await this.supabase
      .from('knowledge_documents')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  }

  /**
   * Perform a semantic search in the knowledge base
   */
  public async search(query: KnowledgeQuery): Promise<SearchResult[]> {
    // If ElizaOS is connected, use its semantic search capabilities
    if (this.isElizaConnected) {
      try {
        const results = await elizaOS.sendCommand('search_knowledge_base', {
          query: query.query,
          filters: query.filters,
          limit: query.limit || 10,
          min_relevance: query.minRelevance || 0.7
        });

        return results.map((result: any) => ({
          document: result.document,
          relevance: result.relevance,
          context: result.context
        }));
      } catch (error) {
        console.error('Error searching with ElizaOS:', error);
        // Fall back to basic search if ElizaOS fails
      }
    }

    // Fall back to basic text search using database
    const { data, error } = await this.supabase
      .from('knowledge_documents')
      .select('*')
      .textSearch('content', query.query)
      .limit(query.limit || 10);

    if (error) {
      throw error;
    }

    // Convert to search results format
    return (data || []).map(doc => ({
      document: doc,
      relevance: 1.0, // No actual relevance score available
      context: null // No context available in fallback mode
    }));
  }

  /**
   * Ask a question to the knowledge base
   */
  public async askQuestion(question: string, context?: Record<string, any>): Promise<string> {
    // This requires ElizaOS to be connected for AI question answering
    if (!this.isElizaConnected) {
      throw new Error('ElizaOS is not connected. Cannot ask AI questions.');
    }

    // Send the question to ElizaOS
    const response = await elizaOS.sendCommand('ask_knowledge_base', {
      question,
      context
    });

    return response.answer;
  }

  /**
   * Get statistics about the knowledge base
   */
  public async getStatistics(): Promise<KnowledgeStatistics> {
    // Count total documents
    const { count: documentCount, error: docError } = await this.supabase
      .from('knowledge_documents')
      .select('*', { count: 'exact', head: true });

    if (docError) {
      throw docError;
    }

    // Get category breakdown from document metadata
    const { data: categoriesData, error: catError } = await this.supabase
      .from('knowledge_documents')
      .select('metadata');

    if (catError) {
      throw catError;
    }

    // Extract categories and count occurrences
    const categoryBreakdown: Record<string, number> = {};
    (categoriesData || []).forEach(doc => {
      const category = doc.metadata?.category || 'Uncategorized';
      categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;
    });

    // If ElizaOS is connected, get more detailed statistics
    let chunkCount = 0;
    let lastUpdated = new Date().toISOString();

    if (this.isElizaConnected) {
      try {
        const elizaStats = await elizaOS.sendCommand('get_knowledge_stats', {});
        chunkCount = elizaStats.chunk_count || 0;
        lastUpdated = elizaStats.last_updated || lastUpdated;
      } catch (error) {
        console.error('Error getting ElizaOS knowledge statistics:', error);
        // Continue with basic stats if ElizaOS fails
      }
    }

    return {
      documentCount: documentCount || 0,
      chunkCount,
      categoryBreakdown,
      lastUpdated
    };
  }
}

// Create a singleton instance
export const knowledgeService = new KnowledgeService();

export default knowledgeService;
