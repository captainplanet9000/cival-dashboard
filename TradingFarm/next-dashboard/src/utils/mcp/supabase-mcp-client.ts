/**
 * Supabase MCP Client
 * 
 * This utility provides a typed interface for interacting with the Supabase MCP server.
 */
import type { Database } from '@/types/database.types';

/**
 * Type definitions for MCP tool parameters
 */
export type McpToolParams = {
  run_query: {
    query?: string;
    table: string;
    select?: string;
    where?: Record<string, any>;
    order?: string;
    limit?: number;
  };
  insert_record: {
    table: string;
    data: Record<string, any>;
    returning?: string;
  };
  update_record: {
    table: string;
    data: Record<string, any>;
    where: Record<string, any>;
    returning?: string;
  };
  delete_record: {
    table: string;
    where: Record<string, any>;
    returning?: string;
  };
  run_sql: {
    sql: string;
  };
  sql_transaction: {
    statements: string[];
  };
  create_farm: {
    name: string;
    description?: string;
    user_id?: string;
  };
  create_agent: {
    name: string;
    farm_id: number;
    status?: string;
    type?: string;
    configuration?: Record<string, any>;
  };
  create_wallet: {
    name: string;
    address: string;
    balance?: number;
    farm_id?: number;
    user_id?: string;
  };
  record_transaction: {
    type: string;
    amount: number;
    wallet_id: number;
    farm_id?: number;
    status?: string;
  };
  get_farm_details: {
    farm_id: number;
  };
  run_migration: {
    sql: string;
  };
};

/**
 * Type definition for MCP tool response
 */
export type McpToolResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * A client for interacting with the Supabase MCP server
 */
export class SupabaseMcpClient {
  private serverUrl: string;
  
  constructor(serverUrl: string = '/api/mcp/supabase') {
    this.serverUrl = serverUrl;
  }
  
  /**
   * Execute an MCP tool
   */
  private async executeTool<T extends keyof McpToolParams>(
    tool: T,
    params: McpToolParams[T]
  ): Promise<McpToolResponse> {
    try {
      const response = await fetch(`${this.serverUrl}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool,
          params,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`MCP request failed: ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
  
  /**
   * Run a query against the Supabase database
   */
  async runQuery<T = any>(params: McpToolParams['run_query']): Promise<McpToolResponse<T[]>> {
    return this.executeTool('run_query', params) as Promise<McpToolResponse<T[]>>;
  }
  
  /**
   * Insert a record into a Supabase table
   */
  async insertRecord<T = any>(params: McpToolParams['insert_record']): Promise<McpToolResponse<T>> {
    return this.executeTool('insert_record', params) as Promise<McpToolResponse<T>>;
  }
  
  /**
   * Update records in a Supabase table
   */
  async updateRecord<T = any>(params: McpToolParams['update_record']): Promise<McpToolResponse<T>> {
    return this.executeTool('update_record', params) as Promise<McpToolResponse<T>>;
  }
  
  /**
   * Delete records from a Supabase table
   */
  async deleteRecord<T = any>(params: McpToolParams['delete_record']): Promise<McpToolResponse<T>> {
    return this.executeTool('delete_record', params) as Promise<McpToolResponse<T>>;
  }
  
  /**
   * Execute a raw SQL query on the Supabase database
   */
  async runSql<T = any>(sql: string): Promise<McpToolResponse<T>> {
    return this.executeTool('run_sql', { sql }) as Promise<McpToolResponse<T>>;
  }
  
  /**
   * Create a new farm in the Trading Farm system
   */
  async createFarm(params: McpToolParams['create_farm']): Promise<McpToolResponse<Database['public']['Tables']['farms']['Row']>> {
    return this.executeTool('create_farm', params) as Promise<McpToolResponse<Database['public']['Tables']['farms']['Row']>>;
  }
  
  /**
   * Create a new agent in the Trading Farm system
   */
  async createAgent(params: McpToolParams['create_agent']): Promise<McpToolResponse<Database['public']['Tables']['agents']['Row']>> {
    return this.executeTool('create_agent', params) as Promise<McpToolResponse<Database['public']['Tables']['agents']['Row']>>;
  }
  
  /**
   * Create a new wallet in the Trading Farm system
   */
  async createWallet(params: McpToolParams['create_wallet']): Promise<McpToolResponse<Database['public']['Tables']['wallets']['Row']>> {
    return this.executeTool('create_wallet', params) as Promise<McpToolResponse<Database['public']['Tables']['wallets']['Row']>>;
  }
  
  /**
   * Record a transaction in the Trading Farm system
   */
  async recordTransaction(params: McpToolParams['record_transaction']): Promise<McpToolResponse<Database['public']['Tables']['transactions']['Row']>> {
    return this.executeTool('record_transaction', params) as Promise<McpToolResponse<Database['public']['Tables']['transactions']['Row']>>;
  }
  
  /**
   * Get detailed information about a farm including its agents and wallets
   */
  async getFarmDetails(farmId: number): Promise<McpToolResponse<{
    farm: Database['public']['Tables']['farms']['Row'];
    agents: Database['public']['Tables']['agents']['Row'][];
    wallets: Database['public']['Tables']['wallets']['Row'][];
  }>> {
    return this.executeTool('get_farm_details', { farm_id: farmId }) as Promise<McpToolResponse<any>>;
  }
  
  /**
   * Run a database migration SQL script
   */
  async runMigration(sql: string): Promise<McpToolResponse<any>> {
    return this.executeTool('run_migration', { sql }) as Promise<McpToolResponse<any>>;
  }
  
  /**
   * Execute a SQL transaction with multiple statements
   */
  async runSqlTransaction(params: { statements: string[] }): Promise<McpToolResponse<any>> {
    return this.executeTool('sql_transaction', params) as Promise<McpToolResponse<any>>;
  }
}

// Singleton instance for application-wide use
let mcpClient: SupabaseMcpClient | null = null;

/**
 * Get the Supabase MCP client instance
 */
export function getSupabaseMcpClient(serverUrl?: string): SupabaseMcpClient {
  if (!mcpClient) {
    mcpClient = new SupabaseMcpClient(serverUrl);
  }
  return mcpClient;
}

export default getSupabaseMcpClient;
