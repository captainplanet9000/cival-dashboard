/**
 * Knowledge Service
 * Handles document processing, vector embeddings, and semantic search
 * for the ElizaOS knowledge management system
 */

import { createServerClient } from '@/utils/supabase/server';
import { createBrowserClient } from '@/utils/supabase/client';
import { ApiResponse } from '@/types/api';
import { Database } from '@/types/database.types';

// Document types supported by the system
export enum DocumentSourceType {
  PDF = 'pdf',
  TEXT = 'txt',
  PINESCRIPT = 'pinescript',
  URL = 'url',
  USER_INPUT = 'user_input',
}

// Document interface
export interface BrainDocument {
  id?: string;
  user_id?: string;
  title: string;
  content: string;
  metadata?: Record<string, any>;
  source_type: DocumentSourceType;
  source_url?: string;
  file_path?: string;
  created_at?: string;
  updated_at?: string;
  is_archived?: boolean;
}

// Embedding interface
export interface BrainEmbedding {
  id?: string;
  document_id: string;
  embedding: number[];
  content: string;
  chunk_index: number;
  created_at?: string;
}

// Search result interface
export interface SearchResult {
  document_id: string;
  content: string;
  similarity: number;
  title: string;
  source_type: string;
  metadata: Record<string, any>;
}

// Service configuration
interface ServiceConfig {
  chunkSize: number;
  chunkOverlap: number;
  embeddingModel: string;
  similarityThreshold: number;
  maxResults: number;
}

// Default configuration
const DEFAULT_CONFIG: ServiceConfig = {
  chunkSize: 1000, // Characters per chunk
  chunkOverlap: 200, // Overlap between chunks
  embeddingModel: 'text-embedding-3-small', // OpenAI model
  similarityThreshold: 0.6, // Minimum similarity threshold
  maxResults: 10, // Maximum results to return
};

/**
 * Knowledge Service
 * Handles document processing, embeddings, and semantic search
 */
class KnowledgeService {
  private config: ServiceConfig;
  
  constructor(config: Partial<ServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Get Supabase client based on environment
   */
  private getSupabaseClient() {
    // Use the server client if in a server component, otherwise browser client
    return typeof window === 'undefined' ? 
      createServerClient() : 
      createBrowserClient();
  }
  
  /**
   * Split text into chunks for embedding
   */
  private chunkText(text: string): string[] {
    const { chunkSize, chunkOverlap } = this.config;
    const chunks: string[] = [];
    
    // Simple chunking by characters with overlap
    let index = 0;
    while (index < text.length) {
      const chunk = text.slice(index, index + chunkSize);
      chunks.push(chunk);
      index += chunkSize - chunkOverlap;
    }
    
    return chunks;
  }
  
  /**
   * Create embeddings for text using OpenAI API
   */
  private async createEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const { embeddingModel } = this.config;
      
      // Call OpenAI API to create embeddings
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: embeddingModel,
          input: texts,
        }),
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${error}`);
      }
      
      const result = await response.json();
      
      // Extract embeddings from response
      return result.data.map((item: any) => item.embedding);
    } catch (error: any) {
      console.error('Error creating embeddings:', error);
      throw error;
    }
  }
  
  /**
   * Add a document to the knowledge base
   */
  async addDocument(document: BrainDocument): Promise<ApiResponse<BrainDocument>> {
    try {
      const supabase = this.getSupabaseClient();
      
      // Insert document
      const { data: docData, error: docError } = await supabase
        .from('brain_documents')
        .insert(document)
        .select()
        .single();
      
      if (docError) {
        throw new Error(`Failed to add document: ${docError.message}`);
      }
      
      // Process content into chunks
      const chunks = this.chunkText(document.content);
      
      // Create embeddings for chunks
      const embeddings = await this.createEmbeddings(chunks);
      
      // Prepare embedding records
      const embeddingRecords = chunks.map((content, index) => ({
        document_id: docData.id,
        content,
        embedding: embeddings[index],
        chunk_index: index,
      }));
      
      // Insert embeddings
      const { error: embeddingError } = await supabase
        .from('brain_embeddings')
        .insert(embeddingRecords);
      
      if (embeddingError) {
        throw new Error(`Failed to add embeddings: ${embeddingError.message}`);
      }
      
      return {
        success: true,
        data: docData,
      };
    } catch (error: any) {
      console.error('Error adding document:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
  
  /**
   * Search the knowledge base for similar content
   */
  async searchKnowledge(query: string): Promise<ApiResponse<SearchResult[]>> {
    try {
      const supabase = this.getSupabaseClient();
      
      // Create embedding for the query
      const [queryEmbedding] = await this.createEmbeddings([query]);
      
      // Search for similar documents using the RPC function
      const { data, error } = await supabase.rpc('search_brain_embeddings', {
        query_embedding: queryEmbedding,
        match_threshold: this.config.similarityThreshold,
        match_count: this.config.maxResults,
      });
      
      if (error) {
        throw new Error(`Search failed: ${error.message}`);
      }
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      console.error('Error searching knowledge:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
  
  /**
   * Get a document by ID
   */
  async getDocument(documentId: string): Promise<ApiResponse<BrainDocument>> {
    try {
      const supabase = this.getSupabaseClient();
      
      const { data, error } = await supabase
        .from('brain_documents')
        .select('*')
        .eq('id', documentId)
        .single();
      
      if (error) {
        throw new Error(`Failed to get document: ${error.message}`);
      }
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      console.error('Error getting document:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
  
  /**
   * Delete a document and its embeddings
   */
  async deleteDocument(documentId: string): Promise<ApiResponse<void>> {
    try {
      const supabase = this.getSupabaseClient();
      
      // Deleting the document will cascade delete embeddings
      const { error } = await supabase
        .from('brain_documents')
        .delete()
        .eq('id', documentId);
      
      if (error) {
        throw new Error(`Failed to delete document: ${error.message}`);
      }
      
      return {
        success: true,
      };
    } catch (error: any) {
      console.error('Error deleting document:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
  
  /**
   * List all documents for the current user
   */
  async listDocuments(): Promise<ApiResponse<BrainDocument[]>> {
    try {
      const supabase = this.getSupabaseClient();
      
      const { data, error } = await supabase
        .from('brain_documents')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        throw new Error(`Failed to list documents: ${error.message}`);
      }
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      console.error('Error listing documents:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
  
  /**
   * Upload a file to the brain storage bucket
   */
  async uploadFile(file: File, path: string): Promise<ApiResponse<string>> {
    try {
      const supabase = this.getSupabaseClient();
      
      const { data, error } = await supabase
        .storage
        .from('farm_brain_assets')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        });
      
      if (error) {
        throw new Error(`Failed to upload file: ${error.message}`);
      }
      
      // Get public URL
      const { data: urlData } = supabase
        .storage
        .from('farm_brain_assets')
        .getPublicUrl(path);
      
      return {
        success: true,
        data: urlData.publicUrl,
      };
    } catch (error: any) {
      console.error('Error uploading file:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// Export singleton instance
export const knowledgeService = new KnowledgeService();
export default knowledgeService;
