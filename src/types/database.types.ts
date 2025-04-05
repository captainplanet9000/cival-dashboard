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
      agents: {
        Row: {
          id: string
          name: string
          description: string | null
          owner_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          owner_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          owner_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      farms: {
        Row: {
          id: string
          name: string
          description: string | null
          owner_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          owner_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          owner_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      agent_storage: {
        Row: {
          id: string
          name: string
          description: string | null
          agent_id: string
          storage_type: string
          capacity: number
          used_space: number
          vault_account_id: string | null
          settings: Json
          metadata: Json | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          agent_id: string
          storage_type: string
          capacity: number
          used_space?: number
          vault_account_id?: string | null
          settings?: Json
          metadata?: Json | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          agent_id?: string
          storage_type?: string
          capacity?: number
          used_space?: number
          vault_account_id?: string | null
          settings?: Json
          metadata?: Json | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      farm_storage: {
        Row: {
          id: string
          name: string
          description: string | null
          farm_id: string
          storage_type: string
          capacity: number
          used_space: number
          reserved_space: number
          vault_account_id: string | null
          settings: Json
          metadata: Json | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          farm_id: string
          storage_type: string
          capacity: number
          used_space?: number
          reserved_space?: number
          vault_account_id?: string | null
          settings?: Json
          metadata?: Json | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          farm_id?: string
          storage_type?: string
          capacity?: number
          used_space?: number
          reserved_space?: number
          vault_account_id?: string | null
          settings?: Json
          metadata?: Json | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      storage_allocation: {
        Row: {
          id: string
          storage_id: string
          storage_type: string
          allocated_to_id: string
          allocated_to_type: string
          amount: number
          purpose: string | null
          start_date: string
          end_date: string | null
          is_active: boolean
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          storage_id: string
          storage_type: string
          allocated_to_id: string
          allocated_to_type: string
          amount: number
          purpose?: string | null
          start_date?: string
          end_date?: string | null
          is_active?: boolean
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          storage_id?: string
          storage_type?: string
          allocated_to_id?: string
          allocated_to_type?: string
          amount?: number
          purpose?: string | null
          start_date?: string
          end_date?: string | null
          is_active?: boolean
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      storage_transactions: {
        Row: {
          id: string
          source_id: string
          source_type: string
          destination_id: string
          destination_type: string
          amount: number
          transaction_type: string
          status: string
          description: string | null
          vault_transaction_id: string | null
          metadata: Json | null
          initiated_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          source_id: string
          source_type: string
          destination_id: string
          destination_type: string
          amount: number
          transaction_type: string
          status?: string
          description?: string | null
          vault_transaction_id?: string | null
          metadata?: Json | null
          initiated_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          source_id?: string
          source_type?: string
          destination_id?: string
          destination_type?: string
          amount?: number
          transaction_type?: string
          status?: string
          description?: string | null
          vault_transaction_id?: string | null
          metadata?: Json | null
          initiated_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      storage_audit_log: {
        Row: {
          id: string
          timestamp: string
          action: string
          storage_id: string | null
          storage_type: string | null
          transaction_id: string | null
          user_id: string | null
          details: Json | null
          severity: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          timestamp?: string
          action: string
          storage_id?: string | null
          storage_type?: string | null
          transaction_id?: string | null
          user_id?: string | null
          details?: Json | null
          severity?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          timestamp?: string
          action?: string
          storage_id?: string | null
          storage_type?: string | null
          transaction_id?: string | null
          user_id?: string | null
          details?: Json | null
          severity?: string
          ip_address?: string | null
          user_agent?: string | null
        }
      }
      storage_subscriptions: {
        Row: {
          id: string
          storage_allocation_id: string
          vault_account_id: string
          cost_per_unit: number
          billing_period: string
          next_billing_date: string
          is_active: boolean
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          storage_allocation_id: string
          vault_account_id: string
          cost_per_unit: number
          billing_period: string
          next_billing_date: string
          is_active?: boolean
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          storage_allocation_id?: string
          vault_account_id?: string
          cost_per_unit?: number
          billing_period?: string
          next_billing_date?: string
          is_active?: boolean
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      vault_accounts: {
        Row: {
          id: string
          name: string
          description: string | null
          master_id: string
          account_type: string
          currency: string
          balance: number
          reserved_balance: number
          agent_id: string | null
          farm_id: string | null
          settings: Json | null
          metadata: Json | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          master_id: string
          account_type: string
          currency: string
          balance?: number
          reserved_balance?: number
          agent_id?: string | null
          farm_id?: string | null
          settings?: Json | null
          metadata?: Json | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          master_id?: string
          account_type?: string
          currency?: string
          balance?: number
          reserved_balance?: number
          agent_id?: string | null
          farm_id?: string | null
          settings?: Json | null
          metadata?: Json | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Functions: {
      update_storage_capacity: {
        Args: {
          p_storage_id: string
          p_storage_type: string
          p_new_capacity: number
        }
        Returns: boolean
      }
      handle_created_at: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      handle_updated_at: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
    }
  }
}
