// src/lib/clients/apiClient.ts
import { type Database } from '@/types/database.types'; // Assuming this path is correct
import { type AgentTask } from '@/lib/types/task'; // Import AgentTask

// Re-export or define types for convenience. Using re-export from database.types for accuracy.
export type Wallet = Database['public']['Tables']['wallets']['Row'];
export type WalletTransaction = Database['public']['Tables']['wallet_transactions']['Row'];
export type TradingStrategy = Database['public']['Tables']['trading_strategies']['Row'];
export type TradingAgent = Database['public']['Tables']['trading_agents']['Row'];
export type AgentTrade = Database['public']['Tables']['agent_trades']['Row']; // Added
export type AgentPerformanceLog = Database['public']['Tables']['agent_performance_logs']['Row']; // Added

// Updated type to include trading_strategies
export type TradingAgentWithDetails = TradingAgent & { 
  wallets: Wallet | null; 
  trading_strategies: TradingStrategy | null; 
};


export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total_count: number;
}

const BASE_URL = '/api'; // Assuming API routes are under /api

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'API request failed with status ' + response.status }));
    console.error('API Error:', errorData);
    throw new Error(errorData.error || `API request failed: ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export async function getUserWallets(): Promise<Wallet[]> {
  const response = await fetch(`${BASE_URL}/vault/wallets`);
  return handleResponse<Wallet[]>(response);
}

export async function getWalletDetails(walletId: string): Promise<Wallet> {
  if (!walletId) throw new Error('Wallet ID is required');
  const response = await fetch(`${BASE_URL}/vault/wallets/${walletId}`);
  return handleResponse<Wallet>(response);
}

export async function getWalletTransactions(
  walletId: string, 
  page: number = 1, 
  limit: number = 20
): Promise<PaginatedResponse<WalletTransaction>> {
  if (!walletId) throw new Error('Wallet ID is required');
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  const response = await fetch(`${BASE_URL}/vault/wallets/${walletId}/transactions?${queryParams}`);
  return handleResponse<PaginatedResponse<WalletTransaction>>(response);
}

import { type WalletTransactionPayload, type TransferPayload } from '@/lib/types/vault'; 
import { type CreateAgentPayload } from '@/lib/types/agent'; // For createTradingAgent payload
import { type TriggerCrewRunPayload, type TriggerCrewRunResponse } from '@/lib/types/crew'; // For Crew Runs

// Placeholder for CreateWalletPayload if needed by a create wallet function later
// import { type CreateWalletPayload } from '@/lib/types/vault'; 
// export async function createWallet(payload: CreateWalletPayload): Promise<Wallet> {
//   const response = await fetch(`${BASE_URL}/vault/wallets`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(payload),
//   });
//   return handleResponse<Wallet>(response);
// }

// Add other API client functions as needed for deposit, withdrawal, transfer etc.

export async function depositToWallet(payload: WalletTransactionPayload): Promise<WalletTransaction> {
  const response = await fetch(`${BASE_URL}/vault/transactions/deposit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<WalletTransaction>(response);
}

// Task & Crew Related API Client Functions
export async function getAgentTask(taskId: string): Promise<AgentTask> {
  if (!taskId) throw new Error('Task ID is required.');
  const response = await fetch(`${BASE_URL}/tasks/${taskId}`);
  return handleResponse<AgentTask>(response);
}

export async function triggerCrewRun(payload: TriggerCrewRunPayload): Promise<TriggerCrewRunResponse> {
  const response = await fetch(`${BASE_URL}/crew/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<TriggerCrewRunResponse>(response);
}


// Agent Related API Client Functions
export async function getStrategies(): Promise<TradingStrategy[]> {
  const response = await fetch(`${BASE_URL}/strategies`);
  return handleResponse<TradingStrategy[]>(response);
}

export async function createTradingAgent(payload: CreateAgentPayload): Promise<TradingAgentWithDetails> {
  const response = await fetch(`${BASE_URL}/agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<TradingAgentWithDetails>(response);
}

export async function getTradingAgents(): Promise<TradingAgentWithDetails[]> {
  const response = await fetch(`${BASE_URL}/agents`);
  return handleResponse<TradingAgentWithDetails[]>(response);
}

export async function startAgent(agentId: string): Promise<TradingAgentWithDetails> {
  if (!agentId) throw new Error('Agent ID is required for starting.');
  const response = await fetch(`${BASE_URL}/agents/${agentId}/start`, { method: 'POST' });
  return handleResponse<TradingAgentWithDetails>(response);
}

export async function stopAgent(agentId: string): Promise<TradingAgentWithDetails> {
  if (!agentId) throw new Error('Agent ID is required for stopping.');
  const response = await fetch(`${BASE_URL}/agents/${agentId}/stop`, { method: 'POST' });
  return handleResponse<TradingAgentWithDetails>(response);
}

export async function deleteAgent(agentId: string): Promise<void> {
  if (!agentId) throw new Error('Agent ID is required for deletion.');
  const response = await fetch(`${BASE_URL}/agents/${agentId}`, { method: 'DELETE' });
  if (!response.ok) {
    // handleResponse expects JSON, but DELETE might return 204 No Content or error JSON
    if (response.status === 204) return; // Successfully deleted
    const errorData = await response.json().catch(() => ({ error: 'API request failed with status ' + response.status }));
    console.error('API Error:', errorData);
    throw new Error(errorData.error || `API request failed: ${response.statusText}`);
  }
  // For 204 No Content, there's no body to parse.
  if (response.status !== 204) {
    return response.json(); // Should not happen if API returns 204 on success
  }
}


export async function transferBetweenWallets(payload: TransferPayload): Promise<WalletTransaction> {
  const response = await fetch(`${BASE_URL}/vault/transactions/transfer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<WalletTransaction>(response);
}

export async function withdrawFromWallet(payload: WalletTransactionPayload): Promise<WalletTransaction> {
  const response = await fetch(`${BASE_URL}/vault/transactions/withdrawal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<WalletTransaction>(response);
}
