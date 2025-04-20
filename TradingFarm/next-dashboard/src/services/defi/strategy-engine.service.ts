import { ethers } from 'ethers';
import { SupportedChainId } from '@/types/chains';
import {
  LendingStrategyConfig,
  LendingStrategyType,
  BasicSupplyBorrowConfig,
  RecursiveLoopConfig,
  SelfRepayingConfig,
  DynamicLTVConfig,
  StrategyPosition,
  StrategyExecutionStatus,
  UserAccountData,
  CollateralSwapRequest,
  RiskParameters,
  InterestRateMode
} from '@/types/defi-lending.types';
import SafeManager from './safe-manager.service';
import AaveModule from './aave-module.service';
import RiskAnalyzer from './risk-analyzer.service';
import { createServerClient } from '@/utils/supabase/server';

/**
 * Base class for all lending strategies
 * Provides common functionality and interfaces for specific strategy implementations
 */
export abstract class BaseStrategy {
  protected strategyId?: string;
  protected position: Partial<StrategyPosition> = {};
  protected userAccountData?: UserAccountData;
  
  constructor(
    protected readonly config: LendingStrategyConfig,
    protected readonly safeManager: SafeManager,
    protected readonly aaveModule: AaveModule,
    protected readonly riskAnalyzer: RiskAnalyzer
  ) {}
  
  // Initialize a strategy (to be implemented by subclasses)
  abstract initialize(): Promise<StrategyPosition>;
  
  // Execute one iteration of the strategy (to be implemented by subclasses)
  abstract execute(): Promise<StrategyPosition>;
  
  // Rebalance the strategy (to be implemented by subclasses)
  abstract rebalance(): Promise<StrategyPosition>;
  
  // Close the strategy (common implementation with optional override)
  async close(): Promise<StrategyPosition> {
    const chainId = this.config.chainId;
    const safeAddress = this.config.safeAddress;
    
    // Refresh position data
    await this.refreshPositionData();
    
    // If there's any debt, repay it
    if (this.userAccountData && ethers.BigNumber.from(this.userAccountData.totalDebtBase).gt(0)) {
      // Withdraw all collateral to repay debt
      if (this.position.collateralAsset && this.position.collateralAmount) {
        await this.aaveModule.withdraw(
          chainId,
          safeAddress,
          this.position.collateralAsset,
          this.position.collateralAmount
        );
      }
      
      // Assuming we got enough assets to repay debt
      if (this.position.borrowAsset && this.position.borrowAmount) {
        // We might need to swap assets to get the right debt token
        // For simplicity, we'll assume we have the right token already
        await this.aaveModule.repay(
          chainId,
          safeAddress,
          this.position.borrowAsset,
          this.position.borrowAmount,
          InterestRateMode.VARIABLE
        );
      }
    }
    
    // If any collateral remains, withdraw it
    if (this.position.collateralAsset) {
      try {
        // Try to withdraw max amount (represented by type(uint256).max in the contract)
        await this.aaveModule.withdraw(
          chainId,
          safeAddress,
          this.position.collateralAsset,
          ethers.constants.MaxUint256.toString()
        );
      } catch (error) {
        console.error('Error withdrawing remaining collateral:', error);
      }
    }
    
    // Update position status
    await this.updatePositionStatus(StrategyExecutionStatus.COMPLETED);
    
    // Refresh position data one last time
    await this.refreshPositionData();
    
    return this.position as StrategyPosition;
  }
  
  // Get the current position data
  async getPosition(): Promise<StrategyPosition> {
    await this.refreshPositionData();
    return this.position as StrategyPosition;
  }
  
  // Refresh the position data from Aave
  protected async refreshPositionData(): Promise<void> {
    const chainId = this.config.chainId;
    const safeAddress = this.config.safeAddress;
    
    try {
      // Get account data from Aave
      this.userAccountData = await this.aaveModule.getUserAccountData(chainId, safeAddress);
      
      // Update the position
      if (this.position.collateralAsset) {
        // In a complete implementation, we would get the specific asset balances
        // For now, we'll use the total collateral/debt from user account data
        if (this.userAccountData) {
          this.position.healthFactor = this.userAccountData.healthFactor;
          this.position.ltv = this.userAccountData.ltv;
          
          // For specific asset balances, we'd need to get detailed reserve data
          // This is a simplification
          // this.position.collateralAmount = ...
          // this.position.borrowAmount = ...
        }
      }
      
      this.position.lastUpdated = new Date();
    } catch (error) {
      console.error('Error refreshing position data:', error);
      throw error;
    }
  }
  
  // Update the position status in the database
  protected async updatePositionStatus(status: StrategyExecutionStatus): Promise<void> {
    if (!this.strategyId) return;
    
    try {
      const supabase = createServerClient();
      
      await supabase
        .from('lending_strategies')
        .update({ status })
        .eq('id', this.strategyId);
      
      this.position.status = status;
    } catch (error) {
      console.error('Error updating position status:', error);
    }
  }
  
  // Log an action taken by the strategy
  protected async logAction(
    actionType: string,
    description: string,
    txHash?: string,
    beforeState?: Partial<StrategyPosition>,
    afterState?: Partial<StrategyPosition>
  ): Promise<void> {
    if (!this.strategyId) return;
    
    try {
      const supabase = createServerClient();
      
      await supabase.from('strategy_actions').insert({
        strategy_id: this.strategyId,
        action_type: actionType,
        description,
        tx_hash: txHash,
        before_state: beforeState,
        after_state: afterState,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error logging action:', error);
    }
  }
  
  // Check if the position is at risk (health factor getting low)
  protected async checkRisk(): Promise<boolean> {
    await this.refreshPositionData();
    
    if (!this.userAccountData) return false;
    
    const healthFactor = parseFloat(ethers.utils.formatUnits(this.userAccountData.healthFactor, 18));
    const riskParams = this.getRiskParameters();
    
    return healthFactor < riskParams.minHealthFactor;
  }
  
  // Get risk parameters for the strategy
  protected getRiskParameters(): RiskParameters {
    return {
      minHealthFactor: 1.1, // Default minimum health factor
      emergencyHealthFactor: 1.03, // When to take emergency action
      maxLTV: 80, // Default maximum LTV (%)
      ltvBuffer: 5 // Buffer below liquidation threshold (%)
    };
  }
}

/**
 * Implementation of the basic supply-borrow strategy
 */
export class BasicSupplyBorrowStrategy extends BaseStrategy {
  constructor(
    protected readonly config: BasicSupplyBorrowConfig,
    safeManager: SafeManager,
    aaveModule: AaveModule,
    riskAnalyzer: RiskAnalyzer
  ) {
    super(config, safeManager, aaveModule, riskAnalyzer);
  }
  
  async initialize(): Promise<StrategyPosition> {
    const chainId = this.config.chainId;
    const safeAddress = this.config.safeAddress;
    const collateralAsset = this.config.collateralAsset;
    const borrowAsset = this.config.borrowAsset;
    const initialAmount = this.config.initialCollateralAmount;
    
    try {
      // Store initial strategy data
      await this.createStrategyInDatabase();
      
      // Supply collateral
      const supplyTxHash = await this.aaveModule.supply(
        chainId,
        safeAddress,
        collateralAsset,
        initialAmount
      );
      
      await this.logAction(
        'supply',
        `Supplied ${initialAmount} of collateral asset`,
        supplyTxHash
      );
      
      // Calculate how much to borrow based on target LTV
      await this.refreshPositionData();
      
      if (!this.userAccountData) {
        throw new Error('Failed to get user account data after supplying collateral');
      }
      
      const totalCollateralInBase = ethers.BigNumber.from(this.userAccountData.totalCollateralBase);
      const targetBorrowInBase = totalCollateralInBase.mul(this.config.targetLTV).div(100);
      
      // For simplicity, we assume a 1:1 ratio between base currency and specific assets
      // In a complete implementation, we would use price oracles to convert
      const borrowAmount = targetBorrowInBase.toString();
      
      // Borrow the calculated amount
      const borrowTxHash = await this.aaveModule.borrow(
        chainId,
        safeAddress,
        borrowAsset,
        borrowAmount,
        InterestRateMode.VARIABLE
      );
      
      await this.logAction(
        'borrow',
        `Borrowed ${borrowAmount} of borrow asset`,
        borrowTxHash
      );
      
      // Update position data
      this.position.collateralAsset = collateralAsset;
      this.position.collateralAmount = initialAmount;
      this.position.borrowAsset = borrowAsset;
      this.position.borrowAmount = borrowAmount;
      
      await this.refreshPositionData();
      await this.updatePositionStatus(StrategyExecutionStatus.ACTIVE);
      
      return this.position as StrategyPosition;
    } catch (error) {
      console.error('Error initializing basic supply-borrow strategy:', error);
      await this.updatePositionStatus(StrategyExecutionStatus.FAILED);
      throw error;
    }
  }
  
  async execute(): Promise<StrategyPosition> {
    // For a basic strategy, execution is just maintaining the position
    // Check if health factor is within safe limits
    const isAtRisk = await this.checkRisk();
    
    if (isAtRisk) {
      await this.protectFromLiquidation();
    }
    
    await this.refreshPositionData();
    return this.position as StrategyPosition;
  }
  
  async rebalance(): Promise<StrategyPosition> {
    const chainId = this.config.chainId;
    const safeAddress = this.config.safeAddress;
    
    await this.refreshPositionData();
    
    if (!this.userAccountData) {
      throw new Error('No position data available for rebalancing');
    }
    
    const currentLTV = this.userAccountData.ltv;
    const targetLTV = this.config.targetLTV;
    
    // If current LTV is significantly different from target, rebalance
    if (Math.abs(currentLTV - targetLTV) > 5) { // 5% threshold for rebalancing
      try {
        const totalCollateralInBase = ethers.BigNumber.from(this.userAccountData.totalCollateralBase);
        const currentDebtInBase = ethers.BigNumber.from(this.userAccountData.totalDebtBase);
        const targetDebtInBase = totalCollateralInBase.mul(targetLTV).div(100);
        
        const debtDifference = targetDebtInBase.sub(currentDebtInBase);
        
        if (debtDifference.gt(0)) {
          // Need to borrow more
          const borrowTxHash = await this.aaveModule.borrow(
            chainId,
            safeAddress,
            this.position.borrowAsset as string,
            debtDifference.toString(),
            InterestRateMode.VARIABLE
          );
          
          await this.logAction(
            'rebalance_borrow',
            `Borrowed ${debtDifference} more to reach target LTV`,
            borrowTxHash
          );
        } else if (debtDifference.lt(0)) {
          // Need to repay some debt
          const repayAmount = debtDifference.abs().toString();
          
          // Check if the Safe has enough of the borrow asset to repay
          const borrowTokenBalance = await this.safeManager.getTokenBalance(
            safeAddress,
            chainId,
            this.position.borrowAsset as string
          );
          
          if (ethers.BigNumber.from(borrowTokenBalance).gte(repayAmount)) {
            // Safe has enough tokens to repay
            const repayTxHash = await this.aaveModule.repay(
              chainId,
              safeAddress,
              this.position.borrowAsset as string,
              repayAmount,
              InterestRateMode.VARIABLE
            );
            
            await this.logAction(
              'rebalance_repay',
              `Repaid ${repayAmount} to reach target LTV`,
              repayTxHash
            );
          } else {
            // Not enough tokens in the Safe, would need to withdraw collateral and swap
            console.log('Not enough tokens to repay, would need to withdraw collateral');
            // In a complete implementation, we would handle this case
          }
        }
      } catch (error) {
        console.error('Error during rebalancing:', error);
        throw error;
      }
    }
    
    await this.refreshPositionData();
    return this.position as StrategyPosition;
  }
  
  // Protect the position from liquidation
  private async protectFromLiquidation(): Promise<void> {
    if (!this.userAccountData) return;
    
    const healthFactor = parseFloat(ethers.utils.formatUnits(this.userAccountData.healthFactor, 18));
    const riskParams = this.getRiskParameters();
    
    // If health factor is below the emergency threshold, take action
    if (healthFactor < riskParams.emergencyHealthFactor) {
      try {
        // In a complete implementation, we would:
        // 1. Check if the Safe has any of the borrow asset to repay
        // 2. If not, potentially withdraw some collateral and swap it
        // 3. Repay enough debt to restore health factor
        
        // For simplicity, we'll just log the action
        await this.logAction(
          'liquidation_protection',
          `Emergency protection needed: health factor ${healthFactor}`,
          undefined
        );
      } catch (error) {
        console.error('Error protecting from liquidation:', error);
      }
    }
  }
  
  // Store the strategy in the database
  private async createStrategyInDatabase(): Promise<void> {
    try {
      const supabase = createServerClient();
      
      const { data, error } = await supabase
        .from('lending_strategies')
        .insert({
          agent_id: this.config.agentId,
          safe_address: this.config.safeAddress,
          chain_id: this.config.chainId,
          type: this.config.type,
          collateral_asset: this.config.collateralAsset,
          borrow_asset: this.config.borrowAsset,
          initial_collateral_amount: this.config.initialCollateralAmount,
          target_ltv: this.config.targetLTV,
          target_health_factor: this.config.targetHealthFactor,
          liquidation_protection: this.config.liquidationProtection,
          auto_rebalancing: this.config.autoRebalancing,
          status: StrategyExecutionStatus.PENDING,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();
      
      if (error) {
        throw error;
      }
      
      this.strategyId = data.id;
      this.position.strategyId = data.id;
      this.position.safeAddress = this.config.safeAddress;
      this.position.chainId = this.config.chainId;
      this.position.status = StrategyExecutionStatus.PENDING;
    } catch (error) {
      console.error('Error creating strategy in database:', error);
      throw error;
    }
  }
}

/**
 * Strategy Engine factory - creates and manages lending strategies
 */
export class StrategyEngine {
  constructor(
    private readonly safeManager: SafeManager,
    private readonly aaveModule: AaveModule,
    private readonly riskAnalyzer: RiskAnalyzer
  ) {}
  
  // Create a new strategy based on configuration
  async createStrategy(config: LendingStrategyConfig): Promise<BaseStrategy> {
    switch (config.type) {
      case LendingStrategyType.BASIC_SUPPLY_BORROW:
        return new BasicSupplyBorrowStrategy(
          config as BasicSupplyBorrowConfig,
          this.safeManager,
          this.aaveModule,
          this.riskAnalyzer
        );
        
      case LendingStrategyType.RECURSIVE_LOOP:
        // In a full implementation, we would have specific classes for each strategy type
        throw new Error('Recursive loop strategy not implemented yet');
        
      case LendingStrategyType.SELF_REPAYING:
        throw new Error('Self-repaying strategy not implemented yet');
        
      case LendingStrategyType.DYNAMIC_LTV:
        throw new Error('Dynamic LTV strategy not implemented yet');
        
      default:
        throw new Error(`Unknown strategy type: ${(config as any).type}`);
    }
  }
  
  // Load an existing strategy by ID
  async loadStrategy(strategyId: string): Promise<BaseStrategy> {
    try {
      const supabase = createServerClient();
      
      const { data, error } = await supabase
        .from('lending_strategies')
        .select('*')
        .eq('id', strategyId)
        .single();
      
      if (error) {
        throw error;
      }
      
      if (!data) {
        throw new Error(`Strategy not found: ${strategyId}`);
      }
      
      // Convert from database format to config format
      const config: LendingStrategyConfig = {
        type: data.type as LendingStrategyType,
        agentId: data.agent_id,
        safeAddress: data.safe_address,
        chainId: data.chain_id,
        protocol: data.protocol,
        targetHealthFactor: data.target_health_factor,
        liquidationProtection: data.liquidation_protection,
        autoRebalancing: data.auto_rebalancing,
        
        // These properties depend on the strategy type
        // We'll just add them all for simplicity
        collateralAsset: data.collateral_asset,
        borrowAsset: data.borrow_asset,
        initialCollateralAmount: data.initial_collateral_amount,
        targetLTV: data.target_ltv
      } as LendingStrategyConfig;
      
      return await this.createStrategy(config);
    } catch (error) {
      console.error('Error loading strategy:', error);
      throw error;
    }
  }
  
  // Get all strategies for an agent
  async getAgentStrategies(agentId: string): Promise<StrategyPosition[]> {
    try {
      const supabase = createServerClient();
      
      const { data, error } = await supabase
        .from('lending_strategies')
        .select('*')
        .eq('agent_id', agentId);
      
      if (error) {
        throw error;
      }
      
      if (!data || data.length === 0) {
        return [];
      }
      
      // For each strategy, load it and get its position
      const positions: StrategyPosition[] = [];
      
      for (const strategyData of data) {
        try {
          const strategy = await this.loadStrategy(strategyData.id);
          const position = await strategy.getPosition();
          positions.push(position);
        } catch (error) {
          console.error(`Error loading strategy ${strategyData.id}:`, error);
          // Continue with other strategies
        }
      }
      
      return positions;
    } catch (error) {
      console.error('Error getting agent strategies:', error);
      throw error;
    }
  }
}

export default StrategyEngine;
