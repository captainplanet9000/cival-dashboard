/**
 * Type-safe query key factory for Trading Farm
 * 
 * This ensures consistent key structure across the application and enables
 * proper type-checking and autocompletion for query invalidation.
 */

// Farm related query keys
export const farmKeys = {
  all: ['farms'] as const,
  lists: () => [...farmKeys.all, 'list'] as const,
  list: (filters?: Record<string, any>) => 
    [...farmKeys.lists(), filters] as const,
  details: () => [...farmKeys.all, 'detail'] as const,
  detail: (id: string) => [...farmKeys.details(), id] as const,
};

// Agent related query keys
export const agentKeys = {
  all: ['agents'] as const,
  lists: () => [...agentKeys.all, 'list'] as const,
  list: (filters?: Record<string, any>) => 
    [...agentKeys.lists(), filters] as const,
  details: () => [...agentKeys.all, 'detail'] as const,
  detail: (id: string) => [...agentKeys.details(), id] as const,
};

// Strategy related query keys
export const strategyKeys = {
  all: ['strategies'] as const,
  lists: () => [...strategyKeys.all, 'list'] as const,
  list: (filters?: Record<string, any>) => 
    [...strategyKeys.lists(), filters] as const,
  details: () => [...strategyKeys.all, 'detail'] as const,
  detail: (id: string) => [...strategyKeys.details(), id] as const,
};

// Goal related query keys
export const goalKeys = {
  all: ['goals'] as const,
  lists: () => [...goalKeys.all, 'list'] as const,
  list: (filters?: Record<string, any>) => 
    [...goalKeys.lists(), filters] as const,
  details: () => [...goalKeys.all, 'detail'] as const,
  detail: (id: string) => [...goalKeys.details(), id] as const,
};

// Position related query keys
export const positionKeys = {
  all: ['positions'] as const,
  lists: () => [...positionKeys.all, 'list'] as const,
  list: (filters?: Record<string, any>) => 
    [...positionKeys.lists(), filters] as const,
  details: () => [...positionKeys.all, 'detail'] as const,
  detail: (id: string) => [...positionKeys.details(), id] as const,
};

// Order related query keys
export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (filters?: Record<string, any>) => 
    [...orderKeys.lists(), filters] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
};

// Exchange related query keys
export const exchangeKeys = {
  all: ['exchanges'] as const,
  credentials: () => [...exchangeKeys.all, 'credentials'] as const,
  credential: (id: string) => [...exchangeKeys.credentials(), id] as const,
  marketData: () => [...exchangeKeys.all, 'market-data'] as const,
  ticker: (symbol: string) => [...exchangeKeys.marketData(), 'ticker', symbol] as const,
  orderbook: (symbol: string) => [...exchangeKeys.marketData(), 'orderbook', symbol] as const,
};

// Vault related query keys
export const vaultKeys = {
  all: ['vaults'] as const,
  balance: () => [...vaultKeys.all, 'balance'] as const,
  transactions: () => [...vaultKeys.all, 'transactions'] as const,
  transactionList: (filters?: Record<string, any>) => 
    [...vaultKeys.transactions(), filters] as const,
};

// ElizaOS related query keys
export const elizaKeys = {
  all: ['eliza'] as const,
  commands: () => [...elizaKeys.all, 'commands'] as const,
  command: (id: string) => [...elizaKeys.commands(), id] as const,
  knowledge: () => [...elizaKeys.all, 'knowledge'] as const,
  knowledgeItem: (id: string) => [...elizaKeys.knowledge(), id] as const,
  agents: (farmId: string) => [...elizaKeys.all, 'agents', farmId] as const,
  agent: (id: string) => [...elizaKeys.all, 'agent', id] as const,
  insights: (agentId: string) => [...elizaKeys.all, 'insights', agentId] as const,
  performance: (agentId: string, period: string) => [...elizaKeys.all, 'performance', agentId, period] as const,
};

// Dashboard related query keys
export const dashboardKeys = {
  all: ['dashboard'] as const,
  overview: () => [...dashboardKeys.all, 'overview'] as const,
  detail: (farmId: string) => [...dashboardKeys.all, 'detail', farmId] as const,
  performance: (farmId: string) => [...dashboardKeys.all, 'performance', farmId] as const,
  riskMetrics: (farmId: string) => [...dashboardKeys.all, 'risk-metrics', farmId] as const,
  alerts: (farmId: string) => [...dashboardKeys.all, 'alerts', farmId] as const,
};

// Analytics related query keys
export const analyticsKeys = {
  all: ['analytics'] as const,
  summary: (filters?: Record<string, any>) => [...analyticsKeys.all, 'summary', filters] as const,
  performance: (filters?: Record<string, any>) => [...analyticsKeys.all, 'performance', filters] as const,
  tradeDistribution: (filters?: Record<string, any>) => [...analyticsKeys.all, 'trade-distribution', filters] as const,
};

// Strategy related query keys - extended
export const strategyExtendedKeys = {
  ...strategyKeys,
  backtests: (strategyId: string) => [...strategyKeys.detail(strategyId), 'backtests'] as const,
  executions: (strategyId: string) => [...strategyKeys.detail(strategyId), 'executions'] as const,
  performance: (strategyId: string) => [...strategyKeys.detail(strategyId), 'performance'] as const,
};

// Combine all keys for easier export
export const queryKeys = {
  farms: farmKeys,
  agents: agentKeys,
  strategies: strategyExtendedKeys,
  goals: goalKeys,
  positions: positionKeys,
  orders: orderKeys,
  exchanges: exchangeKeys,
  vaults: vaultKeys,
  eliza: elizaKeys,
  dashboard: dashboardKeys,
  analytics: analyticsKeys,
};
