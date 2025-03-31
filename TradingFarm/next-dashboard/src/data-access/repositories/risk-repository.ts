import { BaseEntity, BaseRepository } from '../lib/base-repository';

/**
 * Risk profile entity interface
 */
export interface RiskProfile extends BaseEntity {
  name: string;
  max_position_size: number;
  max_drawdown: number;
  daily_loss_limit: number;
  max_trades_per_day?: number;
  max_exposure?: number;
  parameters: {
    position_sizing_method?: 'fixed' | 'percent' | 'risk' | 'custom';
    stop_loss_type?: 'fixed' | 'atr' | 'volatility' | 'support_resistance' | 'trailing';
    stop_loss_value?: number;
    take_profit_type?: 'fixed' | 'r_multiple' | 'atr' | 'custom';
    take_profit_value?: number;
    max_correlated_trades?: number;
    max_open_positions?: number;
    [key: string]: any;
  };
}

/**
 * Repository implementation for Risk Profiles
 */
export class RiskRepository extends BaseRepository<RiskProfile> {
  constructor() {
    super('risk_profiles');
  }

  /**
   * Find risk profile by name
   */
  async findByName(name: string): Promise<RiskProfile | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('name', name)
      .single();

    if (error) {
      // If no results found, this isn't an error
      if (error.code === 'PGRST116') {
        return null;
      }
      this.handleError(error);
      return null;
    }

    return data as RiskProfile;
  }

  /**
   * Get farm risk profile
   */
  async getFarmRiskProfile(farmId: string): Promise<RiskProfile | null> {
    // First check if the farm has a linked risk profile
    const { data: farmRiskData, error: farmRiskError } = await this.client
      .from('farms')
      .select('risk_profile_id')
      .eq('id', farmId)
      .single();

    if (farmRiskError) {
      this.handleError(farmRiskError);
      return null;
    }

    // If farm has a risk profile, get it
    if (farmRiskData?.risk_profile_id) {
      return this.findById(farmRiskData.risk_profile_id);
    }

    // Otherwise, get default risk profile
    return this.findByName('Default');
  }

  /**
   * Validate order against risk profile
   */
  async validateOrder(
    riskProfileId: string, 
    order: { 
      symbol: string; 
      side: string; 
      quantity: number; 
      price?: number; 
      [key: string]: any;
    },
    accountDetails: {
      balance: number;
      dailyPnL?: number;
      openPositions?: any[];
      tradesExecutedToday?: number;
    }
  ): Promise<{ valid: boolean; reason?: string }> {
    // Get risk profile
    const riskProfile = await this.findById(riskProfileId);
    if (!riskProfile) {
      return { valid: false, reason: 'Risk profile not found' };
    }
    
    // Calculate order value
    const orderValue = order.quantity * (order.price || 0);
    
    // Check position size limit
    const positionSizePct = (orderValue / accountDetails.balance) * 100;
    if (positionSizePct > riskProfile.max_position_size) {
      return { 
        valid: false, 
        reason: `Position size (${positionSizePct.toFixed(2)}%) exceeds maximum allowed (${riskProfile.max_position_size}%)`
      };
    }
    
    // Check daily loss limit if provided
    if (accountDetails.dailyPnL !== undefined) {
      const dailyLossPct = (Math.abs(Math.min(0, accountDetails.dailyPnL)) / accountDetails.balance) * 100;
      if (dailyLossPct > riskProfile.daily_loss_limit) {
        return { 
          valid: false, 
          reason: `Daily loss (${dailyLossPct.toFixed(2)}%) exceeds maximum allowed (${riskProfile.daily_loss_limit}%)`
        };
      }
    }
    
    // Check maximum trades per day if enabled
    if (riskProfile.max_trades_per_day && accountDetails.tradesExecutedToday !== undefined) {
      if (accountDetails.tradesExecutedToday >= riskProfile.max_trades_per_day) {
        return { 
          valid: false, 
          reason: `Maximum trades per day (${riskProfile.max_trades_per_day}) reached`
        };
      }
    }
    
    // Check exposure limit if enabled
    if (riskProfile.max_exposure && accountDetails.openPositions) {
      // Calculate current exposure from open positions
      const currentExposure = accountDetails.openPositions.reduce((sum, pos) => {
        return sum + (pos.quantity * pos.entry_price);
      }, 0);
      
      const currentExposurePct = (currentExposure / accountDetails.balance) * 100;
      const newExposurePct = currentExposurePct + positionSizePct;
      
      if (newExposurePct > riskProfile.max_exposure) {
        return { 
          valid: false, 
          reason: `Total exposure (${newExposurePct.toFixed(2)}%) would exceed maximum allowed (${riskProfile.max_exposure}%)`
        };
      }
    }
    
    // Additional custom checks from parameters could be implemented here
    
    return { valid: true };
  }

  /**
   * Clone a risk profile
   */
  async cloneRiskProfile(id: string, newName: string): Promise<RiskProfile | null> {
    // Get the existing profile
    const existingProfile = await this.findById(id);
    if (!existingProfile) {
      return null;
    }
    
    // Create a new profile based on the existing one
    const newProfile: Omit<RiskProfile, 'id' | 'created_at' | 'updated_at'> = {
      name: newName,
      max_position_size: existingProfile.max_position_size,
      max_drawdown: existingProfile.max_drawdown,
      daily_loss_limit: existingProfile.daily_loss_limit,
      max_trades_per_day: existingProfile.max_trades_per_day,
      max_exposure: existingProfile.max_exposure,
      parameters: { ...existingProfile.parameters }
    };
    
    return this.create(newProfile);
  }
}
