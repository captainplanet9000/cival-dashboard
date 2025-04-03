/**
 * Generated Types for Supabase
 * These types represent the database schema for the Trading Farm dashboard
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
          id: string; // UUID
          name: string;
          description: string | null;
          status: string;
          exchange: string;
          api_keys: Json;
          config: Json;
          user_id: string | null; // UUID
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string; // UUID
          name: string;
          description?: string | null;
          status?: string;
          exchange: string;
          api_keys?: Json;
          config?: Json;
          user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string; // UUID
          name?: string;
          description?: string | null;
          status?: string;
          exchange?: string;
          api_keys?: Json;
          config?: Json;
          user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "farms_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      agents: {
        Row: {
          id: string; // UUID
          name: string;
          description: string | null;
          farm_id: string | null; // UUID
          user_id: string | null; // UUID
          status: string;
          type: string;
          config: Json;
          instructions: string | null;
          permissions: Json;
          performance: Json;
          capital_allocation: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string; // UUID
          name: string;
          description?: string | null;
          farm_id?: string | null; // UUID
          user_id?: string | null; // UUID
          status?: string;
          type?: string;
          config?: Json;
          instructions?: string | null;
          permissions?: Json;
          performance?: Json;
          capital_allocation?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string; // UUID
          name?: string;
          description?: string | null;
          farm_id?: string | null; // UUID
          user_id?: string | null; // UUID
          status?: string;
          type?: string;
          config?: Json;
          instructions?: string | null;
          permissions?: Json;
          performance?: Json;
          capital_allocation?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agents_farm_id_fkey";
            columns: ["farm_id"];
            referencedRelation: "farms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agents_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      goals: {
        Row: {
          id: string; // UUID
          name: string;
          description: string | null;
          farm_id: string | null; // UUID
          user_id: string | null; // UUID
          type: string;
          priority: string;
          status: string;
          current_value: number;
          target_value: number;
          progress: number;
          deadline: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string; // UUID
          name: string;
          description?: string | null;
          farm_id?: string | null; // UUID
          user_id?: string | null; // UUID
          type?: string;
          priority?: string;
          status?: string;
          current_value?: number;
          target_value?: number;
          progress?: number;
          deadline?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string; // UUID
          name?: string;
          description?: string | null;
          farm_id?: string | null; // UUID
          user_id?: string | null; // UUID
          type?: string;
          priority?: string;
          status?: string;
          current_value?: number;
          target_value?: number;
          progress?: number;
          deadline?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "goals_farm_id_fkey";
            columns: ["farm_id"];
            referencedRelation: "farms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "goals_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      orders: {
        Row: {
          id: string; // UUID
          farm_id: string;
          agent_id: string | null;
          exchange: string;
          exchange_account_id: string | null;
          external_id: string | null;
          symbol: string;
          order_type: string;
          side: "buy" | "sell";
          quantity: number;
          price: number | null;
          trailing_percent: number | null;
          trigger_price: number | null;
          status: string;
          metadata: Json;
          closed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string; // UUID
          farm_id: string;
          agent_id?: string | null;
          exchange: string;
          exchange_account_id?: string | null;
          external_id?: string | null;
          symbol: string;
          order_type: string;
          side: "buy" | "sell";
          quantity: number;
          price?: number | null;
          trailing_percent?: number | null;
          trigger_price?: number | null;
          status?: string;
          metadata?: Json;
          closed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string; // UUID
          farm_id?: string;
          agent_id?: string | null;
          exchange?: string;
          exchange_account_id?: string | null;
          external_id?: string | null;
          symbol?: string;
          order_type?: string;
          side?: "buy" | "sell";
          quantity?: number;
          price?: number | null;
          trailing_percent?: number | null;
          trigger_price?: number | null;
          status?: string;
          metadata?: Json;
          closed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_farm_id_fkey";
            columns: ["farm_id"];
            referencedRelation: "farms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_agent_id_fkey";
            columns: ["agent_id"];
            referencedRelation: "agents";
            referencedColumns: ["id"];
          }
        ];
      };
      alerts: {
        Row: {
          id: string; // UUID
          farm_id: string;
          title: string;
          message: string;
          level: string;
          status: string;
          source: string;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string; // UUID
          farm_id: string;
          title: string;
          message: string;
          level?: string;
          status?: string;
          source?: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string; // UUID
          farm_id?: string;
          title?: string;
          message?: string;
          level?: string;
          status?: string;
          source?: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "alerts_farm_id_fkey";
            columns: ["farm_id"];
            referencedRelation: "farms";
            referencedColumns: ["id"];
          }
        ];
      };
      capital_allocation_logs: {
        Row: {
          id: string; // UUID
          agent_id: string;
          farm_id: string;
          previous_amount: number;
          new_amount: number;
          change_amount: number;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string; // UUID
          agent_id: string;
          farm_id: string;
          previous_amount: number;
          new_amount: number;
          change_amount: number;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string; // UUID
          agent_id?: string;
          farm_id?: string;
          previous_amount?: number;
          new_amount?: number;
          change_amount?: number;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "capital_allocation_logs_agent_id_fkey";
            columns: ["agent_id"];
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "capital_allocation_logs_farm_id_fkey";
            columns: ["farm_id"];
            referencedRelation: "farms";
            referencedColumns: ["id"];
          }
        ];
      };
      trades: {
        Row: {
          id: string; // UUID
          order_id: string;
          external_id: string | null;
          farm_id: string;
          exchange: string;
          symbol: string;
          side: string;
          quantity: number;
          price: number;
          fee: number;
          fee_currency: string | null;
          status: string;
          executed_at: string;
          pnl: number;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string; // UUID
          order_id: string;
          external_id?: string | null;
          farm_id: string;
          exchange: string;
          symbol: string;
          side: string;
          quantity: number;
          price: number;
          fee?: number;
          fee_currency?: string | null;
          status?: string;
          executed_at?: string;
          pnl?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string; // UUID
          order_id?: string;
          external_id?: string | null;
          farm_id?: string;
          exchange?: string;
          symbol?: string;
          side?: string;
          quantity?: number;
          price?: number;
          fee?: number;
          fee_currency?: string | null;
          status?: string;
          executed_at?: string;
          pnl?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trades_order_id_fkey";
            columns: ["order_id"];
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trades_farm_id_fkey";
            columns: ["farm_id"];
            referencedRelation: "farms";
            referencedColumns: ["id"];
          }
        ];
      };
      positions: {
        Row: {
          id: string; // UUID
          farm_id: string;
          agent_id: string | null;
          exchange: string;
          symbol: string;
          side: 'long' | 'short';
          quantity: number;
          entry_price: number;
          current_price: number;
          unrealized_pnl: number;
          realized_pnl: number;
          status: string;
          reconciliation_status: string;
          last_updated: string;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string; // UUID
          farm_id: string;
          agent_id?: string | null;
          exchange: string;
          symbol: string;
          side: 'long' | 'short';
          quantity: number;
          entry_price: number;
          current_price?: number;
          unrealized_pnl?: number;
          realized_pnl?: number;
          status?: string;
          reconciliation_status?: string;
          last_updated?: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string; // UUID
          farm_id?: string;
          agent_id?: string | null;
          exchange?: string;
          symbol?: string;
          side?: 'long' | 'short';
          quantity?: number;
          entry_price?: number;
          current_price?: number;
          unrealized_pnl?: number;
          realized_pnl?: number;
          status?: string;
          reconciliation_status?: string;
          last_updated?: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "positions_farm_id_fkey";
            columns: ["farm_id"];
            referencedRelation: "farms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "positions_agent_id_fkey";
            columns: ["agent_id"];
            referencedRelation: "agents";
            referencedColumns: ["id"];
          }
        ];
      };
      // Add more table definitions as needed
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  auth: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string | null;
          created_at: string | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}