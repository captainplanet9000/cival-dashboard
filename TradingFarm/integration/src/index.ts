/**
 * Trading Farm Dashboard + ElizaOS Integration
 * 
 * This is the main entry point for the integration between the Trading Farm Dashboard
 * and the ElizaOS AI framework. It exports all necessary components, hooks, and services
 * to enable seamless integration between the two systems.
 */

// Core integration utilities
import { initialize, status, connectElizaOS } from './utils/initialization';

// Hooks
import { useAgentSystem } from './hooks/useAgentSystem';
import { useFarmSystem } from './hooks/useFarmSystem';
import { useBankingSystem } from '@/hooks/useBankingSystem';

// Services
import knowledgeService from './services/KnowledgeService';

// Components
import CommandCenter from './components/CommandCenter';

// ElizaOS direct integration
import { elizaOS, useElizaOS } from '@/integrations/elizaos';
import { TRADING_EVENTS, COMMAND_TYPES, MESSAGE_SOURCES } from '@/types/elizaos';

// Database types
import type { Database } from './types/database.types';

/**
 * Initialize the integration between Trading Farm Dashboard and ElizaOS
 * 
 * @param options Configuration options for the integration
 * @returns Promise that resolves when initialization is complete
 */
const initializeIntegration = async (options?: {
  elizaOSServerUrl?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  debugMode?: boolean;
}) => {
  console.log('Initializing Trading Farm + ElizaOS integration...');
  return initialize(options);
};

/**
 * Get the current status of the integration
 * 
 * @returns Object containing status information
 */
const getIntegrationStatus = () => {
  return status();
};

/**
 * Connect directly to ElizaOS
 * 
 * @param serverUrl URL of the ElizaOS server
 * @returns Promise that resolves when connection is established
 */
const connectToElizaOS = async (serverUrl?: string) => {
  return connectElizaOS(serverUrl);
};

// Export all integration components
export {
  // Core integration utilities
  initializeIntegration,
  getIntegrationStatus,
  connectToElizaOS,
  
  // Hooks
  useAgentSystem,
  useFarmSystem,
  useBankingSystem,
  useElizaOS,
  
  // Services
  knowledgeService,
  elizaOS,
  
  // Components
  CommandCenter,
  
  // Constants
  TRADING_EVENTS,
  COMMAND_TYPES,
  MESSAGE_SOURCES,
  
  // Types
  Database
};

// Default export for easier imports
export default {
  initialize: initializeIntegration,
  status: getIntegrationStatus,
  connectElizaOS: connectToElizaOS
};
