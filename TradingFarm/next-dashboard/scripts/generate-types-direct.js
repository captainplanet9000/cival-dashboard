/**
 * Generate Database Types Directly
 * 
 * This script creates TypeScript types for your Supabase database
 * without requiring CLI authentication.
 */

const fs = require('fs');
const path = require('path');

// Create types directory if it doesn't exist
const typesDir = path.join(__dirname, '..', 'src', 'types');
if (!fs.existsSync(typesDir)) {
  fs.mkdirSync(typesDir, { recursive: true });
}

console.log('🚀 Generating TypeScript types for Trading Farm database...');

// Define the TypeScript type definitions based on your schema
const typeDefinitions = `export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      orders: {
        Row: {
          id: string
          farm_id: number
          agent_id: number | null
          exchange: string
          exchange_account_id: string | null
          symbol: string
          type: string
          side: string
          quantity: number
          price: number | null
          trailing_percent: number | null
          trigger_price: number | null
          stop_price: number | null
          time_in_force: string | null
          status: string
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          farm_id: number
          agent_id?: number | null
          exchange: string
          exchange_account_id?: string | null
          symbol: string
          type: string
          side: string
          quantity: number
          price?: number | null
          trailing_percent?: number | null
          trigger_price?: number | null
          stop_price?: number | null
          time_in_force?: string | null
          status: string
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          farm_id?: number
          agent_id?: number | null
          exchange?: string
          exchange_account_id?: string | null
          symbol?: string
          type?: string
          side?: string
          quantity?: number
          price?: number | null
          trailing_percent?: number | null
          trigger_price?: number | null
          stop_price?: number | null
          time_in_force?: string | null
          status?: string
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_farm_id_fkey"
            columns: ["farm_id"]
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_agent_id_fkey"
            columns: ["agent_id"]
            referencedRelation: "agents"
            referencedColumns: ["id"]
          }
        ]
      },
      agent_commands: {
        Row: {
          id: string
          agent_id: number
          command_type: string
          command_content: string
          status: string
          response_id: string | null
          context: Json | null
          order_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agent_id: number
          command_type: string
          command_content: string
          status?: string
          response_id?: string | null
          context?: Json | null
          order_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agent_id?: number
          command_type?: string
          command_content?: string
          status?: string
          response_id?: string | null
          context?: Json | null
          order_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_commands_agent_id_fkey"
            columns: ["agent_id"]
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_commands_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          }
        ]
      },
      agent_responses: {
        Row: {
          id: string
          agent_id: number
          command_id: string | null
          response_type: string
          response_content: string
          source: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agent_id: number
          command_id?: string | null
          response_type: string
          response_content: string
          source?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agent_id?: number
          command_id?: string | null
          response_type?: string
          response_content?: string
          source?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_responses_agent_id_fkey"
            columns: ["agent_id"]
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_responses_command_id_fkey"
            columns: ["command_id"]
            referencedRelation: "agent_commands"
            referencedColumns: ["id"]
          }
        ]
      },
      agents: {
        Row: {
          id: number
          name: string
          description: string | null
          exchange: string
          api_key: string | null
          api_secret: string | null
          status: string
          configuration: Json | null
          farm_id: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
          exchange: string
          api_key?: string | null
          api_secret?: string | null
          status?: string
          configuration?: Json | null
          farm_id: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          exchange?: string
          api_key?: string | null
          api_secret?: string | null
          status?: string
          configuration?: Json | null
          farm_id?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agents_farm_id_fkey"
            columns: ["farm_id"]
            referencedRelation: "farms"
            referencedColumns: ["id"]
          }
        ]
      },
      farms: {
        Row: {
          id: number
          name: string
          description: string | null
          status: string
          configuration: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
          status?: string
          configuration?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          status?: string
          configuration?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      },
      goals: {
        Row: {
          id: number
          name: string
          description: string | null
          type: string
          priority: string
          status: string
          farm_id: number | null
          current_value: number | null
          target_value: number | null
          deadline: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
          type: string
          priority: string
          status: string
          farm_id?: number | null
          current_value?: number | null
          target_value?: number | null
          deadline?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          type?: string
          priority?: string
          status?: string
          farm_id?: number | null
          current_value?: number | null
          target_value?: number | null
          deadline?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_farm_id_fkey"
            columns: ["farm_id"]
            referencedRelation: "farms"
            referencedColumns: ["id"]
          }
        ]
      },
      knowledge_base: {
        Row: {
          id: string
          topic: string
          content: string
          source: string | null
          tags: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          topic: string
          content: string
          source?: string | null
          tags?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          topic?: string
          content?: string
          source?: string | null
          tags?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_order_command: {
        Args: {
          agent_id_param: number
          order_id_param: string
          command_type_param: string
          command_content_param: string
          context_param?: Json
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for easier data access
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']`;

// Write the file
const outputPath = path.join(typesDir, 'database.types.ts');
fs.writeFileSync(outputPath, typeDefinitions);

console.log(`✅ TypeScript types generated successfully at: ${outputPath}`);
console.log(`\nThese types include all the tables from your Supabase database, including:`);
console.log(`- orders: For order management with ElizaOS integration`);
console.log(`- agent_commands: For tracking commands sent to ElizaOS agents`);
console.log(`- agent_responses: For storing responses from ElizaOS agents`);
console.log(`- agents: For managing ElizaOS agent configurations`);
console.log(`- farms: For organizing trading farms`);
console.log(`- goals: For tracking trading goals`);
console.log(`- knowledge_base: For ElizaOS agent knowledge storage`);

console.log(`\nYou can now use these types in your Trading Farm application.`);
console.log(`Example usage in a server component:`);
console.log(`  const { data } = await supabase.from('orders').select('*');`);
console.log(`  const orders: Tables<'orders'>[] = data;`);

console.log(`\nExample usage for insertion:`);
console.log(`  const orderData: InsertTables<'orders'> = {`);
console.log(`    farm_id: 1,`);
console.log(`    agent_id: 1,`);
console.log(`    exchange: 'binance',`);
console.log(`    symbol: 'BTC/USDT',`);
console.log(`    type: 'market',`);
console.log(`    side: 'buy',`);
console.log(`    quantity: 0.1,`);
console.log(`    status: 'pending'`);
console.log(`  };`);
console.log(`  await supabase.from('orders').insert(orderData);`);
