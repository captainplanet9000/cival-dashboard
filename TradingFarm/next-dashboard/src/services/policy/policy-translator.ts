/**
 * Trading Farm Multi-Chain Integration
 * PolicyTranslator - Converts generic risk policies to chain-specific formats
 */

import { createServerClient } from '@/utils/supabase/server';
import { SigningService, SignatureRequest } from '../signing/signing-service';

export interface PolicyTemplate {
  id: string;
  name: string;
  description: string | null;
  chainSlug: string;
  multisigType: 'safe' | 'msafe' | 'squads';
  policyTemplate: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UnifiedPolicy {
  maxPositionUSD?: number;
  maxTransactionUSD?: number;
  maxDailyVolumeUSD?: number;
  allowedProtocols?: string[];
  restrictedProtocols?: string[];
  allowedAssets?: string[];
  restrictedAssets?: string[];
  timelockSeconds?: number;
  approvalThreshold?: number;
  allowedRecipients?: string[];
  requireSpecificOwnerApproval?: string[];
}

export interface MultisigPolicyConfig {
  vaultId: string;
  multisigId: string;
  chainSlug: string;
  multisigType: 'safe' | 'msafe' | 'squads';
  multisigAddress: string;
  policy: UnifiedPolicy;
}

export interface PolicyUpdateResult {
  success: boolean;
  transactionHash?: string;
  errorMessage?: string;
}

/**
 * PolicyTranslator - Converts Trading Farm's unified policy format to chain-specific
 * policy configurations for Safe, MSafe, and Squads multisig wallets
 */
export class PolicyTranslator {
  /**
   * Get all active policy templates
   */
  static async getPolicyTemplates(): Promise<PolicyTemplate[]> {
    try {
      const supabase = createServerClient();
      
      const { data, error } = await supabase
        .from('multisig_policy_templates')
        .select('*')
        .eq('is_active', true);
      
      if (error) {
        console.error('Error getting policy templates:', error);
        return [];
      }
      
      // Convert from snake_case to camelCase
      return (data || []).map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        chainSlug: template.chain_slug,
        multisigType: template.multisig_type,
        policyTemplate: template.policy_template,
        isActive: template.is_active,
        createdAt: template.created_at,
        updatedAt: template.updated_at
      }));
    } catch (error) {
      console.error('Error in getPolicyTemplates:', error);
      return [];
    }
  }
  
  /**
   * Get policy template by chain and type
   */
  static async getPolicyTemplate(chainSlug: string, multisigType: 'safe' | 'msafe' | 'squads'): Promise<PolicyTemplate | null> {
    try {
      const supabase = createServerClient();
      
      const { data, error } = await supabase
        .from('multisig_policy_templates')
        .select('*')
        .eq('chain_slug', chainSlug)
        .eq('multisig_type', multisigType)
        .eq('is_active', true)
        .single();
      
      if (error || !data) {
        console.error(`Error getting policy template for ${chainSlug}/${multisigType}:`, error);
        return null;
      }
      
      return {
        id: data.id,
        name: data.name,
        description: data.description,
        chainSlug: data.chain_slug,
        multisigType: data.multisig_type,
        policyTemplate: data.policy_template,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error(`Error in getPolicyTemplate(${chainSlug}, ${multisigType}):`, error);
      return null;
    }
  }
  
  /**
   * Update a multisig wallet's policy based on unified policy settings
   */
  static async updatePolicy(config: MultisigPolicyConfig): Promise<PolicyUpdateResult> {
    try {
      // Get the appropriate template for this chain and multisig type
      const template = await this.getPolicyTemplate(config.chainSlug, config.multisigType);
      
      if (!template) {
        return {
          success: false,
          errorMessage: `No policy template found for ${config.chainSlug}/${config.multisigType}`
        };
      }
      
      // Convert the unified policy to chain-specific format
      let chainSpecificPolicy: Record<string, any>;
      
      switch (config.multisigType) {
        case 'safe':
          chainSpecificPolicy = this.translateToSafePolicy(config.policy, template.policyTemplate);
          break;
          
        case 'msafe':
          chainSpecificPolicy = this.translateToMSafePolicy(config.policy, template.policyTemplate);
          break;
          
        case 'squads':
          chainSpecificPolicy = this.translateToSquadsPolicy(config.policy, template.policyTemplate);
          break;
          
        default:
          return {
            success: false,
            errorMessage: `Unsupported multisig type: ${config.multisigType}`
          };
      }
      
      // Generate transaction data for policy update
      const txData = await this.generatePolicyUpdateTransaction(
        config.chainSlug,
        config.multisigType,
        config.multisigAddress,
        chainSpecificPolicy
      );
      
      if (!txData) {
        return {
          success: false,
          errorMessage: 'Failed to generate policy update transaction'
        };
      }
      
      // Sign the transaction
      const signatureResult = await SigningService.signTransaction({
        chainSlug: config.chainSlug,
        transactionData: txData,
        operation: 'policy_update',
        vaultId: config.vaultId,
        metadata: {
          multisigId: config.multisigId,
          policyType: config.multisigType
        }
      });
      
      if (!signatureResult.success) {
        return {
          success: false,
          errorMessage: signatureResult.errorMessage || 'Failed to sign policy update transaction'
        };
      }
      
      // In a real implementation, this would submit the transaction to the blockchain
      // For now, we'll simulate a successful transaction
      console.log(`[PolicyTranslator] Updating policy for ${config.multisigType} multisig ${config.multisigAddress} on ${config.chainSlug}`);
      
      // Generate a mock transaction hash
      const txHash = this.generateMockTransactionHash(config.chainSlug);
      
      // Store the policy update in the database
      await this.recordPolicyUpdate(
        config.vaultId,
        config.multisigId,
        chainSpecificPolicy,
        txHash
      );
      
      return {
        success: true,
        transactionHash: txHash
      };
    } catch (error) {
      console.error('Error in updatePolicy:', error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Translate unified policy to Safe (EVM) format
   * Supports Guard modules and boundaries for EVM chains
   */
  private static translateToSafePolicy(
    policy: UnifiedPolicy, 
    template: Record<string, any>
  ): Record<string, any> {
    // Base the policy structure on the template type
    const templateType = template.type || 'spendingLimit';
    
    if (templateType === 'spendingLimit') {
      return {
        type: 'spendingLimit',
        limits: {
          dailyLimitUsd: policy.maxDailyVolumeUSD || template.dailyLimitUsd || 50000,
          singleTxLimitUsd: policy.maxTransactionUSD || (policy.maxDailyVolumeUSD ? policy.maxDailyVolumeUSD / 5 : template.singleTxLimitUsd || 10000),
          requireApprovalAboveLimit: true
        },
        resetTimeSeconds: 86400 // 24 hours
      };
    } else if (templateType === 'guardModule') {
      const guards: any[] = [];
      
      // Add delay guard if timelock specified
      if (policy.timelockSeconds && policy.timelockSeconds > 0) {
        guards.push({
          type: 'delayModifier',
          delaySeconds: policy.timelockSeconds
        });
      }
      
      // Add whitelist guard if allowed assets or protocols specified
      if (policy.allowedAssets?.length || policy.allowedRecipients?.length) {
        guards.push({
          type: 'whitelistGuard',
          allowedTargets: [
            ...(policy.allowedRecipients || []),
            ...(policy.allowedAssets || [])
          ]
        });
      }
      
      // Add spending limit guard
      guards.push({
        type: 'spendingLimitGuard',
        limits: {
          dailyLimitUsd: policy.maxDailyVolumeUSD || template.limits?.dailyLimitUsd || 50000,
          singleTxLimitUsd: policy.maxTransactionUSD || template.limits?.singleTxLimitUsd || 10000
        }
      });
      
      return {
        type: 'guardModule',
        guards
      };
    } else {
      // Default policy with sensible limits
      return {
        type: 'basicGuards',
        maxTransactionUSD: policy.maxTransactionUSD || 10000,
        maxDailyVolumeUSD: policy.maxDailyVolumeUSD || 50000,
        allowedRecipients: policy.allowedRecipients || [],
        allowedAssets: policy.allowedAssets || [],
        requireApprovalAboveLimit: true
      };
    }
  }
  
  /**
   * Translate unified policy to MSafe (Sui) format
   * Creates policy configurations for Sui multisig
   */
  private static translateToMSafePolicy(
    policy: UnifiedPolicy, 
    template: Record<string, any>
  ): Record<string, any> {
    // Base the policy structure on the template type
    const templateType = template.type || 'transactionFilter';
    
    if (templateType === 'transactionFilter') {
      return {
        type: 'transactionFilter',
        filters: {
          allowedRecipients: policy.allowedRecipients || template.allowedRecipients || [],
          allowedObjectTypes: policy.allowedAssets || template.allowedTypes || ['*'],
          denylist: policy.restrictedAssets || template.denylist || [],
          maxGasBudget: policy.maxTransactionUSD ? policy.maxTransactionUSD * 1000000 : template.maxGasBudget || 50000000000, // Convert USD to MIST
        }
      };
    } else if (templateType === 'strictPolicy') {
      return {
        type: 'strictPolicy',
        allowedDApps: policy.allowedProtocols || template.allowedDApps || [],
        maxTransactionSize: policy.maxTransactionUSD ? policy.maxTransactionUSD * 1000000 : template.maxTransactionSize || 50000000000, // Convert USD to MIST
        requireAllApprovals: policy.approvalThreshold ? policy.approvalThreshold >= 100 : template.requireAllApprovals || false,
        allowedObjectTypes: policy.allowedAssets || template.allowedObjectTypes || [],
        timelockMilliseconds: policy.timelockSeconds ? policy.timelockSeconds * 1000 : template.timelockMilliseconds || 0
      };
    } else {
      // Default policy with sensible limits
      return {
        type: 'defaultPolicy',
        maxTransactionSizeMist: policy.maxTransactionUSD ? policy.maxTransactionUSD * 1000000 : 50000000000,
        approvalThreshold: policy.approvalThreshold || 50, // Default to 50% threshold
        allowedObjectTypes: policy.allowedAssets || [],
        restrictedTypes: policy.restrictedAssets || []
      };
    }
  }
  
  /**
   * Translate unified policy to Squads (Solana) format
   * Creates rules for Squads Multisig vaults
   */
  private static translateToSquadsPolicy(
    policy: UnifiedPolicy, 
    template: Record<string, any>
  ): Record<string, any> {
    // Base the policy structure on the template type
    const templateType = template.type || 'timelock';
    
    if (templateType === 'timelock') {
      return {
        type: 'timelock',
        delaySeconds: policy.timelockSeconds || template.delaySeconds || 3600,
        votingThreshold: policy.approvalThreshold || template.votingThreshold || 60, // Percentage of members
        executionThreshold: policy.approvalThreshold ? Math.max(1, Math.ceil(policy.approvalThreshold / 25)) : template.executionThreshold || 2
      };
    } else if (templateType === 'complexRules') {
      const rules: any[] = [];
      
      // Add timelock rule if specified
      if (policy.timelockSeconds && policy.timelockSeconds > 0) {
        rules.push({
          type: 'timelock',
          delaySeconds: policy.timelockSeconds
        });
      }
      
      // Add whitelist rule if allowed recipients specified
      if (policy.allowedRecipients?.length) {
        rules.push({
          type: 'whitelist',
          addresses: policy.allowedRecipients
        });
      }
      
      // Add spending limit rule
      rules.push({
        type: 'amountLimit',
        dailyLimitLamports: policy.maxDailyVolumeUSD ? policy.maxDailyVolumeUSD * 1000000000 : template.dailyLimit || 10000000000000, // Convert USD to lamports
        txLimitLamports: policy.maxTransactionUSD ? policy.maxTransactionUSD * 1000000000 : template.txLimit || 1000000000000 // Convert USD to lamports
      });
      
      return {
        type: 'complexRules',
        rules,
        votingThreshold: policy.approvalThreshold || template.votingThreshold || 100, // Default to 100% for complex rules
      };
    } else {
      // Default policy with sensible limits
      return {
        type: 'basicRules',
        votingThreshold: policy.approvalThreshold || 60,
        executionThreshold: policy.approvalThreshold ? Math.max(1, Math.ceil(policy.approvalThreshold / 25)) : 2,
        maxTransactionLamports: policy.maxTransactionUSD ? policy.maxTransactionUSD * 1000000000 : 1000000000000,
        maxDailyVolumeLamports: policy.maxDailyVolumeUSD ? policy.maxDailyVolumeUSD * 1000000000 : 10000000000000
      };
    }
  }
  
  /**
   * Generate a blockchain transaction to update the multisig policy
   * This would use chain-specific SDKs in a real implementation
   */
  private static async generatePolicyUpdateTransaction(
    chainSlug: string,
    multisigType: 'safe' | 'msafe' | 'squads',
    multisigAddress: string,
    policyData: Record<string, any>
  ): Promise<string> {
    // In a real implementation, this would:
    // 1. Use the appropriate SDK to create a policy update transaction
    // 2. Return the transaction data for signing
    
    // For now, we'll simulate transaction data
    return JSON.stringify({
      chainSlug,
      multisigType,
      multisigAddress,
      operation: 'updatePolicy',
      policyData,
      timestamp: Date.now()
    });
  }
  
  /**
   * Record a policy update in the database
   * This is a placeholder - in a real implementation, this would store in a database table
   */
  private static async recordPolicyUpdate(
    vaultId: string,
    multisigId: string,
    policyData: Record<string, any>,
    transactionHash: string
  ): Promise<void> {
    try {
      console.log(`[PolicyTranslator] Recording policy update for multisig ${multisigId}`);
      
      // In a real implementation, this would store in a database table
      // For now, we'll just log it
      const logEntry = {
        timestamp: new Date().toISOString(),
        vaultId,
        multisigId,
        policyData,
        transactionHash
      };
      
      console.log(`[PolicyUpdate] ${JSON.stringify(logEntry)}`);
    } catch (error) {
      console.error('Error recording policy update:', error);
    }
  }
  
  /**
   * Generate a mock transaction hash for development/testing
   */
  private static generateMockTransactionHash(chainSlug: string): string {
    const randomHash = Math.random().toString(16).substring(2) + Date.now().toString(16);
    
    // Format according to chain conventions
    if (chainSlug === 'evm' || chainSlug === 'sonic') {
      return `0x${randomHash.padEnd(64, '0').substring(0, 64)}`;
    } else if (chainSlug === 'solana') {
      return randomHash.padEnd(88, '0').substring(0, 88);
    } else if (chainSlug === 'sui') {
      return `0x${randomHash.padEnd(64, '0').substring(0, 64)}`;
    } else {
      return `0x${randomHash.padEnd(64, '0').substring(0, 64)}`;
    }
  }
}
