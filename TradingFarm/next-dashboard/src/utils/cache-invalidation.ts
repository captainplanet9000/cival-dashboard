import { 
  deleteCache, 
  deleteCacheByPattern, 
  invalidateNamespace as invalidateNamespaceFromRedis, 
  CacheNamespace,
  generateCacheKey
} from '@/services/redis-service';

/**
 * Cache invalidation utility functions
 * These functions should be called whenever data is modified to ensure cache consistency
 */

/**
 * Re-export invalidateNamespace from redis-service
 */
export const invalidateNamespace = invalidateNamespaceFromRedis;

/**
 * Invalidate cache for a specific agent
 */
export const invalidateAgentCache = async (agentId: string): Promise<void> => {
  // Delete specific agent cache
  const cacheKey = generateCacheKey('agent', agentId);
  await deleteCache(cacheKey);
  
  // Delete agent list cache
  await deleteCacheByPattern('trading-farm:agent:list*');
  
  // Delete collaborations related to this agent
  await deleteCacheByPattern(`trading-farm:agent:collaborations:*${agentId}*`);
};

/**
 * Invalidate cache for a specific farm
 */
export const invalidateFarmCache = async (farmId: string): Promise<void> => {
  // Delete specific farm cache
  const cacheKey = generateCacheKey('farm', farmId);
  await deleteCache(cacheKey);
  
  // Delete farm list cache
  await deleteCacheByPattern('trading-farm:farm:list*');
  
  // Also invalidate agents in this farm
  await deleteCacheByPattern(`trading-farm:agent:*farm=${farmId}*`);
};

/**
 * Invalidate cache for a specific goal
 */
export const invalidateGoalCache = async (goalId: string): Promise<void> => {
  // Delete specific goal cache
  const cacheKey = generateCacheKey('goal', goalId);
  await deleteCache(cacheKey);
  
  // Delete goal list cache
  await deleteCacheByPattern('trading-farm:goal:list*');
  
  // Delete goal dependencies cache
  await deleteCacheByPattern(`trading-farm:goal:dependencies:${goalId}*`);
};

/**
 * Invalidate cache for market data
 * @param symbol Optional symbol to invalidate specific market data
 */
export const invalidateMarketDataCache = async (symbol?: string): Promise<void> => {
  if (symbol) {
    await deleteCacheByPattern(`trading-farm:market-data:*${symbol}*`);
  } else {
    await invalidateNamespaceFromRedis('market-data');
  }
};

/**
 * Invalidate cache for a specific order
 */
export const invalidateOrderCache = async (orderId: string): Promise<void> => {
  // Delete specific order cache
  const cacheKey = generateCacheKey('order', orderId);
  await deleteCache(cacheKey);
  
  // Delete order list cache
  await deleteCacheByPattern('trading-farm:order:list*');
  
  // Also invalidate related trade data
  await deleteCacheByPattern('trading-farm:trade:recent*');
};

/**
 * Invalidate cache for a specific strategy
 */
export const invalidateStrategyCache = async (strategyId: string): Promise<void> => {
  // Delete specific strategy cache
  const cacheKey = generateCacheKey('strategy', strategyId);
  await deleteCache(cacheKey);
  
  // Delete strategy list cache
  await deleteCacheByPattern('trading-farm:strategy:list*');
};

/**
 * Invalidate cache for a specific exchange
 */
export const invalidateExchangeCache = async (exchangeId: string): Promise<void> => {
  // Delete specific exchange cache
  const cacheKey = generateCacheKey('exchange', exchangeId);
  await deleteCache(cacheKey);
  
  // Delete exchange list cache
  await deleteCacheByPattern('trading-farm:exchange:list*');
};

/**
 * Invalidate cache for all trading data
 * This should be called when a major change happens that affects multiple entities
 */
export const invalidateAllTradingData = async (): Promise<void> => {
  await invalidateNamespaceFromRedis('order');
  await invalidateNamespaceFromRedis('trade');
  await invalidateNamespaceFromRedis('market-data');
};

/**
 * Invalidate all cache entries for a user
 * This is useful when a user logs out or when user settings change drastically
 */
export const invalidateUserCache = async (userId: string): Promise<void> => {
  const namespaces: CacheNamespace[] = [
    'agent', 'farm', 'market-data', 'exchange', 'goal', 'strategy', 'order', 'trade'
  ];
  
  for (const namespace of namespaces) {
    await deleteCacheByPattern(`trading-farm:${namespace}:*user=${userId}*`);
  }
};
