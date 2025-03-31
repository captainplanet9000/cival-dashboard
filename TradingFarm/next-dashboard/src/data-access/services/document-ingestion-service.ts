/**
 * Document Ingestion Service
 * 
 * This service processes documentation and ingests it into the Trading Farm's
 * memory systems (vector database and knowledge graph) for use by agents.
 */

import { v4 as uuidv4 } from 'uuid';
import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabase-client';
import { TradingFarmMemory } from '../memory/trading-farm-memory';
import { API_CONFIG } from './api-config';

// Document types that can be ingested
export type DocumentType = 'requirements' | 'technical' | 'workflow' | 'architecture' | 'guidelines';

// Represents a section of a document for chunking
export interface DocumentChunk {
  id: string;
  document_id: string;
  content: string;
  metadata: {
    title: string;
    document_type: DocumentType;
    section?: string;
    source?: string;
    created_at: string;
    version?: string;
    tags?: string[];
  };
  embedding?: number[];
}

// Document structure for ingestion
export interface DocumentForIngestion {
  title: string;
  content: string;
  document_type: DocumentType;
  metadata?: {
    version?: string;
    source?: string;
    author?: string;
    tags?: string[];
  };
}

export class DocumentIngestionService {
  private static instance: DocumentIngestionService;
  private supabase: SupabaseClient;
  private memorySystem: TradingFarmMemory;
  private openaiApiKey: string;
  private initialized: boolean = false;

  // Singleton instance getter
  public static getInstance(): DocumentIngestionService {
    if (!DocumentIngestionService.instance) {
      DocumentIngestionService.instance = new DocumentIngestionService();
    }
    return DocumentIngestionService.instance;
  }

  private constructor() {
    this.supabase = getSupabaseClient();
    this.memorySystem = TradingFarmMemory.getInstance();
    this.openaiApiKey = API_CONFIG.OPENAI_API_KEY || '';
  }

  /**
   * Initialize the service
   */
  public initialize(openaiApiKey?: string): void {
    if (openaiApiKey) {
      this.openaiApiKey = openaiApiKey;
    }
    
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key is required for document ingestion');
    }
    
    this.initialized = true;
  }

  /**
   * Ingest a document into the Trading Farm memory system
   */
  public async ingestDocument(document: DocumentForIngestion): Promise<string> {
    this.ensureInitialized();
    
    try {
      console.log(`Starting ingestion of document: ${document.title}`);
      
      // Generate a unique ID for this document
      const documentId = uuidv4();
      
      // Chunk the document into manageable sections
      const chunks = this.chunkDocument(documentId, document);
      
      // Generate embeddings for each chunk
      const chunksWithEmbeddings = await this.generateEmbeddings(chunks);
      
      // Store chunks in vector database
      await this.storeDocumentChunks(chunksWithEmbeddings);
      
      // Create knowledge graph connections
      await this.createKnowledgeGraphEntries(documentId, document, chunks);
      
      console.log(`Successfully ingested document: ${document.title}`);
      
      return documentId;
    } catch (error) {
      console.error('Error ingesting document:', error);
      throw new Error(`Failed to ingest document: ${error}`);
    }
  }

  /**
   * Ingest FARMDOCS into the Trading Farm memory system
   */
  public async ingestFarmDocs(farmDocs: Record<string, string>): Promise<Record<string, string>> {
    this.ensureInitialized();
    
    const documentIds: Record<string, string> = {};
    
    try {
      console.log('Starting ingestion of FARMDOCS...');
      
      // Process each document in FARMDOCS
      const documents: DocumentForIngestion[] = [
        {
          title: 'Project Requirements Document',
          content: farmDocs['Project Requirements Document'] || '',
          document_type: 'requirements',
          metadata: {
            version: '1.0',
            source: 'FARMDOCS',
            tags: ['requirements', 'specifications', 'project']
          }
        },
        {
          title: 'Tech Stack & APIs Document',
          content: farmDocs['Tech Stack & APIs Document'] || '',
          document_type: 'technical',
          metadata: {
            version: '1.0',
            source: 'FARMDOCS',
            tags: ['tech-stack', 'apis', 'integrations', 'libraries']
          }
        },
        {
          title: 'App Flow Document',
          content: farmDocs['App Flow Document'] || '',
          document_type: 'workflow',
          metadata: {
            version: '1.0',
            source: 'FARMDOCS',
            tags: ['workflow', 'dataflow', 'user-journey', 'system-interaction']
          }
        },
        {
          title: 'Backend Structure Document',
          content: farmDocs['Backend Structure Document'] || '',
          document_type: 'architecture',
          metadata: {
            version: '1.0',
            source: 'FARMDOCS',
            tags: ['backend', 'database', 'schema', 'architecture']
          }
        },
        {
          title: 'Frontend Guidelines',
          content: farmDocs['Frontend Guidelines'] || '',
          document_type: 'guidelines',
          metadata: {
            version: '1.0',
            source: 'FARMDOCS',
            tags: ['frontend', 'ui', 'ux', 'components', 'styles']
          }
        }
      ];
      
      // Process each document
      for (const document of documents) {
        if (!document.content) {
          console.warn(`Skipping empty document: ${document.title}`);
          continue;
        }
        
        const documentId = await this.ingestDocument(document);
        documentIds[document.title] = documentId;
      }
      
      // Create relationships between documents
      await this.createDocumentRelationships(documentIds);
      
      console.log('Successfully ingested all FARMDOCS documents');
      
      return documentIds;
    } catch (error) {
      console.error('Error ingesting FARMDOCS:', error);
      throw new Error(`Failed to ingest FARMDOCS: ${error}`);
    }
  }

  /**
   * Search for documents in the vector database
   */
  public async searchDocuments(query: string, limit: number = 5): Promise<DocumentChunk[]> {
    this.ensureInitialized();
    
    try {
      // Generate embedding for the query
      const embedding = await this.generateEmbeddingForText(query);
      
      // Search in vector database
      const { data, error } = await this.supabase.rpc('search_document_chunks', {
        query_embedding: embedding,
        match_threshold: 0.7,
        match_count: limit
      });
      
      if (error) throw error;
      
      return data as DocumentChunk[];
    } catch (error) {
      console.error('Error searching documents:', error);
      throw new Error(`Failed to search documents: ${error}`);
    }
  }

  /**
   * Retrieve a specific document by ID
   */
  public async getDocumentById(documentId: string): Promise<DocumentChunk[]> {
    this.ensureInitialized();
    
    try {
      const { data, error } = await this.supabase
        .from('document_chunks')
        .select('*')
        .eq('document_id', documentId);
      
      if (error) throw error;
      
      return data as DocumentChunk[];
    } catch (error) {
      console.error('Error retrieving document:', error);
      throw new Error(`Failed to retrieve document: ${error}`);
    }
  }

  /**
   * Delete a document and its chunks
   */
  public async deleteDocument(documentId: string): Promise<void> {
    this.ensureInitialized();
    
    try {
      // Delete from vector database
      const { error } = await this.supabase
        .from('document_chunks')
        .delete()
        .eq('document_id', documentId);
      
      if (error) throw error;
      
      // Delete from knowledge graph (would need implementation based on graphiti)
      // await this.memorySystem.deleteDocumentNodes(documentId);
      
      console.log(`Successfully deleted document: ${documentId}`);
    } catch (error) {
      console.error('Error deleting document:', error);
      throw new Error(`Failed to delete document: ${error}`);
    }
  }

  // Private helper methods

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('DocumentIngestionService not initialized. Call initialize() first.');
    }
  }

  /**
   * Break a document into manageable chunks for vector storage
   */
  private chunkDocument(documentId: string, document: DocumentForIngestion): DocumentChunk[] {
    // Simple chunking by paragraphs (in a production system, this would be more sophisticated)
    const paragraphs = document.content.split('\n\n');
    const chunks: DocumentChunk[] = [];
    
    // Group paragraphs to form reasonable chunk sizes (roughly 1000-1500 chars)
    let currentChunk = '';
    let currentSection = '';
    
    for (const paragraph of paragraphs) {
      // Check if this is a section header
      const sectionMatch = paragraph.match(/^#+\s+(.+)$/);
      
      if (sectionMatch) {
        // If we have content in the current chunk, save it
        if (currentChunk.length > 0) {
          chunks.push({
            id: uuidv4(),
            document_id: documentId,
            content: currentChunk,
            metadata: {
              title: document.title,
              document_type: document.document_type,
              section: currentSection,
              source: document.metadata?.source,
              created_at: new Date().toISOString(),
              version: document.metadata?.version,
              tags: document.metadata?.tags
            }
          });
        }
        
        // Start a new chunk with this section header
        currentSection = sectionMatch[1];
        currentChunk = paragraph;
      } else {
        // If adding this paragraph exceeds our target chunk size and we already have content,
        // save the current chunk and start a new one
        if (currentChunk.length > 0 && (currentChunk.length + paragraph.length) > 1500) {
          chunks.push({
            id: uuidv4(),
            document_id: documentId,
            content: currentChunk,
            metadata: {
              title: document.title,
              document_type: document.document_type,
              section: currentSection,
              source: document.metadata?.source,
              created_at: new Date().toISOString(),
              version: document.metadata?.version,
              tags: document.metadata?.tags
            }
          });
          
          // Start a new chunk
          currentChunk = paragraph;
        } else {
          // Add to the current chunk
          currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        }
      }
    }
    
    // Add the last chunk if it has content
    if (currentChunk.length > 0) {
      chunks.push({
        id: uuidv4(),
        document_id: documentId,
        content: currentChunk,
        metadata: {
          title: document.title,
          document_type: document.document_type,
          section: currentSection,
          source: document.metadata?.source,
          created_at: new Date().toISOString(),
          version: document.metadata?.version,
          tags: document.metadata?.tags
        }
      });
    }
    
    return chunks;
  }

  /**
   * Generate embeddings for document chunks using OpenAI API
   */
  private async generateEmbeddings(chunks: DocumentChunk[]): Promise<DocumentChunk[]> {
    const chunksWithEmbeddings: DocumentChunk[] = [];
    
    for (const chunk of chunks) {
      try {
        const embedding = await this.generateEmbeddingForText(chunk.content);
        chunksWithEmbeddings.push({
          ...chunk,
          embedding
        });
      } catch (error) {
        console.error(`Error generating embedding for chunk ${chunk.id}:`, error);
        // Still include the chunk without embedding
        chunksWithEmbeddings.push(chunk);
      }
    }
    
    return chunksWithEmbeddings;
  }

  /**
   * Generate an embedding for a text string using OpenAI API
   */
  private async generateEmbeddingForText(text: string): Promise<number[]> {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'text-embedding-ada-002',
          input: text
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Store document chunks in Supabase vector database
   */
  private async storeDocumentChunks(chunks: DocumentChunk[]): Promise<void> {
    if (chunks.length === 0) return;
    
    try {
      // Insert chunks in batches to avoid request size limitations
      const batchSize = 10;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        
        const { error } = await this.supabase
          .from('document_chunks')
          .insert(batch);
        
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error storing document chunks:', error);
      throw error;
    }
  }

  /**
   * Create knowledge graph entries for document
   */
  private async createKnowledgeGraphEntries(
    documentId: string,
    document: DocumentForIngestion,
    chunks: DocumentChunk[]
  ): Promise<void> {
    try {
      // In a production system, this would integrate with graphiti-client
      // Here's a placeholder for what that might look like:
      
      // Create a document node
      // await this.memorySystem.createNode('Document', {
      //   id: documentId,
      //   title: document.title,
      //   document_type: document.document_type,
      //   ...document.metadata
      // });
      
      // Create nodes for each section and connect to the document
      // const sections = new Set(chunks.map(chunk => chunk.metadata.section).filter(Boolean));
      // for (const section of sections) {
      //   const sectionId = uuidv4();
      //   await this.memorySystem.createNode('Section', {
      //     id: sectionId,
      //     title: section,
      //     document_id: documentId
      //   });
      //   await this.memorySystem.createEdge('CONTAINS', documentId, sectionId, { weight: 1.0 });
      // }
      
      // For now, we'll just log a placeholder message
      console.log(`Knowledge graph entries would be created for document: ${documentId}`);
    } catch (error) {
      console.error('Error creating knowledge graph entries:', error);
      throw error;
    }
  }

  /**
   * Create relationships between documents
   */
  private async createDocumentRelationships(documentIds: Record<string, string>): Promise<void> {
    try {
      // In a production system, this would integrate with graphiti-client
      // Here's a placeholder for what that might look like:
      
      // Connect requirements to tech stack
      // await this.memorySystem.createEdge(
      //   'IMPLEMENTS',
      //   documentIds['Tech Stack & APIs Document'],
      //   documentIds['Project Requirements Document'],
      //   { weight: 0.9 }
      // );
      
      // Connect app flow to requirements
      // await this.memorySystem.createEdge(
      //   'FULFILLS',
      //   documentIds['App Flow Document'],
      //   documentIds['Project Requirements Document'],
      //   { weight: 0.8 }
      // );
      
      // Connect backend to tech stack
      // await this.memorySystem.createEdge(
      //   'BASED_ON',
      //   documentIds['Backend Structure Document'],
      //   documentIds['Tech Stack & APIs Document'],
      //   { weight: 0.9 }
      // );
      
      // Connect frontend to tech stack
      // await this.memorySystem.createEdge(
      //   'BASED_ON',
      //   documentIds['Frontend Guidelines'],
      //   documentIds['Tech Stack & APIs Document'],
      //   { weight: 0.9 }
      // );
      
      // Connect frontend to app flow
      // await this.memorySystem.createEdge(
      //   'IMPLEMENTS',
      //   documentIds['Frontend Guidelines'],
      //   documentIds['App Flow Document'],
      //   { weight: 0.8 }
      // );
      
      // For now, we'll just log a placeholder message
      console.log('Document relationships would be created between FARMDOCS documents.');
    } catch (error) {
      console.error('Error creating document relationships:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const documentIngestionService = DocumentIngestionService.getInstance(); 