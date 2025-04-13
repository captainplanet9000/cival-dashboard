import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';

// Types
export type InsightType = 'market' | 'strategy' | 'risk' | 'technology';
export type ResourceType = 'document' | 'strategy' | 'dataset' | 'analysis';
export type TaskStatus = 'not_started' | 'in_progress' | 'under_review' | 'complete';
export type AgentRole = 'leader' | 'analyst' | 'executor' | 'observer';
export type MemberType = 'human' | 'agent';
export type AccessLevel = 'public' | 'team' | 'private';

export interface CollaborativeInsight {
  id: string;
  title: string;
  content: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  created_at: string;
  votes: number;
  type: InsightType;
  status: 'active' | 'implemented' | 'archived';
  tags: string[];
  farm_id?: string;
}

export interface SharedResource {
  id: string;
  title: string;
  type: ResourceType;
  owner_id: string;
  owner_name: string;
  created_at: string;
  last_modified: string;
  access_level: AccessLevel;
  farm_id?: string;
  file_path?: string;
  url?: string;
  tags: string[];
}

export interface CollaborationTask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assignees: string[];
  due_date?: string;
  progress: number;
  farm_id?: string;
  team_id?: string;
  tags: string[];
}

export interface TeamMember {
  id: string;
  name: string;
  role: AgentRole;
  type: MemberType;
  avatar?: string;
}

export interface CollaborativeAgentTeam {
  id: string;
  name: string;
  description: string;
  members: TeamMember[];
  active_task?: string;
  created_at: string;
  farm_id?: string;
}

// Service
class CollaborativeIntelligenceService {
  private static instance: CollaborativeIntelligenceService;

  private constructor() {}

  public static getInstance(): CollaborativeIntelligenceService {
    if (!CollaborativeIntelligenceService.instance) {
      CollaborativeIntelligenceService.instance = new CollaborativeIntelligenceService();
    }
    return CollaborativeIntelligenceService.instance;
  }

  // Client-side methods
  async getInsightsForClient(farmId?: string) {
    const supabase = createBrowserClient();
    
    try {
      let query = supabase
        .from('collaborative_insights')
        .select('*');
      
      if (farmId) {
        query = query.eq('farm_id', farmId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching insights:', error);
      throw error;
    }
  }
  
  async createInsight(insight: Omit<CollaborativeInsight, 'id' | 'created_at' | 'votes'>) {
    const supabase = createBrowserClient();
    
    try {
      const { data, error } = await supabase
        .from('collaborative_insights')
        .insert({
          ...insight,
          id: uuidv4(),
          votes: 0,
          created_at: new Date().toISOString()
        })
        .select();
      
      if (error) {
        throw error;
      }
      
      return data[0];
    } catch (error) {
      console.error('Error creating insight:', error);
      throw error;
    }
  }
  
  async voteForInsight(insightId: string) {
    const supabase = createBrowserClient();
    
    try {
      // First get the current votes
      const { data: currentData, error: fetchError } = await supabase
        .from('collaborative_insights')
        .select('votes')
        .eq('id', insightId)
        .single();
      
      if (fetchError) {
        throw fetchError;
      }
      
      // Then update with incremented vote count
      const { data, error } = await supabase
        .from('collaborative_insights')
        .update({ votes: (currentData.votes || 0) + 1 })
        .eq('id', insightId)
        .select();
      
      if (error) {
        throw error;
      }
      
      return data[0];
    } catch (error) {
      console.error('Error voting for insight:', error);
      throw error;
    }
  }
  
  async getSharedResourcesForClient(farmId?: string) {
    const supabase = createBrowserClient();
    
    try {
      let query = supabase
        .from('shared_resources')
        .select('*');
      
      if (farmId) {
        query = query.eq('farm_id', farmId);
      }
      
      const { data, error } = await query.order('last_modified', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching shared resources:', error);
      throw error;
    }
  }
  
  async shareResource(resource: Omit<SharedResource, 'id' | 'created_at' | 'last_modified'>) {
    const supabase = createBrowserClient();
    
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('shared_resources')
        .insert({
          ...resource,
          id: uuidv4(),
          created_at: now,
          last_modified: now
        })
        .select();
      
      if (error) {
        throw error;
      }
      
      return data[0];
    } catch (error) {
      console.error('Error sharing resource:', error);
      throw error;
    }
  }
  
  async getCollaborationTasksForClient(farmId?: string, teamId?: string) {
    const supabase = createBrowserClient();
    
    try {
      let query = supabase
        .from('collaboration_tasks')
        .select('*');
      
      if (farmId) {
        query = query.eq('farm_id', farmId);
      }
      
      if (teamId) {
        query = query.eq('team_id', teamId);
      }
      
      const { data, error } = await query.order('due_date', { ascending: true });
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching collaboration tasks:', error);
      throw error;
    }
  }
  
  async createCollaborationTask(task: Omit<CollaborationTask, 'id'>) {
    const supabase = createBrowserClient();
    
    try {
      const { data, error } = await supabase
        .from('collaboration_tasks')
        .insert({
          ...task,
          id: uuidv4()
        })
        .select();
      
      if (error) {
        throw error;
      }
      
      return data[0];
    } catch (error) {
      console.error('Error creating collaboration task:', error);
      throw error;
    }
  }
  
  async updateTaskProgress(taskId: string, progress: number) {
    const supabase = createBrowserClient();
    
    try {
      const { data, error } = await supabase
        .from('collaboration_tasks')
        .update({ progress })
        .eq('id', taskId)
        .select();
      
      if (error) {
        throw error;
      }
      
      return data[0];
    } catch (error) {
      console.error('Error updating task progress:', error);
      throw error;
    }
  }
  
  async updateTaskStatus(taskId: string, status: TaskStatus) {
    const supabase = createBrowserClient();
    
    try {
      const { data, error } = await supabase
        .from('collaboration_tasks')
        .update({ status })
        .eq('id', taskId)
        .select();
      
      if (error) {
        throw error;
      }
      
      return data[0];
    } catch (error) {
      console.error('Error updating task status:', error);
      throw error;
    }
  }
  
  async getAgentTeamsForClient(farmId?: string) {
    const supabase = createBrowserClient();
    
    try {
      let query = supabase
        .from('collaborative_agent_teams')
        .select(`
          *,
          members:collaborative_team_members(*)
        `);
      
      if (farmId) {
        query = query.eq('farm_id', farmId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching agent teams:', error);
      throw error;
    }
  }
  
  async createAgentTeam(team: Omit<CollaborativeAgentTeam, 'id' | 'created_at'>) {
    const supabase = createBrowserClient();
    
    try {
      // First create the team
      const teamId = uuidv4();
      const now = new Date().toISOString();
      
      const { data: teamData, error: teamError } = await supabase
        .from('collaborative_agent_teams')
        .insert({
          id: teamId,
          name: team.name,
          description: team.description,
          active_task: team.active_task,
          created_at: now,
          farm_id: team.farm_id
        })
        .select();
      
      if (teamError) {
        throw teamError;
      }
      
      // Then add team members
      const memberPromises = team.members.map(member => 
        supabase
          .from('collaborative_team_members')
          .insert({
            team_id: teamId,
            member_id: member.id,
            name: member.name,
            role: member.role,
            type: member.type,
            avatar: member.avatar
          })
      );
      
      await Promise.all(memberPromises);
      
      return {
        ...teamData[0],
        members: team.members
      };
    } catch (error) {
      console.error('Error creating agent team:', error);
      throw error;
    }
  }
  
  async updateTeamActiveTask(teamId: string, taskId: string) {
    const supabase = createBrowserClient();
    
    try {
      const { data, error } = await supabase
        .from('collaborative_agent_teams')
        .update({ active_task: taskId })
        .eq('id', teamId)
        .select();
      
      if (error) {
        throw error;
      }
      
      return data[0];
    } catch (error) {
      console.error('Error updating team active task:', error);
      throw error;
    }
  }

  // Server-side methods
  async getInsightsForServer(farmId?: string) {
    const supabase = await createServerClient();
    
    try {
      let query = supabase
        .from('collaborative_insights')
        .select('*');
      
      if (farmId) {
        query = query.eq('farm_id', farmId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching insights:', error);
      throw error;
    }
  }
  
  async getSharedResourcesForServer(farmId?: string) {
    const supabase = await createServerClient();
    
    try {
      let query = supabase
        .from('shared_resources')
        .select('*');
      
      if (farmId) {
        query = query.eq('farm_id', farmId);
      }
      
      const { data, error } = await query.order('last_modified', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching shared resources:', error);
      throw error;
    }
  }
  
  async getCollaborationTasksForServer(farmId?: string, teamId?: string) {
    const supabase = await createServerClient();
    
    try {
      let query = supabase
        .from('collaboration_tasks')
        .select('*');
      
      if (farmId) {
        query = query.eq('farm_id', farmId);
      }
      
      if (teamId) {
        query = query.eq('team_id', teamId);
      }
      
      const { data, error } = await query.order('due_date', { ascending: true });
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching collaboration tasks:', error);
      throw error;
    }
  }
  
  async getAgentTeamsForServer(farmId?: string) {
    const supabase = await createServerClient();
    
    try {
      let query = supabase
        .from('collaborative_agent_teams')
        .select(`
          *,
          members:collaborative_team_members(*)
        `);
      
      if (farmId) {
        query = query.eq('farm_id', farmId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching agent teams:', error);
      throw error;
    }
  }
}

export const collaborativeIntelligenceService = CollaborativeIntelligenceService.getInstance(); 