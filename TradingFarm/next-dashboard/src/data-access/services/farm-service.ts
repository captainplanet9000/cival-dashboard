import { BaseService } from './base-service';
import { FarmRepository } from '../repositories/farm-repository';
import { Farm } from '../models/farm';

/**
 * Service for managing Farm entities
 */
export class FarmService extends BaseService<Farm> {
  private farmRepository: FarmRepository;

  constructor(farmRepository = new FarmRepository()) {
    super(farmRepository);
    this.farmRepository = farmRepository;
  }

  /**
   * Find farms by owner ID
   */
  async findByOwnerId(ownerId: number): Promise<Farm[]> {
    return this.farmRepository.findAll({ 
      filters: { owner_id: ownerId } 
    });
  }

  /**
   * Find active farms
   */
  async findActiveFarms(): Promise<Farm[]> {
    return this.farmRepository.findAll({ 
      filters: { is_active: true } 
    });
  }

  /**
   * Get farm with related data
   */
  async getFarmWithRelations(farmId: number, includeAgents = true, includeWallets = true): Promise<Farm | null> {
    return this.farmRepository.findByIdWithRelations(farmId, {
      includeAgents,
      includeWallets,
      includeStrategies: true
    });
  }

  /**
   * Get farm performance metrics over time
   */
  async getFarmPerformanceHistory(farmId: number, timeframe?: string): Promise<any> {
    // This would typically connect to a time-series database or analytics service
    // For now, we'll return a simple stub
    return {
      farmId,
      timeframe: timeframe || '1m',
      data: []
    };
  }

  /**
   * Calculate farm risk profile based on active agents and strategies
   */
  async calculateRiskProfile(farmId: number): Promise<{ 
    riskScore: number; 
    factors: { name: string; impact: number; description: string }[] 
  }> {
    // In a real implementation, this would analyze the farm's strategies, 
    // active positions, leverage, etc.
    return {
      riskScore: 0.65, // 0-1 scale
      factors: [
        { name: 'Leverage', impact: 0.7, description: 'Average leverage across positions' },
        { name: 'Diversification', impact: 0.6, description: 'Distribution across markets' },
        { name: 'Strategy Volatility', impact: 0.5, description: 'Historical volatility of strategies' }
      ]
    };
  }

  /**
   * Get total value locked in all active farms
   */
  async getTotalValueLocked(): Promise<number> {
    return this.farmRepository.getTotalValueLocked();
  }
} 