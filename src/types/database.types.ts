export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      mcp_messages: {
        Row: {
          id: string;
          agent_id: string;
          topic: string;
          payload: any;
          status: 'pending' | 'delivered';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['mcp_messages']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['mcp_messages']['Insert']>;
      };
      mcp_subscriptions: {
        Row: {
          id: string;
          agent_id: string;
          topic: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['mcp_subscriptions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['mcp_subscriptions']['Insert']>;
      };
      mcp_agent_status: {
        Row: {
          id: string;
          agent_id: string;
          status: string;
          metadata: any;
          last_seen: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['mcp_agent_status']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['mcp_agent_status']['Insert']>;
      };
      farms: {
        Row: {
          id: string;
          created_at: string;
          name: string;
          description: string | null;
          owner_id: string;
          goal: string | null;
          risk_level: 'low' | 'medium' | 'high';
          total_value: number;
          value_change_24h: number;
          farm_agents: {
            id: string;
            name: string;
            status: 'active' | 'paused' | 'stopped';
          }[];
        };
        Insert: {
          id?: string;
          created_at?: string;
          name: string;
          description?: string | null;
          owner_id: string;
          goal?: string | null;
          risk_level: 'low' | 'medium' | 'high';
          total_value?: number;
          value_change_24h?: number;
        };
        Update: {
          id?: string;
          created_at?: string;
          name?: string;
          description?: string | null;
          owner_id?: string;
          goal?: string | null;
          risk_level?: 'low' | 'medium' | 'high';
          total_value?: number;
          value_change_24h?: number;
        };
      };
      farm_wallets: {
        Row: {
          id: string;
          farm_id: string;
          name: string;
          address: string;
          chain_id: number;
          token_balances: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          farm_id: string;
          name: string;
          address: string;
          chain_id: number;
          token_balances?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          farm_id?: string;
          name?: string;
          address?: string;
          chain_id?: number;
          token_balances?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      agent_wallets: {
        Row: {
          id: string;
          agent_id: string;
          farm_wallet_id: string;
          allocation: number;
          permissions: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          farm_wallet_id: string;
          allocation?: number;
          permissions?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          agent_id?: string;
          farm_wallet_id?: string;
          allocation?: number;
          permissions?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      farm_agents: {
        Row: {
          id: string;
          created_at: string;
          name: string;
          farm_id: string;
          status: 'active' | 'paused' | 'stopped';
        };
        Insert: {
          id?: string;
          created_at?: string;
          name: string;
          farm_id: string;
          status?: 'active' | 'paused' | 'stopped';
        };
        Update: {
          id?: string;
          created_at?: string;
          name?: string;
          farm_id?: string;
          status?: 'active' | 'paused' | 'stopped';
        };
      };
      agent_tools: {
        Row: {
          id: string;
          agent_id: string;
          name: string;
          description: string | null;
          config: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          name: string;
          description?: string | null;
          config?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          agent_id?: string;
          name?: string;
          description?: string | null;
          config?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      agent_apis: {
        Row: {
          id: string;
          agent_id: string;
          name: string;
          endpoint: string;
          auth_config: Json;
          rate_limit: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          name: string;
          endpoint: string;
          auth_config?: Json;
          rate_limit?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          agent_id?: string;
          name?: string;
          endpoint?: string;
          auth_config?: Json;
          rate_limit?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      agent_memory: {
        Row: {
          id: string;
          agent_id: string;
          memory_type: 'conversation' | 'document' | 'knowledge' | 'state';
          content: any;
          metadata: Record<string, any>;
          embedding?: number[];
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['agent_memory']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['agent_memory']['Insert']>;
      };
      agent_documents: {
        Row: {
          id: string;
          agent_id: string;
          document_type: string;
          content: any;
          metadata: Record<string, any>;
          embedding?: number[];
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['agent_documents']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['agent_documents']['Insert']>;
      };
      agent_plugins: {
        Row: {
          id: string;
          agent_id: string;
          plugin_name: string;
          plugin_version: string;
          plugin_config: Record<string, any>;
          enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['agent_plugins']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['agent_plugins']['Insert']>;
      };
      agent_clients: {
        Row: {
          id: string;
          agent_id: string;
          client_type: 'discord' | 'twitter' | 'telegram' | 'custom';
          client_config: Record<string, any>;
          enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['agent_clients']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['agent_clients']['Insert']>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      match_documents: {
        Args: {
          query_embedding: number[];
          match_threshold: number;
          match_count: number;
        };
        Returns: Array<{
          id: string;
          content: any;
          metadata: Record<string, any>;
          similarity: number;
        }>;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
} 