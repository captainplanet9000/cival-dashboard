// src/lib/clients/apiClient.ts
import { type Database } from '@/types/database.types';
import { type AgentTask } from '@/lib/types/task';

// Import payload and response types from their respective definition files
import { 
    type CreateAgentClientPayload,
    type UpdateAgentClientPayload, 
    type TradingAgentDetailsInterface 
} from '@/types/generated/py_models'; // Centralized Pydantic-mirrored types
import { 
    type TriggerCrewRunClientPayload,
    type TriggerCrewRunResponse,
    type CrewBlueprintInterface
} from '@/lib/types/crew'; 
import { type WalletTransactionPayload, type TransferPayload } from '@/lib/types/vault';
import { type MemoryEntryInterface } from '@/lib/types/memory'; // Added for agent memories


// Re-export or define raw DB types for convenience if needed elsewhere, though prefer interfaces for API data
export type Wallet = Database['public']['Tables']['wallets']['Row'];
export type WalletTransaction = Database['public']['Tables']['wallet_transactions']['Row'];
export type TradingStrategy = Database['public']['Tables']['trading_strategies']['Row'];
// TradingAgent is the raw DB row, TradingAgentDetailsInterface is for API responses with more detail
export type TradingAgentDB = Database['public']['Tables']['trading_agents']['Row']; 
export type AgentTrade = Database['public']['Tables']['agent_trades']['Row']; 
export type AgentPerformanceLog = Database['public']['Tables']['agent_performance_logs']['Row'];


// Standardized detailed response type for agent data from APIs
export type TradingAgentWithDetails = TradingAgentDetailsInterface;


export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total_count: number;
}

const BASE_URL = '/api'; // Base for Next.js API routes (BFF)

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'API request failed with status ' + response.status, details: response.statusText }));
    console.error('API Error:', errorData);
    throw new Error(errorData.error || `API request failed: ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

// --- Vault / Wallet Functions ---
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
  const queryParams = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
  const response = await fetch(`${BASE_URL}/vault/wallets/${walletId}/transactions?${queryParams}`);
  return handleResponse<PaginatedResponse<WalletTransaction>>(response);
}

export async function depositToWallet(payload: WalletTransactionPayload): Promise<WalletTransaction> {
  const response = await fetch(`${BASE_URL}/vault/transactions/deposit`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  return handleResponse<WalletTransaction>(response);
}

export async function transferBetweenWallets(payload: TransferPayload): Promise<WalletTransaction> {
  const response = await fetch(`${BASE_URL}/vault/transactions/transfer`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  return handleResponse<WalletTransaction>(response);
}

export async function withdrawFromWallet(payload: WalletTransactionPayload): Promise<WalletTransaction> {
  const response = await fetch(`${BASE_URL}/vault/transactions/withdrawal`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  return handleResponse<WalletTransaction>(response);
}

// --- Task & Crew Related API Client Functions ---
export async function getAgentTask(taskId: string): Promise<AgentTask> {
  if (!taskId) throw new Error('Task ID is required.');
  const response = await fetch(`${BASE_URL}/tasks/${taskId}`);
  return handleResponse<AgentTask>(response);
}

export async function triggerCrewRun(payload: TriggerCrewRunClientPayload): Promise<TriggerCrewRunResponse> {
  const response = await fetch(`${BASE_URL}/crew/run`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  return handleResponse<TriggerCrewRunResponse>(response);
}

export async function cancelAgentTask(taskId: string): Promise<AgentTask> {
  if (!taskId) throw new Error('Task ID is required for cancellation.');
  const response = await fetch(`${BASE_URL}/tasks/${taskId}/cancel`, { method: 'POST' });
  return handleResponse<AgentTask>(response);
}

export async function approveAgentTrade(taskId: string): Promise<AgentTask> {
  if (!taskId) throw new Error('Task ID is required for approval.');
  const response = await fetch(`${BASE_URL}/tasks/${taskId}/approve_trade`, { 
    method: 'POST',
    // No body needed, user context via BFF, task_id in URL
  });
  return handleResponse<AgentTask>(response);
}

export async function rejectAgentTrade(taskId: string): Promise<AgentTask> {
  if (!taskId) throw new Error('Task ID is required for rejection.');
  const response = await fetch(`${BASE_URL}/tasks/${taskId}/reject_trade`, { 
    method: 'POST',
    // No body needed
  });
  return handleResponse<AgentTask>(response);
}

// --- Config Related API Client Functions ---
export async function getAvailableLlms(): Promise<string[]> {
  const response = await fetch(`${BASE_URL}/config/llms`);
  return handleResponse<string[]>(response);
}

export async function getCrewBlueprints(): Promise<CrewBlueprintInterface[]> {
  const response = await fetch(`${BASE_URL}/crew-blueprints`);
  return handleResponse<CrewBlueprintInterface[]>(response);
}

// --- Agent Related API Client Functions ---
export async function getAgentMemories(agentId: string, query?: string, limit?: number): Promise<MemoryEntryInterface[]> {
  const params = new URLSearchParams();
  if (query) params.append('query', query);
  if (limit) params.append('limit', String(limit));
  const response = await fetch(`${BASE_URL}/agents/${agentId}/memory?${params.toString()}`);
  return handleResponse<MemoryEntryInterface[]>(response);
}

export async function getStrategies(): Promise<TradingStrategy[]> {
  const response = await fetch(`${BASE_URL}/strategies`);
  return handleResponse<TradingStrategy[]>(response);
}

export async function createTradingAgent(payload: CreateAgentClientPayload): Promise<TradingAgentDetailsInterface> {
  const response = await fetch(`${BASE_URL}/agents`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  return handleResponse<TradingAgentDetailsInterface>(response);
}

export async function getTradingAgents(): Promise<TradingAgentDetailsInterface[]> {
  const response = await fetch(`${BASE_URL}/agents`);
  return handleResponse<TradingAgentDetailsInterface[]>(response);
}

export async function getAgentDetails(agentId: string): Promise<TradingAgentDetailsInterface> {
  if (!agentId) throw new Error('Agent ID is required.');
  const response = await fetch(`${BASE_URL}/agents/${agentId}`);
  return handleResponse<TradingAgentDetailsInterface>(response);
}

export async function updateTradingAgent(agentId: string, payload: UpdateAgentClientPayload): Promise<TradingAgentDetailsInterface> {
  if (!agentId) throw new Error('Agent ID is required for update.');
  const response = await fetch(`${BASE_URL}/agents/${agentId}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  return handleResponse<TradingAgentDetailsInterface>(response);
}

export async function startAgent(agentId: string): Promise<TradingAgentDetailsInterface> {
  if (!agentId) throw new Error('Agent ID is required for starting.');
  const response = await fetch(`${BASE_URL}/agents/${agentId}/start`, { method: 'POST' });
  return handleResponse<TradingAgentDetailsInterface>(response);
}

export async function stopAgent(agentId: string): Promise<TradingAgentDetailsInterface> {
  if (!agentId) throw new Error('Agent ID is required for stopping.');
  const response = await fetch(`${BASE_URL}/agents/${agentId}/stop`, { method: 'POST' });
  return handleResponse<TradingAgentDetailsInterface>(response);
}

export async function deleteAgent(agentId: string): Promise<void> {
  if (!agentId) throw new Error('Agent ID is required for deletion.');
  const response = await fetch(`${BASE_URL}/agents/${agentId}`, { method: 'DELETE' });
  if (!response.ok) {
    if (response.status === 204) return; 
    const errorData = await response.json().catch(() => ({ error: 'API request failed with status ' + response.status, details: response.statusText }));
    console.error('API Error:', errorData);
    throw new Error(errorData.error || `API request failed: ${response.statusText}`);
  }
  if (response.status !== 204) { // Should ideally be 204 for a successful DELETE with no content
     // If API returns JSON on DELETE success (e.g. the deleted object), handleResponse would work if it expects JSON.
     // For now, this path is less likely for a typical DELETE.
  }
}
