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
  InterestRateMode,
  AaveChainConfig,
  SimulationResult,
  StrategyAction
} from '@/types/defi-lending.types';
import SafeManager from './defi/safe-manager.service';
import AaveModule from './defi/aave-module.service';
import RiskAnalyzer from './defi/risk-analyzer.service';
import StrategyEngine, { BaseStrategy } from './defi/strategy-engine.service';
import { createServerClient } from '@/utils/supabase/server';

/**
 * Main service for DeFi lending strategies and interactions with Aave
 * - Initializes all required components (Safe, Aave, Strategy Engine)
 * - Provides a high-level API for agent interactions
 * - Handles initialization, execution, and monitoring of strategies
 * - Integrates with the Trading Farm agent system
 */
export class DefiLendingService {
  private safeManager: SafeManager;
  private aaveModule: AaveModule;
  private riskAnalyzer: RiskAnalyzer;
  private strategyEngine: StrategyEngine;
  
  // Chain configurations including RPC endpoints and Aave addresses
  private readonly chainConfigs: Record<SupportedChainId, AaveChainConfig> = {
    // Ethereum Mainnet
    1: {
      chainId: 1,
      poolAddress: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2', // Aave V3 pool
      poolAddressProviderAddress: '0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e',
      wethGatewayAddress: '0xD322A49006FC828F9B5B37Ab215F99B4E5caB19C',
      protocolDataProviderAddress: '0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3',
    },
    
    // Arbitrum
    42161: {
      chainId: 42161,
      poolAddress: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      poolAddressProviderAddress: '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb',
      wethGatewayAddress: '0x0Fc73040b26a3E15B15bf24205b565B3F0B4bf7e',
      protocolDataProviderAddress: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
    },
    
    // Base
    8453: {
      chainId: 8453,
      poolAddress: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
      poolAddressProviderAddress: '0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D',
      wethGatewayAddress: '0x9aBB27581c2E46A114F8C367355851e0580a3aC6',
      protocolDataProviderAddress: '0x2d8A3C5677189723C4cB8873CfC9C8976FDF38Ac',
    },
    
    // Sonic (example chain ID)
    10254: {
      chainId: 10254,
      poolAddress: '0x6b8558764d3b7316ff0e687c3296a4fdd2742275',
      poolAddressProviderAddress: '0x33fDb79dD3D6E789628719bEC1A3a6020AfC7add',
      wethGatewayAddress: '0xA9F138397bd71B82a943bDED6CD454c0d0c92da9',
      protocolDataProviderAddress: '0xF1C2f69B60FE1daF05575b05d250592219A98BB9',
    }
  };
  
  // RPC endpoints for each chain
  private readonly rpcUrls: Record<SupportedChainId, string> = {
    1: process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/your-api-key',
    42161: process.env.ARBITRUM_RPC_URL || 'https://arb-mainnet.g.alchemy.com/v2/your-api-key',
    8453: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    10254: process.env.SONIC_RPC_URL || 'https://mainnet.sonic.fantom.network/rpc',
  };
  
  // Multisend contract addresses for each chain
  private readonly multisendAddresses: Record<SupportedChainId, string> = {
    1: '0x40A2aCCbd92BCA938b02010E17A5b8929b49130D', // Ethereum
    42161: '0x40A2aCCbd92BCA938b02010E17A5b8929b49130D', // Arbitrum
    8453: '0x40A2aCCbd92BCA938b02010E17A5b8929b49130D', // Base
    10254: '0x40A2aCCbd92BCA938b02010E17A5b8929b49130D', // Sonic
  };
  
  /**
   * Initialize the DeFi lending service
   */
  constructor() {
    // Initialize SafeManager
    this.safeManager = new SafeManager(
      this.rpcUrls,
      {},
      this.multisendAddresses
    );
    
    // Initialize AaveModule
    this.aaveModule = new AaveModule(
      this.safeManager,
      this.chainConfigs,
      this.rpcUrls
    );
    
    // Initialize RiskAnalyzer
    this.riskAnalyzer = new RiskAnalyzer(
      this.aaveModule,
      this.rpcUrls
    );
    
    // Initialize StrategyEngine
    this.strategyEngine = new StrategyEngine(
      this.safeManager,
      this.aaveModule,
      this.riskAnalyzer
    );
  }
  
  /**
   * Create a Safe wallet for an agent on a specific chain
   */
  async createSafeWallet(
    agentId: string,
    chainId: SupportedChainId,
    ownerAddresses: string[],
    threshold: number = 1
  ): Promise<string> {
    return this.safeManager.createSafe(agentId, chainId, ownerAddresses, threshold);
  }
  
  /**
   * Get supported assets for a chain
   */
  async getSupportedAssets(chainId: SupportedChainId): Promise<any[]> {
    return this.aaveModule.getSupportedAssets(chainId);
  }
  
  /**
   * Create a new lending strategy for an agent
   */
  async createStrategy(config: LendingStrategyConfig): Promise<StrategyPosition> {
    try {
      // Create the strategy
      const strategy = await this.strategyEngine.createStrategy(config);
      
      // Initialize the strategy
      const position = await strategy.initialize();
      
      return position;
    } catch (error) {
      console.error('Error creating strategy:', error);
      throw error;
    }
  }
  
  /**
   * Get a strategy by ID
   */
  async getStrategy(strategyId: string): Promise<StrategyPosition> {
    try {
      const strategy = await this.strategyEngine.loadStrategy(strategyId);
      return strategy.getPosition();
    } catch (error) {
      console.error('Error getting strategy:', error);
      throw error;
    }
  }
  
  /**
   * Execute a strategy (run one iteration of its logic)
   */
  async executeStrategy(strategyId: string): Promise<StrategyPosition> {
    try {
      const strategy = await this.strategyEngine.loadStrategy(strategyId);
      return strategy.execute();
    } catch (error) {
      console.error('Error executing strategy:', error);
      throw error;
    }
  }
  
  /**
   * Rebalance a strategy (adjust position to match target parameters)
   */
  async rebalanceStrategy(strategyId: string): Promise<StrategyPosition> {
    try {
      const strategy = await this.strategyEngine.loadStrategy(strategyId);
      return strategy.rebalance();
    } catch (error) {
      console.error('Error rebalancing strategy:', error);
      throw error;
    }
  }
  
  /**
   * Close a strategy (repay all debt and withdraw all collateral)
   */
  async closeStrategy(strategyId: string): Promise<StrategyPosition> {
    try {
      const strategy = await this.strategyEngine.loadStrategy(strategyId);
      return strategy.close();
    } catch (error) {
      console.error('Error closing strategy:', error);
      throw error;
    }
  }
  
  /**
   * Get all strategies for an agent
   */
  async getAgentStrategies(agentId: string): Promise<StrategyPosition[]> {
    return this.strategyEngine.getAgentStrategies(agentId);
  }
  
  /**
   * Simulate how a strategy would perform with given parameters
   */
  async simulateStrategy(
    config: LendingStrategyConfig
  ): Promise<{
    estimatedPosition: StrategyPosition;
    riskAnalysis: {
      healthFactor: number;
      liquidationRisk: 'low' | 'medium' | 'high';
      maxDrawdown: number;
    };
  }> {
    try {
      // This is a placeholder - in a full implementation, we would:
      // 1. Simulate the initial transactions (supply, borrow, etc.)
      // 2. Calculate the expected position
      // 3. Run risk analysis (e.g., what happens if prices drop)
      
      // For basic supply-borrow, we can estimate the position
      if (config.type === LendingStrategyType.BASIC_SUPPLY_BORROW) {
        const basicConfig = config as BasicSupplyBorrowConfig;
        
        // Simple estimation
        const collateralAmount = basicConfig.initialCollateralAmount;
        const borrowAmount = (BigInt(collateralAmount) * BigInt(basicConfig.targetLTV) / BigInt(100)).toString();
        
        // Assuming healthy position
        const estimatedPosition: StrategyPosition = {
          strategyId: 'simulation',
          safeAddress: basicConfig.safeAddress,
          chainId: basicConfig.chainId,
          collateralAsset: basicConfig.collateralAsset,
          collateralAmount,
          borrowAsset: basicConfig.borrowAsset,
          borrowAmount,
          healthFactor: '2000000000000000000', // 2.0
          ltv: basicConfig.targetLTV,
          status: StrategyExecutionStatus.ACTIVE,
          lastUpdated: new Date()
        };
        
        // Basic risk analysis
        let liquidationRisk: 'low' | 'medium' | 'high' = 'low';
        if (basicConfig.targetLTV > 70) {
          liquidationRisk = 'high';
        } else if (basicConfig.targetLTV > 50) {
          liquidationRisk = 'medium';
        }
        
        return {
          estimatedPosition,
          riskAnalysis: {
            healthFactor: 2.0,
            liquidationRisk,
            maxDrawdown: 100 - basicConfig.targetLTV // Simple estimate
          }
        };
      } else if (config.type === LendingStrategyType.RECURSIVE_LOOP) {
        const loopConfig = config as RecursiveLoopConfig;
        
        // Get asset configs
        const collateralAsset = await this.aaveModule.getAssetConfig(
          loopConfig.chainId,
          loopConfig.collateralAsset
        );
        
        const borrowAsset = await this.aaveModule.getAssetConfig(
          loopConfig.chainId,
          loopConfig.borrowAsset
        );
        
        if (!collateralAsset || !borrowAsset) {
          throw new Error('Asset configuration not found');
        }
        
        // Calculate optimal loops and final position
        const loopResult = this.riskAnalyzer.calculateOptimalLoops(
          collateralAsset,
          borrowAsset,
          loopConfig.initialCollateralAmount,
          loopConfig.targetLTV,
          collateralAsset.ltv // Max LTV from asset config
        );
        
        // The health factor is approximately collateral_value * liquidation_threshold / debt_value
        const healthFactor = 
          (BigInt(loopResult.finalCollateral) * BigInt(collateralAsset.liquidationThreshold) / BigInt(100)) / 
          BigInt(loopResult.finalDebt);
        
        // Create the estimated position
        const estimatedPosition: StrategyPosition = {
          strategyId: 'simulation',
          safeAddress: loopConfig.safeAddress,
          chainId: loopConfig.chainId,
          collateralAsset: loopConfig.collateralAsset,
          collateralAmount: loopResult.finalCollateral,
          borrowAsset: loopConfig.borrowAsset,
          borrowAmount: loopResult.finalDebt,
          healthFactor: (healthFactor * BigInt(1e18)).toString(), // Convert to Aave format
          ltv: loopConfig.targetLTV,
          status: StrategyExecutionStatus.ACTIVE,
          lastUpdated: new Date()
        };
        
        // Risk analysis
        let liquidationRisk: 'low' | 'medium' | 'high' = 'low';
        if (loopConfig.targetLTV > 70) {
          liquidationRisk = 'high';
        } else if (loopConfig.targetLTV > 50) {
          liquidationRisk = 'medium';
        }
        
        // Higher leverage means higher risk of liquidation with smaller price movements
        const maxDrawdown = 100 - (loopConfig.targetLTV * 100 / collateralAsset.liquidationThreshold);
        
        return {
          estimatedPosition,
          riskAnalysis: {
            healthFactor: Number(healthFactor),
            liquidationRisk,
            maxDrawdown
          }
        };
      }
      
      // Default placeholder for other strategies
      throw new Error('Simulation not implemented for this strategy type');
    } catch (error) {
      console.error('Error simulating strategy:', error);
      throw error;
    }
  }
  
  /**
   * Get the history of actions for a strategy
   */
  async getStrategyActions(strategyId: string): Promise<StrategyAction[]> {
    try {
      const supabase = createServerClient();
      
      const { data, error } = await supabase
        .from('strategy_actions')
        .select('*')
        .eq('strategy_id', strategyId)
        .order('timestamp', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      // Convert from database format to StrategyAction format
      return data.map((action: any) => ({
        id: action.id,
        strategyId: action.strategy_id,
        actionType: action.action_type,
        description: action.description,
        txHash: action.tx_hash,
        timestamp: new Date(action.timestamp),
        beforeState: action.before_state,
        afterState: action.after_state
      }));
    } catch (error) {
      console.error('Error getting strategy actions:', error);
      throw error;
    }
  }
  
  /**
   * Simulate how a price change would affect a strategy
   */
  async simulatePriceChange(
    strategyId: string,
    priceChanges: Record<string, number> // Asset address -> percent change
  ): Promise<SimulationResult> {
    try {
      const strategy = await this.strategyEngine.loadStrategy(strategyId);
      const position = await strategy.getPosition();
      
      return this.riskAnalyzer.simulatePriceChanges(
        position.chainId,
        position.safeAddress,
        priceChanges
      );
    } catch (error) {
      console.error('Error simulating price change:', error);
      throw error;
    }
  }
  
  /**
   * Transfer tokens from a Safe wallet to another address
   */
  async transferFromSafe(
    safeAddress: string,
    chainId: SupportedChainId,
    tokenAddress: string,
    toAddress: string,
    amount: string
  ): Promise<string> {
    return this.safeManager.transferTokens(
      safeAddress,
      chainId,
      tokenAddress,
      toAddress,
      amount
    );
  }
  
  /**
   * Get the current balance of a token in a Safe wallet
   */
  async getSafeBalance(
    safeAddress: string,
    chainId: SupportedChainId,
    tokenAddress: string
  ): Promise<string> {
    return this.safeManager.getTokenBalance(
      safeAddress,
      chainId,
      tokenAddress
    );
  }
  
  /**
   * Calculate how much debt to repay to achieve a target health factor
   */
  async calculateRepayToHealthFactor(
    strategyId: string,
    targetHealthFactor: number
  ): Promise<{ repayAmount: string; expectedHealthFactor: number }> {
    try {
      const strategy = await this.strategyEngine.loadStrategy(strategyId);
      const position = await strategy.getPosition();
      
      return this.riskAnalyzer.calculateRepayAmount(
        position.chainId,
        position.safeAddress,
        targetHealthFactor
      );
    } catch (error) {
      console.error('Error calculating repay amount:', error);
      throw error;
    }
  }
}

// Export a singleton instance
const defiLendingService = new DefiLendingService();
export default defiLendingService;
