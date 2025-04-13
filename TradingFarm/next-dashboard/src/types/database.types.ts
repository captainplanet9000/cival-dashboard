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
      elizaos_knowledge_documents: {
        Row: {
          id: string
          title: string
          description: string | null
          content: string
          document_type: string
          metadata: Json | null
          source: string | null
          created_by: string | null
          farm_id: number | null
          is_public: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          content: string
          document_type: string
          metadata?: Json | null
          source?: string | null
          created_by?: string | null
          farm_id?: number | null
          is_public?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          content?: string
          document_type?: string
          metadata?: Json | null
          source?: string | null
          created_by?: string | null
          farm_id?: number | null
          is_public?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elizaos_knowledge_documents_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elizaos_knowledge_documents_farm_id_fkey"
            columns: ["farm_id"]
            referencedRelation: "farms"
            referencedColumns: ["id"]
          }
        ]
      }
      elizaos_knowledge_chunks: {
        Row: {
          id: string
          document_id: string
          content: string
          chunk_index: number
          embedding: number[] | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          document_id: string
          content: string
          chunk_index: number
          embedding?: number[] | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          content?: string
          chunk_index?: number
          embedding?: number[] | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elizaos_knowledge_chunks_document_id_fkey"
            columns: ["document_id"]
            referencedRelation: "elizaos_knowledge_documents"
            referencedColumns: ["id"]
          }
        ]
      }
      elizaos_knowledge_permissions: {
        Row: {
          id: string
          document_id: string
          user_id: string | null
          agent_id: string | null
          farm_id: number | null
          permission_level: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          document_id: string
          user_id?: string | null
          agent_id?: string | null
          farm_id?: number | null
          permission_level: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          user_id?: string | null
          agent_id?: string | null
          farm_id?: number | null
          permission_level?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elizaos_knowledge_permissions_agent_id_fkey"
            columns: ["agent_id"]
            referencedRelation: "elizaos_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elizaos_knowledge_permissions_document_id_fkey"
            columns: ["document_id"]
            referencedRelation: "elizaos_knowledge_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elizaos_knowledge_permissions_farm_id_fkey"
            columns: ["farm_id"]
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elizaos_knowledge_permissions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      elizaos_agent_messages: {
        Row: {
          id: string
          agent_id: string
          message_type: string
          content: string
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          message_type: string
          content: string
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          message_type?: string
          content?: string
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elizaos_agent_messages_agent_id_fkey"
            columns: ["agent_id"]
            referencedRelation: "elizaos_agents"
            referencedColumns: ["id"]
          }
        ]
      }
      elizaos_agents: {
        Row: {
          id: string
          name: string
          farm_id: number
          status: string
          config: Json
          performance_metrics: Json | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          farm_id: number
          status?: string
          config?: Json
          performance_metrics?: Json | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          farm_id?: number
          status?: string
          config?: Json
          performance_metrics?: Json | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elizaos_agents_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elizaos_agents_farm_id_fkey"
            columns: ["farm_id"]
            referencedRelation: "farms"
            referencedColumns: ["id"]
          }
        ]
      }
      farms: {
        Row: {
          id: number
          name: string
          description: string | null
          status: string
          created_at: string
          updated_at: string
          created_by: string | null
          is_active: boolean
          goal_id: number | null
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
          status?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
          is_active?: boolean
          goal_id?: number | null
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          status?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
          is_active?: boolean
          goal_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "farms_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farms_goal_id_fkey"
            columns: ["goal_id"]
            referencedRelation: "goals"
            referencedColumns: ["id"]
          }
        ]
      }
      goals: {
        Row: {
          id: number
          name: string
          description: string | null
          target_value: number | null
          current_value: number | null
          target_date: string | null
          priority: string
          status: string
          created_at: string
          updated_at: string
          created_by: string | null
          type: string | null
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
          target_value?: number | null
          current_value?: number | null
          target_date?: string | null
          priority?: string
          status?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
          type?: string | null
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          target_value?: number | null
          current_value?: number | null
          target_date?: string | null
          priority?: string
          status?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goals_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      farm_members: {
        Row: {
          id: number
          farm_id: number
          user_id: string
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          farm_id: number
          user_id: string
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          farm_id?: number
          user_id?: string
          role?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "farm_members_farm_id_fkey"
            columns: ["farm_id"]
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farm_members_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    },
    Views: {
      [_ in never]: never;
    },
    Functions: {
      match_knowledge_chunks: {
        Args: {
          query_embedding: number[]
          match_threshold: number
          match_count: number
        }
        Returns: {
          id: string
          document_id: string
          content: string
          chunk_index: number
          metadata: Json
          similarity: number
          document: Json
        }[]
      }
      agent_knowledge_search: {
        Args: {
          agent_id: string
          query_embedding: number[]
          match_threshold: number
          match_count: number
        }
        Returns: {
          id: string
          document_id: string
          content: string
          chunk_index: number
          metadata: Json
          similarity: number
          document: Json
        }[]
      }
      farm_knowledge_search: {
        Args: {
          farm_id: number
          query_embedding: number[]
          match_threshold: number
          match_count: number
        }
        Returns: {
          id: string
          document_id: string
          content: string
          chunk_index: number
          metadata: Json
          similarity: number
          document: Json
        }[]
      }
    },
    Enums: {
      [_ in never]: never;
    },
    CompositeTypes: {
      [_ in never]: never;
    }
  }
}
