import { apiClient } from './client';
import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';
import { Database, Json } from '@/types/database.types';
import { PerformanceMetrics, StrategyParameters } from '@/types/database-json.types';

// Strategy interfaces
export interface Strategy {
  id: string;
  name: string;
  type?: string;
  strategy_type: Database['public']['Enums']['strategy_type'];
  description: string | null;
  status: Database['public']['Enums']['strategy_status'];
  riskLevel?: 'Low' | 'Medium' | 'High';
  parameters: StrategyParameters | null;
  tradingPairs?: string[];
  performance?: {
    totalReturns?: number;
    successRate?: number;
    sharpeRatio?: number;
    maxDrawdown?: number;
    volatility?: number;
    winLossRatio?: number;
  };
  performance_metrics: PerformanceMetrics | null;
  created_at: string;
  updated_at: string;
  lastTested?: string;
  history?: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
  }>;
  code?: string | null;
  creator_id?: string | null;
  is_public: boolean;
  tags?: string[] | null;
  version: string;
  brain_id?: string | null;
  entry_conditions?: Json | null;
  exit_conditions?: Json | null;
  risk_management?: Json | null;
}

export interface CreateStrategyDto {
  name: string;
  strategy_type: Database['public']['Enums']['strategy_type'];
  description?: string | null;
  riskLevel?: Strategy['riskLevel'];
  parameters?: StrategyParameters;
  tradingPairs?: string[];
  is_public?: boolean;
  code?: string | null;
}

export interface UpdateStrategyDto {
  name?: string;
  description?: string | null;
  riskLevel?: Strategy['riskLevel'];
  parameters?: Partial<StrategyParameters>;
  tradingPairs?: string[];
  is_public?: boolean;
  code?: string | null;
  status?: Database['public']['Enums']['strategy_status'];
}

export interface StrategyPerformance {
  timeframe: string;
  data: Array<{
    timestamp: string;
    returns: number;
    drawdown: number;
    trades: number;
    winRate: number;
  }>;
}

export interface BacktestResult {
  strategyId: string;
  startDate: string;
  endDate: string;
  totalReturns: number;
  maxDrawdown: number;
  sharpeRatio: number;
  winRate: number;
  profitFactor: number;
  tradeCount: number;
  trades: Array<{
    timestamp: string;
    type: 'buy' | 'sell';
    price: number;
    size: number;
    pnl: number;
  }>;
}

// Interface matching the DB row + typed JSON
export type StrategyBasicInfo = Omit<Database['public']['Tables']['strategies']['Row'], 'parameters' | 'performance_metrics' | 'entry_conditions' | 'exit_conditions' | 'risk_management'> & {
  parameters: StrategyParameters | null;
  performance_metrics: PerformanceMetrics | null;
  // Keep other JSON fields as Json for now
  entry_conditions: Json | null;
  exit_conditions: Json | null;
  risk_management: Json | null;
};

// Strategy API class
export class StrategyApi {
  private static readonly BASE_PATH = '/strategies';

  // Get all strategies
  public static async getStrategies(params?: {
    status?: Strategy['status'];
    strategy_type?: Database['public']['Enums']['strategy_type'];
    riskLevel?: Strategy['riskLevel'];
  }): Promise<Strategy[]> {
    return apiClient.get(this.BASE_PATH, params);
  }

  // Get a single strategy by ID
  public static async getStrategy(id: string): Promise<Strategy> {
    return apiClient.get(`${this.BASE_PATH}/${id}`);
  }

  /**
   * Fetches recent, public strategies with basic info directly using the browser client.
   * @param limit Max number of strategies to return.
   * @returns Promise resolving to an array of strategies with basic info.
   */
  public static async fetchRecentStrategies(limit: number = 5): Promise<StrategyBasicInfo[]> {
    const supabase = createBrowserClient();
    const { data, error } = await supabase
      .from('strategies')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent strategies:', error);
      throw new Error(error.message || 'Failed to fetch recent strategies');
    }

    return (data || []).map(dbStrategy => {
       const strategyData = dbStrategy as any; // Use 'as any' for mapping robustness
       return {
         ...strategyData,
         // Ensure all fields from DB Row (Omit excluded ones) are present
         id: strategyData.id,
         name: strategyData.name,
         created_at: strategyData.created_at,
         updated_at: strategyData.updated_at,
         description: strategyData.description,
         status: strategyData.status,
         strategy_type: strategyData.strategy_type,
         version: strategyData.version,
         is_public: strategyData.is_public,
         creator_id: strategyData.creator_id,
         tags: strategyData.tags,
         code: strategyData.code,
         brain_id: strategyData.brain_id,
         // Explicitly cast the known JSON fields
         parameters: strategyData.parameters as StrategyParameters | null,
         performance_metrics: strategyData.performance_metrics as PerformanceMetrics | null,
         entry_conditions: strategyData.entry_conditions as Json | null,
         exit_conditions: strategyData.exit_conditions as Json | null,
         risk_management: strategyData.risk_management as Json | null,
       } as StrategyBasicInfo;
    });
  }

  /**
   * Creates a new strategy record directly using the server client.
   * Intended for server-side use.
   * @param data DTO containing necessary strategy creation data.
   * @returns Promise resolving to the newly created strategy's basic info.
   */
  public static async createStrategy(data: CreateStrategyDto): Promise<StrategyBasicInfo> {
    const supabase = createServerClient();

    // Prepare data for insertion, casting parameters JSON
    const parametersJson = data.parameters as unknown as Json | undefined;
    // Cast other potential JSON fields if they are part of CreateStrategyDto
    const entryConditionsJson = (data as any).entry_conditions as unknown as Json | undefined;
    const exitConditionsJson = (data as any).exit_conditions as unknown as Json | undefined;
    const riskManagementJson = (data as any).risk_management as unknown as Json | undefined;

    // Ensure required fields are present (adjust defaults as needed)
    const insertData: Database['public']['Tables']['strategies']['Insert'] = {
      name: data.name,
      strategy_type: data.strategy_type,
      description: data.description,
      parameters: parametersJson,
      is_public: data.is_public ?? false, // Default to false if not provided
      code: data.code,
      // Note: creator_id should likely be obtained from authenticated user on server
      // creator_id: getUserId(),
      status: 'draft', // Default status
      version: '1.0.0', // Default version
      entry_conditions: entryConditionsJson, // Add if part of DTO
      exit_conditions: exitConditionsJson, // Add if part of DTO
      risk_management: riskManagementJson, // Add if part of DTO
      performance_metrics: null, // Initialize performance metrics
    };

    const { data: newStrategyData, error: createError } = await supabase
      .from('strategies')
      .insert(insertData)
      .select()
      .single();

    if (createError) {
      console.error('Error creating new strategy:', createError);
      throw new Error(createError.message || 'Failed to create new strategy');
    }

    const newStrategy = newStrategyData as any; // Use any for mapping robustness
    return {
      ...newStrategy,
      parameters: newStrategy.parameters as StrategyParameters | null,
      performance_metrics: newStrategy.performance_metrics as PerformanceMetrics | null,
      entry_conditions: newStrategy.entry_conditions as Json | null,
      exit_conditions: newStrategy.exit_conditions as Json | null,
      risk_management: newStrategy.risk_management as Json | null,
    } as StrategyBasicInfo;
  }

  /**
   * Updates an existing strategy record directly using the server client.
   * Intended for server-side use.
   * @param id The UUID of the strategy to update.
   * @param data DTO containing updated strategy data.
   * @returns Promise resolving to the updated strategy's basic info.
   */
  public static async updateStrategy(id: string, data: UpdateStrategyDto): Promise<StrategyBasicInfo> {
    const supabase = createServerClient();

    const updateData: Database['public']['Tables']['strategies']['Update'] = { ...data };

    // Cast JSON fields if present in update data
    if (data.parameters) {
      updateData.parameters = data.parameters as unknown as Json;
    }
    if ((data as any).entry_conditions) {
      updateData.entry_conditions = (data as any).entry_conditions as unknown as Json;
    }
    if ((data as any).exit_conditions) {
      updateData.exit_conditions = (data as any).exit_conditions as unknown as Json;
    }
    if ((data as any).risk_management) {
      updateData.risk_management = (data as any).risk_management as unknown as Json;
    }
    // Remove fields not directly updatable or handled elsewhere
    delete (updateData as any).tradingPairs;
    delete (updateData as any).riskLevel;

    const { data: updatedStrategyData, error: updateError } = await supabase
      .from('strategies')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error(`Error updating strategy ${id}:`, updateError);
      throw new Error(updateError.message || 'Failed to update strategy');
    }

    const updatedStrategy = updatedStrategyData as any; // Use any for mapping robustness
    return {
      ...updatedStrategy,
      parameters: updatedStrategy.parameters as StrategyParameters | null,
      performance_metrics: updatedStrategy.performance_metrics as PerformanceMetrics | null,
      entry_conditions: updatedStrategy.entry_conditions as Json | null,
      exit_conditions: updatedStrategy.exit_conditions as Json | null,
      risk_management: updatedStrategy.risk_management as Json | null,
    } as StrategyBasicInfo;
  }

  /**
   * Deletes a strategy record directly using the server client.
   * Intended for server-side use.
   * @param id The UUID of the strategy to delete.
   * @returns Promise resolving when deletion is complete.
   */
  public static async deleteStrategy(id: string): Promise<void> {
    const supabase = createServerClient();
    const { error } = await supabase
      .from('strategies')
      .delete()
      .match({ id });

    if (error) {
      console.error(`Error deleting strategy ${id}:`, error);
      throw new Error(error.message || 'Failed to delete strategy');
    }
  }

  // Get strategy performance history
  public static async getStrategyPerformance(
    id: string,
    params?: {
      timeframe?: '1d' | '7d' | '30d' | '90d' | '1y';
      startDate?: string;
      endDate?: string;
    }
  ): Promise<StrategyPerformance> {
    return apiClient.get(`${this.BASE_PATH}/${id}/performance`, params);
  }

  // Run strategy backtest
  public static async runBacktest(
    id: string,
    params: {
      startDate: string;
      endDate: string;
      initialCapital?: number;
      tradingPairs?: string[];
    }
  ): Promise<BacktestResult> {
    return apiClient.post(`${this.BASE_PATH}/${id}/backtest`, params);
  }

  // Start strategy testing
  public static async startTesting(id: string): Promise<void> {
    return apiClient.post(`${this.BASE_PATH}/${id}/test/start`, {});
  }

  // Stop strategy testing
  public static async stopTesting(id: string): Promise<void> {
    return apiClient.post(`${this.BASE_PATH}/${id}/test/stop`, {});
  }

  // Activate strategy
  public static async activateStrategy(id: string): Promise<void> {
    return apiClient.post(`${this.BASE_PATH}/${id}/activate`, {});
  }

  // Pause strategy
  public static async pauseStrategy(id: string): Promise<void> {
    return apiClient.post(`${this.BASE_PATH}/${id}/pause`, {});
  }

  // Get strategy templates
  public static async getTemplates(): Promise<Array<Omit<Strategy, 'id'>>> {
    return apiClient.get(`${this.BASE_PATH}/templates`);
  }

  // Clone strategy
  public static async cloneStrategy(id: string, name: string): Promise<Strategy> {
    return apiClient.post(`${this.BASE_PATH}/${id}/clone`, { name });
  }
} 