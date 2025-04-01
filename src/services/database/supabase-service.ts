import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  success: boolean;
}

/**
 * Singleton service for Supabase database operations
 * Provides a unified interface for database operations with error handling
 */
export class SupabaseService {
  private supabase;
  private static instance: SupabaseService;

  private constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY!;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and key must be provided');
    }
    
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  /**
   * Get the raw Supabase client
   */
  public getClient() {
    return this.supabase;
  }

  /**
   * Fetch data with error handling
   */
  async fetch<T = any>(
    table: string,
    select = '*',
    options?: {
      eq?: Record<string, any>;
      order?: { column: string; ascending?: boolean };
      limit?: number;
      single?: boolean;
    }
  ): Promise<ApiResponse<T>> {
    try {
      let query = this.supabase.from(table).select(select);

      // Apply equals conditions
      if (options?.eq) {
        for (const [column, value] of Object.entries(options.eq)) {
          if (value !== undefined) {
            query = query.eq(column, value);
          }
        }
      }

      // Apply ordering
      if (options?.order) {
        query = query.order(options.order.column, { ascending: options.order.ascending !== false });
      }

      // Apply limit
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      // Get results
      const { data, error } = options?.single 
        ? await query.single() 
        : await query;

      if (error) throw error;
      
      return { data: data as T, success: true };
    } catch (err) {
      console.error(`Error fetching from ${table}:`, err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'An unexpected database error occurred'
      };
    }
  }

  /**
   * Insert data with error handling
   */
  async create<T = any>(
    table: string,
    data: any,
    options?: {
      returning?: string;
      single?: boolean;
    }
  ): Promise<ApiResponse<T>> {
    try {
      const { data: result, error } = await this.supabase
        .from(table)
        .insert(data)
        .select(options?.returning || '*');

      if (error) throw error;
      
      const returnData = options?.single && Array.isArray(result) && result.length > 0
        ? result[0]
        : result;
        
      return { 
        data: returnData as T, 
        success: true 
      };
    } catch (err) {
      console.error(`Error creating in ${table}:`, err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'An unexpected database error occurred'
      };
    }
  }

  /**
   * Update data with error handling
   */
  async update<T = any>(
    table: string,
    data: any,
    conditions: Record<string, any>,
    options?: {
      returning?: string;
      single?: boolean;
    }
  ): Promise<ApiResponse<T>> {
    try {
      let query = this.supabase
        .from(table)
        .update(data);
      
      // Apply conditions
      for (const [column, value] of Object.entries(conditions)) {
        if (value !== undefined) {
          query = query.eq(column, value);
        }
      }
      
      // Add returning selection
      const { data: result, error } = await query.select(options?.returning || '*');

      if (error) throw error;
      
      const returnData = options?.single && Array.isArray(result) && result.length > 0
        ? result[0]
        : result;
        
      return { 
        data: returnData as T, 
        success: true 
      };
    } catch (err) {
      console.error(`Error updating in ${table}:`, err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'An unexpected database error occurred'
      };
    }
  }

  /**
   * Delete data with error handling
   */
  async remove<T = any>(
    table: string,
    conditions: Record<string, any>,
    options?: {
      returning?: string;
    }
  ): Promise<ApiResponse<T>> {
    try {
      let query = this.supabase
        .from(table)
        .delete();
      
      // Apply conditions
      for (const [column, value] of Object.entries(conditions)) {
        if (value !== undefined) {
          query = query.eq(column, value);
        }
      }
      
      // Add returning selection if requested
      if (options?.returning) {
        query = query.select(options.returning);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      return { data: data as T, success: true };
    } catch (err) {
      console.error(`Error removing from ${table}:`, err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'An unexpected database error occurred'
      };
    }
  }

  /**
   * Set up a subscription to real-time changes
   */
  subscribe(
    table: string,
    callback: (payload: any) => void,
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*' = '*'
  ): () => void {
    const channelName = `public:${table}:${event.toLowerCase()}`;
    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table
        },
        callback
      )
      .subscribe();

    return () => {
      this.supabase.removeChannel(channel);
    };
  }
}