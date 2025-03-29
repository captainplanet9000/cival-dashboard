import { BaseEntity, BaseRepository } from '../lib/base-repository';

/**
 * Agent entity interface
 */
export interface Agent extends BaseEntity {
  farm_id: number;
  name: string;
  model_config: {
    provider?: string;
    model?: string;
    temperature?: number;
    max_tokens?: number;
    fallback_models?: string[];
    [key: string]: any;
  };
  tools_config: {
    enabled_tools?: string[];
    tool_permissions?: Record<string, string[]>;
    mcp_servers?: string[];
    [key: string]: any;
  };
  capabilities: string[];
  is_active: boolean;
  performance_metrics: {
    trades_count?: number;
    win_rate?: number;
    profit_loss?: number;
    last_active?: string;
    [key: string]: any;
  };
  memory_context: {
    key_memories?: Record<string, any>;
    context_window?: any[];
    [key: string]: any;
  };
  config: {
    max_concurrent_trades?: number;
    risk_level?: string;
    operating_hours?: string[];
    [key: string]: any;
  };
}

/**
 * Extended query options specifically for agents
 */
export interface AgentQueryOptions {
  includeMessages?: boolean;
  includeWallet?: boolean;
  includeOrders?: boolean;
}

/**
 * Repository implementation for Agent entities
 */
export class AgentRepository extends BaseRepository<Agent> {
  constructor() {
    super('agents');
  }

  /**
   * Find agents by farm ID
   */
  async findByFarmId(farmId: number): Promise<Agent[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('farm_id', farmId);

    if (error) {
      this.handleError(error);
      return [];
    }

    return data as Agent[];
  }

  /**
   * Find an agent by ID with optional related data
   */
  async findByIdWithRelations(id: number, options: AgentQueryOptions = {}): Promise<any> {
    const agent = await this.findById(id);
    
    if (!agent) {
      return null;
    }

    const enrichedAgent: any = { ...agent };

    // Load related messages if requested
    if (options.includeMessages) {
      const { data: messages } = await this.client
        .from('agent_messages')
        .select('*')
        .eq('agent_id', id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      enrichedAgent.messages = messages || [];
    }

    // Load wallet if requested
    if (options.includeWallet) {
      const { data: wallet } = await this.client
        .from('wallets')
        .select('*')
        .eq('owner_id', id)
        .eq('owner_type', 'agent')
        .single();
      
      enrichedAgent.wallet = wallet;
    }

    // Load orders if requested
    if (options.includeOrders) {
      const { data: orders } = await this.client
        .from('orders')
        .select(`
          *,
          trades(*)
        `)
        .eq('agent_id', id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      enrichedAgent.orders = orders || [];
    }

    return enrichedAgent;
  }

  /**
   * Record a message for an agent
   */
  async addMessage(agentId: number, content: string, direction: 'inbound' | 'outbound', messageType: string, metadata: object = {}): Promise<boolean> {
    const { error } = await this.client
      .from('agent_messages')
      .insert({
        agent_id: agentId,
        content,
        direction,
        message_type: messageType,
        metadata,
        created_at: new Date().toISOString()
      });

    if (error) {
      this.handleError(error);
      return false;
    }

    return true;
  }

  /**
   * Update agent model configuration
   */
  async updateModelConfig(id: number, modelConfig: Agent['model_config']): Promise<boolean> {
    const { error } = await this.client
      .from(this.tableName)
      .update({ 
        model_config: modelConfig,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      this.handleError(error);
      return false;
    }

    return true;
  }

  /**
   * Update agent tools configuration
   */
  async updateToolsConfig(id: number, toolsConfig: Agent['tools_config']): Promise<boolean> {
    const { error } = await this.client
      .from(this.tableName)
      .update({ 
        tools_config: toolsConfig,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      this.handleError(error);
      return false;
    }

    return true;
  }

  /**
   * Update agent memory context
   */
  async updateMemoryContext(id: number, memoryContext: Agent['memory_context']): Promise<boolean> {
    const { error } = await this.client
      .from(this.tableName)
      .update({ 
        memory_context: memoryContext,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      this.handleError(error);
      return false;
    }

    return true;
  }

  /**
   * Get agents with OpenRouter integration
   */
  async findAgentsWithOpenRouter(): Promise<Agent[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .contains('model_config', { provider: 'openrouter' });

    if (error) {
      this.handleError(error);
      return [];
    }

    return data as Agent[];
  }
}
