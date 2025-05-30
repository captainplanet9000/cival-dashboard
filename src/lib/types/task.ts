// src/lib/types/task.ts
// This should mirror the Pydantic AgentTask model structure

// Ensure TradeAction is defined or imported if used by ProposedTradeSignalInterface
export type TradeAction = "BUY" | "SELL" | "HOLD";

export type AgentTaskStatus = 
  | "PENDING" 
  | "RUNNING" 
  | "COMPLETED" 
  | "FAILED" 
  | "CANCELLED"
  | "AWAITING_APPROVAL"; // Added

export interface ProposedTradeSignalInterface {
  signal_id: string; // UUID
  symbol: string;
  action: TradeAction; 
  confidence: number;
  timestamp: string; // ISO datetime string
  execution_price?: number | null;
  rationale: string;
  metadata?: Record<string, any> | null;
  // Fields that might be added by backend upon HIL interaction (optional in main interface)
  approval_status?: "APPROVED" | "REJECTED" | null; 
  rejection_timestamp?: string | null; 
  approval_timestamp?: string | null;
}

// Updated AgentTask interface
export interface AgentTask {
  task_id: string; // UUID
  agent_id?: string | null; // UUID
  user_id: string; // UUID
  task_name?: string | null;
  status: AgentTaskStatus;
  input_parameters?: Record<string, any> | null;
  // Results can now specifically include a proposed_trade_signal
  results?: {
    raw_crew_output?: any;
    proposed_trade_signal?: ProposedTradeSignalInterface;
    simulated_trade_outcome?: any; // From previous tasks
    trade_rejection?: any; // If rejected
    [key: string]: any; // Allow other arbitrary data
  } | null;
  error_message?: string | null;
  created_at: string; // ISO datetime string
  updated_at: string; // ISO datetime string
  started_at?: string | null; // ISO datetime string
  completed_at?: string | null; // ISO datetime string
}
