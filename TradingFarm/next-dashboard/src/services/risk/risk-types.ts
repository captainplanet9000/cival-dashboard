/**
 * Trading Farm Multi-Chain Integration
 * Risk Management Types - Definitions for the risk management system
 */

export type RuleType = 
  | 'max_position_size' 
  | 'max_transaction_size' 
  | 'max_daily_volume' 
  | 'max_leverage' 
  | 'min_collateral_ratio' 
  | 'allowed_asset_list' 
  | 'blocked_asset_list' 
  | 'allowed_protocol_list' 
  | 'blocked_protocol_list' 
  | 'max_drawdown'
  | 'max_position_concentration'
  | 'max_chain_allocation';

export type EnforcementType = 'hard_limit' | 'approval_required' | 'notification' | 'warning';

export type RiskParameterScope = 'global' | 'vault' | 'agent' | 'strategy';

export type EventSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface RiskParameter {
  id: string;
  name: string;
  description: string | null;
  appliesTo: RiskParameterScope;
  entityId: string | null;
  ruleType: RuleType;
  chainSlug: string | null;
  parameters: Record<string, any>;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface PositionSnapshot {
  id: string;
  vaultId: string;
  chainSlug: string;
  assetAddress: string;
  amount: string;
  usdValue: string;
  protocol: string | null;
  positionType: 'spot' | 'derivative' | 'loan' | 'supply' | 'borrow';
  sourceData: Record<string, any> | null;
  snapshotTime: string;
  createdAt: string;
}

export interface RiskEvent {
  id: string;
  vaultId: string;
  chainSlug: string | null;
  eventType: 'rule_violation' | 'warning' | 'auto_enforcement' | 'manual_override';
  riskParameterId: string | null;
  description: string;
  severity: EventSeverity;
  relatedTransactionId: string | null;
  metadata: Record<string, any> | null;
  resolved: boolean;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PositionRisk {
  vaultId: string;
  totalUsdValue: string;
  valueByChain: Record<string, string>;
  valueByAsset: Record<string, string>;
  valueByPositionType: Record<string, string>;
  largestPosition: {
    chainSlug: string;
    assetAddress: string;
    usdValue: string;
  };
  riskScore: number; // 0-100, higher means more risk
  warnings: Array<{
    type: string;
    message: string;
    severity: EventSeverity;
  }>;
}

export interface TransactionRiskAssessment {
  transactionId: string;
  vaultId: string;
  chainSlug: string;
  allowed: boolean;
  requiresApproval: boolean;
  riskLevel: EventSeverity;
  warnings: Array<{
    ruleType: RuleType;
    message: string;
    severity: EventSeverity;
  }>;
}

export interface RiskPrecheck {
  operation: 'trade' | 'bridge' | 'borrow' | 'lend' | 'stake' | 'other';
  vaultId: string;
  chainSlug: string;
  assetAddress?: string;
  targetAssetAddress?: string;
  amountUsd: string;
  protocol?: string;
  metadata?: Record<string, any>;
}

export interface RiskPrecheckResult {
  allowed: boolean;
  requiresApproval: boolean;
  riskLevel: EventSeverity;
  warnings: Array<{
    ruleType: RuleType;
    message: string;
    severity: EventSeverity;
  }>;
}

export interface ChainPositionSummary {
  chainSlug: string;
  totalUsdValue: string;
  spotValue: string;
  loanValue: string;
  borrowValue: string;
  derivativeValue: string;
  supplyValue: string;
}

export interface VaultRiskSummary {
  vaultId: string;
  totalUsdValue: string;
  positionsByChain: ChainPositionSummary[];
  riskScore: number;
  activeWarnings: number;
  lastUpdated: string;
}

export interface DailyVolume {
  vaultId: string;
  chainSlug: string | null;
  date: string;
  volumeUsd: string;
  tradeCount: number;
}

export interface RiskDashboardData {
  vaultId: string;
  summary: VaultRiskSummary;
  topPositions: PositionSnapshot[];
  recentEvents: RiskEvent[];
  dailyVolumes: DailyVolume[];
  activeRiskParameters: RiskParameter[];
}
