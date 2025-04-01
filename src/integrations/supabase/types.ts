export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Strategy type definitions
export type StrategyStatus = 'draft' | 'active' | 'paused' | 'archived' | 'backtesting' | 'optimizing';
export type StrategyType = 'momentum' | 'mean_reversion' | 'breakout' | 'trend_following' | 'arbitrage' | 'grid' | 'martingale' | 'custom';
export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';

// Strategy parameter definitions
export type EntryCondition = {
  type: string;
  params: Record<string, any>;
  description?: string;
};

export type ExitCondition = {
  type: string;
  params: Record<string, any>;
  description?: string;
};

export type RiskManagement = {
  stopLoss?: number | null;
  takeProfit?: number | null;
  trailingStop?: number | null;
  maxDrawdown?: number | null;
  positionSizing?: string | null;
  maxPositions?: number | null;
};

export type StrategyParameters = {
  timeframe?: Timeframe;
  markets?: string[];
  indicators?: Record<string, any>[];
  leverage?: number;
  customParams?: Record<string, any>;
};

export type PerformanceMetrics = {
  winRate?: number;
  profitFactor?: number;
  sharpeRatio?: number;
  maxDrawdown?: number;
  totalTrades?: number;
  profitableTrades?: number;
  averageProfit?: number;
  averageLoss?: number;
  expectancy?: number;
  annualizedReturn?: number;
};

export type Database = {
  public: {
    Tables: {
      documents: {
        Row: {
          content: string | null
          embedding: string | null
          id: number
          metadata: Json | null
        }
        Insert: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Update: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Relationships: []
      }
      Logs: {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id?: number
        }
        Update: {
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      trading_strategies: {
        Row: {
          content: string | null
          created_at: string
          id: number
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: number
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      Trading_strategies_algo: {
        Row: {
          content: string | null
          embedding: string | null
          id: number
          metadata: Json | null
        }
        Insert: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Update: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Relationships: []
      },
      // New enhanced strategy tables
      strategies: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
          status: StrategyStatus
          strategy_type: StrategyType
          version: string
          creator_id: string | null
          is_public: boolean
          code: string | null
          entry_conditions: EntryCondition[]
          exit_conditions: ExitCondition[]
          risk_management: RiskManagement
          parameters: StrategyParameters
          performance_metrics: PerformanceMetrics | null
          tags: string[] | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
          status?: StrategyStatus
          strategy_type: StrategyType
          version?: string
          creator_id?: string | null
          is_public?: boolean
          code?: string | null
          entry_conditions?: EntryCondition[]
          exit_conditions?: ExitCondition[]
          risk_management?: RiskManagement
          parameters?: StrategyParameters
          performance_metrics?: PerformanceMetrics | null
          tags?: string[] | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
          status?: StrategyStatus
          strategy_type?: StrategyType
          version?: string
          creator_id?: string | null
          is_public?: boolean
          code?: string | null
          entry_conditions?: EntryCondition[]
          exit_conditions?: ExitCondition[]
          risk_management?: RiskManagement
          parameters?: StrategyParameters
          performance_metrics?: PerformanceMetrics | null
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "strategies_creator_id_fkey"
            columns: ["creator_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      },
      strategy_versions: {
        Row: {
          id: string
          strategy_id: string
          version: string
          created_at: string
          code: string | null
          entry_conditions: EntryCondition[]
          exit_conditions: ExitCondition[]
          risk_management: RiskManagement
          parameters: StrategyParameters
          change_notes: string | null
          performance_metrics: PerformanceMetrics | null
        }
        Insert: {
          id?: string
          strategy_id: string
          version: string
          created_at?: string
          code?: string | null
          entry_conditions?: EntryCondition[]
          exit_conditions?: ExitCondition[]
          risk_management?: RiskManagement
          parameters?: StrategyParameters
          change_notes?: string | null
          performance_metrics?: PerformanceMetrics | null
        }
        Update: {
          id?: string
          strategy_id?: string
          version?: string
          created_at?: string
          code?: string | null
          entry_conditions?: EntryCondition[]
          exit_conditions?: ExitCondition[]
          risk_management?: RiskManagement
          parameters?: StrategyParameters
          change_notes?: string | null
          performance_metrics?: PerformanceMetrics | null
        }
        Relationships: [
          {
            foreignKeyName: "strategy_versions_strategy_id_fkey"
            columns: ["strategy_id"]
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          }
        ]
      },
      strategy_backtests: {
        Row: {
          id: string
          strategy_id: string
          strategy_version: string
          created_at: string
          timeframe: Timeframe
          start_date: string
          end_date: string
          market: string
          initial_capital: number
          results: Json
          metrics: Json
        }
        Insert: {
          id?: string
          strategy_id: string
          strategy_version: string
          created_at?: string
          timeframe: Timeframe
          start_date: string
          end_date: string
          market: string
          initial_capital: number
          results: Json
          metrics: Json
        }
        Update: {
          id?: string
          strategy_id?: string
          strategy_version?: string
          created_at?: string
          timeframe?: Timeframe
          start_date?: string
          end_date?: string
          market?: string
          initial_capital?: number
          results?: Json
          metrics?: Json
        }
        Relationships: [
          {
            foreignKeyName: "strategy_backtests_strategy_id_fkey"
            columns: ["strategy_id"]
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_strategy_version"
            columns: ["strategy_id", "strategy_version"]
            referencedRelation: "strategy_versions"
            referencedColumns: ["strategy_id", "version"]
          }
        ]
      },
      agent_strategies: {
        Row: {
          id: string
          agent_id: string
          strategy_id: string
          created_at: string
          updated_at: string
          is_active: boolean
          config: Json
          performance_metrics: PerformanceMetrics | null
        }
        Insert: {
          id?: string
          agent_id: string
          strategy_id: string
          created_at?: string
          updated_at?: string
          is_active?: boolean
          config?: Json
          performance_metrics?: PerformanceMetrics | null
        }
        Update: {
          id?: string
          agent_id?: string
          strategy_id?: string
          created_at?: string
          updated_at?: string
          is_active?: boolean
          config?: Json
          performance_metrics?: PerformanceMetrics | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_strategies_strategy_id_fkey"
            columns: ["strategy_id"]
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          }
        ]
      },
      farm_strategies: {
        Row: {
          id: string
          farm_id: string
          strategy_id: string
          agent_id: string | null
          created_at: string
          updated_at: string
          allocation: number
          is_active: boolean
          config: Json
          performance_metrics: PerformanceMetrics | null
        }
        Insert: {
          id?: string
          farm_id: string
          strategy_id: string
          agent_id?: string | null
          created_at?: string
          updated_at?: string
          allocation?: number
          is_active?: boolean
          config?: Json
          performance_metrics?: PerformanceMetrics | null
        }
        Update: {
          id?: string
          farm_id?: string
          strategy_id?: string
          agent_id?: string | null
          created_at?: string
          updated_at?: string
          allocation?: number
          is_active?: boolean
          config?: Json
          performance_metrics?: PerformanceMetrics | null
        }
        Relationships: [
          {
            foreignKeyName: "farm_strategies_strategy_id_fkey"
            columns: ["strategy_id"]
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      strategy_performance: {
        Row: {
          id: string
          name: string
          strategy_type: StrategyType
          status: StrategyStatus
          version: string
          performance_metrics: PerformanceMetrics | null
          farm_count: number
          agent_count: number
          backtest_count: number
        }
        Relationships: [
          {
            foreignKeyName: "strategies_id_fkey"
            columns: ["id"]
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Functions: {
      binary_quantize:
        | {
            Args: {
              "": string
            }
            Returns: unknown
          }
        | {
            Args: {
              "": unknown
            }
            Returns: unknown
          }
      halfvec_avg: {
        Args: {
          "": number[]
        }
        Returns: unknown
      }
      halfvec_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      halfvec_send: {
        Args: {
          "": unknown
        }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: {
          "": unknown[]
        }
        Returns: number
      }
      hnsw_bit_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      hnswhandler: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ivfflathandler: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      l2_norm:
        | {
            Args: {
              "": unknown
            }
            Returns: number
          }
        | {
            Args: {
              "": unknown
            }
            Returns: number
          }
      match_documents: {
        Args: {
          query_embedding: string
          match_count?: number
          filter?: Json
        }
        Returns: {
          id: number
          content: string
          metadata: Json
          similarity: number
        }[]
      }
      reset_global_wal_function: {
        Args: Record<PropertyKey, never>
        Returns: Record<PropertyKey, never>
      }
      reset_meta_wal_function: {
        Args: {
          "": string
        }
        Returns: Record<PropertyKey, never>
      }
      sparsevec_in: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      sparsevec_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      sparsevec_send: {
        Args: {
          "": unknown
        }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: {
          "": unknown[]
        }
        Returns: number
      }
      vector_accum: {
        Args: {
          "": number[]
        }
        Returns: unknown
      }
      vector_add: {
        Args: {
          "": number[]
        }
        Returns: unknown
      }
      vector_avg: {
        Args: {
          "": unknown
        }
        Returns: number[]
      }
      vector_cmp: {
        Args: {
          "": unknown
        }
        Returns: number
      }
      vector_combine: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      vector_dims: {
        Args: {
          "": unknown
        }
        Returns: number
      }
      vector_eq: {
        Args: {
          "": unknown
        }
        Returns: boolean
      }
      vector_ge: {
        Args: {
          "": unknown
        }
        Returns: boolean
      }
      vector_gt: {
        Args: {
          "": unknown
        }
        Returns: boolean
      }
      vector_in: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      vector_l1_distance: {
        Args: {
          "": unknown
        }
        Returns: number
      }
      vector_l2_distance: {
        Args: {
          "": unknown
        }
        Returns: number
      }
      vector_le: {
        Args: {
          "": unknown
        }
        Returns: boolean
      }
      vector_lt: {
        Args: {
          "": unknown
        }
        Returns: boolean
      }
      vector_ne: {
        Args: {
          "": unknown
        }
        Returns: boolean
      }
      vector_negative_inner_product: {
        Args: {
          "": unknown
        }
        Returns: number
      }
      vector_norm: {
        Args: {
          "": unknown
        }
        Returns: number
      }
      vector_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      vector_send: {
        Args: {
          "": unknown
        }
        Returns: string
      }
      vector_spherical_distance: {
        Args: {
          "": unknown
        }
        Returns: number
      }
      vector_sub: {
        Args: {
          "": number[]
        }
        Returns: unknown
      }
      vector_typmod_in: {
        Args: {
          "": unknown[]
        }
        Returns: number
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