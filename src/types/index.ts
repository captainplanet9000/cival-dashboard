// Common types
export type UUID = string;
export type Timestamp = string;

// Farm types
export interface Farm {
  id: UUID;
  name: string;
  description: string | null;
  owner_id: string;
  is_active: boolean;
  settings: Record<string, any>;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// Agent types
export interface Agent {
  id: UUID;
  name: string;
  description: string | null;
  farm_id: UUID;
  type: string;
  status: 'active' | 'inactive' | 'error';
  eliza_config: Record<string, any>;
  capabilities: string[];
  metadata: Record<string, any>;
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
  farm_id: UUID;
  vault_id: UUID;
  transaction_type: string;
  asset_symbol: string;
  amount: string;
  status: string;
  transaction_hash: string;
  executed_at: Timestamp;
  description: string;
  metadata: Record<string, any>;
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