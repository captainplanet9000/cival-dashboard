/**
 * ElizaOS Client
 * 
 * Provides an interface for interacting with the ElizaOS AI agent framework
 * Supports agent creation, management, knowledge operations, and multi-agent coordination
 */

import { ApiGateway, ApiServiceType, ApiResponse } from '../api-gateway';
import { MonitoringService } from '../monitoring-service';

// Agent types
export type AgentRole = 'advisor' | 'trader' | 'analyst' | 'researcher' | 'portfolio_manager';
export type AgentStatus = 'active' | 'inactive' | 'training' | 'error';
export type ModelProvider = 'openai' | 'anthropic' | 'gemini' | 'llama' | 'mistral';

// Agent configuration
export interface AgentConfig {
  name: string;
  description: string;
  role: AgentRole;
  baseModel: string;
  provider: ModelProvider;
  systemPrompt?: string;
  knowledgeBaseIds?: string[];
  temperature?: number;
  maxTokens?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  allowedActions?: string[];
}

// Agent instance
export interface Agent {
  id: string;
  userId: string;
  config: AgentConfig;
  status: AgentStatus;
  createdAt: string;
  updatedAt: string;
  lastActive?: string;
  metadata?: Record<string, any>;
}

// Knowledge document
export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'pdf' | 'webpage' | 'code' | 'market_data';
  tags: string[];
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

// Agent message
export interface AgentMessage {
  id: string;
  agentId: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// Message response
export interface MessageResponse {
  id: string;
  message: AgentMessage;
  actions?: AgentAction[];
}

// Agent action
export interface AgentAction {
  id: string;
  type: string;
  status: 'pending' | 'completed' | 'failed';
  params: Record<string, any>;
  result?: any;
  error?: string;
  timestamp: string;
}

// Agent performance metrics
export interface AgentPerformance {
  agentId: string;
  metrics: {
    responseTime: number;
    successRate: number;
    accuracy?: number;
    pnl?: number;
    trades?: number;
  };
  period: {
    start: string;
    end: string;
  };
}

export class ElizaOSClient {
  private static instance: ElizaOSClient;
  private apiGateway: ApiGateway;
  private activeAgents: Map<string, Agent> = new Map();
  private messageSubscriptions: Map<string, Set<(message: AgentMessage) => void>> = new Map();
  private eventSource: EventSource | null = null;
  
  private constructor() {
    this.apiGateway = ApiGateway.getInstance();
    this.setupSSEConnection();
  }
  
  // Singleton pattern
  public static getInstance(): ElizaOSClient {
    if (!ElizaOSClient.instance) {
      ElizaOSClient.instance = new ElizaOSClient();
    }
    return ElizaOSClient.instance;
  }
  
  /**
   * Setup Server-Sent Events for real-time agent communication
   */
  private setupSSEConnection(): void {
    try {
      if (typeof window === 'undefined') return; // Skip on server-side
      
      this.eventSource = new EventSource('/api/agents/eliza/events');
      
      this.eventSource.onopen = () => {
        MonitoringService.logEvent({
          type: 'info',
          message: 'ElizaOS SSE connection established',
          data: {}
        });
      };
      
      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'message' && data.agentId) {
            const message: AgentMessage = data.message;
            this.notifySubscribers(data.agentId, message);
          } else if (data.type === 'agent_status' && data.agentId) {
            // Update agent status
            const agent = this.activeAgents.get(data.agentId);
            if (agent) {
              agent.status = data.status;
              this.activeAgents.set(data.agentId, agent);
            }
          }
        } catch (error) {
          MonitoringService.logEvent({
            type: 'error',
            message: 'Failed to parse ElizaOS event',
            data: { error, rawData: event.data }
          });
        }
      };
      
      this.eventSource.onerror = (error) => {
        MonitoringService.logEvent({
          type: 'error',
          message: 'ElizaOS SSE connection error',
          data: { error }
        });
        
        // Reconnect after delay
        setTimeout(() => {
          this.closeSSEConnection();
          this.setupSSEConnection();
        }, 5000);
      };
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: 'Failed to setup ElizaOS SSE connection',
        data: { error }
      });
    }
  }
  
  /**
   * Close SSE connection
   */
  private closeSSEConnection(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
  
  /**
   * Notify message subscribers
   */
  private notifySubscribers(agentId: string, message: AgentMessage): void {
    const subscribers = this.messageSubscriptions.get(agentId);
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(message);
        } catch (error) {
          MonitoringService.logEvent({
            type: 'error',
            message: 'Error in ElizaOS message subscriber callback',
            data: { error, agentId, messageId: message.id }
          });
        }
      });
    }
  }
  
  /**
   * Get available agents for the current user
   */
  public async getAgents(): Promise<ApiResponse<Agent[]>> {
    try {
      const response = await this.apiGateway.serviceRequest<Agent[]>(
        ApiServiceType.ELIZAOS,
        '/agents',
        {
          method: 'GET',
          requireAuth: true,
          useCache: true,
          cacheTime: 60000 // Cache for 1 minute
        }
      );
      
      // Update active agents cache
      if (response.data) {
        response.data.forEach(agent => {
          this.activeAgents.set(agent.id, agent);
        });
      }
      
      return response;
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: 'Failed to get ElizaOS agents',
        data: { error }
      });
      
      return {
        data: null,
        error: error as Error,
        status: 500
      };
    }
  }
  
  /**
   * Get a specific agent by ID
   */
  public async getAgent(agentId: string): Promise<ApiResponse<Agent>> {
    try {
      // Check cache first
      const cachedAgent = this.activeAgents.get(agentId);
      if (cachedAgent) {
        return {
          data: cachedAgent,
          error: null,
          status: 200,
          cached: true
        };
      }
      
      const response = await this.apiGateway.serviceRequest<Agent>(
        ApiServiceType.ELIZAOS,
        `/agents/${agentId}`,
        {
          method: 'GET',
          requireAuth: true
        }
      );
      
      // Update cache
      if (response.data) {
        this.activeAgents.set(agentId, response.data);
      }
      
      return response;
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to get ElizaOS agent ${agentId}`,
        data: { error, agentId }
      });
      
      return {
        data: null,
        error: error as Error,
        status: 500
      };
    }
  }
  
  /**
   * Create a new agent
   */
  public async createAgent(config: AgentConfig): Promise<ApiResponse<Agent>> {
    try {
      const response = await this.apiGateway.serviceRequest<Agent>(
        ApiServiceType.ELIZAOS,
        '/agents',
        {
          method: 'POST',
          body: { config },
          requireAuth: true
        }
      );
      
      // Update cache
      if (response.data) {
        this.activeAgents.set(response.data.id, response.data);
        
        MonitoringService.logEvent({
          type: 'info',
          message: `Created new ElizaOS agent: ${config.name}`,
          data: { agentId: response.data.id, role: config.role }
        });
      }
      
      return response;
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: 'Failed to create ElizaOS agent',
        data: { error, config }
      });
      
      return {
        data: null,
        error: error as Error,
        status: 500
      };
    }
  }
  
  /**
   * Update an existing agent
   */
  public async updateAgent(
    agentId: string,
    updates: Partial<AgentConfig>
  ): Promise<ApiResponse<Agent>> {
    try {
      const response = await this.apiGateway.serviceRequest<Agent>(
        ApiServiceType.ELIZAOS,
        `/agents/${agentId}`,
        {
          method: 'PATCH',
          body: { updates },
          requireAuth: true
        }
      );
      
      // Update cache
      if (response.data) {
        this.activeAgents.set(agentId, response.data);
      }
      
      return response;
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to update ElizaOS agent ${agentId}`,
        data: { error, agentId, updates }
      });
      
      return {
        data: null,
        error: error as Error,
        status: 500
      };
    }
  }
  
  /**
   * Delete an agent
   */
  public async deleteAgent(agentId: string): Promise<ApiResponse<boolean>> {
    try {
      const response = await this.apiGateway.serviceRequest<{ success: boolean }>(
        ApiServiceType.ELIZAOS,
        `/agents/${agentId}`,
        {
          method: 'DELETE',
          requireAuth: true
        }
      );
      
      // Remove from cache
      if (response.data?.success) {
        this.activeAgents.delete(agentId);
        
        // Remove any message subscriptions
        this.messageSubscriptions.delete(agentId);
      }
      
      return {
        data: response.data?.success || false,
        error: response.error,
        status: response.status
      };
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to delete ElizaOS agent ${agentId}`,
        data: { error, agentId }
      });
      
      return {
        data: false,
        error: error as Error,
        status: 500
      };
    }
  }
  
  /**
   * Send a message to an agent
   */
  public async sendMessage(
    agentId: string,
    content: string,
    metadata?: Record<string, any>
  ): Promise<ApiResponse<MessageResponse>> {
    try {
      const response = await this.apiGateway.serviceRequest<MessageResponse>(
        ApiServiceType.ELIZAOS,
        `/agents/${agentId}/messages`,
        {
          method: 'POST',
          body: { content, metadata },
          requireAuth: true
        }
      );
      
      return response;
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to send message to ElizaOS agent ${agentId}`,
        data: { error, agentId, content }
      });
      
      return {
        data: null,
        error: error as Error,
        status: 500
      };
    }
  }
  
  /**
   * Get message history for an agent
   */
  public async getMessageHistory(
    agentId: string,
    limit: number = 50,
    before?: string
  ): Promise<ApiResponse<AgentMessage[]>> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('limit', limit.toString());
      if (before) {
        queryParams.append('before', before);
      }
      
      const response = await this.apiGateway.serviceRequest<AgentMessage[]>(
        ApiServiceType.ELIZAOS,
        `/agents/${agentId}/messages?${queryParams.toString()}`,
        {
          method: 'GET',
          requireAuth: true
        }
      );
      
      return response;
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to get message history for ElizaOS agent ${agentId}`,
        data: { error, agentId, limit, before }
      });
      
      return {
        data: null,
        error: error as Error,
        status: 500
      };
    }
  }
  
  /**
   * Subscribe to messages from an agent
   */
  public subscribeToMessages(
    agentId: string,
    callback: (message: AgentMessage) => void
  ): () => void {
    if (!this.messageSubscriptions.has(agentId)) {
      this.messageSubscriptions.set(agentId, new Set());
    }
    
    const subscribers = this.messageSubscriptions.get(agentId)!;
    subscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
      const subscribers = this.messageSubscriptions.get(agentId);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.messageSubscriptions.delete(agentId);
        }
      }
    };
  }
  
  /**
   * Get knowledge documents
   */
  public async getKnowledgeDocuments(
    tags?: string[],
    limit: number = 20,
    offset: number = 0
  ): Promise<ApiResponse<KnowledgeDocument[]>> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('limit', limit.toString());
      queryParams.append('offset', offset.toString());
      
      if (tags && tags.length > 0) {
        queryParams.append('tags', tags.join(','));
      }
      
      const response = await this.apiGateway.serviceRequest<KnowledgeDocument[]>(
        ApiServiceType.ELIZAOS,
        `/knowledge?${queryParams.toString()}`,
        {
          method: 'GET',
          requireAuth: true,
          useCache: true,
          cacheTime: 300000 // Cache for 5 minutes
        }
      );
      
      return response;
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: 'Failed to get knowledge documents',
        data: { error, tags, limit, offset }
      });
      
      return {
        data: null,
        error: error as Error,
        status: 500
      };
    }
  }
  
  /**
   * Create a knowledge document
   */
  public async createKnowledgeDocument(
    document: Omit<KnowledgeDocument, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ApiResponse<KnowledgeDocument>> {
    try {
      const response = await this.apiGateway.serviceRequest<KnowledgeDocument>(
        ApiServiceType.ELIZAOS,
        '/knowledge',
        {
          method: 'POST',
          body: document,
          requireAuth: true
        }
      );
      
      // Invalidate knowledge cache
      this.apiGateway.invalidateCache(/\/knowledge/);
      
      return response;
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: 'Failed to create knowledge document',
        data: { error, document }
      });
      
      return {
        data: null,
        error: error as Error,
        status: 500
      };
    }
  }
  
  /**
   * Delete a knowledge document
   */
  public async deleteKnowledgeDocument(documentId: string): Promise<ApiResponse<boolean>> {
    try {
      const response = await this.apiGateway.serviceRequest<{ success: boolean }>(
        ApiServiceType.ELIZAOS,
        `/knowledge/${documentId}`,
        {
          method: 'DELETE',
          requireAuth: true
        }
      );
      
      // Invalidate knowledge cache
      this.apiGateway.invalidateCache(/\/knowledge/);
      
      return {
        data: response.data?.success || false,
        error: response.error,
        status: response.status
      };
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to delete knowledge document ${documentId}`,
        data: { error, documentId }
      });
      
      return {
        data: false,
        error: error as Error,
        status: 500
      };
    }
  }
  
  /**
   * Get agent performance metrics
   */
  public async getAgentPerformance(
    agentId: string,
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<AgentPerformance>> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('start', startDate);
      queryParams.append('end', endDate);
      
      const response = await this.apiGateway.serviceRequest<AgentPerformance>(
        ApiServiceType.ELIZAOS,
        `/agents/${agentId}/performance?${queryParams.toString()}`,
        {
          method: 'GET',
          requireAuth: true
        }
      );
      
      return response;
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to get performance metrics for ElizaOS agent ${agentId}`,
        data: { error, agentId, startDate, endDate }
      });
      
      return {
        data: null,
        error: error as Error,
        status: 500
      };
    }
  }
  
  /**
   * Cleanup resources
   */
  public dispose(): void {
    this.closeSSEConnection();
    this.messageSubscriptions.clear();
    this.activeAgents.clear();
  }
}
