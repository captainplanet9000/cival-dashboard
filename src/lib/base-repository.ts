import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Query options interface for repository queries
 */
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  [key: string]: any;
}

/**
 * Base repository class for database operations
 */
export abstract class BaseRepository<T> {
  protected client: SupabaseClient;
  protected tableName: string;
  protected defaultLimit: number = 50;
  
  constructor(tableName: string, client: SupabaseClient) {
    this.tableName = tableName;
    this.client = client;
  }
  
  /**
   * Get all entities
   */
  async getAll(options: QueryOptions = {}): Promise<T[]> {
    let query = this.client
      .from(this.tableName)
      .select('*');
    
    // Apply limit and offset
    if (options.limit) {
      query = query.limit(options.limit);
    } else {
      query = query.limit(this.defaultLimit);
    }
    
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || this.defaultLimit) - 1);
    }
    
    // Apply ordering
    if (options.orderBy) {
      const direction = options.orderDirection || 'desc';
      query = query.order(options.orderBy, { ascending: direction === 'asc' });
    }
    
    const { data, error } = await query;
    
    if (error) {
      this.handleError(error);
      return [];
    }
    
    return data as T[];
  }
  
  /**
   * Get an entity by ID
   */
  async getById(id: string | number): Promise<T | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      this.handleError(error);
      return null;
    }
    
    return data as T;
  }
  
  /**
   * Create a new entity
   */
  async create(entity: Partial<T>): Promise<T | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .insert(entity)
      .select()
      .single();
    
    if (error) {
      this.handleError(error);
      return null;
    }
    
    return data as T;
  }
  
  /**
   * Update an entity
   */
  async update(id: string | number, updates: Partial<T>): Promise<T | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      this.handleError(error);
      return null;
    }
    
    return data as T;
  }
  
  /**
   * Delete an entity
   */
  async delete(id: string | number): Promise<boolean> {
    const { error } = await this.client
      .from(this.tableName)
      .delete()
      .eq('id', id);
    
    if (error) {
      this.handleError(error);
      return false;
    }
    
    return true;
  }
  
  /**
   * Handle database errors
   */
  protected handleError(error: any): void {
    console.error(`Database error in ${this.tableName} repository:`, error);
    
    // In a production environment, you might want to send errors to a monitoring service
    // or handle specific errors differently
  }
} 