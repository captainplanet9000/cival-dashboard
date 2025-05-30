/**
 * Type definitions for knowledge management system
 */

export interface KnowledgeDocument {
  id: string | number;
  title: string;
  category: string;
  content: string;
  created_at: string;
  updated_at: string;
  last_accessed?: string;
  author?: string;
  source?: string;
  tags?: string[];
  embedding_id?: string;
}

export interface KnowledgeQuery {
  query: string;
  relevant_documents?: KnowledgeDocument[];
  similarity_scores?: number[];
  timestamp?: string;
}
