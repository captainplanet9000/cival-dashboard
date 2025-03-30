import { BaseRepository, QueryOptions } from '../../lib/base-repository';
import { Farm } from '../models/farm';

/**
 * Extended query options specifically for farms
 */
export interface FarmQueryOptions extends QueryOptions {
  includeAgents?: boolean;
  includeWallets?: boolean;
  includeStrategies?: boolean;
  includeGoals?: boolean;
}

/**
 * Repository implementation for Farm entities
 */
export class FarmRepository extends BaseRepository<Farm> {
  constructor() {
    super('farms');
  }

  /**
   * Find a farm by ID with optional related data
   */
  async findByIdWithRelations(id: number, options: FarmQueryOptions = {}): Promise<Farm | null> {
    const farm = await this.findById(id);
    
    if (!farm) {
      return null;
    }

    const enrichedFarm: any = { ...farm };

    // Load related agents if requested
    if (options.includeAgents) {
      const { data: agents } = await this.client
        .from('agents')
        .select('*')
        .eq('farm_id', id);
      
      enrichedFarm.agents = agents || [];
    }

    // Load related wallets if requested
    if (options.includeWallets) {
      const { data: wallets } = await this.client
        .from('wallets')
        .select('*')
        .eq('owner_id', id)
        .eq('owner_type', 'farm');
      
      enrichedFarm.wallets = wallets || [];
    }

    // Load related strategies if requested
    if (options.includeStrategies) {
      const { data: farmStrategies } = await this.client
        .from('farm_strategies')
        .select(`
          *,
          trading_strategies(id, name, description, strategy_type, parameters)
        `)
        .eq('farm_id', id);
      
      enrichedFarm.strategies = farmStrategies || [];
    }

    // Load related goals if requested
    if (options.includeGoals) {
      const { data: goals } = await this.client
        .from('goals')
        .select('*')
        .eq('farm_id', id);
      
      enrichedFarm.goals = goals || [];
    }

    return enrichedFarm as Farm;
  }

  /**
   * Find active farms with summarized statistics
   */
  async findActiveFarmsWithStats(): Promise<any[]> {
    const { data, error } = await this.client
      .from('farms')
      .select(`
        *,
        agents:agents(count),
        strategies:farm_strategies(count)
      `)
      .eq('is_active', true);

    if (error) {
      this.handleError(error);
      return [];
    }

    return data || [];
  }

  /**
   * Find farms by specific risk profiles
   */
  async findByRiskProfile(maxDrawdown: number): Promise<Farm[]> {
    // For JSON fields, we need to use Postgres-specific filters
    const query = `risk_profile->>'max_drawdown' <= '${maxDrawdown}'`;
    
    const { data, error } = await this.client
      .from('farms')
      .select('*')
      .filter('risk_profile', 'not.is', 'null')
      .or(query);

    if (error) {
      this.handleError(error);
      return [];
    }

    return data as Farm[];
  }

  /**
   * Update farm performance metrics
   */
  async updatePerformanceMetrics(id: number, metrics: object): Promise<boolean> {
    const { error } = await this.client
      .from('farms')
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

  /**
   * Get total value locked in all active farms
   */
  async getTotalValueLocked(): Promise<number> {
    const { data, error } = await this.client
      .from('farms')
      .select('*')
      .eq('is_active', true);

    if (error) {
      this.handleError(error);
      return 0;
    }

    // Calculate TVL from the returned farms
    const farms = data as Farm[];
    let tvl = 0;

    for (const farm of farms) {
      const walletResponse = await this.client
        .from('wallets')
        .select('balance')
        .eq('owner_id', farm.id)
        .eq('owner_type', 'farm');
      
      if (walletResponse.error) {
        continue;
      }

      interface WalletBalance {
        balance: number;
      }
      
      const walletBalances = walletResponse.data as WalletBalance[] || [];
      const farmBalance = walletBalances.reduce((total: number, wallet: WalletBalance) => total + (wallet.balance || 0), 0);
      
      tvl += farmBalance;
    }

    return tvl;
  }
}
