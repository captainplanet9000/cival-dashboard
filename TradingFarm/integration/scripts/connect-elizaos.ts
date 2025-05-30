/**
 * Connect ElizaOS Script
 * 
 * This utility script establishes a direct connection between the Trading Farm Dashboard
 * and the ElizaOS AI framework, enabling real-time command processing, knowledge management,
 * and multi-agent coordination.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Configuration
const config = {
  elizaos: {
    serverUrl: process.env.ELIZAOS_SERVER_URL || 'ws://localhost:8765',
    connectionTimeout: 10000, // 10 seconds
  },
  supabase: {
    url: process.env.SUPABASE_URL || 'https://your-supabase-project.supabase.co',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
  },
  paths: {
    dashboardSrc: path.resolve(__dirname, '../../trading-farm-dashboard/src'),
    farmsDashboardSrc: path.resolve(__dirname, '../../farms-dashboard/src'),
  }
};

// Create Supabase client
const supabase = createClient<Database>(
  config.supabase.url,
  config.supabase.serviceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Main function to connect ElizaOS with the Trading Farm Dashboard
 */
async function connectElizaOS() {
  console.log('=== Connecting ElizaOS with Trading Farm Dashboard ===');
  
  try {
    // 1. Validate paths and files
    validatePaths();
    
    // 2. Create symlinks between the codebases if needed
    await createSymlinks();
    
    // 3. Copy ElizaOS integration files if needed
    copyElizaOSIntegration();
    
    // 4. Register ElizaOS commands in the database
    await registerElizaOSCommands();
    
    // 5. Update TypeScript definitions
    updateTypeDefinitions();
    
    console.log('=== ElizaOS connection setup completed successfully ===');
  } catch (error) {
    console.error('ElizaOS connection setup failed:', error);
    process.exit(1);
  }
}

/**
 * Validate that all required paths exist
 */
function validatePaths() {
  console.log('Validating paths...');
  
  if (!fs.existsSync(config.paths.dashboardSrc)) {
    throw new Error(`Trading Farm Dashboard source directory not found at ${config.paths.dashboardSrc}`);
  }
  
  if (!fs.existsSync(config.paths.farmsDashboardSrc)) {
    throw new Error(`Farms Dashboard source directory not found at ${config.paths.farmsDashboardSrc}`);
  }
  
  const elizaOSPath = path.join(config.paths.dashboardSrc, 'integrations/elizaos');
  if (!fs.existsSync(elizaOSPath)) {
    throw new Error(`ElizaOS integration not found at ${elizaOSPath}`);
  }
  
  console.log('All paths validated successfully.');
}

/**
 * Create symlinks between the codebases for shared components
 */
async function createSymlinks() {
  console.log('Creating symlinks between codebases...');
  
  // Define symlinks to create
  const symlinks = [
    // Link ElizaOS integration to farms-dashboard
    {
      target: path.join(config.paths.dashboardSrc, 'integrations/elizaos'),
      linkPath: path.join(config.paths.farmsDashboardSrc, 'integrations/elizaos')
    },
    // Link banking components
    {
      target: path.join(config.paths.dashboardSrc, 'components/banking'),
      linkPath: path.join(config.paths.farmsDashboardSrc, 'components/banking')
    }
  ];
  
  // Create each symlink
  for (const link of symlinks) {
    try {
      // Check if link already exists
      if (fs.existsSync(link.linkPath)) {
        const stats = fs.lstatSync(link.linkPath);
        if (stats.isSymbolicLink()) {
          console.log(`Symlink already exists at ${link.linkPath}, skipping...`);
          continue;
        } else {
          console.log(`Path exists but is not a symlink at ${link.linkPath}, backing up...`);
          // Backup existing directory
          const backupPath = `${link.linkPath}_backup_${Date.now()}`;
          fs.renameSync(link.linkPath, backupPath);
        }
      }
      
      // Create parent directory if it doesn't exist
      const parentDir = path.dirname(link.linkPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      
      // Create symlink
      fs.symlinkSync(link.target, link.linkPath, 'junction');
      console.log(`Created symlink: ${link.linkPath} -> ${link.target}`);
    } catch (error) {
      console.error(`Error creating symlink ${link.linkPath}:`, error);
      throw error;
    }
  }
  
  console.log('Symlinks created successfully.');
}

/**
 * Copy ElizaOS integration files if they don't exist
 */
function copyElizaOSIntegration() {
  console.log('Copying ElizaOS integration files...');
  
  const sourceDir = path.join(config.paths.dashboardSrc, 'integrations/elizaos');
  const targetDir = path.join(config.paths.farmsDashboardSrc, 'integrations/elizaos');
  
  // Only copy if symlink creation failed
  if (!fs.existsSync(targetDir)) {
    console.log(`Creating ElizaOS integration directory at ${targetDir}...`);
    fs.mkdirSync(targetDir, { recursive: true });
    
    // Copy all files from source to target
    const files = fs.readdirSync(sourceDir);
    for (const file of files) {
      const sourcePath = path.join(sourceDir, file);
      const targetPath = path.join(targetDir, file);
      
      const fileContents = fs.readFileSync(sourcePath);
      fs.writeFileSync(targetPath, fileContents);
      console.log(`Copied ${sourcePath} to ${targetPath}`);
    }
  } else {
    console.log(`ElizaOS integration directory already exists at ${targetDir}, skipping copy.`);
  }
  
  console.log('ElizaOS integration files set up successfully.');
}

/**
 * Register ElizaOS commands in the database
 */
async function registerElizaOSCommands() {
  console.log('Registering ElizaOS commands in database...');
  
  // Define core ElizaOS commands
  const commands = [
    {
      command: 'get_wallet_balance',
      description: 'Get the current balance of a wallet',
      source: 'ElizaOS',
      target_type: 'wallet'
    },
    {
      command: 'transfer_funds',
      description: 'Transfer funds between wallets',
      source: 'ElizaOS',
      target_type: 'wallet'
    },
    {
      command: 'create_agent',
      description: 'Create a new trading agent',
      source: 'ElizaOS',
      target_type: 'agent'
    },
    {
      command: 'update_agent_strategy',
      description: 'Update the strategy for a trading agent',
      source: 'ElizaOS',
      target_type: 'agent'
    },
    {
      command: 'query_knowledge_base',
      description: 'Query the knowledge base for information',
      source: 'ElizaOS',
      target_type: 'knowledge'
    },
    {
      command: 'execute_trade',
      description: 'Execute a trade on an exchange',
      source: 'ElizaOS',
      target_type: 'exchange'
    },
    {
      command: 'get_market_data',
      description: 'Get current market data for a symbol',
      source: 'ElizaOS',
      target_type: 'market'
    },
    {
      command: 'update_risk_parameters',
      description: 'Update risk management parameters',
      source: 'ElizaOS',
      target_type: 'risk'
    },
    {
      command: 'create_farm',
      description: 'Create a new trading farm',
      source: 'ElizaOS',
      target_type: 'farm'
    },
    {
      command: 'validate_wallet_creation',
      description: 'Validate creation of a new wallet',
      source: 'ElizaOS',
      target_type: 'security'
    },
    {
      command: 'validate_fund_transfer',
      description: 'Validate fund transfer operation',
      source: 'ElizaOS',
      target_type: 'security'
    },
    {
      command: 'validate_cross_farm_transfer',
      description: 'Validate transfer between farms',
      source: 'ElizaOS',
      target_type: 'security'
    },
    {
      command: 'validate_agent_allocation',
      description: 'Validate allocation to an agent',
      source: 'ElizaOS',
      target_type: 'security'
    }
  ];
  
  try {
    // Insert commands into command_history table with status='template'
    for (const cmd of commands) {
      // Check if command template already exists
      const { data, error: selectError } = await supabase
        .from('command_history')
        .select('*')
        .eq('command', cmd.command)
        .eq('status', 'template')
        .limit(1);
      
      if (selectError) {
        throw selectError;
      }
      
      // Skip if command already exists
      if (data && data.length > 0) {
        console.log(`Command template for ${cmd.command} already exists, skipping...`);
        continue;
      }
      
      // Insert command template
      const { error: insertError } = await supabase
        .from('command_history')
        .insert({
          command: cmd.command,
          source: cmd.source,
          target_type: cmd.target_type,
          status: 'template',
          args: { description: cmd.description }
        });
      
      if (insertError) {
        throw insertError;
      }
      
      console.log(`Registered command: ${cmd.command}`);
    }
    
    console.log('ElizaOS commands registered successfully.');
  } catch (error) {
    console.error('Error registering ElizaOS commands:', error);
    throw error;
  }
}

/**
 * Update TypeScript definitions for better type safety
 */
function updateTypeDefinitions() {
  console.log('Updating TypeScript definitions...');
  
  // Path to the ElizaOS events type definitions
  const eventsTypePath = path.join(config.paths.farmsDashboardSrc, 'types/elizaos.ts');
  
  // Create the types directory if it doesn't exist
  const typesDir = path.dirname(eventsTypePath);
  if (!fs.existsSync(typesDir)) {
    fs.mkdirSync(typesDir, { recursive: true });
  }
  
  // Check if the file already exists
  if (fs.existsSync(eventsTypePath)) {
    console.log(`ElizaOS type definitions already exist at ${eventsTypePath}, updating...`);
  }
  
  // Create or update the ElizaOS events type definitions
  const eventsTypeContent = `/**
 * ElizaOS Event Type Definitions
 * Generated by Trading Farm integration script
 */

// Event types for the trading system
export const TRADING_EVENTS = {
  MARKET_UPDATE: 'market_update',
  TRADE_EXECUTED: 'trade_executed',
  PORTFOLIO_UPDATE: 'portfolio_update',
  AGENT_STATUS: 'agent_status',
  KNOWLEDGE_QUERY: 'knowledge_query',
  KNOWLEDGE_RESPONSE: 'knowledge_response',
  COMMAND_RESPONSE: 'command_response',
  SYSTEM_STATUS: 'system_status',
  ERROR: 'error',
  WALLET_UPDATE: 'wallet_update',
  TRANSACTION_UPDATE: 'transaction_update',
  FARM_UPDATE: 'farm_update'
};

// Command types
export const COMMAND_TYPES = {
  QUERY: 'query',
  COMMAND: 'command',
  ANALYSIS: 'analysis',
  ALERT: 'alert'
};

// Message source types
export const MESSAGE_SOURCES = {
  KNOWLEDGE_BASE: 'knowledge-base',
  MARKET_DATA: 'market-data',
  STRATEGY: 'strategy',
  SYSTEM: 'system',
  AGENT: 'agent',
  WALLET: 'wallet',
  TRANSACTION: 'transaction',
  FARM: 'farm'
};

// ElizaOS message interface
export interface ElizaOSMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai' | 'system';
  timestamp: Date;
  type?: string;
  source?: string;
  metadata?: Record<string, any>;
}

// ElizaOS command interface
export interface ElizaOSCommand {
  id: string;
  command: string;
  parameters?: Record<string, any>;
  status: 'pending' | 'executing' | 'completed' | 'error';
  result?: any;
  timestamp: Date;
  error?: string;
}

// ElizaOS connection status
export type ElizaOSConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

// Wallet command parameters
export interface WalletCommandParams {
  wallet_id?: string;
  amount?: number;
  source_id?: string;
  destination_id?: string;
  risk_level?: 'low' | 'medium' | 'high';
}

// Agent command parameters
export interface AgentCommandParams {
  agent_id?: string;
  farm_id?: string;
  model?: string;
  strategy_id?: string;
  config?: Record<string, any>;
}

// Knowledge command parameters
export interface KnowledgeCommandParams {
  query?: string;
  document_id?: string;
  content?: string;
  metadata?: Record<string, any>;
}

// Command handler type
export type CommandHandler = (args: any) => Promise<any> | any;

export interface ElizaOSHook {
  connected: boolean;
  status: ElizaOSConnectionStatus;
  messages: ElizaOSMessage[];
  commands: ElizaOSCommand[];
  sendCommand: (command: string, parameters?: Record<string, any>) => Promise<any>;
  sendMessage: (content: string, type?: string, source?: string) => Promise<void>;
  initialize: (serverUrl?: string) => Promise<boolean>;
  disconnect: () => void;
}
`;
  
  fs.writeFileSync(eventsTypePath, eventsTypeContent);
  console.log(`Updated ElizaOS type definitions at ${eventsTypePath}`);
  
  console.log('TypeScript definitions updated successfully.');
}

// Run if called directly
if (require.main === module) {
  connectElizaOS().catch(console.error);
}

export default connectElizaOS;
