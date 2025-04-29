/**
 * Trading Farm Cross-Chain Yield Optimization
 * Type definitions for yield strategies and protocols
 */

import { RiskLevel, RebalanceFrequency } from './cross-chain-position.types';

export type ProtocolType = 'lending' | 'staking' | 'liquidity' | 'farming' | 'options' | 'derivatives' | 'structured';
export type IntegrationType = 'api' | 'subgraph' | 'rpc' | 'contract' | 'sdk' | 'custom';
export type StrategyType = 'aggressive' | 'balanced' | 'conservative' | 'stable' | 'custom';
export type AllocationStatus = 'pending' | 'active' | 'exiting' | 'completed' | 'failed';
export type TransactionType = 'deposit' | 'withdrawal' | 'harvest' | 'rebalance' | 'compound';
export type TransactionStatus = 'pending' | 'completed' | 'failed';
export type HealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown';

export interface YieldProtocol {
  id: string;
  name: string;
  chainId: string;
  protocolType: ProtocolType;
  contractAddress?: string;
  tokenAddress?: string;
  tokenSymbol?: string;
  tokenDecimals?: number;
  apyRange: {
    min: number;
    max: number;
  };
  tvlUsd: number;
  riskLevel: RiskLevel;
  isActive: boolean;
  lastUpdatedAt: string;
  logoUrl?: string;
  websiteUrl?: string;
  description?: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ProtocolIntegration {
  id: string;
  protocolId: string;
  integrationType: IntegrationType;
  config: Record<string, any>;
  credentials: Record<string, any>;
  isActive: boolean;
  lastCheckedAt?: string;
  healthStatus: HealthStatus;
  errorCount: number;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface YieldStrategyTemplate {
  id: string;
  name: string;
  description?: string;
  strategyType: StrategyType;
  riskLevel: RiskLevel;
  minInvestmentUsd?: number;
  protocols: Array<{
    id: string;
    allocationPercent: number;
  }>;
  expectedApyRange: {
    min: number;
    max: number;
  };
  chainAllocations: Record<string, number>;
  creatorId?: string;
  isPublic: boolean;
  isFeatured: boolean;
  usageCount: number;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface YieldStrategy {
  id: string;
  name: string;
  description?: string;
  vaultId: number;
  positionId?: string;
  templateId?: string;
  strategyType: StrategyType;
  riskLevel: RiskLevel;
  targetApy?: number;
  isActive: boolean;
  autoCompound: boolean;
  autoRebalance: boolean;
  rebalanceFrequency: RebalanceFrequency;
  lastRebalancedAt?: string;
  nextRebalanceAt?: string;
  totalInvestedUsd: number;
  totalValueUsd: number;
  totalEarnedUsd: number;
  currentApy?: number;
  performanceMetrics: YieldPerformanceMetrics;
  chainAllocations: Record<string, number>;
  protocolAllocations: Record<string, number>;
  maxSlippagePercent: number;
  maxGasUsd: number;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  allocations?: YieldStrategyAllocation[];
}

export interface YieldStrategyAllocation {
  id: string;
  strategyId: string;
  protocolId: string;
  allocationPercent: number;
  currentAmount: string;
  currentValueUsd: number;
  earnedAmount: string;
  earnedValueUsd: number;
  currentApy?: number;
  entryPriceUsd?: number;
  lastCompoundedAt?: string;
  status: AllocationStatus;
  positionDetails?: Record<string, any>;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  protocol?: YieldProtocol;
}

export interface YieldStrategyTransaction {
  id: string;
  strategyId: string;
  allocationId?: string;
  transactionType: TransactionType;
  chainId: string;
  protocolId?: string;
  tokenAddress?: string;
  tokenSymbol?: string;
  amount: string;
  valueUsd: number;
  txHash?: string;
  status: TransactionStatus;
  errorMessage?: string;
  gasCostUsd?: number;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface YieldApyHistory {
  id: string;
  protocolId: string;
  timestamp: string;
  apy: number;
  tvlUsd: number;
  tokenPriceUsd?: number;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface YieldStrategyPerformance {
  id: string;
  strategyId: string;
  timestamp: string;
  totalValueUsd: number;
  totalEarnedUsd: number;
  currentApy: number;
  allocationPerformance: Record<string, {
    value: number;
    earned: number;
    apy: number;
  }>;
  dailyYieldUsd?: number;
  rollingYield: {
    day7?: number;
    day30?: number;
    day90?: number;
    year?: number;
  };
  metadata: Record<string, any>;
  createdAt: string;
}

export interface YieldPerformanceMetrics {
  daily?: number;
  weekly?: number;
  monthly?: number;
  quarterly?: number;
  yearly?: number;
  allTime?: number;
  averageApy?: number;
  bestPerforming?: {
    protocolId: string;
    apy: number;
    chain: string;
  };
  worstPerforming?: {
    protocolId: string;
    apy: number;
    chain: string;
  };
}

export interface YieldProtocolCreateParams {
  name: string;
  chainId: string;
  protocolType: ProtocolType;
  contractAddress?: string;
  tokenAddress?: string;
  tokenSymbol?: string;
  tokenDecimals?: number;
  apyRange?: {
    min: number;
    max: number;
  };
  tvlUsd?: number;
  riskLevel?: RiskLevel;
  logoUrl?: string;
  websiteUrl?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface YieldProtocolUpdateParams {
  name?: string;
  protocolType?: ProtocolType;
  contractAddress?: string;
  tokenAddress?: string;
  tokenSymbol?: string;
  tokenDecimals?: number;
  apyRange?: {
    min: number;
    max: number;
  };
  tvlUsd?: number;
  riskLevel?: RiskLevel;
  isActive?: boolean;
  logoUrl?: string;
  websiteUrl?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface YieldStrategyCreateParams {
  name: string;
  description?: string;
  vaultId: number;
  positionId?: string;
  templateId?: string;
  strategyType: StrategyType;
  riskLevel?: RiskLevel;
  targetApy?: number;
  autoCompound?: boolean;
  autoRebalance?: boolean;
  rebalanceFrequency?: RebalanceFrequency;
  initialInvestmentUsd?: number;
  chainAllocations?: Record<string, number>;
  protocolAllocations?: Record<string, number>;
  maxSlippagePercent?: number;
  maxGasUsd?: number;
  metadata?: Record<string, any>;
  initialAllocations?: YieldAllocationCreateParams[];
}

export interface YieldStrategyUpdateParams {
  name?: string;
  description?: string;
  positionId?: string;
  strategyType?: StrategyType;
  riskLevel?: RiskLevel;
  targetApy?: number;
  isActive?: boolean;
  autoCompound?: boolean;
  autoRebalance?: boolean;
  rebalanceFrequency?: RebalanceFrequency;
  chainAllocations?: Record<string, number>;
  protocolAllocations?: Record<string, number>;
  maxSlippagePercent?: number;
  maxGasUsd?: number;
  metadata?: Record<string, any>;
}

export interface YieldAllocationCreateParams {
  protocolId: string;
  allocationPercent: number;
  initialAmount?: string;
  initialValueUsd?: number;
  positionDetails?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface YieldAllocationUpdateParams {
  allocationPercent?: number;
  currentAmount?: string;
  currentValueUsd?: number;
  earnedAmount?: string;
  earnedValueUsd?: number;
  currentApy?: number;
  status?: AllocationStatus;
  positionDetails?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface YieldProtocolFilter {
  chainId?: string;
  protocolType?: ProtocolType;
  minApy?: number;
  maxApy?: number;
  minTvl?: number;
  maxRiskLevel?: RiskLevel;
  isActive?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface YieldStrategyFilter {
  vaultId?: number;
  positionId?: string;
  strategyType?: StrategyType;
  maxRiskLevel?: RiskLevel;
  isActive?: boolean;
  minApy?: number;
  minValueUsd?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface YieldTransactionCreateParams {
  strategyId: string;
  allocationId?: string;
  transactionType: TransactionType;
  chainId: string;
  protocolId?: string;
  tokenAddress?: string;
  tokenSymbol?: string;
  amount: string;
  valueUsd: number;
  txHash?: string;
  status?: TransactionStatus;
  gasCostUsd?: number;
  metadata?: Record<string, any>;
}

export interface CompoundParams {
  strategyId: string;
  allocationIds?: string[];
  maxGasUsd?: number;
}

export interface RebalanceYieldParams {
  strategyId: string;
  targetAllocations?: Record<string, number>;
  maxSlippagePercent?: number;
  maxGasUsd?: number;
}
