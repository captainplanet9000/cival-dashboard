import { BaseService } from './base-service';
import { AgentRepository } from '../repositories/agent-repository';
import { Agent } from '../models/agent';

/**
 * Service for managing Agent entities
 */
export class AgentService extends BaseService<Agent> {
  private agentRepository: AgentRepository;

  constructor(agentRepository = new AgentRepository()) {
    super(agentRepository);
    this.agentRepository = agentRepository;
  }

  /**
   * Find agents by farm ID
   */
  async findByFarmId(farmId: number): Promise<Agent[]> {
    return this.agentRepository.findAll({
      filters: { farm_id: farmId }
    });
  }

  /**
   * Find active agents
   */
  async findActiveAgents(): Promise<Agent[]> {
    return this.agentRepository.findAll({
      filters: { is_active: true }
    });
  }

  /**
   * Start an agent (sets active status)
   */
  async startAgent(agentId: number): Promise<Agent | null> {
    return this.agentRepository.update(agentId, { 
      is_active: true,
      last_active_at: new Date().toISOString()
    });
  }

  /**
   * Stop an agent (sets inactive status)
   */
  async stopAgent(agentId: number): Promise<Agent | null> {
    return this.agentRepository.update(agentId, { 
      is_active: false
    });
  }

  /**
   * Update agent parameters
   */
  async updateParameters(agentId: number, parameters: Record<string, any>): Promise<Agent | null> {
    return this.agentRepository.update(agentId, { parameters });
  }

  /**
   * Get agent performance metrics
   */
  async getPerformanceMetrics(agentId: number): Promise<any> {
    const agent = await this.agentRepository.findById(agentId);
    if (!agent) {
      return null;
    }
    
    // In a real implementation, this would calculate various performance metrics
    // based on the agent's trades
    return {
      agentId,
      win_rate: agent.performance_metrics?.win_rate || 0,
      profit_factor: agent.performance_metrics?.profit_factor || 0,
      total_trades: agent.performance_metrics?.trades_count || 0,
      total_profit_loss: agent.performance_metrics?.total_profit_loss || 0,
      // Additional metrics could be calculated here
    };
  }

  /**
   * Check if agent has active trades
   */
  async hasActiveTrades(agentId: number): Promise<boolean> {
    // This would need a dedicated method in the repository
    // Faking it with a random boolean for now
    return Math.random() > 0.5;
  }
} 