/**
 * Mock Knowledge Service
 * Provides mock implementations of the knowledge service methods for development
 */

import { KnowledgeDocument, KnowledgeChunk, SearchResult } from '@/services/knowledge-service';
import { ApiResponse } from '@/types/api';
import { KNOWLEDGE_EVENTS } from '@/utils/websocket/events';
import { getWebSocketClient } from '@/utils/websocket/client';

// Sample mock documents
const MOCK_DOCUMENTS: KnowledgeDocument[] = [
  {
    id: 'doc-001',
    title: 'Trading Strategies Overview',
    description: 'Introduction to common trading strategies',
    content: 'Trading strategies are systematic approaches to financial markets that rely on consistent rules for trade entries and exits. Common strategies include trend following, mean reversion, momentum, and breakout strategies. Each approach has different risk profiles and works best in specific market conditions. Trend following strategies aim to capture prolonged market movements in one direction. Mean reversion strategies capitalize on the tendency of asset prices to revert to their average over time. Momentum strategies focus on assets that have shown strong recent performance. Breakout strategies identify when prices move beyond established support or resistance levels.',
    document_type: 'guide',
    source: 'internal',
    created_by: 'user-001',
    farm_id: 1,
    is_public: true,
    created_at: '2025-04-01T10:00:00Z',
    updated_at: '2025-04-01T10:00:00Z'
  },
  {
    id: 'doc-002',
    title: 'Market Analysis Techniques',
    description: 'Overview of technical and fundamental analysis',
    content: 'Market analysis techniques fall into two primary categories: technical analysis and fundamental analysis. Technical analysis evaluates assets through statistical trends gathered from market activity, such as price movement and volume. Fundamental analysis examines economic factors that influence asset values, including financial statements, industry conditions, and economic indicators. Technical analysts use chart patterns, indicators like Moving Averages, RSI, and MACD, and support/resistance levels to make trading decisions. Fundamental analysts evaluate metrics like P/E ratios, revenue growth, profit margins, and economic factors such as GDP growth, interest rates, and employment data.',
    document_type: 'guide',
    source: 'internal',
    created_by: 'user-001',
    farm_id: 1,
    is_public: true,
    created_at: '2025-04-02T14:30:00Z',
    updated_at: '2025-04-02T14:30:00Z'
  },
  {
    id: 'doc-003',
    title: 'Risk Management Guidelines',
    description: 'Best practices for managing trading risk',
    content: 'Risk management is the foundation of successful trading. Key principles include position sizing, stop-loss placement, risk-reward ratios, and portfolio diversification. Position sizing ensures no single trade can significantly impact your trading capital; a common rule is risking no more than 1-2% of capital per trade. Stop-loss orders limit potential losses by automatically exiting trades when prices move against your position beyond a predetermined point. Risk-reward ratios ensure potential profits justify the risk taken; aim for ratios of at least 1:2 (risking $1 to potentially gain $2). Diversification across different assets, markets, and strategies reduces correlation risk and smooths returns over time.',
    document_type: 'policy',
    source: 'internal',
    created_by: 'user-002',
    farm_id: 1,
    is_public: true,
    created_at: '2025-04-03T09:15:00Z',
    updated_at: '2025-04-05T11:30:00Z'
  },
  {
    id: 'doc-004',
    title: 'Cryptocurrency Trading Fundamentals',
    description: 'Introduction to crypto markets and trading',
    content: 'Cryptocurrency trading involves unique considerations beyond traditional markets. Key factors include understanding blockchain technology, tokenomics, market sentiment, and 24/7 market operations. Bitcoin and Ethereum dominate the market but thousands of altcoins exist with varying use cases. Crypto markets exhibit high volatility, creating both opportunities and risks. Trading venues include centralized exchanges (CEXs) like Coinbase and Binance, decentralized exchanges (DEXs) like Uniswap, and derivatives platforms offering futures and options. Security is paramount; use hardware wallets for long-term storage and strong authentication for exchange accounts. Stay informed about regulatory developments as they significantly impact market movements.',
    document_type: 'guide',
    source: 'internal',
    created_by: 'user-001',
    farm_id: 2,
    is_public: false,
    created_at: '2025-04-07T16:45:00Z',
    updated_at: '2025-04-07T16:45:00Z'
  },
  {
    id: 'doc-005',
    title: 'Algorithmic Trading Introduction',
    description: 'Fundamentals of algorithm-based trading',
    content: 'Algorithmic trading uses computer programs to execute trades according to predefined instructions. Benefits include removing emotion from trading decisions, executing trades at optimal prices, reducing transaction costs, and operating 24/7. Common algorithmic strategies include market making (placing buy and sell orders to profit from bid-ask spreads), arbitrage (exploiting price differences across markets), VWAP (Volume-Weighted Average Price) execution, and statistical arbitrage. Implementation requires programming skills (Python, R, or C++), understanding of math and statistics, and knowledge of market microstructure. Backtesting is essential to validate strategy performance before deploying with real capital. Risk management algorithms should accompany any trading algorithm to limit potential losses.',
    document_type: 'guide',
    source: 'external',
    created_by: 'user-003',
    farm_id: 3,
    is_public: false,
    created_at: '2025-04-10T12:00:00Z',
    updated_at: '2025-04-10T12:00:00Z'
  }
];

// Mock chunks
const generateMockChunks = (): KnowledgeChunk[] => {
  const chunks: KnowledgeChunk[] = [];
  
  MOCK_DOCUMENTS.forEach(doc => {
    // Split content into roughly 300-character chunks
    const content = doc.content;
    const chunkSize = 300;
    
    for (let i = 0; i < content.length; i += chunkSize) {
      const chunkContent = content.substring(i, i + chunkSize);
      const chunkIndex = Math.floor(i / chunkSize);
      
      chunks.push({
        id: `chunk-${doc.id}-${chunkIndex}`,
        document_id: doc.id || '',
        content: chunkContent,
        chunk_index: chunkIndex,
        metadata: { source: doc.source },
        created_at: doc.created_at,
        updated_at: doc.updated_at
      });
    }
  });
  
  return chunks;
};

const MOCK_CHUNKS = generateMockChunks();

/**
 * Mock Knowledge Service Class
 * Implements all methods from the real service with mock data
 */
export class MockKnowledgeService {
  private documents: KnowledgeDocument[] = [...MOCK_DOCUMENTS];
  private chunks: KnowledgeChunk[] = [...MOCK_CHUNKS];
  
  /**
   * Add a document to the mock knowledge base
   */
  async addDocument(document: KnowledgeDocument): Promise<ApiResponse<KnowledgeDocument>> {
    try {
      // Create a new document with id and timestamps
      const newDoc: KnowledgeDocument = {
        ...document,
        id: `doc-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Add to documents array
      this.documents.push(newDoc);
      
      // Generate chunks
      const content = newDoc.content;
      const chunkSize = 300;
      
      for (let i = 0; i < content.length; i += chunkSize) {
        const chunkContent = content.substring(i, i + chunkSize);
        const chunkIndex = Math.floor(i / chunkSize);
        
        this.chunks.push({
          id: `chunk-${newDoc.id}-${chunkIndex}`,
          document_id: newDoc.id || '',
          content: chunkContent,
          chunk_index: chunkIndex,
          metadata: { source: newDoc.source },
          created_at: newDoc.created_at,
          updated_at: newDoc.updated_at
        });
      }
      
      // Notify via WebSocket
      try {
        const wsClient = getWebSocketClient();
        wsClient.send(KNOWLEDGE_EVENTS.KNOWLEDGE_ADDED, {
          documentId: newDoc.id,
          title: newDoc.title,
          createdBy: newDoc.created_by
        });
      } catch (error) {
        console.log('WebSocket notification failed (development mode)');
      }
      
      return {
        success: true,
        data: newDoc
      };
    } catch (error: any) {
      console.error('Mock service error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Search the mock knowledge base
   */
  async searchKnowledge(query: string): Promise<ApiResponse<SearchResult[]>> {
    try {
      const lowerQuery = query.toLowerCase();
      
      // Score chunks based on term frequency
      const scoredChunks = this.chunks.map(chunk => {
        const content = chunk.content.toLowerCase();
        // Simple TF scoring
        const termFrequency = (content.match(new RegExp(lowerQuery, 'g')) || []).length;
        const normalizedTF = termFrequency / (content.length / 100); // Normalize by content length
        
        return {
          chunk,
          score: normalizedTF + (content.includes(lowerQuery) ? 0.5 : 0) // Boost exact matches
        };
      });
      
      // Sort by score and take top 10
      const topChunks = scoredChunks
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
      
      // Map to result format
      const results: SearchResult[] = topChunks.map(({ chunk, score }) => {
        const doc = this.documents.find(d => d.id === chunk.document_id);
        
        return {
          id: chunk.id || '',
          document_id: chunk.document_id,
          content: chunk.content,
          chunk_index: chunk.chunk_index,
          metadata: chunk.metadata,
          similarity: score,
          document: doc ? {
            title: doc.title,
            description: doc.description || '',
            document_type: doc.document_type,
            source: doc.source || ''
          } : undefined
        };
      });
      
      return {
        success: true,
        data: results
      };
    } catch (error: any) {
      console.error('Mock search error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get a document by ID
   */
  async getDocument(documentId: string): Promise<ApiResponse<KnowledgeDocument>> {
    try {
      const document = this.documents.find(doc => doc.id === documentId);
      
      if (!document) {
        return {
          success: false,
          error: 'Document not found'
        };
      }
      
      return {
        success: true,
        data: document
      };
    } catch (error: any) {
      console.error('Mock get document error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<ApiResponse<void>> {
    try {
      const initialCount = this.documents.length;
      this.documents = this.documents.filter(doc => doc.id !== documentId);
      
      if (this.documents.length === initialCount) {
        return {
          success: false,
          error: 'Document not found'
        };
      }
      
      // Remove associated chunks
      this.chunks = this.chunks.filter(chunk => chunk.document_id !== documentId);
      
      // Notify via WebSocket
      try {
        const wsClient = getWebSocketClient();
        wsClient.send(KNOWLEDGE_EVENTS.KNOWLEDGE_DELETED, {
          documentId,
          deletedBy: 'current-user'
        });
      } catch (error) {
        console.log('WebSocket notification failed (development mode)');
      }
      
      return {
        success: true
      };
    } catch (error: any) {
      console.error('Mock delete error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * List all documents
   */
  async listDocuments(): Promise<ApiResponse<KnowledgeDocument[]>> {
    try {
      return {
        success: true,
        data: this.documents
      };
    } catch (error: any) {
      console.error('Mock list documents error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Upload a file
   */
  async uploadFile(file: File, path: string): Promise<ApiResponse<string>> {
    try {
      // Just return a mock URL
      const mockUrl = `https://mock-storage.example.com/${path}`;
      
      return {
        success: true,
        data: mockUrl
      };
    } catch (error: any) {
      console.error('Mock upload error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Share knowledge
   */
  async shareKnowledge(documentId: string, options: {
    agentIds?: string[];
    farmIds?: number[];
    userIds?: string[];
    permissionLevel?: 'read' | 'write' | 'admin';
    isPublic?: boolean;
  }): Promise<ApiResponse<void>> {
    try {
      const document = this.documents.find(doc => doc.id === documentId);
      
      if (!document) {
        return {
          success: false,
          error: 'Document not found'
        };
      }
      
      // Update document public status if specified
      if (options.isPublic !== undefined) {
        document.is_public = options.isPublic;
      }
      
      // In a real system, this would create permission records
      console.log(`Mock: Shared document ${documentId} with:`, {
        agents: options.agentIds || [],
        farms: options.farmIds || [],
        users: options.userIds || [],
        permissionLevel: options.permissionLevel || 'read'
      });
      
      // Notify via WebSocket
      try {
        const wsClient = getWebSocketClient();
        wsClient.send(KNOWLEDGE_EVENTS.KNOWLEDGE_SHARED, {
          documentId,
          sharedWith: {
            agents: options.agentIds || [],
            farms: options.farmIds || [],
            users: options.userIds || []
          }
        });
      } catch (error) {
        console.log('WebSocket notification failed (development mode)');
      }
      
      return {
        success: true
      };
    } catch (error: any) {
      console.error('Mock share error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
export const mockKnowledgeService = new MockKnowledgeService();
export default mockKnowledgeService;
