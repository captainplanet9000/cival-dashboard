import { BaseRepository, QueryOptions } from '../../lib/base-repository';
import { Agent } from '../models/agent';

/**
 * Extended query options specifically for agents
 */
export interface AgentQueryOptions extends QueryOptions {
  includeFarm?: boolean;
  includeWallets?: boolean;
  includeOrders?: boolean;
  includeTrades?: boolean;
  includeMemories?: boolean;
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
  async findByIdWithRelations(id: number, options: AgentQueryOptions = {}): Promise<Agent | null> {
    const agent = await this.findById(id);
    
    if (!agent) {
      return null;
    }

    const enrichedAgent: any = { ...agent };

    // Load related farm if requested
    if (options.includeFarm) {
      const { data: farm } = await this.client
        .from('farms')
        .select('*')
        .eq('id', agent.farm_id)
        .single();
      
      enrichedAgent.farm = farm;
    }

    // Load related wallets if requested
    if (options.includeWallets) {
      const { data: wallets } = await this.client
        .from('wallets')
        .select('*')
        .eq('owner_id', id)
        .eq('owner_type', 'agent');
      
      enrichedAgent.wallets = wallets || [];
    }

    // Load related orders if requested
    if (options.includeOrders) {
      const { data: orders } = await this.client
        .from('orders')
        .select('*')
        .eq('agent_id', id)
        .order('created_at', { ascending: false });
      
      enrichedAgent.orders = orders || [];
    }

    // Load related trades if requested
    if (options.includeTrades) {
      const { data: trades } = await this.client
        .from('trades')
        .select('*')
        .eq('agent_id', id)
        .order('executed_at', { ascending: false });
      
      enrichedAgent.trades = trades || [];
    }

    // Load agent memories if requested
    if (options.includeMemories) {
      const { data: memories } = await this.client
        .from('memory_items')
        .select('*')
        .eq('agent_id', id)
        .order('created_at', { ascending: false });
      
      enrichedAgent.memories = memories || [];
    }

    return enrichedAgent as Agent;
  }

  /**
   * Find active agents with performance stats
   */
  async findActiveAgentsWithStats(): Promise<any[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(`
        *,
        trades:trades(count),
        orders:orders(count)
      `)
      .eq('is_active', true);

    if (error) {
      this.handleError(error);
      return [];
    }

    // Define interfaces for the data shapes
    interface AgentWithCounts extends Agent {
      trades?: { count: number };
      orders?: { count: number };
    }

    interface Trade {
      profit_loss?: number;
    }

    // Enrich the data with calculated metrics
    const agents = data as AgentWithCounts[] || [];
    const enrichedAgents = await Promise.all(agents.map(async (agent: AgentWithCounts) => {
      const { data: trades } = await this.client
        .from('trades')
        .select('profit_loss')
        .eq('agent_id', agent.id);
      
      const totalProfitLoss = (trades as Trade[] || []).reduce((sum: number, trade: Trade) => {
        return sum + (trade.profit_loss || 0);
      }, 0);
      
      return {
        ...agent,
        calculated_metrics: {
          total_profit_loss: totalProfitLoss,
          trade_count: agent.trades?.count || 0,
          order_count: agent.orders?.count || 0
        }
      };
    }));

    return enrichedAgents;
  }

  /**
   * Update agent parameters
   */
  async updateParameters(id: number, parameters: object): Promise<boolean> {
    const { error } = await this.client
      .from(this.tableName)
      .update({ 
        parameters,
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
   * Update agent status (active/inactive)
   */
  async updateStatus(id: number, isActive: boolean): Promise<boolean> {
    const { error } = await this.client
      .from(this.tableName)
      .update({ 
        is_active: isActive,
        updated_at: new Date().toISOString(),
        last_active_at: isActive ? new Date().toISOString() : undefined
      })
      .eq('id', id);

    if (error) {
      this.handleError(error);
      return false;
    }

    return true;
  }

  /**
   * Update agent performance metrics
   */
  async updatePerformanceMetrics(id: number, metrics: object): Promise<boolean> {
    const { error } = await this.client
      .from(this.tableName)
      .update({ 
        performance_metrics: metrics,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      this.handleError(error);
      return false;
    }

    return true;
  }
}
