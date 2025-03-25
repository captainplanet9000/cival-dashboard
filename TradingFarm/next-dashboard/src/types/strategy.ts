/**
 * Trading Farm Strategy Types
 * 
 * This file defines the TypeScript interfaces for strategy data structures
 * used throughout the Trading Farm application.
 */

/**
 * Represents a trading strategy
 */
export interface Strategy {
  id: string;
  name: string;
  description: string;
  type: string;
  status: 'active' | 'paused' | 'inactive';
  timeframe: string;
  performance: number | string;
  createdAt: string;
  updatedAt: string;
  parameters?: Record<string, any>;
  marketIds?: string[];
  indicators?: string[];
  riskLevel?: 'low' | 'medium' | 'high';
  author?: string;
  tags?: string[];
  profitTarget?: number;
  stopLoss?: number;
  activeTrades?: number;
  totalTrades?: number;
  winRate?: number;
  assignedAgents?: number;
}

/**
 * Represents a template for creating a new strategy
 */
export interface StrategyTemplate {
  name: string;
  description: string;
  type: string;
  timeframe: string;
  parameters?: Record<string, any>;
  marketIds?: string[];
  indicators?: string[];
  riskLevel?: 'low' | 'medium' | 'high';
  profitTarget?: number;
  stopLoss?: number;
  tags?: string[];
}

/**
 * Represents a daily performance data point for a strategy
 */
export interface PerformanceData {
  date: string;
  dailyReturn: number;
  cumulativeReturn: number;
}

/**
 * Represents detailed performance metrics for a strategy
 */
export interface PerformanceMetrics {
  id: string;
  returns: {
    daily: number;
    weekly: number;
    monthly: number;
    allTime: number;
  };
  trades: {
    total: number;
    winning: number;
    losing: number;
    open: number;
  };
  metrics: {
    sharpeRatio?: number;
    maxDrawdown?: number;
    winRate?: number;
    averageReturn?: number;
    profitFactor?: number;
  };
  history: PerformanceData[];
}

/**
 * Represents strategy status update event data
 */
export interface StrategyStatusUpdate {
  id: string;
  status: 'active' | 'paused' | 'inactive';
  updatedAt: string;
}

/**
 * Represents strategy performance update event data
 */
export interface StrategyPerformanceUpdate {
  id: string;
  performance: number | string;
  metrics: {
    sharpeRatio?: number;
    maxDrawdown?: number;
    winRate?: number;
    averageReturn?: number;
    profitFactor?: number;
  };
  updatedAt: string;
}

/**
 * Represents a strategy type with its configuration options
 */
export interface StrategyType {
  id: string;
  name: string;
  description: string;
  category: string;
  parameters: {
    id: string;
    name: string;
    type: string;
    description: string;
    default?: any;
    min?: number;
    max?: number;
    options?: string[];
    isRequired: boolean;
    advanced: boolean;
  }[];
  indicators: string[];
  supportedTimeframes: string[];
  supportedMarkets: string[];
  complexity: 'beginner' | 'intermediate' | 'advanced';
  documentation?: string;
}

/**
 * Represents a strategy creation response
 */
export interface StrategyCreationResponse {
  strategy: Strategy;
  success: boolean;
  message?: string;
}

/**
 * Represents a strategy update response
 */
export interface StrategyUpdateResponse {
  strategy: Strategy;
  success: boolean;
  message?: string;
}

/**
 * Represents a strategy deletion response
 */
export interface StrategyDeletionResponse {
  id: string;
  success: boolean;
  message?: string;
}

/**
 * Represents an agent assigned to a strategy
 */
export interface StrategyAgentAssignment {
  agentId: string;
  agentName: string;
  strategyId: string;
  riskLevel: 'low' | 'medium' | 'high';
  allocation: number;
  status: 'active' | 'paused' | 'inactive';
  performance?: number;
  assignedAt: string;
  updatedAt?: string;
}

/**
 * Represents strategy assignment request data
 */
export interface StrategyAssignmentRequest {
  strategyId: string;
  assignments: Array<{
    agentId: string;
    riskLevel: 'low' | 'medium' | 'high';
    allocation: number;
  }>;
}

/**
 * Represents backtest parameters
 */
export interface BacktestParams {
  startDate: string;
  endDate: string;
  leverage?: number;
  initialCapital?: number;
}

/**
 * Represents backtest results
 */
export interface BacktestResults {
  id: string;
  strategyId: string;
  performance: {
    netProfit: number;
    maxDrawdown: number;
    sharpeRatio: number;
    tradesCount: number;
    winRate: number;
    avgWin: number;
    avgLoss: number;
    profitFactor: number;
  };
  trades: {
    id: string;
    timestamp: string;
    type: 'buy' | 'sell';
    price: number;
    size: number;
    profit: number;
    duration: string;
  }[];
  startDate: string;
  endDate: string;
  createdAt: string;
}
