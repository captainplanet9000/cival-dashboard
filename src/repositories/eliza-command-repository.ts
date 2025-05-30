import { BaseRepository, QueryOptions } from '../lib/base-repository';
import { supabase } from '../integrations/supabase/client';

/**
 * ElizaOS Command entity
 */
export interface ElizaCommand {
  id: string;
  command: string;
  source: 'user' | 'agent' | 'system' | 'farm';
  agent_id?: string;
  farm_id?: string;
  context: Record<string, any>;
  response?: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  completed_at?: string;
  processing_time_ms?: number;
  created_at: string;
  updated_at: string;
}

/**
 * Extended query options for ElizaOS commands
 */
export interface ElizaCommandQueryOptions extends QueryOptions {
  source?: ElizaCommand['source'];
  status?: ElizaCommand['status'];
  agentId?: string;
  farmId?: string;
  fromDate?: string;
  toDate?: string;
  command?: string;
}

/**
 * Repository for ElizaOS commands
 */
export class ElizaCommandRepository extends BaseRepository<ElizaCommand> {
  constructor() {
    super('eliza_commands', supabase);
  }

  /**
   * Get all commands by agent ID
   */
  async getByAgentId(agentId: string, options: ElizaCommandQueryOptions = {}): Promise<ElizaCommand[]> {
    let query = this.client
      .from(this.tableName)
      .select('*')
      .eq('agent_id', agentId);
    
    query = this.applyElizaCommandFilters(query, options);
    
    const { data, error } = await query;
    
    if (error) {
      this.handleError(error);
      return [];
    }
    
    return data as ElizaCommand[];
  }

  /**
   * Get all commands by farm ID
   */
  async getByFarmId(farmId: string, options: ElizaCommandQueryOptions = {}): Promise<ElizaCommand[]> {
    let query = this.client
      .from(this.tableName)
      .select('*')
      .eq('farm_id', farmId);
    
    query = this.applyElizaCommandFilters(query, options);
    
    const { data, error } = await query;
    
    if (error) {
      this.handleError(error);
      return [];
    }
    
    return data as ElizaCommand[];
  }

  /**
   * Create a new ElizaOS command
   */
  async createCommand(command: Omit<ElizaCommand, 'id' | 'created_at' | 'updated_at'>): Promise<ElizaCommand | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .insert(command)
      .select()
      .single();
    
    if (error) {
      this.handleError(error);
      return null;
    }
    
    return data as ElizaCommand;
  }

  /**
   * Update command status
   */
  async updateStatus(
    id: string, 
    status: ElizaCommand['status'], 
    response?: Record<string, any>,
    processing_time_ms?: number
  ): Promise<ElizaCommand | null> {
    const updateData: Partial<ElizaCommand> = { status };
    
    if (response) {
      updateData.response = response;
    }
    
    if (status === 'completed' || status === 'failed') {
      updateData.completed_at = new Date().toISOString();
      if (processing_time_ms) {
        updateData.processing_time_ms = processing_time_ms;
      }
    }
    
    const { data, error } = await this.client
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      this.handleError(error);
      return null;
    }
    
    return data as ElizaCommand;
  }

  /**
   * Apply filters to ElizaOS command queries
   */
  private applyElizaCommandFilters(query: any, options: ElizaCommandQueryOptions): any {
    if (options.source) {
      query = query.eq('source', options.source);
    }
    
    if (options.status) {
      query = query.eq('status', options.status);
    }
    
    if (options.command) {
      query = query.ilike('command', `%${options.command}%`);
    }
    
    if (options.fromDate) {
      query = query.gte('created_at', options.fromDate);
    }
    
    if (options.toDate) {
      query = query.lte('created_at', options.toDate);
    }
    
    if (options.limit) {
      query = query.limit(options.limit);
    } else {
      query = query.limit(this.defaultLimit);
    }
    
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || this.defaultLimit) - 1);
    }
    
    if (options.orderBy) {
      const direction = options.orderDirection || 'desc';
      query = query.order(options.orderBy, { ascending: direction === 'asc' });
    } else {
      query = query.order('created_at', { ascending: false });
    }
    
    return query;
  }
} 