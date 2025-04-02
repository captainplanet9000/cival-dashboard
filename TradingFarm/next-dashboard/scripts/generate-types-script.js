/**
 * Script to generate TypeScript types from the Supabase database
 * Run this after applying migrations to keep types in sync
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Directory to save generated types
const TYPES_DIR = path.resolve(__dirname, '../src/types');

// Make sure the types directory exists
if (!fs.existsSync(TYPES_DIR)) {
  fs.mkdirSync(TYPES_DIR, { recursive: true });
}

// Output path for the TypeScript types
const TYPES_FILE = path.join(TYPES_DIR, 'database.types.ts');

console.log('🔄 Generating TypeScript types from Supabase...');

try {
  // Try using local Supabase instance first
  try {
    execSync('npx supabase gen types typescript --local > ' + TYPES_FILE, { stdio: 'inherit' });
    console.log('✅ Types generated successfully using local Supabase instance');
  } catch (localError) {
    console.log('⚠️ Could not connect to local Supabase instance. Trying remote connection...');
    
    // If local fails, try using the project URL directly (requires SUPABASE_ACCESS_TOKEN env var)
    try {
      execSync('npx supabase gen types typescript --project-id bgvlzvswzpfoywfxehis > ' + TYPES_FILE, 
        { stdio: 'inherit' });
      console.log('✅ Types generated successfully using remote Supabase instance');
    } catch (remoteError) {
      // If both methods fail, provide instructions for manual setup
      console.error('❌ Could not generate types using CLI. Please ensure you have the SUPABASE_ACCESS_TOKEN set.');
      console.log('\nManual setup:');
      console.log('1. Run: npx supabase login');
      console.log('2. Run: npx supabase gen types typescript --project-id bgvlzvswzpfoywfxehis > src/types/database.types.ts');
      throw new Error('Type generation failed');
    }
  }
  
  // Format the generated file
  console.log('🔄 Formatting types file...');
  try {
    execSync(`npx prettier --write ${TYPES_FILE}`, { stdio: 'inherit' });
    console.log('✅ Types file formatted successfully');
  } catch (formatError) {
    console.log('⚠️ Could not format types file. This is non-critical.');
  }
  
  // Generate helper interfaces
  console.log('🔄 Generating ElizaOS helper types...');
  
  const HELPERS_FILE = path.join(TYPES_DIR, 'eliza-helpers.ts');
  
  fs.writeFileSync(HELPERS_FILE, `/**
 * Helper types for ElizaOS integration
 * Auto-generated from the database schema
 */
import { Database } from './database.types';

// Agent Commands
export type AgentCommand = Database['public']['Tables']['agent_commands']['Row'];
export type AgentCommandInsert = Database['public']['Tables']['agent_commands']['Insert'];
export type AgentCommandUpdate = Database['public']['Tables']['agent_commands']['Update'];

// Agent Responses
export type AgentResponse = Database['public']['Tables']['agent_responses']['Row'];
export type AgentResponseInsert = Database['public']['Tables']['agent_responses']['Insert'];
export type AgentResponseUpdate = Database['public']['Tables']['agent_responses']['Update'];

// Knowledge Base
export type KnowledgeBase = Database['public']['Tables']['knowledge_base']['Row'];
export type KnowledgeBaseInsert = Database['public']['Tables']['knowledge_base']['Insert'];
export type KnowledgeBaseUpdate = Database['public']['Tables']['knowledge_base']['Update'];

// Enum types
export type CommandType = 'execute_order' | 'analyze_market' | 'manage_risk' | 'custom';
export type CommandStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ResponseType = 'order_execution' | 'market_analysis' | 'risk_assessment' | 'custom';
export type ResponseStatus = 'pending' | 'completed' | 'failed';

// Extended types with specific context shapes
export interface OrderExecutionCommand extends AgentCommand {
  command_type: 'execute_order';
  context: {
    order_id: number;
    order_type: string;
    side: string;
    quantity: number;
    symbol: string;
    exchange: string;
    price?: number;
    status: string;
    metadata?: Record<string, any>;
  };
}

export interface OrderExecutionResponse extends AgentResponse {
  response_type: 'order_execution';
  context: {
    order_id: number;
    exchange_order_id: string;
    execution_price?: number;
    execution_quantity?: number;
    execution_timestamp?: string;
    execution_status: string;
    message?: string;
  };
}

// Utility type guards
export function isOrderExecutionCommand(command: AgentCommand): command is OrderExecutionCommand {
  return command.command_type === 'execute_order';
}

export function isOrderExecutionResponse(response: AgentResponse): response is OrderExecutionResponse {
  return response.response_type === 'order_execution';
}
`);
  
  console.log('✅ Helper types created successfully');
  console.log('\n🎉 Type generation complete!');
  
} catch (error) {
  console.error('❌ Error generating types:', error.message);
  process.exit(1);
}
