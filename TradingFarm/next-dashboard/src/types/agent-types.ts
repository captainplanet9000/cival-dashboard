// Agent Types for Trading Farm
// Contains type definitions for both ElizaOS agents and Trading agents

///////////////////////////////////////
// Trading Agent Types
///////////////////////////////////////

/**
 * Trading agent status types
 */
export type AgentStatus = 'idle' | 'starting' | 'running' | 'stopping' | 'stopped' | 'error' | 'paused';

/**
 * Risk level for trading agents
 */
export type RiskLevel = 'low' | 'medium' | 'high';

/**
 * Trading strategy parameters
 */
export interface StrategyParameters {
  maxOrderSize: number;
  maxPositionSize: number;
  maxLeverage: number;
  maxDrawdown: number;
  stopLossPercentage: number;
  takeProfitPercentage: number;
  trailingStopActivationPercentage?: number;
  trailingStopDistancePercentage?: number;
  [key: string]: any; // Allow for strategy-specific parameters
}

/**
 * Risk controls for a trading agent
 */
export interface RiskControls {
  enableStopLoss: boolean;
  enableTakeProfit: boolean;
  enableTrailingStop: boolean;
  enableMaxDrawdownProtection: boolean;
  [key: string]: any; // Allow for additional risk controls
}

/**
 * Configuration for a trading agent
 */
export interface AgentConfig {
  agent_id: string;
  parameters: StrategyParameters;
  risk_controls: RiskControls;
  active: boolean;
  [key: string]: any; // Allow for additional configuration options
}

/**
 * Trading strategy
 */
export interface TradingStrategy {
  id: string;
  name: string;
  description: string;
  category: string;
  risk_level: RiskLevel;
  default_parameters: StrategyParameters;
  required_indicators: string[];
  timeframes: string[];
  markets: string[];
  created_at: string;
  updated_at: string;
  version: string;
  author: string;
  is_public: boolean;
  performance_metrics?: {
    win_rate: number;
    profit_factor: number;
    sharpe_ratio: number;
    max_drawdown: number;
    average_trade: number;
  };
}

/**
 * Trading agent
 */
export interface TradingAgent {
  id: string;
  name: string;
  description?: string;
  farm_id: string;
  farm?: any; // Farm details
  strategy_id: string;
  strategy?: TradingStrategy;
  status: AgentStatus;
  is_live: boolean;
  trading_pair: string;
  exchange_id: string;
  risk_level: RiskLevel;
  created_at: string;
  updated_at: string;
  last_active?: string;
  config?: AgentConfig;
  performance?: {
    total_trades: number;
    winning_trades: number;
    losing_trades: number;
    profit_loss: number;
    win_rate: number;
    average_win: number;
    average_loss: number;
    largest_win: number;
    largest_loss: number;
    max_drawdown: number;
    sharpe_ratio: number;
  };
}

///////////////////////////////////////
// ElizaOS Agent Types
///////////////////////////////////////

export interface ElizaAgent {
  id: string;
  name: string;
  farm_id: number;
  farmId?: number; // For mock data compatibility
  description?: string;
  status: string;
  config: ElizaAgentConfig;
  created_at: string;
  updated_at: string;
  performance_metrics?: AgentPerformanceMetrics;
}

export interface ElizaAgentConfig {
  agentType: string;
  strategyType: string;
  markets: string[];
  tools: string[];
  risk_level: 'low' | 'medium' | 'high';
  api_access: boolean;
  trading_permissions: string;
  auto_recovery: boolean;
  max_concurrent_tasks?: number;
  llm_model?: string;
  initialInstructions?: string;
}

export interface AgentPerformanceMetrics {
  success_rate: number;
  average_response_time_ms: number;
  commands_processed: number;
  errors_count: number;
  uptime_percentage: number;
  last_active_at: string;
}

export type AgentAction = 'start' | 'stop' | 'pause' | 'resume' | 'restart';

export interface AgentLog {
  id: string;
  agent_id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  category: string;
  message: string;
  details?: any;
}

export interface CreateAgentParams {
  name: string;
  description: string;
  config: {
    agentType: string;
    farmId: number;
    strategyType: string;
    markets: string[];
    tools: string[];
    initialInstructions?: string;
    riskLevel: 'low' | 'medium' | 'high';
    apiAccess?: boolean;
    tradingPermissions?: string;
    autoRecovery?: boolean;
  };
}
