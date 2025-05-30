export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/**
 * Exchange definition
 */
export interface Exchange {
  id: string;
  name: string;
  slug: string;
  description?: string;
  url?: string;
  logo_url?: string;
  api_url?: string;
  ws_url?: string;
  is_active: boolean;
  markets?: string[];
  trading_fees?: {
    maker: number;
    taker: number;
  };
  features?: string[];
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      // Exchange credentials table
      exchange_credentials: {
        Row: {
          id: number
          user_id: string
          exchange: string
          api_key_encrypted: string
          api_secret_encrypted: string
          passphrase: string | null
          is_active: boolean
          last_used: string | null
          last_failed: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          exchange: string
          api_key_encrypted: string
          api_secret_encrypted: string
          passphrase?: string | null
          is_active?: boolean
          last_used?: string | null
          last_failed?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          exchange?: string
          api_key_encrypted?: string
          api_secret_encrypted?: string
          passphrase?: string | null
          is_active?: boolean
          last_used?: string | null
          last_failed?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      
      // Wallet balances table
      wallet_balances: {
        Row: {
          id: number
          user_id: string
          exchange: string
          currency: string
          free: number
          locked: number
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          exchange: string
          currency: string
          free?: number
          locked?: number
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          exchange?: string
          currency?: string
          free?: number
          locked?: number
          updated_at?: string
        }
      }
      
      // Farms table
      farms: {
        Row: {
          id: string
          name: string
          description: string | null
          user_id: string
          status: string
          exchange_id: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          user_id: string
          status?: string
          exchange_id?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          user_id?: string
          status?: string
          exchange_id?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      
      // Other known tables would go here
      // This is a minimal definition to get started
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      handle_updated_at: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      handle_created_at: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
