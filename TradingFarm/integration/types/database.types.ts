/**
 * Database Types for Trading Farm + ElizaOS Integration
 * Generated from Supabase schema
 */

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
      master_wallets: {
        Row: {
          id: string
          name: string
          total_balance: number
          allocated_to_farms: number
          reserve_funds: number
          high_risk_exposure: number
          security_score: number
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          total_balance?: number
          allocated_to_farms?: number
          reserve_funds?: number
          high_risk_exposure?: number
          security_score?: number
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          total_balance?: number
          allocated_to_farms?: number
          reserve_funds?: number
          high_risk_exposure?: number
          security_score?: number
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      
      farm_wallets: {
        Row: {
          id: string
          name: string
          balance: number
          allocated_funds: number
          available_funds: number
          risk_level: string
          status: string
          master_wallet_id: string | null
          strategy_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          balance?: number
          allocated_funds?: number
          available_funds?: number
          risk_level?: string
          status?: string
          master_wallet_id?: string | null
          strategy_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          balance?: number
          allocated_funds?: number
          available_funds?: number
          risk_level?: string
          status?: string
          master_wallet_id?: string | null
          strategy_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "farm_wallets_master_wallet_id_fkey"
            columns: ["master_wallet_id"]
            referencedRelation: "master_wallets"
            referencedColumns: ["id"]
          }
        ]
      }
      
      agent_wallets: {
        Row: {
          id: string
          name: string
          farm_id: string | null
          farm_name: string
          balance: number
          performance: number
          status: string
          agent_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          farm_id?: string | null
          farm_name: string
          balance?: number
          performance?: number
          status?: string
          agent_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          farm_id?: string | null
          farm_name?: string
          balance?: number
          performance?: number
          status?: string
          agent_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_wallets_farm_id_fkey"
            columns: ["farm_id"]
            referencedRelation: "farm_wallets"
            referencedColumns: ["id"]
          }
        ]
      }
      
      transactions: {
        Row: {
          id: string
          type: string
          amount: number
          source_id: string
          source_name: string
          destination_id: string
          destination_name: string
          status: string
          fee: number
          network: string | null
          confirmations: number | null
          approvals_required: number | null
          approvals_current: number | null
          approver_ids: Json | null
          created_at: string
          completed_at: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          type: string
          amount: number
          source_id: string
          source_name: string
          destination_id: string
          destination_name: string
          status?: string
          fee?: number
          network?: string | null
          confirmations?: number | null
          approvals_required?: number | null
          approvals_current?: number | null
          approver_ids?: Json | null
          created_at?: string
          completed_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          type?: string
          amount?: number
          source_id?: string
          source_name?: string
          destination_id?: string
          destination_name?: string
          status?: string
          fee?: number
          network?: string | null
          confirmations?: number | null
          approvals_required?: number | null
          approvals_current?: number | null
          approver_ids?: Json | null
          created_at?: string
          completed_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      
      agents: {
        Row: {
          id: string
          name: string
          farm_id: string | null
          model: string
          description: string | null
          status: string
          strategy_id: string | null
          wallet_id: string | null
          exchange_configs: Json | null
          performance: Json | null
          last_active: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          farm_id?: string | null
          model: string
          description?: string | null
          status?: string
          strategy_id?: string | null
          wallet_id?: string | null
          exchange_configs?: Json | null
          performance?: Json | null
          last_active?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          farm_id?: string | null
          model?: string
          description?: string | null
          status?: string
          strategy_id?: string | null
          wallet_id?: string | null
          exchange_configs?: Json | null
          performance?: Json | null
          last_active?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agents_farm_id_fkey"
            columns: ["farm_id"]
            referencedRelation: "farm_wallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_wallet_id_fkey"
            columns: ["wallet_id"]
            referencedRelation: "agent_wallets"
            referencedColumns: ["id"]
          }
        ]
      }
      
      strategies: {
        Row: {
          id: string
          name: string
          description: string | null
          risk_level: string
          parameters: Json | null
          performance: Json | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          risk_level?: string
          parameters?: Json | null
          performance?: Json | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          risk_level?: string
          parameters?: Json | null
          performance?: Json | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      
      knowledge_documents: {
        Row: {
          id: string
          title: string
          content: string
          metadata: Json | null
          embedding: unknown | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          metadata?: Json | null
          embedding?: unknown | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          metadata?: Json | null
          embedding?: unknown | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      
      command_history: {
        Row: {
          id: string
          command: string
          args: Json | null
          source: string
          target_id: string | null
          target_type: string | null
          status: string
          result: Json | null
          error: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          command: string
          args?: Json | null
          source: string
          target_id?: string | null
          target_type?: string | null
          status?: string
          result?: Json | null
          error?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          command?: string
          args?: Json | null
          source?: string
          target_id?: string | null
          target_type?: string | null
          status?: string
          result?: Json | null
          error?: string | null
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
