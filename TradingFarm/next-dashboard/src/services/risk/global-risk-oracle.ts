/**
 * Trading Farm Multi-Chain Integration
 * GlobalRiskOracle - Centralized service for cross-chain risk assessment and management
 */

import { RiskService } from './risk-service';
import { PolicyTranslator, UnifiedPolicy } from '../policy/policy-translator';
import { MultisigWalletService } from '../multisig-wallet-service';
import { TradingService } from '../trading/trading-service';
import { BridgeService } from '../bridge/bridge-service';
import { 
  PositionRisk, 
  VaultRiskSummary, 
  RiskPrecheck, 
  RiskPrecheckResult, 
  RiskParameter, 
  RuleType, 
  EventSeverity 
} from './risk-types';
import { createServerClient } from '@/utils/supabase/server';

export interface RiskOracleConfig {
  enableRealTimeMonitoring?: boolean;
  refreshIntervalSeconds?: number;
  alertThreshold?: number; // Risk score threshold for generating alerts
  autoPauseThreshold?: number; // Risk score threshold for auto-pausing trading
}

/**
 * GlobalRiskOracle - Coordinates risk management across all chains
 * Acts as the centralized risk assessment and policy enforcement system
 */
export class GlobalRiskOracle {
  private static config: RiskOracleConfig = {
    enableRealTimeMonitoring: true,
    refreshIntervalSeconds: 300, // 5 minutes
    alertThreshold: 70,
    autoPauseThreshold: 85
  };
  
  /**
   * Initialize the Global Risk Oracle with configuration
   */
  static initialize(config: RiskOracleConfig): void {
    this.config = {
      ...this.config,
      ...config
    };
    
    console.log(`[GlobalRiskOracle] Initialized with config:`, this.config);
    
    // In a real implementation, this would start background monitoring tasks
    if (this.config.enableRealTimeMonitoring) {
      console.log(`[GlobalRiskOracle] Real-time monitoring enabled with ${this.config.refreshIntervalSeconds}s refresh interval`);
    }
  }
  
  /**
   * Get comprehensive risk assessment for a vault across all chains
   */
  static async getVaultRiskAssessment(vaultId: string): Promise<PositionRisk> {
    try {
      return await RiskService.analyzeVaultRisk(vaultId);
    } catch (error) {
      console.error('Error in getVaultRiskAssessment:', error);
      
      // Return a default risk assessment with error
      return {
        vaultId,
        totalUsdValue: '0',
        valueByChain: {},
        valueByAsset: {},
        valueByPositionType: {},
        largestPosition: {
          chainSlug: '',
          assetAddress: '',
          usdValue: '0'
        },
        riskScore: 0,
        warnings: [{
          type: 'error',
          message: `Error getting risk assessment: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'medium'
        }]
      };
    }
  }
  
  /**
   * Get risk summary for a vault with position data by chain
   */
  static async getVaultRiskSummary(vaultId: string): Promise<VaultRiskSummary> {
    try {
      return await RiskService.getVaultRiskSummary(vaultId);
    } catch (error) {
      console.error('Error in getVaultRiskSummary:', error);
      
      // Return default summary with error
      return {
        vaultId,
        totalUsdValue: '0',
        positionsByChain: [],
        riskScore: 0,
        activeWarnings: 0,
        lastUpdated: new Date().toISOString()
      };
    }
  }
  
  /**
   * Pre-check a trading operation for risk compliance
   */
  static async checkTradeRisk(
    vaultId: string,
    chainSlug: string,
    assetAddress: string,
    amountUsd: string,
    protocol?: string
  ): Promise<RiskPrecheckResult> {
    return await RiskService.performRiskPrecheck({
      operation: 'trade',
      vaultId,
      chainSlug,
      assetAddress,
      amountUsd,
      protocol
    });
  }
  
  /**
   * Pre-check a bridge operation for risk compliance
   */
  static async checkBridgeRisk(
    vaultId: string,
    sourceChain: string,
    destinationChain: string,
    sourceAsset: string,
    amountUsd: string
  ): Promise<RiskPrecheckResult> {
    return await RiskService.performRiskPrecheck({
      operation: 'bridge',
      vaultId,
      chainSlug: sourceChain,
      assetAddress: sourceAsset,
      targetAssetAddress: destinationChain, // Using this field to store destination chain temporarily
      amountUsd,
      metadata: {
        destinationChain
      }
    });
  }
  
  /**
   * Create or update risk parameters for a vault
   */
  static async updateRiskParameters(
    vaultId: string,
    ruleType: RuleType,
    parameters: Record<string, any>,
    chainSlug?: string,
    name?: string,
    description?: string,
    priority?: number
  ): Promise<{ success: boolean; riskParameterId?: string; error?: string }> {
    try {
      const supabase = createServerClient();
      
      // Check if parameter already exists
      const { data: existingParam, error: queryError } = await supabase
        .from('risk_parameters')
        .select('id')
        .eq('applies_to', 'vault')
        .eq('entity_id', vaultId)
        .eq('rule_type', ruleType)
        .eq('chain_slug', chainSlug || null)
        .single();
      
      if (queryError && !queryError.message.includes('No rows found')) {
        throw new Error(`Error checking existing parameters: ${queryError.message}`);
      }
      
      if (existingParam) {
        // Update existing parameter
        const { error: updateError } = await supabase
          .from('risk_parameters')
          .update({
            name: name || `Vault Risk Rule: ${ruleType}`,
            description,
            parameters,
            is_active: true,
            priority: priority || 100,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingParam.id);
          
        if (updateError) {
          throw new Error(`Error updating risk parameter: ${updateError.message}`);
        }
        
        return {
          success: true,
          riskParameterId: existingParam.id
        };
      } else {
        // Create new parameter
        const { data: newParam, error: insertError } = await supabase
          .from('risk_parameters')
          .insert({
            name: name || `Vault Risk Rule: ${ruleType}`,
            description,
            applies_to: 'vault',
            entity_id: vaultId,
            rule_type: ruleType,
            chain_slug: chainSlug,
            parameters,
            is_active: true,
            priority: priority || 100
          })
          .select('id')
          .single();
          
        if (insertError) {
          throw new Error(`Error creating risk parameter: ${insertError.message}`);
        }
        
        return {
          success: true,
          riskParameterId: newParam.id
        };
      }
    } catch (error) {
      console.error('Error in updateRiskParameters:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Set unified risk policy for a vault and propagate to all multisig wallets
   */
  static async setUnifiedRiskPolicy(
    vaultId: string,
    policy: UnifiedPolicy
  ): Promise<{ success: boolean; results: Record<string, any>; error?: string }> {
    try {
      // Get all multisig wallets for the vault
      const multisigService = new MultisigWalletService();
      const { success, data: multisigs } = await MultisigWalletService.listMultisigWallets(vaultId);
      
      if (!success || !multisigs || multisigs.length === 0) {
        return {
          success: false,
          results: {},
          error: 'No multisig wallets found for vault'
        };
      }
      
      // Create risk parameters based on policy
      const riskParamPromises: Promise<any>[] = [];
      
      // Set position size limit
      if (policy.maxPositionUSD) {
        riskParamPromises.push(
          this.updateRiskParameters(
            vaultId,
            'max_position_size',
            {
              max_usd_value: policy.maxPositionUSD,
              enforcement: 'hard_limit'
            },
            undefined, // Apply to all chains
            'Maximum Position Size',
            'Maximum total position value across all assets'
          )
        );
      }
      
      // Set transaction size limit
      if (policy.maxTransactionUSD) {
        riskParamPromises.push(
          this.updateRiskParameters(
            vaultId,
            'max_transaction_size',
            {
              max_usd_value: policy.maxTransactionUSD,
              enforcement: 'hard_limit'
            },
            undefined, // Apply to all chains
            'Maximum Transaction Size',
            'Maximum single transaction value'
          )
        );
      }
      
      // Set daily volume limit
      if (policy.maxDailyVolumeUSD) {
        riskParamPromises.push(
          this.updateRiskParameters(
            vaultId,
            'max_daily_volume',
            {
              max_usd_value: policy.maxDailyVolumeUSD,
              enforcement: 'warning'
            },
            undefined, // Apply to all chains
            'Maximum Daily Volume',
            'Maximum trading volume per day'
          )
        );
      }
      
      // Set allowed protocols
      if (policy.allowedProtocols && policy.allowedProtocols.length > 0) {
        riskParamPromises.push(
          this.updateRiskParameters(
            vaultId,
            'allowed_protocol_list',
            {
              protocols: policy.allowedProtocols,
              enforcement: 'approval_required'
            },
            undefined, // Apply to all chains
            'Allowed Protocols',
            'List of allowed protocols for trading and DeFi'
          )
        );
      }
      
      // Set restricted protocols
      if (policy.restrictedProtocols && policy.restrictedProtocols.length > 0) {
        riskParamPromises.push(
          this.updateRiskParameters(
            vaultId,
            'blocked_protocol_list',
            {
              protocols: policy.restrictedProtocols,
              enforcement: 'hard_limit'
            },
            undefined, // Apply to all chains
            'Blocked Protocols',
            'List of blocked protocols for trading and DeFi'
          )
        );
      }
      
      // Set allowed assets
      if (policy.allowedAssets && policy.allowedAssets.length > 0) {
        riskParamPromises.push(
          this.updateRiskParameters(
            vaultId,
            'allowed_asset_list',
            {
              assets: policy.allowedAssets,
              enforcement: 'approval_required'
            },
            undefined, // Apply to all chains
            'Allowed Assets',
            'List of allowed assets for trading'
          )
        );
      }
      
      // Set restricted assets
      if (policy.restrictedAssets && policy.restrictedAssets.length > 0) {
        riskParamPromises.push(
          this.updateRiskParameters(
            vaultId,
            'blocked_asset_list',
            {
              assets: policy.restrictedAssets,
              enforcement: 'hard_limit'
            },
            undefined, // Apply to all chains
            'Blocked Assets',
            'List of blocked assets for trading'
          )
        );
      }
      
      // Wait for all risk parameters to be created/updated
      await Promise.all(riskParamPromises);
      
      // Update on-chain policies for each multisig wallet
      const policyUpdatePromises = multisigs.map(async multisig => {
        try {
          const result = await PolicyTranslator.updatePolicy({
            vaultId,
            multisigId: multisig.id,
            chainSlug: multisig.chainSlug,
            multisigType: multisig.multisigType as any,
            multisigAddress: multisig.multisigAddress,
            policy
          });
          
          return {
            chainSlug: multisig.chainSlug,
            multisigAddress: multisig.multisigAddress,
            success: result.success,
            transactionHash: result.transactionHash,
            errorMessage: result.errorMessage
          };
        } catch (error) {
          console.error(`Error updating policy for ${multisig.chainSlug}:`, error);
          return {
            chainSlug: multisig.chainSlug,
            multisigAddress: multisig.multisigAddress,
            success: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      });
      
      const policyResults = await Promise.all(policyUpdatePromises);
      
      // Build results object
      const results: Record<string, any> = {
        riskParametersUpdated: true,
        policyUpdates: {}
      };
      
      for (const result of policyResults) {
        results.policyUpdates[result.chainSlug] = {
          success: result.success,
          multisigAddress: result.multisigAddress,
          transactionHash: result.transactionHash,
          errorMessage: result.errorMessage
        };
      }
      
      // Check overall success - at least one chain must succeed
      const atLeastOneSuccess = policyResults.some(r => r.success);
      
      return {
        success: atLeastOneSuccess,
        results
      };
    } catch (error) {
      console.error('Error in setUnifiedRiskPolicy:', error);
      return {
        success: false,
        results: {},
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Perform a full vault risk audit across all chains
   * This is a comprehensive assessment that collects positions and analyzes risk
   */
  static async auditVaultRisk(vaultId: string): Promise<{
    success: boolean;
    summary?: VaultRiskSummary;
    fullAssessment?: PositionRisk;
    riskEvents?: number;
    error?: string;
  }> {
    try {
      // 1. Collect positions from all chains
      await this.collectVaultPositions(vaultId);
      
      // 2. Get risk summary
      const summary = await RiskService.getVaultRiskSummary(vaultId);
      
      // 3. Get full risk assessment
      const assessment = await RiskService.analyzeVaultRisk(vaultId);
      
      // 4. Generate risk events for any warnings
      let riskEvents = 0;
      
      for (const warning of assessment.warnings) {
        const eventCreated = await RiskService.recordRiskEvent(
          vaultId,
          warning.severity === 'critical' ? 'rule_violation' : 'warning',
          warning.message,
          warning.severity as EventSeverity
        );
        
        if (eventCreated) {
          riskEvents++;
        }
      }
      
      // 5. Check if we need to take automatic actions based on risk score
      if (assessment.riskScore >= (this.config.autoPauseTradingThreshold || 85)) {
        await this.pauseVaultTrading(vaultId, 'High risk score triggered automatic pause');
      }
      
      return {
        success: true,
        summary,
        fullAssessment: assessment,
        riskEvents
      };
    } catch (error) {
      console.error('Error in auditVaultRisk:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Collect all positions from a vault across all chains
   * This is a placeholder - a real implementation would query on-chain data
   */
  private static async collectVaultPositions(vaultId: string): Promise<boolean> {
    try {
      console.log(`[GlobalRiskOracle] Collecting positions for vault ${vaultId}`);
      
      // Get all multisig wallets for the vault
      const { success, data: multisigs } = await MultisigWalletService.listMultisigWallets(vaultId);
      
      if (!success || !multisigs || multisigs.length === 0) {
        console.warn(`No multisig wallets found for vault ${vaultId}`);
        return false;
      }
      
      // For each chain, collect positions
      for (const multisig of multisigs) {
        try {
          console.log(`Collecting positions from ${multisig.chainSlug} for vault ${vaultId}`);
          
          // In a real implementation, this would query the blockchain
          // and possibly DeFi protocols to get all positions
          
          // For now, we'll simulate some positions
          await this.simulatePositionsForChain(vaultId, multisig.chainSlug);
        } catch (error) {
          console.error(`Error collecting positions for ${multisig.chainSlug}:`, error);
          // Continue with other chains even if one fails
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error in collectVaultPositions:', error);
      return false;
    }
  }
  
  /**
   * Simulate positions for a chain (for development/testing)
   */
  private static async simulatePositionsForChain(vaultId: string, chainSlug: string): Promise<void> {
    try {
      const supabase = createServerClient();
      
      // Generate a few random positions for this chain
      const positionCount = Math.floor(Math.random() * 5) + 1; // 1-5 positions
      const assetBases = ['USDC', 'ETH', 'BTC', 'SOL', 'SUI'];
      const positionTypes = ['spot', 'derivative', 'loan', 'supply', 'borrow'];
      const protocols = ['Uniswap', 'AAVE', 'Compound', 'Jupiter', 'DeepBook', null];
      
      for (let i = 0; i < positionCount; i++) {
        const assetBase = assetBases[Math.floor(Math.random() * assetBases.length)];
        const positionType = positionTypes[Math.floor(Math.random() * positionTypes.length)];
        const protocol = protocols[Math.floor(Math.random() * protocols.length)];
        
        // Generate mock asset address based on chain
        let assetAddress: string;
        if (chainSlug === 'evm' || chainSlug === 'sonic') {
          assetAddress = `0x${Math.random().toString(16).substring(2, 42)}`;
        } else if (chainSlug === 'solana') {
          assetAddress = `${Math.random().toString(36).substring(2, 14)}${Math.random().toString(36).substring(2, 14)}`;
        } else if (chainSlug === 'sui') {
          assetAddress = `0x${Math.random().toString(16).substring(2, 66)}`;
        } else {
          assetAddress = `0x${Math.random().toString(16).substring(2, 42)}`;
        }
        
        // Generate random amount and USD value
        const amount = (Math.random() * 100).toFixed(4);
        const usdValue = (Math.random() * 10000).toFixed(2);
        
        // Record the position
        await RiskService.recordPositionSnapshot(
          vaultId,
          chainSlug,
          assetAddress,
          amount,
          usdValue,
          positionType as any,
          protocol || undefined,
          {
            asset: assetBase,
            simulated: true
          }
        );
      }
    } catch (error) {
      console.error(`Error simulating positions for ${chainSlug}:`, error);
    }
  }
  
  /**
   * Pause all trading for a vault (emergency action)
   */
  private static async pauseVaultTrading(vaultId: string, reason: string): Promise<boolean> {
    try {
      console.log(`[GlobalRiskOracle] Pausing trading for vault ${vaultId} due to: ${reason}`);
      
      // In a real implementation, this would:
      // 1. Update a status flag in the vault record
      // 2. Prevent new transactions from being submitted
      
      // Record a risk event for the pause
      await RiskService.recordRiskEvent(
        vaultId,
        'auto_enforcement',
        `Trading automatically paused: ${reason}`,
        'critical'
      );
      
      return true;
    } catch (error) {
      console.error('Error in pauseVaultTrading:', error);
      return false;
    }
  }
}
