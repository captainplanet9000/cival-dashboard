/**
 * Knowledge Service Factory
 * 
 * Provides a unified interface to access knowledge services,
 * allowing seamless switching between production and mock implementations
 */

import { ApiResponse } from '@/types/api';
import { 
  KnowledgeService,
  KnowledgeDocument,
  SearchResult,
  knowledgeService
} from './knowledge-service';
import { 
  MockKnowledgeService,
  mockKnowledgeService
} from './mock/mock-knowledge-service';

// Feature flag to control which implementation to use
// In a real application, this could come from environment variables or config
const USE_MOCK_SERVICE = process.env.NEXT_PUBLIC_USE_MOCK_KNOWLEDGE === 'true' || true;

/**
 * Get the appropriate knowledge service instance
 */
export function getKnowledgeService(): KnowledgeService | MockKnowledgeService {
  return USE_MOCK_SERVICE ? mockKnowledgeService : knowledgeService;
}

/**
 * Knowledge Service Interface for type consistency
 */
export interface IKnowledgeService {
  addDocument(document: KnowledgeDocument): Promise<ApiResponse<KnowledgeDocument>>;
  searchKnowledge(query: string): Promise<ApiResponse<SearchResult[]>>;
  getDocument(documentId: string): Promise<ApiResponse<KnowledgeDocument>>;
  deleteDocument(documentId: string): Promise<ApiResponse<void>>;
  listDocuments(): Promise<ApiResponse<KnowledgeDocument[]>>;
  uploadFile(file: File, path: string): Promise<ApiResponse<string>>;
  shareKnowledge(documentId: string, options: {
    agentIds?: string[];
    farmIds?: number[];
    userIds?: string[];
    permissionLevel?: 'read' | 'write' | 'admin';
    isPublic?: boolean;
  }): Promise<ApiResponse<void>>;
}

// Ensure both services implement the same interface
const service: IKnowledgeService = getKnowledgeService();

export default service;
