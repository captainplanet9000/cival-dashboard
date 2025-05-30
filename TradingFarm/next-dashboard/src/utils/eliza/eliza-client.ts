/**
 * ElizaOS Integration Client
 * 
 * This client provides utilities for integrating ElizaOS AI capabilities
 * with the Trading Farm dashboard.
 */

import { v4 as uuidv4 } from 'uuid';

// Define types for ElizaOS integration
export type ConnectionType = 'read-only' | 'command' | 'full';

export type Capability = 
  | 'market_data' 
  | 'portfolio_query' 
  | 'trading_execution' 
  | 'knowledge_access'
  | 'strategy_selection';

export type ElizaAgentConfig = {
  connection_type: ConnectionType;
  capabilities: Capability[];
  eliza_id?: string;
  connected: boolean;
  last_connected?: string;
};

export type AgentConfiguration = {
  strategy?: string;
  risk_level?: 'low' | 'medium' | 'high';
  markets?: string[];
  parameters?: Record<string, any>;
  eliza?: ElizaAgentConfig;
};

export type KnowledgeItem = {
  id?: number;
  title: string;
  content: string;
  tags: string[];
  status?: 'active' | 'archived' | 'draft';
  created_at?: string;
  updated_at?: string;
};

// ElizaOS integration client
export class ElizaClient {
  private apiUrl: string;

  constructor(apiUrl?: string) {
    this.apiUrl = apiUrl || '/api/mcp/supabase';
  }

  /**
   * Connect an agent to ElizaOS
   */
  async connectAgent(
    agentId: number, 
    connectionType: ConnectionType = 'read-only', 
    capabilities: Capability[] = ['market_data']
  ) {
    const elizaId = `eliza-${uuidv4().substring(0, 8)}`;

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'connect_eliza_agent',
          params: {
            agent_id: agentId,
            eliza_id: elizaId,
            connection_type: connectionType,
            capabilities: capabilities
          }
        })
      });

      const result = await response.json();
      return {
        success: result.success,
        data: result.data,
        error: result.error
      };
    } catch (error) {
      console.error('Error connecting agent to ElizaOS:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Store knowledge in the ElizaOS RAG system
   */
  async storeKnowledge(
    title: string,
    content: string,
    tags: string[] = [],
    agentIds: number[] = []
  ) {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'store_knowledge',
          params: {
            title,
            content,
            tags,
            agent_ids: agentIds
          }
        })
      });

      const result = await response.json();
      return {
        success: result.success,
        data: result.data,
        error: result.error
      };
    } catch (error) {
      console.error('Error storing knowledge:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Query knowledge from the ElizaOS RAG system
   */
  async queryKnowledge(
    query: string,
    agentId?: number,
    filterTags: string[] = []
  ) {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'query_knowledge',
          params: {
            query,
            agent_id: agentId,
            filter_tags: filterTags
          }
        })
      });

      const result = await response.json();
      return {
        success: result.success,
        data: result.data,
        metadata: result.metadata,
        error: result.error
      };
    } catch (error) {
      console.error('Error querying knowledge:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get farm details including all ElizaOS connections
   */
  async getFarmDetails(farmId: number) {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'get_farm_details',
          params: {
            farm_id: farmId
          }
        })
      });

      const result = await response.json();
      return {
        success: result.success,
        data: result.data,
        error: result.error
      };
    } catch (error) {
      console.error('Error getting farm details:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Update agent configuration with ElizaOS settings
   */
  async updateAgentConfiguration(agentId: number, configuration: AgentConfiguration) {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'update_record',
          params: {
            table: 'agents',
            data: {
              configuration
            },
            where: {
              id: agentId
            }
          }
        })
      });

      const result = await response.json();
      return {
        success: result.success,
        data: result.data,
        error: result.error
      };
    } catch (error) {
      console.error('Error updating agent configuration:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

// Create a singleton instance
export const elizaClient = new ElizaClient();
