/**
 * Goal-related data types for the Trading Farm platform
 */

// Goal type
export interface Goal {
  id: string;
  farm_id: string;
  name: string;
  description?: string;
  target_amount: number;
  current_amount: number;
  target_assets: string[]; // Can contain multiple options like ['SONIC', 'SUI']
  selected_asset?: string; // Will be set during strategy selection
  status: 'PENDING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'FAILED';
  completion_actions?: {
    transferToBank?: boolean;
    startNextGoal?: boolean;
    nextGoalId?: string;
  };
  created_at: string;
  updated_at: string;
  strategies?: GoalStrategy[];
  transactions?: GoalTransaction[];
}

// Goal create/update type
export interface GoalCreateInput {
  farm_id: string;
  name: string;
  description?: string;
  target_amount: number;
  target_assets: string[];
  completion_actions?: {
    transferToBank?: boolean;
    startNextGoal?: boolean;
    nextGoalId?: string;
  };
}

// Goal strategy type
export interface GoalStrategy {
  id: string;
  goal_id: string;
  agent_id: string;
  strategy_type: string; // e.g., 'DEX_SWAP', 'YIELD_FARMING'
  parameters?: Record<string, any>;
  is_active: boolean;
  proposed_at: string;
  selected_at?: string;
  created_at: string;
  updated_at: string;
  agent?: Agent; // Reference to Agent type from farm-types.ts
}

// Goal strategy create/update type
export interface GoalStrategyCreateInput {
  goal_id: string;
  agent_id: string;
  strategy_type: string;
  parameters?: Record<string, any>;
}

// Goal transaction type
export interface GoalTransaction {
  id: string;
  goal_id: string;
  strategy_id?: string;
  transaction_type: string; // e.g., 'SWAP', 'STAKE', 'UNSTAKE', 'CLAIM'
  asset_from?: string;
  amount_from?: number;
  asset_to?: string;
  amount_to?: number;
  transaction_hash?: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  created_at: string;
  updated_at: string;
}

// Goal transaction create/update type
export interface GoalTransactionCreateInput {
  goal_id: string;
  strategy_id?: string;
  transaction_type: string;
  asset_from?: string;
  amount_from?: number;
  asset_to?: string;
  amount_to?: number;
  transaction_hash?: string;
}

// Goal monitoring event type
export interface GoalMonitoringEvent {
  id: string;
  goal_id: string;
  agent_id: string;
  event_type: string; // e.g., 'PROGRESS_UPDATE', 'MARKET_CHANGE', 'STRATEGY_ADJUSTMENT'
  event_data?: Record<string, any>;
  created_at: string;
}

// Goal monitoring event create type
export interface GoalMonitoringEventCreateInput {
  goal_id: string;
  agent_id: string;
  event_type: string;
  event_data?: Record<string, any>;
}

// Goal analysis type (used by agents to analyze goal feasibility)
export interface GoalAnalysis {
  goal_id: string;
  agent_id: string;
  target_asset: string;
  estimated_cost: number;
  estimated_time_days: number;
  strategy_recommendation: string;
  market_conditions: {
    price: number;
    liquidity: number;
    volatility: number;
    trend: 'bullish' | 'bearish' | 'neutral';
  };
  risk_assessment: {
    risk_level: 'low' | 'medium' | 'high';
    factors: Array<{
      name: string;
      impact: number;
      description: string;
    }>;
  };
  yield_opportunities?: Array<{
    protocol: string;
    estimated_apr: number;
    lock_period_days?: number;
    risk_level: 'low' | 'medium' | 'high';
  }>;
  created_at: string;
}

// Import required types from other files
import { Agent } from './farm-types';
