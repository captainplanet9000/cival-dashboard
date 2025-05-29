// src/lib/types/task.ts
// This should mirror the Pydantic AgentTask model structure
export type AgentTaskStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

export interface AgentTask {
  task_id: string; // UUID
  agent_id?: string | null; // UUID
  user_id: string; // UUID
  task_name?: string | null;
  status: AgentTaskStatus;
  input_parameters?: Record<string, any> | null;
  results?: Record<string, any> | null;
  error_message?: string | null;
  created_at: string; // ISO datetime string
  updated_at: string; // ISO datetime string
  started_at?: string | null; // ISO datetime string
  completed_at?: string | null; // ISO datetime string
}
