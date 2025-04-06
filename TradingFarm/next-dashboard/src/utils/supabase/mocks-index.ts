/**
 * Mock Data Index
 * Consolidates all mock data modules and provides a unified interface
 */

// Import all mock data sources
import { 
  mockUsers, 
  mockFarms as initialMockFarms, 
  mockVaults, 
  mockVaultTransactions as mockTransactions, 
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
  getAgentById,
  getAgentsByFarmId,
  getAgentActionsByAgentId, 
} from './mocks-agents';

import {
  mockGoals,
  mockTasks,
  mockAgentAssignments as mockAssignments,
  getGoalsByFarmId,
  getTasksByGoalId,
} from './mocks-goals';

import {
  mockOrders,
  mockOrderExecutions,
  getOrdersByFarmId,
  getOrdersByAgentId,
  getOrderExecutionsByOrderId,
  getOrderById,
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

import {
  getApiServiceProviders as importedGetApiServiceProviders,
  getUserApiConfigurations,
  getAgentApiServices,
  getOpenRouterModels
} from './mocks-api';

import { mockUserHandlers } from './mocks-users';
import { mockFarmHandlers } from './mocks-farms';
import { mockAgentHandlers } from './mocks-agents';
import { mockOrderHandlers } from './mocks-orders';
import { mockAuthHandlers } from './mocks-auth';
import { mockAIHandlers } from './mocks-ai';
import { mockApiHandlers } from './mocks-api';
import { mockElizaOSHandlers } from './mocks-elizaos';

// Get farms from the persistent manager
const mockFarms = mockFarmManager.getAllFarms();

// Re-export all imported mock data
export {
  // Base mock data
  mockUsers,
  mockFarms,
  mockVaults,
  mockTransactions,
  
  // Farm manager
  mockFarmManager,
  mockFarmResponse,
  
  // Agent mock data
  mockStandardAgents,
  mockElizaAgents,
  
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
  getAgentActionsByAgentId,
  getGoalsByFarmId,
  getTasksByGoalId,
  getOrdersByFarmId,
  getOrdersByAgentId,
  getOrderExecutionsByOrderId,
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
  getStorageHealthStatus,
  getUserApiConfigurations,
  getAgentApiServices,
  getOpenRouterModels
};

// Create stub functions for missing exports
export function getAgentCapabilitiesByAgentId(agentId: string) {
  return getAgentActionsByAgentId(agentId);
}

export function getAgentConfigurationByAgentId(agentId: string) {
  return { agentId };
}

export function getAgentConversationsByAgentId(agentId: string) {
  return [];
}

export function getAssignmentsByTaskId(taskId: string) {
  return mockAssignments.filter(a => a.goal_id === taskId || a.id.includes(taskId));
}

export function getGoalById(goalId: string) {
  return mockGoals.find(g => g.id === goalId);
}

export function getTaskById(taskId: string) {
  return mockTasks.find(t => t.id === taskId);
}

export function getRecentOrdersByFarmId(farmId: string, limit = 5) {
  return getOrdersByFarmId(farmId).slice(0, limit);
}

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
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate = new Date().toISOString().split('T')[0];
  const performance = getFarmPerformanceByDateRange(farmId, startDate, endDate);
  
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
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate = new Date().toISOString().split('T')[0];
  const performance = getAgentPerformanceByDateRange(agentId, startDate, endDate);
  
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
  // Find the storage entity
  let storageEntity = null;
  
  if (storageType === StorageType.AGENT) {
    storageEntity = getAgentStorageById(storageId);
  } else if (storageType === StorageType.FARM) {
    storageEntity = getFarmStorageById(storageId);
  }
  
  if (!storageEntity) return null;
  
  // Get related data
  const allocations = getStorageAllocationsByStorageId(storageId);
  const transactions = getStorageTransactionsByStorageId(storageId);
  const auditLogs = getStorageAuditLogsByStorageId(storageId);
  const healthStatus = getStorageHealthStatus(storageId);
  
  return {
    storage: storageEntity,
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
  // Lookup the market data
  const market = mockMarkets.find(m => m.id === marketId);
  const marketData = getMarketDataByMarketId(marketId);
  const orderBook = getOrderBookByMarketId(marketId);
  
  // Get recent orders for this market
  const recentOrders = mockOrders.filter(order => {
    // Use 'market' property instead of non-existent 'symbol' 
    return order.market === marketId;
  }).slice(0, 10);
  
  return {
    market,
    marketData,
    orderBook,
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
  const pendingOrders = getOrdersByFarmId(farmId).filter(order => order.status === 'pending');
  const goals = getGoalsByFarmId(farmId);
  const vaults = getVaultsByFarmId(farmId);
  const exchangeConnections = getExchangeConnectionsByFarmId(farmId);
  
  // Get exchange balances for all connections
  const exchangeBalances = exchangeConnections.flatMap(conn => 
    getExchangeBalancesByConnectionId(conn.id)
  );
  
  // Get performance data for the last 30 days
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate = new Date().toISOString().split('T')[0];
  const performance = getFarmPerformanceByDateRange(farmId, startDate, endDate);
  
  // Get risk metrics
  const riskMetrics = getRiskMetricsByFarmId(farmId);
  
  // Get market data for common markets
  const commonMarketIds = ['BTC-USD', 'ETH-USD', 'SOL-USD'];
  const marketData = commonMarketIds.map(id => getMarketDataByMarketId(id)).filter(Boolean);
  
  // Get aggregate performance metrics
  const aggregateMetrics = getAggregateFarmMetrics(farmId);
  
  // Convert string IDs to numbers for array access when needed
  const metrics = {
    trades_count: 123, // Hard-coded value instead of accessing non-existent property
    avg_response_time: 250, // Hard-coded value
    uptime_percentage: 99.97
  };
  
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
    aggregateMetrics,
    metrics
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
      // Convert string IDs to numbers when needed
      const parsedArgs = args.map(arg => {
        if (typeof arg === 'string' && !isNaN(Number(arg))) {
          return Number(arg);
        }
        return arg;
      });
      
      resolve(dataFn(...parsedArgs));
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
  getCompleteStorageData,
  getUserApiConfigurations,
  getAgentApiServices,
  getOpenRouterModels,
};

export { importedGetApiServiceProviders as getApiServiceProviders };

// Export mock data service as default
export default mockDataService;

/**
 * Map of route handlers for mock Supabase
 */
export const mockHandlers: Record<string, (req: Request) => Promise<Response>> = {
  // Auth handlers
  '/auth/v1/token': mockAuthHandlers.createToken,
  '/auth/v1/user': mockAuthHandlers.getUser,
  
  // Resource handlers
  '/rest/v1/users': mockUserHandlers.handleUsers,
  '/rest/v1/farms': mockFarmHandlers.handleFarms,
  '/rest/v1/agents': mockAgentHandlers.handleAgents,
  '/rest/v1/orders': mockOrderHandlers.handleOrders,
  '/rest/v1/trades': mockOrderHandlers.handleTrades,
  '/rest/v1/goals': mockAgentHandlers.handleGoals,
  '/rest/v1/goal_strategies': mockAgentHandlers.handleGoalStrategies,
  '/rest/v1/goal_transactions': mockAgentHandlers.handleGoalTransactions,
  '/rest/v1/goal_monitoring': mockAgentHandlers.handleGoalMonitoring,
  '/rest/v1/eliza_memories': mockElizaOSHandlers.getGoalMemories,
  '/rest/v1/eliza_commands': mockElizaOSHandlers.sendCommand,
  '/rest/v1/eliza_command_responses': mockElizaOSHandlers.getCommandResponse,
  
  // API service handlers
  '/rest/v1/api_services': mockApiHandlers.handleApiServices,
  '/rest/v1/api_service_configs': mockApiHandlers.handleApiServiceConfigs,
  
  // AI handlers
  '/storage/v1/object/ai-models': mockAIHandlers.getModelsList,
  
  // Add any additional mock handlers here
  '/goals/acquisition/coordination': mockElizaOSHandlers.getCoordinationState,
};

/**
 * Get mock response for a given URL
 */
export const getMockResponse = async (url: string, req: Request): Promise<Response> => {
  // Find the closest route handler
  const matchingRoute = Object.keys(mockHandlers).find(route => {
    return url.includes(route);
  });
  
  if (matchingRoute) {
    return mockHandlers[matchingRoute](req);
  }
  
  // Return a 404 if no handler found
  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
};
