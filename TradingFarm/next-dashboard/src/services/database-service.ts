/**
 * Database Service
 * 
 * Provides unified access to Supabase database with proper typing
 * Enforces best practices for database access across the application
 */

import { createServerClient } from '@/utils/supabase/server';
import { createBrowserClient } from '@/utils/supabase/client';
import { Database } from '@/types/database.types';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Extended interface to include additional functionality
export interface ExtendedDatabase extends Database {
  // Add any extended tables that might not be in the generated types
  // This allows us to handle tables added during development
}

export type Tables = Database['public']['Tables'];
export type TablesInsert<T extends keyof Tables> = Tables[T]['Insert'];
export type TablesUpdate<T extends keyof Tables> = Tables[T]['Update'];
export type TablesRow<T extends keyof Tables> = Tables[T]['Row'];

// Database service for consistent data access patterns
export class DatabaseService {
  private subscriptions: Map<string, RealtimeChannel> = new Map();
  
  /**
   * Get Supabase client (automatically detects server/client environment)
   */
  getClient() {
    if (typeof window === 'undefined') {
      return createServerClient();
    } else {
      return createBrowserClient();
    }
  }
  
  /**
   * Get the authenticated user ID (if logged in)
   */
  async getCurrentUserId(): Promise<string | null> {
    const supabase = this.getClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  }
  
  /**
   * Generic insert function with proper typing
   */
  async insert<T extends keyof Tables>(
    table: T,
    data: TablesInsert<T> | TablesInsert<T>[],
    options?: { returning?: 'minimal' | 'representation' }
  ) {
    const supabase = this.getClient();
    return supabase.from(table).insert(data, options);
  }
  
  /**
   * Generic update function with proper typing
   */
  async update<T extends keyof Tables>(
    table: T,
    data: TablesUpdate<T>,
    match: Partial<Record<keyof TablesRow<T>, any>>
  ) {
    const supabase = this.getClient();
    let query = supabase.from(table).update(data);
    
    // Apply all match conditions
    Object.entries(match).forEach(([column, value]) => {
      query = query.eq(column, value);
    });
    
    return query;
  }
  
  /**
   * Generic select function with proper typing
   */
  async select<T extends keyof Tables>(
    table: T,
    columns: string = '*', 
    match: Partial<Record<keyof TablesRow<T>, any>> = {},
    options: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      orderDirection?: 'asc' | 'desc';
    } = {}
  ) {
    const supabase = this.getClient();
    let query = supabase.from(table).select(columns);
    
    // Apply all match conditions
    Object.entries(match).forEach(([column, value]) => {
      query = query.eq(column, value);
    });
    
    // Apply pagination and sorting
    if (options.limit) query = query.limit(options.limit);
    if (options.offset) query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    if (options.orderBy) query = query.order(options.orderBy, { ascending: options.orderDirection === 'asc' });
    
    return query;
  }
  
  /**
   * Delete function with proper typing
   */
  async delete<T extends keyof Tables>(
    table: T,
    match: Partial<Record<keyof TablesRow<T>, any>>
  ) {
    const supabase = this.getClient();
    let query = supabase.from(table).delete();
    
    // Apply all match conditions
    Object.entries(match).forEach(([column, value]) => {
      query = query.eq(column, value);
    });
    
    return query;
  }
  
  /**
   * Subscribe to realtime changes on a table with filtering
   */
  async subscribeToTable<T extends keyof Tables>(
    table: T,
    callback: (payload: any) => void,
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*' = '*',
    filter?: Partial<Record<keyof TablesRow<T>, any>>
  ): Promise<string> {
    const supabase = this.getClient();
    const subscriptionId = `sub_${table}_${event}_${Date.now()}`;
    
    let channel = supabase
      .channel(subscriptionId)
      .on(
        'postgres_changes',
        { 
          event,
          schema: 'public',
          table
        },
        (payload) => {
          // Apply filter if provided
          if (filter) {
            const record = payload.new || payload.old;
            const matchesFilter = Object.entries(filter).every(
              ([key, value]) => record[key] === value
            );
            
            if (!matchesFilter) return;
          }
          
          callback(payload);
        }
      )
      .subscribe();
    
    this.subscriptions.set(subscriptionId, channel);
    return subscriptionId;
  }
  
  /**
   * Unsubscribe from a realtime subscription
   */
  async unsubscribe(subscriptionId: string): Promise<void> {
    const channel = this.subscriptions.get(subscriptionId);
    if (channel) {
      await channel.unsubscribe();
      this.subscriptions.delete(subscriptionId);
    }
  }
  
  /**
   * Execute RPC function with proper error handling
   */
  async rpc<T = any>(
    functionName: string,
    params: Record<string, any> = {}
  ): Promise<{
    data: T | null;
    error: Error | null;
  }> {
    try {
      const supabase = this.getClient();
      const { data, error } = await supabase.rpc(functionName, params);
      
      if (error) {
        console.error(`Error executing RPC function ${functionName}:`, error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (err: any) {
      console.error(`Exception in RPC function ${functionName}:`, err);
      return { data: null, error: err };
    }
  }
  
  /**
   * Check if a user has access to a specific record
   */
  async hasAccess<T extends keyof Tables>(
    table: T,
    recordId: string | number,
    operation: 'select' | 'update' | 'delete' = 'select'
  ): Promise<boolean> {
    try {
      const supabase = this.getClient();
      let query;
      
      switch (operation) {
        case 'select':
          query = await supabase.from(table).select('id').eq('id', recordId).single();
          break;
        case 'update':
          // Just test with a minimal update that won't change anything
          query = await supabase.from(table).update({ updated_at: undefined }).eq('id', recordId);
          break;
        case 'delete':
          // Use a transactional approach to check delete permission without actually deleting
          const { data, error } = await this.rpc('check_delete_permission', {
            p_table: table,
            p_id: recordId
          });
          return !error && !!data;
      }
      
      return !query.error;
    } catch (error) {
      console.error('Error checking access:', error);
      return false;
    }
  }
  
  /**
   * Generate proper TypeScript interface from a database table
   * Useful for development and debugging
   */
  async generateTypeScriptInterface(table: string): Promise<string> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', table);
    
    if (error || !data) {
      return `// Error generating interface: ${error?.message || 'Unknown error'}`;
    }
    
    const typeMap: Record<string, string> = {
      'integer': 'number',
      'bigint': 'number',
      'numeric': 'number',
      'text': 'string',
      'character varying': 'string',
      'boolean': 'boolean',
      'timestamp with time zone': 'string',
      'timestamp without time zone': 'string',
      'jsonb': 'Record<string, any>',
      'json': 'Record<string, any>',
      'uuid': 'string',
    };
    
    let interfaceText = `interface ${table.charAt(0).toUpperCase() + table.slice(1)} {\n`;
    data.forEach((column) => {
      const isNullable = column.is_nullable === 'YES' ? ' | null' : '';
      const tsType = typeMap[column.data_type] || 'any';
      interfaceText += `  ${column.column_name}: ${tsType}${isNullable};\n`;
    });
    interfaceText += '}\n';
    
    return interfaceText;
  }
}

// Export singleton instance
const databaseService = new DatabaseService();
export default databaseService;
