/**
 * Trading Farm Cross-Chain Position Management
 * Type definitions for cross-chain positions
 */

export type RiskLevel = 1 | 2 | 3; // 1 = low, 2 = medium, 3 = high
export type RebalanceFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly';
export type PositionComponentStatus = 'active' | 'pending' | 'inactive' | 'failed';
export type RebalanceStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
export type StrategyType = 'hold' | 'yield' | 'lend' | 'stake' | 'liquidity' | 'farm';

export interface CrossChainPosition {
  id: string;
  vaultId: number;
  name: string;
  description?: string;
  isActive: boolean;
  totalValueUsd: number;
  riskLevel: RiskLevel;
  rebalanceFrequency: RebalanceFrequency;
  lastRebalancedAt?: string;
  nextRebalanceAt?: string;
  autoRebalance: boolean;
  targetAllocations: Record<string, number>; // chainId -> percentage
  performanceMetrics: PerformanceMetrics;
  maxSlippagePercent: number;
  maxGasUsd: number;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  components?: CrossChainPositionComponent[];
}

export interface CrossChainPositionComponent {
  id: string;
  positionId: string;
  chainId: string;
  protocolId: string;
  assetAddress: string;
  assetSymbol: string;
  assetDecimals: number;
  currentAmount: string;
  currentValueUsd: number;
  targetAllocationPercent: number;
  strategyType: StrategyType;
  strategyParams: Record<string, any>;
  lastUpdatedAt: string;
  performanceData: PerformanceData;
  status: PositionComponentStatus;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface RebalanceHistory {
  id: string;
  positionId: string;
  initiatedAt: string;
  completedAt?: string;
  status: RebalanceStatus;
  beforeAllocations: Record<string, number>;
  targetAllocations: Record<string, number>;
  actualAllocations?: Record<string, number>;
  transactions: RebalanceTransaction[];
  totalGasCostUsd?: number;
  totalSlippageUsd?: number;
  errorMessage?: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface RebalanceTransaction {
  id: string;
  chainId: string;
  type: 'bridge' | 'swap' | 'deposit' | 'withdraw';
  fromAsset: string;
  toAsset: string;
  amount: string;
  txHash?: string;
  status: 'pending' | 'completed' | 'failed';
  gasUsed?: number;
  gasCostUsd?: number;
}

export interface PerformanceMetrics {
  daily?: number;
  weekly?: number;
  monthly?: number;
  quarterly?: number;
  yearly?: number;
  allTime?: number;
  volatility?: number;
  sharpeRatio?: number;
  sortino?: number;
  maxDrawdown?: number;
  lastUpdated?: string;
}

export interface PerformanceData {
  apy?: number;
  apr?: number;
  yieldPerDay?: number;
  totalEarned?: number;
  startValue?: number;
  currentValue?: number;
  lastHarvest?: string;
}

export interface PerformanceHistory {
  id: string;
  positionId: string;
  timestamp: string;
  totalValueUsd: number;
  componentValues: Record<string, number>; // componentId -> valueUsd
  benchmarkComparison: Record<string, number>; // benchmark -> performance difference
  periodReturnPercent?: number;
  rollingReturns: {
    day?: number;
    week?: number;
    month?: number;
    ytd?: number;
    year?: number;
  };
  riskMetrics: {
    sharpe?: number;
    sortino?: number;
    maxDrawdown?: number;
    volatility?: number;
  };
  createdAt: string;
}

export interface CrossChainPositionCreateParams {
  vaultId: number;
  name: string;
  description?: string;
  riskLevel?: RiskLevel;
  rebalanceFrequency?: RebalanceFrequency;
  autoRebalance?: boolean;
  targetAllocations: Record<string, number>;
  maxSlippagePercent?: number;
  maxGasUsd?: number;
  metadata?: Record<string, any>;
  initialComponents?: Omit<CrossChainPositionComponent, 'id' | 'positionId' | 'currentValueUsd' | 'lastUpdatedAt' | 'performanceData' | 'createdAt' | 'updatedAt'>[];
}

export interface CrossChainPositionUpdateParams {
  name?: string;
  description?: string;
  isActive?: boolean;
  riskLevel?: RiskLevel;
  rebalanceFrequency?: RebalanceFrequency;
  autoRebalance?: boolean;
  targetAllocations?: Record<string, number>;
  maxSlippagePercent?: number;
  maxGasUsd?: number;
  metadata?: Record<string, any>;
}

export interface ComponentCreateParams {
  positionId: string;
  chainId: string;
  protocolId: string;
  assetAddress: string;
  assetSymbol: string;
  assetDecimals: number;
  currentAmount: string;
  targetAllocationPercent: number;
  strategyType: StrategyType;
  strategyParams?: Record<string, any>;
  status?: PositionComponentStatus;
  metadata?: Record<string, any>;
}

export interface ComponentUpdateParams {
  currentAmount?: string;
  currentValueUsd?: number;
  targetAllocationPercent?: number;
  strategyType?: StrategyType;
  strategyParams?: Record<string, any>;
  status?: PositionComponentStatus;
  metadata?: Record<string, any>;
}

export interface RebalanceParams {
  positionId: string;
  targetAllocations?: Record<string, number>; // If not provided, use position's target allocations
  maxSlippagePercent?: number;
  maxGasUsd?: number;
}

export interface PositionFilterParams {
  vaultId?: number;
  isActive?: boolean;
  riskLevel?: RiskLevel;
  minValueUsd?: number;
  maxValueUsd?: number;
  search?: string;
  limit?: number;
  offset?: number;
}
