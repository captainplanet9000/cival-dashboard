import { SupportedChainId } from './chains';
import { SafeAccountConfig, SafeTransaction } from '@safe-global/protocol-kit';

/**
 * Supported DeFi lending protocols
 */
export enum LendingProtocol {
  AAVE_V3 = 'aave_v3',
}

/**
 * Supported interest rate modes for borrowing
 */
export enum InterestRateMode {
  VARIABLE = 1,
  STABLE = 2,
}

/**
 * Chain-specific configuration for Aave V3
 */
export interface AaveChainConfig {
  chainId: SupportedChainId;
  poolAddress: string;
  poolAddressProviderAddress: string;
  wethGatewayAddress?: string;
  protocolDataProviderAddress?: string;
  uiDataProviderAddress?: string;
  rewardsControllerAddress?: string;
  eModeCategoryId?: number; // E-Mode category ID for stablecoins or ETH-correlated assets
}

/**
 * Asset configuration for a specific chain
 */
export interface AssetConfig {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  aTokenAddress?: string;
  stableDebtTokenAddress?: string;
  variableDebtTokenAddress?: string;
  isActive: boolean;
  canBeCollateral: boolean;
  ltv: number; // Represented as a number between 0-100 (%)
  liquidationThreshold: number; // Represented as a number between 0-100 (%)
  liquidationBonus: number; // Represented as a number between 0-100 (%)
  supplyCap?: string; // Optional max supply cap
  borrowCap?: string; // Optional max borrow cap
  isIsolated?: boolean; // If asset is in isolation mode
  eModeCategoryId?: number; // If asset belongs to an E-Mode category
}

/**
 * User account data from Aave
 */
export interface UserAccountData {
  totalCollateralBase: string;
  totalDebtBase: string;
  availableBorrowsBase: string;
  currentLiquidationThreshold: number;
  ltv: number;
  healthFactor: string;
}

/**
 * Supported lending strategy types
 */
export enum LendingStrategyType {
  BASIC_SUPPLY_BORROW = 'basic_supply_borrow',
  RECURSIVE_LOOP = 'recursive_loop',
  SELF_REPAYING = 'self_repaying',
  DYNAMIC_LTV = 'dynamic_ltv',
}

/**
 * Base configuration for any lending strategy
 */
export interface BaseLendingStrategyConfig {
  type: LendingStrategyType;
  agentId: string;
  safeAddress: string;
  chainId: SupportedChainId;
  protocol: LendingProtocol;
  targetHealthFactor: number; // Minimum health factor to maintain
  liquidationProtection: boolean; // Whether to enable auto-protection against liquidations
  autoRebalancing: boolean; // Whether to enable auto-rebalancing
}

/**
 * Configuration for a basic supply-borrow strategy
 */
export interface BasicSupplyBorrowConfig extends BaseLendingStrategyConfig {
  type: LendingStrategyType.BASIC_SUPPLY_BORROW;
  collateralAsset: string; // Asset address
  borrowAsset: string; // Asset address
  initialCollateralAmount: string; // Initial amount to supply
  targetLTV: number; // Target LTV as percentage (0-100)
}

/**
 * Configuration for a recursive looping strategy
 */
export interface RecursiveLoopConfig extends BaseLendingStrategyConfig {
  type: LendingStrategyType.RECURSIVE_LOOP;
  collateralAsset: string; // Asset address
  borrowAsset: string; // Asset address
  initialCollateralAmount: string; // Initial amount to supply
  targetLTV: number; // Target LTV as percentage (0-100)
  maxIterations?: number; // Maximum number of loops (optional)
  batchProcessing: boolean; // Whether to batch iterations in single transactions
}

/**
 * Configuration for a self-repaying loan strategy
 */
export interface SelfRepayingConfig extends BaseLendingStrategyConfig {
  type: LendingStrategyType.SELF_REPAYING;
  collateralAsset: string; // Asset address
  borrowAsset: string; // Asset address
  initialCollateralAmount: string; // Initial amount to supply
  targetLTV: number; // Target LTV as percentage (0-100)
  repaymentInterval: number; // Interval in seconds to check and repay
  repaymentThreshold: string; // Minimum amount to repay
}

/**
 * Configuration for a dynamic LTV strategy
 */
export interface DynamicLTVConfig extends BaseLendingStrategyConfig {
  type: LendingStrategyType.DYNAMIC_LTV;
  collateralAsset: string; // Asset address
  borrowAsset: string; // Asset address
  initialCollateralAmount: string; // Initial amount to supply
  targetLTV: number; // Target LTV as percentage (0-100)
  ltvRange: [number, number]; // Range around target LTV to maintain [min, max]
  rebalanceInterval: number; // Interval in seconds to check and rebalance
}

/**
 * Union type for all lending strategy configurations
 */
export type LendingStrategyConfig =
  | BasicSupplyBorrowConfig
  | RecursiveLoopConfig
  | SelfRepayingConfig
  | DynamicLTVConfig;

/**
 * Strategy execution status
 */
export enum StrategyExecutionStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Strategy position information
 */
export interface StrategyPosition {
  strategyId: string;
  safeAddress: string;
  chainId: SupportedChainId;
  collateralAsset: string;
  collateralAmount: string;
  borrowAsset: string;
  borrowAmount: string;
  healthFactor: string;
  ltv: number;
  status: StrategyExecutionStatus;
  lastUpdated: Date;
  apy?: number; // Net APY if available
}

/**
 * Transaction request for the Safe
 */
export interface SafeTransactionRequest {
  to: string;
  value: string;
  data: string;
  operation?: number;
  safeTxGas?: number;
  baseGas?: number;
  gasPrice?: string;
  refundReceiver?: string;
  nonce?: number;
}

/**
 * Flash loan request parameters
 */
export interface FlashLoanRequest {
  assets: string[];
  amounts: string[];
  modes: InterestRateMode[]; // 0 = no debt, 1 = stable, 2 = variable
  onBehalfOf: string;
  params: string;
  referralCode?: number;
}

/**
 * Collateral swap request parameters
 */
export interface CollateralSwapRequest {
  fromAsset: string;
  toAsset: string;
  fromAmount: string;
  useFlashLoan: boolean;
  slippageTolerance: number; // As percentage (0-100)
}

/**
 * Transaction simulation result
 */
export interface SimulationResult {
  success: boolean;
  gasUsed?: string;
  error?: string;
  newHealthFactor?: string;
  newLTV?: number;
  newCollateralBalance?: string;
  newBorrowBalance?: string;
}

/**
 * Risk parameters for a strategy
 */
export interface RiskParameters {
  minHealthFactor: number;
  emergencyHealthFactor: number; // When to take emergency action
  maxLTV: number; // Maximum LTV to ever reach
  ltvBuffer: number; // Buffer below liquidation threshold
}

/**
 * Historical action taken by the strategy
 */
export interface StrategyAction {
  id: string;
  strategyId: string;
  actionType: string;
  description: string;
  txHash?: string;
  timestamp: Date;
  beforeState?: Partial<StrategyPosition>;
  afterState?: Partial<StrategyPosition>;
}
