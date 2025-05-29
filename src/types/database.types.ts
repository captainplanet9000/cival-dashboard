export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      agent_checkpoints: {
        Row: {
          agent_id: string | null
          checkpoint_id: string
          created_at: string | null
          description: string | null
          id: string
          state: Json
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          checkpoint_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          state: Json
          user_id: string
        }
        Update: {
          agent_id?: string | null
          checkpoint_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          state?: Json
          user_id?: string
        }
        Relationships: []
      }
      agent_decisions: {
        Row: {
          agent_id: string | null
          confidence_score: number | null
          created_at: string | null
          decision: Json
          decision_type: string
          executed: boolean | null
          executed_at: string | null
          id: string
          result: Json | null
          signals: Json | null
          symbol: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          decision: Json
          decision_type: string
          executed?: boolean | null
          executed_at?: string | null
          id?: string
          result?: Json | null
          signals?: Json | null
          symbol: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          decision?: Json
          decision_type?: string
          executed?: boolean | null
          executed_at?: string | null
          id?: string
          result?: Json | null
          signals?: Json | null
          symbol?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_file_access: {
        Row: {
          access_level: string
          agent_id: string | null
          created_at: string | null
          file_id: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          access_level: string
          agent_id?: string | null
          created_at?: string | null
          file_id?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          access_level?: string
          agent_id?: string | null
          created_at?: string | null
          file_id?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_file_access_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_trading_permissions"
            referencedColumns: ["agent_id"]
          },
          {
            foreignKeyName: "agent_file_access_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "uploaded_files"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_file_access_logs: {
        Row: {
          accessed_at: string
          agent_id: string | null
          created_at: string | null
          file_id: string | null
          id: string
          metadata: Json | null
          operation: string
        }
        Insert: {
          accessed_at: string
          agent_id?: string | null
          created_at?: string | null
          file_id?: string | null
          id?: string
          metadata?: Json | null
          operation: string
        }
        Update: {
          accessed_at?: string
          agent_id?: string | null
          created_at?: string | null
          file_id?: string | null
          id?: string
          metadata?: Json | null
          operation?: string
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
          },
        ]
      }
      agent_market_data_subscriptions: {
        Row: {
          agent_id: string | null
          created_at: string | null
          data_type: string
          id: string
          interval: string
          is_active: boolean | null
          last_updated: string | null
          source: string
          symbol: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          data_type: string
          id?: string
          interval: string
          is_active?: boolean | null
          last_updated?: string | null
          source: string
          symbol: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          data_type?: string
          id?: string
          interval?: string
          is_active?: boolean | null
          last_updated?: string | null
          source?: string
          symbol?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      agent_performance: {
        Row: {
          agent_id: string | null
          created_at: string | null
          date: string
          failed_trades: number | null
          id: string
          max_drawdown: number | null
          sharpe_ratio: number | null
          successful_trades: number | null
          total_profit_loss: number | null
          total_trades: number | null
          updated_at: string | null
          user_id: string | null
          win_rate: number | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          date: string
          failed_trades?: number | null
          id?: string
          max_drawdown?: number | null
          sharpe_ratio?: number | null
          successful_trades?: number | null
          total_profit_loss?: number | null
          total_trades?: number | null
          updated_at?: string | null
          user_id?: string | null
          win_rate?: number | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          date?: string
          failed_trades?: number | null
          id?: string
          max_drawdown?: number | null
          sharpe_ratio?: number | null
          successful_trades?: number | null
          total_profit_loss?: number | null
          total_trades?: number | null
          updated_at?: string | null
          user_id?: string | null
          win_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_performance_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_trading_permissions"
            referencedColumns: ["agent_id"]
          },
        ]
      }
      agent_permissions: {
        Row: {
          agent_id: string
          allowed_markets: string[] | null
          created_at: string | null
          data_access_level: string
          max_trade_size: number
          risk_level: string
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          allowed_markets?: string[] | null
          created_at?: string | null
          data_access_level?: string
          max_trade_size?: number
          risk_level?: string
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          allowed_markets?: string[] | null
          created_at?: string | null
          data_access_level?: string
          max_trade_size?: number
          risk_level?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      agent_positions: {
        Row: {
          account_id: string
          agent_id: string | null
          average_price: number
          current_price: number | null
          id: string
          opened_at: string | null
          quantity: number
          realized_pnl: number | null
          symbol: string
          unrealized_pnl: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          account_id: string
          agent_id?: string | null
          average_price: number
          current_price?: number | null
          id?: string
          opened_at?: string | null
          quantity: number
          realized_pnl?: number | null
          symbol: string
          unrealized_pnl?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          account_id?: string
          agent_id?: string | null
          average_price?: number
          current_price?: number | null
          id?: string
          opened_at?: string | null
          quantity?: number
          realized_pnl?: number | null
          symbol?: string
          unrealized_pnl?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_positions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_trading_permissions"
            referencedColumns: ["agent_id"]
          },
        ]
      }
      agent_state: {
        Row: {
          agent_id: string
          context: Json | null
          created_at: string | null
          last_checkpoint: string | null
          last_state_update: string | null
          state: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_id: string
          context?: Json | null
          created_at?: string | null
          last_checkpoint?: string | null
          last_state_update?: string | null
          state?: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string
          context?: Json | null
          created_at?: string | null
          last_checkpoint?: string | null
          last_state_update?: string | null
          state?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      agent_status: {
        Row: {
          agent_id: string
          cpu_usage: number | null
          created_at: string | null
          health_score: number | null
          last_activity: string | null
          last_error: string | null
          memory_usage: number | null
          restart_count: number | null
          status: string
          updated_at: string | null
          uptime: number | null
          user_id: string
        }
        Insert: {
          agent_id: string
          cpu_usage?: number | null
          created_at?: string | null
          health_score?: number | null
          last_activity?: string | null
          last_error?: string | null
          memory_usage?: number | null
          restart_count?: number | null
          status: string
          updated_at?: string | null
          uptime?: number | null
          user_id: string
        }
        Update: {
          agent_id?: string
          cpu_usage?: number | null
          created_at?: string | null
          health_score?: number | null
          last_activity?: string | null
          last_error?: string | null
          memory_usage?: number | null
          restart_count?: number | null
          status?: string
          updated_at?: string | null
          uptime?: number | null
          user_id?: string
        }
        Relationships: []
      }
      agent_trades: {
        Row: {
          agent_id: string | null
          confidence_score: number | null
          created_at: string | null
          exchange: string
          executed_at: string | null
          id: string
          order_id: string
          order_type: string
          price: number
          quantity: number
          reasoning: string | null
          side: string
          status: string
          strategy: string | null
          symbol: string
          trade_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          exchange: string
          executed_at?: string | null
          id?: string
          order_id: string
          order_type: string
          price: number
          quantity: number
          reasoning?: string | null
          side: string
          status: string
          strategy?: string | null
          symbol: string
          trade_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          exchange?: string
          executed_at?: string | null
          id?: string
          order_id?: string
          order_type?: string
          price?: number
          quantity?: number
          reasoning?: string | null
          side?: string
          status?: string
          strategy?: string | null
          symbol?: string
          trade_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_trades_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_trading_permissions"
            referencedColumns: ["agent_id"]
          },
        ]
      }
      agent_trading_permissions: {
        Row: {
          account_id: string
          agent_id: string
          allowed_strategies: Json | null
          allowed_symbols: Json | null
          created_at: string | null
          is_active: boolean | null
          max_daily_trades: number | null
          max_position_size: number | null
          max_trade_size: number | null
          position_value: number | null
          risk_level: string | null
          trades_today: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          account_id: string
          agent_id: string
          allowed_strategies?: Json | null
          allowed_symbols?: Json | null
          created_at?: string | null
          is_active?: boolean | null
          max_daily_trades?: number | null
          max_position_size?: number | null
          max_trade_size?: number | null
          position_value?: number | null
          risk_level?: string | null
          trades_today?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          account_id?: string
          agent_id?: string
          allowed_strategies?: Json | null
          allowed_symbols?: Json | null
          created_at?: string | null
          is_active?: boolean | null
          max_daily_trades?: number | null
          max_position_size?: number | null
          max_trade_size?: number | null
          position_value?: number | null
          risk_level?: string | null
          trades_today?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      file_access_permissions: {
        Row: {
          access_level: string
          agent_id: string | null
          created_at: string | null
          file_id: string | null
          granted_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          access_level?: string
          agent_id?: string | null
          created_at?: string | null
          file_id?: string | null
          granted_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          access_level?: string
          agent_id?: string | null
          created_at?: string | null
          file_id?: string | null
          granted_at?: string | null
          id?: string
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
          },
        ]
      }
      file_uploads: {
        Row: {
          content_type: string
          created_at: string | null
          data_format: string | null
          data_schema: Json | null
          description: string | null
          file_path: string
          file_size: number
          file_type: string
          filename: string
          id: string
          is_processed: boolean | null
          metadata: Json | null
          tags: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content_type: string
          created_at?: string | null
          data_format?: string | null
          data_schema?: Json | null
          description?: string | null
          file_path: string
          file_size: number
          file_type: string
          filename: string
          id?: string
          is_processed?: boolean | null
          metadata?: Json | null
          tags?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content_type?: string
          created_at?: string | null
          data_format?: string | null
          data_schema?: Json | null
          description?: string | null
          file_path?: string
          file_size?: number
          file_type?: string
          filename?: string
          id?: string
          is_processed?: boolean | null
          metadata?: Json | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          role: string | null
          settings: Json | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          role?: string | null
          settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          settings?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      strategy_performance: {
        Row: {
          average_loss: number | null
          average_profit: number | null
          created_at: string | null
          id: string
          last_updated: string | null
          loss_count: number | null
          max_drawdown: number | null
          profit_factor: number | null
          strategy_name: string
          symbol: string
          timeframe: string
          user_id: string | null
          win_count: number | null
        }
        Insert: {
          average_loss?: number | null
          average_profit?: number | null
          created_at?: string | null
          id?: string
          last_updated?: string | null
          loss_count?: number | null
          max_drawdown?: number | null
          profit_factor?: number | null
          strategy_name: string
          symbol: string
          timeframe: string
          user_id?: string | null
          win_count?: number | null
        }
        Update: {
          average_loss?: number | null
          average_profit?: number | null
          created_at?: string | null
          id?: string
          last_updated?: string | null
          loss_count?: number | null
          max_drawdown?: number | null
          profit_factor?: number | null
          strategy_name?: string
          symbol?: string
          timeframe?: string
          user_id?: string | null
          win_count?: number | null
        }
        Relationships: []
      }
      trading_config: {
        Row: {
          config_data: Json
          config_name: string
          created_at: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          config_data: Json
          config_name: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          config_data?: Json
          config_name?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      trading_signals: {
        Row: {
          created_at: string | null
          direction: string
          expires_at: string | null
          id: string
          indicators: Json | null
          is_active: boolean | null
          price_at_signal: number
          signal_type: string
          strength: number
          symbol: string
          timeframe: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          direction: string
          expires_at?: string | null
          id?: string
          indicators?: Json | null
          is_active?: boolean | null
          price_at_signal: number
          signal_type: string
          strength: number
          symbol: string
          timeframe: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          direction?: string
          expires_at?: string | null
          id?: string
          indicators?: Json | null
          is_active?: boolean | null
          price_at_signal?: number
          signal_type?: string
          strength?: number
          symbol?: string
          timeframe?: string
          user_id?: string | null
        }
        Relationships: []
      }
      uploaded_files: {
        Row: {
          content_type: string
          created_at: string | null
          data_format: string | null
          data_schema: Json | null
          description: string | null
          file_path: string
          file_size: number
          file_type: string
          filename: string
          id: string
          is_processed: boolean | null
          processed_by: string[] | null
          processing_results: Json | null
          tags: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content_type: string
          created_at?: string | null
          data_format?: string | null
          data_schema?: Json | null
          description?: string | null
          file_path: string
          file_size: number
          file_type: string
          filename: string
          id?: string
          is_processed?: boolean | null
          processed_by?: string[] | null
          processing_results?: Json | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content_type?: string
          created_at?: string | null
          data_format?: string | null
          data_schema?: Json | null
          description?: string | null
          file_path?: string
          file_size?: number
          file_type?: string
          filename?: string
          id?: string
          is_processed?: boolean | null
          processed_by?: string[] | null
          processing_results?: Json | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      aggregate_agent_daily_performance: {
        Args: { agent_id_param: string; date_param: string }
        Returns: undefined
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
