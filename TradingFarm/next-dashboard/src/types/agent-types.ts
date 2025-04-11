// ElizaOS Agent Types
export interface ElizaAgent {
  id: string;
  name: string;
  farm_id: number;
  farmId?: number; // For mock data compatibility
  description?: string;
  status: string;
  config: AgentConfig;
  created_at: string;
  updated_at: string;
  performance_metrics?: AgentPerformanceMetrics;
}

export interface AgentConfig {
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
