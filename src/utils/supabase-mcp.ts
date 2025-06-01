/**
 * Utility class for interacting with Supabase through MCP
 */

const SUPABASE_MCP_URL = 'https://mcp.composio.dev/supabase/ancient-brash-planet-yjteSe';

interface QueryParams {
  table: string;
  select?: string;
  where?: Record<string, any>;
  order?: string;
  limit?: number;
  offset?: number;
}

interface InsertParams<T> {
  table: string;
  data: Partial<T> | Partial<T>[];
  returning?: string;
}

interface UpdateParams<T> {
  table: string;
  data: Partial<T>;
  where: Record<string, any>;
  returning?: string;
}

interface DeleteParams {
  table: string;
  where: Record<string, any>;
  returning?: string;
}

// Define the MCP response type to avoid conflicts with imported types
interface McpApiResponse<T = any> {
  data?: T;
  error?: string;
}

export class SupabaseMcp {
  /**
   * Fetch data from Supabase via MCP
   */
  static async query<T = any>(params: QueryParams): Promise<McpApiResponse<T[]>> {
    try {
      const response = await fetch(`${SUPABASE_MCP_URL}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          table: params.table,
          select: params.select || '*',
          where: params.where || {},
          order: params.order,
          limit: params.limit,
          offset: params.offset
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('Supabase MCP query error:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }

  /**
   * Insert data into Supabase via MCP
   */
  static async insert<T = any>(params: InsertParams<T>): Promise<McpApiResponse<T>> {
    try {
      const response = await fetch(`${SUPABASE_MCP_URL}/insert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          table: params.table,
          data: params.data,
          returning: params.returning || '*'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      return { data: Array.isArray(data) && data.length === 1 ? data[0] : data };
    } catch (error) {
      console.error('Supabase MCP insert error:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }

  /**
   * Update data in Supabase via MCP
   */
  static async update<T = any>(params: UpdateParams<T>): Promise<McpApiResponse<T>> {
    try {
      const response = await fetch(`${SUPABASE_MCP_URL}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          table: params.table,
          data: params.data,
          where: params.where,
          returning: params.returning || '*'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      return { data: Array.isArray(data) && data.length === 1 ? data[0] : data };
    } catch (error) {
      console.error('Supabase MCP update error:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }

  /**
   * Delete data from Supabase via MCP
   */
  static async delete<T = any>(params: DeleteParams): Promise<McpApiResponse<T>> {
    try {
      const response = await fetch(`${SUPABASE_MCP_URL}/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          table: params.table,
          where: params.where,
          returning: params.returning || '*'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      return { data: Array.isArray(data) && data.length === 1 ? data[0] : data };
    } catch (error) {
      console.error('Supabase MCP delete error:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }

  /**
   * Execute a stored procedure in Supabase via MCP
   */
  static async rpc<T = any>(functionName: string, params: Record<string, any> = {}): Promise<McpApiResponse<T>> {
    try {
      const response = await fetch(`${SUPABASE_MCP_URL}/rpc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          function: functionName,
          params: params
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('Supabase MCP RPC error:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }

  /**
   * Execute a raw SQL query in Supabase via MCP (admin only)
   */
  static async rawQuery<T = any>(sql: string, params: any[] = []): Promise<McpApiResponse<T[]>> {
    try {
      const response = await fetch(`${SUPABASE_MCP_URL}/sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: sql,
          params: params
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('Supabase MCP raw SQL error:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }

  /**
   * Run a custom SQL query
   */
  static async sql<T = any>(sql: string): Promise<McpApiResponse<T[]>> {
    try {
      const response = await fetch(SUPABASE_MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'run_sql',
          params: { sql }
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to run SQL query');
      }
      
      return { data: result.data };
    } catch (error) {
      console.error('Error running SQL query:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }

  /**
   * Run multiple SQL statements in a transaction
   */
  static async transaction<T = any>(statements: string[]): Promise<McpApiResponse<T>> {
    try {
      const response = await fetch(SUPABASE_MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'sql_transaction',
          params: { statements }
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to run SQL transaction');
      }
      
      return { data: result.data };
    } catch (error) {
      console.error('Error running SQL transaction:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }

  /**
   * Create a new farm
   */
  static async createFarm<T = any>(params: {
    name: string;
    description?: string;
    user_id?: string;
  }): Promise<McpApiResponse<T>> {
    try {
      const response = await fetch(SUPABASE_MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'create_farm',
          params
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create farm');
      }
      
      return { data: result.data };
    } catch (error) {
      console.error('Error creating farm:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }

  /**
   * Create a new agent for a farm
   */
  static async createAgent<T = any>(params: {
    name: string;
    farm_id: number;
    status?: string;
    type?: string;
    configuration?: Record<string, any>;
  }): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(SUPABASE_MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'create_agent',
          params
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create agent');
      }
      
      return { data: result.data };
    } catch (error) {
      console.error('Error creating agent:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }

  /**
   * Create a new wallet
   */
  static async createWallet<T = any>(params: {
    name: string;
    address: string;
    balance?: number;
    farm_id?: number;
    user_id?: string;
  }): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(SUPABASE_MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'create_wallet',
          params
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create wallet');
      }
      
      return { data: result.data };
    } catch (error) {
      console.error('Error creating wallet:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }

  /**
   * Record a transaction
   */
  static async recordTransaction<T = any>(params: {
    type: string;
    amount: number;
    wallet_id: number;
    farm_id?: number;
    status?: string;
  }): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(SUPABASE_MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'record_transaction',
          params
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to record transaction');
      }
      
      return { data: result.data };
    } catch (error) {
      console.error('Error recording transaction:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }

  /**
   * Get farm details
   */
  static async getFarmDetails<T = any>(params: {
    farm_id: number;
  }): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(SUPABASE_MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'get_farm_details',
          params
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to get farm details');
      }
      
      return { data: result.data };
    } catch (error) {
      console.error('Error getting farm details:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }

  /**
   * Run a database migration
   */
  static async runMigration(sql: string): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(SUPABASE_MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'run_migration',
          params: { sql }
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to run migration');
      }
      
      return { data: undefined };
    } catch (error) {
      console.error('Error running migration:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }
} 