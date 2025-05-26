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
      agent_file_access_logs: {
        Row: {
          id: string
          agent_id: string | null
          file_id: string | null
          operation: string
          accessed_at: string
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          agent_id?: string | null
          file_id?: string | null
          operation: string
          accessed_at: string
          metadata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          agent_id?: string | null
          file_id?: string | null
          operation?: string
          accessed_at?: string
          metadata?: Json | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_file_access_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_permissions"
            referencedColumns: ["agent_id"]
          },
          {
            foreignKeyName: "agent_file_access_logs_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "file_uploads"
            referencedColumns: ["id"]
          }
        ]
      }
      agent_permissions: {
        Row: {
          agent_id: string
          risk_level: string
          max_trade_size: number
          allowed_markets: string[]
          data_access_level: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          risk_level?: string
          max_trade_size?: number
          allowed_markets?: string[]
          data_access_level?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          risk_level?: string
          max_trade_size?: number
          allowed_markets?: string[]
          data_access_level?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      file_access_permissions: {
        Row: {
          id: string
          file_id: string | null
          agent_id: string | null
          access_level: string
          granted_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          file_id?: string | null
          agent_id?: string | null
          access_level?: string
          granted_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          file_id?: string | null
          agent_id?: string | null
          access_level?: string
          granted_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "file_access_permissions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_permissions"
            referencedColumns: ["agent_id"]
          },
          {
            foreignKeyName: "file_access_permissions_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "file_uploads"
            referencedColumns: ["id"]
          }
        ]
      }      file_uploads: {
        Row: {
          id: string
          user_id: string
          filename: string
          file_path: string
          file_size: number
          content_type: string
          file_type: string
          data_format: string | null
          description: string | null
          tags: string[] | null
          is_processed: boolean | null
          data_schema: Json | null
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          filename: string
          file_path: string
          file_size: number
          content_type: string
          file_type: string
          data_format?: string | null
          description?: string | null
          tags?: string[] | null
          is_processed?: boolean | null
          data_schema?: Json | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          filename?: string
          file_path?: string
          file_size?: number
          content_type?: string
          file_type?: string
          data_format?: string | null
          description?: string | null
          tags?: string[] | null
          is_processed?: boolean | null
          data_schema?: Json | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "file_uploads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
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