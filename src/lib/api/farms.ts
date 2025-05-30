import { apiClient } from './client';
import type { Strategy } from './strategies';
import { createBrowserClient } from '@/utils/supabase/client';
import { Database, Json } from '@/types/database.types';
import { PerformanceMetrics, FarmSettings } from '@/types/database-json.types';
import { createServerClient } from '@/utils/supabase/server';

// Interface closely matching the DB row + typed JSON
export type FarmBasicInfo = Omit<Database['public']['Tables']['farms']['Row'], 'settings' | 'performance_metrics'> & {
  settings: FarmSettings | null;
  performance_metrics: PerformanceMetrics | null;
};

// Adjusted Farm interface for potentially richer client-side object
// Mark complex/derived fields as optional or ensure they are populated elsewhere
export interface Farm {
  id: string;
  name: string;
  description: string | null; // Match DB
  status: Database['public']['Tables']['farms']['Row']['status']; // Use DB type
  strategies?: Array<{
    strategyId: string;
    // strategy?: Strategy;
    allocation: number;
    status: 'active' | 'paused';
    performance?: {
      returns?: number;
      drawdown?: number;
    };
  }>; // Optional
  performance?: {
    totalReturns?: number;
    currentDrawdown?: number;
    maxDrawdown?: number;
    sharpeRatio?: number;
    volatility?: number;
  }; // Optional
  settings: FarmSettings | null; // Use the specific interface
  created_at: string; // Match DB column name
  updated_at: string; // Match DB column name
  lastRebalanced?: string | null; // Match DB
  owner_id: string; // Match DB
  is_active: boolean; // Match DB
  performance_metrics: PerformanceMetrics | null; // Match DB + Typed JSON
  autonomy_level?: string | null; // Match DB
  goal_completion_action?: Json | null; // Use imported Json type
  goal_current_progress?: Json | null; // Use imported Json type
  goal_deadline?: string | null; // Match DB
  goal_description?: string | null; // Match DB
  goal_name?: string | null; // Match DB
  goal_status?: string | null; // Match DB
  goal_target_amount?: number | null; // Match DB
  goal_target_assets?: string[] | null; // Match DB
}

// Adjusted DTOs
export interface CreateFarmDto {
  name: string;
  description?: string | null; // Optional and match DB
  strategies?: Array<{ // Optional
    strategyId: string;
    allocation: number;
  }>;
  settings?: FarmSettings; // Use FarmSettings directly, optional
  // Add other necessary fields for creation based on DB table constraints (e.g., owner_id)
  owner_id: string;
}

export interface UpdateFarmDto {
  name?: string;
  description?: string | null;
  strategies?: Array<{ // Optional
    strategyId: string;
    allocation: number;
  }>;
  settings?: Partial<FarmSettings>; // Use Partial<FarmSettings>
  is_active?: boolean;
  // Add other updatable fields
}

export interface FarmPerformance {
  timeframe: string;
  data: Array<{
    timestamp: string;
    returns: number;
    drawdown: number;
    allocations: Record<string, number>;
  }>;
}

export interface FarmMetrics {
  totalReturns: number;
  dailyReturns: number;
  weeklyReturns: number;
  monthlyReturns: number;
  totalTrades: number;
  successRate: number;
  activeAgents: number;
  totalAgents: number;
  activeStrategies: number;
  totalStrategies: number;
  averageAgentPerformance: number;
  riskScore: number;
}

// Farm API class
export class FarmApi {
  private static readonly BASE_PATH = '/farms';

  // Get all farms (Keep using apiClient for now, returns richer Farm type)
  public static async getFarms(params?: {
    status?: Farm['status'];
  }): Promise<Farm[]> {
    // Assume apiClient handles mapping/enrichment to the full Farm type
    return apiClient.get(this.BASE_PATH, params);
  }

  /**
   * Fetches active farms with basic info directly using the browser client.
   * @param limit Max number of farms to return.
   * @returns Promise resolving to an array of active farms with basic info.
   */
  public static async fetchActiveFarms(limit: number = 5): Promise<FarmBasicInfo[]> {
    const supabase = createBrowserClient();
    const { data, error } = await supabase
      .from('farms')
      .select('*')
      .eq('is_active', true)
      .limit(limit);

    if (error) {
      console.error('Error fetching active farms:', error);
      throw new Error(error.message || 'Failed to fetch active farms');
    }

    // Cast the JSON fields, return data matching FarmBasicInfo
    // Use 'as any' temporarily inside map if type inference is problematic
    return (data || []).map(dbFarm => {
      const farmData = dbFarm as any; // Cast to any for mapping robustness
      return {
        // Spread the original data
        ...farmData,
        // Explicitly cast the known JSON fields
        settings: farmData.settings as FarmSettings | null,
        performance_metrics: farmData.performance_metrics as PerformanceMetrics | null,
        // Ensure required fields for FarmBasicInfo are present if Omit<> caused issues
        id: farmData.id,
        name: farmData.name,
        created_at: farmData.created_at,
        updated_at: farmData.updated_at,
        owner_id: farmData.owner_id,
        is_active: farmData.is_active,
        // ... include other non-omitted fields from the DB row type ...
        description: farmData.description,
        status: farmData.status,
        autonomy_level: farmData.autonomy_level,
        goal_completion_action: farmData.goal_completion_action,
        goal_current_progress: farmData.goal_current_progress,
        goal_deadline: farmData.goal_deadline,
        goal_description: farmData.goal_description,
        goal_name: farmData.goal_name,
        goal_status: farmData.goal_status,
        goal_target_amount: farmData.goal_target_amount,
        goal_target_assets: farmData.goal_target_assets,
        lastRebalanced: farmData.lastRebalanced,
      } as FarmBasicInfo;
    });
  }


  // Get a single farm by ID (Keep using apiClient for now, returns richer Farm type)
   public static async getFarm(id: string): Promise<Farm> {
    return apiClient.get(`${this.BASE_PATH}/${id}`);
  }

  /**
   * Creates a new farm record directly using the server client.
   * Intended for server-side use.
   * @param data DTO containing necessary farm creation data.
   * @returns Promise resolving to the newly created farm's basic info.
   */
  public static async createFarm(data: CreateFarmDto): Promise<FarmBasicInfo> {
    const supabase = createServerClient();

    const settingsJson = data.settings as unknown as Json | undefined;

    const insertData: Database['public']['Tables']['farms']['Insert'] = {
      owner_id: data.owner_id,
      name: data.name,
      description: data.description,
      settings: settingsJson,
      is_active: true,
      autonomy_level: 'manual',
      goal_name: null,
      goal_description: null,
      goal_target_amount: null,
      goal_target_assets: null,
      goal_deadline: null,
      goal_status: 'pending',
      goal_current_progress: null,
      goal_completion_action: null,
    };

    const { data: newFarmData, error: createError } = await supabase
      .from('farms')
      .insert(insertData)
      .select()
      .single();

    if (createError) {
      console.error('Error creating new farm:', createError);
      throw new Error(createError.message || 'Failed to create new farm');
    }

    const newFarm = newFarmData as any;
    return {
        ...newFarm,
        settings: newFarm.settings as FarmSettings | null,
        performance_metrics: newFarm.performance_metrics as PerformanceMetrics | null,
    } as FarmBasicInfo;
  }

  /**
   * Updates an existing farm record directly using the server client.
   * Intended for server-side use.
   * @param id The UUID of the farm to update.
   * @param data DTO containing updated farm data.
   * @returns Promise resolving to the updated farm's basic info.
   */
  public static async updateFarm(id: string, data: UpdateFarmDto): Promise<FarmBasicInfo> {
    const supabase = createServerClient();

    // Prepare update data, casting settings if present
    const updateData: Database['public']['Tables']['farms']['Update'] = { ...data };
    if (data.settings) {
        updateData.settings = data.settings as unknown as Json;
    }
    // Remove fields that shouldn't be directly updated or are handled elsewhere
    delete (updateData as any).strategies;

    const { data: updatedFarmData, error: updateError } = await supabase
        .from('farms')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (updateError) {
      console.error(`Error updating farm ${id}:`, updateError);
      throw new Error(updateError.message || 'Failed to update farm');
    }

    const updatedFarm = updatedFarmData as any; // Use any for mapping robustness
    return {
        ...updatedFarm,
        settings: updatedFarm.settings as FarmSettings | null,
        performance_metrics: updatedFarm.performance_metrics as PerformanceMetrics | null,
    } as FarmBasicInfo;

  }

  /**
   * Deletes a farm record directly using the server client.
   * Intended for server-side use.
   * @param id The UUID of the farm to delete.
   * @returns Promise resolving when deletion is complete.
   */
  public static async deleteFarm(id: string): Promise<void> {
    const supabase = createServerClient();
    const { error } = await supabase
        .from('farms')
        .delete()
        .match({ id });

    if (error) {
      console.error(`Error deleting farm ${id}:`, error);
      throw new Error(error.message || 'Failed to delete farm');
    }
    // No return value needed for delete
  }

  // Get farm performance history (Keep using apiClient for now)
  public static async getFarmPerformance(
    id: string,
    params?: {
      timeframe?: '1d' | '7d' | '30d' | '90d' | '1y';
      startDate?: string;
      endDate?: string;
    }
  ): Promise<FarmPerformance> {
    return apiClient.get(`${this.BASE_PATH}/${id}/performance`, params);
  }

  // Get farm metrics (Keep using apiClient for now, fixed return type)
  public static async getFarmMetrics(id: string): Promise<FarmMetrics> {
    return apiClient.get<FarmMetrics>(`${this.BASE_PATH}/${id}/metrics`);
  }

 // Activate a farm (Keep using apiClient for now)
  public static async activateFarm(id: string): Promise<void> {
    return apiClient.post(`${this.BASE_PATH}/${id}/activate`, {});
  }

  // Pause a farm (Keep using apiClient for now)
  public static async pauseFarm(id: string): Promise<void> {
    return apiClient.post(`${this.BASE_PATH}/${id}/pause`, {});
  }

  // Rebalance a farm (Keep using apiClient for now)
  public static async rebalanceFarm(id: string): Promise<void> {
    return apiClient.post(`${this.BASE_PATH}/${id}/rebalance`, {});
  }

  // Strategy-related methods (Keep using apiClient for now)
  // ... (activateStrategy, pauseStrategy, updateStrategyAllocation) ...

} 