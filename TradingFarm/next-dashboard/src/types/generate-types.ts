/**
 * Database Type Generation Script
 * 
 * This script generates TypeScript types for your database schema.
 * It doesn't rely on the Supabase CLI which is having issues with the .env file.
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
      // Risk Management Tables
      risk_profiles: {
        Row: {
          id: number
          user_id: string
          max_drawdown: number | null
          max_position_size: number | null
          max_daily_loss: number | null
          risk_per_trade: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          max_drawdown?: number | null
          max_position_size?: number | null
          max_daily_loss?: number | null
          risk_per_trade?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          max_drawdown?: number | null
          max_position_size?: number | null
          max_daily_loss?: number | null
          risk_per_trade?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_profiles_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      circuit_breakers: {
        Row: {
          id: number
          user_id: string
          enabled: boolean
          trigger_type: string
          threshold: number
          cooldown_minutes: number | null
          notification_channels: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          enabled?: boolean
          trigger_type: string
          threshold: number
          cooldown_minutes?: number | null
          notification_channels?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          enabled?: boolean
          trigger_type?: string
          threshold?: number
          cooldown_minutes?: number | null
          notification_channels?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "circuit_breakers_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      risk_events: {
        Row: {
          id: number
          user_id: string
          event_type: string
          severity: string
          description: string
          metadata: Json | null
          acknowledged: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          event_type: string
          severity: string
          description: string
          metadata?: Json | null
          acknowledged?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          event_type?: string
          severity?: string
          description?: string
          metadata?: Json | null
          acknowledged?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_events_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      position_sizing_rules: {
        Row: {
          id: number
          user_id: string
          strategy_type: string
          calculation_method: string
          max_risk_percent: number
          position_sizing_model: string | null
          parameters: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          strategy_type: string
          calculation_method: string
          max_risk_percent: number
          position_sizing_model?: string | null
          parameters?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          strategy_type?: string
          calculation_method?: string
          max_risk_percent?: number
          position_sizing_model?: string | null
          parameters?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "position_sizing_rules_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      
      // Add any other existing tables here
      // ...
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      handle_updated_at: {
        Args: Record<PropertyKey, never>
        Returns: unknown
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
