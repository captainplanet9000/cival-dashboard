/**
 * This file was auto-generated.
 * It contains the types for your Supabase database.
 * 
 * To update:
 * npx supabase gen types typescript --local > src/types/database.types.ts
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
      farms: {
        Row: {
          id: number
          name: string
          description: string | null
          user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "farms_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      agents: {
        Row: {
          id: number
          name: string
          farm_id: number
          status: string
          type: string
          configuration: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          farm_id: number
          status?: string
          type?: string
          configuration?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          farm_id?: number
          status?: string
          type?: string
          configuration?: Json
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
      }
      strategies: {
        Row: {
          id: number
          name: string
          description: string | null
          parameters: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
          parameters?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          parameters?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          id: number
          name: string
          address: string
          balance: number
          farm_id: number | null
          user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          address: string
          balance?: number
          farm_id?: number | null
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          address?: string
          balance?: number
          farm_id?: number | null
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_farm_id_fkey"
            columns: ["farm_id"]
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      transactions: {
        Row: {
          id: number
          type: string
          amount: number
          status: string
          wallet_id: number
          farm_id: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          type: string
          amount: number
          status?: string
          wallet_id: number
          farm_id?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          type?: string
          amount?: number
          status?: string
          wallet_id?: number
          farm_id?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_farm_id_fkey"
            columns: ["farm_id"]
            referencedRelation: "farms"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      handle_created_at: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      handle_updated_at: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      list_tables: {
        Args: Record<PropertyKey, never>
        Returns: string[]
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
