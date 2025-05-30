/**
 * Type definitions for trading agents
 */

export type AgentStatus = 'active' | 'paused' | 'stopped' | 'learning' | 'inactive' | 'error';

export interface Agent {
  id: string;
  name: string;
  role: string;
  type: string;
  status: AgentStatus;
  farm_id: string;
  strategy_id: string | null;
  performance: number;
  created_at: string;
  updated_at?: string;
  created_by?: string;
}

export interface AgentDetail extends Agent {
  description?: string;
  capabilities?: string[];
  model?: string;
  tools?: string[];
  instructions?: string;
  last_active?: string;
  memory_storage?: {
    working_memory_size: number;
    episodic_memory_count: number;
    semantic_memory_count: number;
  };
  performance_metrics?: {
    trades_executed: number;
    win_rate: number;
    avg_return_per_trade: number;
    max_drawdown: number;
  };
}
