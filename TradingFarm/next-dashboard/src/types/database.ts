/**
 * Database Types for Trading Farm Dashboard
 * 
 * This file defines TypeScript interfaces for database entities used throughout
 * the Trading Farm dashboard, following the established design system and
 * component architecture.
 */

// Agent types
export type AgentType = 'trend' | 'reversal' | 'arbitrage' | 'custom';
export type AgentStatus = 'active' | 'paused' | 'offline';
export type RiskLevel = 'low' | 'medium' | 'high';
export type AutomationLevel = 'none' | 'semi' | 'full';
export type InstructionCategory = 'general' | 'risk' | 'market' | 'timing' | 'strategy';
export type InstructionImpact = 'low' | 'medium' | 'high';
export type AgentLevel = 'basic' | 'advanced' | 'expert';
export type TimeFrame = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | 'Daily' | 'Weekly';

// Farm types
export type FarmStatus = 'active' | 'paused' | 'offline' | 'maintenance';
export type BossmanStatus = 'coordinating' | 'idle' | 'learning' | 'offline';
export type BossmanModel = 'ElizaOS-Basic' | 'ElizaOS-Advanced' | 'ElizaOS-Expert';

// Trade types
export type TradeDirection = 'long' | 'short';
export type TradeStatus = 'open' | 'closed' | 'cancelled';

// Main interfaces
export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  type: AgentType;
  performance: number;
  trades: number;
  winRate: number;
  createdAt: string;
  specialization: string[];
  description: string;
  level: AgentLevel;
  detailedPerformance: DetailedPerformance;
  settings: AgentSettings;
  instructions: AgentInstruction[];
}

export interface DetailedPerformance {
  daily: number;
  weekly: number;
  monthly: number;
  allTime: number;
  trades: {
    won: number;
    lost: number;
    total: number;
  };
  profitFactor: number;
  avgDuration: string;
}

export interface AgentSettings {
  riskLevel: RiskLevel;
  maxDrawdown: number;
  positionSizing: number;
  tradesPerDay: number;
  automationLevel: AutomationLevel;
  timeframes: TimeFrame[];
  indicators: string[];
}

export interface AgentInstruction {
  id: string;
  content: string;
  createdAt: string;
  enabled: boolean;
  category: InstructionCategory;
  impact: InstructionImpact;
}

export interface Farm {
  id: string;
  name: string;
  status: FarmStatus;
  agents: number;
  createdAt: string;
  lastActive: string;
  performance: number;
  resources: {
    cpu: number;
    memory: number;
    bandwidth: number;
  };
  bossman: {
    model: BossmanModel;
    status: BossmanStatus;
    instructions: number;
  };
}

export interface AgentTrade {
  id: string;
  agent_id: string;
  symbol: string;
  entry_price: number;
  exit_price?: number;
  quantity: number;
  direction: TradeDirection;
  status: TradeStatus;
  profit_loss?: number;
  profit_loss_percentage?: number;
  entry_time: string;
  exit_time?: string;
  strategy_used: string;
  trade_tags?: string[];
}
