/**
 * Mock Data Index
 * Consolidates all mock data modules and provides a unified interface
 */

// Import all mock data sources
import { 
  mockUsers, 
  mockFarms, 
  mockVaults, 
  mockAccounts, 
  mockTransactions,
  getFarmById,
  getUserById,
  getVaultsByFarmId,
  getAccountsByVaultId,
  getTransactionsByAccountId
} from './mocks';

import {
  mockStandardAgents,
  mockElizaAgents,
  mockAgentCapabilities,
  mockAgentConfigurations,
  mockAgentConversations,
  getAgentById,
  getAgentsByFarmId,
  getAgentCapabilitiesByAgentId,
  getAgentConfigurationByAgentId,
  getAgentConversationsByAgentId
} from './mocks-agents';

import {
  mockGoals,
  mockTasks,
  mockAssignments,
  getGoalsByFarmId,
  getTasksByGoalId,
  getAssignmentsByTaskId,
  getGoalById,
  getTaskById
} from './mocks-goals';

import {
  mockOrders,
  mockOrderExecutions,
  getOrdersByFarmId,
  getOrdersByAgentId,
  getOrderExecutionsByOrderId,
  getOrderById,
  getRecentOrdersByFarmId,
  getPendingOrdersByFarmId
} from './mocks-orders';

import {
  mockExchangeConnections,
  mockExchangeBalances,
  mockMarkets,
  mockMarketData,
  mockOrderBooks,
  mockExchangeFees,
  getExchangeConnectionsByFarmId,
  getExchangeBalancesByConnectionId,
  getOrderBookByMarketId,
  getMarketDataByMarketId,
  getAllMarkets,
  getTestnetConnections,
  getExchangeFeeStructure
} from './mocks-exchanges';

import {
  mockFarmPerformance,
  mockAgentPerformance,
  mockStrategyPerformance,
  mockRiskMetrics,
  getFarmPerformanceByDateRange,
  getAgentPerformanceByDateRange,
  getRiskMetricsByFarmId,
  getStrategyPerformanceById,
  getStrategyPerformanceByMarket,
  getAggregateFarmMetrics
} from './mocks-performance';

import {
  mockUserActivity,
  mockFeatureUsage,
  mockSystemMetrics,
  mockAdoptionFunnel,
  mockUserFeedback,
  getUserActivityByDateRange,
  getFeatureUsageById,
  getFeatureUsageRanking,
  getSystemMetricsByDateRange,
  getAdoptionFunnelData,
  getUserFeedbackByFeature,
  getAggregateFeedbackRatings
} from './mocks-analytics';

// Re-export all imported mock data
export {
  // Base mock data
  mockUsers,
  mockFarms,
  mockVaults,
  mockAccounts,
  mockTransactions,
  
  // Agent mock data
  mockStandardAgents,
  mockElizaAgents,
  mockAgentCapabilities,
  mockAgentConfigurations,
  mockAgentConversations,
  
  // Goal mock data
  mockGoals,
  mockTasks,
  mockAssignments,
  
  // Order mock data
  mockOrders,
  mockOrderExecutions,
  
  // Exchange mock data
  mockExchangeConnections,
  mockExchangeBalances,
  mockMarkets,
  mockMarketData,
  mockOrderBooks,
  mockExchangeFees,
  
  // Performance mock data
  mockFarmPerformance,
  mockAgentPerformance,
  mockStrategyPerformance,
  mockRiskMetrics,
  
  // Analytics mock data
  mockUserActivity,
  mockFeatureUsage,
  mockSystemMetrics,
  mockAdoptionFunnel,
  mockUserFeedback,
  
  // Helper functions from individual modules
  getFarmById,
  getUserById,
  getVaultsByFarmId,
  getAccountsByVaultId,
  getTransactionsByAccountId,
  getAgentById,
  getAgentsByFarmId,
  getAgentCapabilitiesByAgentId,
  getAgentConfigurationByAgentId,
  getAgentConversationsByAgentId,
  getGoalsByFarmId,
  getTasksByGoalId,
  getAssignmentsByTaskId,
  getGoalById,
  getTaskById,
  getOrdersByFarmId,
  getOrdersByAgentId,
  getOrderExecutionsByOrderId,
  getOrderById,
  getRecentOrdersByFarmId,
  getPendingOrdersByFarmId,
  getExchangeConnectionsByFarmId,
  getExchangeBalancesByConnectionId,
  getOrderBookByMarketId,
  getMarketDataByMarketId,
  getAllMarkets,
  getTestnetConnections,
  getExchangeFeeStructure,
  getFarmPerformanceByDateRange,
  getAgentPerformanceByDateRange,
  getRiskMetricsByFarmId,
  getStrategyPerformanceById,
  getStrategyPerformanceByMarket,
  getAggregateFarmMetrics,
  getUserActivityByDateRange,
  getFeatureUsageById,
  getFeatureUsageRanking,
  getSystemMetricsByDateRange,
  getAdoptionFunnelData,
  getUserFeedbackByFeature,
  getAggregateFeedbackRatings
};

// Integrated helper functions that combine data from multiple mock sources

/**
 * Get complete farm data including all related entities
 */
export function getCompleteFarmData(farmId: string) {
  const farm = getFarmById(farmId);
  if (!farm) return null;
  
  const agents = getAgentsByFarmId(farmId);
  const goals = getGoalsByFarmId(farmId);
  const vaults = getVaultsByFarmId(farmId);
  const orders = getOrdersByFarmId(farmId);
  const exchangeConnections = getExchangeConnectionsByFarmId(farmId);
  const performance = getFarmPerformanceByDateRange(
    farmId, 
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 
    new Date().toISOString().split('T')[0]
  );
  const riskMetrics = getRiskMetricsByFarmId(farmId);
  
  return {
    farm,
    agents,
    goals,
    vaults,
    orders,
    exchangeConnections,
    performance,
    riskMetrics
  };
}

/**
 * Get complete agent data including all related entities
 */
export function getCompleteAgentData(agentId: string) {
  // Handle both standard and ElizaOS agents
  const standardAgent = mockStandardAgents.find(a => a.id === agentId);
  const elizaAgent = mockElizaAgents.find(a => a.id === agentId);
  const agent = standardAgent || elizaAgent;
  
  if (!agent) return null;
  
  const capabilities = getAgentCapabilitiesByAgentId(agentId);
  const configuration = getAgentConfigurationByAgentId(agentId);
  const conversations = getAgentConversationsByAgentId(agentId);
  const orders = getOrdersByAgentId(agentId);
  
  // Get performance data for the last 30 days
  const performance = getAgentPerformanceByDateRange(
    agentId,
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    new Date().toISOString().split('T')[0]
  );
  
  // For standard agents, get strategy performance if available
  let strategyPerformance = null;
  if (standardAgent && configuration?.strategy_id) {
    strategyPerformance = getStrategyPerformanceById(configuration.strategy_id);
  }
  
  return {
    agent,
    capabilities,
    configuration,
    conversations,
    orders,
    performance,
    strategyPerformance
  };
}

/**
 * Get complete vault data including accounts and transactions
 */
export function getCompleteVaultData(vaultId: string) {
  const vault = mockVaults.find(v => v.id === vaultId);
  if (!vault) return null;
  
  const accounts = getAccountsByVaultId(vaultId);
  
  // Get transactions for all accounts in the vault
  const transactions = accounts.flatMap(account => 
    getTransactionsByAccountId(account.id)
  );
  
  return {
    vault,
    accounts,
    transactions
  };
}

/**
 * Get complete exchange connection data including balances
 */
export function getCompleteExchangeData(connectionId: string) {
  const connection = mockExchangeConnections.find(c => c.id === connectionId);
  if (!connection) return null;
  
  const balances = getExchangeBalancesByConnectionId(connectionId);
  const feeStructure = getExchangeFeeStructure(connection.exchange);
  
  return {
    connection,
    balances,
    feeStructure
  };
}

/**
 * Get complete goal data including tasks and assignments
 */
export function getCompleteGoalData(goalId: string) {
  const goal = getGoalById(goalId);
  if (!goal) return null;
  
  const tasks = getTasksByGoalId(goalId);
  
  // Get assignments for all tasks in the goal
  const assignments = tasks.flatMap(task => 
    getAssignmentsByTaskId(task.id)
  );
  
  // Get assigned agents
  const assignedAgentIds = Array.from(new Set(assignments.map(a => a.agent_id)));
  const assignedAgents = assignedAgentIds.map(id => getAgentById(id)).filter(Boolean);
  
  return {
    goal,
    tasks,
    assignments,
    assignedAgents
  };
}

/**
 * Get complete market data including order book and market statistics
 */
export function getCompleteMarketData(marketId: string) {
  const market = mockMarkets.find(m => m.id === marketId);
  if (!market) return null;
  
  const marketData = getMarketDataByMarketId(marketId);
  const orderBook = getOrderBookByMarketId(marketId);
  
  return {
    market,
    marketData,
    orderBook
  };
}

/**
 * Get complete dashboard data for a farm
 */
export function getDashboardData(farmId: string) {
  const farm = getFarmById(farmId);
  if (!farm) return null;
  
  // Get core farm data
  const agents = getAgentsByFarmId(farmId);
  const recentOrders = getRecentOrdersByFarmId(farmId, 10);
  const pendingOrders = getPendingOrdersByFarmId(farmId);
  const goals = getGoalsByFarmId(farmId);
  const vaults = getVaultsByFarmId(farmId);
  const exchangeConnections = getExchangeConnectionsByFarmId(farmId);
  
  // Get exchange balances for all connections
  const exchangeBalances = exchangeConnections.flatMap(conn => 
    getExchangeBalancesByConnectionId(conn.id)
  );
  
  // Get performance data for the last 30 days
  const performance = getFarmPerformanceByDateRange(
    farmId,
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    new Date().toISOString().split('T')[0]
  );
  
  // Get risk metrics
  const riskMetrics = getRiskMetricsByFarmId(farmId);
  
  // Get market data for common markets
  const commonMarketIds = ['BTC-USD', 'ETH-USD', 'SOL-USD'];
  const marketData = commonMarketIds.map(id => getMarketDataByMarketId(id)).filter(Boolean);
  
  // Get aggregate performance metrics
  const aggregateMetrics = getAggregateFarmMetrics(farmId);
  
  return {
    farm,
    agents,
    recentOrders,
    pendingOrders,
    goals,
    vaults,
    exchangeConnections,
    exchangeBalances,
    performance,
    riskMetrics,
    marketData,
    aggregateMetrics
  };
}

/**
 * Mock implementation of data fetching with delay simulation
 * to better simulate real API behavior
 */
export async function fetchMockData(dataFn: Function, ...args: any[]) {
  // Random delay between 100-300ms
  const delay = Math.random() * 200 + 100;
  
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(dataFn(...args));
    }, delay);
  });
}

/**
 * Unified mock data interface for use in components
 */
export const mockDataService = {
  // User and authentication
  getUser: (userId: string) => getUserById(userId),
  getCurrentUser: () => getUserById('mock-user-1'),
  
  // Farms
  getFarm: (farmId: string) => getFarmById(farmId),
  getFarms: () => mockFarms,
  
  // Agents
  getAgent: (agentId: string) => getAgentById(agentId),
  getAgentsByFarm: (farmId: string) => getAgentsByFarmId(farmId),
  getStandardAgents: () => mockStandardAgents,
  getElizaAgents: () => mockElizaAgents,
  
  // Goals
  getGoal: (goalId: string) => getGoalById(goalId),
  getGoalsByFarm: (farmId: string) => getGoalsByFarmId(farmId),
  
  // Orders
  getOrder: (orderId: string) => getOrderById(orderId),
  getOrdersByFarm: (farmId: string) => getOrdersByFarmId(farmId),
  getOrdersByAgent: (agentId: string) => getOrdersByAgentId(agentId),
  
  // Exchanges
  getExchangeConnections: (farmId: string) => getExchangeConnectionsByFarmId(farmId),
  getExchangeBalances: (connectionId: string) => getExchangeBalancesByConnectionId(connectionId),
  getMarkets: () => getAllMarkets(),
  getMarketData: (marketId: string) => getMarketDataByMarketId(marketId),
  getOrderBook: (marketId: string) => getOrderBookByMarketId(marketId),
  
  // Vaults
  getVaultsByFarm: (farmId: string) => getVaultsByFarmId(farmId),
  getAccountsByVault: (vaultId: string) => getAccountsByVaultId(vaultId),
  getTransactionsByAccount: (accountId: string) => getTransactionsByAccountId(accountId),
  
  // Performance and Analytics
  getFarmPerformance: (farmId: string, startDate: string, endDate: string) => 
    getFarmPerformanceByDateRange(farmId, startDate, endDate),
  getAgentPerformance: (agentId: string, startDate: string, endDate: string) => 
    getAgentPerformanceByDateRange(agentId, startDate, endDate),
  getRiskMetrics: (farmId: string) => getRiskMetricsByFarmId(farmId),
  
  // Comprehensive data retrieval
  getCompleteFarmData,
  getCompleteAgentData,
  getCompleteVaultData,
  getCompleteExchangeData,
  getCompleteGoalData,
  getCompleteMarketData,
  getDashboardData
};

// Export mock data service as default
export default mockDataService;
