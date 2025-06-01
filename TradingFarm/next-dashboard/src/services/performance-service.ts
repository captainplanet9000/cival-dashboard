/**
 * Performance Service
 * Handles retrieving and analyzing performance metrics for farms, goals, and agents
 */
import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';
import { Database } from '@/types/database.types';

// Helper to determine API URL
const getApiUrl = (path: string): string => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  return `${baseUrl}/api/${path}`;
};

// Define interfaces for API responses
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// Performance metrics interfaces
export interface GoalPerformanceMetrics {
  goal_id: string;
  completion_rate: number;
  average_progress_per_day: number;
  days_active: number;
  days_to_completion?: number;
  last_activity?: string;
  contributing_agents: Array<{
    agent_id: string;
    is_eliza_agent: boolean;
    contribution_percentage: number;
    updates_count: number;
  }>;
}

export interface AgentPerformanceMetrics {
  agent_id: string;
  is_eliza_agent: boolean;
  goals_contributed: number;
  goals_completed: number;
  total_updates: number;
  total_value_added: number;
  average_value_per_update: number;
  activity_by_day: Record<string, number>;
  last_active?: string;
}

export interface FarmPerformanceReport {
  farm_id: string;
  period: 'day' | 'week' | 'month' | 'year' | 'all';
  start_date: string;
  end_date: string;
  goals_metrics: {
    total: number;
    completed: number;
    in_progress: number;
    not_started: number;
    cancelled: number;
    completion_rate: number;
    average_days_to_completion?: number;
  };
  agents_metrics: {
    total: number;
    active: number;
    inactive: number;
    elizaos_count: number;
    standard_count: number;
    most_active_agent_id?: string;
    is_eliza_agent?: boolean;
    total_updates: number;
    updates_per_day: number;
  };
  daily_activity: Array<{
    date: string;
    updates_count: number;
    goals_completed: number;
    goal_progress: number;
  }>;
}

// Service implementation
export const performanceService = {
  /**
   * Get performance metrics for a goal
   */
  async getGoalPerformance(goalId: string): Promise<ApiResponse<GoalPerformanceMetrics>> {
    try {
      // First try the API endpoint
      const url = `${getApiUrl(`goals/${goalId}/performance`)}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const result = await response.json();
        return { data: result.data };
      }
      
      // Fallback to calculating metrics directly
      const supabase = createBrowserClient();
      
      // Get the goal
      const { data: goal, error: goalError } = await supabase
        .from('goals')
        .select('*')
        .eq('id', goalId)
        .single();
      
      if (goalError || !goal) {
        return { error: goalError?.message || 'Goal not found' };
      }
      
      // Get goal updates
      const { data: updates, error: updatesError } = await supabase
        .from('goal_updates')
        .select('*')
        .eq('goal_id', goalId)
        .order('created_at', { ascending: true });
      
      if (updatesError) {
        return { error: updatesError.message };
      }
      
      // Calculate metrics
      const firstUpdate = updates && updates.length > 0 ? updates[0] : null;
      const lastUpdate = updates && updates.length > 0 ? updates[updates.length - 1] : null;
      
      const createdAt = new Date(goal.created_at);
      const lastActivity = lastUpdate ? new Date(lastUpdate.created_at) : undefined;
      const completedAt = goal.completed_at ? new Date(goal.completed_at) : undefined;
      
      const now = new Date();
      const daysActive = Math.ceil((
        (completedAt || lastActivity || now).getTime() - createdAt.getTime()
      ) / (1000 * 3600 * 24));
      
      // Calculate days to completion if completed
      const daysToCompletion = completedAt 
        ? Math.ceil((completedAt.getTime() - createdAt.getTime()) / (1000 * 3600 * 24))
        : undefined;
      
      // Calculate average progress per day
      const progressPerDay = (goal.progress || 0) / Math.max(1, daysActive);
      
      // Calculate agent contributions
      const agentContributions: Record<string, { 
        is_eliza_agent: boolean, 
        value_added: number, 
        updates_count: number 
      }> = {};
      
      updates?.forEach(update => {
        if (update.agent_id) {
          if (!agentContributions[update.agent_id]) {
            agentContributions[update.agent_id] = {
              is_eliza_agent: !!update.is_eliza_agent,
              value_added: 0,
              updates_count: 0
            };
          }
          
          agentContributions[update.agent_id].value_added += update.value_change;
          agentContributions[update.agent_id].updates_count += 1;
        }
      });
      
      // Calculate total value added by all agents
      const totalValueAdded = Object.values(agentContributions).reduce(
        (sum, contrib) => sum + contrib.value_added, 0
      );
      
      // Format contributing agents
      const contributingAgents = Object.entries(agentContributions).map(([agentId, data]) => ({
        agent_id: agentId,
        is_eliza_agent: data.is_eliza_agent,
        contribution_percentage: totalValueAdded > 0 
          ? (data.value_added / totalValueAdded) * 100 
          : 0,
        updates_count: data.updates_count
      }));
      
      return {
        data: {
          goal_id: goalId,
          completion_rate: goal.progress || 0,
          average_progress_per_day: progressPerDay,
          days_active: daysActive,
          days_to_completion: daysToCompletion,
          last_activity: lastActivity?.toISOString(),
          contributing_agents: contributingAgents
        }
      };
    } catch (error) {
      console.error('Error getting goal performance:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Get performance metrics for an agent
   */
  async getAgentPerformance(agentId: string, isElizaAgent: boolean = false): Promise<ApiResponse<AgentPerformanceMetrics>> {
    try {
      // First try the API endpoint
      const url = `${getApiUrl(`agents/${agentId}/performance`)}?is_eliza_agent=${isElizaAgent}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const result = await response.json();
        return { data: result.data };
      }
      
      // Fallback to calculating metrics directly
      const supabase = createBrowserClient();
      
      // Get updates made by this agent
      const { data: updates, error: updatesError } = await supabase
        .from('goal_updates')
        .select('*')
        .eq('agent_id', agentId)
        .eq('is_eliza_agent', isElizaAgent)
        .order('created_at', { ascending: true });
      
      if (updatesError) {
        return { error: updatesError.message };
      }
      
      // Extract unique goal IDs
      const goalIds = [...new Set(updates?.map(update => update.goal_id) || [])];
      
      // Get goals
      let completedGoals = 0;
      if (goalIds.length > 0) {
        const { data: goals, error: goalsError } = await supabase
          .from('goals')
          .select('id, status')
          .in('id', goalIds);
        
        if (!goalsError && goals) {
          completedGoals = goals.filter(goal => goal.status === 'completed').length;
        }
      }
      
      // Calculate total value added
      const totalValueAdded = updates?.reduce((sum, update) => sum + update.value_change, 0) || 0;
      
      // Calculate average value per update
      const avgValuePerUpdate = updates && updates.length > 0 
        ? totalValueAdded / updates.length 
        : 0;
      
      // Group activity by day
      const activityByDay: Record<string, number> = {};
      updates?.forEach(update => {
        const day = new Date(update.created_at).toISOString().split('T')[0];
        activityByDay[day] = (activityByDay[day] || 0) + 1;
      });
      
      // Get last active date
      const lastActive = updates && updates.length > 0
        ? updates[updates.length - 1].created_at
        : undefined;
      
      return {
        data: {
          agent_id: agentId,
          is_eliza_agent: isElizaAgent,
          goals_contributed: goalIds.length,
          goals_completed: completedGoals,
          total_updates: updates?.length || 0,
          total_value_added: totalValueAdded,
          average_value_per_update: avgValuePerUpdate,
          activity_by_day: activityByDay,
          last_active: lastActive
        }
      };
    } catch (error) {
      console.error('Error getting agent performance:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Get a performance report for a farm
   */
  async getFarmPerformanceReport(
    farmId: string, 
    period: 'day' | 'week' | 'month' | 'year' | 'all' = 'month'
  ): Promise<ApiResponse<FarmPerformanceReport>> {
    try {
      // First try the API endpoint
      const url = `${getApiUrl(`farms/${farmId}/performance`)}?period=${period}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const result = await response.json();
        return { data: result.data };
      }
      
      // Fallback to calculating metrics directly
      const supabase = createBrowserClient();
      
      // Calculate date range based on period
      const now = new Date();
      let startDate = new Date();
      
      switch (period) {
        case 'day':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        case 'all':
          // Get farm creation date
          const { data: farm } = await supabase
            .from('farms')
            .select('created_at')
            .eq('id', farmId)
            .single();
          
          startDate = farm ? new Date(farm.created_at) : new Date(0);
          break;
      }
      
      // Format dates for queries
      const startDateStr = startDate.toISOString();
      const endDateStr = now.toISOString();
      
      // Get goals metrics
      const { data: goals, error: goalsError } = await supabase
        .from('goals')
        .select('*')
        .eq('farm_id', farmId);
      
      if (goalsError) {
        return { error: goalsError.message };
      }
      
      // Calculate goals metrics
      const goalsTotal = goals?.length || 0;
      const goalsCompleted = goals?.filter(g => g.status === 'completed').length || 0;
      const goalsInProgress = goals?.filter(g => g.status === 'in_progress').length || 0;
      const goalsNotStarted = goals?.filter(g => g.status === 'not_started' || g.status === 'waiting').length || 0;
      const goalsCancelled = goals?.filter(g => g.status === 'cancelled').length || 0;
      
      const completionRate = goalsTotal > 0 ? goalsCompleted / goalsTotal : 0;
      
      // Calculate average days to completion
      let avgDaysToCompletion;
      const completedGoalsWithDates = goals?.filter(g => 
        g.status === 'completed' && g.created_at && g.completed_at
      ) || [];
      
      if (completedGoalsWithDates.length > 0) {
        const totalDays = completedGoalsWithDates.reduce((sum, goal) => {
          const createdAt = new Date(goal.created_at);
          const completedAt = new Date(goal.completed_at!); // Non-null assertion because we filtered
          const days = Math.ceil((completedAt.getTime() - createdAt.getTime()) / (1000 * 3600 * 24));
          return sum + days;
        }, 0);
        
        avgDaysToCompletion = totalDays / completedGoalsWithDates.length;
      }
      
      // Get agents metrics (standard agents)
      const { data: agents, error: agentsError } = await supabase
        .from('agents')
        .select('id, is_active')
        .eq('farm_id', farmId);
      
      if (agentsError) {
        return { error: agentsError.message };
      }
      
      // Get ElizaOS agents metrics if available
      let elizaAgents: any[] = [];
      try {
        const { data, error } = await supabase
          .from('elizaos_agents')
          .select('id, status')
          .eq('farm_id', farmId);
        
        if (!error && data) {
          elizaAgents = data;
        }
      } catch (err) {
        console.warn('ElizaOS agents table might not exist:', err);
      }
      
      // Calculate agents metrics
      const agentsTotal = (agents?.length || 0) + (elizaAgents?.length || 0);
      const agentsActive = (agents?.filter(a => a.is_active).length || 0) + 
                         (elizaAgents?.filter(a => a.status === 'active').length || 0);
      const agentsInactive = agentsTotal - agentsActive;
      
      // Get updates during the period
      const { data: updates, error: updatesError } = await supabase
        .from('goal_updates')
        .select('*, goals!inner(*)')
        .eq('goals.farm_id', farmId)
        .gte('created_at', startDateStr)
        .lte('created_at', endDateStr)
        .order('created_at', { ascending: true });
      
      if (updatesError) {
        return { error: updatesError.message };
      }
      
      const totalUpdates = updates?.length || 0;
      
      // Calculate most active agent
      let mostActiveAgentId: string | undefined;
      let mostActiveAgentIsEliza: boolean | undefined;
      
      if (totalUpdates > 0) {
        const agentActivityCount: Record<string, { count: number, is_eliza: boolean }> = {};
        
        updates?.forEach(update => {
          if (update.agent_id) {
            const key = update.agent_id;
            if (!agentActivityCount[key]) {
              agentActivityCount[key] = { count: 0, is_eliza: !!update.is_eliza_agent };
            }
            agentActivityCount[key].count += 1;
          }
        });
        
        // Find most active agent
        let maxCount = 0;
        Object.entries(agentActivityCount).forEach(([agentId, data]) => {
          if (data.count > maxCount) {
            maxCount = data.count;
            mostActiveAgentId = agentId;
            mostActiveAgentIsEliza = data.is_eliza;
          }
        });
      }
      
      // Calculate daily activity
      // Get the date range
      const dateRange: string[] = [];
      const tempDate = new Date(startDate);
      while (tempDate <= now) {
        dateRange.push(tempDate.toISOString().split('T')[0]);
        tempDate.setDate(tempDate.getDate() + 1);
      }
      
      // Group updates by day
      type DailyActivity = Record<string, {
        updates_count: number;
        goals_completed: number;
        goal_progress: number;
      }>;
      
      const dailyActivityByDay: DailyActivity = {};
      
      // Initialize all days
      dateRange.forEach(date => {
        dailyActivityByDay[date] = {
          updates_count: 0,
          goals_completed: 0,
          goal_progress: 0
        };
      });
      
      // Calculate updates by day
      updates?.forEach(update => {
        const day = new Date(update.created_at).toISOString().split('T')[0];
        if (dailyActivityByDay[day]) {
          dailyActivityByDay[day].updates_count += 1;
          dailyActivityByDay[day].goal_progress += update.value_change;
        }
      });
      
      // Calculate goals completed by day
      completedGoalsWithDates.forEach(goal => {
        if (goal.completed_at) {
          const day = new Date(goal.completed_at).toISOString().split('T')[0];
          if (dailyActivityByDay[day]) {
            dailyActivityByDay[day].goals_completed += 1;
          }
        }
      });
      
      // Format daily activity for response
      const dailyActivity = Object.entries(dailyActivityByDay).map(([date, data]) => ({
        date,
        ...data
      }));
      
      // Calculate updates per day
      const daysDiff = Math.max(1, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 3600 * 24)));
      const updatesPerDay = totalUpdates / daysDiff;
      
      return {
        data: {
          farm_id: farmId,
          period,
          start_date: startDateStr,
          end_date: endDateStr,
          goals_metrics: {
            total: goalsTotal,
            completed: goalsCompleted,
            in_progress: goalsInProgress,
            not_started: goalsNotStarted,
            cancelled: goalsCancelled,
            completion_rate: completionRate,
            average_days_to_completion: avgDaysToCompletion
          },
          agents_metrics: {
            total: agentsTotal,
            active: agentsActive,
            inactive: agentsInactive,
            elizaos_count: elizaAgents.length,
            standard_count: agents?.length || 0,
            most_active_agent_id: mostActiveAgentId,
            is_eliza_agent: mostActiveAgentIsEliza,
            total_updates: totalUpdates,
            updates_per_day: updatesPerDay
          },
          daily_activity: dailyActivity
        }
      };
    } catch (error) {
      console.error('Error getting farm performance report:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Update performance metrics on a goal
   */
  async updateGoalPerformanceMetrics(goalId: string): Promise<ApiResponse<any>> {
    try {
      // First try the API endpoint
      const url = `${getApiUrl(`goals/${goalId}/refresh-metrics`)}`;
      const response = await fetch(url, {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        return { data: result.data };
      }
      
      // If API fails, calculate metrics directly
      const { data: performance } = await this.getGoalPerformance(goalId);
      
      if (performance) {
        // Update the goal with calculated metrics
        const supabase = createBrowserClient();
        
        const { error } = await supabase
          .from('goals')
          .update({
            performance_metrics: {
              completion_rate: performance.completion_rate,
              average_progress_per_day: performance.average_progress_per_day,
              days_active: performance.days_active,
              days_to_completion: performance.days_to_completion,
              contributing_agents: performance.contributing_agents,
              last_updated: new Date().toISOString()
            },
            last_updated_metrics: new Date().toISOString()
          })
          .eq('id', goalId);
        
        if (error) {
          return { error: error.message };
        }
        
        return { data: { success: true } };
      }
      
      return { error: 'Failed to calculate performance metrics' };
    } catch (error) {
      console.error('Error updating goal performance metrics:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }
};
