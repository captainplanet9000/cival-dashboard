// src/lib/types/agent.ts

// For creating a new agent
export interface CreateAgentPayload {
  name: string;
  strategy_id: string; // UUID from trading_strategies table
  configuration_parameters: Record<string, any>; // JSONB
  initial_capital: number;
  funding_currency: string; // e.g., "USD", should be a valid currency_code from user's wallets
}

// For updating an existing agent's configurable details
export interface UpdateAgentPayload {
  name?: string;
  assigned_strategy_id?: string; // UUID from trading_strategies table
  configuration_parameters?: Record<string, any>; // JSONB
}
