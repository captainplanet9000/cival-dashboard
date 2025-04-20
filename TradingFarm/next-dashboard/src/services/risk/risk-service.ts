/**
 * Trading Farm Multi-Chain Integration
 * RiskService - Global risk oracle and management system for cross-chain positions
 */

import { createServerClient } from '@/utils/supabase/server';
import { 
  RiskParameter, 
  PositionSnapshot, 
  RiskEvent, 
  PositionRisk, 
  TransactionRiskAssessment, 
  RiskPrecheck, 
  RiskPrecheckResult,
  VaultRiskSummary,
  ChainPositionSummary,
  RuleType,
  EventSeverity
} from './risk-types';

/**
 * RiskService - "Global Risk Oracle" for the Trading Farm platform
 * Tracks positions across chains, enforces risk rules, and monitors for violations
 */
export class RiskService {
  /**
   * Get all active risk parameters for a vault, including global parameters
   */
  static async getVaultRiskParameters(vaultId: string): Promise<RiskParameter[]> {
    try {
      const supabase = createServerClient();
      
      // First get vault-specific parameters
      const { data: vaultParams, error: vaultError } = await supabase
        .from('risk_parameters')
        .select('*')
        .eq('applies_to', 'vault')
        .eq('entity_id', vaultId)
        .eq('is_active', true);
      
      if (vaultError) {
        console.error('Error getting vault risk parameters:', vaultError);
        return [];
      }
      
      // Then get global parameters
      const { data: globalParams, error: globalError } = await supabase
        .from('risk_parameters')
        .select('*')
        .eq('applies_to', 'global')
        .eq('is_active', true);
      
      if (globalError) {
        console.error('Error getting global risk parameters:', globalError);
        return [];
      }
      
      // Combine and sort by priority (higher priority first)
      const allParams = [...(vaultParams || []), ...(globalParams || [])];
      allParams.sort((a, b) => b.priority - a.priority);
      
      // Convert column names to camelCase
      return allParams.map(param => ({
        id: param.id,
        name: param.name,
        description: param.description,
        appliesTo: param.applies_to,
        entityId: param.entity_id,
        ruleType: param.rule_type,
        chainSlug: param.chain_slug,
        parameters: param.parameters,
        isActive: param.is_active,
        priority: param.priority,
        createdAt: param.created_at,
        updatedAt: param.updated_at
      }));
    } catch (error) {
      console.error('Error in getVaultRiskParameters:', error);
      return [];
    }
  }
  
  /**
   * Get the most recent position snapshots for a vault
   */
  static async getVaultPositions(vaultId: string): Promise<PositionSnapshot[]> {
    try {
      const supabase = createServerClient();
      
      // Get the latest snapshot for each asset on each chain
      const { data, error } = await supabase
        .from('position_snapshots')
        .select('*')
        .eq('vault_id', vaultId)
        // This would normally use a more complex query to get only the latest snapshot per asset/chain
        // For simplicity in this example, we'll just order by snapshot_time and limit
        .order('snapshot_time', { ascending: false })
        .limit(100);
      
      if (error) {
        console.error('Error getting vault positions:', error);
        return [];
      }
      
      // Convert column names to camelCase
      return (data || []).map(pos => ({
        id: pos.id,
        vaultId: pos.vault_id,
        chainSlug: pos.chain_slug,
        assetAddress: pos.asset_address,
        amount: pos.amount,
        usdValue: pos.usd_value,
        protocol: pos.protocol,
        positionType: pos.position_type,
        sourceData: pos.source_data,
        snapshotTime: pos.snapshot_time,
        createdAt: pos.created_at
      }));
    } catch (error) {
      console.error('Error in getVaultPositions:', error);
      return [];
    }
  }
  
  /**
   * Record a new position snapshot for an asset
   */
  static async recordPositionSnapshot(
    vaultId: string,
    chainSlug: string,
    assetAddress: string,
    amount: string,
    usdValue: string,
    positionType: 'spot' | 'derivative' | 'loan' | 'supply' | 'borrow',
    protocol?: string,
    sourceData?: Record<string, any>
  ): Promise<boolean> {
    try {
      const supabase = createServerClient();
      
      const { error } = await supabase
        .from('position_snapshots')
        .insert({
          vault_id: vaultId,
          chain_slug: chainSlug,
          asset_address: assetAddress,
          amount,
          usd_value: usdValue,
          position_type: positionType,
          protocol,
          source_data: sourceData
        });
      
      if (error) {
        console.error('Error recording position snapshot:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in recordPositionSnapshot:', error);
      return false;
    }
  }
  
  /**
   * Record a risk event
   */
  static async recordRiskEvent(
    vaultId: string,
    eventType: 'rule_violation' | 'warning' | 'auto_enforcement' | 'manual_override',
    description: string,
    severity: EventSeverity,
    chainSlug?: string,
    riskParameterId?: string,
    relatedTransactionId?: string,
    metadata?: Record<string, any>
  ): Promise<RiskEvent | null> {
    try {
      const supabase = createServerClient();
      
      const { data, error } = await supabase
        .from('risk_events')
        .insert({
          vault_id: vaultId,
          event_type: eventType,
          description,
          severity,
          chain_slug: chainSlug,
          risk_parameter_id: riskParameterId,
          related_transaction_id: relatedTransactionId,
          metadata
        })
        .select('*')
        .single();
      
      if (error) {
        console.error('Error recording risk event:', error);
        return null;
      }
      
      // Convert column names to camelCase
      return {
        id: data.id,
        vaultId: data.vault_id,
        chainSlug: data.chain_slug,
        eventType: data.event_type,
        riskParameterId: data.risk_parameter_id,
        description: data.description,
        severity: data.severity,
        relatedTransactionId: data.related_transaction_id,
        metadata: data.metadata,
        resolved: data.resolved,
        resolvedBy: data.resolved_by,
        resolvedAt: data.resolved_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error in recordRiskEvent:', error);
      return null;
    }
  }
  
  /**
   * Analyze risk for a vault across all chains
   */
  static async analyzeVaultRisk(vaultId: string): Promise<PositionRisk> {
    try {
      // Get vault positions
      const positions = await this.getVaultPositions(vaultId);
      
      // Get risk parameters for the vault
      const riskParams = await this.getVaultRiskParameters(vaultId);
      
      // Calculate total USD value
      const totalUsdValue = positions.reduce(
        (total, pos) => total + parseFloat(pos.usdValue), 
        0
      ).toString();
      
      // Calculate value by chain
      const valueByChain: Record<string, string> = {};
      for (const pos of positions) {
        const chainValue = parseFloat(valueByChain[pos.chainSlug] || '0');
        valueByChain[pos.chainSlug] = (chainValue + parseFloat(pos.usdValue)).toString();
      }
      
      // Calculate value by asset
      const valueByAsset: Record<string, string> = {};
      for (const pos of positions) {
        const assetValue = parseFloat(valueByAsset[pos.assetAddress] || '0');
        valueByAsset[pos.assetAddress] = (assetValue + parseFloat(pos.usdValue)).toString();
      }
      
      // Calculate value by position type
      const valueByPositionType: Record<string, string> = {};
      for (const pos of positions) {
        const typeValue = parseFloat(valueByPositionType[pos.positionType] || '0');
        valueByPositionType[pos.positionType] = (typeValue + parseFloat(pos.usdValue)).toString();
      }
      
      // Find largest position
      let largestPosition = {
        chainSlug: '',
        assetAddress: '',
        usdValue: '0'
      };
      
      for (const pos of positions) {
        if (parseFloat(pos.usdValue) > parseFloat(largestPosition.usdValue)) {
          largestPosition = {
            chainSlug: pos.chainSlug,
            assetAddress: pos.assetAddress,
            usdValue: pos.usdValue
          };
        }
      }
      
      // Analyze for warnings
      const warnings: Array<{
        type: string;
        message: string;
        severity: EventSeverity;
      }> = [];
      
      // Check for position size limits
      const positionSizeParams = riskParams.filter(param => 
        param.ruleType === 'max_position_size'
      );
      
      for (const param of positionSizeParams) {
        const maxValue = param.parameters.max_usd_value;
        const applicableChain = param.chainSlug;
        
        // Skip if this doesn't apply to any positions
        if (applicableChain && !valueByChain[applicableChain]) continue;
        
        const valueToCheck = applicableChain 
          ? parseFloat(valueByChain[applicableChain])
          : parseFloat(totalUsdValue);
          
        if (valueToCheck > maxValue) {
          warnings.push({
            type: 'max_position_size',
            message: applicableChain 
              ? `Position size on ${applicableChain} (${valueToCheck.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}) exceeds limit of ${maxValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`
              : `Total position size (${valueToCheck.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}) exceeds limit of ${maxValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`,
            severity: 'high'
          });
        }
      }
      
      // Check for blocked assets
      const blockedAssetParams = riskParams.filter(param => 
        param.ruleType === 'blocked_asset_list'
      );
      
      for (const param of blockedAssetParams) {
        const blockedAssets = param.parameters.assets || [];
        const applicableChain = param.chainSlug;
        
        for (const pos of positions) {
          // Skip if this doesn't apply to this position
          if (applicableChain && pos.chainSlug !== applicableChain) continue;
          
          if (blockedAssets.includes(pos.assetAddress)) {
            warnings.push({
              type: 'blocked_asset',
              message: `Position in blocked asset ${pos.assetAddress} on ${pos.chainSlug}`,
              severity: 'critical'
            });
          }
        }
      }
      
      // Calculate risk score (0-100)
      // This is a simplified algorithm - a real implementation would be more sophisticated
      let riskScore = 0;
      
      // Base risk on largest position relative to total (concentration risk)
      const concentrationRisk = parseFloat(largestPosition.usdValue) / parseFloat(totalUsdValue);
      riskScore += concentrationRisk * 30; // Up to 30 points
      
      // Add risk based on warning count and severity
      riskScore += warnings.length * 5; // 5 points per warning
      riskScore += warnings.filter(w => w.severity === 'high').length * 5; // Additional 5 for high
      riskScore += warnings.filter(w => w.severity === 'critical').length * 10; // Additional 10 for critical
      
      // Cap risk score at 100
      riskScore = Math.min(riskScore, 100);
      
      return {
        vaultId,
        totalUsdValue,
        valueByChain,
        valueByAsset,
        valueByPositionType,
        largestPosition,
        riskScore,
        warnings
      };
    } catch (error) {
      console.error('Error in analyzeVaultRisk:', error);
      
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
          message: `Error analyzing risk: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'medium'
        }]
      };
    }
  }
  
  /**
   * Perform a pre-execution risk check for a transaction
   */
  static async performRiskPrecheck(check: RiskPrecheck): Promise<RiskPrecheckResult> {
    try {
      // Get risk parameters for the vault
      const riskParams = await this.getVaultRiskParameters(check.vaultId);
      
      // Get current positions for the vault
      const positions = await this.getVaultPositions(check.vaultId);
      
      // Calculate current USD value by chain
      const valueByChain: Record<string, number> = {};
      for (const pos of positions) {
        valueByChain[pos.chainSlug] = (valueByChain[pos.chainSlug] || 0) + parseFloat(pos.usdValue);
      }
      
      // Calculate total USD value
      const totalUsdValue = positions.reduce(
        (total, pos) => total + parseFloat(pos.usdValue), 
        0
      );
      
      const warnings: Array<{
        ruleType: RuleType;
        message: string;
        severity: EventSeverity;
      }> = [];
      
      let requiresApproval = false;
      let allowed = true;
      
      // Check transaction size limits
      const txSizeParams = riskParams.filter(param => 
        param.ruleType === 'max_transaction_size' && 
        (!param.chainSlug || param.chainSlug === check.chainSlug)
      );
      
      for (const param of txSizeParams) {
        const maxValue = param.parameters.max_usd_value;
        const enforcement = param.parameters.enforcement || 'warning';
        
        if (parseFloat(check.amountUsd) > maxValue) {
          const warning = {
            ruleType: 'max_transaction_size' as RuleType,
            message: `Transaction size ${parseFloat(check.amountUsd).toLocaleString('en-US', { style: 'currency', currency: 'USD' })} exceeds limit of ${maxValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`,
            severity: enforcement === 'hard_limit' ? 'critical' : 'high' as EventSeverity
          };
          
          warnings.push(warning);
          
          if (enforcement === 'hard_limit') {
            allowed = false;
          } else if (enforcement === 'approval_required') {
            requiresApproval = true;
          }
        }
      }
      
      // Check daily volume limits
      if (check.operation === 'trade') {
        const volumeParams = riskParams.filter(param => 
          param.ruleType === 'max_daily_volume' && 
          (!param.chainSlug || param.chainSlug === check.chainSlug)
        );
        
        // Get today's volume
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        
        const supabase = createServerClient();
        const { data: volumeData, error: volumeError } = await supabase
          .from('bridge_transactions') // Using this as a proxy for trades - a real impl would use a dedicated trades table
          .select('amount')
          .eq('vault_id', check.vaultId)
          .eq('source_chain', check.chainSlug)
          .gte('created_at', `${today}T00:00:00Z`)
          .lte('created_at', `${today}T23:59:59Z`);
        
        if (!volumeError && volumeData) {
          const currentDailyVolume = volumeData.reduce(
            (total, tx) => total + parseFloat(tx.amount),
            0
          );
          
          for (const param of volumeParams) {
            const maxValue = param.parameters.max_usd_value;
            const enforcement = param.parameters.enforcement || 'warning';
            
            const projectedVolume = currentDailyVolume + parseFloat(check.amountUsd);
            
            if (projectedVolume > maxValue) {
              const warning = {
                ruleType: 'max_daily_volume' as RuleType,
                message: `Projected daily volume ${projectedVolume.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} would exceed limit of ${maxValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`,
                severity: enforcement === 'hard_limit' ? 'critical' : 'high' as EventSeverity
              };
              
              warnings.push(warning);
              
              if (enforcement === 'hard_limit') {
                allowed = false;
              } else if (enforcement === 'approval_required') {
                requiresApproval = true;
              }
            }
          }
        }
      }
      
      // Check position size limits
      const positionSizeParams = riskParams.filter(param => 
        param.ruleType === 'max_position_size' && 
        (!param.chainSlug || param.chainSlug === check.chainSlug)
      );
      
      for (const param of positionSizeParams) {
        const maxValue = param.parameters.max_usd_value;
        const enforcement = param.parameters.enforcement || 'warning';
        
        const currentValue = param.chainSlug ? (valueByChain[param.chainSlug] || 0) : totalUsdValue;
        
        // For simplicity, we'll assume the operation increases position size
        // A real implementation would account for the direction of the trade
        const projectedValue = currentValue + parseFloat(check.amountUsd);
        
        if (projectedValue > maxValue) {
          const warning = {
            ruleType: 'max_position_size' as RuleType,
            message: param.chainSlug 
              ? `Projected position size on ${param.chainSlug} (${projectedValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}) would exceed limit of ${maxValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`
              : `Projected total position size (${projectedValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}) would exceed limit of ${maxValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`,
            severity: enforcement === 'hard_limit' ? 'critical' : 'high' as EventSeverity
          };
          
          warnings.push(warning);
          
          if (enforcement === 'hard_limit') {
            allowed = false;
          } else if (enforcement === 'approval_required') {
            requiresApproval = true;
          }
        }
      }
      
      // Check protocol restrictions
      if (check.protocol) {
        // Check allowed protocol list
        const allowedProtocolParams = riskParams.filter(param => 
          param.ruleType === 'allowed_protocol_list' && 
          (!param.chainSlug || param.chainSlug === check.chainSlug)
        );
        
        for (const param of allowedProtocolParams) {
          const allowedProtocols = param.parameters.protocols || [];
          const enforcement = param.parameters.enforcement || 'warning';
          
          if (allowedProtocols.length > 0 && !allowedProtocols.includes(check.protocol)) {
            const warning = {
              ruleType: 'allowed_protocol_list' as RuleType,
              message: `Protocol ${check.protocol} is not in the allowed list`,
              severity: enforcement === 'hard_limit' ? 'critical' : 'high' as EventSeverity
            };
            
            warnings.push(warning);
            
            if (enforcement === 'hard_limit') {
              allowed = false;
            } else if (enforcement === 'approval_required') {
              requiresApproval = true;
            }
          }
        }
        
        // Check blocked protocol list
        const blockedProtocolParams = riskParams.filter(param => 
          param.ruleType === 'blocked_protocol_list' && 
          (!param.chainSlug || param.chainSlug === check.chainSlug)
        );
        
        for (const param of blockedProtocolParams) {
          const blockedProtocols = param.parameters.protocols || [];
          const enforcement = param.parameters.enforcement || 'warning';
          
          if (blockedProtocols.includes(check.protocol)) {
            const warning = {
              ruleType: 'blocked_protocol_list' as RuleType,
              message: `Protocol ${check.protocol} is in the blocked list`,
              severity: enforcement === 'hard_limit' ? 'critical' : 'high' as EventSeverity
            };
            
            warnings.push(warning);
            
            if (enforcement === 'hard_limit') {
              allowed = false;
            } else if (enforcement === 'approval_required') {
              requiresApproval = true;
            }
          }
        }
      }
      
      // Check asset restrictions if applicable
      if (check.assetAddress) {
        // Check blocked asset list
        const blockedAssetParams = riskParams.filter(param => 
          param.ruleType === 'blocked_asset_list' && 
          (!param.chainSlug || param.chainSlug === check.chainSlug)
        );
        
        for (const param of blockedAssetParams) {
          const blockedAssets = param.parameters.assets || [];
          const enforcement = param.parameters.enforcement || 'warning';
          
          if (blockedAssets.includes(check.assetAddress)) {
            const warning = {
              ruleType: 'blocked_asset_list' as RuleType,
              message: `Asset ${check.assetAddress} is in the blocked list`,
              severity: enforcement === 'hard_limit' ? 'critical' : 'high' as EventSeverity
            };
            
            warnings.push(warning);
            
            if (enforcement === 'hard_limit') {
              allowed = false;
            } else if (enforcement === 'approval_required') {
              requiresApproval = true;
            }
          }
        }
      }
      
      // Determine overall risk level
      let riskLevel: EventSeverity = 'low';
      if (warnings.some(w => w.severity === 'critical')) {
        riskLevel = 'critical';
      } else if (warnings.some(w => w.severity === 'high')) {
        riskLevel = 'high';
      } else if (warnings.some(w => w.severity === 'medium')) {
        riskLevel = 'medium';
      }
      
      return {
        allowed,
        requiresApproval,
        riskLevel,
        warnings
      };
    } catch (error) {
      console.error('Error in performRiskPrecheck:', error);
      
      return {
        allowed: false,
        requiresApproval: true,
        riskLevel: 'high',
        warnings: [{
          ruleType: 'error' as RuleType,
          message: `Error performing risk check: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'high'
        }]
      };
    }
  }
  
  /**
   * Get risk summary for a vault
   */
  static async getVaultRiskSummary(vaultId: string): Promise<VaultRiskSummary> {
    try {
      // Get vault positions
      const positions = await this.getVaultPositions(vaultId);
      
      // Calculate total USD value
      const totalUsdValue = positions.reduce(
        (total, pos) => total + parseFloat(pos.usdValue), 
        0
      ).toString();
      
      // Group positions by chain
      const positionsByChain: Record<string, PositionSnapshot[]> = {};
      for (const pos of positions) {
        if (!positionsByChain[pos.chainSlug]) {
          positionsByChain[pos.chainSlug] = [];
        }
        positionsByChain[pos.chainSlug].push(pos);
      }
      
      // Create summaries for each chain
      const chainSummaries: ChainPositionSummary[] = Object.entries(positionsByChain).map(([chainSlug, chainPositions]) => {
        // Calculate USD values by position type
        const spotValue = chainPositions
          .filter(p => p.positionType === 'spot')
          .reduce((total, p) => total + parseFloat(p.usdValue), 0)
          .toString();
          
        const loanValue = chainPositions
          .filter(p => p.positionType === 'loan')
          .reduce((total, p) => total + parseFloat(p.usdValue), 0)
          .toString();
          
        const borrowValue = chainPositions
          .filter(p => p.positionType === 'borrow')
          .reduce((total, p) => total + parseFloat(p.usdValue), 0)
          .toString();
          
        const derivativeValue = chainPositions
          .filter(p => p.positionType === 'derivative')
          .reduce((total, p) => total + parseFloat(p.usdValue), 0)
          .toString();
          
        const supplyValue = chainPositions
          .filter(p => p.positionType === 'supply')
          .reduce((total, p) => total + parseFloat(p.usdValue), 0)
          .toString();
          
        // Calculate total for this chain
        const chainTotalUsdValue = chainPositions
          .reduce((total, p) => total + parseFloat(p.usdValue), 0)
          .toString();
          
        return {
          chainSlug,
          totalUsdValue: chainTotalUsdValue,
          spotValue,
          loanValue,
          borrowValue,
          derivativeValue,
          supplyValue
        };
      });
      
      // Get recent active warnings
      const supabase = createServerClient();
      const { data: events, error: eventsError } = await supabase
        .from('risk_events')
        .select('*')
        .eq('vault_id', vaultId)
        .eq('resolved', false)
        .order('created_at', { ascending: false });
        
      const activeWarnings = eventsError ? 0 : (events?.length || 0);
      
      // Get the most recent position snapshot time
      const lastUpdated = positions.length > 0 
        ? positions.reduce((latest, pos) => {
            const posTime = new Date(pos.snapshotTime).getTime();
            return posTime > latest ? posTime : latest;
          }, 0)
        : Date.now();
      
      // Calculate risk score
      // A real implementation would use a more sophisticated algorithm
      let riskScore = 0;
      
      // Base risk score on chain distribution
      if (chainSummaries.length > 0) {
        // Higher risk if concentrated in one chain
        const largestChainPct = parseFloat(chainSummaries[0].totalUsdValue) / parseFloat(totalUsdValue);
        riskScore += (1 - largestChainPct) * 20; // Up to 20 points for diversification
      }
      
      // Add risk based on ratio of borrowed to supplied
      const totalBorrowed = chainSummaries.reduce(
        (total, chain) => total + parseFloat(chain.borrowValue),
        0
      );
      
      const totalSupplied = chainSummaries.reduce(
        (total, chain) => total + parseFloat(chain.supplyValue),
        0
      );
      
      if (totalSupplied > 0) {
        const borrowRatio = Math.min(totalBorrowed / totalSupplied, 1);
        riskScore += borrowRatio * 40; // Up to 40 points for borrowing
      }
      
      // Add risk for derivative positions
      const totalDerivatives = chainSummaries.reduce(
        (total, chain) => total + parseFloat(chain.derivativeValue),
        0
      );
      
      if (parseFloat(totalUsdValue) > 0) {
        const derivativesRatio = Math.min(totalDerivatives / parseFloat(totalUsdValue), 1);
        riskScore += derivativesRatio * 30; // Up to 30 points for derivatives
      }
      
      // Add risk for active warnings
      riskScore += Math.min(activeWarnings * 2, 10); // Up to 10 points for warnings
      
      return {
        vaultId,
        totalUsdValue,
        positionsByChain: chainSummaries,
        riskScore,
        activeWarnings,
        lastUpdated: new Date(lastUpdated).toISOString()
      };
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
}
