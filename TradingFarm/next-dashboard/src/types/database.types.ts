export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      exchange_credentials: {
        Row: {
          id: string
          user_id: string
          exchange_id: string
          exchange_name: string
          api_key: string
          api_secret: string
          passphrase: string | null
          testnet: boolean
          description: string | null
          enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          exchange_id: string
          exchange_name: string
          api_key: string
          api_secret: string
          passphrase?: string | null
          testnet?: boolean
          description?: string | null
          enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          exchange_id?: string
          exchange_name?: string
          api_key?: string
          api_secret?: string
          passphrase?: string | null
          testnet?: boolean
          description?: string | null
          enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exchange_credentials_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      exchange_configs: {
        Row: {
          id: string
          user_id: string
          credentials_id: string
          exchange_id: string
          config: Json
          status: string
          last_connected: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          credentials_id: string
          exchange_id: string
          config?: Json
          status?: string
          last_connected?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          credentials_id?: string
          exchange_id?: string
          config?: Json
          status?: string
          last_connected?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exchange_configs_credentials_id_fkey"
            columns: ["credentials_id"]
            referencedRelation: "exchange_credentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchange_configs_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      order_history: {
        Row: {
          id: string
          user_id: string
          exchange_id: string
          order_id: string
          symbol: string
          side: string
          order_type: string
          price: number | null
          qty: number
          status: string
          filled_qty: number
          avg_price: number | null
          order_time: string | null
          update_time: string | null
          raw_data: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          exchange_id: string
          order_id: string
          symbol: string
          side: string
          order_type: string
          price?: number | null
          qty: number
          status: string
          filled_qty?: number
          avg_price?: number | null
          order_time?: string | null
          update_time?: string | null
          raw_data?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          exchange_id?: string
          order_id?: string
          symbol?: string
          side?: string
          order_type?: string
          price?: number | null
          qty?: number
          status?: string
          filled_qty?: number
          avg_price?: number | null
          order_time?: string | null
          update_time?: string | null
          raw_data?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_history_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      agent_tools: {
        Row: {
          id: string
          name: string
          description: string | null
          tool_type: string
          config: Json
          is_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          tool_type: string
          config?: Json
          is_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          tool_type?: string
          config?: Json
          is_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      agent_equipped_tools: {
        Row: {
          id: string
          agent_id: string
          tool_id: string
          config: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          tool_id: string
          config?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          tool_id?: string
          config?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_equipped_tools_agent_id_fkey"
            columns: ["agent_id"]
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_equipped_tools_tool_id_fkey"
            columns: ["tool_id"]
            referencedRelation: "agent_tools"
            referencedColumns: ["id"]
          }
        ]
      }
      llm_configs: {
        Row: {
          id: string
          user_id: string
          provider: string
          model: string
          api_key: string | null
          config: Json
          is_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          provider: string
          model: string
          api_key?: string | null
          config?: Json
          is_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          provider?: string
          model?: string
          api_key?: string | null
          config?: Json
          is_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "llm_configs_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      agents: {
        Row: {
          id: string
          name: string
          description: string | null
          farm_id: string | null
          type: string
          strategy_type: string | null
          status: string
          risk_level: string | null
          target_markets: string[] | null
          config: Json | null
          instructions: string | null
          performance: Json | null
          user_id: string
          tools_config: Json
          llm_config_id: string | null
          trading_permissions: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          farm_id?: string | null
          type?: string
          strategy_type?: string | null
          status?: string
          risk_level?: string | null
          target_markets?: string[] | null
          config?: Json | null
          instructions?: string | null
          performance?: Json | null
          user_id: string
          tools_config?: Json
          llm_config_id?: string | null
          trading_permissions?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          farm_id?: string | null
          type?: string
          strategy_type?: string | null
          status?: string
          risk_level?: string | null
          target_markets?: string[] | null
          config?: Json | null
          instructions?: string | null
          performance?: Json | null
          user_id?: string
          tools_config?: Json
          llm_config_id?: string | null
          trading_permissions?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agents_farm_id_fkey"
            columns: ["farm_id"]
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_llm_config_id_fkey"
            columns: ["llm_config_id"]
            referencedRelation: "llm_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}