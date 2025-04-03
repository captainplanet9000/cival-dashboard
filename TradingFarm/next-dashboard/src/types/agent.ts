/**
 * Type definitions for trading agents
 */

export interface Agent {
  id: number;
  name: string;
  role: string;
  status: 'active' | 'paused' | 'stopped' | 'learning';
  farm_id: number | null;
  strategy_id: number | null;
  performance: number;
  created_at: string;
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
