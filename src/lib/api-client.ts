import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { elizaOSApi, ElizaAgent, ElizaAgentMetrics, CommandResult } from './elizaos-api-client';

// API response type
interface ApiResponse<T = any> {
  data?: T;
  error?: string;
}

// API Client for interacting with the backend
class ApiClient {
  private supabase: SupabaseClient;
  private authenticated: boolean = false;
  
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
  }
  
  // Initialize API with authentication token
  async initialize(token?: string) {
    if (token) {
      // Set ElizaOS auth token
      elizaOSApi.setAuthToken(token);
      this.authenticated = true;
    } else {
      // Try to get session from Supabase
      const { data: { session } } = await this.supabase.auth.getSession();
      if (session?.access_token) {
        elizaOSApi.setAuthToken(session.access_token);
        this.authenticated = true;
      }
    }
  }
  
  // Farm related API methods
  
  async getFarms(): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await this.supabase
        .from('farms')
        .select('*');
      
      if (error) throw new Error(error.message);
      return { data };
    } catch (err) {
      console.error('Error fetching farms:', err);
      return { error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
  
  async getFarm(id: string | number): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await this.supabase
        .from('farms')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw new Error(error.message);
      return { data };
    } catch (err) {
      console.error(`Error fetching farm ${id}:`, err);
      return { error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
  
  async createFarm(farmData: any): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await this.supabase
        .from('farms')
        .insert([farmData])
        .select();
      
      if (error) throw new Error(error.message);
      return { data: data?.[0] };
    } catch (err) {
      console.error('Error creating farm:', err);
      return { error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
  
  async updateFarm(id: string | number, farmData: any): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await this.supabase
        .from('farms')
        .update(farmData)
        .eq('id', id)
        .select();
      
      if (error) throw new Error(error.message);
      return { data: data?.[0] };
    } catch (err) {
      console.error(`Error updating farm ${id}:`, err);
      return { error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
  
  async deleteFarm(id: string | number): Promise<ApiResponse<any>> {
    try {
      const { error } = await this.supabase
        .from('farms')
        .delete()
        .eq('id', id);
      
      if (error) throw new Error(error.message);
      return { data: true };
    } catch (err) {
      console.error(`Error deleting farm ${id}:`, err);
      return { error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
  
  // Farm performance and metrics methods
  
  async getFarmMetrics(id: string | number): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await this.supabase
        .from('farms')
        .select('performance_metrics')
        .eq('id', id)
        .single();
      
      if (error) throw new Error(error.message);
      return { data: data?.performance_metrics };
    } catch (err) {
      console.error(`Error fetching farm metrics ${id}:`, err);
      return { error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
  
  async getFarmPerformance(id: string | number): Promise<ApiResponse<any>> {
    try {
      // Get farm performance data from real-time metrics
      const { data, error } = await this.supabase
        .from('farm_performance')
        .select('*')
        .eq('farm_id', id)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();
      
      if (error) throw new Error(error.message);
      return { data };
    } catch (err) {
      console.error(`Error fetching farm performance ${id}:`, err);
      return { error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
  
  async getFarmRiskProfile(id: string | number): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await this.supabase
        .from('farms')
        .select('risk_profile')
        .eq('id', id)
        .single();
      
      if (error) throw new Error(error.message);
      
      // Process risk profile data for UI presentation
      const riskProfile = data?.risk_profile || {};
      const maxDrawdown = riskProfile.max_drawdown || 0;
      const riskPerTrade = riskProfile.risk_per_trade || 0;
      
      // Calculate risk score based on real formula
      const riskScore = Math.min(1, (maxDrawdown / 100) * 2 + (riskPerTrade / 10));
      
      return { 
        data: {
          riskScore,
          factors: [
            {
              name: 'Maximum Drawdown',
              impact: maxDrawdown / 100,
              description: `${maxDrawdown}% maximum allowed drawdown`
            },
            {
              name: 'Risk Per Trade',
              impact: riskPerTrade / 10,
              description: `${riskPerTrade}% risk per trade`
            }
          ],
          riskProfile
        }
      };
    } catch (err) {
      console.error(`Error fetching farm risk profile ${id}:`, err);
      return { error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
  
  async updateFarmRiskProfile(id: string | number, riskProfile: any): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await this.supabase
        .from('farms')
        .update({ risk_profile: riskProfile })
        .eq('id', id)
        .select();
      
      if (error) throw new Error(error.message);
      return { data: data?.[0] };
    } catch (err) {
      console.error(`Error updating farm risk profile ${id}:`, err);
      return { error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
  
  // Dashboard related methods
  
  async getDashboardSummary(): Promise<ApiResponse<any>> {
    try {
      // Get all farms
      const { data: farms, error: farmsError } = await this.supabase
        .from('farms')
        .select('*');
      
      if (farmsError) throw new Error(farmsError.message);
      
      // Get the latest performance metrics
      const { data: performance, error: performanceError } = await this.supabase
        .from('dashboard_summary')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();
        
      if (performanceError) throw new Error(performanceError.message);
      
      // Combine data for dashboard
      return {
        data: {
          farms_count: farms?.length || 0,
          active_farms: farms?.filter(farm => farm.is_active).length || 0,
          ...performance
        }
      };
    } catch (err) {
      console.error('Error fetching dashboard summary:', err);
      return { error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
  
  // Agent related methods with ElizaOS integration
  
  async getAgents(farmId?: string | number): Promise<ApiResponse<any[]>> {
    try {
      // First get list of all agent IDs from Supabase for this farm
      let query = this.supabase.from('agents').select('*');
      
      if (farmId) {
        query = query.eq('farm_id', farmId);
      }
      
      const { data: dbAgents, error } = await query;
      
      if (error) throw new Error(error.message);
      
      if (!this.authenticated) {
        return { data: dbAgents };
      }
      
      // Get agent details from ElizaOS for each agent
      const { data: elizaAgents } = await elizaOSApi.getAgents();
      
      // Combine the data
      const combinedAgents = dbAgents.map(dbAgent => {
        const elizaAgent = elizaAgents?.find(ea => ea.id === dbAgent.eliza_agent_id);
        
        return {
          ...dbAgent,
          status: elizaAgent?.status || 'unknown',
          parameters: elizaAgent?.parameters || dbAgent.parameters,
          eliza_status: elizaAgent?.health
        };
      });
      
      return { data: combinedAgents };
    } catch (err) {
      console.error('Error fetching agents:', err);
      return { error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
  
  async getAgent(id: string | number): Promise<ApiResponse<any>> {
    try {
      // Get agent from database
      const { data: dbAgent, error } = await this.supabase
        .from('agents')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw new Error(error.message);
      
      if (!this.authenticated || !dbAgent.eliza_agent_id) {
        return { data: dbAgent };
      }
      
      // Get agent from ElizaOS
      const { data: elizaAgent } = await elizaOSApi.getAgent(dbAgent.eliza_agent_id);
      
      // Get agent status from ElizaOS
      const { data: agentStatus } = await elizaOSApi.getAgentStatus(dbAgent.eliza_agent_id);
      
      // Combine the data
      return { 
        data: {
          ...dbAgent,
          status: elizaAgent?.status || 'unknown',
          parameters: elizaAgent?.parameters || dbAgent.parameters,
          eliza_status: agentStatus
        } 
      };
    } catch (err) {
      console.error(`Error fetching agent ${id}:`, err);
      return { error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
  
  async createAgent(agentData: any): Promise<ApiResponse<any>> {
    try {
      if (!this.authenticated) {
        throw new Error('Authentication required to create an agent');
      }
      
      // First create ElizaOS agent
      const { data: elizaAgent, error: elizaError } = await elizaOSApi.createAgent({
        name: agentData.name,
        type: agentData.agent_type,
        description: agentData.description,
        parameters: agentData.parameters,
        status: 'initializing'
      });
      
      if (elizaError) throw new Error(elizaError);
      if (!elizaAgent) throw new Error('Failed to create ElizaOS agent');
      
      // Then create the agent in our database
      const { data, error } = await this.supabase
        .from('agents')
        .insert([{
          name: agentData.name,
          description: agentData.description,
          agent_type: agentData.agent_type,
          farm_id: agentData.farm_id,
          is_active: agentData.is_active,
          eliza_agent_id: elizaAgent.id,
          parameters: agentData.parameters,
          metrics: agentData.metrics || {
            trades_executed: 0,
            win_rate: 0,
            profit_loss: 0,
            avg_trade_duration: 0
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select();
      
      if (error) throw new Error(error.message);
      
      // Return combined data
      return { 
        data: {
          ...data?.[0],
          status: elizaAgent.status,
          eliza_status: elizaAgent.health
        }
      };
    } catch (err) {
      console.error('Error creating agent:', err);
      return { error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
  
  async updateAgent(id: string | number, agentData: any): Promise<ApiResponse<any>> {
    try {
      if (!this.authenticated) {
        throw new Error('Authentication required to update an agent');
      }
      
      // First get existing agent to get ElizaOS agent ID
      const { data: existingAgent, error: fetchError } = await this.supabase
        .from('agents')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) throw new Error(fetchError.message);
      
      // Update ElizaOS agent if needed
      if (existingAgent.eliza_agent_id) {
        const { error: elizaError } = await elizaOSApi.updateAgent(existingAgent.eliza_agent_id, {
          name: agentData.name,
          type: agentData.agent_type,
          description: agentData.description,
          parameters: agentData.parameters
        });
        
        if (elizaError) throw new Error(elizaError);
      }
      
      // Update our database
      const { data, error } = await this.supabase
        .from('agents')
        .update({
          name: agentData.name,
          description: agentData.description,
          agent_type: agentData.agent_type,
          is_active: agentData.is_active,
          parameters: agentData.parameters,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();
      
      if (error) throw new Error(error.message);
      
      // Get latest ElizaOS agent data
      const { data: elizaAgent } = await elizaOSApi.getAgent(existingAgent.eliza_agent_id);
      
      // Return combined data
      return { 
        data: {
          ...data?.[0],
          status: elizaAgent?.status || 'unknown',
          eliza_status: elizaAgent?.health
        }
      };
    } catch (err) {
      console.error(`Error updating agent ${id}:`, err);
      return { error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
  
  async deleteAgent(id: string | number): Promise<ApiResponse<any>> {
    try {
      if (!this.authenticated) {
        throw new Error('Authentication required to delete an agent');
      }
      
      // First get existing agent to get ElizaOS agent ID
      const { data: existingAgent, error: fetchError } = await this.supabase
        .from('agents')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) throw new Error(fetchError.message);
      
      // Delete ElizaOS agent if it exists
      if (existingAgent.eliza_agent_id) {
        const { error: elizaError } = await elizaOSApi.deleteAgent(existingAgent.eliza_agent_id);
        if (elizaError) throw new Error(elizaError);
      }
      
      // Delete from our database
      const { error } = await this.supabase
        .from('agents')
        .delete()
        .eq('id', id);
      
      if (error) throw new Error(error.message);
      return { data: true };
    } catch (err) {
      console.error(`Error deleting agent ${id}:`, err);
      return { error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
  
  async getAgentMetrics(id: string | number): Promise<ApiResponse<any>> {
    try {
      // Get agent from database to get ElizaOS agent ID
      const { data: dbAgent, error: dbError } = await this.supabase
        .from('agents')
        .select('eliza_agent_id')
        .eq('id', id)
        .single();
      
      if (dbError) throw new Error(dbError.message);
      
      if (!this.authenticated || !dbAgent.eliza_agent_id) {
        // Fall back to database metrics
        const { data: metrics, error } = await this.supabase
          .from('agent_metrics')
          .select('*')
          .eq('agent_id', id)
          .order('timestamp', { ascending: false })
          .limit(100);
        
        if (error) throw new Error(error.message);
        
        // Process metrics for visualization
        return { data: this.processAgentMetrics(metrics || []) };
      }
      
      // Get metrics from ElizaOS
      const { data: elizaMetrics, error: elizaError } = await elizaOSApi.getAgentMetrics(dbAgent.eliza_agent_id);
      
      if (elizaError) throw new Error(elizaError);
      
      // Process metrics for visualization
      return { data: this.processAgentMetrics(elizaMetrics || []) };
    } catch (err) {
      console.error(`Error fetching agent metrics ${id}:`, err);
      return { error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
  
  private processAgentMetrics(metrics: ElizaAgentMetrics[]): any {
    // Process raw metrics into visualization-friendly format
    if (!metrics.length) return { history: [], summary: {} };
    
    const history = metrics.map(m => ({
      timestamp: m.timestamp,
      cpu_usage: m.cpu_usage,
      memory_usage: m.memory_usage,
      trades_executed: m.trades_executed,
      success_rate: m.success_rate
    }));
    
    // Calculate summary statistics
    const latestMetric = metrics[0];
    const summary = {
      avg_cpu: metrics.reduce((sum, m) => sum + m.cpu_usage, 0) / metrics.length,
      avg_memory: metrics.reduce((sum, m) => sum + m.memory_usage, 0) / metrics.length,
      total_trades: metrics.reduce((sum, m) => sum + m.trades_executed, 0),
      current_cpu: latestMetric.cpu_usage,
      current_memory: latestMetric.memory_usage,
      uptime: latestMetric.timestamp ? 
        Math.floor((Date.now() - new Date(latestMetric.timestamp).getTime()) / 1000) : 0
    };
    
    return { history, summary };
  }
  
  async executeAgentCommand(agentId: string | number, command: string, params: any = {}): Promise<ApiResponse<any>> {
    try {
      if (!this.authenticated) {
        throw new Error('Authentication required to execute agent commands');
      }
      
      // Get agent from database to get ElizaOS agent ID
      const { data: dbAgent, error: dbError } = await this.supabase
        .from('agents')
        .select('eliza_agent_id')
        .eq('id', agentId)
        .single();
      
      if (dbError) throw new Error(dbError.message);
      
      if (!dbAgent.eliza_agent_id) {
        throw new Error('No ElizaOS agent ID found for this agent');
      }
      
      // Execute command on ElizaOS
      const { data: commandResult, error: commandError } = await elizaOSApi.executeCommand(
        dbAgent.eliza_agent_id, 
        command, 
        params
      );
      
      if (commandError) throw new Error(commandError);
      
      // Log the command in our database
      await this.supabase
        .from('agent_commands')
        .insert([{
          agent_id: agentId,
          command,
          parameters: params,
          result: commandResult,
          executed_at: new Date().toISOString()
        }]);
      
      return { data: commandResult };
    } catch (err) {
      console.error(`Error executing command for agent ${agentId}:`, err);
      return { error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
  
  // Authentication methods
  
  async signIn(email: string, password: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw new Error(error.message);
      
      // Set ElizaOS auth token
      if (data.session?.access_token) {
        elizaOSApi.setAuthToken(data.session.access_token);
        this.authenticated = true;
      }
      
      return { data: data.user };
    } catch (err) {
      console.error('Error signing in:', err);
      return { error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
  
  async signOut(): Promise<ApiResponse<any>> {
    try {
      const { error } = await this.supabase.auth.signOut();
      
      if (error) throw new Error(error.message);
      
      // Reset ElizaOS auth token
      elizaOSApi.setAuthToken('');
      this.authenticated = false;
      
      return { data: true };
    } catch (err) {
      console.error('Error signing out:', err);
      return { error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
  
  async getCurrentUser(): Promise<ApiResponse<any>> {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();
      
      if (error) throw new Error(error.message);
      
      return { data: user };
    } catch (err) {
      console.error('Error getting current user:', err);
      return { error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
}

export const api = new ApiClient(); 