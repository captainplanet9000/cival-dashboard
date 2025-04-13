/**
 * Agent Knowledge Integration Service
 * Connects ElizaOS agents with the knowledge management system
 */

import { createServerClient } from '@/utils/supabase/server';
import { createBrowserClient } from '@/utils/supabase/client';
import { knowledgeService } from '@/services/knowledge-service';
import { TradingEventEmitter, TRADING_EVENTS } from '@/utils/events/trading-events';
import { ElizaAgent, AgentRun } from '@/services/agent-service';

// Types for knowledge retrieval
export interface KnowledgeQueryOptions {
  query: string;
  documentIds?: string[];
  limit?: number;
  similarityThreshold?: number;
  filterMetadata?: Record<string, any>;
}

export interface KnowledgeReference {
  content: string;
  documentId: string;
  documentName?: string;
  similarity: number;
  chunkId: string;
  metadata?: Record<string, any>;
}

/**
 * Service for integrating agents with knowledge management
 */
export const agentKnowledgeIntegration = {
  /**
   * Query knowledge base for an agent
   */
  async queryAgentKnowledge(
    agentId: string, 
    options: KnowledgeQueryOptions
  ): Promise<{ success: boolean; results?: KnowledgeReference[]; error?: string }> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      // Get agent details to determine knowledge_ids
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single();
      
      if (agentError || !agent) {
        return { 
          success: false, 
          error: agentError ? agentError.message : 'Agent not found' 
        };
      }
      
      // If agent has specific knowledge IDs, use those for the search
      const documentIds = options.documentIds || 
        (Array.isArray(agent.knowledge_ids) ? agent.knowledge_ids : []);
      
      // Query the knowledge base using the knowledge service
      const searchResults = await knowledgeService.semanticSearch({
        query: options.query,
        documentIds: documentIds.length > 0 ? documentIds : undefined,
        limit: options.limit || 5,
        similarityThreshold: options.similarityThreshold || 0.7,
        filterMetadata: options.filterMetadata
      });
      
      if (!searchResults.success) {
        return { 
          success: false, 
          error: searchResults.error || 'Knowledge search failed' 
        };
      }
      
      // Format the results
      const results = searchResults.results.map(result => ({
        content: result.content,
        documentId: result.document_id,
        documentName: result.document_name,
        similarity: result.similarity,
        chunkId: result.chunk_id,
        metadata: result.metadata
      }));
      
      // Emit event for monitoring
      TradingEventEmitter.emit(TRADING_EVENTS.AGENT_KNOWLEDGE_QUERIED, {
        agentId,
        query: options.query,
        resultCount: results.length,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        results
      };
    } catch (error: any) {
      console.error('Error querying agent knowledge:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Record knowledge usage during agent run
   */
  async recordKnowledgeUsage(
    agentId: string,
    runId: string,
    knowledgeReferences: {
      documentId: string;
      chunkId: string;
      relevanceScore?: number;
    }[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      // Create knowledge usage entries
      const usageEntries = knowledgeReferences.map(ref => ({
        agent_id: agentId,
        run_id: runId,
        document_id: ref.documentId,
        chunk_id: ref.chunkId,
        relevance_score: ref.relevanceScore || 1.0,
        used_at: new Date().toISOString()
      }));
      
      // Insert usage records into database
      const { error } = await supabase
        .from('agent_knowledge_usage')
        .insert(usageEntries);
      
      if (error) {
        console.error('Error recording knowledge usage:', error);
        return {
          success: false,
          error: error.message
        };
      }
      
      // Emit event for tracking
      TradingEventEmitter.emit(TRADING_EVENTS.AGENT_KNOWLEDGE_USED, {
        agentId,
        runId,
        usageCount: knowledgeReferences.length,
        timestamp: new Date().toISOString()
      });
      
      return { success: true };
    } catch (error: any) {
      console.error('Error recording knowledge usage:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Get knowledge stats for an agent
   */
  async getAgentKnowledgeStats(
    agentId: string
  ): Promise<{ 
    success: boolean; 
    stats?: { 
      totalDocuments: number; 
      recentQueries: string[];
      topDocuments: { documentId: string; documentName: string; usageCount: number }[];
    }; 
    error?: string 
  }> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      // Get agent details
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single();
      
      if (agentError || !agent) {
        return { 
          success: false, 
          error: agentError ? agentError.message : 'Agent not found' 
        };
      }
      
      // Get document count
      const documentIds = Array.isArray(agent.knowledge_ids) ? agent.knowledge_ids : [];
      
      // Get recent knowledge usage
      const { data: recentUsage, error: usageError } = await supabase
        .from('agent_knowledge_usage')
        .select('*')
        .eq('agent_id', agentId)
        .order('used_at', { ascending: false })
        .limit(20);
      
      if (usageError) {
        return {
          success: false,
          error: usageError.message
        };
      }
      
      // Get document details for used documents
      const usedDocumentIds = [...new Set(recentUsage?.map(usage => usage.document_id) || [])];
      
      if (usedDocumentIds.length === 0) {
        return {
          success: true,
          stats: {
            totalDocuments: documentIds.length,
            recentQueries: [],
            topDocuments: []
          }
        };
      }
      
      const { data: documents, error: documentsError } = await supabase
        .from('brain_documents')
        .select('id, name')
        .in('id', usedDocumentIds);
      
      if (documentsError) {
        return {
          success: false,
          error: documentsError.message
        };
      }
      
      // Count document usage
      const docUsageCount: Record<string, number> = {};
      recentUsage?.forEach(usage => {
        docUsageCount[usage.document_id] = (docUsageCount[usage.document_id] || 0) + 1;
      });
      
      // Get top documents
      const topDocuments = Object.entries(docUsageCount)
        .map(([documentId, usageCount]) => {
          const doc = documents?.find(d => d.id === documentId);
          return {
            documentId,
            documentName: doc?.name || 'Unknown Document',
            usageCount
          };
        })
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 5);
      
      // Get recent unique queries from run data
      const { data: recentRuns, error: runsError } = await supabase
        .from('agent_runs')
        .select('id, data')
        .eq('agent_id', agentId)
        .order('started_at', { ascending: false })
        .limit(10);
      
      if (runsError) {
        return {
          success: false,
          error: runsError.message
        };
      }
      
      // Extract queries from run data (simplified - in real implementation this would be more specific)
      const recentQueries = recentRuns
        ?.filter(run => run.data && run.data.query)
        .map(run => run.data.query as string)
        .slice(0, 5) || [];
      
      return {
        success: true,
        stats: {
          totalDocuments: documentIds.length,
          recentQueries,
          topDocuments
        }
      };
    } catch (error: any) {
      console.error('Error getting agent knowledge stats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Recommend additional knowledge for an agent based on goals
   */
  async recommendKnowledge(
    agentId: string, 
    contextQuery: string
  ): Promise<{ 
    success: boolean; 
    recommendations?: { 
      documentId: string; 
      documentName: string; 
      relevance: number;
      description?: string;
    }[]; 
    error?: string 
  }> {
    try {
      // Search for relevant knowledge across all documents
      const searchResults = await knowledgeService.semanticSearch({
        query: contextQuery,
        limit: 5,
        similarityThreshold: 0.65
      });
      
      if (!searchResults.success) {
        return { 
          success: false, 
          error: searchResults.error || 'Knowledge recommendation failed' 
        };
      }
      
      // Group by document and calculate relevance
      const documentRelevance: Record<string, { 
        documentId: string; 
        documentName: string; 
        relevance: number;
        description?: string;
        matchCount: number; 
      }> = {};
      
      searchResults.results.forEach(result => {
        if (!documentRelevance[result.document_id]) {
          documentRelevance[result.document_id] = {
            documentId: result.document_id,
            documentName: result.document_name || 'Unknown Document',
            relevance: 0,
            description: result.metadata?.description,
            matchCount: 0
          };
        }
        
        // Add to relevance score (weighted by similarity)
        documentRelevance[result.document_id].relevance += result.similarity;
        documentRelevance[result.document_id].matchCount += 1;
      });
      
      // Calculate average relevance per document
      Object.values(documentRelevance).forEach(doc => {
        doc.relevance = doc.relevance / doc.matchCount;
      });
      
      // Sort by relevance and format response
      const recommendations = Object.values(documentRelevance)
        .sort((a, b) => b.relevance - a.relevance)
        .map(({ documentId, documentName, relevance, description }) => ({
          documentId,
          documentName,
          relevance,
          description
        }));
      
      return {
        success: true,
        recommendations
      };
    } catch (error: any) {
      console.error('Error recommending knowledge:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};
