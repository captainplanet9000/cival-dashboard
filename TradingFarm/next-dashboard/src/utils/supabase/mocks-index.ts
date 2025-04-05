/**
 * Mock Data Index
 * Consolidates all mock data modules and provides a unified interface
 */

// Import all mock data sources
import { 
  mockUsers, 
  mockFarms as initialMockFarms, 
  mockVaults, 
  mockAccounts, 
  mockTransactions,
  getUserById,
  getVaultsByFarmId,
  getAccountsByVaultId,
  getTransactionsByAccountId
} from './mocks';

// Import new persistent farm manager
import { mockFarmManager, mockFarmResponse } from './mocks-farm';

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

import {
  StorageStatus,
  StorageType,
  mockAgentStorages,
  mockFarmStorages,
  mockStorageAllocations,
  mockStorageTransactions,
  mockStorageAuditLogs,
  getAgentStorageById,
  getFarmStorageById,
  getAgentStoragesByAgentId,
  getFarmStoragesByFarmId,
  getStorageAllocationsByStorageId,
  getStorageAllocationsByAllocatedTo,
  getStorageTransactionsByStorageId,
  getStorageAuditLogsByStorageId,
  getStorageHealthStatus
} from './mocks-storage';

// Get farms from the persistent manager
const mockFarms = mockFarmManager.getAllFarms();

// Re-export all imported mock data
export {
  // Base mock data
  mockUsers,
  mockFarms,
  mockVaults,
  mockAccounts,
  mockTransactions,
  
  // Farm manager
  mockFarmManager,
  mockFarmResponse,
  
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
  
  // Storage mock data
  StorageStatus,
  StorageType,
  mockAgentStorages,
  mockFarmStorages,
  mockStorageAllocations, 
  mockStorageTransactions,
  mockStorageAuditLogs,
  
  // Helper functions from individual modules
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
  getAggregateFeedbackRatings,
  getAgentStorageById,
  getFarmStorageById,
  getAgentStoragesByAgentId,
  getFarmStoragesByFarmId,
  getStorageAllocationsByStorageId,
  getStorageAllocationsByAllocatedTo,
  getStorageTransactionsByStorageId,
  getStorageAuditLogsByStorageId,
  getStorageHealthStatus
};

// Integrated helper functions that combine data from multiple mock sources

// Get complete farm data including all related entities
export function getCompleteFarmData(farmId: string) {
  // Use the persistent farm manager instead of the static mock data
  const farm = mockFarmManager.getFarmById(farmId);
  if (!farm) return null;
  
  // Get all related data
  const agents = getAgentsByFarmId(farmId);
  const goals = getGoalsByFarmId(farmId);
  const vaults = getVaultsByFarmId(farmId);
  const orders = getOrdersByFarmId(farmId);
  const exchangeConnections = getExchangeConnectionsByFarmId(farmId);
  
  // Get performance data for the last 30 days
  const performance = getFarmPerformanceByDateRange(
    farmId,
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    new Date().toISOString().split('T')[0]
  );
  
  // Get risk metrics
  const riskMetrics = getRiskMetricsByFarmId(farmId);
  
  // Get storage data
  const storage = getFarmStoragesByFarmId(farmId);
  
  return {
    farm,
    agents,
    goals,
    vaults,
    orders,
    exchangeConnections,
    performance,
    riskMetrics,
    storage
  };
}

// Get complete agent data including all related entities
export function getCompleteAgentData(agentId: string) {
  const agent = getAgentById(agentId);
  if (!agent) return null;
  
  // Get farm data (using persistent farm manager)
  const farm = agent.farm_id ? mockFarmManager.getFarmById(agent.farm_id) : null;
  
  // Get all related data
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
  
  // Get goals that this agent is assigned to
  const goals = mockGoals.filter(goal => 
    mockAssignments.some(
      assignment => assignment.goal_id === goal.id && assignment.agent_id === agentId
    )
  );
  
  // Get storage data
  const storage = getAgentStoragesByAgentId(agentId);
  
  return {
    agent,
    farm,
    capabilities,
    configuration,
    conversations,
    orders,
    performance,
    goals,
    storage
  };
}

// Get complete storage data for a specific entity
export function getCompleteStorageData(storageId: string, storageType: StorageType) {
  // Get base storage data based on type
  const storage = storageType === StorageType.AGENT
    ? getAgentStorageById(storageId)
    : getFarmStorageById(storageId);
  
  if (!storage) return null;
  
  // Get related data
  const allocations = getStorageAllocationsByStorageId(storageId);
  const transactions = getStorageTransactionsByStorageId(storageId);
  const auditLogs = getStorageAuditLogsByStorageId(storageId);
  const healthStatus = getStorageHealthStatus(storageId);
  
  return {
    storage,
    allocations,
    transactions,
    auditLogs,
    healthStatus
  };
}

// Get complete vault data including accounts and transactions
export function getCompleteVaultData(vaultId: string) {
  const vault = mockVaults.find(v => v.id.toString() === vaultId);
  if (!vault) return null;
  
  // Get farm data (using persistent farm manager)
  const farm = vault.farm_id ? mockFarmManager.getFarmById(vault.farm_id) : null;
  
  // Get accounts and transactions
  const accounts = getAccountsByVaultId(vault.id);
  const transactions = accounts.flatMap(account => 
    getTransactionsByAccountId(account.id)
  );
  
  return {
    vault,
    farm,
    accounts,
    transactions
  };
}

// Get complete exchange connection data including balances
export function getCompleteExchangeData(connectionId: string) {
  const connection = mockExchangeConnections.find(conn => conn.id === connectionId);
  if (!connection) return null;
  
  // Get farm data (using persistent farm manager)
  const farm = connection.farm_id ? mockFarmManager.getFarmById(connection.farm_id) : null;
  
  // Get balances
  const balances = getExchangeBalancesByConnectionId(connectionId);
  
  // Get fee structure
  const feeStructure = getExchangeFeeStructure(connection.exchange);
  
  return {
    connection,
    farm,
    balances,
    feeStructure
  };
}

// Get complete goal data including tasks and assignments
export function getCompleteGoalData(goalId: string) {
  const goal = getGoalById(goalId);
  if (!goal) return null;
  
  // Get farm data (using persistent farm manager)
  const farm = goal.farm_id ? mockFarmManager.getFarmById(goal.farm_id) : null;
  
  // Get tasks
  const tasks = getTasksByGoalId(goalId);
  
  // Get assignments for all tasks
  const assignments = tasks.flatMap(task => 
    getAssignmentsByTaskId(task.id)
  );
  
  // Get agents assigned to this goal
  const agentIds = assignments.map(assignment => assignment.agent_id);
  const agents = agentIds.map(agentId => getAgentById(agentId)).filter(Boolean);
  
  return {
    goal,
    farm,
    tasks,
    assignments,
    agents
  };
}

// Get complete market data including order book and market statistics
export function getCompleteMarketData(marketId: string) {
  const market = mockMarkets.find(m => m.id === marketId);
  if (!market) return null;
  
  // Get order book
  const orderBook = getOrderBookByMarketId(marketId);
  
  // Get market data
  const marketData = getMarketDataByMarketId(marketId);
  
  // Get recent orders for this market
  const recentOrders = mockOrders
    .filter(order => order.symbol === marketId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);
  
  return {
    market,
    orderBook,
    marketData,
    recentOrders
  };
}

// Get complete dashboard data for a farm
export function getDashboardData(farmId: string) {
  // Use the persistent farm manager instead of the static mock data
  const farm = mockFarmManager.getFarmById(farmId);
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
  
  // Farms - Use the persistent farm manager
  getFarm: (farmId: string) => mockFarmManager.getFarmById(farmId),
  getFarms: () => mockFarmManager.getAllFarms(),
  createFarm: (farmData: any) => mockFarmManager.createFarm(farmData),
  updateFarm: (id: string, farmData: any) => mockFarmManager.updateFarm(id, farmData),
  deleteFarm: (id: string) => mockFarmManager.deleteFarm(id),
  
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
  getDashboardData,
  getCompleteStorageData
};

// Export mock data service as default
export default mockDataService;
