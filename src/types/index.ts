// Common types
export type UUID = string;
export type Timestamp = string;

// Add standard JSON type definition
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Farm types
export interface Farm {
  id: number;
  name: string;
  description?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'ERROR' | 'STOPPED' | 'PAUSED';
  is_active: boolean;
  settings?: {
    autonomyLevel?: 'manual' | 'semi' | 'full';
    defaultExchange?: string;
    activeStrategies?: string[];
    tradingPairs?: string[];
    exchange?: string;
    apiKey?: string;
    apiSecret?: string;
  };
  balance?: {
    total: number;
    available: number;
    locked: number;
    currency: string;
  };
  performance?: {
    totalReturn?: number;
    dailyReturn?: number;
    monthlyReturn?: number;
    winRate?: number;
    profitFactor?: number;
  };
  goal_name?: string | null;
  goal_description?: string | null;
  goal_target_assets?: string[] | null;
  goal_target_amount?: number | null;
  goal_current_progress?: { [asset: string]: number };
  goal_status?: 'active' | 'inactive' | 'completed' | 'failed' | 'paused';
  goal_completion_action?: {
    transferToBank?: {
      enabled: boolean;
      percentage: number;
      assetSymbol?: string;
      targetVaultId: string;
    };
    startNextGoal?: boolean;
  };
  goal_deadline?: string | null;
  goal_progress?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Agent types
export interface Agent {
  id: number;
  name: string;
  farm_id: number | null;
  agent_type?: string;
  type?: string;
  status: string;
  eliza_config?: Record<string, any>;
  config?: Record<string, any>;
  capabilities?: string[];
  metadata?: Record<string, any>;
  is_active?: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// Vault types
export interface VaultBalance {
  id: UUID;
  vault_id: UUID;
  asset_symbol: string;
  amount: string;
  last_updated: Timestamp;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Transaction {
  id: UUID;
  farm_id: number;
  vault_id: UUID;
  transaction_type: string;
  asset_symbol: string;
  amount: string;
  status: string;
  transaction_hash?: string;
  executed_at?: Timestamp;
  description?: string;
  metadata?: Record<string, any>;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// Goal types
export interface GoalTemplate {
  id: UUID;
  name: string;
  description: string | null;
  goal_type: string;
  parameters: Record<string, any>;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Goal {
  id: UUID;
  farm_id: UUID;
  template_id: UUID | null;
  name: string;
  description: string | null;
  goal_type: string;
  target_value: number | null;
  target_asset: string | null;
  parameters: Record<string, any>;
  start_date: Timestamp | null;
  end_date: Timestamp | null;
  status: 'active' | 'paused' | 'completed' | 'failed';
  priority: number;
  progress: number;
  last_evaluated_at: Timestamp | null;
  metadata: Record<string, any>;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface GoalMetric {
  id: UUID;
  goal_id: UUID;
  timestamp: Timestamp;
  current_value: number | null;
  progress: number;
  metrics: Record<string, any>;
  created_at: Timestamp;
}

export interface GoalDependency {
  id: UUID;
  goal_id: UUID;
  depends_on_goal_id: UUID;
  dependency_type: string;
  created_at: Timestamp;
}

export interface GoalAction {
  id: UUID;
  goal_id: UUID;
  agent_id: UUID | null;
  action_type: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  parameters: Record<string, any>;
  result: Record<string, any> | null;
  executed_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// Analytics types
export interface AssetPerformance {
  symbol: string;
  allocation: number;
  performance_7d: number;
  performance_30d: number;
  value: number;
  color?: string;
}

export interface HistoricalBalance {
  date: string;
  total: number;
}

export interface ProfitLoss {
  month: string;
  profit: number;
  loss: number;
}

// Brain types
export interface BrainQueryResult {
  query: string;
  results: Array<{
    document_title: string;
    content: string;
    similarity: number;
    metadata: Record<string, any>;
  }>;
  result_count: number;
  synthesis?: string;
}

// Wallet types (Revised based on DB Schema)
export interface Wallet {
  id: number;
  name: string;
  balance: number; // From DB
  currency: string; // From DB
  is_active: boolean; // From DB
  metadata: Json; // From DB
  owner_id: number | null; // From DB
  owner_type: string; // From DB
  created_at: Timestamp; // From DB
  updated_at: Timestamp; // From DB
  // Removed: description, farm_id, user_id, address, wallet_type
}

export interface CreateWalletParams {
  name: string; // Required
  currency: string; // Required
  owner_id?: number | null; // Required context
  owner_type: string; // Required context
  balance?: number; // Optional initial balance
  is_active?: boolean; // Optional
  metadata?: Json; // Optional
  // Removed: farm_id, user_id, wallet_type, address
} 