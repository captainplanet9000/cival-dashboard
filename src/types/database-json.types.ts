import { Database } from './database.types';

/**
 * Type definition for generic JSON structure allowed by Supabase.
 */
export type Json = Database['public']['Tables']['farms']['Row']['settings']; // Use an existing Json field for the base type

/**
 * Expected structure for the 'settings' JSON column in the 'farms' table.
 * Contains configuration specific to a trading farm's operation.
 */
export interface FarmSettings {
  /** Default profit target percentage for strategies within the farm. */
  defaultProfitTarget?: number;
  /** Channels enabled for farm notifications. */
  notificationChannels?: ('email' | 'dashboard' | 'sms')[];
  /** General risk tolerance level set for the farm. */
  riskTolerance?: 'low' | 'medium' | 'high';
  /** Whether automatic portfolio rebalancing is enabled. */
  autoRebalance?: boolean;
  /** The deviation threshold (e.g., 0.05 for 5%) that triggers rebalancing. */
  rebalanceThreshold?: number;
  // ... other potential settings
}

/**
 * Expected structure for the 'parameters' JSON column in the 'strategies' table.
 * Defines the configurable parameters for a specific trading strategy.
 * Structure can vary significantly based on the strategy_type.
 */
export interface StrategyParameters {
  /** The primary timeframe the strategy operates on. */
  timeframe?: Database["public"]["Enums"]["timeframe"];
  /** The specific asset pair the strategy trades (e.g., 'BTC/USDT'). */
  assetPair?: string;
  /** Leverage multiplier to be used (if applicable). */
  leverage?: number;

  // --- Strategy Specific Examples ---
  /** The technical indicator used (e.g., 'RSI', 'MACD'). */
  indicator?: string;
  /** Period length for RSI calculation. */
  rsiPeriod?: number;
  /** RSI level considered overbought. */
  rsiOverbought?: number;
  /** RSI level considered oversold. */
  rsiOversold?: number;
  /** Fast period for MACD calculation. */
  macdFastPeriod?: number;
  /** Slow period for MACD calculation. */
  macdSlowPeriod?: number;
  /** Signal line period for MACD calculation. */
  macdSignalPeriod?: number;
  /** Number of levels for a grid strategy. */
  gridLevels?: number;
  /** Price step between grid levels. */
  gridStep?: number;
  // ... other parameters for different strategy types
}

/**
 * Expected structure for 'performance_metrics' JSON columns
 * (used in strategies, agent_strategies, farm_strategies, strategy_versions, farms)
 */
export interface PerformanceMetrics {
   /** Profit and Loss percentage, commonly displayed. */
   profit_loss?: number;

   // Other potential metrics (can be uncommented/added as needed)
   // totalPnl?: number;
   // pnlPercent?: number;
   // winRate?: number; // 0 to 1
   // profitFactor?: number;
   // maxDrawdown?: number; // Percentage, e.g., 0.15 for 15%
   // sharpeRatio?: number;
   // sortinoRatio?: number;
   // totalTrades?: number;
   // avgTradeDuration?: number; // seconds or minutes
   /** ISO 8601 timestamp of the last metric calculation. */
   // lastUpdated?: string; // ISO 8601 timestamp
   // ... other metrics
}

/**
 * Expected structure for the 'config' JSON column in the 'agent_strategies' table.
 * Contains agent-specific overrides or configurations for a strategy.
 */
export interface AgentStrategyConfig extends Partial<StrategyParameters> {
   /** Max allocation percentage for this agent on this strategy. */
   maxAllocation?: number;
   /** Risk percentage per trade for this agent. */
   riskPerTrade?: number;
   // ... other agent-specific configurations
}

/**
 * Expected structure for the 'skills' JSON column in the 'agent_capabilities' table.
 * Defines the capabilities and limitations of a trading agent.
 */
export interface AgentSkills {
   /** List of asset pairs the agent is allowed to trade. */
   tradingPairs?: string[];
   /** List of technical indicators the agent can compute or use. */
   technicalIndicators?: string[];
   /** Level of risk assessment capability. */
   riskAssessment?: 'basic' | 'advanced' | 'comprehensive';
   /** Types of orders the agent can place. */
   orderTypes?: ('market' | 'limit' | 'stop_loss' | 'take_profit')[];
   /** Whether the agent is permitted to use leverage. */
   canUseLeverage?: boolean;
   /** Maximum leverage multiplier the agent can use. */
   maxLeverage?: number;
   /** List of exchange identifiers the agent can connect to. */
   allowedExchanges?: string[];
}

/**
 * Expected structure for the 'settings' JSON column in the 'vaults' table.
 * Configuration specific to a vault's operation and rules.
 */
export interface VaultSettings {
  /** List of asset symbols allowed within the vault. */
  allowedAssets?: string[];
  /** Whether KYC (Know Your Customer) is required for users of this vault. */
  requiresKyc?: boolean;
  /** Minimum amount required for depositing into the vault. */
  minDepositAmount?: number;
  /** Time lock duration in hours before withdrawals are processed. */
  withdrawalTimeLockHours?: number;
  /** Fee percentage charged on profits or transactions within the vault. */
  feePercentage?: number;
}

/**
 * Expected structure for the 'value' JSON column in the 'agent_memory' table.
 * Structure might vary depending on the memory type.
 */
export interface AgentMemoryValue {
  /** The type or category of the memory item. */
  type: 'observation' | 'reflection' | 'conversation' | 'plan_step' | 'internal_thought';
  /** The textual content of the memory. */
  content: string;
  /** Assessed importance score (e.g., 0-10). */
  importance?: number;
  /** IDs of related memory items. */
  related_memory_ids?: string[];
  /** ISO 8601 timestamp of the event related to the memory. */
  timestamp?: string;
  /** Additional contextual metadata specific to the memory type. */
  metadata?: Record<string, any>;
}

/**
 * Expected structure for the 'specs' JSON column in the 'worker_agents' table.
 * Defines the technical specifications or resource requirements for an agent.
 */
export interface AgentSpecs {
  /** CPU specification (e.g., '1 vCPU'). */
  cpu?: string;
  /** Memory specification (e.g., '2 GB RAM'). */
  memory?: string;
  /** Storage specification (e.g., '10 GB'). */
  storage?: string;
  /** GPU requirement (e.g., 'NVIDIA T4') or null if none. */
  gpu?: string | null;
  /** System architecture (e.g., 'amd64', 'arm64'). */
  architecture?: string;
  /** Base container image reference (e.g., 'ubuntu:22.04'). */
  base_image?: string;
  /** List of required software tools or packages. */
  required_tools?: string[];
  /** Path to or content of an initialization script. */
  initialization_script?: string;
}

// --- Add other interfaces as needed during subsequent phases --- 