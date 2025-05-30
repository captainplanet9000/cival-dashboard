/**
 * Strategy Engine Types
 * 
 * Core types for the pluggable strategy architecture, allowing for
 * easy implementation of new trading strategies.
 */

import { MarketData } from '@/types/exchange';
import { RiskProfile } from '@/lib/risk/types';

/**
 * Trading signal types that strategies can generate
 */
export enum SignalType {
  BUY = 'BUY',
  SELL = 'SELL',
  HOLD = 'HOLD',
  STRONG_BUY = 'STRONG_BUY',
  STRONG_SELL = 'STRONG_SELL'
}

/**
 * Timeframes for strategy analysis
 */
export enum Timeframe {
  M1 = '1m',
  M5 = '5m',
  M15 = '15m',
  M30 = '30m',
  H1 = '1h',
  H4 = '4h',
  D1 = '1d',
  W1 = '1w'
}

/**
 * Trading signal output from a strategy
 */
export interface Signal {
  type: SignalType;
  symbol: string;
  timestamp: string;
  price: number;
  strength: number; // 0-100 confidence level
  timeframe: Timeframe;
  strategyId: string;
  metadata: Record<string, any>;
}

/**
 * Strategy parameter definition
 */
export interface StrategyParameter {
  id: string;
  name: string;
  description: string;
  type: 'number' | 'boolean' | 'string' | 'select';
  default: any;
  min?: number;
  max?: number;
  step?: number;
  options?: string[] | number[];
  unit?: string;
  category?: string;
  isRequired: boolean;
  isAdvanced: boolean;
}

/**
 * Strategy metadata 
 */
export interface StrategyMeta {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  tags: string[];
  parameters: StrategyParameter[];
  requiredDataFeeds: string[];
  defaultTimeframe: Timeframe;
  maximumBars: number;
  riskProfileCompatibility: RiskLevel[];
}

/**
 * Risk levels for strategy compatibility
 */
export enum RiskLevel {
  CONSERVATIVE = 'conservative',
  MODERATE = 'moderate',
  AGGRESSIVE = 'aggressive',
  CUSTOM = 'custom'
}

/**
 * Backtest configuration
 */
export interface BacktestConfig {
  strategyId: string;
  parameters: Record<string, any>;
  symbols: string[];
  startDate: string;
  endDate: string;
  initialCapital: number;
  timeframe: Timeframe;
  commission: number;
  slippage: number;
  includeFees: boolean;
  riskProfile: RiskProfile;
}

/**
 * Backtest trade result
 */
export interface BacktestTrade {
  id: string;
  symbol: string;
  entryType: 'BUY' | 'SELL';
  entryPrice: number;
  entryTime: string;
  positionSize: number;
  stopLoss?: number;
  takeProfit?: number;
  exitPrice?: number;
  exitTime?: string;
  profit?: number;
  profitPercent?: number;
  fees: number;
  riskRewardRatio?: number;
  duration?: number; // In milliseconds
  signalId: string;
}

/**
 * Backtest performance metrics
 */
export interface BacktestPerformance {
  netProfit: number;
  netProfitPercent: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  sharpeRatio: number;
  sortinoRatio: number;
  totalFees: number;
  averageDurationHours: number;
  roi: number;
  cagr?: number;
  dailyReturns: number[];
  equityCurve: { timestamp: string; equity: number }[];
  tradesPerDay: number;
  profitPerDay: number;
}

/**
 * Backtest result
 */
export interface BacktestResult {
  id: string;
  config: BacktestConfig;
  performance: BacktestPerformance;
  trades: BacktestTrade[];
  signals: Signal[];
  createdAt: string;
  completedAt: string;
  status: 'running' | 'completed' | 'failed';
  errorMessage?: string;
}

/**
 * Core strategy interface that all strategies must implement
 */
export interface IStrategy {
  /**
   * Get strategy metadata
   */
  getMeta(): StrategyMeta;
  
  /**
   * Validate strategy parameters
   */
  validateParameters(parameters: Record<string, any>): boolean;
  
  /**
   * Initialize the strategy
   */
  initialize(parameters: Record<string, any>): Promise<boolean>;
  
  /**
   * Process new market data and generate signals
   */
  process(marketData: MarketData[], timeframe: Timeframe): Promise<Signal[]>;
  
  /**
   * Run strategy backtest
   */
  backtest(config: BacktestConfig): Promise<BacktestResult>;
}

/**
 * Strategy instance database model
 */
export interface StrategyInstance {
  id: string;
  strategyId: string;
  name: string;
  description?: string;
  parameters: Record<string, any>;
  symbols: string[];
  timeframes: Timeframe[];
  isActive: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
  lastExecutedAt?: string;
  lastSignal?: Signal;
  executionFrequency: number; // In minutes
  tags: string[];
}
