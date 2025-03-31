/**
 * Initialization Utilities for Trading Farm + ElizaOS Integration
 * 
 * These utilities handle the initialization process for connecting the Trading Farm Dashboard
 * with the ElizaOS AI framework, managing database connections, and registering event handlers.
 */

import { createBrowserClient } from '@/utils/supabase/client';
import { elizaOS } from '@/integrations/elizaos';
import { TRADING_EVENTS } from '@/types/elizaos';
import { Database } from '../types/database.types';

// Integration status tracking
let _initialized = false;
let _elizaConnected = false;
let _databaseConnected = false;
let _debugMode = false;

// Status information
export interface IntegrationStatus {
  initialized: boolean;
  elizaConnected: boolean;
  databaseConnected: boolean;
  lastInitialized: Date | null;
  debugMode: boolean;
}

// Configuration options
export interface IntegrationOptions {
  elizaOSServerUrl?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  debugMode?: boolean;
}

// Store the initialization timestamp
let _lastInitialized: Date | null = null;

/**
 * Initialize the integration between Trading Farm Dashboard and ElizaOS
 */
export const initialize = async (options?: IntegrationOptions): Promise<boolean> => {
  try {
    _debugMode = options?.debugMode || false;
    
    if (_debugMode) {
      console.log('Initializing in debug mode');
    }
    
    // 1. Initialize ElizaOS connection
    const elizaConnected = await connectElizaOS(options?.elizaOSServerUrl);
    _elizaConnected = elizaConnected;
    
    if (!elizaConnected) {
      console.warn('Failed to connect to ElizaOS, some features may be limited');
    }
    
    // 2. Initialize database connection
    const supabase = createBrowserClient({
      supabaseUrl: options?.supabaseUrl,
      supabaseAnonKey: options?.supabaseAnonKey
    });
    
    // Verify database connection
    try {
      const { data, error } = await supabase.from('master_wallets').select('id').limit(1);
      
      if (error) {
        throw error;
      }
      
      _databaseConnected = true;
      
      if (_debugMode) {
        console.log('Database connection successful');
      }
    } catch (error) {
      console.error('Database connection failed:', error);
      _databaseConnected = false;
    }
    
    // 3. Set up event listeners for ElizaOS events
    if (elizaConnected) {
      registerElizaEventHandlers();
    }
    
    // 4. Register dashboard commands with ElizaOS
    if (elizaConnected) {
      registerDashboardCommands();
    }
    
    // Initialization complete
    _initialized = true;
    _lastInitialized = new Date();
    
    if (_debugMode) {
      console.log('Integration initialization complete', status());
    }
    
    return true;
  } catch (error) {
    console.error('Failed to initialize integration:', error);
    return false;
  }
};

/**
 * Connect to the ElizaOS server
 */
export const connectElizaOS = async (serverUrl?: string): Promise<boolean> => {
  try {
    const connected = await elizaOS.initialize(serverUrl);
    _elizaConnected = connected;
    
    if (_debugMode) {
      console.log(`ElizaOS connection ${connected ? 'successful' : 'failed'}`);
    }
    
    return connected;
  } catch (error) {
    console.error('Error connecting to ElizaOS:', error);
    _elizaConnected = false;
    return false;
  }
};

/**
 * Register event handlers for ElizaOS events
 */
const registerElizaEventHandlers = () => {
  if (_debugMode) {
    console.log('Registering ElizaOS event handlers');
  }
  
  // Listen for market updates
  elizaOS.addEventListener('message', (message: any) => {
    if (message.type === TRADING_EVENTS.MARKET_UPDATE) {
      // Handle market updates
      if (_debugMode) {
        console.log('Market update received:', message);
      }
    }
  });
  
  // Listen for trade execution events
  elizaOS.addEventListener('message', (message: any) => {
    if (message.type === TRADING_EVENTS.TRADE_EXECUTED) {
      // Handle trade execution
      if (_debugMode) {
        console.log('Trade executed:', message);
      }
    }
  });
  
  // Listen for wallet updates
  elizaOS.addEventListener('message', (message: any) => {
    if (message.type === TRADING_EVENTS.WALLET_UPDATE) {
      // Handle wallet updates
      if (_debugMode) {
        console.log('Wallet update received:', message);
      }
    }
  });
  
  // Listen for agent status changes
  elizaOS.addEventListener('message', (message: any) => {
    if (message.type === TRADING_EVENTS.AGENT_STATUS) {
      // Handle agent status changes
      if (_debugMode) {
        console.log('Agent status update received:', message);
      }
    }
  });
};

/**
 * Register dashboard-specific commands with ElizaOS
 */
const registerDashboardCommands = () => {
  if (_debugMode) {
    console.log('Registering dashboard commands with ElizaOS');
  }
  
  // Define command handlers for ElizaOS to call
  const commandHandlers: Record<string, (args: any) => any> = {
    // Banking commands
    'update_wallet_balance': (args: any) => {
      if (_debugMode) {
        console.log('Updating wallet balance:', args);
      }
      // Update wallet balance in UI
      return { success: true };
    },
    
    'process_transaction': (args: any) => {
      if (_debugMode) {
        console.log('Processing transaction:', args);
      }
      // Process transaction in UI
      return { success: true };
    },
    
    // Agent commands
    'update_agent_status': (args: any) => {
      if (_debugMode) {
        console.log('Updating agent status:', args);
      }
      // Update agent status in UI
      return { success: true };
    },
    
    // Farm commands
    'update_farm_metrics': (args: any) => {
      if (_debugMode) {
        console.log('Updating farm metrics:', args);
      }
      // Update farm metrics in UI
      return { success: true };
    },
    
    // Knowledge commands
    'update_knowledge_base': (args: any) => {
      if (_debugMode) {
        console.log('Updating knowledge base:', args);
      }
      // Update knowledge base UI
      return { success: true };
    }
  };
  
  // Register commands with ElizaOS
  Object.entries(commandHandlers).forEach(([command, handler]) => {
    elizaOS.registerCommandHandler(command, handler);
  });
};

/**
 * Get the current status of the integration
 */
export const status = (): IntegrationStatus => {
  return {
    initialized: _initialized,
    elizaConnected: _elizaConnected,
    databaseConnected: _databaseConnected,
    lastInitialized: _lastInitialized,
    debugMode: _debugMode
  };
};
