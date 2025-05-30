/**
 * Trading Farm Memory System Exports
 * 
 * This module provides exports for the Trading Farm memory system components,
 * which integrate with Cognee.ai for agent memory and Graphiti for knowledge graphs.
 */

// Export the core interfaces and types
export * from './cognee-client';
export * from './graphiti-client';
export * from './trading-farm-memory';

// Export singleton instance getters
export { getCogneeClient } from './cognee-client';
export { getGraphitiClient } from './graphiti-client';
export { getTradingFarmMemory } from './trading-farm-memory';
