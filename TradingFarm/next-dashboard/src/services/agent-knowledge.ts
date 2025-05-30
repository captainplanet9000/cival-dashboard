import { createBrowserClient } from '@/utils/supabase/client';

export interface KnowledgeDocument {
  id: string;
  title: string;
  summary: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface KnowledgeSearchResult {
  id: string;
  document_id: string;
  title: string;
  content: string;
  metadata: Record<string, any>;
}

export interface KnowledgeResponse {
  success: boolean;
  documents?: KnowledgeDocument[];
  results?: KnowledgeSearchResult[];
  error?: string;
}

/**
 * Service for managing agent knowledge and interacting with the ElizaOS knowledge system
 */
class AgentKnowledgeService {
  /**
   * Get all knowledge documents for an agent
   */
  async getAgentKnowledge(agentId: string, limit: number = 20): Promise<KnowledgeResponse> {
    try {
      const response = await fetch(`/api/agents/knowledge?agentId=${agentId}&limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        documents: data.documents
      };
    } catch (error: any) {
      console.error('Error fetching agent knowledge:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Search the knowledge base with a query
   */
  async searchKnowledge(agentId: string, query: string, limit: number = 5): Promise<KnowledgeResponse> {
    try {
      const response = await fetch(`/api/agents/knowledge?agentId=${agentId}&query=${encodeURIComponent(query)}&limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        results: data.results
      };
    } catch (error: any) {
      console.error('Error searching knowledge base:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Add a document to an agent's knowledge base
   */
  async addKnowledgeDocument(
    agentId: string, 
    title: string, 
    content: string, 
    metadata: Record<string, any> = {}
  ): Promise<KnowledgeResponse> {
    try {
      const response = await fetch('/api/agents/knowledge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId,
          title,
          content,
          metadata
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        documents: [data.document]
      };
    } catch (error: any) {
      console.error('Error adding knowledge document:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Import knowledge documents from uploaded files or URLs
   * Uses the ElizaOS RAG system for processing
   */
  async importKnowledge(
    agentId: string,
    sources: Array<File | string>,
    options: {
      chunkSize?: number;
      overlapSize?: number;
      tags?: string[];
    } = {}
  ): Promise<KnowledgeResponse> {
    try {
      // For files, we need to read them and upload the content
      const processedSources = await Promise.all(
        sources.map(async (source) => {
          if (typeof source === 'string') {
            // Source is a URL - return as is
            return { type: 'url', content: source };
          } else {
            // Source is a File - read and return content
            const content = await this.readFileContent(source);
            return { 
              type: 'file', 
              content, 
              name: source.name,
              contentType: source.type 
            };
          }
        })
      );
      
      // Now upload all sources
      const formData = new FormData();
      formData.append('agentId', agentId);
      formData.append('sources', JSON.stringify(processedSources));
      formData.append('options', JSON.stringify(options));
      
      // Mock implementation - in a real app we'd post the form data
      // Instead, we'll add each file as a separate knowledge document
      const results = await Promise.all(
        processedSources.map(async (source) => {
          const title = source.type === 'url' 
            ? `URL Import: ${source.content}` 
            : `File Import: ${(source as any).name}`;
            
          const content = source.type === 'url'
            ? `Content imported from URL: ${source.content}`
            : source.content;
            
          const metadata = {
            source_type: source.type,
            ...(source.type === 'file' && { file_name: (source as any).name }),
            ...(source.type === 'file' && { content_type: (source as any).contentType }),
            import_date: new Date().toISOString(),
            ...(options.tags && { tags: options.tags })
          };
          
          return this.addKnowledgeDocument(agentId, title, content, metadata);
        })
      );
      
      // Combine results
      const successCount = results.filter(r => r.success).length;
      
      return {
        success: successCount > 0,
        documents: results.flatMap(r => r.documents || []),
        error: successCount < results.length ? `${results.length - successCount} imports failed` : undefined
      };
    } catch (error: any) {
      console.error('Error importing knowledge:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Helper method to read a file's content
   */
  private async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(new Error('Failed to read file'));
      
      if (file.type.startsWith('text/') || 
          file.type === 'application/json' ||
          file.name.endsWith('.md') ||
          file.name.endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        // For non-text files, we'd normally use a server-side processor
        // For this implementation, we'll just read as text and warn
        console.warn(`File ${file.name} is not a text file. Processing as text anyway.`);
        reader.readAsText(file);
      }
    });
  }
}

export const agentKnowledgeService = new AgentKnowledgeService();
