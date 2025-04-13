// ElizaOS interaction types
import { Database } from './database.types';
import { z } from 'zod';

// Define additional tables extending the Database type
export type ExtendedDatabase = Database & {
  public: {
    Tables: {
      elizaos_interactions: {
        Row: {
          id: string;
          farm_id: string;
          command: string;
          response: string;
          category: string;
          source: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          farm_id: string;
          command: string;
          response: string;
          category: string;
          source: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          farm_id?: string;
          command?: string;
          response?: string;
          category?: string;
          source?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "elizaos_interactions_farm_id_fkey";
            columns: ["farm_id"];
            referencedRelation: "farms";
            referencedColumns: ["id"];
          }
        ];
      };
      elizaos_agents: {
        Row: {
          id: string;
          name: string;
          farm_id: number;
          status: string;
          config: Record<string, any>;
          performance: Record<string, any> | null;
          commands_processed: number | null;
          knowledge_base: Record<string, any> | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          farm_id: number;
          status?: string;
          config?: Record<string, any>;
          performance?: Record<string, any> | null;
          commands_processed?: number | null;
          knowledge_base?: Record<string, any> | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          farm_id?: number;
          status?: string;
          config?: Record<string, any>;
          performance?: Record<string, any> | null;
          commands_processed?: number | null;
          knowledge_base?: Record<string, any> | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "elizaos_agents_farm_id_fkey";
            columns: ["farm_id"];
            referencedRelation: "farms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "elizaos_agents_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    } & Database['public']['Tables'];
    Views: Database['public']['Views'];
    Functions: Database['public']['Functions'];
    Enums: Database['public']['Enums'];
    CompositeTypes: Database['public']['CompositeTypes'];
  };
};

// Message types for the command console
export type MessageCategory = 
  | 'command'      // User input/commands
  | 'query'        // Information requests
  | 'analysis'     // AI analysis of data
  | 'alert'        // System alerts/notifications
  | 'response'     // AI responses
  | 'knowledge'    // Knowledge base information
  | 'system';      // System messages

export type MessageSource = 
  | 'knowledge-base' // Information from stored knowledge
  | 'market-data'    // Market information
  | 'strategy'       // Trading strategy information
  | 'system'         // General system information
  | 'user';          // User-generated content

export interface ConsoleMessage {
  id: string;
  content: string;
  timestamp: string;
  isUser: boolean;
  category: MessageCategory;
  source: MessageSource;
  sender?: string;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  metadata?: any;
  references?: {
    title: string;
    url: string;
  }[];
}

export interface ElizaCommandResponse {
  id: string;
  command: string;
  response: string;
  timestamp: string;
  category: MessageCategory;
  source: MessageSource;
  metadata?: any;
}

// Agent types and schemas
export type AgentStatus = 
  | 'initializing'
  | 'idle'
  | 'busy'
  | 'error'
  | 'offline'
  | 'learning'
  | 'analyzing'
  | 'trading'
  | 'coordinating';

export type RiskLevel = 'low' | 'medium' | 'high';

export type TradingPermission = 'read' | 'write' | 'execute';

// Agent config schema
export const agentConfigSchema = z.object({
  agentType: z.string(),
  markets: z.array(z.string()),
  risk_level: z.enum(['low', 'medium', 'high']),
  api_access: z.boolean().optional().default(false),
  trading_permissions: z.string().optional().default('read'),
  auto_recovery: z.boolean().optional().default(true),
  max_concurrent_tasks: z.number().optional(),
  llm_model: z.string().optional().default('gpt-4o'),
});

// Full agent schema
export const elizaAgentSchema = z.object({
  name: z.string().min(3),
  farmId: z.number(),
  config: agentConfigSchema,
});

// Command schema
export const commandSchema = z.object({
  type: z.enum([
    'analyze_market',
    'execute_trade',
    'adjust_strategy',
    'evaluate_risk',
    'coordinate_agents',
    'query_knowledge',
    'custom'
  ]),
  parameters: z.record(z.any()).optional(),
  priority: z.number().min(1).max(10).default(5),
  timeout_ms: z.number().min(100).max(30000).default(5000),
  target_agents: z.array(z.string()).optional(),
  callback_url: z.string().url().optional()
});

// Status update schema
export const statusUpdateSchema = z.object({
  status: z.enum([
    'initializing',
    'idle',
    'busy',
    'error',
    'offline',
    'learning',
    'analyzing',
    'trading',
    'coordinating'
  ]),
  details: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

// Inferred types from schemas
export type AgentConfig = z.infer<typeof agentConfigSchema>;
export type ElizaAgent = z.infer<typeof elizaAgentSchema>;
export type AgentCommand = z.infer<typeof commandSchema>;
export type StatusUpdate = z.infer<typeof statusUpdateSchema>;
