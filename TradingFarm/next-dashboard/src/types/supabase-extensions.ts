/**
 * Extended Database Type Definitions
 * 
 * This file extends the auto-generated types from Supabase to include:
 * 1. Additional tables not in the current schema but used in the application
 * 2. Virtual/calculated fields that don't exist in the actual database
 */

import { Database } from './database.types';
import type { PostgrestResponse } from '@supabase/supabase-js';

// Extended position type to include calculated fields not in the database schema
export interface ExtendedPosition extends Database['public']['Tables']['positions']['Row'] {
  unrealized_pnl_percentage?: number;
}

// Define the types for tables that are not in the current schema
interface AdditionalTables {
  position_adjustments: {
    Row: {
      id: string;
      position_id: string;
      type: string;
      quantity?: number;
      price?: number;
      status: 'pending' | 'approved' | 'rejected';
      metadata?: Record<string, any>;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      position_id: string;
      type: string;
      quantity?: number;
      price?: number;
      status?: 'pending' | 'approved' | 'rejected';
      metadata?: Record<string, any>;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      position_id?: string;
      type?: string;
      quantity?: number;
      price?: number;
      status?: 'pending' | 'approved' | 'rejected';
      metadata?: Record<string, any>;
      updated_at?: string;
    };
  };
  
  position_import_jobs: {
    Row: {
      id: string;
      farm_id: string;
      exchange: string;
      symbols: string[];
      status: 'pending' | 'processing' | 'completed' | 'failed';
      results?: Record<string, any>;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      farm_id: string;
      exchange: string;
      symbols: string[];
      status?: 'pending' | 'processing' | 'completed' | 'failed';
      results?: Record<string, any>;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      farm_id?: string;
      exchange?: string;
      symbols?: string[];
      status?: 'pending' | 'processing' | 'completed' | 'failed';
      results?: Record<string, any>;
      updated_at?: string;
    };
  };
  
  ai_insights: {
    Row: {
      id: string;
      reference_id: string;
      reference_type: 'position' | 'agent' | 'farm';
      insight_type: 'analysis' | 'recommendation' | 'alert';
      content: string;
      metadata?: Record<string, any>;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      reference_id: string;
      reference_type: 'position' | 'agent' | 'farm';
      insight_type: 'analysis' | 'recommendation' | 'alert';
      content: string;
      metadata?: Record<string, any>;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      reference_id?: string;
      reference_type?: 'position' | 'agent' | 'farm';
      insight_type?: 'analysis' | 'recommendation' | 'alert';
      content?: string;
      metadata?: Record<string, any>;
      updated_at?: string;
    };
  };
  
  position_reconciliation_logs: {
    Row: {
      id: string;
      position_id?: string | null;
      exchange: string;
      reconciliation_time: string;
      discrepancies_found: number;
      discrepancies_resolved: number;
      details: any;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      position_id?: string | null;
      exchange: string;
      reconciliation_time: string;
      discrepancies_found: number;
      discrepancies_resolved: number;
      details: any;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      position_id?: string | null;
      exchange?: string;
      reconciliation_time?: string;
      discrepancies_found?: number;
      discrepancies_resolved?: number;
      details?: any;
      updated_at?: string;
    };
  };
}

// Extend the base Database type with our additional tables
export interface ExtendedDatabase {
  public: {
    Tables: Database['public']['Tables'] & {
      position_adjustments: AdditionalTables['position_adjustments'];
      position_import_jobs: AdditionalTables['position_import_jobs'];
      ai_insights: AdditionalTables['ai_insights'];
      position_reconciliation_logs: AdditionalTables['position_reconciliation_logs'];
    };
    Views: Database['public']['Views'];
    Functions: Database['public']['Functions'];
    Enums: Database['public']['Enums'];
    CompositeTypes: Database['public']['CompositeTypes'];
  };
}

// Create a typed supabase client that uses the extended database types
export type ExtendedSupabaseClient = ReturnType<typeof createClient<ExtendedDatabase>>;

import { createClient } from '@supabase/supabase-js';
