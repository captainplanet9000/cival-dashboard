export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      agents: {
        Row: {
          agent_type: string
          created_at: string
          farm_id: string
          goal_id: string | null
          id: string
          is_active: boolean
          last_heartbeat_at: string | null
          metadata: Json | null
          settings: Json | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          agent_type: string
          created_at?: string
          farm_id: string
          goal_id?: string | null
          id?: string
          is_active?: boolean
          last_heartbeat_at?: string | null
          metadata?: Json | null
          settings?: Json | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          agent_type?: string
          created_at?: string
          farm_id?: string
          goal_id?: string | null
          id?: string
          is_active?: boolean
          last_heartbeat_at?: string | null
          metadata?: Json | null
          settings?: Json | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      farms: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          metadata: Json | null
          name: string
          settings: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name: string
          settings?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name?: string
          settings?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "farms_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      goals: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          farm_id: string
          goal_type: string
          id: string
          last_evaluated_at: string | null
          metadata: Json | null
          name: string
          parameters: Json | null
          priority: number | null
          progress: number | null
          start_date: string | null
          status: string
          target_asset: string | null
          target_value: number | null
          template_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          farm_id: string
          goal_type: string
          id?: string
          last_evaluated_at?: string | null
          metadata?: Json | null
          name: string
          parameters?: Json | null
          priority?: number | null
          progress?: number | null
          start_date?: string | null
          status?: string
          target_asset?: string | null
          target_value?: number | null
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          farm_id?: string
          goal_type?: string
          id?: string
          last_evaluated_at?: string | null
          metadata?: Json | null
          name?: string
          parameters?: Json | null
          priority?: number | null
          progress?: number | null
          start_date?: string | null
          status?: string
          target_asset?: string | null
          target_value?: number | null
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
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
